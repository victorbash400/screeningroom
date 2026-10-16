import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected) throw new ApiError(403, "Request origin is not allowed.");
}

export async function body<T>(request: Request, schema: z.ZodType<T>, limit = 64_000): Promise<T> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > limit) { await reader.cancel(); throw new ApiError(413, "Request is too large."); }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, "Invalid JSON."); }
  return schema.parse(value);
}

export function failure(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: error.issues[0]?.message || "Invalid request." }, 400);
  const name = error instanceof Error ? error.name : "UnknownError";
  const errors: Record<string, [number, string, string?]> = {
    NotAuthorizedException: [401, "Email or password is incorrect, or the session expired."],
    UserNotFoundException: [401, "Email or password is incorrect."],
    UserNotConfirmedException: [403, "Confirm your email before signing in.", "EMAIL_UNCONFIRMED"],
    UsernameExistsException: [409, "An account with this email already exists."],
    InvalidPasswordException: [400, "Use at least 12 characters, uppercase, lowercase and a number."],
    CodeMismatchException: [400, "Incorrect confirmation code."],
    ExpiredCodeException: [400, "Confirmation code expired. Request another code."],
    LimitExceededException: [429, "Too many attempts. Try again later."],
    TooManyRequestsException: [429, "Too many attempts. Try again later."],
    InvalidParameterException: [400, "Invalid account details."],
    ConditionalCheckFailedException: [409, "Record changed or no longer exists."],
  };
  if (name === "TransactionCanceledException" && typeof error === "object" && error !== null && "CancellationReasons" in error && Array.isArray(error.CancellationReasons) && error.CancellationReasons.some((reason) => reason?.Code === "ConditionalCheckFailed")) return json({ error: "Record changed or account deletion is in progress." }, 409);
  const mapped = errors[name];
  if (mapped) return json({ error: mapped[1], ...(mapped[2] ? { code: mapped[2] } : {}) }, mapped[0]);
  const providerStatus = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode = typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
  console.error("Screening Room backend request failed", JSON.stringify({ name, providerStatus, causeCode }));
  const transportCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
  const code = transportCode || causeCode || name;
  const timeout = ["ETIMEDOUT", "ETIMEOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "TimeoutError"].includes(code);
  return json({
    error: timeout
      ? "Screeningroom took too long to respond. Try again."
      : "Screeningroom could not complete the request. Try again.",
    code,
    ...(process.env.NODE_ENV === "development" ? { providerStatus } : {}),
  }, timeout ? 504 : 503);
}
