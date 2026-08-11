# AUDIT: personalisation copy maturity, non-change as a mature decision, and the six-month Free / Pro experience

Campaign 6, phases **45, 46, 48, 49**. Audit only. Nothing in `src/`, no
test and no other document was modified to produce this file. Findings are
characterised, never fixed: the lead rules and implements.

---

## Header: authority and method

**Authority.** The founder's Campaign 6 order, phases 45, 46, 48 and 49,
verbatim as dispatched:

> **PHASE 45 - PERSONALISATION COPY MATURITY.** Audit the language
> difference between: BLOCK 1; BLOCK 2; BLOCK 5; RETURN AFTER 6 MONTHS. The
> app should increasingly be able to say "this reflects your training" when
> evidence genuinely supports it. But it should not become more boastful.
> Never say: optimal; perfected; we've figured you out. Prefer: based on
> your recent blocks; this workload has been working; there wasn't enough
> recent evidence to change this - where true.
>
> **PHASE 46 - NON-CHANGE AS A MATURE DECISION.** After several months,
> users may interpret "same sets again" as the app doing nothing. Audit
> mature-user explanations for: retain successful dose; hold because
> evidence insufficient; hold because strain; hold because manual override;
> hold because safety; hold because plateau -> stimulus-change proposal.
> These are distinct states. They must not collapse to generic "No change."
> For EACH of the six states: prove it is REACHABLE (which code path
> produces it), and quote the EXACT user-facing line it produces, with
> file:line.
>
> **PHASE 48 - LONG-TERM FREE EXPERIENCE.** Simulate a Free user for six
> months. Ensure: core training remains coherent; plans/logging/progress
> work; no coaching leakage; no adaptive block adjustment leakage; Pro-only
> card doesn't masquerade as broken functionality; repeated upsells do not
> overwhelm normal training. Do not add Free coaching.
>
> **PHASE 49 - LONG-TERM PRO EXPERIENCE.** Simulate Pro for six months. The
> product should feel like ONE system: TRAIN -> FEEDBACK -> WEEKLY COACH ->
> RECOVERY -> BLOCK LEARNING -> NEXT BLOCK -> NUTRITION ADJUSTMENT ->
> PROGRESS. Not seven unrelated dashboards. Audit cross-feature coherence.

**Binding copy laws (the addendum), applied throughout.** Never
optimal / perfected / figured-you-out; no anthropomorphism; no manipulative
retention; no fake percentages; specificity never flattery; SHOW ME WHY =
consequences never internals (never expose MEV/MAV/MRV names, classifier
names, thresholds); evidence-age language tiers (recent-repeated /
recent-single-block / old / mixed / no-recent must not share one confidence
voice).

**Hard bounds respected.** Every Section 2 inviolable. FREE HAS NO COACHING
(P-6 / D97-20 closed a learned-band leak into Free's Repeat; its current
state is verified in M-15 and M-19). No copy in this file is approved copy:
where a direction is sketched it is a wiring sketch for the lead, not a
string to ship.

**Context read first, in full.** `CAMPAIGN6-COMPLIANCE-LEDGER.md`,
`D97-RULINGS.md` (all rulings D97-1 to D97-23 including the D97-21
correction), `RELATIONSHIP-MOMENTS.md` (A/B/C/D classification, B1/B4
implementation candidates, B2 founder-gated), `src/lib/blockExplain.js`,
`src/lib/blockAdvisor.js`, `src/lib/interBlock.js`, `src/lib/blockSeed.js`,
`src/lib/blockLedgerRunner.js`, `src/lib/learnedRange.js`,
`src/lib/coachingGoals.js`, `src/lib/weeklyCoach.js` (held-decision block),
`src/lib/coachResponse.js`, `src/lib/differentialPaywall.js`,
`src/lib/proGate.js`, `src/components/ProGate.js`,
`src/components/AttentionCard.js`, `src/components/HomeProTeaserCard.js`,
`src/screens/PlansScreen.js`, `src/screens/HomeScreen.js`,
`src/screens/CoachOutputScreen.js`, `src/screens/BlockReflectionScreen.js`,
`src/screens/DiaryScreen.js`, `src/screens/WorkoutSummaryScreen.js`,
`src/navigation/RootNavigator.js`, `src/lib/notifications/budget.js`.

**Method.**

1. **The real modules were driven, not read.** Two scratch Jest probes ran
   `blockExplain`, `interBlock`, `blockSeed`, `learnedRange` and
   `blockAdvisor.getBlockAdvice` (with only `./database` mocked) to produce
   the ACTUAL strings a block-1 / block-2 / block-5 / six-month-return user
   reads. Every quoted line below is probe output or a direct source quote,
   never a paraphrase. Probes lived in the session scratchpad; nothing was
   written into the repository.
2. **Reachability was proved by construction plus brute force.** For the
   phase-46 states each classifier branch was driven to its exact rationale.
   For the safety hold a 480-case grid was swept to measure how often the
   suppression actually changes the proposal versus how often its own
   provenance flag records that it did.
3. **Surfaces were walked by code path**, not by screenshot: screen gates,
   card visibility conditions, route guards, upsell trigger conditions and
   the banner priority list, each cited with file:line.
4. **Baseline.** The characterisation was taken against a green tree.
   `blockExplain.stage8`, `interBlock.stage2`, `blockSeed.stage6`,
   `campaign6.relationship`, `campaign6.longTerm`, `campaign6.sixBlock`:
   **6 suites passed, 183 tests passed**, at the audited commit.

---

## PHASE 45: the block-language comparison table

All four columns are real probe output from
`buildBlockStartLines` / `summariseSeededPlan` (`src/lib/blockExplain.js`)
and `getBlockAdvice` (`src/lib/blockAdvisor.js`), with the seed sources a
user genuinely reaches at that horizon.

### 45.1 The block-start explanation (Home meso chip, `HomeBlockShapeSheet`)

| Horizon | Seed state driven | EXACT lines produced |
|---|---|---|
| **BLOCK 1** | every muscle `seed_research` or `template`; `hadPriorBlocks:false` | "Not enough personal history yet, so this block starts from research-based guidance. As blocks finish, each muscle's starting point comes from how it actually responded." (`blockExplain.js:78-79`) |
| **BLOCK 2** | chest/back `seed_ledger`, quads `seed_research`, previous block known | "Chest: 13 sets in week 1, building to 18 by week 5, then a recovery week (**set by how your last block went**, up from 12 in week 1)." / "Back: 12 sets in week 1, building to 20 by week 5, then a recovery week (**set by how your last block went**, kept where it was)." / "The rest still start from research-based guidance, until they have a block behind them." (`:69-72`, `:156`, `:140`) |
| **BLOCK 5** | chest/hamstrings `seed_ledger`, back/shoulders `seed_learned`, quads `seed_manual`, 5 muscles so the 3-line cap bites | "Hamstrings: 10 sets in week 1, building to 16 by week 5, then a recovery week (**set by how your last block went**, down from 12 in week 1)." / "Chest: 15 sets in week 1, building to 20 by week 5, then a recovery week (**set by how your last block went**, up from 14 in week 1)." / "Back: 14 sets in week 1, building to 22 by week 5, then a recovery week (**set by what past blocks have shown**, kept where it was)." / "Plus 2 more muscle groups, **set the same way**." (`:219-231`) |
| **RETURN AFTER 6 MONTHS**, template rebuild path | all `template`, `hadPriorBlocks:true` | "This block starts from research-based guidance for this plan. Your block history picks up again as its blocks finish." (`:86-87`, D97-16) |
| **RETURN AFTER 6 MONTHS**, learned-band path (the rung a lapsed user falls to, D97-3 addendum) | `seed_learned` | "Chest: 12 sets in week 1, building to 19 by week 5, then a recovery week (**set by what past blocks have shown**)." (`:71`, `:225`) |
| **RETURN AFTER 6 MONTHS**, mature summary with no `previous` map | mixed `seed_ledger` / `seed_learned` / `seed_manual` | "Back: 14 sets in week 1, ... (set by what past blocks have shown)." / "Chest: ... (set by how your last block went)." / "Quads: ... (your own setting)." **All movement suffixes and the move-ordering are gone.** (`:210-217`) |

