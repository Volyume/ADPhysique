/**
 * programmeStructureMemory.production.test.js — Campaign 18 adversarial
 * closure, job A.
 *
 * WHY THIS SUITE EXISTS, stated plainly because it is the whole point.
 *
 * The structure memory shipped with a reader that asked each stored block for
 * `completedAt` and `status === 'completed'`, and each stored ledger for
 * `productive`, `structuralProblem` and `recoveryAcceptable`. NOT ONE of
 * those six fields is written anywhere in this app: `mesocycles` has no
 * completed_at column, its `status` column is inserted with its DEFAULT
 * 'active' and never updated again, and interBlock.buildBlockLedger writes
 * per-MUSCLE entries rather than block-level verdicts. So every real
 * athlete's history read as "not completed, not productive" and no structure
 * could ever be demonstrated. The feature was unreachable.
 *
 * The pure suite passed the entire time, because it handed the pure functions
 * block shapes that production never produces. So this suite refuses to build
 * its own. Every ledger here comes out of the REAL interBlock.buildBlockLedger
 * wrapped exactly as blockLedgerRunner wraps it, every mesocycle row carries
 * the columns database.js actually stores (status 'active' and no
 * completedAt, deliberately), and every assertion runs through the real
 * readDemonstratedStructure and the real generatePlan.
 *
 * REAL HISTORY -> REAL DECISION -> REAL FUTURE CONSEQUENCE.
 */
jest.mock('../database', () => ({
  getAllMesocycles: jest.fn(),
  getBlockTrainingData: jest.fn(),
}));

import { buildBlockLedger } from '../interBlock';
import { structureSignature } from '../programmeEpoch';
import { readDemonstratedStructure } from '../planAutoGen';
import { generatePlan } from '../planEngine';
import { blockCompletionState, BLOCK_COMPLETION } from '../mesocycle';

// eslint-disable-next-line global-require
const mockDb = require('../database');

const DAY_MS = 24 * 60 * 60 * 1000;
const BLOCK_WEEKS = 6;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * One muscle's inputs in the shape blockLedgerRunner assembles them, tuned
 * only by the two things that decide the quadrant: whether strength moved,
 * and how much recovery it cost. Everything else clears interBlock's
 * INSUFFICIENT_DATA gates the way a properly run block does.
 */
const muscleInput = (muscle, { slope, strain = 0 }) => ({
  muscle,
  landmarks: { mev: 8, mav: 16, mrv: 20 },
  researchMev: 8,
  previousStart: 10,
  plannedPeak: 16,
  achievedPeak: 16,
  priorFlatBlocks: 0,
  manualOverride: false,
  adherence: { completedSets: 90, plannedSets: 100 },
  performance: {
    e1rmSlopePct: slope, confidence: 0.9, eligibleExposures: 8,
    prDensity: 0.2, rawPrCount: 2, discontinuity: false,
  },
  recovery: {
    sorenessLateAvg: strain >= 1 ? 4.5 : 2,
    jointDiscomfortAvg: strain >= 2 ? 3.5 : 1,
    readinessSlope: 0, sleepFlaggedWeeks: 0,
    deloadFlagFired: false, deloadFlagMidBlock: false, dataPoints: 8,
  },
});

const RESPONSIVE = (m) => muscleInput(m, { slope: 3 });
const STALE = (m) => muscleInput(m, { slope: 0 });
const STRAINED = (m) => muscleInput(m, { slope: 0, strain: 2 });
/** Adherence under interBlock's own floor: the dose was never delivered. */
const UNJUDGEABLE = (m) => ({
  ...muscleInput(m, { slope: 3 }),
  adherence: { completedSets: 10, plannedSets: 100 },
});

const daysFor = (splitType, dayCount) => Array.from({ length: dayCount }, (_, i) => ({
  name: `${splitType} day ${i + 1}`,
  exercises: [{ exerciseId: `ex_${splitType}_${i}_a` }, { exerciseId: `ex_${splitType}_${i}_b` }],
}));

/**
 * A stored mesocycle row, exactly as `rowToCamel` hands one back: `status`
 * still on its insert-time default, no completedAt column at all, and the
 * ledger a JSON string on `blockLedger`.
 */
