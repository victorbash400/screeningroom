import { tourSteps } from "../../lib/productTour";
import styles from "./TourNavigation.module.css";
export default function TourNavigation({ index, onStep }: { index: number; onStep: (index: number) => void }) {
  return <nav className={styles.chapters} aria-label="Walkthrough chapters">{tourSteps.map((step, position) => <button type="button" key={step.id} aria-label={`${position + 1}. ${step.title}`} aria-current={index === position ? "step" : undefined} onClick={() => onStep(position)}>{step.chapter}</button>)}</nav>;
}
