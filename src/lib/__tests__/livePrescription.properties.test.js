/**
 * livePrescription.properties.test.js — Stage 14 adversarial/property tests
 * (design doc §20 "Replay / determinism tests" + the campaign brief's
 * explicit Stage 14 list). Pins invariants that must hold over WHOLE CLASSES
 * of input, not single fixtures: determinism, insensitivity to irrelevant
 * evidence and row ordering, senior states never making the prescription
 * more aggressive, the Ruling 2 senior gate under every recovery state,
 * Law G override precedence, and the confidence/aggressiveness monotonicity
 * invariant. Also carries the module's purity guards (house convention —
 * see blockWeekResolver.test.js's source-level single-resolver guard).
 */

const fs = require('fs');
const path = require('path');

const {
  assembleEvidencePacket,
  resolveSetPrescription,
  PROVENANCE,
} = require('../livePrescription');

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

// Deterministic PRNG (mulberry32) — fixed seed, no Math.random anywhere in
// this suite or in the module under test.
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1' }) {
  return { exerciseId, setType, weight, actualReps: reps, setNumber: pos, targetRepsMin, targetRepsMax, createdAt: at };
}

function randSession(rng, at) {
  const n = 1 + Math.floor(rng() * 3);
  const sets = [];
  for (let i = 0; i < n; i++) {
    sets.push(row({
      weight: Math.round((40 + rng() * 60) * 4) / 4,
      reps: 6 + Math.floor(rng() * 10),
      pos: i + 1,
      at: at + i * 1000,
    }));
  }
  return { at, difficulty: 1 + Math.floor(rng() * 5), sets };
}

function packet(overrides = {}) {
  return assembleEvidencePacket({
    exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
    prescription: { repsMin: 8, repsMax: 12 },
    now: NOW,
    ...overrides,
  });
}

// ── Determinism ──────────────────────────────────────────────────────────

describe('determinism: same packet in -> byte-identical prescription out', () => {
  test('over a fuzz set of generated packets (fixed seed 42, 40 trials)', () => {
    const rng = mulberry32(42);
    for (let trial = 0; trial < 40; trial++) {
      const rawHistory = [randSession(rng, NOW - 7 * DAY), randSession(rng, NOW - 14 * DAY), randSession(rng, NOW - 21 * DAY)];
      const p = packet({ rawHistory });
      for (const pos of [1, 2, 3]) {
        const a = resolveSetPrescription(p, pos);
        const b = resolveSetPrescription(p, pos);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });
});

// ── Insensitivity to irrelevant/ineligible evidence ────────────────────────

describe('adding an irrelevant/ineligible historical row never changes the output', () => {
  const cleanHist = [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 7 * DAY })] }];

  test.each(['warmup', 'dropset', 'myo_reps', 'rest_pause'])('injecting a %s row', (setType) => {
    const noisyHist = [{
      at: NOW - 7 * DAY,
      difficulty: 2,
      sets: [
        row({ weight: 999, reps: 1, setType, pos: 5, at: NOW - 7 * DAY - 1000 }),
        row({ weight: 80, reps: 12, pos: 1, at: NOW - 7 * DAY }),
      ],
    }];
    const clean = resolveSetPrescription(packet({ rawHistory: cleanHist }), 1);
    const noisy = resolveSetPrescription(packet({ rawHistory: noisyHist }), 1);
    expect(JSON.stringify(noisy)).toBe(JSON.stringify(clean));
  });

  test('injecting a malformed row (negative weight, null reps)', () => {
    const noisyHist = [{
      at: NOW - 7 * DAY,
      difficulty: 2,
      sets: [
        row({ weight: -5, reps: 3, pos: 6, at: NOW - 7 * DAY - 1000 }),
        row({ weight: 80, reps: null, pos: 7, at: NOW - 7 * DAY - 500 }),
        row({ weight: 80, reps: 12, pos: 1, at: NOW - 7 * DAY }),
      ],
    }];
    const clean = resolveSetPrescription(packet({ rawHistory: cleanHist }), 1);
    const noisy = resolveSetPrescription(packet({ rawHistory: noisyHist }), 1);
    expect(JSON.stringify(noisy)).toBe(JSON.stringify(clean));
  });
});

// ── Row-order insensitivity ────────────────────────────────────────────────

