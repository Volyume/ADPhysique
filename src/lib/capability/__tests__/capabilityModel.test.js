/**
 * CC26 - the pure capability domain model. Pins the closed vocabularies,
 * the validation matrix that mirrors the SQLite/cloud CHECKs, the derived
 * episode status (including the fail-safe AWAITING_CONFIRMATION state),
 * and the interval predicate later campaigns join provenance against
 * (CAP-14). Also pins determinism: the model never reads the clock.
 */
import {
  CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_RULE_KIND, CONSTRAINT_STATE,
  ENDED_REASON, DEMAND_AXES, demandLabel, validateConstraintInput,
  constraintStatus, episodeStatus, isConstraintActiveAt, EPISODE_STATUS,
} from '../model';

const T0 = 1767000000000;
const DAY = 86400000;

const base = {
  role: CONSTRAINT_ROLE.BASELINE, source: CONSTRAINT_SOURCE.SELF,
  ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: 'overhead_position',
  startsAt: T0,
};
const episode = {
  ...base, role: CONSTRAINT_ROLE.EPISODE, episodeGroupId: 'grp1', endsAt: T0 + 14 * DAY,
};

describe('vocabularies are closed and non-clinical', () => {
  test('nine demand axes with calm labels', () => {
    expect(DEMAND_AXES).toHaveLength(9);
    for (const a of DEMAND_AXES) {
      expect(a.id).toMatch(/^[a-z_]+$/);
      expect(a.label).not.toMatch(/injur|rehab|diagnos|patient|therap/i);
    }
    expect(demandLabel('overhead_position')).toBe('Overhead positions');
  });
});

describe('validation mirrors the schema CHECKs', () => {
  test('valid baseline and episode pass', () => {
    expect(validateConstraintInput(base).ok).toBe(true);
    expect(validateConstraintInput(episode).ok).toBe(true);
  });
  test.each([
    ['role', { ...base, role: 'injured' }],
    ['source', { ...base, source: 'doctor' }],
    ['rule_kind', { ...base, ruleKind: 'diagnosis' }],
    ['rule_value', { ...base, ruleValue: '' }],
    ['demand_value', { ...base, ruleValue: 'not_an_axis' }],
    ['laterality', { ...base, laterality: 'both' }],
    ['starts_at', { ...base, startsAt: 0 }],
    ['baseline_ends_at', { ...base, endsAt: T0 + DAY }],
    ['baseline_episode_group', { ...base, episodeGroupId: 'g' }],
    ['episode_group_required', { ...episode, episodeGroupId: null }],
    ['ends_at', { ...episode, endsAt: T0 - 1 }],
  ])('rejects %s', (reason, input) => {
    const v = validateConstraintInput(input);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe(reason);
  });
  test('exercise-kind rules accept arbitrary ids; laterality accepted', () => {
    expect(validateConstraintInput({
      ...episode, ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: 'ex_123', laterality: 'left',
    }).ok).toBe(true);
  });
});

describe('derived status - fail-safe awaiting, no clock reads', () => {
  const row = (over = {}) => ({
    role: CONSTRAINT_ROLE.EPISODE, state: CONSTRAINT_STATE.ACTIVE,
    startsAt: T0, endsAt: T0 + 7 * DAY, ...over,
  });
  test('active before the planned end', () => {
    expect(constraintStatus(row(), T0 + DAY)).toBe(EPISODE_STATUS.ACTIVE);
  });
  test('AWAITING once the planned end passes - the constraint still applies', () => {
    expect(constraintStatus(row(), T0 + 8 * DAY)).toBe(EPISODE_STATUS.AWAITING_CONFIRMATION);
  });
  test('open-ended episode never awaits', () => {
    expect(constraintStatus(row({ endsAt: null }), T0 + 400 * DAY)).toBe(EPISODE_STATUS.ACTIVE);
  });
  test('baseline never awaits', () => {
    expect(constraintStatus({ ...row(), role: CONSTRAINT_ROLE.BASELINE, endsAt: null }, T0 + 400 * DAY))
      .toBe(EPISODE_STATUS.ACTIVE);
  });
  test('group awaits only when EVERY live rule is past its end', () => {
    const rows = [row(), row({ endsAt: T0 + 30 * DAY })];
    expect(episodeStatus(rows, T0 + 8 * DAY)).toBe(EPISODE_STATUS.ACTIVE);
    expect(episodeStatus(rows, T0 + 31 * DAY)).toBe(EPISODE_STATUS.AWAITING_CONFIRMATION);
    expect(episodeStatus([], T0)).toBe(EPISODE_STATUS.ENDED);
  });
});

describe('interval predicate (the provenance join, CAP-14)', () => {
  test('closes on CONFIRMED ended_at, not the planned ends_at', () => {
    const r = {
      role: CONSTRAINT_ROLE.EPISODE, state: CONSTRAINT_STATE.ENDED,
      startsAt: T0, endsAt: T0 + 7 * DAY, endedAt: T0 + 12 * DAY,
    };
    // Between planned end and confirmed end: STILL applies (fail safe).
    expect(isConstraintActiveAt(r, T0 + 9 * DAY)).toBe(true);
    expect(isConstraintActiveAt(r, T0 + 12 * DAY)).toBe(false);
    expect(isConstraintActiveAt(r, T0 - 1)).toBe(false);
  });
  test('an unconfirmed episode past its planned end still applies', () => {
    const r = { role: CONSTRAINT_ROLE.EPISODE, state: CONSTRAINT_STATE.ACTIVE, startsAt: T0, endsAt: T0 + 7 * DAY };
    expect(isConstraintActiveAt(r, T0 + 30 * DAY)).toBe(true);
  });
  test('erasure tombstones never match', () => {
    const r = { state: CONSTRAINT_STATE.ACTIVE, startsAt: T0, deletedAt: T0 + DAY };
    expect(isConstraintActiveAt(r, T0 + 2 * DAY)).toBe(false);
  });
});

test('ENDED_REASON vocabulary is exactly the four lifecycle exits', () => {
  expect(Object.values(ENDED_REASON).sort())
    .toEqual(['expired', 'promoted', 'superseded', 'user_ended']);
});
