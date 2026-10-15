/**
 * The logger's PR moment with a video (D229 addendum 9, items 1 and 2, under
 * the lead's rulings of 2026-10-15). Source guards (fs + regex): the screen is
 * impractical to mount whole, so the wiring is pinned where it lives; the row
 * itself is pinned in RecordLine.prMoment.test.js and the words in the clips
 * rules suites. Written to fail if:
 *   - the threshold line comes back: workoutRecordLine stays banned from the
 *     screen (D220 addendum 9, founder render verdict), the offer names no
 *     number of its own, and its ONLY maths is one detectPR call;
 *   - the offer stops judging the box as the log will: the history it reads
 *     must be the log's own (all-time sets plus this session's, working sets
 *     only), the numbers the log's own validation, the exercise argument the
 *     log's (load semantics), the dialled set's own type and evidence class;
 *   - it can speak without that history: not loaded, a failed read, or a
 *     history read for another exercise (the one render after an exercise
 *     change, before the reset runs) all mean no offer;
 *   - it shows over an earned record, on a warm-up, mid-cluster or mid-pair;
 *   - either video action shows under calm mode or an open ED flag (only an
 *     explicit false from usePhotoSuppression), or the offer shows with no
 *     room for another video;
 *   - a PR the logger makes loses its set number (all three writes), or the
 *     number stops being the one the rows and the Now card show;
 *   - Share stops opening the PR card with its video, or sends sessionData.
 * The behaviour block at the end runs the REAL validation and detectPR on the
 * synthetic set the offer builds, so the explicit eligibility gate and
 * detectPR's own cannot disagree.
 */
import fs from 'fs';
import path from 'path';
import { detectPR, isE1rmEligibleRow } from '../../lib/algorithms';
import { validateSetEntryValue, countProgressSets } from '../../lib/workoutHelpers';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');
const SHEETS = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'workout', 'session', 'SessionSheets.js'), 'utf8');

function block(startMarker, endMarker) {
  const start = SRC.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = SRC.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end + endMarker.length);
}

const OFFER = () => block('const nextSetWouldBePR = useMemo(() => {', '\n  }, [exercise, exerciseRecord, nextRowShown, isWarmupEntry, cluster, perSide, currentSet, currentEvidenceClass, units, recordOfferHistory]);');

