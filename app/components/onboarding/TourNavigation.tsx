import { tourSteps } from "../../lib/productTour";
import styles from "./TourNavigation.module.css";

const chapters = [{ id: "welcome", title: "Welcome", chapter: "Welcome" }, ...tourSteps];

export default function TourNavigation({ index, onStep }: { index: number; onStep: (index: number) => void }) {
  return <nav className={styles.chapters} aria-label="Walkthrough chapters">
    <ol>{chapters.map((step, position) => <li key={step.id} data-reached={position <= index}>
      <button type="button" aria-label={`${position + 1}. ${step.title}`} aria-current={index === position ? "step" : undefined} onClick={() => onStep(position)}>
        <span className={styles.number} aria-hidden="true">{position + 1}</span><span className={styles.label}>{step.chapter}</span>
      </button>
    </li>)}</ol>
  </nav>;
}
