import { Link2, Upload } from "lucide-react";
import styles from "./ImportSourceTabs.module.css";

export type ImportSource = "upload" | "link";
export default function ImportSourceTabs({ source, busy, onChange }: {
  source: ImportSource;
  busy: boolean;
  onChange: (source: ImportSource) => void;
}) {
  return (
    <div className={styles.tabs} role="group" aria-label="Import source">
      <button type="button" aria-pressed={source === "upload"} disabled={busy} onClick={() => onChange("upload")}>
        <Upload size={16} />Upload
      </button>
      <button type="button" aria-pressed={source === "link"} disabled={busy} onClick={() => onChange("link")}>
        <Link2 size={16} />Link
      </button>
    </div>
  );
}
