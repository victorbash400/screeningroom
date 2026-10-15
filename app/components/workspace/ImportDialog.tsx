import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import IconButton from "../controls/IconButton";
import AppIcon from "../controls/AppIcon";
import ImportLinkForm from "./ImportLinkForm";
import ImportUploadArea from "./ImportUploadArea";
import ImportSourceTabs, { type ImportSource } from "./ImportSourceTabs";
import styles from "./ImportDialog.module.css";

export default function ImportDialog({ busy, error, onFiles, onDrop, onLink, onClose }: {
  busy: boolean;
  error: string | null;
  onFiles: (files: FileList, folder: boolean) => Promise<boolean>;
  onDrop: (items: DataTransferItemList) => Promise<boolean>;
  onLink: (url: string, name: string) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState<ImportSource>("upload");
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-label="Import" aria-busy={busy}
      onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }}>
      <header className={styles.header}>
        <AppIcon />
        <span>Import</span>
        <IconButton label="Close import" disabled={busy} onClick={onClose}><X /></IconButton>
      </header>
      <ImportSourceTabs source={source} busy={busy} onChange={setSource} />
      {source === "upload" ? (
        <ImportUploadArea busy={busy} onFiles={onFiles} onDrop={onDrop} onClose={onClose} />
      ) : (
        <ImportLinkForm onImport={(url, name) => { const success = onLink(url, name); if (success) onClose(); return success; }} />
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </dialog>
  );
}
