import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getDb, isFirebaseConfigured } from "./firebase";
import { Session } from "./types";

// Offset between this device's clock and Firebase server time, so every
// screen computes the same remaining time even if device clocks disagree.
// The last known offset is remembered so a reload while offline stays in sync.
const OFFSET_KEY = "pitch-timer-server-offset";
let serverOffsetMs = 0;
let offsetSubscribed = false;

function ensureOffsetSubscription() {
  if (offsetSubscribed || typeof window === "undefined" || !isFirebaseConfigured) return;
  offsetSubscribed = true;
  try {
    serverOffsetMs = Number(window.localStorage.getItem(OFFSET_KEY)) || 0;
  } catch {}
  onValue(ref(getDb(), ".info/serverTimeOffset"), (snap) => {
    serverOffsetMs = snap.val() ?? 0;
    try {
      window.localStorage.setItem(OFFSET_KEY, String(serverOffsetMs));
    } catch {}
  });
}

export function serverNow(): number {
  ensureOffsetSubscription();
  return Date.now() + serverOffsetMs;
}

// Whole seconds left on the clock (negative = overtime).
export function computeRemaining(session: Session): number {
  if (session.status === "running" && session.endsAt != null) {
    return Math.ceil((session.endsAt - serverNow()) / 1000);
  }
  return session.timeRemaining;
}

// Live countdown derived from `endsAt` — ticks locally, no per-second DB writes.
export function useRemainingSeconds(session: Session): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    ensureOffsetSubscription();
    if (session.status !== "running" || session.endsAt == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [session.status, session.endsAt]);

  return computeRemaining(session);
}
