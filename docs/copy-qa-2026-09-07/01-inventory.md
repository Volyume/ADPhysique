# Training-plan explanation copy inventory

Mechanical discovery only. No judgement, no rewrites. All paths repo-relative
to `/home/user/ADPhysique`. All strings verbatim from source at time of
writing (2026-09-07).

---

## 1. Teaser -> destination chain

### 1a. Today surface teaser/status lines (Home)

Two independent composers feed Home's status copy: `readinessSummary.js`
(the mesocycle chip, opens "Your block") and `todayLineArbiter.js` (region
R2, the single-occupant Today line, opens whichever surface its `onPress`
names).

#### `src/lib/readinessSummary.js` — `buildReadinessSummary()` (mesoBriefChip)

| String | file:line | condition | opens |
|---|---|---|---|
| `Recovery week, pull effort back.` | readinessSummary.js:110 | `isLighterTrainingState(gatedRecoveryState)` is true, state is `PLANNED_BLOCK_RECOVERY`, and `lastSession` started within 14 days | HomeBlockShapeSheet ("Your block") |
| `Recovery week on the calendar. Ease back in whenever suits you.` | readinessSummary.js:111 | same as above but `trainedRecently` false | HomeBlockShapeSheet |
| `Training is lighter for now while your recovery catches up.` | readinessSummary.js:116 | `isLighterTrainingState` true, state is `ADAPTIVE_RECOVERY_ADJUSTMENT` | HomeBlockShapeSheet |
| `Recent training signals point towards easing off soon.` | readinessSummary.js:123 | not lighter-training state, `deloadSuggestion` truthy | HomeBlockShapeSheet |
| `` `Last time out you were ${joinNatural(bits)}. Worth listening to that today.` `` | readinessSummary.js:143 | no deload suggestion; `lastSession` within 14 days and sore (>=3) / short on sleep (<=2) / low energy (<=2), at least one bit | HomeBlockShapeSheet |
| `Fatigue has been building over your last couple of sessions.` | readinessSummary.js:158 | none of the above; last 2 rated sessions (within 14 days) average fatigue >= 3.5 | HomeBlockShapeSheet |
| `First session of your plan. Nothing to read yet.` | readinessSummary.js:168 | none of the above and `lastSession` is null/falsy | HomeBlockShapeSheet |
| `On track for this block.` | readinessSummary.js:194 | default fallback (Priority 5) | HomeBlockShapeSheet |
| returns `null` | readinessSummary.js:92 | `currentMesoWeek` falsy (no active block) | chip not rendered |

Two lines override `buildReadinessSummary` entirely, computed inline in
`src/screens/HomeScreen.js`:

| String | file:line | condition | opens |
|---|---|---|---|
| `Block finished. Targets hold at recovery-week volume until you choose what comes next.` | HomeScreen.js:1942 | `currentMesoWeek?.awaitingDecision` truthy | HomeBlockShapeSheet |
| `Nothing outstanding this week.` | HomeScreen.js:1944 | `weekComplete` truthy (and not awaitingDecision) | HomeBlockShapeSheet |

Chip render (all of the above): `HomeScreen.js:2216-2237` — `readinessChipEl`.
`onPress` at `HomeScreen.js:2219`: `setShowBlockShape(true)`.
`accessibilityLabel`: `"See the shape of your training block and what the effort target means"` (HomeScreen.js:2227).
Sheet call site: `HomeScreen.js:2942-2948` renders `<HomeBlockShapeSheet visible={showBlockShape} ... currentMesoWeek={currentMesoWeek} seedLines={blockSeedLines} onChooseNext={...} />`.

#### `src/lib/home/todayLineArbiter.js` — `resolveTodayLine()` (region R2, `<TodayLine>`)

Fixed rank order (`TODAY_LINE_RANKS`, arbiter.js:202-211); first eligible wins.

| Rank | String | file:line | condition (quoted) | opens |
|---|---|---|---|---|
| 1 safety | `f.text` (caller-supplied; every call site currently passes `safety: null`) | arbiter.js:191-197 | `facts?.safety` truthy | caller-supplied `onPress` |
| 2 block complete | `Block complete. Choose what's next.` | arbiter.js:64 | `facts?.blockComplete?.eligible` (HomeScreen.js:2155: `!!currentMesoWeek?.awaitingDecision`) | `navigateCrossTab(navigation, 'PlansTab', 'Plans')` (HomeScreen.js:2156) |
| 3 coach decision | `` `Calories adjusted to ${f.caloriesKcal} kcal. See why.` `` | arbiter.js:79 | `facts?.coachDecision?.eligible` and `caloriesKcal != null` | `navigateCrossTab(navigation, 'ProfileTab', 'CoachOutput', {...})` |
| 3 coach decision | `This week's coaching decision. See why.` | arbiter.js:80 | `facts?.coachDecision?.eligible`, no calorie figure | same |
| 4 check-in | `Your weekly check-in is ready. It shapes this week's coaching decision.` | arbiter.js:98 | `facts?.checkIn?.eligible` (HomeScreen.js:2173: `showCoachingNudge`) | `navigation.navigate('ProfileTab', {screen:'WeeklyCheckIn'})` |
| 4.5 first review | `f.item.text` (pass-through; `firstReview` fact is now always absent — retired Campaign 26, see note below) | arbiter.js:116 | `facts?.firstReview?.item` truthy | `f.onPress` |
| 5 recovery, planned | `Recovery week. Training is deliberately lighter. What that means.` | arbiter.js:136 | `isLighterTrainingState(f.state)` true and state is `PLANNED_BLOCK_RECOVERY`, `f.onOpenDetail` present | `setShowRecoveryDetail(true)` (HomeScreen.js:2186) -> RecoveryStateCard sheet |
| 5 recovery, adaptive | `Training is lighter for now. Why?` | arbiter.js:137 | `isLighterTrainingState(f.state)` true, state is `ADAPTIVE_RECOVERY_ADJUSTMENT` | same |
| 5 recovery, deload-suggested | `Recovery week suggested. See why.` | arbiter.js:149 | `f.deloadEligible` (HomeScreen.js:2187: `deloadBannerEligible`) | `navigation.navigate('CoachReview')` |
| 6 re-entry | `Welcome back. A quick question before your next session.` | arbiter.js:165 | `facts?.reEntry?.eligible` (HomeScreen.js:2192: `reEntryDue`) | `handleReEntryPress()` |
| 7 phase mismatch | `` `Your nutrition targets are set for ${f.savedPhaseLabel}. Update them to match.` `` | arbiter.js:177 | `facts?.phaseMismatch?.eligible` | `navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets')` |
| — | returns `null` | arbiter.js:236 | no rank eligible, or `facts.hasActiveWorkout` true (resume suppression, arbiter.js:231) and rank 1 not eligible | `<TodayLine>` renders nothing |

