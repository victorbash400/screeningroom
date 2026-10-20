import { useEffect, useRef } from "react";
import styles from "./VoiceRecording.module.css";

export default function VoiceWaveform({ analyser }: { analyser?: AnalyserNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;
    let frame = 0;
    const samples = new Uint8Array(analyser?.fftSize ?? 256);
    function draw() {
      if (!element || !context) return;
      const width = element.clientWidth, height = 32;
      element.width = width * devicePixelRatio;
      element.height = height * devicePixelRatio;
      context.scale(devicePixelRatio, devicePixelRatio);
      context.clearRect(0, 0, width, height);
      context.fillStyle = getComputedStyle(element).color;
      if (analyser) analyser.getByteTimeDomainData(samples);
      const bars = Math.max(1, Math.floor(width / 7));
      for (let index = 0; index < bars; index++) {
        const value = analyser ? Math.abs(samples[Math.floor(index / bars * samples.length)] - 128) / 128 : 0;
        const size = Math.max(3, Math.min(28, value * 80));
        context.beginPath(); context.roundRect(index * 7, (height - size) / 2, 3, size, 2); context.fill();
      }
      if (analyser) frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);
  return <canvas className={styles.waveform} ref={canvas} aria-hidden="true" />;
}
