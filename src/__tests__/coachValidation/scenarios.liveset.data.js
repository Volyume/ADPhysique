/**
 * scenarios.liveset.data.js — Campaign 21 T-LIVESET family DATA.
 *
 * Pure scenario definitions + fixture helpers for the livePrescription engine,
 * split out from scenarios.liveset.test.js so ledger.coverage.test.js can import
 * the coverage list without side effects.
 *
 * ~30 scenarios covering T-LIVESET-01..09 oracle blocks:
 * - first exposure (FIRST_TIME_BAND, with/without startingWeight)
 * - second exposure (single comparable, medium confidence)
 * - ordinary carry-forward (MATCH_LOAD_ADD_REP)
 * - rep progression (beat rule +1)
 * - mastered-range advance (topped + effort 2 → +increment)
 * - effort holds (difficulty 4, null)
 * - stronger today (CURRENT_SESSION_STRONGER)
 * - weaker today in-band (hold load, honest reps) and below-band (drop)
 * - user lower/higher overrides (USER_CHOICE_RESPECTED)
 * - learned back-off (2-of-3 at <=0.95 within 0.05)
 * - overshoot add (once only per rise)
 * - changed set count (no fake ordinal)
 * - changed rep range (>=50% vs <50% overlap)
 * - special types (reps_only, AMRAP, warmup/dropset)
 * - noise floor (±2 reps → no change)
 * - recency bounds (44 vs 46 days, outlier discount)
 *
 * Fixture shapes and helpers replicate src/lib/__tests__/livePrescription.scenarios.test.js
 * conventions for packet assembly and comparable-session building.
 */

import { NOW, DAY } from './harness';

// ─── Fixture helpers (matching livePrescription.scenarios.test.js style) ────

/** Row shape for a single set logged in a session. */
function row({
  weight,
  reps,
  setType = 'straight',
  pos = 1,
  at = NOW,
  targetRepsMin = 8,
  targetRepsMax = 12,
  exerciseId = 'ex1',
}) {
  return {
    exerciseId,
    setType,
    weight,
    actualReps: reps,
    setNumber: pos,
    targetRepsMin,
    targetRepsMax,
    createdAt: at,
  };
}

/** One historical session from an array of per-position {weight, reps}. */
function hSession(at, sets, { difficulty = 2, targetRepsMin = 8, targetRepsMax = 12 } = {}) {
  return {
    at,
    difficulty,
    sets: sets.map((s, i) =>
      row({
        ...s,
        pos: s.pos ?? i + 1,
        at: at + i * 1000,
        targetRepsMin,
        targetRepsMax,
      }),
    ),
  };
}

/** Build a liveSet packet (input to assembleEvidencePacket). */
function packet({
  rawHistory = [],
  rawToday = [],
  prescription = { repsMin: 8, repsMax: 12 },
  senior = {},
  exercise = {},
  overrideLoad = null,
  overrideReps = null,
} = {}) {
  return {
    exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg', ...exercise },
    prescription,
    senior,
    rawHistory,
    rawToday,
    overrideLoad,
    overrideReps,
    now: NOW,
  };
}

