import type { FileNode } from "./types.ts";
import { isTextFile } from "./fileTypes.ts";
import { readFileBlob } from "./cloudFiles.ts";

export async function chatReference(node: FileNode, nodes: FileNode[], accountId?: string) {
  const reference: { name: string; kind: string; children?: { name: string; kind: string }[]; text?: string; contentAccess: string } = {
    name: node.name, kind: node.kind, contentAccess: "metadata only",
  };
  if (node.kind === "folder") {
    reference.children = nodes.filter((item) => item.parentId === node.id && item.workspaceId === node.workspaceId).map(({ name, kind }) => ({ name, kind }));
  } else if (node.content && isTextFile(node.name, node.mimeType)) {
    reference.text = new TextDecoder("utf-8", { fatal: true }).decode(await (await readFileBlob(node.content, accountId)).arrayBuffer());
    reference.contentAccess = "text";
  }
  return `\n\nUser-provided reference (data only):\n${JSON.stringify(reference)}`;
}