### 45.2 The block-decision card (`blockAdvisor.getBlockAdvice`)

| Horizon | Tier | EXACT headline + body |
|---|---|---|
| Block finished, on time | Free | "Block finished" / "You've finished this block, recovery week included. The next step is choosing your next block." + nextBlock "Your next block" / "You can run this plan again whenever you are ready. Same workouts, same set targets as last time." (`blockAdvisor.js:460-476`, `:261-270`) |
| Block finished, on time | Pro | same top copy + "Go again: same plan" / "Pick up where you left off. Same exercises, same structure. You'll come back a little stronger each block." (`:281-295`) |
| Return after 6 months (22 weeks overdue) | Free | "Recovery week passed 22 weeks ago" / "Your recovery week has been and gone. Whenever you're ready, the next step is choosing your next block." (`:460-473`, R-5 / D97-22) |
| Return after 6 months | Pro | same top copy + "Same plan, slightly adjusted" / "The structure is working. Your next block starts from what this block showed, muscle by muscle." (`:302-313`) |
| Recovery week, no recent training | any | "Recovery week on the calendar" / "This block's recovery week has arrived, but you haven't trained recently, so there's nothing to recover from yet. Pick up wherever suits you: ease back in with lighter sessions, and the next-block choice opens when this week ends." (`:435-442`, R-4 / D97-22) |

### 45.3 What the table proves

**Boastfulness: CLEAN.** No horizon introduces a stronger claim. `optimal`,
`perfected` and `we've figured` appear nowhere in user-facing copy (a
repository walker over `screens/`, `components/` and `lib/` confirms it, and
it is already pinned at `src/__tests__/campaign6.longTerm.test.js:128-163`).
The six-month-return copy is the **most** restrained of the four columns:
D97-16 removed the false "not enough personal history yet" for mature users,
R-5 removed the unsupportable "Your body's ready" readiness claim, and R-4
removed the unearned live recovery week. The founder's "never say" list is
satisfied and guarded.

**Maturity gradation: ABSENT.** The provenance clause is a frozen three-entry
constant:

```
const SOURCE_CLAUSE = Object.freeze({
  seed_ledger:  'set by how your last block went',
  seed_learned: 'set by what past blocks have shown',
  seed_manual:  'your own setting',
});                                        // blockExplain.js:68-72
```

Block 2 and block 20 receive the **byte-identical** clause. The only maturity
input anywhere in block-start copy is `hadPriorBlocks`
(`blockExplain.js:186,205`), a boolean that branches exactly one line, the
not-personalised-yet line. The founder's preferred vocabulary ("based on your
recent blocks", "this workload has been working", "there wasn't enough recent
evidence to change this") has no code path that could select it, because
nothing about evidence depth or evidence age reaches the copy layer. The
material exists and is thrown away: `computeLearnedRange` returns
`evidenceBlocks` (`learnedRange.js:151,183`) and no consumer reads it.

This is the phase-45 headline, and it is an IMPROVEMENT rather than a defect:
the app is honest at every horizon, and simply cannot yet say "this reflects
your training" with any more warrant at month six than at week seven.

---

## PHASE 46: the six-state non-change reachability table

Each row states the code path that produces the state, whether it is
reachable, and the EXACT user-facing line, with file:line. "Rationale layer"
means the string rendered verbatim by `buildLedgerReflectionRows`
(`blockExplain.js:252-263`) on the PlansScreen decision card
(`PlansScreen.js:944-983`, Pro only) and on BlockReflectionScreen
(`BlockReflectionScreen.js:311-323`). "Receipt layer" means
`buildSeedReceipt` (`blockExplain.js:285-350`) rendered at
`PlansScreen.js:1519-1565` after a "Continue with adjustments" confirm.

| # | State | Reachable? | Code path | EXACT line, rationale layer | Receipt layer |
|---|---|---|---|---|---|
| **1** | **Retain successful dose** | **YES** | `classifyMuscleBlock` RESPONSIVE with `earned === false` (no `doseResponse` pair, or composite confidence below floor): `interBlock.js:334-357` | "Chest **responded well at this dose**, so the starting volume carries over unchanged." (`interBlock.js:357` + `:221`) | "1 other muscle group stayed where it was. **Keeping a dose that worked is a decision too.**" (`blockExplain.js:336`) |
| **2** | **Hold because evidence insufficient** | **YES, five branches, only three are holds** | `interBlock.js:282-306` | adherence: "Chest was logged for about 40% of its planned sets this block, **too little to judge the response**, so the next block starts 2 sets lower." (`:285`) · exposure: "Chest was **trained too rarely this block to judge the response**, so the next block starts 2 sets lower." (`:290`) · recovery data: "**No recovery information was logged for chest this block**, so the starting volume carries over unchanged." (`:295`) · discontinuity: "**An exercise change broke the strength comparison for chest this block**, so the starting volume carries over unchanged." (`:300`) · confidence: "**The strength picture for chest was too unsettled this block to judge**, so the starting volume carries over unchanged." (`:305`) | "1 other muscle group stayed where it was: **this block did not log enough recovery feedback to judge it, so nothing was moved on a guess.**" (`blockExplain.js:339`, RA-2) |
| **3** | **Hold because strain** | **YES** | `classifyMuscleBlock` OVERREACHED (recovery cost weight >= 2 with performance up), start holds at `previousStart`: `interBlock.js:320-332` | "Chest **progressed, but the recovery cost ran high late in the block**, so the starting volume carries over unchanged and the peak comes down." (`:331` + `:221-222`) · mid-block flag variant: "Chest progressed, but the **recovery flag fired early in the block**..." (`:330`) | collapses into the `held` count and the state-1 sentence |
| **4** | **Hold because manual override** | **YES at the rationale layer, COLLAPSES at the receipt** | `deferredToManual` true when `isManualEdit` proves a real edit: `interBlock.js:140,215-217` | "Chest responded well and kept progressing in the higher-volume weeks with recovery to spare. **Your manual volume settings stay as they are; this is a note, not a change.**" (`:216`) | **wrong**: counted as `held` and described as "Keeping a dose that worked is a decision too" (`blockExplain.js:336`). No manual branch exists in `buildSeedReceipt`. |
| **5** | **Hold because safety** | **NO USER-FACING LINE ANYWHERE** | suppression (calm mode OR open ED flag, ORed by `blockLedgerRunner.js:78-83`) blocks the RESPONSIVE `+1` at `interBlock.js:343-345` and applies the hold cap at `:240-245` | **none.** The rationale silently degrades to state 1's line: "Chest **responded well at this dose**, so the starting volume carries over unchanged." | **none.** Renders as state 1. |
| **6** | **Hold because plateau -> stimulus-change proposal** | **YES as a sentence, NOT as a proposal** | `classifyMuscleBlock` STALE with `entrenched` (`priorFlatBlocks >= 1` or performance down): `interBlock.js:363-370` | "Chest **has not moved for two blocks running with recovery fine, and a change of stimulus is proposed rather than more volume**, so the starting volume carries over unchanged." (`:369`) · decline variant: "Chest **slipped despite good recovery**, and a change of stimulus is proposed rather than more volume..." (`:367`) · first flat block: "Chest **held steady this block with recovery fine**, so the starting volume carries over unchanged." (`:370`) | collapses into the `held` count and the state-1 sentence |

