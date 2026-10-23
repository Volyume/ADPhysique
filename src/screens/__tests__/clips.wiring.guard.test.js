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
    // RE-POINTED (D231, app layout rework batch 2): Train opens WorkoutSummary
    // (Recent sessions), so PlansStack registers it and ShareCard, and therefore
    // ClipCamera, like ProgressStack does.
    // RE-POINTED (D231, batch 4): the Progress stack is retired; the Coach stack
    // (ProfileStack) carries WorkoutSummary and ShareCard, so three stacks need it.
    expect(needing.map(([n]) => n).sort()).toEqual(['HomeStack', 'PlansStack', 'ProfileStack']);
    for (const [name, body] of needing) {
      expect({ name, registered: body.includes('name="ClipCamera"') }).toEqual({ name, registered: true });
    }
  });

  test('full screen, and no swipe-back that could end a recording by accident', () => {
    const registrations = NAV.match(/<Stack\.Screen name="ClipCamera"[^>]*\/>/g) || [];
    expect(registrations).toHaveLength(3); // D231 (batch 4): was 4 with the Progress stack
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

  test('the More sheet carries no record row: one quiet place to film, the footer', () => {
    expect(SHEETS).not.toMatch(/clips\/rules|handleRecordClip|clipsSuppressed|filmLabel/);
  });

  test('addendum 14: the exercise options sheet has a "Your videos · N" door, only once there is one to find, that opens the videos sheet', () => {
    expect(SHEETS).toMatch(/\{clipCount > 0 && onOpenClips \? \(\s*<TouchableOpacity[\s\S]*?onPress=\{\(\) => \{ setShowOverflow\(false\); onOpenClips\(\); \}\}[\s\S]*?accessibilityLabel=\{`Your videos, \$\{clipCount\}`\}[\s\S]*?testID="volyume-row-your-videos"[\s\S]*?name="videocam-outline"[\s\S]*?\{`Your videos · \$\{clipCount\}`\}/);
    // The door sits above Remove exercise, the sheet's last and destructive row.
    expect(SHEETS.indexOf('testID="volyume-row-your-videos"')).toBeLessThan(SHEETS.indexOf('accessibilityLabel="Remove exercise from workout"'));
    // The logger hands it the count and the opener ALWAYS: viewing, keeping
    // and deleting your own videos is never withheld (calm mode and an open
    // ED flag included). Only Film keeps the explicit-false gate.
    expect(ACTIVE).toContain('clipCount={clipFlow.count}');
    expect(ACTIVE).toContain('onOpenClips={() => clipFlow.openClips()}');
    expect(ACTIVE).not.toContain('clipCount={clipsSuppressed');
    expect(ACTIVE).not.toContain('onOpenClips={clipsSuppressed');
    expect(ACTIVE).toContain('onFilm={clipsSuppressed === false ? handleRecordClip : null}');
    expect(SHEETS).toMatch(/NEVER withheld by calm mode or an open ED flag/);
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

  test('addendum 14: with a video the share can use, the footer Share steps up (secondary, plain "Share") behind the same calm and flag gate as the row, and always opens the normal share screen', () => {
    expect(SUMMARY).toMatch(/const videoReadyForShare = !!clipRowCopy\.newest && summaryClipRowVisible\(\{\s*readOnly, workoutId, settled: calmKnown, suppressed: calmSuppressed, shareable: displayWorkingSets > 0,\s*\}\);/);
    // Founder 2026-10-17: the label is always plain "Share".
    expect(SUMMARY).toMatch(/title="Share"\s+icon="share-social-outline"/);
    expect(SUMMARY).not.toContain('Share with your video');
    expect(SUMMARY).toMatch(/variant=\{videoReadyForShare \? 'secondary' : 'tertiary'\}/);
    // Founder 2026-10-17: the footer button ALWAYS opens the normal share
    // screen; it never pre-selects a set video (the video row may).
    const footer = SUMMARY.slice(SUMMARY.indexOf('testID="summary-share-footer"') - 900, SUMMARY.indexOf('testID="summary-share-footer"'));
    expect(footer).toMatch(/onPress=\{handleShareCard\}/);
    expect(footer).not.toContain('handleUseClip');
    // Done stays the one primary: the share never becomes a second amber.
    expect(SUMMARY).not.toMatch(/variant=\{videoReadyForShare \? 'primary'/);
  });

  test("its words come from the one rule, and change with the workout's videos and its PRs", () => {
    expect(SUMMARY).toContain('const clipRowCopy = summaryClipRowCopy(clipFlow.clips, sharePRs);');
    expect(SUMMARY).toMatch(/import \{\s*CLIP_STRINGS, KEEP_DAYS_KEY, savedLine, summaryClipRowCopy, summaryClipRowVisible,\s*\} from '\.\.\/lib\/clips\/rules';/);
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

  test('the footer gains no third control: Done and Share only, and no recorder from here (addendum 14 changes Share, never adds a button)', () => {
    const footer = SUMMARY.slice(footerAt, SUMMARY.indexOf('{/* Template name prompt.'));
    expect(footer.match(/<Button/g)).toHaveLength(2);
    expect(footer).not.toMatch(/openRecorder|handleRecordClip|clipFlow\./);
    expect(footer).toContain('videoReadyForShare');
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
    // The summary's own saved toast reads the person's keep setting first and
    // says where the video is from HERE (under the workout in History).
    expect(SUMMARY).toMatch(/AsyncStorage\.getItem\(KEEP_DAYS_KEY\)[\s\S]*?toast\.show\(savedLine\(raw, \{ place: 'summary' \}\), \{\s*variant: 'undo',/);
    expect(SUMMARY).not.toContain('toast.show(CLIP_STRINGS.saved,');
  });

  test('the footer Share: the video form takes the secondary variant\'s own look (no amber overrides), at a named width floor', () => {
    expect(SUMMARY).toMatch(/style=\{videoReadyForShare \? styles\.shareFooterBtnVideo : \[styles\.shareFooterBtn, live\.shareFooterBtn\]\}/);
    expect(SUMMARY).toMatch(/textStyle=\{videoReadyForShare \? undefined : \[styles\.shareFooterBtnText, live\.shareFooterBtnText\]\}/);
    const video = SUMMARY.slice(SUMMARY.indexOf('shareFooterBtnVideo: {'), SUMMARY.indexOf('exerciseList: {'));
    expect(video).not.toMatch(/borderColor|backgroundColor|primary/);
    expect(SUMMARY).toContain('const SHARE_FOOTER_MIN_WIDTH = spacing.xxxl * 2;');
    expect(SUMMARY).not.toMatch(/minWidth: 108/);
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

// D229 addendum 15 (the founder: videos must not fill the phone): the keep
// window's wiring, outside the clip store's own suite.
describe('addendum 15: the keep window is wired in', () => {
  const HOME = read('screens/HomeScreen.js');
  const SETTINGS = read('screens/SettingsDataScreen.js');
  const POLICY = read('screens/PrivacyPolicyScreen.js');

  test('Home sweeps the expired videos once per session, off the critical path, best effort', () => {
    expect(HOME).toMatch(/require\('\.\.\/lib\/clips\/store'\)\.sweepExpiredClips\(user\.id\)\.catch\(/);
  });

  test('the summary keeps a PR set\'s video through the store once its PRs and videos are known, never in read-only', () => {
    expect(SUMMARY).toMatch(/if \(!user\?\.id \|\| !workoutId \|\| readOnly \|\| !clipFlow\.clips\?\.length \|\| !sharePRs\?\.length\) return;[\s\S]*?keepClipsForPRs\(user\.id, workoutId, sharePRs\)/);
  });

  test('Settings > Your data has the Workout videos section: the size, the keep choices as a radio group, Delete all videos with one confirm', () => {
    expect(SETTINGS).toContain('<SectionHeader title="Workout videos" />');
    expect(SETTINGS).toContain('label={CLIP_STRINGS.settingsVideosLabel}');
    // The keep choices use SettingsDisplayScreen's segment pattern: a title
    // and a sub above one segment container of chips, in StyleSheet.create
    // with live mirrors; no loose chips under an inert row.
    expect(SETTINGS).toMatch(/accessibilityRole="radiogroup"\s*accessibilityLabel=\{CLIP_STRINGS\.settingsKeepLabel\}/);
    expect(SETTINGS).toMatch(/\{CLIP_STRINGS\.settingsKeepLabel\}<\/Text>\s*<Text style=\{\[localStyles\.sub, liveText\.sub\]\}>\{settingsKeepSub\(keepDays \?\? DEFAULT_KEEP_DAYS\)\}/);
    expect(SETTINGS).toMatch(/const localStyles = StyleSheet\.create\(\{[\s\S]*segment: \{[\s\S]*segChip: \{[\s\S]*segLabel:/);
    expect(SETTINGS).not.toMatch(/label=\{CLIP_STRINGS\.settingsKeepLabel\}/);
    expect(SETTINGS).toMatch(/KEEP_OPTIONS\.map\(\(days\) => \([\s\S]*?onPress=\{\(\) => chooseKeepDays\(days\)\}[\s\S]*?accessibilityRole="radio"/);
    expect(SETTINGS).toMatch(/await setKeepDays\(days\);\s*setKeepDaysState\(days\);\s*await sweepExpiredClips\(user\?\.id, \{ force: true \}\);/);
    // A shorter window counts what it would remove NOW and asks first; the
    // chips show the new choice only once it is saved (no optimistic write).
    expect(SETTINGS).toMatch(/const shorter = days !== 0 && \(keepDays == null \|\| keepDays === 0 \|\| days < keepDays\);/);
    expect(SETTINGS).toMatch(/countExpiredClips\(user\?\.id, \{ keepDays: days \}\)[\s\S]*?appAlert\(removeNowTitle\(count\), removeNowBody\(count, days\)[\s\S]*?CLIP_STRINGS\.removeNowCancel[\s\S]*?CLIP_STRINGS\.removeNowConfirm, style: 'destructive'[\s\S]*?saveKeepDays\(days\)/);
    expect(SETTINGS).not.toMatch(/haptics\.selection\(\);\s*setKeepDaysState/);
    // Delete all at zero is inert: no arrow, no press, and it says why.
    expect(SETTINGS).toMatch(/showArrow=\{!deletingVideos && !!videos\?\.count\}/);
    expect(SETTINGS).toContain('onPress={deletingVideos || !videos?.count ? null : handleDeleteAllVideos}');
    expect(SETTINGS).toContain('videos?.count === 0 ? CLIP_STRINGS.settingsDeleteAllNone : CLIP_STRINGS.settingsDeleteAllSub');
    expect(SETTINGS).toMatch(/appAlert\(CLIP_STRINGS\.deleteAllConfirmTitle, CLIP_STRINGS\.deleteAllConfirmBody/);
    expect(SETTINGS).toContain('await deleteAllClipsForUser(user.id);');
  });

  test('the privacy policy says the window and where to change it', () => {
    expect(POLICY.replace(/\s+/g, ' ')).toContain('a video is removed from this device after 7 days unless you tap Keep on it in Your videos');
    expect(POLICY).toContain('in Settings under Your data');
  });
});
