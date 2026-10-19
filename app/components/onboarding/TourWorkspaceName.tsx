import AccountField from "../account/AccountField";
import PillButton from "../controls/PillButton";
import modal from "../controls/NameDialog.module.css";
import styles from "./TourWorkspaceName.module.css";
export default function TourWorkspaceName({ name }: { name: string }) {
  return <div className={styles.backdrop}><section className={`${modal.dialog} ${styles.panel}`} role="dialog" aria-label="Create workspace">
    <AccountField label="Workspace name" value={name} readOnly />
    <div className={modal.actions}><PillButton secondary>Cancel</PillButton><PillButton aria-label="Create workspace" disabled={!name}>Create workspace</PillButton></div>
  </section></div>;
}
