import type { Dispatch, SetStateAction } from "react";
import type { Conversation } from "../../lib/types";
import type { AudienceWidget } from "../../lib/audienceWidget";
import type { AudienceHeatmap } from "../../lib/audienceHeatmap";
import type { MapPlace, MapScene } from "../../lib/mapScene";
import { messageBlocks } from "../../lib/messageBlocks";

export function useAudienceMapActions(conversation: Conversation, busy: boolean, onSend: (text: string) => boolean,
  onScene: (scene: MapScene) => boolean, onWidget: (id: string, widget: AudienceWidget) => boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  function venueGroup(id: string) {
    for (const message of conversation.messages.toReversed()) {
      for (const block of messageBlocks(message).toReversed()) {
        if (block.kind !== "tool" || block.tool.widget?.kind !== "venues") continue;
        const places = block.tool.widget.venues;
        const focus = places.findIndex((place) => place.id === id);
        if (focus >= 0) return { places, focus };
      }
    }
    return null;
  }
  function showPlaces(places: MapPlace[], focusIndex?: number) {
    if (onScene({ id: crypto.randomUUID(), reframe: true, presentation: { ...conversation.mapScene?.presentation, locations: places, focusIndex } })) setOpen(true);
  }
  return {
    busy, showPlaces,
    ask: (text: string) => { if (!busy) onSend(text); },
    updateWidget: onWidget,
    showLocation: () => setOpen(true),
    showHeatmap: (heatmap: AudienceHeatmap) => { if (onScene({ id: crypto.randomUUID(), reframe: true, presentation: { ...conversation.mapScene?.presentation, locations: conversation.mapScene?.presentation.locations ?? [], focusIndex: undefined, zoom: undefined, heatmap } })) setOpen(true); },
    hasVenue: (id: string) => Boolean(venueGroup(id)),
    focusVenue: (id: string) => { const group = venueGroup(id); if (group) showPlaces(group.places, group.focus); },
  };
}
