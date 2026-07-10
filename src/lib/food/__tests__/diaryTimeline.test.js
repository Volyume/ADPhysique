/**
 * diaryTimeline.test.js
 *
 * Ultimate-Audit item 15 (D22 15a/15b, timeline food logging): pins the
 * pure ordering/grouping logic behind the flat chronological diary list.
 *
 *   - A timed entry (real eaten_at) sorts by that clock time.
 *   - An untimed entry (bulk-confirmed, eaten_at NULL) sorts into its meal's
 *     conventional ladder position, never an invented clock time, and
 *     several untimed entries in the same meal stay adjacent ("grouped
 *     under their meal tag" per the ruling).
 *   - Day-part labels (Morning/Afternoon/Evening) appear once per
 *     contiguous run, derived purely from the hour, never from a stored
 *     judgement.
 *   - Everything here is deterministic: same input, same output, every
 *     time, no clock read, no randomness.
 */
import {
  dayPartForHour, syntheticHourForSlot, buildDiaryTimeline,
} from '../diaryTimeline';

function ts(hhmm) {
  // Fixed calendar day so only the time-of-day matters.
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 6, 10, h, m, 0, 0).getTime();
}

const MEAL_SLOTS = [
  { key: 'meal_1', label: 'Meal 1' },
  { key: 'meal_2', label: 'Meal 2' },
  { key: 'meal_3', label: 'Meal 3' },
  { key: 'meal_4', label: 'Meal 4' },
];

describe('dayPartForHour', () => {
  test('before 12:00 is Morning', () => {
    expect(dayPartForHour(0)).toBe('Morning');
    expect(dayPartForHour(11)).toBe('Morning');
  });
  test('12:00-16:59 is Afternoon', () => {
    expect(dayPartForHour(12)).toBe('Afternoon');
    expect(dayPartForHour(16)).toBe('Afternoon');
  });
  test('17:00 and later is Evening', () => {
    expect(dayPartForHour(17)).toBe('Evening');
    expect(dayPartForHour(23)).toBe('Evening');
  });
});

describe('syntheticHourForSlot', () => {
  test('spreads meal slots evenly across the eating window, in ladder order', () => {
    const keys = MEAL_SLOTS.map((s) => s.key);
    const hours = keys.map((k) => syntheticHourForSlot(k, keys));
    // Strictly increasing: earlier-ranked meals get an earlier synthetic hour.
    for (let i = 1; i < hours.length; i++) {
      expect(hours[i]).toBeGreaterThan(hours[i - 1]);
    }
  });

  test('a slot missing from the ladder falls back to the window start (never throws)', () => {
    const keys = MEAL_SLOTS.map((s) => s.key);
    expect(syntheticHourForSlot('meal_99', keys)).toBe(syntheticHourForSlot('meal_99', []));
  });
});

