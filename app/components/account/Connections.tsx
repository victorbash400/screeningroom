import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useState } from "react";
import { useAccount } from "../../state/AccountContext";
import { ApiError, object } from "../../lib/accountApi";
import SettingsGroup from "../settings/SettingsGroup";
import SettingsRow from "../settings/SettingsRow";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./Connections.module.css";
interface Health {
  database: "connected" | "unavailable";
  storage: "connected" | "unavailable";
  auth: "configured" | "unavailable";
  bedrock: "configured" | "unavailable";
  qloo: "configured" | "unavailable";
}
function parseHealth(value: unknown): Health {
  const data = object(value),
    services = object(data.services);
  if (
    !(data.status === "ok" || data.status === "degraded") ||
    !["connected", "unavailable"].includes(String(services.database)) ||
    !["connected", "unavailable"].includes(String(services.storage)) ||
    !["configured", "unavailable"].includes(String(services.auth)) ||
    !["configured", "unavailable"].includes(String(services.bedrock)) ||
    !["configured", "unavailable"].includes(String(services.qloo))
  )
    throw new Error("Server returned invalid connection status.");
  return services as unknown as Health;
}
export default function Connections() {
  const account = useAccount();
  const { request, user } = account;
  const [health, setHealth] = useState<Health>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError(null);
    try {
      let value: unknown;
      try {
        value = await request("/api/health");
      } catch (failure) {
        if (
          !(failure instanceof ApiError) ||
          failure.status !== 503 ||
          !failure.data ||
          object(failure.data).status !== "degraded"
        )
          throw failure;
        value = failure.data;
      }
      setHealth(parseHealth(value));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Cannot check connections.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [request, user?.id]);
  if (!user)
    return (
      <SettingsInlineButton onClick={() => account.open("auth")}>
        Sign in
      </SettingsInlineButton>
    );
  return (
    <SettingsGroup>
      {health &&
        (
          [
            { key: "auth", label: "Authentication" },
            { key: "database", label: "Database" },
            { key: "storage", label: "Storage" },
            { key: "bedrock", label: "Bedrock" },
            { key: "qloo", label: "Qloo API" },
          ] as const
        ).map(({ key, label }) => (
          <SettingsRow label={label} key={key}>
            <span
              className={
                health[key] === "unavailable" ? styles.error : undefined
              }
            >
              {health[key] === "connected"
                ? "Connected"
                : health[key] === "configured"
                  ? "Configured"
                  : "Unavailable"}
            </span>
          </SettingsRow>
        ))}
      {error && (
        <ErrorNotice message={error} onRetry={() => void load()} onDismiss={() => setError(null)} />
      )}
      <div className={styles.actions}>
        <SettingsInlineButton
          disabled={busy}
          onClick={() => {
            void load();
          }}
        >
          Check connections
        </SettingsInlineButton>
      </div>
    </SettingsGroup>
  );
}
