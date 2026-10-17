import { ChartNoAxesColumnIncreasing, Columns2, ScanSearch, Users } from "lucide-react";
import styles from "./ChatStarters.module.css";

const starters = [
  { label: "Find similar movies", icon: ScanSearch, prompt: "Find movies similar to " },
  { label: "Check media performance", icon: ChartNoAxesColumnIncreasing, prompt: "Check the performance of the selected media using the data provided." },
  { label: "Compare media", icon: Columns2, prompt: "Compare the selected media and explain the differences." },
  { label: "Explore audience fit", icon: Users, prompt: "Help me explore which audiences fit the selected media." },
];

export default function ChatStarters({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <div className={styles.starters} aria-label="Start a chat">
    {starters.map(({ label, icon: Icon, prompt }) => <button type="button" key={label} onClick={() => onSelect(prompt)}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </button>)}
  </div>;
}
