import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import { tourSteps } from "../../lib/productTour";
import AppIcon from "../controls/AppIcon";
import IconButton from "../controls/IconButton";
import TourPreview from "../onboarding/TourPreview";
import TourViewport from "../onboarding/TourViewport";
import TourNavigation from "../onboarding/TourNavigation";
import styles from "./InfoDialog.module.css";

export default function InfoDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState(0);
  const step = tourSteps[index];
  const backdrop = useDialogBackdrop(onClose);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [index]);
  return <dialog ref={dialog} className={styles.dialog} aria-label="Screening Room walkthrough" aria-describedby="walkthrough-instruction" onCancel={event => { event.preventDefault(); onClose(); }} {...backdrop}>
    <header className={styles.header}><AppIcon size={21} /><span>Walkthrough</span><span className={styles.example}>Interactive example</span><IconButton label="Close walkthrough" onClick={onClose}><X /></IconButton></header>
    <TourViewport><TourPreview key={step.id} step={step.id} onRestart={() => setIndex(0)} /></TourViewport>
    <section className={styles.caption} aria-live="polite"><h2 ref={title} tabIndex={-1}>{step.title}</h2><p id="walkthrough-instruction">{step.instruction}</p></section>
    <TourNavigation index={index} onStep={setIndex} onClose={onClose} />
  </dialog>;
}
