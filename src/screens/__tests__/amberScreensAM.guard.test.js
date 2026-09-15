/**
 * amberScreensAM.guard.test.js -- the amber that survives on every screen
 * whose basename begins A through M, named one line at a time.
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D174 (the amber census and its four rulings) and D175 (the four amendments
 * made at lead review of the first sweep). Parent:
 * `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` section 3 (the
 * four amber disciplines) and section 5 law 6.
 *
 * THE READING THAT GOVERNS EVERY ENTRY BELOW, from D174 verbatim:
 * "Disciplines 1 and 4 are not two permissions. Discipline 1 is a CEILING
 * ('amber marks now and nothing else', with four named instances) and
 * discipline 4 is a FILTER inside it... So 'it is a state' is never on its own
 * an argument for amber: the state also has to be *now*. A stored preference
 * is not now. A chosen filter is not now."
 *
 * WHAT THIS SUITE PINS, and why it is written to FAIL rather than to pass.
 * A source-level guard, not a rendered-colour one, for the same reason
 * `rows.amber.guard.test.js` is: the failure mode is a future edit reaching
 * for `colors.primary` to make some row "pop", and a behavioural snapshot
 * would only catch that if it happened to render that exact branch. So the
 * SOURCE is scanned, after stripping comments (the house `code()` stripper,
 * so a rule NAMED in a docblock -- this file included -- is never read as a
 * live use), and the result is compared against an EXACT, ORDERED list per
 * file.
 *
 * It is a list and not a count on purpose. A count lets one amber leave while
 * another arrives; the list names the exact line, so an addition, a removal
 * and a swap all fail with the text in the diff. Every entry carries a
 * one-paragraph reason immediately above it, so a reviewer checks the list
 * against the rules rather than trusting a number.
 *
 * THREE CATEGORIES appear in the table, and they are labelled:
 *   KEEP           -- one of the dozen sites amber is FOR: a meter fill whose
 *                     width tracks a live value, a spinner or refresh tint, a
 *                     selection mark (the tick, the radio dot), a personal
 *                     best, the one committing button, and the you-are-here
 *                     mark (today's cell, the current set, this week's bar).
 *   KEEP (D174 A3) -- the Community unread dots, which D174 A3 ruled stay and
 *                     ordered left alone. `rows.amber.guard.test.js`'s own
 *                     AMBER_COUNTS table is NOT re-anchored by this sweep.
 *   STOPPED        -- a site where the rule table is genuinely ambiguous or
 *                     where removing the amber would lose a meaning the
 *                     surrounding copy does not carry. Left exactly as found
 *                     and reported for a lead ruling rather than guessed at.
 *                     A ruling on one of these changes the entry here; it does
 *                     not delete the case.
 *
 * SCOPE. `src/screens/*.js` with a basename in A-M, which is one sweep lane.
 * The N-Z half of `src/screens/` and everything under `src/components/` and
 * `src/lib/` are other units' and are deliberately not measured here, so this
 * suite can never disagree with theirs about a file neither of them owns.
 *
 * NOT IN SCOPE, and named so the hole is a decision rather than an oversight:
 * this counts the four token accessors (`primary`, `primaryFill`,
 * `primaryDim`, `primaryBg`) reached through a `colors.` or `t.colors.`
 * member expression. A raw hex is caught by the token lint bank, and
 * `chartFill`/`macroProtein` are separate roles with their own history.
 */
const fs = require('fs');
const path = require('path');

const SCREENS = path.resolve(__dirname, '..');

/** Strip block and line comments, so a rule NAMED in prose is never read as
 * a live use. Identical to `rows.amber.guard.test.js`'s stripper. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// `colors.primary` / `t.colors.primary` / `c.primaryBg` and the three
// siblings. Word-bounded so `primaryFill` is never matched as `primary`.
const AMBER = /\bcolors\s*\.\s*(primary|primaryFill|primaryDim|primaryBg)\b/;

/** Every comment-stripped source line in `file` that reaches an amber token,
 * in source order, trimmed. */
