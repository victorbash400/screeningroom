import type { AccountUser, AccountNotification } from "./accountTypes";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
  }
}
export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Server returned invalid data.");
  return value as Record<string, unknown>;
}
export function parseUser(value: unknown): AccountUser {
  const user = object(value);
  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.name !== "string" ||
    typeof user.emailVerified !== "boolean"
  )
    throw new Error("Server returned invalid account data.");
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
  };
}
export function parseNotifications(value: unknown): AccountNotification[] {
  const response = object(value);
  if (!Array.isArray(response.notifications))
    throw new Error("Server returned invalid notifications.");
  return response.notifications.map((value) => {
    const item = object(value);
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      !(
        item.trashedAt === undefined ||
        item.trashedAt === null ||
        (typeof item.trashedAt === "string" &&
          Number.isFinite(Date.parse(item.trashedAt)))
      ) ||
      !(
        item.readAt === null ||
        (typeof item.readAt === "string" &&
          Number.isFinite(Date.parse(item.readAt)))
      )
    )
      throw new Error("Server returned invalid notifications.");
    return {
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      readAt: item.readAt,
      trashedAt: typeof item.trashedAt === "string" ? item.trashedAt : null,
    };
  });
}
export async function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new ApiError("Server returned an invalid response.", response.status);
  }
  if (!response.ok) {
    const payload = object(value);
    const error = payload.error;
    if (
      process.env.NODE_ENV === "development" &&
      typeof payload.code === "string"
    )
      console.warn("API request failed", {
        path: path.split("?")[0],
        status: response.status,
        code: payload.code,
      });
    throw new ApiError(
      typeof error === "string"
        ? error
        : `Request failed (${response.status}).`,
      response.status,
      value,
    );
  }
  return value;
}
