import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Without Firebase config the app runs in local demo mode (see lib/db.ts):
// sessions live in this browser only and the control panel needs no login.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL
);

function app(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export function getDb(): Database {
  return getDatabase(app());
}

export function getFirebaseAuth(): Auth {
  return getAuth(app());
}
