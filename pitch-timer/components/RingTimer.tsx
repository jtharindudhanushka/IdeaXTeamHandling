"use client";

import type { TimerTone } from "@/lib/format";

// Glassy ring countdown: a soft raised base ring, a glowing progress arc that
// retreats counter-clockwise toward 12 o'clock, tick dots, and a frosted
// centre disc holding the time. Sized by `--d` (ring diameter).

const ARC: Record<TimerTone, { a: string; b: string }> = {
  normal: { a: "rgb(var(--fill))", b: "rgb(var(--arc-hi))" },
  warn: { a: "#F59E0B", b: "#FCD34D" },
  over: { a: "#DC2626", b: "#F87171" },
};

const TICKS = 12;
const THICKNESS = 0.13; // ring thickness as a fraction of the diameter

export function RingTimer({
  progress,
  tone,
  alert,
  size,
  children,
}: {
  progress: number; // 0..1 of the ring filled
  tone: TimerTone;
  alert?: "flash" | "pulse"; // flash = last 30 s, pulse = overtime
  size: string; // CSS length for the diameter
  children: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const { a, b } = ARC[tone];
  const t = `calc(var(--d) * ${THICKNESS})`;

  // Donut mask: transparent centre, opaque ring
  const donut = `radial-gradient(farthest-side, transparent calc(100% - ${t} - 1px), #000 calc(100% - ${t}))`;
  // A full ring uses a symmetric gradient so there's no seam at 12 o'clock
  const arc =
    p >= 0.999
      ? `conic-gradient(from 0deg, ${a}, ${b} 180deg, ${a})`
      : `conic-gradient(from 0deg, ${a} 0deg, ${b} calc(var(--p) * 360deg), transparent calc(var(--p) * 360deg + 0.4deg))`;

  return (
    <div
      className={`relative shrink-0 rounded-full ${alert === "pulse" ? "ring-pulse" : ""}`}
      style={{ ["--d" as string]: size, ["--p" as string]: p, width: "var(--d)", height: "var(--d)", transition: "--p 1s linear" } as React.CSSProperties}
    >
      {/* Base ring — raised, softly lit from the top-left */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(145deg, rgb(var(--ring-hi)), rgb(var(--ring-lo)))",
          boxShadow:
            "0 calc(var(--d) * 0.05) calc(var(--d) * 0.12) rgb(var(--shadow) / var(--shadow-a)), inset 0 2px 1px rgb(255 255 255 / var(--rim-a)), inset 0 -10px 30px rgb(var(--shadow) / calc(var(--shadow-a) * 0.5))",
        }}
      />

      {/* Tick dots on the empty part of the ring */}
      {Array.from({ length: TICKS }).map((_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full bg-muted/40"
          style={{
            width: "calc(var(--d) * 0.008)",
            height: "calc(var(--d) * 0.008)",
            transform: `translate(-50%, -50%) rotate(${i * (360 / TICKS)}deg) translateY(calc(var(--d) * ${-(0.5 - THICKNESS / 2)}))`,
          }}
        />
      ))}

      {/* Glow — the arc blurred, bleeding softly along the ring */}
      <div
        className={`absolute inset-0 rounded-full ${alert === "flash" ? "ring-flash" : ""}`}
        style={{ background: arc, WebkitMaskImage: donut, maskImage: donut, filter: "blur(calc(var(--d) * 0.045))", opacity: 0.9 }}
      />

      {/* Crisp arc with a glass sheen on top */}
      <div
        className={`absolute inset-0 rounded-full ${alert === "flash" ? "ring-flash" : ""}`}
        style={{
          // sheen from above + tube shading (lighter toward the inner edge) over the arc colour
          background: `linear-gradient(160deg, rgb(255 255 255 / 0.35), rgb(255 255 255 / 0) 45%), radial-gradient(farthest-side, rgb(255 255 255 / 0.28) calc(100% - ${t}), rgb(255 255 255 / 0) calc(100% - ${t} * 0.35), rgb(0 0 0 / 0.08) 100%), ${arc}`,
          WebkitMaskImage: donut,
          maskImage: donut,
        }}
      />

      {/* Frosted centre disc */}
      <div
        className="absolute rounded-full flex flex-col items-center justify-center text-center"
        style={{
          inset: t,
          background: "rgb(var(--surface) / var(--glass-a))",
          backdropFilter: "blur(18px) saturate(1.4)",
          WebkitBackdropFilter: "blur(18px) saturate(1.4)",
          boxShadow:
            "0 calc(var(--d) * 0.02) calc(var(--d) * 0.06) rgb(var(--shadow) / calc(var(--shadow-a) * 0.9)), inset 0 1px 0 rgb(255 255 255 / var(--rim-a))",
        }}
      >
        {children}
      </div>
    </div>
  );
}
