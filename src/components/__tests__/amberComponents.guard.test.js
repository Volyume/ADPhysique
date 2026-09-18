/**
 * amberComponents.guard.test.js — what is left of the accent in
 * `src/components/**`, pinned line by line, with a reason for every survivor.
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D174 (the amber census and its four rulings), D175 (the four amendments made
 * at lead review of the first sweep), D176 (hand-rolled selection styles are
 * neutralised in place now and restructured as their own unit) and D178 (the
 * nine sites the two screen lanes refused to guess at). Parent:
 * `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` §3, the four
 * amber disciplines, and §5 law 6, "Amber means one thing".
 *
 * THE READING THAT GOVERNS EVERY LINE BELOW, from D174 itself. Discipline 1 is
 * a CEILING -- "Amber marks 'now' and nothing else: today's ribbon cell, the
 * set you are on, the one committing button, a personal best" -- and
 * discipline 4 ("earned by data") is a filter INSIDE it, not a second
 * permission. So "it is a state" is never on its own an argument for amber:
 * the state has to be *now* as well. A stored preference is not now. A chosen
 * filter is not now. A completed step is not now. A recommendation is not now.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. SURVIVORS -- for every file under `src/components/` (recursively, minus
 *     the exclusions below), the EXACT list of remaining amber-bearing source
 *     lines, as an ordered table with a `why` beside each. A new amber tint or
 *     wash anywhere in the lane adds an entry and turns the case red naming
 *     the file; removing one of the deliberate survivors turns it red too, so
 *     a later sweep cannot quietly strip a meter, a spinner, the current set
 *     or a personal best. The `why` field is the record D174 asks for: every
 *     remaining site is a decision, not a leftover.
 *  2. COMPLETENESS -- the table is checked against `fs.readdirSync` rather
 *     than trusted, so a NEW component file with amber in it fails loudly
 *     instead of sitting outside a hand-written list. This is the shape
 *     `rows.amber.guard.test.js` adopted at F15 after `RespectAllRow.js`
 *     landed with zero coverage and nothing failed.
 *  3. MECHANISMS -- the mechanisms D174 enumerated are pinned as CLASSES, not
 *     instances, so a brand-new file (or a new block in an existing one)
 *     cannot reintroduce a swept pattern under a name this table has never
 *     seen. `primaryDim`, a `tone="primary"` call site, `chartLine`/
 *     `chartFill` and `shadow.glow` have no survivors in this lane at all and
 *     are banned outright.
 *  4. THE DISCS -- the specific shape §3 discipline 2 names word for word
 *     ("a tint behind a glyph"). Every `primaryBg` icon disc in the lane lost
 *     its fill AND its disc geometry, following `SettingsPrimitives.js`'s own
 *     precedent of a fixed glyph column that keeps the row's left edge.
 *  5. THE THREE-CUE SELECTION TREATMENT -- the selected rows, chips and cards
 *     that were an amber wash now carry `surface3` + `borderLight`, the same
 *     differences `Chip` / `OptionCard` / `SegmentedControl` carry after D174
 *     A2. Pinned on a sample so the migration cannot be half-reverted.
 *  6. NON-VACUITY -- the scan is proved to be looking at the real tree and the
 *     matcher is proved to match, because both of this campaign's guard bugs
 *     so far were suites that passed while measuring almost nothing.
 *
 * DELIBERATELY OUT OF SCOPE, named so the gaps are recorded rather than
 * mistaken for completeness (see `EXCLUDED` below for the per-file reasons):
 * the seven shared primitives, which `amberPrimitives.guard.test.js` owns;
 * `WeightTrendCard.js` and `community/DimensionRow.js`, which D177 rules dead
 * and a concurrent unit is deleting; and `food/MacroRings.js`, which D174
 * ruled directly.
 *
 * ONE OVERLAP THAT IS DELIBERATE. Every `src/components/community/**` file is
 * ALSO pinned, by count, in `community/__tests__/rows.amber.guard.test.js`'s
 * `AMBER_COUNTS`. D174 A3 rules those unread dots a KEEP and says any future
 * sweep "must keep it passing rather than re-anchor it", so this sweep changed
 * nothing in that folder. The lines are listed here too because a per-file
 * count and a per-line table fail differently: the count catches a site
 * appearing or disappearing, this catches one changing shape.
 *
 * SCOPE MECHANICS. Product source only, comments stripped through the same
 * `code()` helper `amberScreensNZ.guard.test.js` and
 * `rows.amber.guard.test.js` use, so a rule NAMED in a docblock -- and most of
 * the swept files now explain in prose which token they lost -- is never read
 * as the token coming back.
 */
