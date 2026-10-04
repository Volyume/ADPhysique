/**
 * science.js -- D219: every number the plan builder uses, with its grade and
 * its source, in one place.
 *
 * Authority: register D219 (the founder's order, its additions and the six
 * answers), the design docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md (revision 2) and the evidence report 03-SCIENCE.md in
 * the same folder. Section numbers below ("design 4.3", "S Q3b") point into
 * those two documents.
 *
 * Grades (03-SCIENCE.md section 0.1): A = meta-analysis or several good
 * trials; B = one or two good trials; C = single small or indirect trials;
 * D = practitioner consensus or theory; CONV = a convention the app chose,
 * consistent with the evidence but not measured; INF = an inference from
 * graded evidence, shown by the arithmetic in the design.
 *
 * Pure data, no imports. This module sits under prescribe.js, which the
 * check-in path reaches through coachApply.js, so it must never reach
 * src/lib/recovery/ (edIsolation.guard.test.js). The recovery model's own
 * constants (clocks, effort and novelty factors) live in
 * src/lib/recovery/constants.js and are not repeated here.
 *
 * Every exported number has an entry in EVIDENCE (science.test.js pins it),
 * so a number cannot be added without its grade and source.
 */

// ── Sets per exercise (design 4.3; S Q1, F1; founder D8) ─────────────────
export const SETS_PER_EXERCISE = Object.freeze({
  capCompound: 4,
  capIsolation: 3,
  floor: 2,
  // Lead ruling (build, D219): in a week whose target is below two sets for
  // every exercise of a muscle (a recovery week or a pull back), each
  // exercise keeps at least one set rather than dropping out of the session.
  floorInLowWeek: 1,
  thinEquipmentBonus: 2,
});

// ── Per muscle, per session (design 4.3; S Q2, F2) ───────────────────────
export const PER_SESSION = Object.freeze({
  directCap: 8,
  fractionalCap: 11,
  focusDirectCap: 10,
  focusFractionalCap: 12,
});

// At most this many exercises for one muscle in one session (design 4.3).
// Muscles not listed take one.
export const EXERCISES_PER_MUSCLE_PER_SESSION = Object.freeze({
  chest: 3,
  back: 3,
  quads: 3,
  side_delts: 2,
  rear_delts: 2,
  biceps: 2,
  triceps: 2,
  glutes: 2,
  calves: 2,
  abs: 2,
  // Lead ruling (D219 build): two for hamstrings, a knee-flexion curl and a
  // hip hinge (S F13's pair), not the design's one. With one a session a
  // 4-day plan holds hamstrings at 7 direct sets, below the normal growth
  // range (10, A-graded evidence), which outranks a convention.
  hamstrings: 2,
  front_delts: 1,
  traps: 1,
});
export const EXERCISES_PER_MUSCLE_DEFAULT = 1;

// ── Whole-session ceilings (founder D45) ─────────────────────────────────
export const SESSION_CEILINGS = Object.freeze({
  exercises: 8,
  workingSets: 25,
});

// ── Counting (design 4.1; S Q2, F0) ──────────────────────────────────────
export const COUNTING = Object.freeze({
  synergistCredit: 0.5,
});

// ── Weekly bands in fractional sets (design 5.3; S Q3b, F16) ─────────────
// below maintenance under 2; maintenance 2 to 6; between above 6 and under
// 10; normal growth 10 to 20; focus range above 20 to 30; top of the studied
// range above 30 to 42; beyond the studied range above 42.
export const WEEKLY_BANDS = Object.freeze({
  maintenanceFrom: 2,
  maintenanceTop: 6,
  normalFrom: 10,
  normalTop: 20,
  focusTop: 30,
  studiedTop: 42,
});

// ── Weekly targets by role, fractional sets (design 4.2; S F3, F10, F11) ─
export const ROLE_TARGETS = Object.freeze({
  focus: Object.freeze({ peak: 22, low: 20, high: 24, climb: 2, maxClimb: 3, plannedCeiling: 30 }),
  standard: Object.freeze({ peakMax: 20, firstBlockBeginnerPeak: 14, climb: 2 }),
  maintenance: Object.freeze({ target: 4, low: 2, high: 6 }),
  raised: Object.freeze({ high: 24, climb: 2, maxClimb: 3 }),
});

