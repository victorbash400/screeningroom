import type { AudienceHeatmap } from "../../lib/audienceHeatmap";
import styles from "./MapHeatmapLegend.module.css";

export default function MapHeatmapLegend({ heatmap }: { heatmap: AudienceHeatmap }) {
  if (!heatmap.cells.length) return null;
  return <div className={styles.legend} aria-label={`${heatmap.title}: relative audience affinity`}>
    <strong>{heatmap.title}</strong><i /><div><span>Lower affinity</span><span>Higher affinity</span></div>
  </div>;
}
