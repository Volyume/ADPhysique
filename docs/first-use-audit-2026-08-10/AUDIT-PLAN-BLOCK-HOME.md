# Campaign 5 — Phases 10, 11, 12 evidence

**Lane:** plan creation/selection (Phase 10), first training-block start
(Phase 11), zero-history Home (Phase 12).
**Branch:** `claude/campaign5-first-use`. **Audit only:** nothing outside
this file was created, edited, committed, pushed or stashed.
**Method:** every claim below is read from source at the cited
`file:line`. Comprehension questions are answered from the rendered copy,
quoted verbatim. Upstream: `CURRENT-FIRST-USE-JOURNEY.md` (Phase 1) is
cited where its findings already cover a surface, so nothing is
double-raised.

---

## 1. Summary table

| ID | Class | Sev | One-line claim |
|---|---|---|---|
| C5-P10-01 | DEFECT | HIGH | No first-plan path tells the user that activating a plan starts a 6-week training block; the one sentence that says so renders only for Pro users who already have one. |
| C5-P10-02 | DEFECT | MEDIUM | The library path never states days per week: the heading formatter strips the "3×/Week" suffix and the existing `days:N` tag / `getPlanDays()` helper are rendered nowhere outside FreeStarter. |
| C5-P10-03 | DEFECT | MEDIUM | The Plan Library quiz can hand a "Home / no equipment" user a full-gym, advanced division plan: equipment is a score bump, not a filter, and there is no difficulty guard. |
| C5-P10-04 | DEFECT | MEDIUM | Equipment is never rendered anywhere in browse or preview, and a library plan's workouts are not tappable, so the exercises cannot be seen before activation. |
| C5-P10-05 | DEFECT | LOW | Library activation is silent: "Add and start this plan" ends in a bare `goBack()`, visually identical to "Save for later"; the three activation entry points disagree on whether a confirmation appears at all. |
| C5-P10-06 | DEFECT | LOW | The manual builder's success sheet button "Go to Train" navigates to `HomeTab`, the tab labelled "Today"; the tab labelled "Train" is where the same screen's "Save draft" goes. |
| C5-P10-07 | IMPROVEMENT | MEDIUM | "Can I edit it?" is never answered and the answer silently differs by tier: the Manage block (Edit plan / Duplicate / Archive) is free-only. |
| C5-P10-08 | IMPROVEMENT | MEDIUM | "What does activation mean?" is only ever expressed as the verb itself ("Make it active now", "Set active", "Save and activate"). |
| C5-P10-09 | IMPROVEMENT | LOW | The Pro no-plan state on Train is inert text naming an action ("Start with a plan") that has no Pro affordance, while the free branch gets a real two-CTA empty state. |
| C5-P10-10 | IMPROVEMENT | LOW | `ManualBuilderScreen.handleSaveAndActivate` is the only activation path that skips `confirmPlanSwitchMidBlock`, so a mid-block user silently restarts their block. |
| C5-P10-11 | CLEAN | — | No mesocycle jargon and no manual workload-landmark configuration on any first-plan path. |
| C5-P11-01 | DEFECT | HIGH | The first-block explanation contradicts the block that was created: it says "The plan spans 5 weeks" for beginner/intermediate while every other surface says "Week 1 of 6" over a 6-dot block. |
| C5-P11-02 | DEFECT | MEDIUM | Progressive weeks plus recovery week are explained nowhere at block start except behind one Home chip tap; the free path has no other carrier at all. |
| C5-P11-03 | DEFECT | MEDIUM | The only screen that defines a training block on the Train side says blocks are OPTIONAL and user-configured, which the code contradicts. |
| C5-P11-04 | CLEAN | — | Block 1 cannot falsely claim personal history: `source='template'` forces the honest research line and nothing else can render. |
| C5-P11-05 | IMPROVEMENT | MEDIUM | "Nothing rolls into a new block automatically" is stated on no block-start surface anywhere in the app. |
| C5-P11-06 | IMPROVEMENT | LOW | The block sheet states its provenance line before it defines what a block is. |
| C5-P11-07 | IMPROVEMENT | LOW | "Recovery week in 5" carries no unit noun. |
| C5-P11-08 | CLEAN | — | No tutorial wall: block education is one optional chip tap plus one info tooltip, and Workout Summary re-shows the arc when it is relevant. |
| C5-P12-01 | DEFECT | MEDIUM | The top-most card on a zero-history Pro Home is a chevroned button whose press scrolls to y=0, where the user already is, and away from the hero it should lead to. |
| C5-P12-02 | IMPROVEMENT | MEDIUM | Two unlabelled "N of M" counters sit two lines apart in the hero with different meanings: "Day 1 of 2" (plan rotation) and "Week 1 of 6" (block). |
| C5-P12-03 | IMPROVEMENT | LOW | Three tappable cards stack above the primary CTA on a zero-history Pro Home; the free equivalent has one. |
| C5-P12-04 | IMPROVEMENT | LOW | "Since your check-in" presupposes a check-in that has never happened; only the trial-banner suppression keeps it off a day-0 screen. |
| C5-P12-05 | CLEAN | — | Nothing on the zero-history Home needs history to be meaningful: every history-dependent card is correctly gated. |
| C5-P12-06 | CLEAN | — | The single most obvious next action is unambiguous: the filled "Start workout" primary inside the elevated hero. |

Counts: **8 DEFECT** (2 HIGH, 5 MEDIUM, 3 LOW — see per-item severities),
**11 IMPROVEMENT**, **5 CLEAN**, 0 FOUNDER-GATED, 0 UNCERTAIN.

---

## 2. Phase 10 — plan creation and selection

### 2.1 The six first-plan paths, verified from code

