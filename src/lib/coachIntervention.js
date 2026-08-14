/**
 * coachIntervention.js — Campaign 18 outcome follow-up.
 *
 * "An elite coach does not merely remember 'I changed X'. They remember
 * 'I changed X because of Y, and afterwards Z happened.'"
 *
 * WHAT WAS ALREADY THERE, AND WHY IT WAS NOT ENOUGH. `coachOutcome.js` pairs
 * an applied week with the FOLLOWING week's `trend.onTarget` and shows a
 * count on the held-history screen. That is live and it is honest, but it is
 * the wrong model for learning:
 *
 *   - it judges EVERY domain by next week's WEIGHT trend, so a training
 *     volume change is scored on the scale;
 *   - one week is not an observation window for a calorie change, and the
 *     app's own two-week adjustment cooldown already says so;
 *   - the verdict is binary, so "we cannot tell" and "it did not work" are
 *     the same answer;
 *   - nothing detects confounding, so a week where the diary went dark reads
 *     as a clean result;
 *   - and nothing feeds back into a later decision. It is a scoreboard, not
 *     a memory.
 *
 * This module is the memory. It records what was changed, why, and what
 * would have to be true before the change can be judged - then classifies
 * the result conservatively and lets a later decision use it as EVIDENCE.
 *
 * NOT AUTHORITY. "Do NOT create simplistic rules such as 'last intervention
 * worked, always do it again'." Nothing here decides anything. It reports
 * what happened after a change, with an explicit CONFOUNDED state for the
 * many weeks where the honest answer is that we cannot attribute anything.
 *
 * ONLY WHAT THE USER ACCEPTED. Records are written at the apply sites, which
 * only run on a deliberate tap. Volyume never scores a change it proposed
 * and the user declined.
 *
 * NO INVENTED CLOCKS. Every observation window below is an existing product
 * authority (the calorie cooldown, the exercise evidence maturity, the block
 * boundary), not a new time constant.
 *
 * PURE. No I/O, no clock: the caller passes nowMs.
 */
import { SIGNAL } from './coachContext';

/** The coaching changes worth remembering. Trivial UI actions are not here. */
export const INTERVENTION_KIND = Object.freeze({
  CALORIE_TARGET: 'calorie_target',
  VOLUME_START: 'volume_start',
  PRESCRIPTION: 'prescription',
  EXERCISE_REPLACEMENT: 'exercise_replacement',
  STRUCTURE: 'structure',
});

/**
 * What happened afterwards. Five states, and the last two are the point:
 * forcing every intervention into success or failure is how a coach learns
 * the wrong lesson confidently.
 */
export const OUTCOME = Object.freeze({
  IMPROVED: 'improved',
  UNCHANGED: 'unchanged',
  WORSENED: 'worsened',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
  CONFOUNDED: 'confounded',
});

/**
 * How long before an intervention can be judged, expressed in the units that
 * domain already measures itself in.
 *
 * The calorie window is the app's OWN two-week adjustment cooldown
 * (weeklyCoach: `lastCalAdjustmentWeeksAgo >= 2`), not a new number: the
 * engine already holds that two weeks is the shortest span over which a
 * calorie change can be read, and it would be incoherent for the follow-up
 * layer to believe something different about the same question.
 */
export const OBSERVE = Object.freeze({
  [INTERVENTION_KIND.CALORIE_TARGET]: { unit: 'weeks', min: 2, signal: 'weight.trend' },
  [INTERVENTION_KIND.VOLUME_START]: { unit: 'weeks', min: 2, signal: 'recovery.systemic' },
  [INTERVENTION_KIND.PRESCRIPTION]: { unit: 'exposures', min: 3, signal: 'training.progress' },
  [INTERVENTION_KIND.EXERCISE_REPLACEMENT]: { unit: 'exposures', min: 3, signal: 'training.progress' },
  [INTERVENTION_KIND.STRUCTURE]: { unit: 'weeks', min: 4, signal: 'training.progress' },
});

const RECORD_VERSION = 1;
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * The structured truth an intervention leaves behind.
 *
 * "Do not store prose as the sole source of truth." Every question the
 * founder listed has a field: what changed, when, why, which domain, what
 * authorised it, what was deliberately held, what should be observed, and
 * what would be needed before judging it.
 *
 * @param {object} p
 * @param {string} p.kind          INTERVENTION_KIND
 * @param {number} p.appliedAtMs   when the user accepted it
 * @param {number} p.direction     +1 or -1
 * @param {number} [p.magnitude]   kcal, sets, whatever the domain counts in
 * @param {string} [p.because]     the limiter/reason CODE that authorised it
 * @param {Array}  [p.authorisedBy] context fact keys that were GOOD at the time
 * @param {Array}  [p.heldConstant] domains deliberately left alone
 * @param {object} [p.baseline]    the reading being moved away from
 */
