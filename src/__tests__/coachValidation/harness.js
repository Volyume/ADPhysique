/**
 * Campaign 21 — scenario validation harness (Step 5-6 foundation).
 *
 * Binding architecture: docs/coach-validation-campaign-21-2026-08-16/
 * HARNESS-DESIGN.md §2-§3. Expected outcomes come ONLY from
 * docs/coach-validation-campaign-21-2026-08-16/ORACLE-LOCK.md
 * (LEAD-REVIEW: ACCEPTED 2026-08-16) — every scenario's `why` cites the
 * exact ORACLE block it derives from.
 *
 * WHAT THIS IS. A declarative scenario runner over the REAL production
 * decision seams (weeklyCoach, algorithms, livePrescription,
 * edPatternDetector, coachApply). `runScenarios(list)` turns a flat array
 * of scenario objects into one Jest `test` per scenario, so a failure
 * names the scenario id and its `why`. The assertion vocabulary is
 * deliberately small (equals, within, contains, absent, calledWith,
 * notCalled, throwsNever) — no mini-language beyond that.
 *
 * WHAT THIS IS NOT. Not a reimplementation of any engine. Every named
 * `run` entry calls the actual exported production function with a built
 * fixture. Only IO boundaries (DB reads, expo-notifications, AsyncStorage)
 * are ever mocked; decision functions are always the real ones.
 *
 * PURE / DETERMINISTIC. NOW is fixed once per process
 * (`harness.NOW`) so every fixture built from it is deterministic and
 * comparable run to run.
 */

import { runWeeklyCoach } from '../../lib/weeklyCoach';
import {
  computeSessionAdjustments,
  runAdaptiveEngine,
  computeAdaptiveDecision,
  shouldDeload,
} from '../../lib/algorithms';
import {
  assembleEvidencePacket,
  resolveSetPrescription,
} from '../../lib/livePrescription';
import { detectEdPatternFlag, hasEdPatternCleared } from '../../lib/edPatternDetector';
import {
  computeVolumeApply,
  markApplied,
  markDeclined,
  isDeclined,
  isApplied,
} from '../../lib/coachApply';
import { materialEvidenceChange, suppressedByDecline, evidenceSignature } from '../../lib/coachDecline';

// ─── Deterministic clock ─────────────────────────────────────────────────────

export const DAY = 86_400_000;
// Fixed epoch NOW (HARNESS-DESIGN §5): every fixture built off this value is
// reproducible across runs and machines. Not Date.now() — a real date chosen
// once so weekday/DST edge behaviour is stable.
export const NOW = Date.UTC(2026, 7, 16, 12, 0, 0); // Sun 16 Aug 2026, 12:00 UTC

// ─── Generic assertion vocabulary ────────────────────────────────────────────

