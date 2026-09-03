/**
 * lineChoices.test.js - the per-exercise Apply/Keep commit, the
 * REPRESENTABLE model (CC33 D112 R4; F6 episode-scoped allowances),
 * walked without a database through injected I/O.
 */
import { commitLineChoices, keepsClinicianLine } from '../lineChoices';

const NOW = 1_700_000_000_000;

function harness() {
  const recorded = [];
  const minted = [];
  return {
    recorded,
    minted,
    recordChoice: async (ruleId, choice) => { recorded.push([ruleId, choice]); },
    mintAllowance: async (row) => { minted.push(row); },
  };
}

describe('rule choices from line choices', () => {
  test('a self rule is applied when ANY line it drives is applied, declined only when every line is kept', () => {
    const h = harness();
    return commitLineChoices({
      ruleIds: ['r1', 'r2'],
      lines: [
        { apply: true, exerciseId: 'a', constraintIds: ['r1'] },
        { apply: false, exerciseId: 'b', constraintIds: ['r1'] },
        { apply: false, exerciseId: 'c', constraintIds: ['r2'] },
      ],
      groupOfRule: new Map([['r1', 'g'], ['r2', 'g']]),
      recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW,
    }).then(({ choiceFor }) => {
      expect(choiceFor.get('r1')).toBe('applied');
      expect(choiceFor.get('r2')).toBe('declined');
      expect(h.recorded).toEqual([['r1', 'applied'], ['r2', 'declined']]);
    });
  });
  test('a rule that drives no line is applied vacuously', async () => {
    const h = harness();
    const { choiceFor } = await commitLineChoices({ ruleIds: ['r9'], lines: [], recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW });
    expect(choiceFor.get('r9')).toBe('applied');
  });
  test('a clinician rule is all-or-nothing: one kept line declines the whole rule', async () => {
    const h = harness();
    const { choiceFor } = await commitLineChoices({
      ruleIds: ['c1'],
      lines: [{ apply: true, exerciseId: 'a', constraintIds: ['c1'] }, { apply: false, exerciseId: 'b', constraintIds: ['c1'] }],
      clinicianRuleIds: ['c1'],
      groupOfRule: new Map([['c1', 'g']]),
      recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW,
    });
    expect(choiceFor.get('c1')).toBe('declined');
    // A declined driver means serve will not swap the kept line: no allowance.
    expect(h.minted).toEqual([]);
  });
});

describe('episode-scoped allowances for kept lines (F6)', () => {
  test('a kept line under all-applied drivers mints one allow row INTO each driving group', async () => {
    const h = harness();
    const { allowed, allowFailed } = await commitLineChoices({
      ruleIds: ['r1', 'r2'],
      // Both drivers end 'applied' (each has an applied line), so the kept
      // line WOULD be substituted at serve without a carve.
      lines: [
        { apply: true, exerciseId: 'a', constraintIds: ['r1', 'r2'] },
        { apply: false, exerciseId: 'b', constraintIds: ['r1', 'r2'] },
      ],
      groupOfRule: new Map([['r1', 'g1'], ['r2', 'g2']]),
      recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW,
    });
    expect(allowed).toBe(2);
    expect(allowFailed).toBe(0);
    expect(h.minted).toEqual([
      { role: 'episode', episodeGroupId: 'g1', source: 'self', ruleKind: 'exercise_allow', ruleValue: 'b', startsAt: NOW },
      { role: 'episode', episodeGroupId: 'g2', source: 'self', ruleKind: 'exercise_allow', ruleValue: 'b', startsAt: NOW },
    ]);
    expect(h.minted.every((m) => m.role !== 'baseline')).toBe(true);
  });
  test('the same (group, exercise) is minted once even when two lines share it', async () => {
    const h = harness();
    const { allowed } = await commitLineChoices({
      ruleIds: ['r1'],
      lines: [
        { apply: true, exerciseId: 'a', constraintIds: ['r1'] },
        { apply: false, exerciseId: 'b', constraintIds: ['r1'] },
        { apply: false, exerciseId: 'b', constraintIds: ['r1'] },
      ],
      groupOfRule: new Map([['r1', 'g']]),
      recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW,
    });
    expect(allowed).toBe(1);
  });
  test('a failed mint is counted, never absorbed', async () => {
    const h = harness();
    const { allowed, allowFailed } = await commitLineChoices({
      ruleIds: ['r1'],
      lines: [{ apply: true, exerciseId: 'a', constraintIds: ['r1'] }, { apply: false, exerciseId: 'b', constraintIds: ['r1'] }],
      groupOfRule: new Map([['r1', 'g']]),
      recordChoice: h.recordChoice,
      mintAllowance: async () => { throw new Error('db'); },
      nowMs: NOW,
    });
    expect(allowed).toBe(0);
    expect(allowFailed).toBe(1);
  });
  test('a kept line whose driver has no group cannot be carved and is reported', async () => {
    const h = harness();
    const { allowFailed } = await commitLineChoices({
      ruleIds: ['r1'],
      lines: [{ apply: true, exerciseId: 'a', constraintIds: ['r1'] }, { apply: false, exerciseId: 'b', constraintIds: ['r1'] }],
      groupOfRule: new Map(),
      recordChoice: h.recordChoice, mintAllowance: h.mintAllowance, nowMs: NOW,
    });
    expect(allowFailed).toBe(1);
  });
});

describe('keepsClinicianLine', () => {
  test('true only when a KEPT line is driven by a clinician rule', () => {
    const lines = [{ apply: true, constraintIds: ['c1'] }, { apply: false, constraintIds: ['s1'] }];
    expect(keepsClinicianLine(lines, ['c1'])).toBe(false);
    expect(keepsClinicianLine([{ apply: false, constraintIds: ['c1'] }], ['c1'])).toBe(true);
    expect(keepsClinicianLine(lines, [])).toBe(false);
  });
});
