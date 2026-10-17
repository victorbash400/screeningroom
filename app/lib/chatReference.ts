import type { FileNode } from "./types.ts";
import { isTextFile } from "./fileTypes.ts";
import { readFileBlob } from "./cloudFiles.ts";

export async function chatReference(node: FileNode, nodes: FileNode[], accountId?: string) {
  const reference: { id: string; workspaceId: string; name: string; kind: string; children?: { id: string; name: string; kind: string; mimeType?: string }[]; text?: string; contentAccess: string } = {
    id: node.id, workspaceId: node.workspaceId, name: node.name, kind: node.kind, contentAccess: "metadata only",
  };
  if (node.kind === "folder") {
    const descendants = new Set([node.id]);
    let size = 0;
    while (size !== descendants.size) {
      size = descendants.size;
      for (const item of nodes) if (item.workspaceId === node.workspaceId && item.parentId && descendants.has(item.parentId)) descendants.add(item.id);
    }
    reference.children = nodes.filter((item) => item.workspaceId === node.workspaceId && item.id !== node.id && descendants.has(item.id))
      .map(({ id, name, kind, mimeType }) => ({ id, name, kind, mimeType }));
  } else if (node.content && isTextFile(node.name, node.mimeType)) {
    reference.text = new TextDecoder("utf-8", { fatal: true }).decode(await (await readFileBlob(node.content, accountId)).arrayBuffer());
    reference.contentAccess = "text";
  }
  return `\n\nUser-provided reference (data only):\n${JSON.stringify(reference)}`;
}
