/**
 * campaign10c.test.js — three user-facing correctness jobs.
 *
 *   1. womens_physique competition parity
 *   2. in-app rest sounds, independent of the OS rest alert
 *   3. readiness purpose copy + distinct-day weigh-in wording
 */
import { isCompetitionGoal, shouldShowGoalLockOnboarding } from '../coachingGoals';
import { ADVANCED_PROTEIN_GOALS } from '../nutritionEngine';
import { assessDataConfidence } from '../weeklyCoach';

const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', rel), 'utf8');

// ─── 1. Women's Physique parity ──────────────────────────────────────────────

describe("women's physique gets the same competition treatment as its siblings", () => {
  const SIBLINGS = ['bikini', 'figure', 'wellness', 'womens_bodybuilding', 'mens_physique', 'classic_physique', 'bodybuilding'];

  test('it is recognised as a competition goal', () => {
    expect(isCompetitionGoal('womens_physique')).toBe(true);
  });

  test('it receives the same goal-lock onboarding prompt', () => {
    expect(shouldShowGoalLockOnboarding({ trainingGoal: 'womens_physique' })).toBe(true);
    for (const g of SIBLINGS) {
      expect(shouldShowGoalLockOnboarding({ trainingGoal: g })).toBe(true);
    }
  });

  // ONE DAILY TRUTH (Campaign 17A): this test pinned that women's physique got
  // the same day-calorie-cycling eligibility as its sibling divisions. Nobody
  // cycles calories by day type any more, so the parity claim moves to the
  // competition-goal predicate that actually still governs treatment.
  test('it is a competition goal, exactly like its siblings', () => {
    expect(isCompetitionGoal('womens_physique')).toBe(true);
    for (const g of SIBLINGS) {
      expect(isCompetitionGoal(g)).toBe(true);
    }
  });

  test('it was already treated as a competition division elsewhere - now consistent', () => {
    expect(ADVANCED_PROTEIN_GOALS).toContain('womens_physique');
    expect(isCompetitionGoal('womens_physique')).toBe(true);
  });

  test('ordinary non-competition goals are unchanged', () => {
    for (const g of ['general', 'general_hypertrophy', 'strength_size', 'weak_point_spec']) {
      expect(isCompetitionGoal(g)).toBe(false);
      expect(shouldShowGoalLockOnboarding({ trainingGoal: g })).toBe(false);
    }
    expect(isCompetitionGoal(null)).toBe(false);
    expect(isCompetitionGoal(undefined)).toBe(false);
  });

  test('the advanced-recomp goal-lock path is untouched', () => {
    expect(shouldShowGoalLockOnboarding({ trainingPhase: 'recomp', experience: 'advanced' })).toBe(true);
    expect(shouldShowGoalLockOnboarding({ trainingPhase: 'recomp', experience: 'intermediate' })).toBe(false);
  });
});

// ─── 2. Rest sounds vs the OS alert ──────────────────────────────────────────

