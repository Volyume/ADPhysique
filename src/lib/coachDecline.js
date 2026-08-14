/**
 * coachDecline.js — Campaign 18 job B: remembering that the user said no.
 *
 * THE PROBLEM. Volyume could be told no and forget it. The same
 * recommendation came back the following week as though the conversation had
 * never happened, which is the single most obviously un-coachlike behaviour
 * left in the product: an elite coach remembers "I suggested this, they said
 * no", and does not open every session by suggesting it again.
 *
 * A DECLINE IS NOT AN EXCLUSION. It means NOT NOW, not NEVER. So this module
 * stores enough structured identity to answer one question - "is this the
 * same recommendation, on materially the same evidence?" - and nothing more.
 * The moment the evidence moves, the recommendation is free to return, and it
 * returns saying why it has.
 *
 * SAFETY IS NOT A RECOMMENDATION. A decline can never suppress a calorie
 * floor, rapid-loss protection, an ED hold or a joint-safety hold. Those are
 * not offers, so there is nothing to decline; the engines that own them never
 * consult this module, and the one consumer that does is explicitly gated to
 * the ordinary off-target adjustment path.
 *
 * NO FREE TEXT AS AUTHORITY. The signature below is a small set of coded
 * fields. Copy is rendered from them at read time.
 *
 * PURE. No I/O, no clock.
 */
import { SIGNAL } from './coachContext';

const RECORD_VERSION = 1;

/** How far the evidence must move before a declined recommendation may return. */
export const MATERIAL_RATE_SHIFT_PCT = 0.15;

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * The signature of the SITUATION a recommendation was made in.
 *
 * Deliberately coarse. It carries the shape of the week, not its noise, so an
 * ordinary weigh-in wobble does not read as new evidence while a genuine
 * deterioration does.
 */
export function evidenceSignature(context, { goalPhase = null } = {}) {
  return {
    goalPhase,
    weight: context?.weight?.trend?.signal ?? SIGNAL.UNKNOWN,
    ratePct: num(context?.weight?.trend?.value),
    intake: context?.nutrition?.intake?.signal ?? SIGNAL.UNKNOWN,
    coverage: context?.nutrition?.coverage?.signal ?? SIGNAL.UNKNOWN,
    training: context?.training?.execution?.signal ?? SIGNAL.UNKNOWN,
    recovery: context?.recovery?.systemic?.signal ?? SIGNAL.UNKNOWN,
  };
}

/**
 * What was declined, and in what circumstances.
 *
 * @param {object} p
 * @param {string} p.domain      'nutrition' | 'training'
 * @param {string} p.kind        the recommendation type
 * @param {number} p.direction   +1 / -1
 * @param {number} [p.magnitude]
 * @param {string} [p.target]    the object it was about, where there is one
 * @param {object} p.signature   evidenceSignature at the time
 */
export function buildDeclineRecord({
  domain, kind, direction, magnitude = null, target = null,
  signature = null, declinedAtMs = null,
} = {}) {
  if (!domain || !kind) return null;
  return {
    v: RECORD_VERSION,
    domain,
    kind,
    direction: Math.sign(num(direction) ?? 0),
    magnitude: num(magnitude),
    target,
    signature,
    declinedAt: num(declinedAtMs),
  };
}

/** Every decline the user has actually made, most recent first. */
export function declinesFromHistory(historyDesc = []) {
  const out = [];
  for (const week of Array.isArray(historyDesc) ? historyDesc : []) {
    const declined = week?.declinedAdjustments;
    if (!declined || typeof declined !== 'object') continue;
    for (const entry of Object.values(declined)) {
      const rec = entry?.decline;
      if (!rec || rec.v !== RECORD_VERSION || !rec.domain) continue;
      out.push({ ...rec, weekStart: num(week.weekStart), declinedAt: rec.declinedAt ?? num(entry.declinedAt) });
    }
  }
  return out.sort((a, b) => (b.declinedAt ?? 0) - (a.declinedAt ?? 0));
}

