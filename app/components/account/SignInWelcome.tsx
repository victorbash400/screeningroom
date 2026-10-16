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
        <h1>Screeningroom</h1>
        <p>Find the right audience for what you create.</p>
        <button
          className={styles.signIn}
          disabled={account.busy}
          onClick={onSignIn}
        >
          Sign in
        </button>
      </div>
    </section>
  );
}
