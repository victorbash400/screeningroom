import { venueResultsSchema } from "./audienceWidget.ts";
import { audienceHeatmapSchema } from "./audienceHeatmap.ts";
import { locationInterestSchema, type LocationInterest } from "./locationInterest.ts";
import { mapPresentationSchema, type MapScene } from "./mapScene.ts";

export function audienceMapUpdate(name: string, output: unknown, callId: string, scene?: MapScene): { scene?: MapScene; area?: LocationInterest } {
  if (name === "setAudienceArea") return { area: locationInterestSchema.parse(output), scene: { id: callId, presentation: { locations: [] } } };
  if (name === "showMapLocations") {
    const presentation = mapPresentationSchema.parse(output);
    return { scene: { id: callId, presentation: { ...presentation, heatmap: presentation.heatmap ?? scene?.presentation.heatmap } } };
  }
  if (name === "searchMapVenues" || name === "searchAudienceVenues") {
    const widget = venueResultsSchema.parse(output);
    return { scene: { id: callId, presentation: { ...scene?.presentation, focusIndex: undefined, locations: widget.venues } } };
  }
  if (name === "getAudienceHeatmap") return { scene: { id: callId, presentation: { locations: scene?.presentation.locations ?? [], heatmap: audienceHeatmapSchema.parse(output) } } };
  return {};
}