| # | Path | Entry | Activation call | Confirmation shown |
|---|---|---|---|---|
| 1 | Library browse | `PlansScreen.js:43-51` → `PlanLibraryScreen` | `PlanLibraryScreen.js:373` | none (`:374` `goBack()`) |
| 2 | Library preview | `PlanLibraryScreen.js:564,609` → `PlanDetailScreen` | `PlanDetailScreen.js:139` | none (`:140` `goBack()`) |
| 3 | Existing plan activation | `PlansScreen.js:702-709` "Set as active" | `PlansScreen.js:374` | none; `PlanDetailScreen.js:151-153` does toast |
| 4 | Free starter quiz | `HomeScreen.js:1960-1962`, `PlansScreen.js:975-977` | `FreeStarterScreen.js:118` | lands on Home |
| 5 | Manual builder | `PlansScreen.js:52-58` → `ManualBuilderScreen` | `ManualBuilderScreen.js:790` | success sheet `:1284-1286` |
| 6 | Pro setup (generated) | wizard step 6 → `planAutoGen.js:223` | `planAutoGen.js:223` | `ProSetupCompleteScreen.js:229-536` |

All six converge on `activatePlanWithBlock` (`database.js:3715-3765`),
which is unconditionally block-creating:

> `database.js:3732-3743` — "6 weeks: 5 accumulation (RIR 3→2→1→0→0) + 1
> deload (RIR 4)" … `INSERT INTO mesocycles … VALUES (?, ?, ?, ?, ?, 6, 6,
> 6, …, '[3,2,1,0,0,4]', 1, 1, ?, ?)`

`generateMesocycleWeeks` (`database.js:3981-4025`) then writes six
`mesocycle_weeks` rows, week 6 `is_deload = 1`, week 1 `rir_target = 3`.

### 2.2 The order's seven questions, answered from the copy

| Q | Library | Free starter | Manual builder | Pro setup |
|---|---|---|---|---|
| 1. What am I choosing? | partly: name, description, difficulty, workout count. No exercises, no equipment | yes: name, description, days, workouts | it is the user's own | yes: `ProSetupCompleteScreen.js:416-449` split list + rationale |
| 2. How many days? | **no** (C5-P10-02) | yes (`FreeStarterScreen.js:208-213`) | user picks (`ManualBuilderScreen.js:906-923`) | yes (`ProSetupCompleteScreen.js:418-420`) |
| 3. What equipment? | **no** (C5-P10-03/04) | implied by Q2 of the quiz | user picks exercises | yes, in the rationale (`planEngine.js:2323`) |
| 4. Can I edit it? | **no** (C5-P10-07) | **no** | obviously yes | **no**, and Pro has no "Edit plan" row |
| 5. What does activation mean? | **no** (C5-P10-08) | **no** | **no** | **no** |
| 6. What happens after? | **no** (C5-P10-05) | lands on Home with a session ready | success sheet + two routes | yes: `ProSetupCompleteScreen.js:290-504` four-step routine |
| 7. Does starting a plan start a block? | **no** | **no** | **no** | **no** (C5-P10-01) |

### C5-P10-01 — DEFECT (HIGH). Q7 is answered only where it is not needed.

Two strings in the product state that activation starts a block. Neither
can reach a first-time user.

1. `PlansScreen.js:1204-1208`, gated on `isProWithPlan` (`:619` —
   `tier === 'pro' && !!activePlan`):
   > "Your check-ins, PRs, and coach output keep working whichever plan
   > you choose. Activating a new plan starts a fresh training block."
   A first-time user has no active plan, so this never renders for them.
2. `planSwitch.js:44-47`:
   > "Activating "{name}" starts a fresh block from week 1. Your workout
   > history and PRs are kept."
   Guarded at `planSwitch.js:38-40` — `if (status.currentWeek <= 1) return
   true;` and `if (status.status !== 'active') return true;` — so it
   cannot fire in week 1, which is the only week a first-time user is in.

Everything the first-time user does see avoids the word: "Make it active
now, or just add it for later" (`PlanLibraryScreen.js:345`,
`PlanDetailScreen.js:113`), "Set active" (`PlanDetailScreen.js:362`),
"Set as active" (`PlansScreen.js:706`), "Start with this plan"
(`FreeStarterScreen.js:216`), "Save and activate" →
"Plan activated / Your plan is set as active and ready to use."
(`ManualBuilderScreen.js:1262,1284-1286`), "Start training"
(`ProSetupCompleteScreen.js:527`).

**Scenario.** A new free user taps Start with a plan → three questions →
"Start with this plan". A six-week block with a fixed effort ladder and a
scheduled recovery week now exists on their account. Nothing on that
screen, or the next one, mentions it. Four days later the Home chip says
"Week 1 of 6" for a thing they never knowingly started.

**Law violated:** first-use law 2 (do → see result → explain when
relevant) is not the issue; the issue is that the result is never
explained at all, and the order's Phase 10 Q7 is unanswerable.

**Proposed minimal fix.** One sentence at the activation decision point,
shared by all six paths (e.g. appended to the existing alert body at
`PlanLibraryScreen.js:345` / `PlanDetailScreen.js:113`, to
`FreeStarterScreen.js:222-224`'s footnote, to
`ManualBuilderScreen.js:1286`, and to `ProSetupCompleteScreen.js:418-420`).
No new screen, no new control, no jargon: "This starts a six-week training
block: five weeks that build, then a lighter recovery week." Copy only.

### C5-P10-02 — DEFECT (MEDIUM). The library never says how many days a week.

- The library card's meta line is a workout count, not a frequency:
  `PlanLibraryScreen.js:586-589` — `{wc} workout{wc !== 1 ? 's' : ''}`.
- The plan heading actively strips the frequency the seed name carries:
  `PlanLibraryScreen.js:597` and `PlanDetailScreen.js:331` both render
  `planHeadingName(plan.name)`, and `planDisplay.js:36-60` removes a
  trailing "3×/Week" suffix. Eight of the 31 seeded plans carry that
  suffix (`seedRoutines.js:67,139,191,234,354,391,628` and
  `:1440`-adjacent names), so the one place the frequency was stated is
  removed for display.
- Plan Detail's three stats are Workouts, "~N Est. sets/week" and Level
  (`PlanDetailScreen.js:336-353`). No days figure.
- The data already exists and is already parsed: every seeded plan carries
  a `days:N` tag (`seedRoutines.js:39,69,101,141,193,236,…`), and
  `getPlanDays()` (`freeStarter.js:60-64`) reads it. Its only consumer is
  `FreeStarterScreen.js:134,208-213`, which renders exactly the right
  line: `3 days a week - 2 workouts`.

**Scenario.** A user with three free evenings browses the library, opens
"Push Pull Legs 6×/Week", sees the heading "Push Pull Legs", "6 workouts",
"Intermediate", adds it, and discovers only in week 1 that the plan
assumes six sessions.

**Proposed minimal fix.** Render the existing `getPlanDays(plan)` value on
the library card and Plan Detail stat row, in the wording FreeStarter
already ships ("N days a week"). One existing pure helper, one existing
tag, no schema and no new control.

### C5-P10-03 — DEFECT (MEDIUM). The library quiz has no equipment filter and no difficulty floor.

`PlanLibraryScreen.js:149-169` scores candidates over the **whole**
library:

```
if (equipment === 'dumbbell'   && hasTag(p, 'equipment:dumbbell'))  score += 4;
if (equipment === 'bodyweight' && hasTag(p, 'equipment:bodyweight')) score += 4;
```

Equipment is a bump, never a filter, and `plan.difficulty` is not
consulted at all. Contrast the module written specifically to fix this,
`freeStarter.js:9-19`:

> "equipment is a hard FILTER, not a score bump. Someone training at home
> is never handed a barbell plan they cannot do"

implemented at `freeStarter.js:73-80` (`isStarterCandidate`), which also
enforces `plan.difficulty !== 0 → reject`.

**Scenario (traced through the real scoring).** New free user, no plan →
Home "Browse plans" (`HomeScreen.js:1963-1964`) → Plan Library → the
"Not sure where to start?" banner (`PlanLibraryScreen.js:505-520`) →
answers "Get on stage" and "Home / no equipment"
(`PlanLibraryScreen.js:94-114`). Scores: the Men's Physique division plan
(`seedRoutines.js:951` tags `category:division division:mens_physique …
days:5 advanced … featured`) gets +5 (stage_prep) +1 (featured) = 6; the
bodyweight starter (`seedRoutines.js:911` tags `equipment:bodyweight …
days:3 beginner`) gets +4 (equipment) +1 (`gender:all`) = 5. The user with
no equipment is shown "Here's our suggestion" over a five-day advanced
gym plan, with "Add this plan" as the primary
(`PlanLibraryScreen.js:682-701`).

**Proposed minimal fix.** Apply the equipment answer as a hard filter in
`getQuizRecommendation` using the same predicate shape
`isStarterCandidate` already encodes, and fall through to the existing
"No exact match found" branch (`PlanLibraryScreen.js:714-725`) when it
empties the pool. Pure function change plus the existing fallback UI. No
new feature.

### C5-P10-04 — DEFECT (MEDIUM). Equipment is invisible, and library exercises cannot be previewed.

- Badges on a library card are Featured, division, For women, For men and
  difficulty only (`PlanLibraryScreen.js:574-584`). No equipment badge,
  although the tags exist (`seedRoutines.js:870,911`).
- `grep -in equipment` over `PlanLibraryScreen.js` and
  `PlanDetailScreen.js` returns only the quiz definition, the collection
  predicate, the scorer and the `WHY_ORDER` key. No rendered equipment
  string on either screen.
- The description is the only carrier, and the card clamps it to two lines
  (`PlanLibraryScreen.js:600` `numberOfLines={2}`).
- On Plan Detail, a library plan's workout rows are plain `Card`s with no
  `onPress` (`PlanDetailScreen.js:446-459`); the edit and start controls
  are `!isLibrary` only (`:460-481`). `Card.js:111` makes a card pressable
  only when a press handler is supplied, so these are inert. The user can
  see "Day 1: Width, Rear Delts & Back Detail — 5 exercises" but not which
  five.

**Proposed minimal fix.** Two independent options for a lead ruling:
(a) an equipment badge on the card, derived from the existing
`equipment:*` tags with a "Full gym" default, alongside the existing
difficulty badge; (b) make library workout rows open a read-only exercise
list (the route already exists — `RoutineDetail`, used at
`PlanDetailScreen.js:464`, would need a read-only mode, which is more than
a copy change and so is the heavier option). (a) is minimal and is enough
to answer Q3.

### C5-P10-05 — DEFECT (LOW). Activation from the library is silent and indistinguishable from saving.

`PlanLibraryScreen.js:348-377`: "Save for later" copies then
`navigation.goBack()`; "Add and start this plan" copies, activates, then
`navigation.goBack()`. Same screen transition, no toast on either. The
same pair on `PlanDetailScreen.js:116-142` behaves identically, while the
adjacent `handleSetActive` on the same screen does toast
(`PlanDetailScreen.js:153` — `"{name}" is now your active plan`) and
`PlansScreen.handleSetActive` (`:370-380`) toasts on failure only.

**Scenario.** A user taps "Add and start this plan", is returned to the
list, sees no change, and taps it again on a second plan, believing the
first did not register. The second activation replaces the block created
seconds earlier (silently — `planSwitch.js:38` returns true in week 1).

**Proposed minimal fix.** Reuse the existing success toast from
`PlanDetailScreen.js:153` on the two library activation paths and on
`PlansScreen.handleSetActive`, so all activation entry points confirm
identically. Existing component, existing string shape.

### C5-P10-06 — DEFECT (LOW). "Go to Train" goes to Today.

`ManualBuilderScreen.js:1296-1301`:

```
title="Go to Train"
onPress={() => { setSuccessModal(false); navigation.navigate('HomeTab'); }}
```

`RootNavigator.js:620-621` — `HomeTab` is titled **Today**, `PlansTab` is
titled **Train**. The same screen's `handleSaveDraft` navigates to
`'PlansTab'` (`ManualBuilderScreen.js:808`), so within one screen the two
save paths use the same word for two different destinations.

**Proposed minimal fix.** Either rename the button to match its
destination ("Go to Today") or point it at `PlansTab`. A one-token copy or
route change; the lead should pick, since "go and train" is a defensible
reading of the label but the app has a tab with that exact name.

### C5-P10-07 — IMPROVEMENT (MEDIUM). Editability is unstated and tier-dependent.

`PlanDetailScreen.js:504-529` gates the whole Manage block on
`!isLibrary && tier !== 'pro'`, with the in-code rationale "Pro users
manage their plan through the goal-change wizard in Athlete Hub". So a Pro
first-use user, viewing the plan the wizard just built, sees no "Edit
plan", no "Duplicate", no "Archive". They can still edit one day at a time
through the pencil at `:462-470` (which is `!isLibrary` only, not
tier-gated), and rebuild the whole plan through `PlanUpdate`
("Adjust training plan … Volyume previews the rebuild before it replaces
your active plan", `PlansScreen.js:66-73`, Pro-guarded at
`RootNavigator.js:230`). `PlansScreen.handlePlanOptions` likewise drops
Duplicate for Pro (`:511-521`).

No copy on any first-plan path states whether the plan can be edited.
Worth a lead ruling on whether Q4 deserves one line at the decision point,
and whether the Pro "no Edit plan row" is still the intended shape.

### C5-P10-08 — IMPROVEMENT (MEDIUM). Activation is named but never described.

The full inventory of activation copy is in C5-P10-01. In every case the
verb is the entire explanation. Nothing states the three things that
actually change: which session becomes "next"
(`advancePlanNextWorkout`, `database.js:3799-3810`), that the Home hero
now leads with this plan (`HomeScreen.js:1854-1924`), and that the coach
reads this plan (the only surface that says so is the Pro-with-plan note
at `PlansScreen.js:942-946`). One sentence would carry Q5 and Q6
together; the lead should rule on whether it belongs in the alert body or
the post-activation toast.

### C5-P10-09 — IMPROVEMENT (LOW). The Pro no-plan state on Train names an action it does not offer.

`PlansScreen.js:982-989` renders, for `tier === 'pro'` with no active
plan, a `Card` with **no** `onPress` and no buttons:

> "No active plan · Start with a plan, browse the library, or create your
> own."

"Start with a plan" is the free path's route to `FreeStarter`
(`PlansScreen.js:975-977`); there is no Pro affordance with that name. The
free branch two lines above gets a full `EmptyState` with two working
CTAs (`:971-981`). The Decision Hub further down does supply the other two
actions (`:1204-1235`), so this is a hierarchy and naming issue rather
than a dead end.

### C5-P10-10 — IMPROVEMENT (LOW). One activation path skips the mid-block confirmation.

`ManualBuilderScreen.js:778-798` calls `activatePlanWithBlock` directly.
Every other path calls `confirmPlanSwitchMidBlock` first
(`PlanLibraryScreen.js:371`, `PlanDetailScreen.js:137,149`,
`PlansScreen.js:372`). Not a first-use defect — a first-time user has no
block to lose — but it is the same Q7 blind spot, and it means the one
dialogue that explains blocks can be bypassed entirely by a user who
builds their own plan mid-block. Flagged for the lead rather than
proposed, since it is outside the first-use window.

### C5-P10-11 — CLEAN. Jargon and advanced controls.

- Greps over `PlansScreen.js`, `PlanLibraryScreen.js`,
  `PlanDetailScreen.js`, `FreeStarterScreen.js`,
  `ManualBuilderScreen.js`, `ProSetupCompleteScreen.js`: no rendered
  occurrence of "mesocycle", "MEV", "MAV", "MRV", "deload", "RIR",
  "periodisation" or "hypertrophy" in user-facing copy. The only "meso"
  identifiers are internal (`HomeScreen.js:1877` style key `mesoBriefChip`;
  `getCurrentMesocycleWeek`).
- No first-plan path asks for or exposes a workload landmark. Landmarks
  enter only through the engine: `database.js:3746-3747` imports
  `VOLUME_LANDMARKS` and hands it to `generateInitialPlannedVolume`
  (`database.js:4127-4207`). No screen in the six paths renders or edits
  `mev` / `mav` / `mrv`.
- The manual builder asks only for name, goal and days per week on page 1
  (`ManualBuilderScreen.js:872-925`), which is the correct floor.
- Free/Pro gating holds: `ManualBuilder`, `PlanLibrary`, `PlanDetail` and
  `MesocycleBuilder` are ungated (`RootNavigator.js:465-470`); only
  `PlanUpdate` is Pro-guarded (`RootNavigator.js:230`).

---

## 3. Phase 11 — first training-block start

### 3.1 What actually happens, and what the user is shown

Activation writes the block (see §2.1). **No screen, sheet, toast or
banner is shown at the moment a block is created**, on any of the six
paths. The block only becomes visible on the next Home render, as one chip
inside the session hero:

`HomeScreen.js:1875-1890` — a `TouchableOpacity` with
`accessibilityLabel="See the shape of your training block"`, whose
**visible** text is `readinessSummary.line`. For a day-0 user that line is
built at `readinessSummary.js:99-104`:

```
const rirBit = currentMesoWeek.rirTarget != null ? ` - stop ${currentMesoWeek.rirTarget} short of failure` : '';
return { tone: 'go', line: `Week ${currentMesoWeek.weekIndex} of ${currentMesoWeek.plannedWeeks ?? '-'}${rirBit}` };
```

with `weekIndex = 1`, `plannedWeeks = 6`, `rirTarget = 3`
(`database.js:4043-4077`, `:3986-4004`), i.e.

> **"Week 1 of 6 - stop 3 short of failure"**

Tapping it opens `HomeBlockShapeSheet` (`HomeScreen.js:2114-2120`). That
sheet is the whole of the first-block explanation:

| Element | Source | Day-0 content |
|---|---|---|
| Title | `HomeBlockShapeSheet.js:42` | "Your block" |
| Sub | `:43` | the block name, which `activatePlanWithBlock` sets to the plan name (`database.js:3742`) |
| Week dots + line | `:44-49` → `BlockShapeCard.js:19-52` | six dots labelled Ease in, Build, Build, Build, Push, Recover; line "Week 1 of 6 · Ease in. Recovery week in 5." |
| Provenance line | `:50-52` | the research line (C5-P11-04) |
| Block definition | `:61` → `coachGlossary.js:40-41` | "A training block: a few weeks that ease in, build, push, then recover." |
| Why it climbs | `:62-64` | "Effort builds a little each week so your body keeps adapting, then the recovery week lets it catch up. How each muscle responds can shape where your next block starts." |
| Recovery definition | `:65` → `coachGlossary.js:42-43` | "A lighter planned week so you recover: lighter loads, full recovery, no PRs." |
| Effort definition | `:66` → `coachGlossary.js:47-48` | "Reps in reserve: how many reps you'd have left; "stop 2 short" means finish the set when you believe you could still do about 2 good reps. Most weeks leave reps in reserve, building effort as the block goes on, so progress never depends on taking every set to failure." |

Against the order's five required understandings at first block start:

| Required | Carried? | Where |
|---|---|---|
| several progressive training weeks | yes, if the chip is tapped | `BlockShapeCard.js:19-24,51`; `HomeBlockShapeSheet.js:62-64` |
| then a recovery week | yes, if the chip is tapped | `BlockShapeCard.js:19-24`; `coachGlossary.js:42-43` |
| starts from research + profile | yes | `blockExplain.js:44-46` (C5-P11-04) |
| personal history influences later blocks | yes | `HomeBlockShapeSheet.js:63-64`; `blockExplain.js:45-46` |
| nothing rolls over automatically | **no** | C5-P11-05 |

### C5-P11-01 — DEFECT (HIGH). The block explanation states the wrong number of weeks.

`planEngine.js:2318-2320`:

```
const weeks = (experience === 'advanced' || experience === 'competitive') ? 6 : 5;
result.progression = `The plan spans ${weeks} weeks. You start at the sets shown here and add roughly one to two sets per muscle group per week across the first ${weeks - 1} weeks. The final week drops to about half the volume. This is not a lost week. Your muscles use the easier week to fully repair and come back stronger before the next block.`;
```

The block that is actually created is always six weeks
(`database.js:3737-3743` writes `duration_weeks 6, planned_weeks 6,
deload_week 6`; `generateMesocycleWeeks` at `:3986-4004` materialises six
rows). Experience never reaches the block writer.

The onboarding experience options are Beginner (<18 months), Intermediate
(18 months to 3 years), Advanced, Competitive
(`ProOnboardingScreen.js:158-163`). Beginner and Intermediate — the
first-use audience — therefore read:

> "The plan spans 5 weeks … across the first 4 weeks. The final week drops
> to about half the volume."

while the Home chip says "Week 1 of 6", `BlockShapeCard` draws six dots
with Recover on the sixth, and Workout Summary repeats both
(`WorkoutSummaryScreen.js:1256-1261`).

This string is user-facing in two places: `ProSetupCompleteScreen.js:450-460`
("Why this plan, for you", inside the collapsible "3. Train your split"
card) and `PlanDetailScreen.js:490-502` (same section on the active
generated plan). It is cached at `planAutoGen.js:158`.

**Scenario.** An intermediate Pro user reads "The plan spans 5 weeks" on
the setup reveal, plans a holiday for week 6, and finds the app has been
saying "Week 5 of 6 · Push" with a recovery week still ahead.

**Law violated:** the block explanation must be true of the block that
exists (Campaign 2 provenance discipline; order Phase 11 "Pin that
first-block explanation cannot falsely claim…").

**Proposed minimal fix.** Two options for the lead:
(a) derive the number in `buildWhyThis` from the block the app will create
rather than from `experience` (the writer's constant lives at
`database.js:3737-3743`; the cleanest shape is a single exported constant
both read), or (b) drop the numbers from `result.progression` and describe
the shape only ("The plan builds week by week, then finishes with a
lighter recovery week"). (a) keeps the information and is preferred by the
"absolute best solution" criterion; both are pure-function copy changes
with no engine-behaviour change. **Note:** `planEngine.js` is a
deterministic engine module — the change must stay pure and must not alter
any prescribed set, rep or landmark value.

### C5-P11-02 — DEFECT (MEDIUM). The block explanation has exactly one entry point, and the free path has no second carrier.

- The only route into the block sheet is the hero chip
  (`HomeScreen.js:1875-1890`). `grep -rn "HomeBlockShapeSheet"` returns
  one call site.
- The chip's visible label is a week count and an effort instruction, not
  an invitation to learn what a block is; the word "block" appears only in
  the accessibility label (`HomeScreen.js:1880`), which a sighted user
  never sees.
- The Pro path has a second carrier — `result.progression`, quoted above —
  but it is behind a collapsed card (`ProSetupCompleteScreen.js:403-405`,
  `planOpen` defaults `false` at `:55`, with the in-code note "the user
  should reach Start training before reading every rationale line"), and
  it carries the C5-P11-01 error.
- The free path has **no** second carrier at all: `whyThis` is written only
  by `planAutoGen.js:158`, and `PlanDetailScreen.js:490` gates the section
  on `isActive && !isLibrary && whyThis`. A free user who activated a
  library or starter plan has no `PLAN_WHYTHIS_KEY` entry, so the section
  never renders for them.

**Scenario.** A free user starts the recommended starter plan, trains for
three weeks, and in week 6 finds their prescribed sets have dropped. They
were never told a recovery week existed, because they never tapped a chip
that reads "Week 1 of 6 - stop 3 short of failure".

**Proposed minimal fix (copy only, no tutorial wall).** Add the block
sentence proposed in C5-P10-01 to the activation confirmation, so every
path states the shape once at the moment it becomes true, and leave the
sheet as the depth. This satisfies the order's "the block sheet /
contextual explanation should carry the burden" while removing the
single-point-of-discovery risk. A lead ruling is needed on whether the
chip's visible label should also name the block (e.g. "Block week 1 of 6")
— that is a copy change to `readinessSummary.js:99-104`, whose priority 1
to 4 branches must keep their current wording.

### C5-P11-03 — DEFECT (MEDIUM). The one place that defines a block on the Train side contradicts the code.

`MesocycleBuilderScreen.js:186-198` (an `InfoTooltip` on the "Your active
plan" card, reached from `PlansScreen.js:1183-1196` "Training blocks · View
completed blocks and long-term progress"):

> "A training block is a structured period, usually 4 to 8 weeks, where
> your weekly sets gradually increase, then drop back during a lighter
> recovery week to let your body absorb the work.
>
> Your plan (the workouts and exercises) lives independently. **A block is
> an optional layer you add on top** to track week-by-week progress across
> those weeks.
>
> After the block ends: • The block is archived in Past blocks below •
> Your plan keeps going. The workouts are still there. • Start a new block
> to begin the next training phase"

and `MesocycleBuilderScreen.js:232-238`:

> "This is the training your coach built. A training block is an optional
> multi-week layer on top of it. **Set a start date, duration and recovery
> week** to track periodised progress."

Neither is true of the shipping product. `activatePlanWithBlock`
(`database.js:3715-3765`) creates a block on every activation with no opt
out, and there is no user control anywhere for start date, duration or
recovery week (the values are hard-coded at `database.js:3730-3743`). The
sheet the user is more likely to see says the opposite — "A training
block: a few weeks that ease in, build, push, then recover"
(`coachGlossary.js:40-41`) — with no optionality.

The first two paragraphs are also the only place the "no automatic
rollover" fact is stated (see C5-P11-05), so the passage cannot simply be
deleted.

**Scenario.** A curious first-week user taps the info icon to find out
what the "Week 1 of 6" chip means, and is told blocks are an optional
layer they can configure. They look for the configuration, find none, and
conclude the app is describing a feature they do not have.

**Proposed minimal fix.** Rewrite the two passages to describe the live
behaviour: a block is created with the plan, runs a fixed six weeks, is
archived at the end, and the next one only starts when the user chooses.
Keep the "your plan keeps going" and "start a new block" facts, which are
correct and load-bearing. Copy only; no behaviour change; the "duration
and recovery week" sentence at `:232-238` should be dropped, since it
describes controls that do not exist.

### C5-P11-04 — CLEAN. Block 1 cannot claim personal history.

Verified end to end:

1. First activation passes `ledger = null`
   (`database.js:3715`, and every first-use caller omits the option —
   `FreeStarterScreen.js:118`, `PlanLibraryScreen.js:373`,
   `PlanDetailScreen.js:139,151`, `ManualBuilderScreen.js:790`,
   `planAutoGen.js:223`).
2. `generateInitialPlannedVolume` therefore writes `source = 'template'`
   for every muscle and every week (`database.js:4150-4167`, the ternary
   at `:4167` — `const source = seeded ? \`seed_${seed.source}\` :
   'template';`), including the deload row at `:4193-4200`.
