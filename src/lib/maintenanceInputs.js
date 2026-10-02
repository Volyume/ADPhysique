/**
 * maintenanceInputs.js -- the ONE mapping from the stored reads to the inputs
 * of the effective-maintenance resolver (register D214 addendum 4, BM-14;
 * spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 item 5 and section 6).
 *
 * Before this, every surface mapped the reads for itself. Body metrics read
 * the body-fat percentage off its merged history rows, which carry no
 * body-fat source, so its formula context differed from the hook's and the
 * coach's, and the screen could say the estimate was still being built while
 * the coach held a current figure. The resolver's formula context
 * (effectiveMaintenance.js formulaContextSignature) hashes sex, height, body
 * fat and its source, activity level and the date of birth, so two surfaces
 * agree only when they build that context from the same reads in the same
 * order of precedence. This module is that order:
 *
 *  - sex, date of birth, height: the stored body profile, then the in-memory
 *    profile;
 *  - weight: the latest weigh-in, then the in-memory profile;
 *  - body fat and its source: the latest body-composition row
 *    (bodyMetricsRepository.getLatestBodyComposition), nothing else;
 *  - activity level and goal phase: the saved nutrition targets, then the
 *    in-memory profile;
 *  - age: left to the resolver's own reading of the date of birth (the
 *    current age); the in-memory age is passed only when no date of birth
 *    exists, so a stored age never overrides a known birthday.
 *
 * `buildMaintenanceInputs` is pure. `readMaintenanceInputs` performs the
 * canonical reads, best effort: a failed read degrades that field to its
 * next fallback and never throws. Neither persists anything.
 */

/**
 * @param {object} p
 * @param {?object} p.profile       the stored body profile (database.getUserBodyProfile)
 * @param {?object} p.userProfile   the in-memory profile (the store)
 * @param {?object} p.targets       the saved nutrition targets (database.getNutritionTargets)
 * @param {?object} p.latestWeight  the latest weigh-in row ({ weightKg, loggedAt })
 * @param {?object} p.composition   the latest body-composition row ({ bodyFatPercent, bodyFatSource })
 * @returns {object} the resolver's inputs (effectiveMaintenanceService.normaliseMaintenanceInputs)
 */
export function buildMaintenanceInputs({
  profile = null, userProfile = null, targets = null, latestWeight = null, composition = null,
} = {}) {
  const dateOfBirth = profile?.dateOfBirth ?? userProfile?.dateOfBirth ?? null;
  return {
    sex: profile?.sex ?? userProfile?.sex ?? null,
    dateOfBirth,
    ageYears: dateOfBirth ? null : (userProfile?.ageYears ?? userProfile?.age ?? null),
    heightCm: profile?.heightCm ?? userProfile?.heightCm ?? null,
    weightKg: latestWeight?.weightKg ?? userProfile?.weightKg ?? null,
    bodyFatPercent: composition?.bodyFatPercent ?? null,
    bodyFatSource: composition?.bodyFatSource ?? null,
    activityLevel: targets?.activityLevel ?? userProfile?.activityLevel ?? null,
    goalPhase: targets?.goal ?? targets?.phase ?? userProfile?.goalPhase ?? null,
  };
}

/** The newest weigh-in row with a positive weight and a readable time, or null. */
export function latestWeighIn(weights) {
  let best = null;
  for (const w of Array.isArray(weights) ? weights : []) {
    const at = Number(w?.loggedAt);
    if (!(Number(w?.weightKg) > 0) || !Number.isFinite(at)) continue;
    if (!best || at > Number(best.loggedAt)) best = w;
  }
  return best;
}

/**
 * The canonical reads, then the mapping. A caller that already holds a read
 * passes it (null counts as "read, nothing there"); an omitted one is read
 * here. `weights` are the morning-weight rows (database.getMorningWeights);
 * the latest of them is the weight input.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {?object} [opts.userProfile]
 * @param {?Array} [opts.weights]
 * @param {?object} [opts.targets]
 * @param {?object} [opts.profile]
 * @param {?object} [opts.composition]
 * @returns {Promise<object>}
 */
export async function readMaintenanceInputs(userId, {
  userProfile = null, weights, targets, profile, composition,
} = {}) {
  // Lazy: the pure mapping above is importable without the database module.
  // eslint-disable-next-line global-require
  const db = require('./database');
  const [p, t, c, w] = await Promise.all([
    profile !== undefined ? profile : db.getUserBodyProfile(userId).catch(() => null),
    targets !== undefined ? targets : db.getNutritionTargets(userId).catch(() => null),
    composition !== undefined ? composition : db.getLatestBodyComposition(userId).catch(() => null),
    weights !== undefined ? weights : db.getMorningWeights(userId, 90).catch(() => []),
  ]);
  return buildMaintenanceInputs({
    profile: p, userProfile, targets: t, latestWeight: latestWeighIn(w), composition: c,
  });
}
