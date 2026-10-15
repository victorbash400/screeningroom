import { ArrowLeft, PanelLeftOpen } from "lucide-react";
import { useAccount } from "../../state/AccountContext";
import AppearanceSettings from "../appearance/AppearanceSettings";
import Notifications from "../notifications/Notifications";
import AccountSettings from "./AccountSettings";
import Connections from "./Connections";
import ActivitySettings from "../settings/ActivitySettings";
import StorageSettings from "../settings/StorageSettings";
import WorkspaceSettings from "../settings/WorkspaceSettings";
import IconButton from "../controls/IconButton";
import { useScrollEdges } from "../../state/useScrollEdges";
import edges from "../controls/ScrollEdges.module.css";
import styles from "./SettingsShell.module.css";
export default function SettingsShell({ onNavigation }: { onNavigation: () => void }) {
  const scroll = useScrollEdges<HTMLElement>();
  const account = useAccount();
  const title =
    account.surface === "activity"
      ? "Activity"
      : account.surface === "storage"
        ? "Storage"
        : account.surface === "workspaces"
          ? "Workspaces"
          : account.surface === "appearance"
            ? "Appearance"
            : account.surface === "notifications"
              ? "Notifications"
              : account.surface === "connections"
                ? "Connections"
                : "Account";
  return (
      <main
        ref={scroll}
        className={`${styles.main} ${edges.edges} ${account.surface === "activity" ? styles.activity : ""}`}
        aria-label={title}
      >
        <div className={styles.content}>
          <header>
            <span className={styles.mobile}>
              <IconButton label="Open navigation" onClick={onNavigation}>
                <PanelLeftOpen />
              </IconButton>
            </span>
            <IconButton
              label="Back to workspaces"
              onClick={() => account.open(null)}
            >
              <ArrowLeft />
            </IconButton>
            <h1>{title}</h1>
          </header>
          <div className={styles.surface} key={account.surface}>
            {account.surface === "activity" ? (
              <ActivitySettings />
            ) : account.surface === "storage" ? (
              <StorageSettings />
            ) : account.surface === "workspaces" ? (
              <WorkspaceSettings />
            ) : account.surface === "appearance" ? (
              <AppearanceSettings />
            ) : account.surface === "notifications" ? (
              <Notifications />
            ) : account.surface === "connections" ? (
              <Connections />
            ) : (
              <AccountSettings />
            )}
          </div>
        </div>
      </main>
  );
}
