// services/GoalService.ts
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import type { Goal } from '../types';

// ===== Helpers =====
const isoDateOnly = (d: Date) => d.toISOString().slice(0, 10);
const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

function toJSDate(value: any): Date | null {
  if (!value) return null;
  // Firestore Timestamp
  // @ts-ignore
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return isValidDate(d) ? d : null;
}

function addDaysSafe(base: Date | null | undefined, days: number): Date {
  const b = isValidDate(base as any) ? (base as Date) : new Date();
  const x = new Date(b);
  x.setDate(b.getDate() + days);
  return x;
}

/** Ensure all date-like fields are valid Dates (or null) and fix missing arrays/numbers */
function normalizeGoal(g: any): Goal {
  const startDate = toJSDate(g.startDate) ?? new Date();
  const endDate = toJSDate(g.endDate) ?? addDaysSafe(startDate, 7);
  const weekStartAt = toJSDate(g.weekStartAt);

  return {
    ...g,
    startDate,
    endDate,
    weekStartAt: weekStartAt ?? null,
    weeklyCount: typeof g.weeklyCount === 'number' ? g.weeklyCount : 0,
    weeklyLogDates: Array.isArray(g.weeklyLogDates) ? g.weeklyLogDates : [],
    currentCount: typeof g.currentCount === 'number' ? g.currentCount : 0,
    sessionsPerWeek: typeof g.sessionsPerWeek === 'number' ? g.sessionsPerWeek : 1,
    isCompleted: !!g.isCompleted,
    updatedAt: toJSDate(g.updatedAt) ?? new Date(),
  } as Goal;
}

/** Rotate weekday labels starting from the cadence anchor */
export function orderedWeekdaysFrom(start: Date) {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday-first (JS getDay)
  const startIdx = start.getDay(); // 0=Sun..6=Sat
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(letters[(startIdx + i) % 7]);
  return out;
}

/** Dates inside the anchored week window */
export function getAnchoredWeekDates(weekStartAt: Date) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDaysSafe(weekStartAt, i));
  return days;
}

export class GoalService {
  private goalsCollection = collection(db, 'goals');

  // ===== Debug switch =====
  // Production default = false (one session per day).
  private DEBUG_ALLOW_MULTIPLE_PER_DAY: boolean = true;
  setDebug(allowMultiplePerDay: boolean) {
    this.DEBUG_ALLOW_MULTIPLE_PER_DAY = allowMultiplePerDay;
  }

  /** Create a new goal */
  async createGoal(goal: Goal) {
    const normalized = normalizeGoal(goal);
    const docRef = await addDoc(this.goalsCollection, {
      ...normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...normalized, id: docRef.id };
  }

  /** Real-time listener */
  listenToUserGoals(userId: string, cb: (goals: Goal[]) => void) {
    const qy = query(this.goalsCollection, where('userId', '==', userId));
    const unsub = onSnapshot(qy, (snap) => {
      const goals = snap.docs.map((d) => {
        const data = normalizeGoal({ id: d.id, ...d.data() });
        return data;
      });
      cb(goals);
    });
    return unsub;
  }

  /** Fetch goals */
  async getUserGoals(userId: string): Promise<Goal[]> {
    const qy = query(this.goalsCollection, where('userId', '==', userId));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => normalizeGoal({ id: d.id, ...d.data() }));
  }

  async getGoalById(goalId: string): Promise<Goal | null> {
    const ref = doc(db, 'goals', goalId);
    const s = await getDoc(ref);
    if (!s.exists()) return null;
    return normalizeGoal({ id: s.id, ...s.data() });
  }

  async appendHint(goalId: string, hintObj: { session: number; hint: string; date: number }) {
  const goalRef = doc(db, 'goals', goalId);
  await updateDoc(goalRef, {
    hints: arrayUnion(hintObj),
    updatedAt: serverTimestamp(),
  });
}

