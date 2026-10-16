import {
  CircleHelp,
  LogIn,
  LogOut,
  Plug,
  Settings,
  CircleUserRound,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAccount } from "../../state/AccountContext";
import ContextMenu, { type MenuEntry } from "../controls/ContextMenu";
import styles from "./AccountFooter.module.css";
export default function AccountFooter() {
  const account = useAccount();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const close = useCallback(() => setPosition(null), []);
  const name = account.user?.name || account.user?.email || "";
  const entries: MenuEntry[] = [
    ...(name ? [{ label: name, disabled: true, action: () => {} }] : []),
    {
      label: "Settings",
      icon: Settings,
      action: () => account.open("account"),
    },
    {
      label: "Connections",
      icon: Plug,
      action: () => account.open("connections"),
    },
    { label: "Help", icon: CircleHelp, action: () => account.open("help") },
    account.user
      ? {
          label: "Sign out",
          icon: LogOut,
          disabled: account.busy,
          action: () => {
            void account.signOut();
          },
        }
      : { label: "Sign in", icon: LogIn, action: () => account.open("auth") },
  ];
  return (
    <footer className={styles.footer}>
      <button
        className={styles.avatar}
        disabled={!account.ready}
        aria-label={name ? `Account menu for ${name}` : "Account menu"}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(
            position
              ? null
              : { x: rect.left, y: rect.top - entries.length * 36 - 16 },
          );
        }}
      >
        <CircleUserRound size={24} strokeWidth={1.8} />
      </button>
      {position && (
        <ContextMenu
          {...position}
          label="Account"
          className={styles.menu}
          onClose={close}
          entries={entries}
        />
      )}
    </footer>
  );
}
