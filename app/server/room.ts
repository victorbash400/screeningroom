import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { emptyData, parseData } from "../lib/storage";
import type { RoomData } from "../lib/types";
import { getRecord, putRecord, recordId } from "./records";
import { objectKey } from "./files";
import { storage } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";

const roomId = "00000000-0000-4000-8000-000000000001";
export async function loadRoom(userId: string) {
  const record = await getRecord(userId, "workspace", roomId);
  if (!record) return { data: emptyData, revision: 0, imports: [] as string[], mutationId: null };
  const { fileId, imports, mutationId } = record.value;
  return { data: await readRoomFile(userId, fileId), revision: record.version as number, imports: imports as string[], mutationId: mutationId as string };
}

export async function saveRoom(userId: string, fileId: string, revision: number, imports: string[], mutationId: string) {
  const current = await getRecord(userId, "workspace", roomId);
  if (current?.value.mutationId === mutationId) return { revision: current.version as number };
  if ((current?.version ?? 0) !== revision) throw new ApiError(409, "Workspace changed in another browser. Retry to merge your changes.");
  const data = await readRoomFile(userId, fileId);
  for (const node of data.nodes) {
    for (const content of [node.content, ...(node.versions ?? []).map((version) => version.content)]) {
      if (content !== undefined && (!content.startsWith("cloud-file:") || !recordId.safeParse(content.slice(11)).success)) throw new ApiError(400, "Upload file contents before saving the workspace.");
    }
  }
  const record = await putRecord(userId, "workspace", roomId, { fileId, imports, mutationId }, revision);
  return { revision: record.version };
}

async function readRoomFile(userId: string, fileId: string): Promise<RoomData> {
  recordId.parse(fileId);
  const result = await storage().send(new GetObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, fileId) }));
  if (!result.Body) throw new Error("Workspace content is unavailable.");
  try { return parseData(await result.Body.transformToString()); }
  catch { throw new ApiError(400, "Workspace data is invalid."); }
}
