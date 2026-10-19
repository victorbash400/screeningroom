import { memo } from "react";
import WorkspaceHome from "../workspace/WorkspaceHome";
import TourWorkspaceName from "./TourWorkspaceName";
import WorkspaceToolbar from "../workspace/WorkspaceToolbar";
import TourAccountProvider from "./TourAccountProvider";
import TourSidebar from "./TourSidebar";
import TourFiles from "./TourFiles";
import TourImport from "./TourImport";
import TourChat from "./TourChat";
import type { TourScene } from "./tourScript";
import { exampleWorkspace } from "./tourExample";
import styles from "./TourPreview.module.css";
const ignore = () => {};

function TourPreview({ scene }: { scene: TourScene }) {
  return <TourAccountProvider><div className={styles.preview} data-audience-open={scene.audienceOpen} aria-label="Example workspace">
    <div className={styles.canvas}>
      <TourSidebar hasWorkspace={scene.workspaceExists} query="" navigationOpen={false} onClose={ignore} onSearch={ignore} open={scene.workspaceOpen} onOpen={ignore} onHome={ignore} />
      <div className={styles.workspace}>
        {scene.workspaceOpen ? <><WorkspaceToolbar workspace={exampleWorkspace} path={[]} mode={scene.view} chatOpen={scene.audienceOpen} chatChannel="locations" importing={false} onMode={ignore} onNavigate={ignore} canShare={false} onShare={ignore} onChat={ignore} onImport={ignore} onInfo={ignore} onNavigation={ignore} />
        <div className={styles.content}>
          <TourFiles query="" workspaceOpen={scene.workspaceOpen} uploaded={scene.uploaded} mode={scene.view} selected={scene.file} onOpen={ignore} onImport={ignore} onSelect={ignore} />
          {scene.audienceOpen && <TourChat scene={scene} />}
        </div>
        {!scene.audienceOpen && <div className={styles.count}>{scene.uploaded ? "3 items" : "0 items"}</div>}
        </> : <div className={styles.home} data-tour-home><WorkspaceHome ready workspaces={scene.workspaceExists ? [exampleWorkspace] : []} onCreate={ignore} onOpen={ignore} onNavigation={ignore} onRefresh={ignore} /></div>}
      </div>
    </div>
    {scene.createOpen && <TourWorkspaceName name={scene.workspaceName} />}
    {scene.importOpen && <TourImport busy={scene.importBusy} items={scene.importItems} onClose={ignore} onImport={ignore} />}
  </div></TourAccountProvider>;
}
export default memo(TourPreview, (previous, next) => (Object.keys(next.scene) as (keyof TourScene)[]).every(key => previous.scene[key] === next.scene[key]));
