import Link from "next/link";
import { EVENTS, EVENT_IDS } from "@/lib/events";

export default function Home() {
  return (
    <main className="min-h-dvh bg-canvas text-ink px-4 py-12 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display font-black text-3xl sm:text-4xl">Pitch Timer</h1>
        <p className="text-muted font-semibold mt-2">Choose an event and a screen.</p>

        <div className="grid sm:grid-cols-2 gap-6 mt-10">
          {EVENT_IDS.map((id) => {
            const e = EVENTS[id];
            return (
              <section key={id} data-event={id} data-theme="light" className="rounded-3xl bg-surface border border-line p-7">
                <div className="flex items-center gap-4 h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.eventLogo.light} alt={e.name} className="h-14 w-auto" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.roundLogo.light} alt={e.round} className="h-10 w-auto max-w-[8rem] object-contain" />
                </div>
                <p className="mt-5 font-extrabold text-xl">{e.round} {e.stage}</p>
                <p className="text-muted font-semibold text-sm">{e.name}</p>

                <div className="mt-6 grid gap-2">
                  <Link href={`/${id}/control`} className="rounded-xl bg-fill text-fill-ink font-bold px-4 py-3 text-center hover:brightness-110">
                    MC Control
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/${id}/pitch`} className="rounded-xl bg-surface2 font-bold px-4 py-3 text-center hover:brightness-95">
                      Pitch screen
                    </Link>
                    <Link href={`/${id}/waiting`} className="rounded-xl bg-surface2 font-bold px-4 py-3 text-center hover:brightness-95">
                      Waiting screen
                    </Link>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
