import { createContext, useContext, useRef } from "react";
import type { ReactNode } from "react";
import { useRoomData } from "./useRoomData";
type RoomStore = ReturnType<typeof useRoomData> & {
  dragging: React.RefObject<string | null>;
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
  return (
    <RoomDataContext value={{ ...room, dragging }}>{children}</RoomDataContext>
  );
}
export function useRoomStore() {
  const room = useContext(RoomDataContext);
  if (!room) throw new Error("Workspace data provider is missing.");
  return room;
}
