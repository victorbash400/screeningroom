export function requestedRange(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  if (!header.startsWith("bytes=") || header.includes(",")) return null;
  const parts = header.slice(6).split("-");
  const number = (value) => value && Array.from(value).every((digit) => "0123456789".includes(digit)) ? Number(value) : null;
  if (parts.length !== 2) return null;
  const first = number(parts[0]), last = number(parts[1]);
  if (first === null && (!parts[1] || last === null || last <= 0)) return null;
  if (parts[0] && first === null || parts[1] && last === null) return null;
  const start = first === null ? Math.max(0, size - last) : first;
  const end = first === null || last === null ? size - 1 : Math.min(last, size - 1);
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size ? { start, end, partial: true } : null;
}

export function storageRange(header) {
  if (!header?.startsWith("bytes ")) throw new Error("Storage returned no byte range.");
  const [bounds, total] = header.slice(6).split("/");
  const [start, end] = bounds.split("-").map(Number);
  const size = Number(total);
  if (![start, end, size].every(Number.isSafeInteger) || start < 0 || end < start || size <= end) throw new Error("Storage returned an invalid byte range.");
  return { start, end, size };
}
