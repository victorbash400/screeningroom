import { useAccount } from "../../state/AccountContext";
import { settingsNavigation } from "../../lib/settingsNavigation";
import styles from "./SettingsSidebar.module.css";
import sidebarStyles from "../navigation/Sidebar.module.css";

export default function SettingsSidebar({ onSelect }: { onSelect?: () => void }) {
  const account = useAccount();
  return (
    <nav className={styles.navigation} aria-label="Settings navigation">
      {settingsNavigation.map(({ id, label, icon: Icon }) => (
        <button
          className={sidebarStyles.home}
          key={id}
          aria-current={account.surface === id ? "page" : undefined}
          onClick={() => { account.open(id); onSelect?.(); }}
        >
          <Icon size={24} strokeWidth={1.8} />
          {label}
        </button>
      ))}
    </nav>
  );
}
