/**
 * unseenCoachChange.test — Item 6 (D141).
 *
 * What this suite pins and why:
 *  1. No time expiry: an output far older than 7 days is still "unseen"
 *     when it is newer than the viewed marker (the whole point of the fix
 *     -- the old mirror expired this on a clock).
 *  2. Viewing clears it: once the marker's weekStart matches (or exceeds)
 *     the latest output's weekStart, the badge is gone.
 *  3. A held/incomplete decision never lights the badge, matching the
 *     existing coach-banner rule.
 *  4. The loading guard: while the marker hasn't loaded, this resolver
 *     answers false so a caller that forgets to special-case "loading"
 *     fails safe to "no badge" rather than a flash of "unread".
 */
import { resolveHasUnseenCoachChange, COACH_OUTPUT_VIEWED_KEY_FOR } from '../unseenCoachChange';

const WEEK_1 = 1_800_000_000_000; // an arbitrary Monday-anchored weekStart
const WEEK_2 = WEEK_1 + 7 * 86400000;

describe('COACH_OUTPUT_VIEWED_KEY_FOR', () => {
  test('namespaces by user id', () => {
    expect(COACH_OUTPUT_VIEWED_KEY_FOR('user-1')).toBe('@volyume_coach_output_viewed_user-1');
    expect(COACH_OUTPUT_VIEWED_KEY_FOR('user-2')).toBe('@volyume_coach_output_viewed_user-2');
    expect(COACH_OUTPUT_VIEWED_KEY_FOR(undefined)).toBe('@volyume_coach_output_viewed_anon');
    expect(COACH_OUTPUT_VIEWED_KEY_FOR(null)).toBe('@volyume_coach_output_viewed_anon');
  });
});

describe('resolveHasUnseenCoachChange', () => {
  test('never seen: unread, no time expiry even for a very old output', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_1 },
      latestDecisionComplete: true,
      viewedWeekStart: null,
      markerLoaded: true,
    })).toBe(true);
  });

  test('viewed marker equals the latest output week: read, no badge', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_1 },
      latestDecisionComplete: true,
      viewedWeekStart: WEEK_1,
      markerLoaded: true,
    })).toBe(false);
  });

  test('viewed marker is a later week than the latest output: read, no badge', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_1 },
      latestDecisionComplete: true,
      viewedWeekStart: WEEK_2,
      markerLoaded: true,
    })).toBe(false);
  });

  test('a NEW output lands after the last viewed week: unread again', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_2 },
      latestDecisionComplete: true,
      viewedWeekStart: WEEK_1,
      markerLoaded: true,
    })).toBe(true);
  });

  test('incomplete/held decision never lights the badge, regardless of marker', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_1 },
      latestDecisionComplete: false,
      viewedWeekStart: null,
      markerLoaded: true,
    })).toBe(false);
  });

  test('no output at all: no badge', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: null,
      latestDecisionComplete: false,
      viewedWeekStart: null,
      markerLoaded: true,
    })).toBe(false);
  });

  test('marker not yet loaded: resolver answers false (caller must hold the previous value, not treat this as the real answer)', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: WEEK_1 },
      latestDecisionComplete: true,
      viewedWeekStart: null,
      markerLoaded: false,
    })).toBe(false);
  });

  test('latest output missing a usable weekStart: no badge rather than a crash', () => {
    expect(resolveHasUnseenCoachChange({
      latestOutput: { weekStart: undefined },
      latestDecisionComplete: true,
      viewedWeekStart: null,
      markerLoaded: true,
    })).toBe(false);
  });
});
