import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./TourChapterArrows.module.css";

export default function TourChapterArrows({ index, count, onStep, onClose }: { index: number; count: number; onStep: (index: number) => void; onClose: () => void }) {
  return <>
    <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label={index === 0 ? "Back to welcome" : "Previous chapter"} onClick={() => onStep(index - 1)}><ChevronLeft size={46} strokeWidth={1.5} /></button>
    <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label={index === count - 1 ? "Finish walkthrough" : "Next chapter"} onClick={() => index === count - 1 ? onClose() : onStep(index + 1)}><ChevronRight size={46} strokeWidth={1.5} /></button>
  </>;
}
