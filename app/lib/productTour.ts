import { z } from "zod";

export const tourStatusSchema = z.object({ demo: z.boolean(), seen: z.boolean() }).strict();
export type TourStatus = z.infer<typeof tourStatusSchema>;
export const tourSteps = [
  { id: "workspace", title: "Start with a workspace", instruction: "Open the example workspace. Keep a production’s files and audience conversations together.", action: "Open the workspace" },
  { id: "import", title: "Bring your media", instruction: "Open Import to try sample files or a video link. In your workspace, use your own media, script or brief.", action: "Open Import" },
  { id: "select", title: "Choose the context", instruction: "Click Select, choose the files the agent should use, then Done. You can change this selection as you work.", action: "Select media" },
  { id: "question", title: "Tell it what you’re making", instruction: "Try the example question or write your own. The agent uses the selected media and asks when it needs more context.", action: "Try a question" },
  { id: "live", title: "Find a live audience", instruction: "Search the example London map, adjust the radius and click a venue to focus the map. Live is for screenings and in-person presentations.", action: "Explore the map" },
  { id: "digital", title: "Explore digital audiences", instruction: "Switch to Digital for online platforms. Ask which audiences fit your work; platform affinity is a cultural signal, not viewer analytics.", action: "Switch to Digital" },
  { id: "evidence", title: "Look behind the answer", instruction: "Expand a tool call to inspect its inputs and returned evidence. Reopen this walkthrough from Info whenever you need it.", action: "Expand the tool call" },
] as const;
export type TourStep = typeof tourSteps[number]["id"];
export function shouldOpenTour(status: TourStatus, empty: boolean) { return status.demo || empty && !status.seen; }
