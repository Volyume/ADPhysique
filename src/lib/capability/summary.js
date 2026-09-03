/**
 * capability/summary.js - the one-line "How you train" status a row can
 * carry outside the feature (founder decision D134, 2026-09-03: the primary
 * entries live where plans are built and where the coach's inputs are, not
 * only in Settings).
 *
 * Pure: takes the loaded capability state and returns words. Only the
 * user's own functional words come back out (phrase.js's law): a subject
 * phrase where one exists, a count where none does, never a diagnosis and
 * never "injury" on a permanent rule (the D112 R6 vocabulary law - the
 * word attaches only to temporary framing, and this line names neither).
 */
import { CONSTRAINT_RULE_KIND, EPISODE_STATUS } from './model';
import { subjectPhrase } from './phrase';
import { shortDate } from './addFlow';

/** The invitation shown when nothing is set up: an offer, never a question
 *  that asks the person to classify themselves (banked research, DfE). */
export const HOW_YOU_TRAIN_OFFER = 'Injury, pain, a condition or a disability? Volyume builds around it.';

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
    const subject = subjectPhrase(restrictions(baseline), { nameOf });
    if (!episodes.length) {
      parts.push(subject ? `Built around ${subject}` : `Built around ${baseline.length} thing${baseline.length === 1 ? '' : 's'} you told it`);
    } else {
      parts.push(`${baseline.length} permanent`);
    }
  }
  return { sub: parts.join(' · '), attention, empty: false };
}
