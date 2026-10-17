import type { ResearchChart } from "../../lib/researchWidget";
import { metricText } from "../../lib/researchWidget";
import styles from "./ResearchChart.module.css";

export default function ResearchBarChart({ widget }: { widget: ResearchChart }) {
  let maximum = 0;
  for (const series of widget.series) for (const point of series.points) maximum = Math.max(maximum, Math.abs(point.value));
  return <div className={styles.bars}>
    {widget.series.map((series, index) => <div className={styles.series} key={index}>
      {widget.series.length > 1 && <strong>{series.name}</strong>}
      {series.points.map((point, index) => <div className={styles.row} key={index}>
        <span title={point.label}>{point.label}</span><div className={styles.track} aria-hidden="true"><i style={{ width: `${maximum ? Math.abs(point.value) / maximum * 100 : 0}%` }} data-negative={point.value < 0} /></div><output>{metricText(point.value, widget.unit)}</output>
      </div>)}
    </div>)}
  </div>;
}
