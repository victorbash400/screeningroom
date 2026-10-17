import { useState } from "react";
import { ChartNoAxesColumn, ChartNoAxesCombined } from "lucide-react";
import type { ResearchChart } from "../../lib/researchWidget";
import ResearchWidgetFrame from "./ResearchWidgetFrame";
import ResearchBarChart from "./ResearchBarChart";
import ResearchLineChart from "./ResearchLineChart";
import styles from "./ResearchChart.module.css";

export default function ResearchChartView({ widget }: { widget: ResearchChart }) {
  const [view, setView] = useState(widget.view);
  return <ResearchWidgetFrame title={widget.title} source={widget.source} basis={widget.basis}>
    <div className={styles.switch} role="group" aria-label="Chart view">
      <button type="button" aria-label="Bar chart" aria-pressed={view === "bar"} onClick={() => setView("bar")}><ChartNoAxesColumn size={14} /></button>
      <button type="button" aria-label="Line chart" aria-pressed={view === "line"} onClick={() => setView("line")}><ChartNoAxesCombined size={14} /></button>
    </div>
    {view === "bar" ? <ResearchBarChart widget={widget} /> : <ResearchLineChart widget={widget} />}
  </ResearchWidgetFrame>;
}
