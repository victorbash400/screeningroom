import "server-only";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { storage } from "./aws";
import { env } from "./config";

const savedSchema = z.object({ seenAt: z.iso.datetime() }).strict();
const location = (userId: string) => ({ Bucket: env("S3_BUCKET_NAME"), Key: `users/${userId}/preferences/walkthrough.json` });
export function demoTour(email: string) { return Boolean(process.env.DEMO_ACCOUNT_EMAIL && email.toLowerCase() === process.env.DEMO_ACCOUNT_EMAIL.toLowerCase()); }
export async function tourSeen(userId: string) {
  try {
    const result = await storage().send(new GetObjectCommand(location(userId)));
    if (!result.Body) throw new Error("Walkthrough preferences are unavailable.");
    savedSchema.parse(JSON.parse(await result.Body.transformToString()));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") return false;
    throw error;
  }
}
export async function saveTourSeen(userId: string) {
  await storage().send(new PutObjectCommand({ ...location(userId), Body: JSON.stringify({ seenAt: new Date().toISOString() }), ContentType: "application/json" }));
}
