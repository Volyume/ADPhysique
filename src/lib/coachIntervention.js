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
/**
 * How a signal's movement is read.
 *
 *   'direction'        the record's own direction says which way is better.
 *                      Weight is the case: a raise wants the trend up, a cut
 *                      wants it down, so the same movement means opposite
 *                      things depending on what was applied.
 *   'higher_is_better' the signal has an intrinsic good direction. Training
 *                      progress and systemic recovery are both like this:
 *                      recovery falling is worse whether volume went up or
 *                      down, and no intervention direction changes that.
 */
export const COMPARE = Object.freeze({
  DIRECTION: 'direction',
  HIGHER_IS_BETTER: 'higher_is_better',
});

export const OBSERVE = Object.freeze({
  [INTERVENTION_KIND.CALORIE_TARGET]: {
    unit: 'weeks', min: 2, signals: ['weight.trend'], compare: COMPARE.DIRECTION,
  },
  // ADVERSARIAL CLOSURE, JOB B2. This observed `recovery.systemic` ALONE while
  // the apply site's own comment claimed it was "judged on recovery AND
  // performance". Observing recovery alone cannot tell the two outcomes that
  // matter apart: volume that bought real progress at a fair recovery cost,
  // and volume that bought nothing. Both signals are now required, and
  // IMPROVED needs both - which is the honest bar for "adding work worked".
  [INTERVENTION_KIND.VOLUME_START]: {
    unit: 'weeks', min: 2, signals: ['training.progress', 'recovery.systemic'],
    compare: COMPARE.HIGHER_IS_BETTER,
  },
  [INTERVENTION_KIND.PRESCRIPTION]: {
    unit: 'exposures', min: 3, signals: ['training.progress'], compare: COMPARE.HIGHER_IS_BETTER,
  },
  [INTERVENTION_KIND.EXERCISE_REPLACEMENT]: {
    unit: 'exposures', min: 3, signals: ['training.progress'], compare: COMPARE.HIGHER_IS_BETTER,
  },
  [INTERVENTION_KIND.STRUCTURE]: {
    unit: 'weeks', min: 4, signals: ['training.progress'], compare: COMPARE.HIGHER_IS_BETTER,
  },
});

/**
 * The signals a record must be judged on.
 *
 * HISTORICAL COMPATIBILITY, and it is load-bearing: `observe` is stored INSIDE
 * each intervention record, so records written before job B carry the old
 * single-`signal` shape and keep being judged exactly as they were. Nothing
 * re-interprets an old record under the new rules.
 */
