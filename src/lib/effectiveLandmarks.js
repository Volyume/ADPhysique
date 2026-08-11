/**
 * effectiveLandmarks.js — the ONE precedence for volume target bands
 * (founder GO 2026-08-06, D90 #3: adaptive bands wired NOW, not queued).
 *
 * The adaptive engine already existed (algorithms.computeAdaptiveLandmarks,
 * fed by database.getAdaptiveLandmarkHistory, consumed by the Pro
 * session-adjustment path since COMP-015) — what never existed was a single
 * resolver the DISPLAY surfaces share, so every volume-status screen fell
 * back to the static research table and T5's tooltip claim ("targets adjust
 * to you") was a lie. This module is that resolver. Do not re-derive the
 * precedence anywhere else.
 *
 * Precedence, per muscle:
 *   1. MANUAL — the user's own Edit-volume-targets values
 *      (@volyume_landmarks_<userId>, VolumeHeatmapScreen). A hand-set value
 *      always beats the engine: explicit user intent wins.
 *   2. ADAPTED — computeAdaptiveLandmarks output, only when that muscle has
 *      enough data (isAdapted, 3+ points) AND the user is Pro (adaptation is
 *      coaching-engine output, same gate as the session adjustments that
 *      already consume it). Deterministic: same history, same numbers.
 *   3. RESEARCH — VOLUME_LANDMARKS, the population starting points.
 *
 * Free tier therefore sees research + their own manual edits, identical to
 * before this module existed. No ED-safety surface is involved (training
 * volume bands, not calories); tier-blindness rules apply to ED guardrails
 * only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VOLUME_LANDMARKS, computeAdaptiveLandmarks } from './algorithms';

/**
 * Pure merge of the three layers. Exported for tests and for callers that
 * already hold the pieces (VolumeHeatmapScreen holds manual in state).
 *
 * @param {?object} manual   { [muscle]: {mev,mav,mrv} } or null
 * @param {?object} adapted  computeAdaptiveLandmarks output or null
 * @param {object}  research defaults table
 * @returns {{ table: object, source: object }} table is complete over
 *   research's muscles; source maps each muscle to 'manual'|'adapted'|'research'.
 */
export function mergeLandmarkPrecedence({ manual = null, adapted = null, research = VOLUME_LANDMARKS } = {}) {
  const table = {};
  const source = {};
  for (const muscle of Object.keys(research)) {
    const m = manual?.[muscle];
    // C6 RA6-1 (D97-25): only a REAL edit counts as manual - the same
    // isManualEdit rule the ledger runner and the seed already apply
    // (Stage 6 blocker #1). Without it, a legacy full-table save of
    // untouched research defaults silently disabled the Pro adapted
    // layer on every display surface AND in the ledger's landmark frame,
    // while labelling values the user never chose "your own setting".
    // An untouched/legacy default now falls through to adapted, then
    // research; a genuinely edited muscle behaves byte-identically.
    if (m && Number.isFinite(m.mev) && Number.isFinite(m.mav) && Number.isFinite(m.mrv)
      && isManualEdit(m, research[muscle])) {
      table[muscle] = { ...research[muscle], mev: m.mev, mav: m.mav, mrv: m.mrv };
      source[muscle] = 'manual';
      continue;
    }
    const a = adapted?.[muscle];
    if (a?.isAdapted && Number.isFinite(a.mev) && Number.isFinite(a.mav) && Number.isFinite(a.mrv)) {
      table[muscle] = { ...research[muscle], mev: a.mev, mav: a.mav, mrv: a.mrv };
      source[muscle] = 'adapted';
      continue;
    }
    table[muscle] = { ...research[muscle] };
    source[muscle] = 'research';
  }
  return { table, source };
}

/**
 * Load and resolve the effective landmarks for a user. Best-effort on every
 * read: any failure degrades that layer to absent, never throws — a volume
 * chart must render even if a pref read fails.
 */
export async function getEffectiveLandmarks(userId, { tier = 'free' } = {}) {
  if (!userId) return mergeLandmarkPrecedence({});
  const manual = await getManualLandmarks(userId);
  const adapted = await getAdaptedLandmarks(userId, { tier });
  return mergeLandmarkPrecedence({ manual, adapted });
}

/**
 * Whether a stored manual entry is a REAL user edit rather than an
 * untouched research default. The volume-targets editor historically
 * saved ALL muscles (defaults included) on any save, so a table entry's
 * mere existence is not evidence the user chose that number — treating
 * it as one silently disabled the whole adaptive layer for every muscle
 * (Stage 6 review blocker #1). An entry counts as an edit only when at
 * least one band differs from the research default; with no research
 * row to compare against, the user's explicit table wins.
 */
export function isManualEdit(entry, research) {
  if (!entry) return false;
  // C8 Work 3 (RA6-6): explicit intent is RECORDED, never inferred from
  // the number. A user who deliberately saved a muscle at the research
  // value meant it, and the value comparison below could not tell that
  // from an untouched default. The editor stamps `explicit` on any
  // muscle it actually touched; legacy blobs carry no flag and keep the
  // old value-comparison behaviour exactly.
  if (entry.explicit === true) return true;
  if (!research) return true;
  const n = (v) => {
    const x = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return Number.isFinite(x) ? x : null;
  };
  return ['mev', 'mav', 'mrv'].some((k) => {
    const value = n(entry[k]);
    return value != null && value !== research[k];
  });
}

/**
 * The user's hand-set manual landmark table, or null. Exported (Stage 6,
 * 2026-08-09) so blockLedgerRunner can read the manual layer on its own —
 * a manual entry both wins the seeding fallback chain and marks the
 * muscle's ledger entry deferredToManual (via isManualEdit above).
 */
export async function getManualLandmarks(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(`@volyume_landmarks_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; /* manual layer absent */ }
}

/**
 * The session-grain adapted table (Pro only), or null. Exported (Stage 6)
 * for the runner's adaptedMrv ceiling clamp — same lazy require, same
 * fail-open posture as before.
 */
export async function getAdaptedLandmarks(userId, { tier = 'free' } = {}) {
  if (!userId || tier !== 'pro') return null;
  try {
    // Lazy require: database.js requires heavy native modules; keeping it
    // out of module scope lets pure consumers (tests, the merge) import
    // this file without the DB graph.
    // eslint-disable-next-line global-require
    const { getAdaptiveLandmarkHistory } = require('./database');
    const history = await getAdaptiveLandmarkHistory(userId);
    return history?.length ? computeAdaptiveLandmarks(history) : null;
  } catch (_) { return null; /* adapted layer absent */ }
}