import fs from 'fs';
import path from 'path';

const COMPONENTS = path.resolve(__dirname, '..');

/** Strip comments, so a token NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Every mechanism D174 counted, in one expression. `colors.textPrimary` and
// `colors.onPrimary` do not match (the word boundary sits straight after the
// dot), and neither do `variant="primary"`, `primaryMuscle`, `primaryBtn` or
// `item.primaryMuscle` -- all unrelated uses of the word that an earlier,
// looser grep counted as amber.
const AMBER = /(?:\bt\.)?colors\s*\.\s*primary(?:Fill|Bg|Dim)?\b|tone\s*[:=]\s*\{?\s*['"]primary['"]|\bchart(?:Line|Fill)\b|shadow\s*\.\s*glow/;

// Owned by another guard or another unit. Each entry names WHICH, so removing
// one from this list is a deliberate act rather than a gap nobody noticed.
const EXCLUDED = {
  'SettingsPrimitives.js': 'amberPrimitives.guard.test.js (D174 order of work 1)',
  'Button.js': 'amberPrimitives.guard.test.js (D174 order of work 2)',
  'Chip.js': 'amberPrimitives.guard.test.js (D174 A2)',
  'SegmentedControl.js': 'amberPrimitives.guard.test.js (D174 A2)',
  'OptionCard.js': 'amberPrimitives.guard.test.js (D174 A2)',
  'Dropdown.js': 'amberPrimitives.guard.test.js (D174 A2 + D175 ruling 3)',
  'TextField.js': 'amberPrimitives.guard.test.js (the focus ring + D175\'s named keyboard accessories)',
  'WeightTrendCard.js': 'D177 finding 1: dead, re-pointed and deleted as its own unit',
  'community/DimensionRow.js': 'D177 finding 3: dead, deleted as its own unit',
  'food/MacroRings.js': 'D174 ruled it directly (the arc, the bars, kcalPlanned and the :154 default)',
};

/** Every product source file under src/components, recursively, lane-relative. */
function listLane(dir = COMPONENTS, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listLane(p, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      out.push(path.relative(COMPONENTS, p).split(path.sep).join('/'));
    }
  }
  return out;
}

const ALL = listLane().sort();
const LANE = ALL.filter((f) => !EXCLUDED[f]);

const read = (file) => code(fs.readFileSync(path.join(COMPONENTS, file), 'utf8'));

/** The amber-bearing lines of one lane file, trimmed, in source order. */
function amberLines(file) {
  return read(file)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => AMBER.test(l));
}

