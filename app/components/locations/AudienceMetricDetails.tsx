import { ChevronDown } from "lucide-react";
import styles from "./AudienceMetricDetails.module.css";

export default function AudienceMetricDetails({ kind }: { kind: "heatmap" | "demographics" | "venues" }) {
  const demographic = kind === "demographics";
  return <details className={styles.details}>
    <summary>About affinity<ChevronDown size={13} aria-hidden="true" /></summary>
    <dl>
      <div><dt>Measures</dt><dd>{demographic ? "How strongly each age or gender group relates to the selected media or interests." : kind === "heatmap" ? "Relative audience interest in the selected media or interests across the returned map areas." : "How closely each venue relates to the selected media or interests."}</dd></div>
      <div><dt>Read it</dt><dd>{demographic ? "Positive values indicate stronger affinity; negative values indicate weaker affinity. Zero is neutral. The scale runs from −1 to +1." : kind === "heatmap" ? "Cooler colors indicate lower relative affinity; warmer colors indicate higher relative affinity. Colors use Qloo’s rank within this result." : "Higher scores indicate stronger affinity within this search. Compare venues from the same query."}</dd></div>
      <div><dt>Use it for</dt><dd>{demographic ? "Comparing audience segments for the same reference." : "Shortlisting areas or venues to investigate further."}</dd></div>
      <div><dt>Limit</dt><dd>Affinity is not an audience count, a population percentage, or a ticket-sales forecast. Different searches can have different score scales.</dd></div>
    </dl>
    <a href={demographic ? "https://github.com/qloo/docs-public/blob/main/reference/demographics-use-case.md" : "https://github.com/qloo/docs-public/blob/main/docs/interpreting-affinity-scores.md"} target="_blank" rel="noopener noreferrer">Qloo documentation</a>
  </details>;
}
