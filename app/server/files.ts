import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage } from "./aws";
import { env } from "./config";

export function objectKey(userId: string, fileId: string) { return `users/${userId}/files/${fileId}`; }

export async function downloadUrl(userId: string, fileId: string, expiresIn = 60) {
  return getSignedUrl(storage(), new GetObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, fileId), ResponseContentDisposition: "attachment" }), { expiresIn });
}
