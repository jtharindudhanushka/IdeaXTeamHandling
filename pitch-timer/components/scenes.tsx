"use client";

import { useEffect, useState } from "react";
import { PARTNERS, type EventConfig, type Theme } from "@/lib/events";
import { Logo } from "./brand";
import { AtlantisStage } from "./AtlantisStage";

// Still: hackX logo over the wave stage, Ministry + NSF beneath.
export function BrandStill({ event }: { event: EventConfig; theme?: Theme }) {
  return (
    <div className="scene-in relative h-full">
      <AtlantisStage eventId={event.id} dim>
        <div className="flex h-full flex-col items-center justify-center gap-[10cqh] pb-[12cqh]">
          <Logo src={event.eventLogo.dark} alt={event.name} className="h-[30cqh]" />
          <div className="flex items-center gap-[5cqw]">
            {event.sponsors.map((s) => (
              <Logo key={s.name} src={s.logo.dark} alt={s.name} className="h-[11cqh]" />
            ))}
          </div>
        </div>
      </AtlantisStage>
    </div>
  );
}

// Still: partner logos one at a time, fading in and out on a white card,
// in front of the wave stage.
const SLIDE_MS = 4500;

export function PartnerSlideshow({ event }: { event: EventConfig }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PARTNERS.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scene-in relative h-full">
      <AtlantisStage eventId={event.id}>
        <div className="flex h-full flex-col items-center justify-center gap-[5cqh] pb-[10cqh]">
          <p className="text-[1.8cqw] font-bold uppercase tracking-[0.4em] text-white/80">Our partners</p>
          <div className="relative h-[46cqh] w-[54cqw] rounded-[4cqh] bg-white shadow-[0_4cqh_10cqh_rgb(0_0_0/0.55)]">
            {PARTNERS.map((p, i) => (
              <div
                key={p.src}
                className="absolute inset-0 flex items-center justify-center p-[6cqh] transition-opacity duration-1000 ease-in-out"
                style={{ opacity: i === index ? 1 : 0 }}
                aria-hidden={i !== index}
              >
                <Logo src={p.src} alt={p.name} className="max-h-[26cqh] max-w-[40cqw]" />
              </div>
            ))}
          </div>
        </div>
      </AtlantisStage>
    </div>
  );
}

// Strip of partner logos scrolling slowly — always on white so every logo reads.
export function PartnerMarquee({ className = "" }: { className?: string }) {
  const row = (copy: number) => (
    <div key={copy} className="flex shrink-0 items-center gap-[6vw] pr-[6vw]" aria-hidden={copy > 0}>
      {PARTNERS.map((p) => (
        <Logo key={p.src} src={p.src} alt={copy ? "" : p.name} className="h-[7vh] max-w-[16vw]" />
      ))}
    </div>
  );
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <div className="partner-marquee flex w-max items-center h-full">
        {row(0)}
        {row(1)}
      </div>
      {/* soft fade at both edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[8vw] bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[8vw] bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}

// Bottom strip for the waiting room: partner marquee with the hackX logo
// pinned on the left — logos scroll behind it under a white fade.
export function PartnerStrip({ event, className = "" }: { event: EventConfig; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <div className="absolute inset-0">
        <PartnerMarquee className="h-full" />
      </div>
      <div
        className="absolute inset-y-0 left-0 z-10 flex w-[30vw] items-center pl-[3.5vw]"
        style={{ background: "linear-gradient(90deg, #fff 0%, #fff 62%, rgb(255 255 255 / 0) 100%)" }}
      >
        <Logo src={event.eventLogo.light} alt={event.name} className="h-[9vh]" />
      </div>
    </div>
  );
}
