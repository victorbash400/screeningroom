import { useEffect, useId, useRef, useState } from "react";
import { useAccount } from "../../state/AccountContext";
import SignInWelcome from "./SignInWelcome";
import SignInForm from "./SignInForm";
import styles from "./SignInDialog.module.css";

export default function SignInDialog({
  required = false,
}: {
  required?: boolean;
}) {
  const account = useAccount();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [formOpen, setFormOpen] = useState(!required || Boolean(account.error));
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={formOpen ? undefined : "Screeningroom"}
      aria-labelledby={formOpen ? titleId : undefined}
      onKeyDownCapture={(event) => {
        if (required && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClose={() => {
        if (required && dialog.current?.isConnected && !dialog.current.open)
          dialog.current.showModal();
      }}
      onCancel={(event) => {
        if (required || account.busy) event.preventDefault();
        else account.open(null);
      }}
    >
      <SignInWelcome dismissed={formOpen} onSignIn={() => setFormOpen(true)} />
      <div className={styles.position} data-open={formOpen || undefined}>
        <SignInForm
          titleId={titleId}
          active={formOpen}
          required={required}
          onReturn={() => {
            account.setError(null);
            setFormOpen(false);
          }}
        />
      </div>
    </dialog>
  );
}
