import { SquarePen } from "lucide-react";
import type { Conversation } from "../../lib/types";
import styles from "./ChatHistory.module.css";
export default function ChatHistory({
  items,
  activeId,
  onNew,
  onSelect,
}: {
  items: Conversation[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className={styles.history} aria-label="Conversations">
      <button className={styles.create} onClick={onNew}>
        <SquarePen size={16} />
        New conversation
      </button>
      <div className={styles.items}>
        {items.toReversed().map((item) => (
          <button
            key={item.id}
            className={item.id === activeId ? styles.selected : ""}
            aria-current={item.id === activeId ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
    </nav>
  );
}
