import { digitalCategories, digitalPlatforms } from "../../lib/digitalPlatforms";
import DigitalPlatformCard from "./DigitalPlatformCard";
import styles from "./DigitalCatalogue.module.css";

export default function DigitalCatalogue() {
  return <section className={styles.catalogue} aria-label="Digital platforms">
    {digitalCategories.map((category) => <section key={category} className={styles.category} aria-label={category}>
      <h2>{category}</h2>
      <div className={styles.list}>{digitalPlatforms.filter((platform) => platform.category === category).map((platform) => <DigitalPlatformCard key={platform.id} platform={platform} />)}</div>
    </section>)}
  </section>;
}
