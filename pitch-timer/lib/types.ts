export interface Team {
  id: string;
  name: string;
}

export type SessionStatus = "idle" | "running" | "paused" | "done";

export interface Session {
  status: SessionStatus;
  currentTeam: Team | null;
  timeRemaining: number;   // seconds
  pitchDuration: number;   // seconds
  queue: Team[];
  completed: Team[];
}

export const DEFAULT_SESSION: Session = {
  status: "idle",
  currentTeam: null,
  timeRemaining: 300,
  pitchDuration: 300,
  queue: [],
  completed: [],
};
