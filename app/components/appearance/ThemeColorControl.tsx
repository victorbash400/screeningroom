import { Check } from "lucide-react";
import { useState } from "react";
import { parseColor } from "../../lib/appearance";
import styles from "./ThemeColorControl.module.css";
export default function ThemeColorControl({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState(color.toUpperCase());
  const [error, setError] = useState<string | null>(null);
  function apply() {
    try {
      onChange(parseColor(input));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Invalid color.");
    }
  }
  return (
    <div className={styles.control}>
      <div className={styles.field}>
        <span style={{ background: color }} />
        <input
          aria-label={label}
          value={input}
          spellCheck={false}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
        {input !== color.toUpperCase() && (
          <button aria-label={`Apply ${label.toLowerCase()}`} onClick={apply}>
            <Check size={14} />
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
