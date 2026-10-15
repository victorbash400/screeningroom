"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { AccountSurface } from "../lib/accountTypes";
import { useAccountNotifications } from "./useAccountNotifications";
import { useAccountSession } from "./useAccountSession";
type AccountState = ReturnType<typeof useAccountSession> & {
  notifications: ReturnType<typeof useAccountNotifications>;
  surface: AccountSurface;
  open: (surface: AccountSurface) => void;
};
const AccountContext = createContext<AccountState | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccountSession();
  const notifications = useAccountNotifications(
    account.user?.id,
    account.request,
  );
  const [surface, setSurface] = useState<AccountSurface>(null);
  const { setError } = account;
  const open = useCallback(
    (next: AccountSurface) => {
      setError(null);
      setSurface(next);
    },
    [setError],
  );
  async function signOut() {
    const success = await account.signOut();
    if (success) setSurface(null);
    return success;
  }
  return (
    <AccountContext
      value={{ ...account, signOut, notifications, surface, open }}
    >
      {children}
    </AccountContext>
  );
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("Account provider is missing.");
  return account;
}
