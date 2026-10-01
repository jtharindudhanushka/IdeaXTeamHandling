"use client";

import { useEffect, useRef, useState } from "react";
import type { EventId } from "@/lib/events";
import PatternWaves from "./PatternWaves";

// Dark backdrop with a flowing dotted "silk" surface (React Bits PatternWaves)
// in the event's highlight colour. No cursor interaction. Always uses the
// event's dark palette. Fills its positioned parent; `children` go on top.

export function AtlantisStage({
  eventId,
  className = "",
  children,
}: {
  eventId: EventId;
  className?: string;
  children?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState<string | null>(null);

  // PatternWaves takes a CSS colour string; read the event's --arc-hi token
  useEffect(() => {
    if (!rootRef.current) return;
    const rgb = getComputedStyle(rootRef.current).getPropertyValue("--arc-hi").trim().split(/\s+/).join(", ");
    setColor(rgb ? `rgb(${rgb})` : "#5bb8ff");
  }, [eventId]);

  return (
    <div
      ref={rootRef}
      data-event={eventId}
      data-theme="dark"
      className={`orb-stage absolute inset-0 overflow-hidden text-white ${className}`}
    >
      {color && (
        <div className="absolute inset-0">
          <PatternWaves
            preset="silk"
            color={color}
            backgroundColor="transparent"
            interactive={false}
            spacing={11}
            contrast={1.5}
            shine={1.1}
            speed={0.5}
            fade="edges"
            fadeSize={0.8}
          />
        </div>
      )}

      {/* keep overlaid text readable */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative h-full">{children}</div>
    </div>
  );
}
