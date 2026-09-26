"use client";

import { useEffect, useState } from "react";
import { subscribeToSession } from "@/lib/db";
import { Session, DEFAULT_SESSION } from "@/lib/types";

function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

const QUEUE_PREVIEW = 5; // how many upcoming teams to show in full

export default function WaitingPage() {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSession((s) => {
      setSession(s);
      setConnected(true);
    });
    return unsubscribe;
  }, []);

  const isOvertime = session.timeRemaining < 0;
  const isWarning = session.timeRemaining >= 0 && session.timeRemaining <= 60;
  const isTimeUp = session.timeRemaining <= 0 && session.status === "running";

  const timerColor =
    isTimeUp || isOvertime
      ? "text-red-400"
      : isWarning
      ? "text-amber-400"
      : "text-emerald-400";

  const isRunning = session.status === "running";
  const isPaused = session.status === "paused";

  const upcoming = session.queue.slice(0, QUEUE_PREVIEW);
  const remaining = session.queue.length - QUEUE_PREVIEW;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">
            Waiting Room
          </p>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">
            IdeaX Semi-Finals
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? "bg-emerald-500" : "bg-gray-600 animate-pulse"
            }`}
          />
          <span className="text-gray-500 text-xs uppercase tracking-widest">
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT — Current pitch (large) */}
        <div className="flex-1 flex flex-col items-center justify-center px-12 py-10 border-r border-white/10">
          {session.status === "idle" && !session.currentTeam ? (
            <div className="text-center space-y-4">
              <div className="text-7xl mb-2">⏳</div>
              <p className="text-4xl font-black text-white">Standing By</p>
              <p className="text-gray-500 text-xl">Session hasn&apos;t started yet</p>
            </div>
          ) : (
            <div className="w-full max-w-xl text-center space-y-6">
              {/* Status pill */}
              <div className="flex justify-center">
                {isRunning && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Now
                  </span>
                )}
                {isPaused && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold uppercase tracking-widest">
                    ⏸ Paused
                  </span>
                )}
                {session.status === "idle" && session.currentTeam && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-gray-300 text-sm font-semibold uppercase tracking-widest">
                    ⏱ Ready
                  </span>
                )}
              </div>

              {/* Label */}
              <p className="text-gray-400 text-base uppercase tracking-widest font-semibold">
                Currently Pitching
              </p>

              {/* Team name */}
              <h2
                className="font-black text-white leading-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
              >
                {session.currentTeam?.name ?? "—"}
              </h2>

              {/* Timer */}
              <div
                className={`font-mono font-black tabular-nums leading-none ${timerColor} ${
                  isTimeUp || isOvertime ? "pulse-red" : ""
                }`}
                style={{ fontSize: "clamp(4rem, 14vw, 10rem)" }}
              >
                {formatTime(session.timeRemaining)}
              </div>

              {/* Progress bar */}
              {session.pitchDuration > 0 && (
                <div className="h-2 bg-white/10 rounded-full overflow-hidden w-full">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isOvertime || isTimeUp
                        ? "bg-red-500"
                        : isWarning
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (session.timeRemaining / session.pitchDuration) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              )}

              {isOvertime && (
                <p className="text-red-400 font-bold text-lg animate-pulse">
                  🔴 Overtime!
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Queue */}
        <div className="w-[380px] xl:w-[440px] flex flex-col px-8 py-8 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-1">
              Up Next
            </p>
            <p className="text-gray-600 text-sm">
              {session.queue.length === 0
                ? "No more teams in queue"
                : `${session.queue.length} team${session.queue.length !== 1 ? "s" : ""} remaining`}
            </p>
          </div>

          {session.queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              {session.completed.length > 0 ? (
                <>
                  <div className="text-5xl">🎉</div>
                  <p className="text-white font-bold text-2xl">All teams done!</p>
                  <p className="text-gray-500">
                    {session.completed.length} team{session.completed.length !== 1 ? "s" : ""} pitched
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl">📋</div>
                  <p className="text-gray-500 text-lg">Queue is empty</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              {upcoming.map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all slide-in-up ${
                    index === 0
                      ? "bg-violet-500/15 border-violet-500/30 shadow-lg shadow-violet-500/10"
                      : "bg-white/5 border-white/10"
                  }`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Number badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      index === 0
                        ? "bg-violet-500 text-white"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Name */}
                  <span
                    className={`font-semibold text-lg leading-snug truncate ${
                      index === 0 ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {team.name}
                  </span>

                  {index === 0 && (
                    <span className="ml-auto text-violet-400 text-xs font-bold uppercase tracking-widest shrink-0">
                      Next
                    </span>
                  )}
                </div>
              ))}

              {/* Overflow count */}
              {remaining > 0 && (
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-gray-400 text-sm font-medium">
                    + {remaining} more team{remaining !== 1 ? "s" : ""} after these
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Completed count */}
          {session.completed.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-emerald-500 text-lg">✓</span>
              <span className="text-gray-400 text-sm">
                <span className="text-white font-semibold">{session.completed.length}</span>{" "}
                team{session.completed.length !== 1 ? "s" : ""} completed
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
