import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function env(name: string): string | undefined {
  return (import.meta.env as any)[name] as string | undefined;
}

// Lazy-init so importing the module doesn't crash local dev if env vars are missing.
export function getFirebaseApp() {
  if (getApps().length) return getApps()[0]!;

  const apiKey = env("VITE_FIREBASE_API_KEY");
  const authDomain = env("VITE_FIREBASE_AUTH_DOMAIN");
  const projectId = env("VITE_FIREBASE_PROJECT_ID");

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Firebase env vars missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID."
    );
  }

  return initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_APP_ID")
  });
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}

export function getAuthClient() {
  return getAuth(getFirebaseApp());
}
