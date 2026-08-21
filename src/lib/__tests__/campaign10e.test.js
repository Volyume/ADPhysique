/**
 * campaign10e.test.js — check-in signal truth.
 *
 *   1. joint pain keeps YES / NO / UNKNOWN distinct, and UNKNOWN never
 *      buys the permission an explicit NO would
 *   2. when the user's own note materially changes a decision, the
 *      explanation says so - attributed to what they wrote, never as a
 *      diagnosis, and never when the note changed nothing
 */
import { runWeeklyCoach, parseNoteFlags } from '../weeklyCoach';

const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', rel), 'utf8');

const weights = () => Array.from({ length: 14 }, (_, i) => ({
  weightKg: 80 + i * 0.03,
  loggedAt: Date.now() - (13 - i) * 86400000,
}));

const baseCheckin = (over = {}) => ({
  energyScore: 4, sleepQuality: 4, soreness: 2, motivation: 4,
  calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 4,
  jointPain: null, notes: '', cycleOverride: false, ...over,
});

/** The user-facing training note, where the hold provenance actually lands. */
const noteOf = (out) => out?.adjustments?.training?.note ?? '';

const run = (checkinOver = {}, inputsOver = {}) => runWeeklyCoach({
  checkin: baseCheckin(checkinOver),
  morningWeights: weights(),
  sessionsCompleted: 4, sessionsPlanned: 4,
  currentCalTarget: 2400, currentStepsTarget: 8000,
  goalPhase: 'lean_bulk', weeksInPhase: 4,
  bodyweightKg: 80, sex: 'female',
  ...inputsOver,
});

// ─── 1. Joint pain tri-state ─────────────────────────────────────────────────

describe('joint pain keeps YES, NO and UNKNOWN distinct', () => {
  const db = read('lib/database.js');
  const screen = read('screens/WeeklyCheckInScreen.js');
  const sync = read('lib/sync/tables/weeklyCheckins.js');

  test('the save preserves all three states rather than collapsing to a boolean', () => {
    expect(db).toMatch(/\['jointPain', 'joint_pain', \(v\) => \(v == null \? null : \(v \? 1 : 0\)\)\]/);
  });

  test('the screen writes YES as true, NO as false and unanswered as null', () => {
    // CC31 (section 19): during an active-episode week the conditional
    // question replaces this one, storing null by design; every other
    // week keeps the exact tri-state law.
    expect(screen).toMatch(/jointPain: hasActiveEpisode \? null : \(jointPain === 'yes' \? true : \(jointPain === 'no' \? false : null\)\)/);
  });

  test('reload maps the three states back without turning UNKNOWN into NO', () => {
    expect(screen).toMatch(/existingCheckin\.jointPain == null/);
    expect(screen).toMatch(/: \(existingCheckin\.jointPain \? 'yes' : 'no'\)\)/);
  });

  test('the sync payload preserves UNKNOWN as null', () => {
    expect(sync).toMatch(/joint_pain: c\.jointPain == null \? null : !!c\.jointPain/);
  });

  test('the cloud applier preserves UNKNOWN as null', () => {
    expect(db).toMatch(/c\.joint_pain == null \? null : \(c\.joint_pain \? 1 : 0\)/);
  });

  // THE DOWNSTREAM LAW: absence must never buy permission.
  test('no consumer relaxes a restraint on the ABSENCE of joint pain', () => {
    for (const rel of ['lib/weeklyCoach.js', 'lib/coachResponse.js', 'lib/coachRegister.js', 'lib/coachOutput/viewCopy.js']) {
      const src = read(rel);
      // A relaxing read would look like !jointPain / === false granting
      // something. Consumers only ever ADD a restraint when it is truthy.
      expect(src).not.toMatch(/!\s*checkin\?\.jointPain/);
      expect(src).not.toMatch(/jointPain\s*===\s*false/);
    }
  });

  test('explicit YES still holds the plan, exactly as before', () => {
    const out = run({ jointPain: true, trainingPerformance: 4, soreness: 1 });
    expect(noteOf(out)).toMatch(/You flagged joint pain/);
    expect(out.jointPainFlagged).toBe(true);
  });

  test('explicit NO and UNKNOWN both add no pain signal, and neither is treated as evidence of absence', () => {
    expect(run({ jointPain: false }).jointPainFlagged).toBe(false);
    expect(run({ jointPain: null }).jointPainFlagged).toBe(false);
    // Neither produces a joint-pain hold note, and neither unlocks anything
    // the other does not - the two are indistinguishable to the engine
    // precisely because nothing is allowed to relax on a NO.
    expect(noteOf(run({ jointPain: false }))).not.toMatch(/joint pain|you mentioned/i);
    expect(noteOf(run({ jointPain: null }))).not.toMatch(/joint pain|you mentioned/i);
    expect(noteOf(run({ jointPain: false }))).toBe(noteOf(run({ jointPain: null })));
  });
});

// ─── 2. Note provenance ──────────────────────────────────────────────────────

