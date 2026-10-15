"use client";
import { AccountProvider } from "../../state/AccountContext";
import { AppearanceProvider } from "../../state/AppearanceContext";
import RoomSession from "./RoomSession";
export default function Screeningroom() {
  return (
    <AccountProvider>
      <AppearanceProvider>
        <RoomSession />
      </AppearanceProvider>
    </AccountProvider>
  );
}
