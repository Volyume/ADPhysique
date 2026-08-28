/**
 * CC33 W3 (D112 R5, closes audit finding T2-06).
 *
 * T2-06 (S2-T2-LIVE-TRACE.md): "section 33.14's 'unusually reduced' banner
 * exists only at generation preview (PlanUpdateScreen.js:509-512).
 * ActiveWorkoutScreen has no session-level equivalent (grep: only
 * planAutoGen.js:764-771 + PlanUpdateScreen). A husk session is served with
 * no leading signal."
 *
 * This suite pins:
 *  1. The count is derived exactly where the audit named it - inside the
 *     serve-time effect (~line 700, applyEffectiveViewToSession), from
 *     `baseRows.length - served.length`, AFTER the `served === baseRows`
 *     ("nothing applied") early return - never recomputed elsewhere, never
 *     guessed from a different signal.
 *  2. It only sets state when omitted > 0 (a substituted-only session,
 *     where served.length stays equal to baseRows.length, sets nothing).
 *  3. The count resets ONLY on a genuinely new session (activeWorkout?.id
 *     changing) - never on the same effect's own re-run from writing
 *     workoutExercises (which would erase the count the instant after
 *     setting it - the exact bug a naive top-of-effect reset would cause).
 *  4. Rendered once, at the top of the outline area (between WorkoutHeader
 *     and WorkoutOutline), singular/plural copy exact, quiet text style
 *     (caption + textMuted), never a bordered banner.
 *
 * ActiveWorkoutScreen.js is a huge screen with a live dependency surface;
 * matching this file's own existing convention
 * (ActiveWorkoutScreen.nextExerciseButton.guard.test.js), these are byte-
 * level checks against the real source.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

const effectStart = SRC.indexOf("closes audit T2-06): the session-level \"unusually");
const effectEnd = SRC.indexOf('}, [user?.id, activeWorkout?.id, workoutExercises.length]);', effectStart)
  + '}, [user?.id, activeWorkout?.id, workoutExercises.length]);'.length;
const BLOCK = (effectStart >= 0 && effectEnd > effectStart) ? SRC.slice(effectStart, effectEnd) : '';

describe('the omittedSessionCount state and its reset (T2-06)', () => {
  test('the combined block was actually located', () => {
    expect(BLOCK.length).toBeGreaterThan(0);
  });

  test('state declared with a safe default of 0', () => {
    expect(BLOCK).toContain('const [omittedSessionCount, setOmittedSessionCount] = useState(0);');
  });

  test('a SEPARATE effect resets it, keyed only on activeWorkout?.id - never on workoutExercises.length', () => {
    expect(BLOCK).toMatch(
      /useEffect\(\(\) => \{\s*setOmittedSessionCount\(0\);\s*\}, \[activeWorkout\?\.id\]\);/,
    );
    // The reset effect must be its own hook, not folded into the serve-time
    // effect's dependency array (that would erase the count on every
    // re-run the serve effect itself causes by writing workoutExercises).
    const resetEffectEnd = BLOCK.indexOf('}, [activeWorkout?.id]);') + '}, [activeWorkout?.id]);'.length;
    const serveEffectStart = BLOCK.indexOf('useEffect(() => {\n    let cancelled = false;');
    expect(serveEffectStart).toBeGreaterThan(resetEffectEnd);
  });
});

describe('the count computation sits inside the real serve-time effect, after the "nothing applied" bail (T2-06)', () => {
  test('computed from baseRows.length - served.length, only set when positive', () => {
    expect(BLOCK).toContain('const omitted = baseRows.length - served.length;');
    expect(BLOCK).toContain('if (omitted > 0) setOmittedSessionCount(omitted);');
  });

  test('placed AFTER the served === baseRows early return, so a no-op session never fires it', () => {
    const bailIdx = BLOCK.indexOf('if (served === baseRows) return; // nothing applied');
    const omittedIdx = BLOCK.indexOf('const omitted = baseRows.length - served.length;');
    expect(bailIdx).toBeGreaterThan(-1);
    expect(omittedIdx).toBeGreaterThan(bailIdx);
  });

  test('placed BEFORE the servedEntries rebuild - the count reflects the raw serve, not the rebuilt list', () => {
    const omittedIdx = BLOCK.indexOf('const omitted = baseRows.length - served.length;');
    const entriesIdx = BLOCK.indexOf('const servedEntries = [];');
    expect(entriesIdx).toBeGreaterThan(omittedIdx);
  });

  test('this IS the single real applyEffectiveViewToSession call site, not a second parallel computation', () => {
    const callSites = SRC.match(/applyEffectiveViewToSession\(/g) ?? [];
    expect(callSites.length).toBe(1);
  });
});

describe('render: once per session, at the top of the outline area, quiet text (T2-06)', () => {
  test('sits between WorkoutHeader and WorkoutOutline', () => {
    const headerIdx = SRC.indexOf('showFinish={!(targetComplete && !extraSetArmed && isLastExercise)}\n        />');
    const noteIdx = SRC.indexOf('{omittedSessionCount > 0 ? (');
    const outlineIdx = SRC.indexOf('<WorkoutOutline');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(noteIdx).toBeGreaterThan(headerIdx);
    expect(outlineIdx).toBeGreaterThan(noteIdx);
  });

  test('exact singular/plural copy', () => {
    expect(SRC).toContain("? 'One exercise is left out of this session while your change lasts.'");
    expect(SRC).toContain('`${omittedSessionCount} exercises are left out of this session while your change lasts.`');
  });

  test('quiet style: caption + textMuted, matching swapNote\'s register - not a bordered/tinted banner', () => {
    expect(SRC).toContain(
      "omittedSessionNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxs },",
    );
    expect(SRC).toContain('omittedSessionNote: { ...t.type.caption, color: t.colors.textMuted },');
    // No backgroundColor/borderColor anywhere in that style declaration line.
    const styleLine = SRC.split('\n').find((l) => l.trim().startsWith('omittedSessionNote: { ...type.caption'));
    expect(styleLine).not.toMatch(/backgroundColor|borderColor|borderWidth/);
  });
});
