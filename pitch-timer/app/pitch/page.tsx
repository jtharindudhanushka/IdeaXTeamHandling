"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToSession } from "@/lib/db";
import { Session, DEFAULT_SESSION } from "@/lib/types";

function formatTime(seconds: number): string {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const m = Math.floor(Math.round(absSeconds) / 60);
  const s = Math.round(absSeconds) % 60;
  return `${isNegative ? "-" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PitchPage() {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    playBeep(880, 0.15, 0.5);
    setTimeout(() => playBeep(880, 0.15, 0.5), 220);
    setTimeout(() => playBeep(880, 0.15, 0.5), 440);
  }

  function playTimeUpBeep() {
    playBeep(440, 0.8, 0.6);
    setTimeout(() => playBeep(880, 0.5, 0.6), 900);
  }

  useEffect(() => {
    const unsubscribe = subscribeToSession((s) => {
      setSession(s);
      setConnected(true);

      if (s.status === "running") {
        if (s.timeRemaining <= 60 && prevTimeRef.current > 60) {
          if (!beepedOneMinRef.current) {
            beepedOneMinRef.current = true;
            playWarningBeep();
          }
        }
        if (s.timeRemaining <= 0 && prevTimeRef.current > 0) {
          if (!beepedZeroRef.current) {
            beepedZeroRef.current = true;
            playTimeUpBeep();
          }
        }
        if (s.timeRemaining > 60) beepedOneMinRef.current = false;
        if (s.timeRemaining > 0) beepedZeroRef.current = false;
      } else {
        beepedOneMinRef.current = false;
        beepedZeroRef.current = false;
      }
      prevTimeRef.current = s.timeRemaining;
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const isOvertime = session.timeRemaining < 0;
  const isTimeUp = session.timeRemaining <= 0 && session.status === "running";
  const isCritical = session.timeRemaining > 0 && session.timeRemaining <= 30;
  const isRunning = session.status === "running";
  const isPaused = session.status === "paused";

  const currentDuration = session.phase === "pitch" ? session.pitchDuration : session.qaDuration;
  const rawProgress = currentDuration > 0 ? session.timeRemaining / currentDuration : 0;
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Circular Ring Math
  const radius = 220;
  const stroke = 24;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  // The ring color shifts from cobalt to arc as time gets low, or warning colors when critical
  const ringGlow = isOvertime ? "drop-shadow(0 0 30px rgba(239,68,68,0.8))" : isCritical ? "drop-shadow(0 0 30px rgba(245,158,11,0.8))" : progress < 0.2 ? "drop-shadow(0 0 20px #1A6FD4)" : "";

  return (
    <div className="bg-underwater-radial flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden font-sans select-none" style={{ minHeight: "100dvh" }}>
      
      {/* Background Animated Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Floating Orbs for subtle underwater movement */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#1A6FD4] opacity-[0.15] blur-[100px] mix-blend-screen animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5BB8FF] opacity-[0.1] blur-[120px] mix-blend-screen animate-float-delayed"></div>
      </div>

      {/* Pulsing effect when finished */}
      <div className={`fixed inset-0 transition-all duration-1000 pointer-events-none ${isTimeUp || isOvertime ? "bg-hackx-arc/10 animate-pulse" : "bg-transparent"}`} />

      {/* Top Bar */}



      <div className="absolute top-8 right-8 lg:top-12 lg:right-12 flex items-center justify-center gap-3 bg-white/5 backdrop-blur-lg border border-white/10 px-5 py-2.5 rounded-full shadow-xl">
        <div className="relative flex h-2.5 w-2.5 shrink-0">
          {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BB8FF] opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? "bg-[#5BB8FF]" : "bg-hackx-slate animate-pulse"}`}></span>
        </div>
        <span className="text-hackx-arc text-xs uppercase tracking-[0.2em] font-bold opacity-90 mt-[1px]">
          {connected ? "Live Sync" : "Connecting…"}
        </span>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-8 min-h-[100dvh]">
        {session.status === "idle" && !session.currentTeam ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <h1 className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(91,184,255,0.3)]">Awaiting Next Pitch</h1>
            <p className="text-hackx-arc text-2xl font-medium tracking-wide opacity-80">
              The MC will start the timer shortly.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
            
            {/* Team & Phase Info */}
            <div className="flex-1 flex flex-col justify-end pb-12 text-center space-y-4 w-full">
              <p className="text-hackx-arc text-xl uppercase tracking-[0.3em] font-bold">
                {session.phase === "qa" ? "Q&A Session" : "Now Pitching"}
              </p>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight drop-shadow-[0_0_30px_rgba(26,111,212,0.5)]">
                {session.currentTeam?.name ?? "—"}
              </h1>
            </div>

            {/* Circular Timer Ring */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* SVG Ring */}
              <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90 drop-shadow-2xl"
              >
                {/* Background Track */}
                <circle
                  stroke="#132F52" // brighter dark slate to improve contrast
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  strokeLinecap="round"
                />
                
                {/* Active Progress */}
                <circle
                  stroke="url(#gradient)"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + " " + circumference}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="transition-all duration-1000 ease-linear"
                  filter="url(#glow)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    {isOvertime ? (
                      <>
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#DC2626" />
                      </>
                    ) : isCritical ? (
                      <>
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#1A6FD4" />
                        <stop offset="100%" stopColor="#5BB8FF" />
                      </>
                    )}
                  </linearGradient>
                  
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                    <feComponentTransfer in="coloredBlur" result="glow">
                      <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="glow"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
              </svg>

              {/* Time Readout inside the ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div 
                  className={`font-mono font-black tabular-nums tracking-tighter ${isOvertime ? "text-red-500 animate-pulse" : isCritical ? "text-amber-400" : "text-white"}`}
                  style={{ fontSize: "6.25rem", filter: ringGlow }}
                >
                  {formatTime(session.timeRemaining)}
                </div>
                {isOvertime && (
                  <div className="text-hackx-arc font-bold text-2xl uppercase tracking-widest mt-2 animate-pulse">
                    Overtime
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Spacer to perfectly center the timer */}
            <div className="flex-1 w-full"></div>
          </div>
        )}
      </div>

      <button
        onClick={toggleFullscreen}
        className="absolute bottom-8 right-8 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all z-50 shadow-xl"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        )}
      </button>
    </div>
  );
}
