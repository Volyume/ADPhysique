/**
 * Cardio library + math foundation (audit Phase 5). Pure, so fully testable.
 */
import {
  CARDIO_ACTIVITIES, CARDIO_CATEGORIES, canonicalCardioId,
  getCardioActivity, getCardioActivityByName, cardioActivitiesByCategory,
  OTHER_CARDIO_ID,
} from '../cardioActivities';
import {
  metFor, estimateCardioKcal, estimateActivityKcal, deriveCardioMetadata,
  cardioFatigueContribution, cardioRecoveryLoad, cardioLoadLevel,
} from '../cardioMath';

describe('cardio library integrity', () => {
  test('every activity is well-formed', () => {
    expect(CARDIO_ACTIVITIES.length).toBeGreaterThanOrEqual(30);
    for (const a of CARDIO_ACTIVITIES) {
      expect(typeof a.id).toBe('string');
      expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(a.name.length).toBeGreaterThan(0);
      expect(CARDIO_CATEGORIES).toContain(a.category);
      expect(['low', 'moderate', 'high']).toContain(a.defaultIntensity);
      expect(['low', 'moderate', 'high']).toContain(a.recoveryImpact);
      expect(['cardiovascular', 'musculoskeletal', 'both']).toContain(a.impactType);
      expect(typeof a.coachTargetable).toBe('boolean');
      // MET spread is present and ascending-ish (low <= high).
      expect(a.met.low).toBeGreaterThan(0);
      expect(a.met.high).toBeGreaterThanOrEqual(a.met.low);
    }
  });

  test('ids are unique and deterministic', () => {
    const ids = CARDIO_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Deterministic: same name hashes the same id across calls.
    expect(canonicalCardioId('Outdoor Run')).toBe(canonicalCardioId('Outdoor Run'));
    expect(canonicalCardioId('Outdoor Run')).not.toBe(canonicalCardioId('Treadmill Run'));
  });

  test('lookups by id and name resolve', () => {
    const run = getCardioActivityByName('Outdoor Run');
    expect(run).toBeTruthy();
    expect(getCardioActivity(run.id)).toBe(run);
    expect(getCardioActivity('nope')).toBeNull();
    expect(getCardioActivityByName('NOT A THING')).toBeNull();
  });

  test('OTHER_CARDIO_ID resolves to the catch-all', () => {
    expect(getCardioActivity(OTHER_CARDIO_ID)?.name).toBe('Other Cardio');
  });

  test('category browse returns members', () => {
    const cycling = cardioActivitiesByCategory('cycling');
    expect(cycling.length).toBeGreaterThan(0);
    cycling.forEach((a) => expect(a.category).toBe('cycling'));
  });

  test('sport activities are not coach-targetable; cut staples are', () => {
    expect(getCardioActivityByName('Football / Soccer').coachTargetable).toBe(false);
    expect(getCardioActivityByName('Indoor Bike (Steady)').coachTargetable).toBe(true);
  });
});

describe('cardio MET maths (feedback only, never added to target)', () => {
  test('metFor picks the intensity, falls back to moderate', () => {
    const a = getCardioActivityByName('Indoor Bike (Steady)');
    expect(metFor(a, 'low')).toBe(4.8);
    expect(metFor(a, 'high')).toBe(8.5);
    expect(metFor(a, undefined)).toBe(a.met.moderate);
    expect(metFor(null, 'low')).toBe(0);
  });

  test('estimateCardioKcal = MET x kg x hours, rounded', () => {
    // 7 MET, 80 kg, 30 min = 7 * 80 * 0.5 = 280
    expect(estimateCardioKcal({ met: 7, bodyweightKg: 80, durationMin: 30 })).toBe(280);
    // 10 MET, 70 kg, 60 min = 700
    expect(estimateCardioKcal({ met: 10, bodyweightKg: 70, durationMin: 60 })).toBe(700);
  });

  test('estimateCardioKcal returns null on missing/zero inputs', () => {
    expect(estimateCardioKcal({ met: 0, bodyweightKg: 80, durationMin: 30 })).toBeNull();
    expect(estimateCardioKcal({ met: 7, bodyweightKg: 0, durationMin: 30 })).toBeNull();
    expect(estimateCardioKcal({ met: 7, bodyweightKg: 80, durationMin: 0 })).toBeNull();
    expect(estimateCardioKcal({})).toBeNull();
  });

  test('estimateActivityKcal threads through the activity', () => {
    const a = getCardioActivityByName('Outdoor Run'); // moderate MET 9.8
    expect(estimateActivityKcal(a, 'moderate', 30, 80)).toBe(Math.round(9.8 * 80 * 0.5));
  });
});

describe('derived metadata + recovery contribution', () => {
  test('lowImpact, legOverlap, homeOk derive correctly', () => {
    const bike = deriveCardioMetadata(getCardioActivityByName('Indoor Bike (Steady)'));
    expect(bike.lowImpact).toBe(true);   // cardiovascular
    expect(bike.legOverlap).toBe(false);
    expect(bike.homeOk).toBe(false);     // bike_indoor

    const run = deriveCardioMetadata(getCardioActivityByName('Outdoor Run'));
    expect(run.lowImpact).toBe(false);   // both
    expect(run.legOverlap).toBe(true);
    expect(run.homeOk).toBe(true);       // outdoor

    const hiit = deriveCardioMetadata(getCardioActivityByName('HIIT'));
    expect(hiit.legOverlap).toBe(true);
    expect(hiit.homeOk).toBe(true);      // none
  });

  test('fatigue contribution rises with impact', () => {
    expect(cardioFatigueContribution('low')).toBeLessThan(cardioFatigueContribution('moderate'));
    expect(cardioFatigueContribution('moderate')).toBeLessThan(cardioFatigueContribution('high'));
    expect(cardioFatigueContribution('bogus')).toBe(cardioFatigueContribution('moderate'));
  });
});

describe('cardio recovery load (additive, not averaged)', () => {
  const now = Date.UTC(2026, 5, 10);
  const day = 24 * 60 * 60 * 1000;

  test('empty / non-array is zero', () => {
    expect(cardioRecoveryLoad(null, now)).toBe(0);
    expect(cardioRecoveryLoad([], now)).toBe(0);
  });

  test('sums decayed contributions, so more hard sessions = more load', () => {
    const one = cardioRecoveryLoad([{ recovery_impact: 'high', at: now }], now);
    const three = cardioRecoveryLoad([
      { recovery_impact: 'high', at: now },
      { recovery_impact: 'high', at: now },
      { recovery_impact: 'high', at: now },
    ], now);
    expect(three).toBeGreaterThan(one);
    // A fresh hard session contributes its full ~1.2 (weight 1 at age 0).
    expect(one).toBeCloseTo(1.2, 5);
  });

  test('older sessions decay (half-life ~3 days)', () => {
    const fresh = cardioRecoveryLoad([{ recovery_impact: 'high', at: now }], now);
    const old = cardioRecoveryLoad([{ recovery_impact: 'high', at: now - 3 * day }], now);
    expect(old).toBeCloseTo(fresh / 2, 2);
  });

  test('reads entry_date when no timestamp is present', () => {
    const load = cardioRecoveryLoad([{ recovery_impact: 'moderate', entry_date: '2026-06-10' }], now);
    expect(load).toBeGreaterThan(0);
  });

  test('load level bands', () => {
    expect(cardioLoadLevel(0.4)).toBe('low');
    expect(cardioLoadLevel(1.5)).toBe('moderate');
    expect(cardioLoadLevel(2.6)).toBe('high');
  });
});
