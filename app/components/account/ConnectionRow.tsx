import type { ConnectionState } from "../../lib/connections";
import SettingsRow from "../settings/SettingsRow";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import LoadingIndicator from "../controls/LoadingIndicator";
import styles from "./ConnectionRow.module.css";

export default function ConnectionRow({ label, state, onCheck }: { label: string; state: ConnectionState; onCheck: () => void }) {
  return <SettingsRow label={label}>
    <span className={styles.status} data-error={Boolean(state.error)} role="status" title={state.error}>
      {state.busy ? <LoadingIndicator size={12} label={`Checking ${label}`} /> : state.error ? "Unavailable" : state.status === "connected" ? "Connected" : state.status === "configured" ? "Configured" : "Unavailable"}
    </span>
    <SettingsInlineButton className={styles.check} disabled={state.busy} onClick={onCheck} aria-label={`Check ${label}`}>{state.error ? "Retry" : "Check"}</SettingsInlineButton>
  </SettingsRow>;
}
