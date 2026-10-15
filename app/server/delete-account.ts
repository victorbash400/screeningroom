import "server-only";
import { DeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DeleteObjectCommand, ListObjectVersionsCommand } from "@aws-sdk/client-s3";
import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { database, identity, storage } from "./aws";
import { env } from "./config";
import { beginAccountDeletion } from "./account-state";
import { ApiError } from "./http";

async function listVersions(userId: string) {
  return storage().send(new ListObjectVersionsCommand({ Bucket: env("S3_BUCKET_NAME"), Prefix: `users/${userId}/`, MaxKeys: 100 }));
}

export async function deletionPreflight(userId: string) {
  try { await listVersions(userId); }
  catch (error) {
    if (error instanceof Error && error.name === "AccessDenied") throw new ApiError(503, "Account deletion needs storage version-cleanup permissions.");
    throw error;
  }
}

export async function deleteOwnerAccount(userId: string, token: string) {
  await deletionPreflight(userId);
  await beginAccountDeletion(userId);

  // Drain finite result pages, not background polling. Every delete is idempotent.
  while (true) {
    const page = await listVersions(userId);
    const items = [...(page.Versions || []), ...(page.DeleteMarkers || [])];
    if (!items.length) {
      if (page.IsTruncated) throw new Error("Storage returned an empty truncated version page.");
      break;
    }
    for (const item of items) {
      if (!item.Key?.startsWith(`users/${userId}/`) || !item.VersionId) throw new Error("Invalid account storage version.");
      await storage().send(new DeleteObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: item.Key, VersionId: item.VersionId }));
    }
  }

  while (true) {
    const page = await database().send(new QueryCommand({ TableName: env("DYNAMODB_TABLE_NAME"), KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": `USER#${userId}` }, ProjectionExpression: "pk, sk", Limit: 100, ConsistentRead: true }));
    if (!page.Items?.length) {
      if (page.LastEvaluatedKey) throw new Error("Database returned an empty truncated account page.");
      break;
    }
    for (const item of page.Items) {
      if (item.pk !== `USER#${userId}` || typeof item.sk !== "string") throw new Error("Invalid account record key.");
      await database().send(new DeleteCommand({ TableName: env("DYNAMODB_TABLE_NAME"), Key: { pk: item.pk, sk: item.sk } }));
    }
  }

  // Cognito is last: failed cleanup keeps the user's identity usable for retry.
  await identity().send(new DeleteUserCommand({ AccessToken: token }));
}
