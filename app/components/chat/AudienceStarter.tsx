import AudienceIllustration from "./AudienceIllustration";
import styles from "./AudienceStarter.module.css";

export default function AudienceStarter({ onSelect }: { onSelect: () => void }) {
  return <div className={styles.empty}><button type="button" onClick={onSelect}>
    <AudienceIllustration /><span>Find an audience</span>
  </button></div>;
}
