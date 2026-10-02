"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EVENTS, EVENT_IDS, EventId, Theme } from "@/lib/events";
import { setSession, updateSession } from "@/lib/db";
import { computeRemaining, serverNow, useRemainingSeconds } from "@/lib/clock";
import { formatTime, parseDuration, timerTone } from "@/lib/format";
import { DEFAULT_SESSION, PitchScene, Session, Team, WaitingScene } from "@/lib/types";
import { SyncStatus, useEventSession, useSyncStatus, useWakeLock } from "@/components/hooks";
import { isFirebaseConfigured } from "@/lib/firebase";
import { ControlGate, ControlUser } from "@/components/ControlGate";
import { EventShell, Logo, ProgressBar, toneText } from "@/components/brand";
import { ScreenPreview } from "@/components/ScreenPreview";

const uuidv4 = () => crypto.randomUUID();

// Shared styles
const card = "rounded-3xl bg-surface border border-line p-5";
const label = "text-xs font-extrabold uppercase tracking-[0.18em] text-muted";
const input = "rounded-xl bg-canvas border border-line px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-fill";
const btn = "rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-fill text-fill-ink hover:brightness-110`;
const btnSecondary = `${btn} bg-surface2 text-ink hover:brightness-95`;
const iconBtn = "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 disabled:opacity-30";

