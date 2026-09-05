/**
 * D87 live record line.
 *
 * What this suite pins, and why each one matters:
 *  - the line NEVER claims a record that detectPR would not award on log
 *    (the screen must not promise a celebration it then withholds),
 *  - the three record types are named separately, because they do not move
 *    together: a heavier weight for fewer reps can be a heaviest-weight
 *    record while NOT being an estimated-max one,
 *  - the deliberate silences hold: warm-ups, non weight-and-reps schemas,
 *    and the first-ever set of an exercise (which beats nothing).
 */
import { buildRecordLine } from '../workoutRecordLine';
import { detectPR } from '../algorithms';

// A history where the best set is 90kg x 12 (est. max ~126kg).
// C10L re-anchor: this bar was ~128kg while calculate1RM blended Epley and
// Brzycki above 10 reps. The canonical model now uses Epley alone there, so
// the SAME raw history derives 90 x 1.4 = 126. Nothing about this suite's
// subject changed - the numbers are read-time derivations of unchanged set
// history, and the founder ruled that such surfaces may legitimately move
// rather than carry fabricated compatibility values.
const HISTORY = [
  { weight: 80, actualReps: 10 },
  { weight: 90, actualReps: 12 },
  { weight: 85, actualReps: 8 },
];

const base = { historySets: HISTORY, units: 'kg', exerciseType: 'weight_reps' };

describe('the bar to beat', () => {
  test('names the best set by estimated max, not merely the heaviest', () => {
    // 90x12 (est ~126) beats 85x8 and 80x10, and is also the heaviest here.
    expect(buildRecordLine({ ...base, weight: 90, reps: 12 }).bestLabel).toBe('Best 90kg × 12');
  });

  test('a half-plate best keeps its decimal', () => {
    const line = buildRecordLine({
      ...base,
      historySets: [{ weight: 92.5, actualReps: 10 }],
      weight: 60,
      reps: 5,
    });
    expect(line.bestLabel).toBe('Best 92.5kg × 10');
  });

  test('shows the bar but claims nothing before anything is dialled in', () => {
    const line = buildRecordLine({ ...base, weight: '', reps: '' });
    expect(line.isRecord).toBe(false);
    expect(line.bestLabel).toBe('Best 90kg × 12');
    expect(line.reasons).toEqual([]);
  });
});

describe('agreement with the celebration (the contract that matters)', () => {
  const entries = [
    [90, 12], [90, 13], [92.5, 10], [95, 8], [85, 12], [100, 1], [70, 20], [90, 11],
  ];

  for (const [weight, reps] of entries) {
    test(`${weight}kg x ${reps}: isRecord matches detectPR exactly`, () => {
      const line = buildRecordLine({ ...base, weight, reps });
      const prs = detectPR({ weight, actualReps: reps }, HISTORY, null, 'kg');
      expect(line.isRecord).toBe(prs.length > 0);
      // Every record detectPR found is named on the line.
      expect(line.reasons).toHaveLength(prs.length);
    });
  }

  test('matching your best exactly is not a record', () => {
    expect(buildRecordLine({ ...base, weight: 90, reps: 12 }).isRecord).toBe(false);
  });
});

describe('each record type is named, never a bare "PR"', () => {
  test('one more rep at the same weight reads as a reps record', () => {
    const line = buildRecordLine({ ...base, weight: 90, reps: 13 });
    expect(line.isRecord).toBe(true);
    expect(line.headline).toBe('New PR if you complete this set');
    expect(line.reasons.join(' · ')).toMatch(/Most reps at 90kg · Previous best 12 reps/);
  });

  test('a heavier weight for fewer reps is a heaviest-weight record and says so, WITHOUT claiming an estimated-max record it does not have', () => {
    // 92.5x10 -> est ~123kg (10 reps, so unchanged by C10L), which still
    // does NOT beat the 126kg best.
    const line = buildRecordLine({ ...base, weight: 92.5, reps: 10 });
    expect(line.isRecord).toBe(true);
    const joined = line.reasons.join(' · ');
    expect(joined).toMatch(/Heaviest weight yet · Previous best 90kg/);
    expect(joined).not.toMatch(/Est\. max/);
  });

  test('a genuinely bigger set names the estimated-max record with both numbers', () => {
    const line = buildRecordLine({ ...base, weight: 95, reps: 12 });
    expect(line.reasons.join(' · ')).toMatch(/Est\. max ~\d+kg · Previous best ~126kg/);
  });

  test('the spoken label carries the headline and every reason', () => {
    const line = buildRecordLine({ ...base, weight: 90, reps: 13 });
    expect(line.a11y).toContain('New PR if you complete this set');
    expect(line.a11y).toContain('Most reps at 90kg');
  });
});

