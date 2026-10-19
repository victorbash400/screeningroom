import { Import } from "lucide-react";
import type { FileNode, ViewMode } from "../../lib/types";
import { fileIcon } from "../../lib/fileTypes";
import DirectoryHeader from "../workspace/DirectoryHeader";
import NodeValues from "../workspace/NodeValues";
import WorkspaceRow from "../workspace/WorkspaceRow";
import row from "../workspace/NodeTile.module.css";
import PillButton from "../controls/PillButton";
import { exampleFiles, exampleWorkspace } from "./tourExample";
import styles from "./TourFiles.module.css";

export default function TourFiles({ workspaceOpen, uploaded, mode, selected, onOpen, onImport, onSelect, linked, query }: {
  linked?: FileNode; query: string; workspaceOpen: boolean; uploaded: boolean; mode: ViewMode; selected?: string; onOpen: () => void; onImport: () => void; onSelect: (id: string) => void;
}) {
  if (!workspaceOpen) return <div className={styles.home}><WorkspaceRow workspace={exampleWorkspace} onOpen={onOpen} /></div>;
  const files = (linked ? [linked] : exampleFiles).filter(node => node.name.toLowerCase().includes(query.toLowerCase()));
  return <div className={styles.files} data-mode={mode}>
    {!uploaded ? <div className={styles.import}><PillButton onClick={onImport}><Import size={16} />Import</PillButton></div> : <>
      {mode !== "grid" && <DirectoryHeader column={mode === "columns"} />}
      <div className={styles.list}>{files.map(node => { const Icon = fileIcon(node.name, node.sourceUrl); return <div key={node.id} className={`${row.row} ${mode === "grid" ? row.grid : mode === "columns" ? row.column : ""} ${node.id === selected ? row.selected : ""}`}>
        <button type="button" className={row.open} aria-pressed={node.id === selected} onClick={() => onSelect(node.id)}><Icon size={mode === "grid" ? 56 : 24} strokeWidth={1.7} /><span>{node.name}</span>{mode === "list" && <NodeValues node={node} />}</button>
      </div>; })}</div>
      {selected && <div className={styles.preview}>{selected === "tour-link" ? <p>{linked?.sourceUrl}</p> : selected === "tour-brief" ? <div><strong>Night Signals</strong><p>A short documentary about independent music and the spaces that bring listeners together.</p></div> : <img src="/auth/media-01.webp" alt="Example media thumbnail: a record playing on a turntable" width={400} height={400} />}</div>}
    </>}
  </div>;
}
