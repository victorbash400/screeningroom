import type { ComparisonWidget } from "../../lib/researchWidget";
import { metricText } from "../../lib/researchWidget";
import ResearchSubject from "./ResearchSubject";
import ResearchWidgetFrame from "./ResearchWidgetFrame";
import styles from "./ResearchComparison.module.css";

export default function ResearchComparison({ widget }: { widget: ComparisonWidget }) {
  const metrics = [...new Map(widget.subjects.flatMap((subject) => subject.metrics.map((metric) => [metric.key, metric] as const))).values()];
  return <ResearchWidgetFrame title={widget.title} source={`${widget.source} · ${new Date(widget.retrievedAt).toLocaleDateString()}`} basis={widget.basis}>
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Media comparison table">
      <table><thead><tr><th scope="col">Media</th>{widget.subjects.map((subject) => <th scope="col" key={subject.id}><ResearchSubject subject={subject} /></th>)}</tr></thead>
      <tbody>{metrics.map((metric) => <tr key={metric.key}><th scope="row">{metric.label}<small>{metric.source}</small></th>{widget.subjects.map((subject) => {
        const value = subject.metrics.find((item) => item.key === metric.key);
        return <td key={subject.id}>{value ? metricText(value.value, value.unit) : "—"}</td>;
      })}</tr>)}</tbody></table>
    </div>
    {!widget.metricComparisons && widget.commonTags.length > 0 && <details className={styles.tags}><summary>Shared tags ({widget.commonTags.length})</summary><div>{widget.commonTags.map((tag) => <span key={tag}>{tag}</span>)}</div></details>}
  </ResearchWidgetFrame>;
}
