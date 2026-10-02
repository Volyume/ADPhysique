/**
 * BodyMetricsScreen.weightTrendParity.guard.test.js
 *
 * WAVE-D-FINDINGS.md item 1 (LOGIC_DEFECT, ED-safety-adjacent) -- lead
 * ruling (D33, the D98-2/recoveryWordingSource precedent): Body metrics and
 * the Progress root read ONE shared derivation (deriveWeightTrend,
 * src/lib/weightTrend.js), never a parallel one.
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; spec docs/audit/
 * progress-recovery-consistency-audit-2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md
 * section 4 and section 6 table: `BodyMetricsScreen.*` guards (weightTrendParity
 * "re-anchored to the policy module")). THE GATING HALF CHANGED, DELIBERATELY:
 *   - it used to pin that the rate line and the maintenance card gated on
 *     `weightTrendVm.edFlagOpen` ONLY, and FORBID a calm gate ("must not
 *     invent an additional calm-mode gate": a scope ruling for that fix, not
 *     a verdict that calm mode must show the rate). Calm mode after "Continue"
 *     printed the rate, the maintenance figure and the intake line while the
 *     Progress root withheld everything (BM-20), and the screen rendered
 *     before either safety read had returned (BM-21, the fail-open window).
 *   - every withhold is now `policy.show.<section>`, the one pure rule in
 *     src/lib/bodyMetricsPolicy.js (ED-A, ED-B, ED-C, ED-E: a withhold only
 *     strengthened, the Q2 precedent). The screen never writes a gate of its
 *     own: no `{edFlagOpen &&`, no `calm ||`, no `if (calm)`. The calm
 *     interstitial ("A gentle pause") is the existing mechanism and keeps its
 *     own `policy.calm && !sessionConfirmed` check; the policy applies after it.
 * THE SHARED-DERIVATION HALF IS KEPT: the screen still calls the SAME
 * deriveWeightTrend over the hook's own windowing (the trend weight is the
 * Progress root's reading), and the behavioural contract below, against the
 * real function, is unchanged.
 */
import fs from 'fs';
import path from 'path';
import { deriveWeightTrend } from '../../lib/weightTrend';
import { bodyMetricsPolicy, BODY_METRICS_SECTIONS } from '../../lib/bodyMetricsPolicy';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');
const HOOK = fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', 'useWeightTrend.js'), 'utf8');
const MERGE = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'bodyMetricsHistoryMerge.js'), 'utf8');

describe('BodyMetricsScreen weight trend: one shared derivation (WAVE-D item 1, kept)', () => {
  test('imports and calls the shared derivation, not a parallel one', () => {
    expect(SOURCE).toMatch(/deriveWeightTrend[\s\S]{0,160}from '\.\.\/lib\/weightTrend';/);
    expect(SOURCE).toMatch(/deriveWeightTrend\(\{[\s\S]*?edFlagOpen: policy\.edFlagOpen,[\s\S]*?\}\)/);
    // it passes the same inputs the hook does: the windowed series, its rate,
    // the resolver's reading, the coach's verdict and the newest weigh-in of any age
    expect(SOURCE).toMatch(/ewmaData: trendRead\.ewmaData,/);
    expect(SOURCE).toMatch(/weeklyChange: trendRead\.weeklyChange,/);
    expect(SOURCE).toMatch(/coachVerdict,/);
    expect(SOURCE).toMatch(/lastWeighInMs: trendRead\.lastWeighInMs,/);
  });

  test('the trend weight is the hook\'s reading: its two windowing lines, the same smoother', () => {
    // character for character, as the hook has them (campaign6.longTerm pins them on the hook)
    for (const line of [
      'const windowStart = Date.now() - 90 * 86400000;',
      'if (!(newestMs >= Date.now() - 14 * 86400000)) windowed = [];',
    ]) {
      expect(HOOK).toContain(line);
      expect(MERGE).toContain(line);
    }
    expect(SOURCE).toMatch(/const weights90 = morningRows\.slice\(-90\);/);
    expect(SOURCE).toMatch(/const windowed = trendWindowRows\(weights90\);/);
    expect(SOURCE).toMatch(/const ewmaData = computeEWMA\(windowed\);/);
    expect(SOURCE).toMatch(/const weeklyChange = computeWeeklyWeightChange\(ewmaData\);/);
  });

  test('the weights are read and shown through the shared unit helpers, never hard-coded kg', () => {
    expect(SOURCE).toMatch(/formatBodyWeight\(weightTrendVm\.ewmaNow, bwu\)/);
    expect(SOURCE).not.toMatch(/ewma\?\.toFixed\(1\)\} kg/);
    expect(SOURCE).not.toMatch(/\.toFixed\(1\)\} kg/);
    expect(SOURCE).not.toMatch(/formatBodyWeightRate\(/);
  });
});

