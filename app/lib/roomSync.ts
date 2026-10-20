import { object } from "./accountApi.ts";
import { emptyData, parseData } from "./storage.ts";
import { mergeRoom } from "./roomMerge.ts";
import { recordActivity } from "./activity.ts";
import { roomSyncStatus } from "./roomSyncStatus.ts";
import type { RoomData } from "./types.ts";
export type RoomRequest = (path: string, init?: RequestInit) => Promise<unknown>;
export interface RoomSnapshot { data: RoomData; revision: number; imports: string[] }
export function parseRoomSnapshot(value: unknown): RoomSnapshot {
  const result = object(value);
  if (!Number.isSafeInteger(result.revision) || Number(result.revision) < 0 || !Array.isArray(result.imports) || result.imports.some((id) => typeof id !== "string")) throw new Error("Server returned invalid workspace data.");
  return { data: parseData(JSON.stringify(result.data)), revision: Number(result.revision), imports: result.imports as string[] };
}
export class RoomSync {
  snapshot: RoomSnapshot = { data: emptyData, revision: 0, imports: [] };
  data = emptyData;
  error: string | null = null;
  ready = false;
  private writing = false;
  private controller = new AbortController();
  private loadVersion = 0;
  private dirty = false;
  private writeFailed = false;
  private mutationId = crypto.randomUUID();
  private listeners = new Set<() => void>();
  private remote: RoomSnapshot | null = null;
  private checkedAt: string | null = null;
  private checking = false;
  private checkError: string | null = null;
  constructor(private request: RoomRequest, private upload: (data: RoomData, signal: AbortSignal) => Promise<RoomData>, private uploadSnapshot: (data: RoomData, signal: AbortSignal) => Promise<string>, private committed: () => void = () => {}) {}
  activate() { if (this.controller.signal.aborted) this.controller = new AbortController(); }
  dispose() { this.controller.abort(); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  async load() {
    if (this.writing) return;
    const generation = ++this.loadVersion;
    const signal = this.controller.signal;
    try {
      const remote = parseRoomSnapshot(await this.request("/api/room", { signal }));
      signal.throwIfAborted();
      if (generation !== this.loadVersion || this.writing) return;
      if (!this.remote || remote.revision >= this.remote.revision) {
        this.remote = remote;
        this.checkedAt = new Date().toISOString();
        this.checkError = null;
      }
      const desired = this.data;
      const local = this.dirty ? await this.upload(desired, signal) : desired;
      signal.throwIfAborted();
      if (generation !== this.loadVersion || this.writing || desired !== this.data) return;
      this.data = this.dirty ? mergeRoom(this.snapshot.data, local, remote.data) : remote.data;
      this.snapshot = { ...remote, imports: [...new Set([...remote.imports, ...this.snapshot.imports])] };
      this.mutationId = crypto.randomUUID();
      this.error = null;
      this.writeFailed = false;
      this.ready = true;
      this.emit();
      await this.flush();
    } catch (error) { if (!signal.aborted && generation === this.loadVersion) { this.error = error instanceof Error ? error.message : "Cannot load workspace."; this.emit(); } }
  }
  update(change: (previous: RoomData) => RoomData, retainUnsaved = false) {
    if (!this.ready || this.writeFailed && !retainUnsaved) { this.error ??= "Workspace has not loaded. Retry before editing."; this.emit(); return false; }
    try {
      if (!this.writeFailed) this.error = null;
      this.data = parseData(JSON.stringify(recordActivity(this.data, change(this.data))));
      this.dirty = true;
      this.emit();
      void this.flush();
      return true;
    } catch (error) { this.error = error instanceof Error ? error.message : "Cannot update workspace."; this.emit(); return false; }
  }
  async import(data: RoomData, id: string) {
    if (!this.ready || this.writeFailed) throw new Error("Load the workspace before importing browser data.");
    if (this.snapshot.imports.includes(id)) return;
    if (this.writing || this.dirty) throw new Error("Wait for your changes to save before importing browser data.");
    const merged = mergeRoom(emptyData, data, this.data);
    this.snapshot = { ...this.snapshot, imports: [...this.snapshot.imports, id] };
    this.data = merged;
    this.dirty = true;
    await this.flush();
    if (this.error) throw new Error(this.error);
  }
  async flush() {
    if (this.writing || this.writeFailed || !this.dirty) return;
    this.writing = true;
    const signal = this.controller.signal;
    try {
      while (this.dirty && !this.writeFailed) {
        const desired = this.data;
        const normalized = await this.upload(desired, signal);
        signal.throwIfAborted();
        const fileId = await this.uploadSnapshot(normalized, signal);
        signal.throwIfAborted();
        const result = object(await this.request("/api/room", { method: "PUT", signal, body: JSON.stringify({ fileId, revision: this.snapshot.revision, imports: this.snapshot.imports, mutationId: this.mutationId }) }));
        signal.throwIfAborted();
        if (!Number.isSafeInteger(result.revision)) throw new Error("Server did not confirm the workspace save.");
        this.snapshot = { data: normalized, revision: Number(result.revision), imports: this.snapshot.imports };
        if (!this.remote || this.remote.revision <= this.snapshot.revision) this.remote = this.snapshot;
        this.checkedAt = new Date().toISOString();
        this.checkError = null;
        this.mutationId = crypto.randomUUID();
        this.dirty = this.data !== desired;
        if (!this.dirty) this.data = normalized;
        this.emit();
        this.committed();
      }
    } catch (error) { if (signal.aborted) return; this.writeFailed = true; this.error = `Changes not saved. ${error instanceof Error ? error.message : "Retry."}`; this.emit(); }
    finally { this.writing = false; this.emit(); }
  }
  async saveBeforeLeaving() {
    await this.flush();
    if (this.writing) await new Promise<void>((resolve) => {
      const unsubscribe = this.subscribe(() => {
        if (!this.writing || this.error) { unsubscribe(); resolve(); }
      });
    });
    return !this.unsaved;
  }
  async retry() { if (!this.writing) await this.load(); }
  async checkSync() {
    if (this.checking) return;
    this.checking = true;
    this.checkError = null;
    this.emit();
    const signal = this.controller.signal;
    try {
      const remote = parseRoomSnapshot(await this.request("/api/room", { signal }));
      signal.throwIfAborted();
      if (remote.revision >= Math.max(this.snapshot.revision, this.remote?.revision ?? 0)) {
        this.remote = remote;
        this.checkedAt = new Date().toISOString();
      }
    } catch (error) {
      if (!signal.aborted) this.checkError = error instanceof Error ? error.message : "Cannot check sync. Try again.";
    } finally { this.checking = false; this.emit(); }
  }
  get syncStatus() {
    return roomSyncStatus(this.snapshot, this.data, this.remote, {
      ready: this.ready, checking: this.checking, saving: this.writing, unsaved: this.dirty,
      checkedAt: this.checkedAt, error: this.checkError,
    });
  }
  get unsaved() { return this.dirty || this.writing; }
}
