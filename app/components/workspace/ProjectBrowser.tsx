import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { FileNode, ViewMode } from "../../lib/types";
import { directory } from "../../lib/storage";
import NodeTile from "./NodeTile";
import DirectoryDropSurface from "./DirectoryDropSurface";
import DirectoryGrid from "./DirectoryGrid";
import DirectoryHeader from "./DirectoryHeader";
import styles from "./ProjectBrowser.module.css";
interface Props {
  workspaceId: string;
  nodes: FileNode[];
  path: FileNode[];
  folderId: string | null;
  mode: ViewMode;
  selectedId?: string;
  onSelect: (node: FileNode) => void;
  onMode: (mode: ViewMode) => void;
  onOpen: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onCreate: () => void;
  onMenu: (
    x: number,
    y: number,
    parentId: string | null,
    node?: FileNode,
  ) => void;
}
export default function ProjectBrowser({
  workspaceId,
  nodes,
  path,
  folderId,
  mode,
  selectedId,
  onSelect,
  onMode,
  onOpen,
  onRename,
  onDelete,
  onCreate,
  onMenu,
}: Props) {
  const scroll = useRef<HTMLDivElement>(null);
  const clickSequence = useRef<string | null>(null);
  useEffect(() => {
    if (mode === "columns" && scroll.current)
      scroll.current.scrollLeft = scroll.current.scrollWidth;
  }, [folderId, mode]);
  const children = directory(nodes, folderId);
  const tile = (node: FileNode, grid = false, selected = false) => (
    <NodeTile
      key={node.id}
      node={node}
      clickSequence={clickSequence}
      grid={grid}
      column={mode === "columns"}
      selected={selected || selectedId === node.id}
      onSelect={() =>
        mode === "columns" && node.kind === "folder"
          ? onOpen(node)
          : onSelect(node)
      }
      onOpen={() => onOpen(node)}
      onRename={() => onRename(node)}
      onMenu={(x, y) => onMenu(x, y, node.parentId, node)}
    />
  );
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof Element && event.target.closest("[role=menu]"))
    )
      return;
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && ["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      onMode(
        event.key === "1" ? "grid" : event.key === "2" ? "list" : "columns",
      );
    }
    if (modifier && event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      onCreate();
    }
    const selected = nodes.find((node) => node.id === selectedId);
    if (selected?.kind === "file" && !modifier && event.key === " ") {
      event.preventDefault();
      onOpen(selected);
    }
    if (selected && modifier && event.key.toLowerCase() === "o") {
      event.preventDefault();
      onOpen(selected);
    }
    if (selected && (event.key === "F2" || event.key === "Enter")) {
      event.preventDefault();
      onRename(selected);
    }
    if (selected && modifier && event.key === "Backspace") {
      event.preventDefault();
      onDelete(selected);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = children.findIndex((node) => node.id === selectedId);
      const next =
        children[
          Math.max(
            0,
            Math.min(
              children.length - 1,
              index + (event.key === "ArrowDown" ? 1 : -1),
            ),
          )
        ];
      if (next) {
        onSelect(next);
        event.currentTarget
          .querySelector<HTMLButtonElement>(
            `[data-node-id="${next.id}"] button`,
          )
          ?.focus();
      }
    }
  }
  if (mode === "columns")
    return (
      <div className={styles.surface} onKeyDown={keyboard}>
        <div
          ref={scroll}
          className={styles.columns}
          aria-label="Files"
          tabIndex={0}
        >
          {[null, ...path.map((node) => node.id)].map((parentId, index) => (
            <DirectoryDropSurface
              workspaceId={workspaceId}
              parentId={parentId}
              className={styles.column}
              key={parentId ?? "root"}
              onContextMenu={(event) => {
                event.preventDefault();
                onMenu(event.clientX, event.clientY, parentId);
              }}
            >
              {directory(nodes, parentId).map((node) =>
                tile(node, false, path[index]?.id === node.id),
              )}
            </DirectoryDropSurface>
          ))}
        </div>
      </div>
    );
  return (
    <div className={styles.surface} onKeyDown={keyboard}>
      {mode === "list" && <DirectoryHeader />}
      <DirectoryDropSurface
        workspaceId={workspaceId}
        parentId={folderId}
        className={styles.browser}
        aria-label="Files"
        tabIndex={0}
        onContextMenu={(event) => {
          event.preventDefault();
          onMenu(event.clientX, event.clientY, folderId);
        }}
      >
        {children.length ? (
          mode === "grid" ? (
            <DirectoryGrid>
              {children.map((node) => tile(node, true))}
            </DirectoryGrid>
          ) : (
            <div className={styles.list}>
              {children.map((node) => tile(node))}
            </div>
          )
        ) : (
          <div
            className={mode === "list" ? styles.emptyRows : styles.empty}
            aria-label="Empty folder"
          />
        )}
      </DirectoryDropSurface>
    </div>
  );
}
