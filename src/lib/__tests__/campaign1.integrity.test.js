/**
 * campaign1.integrity.test.js — Campaign 1: Product Integrity, Safety,
 * Privacy and State Correctness (founder order 2026-08-10; rulings
 * recorded as D92 in the decisions register).
 *
 * Every remediation in the campaign carries a pin here proving the
 * failure cannot recur:
 * - P0-1 planned_muscle_volume restores into the PRIMARY table with
 *   last-write-wins, provenance rides the push, legacy rows degrade
 *   honestly (source pins - the appliers are DB-bound).
 * - P0-2 the analytics opt-out never syncs (behavioural, both
 *   directions via the shared predicate) and a FAILED preference read
 *   is distinguished from a miss so telemetry fails privacy-closed.
 * - P0-3 the allergen list is a tracked per-field-merge column, and a
 *   stored plan that conflicts with CURRENT exclusions is detected by
 *   the pure conflict helper (never silent).
 * - P0-4 UNKNOWN is not NO: joint/soreness aggregates return null when
 *   unanswered, the runner passes nulls through, the check-in persists
 *   tri-state joint pain, and no-evidence can never satisfy a positive
 *   recovery requirement.
 * - P0-5 meal reminders are re-laid by restoreNotifications.
 * - P0-6 one canonical FFM-floor weight resolution feeds BOTH
 *   weekly-coach evaluations.
 */
import fs from 'fs';
import path from 'path';
import { computeMuscleRecoveryAggregates } from '../blockLedgerGather';
import { resolveFfmFloorWeightKg } from '../nutritionEngine';
import { planConflictsWithExclusions } from '../food/mealPlanService';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

// ─── P0-2: privacy opt-out contract ─────────────────────────────────────

describe('P0-2: the analytics opt-out is device-local and fails privacy-closed', () => {
  test('the exclusion pattern names the privacy prefs key (both directions share the predicate)', () => {
    const SRC = read('lib/sync.js');
    expect(SRC).toMatch(/\^@volyume_privacy_prefs\$/);
    // The pull applies the SAME filter (F1 posture), so one pattern closes
    // push AND pull; this pins that the pull-side filter still exists.
    expect(SRC).toMatch(/\.filter\(r => shouldSyncPref\(r\?\.key \?\? ''\)\)/);
  });

  test('loadPrivacyPrefs distinguishes a MISS from a FAILED read', async () => {
    jest.resetModules();
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn().mockRejectedValue(new Error('io')) },
    }));
    // eslint-disable-next-line global-require
    const { loadPrivacyPrefs } = require('../privacyPrefs');
    const failed = await loadPrivacyPrefs();
    expect(failed).toEqual({ prefs: null, readFailed: true });

    jest.resetModules();
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn().mockResolvedValue(null) },
    }));
    // eslint-disable-next-line global-require
    const { loadPrivacyPrefs: loadAgain } = require('../privacyPrefs');
    const miss = await loadAgain();
    expect(miss).toEqual({ prefs: null, readFailed: false });

    jest.resetModules();
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn().mockResolvedValue('{"analyticsOptOut":true}') },
    }));
    // eslint-disable-next-line global-require
    const { loadPrivacyPrefs: loadStored } = require('../privacyPrefs');
    const stored = await loadStored();
    expect(stored).toEqual({ prefs: { analyticsOptOut: true }, readFailed: false });
    jest.dontMock('@react-native-async-storage/async-storage');
  });

  test('the store keeps telemetry OFF for the session on a failed read', () => {
    const SRC = read('store/useAppStore.js');
    // A failed read must never re-enable telemetry for an opted-out user.
    expect(SRC).toMatch(/if \(readFailed\) \{\s*\n\s*applyTelemetryEnabled\(false\);/);
  });

  test('the cloud cleanup migration exists and is founder-gated', () => {
    const SQL = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'supabase', 'migrate_133_delete_privacy_pref_rows.sql'),
      'utf8',
    );
    expect(SQL).toMatch(/DELETE FROM public\.user_prefs/);
    expect(SQL).toMatch(/@volyume_privacy_prefs/);
    expect(SQL).toMatch(/run against production/);
  });
});

// ─── P0-3: allergen safety stamp + plan staleness ───────────────────────

