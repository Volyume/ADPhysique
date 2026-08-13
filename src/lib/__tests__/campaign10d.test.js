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

// C12: detectPlateau now also requires the stalled run to span real local
// calendar time (>= 3 distinct weeks, >= 14 days, no gap over 14 days), so
// fixtures carry dates. `sessionIdx` is newest-first, matching the argument
// order, and spaces sessions a week apart - the timing is deliberately valid
// in every case here so these tests keep testing exactly what they were
// written to test: ROW ELIGIBILITY, not the time law.
const WEEK = 7 * 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 4, 20, 18, 0, 0).getTime();
const atFor = (sessionIdx) => T0 - sessionIdx * WEEK;

/** Working sets at a fixed load/reps, dated a week apart newest-first. */
const work = (weight, reps, n = 2, sessionIdx = 0) =>
  Array.from({ length: n }, () => ({
    weight, actualReps: reps, setType: 'straight', createdAt: atFor(sessionIdx),
  }));

// ─── 1. RD6-3 ────────────────────────────────────────────────────────────────

describe('RD6-3: only legitimate progression evidence decides a plateau', () => {
  // Four flat sessions, newest-first: a genuine plateau.
  const flat = [work(100, 8, 2, 0), work(100, 8, 2, 1), work(100, 8, 2, 2), work(100, 8, 2, 3)];
  // Four rising sessions: genuinely progressing.
  const rising = [work(115, 8, 2, 0), work(110, 8, 2, 1), work(105, 8, 2, 2), work(100, 8, 2, 3)];

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
      { weight: 20, actualReps: 15, setType: 'warmup', createdAt: sets[0].createdAt },
      { weight: 20, actualReps: 15, setType: 'warmup', createdAt: sets[0].createdAt },
      ...sets,
    ]);
    expect(detectPlateau(withWarmups).plateau).toBe(false);
  });

  test('changing only warm-up performance cannot BREAK a genuine plateau', () => {
    const flatWithMovingWarmups = flat.map((sets, i) => [
      { weight: 20 + i * 10, actualReps: 15 + i * 3, setType: 'warmup', createdAt: sets[0].createdAt },
      ...sets,
    ]);
    expect(detectPlateau(flatWithMovingWarmups).plateau).toBe(true);
  });

  test('myo-rep and rest-pause rows cannot manufacture or remove a plateau', () => {
    // Cluster rows store SUMMED reps, so they look like huge jumps.
    const flatWithClusters = flat.map((sets, i) => [
      ...sets,
      { weight: 100, actualReps: 20 + i * 5, setType: 'myo_reps', createdAt: sets[0].createdAt },
      { weight: 100, actualReps: 25 + i * 5, setType: 'rest_pause', createdAt: sets[0].createdAt },
    ]);
    expect(detectPlateau(flatWithClusters).plateau).toBe(true);

    const risingWithClusters = rising.map((sets) => [
      ...sets,
      { weight: 100, actualReps: 30, setType: 'rest_pause', createdAt: sets[0].createdAt },
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
    expect(detectPlateau(warmupsOnly)).toMatchObject({ plateau: false, consecutiveStalls: 0, resolution: null });
    // Two eligible sessions is still below the existing floor.
    expect(detectPlateau([work(100, 8, 2, 0), work(100, 8, 2, 1)]).plateau).toBe(false);
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

  // RE-ANCHORED by C12 job 1. C10D's own scope was ROW ELIGIBILITY, and it
  // pinned the surrounding model as untouched at the time - including the
  // session-AVERAGE epsilons. C12 replaced that basis: a session is now
  // represented by its BEST eligible estimated max, because a mean measures
  // workout structure (back-off sets, added hypertrophy work) as much as
  // performance. The window, the stall threshold and the resolution split
  // are still unchanged, and that is what this pin now guards.
  test('the window, threshold and resolution split are unchanged', () => {
    const src = read('lib/algorithms.js');
    const from = src.indexOf('export function detectPlateau');
    // detectPlateau ONLY: its mirror (detectProgressionConsistency) follows
    // in the same file and keeps its own arithmetic - see the C12 debt note.
    const fn = src.slice(from, src.indexOf('\n/**\n * Campaign 9 closeout: progression consistency', from));
    expect(fn).toMatch(/slice\(0, 4\)/);           // window
    expect(fn).toMatch(/consecutiveStalls < 2/);    // threshold
    expect(fn).toMatch(/consecutiveStalls >= 3/);   // resolution split
    // The average-based epsilons are gone, replaced by the app's existing
    // better-estimated-max margin rather than a new plateau threshold.
    expect(fn).not.toMatch(/prevAvgWeight/);
    expect(fn).not.toMatch(/prevAvgReps/);
    expect(fn).toMatch(/curr > prev \* E1RM_PROGRESS_MARGIN/);
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
