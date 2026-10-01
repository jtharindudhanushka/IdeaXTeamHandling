"use client";

import { useEffect, useState } from "react";
import { PARTNERS, type EventConfig, type Theme } from "@/lib/events";
import { Logo } from "./brand";

// hackX + Ministry + NSF, side by side — top of the waiting room.
export function MainLogos({ event, theme }: { event: EventConfig; theme: Theme }) {
  return (
    <div className="flex items-center justify-center gap-[2.5vw]">
      <Logo src={event.eventLogo[theme]} alt={event.name} className="h-[11vh]" />
      <div className="h-[8vh] w-px bg-line" />
      {event.sponsors.map((s) => (
        <Logo key={s.name} src={s.logo[theme]} alt={s.name} className="h-[9vh]" />
      ))}
    </div>
  );
}

// Still: big hackX logo with the Ministry and NSF logos beneath.
export function BrandStill({ event, theme }: { event: EventConfig; theme: Theme }) {
  return (
    <div className="scene-in relative flex h-full flex-col items-center justify-center gap-[7vh]">
      <Glow />
      <Logo src={event.eventLogo[theme]} alt={event.name} className="relative h-[34vh]" />
      <div className="relative h-px w-[30vw] bg-line" />
      <div className="relative flex items-center gap-[5vw]">
        {event.sponsors.map((s) => (
          <Logo key={s.name} src={s.logo[theme]} alt={s.name} className="h-[15vh]" />
        ))}
      </div>
    </div>
  );
}

// Still: partner logos one at a time, fading in and out on a white card.
const SLIDE_MS = 4500;

export function PartnerSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PARTNERS.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scene-in relative flex h-full flex-col items-center justify-center gap-[5vh]">
      <Glow />
      <p className="relative text-[1.6vw] font-extrabold uppercase tracking-[0.35em] text-accent">Our partners</p>
      <div className="glass-white relative h-[56vh] w-[62vw] rounded-[4vh]">
        {PARTNERS.map((p, i) => (
          <div
            key={p.src}
            className="absolute inset-0 flex items-center justify-center p-[8vh] transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            <Logo src={p.src} alt={p.name} className="max-h-[30vh] max-w-[46vw]" />
          </div>
        ))}
      </div>
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

// Pill card with a light that travels around its edge (from the reference).
export function GlowCard({
  label,
  tag,
  name,
  live = false,
  size = "lg",
}: {
  label: string;
  tag?: React.ReactNode;
  name: string;
  live?: boolean;
  size?: "lg" | "md";
}) {
  const big = size === "lg";
  return (
    <div className={`glow-card ${live ? "glow-card-live" : ""} w-full rounded-full`} style={{ padding: big ? "1.1vh" : "0.9vh" }}>
      <div
        className="glow-card-inner relative flex items-center gap-[2vw] rounded-full"
        style={{ padding: big ? "4.2vh 4vw" : "3.2vh 4vw" }}
      >
        <div className="min-w-0 flex-1">
          <p className={`font-extrabold uppercase tracking-[0.28em] text-accent ${big ? "text-[1.5vw]" : "text-[1.3vw]"}`}>{label}</p>
          <p
            className={`mt-[0.8vh] truncate font-black leading-[1.05] tracking-[-0.02em] text-ink ${big ? "text-[5.4vw]" : "text-[4.2vw]"}`}
          >
            {name}
          </p>
        </div>
        {tag && <div className="shrink-0">{tag}</div>}
      </div>
    </div>
  );
}

function Glow() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgb(var(--fill) / 0.14), transparent 70%)" }}
    />
  );
}
