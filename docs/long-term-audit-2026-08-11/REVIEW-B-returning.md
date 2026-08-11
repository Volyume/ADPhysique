# REVIEW B — THE RETURNING / LAPSED USER (Campaign 6, Phase 54)

Fresh-eyes adversarial review of the return lane. The job was to BREAK the
campaign's claims, not to confirm them.

**Authority.** The founder's Campaign 6 order, Phase 54 (adversarial review
of the returning/lapsed experience), relayed to this lane with the eight
commissioned questions verbatim. Governing law throughout: the three
campaign laws (memory helps, never traps; no personalisation without
provenance; **lapse is not failure**), the founder addendum's
anti-anthropomorphism / anti-manipulative-retention clauses, and every
CLAUDE.md Section 2 inviolable. ED-safety behaviour is **characterised
only** here; no floor, gate or threshold is proposed for change, and every
ED-adjacent direction below is marked founder-gated by standing law.

**Sources read in full before any claim was made.**
`docs/long-term-audit-2026-08-11/AUDIT-RETURN-AND-HISTORY.md` (1,198 lines,
findings R-1..R-29), `LAPSE-MATRIX.md`, `D97-RULINGS.md` (D97-22 and its
"dispositions completed" block, D97-23), `src/__tests__/campaign6.lapse90.test.js`,
plus the pinned suites `src/lib/__tests__/weeklyCoach.evidencedClaims.test.js`,
`src/__tests__/campaign6.longTerm.test.js`, `src/lib/__tests__/blockAdvisor.test.js`,
`src/lib/__tests__/readinessSummary.test.js`, `src/lib/__tests__/streakState.test.js`.

**Adversarial method.** Nothing below is accepted from a ruling, a commit
message or a comment. Every claim was re-derived by running the REAL
modules from a scratch directory outside the repo
(`npx jest --roots <scratchpad>`, `node_modules` symlinked so babel helpers
resolve), reading `weeklyCoach.js`, `nutritionEngine.js`, `weightTrend.js`,
`mesocycle.js`, `blockAdvisor.js` (with `./database` jest-mocked at its two
read points so the REAL advisor logic executes), `readinessSummary.js`,
`homeCoachBrief.js`, `streakState.js` and `edPatternDetector.js` unmodified.
Nine probe suites; their console output is quoted verbatim in the detail
sections and is reproducible. The method deliberately went beyond the
audit's own scenarios in one respect that turned out to matter: the audit
probed the moment of return with a frozen dataset, so this review also
probed the **second act** — the user coming back and actually logging
weigh-ins again — which is where two of the landed fixes stop holding.

**Read-only.** This file is the ONLY file created or modified. No file
under `src/`, no other doc, no test was written, changed, skipped or
re-anchored. Nothing was committed, pushed or stashed. No migration and no
Supabase or cloud command was issued. The repo suite was run unmodified,
read-only.

**Tree state observed — the lead should see this before the next landing.**
The suite was run unmodified three times over the settled tree.

- `npx jest` (parallel, twice): `Test Suites: 2 failed, 1 skipped, 827
  passed, 829 of 830` / `Tests: 2 failed, 10 skipped, ~10105-10112 passed`.
  The two are `src/lib/widgets/__tests__/storage.test.js` and
  `src/lib/__tests__/blockLifecycle.stage1.test.js`.
- `npx jest --runInBand` — the form `release:quality` runs, i.e. the CI
  arbiter: `Test Suites: 1 failed, 1 skipped, 828 passed, 829 of 830` /
  `Tests: 1 failed, 10 skipped, 10113 passed, 10124 total`. The one is
  `src/lib/widgets/__tests__/storage.test.js`.
- Both suites **pass in isolation** (4/4 and 14/14) and in small
  combinations.

So this is cross-suite state leakage under a full run (the widget one is a
`Platform.OS` mutation from a sibling suite), not a return-lane defect, and
neither failure touches any behaviour a finding below rests on — every
probe here drives the modules directly. It is recorded rather than filed as
a finding because it is outside this brief, but it is not cosmetic: the
storage failure reproduces under `--runInBand`, which means `release:check`
is red on the current tree, and `blockLifecycle.stage1` is a Section-2
lifecycle guard whose signal cannot be trusted while it fails only in
company.

**Deliberately NOT re-litigated** (cited where adjacent, never re-reported
as new): D97-3 and its addendum, D97-9, R-3, **R-16 (FOUNDER-BLOCKED —
prompt stand-down)**, R-18, D91-24, D91-25, R-9. Where a finding below sits
beside one of these it says so and states exactly what is different.

---

## 1. WINDOW × SURFACE MATRIX

Scenario held constant across every cell: an established Pro user on a
6-week block with an active plan, daily morning weigh-ins and weekly
check-ins, who stops entirely and returns after the stated gap.

Verdicts: **OK** = truthful and useful · **CAUTION** = truthful but
incomplete, contradictory or unhelpful · **BROKEN** = states something the
app cannot support, or prescribes from absence.

| Surface | 3 days | 2 weeks | 1 month | 3 months | 6 months |
|---|---|---|---|---|---|
| **HOME** | OK | CAUTION (RB6-4, RB6-3) | **BROKEN** (RB6-4) | **BROKEN** (RB6-4) | **BROKEN** (RB6-4) |
| **TRAIN** | OK | CAUTION (RB6-3) | OK | CAUTION (RB6-8) | CAUTION (RB6-8) |
| **NUTRITION** | OK | OK | OK | OK | OK |
| **PROGRESS** | OK | **BROKEN** (RB6-1) | **BROKEN** (RB6-1) | OK | OK |
| **COACH** | OK | OK cold / **BROKEN** on first weigh-in back (RB6-2) | OK cold / **BROKEN** (RB6-2) | OK cold / **BROKEN** (RB6-2) | OK cold / **BROKEN** (RB6-2) |
| **NOTIFICATIONS** | OK | CAUTION (R-16 blocked; RB6-7) | CAUTION | CAUTION | CAUTION |

Cell notes, so the matrix is auditable rather than decorative:

- **HOME / 2 weeks.** The readiness caution is inside its new 14-day bound
  (honest), but `buildCoachBrief` Rule 2 still outranks Rule 3, so the
  brief reads "Fatigue is building. Consider reducing weight by 10% today"
  instead of the "Good to see you back" line written for this exact moment
  (RB6-4). If the block calendar has reached its recovery week, Home also
  says "Recovery week, pull effort back." with no evidence gate at all
  (RB6-3).
