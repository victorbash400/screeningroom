import { useRef, useState } from "react";
import PillButton from "../controls/PillButton";
import ImportArtwork from "./ImportArtwork";
import styles from "./ImportUploadArea.module.css";

export default function ImportUploadArea({ busy, onFiles, onDrop, onClose }: {
  busy: boolean;
  onFiles: (files: FileList, folder: boolean) => Promise<boolean>;
  onDrop: (items: DataTransferItemList) => Promise<boolean>;
  onClose: () => void;
}) {
  const files = useRef<HTMLInputElement>(null);
  const folders = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  async function picked(input: HTMLInputElement, folder: boolean) {
    if (input.files?.length && await onFiles(input.files, folder)) onClose();
    input.value = "";
  }
  return (
    <div className={styles.area} data-drag-over={over || undefined}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = busy ? "none" : "copy";
        if (!busy) setOver(true);
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOver(false);
      }}
      onDrop={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        if (!busy && event.dataTransfer.types.includes("Files") && await onDrop(event.dataTransfer.items)) onClose();
      }}>
      <ImportArtwork />
      <PillButton aria-label="Browse files" disabled={busy} onClick={() => files.current?.click()}>
        {busy ? "Importing…" : "Browse files"}
      </PillButton>
      <button className={styles.folder} disabled={busy} onClick={() => folders.current?.click()}>Choose folder</button>
      <input ref={files} type="file" multiple hidden disabled={busy} onChange={(event) => void picked(event.currentTarget, false)} />
      <input ref={(element) => { folders.current = element; element?.setAttribute("webkitdirectory", ""); }}
        type="file" multiple hidden disabled={busy} onChange={(event) => void picked(event.currentTarget, true)} />
    </div>
  );
}
