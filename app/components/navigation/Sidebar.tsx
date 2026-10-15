import { useEffect, useRef } from "react";
import { useAccount } from "../../state/AccountContext";
import { isSettingsSurface } from "../../lib/accountTypes";
import SettingsSidebar from "../account/SettingsSidebar";
import SidebarSearch from "./SidebarSearch";
import { useNarrowLayout } from "../../state/useNarrowLayout";
import { House, PanelLeftClose, Plus } from "lucide-react";
import type { Location, NameAction, RoomData } from "../../lib/types";
import IconButton from "../controls/IconButton";
import AppIcon from "../controls/AppIcon";
import AccountFooter from "../account/AccountFooter";
import WorkspaceBranch from "./WorkspaceBranch";
import { useScrollEdges } from "../../state/useScrollEdges";
import edges from "../controls/ScrollEdges.module.css";
import styles from "./Sidebar.module.css";
interface Props {
  selectedId?: string;
  onOpenNode: (node: RoomData["nodes"][number]) => void;
  onMenu: (
    x: number,
    y: number,
    workspaceId: string,
    parentId: string | null,
    node?: RoomData["nodes"][number],
    workspaceRoot?: boolean,
  ) => void;
  data: RoomData;
  location: Location;
  expanded: Set<string>;
  open: boolean;
  onToggle: (id: string) => void;
  onNavigate: (workspaceId: string | null, folderId?: string | null) => void;
  onName: (action: NameAction) => void;
  onDelete: (target: "workspace" | "node", id: string) => void;
  onClose: () => void;
}
export default function Sidebar({
  data,
  location,
  expanded,
  open,
  onToggle,
  onNavigate,
  onName,
  onDelete,
  onClose,
  onOpenNode,
  onMenu,
  selectedId,
}: Props) {
  const account = useAccount();
  const settings = isSettingsSurface(account.surface);
  const scroll = useScrollEdges<HTMLElement>();
  const narrow = useNarrowLayout();
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!narrow || !open) return;
    const previous = document.activeElement;
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [narrow, open]);
  return (
    <>
      {open && (
        <button
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        ref={sidebar}
        inert={narrow && !open}
        onKeyDown={(event) => {
          if (!narrow || !open) return;
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const buttons = Array.from(
              sidebar.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled)",
              ) ?? [],
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
        aria-label="Navigation"
      >
        <div className={styles.brand}>
          <AppIcon />
          <span>Screeningroom</span>
          <div className={styles.close}>
            <IconButton label="Close navigation" onClick={onClose}>
              <PanelLeftClose />
            </IconButton>
          </div>
        </div>
        <div className={styles.panel}>
          <button
            className={`${styles.home} ${styles.homeRow} ${!settings && !location.workspaceId ? styles.selected : ""}`}
            aria-current={!settings && !location.workspaceId ? "page" : undefined}
            onClick={() => { account.open(null); onNavigate(null); }}
          >
            <House size={24} strokeWidth={1.8} />
            Home
          </button>
          <SidebarSearch key={settings ? "settings" : "workspaces"} data={data} settings={settings}
            onNavigate={(id) => { account.open(null); onNavigate(id); }}
            onOpenNode={(node) => { account.open(null); onOpenNode(node); }} />
          <nav ref={scroll} className={`${styles.navigation} ${edges.edges}`}>
            {settings ? <SettingsSidebar /> : <div className={styles.entries}>
            <div className={styles.section}>
              <button onClick={() => onNavigate(null)}>Workspaces</button>
              <IconButton
                label="Create workspace"
                onClick={() => onName({ kind: "workspace" })}
              >
                <Plus />
              </IconButton>
            </div>
            {data.workspaces.map((workspace) => (
              <WorkspaceBranch
                onOpenNode={onOpenNode}
                onMenu={onMenu}
                selectedId={selectedId}
                key={workspace.id}
                workspace={workspace}
                nodes={data.nodes.filter(
                  (node) => node.workspaceId === workspace.id,
                )}
                location={location}
                expanded={expanded}
                onToggle={onToggle}
                onNavigate={onNavigate}
                onName={onName}
                onDelete={onDelete}
              />
            ))}
            </div>}
          </nav>
          <AccountFooter />
        </div>
      </aside>
    </>
  );
}
