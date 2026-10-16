import styles from "./SignInIntro.module.css";

export default function SignInIntro({
  title,
  id,
  hidden = false,
}: {
  title: string;
  id?: string;
  hidden?: boolean;
}) {
  return (
    <div className={hidden ? styles.hidden : styles.intro}>
      <h1 id={id}>{title}</h1>
    </div>
  );
}
