import { useState } from "react";
import type { FileNode, ViewMode } from "../../lib/types";
import type { TourStep } from "../../lib/productTour";
import WorkspaceToolbar from "../workspace/WorkspaceToolbar";
import TourAccountProvider from "./TourAccountProvider";
import TourSidebar from "./TourSidebar";
import TourFiles from "./TourFiles";
import TourImport from "./TourImport";
import TourChat from "./TourChat";
import { exampleLinkedFile, exampleWorkspace } from "./tourExample";
import styles from "./TourPreview.module.css";

export default function TourPreview({ step, onRestart }: { step: TourStep; onRestart: () => void }) {
  const [workspaceOpen, setWorkspaceOpen] = useState(step !== "workspace");
  const [uploaded, setUploaded] = useState(step !== "import");
  const [linked, setLinked] = useState<FileNode>();
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [file, setFile] = useState<string>();
  const [view, setView] = useState<ViewMode>("list");
  const [audienceOpen, setAudienceOpen] = useState(!["workspace", "import"].includes(step));

  return <TourAccountProvider><div className={styles.preview} data-audience-open={audienceOpen} aria-label="Interactive example workspace">
    <div className={styles.canvas} inert={importOpen}>
      {navigationOpen && <button type="button" className={styles.navigationBackdrop} aria-label="Close example navigation" onClick={() => setNavigationOpen(false)} tabIndex={-1} />}
      <TourSidebar query={query} navigationOpen={navigationOpen} onClose={() => setNavigationOpen(false)} onSearch={next => { setQuery(next); setWorkspaceOpen(true); setAudienceOpen(false); setNavigationOpen(false); }} open={workspaceOpen} onOpen={() => { setWorkspaceOpen(true); setNavigationOpen(false); }} onHome={() => { setWorkspaceOpen(false); setAudienceOpen(false); setQuery(""); setNavigationOpen(false); }} />
      <div className={styles.workspace}>
        <WorkspaceToolbar workspace={exampleWorkspace} path={[]} mode={view} chatOpen={audienceOpen} chatChannel="locations" importing={false}
          onMode={setView} onNavigate={id => { setWorkspaceOpen(Boolean(id)); if (!id) setAudienceOpen(false); }} canShare={false} onShare={() => {}}
          onChat={() => { setWorkspaceOpen(true); setAudienceOpen(!audienceOpen); }} onImport={() => { setWorkspaceOpen(true); setImportOpen(true); }}
          onInfo={onRestart} onNavigation={() => setNavigationOpen(true)} />
        <div className={styles.content}>
          <TourFiles query={query} linked={linked} workspaceOpen={workspaceOpen} uploaded={uploaded} mode={view} selected={file} onOpen={() => setWorkspaceOpen(true)} onImport={() => setImportOpen(true)} onSelect={setFile} />
          {audienceOpen && <TourChat step={step} selected={step === "select" ? [] : ["tour-trailer", "tour-brief"]} onClose={() => setAudienceOpen(false)} onReference={id => { setFile(id); setAudienceOpen(false); }} />}
        </div>
        {!audienceOpen && <div className={styles.count}>{workspaceOpen ? uploaded ? linked ? "1 item" : "3 items" : "0 items" : "1 workspace"}</div>}
      </div>
    </div>
    {importOpen && <TourImport onClose={() => setImportOpen(false)} onImport={(source, link) => { setLinked(source === "link" && link ? { ...exampleLinkedFile, name: link.name || link.url, sourceUrl: link.url } : undefined); setUploaded(true); setImportOpen(false); }} />}

  </div></TourAccountProvider>;
}
