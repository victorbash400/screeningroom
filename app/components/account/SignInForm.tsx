import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import SignInIntro from "./SignInIntro";
import { demoAccount } from "../../lib/demoAccount";
import AppIcon from "../controls/AppIcon";
import type { AuthStep } from "../../lib/accountTypes";
import { useAccount } from "../../state/AccountContext";
import AccountField from "./AccountField";
import AccountSubmitButton from "./AccountSubmitButton";
import EmailVerificationForm from "./EmailVerificationForm";
import styles from "./SignInForm.module.css";
const labels = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  confirm: "Verify email",
  reset: "Reset password",
  "reset-confirm": "Set password",
};
export default function SignInForm({
  titleId,
  active,
  required,
  onReturn,
}: {
  titleId: string;
  active: boolean;
  required: boolean;
  onReturn: () => void;
}) {
  const account = useAccount();
  const surface = useRef<HTMLDivElement>(null);
  const [fillingDemo, setFillingDemo] = useState(false);
  const busy = account.busy || fillingDemo;
  async function fillDemo() {
    setFillingDemo(true);
    account.setError(null);
    try {
      const credentials = await demoAccount();
      setFields((current) => ({ ...current, ...credentials }));
    } catch (error) {
      account.setError(
        error instanceof Error
          ? error.message
          : "Cannot fill demo credentials.",
      );
    } finally {
      setFillingDemo(false);
    }
  }
  const [step, setStep] = useState<AuthStep>("sign-in");
  const [fields, setFields] = useState({
    email: "",
    password: "",
    name: "",
    code: "",
  });
  useEffect(() => {
    if (active)
      surface.current
        ?.querySelector<HTMLInputElement>("input:not(:disabled)")
        ?.focus({ preventScroll: true });
  }, [active, step]);
  function changeStep(next: AuthStep) {
    account.setError(null);
    setStep(next);
    setFields({ ...fields, password: "", code: "" });
  }
  const needsPassword =
    step === "sign-in" || step === "sign-up" || step === "reset-confirm";
  const needsCode = step === "confirm" || step === "reset-confirm";
  const ready =
    fields.email.trim().length > 0 &&
    (!needsPassword || fields.password.length > 0) &&
    (!needsCode || fields.code.trim().length > 0) &&
    (step !== "sign-up" || fields.name.trim().length > 0);
  return (
    <div
      ref={surface}
      className={styles.surface}
      inert={!active}
      aria-hidden={!active}
    >
      <header>
        <AppIcon />
        <span>Screeningroom</span>
      </header>
      <SignInIntro
        title={labels[step]}
        id={titleId}
        hidden={step === "sign-in"}
      />
      {step === "confirm" ? (
        <EmailVerificationForm
          email={fields.email}
          busy={busy}
          error={account.error}
          onVerify={async (code) => {
            const next = await account.authenticate("confirm", {
              ...fields,
              email: fields.email.trim(),
              code,
            });
            if (next && next !== "done") changeStep(next);
          }}
          onResend={() => account.resend(fields.email.trim())}
          onChangeEmail={() => changeStep("sign-up")}
        />
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!ready || busy) return;
            const next = await account.authenticate(step, {
              ...fields,
              email: fields.email.trim(),
              name: fields.name.trim(),
            });
            if (next === "done") account.open(null);
            else if (next) changeStep(next);
          }}
        >
          {step === "sign-up" && (
            <AccountField
              rounded
              label="Name"
              autoComplete="name"
              required
              value={fields.name}
              disabled={busy}
              onChange={(event) =>
                setFields({ ...fields, name: event.target.value })
              }
            />
          )}
          <AccountField
            rounded
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={fields.email}
            disabled={busy || needsCode}
            onChange={(event) =>
              setFields({ ...fields, email: event.target.value })
            }
          />
          {needsCode && (
            <AccountField
              rounded
              label="Verification code"
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              value={fields.code}
              disabled={busy}
              onChange={(event) =>
                setFields({ ...fields, code: event.target.value })
              }
            />
          )}
          {needsPassword && (
            <AccountField
              rounded
              label={step === "reset-confirm" ? "New password" : "Password"}
              type="password"
              autoComplete={
                step === "sign-in" ? "current-password" : "new-password"
              }
              minLength={step === "sign-in" ? undefined : 12}
              required
              value={fields.password}
              disabled={busy}
              onChange={(event) =>
                setFields({ ...fields, password: event.target.value })
              }
            />
          )}
          {step === "sign-in" && (
            <div className={styles.links}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void fillDemo()}
              >
                {fillingDemo ? "Filling…" : "Sign in with demo"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStep("sign-up")}
              >
                Create account
              </button>
            </div>
          )}
          {account.error && (
            <ErrorNotice
              message={account.error}
              onDismiss={() => account.setError(null)}
            />
          )}
          <AccountSubmitButton
            label={labels[step]}
            ready={ready}
            busy={busy}
            light
            roomy
          />
          {step === "sign-in" && (
            <button
              type="button"
              className={styles.recovery}
              disabled={busy}
              onClick={() => changeStep("reset")}
            >
              Forgot password
            </button>
          )}
          {(!required || step !== "sign-in") && (
            <button
              className={styles.back}
              type="button"
              disabled={busy}
              onClick={() =>
                step === "sign-in" ? account.open(null) : changeStep("sign-in")
              }
            >
              Back
            </button>
          )}
        </form>
      )}
      {required && step === "sign-in" && (
        <button
          type="button"
          className={styles.back}
          disabled={busy}
          onClick={onReturn}
        >
          Back
        </button>
      )}
    </div>
  );
}