describe('P0-3: allergen exclusions survive sync and stale plans are never silent', () => {
  test('mealPlanExcludeTags is a TRACKED per-field-merge column (the stamp is never dropped)', () => {
    const SRC = read('store/useAppStore.js');
    const trackedBlock = SRC.match(/const PROFILE_FIELDS_TRACKED = \[[\s\S]*?\];/)[0];
    expect(trackedBlock).toContain("'mealPlanExcludeTags'");
    // And the sync handler still maps it to the cloud column, so the stamp
    // has somewhere to go.
    expect(read('lib/sync/tables/profiles.js')).toMatch(/\['mealPlanExcludeTags', 'allergen_excludes'\]/);
  });

  const curatedItem = (key, name) => ({ foodRef: `curated:${key}`, name, quantityG: 100 });
  const planWith = (items) => ({
    kind: 'week',
    days: [{ slots: [{ slot: 'meal_1', items }] }],
  });

  test('a plan generated before an exclusion was added is detected', () => {
    // 'peanut_butter' style keys: use a real curated key with a real FSA tag
    // so the test runs against the REAL tag table, not a mock. Find one from
    // the tag map deterministically.
    // eslint-disable-next-line global-require
    const { tagsOf, _ROLE_MAP } = require('../food/foodRoles');
    const keyWithTag = Object.keys(_ROLE_MAP).find((k) => tagsOf(k).length > 0);
    expect(keyWithTag).toBeTruthy(); // the curated table must carry tag data
    const tag = tagsOf(keyWithTag)[0];
    const plan = planWith([curatedItem(keyWithTag, 'Flagged food')]);
    expect(planConflictsWithExclusions(plan, { excludeTags: [tag] })).toEqual(['Flagged food']);
    // Removing the exclusion clears the conflict.
    expect(planConflictsWithExclusions(plan, { excludeTags: [] })).toEqual([]);
  });

  test('individual dislikes (excludeFoodKeys) are detected too', () => {
    // eslint-disable-next-line global-require
    const { _ROLE_MAP } = require('../food/foodRoles');
    const anyKey = Object.keys(_ROLE_MAP)[0];
    const plan = planWith([curatedItem(anyKey, 'Disliked food')]);
    expect(planConflictsWithExclusions(plan, { excludeFoodKeys: [anyKey] }))
      .toEqual(['Disliked food']);
  });

  test('non-curated refs are never judged (no false safety claim, no false flag)', () => {
    const plan = planWith([{ foodRef: 'library:12345', name: 'Unknown food', quantityG: 100 }]);
    expect(planConflictsWithExclusions(plan, { excludeTags: ['peanuts'] })).toEqual([]);
  });

  test('null/legacy shapes degrade to no-conflict, never a crash', () => {
    expect(planConflictsWithExclusions(null, { excludeTags: ['peanuts'] })).toEqual([]);
    expect(planConflictsWithExclusions({}, { excludeTags: ['peanuts'] })).toEqual([]);
    expect(planConflictsWithExclusions({ days: [{}] }, { excludeTags: ['peanuts'] })).toEqual([]);
    expect(planConflictsWithExclusions(planWith([]), null)).toEqual([]);
    expect(planConflictsWithExclusions(planWith([{ foodRef: null }]), { excludeTags: ['x'] })).toEqual([]);
  });

  test('the MealPlanScreen surfaces the conflict with the rebuild action (never silent)', () => {
    const SRC = read('screens/MealPlanScreen.js');
    expect(SRC).toMatch(/planConflictsWithExclusions/);
    expect(SRC).toMatch(/Your dietary needs changed after these meals were made/);
    expect(SRC).toMatch(/Rebuild meals/);
  });

  test('detection routes through the ONE exclusion predicate', () => {
    expect(read('lib/food/mealPlanService.js')).toMatch(/foodExcluded\(key, exclude\)/);
  });
});

// ─── P0-4: UNKNOWN is not NO ────────────────────────────────────────────

