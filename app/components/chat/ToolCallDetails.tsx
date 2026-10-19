import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { MessageTool } from "../../lib/types";
import { toolInputRows } from "../../lib/toolTrace";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import IconButton from "../controls/IconButton";
import styles from "./ToolCallDetails.module.css";

export default function ToolCallDetails({ tool, label, onClose }: { tool: MessageTool; label: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const backdrop = useDialogBackdrop(onClose);
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  const rows = tool.trace ? toolInputRows(tool.trace.input) : [];
  const research = tool.research;
  const results = research?.kind === "digital" ? [research.platforms, research.comparables].filter((value) => value !== undefined) : research ? [research] : [];
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }} {...backdrop}>
    <header><h2 id={title}>{label}</h2><IconButton label="Close search details" onClick={onClose}><X /></IconButton></header>
    <div className={styles.scroll}>
      {rows.length > 0 && <dl className={styles.inputs}>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
      {tool.trace?.matches && <section><h3>Matches ({tool.trace.matches.length})</h3><ul>{tool.trace.matches.map((match) => <li key={match.id}>{match.name}<small>{match.id}</small></li>)}</ul></section>}
      {results.map((result) => <section key={result.evidenceId}><h3>{result.title}</h3>
        {result.kind === "comparison" && <ul>{result.subjects.map((subject) => <li key={subject.id}>{subject.website ? <a href={subject.website} target="_blank" rel="noreferrer">{subject.name}</a> : subject.name}
          {subject.metrics.map((metric) => <small key={metric.key}>{metric.label}: {metric.value} · {metric.source}</small>)}
          {subject.contributors?.map((item) => <small key={item.id}>Reference {item.id} · contribution {item.score}</small>)}
        </li>)}</ul>}
        {result.kind === "comparison" && result.searches?.map((search, index) => <details key={index}><summary>{search.endpoint} · {search.resultCount} results{search.cached ? " · cached" : ""}</summary><dl className={styles.inputs}>{Object.entries(search.parameters).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></details>)}
        <p>{result.basis}</p>
      </section>)}
      {research?.kind === "digital" && <p>{research.basis}</p>}
      {tool.widget && <p>{tool.widget.source}{"area" in tool.widget ? ` · ${tool.widget.area.name}` : ""}{tool.widget.kind === "heatmap" ? ` · ${tool.widget.cells.length} areas` : tool.widget.kind === "venues" ? ` · ${tool.widget.venues.length} venues` : ""}</p>}
      {tool.error && <p role="alert" className={styles.error}>{tool.error}</p>}
    </div>
  </dialog>;
}
