import { Trash2 } from "lucide-react";
import styles from "./ChatHistoryRow.module.css";

export default function ChatHistoryRow({ title, selected, onSelect, onDelete }: {
  title: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return <div className={`${styles.row} ${selected ? styles.selected : ""}`}>
    <button type="button" className={styles.name} aria-current={selected ? "page" : undefined} onClick={onSelect}>{title}</button>
    <button type="button" className={styles.remove} aria-label={`Delete ${title}`} title="Delete chat" onClick={onDelete}><Trash2 size={15} /></button>
  </div>;
}
