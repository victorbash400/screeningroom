import { ArrowUp, Link } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FileNode } from "../../lib/types";
import IconButton from "../controls/IconButton";
import ReferencePicker from "./ReferencePicker";
import ReferenceChip from "./ReferenceChip";
import styles from "./ChatComposer.module.css";
interface Props {
  initialReferenceId?: string;
  referenceRequest: number;
  draft: string;
  nodes: FileNode[];
  workspaceName: string;
  onDraft: (value: string) => boolean;
  onSend: (text: string, referenceId?: string) => boolean;
}
export default function ChatComposer({
  draft,
  nodes,
  workspaceName,
  onDraft,
  onSend,
  initialReferenceId,
  referenceRequest,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(draft);
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    function resize() {
      if (!field) return;
      field.style.height = "auto";
      const style = getComputedStyle(field);
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      field.style.height = `${Math.min(field.scrollHeight - padding, 78)}px`;
    }
    resize();
    let width = field.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      resize();
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [text]);
  const [referenceId, setReferenceId] = useState<string | undefined>(
    initialReferenceId,
  );
  useEffect(() => {
    setReferenceId(initialReferenceId);
  }, [initialReferenceId, referenceRequest]);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (!picking) input.current?.focus();
  }, [picking]);
  const reference = nodes.find((node) => node.id === referenceId);
  const canSend = Boolean(text.trim() || reference);
  function send() {
    if (!canSend || !onSend(text.trim(), reference?.id)) return;
    setText("");
    setReferenceId(undefined);
    if (input.current) input.current.style.height = "auto";
    input.current?.focus();
  }
  return (
    <>
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        {reference && (
          <ReferenceChip
            node={reference}
            onRemove={() => setReferenceId(undefined)}
          />
        )}
        <div className={styles.row}>
          <IconButton
            label="Mention file or folder"
            onClick={() => setPicking(true)}
          >
            <Link />
          </IconButton>
          <textarea
            ref={input}
            autoFocus
            aria-label="Message"
            placeholder="Message"
            rows={1}
            maxLength={4000}
            value={text}
            onChange={(event) => {
              const value = event.target.value;
              setText(value);
              onDraft(value);
              if (
                value.endsWith("@") &&
                (value.length === 1 || !value.at(-2)?.trim())
              )
                setPicking(true);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className={styles.send}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
      {picking && (
        <ReferencePicker
          workspaceName={workspaceName}
          nodes={nodes}
          onClose={() => {
            setPicking(false);
            input.current?.focus();
          }}
          onSelect={(node) => {
            setReferenceId(node.id);
            setPicking(false);
            if (text.endsWith("@")) {
              const next = text.slice(0, -1);
              setText(next);
              onDraft(next);
            }
            input.current?.focus();
          }}
        />
      )}
    </>
  );
}