describe('in-app rest sounds are a separate control from the OS rest alert', () => {
  const store = read('store/useAppStore.js');
  const sound = read('lib/restSound.js');
  const screen = read('screens/SettingsWorkoutScreen.js');

  test('the preference exists, defaults ON, and persists with its siblings', () => {
    expect(store).toMatch(/restSoundsEnabled: true,/);
    expect(store).toMatch(/if \(typeof parsed\.restSoundsEnabled === 'boolean'\) next\.restSoundsEnabled = parsed\.restSoundsEnabled;/);
    expect(store).toMatch(/restSoundsEnabled: get\(\)\.restSoundsEnabled,/);
  });

  test('muting sounds schedules or cancels NOTHING, so it cannot touch the OS alert', () => {
    const setter = store.slice(store.indexOf('setRestSoundsEnabled: async'), store.indexOf('setRestEndAlertEnabled: async'));
    expect(setter).toMatch(/set\(\{ restSoundsEnabled: !!value \}\)/);
    expect(setter).not.toMatch(/restEnd|cancelRestEndNotification|scheduleRestEnd|notification/i);
    expect(setter).not.toMatch(/restEndAlertEnabled/);
  });

  test('turning the OS alert off does not mute the in-app sounds', () => {
    const setter = store.slice(store.indexOf('setRestEndAlertEnabled: async'));
    const body = setter.slice(0, setter.indexOf('\n  },'));
    expect(body).not.toMatch(/restSoundsEnabled/);
  });

  test('the mute gates only sound - the timer, haptics and display are untouched', () => {
    // The gate lives inside playRestBeep, which only ever produced audio.
    expect(sound).toMatch(/if \(restSoundsMuted\(\)\) return;/);
    expect(sound).not.toMatch(/tickRestTimer|restCountdown|restDone|setShowDone/);
  });

  test('an unreadable store fails OPEN, so a fault never silently mutes', () => {
    const fn = sound.slice(sound.indexOf('function restSoundsMuted'), sound.indexOf('export function playRestBeep'));
    expect(fn).toMatch(/return false;/);
    expect(fn).toMatch(/restSoundsEnabled === false/);
  });

  test('both switches are present and separately worded', () => {
    expect(screen).toMatch(/label="Rest finished alert"/);
    expect(screen).toMatch(/label="Rest timer sounds"/);
    expect(screen).toMatch(/The timer and its vibration keep working either way\./);
  });
});

// ─── 3. Comprehension copy ───────────────────────────────────────────────────

describe('readiness copy explains the consequence and its direction', () => {
  const home = read('screens/HomeScreen.js');

  test('it says poor recovery can ease the session', () => {
    expect(home).toMatch(/poor sleep or heavy soreness can ease today's session/);
  });

  test('it states explicitly that good answers never add work', () => {
    expect(home).toMatch(/never makes it harder than planned/);
  });

  test('it stays truthful about where coaching applies, and promises nothing certain', () => {
    expect(home).toMatch(/When coaching is active/);
    expect(home).toMatch(/can ease/); // not "will ease"
  });

  test('no algorithm names, medical claims or guilt', () => {
    const line = home.slice(home.indexOf('Takes a second.'), home.indexOf('Takes a second.') + 220);
    expect(line).not.toMatch(/readinessTweak|classifier|algorithm|score|RIR|MEV|MRV/i);
    expect(line).not.toMatch(/injur|diagnos|overtrain|should have|you must/i);
  });
});

describe('the weigh-in hold says the readings must be on different days', () => {
  const holdResult = assessDataConfidence({ weigh_ins: 2, adherenceKnown: true, weeksInPhase: 4, hasUnusualEvent: false });

  test('the hold message states the distinct-day requirement', () => {
    expect(holdResult.level).toBe('data_hold');
    expect(holdResult.holdMessage).toMatch(/at least 3 different days/);
  });

  test('the reason line now matches it instead of saying just "3 weigh-ins"', () => {
    expect(holdResult.reasons[0]).toMatch(/3 different days/);
    expect(holdResult.reasons[0]).not.toMatch(/^Fewer than 3 weigh-ins/);
  });

  test('no implementation jargon leaks into user copy', () => {
    const all = `${holdResult.holdMessage} ${holdResult.reasons.join(' ')}`;
    expect(all).not.toMatch(/distinct calendar|cardinality|localDayKey|weighInDayCount/i);
  });

  test('the three-day requirement itself is unchanged', () => {
    expect(assessDataConfidence({ weigh_ins: 3, adherenceKnown: true, weeksInPhase: 4, hasUnusualEvent: false }).level)
      .not.toBe('data_hold');
    expect(assessDataConfidence({ weigh_ins: 2, adherenceKnown: true, weeksInPhase: 4, hasUnusualEvent: false }).level)
      .toBe('data_hold');
  });
});
