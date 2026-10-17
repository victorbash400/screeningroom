import type { ChatChannel } from "../../lib/types";
import { UsersRound, MessageCircle } from "lucide-react";
import IconButton from "../controls/IconButton";
import styles from "./ResearchTabs.module.css";

const tabs = [
  { channel: "chat", label: "Chat", icon: MessageCircle, style: undefined },
  { channel: "locations", label: "Audience", icon: UsersRound, style: styles.location },
] as const;

export default function ResearchTabs({ selected, onSelect }: {
  selected: ChatChannel | null;
  onSelect: (channel: ChatChannel) => void;
}) {

  return (
    <div className={styles.position}>
      <div className={styles.group} role="group" aria-label="Research">
        {tabs.map(({ channel, label, icon: Icon, style }) => (
          <IconButton
            key={label}
            className={styles.tab}
            label={label}
            selected={channel === "chat" ? selected !== null && selected !== "locations" : selected === channel}
            onClick={() => onSelect(channel)}
          >
            <Icon className={style} />
            <span className={styles.label} aria-hidden="true">
              <span>{label}</span>
            </span>
          </IconButton>
        ))}
      </div>
    </div>
  );
}
