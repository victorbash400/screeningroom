import { FolderClosed } from "lucide-react";
import type { FileNode, Message } from "../../lib/types";
import { fileIcon } from "../../lib/fileTypes";
import { messageReferences } from "../../lib/chatSelection";
import styles from "./MessageBubble.module.css";

export default function MessageReferences({ message, reference: legacy, onOpen }: { message: Message; reference?: FileNode; onOpen: (id: string) => void }) {
  return messageReferences({ ...message, referenceName: message.referenceName ?? legacy?.name, referenceKind: message.referenceKind ?? legacy?.kind }).map((reference) => {
    const Icon = reference.kind === "folder" ? FolderClosed : fileIcon(reference.name);
    return <button key={reference.id} className={styles.reference} onClick={() => onOpen(reference.id)}>
      <Icon size={18} />{reference.name}
    </button>;
  });
}