function amberLines(file) {
  return code(fs.readFileSync(path.join(SCREENS, file), 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => AMBER.test(line));
}

const inLane = (name) => name.endsWith('.js') && name[0] >= 'A' && name[0] <= 'M';

// ─────────────────────────────────────────────────────────────────────────
// THE TABLE. Per file, the exact remaining amber-bearing lines in source
// order, each with the reason it survived. A file with no amber left carries
// an empty array, which is an assertion in its own right: it fails the moment
// amber comes back to a screen this sweep cleared.
// ─────────────────────────────────────────────────────────────────────────
const SURVIVORS = {
  "ActiveWorkoutScreen.js": [
    // KEEP -- the selection mark itself: the tick beside the chosen set type in
    // the set-type sheet. D174's KEEP list names the tick and the radio dot, and
    // this one is already the solid token rather than an alpha'd one.
    "<Ionicons name=\"checkmark\" size={18} color={t.colors.primary} />",
    // KEEP -- the current set. A 700 ms border flash acking the set you have
    // just logged: discipline 1's "the set you are on", transient by
    // construction. Frozen half.
    "setEntryCardFlash: { borderColor: colors.primary },",
    // KEEP -- the same flash, live half.
    "setEntryCardFlash: { borderColor: t.colors.primary },",
  ],
  // RULED at lead review, so nothing survives here. The border marked a
  // low-confidence OCR figure, which is not "now" and so is outside discipline
  // 1's ceiling -- but it is a genuine caution that a scanned number may be
  // wrong, which is what `warning` is FOR, so the role is correct rather than
  // borrowed. The screen's copy was changed with it: it read "Amber figures
  // aren't certain", naming a colour the user may not be able to see, which is
  // an accessibility fault independent of this campaign.
  "AddCustomFoodScreen.js": [],
  "AnalyticsScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "tintColor={t.colors.primary}",
  ],
  "Article9ConsentScreen.js": [
    // KEEP -- the one committing button on the screen, hand-rolled as the
    // emphatic equivalent (a solid primaryFill with onPrimary ink). Frozen half.
    "backgroundColor: colors.primaryFill,",
    // KEEP -- the same button, live half.
    "ctaPrimary: { backgroundColor: t.colors.primaryFill },",
  ],
  "AthleteProfileScreen.js": [],
  "AvoidedMovementsScreen.js": [],
  // RULED at lead review. The style was called `prValue`, so it read as a
  // personal best -- the one figure discipline 1 grants amber by name -- and
  // the sweep rightly stopped. FB-16's own comment says these rows are the
  // best within THIS block, "never compared against a prior block, a prior best
  // or any record store". Not a record, so not entitled to the accent. Renamed
  // `blockBestValue` as well, because a style name that contradicts what it
  // styles is how the next reader gets it wrong again.
  "BlockReflectionScreen.js": [],
  "BodyMetricsScreen.js": [],
  "BuildWorkoutScreen.js": [],
  "CascadeGateScreen.js": [],
  "CoachHeldHistoryScreen.js": [],
  "CoachOutputScreen.js": [
    // KEEP -- the one committing button in the ED-lockout panel, a solid
    // primaryFill. ED-adjacent: no gate, floor, detector, suppression or copy
    // was touched anywhere in this file. Frozen half.
    "backgroundColor: colors.primaryFill,",
    // KEEP -- the same button, live half.
    "edLockoutCtaPrimary: { backgroundColor: t.colors.primaryFill },",
  ],
  "CoachReviewScreen.js": [],
  "CoachingRemindersScreen.js": [],
  "CommunityActivityScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityBoardScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityComposeScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<View style={styles.centre}><ActivityIndicator color={t.colors.primary} /></View>",
  ],
  "CommunityConnectionsScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<View style={styles.footer}><ActivityIndicator color={t.colors.primary} /></View>",
  ],
  "CommunityConversationScreen.js": [],
  "CommunityConversationsScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityDimensionScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.pagingFooter} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityEditProfileScreen.js": [],
  "CommunityFindPeopleScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityFollowersScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<View style={styles.footer}><ActivityIndicator color={t.colors.primary} /></View>",
  ],
  "CommunityGroupCreateScreen.js": [],
  "CommunityGroupMembersScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityGroupScreen.js": [
    // KEEP -- a meter fill whose width tracks a live value (sessions together
    // this week). The unfilled track behind it was a primaryBg wash and took
    // surface2.
    "backgroundColor: t.colors.primary,",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
    // KEEP -- the same meter, frozen half.
    "togetherFill: { height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },",
  ],
  "CommunityGymAddScreen.js": [],
  "CommunityHubScreen.js": [
    // KEEP (D174 A3) -- the Community unread dot. "New since you looked" is the
    // one thing in the census that genuinely IS now: earned by data, transient
    // by construction, at most one per row.
    "<View style={[styles.dot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />",
    // KEEP (D174 A3) -- the unread-message count badge, the same ruling.
    // rows.amber.guard.test.js pins the sibling component's copies and was
    // deliberately not re-anchored.
    "<View style={[styles.badge, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]}>",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityJoinScreen.js": [],
  "CommunityModerationScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityPeopleListScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} style={styles.footer} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityPostScreen.js": [],
  "CommunityPrivacyScreen.js": [],
  "CommunityProfileScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityRulesScreen.js": [],
  "CommunitySearchScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "colors={[t.colors.primary]}",
  ],
  "CommunityTrainingProfileScreen.js": [],
  "ConsistencyScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />",
  ],
  "CreditsScreen.js": [],
  "DebugLogScreen.js": [],
  "DiaryScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />}",
    // KEEP -- today's water meter: a single fill whose width tracks a live
    // value. Frozen half.
    "waterFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },",
    // KEEP -- the same meter, live half.
    "waterFill: { backgroundColor: t.colors.primary },",
  ],
  "ExerciseDetailScreen.js": [
    // KEEP -- the personal best, which discipline 1 names in its own four
    // instances, at display scale (law 1's one loud thing on the card). Its
    // supporting records took textPrimary so this is the only amber figure left
    // there. Frozen half.
    "color: colors.primary,",
    // KEEP -- the target-weight progress meter, whose width tracks a live value.
    // Frozen half.
    "backgroundColor: colors.primaryFill,",
    // KEEP -- the personal best, live half.
    "prHeroValue: { ...t.type.num('display'), color: t.colors.primary },",
    // KEEP -- the progress meter, live half.
    "goalBarFill: { backgroundColor: t.colors.primaryFill },",
  ],
  "FoodInsightsScreen.js": [],
  "FoodSearchScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "? <ActivityIndicator size=\"small\" color={t.colors.primary} />",
  ],
  // RULED at lead review, and this one was ED-safety rather than style. The
  // two keys were a VALENCE PAIR on calorie and macro numbers -- up in the
  // accent, down in the WARNING colour -- so for anyone in a deficit every food
  // number on the screen rendered as a caution. Both are neutral now; the sign
  // already in the string carries direction. The app refuses this everywhere
  // else it shows a trend, and this was the last place it did it.
  "GoalChangeSummaryScreen.js": [],
  "GoalLockConsentScreen.js": [
    // KEEP -- the radio dot, the selection mark itself. The option card's edge
    // and the radio RING both took borderLight, so one state no longer wears
    // three amber marks (D175 3). Frozen half.
    "backgroundColor: colors.primary,",
    // KEEP -- the radio dot, live half.
    "radioDot: { backgroundColor: t.colors.primary },",
  ],
  "HomeScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}",
  ],
  "HowYouTrainAddScreen.js": [
    // KEEP -- the wizard's you-are-here progress: the segments fill up to the
    // step you are on now.
    "<View key={i} style={[styles.segment, { backgroundColor: i < pos.index ? t.colors.primary : t.colors.borderSubtle }]} />",
  ],
  "HowYouTrainScreen.js": [
    // KEEP -- the flash that marks the row you just acted on. The definition of
    // "now" in discipline 1.
    "const flashStyle = (id) => (flashId != null && flashId === id ? { borderColor: t.colors.primary } : null);",
    // KEEP, RULED at lead review. `primary` here is a BOOLEAN PROP, not the
    // colour; its one call site is "Save my choices", the committing button in
    // that sheet, which discipline 1 protects. It was wearing a `primaryBg`
    // WASH, which discipline 2 forbids outright, so it now wears the house form
    // every other committing button wears: a solid `primaryFill` with
    // `onPrimary` ink. Entitled to the accent, and spending it the same way as
    // the rest of the app.
    "{ borderColor: selected ? t.colors.borderLight : t.colors.border, backgroundColor: primary ? t.colors.primaryFill : 'transparent' },",
    // The tick used to be here. RULED at lead review: D174 A2 supersedes the
    // KEEP-list line that made a selection mark amber. A selection is not the
    // user's live moment, the selected state already carries three cues without
    // it, and the shipped `OptionCard` primitive renders its tick in
    // `textPrimary` -- so the hand-rolled ones were the odd ones out. Six ticks
    // across four screens moved with it.
  ],
  "ImportScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} />",
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<ActivityIndicator color={t.colors.primary} />",
  ],
  "LiftProgressScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />",
    // KEEP -- the last bar is this week, discipline 1's "now". Every bar behind
    // it was primaryDim, a whole amber series, and took borderLight.
    "color: i === lastIdx ? t.colors.primary : t.colors.borderLight,",
    // KEEP -- the PR mark. Its alpha'd amber GROUND went to surface3 so one
    // state carries one amber mark (D175 3). Frozen half.
    "prTagText: { fontSize: fontSize.micro, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.primary },",
    // KEEP -- the PR mark, live half.
    "prTagText: { fontSize: t.fontSize.micro, color: t.colors.primary },",
  ],
  "LoginScreen.js": [],
  "ManualBuilderScreen.js": [
    // KEEP -- the selection tick (checkmark-circle) on a row picked for
    // grouping. The selected row's primaryBg ground took surface3.
    "color={isSelected ? t.colors.primary : t.colors.textMuted}",
  ],
  "MealNamesScreen.js": [],
  "MealPlanScreen.js": [
    // KEEP -- the grocery checkbox tick, the selection mark itself.
    "color={ticked ? t.colors.primary : t.colors.textMuted}",
  ],
  "MesocycleBuilderScreen.js": [
    // KEEP -- the current week in the tonnage bars, in the data-load-time
    // mapping. Weeks behind it were primaryDim and took borderLight.
    ": wk + 1 === currentWeek ? colors.primary",
    // KEEP -- the same ternary resolved at RENDER time, which is the copy the
    // chart actually reads (see the note above buildLiveStyles).
    ": i + 1 === currentWeek ? t.colors.primary",
    // KEEP -- the block progress meter, whose width tracks a live value (week X
    // of Y). Frozen half.
    "progFill:   { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },",
    // KEEP -- the same meter, live half.
    "progFill: { backgroundColor: t.colors.primary },",
  ],
  "MethodologyScreen.js": [],
  "MyMealsScreen.js": [],
  "MyRecipesScreen.js": [
    // KEEP -- loading spinner / pull-to-refresh tint. D174's KEEP list names
    // ActivityIndicator and RefreshControl explicitly: a spinner is the app
    // telling you it is working RIGHT NOW, which is discipline 1 exactly.
    "? <ActivityIndicator size=\"small\" color={t.colors.primary} />",
  ],
};

