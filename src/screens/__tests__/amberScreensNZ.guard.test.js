/**
 * amberScreensNZ.guard.test.js — what is left of the accent on the N-Z
 * screens, pinned line by line, with a reason for every survivor.
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D174 (the amber census and its four rulings) and D175 (the four amendments
 * made at lead review of the first sweep). Parent:
 * `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` §3, the four
 * amber disciplines, and §5 law 6, "Amber means one thing".
 *
 * THE READING THAT GOVERNS EVERY LINE BELOW. Discipline 1 is a CEILING --
 * "Amber marks 'now' and nothing else: today's ribbon cell, the set you are
 * on, the one committing button, a personal best" -- and discipline 4
 * ("earned by data") is a filter INSIDE it, not a second permission. So "it
 * is a state" is never on its own an argument for amber: the state has to be
 * *now* as well. A stored preference is not now. A chosen filter is not now.
 * A completed step is not now. A recommendation is not now.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. SURVIVORS — for every `src/screens/[N-Z]*.js` file, the EXACT list of
 *     remaining amber-bearing source lines, as an ordered table with a `why`
 *     beside each. A new amber tint or wash anywhere in the lane adds an
 *     entry and turns the case red naming the file; removing one of the
 *     deliberate survivors turns it red too, so a later sweep cannot quietly
 *     strip a meter, a spinner, a focus ring or a personal best. The `why`
 *     field is the record D174 asks for: every remaining site is a decision,
 *     not a leftover.
 *  2. MECHANISMS — the eight mechanisms D174 enumerated are pinned as
 *     CLASSES, not instances, so a brand-new file in this lane (or a new
 *     block in an existing one) cannot reintroduce a swept pattern under a
 *     name this table has never seen. `primaryDim`, `tone: 'primary'`,
 *     `chartLine`/`chartFill` and `shadow.glow` have no survivors at all in
 *     the lane and are banned outright.
 *  3. THE DISCS — the specific shape §3 discipline 2 names word for word
 *     ("a tint behind a glyph"). Every `primaryBg` icon disc in the lane lost
 *     its fill AND its disc geometry, following `SettingsPrimitives.js`'s own
 *     precedent of a fixed glyph column that keeps the row's left edge. The
 *     case pins that none of those wraps carries a fill or a `borderRadius`
 *     again.
 *  4. THE THREE-CUE SELECTION TREATMENT — the selected rows, chips, cards and
 *     badges that were an amber wash now carry `surface3` + `borderLight` +
 *     full ink, the same three differences `Chip.js` / `OptionCard.js` /
 *     `SegmentedControl.js` carry after D174 A2. Pinned on a sample of the
 *     lane's hand-rolled ones so the migration cannot be half-reverted.
 *
 * DELIBERATELY OUT OF SCOPE.
 *  - `src/screens/[A-M]*.js`, swept by the concurrent lane and pinned by its
 *    own guard.
 *  - `rows.amber.guard.test.js`'s `AMBER_COUNTS` table: D174 A3 rules the
 *    community unread dots a KEEP and says any future sweep "must keep it
 *    passing rather than re-anchor it". Nothing here touches those files.
 *  - `src/lib/shareCard/`, which carries its own palette and is sequenced to
 *    stage 4 (see `rewardProps.guard.test.js`'s own note). `ShareCardScreen`
 *    is the PICKER around it and is in scope; the renderer is not.
 *
 * SCOPE MECHANICS. Product source only, comments stripped through the house
 * `code()` helper (same one `rewardProps.guard.test.js` uses), so a rule
 * NAMED in a docblock -- and most of the swept files now explain in prose
 * which token they lost -- is never read as the token coming back.
 */
import fs from 'fs';
import path from 'path';

const SCREENS = path.resolve(__dirname, '..');

