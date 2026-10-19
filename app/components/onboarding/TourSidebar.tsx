import { ChevronRight, FolderClosed, FolderOpen, House } from "lucide-react";
import AppIcon from "../controls/AppIcon";
import SidebarSearch from "../navigation/SidebarSearch";
import { exampleFiles, exampleWorkspace } from "./tourExample";
import layout from "../navigation/Sidebar.module.css";
import tree from "../navigation/WorkspaceBranch.module.css";
import styles from "./TourSidebar.module.css";

export default function TourSidebar({ open, onOpen, onHome, onSearch }: { query: string; onSearch: (query: string) => void; open: boolean; onOpen: () => void; onHome: () => void }) {
  const Icon = open ? FolderOpen : FolderClosed;
  return <aside className={`${layout.sidebar} ${styles.sidebar}`} aria-label="Example navigation">
    <div className={layout.brand}><AppIcon size={20} /><span>Screeningroom</span></div>
    <div className={layout.panel}>
      <div className={layout.homeRow}><button type="button" className={layout.home} onClick={onHome}><House size={24} strokeWidth={1.7} />Home</button></div>
      <SidebarSearch data={{ version: 1, workspaces: [exampleWorkspace], nodes: exampleFiles, conversations: [] }} settings={false} onNavigate={onOpen} onOpenNode={node => onSearch(node.name)} />
      <div className={layout.navigation}><div className={layout.entries}>
        <div className={styles.section}>Workspaces</div>
        <div className={`${tree.row} ${open ? tree.selected : ""}`}>
          <button type="button" className={`${tree.toggle} ${open ? tree.expanded : ""}`} aria-label="Open example workspace" onClick={onOpen}><ChevronRight size={14} /></button>
          <button type="button" className={tree.label} onClick={onOpen}><Icon size={24} strokeWidth={1.7} /><span>{exampleWorkspace.name}</span></button>
        </div>
      </div></div>
    </div>
  </aside>;
}
