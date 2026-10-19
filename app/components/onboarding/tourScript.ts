import type { TourStep } from "../../lib/productTour";
import type { ViewMode } from "../../lib/types";
import { exampleQuestion } from "./tourExample";
export interface TourScene {
  workspaceExists: boolean; createOpen: boolean; workspaceName: string;
  workspaceOpen: boolean; uploaded: boolean; importOpen: boolean; importBusy: boolean; importItems: number;
  audienceOpen: boolean; pickerOpen: boolean; references: string[]; draft: string; sent: boolean;
  mapOpen: boolean; audienceMode: "live" | "digital"; radius: number; venue?: number;
  evidenceOpen: boolean; view: ViewMode; file?: string;
}
export type TourTarget = "create" | "workspaceName" | "confirmWorkspace" | "workspace" | "import" | "browse" | "select" | "trailer" | "briefCheckbox" | "done" | "message" | "send" | "map" | "radius" | "venue" | "digital" | "platforms" | "evidence" | "match";
export interface TourCue { at: number; commit: number; target: TourTarget; label: string; change: Partial<TourScene>; click: boolean }
interface TourScript { duration: number; initial: Partial<TourScene>; cues: TourCue[] }
const cue = (at: number, target: TourTarget, label: string, change: Partial<TourScene>, click = true): TourCue => ({ at, commit: at + 650, target, label, change, click });
export const tourScripts: Record<TourStep, TourScript> = {
  workspace: { duration: 8000, initial: { workspaceExists: false, uploaded: false }, cues: [
    cue(200, "create", "Create a workspace", { createOpen: true }),
    cue(1000, "workspaceName", "Name the production Night Signals", {}),
    cue(2000, "confirmWorkspace", "Save the new workspace", { createOpen: false, workspaceExists: true }),
    cue(3000, "workspace", "Open the workspace", { workspaceOpen: true }),
    cue(4000, "import", "Open Import", { importOpen: true }),
    cue(5000, "browse", "Choose the trailer, brief and poster", { importBusy: true }),
    cue(6200, "browse", "Import the selected files into Night Signals", { importOpen: false, importBusy: false, uploaded: true }, false),
  ] },
  question: { duration: 9000, initial: { workspaceOpen: true, audienceOpen: true }, cues: [
    cue(200, "select", "Choose the files for this conversation", { pickerOpen: true }),
    cue(1100, "trailer", "Select Trailer.mp4", { references: ["tour-trailer"] }),
    cue(1950, "briefCheckbox", "Add Production brief.txt", { references: ["tour-trailer", "tour-brief"] }),
    cue(2800, "done", "Confirm the selected files", { pickerOpen: false }),
    cue(3650, "message", "Describe the project, format and location", {}),
    cue(6500, "send", "Send the question with both files", { draft: "", sent: true }),
  ] },
  live: { duration: 6000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true }, cues: [
    cue(200, "map", "Open the London audience map", { mapOpen: true }),
    cue(1200, "radius", "Set the search radius to 10 km", { radius: 10000 }),
    cue(2400, "venue", "Focus Curzon Soho from the shortlist", { venue: 1 }),
    cue(4000, "map", "Return to the conversation", { mapOpen: false }),
  ] },
  digital: { duration: 5000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true }, cues: [
    cue(200, "digital", "Switch from Live to Digital", { audienceMode: "digital" }),
    cue(1200, "platforms", "Browse the platform catalogue", { mapOpen: true }),
    cue(3300, "platforms", "Return to the digital conversation", { mapOpen: false }),
  ] },
  evidence: { duration: 4500, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true }, cues: [
    cue(400, "evidence", "Expand Qloo search", { evidenceOpen: true }),
    cue(2200, "match", "Compare the inputs with the labeled example match", {}, false),
  ] },
};
const initialScene: TourScene = { workspaceExists: true, createOpen: false, workspaceName: "", workspaceOpen: false, uploaded: true, importOpen: false, importBusy: false, importItems: 0, audienceOpen: false, pickerOpen: false, references: [], draft: "", sent: false, mapOpen: false, audienceMode: "live", radius: 5000, evidenceOpen: false, view: "list" };
export function tourDraftAt(time: number) { return exampleQuestion.slice(0, Math.floor(Math.max(0, Math.min(1, (time - 4300) / 1900)) * exampleQuestion.length)); }
export function tourImportItemsAt(time: number) { return Math.min(3, Math.max(0, Math.floor((time - 5650) / 400) + 1)); }
export function tourNameAt(time: number) { return "Night Signals".slice(0, Math.floor(Math.max(0, Math.min(1, (time - 1300) / 600)) * "Night Signals".length)); }
export function tourSceneAt(step: TourStep, time: number): TourScene {
  const script = tourScripts[step], scene = { ...initialScene, ...script.initial };
  for (const cue of script.cues) if (time >= cue.commit) Object.assign(scene, cue.change);
  if (step === "question" && !scene.sent) scene.draft = tourDraftAt(time);
  if (step === "workspace") { scene.workspaceName = tourNameAt(time); scene.importItems = tourImportItemsAt(time); }
  return scene;
}
export function tourCueAt(step: TourStep, time: number) { return tourScripts[step].cues.findLast(cue => time >= cue.at) ?? tourScripts[step].cues[0]; }
