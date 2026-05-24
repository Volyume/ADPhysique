import {
  parseCSV, detectFormat, parseHevy, parseStrong,
} from '../importExternal';

// ─── parseCSV: edge cases the formats actually contain ───────────────────

describe('parseCSV', () => {
  test('parses a plain header + two rows', () => {
    const rows = parseCSV('a,b,c\n1,2,3\n4,5,6\n');
    expect(rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  test('handles quoted fields with embedded commas', () => {
    const rows = parseCSV('title,notes\n"Push, Pull","just a note"\n');
    expect(rows).toEqual([{ title: 'Push, Pull', notes: 'just a note' }]);
  });

  test('handles escaped quotes inside quoted fields', () => {
    const rows = parseCSV('a,b\n"he said ""hi""",ok\n');
    expect(rows).toEqual([{ a: 'he said "hi"', b: 'ok' }]);
  });

  test('handles \\r\\n line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  test('skips blank trailing lines', () => {
    const rows = parseCSV('a,b\n1,2\n\n\n');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  test('returns [] when there is no body row', () => {
    expect(parseCSV('a,b\n')).toEqual([]);
  });
});

// ─── detectFormat: the fingerprint columns ───────────────────────────────

describe('detectFormat', () => {
  test('recognises Hevy by exercise_title + set_index', () => {
    expect(detectFormat([{ exercise_title: 'X', set_index: 0 }])).toBe('hevy');
  });
  test('recognises Strong by "Exercise Name" + "Set Order"', () => {
    expect(detectFormat([{ 'Exercise Name': 'X', 'Set Order': 1 }])).toBe('strong');
  });
  test('returns unknown for anything else', () => {
    expect(detectFormat([{ foo: 'bar' }])).toBe('unknown');
    expect(detectFormat([])).toBe('unknown');
  });
});

// ─── parseHevy: grouping by (title, start_time) ──────────────────────────

describe('parseHevy', () => {
  test('groups three sets into one workout, in started_at order', () => {
    const hevy = [
      { title: 'Push', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T11:00:00Z',
        exercise_title: 'Bench Press (Barbell)', set_index: '0', set_type: 'normal',
        weight_kg: '100', reps: '8', rpe: '8' },
      { title: 'Push', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T11:00:00Z',
        exercise_title: 'Bench Press (Barbell)', set_index: '1', set_type: 'normal',
        weight_kg: '100', reps: '8', rpe: '' },
      { title: 'Push', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T11:00:00Z',
        exercise_title: 'Incline DB Press', set_index: '0', set_type: 'warmup',
        weight_kg: '20', reps: '10', rpe: '' },
    ];
    const { workouts, exerciseNames } = parseHevy(hevy);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].title).toBe('Push');
    expect(workouts[0].sets).toHaveLength(3);
    // Set types: 'normal' → 'straight', 'warmup' → 'warmup'
    expect(workouts[0].sets[0].setType).toBe('straight');
    expect(workouts[0].sets[2].setType).toBe('warmup');
    // exerciseOrder reflects first-seen order
    expect(workouts[0].exerciseOrder).toEqual(['Bench Press (Barbell)', 'Incline DB Press']);
    expect([...exerciseNames]).toEqual(
      expect.arrayContaining(['Bench Press (Barbell)', 'Incline DB Press']),
    );
  });

  test('splits into two workouts when start_time differs', () => {
    const hevy = [
      { title: 'Push', start_time: '2024-01-15T10:00:00Z',
        exercise_title: 'Bench', set_index: '0', set_type: 'normal',
        weight_kg: '100', reps: '8' },
      { title: 'Push', start_time: '2024-01-17T10:00:00Z',
        exercise_title: 'Bench', set_index: '0', set_type: 'normal',
        weight_kg: '102.5', reps: '8' },
    ];
    const { workouts } = parseHevy(hevy);
    expect(workouts).toHaveLength(2);
    expect(workouts[0].startedAt).toBeLessThan(workouts[1].startedAt);
  });

  test('drops rows with no exercise name', () => {
    const hevy = [
      { title: 'Push', start_time: '2024-01-15T10:00:00Z',
        exercise_title: '', set_index: '0', set_type: 'normal' },
    ];
    const { workouts } = parseHevy(hevy);
    expect(workouts).toHaveLength(0);
  });

  test('drops rows with unparseable start_time', () => {
    const hevy = [
      { title: 'Push', start_time: 'not-a-date',
        exercise_title: 'Bench', set_index: '0' },
    ];
    const { workouts } = parseHevy(hevy);
    expect(workouts).toHaveLength(0);
  });
});

// ─── parseStrong: similar grouping, different fields ─────────────────────

describe('parseStrong', () => {
  test('groups by (Workout Name, Date)', () => {
    const strong = [
      { Date: '2024-01-15 10:00:00', 'Workout Name': 'Push',
        'Exercise Name': 'Bench Press (Barbell)', 'Set Order': '1',
        Weight: '100', Reps: '8', RPE: '8' },
      { Date: '2024-01-15 10:00:00', 'Workout Name': 'Push',
        'Exercise Name': 'Bench Press (Barbell)', 'Set Order': '2',
        Weight: '100', Reps: '8', RPE: '8' },
    ];
    const { workouts } = parseStrong(strong);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].sets).toHaveLength(2);
    expect(workouts[0].sets[0].weightKg).toBe(100);
    expect(workouts[0].sets[0].reps).toBe(8);
    expect(workouts[0].sets[0].rpe).toBe(8);
  });

  test('coerces empty weight/reps to null/0', () => {
    const strong = [
      { Date: '2024-01-15 10:00:00', 'Workout Name': 'Bw',
        'Exercise Name': 'Pull Up', 'Set Order': '1',
        Weight: '', Reps: '5', RPE: '' },
    ];
    const { workouts } = parseStrong(strong);
    expect(workouts[0].sets[0].weightKg).toBeNull();
    expect(workouts[0].sets[0].rpe).toBeNull();
    expect(workouts[0].sets[0].reps).toBe(5);
  });
});