describe('D150 copy contract: natural language, one pattern per line, never raw engine phrasing', () => {
  test('every record line reads "<what> · Previous best <number>", so they stack cleanly', () => {
    // 100x13 over a history whose heaviest set is 95x12: the estimated-max
    // AND heaviest-weight records fall together. Two is the most detectPR
    // can award at once (a heaviest weight has no prior set at that weight,
    // so a most-reps record cannot coincide with it); two records, two
    // lines, one shape.
    const history = [...HISTORY, { weight: 95, actualReps: 12 }];
    const line = buildRecordLine({ ...base, historySets: history, weight: 100, reps: 13 });
    expect(line.isRecord).toBe(true);
    expect(line.reasons).toHaveLength(2);
    for (const reason of line.reasons) {
      expect(reason).toMatch(/ · Previous best /);
    }
  });

  test('the reps line says what the number is', () => {
    // 90x13 is also an estimated-max record; the reps line is one of two.
    const line = buildRecordLine({ ...base, weight: 90, reps: 13 });
    expect(line.reasons).toContain('Most reps at 90kg · Previous best 12 reps');
  });

  test('none of the retired phrasing survives', () => {
    const line = buildRecordLine({ ...base, weight: 95, reps: 12 });
    const all = [line.headline, ...line.reasons].join(' ');
    expect(all).not.toMatch(/hit this|best is|beats|Heaviest ever/);
  });
});

describe('the deliberate silences', () => {
  test('a warm-up never chases a record', () => {
    expect(buildRecordLine({ ...base, weight: 200, reps: 20, isWarmup: true })).toBeNull();
  });

  test('the first-ever set of an exercise beats nothing, so there is no line', () => {
    expect(buildRecordLine({ ...base, historySets: [], weight: 100, reps: 10 })).toBeNull();
  });

  test('duration and distance schemas are silent (the weight field means something else there)', () => {
    for (const exerciseType of ['duration', 'distance', 'reps_only']) {
      expect(buildRecordLine({ ...base, exerciseType, weight: 500, reps: 60 })).toBeNull();
    }
  });

  test('weighted bodyweight behaves exactly like weight and reps', () => {
    const line = buildRecordLine({ ...base, exerciseType: 'weighted_bodyweight', weight: 90, reps: 13 });
    expect(line.isRecord).toBe(true);
  });

  test('history with no usable set yields no line rather than a fabricated bar', () => {
    expect(buildRecordLine({ ...base, historySets: [{ weight: 0, actualReps: 0 }], weight: 90, reps: 12 })).toBeNull();
  });
});

describe('EL-7: ballistic evidence class (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md)', () => {
  test('a ballistic set never produces a record line, same as a warm-up', () => {
    expect(buildRecordLine({ ...base, weight: 999, reps: 999, evidenceClass: 'ballistic' })).toBeNull();
    expect(buildRecordLine({ ...base, weight: 999, reps: 999, evidenceClass: 'circuit_ballistic' })).toBeNull();
  });

  test('a plain circuit set stays a full record candidate', () => {
    const line = buildRecordLine({ ...base, weight: 90, reps: 12, evidenceClass: 'circuit' });
    expect(line.bestLabel).toBe('Best 90kg × 12');
  });

  test('a ballistic row in HISTORY never sets the bar to beat', () => {
    const history = [
      { weight: 200, actualReps: 30, evidenceClass: 'ballistic' }, // would dominate if counted
      { weight: 90, actualReps: 12, evidenceClass: null },
    ];
    const line = buildRecordLine({ ...base, historySets: history, weight: 90, reps: 12 });
    expect(line.bestLabel).toBe('Best 90kg × 12');
  });
});

describe('history shape tolerance (rows arrive from the DB in snake_case too)', () => {
  test('actual_reps is read the same as actualReps', () => {
    const line = buildRecordLine({
      ...base,
      historySets: [{ weight: 90, actual_reps: 12 }],
      weight: 90,
      reps: 13,
    });
    expect(line.bestLabel).toBe('Best 90kg × 12');
    expect(line.isRecord).toBe(true);
  });
});