/** Strip comments, so a token NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Every mechanism D174 counted, in one expression. `colors.textPrimary` and
// `colors.onPrimary` do not match (the word boundary sits straight after the
// dot), and neither do `variant="primary"`, `primaryMuscle`, `primaryBtn`,
// `row.primary` or `listPrimary` -- all of which are unrelated uses of the
// word that an earlier, looser grep counted as amber.
const AMBER = /(?:\bt\.)?colors\s*\.\s*primary(?:Fill|Bg|Dim)?\b|tone\s*[:=]\s*\{?\s*['"]primary['"]|\bchart(?:Line|Fill)\b|shadow\s*\.\s*glow/;

const LANE = fs
  .readdirSync(SCREENS)
  .filter((f) => /^[N-Z].*\.js$/.test(f) && !f.endsWith('.test.js'))
  .sort();

/** The amber-bearing lines of one lane file, trimmed, in source order. */
function amberLines(file) {
  return code(fs.readFileSync(path.join(SCREENS, file), 'utf8'))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => AMBER.test(l));
}

const read = (file) => code(fs.readFileSync(path.join(SCREENS, file), 'utf8'));

// ── The survivors ──────────────────────────────────────────────────────────
// One entry per remaining amber line, in source order, with the reason it is
// allowed to be there. A file absent from this table must carry NO amber.
const SURVIVORS = {
  'NutritionTargetsScreen.js': [
    { line: '<Ionicons name="trending-up-outline" size={16} color={t.colors.primary} />',
      why: 'STOPPED, not kept on merit: the energy-availability "ease this cut" nudge. ED-safety-adjacent (nutritionEngine/wellbeing territory) and its prominence is a safety property, so it was reported rather than recoloured.' },
    { line: 'backgroundColor: colors.primaryFill,',
      why: 'calcBtn -- the one committing button on the screen (discipline 1).' },
    { line: 'borderColor: withAlpha(colors.primary, alpha.strong),',
      why: 'STOPPED: the ease-nudge border, same ED-safety site as above.' },
    { line: 'backgroundColor: colors.primaryBg,',
      why: 'STOPPED: the ease-nudge ground, same site.' },
    { line: 'color: colors.primary,',
      why: 'STOPPED: the ease-nudge label, same site.' },
    { line: 'calcBtn: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that same committing button; both halves must move together.' },
    { line: 'easeNudge: { borderColor: withAlpha(t.colors.primary, alpha.strong), backgroundColor: t.colors.primaryBg },',
      why: 'STOPPED: the ease-nudge live twin.' },
    { line: 'easeNudgeText: { fontSize: t.fontSize.sm, color: t.colors.primary },',
      why: 'STOPPED: the ease-nudge label live twin.' },
  ],
  'PlanDetailScreen.js': [
    { line: 'refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}',
      why: 'A RefreshControl tint -- a live, transient, platform-owned spinner.' },
  ],
  'PlanLibraryScreen.js': [
    { line: 'refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}',
      why: 'A RefreshControl tint.' },
  ],
  'PlanPreviewScreen.js': [
    { line: "cta: { backgroundColor: colors.primaryFill, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },",
      why: 'The one committing button: a `variant="emphatic"` Button, "Create an account to keep it".' },
    { line: 'cta: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that committing button; both halves must move together.' },
  ],
  'PlanUpdateScreen.js': [
    { line: '<ActivityIndicator color={t.colors.primary} />',
      why: 'An ActivityIndicator.' },
  ],
  'PlansScreen.js': [
    { line: 'refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}',
      why: 'A RefreshControl tint.' },
    { line: '<Ionicons name="body-outline" size={20} color={hytSummary.attention ? t.colors.primary : t.colors.textSecondary} />',
      why: 'STOPPED: the "Injuries & limitations" attention glyph. `howYouTrainSummary` sets `attention` for BOTH awaiting-confirmation and undecided, and its sub line only says so in the first case, so in the second the tint is the only cue a user has. Removing it would lose a meaning the surrounding text does not carry.' },
  ],
  'ProGoalSetupScreen.js': [
  ],
  'ProOnboardingScreen.js': [
    { line: '{state === \'current\' ? <ActivityIndicator size="small" color={t.colors.primary} /> : null}',
      why: 'An ActivityIndicator, and it is the one thing in that stage list that marks NOW.' },
    { line: '<ActivityIndicator color={t.colors.primary} />',
      why: 'An ActivityIndicator.' },
    { line: "progressFill: { height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },",
      why: 'A meter whose width tracks the live step position through the wizard.' },
    { line: 'fieldWrapFocused: { borderColor: colors.primary },',
      why: 'A focus ring. De-washed from `withAlpha(primary, 0.502)` to the solid token, which is what D174 asks of an alpha\'d keep.' },
    { line: 'progressFill: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that meter; both halves must move together.' },
  ],
  'ProUpgradeScreen.js': [
    { line: 'fieldWrapFocused: { borderColor: colors.primary },',
      why: 'A focus ring, de-washed to the solid token. (Dormant billing surface: colour only, no purchase/restore/entitlement/cascade path touched.)' },
  ],
  'ScanBarcodeScreen.js': [
    { line: 'width: 240, height: 160, borderWidth: 2, borderColor: colors.primary,',
      why: 'STOPPED: the scanning reticle, drawn over a LIVE CAMERA FEED. Its legibility is against arbitrary scene content, which the contrast suite cannot assert, so no neutral token can be shown safe here.' },
    { line: 'reticle: { borderColor: t.colors.primary },',
      why: 'STOPPED: the live twin of that reticle, held with it.' },
  ],
  'ScanLabelScreen.js': [
    { line: 'width: 280, height: 360, borderWidth: 2, borderColor: colors.primary,',
      why: 'STOPPED: the alignment frame over a live camera feed, same reasoning as the barcode reticle.' },
    { line: 'backgroundColor: colors.primaryFill,',
      why: 'The shutter -- the one committing button on the screen.' },
    { line: 'frame: { borderColor: t.colors.primary },',
      why: 'STOPPED: the live twin of that frame, held with it.' },
    { line: 'captureBtn: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of the shutter; both halves must move together.' },
  ],
  'ShareCardScreen.js': [
    { line: '<ActivityIndicator color={t.colors.primary} />',
      why: 'An ActivityIndicator.' },
  ],
  'WeeklyCheckInScreen.js': [
    { line: 'stepDotActive: { backgroundColor: colors.primary },',
      why: 'The you-are-here step of the check-in wizard. Its sibling `stepDotDone` was an alpha\'d second amber mark for the same strip and went to `borderLight`, so this is now the only one.' },
    { line: 'stepDotActive: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that you-are-here dot; both halves must move together.' },
  ],
  'WorkoutHistoryScreen.js': [
    { line: 'colors={[t.colors.primary]}',
      why: 'A RefreshControl tint (the Android `colors` array).' },
    { line: 'borderColor: colors.primary,',
      why: 'dayCircleToday -- today\'s cell in the month grid, which is discipline 1\'s first named instance. The trained-day fill and the selected-day fill beside it both went neutral, so today is the only amber in the calendar.' },
    { line: 'dayCircleToday: { borderColor: t.colors.primary },',
      why: 'The live twin of today\'s cell; both halves must move together.' },
  ],
  'WorkoutSummaryScreen.js': [
    { line: '<Ionicons name="barbell-outline" size={18} color={t.colors.primary} />',
      why: 'The personal-best row glyph. D174\'s own lead review moved this OFF `warning` and onto amber on the grounds that discipline 1 grants "a personal best" by name; the file records that decision at the call site.' },
  ],
  'YearOfLiftsScreen.js': [
    { line: "pipFill: { height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },",
      why: 'The story pip for the segment PLAYING NOW: an animated width interpolation, so it is both a live meter and the you-are-here mark. The completed pips beside it are already `textSecondary`.' },
    { line: 'pipFill: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that playing pip; both halves must move together.' },
  ],
};

