import {
  detectEdPatternFlag,
  hasEdPatternCleared,
  ED_PATTERN_CONSTANTS as K,
} from '../edPatternDetector';

const lossOk = { weightTrendPctPerWeek: -0.5 };
const lossRapid = { weightTrendPctPerWeek: -2.0 };

const wkNormal = () => ({ energy: 4, adherence: 'hit', hasCheckin: true, hasFoodData: true });
const wkLowEnergy = () => ({ energy: 1, adherence: 'hit', hasCheckin: true, hasFoodData: true });
const wkUnder = () => ({ energy: 4, adherence: 'under', hasCheckin: true, hasFoodData: true });
const wkWeightOnly = () => ({ energy: 4, adherence: null, hasCheckin: true, hasFoodData: false });

describe('detectEdPatternFlag, individual signals', () => {
  test('s1 rapid loss alone does not fire', () => {
    const out = detectEdPatternFlag(lossRapid, [wkNormal(), wkNormal(), wkNormal()], false);
    expect(out.signals.s1).toBe(true);
    expect(out.signals.count).toBe(1);
    expect(out.fired).toBe(false);
  });

  test('s2 low energy alone does not fire', () => {
    const out = detectEdPatternFlag(lossOk, [wkLowEnergy(), wkLowEnergy()], false);
    expect(out.signals.s2).toBe(true);
    expect(out.signals.count).toBe(1);
    expect(out.fired).toBe(false);
  });

  test('s3 under adherence alone does not fire', () => {
    const out = detectEdPatternFlag(lossOk, [wkUnder(), wkUnder(), wkNormal()], false);
    expect(out.signals.s3).toBe(true);
    expect(out.signals.count).toBe(1);
    expect(out.fired).toBe(false);
  });

  test('s4 weight-only check-ins alone does not fire', () => {
    const out = detectEdPatternFlag(lossOk, [wkWeightOnly(), wkWeightOnly(), wkNormal()], false);
    expect(out.signals.s4).toBe(true);
    expect(out.signals.count).toBe(1);
    expect(out.fired).toBe(false);
  });
});

describe('detectEdPatternFlag, thresholds', () => {
  test('two signals fire when goal_lock_advanced = false', () => {
    const out = detectEdPatternFlag(lossRapid, [wkLowEnergy(), wkLowEnergy()], false);
    expect(out.signals.count).toBeGreaterThanOrEqual(2);
    expect(out.fired).toBe(true);
    expect(out.thresholdRequired).toBe(2);
  });

  test('two signals do NOT fire when goal_lock_advanced = true', () => {
    const out = detectEdPatternFlag(lossRapid, [wkLowEnergy(), wkLowEnergy()], true);
    expect(out.signals.count).toBe(2);
    expect(out.fired).toBe(false);
    expect(out.thresholdRequired).toBe(3);
  });

  test('three signals fire when goal_lock_advanced = true', () => {
    const out = detectEdPatternFlag(
      lossRapid,
      [{ ...wkLowEnergy(), adherence: 'under' }, { ...wkLowEnergy(), adherence: 'under' }, wkNormal()],
      true,
    );
    expect(out.signals.count).toBeGreaterThanOrEqual(3);
    expect(out.fired).toBe(true);
  });

  test('reason string names every firing signal', () => {
    const out = detectEdPatternFlag(lossRapid, [wkLowEnergy(), wkLowEnergy()], false);
    expect(out.reason).toContain('rapid weight loss');
    expect(out.reason).toContain('sustained low energy');
  });
});

describe('detectEdPatternFlag, missing data edge cases', () => {
  test('null weight trend never counts as s1', () => {
    const out = detectEdPatternFlag({ weightTrendPctPerWeek: null }, [wkLowEnergy(), wkLowEnergy()], false);
    expect(out.signals.s1).toBe(false);
  });

  test('empty history fires nothing', () => {
    const out = detectEdPatternFlag(lossOk, [], false);
    expect(out.signals.count).toBe(0);
    expect(out.fired).toBe(false);
  });

  test('one-week history cannot satisfy a "2 of 3" signal', () => {
    const out = detectEdPatternFlag(lossOk, [wkUnder()], false);
    expect(out.signals.s3).toBe(false);
  });

  test('weeks without a check-in do not count toward s4', () => {
    const out = detectEdPatternFlag(lossOk, [
      { energy: null, adherence: null, hasCheckin: false, hasFoodData: false },
      { energy: null, adherence: null, hasCheckin: false, hasFoodData: false },
    ], false);
    expect(out.signals.s4).toBe(false);
  });

  test('rapid loss threshold is inclusive', () => {
    const out = detectEdPatternFlag(
      { weightTrendPctPerWeek: K.RAPID_LOSS_PCT_PER_WEEK },
      [wkNormal()], false,
    );
    expect(out.signals.s1).toBe(true);
  });
});

describe('hasEdPatternCleared', () => {
  test('clears when last two weeks are normal and trend ok', () => {
    expect(hasEdPatternCleared(lossOk, [wkNormal(), wkNormal()])).toBe(true);
  });

  test('does not clear when trend still rapid', () => {
    expect(hasEdPatternCleared(lossRapid, [wkNormal(), wkNormal()])).toBe(false);
  });

  test('does not clear when one of last two weeks still under-adherent', () => {
    expect(hasEdPatternCleared(lossOk, [wkUnder(), wkNormal()])).toBe(false);
  });

  test('does not clear when one of last two weeks still has low energy', () => {
    expect(hasEdPatternCleared(lossOk, [wkLowEnergy(), wkNormal()])).toBe(false);
  });

  test('does not clear when food data still missing', () => {
    expect(hasEdPatternCleared(lossOk, [wkWeightOnly(), wkNormal()])).toBe(false);
  });

  test('does not clear when fewer than two weeks of history', () => {
    expect(hasEdPatternCleared(lossOk, [wkNormal()])).toBe(false);
  });
});

describe('detectEdPatternFlag, property checks (locked acceptance)', () => {
  // From MOVE_2_ED_PATTERN_DETECTION.md tests-required block.
  test('1 signal alone never fires regardless of goal lock', () => {
    for (const goalLock of [false, true]) {
      expect(detectEdPatternFlag(lossRapid, [wkNormal(), wkNormal()], goalLock).fired).toBe(false);
      expect(detectEdPatternFlag(lossOk, [wkLowEnergy(), wkLowEnergy()], goalLock).fired).toBe(false);
    }
  });

  test('2 signals fire when goal_lock_advanced = false', () => {
    expect(detectEdPatternFlag(lossRapid, [wkLowEnergy(), wkLowEnergy()], false).fired).toBe(true);
  });

  test('3 signals fire when goal_lock_advanced = true', () => {
    const hist = [
      { ...wkLowEnergy(), adherence: 'under' },
      { ...wkLowEnergy(), adherence: 'under' },
      wkNormal(),
    ];
    expect(detectEdPatternFlag(lossRapid, hist, true).fired).toBe(true);
  });

  test('2 signals do not fire when goal_lock_advanced = true', () => {
    expect(detectEdPatternFlag(lossRapid, [wkLowEnergy(), wkLowEnergy()], true).fired).toBe(false);
  });
});