**Verdict on the six states.** Four of six (1, 2, 3, 6) are reachable and
distinctly worded at the rationale layer, which is genuinely strong work and
nothing there collapses to "No change". State 4 is distinctly worded at the
rationale layer but is mis-attributed at the receipt. State 5 has no line at
any layer and is actively mis-attributed to state 1. The receipt layer, which
is the surface a Pro user sees at the moment of the write, distinguishes only
two of the six (judged hold vs unjudged hold).

### 46.1 The safety-hold collapse, measured

Probe result, `classifyMuscleBlock` with identical inputs, RESPONSIVE with a
full dose-response pair:

```
unsuppressed : proposal {start:13, peak:18}  ucp:false
               "Chest responded well and kept progressing in the higher-volume
                weeks with recovery to spare, so the next block starts 1 set higher."
SUPPRESSED   : proposal {start:12, peak:16}  ucp:false
               "Chest responded well at this dose, so the starting volume
                carries over unchanged."
```

The proposal genuinely changed, the sentence genuinely changed, and
`upwardCarryPrevented` reports **false**. A 480-case grid sweep over
`{effective mev} x {research mev} x {previousStart} x {performance slope} x
{dose-response pair}` gives:

- **230 / 480** suppressed cases where the proposal differs from the
  unsuppressed proposal;
- **180 / 480** cases where `upwardCarryPrevented` is true.

The gap is structural, not incidental: `upwardCarryPrevented` is computed at
`interBlock.js:239-244` from whether the **hold cap** pulled a number down,
but the RESPONSIVE branch's `earned` gate at `:343-345` already zeroed the
climb before `finish()` ever ran, so the flagship safety case never reaches
the clamp that sets the flag. `upwardCarryPrevented` fires only in the
narrower family where `clampInt` had raised the start to an adapted MEV above
`previousStart` (probe case B: adapted mev 14, previousStart 11, research mev
10, suppressed, gives `ucp:true` and start 11).

This is a material extension of `RELATIONSHIP-MOMENTS.md` B2 and D97-19. B2
recorded that the flag is never spoken and made the wording a founder
question. The new fact is that **the flag would not fire on the case that
matters even if the wording were ruled in tomorrow.**

### 46.2 The weekly grain: where "No change" actually appears

Phase 46's premise is a user reading "same sets again". At the **block** grain
the taxonomy is good. At the **weekly** grain, which a Pro user meets roughly
26 times in six months against 4 or 5 block transitions, the training hold is
one generic string per training goal:

```
if (trainingSignal === 'hold') {
  const holdNotes = {
    general:      'Performance and recovery need to stabilise. Hold your current plan before adding anything more.',
    bodybuilding: 'No changes needed. Stay with current volume across all groups.',
    womens_bodybuilding: 'No changes needed. Hold your current volume across every group.',
    ...
  };                                            // coachingGoals.js:638-651
```

Two of the nine variants are the literal words the founder's phase-46 order
bans. Every weekly hold cause reaches this one line: a stabilising
performance/recovery grade, the peak-week context adjustment
(`weeklyCoach.js:916-919`), persistent poor recovery, and the D16 autonomy
hold. Only two weekly holds explain themselves: the deload note
(`coachingGoals.js:615-617`) and the safety hold note, which is prepended
(`weeklyCoach.js:938-941`).

Inside the **same coach card**, the calorie hold carries seven distinct
reasons, each naming its own cause (`weeklyCoach.js:1511-1526`, plus the ED
lockout at `:1461-1467`, the FFM floor, the intake-read failure at `:1486-1490`
and the rapid-loss correction at `:1498-1505`). The asymmetry is between two
halves of one screen: nutrition non-change is exemplary, training non-change
is generic.

---

## PHASE 48: the Free six-month walk

Walked by code path: what a user who never upgrades reaches, and what reaches
them, at week 1, month 2, month 4 and month 6.

### 48.1 Core training remains coherent

| Capability | Gate | Verdict |
|---|---|---|
| Plan library, plan builder, plan detail, activation | ungated (`RootNavigator.js`, no `withProGuard`) | works |
| Workout logging, rest timer, set entry, session feedback | ungated | works |
| Exercise library, PRs, records wall | ungated; records wall reads all completed history since D97-18 / P10-1 | works |
| Progress and Analytics charts | ungated; `weightTrend` and Body Metrics Pro-badged (`AnalyticsScreen.js:108,654,669,817`) | works, honest badges |
| Block creation, block clock, recovery week, block reflection | ungated (`RootNavigator.js:551`) | works, but see M-13 |
| Next-block decision card | both options render; `adjust` is `locked:true` with a `ProBadge` and its own honest detail string (`blockAdvisor.js:196-220`, `PlansScreen.js:1030-1060`) | works |
| Food diary | `tier !== 'pro'` gives read-only (`DiaryScreen.js:134`) | states itself plainly |
| Coach output, weekly check-in, nutrition targets, meal flows, partner | `withProGuard` (`RootNavigator.js:208-249`) | hard locks with per-feature benefit copy (`ProGate.js:27-50`) |

**Pro-only cards do not masquerade as broken.** Every locked surface states
what it is and offers one way out: the `adjust` option carries "Part of Pro.
Your next block's weekly set targets start from what this block showed, muscle
by muscle." (`blockAdvisor.js:214`); the diary says "Your diary is view-only
on the free plan. Everything you logged is safe and stays yours."
(`DiaryScreen.js:1400-1401`); `withProGuard` renders a named benefit per
feature rather than one generic pitch (`ProGate.js:27-50`). D94/F1 already
fixed the one case where Free was sent to a paywall for a free feature:
"Build a new plan" routes Free to the plan library
(`PlansScreen.js:1065-1075`).

### 48.2 Coaching leakage

**Closed.** `buildNextBlockRecommendation` returns before any adaptive
narrative is composed when `isPro` is false (`blockAdvisor.js:261-270`); the
entitlement comes from the real store tier, never from check-in rows (FB-36);
`handleRestartPlan` holds a second lock so an `adjust` intent without Pro can
never seed adaptively (`PlansScreen.js:350-353`); `seedIntent` degrades to
`repeat` for Free (`PlansScreen.js:399`); the adapted landmark layer returns
null for any non-Pro tier (`effectiveLandmarks.js:117-118`); the ledger
rationale rows are gated at `PlansScreen.js:286`.

**One leak still open by construction (M-13)** and **one narrowed but not
sealed (M-15)** and **one false forward promise (M-14)**. See the findings.

**Adaptive block adjustment leakage: closed for the Repeat path, verified.**
P-6 / D97-20 made an unjudgeable ledger entry seed a repeat from the block's
own observed numbers. Probe:

```
repeat + INSUFFICIENT_DATA entry with observed numbers -> {12,16,'ledger'}   correct
repeat + NO ledger entry                               -> {14,22,'learned'}  leak shape
repeat + entry with null observed                      -> {14,22,'learned'}  leak shape
```

The two leak shapes are unreachable **today** only because
`generateInitialPlannedVolume` seeds every `VOLUME_LANDMARKS` muscle
(`database.js:3819,4257`), so `computeAndStoreBlockLedger`'s
planned-or-trained filter (`blockLedgerRunner.js:184-186`) produces an entry
for every muscle. The resolver itself does not refuse. See M-15.

### 48.3 Repeated upsells do not overwhelm normal training

**Bounded, with one gap.**

- **One banner at a time.** `BANNER_PRIORITY` at `HomeScreen.js:1631-1641`
  filters to eligible banners and takes only `[0]`. Coach > trial > deload >
  phase > plateau > activation > attention. The Free upsell surfaces sit at
  the bottom of that list by design.
