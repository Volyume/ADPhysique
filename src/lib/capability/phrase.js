/**
 * capability/phrase.js - naming the thing the user told us about
 * (natural coach-language order, 2026-08-21).
 *
 * Alerts, toasts, the weekly check-in and the coach used to say "it",
 * "this" or "your temporary change" about rules whose content the app
 * knows exactly. A coach who remembers what you told them names it:
 * "Back to overhead pressing?", never "Has it ended?". This module turns
 * the user's own functional rules into short sentence fragments that
 * read naturally after "without", "around" and "back to".
 *
 * Laws it keeps: pure and deterministic (no I/O, no clock); only the
 * user's own words come back out (rule content, family labels, exercise
 * names - no diagnosis vocabulary, CAP-3); every helper returns null
 * when no short honest name exists, and every caller keeps a plain
 * generic fallback - a name is never invented.
 */
import { familyLabel } from '../exercise/movementFamily';
import { demandLabel, CONSTRAINT_RULE_KIND } from './model';

// The demand axes' sentence forms. The settings labels ("Overhead
// positions") are list headings; these are the same facts as a person
// would say them mid-sentence. Kept in step with DEMAND_AXES in model.js.
const DEMAND_PHRASES = Object.freeze({
  standing: 'standing work',
  floor_access: 'floor work',
  overhead_position: 'overhead work',
  grip_bar: 'gripping a bar',
  bilateral_upper: 'using both arms together',
  bilateral_lower: 'using both legs together',
  axial_load: 'loading your spine',
  impact: 'jumping and impact work',
  balance_high: 'unsupported balance work',
  weight_bearing_hands: 'taking weight through your hands',
});

// The body part each side-carveable axis is about, so a sided rule can
// be named the way a person would ("left hand", never "laterality:
// left"). Keys are exactly resolve.js's SIDE_CARVEABLE set: an axis
// that cannot carve by side never carries one.
const SIDE_BODY_PART = Object.freeze({
  grip_bar: 'hand',
  weight_bearing_hands: 'wrist',
  overhead_position: 'shoulder',
  bilateral_upper: 'arm',
  bilateral_lower: 'leg',
});

/** 'hand' | 'wrist' | 'shoulder' | 'arm' | 'leg', or null when the axis
 *  is not one a side applies to. */
export function sideBodyPart(axisId) {
  return SIDE_BODY_PART[axisId] ?? null;
}

// How a sided rule is SPOKEN in a sentence. Only the three axes whose
// sided form is a clean noun phrase appear here: "Back to firm gripping
// with your left hand?" reads like a person, whereas the two-limb axes
// do not survive the "keep X out of your training" frame with a side
// attached, so those keep the movement phrase in sentences and carry
// the side on the settings row instead (sidedRuleLabel below).
const SIDED_PHRASES = Object.freeze({
  grip_bar: (side) => `firm gripping with your ${side} hand`,
  weight_bearing_hands: (side) => `taking weight through your ${side} wrist`,
  overhead_position: (side) => `overhead work with your ${side} shoulder`,
});

// The settings-row form, sentence-cased, for all five sided axes.
const SIDED_ROW_LABELS = Object.freeze({
  grip_bar: (side) => `Firm gripping with your ${side} hand`,
  weight_bearing_hands: (side) => `Taking weight through your ${side} wrist`,
  overhead_position: (side) => `Overhead work with your ${side} shoulder`,
  bilateral_upper: (side) => `Using both arms together, ${side} arm`,
  bilateral_lower: (side) => `Using both legs together, ${side} leg`,
});

/**
 * The row label for a rule, naming the side in plain words. Null when
 * the rule carries no side, in which case callers use the ordinary
 * label unchanged.
 */
export function sidedRuleLabel(rule) {
  if (!rule?.laterality) return null;
  const build = SIDED_ROW_LABELS[rule.ruleValue];
  return build ? build(rule.laterality) : null;
}

/** Mid-sentence phrase for one demand axis. */
export function demandPhrase(axisId) {
  return DEMAND_PHRASES[axisId] ?? String(demandLabel(axisId)).toLowerCase();
}

