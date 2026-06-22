/**
 * END-TO-END integration: the REAL Precision Coaching engine → great-week trigger
 * → share-card params. Uses runWeeklyCoach output (not a hand-made fixture), so
 * this fails if weeklyCoach ever renames/drops a field isGreatWeek or
 * buildWeeklyRecapParams reads — i.e. it proves the card is wired to real data,
 * the thing a device-walk can't cheaply verify (a "great week" takes a real week).
 *
 * Mirrors the engine input helpers from weeklyCoach.test.js.
 */
import { runWeeklyCoach } from '../../weeklyCoach';
import { isGreatWeek, buildWeeklyRecapParams } from '../greatWeek';

const DAY = 86_400_000;

// Anchored to Date.now() so the engine's Date.now()-based 7-days-ago EWMA lookback
// lines up with the data (same approach as weeklyCoach.test.js trendSharp).
function trendSharp(startKg, kgPerWeek, count = 35) {
  const out = [];
  const t0 = Date.now();
  const weeks = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeks;
  for (let i = 0; i < count; i++) {
    const t = t0 - (count - 1 - i) * DAY;
    const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
    out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

function checkin(o = {}) {
  return {
    weekStart: Date.now() - 7 * DAY, energyScore: 4, sorenessScore: 2, stressScore: 2,
    sleepHours: 8, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
    jointPain: false, soreMuscles: null, notes: null, ...o,
  };
}

function baseInputs(o = {}) {
  return {
    checkin: checkin(),
    morningWeights: [],
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 2,
    goalPhase: 'mod_cut', trainingGoal: 'build_muscle', weeksInPhase: 4,
    currentCalTarget: 2400, currentStepsTarget: 8000, bodyweightKg: 85, units: 'kg',
    ...o,
  };
}

const LIFT = { exerciseName: 'Barbell Bench Press', weight: 100, reps: 5, isNewBest: true, units: 'kg' };

describe('great-week pipeline — REAL engine output → trigger → card params', () => {
  test('a genuine on-target cut week fires the trigger AND the output carries every field the trigger reads', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mod_cut', morningWeights: trendSharp(85, -0.53) }));

    // Anti-regression: the exact fields isGreatWeek + buildWeeklyRecapParams read
    // must exist on the real engine output (a rename here would silently break the
    // card with no device symptom until someone waited a week).
    expect(out).toHaveProperty('hasEnoughData');
    expect(out.trend).toHaveProperty('onTarget');
    expect(out.trend).toHaveProperty('delta');
    for (const f of ['sessionsCompleted', 'sessionsPlanned', 'prsThisWeek', 'recoveryFlag',
      'deloadSuggested', 'edPatternFired', 'ffmFloorHeld', 'rapidWeightLossFlag', 'goalPhase']) {
      expect(out).toHaveProperty(f);
    }

    // The engine genuinely reads this as on-target, so the CTA can fire.
    expect(out.trend.onTarget).toBe(true);
    expect(isGreatWeek(out).great).toBe(true);
  });

  test('the card built from that real output leads with the actual weight lost + names the numbers', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mod_cut', morningWeights: trendSharp(85, -0.53), prsThisWeek: 2 }));
    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT, weekLabel: out.weekLabel });

    expect(p.cardType).toBe('weekly');
    expect(p.hero.heading).toBe('weight lost this week');
    expect(p.hero.value).toMatch(/^\d+(\.\d+)? kg$/);     // a real magnitude, e.g. "0.5 kg"
    expect(p.hero.context).toBe('right on target');
    expect(p.coachLine).toMatch(/lost \d+(\.\d+)? kg/);   // the number is in the copy
    expect(p.stats.some((s) => s.label === 'PRs')).toBe(true);
    expect(p.bestLift).toEqual(LIFT);                     // kept as the feature block (weight is the hero)
  });

  test('SAFETY: an open ED flag on the real output blocks the trigger (safetyClear gate)', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mod_cut', morningWeights: trendSharp(85, -0.53) }));
    expect(isGreatWeek(out).great).toBe(true); // sanity: it WAS great
    expect(isGreatWeek({ ...out, edPatternFired: true }).great).toBe(false);
    expect(isGreatWeek({ ...out, rapidWeightLossFlag: true }).great).toBe(false);
    expect(isGreatWeek({ ...out, ffmFloorHeld: true }).great).toBe(false);
  });

  test('SAFETY: suppress (ED flag / calm mode at the screen) strips every number from the card', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mod_cut', morningWeights: trendSharp(85, -0.53) }));
    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT, suppress: true });
    expect(p.hero && p.hero.heading).not.toBe('weight lost this week');
    expect(p.bestLift).toBeNull();
    expect(p.coachLine).not.toMatch(/kg|lost|gained|target/i);
    expect(p.coachLine).toMatch(/you hit/i); // still celebrates the controllable wins
  });

  test('an off-target week does NOT fire the trigger', () => {
    const flat = runWeeklyCoach(baseInputs({ goalPhase: 'mod_cut', morningWeights: trendSharp(85, 0) }));
    expect(flat.trend.onTarget).toBe(false);
    expect(isGreatWeek(flat).great).toBe(false);
  });

  test('a non-cut (lean bulk) great week leads with the lift, never a scale number', () => {
    const out = runWeeklyCoach(baseInputs({
      goalPhase: 'mild_bulk', morningWeights: trendSharp(80, 0.19), bodyweightKg: 80, prsThisWeek: 2,
    }));
    // Whether or not the bulk reads exactly on-target, the card must never put a
    // scale number on a non-cut goal.
    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT });
    expect(p.hero.heading).not.toBe('weight lost this week');
    expect(JSON.stringify(p.hero)).not.toMatch(/\bkg\b.*lost|weight/i);
    expect(p.coachLine).not.toMatch(/lost|gained/);
  });
});
