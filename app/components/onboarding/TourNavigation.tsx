import { ArrowLeft, ArrowRight } from "lucide-react";
import { tourSteps } from "../../lib/productTour";
import PillButton from "../controls/PillButton";
import styles from "./TourNavigation.module.css";

export default function TourNavigation({ index, onStep, onClose }: { index: number; onStep: (index: number) => void; onClose: () => void }) {
  return <footer className={styles.footer}>
    <button type="button" className={styles.dismiss} onClick={onClose}>Dismiss</button>
    <nav className={styles.progress} aria-label="Walkthrough steps">{tourSteps.map((step, position) => <button type="button" key={step.id} aria-label={`${position + 1}. ${step.title}`} aria-current={index === position ? "step" : undefined} onClick={() => onStep(position)} />)}</nav>
    <div className={styles.buttons}><span>{index + 1} / {tourSteps.length}</span><PillButton secondary disabled={index === 0} onClick={() => onStep(index - 1)}><ArrowLeft size={14} />Back</PillButton><PillButton onClick={() => index === tourSteps.length - 1 ? onClose() : onStep(index + 1)}>{index === tourSteps.length - 1 ? "Finish" : "Next"}<ArrowRight size={14} /></PillButton></div>
  </footer>;
}
