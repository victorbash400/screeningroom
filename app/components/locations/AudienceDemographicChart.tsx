import type { AudienceDemographics } from "../../lib/audienceWidget";
import AudienceWidgetShell from "./AudienceWidgetShell";
import styles from "./AudienceDemographicChart.module.css";

export default function AudienceDemographicChart({ widget }: { widget: AudienceDemographics }) {
  return <AudienceWidgetShell title={widget.title} source="Qloo · audience affinity index, not population share">
    {widget.profiles.map((profile, index) => <div className={styles.profile} key={index}>
      {widget.profiles.length > 1 && <strong>{profile.name}</strong>}
      {[...profile.age, ...profile.gender].map((bar) => <div className={styles.row} key={bar.label}>
        <span>{bar.label}</span><div className={styles.track} aria-hidden="true"><i style={{ width: `${Math.min(Math.abs(bar.value), 1) * 50}%`, left: `${bar.value < 0 ? 50 - Math.min(Math.abs(bar.value), 1) * 50 : 50}%` }} data-negative={bar.value < 0} /></div>
        <output>{bar.value > 0 ? "+" : ""}{bar.value.toFixed(2)}</output>
      </div>)}
    </div>)}
  </AudienceWidgetShell>;
}
