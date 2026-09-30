export function formatTime(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// "5:00", "90" or "1:30" → seconds
export function parseDuration(value: string): number {
  const trimmed = value.trim();
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  return parseInt(trimmed, 10) || 0;
}

export type TimerTone = "normal" | "warn" | "over";

// Last minute = warn, past zero = over
export function timerTone(remaining: number): TimerTone {
  if (remaining < 0) return "over";
  if (remaining <= 60) return "warn";
  return "normal";
}
