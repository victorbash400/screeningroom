import { useState } from "react";
import { X } from "lucide-react";
import IconButton from "../controls/IconButton";
import type { FileNode } from "../../lib/types";
import FileInformation from "./FileInformation";
import FileVersions from "./FileVersions";
import FileComments from "./FileComments";
import FileCommentInput from "./FileCommentInput";
import styles from "./FilePreview.module.css";
export default function FilePreview({
  node,
  onComment,
  onClose,
  onOpen,
}: {
  node: FileNode;
  onComment: (text: string) => boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [tab, setTab] = useState<"Versions" | "Comments">("Versions");
  return (
    <aside
      className={styles.preview}
      aria-label="File details"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <IconButton
        className={styles.close}
        label="Close file details"
        onClick={onClose}
      >
        <X />
      </IconButton>
      <FileInformation node={node} onOpen={onOpen} />
      <div role="tablist" aria-label="File details" className={styles.tabs}>
        {(["Versions", "Comments"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setTab(value === "Versions" ? "Comments" : "Versions");
                const sibling =
                  value === "Versions"
                    ? event.currentTarget.nextElementSibling
                    : event.currentTarget.previousElementSibling;
                if (sibling instanceof HTMLElement) sibling.focus();
              }
            }}
            onClick={() => setTab(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {tab === "Versions" ? (
        <FileVersions node={node} />
      ) : (
        <div className={styles.comments} role="tabpanel" aria-label="Comments">
          <FileComments comments={node.comments ?? []} />
          <FileCommentInput onSubmit={onComment} />
        </div>
      )}
    </aside>
  );
}
