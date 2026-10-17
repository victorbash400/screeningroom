import { ArrowLeft, PanelLeft, PanelLeftClose, X } from "lucide-react";
import type { Conversation } from "../../lib/types";
import IconButton from "../controls/IconButton";
import ActionMenu from "../controls/ActionMenu";
import styles from "./ChatHeader.module.css";
import ToggleSwitch from "../controls/ToggleSwitch";
export default function ChatHeader({
  label,
  mapOpen,
  onMapToggle,
  conversation,
  historyOpen,
  onHistory,
  onClose,
  onRename,
  onDelete,
  threadOpen,
  onBack,
}: {
  label: string;
  mapOpen?: boolean;
  onMapToggle?: (open: boolean) => void;
  conversation: Conversation;
  historyOpen: boolean;
  onHistory: () => void;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  threadOpen: boolean;
  onBack: () => void;
}) {
  const Icon = historyOpen ? PanelLeftClose : PanelLeft;
  return (
    <header className={styles.header}>
      <IconButton
        label={historyOpen ? "Close chats" : "Chats"}
        onClick={onHistory}
      >
        <Icon />
      </IconButton>
      {threadOpen && (
        <IconButton label="Back to chat" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
      )}
      <span>{label}</span>
      {conversation.scope !== "workspace" && <ActionMenu
        label="Chat actions"
        onRename={onRename}
        onDelete={onDelete}
      />}
      {onMapToggle && <ToggleSwitch label="Map" checked={Boolean(mapOpen)} onChange={onMapToggle} />}
      <IconButton label={`Close ${label.toLowerCase()}`} onClick={onClose}>
        <X />
      </IconButton>
    </header>
  );
}
