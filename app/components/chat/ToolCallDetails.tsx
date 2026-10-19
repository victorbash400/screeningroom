import ReferenceInfluence from "../research/ReferenceInfluence";
import VenueEvidence from "../locations/VenueEvidence";
import type { MessageTool } from "../../lib/types";
import { toolInputRows } from "../../lib/toolTrace";
import styles from "./ToolCallDetails.module.css";

export default function ToolCallDetails({ tool, label }: { tool: MessageTool; label: string }) {
  const rows = tool.trace ? toolInputRows(tool.trace.input) : [];
  const research = tool.research;
  const results = research?.kind === "digital" ? [research.platforms, research.comparables].filter((value) => value !== undefined) : research ? [research] : [];
  return <div className={styles.scroll} role="region" aria-label={`${label} details`}>
      {rows.length > 0 && <dl className={styles.inputs}>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
      {tool.trace?.matches && <section><h3>Matches ({tool.trace.matches.length})</h3><ul>{tool.trace.matches.map((match) => <li key={match.id}>{match.name}<small>{match.id}</small></li>)}</ul></section>}
      {results.map((result) => <section key={result.evidenceId}><h3>{result.title}</h3>
        {result.kind === "comparison" && <ul>{result.subjects.map((subject) => <li key={subject.id}>{subject.website ? <a href={subject.website} target="_blank" rel="noreferrer">{subject.name}</a> : subject.name}
          {subject.metrics.map((metric) => <small key={metric.key}>{metric.label}: {metric.value} · {metric.source}</small>)}
          {subject.contributors?.length ? <ReferenceInfluence references={subject.contributors} /> : null}
        </li>)}</ul>}
        {result.kind === "comparison" && result.searches?.map((search, index) => <details key={index}><summary>{search.endpoint} · {search.resultCount} results{search.cached ? " · cached" : ""}</summary><dl className={styles.inputs}>{Object.entries(search.parameters).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></details>)}
        <p>{result.basis}</p>
      </section>)}
      {research?.kind === "digital" && <p>{research.basis}</p>}
      {tool.widget?.kind === "venues" && tool.widget.venues.map((venue) => <section key={venue.id ?? venue.name}><h3>{venue.name}</h3><VenueEvidence place={venue} /></section>)}
      {tool.widget?.kind === "venues" && tool.widget.searches?.map((search, index) => <details key={index}><summary>{search.endpoint} · {search.resultCount} results</summary><dl className={styles.inputs}>{Object.entries(search.parameters).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></details>)}
      {tool.widget && <p>{tool.widget.source}{"area" in tool.widget ? ` · ${tool.widget.area.name}` : ""}{tool.widget.kind === "heatmap" ? ` · ${tool.widget.cells.length} areas` : tool.widget.kind === "venues" ? ` · ${tool.widget.venues.length} venues` : ""}</p>}
      {tool.error && <p role="alert" className={styles.error}>{tool.error}</p>}
  </div>;
}
