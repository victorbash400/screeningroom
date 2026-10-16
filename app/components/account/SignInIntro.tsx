import styles from "./SignInIntro.module.css";

export default function SignInIntro({ title, id }: { title: string; id?: string }) {
  return (
    <div className={styles.intro}>
      <h1 id={id}>{title}</h1>
    </div>
  );
}
