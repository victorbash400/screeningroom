import type { ResearchWidget } from "../../lib/researchWidget";
import ResearchChartView from "./ResearchChartView";
import ResearchComparison from "./ResearchComparison";

export default function ResearchWidgetView({ widget }: { widget: ResearchWidget }) {
  return widget.kind === "comparison" ? <ResearchComparison widget={widget} /> : <ResearchChartView widget={widget} />;
}
