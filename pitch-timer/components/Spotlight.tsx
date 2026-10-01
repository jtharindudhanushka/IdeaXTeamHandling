"use client";

import type { EventConfig } from "@/lib/events";
import type { Team } from "@/lib/types";

// Full-screen "get ready" call for the waiting room. Always uses the event's
// dark palette: a giant looping team name lit from behind, with "Get ready",
// the name and a direction to the pitching room in front.
export function Spotlight({ event, team }: { event: EventConfig; team: Team }) {
  const name = team.name.toUpperCase();
  // Scale the headline to the name's length so long names still fit
  const headline = Math.max(5, Math.min(13, 120 / Math.max(name.length, 6)));
  const loop = `${name} • `;

  return (
    <div
      data-event={event.id}
      data-theme="dark"
      className="fixed inset-0 z-40 overflow-hidden bg-canvas text-white select-none spotlight-enter"
    >
      {/* Light from behind — slow drifting glows in the event colours */}
      <div className="absolute inset-0">
        <div className="spotlight-glow absolute left-[-10%] top-[-20%] h-[90vh] w-[60vw] rounded-full bg-fill/60 blur-[120px]" />
        <div className="spotlight-glow-alt absolute right-[-10%] bottom-[-25%] h-[90vh] w-[60vw] rounded-full bg-fill/50 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--arc-hi))]/25 blur-[120px]" />
      </div>

      {/* Giant looping team name */}
      <div className="absolute inset-0 flex items-center overflow-hidden" aria-hidden>
        <div className="spotlight-marquee flex shrink-0 whitespace-nowrap">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="spotlight-bigtext block pr-[0.3em] font-black leading-none tracking-[-0.05em]"
              style={{ fontSize: "78vh" }}
            >
              {loop.repeat(3)}
            </span>
          ))}
        </div>
      </div>

      {/* Darken the middle so the headline reads */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgb(0 0 0 / 0.55), transparent 75%)" }} />

      <span className="absolute left-[3vw] top-1/2 -translate-y-1/2 text-[3vw] font-thin text-white/60">+</span>
      <span className="absolute right-[3vw] top-1/2 -translate-y-1/2 text-[3vw] font-thin text-white/60">+</span>

      {/* Headline */}
      <div className="relative flex h-full flex-col items-center justify-center px-[6vw] text-center">
        <p className="spotlight-rise text-[2.4vw] font-semibold uppercase tracking-[0.35em] text-white/90" style={{ animationDelay: "150ms" }}>
          Get ready
        </p>
        <h1
          className="spotlight-rise mt-[2vh] max-w-full break-words font-black uppercase leading-[0.92] tracking-[-0.03em] text-white line-clamp-2"
          style={{ fontSize: `min(${headline}vw, 24vh)`, textShadow: "0 0.04em 0.4em rgb(0 0 0 / 0.45)", animationDelay: "300ms" }}
        >
          {team.name}
        </h1>
        <p
          className="spotlight-rise mt-[5vh] rounded-full border border-white/30 bg-white/5 px-[2.4vw] py-[1.4vh] text-[1.5vw] font-bold text-white backdrop-blur-md"
          style={{ animationDelay: "650ms" }}
        >
          Please head to the pitching room
        </p>
      </div>
    </div>
  );
}
