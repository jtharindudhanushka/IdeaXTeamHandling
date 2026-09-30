import type { Theme } from "./events";

export interface Team {
  id: string;
  name: string;
}

export type SessionStatus = "idle" | "running" | "paused" | "done";
export type Phase = "pitch" | "qa";

export interface Session {
  status: SessionStatus;
  phase: Phase;
  currentTeam: Team | null;
  timeRemaining: number;   // seconds — authoritative while not running
  endsAt: number | null;   // server-time epoch ms when the countdown hits 0 (set while running)
  pitchDuration: number;   // seconds
  qaDuration: number;      // seconds
  queue: Team[];
  completed: Team[];
  theme: Theme;            // light/dark for the pitch + waiting screens, set by the MC
}

export const DEFAULT_SESSION: Session = {
  status: "idle",
  phase: "pitch",
  currentTeam: null,
  timeRemaining: 300,
  endsAt: null,
  pitchDuration: 300,
  qaDuration: 180,
  queue: [],
  completed: [],
  theme: "light",
};
