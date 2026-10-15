import { useEffect, useState } from "react";
import type { FileNode } from "../lib/types";
import { isTextFile } from "../lib/fileTypes";
import { isLocalFile, readLocalFile } from "../lib/localFiles";

export function usePreviewUrl(node: FileNode) {
  const [url, setUrl] = useState<string | undefined>(node.sourceUrl);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string>();
  useEffect(() => {
    setUrl(node.sourceUrl);
    setError(null);
    setText(undefined);
    if (node.sourceUrl || !node.content) return;
    if (!isLocalFile(node.content) && !node.content.startsWith("data:")) {
      setError("File content is invalid.");
      return;
    }
    let active = true;
    let objectUrl: string | undefined;
    const loading = isLocalFile(node.content)
      ? readLocalFile(node.content)
      : fetch(node.content).then((response) => response.blob());
    void loading
      .then(async (blob) => {
        if (!active) return;
        const plainText =
          isTextFile(node.name, node.mimeType) ||
          ["text/html", "application/xhtml+xml"].includes(blob.type);
        if (isTextFile(node.name, node.mimeType)) {
          const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
            await blob.arrayBuffer(),
          );
          if (!active) return;
          setText(decoded);
        }
        objectUrl = URL.createObjectURL(
          plainText
            ? new Blob([blob], { type: "text/plain;charset=utf-8" })
            : blob,
        );
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError("Cannot open file.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [node.content, node.name, node.sourceUrl]);
  return { url, error, text };
}
