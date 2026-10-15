import { useState } from "react";
import styles from "./ImagePreview.module.css";
export default function ImagePreview({
  source,
  name,
}: {
  source: string;
  name: string;
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
      onError={() => setError(true)}
    />
  );
}
