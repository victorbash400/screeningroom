import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import styles from "./PdfPage.module.css";
export default function PdfPage({
  document,
  page,
  zoom,
}: {
  document: PDFDocumentProxy;
  page: number;
  zoom: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (region.current) observer.observe(region.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!width) return;
    let active = true;
    let task: RenderTask | undefined;
    setError(null);
    void document
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(1.5, Math.max(1, window.devicePixelRatio));
        const viewport = pdfPage.getViewport({
          scale: (Math.max(100, width - 32) / base.width) * zoom,
        });
        canvas.current.width = Math.floor(viewport.width * scale);
        canvas.current.height = Math.floor(viewport.height * scale);
        canvas.current.style.width = `${viewport.width}px`;
        canvas.current.style.height = `${viewport.height}px`;
        task = pdfPage.render({
          canvas: canvas.current,
          viewport,
          transform: [scale, 0, 0, scale, 0, 0],
        });
        await task.promise;
        const content = await pdfPage.getTextContent();
        if (active)
          setDescription(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
      })
      .catch((failure) => {
        if (active && failure?.name !== "RenderingCancelledException")
          setError("Cannot render PDF page.");
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [document, page, zoom, width]);
  return (
    <div ref={region} className={styles.page}>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Page ${page}: ${description}`}
        />
      )}
    </div>
  );
}