export function buildInterventionRecord({
  kind, appliedAtMs, direction, magnitude = null,
  because = null, authorisedBy = [], heldConstant = [], baseline = null,
} = {}) {
  if (!INTERVENTION_KIND[String(kind).toUpperCase()] && !Object.values(INTERVENTION_KIND).includes(kind)) {
    return null;
  }
  const observe = OBSERVE[kind] ?? null;
  return {
    v: RECORD_VERSION,
    kind,
    domain: kind === INTERVENTION_KIND.CALORIE_TARGET ? 'nutrition' : 'training',
    appliedAt: num(appliedAtMs),
    direction: Math.sign(num(direction) ?? 0),
    magnitude: num(magnitude),
    because,
    authorisedBy: Array.isArray(authorisedBy) ? authorisedBy.filter(Boolean) : [],
    heldConstant: Array.isArray(heldConstant) ? heldConstant.filter(Boolean) : [],
    baseline,
    observe,
  };
}

/**
 * Pull every accepted intervention out of the coach-output history.
 *
 * Reads `appliedAdjustments`, which only `coachApply.markApplied` writes and
 * which only runs on a deliberate tap - so an intervention the user never
 * accepted has no record and can never be scored (founder rule G).
 *
 * @param {Array} historyDesc  getCoachOutputHistory order (most-recent-first)
 */
export function interventionsFromHistory(historyDesc = []) {
  const out = [];
  for (const week of Array.isArray(historyDesc) ? historyDesc : []) {
    const applied = week?.appliedAdjustments;
    if (!applied || typeof applied !== 'object') continue;
    for (const entry of Object.values(applied)) {
      const rec = entry?.intervention;
      if (!rec || rec.v !== RECORD_VERSION || !rec.kind) continue;
      out.push({ ...rec, weekStart: num(week.weekStart), appliedAt: rec.appliedAt ?? num(entry.appliedAt) });
    }
  }
  return out.sort((a, b) => (b.appliedAt ?? 0) - (a.appliedAt ?? 0));
}

/**
 * Has enough happened since this change for it to be judged at all?
 *
 * @param {object} record
 * @param {object} p { nowMs, exposuresSince }
 */
export function observationWindowMet(record, { nowMs = null, exposuresSince = null } = {}) {
  const obs = record?.observe;
  if (!obs) return false;
  if (obs.unit === 'weeks') {
    const at = num(record.appliedAt);
    const now = num(nowMs);
    if (at == null || now == null) return false;
    return (now - at) >= obs.min * 7 * 86400000;
  }
  const n = num(exposuresSince);
  return n != null && n >= obs.min;
}

/**
 * What happened after the change.
 *
 * CONFOUNDING IS CHECKED FIRST, deliberately. A result that cannot be
 * attributed must never be recorded as a result, and the confounders are
 * exactly the founder's: the evidence that would judge it went missing, or
 * the user changed the same thing themselves in the meantime.
 *
 * @param {object} record
 * @param {object} p
 * @param {object} p.after           the CURRENT coach context
 * @param {boolean} [p.userOverrode] the user changed this domain themselves
 * @param {boolean} [p.windowMet]
 */
export function classifyOutcome(record, { after = null, userOverrode = false, windowMet = null } = {}) {
  if (!record || !after) return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'no_record' };

  // The user took the wheel. Whatever happened next is not ours to claim.
  if (userOverrode) return { outcome: OUTCOME.CONFOUNDED, because: 'user_changed_it_themselves' };

  const signalKey = record.observe?.signal;
  const fact = readFact(after, signalKey);

  // The evidence that would judge it is gone. Not a failure, not a success.
  if (!fact || fact.signal === SIGNAL.UNKNOWN) {
    // Distinguish "never had enough time" from "the evidence disappeared":
    // the first is simply early, the second is a genuine confound.
    if (windowMet === false) return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'still_within_observation_window' };
    return { outcome: OUTCOME.CONFOUNDED, because: `${signalKey}_became_unknown` };
  }

  if (windowMet === false) {
    return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'still_within_observation_window' };
  }

  // For training-side changes the athlete has to have kept training for the
  // reading to mean anything at all.
  if (record.domain === 'training' && after?.training?.execution?.signal !== SIGNAL.GOOD) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'training_stopped' };
  }
  // And for a calorie change the diary has to have kept covering the week.
  if (record.kind === INTERVENTION_KIND.CALORIE_TARGET
      && after?.nutrition?.coverage?.signal === SIGNAL.UNKNOWN) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'diary_coverage_lost' };
  }

  if (fact.signal === SIGNAL.GOOD) return { outcome: OUTCOME.IMPROVED, because: `${signalKey}_now_good` };

  // Still poor. Did it get worse, or merely not better? Only claimed where
  // there is a baseline number to compare against; otherwise UNCHANGED, which
  // is the weaker and therefore safer claim.
  const before = num(record.baseline?.value);
  const now = num(fact.value);
  if (before != null && now != null && record.direction !== 0) {
    const moved = (now - before) * record.direction;
    if (moved < 0) return { outcome: OUTCOME.WORSENED, because: `${signalKey}_moved_the_wrong_way` };
  }
  return { outcome: OUTCOME.UNCHANGED, because: `${signalKey}_still_off_target` };
}

