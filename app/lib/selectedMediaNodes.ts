import type { FileNode } from "./types.ts";

export function selectedMediaNodes(ids: string[], nodes: FileNode[]) {
  const allowed = new Set(ids);
  let previous = -1;
  while (previous !== allowed.size) {
    previous = allowed.size;
    for (const node of nodes) if (node.parentId && allowed.has(node.parentId)) allowed.add(node.id);
  }
  return nodes.filter((node) => allowed.has(node.id));
}
export function mediaSelectionSaved(ids: string[], current: FileNode[], saved: FileNode[]) {
  const snapshot = new Map(saved.map((node) => [node.id, node]));
  return selectedMediaNodes(ids, current).every((node) => {
    const previous = snapshot.get(node.id);
    return previous && previous.name === node.name && previous.kind === node.kind && previous.parentId === node.parentId && previous.content === node.content && previous.mimeType === node.mimeType && previous.sourceUrl === node.sourceUrl;
  });
}
