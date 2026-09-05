/**
 * capability/summary.js - the one-line "Injuries & limitations" status a row
 * can carry outside the feature (founder decision D134, 2026-09-03: the
 * primary entries live where plans are built and where the coach's inputs
 * are, not only in Settings).
 *
 * Pure: takes the loaded capability state and returns words. Only the
 * user's own functional words come back out (phrase.js's law): a subject
 * phrase where one exists, a count where none does, and never a diagnosis.
 * Founder ruling 2026-09-05 retires the old D112 R6 restriction: "injury"
 * and "disability" may be used freely, on long-term rules included.
 *
 * D152 (lead ruling, 2026-09-05, finding F-01): the populated baseline line
 * no longer says "Built around N things you told it" - a row count dressed
 * as something the person said. It names what is left out where the words
 * exist, and otherwise counts RESTRICTION rows only (allowances are
 * inclusions and never counted) and says what the count is used for.
 */
import { CONSTRAINT_RULE_KIND, EPISODE_STATUS } from './model';
import { subjectPhrase } from './phrase';
import { shortDate } from './addFlow';

/** The invitation shown when nothing is set up: an offer, never a question
 *  that asks the person to classify themselves (banked research, DfE). */
export const HOW_YOU_TRAIN_OFFER = 'Injuries, pain, long-term conditions or disabilities that affect your training.';

/**
 * @param {{ baseline: any[], episodes: any[], history: any[], unavailable?: boolean } | null} state
 * @param {{ nameOf?: (id: string) => string|null }} opts
 * @returns {{ sub: string, attention: boolean, empty: boolean }}
 */
export function howYouTrainSummary(state, { nameOf = () => null } = {}) {
  if (!state) return { sub: 'Checking.', attention: false, empty: false };
  if (state.unavailable) return { sub: 'Could not check just now.', attention: false, empty: false };
  const baseline = state.baseline ?? [];
  const episodes = state.episodes ?? [];
  if (!baseline.length && !episodes.length) {
    return { sub: HOW_YOU_TRAIN_OFFER, attention: false, empty: true };
  }
  const parts = [];
  let attention = false;
  const restrictions = (rows) => rows.filter((r) => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW);
  if (episodes.length) {
    const ep = episodes[0];
    const live = ep.rows.filter((r) => r.state === 'active');
    const subject = subjectPhrase(restrictions(live), { nameOf });
    const ends = live.map((r) => r.endsAt).filter(Number.isFinite);
    const until = ends.length ? Math.max(...ends) : null;
    const awaiting = ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION;
    const undecided = live.some((r) => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW && r.effectiveChoice == null && r.adaptationMode !== 'hold');
    attention = awaiting || undecided;
    const head = subject ? `Working around ${subject}` : 'Working around a temporary change';
    const tail = awaiting ? 'still need it?' : (until != null ? `until about ${shortDate(until)}` : 'until you end it');
    parts.push(`${head}, ${tail}`);
    if (episodes.length > 1) parts.push(`${episodes.length - 1} more`);
  }
  if (baseline.length) {
    // D152: allowances are inclusions, so they never carry the count and
    // never make the line claim something is left out.
    const kept = restrictions(baseline);
    const subject = subjectPhrase(kept, { nameOf });
    if (!episodes.length) {
      if (!kept.length) parts.push('Set up. Nothing is left out.');
      else if (subject) parts.push(`Leaves out ${subject}`);
      else parts.push(`${kept.length} ${kept.length === 1 ? 'injury or limitation' : 'injuries or limitations'} saved. Used when Volyume picks exercises and builds your plan.`);
    } else if (kept.length) {
      parts.push(`${kept.length} long-term`);
    }
  }
  return { sub: parts.join(' · '), attention, empty: false };
}
