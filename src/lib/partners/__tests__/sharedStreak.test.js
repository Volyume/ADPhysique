/**
 * NEW-002 shared-streak machine (§4.5) — the no-blame rules locked:
 * both-met increments, either-resting holds, a lapse is a held "quiet week",
 * 4 consecutive quiet weeks archive, and the run resumes after an archive.
 */
import { computeSharedStreak, jointWeekState, sharedStreakLabel } from '../sharedStreak';

const met = { aMet: true, bMet: true };
const aLapse = { aMet: false, bMet: true };   // one trained but unmet -> quiet
const bRest = { aMet: true, bResting: true }; // one resting -> resting

describe('jointWeekState', () => {
  test('both met -> met', () => expect(jointWeekState(met)).toBe('met'));
  test('either resting -> resting (even if the other lapsed)', () =>
    expect(jointWeekState({ aMet: false, bResting: true })).toBe('resting'));
  test('one trained-unmet, none resting -> quiet', () =>
    expect(jointWeekState(aLapse)).toBe('quiet'));
});

describe('computeSharedStreak', () => {
  test('counts consecutive both-met weeks', () => {
    const r = computeSharedStreak({ weeks: [met, met, met] });
    expect(r).toEqual({ run: 3, status: 'counting', longest: 3 });
  });

  test('a resting week holds the streak and never breaks it', () => {
    const r = computeSharedStreak({ weeks: [met, met, bRest] });
    expect(r.run).toBe(2);
    expect(r.status).toBe('resting');
  });

  test('a quiet week holds the streak at N', () => {
    const r = computeSharedStreak({ weeks: [met, met, aLapse] });
    expect(r.run).toBe(2);
    expect(r.status).toBe('quiet');
  });

  test('both meeting again after a quiet week resumes at N+1', () => {
    const r = computeSharedStreak({ weeks: [met, met, aLapse, met] });
    expect(r.run).toBe(3);
    expect(r.status).toBe('counting');
  });

  test('4 consecutive quiet weeks archive the run', () => {
    const r = computeSharedStreak({ weeks: [met, met, aLapse, aLapse, aLapse, aLapse] });
    expect(r.status).toBe('archived');
    expect(r.run).toBe(0);
    expect(r.longest).toBe(2);
  });

  test('both-met after an archive starts a fresh run at 1', () => {
    const r = computeSharedStreak({ weeks: [met, aLapse, aLapse, aLapse, aLapse, met] });
    expect(r.run).toBe(1);
    expect(r.status).toBe('counting');
  });

  test('a resting week between quiet weeks resets the quiet count (no archive)', () => {
    const r = computeSharedStreak({ weeks: [met, met, aLapse, aLapse, bRest, aLapse, aLapse] });
    expect(r.status).not.toBe('archived');
    expect(r.run).toBe(2);
  });

  test('disabled streak is off', () => {
    expect(computeSharedStreak({ weeks: [met, met], enabled: false }))
      .toEqual({ run: 0, status: 'off', longest: 0 });
  });

  test('empty input is safe', () => {
    expect(computeSharedStreak({ weeks: [] })).toEqual({ run: 0, status: 'counting', longest: 0 });
  });
});

describe('sharedStreakLabel — British English, never a fail word', () => {
  test('counting shows the week count', () =>
    expect(sharedStreakLabel({ run: 6, status: 'counting' })).toBe('6 weeks running'));
  test('singular week', () =>
    expect(sharedStreakLabel({ run: 1, status: 'counting' })).toBe('1 week running'));
  test('resting keeps the streak safe', () =>
    expect(sharedStreakLabel({ run: 6, status: 'resting' })).toBe('Resting. Streak safe at 6 weeks running.'));
  test('quiet keeps the streak safe', () =>
    expect(sharedStreakLabel({ run: 6, status: 'quiet' })).toBe('Quiet week. Streak safe at 6 weeks running.'));
  test('archived invites a fresh run', () =>
    expect(sharedStreakLabel({ status: 'archived' })).toBe('Start a new run together?'));
  test('off is null', () =>
    expect(sharedStreakLabel({ status: 'off' })).toBeNull());
});