3. `summariseSeededPlan` keys the source off the week-1 row explicitly
   (`blockExplain.js:72-75`).
4. `buildBlockStartLines` finds no personalised source, confirms every
   entry is in `RESEARCH_SOURCES` (`blockExplain.js:44,113-119`) and
   returns the single honest line (`blockExplain.js:45-46`):

   > "Not enough personal history yet, so this block starts from
   > research-based guidance. As blocks finish, each muscle's starting
   > point comes from how it actually responded."

5. `HomeScreen.js:1147-1158` computes it and `HomeBlockShapeSheet.js:50-52`
   renders it above the definitions.

No other first-block copy claims history. `HomeBlockShapeSheet.js:63-64`
uses "can shape where your **next** block starts" (future).
`ProOnboardingScreen.js:1761-1764` uses "Using your body data, goal,
training week and recovery to set a sensible starting point"
(profile-derived). `HomeWelcomeCard.js:59-60` uses "Your coach learns as
you train" (future). This satisfies first-use law 3 on the block surfaces.
Pinned by `src/lib/__tests__/blockExplain.stage8.test.js`.

### C5-P11-05 — IMPROVEMENT (MEDIUM). "Nothing rolls over automatically" is never said at block start.

`grep -rn "never rolls|nothing rolls|automatically start|new block automatically"`
over `src/` returns nothing. The nearest statement is the third bullet of
the `MesocycleBuilderScreen.js:196` tooltip ("Start a new block to begin
the next training phase"), which is behind an info icon on a secondary
screen and sits inside the incorrect "optional layer" framing
(C5-P11-03). The decision itself is real and correctly manual —
`PlansScreen.js:286-339` requires an explicit "Start new block" confirm,
and `blockAdvisor`'s `post_recovery` card is the only route
(`PlansScreen.js:806-841`) — but the user is not told this until they
arrive there in week 7.

**Proposed minimal fix.** One clause in the block sheet's climb paragraph
(`HomeBlockShapeSheet.js:62-64`), e.g. "…then the recovery week lets it
catch up. When the block finishes, you choose what comes next; nothing
starts on its own." Copy only, in a surface that already exists.

### C5-P11-06 — IMPROVEMENT (LOW). The sheet explains provenance before it explains the thing.

Render order in `HomeBlockShapeSheet.js:44-66`: dots and week line → "Not
enough personal history yet, so this block starts from research-based
guidance…" → "A training block: a few weeks that ease in, build, push,
then recover." A first-time user reads why the block is not personalised
before learning what a block is. Moving `:61` above `:50-52` is a
one-line reorder; worth a lead ruling because the current order puts the
honest provenance line highest, which may be deliberate.

### C5-P11-07 — IMPROVEMENT (LOW). "Recovery week in 5" has no unit.

`BlockShapeCard.js:51` — `` line = `Week ${current + 1} of ${n} · ${word}. Recovery week in ${weeksToRecovery}.` ``.
For a day-0 six-week block that renders "Week 1 of 6 · Ease in. Recovery
week in 5." The dot row above supplies the context, but the sentence alone
does not say five what. "Recovery week in 5 weeks" is a two-word fix.

### C5-P11-08 — CLEAN. No tutorial wall, and the arc reappears when relevant.

- Block education is entirely opt-in: one chip tap
  (`HomeScreen.js:1878`) and one info tooltip
  (`MesocycleBuilderScreen.js:186`). No modal, no forced sequence, no
  blocking step is added by block creation.
- `WorkoutSummaryScreen.js:1248-1264` re-renders the same
  `BlockShapeCard` after a session under the heading "Your block", gated
  on `!readOnly && !calmSuppressed && mesoWeek?.plannedWeeks >= 2`. That
  is the "do → see result → explain when relevant" beat the order asks
  for, and it is correctly suppressed under calm mode or an open ED flag.
- The five effort words are plain English and carry no numbers
  (`BlockShapeCard.js:19-24`); the glosses self-name without using the
  jargon term (`coachGlossary.js:40-48`).

---

## 4. Phase 12 — zero-history Home

Modelled user: account created, profile complete, active plan with a block
in week 1, zero completed workouts, zero PRs, zero check-ins, zero coach
outputs, one seeded morning weight (`ProOnboardingScreen.js:978` logs one
at enrolment on the Pro path).

### 4.1 Every card Home renders, in DOM order, with its conditional

| # | Element | Condition (`HomeScreen.js`) | Pro day 0 | Free day 0 |
|---|---|---|---|---|
| 1 | `ScreenHeader` "Today" + greeting | always, `:1554` | shown | shown |
| 2 | Coach review banner | `:1463-1465` `tier==='pro' && latestCoachOutput?.hasEnoughData` | **no** (no output exists) | no |
| 3 | Trial `AttentionCard` | `:1504,1515`; `trialBanner` from `:482-561` | **shown** | no (`:484` `stageOf !== 'pro_trial'`) |
| 4 | Recovery-week banner | `:1481` `deloadSuggestion` | no (needs 4 weeks of data, `:1074-1114`) | no |
| 5 | Nutrition phase banner | `:1482` `phaseMismatch` | no | no |
| 6 | Lift plateau banner | `:1485` | no (needs lift history) | no |
| 7 | Activation nudge | `:1491` `stage !== COLD_START` | no | no |
| 8 | Free line / differential | `:1496-1497` | no (Pro) | **no** — `buildFreeCoachLine` returns null at zero sessions and <4 weights (`coachResponse.js:546-557`), and the differential loader returns early on `!checkins.length` (`HomeScreen.js:844`) |
| 9 | Skeletons | `:1792` `initialLoading` | transient | transient |
| 10 | `TodayStrip` | `:1811` `tier==='pro' && user?.id` | **shown**, "Morning weight" with the enrolment value and a "Logged" pill (`TodayStrip.js:184-190`) | no |
| 11 | `HomeWelcomeCard` | `:1832` `totalSessions===0 && !welcomeDismissed && activePlan && nextWorkout` | **shown** | **shown** |
| 12 | Session hero | `:1854` `activePlan && nextWorkout` | **shown** | **shown** |
| 12a | eyebrow `planProgress` | `:1856-1858` | "Beginner Full Body · Day 1 of 2" (`planDisplay.js:63-75`) | same |
| 12b | routine name + exercise count | `:1859-1866` | shown | shown |
| 12c | block chip | `:1875-1890` `readinessSummary` | "Week 1 of 6 - stop 3 short of failure" | same |
| 12d | `CoachBriefCard` | `:1415` filler suppressed | **no** | no |
| 12e | `[Start workout]` + `[Options]` | `:1898-1919` | **shown** | shown |
| 12f | `ConsistencyEcho` | `:1923` | **no** — returns null with no run (`ConsistencyEcho.js:55-64`) | no |
| 13 | `CoachDailyBrief` | `:2032` `tier==='pro' && !trialBanner` | **no** (trial banner exists) | no (free) |
| 14 | Pro teaser | `:2036` `tier==='free' && totalSessions>=3` | no | **no** |
| 15 | `HomeLastSessionCard` | `:2048` `lastSession` | no | no |
| 16 | Coaching nudge | `:1019-1045` needs `completed.length >= 3` | no | no |

**Pro day 0 renders five things:** header, trial card, weigh-in strip,
welcome card, hero. **Free day 0 renders three:** header, welcome card,
hero. Both are close to the intended floor.

The trial card's day-0 content (`AttentionCard.js:68-118`,
`trialActivation.js:93-97,143-158`, `coachLedger.js:72-135`):

