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
 *   3. PLAN — planVolumeTargets.buildPlanLandmarks: what the athlete's own
 *      plan programs for that muscle each week, inside the floor and
 *      ceiling their own profile produces. Founder ruling 2026-08-23: the
 *      targets must be consistent with the plan, "not just rudimental".
 *      Falls through to the profile's personalised band for a muscle the
 *      plan does not train, and to research when there is no profile.
 *      See planVolumeTargets.js for why the display lane was reading a
 *      cruder table than the one the plan itself was generated from.
 *   4. RESEARCH — VOLUME_LANDMARKS, the population starting points, now
 *      only reached with neither a plan nor a profile to go on.
 *
 * The plan layer is tier-blind: a Free athlete's plan is as much theirs as
 * a Pro's, and reading what it programs is not coaching-engine output. The
 * ADAPTED layer keeps its Pro gate. No ED-safety surface is involved
 * (training volume bands, not calories); tier-blindness rules apply to ED
 * guardrails only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VOLUME_LANDMARKS, computeAdaptiveLandmarks } from './algorithms';
import { buildPlanLandmarks, plannedWeeklyVolumeByMuscle } from './planVolumeTargets';

/**
 * Pure merge of the three layers. Exported for tests and for callers that
 * already hold the pieces (VolumeHeatmapScreen holds manual in state).
 *
 * @param {?object} manual   { [muscle]: {mev,mav,mrv} } or null
 * @param {?object} adapted  computeAdaptiveLandmarks output or null
 * @param {?object} plan     buildPlanLandmarks output ({table, source}) or
 *                           null. Absent means fall straight to research,
 *                           which is what blockLedgerRunner wants: that
 *                           lane resolves its own profile-adjusted prior.
 * @param {object}  research defaults table
 * @returns {{ table: object, source: object }} table is complete over
 *   research's muscles; source maps each muscle to
 *   'manual'|'adapted'|'plan'|'profile'|'research'.
 */
export function mergeLandmarkPrecedence({ manual = null, adapted = null, plan = null, research = VOLUME_LANDMARKS } = {}) {
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
    const p = plan?.table?.[muscle];
    if (p && Number.isFinite(p.mev) && Number.isFinite(p.mav) && Number.isFinite(p.mrv)) {
      table[muscle] = { ...research[muscle], mev: p.mev, mav: p.mav, mrv: p.mrv };
      // buildPlanLandmarks already says whether this muscle's band came
      // from the plan, the profile, or neither; pass its verdict through
      // rather than re-deciding it here.
      source[muscle] = plan.source?.[muscle] ?? 'research';
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
export async function getEffectiveLandmarks(userId, { tier = 'free', userProfile = null } = {}) {
  if (!userId) return mergeLandmarkPrecedence({});
  const manual = await getManualLandmarks(userId);
  const adapted = await getAdaptedLandmarks(userId, { tier });
  const plan = await getPlanLandmarks(userId, { userProfile });
  return mergeLandmarkPrecedence({ manual, adapted, plan });
}

/**
 * The plan layer: what the athlete's own plan programs each week, banded
 * by their own profile. Best-effort like every other layer — a plan that
 * cannot be read degrades to the profile band, and a profile that cannot
 * be read degrades to research, so a volume chart always renders.
 *
 * userProfile is accepted for tests and for callers that already hold it;
 * otherwise it comes from the store, the same lazy require lib modules use
 * elsewhere to avoid an import cycle.
 */
export async function getPlanLandmarks(userId, { userProfile = null } = {}) {
  let profile = userProfile;
  if (!profile) {
    try {
      // eslint-disable-next-line global-require
      profile = require('../store/useAppStore').default.getState().userProfile ?? null;
    } catch (_) { profile = null; }
  }
  let plannedByMuscle = null;
  try {
    // eslint-disable-next-line global-require
    const { getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails } = require('./database');
    const plan = await getActivePlan(userId);
    if (plan?.id) {
      const routines = (await getRoutinesForPlan(plan.id)) ?? [];
      const withExercises = [];
      for (const routine of routines) {
        // eslint-disable-next-line no-await-in-loop
        const exercises = await getRoutineExercisesWithDetails(routine.id).catch(() => []);
        withExercises.push({ ...routine, exercises });
      }
      plannedByMuscle = plannedWeeklyVolumeByMuscle(withExercises);
    }
  } catch (_) { plannedByMuscle = null; /* plan layer absent */ }
  return buildPlanLandmarks({ plannedByMuscle, userProfile: profile });
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
 * The muscles whose volume the ATHLETE sets by hand, as a plain list.
 *
 * C18 adversarial closure job B4: the weekly coach has to know this to judge
 * its own volume changes honestly. A change to a dial the user is holding
 * themselves cannot be read as a response to our decision, so the outcome is
 * CONFOUNDED rather than scored. One authority - `isManualEdit` still decides
 * what counts as a genuine edit, so an untouched editor default is not one.
 *
 * Fails to an empty list: a read failure must never make an outcome look
 * confounded and quietly disable the learning loop.
 */
export async function getManualVolumeMuscles(userId) {
  const table = await getManualLandmarks(userId);
  if (!table || typeof table !== 'object') return [];
  return Object.keys(table).filter((m) => isManualEdit(table[m], VOLUME_LANDMARKS[m]));
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