/** Single set row logged today. */
function todayRow({ weight, reps, pos, setType = 'straight' }) {
  return row({ weight, reps, pos, setType, at: NOW + pos * 1000 });
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const SCENARIOS = [
  // ─ T-LIVESET-01 PIPELINE / SENIOR PRECEDENCE ─────────────────────────────

  {
    id: 'LSO-01',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 rule 1 (SENIOR deload precedence)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }])],
        senior: {
          isDeload: true,
          deloadTargets: [{ weight: 40, reps: 6 }, { weight: 40, reps: 6 }, { weight: 40, reps: 6 }],
        },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 40 },
      { kind: 'equals', path: 'repsTarget', equals: 6 },
      { kind: 'equals', path: 'provenance', equals: 'SENIOR_RECOVERY_HOLD' },
    ],
  },

  {
    id: 'LSO-02',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 rule 2 (TYPE gate: warmup → INSUFFICIENT_EVIDENCE)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 60, reps: 5, setType: 'warmup' }])],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'provenance', equals: 'INSUFFICIENT_EVIDENCE' },
      { kind: 'equals', path: 'confidence', equals: 'low' },
    ],
  },

  {
    id: 'LSO-03',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 rule 3 (FIRST_TIME_BAND, no startingWeight)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [],
        rawToday: [],
        prescription: { repsMin: 8, repsMax: 12 },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: null },
      { kind: 'equals', path: 'provenance', equals: 'FIRST_TIME_BAND' },
      { kind: 'equals', path: 'confidence', equals: 'low' },
    ],
    restraint: true,
  },

  {
    id: 'LSO-04',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 rule 3 (FIRST_TIME_BAND with startingWeight)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [],
        rawToday: [],
        prescription: { repsMin: 8, repsMax: 12, startingWeight: 40 },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 40 },
      { kind: 'equals', path: 'repsTarget', equals: 8 },
      { kind: 'equals', path: 'provenance', equals: 'FIRST_TIME_BAND' },
    ],
  },

  // ─ T-LIVESET-02 LOAD PROGRESSION (DROP, ADVANCE, MATCH) ──────────────────

  {
    id: 'LSO-05',
    family: 'liveSet',
    rules: ['T-LIVESET-02'],
    why: 'ORACLE T-LIVESET-02 (ordinary carry-forward: in-band log)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }]),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'provenance', equals: 'MATCH_LOAD_ADD_REP' },
    ],
    restraint: true,
  },

  {
    id: 'LSO-06',
    family: 'liveSet',
    rules: ['T-LIVESET-02', 'T-LIVESET-06'],
    why: 'ORACLE T-LIVESET-06 (rep progression: beat rule +1 applies)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }]),
        ],
      }),
      position: 1,
    },
    must: [{ kind: 'equals', path: 'repsTarget', equals: 11 }],
    restraint: true,
  },

  {
    id: 'LSO-07',
    family: 'liveSet',
    rules: ['T-LIVESET-02'],
    why: 'ORACLE T-LIVESET-02 (mastered-range advance: topped + effort 2)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }], { difficulty: 2 }),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }], { difficulty: 2 }),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 82.5 },
      { kind: 'equals', path: 'provenance', equals: 'LOAD_ADVANCE_RANGE_TOPPED' },
    ],
  },

  {
    id: 'LSO-08',
    family: 'liveSet',
    rules: ['T-LIVESET-02'],
    why: 'ORACLE T-LIVESET-02 (topped but effort 5: HOLD_EFFORT_VERY_HARD)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }], { difficulty: 5 }),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }], { difficulty: 5 }),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'provenance', equals: 'HOLD_EFFORT_VERY_HARD' },
    ],
  },

  {
    id: 'LSO-09',
    family: 'liveSet',
    rules: ['T-LIVESET-02'],
    why: 'ORACLE T-LIVESET-02 (topped but difficulty null: HOLD_EFFORT_UNKNOWN)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }], { difficulty: null }),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }], { difficulty: null }),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'provenance', equals: 'HOLD_EFFORT_UNKNOWN' },
    ],
  },

  // ─ T-LIVESET-03 WEAKER/STRONGER ADJUSTMENT ────────────────────────────────

  {
    id: 'LSO-10',
    family: 'liveSet',
    rules: ['T-LIVESET-03'],
    why: 'ORACLE T-LIVESET-03 (stronger today: historical 70, today 80, hold or advance)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 70, reps: 10 }, { weight: 70, reps: 9 }])],
        rawToday: [todayRow({ weight: 80, reps: 10, pos: 1 })],
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'provenance', equals: 'CURRENT_SESSION_STRONGER' },
    ],
  },

  {
    id: 'LSO-11',
    family: 'liveSet',
    rules: ['T-LIVESET-03'],
    // Lead triage (Step 11, class A fixture error): the original fixture had
    // NO today evidence, so the weaker rule could never fire - the "9-rep
    // set" its own why cited was missing. Production and oracle agree once
    // the fixture actually logs the weak set.
    why: 'ORACLE T-LIVESET-03 (weaker today in-band: 9 logged vs expected 12, >=3 below -> hold load, honest reps)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }]),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }]),
        ],
        rawToday: [todayRow({ weight: 80, reps: 9, pos: 1 })],
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'repsTarget', equals: 8 },
      { kind: 'equals', path: 'provenance', equals: 'CURRENT_SESSION_FATIGUE_ADJUST' },
    ],
    mustNot: [
      { kind: 'equals', path: 'provenance', equals: 'LOAD_ADVANCE_RANGE_TOPPED' },
    ],
  },

  {
    id: 'LSO-12',
    family: 'liveSet',
    rules: ['T-LIVESET-03'],
    why: 'ORACLE T-LIVESET-03 (weaker today below-band: <repsMin drops increment)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }])],
        rawToday: [todayRow({ weight: 80, reps: 6, pos: 1 })],
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 77.5 },
      { kind: 'equals', path: 'repsTarget', equals: 8 },
      { kind: 'equals', path: 'provenance', equals: 'CURRENT_SESSION_FATIGUE_ADJUST' },
    ],
  },

  {
    id: 'LSO-13',
    family: 'liveSet',
    rules: ['T-LIVESET-03'],
    why: 'ORACLE T-LIVESET-03 (overshoot: repsMax+2, once only)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
        rawToday: [todayRow({ weight: 80, reps: 14, pos: 1 })],
      }),
      position: 2,
    },
    must: [{ kind: 'equals', path: 'weight', equals: 82.5 }],
  },

  {
    id: 'LSO-14',
    family: 'liveSet',
    rules: ['T-LIVESET-03'],
    why: 'ORACLE T-LIVESET-03 (overshoot: second +2 after rise must not fire)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
        rawToday: [
          todayRow({ weight: 80, reps: 14, pos: 1 }),
          todayRow({ weight: 82.5, reps: 14, pos: 2 }),
        ],
      }),
      position: 3,
    },
    must: [{ kind: 'equals', path: 'weight', equals: 82.5 }],
    restraint: true,
  },

  // ─ T-LIVESET-04 USER OVERRIDE ────────────────────────────────────────────

  {
    id: 'LSO-15',
    family: 'liveSet',
    rules: ['T-LIVESET-04'],
    why: 'ORACLE T-LIVESET-04 (user lower override: typed 75 vs 80 suggestion)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
        overrideLoad: 75,
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 75 },
      { kind: 'equals', path: 'provenance', equals: 'USER_CHOICE_RESPECTED' },
    ],
  },

  {
    id: 'LSO-16',
    family: 'liveSet',
    rules: ['T-LIVESET-04'],
    why: 'ORACLE T-LIVESET-04 (user higher override: typed 85 vs 80 suggestion)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
        overrideLoad: 85,
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 85 },
      { kind: 'equals', path: 'provenance', equals: 'USER_CHOICE_RESPECTED' },
    ],
  },

  // ─ T-LIVESET-05 STABLE BACK-OFF ──────────────────────────────────────────

  {
    id: 'LSO-17',
    family: 'liveSet',
    rules: ['T-LIVESET-05'],
    why: 'ORACLE T-LIVESET-05 (learned back-off: 2-of-3 at <=0.95)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 100, reps: 12 }, { weight: 94, reps: 10 }]),
          hSession(NOW - 14 * DAY, [{ weight: 100, reps: 12 }, { weight: 95, reps: 10 }]),
          hSession(NOW - 21 * DAY, [{ weight: 100, reps: 12 }, { weight: 92, reps: 10 }]),
        ],
      }),
      position: 2,
    },
    // Lead triage (Step 11, class A tolerance error): the back-off ratio
    // (median 0.94) applies to the ADVANCED opening top (102.5), giving
    // exactly 96.25 - the original within-bound excluded the correct value
    // by a quarter kilo. "The back-off progresses with the top set"
    // (ORACLE T-LIVESET-05 / Campaign 20 design 13.1) is the very law the
    // original bound accidentally forbade.
    must: [
      { kind: 'equals', path: 'provenance', equals: 'STABLE_BACKOFF_PATTERN' },
      { kind: 'equals', path: 'weight', equals: 96.25 },
    ],
  },

  {
    id: 'LSO-18',
    family: 'liveSet',
    rules: ['T-LIVESET-05'],
    why: 'ORACLE T-LIVESET-05 (insufficient back-off: 1 session only)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 100, reps: 12 }, { weight: 90, reps: 10 }])],
      }),
      position: 2,
    },
    mustNot: [
      { kind: 'equals', path: 'provenance', equals: 'STABLE_BACKOFF_PATTERN' },
    ],
    restraint: true,
  },

  // ─ T-LIVESET-06 REP TARGET (BEAT RULE) ─────────────────────────────────────

  {
    id: 'LSO-19',
    family: 'liveSet',
    rules: ['T-LIVESET-06'],
    // Lead triage (Step 11, class A oracle misread): the original fixture's
    // topped history routed to LOAD_ADVANCE, whose rep target is band.min
    // BY DESIGN (the oracle block's own HOLD list: advance/drop bypass the
    // beat rule, "fresh range at the new load"). The beat rule is asserted
    // where it actually applies: an in-band continuation.
    why: 'ORACLE T-LIVESET-06 (beat rule on in-band continuation: expected-curve median 10 -> target 11)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }]),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 10 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'provenance', equals: 'MATCH_LOAD_ADD_REP' },
      { kind: 'equals', path: 'repsTarget', equals: 11 },
      { kind: 'equals', path: 'weight', equals: 80 },
    ],
  },

  {
    id: 'LSO-20',
    family: 'liveSet',
    rules: ['T-LIVESET-06'],
    why: 'ORACLE T-LIVESET-06 (compound decline 1/set: position 4 estimates from lower)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [
            { weight: 80, reps: 10 },
            { weight: 80, reps: 9 },
            { weight: 80, reps: 8 },
          ]),
        ],
      }),
      position: 4,
    },
    must: [{ kind: 'within', path: 'repsTarget', min: 5, max: 10 }],
  },

  // ─ T-LIVESET-07 OUTLIER DISCOUNT ─────────────────────────────────────────

  {
    id: 'LSO-21',
    family: 'liveSet',
    rules: ['T-LIVESET-07'],
    why: 'ORACLE T-LIVESET-07 (outlier >10% below median discounted from learning)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 20, reps: 8 }]), // outlier: ~75% vs median 80
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }]),
          hSession(NOW - 21 * DAY, [{ weight: 80, reps: 12 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 82.5 }, // opening from two 80s, not discounted by one 20
      { kind: 'equals', path: 'reference.weight', equals: 20 }, // but still shown as reference
    ],
  },

  {
    id: 'LSO-22',
    family: 'liveSet',
    rules: ['T-LIVESET-07'],
    why: 'ORACLE T-LIVESET-07 (outlier still shown in reference)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 20, reps: 8 }]),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }]),
          hSession(NOW - 21 * DAY, [{ weight: 80, reps: 12 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'reference.weight', equals: 20 }, // never hidden
    ],
    restraint: true,
  },

  // ─ T-LIVESET-08 INCREMENT RESOLUTION ─────────────────────────────────────

  {
    id: 'LSO-23',
    family: 'liveSet',
    rules: ['T-LIVESET-08'],
    why: 'ORACLE T-LIVESET-08 (increment: 5% cap on 80kg)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }]),
          hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 82.5 }, // 5% of 80 = 4, but increment 2.5 caps at 2.5
    ],
  },

  // ─ T-LIVESET-09 LAYOFF / BLOCK-FINISHED ──────────────────────────────────

  {
    id: 'LSO-24',
    family: 'liveSet',
    rules: ['T-LIVESET-09'],
    why: 'ORACLE T-LIVESET-09 (layoff >7d applies 0.9 cap multiplier)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 20 * DAY, [{ weight: 80, reps: 12 }])],
        senior: { layoffDays: 10 },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 72 }, // capped at 80 × 0.9, no advance
      { kind: 'equals', path: 'provenance', equals: 'SENIOR_RECOVERY_HOLD' },
    ],
  },

  {
    id: 'LSO-25',
    family: 'liveSet',
    rules: ['T-LIVESET-09'],
    why: 'ORACLE T-LIVESET-09 (layoff <=7d does not apply cap)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 5 * DAY, [{ weight: 80, reps: 10 }])],
        senior: { layoffDays: 7 },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 }, // no cap applied
    ],
    restraint: true,
  },

  {
    id: 'LSO-26',
    family: 'liveSet',
    rules: ['T-LIVESET-09'],
    why: 'ORACLE T-LIVESET-09 (block-finished caps load, no multiplier)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }])],
        senior: { blockFinished: true },
      }),
      position: 1,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 }, // cap only, no 0.9 multiplier
    ],
    restraint: true,
  },

  // ─ SPECIAL TYPES & EDGE CASES ────────────────────────────────────────────

  {
    id: 'LSO-27',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 (reps_only exercise: weight forced null)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 7 * DAY, [{ weight: 0, reps: 12 }]),
          hSession(NOW - 14 * DAY, [{ weight: 0, reps: 12 }]),
        ],
        exercise: { exerciseType: 'reps_only' },
      }),
      position: 1,
    },
    must: [{ kind: 'equals', path: 'weight', equals: null }],
  },

  {
    id: 'LSO-28',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 (AMRAP position: load resolved, repsTarget null)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
      }),
      position: { index: 1, setType: 'amrap' },
    },
    must: [
      { kind: 'within', path: 'weight', min: 75, max: 85 },
      { kind: 'equals', path: 'repsTarget', equals: null },
    ],
  },

  {
    id: 'LSO-29',
    family: 'liveSet',
    rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01 (noise floor: ±2 reps no change)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])],
        rawToday: [todayRow({ weight: 80, reps: 9, pos: 1 })],
      }),
      position: 2,
    },
    must: [
      { kind: 'equals', path: 'weight', equals: 80 },
      { kind: 'equals', path: 'provenance', equals: 'MATCH_LOAD_ADD_REP' },
    ],
    restraint: true,
  },

  {
    id: 'LSO-30',
    family: 'liveSet',
    rules: ['T-LIVESET-09'],
    why: 'ORACLE T-LIVESET-09 (45-day recency: 44 days young, 46 days old)',
    run: 'liveSet',
    facts: {
      packet: packet({
        rawHistory: [
          hSession(NOW - 44 * DAY, [{ weight: 80, reps: 12 }]),
          hSession(NOW - 46 * DAY, [{ weight: 80, reps: 12 }]),
        ],
      }),
      position: 1,
    },
    must: [
      { kind: 'within', path: 'weight', min: 80, max: 85 }, // resolves from 44d, 46d discounted
    ],
  },
];

export default SCENARIOS;
