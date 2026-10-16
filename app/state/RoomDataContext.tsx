import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import DropConfirmation, {
  type DropRequest,
} from "../components/workspace/DropConfirmation";
import { useRoomData } from "./useRoomData";
type RoomStore = ReturnType<typeof useRoomData> & {
  dragging: React.RefObject<string | null>;
  confirmDrop: (request: DropRequest) => void;
};
const RoomDataContext = createContext<RoomStore | null>(null);
export function RoomDataProvider({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  const room = useRoomData(scope);
  const dragging = useRef<string | null>(null);
  const [drop, setDrop] = useState<DropRequest | null>(null);
  function confirmDrop(request: DropRequest) {
    room.setError(null);
    setDrop(request);
  }
  return (
    <RoomDataContext value={{ ...room, dragging, confirmDrop }}>
      {children}
      {drop && (
        <DropConfirmation
          request={drop}
          error={room.error}
          onClose={() => setDrop(null)}
        />
      )}
    </RoomDataContext>
  );
}
export function useRoomStore() {
  const room = useContext(RoomDataContext);
  if (!room) throw new Error("Workspace data provider is missing.");
  return room;
}