// The readiness check never lowers a muscle's weekly sets below these to keep
// its promise (design 4.14).
export const GROWTH_FLOOR = Object.freeze({
  standard: 10,
  focus: 20,
});

// ── The block (design 4.2, 4.14; founder Q5 = A) ─────────────────────────
export const BLOCK = Object.freeze({
  weeks: 6,
  peakWeek: 5,
  week1BelowPeak: 8,
  recoveryWeekShare: 0.5,
  rirLadder: Object.freeze([3, 2, 2, 1, 1, 4]),
  cutPhasePeakReduction: 2,
});

// Ramp, do not jump (design 4.4; S Q8): week 1 sits no more than this many
// weekly sets above what the person logged over the last 4 weeks, or above
// the standard start when there is no history.
export const RAMP = Object.freeze({
  maxAboveLogged: 3,
  maxAboveStandardStartNoHistory: 4,
  loggedWindowWeeks: 4,
});

// ── Check-in steps for next week (design 4.10; S Q9, F11, F12) ───────────
export const CHECKIN_STEPS = Object.freeze({
  strong: 3,
  plannedClimb: 2,
  hold: 0,
  pullBack: -2,
});

// ── Frequency (design 4.4; S Q4, F4) ─────────────────────────────────────
export const FREQUENCY = Object.freeze({
  preferTwoExposuresFromWeekly: 12,
  preferTwoExposuresMinSessions: 4,
});

// A session "trains" a muscle with at least this many direct sets, or this
// many fractional sets (design 4.6; S Q6c R4). One definition everywhere.
export const EXPOSURE = Object.freeze({
  minDirect: 2,
  minFractional: 6,
});

// A muscle trained twice that cannot be back-to-back safe: the exposure
// followed by the shorter gap is the light one (design 4.5 step 2).
export const HEAVY_LIGHT = Object.freeze({
  lightDirectLow: 2,
  lightDirectHigh: 4,
  heavyDirectLow: 6,
  heavyDirectHigh: 8,
});

// ── The rotation score (design 4.6; S F7) ────────────────────────────────
export const ROTATION = Object.freeze({
  weights: Object.freeze({ backToBack: 0.5, typical: 0.35, even: 0.15, own: 0 }),
  weightsWithOwnGaps: Object.freeze({ backToBack: 0.25, typical: 0.15, even: 0.1, own: 0.5 }),
  ownGapsMinSessions: 8,
  ownGapsWindowWeeks: 8,
  ownGapsMinPerSlot: 3,
  backToBackSlotHours: 24,
  sessionHours: 1,
  exposureWeightDivisor: 6,
  exposureWeightMin: 0.25,
  exposureWeightMax: 2,
  familyPenaltyTolerance: 0.05,
});

// ── Readiness (design 4.13, 4.14) ────────────────────────────────────────
export const READINESS = Object.freeze({
  recoveredFraction: 0.9,
  clockBand: 0.25,
});

// ── The learned recovery factor in the plan (design 4.4, 4.13; S F14) ────
export const LEARNED_FACTOR = Object.freeze({
  min: 0.75,
  max: 1.4,
  minMove: 0.1,
  minHistoryWeeks: 12,
  minMuscles: 3,
  slowerDirectCapFloor: 6,
});

// ── The objective (design 3) ─────────────────────────────────────────────
// growth(m) = 1.68 x sqrt(W(m)); marginal(m) = p(m) x 0.84 / sqrt(W(m)).
export const OBJECTIVE = Object.freeze({
  growthCoefficient: 1.68,
  marginalCoefficient: 0.84,
  roleWeight: Object.freeze({ focus: 1.5, standard: 1.0 }),
});

/**
 * Grade and source for every exported number, keyed by "GROUP.field".
 * Grouped muscle tables are keyed by the group alone.
 */
