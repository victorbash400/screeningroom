import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { digitalCategories, digitalPlatforms, type DigitalCategory } from "../../lib/digitalPlatforms";
import CategoryAffinityDialog from "./CategoryAffinityDialog";
import DigitalPlatformCard from "./DigitalPlatformCard";
import styles from "./DigitalCatalogue.module.css";

export default function DigitalCatalogue() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [explaining, setExplaining] = useState<DigitalCategory>();
  return <section className={styles.catalogue} aria-label="Digital platforms">
    {digitalCategories.map((category) => <section key={category} className={styles.category} aria-label={category}>
      <header className={styles.heading}><h2>{category}</h2><button type="button" className={styles.info} aria-label={`How ${category} affinity works`} aria-haspopup="dialog" onClick={(event) => { trigger.current = event.currentTarget; setExplaining(category); }}><Info size={14} aria-hidden="true" /></button></header>
      <div className={styles.list}>{digitalPlatforms.filter((platform) => platform.category === category).map((platform) => <DigitalPlatformCard key={platform.id} platform={platform} />)}</div>
    </section>)}
    {explaining && <CategoryAffinityDialog category={explaining} onClose={() => { setExplaining(undefined); queueMicrotask(() => trigger.current?.focus()); }} />}
  </section>;
}
