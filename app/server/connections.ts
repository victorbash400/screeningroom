import "server-only";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { generateText } from "ai";
import { database, storage } from "./aws";
import { env } from "./config";
import { chatModel } from "./bedrock";
import { qlooRequest } from "../tools/qloo";
import type { ConnectionId, ConnectionStatus } from "../lib/connections";

export async function connectionStatus(service: ConnectionId, userId: string, probe = false, signal?: AbortSignal): Promise<ConnectionStatus> {
  switch (service) {
    case "auth": return "connected";
    case "database":
      await database().send(new DescribeTableCommand({ TableName: env("DYNAMODB_TABLE_NAME") }), { abortSignal: signal });
      return "connected";
    case "storage":
      await storage().send(new ListObjectsV2Command({ Bucket: env("S3_BUCKET_NAME"), Prefix: `users/${userId}/`, MaxKeys: 1 }), { abortSignal: signal });
      return "connected";
    case "bedrock":
      if (!process.env.BEDROCK_PROJECT_ID || !process.env.BEDROCK_MODEL_ID || !process.env.BEDROCK_BASE_URL) return "unavailable";
      if (!probe) return "configured";
      const result = await generateText({ model: await chatModel(), prompt: "Reply only OK.", maxRetries: 0, abortSignal: signal });
      if (!result.text.trim()) throw new Error("Bedrock returned no text.");
      return "connected";
    case "qloo":
      if (!process.env.QLOO_HACKATHON_API_KEY || !process.env.QLOO_HACKATHON_API_SERVER_URL) return "unavailable";
      if (!probe) return "configured";
      await qlooRequest("/search", { query: "Inception", types: "urn:entity:movie", take: "1" }, signal);
      return "connected";
  }
}
