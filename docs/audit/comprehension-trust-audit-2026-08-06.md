# Comprehension and trust audit — 2026-08-06

Founder order (verbatim, typos preserved): "I want you to extensively audit
the app of things that will cause confusion or trust breaking information.
Make sure the app doors and delivers what it says in all areas. If
information is in a format the user might not understand it's delivered on a
way they will. In progress they been see the progress and understand how it
is measured not just a line on a graph. If it's an average are we explaining
it well. The audit all pages for design inconsistency issues. Make sure every
area is understandable to the general population as well. Not just gum goers."

Method: 12 read-only Sonnet auditors (9 product areas + 3 cross-cutting
lenses: charts/averages, jargon/plain-language, design consistency), every
screen and component read in full, every claim traced to the computing code.
Then every high/medium TRUST finding was adversarially re-verified by an
independent agent briefed to REFUTE it. 39 agents total. 194 surfaces
recorded as checked-and-sound (coverage list in the workflow journal).
Result: 24 confirmed trust mismatches, 3 accusations refuted, 37
comprehension/progress/jargon/design findings.

Rulings below are lead-ruled under D33 (recorded as D89 in the decisions
register): the criterion is the best outcome for users, never effort.
Waves: W1 = copy-level truth fixes (this landing). W2 = small code fixes.
W3 = real code work. Each finding: FIX(Wn) or NO CHANGE with rationale.

---

## A. CONFIRMED TRUST FINDINGS (UI says X, code does Y) — all verified

**T1 [high] Widget streak is permanently dead.** `src/lib/widgets/writer.js:63`
hardcodes `streakWeeks: 0`; both renderers (widgets.js:110, Swift :226) gate
the "N weeks running" line on it, and the widget gallery copy promises "your
streak". The streak line can never render. RULING: FIX(W3) — wire the real
weekly streak into gatherWidgetInputs (same computation the Home streak uses,
ED-suppression already applies to the consistency object). If the streak
logic lives only in a hook, extract the pure part; do not fork the rules.

**T2 [medium] "progressed this week" isn't week-scoped.**
HomeProTeaserCard.js:34; getProgressionTeaser compares the two most recent
completed workouts regardless of date (database.js:7122). RULING: FIX(W1) —
copy becomes "progressed last session", which is always literally true.

**T3 [high] "Repeat as-is" opens an empty workout for freeform sessions.**
WorkoutHistoryScreen.js:172-195 implements only the routine-linked branch;
its own comment promises the logged-sets fallback that was never written.
RULING: FIX(W3) — implement the else branch: rebuild initialExercises from
the session's logged sets, as the comment already specifies.

**T4 [downgraded to hygiene] History tonnage chip hardcodes 'kg'.**
WorkoutHistoryScreen.js:449. The verifier for a SIBLING finding proved gym
units are kg-only by founder order (store forces `units: 'kg'`;
"nobody in the UK uses lbs"), so no live user can see a wrong unit. RULING:
FIX(W2) — one-line alignment with the WorkoutSummaryScreen pattern so the
latent lie dies; not a user-visible defect today.

**T5 [high] Volume tooltip claims targets "adjust over time based on how
your body responds".** WorkoutSummaryScreen.js:1296. getVolumeStatus is
called without customLandmarks; the bands are the static research table for
every user (algorithms.js:237). Nothing adapts them automatically. RULING:
FIX(W1) — copy tells the truth: research-based starting ranges, editable by
hand via Edit volume targets on the Volume screen. Auto-adapting landmarks
would be a new engine feature: surfaced to the founder as a product
question, not smuggled in as a bug fix.

**T6 [medium] "the Epley formula" is actually an Epley/Brzycki blend.**
ExerciseDetailScreen.js:807 vs calculate1RM (algorithms.js:77). RULING:
FIX(W1) — name the real method.

**T7 [medium] Two different "this week"s on the same screens.** Volume
snapshot + muscle frequency use a rolling trailing-7-days window
(useProgressData.js:251,406) while the streak strip on the same screens uses
the Monday-anchored calendar week — dayKey.js's own header says every "this
week" boundary must use localWeekStartMs. RULING: FIX(W3) — converge the
rolling surfaces on the calendar week (the house rule), not relabel. Same
family as X10.

