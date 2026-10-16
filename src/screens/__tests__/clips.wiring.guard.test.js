/**
 * Where the video rows are wired in (D229 addendum 5 and the founder's additions). Source
 * guards (fs + regex): the three big screens are impractical to mount whole, so
 * the wiring is pinned where it lives, and the behaviour is pinned in the
 * suites for the pieces (rules, store, recorder hook, camera, More sheet,
 * history row). Written to fail if a row moves, loses its gate, or is cut off:
 *   - ClipCamera is a registered route in EVERY stack that registers a screen
 *     that can open it (ActiveWorkout, WorkoutSummary, ShareCard), because
 *     React Navigation drops a navigate() to an unregistered name in silence;
 *   - ActiveWorkoutScreen reads usePhotoSuppression for the More row and only
 *     passes props and a handler (the camera is not imported there);
 *   - the summary row is a NavRow in the scroll body above "Save this workout
 *     to reuse", gated by the fail-closed rule, never in the footer, and its
 *     share hand-off keeps the one pinned ShareCard call;
 *   - the summary row's PR form (D229 addendum 9) reads the SAME PR list the
 *     share hand-off sends (sharePRs, worked out once at component scope), so
 *     the video it names is paired on the share screen with a PR it was given;
 *   - the history row sits in the expanded detail and reads no suppression.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const NAV = read('navigation/RootNavigator.js');
const ACTIVE = read('screens/ActiveWorkoutScreen.js');
const SUMMARY = read('screens/WorkoutSummaryScreen.js');
const HISTORY = read('screens/WorkoutHistoryScreen.js');

function stackBodies() {
  const out = [];
  const re = /\nfunction (\w+Stack)\(/g;
  let m;
  while ((m = re.exec(NAV)) !== null) {
    const start = m.index;
    const next = NAV.indexOf('\nfunction ', start + 1);
    out.push([m[1], NAV.slice(start, next === -1 ? NAV.length : next)]);
  }
  return out;
}

describe('RootNavigator: the ClipCamera route', () => {
  const stacks = stackBodies();

  test('the stack scan finds the stacks (a broken scan must not pass as clean)', () => {
    expect(stacks.length).toBeGreaterThanOrEqual(6);
  });

  test('it is a lazy screen like every other', () => {
    expect(NAV).toContain("const ClipCameraScreen = lazyScreen(() => require('../screens/ClipCameraScreen').default);");
  });

  test('every stack that registers a screen that opens it registers it too', () => {
    const openers = ['ActiveWorkout', 'WorkoutSummary', 'ShareCard'];
    const needing = stacks.filter(([, body]) => openers.some((o) => body.includes(`name="${o}"`)));
    expect(needing.map(([n]) => n).sort()).toEqual(['HomeStack', 'ProfileStack', 'ProgressStack']);
    for (const [name, body] of needing) {
      expect({ name, registered: body.includes('name="ClipCamera"') }).toEqual({ name, registered: true });
    }
  });

  test('full screen, and no swipe-back that could end a recording by accident', () => {
    const registrations = NAV.match(/<Stack\.Screen name="ClipCamera"[^>]*\/>/g) || [];
    expect(registrations).toHaveLength(3);
    for (const r of registrations) {
      expect(r).toContain('headerShown: false');
      expect(r).toContain('gestureEnabled: false');
    }
  });
});

describe('ActiveWorkoutScreen: "Film" is a footer action on the exercise card, for every set (addendum 11)', () => {
  const CARD = read('components/workout/session/ExerciseSection.js');
  const SHEETS = read('components/workout/session/SessionSheets.js');

  test('the screen reads usePhotoSuppression for the signed-in user and hands the card onFilm only on an explicit false (fail closed)', () => {
    expect(ACTIVE).toContain("import usePhotoSuppression from '../hooks/usePhotoSuppression';");
    expect(ACTIVE).toContain('const clipsSuppressed = usePhotoSuppression(user?.id);');
    expect(ACTIVE).toContain('onFilm={clipsSuppressed === false ? handleRecordClip : null}');
  });

  test('the card draws Film beside Add set and Swap with the words from the one rule, and nothing when onFilm is withheld', () => {
    expect(CARD).toMatch(/\{onFilm \? \(\s*<FooterAction\s+testID="volyume-btn-film-set"\s+icon="videocam-outline"\s+label=\{CLIP_STRINGS\.filmLabel\}\s+accessibilityLabel=\{CLIP_STRINGS\.rowA11y\}\s+onPress=\{onFilm\}/);
    expect(CARD).toContain("import { CLIP_STRINGS } from '../../../lib/clips/rules';");
  });

  test('the More sheet carries no video row any more: one quiet place, the footer', () => {
    expect(SHEETS).not.toMatch(/clips\/rules|handleRecordClip|clipsSuppressed|videocam-outline/);
  });

  test('the handler films the next pending set, the number the Now card shows', () => {
    expect(ACTIVE).toMatch(/function handleRecordClip\(\) \{\s*clipFlow\.openRecorder\(\{\s*source: 'workout',\s*exerciseId: exercise\?\.id \?\? null,\s*exerciseName: exercise\?\.name \?\? null,\s*setNumber: workingLogged \+ 1,/);
  });
});
describe('WorkoutSummaryScreen: the video row, in its two forms', () => {
  const rowAt = SUMMARY.indexOf('label={clipRowCopy.label}');
  const saveAt = SUMMARY.indexOf('title="Save this workout to reuse"');
  const footerAt = SUMMARY.indexOf('<View style={[styles.stickyFooter');
  const rowSource = () => SUMMARY.slice(SUMMARY.lastIndexOf('<NavRow', rowAt), SUMMARY.indexOf('/>', rowAt) + 2);

  test('a NavRow in the scroll body, above "Save this workout to reuse" and well before the sticky footer', () => {
    expect(rowAt).toBeGreaterThan(-1);
    expect(saveAt).toBeGreaterThan(rowAt);
    expect(footerAt).toBeGreaterThan(saveAt);
    expect(SUMMARY).toContain("import { NavRow, NavGroup } from '../components/NavRow';");
    expect(rowSource()).toContain('icon="videocam-outline"');
    expect(rowSource()).toContain('sub={clipRowCopy.sub}');
  });

  test("its words come from the one rule, and change with the workout's videos and its PRs", () => {
    expect(SUMMARY).toContain('const clipRowCopy = summaryClipRowCopy(clipFlow.clips, sharePRs);');
    expect(SUMMARY).toContain("import { CLIP_STRINGS, summaryClipRowCopy, summaryClipRowVisible } from '../lib/clips/rules';");
  });

  test('the PR list it reads is the one the share hand-off sends, worked out once', () => {
    // Exactly one sharePRs, at component scope (two-space indent), above both
    // readers; handleShareCard no longer works out its own.
    const decl = 'const sharePRs = readOnly ? historyPRs : detectedPRs;';
    expect(SUMMARY.split(decl).length - 1).toBe(1);
    expect(SUMMARY).toContain(`\n  ${decl}\n`);
    const declAt = SUMMARY.indexOf(decl);
    const shareAt = SUMMARY.indexOf('function handleShareCard() {');
    const shareEnd = SUMMARY.indexOf('\n  }\n', shareAt);
    expect(declAt).toBeLessThan(shareAt);
    expect(SUMMARY.slice(shareAt, shareEnd)).not.toMatch(/const sharePRs\b/);
    expect(SUMMARY.slice(shareAt, shareEnd)).toContain('prList: sharePRs');
    expect(declAt).toBeLessThan(SUMMARY.indexOf('const clipRowCopy = summaryClipRowCopy(clipFlow.clips, sharePRs);'));
    // A tap on the PR form hands over the video it names, through the same
    // pinned hand-off (the share screen pairs it with its PR).
    expect(SUMMARY).toContain('handleUseClip(clipRowCopy.newest.id)');
  });

  test('with no video a tap records on the summary; with one it hands the newest to the share screen', () => {
    expect(rowSource()).toContain('clipRowCopy.newest');
    expect(rowSource()).toContain('handleUseClip(clipRowCopy.newest.id)');
    expect(rowSource()).toContain("clipFlow.openRecorder({ source: 'summary' })");
  });

  test('the footer is untouched: no video control beside Done and Share', () => {
    const footer = SUMMARY.slice(footerAt, SUMMARY.indexOf('{/* Template name prompt.'));
    expect(footer).not.toMatch(/clip|video/i);
  });

  test("gated by the fail-closed rule over the screen's own settled calm and flag read, the read-only flag and a Share to use", () => {
    expect(SUMMARY).toMatch(/summaryClipRowVisible\(\{\s*readOnly, workoutId, settled: calmKnown, suppressed: calmSuppressed, shareable: displayWorkingSets > 0,\s*\}\)/);
    // calmKnown / calmSuppressed are set only from the raw wellbeing + open-flag reads.
    expect(SUMMARY).toMatch(/calm = isCalm\(mode\) \|\| mode === 'read_failed';/);
    expect(SUMMARY).toMatch(/const suppressed = calm \|\| !!edFlag;/);
  });

  test('the share hand-off keeps its one pinned call and adds the video id only when one was chosen', () => {
    expect(SUMMARY).toMatch(/navigation\.navigate\('ShareCard', \{ sessionData, workoutId, prData, prList: sharePRs \}\);/);
    expect(SUMMARY).toContain("navigation.navigate('ShareCard', { sessionData, workoutId, prData, prList: sharePRs, clipId });");
    expect(SUMMARY).toContain('function handleShareCard() {');
    expect(SUMMARY).toContain('const returnedClipId = route.params?.clipId ?? null;');
    expect(SUMMARY).toContain('navigation.setParams({ clipId: undefined });');
    // A history reopen never opens the share screen from a returned video;
    // with no Share to open, the summary says "saved" itself (the camera
    // shows no toast for this source: the video is about to be on screen).
    expect(SUMMARY).toContain('if (!readOnly && displayWorkingSets > 0) { handleUseClip(returnedClipId); return; }');
    expect(SUMMARY).toMatch(/toast\.show\(CLIP_STRINGS\.saved, \{\s*variant: 'undo',/);
  });

  test('the sheets render once', () => {
    expect(SUMMARY.split('{clipFlow.sheets}').length - 1).toBe(1);
  });
});

describe('WorkoutHistoryScreen: the Videos row', () => {
  test('sits in the expanded detail, before "View summary", keyed to the workout', () => {
    const rowAt = HISTORY.indexOf('<HistoryClipsRow userId={user?.id} workoutId={workout.id} />');
    expect(rowAt).toBeGreaterThan(-1);
    const expandedAt = HISTORY.indexOf('{/* Expanded detail */}');
    expect(rowAt).toBeGreaterThan(expandedAt);
    expect(rowAt).toBeLessThan(HISTORY.indexOf('{/* View summary */}', rowAt));
    expect(HISTORY.split('<HistoryClipsRow').length - 1).toBe(1);
  });

  test('the screen reads no suppression for it: viewing and deleting your own clips is never withheld', () => {
    expect(HISTORY).not.toMatch(/usePhotoSuppression|useSafetyState|safetyState|getOpenEdPatternFlag/);
  });
});
