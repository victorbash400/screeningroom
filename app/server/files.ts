import "server-only";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage } from "./aws";
import { env } from "./config";
import { withFileUpload } from "./account-state";

export function objectKey(userId: string, fileId: string) { return `users/${userId}/files/${fileId}`; }

export async function uploadFile(userId: string, fileId: string, content: Uint8Array, contentType: string) {
  await withFileUpload(userId, () => storage().send(new PutObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, fileId), Body: content, ContentType: contentType })));
}

export async function downloadUrl(userId: string, fileId: string) {
  return getSignedUrl(storage(), new GetObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, fileId), ResponseContentDisposition: "attachment" }), { expiresIn: 60 });
}
