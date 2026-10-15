import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { requireUser } from "../../server/auth";
import { database, storage } from "../../server/aws";
import { env } from "../../server/config";
import { failure, json } from "../../server/http";

export async function GET() {
  try {
    const user = await requireUser();
    const results = await Promise.allSettled([
      database().send(new DescribeTableCommand({ TableName: env("DYNAMODB_TABLE_NAME") })),
      storage().send(new ListObjectsV2Command({ Bucket: env("S3_BUCKET_NAME"), Prefix: `users/${user.sub}/`, MaxKeys: 1 })),
    ]);
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") console.error("Screening Room health check failed", { service: index === 0 ? "database" : "storage", name: result.reason instanceof Error ? result.reason.name : "UnknownError" });
    }
    const services = { database: results[0].status === "fulfilled" ? "connected" : "unavailable", storage: results[1].status === "fulfilled" ? "connected" : "unavailable", auth: "configured", bedrock: process.env.BEDROCK_PROJECT_ID && process.env.BEDROCK_MODEL_ID && process.env.BEDROCK_BASE_URL ? "configured" : "unavailable" };
    const ok = !Object.values(services).includes("unavailable");
    return json({ status: ok ? "ok" : "degraded", services }, ok ? 200 : 503);
  } catch (error) { return failure(error); }
}