/** Read a `domain.fact` key out of a coach context. */
function readFact(context, key) {
  if (!context || !key) return null;
  const [domain, name] = String(key).split('.');
  return context?.[domain]?.[name] ?? null;
}

// ─── ANTI-OSCILLATION (founder rule F) ──────────────────────────────────────

/**
 * A change in this domain that has not yet had its chance.
 *
 * "A recent intervention awaiting sufficient evidence should generally
 * prevent another weakly supported reversal." Returns the record when one is
 * still inside its observation window, so the caller can refuse to undo it on
 * a single noisy reading.
 */
export function recentUnjudgedIntervention(records = [], domain, { nowMs = null } = {}) {
  for (const r of Array.isArray(records) ? records : []) {
    if (r.domain !== domain) continue;
    if (!observationWindowMet(r, { nowMs })) return r;
  }
  return null;
}

/**
 * Would this proposed change UNDO a recent one that has not been judged yet?
 *
 * Only a reversal is blocked. Continuing in the same direction is a dose
 * decision, not an oscillation, and the domain's own gates already govern it.
 */
export function wouldReverseRecent(records, domain, proposedDirection, { nowMs = null } = {}) {
  const recent = recentUnjudgedIntervention(records, domain, { nowMs });
  if (!recent) return null;
  const dir = Math.sign(Number(proposedDirection) || 0);
  if (dir === 0 || dir === recent.direction) return null;
  return recent;
}

// ─── FUTURE DECISION USE (founder rule E) ───────────────────────────────────

/**
 * What the record of past changes legitimately supports, as EVIDENCE.
 *
 * Deliberately returns observations rather than instructions. A caller may
 * weigh these; nothing here tells it what to do, because "it worked last
 * time" is not a coaching principle.
 *
 * @returns {{ judged, improved, unchanged, worsened, confounded, lastJudged }}
 */
export function outcomeEvidence(records = [], { kind = null, after = null, nowMs = null } = {}) {
  const relevant = (Array.isArray(records) ? records : [])
    .filter((r) => !kind || r.kind === kind);
  const tally = {
    judged: 0, improved: 0, unchanged: 0, worsened: 0, confounded: 0, lastJudged: null,
  };
  for (const r of relevant) {
    const windowMet = observationWindowMet(r, { nowMs });
    const { outcome } = classifyOutcome(r, { after, windowMet });
    if (outcome === OUTCOME.INSUFFICIENT_EVIDENCE) continue;
    if (outcome === OUTCOME.CONFOUNDED) { tally.confounded += 1; continue; }
    tally.judged += 1;
    if (outcome === OUTCOME.IMPROVED) tally.improved += 1;
    if (outcome === OUTCOME.UNCHANGED) tally.unchanged += 1;
    if (outcome === OUTCOME.WORSENED) tally.worsened += 1;
    if (!tally.lastJudged) tally.lastJudged = { ...r, outcome };
  }
  return tally;
}

/**
 * Plain English for what happened after a change, or null.
 *
 * States the observation and stops. Never says the change CAUSED the result:
 * the app sees a sequence, not a mechanism.
 */
export function outcomeCopy(record, outcome) {
  if (!record || !outcome) return null;
  const what = record.kind === INTERVENTION_KIND.CALORIE_TARGET
    ? (record.direction > 0 ? 'raised your calorie target' : 'lowered your calorie target')
    : record.kind === INTERVENTION_KIND.VOLUME_START
      ? (record.direction > 0 ? 'added training volume' : 'eased your training volume')
      : 'changed your programme';
  switch (outcome) {
    case OUTCOME.IMPROVED:
      return `Since we ${what}, things have moved into the range we were aiming for.`;
    case OUTCOME.UNCHANGED:
      return `Since we ${what}, things have not moved much yet.`;
    case OUTCOME.WORSENED:
      return `Since we ${what}, things have moved further from where we were aiming.`;
    case OUTCOME.CONFOUNDED:
      return `We cannot tell what came of the last change, so we are not counting it either way.`;
    case OUTCOME.INSUFFICIENT_EVIDENCE:
      return `The last change has not had long enough to show yet.`;
    default:
      return null;
  }
}