/** Dot/bracket path getter: 'heldDecisions[0].type', 'adjustments.training.signal'. */
export function get(obj, path) {
  if (path === '' || path == null) return obj;
  const parts = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function describeAssertion(a) {
  return JSON.stringify(a);
}

/**
 * Evaluate one assertion object against the entry's outcome.
 * outcome = { result, thrown } — thrown is the caught error, or null.
 *
 * `groupLabel` also controls polarity for the three positive-shaped kinds
 * (equals/within/contains): inside a `mustNot` list they assert the
 * INVERSE ("must not equal", "must not fall within", "must not contain").
 * `absent`/`notCalled`/`throwsNever` are already negative-shaped and mean
 * the same thing in either list.
 */
function checkOne(outcome, a, groupLabel) {
  const { result, thrown } = outcome;
  const fail = (msg) => { throw new Error(`[${groupLabel}] ${describeAssertion(a)} — ${msg}`); };
  const negate = groupLabel === 'mustNot';

  switch (a.kind) {
    case 'equals': {
      const actual = get(result, a.path);
      if (negate) expect(actual).not.toEqual(a.equals);
      else expect(actual).toEqual(a.equals);
      return;
    }
    case 'within': {
      const actual = get(result, a.path);
      if (typeof actual !== 'number' || !Number.isFinite(actual)) {
        if (negate) return; // "must not fall within" is trivially satisfied by "isn't even a number"
        fail(`expected a finite number at path "${a.path}", got ${JSON.stringify(actual)}`);
      }
      const inRange = actual >= a.min && actual <= a.max;
      if (negate) expect(inRange).toBe(false);
      else expect(inRange).toBe(true);
      return;
    }
    case 'contains': {
      const actual = get(result, a.path);
      if (Array.isArray(actual)) {
        if (negate) expect(actual).not.toEqual(expect.arrayContaining([a.contains]));
        else expect(actual).toEqual(expect.arrayContaining([a.contains]));
      } else if (typeof actual === 'string') {
        if (negate) expect(actual).not.toEqual(expect.stringContaining(a.contains));
        else expect(actual).toEqual(expect.stringContaining(a.contains));
      } else if (negate) {
        return; // nothing there at all also satisfies "does not contain"
      } else {
        fail(`expected an array or string at path "${a.path}", got ${JSON.stringify(actual)}`);
      }
      return;
    }
    case 'absent': {
      const actual = get(result, a.path);
      if (Object.prototype.hasOwnProperty.call(a, 'contains')) {
        if (Array.isArray(actual)) {
          expect(actual).not.toEqual(expect.arrayContaining([a.contains]));
        } else if (typeof actual === 'string') {
          expect(actual).not.toEqual(expect.stringContaining(a.contains));
        } else if (actual == null) {
          // Nothing there at all also satisfies "does not contain".
          return;
        } else {
          fail(`expected an array, string or nullish at path "${a.path}", got ${JSON.stringify(actual)}`);
        }
      } else {
        expect(actual == null).toBe(true);
      }
      return;
    }
    case 'calledWith': {
      const calls = get(result, a.path);
      if (!Array.isArray(calls)) fail(`expected a calls array at path "${a.path}"`);
      const matched = calls.some((callArgs) => {
        try {
          expect(callArgs).toEqual(a.args);
          return true;
        } catch (_e) {
          return false;
        }
      });
      expect(matched).toBe(true);
      return;
    }
    case 'notCalled': {
      const target = get(result, a.path);
      if (Array.isArray(target)) {
        expect(target.length).toBe(0);
      } else if (target && typeof target.mock === 'object') {
        expect(target).not.toHaveBeenCalled();
      } else {
        fail(`expected a calls array or jest mock fn at path "${a.path}"`);
      }
      return;
    }
    case 'throwsNever': {
      if (thrown) fail(`entry threw: ${thrown?.message ?? thrown}`);
      return;
    }
    default:
      fail(`unknown assertion kind "${a.kind}"`);
  }
}

function runAssertionGroup(outcome, list, groupLabel) {
  for (const a of list || []) checkOne(outcome, a, groupLabel);
}

// ─── Athlete builders (weeklyCoach-shaped, the harness's primary seam) ───────

function flatWeights({ n = 35, startKg = 85, kgPerWeek = 0, nowMs = NOW } = {}) {
  const out = [];
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: nowMs - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

/** A minimal, stable athlete fixture for runWeeklyCoach. Chainable. */
class WeeklyCoachAthlete {
  constructor(level, base = {}) {
    this.level = level;
    this._checkin = {
      weekStart: NOW - 7 * DAY,
      energyScore: 3,
      sorenessScore: 2,
      stressScore: 3,
      calsAdherence: 'hit',
      trainingPerformance: 'hit',
      jointPain: false,
      notes: null,
    };
    this._top = {
      morningWeights: flatWeights({ startKg: 85 }),
      sessionsCompleted: 4,
      sessionsPlanned: 4,
      prsThisWeek: 0,
      goalPhase: 'maint',
      weeksInPhase: 4,
      currentCalTarget: 2400,
      currentStepsTarget: 8000,
      bodyweightKg: 85,
      units: 'kg',
      nowMs: NOW,
      ...base,
    };
  }

  checkin(partial) { this._checkin = { ...this._checkin, ...partial }; return this; }
  top(partial) { this._top = { ...this._top, ...partial }; return this; }

  cutPhase(weeksInPhase = 6) { return this.top({ goalPhase: 'mild_cut', weeksInPhase }); }
  bulkPhase(weeksInPhase = 6) { return this.top({ goalPhase: 'mild_bulk', weeksInPhase }); }
  maintPhase(weeksInPhase = 4) { return this.top({ goalPhase: 'maint', weeksInPhase }); }

  week(n) { return this.top({ weeksInPhase: n }); }

  /** Weight history shaped to a signed weekly rate (%BW/week, approx). */
  weightTrend({ startKg = 85, pctPerWeek = 0, n = 35 } = {}) {
    const kgPerWeek = (pctPerWeek / 100) * startKg;
    return this.top({ morningWeights: flatWeights({ n, startKg, kgPerWeek, nowMs: this._top.nowMs ?? NOW }), bodyweightKg: startKg });
  }

  /** recentWeeklyHistory for the ED-pattern detector, most-recent-first. */
  history(recentWeeklyHistory) { return this.top({ recentWeeklyHistory }); }

  interventions(priorInterventions) { return this.top({ priorInterventions }); }
  declines(priorDeclines) { return this.top({ priorDeclines }); }

  toInputs(overrides = {}) {
    const { checkin: checkinOverride, ...topOverride } = overrides;
    return {
      ...this._top,
      ...topOverride,
      checkin: { ...this._checkin, ...(checkinOverride || {}) },
    };
  }
}

export const b = {
  novice: (base) => new WeeklyCoachAthlete('novice', { weeksInPhase: 2, sessionsPlanned: 3, sessionsCompleted: 3, ...base }),
  intermediate: (base) => new WeeklyCoachAthlete('intermediate', { weeksInPhase: 4, sessionsPlanned: 4, sessionsCompleted: 4, ...base }),
  advanced: (base) => new WeeklyCoachAthlete('advanced', { weeksInPhase: 8, sessionsPlanned: 5, sessionsCompleted: 5, ...base }),

  // ── sessionAdjust (computeSessionAdjustments) fixture ──
  sessionAdjustInput(overrides = {}) {
    const base = {
      todaysExercises: [{ exerciseId: 'ex1', primaryMuscle: 'chest', plannedSets: 4 }],
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 10 * DAY, // >72h ago: not "recently trained" for R2
          lastFeedback: { pump: 1, joint: 0, performance: 1 },
          checkinSore: false,
          checkinAt: NOW - 1 * DAY,
          presessionSoreness: 1,
          displayName: 'Chest',
        },
      },
      weeklyContext: {
        doneThisWeekByMuscle: { chest: 4 },
        landmarks: { chest: { mev: 6, mav: 14, mrv: 22 } },
        weeklySignal: 'hold',
        safetyHold: false,
        isDeload: false,
        weekStartMs: NOW - 3 * DAY,
      },
      recentSessionEvents: [],
      now: NOW,
      presessionIntent: null,
    };
    return { ...base, ...overrides, weeklyContext: { ...base.weeklyContext, ...(overrides.weeklyContext || {}) } };
  },

  // ── liveSet (assembleEvidencePacket + resolveSetPrescription) fixture ──
  liveSetPacketInput(overrides = {}) {
    const base = {
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', incrementKg: null, units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12, targetSets: 3, startingWeight: null, goal: null },
      senior: {},
      rawHistory: [],
      rawToday: [],
      overrideLoad: null,
      overrideReps: null,
      now: NOW,
    };
    return { ...base, ...overrides, senior: { ...base.senior, ...(overrides.senior || {}) } };
  },
};

