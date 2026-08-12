/**
 * campaign10d.test.js — signal integrity and user control.
 *
 *   1. RD6-3: plateau detection uses only legitimate progression evidence
 *   2. cycle-specific interpretation obeys the extra opt-in
 *   3. the readiness setting states its behavioural consequence
 */
import { detectPlateau, detectProgressionConsistency, isE1rmEligibleRow } from '../algorithms';
import { shouldShowCycleQuestion } from '../cyclePrefs';
import { cycleTrendAnnotation } from '../cyclePhase';

const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', rel), 'utf8');

/** Working sets at a fixed load/reps. */
const work = (weight, reps, n = 2) =>
  Array.from({ length: n }, () => ({ weight, actualReps: reps, setType: 'straight' }));

// ─── 1. RD6-3 ────────────────────────────────────────────────────────────────

describe('RD6-3: only legitimate progression evidence decides a plateau', () => {
  // Four flat sessions, newest-first: a genuine plateau.
  const flat = [work(100, 8), work(100, 8), work(100, 8), work(100, 8)];
  // Four rising sessions: genuinely progressing.
  const rising = [work(115, 8), work(110, 8), work(105, 8), work(100, 8)];

  test('normal eligible working sets keep the existing behaviour', () => {
    expect(detectPlateau(flat).plateau).toBe(true);
    expect(detectPlateau(flat).consecutiveStalls).toBe(3);
    expect(detectPlateau(flat).resolution).toBe('swap_exercise');
    expect(detectPlateau(rising).plateau).toBe(false);
  });

  test('warm-ups cannot MANUFACTURE a plateau', () => {
    // Genuinely rising working sets, with a flat warm-up bolted on. The
    // warm-up used to drag the session average toward "no change".
    const withWarmups = rising.map((sets) => [
      { weight: 20, actualReps: 15, setType: 'warmup' },
      { weight: 20, actualReps: 15, setType: 'warmup' },
      ...sets,
    ]);
    expect(detectPlateau(withWarmups).plateau).toBe(false);
  });

  test('changing only warm-up performance cannot BREAK a genuine plateau', () => {
    const flatWithMovingWarmups = flat.map((sets, i) => [
      { weight: 20 + i * 10, actualReps: 15 + i * 3, setType: 'warmup' },
      ...sets,
    ]);
    expect(detectPlateau(flatWithMovingWarmups).plateau).toBe(true);
  });

  test('myo-rep and rest-pause rows cannot manufacture or remove a plateau', () => {
    // Cluster rows store SUMMED reps, so they look like huge jumps.
    const flatWithClusters = flat.map((sets, i) => [
      ...sets,
      { weight: 100, actualReps: 20 + i * 5, setType: 'myo_reps' },
      { weight: 100, actualReps: 25 + i * 5, setType: 'rest_pause' },
    ]);
    expect(detectPlateau(flatWithClusters).plateau).toBe(true);

    const risingWithClusters = rising.map((sets) => [
      ...sets,
      { weight: 100, actualReps: 30, setType: 'rest_pause' },
    ]);
    expect(detectPlateau(risingWithClusters).plateau).toBe(false);
  });

  test('insufficient ELIGIBLE evidence never becomes a plateau', () => {
    const warmupsOnly = [
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
    ];
    expect(detectPlateau(warmupsOnly)).toEqual({ plateau: false, consecutiveStalls: 0, resolution: null });
    // Two eligible sessions is still below the existing floor.
    expect(detectPlateau([work(100, 8), work(100, 8)]).plateau).toBe(false);
  });

  test('plateau and progression consistency agree on ROW eligibility, and stay separate decisions', () => {
    const junk = [
      [{ weight: 120, actualReps: 30, setType: 'rest_pause' }],
      [{ weight: 110, actualReps: 25, setType: 'myo_reps' }],
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
      [{ weight: 20, actualReps: 15, setType: 'warmup' }],
    ];
    // Same rows rejected by both.
    expect(detectPlateau(junk).plateau).toBe(false);
    expect(detectProgressionConsistency(junk).status).toBe('insufficient');
    // But they remain distinct functions with distinct answers on real data.
    expect(detectPlateau(flat).plateau).toBe(true);
    expect(detectProgressionConsistency(flat).status).toBe('holding');
    expect(detectProgressionConsistency(rising).status).toBe('progressing');
  });

  test('both use the ONE existing eligibility law, not a second filter', () => {
    const src = read('lib/algorithms.js');
    const fn = src.slice(src.indexOf('export function detectPlateau'));
    expect(fn.slice(0, 1800)).toMatch(/filter\(isE1rmEligibleRow\)/);
    // No bespoke set-type list invented alongside it.
    expect(fn.slice(0, 1800)).not.toMatch(/'warmup'|myo_reps|rest_pause/);
    expect(isE1rmEligibleRow({ setType: 'warmup' })).toBe(false);
    expect(isE1rmEligibleRow({ setType: 'straight' })).toBe(true);
  });

  test('the plateau model itself is unchanged', () => {
    const src = read('lib/algorithms.js');
    const from = src.indexOf('export function detectPlateau');
    const fn = src.slice(from, src.indexOf('\n// RP-classic deload prescription', from));
    expect(fn).toMatch(/slice\(0, 4\)/);           // window
    expect(fn).toMatch(/consecutiveStalls < 2/);    // threshold
    expect(fn).toMatch(/prevAvgWeight \+ 0\.01/);   // load epsilon
    expect(fn).toMatch(/prevAvgReps  \+ 0\.5/);     // rep epsilon
    expect(fn).toMatch(/consecutiveStalls >= 3/);   // resolution split
  });
});