> "Your 14-day trial is live. One session starts your first coaching
> review."
> *What your coach is reading*
> ○ 1 of 3 mornings with a weigh-in in the last 7 days
> ○ Day 1 of 5 days of data
> ○ No training sessions yet
> [How Precision Coaching works]

### C5-P12-06 — CLEAN. The single most obvious next action.

**"Start workout"** — the only filled primary button on the screen
(`HomeScreen.js:1900-1907`, `Button` default variant), inside the only
elevated card (`:1855` `surface="surfaceElevated"`), directly under the
routine name, and explicitly pointed at by the welcome card immediately
above it: "Start a session below … Tap Start workout and log each set as
you go" (`HomeWelcomeCard.js:52-53`). Nothing else on the screen is a
filled primary. The order's question is answered cleanly.

### C5-P12-05 — CLEAN. Nothing shown needs history to be meaningful.

Every history-dependent surface is gated and correctly absent on day 0
(rows 2, 4, 5, 6, 7, 8, 12d, 12f, 13, 14, 15, 16 in the table above), with
the gates cited there. In particular:

- The "Ready when you are" filler brief is explicitly suppressed
  (`HomeScreen.js:1412-1417`).
- `ConsistencyEcho` fails closed before there is a run
  (`ConsistencyEcho.js:55-64`).
