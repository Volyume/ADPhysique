/**
 * livePrescription.kettlebell.test.js — final certification 2026-09-05,
 * finding A1 (docs/final-certification-2026-09-05/04-TRAINING-STYLES.md
 * section 2, "Kettlebell progression proposes bell weights that do not
 * exist").
 *
 * What this suite pins and why: kettlebells are sold in discrete sizes. The
 * corpus derives a generic increment_kg from compound/isolation alone
 * (exerciseCorpus/index.js deriveIncrementKg → 2.5 kg for every compound
 * bell row), so topping the rep range on a 16 kg bell used to prefill
 * 18.5 kg — a bell that does not exist, while the plan description the user
 * had just read promised "move up to the next kettlebell size"
 * (seedRoutines.js:2075). These tests FAIL if the ladder is removed,
 * un-snapped by the 5% cap or the 0.25 grid, or silently applied to
 * non-kettlebell equipment.
 *
 * The ladder is a KILOGRAM ladder, so it deliberately does not fire for a
 * user whose logged numbers are pounds — that is pinned here too, so the
 * exemption cannot be dropped by accident.
 */

const {
  KETTLEBELL_LADDER_KG,
  nextKettlebellLoadKg,
  resolveLoadIncrement,
  assembleEvidencePacket,
  resolveSetPrescription,
  nextSessionOpeningLoad,
  PROVENANCE,
} = require('../livePrescription');

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const BAND = { min: 8, max: 12 };

// ── the ladder itself ─────────────────────────────────────────────────────

describe('KETTLEBELL_LADDER_KG', () => {
  test('is the standard cast/competition ladder, frozen and ascending', () => {
    expect(KETTLEBELL_LADDER_KG).toEqual([
      4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48,
    ]);
    expect(Object.isFrozen(KETTLEBELL_LADDER_KG)).toBe(true);
  });
});

describe('nextKettlebellLoadKg', () => {
  test('16 -> 18: the next bell on the ruled ladder, never 18.5', () => {
    expect(nextKettlebellLoadKg(16)).toBe(18);
    expect(nextKettlebellLoadKg(16)).not.toBe(18.5);
  });

  test('12 -> 14', () => {
    expect(nextKettlebellLoadKg(12)).toBe(14);
  });

  test('24 -> 28 (the ladder widens to 4 kg above 24)', () => {
    expect(nextKettlebellLoadKg(24)).toBe(28);
  });

  test('an off-ladder load snaps UP to the next real bell, never down: 15 -> 16', () => {
    expect(nextKettlebellLoadKg(15)).toBe(16);
    expect(nextKettlebellLoadKg(18.5)).toBe(20);
  });

  test('48 is the top: nothing above it, so the caller keeps its fallback', () => {
    expect(nextKettlebellLoadKg(48)).toBeNull();
    expect(nextKettlebellLoadKg(52)).toBeNull();
  });

  test('a non-positive or non-finite load has no next bell', () => {
    expect(nextKettlebellLoadKg(0)).toBeNull();
    expect(nextKettlebellLoadKg(-8)).toBeNull();
    expect(nextKettlebellLoadKg(null)).toBeNull();
    expect(nextKettlebellLoadKg(undefined)).toBeNull();
    expect(nextKettlebellLoadKg('heavy')).toBeNull();
  });

  test('every rung steps to the one after it (the ladder is self-consistent)', () => {
    for (let i = 0; i < KETTLEBELL_LADDER_KG.length - 1; i++) {
      expect(nextKettlebellLoadKg(KETTLEBELL_LADDER_KG[i])).toBe(KETTLEBELL_LADDER_KG[i + 1]);
    }
  });
});

// ── resolveLoadIncrement: the increment IS the gap to the next bell ───────

describe('resolveLoadIncrement on kettlebell equipment', () => {
  const kb = (weight, extra = {}) => resolveLoadIncrement(weight, {
    incrementKg: 2.5, units: 'kg', category: 'compound', equipmentCategory: 'kettlebell', ...extra,
  });

  test('16 kg compound bell steps by 2, landing exactly on 18 (not 2.5 -> 18.5)', () => {
    expect(kb(16)).toBe(2);
    expect(16 + kb(16)).toBe(18);
  });

  test('the 5% cap never un-snaps the ladder (5% of 16 kg is 0.8 kg)', () => {
    // The generic path would have capped 2.5 to 0.8 here; the ladder is not
    // an increment of plates and is deliberately exempt.
    expect(kb(16)).toBe(2);   // not 0.8
    expect(kb(24)).toBe(4);   // not 1.2
  });

  test('rounding to the 0.25 grid cannot un-snap it: 15 kg steps by exactly 1', () => {
    expect(kb(15)).toBe(1);
    expect(15 + kb(15)).toBe(16);
  });

  test('above the top bell it falls back to the ordinary increment behaviour', () => {
    // 48 kg has no next bell: incrementKg 2.5, capped at 5% of 48 (2.4),
    // then rounded onto the 0.25 grid - exactly the pre-ladder path.
    expect(kb(48)).toBe(2.5);
    expect(kb(60)).toBe(2.5);
  });

  test('the raw free-text equipment string is accepted as well as the category', () => {
    expect(kb(16, { equipmentCategory: 'Kettlebell' })).toBe(2);
  });

  test('lbs users are untouched: the ladder is a kg ladder', () => {
    expect(kb(16, { units: 'lbs' })).toBe(0.75); // 5% cap over 2.5 on the 0.25 grid, as before
  });

  test('non-kettlebell equipment is untouched', () => {
    expect(resolveLoadIncrement(16, {
      incrementKg: 2.5, units: 'kg', category: 'compound', equipmentCategory: 'dumbbell',
    })).toBe(0.75);
    expect(resolveLoadIncrement(16, {
      incrementKg: 2.5, units: 'kg', category: 'compound',
    })).toBe(0.75);
  });

  test('a zero/unloaded base never invents a first bell', () => {
    expect(kb(0)).toBe(2.5);
  });
});

