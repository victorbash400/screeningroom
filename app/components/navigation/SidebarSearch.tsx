import { useEffect, useId, useRef, useState } from "react";
import { FileText, FolderClosed, Search, X } from "lucide-react";
import type { FileNode, RoomData } from "../../lib/types";
import { settingsNavigation } from "../../lib/settingsNavigation";
import { useAccount } from "../../state/AccountContext";
import SidebarSearchResults, { type SearchResult } from "./SidebarSearchResults";
import styles from "./SidebarSearch.module.css";

export default function SidebarSearch({ data, settings, onNavigate, onOpenNode }: {
  data: RoomData;
  settings: boolean;
  onNavigate: (workspaceId: string | null) => void;
  onOpenNode: (node: FileNode) => void;
}) {
  const account = useAccount();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const term = query.trim().toLocaleLowerCase();
  const results: SearchResult[] = settings
    ? settingsNavigation.filter((item) => item.label.toLocaleLowerCase().includes(term)).map((item) => ({
        id: item.id, name: item.label, icon: item.icon, onSelect: () => account.open(item.id),
      }))
    : [
        ...data.workspaces.filter((item) => item.name.toLocaleLowerCase().includes(term)).map((item) => ({
          id: `workspace:${item.id}`, name: item.name, icon: FolderClosed, onSelect: () => onNavigate(item.id),
        })),
        ...data.nodes.filter((item) => item.name.toLocaleLowerCase().includes(term)).map((item) => ({
          id: `node:${item.id}`, name: item.name,
          context: data.workspaces.find((workspace) => workspace.id === item.workspaceId)?.name,
          icon: item.kind === "folder" ? FolderClosed : FileText, onSelect: () => onOpenNode(item),
        })),
      ];
  const visible = open && term.length > 0;
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return (
    <div ref={root} className={`${styles.search} ${visible ? styles.expanded : ""}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault(); event.stopPropagation(); input.current?.focus(); setOpen(false);
        }
        if (visible && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[role=region] button") ?? []);
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = current + (event.key === "ArrowDown" ? 1 : -1);
          if (next < 0) input.current?.focus();
          else buttons[Math.min(next, buttons.length - 1)]?.focus();
        }
      }}>
      <Search size={18} strokeWidth={1.8} aria-hidden="true" />
      <input ref={input} type="search" aria-label={settings ? "Search settings" : "Search workspaces and files"}
        placeholder="Search" value={query} aria-controls={visible ? id : undefined}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onKeyDown={(event) => { if (event.key === "Enter" && visible && results[0]) { results[0].onSelect(); setOpen(false); input.current?.blur(); } }} />
      {query && <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => { setQuery(""); input.current?.focus(); }}><X size={14} /></button>}
      {visible && <SidebarSearchResults id={id} results={results} onSelect={(result) => { result.onSelect(); setOpen(false); input.current?.blur(); }} />}
    </div>
  );
}
