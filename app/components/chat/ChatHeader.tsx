import { ArrowLeft, PanelLeft, PanelLeftClose, Users, X } from "lucide-react";
import type { Conversation } from "../../lib/types";
import IconButton from "../controls/IconButton";
import ActionMenu from "../controls/ActionMenu";
import styles from "./ChatHeader.module.css";
export default function ChatHeader({
  conversation,
  historyOpen,
  onHistory,
  onClose,
  onRename,
  onDelete,
  onAudience,
  threadOpen,
  onBack,
}: {
  conversation: Conversation;
  historyOpen: boolean;
  onHistory: () => void;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAudience: () => void;
  threadOpen: boolean;
  onBack: () => void;
}) {
  const Icon = historyOpen ? PanelLeftClose : PanelLeft;
  return (
    <header className={styles.header}>
      <IconButton
        label={historyOpen ? "Close conversations" : "Conversations"}
        onClick={onHistory}
      >
        <Icon />
      </IconButton>
      {threadOpen && (
        <IconButton label="Back to conversation" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
      )}
      <span>{conversation.title}</span>
      <ActionMenu
        label="Conversation actions"
        onRename={onRename}
        onDelete={onDelete}
      />
      <IconButton label="Who can see this conversation" onClick={onAudience}>
        <Users />
      </IconButton>
      <IconButton label="Close conversation" onClick={onClose}>
        <X />
      </IconButton>
    </header>
  );
}
