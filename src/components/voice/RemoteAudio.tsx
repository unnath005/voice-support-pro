import { useEffect, useRef } from "react";

/** Plays the far end of the WebRTC call. */
export function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}
