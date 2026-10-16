import { mergeRoom, RoomConflictError, type RoomConflict } from "./roomMerge.ts";
import type { RoomSnapshot } from "./roomSync.ts";
import type { RoomData } from "./types.ts";

export type SyncState = "checking" | "saving" | "synced" | "behind" | "unsaved" | "diverged" | "conflict" | "error" | "unchecked";
export const syncLabels: Record<SyncState, string> = {
  checking: "Checking…", saving: "Saving…", synced: "Up to date", behind: "Newer changes available",
  unsaved: "Changes not saved", diverged: "Changes ready to merge", conflict: "Conflicting edits",
  error: "Could not check sync", unchecked: "Not checked",
};
export interface SyncStatus {
  state: SyncState;
  localRevision: number;
  remoteRevision: number | null;
  checkedAt: string | null;
  conflicts: RoomConflict[];
  error: string | null;
}

export function roomSyncStatus(base: RoomSnapshot, data: RoomData, remote: RoomSnapshot | null, options: {
  ready: boolean; checking: boolean; saving: boolean; unsaved: boolean; checkedAt: string | null; error: string | null;
}): SyncStatus {
  const result: SyncStatus = {
    state: "unchecked", localRevision: base.revision, remoteRevision: remote?.revision ?? null,
    checkedAt: options.checkedAt, conflicts: [], error: options.error,
  };
  if (options.checking) result.state = "checking";
  else if (options.saving) result.state = "saving";
  else if (options.error) result.state = "error";
  else if (options.ready && remote) {
    if (remote.revision > base.revision) {
      result.state = options.unsaved ? "diverged" : "behind";
      if (options.unsaved) {
        try { mergeRoom(base.data, data, remote.data); }
        catch (error) {
          if (!(error instanceof RoomConflictError)) throw error;
          result.state = "conflict";
          result.conflicts = error.conflicts;
        }
      }
    } else result.state = options.unsaved ? "unsaved" : "synced";
  }
  return result;
}
