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
    expect(SRC).toMatch(/const openDatePicker = useCallback\(\(\) => setDatePickerVisible\(true\), \[\]\);/);
    expect(SRC).toMatch(/const closeDatePicker = useCallback\(\(\) => setDatePickerVisible\(false\), \[\]\);/);
  });

  test('picking a date sets selectedDate directly, the same state the chevrons drive', () => {
    expect(SRC).toMatch(/const onPickDate = useCallback\(\(iso\) => setSelectedDate\(iso\), \[\]\);/);
  });

  test('the date label is wrapped in a labelled pressable that opens the picker', () => {
    expect(SRC).toMatch(/const dateHeading = isViewingToday \? 'Today' : friendlyDate\(selectedDate\);/);
    expect(SRC).toMatch(/const dateSubCopy = isViewingToday \? friendlyDate\(selectedDate\) : selectedDateDetail;/);
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
    expect(SRC).toMatch(/onPress=\{gotoYesterday\}[\s\S]{0,120}accessibilityLabel="Previous day"/);
    expect(SRC).toMatch(/onPress=\{gotoTomorrow\}[\s\S]{0,120}accessibilityLabel="Next day"/);
  });

  test('the day-swipe gesture wiring is untouched', () => {
    expect(SRC).toMatch(/<GestureDetector gesture=\{daySwipe\}>/);
    expect(SRC).toMatch(/Gesture\.Fling\(\)\.direction\(Directions\.LEFT\)\.onEnd\(\(\) => \{ runOnJS\(next\)\(\); \}\)/);
  });
});

describe('DiaryScreen empty-day add flow', () => {
  test('the empty diary uses the same inferred meal slot as barcode scanning', () => {
    expect(SRC).toMatch(/const likelyMealSlot = useMemo\(\(\) => \{/);
    expect(SRC).toMatch(/inferMealSlotForHour\(new Date\(\)\.getHours\(\), keys\)/);
    expect(SRC).toMatch(/onAdd=\{\(\) => addFood\(likelyMealSlot \|\| 'meal_1'\)\}/);
    expect(SRC).toMatch(/addLabel=\{`Log \$\{likelyMealLabel\}`\}/);
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
    expect(SRC).toMatch(/<Text style=\{styles\.diaryToolTitle\}>Copy a logged day<\/Text>/);
    expect(SRC).toMatch(/<Text style=\{styles\.diaryToolTitle\}>Insights and export<\/Text>/);
    expect(SRC).not.toMatch(/'Diary options'/);
  });
});

describe('DiaryScreen meal-planning entry point', () => {
  test('meal planning stays as one plain route, not another summary block', () => {
    expect(SRC).toMatch(/accessibilityLabel="Plan meals: build meals for today or the week, swap anything first, then add them to your diary"/);
    expect(SRC).toMatch(/<Ionicons name="restaurant-outline" size=\{18\} color=\{colors\.primary\} \/>/);
    expect(SRC).toMatch(/<Text style=\{styles\.buildPlanLabel\}>Plan meals<\/Text>/);
    expect(SRC).toMatch(/Build today or the week ahead, swap anything, then add it to your diary\./);
  });
});

describe('DiaryScreen saved food entry points', () => {
  test('the meal-card Saved action opens one chooser for saved meals and recipes', () => {
    expect(SRC).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(SRC).toMatch(/const \[savedPickerSlot, setSavedPickerSlot\] = useState\(null\);/);
    expect(SRC).toMatch(/function addSavedMeal\(slot\) \{\s*setSavedPickerSlot\(slot\);\s*\}/);
    expect(SRC).toMatch(/accessibilityLabel="Saved food"/);
    expect(SRC).toMatch(/navigation\.navigate\(routeName, \{ mealSlot, entryDate: selectedDate \}\)/);
    expect(SRC).toMatch(/openSavedFoodRoute\('MyMeals'\)/);
    expect(SRC).toMatch(/openSavedFoodRoute\('MyRecipes'\)/);
  });
});