- **HOME / 1 month+.** `readinessSummary` priority 4 fires: "Fatigue has
  been building over your last couple of sessions" — from sessions one to
  six months old. Verified at all three windows.
- **TRAIN / 2 weeks.** The advisor card is FIXED and honest. Two other
  training surfaces are not (RB6-3).
- **TRAIN / 3-6 months.** State is honest (`completed_awaiting_decision`,
  the R-5 body, `blockAdvisor.js:470-473`). The headline still reads "Recovery week passed 20 weeks
  ago" / "…25 weeks ago" with no month rollover (RB6-8). The flat 10%
  per-exercise layoff cut applies identically at 8 days and 8 months — a
  known, recorded bound (LAPSE-MATRIX §Phase 6.3, D97-3 founder question),
  not re-reported here.
- **NUTRITION.** Genuinely clean at every window. Targets persist without
  claiming recency; `getRecentIntakeSummary` is a real 7-day local-calendar
  window (`src/lib/food/db.js:618-640`); `ProGoalSetupScreen` reads
  `getMorningWeightsLast14Days` (a date window, not a row limit); the
  diet-break claim is bounded by P-2's `phaseClaimGap`.
- **PROGRESS / 2 weeks and 1 month.** The "Your trend" card renders a full
  present-tense verdict from a series that ended 14 or 30 days ago (RB6-1).
- **PROGRESS / 3-6 months.** The card correctly drops to state 0 and does
  not render. The streak strip is honest at every window.
- **COACH.** "OK cold" means the first open after the gap, before the user
  logs anything: the R-1 data hold fires and the copy is honest at every
  window. "BROKEN on first weigh-in back" is RB6-2.
- **NOTIFICATIONS.** The win-back itself is clean (R-17 verified holding).
  The CAUTION is the already-blocked R-16 plus its scope (RB6-7).

---

## 2. THE EIGHT COMMISSIONED QUESTIONS

### 1. Can I tell where to resume? — **HOLDS WITH CAVEAT**

The structural answer is good and survives every window. The plan rotation
resumes exactly where it stopped; the block state is one explicit,
non-wrapping state (`getBlockStatus`, `mesocycle.js:456-497`, probed at all
five windows, §3 RB6-8 table); Home shows at most one attention banner
(D14, `HomeScreen.js:1541-1560`) and the stale coach banner self-expires
(`Date.now() - weekStart < 7 * 86400000`, `HomeScreen.js:1570`).