describe('reordering history rows (same identity/timestamps) never changes the output', () => {
  test('over a fuzz set of shuffled session/row orders (fixed seed 7)', () => {
    const rng = mulberry32(7);
    for (let trial = 0; trial < 15; trial++) {
      const s1 = randSession(rng, NOW - 7 * DAY);
      const s2 = randSession(rng, NOW - 14 * DAY);
      const inOrder = packet({ rawHistory: [s1, s2] });
      const reversedSessions = packet({ rawHistory: [s2, s1] });
      const reversedRows = packet({
        rawHistory: [{ ...s1, sets: [...s1.sets].reverse() }, { ...s2, sets: [...s2.sets].reverse() }],
      });
      const a = resolveSetPrescription(inOrder, 1);
      const b = resolveSetPrescription(reversedSessions, 1);
      const c = resolveSetPrescription(reversedRows, 1);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      expect(JSON.stringify(c)).toBe(JSON.stringify(a));
    }
  });
});

// ── Senior recovery flags never increase aggressiveness ────────────────────

describe('introducing any senior recovery flag never makes the prescription MORE aggressive', () => {
  const seniorFlags = [
    { label: 'isDeload+deloadTargets', senior: (base) => ({ isDeload: true, deloadTargets: [{ weight: base * 0.5, reps: 6 }] }) },
    { label: 'reEntryEaseActive', senior: () => ({ reEntryEaseActive: true, readinessTweak: { reduces: true, loadFactor: 0.95, because: 'athlete_reentry_choice' } }) },
    { label: 'readinessReductionActive', senior: () => ({ readinessReductionActive: true, readinessTweak: { reduces: true, loadFactor: 0.95 } }) },
    { label: 'layoffDays>7', senior: () => ({ layoffDays: 10 }) },
    { label: 'blockFinished', senior: () => ({ blockFinished: true }) },
  ];

  test.each(seniorFlags)('$label: weight and repsTarget never exceed the un-flagged baseline', ({ senior }) => {
    const rng = mulberry32(123);
    for (let trial = 0; trial < 15; trial++) {
      const rawHistory = [randSession(rng, NOW - 7 * DAY), randSession(rng, NOW - 14 * DAY)];
      const baseline = resolveSetPrescription(packet({ rawHistory }), 1);
      const flagged = resolveSetPrescription(packet({ rawHistory, senior: senior(baseline.weight || 80) }), 1);
      if (baseline.weight != null && flagged.weight != null) {
        expect(flagged.weight).toBeLessThanOrEqual(baseline.weight + 1e-9);
      }
      if (Number.isFinite(baseline.repsTarget) && Number.isFinite(flagged.repsTarget)) {
        expect(flagged.repsTarget).toBeLessThanOrEqual(baseline.repsTarget);
      }
    }
  });
});

// ── Ruling 2: overshoot under EACH senior state -> no load add ─────────────

describe('Founder Ruling 2 (ABSOLUTE): overshoot under a senior state never adds load', () => {
  const overshootFixture = () => ({
    rawHistory: [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 10, at: NOW - 7 * DAY })] }],
    rawToday: [row({ weight: 80, reps: 14, pos: 1, at: NOW })], // repsMax(12)+2 overshoot
  });

  test('deload/recovery', () => {
    const rx = resolveSetPrescription(packet({ ...overshootFixture(), senior: { isDeload: true } }), 2);
    expect(rx.provenance).not.toBe(PROVENANCE.CURRENT_SESSION_STRONGER);
    expect(rx.weight).toBeLessThanOrEqual(80);
  });

  test('re-entry easing', () => {
    const rx = resolveSetPrescription(packet({ ...overshootFixture(), senior: { reEntryEaseActive: true } }), 2);
    expect(rx.provenance).not.toBe(PROVENANCE.CURRENT_SESSION_STRONGER);
    expect(rx.weight).toBeLessThanOrEqual(80);
  });

  test('active readiness reduction', () => {
    const rx = resolveSetPrescription(packet({ ...overshootFixture(), senior: { readinessReductionActive: true } }), 2);
    expect(rx.provenance).not.toBe(PROVENANCE.CURRENT_SESSION_STRONGER);
    expect(rx.weight).toBeLessThanOrEqual(80);
  });
});

// ── Law G: override wins for every later position ──────────────────────────

describe('user override -> every later position prescribes at the user\'s load', () => {
  test('holds for positions 2 through 5, regardless of history', () => {
    const rawHistory = [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 7 * DAY })] }];
    const p = packet({ rawHistory, overrideLoad: 60 });
    for (const pos of [2, 3, 4, 5]) {
      const rx = resolveSetPrescription(p, pos);
      expect(rx.weight).toBe(60);
      expect(rx.provenance).toBe(PROVENANCE.USER_CHOICE_RESPECTED);
    }
  });
});

// ── Confidence monotonicity ─────────────────────────────────────────────────

