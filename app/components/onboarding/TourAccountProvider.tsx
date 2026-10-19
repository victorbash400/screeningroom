import { useState, type ReactNode } from "react";
import { AccountContext, useAccount } from "../../state/AccountContext";
import { createTourRequests } from "./tourRequests";

export default function TourAccountProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const [example] = useState(createTourRequests);
  return <AccountContext value={{ ...account, ...example, user: account.user ? { ...account.user, id: "tour-preview" } : null, open: () => {} }}>{children}</AccountContext>;
}
