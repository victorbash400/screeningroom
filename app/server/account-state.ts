import "server-only";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { database } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";

export function accountStateKey(userId: string) { return { pk: `ACCOUNT#${userId}`, sk: "state" }; }

export function activeAccountCondition(userId: string) {
  return { TableName: env("DYNAMODB_TABLE_NAME"), Key: accountStateKey(userId), ConditionExpression: "attribute_not_exists(#state)", ExpressionAttributeNames: { "#state": "state" } };
}

export function activeAccountWrite(userId: string) {
  return { Update: { ...activeAccountCondition(userId), UpdateExpression: "SET lastWriteAt = :now", ExpressionAttributeValues: { ":now": new Date().toISOString() } } };
}

export async function assertAccountActive(userId: string) {
  const result = await database().send(new GetCommand({ TableName: env("DYNAMODB_TABLE_NAME"), Key: accountStateKey(userId), ConsistentRead: true }));
  if (result.Item?.state === "deleting") throw new ApiError(409, "Account deletion is in progress. Retry deleting your account.");
}

export async function beginAccountDeletion(userId: string) {
  try {
    await database().send(new UpdateCommand({ TableName: env("DYNAMODB_TABLE_NAME"), Key: accountStateKey(userId), UpdateExpression: "SET #state = :deleting", ConditionExpression: "attribute_not_exists(uploads) OR uploads = :zero", ExpressionAttributeNames: { "#state": "state" }, ExpressionAttributeValues: { ":deleting": "deleting", ":zero": 0 } }));
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") throw new ApiError(409, "An upload is in progress. Retry account deletion after it finishes.");
    throw error;
  }
}

export async function withFileUpload<T>(userId: string, operation: () => Promise<T>) {
  const condition = activeAccountCondition(userId);
  await database().send(new UpdateCommand({ ...condition, UpdateExpression: "ADD uploads :one", ExpressionAttributeValues: { ":one": 1 } }));
  try { return await operation(); }
  finally {
    await database().send(new UpdateCommand({ TableName: env("DYNAMODB_TABLE_NAME"), Key: accountStateKey(userId), UpdateExpression: "ADD uploads :minusOne", ExpressionAttributeValues: { ":minusOne": -1 } }));
  }
}
