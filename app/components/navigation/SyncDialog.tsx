import { useEffect, useRef, useState } from "react";
import { GitBranch } from "lucide-react";
import { useRoomStore } from "../../state/RoomDataContext";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import { syncLabels } from "../../lib/roomSyncStatus";
import PillButton from "../controls/PillButton";
import LoadingIndicator from "../controls/LoadingIndicator";
import dialogStyles from "../controls/StatusDialog.module.css";
import styles from "./SyncDialog.module.css";

export default function SyncDialog({ onClose, returnFocus }: { onClose: () => void; returnFocus: HTMLElement | null }) {
  const room = useRoomStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [syncing, setSyncing] = useState(false);
  const backdrop = useDialogBackdrop(onClose);
  const { checkSync } = room;
  useEffect(() => {
    const previous = returnFocus ?? document.activeElement;
    dialog.current?.showModal();
    doneButton.current?.focus({ preventScroll: true });
    void checkSync();
    return () => { queueMicrotask(() => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }); };
  }, [checkSync, returnFocus]);
  const status = room.syncStatus;
  const busy = syncing || status.state === "checking" || status.state === "saving";
  const canSync = ["behind", "diverged", "unsaved"].includes(status.state);
  const error = status.error ?? (status.state === "unsaved" ? room.error : null);
  return <dialog ref={dialog} className={dialogStyles.dialog} aria-label="Sync"
    onCancel={onClose} onKeyDown={(event) => event.stopPropagation()} {...backdrop}>
    <GitBranch className={`${dialogStyles.symbol} ${styles.icon}`} aria-hidden="true" />
    <div className={styles.status} role="status">
      {busy && <LoadingIndicator size={14} />}
      {syncing ? "Syncing…" : syncLabels[status.state]}
    </div>
    <div className={styles.details}>
      <dl className={styles.versions}>
        <dt>This browser</dt><dd>{status.localRevision}</dd>
        <dt>Saved version</dt><dd>{status.remoteRevision ?? "—"}</dd>
        <dt>Last checked</dt><dd>{status.checkedAt ? <time dateTime={status.checkedAt}>{new Date(status.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : "—"}</dd>
      </dl>
      {status.conflicts.length > 0 && <ul className={styles.conflicts}>{status.conflicts.map((item) =>
        <li key={`${item.kind}:${item.id}`}>{item.kind}: {item.name}</li>,
      )}</ul>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
    <footer className={dialogStyles.actions}>
      <PillButton secondary disabled={busy} onClick={() => { void checkSync(); }}>Check again</PillButton>
      {canSync && <PillButton disabled={busy} onClick={async () => {
        setSyncing(true);
        try { await room.syncNow(); }
        finally { setSyncing(false); }
      }}>Sync</PillButton>}
      <PillButton ref={doneButton} secondary={canSync} autoFocus onClick={onClose}>Done</PillButton>
    </footer>
  </dialog>;
}