describe('P0-4: missing joint/soreness data never reads as an all-clear', () => {
  const row = (at, over = {}) => ({ at, ...over });
  const WEEK = 7 * 86400000;
  const start = 1700000000000;

  test('no joint answers -> jointDiscomfortAvg is null, not 0', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows: [row(start + 1 * WEEK, { soreness13: 2 }), row(start + 2 * WEEK, { soreness13: 2 })],
      blockStart: start, blockWeeks: 5,
    });
    expect(agg.jointDiscomfortAvg).toBeNull();
    expect(agg.dataPoints).toBe(2); // soreness-only rows still count as data
  });

  test('no soreness answers in the late window -> sorenessLateAvg stays null', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows: [row(start + 3 * WEEK, { joint: 1 })],
      blockStart: start, blockWeeks: 5,
    });
    expect(agg.sorenessLateAvg).toBeNull();
    expect(agg.jointDiscomfortAvg).toBe(1);
  });

  test('real answers still average', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows: [row(start + 1 * WEEK, { joint: 2 }), row(start + 2 * WEEK, { joint: 4 })],
      blockStart: start, blockWeeks: 5,
    });
    expect(agg.jointDiscomfortAvg).toBe(3);
  });

  test('an explicit zero joint answer is genuine negative evidence, not missing', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows: [row(start + 1 * WEEK, { joint: 0 })],
      blockStart: start, blockWeeks: 5,
    });
    expect(agg.jointDiscomfortAvg).toBe(0); // answered "no discomfort"
    expect(agg.dataPoints).toBe(1);
  });

  test('the runner passes honest nulls through (no ?? 0 laundering)', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).not.toMatch(/sorenessLateAvg: agg\.sorenessLateAvg \?\? 0/);
    expect(SRC).toMatch(/sorenessLateAvg: agg\.sorenessLateAvg,/);
  });

  test('no-evidence can never SATISFY a positive recovery requirement', () => {
    // lateRecoveryOk (the only gate that unlocks the +1) requires positive
    // late-window evidence for BOTH signals; missing feedback reads false.
    const SRC = read('lib/blockMetrics.js');
    expect(SRC).toMatch(/soreness AND joint answers/);
    expect(SRC).toMatch(/Missing or self-selected feedback reads false, never fine/);
  });

  test('check-in joint pain is tri-state end to end (null = unanswered, never an explicit no)', () => {
    const screen = read('screens/WeeklyCheckInScreen.js');
    // Save: unanswered persists as null.
    expect(screen).toMatch(/jointPain === 'yes' \? true : \(jointPain === 'no' \? false : null\)/);
    // Reload: null must NOT render as an explicit 'no'.
    expect(screen).toMatch(/existingCheckin\.jointPain == null\s*\n\s*\? null/);

    const db = read('lib/database.js');
    // Local write mapping preserves null.
    expect(db).toMatch(/\['jointPain', 'joint_pain', \(v\) => \(v == null \? null : \(v \? 1 : 0\)\)\]/);
    // Cloud-pull applier preserves null.
    expect(db).toMatch(/c\.joint_pain == null \? null : \(c\.joint_pain \? 1 : 0\)/);

    // Registry push preserves null (cloud column is nullable BOOLEAN).
    expect(read('lib/sync/tables/weeklyCheckins.js'))
      .toMatch(/joint_pain: c\.jointPain == null \? null : !!c\.jointPain/);
  });
});

// ─── P0-5: meal reminder restore ────────────────────────────────────────

describe('P0-5: restoreNotifications re-lays the opt-in meal reminders', () => {
  const SRC = read('lib/notifications/scheduler.js');

  test('the restore path reads the preference and re-lays enabled reminders', () => {
    const restore = SRC.slice(SRC.indexOf('export async function restoreNotifications'));
    const body = restore.slice(0, restore.indexOf('\n// ─'));
    expect(body).toMatch(/MEAL_REMINDERS_KEY/);
    expect(body).toMatch(/scheduleMealReminders\(reminders\)/);
    // Disabled/absent prefs restore nothing.
    expect(body).toMatch(/reminders\.some\(\(r\) => r\?\.enabled\)/);
  });

  test('the key has a single owner and the settings screen imports it', () => {
    expect(SRC).toMatch(/export const MEAL_REMINDERS_KEY = '@volyume_meal_reminders'/);
    const screen = read('screens/NotificationSettingsScreen.js');
    expect(screen).toMatch(/MEAL_REMINDERS_KEY[\s\S]*from '\.\.\/lib\/notifications\/scheduler'/);
    expect(screen).not.toMatch(/const MEAL_REMINDERS_KEY =/);
  });

  test('the re-lay is idempotent by construction (scheduler cancels its own identifiers first)', () => {
    const fn = SRC.slice(SRC.indexOf('export async function scheduleMealReminders'));
    expect(fn.slice(0, 400)).toMatch(/cancelMealReminders\(\)/);
  });
});

