/**
 * capability/lineChoices.js - committing a per-exercise Apply/Keep review
 * (flow audit 2026-09-03; the add wizard's plan step).
 *
 * The REPRESENTABLE model, lead-ruled in CC33 D112 R4 and pinned on the
 * settings home's own saveLineReview (HowYouTrainScreen.capabilityFlows.
 * guard.test.js). effective_choice lives on the RULE row and one rule can
 * drive several lines, so a flat "applied only if every line applied"
 * would discard the person's Apply choices whenever they kept one
 * exercise. Instead:
 *
 *  - a SELF rule is 'applied' if the person applied ANY line it drives
 *    (or it drives none - vacuous), 'declined' only if they kept every
 *    line;
 *  - a CLINICIAN rule is all-or-nothing (rank 2 is never allowance-
 *    carved, CAP-7): keeping any of its lines declines the whole rule;
 *  - each KEPT line whose every driver ended 'applied' would otherwise
 *    be substituted at serve, so it mints a per-exercise ALLOWANCE -
 *    EPISODE-SCOPED (F6): an allow row into each driving episode's own
 *    group, so the keep lives exactly as long as the change it answers;
 *  - a kept line with a declined driver needs no allowance;
 *  - a failed mint is REPORTED (allowFailed), never absorbed: the caller
 *    tells the person the keep may not hold.
 *
 * I/O is injected (recordChoice, mintAllowance) so the model is a pure
 * function of its inputs and tests walk it without a database. Nothing
 * here reads the clock: nowMs is passed in.
 */
import { CONSTRAINT_RULE_KIND } from './model';

/**
 * @param {object} args
 * @param {string[]} args.ruleIds           the rules under review
 * @param {Array<{ apply: boolean, exerciseId: string|null, constraintIds: string[] }>} args.lines
 * @param {Iterable<string>} args.clinicianRuleIds
 * @param {Map<string,string>} args.groupOfRule   ruleId -> episode groupId
 * @param {(ruleId: string, choice: 'applied'|'declined') => Promise<void>} args.recordChoice
 * @param {(row: object) => Promise<void>} args.mintAllowance
 * @param {number} args.nowMs
 * @returns {Promise<{ choiceFor: Map<string,string>, allowed: number, allowFailed: number }>}
 */
export async function commitLineChoices({
  ruleIds, lines, clinicianRuleIds = [], groupOfRule = new Map(), recordChoice, mintAllowance, nowMs,
}) {
  const clinicianRules = new Set(clinicianRuleIds);
  const choiceFor = new Map();
  for (const ruleId of ruleIds) {
    const driven = lines.filter((l) => l.constraintIds.includes(ruleId));
    const applied = clinicianRules.has(ruleId)
      ? driven.every((l) => l.apply)
      : (driven.length === 0 || driven.some((l) => l.apply));
    choiceFor.set(ruleId, applied ? 'applied' : 'declined');
    // eslint-disable-next-line no-await-in-loop
    await recordChoice(ruleId, applied ? 'applied' : 'declined').catch(() => {});
  }
  let allowed = 0;
  let allowFailed = 0;
  const minted = new Set(); // dedupe (group, exercise) across lines
  for (const l of lines) {
    if (l.apply || !l.exerciseId) continue;
    const wouldSubstitute = l.constraintIds.length > 0
      && l.constraintIds.every((id) => choiceFor.get(id) === 'applied');
    if (!wouldSubstitute) continue;
    const groups = [...new Set(l.constraintIds.map((id) => groupOfRule.get(id)).filter(Boolean))];
    if (!groups.length) { allowFailed += 1; continue; }
    for (const groupId of groups) {
      const key = `${groupId}:${l.exerciseId}`;
      if (minted.has(key)) continue;
      minted.add(key);
      // eslint-disable-next-line no-await-in-loop
      await mintAllowance({
        role: 'episode', episodeGroupId: groupId, source: 'self',
        ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: l.exerciseId,
        startsAt: nowMs,
      }).then(() => { allowed += 1; }).catch(() => { allowFailed += 1; });
    }
  }
  return { choiceFor, allowed, allowFailed };
}

/** Does keeping any line decline a clinician-sourced rule? (Gates the
 *  named clinician confirm before the commit.) */
export function keepsClinicianLine(lines, clinicianRuleIds = []) {
  const clinician = new Set(clinicianRuleIds);
  return lines.some((l) => !l.apply && l.constraintIds.some((id) => clinician.has(id)));
}
