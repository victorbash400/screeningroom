import { useEffect, useRef, useState } from "react";

export function useTourPlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const position = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    const start = performance.now() - position.current;
    function advance(now: number) {
      position.current = Math.min(duration, now - start);
      setTime(position.current);
      if (position.current === duration) setPlaying(false);
      else frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", onVisibility); };
  }, [playing, duration, run]);
  function seek(value: number) { position.current = Math.max(0, Math.min(duration, value)); setTime(position.current); setPlaying(false); }
  function play() { if (position.current === duration) { position.current = 0; setTime(0); } setPlaying(true); }
  return { time, playing, seek, toggle: () => playing ? setPlaying(false) : play(), replay: () => { position.current = 0; setTime(0); setRun(value => value + 1); setPlaying(true); } };
}
