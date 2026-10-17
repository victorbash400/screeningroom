import { SquarePen } from "lucide-react";
import type { Conversation } from "../../lib/types";
import ChatHistoryRow from "./ChatHistoryRow";
import styles from "./ChatHistory.module.css";
export default function ChatHistory({
  items,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: {
  items: Conversation[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const workspace = items.find((item) => item.scope === "workspace");
  return (
    <nav className={styles.history} aria-label="Chats">
      <button type="button" className={styles.create} onClick={onNew}>
        <SquarePen size={16} />
        New chat
      </button>
      {workspace && <div className={styles.workspace}>
        <ChatHistoryRow title="Chats" selected={workspace.id === activeId} onSelect={() => onSelect(workspace.id)} onDelete={() => onDelete(workspace.id)} />
      </div>}
      <div className={styles.items}>
        {items.filter((item) => item.scope !== "workspace").toReversed().map((item) => (
          <ChatHistoryRow key={item.id} title={item.title} selected={item.id === activeId} onSelect={() => onSelect(item.id)} onDelete={() => onDelete(item.id)} />
        ))}
      </div>
    </nav>
  );
}