// ── The survivors ──────────────────────────────────────────────────────────
// One entry per remaining amber line, in source order, with the reason it is
// allowed to be there. A file absent from this table must carry NO amber.
const SURVIVORS = {
  'ActiveSessionMiniBar.js': [
    { line: "<Text style={[styles.statusTimer, { fontSize: t.fontSize.sm, color: t.colors.primary }]}>{`${mins}:${String(secs).padStart(2, '0')}`}</Text>",
      why: 'A rest countdown that is ticking RIGHT NOW, and it renders only while it is. D175 ruling 3 (one mark per state) sent the timer glyph beside it to `textSecondary`, so the figure carries it alone.' },
    { line: 'color: colors.primary, fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,',
      why: 'The frozen twin of that same live countdown; both halves must move together.' },
  ],
  'AppAlert.js': [
    { line: 'btnPrimary: { backgroundColor: colors.primaryFill },',
      why: "An alert's confirming action is discipline 1's \"one committing button\", and there is exactly one per alert. The destructive branch keeps `error`, which §8 protects." },
    { line: 'btnPrimary: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that committing button; both halves must move together.' },
  ],
  'BeforeAfterShareSheet.js': [
    { line: "{previewStatus === 'loading' ? <ActivityIndicator color={t.colors.primary} /> : <Text style={[styles.hint, live.hint]}>Choose two photos</Text>}",
      why: "An ActivityIndicator: the app saying it is working right now, which D174's KEEP list names outright." },
  ],
  'BigNumber.js': [
    { line: "color: tone === 'now' ? t.colors.primary : t.colors.textPrimary,",
      why: 'The primitive\'s `tone="now"` branch IS discipline 1 expressed as an API: the prop is documented as "amber, means the live thing" and the default `ink` tone is neutral.' },
  ],
  'BlockShapeCard.js': [
    { line: 'backgroundColor: colors.primaryFill, borderColor: colors.primary,',
      why: 'dotCurrent -- the week of the block you are in, the you-are-here mark of the strip. Fill-and-ring is one mark, the shape VolyumeChart already uses for a personal best. The recovery dot beside it lost its amber wash to `borderLight` and the current label lost its second amber mark.' },
    { line: 'dotCurrent: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.primary },',
      why: 'The live twin of that you-are-here dot; both halves must move together.' },
  ],
  'Card.js': [
    { line: 'primary: t.colors.primary,',
      why: 'The TONES map entry, not an applied colour. `tone="primary"` still has to resolve to the accent for the call sites discipline 1 grants it (ExerciseDetailScreen\'s personal-best card). The UNKNOWN-tone fallback beside it now lands on `neutral`, so a typo can never spend amber.' },
  ],
  'LedgerRow.js': [
    { line: 'color: isCurrent ? t.colors.primary : t.colors.textMuted,',
      why: "The ledger's index column for the CURRENT set. §5's signature device states this verbatim: \"the set you are on in amber, everything behind it grey\"." },
    { line: '? t.colors.primary',
      why: 'The same current row\'s figure, the other half of that one device. The row is the mark, not two marks.' },
  ],
  'PRCelebration.js': [
    { line: '<Ionicons name={prIcon} size={20} color={t.colors.primary} />',
      why: 'A personal-best mark, which discipline 1 grants by name (and D173 T1 retired the gold trophy token in favour of exactly this).' },
  ],
  'ProGate.js': [
    { line: 'gap: spacing.sm, backgroundColor: colors.primaryFill,',
      why: 'lockedBtn -- the one committing button on the locked screen. Dormant billing surface under D137: colour only, no purchase/restore/entitlement/cascade path touched. The Pro chip, the two icon discs and the PRO badge in this file all went neutral.' },
    { line: 'lockedBtn: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that committing button; both halves must move together.' },
  ],
  'ProgressGhostCapture.js': [
    { line: 'backgroundColor: colors.primary,',
      why: 'sliderFill -- a meter whose width tracks the live overlay strength. De-washed from 90% alpha to the solid token, which is what D174 asks of an alpha\'d keep.' },
    { line: 'sliderFill: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that meter; both halves must move together.' },
  ],
  'ProgressPhotoCompare.js': [
    { line: "backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center',",
      why: "handleGrip -- the reveal slider's drag handle, whose POSITION is the live value the user is dragging. It is the only amber the slider mode spends." },
    { line: 'trackFill: { height: 4, borderRadius: radius.hair, backgroundColor: colors.primaryFill },',
      why: 'A meter fill whose width tracks a live value (the overlay opacity).' },
    { line: 'marginLeft: -HANDLE / 4, backgroundColor: colors.primaryFill,',
      why: 'trackThumb -- the head of that same meter, not a second mark for the same state. The two never render in the same mode as the reveal handle above.' },
    { line: 'handleGrip: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of the reveal handle; both halves must move together.' },
    { line: 'trackFill: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that meter fill.' },
    { line: 'trackThumb: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that meter thumb.' },
  ],
  'ProgressPhotoViewer.js': [
    { line: 'keyboardDoneText: { ...t.type.bodyStrong, color: t.colors.primary },',
      why: "An iOS keyboard-accessory commit label. D175 held `TextField`'s two on the same reasoning -- the census classed a keyboard accessory's commit affordance as KEEP-structural, and it follows the platform tint convention." },
  ],
  'ProgressSections.js': [
    { line: "mesoProgressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },",
      why: 'A meter whose width tracks your live position through the block. The trained-day squares and the legend dot beside it both went to `borderLight`, the token WeekRibbon fills a trained cell with.' },
    { line: 'mesoProgressFill: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that meter; both halves must move together.' },
  ],
  'ReadinessCards.js': [
    { line: "milestoneBarFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },",
      why: 'A meter whose width tracks a live value.' },
    { line: 'milestoneBarFill: { backgroundColor: t.colors.primary },',
      why: 'The live twin of that meter; both halves must move together.' },
  ],
  'RestTimer.js': [
    { line: 'drainFill: { backgroundColor: t.colors.primaryFill },',
      why: "The drain bar's width tracks the live rest countdown, and the bar exists only while it is counting. Its warm branch keeps `warning`, which §8 protects." },
    { line: 'backgroundColor: colors.primaryFill,',
      why: 'The frozen twin of that drain fill; both halves must move together.' },
  ],
  'SetEntry.js': [
    { line: 'keyboardDoneText: { ...t.type.bodyStrong, color: t.colors.primary },',
      why: "An iOS keyboard-accessory commit label, held with `TextField`'s two under D175." },
    { line: '<Ionicons name="barbell-outline" size={iconSize.sm} color={t.colors.primary} style={styles.recordIcon} />',
      why: 'The record callout\'s glyph: a personal best, which discipline 1 grants by name. D173 T3 retired the trophy in favour of exactly this mark, and the call site records it. ED-adjacent file: colour only, no gate, flag read, calm-mode branch, suppression, copy, floor or clamp touched.' },
    { line: 'color: colors.primary,',
      why: 'The frozen twin of that keyboard-accessory Done label.' },
  ],
  'Sparkline.js': [
    { line: '<Circle cx={p.x} cy={p.y} r={5} fill="none" stroke={t.colors.primary} strokeWidth={1.5} />',
      why: 'The personal-best ring. The default SERIES colour in this file moved to `borderLight`, so the PB markers are now the only amber the sparkline spends.' },
    { line: '<Circle cx={p.x} cy={p.y} r={1.5} fill={t.colors.primary} />',
      why: 'The dot inside that same personal-best ring; ring-and-dot is one mark.' },
  ],
  'VolyumeChart.js': [
    { line: '<Circle cx={p.x} cy={p.y} r={5} fill="none" stroke={t.colors.primary} strokeWidth={1.5} />',
      why: 'The CP-5 personal-best ring. The default series colour moved to `borderLight`, so these markers are the one amber this chart spends.' },
    { line: '<Circle cx={p.x} cy={p.y} r={1.5} fill={t.colors.primary} />',
      why: 'The dot inside that same personal-best ring.' },
  ],
  'VolyumeTabBar.js': [
    { line: 'badgeDot: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.surfaceElevated },',
      why: 'The coach-update unread dot. D174 A3 rules "new since you looked" the one thing that genuinely IS now -- earned by data, transient by construction, gone the moment you look -- and pins the identical dot on CommunityHeaderAction unchanged. The focused-tab cushion beside it went neutral.' },
    { line: 'backgroundColor: colors.primaryFill,',
      why: 'The frozen twin of that unread dot; both halves must move together.' },
  ],
  'WeekRibbon.js': [
    { line: 'cellToday: { borderWidth: 1.5, borderColor: t.colors.primary },',
      why: "Today's ribbon cell before you have trained today (D191): an amber outline, discipline 1's first named instance. A solid slab every morning was the loudest thing on Today before anything had happened." },
    { line: 'cellTodayTrained: { backgroundColor: t.colors.primary },',
      why: "Today's ribbon cell once you have trained today (D191): the fill, so a filled cell always means a session. Still the only amber in the band." },
  ],
  'community/ActivityItemRow.js': [
    { line: '<View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />',
      why: 'D174 A3 KEEP, pinned by count in rows.amber.guard.test.js: the trained-today ring dot. Untouched by this sweep, as A3 requires.' },
    { line: '<Text style={{ color: t.colors.primary }}>PR </Text>',
      why: 'D174 A3 KEEP, pinned by count: a personal-best mark, which discipline 1 grants by name.' },
    { line: 'borderRadius: circle(RING), borderWidth: 1.5, backgroundColor: colors.primary, borderColor: colors.background,',
      why: 'D174 A3 KEEP, pinned by count: the frozen baseline of that ring dot.' },
  ],
  'community/ActivityRow.js': [
    { line: '<View style={[styles.dot, { backgroundColor: t.colors.primary }]} />',
      why: 'D174 A3 KEEP, pinned by count: an unread dot.' },
  ],
  'community/CommunityHeaderAction.js': [
    { line: '{ backgroundColor: t.colors.primary, borderColor: t.colors.background },',
      why: 'D174 A3 KEEP, pinned by count: the unread-message count badge.' },
    { line: '{ backgroundColor: t.colors.primary, borderColor: t.colors.background },',
      why: 'D174 A3 KEEP, pinned by count: the plain "unseen" dot.' },
  ],
  'community/ConversationRow.js': [
    { line: '{unread ? <View style={[styles.dot, { backgroundColor: t.colors.primary }]} /> : null}',
      why: 'D174 A3 KEEP, pinned by count: an unread dot.' },
  ],
  'community/DayDots.js': [
    { line: "borderColor: ringToday ? t.colors.primary : 'transparent',",
      why: "D174 A3 KEEP, pinned by count: today's ring." },
  ],
  'community/GymWeekBoard.js': [
    { line: '<View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]} />',
      why: 'D174 A3 KEEP, pinned by count: the trained-today ring dot.' },
  ],
  'community/MessageBubble.js': [
  ],
  'community/PersonRow.js': [
    { line: '<View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />',
      why: 'D174 A3 KEEP, pinned by count: the trained-today ring dot.' },
    { line: 'borderRadius: circle(RING), borderWidth: 1.5, backgroundColor: colors.primary, borderColor: colors.background,',
      why: 'D174 A3 KEEP, pinned by count: the frozen baseline of that ring dot.' },
  ],
  'community/PrivacyReceipt.js': [
  ],
  'community/ProgressStrip.js': [
  ],
  'food/CalorieBankSheet.js': [
    { line: "backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center',",
      why: 'applyBtn -- "Plan it", the one committing button on this sheet. ED-adjacent file: colour only, nothing about the bank\'s rules, floors or copy touched.' },
    { line: 'applyBtn: { backgroundColor: t.colors.primaryFill },',
      why: 'The live twin of that committing button; both halves must move together.' },
  ],
  // ADDED 2026-09-18 (D192, day zero 2c): "Add food" becomes the diary's
  // one committing action on the day-zero row -- full width, amber leading
  // glyph via the per-instance `iconFg`, fill neutral. The same D191
  // pattern Today's "Start workout" already carries (amberScreensAM.guard.
  // test.js's HomeScreen.js entry), on a component this time rather than a
  // screen, so it is pinned here rather than there.
  'food/EmptyDiary.js': [
    { line: 'iconFg={t.colors.primary}',
      why: 'The diary\'s one committing action ("Add food" on the day-zero row), marked the same way D191 marks Today\'s "Start workout": the leading glyph alone, fill neutral.' },
  ],
  'food/RecipeDetailSheet.js': [
    { line: '<ActivityIndicator size="small" color={t.colors.primary} />',
      why: "An ActivityIndicator, which D174's KEEP list names outright." },
  ],
  'workout/NowCard.js': [
    { line: 'flash && { borderColor: t.colors.primary },',
      why: 'The 700 ms log-flash: feedback at the instant a set is logged, which is as literally "now" as anything in the app. The context glyph above it lost its unconditional tint, so this is the card\'s one amber.' },
  ],
  'workout/WorkoutBottomBar.js': [
    { line: 'backgroundColor: t.colors.primary,',
      why: 'The auto-advance countdown fill: a meter whose width animates with a live value, rendered only while it is counting down.' },
  ],
  'workout/WorkoutHeader.js': [
    { line: '<Ionicons name="checkmark-done" size={iconSize.md} color={t.colors.primary} />',
      why: 'Finish is the one committing button in the logger chrome, and it is icon-only by founder order (pinned by loggerHeaderFinishIconOnly.guard.test.js), so the accent is the weight that separates it from Cancel. The bottom bar\'s action is `variant="primary"`, which is neutral after the primitives sweep, so this is the only amber on the screen.' },
  ],
  'workout/WorkoutOutline.js': [
    { line: 'borderTopColor: t.colors.primaryFill,',
      why: 'STOPPED: a STATIC, full-width amber edge above the strip, which is decoration by discipline 4\'s own test -- but it is a named founder device order (2026-08-22, recorded at the call site), so reversing it is the founder\'s call and not a sweep\'s. Reported rather than changed.' },
    { line: 'backgroundColor: t.colors.primaryFill,',
      why: 'progressFill -- the session-progress line, a meter whose width tracks sets done over sets planned. The file\'s own comment calls it "real information, never decoration".' },
    { line: '<View style={[styles.currentDot, { backgroundColor: t.colors.primary }]} />',
      why: 'The current exercise in the outline: the you-are-here mark. Complete rows use `success`, upcoming rows a `textMuted` outline.' },
  ],
};

