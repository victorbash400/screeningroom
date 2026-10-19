import styles from "./VenueAffinity.module.css";

export default function VenueAffinity({ value }: { value: number }) {
  return <span className={styles.affinity} aria-label={`Qloo affinity ${value.toFixed(3)}`}>
    <span className={styles.track} aria-hidden="true"><i style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} /></span><output>{value.toFixed(3)}</output>
  </span>;
}
