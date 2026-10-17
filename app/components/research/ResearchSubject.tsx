import { useState } from "react";
import type { ComparisonWidget } from "../../lib/researchWidget";
import styles from "./ResearchComparison.module.css";

export default function ResearchSubject({ subject }: { subject: ComparisonWidget["subjects"][number] }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.subject}>
    {subject.image && !failed && <img src={subject.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    <strong>{subject.name}</strong>{subject.year !== undefined && <small>{subject.year}</small>}
  </div>;
}