- The differential paywall cannot fire without a check-in
  (`HomeScreen.js:844`).
- The zero-history "Progress at a glance" card is gated on
  `lastSession != null` (`HomeScreen.js:1970`), so it never renders an
  empty stat pair.

No personalised-history claim renders: the only two personal-sounding
strings on the screen are "Your coach learns as you train"
(`HomeWelcomeCard.js:59`, future tense) and "What your coach is reading"
over three honestly-zeroed rows (`coachLedger.js:98-130`). This meets
first-use law 3.

### C5-P12-01 — DEFECT (MEDIUM). The top card is a button that does nothing.

`HomeScreen.js:1615-1628`:

```
onTrialPress={() => {
  if (trialBanner.variant === 'S3') {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  } else {
    navigateCrossTab(navigation, 'ProfileTab', 'WeeklyCheckIn');
  }
}}
```

`selectTrialVariant` returns `'S3'` whenever `completedSessions <= 0`
(`trialActivation.js:93-96`), which is exactly the zero-history state. The
card is rendered as a full-width `TouchableOpacity` with
`accessibilityRole="button"` and a `chevron-forward` icon
(`AttentionCard.js:68-82`), and it is the **first** element after the
header, so `scrollTo({ y: 0 })` is a no-op. If the user has scrolled at
all, it scrolls them further away from the hero, which sits below it.

