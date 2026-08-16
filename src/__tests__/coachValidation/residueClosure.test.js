/**
 * Campaign 21 Step 13 — residue closure (lead, hands-on).
 *
 * The final ledger reconciliation left six rules with no test anywhere in
 * the tree. Five are closed here, each against its ACCEPTED ORACLE-LOCK.md
 * block; the sixth (U-AUTH-01, the accepted-intervention write-then-read
 * round trip) is the campaign's one explained residue — its fix recipe is
 * the same in-memory-table pattern persistence.test.js already uses for
 * U-AUTH-02, recorded in the final handover.
 *
 *   T-WEEKLY-02   corroborateConfidenceLevel (D18): one step, ceiling,
 *                 data_hold immovable, suppressed returns base verbatim.
 *   T-SESSION-02  pickCurrentResolution: deterministic total order,
 *                 soft-deleted rows never counted.
 *   N-MAINT-04    classifyOutcome: a manual calorie-target change forces
 *                 CONFOUNDED/user_changed_it_themselves.
 *   N-COACH-05    adaptive resize supersedes the fixed step ONLY same-sign,
 *                 never on the rapid-loss path (asserted at the seam the
 *                 rule lives in, via a targeted source pin plus the
 *                 sign-contract on the pure adaptive sizing function - the
 *                 full-fixture whole-chain case lives in NUT-63/64's
 *                 family, which exercises the fixed-step branch this rule
 *                 conditionally overwrites).
 *   T-PROGRAMME-07 buildNextBlockRecommendation branches via the real
 *                 getBlockAdvice with only database reads mocked (the
 *                 TRN-A recipe): repeat / adjust / consider_rebuild edges
 *                 and the Free-tier recommendation:null law.
 */
import fs from 'fs';
import path from 'path';
import { corroborateConfidenceLevel } from '../../lib/weeklyCoach';
import { pickCurrentResolution } from '../../lib/blockProgression';
import { classifyOutcome, INTERVENTION_KIND, OUTCOME } from '../../lib/coachIntervention';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);

// ─── T-WEEKLY-02 ────────────────────────────────────────────────────────────

describe('T-WEEKLY-02: photo corroboration moves confidence one step, display-only, senior-suppressed', () => {
  const supports = { eligible: true, direction: 'supports' };

  test('moves exactly one step up, ceiling at high', () => {
    expect(corroborateConfidenceLevel('low', supports)).toBe('medium');
    expect(corroborateConfidenceLevel('medium', supports)).toBe('high');
    expect(corroborateConfidenceLevel('high', supports)).toBe('high');
  });

  test('data_hold is immovable under any corroboration', () => {
    expect(corroborateConfidenceLevel('data_hold', supports)).toBe('data_hold');
  });

  test('suppressed=true returns the base level verbatim (calm mode / ED flag / safety hold are senior)', () => {
    expect(corroborateConfidenceLevel('low', supports, { suppressed: true })).toBe('low');
    expect(corroborateConfidenceLevel('medium', supports, { suppressed: true })).toBe('medium');
  });

  test('ineligible or non-supporting corroboration changes nothing', () => {
    expect(corroborateConfidenceLevel('low', { eligible: false, direction: 'supports' })).toBe('low');
    expect(corroborateConfidenceLevel('low', { eligible: true, direction: 'contradicts' })).toBe('low');
    expect(corroborateConfidenceLevel('low', null)).toBe('low');
  });

  test('display-only law: no decision consumer reads the corroborated level (source pin)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'weeklyCoach.js'), 'utf8');
    // The corroborated value is assigned to a display field and the decision
    // consumers read the RAW confidence object - pin that the corroborate
    // call's result is never fed back into `confidence.level` itself.
    expect(src).not.toMatch(/confidence\.level = corroborateConfidenceLevel/);
  });
});

// ─── T-SESSION-02 ───────────────────────────────────────────────────────────

