# hackX Pitch Timer

Live pitch timer and team queue for the hackX semi finals, built with **Next.js**, **Firebase Realtime Database** and **Tailwind CSS**.

One deployment runs both events, each with its own queue, timer, branding and MC account:

| Event | Semi finals | Control | Pitching room | Waiting room |
|-------|-------------|---------|---------------|--------------|
| hackX 11.0 | ideaX | `/hackx/control` | `/hackx/pitch` | `/hackx/waiting` |
| hackX Jr. | innoX | `/hackxjr/control` | `/hackxjr/pitch` | `/hackxjr/waiting` |

`/` links to all of them. Events are defined in [`lib/events.ts`](lib/events.ts).

---

## Run locally

```bash
npm install
npm run dev
```

Without Firebase config the app runs in **local demo mode**: sessions are stored in this browser only (synced between its tabs) and the control panel needs no login. Good for trying the UI; use Firebase for the real event.

## Firebase setup (for the event)

1. [Firebase Console](https://console.firebase.google.com) → create a project.
2. **Build → Realtime Database** → Create database.
3. **Build → Authentication** → Get started → enable **Email/Password**.
4. **Authentication → Users → Add user**, once per event, e.g. `ideax-mc@…` and `innox-mc@…`. Copy each user's **UID**.
5. **Realtime Database → Data**: add the MC accounts under `admins`:
   ```
   admins
     hackx
       <UID of the ideaX MC>: true
     hackxjr
       <UID of the innoX MC>: true
   ```
   Several UIDs per event are fine.
6. **Realtime Database → Rules**: paste [`database.rules.json`](database.rules.json) and publish. Or with the Firebase CLI: `npm i -g firebase-tools`, `firebase login`, `firebase use --add` (pick the project), then `firebase deploy --only database`. Everyone can read (the screens need no login); only an event's MC accounts can change that event.
7. **Project settings → Your apps → Web app**: copy the config into `.env.local` (see `.env.local.example`), and into Vercel's environment variables when deploying.

## How it works

- Each event's state is one record at `events/<eventId>/session` (queue, current team, phase, status, durations, screen theme).
- Starting the timer stores `endsAt` (the moment it hits zero, in Firebase server time). Every screen counts down locally from that, so the clock keeps running even if the control tab is backgrounded, closed or open twice, and all screens agree.
- The pitch and waiting screens are read-only and update live. Refreshing a screen resyncs instantly.
- **Light / dark** for the screens is switched from the control panel (Screens → Light/Dark).

## Control panel extras

- **Live screens:** small live previews of the pitching and waiting room screens (top right). Click one to open it full size.
- **Call a team:** press **Call** next to a team in the queue to show a full-screen "Get ready" call with their name on the waiting room screen. It stays up until you press **Hide** (or **Call** again), or bring that team on stage.

## Poor connections

- **Timers keep running offline.** Every screen counts down to the saved end time on its own.
- **Screens reload offline.** Once a screen has been opened online, the app is cached in that browser and the last known session is shown until the connection returns. (Offline loading works on the deployed site, not in `npm run dev`.)
- **The MC sees sync status** in the control panel header: *Synced*, *Saving…*, or *Offline · N changes waiting*. Changes made offline are sent automatically on reconnect — don't reload the control tab while changes are waiting (the browser will warn you).
- **Displays stay awake** while a pitch, waiting or control page is open.
- At the venue, give each room its own 4G hotspot/router and open every screen before the session starts.

## Pitching room screen

- Beeps at 1 minute left and at time-up. **Click the screen once** after opening it so the browser allows sound (a hint appears in the corner until you do).
- The fullscreen button and cursor hide after a few seconds without mouse movement.

## Font

The UI uses **Inter** (loaded via `next/font`).

## Deploy to Vercel

1. Import the repo in Vercel and set **Root Directory** to `pitch-timer`.
2. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables.
3. Deploy.