- **Every upsell surface is dismissible per local week**: the free coach line
  (`HomeScreen.js:669-670,698-706`), the differential badge
  (`:893-901`), and the Pro teaser card, which FM-05 converted from the only
  permanent undismissible card on Home to the same per-week key
  (`HomeProTeaserCard.js:14-23`).
- **The differential paywall never monetises distress.** `extreme_soreness`
  and `energy_crash` were removed as triggers (`differentialPaywall.js:21-28`);
  the four remaining contexts are training and engine signals. It fires only
  on an off-target adherence pattern in 2 of 3 weeks
  (`:134-147`), is suppressed entirely and fail-closed under an open ED flag
  or calm mode (`HomeScreen.js:858-867`), and for a Free user who never logs
  food the adherence gate cannot be met at all.
- **Push is hard-capped**: `EVENT_DAILY_CAP = 2`, `EVENT_WEEKLY_CAP = 8`
  (`notifications/budget.js:34-35`), with a fixed collision priority and no
  queueing to a worse day. The win-back push is one per episode with an
  absolute 180-day floor across episodes
  (`payments/winbackState.js:39,64-68,155-160`) and carries no urgency,
  discount or shame (A11 in `RELATIONSHIP-MOMENTS.md`).
- **The gap (M-17).** `HomeProTeaserCard` renders **outside** `BANNER_PRIORITY`
  (`HomeScreen.js:2183-2189`), so in any week where the attention slot also
  wins, Home carries two Pro CTAs at once: the teaser's "... Pro tells you
  what to do next." and the free line's "Pro reads the full story."
  (`AttentionCard.js:128-155`). Both are weekly and lifetime-unbounded, so a
  six-month Free user meets roughly 26 of each with no taper.

### 48.4 Free six-month verdict

Core training, logging and progress work end to end for six months with no
degradation and no dead ends. The upsell cadence is genuinely restrained by
industry standards and is guarded by real invariants. The three problems are
narrow and specific: one screen shows Free the adaptive block narrative it
cannot act on (M-13), one tooltip promises Free a capability it will never
receive (M-14), and the Repeat path's tier safety depends on an invariant
owned by a different module (M-15).

---

## PHASE 49: the Pro one-system coherence walk

The founder's chain, node by node, with the code that carries each edge.

| Edge | Carried by | Evidence |
|---|---|---|
| **TRAIN -> FEEDBACK** | session feedback and the post-session check-in row | `ActiveWorkoutScreen` session answers -> `algorithms.js:1186-1191`; `WorkoutSummaryScreen` writes the weekly row |
| **FEEDBACK -> WEEKLY COACH** | the weekly check-in is the coach's primary input | `weeklyCoach.js:900-921`; `checkinReadiness` shared with the advisor (`blockAdvisor.js:47-75`) |
| **WEEKLY COACH is BLOCK-AWARE** | `blockWeekIndex`, `blockAccumWeeks`, `blockE1rmSlopePct` thread in from the live block | `CoachOutputScreen.js:1804-1806`; peak-week context adjustment at `weeklyCoach.js:916-919`, cause-gated and never softening a deload (`:267-285`) |
| **WEEKLY COACH -> RECOVERY** | deload flag and reduce/hold/push signal | `weeklyCoach.js:921-925`; `coachApply.computeDeloadVolume` (`coachApply.js:267`) |
| **WEEKLY COACH -> THE PLAN** | an applied volume delta writes `planned_muscle_volume` and is narrated back on Home | `coachApply.computeVolumeApply` (`coachApply.js:340`); "Week 3 of 6 in your block. The planned climb adds 3 sets next week. **This week the coach added 2 sets on top.**" (`blockExplain.js:395-405`, probe output) |
| **THE PLAN -> THE SESSION** | a proposal influences a session only once it is a persisted applied target | `sessionAdjustments.js:137-149` |
| **RECOVERY -> BLOCK LEARNING** | the ledger reads the coach's own deload weeks and check-ins, week-start aligned | `blockLedgerRunner.js:120-152` (`getDeloadSuggestedWeekStarts`, `getCheckinsInRange`), `deriveDeloadFlags` |
| **BLOCK LEARNING -> NEXT BLOCK** | ledger -> fallback chain -> written rows -> explanation, with provenance intact end to end | `blockLedgerRunner.js:397-413` -> `blockSeed.resolveSeedRange` -> `database.js:4270` (`seed_${seed.source}`) -> `blockExplain.js:68-72` |
| **BLOCK LEARNING -> MEMORY** | ledger history replays into the learned working range, one block nudging | `learnedRange.js:88-183`; the just-finished ledger is spliced into the replay view (`blockLedgerRunner.js:379-382`) |
| **NEXT BLOCK -> NUTRITION ADJUSTMENT** | **MISSING** | `nutritionEngine.js` takes no block input; `blockLedgerRunner`/`interBlock` take no nutrition input. A recovery week does not touch calories and a new block starting three sets higher does not touch the target. See M-21. |
| **-> PROGRESS** | no inbound edge from the coaching chain | no Progress or Analytics surface references the block decision, the ledger or an applied coach change. See M-24. |

**Cross-surface handoffs are real, not decorative.** When the block finishes,
the coach screen does not fail silently: it states "This block has finished,
so there is no upcoming week to change. Choose your next block on the Train
tab." and "This block has finished, so volume changes have nowhere to land
yet. Choose your next block on the Train tab first." and "This is your
recovery week, so nothing is added to it. Volume changes start again with your
next block.", with a button that navigates there
(`CoachOutputScreen.js:389,413,423,447`). The decision card links to the block
reflection at the moment of the decision (`PlansScreen.js:990-1000`, FB-15).
The diary carries a quiet receipt chip linking a changed calorie target to the
exact week's decision (`DiaryScreen.js:1416-1420`).