Caller wiring for the `facts` object: `HomeScreen.js:2149-2202`.
Render: `HomeScreen.js:2280` — `<TodayLine item={todayLineItem} testID="today-line" />`.
`TodayLine` component (`src/components/home/TodayLine.js:28-68`) is presentation-only: renders `item.text`, dot accent, dismiss X (if `onDismiss`) else a chevron.

**Note on rank 4.5**: `todayLineArbiter.js:19-25` and `:105-121` describe a
"first-review readiness line, conflict days only" fed by a module
`src/lib/home/firstReviewLine.js`. That module does not exist in the tree
(grep found zero matches; `HomeScreen.js:2180-2183`'s comment confirms it was
retired in Campaign 26, replaced by an "evidence pane"). The arbiter code
path (`resolveFirstReview`) is therefore permanently dead in production
(`facts.firstReview` is never supplied a truthy `.item`). Flagged under
Ambiguities.

### 1b. Destination: "Your block" sheet — `src/components/HomeBlockShapeSheet.js`

Opened only from the readiness chip above (`HomeScreen.js:2942`).

| String | file:line | condition | data interpolated |
|---|---|---|---|
| `Your block` (sheet title) | HomeBlockShapeSheet.js:42 | always | — |
| `{currentMesoWeek.mesoName}` | HomeBlockShapeSheet.js:43 | `currentMesoWeek?.mesoName` truthy | mesocycle name, from `currentMesoWeek` (HomeScreen state) |
| `BlockShapeCard` render (see 1c) | HomeBlockShapeSheet.js:44-49 | always (returns null internally if `plannedWeeks` unusable) | `weekIndex`, `plannedWeeks`, `isDeload`, `finished` from `currentMesoWeek` |
| `GLOSSARY.mesocycle` = `A training block: a few weeks that ease in, build, push, then recover.` | HomeBlockShapeSheet.js:62 (string at coachGlossary.js:43-44) | always | — |
| `seedLines` (block-start explanation, see §2 `buildBlockStartLines`) | HomeBlockShapeSheet.js:63-65 | `seedLines.length > 0`; `seedLines` = `blockSeedLines` state, set at HomeScreen.js:1177 from `buildBlockStartLines({summary, previous, hadPriorBlocks})` or `[]` when `week.awaitingDecision` (HomeScreen.js:1112) | per-muscle written plan rows via `summariseSeededPlan`, `getPlannedMuscleVolumeForBlock`; previous-block ledger via `getAllMesocyclesForUser` |
| `Effort builds a little each week so your body keeps adapting, then the recovery week lets it catch up. When the block finishes, you choose what comes next; nothing starts on its own. How each muscle responds can shape where your next block starts.` | HomeBlockShapeSheet.js:70-72 | always (fixed) | — |
| `GLOSSARY.deload` = `A lighter planned week so you recover: lighter loads, full recovery, no PRs.` | HomeBlockShapeSheet.js:73 (string at coachGlossary.js:16) | always | — |
| `GLOSSARY.rir` = `Reps in reserve: how many reps you'd have left; "stop 2 short" means finish the set when you believe you could still do about 2 good reps. Most weeks leave reps in reserve, building effort as the block goes on, so progress never depends on taking every set to failure.` | HomeBlockShapeSheet.js:74 (string at coachGlossary.js:49) | always | — |
| `Choose your next block` (button) | HomeBlockShapeSheet.js:78-81 | `currentMesoWeek?.awaitingDecision && onChooseNext` | — |
| `Close` | HomeBlockShapeSheet.js:85 | always | — |

### 1c. `src/components/BlockShapeCard.js` (rendered inside HomeBlockShapeSheet, and independently on WorkoutSummaryScreen — see §4)

| String | file:line | condition |
|---|---|---|
| `Block finished. Targets hold at recovery-week volume until you choose what comes next.` | BlockShapeCard.js:45 | `finished` prop true |
| `Recovery week. Lighter on purpose. This is where the work pays off, and you lose nothing by easing back.` | BlockShapeCard.js:47 | `isDeload` true or `current === n - 1` (on the last dot) |
| `` `Week ${current + 1} of ${n} · Push. Your hardest week of the block. Recovery week next.` `` | BlockShapeCard.js:49 | `current === n - 2` (second-to-last week) |
| `` `Week ${current + 1} of ${n} · ${word}. Recovery week in ${weeksToRecovery} ${weeksToRecovery === 1 ? 'week' : 'weeks'}.` `` | BlockShapeCard.js:54 | default (mid-block) |
| Phase words per dot: `Ease in` (i===0), `Recover` (i===n-1), `Push` (i===n-2), `Build` (else) | BlockShapeCard.js:19-24 | structural position |

