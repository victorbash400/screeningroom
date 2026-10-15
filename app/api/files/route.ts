import { z } from "zod";
import { requireUser } from "../../server/auth";
import { uploadFile, downloadUrl } from "../../server/files";
import { recordId } from "../../server/records";
import { ApiError, checkOrigin, failure, json } from "../../server/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = recordId.parse(new URL(request.url).searchParams.get("id"));
    return json({ url: await downloadUrl(user.sub, id), expiresIn: 60 });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const type = z.enum(["text/plain", "text/markdown", "application/json", "application/pdf", "image/png", "image/jpeg", "image/webp"]).parse(request.headers.get("content-type"));
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "File body is required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw new ApiError(413, "Maximum file size is 2 MB."); }
      chunks.push(result.value);
    }
    if (!size) throw new ApiError(400, "File is empty.");
    const content = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.byteLength; }
    const id = crypto.randomUUID();
    await uploadFile(user.sub, id, content, type);
    return json({ file: { id, size, contentType: type } }, 201);
  } catch (error) { return failure(error); }
}
