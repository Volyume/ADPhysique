/**
 * CC33 W3 (D112 R5, closes audit findings T2-07/T2-22).
 *
 * T2-07 (S2-T2-LIVE-TRACE.md): "section 17's post-workout quiet line was
 * never built: WorkoutSummaryScreen.js (2,489 lines) has one match for
 * capability|constraint|restriction|temporary, at :1857, unrelated
 * share-card prose. A session that dropped or substituted work ends
 * unacknowledged."
 * T2-22: "session_constraint_effects is written ... every reader is
 * non-visual ... No screen renders a persisted effect."
 *
 * This suite pins:
 *  1. buildConstraintSummaryLine's real output for every count combination
 *     (substituted-only, omitted-only, both, neither) - executed for real
 *     via source extraction, not just string-matched, because the function
 *     is pure and self-contained (no require, no closures).
 *  2. The effects-reading useEffect is keyed ONLY on [user?.id, workoutId] -
 *     never gated on `readOnly` - so the line reaches a history reopen, not
 *     only the live finish flow (WorkoutSummaryScreen is reachable from
 *     history too; the brief explicitly ruled out separate history work).
 *  3. Best-effort: the whole read sits behind one try/catch with no
 *     re-throw and no logged error line - a failure renders nothing.
 *  4. Detail-list names never fall back to the raw id (T2-22's "resolve
 *     names via getAllExercises... fall back to the raw id never").
 *  5. The render is independent of showProgressLink/showCoachLink (which
 *     are readOnly-gated) and links to the 'HowYouTrain' route.
 *
 * ActiveWorkoutScreen.nextExerciseButton.guard.test.js precedent: this
 * screen's own real data loads (SQLite, wellbeing, mesocycle week) make a
 * full render harness fragile, so these are byte-level / extracted-and-
 * executed checks against the real source.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'WorkoutSummaryScreen.js'),
  'utf8',
);

describe('buildConstraintSummaryLine - real execution, extracted from source', () => {
  function loadBuildConstraintSummaryLine() {
    const start = SRC.indexOf('function buildConstraintSummaryLine(substituted, omitted, userChosen = 0) {');
    expect(start).toBeGreaterThan(-1);
    const end = SRC.indexOf('\n}\n', start) + 2;
    expect(end).toBeGreaterThan(start);
    const body = SRC.slice(start, end);
    // Pure and self-contained (no require, no outer closure) - safe to
    // execute directly, unlike this screen's I/O-touching functions.
    expect(body).not.toContain('require(');
    // eslint-disable-next-line no-new-func
    return new Function(`${body}\nreturn buildConstraintSummaryLine;`)();
  }

  const buildConstraintSummaryLine = loadBuildConstraintSummaryLine();

  test('substitutions only, singular', () => {
    expect(buildConstraintSummaryLine(1, 0)).toBe(
      'Today worked around your temporary change: 1 exercise swapped for one that works right now.',
    );
  });

  test('substitutions only, plural', () => {
    expect(buildConstraintSummaryLine(2, 0)).toBe(
      'Today worked around your temporary change: 2 exercises swapped for ones that work right now.',
    );
  });

  test('omissions only, singular', () => {
    expect(buildConstraintSummaryLine(0, 1)).toBe(
      'Today worked around your temporary change: 1 exercise left out, with nothing forced in their place.',
    );
  });

  test('omissions only, plural', () => {
    expect(buildConstraintSummaryLine(0, 3)).toBe(
      'Today worked around your temporary change: 3 exercises left out, with nothing forced in their place.',
    );
  });

  test('both substituted and omitted uses the compact combined line', () => {
    expect(buildConstraintSummaryLine(2, 1)).toBe(
      'Today worked around your temporary change: 2 swapped, 1 left out.',
    );
  });

  test('neither: null, so the caller renders nothing', () => {
    expect(buildConstraintSummaryLine(0, 0)).toBeNull();
  });

  // Round 11 (R11-1): when any swapped slot holds the USER's own pick,
  // "for one that works right now" would attribute their choice to the
  // app - the neutral sentence states the count and the detail lines say
  // whose pick each one was.
  test('any user-chosen swap switches to the neutral sentence, singular and plural', () => {
    expect(buildConstraintSummaryLine(1, 0, 1)).toBe(
      'Today worked around your temporary change: 1 exercise swapped.',
    );
    expect(buildConstraintSummaryLine(2, 0, 1)).toBe(
      'Today worked around your temporary change: 2 exercises swapped.',
    );
  });

  test('the combined line is already neutral, so user-chosen swaps leave it unchanged', () => {
    expect(buildConstraintSummaryLine(2, 1, 2)).toBe(
      'Today worked around your temporary change: 2 swapped, 1 left out.',
    );
  });
});

describe('the constraint-effects read is reachable from BOTH the live finish flow and history (T2-07)', () => {
  const effectStart = SRC.indexOf("closes audit T2-07/T2-22): read the session's durable");
  const effectEnd = SRC.indexOf("}, [user?.id, workoutId]);", effectStart) + "}, [user?.id, workoutId]);".length;
  const effectBlock = (effectStart >= 0 && effectEnd > effectStart) ? SRC.slice(effectStart, effectEnd) : '';

  test('the effect block was actually located', () => {
    expect(effectBlock.length).toBeGreaterThan(0);
  });

  test('keyed ONLY on user?.id and workoutId - never gated on readOnly', () => {
    expect(effectBlock).toContain('if (!user?.id || !workoutId) return;');
    expect(effectBlock).not.toMatch(/readOnly/);
    expect(effectBlock.trim().endsWith('}, [user?.id, workoutId]);')).toBe(true);
  });

  test('reads getSessionConstraintEffect(user.id, workoutId), imported from ../lib/database', () => {
    expect(SRC).toMatch(/getSessionConstraintEffect,\s*\n\} from '\.\.\/lib\/database';/);
    expect(effectBlock).toContain('const record = await getSessionConstraintEffect(user.id, workoutId);');
  });

  test('best-effort: one try/catch, no crash, no error line', () => {
    expect(effectBlock).toMatch(/} catch \(_e\) \{ \/\* best-effort: no line, no crash \*\/ \}/);
    expect(effectBlock).not.toContain('logError');
    expect(effectBlock).not.toContain('toast.show');
  });

  test('an empty or missing effects array bails before any name resolution', () => {
    expect(effectBlock).toContain("if (!Array.isArray(effects) || !effects.length) return;");
  });

  test('counts come from the effects array itself, not the name-resolved detail list', () => {
    expect(effectBlock).toContain('if (!substituted && !omitted) return;');
    expect(effectBlock).toContain('setConstraintEffect({ substituted, omitted, userChosen, lines });');
  });

  test('R11-1: an amended entry is counted as the user\'s own and only live effects are read (revoked forms match nothing)', () => {
    expect(effectBlock).toContain('if (entry.toChosenByUser) userChosen += 1;');
    // Strict equality matching is the revocation contract: a renamed
    // *_revoked entry falls through both branches and renders nowhere.
    expect(effectBlock).toContain("if (entry?.effect === 'substituted') {");
    expect(effectBlock).toContain("} else if (entry?.effect === 'omitted') {");
  });
});

describe('detail-list names resolve via getAllExercises and never fall back to the raw id (T2-22)', () => {
  const effectStart = SRC.indexOf("closes audit T2-07/T2-22): read the session's durable");
  const effectEnd = SRC.indexOf("}, [user?.id, workoutId]);", effectStart) + "}, [user?.id, workoutId]);".length;
  const effectBlock = SRC.slice(effectStart, effectEnd);

  test('a substituted entry needs BOTH names resolved before it is listed, and says whose pick stood', () => {
    expect(effectBlock).toContain('if (fromName && toName) {');
    // Round 11 (R11-1): the app's wording never renders over the user's
    // own swap - an amended entry gets the user-attributed line.
    expect(effectBlock).toContain("text: entry.toChosenByUser ? `You chose ${toName} in for ${fromName}` : `${toName} in for ${fromName}`,");
  });

  test('an omitted entry needs its own name resolved before it is listed', () => {
    expect(effectBlock).toContain('if (fromName) {');
    expect(effectBlock).toContain("text: `${fromName} left out`");
  });

  test('never interpolates the raw exerciseFrom/exerciseTo id into a detail line', () => {
    expect(effectBlock).not.toMatch(/text: `.*exerciseFrom.*`/);
    expect(effectBlock).not.toMatch(/text: `.*exerciseTo.*`/);
  });
});

describe('the render: one quiet line, secondary text style, independent of readOnly-gated links, with a How you train link', () => {
  test('gated on constraintEffect alone - a sibling conditional to showProgressLink/showCoachLink, not nested inside it', () => {
    const showLinksIdx = SRC.indexOf('{(showProgressLink || showCoachLink) && (');
    const showLinksCloseIdx = SRC.indexOf(')}', showLinksIdx) + 2;
    const constraintIdx = SRC.indexOf('{constraintEffect ? (');
    expect(showLinksIdx).toBeGreaterThan(-1);
    expect(constraintIdx).toBeGreaterThan(showLinksCloseIdx); // sibling, after the links block closes
  });

  test('secondary text style (bodySm + textSecondary, adjustedSummaryText\'s exact pairing), never a bordered banner', () => {
    expect(SRC).toContain('constraintEffectLine: { ...type.bodySm, color: colors.textSecondary },');
    expect(SRC).toContain('constraintEffectLine: { ...t.type.bodySm, color: t.colors.textSecondary },');
    // No backgroundColor/borderWidth on the line's own container - the
    // banner treatment this line must never take.
    expect(SRC).toContain('constraintEffectSection: { gap: spacing.xs },');
  });

  test('the "What changed" toggle only renders when there is a resolved detail line to show', () => {
    expect(SRC).toContain('{constraintEffect.lines.length > 0 && (');
    expect(SRC).toContain("{constraintDetailExpanded ? 'Hide what changed' : 'What changed'}");
  });

  test('the link navigates to the HowYouTrain route, RT2-2 naming', () => {
    expect(SRC).toContain("onPress={() => navigation.navigate('HowYouTrain')}");
    expect(SRC).toContain('accessibilityLabel="How you train"');
  });
});
