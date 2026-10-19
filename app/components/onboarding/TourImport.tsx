import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import AppIcon from "../controls/AppIcon";
import ImportDestination from "../workspace/ImportDestination";
import ImportLinkForm from "../workspace/ImportLinkForm";
import modal from "../workspace/ImportDialog.module.css";
import ImportUploadArea from "../workspace/ImportUploadArea";
import ImportProgress from "../workspace/ImportProgress";
import { exampleFiles, exampleWorkspace } from "./tourExample";
import ImportSourceTabs, { type ImportSource } from "../workspace/ImportSourceTabs";
import IconButton from "../controls/IconButton";
import styles from "./TourImport.module.css";

export default function TourImport({ busy = false, items = 0, onImport, onClose }: { busy?: boolean; items?: number; onImport: (source: ImportSource, link?: { url: string; name: string }) => void; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const [source, setSource] = useState<ImportSource>("upload");
  return <section ref={panel} role="dialog" aria-modal="true" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
      const edge = event.shiftKey ? controls[0] : controls.at(-1);
      if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus(); }
    }
  }} className={`${modal.dialog} ${styles.panel}`} aria-label="Example import">
    <header className={modal.header}><AppIcon /><span>Import</span><IconButton label="Close example import" onClick={onClose}><X /></IconButton></header>
    <ImportDestination path={[exampleWorkspace.name]} />
    <ImportSourceTabs source={source} busy={busy} onChange={setSource} />
    {source === "upload" ? <div className={styles.upload} data-busy={busy}><ImportUploadArea busy={busy} onFiles={async () => false} onDrop={async () => false} onClose={onClose} /></div> : <ImportLinkForm onImport={(url, name) => { onImport(source, { url, name }); return true; }} />}
    {busy && <ImportProgress progress={{ name: exampleFiles[Math.max(0, items - 1)].name, completedItems: items, totalItems: 3, completedBytes: 0, totalBytes: 0 }} />}

  </section>;
}
