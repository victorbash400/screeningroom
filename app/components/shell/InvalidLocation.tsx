import { Plus } from "lucide-react";
import PillButton from "../controls/PillButton";
import styles from "./InvalidLocation.module.css";
export default function InvalidLocation({ onCreate }: { onCreate: () => void }) {
  return <main className={styles.surface} aria-label="Workspaces">
    <PillButton onClick={onCreate}><Plus />Create workspace</PillButton>
  </main>;
}
