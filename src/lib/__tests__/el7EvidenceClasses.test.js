/**
 * EL-7 evidence classes (docs/exercise-library-expansion-2026-09-05/
 * 05-DECISIONS.md; 06-EVIDENCE-CONSUMERS.md) - the comparability matrix,
 * pinned against the real consumers rather than a description of them:
 *
 *   - a ballistic set never produces an e1RM, a PR, a plateau, a volume
 *     set, or a load step;
 *   - a circuit set counts as volume and can be a PR, but never a trend,
 *     a learned range, a seed, or a structure verdict.
 */
const {
  isE1rmEligibleRow,
  isTrendEligibleRow,
  isBallisticEvidenceRow,
  detectPR,
  detectPlateau,
  calculateWeeklyVolume,
} = require('../algorithms');
const { resolveSetPrescription, assembleEvidencePacket } = require('../livePrescription');
const {
  sumCompletedSets,
  computeAchievedWeeklyPeak,
  isNonLearningEligibility,
  blockHasCircuitSetForMuscle,
} = require('../blockLedgerGather');
const { classifyMuscleBlock, buildBlockLedger, BLOCK_CLASS } = require('../interBlock');
const { computeLearnedRange } = require('../learnedRange');

const exercise = { id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] };
const exercisesById = new Map([['ex1', exercise]]);

// ─── isE1rmEligibleRow / isTrendEligibleRow / isBallisticEvidenceRow ───────

describe('EL-7 row classifiers', () => {
  test('ballistic and circuit_ballistic are never e1RM-eligible', () => {
    expect(isE1rmEligibleRow({ setType: 'straight', evidenceClass: 'ballistic' })).toBe(false);
    expect(isE1rmEligibleRow({ setType: 'straight', evidenceClass: 'circuit_ballistic' })).toBe(false);
  });

  test('a plain circuit set stays e1RM-eligible (PR detection still counts it)', () => {
    expect(isE1rmEligibleRow({ setType: 'straight', evidenceClass: 'circuit' })).toBe(true);
  });

  test('conventional (null evidence_class) stays eligible', () => {
    expect(isE1rmEligibleRow({ setType: 'straight', evidenceClass: null })).toBe(true);
  });

  test('isTrendEligibleRow excludes circuit even though isE1rmEligibleRow accepts it', () => {
    const circuitRow = { setType: 'straight', evidenceClass: 'circuit' };
    expect(isE1rmEligibleRow(circuitRow)).toBe(true);
    expect(isTrendEligibleRow(circuitRow)).toBe(false);
  });

  test('isTrendEligibleRow excludes ballistic too (inherits isE1rmEligibleRow)', () => {
    expect(isTrendEligibleRow({ setType: 'straight', evidenceClass: 'ballistic' })).toBe(false);
  });

  test('isBallisticEvidenceRow matches ballistic and circuit_ballistic only', () => {
    expect(isBallisticEvidenceRow({ evidenceClass: 'ballistic' })).toBe(true);
    expect(isBallisticEvidenceRow({ evidenceClass: 'circuit_ballistic' })).toBe(true);
    expect(isBallisticEvidenceRow({ evidenceClass: 'circuit' })).toBe(false);
    expect(isBallisticEvidenceRow({ evidenceClass: null })).toBe(false);
  });
});

// ─── PR detection ───────────────────────────────────────────────────────────

describe('EL-7 PR detection', () => {
  test('a ballistic set never produces a PR (no eligible history to beat, and it cannot itself count)', () => {
    const history = [{ setType: 'straight', weight: 20, actualReps: 10, evidenceClass: null }];
    const ballisticSet = { setType: 'straight', weight: 24, actualReps: 20, evidenceClass: 'ballistic' };
    expect(detectPR(ballisticSet, history, exercise)).toEqual([]);
  });

  test('a circuit set CAN be a PR (CAP-14 precedent: a PR is a PR)', () => {
    const history = [{ setType: 'straight', weight: 20, actualReps: 8, evidenceClass: null }];
    const circuitSet = { setType: 'straight', weight: 30, actualReps: 8, evidenceClass: 'circuit' };
    const prs = detectPR(circuitSet, history, exercise);
    expect(prs.some((p) => p.type === 'heaviest_weight')).toBe(true);
  });
});