function storedBlock({
  index, splitType = 'upper_lower', dayCount = 4,
  muscles, abandoned = false, signature,
}) {
  const start = Date.UTC(2025, 0, 6) + index * BLOCK_WEEKS * 7 * DAY_MS;
  const plannedEnd = start + BLOCK_WEEKS * 7 * DAY_MS;
  const ledger = buildBlockLedger({
    muscles, systemic: {}, suppressed: false, weeksSinceBlockEnd: 0,
  });
  const record = {
    ...ledger,
    mesocycleId: `meso_${index}`,
    mesocycleName: `Block ${index + 1}`,
    programmeSignature: signature === null ? null : (signature ?? structureSignature({
      splitType, workouts: daysFor(splitType, dayCount),
    })),
    blockStartDate: ymd(start),
    blockEndDate: ymd(plannedEnd),
    computedAt: start,
  };
  return {
    id: `meso_${index}`,
    userId: 'u1',
    name: `Block ${index + 1}`,
    startDate: ymd(start),
    // `endActiveMesocycles` truncates the live block's end_date to TODAY when
    // the athlete switches away. An abandoned block is that, and nothing else.
    endDate: ymd(abandoned ? start + 10 * DAY_MS : plannedEnd),
    plannedWeeks: BLOCK_WEEKS,
    durationWeeks: BLOCK_WEEKS,
    deloadWeek: BLOCK_WEEKS,
    isActive: 0,
    status: 'active',
    createdAt: start,
    blockLedger: JSON.stringify(record),
  };
}

/** Sessions actually logged, against the block's planned weeks x days. */
function setHistory(rows, { sessionsPerBlock = BLOCK_WEEKS * 4 - 2 } = {}) {
  mockDb.getAllMesocycles.mockResolvedValue(rows);
  mockDb.getBlockTrainingData.mockImplementation(async () => ({
    workouts: Array.from({ length: sessionsPerBlock }, (_, i) => ({ id: `w${i}` })),
    sets: [],
  }));
}

