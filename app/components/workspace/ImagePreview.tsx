import { useState } from "react";
import styles from "./ImagePreview.module.css";
export default function ImagePreview({
  source,
  name,
  onAspectRatio,
}: {
  source: string;
  name: string;
  onAspectRatio?: (ratio: number) => void;
}) {
  const [error, setError] = useState(false);
  return error ? (
    <p className={styles.error} role="alert">
      Cannot display this image.
    </p>
  ) : (
    <img
      className={styles.image}
      src={source}
      alt={name}
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth && image.naturalHeight)
          onAspectRatio?.(image.naturalWidth / image.naturalHeight);
      }}
      onError={() => setError(true)}
    />
  );
}
