"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToSession } from "@/lib/db";
import { Session, DEFAULT_SESSION } from "@/lib/types";

function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

export default function PitchPage() {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [connected, setConnected] = useState(false);
  const prevTimeRef = useRef<number>(DEFAULT_SESSION.timeRemaining);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepedOneMinRef = useRef(false);
  const beepedZeroRef = useRef(false);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };
    document.addEventListener("click", initAudio, { once: true });
    return () => document.removeEventListener("click", initAudio);
  }, []);

  function playBeep(frequency: number, duration: number, gain = 0.4) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  function playWarningBeep() {
    // 3 short beeps at 880Hz
    playBeep(880, 0.15, 0.5);
    setTimeout(() => playBeep(880, 0.15, 0.5), 220);
    setTimeout(() => playBeep(880, 0.15, 0.5), 440);
  }

  function playTimeUpBeep() {
    // Long low tone + high tone
    playBeep(440, 0.8, 0.6);
    setTimeout(() => playBeep(880, 0.5, 0.6), 900);
  }

  useEffect(() => {
    const unsubscribe = subscribeToSession((s) => {
      setSession(s);
      setConnected(true);

      // Audio triggers
      if (s.status === "running") {
        // 1-minute warning
        if (s.timeRemaining <= 60 && prevTimeRef.current > 60) {
          if (!beepedOneMinRef.current) {
            beepedOneMinRef.current = true;
            playWarningBeep();
          }
        }
        // Time up
        if (s.timeRemaining <= 0 && prevTimeRef.current > 0) {
          if (!beepedZeroRef.current) {
            beepedZeroRef.current = true;
            playTimeUpBeep();
          }
        }
        // Reset beep flags when timer is reset
        if (s.timeRemaining > 60) {
          beepedOneMinRef.current = false;
        }
        if (s.timeRemaining > 0) {
          beepedZeroRef.current = false;
        }
      } else {
        // Reset flags when not running
        beepedOneMinRef.current = false;
        beepedZeroRef.current = false;
      }
      prevTimeRef.current = s.timeRemaining;
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOvertime = session.timeRemaining < 0;
  const isWarning = session.timeRemaining >= 0 && session.timeRemaining <= 60;
  const isTimeUp = session.timeRemaining <= 0 && session.status === "running";

  const timerColor = isTimeUp || isOvertime
    ? "text-red-400"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  const timerBg = isTimeUp || isOvertime
    ? "bg-red-500/10 border-red-500/20"
    : isWarning
    ? "bg-amber-500/10 border-amber-500/20"
    : "bg-emerald-500/10 border-emerald-500/20";

  const isRunning = session.status === "running";
  const isPaused = session.status === "paused";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          isTimeUp || isOvertime
            ? "bg-red-950/30"
            : isWarning
            ? "bg-amber-950/20"
            : "bg-transparent"
        }`}
      />

      {/* Connection indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            connected ? "bg-emerald-500" : "bg-gray-600 animate-pulse"
          }`}
        />
        <span className="text-gray-600 text-xs uppercase tracking-widest">
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Brand */}
      <div className="absolute top-6 left-6">
        <p className="text-gray-600 text-sm font-semibold tracking-widest uppercase">
          IdeaX Semi-Finals
        </p>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center w-full max-w-4xl">
        {session.status === "idle" && !session.currentTeam ? (
          <div className="space-y-4">
            <div className="text-8xl mb-4">🎙️</div>
            <h1 className="text-5xl font-black text-white">Ready to Pitch</h1>
            <p className="text-gray-400 text-xl">
              Waiting for the MC to begin…
            </p>
          </div>
        ) : (
          <>
            {/* Team Label */}
            <div className="space-y-2">
              <p className="text-gray-400 text-lg uppercase tracking-widest font-semibold">
                Now Pitching
              </p>
              <h1 className="text-6xl lg:text-7xl font-black text-white leading-tight">
                {session.currentTeam?.name ?? "—"}
              </h1>
            </div>

            {/* Timer */}
            <div
              className={`w-full max-w-2xl rounded-3xl border-2 p-10 transition-all duration-500 ${timerBg} ${
                (isTimeUp || isOvertime) ? "pulse-red" : ""
              }`}
            >
              <div className={`font-mono font-black text-center leading-none tabular-nums ${timerColor}`}
                style={{ fontSize: "clamp(6rem, 20vw, 14rem)" }}>
                {formatTime(session.timeRemaining)}
              </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-3">
              {isRunning && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Running
                </span>
              )}
              {isPaused && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold">
                  ⏸ Paused
                </span>
              )}
              {session.status === "idle" && session.currentTeam && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm font-semibold">
                  ⏱ Ready
                </span>
              )}
              {isOvertime && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold">
                  🔴 Overtime
                </span>
              )}
            </div>

            {/* Progress bar */}
            {session.pitchDuration > 0 && (
              <div className="w-full max-w-2xl">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isOvertime || isTimeUp
                        ? "bg-red-500"
                        : isWarning
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (session.timeRemaining / session.pitchDuration) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Click to enable audio hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <p className="text-gray-700 text-xs">Click anywhere to enable audio alerts</p>
      </div>
    </div>
  );
}