**T8 [high] Relative-strength tooltip anchors contradict the badges.**
LiftProgressScreen.js:288 states one universal 1.0x/1.5x/2.0x scale;
strengthStandards.js uses five per-lift tables (bench Elite = 1.50x, squat
Elite = 2.50x...). A 1.5x bench reads "strong for most people" in the
tooltip and "Elite" on the row beside it. RULING: FIX(W1) — rewrite tooltip:
each lift has its own thresholds (pressing lower, squat/deadlift higher);
drop the false universal anchors.

**T9 [medium] Snapshots promised "before each app update".**
SnapshotsScreen.js:119; snapshots fire only before a local schema migration.
RULING: FIX(W1) — "before updates that change how your data is stored".

**T10 [high] Partner share promises "the composed progress image"; only a
text card is ever sent.** shareWins.js:21/190; partner_win_cards carries no
image by design (migrate_107 header). The pre-send "will see" preview and
the delivered card both mis-describe the send. RULING: FIX(W1) — copy states
plainly a text summary crosses, never the image. (The privacy design is
right; the description of it was wrong.)

**T11 [high] Shared-streak counts the in-progress week.**
sharedStreak.js's contract says callers must pass finished weeks only;
usePartners.js:221 feeds it the unfiltered signals table, so "N weeks
running together" can increment midweek. RULING: FIX(W3) — filter to weeks
strictly before the current local week, honouring the module's documented
contract.

**T12 [high] Cardio calories: two surfaces, opposite claims.**
CardioPlanCard.js:67 "Cardio is already counted in your calorie target" vs
LogCardioScreen.js:234 "This isn't added to your calorie target...". The
engine matches the second (cardioMath.js:6). RULING: FIX(W1) — CardioPlanCard
adopts the truthful mechanism copy; one explanation everywhere.

**T13 [high] "Coach reminders set" shown even when the user declined
notifications.** ProSetupCompleteScreen.js:250 renders unconditionally;
scheduling only happens if permission was granted. RULING: FIX(W3) — badge
reads real permission state; denied → "Reminders off. Enable in Settings"
with tap-through.

**T14 [medium] "your latest weight" is a smoothed trend.**
ProGoalSetupScreen.js:592 shows the EWMA value labelled "latest weight".
RULING: FIX(W1) — label it "recent weight trend", matching the trend
vocabulary the check-in and coach screens already use. (= O10.)

**T15 [high] "Show the science" toggle is wired to nothing.**
SettingsCoachingScreen.js:253 writes showScience; the only consumer
(withScience, coachRegister.js:340) is never called anywhere. RULING:
FIX(W3) — wire it through the coach-output explanation rendering (the
sibling coachTone shows the pattern). Inspect scope first; if the plain/
technical term pairs don't exist yet, that fork goes to the founder — the
toggle must not keep promising content that cannot render.

**T16 [high] Free users are told sessions "adjust" to readiness; the
adjustment is Pro-only.** SettingsCoachingScreen.js:144 (row is tier-blind);
readinessTweak is `tier === 'pro'` (ActiveWorkoutScreen.js:502). RULING:
FIX(W3) — tier-aware copy, not gating: Free keeps the check-in (habit and
honesty value) but its copy stops promising adjustment; Pro copy unchanged.
Removing the row from Free risks breaching "never gate a free feature";
lying to Free breaches trust. Honest copy breaches neither.

**T17 [medium] Quiet hours claim "every reminder"; training reminders
bypass them.** NotificationSettingsScreen.js:800; trainingReminders.js never
consults quietHours. RULING: FIX(W3) — wire trainingReminders through the
same quiet-hours shift as the other four schedulers, AFTER re-reading
docs/NOTIFICATIONS_LOCKED.md; if the locked spec forbids it, fall back to
truthful copy. Users should get the behaviour promised, not a smaller
promise.

**T18/T19 [medium] "Calmer coaching... safer calorie floors" — the floors
never vary.** SettingsCoachingScreen.js:131 and SettingsFaqScreen.js:102.
The calorie floors are sex-only, always-on, mode-blind (nutritionEngine,
coachApply — verified no calmMode read anywhere in the floor path). The
current copy implies floors are weaker with the setting off, which is false
and undersells the always-on protection. RULING: FIX(W1) — copy describes
what calm mode actually changes (quieter progress prompts, no pushes to do
more) and drops the floor claim. NOTE: this is copy about the ED-safety
system; no floor, gate, threshold or suppression changes. Flagged to the
founder in the landing report for veto.

