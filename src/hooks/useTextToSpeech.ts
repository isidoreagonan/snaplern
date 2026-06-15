import { useEffect, useRef, useState } from "react";

export function useTextToSpeech() {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string, lang: string = "fr-FR") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang.split("-")[0].toLowerCase();
    const v = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (v) u.voice = v;
    u.onend = () => {
      setPlaying(false);
      setPaused(false);
    };
    u.onerror = () => {
      setPlaying(false);
      setPaused(false);
    };
    uttRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setPaused(false);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setPaused(true);
  };
  const resume = () => {
    window.speechSynthesis.resume();
    setPaused(false);
  };
  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  };

  return { playing, paused, speak, pause, resume, stop };
}