const PRODUCTIVE_BODY = [RESPONSIVE('chest'), RESPONSIVE('back'), RESPONSIVE('quads'), STALE('calves')];
const FLAT_BODY = [STALE('chest'), STALE('back'), STALE('quads'), STALE('calves')];
const BURIED_BODY = [STRAINED('chest'), STRAINED('back'), STRAINED('quads'), STALE('calves')];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('THE FALSE DELIVERY: the fields the reader used to want do not exist', () => {
  test('a real stored block has no completedAt, no status change, and no block-level verdicts', () => {
    const row = storedBlock({ index: 0, muscles: PRODUCTIVE_BODY });
    // The row, as the database hands it back.
    expect(row.completedAt).toBeUndefined();
    expect(row.status).toBe('active');
    // The ledger, as interBlock actually writes it.
    const ledger = JSON.parse(row.blockLedger);
    expect(ledger.productive).toBeUndefined();
    expect(ledger.structuralProblem).toBeUndefined();
    expect(ledger.recoveryAcceptable).toBeUndefined();
    // What it DOES contain: Campaign 16's own per-muscle verdicts.
    expect(ledger.entries.map((e) => e.classification)).toEqual([
      'RESPONSIVE', 'RESPONSIVE', 'RESPONSIVE', 'STALE',
    ]);
  });

  test('and the block IS completed, judged on what the row actually records', () => {
    const row = storedBlock({ index: 0, muscles: PRODUCTIVE_BODY });
    expect(blockCompletionState(row)).toBe(BLOCK_COMPLETION.COMPLETED);
    expect(blockCompletionState(storedBlock({ index: 0, muscles: PRODUCTIVE_BODY, abandoned: true })))
      .toBe(BLOCK_COMPLETION.ABANDONED);
  });

  test('THE PATH IS REACHABLE: three productive completed blocks demonstrate a structure', async () => {
    setHistory([0, 1, 2].map((index) => storedBlock({ index, muscles: PRODUCTIVE_BODY })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toEqual({
      splitType: 'upper_lower', dayCount: 4, blocks: 3, productive: 3,
      because: 'demonstrated_over_completed_blocks',
    });
  });
});

describe('AND IT WAS NOT WEAKENED TO GET THERE', () => {
  test('a history of FLAT blocks demonstrates nothing, however completed they are', async () => {
    setHistory([0, 1, 2, 3].map((index) => storedBlock({ index, muscles: FLAT_BODY })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('a history the ledger could not judge demonstrates nothing', async () => {
    setHistory([0, 1, 2, 3].map((index) => storedBlock({
      index, muscles: [UNJUDGEABLE('chest'), UNJUDGEABLE('back'), UNJUDGEABLE('quads')],
    })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('two good blocks are not three: the minimum is a real threshold', async () => {
    setHistory([0, 1].map((index) => storedBlock({ index, muscles: PRODUCTIVE_BODY })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('A BLOCK THE ATHLETE LEFT IS NOT A COMPLETED BLOCK', async () => {
    setHistory([
      storedBlock({ index: 0, muscles: PRODUCTIVE_BODY }),
      storedBlock({ index: 1, muscles: PRODUCTIVE_BODY }),
      storedBlock({ index: 2, muscles: PRODUCTIVE_BODY, abandoned: true }),
    ]);
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('a block that was barely RUN says nothing about the structure it was written on', async () => {
    setHistory([0, 1, 2].map((index) => storedBlock({ index, muscles: PRODUCTIVE_BODY })), {
      sessionsPerBlock: 6, // 6 of 24 planned
    });
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('a ledger with no programme signature cannot identify a structure to learn', async () => {
    setHistory([0, 1, 2].map((index) => storedBlock({
      index, muscles: PRODUCTIVE_BODY, signature: null,
    })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeNull();
  });

  test('CURRENT CONSTRAINTS STAY SENIOR: four demonstrated days do not answer three', async () => {
    setHistory([0, 1, 2].map((index) => storedBlock({ index, muscles: PRODUCTIVE_BODY })));
    await expect(readDemonstratedStructure('u1', 4)).resolves.toBeTruthy();
    await expect(readDemonstratedStructure('u1', 3)).resolves.toBeNull();
  });
});

describe('FAILURE IS REMEMBERED TOO, and attributed conservatively', () => {
  test('a structure that repeatedly buried a properly-training athlete is not proposed back', async () => {
    setHistory([0, 1, 2, 3].map((index) => storedBlock({
      index, splitType: 'ppl', dayCount: 6,
      muscles: index < 3 ? BURIED_BODY : PRODUCTIVE_BODY,
    })));
    await expect(readDemonstratedStructure('u1', 6)).resolves.toBeNull();
  });

  test('BUT the same bad blocks are NOT blamed on the split when the athlete barely trained', async () => {
    // Identical ledgers. The only difference is that the sessions did not
    // happen, so nothing may be attributed to the shape of the week - and,
    // because an unrun block is not evidence either way, the structure simply
    // has no history rather than a bad one.
    const rows = [0, 1, 2, 3].map((index) => storedBlock({
      index, splitType: 'ppl', dayCount: 6, muscles: BURIED_BODY,
    }));
    setHistory(rows, { sessionsPerBlock: 8 }); // 8 of 36
    // eslint-disable-next-line global-require
    const { blockOutcomeFromLedger } = require('../programmeStructureMemory');
    const ledger = JSON.parse(rows[0].blockLedger);
    expect(blockOutcomeFromLedger(ledger, { executionGood: true }).structuralProblem).toBe(true);
    expect(blockOutcomeFromLedger(ledger, { executionGood: false }).structuralProblem).toBe(false);
    await expect(readDemonstratedStructure('u1', 6)).resolves.toBeNull();
  });
});

describe('REAL FUTURE CONSEQUENCE: the memory changes the programme that gets built', () => {
  const base = {
    experience: 'intermediate', daysPerWeek: 5, sessionLengthMinutes: 60,
    equipment: 'full_gym', recoveryRating: 'average', goal: 'general',
  };

  test('history -> readDemonstratedStructure -> generatePlan builds the demonstrated split', async () => {
    setHistory([0, 1, 2].map((index) => storedBlock({
      index, splitType: 'ppl', dayCount: 5, muscles: PRODUCTIVE_BODY,
    })));
    const memory = await readDemonstratedStructure('u1', 5);
    expect(memory).toEqual({
      splitType: 'ppl', dayCount: 5, blocks: 3, productive: 3,
      because: 'demonstrated_over_completed_blocks',
    });

    const template = generatePlan(base);
    const personal = generatePlan({ ...base, demonstratedStructure: memory });
    // The default for this athlete is NOT what their history demonstrated,
    // so the memory is genuinely what decided it.
    expect(template.splitType).toBe('balanced_ul');
    expect(personal.splitType).toBe('ppl');
    expect(personal.workouts.length).toBe(5);
  });

  test('and a new athlete gets the template split, with no memory invented', async () => {
    setHistory([]);
    const memory = await readDemonstratedStructure('u1', 5);
    expect(memory).toBeNull();
    expect(generatePlan({ ...base, demonstratedStructure: memory }).splitType)
      .toBe(generatePlan(base).splitType);
  });

  test('a read failure means no memory, never a blocked rebuild', async () => {
    mockDb.getAllMesocycles.mockRejectedValue(new Error('db down'));
    await expect(readDemonstratedStructure('u1', 5)).resolves.toBeNull();
  });
});
