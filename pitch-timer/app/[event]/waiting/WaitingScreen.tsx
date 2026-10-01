"use client";

import { EVENTS, EventId } from "@/lib/events";
import { useRemainingSeconds } from "@/lib/clock";
import { useConnectionLost, useEventSession, useWakeLock } from "@/components/hooks";
import { useIsPreview } from "@/components/ScreenPreview";
import { EventShell, ReconnectingNotice, ScreenCorner } from "@/components/brand";
import { Spotlight } from "@/components/Spotlight";
import { BrandStill, GlowCard, MainLogos, PartnerMarquee, PartnerSlideshow } from "@/components/scenes";

function formatWait(seconds: number): string {
  const min = Math.ceil(seconds / 60);
  return min < 1 ? "<1 min" : `~${min} min`;
}

export default function WaitingScreen({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
  const connectionLost = useConnectionLost();
  const isPreview = useIsPreview();
  useWakeLock(!isPreview);
  const remaining = useRemainingSeconds(session);
  const theme = session.theme;

  if (!loaded) return <EventShell event={event} theme={theme} className="h-dvh">{null}</EventShell>;

  const scene = session.waitingScene === "call" && !session.spotlight ? "teams" : session.waitingScene;
  const corner = (
    <>
      <ReconnectingNotice show={connectionLost} />
      {!isPreview && <ScreenCorner />}
    </>
  );

  if (scene === "call") {
    return (
      <EventShell event={event} theme={theme} className="h-dvh">
        <Spotlight key={session.spotlight!.id} event={event} team={session.spotlight!} />
        {corner}
      </EventShell>
    );
  }

  if (scene === "brand" || scene === "partners") {
    return (
      <EventShell key={scene} event={event} theme={theme} className="h-dvh overflow-hidden select-none">
        {scene === "brand" ? <BrandStill event={event} theme={theme} /> : <PartnerSlideshow />}
        {corner}
      </EventShell>
    );
  }

  // ── Teams scene: who's on stage and who's next ──────────────────────────
  const team = session.currentTeam;
  const next = session.queue[0];
  const onStageSec = team ? Math.max(0, remaining) + (session.phase === "pitch" ? session.qaDuration : 0) : 0;
  const allDone = !team && !next && session.completed.length > 0;

  const liveTag =
    session.status === "running" ? (
      <span className="flex items-center gap-[0.8vw] rounded-full bg-fill px-[1.6vw] py-[1.2vh] text-[1.3vw] font-extrabold uppercase tracking-[0.2em] text-fill-ink">
        <span className="live-dot h-[1.2vh] w-[1.2vh] rounded-full bg-white" />
        Live
      </span>
    ) : session.status === "paused" ? (
      <span className="rounded-full border-2 border-warn px-[1.6vw] py-[1vh] text-[1.3vw] font-extrabold uppercase tracking-[0.2em] text-warn">
        Paused
      </span>
    ) : undefined;

  return (
    <EventShell key="teams" event={event} theme={theme} className="scene-in h-dvh flex flex-col overflow-hidden select-none">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 45%, rgb(var(--surface) / 0.9), transparent 75%)" }}
      />

      <header className="relative pt-[5vh]">
        <MainLogos event={event} theme={theme} />
      </header>

      <main className="relative flex flex-1 min-h-0 flex-col items-center justify-center gap-[5vh] px-[10vw]">
        {allDone ? (
          <GlowCard label={event.stage} name="All teams have pitched" />
        ) : (
          <>
            <GlowCard
              live={!!team}
              label={session.phase === "qa" && team ? "Now in Q&A" : "Now pitching"}
              name={team ? team.name : "Starting soon"}
              tag={team ? liveTag : undefined}
            />
            {next && (
              <GlowCard
                size="md"
                label="Up next"
                name={next.name}
                tag={
                  <span className="text-[1.6vw] font-extrabold text-muted tabular">
                    {team ? formatWait(onStageSec) : "Next"}
                  </span>
                }
              />
            )}
          </>
        )}
      </main>

      <PartnerMarquee className="relative h-[15vh] shrink-0 border-t border-line" />
      {corner}
    </EventShell>
  );
}