  /** Overall progress (weeks) */
  getOverallProgress(goal: Goal): number {
    if (!goal.targetCount) return 0;
    return Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));
  }

  /** This-week progress (sessions vs sessionsPerWeek) */
  getWeeklyProgress(goal: Goal): number {
    const denom = goal.sessionsPerWeek || 1;
    return Math.min(100, Math.round((goal.weeklyCount / denom) * 100));
  }

  /** Update fields */
  async updateGoal(goalId: string, updates: Partial<Goal>) {
    const ref = doc(db, 'goals', goalId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() } as any);
  }

    // ✅ Get coupon code for a goal
  async getCouponCode(goalId: string): Promise<string | null> {
    try {
      const goalRef = doc(db, 'goals', goalId);
      const goalSnap = await getDoc(goalRef);
      if (goalSnap.exists()) {
        const data = goalSnap.data();
        return data?.couponCode || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching goal coupon:', error);
      return null;
    }
  }

  // ✅ Save coupon code to goal
  async saveCouponCode(goalId: string, couponCode: string): Promise<void> {
    try {
      const goalRef = doc(db, 'goals', goalId);
      await setDoc(
        goalRef,
        {
          couponCode,
          couponGeneratedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving goal coupon:', error);
    }
  }


  /** Sweep expired anchored weeks (penalty + advance) */
  private applyExpiredWeeksSweep(goal: Goal): Goal {
    let g = normalizeGoal(goal);
    if (!g.weekStartAt) return g;

    let anchor = new Date(g.weekStartAt);
    if (!isValidDate(anchor)) {
      anchor = new Date();
      g.weeklyCount = 0;
      g.weeklyLogDates = [];
      return { ...g, weekStartAt: anchor };
    }

    const now = new Date();
    while (now >= addDaysSafe(anchor, 7)) {
      if (g.weeklyCount < g.sessionsPerWeek) {
        g.currentCount = Math.max(0, g.currentCount - 1); // penalty
      }
      anchor = addDaysSafe(anchor, 7);
      g.weeklyCount = 0;
      g.weeklyLogDates = [];
    }
    return { ...g, weekStartAt: anchor };
  }

  /** Increment a session for the current anchored week */
  async tickWeeklySession(goalId: string): Promise<Goal> {
    const ref = doc(db, 'goals', goalId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Goal not found');

    let g = normalizeGoal({ id: snap.id, ...snap.data() });

    // first session ever → anchor now
    if (!g.weekStartAt) {
      g.weekStartAt = new Date();
      g.weeklyCount = 0;
      g.weeklyLogDates = [];
    }

    // sweep expired weeks
    g = this.applyExpiredWeeksSweep(g);

    const todayIso = isoDateOnly(new Date());

    // prevent duplicate day logs unless debugging
    if (!this.DEBUG_ALLOW_MULTIPLE_PER_DAY && g.weeklyLogDates.includes(todayIso)) {
      return { ...g };
    }

    // add a session
    g.weeklyCount += 1;
    if (!g.weeklyLogDates.includes(todayIso)) {
      g.weeklyLogDates = [...g.weeklyLogDates, todayIso];
    }

    // weekly target hit → complete week
    if (g.weeklyCount >= g.sessionsPerWeek) {
      g.currentCount += 1;
      g.weeklyCount = 0;
      g.weeklyLogDates = [];
      g.weekStartAt = addDaysSafe(g.weekStartAt, 7);
    }

    if (g.currentCount >= g.targetCount) {
      g.isCompleted = true;
    }

    await updateDoc(ref, {
      weeklyCount: g.weeklyCount,
      weeklyLogDates: g.weeklyLogDates,
      currentCount: g.currentCount,
      weekStartAt: g.weekStartAt || null,
      isCompleted: !!g.isCompleted,
      updatedAt: serverTimestamp(),
    } as any);

    return { ...(g as any) } as Goal;
  }
}

export const goalService = new GoalService();
(goalService as any).appendHint = goalService.appendHint.bind(goalService);
// Enable debug in dev if you like:
// goalService.setDebug(__DEV__); 