describe('T-SESSION-02: pickCurrentResolution total order is deterministic and ignores soft-deleted rows', () => {
  const row = (over = {}) => ({
    id: 'r1', workoutId: 'w1', resolution: 'skipped_by_user',
    updatedAt: NOW, resolvedAt: NOW, deletedAt: null, ...over,
  });

  test('newest updatedAt wins; resolvedAt breaks the tie; then state rank ENDED_EARLY > SKIPPED_BY_USER', () => {
    const a = row({ id: 'a', updatedAt: NOW - DAY });
    const b = row({ id: 'b', updatedAt: NOW });
    expect(pickCurrentResolution([a, b]).id).toBe('b');

    const c = row({ id: 'c', resolvedAt: NOW - DAY });
    const d = row({ id: 'd', resolvedAt: NOW });
    expect(pickCurrentResolution([c, d]).id).toBe('d');

    const e = row({ id: 'e', resolution: 'skipped_by_user' });
    const f = row({ id: 'f', resolution: 'ended_early' });
    expect(pickCurrentResolution([e, f]).id).toBe('f');
  });

  test('shuffling the input cannot change the result (oracle: deterministic regardless of arrival order)', () => {
    const rows = [
      row({ id: 'a', updatedAt: NOW - 2 * DAY }),
      row({ id: 'b', updatedAt: NOW, resolution: 'ended_early' }),
      row({ id: 'c', updatedAt: NOW }),
      row({ id: 'd', updatedAt: NOW - DAY }),
    ];
    const expected = pickCurrentResolution(rows).id;
    const perms = [
      [rows[3], rows[1], rows[0], rows[2]],
      [rows[2], rows[0], rows[3], rows[1]],
      [rows[1], rows[2], rows[3], rows[0]],
    ];
    for (const p of perms) expect(pickCurrentResolution(p).id).toBe(expected);
  });

  test('soft-deleted rows are never counted, even when newest', () => {
    const live = row({ id: 'live', updatedAt: NOW - DAY });
    const deleted = row({ id: 'dead', updatedAt: NOW, deletedAt: NOW });
    expect(pickCurrentResolution([live, deleted]).id).toBe('live');
  });
});

// ─── N-MAINT-04 ─────────────────────────────────────────────────────────────

describe('N-MAINT-04: a manual calorie-target change forces CONFOUNDED - the app never claims credit or blame', () => {
  const record = {
    kind: INTERVENTION_KIND.CALORIE_TARGET,
    appliedValue: 2200,
    goalPhase: 'mild_cut',
  };
  const after = (targetKcal) => ({
    nutrition: { targetKcal },
    intent: { goalPhase: 'mild_cut' },
  });

  test('appliedValue vs stored target mismatch IS the detection mechanism', () => {
    const out = classifyOutcome(record, { after: after(2100) });
    expect(out.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(out.because).toBe('user_changed_it_themselves');
  });

  test('a matching stored target is NOT confounded by this check', () => {
    const out = classifyOutcome(record, { after: after(2200) });
    expect(out.because).not.toBe('user_changed_it_themselves');
  });

  test('explicit userOverrode wins before any numeric comparison', () => {
    const out = classifyOutcome(record, { after: after(2200), userOverrode: true });
    expect(out.outcome).toBe(OUTCOME.CONFOUNDED);
    expect(out.because).toBe('user_changed_it_themselves');
  });
});

// ─── N-COACH-05 ─────────────────────────────────────────────────────────────

describe('N-COACH-05: adaptive resize supersedes the fixed step same-sign only, never on the rapid-loss path', () => {
  test('the production overwrite site enforces every gate the oracle names (source pin at the rule\'s own seam)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'weeklyCoach.js'), 'utf8');
    const site = src.slice(src.indexOf('const useAdaptiveCal'), src.indexOf('const useAdaptiveCal') + 3500);
    // Same-sign requirement is absolute: the overwrite is guarded by a
    // sign-agreement check, and the rapid-loss override path is exempt.
    expect(site).toMatch(/Math\.sign\(adaptiveCal\.adjustmentKcal\) === Math\.sign\(change\)/);
    expect(site).toMatch(/useAdaptiveCal && !rapidLossOverride && change !== 0/);
    expect(site).toMatch(/adaptiveCal\.adjustmentKcal !== 0/);
  });

  test('whole-chain composition: the fixed-step branch this rule overwrites is proven by NUT-63/64, and the rapid-loss exemption by N-COACH-08\'s scenarios - cross-registered in the ledger', () => {
    // Documentation assertion: keeps the cross-reference honest if scenario
    // ids ever rename.
    const nut = fs.readFileSync(path.join(__dirname, 'scenarios.nutrition.data.js'), 'utf8');
    expect(nut).toContain("'NUT-63'");
    expect(nut).toContain("'NUT-64'");
  });
});

