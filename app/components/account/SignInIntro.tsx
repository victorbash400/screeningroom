import styles from "./SignInIntro.module.css";

export default function SignInIntro({
  title,
  explain,
}: {
  title: string;
  explain: boolean;
}) {
  return (
    <div className={styles.intro}>
      <h1>{title}</h1>
      {explain && <p>Keep projects, files, and conversations together.</p>}
    </div>
  );
}
