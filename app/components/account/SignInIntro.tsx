import styles from "./SignInIntro.module.css";

export default function SignInIntro({ title }: { title: string }) {
  return (
    <div className={styles.intro}>
      <h1>{title}</h1>
    </div>
  );
}
