import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
};

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "barge_in";
export type VoiceMode = "webrtc" | "browser";

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeech(onFinal: (text: string) => void, mode: VoiceMode = "browser") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [bargeIn, setBargeIn] = useState(false);
  const [level, setLevel] = useState(0);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  useEffect(() => {
    if (!listening && !speaking) {
      setLevel(0);
      return;
    }
    const tick = modeRef.current === "webrtc" ? 70 : 120;
    const id = setInterval(
      () => setLevel(listening ? 0.25 + Math.random() * 0.75 : 0.2 + Math.random() * 0.4),
      tick,
    );
    return () => clearInterval(id);
  }, [listening, speaking]);

  const shutUp = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // Barge-in: any new speech from the customer cuts the agent off instantly.
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setBargeIn(true);
      setTimeout(() => setBargeIn(false), 1400);
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      // Streaming mode reacts to partials, so cut TTS as soon as sound arrives.
      if (live && typeof window !== "undefined" && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        setBargeIn(true);
        setTimeout(() => setBargeIn(false), 1400);
      }
      setInterim(live);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) finalRef.current(text);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = modeRef.current === "webrtc" ? 1.12 : 1.03;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => /female|samantha|zira|aria|neerja/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (pick) u.voice = pick;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  return { supported, listening, interim, speaking, bargeIn, level, start, stop, speak, shutUp };
}
