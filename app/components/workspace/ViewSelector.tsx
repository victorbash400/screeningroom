import { Columns3, LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "../../lib/types";
import IconButton from "../controls/IconButton";
import styles from "./WorkspaceToolbar.module.css";
const modes = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: List },
  { value: "columns", label: "Column view", icon: Columns3 },
] as const;
export default function ViewSelector({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className={styles.group} role="group" aria-label="View">
      {modes.map(({ value: mode, label, icon: Icon }) => (
        <IconButton
          key={mode}
          label={label}
          selected={value === mode}
          onClick={() => onChange(mode)}
        >
          <Icon />
        </IconButton>
      ))}
    </div>
  );
}