describe('the threshold line stays gone (D220 addendum 9)', () => {
  test('workoutRecordLine is never imported, buildRecordLine never called', () => {
    expect(SRC).not.toContain("from '../lib/workoutRecordLine'");
    expect(SRC).not.toMatch(/buildRecordLine\s*\(/);
    expect(SRC).not.toContain('prTarget');
  });

  test("the offer's only maths is ONE detectPR call over the mirrored history", () => {
    const offer = OFFER();
    expect(offer.split('detectPR(').length - 1).toBe(1);
    expect(offer).toContain('return detectPR({ ...offerSet, weight: entry.weight, actualReps: entry.actualReps }, recordOfferHistory, exercise, units).length > 0;');
    expect(offer).not.toMatch(/calculate1RM|Math\.|previousValue|\.value\b/);
    // The screen as a whole: the log, the edit and the offer, nothing more.
    expect(SRC.split('detectPR(').length - 1).toBe(3);
  });

  test('the offer renders no number of its own: its words are the rule\'s, nothing computed', () => {
    expect(SRC).toContain('? { text: CLIP_STRINGS.prOfferText, actionLabel: CLIP_STRINGS.prOfferAction, a11y: CLIP_STRINGS.rowA11y, onAction: handleRecordClip }');
    const offerObject = block('const recordOffer = (', '\n    : null;');
    expect(offerObject).not.toMatch(/weight|reps|\$\{|units/);
  });
});

describe('the offer judges the box exactly as the log will', () => {
  test('the history is the log\'s own: all-time sets plus this session\'s, working sets only', () => {
    expect(SRC).toMatch(/const recordOfferHistory = useMemo\(\(\) => \[\s*\.\.\.allTimeSets\.filter\(isWorkingSetRow\),\s*\.\.\.loggedSets\.filter\(isWorkingSetRow\),\s*\], \[allTimeSets, loggedSets\]\);/);
    // The log path it mirrors.
    expect(SRC).toMatch(/const prHistory = \[\s*\.\.\.priorSets\.filter\(isWorkingSetRow\),\s*\.\.\.loggedSets\.filter\(isWorkingSetRow\),\s*\];/);
    expect(SRC).toContain('? detectPR(setData, prHistory, exercise, units) : [];');
  });

  test('the numbers through the log\'s own validation, the dialled set\'s type and evidence class, the same exercise argument', () => {
    const offer = OFFER();
    expect(offer).toContain('const offerSet = { setType: currentSet.setType, evidenceClass: currentEvidenceClass };');
    expect(offer).toContain('if (!isE1rmEligibleRow(offerSet)) return false;');
    expect(offer).toContain('const entry = validateSetEntryValue({ value: currentSet, exercise, units });');
    expect(offer).toContain('if (!entry.ok || !entry.isWeightReps || recordOfferHistory.length === 0) return false;');
    expect(SRC).toMatch(/import \{\s*detectPR,\s*bestPRPerExercise,\s*generateDeloadPrescription,\s*isE1rmEligibleRow,\s*\} from '\.\.\/lib\/algorithms';/);
  });

  test('no history, a failed read, or another exercise\'s history means no offer', () => {
    const offer = OFFER();
    expect(offer).toContain('if (!historyLoadedRef.current || historyExerciseRef.current !== exercise.id) return false;');
    expect(SRC).toContain('const historyExerciseRef = useRef(null);');
    // Cleared with the reset, set only where the read lands (after the pinned
    // lines the race guard reads, never between them).
    expect(SRC).toMatch(/setAllTimeSets\(\[\]\);\s*\n\s*historyLoadedRef\.current = false;\s*\n\s*historyExerciseRef\.current = null;/);
    expect(SRC).toMatch(/setAllTimeSets\(allTime\);\s*\n\s*historyLoadedRef\.current = true;\s*\n\s*historyExerciseRef\.current = exercise\.id;/);
    expect(SRC.split('historyExerciseRef.current = ').length - 1).toBe(2);
  });

  test('never over the row\'s own record, a warm-up, a cluster or a per-side pair in progress, or a hidden next row', () => {
    const offer = OFFER();
    expect(offer).toContain('if (!exercise?.id || exerciseRecord) return false;');
    expect(offer).toContain('if (!nextRowShown || isWarmupEntry || cluster || perSide) return false;');
    // The row's own record (null once the set that earned it is deleted).
    expect(offer).not.toContain('exerciseRecords[');
  });
});

describe('both video actions are hidden under calm mode or an open ED flag, fail closed', () => {
  test('the offer: an explicit false, and room for another video', () => {
    expect(SRC).toContain('const recordOffer = (nextSetWouldBePR && clipsSuppressed === false && !isFull(clipFlow.count))');
  });

  test('Share: an explicit false, a real record (never the first lift), and a video of that set by the one rule', () => {
    expect(SRC).toContain("const recordShareClip = (clipsSuppressed === false && exerciseRecord && exerciseRecord.type !== 'first_lift' && exercise?.id)");
    expect(SRC).toContain('? (prVideoFor(clipFlow.clips, [{ ...exerciseRecord, exerciseId: exercise.id, exerciseName: exercise.name }])?.clip ?? null)');
    expect(SRC).toContain('const recordShareAction = recordShareClip');
    expect(SRC).toContain("import { CLIP_STRINGS, isFull, prVideoFor } from '../lib/clips/rules';");
  });

  test('the row renders for a record or an offer, with both actions handed in', () => {
    expect(SRC).toContain('{exerciseRecord || recordOffer ? (');
    expect(SRC).toContain('<RecordLine record={exerciseRecord} celebrate={animateRecord} reduceMotion={!!reduceMotion} offer={recordOffer} action={recordShareAction} />');
    expect(SRC.split('<RecordLine ').length - 1).toBe(1);
  });

  test('the More row hears the same verdict as one boolean, inside its own fail-closed gate', () => {
    expect(SRC).toContain('nextSetWouldBePR={nextSetWouldBePR}');
    expect(SHEETS).toMatch(/^\s*nextSetWouldBePR,$/m);
    const row = SHEETS.slice(SHEETS.indexOf('{clipsSuppressed === false && ('), SHEETS.indexOf('{!isLastExercise && ('));
    expect(row).toContain('{clipRowDescription(clipCount, { wouldBePR: nextSetWouldBePR === true })}');
  });
});

describe('every PR the logger makes carries the set number the rows show', () => {
  test('the log path: the number before the set joins loggedSets, on the line and in the session list', () => {
    const complete = block('async function handleCompleteSet(', '\n  }\n');
    expect(complete).toContain('const shownSetNumber = countProgressSets(loggedSets) + 1;');
    expect(complete.indexOf('const shownSetNumber')).toBeLessThan(complete.indexOf('setLoggedSets(newLoggedSets);'));
    expect(complete).toContain('noteRecord(exercise.id, { ...prs[0], units, setId: setData.id, setNumber: shownSetNumber });');
    expect(complete).toContain('...prs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units, setId: setData.id, setNumber: shownSetNumber })),');
  });

  test('the edit path: the edited set\'s own number, on the line and in the session list', () => {
    const edit = block('async function handleSaveEditedSet()', '\n  }\n');
    expect(edit).toContain('const editedIndex = loggedSets.findIndex((s) => s.id === editingSet.id);');
    expect(edit).toContain('const editedSetNumber = editedIndex >= 0 ? countProgressSets(loggedSets.slice(0, editedIndex)) + 1 : undefined;');
    expect(edit).toContain('noteRecord(exercise.id, { ...editedPrs[0], units, setId: editingSet.id, setNumber: editedSetNumber });');
    expect(edit).toContain('...editedPrs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units, setId: editingSet.id, setNumber: editedSetNumber })),');
  });

  test('the same count the rows, the Now card and the video use', () => {
    expect(SRC).toContain('const workingLogged = countProgressSets(loggedSets);');
    expect(SRC).toContain('const progressNum = countProgressSets(loggedSets.slice(0, i + 1));');
    expect(SRC).toContain('`Set ${workingLogged + 1} of ${targetSets}`');
    expect(SRC).toMatch(/setNumber: workingLogged \+ 1,/);
    // Warm-ups and drop sets never move it; the stored kind-number is not it.
    const sets = [{ setType: 'warmup' }, { setType: 'straight' }, { setType: 'dropset' }, { setType: 'straight' }];
    expect(countProgressSets(sets.slice(0, 1)) + 1).toBe(1);
    expect(countProgressSets(sets) + 1).toBe(3);
  });
});

describe('Share opens the PR card with its video, and nothing else', () => {
  test('the hand-off: this record with its exercise and set, the session list led by it, the video, no sessionData', () => {
    const share = block('function handleShareRecord() {', '\n  }\n');
    expect(share).toMatch(/const prData = \{\s*\.\.\.exerciseRecord,\s*exerciseId: exercise\.id,\s*exerciseName: exercise\.name,\s*units,\s*setId: exerciseRecord\.setId,\s*setNumber: exerciseRecord\.setNumber,\s*\};/);
    expect(share).toContain('const prList = [prData, ...detectedPRs.filter((p) => p?.exerciseId !== exercise.id)];');
    expect(share).toContain("navigation.navigate('ShareCard', { workoutId: activeWorkout.id, prData, prList, clipId: recordShareClip.id, units });");
    expect(share).not.toContain('sessionData');
    expect(share).not.toMatch(/post|community|upload/i);
    expect(SRC).toContain('? { label: CLIP_STRINGS.prShareAction, a11y: CLIP_STRINGS.prShareA11y, onPress: handleShareRecord }');
  });
});

describe('behaviour: the synthetic set the offer builds, through the REAL validation and detectPR', () => {
  const bench = { id: 'bench', name: 'Bench press', exerciseType: 'weight_reps' };
  const history = [{ weight: 80, actualReps: 8, setType: 'straight' }];
  function offerSays(currentSet, exercise = bench, hist = history, evidenceClass = null) {
    const offerSet = { setType: currentSet.setType, evidenceClass };
    if (!isE1rmEligibleRow(offerSet)) return false;
    const entry = validateSetEntryValue({ value: currentSet, exercise, units: 'kg' });
    if (!entry.ok || !entry.isWeightReps || hist.length === 0) return false;
    return detectPR({ ...offerSet, weight: entry.weight, actualReps: entry.actualReps }, hist, exercise, 'kg').length > 0;
  }
  function logSays(currentSet, exercise = bench, hist = history, evidenceClass = null) {
    const v = validateSetEntryValue({ value: currentSet, exercise, units: 'kg' });
    if (!v.ok || !v.isWeightReps || hist.length === 0) return false;
    const setData = { weight: v.weight, actualReps: v.actualReps, setType: currentSet.setType, evidenceClass };
    return detectPR(setData, hist, exercise, 'kg').length > 0;
  }

  test.each([
    ['a heavier straight set, typed as text', { weight: '82.5', reps: 8, setType: 'straight' }],
    ['a lighter straight set', { weight: '70', reps: 8, setType: 'straight' }],
    ['more reps at the same weight', { weight: '80', reps: '9', setType: 'straight' }],
    ['a heavier myo-reps set (a cluster is never a record)', { weight: '90', reps: 8, setType: 'myo_reps' }],
    ['a heavier rest-pause set', { weight: '90', reps: 8, setType: 'rest_pause' }],
    ['a heavier drop set', { weight: '90', reps: 8, setType: 'dropset' }],
    ['an empty box', { weight: '', reps: 8, setType: 'straight' }],
  ])('%s: the offer and the log agree', (_name, currentSet) => {
    expect(offerSays(currentSet)).toBe(logSays(currentSet));
  });

  test('a ballistic set is never offered, as the log never awards it', () => {
    const set = { weight: '90', reps: 8, setType: 'straight' };
    expect(offerSays(set, bench, history, 'ballistic')).toBe(false);
    expect(logSays(set, bench, history, 'ballistic')).toBe(false);
  });

  test('an assistance machine inverts both alike (the exercise argument carries the load semantics)', () => {
    const assisted = { ...bench, loadSemantics: 'assisted' };
    const hist = [{ weight: 30, actualReps: 8, setType: 'straight' }];
    const lessHelp = { weight: '25', reps: 8, setType: 'straight' };
    const moreHelp = { weight: '35', reps: 8, setType: 'straight' };
    expect(offerSays(lessHelp, assisted, hist)).toBe(true);
    expect(logSays(lessHelp, assisted, hist)).toBe(true);
    expect(offerSays(moreHelp, assisted, hist)).toBe(false);
    expect(logSays(moreHelp, assisted, hist)).toBe(false);
  });

  test('no history, no offer (the first lift is never a record)', () => {
    expect(offerSays({ weight: '100', reps: 5, setType: 'straight' }, bench, [])).toBe(false);
  });

  test('a duration or distance exercise is never offered', () => {
    expect(offerSays({ weight: '500', reps: 60, setType: 'straight' }, { ...bench, exerciseType: 'distance' })).toBe(false);
  });
});
