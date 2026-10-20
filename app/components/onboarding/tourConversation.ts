import type { Message, MessageBlock, MessageTool } from "../../lib/types";
import { exampleFiles, exampleQuestion, exampleArea } from "./tourExample";
import { exampleArtist, exampleFilm, exampleVenues, exampleDigital } from "./tourEvidence";

import { exampleTrailerAnalysis, examplePosterAnalysis } from "./tourMedia";

const createdAt = "2026-10-01T12:00:00Z";
export const liveFollowup = "Compare Curzon Soho with BFI Southbank. What should I check before contacting them?";
export const digitalQuestion = "Compare YouTube, Vimeo and MUBI for Night Signals after its London screening. Show the supporting comparable films, explain how the selected trailer and brief inform the comparison, and list the release checks.";
const liveIntro = "Your brief describes **Night Signals**, a 24-minute documentary with a London screening and a filmmaker–musician Q&A. The selected trailer moves from rehearsal and backstage work to a small performance; its speech invites people to listen together. The poster uses an amber record on a pale turntable, without a date or venue.\n\nI’ll keep those observations separate from the brief’s taste references, **Radiohead** and **Stop Making Sense**, and use those references to explore cinemas around **London**.";
const liveEnd = "**A starting shortlist**\n\nCompare the venue profiles below with your intended audience. The affinity values show how this example is presented; they are not ticket-sales estimates.\n\nBefore contacting a venue, check screening rights, programming fit, capacity, hire costs and availability. You can open a venue on the map or ask a follow-up about the shortlist.";
const digitalIntro = "I’ll compare **YouTube, Vimeo and MUBI** using the music-documentary context, then show the comparable films behind the example.";
const digitalEnd = "**Choose a route, then check the terms**\n\nCompare platform affinity alongside your release plan. Check current submission routes, rights, territory restrictions and commercial terms directly with each platform. Cultural affinity does not establish distribution access or predict views.\n\nFor **Night Signals**, separate the full 24-minute film from the 90-second promotional trailer. Decide whether the online release should support the London event, reach a wider audience afterwards, or pursue a curated programme. Those are different release decisions even when the same taste references are used.\n\nUse the comparable films to discuss music, performance and documentary form. Their presence in a taste comparison does not prove that a service accepts your film or that its audience will watch it. Prepare a synopsis, captioned trailer, poster, rights summary and delivery files before checking current routes with each service.\n\nUse **Platforms** to browse the catalogue, or ask to compare another platform against the same project.";
const followupAnswer = "**Compare the fit before the booking**\n\nBoth venues are in the sample London shortlist. Curzon Soho has a sample affinity of **0.69** and BFI Southbank **0.74**. Those values illustrate the result format; they do not establish a booking recommendation.\n\nFor each venue, confirm:\n\n- Whether a short music documentary fits its current programme.\n- A screening slot, room capacity and accessibility.\n- Projection format, sound requirements and Q&A facilities.\n- Film and music rights, hire costs and revenue terms.\n\nFor the planned 20-minute filmmaker and musician Q&A, ask about microphones, a moderator, changeover time and whether music playback can be checked before doors open. Share the expected running time as **24 minutes plus the discussion**, rather than sending only the trailer duration.\n\nPrepare a captioned trailer, synopsis, poster, technical specification and a clear list of music and performance clearances. Ask which materials the programming team needs and whether the proposed event would be a programmed screening or a private hire.\n\nSend the trailer and a short synopsis when you contact the programming or venue-hire team. **Availability and pricing have not been checked.**";

