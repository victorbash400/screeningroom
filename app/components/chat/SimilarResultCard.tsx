import EntityImage from "../media/EntityImage";
import { ExternalLink } from "lucide-react";
import type { SimilarResult } from "../../lib/similarResults";
import styles from "./SimilarResults.module.css";

export default function SimilarResultCard({ item }: { item: SimilarResult }) {
  return <article className={styles.card}>
    <EntityImage className={styles.photo} src={item.image} entityId={item.id} label={item.name} />
    <div className={styles.details}>
      <div className={styles.title}><strong>{item.name}</strong>{item.year !== undefined && <span>{item.year}</span>}</div>
      {item.description && <p>{item.description}</p>}
      {item.website && <a href={item.website} target="_blank" rel="noreferrer">Website<ExternalLink size={12} /></a>}
    </div>
  </article>;
}
