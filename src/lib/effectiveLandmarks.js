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
 *   1. ADAPTED — computeAdaptiveLandmarks output, only when that muscle has
 *      enough data (isAdapted, 3+ points). Deterministic: same history,
 *      same numbers.
 *   2. PLAN — planVolumeTargets.buildPlanLandmarks: what the athlete's own
 *      plan programs for that muscle each week, inside the floor and
 *      ceiling their own profile produces. Founder ruling 2026-08-23: the
 *      targets must be consistent with the plan, "not just rudimental".
 *      Falls through to the profile's personalised band for a muscle the
 *      plan does not train, and to research when there is no profile.
 *      See planVolumeTargets.js for why the display lane was reading a
 *      cruder table than the one the plan itself was generated from.
 *   3. RESEARCH — VOLUME_LANDMARKS, the population starting points, now
 *      only reached with neither a plan nor a profile to go on.
 *
 * RETIRED LAYER, INERT BY DESIGN (D219, founder answer 2026-10-05, "Remove
 * the editor": "One set of numbers everywhere. People's existing custom
 * targets stop being shown", and stop being applied). A fourth layer used to
 * sit above ADAPTED: the person's own Volume targets, one blob at
 * @volyume_landmarks_<userId>, written by an editor on the Volume heatmap
 * screen. The editor is gone and the layer is switched off HERE, at its one
 * source, so every reader (the display surfaces, the session engine's
 * landmark table, the block ledger, the seed chain, the learned carry, the
 * weekly coach's "set by hand" list) runs on the numbers it would use for a
 * person who never set any:
 *   - mergeLandmarkPrecedence takes no manual input and never reports a
 *     'manual' source;
 *   - getManualLandmarks answers null and getManualVolumeMuscles answers [],
 *     without reading storage.
 * The stored blob is deliberately left alone: not deleted, not migrated, still
 * synced as a preference (src/lib/sync.js). It is just never read. Reviving
 * the layer is a founder decision, not an edit here.
 *
 * Volyume is fully free (founder decision 2026-09-03): there is no Free/Pro
 * split, so the old ADAPTED-layer Pro gate is gone -- the adapted table is
 * available to every user with enough data. No ED-safety surface is
 * involved (training volume bands, not calories).
 */
import { VOLUME_LANDMARKS, computeAdaptiveLandmarks } from './algorithms';
import { buildPlanLandmarks, plannedWeeklyVolumeByMuscle } from './planVolumeTargets';

/**
 * Pure merge of the three layers. Exported for tests and for callers that
 * already hold the pieces. A `manual` input, which callers used to pass, is
 * ignored: that layer is retired (see the header, D219 founder answer
 * 2026-10-05), so nothing a caller holds of the person's own targets can
 * change the table.
 *
 * @param {?object} adapted  computeAdaptiveLandmarks output or null
 * @param {?object} plan     buildPlanLandmarks output ({table, source}) or
 *                           null. Absent means fall straight to research,
 *                           which is what blockLedgerRunner wants: that
 *                           lane resolves its own profile-adjusted prior.
 * @param {object}  research defaults table
 * @returns {{ table: object, source: object }} table is complete over
 *   research's muscles; source maps each muscle to
 *   'adapted'|'plan'|'profile'|'research'.
 */
export function mergeLandmarkPrecedence({ adapted = null, plan = null, research = VOLUME_LANDMARKS } = {}) {
  const table = {};
  const source = {};
  for (const muscle of Object.keys(research)) {
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
export async function getEffectiveLandmarks(userId, { userProfile = null } = {}) {
  if (!userId) return mergeLandmarkPrecedence({});
  // No manual read: the person's own targets layer is retired (see the header,
  // D219 founder answer 2026-10-05), so the stored blob is never consulted.
  const adapted = await getAdaptedLandmarks(userId);
  const plan = await getPlanLandmarks(userId, { userProfile });
  return mergeLandmarkPrecedence({ adapted, plan });
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
  return buildPlanLandmarks({ plannedByMuscle, userProfile: profile, nowMs: Date.now() });
}

/**
 * D219 (design 5.3, lane A5): the roles of the ACTIVE plan's muscles, read from
 * the plan's own facts (`programmes.plan_facts`, `version: 2`, the plan the new
 * planner built; a check-in that raised a muscle writes `raised` there). Every
 * surface that judges a muscle's weekly sets reads the same map, so a muscle the
 * person picked to bring up is judged against its focus range and not against a
 * ceiling that never knew. A plan with no facts (a library, kit or manual plan,
 * a plan the older generator built), no plan at all, or an unreadable read gives
 * an empty map, and every muscle then reads the standard bands. Best effort:
 * never throws, and the lazy require keeps pure consumers out of the DB graph.
 *
 * @param {string} userId
 * @returns {Promise<Object<string, string>>} { [muscle]: 'focus'|'raised'|'standard'|'maintenance' }
 */
export async function getPlanRoles(userId) {
  if (!userId) return {};
  try {
    // eslint-disable-next-line global-require
    const { getActivePlan, getProgrammePlanFacts } = require('./database');
    const plan = await getActivePlan(userId);
    if (!plan?.id) return {};
    const facts = await getProgrammePlanFacts(plan.id);
    const roles = facts?.version === 2 ? facts.roles : null;
    return roles && typeof roles === 'object' && !Array.isArray(roles) ? { ...roles } : {};
  } catch (_) { return {}; /* roles absent: the standard bands */ }
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
 *
 * A pure predicate on whatever entry it is handed. Since the manual layer
 * was retired (D219, founder answer 2026-10-05) no caller in the app reads a
 * stored entry to hand it one (getManualLandmarks answers null), so in the
 * app it only ever sees "no entry" and answers false; it stays exported for
 * the pure engine modules and suites that still take an entry as input.
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
 * RETIRED, INERT: the person's own landmark table. Always resolves null and
 * never reads storage (D219, founder answer 2026-10-05, "Remove the editor":
 * "One set of numbers everywhere"; see the header).
 *
 * It used to read @volyume_landmarks_<userId> so blockLedgerRunner could let a
 * manual entry win the seeding fallback chain and mark the muscle's ledger
 * entry deferredToManual. Those callers still import and await it, so it
 * stays exported and async, and now tells each of them "none": the block
 * ledger, the next-block and activation seeds and the learned carry then run
 * exactly as they do for a person who never set any targets. The stored blob
 * is not deleted or migrated and keeps syncing; it is only never read.
 */
export async function getManualLandmarks(_userId) {
  return null;
}

/**
 * RETIRED, INERT: the muscles whose volume the athlete sets by hand. Always
 * resolves an empty list (D219, founder answer 2026-10-05; see the header).
 *
 * C18 adversarial closure job B4 had the weekly coach read this to judge its
 * own volume changes honestly: a change to a dial the user held themselves was
 * CONFOUNDED rather than scored. With the editor removed nobody holds such a
 * dial, so no outcome is confounded by it and the coach reads a person who
 * once set targets exactly as it reads one who never did. The weekly coach
 * itself is unchanged: it takes this list as an input, and the input is empty.
 * Still async, because its caller chains `.catch` on the promise.
 */
export async function getManualVolumeMuscles(_userId) {
  return [];
}

/**
 * The session-grain adapted table, or null. Exported (Stage 6) for the
 * runner's adaptedMrv ceiling clamp — same lazy require, same fail-open
 * posture as before.
 *
 * Volyume is fully free (founder decision 2026-09-03): the old Pro gate is
 * gone. `tier` stays an accepted (unused) option only because call sites
 * outside this module's lane still pass it through unchanged.
 */
export async function getAdaptedLandmarks(userId) {
  if (!userId) return null;
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
