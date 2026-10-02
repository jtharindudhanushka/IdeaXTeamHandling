"use client";

import type { EventConfig } from "@/lib/events";
import type { Session } from "@/lib/types";
import { PartnerStrip } from "@/components/scenes";
import { AtlantisStage } from "@/components/AtlantisStage";

// Waiting-room "Teams" scene: one big card on a soft blue backdrop, divided
// into an underwater wave panel (Now pitching) and a clean white side (Up next
// + the five teams after that). The partner strip is the card's footer.
// Nothing on stage / nothing queued = those areas simply stay empty.

const SLOTS = 5;

export function SplitTeams({ session, event }: { session: Session; event: EventConfig }) {
  const team = session.currentTeam;
  const next = session.queue[0] ?? null;
  const running = session.status === "running";
  const paused = session.status === "paused";
  const slots = Array.from({ length: SLOTS }, (_, i) => ({ team: session.queue[i + 1] ?? null, position: i + 2 }));
  // teams beyond Up next + the five "Then" rows
  const more = Math.max(0, session.queue.length - 1 - SLOTS);

  return (
    <div className="relative h-full p-[3vh]">
      {/* Dark backdrop with faint deep-blue light */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#01040a]">
        <div className="soft-drift absolute -left-[15vw] -top-[25vh] h-[90vh] w-[70vw] rounded-full bg-fill/10 blur-[130px]" />
        <div className="soft-drift-alt absolute -bottom-[30vh] -right-[10vw] h-[90vh] w-[60vw] rounded-full bg-[rgb(var(--deep))]/30 blur-[130px]" />
      </div>

      {/* The card */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-[3.4vh] bg-surface shadow-[0_3vh_8vh_rgb(var(--shadow)/0.22)]">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] gap-[2.4vh] p-[2.4vh]">
          {/* Now pitching — underwater wave panel */}
          <div className="relative min-h-0 overflow-hidden rounded-[2.6vh]">
            <AtlantisStage eventId={event.id}>
              {team && (
              <div className="flex h-full flex-col justify-end p-[3.2vw]">
                <p className="inline-flex w-fit items-center gap-[0.8vw] rounded-full border border-white/25 bg-white/10 px-[1.4vw] py-[0.9vh] text-[1.2vw] font-bold uppercase tracking-[0.3em] text-white backdrop-blur-md">
                  {running && <span className="breathe-dot h-[1.2vh] w-[1.2vh] rounded-full bg-white" aria-label="Live" />}
                  {paused && <span className="h-[1.2vh] w-[1.2vh] rounded-full bg-amber-300" aria-label="Paused" />}
                  {session.phase === "qa" ? "Now in Q&A" : "Now pitching"}
                </p>
                <p
                  className="mt-[2vh] font-black leading-[1.0] tracking-[-0.035em] text-white line-clamp-3 break-words text-[5.2vw]"
                  style={{ textShadow: "0 0.4vh 3vh rgb(0 0 0 / 0.6)" }}
                >
                  {team.name}
                </p>
              </div>
              )}
            </AtlantisStage>
          </div>

          {/* Up next + then */}
          <div className="flex min-h-0 flex-col px-[1.6vw] py-[2.2vh]">
            {next && (
              <>
                <p className="inline-flex w-fit items-center rounded-full bg-fill px-[1.4vw] py-[0.9vh] text-[1.2vw] font-bold uppercase tracking-[0.3em] text-fill-ink">
                  Up next
                </p>
                <p key={next.id} className="text-sweep slot-in mt-[2vh] font-black leading-[1.04] tracking-[-0.03em] line-clamp-2 break-words text-[4.6vw]">
                  {next.name}
                </p>
              </>
            )}

            <div className="mt-auto">
              <p className="mb-[1.2vh] text-[1.2vw] font-bold uppercase tracking-[0.3em] text-muted">Then</p>
              <div className="border-t border-ink/10">
                {slots.map((s) => (
                  <div key={s.team?.id ?? `empty-${s.position}`} className={`flex h-[8.4vh] items-center gap-[1.2vw] border-b border-ink/10 ${s.team ? "slot-in" : ""}`}>
                    {/* accent bar, like the reference's stat markers */}
                    <span className={`h-[3.6vh] w-[0.45vw] shrink-0 rounded-full ${s.team ? "bg-fill" : "bg-ink/10"}`} />
                    <span className={`w-[2.4vw] shrink-0 text-[1.6vw] font-black tabular ${s.team ? "text-accent" : "text-ink/20"}`}>{s.position}</span>
                    <span className={`min-w-0 flex-1 truncate text-[2.05vw] font-bold ${s.team ? "text-ink" : "text-ink/20"}`}>
                      {s.team?.name ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
              {more > 0 && (
                <p className="pt-[1.4vh] pl-[0.2vw] text-[1.5vw] font-bold text-muted">
                  + {more} more team{more === 1 ? "" : "s"} waiting
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer: partner strip with hackX pinned on the left */}
        <PartnerStrip event={event} className="h-[12vh] shrink-0 border-t border-ink/10" />
      </div>
    </div>
  );
}
