import { Ellipsis, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import IconButton from "./IconButton";
import ContextMenu, { type MenuEntry } from "./ContextMenu";
interface Props {
  label: string;
  onRename: () => void;
  onDelete: () => void;
  onCreate?: () => void;
}
export default function ActionMenu({
  label,
  onRename,
  onDelete,
  onCreate,
}: Props) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const close = useCallback(() => setPosition(null), []);
  const entries: MenuEntry[] = [
    { label: "Rename…", icon: Pencil, action: onRename },
    ...(onCreate
      ? [{ label: "New folder…", icon: FolderPlus, action: onCreate }]
      : []),
    { label: "Delete…", icon: Trash2, action: onDelete, danger: true },
  ];
  return (
    <>
      <IconButton
        label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(position ? null : { x: rect.left, y: rect.bottom });
        }}
      >
        <Ellipsis />
      </IconButton>
      {position && (
        <ContextMenu {...position} entries={entries} onClose={close} />
      )}
    </>
  );
}
