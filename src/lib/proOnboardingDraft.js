// OB-3 (audit 02): the Pro onboarding wizard held every answer in screen-local
// state, so a process death mid-wizard lost steps 2-5 in the app's longest
// flow. This module persists a per-user draft ({ step, answers }) to
// AsyncStorage so the wizard can resume where it left off, and clears it when
// the wizard completes. Device-local only: the draft never syncs and is keyed
// by user id, so it can't leak across accounts.
//
// The pure helpers (buildDraft / parseDraft / draftKey) carry all the shape
// logic so they are testable without mounting the wizard. Restoring a draft
// must never weaken the step-2 sex gate: parseDraft never invents values, so
// a draft saved with sex null restores with sex null and the Continue button
// stays disabled exactly as on a fresh run.

import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY_PFX = '@volyume_pro_onboarding_draft_';
const DRAFT_VERSION = 1;

// C5-P29-07 (D96): the draft is cleared AFTER the final build, so a kill
// anywhere inside advanceFrom6 leaves the draft at step 6 and the retry
// replays every write. Most of them are upserts and survive that, but the
// enrolment body-metric row was inserted twice and the plan was generated a
// second time (archiving the first, and taking the "Your plan 2" name). This
// second, tiny record marks what the interrupted build already did, so a
// replay of the SAME answers finishes the build instead of repeating it.
// Cleared with the draft when the wizard completes.
const BUILD_KEY_PFX = '@volyume_pro_onboarding_build_';

// The wizard's persistable steps. Step 1 is the account/OAuth step whose
// state is owned by auth, so it is never part of a draft.
// L04-6: the wizard grew from 5 to 6 steps (Step 2's body-composition
// QuestionGroup became its own step), so the persistable ceiling moved with
// it, otherwise a draft saved on the new final step would fail to persist.
const MIN_STEP = 2;
const MAX_STEP = 6;

export const DRAFT_DEBOUNCE_MS = 600;

export function draftKey(userId) {
  return userId ? `${DRAFT_KEY_PFX}${userId}` : null;
}

// Pure: build the storable draft object. Returns null when there is nothing
// worth persisting (invalid step, or the pre-account step).
export function buildDraft(step, answers) {
  const s = Number(step);
  if (!Number.isInteger(s) || s < MIN_STEP || s > MAX_STEP) return null;
  const a = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  return { v: DRAFT_VERSION, step: s, answers: a, savedAt: Date.now() };
}

// Pure: parse + validate a stored draft string. Anything malformed returns
// null and the wizard simply starts fresh (a corrupt draft must never crash
// or half-restore onboarding).
export function parseDraft(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let d;
  try { d = JSON.parse(raw); } catch (_) { return null; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  if (d.v !== DRAFT_VERSION) return null;
  const step = Number(d.step);
  if (!Number.isInteger(step) || step < MIN_STEP || step > MAX_STEP) return null;
  if (!d.answers || typeof d.answers !== 'object' || Array.isArray(d.answers)) return null;
  return { step, answers: d.answers };
}

// Best-effort persistence: a storage failure loses interruption recovery for
// this session, never the wizard itself, so every path swallows and returns.
export async function saveDraft(userId, step, answers) {
  const key = draftKey(userId);
  const draft = buildDraft(step, answers);
  if (!key || !draft) return;
  try { await AsyncStorage.setItem(key, JSON.stringify(draft)); } catch (_) { /* best effort */ }
}

export async function loadDraft(userId) {
  const key = draftKey(userId);
  if (!key) return null;
  try { return parseDraft(await AsyncStorage.getItem(key)); } catch (_) { return null; }
}

export async function clearDraft(userId) {
  const key = draftKey(userId);
  if (!key) return;
  try { await AsyncStorage.removeItem(key); } catch (_) { /* best effort */ }
  // RB-1 (D96, Review B): the build record is deliberately NOT cleared here
  // any more. clearDraft runs at the end of advanceFrom6, one screen before
  // first run actually completes, and backing out of the hand-off screen
  // re-runs the wizard with nothing left to suppress the replay - a second
  // enrolment body-metric row, "Your plan 2", a reset block. The record now
  // lives until completeFirstRun (the moment first run is truly over),
  // which calls clearBuildProgress below.
}

// RB-1: cleared by completeFirstRun (useAppStore), and by resetFirstRun so
// a deliberate Free-to-Pro re-run never reuses a stale record.
export async function clearBuildProgress(userId) {
  const key = buildKey(userId);
  if (!key) return;
  try { await AsyncStorage.removeItem(key); } catch (_) { /* best effort */ }
}

// ── Build progress (C5-P29-07) ──────────────────────────────────────────────

export function buildKey(userId) {
  return userId ? `${BUILD_KEY_PFX}${userId}` : null;
}

// Pure: validate a stored build record. Only the three fields the retry can
// act on survive; anything else (or anything malformed) reads as "no record",
// which simply means the build runs in full, exactly as it did before.
export function parseBuildProgress(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let d;
  try { d = JSON.parse(raw); } catch (_) { return null; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  return {
    weightLoggedAt: Number.isFinite(d.weightLoggedAt) ? d.weightLoggedAt : null,
    // RB-7 (D96, Review B): the weight the record logged, so a retry can
    // tell "already logged this reading" from "the user changed it".
    weightKg: Number.isFinite(d.weightKg) && d.weightKg > 0 ? d.weightKg : null,
    planId: typeof d.planId === 'string' && d.planId ? d.planId : null,
    planSignature: typeof d.planSignature === 'string' && d.planSignature ? d.planSignature : null,
  };
}

export async function loadBuildProgress(userId) {
  const key = buildKey(userId);
  if (!key) return null;
  try { return parseBuildProgress(await AsyncStorage.getItem(key)); } catch (_) { return null; }
}

// Read-merge-write so each step of the build can record itself without
// erasing what an earlier step recorded. Best effort throughout: losing this
// record costs interruption tidiness, never the build.
export async function markBuildProgress(userId, patch) {
  const key = buildKey(userId);
  if (!key || !patch || typeof patch !== 'object') return;
  try {
    const current = (await loadBuildProgress(userId)) || {};
    await AsyncStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
  } catch (_) { /* best effort */ }
}