The caveat is that the one line written to answer this question is
pre-empted at every window from 3 days upward. `buildCoachBrief`'s Rule 3
("Good to see you back. It's been a while since your last session. Ease
in.") sits **below** Rule 2 (fatigue), and Rule 2 has no age bound, so a
user whose last two sessions before the gap were hard never sees it. Probe
output, all five windows, identical:

```
[HOME 6 months] brief: {"headline":"Fatigue building",
  "body":"Fatigue is building. Consider reducing weight by 10% today and
  focusing on quality reps.","type":"caution"}
```

See RB6-4. The audit's own R-6 direction sketch named this reorder; the
D97-22 disposition recorded only the readinessSummary half.

### 2. Does the app shame me? — **HOLDS**

Nothing found, at any window, on any surface. Actively probed rather than
assumed: a repo-wide scan for the shame register
(`you missed | falling behind | fell off | back on track | don't lose |
slipped | lost your | catch up`) over `src/screens`, `src/components` and
`src/lib` returns no hit on any return-path surface. The streak strip
speaks a quiet week as "Quiet week", never "missed"
(`StreakWeeksSection.js:146`), never wears red, and shows
"0 of 4 sessions this week" as a plain fact (`StreakWeeksSection.js:78-80`). The pause sheet
line is "Life happens. Pause your run and nothing is lost." The post-lapse
sheet is transactional ("Everything you logged is saved…",
`PostLapseSheet.js:29`). The R-5 fix removed the two genuinely bad
sentences ("The sooner you start the next block the better. Your body's
ready.") and the replacement is neutral: verified live at
`blockAdvisor.js:470-473`.

One thing worth naming as a non-finding: at 1-6 months Home says "Fatigue
is building" and "Fatigue has been building over your last couple of
sessions". That is false (RB6-4) but it is not shaming — it reads as
concern, not blame. Q2 stands on its own.

### 3. Is anything pretending I trained while absent? — **HOLDS**

This is the strongest area and it survived deliberate attack.

- **The streak cannot manufacture a kept week.** The repair rule bridges
  only a *lone* sub-target week between keepers, capped at one per rolling
  six weeks (`streak.js:45-61`), so a multi-week gap can never be repaired.
- **A recovery week the user slept through does not count as compliance.**
  `getDeloadWeeksInRange` (`database.js:6276-6292`) requires a **completed
  workout** joined to a deload week row, so an unattended calendar recovery
  week is not fed to the streak as `resting`. This is exactly the hole the
  design would have had if the query had read the block calendar; it does
  not.
- **Absence is not counted as a rest week** (R-12, verified: the untrained
  week now terminates the scan as an accumulation boundary,
  `useProgressData.js:319-343`).
- **No block advances on its own.** The single `INSERT INTO mesocycles` is
  the user's explicit tap; verified structurally and re-verified here.
- Coached auto-apply cannot execute a stale decision (D97-10 verified live
  at `CoachOutputScreen.js:2196-2200`).

### 4. Does the block lifecycle stay truthful? — **HOLDS WITH CAVEAT**

The *state machine* is truthful at every window. `getBlockStatus` is a
monotone calendar derivation that never wraps, `completed_awaiting_decision`
persists however long it is ignored, and `weeksOverdue` counts honestly.
Probed across three departure points × five return windows (§3, RB6-8):
15 cells, no fabricated week.

Two caveats.

(a) **R-4's earned-recovery gate is card-local.** Inside the calendar
recovery week with no recent training, the Train tab now correctly says
"there's nothing to recover from yet" — while Home's readiness chip says
"Recovery week, pull effort back." and ActiveWorkoutScreen prescribes the
deload targets under "Recovery week: very easy effort, full recovery
focus." Three surfaces, two of them still claiming the unearned recovery
week the ruling removed from the third (RB6-3).

(b) **The overdue headline is unbounded and unrolled.** "Recovery week
passed 25 weeks ago" at six months, with the documented one-week
understatement still in place (RB6-8).

### 5. Does stale history cause weird prescriptions? — **BROKEN**

This is where the campaign's central return-lane claim fails, and it fails
in the place that matters most.

R-1's fix is real and it holds for the case it was written for: a returning
user who opens the Coach tab **before logging anything** gets the data hold
and honest copy, at every window (probe 1, all five gaps: `delta: null`,
`deltaLabel: "Log morning weight"`, no calorie adjustment).

It stops holding the moment the user does the obvious thing and steps on
the scales. `getEwmaSevenDaysAgo` takes "the most recent entry at or before
seven days ago" (`weeklyCoach.js:98-102`) with **no bound on how far
before**, so with three fresh readings the comparator is still the last
pre-lapse point. A months-long body change is then spoken as a weekly rate,
and that rate reaches the ED-safety layer. Probe 6, real modules:

```
[BACK 6 months away, lost 8kg]
 "ewmaNow": 81.83, "ewma7dAgo": 84,
 "weeklyTrendPct": -2.8552631578947394,
 "edRapidLossSignal": { "signals": { "s1": true, ... } },
 "trend": { "delta": -2.17, "deltaLabel": "-2.17kg this week",
            "rateLabel": "losing 2.17kg/wk" }
```

and with a low-energy first check-in back (probe 7) the coach raises its
own safety flag from that number:

```
[RAPID-LOSS OVERRIDE] "rapidWeightLossFlag": true
```

which renders `RapidLossAlert` — a warning-icon card reading "Your weight
is falling more than 1.5% of your body weight per week and your energy is
low" (`CoachOutputCards.js:112-129`, gated at `CoachOutputScreen.js:2918`).
It is not. See RB6-2. ED-adjacent; characterised only.

A second, smaller weirdness surfaced in the same probe: the DECISION reads
the robust damped trend while the DISPLAY reads the plain one, so the card
can say "gaining 2.17kg/wk" on a cut and, one line later, "Weight is
tracking the target rate. No change needed this week." That is Phase 25's
"decision trend vs displayed trend truth" question answered wrongly on a
single card.

What genuinely protects the user, verified rather than assumed: the
adjacency gates hold (D97-5). `consecutivePoorRecoveryWeeks`,
`consecutiveExceededWeeks` and `consecutiveOffTargetWeeks` are all
calendar-adjacency gated (`CoachOutputScreen.js:1629-1712`, `:1685-1688`),
so no counter chains across a gap. P-2 holds: `evidencedWeeksInPhase` is
sourced from real saved runs (`CoachOutputScreen.js:1611-1615`) and bounds
the week label and the diet-break wording (`weeklyCoach.js:683-687`,
`:1340-1352`). D97-8's check-in freshness gate is live
(`blockAdvisor.js:402-405`). The session-layer `stimulusReady` branch is
age-gated (`algorithms.js:1189-1197`).

### 6. Do streak/reminder surfaces behave sensibly? — **HOLDS WITH CAVEAT**

**Streak: holds, and R-10 holds under attack.** The pause fix was probed at
four spans including the two the audit could not reach. Note the key format
the fix depends on — `String(localWeekStartMs)`, epoch-ms strings, not ISO
dates (`streakState.js:13-16`); the first attempt at this fix parsed them
with `Date.parse` and was corrected at `f79520df`. Probe 5, 12-week window:

```
[PAUSE 8 weeks starting 3 weeks ago (in window)]      covered = 4  (idx 8-11)
[PAUSE 8 weeks starting 13 weeks ago (start OUT)]     covered = 6  (idx 0-5)
[PAUSE 4 weeks starting 26 weeks ago (span expired)]  covered = 0
[PAUSE 30 weeks starting 26 weeks ago]                covered = 12 (all)
```

Row 2 is the audit's exact worked example, and it now behaves. Row 3 is the
correct refusal (an expired span covers nothing). Suppression still fails
closed on an ED flag, SCOFF ≥ 2, calm mode, or a failed read of either
(`useWeeklyStreak.js:102-110`, `:137-140`). R-11's guard landed:
`/^@volyume_streak_v1_/` is in `GUARDED_PREF_PATTERNS` (`sync.js:1409-1414`).

**Reminders: the caveat.** R-16 is FOUNDER-BLOCKED and is cited, not
re-reported. What is new is that the blocked question's **scope** is
narrower than the problem: two further prompt families repeat indefinitely
through an absence and are re-laid on every launch by
`restoreNotifications` — meal reminders (DAILY, Pro, food-adjacent) and
training reminders (WEEKLY per learned day, copy "One of your usual
training days"). See RB6-7. That is scope evidence for the pending ruling,
not a new policy proposal.

**Win-back: R-17 holds.** The overclaim is gone — `winbackContent.js:62-64`
now reads "Your training history is all saved, and everything is ready
whenever you are", and calm mode joins the lay gate at
`scheduler.js:723-734`, ORed with the fail-closed ED read. Verified live.

### 7. Are old proposals resurrected? — **HOLDS WITH CAVEAT**

Nothing resurrects itself. Coached auto-apply refuses an output older than
one week (D97-10, `CoachOutputScreen.js:2196-2200`). Persisted training
insights are regenerated before they are read — `runInsightsEngine` prunes
every non-dismissed insight no longer generated and only then calls
`getActiveInsights` (`database.js:4795-4817`, `:4889-4911`), and its set
window is a real 28 days. The activation nudge is hard-stopped at account
creation + 17 days (`activationNudge.js:43-49`), so a returning
established user can never meet it. The block decision card writes nothing
without an explicit tap behind a typed confirm.

Caveat: a months-old reviewed-but-unapplied coach decision keeps its manual
Apply buttons. Applying it is the user's own tap, which is defensible, and
the screen carries a dated week range including the year
(`coachOutput/viewCopy.js:19-24`) — but no statement that the decision is
old. That gap was recorded inside the CLEAN entry R-29 as "the same gap R-1
and R-2 describe"; R-1 and R-2 were then ruled and worked, and this one was
not carried anywhere. Recorded as RB6-9 (LOW).

### 8. Can I simply start training again? — **HOLDS**

Yes, at every window, and nothing blocks. The active plan and its rotation
survive; `getCurrentMesocycleWeek` clamps to the final row and reports
`awaitingDecision` rather than fabricating a live week
(`database.js:4153-4191`); the workout start path never gates on block
state; ActiveWorkoutScreen states the honest reason when the block is
finished ("Block finished: targets hold at recovery-week volume until you
choose your next block", `ActiveWorkoutScreen.js:1461-1463`); nothing prunes workouts, ledgers or
weights by age. Loads get the one-time 10% per-exercise layoff cut
(`ActiveWorkoutScreen.js:1339-1342`).

The one thing that is not simple is the middle case in RB6-3: inside the
calendar recovery week after an 8-13 day gap, the first session back is
prescribed at half reps for a recovery the user never earned. That is a
truthfulness and usefulness defect, not a blocker, and it is scored there.

---

## 3. FINDINGS

Only genuinely NEW material. Nothing already ruled, already founder-gated,
or already recorded on the audit file is repeated here.

| ID | Class | Sev | Question | One line | Primary evidence |
|---|---|---|---|---|---|
| RB6-1 | RESIDUAL-DEFECT | **MED-HIGH** | 5 | R-2's fix is a 90-day WINDOW, not a recency gate: at the 2-week and 1-month returns the Progress card still renders a full present-tense verdict from pre-gap rows, and still contradicts the (R-1-fixed) coach on the same rows | probe 2; `useWeightTrend.js:52-56`; `weightTrend.js:19-25`; `nutritionEngine.js:211-243`, `:256-262` |
| RB6-2 | RESIDUAL-DEFECT | **HIGH** | 5 | R-1's clock anchor only covers a week with NO readings. On the first weigh-in back the comparator still reaches a point of any age, so a months-long change is spoken as "this week" and reaches `rapidWeightLossFlag`, the user-visible RapidLossAlert and the ED detector's s1 signal | probes 6 + 7; `weeklyCoach.js:91-102`, `:805-818`, `:1295-1300`, `:1430`; `CoachOutputCards.js:112-129` |
| RB6-3 | RESIDUAL-DEFECT | MED | 4, 8 | R-4's earned-recovery gate is card-local and its boundary is twice the block week: Home and the live workout still claim/prescribe the unearned recovery week, and an 8-13 day gap still reads "Recovery week is active … letting the last few weeks of work pay off" | probe 9; `readinessSummary.js:63-64`; `ActiveWorkoutScreen.js:1438-1463`; `blockAdvisor.js:410-452` |
| RB6-4 | DEFECT | MED-HIGH | 1, 5 | R-6 fixed one of the two composers and one of its two priorities: `readinessSummary` priority 4 and `buildCoachBrief` Rule 2 are both age-unbounded, and Rule 2 outranks the welcome-back rule the return was written for | probe 4; `homeCoachBrief.js:20-40`; `readinessSummary.js:102-108`; feeder `HomeScreen.js:968`, `database.js:8493-8508` |
| RB6-5 | TEST-INTEGRITY | MED | 5 | The permanent 90-day lapse E2E does not exercise the coach return path: it feeds `createdAt` (a field the engine ignores) so gap and no-gap outputs are identical, and its confidence assertion reads a field that does not exist, making it unfalsifiable | probe 8; `campaign6.lapse90.test.js:98-107`; `weeklyCoach.js:700-720`, `:800` |
| RB6-6 | RESIDUAL-DEFECT | MED | 6 | R-7 made the churn keys per-user but left them in the allow-by-prefix pref sync and OUT of `GUARDED_PREF_PATTERNS`, so the "single-shot" win-back state is still a cloud-wins blob; and the legacy migration attaches a device-global episode to whichever user reads first | `winbackState.js:33-70`; `sync.js:1315-1374`, `:1399-1423`; `PostLapseSheet.js:125-140` |
| RB6-7 | SCOPE (attached to founder-blocked R-16) | MED-LOW | 6 | The inactivity stand-down question is wider than the two weigh-in prompts: meal reminders (DAILY) and training reminders (WEEKLY) also repeat indefinitely through an absence and are re-laid every launch | `scheduler.js:344-353`, `:1362-1390`; `trainingReminders.js:200-231` |
| RB6-8 | RESIDUAL-COPY | LOW | 4 | R-5's fix rewrote the body only; the headline still reads "Recovery week passed 25 weeks ago" at six months, with no month rollover and the documented one-week understatement intact | probe 3; `blockAdvisor.js:459-462`; `mesocycle.js:493` |
| RB6-9 | LATENT | LOW | 7 | A months-old reviewed-but-unapplied coach decision keeps its manual Apply buttons and is dated but never stated to be old; recorded inside CLEAN entry R-29 and carried nowhere | `CoachOutputScreen.js:2196-2200`; `coachOutput/viewCopy.js:19-24` |

**Counts by class:** 4 RESIDUAL-DEFECT, 1 DEFECT, 1 TEST-INTEGRITY,
1 SCOPE, 1 RESIDUAL-COPY, 1 LATENT — 9 total.
**Counts by severity:** 1 HIGH (RB6-2), 2 MED-HIGH (RB6-1, RB6-4),
3 MED (RB6-3, RB6-5, RB6-6), 1 MED-LOW (RB6-7), 2 LOW (RB6-8, RB6-9).

**Verified HOLDING under attack** (each actively probed, not accepted):
R-10, R-12, R-17, R-11, D97-5 (all three counters), D97-8, D97-10, P-2, and
the R-5 body rewrite. Recorded so the next lane does not re-derive them.

---

## 4. FINDINGS IN DETAIL

### RB6-1 (RESIDUAL-DEFECT, MED-HIGH) — R-2 closed the six-month case and left the two-week and one-month cases open

**The claim under test.** D97-22: *"R-2 (MED-HIGH), fix ruled: the Progress
trend card must be date-windowed like the coach now is (decision vs
displayed truth must agree)."* Landed at `1574ad8c`.

**What actually landed.** A single 90-day filter on the feeder:

```
useWeightTrend.js:52-56
  const windowStart = Date.now() - 90 * 86400000;
  const windowed = (weights || []).filter(
    (w) => Number.isFinite(Number(w?.loggedAt)) && Number(w.loggedAt) >= windowStart,
  );
```

The state ladder it feeds is still a **row count**
(`trendStateFor(entryCount)`, `weightTrend.js:19-25`), and
`computeWeeklyWeightChange` still measures relative to the **last point in
the series**, not the clock (`nutritionEngine.js:211-243`). So the fix
removes rows older than 90 days and changes nothing about rows inside it.

**Counterexample (probe 2, real modules, 90 daily weigh-ins ending at the
stated gap).**

```
[TREND 2 weeks]  rowsInWindow 77, state 4, newestRowAgeDays 14
  vm: { showRate: true, weeklyChange: -0.42, dot: "onTrack",
        insight: "Trending inside your target range. Calories hold.",
        maintenance: { kcal: 2631, label: "From 11 weeks of data" } }

[TREND 1 month]  rowsInWindow 61, state 4, newestRowAgeDays 30
  vm: { showRate: true, weeklyChange: -0.42, dot: "onTrack",
        insight: "Trending inside your target range. Calories hold.",
        maintenance: { kcal: 2631, label: "From 8 weeks of data" } }

[TREND 3 months] rowsInWindow 0, state 0, vm: { render: false }   <- fixed
[TREND 6 months] rowsInWindow 0, state 0, vm: { render: false }   <- fixed
```

**The divergence the ruling was meant to remove is still there.** At the
same two windows, the same user's Coach tab — clock-anchored since R-1 —
returns (probe 1):

```
[COACH 2 weeks] hasEnoughData: false, delta: null,
                deltaLabel: "Log morning weight", rateLabel: null
[COACH 1 month] hasEnoughData: false, delta: null,
                deltaLabel: "Log morning weight", rateLabel: null
```

One dataset, one user, one app open: Progress says "-0.42 kg/week, trending
inside your target range, calories hold, from 8 weeks of data" with a green
on-track dot, and Coach says it has no data to read. That is precisely the
"decision vs displayed truth must agree" condition the ruling stated, and
it is not met.

**Why the pin did not catch it.** `campaign6.longTerm.test.js:290-297` pins
the *source text* of the filter (three regexes against
`useWeightTrend.js`), not the behaviour the ruling described. A source pin
cannot fail on a case the source does not cover.

**Relationship.** Not D91-25: nothing here needs a decay curve. Not R-18
(that is the FFM-floor input). It is the same class as R-1 and the same fix
shape.

**Direction sketch (not applied).** The card already owns a complete
"no rate, no maintenance, no dot" rendering path for the ED-flag case
(`weightTrend.js:94-116`). Gate `showRate` / `dot` / `maintenance` on the
**age of the newest point** rather than on the window's contents, using the
same seven-day boundary the coach now uses, and let the ladder read the
in-window count as it does. The ED-flag branch must stay senior. Strictly
more conservative in every direction: the card can only go quieter.
Ruling needed; not a lead call to make inside a review.

---

### RB6-2 (RESIDUAL-DEFECT, HIGH) — the second act of the return: R-1 stops holding the moment the user steps on the scales

**The claim under test.** D97-22: *"R-1 (HIGH) FIXED at 1e90ae09: the
weigh-in week window is clock-anchored (nowMs) instead of
newest-row-anchored, and a week with no readings has a null delta."*

**What holds.** Both halves are real. `weighInDayCount` windows on `nowMs`
(`weeklyCoach.js:700-720`, the anchor at `:713`) and `weekHasReadings` nulls
the delta when the newest reading precedes the seven-day cutoff (`:805-818`). Probe 1 confirms
the honest data hold at 2 weeks, 1 month, 3 months and 6 months.

**What does not hold.** `weekHasReadings` asks only whether the *newest*
point is inside the window. It says nothing about the **comparator**:

```
weeklyCoach.js:91-101   getEwmaSevenDaysAgo
  const cutoff = nowMs - 7 * 86400000;
  const older = [...series].reverse().find(e => e.loggedAt <= cutoff);
  return older?.ewmaKg ?? null;
```

"The most recent entry at or before seven days ago" is unbounded below. A
returning user with 60 pre-lapse rows who logs three fresh mornings has
`ewma7Today` from the fresh points and `ewma7LastWk` from the last pre-lapse
point. The subtraction is a six-month change; the label says "this week".

**Counterexample (probe 6, real modules; 60 pre-lapse daily rows at 84 kg,
then three daily rows at the returning weight).**

| gap / real change | `weeklyTrendPct` | displayed | ED s1 rapid-loss |
|---|---|---|---|
| 3 days, unchanged | 0 | "+0kg this week", "stable" | false |
| 2 weeks, -1 kg | -0.33 %/wk | "-0.27kg this week" | false |
| 1 month, -3 kg | -1.00 %/wk | "-0.81kg this week", "losing 0.81kg/wk" | false |
| 3 months, -6 kg | **-2.09 %/wk** | "-1.63kg this week", "losing 1.63kg/wk" | **true** |
| 6 months, -8 kg | **-2.86 %/wk** | "-2.17kg this week", "losing 2.17kg/wk" | **true** |
| 6 months, +8 kg | +2.36 %/wk | "+2.17kg this week", "gaining 2.17kg/wk" | false |

**Where it lands.** Three consumers, all downstream of the data hold, so
none of them is protected by R-1's gate:

1. **User-visible safety alert.** With `energyScore <= 2` on a cut —
   entirely plausible on a first check-in back — `rapidWeightLossFlag`
   fires (`weeklyCoach.js:1295-1300`). Probe 7:
   `[RAPID-LOSS OVERRIDE] "rapidWeightLossFlag": true`. That renders
   `RapidLossAlert` (`CoachOutputScreen.js:2918`), whose body states as
   fact: *"Your weight is falling more than 1.5% of your body weight per
   week and your energy is low."* The user's weight is not falling at that
   rate; it fell over six months.
2. **The ED-pattern detector.** `computeWeeklyTrendPct` feeds
   `detectEdPatternFlag` (`weeklyCoach.js:1430`) and its `s1` rapid-loss
   signal fires at both the 3-month and 6-month windows. One signal alone
   does not raise a flag (threshold 2), but it is one of two, and the user
   returning after a long absence is exactly the user most likely to have a
   second signal available.
3. **The narration, at every window ≥ 2 weeks**, in the vocabulary of the
   surface that decides about food.

**A second defect in the same probe.** The decision reads the robust damped
trend and the display reads the plain one (`weeklyCoach.js:836-843`), so
the 6-month gain case renders "gaining 2.17kg/wk" beside
`whyThisWeek: "Weight is tracking the target rate. No change needed this
week."` — a self-contradicting card. That is Phase 25's "decision trend vs
displayed trend truth" question, answered wrongly, within one screen.

**Why the pin did not catch it.** `weeklyCoach.evidencedClaims.test.js:136-176`
pins exactly two cases: a wholly-stale 21-row series (holds) and the same
series ending today (coaches). The realistic return — stale series **plus**
fresh readings — is not tested anywhere.

**Direction sketch (not applied) — ED-SAFETY-ADJACENT, FOUNDER-GATED.**
This is characterised, not proposed. The honest shape is that a *weekly*
rate needs two points roughly a week apart, so `getEwmaSevenDaysAgo` would
bound how far before the cutoff its comparator may sit. **That is not a
free change and must not be taken as a recommendation:** nulling the trend
in this case would also remove the rapid-loss signal in a genuine
fast-loss-across-a-gap scenario, i.e. it loosens an ED-safety input, which
Section 2 reserves to the founder. The founder-facing fork is therefore
three-way and belongs beside R-3/R-18 in the Phase 57 triage: (a) bound the
comparator (honest narration, weaker signal); (b) leave the maths and bound
only the *labels* and the alert's claim, keeping every safety read exactly
as it is (narration honest, safety unchanged — the conservative option);
(c) leave both and record the behaviour as intended. No option is
recommended here.

---

### RB6-3 (RESIDUAL-DEFECT, MED) — the earned-recovery gate is card-local, and its boundary is twice the block's own week

**The claim under test.** D97-22 dispositions: *"R-4 FIXED (ruling (b)+(a)):
a recovery week is only claimed LIVE with a completed workout inside the
14-day boundary; otherwise the calendar fact is stated with no
prescription."*

**Part 1 — the gate exists and works, on one surface.** Probe 9 drives the
REAL `getBlockAdvice` with `./database` mocked at its two reads, block start
= day 38 of a 6-week block (`status: 'recovery'`):

```
[last session 2 days ago]   "Recovery week is active" ... "letting the last few weeks of work pay off"
[last session 8 days ago]   "Recovery week is active" ... "letting the last few weeks of work pay off"
[last session 11 days ago]  "Recovery week is active" ... "letting the last few weeks of work pay off"
[last session 15 days ago]  "Recovery week on the calendar" ... "nothing to recover from yet"
[last session 6 months ago] "Recovery week on the calendar" ... "nothing to recover from yet"
[read failure]              "Recovery week on the calendar"   <- fails closed, correct
```

The audit's own headline row (back after a fortnight) is now handled, and
the read-failure path cannot invent training. But the boundary chosen is
the 14-day detraining constant, and a block week is 7 days. At 8-13 days
the user has missed an **entire accumulation week** and is still told the
recovery week is active and that it is "letting the last few weeks of work
pay off". Rows 2 and 3 above are the residual.

**Part 2 — two other surfaces never got the gate.** In the same state
(calendar recovery week, no recent training):

```
readinessSummary.js:63-65
  if (currentMesoWeek.isDeload) {
    return { tone: 'recover', line: 'Recovery week, pull effort back.' };
  }
```

Priority 1, no evidence input at all — and `isDeload` comes from
`getCurrentMesocycleWeek`, a pure calendar derivation
(`database.js:4153-4191`). And the live session:

```
ActiveWorkoutScreen.js:1438-1463
  if (currentWeek.isDeload && ...) {
    const deloadTargets = generateDeloadPrescription(week1Sets, true);
    ...
    setTargetReason(currentWeek.awaitingDecision
      ? 'Block finished: targets hold at recovery-week volume until you choose your next block.'
      : 'Recovery week: very easy effort, full recovery focus.');
```

So a user back after eleven days meets: Train tab — "nothing to recover
from yet"; Home — "Recovery week, pull effort back."; first session —
half-rep deload targets under "Recovery week: very easy effort, full
recovery focus." The ruling's stated principle ("only claimed LIVE when
earned") is applied on one of the three, and the disagreement between them
is new, created by the fix.

The direction of the prescription is safe (lighter, not heavier), which is
why this is MED and not higher. The cost is truthfulness and a wasted first
session back.

**Direction sketch (not applied).** The gate already exists as a computed
fact inside `getBlockAdvice`; the honest fix is to compute it once where the
block week is resolved (`getCurrentMesocycleWeek` already reads the block
and the clock) and let `isDeload` be accompanied by an `earned` boolean the
three consumers share, so one rule serves all three rather than three rules
drifting. Separately, whether the boundary should be the block's own week
length rather than the 14-day detraining constant is a small product
question, not a lead call, because it changes who is told to deload.
Option (c) from the audit (pausing the block clock) stays where D97-22 put
it: D91-25-adjacent, Phase 57, untouched here.

---

### RB6-4 (DEFECT, MED-HIGH) — R-6 fixed one composer and one of its two priorities; the return line is still pre-empted at every window

**The claim under test.** D97-22 dispositions: *"R-6 FIXED: the Home
readiness caution requires the last session inside 14 days; undated sessions
cannot prove recency."* True — for priority 3.

**What the audit actually asked for.** AUDIT-RETURN-AND-HISTORY.md's R-6
direction sketch, verbatim: *"a session older than the engine's existing
14-day detraining boundary is history … so priorities 3 **and 4** stay
silent"*, and *"**Reorder `buildCoachBrief`** so the long-gap rule outranks
the fatigue rule (or, equivalently, age-gate the fatigue rule)."* Neither
the priority-4 gate nor the reorder landed.

**Counterexample (probe 4, real modules).** Last session and both rated
sessions at the stated gap; block week 3 of 6, no deload suggestion:

```
[HOME 3 days]  readiness: "Last time out you were sore, short on sleep and low on energy. Worth listening to that today."
               brief:     "Fatigue is building. Consider reducing weight by 10% today and focusing on quality reps."
[HOME 2 weeks] readiness: (same — inside the new bound)
               brief:     (same)
[HOME 1 month] readiness: "Fatigue has been building over your last couple of sessions."
               brief:     "Fatigue is building. Consider reducing weight by 10% today and focusing on quality reps."
[HOME 3 months] (identical to 1 month)
[HOME 6 months] (identical to 1 month)
```

**The feeder is a row count, not a window.** `getRecentWorkoutFeedback`
(`database.js:8493-8508`) is `ORDER BY started_at DESC LIMIT 6` — six rows
of any age. The rows carry `started_at`, so the age is available and simply
not consulted:

- `readinessSummary.js:102-108` (priority 4) averages
  `fatigueHistory.slice(0, 2)` with no date test, while priority 3 four
  lines above now has one.
- `homeCoachBrief.js:20-31` (Rule 2) does the same, and sits **above**
  Rule 3, the "Good to see you back. It's been a while since your last
  session. Ease in. Don't try to catch up in one workout." line
  (`:33-40`) that exists for exactly this user.

**Consequences.** (i) The one surface commissioned to answer "where do I
pick back up?" instead asserts a present-tense recovery state from
six-month-old data — the fabricated-recovery-assumption the lapse law
forbids, and the same defect class D97-8 and R-6 were both written to
close. (ii) It gives a concrete instruction ("reduce weight by 10% today")
on no current evidence. (iii) `showCoachBrief` carries no tier gate
(`HomeScreen.js:1503`), so this reaches FREE users, where it is the only
coaching voice they have.

**Direction sketch (not applied).** Exactly the audit's own two steps, both
input-freshness rules on narration with no threshold, formula or gate
changed: age-gate `readinessSummary` priority 4 on the same 14-day boundary
priority 3 now uses (the composer already receives an injectable `nowMs`,
`readinessSummary.js:55`), and age-gate `buildCoachBrief` Rule 2 — which
achieves the reorder without touching the rule list, and is the variant the
audit itself preferred. Strictly conservative: both rules can only go
quieter, and Rule 3 then speaks where it was designed to.

---

### RB6-5 (TEST-INTEGRITY, MED) — the permanent lapse E2E does not test the lapse

**Why this matters.** `src/__tests__/campaign6.lapse90.test.js` is the
Phase 51 deliverable: *"the permanent 90-day lapse E2E. An established Pro
user leaves and returns; every surface's behaviour is asserted against the
real modules at the real gap."* It is the regression guard standing behind
every return-lane fix in this campaign. Its block-lifecycle and
learned-range assertions are sound. Its **coach** assertions are not.

**Defect 1 — the engine never sees the gap.** The rows are timestamped with
`createdAt`:

```
campaign6.lapse90.test.js:98-101
  morningWeights: [
    { weightKg: 80,   createdAt: NOW - GAP_90 - 3 * DAY },
    { weightKg: 80.4, createdAt: NOW - GAP_90 - 1 * DAY },
  ],
```

Every date-aware read in `weeklyCoach` uses `loggedAt`
(`:700-720`, `:91-101`, `:805-814`), which is also the column name the DB
and the cloud pull produce (`database.js:515`, `:7392-7397`). With
`loggedAt` absent these rows are the "untimed" branch and are counted one
each regardless of age.

**Defect 2 — the assertion cannot fail.** `expect(out.trend?.confidence ?? 'low').toBe('low')`
reads `trend.confidence`. The engine's `trend` object carries
`{ ewma7, delta, onTarget, deltaLabel, rateLabel }` on **both** the
data-hold path (`:740`) and the main path (`probe 1`) — there is no
`confidence` key on it. The optional chain yields `undefined`, `?? 'low'`
substitutes `'low'`, and the assertion passes for every possible input.
(Confidence is emitted as `out.confidence`.)

**Proof (probe 8).** The suite's own rows, and the same rows dated **today**
with no gap at all:

```
[PIN] gap rows                -> confidence "data_hold", calChange null
[PIN] same rows dated TODAY   -> confidence "data_hold", calChange null
[PIN] suite assertions applied to the NO-GAP output:
      {"trend?.confidence ?? low === low": true, "calories?.change ?? 0 === 0": true}
```

The test's two coach assertions are satisfied identically by a user who has
never been away. It would have passed before R-1's fix and it will pass
after any future regression of it.

**Related pin gaps found in the same pass** (recorded here, not as separate
findings): the R-1 pin covers only the wholly-stale series
(`weeklyCoach.evidencedClaims.test.js:136-176`, see RB6-2), and the R-2 pin
is three source regexes rather than the behaviour its ruling stated
(`campaign6.longTerm.test.js:290-297`, see RB6-1).

**Direction sketch (not applied).** Rename the field to `loggedAt`, assert
`out.confidence === 'data_hold'` (the field that exists), and add the case
the campaign actually needs: a rich correctly-dated stale series **plus**
fresh readings, asserting whatever the founder rules under RB6-2. The
`untimed` fallback in `weighInDayCount` is unreachable in production
(`logged_at INTEGER NOT NULL`, and the cloud insert coalesces to
`Date.now()`), so it needs no change — but a test that depends on it is
testing nothing.

---

### RB6-6 (RESIDUAL-DEFECT, MED) — the churn episode is per-user now, and still a cloud-wins blob

**The claim under test.** D97-22 lists R-7 as landed; the compliance ledger
records "R-7 landed"; `REINSTALL-MATRIX.md` records
"Win-back/churn episode | YES (per-user since R-7)".

**What holds.** The keys are per-user (`winbackState.js:54-58`, resolved
lazily from `session.user.id`, which is the same id the host selects as
`s.user?.id` — both are set from the same Supabase session,
`RootNavigator.js:1011-1012`, so there is no id mismatch). Two users on one
phone no longer share an episode. R-28's other properties (one per episode,
180-day cross-episode floor, cleared on return to Pro, cancelled under an
open ED flag, routed to Subscription) all re-verified live.

**What does not hold.** The audit's R-7 evidence explicitly named the sync
half: *"it rides the allow-by-prefix pref sync … sync.js:1301, :1366-1371"*.
That half was not addressed. The keys still start with `@volyume_` and
appear in none of the exclusion patterns (`sync.js:1315-1374`), so they are
pushed and pulled; and they are **not** in `GUARDED_PREF_PATTERNS`
(`:1399-1423`), where R-11's streak blob and S-2's notification prefs were
both added in this same campaign. The generic pull is "cloud value wins
unconditionally".

**Consequence, per field.** A stale device's routine push can restore an
older episode blob and thereby reset `winbackLaid` (a second win-back for
one episode), `lapseSheetShown` (the one-time post-lapse sheet shows again
— and `PostLapseSheetHost` gates on the episode only, never on tier,
`PostLapseSheet.js:128-140`), or move `@volyume_winback_last_fired_v1_<uid>`
backwards (a win-back inside the 180-day floor). Every one of those breaks
a property R-28 certifies as clean.

**Secondary.** `_getMigrated` (`winbackState.js:59-70`) copies any legacy
device-global value into **whichever user's key is read first**. The audit
named this as the one decision in the fix and named the conservative answer:
*"a dropped episode costs one win-back, a mis-migrated one shows the wrong
user a churn sheet"*. The implementation chose migration; no ruling records
that choice or its rationale.

**Relationship.** Distinct from S-3/FR-C4-2 (pref deletion and tombstones,
founder architecture question) — this needs no tombstone, only the guarded
pattern that two sibling fixes in this campaign already use. Billing
semantics, entitlement and product IDs are untouched either way; this is
local bookkeeping, though the surface is billing-adjacent enough that any
ruling should say so.

**Direction sketch (not applied).** Add `/^@volyume_winback_/` to
`GUARDED_PREF_PATTERNS` and stamp the four write sites with `notePrefWrite`,
exactly as R-11 and S-2 did. Separately, record the migrate-vs-drop decision
explicitly rather than leaving it implicit in the code.

---

### RB6-7 (SCOPE, MED-LOW) — the blocked R-16 ruling covers two prompts; three families have the problem

**Not a re-report.** R-16 is FOUNDER-BLOCKED under NOTIFICATIONS_LOCKED.md
and is cited, not re-argued. Its recommended ruling is scoped to *"both
prompts"* — the morning and evening weigh-in prompts. This finding is the
scope evidence the ruling needs.

Two further families repeat indefinitely and have no inactivity condition:

- **Meal reminders.** `SchedulableTriggerInputTypes.DAILY`
  (`scheduler.js:344-353`), one per enabled reminder, re-laid on every
  launch by `restoreNotifications` (`:1363-1377`). Pro-gated and
  ED-flag-gated at schedule time (fail closed), but nothing consults
  inactivity. These are **food-adjacent**, which is the exact reason
  R-16's own argument reaches beyond ordinary notification policy.
- **Training reminders.** `WEEKLY` per learned training day,
  `repeats: true` (`trainingReminders.js:200-231`), re-laid on every launch
  (`scheduler.js:1380-1389`). The copy is "One of your usual training days"
  — a claim about a habit that has stopped. The habit schedule is a real
  6-week trailing window and correctly cancels when it is empty, but that
  check only runs when the app is opened, which by definition does not
  happen during the absence.

Scale, on the same 180-day figure R-16 used: roughly 360 weigh-in prompts,
up to ~180 meal prompts, and ~100 training prompts, none of them acted on.

The one-shot families are correctly self-limiting and are **not** part of
this: the weekly check-in reminder is a `DATE` trigger re-laid on use
(`scheduler.js:392-444`), as are the coach-ready push, the missed-check-in
follow-ups, the cascade gates and the win-back.

**No direction is proposed.** The ruling is the founder's; this finding
only widens the question it must answer.

---

### RB6-8 (RESIDUAL-COPY, LOW) — the overdue headline is still unbounded

R-5's landed fix rewrote the **body** and did so well: the physiological
claim and the urgency are gone, verified live at `blockAdvisor.js:470-473` and
pinned. The **headline** on the same card was not touched:

```
blockAdvisor.js:459-462
  headline: overdueWeeks > 0
    ? `Recovery week passed ${overdueWeeks} week${overdueWeeks > 1 ? 's' : ''} ago`
    : 'Block finished',
```

Probe 3, across three departure points × five windows:

| left during | back after | status | weeksOverdue | headline |
|---|---|---|---|---|
| accumulation wk 1 | 3 days / 2 weeks / 1 month | active | 0 | (no card) |
| accumulation wk 1 | 3 months | awaiting decision | 7 | Recovery week passed 7 weeks ago |
| accumulation wk 1 | 6 months | awaiting decision | 20 | Recovery week passed 20 weeks ago |
| accumulation wk 4 | 2 weeks | **recovery** | 0 | (see RB6-3) |
| accumulation wk 4 | 6 months | awaiting decision | 23 | Recovery week passed 23 weeks ago |
| recovery week | 6 months | awaiting decision | 25 | Recovery week passed 25 weeks ago |

The audit's R-5 direction named two things the ruling did not carry: roll
the unit over to months past roughly eight weeks, and settle the documented
off-by-one (`mesocycle.js:453-455` records `weeksOverdue` as 0 through the
whole first post-recovery week, so every count above is one week short).
"Recovery week passed 25 weeks ago" is not shaming and not false in
substance; it is simply unreadable as a fact about a person's life, where
"your recovery week ended in February" is not.

**Direction sketch (not applied).** State the real date from the block's own
start rather than a derived count past some age, which answers both the
rollover and the off-by-one at once and needs no threshold. Copy only. The
audit deliberately left the wording to the dividend synthesis with the
founder's copy laws in front of it; that is still the right home for it.

---

### RB6-9 (LATENT, LOW) — a months-old decision keeps live Apply buttons and is never said to be old

When a returning user opens the Coach tab with no current check-in they are
redirected to their last completed decision. Auto-apply correctly refuses it
past a week (D97-10, `CoachOutputScreen.js:2196-2200`), and the screen
carries a dated week range including the year
(`coachOutput/viewCopy.js:19-24`). But the manual Apply buttons remain live
on a decision of any age, and nothing on the card says the decision is old
— only that it covered particular dates.

This was recorded inside CLEAN entry R-29 as *"it carries no explicit
statement that it is old, which is the same gap R-1 and R-2 describe on the
surfaces either side of it"*. R-1 and R-2 were subsequently ruled and
worked; this sibling was not carried onto any list. Recorded here so it is
not lost a second time.

**Direction sketch (not applied).** One line of provenance on a decision
older than its own week ("This review covers …; it has not been updated
since"), leaving the buttons live — resuming deliberately is the user's
right and the audit was correct that the tap is theirs. No gate, no
threshold.

---

## 5. WHAT THIS REVIEW DID NOT COVER

- Reinstall, new device and two-device conflict behaviour of anything above:
  the S-lane (Phases 32-38). RB6-6 has a sync dimension and is recorded for
  its user-visible consequence, not as a sync finding.
- D91-24 and D91-25: untouched and not designed against. RB6-1 and RB6-2 are
  bounded-window defects in surfaces that read a window incorrectly, not
  proposals for freshness or decay semantics; where a direction would cross
  into D91-25 it is named and stopped.
- The founder-gated items R-3, R-9, R-16, R-18, D97-3 and D97-9: cited where
  adjacent, never re-argued. RB6-7 widens R-16's scope without proposing a
  policy.
- The two full-suite failures noted in the header: not return-lane, passes in
  isolation, outside this brief.

---

*End of Review B. This file is the only file created or modified. No test,
migration, commit, push or stash was made; no cloud command was issued.*