Interpolates: `weekIndex`, `plannedWeeks`, `isDeload`, `finished` — all
passed by the two callers (HomeBlockShapeSheet.js:45-48, WorkoutSummaryScreen.js:1290-1295).

### 1d. Sibling sheet: Recovery detail — `src/components/RecoveryStateCard.js` + `src/lib/recoveryState.js`

Opened from the Today-line rank-5 recovery occupant (`HomeScreen.js:2186`,
`setShowRecoveryDetail(true)`) via `BottomSheet` at `HomeScreen.js:2971-2981`.
All copy is produced by `recoveryState.js`'s `recoveryStateCard()`
(recoveryState.js:173-193); the component only renders the returned object's
fields.

| Field | String | file:line | condition |
|---|---|---|---|
| title/compactTitle | `Recovery week` | recoveryState.js:178-179 | `resolved.state === PLANNED_BLOCK_RECOVERY` |
| body | `You have finished the hard-training part of this block. Training is lighter on purpose this week so fatigue can come down before you move on.` | recoveryState.js:180 | same |
| next | `Once this recovery week is done, you choose what comes next. Nothing starts a new block on its own.` | recoveryState.js:181 | same |
| action | `See what's different` | recoveryState.js:182 | same |
| title | `Training is lighter for now` | recoveryState.js:187 | `resolved.state === ADAPTIVE_RECOVERY_ADJUSTMENT` |
| compactTitle | `Training adjusted for recovery` | recoveryState.js:188 | same |
| body | `Your recent recovery has been harder, so we are holding back some of the workload for now.` | recoveryState.js:189 | same |
| next | `Normal progression picks up again when your recovery supports it. The rest of the block is unchanged.` | recoveryState.js:190 | same |
| action | `Why?` | recoveryState.js:191 | same |
| — | returns `null` | recoveryState.js:174 | `!isLighterTrainingState(resolved)` |

Data interpolated: none (fixed strings only); `resolved`/`recoveryState` is
`gatedRecoveryState`, produced by `resolveRecoveryState()`
(recoveryState.js:90-146) from `weekIndex`, `plannedWeeks`, `deloadWeek`,
`isDeload`, `awaitingDecision`, `recoveryPhaseAllowed`.
Render: `RecoveryStateCard.js:33-86` — title switches on `expanded`
(component prop, toggled by `onToggle` = `toggleRecoveryRead` in HomeScreen),
body/next shown only when `expanded`.

---

## 2. Shared copy sources

### 2a. `src/lib/blockExplain.js` — exported strings/templates and callers