function streamed(text: string, elapsed: number, start: number, duration: number) { return text.slice(0, Math.floor(Math.max(0, Math.min(1, (elapsed - start) / duration)) * text.length)); }
function textBlock(id: string, text: string): MessageBlock { return { id, kind: "text", text }; }
function toolBlock(id: string, name: string, elapsed: number, end: number, result: Partial<MessageTool>): MessageBlock {
  return { id, kind: "tool", tool: { id, name, state: elapsed < end ? "running" : "done", ...(elapsed < end ? { trace: result.trace ? { input: result.trace.input } : undefined } : result) } };
}
export function tourUserMessage(id: string, text: string, referenceIds: string[]): Message {
  return { id, role: "user", text, createdAt, references: exampleFiles.filter(file => referenceIds.includes(file.id)).map(file => ({ id: file.id, name: file.name, kind: file.kind, workspaceId: file.workspaceId })) };
}
export function tourAnswer(id: string, mode: "live" | "digital", elapsed = 20000): Message {
  const digital = mode === "digital";
  const blocks: MessageBlock[] = [];
  if (!digital && elapsed >= 350) blocks.push(toolBlock(`${id}:files`, "readSelectedMedia", elapsed, 1100, { trace: { input: { fileId: "tour-brief" } } }));
  if (!digital && elapsed >= 1200) blocks.push(toolBlock(`${id}:trailer`, "inspectVideo", elapsed, 2400, { trace: { input: { fileId: "tour-trailer", samples: 10, includeAudio: true } }, media: exampleTrailerAnalysis }));
  if (!digital && elapsed >= 2500) blocks.push(toolBlock(`${id}:poster`, "inspectImage", elapsed, 3400, { trace: { input: { fileId: "tour-poster" } }, media: examplePosterAnalysis }));
  const intro = streamed(digital ? digitalIntro : liveIntro, elapsed, 1100, 1700);
  if (intro) blocks.push(textBlock(`${id}:intro`, intro));
  if (elapsed >= 2900) blocks.push(toolBlock(`${id}:search`, "searchEntities", elapsed, 3500, { trace: { input: { query: "Radiohead", type: "artist", take: 5 }, matches: [{ id: exampleArtist.id, name: "Radiohead (example match)" }] } }));
  if (elapsed >= 3600) blocks.push(toolBlock(`${id}:film`, "searchEntities", elapsed, 4200, { trace: { input: { query: "Stop Making Sense", type: "movie", take: 5 }, matches: [{ id: exampleFilm.id, name: "Stop Making Sense (example match)" }] } }));
  if (elapsed >= 4400) blocks.push(toolBlock(`${id}:results`, digital ? "analyzeDigitalAudience" : "searchAudienceVenues", elapsed, 5500, {
    trace: { input: digital ? { title: "Night Signals", type: "movie", platformIds: ["youtube", "vimeo", "mubi"], entityIds: [exampleArtist.id, exampleFilm.id] } : { area: { ...exampleArea, venueTypes: ["cinema"] }, entityIds: [exampleArtist.id, exampleFilm.id], tagIds: [] } },
    ...(digital ? { research: exampleDigital } : { widget: exampleVenues }),
  }));
  const ending = streamed(digital ? digitalEnd : liveEnd, elapsed, 5600, 2600);
  if (ending) blocks.push(textBlock(`${id}:ending`, ending));
  return { id, role: "assistant", createdAt, text: [intro, ending].filter(Boolean).join("\n\n"), blocks, status: elapsed < 8200 ? "streaming" : "complete", waiting: elapsed < 1100 || elapsed >= 2800 && elapsed < 5500 };
}
export function tourMessages(mode: "live" | "digital", answerTime = 20000, followupTime = -1): Message[] {
  const messages = [tourUserMessage("tour-question", exampleQuestion, ["tour-trailer", "tour-brief", "tour-poster"]), tourAnswer("tour-answer", "live", answerTime)];
  if (followupTime < 0) return messages;
  messages.push(tourUserMessage("tour-followup", mode === "digital" ? digitalQuestion : liveFollowup, ["tour-trailer", "tour-brief", "tour-poster"]));
  if (mode === "digital") messages.push(tourAnswer("tour-digital", "digital", followupTime));
  else {
    const text = streamed(followupAnswer, followupTime, 450, 4300);
    messages.push({ id: "tour-venue-comparison", role: "assistant", text, createdAt, status: followupTime < 4750 ? "streaming" : "complete", waiting: followupTime < 450 });
  }
  return messages;
}