// ─── P0-6: one canonical FFM floor weight ───────────────────────────────

describe('P0-6: a single canonical FFM-floor weight resolution', () => {
  test('resolution order: profile -> EWMA today -> last valid weigh-in', () => {
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 80, ewmaTodayKg: 78, lastWeighInKg: 77 })).toBe(80);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: null, ewmaTodayKg: 78, lastWeighInKg: 77 })).toBe(78);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: null, ewmaTodayKg: null, lastWeighInKg: 77 })).toBe(77);
    expect(resolveFfmFloorWeightKg({})).toBeNull();
  });

  test('malformed weights never resolve (zero, negative, NaN, strings of junk)', () => {
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 0, ewmaTodayKg: -5, lastWeighInKg: NaN })).toBeNull();
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 'junk', ewmaTodayKg: undefined, lastWeighInKg: Infinity })).toBeNull();
    // Numeric strings coerce (storage round-trips).
    expect(resolveFfmFloorWeightKg({ profileWeightKg: '82.5' })).toBe(82.5);
  });

  test('BOTH weekly-coach evaluations resolve through the canonical helper', () => {
    const SRC = read('lib/weeklyCoach.js');
    const calls = SRC.match(/resolveFfmFloorWeightKg\(\{/g) || [];
    expect(calls.length).toBe(2);
    // The old divergent fallbacks are gone.
    expect(SRC).not.toMatch(/Number\(series\[series\.length - 1\]\?\.weightKg\) > 0/);
    expect(SRC).not.toMatch(/\(Number\.isFinite\(ewma7Today\) && ewma7Today > 0\) \? ewma7Today : null/);
  });
});

// ─── P0-1: planned volume restore + provenance ──────────────────────────

describe('P0-1: planned_muscle_volume restores into the primary table with provenance', () => {
  test('the push carries mev/mav/mrv/source with a column-tolerant retry', () => {
    const SRC = read('lib/sync.js');
    const fn = SRC.slice(SRC.indexOf('async function _pushPlannedMuscleVolume'));
    const body = fn.slice(0, fn.indexOf('async function _pushAdaptationEvents'));
    expect(body).toMatch(/mev: r\.mev \?\? null/);
    expect(body).toMatch(/source: r\.source \?\? null/);
    expect(body).toMatch(/stripProvenance/);
  });

  test('the pull applier writes the PRIMARY table, not the dead mirror', () => {
    const SRC = read('lib/database.js');
    const fn = SRC.slice(SRC.indexOf('export async function insertOrUpdatePlannedMuscleVolumeFromCloud'));
    const body = fn.slice(0, fn.indexOf('\nexport async function', 10));
    expect(body).toMatch(/INSERT OR REPLACE INTO planned_muscle_volume\s*\n?\s*\(/);
    expect(body).not.toMatch(/INSERT OR REPLACE INTO planned_muscle_volume_sync/);
  });

  test('stale data can never overwrite richer local rows (LWW by updated_at)', () => {
    const SRC = read('lib/database.js');
    const fn = SRC.slice(SRC.indexOf('export async function insertOrUpdatePlannedMuscleVolumeFromCloud'));
    const body = fn.slice(0, fn.indexOf('\nexport async function', 10));
    expect(body).toMatch(/Number\(existing\.updated_at \?\? 0\) >= incomingUpdated\) return;/);
  });

  test('tombstones never land and legacy rows degrade honestly', () => {
    const SRC = read('lib/database.js');
    const fn = SRC.slice(SRC.indexOf('export async function insertOrUpdatePlannedMuscleVolumeFromCloud'));
    const body = fn.slice(0, fn.indexOf('\nexport async function', 10));
    expect(body).toMatch(/if \(row\.deleted_at\) return;/);
    // Legacy (pre-migrate_132) rows: research landmarks + 'template' - the
    // one source label the explanation layer never personalises from.
    expect(body).toMatch(/source = source \?\? 'template'/);
    // Unrepresentable muscles are skipped, never invented.
    expect(body).toMatch(/if \(!research\) return;/);
  });

  test('the provenance migration exists, is additive, and is founder-gated', () => {
    const SQL = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'supabase', 'migrate_132_planned_muscle_volume_provenance.sql'),
      'utf8',
    );
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS mev integer/);
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS source text/);
    expect(SQL).toMatch(/run against production/);
  });
});