export default function ControlPanelPage({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  return <ControlGate event={event}>{(user) => <ControlPanel eventId={eventId} user={user} />}</ControlGate>;
}

function ControlPanel({ eventId, user }: { eventId: EventId; user: ControlUser }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
  const sync = useSyncStatus();
  useWakeLock();
  const timeRemaining = useRemainingSeconds(session);

  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [durationInput, setDurationInput] = useState("5:00");
  const [qaDurationInput, setQaDurationInput] = useState("3:00");
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const initializedRef = useRef(false);
  const dragOverRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loaded || initializedRef.current) return;
    setDurationInput(formatTime(session.pitchDuration));
    setQaDurationInput(formatTime(session.qaDuration));
    initializedRef.current = true;
  }, [loaded, session.pitchDuration, session.qaDuration]);

  const update = (u: Partial<Session>) => updateSession(eventId, u);

  // Runs a write and surfaces failures (e.g. permission denied) instead of failing silently.
  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      setError(
        code.toUpperCase().includes("PERMISSION")
          ? "Permission denied — this account can't control this event."
          : "Couldn't save the change. Check your connection and try again."
      );
    }
  }

  // ── SCENES ─────────────────────────────────────────────────────────────
  // What each screen shows is only changed here, never by timer actions.

  const setPitchScene = (pitchScene: PitchScene) => update({ pitchScene });
  const setWaitingScene = (waitingScene: WaitingScene) => update({ waitingScene });

  // Show "Get ready" for a team on the waiting screen (press again to go back to Teams)
  const handleCall = (team: Team) =>
    session.waitingScene === "call" && session.spotlight?.id === team.id
      ? update({ waitingScene: "teams" })
      : update({ spotlight: { id: team.id, name: team.name }, waitingScene: "call" });

  // ── TIMER ──────────────────────────────────────────────────────────────
  // The clock is driven by `endsAt` (server time), not by this tab ticking,
  // so it keeps running if this tab is backgrounded, closed, or opened twice.

  const handleStart = () =>
    update({ status: "running", endsAt: serverNow() + session.timeRemaining * 1000 });

  const handlePause = () =>
    update({ status: "paused", timeRemaining: computeRemaining(session), endsAt: null });

  const handleReset = () =>
    update({
      status: "idle",
      endsAt: null,
      timeRemaining: session.phase === "pitch" ? session.pitchDuration : session.qaDuration,
    });

  const handleSwitchPhase = (phase: Session["phase"]) =>
    update({
      status: "idle",
      phase,
      endsAt: null,
      timeRemaining: phase === "pitch" ? session.pitchDuration : session.qaDuration,
    });

  // ── TEAMS ──────────────────────────────────────────────────────────────

  const handleFinishTeam = async () => {
    if (!session.currentTeam) return;
    await update({
      status: "idle",
      phase: "pitch",
      endsAt: null,
      currentTeam: null,
      timeRemaining: session.pitchDuration,
      completed: [...session.completed, session.currentTeam],
    });
  };

  const bringOnStage = async (team: Team, queueIndex: number) => {
    const completed = session.currentTeam ? [...session.completed, session.currentTeam] : session.completed;
    const queue = [...session.queue];
    queue.splice(queueIndex, 1);
    // If the waiting screen was calling this team, it goes back to the team list
    const wasCalled = session.waitingScene === "call" && session.spotlight?.id === team.id;
    await setSession(eventId, {
      ...session,
      status: "idle",
      phase: "pitch",
      currentTeam: team,
      endsAt: null,
      timeRemaining: session.pitchDuration,
      queue,
      completed,
      ...(wasCalled ? { waitingScene: "teams" as const, spotlight: null } : {}),
    });
  };

  const handleNextTeam = async () => {
    if (session.queue.length === 0) return;
    await bringOnStage(session.queue[0], 0);
  };

  const handleAddTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setNewTeamName("");
    await update({ queue: [...session.queue, { id: uuidv4(), name }] });
  };

  const handleRemoveFromQueue = (index: number) => {
    const queue = [...session.queue];
    const [removed] = queue.splice(index, 1);
    const wasCalled = session.spotlight?.id === removed?.id;
    return update({ queue, ...(wasCalled ? { spotlight: null, waitingScene: "teams" as const } : {}) });
  };

  // Put a finished team back at the end of the queue (e.g. to pitch again)
  const handleRequeue = (index: number) => {
    const completed = [...session.completed];
    const [team] = completed.splice(index, 1);
    if (!team) return Promise.resolve();
    return update({ completed, queue: [...session.queue, team] });
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= session.queue.length) return Promise.resolve();
    const queue = [...session.queue];
    [queue[index], queue[target]] = [queue[target], queue[index]];
    return update({ queue });
  };

  const handleSaveDuration = async (phase: Session["phase"]) => {
    const seconds = parseDuration(phase === "pitch" ? durationInput : qaDurationInput);
    if (seconds <= 0) return;
    // Only reset the clock if it isn't mid-pitch
    const resetClock = session.phase === phase && session.status === "idle";
    if (phase === "pitch") setDurationInput(formatTime(seconds));
    else setQaDurationInput(formatTime(seconds));
    await update({
      ...(phase === "pitch" ? { pitchDuration: seconds } : { qaDuration: seconds }),
      ...(resetClock ? { timeRemaining: seconds } : {}),
    });
  };

  const handleSaveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    setEditingId(null);
    if (session.currentTeam?.id === id) {
      await update({ currentTeam: { id, name } });
    } else {
      await update({ queue: session.queue.map((t) => (t.id === id ? { ...t, name } : t)) });
    }
  };

  const handleSetTheme = (theme: Theme) => update({ theme });

  const handleFullReset = async () => {
    if (!confirm(`Reset ${event.name}? This clears all teams and the timer.`)) return;
    await setSession(eventId, { ...DEFAULT_SESSION, theme: session.theme });
    setDurationInput(formatTime(DEFAULT_SESSION.pitchDuration));
    setQaDurationInput(formatTime(DEFAULT_SESSION.qaDuration));
  };

  const handleDrop = async () => {
    const from = dragIndex;
    const to = dragOverRef.current;
    setDragIndex(null);
    dragOverRef.current = null;
    if (from === null || to === null || from === to) return;
    const queue = [...session.queue];
    const [moved] = queue.splice(from, 1);
    queue.splice(to, 0, moved);
    await update({ queue });
  };

  // ── DERIVED ────────────────────────────────────────────────────────────
  const team = session.currentTeam;
  const { status } = session;
  const tone = timerTone(timeRemaining);
  const duration = session.phase === "pitch" ? session.pitchDuration : session.qaDuration;
  const nextTeam = session.queue[0];
  const calling = session.waitingScene === "call" ? session.spotlight : null;

  const statusChip =
    status === "running"
      ? { text: "Running", cls: "bg-fill text-fill-ink" }
      : status === "paused"
      ? { text: "Paused", cls: "bg-warn text-white" }
      : { text: "Ready", cls: "bg-surface2 text-muted" };

  return (
    <EventShell event={event} theme={session.theme} className="min-h-dvh">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-line">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-3 mr-auto">
            <Logo src={event.eventLogo[session.theme]} alt={event.name} className="h-9" />
            <Logo src={event.roundLogo[session.theme]} alt={event.round} className="h-7 max-w-[7rem]" />
            <span className="font-extrabold text-sm text-muted uppercase tracking-[0.14em] hidden sm:inline">MC Control</span>
          </div>

          <nav className="flex rounded-xl bg-surface2 p-1 text-sm font-bold">
            {EVENT_IDS.map((id) => (
              <Link
                key={id}
                href={`/${id}/control`}
                className={`px-3 py-1.5 rounded-lg ${id === eventId ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {EVENTS[id].name}
              </Link>
            ))}
          </nav>

          <SyncBadge {...sync} />

          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-muted">Screens</span>
            <Segmented
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              value={session.theme}
              onChange={(t) => run(() => handleSetTheme(t as Theme))}
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted font-semibold truncate max-w-[12rem]">{user.label}</span>
            {user.signOut && (
              <button onClick={user.signOut} className="font-bold hover:underline">
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-4 lg:p-6 space-y-5">
        {/* ── Screens: preview + scene switcher for each display ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ScreenPanel
            title="Pitching room"
            href={`/${eventId}/pitch`}
            scenes={[
              { value: "timer", label: "Timer" },
              { value: "brand", label: "Brand still" },
              { value: "partners", label: "Partners" },
            ]}
            active={session.pitchScene}
            onSelect={(s) => run(() => setPitchScene(s as PitchScene))}
          />
          <ScreenPanel
            title="Waiting room"
            href={`/${eventId}/waiting`}
            scenes={[
              { value: "teams", label: "Teams" },
              {
                value: "call",
                label: session.spotlight ? `Call · ${session.spotlight.name}` : "Call (pick a team)",
                disabled: !session.spotlight,
              },
              { value: "brand", label: "Brand still" },
              { value: "partners", label: "Partners" },
            ]}
            active={session.waitingScene === "call" && !session.spotlight ? "teams" : session.waitingScene}
            onSelect={(s) => run(() => setWaitingScene(s as WaitingScene))}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-5 items-start">
          {/* ── Stage: timer controls (fixed layout — buttons never move) ── */}
          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className={label}>On stage</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] ${statusChip.cls}`}>
                {statusChip.text}
              </span>
            </div>

            <div className="h-12 mt-3 flex items-center gap-2">
              {team && editingId === team.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") run(() => handleSaveEdit(team.id));
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className={`${input} flex-1 min-w-0 text-lg`}
                    autoFocus
                  />
                  <button onClick={() => run(() => handleSaveEdit(team.id))} className={`${btnPrimary} px-4 py-2`}>Save</button>
                  <button onClick={() => setEditingId(null)} className={`${btnSecondary} px-4 py-2`}>Cancel</button>
                </>
              ) : (
                <>
                  <p className={`font-black text-2xl truncate flex-1 ${team ? "" : "text-muted"}`}>{team ? team.name : "No team on stage"}</p>
                  {team && (
                    <button
                      onClick={() => {
                        setEditingId(team.id);
                        setEditingName(team.name);
                      }}
                      className={iconBtn}
                      title="Edit name"
                    >
                      ✎
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Phase — switching mid-pitch resets the clock, so it asks to confirm */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1 mt-3 font-bold">
              {(["pitch", "qa"] as const).map((p) =>
                session.phase === p ? (
                  <span key={p} className="py-2 rounded-lg bg-fill text-fill-ink text-center">
                    {p === "pitch" ? "Pitch" : "Q&A"}
                  </span>
                ) : (
                  <ConfirmButton
                    key={p}
                    needsConfirm={status !== "idle"}
                    confirmLabel="Resets timer — tap again"
                    onConfirm={() => run(() => handleSwitchPhase(p))}
                    disabled={!team}
                    className="py-2 rounded-lg text-muted hover:text-ink text-sm"
                  >
                    {p === "pitch" ? "Pitch" : "Q&A"}
                  </ConfirmButton>
                )
              )}
            </div>

            <div className={`tabular font-black text-center text-7xl py-4 tracking-[-0.03em] ${team ? toneText[tone] : "text-muted"}`}>
              {formatTime(timeRemaining)}
            </div>
            <ProgressBar value={duration > 0 ? timeRemaining / duration : 0} tone={tone} className="h-2" />

            {/* Start/Pause always sits in the same spot */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {status === "running" ? (
                <button onClick={() => run(handlePause)} className={`${btn} col-span-2 h-14 text-lg bg-warn text-white`}>
                  ❚❚ Pause
                </button>
              ) : (
                <button onClick={() => run(handleStart)} disabled={!team} className={`${btnPrimary} col-span-2 h-14 text-lg`}>
                  ▶ {status === "paused" ? "Resume" : "Start"}
                </button>
              )}
              <ConfirmButton
                confirmLabel="Tap to reset"
                onConfirm={() => run(handleReset)}
                disabled={status === "idle"}
                className={`${btnSecondary} h-14`}
              >
                ↺ Reset
              </ConfirmButton>
            </div>

            <ConfirmButton
              confirmLabel={nextTeam ? `Tap again — bring on ${nextTeam.name}` : "Tap again to finish"}
              onConfirm={() => run(nextTeam ? handleNextTeam : handleFinishTeam)}
              disabled={!nextTeam && !team}
              className={`${btnSecondary} w-full h-12 mt-3 px-4 truncate`}
            >
              {nextTeam ? (
                <>
                  {team ? "Next team" : "Bring on first team"} → <span className="text-muted font-semibold">{nextTeam.name}</span>
                </>
              ) : (
                "Finish team ✓"
              )}
            </ConfirmButton>

            {/* Durations */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-line">
              {([
                ["pitch", "Pitch", durationInput, setDurationInput],
                ["qa", "Q&A", qaDurationInput, setQaDurationInput],
              ] as const).map(([phase, name, value, setValue]) => (
                <div key={phase} className="flex items-center gap-2">
                  <label className="text-sm font-bold w-10 shrink-0">{name}</label>
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && run(() => handleSaveDuration(phase))}
                    placeholder="5:00"
                    className={`${input} tabular w-full min-w-0`}
                  />
                  <button onClick={() => run(() => handleSaveDuration(phase))} className={`${btnSecondary} px-3 py-2 text-sm`}>
                    Set
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Queue ── */}
          <section className={card}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={label}>Queue · {session.queue.length}</h2>
              <p className="text-muted text-xs font-semibold">Drag to reorder · Call shows “Get ready” on the waiting screen</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(handleAddTeam);
              }}
              className="flex gap-2 mb-3"
            >
              <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Add a team…" className={`${input} flex-1 min-w-0`} />
              <button type="submit" disabled={!newTeamName.trim()} className={`${btnPrimary} px-5`}>
                Add
              </button>
            </form>

            {session.queue.length === 0 ? (
              <p className="text-center text-muted font-semibold py-10">No teams in the queue.</p>
            ) : (
              <ol className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {session.queue.map((t, index) => {
                  const isCalled = calling?.id === t.id;
                  return (
                    <li
                      key={t.id}
                      draggable={editingId !== t.id}
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        dragOverRef.current = index;
                      }}
                      onDrop={() => run(handleDrop)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        dragOverRef.current = null;
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                        dragIndex === index ? "opacity-50 border-fill" : isCalled ? "border-fill bg-fill/10" : "border-line bg-canvas"
                      }`}
                    >
                      <span className="drag-handle text-muted select-none px-1" aria-hidden>⠿</span>
                      <span className="tabular w-6 text-center font-extrabold text-accent">{index + 1}</span>

                      {editingId === t.id ? (
                        <div className="flex gap-2 flex-1 min-w-0">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") run(() => handleSaveEdit(t.id));
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className={`${input} py-1.5 flex-1 min-w-0`}
                            autoFocus
                          />
                          <button onClick={() => run(() => handleSaveEdit(t.id))} className={`${btnPrimary} px-3 text-sm`}>Save</button>
                          <button onClick={() => setEditingId(null)} className={`${btnSecondary} px-3 text-sm`}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 min-w-0 truncate font-bold">{t.name}</span>
                          <button
                            onClick={() => run(() => handleCall(t))}
                            className={`shrink-0 w-[5.5rem] rounded-lg py-1.5 text-xs font-extrabold ${
                              isCalled ? "bg-fill text-fill-ink" : "bg-surface2 text-accent hover:brightness-95"
                            }`}
                            title={isCalled ? "Back to the team list on the waiting screen" : "Show “Get ready” for this team on the waiting screen"}
                          >
                            {isCalled ? "● On screen" : "📣 Call"}
                          </button>
                          <button onClick={() => run(() => handleMove(index, -1))} disabled={index === 0} className={iconBtn} title="Move up">↑</button>
                          <button onClick={() => run(() => handleMove(index, 1))} disabled={index === session.queue.length - 1} className={iconBtn} title="Move down">↓</button>
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEditingName(t.name);
                            }}
                            className={iconBtn}
                            title="Edit name"
                          >
                            ✎
                          </button>
                          <ConfirmButton
                            confirmLabel="Sure?"
                            onConfirm={() => run(() => bringOnStage(t, index))}
                            className="shrink-0 w-[4.5rem] rounded-lg py-1.5 text-xs font-bold text-accent hover:bg-surface2"
                            title="Bring this team on stage now"
                          >
                            On stage
                          </ConfirmButton>
                          <ConfirmButton
                            confirmLabel="✕?"
                            onConfirm={() => run(() => handleRemoveFromQueue(index))}
                            className={`${iconBtn} hover:text-danger`}
                            title="Remove from queue"
                          >
                            ✕
                          </ConfirmButton>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <details className="mt-4 pt-3 border-t border-line">
              <summary className={`${label} cursor-pointer select-none`}>Completed · {session.completed.length}</summary>
              <ol className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {session.completed.map((t, i) => (
                  <li key={`${t.id}-${i}`} className="flex items-center gap-3 px-2 py-1 font-semibold text-muted">
                    <span className="tabular w-6 text-right">{i + 1}.</span>
                    <span className="flex-1 min-w-0 truncate">{t.name}</span>
                    <button
                      onClick={() => run(() => handleRequeue(i))}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-accent hover:bg-surface2"
                      title="Add this team back to the end of the queue"
                    >
                      ↩ Back to queue
                    </button>
                  </li>
                ))}
              </ol>
              <button onClick={() => run(handleFullReset)} className="mt-3 text-sm font-bold text-danger hover:underline">
                Reset {event.name} session…
              </button>
            </details>
          </section>
        </div>
      </main>

      {/* Errors float instead of pushing the layout around */}
      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-lg rounded-xl border border-danger/40 bg-surface text-danger shadow-lg px-4 py-3 font-semibold flex gap-4">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </EventShell>
  );
}

// One display: live preview on the left, scene buttons on the right.
function ScreenPanel({
  title,
  href,
  scenes,
  active,
  onSelect,
}: {
  title: string;
  href: string;
  scenes: { value: string; label: string; disabled?: boolean }[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <section className={card}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={label}>{title}</h2>
        <a href={href} target="_blank" rel="noreferrer" className="text-sm font-bold text-muted hover:text-ink">
          Open full screen ↗
        </a>
      </div>
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 items-start">
        <ScreenPreview href={href} label={title} />
        <div className="flex flex-col gap-2">
          {scenes.map((s) => {
            const on = s.value === active;
            return (
              <button
                key={s.value}
                onClick={() => !on && onSelect(s.value)}
                disabled={s.disabled}
                className={`${btn} h-11 px-3 text-sm text-left flex items-center gap-2 border ${
                  on ? "bg-fill text-fill-ink border-fill" : "bg-canvas border-line text-ink hover:border-fill"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-white live-dot" : "bg-line"}`} />
                <span className="truncate">{s.label}</span>
                {on && <span className="ml-auto text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-80">On air</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-xl bg-surface2 p-1 font-bold">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => o.value !== value && onChange(o.value)}
          className={`px-3 py-1 rounded-lg ${value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Two-tap button for actions that are hard to undo: the first tap arms it
// (turning amber), a second tap within 3 s performs the action.
function ConfirmButton({
  onConfirm,
  confirmLabel,
  needsConfirm = true,
  disabled,
  className = "",
  title,
  children,
}: {
  onConfirm: () => void;
  confirmLabel: string;
  needsConfirm?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={() => {
        if (!needsConfirm || armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`${className} ${armed ? "!bg-warn !text-white" : ""}`}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

// Tells the MC whether their changes have reached the screens.
function SyncBadge({ connected, pending }: SyncStatus) {
  if (!isFirebaseConfigured) return null;
  const plural = pending === 1 ? "" : "s";
  const [dot, text, box] =
    connected === false
      ? ["bg-warn", pending ? `Offline · ${pending} change${plural} waiting` : "Offline", "bg-warn/10 border-warn/40 text-warn"]
      : connected === null
      ? ["bg-muted", "Connecting…", "border-line text-muted"]
      : pending
      ? ["bg-fill animate-pulse", "Saving…", "border-line text-muted"]
      : ["bg-emerald-500", "Synced", "border-line text-muted"];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${box}`} title="Whether your changes have reached the screens">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </span>
  );
}
