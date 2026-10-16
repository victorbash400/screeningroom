import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Download, X } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { filePreview } from "../../lib/filePreview";
import { downloadFile } from "../../lib/fileTypes";
import IconButton from "../controls/IconButton";
import LoadingIndicator from "../controls/LoadingIndicator";
import { useAccount } from "../../state/AccountContext";
import { browserFileUrl, isCloudFile } from "../../lib/cloudFiles";
import ImagePreview from "./ImagePreview";
import MediaPreview from "./MediaPreview";
import DocumentPreview from "./DocumentPreview";
import PdfPreview from "./PdfPreview";
import PreviewOpenWith from "./PreviewOpenWith";
import { usePreviewUrl } from "../../state/usePreviewUrl";
import styles from "./FileOpenDialog.module.css";
import glass from "./PreviewGlass.module.css";
export default function FileOpenDialog({
  node,
  onClose,
}: {
  node: FileNode;
  onClose: () => void;
}) {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const { url, error: sourceError, text } = usePreviewUrl(node);
  const [actionError, setActionError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  async function exportFile() {
    try {
      await downloadFile(node.name, node.content ?? "", account.user?.id);
    } catch (failure) {
      setActionError(
        failure instanceof Error ? failure.message : "Cannot export file.",
      );
    }
  }
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      queueMicrotask(() => {
        if (
          previous instanceof HTMLElement &&
          previous !== document.body &&
          previous.isConnected
        )
          previous.focus();
        else {
          const row = Array.from(
            document.querySelectorAll<HTMLElement>("[data-node-id]"),
          ).find((element) => element.dataset.nodeId === node.id);
          row?.querySelector<HTMLButtonElement>("button")?.focus();
        }
      });
    };
  }, []);
  let preview: ReturnType<typeof filePreview> | undefined,
    error: string | undefined;
  try {
    preview = filePreview(node);
  } catch (failure) {
    error = failure instanceof Error ? failure.message : "Cannot open file.";
  }
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${preview?.kind === "audio" ? styles.compact : ""} ${preview?.kind === "video" || preview?.kind === "youtube" || preview?.kind === "image" ? styles.video : ""} ${preview?.kind === "video" || preview?.kind === "image" ? styles.immersive : ""}`}
      style={{ "--media-ratio": aspectRatio } as CSSProperties}
      aria-label={`Preview ${node.name}`}
      onCancel={onClose}
    >
      <header>
        <span>{node.name}</span>
        {(url || node.content) && (
          <PreviewOpenWith
            source={url}
            resolveSource={node.content && isCloudFile(node.content) ? async () => {
              try { return await browserFileUrl(node.content!); }
              catch (error) { setActionError(error instanceof Error ? error.message : "Cannot open file."); return undefined; }
            } : undefined}
            image={preview?.kind === "image"}
            onExport={node.content ? exportFile : undefined}
          />
        )}
        {node.content &&
          preview?.kind !== "audio" &&
          preview?.kind !== "video" && (
            <IconButton className={`${glass.surface} ${styles.export}`} label="Export file" onClick={exportFile}>
              <Download />
            </IconButton>
          )}
        <IconButton className={glass.surface} label="Close preview" onClick={onClose}>
          <X />
        </IconButton>
      </header>
      <div className={styles.content}>
        {error || sourceError || actionError ? (
          <ErrorNotice message={(error || sourceError || actionError)!} onDismiss={() => setActionError(null)} />
        ) : preview?.kind === "text" ? (
          text === undefined && !url ? <LoadingIndicator /> : <pre>{text ?? preview.text}</pre>
        ) : preview?.kind === "image" ? (
          url ? <ImagePreview source={url} name={node.name} onAspectRatio={setAspectRatio} /> : <LoadingIndicator />
        ) : preview?.kind === "pdf" ? (
          url ? <PdfPreview source={url} /> : <LoadingIndicator />
        ) : preview?.kind === "youtube" ? (
          <DocumentPreview source={preview.source} name={node.name} youtube />
        ) : preview?.kind === "link" ? (
          <a
            className={styles.link}
            href={node.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open link
          </a>
        ) : (
          preview && (
            <MediaPreview
              source={url}
              loading={!url}
              video={preview.kind === "video"}
              onAspectRatio={setAspectRatio}
            />
          )
        )}
      </div>
    </dialog>
  );
}
