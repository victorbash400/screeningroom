import type { z } from "zod";
import type { digitalAudienceSchema } from "../../lib/researchWidget";
import ResearchComparison from "../research/ResearchComparison";
import styles from "./DigitalAudienceResult.module.css";

export default function DigitalAudienceResult({ widget }: { widget: z.infer<typeof digitalAudienceSchema> }) {
  return <section aria-label={widget.title} className={styles.result}>
    {widget.platforms && <ResearchComparison widget={widget.platforms} />}
    {widget.comparables && <ResearchComparison widget={widget.comparables} />}
    {widget.errors.map((error) => <p role="alert" className={styles.error} key={error.section}>{error.section}: {error.message}</p>)}
  </section>;
}