// ─── 2. Cycle opt-in ─────────────────────────────────────────────────────────

describe('cycle-specific interpretation obeys the extra opt-in', () => {
  const coach = read('lib/weeklyCoach.js');

  test('the engine defaults the opt-in to OFF, so permission fails closed', () => {
    expect(coach).toMatch(/cycleTrackingEnabled = false,/);
  });

  test('the free-text menstrual flag is gated by the SAME predicate as the question', () => {
    expect(coach).toMatch(/const cycleInterpretationAllowed = shouldShowCycleQuestion\(sex, cycleTrackingEnabled\);/);
    expect(coach).toMatch(/menstrual: cycleInterpretationAllowed \? noteFlags\?\.menstrual : false,/);
  });

  test('opt-in OFF: a female user with a menstrual note gets no cycle annotation', () => {
    expect(shouldShowCycleQuestion('female', false)).toBe(false);
    // With the gate closed the engine passes menstrual:false, and the pure
    // annotator returns nothing for that.
    expect(cycleTrendAnnotation({ sex: 'female', menstrual: false, trendPctPerWeek: 0.4 })).toBeNull();
  });

  test('opt-in ON: existing annotation behaviour is untouched', () => {
    expect(shouldShowCycleQuestion('female', true)).toBe(true);
    expect(cycleTrendAnnotation({ sex: 'female', menstrual: true, trendPctPerWeek: 0.4 })).toBeTruthy();
  });

  test('the note is never rewritten and the preference is never written from the engine', () => {
    expect(coach).not.toMatch(/setCycleTracking/);
    expect(coach).not.toMatch(/noteFlags\s*=\s*\{[^}]*menstrual:\s*false/);
  });

  test('the caller supplies the real preference, read fresh and failing closed', () => {
    const screen = read('screens/CoachOutputScreen.js');
    expect(screen).toMatch(/cycleTrackingEnabled: await getCycleTracking\(\)\.catch\(\(\) => false\)/);
  });

  test('injury/illness and joint safety behaviour is untouched by the gate', () => {
    // The gate wraps ONLY the menstrual flag feeding cycleTrendAnnotation.
    const block = coach.slice(coach.indexOf('const cycleInterpretationAllowed'), coach.indexOf('PHOTO CORROBORATION'));
    expect(block).not.toMatch(/safetyHold|injur|illness|joint/i);
  });

  test('cycleOverride, the explicit question, is unchanged', () => {
    expect(coach).toMatch(/const cycleOverride\s+= !!\(checkin\?\.cycleOverride\);/);
  });
});

// ─── 3. Readiness setting copy ───────────────────────────────────────────────

describe('the readiness setting states its behavioural consequence', () => {
  const screen = read('screens/SettingsCoachingScreen.js');

  test('OFF says the answers are no longer available to ease a session', () => {
    expect(screen).toMatch(/no readiness answers to ease a session after poor recovery/);
    // It must no longer be ONLY a UI statement.
    expect(screen).toMatch(/Sessions start straight away\./);
  });

  test('OFF keeps the existing block-ledger consequence too', () => {
    expect(screen).toMatch(/next block\\?'s set targets stay where they are/);
  });

  test('ON names the direction and the never-harder invariant (Pro)', () => {
    expect(screen).toMatch(/Poor sleep or heavy soreness can ease that session; answering well never adds work above the plan\./);
  });

  test('Free is promised no session adjustment', () => {
    const free = screen.slice(screen.indexOf(": 'Asks how you are feeling before each session and keeps it"), screen.indexOf('showArrow={false}'));
    expect(free).not.toMatch(/ease|adjust|easier|lighter/i);
  });

  test('no algorithm detail leaked into Settings COPY', () => {
    // Scan the user-visible strings only: the surrounding code comments
    // legitimately name internals like readinessTweak.
    const row = screen.slice(screen.indexOf('label="Session readiness check"'), screen.indexOf('label="Session readiness check"') + 2200);
    const copy = (row.match(/'[^']{20,}'/g) ?? []).join(' ');
    expect(copy.length).toBeGreaterThan(0);
    expect(copy).not.toMatch(/readinessTweak|setDelta|loadFactor|MEV|MRV|RIR/);
  });

  test('it never claims every low answer WILL change the session', () => {
    const row = screen.slice(screen.indexOf('label="Session readiness check"'), screen.indexOf('label="Session readiness check"') + 2200);
    const copy = (row.match(/'[^']{20,}'/g) ?? []).join(' ');
    expect(copy).not.toMatch(/will ease|always ease|will reduce/i);
    expect(copy).toMatch(/can ease/);
  });
});
