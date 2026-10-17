import { createContext, useContext, type ReactNode } from "react";
import type { AudienceHeatmap } from "../../lib/audienceHeatmap";
import type { AudienceWidget } from "../../lib/audienceWidget";
import type { MapPlace } from "../../lib/mapScene";

interface Actions {
  showPlaces: (places: MapPlace[], focus?: number) => void;
  showHeatmap: (heatmap: AudienceHeatmap) => void;
  ask: (text: string) => void;
  updateWidget: (toolId: string, widget: AudienceWidget) => boolean;
  hasVenue: (id: string) => boolean;
  focusVenue: (id: string) => void;
  showLocation: () => void;
  busy: boolean;
}
const Context = createContext<Actions | null>(null);
export function AudienceMapProvider({ value, children }: { value: Actions; children: ReactNode }) {
  return <Context value={value}>{children}</Context>;
}
export function useAudienceMap() { return useContext(Context); }
