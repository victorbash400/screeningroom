import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { venueTypes, type VenueType } from "../../lib/venueTypes";
import glass from "../workspace/PreviewGlass.module.css";
import styles from "./VenueFilters.module.css";

export default function VenueFilters({ selected, onChange }: { selected: VenueType[]; onChange: (value: VenueType[]) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div className={styles.filters} ref={root} onKeyDown={(event) => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); button.current?.focus(); }
  }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><SlidersHorizontal size={16} />Filters{selected.length > 0 && <span>{selected.length}</span>}</button>
    {open && <div id={id} className={`${styles.menu} ${glass.surface}`} role="group" aria-label="Venue filters">
      <button type="button" aria-pressed={!selected.length} onClick={() => onChange([])}>All venues</button>
      {venueTypes.map((item) => <button type="button" key={item.id} aria-pressed={selected.includes(item.id)} onClick={() => onChange(selected.includes(item.id) ? selected.filter((value) => value !== item.id) : [...selected, item.id])}>{item.label}</button>)}
    </div>}
  </div>;
}
