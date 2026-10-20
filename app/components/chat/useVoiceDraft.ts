import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiRequest, object } from "../../lib/accountApi";

type Phase = "idle" | "requesting" | "recording" | "transcribing";
export default function useVoiceDraft(onTranscript: (text: string) => boolean) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const [error, setError] = useState<string>();
  const complete = useRef(onTranscript);
  useLayoutEffect(() => { complete.current = onTranscript; });
  const resources = useRef<{ stream: MediaStream; recorder: MediaRecorder; context: AudioContext; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const request = useRef<AbortController | null>(null);
  const recording = useRef<Blob | null>(null);
  function release() {
    const current = resources.current;
    resources.current = null;
    if (!current) return;
    clearTimeout(current.timer);
    current.recorder.onstop = null;
    current.recorder.onerror = null;
    if (current.recorder.state !== "inactive") current.recorder.stop();
    current.stream.getTracks().forEach(track => track.stop());
    if (current.context.state !== "closed") void current.context.close();
  }
  useEffect(() => () => { request.current?.abort(); release(); }, []);
  function cancel() {
    request.current?.abort();
    request.current = null;
    release();
    recording.current = null;
    setAnalyser(undefined);
    setPhase("idle");
    setError(undefined);
  }
  async function transcribe(blob: Blob, controller: AbortController) {
    setPhase("transcribing");
    try {
      const result = object(await apiRequest("/api/audio/transcribe", { method: "POST", headers: { "Content-Type": blob.type }, body: blob, signal: controller.signal }));
      if (controller.signal.aborted) return;
      if (typeof result.text !== "string" || !result.text.trim()) throw new Error("No words detected. Record again.");
      if (!complete.current(result.text.trim())) throw new Error("Could not save the transcript to your draft. Retry saving the workspace.");
      recording.current = null;
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Transcription failed. Try again.");
    } finally { if (!controller.signal.aborted) { request.current = null; setPhase("idle"); } }
  }
  async function start() {
    if (request.current) return;
    setError(undefined);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Microphone recording is unavailable in this browser."); return; }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setError("This browser cannot record a supported audio format."); return; }
    const controller = new AbortController();
    request.current = controller;
    setPhase("requesting");
    recording.current = null;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (controller.signal.aborted) { stream.getTracks().forEach(track => track.stop()); return; }
      context = new AudioContext();
      const meter = context.createAnalyser();
      meter.fftSize = 256;
      context.createMediaStreamSource(stream).connect(meter);
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      resources.current = { stream, recorder, context };
      await context.resume();
      if (controller.signal.aborted) return;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (controller.signal.aborted) return;
        release(); request.current = null; setAnalyser(undefined); setPhase("idle"); setError("Recording failed. Record again.");
      };
      recorder.onstop = () => {
        if (controller.signal.aborted) return;
        const blob = new Blob(chunks, { type: recorder.mimeType });
        release(); setAnalyser(undefined);
        if (controller.signal.aborted) return;
        if (!blob.size) { request.current = null; setPhase("idle"); setError("Recording is empty. Record again."); return; }
        recording.current = blob;
        void transcribe(blob, controller);
      };
      recorder.start();
      resources.current.timer = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 179_000);
      setAnalyser(meter);
      setPhase("recording");
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (context && context.state !== "closed") void context.close();
      if (controller.signal.aborted) return;
      release();
      request.current = null;
      setPhase("idle");
      setError(error instanceof DOMException && error.name === "NotAllowedError" ? "Allow microphone access to dictate a message." : "Could not start the microphone. Check your input device.");
    }
  }
  function stop() { if (resources.current?.recorder.state === "recording") resources.current.recorder.stop(); }
  function retry() {
    if (!recording.current) return;
    const controller = new AbortController();
    request.current = controller; setError(undefined);
    void transcribe(recording.current, controller);
  }
  return { phase, analyser, error, start, stop, cancel, retry: recording.current ? retry : undefined, dismissError: () => setError(undefined) };
}
