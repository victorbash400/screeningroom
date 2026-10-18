import type { ChatChannel } from "../../lib/types";
import { UsersRound, MessageCircle, ScanSearch, Columns2 } from "lucide-react";
import IconButton from "../controls/IconButton";
import styles from "./ResearchTabs.module.css";

const tabs = [
  { channel: "chat", label: "Chat", icon: MessageCircle },
  { channel: "similar", label: "Similar media", icon: ScanSearch },
  { channel: "compare", label: "Compare", icon: Columns2 },
  { channel: "locations", label: "Audience", icon: UsersRound },
] as const;
export default function ResearchTabs({ selected, onSelect }: { selected: ChatChannel | null; onSelect: (channel: ChatChannel) => void }) {
  return <div className={styles.position}><div className={styles.group} role="group" aria-label="Research">
    {tabs.map(({ channel, label, icon: Icon }) => <IconButton key={channel} className={styles.tab} label={label} title={label} selected={selected === channel} onClick={() => onSelect(channel)}>
      <Icon /><span className={styles.label} aria-hidden="true"><span>{label}</span></span>
    </IconButton>)}
  </div></div>;
}
