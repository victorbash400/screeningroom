import { ArrowLeft, PanelLeft, PanelLeftClose, SquarePen, X } from "lucide-react";
import type { Conversation } from "../../lib/types";
import IconButton from "../controls/IconButton";
import ActionMenu from "../controls/ActionMenu";
import styles from "./ChatHeader.module.css";
import AudienceModeToggle from "./AudienceModeToggle";
import ToggleSwitch from "../controls/ToggleSwitch";
export default function ChatHeader({
  label,
  audienceMode,
  onAudienceMode,
  busy,
  mapOpen,
  onMapToggle,
  conversation,
  historyOpen,
  onHistory,
  onNew,
  onClose,
  onRename,
  onDelete,
  threadOpen,
  onBack,
}: {
  label: string;
  audienceMode?: "live" | "digital";
  onAudienceMode?: (mode: "live" | "digital") => boolean;
  busy?: boolean;
  mapOpen?: boolean;
  onMapToggle?: (open: boolean) => void;
  conversation: Conversation;
  historyOpen: boolean;
  onHistory: () => void;
  onNew: () => void;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  threadOpen: boolean;
  onBack: () => void;
}) {
  const Icon = historyOpen ? PanelLeftClose : PanelLeft;
  return (
    <header className={styles.header} data-audience={Boolean(onMapToggle)} data-joined={Boolean(onMapToggle && mapOpen)}>
      {onMapToggle && <div className={styles.mapControls}>
        {onAudienceMode && <AudienceModeToggle value={audienceMode ?? "live"} disabled={busy} onChange={onAudienceMode} />}
        <div className={styles.mapToggle}><span>{audienceMode === "digital" ? "Platforms" : "Map"}</span><ToggleSwitch label={audienceMode === "digital" ? "Platforms" : "Map"} checked={Boolean(mapOpen)} onChange={onMapToggle} /></div>
      </div>}
      <div className={styles.chatControls}>
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
        <IconButton label="New chat" title="New chat" onClick={onNew}><SquarePen /></IconButton>
        {conversation.scope !== "workspace" && <ActionMenu
          label="Chat actions"
          onRename={onRename}
          onDelete={onDelete}
        />}
        <IconButton label={`Close ${label.toLowerCase()}`} onClick={onClose}>
          <X />
        </IconButton>
      </div>
    </header>
  );
}
