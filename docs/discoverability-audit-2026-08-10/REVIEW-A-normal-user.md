# Campaign 3, Phase 24 — REVIEW A: NORMAL USER (fresh-eyes adversarial)

Reviewer: fresh-eyes agent, read-only. Tree judged: branch
`claude/campaign3-discoverability` at HEAD (`ba120bd5`), campaign diff
`git diff 9aae57cb..HEAD -- src/`. Authority: the founder's Campaign 3
order, Phase 24 Review A (ten questions), verbatim in the session
scratchpad `c3-CAMPAIGN3-ORDER.txt:951-970`.

Standard applied, per brief: a finding is GENUINE only if a normal user
path FAILS ON SCREEN in the current tree. Not findings: the four open
founder rulings (FR-1..FR-5, open by design), cardio (permanently out of
scope), dead-code items (Campaign 4's).

---

## Verdict table

| # | Question | Verdict |
|---|---|---|
| 1 | Could I find where to change reminders? | PASS |
| 2 | Could I change my units? | FINDING (F-A2) |
| 3 | Could I find dietary/allergen settings? | PASS |
| 4 | Could I find training preferences? | FINDING (F-A3) |
| 5 | Could I understand where coaching mode is changed? | PASS |
| 6 | Could I find an advanced setting if I knew it existed? | FINDING (F-A3) |
| 7 | Are important controls hidden behind gestures? | PASS |
| 8 | Does Settings feel overwhelming? | PASS |
| 9 | Are contextual features appearing at sensible moments? | FINDING (F-A1) |
| 10 | Is anything exposed that should remain internal? | PASS |

Four genuine findings. Three of them (F-A1, F-A2, F-A3) are one bug
class: **every contextual shortcut this campaign added crosses a tab
stack boundary using the bare `navigation.navigate()` form, which React
Navigation silently drops.** This repo already named, fixed and guarded
that exact class once in production.

---

## THE HEADLINE: all three new contextual shortcuts are dead taps

The repo's own law, `src/navigation/navigateCrossTab.js:1-18`:

> "The one sanctioned way to navigate from inside one tab's stack to a
> screen in ANOTHER tab's stack. A plain `navigation.navigate('Screen')`
> silently no-ops when the target lives in a different stack (the F4
> dead-tap bug class, already bitten once in production) ... A source
> guard (`navigationTargets.guard.test.js`) bans hand-rolled
> `getParent()?.navigate` calls outside this file so the idiom cannot
> fragment again."

Restated inside the navigator itself, `src/navigation/RootNavigator.js:429-432`:

> "React Navigation silently DROPS a navigate to a route the stack has
> not registered (the F4 bug class)".

Tab → stack map (`RootNavigator.js:638-642`): `HomeTab`→HomeStack (:449),
`PlansTab`→PlansStack (:479), `DiaryTab`→DiaryStack (:372),
`ProgressTab`→ProgressStack (:506), `ProfileTab`→ProfileStack (:541).
`MainTabs` is the top navigator — `LockedMainTabs` (:656-671) is a plain
`<View>` overlay wrapper, not a stack — so there is no ancestor that can
resolve any of the three routes below.

### F-A1 — Diary's per-day-offset row does nothing (Q9)

- Control: `src/screens/DiaryScreen.js:1436-1446`, `onPress` at **:1438**
  → `navigation.navigate('PerDayTargets')`.
- DiaryScreen is registered in **DiaryStack** (`RootNavigator.js:373`).
- `PerDayTargets` is registered **only** in ProfileStack
  (`RootNavigator.js:559`). DiaryStack (:372-434) does not register it.
- On screen: a Pro user with a weekday offset set sees
  "Includes your +250 kcal day adjustment. **Edit**" under their target,
  taps it, and nothing happens. Ever.
- The state gate itself is correct (`perDayOffsetKcal !== 0`, :1436) —
  the card appears at exactly the right moment and then fails.

### F-A2 — Body metrics' "Change units" row does nothing (Q2)

- Control: `src/screens/BodyMetricsScreen.js:1111-1119`, `onPress` at
  **:1113** → `navigation.navigate('SettingsWorkout')`.
- `SettingsWorkout` is registered **only** in ProfileStack
  (`RootNavigator.js:545`).
- Every reachable route into BodyMetrics lands it in **ProgressStack**
  (`RootNavigator.js:512`): `AnalyticsScreen.js:807` (the Progress tab's
  "Body Metrics" tile), `LiftProgressScreen.js:323`, and
  `AthleteProfileScreen.js:569` which explicitly does
  `navigateCrossTab(navigation, 'ProgressTab', 'BodyMetrics')`.
  Nothing in the app navigates to the ProfileStack copy at
  `RootNavigator.js:561`, so the one stack where this row would work is
  the one no user can reach BodyMetrics in.
- On screen: "Shown in kg. **Change units**" under the weight figure —
  the campaign's answer to Q2 — is inert on 100% of real paths.

### F-A3 — Coach tab's "Volume targets" row does nothing (Q4, Q6)

- Control: `src/screens/YouScreen.js:539-549`, `onPress` at **:548** →
  `navigation.navigate('VolumeHeatmap')`.
- YouScreen is the `ProfileTab` root, i.e. the **Coach** tab
  (`RootNavigator.js:542`, `:642` `title: 'Coach'`).
- `VolumeHeatmap` is registered only in HomeStack (`:455`) and
  ProgressStack (`:510`). ProfileStack (:541-584) does not register it.
- On screen: the row's own subtitle sells the consequence — "Weekly set
  ranges per muscle. Your own numbers take precedence." — and the tap is
  dead. This row exists *because* CONTROL-GAPS-EVIDENCE.md found the
  manual landmark editor's only other route was data-gated behind
  Analytics; the replacement route does not work, so the campaign's
  answer to both Q4 and Q6 lands nowhere. (The underlying editor is
  still reachable the old way, `AnalyticsScreen.js:743`, same stack.)

### Why the existing guard missed all three

`src/__tests__/navigationTargets.guard.test.js:22` canaries only
`PROFILE_ONLY_ROUTES = ['CoachOutput', 'NutritionTargets',
'SettingsPrivacy', 'WeeklyCheckIn']` across five named screens (:25-31).
`PerDayTargets`, `SettingsWorkout` and `VolumeHeatmap` are not in that
list and `BodyMetricsScreen.js`/`YouScreen.js` are not in that file list.

Worse, the campaign's own new suite **pins the broken form as the
expected truth**:

- `src/__tests__/campaign3.discoverability.test.js:55` —
  `expect(src).toMatch(/navigate\('PerDayTargets'\)/)`
- `:59` — `expect(read('screens/YouScreen.js')).toMatch(/navigate\('VolumeHeatmap'\)/)`
- `:63` — `expect(read('screens/BodyMetricsScreen.js')).toMatch(/navigate\('SettingsWorkout'\)/)`

The suite is named "CONTEXTUAL shortcuts navigate to the canonical
owner" (:51) and asserts the string, not the reachability. A green suite
here is evidence of nothing.

**Fix shape (all three, no product change):** swap the bare call for the
sanctioned helper and pin reachability instead of the string —
`navigateCrossTab(navigation, 'ProfileTab', 'PerDayTargets')` from Diary;
`navigateCrossTab(navigation, 'ProfileTab', 'SettingsWorkout')` from
Body metrics; `navigateCrossTab(navigation, 'ProgressTab',
'VolumeHeatmap')` from the Coach tab. Then extend
`navigationTargets.guard.test.js:22` with these three routes and add
`BodyMetricsScreen.js`/`YouScreen.js` to its screen list, so the class
cannot fragment a third time.

### F-A4 — The Diary offset row ignores the user's energy unit (Q2, Q9)

- `src/screens/DiaryScreen.js:1443` hard-codes the string
  `kcal` and prints the raw kcal number:
  `` `Includes your ${...}${Math.abs(perDayOffsetKcal)} kcal day adjustment. Edit` ``
  The accessibility label at :1440 says "calorie" for the same reason.
- The same screen already reads the preference (`:103`,
  `energyUnit: s.accessibility?.energyUnit ?? 'kcal'`), already imports
  the converters (`:74`, `toEnergy, energyUnitLabel`), and already uses
  them elsewhere on the same surface (`:2022`).
- The screen the row points at converts correctly:
  `PerDayTargetsScreen.js:153-155` and `:123` render every offset through
  `toEnergy(..., energyUnit)` + `energyUnitLabel(energyUnit)`.
- On screen: a user who switched to kJ (`SettingsDisplayScreen.js:19-25,
  102-113`; the setting exists precisely so kcal is never shown) sees a
  kcal figure in a kcal-labelled row wedged between kJ figures, and a
  different number for the same offset once the (currently dead) link is
  fixed and they arrive at Per-day targets.
- Fix: `${toEnergy(Math.abs(perDayOffsetKcal), energyUnit)} ${energyUnitLabel(energyUnit)}`,
  same as line 2022. No engine change; display only.

---

## Question-by-question

### 1. Could I find where to change reminders? — PASS

Settings landing carries one obvious row, `SettingsScreen.js:87-92`
"Notifications and reminders / Training, meals, check-ins and quiet
hours". Inside, quiet hours are a titled card on the same screen
(`NotificationSettingsScreen.js:781`), not buried. A Pro user's coaching
reminders are reachable two ways that agree with each other: the Settings
row `SettingsScreen.js:93-100` and the in-context cross-link
`NotificationSettingsScreen.js:630-651` — same route, same stack
(ProfileStack `:575`), so both work.

The cross-link's rewritten subtitle (`:646-647`, "Weigh-in and check-in
times, check-in follow-ups, meal-plan reminders and partner cheers") is
truthful against the destination's own section labels:
`CoachingRemindersScreen.js:399, 424, 461, 485, 509`. That is a real
improvement — the old text ("Always on for Pro") told a user there was
nothing to find.

Campaign additions that hold up: the denied-permission banner now has an
"Open Settings" tap-through (`NotificationSettingsScreen.js:615-623`)
instead of an instruction with no route, and the meal-reminder and
quiet-hours helpers now admit that a switch cannot fire while OS
permission is denied (`:764`, `:821`).

### 2. Could I change my units? — FINDING (F-A2, F-A4)

Both canonical editors are labelled and reachable from the Settings
landing: body weight unit under "Workout & units"
(`SettingsScreen.js:53-58`, sub "Body weight unit, default rest timer and
rest alerts"; control at `SettingsWorkoutScreen.js:91-118`), and food
energy under "Display and accessibility" (`SettingsScreen.js:101-106`,
sub rewritten this campaign to name "energy units"; control at
`SettingsDisplayScreen.js:102-118`). Naming the two unit families in the
two subtitles is the right small move — a user hunting "kJ" now has a
word to aim at.

What fails is the point-of-consequence link the campaign added to close
the gap: `BodyMetricsScreen.js:1113` is a dead tap (F-A2), and the one
new unit-bearing string this campaign wrote ignores the unit setting
entirely (`DiaryScreen.js:1443`, F-A4).

Also observed, not a finding (FR-1 territory, and now honestly
disclosed): the nutrition calculator's weight fields still take
kilograms regardless of the display preference, and now say so —
`NutritionTargetsScreen.js:673`, `:770`.

### 3. Could I find dietary/allergen settings? — PASS

Settings → "Dietary needs / Diet, allergies and foods to avoid"
(`SettingsScreen.js:79-86`), Pro-gated to match the meal-suggestion
engine that consumes it. A second, simpler diet control sits on Settings
→ Profile (`SettingsProfileScreen.js:291-320`), and the Settings landing
names it in that row's subtitle (`:39`, "...and diet preference").

Two editors for one field would normally breach the one-owner law, but
this campaign made them genuinely equivalent rather than merely
co-located: `SettingsProfileScreen.js:44-46` now derives its options from
the shared `DIETS` list in `lib/food/curatedMeals.js`, the same source
`DietaryPreferencesEditor.js` uses, and both call the single
`setDietPreference` action. Before the fix, a pescatarian user opened
Settings → Profile, saw **no chip selected**, and any tap silently
rewrote their diet — a real on-screen failure, correctly found and
correctly closed. The four chips now wrap rather than squash
(`:355-367`).

### 4. Could I find training preferences? — FINDING (F-A3)

The reasonable hunt works for the everyday controls: "Workout & units"
holds rest-timer defaults and rest alerts (`SettingsWorkoutScreen.js:124,
146, 164, 183`), and "Coaching" holds tone, autonomy and the science
layer. The single behaviour-changing training control that the campaign
itself identified as hard to find — weekly volume targets — got a Coach
tab row that does not navigate (F-A3, `YouScreen.js:548`).

### 5. Could I understand where coaching mode is changed? — PASS

The pointer and the destination now agree. `CoachOutputScreen.js:2558`
tells a manual-mode user "Change modes in Settings, under Coaching", the
Settings landing row's rewritten subtitle promises "who applies changes"
(`SettingsScreen.js:45`), and the control is there:
`SettingsCoachingScreen.js:222-256`, chips Coached / Collaborative /
Manual, each with a plain-English consequence line (:229-233). The old
subtitle ("Coach tone, cardio and weekly check-ins") advertised the wrong
contents and never mentioned who applies changes; a user could not have
guessed. Fixed.

Minor wording seam, not a failure: the pointer says "modes", the section
heading says "Autonomy". The subtitle bridge on the landing row carries
the user across, so the path completes.

### 6. Could I find an advanced setting if I knew it existed? — FINDING (F-A3)

Per-day calorie targets: yes — a plain Settings row, `SettingsScreen.js:71-78`,
"Plan a different calorie target for each weekday", same stack, works.
Volume targets: no — the deliberate new route is dead (F-A3). The legacy
route through the Progress tab still works
(`AnalyticsScreen.js:743`), so a motivated user is not fully trapped, but
the fix shipped for this exact question does not fire.

### 7. Are important controls hidden behind gestures? — PASS

The three gesture-only actions the audit found are now visibly routed:

- Plan-day exercise removal: a visible red trash control per exercise,
  `ManualBuilderScreen.js:1167-1174`, reusing the same handler and
  undo-toast path as the long press — no forked state.
- Diary multi-select (move to meal / copy to today / save as meal): a
  visible action inside the sheet a normal tap already opens,
  `FoodDetailSheet.js:463-480` wired at `DiaryScreen.js:1770-1780` into
  the existing `enterSelection`, pre-selecting the entry in view.
- Saved-meals creation: the one instructional string in the app now
  names the gesture instead of assuming it — `MyMealsScreen.js:254`,
  "Press and hold any entry in your diary to start selecting foods,
  then tap 'Save as meal'."

The long press survives as an accelerator and now discloses itself to
screen readers (`EntryRow.js:98`).

Observation, not a finding: the new multi-select control is an icon-only
`checkbox-outline` button (`FoodDetailSheet.js:475`) sitting beside the
trash icon. It carries a full accessibility label and hint (:471-472),
so screen-reader users are better served than sighted ones, and a
sighted user is unlikely to read "checkbox" as "select several entries".
The action is no longer gesture-only, so the Phase 10 law is satisfied —
but if the founder wants this route actually used, a short text label
would earn its space.

### 8. Does Settings feel overwhelming? — PASS

Fourteen rows for a Pro user, eleven for free (`SettingsScreen.js:29-145`),
one line each, every row carrying a subtitle that says what is inside.
Nothing renders inline; every row opens a focused sub-page, which is the
screen's stated contract (`:9-16`). This is a directory, not a wall — the
order's "100 settings" failure mode is not present.

Observation, not a finding: the list is a single unsectioned card, so
identity, coaching, nutrition, notifications, display, data and legal all
read at one visual level, and the three nutrition rows (:59-86) plus the
two reminder rows (:87-100) sit adjacent without a heading to separate
their domains. Phase 3's "better section headings" is the cheapest
remaining improvement here, but no path fails, so it is not a finding.

### 9. Are contextual features appearing at sensible moments? — FINDING (F-A1, F-A4)

The gating logic is right, which makes the failure sharper. The Diary
offset row renders only when an offset actually applies to the day in
view (`DiaryScreen.js:1436`), so it is invisible clutter-free for
everyone else and appears exactly at the point of consequence — and then
does nothing when tapped (F-A1) while stating the number in a unit the
user may have turned off (F-A4).

Other contextual work in this campaign does hold:

- `ScanBarcodeScreen.js:389-397` adds "No barcode? Scan the label" beside
  the existing manual-entry link, in the same visual grammar. Both
  `ScanBarcode` and `ScanLabel` live in DiaryStack
  (`RootNavigator.js:389, 395`), so the `navigation.replace` at
  `ScanBarcodeScreen.js:146` resolves — this one works.
- `PlansScreen.js:826-838` stops sending a free user tapping "Build a new
  plan" to the paywall for a feature the same screen gives away, routing
  `repeat`/`adjust` to `PlanLibrary` (free) and reserving `ProUpgrade`
  for `consider_rebuild`, whose label really is "Review with coach"
  (`blockAdvisor.js:182-225`). Both routes are registered in PlansStack
  (`RootNavigator.js:486, 487`). Correct, and it works.

### 10. Is anything exposed that should remain internal? — PASS

- Debug log: reachable only through an undisclosed tap-count on the
  version row (`SettingsAboutScreen.js:95-109`, dev long-press at :130),
  never advertised as a row. The file's own header (:11-14) records that
  the row was deliberately removed. Correct.
- Meal names: route stays registered but the Settings row was removed by
  founder order and stays removed (`SettingsScreen.js:67-70`).
- Cycle tracking is now gated to the tier of its only reader
  (`SettingsCoachingScreen.js:282`), so a free user no longer sees a
  toggle that saves a preference nothing reads.
- Engine internals (MEV/MAV/MRV landmarks, adaptive weights) are not
  exposed as controls anywhere in the diff.

One boundary note for the founder, deliberately **not** counted as a
finding (cardio is out of scope for me and the item is already recorded):
`SettingsCoachingScreen.js:162-170` still renders a live "Cardio logging"
toggle inside the Pro block. It predates this campaign and
`SETTINGS-OWNERSHIP.md:94-98` records it for Campaign 4. Flagging only
because the order's Phase 25 boundary check reads "CARDIO — no entry, no
**settings**, no education, no route restored", so the final handover
should state it explicitly rather than let a boundary confirmation be
read as covering it.

---

## Summary of genuine findings

| ID | Site | Failure on screen |
|---|---|---|
| F-A1 | `DiaryScreen.js:1438` | "Edit" on the per-day offset row does nothing (`PerDayTargets` not in DiaryStack) |
| F-A2 | `BodyMetricsScreen.js:1113` | "Change units" does nothing on every reachable path (`SettingsWorkout` not in ProgressStack) |
| F-A3 | `YouScreen.js:548` | Coach tab "Volume targets" does nothing (`VolumeHeatmap` not in ProfileStack) |
| F-A4 | `DiaryScreen.js:1443` | Offset row prints hard-coded `kcal` and an unconverted number for a kJ user |

Supporting defect: `campaign3.discoverability.test.js:51-65` pins the
broken navigate strings as the expected truth, and
`navigationTargets.guard.test.js:22-31` does not cover these routes or
screens. Both need updating alongside the fixes, or the class recurs.

## Device checklist for the fixes (physical Android, EAS build)

1. Pro account, Settings → Per-day targets, set Monday to +250 kcal, save.
   Expected: saved.
2. Nutrition tab → Diary, view that Monday. Expected: a row reading
   "Includes your +250 kcal day adjustment. Edit".
3. Tap it. Expected: Per-day targets opens; back returns to the Diary.
4. Settings → Display and accessibility → energy unit kJ. Return to that
   Monday in the Diary. Expected: the offset row states the figure in kJ
   with a kJ label, matching the figure Per-day targets shows.
5. Progress tab → Body Metrics → tap "Change units". Expected: Workout &
   units opens; back returns to Body metrics.
6. Coach tab → "Volume targets". Expected: the volume-target editor
   opens; back returns to the Coach tab.
7. ED-safety cases (steps 1-4 are weight/food-adjacent): with calm mode
   on and with an open ED flag, repeat steps 2-4. Expected: no new
   weight or calorie commentary appears beyond the existing suppression
   behaviour, and the offset row's wording is unchanged and neutral.
