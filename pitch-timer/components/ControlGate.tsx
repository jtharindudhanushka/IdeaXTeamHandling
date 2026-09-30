"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { get, ref } from "firebase/database";
import { getDb, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import type { EventConfig } from "@/lib/events";
import { EventShell, Logo } from "./brand";

export interface ControlUser {
  label: string;
  signOut: (() => void) | null;
}

// Only the MC account(s) listed under admins/<eventId>/<uid> in the database
// can control an event. The database rules enforce the same thing server-side.
export function ControlGate({
  event,
  children,
}: {
  event: EventConfig;
  children: (user: ControlUser) => React.ReactNode;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setIsAdmin(null);
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    let cancelled = false;
    get(ref(getDb(), `admins/${event.id}/${user.uid}`))
      .then((snap) => !cancelled && setIsAdmin(snap.val() === true))
      .catch(() => !cancelled && setIsAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [user, event.id]);

  if (!isFirebaseConfigured) {
    return <>{children({ label: "Local demo mode", signOut: null })}</>;
  }

  const doSignOut = () => signOut(getFirebaseAuth());

  if (user === undefined || (user && isAdmin === null)) {
    return <GateFrame event={event}><p className="text-muted font-semibold">Checking account…</p></GateFrame>;
  }

  if (!user) {
    return <GateFrame event={event}><LoginForm /></GateFrame>;
  }

  if (!isAdmin) {
    return (
      <GateFrame event={event}>
        <p className="font-bold text-lg">This account can&apos;t control {event.name}.</p>
        <p className="text-muted mt-2">
          Signed in as <span className="font-semibold text-ink">{user.email}</span>. Sign in with the {event.name} MC account instead.
        </p>
        <button onClick={doSignOut} className="mt-6 w-full py-3 rounded-xl bg-fill text-fill-ink font-bold">
          Sign out
        </button>
      </GateFrame>
    );
  }

  return <>{children({ label: user.email ?? "Signed in", signOut: doSignOut })}</>;
}

function GateFrame({ event, children }: { event: EventConfig; children: React.ReactNode }) {
  return (
    <EventShell event={event} theme="light" className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-line p-8">
        <div className="flex items-center gap-4 mb-8">
          <Logo src={event.eventLogo.light} alt={event.name} className="h-12" />
          <Logo src={event.roundLogo.light} alt={event.round} className="h-9 max-w-[8rem]" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1">MC Control</h1>
        <p className="text-muted font-medium mb-6">{event.round} {event.stage}</p>
        {children}
      </div>
    </EventShell>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch {
      setError("Wrong email or password.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl bg-canvas border border-line px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-fill";

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} required />
      <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} required />
      {error && <p className="text-danger text-sm font-semibold">{error}</p>}
      <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-fill text-fill-ink font-bold disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
