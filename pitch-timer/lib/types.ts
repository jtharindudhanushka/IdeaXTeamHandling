import type { Theme } from "./events";

export interface Team {
  id: string;
  name: string;
}

export type SessionStatus = "idle" | "running" | "paused" | "done";
export type Phase = "pitch" | "qa";

// What each display shows — switched explicitly by the MC (like OBS scenes),
// so timer controls never change a screen by accident.
export type PitchScene = "timer" | "brand" | "partners";
export type WaitingScene = "teams" | "call" | "brand" | "partners";

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
  spotlight: Team | null;  // team shown by the waiting screen's "call" scene
  pitchScene: PitchScene;
  waitingScene: WaitingScene;
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
  spotlight: null,
  pitchScene: "timer",
  waitingScene: "teams",
};