| Export | Exact text / template | file:line | Callers (file:line) |
|---|---|---|---|
| `BLOCK_START_SENTENCE` | `` `This starts a ${numberWord(BLOCK_PLANNED_WEEKS)}-week training block: ${numberWord(BLOCK_PLANNED_WEEKS - 1)} weeks that build, then a lighter recovery week.` `` (resolves to *"This starts a six-week training block: five weeks that build, then a lighter recovery week."*) | blockExplain.js:54-56 | components/PlanPreviewSheet.js:375; lib/planSwitch.js:72; screens/HomeScreen.js:2639; screens/ManualBuilderScreen.js:1608; screens/PlanDetailScreen.js:201; screens/PlanLibraryScreen.js:497; screens/PlansScreen.js:892,1389; screens/ProSetupCompleteScreen.js:360 |
| `ACTIVATION_MEANING_SENTENCE` | `Today then leads with this plan, and you can still change the workouts afterwards.` | blockExplain.js:66 | lib/planSwitch.js:72; screens/PlanDetailScreen.js:201; screens/PlanLibraryScreen.js:497; screens/PlansScreen.js:892 |
| `BLOCK_DEFINITION` | `A training block is the multi-week shape of your training: your weekly sets climb for a few weeks, then drop back for a lighter recovery week so your body can absorb the work.\n\nYour plan is the workouts and exercises. Making a plan active also starts a block of ${BLOCK_PLANNED_WEEKS} weeks, the last of them the recovery week. There is nothing to set up.\n\nWhen the block finishes:\n• Your plan keeps going. The workouts are still there.\n• Nothing rolls into a new block on its own. You choose what comes next\n• The finished block moves to Past blocks once your next block starts` | blockExplain.js:79-87 | screens/MesocycleBuilderScreen.js:221; screens/PlansScreen.js:1308 |
| `blockRestartSentence(currentWeek, totalWeeks)` | `` `Confirming ends your current block at week ${currentWeek} of ${totalWeeks} and starts a new one from week 1. Your workout history and PRs are kept.` `` | blockExplain.js:101-103 | components/PlanPreviewSheet.js:60 |
| `blockKeptSentence(currentWeek, totalWeeks)` | `` `Every exercise stays, so your current block carries on at week ${currentWeek} of ${totalWeeks} rather than restarting. Your workout history and PRs are kept.` `` | blockExplain.js:114-117 | components/PlanPreviewSheet.js:71 |
| `summariseSeededPlan(plannedRows, deloadWeekIndex)` | (no user-facing text; groups written plan rows) | blockExplain.js:160-190 | screens/HomeScreen.js:1120 |
| `buildBlockStartLines({summary, limit, previous, hadPriorBlocks})` | Per-muscle: `` `${muscleDisplayName(muscle)}: ${v.week1} sets in week 1, building to ${v.peak} by week ${v.peakWeek}, then a recovery week (${clause}${move}).` `` (blockExplain.js:281) or `` `${muscleDisplayName(muscle)}: ${v.week1} sets a week, held steady, then a recovery week (${clause}${move}).` `` (blockExplain.js:283); cap note `` `Plus ${dropped} more muscle group${dropped === 1 ? '' : 's'}, set the same way.` `` (blockExplain.js:289); research remainder `The rest still start from research-based guidance, until they have a block behind them.` (blockExplain.js:198, `RESEARCH_REMAINDER_LINE`); no-personalisation case `Not enough personal history yet, so this block starts from research-based guidance. As blocks finish, each muscle's starting point comes from how it actually responded.` (blockExplain.js:137, `RESEARCH_START_LINE`) or, for a user with prior blocks, `This block starts from research-based guidance for this plan. Your block history picks up again as its blocks finish.` (blockExplain.js:145, `RESEARCH_START_LINE_MATURE`) | blockExplain.js:244-296 | screens/HomeScreen.js:1118,1177 |
| `SOURCE_CLAUSE` map (embedded in the per-muscle line above) | `seed_ledger`: `set by how your last block went`; `seed_learned`: `set by what past blocks have shown`; `seed_learned_probe`: `set by what past blocks have shown, with one extra set at the top being tested`; `seed_manual`: `your own setting` | blockExplain.js:120-129 | consumed inside `buildBlockStartLines` only |
| `buildLedgerReflectionRows(ledger)` | Per row: `${e.rationale}` verbatim from the stored ledger entry, or `${label} was held while your restriction was active` (blockExplain.js:333) when `eligibility==='constrained'`, plus the fixed clause `' This one is deliberately kept steady rather than increased this block.'` (`HELD_DELIBERATELY_CLAUSE`, blockExplain.js:317) appended when `e.upwardCarryPrevented` | blockExplain.js:324-347 | screens/BlockReflectionScreen.js:155,179; screens/PlansScreen.js:424,431 |
| `buildSeedReceipt({ranges, ledger, limit})` | Per changed muscle: bits joined from `` `week 1 ${ds>0?'up':'down'} from ${prevStart} to ${start} sets` `` / `` `peak ${dp>0?'up':'down'} from ${prevPeak} to ${peak} sets` `` (blockExplain.js:401-402); held summary built from three template fragments at blockExplain.js:425,433,436 (`... stayed where ${stayedVerb(n)}. Keeping a dose that worked is a decision too.`; `...there wasn't enough clear evidence this block to judge ${...}, so nothing was moved on a guess.`; `...on your own settings and ${...} left exactly there.`) | blockExplain.js:369-447 | lib/nextBlockPreview.js:76; screens/PlansScreen.js:709,799 |
| `recoveryProposalLine(ledger)` | `Several strain signals ran together this block, so a longer recovery of about 10 days is suggested before the next one starts. Your call.` | blockExplain.js:454-457 | screens/PlansScreen.js:424,460 |
| `buildRampPositionLine({weekIndex, plannedWeeks, appliedDelta, musclesChanged, thisWeekSets, nextWeekSets})` | `` `Week ${week} of ${total} in your block.${direction}${coachBit}` `` where `direction` is `' Your recovery week is next.'` (blockExplain.js:484, last accumulation week) or `` ` The planned climb adds ${climb} ${climb === 1 ? 'set' : 'sets'} next week.'` `` (blockExplain.js:490); `coachBit` is `` ` This week the coach added ${mag} ${setWord} on top.'` `` or `` ` This week the coach pulled ${mag} ${setWord} back.'` `` (blockExplain.js:498-500) | blockExplain.js:474-503 | screens/CoachOutputScreen.js:2748 |

### 2b. `src/lib/recoveryState.js` — exported strings/templates and callers