describe('D174/D175: every amber site left on the N-Z screens is a recorded decision', () => {
  test('the lane is the one this suite thinks it is', () => {
    // If a screen is added or renamed the table below stops covering the lane,
    // and a silent shrink is the way a pinning guard stops measuring anything.
    expect(LANE.length).toBe(45);
    expect(LANE[0]).toBe('NotificationSettingsScreen.js');
    expect(LANE[LANE.length - 1]).toBe('YouScreen.js');
  });

  test.each(Object.keys(SURVIVORS))('%s keeps exactly its recorded amber lines', (file) => {
    expect(amberLines(file)).toEqual(SURVIVORS[file].map((e) => e.line));
  });

  test('every other file in the lane carries no amber at all', () => {
    const unexpected = LANE.filter((f) => !SURVIVORS[f] && amberLines(f).length > 0)
      .map((f) => `${f}: ${amberLines(f).join(' | ')}`);
    expect(unexpected).toEqual([]);
  });

  test('every survivor carries a stated reason', () => {
    const silent = [];
    for (const [file, entries] of Object.entries(SURVIVORS)) {
      for (const e of entries) {
        if (!e.why || e.why.length < 20) silent.push(`${file}: ${e.line}`);
      }
    }
    expect(silent).toEqual([]);
  });

  test('the whole lane is down to the handful discipline 1 allows', () => {
    // §3 discipline 1 entitles the product to roughly a dozen amber sites.
    // This lane's 45 screens started at 511 raw references and hold 36 source
    // lines now. Of those, 14 are live twins of a line already counted and 17
    // lines (five distinct sites) are STOPPED, left untouched for a lead to
    // rule rather than guessed at, which leaves about
    // two dozen logical keeps: four spinners, four pull-to-refresh tints, five
    // selection ticks, two focus rings, three committing buttons, two live
    // meters, today's calendar cell, the check-in's you-are-here dot and the
    // personal-best glyph. The ceiling is asserted as an exact number rather
    // than described, so a later unit cannot drift back up.
    const total = LANE.reduce((n, f) => n + amberLines(f).length, 0);
    expect(total).toBe(36);
    const stopped = Object.values(SURVIVORS).flat().filter((e) => e.why.startsWith('STOPPED')).length;
    expect(stopped).toBe(11);
  });
});

