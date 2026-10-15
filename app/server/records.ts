import "server-only";
import { GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { database } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";
import { activeAccountWrite } from "./account-state";

export const recordKind = z.enum(["workspace", "project", "conversation", "notification"]);
export type RecordKind = z.infer<typeof recordKind>;
export const recordId = z.string().uuid();
export const notificationSchema = z.object({ id: recordId, title: z.string(), createdAt: z.string(), readAt: z.string().nullable(), trashedAt: z.string().nullable().default(null) });

function key(userId: string, kind: RecordKind, id: string) { return { pk: `USER#${userId}`, sk: `${kind}#${id}` }; }

export async function getRecord(userId: string, kind: RecordKind, id: string) {
  const result = await database().send(new GetCommand({ TableName: env("DYNAMODB_TABLE_NAME"), Key: key(userId, kind, id), ConsistentRead: true }));
  return result.Item || null;
}

export async function listRecords(userId: string, kind: RecordKind, cursor?: string) {
  let start: { pk: string; sk: string } | undefined;
  if (cursor) {
    let value: unknown;
    try { value = JSON.parse(Buffer.from(cursor, "base64url").toString()); }
    catch { throw new ApiError(400, "Invalid page cursor."); }
    start = z.object({ pk: z.literal(`USER#${userId}`), sk: z.string().startsWith(`${kind}#`) }).strict().parse(value);
  }
  const result = await database().send(new QueryCommand({ TableName: env("DYNAMODB_TABLE_NAME"), KeyConditionExpression: "pk = :pk AND begins_with(sk, :kind)", ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":kind": `${kind}#` }, Limit: 100, ExclusiveStartKey: start, ConsistentRead: true }));
  return { records: (result.Items || []).map(({ pk, sk, ...item }) => { void pk; void sk; return item; }), cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url") : null };
}

export async function putRecord(userId: string, kind: RecordKind, id: string, value: unknown, expectedVersion: number) {
  const item = { ...key(userId, kind, id), id, kind, value, version: expectedVersion + 1, updatedAt: new Date().toISOString() };
  await database().send(new TransactWriteCommand({ TransactItems: [activeAccountWrite(userId), { Put: { TableName: env("DYNAMODB_TABLE_NAME"), Item: item, ConditionExpression: expectedVersion === 0 ? "attribute_not_exists(pk)" : "#version = :version", ...(expectedVersion > 0 ? { ExpressionAttributeNames: { "#version": "version" }, ExpressionAttributeValues: { ":version": expectedVersion } } : {}) } }] }));
  return { id, kind, value, version: item.version, updatedAt: item.updatedAt };
}

export async function deleteRecord(userId: string, kind: RecordKind, id: string, version: number) {
  await database().send(new TransactWriteCommand({ TransactItems: [activeAccountWrite(userId), { Delete: { TableName: env("DYNAMODB_TABLE_NAME"), Key: key(userId, kind, id), ConditionExpression: "#version = :version", ExpressionAttributeNames: { "#version": "version" }, ExpressionAttributeValues: { ":version": version } } }] }));
}

export async function updateNotification(userId: string, id: string, trashed?: boolean) {
  const now = new Date().toISOString();
  const attribute = trashed === undefined ? "readAt" : "trashedAt";
  const value = trashed === false ? null : now;
  await database().send(new TransactWriteCommand({ TransactItems: [activeAccountWrite(userId), { Update: { TableName: env("DYNAMODB_TABLE_NAME"), Key: key(userId, "notification", id), UpdateExpression: "SET #value.#attribute = :value, updatedAt = :now ADD #version :one", ConditionExpression: "attribute_exists(pk)", ExpressionAttributeNames: { "#value": "value", "#attribute": attribute, "#version": "version" }, ExpressionAttributeValues: { ":value": value, ":now": now, ":one": 1 } } }] }));
  return notificationSchema.parse((await getRecord(userId, "notification", id))?.value);
}
