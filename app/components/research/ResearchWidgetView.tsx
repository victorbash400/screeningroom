import type { ResearchWidget } from "../../lib/researchWidget";
import DigitalAudienceResult from "../audience/DigitalAudienceResult";
import ResearchChartView from "./ResearchChartView";
import ResearchComparison from "./ResearchComparison";

export default function ResearchWidgetView({ widget }: { widget: ResearchWidget }) {
  if (widget.kind === "digital") return <DigitalAudienceResult widget={widget} />;
  return widget.kind === "comparison" ? <ResearchComparison widget={widget} /> : <ResearchChartView widget={widget} />;
}
