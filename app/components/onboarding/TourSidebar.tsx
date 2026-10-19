import { ChevronRight, FolderClosed, FolderOpen, House, PanelLeftClose } from "lucide-react";
import { useEffect, useRef } from "react";
import AppIcon from "../controls/AppIcon";
import IconButton from "../controls/IconButton";
import SidebarSearch from "../navigation/SidebarSearch";
import { exampleFiles, exampleWorkspace } from "./tourExample";
import layout from "../navigation/Sidebar.module.css";
import tree from "../navigation/WorkspaceBranch.module.css";
import styles from "./TourSidebar.module.css";

export default function TourSidebar({ open, navigationOpen, onClose, onOpen, onHome, onSearch }: { query: string; onSearch: (query: string) => void; open: boolean; navigationOpen: boolean; onClose: () => void; onOpen: () => void; onHome: () => void }) {
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navigationOpen) return;
    const previous = document.activeElement;
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [navigationOpen]);
  const Icon = open ? FolderOpen : FolderClosed;
  return <aside ref={sidebar} data-open={navigationOpen} className={`${layout.sidebar} ${styles.sidebar}`} aria-label="Example navigation" onKeyDown={event => {
    if (!navigationOpen) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
      if (document.activeElement === (event.shiftKey ? controls[0] : controls.at(-1))) { event.preventDefault(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus(); }
    }
  }}>
    <div className={layout.brand}><AppIcon size={20} /><span>Screeningroom</span><div className={layout.close}><IconButton label="Close example navigation" onClick={onClose}><PanelLeftClose /></IconButton></div></div>
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
