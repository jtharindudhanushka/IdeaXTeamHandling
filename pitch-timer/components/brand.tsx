"use client";

import { useEffect, useRef, useState } from "react";
import type { EventConfig, Theme } from "@/lib/events";
import type { TimerTone } from "@/lib/format";

export function EventShell({
  event,
  theme,
  className = "",
  children,
}: {
  event: EventConfig;
  theme: Theme;
  className?: string;
  children: React.ReactNode;
}) {
  // Keep <body> in step so overscroll / fullscreen edges match the theme.
  useEffect(() => {
    document.body.dataset.event = event.id;
    document.body.dataset.theme = theme;
  }, [event.id, theme]);

  return (
    <div data-event={event.id} data-theme={theme} className={`bg-canvas text-ink ${className}`}>
      {children}
    </div>
  );
}

export function Logo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} className={`w-auto object-contain select-none ${className}`} />;
}

// Event + round logos on the left, sponsors on the right.
export function BrandHeader({ event, theme }: { event: EventConfig; theme: Theme }) {
  return (
    <header className="flex items-center justify-between gap-[3vw] px-[3.5vw] pt-[3.2vh] pb-[2vh]">
      <div className="flex items-center gap-[1.6vw] min-w-0">
        <Logo src={event.eventLogo[theme]} alt={event.name} className="h-[9.5vh]" />
        <div className="h-[7vh] w-px bg-line" />
        <Logo src={event.roundLogo[theme]} alt={event.round} className="h-[8vh] max-w-[11vw]" />
        <p className="font-bold uppercase tracking-[0.18em] text-muted text-[clamp(0.8rem,1.25vw,1.6rem)] whitespace-nowrap">
          {event.stage}
        </p>
      </div>
      <div className="flex items-center gap-[1.8vw] shrink-0">
        {event.sponsors.map((s) => (
          <Logo key={s.name} src={s.logo[theme]} alt={s.name} className="h-[8.5vh]" />
        ))}
      </div>
    </header>
  );
}

export function ProgressBar({ value, tone, className = "" }: { value: number; tone: TimerTone; className?: string }) {
  const color = tone === "over" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-fill";
  return (
    <div className={`w-full rounded-full bg-track overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-1000 ease-linear`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

export const toneText: Record<TimerTone, string> = {
  normal: "text-ink",
  warn: "text-warn",
  over: "text-danger",
};

// Fullscreen button (and optional hint) that only appear while the mouse moves,
// so the projected screen stays clean.
export function ScreenCorner({ hint }: { hint?: string | null }) {
  const [visible, setVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 2500);
    };
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    show();
    window.addEventListener("mousemove", show);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("mousemove", show);
      document.removeEventListener("fullscreenchange", onFs);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen?.();
  };

  return (
    <>
      {!visible && <style>{`body { cursor: none; }`}</style>}
      <div
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {hint && (
          <span className="rounded-full bg-surface border border-line px-4 py-2 text-sm font-semibold text-muted shadow-sm">
            {hint}
          </span>
        )}
        <button
          onClick={toggle}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="p-3 rounded-full bg-surface border border-line text-muted hover:text-ink shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            ) : (
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            )}
          </svg>
        </button>
      </div>
    </>
  );
}

export function ReconnectingNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-warn text-white px-4 py-1.5 text-sm font-bold">
      Reconnecting…
    </div>
  );
}