// ─── Cardio boundary guard ──────────────────────────────────────────────

describe('cardio remains out of scope (D92-1)', () => {
  test('the campaign changed no cardio routing and the boundary is recorded', () => {
    const register = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'docs', 'ux-world-class-audit-2026-07-09', 'DECISIONS-2026-07-09.md'),
      'utf8',
    );
    expect(register).toMatch(/Volyume is not a cardio logging\s*\n?\s*product/);
    expect(register).toMatch(/intentionally OUT OF SCOPE/);
  });
});

// ─── P0-7: missing data must not create false confidence ────────────────

describe('P0-7: permissive-default defects are closed', () => {
  test('D7: an argument-free adaptive decision can never recommend an increase', () => {
    // eslint-disable-next-line global-require
    const { computeAdaptiveDecision } = require('../algorithms');
    const out = computeAdaptiveDecision();
    expect(out.decision).not.toBe('add_set');
    expect(out.delta).toBeLessThanOrEqual(0);
  });

  test('D6: one genuinely-rated high joint week is not diluted by unanswered weeks', () => {
    // eslint-disable-next-line global-require
    const { shouldDeload } = require('../algorithms');
    const weeks = [
      { avgReps: 10, avgSoreness: null, avgJointDiscomfort: null, hasOverMRV: false, weeksSinceLastDeload: 1 },
      { avgReps: 10, avgSoreness: null, avgJointDiscomfort: null, hasOverMRV: false, weeksSinceLastDeload: 2 },
      { avgReps: 10, avgSoreness: null, avgJointDiscomfort: 2.0, hasOverMRV: false, weeksSinceLastDeload: 3 },
      { avgReps: 10, avgSoreness: null, avgJointDiscomfort: 2.0, hasOverMRV: false, weeksSinceLastDeload: 4 },
    ];
    const out = shouldDeload(weeks);
    // Two rated weeks averaging 2.0 must register the joint reason; under
    // the old || 0 dilution the mean was 1.0 and the trigger never fired.
    expect(out.reasons.join(' ')).toMatch(/joint discomfort/i);
  });

  test('D10: unknown sleep neither helps nor hurts block readiness', () => {
    // eslint-disable-next-line global-require
    const { checkinReadiness } = require('../blockAdvisor');
    const withSleep = checkinReadiness({ energyScore: 3, sorenessScore: 3, sleepHours: 7 });
    const noSleep = checkinReadiness({ energyScore: 3, sorenessScore: 3, sleepHours: null });
    // Renormalised 0.5/0.5: identical mid-scale reads agree, and unknown
    // sleep no longer scores as a healthy seven hours.
    expect(noSleep).toBe(50);
    expect(withSleep).toBeCloseTo(52, 0);
    const lowEnergyNoSleep = checkinReadiness({ energyScore: 1, sorenessScore: 5, sleepHours: null });
    expect(lowEnergyNoSleep).toBe(0); // nothing invented to soften a poor week
  });

  test('D4: unknown sex takes the HIGHER calorie floor, never 1200', () => {
    // eslint-disable-next-line global-require
    const { kcalFloorForSex } = require('../coachApply');
    expect(kcalFloorForSex('male')).toBe(1500);
    expect(kcalFloorForSex('female')).toBe(1200);
    expect(kcalFloorForSex(null)).toBe(1500);
    expect(kcalFloorForSex(undefined)).toBe(1500);
    // eslint-disable-next-line global-require
    const { calculateNutritionTargets } = require('../nutritionEngine');
    const out = calculateNutritionTargets({
      sex: null, ageYears: 30, heightCm: 150, weightKg: 40,
      activityLevel: 'sedentary', goal: 'aggressive_cut',
    });
    expect(out.targetKcal).toBeGreaterThanOrEqual(1500);
  });

  test('D4: a missing body weight can never size a deficit', () => {
    // eslint-disable-next-line global-require
    const { calculateNutritionTargets } = require('../nutritionEngine');
    const out = calculateNutritionTargets({
      sex: 'male', ageYears: 30, heightCm: 180, weightKg: null,
      activityLevel: 'moderate', goal: 'mild_cut',
    });
    expect(out.targetKcal).toBe(out.maintenanceKcal); // held at maintenance
    expect(out.warnings.join(' ')).toMatch(/weight is missing/i);
    // A surplus/maintenance phase still computes (display continuity).
    const bulk = calculateNutritionTargets({
      sex: 'male', ageYears: 30, heightCm: 180, weightKg: null,
      activityLevel: 'moderate', goal: 'lean_gain',
    });
    expect(bulk.targetKcal).toBeGreaterThan(bulk.maintenanceKcal);
  });

  test('D14: a null profile refuses meal planning instead of planning allergen-blind', () => {
    // eslint-disable-next-line global-require
    const { preferencesFromProfile } = require('../food/mealPlanService');
    expect(preferencesFromProfile(null)).toBeNull();
    expect(preferencesFromProfile(undefined)).toBeNull();
    // A sparse-but-present profile still normalises.
    expect(preferencesFromProfile({})).not.toBeNull();
    const SRC = read('lib/food/mealPlanService.js');
    expect((SRC.match(/return \{ error: 'no_profile' \}/g) || []).length).toBe(2);
  });

  test('source pins: the remaining closures cannot silently revert', () => {
    const coach = read('screens/CoachOutputScreen.js');
    // D1: intake read-failure sentinel reaches the engine.
    expect(coach).toMatch(/readFailed: true/);
    expect(coach).toMatch(/intakeReadFailed: !!intake\.readFailed/);
    // D2: evidence-free rows never terminate the poor-recovery run.
    expect(coach).toMatch(/if \(e == null && s == null\) continue;/);
    // D3: unknown soreness counts as grade-3 territory.
    expect(coach).toMatch(/ci\.sorenessScore == null \|\| ci\.sorenessScore >= 3/);
    // D12: both scoff reads fail closed on a missing profile.
    expect((coach.match(/userProfile == null \|\| \(userProfile\.scoffScore \?\? 0\) >= 2/g) || []).length).toBe(2);
    // D4a: sex falls back to the onboarding-enforced profile value.
    expect(coach).toMatch(/sex: bodyProfile\?\.sex \?\? userProfile\?\.sex \?\? null/);

    const wc = read('lib/weeklyCoach.js');
    // D5: unknown session denominator routes to stabilise, not perfection.
    expect(wc).toMatch(/sessionsPlanned > 0 \? sessionsCompleted \/ sessionsPlanned : 0/);
    // D1: the intake-read hold exists and explains itself.
    expect(wc).toMatch(/intakeReadHeld = true;/);
    expect(wc).toMatch(/type: 'intake_read_failed'/);

    // D13: session adjustments fall silent on failed safety-context reads.
    const sa = read('lib/sessionAdjustments.js');
    expect(sa).toMatch(/READ_FAILED/);
    expect(sa).toMatch(/coachOutput === READ_FAILED \|\| mesoWeek === READ_FAILED\) return \[\];/);

    // D2 addendum: a failed check-in read silences the block advisor.
    const ba = read('lib/blockAdvisor.js');
    expect(ba).toMatch(/checkins = await getRecentCheckins\(userId, 8\);/);
    expect(ba).not.toMatch(/getRecentCheckins\(userId, 8\)\.catch\(\(\) => \[\]\)/);

    // D9: the summary writes only touched fields and gates the engine.
    const ws = read('screens/WorkoutSummaryScreen.js');
    expect(ws).toMatch(/feedbackDirtyRef\.current\.size === 0 && !notesDirtyRef\.current\) return;/);
    expect(ws).toMatch(/if \(!feedbackTouched\) \{\s*\n\s*setAdaptiveDecisions\(\{\}\);/);

    // D8: Home no longer hard-codes the joint/soreness signals away.
    const home = read('screens/HomeScreen.js');
    expect(home).not.toMatch(/avgJointDiscomfort: 0,\s*\/\/ not tracked/);
    expect(home).toMatch(/jointRated\.length/);
  });
});