**Scenario.** A day-0 Pro user reads "Your 14-day trial is live. One
session starts your first coaching review.", taps the chevron expecting to
be taken to that session, and nothing happens.

**Proposed minimal fix.** For the S3 variant, either drop the chevron and
the press handler (leaving the card informational, with its existing
"How Precision Coaching works" button as the only action) or point the
press at the hero. Both are `HomeScreen.js` / `AttentionCard.js` changes
with no billing logic touched — the card's **copy** and the trial
architecture stay exactly as they are, so this does not enter the
founder-gated billing-copy lane.

### C5-P12-02 — IMPROVEMENT (MEDIUM). Two unlabelled counters, two lines apart, different meanings.

Inside the hero:

- `HomeScreen.js:1856-1858` renders `planProgress`, built by
  `activePlanLine` (`planDisplay.js:63-75`) as
  `"{plan name} · Day {i+1} of {routine count}"` — a position in the
  plan's workout rotation.
- `HomeScreen.js:1887` renders `"Week 1 of 6 - stop 3 short of failure"` —
  a position in the six-week block.

Neither carries a noun explaining which whole it counts. A first-time user
can reasonably read "Day 1 of 2" as "this plan is two days long" and
"Week 1 of 6" as "this plan is six weeks long", which are two different
mental models of the same plan. The block chip is tappable and explains
itself; the eyebrow is not and does not.

