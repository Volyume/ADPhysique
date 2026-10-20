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

// ── Repeat control (founder 2026-10-20). Display only; coachingDeferred is
// cleared solely by ProOnboardingScreen on finishing setup.
//  - Today shows the full card at most once a calendar day (UK-local day key),
//    then the quiet one-line row for the rest of that day.
//  - The Coach tab is the permanent way in: full unless "Not now" applies.
//  - The first "Not now" shows the row everywhere for seven days. When the
//    seven days end the full card comes back ONCE (on whichever surface shows
//    it first); after that showing, and after any second "Not now", the card
//    is the quiet row for good.
// One small JSON record per person in AsyncStorage. A failed read shows the
// full card (the useful state); a failed write is logged, never thrown.
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const stateKey = (userId) => `@volyume_coaching_card_${userId}`;

/**
 * Pure. The card's mode for a surface from the stored record.
 * @param {{fullDay?:string, snoozedUntil?:number, returnShown?:boolean, permanent?:boolean}|null} state
 * @param {{surface:string, today:string, now:number}} ctx
 * @returns {'full'|'compact'}
 */
export function coachingCardModeFor(state, { surface, today, now }) {
  const st = state || {};
  if (st.permanent) return 'compact';
  if (Number.isFinite(st.snoozedUntil)) {
    if (now < st.snoozedUntil) return 'compact';
    if (st.returnShown) return 'compact';
  }
  if (surface === 'home' && st.fullDay === today) return 'compact';
  return 'full';
}

async function readCardState(userId) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(stateKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return null;
  }
}

async function writeCardState(userId, state) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(stateKey(userId), JSON.stringify(state));
  } catch (e) {
    try { require('./errorLog').logError('coachingSetup.cardState', e); } catch (_) { /* logging only */ }
  }
}

/**
 * The mode to show now, recording a full showing: Today's day key, and the
 * one return after a "Not now" week. A failed read gives 'full' and records
 * nothing.
 */
export async function resolveCoachingCardMode(userId, surface, now = Date.now()) {
  const { localDayKey } = require('./dayKey');
  const state = await readCardState(userId);
  const today = localDayKey(now);
  if (state === null) return 'full';
  const mode = coachingCardModeFor(state, { surface, today, now });
  if (mode === 'full') {
    const next = { ...state };
    if (surface === 'home') next.fullDay = today;
    if (Number.isFinite(state.snoozedUntil) && now >= state.snoozedUntil) next.returnShown = true;
    await writeCardState(userId, next);
  }
  return mode;
}

/** "Not now": the first one quietens the card for seven days; a later one for good. */
export async function snoozeCoachingCard(userId, now = Date.now()) {
  const state = (await readCardState(userId)) || {};
  const next = Number.isFinite(state.snoozedUntil)
    ? { ...state, permanent: true }
    : { ...state, snoozedUntil: now + SNOOZE_MS };
  await writeCardState(userId, next);
}