describe('buildDiaryTimeline: ordering', () => {
  test('a fully timed day sorts purely by eaten_at, regardless of meal_slot', () => {
    const entries = [
      { id: 'a', meal_slot: 'meal_3', eaten_at: ts('08:00') },
      { id: 'b', meal_slot: 'meal_1', eaten_at: ts('19:30') },
      { id: 'c', meal_slot: 'meal_2', eaten_at: ts('13:15') },
    ];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const order = items.filter((i) => i.type === 'entry').map((i) => i.entry.id);
    expect(order).toEqual(['a', 'c', 'b']);
  });

  test('an untimed entry sorts into its meal ladder position among timed entries, never invented as a displayed time', () => {
    const entries = [
      { id: 'early', meal_slot: 'meal_1', eaten_at: ts('07:00') },
      // meal_2 is bulk-confirmed: no eaten_at at all.
      { id: 'untimed_meal2', meal_slot: 'meal_2', eaten_at: null },
      { id: 'late', meal_slot: 'meal_4', eaten_at: ts('20:00') },
    ];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const order = items.filter((i) => i.type === 'entry').map((i) => i.entry.id);
    // meal_2's ladder position sits between meal_1 (07:00) and meal_4 (20:00).
    expect(order).toEqual(['early', 'untimed_meal2', 'late']);
    const untimedItem = items.find((i) => i.type === 'entry' && i.entry.id === 'untimed_meal2');
    expect(untimedItem.hasTime).toBe(false);
  });

  test('several untimed entries in the SAME meal stay adjacent (grouped under their meal tag)', () => {
    const entries = [
      { id: 'x1', meal_slot: 'meal_2', eaten_at: null },
      { id: 'x2', meal_slot: 'meal_2', eaten_at: null },
      { id: 'x3', meal_slot: 'meal_2', eaten_at: null },
      { id: 'other', meal_slot: 'meal_4', eaten_at: ts('20:00') },
    ];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const order = items.filter((i) => i.type === 'entry').map((i) => i.entry.id);
    expect(order).toEqual(['x1', 'x2', 'x3', 'other']);
  });

  test('is stable: ties keep the incoming (meal_slot, logged_at) relative order', () => {
    const entries = [
      { id: 'first-in', meal_slot: 'meal_1', eaten_at: null },
      { id: 'second-in', meal_slot: 'meal_1', eaten_at: null },
    ];
    const order1 = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS })
      .filter((i) => i.type === 'entry').map((i) => i.entry.id);
    const order2 = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS })
      .filter((i) => i.type === 'entry').map((i) => i.entry.id);
    expect(order1).toEqual(['first-in', 'second-in']);
    expect(order1).toEqual(order2); // deterministic across repeated calls
  });

  test('a whole mixed day (some timed, some bulk-confirmed) renders deterministically', () => {
    const entries = [
      { id: 'breakfast', meal_slot: 'meal_1', eaten_at: ts('07:30') },
      { id: 'lunch_a', meal_slot: 'meal_2', eaten_at: null },
      { id: 'lunch_b', meal_slot: 'meal_2', eaten_at: null },
      { id: 'snack', meal_slot: 'meal_3', eaten_at: ts('15:45') },
      { id: 'dinner', meal_slot: 'meal_4', eaten_at: null },
    ];
    const run1 = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const run2 = buildDiaryTimeline([...entries], { mealSlots: MEAL_SLOTS });
    const ids1 = run1.filter((i) => i.type === 'entry').map((i) => i.entry.id);
    const ids2 = run2.filter((i) => i.type === 'entry').map((i) => i.entry.id);
    expect(ids1).toEqual(['breakfast', 'lunch_a', 'lunch_b', 'snack', 'dinner']);
    expect(ids1).toEqual(ids2);
  });
});

describe('buildDiaryTimeline: day-part labels', () => {
  test('inserts one label per contiguous day-part run, not per entry', () => {
    const entries = [
      { id: 'a', meal_slot: 'meal_1', eaten_at: ts('07:00') },
      { id: 'b', meal_slot: 'meal_2', eaten_at: ts('09:00') }, // still Morning
      { id: 'c', meal_slot: 'meal_3', eaten_at: ts('13:00') }, // Afternoon
      { id: 'd', meal_slot: 'meal_4', eaten_at: ts('20:00') }, // Evening
    ];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const labels = items.filter((i) => i.type === 'daypart').map((i) => i.label);
    expect(labels).toEqual(['Morning', 'Afternoon', 'Evening']);
  });

  test('an empty day produces an empty timeline (no stray labels)', () => {
    expect(buildDiaryTimeline([], { mealSlots: MEAL_SLOTS })).toEqual([]);
  });
});

describe('buildDiaryTimeline: first/last-of-slot flags', () => {
  test('flags exactly the first and last row of each meal group', () => {
    const entries = [
      { id: 'm1a', meal_slot: 'meal_1', eaten_at: ts('07:00') },
      { id: 'm1b', meal_slot: 'meal_1', eaten_at: ts('07:05') },
      { id: 'm2a', meal_slot: 'meal_2', eaten_at: ts('12:30') },
    ];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS }).filter((i) => i.type === 'entry');
    const byId = Object.fromEntries(items.map((i) => [i.entry.id, i]));
    expect(byId.m1a.isFirstOfSlot).toBe(true);
    expect(byId.m1a.isLastOfSlot).toBe(false);
    expect(byId.m1b.isFirstOfSlot).toBe(false);
    expect(byId.m1b.isLastOfSlot).toBe(true);
    expect(byId.m2a.isFirstOfSlot).toBe(true);
    expect(byId.m2a.isLastOfSlot).toBe(true);
  });
});

describe('buildDiaryTimeline: ED-safety non-goal', () => {
  test('never attaches a displayed time to an untimed (hasTime=false) entry', () => {
    const entries = [{ id: 'bulk', meal_slot: 'meal_2', eaten_at: null }];
    const items = buildDiaryTimeline(entries, { mealSlots: MEAL_SLOTS });
    const entryItem = items.find((i) => i.type === 'entry');
    expect(entryItem.hasTime).toBe(false);
    // The item carries no derived "time since", "gap", or "hour" field for
    // display -- only the raw entry and the hasTime flag.
    expect(Object.keys(entryItem).sort()).toEqual(['entry', 'hasTime', 'isFirstOfSlot', 'isLastOfSlot', 'key', 'type']);
  });
});
