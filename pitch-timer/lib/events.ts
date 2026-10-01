// Each event runs its own independent session (queue + timer) and has its own
// branding. Add an entry here to run another event from the same deployment.

export type EventId = "hackx" | "hackxjr";
export type Theme = "light" | "dark";

interface ThemedLogo {
  light: string; // version for light backgrounds
  dark: string;  // version for dark backgrounds
}

export interface Sponsor {
  name: string;
  logo: ThemedLogo;
}

export interface EventConfig {
  id: EventId;
  name: string;       // e.g. "hackX 11.0"
  round: string;      // e.g. "ideaX"
  stage: string;      // e.g. "Semi Finals"
  eventLogo: ThemedLogo;
  roundLogo: ThemedLogo;
  sponsors: Sponsor[];
}

const SPONSORS: Sponsor[] = [
  {
    name: "Ministry of Science & Technology",
    logo: { light: "/brand/ministry-on-light.png", dark: "/brand/ministry-on-dark.png" },
  },
  {
    name: "National Science Foundation",
    logo: { light: "/brand/nsf-on-light.png", dark: "/brand/nsf-on-dark.png" },
  },
];

export const EVENTS: Record<EventId, EventConfig> = {
  hackx: {
    id: "hackx",
    name: "hackX 11.0",
    round: "ideaX",
    stage: "Semi Finals",
    eventLogo: { light: "/brand/hackx-on-light.png", dark: "/brand/hackx-on-dark.png" },
    roundLogo: { light: "/brand/ideax.png", dark: "/brand/ideax.png" },
    sponsors: SPONSORS,
  },
  hackxjr: {
    id: "hackxjr",
    name: "hackX Jr.",
    round: "innoX",
    stage: "Semi Finals",
    eventLogo: { light: "/brand/hackxjr-on-light.png", dark: "/brand/hackxjr-on-dark.png" },
    roundLogo: { light: "/brand/innox.png", dark: "/brand/innox.png" },
    sponsors: SPONSORS,
  },
};

// Partner logos (all designed for white backgrounds), in display order.
export const PARTNERS: { name: string; src: string }[] = [
  { name: "Ministry of Science & Technology", src: "/partners/01-ministry.png" },
  { name: "National Science Foundation", src: "/partners/02-nsf.png" },
  { name: "Evonsys", src: "/partners/03-evonsys.png" },
  { name: "Lion:Bit", src: "/partners/04-lionbit.png" },
  { name: "nVentures", src: "/partners/05-nventures.png" },
  { name: "Generation Alpha", src: "/partners/06-generation-alpha.png" },
  { name: "SLASSCOM", src: "/partners/07-slasscom.png" },
  { name: "TiE Colombo", src: "/partners/08-tie-colombo.png" },
  { name: "Virtusa", src: "/partners/09-virtusa.png" },
];

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

export function getEvent(id: string): EventConfig | null {
  return (EVENTS as Record<string, EventConfig>)[id] ?? null;
}
