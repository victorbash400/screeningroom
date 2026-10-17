import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { populationWidgetSchema, type PopulationWidget } from "../../lib/audienceWidget";
import { useAccount } from "../../state/AccountContext";
import { useAudienceMap } from "./AudienceMapContext";
import AudienceWidgetShell from "./AudienceWidgetShell";
import styles from "./AudiencePopulationCard.module.css";

export default function AudiencePopulationCard({ widget, toolId }: { widget: PopulationWidget; toolId: string }) {
  const account = useAccount();
  const map = useAudienceMap();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function load() {
    setBusy(true); setError(""); setPending(false);
    try {
      const response = await account.fetch("/api/locations/population", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(widget) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Population could not be loaded.");
      const next = populationWidgetSchema.parse(value);
      if (!map?.updateWidget(toolId, next)) throw new Error("Population result could not be saved.");
      setPending(next.status === "pending");
    } catch (error) { setError(error instanceof Error ? error.message : "Population could not be loaded."); }
    finally { setBusy(false); }
  }
  const maximum = Math.max(1, ...(widget.rows ?? []).map((row) => row.male + row.female));
  return <AudienceWidgetShell title={`${widget.analysis === "agesex" ? "Resident demographics" : "Population"} · ${widget.area.name}`} source={`WorldPop · ${widget.year} estimate`} onMap={() => map?.showPlaces([{ name: widget.area.name, latitude: widget.area.latitude, longitude: widget.area.longitude }])}>
    {widget.status === "ready" && widget.total !== undefined && <strong className={styles.total}>{Math.round(widget.total).toLocaleString()}</strong>}
    {widget.rows && <div className={styles.rows} aria-label="Resident age and sex counts"><div className={styles.legend}><span>Male</span><span>Female</span></div>{widget.rows.map((row) => <div className={styles.row} key={row.age}>
      <span>{row.age}</span><div className={styles.bars} aria-hidden="true"><i style={{ width: `${row.male / maximum * 100}%` }} /><b style={{ width: `${row.female / maximum * 100}%` }} /></div>
      <output title={`Male ${Math.round(row.male).toLocaleString()}, female ${Math.round(row.female).toLocaleString()}`}>{Math.round(row.male + row.female).toLocaleString()}</output>
    </div>)}</div>}
    {widget.status === "pending" && <button type="button" className={styles.load} disabled={busy || map?.busy} onClick={() => void load()}>{busy && <LoaderCircle size={13} className={styles.busy} />}{pending ? "Still calculating · Load result" : "Load result"}</button>}
    {(error || widget.error) && <p role="alert" className={styles.error}>{error || widget.error}</p>}
  </AudienceWidgetShell>;
}
