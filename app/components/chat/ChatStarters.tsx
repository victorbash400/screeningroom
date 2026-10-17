import SimilarMediaIllustration from "./SimilarMediaIllustration";
import PerformanceIllustration from "./PerformanceIllustration";
import CompareMediaIllustration from "./CompareMediaIllustration";
import AudienceIllustration from "./AudienceIllustration";
import styles from "./ChatStarters.module.css";

const starters = [
  { label: "Find similar media", illustration: SimilarMediaIllustration, prompt: "Find media similar to the selected references." },
  { label: "Check media or project performance", illustration: PerformanceIllustration, prompt: "Check the performance of the selected media or project using the available data." },
  { label: "Compare with existing media", illustration: CompareMediaIllustration, prompt: "Compare the selected references with other existing media. Distinguish available evidence from creative hypotheses." },
  { label: "Explore audience fit", illustration: AudienceIllustration, prompt: "Help me explore which audiences fit the selected media or project." },
];

export default function ChatStarters({ onSelect }: { onSelect: (prompt: string) => void }) {
  return <div className={styles.starters} aria-label="Start a chat">
    {starters.map(({ label, illustration: Illustration, prompt }) => <button type="button" key={label} onClick={() => onSelect(prompt)}>
      <Illustration /><span>{label}</span>
    </button>)}
  </div>;
}
