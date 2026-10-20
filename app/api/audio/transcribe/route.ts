import { requireUser } from "../../../server/auth";
import { checkOrigin, failure, json } from "../../../server/http";
import { recordingBytes, recordingFormat, transcribeRecording } from "../../../server/dictation";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    const format = recordingFormat(request.headers.get("content-type") ?? "");
    const bytes = await recordingBytes(request);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(270_000)]);
    return json({ text: await transcribeRecording(bytes, format, signal) });
  } catch (error) { return failure(error); }
}
