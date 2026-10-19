import { z } from "zod";

export const tourStatusSchema = z.object({ demo: z.boolean(), seen: z.boolean() }).strict();
export type TourStatus = z.infer<typeof tourStatusSchema>;
export const tourSteps = [
  { id: "workspace", chapter: "Workspace", title: "Create a workspace. Bring in your media.", instruction: "Create and name a production, then import a trailer, brief and poster.", action: "Watch setup" },
  { id: "question", chapter: "Ask", title: "Select your files. Ask your question.", instruction: "Choose the trailer and brief, then describe the project and where you want to reach an audience.", action: "Watch a question" },
  { id: "live", chapter: "Live", title: "Find a live audience", instruction: "Set the location and radius, then explore a venue from the shortlist.", action: "Watch Live" },
  { id: "digital", chapter: "Digital", title: "Explore digital platforms", instruction: "Switch to Digital and explore platforms. Affinity is a cultural signal, not a prediction of views.", action: "Watch Digital" },
  { id: "evidence", chapter: "Evidence", title: "Check what supports the answer", instruction: "Expand a tool call to inspect its inputs and a labeled example match.", action: "Watch the evidence" },
] as const;
export type TourStep = typeof tourSteps[number]["id"];
export function shouldOpenTour(status: TourStatus, empty: boolean) { return status.demo || empty && !status.seen; }
