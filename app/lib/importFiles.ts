import type { FileNode } from "./types";
import { storeLocalFile, removeLocalFiles } from "./localFiles.ts";
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
export async function prepareImport(
  entries: ImportEntry[],
  workspaceId: string,
  parentId: string | null,
  saveFile: (file: File) => Promise<string> = (file) =>
    storeLocalFile(file, "screeningroom.v1"),
  cleanup: (contents: string[]) => Promise<void> = removeLocalFiles,
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  async function append(entries: ImportEntry[], parentId: string | null) {
    const names = new Set<string>();
    for (const entry of entries) {
      const name = entry.kind === "file" ? entry.file.name : entry.name;
      if (names.has(name.toLocaleLowerCase()))
        throw new Error(`${name} already exists.`);
      names.add(name.toLocaleLowerCase());
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
        await append(entry.children, id);
      } else {
        const content =
          entry.file.size > 256_000
            ? await saveFile(entry.file)
            : await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  typeof reader.result === "string"
                    ? resolve(reader.result)
                    : reject(new Error(`Cannot read ${name}.`));
                reader.onerror = () =>
                  reject(new Error(`Cannot read ${name}.`));
                reader.readAsDataURL(entry.file);
              });
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
      }
    }
  }
  try {
    await append(entries, parentId);
  } catch (failure) {
    await cleanup(
      nodes.flatMap((node) => (node.content ? [node.content] : [])),
    );
    throw failure;
  }
  return nodes;
}
