import ResearchPlatformLogo from "./ResearchPlatformLogo";
import EntityImage from "../media/EntityImage";
import type { ComparisonWidget } from "../../lib/researchWidget";
import styles from "./ResearchComparison.module.css";

export default function ResearchSubject({ subject, platform = false }: { subject: ComparisonWidget["subjects"][number]; platform?: boolean }) {
  return <div className={styles.subject}>
    {platform ? <ResearchPlatformLogo subject={subject} /> : <EntityImage className={styles.photo} src={subject.image} entityId={subject.id} label={subject.name} />}
    <strong>{subject.website ? <a href={subject.website} target="_blank" rel="noopener noreferrer">{subject.name}</a> : subject.name}</strong>{subject.year !== undefined && <small>{subject.year}</small>}
    {subject.links?.map((link) => <small key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></small>)}
  </div>;
}
