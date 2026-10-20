import { mediaAnalysisSchema } from "../../lib/mediaAnalysis";

export const exampleTrailerAnalysis = mediaAnalysisSchema.parse({
  kind: "media", fileId: "tour-trailer", name: "Trailer.mp4", modality: "video", model: "Scripted example", duration: 90, start: 0, end: 90, hasAudio: true,
  summary: "Musicians prepare a small venue, perform together and speak about sustaining an independent music community. The sample combines observational backstage footage, live performance and short interviews.",
  visibleText: "Night Signals", uncertainties: ["Scripted walkthrough observations and speech, not an analysis of a real uploaded trailer."],
  segments: [
    [1, "An empty stage is prepared for a small evening performance."], [8, "A musician connects a guitar while another checks a microphone."],
    [17, "An interview subject sits beside shelves of records."], [26, "People enter the venue and gather near the stage."],
    [35, "A band performs under warm stage lights."], [44, "A listener watches from the front of the room."],
    [53, "An interview continues in a quiet rehearsal space."], [62, "Musicians pack equipment after the show."],
    [72, "Two people carry a speaker through the venue doorway."], [85, "The title appears over a street outside the venue."],
  ].map(([start, text]) => ({ start, text })),
  transcript: { model: "Scripted example", duration: 90, start: 0, end: 90, complete: true, uncertainties: [], segments: [
    { start: 0, end: 30, text: "A room like this is more than a stage. It is where we find the people who keep us making music." },
    { start: 30, end: 60, text: "Some nights only a few people come. You still listen, and you still play as if the room matters." },
    { start: 60, end: 90, text: "We wanted to make a film about what remains after the lights go out: friendships, unfinished songs and a reason to return." },
  ] },
});

export const examplePosterAnalysis = mediaAnalysisSchema.parse({
  kind: "media", fileId: "tour-poster", name: "Poster.jpg", modality: "image", model: "Scripted example",
  summary: "A translucent amber record sits on a pale turntable in warm light. The close framing emphasizes the record, tonearm and tactile details of listening.",
  visibleText: "", segments: [], uncertainties: ["The image alone does not establish the film's plot, audience or distribution potential. This is a scripted walkthrough result."],
});