function observedSignals(observe) {
  if (Array.isArray(observe?.signals) && observe.signals.length) return observe.signals;
  return observe?.signal ? [observe.signal] : [];
}

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
  baselines = null, goalPhase = null, appliedValue = null,
  maintenanceAuthority = null,
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
    appliedValue: num(appliedValue),
    because,
    // Recorded so a later dose comparison can refuse to read a cutting
    // response as evidence about a gaining dose.
    goalPhase,
    authorisedBy: Array.isArray(authorisedBy) ? authorisedBy.filter(Boolean) : [],
    heldConstant: Array.isArray(heldConstant) ? heldConstant.filter(Boolean) : [],
    baseline,
    // Job B2: one reading per observed signal, so a multi-signal record can
    // say which of them moved the wrong way rather than guessing.
    baselines: baselines && typeof baselines === 'object' ? baselines : null,
    // Campaign 19 receipt: the exact observational authority used when this
    // prescription was accepted. This never makes the record a second source.
    maintenanceAuthority: maintenanceAuthority && typeof maintenanceAuthority === 'object'
      ? { ...maintenanceAuthority } : null,
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
      out.push({
        ...rec,
        weekStart: num(week.weekStart),
        appliedAt: rec.appliedAt ?? num(entry.appliedAt),
        // Older Campaign 18 rows stored the landed calorie target beside the
        // record rather than inside it. Preserve that truth when reading so
        // manual-override detection works across the rollout boundary.
        appliedValue: rec.appliedValue ?? num(entry.newKcal),
      });
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
  if (record.kind === INTERVENTION_KIND.CALORIE_TARGET) {
    const landed = num(record.appliedValue);
    const current = num(after?.nutrition?.targetKcal);
    if (landed != null && current != null && landed !== current) {
      return { outcome: OUTCOME.CONFOUNDED, because: 'user_changed_it_themselves' };
    }
  }
  // A result under a different goal is not the result of the old decision.
  // A missing phase is also not proof of comparability: missing != same.
  const currentGoalPhase = after?.intent?.goalPhase ?? null;
  if (record.goalPhase !== currentGoalPhase) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'goal_phase_changed_or_unknown' };
  }

  // ADVERSARIAL CLOSURE JOB B4. The athlete took the volume dial themselves:
  // whatever their sets did afterwards, it is not a reading on our change.
  // The mirror of the calorie manual-override check above.
  if (record.kind === INTERVENTION_KIND.VOLUME_START
      && (after?.intent?.manualVolumeMuscles?.length ?? 0) > 0) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'user_changed_it_themselves' };
  }

  // For training-side changes the athlete has to have kept training for the
  // reading to mean anything at all. Checked BEFORE the signal scan because it
  // is the ROOT cause: an unrun block makes training.progress unknown by
  // design, and reporting that as "the evidence vanished" would name the
  // symptom rather than the reason.
  if (record.domain === 'training' && after?.training?.execution?.signal !== SIGNAL.GOOD) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'training_stopped' };
  }

  const signalKeys = observedSignals(record.observe);
  if (!signalKeys.length) return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'no_record' };
  const facts = signalKeys.map((key) => ({ key, fact: readFact(after, key) }));

  // The evidence that would judge it is gone. Not a failure, not a success.
  // With more than one observed signal ANY missing reading is disqualifying:
  // half an observation is not a verdict.
  const missing = facts.find(({ fact }) => !fact || fact.signal === SIGNAL.UNKNOWN);
  if (missing) {
    // Distinguish "never had enough time" from "the evidence disappeared":
    // the first is simply early, the second is a genuine confound.
    if (windowMet === false) return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'still_within_observation_window' };
    return { outcome: OUTCOME.CONFOUNDED, because: `${missing.key}_became_unknown` };
  }

  if (windowMet === false) {
    return { outcome: OUTCOME.INSUFFICIENT_EVIDENCE, because: 'still_within_observation_window' };
  }

  // And for a calorie change the diary has to have kept covering the week.
  if (record.kind === INTERVENTION_KIND.CALORIE_TARGET
      && after?.nutrition?.coverage?.signal === SIGNAL.UNKNOWN) {
    return { outcome: OUTCOME.CONFOUNDED, because: 'diary_coverage_lost' };
  }

  // IMPROVED needs EVERY observed signal to be good. For a volume increase
  // that means the training moved AND recovery held: buying progress by
  // burying the athlete is not an improvement, and neither is untroubled
  // recovery with nothing to show for the extra work.
  if (facts.every(({ fact }) => fact.signal === SIGNAL.GOOD)) {
    return { outcome: OUTCOME.IMPROVED, because: `${facts.map((f) => f.key).join('+')}_now_good` };
  }

  // Not all good. Did something get worse, or merely not get better? Only
  // claimed where there is a baseline number to compare against; otherwise
  // UNCHANGED, which is the weaker and therefore safer claim.
  const compare = record.observe?.compare ?? COMPARE.DIRECTION;
  for (const { key, fact } of facts) {
    const before = num(baselineValue(record, key));
    const now = num(fact.value);
    if (before == null || now == null) continue;
    const moved = compare === COMPARE.HIGHER_IS_BETTER
      ? now - before
      : (now - before) * record.direction;
    if (compare === COMPARE.DIRECTION && record.direction === 0) continue;
    if (moved < 0) return { outcome: OUTCOME.WORSENED, because: `${key}_moved_the_wrong_way` };
  }
  const offTarget = facts.find(({ fact }) => fact.signal !== SIGNAL.GOOD) ?? facts[0];
  return { outcome: OUTCOME.UNCHANGED, because: `${offTarget.key}_still_off_target` };
}

/**
 * The reading this record was moving away from, for one observed signal.
 *
 * Records carry either a single `baseline` ({ key, value }) or, once more than
 * one signal is observed, a `baselines` map keyed by signal. The single form
 * is still honoured for its own key so records written before job B keep
 * judging exactly as they did.
 */
