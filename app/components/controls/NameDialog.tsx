import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import AccountField from "../account/AccountField";
import PillButton from "./PillButton";
import styles from "./NameDialog.module.css";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
interface Props {
  error?: string | null;
  label: string;
  action: string;
  initial?: string;
  onSubmit: (name: string) => boolean;
  onClose: () => void;
}
export default function NameDialog({
  label,
  action,
  initial = "",
  onSubmit,
  onClose,
  error,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(typeof document !== "undefined" ? document.activeElement : null);
  const backdrop = useDialogBackdrop(onClose);
  const [name, setName] = useState(initial);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      queueMicrotask(() => {
        const previous = previousFocus.current;
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={label}
      onCancel={onClose}
      {...backdrop}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && onSubmit(name.trim())) onClose();
        }}
      >
        <AccountField
          label={label}
          autoFocus
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          onFocus={(event) => event.target.select()}
        />
        {error && (
          <ErrorNotice message={error} />
        )}
        <div className={styles.actions}>
          <PillButton secondary onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" disabled={!name.trim()}>
            {action}
          </PillButton>
        </div>
      </form>
    </dialog>
  );
}
