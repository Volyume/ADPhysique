/**
 * coachingSetup.js: whether a person has set up coaching (founder brief
 * 2026-10-19, coaching-first onboarding with a quick start).
 *
 * A quick-start person finishes first run by picking a ready-made plan or
 * building their own, with no baseline, targets or check-in rhythm. The
 * quick start marks the profile `coachingDeferred: true`; nothing else ever
 * sets it, so everyone who finished the full onboarding (every existing
 * user) is set up exactly as before, whatever their older profile holds.
 * While deferred, coaching (weekly adjustments, nutrition targets, meal plans
 * and the Nutrition tab) stays closed. Streamlined setup clears the marker
 * only once every field a nutrition target or a coach decision needs exists:
 * biological sex, age, height, body weight and a training goal, never
 * defaulted (missingCoachingFields).
 *
 * Pure.
 */

const SEXES = Object.freeze(['male', 'female']);

const finite = (v) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : null;
};

/** The required fields the profile is missing, in the order setup asks them. */
export function missingCoachingFields(profile) {
  const p = profile || {};
  const missing = [];
  if (!SEXES.includes(p.sex)) missing.push('sex');
  const age = finite(p.age);
  if (age == null || age < 13 || age > 100) missing.push('age');
  const height = finite(p.heightCm);
  if (height == null || height < 100 || height > 250) missing.push('heightCm');
  const weight = finite(p.weightKg);
  if (weight == null || weight < 25 || weight > 350) missing.push('weightKg');
  if (typeof p.trainingGoal !== 'string' || !p.trainingGoal) missing.push('trainingGoal');
  return missing;
}

/**
 * True when coaching is set up. Only a quick start defers it; a deferred
 * profile is set up again only when nothing required is missing.
 */
export function isCoachingSetUp(profile) {
  if (!profile || profile.coachingDeferred !== true) return true;
  return false;
}

/** True when streamlined setup may clear the marker: nothing required is missing. */
export function canFinishCoachingSetup(profile) {
  return missingCoachingFields(profile).length === 0;
}

/** The calm card copy every coach-owned surface shows until setup is done. */
export const COACHING_SETUP_COPY = Object.freeze({
  title: 'Set up coaching',
  body: 'Set up coaching to get weekly adjustments and nutrition targets. Your current plan stays in place unless you choose otherwise.',
  nutritionBody: 'Set up coaching to get food logging, your nutrition targets and meal plans, built around you. Your current plan stays in place unless you choose otherwise.',
  action: 'Set up coaching',
  compact: "Coaching isn't set up yet.",
  compactAction: 'Set up',
  notNow: 'Not now',
});

// ── Repeat control: the full card shows once per surface per session, and
// "Not now" quietens it for a week. Display only; coachingDeferred is cleared
// solely by ProOnboardingScreen on finishing setup.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const snoozeKey = (userId) => `@volyume_coaching_card_snoozed_until_${userId}`;

// Module-level, so it resets on every app launch.
const shownFull = new Set();
export function markFullCardShown(surface) { shownFull.add(surface); }
export function fullCardShownThisSession(surface) { return shownFull.has(surface); }
/** Test-only. */
export function __resetCoachingCardSession() { shownFull.clear(); }

/** 'Not now': hide the full card for seven days. Best effort. */
export async function snoozeCoachingCard(userId, now = Date.now()) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(snoozeKey(userId), String(now + SNOOZE_MS));
  } catch (e) {
    try { require('./errorLog').logError('coachingSetup.snooze', e); } catch (_) { /* logging only */ }
  }
}

/** True while a 'Not now' is in force. A read failure returns false (full card). */
export async function isCoachingCardSnoozed(userId, now = Date.now()) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(snoozeKey(userId));
    const until = Number(raw);
    return raw != null && Number.isFinite(until) && until > now;
  } catch (_) {
    return false;
  }
}

/** 'full' or 'compact'. Snoozed is always compact; a session-scoped surface after its first full showing too. */
export function coachingCardMode({ snoozed, shownThisSession, sessionScoped }) {
  if (snoozed) return 'compact';
  if (sessionScoped && shownThisSession) return 'compact';
  return 'full';
}
