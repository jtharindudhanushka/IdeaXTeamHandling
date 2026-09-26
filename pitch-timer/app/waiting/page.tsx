"use client";

import { useEffect, useState } from "react";
import { subscribeToSession } from "@/lib/db";
import { Session, DEFAULT_SESSION } from "@/lib/types";

function formatTime(seconds: number): string {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const m = Math.floor(Math.round(absSeconds) / 60);
  const s = Math.round(absSeconds) % 60;
  return `${isNegative ? "-" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const QUEUE_PREVIEW = 5;

export default function WaitingPage() {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSession((s) => {
      setSession(s);
      setConnected(true);
    });
    return unsubscribe;
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

  const upcoming = session.queue.slice(0, QUEUE_PREVIEW);
  const remaining = session.queue.length - QUEUE_PREVIEW;

  const currentDuration = session.phase === "pitch" ? session.pitchDuration : session.qaDuration;
  const progress = currentDuration > 0 ? Math.max(0, Math.min(100, (session.timeRemaining / currentDuration) * 100)) : 0;

  const totalTimePerTeamMin = Math.round((session.pitchDuration + session.qaDuration) / 60);
  const activeRemainingMin = Math.max(0, Math.round(session.timeRemaining / 60));

  return (
    <div className="min-h-screen bg-underwater-radial text-white flex flex-col overflow-y-auto overflow-x-hidden font-sans">
      
      {/* Background Animated Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Floating Orbs for subtle underwater movement */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#1A6FD4] opacity-[0.15] blur-[100px] mix-blend-screen animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5BB8FF] opacity-[0.1] blur-[120px] mix-blend-screen animate-float-delayed"></div>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-5 mx-8 mt-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/ideax-logo.png" 
            alt="IdeaX Logo" 
            className="h-20 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,165,0,0.3)]"
          />
          <div>
            <p className="text-hackx-arc text-xs uppercase tracking-[0.2em] font-bold opacity-80">
              Waiting Room
            </p>
            <h1 className="text-2xl font-black tracking-tight mt-0.5">
              Semi finals of HackX
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BB8FF] opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? "bg-[#5BB8FF]" : "bg-hackx-slate animate-pulse"}`}></span>
          </div>
          <span className="text-hackx-arc text-xs uppercase tracking-widest font-bold opacity-80 mt-[1px]">
            {connected ? "Live Sync" : "Connecting…"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative z-10 p-8 gap-8">
        {/* LEFT — Current pitch */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          {session.status === "idle" && !session.currentTeam ? (
            <div className="text-center space-y-4">
              <div className="text-7xl mb-2 drop-shadow-[0_0_15px_rgba(91,184,255,0.4)]">⏳</div>
              <p className="text-4xl font-black text-white">Standing By</p>
              <p className="text-hackx-arc text-xl opacity-80">Session hasn&apos;t started yet</p>
            </div>
          ) : (
            <div className="w-full max-w-xl text-center space-y-6">
              <div className="flex justify-center">
                {isRunning && (
                  <span className={`inline-flex items-center justify-center gap-3 px-6 py-2.5 rounded-full backdrop-blur-md border text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,0,0,0.3)] ${
                    isOvertime 
                      ? "bg-red-500/20 border-red-500/40 text-red-500" 
                      : isCritical 
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                        : "bg-hackx-cobalt/20 border-hackx-cobalt/40 text-hackx-arc"
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                      isOvertime ? "bg-red-500" : isCritical ? "bg-amber-400" : "bg-hackx-arc"
                    }`} />
                    <span className="mt-[1px]">Ongoing</span>
                  </span>
                )}
                {isPaused && (
                  <span className="inline-flex items-center justify-center gap-3 px-6 py-2.5 rounded-full bg-hackx-slate/30 backdrop-blur-md border border-hackx-slate text-gray-300 text-sm font-bold tracking-widest uppercase">
                    <span className="mt-[1px]">⏸ Paused</span>
                  </span>
                )}
                {session.status === "idle" && session.currentTeam && (
                  <span className="inline-flex items-center justify-center gap-3 px-6 py-2.5 rounded-full bg-hackx-void/50 backdrop-blur-md border border-hackx-slate text-gray-400 text-sm font-bold tracking-widest uppercase">
                    <span className="mt-[1px]">⏱ Ready</span>
                  </span>
                )}
              </div>

              <p className="text-hackx-arc text-base uppercase tracking-[0.3em] font-bold">
                {session.phase === "qa" ? "Q&A Session" : "Currently Pitching"}
              </p>

              <h2
                className="font-black text-white leading-tight drop-shadow-[0_0_20px_rgba(26,111,212,0.4)]"
                style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
              >
                {session.currentTeam?.name ?? "—"}
              </h2>

              <div
                className={`font-mono font-black tabular-nums leading-none ${isOvertime ? "text-red-500 animate-pulse" : isCritical ? "text-amber-400" : "text-white"}`}
                style={{ 
                  fontSize: "clamp(4rem, 14vw, 10rem)",
                  filter: isOvertime ? "drop-shadow(0 0 30px rgba(239,68,68,0.5))" : isCritical ? "drop-shadow(0 0 30px rgba(245,158,11,0.5))" : "drop-shadow(0 0 20px rgba(91,184,255,0.4))" 
                }}
              >
                {formatTime(session.timeRemaining)}
              </div>

              {currentDuration > 0 && (
                <div className="h-1.5 bg-hackx-slate rounded-full overflow-hidden w-full max-w-sm mx-auto">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isOvertime ? "bg-red-500 shadow-[0_0_10px_#EF4444]" : isCritical ? "bg-amber-500 shadow-[0_0_10px_#F59E0B]" : "bg-hackx-arc shadow-[0_0_10px_#5BB8FF]"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {isOvertime && (
                <p className="text-red-400 font-bold text-lg animate-pulse tracking-widest uppercase">
                  Overtime!
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Queue */}
        <div className="w-[380px] xl:w-[440px] flex flex-col p-8 gap-6 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl">
          <div>
            <p className="text-hackx-arc text-xs uppercase tracking-[0.2em] font-bold mb-1 opacity-80">
              Up Next
            </p>
            <p className="text-gray-400 text-sm font-medium">
              {session.queue.length === 0
                ? "No more teams in queue"
                : `${session.queue.length} team${session.queue.length !== 1 ? "s" : ""} remaining`}
            </p>
          </div>

          {session.queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              {session.completed.length > 0 ? (
                <>
                  <div className="flex flex-col items-center justify-center opacity-50">
                    <p className="text-hackx-arc text-sm font-medium tracking-widest uppercase">All Complete</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl opacity-50">📋</div>
                  <p className="text-gray-500 text-lg font-medium">Queue is empty</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {upcoming.map((team, index) => {
                const waitTime = activeRemainingMin + (index * totalTimePerTeamMin);
                return (
                <div
                  key={team.id}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                    index === 0
                      ? "bg-hackx-cobalt/20 border-hackx-arc shadow-[0_0_20px_rgba(91,184,255,0.3)] animate-[pulse_3s_ease-in-out_infinite]"
                      : "bg-hackx-slate/30 border-hackx-slate/50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                      index === 0
                        ? "bg-hackx-arc text-hackx-navy shadow-[0_0_15px_rgba(91,184,255,0.8)]"
                        : "bg-hackx-void border border-hackx-slate text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-bold text-lg leading-snug truncate ${
                        index === 0 ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {team.name}
                    </span>
                    <span className="text-xs font-medium text-hackx-arc opacity-80 mt-0.5">
                      {totalTimePerTeamMin}m allocated
                    </span>
                  </div>

                  <div className="ml-auto flex flex-col items-end shrink-0 gap-1.5">
                    {index === 0 && (
                      <span className="text-hackx-arc text-[10px] font-black uppercase tracking-[0.2em] bg-hackx-arc/20 px-2 py-0.5 rounded border border-hackx-arc/50 shadow-[0_0_10px_rgba(91,184,255,0.4)]">
                        Up Next
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${index === 0 ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-gray-400'}`}>
                      ~{waitTime} min wait
                    </span>
                  </div>
                </div>
              )})}

              {remaining > 0 && (
                <div className="px-5 py-3 rounded-xl bg-hackx-slate/20 border border-hackx-slate/50 text-center">
                  <span className="text-hackx-arc text-sm font-bold opacity-80">
                    + {remaining} more team{remaining !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {session.completed.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-hackx-cobalt/5 border border-hackx-cobalt/20">
              <span className="text-hackx-arc text-xl drop-shadow-[0_0_5px_rgba(91,184,255,0.8)]">✓</span>
              <span className="text-gray-300 text-sm font-medium">
                <span className="text-white font-bold">{session.completed.length}</span>{" "}
                team{session.completed.length !== 1 ? "s" : ""} completed
              </span>
            </div>
          )}
        </div>
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
