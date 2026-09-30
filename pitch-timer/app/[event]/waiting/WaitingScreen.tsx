"use client";

import { EVENTS, EventId } from "@/lib/events";
import { useRemainingSeconds } from "@/lib/clock";
import { formatTime, timerTone } from "@/lib/format";
import { useConnectionLost, useEventSession } from "@/components/hooks";
import {
  BrandHeader,
  EventShell,
  ProgressBar,
  ReconnectingNotice,
  ScreenCorner,
  toneText,
} from "@/components/brand";

const QUEUE_PREVIEW = 6;

function formatWait(seconds: number): string {
  const min = Math.ceil(seconds / 60);
  return min < 1 ? "<1 min" : `~${min} min`;
}

export default function WaitingScreen({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
  const connectionLost = useConnectionLost();
  const remaining = useRemainingSeconds(session);
  const theme = session.theme;

  if (!loaded) return <EventShell event={event} theme={theme} className="h-dvh">{null}</EventShell>;

  const team = session.currentTeam;
  const tone = timerTone(remaining);
  const duration = session.phase === "pitch" ? session.pitchDuration : session.qaDuration;
  const progress = duration > 0 ? remaining / duration : 0;

  const upcoming = session.queue.slice(0, QUEUE_PREVIEW);
  const moreCount = session.queue.length - upcoming.length;

  // Time left for the team on stage: rest of this phase, plus Q&A if still pitching
  const perTeamSec = session.pitchDuration + session.qaDuration;
  const onStageSec = team
    ? Math.max(0, remaining) + (session.phase === "pitch" ? session.qaDuration : 0)
    : 0;

  const phaseLabel = session.phase === "qa" ? "in Q&A" : "pitching";
  const state =
    remaining < 0 ? { label: "Time's up", cls: "text-danger" }
    : session.status === "paused" ? { label: "Paused", cls: "text-warn" }
    : session.status === "idle" ? { label: "Getting ready", cls: "text-muted" }
    : null;

  return (
    <EventShell event={event} theme={theme} className="h-dvh flex flex-col overflow-hidden select-none">
      <BrandHeader event={event} theme={theme} />

      <main className="flex-1 min-h-0 grid grid-cols-[1.25fr_1fr] gap-[2.5vw] px-[3.5vw] pb-[4vh] pt-[1vh]">
        {/* Now on stage */}
        <section className="rounded-[2rem] bg-surface border border-line flex flex-col justify-center px-[3.5vw] py-[4vh] min-h-0">
          {team ? (
            <>
              <p className="font-extrabold uppercase tracking-[0.22em] text-[clamp(0.9rem,1.3vw,1.7rem)]">
                <span className="text-accent">Now {phaseLabel}</span>
                {state && <span className={`${state.cls} ml-[0.8vw]`}>• {state.label}</span>}
              </p>
              <h1 className="mt-[1.5vh] font-display font-black leading-[1.05] break-words line-clamp-2 text-[clamp(2rem,3.8vw,5rem)]">
                {team.name}
              </h1>
              <div
                className={`tabular font-black leading-[0.9] tracking-[-0.04em] mt-[3vh] ${toneText[tone]}`}
                style={{ fontSize: remaining < 0 ? "min(11vw, 30vh)" : "min(13.5vw, 30vh)" }}
              >
                {formatTime(remaining)}
              </div>
              <ProgressBar value={progress} tone={tone} className="h-[1.1vh] mt-[3.5vh]" />
            </>
          ) : (
            <>
              <p className="font-extrabold text-accent text-[clamp(1.1rem,1.8vw,2.3rem)]">
                {event.round} {event.stage}
              </p>
              <h1 className="mt-[1.5vh] font-display font-black leading-[1.05] text-[clamp(2.5rem,4.5vw,6rem)]">
                Starting soon
              </h1>
              <p className="mt-[2vh] text-muted font-semibold text-[clamp(1rem,1.6vw,2rem)]">
                Please stay nearby — your team will be called.
              </p>
            </>
          )}
        </section>

        {/* Queue */}
        <section className="flex flex-col min-h-0">
          <div className="flex items-baseline justify-between px-[0.5vw] pb-[2vh]">
            <h2 className="font-extrabold uppercase tracking-[0.22em] text-accent text-[clamp(0.9rem,1.3vw,1.7rem)]">
              Up next
            </h2>
            <p className="font-bold text-muted text-[clamp(0.85rem,1.1vw,1.4rem)]">
              {session.queue.length} waiting
              {session.completed.length > 0 && ` · ${session.completed.length} done`}
            </p>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex-1 rounded-[2rem] border-2 border-dashed border-line flex items-center justify-center">
              <p className="font-bold text-muted text-[clamp(1rem,1.6vw,2rem)]">
                {session.completed.length > 0 ? "All teams have pitched" : "Queue is empty"}
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-[1.2vh] min-h-0">
              {upcoming.map((t, i) => {
                const isNext = i === 0;
                const waitSec = onStageSec + i * perTeamSec;
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-[1.2vw] rounded-2xl px-[1.4vw] py-[1.6vh] border ${
                      isNext ? "bg-fill border-fill text-fill-ink" : "bg-surface border-line"
                    }`}
                  >
                    <span
                      className={`tabular shrink-0 w-[2.8vw] min-w-8 aspect-square rounded-xl flex items-center justify-center font-black text-[clamp(0.9rem,1.4vw,1.8rem)] ${
                        isNext ? "bg-fill-ink/20" : "bg-surface2 text-accent"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-bold text-[clamp(1rem,1.75vw,2.3rem)]">
                      {t.name}
                    </span>
                    <span className={`shrink-0 font-bold tabular text-[clamp(0.85rem,1.25vw,1.6rem)] ${isNext ? "" : "text-muted"}`}>
                      {isNext && !team ? "Next" : formatWait(waitSec)}
                    </span>
                  </li>
                );
              })}
              {moreCount > 0 && (
                <li className="px-[1.4vw] pt-[0.5vh] font-bold text-muted text-[clamp(0.85rem,1.2vw,1.5rem)]">
                  + {moreCount} more team{moreCount !== 1 ? "s" : ""}
                </li>
              )}
            </ol>
          )}
        </section>
      </main>

      <ReconnectingNotice show={connectionLost} />
      <ScreenCorner />
    </EventShell>
  );
}
