import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RtcStatus = "idle" | "waiting" | "connecting" | "connected" | "ended" | "failed";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

/**
 * Real peer-to-peer audio between the customer tab and the human-agent tab.
 * Signalling (SDP + ICE) travels over a Lovable Cloud realtime broadcast channel,
 * so no telephony credentials are needed for the browser-to-browser prototype.
 */
export function useWebRTCCall(sessionId: string | null, role: "customer" | "agent") {
  const [status, setStatus] = useState<RtcStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const activeRef = useRef(false);

  const post = useCallback((event: string, payload: unknown = {}) => {
    channelRef.current?.send({ type: "broadcast", event, payload: { from: role, ...(payload as object) } });
  }, [role]);

  const teardown = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setRemoteStream(null);
    activeRef.current = false;
  }, []);

  const ensurePc = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localRef.current = stream;
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) post("ice", { candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null);
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      else if (s === "failed") {
        setStatus("failed");
        setError("The audio connection could not be established.");
      } else if (s === "disconnected" || s === "closed") setStatus((prev) => (prev === "connected" ? "ended" : prev));
    };
    pcRef.current = pc;
    return pc;
  }, [post]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* candidate no longer relevant */
      }
    }
  }, []);

  // Signalling channel
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`handoff-${sessionId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "agent-join" }, async () => {
        if (role !== "customer" || !activeRef.current) return;
        setStatus("connecting");
        try {
          const pc = await ensurePc();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          post("offer", { sdp: offer });
        } catch (e) {
          setStatus("failed");
          setError(e instanceof Error ? e.message : "Microphone unavailable");
        }
      })
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (role !== "agent" || !activeRef.current) return;
        setStatus("connecting");
        try {
          const pc = await ensurePc();
          await pc.setRemoteDescription(new RTCSessionDescription((payload as any).sdp));
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          post("answer", { sdp: answer });
        } catch (e) {
          setStatus("failed");
          setError(e instanceof Error ? e.message : "Could not answer the call");
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (role !== "customer") return;
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription((payload as any).sdp));
        await flushIce();
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        const cand = (payload as any).candidate as RTCIceCandidateInit;
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          pendingIce.current.push(cand);
          return;
        }
        try {
          await pc.addIceCandidate(cand);
        } catch {
          /* ignore */
        }
      })
      .on("broadcast", { event: "bye" }, () => {
        teardown();
        setStatus("ended");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      teardown();
    };
  }, [sessionId, role, ensurePc, flushIce, post, teardown]);

  /** Customer: arm the line and wait. Agent: join and trigger the offer. */
  const start = useCallback(async () => {
    setError(null);
    try {
      activeRef.current = true;
      await ensurePc();
      if (role === "agent") {
        setStatus("connecting");
        post("agent-join");
      } else {
        setStatus("waiting");
      }
    } catch (e) {
      activeRef.current = false;
      setStatus("failed");
      setError(e instanceof Error ? e.message : "Microphone permission denied");
    }
  }, [ensurePc, post, role]);

  const hangUp = useCallback(() => {
    post("bye");
    teardown();
    setStatus("ended");
  }, [post, teardown]);

  const toggleMute = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  return { status, error, muted, remoteStream, start, hangUp, toggleMute };
}
