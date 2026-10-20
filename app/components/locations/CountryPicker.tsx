import { useId, useRef, useState, type RefObject } from "react";
import { Search } from "lucide-react";
import { countries, type Country } from "../../lib/countries";
import styles from "./LocationSearch.module.css";

export default function CountryPicker({ selected, onSelect, preview, inputRef }: { selected?: string; onSelect: (country: Country) => void; preview?: { open: boolean; query: string }; inputRef?: RefObject<HTMLInputElement | null> }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const shownQuery = preview?.query ?? query;
  const expanded = preview?.open ?? open;
  const matches = countries.filter((country) => country.name.toLocaleLowerCase().includes(shownQuery.trim().toLocaleLowerCase()) || country.code.toLocaleLowerCase() === shownQuery.trim().toLocaleLowerCase());
  return <div className={styles.search} ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); root.current?.querySelector("input")?.focus(); } }}>
    <form onSubmit={(event) => { event.preventDefault(); if (matches.length === 1) { onSelect(matches[0]); setQuery(""); setOpen(false); } }}>
      <Search size={18} strokeWidth={1.8} aria-hidden="true" />
      <input ref={inputRef} aria-label="Search countries" aria-expanded={expanded} aria-controls={id} placeholder={countries.find((country) => country.code === selected)?.name ?? "Choose country"} value={shownQuery} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} />
    </form>
    {expanded && <div className={styles.results} id={id} role="group" aria-label="Countries">
      {matches.map((country) => <button type="button" key={country.code} aria-pressed={country.code === selected} onClick={() => { onSelect(country); setQuery(""); setOpen(false); root.current?.querySelector("input")?.focus(); setOpen(false); }}>{country.name}</button>)}
      {!matches.length && <p role="alert">Country not found.</p>}
    </div>}
  </div>;
}
