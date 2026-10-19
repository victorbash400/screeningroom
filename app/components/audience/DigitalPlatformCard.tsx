import type { DigitalPlatform } from "../../lib/digitalPlatforms";
import styles from "./DigitalPlatformCard.module.css";

export default function DigitalPlatformCard({ platform }: { platform: DigitalPlatform }) {
  return <div className={styles.platform}>
    <img src={platform.logo} alt="" width={64} height={32} loading="lazy" decoding="async" />
    <span>{platform.name}</span>
  </div>;
}
