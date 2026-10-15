import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import ContextMenu from "../controls/ContextMenu";
import styles from "./PreviewOpenWith.module.css";

export default function PreviewOpenWith({
  source,
  image,
  onExport,
}: {
  source?: string;
  image: boolean;
  onExport?: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const close = useCallback(() => setMenu(null), []);
  return (
    <>
      <button
        className={styles.button}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setMenu(menu ? null : { x: rect.left, y: rect.bottom });
        }}
      >
        Open with
        <ChevronDown size={14} />
      </button>
      {menu && (
        <ContextMenu
          {...menu}
          label="Open with"
          onClose={close}
          entries={[
            ...(source
              ? [
                  {
                    label: "Browser",
                    action: () => {
                      if (!image) {
                        window.location.assign(source);
                        return;
                      }
                      const page =
                        document.implementation.createHTMLDocument("");
                      const img = page.createElement("img");
                      img.src = source;
                      img.style.maxWidth = "100%";
                      img.style.maxHeight = "100vh";
                      page.body.style.margin = "0";
                      page.body.append(img);
                      const url = URL.createObjectURL(
                        new Blob(
                          ["<!doctype html>", page.documentElement.outerHTML],
                          { type: "text/html" },
                        ),
                      );
                      window.location.assign(url);
                      setTimeout(() => URL.revokeObjectURL(url), 60_000);
                    },
                  },
                ]
              : []),
            ...(onExport ? [{ label: "Download", action: onExport }] : []),
          ]}
        />
      )}
    </>
  );
}