// ── through the resolver: the prefill a user actually sees ────────────────

const session = (at, sets, difficulty) => ({
  at,
  difficulty,
  sets: sets.map((s, i) => ({
    exerciseId: 'kb-goblet',
    setNumber: i + 1,
    weight: s.w,
    actualReps: s.r,
    setType: 'straight',
    targetRepsMin: BAND.min,
    targetRepsMax: BAND.max,
    createdAt: at + i * 1000,
  })),
});

// A single comparable session that TOPPED the range at 16 kg with a
// supportive effort rating - the §10.1 ADVANCE gate, which is where the
// 18.5 kg bell came from.
const toppedAt16 = [session(NOW - 3 * DAY, [{ w: 16, r: 12 }, { w: 16, r: 12 }, { w: 16, r: 12 }], 2)];

const kbPacket = () => assembleEvidencePacket({
  exercise: {
    id: 'kb-goblet',
    exerciseType: 'weight_reps',
    category: 'compound',
    equipmentCategory: 'kettlebell',
    incrementKg: 2.5, // exactly what exerciseCorpus derives for a compound bell
    units: 'kg',
  },
  prescription: { repsMin: BAND.min, repsMax: BAND.max },
  senior: {},
  rawHistory: toppedAt16,
  rawToday: [],
  now: NOW,
});

describe('kettlebell prefill through resolveSetPrescription (A1)', () => {
  test('a compound kettlebell row topped at 16 kg prefills a real bell, not 18.5 kg', () => {
    const p = resolveSetPrescription(kbPacket(), 1);
    expect(p.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(p.weight).toBe(18);        // the next bell on the ladder
    expect(p.weight).not.toBe(18.5);  // A1: the bell that does not exist
    expect(p.prefill).toBe(true);
  });

  test('the same history on a dumbbell row keeps the ordinary 5%-capped step', () => {
    const packet = assembleEvidencePacket({
      exercise: {
        id: 'kb-goblet',
        exerciseType: 'weight_reps',
        category: 'compound',
        equipmentCategory: 'dumbbell',
        incrementKg: 2.5,
        units: 'kg',
      },
      prescription: { repsMin: BAND.min, repsMax: BAND.max },
      senior: {},
      rawHistory: toppedAt16,
      rawToday: [],
      now: NOW,
    });
    expect(resolveSetPrescription(packet, 1).weight).toBe(16.75); // 16 + 0.75 (5% cap, 0.25 grid)
  });

  test('assembleEvidencePacket carries the equipment category onto the packet', () => {
    expect(kbPacket().exercise.equipmentCategory).toBe('kettlebell');
  });

  test('a packet with no equipment at all still resolves (additive, never required)', () => {
    const packet = assembleEvidencePacket({
      exercise: { id: 'kb-goblet', category: 'compound', incrementKg: 2.5, units: 'kg' },
      prescription: { repsMin: BAND.min, repsMax: BAND.max },
      senior: {},
      rawHistory: toppedAt16,
      rawToday: [],
      now: NOW,
    });
    expect(packet.exercise.equipmentCategory).toBeNull();
    expect(resolveSetPrescription(packet, 1).weight).toBe(16.75);
  });

  test('nextSessionOpeningLoad advances 24 kg to 28 kg, skipping 26', () => {
    const packet = assembleEvidencePacket({
      exercise: {
        id: 'kb-goblet', category: 'compound', equipmentCategory: 'kettlebell', incrementKg: 2.5, units: 'kg',
      },
      prescription: { repsMin: BAND.min, repsMax: BAND.max },
      senior: {},
      rawHistory: [session(NOW - 3 * DAY, [{ w: 24, r: 12 }, { w: 24, r: 12 }], 2)],
      rawToday: [],
      now: NOW,
    });
    const out = nextSessionOpeningLoad(
      packet.history.filter((s) => s.comparable),
      BAND,
      { incrementKg: 2.5, units: 'kg', category: 'compound', equipmentCategory: 'kettlebell' },
    );
    expect(out.weight).toBe(28);
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('purity: the same packet resolves to the same load every time', () => {
    const a = resolveSetPrescription(kbPacket(), 1);
    const b = resolveSetPrescription(kbPacket(), 1);
    expect(a).toEqual(b);
  });

  test('every advance from a real bell lands on a real bell', () => {
    const ladder = new Set(KETTLEBELL_LADDER_KG);
    for (const bell of KETTLEBELL_LADDER_KG.slice(0, -1)) {
      const packet = assembleEvidencePacket({
        exercise: {
          id: 'kb-goblet', category: 'compound', equipmentCategory: 'kettlebell', incrementKg: 2.5, units: 'kg',
        },
        prescription: { repsMin: BAND.min, repsMax: BAND.max },
        senior: {},
        rawHistory: [session(NOW - 3 * DAY, [{ w: bell, r: 12 }, { w: bell, r: 12 }], 2)],
        rawToday: [],
        now: NOW,
      });
      expect(ladder.has(resolveSetPrescription(packet, 1).weight)).toBe(true);
    }
  });
});
