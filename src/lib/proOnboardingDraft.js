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

// The wizard's persistable steps. Step 1 is the account/OAuth step whose
// state is owned by auth, so it is never part of a draft.
const MIN_STEP = 2;
const MAX_STEP = 5;

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
}
