import { useAccount } from "../../state/AccountContext";
import { useConnections } from "../../state/useConnections";
import { connectionServices } from "../../lib/connections";
import SettingsGroup from "../settings/SettingsGroup";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import ConnectionRow from "./ConnectionRow";
import ErrorNotice from "../shell/ErrorNotice";

export default function Connections() {
  const account = useAccount();
  const { states, check, error, clearError } = useConnections();
  if (!account.user) return <SettingsInlineButton onClick={() => account.open("auth")}>Sign in</SettingsInlineButton>;
  return <>
  <SettingsGroup>
    {connectionServices.map(({ id, label }) => <ConnectionRow key={id} label={label} state={states[id]} onCheck={() => void check(id)} />)}
  </SettingsGroup>
  {error && <ErrorNotice message={error} onDismiss={clearError} />}
  </>;
}
