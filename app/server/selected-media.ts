import "server-only";
import { withPreparedMedia } from "./prepared-media";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { selectedMediaNodes } from "../lib/selectedMediaNodes";
import { loadRoom } from "./room";
import { downloadUrl, objectKey } from "./files";
import { storage } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";
import type { FileNode } from "../lib/types";

export function selectedMedia(userId: string, selectedIds: string[]) {
  let room: ReturnType<typeof loadRoom> | undefined;
  function load() { return room ??= loadRoom(userId); }
  async function nodes() {
    const { data } = await load();
    return selectedMediaNodes(selectedIds, data.nodes);
  }
  async function node(id: string) {
    const item = (await nodes()).find((item) => item.id === id);
    if (!item) throw new ApiError(404, "Select this file in the chat first. If it was just uploaded, let the workspace finish syncing.");
    return item;
  }
  async function text(item: FileNode, signal?: AbortSignal) {
    if (item.kind !== "file" || !item.content?.startsWith("cloud-file:")) throw new ApiError(400, "This file has no uploaded content.");
    const extension = item.name.slice(item.name.lastIndexOf(".") + 1).toLowerCase();
    if (!item.mimeType?.startsWith("text/") && !["txt", "md", "csv", "json", "srt", "vtt"].includes(extension)) throw new ApiError(400, "This model reads text, briefs, subtitles, CSV and JSON. Image, audio and video analysis needs a separate media model.");
    const result = await storage().send(new GetObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, item.content.slice(11)) }), { abortSignal: signal });
    if (!result.Body) throw new ApiError(404, "File content is unavailable.");
    return result.Body.transformToString();
  }
  async function evidence(id: string) {
    const { data } = await load();
    for (const conversation of data.conversations) for (const message of conversation.messages) for (const block of message.blocks ?? []) {
      if (block.kind === "tool" && block.tool.state === "done" && block.tool.research?.evidenceId === id) return block.tool.research;
    }
    return undefined;
  }
  async function source(item: FileNode) {
    if (item.kind !== "file" || !item.content?.startsWith("cloud-file:")) throw new ApiError(400, "Upload the media file before analyzing it.");
    return downloadUrl(userId, item.content.slice(11), 300);
  }
  async function withSource<T>(item: FileNode, operation: (source: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
    return withPreparedMedia(userId, item, (prepare) => prepare(operation), signal);
  }

  return { nodes, node, text, evidence, source, withSource };
}