**T20 [high] Fatigue sparkline clips level-5 sessions.**
FatigueTrendCard.js:66 passes maxValue={4} for a 1-5 scale;
SvgBarSparkline computes unclamped ratios, so "Exhausted" renders identical
to "High". RULING: FIX(W2) — clamp ratio in SvgBarSparkline (defends all
callers) and correct maxValue to 5.

**T21 [medium] "Weighted 7-day average" is an unbounded half-life decay.**
ReadinessCards.js:215; recoveryEMA.js weighs the entire history with a
7-day half-life. RULING: FIX(W1) — describe the real behaviour: "a running
average weighted so your most recent check-ins count most". (= O9; O25
wording aligned to match.)

**T22 [medium] "4-wk avg" can be a 2- or 3-week average.**
ProgressSections.js:306; getAcuteChronicWorkload drops zero-tonnage weeks
and only needs 2. The true count (weeksOfData) is computed and then
discarded before the UI. RULING: FIX(W2) — thread weeksOfData through and
make the label dynamic ("{n}-wk avg"); zero-filling weeks would poison the
chronic-load comparison after any break, so the method stays.

**T23 [medium] "Gaining/Losing weight" chip regresses over the last 8
ENTRIES, not a time window.** BodyMetricsScreen.js:142; sporadic loggers get
a months-stale verdict presented as current, with no tooltip. RULING:
FIX(W2) — bound detectPhase to a recent time window and add an InfoTooltip
stating the basis. (= O8.)

**T24 [high] "best volume" headline: unitless 5-digit number, and 'Volume'
collides with the app's other Volume.** LiftProgressScreen.js:446 (+
ExerciseDetailScreen 'Volume'/'Best-set vol' lenses, O20). Session
weight×reps totals render with no unit, no separator, no tooltip — while
'Volume' is defined app-wide as weekly hard sets. RULING: FIX(W2) — rename
these lenses "Total lifted", render the unit and thousands separator, add a
tooltip ("each set's weight times reps, added up for the session"). Plain
English beats 'Tonnage' for the general population.

## Refuted accusations (recorded so they are not re-litigated)

- VolumeHeatmapScreen tooltip — accurate; the finder truncated the quote
  before the sentence that discloses editability.
- BlockReflectionScreen hardcoded "kg" — gym units are kg-only by founder
  order (Arc 9, f7b31b1); no reachable mismatch. Stale comments in
  units.js:4 and CoachOutputScreen.js:2159 describe the pre-Arc-9 world —
  noted for cleanup, not a defect.
- WeeklyCheckIn "7-day smoothed trend" hint — literally accurate for the
  value shown; the multi-window EWMA landscape is deliberate and documented.

---

## B. COMPREHENSION / PROGRESS / JARGON / DESIGN — rulings

