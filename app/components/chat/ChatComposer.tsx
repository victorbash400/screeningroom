import { ArrowUp, Mic, Plus, Square } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FileNode, Workspace } from "../../lib/types";
import { selectedReferences } from "../../lib/chatSelection";
import IconButton from "../controls/IconButton";
import ReferencePicker from "./ReferencePicker";
import SelectedFiles from "./SelectedFiles";
import styles from "./ChatComposer.module.css";
import type { LocationInterest } from "../../lib/locationInterest";
import ComposerLocation from "./ComposerLocation";
import useVoiceDraft from "./useVoiceDraft";
import VoiceRecording from "./VoiceRecording";
import ErrorNotice from "../shell/ErrorNotice";
interface Props {
  embeddedPicker?: boolean;
  pickerRequest?: number;
  placeholder?: string;
  initialReferenceIds?: string[];
  onOpenReference?: (id: string) => void;
  area?: LocationInterest;
  onLocation?: () => void;
  busy: boolean;
  onStop: () => void;
  initialReferenceId?: string;
  referenceRequest: number;
  draft: string;
  nodes: FileNode[];
  workspaces: Workspace[];
  workspaceId: string;
  onDraft: (value: string) => boolean;
  onSend: (text: string, referenceIds?: string[]) => boolean;
}
export default function ChatComposer({
  embeddedPicker, pickerRequest, placeholder, initialReferenceIds, onOpenReference,
  area, onLocation,
  busy,
  onStop,
  draft,
  nodes,
  workspaces,
  workspaceId,
  onDraft,
  onSend,
  initialReferenceId,
  referenceRequest,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const text = draft;
  const voice = useVoiceDraft((transcript) => {
    const saved = onDraft(text ? `${text}${text.endsWith(" ") || text.endsWith("\n") ? "" : " "}${transcript}` : transcript);
    if (saved) queueMicrotask(() => input.current?.focus());
    return saved;
  });
  const dictating = voice.phase !== "idle";
  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    function resize() {
      if (!field) return;
      field.style.height = "auto";
      field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
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
  const [referenceIds, setReferenceIds] = useState<string[]>(initialReferenceId ? [initialReferenceId] : initialReferenceIds ?? []);
  useEffect(() => {
    if (initialReferenceId) setReferenceIds((previous) => [...new Set([...previous, initialReferenceId])]);
  }, [initialReferenceId, referenceRequest]);
  const [picking, setPicking] = useState(false);
  useEffect(() => { if (pickerRequest) setPicking(true); }, [pickerRequest]);
  useEffect(() => {
    if (!picking) queueMicrotask(() => input.current?.focus());
  }, [picking]);
  const references = selectedReferences(referenceIds, nodes);
  const canSend = Boolean(text.trim() || references.length);
  function send() {
    if (busy || dictating || !canSend || !onSend(text.trim(), references.map((node) => node.id))) return;
    if (input.current) input.current.style.height = "auto";
    input.current?.focus();
  }
  return (
    <>
      <div className={styles.shell}>
      <SelectedFiles workspaceName={workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? workspaceId} nodes={references} onOpen={onOpenReference} onRemove={(id) => {
        setReferenceIds(referenceIds.filter((value) => value !== id)); input.current?.focus();
      }} />
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
          <textarea
            ref={input}
            readOnly={dictating}
            autoFocus
            aria-label="Message"
            placeholder={placeholder ?? "Message"}
            rows={1}
            value={text}
            onChange={(event) => {
              const value = event.target.value;
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
        {voice.phase !== "idle" ? <VoiceRecording phase={voice.phase} analyser={voice.analyser} onStop={voice.stop} onCancel={voice.cancel} /> : <div className={styles.row}>
          <button type="button" className={styles.select} onClick={() => setPicking(true)} aria-haspopup="dialog">
            <Plus size={19} />Select
          </button>
          {area && onLocation && <ComposerLocation area={area} onClick={onLocation} />}
          {!busy && <IconButton className={styles.mic} label="Dictate message" onClick={() => void voice.start()}><Mic size={17} /></IconButton>}
          {busy ? <IconButton label="Stop response" onClick={onStop}><Square size={16} /></IconButton> : <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className={styles.send}
          >
            <ArrowUp size={16} />
          </button>}
        </div>}
      </form>
      </div>
      {voice.error && <ErrorNotice message={voice.error} onRetry={voice.retry} onDismiss={voice.dismissError} />}
      {picking && (
        <ReferencePicker
          embedded={embeddedPicker}
          workspaceId={workspaceId}
          workspaces={workspaces}
          selectedIds={references.map((node) => node.id)}
          nodes={nodes}
          onClose={() => {
            setPicking(false);
            input.current?.focus();
          }}
          onSelect={(ids) => {
            setReferenceIds(ids);
            setPicking(false);
            if (text.endsWith("@")) {
              const next = text.slice(0, -1);
              onDraft(next);
            }
            input.current?.focus();
          }}
        />
      )}
    </>
  );
}
