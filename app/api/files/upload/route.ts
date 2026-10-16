import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireUser } from "../../../server/auth";
import { body, checkOrigin, failure, json } from "../../../server/http";
import { storage } from "../../../server/aws";
import { env } from "../../../server/config";
import { objectKey } from "../../../server/files";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ size: z.number().int().nonnegative(), contentType: z.string().min(1).max(200) }).strict());
    const id = crypto.randomUUID();
    const url = await getSignedUrl(storage(), new PutObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(user.sub, id), ContentLength: input.size, ContentType: input.contentType }), { expiresIn: 300 });
    return json({ id, url, ownerId: user.sub });
  } catch (error) { return failure(error); }
}
