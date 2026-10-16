"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AccountSurface } from "../lib/accountTypes";
import { useAccountSession } from "./useAccountSession";
import { setAssetCacheOwner } from "../lib/assetCache";
type AccountState = ReturnType<typeof useAccountSession> & {
  surface: AccountSurface;
  open: (surface: AccountSurface) => void;
  beforeSignOut: (save: () => Promise<boolean>) => () => void;
};
const AccountContext = createContext<AccountState | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const account = useAccountSession();
  useEffect(() => {
    if (account.ready && (account.user || !account.unavailable)) void setAssetCacheOwner(account.user?.id ?? null);
  }, [account.ready, account.user?.id, account.unavailable]);
  const [surface, setSurface] = useState<AccountSurface>(null);
  const { setError } = account;
  const saves = useRef(new Set<() => Promise<boolean>>());
  const beforeSignOut = useCallback((save: () => Promise<boolean>) => {
    saves.current.add(save);
    return () => { saves.current.delete(save); };
  }, []);
  const open = useCallback(
    (next: AccountSurface) => {
      setError(null);
      setSurface(next);
    },
    [setError],
  );
  async function signOut() {
    const results = await Promise.all([...saves.current].map((save) => save()));
    if (results.some((saved) => !saved)) {
      setError("Changes have not saved. Retry saving before signing out.");
      return false;
    }
    const success = await account.signOut();
    if (success) { await setAssetCacheOwner(null); setSurface(null); }
    return success;
  }
  return (
    <AccountContext
      value={{ ...account, signOut, surface, open, beforeSignOut }}
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
