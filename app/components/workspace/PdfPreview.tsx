import { useEffect, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import PdfPage from "./PdfPage";
import PdfToolbar from "./PdfToolbar";
import styles from "./PdfPreview.module.css";
export default function PdfPreview({ source }: { source: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    setDocument(null);
    setError(null);
    void import("pdfjs-dist")
      .then(async (pdf) => {
        if (!active) return;
        pdf.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        task = pdf.getDocument({ url: source });
        const doc = await task.promise;
        if (active) {
          setDocument(doc);
          setPage(1);
        }
      })
      .catch(() => {
        if (active) setError("Cannot open PDF. Use Open with or Download.");
      });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [source]);
  return (
    <div className={styles.preview} aria-busy={!document && !error}>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        document && (
          <>
            <PdfToolbar
              page={page}
              pages={document.numPages}
              zoom={zoom}
              onPage={setPage}
              onZoom={setZoom}
            />
            <PdfPage document={document} page={page} zoom={zoom} />
          </>
        )
      )}
    </div>
  );
}
