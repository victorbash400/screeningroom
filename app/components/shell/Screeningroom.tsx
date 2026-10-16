"use client";
import { AccountProvider } from "../../state/AccountContext";
import { AppearanceProvider } from "../../state/AppearanceContext";
import RoomSession from "./RoomSession";
import { ErrorNoticeProvider } from "../../state/ErrorNoticeContext";
export default function Screeningroom({ login = false }: { login?: boolean }) {
  return (
    <AccountProvider>
      <AppearanceProvider>
        <ErrorNoticeProvider>
          <RoomSession login={login} />
        </ErrorNoticeProvider>
      </AppearanceProvider>
    </AccountProvider>
  );
}
