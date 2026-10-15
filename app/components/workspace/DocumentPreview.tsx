import styles from "./DocumentPreview.module.css";

export default function DocumentPreview({
  source,
  name,
  youtube,
}: {
  source: string;
  name: string;
  youtube: boolean;
}) {
  return (
    <iframe
      className={`${styles.frame} ${youtube ? styles.video : ""}`}
      title={name}
      src={source}
      referrerPolicy="strict-origin-when-cross-origin"
      allow={
        youtube
          ? "autoplay; encrypted-media; picture-in-picture; fullscreen"
          : undefined
      }
      allowFullScreen={youtube}
    />
  );
}
