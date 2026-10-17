import styles from "./MapAttribution.module.css";

export default function MapAttribution() {
  return <div className={styles.attribution} aria-label="Map attribution">
    <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>
    <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  </div>;
}
