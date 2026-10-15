import { Check, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import ContextMenu from "../controls/ContextMenu";
import styles from "./SettingsPicker.module.css";
export default function SettingsPicker({
  label,
  value,
  options,
  onChange,
  width = 180,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: number;
}) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const close = useCallback(() => setPosition(null), []);
  return (
    <>
      <button
        type="button"
        className={styles.button}
        style={{ width }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(position ? null : { x: rect.left, y: rect.bottom + 6 });
        }}
      >
        <span>{options.find((item) => item.value === value)?.label}</span>
        <ChevronDown size={14} />
      </button>
      {position && (
        <ContextMenu
          {...position}
          label={label}
          onClose={close}
          entries={options.map((item) => ({
            label: item.label,
            icon: item.value === value ? Check : undefined,
            action: () => onChange(item.value),
          }))}
        />
      )}
    </>
  );
}