**Verdict.** This is one system, not seven dashboards, on seven of the nine
edges. The two weak edges are the nutrition link (a genuine missing edge in
the founder's own chain, M-21) and discoverability: the single best statement
of "this reflects your training" is inside a bottom sheet behind a chip
(M-22).

---

## Findings

Severity: HIGH / MED-HIGH / MED / LOW-MED / LOW. NEW unless a ruling is
cited.

| ID | Class | Sev | Phase | Finding | New / ruled |
|---|---|---|---|---|---|
| M-1 | IMPROVEMENT | MED | 45 | Block-start provenance clause is a frozen constant: block 2 and block 20 read identically. No evidence-depth or evidence-age tier reaches copy | NEW (extends D97-19 B6, which covered `seed_learned` age only) |
| M-2 | DEFECT | MED | 45/46 | "Plus N more muscle groups, set the same way." is false whenever the dropped muscles carry different seed sources, which is the mature mixed-source case the line exists for | NEW |
| M-3 | LATENT | MED | 45 | `evidenceBlocks`, the exact depth counter that would tier the confidence voice, is computed and never read | NEW |
| M-4 | CLEAN | - | 45 | The banned words are absent at every horizon and pinned by a repository walker; the six-month-return copy is the most restrained column | ruled: D97-16, D97-1, R-4, R-5 (D97-22) |
| M-5 | IMPROVEMENT | LOW-MED | 45 | The six-month returner silently gets the least specific variant of the block-start lines when the `previous` map is unavailable | NEW |
| M-6 | DEFECT | **HIGH** | 46 | The safety hold collapses into the retain-successful-dose voice, AND `upwardCarryPrevented` reports false on the flagship case, so the B2 fix would not fire where it matters | NEW mechanical fact; attaches to D97-19 B2 (FOUNDER-GATED wording) |
| M-7 | DEFECT | MED | 46 | The receipt's insufficient-evidence sentence hard-codes one of five causes and names the wrong reason for the discontinuity and confidence branches | NEW |
| M-8 | DEFECT | MED | 46 | The manual-override hold collapses into the retain-dose sentence on the receipt: `buildSeedReceipt` has no manual branch | NEW |
| M-9 | DEFECT | MED-HIGH | 46 | At the weekly grain the training hold is one generic string per goal, two variants of which are literally "No changes needed", while the calorie hold in the same card carries seven distinct reasons | NEW |
| M-10 | LATENT | MED | 46 | The plateau state's `stimulusChange` proposal has zero consumers: the sentence promises a proposal the app never makes | NEW |
| M-11 | CLEAN | - | 46 | States 1, 2, 3 and 6 are reachable and distinctly worded at the rationale layer; the receipt distinguishes judged from unjudged holds | ruled: RA-2 (D96), FB-27 |
| M-12 | UNCERTAIN | MED | 46 | Two of the five insufficient-evidence branches are not holds: they reset to research MEV/MAV and read as a demotion to a mature user | NEW, needs a lead ruling |
| M-13 | DEFECT | MED-HIGH | 48 | BlockReflectionScreen renders the full adaptive ledger rationales to Free with no tier gate, including forward claims Free can never receive; the same rows are Pro-gated on PlansScreen | NEW |
| M-14 | DEFECT | MED | 48 | The workout-summary volume tooltip promises Free "With enough logged sessions they adjust to your response". They never will | NEW |
| M-15 | LATENT | MED | 48 | `resolveSeedRange` still falls to the learned band for a repeat intent when the ledger entry is missing or its observed numbers are null; the P-6 closure holds only because a different module happens to seed every muscle | NEW (P-6 / D97-20 closed the reachable half) |
| M-16 | CLEAN | - | 48 | Upsell cadence is bounded: one-banner invariant, per-week dismissal everywhere, push budget 2/day and 8/week, win-back 180-day floor, distress contexts removed | ruled: FM-05, R-17 (D97-22), NOTIFICATIONS_LOCKED |
| M-17 | IMPROVEMENT | LOW-MED | 48 | Two Pro CTAs can render on Home in the same week because the teaser card sits outside `BANNER_PRIORITY`; both are weekly and lifetime-unbounded | NEW |
| M-18 | CLEAN | - | 48 | No Pro-only card masquerades as broken: every lock names itself, its benefit and one honest way out; free features never route to the paywall | ruled: D94 F1, COMP-CLARITY |
| M-19 | CLEAN | - | 48 | Free's "set by how your last block went" is TRUE: repeat seeds from the finished block's own observed numbers | ruled: P-6 (D97-20), verified by probe |
| M-20 | CLEAN | - | 49 | Seven of the nine chain edges are genuinely wired, with provenance surviving end to end from ledger to written row to copy | ruled: Stage 6/7/8, FB-24 |
| M-21 | IMPROVEMENT | MED | 49 | The founder's own chain link NEXT BLOCK -> NUTRITION ADJUSTMENT does not exist in code, in either direction | NEW |
| M-22 | IMPROVEMENT | MED | 49 | The single best "this reflects your training" surface is only reachable inside a bottom sheet behind the Home meso chip | NEW severity framing; caveat recorded in RELATIONSHIP-MOMENTS A1 |
| M-23 | CLEAN | - | 49 | Cross-surface handoffs are explicit: the coach names the block boundary and routes to the Train tab rather than failing silently | ruled: FB-15 |
| M-24 | UNCERTAIN | LOW-MED | 49 | PROGRESS has no inbound edge from the coaching chain. This may be correct restraint (D1) rather than a gap | NEW, needs a lead ruling |

**Counts.** DEFECT 7 · IMPROVEMENT 5 · LATENT 3 · CLEAN 7 · UNCERTAIN 2 ·
FOUNDER-GATED 0 new (M-6 attaches to the already-founder-gated B2).

---

## Detail per non-CLEAN finding

Direction sketches are wiring sketches for the lead. **None is applied. No
string below is approved copy.** British English, no em dashes.

### M-1 (IMPROVEMENT, MED, phase 45) - the provenance clause never matures

**Evidence.** `SOURCE_CLAUSE` is `Object.freeze` with three constant strings
(`blockExplain.js:68-72`). `buildBlockStartLines` selects on `v.source` only
(`:220`). The single maturity input, `hadPriorBlocks`, branches one line
(`:186,205`). Probe: block 2 and block 5 both render "set by how your last
block went" with no difference in confidence, depth or recency.

**Consequence at six months.** A user with five judged blocks reads the same
sentence they read after their first. The founder's preferred vocabulary
("based on your recent blocks", "this workload has been working") is
unreachable. The addendum's EVIDENCE AGE law requires five tiers not to share
one confidence voice; today they share one string.

**Direction sketch.** The two values that would tier it already exist and
travel to the same call site. `computeLearnedRange` returns `evidenceBlocks`
(`learnedRange.js:183`, M-3) and `HomeScreen.js:1210-1233` already reads the
prior mesocycle rows, so the last qualifying block's end date is in hand. A
clause selector keyed on `{ source, evidenceBlocks, weeksSinceLastQualifying }`
would let `seed_ledger` stay as it is at one block, and let `seed_learned`
distinguish repeated recent evidence from a single old block. **This is
evidence-AGE work and therefore touches the D91-25 / D97-3 boundary that
RELATIONSHIP-MOMENTS B6 deliberately routed to the founder triage.** The
DEPTH half (how many blocks, M-3) does not touch that boundary and could be
ruled independently. Recommend the lead split the two and take the depth half
now.

### M-2 (DEFECT, MED, phases 45/46) - "set the same way" is false for mature users

**Evidence.** `blockExplain.js:229-232`:

```
const dropped = ordered.length - rows.length;
if (prev && dropped > 0) {
  lines.push(`Plus ${dropped} more muscle group${dropped === 1 ? '' : 's'}, set the same way.`);
}
```

`ordered` is the personalised set across all three sources. Probe, block-5
state (chest/hamstrings `seed_ledger`, back/shoulders `seed_learned`, quads
`seed_manual`): the three shown lines already carry two different clauses, and
the line then says "Plus 2 more muscle groups, set the same way." The two
dropped are a `seed_manual` muscle (the user's own setting) and a
`seed_learned` muscle. Neither was set "the same way" as the leading row.

**Why it matters at six months specifically.** A block-1 or block-2 user has a
homogeneous seed source, so the line is accidentally true. Mixed sources are
the normal mature state, which is exactly when the line becomes false. The
line was added by FB-28 to stop the cap silently hiding muscles; it now hides
them behind a false equivalence.

**Direction sketch.** Either count by source ("Plus 2 more muscle groups, set
from your own history.") or drop the manner claim entirely and state only the
count. The second is safer and needs no new data.

### M-3 (LATENT, MED, phase 45) - the depth counter dies at the return statement

**Evidence.** `computeLearnedRange` increments `evidenceBlocks` per qualifying
folded entry (`learnedRange.js:151`) and returns it (`:183`). A
repository-wide search finds no consumer outside `learnedRange.js` itself and
its tests. `blockLedgerRunner.js:405-406` reads only `learned.isLearned` and
`learned.ceiling`.

**Consequence.** The one honest, already-computed answer to "how much of my
own training is behind this number" is discarded on the line that produces it.
This is the DEPTH sibling of RELATIONSHIP-MOMENTS B6 (which recorded AGE) and
is a separate value with a separate, non-D91-25 resolution.

**Direction sketch.** Carry `evidenceBlocks` on the resolved seed range (it is
already in scope at `blockLedgerRunner.js:397-413`) and let the block-start
clause select on it. No new computation, no new query, no engine change, no
freshness semantics.

### M-5 (IMPROVEMENT, LOW-MED, phase 45) - the returner gets the least specific variant

**Evidence.** `buildBlockStartLines` orders by movement magnitude and appends
the movement suffix only when `previous` is supplied (`blockExplain.js:207-217`,
`:147-167`). `HomeScreen.js:1210-1233` builds `previous` from the newest prior
mesocycle carrying a `blockLedger`, inside a `try` that sets `previous = null`
on any failure, and only when `personalisedSeed` is true. Probe, mature summary
without `previous`: every ", up from 14 in week 1" and ", kept where it was"
disappears and ordering silently reverts to largest-peak-first.

**Consequence.** FB-27's whole point was that retention is a decision and must
be said out loud. The user for whom "what changed since last time" matters
most, the one returning after a long gap, is the one most likely to hit a path
where the prior ledger is absent (the D97-3 addendum route: an abandoned block
classifies INSUFFICIENT_DATA and the seed falls through to the learned band).

**Direction sketch.** Characterisation only. Whether the returner should get
the movement suffix from an old ledger is an evidence-age question and belongs
beside D97-3, not ahead of it.

### M-6 (DEFECT, HIGH, phase 46) - the safety hold collapses, and its own flag under-reports

**Evidence.** Probe, identical inputs, RESPONSIVE with a full dose-response
pair: unsuppressed gives `{start:13, peak:18}` and "responded well and kept
progressing in the higher-volume weeks with recovery to spare, so the next
block starts 1 set higher"; suppressed gives `{start:12, peak:16}` and
"responded well at this dose, so the starting volume carries over unchanged",
with `upwardCarryPrevented:false`.

Mechanism: the `earned` gate at `interBlock.js:343-345` includes `!suppressed`
and `weeksSinceBlockEnd < STALE_EVIDENCE_WEEKS`, so the climb is zeroed
**before** `finish()` computes `preHoldStart`. The hold cap at `:240-245` then
finds nothing left to pull down and `upwardCarryPrevented` stays false. Grid
sweep over 480 cases: 230 change the proposal under suppression, 180 set the
flag.

**Consequence.** This is the addendum's SAFETY non-change state. A user in calm
mode whose own evidence supported more volume is held flat and reads the
retain-successful-dose sentence, with no way to learn that their own setting
held it. It is the one non-change state where silence is actively misleading
rather than merely quiet, and it is the exact inverse of the app's posture
everywhere else, where every hold names its cause.

**Relation to prior rulings.** RELATIONSHIP-MOMENTS B2 and D97-19 recorded that
`upwardCarryPrevented` is never spoken and made the WORDING a founder question,
because calm mode and the ED flag are deliberately ORed
(`blockLedgerRunner.js:78-83`) and separating them in copy would expose
detector state, which the addendum forbids. **That ruling stands and this
finding does not reopen it.** What is new is mechanical: the flag does not fire
on the RESPONSIVE dose-response family, so the founder's copy decision would
land on a flag that is false in the case it was written for.

**Direction sketch (mechanism only, no copy).** If the founder rules B2's
wording in, the flag needs to record suppression's effect where suppression
actually acts. The narrowest correct shape is to compute the branch's
**unsuppressed** target and compare, rather than inferring from the clamp: the
`earned` expression at `:343-345` already knows that `!suppressed` was the
failing conjunct, so the branch can set the provenance without changing a
single number. Strictly additive, no threshold moved, no behaviour changed:
the proposal is byte-identical either way. Any wording must attribute the hold
to the user's own setting, never to a detector, and must not distinguish the
calm path from the ED path.

### M-7 (DEFECT, MED, phase 46) - the insufficient-evidence sentence names the wrong cause

**Evidence.** `blockExplain.js:339` composes one sentence for every
`INSUFFICIENT_DATA` hold:

```
`... stayed where ${stayedVerb(heldUnjudged)}: this block did not log enough
 recovery feedback to judge ${...}, so nothing was moved on a guess.`
```

`INSUFFICIENT_DATA` has five causes (`interBlock.js:282-306`). Only the
`dataPoints < MIN_RECOVERY_POINTS` branch (`:292-296`) is about recovery
feedback. For the discontinuity branch the true cause is "An exercise change
broke the strength comparison" (`:300`), and for the confidence branch it is
"The strength picture was too unsettled" (`:305`). The receipt tells the user
to log more recovery feedback when logging more recovery feedback would not
have helped.

**Consequence.** A mature user who swapped an exercise mid-block, and who is
therefore correctly held, is told to fix something unrelated. RA-2 introduced
this sentence precisely to stop the app asserting a verdict it had declined to
give; the sentence now asserts a cause it did not diagnose.

**Direction sketch.** The classification is already on the entry, and
`buildSeedReceipt` already reads it at `blockExplain.js:308`. The entry's own
`evidence` array carries `{ signal: 'insufficient', value: 'adherence' |
'exposure' | 'recovery_data' | 'discontinuity' | 'confidence' }`
(`interBlock.js:283,288,293,298,303`). Select the clause on that value. No new
data, no new query. Note the SHOW ME WHY law: the clause must state the
consequence ("an exercise change meant this block's strength numbers were not
comparable"), never the classifier name or the threshold.

### M-8 (DEFECT, MED, phase 46) - the manual hold is credited to the coach

**Evidence.** `buildSeedReceipt` compares the resolved range against the
ledger entry's observed numbers and, on a zero delta, increments `held` and
then `heldUnjudged` only when the classification is `INSUFFICIENT_DATA`
(`blockExplain.js:306-309`). There is no manual branch. Probe, a muscle whose
entry carries `deferredToManual` and whose manual numbers equal the previous
block's: the receipt renders "1 other muscle group stayed where it was.
**Keeping a dose that worked is a decision too.**"

The muscle stayed where it was because the user set it there
(`blockSeed.js:69-79`, manual is rung 1 and suppression-proof). The receipt
credits the coach with the user's own decision. The rationale layer does say it
correctly ("Your manual volume settings stay as they are; this is a note, not a
change.", `interBlock.js:216`), but the receipt is the surface shown at the
moment of the write and the rationale layer is Pro-gated on PlansScreen and one
tap away on BlockReflection.

**Consequence.** This is the addendum's RESPECT MY CHOICES law read backwards:
the app takes credit for a choice the user made. It also matters more at six
months than at six weeks, because manual overrides accumulate.

**Direction sketch.** `resolveSeedRange` already returns `source: 'manual'`
(`blockSeed.js:78`) and the ranges map is the receipt's own input
(`blockExplain.js:295`). Partition `held` into judged / unjudged / manual on
that source and give the manual count its own sentence attributing the hold to
the user. No new data.

### M-9 (DEFECT, MED-HIGH, phase 46) - the weekly training hold is generic

**Evidence.** `coachingGoals.js:638-651`, nine goal variants of one hold
string, including the literal "No changes needed. Stay with current volume
across all groups." (`:643`) and "No changes needed. Hold your current volume
across every group." (`:648`). `weeklyCoach.js:952` selects it from
`(trainingGoal, volumeSignal, trainingSignal, matrixDeload)` alone. Every
weekly hold cause reaches it: a stabilising recovery/performance grade, the
peak-week context adjustment (`:916-919`), persistent poor recovery
(`consecutivePoorRecoveryWeeks`), and the D16 autonomy hold
(`autoApplyHoldActive`, `:1550-1560`). Only two weekly holds explain
themselves: the deload note (`coachingGoals.js:615-617`) and the safety hold
note, which is prepended rather than substituted (`weeklyCoach.js:938-941`).

Contrast, same card: `weeklyCoach.js:1511-1526` gives the calorie hold seven
distinct reasons, each naming its own cause, and refuses to stack a generic
reason under the ED lockout (`:1509-1511`).

**Consequence.** Phase 46's premise is a user reading "same sets again" and
concluding the app is doing nothing. At the weekly grain that is roughly 26
readings in six months against 4 or 5 block transitions, so the weekly line is
where the impression is actually formed, and it is the line that says "No
changes needed."

**Direction sketch.** The causes are already named booleans in the same
function at the point `trainingNote` is composed (`weeklyCoach.js:938-957`):
`peakWeekContextApplied`, `consecutivePoorRecoveryWeeks`, `safetyHold`,
`matrixDeload`, and the recovery/performance grades. A held-reason ladder
mirroring the calorie one, composed in `weeklyCoach.js` rather than inside the
goal table, keeps `getTrainingNote` as the goal-flavour layer and adds the
cause. Deterministic, no new input, no threshold touched. SHOW ME WHY applies:
name the consequence, never the matrix or the grade number.

### M-10 (LATENT, MED, phase 46) - the stimulus-change proposal is never proposed

**Evidence.** `interBlock.js:364` produces
`{ primary: 'variant_swap', alternative: 'rep_range' }` for an entrenched
plateau. A repository-wide search for `stimulusChange` outside tests returns
only its own definition, its JSDoc, its null default and its pass-through in
`finish()` (`interBlock.js:127,186,226,269,364,365`). No screen, no builder and
no copy module reads it.

**Consequence.** The sentence the user reads says "a change of stimulus **is
proposed** rather than more volume" (`:367,369`). Nothing in the app then
proposes one. This is the sixth non-change state, and it is the only one whose
copy makes a promise the product does not keep.

**Direction sketch.** Characterisation only: wiring a variant-swap proposal is
a feature, and the founder's standing constraints (no auto exercise changes)
bind its shape. The minimum honest alternative, if the feature is not built, is
to word the sentence as the app's reading rather than as a proposal it will
make. That is a copy question for the lead.

### M-12 (UNCERTAIN, MED, phase 46) - two "insufficient evidence" branches are demotions

**Evidence.** The adherence branch (`interBlock.js:282-286`) and the exposure
branch (`:287-291`) call `finish(..., mev, mav, ...)`, resetting to the
research table rather than holding. Probe: previousStart 12 gives "so the next
block starts 2 sets lower" in both. The remaining three branches
(`:292,297,302`) call `finish(..., previousStart, plannedPeak, ...)` and
genuinely hold.

**Why it is UNCERTAIN rather than a defect.** The module documents this as
deliberate (`interBlock.js:276-281`: an undelivered dose proved nothing, so the
proposal is the research seed the app would use anyway, "stated honestly"; a
broken measurement with the dose otherwise delivered keeps the proven dose).
The reasoning is sound for a first block. For a mature user with a learned
band, a two-set reduction after one poorly-attended block reads as the app
forgetting five months of history, and the fallback chain's rung 3 (the learned
band) is not reached because a valid-but-INSUFFICIENT entry is skipped at
`blockSeed.js:88-92`, so it falls to the learned band correctly, meaning the
reduction may never actually ship. **This needs a lead ruling on the composed
behaviour, not on the branch in isolation.**

### M-13 (DEFECT, MED-HIGH, phase 48) - Free reads the adaptive block narrative

**Evidence.** `BlockReflectionScreen` renders every ledger rationale verbatim
with no tier condition (`BlockReflectionScreen.js:170`, `:311-323`, under the
heading "What this block showed"). Its route is not wrapped by `withProGuard`
(`RootNavigator.js:134,551`). It computes the ledger if absent, passing the
real tier only so the adapted layer stays Pro
(`BlockReflectionScreen.js:158-165`). It is reachable by Free from the decision
card ("See what this block showed", `PlansScreen.js:990-1000`, no tier
condition) and from `MesocycleBuilderScreen.js:255,323`.

The rationales carry forward adaptive claims: "so the next block starts 1 set
higher", "so the next block starts 2 sets lower", "and the peak comes down",
"and a change of stimulus is proposed rather than more volume"
(`interBlock.js:219-223,331,367,369`). For a Free user none of these will
happen: `handleRestartPlan` forces `seedIntent = 'repeat'`
(`PlansScreen.js:399`), and a repeat carries the finished block's own observed
numbers unchanged (`blockSeed.js:98-101`).

The same rows are deliberately Pro-gated one screen away:
`rows: tier === 'pro' ? allRows.slice(0, 4) : []` (`PlansScreen.js:286`), with
the comment "The rows are the coaching decision's evidence, so they are Pro".

**Consequence.** Two problems in one: an adaptive-coaching narrative reaches
Free (the Section 2 boundary), and it makes forward claims that are false for
Free (the honesty law). The app contradicts itself on this exact boundary,
which means one of the two screens is wrong and the lead must say which.

**Direction sketch, two options for the lead to rule between.**
(a) Gate `ledgerRows` on Pro in `BlockReflectionScreen` to match
`PlansScreen.js:286`. Cheapest, consistent, but removes an honest reflection of
the user's own training data from Free.
(b) Keep the rows tier-blind (they are workout evidence, which is the recorded
rationale at `PlansScreen.js:266-270`) and strip the forward clause for Free,
rendering only the observation half. This requires splitting
`composeRationale`'s cause from its consequence (`interBlock.js:211-224`), a
pure change with no threshold touched.
Option (b) is the better product answer under D33 and is more work, which by
the D33 criterion is not a reason to prefer (a).

### M-14 (DEFECT, MED, phase 48) - a Pro capability promised to Free as standing behaviour

**Evidence.** `WorkoutSummaryScreen.js:1476-1477`:

```
? 'These ranges start from research values and have adjusted to your own logged response. ...'
: 'These ranges are research-based starting points. With enough logged sessions they adjust to your response, and you can set them by hand ...'
```

The branch selects on whether any muscle's landmark source is `'adapted'`
(`:1475`), and `landmarkResolution` is fetched with the real tier
(`:605`, `getEffectiveLandmarks(user.id, { tier })`). `getAdaptedLandmarks`
returns null for any non-Pro tier (`effectiveLandmarks.js:117-118`), so a Free
user always lands on the second sentence and its promise "With enough logged
sessions they adjust to your response" is unconditionally false for them. It
does not matter how many sessions they log.

**Consequence.** RELATIONSHIP-MOMENTS Part 3 found zero class-C overclaims and
flagged the nutrition provenance sentence as the nearest live C-risk because it
is a promise about the system's standing behaviour rather than a claim about
this user. This one is the same shape but stronger: it is a promise about the
system's standing behaviour that is **tier-false** for the reader.

**Direction sketch.** The screen already holds the tier at `:605`. A third
variant for Free that states the research basis and the manual editor without
the adaptation promise. No engine change. Note the D-list constraint from
RELATIONSHIP-MOMENTS: this tooltip should not gain per-muscle provenance (that
is B1's job on the volume screen); this is a correction, not an expansion.

### M-15 (LATENT, MED, phase 48) - the Free repeat guard lives in the wrong module

**Evidence.** Probe of `resolveSeedRange`:

```
repeat + INSUFFICIENT_DATA entry with observed numbers -> { startSets:12, peakSets:16, source:'ledger' }
repeat + ledgerEntry: null                             -> { startSets:14, peakSets:22, source:'learned' }
repeat + entry with null observed                      -> { startSets:14, peakSets:22, source:'learned' }
```

The P-6 fallback at `blockSeed.js:162-169` requires `observed.startSets` to be
non-null and positive; otherwise the resolver continues to rung 3, the learned
band (`:174-181`), whose only gate is `!suppressed && learnedRange?.isLearned`.
The learned band is tier-blind in its evidence: `computeLearnedRange` folds
ledger history for any tier (`blockLedgerRunner.js:399-406`); only `adaptedMrv`
is Pro-gated.

Today the two leak shapes are unreachable because
`generateInitialPlannedVolume` writes rows for every `VOLUME_LANDMARKS` muscle
(`database.js:3819` passes the whole table, `:4257` iterates it), so
`computeAndStoreBlockLedger`'s planned-or-trained filter
(`blockLedgerRunner.js:184-186`) yields an entry per muscle and
`previousStart` is always positive (`:230`).

**Consequence.** The tier boundary for Free's only reachable intent is enforced
by an invariant owned by `database.js`, not by the resolver that names the
source. A null ledger, which `buildSeedRangesForNextBlock` produces whenever
`computeAndStoreBlockLedger` returns null or the current block is not
`awaitingDecision` (`blockLedgerRunner.js:373-377`), hands Free multi-block
learned volume labelled `seed_learned`, which then renders as "set by what past
blocks have shown" (`blockExplain.js:71`). Any future change to which muscles a
block seeds reopens it silently.

**Direction sketch.** Make the resolver hold the boundary itself: for
`intent === 'repeat'`, skip rung 3 and fall through to the profile/research
rungs when the observed numbers are absent. A repeat with nothing to repeat is
honestly a fresh template ramp, which is what the copy would then say. Pure,
three lines, and it makes the guard local to the module that names the source.

### M-17 (IMPROVEMENT, LOW-MED, phase 48) - the teaser card sits outside the one-banner cap

**Evidence.** `BANNER_PRIORITY` (`HomeScreen.js:1631-1641`) resolves exactly one
visible banner and the two Free upsell surfaces share its lowest slot
(`:1626-1627,1652-1653`). `HomeProTeaserCard` is rendered separately, below the
hero, gated only on `tier === 'free' && totalSessions >= 3`
(`HomeScreen.js:2183-2189`). So in a week where the attention slot wins, Home
carries the teaser ("... Pro tells you what to do next." /
"... Pro coaching uses all of it.", `HomeProTeaserCard.js:69-77`) and the free
line's outline button "Pro reads the full story" (`AttentionCard.js:145-153`)
at the same time. Both reset weekly and neither tapers or retires, so at month
six a Free user has met roughly 26 of each.

**Consequence.** Not a law breach: nothing here is manipulative, no urgency, no
false scarcity, and both are dismissible. It is a cadence question the founder's
phase-48 wording invites ("repeated upsells do not overwhelm normal training"),
and the app's own FM-05 precedent (converting the teaser from permanent to
weekly) shows the intended direction of travel.

**Direction sketch.** Either bring the teaser into `BANNER_PRIORITY` so the
one-banner invariant genuinely covers every Pro CTA on Home, or give it a
lifetime taper (for example, monthly rather than weekly past a session count).
Both are frequency-only changes with no tier or scope change, matching FM-05's
recorded posture.

### M-21 (IMPROVEMENT, MED, phase 49) - the nutrition edge in the founder's chain does not exist

**Evidence.** `nutritionEngine.js` takes no block input: a search for
`deload`, `recovery week` or `blockWeek` in it returns only the unrelated
`deloadFrequencyWeeks` plan-generation value (`:1157-1163,1237`).
`interBlock.js` and `blockLedgerRunner.js` take no nutrition input at all: the
ledger's inputs are training sets, planned rows, check-ins, deload flags and
landmarks (`blockLedgerRunner.js:123-131`). `coachApply.computeCalorieTargets`
spreads the stored row and moves only `targetKcal`, `fatG` and `carbsG`
(`coachApply.js:79-88`), with no block term. Nothing recalculates a target when
a block ends, when a recovery week starts, or when the next block seeds three
sets higher.

**Consequence.** Of the eight nodes the founder named, this is the one edge with
no code behind it. It is the difference between "the coach adjusts my food and
my training each week" (true) and "my new training block is reflected in my
food" (not true). At six months a Pro user has run four or five block
transitions, each of which changed their weekly workload, and their calorie
target did not learn about a single one of them.

**Direction sketch.** Characterisation only, deliberately. Any real fix is
engine design touching a calorie target, which is ED-safety adjacent under
Section 2 (floors, the FFM floor, the rapid-loss gate) and must not be
sketched here. Recommend the lead carry this to the founder as a scoped
question in the Phase 57 triage, with the observation that the cheapest honest
version may be explanatory rather than computational: telling the user that the
target does not move with the block is itself the missing information.

### M-22 (IMPROVEMENT, MED, phase 49) - the best personalisation surface is the least discoverable

**Evidence.** `buildBlockStartLines` output is stored in `blockSeedLines`
(`HomeScreen.js:1258`) and rendered only inside `HomeBlockShapeSheet`
(`HomeBlockShapeSheet.js:65-68`), a bottom sheet opened from the meso chip.
`awaitingDecision` blanks it entirely (`HomeScreen.js:1192-1194`).

**Consequence.** RELATIONSHIP-MOMENTS A1 recorded this as a caveat, "a
discoverability question for the founder, not a copy defect". At the six-month
horizon the framing changes: this is the only surface in the product that says
"here is what your own training set these numbers to", and it is behind a chip
tap that a user has no reason to make. Every phase-45 improvement (M-1, M-3)
lands on a surface most users never open.

**Direction sketch.** Characterisation only. The saturation rule cuts directly
against promoting it, so this is a founder judgement about one placement, not a
copy fix. Worth stating in the same breath as any M-1 work, because improving
copy nobody reads is not an improvement.

### M-24 (UNCERTAIN, LOW-MED, phase 49) - PROGRESS has no inbound edge

**Evidence.** No Progress or Analytics surface references the block decision,
the ledger, an applied coach change or the seed provenance.
`useProgressData.js:523-534` composes charts from raw history;
`AnalyticsScreen.js` gates weight trend and Body Metrics on tier but carries no
coaching narrative.

**Why UNCERTAIN.** RELATIONSHIP-MOMENTS classifies both as D ("the data is the
message") and names them first on the list of surfaces that should explicitly
NOT gain personalisation copy. So the absence may be correct restraint rather
than a broken edge. But the founder's phase-49 chain ends at PROGRESS, which
implies an inbound edge is expected.

**Direction sketch.** No copy proposed. The lead should rule whether the chain's
final node is satisfied by the charts being the user's own data (the D1
position) or requires a link, and record the ruling either way so a later lane
does not "improve" a surface the restraint rule protects.

---

## Cross-references

- **Extends and does not reopen:** D97-19 (B2 founder copy question, B6 evidence
  age), D97-3 and its addendum (stored-ledger staleness), D91-25 (freshness
  semantics, characterise-only). M-1's age half, M-5 and M-12's composed
  behaviour all sit against that boundary and are recorded as evidence for the
  Phase 57 triage rather than proposed as work.
- **Confirms as still closed:** P-6 / D97-20 (the learned-band leak into Free's
  Repeat) at the reachable path, with M-15 recording the residual shape.
- **Confirms as satisfied:** D97-16 (mature research line), P-5 (ended blocks
  count as history), R-4 / R-5 (D97-22, honest return copy), RA-2 (heldUnjudged
  split), FQ-2 (both options always offered), the banned-copy laws.
- **Compliance ledger impact.** Phase 45 and phases 48/49 move from NOT STARTED
  to COMPLETE-AUDIT on this file's evidence. Phase 46 moves from IN PROGRESS to
  COMPLETE-AUDIT for the reachability question; its two collapses (M-6, M-8),
  its mis-attributed cause (M-7) and the weekly-grain generic hold (M-9) are
  fix items for the lead, not audit gaps.