| Export | Text / template | file:line | Callers |
|---|---|---|---|
| `recoveryStateCard(resolved)` | see §1d table | recoveryState.js:172-193 | components/RecoveryStateCard.js:35 |
| `nextWorkoutRecoveryLabel(resolved)` | `Recovery week` (planned) / `Recovery-adjusted` (adaptive) | recoveryState.js:196-201 | screens/HomeScreen.js:1727; screens/ActiveWorkoutScreen.js:4640 |
| `trainRecoveryDetail(resolved, differences)` | Lead: `Recovery week. This session is lighter on purpose, because you have finished the hard-training part of this block.` (planned) or `Recovery-adjusted session. This one is lighter because your recent recovery has been harder.` (adaptive); appended `${sentenceList(real)}` when `differences` non-empty | recoveryState.js:212-221 | screens/ActiveWorkoutScreen.js:4647 |
| `describePrescriptionDifferences(baselineSets, prescribedSets)` | plain phrases: `fewer working sets`, `fewer reps per set`, `lighter loads`, `easier effort targets` | recoveryState.js:238-266 | screens/ActiveWorkoutScreen.js:2488 (feeds `trainRecoveryDetail`) |
| `reviewRecoveryLine(resolved)` | `You are in your recovery week. Training is lighter before you move on from this block, and you will choose what comes next when it is done.` (recoveryState.js:289, planned); `Training is being held back at the moment while your recovery catches up. Your recovery week still comes at the end of the block as planned.` (recoveryState.js:292, adaptive); `Next is your recovery week. Training will be lighter before you move on from this block.` (recoveryState.js:295, `weeksToRecovery === 1`) | recoveryState.js:286-298 | screens/CoachOutputScreen.js:396 (feeds TrainingNextWeekCard body, see §1's sibling notes below) |
| `resolveRecoveryState(...)` | (no text; the state resolver) | recoveryState.js:90-146 | lib/database.js:5639; lib/programmePosition.js:204 |
| `isLighterTrainingState(resolved)` | (no text; boolean gate) | recoveryState.js:149-152 | lib/readinessSummary.js:101; lib/home/todayLineArbiter.js:133; screens/HomeScreen.js:1088 |
| `plannedRecoveryWeek(...)` | (no text) | recoveryState.js:66-72 | lib/programmePosition.js:125 |

### 2c. `TrainingNextWeekCard` (local function in `src/screens/CoachOutputScreen.js:366-509`) — the Coach-tab sibling of the block/week explanation

Not a lib module (not separately importable), but shares `reviewRecoveryLine`
and `buildRampPositionLine` output, so listed for completeness.

| String | file:line | condition |
|---|---|---|
| `Recovery volume eased to about ${...}% of each muscle's recent working volume.` | CoachOutputScreen.js:422 | deload applied, `sharePct` present |
| `This block has finished, so there is no upcoming week to change. Choose your next block on the Train tab.` | CoachOutputScreen.js:436 | deload row, `blockFinished` true |
| `Start your next training week to bring the recovery week forward.` | CoachOutputScreen.js:437 | deload row, not finished, `!canApply` |
| `This block has finished, so volume changes have nowhere to land yet. Choose your next block on the Train tab first.` | CoachOutputScreen.js:460 | volume row, `blockFinished` true |
| `` `Nothing is added this week. ${recoveryReviewLine ?? 'Volume changes start again with your next block.'}` `` | CoachOutputScreen.js:475 | `currentWeekIsDeload` true |
| `Next week is your recovery week, so the coach will not add sets to it. Recovery weeks stay light on purpose.` | CoachOutputScreen.js:477 | `upwardBlocked` true |
| `` `${recoveryReviewLine} ${rampLine ? `${rampLine} ` : ''}This is next week's starting point; each session still fine-tunes as you train.` `` | CoachOutputScreen.js:479 | `recoveryReviewLine` present |
| `` `${rampLine} This is next week's starting point; each session still fine-tunes as you train.` `` | CoachOutputScreen.js:481 | `rampLine` present, no review line |
| `This is next week's starting point. Each session still fine-tunes as you train.` | CoachOutputScreen.js:482 | fallback |
| `Hold through your recovery week` | CoachOutputScreen.js:398 | `upwardBlocked \|\| upwardInRecovery` |
| `` `Add ${mag} ${setWord} to each muscle group` `` | CoachOutputScreen.js:399 | `signal > 0` |
| `` `Pull back ${mag} ${setWord} per muscle group` `` | CoachOutputScreen.js:400 | `signal < 0` |
| `Hold your current volume` | CoachOutputScreen.js:401 | `signal === 0` |
| `Take a recovery week` / `Recovery week set for next week` | CoachOutputScreen.js:416 | `deloadSuggested`; label toggles on `deloadApplied` |

### 2d. `src/lib/volumeInsightCopy.js` (per-muscle volume advice, tap-through on Workout Summary — adjacent system, shares "research-based" wording)

`getVolumeInsight(muscle, sets, status, table)` — templates at
volumeInsightCopy.js:34-39 (`optimal`/`minimum`/`below`/`near_mrv`/`over_mrv`/
default), each interpolating `n` (rounded sets) and `range` (`` `${mev}–${mrv}
sets/week'` ``).

`getVolumeWhy(muscle, sets, status, table, source)` — body templates at
volumeInsightCopy.js:71,74,77,80,83 (one per status), each appending a
`closing` clause keyed by `source` (volumeInsightCopy.js:61-69):
`adapted` -> `Targets adjust over time as your body responds to training.`;
`manual` -> `These are your own volume targets, exactly as you set them.`;
`plan` -> `This target is what your plan programs for this muscle each week.`;
`profile` -> `These targets are matched to your training experience, recovery, phase and age.`;
default/`research` -> `These targets are research-based starting points.`

Callers: `screens/WorkoutSummaryScreen.js:1554-1555` (both functions, gated
by `adviceAllowed`).

A separate, non-shared inline tooltip on the same screen
(`WorkoutSummaryScreen.js:1503-1515`) makes the equivalent four-way source
claim for the volume-status legend: `These ranges start from your plan and
your profile and...` (1506) / `These ranges come from what your plan
programs each week...` (1509) / `These ranges are matched to your training
experience...` (1512) / `These ranges are research-based starting points.
With enough logged sessions they adjust to your response...` (1514). This is
NOT `volumeInsightCopy.js` — it is duplicated, differently-worded inline copy
in the same screen. Flagged under Ambiguities.

### 2e. `src/lib/coachGlossary.js` — `GLOSSARY` (static map, no generation)

Full export at coachGlossary.js:10-123. Entries directly relevant to the
block/week explanation system: `mesocycle` (coachGlossary.js:43-44),
`deload` (coachGlossary.js:15-16), `rir` (coachGlossary.js:48-49), `volume`
(coachGlossary.js:13-14), `effort` (coachGlossary.js:33-34). Callers of these
five specifically: HomeBlockShapeSheet.js:62,73,74;
screens/CoachOutputScreen.js:411 (`tooltip={GLOSSARY.volume}`),424
(`tooltip={GLOSSARY.deload}`). (Full caller list for every glossary entry not
enumerated — out of scope; `GLOSSARY` is imported project-wide via
`InfoTooltip`.)

---

## 3. Terminology in use (representative occurrences)

| Term | Occurrence | file:line |
|---|---|---|
| block | `A training block: a few weeks that ease in, build, push, then recover.` | lib/coachGlossary.js:43-44 |
| block | `A training block is the multi-week shape of your training...` | lib/blockExplain.js:79-81 |
| block | `Your block` (sheet + Workout Summary section title) | components/HomeBlockShapeSheet.js:42; screens/WorkoutSummaryScreen.js:1286 |
| block | `This block has finished, so there is no upcoming week to change.` | screens/CoachOutputScreen.js:436 |
| mesocycle | never shown to the user verbatim as "mesocycle" in the copy inventoried above — internal/variable naming only (`mesoWeek`, `mesoName`, `mesocycleId`); `recoveryState.js:174` test enforces `expect(s).not.toMatch(/mesocycle/i)` on every produced string | lib/__tests__/recoveryState.test.js:214 |
| recovery week | `Recovery week` (title) | lib/recoveryState.js:178 |
| recovery week | `Recovery week, pull effort back.` | lib/readinessSummary.js:110 |
| recovery week | `Recovery week suggested. See why.` | lib/home/todayLineArbiter.js:149 |
| recovery week | `Your recovery week is next.` | lib/blockExplain.js:484 |
| deload | user-facing term avoided (see recoveryState.js:156-171 header: "PLAIN LANGUAGE... Nobody has to know the words deload, mesocycle, MEV, MRV..."); appears only in `GLOSSARY.deload`'s definition body which itself never uses the word "deload" (coachGlossary.js:15-16) | lib/recoveryState.js:156-171 |
| RIR / reps in reserve | `Reps in reserve: how many reps you'd have left; "stop 2 short" means finish the set...` | lib/coachGlossary.js:48-49 |
| effort | `How close to failure the set should feel: 5 = leave nothing, 0 = very easy.` | lib/coachGlossary.js:33-34 |
| effort | `Effort builds a little each week so your body keeps adapting...` | components/HomeBlockShapeSheet.js:70-71 |
| effort | phase word `Push` = `Your hardest week of the block.` | components/BlockShapeCard.js:49 |
| sets | `The total work for a muscle: the working sets you do for it in a week.` (GLOSSARY.volume) | lib/coachGlossary.js:13-14 |
| sets | `Add ${mag} ${setWord} to each muscle group` | screens/CoachOutputScreen.js:399 |
| volume | `Training next week` section header, tooltip `GLOSSARY.volume` | screens/CoachOutputScreen.js:411 |
| volume | `These ranges are research-based starting points...` | screens/WorkoutSummaryScreen.js:1514 |
| landmark / MEV / MRV | never surfaced as literal "landmark"/"MEV"/"MRV" strings in user-facing copy found; `landmark(s)` appears only in code comments/identifiers (e.g. screens/AnalyticsScreen.js:130-138, screens/CoachReviewScreen.js:101,151,395) and `MEV`/`MRV` only inside `getVolumeInsight`'s internal range math, never spelled out to the user | screens/CoachReviewScreen.js:151 |
| starting point | `This is next week's starting point; each session still fine-tunes as you train.` | screens/CoachOutputScreen.js:479 |
| starting point | `so this block starts from research-based guidance. As blocks finish, each muscle's starting point comes from how it actually responded.` | lib/blockExplain.js:137 |
| starting point | `These targets are research-based starting points.` | lib/volumeInsightCopy.js:69 |
| history / response | `Not enough personal history yet...` / `...each muscle's starting point comes from how it actually responded.` | lib/blockExplain.js:137 |
| history | `Your block history picks up again as its blocks finish.` | lib/blockExplain.js:145 |

---

## 4. Related first-use / empty states in the same training-explanation system

| String | file:line | condition |
|---|---|---|
| `First session of your plan. Nothing to read yet.` | lib/readinessSummary.js:168 | no `lastSession` yet (see §1a) |
| `Not enough personal history yet, so this block starts from research-based guidance. As blocks finish, each muscle's starting point comes from how it actually responded.` (`RESEARCH_START_LINE`) | lib/blockExplain.js:137 | `buildBlockStartLines`: every summary entry is research-family-sourced and `hadPriorBlocks` false |
| `This block starts from research-based guidance for this plan. Your block history picks up again as its blocks finish.` (`RESEARCH_START_LINE_MATURE`) | lib/blockExplain.js:145 | same, but `hadPriorBlocks` true |
| `Block finished. Targets hold at recovery-week volume until you choose what comes next.` | lib/blockExplain.js: (also HomeScreen.js:1942; BlockShapeCard.js:45; todayLineArbiter.js:64 different wording — see below) | block awaiting decision |
| `Block complete. Choose what's next.` | lib/home/todayLineArbiter.js:64 | `facts.blockComplete.eligible` (i.e. `currentMesoWeek?.awaitingDecision`). Note: this is DIFFERENT wording from the "Block finished. Targets hold..." line used elsewhere for the identical `awaitingDecision` condition. Flagged under Ambiguities. |
| `Your recovery week is done, so the next step is choosing your next block. Nothing starts on its own.` | screens/BlockReflectionScreen.js:367 | block-reflection finished-block empty/next-step state |
| `That block is done, recovery week included.` | grep hit only, verbatim source line not re-opened in this pass — see lib/blockAdvisor.js and campaign5.firstUse.test.js:815 | first-use test asserts this string exists in the advisor's "story" output |
| `One more week before your recovery week` | lib/blockAdvisor.js (per campaign5.firstUse.test.js:809) | not re-opened in this pass; flagged for follow-up read of lib/blockAdvisor.js |
| `Switch during your recovery week?` (dialogue title) | lib/planSwitch.js (per campaign6.longTerm.test.js:203 and lib/__tests__/planSwitch.test.js:176) | mid-recovery-week plan switch attempt |
| `You're in your recovery week.` (dialogue body, partial) | lib/planSwitch.js (per lib/__tests__/planSwitch.test.js:177) | same |
| `Recovery week on the calendar. Ease back in whenever suits you.` | lib/readinessSummary.js:111 | unearned recovery week (gap in training) — see §1a |

Not opened in full this pass (named only via test references above):
`src/lib/blockAdvisor.js`, `src/lib/planSwitch.js`'s dialogue body beyond the
grepped fragment, `src/screens/BlockReflectionScreen.js` beyond line 367.
These are adjacent to the system in scope but a full pass was out of the time
budget for this inventory; flagged under Ambiguities for a follow-up pass if
the lead wants full coverage.

---

## 5. Tests

| Test file | Assertion line(s) | Pins |
|---|---|---|
| src/lib/__tests__/readinessSummary.test.js | 209 | `First session of your plan. Nothing to read yet.` exact match |
| src/lib/__tests__/readinessSummary.test.js | 66,78 | `Recovery week, pull effort back.`; not `Recovery week suggested` |
| src/lib/__tests__/readinessSummary.test.js | 237 | no em dash (`—`) in any produced line |
| src/__tests__/campaign5.firstUse.test.js | 492 | `First session of your plan. Nothing to read yet.` exact match |
| src/__tests__/campaign5.firstUse.test.js | 344 | `BLOCK_START_SENTENCE` exact text, "no em dash" comment |
| src/__tests__/campaign5.firstUse.test.js | 622 | `BlockShapeCard.js` source regex for the mid-block recovery-countdown template |
| src/__tests__/campaign5.firstUse.test.js | 770 | `The rest still start from research-based guidance` substring |
| src/__tests__/campaign5.firstUse.test.js | 801 | `reviewRecoveryLine` planned-state exact string |
| src/__tests__/campaign5.firstUse.test.js | 809,815 | `lib/blockAdvisor.js` contains `One more week before your recovery week`; block-reflection "story" contains `That block is done, recovery week included.` |
| src/__tests__/campaign5.syntheticJourney.test.js | 110,121,249-254 | `BLOCK_START_SENTENCE` contains "recovery week"; block-start line matches `/research-based guidance/`; `buildRampPositionLine` final-week output contains `Your recovery week is next.` |
| src/__tests__/campaign6.longTerm.test.js | 203,537-539,563-565 | `planSwitch.js` source contains `Switch during your recovery week?`; HomeScreen chip source contains `Recovery week on the calendar. Ease back in whenever suits you.`; a "Research starting point" wording guard (source not re-opened this pass) |
| src/lib/__tests__/blockExplain.stage8.test.js | 111-114 | peak week is named, `then a recovery week` substring |
| src/lib/__tests__/blockExplain.stage8.test.js | 146-153 | mature-history line must contain `research-based guidance` |
| src/lib/__tests__/blockExplain.stage8.test.js | 166-169 | `buildBlockStartLines` output: no em dash |
| src/lib/__tests__/blockExplain.stage8.test.js | 228-230 | `buildRampPositionLine` exact output `Week 4 of 5 in your block. Your recovery week is next.` |
| src/lib/__tests__/blockExplain.stage8.test.js | 257 | `buildRampPositionLine` returns null on the recovery week itself |
| src/components/__tests__/HomeBlockShapeSheet.test.js | 58,73-74,81 | sheet text contains `Your block`; `Effort builds a little each week so your body keeps adapting`; `recovery week lets it catch up`; the finished-block variant does NOT contain `Your block` (title suppressed) |
| src/__tests__/campaign2.comprehension.test.js | 32,41,82 | `Effort builds a little each week so your body keeps adapting` present; a named test for "recovery week says it is lighter ON PURPOSE"; a named test that insufficient-data claims research-based guidance only |
| src/lib/__tests__/volumeInsightCopy.test.js | 103 | `getVolumeWhy(...,'research')` output matches `/research-based starting points\.$/` |
| src/lib/__tests__/planSwitch.test.js | 176-177 | `Switch during your recovery week?` exact title; body contains `You're in your recovery week.` |
| src/lib/__tests__/blockExplain.blockDefinition.guard.test.js | 20-38 | `BLOCK_DEFINITION` contains three fixed substrings; MesocycleBuilderScreen.js and PlansScreen.js both read the shared constant, not an inline copy (source-level `fs.readFileSync` guard) |
| src/screens/__tests__/PlansScreen.d139.guard.test.js | 92,99 | a `Recovery week, week ${...} of ${...}` template regex; PlansScreen.js source imports `buildSeedReceipt, BLOCK_DEFINITION` from blockExplain |
| src/screens/__tests__/PlanUpdateScreen.previewWiring.guard.test.js | 63 | PlanUpdateScreen.js source contains `Your block carries on where it was` |
| src/lib/__tests__/recoveryState.test.js | 85,90-96,102-111,148-183 | `recoveryStateCard`/`trainRecoveryDetail`/`reviewRecoveryLine` exact strings across every state combination (planned/adaptive/position-outranks-flag/etc.) |
| src/lib/__tests__/recoveryState.test.js | 210-212 | source-level guard: `everyString()` collects every produced string and asserts none contains `—` |
| src/lib/__tests__/recoveryState.test.js | 214-218 | source-level guard: no produced string matches `/\bdeload\b\|mesocycle\|\bMEV\b\|\bMRV\b\|autoregulat\|multiplier\|systemic/i` |
| src/lib/__tests__/recoveryWordingSource.test.js | 28-35 | source-level guard on readinessSummary.js: must NOT match `/if\s*\(\s*currentMesoWeek\.isDeload\s*\)/`; must match `isLighterTrainingState(gatedRecoveryState)` |
| src/lib/__tests__/recoveryWordingSource.test.js | 37-95 | behavioural: chip and card must agree at every recovery state (three scenarios) |
| src/screens/__tests__/HomeScreen.todayLinePresentationGuards.test.js | header comment (1-58) | documents coverage map; states firstReviewLine.js module is deleted (Campaign 26) and its guard "moved homes" into this file's suppression-parity block |

No `fs.readFileSync`-based em-dash/British-spelling guard was found scoped
specifically to `blockExplain.js`, `HomeBlockShapeSheet.js`, or
`todayLineArbiter.js` as source text (only `recoveryState.js` has that
source-level regex guard, via `recoveryState.test.js`); the em-dash checks on
`blockExplain.js` and `readinessSummary.js` are behavioural (run the
function, check the returned string), not source-regex guards.

---

## 6. Docs — `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`

Section headings:
1. `# Coaching voice synthesis (LOCKED)`
2. `## Founder override 2026-06-03 (supersedes the naming guidance below)`
3. `## 1. The non-negotiable foundation: honesty about decision authority`
4. `## 2. Three voice registers (all share the honesty rule, differ in warmth)`
   (`### Stage 1: Cold-start factual`, `### Stage 2: Warmed-by-data`, `### Stage 3: Safety-cold`)
5. `## 3. The phrasing patterns (LOCKED)`
6. `## 4. Voice rules layer (additive to existing CLAUDE.md and DESIGN_SYSTEM.md)`
7. `## 5. Locked surface re-drafts` (8 named surfaces)
8. `## 6. Failure-mode catalogue (LOCKED)`
9. `## 7. Application to existing locked docs`
10. `## 8. Evidence base (post-audit)`
11. `## 9. Open questions`
12. `## 10. What lands next`
13. Addenda: actor-naming rule (2026-07-09), notification drift (2026-07-09),
    weekly check-in reminder drift D17 (2026-07-09), humanise coaching cadence
    (2026-08-07), persona-adaptive register (2026-06-12)

Ten rules most relevant to explanation copy, verbatim (§3, blockExplain.js:123-212):

1. `Precision Coaching as named actor.` — `"Precision Coaching has held your calorie target steady this week. The reason: your weight has dropped 1.6 kg in three weeks."` (docs line ~130-132)
2. `Numbers before narrative.` — `"Weight down 1.6 kg in three weeks. Energy below 5 on 8 of 14 days. Food log: most days under target."` (~135-138)
3. `Mirror data, never infer state.` — `"Your log shows 600 kcal under target on most days."` Not: `"You've been pushing too hard."` (~141-143)
4. `Externalise the pattern, not the person.` — `"This pattern is the one that breaks cuts."` (~146-147)
5. `Upward counterfactual without sales register.` — `"Precision Coaching cannot tell from training alone whether your bench has stalled. With food data, it could separate training from fuel."` (~152-154)
6. `Rationale-attached prescription.` — every prescription has a one-sentence reason (~156-160)
7. `Action-belongs-to-user.` — `"Your work this week: log, train, eat to the target, weigh in."` (~163-164)
8. `Honesty-test sentence.` — `"would this still be true if the user did nothing but kept logging?"` (~167-168)
10. `Plain-mechanism language.` — substitute `"TDEE"` with `"the calories your body uses"`; substitute `"FFM"` with `"lean mass"` or `"muscle"` (~177-178)
15. `No fake-autonomy framing on locked decisions.` — `"Eat to the target this week"` passes; `"you could consider eating to the target this week"` fails because the target isn't optional (~209-211)

§4 baseline (line 215-217): `The existing voice rules continue to apply: no
em dashes, British English, no AI tells, plain spoken voice, no jargon,
alongside coaches not above.`

---

## Ambiguities / could not determine

1. **Dead code path**: `todayLineArbiter.js`'s rank-4.5 `resolveFirstReview`
   references `src/lib/home/firstReviewLine.js`, which does not exist in the
   tree. `HomeScreen.js`'s `facts` object never supplies a truthy
   `firstReview.item`, so this branch is currently unreachable in production.
   Confirmed by grep (zero matches for the file) and by a comment at
   `HomeScreen.js:2180-2183` ("the C22 rank-4.5 conflict-day firstReview fact
   is retired (Campaign 26)"). Flagging rather than judging: the lead should
   decide whether the dead branch in the arbiter (and its header-comment
   description) should be removed, since it currently documents behaviour
   the app no longer has.

2. **Two different strings for the identical `awaitingDecision` condition**:
   `lib/readinessSummary.js`/`HomeScreen.js:1942` produce `"Block finished.
   Targets hold at recovery-week volume until you choose what comes next."`
   for the mesoBriefChip, while `lib/home/todayLineArbiter.js:64` produces
   `"Block complete. Choose what's next."` for the Today-line rank-2
   occupant, for what appears to be the same underlying fact
   (`currentMesoWeek?.awaitingDecision` / `facts.blockComplete.eligible`).
   Not verified whether these two surfaces can render simultaneously on the
   same screen (the readiness chip and the Today line occupy different
   regions of Home) — flagging the wording difference for the lead's
   judgement, not asserting it is a defect.

3. **Duplicated, non-shared volume-source copy**: `WorkoutSummaryScreen.js`
   contains two independently-authored four-way "where do these ranges come
   from" statements: one via the shared `lib/volumeInsightCopy.js`
   (`getVolumeWhy`'s `closing` clause, per-muscle) and one inline in the
   screen itself (lines 1503-1515, for the legend tooltip). The wording
   differs between the two for the same `adapted`/`plan`/`profile`/research
   sources. Listed in §2d; not verified whether this duplication is by
   design (different scope: per-muscle vs whole-legend) or an unintentional
   fork.

4. **Not opened in full this pass**: `src/lib/blockAdvisor.js` and the full
   body of `src/lib/planSwitch.js`'s recovery-week dialogue (only the
   grep-matched fragments and test-asserted strings are listed, in §4).
   `src/screens/BlockReflectionScreen.js` was opened only around line
   340-370; its full first-use/empty-state copy was not exhaustively
   traced. If the lead needs full coverage of these three files, a follow-up
   read is required — flagging rather than guessing at their content.

5. **GLOSSARY caller completeness**: `src/lib/coachGlossary.js`'s `GLOSSARY`
   map is imported throughout the app via `InfoTooltip`; only the callers
   for the five entries most relevant to this system (`mesocycle`, `deload`,
   `rir`, `volume`, `effort`) were enumerated in §2e. A full caller list for
   every one of the ~25 glossary entries was out of scope for a
   training-plan-explanation inventory and was not attempted.
