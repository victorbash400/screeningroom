import type { TourStep } from "../../lib/productTour";
import type { ViewMode } from "../../lib/types";
import { exampleQuestion } from "./tourExample";
import { digitalQuestion, liveFollowup } from "./tourConversation";
export type TourScrollAnchor = "start" | "end" | "venues" | "platformResults" | "comparables" | "followup" | "searchDetails" | "venueDetails";
export interface TourScene {
  evidenceQueryOpen: boolean; mapSearched: boolean; venueListScroll: number; mapSearching: boolean; evidenceScroll: number; answerTime: number; followupTime: number; scrollFrom: TourScrollAnchor; scrollTo: TourScrollAnchor; scrollProgress: number; catalogueScroll: number; comparisonScroll: number; venueEvidenceOpen: boolean; evidenceTool: "search" | "venues" | "digital";
  workspaceExists: boolean; createOpen: boolean; workspaceName: string;
  workspaceOpen: boolean; uploaded: boolean; importOpen: boolean; importBusy: boolean; importItems: number;
  audienceOpen: boolean; pickerOpen: boolean; references: string[]; draft: string; sent: boolean;
  mapOpen: boolean; audienceMode: "live" | "digital"; radius: number; venue?: number;
  evidenceOpen: boolean; view: ViewMode; file?: string;
}
export type TourTarget = "create" | "workspaceName" | "confirmWorkspace" | "workspace" | "import" | "browse" | "select" | "trailer" | "briefCheckbox" | "done" | "message" | "send" | "map" | "radius" | "venue" | "digital" | "platforms" | "evidence" | "match" | "transcript" | "searchArea" | "nextVenue" | "venueEvidence" | "platformTable" | "catalogue" | "venueTool";
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
  question: { duration: 21000, initial: { workspaceOpen: true, audienceOpen: true }, cues: [
    cue(200, "select", "Choose the files for this conversation", { pickerOpen: true }),
    cue(1100, "trailer", "Select Trailer.mp4", { references: ["tour-trailer"] }),
    cue(1950, "briefCheckbox", "Add Production brief.txt", { references: ["tour-trailer", "tour-brief"] }),
    cue(2800, "done", "Confirm the selected files", { pickerOpen: false }),
    cue(3650, "message", "Describe the project, format and location", {}),
    cue(6500, "send", "Send the question with both files", { draft: "", sent: true }),
    cue(7600, "transcript", "Watch the reply stream from the selected project context", {}, false),
    cue(10100, "transcript", "Follow the reference lookups and London venue search", {}, false),
    cue(13000, "transcript", "Read the returned venue cards", {}, false),
    cue(16000, "transcript", "Scroll through the shortlist and next steps", {}, false),
  ] },
  live: { duration: 28500, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true, scrollFrom: "venues", scrollTo: "venues" }, cues: [
    cue(200, "map", "Open the London venue shortlist on the map", { mapOpen: true }),
    cue(1900, "radius", "Expand the search radius to 10 km", { radius: 10000 }),
    cue(3400, "searchArea", "Search the selected area", {}),
    cue(5200, "venue", "Focus Curzon Soho and inspect its card", { venue: 1 }),
    cue(7900, "nextVenue", "Move to the next venue in the carousel", { venue: 2 }),
    cue(10500, "map", "Return to the conversation and its venue results", { mapOpen: false }),
    cue(12000, "venueEvidence", "Expand Why this venue to inspect the sample contributions", { venueEvidenceOpen: true }),
    cue(14900, "message", "Ask a follow-up about the shortlist", {}),
    cue(17900, "send", "Send the comparison question", { draft: "" }),
    cue(19100, "transcript", "Watch the venue comparison stream", {}, false),
    cue(24500, "transcript", "Scroll through the practical screening checks", {}, false),
  ] },
  digital: { duration: 36500, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true, scrollFrom: "end", scrollTo: "end" }, cues: [
    cue(200, "digital", "Switch the same conversation from Live to Digital", { audienceMode: "digital" }),
    cue(1200, "message", "Ask for a platform comparison and supporting films", {}),
    cue(4000, "send", "Send the digital question with the project files", { draft: "" }),
    cue(5200, "transcript", "Follow the streamed reply and Digital audience tool", {}, false),
    cue(10300, "platformTable", "Compare the returned platform affinity values", {}, false),
    cue(13000, "platformTable", "Scroll across the comparison to MUBI", {}, false),
    cue(15700, "transcript", "Scroll down to the comparable films", {}, false),
    cue(19100, "transcript", "Read the release checks and limits of the evidence", {}, false),
    cue(22600, "platforms", "Open the platform catalogue", { mapOpen: true }),
    cue(24400, "catalogue", "Scroll through Video, Music and the other categories", {}, false),
    cue(33100, "platforms", "Return to the completed digital answer", { mapOpen: false }),
  ] },
  evidence: { duration: 14000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief"], sent: true, scrollFrom: "searchDetails", scrollTo: "searchDetails" }, cues: [
    cue(400, "evidence", "Expand Qloo search to see the exact query and sample match", { evidenceOpen: true }),
    cue(3200, "match", "Inspect the matched artist and its example identity", {}, false),
    cue(5800, "venueTool", "Expand Audience venues to inspect the search inputs", { evidenceTool: "venues" }),
    cue(8500, "transcript", "Scroll through the result evidence and search parameters", {}, false),
    cue(11600, "transcript", "Return to the answer with its source context", { evidenceOpen: false }, false),
  ] },
};
const initialScene: TourScene = { evidenceQueryOpen: false, mapSearched: false, venueListScroll: 0, mapSearching: false, evidenceScroll: 0, answerTime: 20000, followupTime: -1, scrollFrom: "start", scrollTo: "start", scrollProgress: 1, catalogueScroll: 0, comparisonScroll: 0, venueEvidenceOpen: false, evidenceTool: "search", workspaceExists: true, createOpen: false, workspaceName: "", workspaceOpen: false, uploaded: true, importOpen: false, importBusy: false, importItems: 0, audienceOpen: false, pickerOpen: false, references: [], draft: "", sent: false, mapOpen: false, audienceMode: "live", radius: 5000, evidenceOpen: false, view: "list" };
export function tourDraftAt(time: number) { return exampleQuestion.slice(0, Math.floor(Math.max(0, Math.min(1, (time - 4300) / 1900)) * exampleQuestion.length)); }
export function tourImportItemsAt(time: number) { return Math.min(3, Math.max(0, Math.floor((time - 5650) / 400) + 1)); }
export function tourNameAt(time: number) { return "Night Signals".slice(0, Math.floor(Math.max(0, Math.min(1, (time - 1300) / 600)) * "Night Signals".length)); }
export function tourSceneAt(step: TourStep, time: number): TourScene {
  const script = tourScripts[step], scene = { ...initialScene, ...script.initial };
  for (const cue of script.cues) if (time >= cue.commit) Object.assign(scene, cue.change);
  if (step === "question" && !scene.sent) scene.draft = tourDraftAt(time);
  if (step === "workspace") { scene.workspaceName = tourNameAt(time); scene.importItems = tourImportItemsAt(time); }
  if (step === "question" && scene.sent) {
    scene.answerTime = Math.min(8200, Math.max(0, time - 7150));
    scene.scrollFrom = "end";
    scene.scrollTo = time < 13000 ? "end" : "venues";
    scene.scrollProgress = progress(time, 13000, 900);
    if (time >= 16000) { scene.scrollFrom = "venues"; scene.scrollTo = "end"; scene.scrollProgress = progress(time, 16650, 3100); }
  }
  if (step === "live") {
    scene.mapSearched = time >= 5000;
    scene.venueListScroll = progress(time, 13900, 1000);
    scene.mapSearching = time >= 4050 && time < 5000;
    scene.draft = time < 18550 ? type(liveFollowup, time, 15550, 2100) : "";
    if (time >= 18550) scene.followupTime = Math.min(4750, time - 18550);
    if (time >= 18550) {
      scene.scrollFrom = scene.scrollTo = time < 24500 ? "end" : "followup";
      if (time >= 23400 && time < 24500) { scene.scrollFrom = "end"; scene.scrollTo = "followup"; scene.scrollProgress = progress(time, 23400, 1100); }
      if (time >= 24500) { scene.scrollTo = "end"; scene.scrollProgress = progress(time, 24500, 2600); }
    }
  }
  if (step === "digital") {
    scene.draft = time < 4650 ? type(digitalQuestion, time, 1850, 1900) : "";
    if (time >= 4650) scene.followupTime = Math.min(8200, time - 4650);
    scene.scrollFrom = "end"; scene.scrollTo = time < 10300 ? "end" : "platformResults"; scene.scrollProgress = progress(time, 10300, 900);
    if (time >= 15700) { scene.scrollFrom = "platformResults"; scene.scrollTo = "comparables"; scene.scrollProgress = progress(time, 15700, 2200); }
    if (time >= 19100) { scene.scrollFrom = "comparables"; scene.scrollTo = "end"; scene.scrollProgress = progress(time, 19100, 2400); }
    scene.comparisonScroll = progress(time, 13650, 1500);
    scene.catalogueScroll = progress(time, 25050, 7300);
  }
  if (step === "evidence") {
    scene.scrollFrom = scene.scrollTo = scene.evidenceTool === "search" ? "searchDetails" : "venueDetails";
    scene.evidenceQueryOpen = time >= 9150;
    scene.evidenceScroll = progress(time, 9150, 2200);
    if (time >= 12250) scene.scrollFrom = scene.scrollTo = "end";
  }
  return scene;
}
function progress(time: number, start: number, duration: number) { const value = Math.max(0, Math.min(1, (time - start) / duration)); return value * value * (3 - 2 * value); }
function type(text: string, time: number, start: number, duration: number) { return text.slice(0, Math.floor(progress(time, start, duration) * text.length)); }
export function tourCueAt(step: TourStep, time: number) { return tourScripts[step].cues.findLast(cue => time >= cue.at) ?? tourScripts[step].cues[0]; }
