import PillButton from "../controls/PillButton";
import styles from "./InvalidLocation.module.css";
export default function InvalidLocation({ onHome }: { onHome: () => void }) {
  return (
    <main className={styles.surface}>
      <span role="alert">Workspace or folder not found.</span>
      <PillButton secondary onClick={onHome}>
        Home
      </PillButton>
    </main>
  );
}
