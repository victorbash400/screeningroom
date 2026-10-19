import type { AudienceHeatmap } from "../../lib/audienceHeatmap";
import AudienceWidgetShell from "./AudienceWidgetShell";
import { useAudienceMap } from "./AudienceMapContext";
import styles from "./AudienceHeatmapCard.module.css";

export default function AudienceHeatmapCard({ widget }: { widget: AudienceHeatmap }) {
  const map = useAudienceMap();
  return <AudienceWidgetShell title={widget.title} source={`Qloo · ${widget.area.name} · relative audience affinity`} onMap={widget.cells.length ? () => map?.showHeatmap(widget) : undefined}>
    {widget.cells.length ? <button type="button" className={styles.preview} onClick={() => map?.showHeatmap(widget)} aria-label="Show audience heatmap">
      <span className={styles.scale} /><span className={styles.labels}><span>Lower affinity</span><span>Higher affinity</span></span><span>{widget.cells.length.toLocaleString()} areas</span>
    </button> : <button type="button" className={styles.expand} disabled={map?.busy} onClick={() => map?.ask(`Try a wider audience heatmap around ${widget.area.name}, using a ${widget.area.radius * 2 / 1000} km radius.`)}>Try a wider area</button>}
  </AudienceWidgetShell>;
}
