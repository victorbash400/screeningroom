import { useEffect, useLayoutEffect, useRef } from "react";
import { useAccount } from "../../state/AccountContext";
import { RoomDataProvider } from "../../state/RoomDataContext";
import { storageKey } from "../../lib/storage";
import RoomApplication from "./RoomApplication";
import SignInDialog from "../account/SignInDialog";
import ShortcutsDialog from "../account/ShortcutsDialog";
import ErrorNotice from "./ErrorNotice";
import styles from "./RoomSession.module.css";
export default function RoomSession() {
  const account = useAccount();
  const scope = account.user
    ? `${storageKey}.account.${account.user.id}`
    : null;
  const previousScope = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!account.ready) return;
    if (previousScope.current !== null && previousScope.current !== scope)
      window.history.replaceState(null, "", "/");
    previousScope.current = scope;
  }, [scope, account.ready]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "," &&
        account.user &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        account.open("account");
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [account.user, account.open]);
  return (
    <div className={styles.session} aria-busy={!account.ready}>
      {account.user &&
        account.error &&
        account.surface !== "auth" &&
        account.surface !== "account" && (
          <ErrorNotice
            message={account.error}
            onRetry={() => {
              if (account.cleanupPending) account.retryCleanup();
              else void account.load();
            }}
            onDismiss={() => account.setError(null)}
          />
        )}
      {account.ready && account.user && scope && (
        <RoomDataProvider key={scope} scope={scope}>
          <div className={styles.room}>
            <RoomApplication />
          </div>
        </RoomDataProvider>
      )}
      {account.ready && !account.user && <SignInDialog required />}
      {account.user && account.surface === "auth" && <SignInDialog />}
      {account.user && account.surface === "help" && (
        <ShortcutsDialog onClose={() => account.open(null)} />
      )}
    </div>
  );
}
