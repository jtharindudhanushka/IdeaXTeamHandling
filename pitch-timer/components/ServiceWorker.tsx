"use client";

import { useEffect } from "react";

// Registers /sw.js (offline page loading) in production builds only —
// in dev it would serve stale code while editing.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
