import { useEffect, useRef } from "react";
import type { FileNode, Location, RoomData } from "../lib/types";
export function useDeletedLocation(
  data: RoomData,
  ready: boolean,
  location: Location,
  path: FileNode[],
  navigate: (workspaceId: string | null, folderId?: string | null) => void,
) {
  const previous = useRef<{ workspaceId: string; path: FileNode[] } | null>(
    null,
  );
  useEffect(() => {
    if (!ready) return;
    const saved = previous.current;
    if (saved?.workspaceId === location.workspaceId) {
      if (
        !data.workspaces.some((workspace) => workspace.id === saved.workspaceId)
      ) {
        previous.current = null;
        navigate(null);
        return;
      }
      if (
        location.folderId &&
        saved.path.some((node) => node.id === location.folderId) &&
        !data.nodes.some((node) => node.id === location.folderId)
      ) {
        const index = saved.path.findIndex(
          (node) => node.id === location.folderId,
        );
        const parent = saved.path
          .slice(0, index)
          .reverse()
          .find((node) => data.nodes.some((current) => current.id === node.id));
        navigate(saved.workspaceId, parent?.id ?? null);
        return;
      }
    }
    previous.current =
      location.workspaceId &&
      data.workspaces.some((workspace) => workspace.id === location.workspaceId)
        ? { workspaceId: location.workspaceId, path }
        : null;
  }, [data, ready, location.workspaceId, location.folderId, path, navigate]);
}
