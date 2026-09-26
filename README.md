# IdeaX Pitch Timer

Real-time pitch competition timer and queue system built with **Next.js**, **Firebase Realtime Database**, and **Tailwind CSS**.

## Pages

| Route | Purpose |
|-------|---------|
| `/control` | MC Control Panel — manage teams, control timer |
| `/pitch` | Pitching Room Display — large countdown for projector |
| `/waiting` | Waiting Room Display — queue + mirrored timer for waiting area |

---

## Setup

### 1. Clone & Install

```bash
cd pitch-timer
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Go to **Build → Realtime Database** → Create Database
   - Start in **test mode** for MVP (or set rules to allow read/write)
4. Go to **Project Settings → General → Your apps**
5. Click **Add app → Web** → Register app
6. Copy the config object shown

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Firebase config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://YOUR_PROJECT-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> ⚠️ **NEXT_PUBLIC_FIREBASE_DATABASE_URL** is required — it's the Realtime Database URL,  
> not the Firestore URL. Format: `https://YOUR_PROJECT-default-rtdb.firebaseio.com`

### 4. Firebase Realtime Database Security Rules (MVP)

In Firebase Console → Realtime Database → Rules, use:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> For production, restrict `.write` to authenticated users only.

### 5. Run Locally

```bash
npm run dev
```

Open:
- [http://localhost:3000/control](http://localhost:3000/control) — MC Panel
- [http://localhost:3000/pitch](http://localhost:3000/pitch) — Pitching Room
- [http://localhost:3000/waiting](http://localhost:3000/waiting) — Waiting Room

---

## Deploy to Vercel

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add all `NEXT_PUBLIC_FIREBASE_*` variables in **Vercel → Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js

---

## How It Works

- **All state** lives in Firebase Realtime Database at `/session`
- **`/control`** drives the countdown — it runs a 1-second `setInterval` that decrements `timeRemaining` in Firebase when the timer is running
- **`/pitch`** and **`/waiting`** are read-only — they subscribe to Firebase via `onValue()` and reflect any change instantly, with no page refresh needed
- If a display page is refreshed or loses connection briefly, it resyncs automatically from Firebase — no state is lost

## Audio (Pitch Page)

The `/pitch` page plays audio beeps using the Web Audio API:
- **1-minute warning**: 3 short beeps at 880 Hz
- **Time up**: Two-tone alert (440 Hz + 880 Hz)

**Important**: Click anywhere on `/pitch` before the event starts to initialize the AudioContext (browser security requires a user gesture first).