/**
 * Has anything MATERIAL changed since they said no?
 *
 * The founder's list of what counts: the weight trajectory deteriorating,
 * more valid exposures accumulating, recovery worsening, a safety signal, a
 * changed circumstance, or an explicit release. Anything else - a slightly
 * different rate, a slightly different week - is the same situation, and
 * re-proposing into it is nagging.
 *
 * @returns {{ changed:boolean, because:string|null }}
 */
export function materialEvidenceChange(previous, current) {
  if (!previous || !current) return { changed: true, because: 'no_comparable_signature' };

  // A different goal is a different conversation.
  if (previous.goalPhase !== current.goalPhase) return { changed: true, because: 'goal_changed' };

  // Evidence that was unreadable and is now readable, or the reverse, is a
  // genuinely different situation to be advising in.
  for (const key of ['weight', 'intake', 'coverage', 'training', 'recovery']) {
    const was = previous[key];
    const now = current[key];
    if (was === now) continue;
    // GOOD -> POOR is deterioration and is always material.
    if (now === SIGNAL.POOR && was !== SIGNAL.POOR) return { changed: true, because: `${key}_worsened` };
    // UNKNOWN -> anything is new information.
    if (was === SIGNAL.UNKNOWN) return { changed: true, because: `${key}_now_known` };
  }

  // The trajectory itself moving materially further from where it should be.
  const wasRate = num(previous.ratePct);
  const nowRate = num(current.ratePct);
  if (wasRate != null && nowRate != null && Math.abs(nowRate - wasRate) >= MATERIAL_RATE_SHIFT_PCT) {
    return { changed: true, because: 'rate_moved_materially' };
  }

  return { changed: false, because: null };
}

/**
 * Should this proposal be withheld because the user already said no to it on
 * materially the same evidence?
 *
 * @param {object} p
 * @param {Array}  p.declines
 * @param {string} p.domain
 * @param {string} p.kind
 * @param {number} p.direction
 * @param {object} p.signature  the CURRENT evidence signature
 * @returns {null | { decline, because }}
 */
export function suppressedByDecline({ declines = [], domain, kind, direction, signature } = {}) {
  const dir = Math.sign(Number(direction) || 0);
  for (const d of Array.isArray(declines) ? declines : []) {
    if (d.domain !== domain || d.kind !== kind) continue;
    // A decline of "raise my calories" says nothing about lowering them.
    if (d.direction !== dir) continue;
    const moved = materialEvidenceChange(d.signature, signature);
    if (moved.changed) return null;
    return { decline: d, because: 'same_recommendation_same_evidence' };
  }
  return null;
}

/**
 * Why a declined recommendation has COME BACK.
 *
 * The founder's own shape: acknowledge the choice, then name the evidence
 * that changed. Built from the coded reason, never from stored prose.
 */
export function returningCopy(decline, because) {
  if (!decline) return null;
  const reasons = {
    goal_changed: 'your goal has changed since then',
    weight_worsened: 'your weight has moved further from where we want it',
    intake_worsened: 'your logged intake has moved away from your target',
    coverage_worsened: 'there is less to go on than there was',
    training_worsened: 'your training has dropped off since then',
    recovery_worsened: 'your recovery has got harder since then',
    weight_now_known: 'we can read your weight trend now',
    intake_now_known: 'we can read your intake now',
    coverage_now_known: 'you have logged enough for us to read it now',
    training_now_known: 'we can see your training now',
    recovery_now_known: 'we can see your recovery now',
    rate_moved_materially: 'your weight has moved on since then',
  };
  const why = reasons[because];
  if (!why) return null;
  return `You chose to keep this as it was last time. Since then ${why}, so we are suggesting it again.`;
}

/** What the user reads when a declined recommendation is deliberately NOT repeated. */
export function heldByDeclineCopy(decline) {
  if (!decline) return null;
  const what = decline.domain === 'nutrition'
    ? 'your calorie target'
    : 'your training';
  return `You chose to keep ${what} as it was. Nothing important has changed since, so we are leaving it with you.`;
}
