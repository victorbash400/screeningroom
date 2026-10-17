import type { AudienceWidget } from "../../lib/audienceWidget";
import AudienceVenueList from "./AudienceVenueList";
import AudienceDemographicChart from "./AudienceDemographicChart";
import AudienceHeatmapCard from "./AudienceHeatmapCard";
import AudiencePopulationCard from "./AudiencePopulationCard";

export default function AudienceWidgetView({ widget, toolId }: { widget: AudienceWidget; toolId: string }) {
  if (widget.kind === "venues") return <AudienceVenueList widget={widget} />;
  if (widget.kind === "demographics") return widget.profiles.length ? <AudienceDemographicChart widget={widget} /> : null;
  if (widget.kind === "heatmap") return <AudienceHeatmapCard widget={widget} />;
  return <AudiencePopulationCard widget={widget} toolId={toolId} />;
}
