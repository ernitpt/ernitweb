// services/AIHintService.ts
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase"; // ✅ use the shared instance
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { auth } from "../services/firebase";
export type HintStyle = "neutral" | "personalized" | "motivational";

export type SessionDoc = {
  sessionNumber: number;
  hint?: string;
  style?: HintStyle;
  startedAt?: any; // Firestore Timestamp
  completedAt?: any; // Firestore Timestamp
  timeElapsedSec?: number;
};

// 🌀 Determine style rotation by session number
function styleForSession(n: number): HintStyle {
  const i = (n - 1) % 3;
  return i === 0 ? "neutral" : i === 1 ? "personalized" : "motivational";
}

// 🧩 Create or ensure the session doc exists
async function ensureSessionDoc(goalId: string, sessionNumber: number) {
  const ref = doc(db, "goalSessions", goalId, "sessions", String(sessionNumber));
  console.log("ensureSessionDoc path:", ref.path);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { sessionNumber, startedAt: serverTimestamp() } as SessionDoc);
    console.log("Created new session doc:", ref.path);
  }

  return ref;
}

export const aiHintService = {
  /** ⚡ Generate & cache hint (only if missing) */
  async generateHint(params: {
    goalId: string;
    experienceType: string;
    sessionNumber: number; // 1-based
    totalSessions: number;
    userName?: string | null;
  }): Promise<string> {
    const { goalId, sessionNumber, experienceType, totalSessions, userName } = params;

    const ref = await ensureSessionDoc(goalId, sessionNumber);
    const snap = await getDoc(ref);
    const existing = snap.data() as SessionDoc | undefined;

    if (existing?.hint) {
      console.log("✅ Hint already exists for session:", sessionNumber);
      return existing.hint;
    }

    const style = styleForSession(sessionNumber);
    const payload = {
      experienceType: String(experienceType || "").trim(),
      sessionNumber: Number(sessionNumber),
      totalSessions: Number(totalSessions),
      userName: userName ? String(userName).trim() : null,
      style: String(style) as HintStyle,
    };

    // Remove undefined/null fields to avoid serialization issues
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    console.log("📦 Final payload sent to Cloud Function:", cleanPayload);
    
    if (!auth.currentUser) {
      console.warn("⚠️ Not logged in...");
    }
    
    // ✅ Use your shared functions instance (not a new one)
    const callable = httpsCallable(functions, "aiGenerateHint");

    try {
      const res: any = await callable(cleanPayload);
      const hint = res?.data?.hint as string;

      if (!hint) throw new Error("No hint returned from Cloud Function");

      console.log("✨ Hint generated:", hint);
      await updateDoc(ref, {
        hint,
        style,
        startedAt: existing?.startedAt ?? serverTimestamp(),
      });

      return hint;
    } catch (err: any) {
      console.error("❌ aiGenerateHint callable failed:", err?.code, err?.message);
      throw err;
    }
  },

  /** ✅ Mark a session as completed */
  async completeSession(goalId: string, sessionNumber: number, timeElapsedSec: number) {
    const ref = doc(db, "goalSessions", goalId, "sessions", String(sessionNumber));
    await updateDoc(ref, { completedAt: serverTimestamp(), timeElapsedSec });
  },

  /** 🪄 Fetch a single session hint */
  async getHint(goalId: string, sessionNumber: number) {
    const ref = doc(db, "goalSessions", goalId, "sessions", String(sessionNumber));
    const snap = await getDoc(ref);
    return (snap.data() as SessionDoc | undefined)?.hint ?? null;
  },

  /** 📜 Fetch session history (newest first) */
  async getAllSessions(goalId: string) {
    const q = query(collection(db, "goalSessions", goalId, "sessions"), orderBy("sessionNumber", "desc"));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as SessionDoc);
  },
};
