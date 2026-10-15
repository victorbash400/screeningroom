import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import IconButton from "../controls/IconButton";
import styles from "./PdfToolbar.module.css";
export default function PdfToolbar({
  page,
  pages,
  zoom,
  onPage,
  onZoom,
}: {
  page: number;
  pages: number;
  zoom: number;
  onPage: (page: number) => void;
  onZoom: (zoom: number) => void;
}) {
  return (
    <div className={styles.toolbar} aria-label="PDF controls">
      <IconButton
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
      </IconButton>
      <span>
        {page} / {pages}
      </span>
      <IconButton
        label="Next page"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight />
      </IconButton>
      <div className={styles.space} />
      <IconButton
        label="Zoom out"
        disabled={zoom <= 0.5}
        onClick={() => onZoom(Math.max(0.5, zoom - 0.25))}
      >
        <Minus />
      </IconButton>
      <span>{Math.round(zoom * 100)}%</span>
      <IconButton
        label="Zoom in"
        disabled={zoom >= 3}
        onClick={() => onZoom(Math.min(3, zoom + 0.25))}
      >
        <Plus />
      </IconButton>
    </div>
  );
}