describe('D174/D175/D176/D178: every amber site left in src/components is a recorded decision', () => {
  test('the lane is the one this suite thinks it is', () => {
    // A silent shrink is how a pinning guard stops measuring anything, so the
    // scan's own reach is asserted rather than assumed. Not an exact count:
    // D177 is deleting two files from this tree as its own unit, and this
    // suite must not go red for that.
    expect(LANE.length).toBeGreaterThan(140);
    expect(ALL).toEqual(expect.arrayContaining(['WeekRibbon.js', 'community/PersonRow.js', 'food/FoodRow.js', 'workout/NowCard.js']));
    // Every exclusion is a real file with a stated owner, or it has already
    // been deleted by the unit that owns it.
    for (const [file, owner] of Object.entries(EXCLUDED)) {
      expect({ file, reason: owner.length > 20 }).toEqual({ file, reason: true });
    }
  });

  test.each(Object.keys(SURVIVORS))('%s keeps exactly its recorded amber lines', (file) => {
    expect(amberLines(file)).toEqual(SURVIVORS[file].map((e) => e.line));
  });

  test('every other file in the lane carries no amber at all', () => {
    const unexpected = LANE.filter((f) => !SURVIVORS[f] && amberLines(f).length > 0)
      .map((f) => `${f}: ${amberLines(f).join(' | ')}`);
    expect(unexpected).toEqual([]);
  });

  test('the table never names a file that is not in the lane', () => {
    const strays = Object.keys(SURVIVORS).filter((f) => !LANE.includes(f));
    expect(strays).toEqual([]);
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

  test('the lane is down to the handful discipline 1 allows', () => {
    // §3 discipline 1 entitles the product to roughly a dozen amber sites.
    // This lane started at 299 amber-bearing source lines across 76 files and
    // holds 68 across 37. Of those 68, 19 are the Community folder that D174
    // A3 pins by count elsewhere and this sweep did not touch; 9 are STOPPED,
    // left untouched for a lead to rule rather than guessed at; and the rest are
    // frozen/live twins of a line already counted. That leaves roughly two dozen
    // logical keeps: two spinners, five meters, four committing buttons, the
    // current set and the current block week, today's ribbon cell, two
    // personal-best marks, the log-flash, two keyboard accessories and the
    // unread dots. The ceiling is asserted as an exact number rather than
    // described, so a later unit cannot drift back up.
    //
    // UPDATED at lead review: the lane reported that A3's "stands unchanged"
    // had frozen the WHOLE Community folder, not just the unread and today
    // marks A3 actually names, and asked for a scope ruling. Ruled: A3 protects
    // those marks; it does not protect a See-all link, a header glyph, an
    // in-message link colour, a whole-series bar or a Respect already given.
    // Eight lines went, and one of them was a real inconsistency rather than
    // mere decoration -- DayDots filled a TRAINED day amber while `WeekRibbon`,
    // the signature device D165 specified, fills a trained day neutral and
    // reserves amber for TODAY. The app's own signature disagreed with itself
    // across two surfaces.
    const total = LANE.reduce((n, f) => n + amberLines(f).length, 0);
    // 60 at the sweep; 61 with D191, which splits today's ribbon cell into an
    // outline (not yet trained) and a fill (trained). Both are today's.
    // 60 with D187, which took the avatar preset glyph's amber fallback out
    // of ProfileAvatarMark.js entirely (the presets lose `tone`; ink now).
    // 61 with D192 (2026-09-18): food/EmptyDiary.js's day-zero "Add food"
    // gains the same per-instance `iconFg` mark Today's "Start workout"
    // carries (one new survivor line, see the table above).
    expect(total).toBe(61);
    const community = LANE.filter((f) => f.startsWith('community/'))
      .reduce((n, f) => n + amberLines(f).length, 0);
    expect(community).toBe(11);
    const stopped = Object.values(SURVIVORS).flat().filter((e) => e.why.startsWith('STOPPED')).length;
    // 1 with D187: the avatar-preset STOPPED entry is ruled and removed.
    expect(stopped).toBe(1);
  });

  test('the matcher actually matches, and actually rejects', () => {
    // Both of this campaign's guard bugs so far were suites that passed while
    // measuring nothing. This proves the expression is live in both
    // directions before any of the cases above are trusted.
    expect(AMBER.test('backgroundColor: t.colors.primaryFill,')).toBe(true);
    expect(AMBER.test('color: colors.primaryBg')).toBe(true);
    expect(AMBER.test('color: colors.primaryDim')).toBe(true);
    expect(AMBER.test('tone="primary"')).toBe(true);
    expect(AMBER.test('shadow.glow')).toBe(true);
    expect(AMBER.test('color: t.colors.textPrimary')).toBe(false);
    expect(AMBER.test('color: t.colors.onPrimary')).toBe(false);
    expect(AMBER.test('variant="primary"')).toBe(false);
    expect(AMBER.test('item.primaryMuscle')).toBe(false);
    // And the comment stripper really strips, so a docblock naming a token is
    // not read as the token coming back.
    expect(code('/* colors.primaryBg */\nconst a = 1;')).not.toContain('primaryBg');
  });
});

describe('D174: the swept mechanisms cannot come back under a new name', () => {
  const laneText = LANE.map((f) => ({ file: f, text: read(f) }));
  const offenders = (re) => laneText.filter((s) => re.test(s.text)).map((s) => s.file).sort();

  test('no `primaryDim` anywhere in the lane', () => {
    // Its one consumer here was ProgressSections' empty-state glyph, now
    // `textMuted`. The token has no survivor in this lane.
    expect(offenders(/colors\s*\.\s*primaryDim\b/)).toEqual([]);
  });

  test('no component asks a Card or GradientCard for tone="primary"', () => {
    // `tone` resolves to an accent BORDER in Card.js. GradientCard defaulted
    // to it; it defaults to `neutral` now, and Card's unknown-tone fallback
    // went the same way. Card's TONES MAP still defines the entry, which is
    // why the map line is a pinned survivor above rather than banned here.
    expect(offenders(/tone\s*=\s*["']primary["']|tone\s*:\s*['"]primary['"]/)).toEqual([]);
  });

  test('no chart in the lane draws a whole series in the accent', () => {
    expect(offenders(/\bchart(?:Line|Fill)\b/)).toEqual([]);
    // The three chart primitives' DEFAULT colour is the neutral fill token.
    for (const f of ['Sparkline.js', 'VolyumeChart.js', 'SvgBarSparkline.js']) {
      expect({ f, neutral: /\?\?\s*t\.colors\.borderLight/.test(read(f)) }).toEqual({ f, neutral: true });
    }
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

  test('`onPrimary` ink never survives a fill that is no longer amber', () => {
    // `onPrimary` is the ink built for an AMBER ground (theme.js). Where this
    // sweep took a fill to `surface3`, the ink had to follow or it would read
    // near-black on a dark chip. These are the four that moved.
    const pairs = [
      ['ProGate.js', 'lockChipText'],
      ['ProGate.js', 'badgeText'],
      ['BillingPeriodSelector.js', 'saveBadgeText'],
      ['ProgressScanCompare.js', 'scanChipDateActive'],
    ];
    for (const [file, key] of pairs) {
      const text = read(file);
      expect({ file, key, onPrimary: new RegExp(`${key}: \\{[^}]*onPrimary`).test(text) })
        .toEqual({ file, key, onPrimary: false });
    }
  });

  test('the two filled selection boxes invert their tick instead of keeping onPrimary', () => {
    // `onPrimary` is #0D0D0D in EVERY palette (theme.js) because it is ink for
    // an amber fill. A tick that kept it on a `textPrimary` box would be
    // near-black on near-black ink in the light theme -- invisible for exactly
    // the users who chose that theme. Both ticks invert to `background`, the
    // same move D175 ruling 1 made for the switch thumb.
    for (const file of ['ConsentCheckboxRow.js', 'food/EntryRow.js']) {
      const text = read(file);
      expect({ file, inverted: /name="checkmark"[\s\S]{0,120}?color=\{t\.colors\.background\}/.test(text) })
        .toEqual({ file, inverted: true });
      expect({ file, stale: /name="checkmark"[\s\S]{0,120}?onPrimary/.test(text) })
        .toEqual({ file, stale: false });
    }
  });
});

describe('D174 §3.2: no tint sits behind a glyph in src/components', () => {
  // The exact shape discipline 2 names. Each of these wraps was a tinted disc
  // round a stock Ionicon; each is now a fixed-size glyph column with no fill,
  // following SettingsPrimitives.js's own precedent so the row keeps its left
  // edge without an amber ground.
  const DISCS = [
    ['HomeChangeWorkoutSheet.js', 'sheetActionIcon'],
    ['ProGate.js', 'sheetIconWrap'],
    ['ProGate.js', 'lockedIcon'],
    ['BiometricLockScreen.js', 'iconWrap'],
    ['EngineLog.js', 'iconWrap'],
    ['ProgressPhotoPrompt.js', 'iconWrap'],
    ['ReadinessCards.js', 'mfIconWrap'],
    ['HomeCommunityIntroCard.js', 'icon'],
    // HomeHowYouTrainOfferCard.js left this list under D192 (2026-09-18): the
    // offer is a row with a bare glyph and no wrap key at all, so there is no
    // disc to test for a tint. The rule holds trivially.
    ['workout/EmptyExerciseView.js', 'navTabBadge'],
  ];

  test.each(DISCS)('%s: %s carries no amber fill', (file, key) => {
    const text = read(file);
    const m = new RegExp(`\\b${key}: \\{([^}]*)\\}`).exec(text);
    expect({ key, found: !!m }).toEqual({ key, found: true });
    expect({ key, fill: /primaryBg|primaryFill/.test(m[1]) }).toEqual({ key, fill: false });
    // And no live twin, and no inline style at the call site, re-applies one.
    expect(new RegExp(`${key}[^\\n]*primaryBg`).test(text)).toBe(false);
  });

  test.each(DISCS.filter(([, k]) => k !== 'navTabBadge'))('%s: %s lost its disc geometry too', (file, key) => {
    const body = new RegExp(`\\b${key}: \\{([^}]*)\\}`).exec(read(file))[1];
    expect({ key, radius: /borderRadius|backgroundColor/.test(body) }).toEqual({ key, radius: false });
  });
});

describe('D174 A2 / D176: the hand-rolled selected states carry the neutral cues', () => {
  // `surface3` fill + `borderLight` edge, the same differences Chip /
  // OptionCard / SegmentedControl carry after the shared primitives were
  // swept. D176 neutralises these in place now and migrates them onto the
  // primitives as its own unit, so this pins the colour half only.
  const SELECTED = [
    ['HomeChangeWorkoutSheet.js', 'dayBadgeActive'],
    ['PhotoDetailsSheet.js', 'poseOptionActive'],
    ['ReasonPicker.js', 'rowSelected'],
    ['BillingPeriodSelector.js', 'buttonActive'],
    ['TierComparisonStrip.js', 'colHighlighted'],
    ['ProgressGhostCapture.js', 'opacityPresetActive'],
    ['food/CalorieBankSheet.js', 'dayChipActive'],
  ];

  test.each(SELECTED)('%s: %s is surface3 + borderLight, in BOTH halves', (file, key) => {
    const text = read(file);
    const hits = [...text.matchAll(new RegExp(`\\b${key}: \\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
    expect({ key, halves: hits.length }).toEqual({ key, halves: 2 });
    for (const body of hits) {
      expect({ key, body, surface3: /surface3/.test(body) }).toEqual({ key, body, surface3: true });
      expect({ key, body, edge: /borderLight/.test(body) }).toEqual({ key, body, edge: true });
    }
  });

  test('D178 #4: every hand-rolled selection mark in the lane is full ink', () => {
    // A2 ruled a selection is not "now" and the shipped OptionCard already
    // renders its tick at `textPrimary`; D178 #4 made that the rule. These are
    // the ticks, radio dots and chosen-photo rings this lane moved.
    const MARKS = [
      ['ReasonPicker.js', 'radioDot'],
      ['ReasonPicker.js', 'radioSelected'],
      ['ConsentCheckboxRow.js', 'checkboxChecked'],
      ['food/EntryRow.js', 'checkboxOn'],
      ['ProgressPhotoCompare.js', 'thumbChosen'],
      ['BeforeAfterShareSheet.js', 'thumbOn'],
    ];
    for (const [file, key] of MARKS) {
      const hits = [...read(file).matchAll(new RegExp(`\\b${key}: \\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
      expect({ file, key, halves: hits.length }).toEqual({ file, key, halves: 2 });
      for (const body of hits) {
        expect({ file, key, body, ink: /textPrimary/.test(body) }).toEqual({ file, key, body, ink: true });
      }
    }
  });
});
