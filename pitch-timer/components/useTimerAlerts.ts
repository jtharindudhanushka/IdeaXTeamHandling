"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionStatus } from "@/lib/types";

// Beeps at 1 minute left (3 short) and at time-up (two-tone).
// Browsers only allow audio after a user gesture, so the AudioContext is
// created on the first click/keypress; returns whether sound is ready.
export function useTimerAlerts(status: SessionStatus, remaining: number): boolean {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const prevRef = useRef<number | null>(null);
  const beepedOneMinRef = useRef(false);
  const beepedZeroRef = useRef(false);

  useEffect(() => {
    const init = () => {
      if (!audioCtxRef.current) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      audioCtxRef.current.resume().catch(() => {});
      setSoundReady(true);
    };
    document.addEventListener("click", init);
    document.addEventListener("keydown", init);
    return () => {
      document.removeEventListener("click", init);
      document.removeEventListener("keydown", init);
    };
  }, []);

  useEffect(() => {
    const playBeep = (frequency: number, duration: number, gain = 0.5) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    };

    const prev = prevRef.current;
    prevRef.current = remaining;

    if (status !== "running") {
      beepedOneMinRef.current = false;
      beepedZeroRef.current = false;
      return;
    }
    if (remaining > 60) beepedOneMinRef.current = false;
    if (remaining > 0) beepedZeroRef.current = false;
    // Only fire on a live crossing, not when the page loads mid-countdown.
    if (prev === null) return;

    if (remaining <= 60 && prev > 60 && !beepedOneMinRef.current) {
      beepedOneMinRef.current = true;
      playBeep(880, 0.15);
      setTimeout(() => playBeep(880, 0.15), 220);
      setTimeout(() => playBeep(880, 0.15), 440);
    }
    if (remaining <= 0 && prev > 0 && !beepedZeroRef.current) {
      beepedZeroRef.current = true;
      playBeep(440, 0.8, 0.6);
      setTimeout(() => playBeep(880, 0.5, 0.6), 900);
    }
  }, [status, remaining]);

  return soundReady;
}
