/**
 * Source guard for BUG-1 (day-load race) and NAV-3 (date-jump), both from the
 * elite audit 2026-07-04 failure register, both on DiaryScreen.js.
 *
 * BUG-1: `load()` (around DiaryScreen.js:127-190 pre-fix) had no in-flight
 * guard, so rapid date navigation (or the focus-effect/plain-effect double
 * trigger landing mid-flight) could put two loads for different days in
 * flight at once; whichever resolved LAST used to win regardless of which
 * day it was for, briefly painting a stale day's calories/entries under the
 * newer, currently-selected date. The fix: a monotonic request token from
 * `createRaceGuard()` (src/lib/food/loadRaceGuard.js, unit-tested directly in
 * loadRaceGuard.test.js) captured at the TOP of `load()`, checked again
 * before every commit of state. This suite pins DiaryScreen's WIRING of that
 * guard (not the guard's own logic — that promise is proven behaviourally in
 * loadRaceGuard.test.js against DiaryScreen's much heavier dependency graph,
 * matching the rationale in DiaryScreen.holdHints.guard.test.js).
 *
 * NAV-3: the diary only ever had single-day chevrons for the whole history,
 * so correcting food from three weeks ago meant ~21 chevron taps. The fix:
 * tapping the date label opens DiaryDatePicker (src/components/food/
 * DiaryDatePicker.js, a thin wrapper over the real
 * `@react-native-community/datetimepicker` already used elsewhere via
 * PhotoDatePicker — no new dependency), which is unit-tested directly in
 * DiaryDatePicker.test.js. This suite pins that DiaryScreen imports it, wires
 * the date label to open it, and passes the picker through to selectedDate,
 * and that the chevrons + swipe are untouched.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

describe('DiaryScreen BUG-1 day-load race guard wiring', () => {
  test('imports the shared race guard, not a bespoke one-off', () => {
    expect(SRC).toMatch(/import \{ createRaceGuard \} from '\.\.\/lib\/food\/loadRaceGuard';/);
  });

  test('a guard instance is created once per screen instance (lazy ref init)', () => {
    expect(SRC).toMatch(/const loadGuardRef = useRef\(null\);/);
    expect(SRC).toMatch(/if \(!loadGuardRef\.current\) loadGuardRef\.current = createRaceGuard\(\);/);
  });

  test('load() takes a token at its very top, before the first await', () => {
    const start = SRC.indexOf('const load = useCallback(async () => {');
    expect(start).toBeGreaterThan(-1);
    const body = SRC.slice(start, start + 400);
    expect(body).toMatch(/if \(!userId\) return;\s*\n\s*const loadToken = loadGuardRef\.current\.next\(\);/);
  });

  test('the result is dropped (not committed) if a newer load has since started, checked at both await boundaries', () => {
    const matches = SRC.match(/if \(!loadGuardRef\.current\.isCurrent\(loadToken\)\) return;/g) || [];
    // Once right after the first Promise.all, once again after the
    // enrichment Promise.all, immediately before any setState.
    expect(matches.length).toBe(2);
  });

  test('the guard check happens before setEntries (the first state commit), not after', () => {
    const checkIdx = SRC.lastIndexOf('if (!loadGuardRef.current.isCurrent(loadToken)) return;');
    const setEntriesIdx = SRC.indexOf('setEntries(enriched);');
    expect(checkIdx).toBeGreaterThan(-1);
    expect(setEntriesIdx).toBeGreaterThan(checkIdx);
  });

  test('the redundant focus/plain-effect double trigger is collapsed to one', () => {
    expect(SRC).toMatch(/useFocusEffect\(useCallback\(\(\) => \{ load\(\); \}, \[load\]\)\);/);
    // The old bare `useEffect(() => { load(); }, [load]);` sibling trigger
    // must be gone; useFocusEffect alone already re-fires on every load()
    // dependency change while the screen is focused.
    expect(SRC).not.toMatch(/useEffect\(\(\) => \{ load\(\); \}, \[load\]\);/);
  });

  test('the ED-flag read this screen feeds is untouched (do-not-touch carve-out)', () => {
    // ED-2 fix (fail-closed): the read maps a transient error to the truthy
    // 'read_failed' sentinel, which setEdFlagOpen(!!edFlag) treats as flag-open.
    // The Diary race-guard / date-jump change leaves this read exactly as-is.
    expect(SRC).toMatch(/getOpenEdPatternFlag\(userId\)\.catch\(\(\) => 'read_failed'\)/);
    expect(SRC).toMatch(/setEdFlagOpen\(!!edFlag\)/);
  });
});

describe('DiaryScreen NAV-3 date-jump wiring', () => {
  test('imports DiaryDatePicker, the DateTimePicker wrapper (no new dependency)', () => {
    expect(SRC).toMatch(/import DiaryDatePicker from '\.\.\/components\/food\/DiaryDatePicker';/);
  });

  test('a controlled visible state opens and closes the picker', () => {
    expect(SRC).toMatch(/const \[datePickerVisible, setDatePickerVisible\] = useState\(false\);/);
    // Haptics completion pass (2026-07-10): a haptics.selection() call was
    // added inside the handler (not at the onPress={openDatePicker}
    // callsite below, which the next test still pins as a bare reference),
    // so the regex tolerates that one extra leading statement.
    expect(SRC).toMatch(/const openDatePicker = useCallback\(\(\) => \{ (?:haptics\.selection\(\); )?setDatePickerVisible\(true\); \}, \[\]\);/);
    expect(SRC).toMatch(/const closeDatePicker = useCallback\(\(\) => setDatePickerVisible\(false\), \[\]\);/);
  });

  test('picking a date sets selectedDate directly, the same state the chevrons drive', () => {
    expect(SRC).toMatch(/const onPickDate = useCallback\(\(iso\) => setSelectedDate\(iso\), \[\]\);/);
  });

  test('the date label is wrapped in a labelled pressable that opens the picker', () => {
    expect(SRC).toMatch(/const dateHeading = isViewingToday \? 'Today' : friendlyDate\(selectedDate\);/);
    expect(SRC).toMatch(/const dateSubCopy = selectedDateDetail;/);
    expect(SRC).toMatch(
      /onPress=\{openDatePicker\}[\s\S]{0,160}accessibilityLabel=\{`\$\{dateHeading\}, \$\{dateSubCopy\}\. Jump to a date`\}/,
    );
  });

  test('DiaryDatePicker is rendered wired to selectedDate and the open/close/change handlers', () => {
    expect(SRC).toMatch(
      /<DiaryDatePicker\s*\n\s*visible=\{datePickerVisible\}\s*\n\s*valueIso=\{selectedDate\}\s*\n\s*onChange=\{onPickDate\}\s*\n\s*onClose=\{closeDatePicker\}\s*\n\s*\/>/,
    );
  });

  test('the chevrons are untouched: still call gotoYesterday / gotoTomorrow directly', () => {
    expect(SRC).toMatch(/onPress=\{gotoYesterday\}[\s\S]{0,220}accessibilityLabel="Previous day"/);
    expect(SRC).toMatch(/onPress=\{gotoTomorrow\}[\s\S]{0,220}accessibilityLabel="Next day"/);
  });

  test('the day-swipe gesture wiring is untouched', () => {
    expect(SRC).toMatch(/<GestureDetector gesture=\{daySwipe\}>/);
    expect(SRC).toMatch(/Gesture\.Fling\(\)\.direction\(Directions\.LEFT\)\.onEnd\(\(\) => \{ runOnJS\(next\)\(\); \}\)/);
  });
});

describe('DiaryScreen empty-day add flow', () => {
  test('the empty diary uses the same inferred meal slot as barcode scanning and keeps meal planning primary', () => {
    expect(SRC).toMatch(/const likelyMealSlot = useMemo\(\(\) => \{/);
    expect(SRC).toMatch(/inferMealSlotForHour\(new Date\(\)\.getHours\(\), keys\)/);
    expect(SRC).toMatch(/onAdd=\{\(\) => addFood\(likelyMealSlot \|\| 'meal_1'\)\}/);
    expect(SRC).toMatch(/onPlanDay=\{\(\) => navigation\.navigate\('MealPlan', \{ entryDate: selectedDate \}\)\}/);
    expect(SRC).not.toMatch(/initialTab: 'suggested'/);
    expect(SRC).toMatch(/addLabel="Add food"/);
    expect(SRC).not.toMatch(/likelyMealLabel/);
    expect(SRC).toMatch(/navigation\.navigate\('ScanBarcode', \{ entryDate: selectedDate, mealSlot: likelyMealSlot \}\)/);
  });
});

describe('DiaryScreen macro detail entry points', () => {
  test('the macro rings open breakdown details without a duplicate day-summary card', () => {
    expect(SRC).toMatch(/<MacroRings[\s\S]*onPress=\{viewEntries\.length \? \(\) => setBreakdownVisible\(true\) : undefined\}/);
    expect(SRC).not.toMatch(/DiaryDaySummaryCard/);
    expect(SRC).not.toMatch(/Today at a glance/);
  });
});

describe('DiaryScreen diary tools', () => {
  test('copy and insights live in a clear tools sheet, not a generic alert', () => {
    expect(SRC).toMatch(/accessibilityLabel="Open diary tools"/);
    expect(SRC).toMatch(/accessibilityLabel="Diary tools"/);
    // Batch 2 wave B (B-5 section-label consolidation): moveTitle is now a raw
    // <Text> routed through the shared SectionLabel overline role, not a plain <Text>.
    expect(SRC).toMatch(/<SectionLabel style=\{styles\.moveTitle\}>Day tools<\/SectionLabel>/);
    // CP-10 batch E (2026-07-10): DiaryScreen now reads a live theme
    // (src/hooks/useTheme.js), so styles.diaryToolTitle gained a
    // live.diaryToolTitle override in a style array. The pinned contract
    // (which frozen style backs this text) is unchanged -- widened only to
    // allow the insertion.
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.diaryToolTitle, live\.diaryToolTitle\]\}>Copy from another day<\/Text>/);
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.diaryToolTitle, live\.diaryToolTitle\]\}>Trends and export<\/Text>/);
    expect(SRC).toMatch(/Copy foods from another day, check nutrition trends, or export your diary\./);
    expect(SRC).not.toMatch(/'Diary options'/);
  });
});

describe('DiaryScreen meal-planning entry point', () => {
  test('meal planning stays as one plain route, not another summary block', () => {
    expect(SRC).toMatch(/navigation\.navigate\('MealPlan', \{ entryDate: selectedDate \}\)/);
    expect(SRC).toMatch(/accessibilityLabel="Open meal builder for this day or week"/);
    // CP-10 batch E (2026-07-10): live-themed, so the Ionicons colour prop
    // now reads t.colors.textSecondary instead of the frozen colors import,
    // and buildPlanLabel/buildPlanIcon carry a live.* style-array override.
    // Same pins, new shape; the frozen buildPlanIcon definition below (still
    // colors.surface/colors.border) is untouched.
    expect(SRC).toMatch(/<Ionicons name="restaurant-outline" size=\{18\} color=\{t\.colors\.textSecondary\} \/>/);
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.buildPlanLabel, live\.buildPlanLabel\]\}>Meal builder<\/Text>/);
    expect(SRC).toMatch(/Create today or the week from your targets\. You review everything before it is logged\./);
    expect(SRC).toMatch(/buildPlanIcon: \{[\s\S]*backgroundColor: colors\.surface,[\s\S]*borderColor: colors\.border/);
  });

  test('small diary actions use button chrome instead of loose text links', () => {
    // CP-10 batch E (2026-07-10): live-themed, so each style prop now carries
    // the style-array form with a live.* override alongside the frozen
    // style. Same pins, new shape; the frozen definitions below are untouched.
    expect(SRC).toMatch(/style=\{\[styles\.offCardButton, live\.offCardButton, styles\.offCardButtonMuted, live\.offCardButtonMuted\]\}/);
    expect(SRC).toMatch(/style=\{\[styles\.offCardButton, live\.offCardButton\]\}/);
    expect(SRC).toMatch(/style=\{\[styles\.plannedBtnGhostButton, live\.plannedBtnGhostButton\]\}/);
    expect(SRC).toMatch(/readOnlyCtaButton: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(SRC).toMatch(/offCardButton: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(SRC).toMatch(/plannedBtnGhostButton: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(SRC).toContain('readOnlyCta: { ...type.label, color: colors.textPrimary }');
    expect(SRC).toContain('offCardCta: { ...type.label, color: colors.textPrimary }');
    expect(SRC).toContain('plannedBtnGhost: { ...type.label, color: colors.textPrimary }');
    expect(SRC).toMatch(/offCardRow: \{[\s\S]*flexWrap: 'wrap'/);
    expect(SRC).toMatch(/plannedBannerRow: \{[\s\S]*flexWrap: 'wrap'/);
    // Batch 2 wave B (B-2 Button adoption): bankRow's hand-rolled TouchableOpacity
    // + Ionicons + Text now renders as <Button icon="restaurant-outline" variant="secondary">,
    // so the icon is a prop, not a raw <Ionicons> child.
    // CP-10 batch E: bankRow's style prop also gained a live.bankRow override.
    expect(SRC).toMatch(/icon="restaurant-outline"[\s\S]{0,80}variant="secondary"[\s\S]{0,60}style=\{\[styles\.bankRow, live\.bankRow\]\}/);
    expect(SRC).toMatch(/bankRow: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(SRC).toContain('bankRowText: { ...type.label, color: colors.textPrimary }');
    expect(SRC).not.toMatch(/bankRowText: \{ color: colors\.primary/);
    expect(SRC).not.toMatch(/readOnlyCta: \{[\s\S]*color: colors\.primary/);
    expect(SRC).not.toMatch(/offCardCta: \{[\s\S]*color: colors\.primary/);
    expect(SRC).not.toMatch(/plannedBtnGhost: \{[\s\S]*color: colors\.primary/);
  });
});

describe('DiaryScreen date navigation polish', () => {
  test('date navigation renders as one coherent rail, not separate dark chevrons around a grey box', () => {
    const dateClusterStyle = SRC.match(/dateCluster: \{[\s\S]*?\n  \},/)?.[0] || '';
    const dateButtonStyle = SRC.match(/dateButton: \{[\s\S]*?\n  \},/)?.[0] || '';
    // CP-10 batch E (2026-07-10): live-themed, so styles.dateCluster gained a
    // live.dateCluster override, and the three chevron/calendar Ionicons now
    // read t.colors.textSecondary instead of the frozen colors import. Same
    // pins, new shape; the frozen style/colour tokens below are untouched.
    expect(SRC).toMatch(/<View style=\{\[styles\.dateCluster, live\.dateCluster\]\}>/);
    expect(SRC).toMatch(/Ionicons name="chevron-back" size=\{21\} color=\{t\.colors\.textSecondary\}/);
    expect(SRC).toMatch(/Ionicons name="calendar-outline" size=\{15\} color=\{t\.colors\.textSecondary\}/);
    expect(SRC).toMatch(/Ionicons name="chevron-forward" size=\{21\} color=\{t\.colors\.textSecondary\}/);
    expect(dateClusterStyle).toMatch(/borderWidth: 1/);
    expect(dateClusterStyle).toMatch(/backgroundColor: colors\.surface/);
    expect(dateClusterStyle).toMatch(/minHeight: 44/);
    expect(SRC).toMatch(/dayPagerNav: \{[\s\S]*width: 42,[\s\S]*height: 42/);
    expect(SRC).toMatch(/dayPagerNav: \{[\s\S]*backgroundColor: 'transparent'/);
    expect(SRC).toMatch(/todayPillText: \{ \.\.\.type\.caption, color: colors\.textPrimary/);
    expect(dateButtonStyle).toMatch(/backgroundColor: 'transparent'/);
    expect(dateButtonStyle).not.toMatch(/borderWidth: 1/);
    expect(dateButtonStyle).not.toMatch(/backgroundColor: colors\.surface/);
  });
});

describe('DiaryScreen bottom controls', () => {
  test('selection toolbar and barcode FAB respect the device bottom inset', () => {
    expect(SRC).toMatch(/import \{ SafeAreaView, useSafeAreaInsets \} from 'react-native-safe-area-context';/);
    expect(SRC).toMatch(/const insets = useSafeAreaInsets\(\);/);
    expect(SRC).toMatch(/const scanFabStyle = useMemo\(/);
    expect(SRC).toMatch(/bottom: spacing\.xl \+ bottomInset/);
    expect(SRC).toMatch(/const selectionBarStyle = useMemo\(/);
    expect(SRC).toMatch(/paddingBottom: spacing\.xl \+ bottomInset/);
  });
});

describe('DiaryScreen saved food entry points', () => {
  test('the meal-card Saved action opens one chooser for saved meals and recipes', () => {
    expect(SRC).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(SRC).toMatch(/const \[savedPickerSlot, setSavedPickerSlot\] = useState\(null\);/);
    expect(SRC).toMatch(/function addSavedMeal\(slot\) \{\s*setSavedPickerSlot\(slot\);\s*\}/);
    expect(SRC).toMatch(/accessibilityLabel="Saved meals and recipes"/);
    // CP-10 batch E (2026-07-10): live-themed, so each style prop now carries
    // the style-array form with a live.* override. Same pins, new shape.
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.savedFoodTitle, live\.savedFoodTitle\]\}>Saved meals and recipes<\/Text>/);
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.savedFoodOptionTitle, live\.savedFoodOptionTitle\]\}>Saved meals<\/Text>/);
    expect(SRC).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.savedFoodOptionTitle, live\.savedFoodOptionTitle\]\}>Recipes<\/Text>/);
    expect(SRC).toMatch(/is in Saved meals/);
    expect(SRC).toMatch(/navigation\.navigate\(routeName, \{ mealSlot, entryDate: selectedDate \}\)/);
    expect(SRC).toMatch(/openSavedFoodRoute\('MyMeals'\)/);
    expect(SRC).toMatch(/openSavedFoodRoute\('MyRecipes'\)/);
  });
});