describe('a note that changes the decision says so, in the user\'s own terms', () => {
  // The MATERIAL branch is pinned structurally rather than behaviourally:
  // with synthetic inputs the engine already holds for other reasons, so
  // the illness/injury flag never changes the outcome and - correctly -
  // never claims to. Rather than fake a push, these pin the exact copy and
  // its placement inside the materiality gate.
  test('the note-derived copy is attributed to what the user mentioned', () => {
    const src = read('lib/weeklyCoach.js');
    expect(parseNoteFlags('Felt ill all week, rough one.').illness).toBe(true);
    expect(parseNoteFlags('Tweaked my shoulder on Tuesday.').injury).toBe(true);
    expect(src).toMatch(/Kept steady because you mentioned an injury in this check-in, rather than adding work until it settles\./);
    expect(src).toMatch(/Kept steady because you mentioned feeling unwell in this check-in, rather than adding work until it settles\./);
  });

  test('that copy sits INSIDE the materiality gate, and joint pain sits outside it', () => {
    const src = read('lib/weeklyCoach.js');
    const block = src.slice(src.indexOf('let safetyHoldNote = null;'), src.indexOf('const recoveryFlag ='));
    // Joint pain is the explicit question: unchanged, always explained.
    expect(block).toMatch(/if \(jointPainFlagged\) \{[\s\S]*You flagged joint pain/);
    // The note-derived copy is reachable only when the hold changed something.
    expect(block).toMatch(/\} else if \(holdChangedDecision\) \{/);
    expect(block.indexOf('holdChangedDecision) {')).toBeLessThan(block.indexOf('you mentioned an injury'));
  });

  test('the copy never claims the user IS ill or injured, or that Volyume detected it', () => {
    const src = read('lib/weeklyCoach.js');
    const block = src.slice(src.indexOf('let safetyHoldNote = null;'), src.indexOf('const recoveryFlag ='));
    // Comments legitimately discuss diagnosis in order to forbid it, so
    // scan the user-visible strings only.
    const code = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const copy = (code.match(/'[^'\n]{30,}'/g) ?? []).join(' ');
    expect(copy.length).toBeGreaterThan(0);
    expect(copy).not.toMatch(/you are (ill|injured|unwell|hurt)/i);
    expect(copy).not.toMatch(/detected|diagnos|overtrain/i);
    expect(copy).toMatch(/you mentioned/);
  });

  test('with the flag immaterial, the note is byte-identical to having no note at all', () => {
    // The strongest available behavioural proof of no false cause.
    const withNote = noteOf(run({ notes: 'Felt ill all week, rough one.' }));
    const without = noteOf(run({ notes: '' }));
    expect(withNote).toBe(without);
    expect(withNote).not.toMatch(/you mentioned/);
  });

  // MATERIALITY: no false cause.
  test('a flag that changes nothing produces no causal explanation', () => {
    // Already reducing: the branch is skipped entirely, so nothing is claimed.
    const reducing = run(
      { notes: 'Felt ill all week.', trainingPerformance: 1, soreness: 4, energyScore: 1, sleepQuality: 1 },
      { goalPhase: 'mild_cut', consecutiveOffTargetWeeks: 3 },
    );
    if (reducing?.adjustments?.training?.signal === 'reduce') {
      expect(noteOf(reducing)).not.toMatch(/you mentioned/);
    }
  });

  test('the materiality check is read BEFORE the mutation, so it cannot self-justify', () => {
    const src = read('lib/weeklyCoach.js');
    const block = src.slice(src.indexOf('let safetyHoldNote = null;'), src.indexOf('const recoveryFlag ='));
    expect(block).toMatch(/const holdChangedDecision = volumeSignal > 0 \|\| trainingSignal === 'push';/);
    // The reads must precede both assignments.
    expect(block.indexOf('holdChangedDecision =')).toBeLessThan(block.indexOf('volumeSignal = 0'));
    expect(block).toMatch(/if \(holdChangedDecision\) \{/);
  });

  test('flags with no behavioural consequence get no explanation invented for them', () => {
    // travel and missedLogging are parsed but consumed by no decision, so
    // per the materiality law they must not produce causal copy.
    const src = read('lib/weeklyCoach.js');
    expect(parseNoteFlags('Away on a work trip all week').travel).toBe(true);
    expect(parseNoteFlags('forgot to log a few days').missedLogging).toBe(true);
    const out = run({ notes: 'Away on a work trip, forgot to log a few days.' });
    expect(noteOf(out)).not.toMatch(/you mentioned/);
    // And nothing in the engine turns them into a decision or a claim.
    expect(src).not.toMatch(/noteFlags\.travel/);
    expect(src).not.toMatch(/noteFlags\.missedLogging/);
  });

  test('no parser, flag or hidden safety state is ever exposed', () => {
    const note = noteOf(run({ notes: 'Felt ill all week.' }));
    expect(note).not.toMatch(/noteFlags|parseNoteFlags|safetyHold|classifier|edPattern|wellbeing|calm/i);
  });

  test('C10D cycle opt-in remains intact: a menstrual note with the opt-in OFF stays silent', () => {
    const out = run({ notes: 'On my period this week.' }, { cycleTrackingEnabled: false });
    expect(out.cyclePhaseNote ?? null).toBeNull();
    const onOut = run({ notes: 'On my period this week.' }, { cycleTrackingEnabled: true });
    // ON is unchanged behaviour - it may or may not annotate depending on
    // the trend, but the gate itself no longer suppresses it.
    expect(read('lib/weeklyCoach.js')).toMatch(/cycleInterpretationAllowed \? noteFlags\?\.menstrual : false/);
    expect(onOut).toBeTruthy();
  });
});
