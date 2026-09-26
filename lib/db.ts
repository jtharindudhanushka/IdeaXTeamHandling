import { db } from "./firebase";
import { ref, set, update, get, onValue } from "firebase/database";
import { Session, DEFAULT_SESSION } from "./types";

const SESSION_REF = "session";

export function getSessionRef() {
  return ref(db, SESSION_REF);
}

export async function initSession(): Promise<void> {
  const snapshot = await get(getSessionRef());
  if (!snapshot.exists()) {
    await set(getSessionRef(), DEFAULT_SESSION);
  }
}

export async function updateSession(updates: Partial<Session>): Promise<void> {
  await update(getSessionRef(), updates);
}

export async function setSession(session: Session): Promise<void> {
  await set(getSessionRef(), session);
}

export function subscribeToSession(
  callback: (session: Session) => void
): () => void {
  const sessionRef = getSessionRef();

  // onValue returns an unsubscribe function directly
  const unsubscribe = onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();

      // Firebase RTDB stores arrays as objects when sparse — normalize them back
      const toArray = (v: unknown) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        return Object.values(v as Record<string, unknown>);
      };

      const session: Session = {
        ...DEFAULT_SESSION,
        ...data,
        queue: toArray(data.queue),
        completed: toArray(data.completed),
        currentTeam: data.currentTeam ?? null,
      };

      callback(session);
    } else {
      callback({ ...DEFAULT_SESSION });
    }
  });

  return unsubscribe;
}