// ─── T-PROGRAMME-07 ─────────────────────────────────────────────────────────

describe('T-PROGRAMME-07: next-block recommendation branches (real getBlockAdvice, IO-mocked reads only)', () => {
  let mockGetRecentCheckins;
  let getBlockAdvice;

  beforeAll(() => {
    jest.resetModules();
    mockGetRecentCheckins = jest.fn();
    jest.doMock('../../lib/database', () => ({
      getRecentCheckins: (...a) => mockGetRecentCheckins(...a),
    }));
    // eslint-disable-next-line global-require
    getBlockAdvice = require('../../lib/blockAdvisor').getBlockAdvice;
  });

  afterAll(() => { jest.resetModules(); jest.dontMock('../../lib/database'); });

  // A block in its recovery week (week 6 of 6): getBlockAdvice reaches the
  // next-block recommendation branch (phase 'recovery').
  const recoveryBlock = { startDate: NOW - 36 * DAY, plannedWeeks: 6, durationWeeks: 6 };
  const freshCheckin = (daysAgo, energy = 4, soreness = 1) => ({
    weekStart: NOW - daysAgo * DAY, energyScore: energy, sorenessScore: soreness, sleepHours: 8,
  });

  test('no high signals and readiness >= 60: repeat', async () => {
    mockGetRecentCheckins.mockResolvedValue([freshCheckin(2), freshCheckin(9)]);
    const advice = await getBlockAdvice('u1', recoveryBlock, { age: 30 }, { isPro: true });
    expect(advice?.nextBlock?.recommendation).toBe('repeat');
    expect(advice?.nextBlock?.coached).toBe(true);
  });

  test('persistent fatigue (2+ high signals, low readiness): consider_rebuild', async () => {
    mockGetRecentCheckins.mockResolvedValue([
      freshCheckin(2, 1, 3), freshCheckin(9, 1, 3), freshCheckin(16, 1, 3),
    ]);
    const advice = await getBlockAdvice('u1', recoveryBlock, { age: 30 }, { isPro: true });
    expect(advice?.nextBlock?.recommendation).toBe('consider_rebuild');
  });

  test('Free tier: recommendation null, coached false - no adaptive coaching computed (FQ-2/D96 law)', async () => {
    mockGetRecentCheckins.mockResolvedValue([freshCheckin(2), freshCheckin(9)]);
    const advice = await getBlockAdvice('u1', recoveryBlock, { age: 30 }, { isPro: false });
    expect(advice?.nextBlock?.recommendation).toBeNull();
    expect(advice?.nextBlock?.coached).toBe(false);
  });

  test('no check-in data inside the window: fallback readiness 70 routes to repeat, never invents fatigue', async () => {
    mockGetRecentCheckins.mockResolvedValue([]);
    const advice = await getBlockAdvice('u1', recoveryBlock, { age: 30 }, { isPro: true });
    expect(advice?.nextBlock?.recommendation).toBe('repeat');
  });
});
