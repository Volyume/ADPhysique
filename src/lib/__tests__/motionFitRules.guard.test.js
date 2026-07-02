/**
 * motionFitRules.guard.test.js — fit-rule source guards for the motion
 * system (audit/03b-motion-materials.md §3.2; landed per §4 step 3, Wave 6
 * item M3). The audit wrote the fit rules to be grep-testable; this suite
 * is that grep, run over product source (tests excluded, matching the
 * audit's §2 scope), so the motion system cannot drift while the remaining
 * waves ship:
 *  - rule 1/3 (purpose/intensity): `motion.springs.expressive` is reserved
 *    for the sanctioned celebration moments ONLY — today nothing may
 *    reference it;
 *  - rule 4 (performance budget): the JS-thread `Animated` API is a frozen
 *    allowlist that only shrinks — all new motion work uses Reanimated;
 *  - rule 0 (gate): raw `expo-haptics` never appears outside the
 *    self-gating vocabulary in `src/lib/haptics.js`;
 *  - rule 2 (token test): linear easing is sanctioned only for
 *    time-proportional fills — currently the rest-timer drain.
 * The allowlists pin the tree as verified on 2026-07-02; growing one is a
 * deliberate reviewed act, never a side effect.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');

// Product source only. Tests are not motion surfaces (and specs legitimately
// contain jest.mock('expo-haptics', ...) shims), so __tests__ directories and
// *.test.js files stay out of scope — same posture as themeTokens.guard.
function listSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(p, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const sources = listSourceFiles(SRC).map((p) => ({
  file: path.relative(SRC, p).split(path.sep).join('/'),
  text: fs.readFileSync(p, 'utf8'),
}));

const filesMatching = (re) =>
  sources.filter((s) => re.test(s.text)).map((s) => s.file).sort();

describe('fit rule 1/3: springs.expressive is contained to sanctioned celebrations', () => {
  // Deliberately EMPTY today: nothing in the app ships expressive motion,
  // and that is the pinned state. The celebration work (M7, audit §3.3g)
  // grows this list on purpose to exactly the three reward moments:
  //   'components/PRCelebration.js'         (PR burst; MilestoneBurst lives here)
  //   'screens/WorkoutSummaryScreen.js'     (50/100-session MilestoneBurst mount)
  //   'screens/ProSetupCompleteScreen.js'   (plan-ready reveal)
  // Any other file referencing the token is decoration (fit rule 1) or
  // louder-than-sanctioned core-loop motion (fit rule 3) and must fail here.
  const EXPRESSIVE_ALLOWLIST = [];

  test('no file outside the allowlist references motion.springs.expressive', () => {
    // Catches springs.expressive and springs['expressive'] access forms.
    // theme.js is excluded because it DEFINES the spring family.
    const offences = filesMatching(/springs\s*[.[]\s*['"]?expressive/).filter(
      (f) => f !== 'styles/theme.js' && !EXPRESSIVE_ALLOWLIST.includes(f)
    );
    expect(offences).toEqual([]);
  });
});

describe('fit rule 4: the JS-thread Animated API is a frozen allowlist', () => {
  // The 17 files below are the legacy JS `Animated` surface the audit froze
  // (§3.2 rule 4): they migrate to Reanimated incrementally and the list
  // NEVER GROWS. All new motion work runs on the UI thread via Reanimated.
  // A NEW file appearing here fails this test: migrate it to Reanimated, or
  // (exceptionally) add it with a written justification comment beside the
  // entry. Files LEAVING the list are removed freely — that is the migration
  // direction; set-equality keeps the list honest but the update trivial.
  const JS_ANIMATED_ALLOWLIST = [
    'components/BottomSheet.js',
    'components/FeedbackSheet.js',
    'components/PRCelebration.js',
    'components/PeekMenu.js',
    'components/RestTimer.js',
    'components/Skeleton.js',
    'components/Toast.js',
    'components/food/MacroRings.js',
    'navigation/RootNavigator.js',
    'screens/ActiveWorkoutScreen.js',
    'screens/ExerciseDetailScreen.js',
    'screens/ProOnboardingScreen.js',
    // ProSetupCompleteScreen left this list in E9 (staged Reanimated reveal).
    'screens/WelcomeScreen.js',
    'screens/WorkoutSummaryScreen.js',
    'screens/YearOfLiftsScreen.js',
  ];

  test('files importing Animated from react-native equal the pinned allowlist', () => {
    // Matches single-line and multiline destructured imports (the negated
    // character class crosses newlines) and the require() destructure form.
    const re =
      /import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]|\{[^}]*\bAnimated\b[^}]*\}\s*=\s*require\(\s*['"]react-native['"]\s*\)/;
    expect(filesMatching(re)).toEqual(JS_ANIMATED_ALLOWLIST);
  });
});

describe('fit rule 0: raw expo-haptics is banned outside the vocabulary', () => {
  test('lib/haptics.js is the only file referencing the expo-haptics module', () => {
    // Any quoted module specifier counts — import, require or dynamic
    // import — so there is no bypass spelling. New haptic events go through
    // the self-gating vocabulary in src/lib/haptics.js (reduce-motion no-op
    // by construction). A parallel guard may pin the same ban from the
    // haptics side; the duplication is deliberate and the suites independent.
    const offences = filesMatching(/['"]expo-haptics['"]/).filter(
      (f) => f !== 'lib/haptics.js'
    );
    expect(offences).toEqual([]);
  });
});

describe('fit rule 2: linear easing only in time-proportional fills', () => {
  // Easing.linear is sanctioned solely where animated progress represents
  // elapsed time one-to-one (audit §3.1). The single current usage is the
  // rest-timer drain (components/RestTimer.js, drain effect): a 1 s linear
  // scaleX glide per tick, so 1 s of bar equals exactly 1 s of rest —
  // verified time-proportional, not spatial movement. Spatial motion must
  // use the sanctioned beziers (easeStandard / easeDecelerate /
  // easeAccelerate) or the named springs.
  const LINEAR_EASING_ALLOWLIST = ['components/RestTimer.js'];

  test('Easing.linear appears only in the allowlisted fills', () => {
    const offences = filesMatching(/\bEasing\s*\.\s*linear\b/).filter(
      (f) => !LINEAR_EASING_ALLOWLIST.includes(f)
    );
    expect(offences).toEqual([]);
  });
});
