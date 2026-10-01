"use client";

import { EVENTS, EventId } from "@/lib/events";
import { useRemainingSeconds } from "@/lib/clock";
import { formatTime, timerTone } from "@/lib/format";
import { useConnectionLost, useEventSession, useWakeLock } from "@/components/hooks";
import { useIsPreview } from "@/components/ScreenPreview";
import { useTimerAlerts } from "@/components/useTimerAlerts";
import { EventShell, ReconnectingNotice, ScreenCorner, toneText } from "@/components/brand";
import { RingTimer } from "@/components/RingTimer";
import { BrandStill, PartnerSlideshow } from "@/components/scenes";

// Ring diameter — leaves room for the team name above it.
const RING = "min(76vh, 86vw)";

export default function PitchScreen({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
  const connectionLost = useConnectionLost();
  const isPreview = useIsPreview();
  useWakeLock(!isPreview);
  const remaining = useRemainingSeconds(session);
  const soundReady = useTimerAlerts(session.status, remaining);
  const theme = session.theme;

  if (!loaded) return <EventShell event={event} theme={theme} className="h-dvh">{null}</EventShell>;

  const team = session.currentTeam;
  const tone = timerTone(remaining);
  const duration = session.phase === "pitch" ? session.pitchDuration : session.qaDuration;
  const over = remaining < 0;
  // Overtime: full red ring, gently pulsing
  const progress = over ? 1 : duration > 0 ? remaining / duration : 0;

  const phaseLabel = session.phase === "qa" ? "Q&A" : "Pitch";
  const status =
    over ? { label: "Time's up", cls: "text-danger" }
    : session.status === "paused" ? { label: "Paused", cls: "text-warn" }
    : session.status === "idle" ? { label: "Ready", cls: "text-muted" }
    : null;

  // Last 30 s of a running clock flashes; overtime pulses
  const alert = over ? "pulse" : session.status === "running" && remaining <= 30 ? "flash" : undefined;

  // Still scenes, chosen by the MC (the timer keeps running underneath)
  if (session.pitchScene !== "timer") {
    return (
      <EventShell key={session.pitchScene} event={event} theme={theme} className="h-dvh overflow-hidden select-none">
        {session.pitchScene === "brand" ? <BrandStill event={event} theme={theme} /> : <PartnerSlideshow />}
        <ReconnectingNotice show={connectionLost} />
        {!isPreview && <ScreenCorner />}
      </EventShell>
    );
  }

  return (
    <EventShell
      event={event}
      theme={theme}
      key="timer"
      className="scene-in h-dvh flex flex-col items-center justify-center gap-[3.5vh] overflow-hidden select-none px-[4vw]"
    >
      {/* soft light from above for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 38%, rgb(var(--surface) / 0.9), transparent 70%)" }}
      />

      {team ? (
        <>
          <h1 className="relative max-w-full text-center font-black leading-[1.05] tracking-[-0.02em] line-clamp-2 break-words text-[clamp(2.5rem,5.2vw,7rem)]">
            {team.name}
          </h1>

          <RingTimer progress={progress} tone={tone} alert={team ? alert : undefined} size={RING}>
            <div
              className={`tabular font-black leading-none tracking-[-0.04em] ${toneText[tone]}`}
              style={{ fontSize: `calc(var(--d) * ${over ? 0.17 : 0.205})` }}
            >
              {formatTime(remaining)}
            </div>
            <p
              className="mt-[calc(var(--d)*0.025)] font-extrabold uppercase tracking-[0.2em]"
              style={{ fontSize: "calc(var(--d) * 0.032)" }}
            >
              <span className="text-accent">{phaseLabel}</span>
              {status ? (
                <span className={status.cls}> · {status.label}</span>
              ) : (
                <span className="text-muted"> / {formatTime(duration)}</span>
              )}
            </p>
          </RingTimer>
        </>
      ) : (
        <>
          <h1 className="relative text-center font-black leading-[1.05] tracking-[-0.02em] text-[clamp(2.5rem,5.2vw,7rem)]">
            Starting soon
          </h1>
          <RingTimer progress={1} tone="normal" size={RING}>
            {session.queue[0] ? (
              <>
                <p className="font-extrabold uppercase tracking-[0.2em] text-accent" style={{ fontSize: "calc(var(--d) * 0.032)" }}>
                  First up
                </p>
                <p
                  className="mt-[calc(var(--d)*0.02)] px-[calc(var(--d)*0.08)] font-black leading-[1.05] tracking-[-0.02em] line-clamp-3"
                  style={{ fontSize: "calc(var(--d) * 0.08)" }}
                >
                  {session.queue[0].name}
                </p>
              </>
            ) : (
              <p className="font-extrabold uppercase tracking-[0.2em] text-muted" style={{ fontSize: "calc(var(--d) * 0.032)" }}>
                {event.round} {event.stage}
              </p>
            )}
          </RingTimer>
        </>
      )}

      {team && alert === "flash" && <div className="edge-flash" />}
      {team && alert === "pulse" && <div className="edge-pulse" />}
      <ReconnectingNotice show={connectionLost} />
      {!isPreview && <ScreenCorner hint={soundReady ? null : "Click anywhere to enable sound"} />}
    </EventShell>
  );
}