describe('D174/D175: the amber left on screens A-M is exactly this list', () => {
  test('the table covers every A-M screen, with none added or renamed away', () => {
    // A new screen with no entry would otherwise pass by not being looked at.
    const onDisk = fs.readdirSync(SCREENS).filter(inLane).sort();
    expect(Object.keys(SURVIVORS).sort()).toEqual(onDisk);
  });

  test.each(Object.keys(SURVIVORS).sort())('%s carries exactly its pinned amber', (file) => {
    expect(amberLines(file)).toEqual(SURVIVORS[file]);
  });

  test('the scan measures the lane rather than skipping it', () => {
    // Both of the frozen/live guard's own first-draft bugs made it measure
    // almost nothing while staying green. Pinned so that cannot recur here.
    const files = Object.keys(SURVIVORS);
    expect(files.length).toBeGreaterThan(50);
    const withAmber = files.filter((f) => SURVIVORS[f].length > 0);
    expect(withAmber.length).toBeGreaterThan(20);
    expect(files.reduce((n, f) => n + SURVIVORS[f].length, 0)).toBe(65);
  });

  test('every pinned survivor carries a stated reason in the table above', () => {
    // The reasons are comments, so they cannot be asserted as data. What CAN
    // be asserted is that none was skipped: this file must contain one
    // KEEP/STOPPED line for every pinned entry, and no entry may sit directly
    // under another entry with no reason between them.
    const self = fs.readFileSync(__filename, 'utf8');
    const table = self.slice(self.indexOf('const SURVIVORS = {'), self.indexOf('\n};'));
    const rows = table.split('\n').map((l) => l.trim());
    const entries = rows.filter((l) => l.startsWith('"') && l.endsWith('",') && AMBER.test(l));
    const total = Object.keys(SURVIVORS).reduce((n, f) => n + SURVIVORS[f].length, 0);
    expect(entries.length).toBe(total);
    for (let i = 0; i < rows.length; i += 1) {
      if (!(rows[i].startsWith('"') && rows[i].endsWith('",') && AMBER.test(rows[i]))) continue;
      // Walk back over the wrapped comment lines to the label that opens it.
      let j = i - 1;
      while (j >= 0 && rows[j].startsWith('//') && !/^\/\/ (KEEP|STOPPED)/.test(rows[j])) j -= 1;
      expect({ line: rows[i], labelled: j >= 0 && /^\/\/ (KEEP|STOPPED)/.test(rows[j]) })
        .toEqual({ line: rows[i], labelled: true });
    }
  });

  test('the REMOVED mechanisms did not survive anywhere in the lane', () => {
    // A second net under the exact list, in the shape of D174's own census:
    // the disc behind a glyph, the wash on a banner, and the tinted edge are
    // the three mechanisms that carried most of the 1,375 references, and
    // NONE of the pinned survivors is one of them. If a future edit adds one
    // back the case above already fails; this says WHICH mechanism returned.
    const offences = [];
    for (const file of Object.keys(SURVIVORS)) {
      for (const line of amberLines(file)) {
        if (/backgroundColor:\s*(t\.)?colors\.primaryBg/.test(line)
          && !SURVIVORS[file].includes(line)) offences.push(`${file}: wash -- ${line}`);
        if (/withAlpha\(\s*(t\.)?colors\.(primary|primaryFill|primaryDim)/.test(line)) {
          offences.push(`${file}: alpha'd accent -- ${line}`);
        }
        if (/\bcolors\.primaryDim\b/.test(line)) offences.push(`${file}: primaryDim -- ${line}`);
      }
    }
    expect(offences).toEqual([]);
  });
});
