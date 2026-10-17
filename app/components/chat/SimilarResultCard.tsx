import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { SimilarResult } from "../../lib/similarResults";
import styles from "./SimilarResults.module.css";

export default function SimilarResultCard({ item }: { item: SimilarResult }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <article className={styles.card}>
    {item.image && !imageFailed && <img src={item.image} alt={item.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />}
    <div className={styles.details}>
      <div className={styles.title}><strong>{item.name}</strong>{item.year !== undefined && <span>{item.year}</span>}</div>
      {item.description && <p>{item.description}</p>}
      {item.website && <a href={item.website} target="_blank" rel="noreferrer">Website<ExternalLink size={12} /></a>}
    </div>
  </article>;
}
