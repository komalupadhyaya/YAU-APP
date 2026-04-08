import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getAuthClient, getDb } from "../services/firebase";
import type { CoachProfile } from "../types/coach";

type CoachAuthState = {
  firebaseUser: User | null;
  coachProfile: CoachProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetPassword: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
};

const CoachAuthContext = createContext<CoachAuthState | null>(null);

async function loadCoachProfile(user: User): Promise<CoachProfile | null> {
  const db = getDb();
  const usersRef = collection(db, "users");

  // Preferred: uid match
  const q1 = query(usersRef, where("uid", "==", user.uid), limit(1));
  const s1 = await getDocs(q1);
  if (!s1.empty) {
    const doc = s1.docs[0]!;
    return { id: doc.id, ...(doc.data() as any) } as CoachProfile;
  }

  // Fallback: email match
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return null;
  const q2 = query(usersRef, where("email", "==", email), limit(1));
  const s2 = await getDocs(q2);
  if (!s2.empty) {
    const doc = s2.docs[0]!;
    return { id: doc.id, ...(doc.data() as any) } as CoachProfile;
  }

  return null;
}

function isAuthorizedCoach(profile: CoachProfile | null): boolean {
  if (!profile) return false;
  if (profile.role !== "coach") return false;
  if (profile.isActive === false) return false;
  return true;
}

export function CoachAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useMemo(() => getAuthClient(), []);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setFirebaseUser(u);
      setCoachProfile(null);
      setError(null);

      if (!u) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const profile = await loadCoachProfile(u);
        if (!isAuthorizedCoach(profile)) {
          await signOut(auth);
          setCoachProfile(null);
          setError("Not authorized. Please sign in with an active coach account.");
          setLoading(false);
          return;
        }
        setCoachProfile(profile);
        setLoading(false);
      } catch (e) {
        setCoachProfile(null);
        setError(e instanceof Error ? e.message : "Failed to load coach profile");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [auth]);

  const value: CoachAuthState = useMemo(
    () => ({
      firebaseUser,
      coachProfile,
      loading,
      error,
      signIn: async (email: string, password: string) => {
        try {
          setError(null);
          setLoading(true);
          await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
          // profile load happens in onAuthStateChanged
          return { ok: true };
        } catch (e) {
          setLoading(false);
          return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
        }
      },
      resetPassword: async (emailAddress: string) => {
        try {
          const normalized = emailAddress.trim().toLowerCase();
          if (!normalized) return { ok: false, error: "Please enter your email address." };
          await sendPasswordResetEmail(auth, normalized);
          return { ok: true };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to send reset email";
          return { ok: false, error: msg };
        }
      },
      logout: async () => {
        await signOut(auth);
      }
    }),
    [auth, coachProfile, error, firebaseUser, loading]
  );

  return <CoachAuthContext.Provider value={value}>{children}</CoachAuthContext.Provider>;
}

export function useCoachAuth() {
  const ctx = useContext(CoachAuthContext);
  if (!ctx) throw new Error("useCoachAuth must be used within CoachAuthProvider");
  return ctx;
}

