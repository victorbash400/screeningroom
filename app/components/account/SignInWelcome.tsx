import AppIcon from "../controls/AppIcon";
import { useAccount } from "../../state/AccountContext";
import AffinityWheels from "./AffinityWheels";
import styles from "./SignInWelcome.module.css";

export default function SignInWelcome({
  dismissed,
  onSignIn,
}: {
  dismissed: boolean;
  onSignIn: () => void;
}) {
  const account = useAccount();
  return (
    <section className={styles.welcome} data-dismissed={dismissed || undefined}>
      <AffinityWheels dismissed={dismissed} />
      <div className={styles.intro} inert={dismissed} aria-hidden={dismissed}>
        <div className={styles.brand}>
          <AppIcon />
          <span>Screeningroom</span>
        </div>
        <h1>
          Discover where your
          <br />
          work could resonate.
        </h1>
        <p>Cultural intelligence for media.</p>
        <button
          className={styles.signIn}
          disabled={account.busy}
          onClick={onSignIn}
        >
          Sign in
        </button>
        <button
          className={styles.demo}
          disabled={account.busy}
          onClick={async () => {
            if (!(await account.signInDemo())) onSignIn();
          }}
        >
          {account.busy ? "Signing in…" : "Sign in with demo"}
        </button>
      </div>
    </section>
  );
}