describe('lower confidence never produces a load add that the same evidence at higher confidence would not', () => {
  test('single-session (medium) topped evidence advances by no more than the two-session (high) case', () => {
    const oneSession = packet({
      rawHistory: [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 7 * DAY })] }],
    });
    const twoSessions = packet({
      rawHistory: [
        { at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 7 * DAY })] },
        { at: NOW - 14 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 14 * DAY })] },
      ],
    });
    const rxOne = resolveSetPrescription(oneSession, 1);
    const rxTwo = resolveSetPrescription(twoSessions, 1);
    expect(rxOne.confidence).toBe('medium');
    expect(rxTwo.confidence).toBe('high');
    expect(rxOne.weight).toBeLessThanOrEqual(rxTwo.weight);
  });

  test('zero comparable history (low) never adds load that thin-but-real evidence (medium) would not', () => {
    const zeroHistory = packet({}); // FIRST_TIME_BAND, weight null or startingWeight only
    const thin = packet({
      rawHistory: [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 80, reps: 12, at: NOW - 7 * DAY })] }],
    });
    const rxZero = resolveSetPrescription(zeroHistory, 1);
    const rxThin = resolveSetPrescription(thin, 1);
    expect(rxZero.confidence).toBe('low');
    expect(rxThin.confidence).toBe('medium');
    expect(rxZero.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });
});

// ── Purity guards (house convention) ────────────────────────────────────────

describe('purity: livePrescription.js is a pure decision module', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'livePrescription.js'), 'utf8');

  test('no React / React Native / store imports anywhere in the module', () => {
    expect(src).not.toMatch(/from ['"]react['"]/);
    expect(src).not.toMatch(/from ['"]react-native['"]/);
    expect(src).not.toMatch(/from ['"]\.\.?\/.*store/);
    expect(src).not.toMatch(/require\(['"][.\w/]*store/);
  });

  test('Date.now() appears exactly once — as buildEvidencePacket\'s own IO-seam default; every pure function takes `now`/data as arguments and never reads the clock itself', () => {
    const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const code = stripComments(src);
    const dateNowHits = code.match(/Date\.now\(\)/g) || [];
    expect(dateNowHits.length).toBe(1);
    // The one hit must sit inside buildEvidencePacket's own parameter list,
    // not inside assembleEvidencePacket or resolveSetPrescription.
    const buildFnStart = code.indexOf('export async function buildEvidencePacket');
    const dateNowIndex = code.indexOf('Date.now()');
    expect(dateNowIndex).toBeGreaterThan(buildFnStart);
    expect(code).not.toMatch(/Math\.random\(/);
  });

  test('the only `require(` call in the module is the lazy database require inside buildEvidencePacket (the documented IO seam)', () => {
    const requireCalls = src.match(/require\(['"][^'"]+['"]\)/g) || [];
    expect(requireCalls.length).toBe(1);
    expect(requireCalls[0]).toMatch(/\.\/database/);
  });

  test('assembleEvidencePacket and resolveSetPrescription are synchronous (never `async`, never return a Promise) — only buildEvidencePacket is', () => {
    expect(src).toMatch(/export function assembleEvidencePacket/);
    expect(src).toMatch(/export function resolveSetPrescription/);
    expect(src).toMatch(/export async function buildEvidencePacket/);
    expect(src).not.toMatch(/export async function assembleEvidencePacket/);
    expect(src).not.toMatch(/export async function resolveSetPrescription/);
  });

  test('the readiness load trim mirrors sessionAdjustments.applyReadinessToLoad\'s exact formula (floor-to-0.25, downward-only), not merely by convention', () => {
    const sessionAdjSrc = fs.readFileSync(path.join(__dirname, '..', 'sessionAdjustments.js'), 'utf8');
    const extractFormula = (source, fnName) => {
      const m = source.match(new RegExp(`function ${fnName}[\\s\\S]*?\\n\\}`));
      return m ? m[0].replace(/\s+/g, ' ') : '';
    };
    const theirs = extractFormula(sessionAdjSrc, 'applyReadinessToLoad');
    expect(theirs).toMatch(/Math\.floor\(plannedLoad \* tweak\.loadFactor \* 4\) \/ 4/);
    // livePrescription's local mirror uses the identical arithmetic shape.
    expect(src).toMatch(/Math\.floor\(weight \* loadFactor \* 4\) \/ 4/);
  });
});

describe('provenance vocabulary is exactly the 13 §17 codes', () => {
  test('no extra, no missing, no duplicate values', () => {
    const codes = Object.keys(PROVENANCE);
    expect(codes.length).toBe(13);
    expect(new Set(Object.values(PROVENANCE)).size).toBe(13);
    expect(Object.isFrozen(PROVENANCE)).toBe(true);
  });
});
