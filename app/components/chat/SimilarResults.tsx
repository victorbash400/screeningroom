import type { SimilarResult } from "../../lib/similarResults";
import SimilarResultCard from "./SimilarResultCard";
import styles from "./SimilarResults.module.css";

export default function SimilarResults({ items }: { items: SimilarResult[] }) {
  if (!items.length) return null;
  return <div className={styles.results} aria-label="Similar recommendations">
    {items.map((item) => <SimilarResultCard key={item.id} item={item} />)}
  </div>;
}
