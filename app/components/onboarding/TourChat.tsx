import { useLayoutEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { Conversation } from "../../lib/types";
import type { TourScene } from "./tourScript";
import { AudienceMapProvider } from "../locations/AudienceMapContext";
import AudienceSurface from "../chat/AudienceSurface";
import ChatHeader from "../chat/ChatHeader";
import ChatComposer from "../chat/ChatComposer";
import AudienceStarter from "../chat/AudienceStarter";
import MessageList from "../chat/MessageList";
import DigitalCatalogue from "../audience/DigitalCatalogue";
import ReferencePicker from "../chat/ReferencePicker";
import { exampleFiles, exampleWorkspace, exampleMap, exampleArea } from "./tourExample";
import { tourMessages } from "./tourConversation";
import styles from "../chat/ChatDrawer.module.css";
const AudienceMap = dynamic(() => import("../locations/AudienceMap"), { ssr: false });
const ignore = () => {};
const reject = () => false;

export default function TourChat({ scene }: { scene: TourScene }) {
  const root = useRef<HTMLElement>(null);
  const messages = useMemo(() => scene.sent ? tourMessages(scene.audienceMode) : [], [scene.sent, scene.audienceMode]);
  const conversation: Conversation = { id: "tour-playback", workspaceId: exampleWorkspace.id, scope: "workspace", channel: "locations", title: "Audience", messages, draft: scene.draft, audienceMode: scene.audienceMode };
  const map = useMemo(() => ({ ...exampleMap, id: `tour-map-${scene.venue ?? "all"}`, presentation: { ...exampleMap.presentation, ...(scene.venue === undefined ? {} : { focusIndex: scene.venue, zoom: 17 }) } }), [scene.venue]);
  const area = useMemo(() => ({ ...exampleArea, radius: scene.radius }), [scene.radius]);
  useLayoutEffect(() => {
    const disclosure = root.current?.querySelector<HTMLDetailsElement>("details");
    if (!disclosure) return;
    disclosure.open = scene.evidenceOpen;
    if (scene.evidenceOpen) {
      const list = root.current?.querySelector<HTMLElement>('[role="log"]');
      if (list) list.scrollTop += disclosure.getBoundingClientRect().top - list.getBoundingClientRect().top - 12;
    }
  }, [scene.evidenceOpen, messages]);
  return <AudienceMapProvider value={{ showPlaces: ignore, showHeatmap: ignore, ask: ignore, updateWidget: reject, hasVenue: reject, focusVenue: ignore, showLocation: ignore, busy: false }}>
    <aside ref={root} className={styles.drawer} data-embedded="true" data-audience="true" data-map-open={scene.mapOpen} aria-label="Audience">
      <ChatHeader label="Audience" audienceMode={scene.audienceMode} onAudienceMode={reject} mapOpen={scene.mapOpen} onMapToggle={ignore} conversation={conversation} historyOpen={false} onHistory={ignore} onNew={ignore} onClose={ignore} onRename={ignore} onDelete={ignore} threadOpen={false} onBack={ignore} />
      <div className={styles.workspace}>
        <AudienceSurface open={scene.mapOpen}>{scene.audienceMode === "digital" ? <DigitalCatalogue /> : <AudienceMap compact animate={false} mode="live" open={scene.mapOpen} scene={map} area={area} onArea={reject} onScene={reject} />}</AudienceSurface>
        <div className={styles.body}>
          {messages.length ? <MessageList messages={messages} nodes={exampleFiles} onReply={ignore} onReference={ignore} /> : <AudienceStarter onSelect={ignore} />}
          <ChatComposer key={scene.references.join(":")} embeddedPicker initialReferenceIds={scene.references} area={scene.audienceMode === "live" ? area : undefined} onLocation={ignore} busy={false} onStop={ignore} workspaces={[exampleWorkspace]} workspaceId={exampleWorkspace.id} referenceRequest={0} draft={scene.draft} nodes={exampleFiles} onDraft={reject} onSend={reject} />
        </div>
      </div>
      {scene.pickerOpen && <ReferencePicker key={scene.references.join(":")} embedded workspaceId={exampleWorkspace.id} workspaces={[exampleWorkspace]} nodes={exampleFiles} selectedIds={scene.references} onSelect={ignore} onClose={ignore} />}
    </aside>
  </AudienceMapProvider>;
}
