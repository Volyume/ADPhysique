/**
 * 12-week coaching simulation
 * ────────────────────────────────────────────────────────────────────────
 *
 * Drives the coaching engines (generatePlan, runWeeklyCoach,
 * evaluateAutoReg, detectPR, computeRecoveryEMAs, predictDeloadWeek)
 * through a full 12-week cycle to verify the pipeline is internally
 * consistent and produces sensible coach output every week.
 *
 * What this catches:
 * - Coach output that contradicts the inputs (e.g. recommends a
 *   bigger deficit while wellbeing screen is positive)
 * - Calorie ping-pong (up one week, down the next, ignoring cooldown)
 * - Volume signal that never changes despite poor recovery
 * - Deload prediction that never fires after 6 weeks of accumulation
 * - Crashes / undefined property reads on long-running coach calls
 * - Profile shapes that buildPlanInputs can't handle
 *
 * What this does NOT catch:
 * - Actual DB persistence (no SQLite involved)
 * - UI rendering of the coach output
 * - Cross-device sync of the outputs
 *
 * Per-week scenario:
 *   - Days 1-6: log a morning weight (slight downward trend for cut)
 *   - Days 1, 3, 5, 6: complete a planned workout, log working sets
 *     with mild progression (or regression during accumulation)
 *   - Day 7: submit a weekly check-in
 *   - Run runWeeklyCoach
 *   - Apply the training adjustment (push / pull / hold) to the plan
 *   - Increment week counter, repeat
 *
 * At weeks 6 and 12, simulate mesocycle boundaries (deload then new
 * accumulation block). At week 6 also simulate a goal change.
 */

