import { useEffect, useRef, useState } from "react";
import AppIcon from "../controls/AppIcon";
import type { AuthStep } from "../../lib/accountTypes";
import { useAccount } from "../../state/AccountContext";
import AccountField from "./AccountField";
import AccountSubmitButton from "./AccountSubmitButton";
import EmailVerificationForm from "./EmailVerificationForm";
import styles from "./SignInDialog.module.css";
const labels = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  confirm: "Verify email",
  reset: "Reset password",
  "reset-confirm": "Set password",
};
export default function SignInDialog() {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<AuthStep>("sign-in");
  const [fields, setFields] = useState({
    email: "",
    password: "",
    name: "",
    code: "",
  });
  const light = step === "confirm";
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  useEffect(() => {
    dialog.current
      ?.querySelector<HTMLInputElement>("input:not(:disabled)")
      ?.focus();
  }, [step]);
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
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={labels[step]}
      onCancel={(event) => {
        if (account.busy) event.preventDefault();
        else account.open(null);
      }}
    >
      <div className={styles.position}>
        <div className={`${styles.surface} ${light ? styles.light : ""}`}>
          <header>
            <AppIcon />
            <span>Screeningroom</span>
          </header>
          {step === "confirm" ? (
            <EmailVerificationForm
              email={fields.email}
              busy={account.busy}
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
                if (!ready || account.busy) return;
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
                  onDark
                  label="Name"
                  autoComplete="name"
                  required
                  value={fields.name}
                  disabled={account.busy}
                  onChange={(event) =>
                    setFields({ ...fields, name: event.target.value })
                  }
                />
              )}
              <AccountField
                onDark={!light}
                label="Email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={fields.email}
                disabled={account.busy || needsCode}
                onChange={(event) =>
                  setFields({ ...fields, email: event.target.value })
                }
              />
              {needsCode && (
                <AccountField
                  onDark={!light}
                  label="Verification code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  value={fields.code}
                  disabled={account.busy}
                  onChange={(event) =>
                    setFields({ ...fields, code: event.target.value })
                  }
                />
              )}
              {needsPassword && (
                <AccountField
                  onDark
                  label={step === "reset-confirm" ? "New password" : "Password"}
                  type="password"
                  autoComplete={
                    step === "sign-in" ? "current-password" : "new-password"
                  }
                  minLength={step === "sign-in" ? undefined : 12}
                  required
                  value={fields.password}
                  disabled={account.busy}
                  onChange={(event) =>
                    setFields({ ...fields, password: event.target.value })
                  }
                />
              )}
              {step === "sign-in" && (
                <div className={styles.links}>
                  <button
                    type="button"
                    disabled={account.busy}
                    onClick={() => changeStep("sign-up")}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    disabled={account.busy}
                    onClick={() => changeStep("reset")}
                  >
                    Forgot password
                  </button>
                </div>
              )}
              {account.error && (
                <p role="alert" className={styles.error}>
                  {account.error}
                </p>
              )}
              <AccountSubmitButton
                label={labels[step]}
                ready={ready}
                busy={account.busy}
                light={light}
              />
              <button
                className={styles.back}
                type="button"
                disabled={account.busy}
                onClick={() =>
                  step === "sign-in"
                    ? account.open(null)
                    : changeStep("sign-in")
                }
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}
