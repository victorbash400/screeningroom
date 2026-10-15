import { useCallback, useEffect, useRef, useState } from "react";
import type { Location, RoomData } from "../lib/types";
interface Session {
  location: Location;
  selectedId: string | null;
}
const home: Session = {
  location: { workspaceId: null, folderId: null },
  selectedId: null,
};
export function useRoomNavigation(data: RoomData) {
  const [session, setSession] = useState<Session>(home);
  const current = useRef(session);
  const sessions = useRef(new Map<string, Session>());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const apply = useCallback((next: Session) => {
    const previous = current.current;
    if (previous.location.workspaceId)
      sessions.current.set(previous.location.workspaceId, previous);
    current.current = next;
    setSession(next);
    if (next.location.workspaceId)
      sessions.current.set(next.location.workspaceId, next);
  }, []);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      apply({
        location: {
          workspaceId: params.get("workspace"),
          folderId: params.get("folder"),
        },
        selectedId: null,
      });
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [apply]);
  const navigate = useCallback(
    (
      workspaceId: string | null,
      folderId: string | null = null,
      selectedId: string | null = null,
    ) => {
      const params = new URLSearchParams();
      if (workspaceId) params.set("workspace", workspaceId);
      if (folderId) params.set("folder", folderId);
      const query = params.toString();
      const previous = current.current.location;
      if (
        previous.workspaceId !== workspaceId ||
        previous.folderId !== folderId
      )
        window.history.pushState(null, "", query ? `/?${query}` : "/");
      apply({ location: { workspaceId, folderId }, selectedId });
      setSidebarOpen(false);
    },
    [apply],
  );
  const openWorkspace = (id: string) => {
    const saved = sessions.current.get(id);
    const folderId = saved?.location.folderId ?? null;
    const folderValid =
      folderId === null ||
      data.nodes.some(
        (node) =>
          node.id === folderId &&
          node.workspaceId === id &&
          node.kind === "folder",
      );
    const parentId = folderValid ? folderId : null;
    const selectedId = data.nodes.some(
      (node) =>
        node.id === saved?.selectedId &&
        node.workspaceId === id &&
        node.parentId === parentId,
    )
      ? (saved?.selectedId ?? null)
      : null;
    navigate(id, parentId, selectedId);
  };
  const setSelection = (selectedId: string | null) =>
    apply({ ...current.current, selectedId });
  const reveal = useCallback(
    (ids: string[]) =>
      setExpanded((previous) =>
        ids.every((id) => previous.has(id))
          ? previous
          : new Set([...previous, ...ids]),
      ),
    [],
  );
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return {
    location: session.location,
    selection: session.selectedId,
    setSelection,
    navigate,
    openWorkspace,
    expanded,
    toggle,
    reveal,
    sidebarOpen,
    setSidebarOpen,
  };
}
