import { useId } from "react";
import type { ResearchChart } from "../../lib/researchWidget";
import { metricText } from "../../lib/researchWidget";
import styles from "./ResearchChart.module.css";

export default function ResearchLineChart({ widget }: { widget: ResearchChart }) {
  const id = useId();
  let minimum = 0, maximum = 0;
  for (const series of widget.series) for (const point of series.points) { minimum = Math.min(minimum, point.value); maximum = Math.max(maximum, point.value); }
  const range = maximum - minimum || 1;
  return <div className={styles.lines}>
    <svg viewBox="0 0 400 180" role="img" aria-labelledby={id}>
      <title id={id}>{widget.title}</title>
      <text x="0" y="12">{metricText(maximum, widget.unit)}</text><text x="0" y="150">{metricText(minimum, widget.unit)}</text>
      {widget.series.map((series, index) => <g key={index}>
        <polyline fill="none" stroke={index % 2 ? "#bba38e" : "#6e96a2"} strokeWidth="2" points={series.points.map((point, index) => `${55 + (series.points.length === 1 ? 0 : index / (series.points.length - 1)) * 330},${145 - (point.value - minimum) / range * 125}`).join(" ")} />
        {series.points.map((point, pointIndex) => <circle key={pointIndex} cx={55 + (series.points.length === 1 ? 0 : pointIndex / (series.points.length - 1)) * 330} cy={145 - (point.value - minimum) / range * 125} r="3" fill={index % 2 ? "#bba38e" : "#6e96a2"}><title>{`${series.name} · ${point.label}: ${metricText(point.value, widget.unit)}`}</title></circle>)}
      </g>)}
      <text x="55" y="173">{widget.series[0].points[0].label}</text><text x="385" y="173" textAnchor="end">{widget.series[0].points.at(-1)?.label}</text>
    </svg>
    <details><summary>View values</summary><div className={styles.values}>{widget.series.map((series, index) => <div key={index}><strong>{series.name}</strong>{series.points.map((point, index) => <div key={index}><span>{point.label}</span><output>{metricText(point.value, widget.unit)}</output></div>)}</div>)}</div></details>
  </div>;
}