// ─── Plateau / trend ────────────────────────────────────────────────────────

describe('EL-7 plateau/trend exclusion', () => {
  test('circuit-only sessions never qualify as plateau evidence', () => {
    const circuitSession = [{ setType: 'straight', weight: 30, actualReps: 8, evidenceClass: 'circuit', createdAt: 1 }];
    const sessions = [circuitSession, circuitSession, circuitSession, circuitSession];
    expect(detectPlateau(sessions).plateau).toBe(false);
    expect(detectPlateau(sessions).sessions).toBe(0);
  });
});

// ─── Per-muscle volume ──────────────────────────────────────────────────────

describe('EL-7 per-muscle volume', () => {
  const exerciseMap = { ex1: exercise };

  test('a ballistic set does not count toward per-muscle set volume', () => {
    const sets = [{ exerciseId: 'ex1', setType: 'straight', actualReps: 20, weight: 16, evidenceClass: 'ballistic' }];
    const vol = calculateWeeklyVolume(sets, exerciseMap);
    expect(vol.quads).toBeUndefined();
  });

  test('a circuit set DOES count toward per-muscle set volume', () => {
    const sets = [{ exerciseId: 'ex1', setType: 'straight', actualReps: 10, weight: 40, evidenceClass: 'circuit' }];
    const vol = calculateWeeklyVolume(sets, exerciseMap);
    expect(vol.quads.workingSets).toBe(1);
  });

  test('a conventional set counts exactly as before (no regression)', () => {
    const sets = [{ exerciseId: 'ex1', setType: 'straight', actualReps: 10, weight: 40, evidenceClass: null }];
    const vol = calculateWeeklyVolume(sets, exerciseMap);
    expect(vol.quads.workingSets).toBe(1);
  });
});

// ─── Block ledger achieved volume ───────────────────────────────────────────

describe('EL-7 block ledger achieved volume', () => {
  test('sumCompletedSets excludes ballistic, counts circuit', () => {
    const sets = [
      { exerciseId: 'ex1', actualReps: 20, evidenceClass: 'ballistic' },
      { exerciseId: 'ex1', actualReps: 10, evidenceClass: 'circuit' },
    ];
    expect(sumCompletedSets(sets, exercisesById, 'quads')).toBe(1); // only the circuit row credits
  });

  test('computeAchievedWeeklyPeak excludes ballistic rows from the peak week', () => {
    const now = Date.UTC(2026, 0, 5);
    const sets = [
      { exerciseId: 'ex1', actualReps: 20, evidenceClass: 'ballistic', createdAt: now },
      { exerciseId: 'ex1', actualReps: 10, evidenceClass: 'circuit', createdAt: now },
    ];
    const peak = computeAchievedWeeklyPeak({
      sets, exercisesById, muscle: 'quads', blockStart: Date.UTC(2026, 0, 1), blockWeeks: 4, deloadWeekIndex: 4,
    });
    expect(peak).toBe(1);
  });

  test('blockHasCircuitSetForMuscle finds a credited circuit row and ignores ballistic-only', () => {
    expect(blockHasCircuitSetForMuscle(
      [{ exerciseId: 'ex1', evidenceClass: 'circuit' }], exercisesById, 'quads',
    )).toBe(true);
    expect(blockHasCircuitSetForMuscle(
      [{ exerciseId: 'ex1', evidenceClass: 'ballistic' }], exercisesById, 'quads',
    )).toBe(false);
  });
});

// ─── Ledger eligibility / classification (interBlock, EL-7 extends CC30) ───

