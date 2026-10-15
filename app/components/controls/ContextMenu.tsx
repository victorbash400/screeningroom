import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import styles from "./ContextMenu.module.css";
export interface MenuEntry {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}
export default function ContextMenu({
  x,
  y,
  entries,
  onClose,
  className = "",
  label = "File actions",
}: {
  className?: string;
  label?: string;
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [portal] = useState(() =>
    document.activeElement?.closest("dialog[open]") ?? document.body,
  );
  const close = useRef(onClose);
  close.current = onClose;
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const rect = menu.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
        top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
      });
    menu.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) close.current();
    };
    const scroll = () => close.current();
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", scroll);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [x, y]);
  return createPortal(
    <div
      ref={menu}
      role="menu"
      aria-label={label}
      className={`${styles.menu} ${className}`}
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.stopPropagation();
          event.preventDefault();
          const buttons = Array.from(
            menu.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? [],
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          buttons[next]?.focus();
        }
      }}
    >
      {entries.map(({ label, icon: Icon, danger, disabled, action }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          disabled={disabled}
          className={danger ? styles.danger : undefined}
          onClick={() => {
            onClose();
            action();
          }}
        >
          {Icon && <Icon size={16} />}
          {label}
        </button>
      ))}
    </div>,
    portal,
  );
}
