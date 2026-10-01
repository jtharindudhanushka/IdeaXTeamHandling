import { ref, set, update, onValue } from "firebase/database";
import { getDb, isFirebaseConfigured } from "./firebase";
import { Session, DEFAULT_SESSION } from "./types";

// Each event's state lives at events/<eventId>/session.
function sessionPath(eventId: string) {
  return `events/${eventId}/session`;
}

// Firebase RTDB drops empty arrays / nulls and may return sparse arrays as
// objects — normalize everything back into a complete Session.
function normalize(data: Record<string, unknown> | null): Session {
  if (!data) return { ...DEFAULT_SESSION };
  const toArray = (v: unknown) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    return Object.values(v as Record<string, unknown>);
  };
  return {
    ...DEFAULT_SESSION,
    ...data,
    queue: toArray(data.queue),
    completed: toArray(data.completed),
    currentTeam: (data.currentTeam as Session["currentTeam"]) ?? null,
    endsAt: (data.endsAt as number | null) ?? null,
    spotlight: (data.spotlight as Session["spotlight"]) ?? null,
  } as Session;
}

// ── Local demo mode (no Firebase config) ─────────────────────────────────
// Sessions are kept in localStorage and synced across tabs of this browser.

type Listener = (session: Session) => void;
const localListeners = new Map<string, Set<Listener>>();
let storageHooked = false;

function localKey(eventId: string) {
  return `pitch-timer:${eventId}`;
}

function readLocal(eventId: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(localKey(eventId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function notifyLocal(eventId: string) {
  const session = normalize(readLocal(eventId));
  localListeners.get(eventId)?.forEach((cb) => cb(session));
}

function writeLocal(eventId: string, data: Record<string, unknown>) {
  try {
    window.localStorage.setItem(localKey(eventId), JSON.stringify(data));
  } catch {
    // storage unavailable — the change is still broadcast to this tab below
  }
  notifyLocal(eventId);
}

function hookStorageEvents() {
  if (storageHooked) return;
  storageHooked = true;
  window.addEventListener("storage", (e) => {
    if (!e.key?.startsWith("pitch-timer:")) return;
    notifyLocal(e.key.slice("pitch-timer:".length));
  });
}

// ── Offline cache (Firebase mode) ────────────────────────────────────────
// The last session each browser saw is kept in localStorage, so a screen
// reloaded while offline still shows the right team and a running timer.

function cacheKey(eventId: string) {
  return `pitch-timer-cache:${eventId}`;
}

function readCache(eventId: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(eventId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(eventId: string, data: unknown) {
  try {
    window.localStorage.setItem(cacheKey(eventId), JSON.stringify(data));
  } catch {
    // storage unavailable — nothing to cache
  }
}

// ── Pending writes ───────────────────────────────────────────────────────
// Firebase applies writes locally at once and queues them while offline;
// each write's promise settles when the server confirms it. Counting the
// unsettled ones tells the MC whether the screens have their change yet.

let pendingWrites = 0;
const pendingListeners = new Set<(count: number) => void>();

function trackWrite(write: Promise<void>): Promise<void> {
  pendingWrites++;
  pendingListeners.forEach((cb) => cb(pendingWrites));
  return write.finally(() => {
    pendingWrites--;
    pendingListeners.forEach((cb) => cb(pendingWrites));
  });
}

export function subscribeToPendingWrites(callback: (count: number) => void): () => void {
  pendingListeners.add(callback);
  callback(pendingWrites);
  return () => {
    pendingListeners.delete(callback);
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export function subscribeToSession(
  eventId: string,
  callback: (session: Session) => void
): () => void {
  if (!isFirebaseConfigured) {
    hookStorageEvents();
    if (!localListeners.has(eventId)) localListeners.set(eventId, new Set());
    localListeners.get(eventId)!.add(callback);
    callback(normalize(readLocal(eventId)));
    return () => {
      localListeners.get(eventId)?.delete(callback);
    };
  }

  // Show the cached session straight away; the live one replaces it on connect.
  const cached = readCache(eventId);
  if (cached) callback(normalize(cached));

  return onValue(ref(getDb(), sessionPath(eventId)), (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : null;
    writeCache(eventId, data);
    callback(normalize(data));
  });
}

export async function updateSession(
  eventId: string,
  updates: Partial<Session>
): Promise<void> {
  if (!isFirebaseConfigured) {
    const next: Record<string, unknown> = { ...(readLocal(eventId) ?? DEFAULT_SESSION) };
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === undefined) delete next[k];
      else next[k] = v;
    }
    writeLocal(eventId, next);
    return;
  }
  await trackWrite(update(ref(getDb(), sessionPath(eventId)), updates));
}

export async function setSession(eventId: string, session: Session): Promise<void> {
  if (!isFirebaseConfigured) {
    writeLocal(eventId, JSON.parse(JSON.stringify(session)));
    return;
  }
  await trackWrite(set(ref(getDb(), sessionPath(eventId)), session));
}

// Reports whether this client is connected to the database.
export function subscribeToConnection(callback: (connected: boolean) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(true);
    return () => {};
  }
  return onValue(ref(getDb(), ".info/connected"), (snap) => callback(snap.val() === true));
}