**O1 [high] One yellow, two opposite meanings.** theme.js:801 maps both
'minimum' (under-trained, "add more") and 'near_mrv' (near ceiling, "ease
off") to the same warning yellow; the legend only explains the second.
RULING: FIX(W2) — 'minimum' gets a distinct token colour and its own legend
line; a colour may never carry opposite instructions.

**O2 [high] Volyume Score has no reachable explanation after the one-time
moment.** ProgressPhotosScreen score grid, AthleteProfileScreen tile, trend
markers — no InfoTooltip anywhere, explainer shows once ever. RULING:
FIX(W2) — persistent "How this works" InfoTooltip on all three surfaces;
copy stays calm and non-diagnostic (body-image-adjacent).

**O3 [medium]** Bare "8,432 kg" on the last-session card → FIX(W1): label
"kg lifted". **O4 [medium]** Upper/Lower/Full history filter is a name
substring match ("Push"/"Pull"/"Legs" users get empty results) → FIX(W3):
classify from the session's actual logged muscle groups. **O5 [medium]**
"Chest ×3" chip means 3 EXERCISES here, 3 SETS on the look-alike Plan
Balance card → FIX(W2): label as exercises explicitly. **O6/O21 [medium]**
"Your trend" weight card has no EWMA tooltip while the same value one
screen away does → FIX(W2): same GLOSSARY.ewma InfoTooltip. **O7** = T7.
**O8** = T23. **O9** = T21. **O10** = T14. **O11 [medium]** "Your first
shared week is under way" also shows after the first week is already banked
(run===1) → FIX(W1): branch the copy. **O12 [medium]** Onboarding Step 3
claims it sets "Protein target"; that lives on Step 5 → FIX(W1): move the
outcome chip. **O13 [medium]** Protein glossary says "per kilo of
bodyweight"; engine uses lean mass when a measured body-fat source exists →
FIX(W1): basis-aware wording. **O14 [medium]** "Estimated daily burn"
hardcodes kcal/day beside an intake line that honours the kJ preference →
FIX(W2): route through toEnergy/energyUnitLabel. **O15 [medium]** "Effort
4/5" with no scale → FIX(W2): GLOSSARY.effort InfoTooltip.
**O16 [medium]** WorkoutSummary "This week's volume" is a rolling window →
FIX(W3) with T7 (calendar week). **O17 [medium]** Superset chip unexplained
on RoutineDetail → FIX(W2): GLOSSARY.superset InfoTooltip. **O18 [medium]**
"OFF"/"USDA" source tags (OFF reads as food-gone-off) → FIX(W2): readable
label for Open Food Facts + SourceChip tooltips for every source, not just
CoFID. **O19 [medium]** "% NRV" never spelled out anywhere a user can read →
FIX(W2): InfoTooltip on the Vitamins and minerals header. **O20** = T24.
**O22 [medium]** BlockReflection: "working sets", "total volume", "Est.
1RM" with zero tooltips on the one screen meant to summarise a block in
plain language → FIX(W2). **O23 [medium]** Fatigue chart: scale only exists
in the screen-reader label → FIX(W2) with T20: visible caption naming the
metric and scale; retitle to name fatigue. **O24 [medium]** Streak
criterion unlearnable after the one-time tip → FIX(W2): persistent
InfoTooltip on ConsistencyEcho + WeeklyStreakStrip. **O25 [medium]**
Recovery decimals "Soreness 3.2" with no scale/direction → FIX(W2): tooltip
matching T21 wording. **O26** = T22. **O27 [low]** Working-set tooltip
implies effort is checked; counting is by set type → FIX(W1). **O28 [low]**
Label "Quality", tooltip opens "Effort rating" → FIX(W1). **O29 [low]**
"+15%" is since-first-ever-session → FIX(W2): caption. **O30 [low]**
"1.8 g/kg today" → FIX(W1): "g/kg bodyweight". **O31 [low]** "+Ng planned"
unexplained → FIX(W2): visible caption. **O32 [low]** "Estimated range"
meaning unstated → FIX(W1): one sentence in the existing tooltip.
**O34 [low]** WeeklyCheckIn hand-rolls the back header 7 times against the
styling rule → FIX(W3): use BackHeader. **O35 [low]** P/C/F single letters
on detail sheets → FIX(W2): full words on detail surfaces; compact rows
stay (detail one tap away). **O36 [low]** "Visible Volyume Score" on the
share receipt, unexplained → FIX(W2): one-line explainer. **O37 [low]** "PR"
chip → FIX(W2): "Best", matching the app's own "New bests" language.

**O33 [low] NO CHANGE (recorded exception).** NotificationSettingsScreen's
Card-based layout diverges from SettingsPrimitives. It carries genuinely
richer controls (time pickers, quiet-hours window) and rebuilding an
~800-line functional screen for chrome parity pre-release is risk without
user benefit. Recorded here as a deliberate exception; revisit post-release.

---

## C. Wave plan

- **W1 (this landing, copy-level truth):** T2 T5 T6 T8 T9 T10 T12 T14 T18
  T19 T21 O3 O11 O12 O13 O27 O28 O30 O32.
- **W2 (small code):** T4 T20+O23 T22 T23+O8 T24+O20 O1 O2 O5 O6/O21 O14
  O15 O17 O18 O19 O22 O24 O25 O29 O31 O35 O36 O37.
- **W3 (real code):** T1 T3 T7+O16 T11 T13 T15 T16 T17 O4 O34.

Every W2/W3 item lands with lint + full suite + guard tests where a founder
rule is being pinned; briefs for dispatched work cite this document and its
finding IDs as authority.
