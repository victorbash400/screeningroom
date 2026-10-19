import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import AppIcon from "../controls/AppIcon";
import ImportDestination from "../workspace/ImportDestination";
import ImportLinkForm from "../workspace/ImportLinkForm";
import modal from "../workspace/ImportDialog.module.css";
import upload from "../workspace/ImportUploadArea.module.css";
import { exampleWorkspace } from "./tourExample";
import ImportArtwork from "../workspace/ImportArtwork";
import ImportSourceTabs, { type ImportSource } from "../workspace/ImportSourceTabs";
import IconButton from "../controls/IconButton";
import PillButton from "../controls/PillButton";
import styles from "./TourImport.module.css";

export default function TourImport({ onImport, onClose }: { onImport: (source: ImportSource, link?: { url: string; name: string }) => void; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const [source, setSource] = useState<ImportSource>("upload");
  return <section ref={panel} role="dialog" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }} className={`${modal.dialog} ${styles.panel}`} aria-label="Example import">
    <header className={modal.header}><AppIcon /><span>Import</span><IconButton label="Close example import" onClick={onClose}><X /></IconButton></header>
    <ImportDestination path={[exampleWorkspace.name]} />
    <ImportSourceTabs source={source} busy={false} onChange={setSource} />
    {source === "upload" ? <div className={upload.area}><ImportArtwork /><PillButton onClick={() => onImport(source)}>Try sample files</PillButton></div> : <ImportLinkForm onImport={(url, name) => { onImport(source, { url, name }); return true; }} />}

  </section>;
}