// ─── Production entry registry (HARNESS-DESIGN §3) ───────────────────────────
// Every entry calls the REAL authoritative production function. Mocking is
// reserved for IO boundaries only (see notifySuppression, which mocks
// expo-notifications/AsyncStorage/database — never the decision itself).

export const ENTRIES = {
  weeklyCoach: (scenario) => {
    const inputs = scenario.athlete
      ? scenario.athlete.toInputs(scenario.facts || {})
      : { nowMs: NOW, ...(scenario.facts || {}) };
    return runWeeklyCoach(inputs);
  },

  sessionAdjust: (scenario) => computeSessionAdjustments(scenario.facts),

  adaptive: (scenario) => {
    const mode = scenario.facts?._mode || 'decision';
    if (mode === 'engine') return runAdaptiveEngine(scenario.facts.weekFeedback);
    return computeAdaptiveDecision(scenario.facts);
  },

  deload: (scenario) => shouldDeload(scenario.facts),

  liveSet: (scenario) => {
    const packet = assembleEvidencePacket(scenario.facts.packet);
    return resolveSetPrescription(packet, scenario.facts.position ?? 1);
  },

  edDetector: (scenario) => {
    const mode = scenario.facts?._mode || 'detect';
    if (mode === 'clear') {
      return { cleared: hasEdPatternCleared(scenario.facts.userState, scenario.facts.weeklyHistory) };
    }
    return detectEdPatternFlag(
      scenario.facts.userState,
      scenario.facts.weeklyHistory,
      scenario.facts.goalLockAdvanced ?? false,
    );
  },

  coachApply: (scenario) => {
    const fn = scenario.facts?._fn || 'computeVolumeApply';
    if (fn === 'computeVolumeApply') return computeVolumeApply(scenario.facts.plannedRows, scenario.facts.volumeDelta);
    if (fn === 'markApplied') return markApplied(scenario.facts.output, scenario.facts.key, scenario.facts.details);
    if (fn === 'markDeclined') return markDeclined(scenario.facts.output, scenario.facts.key, scenario.facts.details);
    if (fn === 'isDeclined') return { value: isDeclined(scenario.facts.output, scenario.facts.key) };
    if (fn === 'isApplied') return { value: isApplied(scenario.facts.output, scenario.facts.key) };
    throw new Error(`coachApply: unknown _fn "${fn}"`);
  },

  // Pure decline-memory primitives (coachDecline.js) — U-AUTH-02/N-COACH-10's
  // authority, cited directly by the ORACLE-LOCK U-AUTH-02 block.
  declineMemory: (scenario) => {
    const mode = scenario.facts?._mode || 'materialChange';
    if (mode === 'materialChange') {
      return materialEvidenceChange(scenario.facts.previous, scenario.facts.current);
    }
    if (mode === 'signature') {
      return evidenceSignature(scenario.facts.context, scenario.facts.opts);
    }
    return suppressedByDecline(scenario.facts);
  },
};

