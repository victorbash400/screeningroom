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
  const workspace = items.find((item) => item.scope === "workspace");
  return (
    <nav className={styles.history} aria-label="Chats">
      <button className={styles.create} onClick={onNew}>
        <SquarePen size={16} />
        New chat
      </button>
      {workspace && (
        <button
          className={`${styles.workspace} ${workspace.id === activeId ? styles.selected : ""}`}
          aria-current={workspace.id === activeId ? "page" : undefined}
          onClick={() => onSelect(workspace.id)}
        >
          Chats
        </button>
      )}
      <div className={styles.items}>
        {items.filter((item) => item.scope !== "workspace").toReversed().map((item) => (
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