export const EVIDENCE = Object.freeze({
  'SETS_PER_EXERCISE.capCompound': { grade: 'CONV', source: 'Founder D8 (2026-07-09); no trial finds a ceiling at 3 or 4 sets of one exercise, 4 to 6 sets were not better than 2 to 3 (Krieger 2010) [S Q1, F1]' },
  'SETS_PER_EXERCISE.capIsolation': { grade: 'CONV', source: 'Founder D8 (2026-07-09) [S Q1, F1]' },
  'SETS_PER_EXERCISE.floor': { grade: 'A', source: 'More than one set per exercise beats one; 2 to 3 sets equivalent (Krieger 2010) [S Q1, F1]' },
  'SETS_PER_EXERCISE.floorInLowWeek': { grade: 'CONV', source: 'Lead ruling, D219 build: a recovery week or pull back keeps every exercise at one set or more' },
  'SETS_PER_EXERCISE.thinEquipmentBonus': { grade: 'CONV', source: 'D8 thin-equipment fallback, kept and shown (design 4.3)' },
  'PER_SESSION.directCap': { grade: 'CONV', source: "Remmert 2025's conversion of 11 fractional sets at the trials' average indirect share; bottom of RP's 8 to 12 (D) [S Q2, F2]" },
  'PER_SESSION.fractionalCap': { grade: 'A', source: 'Remmert 2025 (preprint, SportRxiv 537): no detectable extra benefit beyond about 11 fractional sets in one session, "not upper limits" [S Q2]' },
  'PER_SESSION.focusDirectCap': { grade: 'CONV', source: "Top of RP's 8 to 12; only when the rotation cannot give the focus muscle another session [S F2, F10, STOP 1]" },
  'PER_SESSION.focusFractionalCap': { grade: 'CONV', source: 'As focusDirectCap [S F10, STOP 12]' },
  EXERCISES_PER_MUSCLE_PER_SESSION: { grade: 'CONV', source: 'Design 4.3: three for chest, back and quads; two for the arms, delts, glutes, calves and abs; one for front delts and traps; two for hamstrings by lead ruling (a curl and a hinge, S F13), so a 4-day plan can reach the normal growth range' },
  EXERCISES_PER_MUSCLE_DEFAULT: { grade: 'CONV', source: 'Design 4.3: muscles not listed take one exercise a session' },
  'SESSION_CEILINGS.exercises': { grade: 'CONV', source: 'Founder D45 (2026-07-11): 8 exercises a session' },
  'SESSION_CEILINGS.workingSets': { grade: 'CONV', source: 'Founder D45 (2026-07-11): 25 working sets a session' },
  'COUNTING.synergistCredit': { grade: 'A', source: 'Fractional counting best supported of the three methods (Pelland 2026, 67 studies) [S Q2, F0]' },
  'WEEKLY_BANDS.maintenanceFrom': { grade: 'B', source: 'Maintenance 2 to 6 (Bickel 2011; Spiering 2021 and Iversen 2021, narrative, D) [S Q3b]' },
  'WEEKLY_BANDS.maintenanceTop': { grade: 'B', source: 'As maintenanceFrom [S Q3b]' },
  'WEEKLY_BANDS.normalFrom': { grade: 'A', source: 'Pelland 2026 tiers 5 to 10 and 11 to 18; Baz-Valle 2022 [S Q3b]' },
  'WEEKLY_BANDS.normalTop': { grade: 'A', source: 'As normalFrom [S Q3b]' },
  'WEEKLY_BANDS.focusTop': { grade: 'A', source: 'Pelland 2026 tier 19 to 29 (about 10.75 extra sets per detectable gain) [S Q3b]' },
  'WEEKLY_BANDS.studiedTop': { grade: 'A', source: 'Pelland 2026 tier 30 to 42; 43 or more: insufficient data [S Q3b]' },
  'ROLE_TARGETS.focus': { grade: 'A', source: 'Upper productive tier 20 to 24 a week, never planned above 30; climb 2 to 3 a week (Enes 2024, B) [S Q8, F10]' },
  'ROLE_TARGETS.standard': { grade: 'A', source: 'Normal growth up to 20; a beginner first block peaks at 14 (CONV) [S Q3, F3]' },
  'ROLE_TARGETS.maintenance': { grade: 'B', source: 'Maintenance 4 (2 to 6) [S Q3b, Q8]' },
  'ROLE_TARGETS.raised': { grade: 'CONV', source: 'A standard muscle raised by check-ins above 20, up to 24 (design 4.2, 4.10)' },
  'GROWTH_FLOOR.standard': { grade: 'A', source: 'Bottom of the normal growth band; weekly dose is A-graded, clocks D (design 4.14; S STOP 5)' },
  'GROWTH_FLOOR.focus': { grade: 'A', source: 'Bottom of the focus band (design 4.14)' },
  'BLOCK.weeks': { grade: 'CONV', source: 'The 6-week block stays; the evidence is neutral on block length (design 4.2)' },
  'BLOCK.peakWeek': { grade: 'CONV', source: 'Climb reaches the peak in week 5 (design 4.2)' },
  'BLOCK.week1BelowPeak': { grade: 'CONV', source: 'Week 1 starts at max(floors, peak - 8): a 4-week climb at +2 a week (design 4.2; S F11)' },
  'BLOCK.recoveryWeekShare': { grade: 'B', source: 'Recovery week at half the peak, load kept; scheduled deloads are not a growth lever (Coleman 2024) [S F11, F15]' },
  'BLOCK.rirLadder': { grade: 'A', source: 'Founder Q5 = A: heavy weeks one rep short of failure; failure adds at most a small growth edge (Refalo 2023, Robinson 2024) at a larger recovery cost (Vieira 2022) (design 4.14)' },
  'BLOCK.cutPhasePeakReduction': { grade: 'CONV', source: 'Aggressive cut: peak minus 2, kept as a convention (design 4.2)' },
  'RAMP.maxAboveLogged': { grade: 'B', source: 'Start from what the person did (Scarpelli 2022); no jump larger than the tested steps (Enes 2024) (design 4.4; S Q8)' },
  'RAMP.maxAboveStandardStartNoHistory': { grade: 'CONV', source: 'With no logged history, week 1 sits no more than 4 sets above the standard start (design 4.4)' },
  'RAMP.loggedWindowWeeks': { grade: 'CONV', source: 'Design 4.4: the last 4 weeks of logged sets' },
  'CHECKIN_STEPS.strong': { grade: 'B', source: 'Top of the steps tested: 6 sets every 2 weeks (Enes 2024) (design 4.10)' },
  'CHECKIN_STEPS.plannedClimb': { grade: 'B', source: 'Default weekly step +2 (Enes 2024) [S F11]' },
  'CHECKIN_STEPS.hold': { grade: 'CONV', source: 'A hold keeps the level (design 4.10)' },
  'CHECKIN_STEPS.pullBack': { grade: 'CONV', source: 'Pull back 2, not below maintenance (design 4.10)' },
  'FREQUENCY.preferTwoExposuresFromWeekly': { grade: 'CONV', source: 'Spread load from 12 weekly sets with 4 or more sessions (Ochi 2018); frequency itself does not change growth at equal volume (A) [S Q4, F4]' },
  'FREQUENCY.preferTwoExposuresMinSessions': { grade: 'CONV', source: 'As preferTwoExposuresFromWeekly' },
  'EXPOSURE.minDirect': { grade: 'B', source: 'Indirect-only exposures do not constrain the order (Soares 2015) [S Q6c R4]' },
  'EXPOSURE.minFractional': { grade: 'B', source: 'As minDirect [S Q6c R4]' },
  'HEAVY_LIGHT.lightDirectLow': { grade: 'INF', source: 'Design 4.5 step 2; the probe in design 4.14' },
  'HEAVY_LIGHT.lightDirectHigh': { grade: 'INF', source: 'Design 4.5 step 2' },
  'HEAVY_LIGHT.heavyDirectLow': { grade: 'INF', source: 'Design 4.5 step 2' },
  'HEAVY_LIGHT.heavyDirectHigh': { grade: 'INF', source: 'Design 4.5 step 2; the per-session direct cap' },
  'ROTATION.weights': { grade: 'CONV', source: 'Back to back 0.5, typical week 0.35, even week 0.15 [S F7]' },
  'ROTATION.weightsWithOwnGaps': { grade: 'CONV', source: "With the person's own gaps 0.25 / 0.15 / 0.10 / 0.5 (design 4.6)" },
  'ROTATION.ownGapsMinSessions': { grade: 'CONV', source: 'Own gaps once 8 sessions are logged in 8 weeks (design 4.6)' },
  'ROTATION.ownGapsWindowWeeks': { grade: 'CONV', source: "The person's own gaps are read from the last 8 weeks of sessions (design 4.6)" },
  'ROTATION.ownGapsMinPerSlot': { grade: 'CONV', source: 'Design 4.6: a slot needs 3 logged gaps' },
  'ROTATION.backToBackSlotHours': { grade: 'CONV', source: 'Back-to-back spacing: 24 hours a slot (design 4.6)' },
  'ROTATION.sessionHours': { grade: 'CONV', source: 'One hour taken off each gap for the session itself (design 4.6)' },
  'ROTATION.exposureWeightDivisor': { grade: 'CONV', source: 'w = clamp(F / 6, 0.25, 2) [S F7]' },
  'ROTATION.exposureWeightMin': { grade: 'CONV', source: 'As exposureWeightDivisor' },
  'ROTATION.exposureWeightMax': { grade: 'CONV', source: 'As exposureWeightDivisor' },
  'ROTATION.familyPenaltyTolerance': { grade: 'CONV', source: "Within 0.05 of the best family's penalty (design 4.5 step 4; S F12)" },
  'READINESS.recoveredFraction': { grade: 'CONV', source: "The screens' existing meaning of recovered: 90% of the last session's fatigue cleared (design 4.13)" },
  'READINESS.clockBand': { grade: 'CONV', source: 'No study gives the spread in trained lifters; every clock is shown plus or minus 25% [S Q5]' },
  'LEARNED_FACTOR.min': { grade: 'CONV', source: 'D210 bounds 0.75 to 1.40 [S F14]' },
  'LEARNED_FACTOR.max': { grade: 'CONV', source: 'D210 bounds [S F14]' },
  'LEARNED_FACTOR.minMove': { grade: 'CONV', source: 'Acts only after a move of 0.10 from the value the plan was built on [S F14]' },
  'LEARNED_FACTOR.minHistoryWeeks': { grade: 'CONV', source: 'S F14 safeguard: 12 weeks of history' },
  'LEARNED_FACTOR.minMuscles': { grade: 'CONV', source: 'S F14 safeguard: 3 or more muscles contribute' },
  'LEARNED_FACTOR.slowerDirectCapFloor': { grade: 'CONV', source: 'C_dir = max(6, floor(8 x min(1, 1 / factor))) [S F14]' },
  'OBJECTIVE.growthCoefficient': { grade: 'INF', source: 'Square-root dose-response fit (Pelland 2026, A) (design 3)' },
  'OBJECTIVE.marginalCoefficient': { grade: 'INF', source: 'Derivative of the square-root fit (design 3)' },
  'OBJECTIVE.roleWeight': { grade: 'CONV', source: 'Focus 1.5, standard 1.0: the plan intent enters only through role weights (design 3)' },
});

/** The per-exercise cap for a slot of this kind ('isolation' or anything else). */
export function exerciseCap(kind, thinEquipment = false) {
  const base = kind === 'isolation' ? SETS_PER_EXERCISE.capIsolation : SETS_PER_EXERCISE.capCompound;
  return thinEquipment ? base + SETS_PER_EXERCISE.thinEquipmentBonus : base;
}

/** At most this many exercises of a muscle in one session. */
export function exercisesAllowed(muscle) {
  return EXERCISES_PER_MUSCLE_PER_SESSION[muscle] ?? EXERCISES_PER_MUSCLE_DEFAULT;
}