// ─── Coverage export (ledger.coverage.test.js reads this) ───────────────────
// In-memory only, per HARNESS-DESIGN §2/§4: "writes nothing" — the real
// ledger.json mechanical update is a later pass (Step 13). This module-level
// export lets the coverage gate see what THIS run registered.
export const COVERAGE = [];

/** Records rule_id -> test-id mappings for the ledger coverage gate. */
export function registerCoverage(scenario) {
  COVERAGE.push({
    id: scenario.id,
    family: scenario.family,
    rules: scenario.rules || [],
    pending: !!scenario.pending,
    expectedFail: !!scenario.expectedFail,
  });
}

// ─── The runner ───────────────────────────────────────────────────────────────

/**
 * Turns a flat array of scenario objects into one Jest `test` per scenario.
 *
 * Scenario shape (HARNESS-DESIGN §2):
 *   { id, family, why, rules: [ruleId...], athlete?, facts?, run,
 *     must?, may?, mustNot?, provenance?, pending?, pendingReason?,
 *     expectedFail? }
 *
 * `pending: true` — production seam does not exist yet for this locked
 * block; registered in coverage but the Jest test is SKIPPED (visible in
 * the report as `pending`), never given a fake assertion.
 *
 * `expectedFail: true` — the scenario is believed to disagree with
 * production (a DEFECT: SUSPECTED oracle block); rendered as `test.failing`
 * so it stays VISIBLE (fails loudly if production ever starts passing,
 * which is the intended signal for Step 11 triage) rather than silently
 * skipped.
 */
export function runScenarios(list) {
  for (const scenario of list) {
    registerCoverage(scenario);
    if (!scenario.why || !/ORACLE\s+[A-Z0-9-]+/.test(scenario.why)) {
      throw new Error(`Scenario ${scenario.id}: "why" must cite an ORACLE block (e.g. "ORACLE X-SAFETY-04").`);
    }

    const label = `${scenario.id}: ${scenario.why}`;

    if (scenario.pending) {
      test.skip(`${label} [PENDING: ${scenario.pendingReason || 'no production seam'}]`, () => {});
      continue;
    }

    const runner = async () => {
      const entryFn = ENTRIES[scenario.run];
      if (!entryFn) throw new Error(`Scenario ${scenario.id}: unknown run entry "${scenario.run}"`);
      let result;
      let thrown = null;
      try {
        result = await entryFn(scenario);
      } catch (e) {
        thrown = e;
      }
      const outcome = { result, thrown };

      runAssertionGroup(outcome, scenario.must, 'must');
      runAssertionGroup(outcome, scenario.mustNot, 'mustNot');
      for (const a of scenario.may || []) {
        const actual = get(result, a.path);
        if (actual !== undefined) checkOne(outcome, a, 'may');
      }
      if (scenario.provenance) {
        const actual = get(result, 'provenance');
        expect(actual).toEqual(scenario.provenance.equals);
      }
      if (scenario.persisted) {
        expect(scenario.persisted.check(result)).toBe(true);
      }

      // Determinism: same scenario, same fixtures -> byte-identical result
      // (HARNESS-DESIGN §5), unless the scenario explicitly opts out (some
      // IO-mocking scenarios are not idempotent to re-run against shared
      // mock state).
      if (!scenario.skipDeterminism && !thrown) {
        const again = await entryFn(scenario);
        expect(JSON.stringify(again)).toBe(JSON.stringify(result));
      }
    };

    if (scenario.expectedFail) {
      test.failing(`${label} [EXPECTED-FAIL: disagrees with production, see DISAGREEMENTS]`, runner);
    } else {
      test(label, runner);
    }
  }
}
