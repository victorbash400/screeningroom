import styles from "./DirectoryHeader.module.css";
export default function DirectoryHeader() {
  return (
    <div className={styles.header}>
      <span>Name</span>
      <span className={styles.date}>Date modified</span>
      <span className={styles.size}>Size</span>
      <span className={styles.kind}>Kind</span>
    </div>
  );
}
