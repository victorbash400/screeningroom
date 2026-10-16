import { useEffect, useRef } from "react";
import { Info, X } from "lucide-react";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import IconButton from "../controls/IconButton";
import styles from "./InfoDialog.module.css";

export default function InfoDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdrop = useDialogBackdrop(onClose);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-label="Info" onCancel={onClose} {...backdrop}>
      <header className={styles.header}>
        <Info size={20} />
        <span>Info</span>
        <IconButton label="Close info" onClick={onClose}><X /></IconButton>
      </header>
    </dialog>
  );
}