/**
 * Round 16 (R16-3): the ONE union question both phrasing surfaces ask
 * about a sided demand rule. Under the R7-3 union, a sided definite
 * conflict on a one-side-loadable movement is reachable exactly when
 * its axis no longer carves - some other rule restricts the rest of the
 * axis (by ANY role, held included: facts complete the union, D120
 * ruling 2). Naming one side then states a mechanical fact the movement
 * contradicts and attributes the whole union to that side's lane - the
 * R8-4 class, closed at the picker in round 8 and found again at the
 * in-session named line in round 16, because the picker kept the scan
 * inline. Returns 'both_sides' (an opposite-side rule completes the
 * union), 'unsided_covered' (an unsided rule already covers the whole
 * axis), or null (the side genuinely stands alone).
 */
export function sidedUnionShape(rule, capabilityState) {
  if (!rule?.laterality || rule.ruleKind !== CONSTRAINT_RULE_KIND.DEMAND) return null;
  const rows = capabilityState?.restrictions ?? [];
  if (rows.some((r) => r.ruleKind === 'demand' && r.ruleValue === rule.ruleValue
    && r.laterality && r.laterality !== rule.laterality)) return 'both_sides';
  if (rows.some((r) => r.ruleKind === 'demand' && r.ruleValue === rule.ruleValue
    && !r.laterality)) return 'unsided_covered';
  return null;
}

/**
 * Mid-sentence phrase for one rule. `nameOf(exerciseId)` resolves
 * exercise names (screens pass a library lookup); without it, exercise
 * rules return null rather than a made-up name.
 */
export function rulePhrase(rule, nameOf) {
  if (!rule || !rule.ruleValue) return null;
  const kind = rule.ruleKind;
  if (kind === CONSTRAINT_RULE_KIND.DEMAND) {
    const sided = rule.laterality ? SIDED_PHRASES[rule.ruleValue] : null;
    return sided ? sided(rule.laterality) : demandPhrase(rule.ruleValue);
  }
  if (kind === CONSTRAINT_RULE_KIND.FAMILY) return familyLabel(rule.ruleValue);
  if (kind === CONSTRAINT_RULE_KIND.EXERCISE) {
    const name = typeof nameOf === 'function' ? nameOf(rule.ruleValue) : null;
    return name || null;
  }
  // Round 3 (R3-5): an ALLOWANCE has no honest place in these phrases -
  // every consumer reads after "without", "around" or "back to", so a
  // bare name here INVERTS the row's meaning ("How did you get on
  // training without Leg press?" about the exercise the user kept in).
  // The module's law "a name is never invented" extends to "a name is
  // never inverted": null, and subjectPhrase's own one-unnameable-rule
  // contract then falls the whole subject back to the generic copy.
  if (kind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW) return null;
  return null;
}

/**
 * One short phrase naming what a set of rules covers, or null when no
 * honest short name exists (an unresolvable exercise, three or more
 * distinct things, or a phrase too long to read in a toast). Callers
 * fall back to their generic wording on null - that is the contract.
 */
export function subjectPhrase(rules, { nameOf = null, maxItems = 2, maxLength = 48 } = {}) {
  const phrases = [];
  for (const rule of rules ?? []) {
    const p = rulePhrase(rule, nameOf);
    if (!p) return null; // one unnameable rule makes the whole name dishonest
    if (!phrases.includes(p)) phrases.push(p);
  }
  if (!phrases.length || phrases.length > maxItems) return null;
  const joined = phrases.join(' and ');
  return joined.length <= maxLength ? joined : null;
}

/**
 * The same phrase for the add flow's draft (pre-save), where exercises
 * already carry their names.
 */
export function draftSubjectPhrase(draft, opts = {}) {
  if (!draft) return null;
  const rules = [
    ...(draft.axes ?? []).map((a) => ({ ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: a })),
    ...(draft.families ?? []).map((f) => ({ ruleKind: CONSTRAINT_RULE_KIND.FAMILY, ruleValue: f })),
    ...(draft.exercises ?? []).map((e) => ({ ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: e.id, name: e.name })),
  ];
  const nameOf = (id) => (draft.exercises ?? []).find((e) => e.id === id)?.name ?? null;
  return subjectPhrase(rules, { nameOf, ...opts });
}
