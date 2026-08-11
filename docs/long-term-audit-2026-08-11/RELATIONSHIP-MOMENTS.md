# Relationship moments — where long-term responsiveness has to be visible

Campaign 6, founder addendum lane "RELATIONSHIP MOMENT AUDIT". Audit only.
Nothing in `src/`, no test and no other document was modified to produce
this file.

**Authority.** The founder's Campaign 6 addendum, verbatim
(`c6-ADDENDUM-PERSONALISATION-DIVIDEND.txt:110-117`):

> RELATIONSHIP MOMENTS: RELATIONSHIP-MOMENTS.md - classify existing
> surfaces A communicates-well / B has-data-fails-to-communicate /
> C overclaims / D does-not-need-it. Handful of high-value moments, no
> saturation ("Only call attention to personalisation when it changes a
> decision, explains a meaningful non-change, demonstrates accumulated
> learning, or resolves likely confusion").
>
> PERSONALISATION SATURATION restraint rule as above.

Binding also: NON-CHANGE IS PERSONAL (`:57-60`), EVIDENCE AGE tiers
(`:97-99`), SHOW ME WHY with no internals exposed (`:38-41`), and the
banned-copy lists (`:15-23`) — no anthropomorphic language, no invented
percentages, no guaranteed-outcome claims, no manipulative retention. No
copy proposed anywhere in this file breaches those lists; where a fix is
sketched it is a wiring sketch, not approved copy.

**Restraint applied up front.** This file classifies twenty surfaces and
recommends **three** for work. The list of surfaces that should explicitly
**not** gain personalisation language is in Part 4 and is longer than the
recommendation list, deliberately.

---

## The classification, at a glance

| Class | Count | Meaning |
|---|---|---|
| **A** communicates personal history well | 12 | The data reaches copy, the claim matches what the code did, and the moment earns the attention |
| **B** has the data but fails to communicate it | 6 | The value exists and is computed; it dies before any string is built |
| **C** overclaims | 0 | See Part 3 — this is a real finding, not an omission |
| **D** does not need personalisation language | 2 | Adding it would be saturation |

---

## PART 1 — CLASS A: surfaces that already communicate personal history well

### A1 — Block-start explanation (HomeScreen seed lines → `blockExplain`)

`src/screens/HomeScreen.js:1184-1248` builds the lines;
`src/lib/blockExplain.js:186-240` composes them; they render in the block
sheet at `src/components/HomeBlockShapeSheet.js:65-68`.

Why it is A. The summary derives from the **written**
`planned_muscle_volume` rows, never from the seed map that was merely
requested (`blockExplain.js:8-12,102-133`), so a skipped insert cannot be
narrated as applied. Only the three personalised sources earn a claim, and
each has its own clause (`:69-73`). A mixed block names its research
remainder rather than letting three confident lines read as "all of this is
personalised" (`:139-140,235-237`). Retention is stated as a decision
rather than left silent (`:155-157`, "kept where it was"), the lines are
ordered by what actually **moved** rather than by which numbers are largest
(`:209-218`), and the three-line cap says how much it hid (`:229-233`).
`awaitingDecision` blocks the present-tense narration entirely
(`HomeScreen.js:1192-1194`).

Provenance that reaches copy here: the seed **source** per muscle, the
previous block's `observed.startSets` / `observed.plannedPeak`, and the
peak week. Provenance that exists and does **not** reach copy here:
`upwardCarryPrevented` and the stale-evidence marker — see B2 and B3.

One caveat recorded, not proposed as work: the whole explanation lives
inside a bottom sheet opened from the meso chip, so a user who never taps
the chip never reads it. That is a discoverability question for the founder,
not a copy defect, and surfacing it more prominently would run straight into
the saturation rule.

### A2 — Block-decision card ledger story (PlansScreen)

`src/screens/PlansScreen.js:270-296` (load) and `:944-981` (render).

Why it is A. Each row is the ledger entry's own **delta-composed** rationale
rendered verbatim (`blockExplain.js:252-264`), and the rationale was
composed from the final clamped numbers so the words cannot contradict the
proposal (`src/lib/interBlock.js:206-224`). The card now shows the rows
whatever the advisor favours, which closed the FB-19 defect where a block
that went **well** was the one case the app threw its own ledger away
(`PlansScreen.js:256-269`). A framing line keeps the forward claims honest
now that both buttons are on the card (`:968-974`), and the
all-INSUFFICIENT_DATA case gets its own honest sentence rather than
describing a difference that does not exist (`:970-971`, computed over
**every** entry at `:289-290`, not the sliced four). The longer-recovery
proposal renders as the user's call (`blockExplain.js:357-360`).

### A3 — The FB-24 next-block receipt (PlansScreen)

`src/lib/blockExplain.js:285-350`, rendered at
`src/screens/PlansScreen.js:1519-1565`, composed at `:411-426`.

Why it is A, and why it is the single best relationship moment in the app.
It is the one place the product says, in one screen, *what changed, by how
much, from what, and why* at the moment the change is written. It is
composed from data already in hand (the resolved ranges plus the finished
block's stored ledger, captured before the reload clears it), so it claims
nothing the write did not do (`:411-418`). Crucially it handles the
non-change taxonomy properly:

- a judged hold reads "Keeping a dose that worked is a decision too"
  (`blockExplain.js:334-336`);
- an **unjudged** hold gets a different sentence naming the reason —
  "this block did not log enough recovery feedback to judge it, so nothing
  was moved on a guess" (`:338-339`) — which is exactly the addendum's
  distinction between unchanged-because-working and
  insufficient-evidence, and it is live, not aspirational;
- a mixed receipt states both (`:329-341`);
- a muscle with no judged block behind it is skipped rather than being
  given a fabricated comparison (`:302-304`).

So of the six non-change states the addendum names, **two** already reach
copy here with distinct wording (working, insufficient-evidence), one
reaches copy at the coach (user-choice, A6), and one is computed but silent
(safety-suppressed — B2).

### A4 — Block-completion story (BlockReflectionScreen)

`src/screens/BlockReflectionScreen.js:145-171` (load, with compute-if-absent
from D97-11) and `:312-324` (render, under the heading "What this block
showed").

Why it is A. Same verbatim-rationale discipline as A2, on the analytic
screen, and now reachable for a block the user switched away from — five
weeks of real evidence that used to be permanently unread
(`D97-RULINGS.md`, D97-11). The screen is also reachable **at** the
decision it informs, via the button at `PlansScreen.js:990-1000`, which
closed the window where the one screen answering "what did this block show"
was reachable only after the decision had been made.

### A5 — Coach output five-part response (`coachResponse` / `coachRegister`)

`src/lib/coachResponse.js:434-500` (builder), `src/lib/coachRegister.js:283-320`
(register selection), rendered at `src/screens/CoachOutputScreen.js:2357`,
`:2581-2600`, `:2905-2912`.

Why it is A. Every part is a mirror of logged data, enforced by a
dev-time jargon and dash guard on every exported string
(`coachResponse.js:40-53`). Acknowledgement names something real from this
week or returns null rather than fabricating (`:66-80`). The cold-start path
**shrinks** the response rather than inventing a trend or a decision
(`:474-490`). Suppression under an ED flag or calm mode drops rate language
and weigh-in counts (`:22-27`). The register is a voice choice only: the
precise renderers mirror their supportive counterparts' branch ladders
exactly, with parity invariant tests that fail if they drift
(`coachRegister.js:89-97`) — so the user's tone choice never changes a fact
or a decision.

### A6 — Coach held-decision copy (the non-change taxonomy)

`src/lib/weeklyCoach.js:1452-1466`.

Why it is A, and why it is the strongest "NON-CHANGE IS PERSONAL"
implementation in the product. Seven distinct held reasons, each naming its
own cause: on-target trend; last adjustment needs more weeks to show;
N more weeks of the same trend needed; food not tracked so a change would be
a guess; wellbeing screen flagged restriction; cycle flagged so the weight
reading is not a reliable signal; plus the rapid-loss corrected case at
`:1437-1447`. And it refuses to stack: a generic "calories held" is never
placed under the ED lockout, because two explanations for one held decision
dilute the safety message (`:1449-1452`). Nothing here collapses to "No
changes."

### A7 — Applied receipts and the outcome scorecard

Receipt: `src/lib/coachApply.js:296-314`, preserved across remount re-saves
(`src/lib/database.js:6741-6790`), surfaced at
`src/screens/CoachOutputScreen.js:369-374,398-399,434`.
Track record: `src/lib/coachOutcome.js:39-70`, rendered at
`src/screens/CoachHeldHistoryScreen.js:167-188`.

Why it is A. This is the concrete "I told you — you listened" chain: nothing
applies without a tap (`coachApply.js:2-6`); a proposal only influences a
session once it is a **persisted applied** target for this week
(`src/lib/sessionAdjustments.js:137-149`); and the scorecard verdicts an
applied decision only against the calendar-consecutive next week, never an
array-adjacent one across a missed check-in or a reinstall
(`coachOutcome.js:50-56`). It hides below a two-week sample so a small
sample never reads as a boast or an accusation (`:13-16,28`), and it is
suppressed entirely under an ED flag or calm mode by the caller
(`CoachHeldHistoryScreen.js:133,166-168`).

### A8 — Workout prescription rationale (set targets)

`src/lib/algorithms.js:583-609`, threaded to the user at
`src/screens/ActiveWorkoutScreen.js:1348-1362,2976-2982`.

Why it is A. An explicit reason ladder, one string per branch, each stating
what the engine actually did and why. Two of the branches are honest
**holds** rather than instructions: an unknown effort holds instead of
adding (`:589-590`), and a hard session at the top of the range holds with
the reason named (`:587-588`). A bodyweight set can never receive a
micro-load instruction (FR-C4-4, `:591-594`). The anchored-set line names
the comparison it used, in the user's units (`:595-597`).

### A9 — Session adjustment receipt (in-session)

`src/screens/ActiveWorkoutScreen.js:4044-4060`, driven by
`src/lib/algorithms.js:1186-1191`.

Why it is A. Each adjustment carries a reason string and, where the signal
is a recovery one, the concrete referent beside it ("Last trained
Tuesday.", `:4051-4054`). Precedence holds are shown only after a "Sharp"
pre-session answer, so the user is not lectured about a hold they did not
ask about.

### A10 — Nutrition adjustment explanation

`src/lib/weeklyCoach.js:1055-1113`, with the plain-English direction line
from `src/lib/nutritionEngine.js:365-381` and the floor-held sentence at
`:404-406`.

Why it is A. The insight names the actual direction of the weight move
rather than the sign of the adjustment — the distinction that stops "we
raised your calories" reading as "you gained weight". The step-trend
receipt is appended as **one** sentence and only when the change was
genuinely gain-resized by an active, agreeing step trend
(`weeklyCoach.js:1104-1110`), and it rides with the adjustment so it
disappears if a senior clamp later nulls the change. Steps are never given a
kcal value and never produce, size or reverse a change
(`nutritionEngine.js:432-437`).

### A11 — Lapse and return: the win-back push

`src/lib/notifications/winbackContent.js:49-78`.

Why it is A. The user's own numbers are the message ("Still lifting. 12
sessions since March."), the offer clause is deliberately omitted, and a
zero is never shown — the no-sessions case falls back to the held-seat
framing (`:65-70`). A stated break is acknowledged rather than ignored
(`:72-75`). Cadence is bounded by design: one per episode plus an absolute
one-per-180-days floor kept across episodes
(`src/lib/payments/winbackState.js:39,64-68,155-160`). No urgency, no
discount, no shame — it passes the addendum's manipulative-retention list
cleanly.

### A12 — Lapse and return: the consistency band

`src/lib/streak.js:17,22,36-38`, `src/hooks/useWeeklyStreak.js:112-141`,
`src/components/ConsistencyEcho.js:1-15`.

Why it is A. A lapse is an absence, never a shown state: the run number
simply stops, and no shame copy exists in the module. Deload weeks keep the
run ("recovery is compliance, never a miss"). The current week is
'in-progress' and never judged. The whole echo is suppressed under an open
ED flag, a SCOFF score of 2 or more, or calm mode, and the explainer fails
closed on a read error. The manual goal is never auto-raised by a plan.

---

## PART 2 — CLASS B: the data exists and dies before it reaches copy

Six. For each: the exact value, where it is computed, and the precise line
at which it stops travelling.

### B1 — Per-muscle adapted-band provenance collapses to one whole-body boolean

**The data.** `computeAdaptiveLandmarks` produces, per muscle:
`isAdapted`, `dataPoints`, `netScore`, `bestVolume`, and a written
explanation string — "You recover well here. Target raised by N sets." /
"Recovery cost is high. Target lowered by N sets." / "Landmark based on your
response data" (`src/lib/algorithms.js:1024-1037`).
`mergeLandmarkPrecedence` additionally produces a per-muscle `source` map of
`'manual' | 'adapted' | 'research'`
(`src/lib/effectiveLandmarks.js:42-60`).

**Where it dies.** `mergeLandmarkPrecedence` copies only `mev`, `mav` and
`mrv` out of the adapted entry (`effectiveLandmarks.js:52-56`); `note`,
`dataPoints` and `netScore` are dropped on that line and no caller ever
sees them again. Of the four consumers of `getEffectiveLandmarks`, three
take `.table` and discard `.source` outright
(`src/screens/VolumeHeatmapScreen.js:212-213`,
`src/screens/AnalyticsScreen.js:219`,
`src/screens/CoachReviewScreen.js:283`). The **only** survivor anywhere is a
single any-muscle boolean inside a tooltip on the workout summary:
`Object.values(landmarkResolution.source ?? {}).includes('adapted')`
selecting between two whole-body sentences
(`src/screens/WorkoutSummaryScreen.js:1475-1477`).

**Why it matters.** The addendum names the per-muscle distinction as a core
capability: "never reduce to 'your programme is now personalised'; the
per-muscle distinction (strong/strain/none/manual/stale/suppressed) is a
core capability" (`:52-55`). Today the strongest per-muscle statement the
engine produces is computed on every read for every Pro user and thrown
away, and the volume screen — which is both the volume home **and** the
manual-override editor, the one place a user goes to ask "why is my target
this number?" — shows the resolved number with no source beside it. This is
the largest gap between what the engine knows and what the user can see.

**Wiring sketch (not built, not approved copy).** Carry `source` (and, for
adapted muscles, `dataPoints`) through to `VolumeHeatmapScreen`'s per-muscle
row and label the three states with the vocabulary that already exists in
`blockExplain.SOURCE_CLAUSE` (`blockExplain.js:69-73`), so the volume screen
and the block-start lines speak one language. No new computation, no new
query, no engine change. The `note` strings themselves should **not** be
surfaced as written — "You recover well here" is a capacity claim from a
±4-set heuristic and would need founder-approved wording before it went
anywhere near a user.

### B2 — `upwardCarryPrevented`: the safety-suppressed non-change, never spoken

**The data.** `interBlock` sets `upwardCarryPrevented = true` on a ledger
entry when, and only when, the suppression hold (calm mode or an open ED
flag) actually **bit** — i.e. the clamp genuinely reduced the start or the
peak below what the evidence proposed
(`src/lib/interBlock.js:234-245,265`). It is stored on the entry and
therefore on `mesocycles.block_ledger`, and it syncs
(`src/lib/sync.js:983`).

**Where it dies.** Nowhere reads it. A repository-wide search for the
identifier outside tests returns only its two definition sites
(`interBlock.js:185,239-244,265`). Neither `buildLedgerReflectionRows`,
`buildSeedReceipt`, `buildBlockStartLines` nor any screen consults it.

**Why it matters.** This is the **safety-suppressed** non-change state from
the addendum's list (`:57-60`), and it is the one state where silence is
actively misleading: a user in calm mode whose evidence supported more
volume is held flat, is told "kept where it was" by the receipt
(`blockExplain.js:156`) or "stayed where they were. Keeping a dose that
worked is a decision too" (`:334-336`), and has no way to learn that their
own calm-mode choice is what held it. That reads as the app ignoring
evidence rather than respecting a setting. It is also the exact inverse of
the app's usual honesty posture, where every other hold names its cause.

**Wiring sketch (not built).** The flag is already per-entry, so a receipt
row or a held-line variant can select on it with no new data. Any wording
must (a) attribute the hold to the user's own setting rather than to a
detector, (b) never name the ED-flag path distinctly from the calm path —
the two are ORed into one `suppressed` input by design
(`src/lib/blockLedgerRunner.js:78-83`) and separating them in copy would
expose detector state, which `:41` of the addendum forbids. That constraint
is the reason this is a founder copy decision and not a mechanical fix.

### B3 — The four-week stale-evidence hold is recorded and never explained

**The data.** When `weeksSinceBlockEnd >= 4`, `interBlock` suppresses the
dose-response +1 and applies the no-upward-carry hold, and it adds an
`evidence_weeks_old` marker to the entry's evidence trail
(`src/lib/interBlock.js:88,168-170,240-245,343-345`).

**Where it dies.** The evidence array is echoed into the stored ledger
(`:160-166`) and is consumed by nothing that builds a string. The rationale
composed at `:206-224` speaks from the clamped numbers and does not mention
the age of the evidence, so a returning user is told what changed but not
that the gap is why it changed less.

**Why it matters.** The addendum's EVIDENCE AGE law (`:97-99`) requires the
product to distinguish recent-repeated / recent-single-block / old / mixed /
no-recent, and never to use one confidence language for all five. Today the
app **computes** the old/recent boundary, acts on it correctly and
conservatively, and then says nothing. Note the interaction with the open
D97-3 founder question: a stored ledger computed **before** a layoff is
served as-is afterwards, so the hold does not fire on that path at all. Any
copy here must not claim a protection that the stored-ledger route bypasses,
which is why this is recorded as evidence for D97-3's triage rather than as
an independent fix.

### B4 — Nutrition target provenance is one static sentence at every horizon

**The data.** By month six a Pro user's calorie target has drifted through
many applied changes, each with its own receipt and week
(`src/lib/coachApply.js:68-107`, receipts in `coach_outputs`); the app knows
how many weeks since the last change (`lastCalAdjustmentWeeksAgo`, real
elapsed weeks, `src/screens/CoachOutputScreen.js:1677-1681`), and the
adaptive-TDEE confidence tier with its week count
(`src/lib/nutritionEngine.js:250-262,363`,
`src/lib/weightTrend.js:28-33`).

**Where it dies.** The provenance line under the calorie hero is a constant
string: "Worked out from your profile and the research, then adjusted as
your own evidence arrives."
(`src/screens/NutritionTargetsScreen.js:1023-1025`). It renders identically
on day 0 and on day 180. Nothing on that screen distinguishes a target that
is still the pure Mifflin/Katch output from one that has been moved eight
times by the user's own weight and intake data.

**Why it matters.** The addendum's NUTRITION DIVIDEND section asks exactly
this: "Day-1 profile/research vs later weight+intake-calibrated targets; the
user should understand why the target is more specific now; no formulas, no
precision from sparse data" (`:120-122`). Note the underlying architecture
fact that constrains any fix and is easy to get wrong: the stored
`nutrition_targets.tdee` never learns — `computeCalorieTargets` spreads the
row and moves only `targetKcal`, `fatG` and `carbsG`
(`src/lib/coachApply.js:79-88`). What is history-driven is the applied
**target**, not the maintenance estimate. Copy that said "your maintenance
estimate has learned from your data" would be false.

**Wiring sketch (not built).** Two variants of the existing sentence
selected on a fact the screen can already fetch — whether any calorie change
has ever been applied — with the day-0 wording unchanged. No count, no
percentage, no confidence adjective invented for the purpose.

### B5 — The layoff line knows the gap and never names it

**The data.** The layoff multiplier fires when the last set for an exercise
is more than seven days old, and the timestamp of that set is in hand
(`src/screens/ActiveWorkoutScreen.js:1339-1342`).

**Where it dies.** The reason string says "for your first session back after
a break" and gives the same flat 10% and the same words whether the break
was eight days or five years (`src/lib/algorithms.js:584-586`).

**Why it matters.** It sits directly on the addendum's LAPSE CONTINUITY law
(`:71-73`): "remembers useful history, gap changes confidence". The copy is
not dishonest — it never claims to pick up where the user left off — but it
is the one returning-user moment where the app has the number and does not
use it. **Sizing the reduction by gap length would be freshness semantics
and is out of scope (D91-25).** Naming the gap in the sentence is not. Which
of the two the founder wants is precisely the D97-3 triage question, so this
is recorded there rather than fixed here.

### B6 — The learned-band clause carries no evidence age

**The data.** `computeLearnedRange` has no clock, no `now` and no age input
at all (`src/lib/learnedRange.js:88-94`); it folds every qualifying entry in
the chain with equal standing. The block end dates that would tier it are on
the mesocycle rows and are already read by the block-start builder's
`previous` lookup (`src/screens/HomeScreen.js:1217-1233`).

**Where it dies.** The clause is a constant: `seed_learned` renders as "set
by what past blocks have shown" (`src/lib/blockExplain.js:71`), whether the
last qualifying block ended six weeks ago or two years ago. The maturity
model already flagged this for Phase 7
(`PERSONALISATION-MATURITY.md`, entry 2, "that clause carries no age
qualifier, and the underlying value has no age bound").

**Why it matters, and why it is B not C.** The clause is literally true at
any age, so it does not overclaim — but it is one confidence language for
all five evidence-age tiers, which the addendum forbids. Note that
`seed_learned` is also the rung a long-lapsed user falls through to, because
an abandoned block classifies INSUFFICIENT_DATA and `resolveSeedRange`
treats that as no-valid-ledger (`D97-RULINGS.md`, D97-3 addendum). So the
one path with no staleness guard is also the path a returning user is most
likely to take. Recorded as evidence for D97-3; nothing proposed here.

---

## PART 3 — CLASS C: overclaiming. None found, and why that is the honest answer

I looked specifically for surfaces that claim more personalisation than the
code delivers, and found none surviving in the surfaces in scope. That is
not an absence of effort; it is the result of two earlier ruling batches
having already removed the ones that existed:

- **D97-16 / P9-06.** `RESEARCH_START_LINE` told a block-eight user "Not
  enough personal history yet" after a plan switch — a plainly false claim
  about a mature user. It now branches on `hadPriorBlocks` to a variant
  that makes the same honest research claim without denying the history
  exists (`src/lib/blockExplain.js:78-89`,
  `src/screens/HomeScreen.js:1236-1246`).
- **D97-1.** Two recency claims that rested on row counts rather than dated
  windows ("your recent average" from the last 8 check-in rows at any age;
  "your recent weight trend" from the last weigh-in at any age) were
  rewritten to state what the values actually are.

The nearest live C-risk, recorded so it is watched rather than ruled: the
nutrition provenance sentence (B4) ends "then adjusted as your own evidence
arrives", which is a forward promise on a screen a Pro user can reach on day
0 with no weight data at all, and the adjustment path needs fourteen morning
weights before it runs (`src/lib/weeklyCoach.js:975`). It is a promise about
the system's standing behaviour rather than a claim about this user, so it
is not a C today — but if B4 is ever worked, the fix must not turn it into
one.

Two things I checked and cleared rather than assumed:

- The "Automatic" coaching-tone description, "The coach matches its wording
  to your training experience" (`SettingsCoachingScreen.js:189`), is true:
  `resolveRegister` reads `experienceLevel`, then `trainingAgeYears`
  (`src/lib/coachRegister.js:80-88`).
- The readiness-off description, "your next block's set targets stay where
  they are" (`SettingsCoachingScreen.js:166`), is true: the ledger's
  recovery-data gate requires four recovery data points
  (`src/lib/interBlock.js:83,292`) and those come from the session answers.

---

## PART 4 — CLASS D, and the surfaces that should NOT gain personalisation copy

### D1 — Progress and Analytics summaries

`src/hooks/useProgressData.js:523-534`, consumed by the Progress and
Analytics screens.

Classified D. The charts **are** the personal history: weekly volume, PR
bars, duration bars, muscle frequency, block progress, the records wall.
They already gate themselves honestly — `hasData` hides the always-on chart
sections so a new user never sees "No data yet" on a wall of zeros
(`:512-514`), and `enoughForTrends` holds the multi-session charts back
until three sessions exist (`:515-521`). The PR tile now mirrors the live
detector's gates including the FQ-7 first-exposure baseline (D97-18), and
the records wall reads all completed history rather than a 200-row window.
Narrative copy on top of a chart of the user's own data is the textbook
saturation case. **No personalisation language should be added here.**

### D2 — The `insightsEngine` "For You" cards

`src/lib/insightsEngine.js:100-227`.

Classified D — already at the right level, needing nothing added. Every card
names a real referent: a muscle and a three-week window, an exercise and a
session count, a step count over 21 days. The jargon rule is enforced at the
module level (`:9-10`), and the deload card explicitly frames a lighter week
as part of the plan rather than a setback (`:219-222`). The one card closest
to filler, `gentle_rhythm`, still states a real number
(`:221-226`). Dismissals carry a defined 14-day non-resurrection window
(`src/lib/database.js:4765-4773`). Leave it alone.

### Surfaces that should explicitly NOT gain personalisation copy

Named, per the restraint rule, so a later lane does not "improve" them:

1. **Every Progress and Analytics chart** (D1). The data is the message.
2. **The "For You" insight cards** (D2). Already specific; more would be noise.
3. **The exercise library, plan library and plan detail screens.** Browsing
   surfaces. A personalisation claim on a plan the user has not run would be
   a claim with no evidence behind it.
4. **The food diary and barcode flows.** Logging surfaces. The place to
   explain a target is the targets screen (B4), once, not on every entry.
5. **The workout summary volume tooltip**
   (`WorkoutSummaryScreen.js:1468-1478`). It already carries the one
   whole-body sentence; the per-muscle fix belongs on the volume screen
   (B1), not by expanding a tooltip.
6. **The rest timer, set logging rows and the active-session chrome.**
   Mid-set is the wrong moment for any narrative; the one line that belongs
   there (the target reason, A8) is already there.
7. **Notifications generally.** The one push that legitimately speaks about
   the user's history is the win-back (A11), and its cadence is
   hard-bounded. Adding history language to training reminders or check-in
   reminders would convert a utility push into a retention mechanic, which
   the addendum bans outright (`:15-18`).
8. **The streak strip and ConsistencyEcho** (A12). Its correctness is its
   restraint. Any addition risks the streak-anxiety pattern on the banned
   list.
9. **Onboarding and first-use screens.** By definition there is no history.
   The mature/first-use split already handled by `hadPriorBlocks` is the
   right and only distinction needed.
10. **The upgrade and subscription surfaces.** The addendum permits an
    upgrade path to use legitimate history but forbids implying "we've been
    coaching you all along" (`:80-83`). The safest posture on a commercial
    surface is to add nothing.

---

## PART 5 — The recommendation: three moments, in priority order

Smallest set that changes what the user can see, ordered by value per unit
of change. None of these is built; each is a candidate for the Phase 57
triage.

1. **B1 — per-muscle provenance on the volume screen.** Highest value. It
   converts the app's core per-muscle capability from invisible to visible
   at the one screen where the question is asked, reuses vocabulary that
   already exists, and requires no engine change, no query and no
   migration. It also improves the manual-override story: a user editing a
   target can see which muscles the app had already adapted.
2. **B2 — name the safety-suppressed hold.** Highest *trust* value. It is
   the only non-change state where the current silence is misleading rather
   than merely quiet, and the flag is already computed, stored and synced.
   It needs a founder copy ruling because of the calm/ED-flag merge
   constraint, so it should go to the founder as a question, not as a fix.
3. **B4 — distinguish a day-0 nutrition target from a calibrated one.**
   Directly answers the addendum's NUTRITION DIVIDEND question, is two
   variants of one existing sentence, and must be written against the
   architecture fact that the applied target learns while the stored
   maintenance estimate does not.

**Deliberately not recommended for work now:** B3, B5 and B6. All three are
evidence-age questions whose honest resolution touches the D91-25 boundary
or the open D97-3 stored-ledger asymmetry. They are recorded here as
evidence for that founder triage, and acting on any of them ahead of the
ruling would be exactly the freshness semantics the campaign defers.

---

## Appendix — six-block report provenance: what reaches copy and what does not

Cross-reference for `SIX-BLOCK-SIMULATION.md`'s relationship section.

| Provenance value | Computed at | Reaches user copy? |
|---|---|---|
| Seed source per muscle (`seed_ledger` / `seed_learned` / `seed_manual`) | `src/lib/database.js:4202` from `src/lib/blockSeed.js:52-173` | **Yes** — `blockExplain.js:69-73`, block-start lines |
| Research/profile seed sources | same | **Yes** — the not-personalised-yet line and its mature variant, `blockExplain.js:74-89` |
| Mixed-block research remainder | `blockExplain.js:234-237` | **Yes** |
| Previous block's `observed.startSets` / `plannedPeak` | ledger entry, `interBlock.js` | **Yes** — the movement suffixes, `blockExplain.js:142-166` |
| Ledger classification rationale | `interBlock.js:206-224` | **Yes**, verbatim, in three places (A2, A3, A4) |
| `heldUnjudged` (insufficient-evidence hold) | `blockExplain.js:294,308` | **Yes** — its own sentence, `:338-339` |
| `held` / `heldJudged` (working hold) | `blockExplain.js:306,329` | **Yes** — `:334-336` |
| `proposedRecoveryDays === 10` | ledger | **Yes** — `blockExplain.js:357-360`, as the user's call |
| Applied training delta + muscles changed | `coachApply.js:302-314` | **Yes** — `buildRampPositionLine`, `blockExplain.js:395-408` |
| **`upwardCarryPrevented`** (safety-suppressed hold) | `interBlock.js:244` | **No** — B2 |
| **`evidence_weeks_old`** (four-week stale hold) | `interBlock.js:168-170` | **No** — B3 |
| **Adapted-band `note`, `dataPoints`, `netScore`** | `algorithms.js:1024-1037` | **No** — dropped at `effectiveLandmarks.js:52-56` — B1 |
| **Per-muscle landmark `source` map** | `effectiveLandmarks.js:42-60` | **Almost never** — one any-muscle boolean in one tooltip, `WorkoutSummaryScreen.js:1475` — B1 |
| **`seedOutcome` (Repeat vs Adjust intent)** | `blockLedgerRunner.js:438` | **No**, and correctly so — see `CHOICE-MEMORY.md` F10 |
