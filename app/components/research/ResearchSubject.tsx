import EntityImage from "../media/EntityImage";
import type { ComparisonWidget } from "../../lib/researchWidget";
import styles from "./ResearchComparison.module.css";

export default function ResearchSubject({ subject }: { subject: ComparisonWidget["subjects"][number] }) {
  return <div className={styles.subject}>
    <EntityImage className={styles.photo} src={subject.image} entityId={subject.id} label={subject.name} />
    <strong>{subject.website ? <a href={subject.website} target="_blank" rel="noopener noreferrer">{subject.name}</a> : subject.name}</strong>{subject.year !== undefined && <small>{subject.year}</small>}
  </div>;
}