function baselineValue(record, key) {
  const map = record?.baselines;
  if (map && typeof map === 'object' && Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }
  if (record?.baseline?.key === key) return record.baseline.value;
  // An unkeyed single baseline belongs to the record's only signal.
  if (record?.baseline && record.baseline.key == null && observedSignals(record.observe).length === 1) {
    return record.baseline.value;
  }
  return null;
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
export function recentUnjudgedIntervention(records = [], domain, {
  nowMs = null, goalPhase = null,
} = {}) {
  for (const r of Array.isArray(records) ? records : []) {
    if (r.domain !== domain) continue;
    if (domain === 'nutrition' && r.goalPhase !== goalPhase) continue;
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
export function wouldReverseRecent(records, domain, proposedDirection, {
  nowMs = null, goalPhase = null,
} = {}) {
  const recent = recentUnjudgedIntervention(records, domain, { nowMs, goalPhase });
  if (!recent) return null;
  const dir = Math.sign(Number(proposedDirection) || 0);
  if (dir === 0 || dir === recent.direction) return null;
  return recent;
}

// ─── FUTURE DECISION USE (founder rule E) ───────────────────────────────────

/**
 * DOSE LEARNING (founder job A2). May the athlete's own response to a
 * previous change resize the next one?
 *
 * THE LAW THIS IS BUILT AROUND: "Outcome history is evidence. It is NOT
 * automatic authority... may not manufacture an intervention that current
 * evidence does not justify."
 *
 * So this returns a MULTIPLIER and nothing else. The caller has already
 * decided, on this week's evidence alone, that a change is warranted and in
 * which direction; all this can do is say the previous dose of the same
 * medicine was observed, completed its window, and did not move anything -
 * which is a reason to step rather than to repeat. It cannot create a change,
 * it cannot reverse one, and every safety clamp still applies afterwards.
 *
 * Every one of the founder's conditions is required, and any failure returns
 * the inert multiplier so the caller falls back to ordinary logic:
 *
 *   - the previous intervention was ACCEPTED (only accepted ones have records)
 *   - it pointed the SAME way as the one now proposed
 *   - its observation window COMPLETED
 *   - its outcome was UNCHANGED, never CONFOUNDED and never IMPROVED
 *   - the goal phase is still the same, so the comparison is meaningful
 *   - current evidence is reliable (the caller's own gate, re-checked here)
 *
 * @returns {{ multiplier, escalate, because, priorMagnitude }}
 */
export const DOSE_ESCALATION_MULTIPLIER = 1.5;

export function doseEscalation({
  records = [], after = null, nowMs = null, direction = 0, goalPhase = null,
} = {}) {
  const inert = { multiplier: 1, escalate: false, because: 'no_prior_response', priorMagnitude: null };
  const dir = Math.sign(Number(direction) || 0);
  if (!dir || !after) return inert;

  // Reliable CURRENT evidence is a precondition, not an inference from the
  // past: a response cannot be read against a week we cannot read.
  if (after?.weight?.trend?.signal === SIGNAL.UNKNOWN) return inert;
  if (after?.nutrition?.coverage?.signal !== SIGNAL.GOOD) return inert;

  for (const r of Array.isArray(records) ? records : []) {
    if (r.kind !== INTERVENTION_KIND.CALORIE_TARGET) continue;
    // A different goal phase is a materially changed circumstance: last
    // block's cutting response says nothing about this block's gaining dose.
    if (r.goalPhase !== goalPhase) continue;
    if (r.direction !== dir) continue;
    const windowMet = observationWindowMet(r, { nowMs });
    if (!windowMet) return inert; // still being observed: anti-oscillation owns this
    const { outcome } = classifyOutcome(r, { after, windowMet: true });
    // CONFOUNDED NEVER TEACHES (rule A5). IMPROVED does not escalate either:
    // a change that worked is a reason to hold, not to push harder.
    if (outcome !== OUTCOME.UNCHANGED) return inert;
    const prior = num(r.magnitude);
    return {
      multiplier: DOSE_ESCALATION_MULTIPLIER,
      escalate: true,
      because: 'previous_same_direction_change_did_not_move_it',
      priorMagnitude: prior,
    };
  }
  return inert;
}

/**
 * ADVERSARIAL CLOSURE, JOB B1 + B3. THE TRAINING SIDE OF THE LEARNING LOOP.
 *
 * WHAT WAS MISSING, stated exactly. Volume interventions were RECORDED at the
 * apply site and READ into the weekly run, and then nothing consulted them
 * when the next volume decision was made. The nutrition side had two
 * consumers (anti-oscillation and dose escalation); the training side had
 * none, so the app could add sets, watch that fail, and add the same sets
 * again the following week with no memory of having tried it. "A helper called
 * only from tests is NOT delivered" - this closes the training half of that.
 *
 * WHY IT ONLY EVER WITHHOLDS. Volume is the safety-adjacent dial, so this
 * returns holds and never a push: `holdIncrease` can lower a proposed increase
 * to zero and `blockEscalation` can refuse the sustained-over-performance
 * extra step, and neither can create, enlarge or reverse a change. A REDUCTION
 * is never touched at all - easing an athlete who is not recovering must never
 * wait for a previous decision to finish being judged, which is the same law
 * the rapid-loss override states on the nutrition side.
 *
 * THE THREE MEMORIES, and each is a different fact:
 *
 *   OSCILLATION   the last accepted volume change is still inside its window
 *                 and pointed the other way. Reversing it now would be the
 *                 +2 / -2 / +2 churn founder rule F forbids.
 *   HARM          the last comparable increase completed its window and came
 *                 back WORSENED - the athlete's own history says this dose
 *                 costs them. Another increase is held.
 *   NO RESPONSE   it completed its window and came back UNCHANGED. That is
 *                 not a reason to hold an evidence-backed increase, but it IS
 *                 a reason to refuse the DISCRETIONARY extra step on top of
 *                 it: escalating a dose that demonstrably did nothing is
 *                 exactly the memoryless repetition B3 names.
 *
 * CONFOUNDED NEVER TEACHES. Only the two decisive outcomes are acted on, so a
 * block the athlete stopped training, or one where they set volume manually
 * themselves, withholds nothing.
 *
 * Pure. Same records, same context, same answer.
 *
 * @returns {{ holdIncrease, blockEscalation, because, priorOutcome }}
 */
export function volumeDecisionMemory({
  records = [], after = null, nowMs = null, proposedDirection = 0,
} = {}) {
  const inert = {
    holdIncrease: false, blockEscalation: false, because: null, priorOutcome: null,
  };
  const dir = Math.sign(Number(proposedDirection) || 0);
  // Nothing to say about a hold, and never anything to say about easing off.
  if (dir <= 0 || !after) return inert;

  const volume = (Array.isArray(records) ? records : [])
    .filter((r) => r?.kind === INTERVENTION_KIND.VOLUME_START);
  if (!volume.length) return inert;

  // Most-recent-first (interventionsFromHistory order): the newest record is
  // the one whose consequences are live.
  const last = volume[0];
  const windowMet = observationWindowMet(last, { nowMs });
  if (!windowMet) {
    return last.direction < 0
      ? {
        holdIncrease: true, blockEscalation: true, priorOutcome: null,
        because: 'recent_volume_change_still_being_observed',
      }
      : { ...inert, blockEscalation: true, because: 'recent_volume_change_still_being_observed' };
  }

  const { outcome } = classifyOutcome(last, { after, windowMet: true });
  if (outcome === OUTCOME.WORSENED && last.direction > 0) {
    return {
      holdIncrease: true, blockEscalation: true, priorOutcome: outcome,
      because: 'last_volume_increase_made_things_worse',
    };
  }
  if (outcome === OUTCOME.UNCHANGED && last.direction > 0) {
    return {
      holdIncrease: false, blockEscalation: true, priorOutcome: outcome,
      because: 'last_volume_increase_changed_nothing',
    };
  }
  return { ...inert, priorOutcome: outcome };
}

/**
 * POSITIVE RESPONSE (founder job A3). A change that worked is a reason to
 * LEAVE THINGS ALONE, and the athlete should be told that in those words.
 *
 * Returns a line only where the last judged change genuinely improved things
 * AND the plan is currently on target. Never used to justify another change.
 */
export function holdReinforcement({
  records = [], after = null, nowMs = null, onTarget = false, goalPhase = null,
} = {}) {
  if (!onTarget || !after) return null;
  for (const r of Array.isArray(records) ? records : []) {
    if (r.kind !== INTERVENTION_KIND.CALORIE_TARGET) continue;
    if (r.goalPhase !== goalPhase) continue;
    if (!observationWindowMet(r, { nowMs })) return null;
    const { outcome } = classifyOutcome(r, { after, windowMet: true });
    if (outcome !== OUTCOME.IMPROVED) return null;
    return {
      because: 'previous_change_worked_and_still_is',
      text: 'The last change to your calorie target did what we wanted, and it is still working. We are leaving it alone.',
    };
  }
  return null;
}

// NOTE ON A DELETED HELPER. An `outcomeEvidence` tally used to live here,
// designed as the feed for future dose decisions. `doseEscalation` and
// `holdReinforcement` above turned out to be the honest shape of that feed -
// they read the records directly and answer a specific question - which left
// the tally with no purpose. A product-intended helper with no consumer is
// not "test-only by design", it is unfinished, so it is gone rather than
// dressed up.

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
