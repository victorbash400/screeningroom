import { useRef, useState } from "react";
import { GitBranch } from "lucide-react";
import { useRoomStore } from "../../state/RoomDataContext";
import { syncLabels } from "../../lib/roomSyncStatus";
import IconButton from "../controls/IconButton";
import SyncDialog from "./SyncDialog";

export default function SyncButton() {
  const room = useRoomStore();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return <>
    <IconButton label="Sync status" title={`Sync: ${syncLabels[room.syncStatus.state]}`}
      aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { trigger.current = event.currentTarget; setOpen(true); }}>
      <GitBranch size={21} strokeWidth={1.8} />
    </IconButton>
    {open && <SyncDialog returnFocus={trigger.current} onClose={() => setOpen(false)} />}
  </>;
}
