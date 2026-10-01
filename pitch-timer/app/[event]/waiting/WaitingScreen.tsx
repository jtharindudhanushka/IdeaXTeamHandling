"use client";


import { EVENTS, EventId } from "@/lib/events";
import { useConnectionLost, useEventSession, useWakeLock } from "@/components/hooks";
import { useIsPreview } from "@/components/ScreenPreview";
import { EventShell, ReconnectingNotice, ScreenCorner } from "@/components/brand";
import { Spotlight } from "@/components/Spotlight";
import { BrandStill, PartnerSlideshow } from "@/components/scenes";
import { SplitTeams } from "@/components/waiting/SplitTeams";

export default function WaitingScreen({ eventId }: { eventId: EventId }) {
  const event = EVENTS[eventId];
  const { session, loaded } = useEventSession(eventId);
  const connectionLost = useConnectionLost();
  const isPreview = useIsPreview();
  useWakeLock(!isPreview);
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
        {scene === "brand" ? <BrandStill event={event} /> : <PartnerSlideshow event={event} />}
        {corner}
      </EventShell>
    );
  }

  // ── Teams scene: who's on stage, who's next, and the next five ─────────

  return (
    <EventShell key="teams" event={event} theme={theme} className="scene-in h-dvh overflow-hidden select-none">
      <SplitTeams session={session} event={event} />
      {corner}
    </EventShell>
  );
}
