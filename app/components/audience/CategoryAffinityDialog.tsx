import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { DigitalCategory } from "../../lib/digitalPlatforms";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import IconButton from "../controls/IconButton";
import styles from "./CategoryAffinityDialog.module.css";

const inputs: Record<DigitalCategory, string> = {
  Video: "The agent uses the film, series or video's subject and style to find comparable titles or supported genre tags.",
  Music: "The agent uses the music's style, genre and comparable artists. An original song is represented through those references, not directly scored by Qloo.",
  Podcasts: "The agent uses the podcast's topics, format and comparable shows or supported taste tags.",
  Books: "The agent uses the book's subject, genre and comparable titles or supported taste tags.",
  Games: "The agent uses the game's genre, themes and comparable games or supported taste tags.",
  "Art & writing": "The agent uses the work's subject, style and supported cultural references. Coverage for individual platforms may be limited.",
};

export default function CategoryAffinityDialog({ category, onClose }: { category: DigitalCategory; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const backdrop = useDialogBackdrop(onClose);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }} {...backdrop}>
    <header><h2 id={title}>{category} affinity</h2><IconButton label="Close affinity explanation" onClick={onClose}><X /></IconButton></header>
    <p>{inputs[category]}</p>
    <p>Qloo estimates cultural relationships between those references and platform brands. Higher values mean a stronger relative relationship within the same query. The agent explains how that evidence relates to your work.</p>
    <p>The logos are examples, not ratings. Scores appear only after analysis and do not measure subscribers, guarantee that someone will like the work, or establish where it can be published. Missing coverage stays unscored.</p>
  </dialog>;
}
