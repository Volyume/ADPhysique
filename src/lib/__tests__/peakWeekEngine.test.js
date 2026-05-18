import { buildPeakWeek, peakWeekToText, FEDERATIONS } from '../peakWeekEngine';

const BASE = {
  showDate: '2026-10-03',
  federation: 'NPC',
  bodyweightKg: 80,
  leanKg: 72,
  prepCarbsPerKg: 3,
  prepSodiumMg: 3000,
  prepWaterL: 4,
};

describe('buildPeakWeek — structure', () => {
  test('returns 7 days, offsets -6 through 0', () => {
    const plan = buildPeakWeek(BASE);
    expect(plan.days).toHaveLength(7);
    expect(plan.days.map(d => d.dayOffset)).toEqual([-6, -5, -4, -3, -2, -1, 0]);
  });

  test('last day is the show day, highlighted', () => {
    const plan = buildPeakWeek(BASE);
    const last = plan.days[6];
    expect(last.isShowDay).toBe(true);
    expect(last.phase).toBe('show');
  });

  test('federation is preserved and disclaimer present', () => {
    const plan = buildPeakWeek(BASE);
    expect(plan.federation).toBe('NPC');
    expect(plan.disclaimer).toMatch(/Langan-Evans/);
    expect(FEDERATIONS).toContain('IFBB Pro');
  });
});

describe('buildPeakWeek — carb-deplete → load → taper ramp', () => {
  test('depletion days are low carb, load days ramp 4 → 6 → 8 g/kg', () => {
    const plan = buildPeakWeek(BASE);
    // Days -6,-5,-4 depletion at 1.5 g/kg × 80 = 120g
    expect(plan.days[0].carbsG).toBe(120);
    expect(plan.days[1].carbsG).toBe(120);
    expect(plan.days[2].carbsG).toBe(120);
    // Day -3: 4 g/kg × 80 = 320g
    expect(plan.days[3].carbsG).toBe(320);
    // Day -2: 6 g/kg × 80 = 480g
    expect(plan.days[4].carbsG).toBe(480);
    // Day -1: 8 g/kg × 80 = 640g
    expect(plan.days[5].carbsG).toBe(640);
    // Show day: morning top-up 2.5 g/kg × 80 = 200g
    expect(plan.days[6].carbsG).toBe(200);
  });

  test('water tapers: normal → 75% → 50% → sips', () => {
    const plan = buildPeakWeek(BASE);
    expect(plan.days[0].waterL).toBe(4);     // normal
    expect(plan.days[3].waterL).toBe(4);     // still normal at -3
    expect(plan.days[4].waterL).toBe(3);     // -2: 75% of 4
    expect(plan.days[5].waterL).toBe(2);     // -1: 50% of 4
    expect(plan.days[6].waterL).toBeLessThan(1); // show: sips only
  });

  test('sodium stays normal until -1, then drops sharply', () => {
    const plan = buildPeakWeek(BASE);
    expect(plan.days[0].sodiumMg).toBe(3000);
    expect(plan.days[4].sodiumMg).toBe(3000); // -2 still normal
    expect(plan.days[5].sodiumMg).toBeLessThan(1500); // -1 sharp drop
    expect(plan.days[6].sodiumMg).toBeLessThan(plan.days[5].sodiumMg); // show even lower
  });

  test('protein is held constant across the week', () => {
    const plan = buildPeakWeek(BASE);
    const proteins = new Set(plan.days.map(d => d.proteinG));
    expect(proteins.size).toBe(1);
  });
});

describe('buildPeakWeek — determinism', () => {
  test('same inputs yield identical output (no Math.random)', () => {
    const a = buildPeakWeek(BASE);
    const b = buildPeakWeek(BASE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('show date drives weekday/date labels', () => {
    const plan = buildPeakWeek(BASE);
    // 2026-10-03 is a Saturday; show day weekday should be Saturday
    expect(plan.days[6].weekday).toBe('Saturday');
    expect(plan.days[6].dateISO).toBe('2026-10-03');
    // Day -6 is the prior Sunday
    expect(plan.days[0].weekday).toBe('Sunday');
  });

  test('missing show date still builds (no date labels)', () => {
    const plan = buildPeakWeek({ ...BASE, showDate: null });
    expect(plan.days).toHaveLength(7);
    expect(plan.days[6].weekday).toBeNull();
    expect(plan.days[6].carbsG).toBe(200);
  });
});

describe('peakWeekToText', () => {
  test('produces a CSV-style export with all 7 days and the disclaimer', () => {
    const plan = buildPeakWeek(BASE);
    const text = peakWeekToText(plan, { showDateLabel: '03/10/2026 (NPC)' });
    expect(text).toMatch(/VOLYUME — PEAK WEEK PLAN/);
    expect(text).toMatch(/Federation: NPC/);
    expect(text).toMatch(/Langan-Evans/);
    // header + 7 day rows
    const dayRows = text.split('\n').filter(l => /day(s)? out|Show day/.test(l));
    expect(dayRows.length).toBeGreaterThanOrEqual(7);
  });
});