describe('BodyMetricsScreen withholds: every one is the policy module\'s (D214 addendum 4)', () => {
  test('nothing below the header renders until the policy is ready (ED-C)', () => {
    expect(SOURCE).toMatch(/const policy = useMemo\(\(\) => bodyMetricsPolicy\(\{ edFlag, wellbeingMode \}\), \[edFlag, wellbeingMode\]\);/);
    expect(SOURCE).toMatch(/const \[edFlag, setEdFlag\] = useState\(undefined\);/);
    expect(SOURCE).toMatch(/const \[wellbeingMode, setWellbeingMode\] = useState\(undefined\);/);
    expect(SOURCE).toMatch(/if \(!policy\.ready\) \{\s*return \(\s*<SafeAreaView[\s\S]*?<BackHeader title="Body metrics" \/>\s*<\/SafeAreaView>\s*\);\s*\}/);
  });

  test('every section of the policy is read by the screen, and the verdict slot carries the policy line', () => {
    for (const section of BODY_METRICS_SECTIONS) {
      expect(SOURCE).toContain(`policy.show.${section}`);
    }
    expect(SOURCE).toMatch(/if \(policy\.line\) verdict = policy\.line;/);
  });

  test('the screen never writes a withhold of its own', () => {
    expect(SOURCE).not.toMatch(/\{edFlagOpen &&/);
    expect(SOURCE).not.toMatch(/\{!edFlagOpen &&/);
    expect(SOURCE).not.toMatch(/\bcalm \|\|/);
    expect(SOURCE).not.toMatch(/\|\| calm\b/);
    expect(SOURCE).not.toMatch(/!calm &&/);
    expect(SOURCE).not.toMatch(/if \((edFlagOpen|calm)\)/);
    expect(SOURCE).not.toMatch(/weightTrendVm\.edFlagOpen/);
    // the one place the screen reads the policy's calm flag: the existing interstitial
    const uses = SOURCE.match(/policy\.calm/g) || [];
    expect(uses).toHaveLength(1);
    expect(SOURCE).toMatch(/if \(policy\.calm && !sessionConfirmed\) \{/);
    // the recomposition withhold is the policy's, handed to the derivation
    expect(SOURCE).toMatch(/suppressed: !policy\.show\.recomposition/);
  });

  test('no chip, no arrow and no delta badge: direction lives in the verdict line (BM-9, BM-22)', () => {
    expect(SOURCE).not.toMatch(/DeltaBadge|trending-up|trending-down|phaseChip|detectPhase/);
    expect(SOURCE).not.toMatch(/Weekly change:/);
  });

  test('the policy behaves as the screen assumes (not ready shows nothing; a withhold keeps the own data)', () => {
    const waiting = bodyMetricsPolicy({ edFlag: undefined, wellbeingMode: 'normal' });
    expect(waiting.ready).toBe(false);
    expect(Object.values(waiting.show).every((v) => v === false)).toBe(true);
    const open = bodyMetricsPolicy({ edFlag: { id: 1 }, wellbeingMode: 'normal' });
    expect(open.show.trendWeight).toBe(true);
    expect(open.show.history).toBe(true);
    expect(open.show.verdict).toBe(false);
    expect(open.show.maintenance).toBe(false);
    expect(open.line).toBe('Your weigh-ins are kept here.');
  });
});

describe('deriveWeightTrend contract this screen depends on (behavioural, real function, kept)', () => {
  const ewmaData = Array.from({ length: 10 }, (_, i) => ({
    ewma: 80 - i * 0.1,
    weightKg: 80 - i * 0.1,
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  }));
  const adaptiveBurn = {
    adjustedTDEE: 2400,
    confidence: 'high',
    weeks: 4,
    source: 'validated',
  };

  test('open ED flag: no rate, no maintenance, direction-only -- same shape the Progress root already gets', () => {
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: true });
    expect(vm.edFlagOpen).toBe(true);
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
    // The EWMA value itself is NOT stripped (state stays visible; only rate
    // + maintenance withhold), matching the lead ruling's "value alone
    // stays" shape.
    expect(vm.ewmaNow).not.toBeNull();
  });

  test('no ED flag, enough data: rate shows and maintenance carries the kcal figure', () => {
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: false });
    expect(vm.edFlagOpen).toBe(false);
    expect(vm.maintenance).not.toBeNull();
    expect(vm.maintenance.building).not.toBe(true);
  });

  test('a fail-closed ED-flag read (the sentinel truthy value) suppresses exactly like a genuine open flag', () => {
    // The screen reads the flag fail-closed (getOpenEdPatternFlag(...).catch(() => 'read_failed')),
    // and the policy counts the sentinel as an open flag.
    const policy = bodyMetricsPolicy({ edFlag: 'read_failed', wellbeingMode: 'normal' });
    expect(policy.edFlagOpen).toBe(true);
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: policy.edFlagOpen });
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
  });
});
