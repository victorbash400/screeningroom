import type { FileNode } from "./types.ts";
import { uploadCloudFile } from "./cloudFiles.ts";
export type ImportEntry =
  | { kind: "file"; file: File }
  | { kind: "folder"; name: string; children: ImportEntry[] };
export function pickedEntries(files: FileList, folder: boolean): ImportEntry[] {
  if (!folder) return Array.from(files, (file) => ({ kind: "file", file }));
  const entries: ImportEntry[] = [];
  for (const file of Array.from(files)) {
    const path = file.webkitRelativePath.split("/");
    if (
      path.length < 2 ||
      path.some((part) => !part || part === "." || part === "..")
    )
      throw new Error("Cannot read folder path.");
    let children = entries;
    for (const name of path.slice(0, -1)) {
      let entry = children.find(
        (item) => item.kind === "folder" && item.name === name,
      );
      if (!entry) {
        entry = { kind: "folder", name, children: [] };
        children.push(entry);
      }
      if (entry.kind !== "folder") throw new Error("Invalid folder path.");
      children = entry.children;
    }
    children.push({ kind: "file", file });
  }
  return entries;
}
export async function readDroppedItems(
  items: DataTransferItemList,
): Promise<ImportEntry[]> {
  const sources = Array.from(items)
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.() ?? item.getAsFile());
  async function read(
    source: FileSystemEntry | File | null,
  ): Promise<ImportEntry> {
    if (!source) throw new Error("Cannot read dropped item.");
    if (source instanceof File) return { kind: "file", file: source };
    if (source.isFile)
      return {
        kind: "file",
        file: await new Promise<File>((resolve, reject) =>
          (source as FileSystemFileEntry).file(resolve, reject),
        ),
      };
    if (!source.isDirectory) throw new Error(`Cannot import ${source.name}.`);
    const reader = (source as FileSystemDirectoryEntry).createReader();
    const children: ImportEntry[] = [];
    while (true) {
      const page = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (!page.length) break;
      for (const child of page) children.push(await read(child));
    }
    return { kind: "folder", name: source.name, children };
  }
  const entries: ImportEntry[] = [];
  for (const source of sources) entries.push(await read(source));
  if (!entries.length) throw new Error("No files were dropped.");
  return entries;
}
export interface ImportProgress {
  completedBytes: number;
  totalBytes: number;
  completedItems: number;
  totalItems: number;
  name: string;
}
export async function prepareImport(
  entries: ImportEntry[],
  workspaceId: string,
  parentId: string | null,
  saveFile: (file: File) => Promise<string> = uploadCloudFile,
  cleanup?: (contents: string[]) => Promise<void>,
  onProgress?: (progress: ImportProgress) => void,
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  let totalBytes = 0, totalItems = 0, completedBytes = 0, completedItems = 0;
  function count(items: ImportEntry[]) {
    for (const item of items) {
      totalItems += 1;
      if (item.kind === "file") totalBytes += item.file.size;
      else count(item.children);
    }
  }
  count(entries);
  const report = (name: string) => onProgress?.({ completedBytes, totalBytes, completedItems, totalItems, name });
  async function append(entries: ImportEntry[], parentId: string | null) {
    const names = new Set<string>();
    for (const entry of entries) {
      const name = entry.kind === "file" ? entry.file.name : entry.name;
      if (names.has(name.toLocaleLowerCase()))
        throw new Error(`${name} already exists.`);
      names.add(name.toLocaleLowerCase());
      report(name);
      const id = crypto.randomUUID();
      const base = {
        id,
        name,
        workspaceId,
        parentId,
        updatedAt: new Date().toISOString(),
      };
      if (entry.kind === "folder") {
        nodes.push({ ...base, kind: "folder" });
        completedItems += 1;
        report(name);
        await append(entry.children, id);
      } else {
        const content = await saveFile(entry.file);
        nodes.push({
          ...base,
          kind: "file",
          content,
          mimeType: entry.file.type,
          size: entry.file.size,
          versions: [
            {
              id: crypto.randomUUID(),
              content,
              size: entry.file.size,
              createdAt: base.updatedAt,
            },
          ],
        });
        completedBytes += entry.file.size;
        completedItems += 1;
        report(name);
      }
    }
  }
  try {
    await append(entries, parentId);
  } catch (failure) {
    await cleanup?.(
      nodes.flatMap((node) => (node.content ? [node.content] : [])),
    );
    throw failure;
  }
  return nodes;
}
