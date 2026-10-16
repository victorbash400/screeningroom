export interface AccountUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}
export interface AccountNotification {
  id: string;
  title: string;
  createdAt: string;
  readAt: string | null;
  trashedAt: string | null;
}
export type AuthStep =
  "sign-in" | "sign-up" | "confirm" | "reset" | "reset-confirm";
export type AccountSurface =
  | "auth"
  | "account"
  | "connections"
  | "storage"
  | "workspaces"
  | "activity"
  | "appearance"
  | "help"
  | null;

export function isSettingsSurface(surface: AccountSurface) {
  return surface !== null && surface !== "auth" && surface !== "help";
}
