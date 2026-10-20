import type { TourStep } from "../../lib/productTour";
import type { ViewMode } from "../../lib/types";
import { exampleQuestion } from "./tourExample";
import { digitalQuestion, liveFollowup } from "./tourConversation";
export type TourScrollAnchor = "start" | "end" | "media" | "mediaTranscript" | "image" | "venues" | "platformResults" | "comparables" | "followup" | "searchDetails" | "venueDetails";
export interface TourScene {
  mediaFramesOpen: boolean; mediaTranscriptOpen: boolean; evidenceQueryOpen: boolean; mapSearched: boolean; venueListScroll: number; mapSearching: boolean; evidenceScroll: number; answerTime: number; followupTime: number; scrollFrom: TourScrollAnchor; scrollTo: TourScrollAnchor; scrollProgress: number; catalogueScroll: number; comparisonScroll: number; comparableScroll: number; venueEvidenceOpen: boolean; evidenceTool: "search" | "venues" | "digital";
  workspaceExists: boolean; createOpen: boolean; workspaceName: string;
  workspaceOpen: boolean; uploaded: boolean; importOpen: boolean; importBusy: boolean; importItems: number;
  audienceOpen: boolean; pickerOpen: boolean; references: string[]; draft: string; sent: boolean;
  countryCode?: string; countryPickerOpen: boolean; countryQuery: string;
  mapOpen: boolean; audienceMode: "live" | "digital"; radius: number; venue?: number;
  evidenceOpen: boolean; view: ViewMode; file?: string;
}
export type TourTarget = "create" | "workspaceName" | "confirmWorkspace" | "workspace" | "import" | "browse" | "select" | "trailer" | "briefCheckbox" | "posterCheckbox" | "mediaFrames" | "mediaTranscript" | "done" | "message" | "send" | "map" | "radius" | "venue" | "digital" | "platforms" | "evidence" | "match" | "transcript" | "searchArea" | "nextVenue" | "venueEvidence" | "platformTable" | "catalogue" | "venueTool" | "comparableTable" | "countryMode" | "countrySearch" | "countryChoice" | "radiusValue";
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
  question: { duration: 36000, initial: { workspaceOpen: true, audienceOpen: true }, cues: [
    cue(200, "select", "Choose the files for this conversation", { pickerOpen: true }),
    cue(1100, "trailer", "Select Trailer.mp4", { references: ["tour-trailer"] }),
    cue(1950, "briefCheckbox", "Add Production brief.txt", { references: ["tour-trailer", "tour-brief"] }),
    cue(2800, "posterCheckbox", "Add Poster.jpg", { references: ["tour-trailer", "tour-brief", "tour-poster"] }),
    cue(3800, "done", "Confirm the selected files", { pickerOpen: false }),
    cue(4700, "message", "Describe the project, screening and release plan", {}),
    cue(9000, "send", "Send the question with the trailer, brief and poster", { draft: "", sent: true }),
    cue(10700, "transcript", "Follow the selected-media analysis", {}, false),
    cue(13800, "mediaFrames", "Inspect the ten sampled trailer observations", { mediaFramesOpen: true }),
    cue(17800, "mediaTranscript", "Read the speech heard in the trailer", { mediaFramesOpen: false, mediaTranscriptOpen: true }),
    cue(21500, "transcript", "Inspect the poster analysis alongside the production brief", { mediaTranscriptOpen: false }, false),
    cue(25500, "transcript", "Read the returned venue cards", {}, false),
    cue(31000, "transcript", "Scroll through the shortlist and next steps", {}, false),
  ] },
  live: { duration: 51000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief", "tour-poster"], sent: true, scrollFrom: "venues", scrollTo: "venues" }, cues: [
    cue(200, "map", "Open the London venue shortlist on the map", { mapOpen: true }),
    cue(1900, "radius", "Expand the search radius to 10 km", { radius: 10000 }),
    cue(3400, "searchArea", "Search the selected area", {}),
    cue(5200, "venue", "Focus Curzon Soho and inspect its card", { venue: 1 }),
    cue(7900, "nextVenue", "Move to the next venue in the carousel", { venue: 2 }),
    cue(11500, "map", "Return to the conversation and its venue results", { mapOpen: false }),
    cue(13000, "venueEvidence", "Expand Why this venue to inspect the sample contributions", { venueEvidenceOpen: true }),
    cue(18000, "message", "Ask a follow-up about the shortlist", {}),
    cue(21500, "send", "Send the comparison question", { draft: "" }),
    cue(23000, "transcript", "Watch the venue comparison stream", {}, false),
    cue(29000, "transcript", "Scroll through the practical screening checks", {}, false),
    cue(35500, "map", "Open the map to select a wider area", { mapOpen: true }),
    cue(38000, "radiusValue", "Set a 500 km search radius", { radius: 500000 }),
    cue(40500, "countryMode", "Switch from Radius to Country", { countryPickerOpen: true }),
    cue(42500, "countrySearch", "Find Kenya in the country selector", { countryQuery: "Kenya" }),
    cue(44500, "countryChoice", "Select Kenya and frame its full boundary", { countryCode: "KE", countryPickerOpen: false, countryQuery: "" }),
    cue(48400, "map", "Return to the conversation", { mapOpen: false }),
  ] },
  digital: { duration: 50000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief", "tour-poster"], sent: true, scrollFrom: "end", scrollTo: "end" }, cues: [
    cue(200, "digital", "Switch the same conversation from Live to Digital", { audienceMode: "digital" }),
    cue(1500, "message", "Ask for a platform comparison and supporting films", {}),
    cue(6000, "send", "Send the digital question with the project files", { draft: "" }),
    cue(7200, "transcript", "Follow the streamed reply and Digital audience tool", {}, false),
    cue(14500, "platformTable", "Compare the returned platform affinity values", {}, false),
    cue(18000, "platformTable", "Scroll across the comparison to MUBI", {}, false),
    cue(22000, "transcript", "Scroll down to the comparable films", {}, false),
    cue(26000, "comparableTable", "Scroll across both supporting film examples", {}, false),
    cue(29000, "transcript", "Read the release checks and limits of the evidence", {}, false),
    cue(34000, "platforms", "Open the platform catalogue", { mapOpen: true }),
    cue(35500, "catalogue", "Scroll through Video, Music and the other categories", {}, false),
    cue(44500, "platforms", "Return to the completed digital answer", { mapOpen: false }),
  ] },
  evidence: { duration: 14000, initial: { workspaceOpen: true, audienceOpen: true, references: ["tour-trailer", "tour-brief", "tour-poster"], sent: true, scrollFrom: "searchDetails", scrollTo: "searchDetails" }, cues: [
    cue(400, "evidence", "Expand Qloo search to see the exact query and sample match", { evidenceOpen: true }),
    cue(3200, "match", "Inspect the matched artist and its example identity", {}, false),
    cue(5800, "venueTool", "Expand Audience venues to inspect the search inputs", { evidenceTool: "venues" }),
    cue(8500, "transcript", "Scroll through the result evidence and search parameters", {}, false),
    cue(11600, "transcript", "Return to the answer with its source context", { evidenceOpen: false }, false),
  ] },
};
const initialScene: TourScene = { mediaFramesOpen: false, mediaTranscriptOpen: false, countryPickerOpen: false, countryQuery: "", evidenceQueryOpen: false, mapSearched: false, venueListScroll: 0, mapSearching: false, evidenceScroll: 0, answerTime: 20000, followupTime: -1, scrollFrom: "start", scrollTo: "start", scrollProgress: 1, catalogueScroll: 0, comparisonScroll: 0, comparableScroll: 0, venueEvidenceOpen: false, evidenceTool: "search", workspaceExists: true, createOpen: false, workspaceName: "", workspaceOpen: false, uploaded: true, importOpen: false, importBusy: false, importItems: 0, audienceOpen: false, pickerOpen: false, references: [], draft: "", sent: false, mapOpen: false, audienceMode: "live", radius: 5000, evidenceOpen: false, view: "list" };
export function tourDraftAt(time: number) { return exampleQuestion.slice(0, Math.floor(Math.max(0, Math.min(1, (time - 5350) / 3100)) * exampleQuestion.length)); }
export function tourImportItemsAt(time: number) { return Math.min(3, Math.max(0, Math.floor((time - 5650) / 400) + 1)); }
export function tourNameAt(time: number) { return "Night Signals".slice(0, Math.floor(Math.max(0, Math.min(1, (time - 1300) / 600)) * "Night Signals".length)); }
export function tourSceneAt(step: TourStep, time: number): TourScene {
  const script = tourScripts[step], scene = { ...initialScene, ...script.initial };
  for (const cue of script.cues) if (time >= cue.commit) Object.assign(scene, cue.change);
  if (step === "question" && !scene.sent) scene.draft = tourDraftAt(time);
  if (step === "workspace") { scene.workspaceName = tourNameAt(time); scene.importItems = tourImportItemsAt(time); }
  if (step === "question" && scene.sent) {
    scene.answerTime = Math.min(8200, Math.max(0, time - 9650));
    scene.scrollFrom = "end"; scene.scrollTo = "end"; scene.scrollProgress = 1;
    if (time >= 13000) { scene.scrollFrom = "end"; scene.scrollTo = "media"; scene.scrollProgress = progress(time, 13000, 800); }
    if (time >= 17800 && time < 21000) { scene.scrollFrom = "media"; scene.scrollTo = "mediaTranscript"; scene.scrollProgress = progress(time, 17800, 800); }
    if (time >= 21000) { scene.scrollFrom = "media"; scene.scrollTo = "image"; scene.scrollProgress = progress(time, 21000, 1000); }
    if (time >= 25000) { scene.scrollFrom = "image"; scene.scrollTo = "venues"; scene.scrollProgress = progress(time, 25000, 1100); }
    if (time >= 31000) { scene.scrollFrom = "venues"; scene.scrollTo = "end"; scene.scrollProgress = progress(time, 31000, 3000); }
  }
  if (step === "live") {
    scene.mapSearched = time >= 5000;
    scene.venueListScroll = progress(time, 14900, 1600);
    scene.mapSearching = time >= 4050 && time < 5000;
    scene.draft = time < 22150 ? type(liveFollowup, time, 18650, 2600) : "";
    if (time >= 22150) scene.followupTime = Math.min(4750, time - 22150);
    if (time >= 22150) {
      scene.scrollFrom = scene.scrollTo = "end";
      if (time >= 27700 && time < 29000) { scene.scrollFrom = "end"; scene.scrollTo = "followup"; scene.scrollProgress = progress(time, 27700, 1300); }
      if (time >= 29000) { scene.scrollFrom = "followup"; scene.scrollTo = "end"; scene.scrollProgress = progress(time, 29000, 4000); }
    }
  }
  if (step === "digital") {
    scene.draft = time < 6650 ? type(digitalQuestion, time, 2150, 3300) : "";
    if (time >= 6650) scene.followupTime = Math.min(8200, time - 6650);
    scene.scrollFrom = "end"; scene.scrollTo = time < 14500 ? "end" : "platformResults"; scene.scrollProgress = progress(time, 14500, 1100);
    if (time >= 22000) { scene.scrollFrom = "platformResults"; scene.scrollTo = "comparables"; scene.scrollProgress = progress(time, 22000, 2200); }
    if (time >= 29000) { scene.scrollFrom = "comparables"; scene.scrollTo = "end"; scene.scrollProgress = progress(time, 29000, 3500); }
    scene.comparisonScroll = progress(time, 18650, 1800);
    scene.comparableScroll = progress(time, 26000, 1800);
    scene.catalogueScroll = progress(time, 36150, 7300);
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
