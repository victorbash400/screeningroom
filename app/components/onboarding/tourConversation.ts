import type { Message } from "../../lib/types";
import { exampleFiles, exampleQuestion } from "./tourExample";

const createdAt = "2026-10-01T12:00:00Z";
const liveAnswer = "**Example screening plan**\n\n1. Start with the selected trailer and production brief.\n2. Use a comparable artist, such as Radiohead, to define the cultural context.\n3. Explore the London map and open a venue card. Check audience evidence and availability before shortlisting.\n\nThe venues and search matches here are walkthrough fixtures; no audience ranking has been calculated.";
const digitalAnswer = "**Example digital plan**\n\nFor this music documentary, compare video platforms such as YouTube with film platforms such as MUBI. Use the catalogue to see the available platforms.\n\nIn a real conversation, ask for platform affinity and inspect the supporting comparables. Affinity describes cultural overlap; it does not predict views, subscribers or ticket sales. This example has no platform scores.";

export function tourUserMessage(id: string, text: string, referenceIds: string[]): Message {
  return { id, role: "user", text, createdAt, references: exampleFiles.filter(file => referenceIds.includes(file.id)).map(file => ({ id: file.id, name: file.name, kind: file.kind, workspaceId: file.workspaceId })) };
}

export function tourAnswer(id: string, mode: "live" | "digital"): Message {
  const text = mode === "digital" ? digitalAnswer : liveAnswer;
  return { id, role: "assistant", text, createdAt, blocks: [
    { id: `${id}:search`, kind: "tool", tool: { id: `${id}:search`, name: "searchEntities", state: "done", trace: {
      input: { query: "Radiohead", type: "artist", take: 5 },
      matches: [{ id: "walkthrough:artist:radiohead", name: "Radiohead (example match)" }],
    } } },
    { id: `${id}:text`, kind: "text", text },
  ] };
}

export function tourMessages(mode: "live" | "digital"): Message[] {
  return [tourUserMessage("tour-question", mode === "digital" ? "Which online platforms should I explore for this music documentary?" : exampleQuestion, ["tour-trailer", "tour-brief"]), tourAnswer("tour-answer", mode)];
}
