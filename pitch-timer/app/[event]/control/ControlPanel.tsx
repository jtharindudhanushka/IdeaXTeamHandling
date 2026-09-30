"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EVENTS, EVENT_IDS, EventId, Theme } from "@/lib/events";
import { setSession, updateSession } from "@/lib/db";
import { computeRemaining, serverNow, useRemainingSeconds } from "@/lib/clock";
import { formatTime, parseDuration, timerTone } from "@/lib/format";
import { DEFAULT_SESSION, Session, Team } from "@/lib/types";
import { useEventSession } from "@/components/hooks";
import { ControlGate, ControlUser } from "@/components/ControlGate";
import { EventShell, Logo, ProgressBar, toneText } from "@/components/brand";

const uuidv4 = () => crypto.randomUUID();

export default function ControlPanelPage({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  return <ControlGate event={event}>{(user) => <ControlPanel eventId={eventId} user={user} />}</ControlGate>;
}

function ControlPanel({ eventId, user }: { eventId: EventId; user: ControlUser }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
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

  // ── ACTIONS ────────────────────────────────────────────────────────────
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
    await setSession(eventId, {
      ...session,
      status: "idle",
      phase: "pitch",
      currentTeam: team,
      endsAt: null,
      timeRemaining: session.pitchDuration,
      queue,
      completed,
    });
  };

  const handleNextTeam = async () => {
    if (session.queue.length === 0) return;
    await bringOnStage(session.queue[0], 0);
  };

  const handleAddTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    await update({ queue: [...session.queue, { id: uuidv4(), name }] });
    setNewTeamName("");
  };

  const handleRemoveFromQueue = (index: number) => {
    const queue = [...session.queue];
    queue.splice(index, 1);
    return update({ queue });
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
    await update({
      ...(phase === "pitch" ? { pitchDuration: seconds } : { qaDuration: seconds }),
      ...(resetClock ? { timeRemaining: seconds } : {}),
    });
    if (phase === "pitch") setDurationInput(formatTime(seconds));
    else setQaDurationInput(formatTime(seconds));
  };

  const handleSaveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    if (session.currentTeam?.id === id) {
      await update({ currentTeam: { id, name } });
    } else {
      await update({ queue: session.queue.map((t) => (t.id === id ? { ...t, name } : t)) });
    }
    setEditingId(null);
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

  const card = "rounded-3xl bg-surface border border-line p-6";
  const label = "text-xs font-extrabold uppercase tracking-[0.18em] text-muted";
  const input =
    "rounded-xl bg-canvas border border-line px-4 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-fill";
  const btn = "rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary = `${btn} bg-fill text-fill-ink hover:brightness-110`;
  const btnSecondary = `${btn} bg-surface2 text-ink hover:brightness-95`;
  const iconBtn = "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 disabled:opacity-30";

  return (
    <EventShell event={event} theme={session.theme} className="min-h-dvh">
      {/* Header */}
      <header className="bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 mr-auto">
            <Logo src={event.eventLogo[session.theme]} alt={event.name} className="h-10" />
            <Logo src={event.roundLogo[session.theme]} alt={event.round} className="h-8 max-w-[7rem]" />
            <span className="font-extrabold text-sm text-muted uppercase tracking-[0.14em] hidden sm:inline">
              MC Control
            </span>
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

          <div className="flex items-center gap-2 text-sm font-bold">
            <a href={`/${eventId}/pitch`} target="_blank" className="px-3 py-2 rounded-lg hover:bg-surface2">
              Pitch screen ↗
            </a>
            <a href={`/${eventId}/waiting`} target="_blank" className="px-3 py-2 rounded-lg hover:bg-surface2">
              Waiting screen ↗
            </a>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-muted">Screens</span>
            <div className="flex rounded-xl bg-surface2 p-1 font-bold">
              {(["light", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => run(() => handleSetTheme(t))}
                  className={`px-3 py-1 rounded-lg capitalize ${session.theme === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted font-semibold truncate max-w-[14rem]">{user.label}</span>
            {user.signOut && (
              <button onClick={user.signOut} className="font-bold hover:underline">
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-4">
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger px-4 py-3 font-semibold flex justify-between gap-4">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
        {/* LEFT — on stage + durations */}
        <div className="space-y-6">
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={label}>On stage</h2>
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">{status}</span>
            </div>

            {team ? (
              <>
                {editingId === team.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") run(() => handleSaveEdit(team.id));
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={`${input} flex-1 text-lg`}
                      autoFocus
                    />
                    <button onClick={() => run(() => handleSaveEdit(team.id))} className={`${btnPrimary} px-4`}>Save</button>
                    <button onClick={() => setEditingId(null)} className={`${btnSecondary} px-4`}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-display font-black text-2xl truncate flex-1">{team.name}</p>
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
                  </div>
                )}

                <div className="grid grid-cols-2 rounded-xl bg-surface2 p-1 mt-5 font-bold">
                  {(["pitch", "qa"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => run(() => handleSwitchPhase(p))}
                      className={`py-2 rounded-lg ${session.phase === p ? "bg-fill text-fill-ink" : "text-muted hover:text-ink"}`}
                    >
                      {p === "pitch" ? "Pitch" : "Q&A"}
                    </button>
                  ))}
                </div>

                <div className={`tabular font-black text-center text-7xl py-5 tracking-[-0.03em] ${toneText[tone]}`}>
                  {formatTime(timeRemaining)}
                </div>
                <ProgressBar value={duration > 0 ? timeRemaining / duration : 0} tone={tone} className="h-2" />

                <div className="grid grid-cols-2 gap-3 mt-5">
                  {status === "running" ? (
                    <button onClick={() => run(handlePause)} className={`${btn} py-3.5 text-lg bg-warn text-white`}>
                      Pause
                    </button>
                  ) : (
                    <button onClick={() => run(handleStart)} className={`${btnPrimary} py-3.5 text-lg`}>
                      {status === "paused" ? "Resume" : "Start"}
                    </button>
                  )}
                  <button onClick={() => run(handleReset)} disabled={status === "idle"} className={`${btnSecondary} py-3.5 text-lg`}>
                    Reset
                  </button>
                </div>

                {session.queue.length > 0 ? (
                  <button onClick={() => run(handleNextTeam)} className={`${btnSecondary} w-full mt-3 py-3.5 truncate px-4`}>
                    Next team → <span className="text-muted font-semibold">{session.queue[0].name}</span>
                  </button>
                ) : (
                  <button onClick={() => run(handleFinishTeam)} className={`${btnSecondary} w-full mt-3 py-3.5`}>
                    Finish team ✓
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted font-semibold text-lg mb-5">No team on stage</p>
                {session.queue.length > 0 ? (
                  <button onClick={() => run(handleNextTeam)} className={`${btnPrimary} px-6 py-3.5 text-lg max-w-full truncate`}>
                    Bring on {session.queue[0].name} →
                  </button>
                ) : (
                  <p className="text-muted text-sm">Add teams to the queue to begin.</p>
                )}
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className={`${label} mb-4`}>Durations</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["pitch", "Pitch", durationInput, setDurationInput],
                ["qa", "Q&A", qaDurationInput, setQaDurationInput],
              ] as const).map(([phase, name, value, setValue]) => (
                <div key={phase}>
                  <label className="block text-sm font-bold mb-1.5">{name}</label>
                  <div className="flex gap-2">
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && run(() => handleSaveDuration(phase))}
                      placeholder="5:00"
                      className={`${input} tabular w-full min-w-0`}
                    />
                    <button onClick={() => run(() => handleSaveDuration(phase))} className={`${btnPrimary} px-4`}>
                      Set
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted text-xs font-medium mt-3">m:ss or seconds. Changes apply from the next reset or team.</p>
          </section>
        </div>

        {/* RIGHT — queue + completed */}
        <div className="space-y-6">
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={label}>Queue · {session.queue.length}</h2>
              <p className="text-muted text-xs font-semibold">Drag to reorder</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(handleAddTeam);
              }}
              className="flex gap-2 mb-4"
            >
              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Add a team…"
                className={`${input} flex-1 min-w-0`}
              />
              <button type="submit" disabled={!newTeamName.trim()} className={`${btnPrimary} px-5`}>
                Add
              </button>
            </form>

            {session.queue.length === 0 ? (
              <p className="text-center text-muted font-semibold py-10">No teams in the queue.</p>
            ) : (
              <ol className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {session.queue.map((t, index) => (
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
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      dragIndex === index ? "opacity-50 border-fill" : "border-line bg-canvas"
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
                        <button
                          onClick={() => run(() => bringOnStage(t, index))}
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-accent hover:bg-surface2"
                          title="Bring this team on stage now"
                        >
                          On stage
                        </button>
                        <button onClick={() => run(() => handleRemoveFromQueue(index))} className={`${iconBtn} hover:text-danger`} title="Remove">
                          ✕
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {session.completed.length > 0 && (
            <section className={card}>
              <h2 className={`${label} mb-3`}>Completed · {session.completed.length}</h2>
              <ol className="space-y-1 max-h-56 overflow-y-auto">
                {session.completed.map((t, i) => (
                  <li key={`${t.id}-${i}`} className="flex gap-3 px-2 py-1.5 font-semibold text-muted">
                    <span className="tabular w-6 text-right">{i + 1}.</span>
                    <span className="truncate">{t.name}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="text-right">
            <button onClick={() => run(handleFullReset)} className="text-sm font-bold text-danger hover:underline">
              Reset {event.name} session…
            </button>
          </div>
        </div>
      </main>
    </EventShell>
  );
}
