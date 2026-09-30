import { notFound } from "next/navigation";
import { EVENT_IDS, getEvent } from "@/lib/events";
import PitchScreen from "./PitchScreen";

export const dynamicParams = false;

export function generateStaticParams() {
  return EVENT_IDS.map((event) => ({ event }));
}

export default function Page({ params }: { params: { event: string } }) {
  const event = getEvent(params.event);
  if (!event) notFound();
  return <PitchScreen eventId={event.id} />;
}
