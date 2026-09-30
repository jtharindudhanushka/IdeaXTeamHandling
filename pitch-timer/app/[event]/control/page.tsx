import { notFound } from "next/navigation";
import { EVENT_IDS, getEvent } from "@/lib/events";
import ControlPanelPage from "./ControlPanel";

export const dynamicParams = false;

export function generateStaticParams() {
  return EVENT_IDS.map((event) => ({ event }));
}

export default function Page({ params }: { params: { event: string } }) {
  const event = getEvent(params.event);
  if (!event) notFound();
  return <ControlPanelPage eventId={event.id} />;
}
