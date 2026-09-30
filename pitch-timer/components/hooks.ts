"use client";

import { useEffect, useState } from "react";
import { subscribeToConnection, subscribeToSession } from "@/lib/db";
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
