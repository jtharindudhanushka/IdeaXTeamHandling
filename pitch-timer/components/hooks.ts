"use client";

import { useEffect, useState } from "react";
import { subscribeToConnection, subscribeToPendingWrites, subscribeToSession } from "@/lib/db";
import { DEFAULT_SESSION, Session } from "@/lib/types";

export function useEventSession(eventId: string) {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return subscribeToSession(eventId, (s) => {
      setSession(s);
      setLoaded(true);
    });
  }, [eventId]);

  return { session, loaded };
}

// True only when a connection that was working has dropped — used to show a
// small "Reconnecting…" notice instead of a permanent status pill.
export function useConnectionLost() {
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let everConnected = false;
    return subscribeToConnection((connected) => {
      if (connected) everConnected = true;
      setLost(everConnected && !connected);
    });
  }, []);

  return lost;
}

export type SyncStatus = { connected: boolean | null; pending: number };

// Connection + unconfirmed writes, for the control panel's sync indicator.
// Also warns before closing the tab while changes are still waiting to send
// (queued offline writes are lost if the page is reloaded).
export function useSyncStatus(): SyncStatus {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeToConnection(setConnected), []);
  useEffect(() => subscribeToPendingWrites(setPending), []);

  useEffect(() => {
    if (pending === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  return { connected, pending };
}

// Keeps the display from sleeping or dimming while the page is open.
// Browsers drop the lock when the tab is hidden, so it's re-requested on return.
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (!active) lock.release().catch(() => {});
      } catch {
        // denied (e.g. battery saver) — nothing else to do
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}