describe('D174: the swept mechanisms cannot come back under a new name', () => {
  const laneText = LANE.map((f) => ({ file: f, text: read(f) }));
  const offenders = (re) => laneText.filter((s) => re.test(s.text)).map((s) => s.file).sort();

  test('no `primaryDim` anywhere in the lane', () => {
    // The dim amber was the "active" ink on four hand-rolled cards. Every one
    // of them now reads `textSecondary`; the token has no survivor here.
    expect(offenders(/colors\s*\.\s*primaryDim\b/)).toEqual([]);
  });

  test("no Card or GradientCard in the lane asks for tone=\"primary\"", () => {
    // `tone` resolves to an accent BORDER in Card.js. Thirteen Year-of-Lifts
    // story cards and YouScreen's weekly-update card asked for one; all now
    // ask for `neutral`, which Card maps to the `border` token.
    expect(offenders(/tone\s*[:=]\s*\{?\s*['"]primary['"]/)).toEqual([]);
  });

  test('no chart in the lane draws a whole series in the accent', () => {
    expect(offenders(/\bchart(?:Line|Fill)\b/)).toEqual([]);
    expect(offenders(/<VolyumeChart[\s\S]{0,400}?color=\{t\.colors\.primary\}/)).toEqual([]);
  });

  test('the glow does not return', () => {
    expect(offenders(/shadow\s*\.\s*glow\b/)).toEqual([]);
  });

  test('no raw hex is introduced by the sweep', () => {
    // Every replacement came from a theme token. The brand amber and its
    // light-theme ink are the two literals a hand-written "fix" would reach
    // for first.
    for (const hex of ['#F5A623', '#E08C0B', '#B45309', '#8A5200']) {
      expect(offenders(new RegExp(hex, 'i'))).toEqual([]);
    }
  });
});

describe('D174 §3.2: no tint sits behind a glyph on these screens', () => {
  // The exact shape discipline 2 names. Each of these wraps was a tinted disc
  // round a stock Ionicon; each is now a fixed-width glyph column with no
  // fill, following SettingsPrimitives.js's own precedent so the row keeps
  // its left edge without an amber ground.
  const DISCS = [
    ['NotificationSettingsScreen.js', 'toggleIconWrap'],
    ['NutritionTargetsScreen.js', 'eduIconWrap'],
    ['NutritionTargetsScreen.js', 'whySectionIcon'],
    ['NutritionEducationScreen.js', 'sectionIconWrap'],
    ['PlanLibraryScreen.js', 'quizBannerIcon'],
    ['ProOnboardingScreen.js', 'questionGroupIcon'],
    ['ProOnboardingScreen.js', 'notifIconWrap'],
    ['ProSetupCompleteScreen.js', 'routineIconWrap'],
    ['ProUpgradeScreen.js', 'perkIcon'],
    ['ProgressPhotosScreen.js', 'captureRouteIcon'],
    ['SubscriptionPolicyScreen.js', 'sectionIconWrap'],
    ['YouScreen.js', 'navRowIcon'],
    ['YouScreen.js', 'statusIcon'],
  ];

  test.each(DISCS)('%s: %s carries no fill and no disc geometry', (file, key) => {
    const text = read(file);
    const m = new RegExp(`\\b${key}: \\{([^}]*)\\}`).exec(text);
    expect({ key, found: !!m }).toEqual({ key, found: true });
    const body = m[1];
    expect({ key, fill: /backgroundColor/.test(body) }).toEqual({ key, fill: false });
    expect({ key, radius: /borderRadius/.test(body) }).toEqual({ key, radius: false });
    // And no live twin re-applies one.
    expect(new RegExp(`${key}: \\{[^}]*t\\.colors\\.primaryBg`).test(text)).toBe(false);
  });
});

describe('D174 A2: the hand-rolled selected states carry the three neutral cues', () => {
  // `surface3` fill + `borderLight` edge + full ink, the same three
  // differences Chip / OptionCard / SegmentedControl carry after the shared
  // primitives were swept. A sample across the lane, so a partial revert of
  // the migration fails rather than passing on the files nobody re-reads.
  const SELECTED = [
    ['NutritionTargetsScreen.js', 'goalCardActive'],
    ['NutritionTargetsScreen.js', 'mealCountChipActive'],
    ['NutritionTargetsScreen.js', 'approachCardActive'],
    ['ProGoalSetupScreen.js', 'phaseCardActive'],
    ['ProOnboardingScreen.js', 'hourChipActive'],
    ['ProgressPhotosScreen.js', 'checkInPoseChipDone'],
    ['ShareCardScreen.js', 'templateTileActive'],
    ['WeeklyCheckInScreen.js', 'perfCardSelected'],
    ['WellbeingCheckScreen.js', 'btnSelected'],
    ['WorkoutHistoryScreen.js', 'toggleBtnActive'],
    ['WorkoutSummaryScreen.js', 'ratingBtnActive'],
  ];

  test.each(SELECTED)('%s: %s is surface3 + borderLight, in BOTH halves', (file, key) => {
    const text = read(file);
    const hits = [...text.matchAll(new RegExp(`\\b${key}: \\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
    // Both the frozen block and the buildLiveStyles twin define it.
    expect({ key, halves: hits.length }).toEqual({ key, halves: 2 });
    for (const body of hits) {
      expect({ key, body, surface3: /surface3/.test(body) }).toEqual({ key, body, surface3: true });
      expect({ key, body, edge: /borderLight/.test(body) }).toEqual({ key, body, edge: true });
    }
  });
});