Worth a lead ruling: the cheapest fix is a noun on the block chip
("Block week 1 of 6"), which also helps C5-P11-02. Changing the eyebrow
would touch `planDisplay.js`, whose one-convention docstring
(`planDisplay.js:1-31`) is a deliberate cross-surface contract, so that
should not be changed casually.

### C5-P12-03 — IMPROVEMENT (LOW). Three tappable cards stack above the primary CTA on Pro.

Order above the hero on Pro day 0: trial card (itself tappable, plus an
outline button, `AttentionCard.js:68-118`), `TodayStrip` (with a "Log"
button or "Logged" pill, `TodayStrip.js:152,184-190,220`), welcome card
(with a dismiss control, `HomeWelcomeCard.js:40-47`). That is three
interactive surfaces and at least two buttons before the one action the
screen wants. The free path has one. The hero itself is correctly the only
filled primary, so this is a stacking question rather than a competing-CTA
question. Recorded for the Phase 37 hierarchy lane rather than proposed
here.

### C5-P12-04 — IMPROVEMENT (LOW). "Since your check-in" presupposes a check-in.

`CoachDailyBrief.js:62` renders the fixed title "Since your check-in". On
day 0 it is saved only by an unrelated gate: `HomeScreen.js:2032` passes
`null` whenever `trialBanner` is truthy, and a brand-new Pro user always
has one. It is therefore reachable at zero history for any Pro user who is
not in `stageOf === 'pro_trial'` (`HomeScreen.js:484`) — for example a
subscriber reinstalling before their local history restores. The runway's
own rows are honest; only the title asserts a past event.
Low priority and partly hypothetical, so recorded rather than proposed.

