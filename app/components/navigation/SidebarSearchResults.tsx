import type { LucideIcon } from "lucide-react";
import styles from "./SidebarSearchResults.module.css";

export interface SearchResult {
  id: string;
  name: string;
  context?: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export default function SidebarSearchResults({ id, results, onSelect }: {
  id: string;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <div id={id} className={styles.results} role="region" aria-label="Search results">
      {results.length === 0 ? <output className={styles.count}>0 results</output> : results.map((result) => (
        <button key={result.id} type="button" onClick={() => onSelect(result)}>
          <result.icon size={24} strokeWidth={1.8} />
          <span>{result.name}{result.context && <small>{result.context}</small>}</span>
        </button>
      ))}
    </div>
  );
}
