import type { z } from "zod";
import type { contributionSchema } from "../../lib/affinityEvidence";
import styles from "./ReferenceInfluence.module.css";

export default function ReferenceInfluence({ references }: { references: z.infer<typeof contributionSchema>[] }) {
  return <div className={styles.contributions} aria-label="Reference influence">
    {references.map((reference) => <div className={styles.row} key={reference.id}>
      <span>{reference.name ?? reference.id}</span><span className={styles.track} aria-hidden="true"><i style={{ width: `${reference.score * 100}%` }} /></span><output>{reference.score.toFixed(3)}</output>
    </div>)}
    <small>Qloo reference influence · 0–1</small>
  </div>;
}
