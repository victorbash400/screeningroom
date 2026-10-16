import { ChevronRight, FolderClosed } from "lucide-react";
import styles from "./ImportDestination.module.css";

export default function ImportDestination({ path }: { path: string[] }) {
  return (
    <div className={styles.destination} aria-label={`Import to ${path.join(" / ")}`}>
      <FolderClosed size={16} aria-hidden="true" />
      {path.map((name, index) => (
        <span key={index}>{index > 0 && <ChevronRight size={12} aria-hidden="true" />}{name}</span>
      ))}
    </div>
  );
}
