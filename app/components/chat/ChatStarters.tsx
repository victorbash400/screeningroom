import type { MediaWorkflow } from "../../lib/mediaWorkflows";
import SimilarMediaIllustration from "./SimilarMediaIllustration";
import PerformanceIllustration from "./PerformanceIllustration";
import CompareMediaIllustration from "./CompareMediaIllustration";
import AudienceIllustration from "./AudienceIllustration";
import styles from "./ChatStarters.module.css";

const starters = [
  { channel: "similar", label: "Find similar media", illustration: SimilarMediaIllustration },
  { channel: "performance", label: "Check media or project performance", illustration: PerformanceIllustration },
  { channel: "compare", label: "Compare with existing media", illustration: CompareMediaIllustration },
  { channel: "fit", label: "Explore audience fit", illustration: AudienceIllustration },
] as const;

export default function ChatStarters({ onSelect }: { onSelect: (channel: MediaWorkflow) => void }) {
  return <div className={styles.starters} aria-label="Start a chat">
    {starters.map(({ label, illustration: Illustration, channel }) => <button type="button" key={label} onClick={() => onSelect(channel)}>
      <Illustration /><span>{label}</span>
    </button>)}
  </div>;
}
