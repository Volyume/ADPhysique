/**
 * Integration: REAL Precision Coaching engine → great-week trigger → card params
 * → rendered pixels. NOTHING is mocked: runWeeklyCoach, isGreatWeek,
 * buildWeeklyRecapParams and drawShareCard all run for real.
 *
 * SCOPE (honest): this covers the data/render pipeline a device-walk can't cheaply
 * verify (a real "great week" takes a real week). It does NOT drive the React
 * screens or navigation — that wiring is covered by the static trace + the
 * screen-mount tests; this proves the engine's numbers reach the card unchanged
 * and the card actually renders from them.
 *
 * The assertions tie the CARD'S content to the ENGINE'S computed values, so a
 * wrong field / wrong number / dropped field fails the test (not just "a number
 * is present").
 */
import { runWeeklyCoach } from '../../weeklyCoach';
import { isGreatWeek, buildWeeklyRecapParams } from '../greatWeek';
import { drawShareCard, cardHeight } from '../drawShareCard';

const fs = require('fs');
const path = require('path');
const DAY = 86_400_000;

// 35 days of weights anchored to Date.now() so the engine's Date.now()-based
// 7-days-ago EWMA lookback lines up (same recipe as weeklyCoach.test.js).
function trendSharp(startKg, kgPerWeek, count = 35) {
  const out = [];
  const t0 = Date.now();
  const weeks = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeks;
  for (let i = 0; i < count; i++) {
    out.push({ loggedAt: t0 - (count - 1 - i) * DAY, weightKg: Math.round((startKg + (endKg - startKg) * (i / (count - 1))) * 100) / 100 });
  }
  return out;
}
function checkin(o = {}) {
  return { weekStart: Date.now() - 7 * DAY, energyScore: 4, sorenessScore: 2, stressScore: 2, sleepHours: 8, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, soreMuscles: null, notes: null, ...o };
}
function baseInputs(o = {}) {
  return { checkin: checkin(), morningWeights: [], sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 2, goalPhase: 'mild_cut', trainingGoal: 'build_muscle', weeksInPhase: 4, currentCalTarget: 2400, currentStepsTarget: 8000, bodyweightKg: 85, units: 'kg', ...o };
}

const LIFT = { exerciseName: 'Barbell Bench Press', weight: 100, reps: 5, isNewBest: true, units: 'kg' };

// Self-guarding Skia env so the render step genuinely runs where CanvasKit + fonts
// exist, and no-ops (without faking a pass) where they don't.
const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
let ckPkg = null; try { ckPkg = require.resolve('canvaskit-wasm/package.json'); } catch (_) { /* absent */ }
const CAN_RENDER = !!ckPkg && fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REG);
let env = null;
beforeAll(async () => {
  if (!CAN_RENDER) return;
  try {
    const ckDir = path.dirname(ckPkg);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
    const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
    const Skia = JsiSkApi(CK);
    const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
    env = { Skia, typefaces: { bold: tf(FONT_BOLD), regular: tf(FONT_REG) }, wordmark: null };
  } catch (_) { env = null; }
});

function renderToBytes(params) {
  const W = 540; const H = cardHeight(W, true);
  const surface = env.Skia.Surface.MakeOffscreen(W, H);
  drawShareCard(surface.getCanvas(), { Skia: env.Skia, width: W, params: { ...params, isSquare: true }, typefaces: env.typefaces, wordmark: env.wordmark });
  surface.flush();
  return surface.makeImageSnapshot().encodeToBytes();
}

describe('great-week pipeline — real engine → trigger → card → pixels', () => {
  test('an on-target cut week: trigger fires AND the card shows the ENGINE\'s exact numbers', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mild_cut', morningWeights: trendSharp(85, -0.32), prsThisWeek: 2, sessionsCompleted: 4, sessionsPlanned: 4 }));

    // The engine genuinely reads this as on-target and great.
    expect(out.trend.onTarget).toBe(true);
    expect(out.trend.delta).toBeLessThan(0);            // a real loss, computed by the engine
    expect(isGreatWeek(out).great).toBe(true);

    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT, weekLabel: out.weekLabel });

    // Card numbers must EQUAL the engine's computed values (a wrong field/number fails):
    const mag = Math.round(Math.abs(out.trend.delta) * 10) / 10;
    expect(p.hero).toEqual({ heading: 'weight lost this week', value: `${mag} kg`, context: 'right on target' });
    expect(p.coachLine).toContain(`lost ${mag} kg`);
    expect(p.stats.find((s) => s.label === 'Sessions').value).toBe(`${out.sessionsCompleted}/${out.sessionsPlanned}`);
    expect(p.stats.find((s) => s.label === 'PRs').value).toBe(String(out.prsThisWeek));

    // ...and it actually renders to a real, non-blank PNG.
    if (env) expect(renderToBytes(p).length).toBeGreaterThan(2000);
  });

  test('SAFETY: each hard flag on the real output blocks the trigger', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mild_cut', morningWeights: trendSharp(85, -0.32) }));
    expect(isGreatWeek(out).great).toBe(true);
    expect(isGreatWeek({ ...out, edPatternFired: true }).great).toBe(false);
    expect(isGreatWeek({ ...out, rapidWeightLossFlag: true }).great).toBe(false);
    expect(isGreatWeek({ ...out, ffmFloorHeld: true }).great).toBe(false);
    expect(isGreatWeek({ ...out, deloadSuggested: true }).great).toBe(false);
  });

  test('SAFETY: suppress strips every number; the rendered card still produces a valid PNG', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mild_cut', morningWeights: trendSharp(85, -0.32) }));
    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT, suppress: true });
    expect(p.hero && p.hero.heading).not.toBe('weight lost this week');
    expect(p.bestLift).toBeNull();
    expect(p.coachLine).not.toMatch(/kg|lost|gained|target/i);
    expect(p.coachLine).toMatch(/you hit/i);
    if (env) expect(renderToBytes(p).length).toBeGreaterThan(2000);
  });

  test('an off-target week does not fire (sessions still hit, so on-target is the discriminator)', () => {
    const flat = runWeeklyCoach(baseInputs({ goalPhase: 'mild_cut', morningWeights: trendSharp(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 2 }));
    expect(flat.trend.onTarget).toBe(false);
    expect(isGreatWeek(flat).great).toBe(false);
  });

  test('a non-cut (lean bulk) week leads with the LIFT exactly, never a bodyweight figure', () => {
    const out = runWeeklyCoach(baseInputs({ goalPhase: 'mild_bulk', morningWeights: trendSharp(80, 0.15), bodyweightKg: 80, prsThisWeek: 2 }));
    const p = buildWeeklyRecapParams(out, { units: 'kg', bestLift: LIFT });
    expect(p.hero).toEqual({ heading: 'Barbell Bench Press', value: '100 kg × 5', context: 'new personal best' });
    expect(p.coachLine).not.toMatch(/lost|gained/);     // no weight-change language on a bulk
    if (env) expect(renderToBytes(p).length).toBeGreaterThan(2000);
  });
});
