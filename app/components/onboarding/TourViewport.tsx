import { useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import styles from "./TourViewport.module.css";

export default function TourViewport({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 620, scale: 1 });
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    function measure() {
      const width = element!.clientWidth, height = element!.clientHeight;
      if (!width || !height) return;
      const virtualWidth = width < 600 ? width : 1280;
      const scale = width / virtualWidth;
      setSize({ width: virtualWidth, height: height / scale, scale });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={frame} className={styles.viewport}><div className={styles.canvas} style={{ width: size.width, height: size.height, "--tour-scale": size.scale } as CSSProperties}>{children}</div></div>;
}