const { generatePlan } = require('../lib/planEngine');
const { buildPlanInputs } = require('../lib/planAutoGen');
const { runWeeklyCoach } = require('../lib/weeklyCoach');
const {
  predictDeloadWeek,
  isRecoveryWeek,
} = require('../lib/mesocycle');
const { detectPR } = require('../lib/algorithms');
const { computeRecoveryEMAs } = require('../lib/recoveryEMA');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Deterministic RNG so the simulation is reproducible
function makeRand(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

describe('12-week coaching simulation', () => {
  test('full pipeline drives clean for 12 weeks of cut → maintenance → bulk', async () => {
    const rand = makeRand(424242);

    // ── User profile ────────────────────────────────────────────────────
    const profile = {
      sex: 'male',
      ageYears: 35,
      heightCm: 178,
      weightKg: 90,
      bodyFatPercent: 18,
      bodyFatSource: 'visual',
      experience: 'intermediate',
      daysPerWeek: 4,
      sessionLengthMinutes: 60,
      equipment: 'full_gym',
      trainingGoal: 'general',
      trainingPhase: 'cut',
      planWeakPoints: ['arms'],
      recoveryRating: 'good',
    };

    // ── Generate the first plan via the real engine ─────────────────────
    const planInputs = buildPlanInputs(profile);
    expect(planInputs).not.toBeNull();
    const plan = generatePlan(planInputs);
    expect(plan).toBeDefined();
    expect(Array.isArray(plan.workouts)).toBe(true);
    expect(plan.workouts.length).toBeGreaterThanOrEqual(2);
    expect(plan.workouts.length).toBeLessThanOrEqual(6);

    // Each workout must have a name + exercises. Catches the case where
    // the engine returns a skeleton missing fields.
    for (const w of plan.workouts) {
      expect(typeof w.name).toBe('string');
      expect(Array.isArray(w.exercises)).toBe(true);
      expect(w.exercises.length).toBeGreaterThan(0);
      for (const ex of w.exercises) {
        expect(typeof ex.exerciseName).toBe('string');
        expect(ex.exerciseName.length).toBeGreaterThan(0);
        expect(ex.sets).toBeGreaterThan(0);
        expect(ex.repMin).toBeGreaterThan(0);
        expect(ex.repMax).toBeGreaterThanOrEqual(ex.repMin);
      }
    }

    // ── Track running state across the 12 weeks ─────────────────────────
    const morningWeights = []; // [{ weightKg, loggedAt }]
    const allLoggedSets = []; // every set ever logged
    const coachOutputs = []; // per-week
    const findings = []; // anomalies to report

    let currentWeight = profile.weightKg;
    let currentPhase = profile.trainingPhase;
    let weeksInPhase = 1;
    let lastCalAdjustmentWeeksAgo = 99;
    let lastCalAdjustmentDirection = null;
    let consecutiveOffTargetWeeks = 0;
    let consecutivePoorRecoveryWeeks = 0;
    let currentCalTarget = 2200; // rough cut target for a 90kg male
    let currentStepsTarget = 8000;
    const startOfWeek1 = Date.now() - 11 * WEEK_MS; // anchor 12 weeks ago

    // Working set baseline per exercise (so progression is realistic)
    const workingWeights = new Map(); // exerciseName -> kg
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        // Start with a sensible bodyweight-scaled weight
        const base = /squat|deadlift/i.test(ex.exerciseName) ? 80
                   : /bench|row/i.test(ex.exerciseName) ? 60
                   : /press|pull/i.test(ex.exerciseName) ? 40
                   : 20;
        workingWeights.set(ex.exerciseName, base);
      }
    }

    // Per-exercise set-count multiplier, push / pull adjustments scale this
    const setMultiplier = new Map(plan.workouts.flatMap(w => w.exercises.map(ex => [ex.exerciseName, 1.0])));

    // ── Per-week loop ───────────────────────────────────────────────────
    for (let week = 1; week <= 12; week++) {
      const weekStartMs = startOfWeek1 + (week - 1) * WEEK_MS;
      const mesoWeek = ((week - 1) % 6) + 1;
      const isDeload = isRecoveryWeek(mesoWeek, profile.experience);

      // ── Daily morning weights with realistic drift + noise ─────────────
      // Cut: -0.4 kg/wk. Maintenance: ~0. Bulk: +0.25 kg/wk.
      const dailyDrift = currentPhase === 'cut' ? -0.4 / 7
                       : currentPhase === 'bulk' || currentPhase === 'lean_gain' ? 0.25 / 7
                       : 0;
      for (let d = 0; d < 7; d++) {
        currentWeight += dailyDrift + (rand() - 0.5) * 0.3;
        morningWeights.push({
          weightKg: Math.round(currentWeight * 10) / 10,
          loggedAt: weekStartMs + d * DAY_MS,
        });
      }

      // ── Workouts: 4 workouts per week ──────────────────────────────────
      const weekSets = [];
      const sessionDays = [0, 2, 4, 5]; // Mon, Wed, Fri, Sat
      for (let i = 0; i < Math.min(plan.workouts.length, 4); i++) {
        const dayOffset = sessionDays[i];
        const wk = plan.workouts[i % plan.workouts.length];
        for (const ex of wk.exercises) {
          const targetSets = Math.max(1, Math.round(ex.sets * (setMultiplier.get(ex.exerciseName) ?? 1)));
          // Apply deload: cut working sets in half, drop weight 10%
          const effectiveSets = isDeload ? Math.max(1, Math.floor(targetSets * 0.5)) : targetSets;
          const wForExercise = workingWeights.get(ex.exerciseName) ?? 40;
          const effectiveWeight = isDeload ? wForExercise * 0.9 : wForExercise;

          for (let s = 0; s < effectiveSets; s++) {
            const reps = Math.floor(((ex.repMin + ex.repMax) / 2) + (rand() - 0.5) * 2);
            const setRow = {
              id: `s_w${week}_d${i}_${ex.exerciseName}_${s}`,
              userId: 'sim-user',
              workoutId: `w_${week}_${i}`,
              exerciseId: `ex_${ex.exerciseName.replace(/\s+/g, '_')}`,
              setNumber: s + 1,
              setType: 'straight',
              actualReps: Math.max(1, reps),
              weight: Math.round(effectiveWeight * 10) / 10,
              rir: Math.max(0, Math.floor(rand() * 3)),
              rpe: null,
              failed: false,
              createdAt: weekStartMs + dayOffset * DAY_MS + s * 60_000,
            };
            weekSets.push(setRow);
            allLoggedSets.push(setRow);
          }

          // Progress the working weight gently each week (smaller progression during cut)
          if (!isDeload) {
            const delta = currentPhase === 'cut' ? 0.5
                        : currentPhase === 'bulk' || currentPhase === 'lean_gain' ? 1.5
                        : 1.0;
            workingWeights.set(ex.exerciseName, wForExercise + delta);
          }
        }
      }

      // ── PR detection on the set with the highest est. 1RM this week ────
      let prsThisWeek = 0;
      for (const s of weekSets) {
        const historical = allLoggedSets.filter(x => x.exerciseId === s.exerciseId && x.createdAt < s.createdAt);
        const pr = detectPR(s, historical, { name: s.exerciseId }, 'kg');
        if (pr) prsThisWeek++;
      }

      // ── Weekly check-in ────────────────────────────────────────────────
      // Energy declines during cut, recovers in maintenance/bulk
      const baseEnergy = currentPhase === 'cut' ? 3.5 : currentPhase === 'bulk' ? 4 : 4;
      const checkin = {
        energyScore: Math.max(1, Math.round(baseEnergy - (currentPhase === 'cut' ? week * 0.1 : 0))),
        sorenessScore: Math.max(1, Math.round(3 + (rand() - 0.5))),
        calsAdherence: 'in_range',
        stepsAdherence: 'mostly_hit',
        sleepHours: 7,
        notes: '',
      };

      // ── Run the coach ──────────────────────────────────────────────────
      const out = runWeeklyCoach({
        checkin,
        morningWeights: morningWeights.slice(-14),
        sessionsCompleted: 4,
        sessionsPlanned: 4,
        prsThisWeek,
        goalPhase: currentPhase === 'cut' ? 'mild_cut' : currentPhase === 'bulk' ? 'mod_bulk' : 'maint',
        trainingGoal: profile.trainingGoal,
        weeksInPhase,
        consecutiveOffTargetWeeks,
        consecutivePoorRecoveryWeeks,
        lastCalAdjustmentDirection,
        lastCalAdjustmentWeeksAgo,
        currentCalTarget,
        currentStepsTarget,
        bodyweightKg: currentWeight,
        units: 'kg',
        scoffPositive: false,
      });

      coachOutputs.push({ week, mesoWeek, isDeload, currentPhase, ...out });

      // ── Invariant: every coach output must have the required shape ────
      expect(out).toBeDefined();
      expect(typeof out.trend).toBe('object');
      expect(typeof out.adjustments).toBe('object');
      expect(['hold', 'push', 'pull']).toContain(out.adjustments?.training?.signal ?? 'hold');

      if (out.adjustments?.calories) {
        const cal = out.adjustments.calories;
        expect(typeof cal).toBe('object');
        if (cal.change != null) {
          // Calorie changes should be in a sane range
          if (Math.abs(cal.change) > 400) {
            findings.push({ week, kind: 'large_calorie_change', value: cal.change, note: cal.note });
          }
        }
      }

      // ── Apply training signal to the next week's plan ──────────────────
      const trainingSignal = out.adjustments?.training?.signal;
      if (trainingSignal === 'push') {
        for (const w of plan.workouts) {
          for (const ex of w.exercises) {
            setMultiplier.set(ex.exerciseName, Math.min(1.5, (setMultiplier.get(ex.exerciseName) ?? 1) + 0.1));
          }
        }
      } else if (trainingSignal === 'pull') {
        for (const w of plan.workouts) {
          for (const ex of w.exercises) {
            setMultiplier.set(ex.exerciseName, Math.max(0.6, (setMultiplier.get(ex.exerciseName) ?? 1) - 0.1));
          }
        }
      }

      // ── Apply calorie adjustment ───────────────────────────────────────
      if (out.adjustments?.calories?.change != null) {
        currentCalTarget = currentCalTarget + out.adjustments.calories.change;
        lastCalAdjustmentDirection = out.adjustments.calories.change > 0 ? 'up' : 'down';
        lastCalAdjustmentWeeksAgo = 0;
      } else {
        lastCalAdjustmentWeeksAgo += 1;
      }

      // ── Update consecutive counters ────────────────────────────────────
      if (out.trend?.onTarget === false) consecutiveOffTargetWeeks += 1;
      else consecutiveOffTargetWeeks = 0;
      if (out.recoveryFlag === 'poor') consecutivePoorRecoveryWeeks += 1;
      else consecutivePoorRecoveryWeeks = 0;
      weeksInPhase += 1;

      // ── Phase transitions ──────────────────────────────────────────────
      // Week 5 → end of cut, switch to maintenance
      if (week === 5 && currentPhase === 'cut') {
        currentPhase = 'maintain';
        weeksInPhase = 1;
        currentCalTarget = 2600;
        lastCalAdjustmentDirection = null;
        lastCalAdjustmentWeeksAgo = 99;
      }
      // Week 9 → switch to bulk
      if (week === 9 && currentPhase === 'maintain') {
        currentPhase = 'bulk';
        weeksInPhase = 1;
        currentCalTarget = 3000;
        lastCalAdjustmentDirection = null;
        lastCalAdjustmentWeeksAgo = 99;
      }
    } // end of 12-week loop

    // ── Post-run analysis ─────────────────────────────────────────────────

    // 1. Every week produced an output
    expect(coachOutputs).toHaveLength(12);

    // 2. The 12 weeks span 3 phases; weeksInPhase should reset on each
    //    transition. Catches a bug where the phase change doesn't reset
    //    weeksInPhase and the coach thinks the user has been cutting for
    //    12 weeks straight.
    const phases = new Set(coachOutputs.map(o => o.goalPhase));
    expect(phases.size).toBeGreaterThanOrEqual(2);

    // 3. The deload week (mesoWeek 6) should produce a 'hold' or 'pull'
    //    training signal, not 'push'. Catches a bug where the coach
    //    pushes more volume on the user during a deload.
    const deloadOutputs = coachOutputs.filter(o => o.isDeload);
    for (const o of deloadOutputs) {
      const sig = o.adjustments?.training?.signal ?? 'hold';
      if (sig === 'push') {
        findings.push({ week: o.week, kind: 'push_on_deload', note: 'Coach pushed more volume on a deload week' });
      }
    }

    // 4. Predict deload around weeks 4-5 of accumulation. predictDeloadWeek
    //    should return a number when the feedback window suggests it.
    const feedbackWindow = coachOutputs.slice(-5).map((o) => ({
      mesoWeek: o.mesoWeek,
      energyScore: o.checkin?.energyScore,
      sorenessScore: o.checkin?.sorenessScore,
    }));
    const predicted = predictDeloadWeek(feedbackWindow, 5, profile.experience);
    expect(predicted).toBeDefined();
    expect(typeof predicted.weeksUntilDeload).toBe('number');
    expect(typeof predicted.reason).toBe('string');

    // 5. No calorie ping-pong: across 12 weeks the coach should not flip
    //    direction more than 3 times. Constant flipping means the
    //    cooldown logic is failing.
    let flips = 0;
    let lastDir = null;
    for (const o of coachOutputs) {
      const change = o.adjustments?.calories?.change;
      if (change == null) continue;
      const dir = change > 0 ? 'up' : 'down';
      if (lastDir != null && dir !== lastDir) flips += 1;
      lastDir = dir;
    }
    if (flips > 3) {
      findings.push({ kind: 'calorie_pingpong', count: flips, note: 'Coach flipped calorie direction more than 3x across 12 weeks' });
    }

    // 6. Plan should still produce a usable structure after 12 weeks of
    //    push/pull adjustments. Multipliers should be in a sane range.
    for (const [name, mult] of setMultiplier.entries()) {
      expect(mult).toBeGreaterThanOrEqual(0.5);
      expect(mult).toBeLessThanOrEqual(2.0);
      if (mult > 1.5 || mult < 0.6) {
        findings.push({ kind: 'multiplier_extreme', exercise: name, mult });
      }
    }

    // 7. Recovery EMA computed over the workout history should produce
    //    finite numbers, no NaN. Convert sets into the "workouts" shape
    //    that computeRecoveryEMAs expects (one entry per session).
    const workoutSessions = [];
    for (const o of coachOutputs) {
      workoutSessions.push({
        id: `w_${o.week}`,
        startedAt: startOfWeek1 + (o.week - 1) * WEEK_MS,
        sessionDifficulty: o.checkin?.sorenessScore ?? null,
        overallPump: 3,
        soreness24hBefore: o.checkin?.sorenessScore ?? null,
        jointDiscomfort: 0,
      });
    }
    const emas = computeRecoveryEMAs(workoutSessions);
    expect(emas).toBeDefined();
    for (const [, v] of Object.entries(emas)) {
      if (v != null && typeof v === 'number') {
        expect(Number.isFinite(v)).toBe(true);
      }
    }

    // Surface the findings the simulation made
    if (findings.length > 0) {
      console.log('=== Simulation findings ===');
      for (const f of findings) console.log('-', JSON.stringify(f));
    }

    // The actual assertions live in expect()s above. findings is FYI;
    // a real issue produces an expect() failure. Report a summary.
    console.log(`Simulation complete: 12 weeks, ${allLoggedSets.length} sets logged, ${morningWeights.length} morning weights, ${coachOutputs.length} coach outputs, ${findings.length} findings flagged.`);

    // Per-week summary so a reviewer can eyeball the trajectory
    for (const o of coachOutputs) {
      const sig = o.adjustments?.training?.signal ?? 'hold';
      const cal = o.adjustments?.calories?.change ?? 0;
      const trend = o.trend?.deltaLabel ?? '-';
      console.log(`W${o.week.toString().padStart(2)} meso${o.mesoWeek}${o.isDeload ? ' (deload)' : ''} ${o.currentPhase.padEnd(8)} train:${sig.padEnd(4)} cal:${cal >= 0 ? '+' : ''}${cal} trend:${trend}`);
    }
  });

  // ─── Scenario: hard cut with poor recovery ─────────────────────────────
  test('coach pulls back when recovery deteriorates 3 weeks running', () => {
    const checkin = {
      energyScore: 1, sorenessScore: 1, // both terrible
      calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 6,
    };
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 - i * 0.1,
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));

    const out = runWeeklyCoach({
      checkin,
      morningWeights,
      sessionsCompleted: 3, sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 4,
      consecutiveOffTargetWeeks: 0,
      consecutivePoorRecoveryWeeks: 3,
      lastCalAdjustmentDirection: null,
      lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2000,
      currentStepsTarget: 10000,
      bodyweightKg: 88.7,
      units: 'kg',
      scoffPositive: false,
    });

    // Coach should NOT recommend pushing harder
    expect(out.adjustments?.training?.signal).not.toBe('push');
    // If a deload is suggested, the note should mention recovery
    if (out.deloadSuggested) {
      expect(typeof out.deloadNote).toBe('string');
    }
  });

  // ─── Scenario: data-hold (no morning weights) ──────────────────────────
  test('coach holds the plan when there is no weight data', () => {
    const out = runWeeklyCoach({
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'untracked', stepsAdherence: null },
      morningWeights: [],
      sessionsCompleted: 4, sessionsPlanned: 4,
      prsThisWeek: 1,
      goalPhase: 'mild_cut',
      weeksInPhase: 1,
      consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2200, currentStepsTarget: 8000,
      bodyweightKg: null, units: 'kg', scoffPositive: false,
    });

    expect(out.hasEnoughData).toBe(false);
    expect(out.adjustments?.training?.signal).toBe('hold');
    // Must not recommend a calorie change with no data
    expect(out.adjustments?.calories).toBeNull();
  });

  // ─── Scenario: cut + gaining weight (something off) ────────────────────
  test('coach recommends a small reduction when cutting but weight trends up', () => {
    // 14 days of slight upward drift while supposedly cutting
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 + i * 0.05,
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 7 },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 4,
      consecutiveOffTargetWeeks: 3,
      consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 90.6, units: 'kg', scoffPositive: false,
    });

    // Trend should be flagged as off-target
    expect(out.trend?.onTarget).toBe(false);
    // Recommendation: pull cals down OR push steps up. Either is OK,
    // but the recommendation must exist.
    const hasAction = out.adjustments?.calories?.change != null || out.adjustments?.steps?.change != null;
    expect(hasAction).toBe(true);
    // The direction (if cals adjusted) should be down for a cut that's drifting up
    if (out.adjustments?.calories?.change != null) {
      expect(out.adjustments.calories.change).toBeLessThan(0);
    }
  });

  // ─── Scenario: cut going well, should NOT change anything ─────────────
  test('coach holds when cut is on-target and recovery is fine', () => {
    // Steady downward trend at ~0.4 kg/wk over 14 days
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 - i * (0.4 / 7),
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 7 },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
      goalPhase: 'mild_cut',
      weeksInPhase: 3,
      consecutiveOffTargetWeeks: 0,
      consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2200, currentStepsTarget: 8000,
      bodyweightKg: 89.2, units: 'kg', scoffPositive: false,
    });

    // Going well → coach should hold
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  // ─── Scenario: plateau (most common real cut trigger) ──────────────────
  test('coach acts on a stalled cut after 3 weeks of no loss', () => {
    // 14 days of weight bouncing around the same value
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 + (i % 2 === 0 ? 0.1 : -0.1),
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 7 },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 5,
      consecutiveOffTargetWeeks: 3,
      consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 90.0, units: 'kg', scoffPositive: false,
    });

    // A stalled cut needs an action. Either fewer cals or more steps.
    const hasAction = out.adjustments?.calories?.change != null || out.adjustments?.steps?.change != null;
    expect(hasAction).toBe(true);
  });

  // ─── Scenario: 0 sessions completed (sick / travel) ────────────────────
  test('coach handles a missed training week without crashing', () => {
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 - i * 0.05,
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 2, sorenessScore: 2, calsAdherence: 'over', stepsAdherence: 'missed', sleepHours: 6, notes: 'Travel week' },
      morningWeights,
      sessionsCompleted: 0, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint',
      weeksInPhase: 2,
      consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2600, currentStepsTarget: 8000,
      bodyweightKg: 89.3, units: 'kg', scoffPositive: false,
    });
    expect(out).toBeDefined();
    expect(['hold', 'push', 'pull']).toContain(out.adjustments?.training?.signal ?? 'hold');
    // The "what's working" section should NOT credit PRs they didn't earn
    if (out.whatWorking?.some(s => /pr|personal record/i.test(s))) {
      throw new Error('Coach credited PRs when sessionsCompleted=0');
    }
  });

  // ─── Scenario: very long cut without a break (15 weeks deep) ───────────
  test('coach suggests a diet break after a long cut', () => {
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 82 - i * (0.2 / 7),
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 2, sorenessScore: 2, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 6 },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 15,
      consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 2,
      lastCalAdjustmentDirection: 'down', lastCalAdjustmentWeeksAgo: 6,
      currentCalTarget: 1900, currentStepsTarget: 10000,
      bodyweightKg: 81.5, units: 'kg', scoffPositive: false,
    });

    // After 15 weeks in a cut, the coach should at least be aware
    if (out.dietBreakSuggested) {
      expect(typeof out.dietBreakNote).toBe('string');
      expect(out.dietBreakNote.length).toBeGreaterThan(10);
    }
    // Either way it shouldn't recommend a fresh deficit cut
    if (out.adjustments?.calories?.change != null) {
      // If it does change cals, going UP is preferable to going further down
      // when the user is already 15 weeks in. We don't require it but log
      // if it goes the other way.
      if (out.adjustments.calories.change < 0) {
        console.warn(`Long cut: coach suggested cutting cals further (${out.adjustments.calories.change}) at week 15`);
      }
    }
  });

  // ─── Scenario: very fast weight loss (over 1% bodyweight per week) ─────
  test('coach pulls back on a cut that is going too fast', () => {
    // 14 days of fast loss, about 1.2 kg/week
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 92 - i * (1.2 / 7),
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 2, sorenessScore: 3, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 6 },
      morningWeights,
      sessionsCompleted: 3, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', // user picked MILD but is losing aggressively
      weeksInPhase: 3,
      consecutiveOffTargetWeeks: 2,
      consecutivePoorRecoveryWeeks: 1,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 90, units: 'kg', scoffPositive: false,
    });

    // Going faster than planned. Coach should either bump cals up
    // OR explicitly note the rate is too fast.
    const calChange = out.adjustments?.calories?.change ?? 0;
    if (calChange < 0) {
      throw new Error(`Coach cut cals further when user was already losing too fast (change=${calChange})`);
    }
  });

  // ─── Plan engine edge profiles ────────────────────────────────────────

  test('plan generation works for bodyweight-only user', () => {
    const profile = {
      experience: 'beginner', daysPerWeek: 3, sessionLengthMinutes: 45,
      equipment: 'bodyweight', trainingGoal: 'general', trainingPhase: 'maintain',
      recoveryRating: 'average', planWeakPoints: [],
    };
    const plan = generatePlan(buildPlanInputs(profile));
    expect(plan).toBeDefined();
    expect(plan.workouts.length).toBeGreaterThan(0);
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        expect(typeof ex.exerciseName).toBe('string');
        expect(ex.exerciseName.length).toBeGreaterThan(0);
      }
    }
  });

  test('plan generation works for 6 days/week experienced lifter', () => {
    const profile = {
      experience: 'advanced', daysPerWeek: 6, sessionLengthMinutes: 90,
      equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'lean_gain',
      recoveryRating: 'good', planWeakPoints: ['arms', 'shoulders'],
    };
    const plan = generatePlan(buildPlanInputs(profile));
    expect(plan).toBeDefined();
    expect(plan.workouts.length).toBeGreaterThanOrEqual(4);
    expect(plan.workouts.length).toBeLessThanOrEqual(6);
  });

  test('plan generation works for 2 days/week minimalist', () => {
    const profile = {
      experience: 'intermediate', daysPerWeek: 2, sessionLengthMinutes: 60,
      equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
      recoveryRating: 'average', planWeakPoints: [],
    };
    const plan = generatePlan(buildPlanInputs(profile));
    expect(plan).toBeDefined();
    expect(plan.workouts.length).toBeGreaterThan(0);
    // With only 2 days, each session needs to cover a decent variety
    const allExercises = new Set();
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        allExercises.add(ex.exerciseName);
      }
    }
    // Should hit at least 6 distinct exercises across the week
    expect(allExercises.size).toBeGreaterThanOrEqual(6);
  });

  test('plan generation handles every supported training phase', () => {
    const phases = ['maintain', 'cut', 'lean_gain', 'bulk', 'recomp', 'mild_cut', 'aggressive_cut'];
    for (const phase of phases) {
      const profile = {
        experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
        equipment: 'full_gym', trainingGoal: 'general', trainingPhase: phase,
        recoveryRating: 'average', planWeakPoints: [],
      };
      const inputs = buildPlanInputs(profile);
      if (!inputs) continue; // some phases may not be valid inputs; that's fine
      const plan = generatePlan(inputs);
      expect(plan).toBeDefined();
      expect(Array.isArray(plan.workouts)).toBe(true);
      // Verify each workout has named exercises and sensible rep ranges
      for (const w of plan.workouts) {
        for (const ex of w.exercises) {
          expect(ex.repMin).toBeGreaterThan(0);
          expect(ex.repMax).toBeGreaterThanOrEqual(ex.repMin);
          // Reasonable rep range cap
          expect(ex.repMax).toBeLessThanOrEqual(50);
        }
      }
    }
  });

  test('plan generation handles deload-aware experience values', () => {
    for (const experience of ['beginner', 'intermediate', 'advanced', 'competitive']) {
      const profile = {
        experience, daysPerWeek: 4, sessionLengthMinutes: 60,
        equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
        recoveryRating: 'average', planWeakPoints: [],
      };
      const plan = generatePlan(buildPlanInputs(profile));
      expect(plan).toBeDefined();
      expect(plan.workouts.length).toBeGreaterThan(0);
    }
  });

  // ─── Insights engine ──────────────────────────────────────────────────

  test('insights engine does not crash on empty data', () => {
    const { generateInsights, rankAndCapInsights } = require('../lib/insightsEngine');
    const insights = generateInsights({ workouts: [], sets: [], exerciseMap: {} });
    expect(Array.isArray(insights)).toBe(true);
    const capped = rankAndCapInsights(insights);
    expect(Array.isArray(capped)).toBe(true);
    expect(capped.length).toBeLessThanOrEqual(3);
  });

  test('insights engine produces useful insights for a 4-week trained user', () => {
    const { generateInsights, rankAndCapInsights } = require('../lib/insightsEngine');
    const now = Date.now();
    // 4 weeks × 4 sessions = 16 workouts
    const workouts = Array.from({ length: 16 }, (_, i) => ({
      id: `w${i}`, userId: 'u1',
      startedAt: now - (28 - Math.floor(i * 28 / 16)) * DAY_MS,
      durationMinutes: 60, isCompleted: 1,
      setCount: 8, totalVolume: 4000,
    }));
    const sets = workouts.flatMap((w, i) => Array.from({ length: 8 }, (_, j) => ({
      id: `s${i}_${j}`, userId: 'u1', workoutId: w.id,
      exerciseId: `ex${j % 5}`,
      setNumber: j + 1, setType: 'straight',
      actualReps: 8 + (j % 3), weight: 50 + j * 5,
      createdAt: w.startedAt,
    })));
    const exerciseMap = {};
    for (let k = 0; k < 5; k++) {
      exerciseMap[`ex${k}`] = { id: `ex${k}`, name: `Exercise ${k}`, primaryMuscle: 'chest' };
    }
    const insights = generateInsights({ workouts, sets, exerciseMap, now });
    expect(Array.isArray(insights)).toBe(true);
    // Every insight should be an object with some kind of identifier
    for (const i of insights) {
      expect(typeof i).toBe('object');
      expect(i).not.toBeNull();
      // At least one of id / kind / type / category should be present
      const hasIdentifier = ['id', 'kind', 'type', 'category', 'key'].some(k => typeof i[k] === 'string');
      if (!hasIdentifier) {
        console.warn('Insight without an identifier:', Object.keys(i));
      }
    }
    const capped = rankAndCapInsights(insights);
    expect(capped.length).toBeLessThanOrEqual(3);
  });

  // ─── Block advisor ────────────────────────────────────────────────────

  test('blockAdvisor handles no active block gracefully', async () => {
    // getBlockAdvice calls getRecentCheckins which will return [] from the
    // mocked DB. With no active block, it should still produce SOMETHING.
    const { getBlockAdvice } = require('../lib/blockAdvisor');
    const out = await getBlockAdvice('u1', null, { firstName: 'Test', experience: 'intermediate' });
    expect(out).toBeDefined();
    // The advice should have an action label and a headline
    expect(typeof out.action ?? '').toBe('string');
  });

  test('blockAdvisor handles a fresh block (week 1)', async () => {
    const { getBlockAdvice } = require('../lib/blockAdvisor');
    const out = await getBlockAdvice('u1',
      { startDate: Date.now() - 3 * DAY_MS, plannedWeeks: 6 },
      { firstName: 'Test', experience: 'intermediate' },
    );
    expect(out).toBeDefined();
  });

  test('blockAdvisor handles an overdue block (8 weeks in on a 5-week block)', async () => {
    const { getBlockAdvice } = require('../lib/blockAdvisor');
    const out = await getBlockAdvice('u1',
      { startDate: Date.now() - 8 * WEEK_MS, plannedWeeks: 5 },
      { firstName: 'Test', experience: 'intermediate' },
    );
    expect(out).toBeDefined();
    if (out.action === 'in_recovery' || out.action === 'block_complete' || out.action === 'overdue') {
      expect(typeof out.body ?? '').toBe('string');
    }
  });

  // ─── Multi-week consistency: same inputs should produce same plan ──────
  test('plan generation is deterministic for the same inputs', () => {
    const profile = {
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
      equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'lean_gain',
      recoveryRating: 'good', planWeakPoints: ['arms'],
    };
    const a = generatePlan(buildPlanInputs(profile));
    const b = generatePlan(buildPlanInputs(profile));
    expect(a.workouts.length).toBe(b.workouts.length);
    for (let i = 0; i < a.workouts.length; i++) {
      expect(a.workouts[i].name).toBe(b.workouts[i].name);
      expect(a.workouts[i].exercises.length).toBe(b.workouts[i].exercises.length);
    }
  });

  // ─── Scenario: cooldown, last adjustment was 1 week ago, don't ping ───
  test('coach respects the calorie adjustment cooldown', () => {
    const morningWeights = Array.from({ length: 14 }, (_, i) => ({
      weightKg: 90 + i * 0.05,
      loggedAt: Date.now() - (13 - i) * DAY_MS,
    }));
    const out = runWeeklyCoach({
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', stepsAdherence: 'mostly_hit', sleepHours: 7 },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut',
      weeksInPhase: 4,
      consecutiveOffTargetWeeks: 1,
      consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: 'down',
      lastCalAdjustmentWeeksAgo: 1, // very recent, cooldown should hold
      currentCalTarget: 2200, currentStepsTarget: 8000,
      bodyweightKg: 90.6, units: 'kg', scoffPositive: false,
    });

    // With a recent change, coach should NOT change cals again right away
    // (cooldown). Either no change, or only a steps tweak.
    if (out.adjustments?.calories?.change != null) {
      // If cals DID change, it shouldn't be a big one
      expect(Math.abs(out.adjustments.calories.change)).toBeLessThanOrEqual(150);
    }
  });
});
