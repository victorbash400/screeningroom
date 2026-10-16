import { useEffect, useState } from "react";
import type { FileNode } from "../lib/types";
import { isTextFile } from "../lib/fileTypes";
import { fileSource, readFileBlob } from "../lib/cloudFiles";
import { useAccount } from "./AccountContext";

export function usePreviewUrl(node: FileNode) {
  const { user } = useAccount();
  const [url, setUrl] = useState<string | undefined>(node.sourceUrl);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string>();
  useEffect(() => {
    setUrl(node.sourceUrl);
    setError(null);
    setText(undefined);
    if (node.sourceUrl || !node.content) return;
    let active = true;
    let release: (() => void) | undefined;
    void (async () => {
      try {
        if (isTextFile(node.name, node.mimeType)) {
          const blob = await readFileBlob(node.content!, user?.id);
          const decoded = new TextDecoder("utf-8", { fatal: true }).decode(await blob.arrayBuffer());
          if (!active) return;
          setText(decoded);
          const source = URL.createObjectURL(new Blob([blob], { type: "text/plain;charset=utf-8" }));
          release = () => URL.revokeObjectURL(source);
          setUrl(source);
        } else {
          const source = await fileSource(node.content!, user?.id);
          if (!active) { source.release?.(); return; }
          release = source.release;
          setUrl(source.url);
        }
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Cannot open file."); }
    })();
    return () => { active = false; release?.(); };
  }, [node.content, node.name, node.sourceUrl, node.mimeType, user?.id]);
  return { url, error, text };
}
