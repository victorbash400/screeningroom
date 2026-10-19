import type { Ref } from "react";
import { ArrowRight } from "lucide-react";
import AppIcon from "../controls/AppIcon";
import PillButton from "../controls/PillButton";
import styles from "./TourWelcome.module.css";

export default function TourWelcome({ titleRef, onStart }: { titleRef: Ref<HTMLHeadingElement>; onStart: () => void }) {
  return <section className={styles.welcome}>
    <AppIcon size={64} />
    <h2 ref={titleRef} tabIndex={-1}>Welcome to Screening Room</h2>
    <p id="walkthrough-instruction">Bring in your project. Find its audience.</p>
    <p className={styles.detail}>Follow a sample project from importing media to exploring venues, platforms and the evidence behind each answer.</p>
    <PillButton onClick={onStart}>Start walkthrough<ArrowRight size={16} /></PillButton>
    <span className={styles.duration}>5 demos · 33 seconds</span>
  </section>;
}
