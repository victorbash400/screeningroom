import { useEffect, useRef, useState } from "react";
import { GitBranch, X } from "lucide-react";
import { useRoomStore } from "../../state/RoomDataContext";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import { syncLabels } from "../../lib/roomSyncStatus";
import IconButton from "../controls/IconButton";
import LoadingIndicator from "../controls/LoadingIndicator";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import dialogStyles from "../controls/NameDialog.module.css";
import styles from "./SyncDialog.module.css";

export default function SyncDialog({ onClose, returnFocus }: { onClose: () => void; returnFocus: HTMLElement | null }) {
  const room = useRoomStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const [syncing, setSyncing] = useState(false);
  const backdrop = useDialogBackdrop(onClose);
  const { checkSync } = room;
  useEffect(() => {
    const previous = returnFocus ?? document.activeElement;
    dialog.current?.showModal();
    void checkSync();
    return () => { queueMicrotask(() => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }); };
  }, [checkSync, returnFocus]);
  const status = room.syncStatus;
  const busy = syncing || status.state === "checking" || status.state === "saving";
  const canSync = ["behind", "diverged", "unsaved"].includes(status.state);
  const error = status.error ?? (status.state === "unsaved" ? room.error : null);
  return <dialog ref={dialog} className={`${dialogStyles.dialog} ${styles.dialog}`} aria-label="Sync"
    onCancel={onClose} onKeyDown={(event) => event.stopPropagation()} {...backdrop}>
    <header className={styles.header}>
      <GitBranch size={20} /><span>Sync</span>
      <IconButton label="Close sync" onClick={onClose}><X /></IconButton>
    </header>
    <div className={styles.status} role="status">
      {busy && <LoadingIndicator />}
      {syncing ? "Syncing…" : syncLabels[status.state]}
    </div>
    <dl className={styles.versions}>
      <dt>This browser</dt><dd>{status.localRevision}</dd>
      <dt>Saved version</dt><dd>{status.remoteRevision ?? "—"}</dd>
      <dt>Last checked</dt><dd>{status.checkedAt ? <time dateTime={status.checkedAt}>{new Date(status.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : "—"}</dd>
    </dl>
    {status.conflicts.length > 0 && <ul className={styles.conflicts}>{status.conflicts.map((item) =>
      <li key={`${item.kind}:${item.id}`}>{item.kind}: {item.name}</li>,
    )}</ul>}
    {error && <p className={dialogStyles.error} role="alert">{error}</p>}
    <footer className={dialogStyles.actions}>
      <SettingsInlineButton disabled={busy} onClick={() => { void checkSync(); }}>Check again</SettingsInlineButton>
      {canSync && <SettingsInlineButton disabled={busy} onClick={async () => {
        setSyncing(true);
        try { await room.syncNow(); }
        finally { setSyncing(false); }
      }}>Sync</SettingsInlineButton>}
      <SettingsInlineButton onClick={onClose}>Done</SettingsInlineButton>
    </footer>
  </dialog>;
}
