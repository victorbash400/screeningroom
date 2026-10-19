import { useEffect, useRef, useState } from "react";
import { ImageOff, LoaderCircle, RotateCw } from "lucide-react";
import { loadEntityImage } from "../../lib/entityImage";
import type { EntityImageProps } from "./EntityImage";
import styles from "./EntityImage.module.css";

export default function ResolvedEntityImage({ src, entityId, label, className = "", fit = "cover", priority = false }: EntityImageProps) {
  const frame = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  const [source, setSource] = useState(src);
  const [state, setState] = useState<"waiting" | "loading" | "ready" | "missing" | "failed">(src ? "loading" : "waiting");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (src || !entityId || !frame.current) return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setState("loading");
      void loadEntityImage(entityId).then((value) => {
        if (!active) return;
        setSource(value.image ?? undefined);
        setState(value.image ? "loading" : "missing");
      }, (error) => {
        if (!active) return;
        setError(error instanceof Error ? error.message : "Photo lookup failed.");
        setState("failed");
      });
    }, { rootMargin: "100px" });
    observer.observe(frame.current);
    return () => { active = false; observer.disconnect(); };
  }, [src, entityId]);
  useEffect(() => {
    const image = frame.current?.querySelector("img");
    if (image?.complete && image.naturalWidth > 0) setState("ready");
  }, [source, attempt]);
  async function retry() {
    setError(""); setState("loading");
    if (entityId) {
      setSource(undefined);
      try {
        const value = await loadEntityImage(entityId, true);
        if (!mounted.current) return;
        setSource(value.image ?? undefined);
        setState(value.image ? "loading" : "missing");
      } catch (error) {
        if (!mounted.current) return;
        setError(error instanceof Error ? error.message : "Photo lookup failed."); setState("failed");
        return;
      }
    }
    if (mounted.current) setAttempt((value) => value + 1);
  }
  return <span ref={frame} className={`${styles.frame} ${className}`} data-state={state} data-fit={fit}>
    {source && state !== "failed" && <img key={attempt} src={source} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" referrerPolicy="no-referrer"
      onLoad={() => setState("ready")} onError={() => { setError(`Photo of ${label} could not load.`); setState("failed"); }} />}
    {(state === "waiting" || state === "loading") && <LoaderCircle className={styles.loading} size={16} aria-label={`Loading photo of ${label}`} />}
    {(state === "failed" || state === "missing") && <button type="button" className={styles.retry} title={state === "missing" ? `No photo available for ${label}. Check again.` : error}
      aria-label={state === "missing" ? `Check photo for ${label}` : `Retry photo of ${label}`} onClick={(event) => { event.stopPropagation(); void retry(); }}>
      {state === "missing" ? <ImageOff size={17} /> : <RotateCw size={17} />}
    </button>}
  </span>;
}
