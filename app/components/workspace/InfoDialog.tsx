import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import { tourSteps } from "../../lib/productTour";
import AppIcon from "../controls/AppIcon";
import IconButton from "../controls/IconButton";
import TourPlayer from "../onboarding/TourPlayer";
import TourWelcome from "../onboarding/TourWelcome";
import TourChapterArrows from "../onboarding/TourChapterArrows";
import TourNavigation from "../onboarding/TourNavigation";
import styles from "./InfoDialog.module.css";

export default function InfoDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState(0);
  const step = index === 0 ? null : tourSteps[index - 1];
  const backdrop = useDialogBackdrop(onClose);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [index]);
  return <dialog ref={dialog} className={styles.dialog} aria-label="Screening Room walkthrough" aria-describedby="walkthrough-instruction" onCancel={event => { event.preventDefault(); onClose(); }} {...backdrop}>
    <header className={styles.header}><AppIcon size={20} /><span>Walkthrough</span><span className={styles.step}>{index + 1} / {tourSteps.length + 1}</span><IconButton label="Close walkthrough" onClick={onClose}><X /></IconButton></header>
    {step ? <><section className={styles.heading} aria-live="polite"><h2 ref={title} tabIndex={-1}>{step.title}</h2><p id="walkthrough-instruction">{step.instruction}</p></section>
    <TourPlayer key={step.id} step={step.id} /></> : <TourWelcome titleRef={title} onStart={() => setIndex(1)} />}
    {step && <TourChapterArrows index={index - 1} count={tourSteps.length} onStep={next => setIndex(next + 1)} onClose={onClose} />}
    <TourNavigation index={index} onStep={setIndex} />
  </dialog>;
}
