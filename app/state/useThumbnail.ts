import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../lib/types";
import { createMediaThumbnail, thumbnailKind } from "../lib/mediaThumbnail";
import { fileSource, uploadCloudFile } from "../lib/cloudFiles";
import { useAccount } from "./AccountContext";
import { useRoomStore } from "./RoomDataContext";

export function useThumbnail(node: FileNode) {
  const { user } = useAccount();
  const room = useRoomStore();
  const update = useRef(room.update);
  update.current = room.update;
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const kind = thumbnailKind(node);
  const saved = node.thumbnail?.source === node.content ? node.thumbnail?.content : undefined;
  useEffect(() => {
    setUrl(undefined); setError(undefined);
    if (!kind || !node.content || !user) return;
    const controller = new AbortController();
    const releases: (() => void)[] = [];
    void (async () => {
      try {
        const source = await fileSource(saved ?? node.content!, user.id);
        if (controller.signal.aborted) { source.release?.(); return; }
        if (source.release) releases.push(source.release);
        if (saved) { setUrl(source.url); return; }
        const thumbnail = await createMediaThumbnail(source.url, kind, controller.signal);
        const localUrl = URL.createObjectURL(thumbnail.blob);
        releases.push(() => URL.revokeObjectURL(localUrl));
        setUrl(localUrl);
        const content = await uploadCloudFile(thumbnail.blob, controller.signal);
        controller.signal.throwIfAborted();
        const success = update.current((previous) => ({ ...previous, nodes: previous.nodes.map((item) =>
          item.id === node.id && item.content === node.content && item.thumbnail?.source !== item.content
            ? { ...item, thumbnail: { content, source: node.content!, width: thumbnail.width, height: thumbnail.height } } : item,
        ) }));
        if (!success) throw new Error("Thumbnail not saved. Try again.");
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Cannot load thumbnail.");
      }
    })();
    return () => { controller.abort(); for (const release of releases) release(); };
  }, [node.id, node.content, kind, saved, user?.id, attempt]);
  return { url, error, kind, retry: () => setAttempt((value) => value + 1), fail: () => setError("Cannot load thumbnail. Try again.") };
}
