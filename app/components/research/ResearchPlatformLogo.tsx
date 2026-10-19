import { digitalPlatforms } from "../../lib/digitalPlatforms";
import type { ComparisonWidget } from "../../lib/researchWidget";
import EntityImage from "../media/EntityImage";
import styles from "./ResearchPlatformLogo.module.css";

export default function ResearchPlatformLogo({ subject }: { subject: ComparisonWidget["subjects"][number] }) {
  const name = subject.name.toLocaleLowerCase();
  const platform = digitalPlatforms.find((item) => item.name.toLocaleLowerCase() === name)
    ?? digitalPlatforms.find((item) => item.website === subject.website);
  return platform
    ? <img className={styles.logo} src={platform.logo} alt="" width={56} height={40} loading="lazy" decoding="async" />
    : <EntityImage className={styles.remote} src={subject.image} entityId={subject.id} label={subject.name} fit="contain" />;
}
