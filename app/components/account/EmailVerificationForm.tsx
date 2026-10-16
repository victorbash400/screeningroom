import ErrorNotice from "../shell/ErrorNotice";
import { useState } from "react";
import VerificationCodeInput from "./VerificationCodeInput";
import AccountSubmitButton from "./AccountSubmitButton";
import styles from "./EmailVerificationForm.module.css";

export default function EmailVerificationForm({
  email,
  busy,
  error,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  email: string;
  busy: boolean;
  error: string | null;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<boolean>;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [revision, setRevision] = useState(0);
  const [sent, setSent] = useState(false);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && code.length === 6) void onVerify(code);
      }}
    >
      <div className={styles.identity}>
        <span>Email verification code</span>
        <span>{email}</span>
      </div>
      <VerificationCodeInput
        key={revision}
        disabled={busy}
        onChange={(value) => {
          setCode(value);
          setSent(false);
        }}
      />
      {error && (
        <ErrorNotice message={error} />
      )}
      <AccountSubmitButton
        label="Verify"
        ready={code.length === 6}
        busy={busy}
        light
      />
      <div className={styles.actions}>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setSent(false);
            if (await onResend()) {
              setCode("");
              setRevision((value) => value + 1);
              setSent(true);
            }
          }}
        >
          Resend code
        </button>
        <button type="button" disabled={busy} onClick={onChangeEmail}>
          Change email
        </button>
      </div>
      {sent && (
        <span className={styles.status} role="status">
          Code sent
        </span>
      )}
    </form>
  );
}