### 4.2 Cross-lane notes

- `HomeWelcomeCard` is **not** tier-gated (`HomeScreen.js:1832`), so a free
  user reads "Your coach learns as you train … There is nothing to set
  up." This is already recorded as **C5-P1-08** in
  `CURRENT-FIRST-USE-JOURNEY.md:748-761`; not re-raised here.
- The readiness/intent sheet that follows "Start workout"
  (`HomeScreen.js:2150-2189`) is Phase 13's lane; recorded as S17 in
  `CURRENT-FIRST-USE-JOURNEY.md:536-551`.
- `noPlanJourneyCopy.guard.test.js:17-60` pins the exact no-plan strings on
  Home and Plans ("No active plan yet", "Start with a plan", "Browse
  plans"). Any Phase 12 proposal must leave those intact; nothing proposed
  above touches them.

---

## 5. Hard-bound compliance of everything proposed above

Every proposal in this file is copy, gating or a pure-function correction
inside an existing surface. None adds AI, cardio, a feature, a social or
gamification element, or an advanced control to first use. None touches
Article 9 consent, ED or wellbeing semantics (the calm/ED suppressions at
`ProSetupCompleteScreen.js:93-140`, `WorkoutSummaryScreen.js:1249`,
`ConsistencyEcho.js:55`, `coachLedger.js:83-92` are left exactly as they
are), D92-11, billing architecture or billing copy (C5-P12-01 changes a
press handler, not a word of trial copy), `ONBOARDING_QUIZ_FIRST`, or any
migration. `planEngine.js` remains a pure, deterministic module under
C5-P11-01: the change is to a narrative string, never to a prescribed
value.

---

*Phase 10/11/12 evidence file. Audit only: no source, test, configuration
or other document was modified by this lane, and nothing was committed,
pushed or stashed.*
