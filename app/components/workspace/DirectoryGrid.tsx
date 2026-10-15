import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./DirectoryGrid.module.css";
export default function DirectoryGrid({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setColumns(Math.max(1, Math.ceil(entry.contentRect.width / 150))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={grid}
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
