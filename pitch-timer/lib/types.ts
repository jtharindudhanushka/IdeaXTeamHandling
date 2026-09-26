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
  timeRemaining: number;   // seconds
  pitchDuration: number;   // seconds
  qaDuration: number;      // seconds
  queue: Team[];
  completed: Team[];
}

export const DEFAULT_SESSION: Session = {
  status: "idle",
  phase: "pitch",
  currentTeam: null,
  timeRemaining: 300,
  pitchDuration: 300,
  qaDuration: 180,
  queue: [],
  completed: [],
};
