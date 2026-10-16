export function sessionExpiry(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= Date.now()
  )
    throw new Error("Session expired. Sign in again.");
  return value;
}