describe('EL-7 ledger eligibility skip set', () => {
  test('isNonLearningEligibility covers constrained and circuit only', () => {
    expect(isNonLearningEligibility('constrained')).toBe(true);
    expect(isNonLearningEligibility('circuit')).toBe(true);
    expect(isNonLearningEligibility('normal')).toBe(false);
    expect(isNonLearningEligibility(undefined)).toBe(false);
  });

  test('classifyMuscleBlock treats eligibility:circuit as INSUFFICIENT_DATA, honest rationale', () => {
    const result = classifyMuscleBlock({
      muscle: 'quads', eligibility: 'circuit', landmarks: { mev: 8, mav: 16, mrv: 22 },
    }, {});
    expect(result.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
    expect(result.rationale).toMatch(/circuit/);
  });

  test("buildBlockLedger preserves a 'circuit' eligibility stamp on the stored entry", () => {
    const ledger = buildBlockLedger({ muscles: [{ muscle: 'quads', eligibility: 'circuit' }] });
    expect(ledger.entries[0].eligibility).toBe('circuit');
  });

  test("buildBlockLedger still collapses anything else to 'normal'", () => {
    const ledger = buildBlockLedger({ muscles: [{ muscle: 'quads', eligibility: 'bogus' }] });
    expect(ledger.entries[0].eligibility).toBe('normal');
  });
});

describe('EL-7 learnedRange skip', () => {
  test('a circuit-eligibility ledger entry never enters the learned range fold', () => {
    const circuitEntry = {
      classification: BLOCK_CLASS.RESPONSIVE,
      eligibility: 'circuit',
      confidence: 0.9,
      observed: { startSets: 10, achievedPeak: 14, suppressed: false },
      proposal: {},
    };
    const learned = computeLearnedRange({
      prior: { mev: 8, mav: 16 }, researchMev: 8, adaptedMrv: null,
      ledgerHistory: [circuitEntry], muscle: 'quads',
    });
    expect(learned.isLearned).toBe(false);
  });
});

// ─── livePrescription: never structure or capability evidence ─────────────

describe('EL-7 livePrescription exclusion', () => {
  test('a row with a non-null evidence_class contributes no capability/structure evidence', () => {
    const rawToday = [
      { exerciseId: 'ex1', weight: 20, actualReps: 10, setType: 'straight', evidenceClass: 'circuit', setNumber: 1 },
      { exerciseId: 'ex1', weight: 20, actualReps: 10, setType: 'straight', evidenceClass: null, setNumber: 2 },
    ];
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps' },
      prescription: { repsMin: 8, repsMax: 12 },
      rawHistory: [],
      rawToday,
    });
    expect(packet.today.working).toHaveLength(1);
    expect(packet.today.working[0].pos).toBe(2);
  });

  test('EL-10: no automatic load-step suggestion for a circuit position (history only)', () => {
    const packet = {
      exercise: { exerciseType: 'weight_reps', category: 'compound' },
      prescription: { repsMin: 8, repsMax: 12, startingWeight: null },
      history: [{ at: 1, difficulty: 3, comparable: true, band: { min: 8, max: 12 }, topLoad: 40, topReps: 10 }],
      today: { working: [], overrideLoad: null, overrideReps: null },
      senior: {},
    };
    const result = resolveSetPrescription(packet, { index: 1, setType: 'straight', evidenceClass: 'circuit' });
    expect(result.provenance).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.prefill).toBe(false);
  });
});

// EL-7 follow-up (lead, 2026-09-05): the exercise detail screen computes
// its own chart series, PR list and per-session e1RM inline. Written to
// FAIL if any of those three sites goes back to a warm-up-only filter,
// which would let a ballistic kettlebell set fabricate an e1RM or a PR
// on the one screen that shows them most prominently.
describe('EL-7: ExerciseDetailScreen inline e1RM sites honour evidence classes', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.resolve(__dirname, '../../screens/ExerciseDetailScreen.js'), 'utf8');
  test('imports the shared predicates', () => {
    expect(src).toMatch(/isBallisticEvidenceRow, isTrendEligibleRow \} from '\.\.\/lib\/algorithms'/);
  });
  test('the chart series and the working-set dates use the trend predicate', () => {
    expect(src).toMatch(/if \(!isTrendEligibleRow\(s\)\) continue;/);
    expect(src).toMatch(/&& isTrendEligibleRow\(s\)\s*\n\s*&& \(s\.exerciseId \?\? s\.exercise_id\) === exerciseId/);
  });
  test('the PR list and the session e1RM exclude ballistic rows', () => {
    expect(src).toMatch(/!== 'warmup' && !isBallisticEvidenceRow\(s\) && \(s\.weight \|\| 0\) > 0/);
    expect(src).toMatch(/const e1rmSets = sessionSets\.filter\(s => !isBallisticEvidenceRow\(s\)\);/);
  });
});
