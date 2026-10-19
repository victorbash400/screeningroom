import { z } from "zod";

export const tourStatusSchema = z.object({ demo: z.boolean(), seen: z.boolean() }).strict();
export type TourStatus = z.infer<typeof tourStatusSchema>;
export const tourSteps = [
  { id: "workspace", title: "Start with a workspace", instruction: "Open Night Signals. Try the file views or open the production brief; Home returns to your workspaces.", action: "Open the workspace" },
  { id: "import", title: "Bring your media", instruction: "Open Import, then try sample files or enter a video link. These examples stay inside the walkthrough.", action: "Open Import" },
  { id: "select", title: "Choose the context", instruction: "Click Select, choose the trailer and brief, then Done. The chips above the message show what you’ll send.", action: "Select media" },
  { id: "question", title: "Tell it what you’re making", instruction: "Send the prepared question or edit it. Include your format, audience and location; try New chat or reopen a conversation from Chats.", action: "Try a question" },
  { id: "live", title: "Find a live audience", instruction: "Search London, adjust the radius and open a venue card. Toggle Map to return to the conversation.", action: "Explore the map" },
  { id: "digital", title: "Explore digital audiences", instruction: "Browse the platform catalogue or switch back to Live. Ask about cultural affinity; it does not predict views or ticket sales.", action: "Switch to Digital" },
  { id: "evidence", title: "Look behind the answer", instruction: "Expand Qloo search to compare its inputs with the example match. In real conversations, inspect evidence before acting on a recommendation.", action: "Expand the tool call" },
] as const;
export type TourStep = typeof tourSteps[number]["id"];
export function shouldOpenTour(status: TourStatus, empty: boolean) { return status.demo || empty && !status.seen; }
