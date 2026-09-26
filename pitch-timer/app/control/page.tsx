"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { subscribeToSession, setSession, updateSession } from "@/lib/db";
import { Session, Team, DEFAULT_SESSION } from "@/lib/types";
const uuidv4 = () => crypto.randomUUID();

function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

function parseDuration(value: string): number {
  const trimmed = value.trim();
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  return parseInt(trimmed, 10) || 0;
}

export default function ControlPage() {
  const [session, setLocalSession] = useState<Session>(DEFAULT_SESSION);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [durationInput, setDurationInput] = useState("5:00");
  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<Session>(DEFAULT_SESSION);
  const dragOverRef = useRef<number | null>(null);

  // Keep ref in sync for timer callback
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Subscribe to Firebase
  useEffect(() => {
    const unsubscribe = subscribeToSession((s) => {
      setLocalSession(s);
      if (!isInitialized) {
        setDurationInput(formatTime(s.pitchDuration));
        setIsInitialized(true);
      }
    });
    return unsubscribe;
  }, [isInitialized]);

  // Server-side timer tick — control page drives the clock
  const tickTimer = useCallback(async () => {
    const s = sessionRef.current;
    if (s.status !== "running") return;

    const newTime = s.timeRemaining - 1;
    await updateSession({ timeRemaining: newTime });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session.status === "running") {
      timerRef.current = setInterval(tickTimer, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.status, tickTimer]);

  // ── ACTIONS ────────────────────────────────────────────────────────────

  async function handleStart() {
    await updateSession({ status: "running" });
  }

  async function handlePause() {
    await updateSession({ status: "paused" });
  }

  async function handleResume() {
    await updateSession({ status: "running" });
  }

  async function handleReset() {
    await updateSession({
      status: "idle",
      timeRemaining: session.pitchDuration,
    });
  }

  async function handleNextTeam() {
    if (session.queue.length === 0) return;
    const [next, ...rest] = session.queue;
    const completed = session.currentTeam
      ? [...session.completed, session.currentTeam]
      : session.completed;
    await setSession({
      ...session,
      status: "idle",
      currentTeam: next,
      timeRemaining: session.pitchDuration,
      queue: rest,
      completed,
    });
  }

  async function handleSkipTo(team: Team, index: number) {
    const completed = session.currentTeam
      ? [...session.completed, session.currentTeam]
      : session.completed;
    const newQueue = [...session.queue];
    newQueue.splice(index, 1);
    await setSession({
      ...session,
      status: "idle",
      currentTeam: team,
      timeRemaining: session.pitchDuration,
      queue: newQueue,
      completed,
    });
  }

  async function handleAddTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    const team: Team = { id: uuidv4(), name };
    const newQueue = [...session.queue, team];
    await updateSession({ queue: newQueue });
    setNewTeamName("");
  }

  async function handleRemoveFromQueue(index: number) {
    const newQueue = [...session.queue];
    newQueue.splice(index, 1);
    await updateSession({ queue: newQueue });
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newQueue = [...session.queue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    await updateSession({ queue: newQueue });
  }

  async function handleMoveDown(index: number) {
    if (index === session.queue.length - 1) return;
    const newQueue = [...session.queue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    await updateSession({ queue: newQueue });
  }

  async function handleSaveDuration() {
    const seconds = parseDuration(durationInput);
    if (seconds <= 0) return;
    await updateSession({
      pitchDuration: seconds,
      timeRemaining: seconds,
    });
  }

  async function handleSaveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    if (session.currentTeam?.id === id) {
      await updateSession({ currentTeam: { id, name } });
    } else {
      const newQueue = session.queue.map((t) => (t.id === id ? { ...t, name } : t));
      await updateSession({ queue: newQueue });
    }
    setEditingId(null);
  }

  async function handleFullReset() {
    if (!confirm("Reset everything? This clears all teams and the timer.")) return;
    await setSession(DEFAULT_SESSION);
    setDurationInput("5:00");
  }

  // Drag and drop for queue
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverRef.current = index;
  }

  async function handleDrop() {
    if (dragIndex === null || dragOverRef.current === null) return;
    if (dragIndex === dragOverRef.current) return;
    const newQueue = [...session.queue];
    const [moved] = newQueue.splice(dragIndex, 1);
    newQueue.splice(dragOverRef.current, 0, moved);
    await updateSession({ queue: newQueue });
    setDragIndex(null);
    dragOverRef.current = null;
  }

  // ── DERIVED ────────────────────────────────────────────────────────────
  const isRunning = session.status === "running";
  const isPaused = session.status === "paused";
  const isIdle = session.status === "idle";
  const isDone = session.status === "done";
  const hasCurrentTeam = !!session.currentTeam;

  const timeColor =
    session.timeRemaining <= 0
      ? "text-red-400"
      : session.timeRemaining <= 60
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            🎙️ IdeaX Control Panel
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">MC Dashboard — not public</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border ${
              isRunning
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : isPaused
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            {session.status}
          </span>
          <button
            onClick={handleFullReset}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            Full Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Current Team + Timer */}
        <div className="xl:col-span-1 space-y-4">
          {/* Timer Card */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Now Pitching
            </h2>
            {hasCurrentTeam ? (
              <>
                <div className="mb-4">
                  {editingId === session.currentTeam!.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(session.currentTeam!.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(session.currentTeam!.id)}
                        className="px-3 py-2 bg-violet-600 rounded-lg text-sm font-medium hover:bg-violet-500 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold text-white truncate flex-1">
                        {session.currentTeam!.name}
                      </p>
                      <button
                        onClick={() => {
                          setEditingId(session.currentTeam!.id);
                          setEditingName(session.currentTeam!.name);
                        }}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>

                {/* Big Timer */}
                <div className={`text-7xl font-mono font-black text-center py-4 ${timeColor}`}>
                  {formatTime(session.timeRemaining)}
                </div>

                {/* Timer Controls */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {isIdle && (
                    <button
                      onClick={handleStart}
                      className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg transition-all active:scale-95"
                    >
                      ▶ Start
                    </button>
                  )}
                  {isRunning && (
                    <>
                      <button
                        onClick={handlePause}
                        className="py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-all active:scale-95"
                      >
                        ⏸ Pause
                      </button>
                      <button
                        onClick={handleReset}
                        className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all active:scale-95"
                      >
                        ↺ Reset
                      </button>
                    </>
                  )}
                  {isPaused && (
                    <>
                      <button
                        onClick={handleResume}
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all active:scale-95"
                      >
                        ▶ Resume
                      </button>
                      <button
                        onClick={handleReset}
                        className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all active:scale-95"
                      >
                        ↺ Reset
                      </button>
                    </>
                  )}
                  {isDone && (
                    <button
                      onClick={handleReset}
                      className="col-span-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all active:scale-95"
                    >
                      ↺ Reset Timer
                    </button>
                  )}
                </div>

                {/* Next Team Button */}
                <button
                  onClick={handleNextTeam}
                  disabled={session.queue.length === 0}
                  className="w-full mt-3 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all active:scale-95"
                >
                  Next Team →
                  {session.queue.length > 0 && (
                    <span className="ml-2 text-violet-300 font-normal text-sm">
                      ({session.queue[0].name})
                    </span>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg mb-4">No team pitching</p>
                {session.queue.length > 0 && (
                  <button
                    onClick={handleNextTeam}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Start First Team →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Duration Settings */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Pitch Duration
            </h2>
            <div className="flex gap-2">
              <input
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveDuration()}
                placeholder="5:00"
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleSaveDuration}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors"
              >
                Set
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Format: m:ss or total seconds. Current: {formatTime(session.pitchDuration)}
            </p>
          </div>

          {/* Completed */}
          {session.completed.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Completed ({session.completed.length})
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.completed.map((team, i) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                  >
                    <span className="text-emerald-500 text-sm">✓</span>
                    <span className="text-gray-300 text-sm flex-1 truncate">
                      {i + 1}. {team.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Queue Management */}
        <div className="xl:col-span-2 space-y-4">
          {/* Add Team */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Add Team to Queue
            </h2>
            <div className="flex gap-2">
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                placeholder="Team name..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Queue ({session.queue.length} teams)
              </h2>
              <p className="text-gray-600 text-xs">Drag to reorder</p>
            </div>

            {session.queue.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <p className="text-4xl mb-3">📋</p>
                <p>No teams in queue. Add teams above.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {session.queue.map((team, index) => (
                  <div
                    key={team.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      dragIndex === index
                        ? "bg-violet-500/20 border-violet-500/50 opacity-60"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Drag Handle */}
                    <div className="drag-handle text-gray-600 hover:text-gray-400 transition-colors select-none">
                      ⠿
                    </div>

                    {/* Position */}
                    <span className="text-gray-500 font-mono text-sm w-5 text-center shrink-0">
                      {index + 1}
                    </span>

                    {/* Name / Edit */}
                    <div className="flex-1 min-w-0">
                      {editingId === team.id ? (
                        <div className="flex gap-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(team.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(team.id)}
                            className="px-2 py-1 bg-violet-600 rounded text-xs hover:bg-violet-500 transition-colors"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-white font-medium truncate block">
                          {team.name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {editingId !== team.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === session.queue.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(team.id);
                            setEditingName(team.name);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors text-xs"
                          title="Edit name"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleSkipTo(team, index)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors text-xs font-medium"
                          title="Skip to this team now"
                        >
                          Skip to
                        </button>
                        <button
                          onClick={() => handleRemoveFromQueue(index)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs"
                          title="Remove from queue"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
