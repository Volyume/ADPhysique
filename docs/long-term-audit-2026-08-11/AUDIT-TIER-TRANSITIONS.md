# AUDIT — TIER TRANSITIONS (Campaign 6, Phases 18-21)

Free -> Pro (18), Pro -> Free (19), Free -> Pro again months later (20),
trial-retry long-term (21).

**Authority.** Founder Campaign 6 order, phase texts read verbatim from the
session scratchpad copy `c6-CAMPAIGN6-ORDER.txt` lines 252-278, plus the
addendum's FREE VS PRO clause (`c6-ADDENDUM-PERSONALISATION-DIVIDEND.txt`:
"Free = self-directed continuity (history/PRs/plans/settings), never
'coached'; Pro owns the full loop; upgrade may use legitimate history but
never implies 'we've been coaching you all along'").

**Binding laws applied.** FREE HAS NO COACHING (Pro owns adaptive coaching
and Continue-with-adjustments). Trial law is SETTLED (14-day cardless in-app
-> 7-day store intro -> paid) and is treated throughout as fixed fact, never
as an open question. Billing architecture locked. No local tier mutation.
Workout history existing while Free is NOT the same thing as Free having been
coached.

**Method.** Read-only trace from code. No file outside this one was modified;
no test was written, changed or skipped; nothing was committed, pushed or
stashed; no migration was run. Three existing suites were run read-only as
evidence (`fq6.billing`, `payments.cascade`, `proGate` — 56 tests, all pass).

**Already ruled, deliberately NOT re-reported.** D97-9 (post-upgrade wizard
seeds template ramps, learned band not wired into non-Continue activation
paths — founder question); D97-3 + its addendum (stored-ledger layoff
asymmetry, and the INSUFFICIENT_DATA -> learned-band bypass as a *staleness*
question); D97-5/8/10 (counter adjacency, current-signal gate, coached auto-walk
age bound) are treated as fixed and were verified live in the tier traces
below. Finding P-6 touches the same code path as the D97-3 addendum but is a
different defect (tier boundary + button copy, not staleness) and says so
explicitly.

---

## 1. RANKED FINDINGS

| # | Verdict | Sev | Phase | One line | Primary evidence |
|---|---|---|---|---|---|
| P-1 | DEFECT | **HIGH** | 21 | The FQ-6.1 trial-grant retry can never arm or persist: `startCascade` resolves `{ok:false}` and never rejects, so the consent screen's `.catch` queue is unreachable and the flush clears the queue on every attempt regardless of outcome | `payments/cascade.js:43-60,105-166`; `Article9ConsentScreen.js:145-156`; `payments/pendingCascade.js:64-86`; pinned resolve-not-throw contract `__tests__/payments.cascade.test.js:54-59` |
| P-2 | DEFECT | **HIGH** | 20 | `weeksInPhase` and `goalStartDate` are pure wall-clock, so months on Free are counted as coached weeks: "Week 34 · Cut" and "You have been eating below maintenance for 34 weeks" on the first run back | `CoachOutputScreen.js:1598-1602`; `weeklyCoach.js:708,819,838,1257,1277-1296`; `nutritionEngine.js:1059-1082` |
| P-3 | DEFECT | MED-HIGH | 18 | The block ledger's readiness slope scores an evidence-free `weekly_checkins` row (the tier-blind sleep-only row a completed workout writes) as a neutral 50 — the exact defect FB-36 fixed in the sibling function, still live here | `blockLedgerRunner.js:157-163`; writer `WorkoutSummaryScreen.js:795-804`; fixed sibling `blockAdvisor.js:47-60` |
| P-4 | DEFECT | MED-HIGH | 18 | `lastCheckinAt` (the food-diary stand-in's "completed check-in within 14 days" gate) accepts a sleep-only row, so a never-checked-in upgrader can unfreeze calorie recalibration | `CoachOutputScreen.js:1843`; gate `weeklyCoach.js:617-622,943-964`; the screen's own completeness standard `:1499`; the scheduler's `scheduler.js:483-488` |
| P-5 | DEFECT | MED | 18/20 | `hadPriorBlocks` is derived from *stored ledgers*, not from blocks trained, so a mature Free upgrader whose blocks were never judged is told "Not enough personal history yet" | `HomeScreen.js:1239-1246`; `blockExplain.js:78-87,204-205` |
| P-6 | DEFECT | MED | 19 | A `repeat` intent with an unjudgeable ledger silently seeds from the multi-block **learned band** — history-driven volume delivered to Free (whose only reachable intent is `repeat`) under copy that promises "the same weekly set targets as last time" | `blockSeed.js:88-92,151-161`; copy `blockAdvisor.js:199-208`, `PlansScreen.js:369-372`; Free forced to repeat `PlansScreen.js:397` |
| P-7 | LATENT | MED | 21 | `startCascade` fails **open**: a `{ok:true, data:null}` round-trip defaults to `trial_state='pro_trial_active'`, writes `tier='pro'` locally and persists it — the opposite of the fail-closed rule its own caller applies | `payments/cascade.js:117-141`; fail-closed sibling `ProUpgradeScreen.js:267-281` |
| P-8 | LATENT | MED-LOW | 19 | For up to 14 days after tier loss the recovery-coaching cards (`early_deload`, `heads_up`, signal chips) still render for a Free user from Pro-era check-ins; only the next-block branch is tier-gated | `blockAdvisor.js:405,443-490`; `PlansScreen.js:746-748,900-935,1083-1107` |
| P-9 | LATENT | MED-LOW | 18 | The recovery-trend insight calls pre-workout sleep ratings "weekly check-ins", so a Pro surface narrates Free-period session rows as check-ins the user never completed | `ReadinessCards.js:70,79-80,91-93,169-178`; writer `WorkoutSummaryScreen.js:795-804` |
| P-10 | LATENT | LOW | 19 | A locally-expired trial (offline, `checkTier`'s C-3 guard) leaves the cached `trial_state` untouched, so Subscription can read "Free" over "Pro trial - 0 days remaining" until the next cloud read | `useAppStore.js:706-714`; `SubscriptionScreen.js:61-62,151-154`; `cascade.js:449-461,504-510` |
| P-11 | LATENT | LOW | 18/20 | A block ledger is frozen with the tier that first computed it: a Free-computed ledger (no adapted layer) is reused verbatim after upgrade, and the record carries no tier provenance | `PlansScreen.js:270-276`; `blockLedgerRunner.js:109-114,171-175,263-270` |
| P-12 | CLEAN | — | 21 | Server `start_cascade` is idempotent, window-anchored and eligibility-authoritative: no duplicate entitlement, no extension, no client grant | `supabase/migrate_095_trial_resume_within_window.sql:57-225` |
| P-13 | CLEAN | — | 19 | No surface forges a local tier; FQ-6.4 "Manage subscription" hands off to the platform and states expiry semantics; the only local write is a *downgrade* lockdown | `SettingsAccountScreen.js:45-82`; `useAppStore.js:637-648`; push excludes tier `sync/tables/profiles.js:16-17` |
| P-14 | CLEAN | — | 19 | Continue-with-adjustments is double-locked (advisor `isPro` defaults false; the screen re-checks before seeding) and no apply path exists outside the Pro-guarded CoachOutput screen | `blockAdvisor.js:196-220,246-271,349-351`; `PlansScreen.js:348-351,397`; sole `coachApply` consumer `CoachOutputScreen.js:71` |
| P-15 | CLEAN | — | 18 | No path manufactures check-ins or coach outputs on upgrade: both writers are reachable only from Pro-guarded screens | `saveCoachOutput` sole caller `CoachOutputScreen.js:1207+`; `WeeklyCheckIn`/`CoachOutput` guards `RootNavigator.js:208,224` |
| P-16 | CLEAN | — | 20 | Resubscribe after months creates no duplicate onboarding, plan, block or trial: `canStillTrial` is only a hint, the server's returned `trial_state` decides, and the wizard is reached only when first-run is genuinely incomplete | `ProUpgradeScreen.js:249-297,415-437`; `useAppStore.js:1101-1125` |

---

## 2. FINDINGS IN DETAIL

### P-1 (DEFECT, HIGH, Phase 21) — the trial-grant retry is unreachable in both directions

**Law.** Phase 21: "no silent permanent loss"; FQ-6.1's own contract
("FAILURE vs INELIGIBILITY: only a NETWORK-shaped failure stays queued",
`pendingCascade.js:18-20`).

**Trace.**

1. `_call` catches every RPC rejection and every returned `error` and converts
   both into a resolved `{ ok: false, error }` (`cascade.js:49-59`). The only
   statement outside its `try` is `getSupabaseClient()` (`:44`), which returns
   null rather than throwing on a missing client (`:45-48`).
2. `startCascade` returns that object. Every side effect in its ok-branch is
   individually wrapped (`:117-142`, `:152-162`), so the function has no
   realistic rejection path.
3. This is not an inference — it is a **pinned contract**:
   `src/lib/__tests__/payments.cascade.test.js:54-59`, "returns { ok: false }
   on RPC throw", drives `mockRpc.mockRejectedValue(new Error('network out'))`
   and asserts a resolved `{ok:false}`.
4. The consent screen's queue call lives inside
   `await cascade.startCascade().catch((e) => { ... queuePendingCascade(...) })`
   (`Article9ConsentScreen.js:145-156`). A promise that never rejects never
   runs that callback. **Nothing is ever queued**, and the `logError` beside it
   never fires either, so the failure is invisible in Sentry breadcrumbs too.
5. The same shape breaks the drain. `flushPendingCascade` does
   `await startCascade()` then unconditionally `clearPendingCascade(userId)`
   (`pendingCascade.js:67-75`), treating "a resolved round-trip" as a decided
   answer. Because a *failed* call also resolves, the first flush while still
   offline deletes the retry flag. The `catch` block that implements the
   network-vs-definitive split (`:76-85`) is unreachable.
6. Downstream, `FirstRunScreen`'s honest "your 14-day trial could not be set up
   yet" note (`:42-53`, `:96-105`) can never render, because
   `hasPendingCascade` is always false.

**Consequence.** A user who grants Article 9 consent on a dropped connection
silently receives no trial, sees no explanation, and is routed down the FREE
first-run stack. The entitlement itself is not destroyed (the server row stays
`unstarted`, so a later ProUpgrade tap still grants a full 14-day window —
`ProUpgradeScreen.js:249-266`), but the automatic grant, the retry and the
disclosure are all fiction. If they take the Free starter quiz first and start
the trial later, they then walk **two** onboarding flows (free quiz, then the
Pro wizard via `resetFirstRun`) and their starter plan is archived by
`archiveOtherUserPlans` (`planAutoGen.js:230`).

**Why the existing test did not catch it.** `fq6.billing.test.js:58-63` is a
source grep: it asserts the string `queuePendingCascade(user?.id, e)` appears
in the screen and `flushPendingCascade(userId)` appears in the runner. Both are
true. Neither can execute.

**Direction (not implemented — needs a D97 ruling).** The queue decision must
read the returned object, not a rejection: queue when `!r.ok &&
isNetworkShapedError(r.error)`, and in the flush clear only on `r.ok === true`
or a definitive `r.error`. Both are inside the FQ-6.1 surface the founder
already approved; no billing semantics, product ID, trial length or server
behaviour changes. A behavioural pin (not a grep) should replace/join the
existing source-grep test.

### P-2 (DEFECT, HIGH, Phase 20) — stale months are counted as coached months

**Law.** Phase 20 verbatim: "stale months are not treated as continuously
coached months"; Campaign 6 law 1 ("never convert absence into evidence") and
law 3 (no fabricated recovery assumptions).

**Trace.** `weeksInPhase` is elapsed wall-clock weeks since
`userProfile.phaseStartedAt`, with no activity, entitlement or logging input:

```
CoachOutputScreen.js:1600-1602
  const weeksInPhase = phaseStartedAt
    ? Math.max(1, Math.floor((Date.now() - phaseStartedAt) / (7 * 86400000)) + 1)
    : 1;
```

D97-7 fixed *when the clock is reset* (only on a genuine phase change,
`ProGoalSetupScreen.js:278-286`). It deliberately did not add any gap
semantics, so a Pro -> Free -> Pro user who never changes phase carries one
unbroken counter across the whole Free period. Consumers on the first run
back:

- `weeklyCoach.js:708` — `weekLabel: "Week ${weeksInPhase} · ${phase.label}"`,
  the headline of the decision card.
- `weeklyCoach.js:819` — `hasEnoughData = weeksInPhase >= 2 && enoughWeightData`:
  the phase half is permanently satisfied, so only the weigh-in density gate
  protects the returning user.
- `weeklyCoach.js:114-136` — `assessDataConfidence` downgrades to low only
  while `weeksInPhase < 2`; a returning user never gets that protection.
- `weeklyCoach.js:1257` — `weeksInPhase >= 6 && phase.isCut` adds a deload
  trigger.
- `weeklyCoach.js:1277-1296` and `nutritionEngine.js:1059-1082` — the diet
  break. The preferred branch uses `goalStartDate`, which
  `shouldSuggestDietBreak` turns into `weeksInDeficit` by plain subtraction
  (`:1066-1068`) with no adherence, logging or entitlement input; the fallback
  branch uses `weeksInPhase` directly. Either way the returning user is told
  **"You have been eating below maintenance for 34 weeks"** about a period in
  which they were Free, uncoached, and very possibly not dieting at all.

**Consequence.** The most quantified claim the app makes about the user's
recent life is fabricated at exactly the moment they pay again. It is
food-adjacent copy, so it also sits next to the ED-safety surface (the
suggestion direction is protective — a diet break — so no floor or gate is
weakened; the *claim* is the defect, not the maths).

**Relationship to existing records.** `CURRENT-LONG-TERM-JOURNEYS.md:298-305`
(B-1) recorded that the counter never resets, and `:507`, `:572`, `:714` noted
it keeps climbing through lapses. This finding is that observation carried into
the tier lane and quantified at the surfaces that speak it. It is **not** ruled
by D97-7 and is not pinned by `campaign6.nutrition.test.js` or
`campaign6.lapse90.test.js` (neither exercises the phase clock across a gap).

**Direction.** Two candidate rulings, both founder-facing because either
changes coach behaviour: (a) copy-only — the week label and diet-break lines
stop asserting continuity they cannot prove; (b) evidence-gated — the phase
counter's *claims* (not the phase itself) require a minimum density of real
logged weeks in the window. D91-25 is explicitly untouched by either: neither
decays learned ranges nor invents a freshness algorithm.

### P-3 (DEFECT, MED-HIGH, Phase 18) — the ledger scores a placeholder row as neutral readiness

`WorkoutSummaryScreen.js:795-804` writes a `weekly_checkins` row carrying only
`sleep_quality` whenever a lifter answered the pre-session sleep question. That
writer is **tier-blind** — Free users generate these rows by training.

FB-36 (FQ-2, D96) fixed the sibling reader:

```
blockAdvisor.js:60
  if (c.energyScore == null && c.sorenessScore == null && c.sleepHours == null) return null;
```

The block ledger's own readiness derivation never got the same treatment:

```
blockLedgerRunner.js:157-162
  const sleepFreeReadiness = (c) => {
    if (!c) return null;
    const energy = (((c.energyScore ?? 3) - 1) / 4) * 100;
    const soreness = (1 - ((c.sorenessScore ?? 3) - 1) / 4) * 100;
    return energy * 0.5 + soreness * 0.5;
  };
```

An evidence-free row scores exactly 50 and enters
`computeReadinessSlope` (`blockLedgerGather.js:124-128`), which filters nulls
but not fabricated midpoints. The slope is `(last - first) / 100` and feeds
`systemic.readinessSlope` into every muscle's classification, where
`readinessSlope <= -0.3` is a strain point.

**Consequence for Phase 18.** A block trained entirely on Free contributes
"check-in evidence" that no check-in produced. A genuine week-1 reading of 80
followed by a placeholder in the final week yields a -0.30 slope; the reverse
ordering manufactures an improving trend. The error is not
conservative-in-one-direction: it moves either way depending on row order.

**Direction.** Adopt the FB-36 guard verbatim in `sleepFreeReadiness` (return
null when energy and soreness are both absent). Nothing else in the ledger
changes; `countSleepFlaggedWeeks` already ignores unknowns
(`blockLedgerGather.js:130-138`).

### P-4 (DEFECT, MED-HIGH, Phase 18) — a sleep-only row satisfies the "completed check-in" gate

The founder decision behind the food-diary stand-in requires "a completed
check-in within 14 days" (`weeklyCoach.js:617-622`), and the engine reads it as
`checkinRecentEnough` -> `foodDiaryStandsIn` -> `canAdjustCals`
(`:943-964`). The screen supplies it as:

```
CoachOutputScreen.js:1843
  lastCheckinAt: recentCheckins[0]?.createdAt ?? recentCheckins[0]?.weekStart ?? null,
```

`getRecentCheckins` is an unfiltered `SELECT *` (`database.js:6125-6132`), so
row 0 can be the sleep-only placeholder. The same screen already knows the
correct test twenty lines earlier — `weekWasCheckedIn = checkin?.energyScore
!= null` (`:1499`) — and the notification scheduler applies it explicitly
("A row can exist from a completed workout (which contributes only
sleep_quality), so require a real check-in", `scheduler.js:483-488`).

**Consequence for Phase 18.** A freshly upgraded user who logs food and trains
but never completes a weekly check-in has the calorie-recalibration freeze
lifted by a row their *workout* wrote — a coaching decision resting on evidence
the user never gave. The ED-relevant framing in the founder decision ("the
cycle flag, energy score and most ED-detector signals only exist inside a
check-in") is precisely what the placeholder does not carry.

**Direction.** Pick row 0 among rows with `energyScore != null`, matching
`:1499` and `scheduler.js:487`. Engine untouched.

### P-5 (DEFECT, MED, Phases 18/20) — beginner copy for a mature upgrader

```
HomeScreen.js:1239-1246
  hadPriorBlocks = all.some((m) => m.id !== week.mesocycleId && m.blockLedger);
  setBlockSeedLines(buildBlockStartLines({ summary, previous, hadPriorBlocks }));
```

D97-16 added the mature variant so a template-seeded block would stop telling a
block-eight user they lack history (`blockExplain.js:80-87,204-205`). The
predicate it added, however, is "has a **stored ledger**", not "has trained
blocks". Ledgers exist only where something computed one:
`PlansScreen.js:270-276` (the decision card at `post_recovery`) or
`BlockReflectionScreen.js:159-165`, or lazily via
`backfillMissingBlockLedgers` inside seed building
(`blockLedgerRunner.js:339-359`) — a path only Continue-with-adjustments and
the restart flow reach.

A long-term Free user who switched plans, or simply never opened the Train tab
in the window where the decision card renders, therefore arrives at their first
Pro block with real blocks and zero ledgers, and the new block's start line
reads: *"Not enough personal history yet, so this block starts from
research-based guidance."*

**Consequence.** The addendum's REINSTALL/relationship clause bans "beginner
language for mature users", and Phase 18 requires that the upgrade "does not
pretend" — this pretends in the opposite direction, denying history the user
has. It is the exact class D97-16 was created to close, one predicate short.

**Direction.** Derive `hadPriorBlocks` from prior finished blocks (or run the
existing idempotent backfill at this read) rather than from stored ledgers.
No claim gets stronger: the mature line still says the block is
research-seeded.

### P-6 (DEFECT, MED, Phase 19) — "the same set targets as last time" can be the learned band

`resolveSeedRange` honours `intent === 'repeat'` **only inside the valid-ledger
branch** (`blockSeed.js:96-101`). When the finished block cannot be judged —
`INSUFFICIENT_DATA`, `deferredToManual`, or missing numbers (`:88-92`) — the
resolver falls through to step 3, the multi-block learned band
(`:151-161`), which takes no `intent` input at all. Steps 4 and 5 likewise
ignore it.

Two consequences, in the tier lane:

1. **Copy.** Both repeat surfaces promise an exact repeat —
   `NEXT_BLOCK_OPTION_LABELS.repeat` detail "Same workouts, and the same weekly
   set targets as last time" (`blockAdvisor.js:203`) and the confirm dialogue
   "the same workouts and the same set targets as last time"
   (`PlansScreen.js:372`). Where the fall-through fires, the next block starts
   at `learned.floor`/`learned.ceiling`, which is by construction *not* last
   time.
2. **Tier.** Free's only reachable intent is `repeat` — the adjust intent is
   locked twice (`PlansScreen.js:348-351`, and `seedIntent = intent ===
   'adjust' && tier === 'pro' ? 'adjust' : 'repeat'` at `:397`). So a Free user
   receives history-derived, multi-block volume seeding through the button that
   is supposed to be plain self-directed continuity. The stored row is even
   labelled `seed_learned` (`database.js:4201`), and Home renders its
   provenance clause "set by what past blocks have shown"
   (`blockExplain.js:70`) — an accurate personalisation claim on a tier that,
   by law, has no coaching.

**Not the D97-3 addendum.** That entry records the same fall-through as a
*staleness* bypass (the learned band has no clock, so a long-absent user routes
around the >= 4-week hold) and carries it to the founder as a freshness
question. This finding is orthogonal: it is about which **tier** and which
**button** may reach the band at all, and about copy that contradicts the
behaviour even for a same-week Pro user. Fixing one does not fix the other.

**Direction (founder/lead ruling — it is a product fork).** Either (a) a repeat
intent falls back to the finished block's own `observed` numbers, which the
ledger entry echoes even when the classification is INSUFFICIENT_DATA
(`interBlock.js:259-264`), before any learned/profile/research step; or (b) the
repeat copy stops promising an exact repeat in the cases where it cannot be
kept. (a) also removes the tier leak; (b) does not.

### P-7 (LATENT, MED, Phase 21) — the grant path fails open

```
cascade.js:122-131
  const ts = r.data?.trial_state ?? 'pro_trial_active';
  const nextTier = r.data?.tier ?? _resolveTier(ts, false);
  ...
  if (nextTier === 'pro') { await st.setTier?.('pro', 'cascade.startCascade'); }
```

A resolved-but-empty RPC response (`{ ok: true, data: null }` — reachable
whenever PostgREST returns a null body without an error) is read as a live
trial: the store tier becomes `pro`, `@volyume_tier` is persisted `pro`
(`useAppStore.js:765-770`), and `userProfile.trialState` is set to
`pro_trial_active` (`:133-141`). The user is then routed into the Pro wizard,
which generates a plan and nutrition targets, until the next
`refreshTierFromCloud` demotes them.

Its own caller applies the opposite rule and says so: *"Fail toward the
purchase sheet, never self-grant: a response with NO trial_state must not read
as a live trial"* (`ProUpgradeScreen.js:267-271`). Only the module-internal
default disagrees.

Severity is LATENT because the trigger requires a malformed-but-successful
response; it is MED rather than LOW because the failure mode is an invented
local entitlement — the one thing the FQ-6.1 contract, C-1 and migration 067
all exist to prevent.

**Direction.** Default `ts` to null and treat missing data as no grant, exactly
as the caller does.

### P-8 (LATENT, MED-LOW, Phase 19) — recovery coaching cards survive tier loss for 14 days

`getBlockAdvice` gates only the next-block narrative on entitlement
(`blockAdvisor.js:261-271`). The `early_deload` and `heads_up` branches
(`:443-490`) and the `signals` array are tier-blind, and D97-8's fresh-check-in
gate (`:402-405`) bounds them by *recency*, not by tier: a check-in within 14
days keeps them live. `PlansScreen` renders the card whenever
`blockAdvice.action !== 'continue'` (`:746-748`) with its headline, body and
signal chips (`:900-935`) and, for `early_deload`, its two acknowledgement
buttons (`:1083-1107`).

So in the fortnight after a trial expiry or a lapse, a Free user can still be
told "Your body is asking for a lighter week" with "Readiness a bit below your
personal baseline" chips — coaching output derived from Pro-only check-in data,
on a tier that by law has no coaching. A never-Pro Free user is unaffected:
their only `weekly_checkins` rows are the sleep-only placeholders, which
`checkinReadiness` now rejects (`:60`) and whose defaults are benign in
`detectSignals` (`:110,122,131`).

**Direction.** A lead ruling on whether the recovery-advice branches are
Free-visible at all. If they are meant to be Pro (the tab's own Free pitch says
the coach "reads your logs" only on Pro, `YouScreen.js:457-459`), the fix is
the same `isPro` thread that `buildNextBlockRecommendation` already takes.

### P-9 (LATENT, MED-LOW, Phase 18) — session sleep ratings narrated as weekly check-ins

`computeRecoveryTrendInsight` correctly filters nulls (`ReadinessCards.js:68-71`)
but reads `sleepQuality`, which is exactly the column the workout summary
writes tier-blind (`WorkoutSummaryScreen.js:795-804`). Its output sentence is
*"Sleep has been rated low for 3 weekly check-ins in a row"*
(`ReadinessCards.js:91-93`). For a newly upgraded user, all three rows can be
pre-workout sleep answers given while Free.

This is the Phase 18 clause "tier change does not manufacture check-ins that
never occurred" in copy rather than in maths, plus an unbounded age window (the
six most recent rows at any age, `:175`). The card is Pro-gated (`:169`), so
only upgraders see it.

**Direction.** Copy: name what the rows are ("sessions" / "recent ratings"), or
count only rows with a check-in marker.

### P-10 (LATENT, LOW, Phase 19) — the locally-expired trial reads two ways

`checkTier`'s C-3 guard flips the tier to free once `pro_trial_ends_at` has
passed but leaves `TRIAL_STATE_KEY` on `pro_trial_active`
(`useAppStore.js:706-714`). `SubscriptionScreen` resolves the plan word from
`store.tier` and the stage line from `userProfile.trialState`
(`:60-62,151-154`), so an offline user can read "Your plan: **Free**" above
"**Pro trial** - 0 days remaining". Both halves are individually defensible and
the next `refreshTierFromCloud` reconciles them; it is listed because Phase 19
asks that lock surfaces read truthfully.

### P-11 (LATENT, LOW, Phases 18/20) — ledgers are frozen with the tier that computed them

`PlansScreen` computes and persists the block ledger for **any** tier at
`post_recovery` (`:270-276`), which is deliberate and documented ("the ledger
itself stays tier-blind (it is workout evidence)", `:266-267`). The adapted
landmark layer inside it is not: `getAdaptedLandmarks` returns null for Free
(`effectiveLandmarks.js:117-118`), and the stored record is idempotent by
version (`blockLedgerRunner.js:109-114`), so it is never recomputed after an
upgrade. The persisted record has no tier field (`:263-270`).

The blast radius is small — the learned-range replay takes its ceiling from a
*fresh* `adaptedMrv` at replay time (`:395-399`), not from the frozen entry —
so the residue is limited to that one block's own proposal clamps, always in
the conservative direction (research MRV rather than an adapted ceiling).
Recorded for provenance completeness, not as a behavioural risk.

---

## 3. PER-SCENARIO TRACES

### Phase 18 — long-term Free user subscribes to Pro

| Step | Path | Verdict |
|---|---|---|
| Tap upgrade | `ProUpgradeScreen.completeUpgrade` `:232-297`. No client tier write; `syncAll` + `pullFromCloud` `:243-248` | OK |
| Trial eligibility | `cascade.canStillTrial(userProfile)` `:249` is a hint only; the **server's returned `trial_state`** decides (`:270-281`), falling through to the store purchase when it is not live | OK |
| Grant | `start_cascade` (migrate_095) sets `tier='pro'`, `trial_state='pro_trial_active'`, ledger row `ON CONFLICT DO NOTHING` | OK |
| Route to setup | `resetFirstRun` `useAppStore.js:1101-1125`; refuses mid-workout `:1102-1109`; clears the stale build record (RB-1) `:1119-1122` | OK |
| Plan build | `generateAndSavePlan` `planAutoGen.js:123-257` -> one new programme, `activatePlanWithBlock` `:223`, `archiveOtherUserPlans` `:230`. The prior Free plan is **archived, not duplicated or deleted**; kill-and-retry inside the wizard adopts the earlier plan rather than building a second (`ProOnboardingScreen.js:1194-1220`) | OK — no duplication |
| The abandoned Free block | `activatePlanWithBlock` truncates its `end_date` to today (D97-15, `database.js:3774-3783`); it stays judgeable and is judged lazily by `backfillMissingBlockLedgers` when a seed is next built | OK |
| Historical evidence available | Prior sets over a 180-day window `blockLedgerRunner.js:69,125`; adapted bands derive from workouts, tier-blind at source `database.js:5404-5424`; records wall reads all completed history (D97-18) | OK — Phase 18's "evidence where law allows" |
| Ledger/history replay | Only through the intended chain: `buildSeedRangesForNextBlock` -> `resolveSeedRange` (`blockSeed.js:52-174`) | OK |
| Fake prior coaching receipts | Provenance clauses speak about **blocks**, not coaching: "set by how your last block went" / "set by what past blocks have shown" (`blockExplain.js:68-72`). No surface claims prior coaching | OK |
| Manufactured check-ins | No writer outside the Pro-guarded screens (`saveWeeklyCheckin` from `WeeklyCheckInScreen`; `saveCoachOutput` only from `CoachOutputScreen`) — **but** the tier-blind sleep-only row leaks into three readers | **P-3, P-4, P-9** |
| First Pro recommendation | Template-seeded ramp (D97-9, ruled) with an honest source line — except that the mature/beginner variant is chosen on stored ledgers | **P-5** |

### Phase 19 — Pro to Free

**Trial expiry.** Server cron `cascade_advance_due_users`
(`migrate_031_cascade_workers.sql:76-85`) writes `cascade_expired` once
`pro_trial_ends_at <= now()`; `refreshTierFromCloud`
(`useAppStore.js:1001-1078`) mirrors it down and caches trial state; offline,
`checkTier`'s C-3 guard downgrades locally (`:706-714`, see P-10).
`reconcilePaidEntitlement` deliberately does not run for trials
(`cascade.js:281-282`), so no win-back episode opens
(`lapseDetect.js:17-18`) — by design.

**Subscription expiry / cancellation at expiry.** Play RTDN is the
authoritative revocation; the client safety net reads Play directly at launch
for `paid_pro` only (`cascade.js:279-363`), applies a 24-hour verification
grace both ways (`:255,295-296,344-354`), server-downgrades through
`cancel('client_reconcile')` (`:355-358`), and distinguishes an unverified
lockdown (local only, `useAppStore.js:637-648`) from a confirmed lapse.
`lapseDetect.isAuthoritativeLapse` (`:31-36`) only treats the confirmed case as
churn, and cancels the two daily weight prompts at that moment
(`:79-84`) — the prompts' only in-app switch is Pro-gated.

**Billing refresh.** `restore.js:30-88` is server-authoritative
(`payAt` optimistic unlock + `confirmPurchase` awaited); the client never
writes a paid tier (`cascade.js:168-190`).

| Requirement | Result |
|---|---|
| Coaching surfaces lock truthfully | `withProGuard` subscribes to the live tier (`ProGate.js:289-310`), so a tier change swaps a mounted CoachOutput/WeeklyCheckIn to the lock without a relaunch. Body metrics, photos and the food diary degrade to view-only (`RootNavigator.js:218-219,235`), matching the Manage-subscription copy (`SettingsAccountScreen.js:66`) |
| Past decisions stay readable | `CoachHeldHistory` is ungated and read-only (`RootNavigator.js:550`; `CoachHeldHistoryScreen.js` has no write path), reached from the Free branch of You (`YouScreen.js:503-515`) |
| No adaptive coaching applies while Free | Double lock verified (P-14). `runWeeklyCoach` has exactly one caller, the Pro-guarded screen (`CoachOutputScreen.js:1785`); `coachApply` has exactly one screen consumer (`:71`); session autoregulation is Pro-gated at the caller (`HomeScreen.js:1391`) and per-render (`ActiveWorkoutScreen.js:545,566`) |
| Pending proposal cannot apply after tier loss | The Coached auto-walk is inside the guarded screen and additionally bounded to the current cycle (D97-10, `CoachOutputScreen.js:2162-2179`); a tier drop unmounts it. No background or notification path applies anything |
| Recovery advice | **P-8**: the deload/heads-up branches are not tier-gated |
| Logged training accessible; plan usable | Nothing tier-driven deletes local data; the plan's already-written weekly volume rows continue to drive sessions through `getSessionWeeklyAllocation` (`sessionAdjustments.js:47-62`) — that is the plan, not new coaching |
| Coaching history uncorrupted | `coach_outputs` and `weekly_checkins` are untouched by tier; the profile push excludes tier entirely (`sync/tables/profiles.js:16-17`) |
| No fake local tier mutation | P-13. The only `setTier` calls are the beta-dead `activatePro` (`ProUpgradeScreen.js:160`, reachable only under `PRO_BETA_ACTIVE`, which is `false` — `proGate.js:28`), the trial-start belt-and-braces after a **server** grant (`:286`), and the downgrade lockdown (`useAppStore.js:647`) |
| Repeat still reachable | Yes — running your own plan again is training, not coaching (`blockAdvisor.js:199-208`) — but see **P-6** for what "repeat" can silently become |

### Phase 20 — Free to Pro again, months later

| Requirement | Trace | Verdict |
|---|---|---|
| No duplicate onboarding | `completeUpgrade` -> `canStillTrial` false -> `subscribePro()` (`ProUpgradeScreen.js:296`); the success view computes `needsSetup = !firstRunComplete` (`:437`), which is true only for a genuinely unfinished wizard | OK |
| No duplicate plan / block | No `resetFirstRun` on this path, so no `generateAndSavePlan` runs; the existing plan and block stand | OK |
| No duplicate trial | Server early-returns `already_started` for any non-`unstarted` state, and the email-hash ledger anchors one 14-day window for ever (`migrate_095:88-134,147-193`). Even a stale local profile that wrongly says "unstarted" only produces one no-op RPC | OK |
| Server entitlement authoritative | `refreshTierFromCloud` writes the server value and only refuses to demote inside the 5-minute optimistic purchase window (`useAppStore.js:1028-1033`) | OK |
| Pro restores coherently | Guarded screens re-mount live on the tier flip; stored targets, plans, blocks, records and coach history are all still local | OK |
| Stale months not treated as coached | **P-2** — the phase clock and diet-break counter count straight through | **DEFECT** |
| Old learned evidence per existing recency semantics | `backfillMissingBlockLedgers` judges the unjudged blocks at consumption time with a **real** `weeksOverdue` (`blockLedgerRunner.js:339-353` -> `interBlock.js:240-245` >= 4-week hold), so old evidence cannot climb. The pre-lapse *stored* ledger asymmetry is D97-3, already carried | OK (+ D97-3 carried) |
| Explanations honest | Provenance clauses and the mature research line are honest where the predicate is right — see **P-5** | Mostly OK |

### Phase 21 — trial retry, long-term (FQ-6.1 beyond onboarding)

| Scenario | Actual behaviour | Verdict |
|---|---|---|
| Grant fails (offline / no client) | `_call` returns `{ok:false}`; `startCascade` resolves; the consent screen's `.catch` never runs; **nothing is queued and nothing is logged** | **P-1** |
| App closes | No queue key was ever written (`pendingCascade.js:37-45` never called) | **P-1** |
| Opens next day, still offline | Consent is already recorded locally and in the store, so the consent screen — the only automatic caller — never runs again. The user is on the Free stack with no explanation (`FirstRunScreen.js:101-105` cannot render) | **P-1** |
| Reconnects | The sync runner calls `flushPendingCascade` on every trigger (`runner.js:167-173`), which returns immediately at `:66` because no flag exists | **P-1** |
| Retry succeeds | Only via a manual ProUpgrade tap, which grants a full fresh 14-day window (server row still `unstarted`) — so entitlement is not lost, but the grant is no longer automatic and the user may have taken the Free starter quiz first (double onboarding, starter plan archived) | Partial |
| Retry sent twice | Server-idempotent: the second call early-returns `already_started` (`migrate_095:88-134`). Concurrent flushes are additionally serialised by the runner lock (`runner.js:140`) | CLEAN |
| Reinstall before retry | AsyncStorage (and therefore any queue key) is wiped; the server row is authoritative, and consent already recorded means the automatic path is not re-entered. Recovery is the manual ProUpgrade tap | Documented gap (follows from P-1) |
| Second device sign-in | No local grant exists to conflict; the device reads `trial_state` from the server (`useAppStore.js:1004-1069`). The queue key is uid-scoped (`pendingCascade.js:27`), so it can never grant across accounts | CLEAN |
| Duplicate entitlement | Impossible: one row per email hash, `ON CONFLICT DO NOTHING` (`migrate_095:207-210`) | CLEAN |
| Trial extension exploit | Impossible: the resume branch anchors `pro_trial_ends_at` to `first_trial_at + 14 days`, never `now()` (`migrate_095:105-110,155-160`) | CLEAN |
| Ineligible user granted | Server refuses (`cascade_expired`, tier free, `:175-192`). Client-side, the only self-grant risk is the fail-open default | **P-7** |
| Authoritative server state wins | Yes, everywhere the client routes on the RPC's **returned** `trial_state` (`ProUpgradeScreen.js:270-281`) — except the same default | **P-7** |

---

## 4. VERIFIED INVARIANTS

| # | Invariant | Evidence | Status |
|---|---|---|---|
| I-1 | The client never writes a paid tier; the server owns tier | `cascade.js:168-190`; `sync/tables/profiles.js:16-17`; migration 067 | HOLDS |
| I-2 | The only local tier writes are a server-confirmed trial mirror and a conservative downgrade lockdown | `useAppStore.js:637-648`; `cascade.js:125-132` | HOLDS (see P-7 for the fail-open default) |
| I-3 | "Manage subscription" performs no tier mutation and hands off to the platform | `SettingsAccountScreen.js:45-82`; pinned `fq6.billing.test.js:78-93` | HOLDS |
| I-4 | Free cannot reach Continue-with-adjustments, at either the advice layer or the write layer | `blockAdvisor.js:246-271,349-351` (defaults false); `PlansScreen.js:348-351,397` | HOLDS |
| I-5 | Adaptive next-block seeding requires `intent === 'adjust'` **and** `tier === 'pro'` | `PlansScreen.js:397` | HOLDS |
| I-6 | `runWeeklyCoach` and `coachApply` are reachable only from Pro-guarded screens | sole callers `CoachOutputScreen.js:1785,71` | HOLDS |
| I-7 | Coach outputs and check-ins are written only by Pro-guarded screens | `database.js:6793` / `:6011` callers; `RootNavigator.js:208,224` | HOLDS (the tier-blind `sleep_quality` row is the documented exception, P-3/P-4/P-9) |
| I-8 | A tier change re-renders guards live (no relaunch needed to lock or unlock) | `ProGate.js:291,307,330` subscribe to `s.tier` | HOLDS |
| I-9 | Nothing tier-driven deletes local training, coaching or nutrition history | no tier reference in the sync tables or any delete path | HOLDS |
| I-10 | Upgrade creates exactly one active plan and one active block; the previous plan is archived, not duplicated | `planAutoGen.js:223-230`; `database.js:3746-3797` (single transaction, D97-12/15) | HOLDS |
| I-11 | An abandoned block keeps its evidence and becomes judgeable, never deleted | `database.js:3774-3783`; `blockLedgerRunner.js:339-353` | HOLDS |
| I-12 | Old block evidence cannot climb after a gap: the >= 4-week hold applies at backfill time | `interBlock.js:240-245`; `blockLedgerRunner.js:255-260` | HOLDS |
| I-13 | The server trial RPC is idempotent, window-anchored, and one-per-email | `migrate_095:88-134,147-210` | HOLDS |
| I-14 | The retry queue is uid-scoped and never touches tier | `pendingCascade.js:27,37-56`; pinned `fq6.billing.test.js:65-68` | HOLDS (but never armed, P-1) |
| I-15 | Trial structure is fixed: 14-day cardless in-app, then the store's 7-day intro offer, then paid | `migrate_095:196-206`; `cascade.js:144-151`; `catalogue.js` product IDs unchanged | HOLDS — settled law, not audited as a question |
| I-16 | Suppression (calm mode / open ED flag) is read fail-closed in the ledger and is tier-blind | `blockLedgerRunner.js:77-83`; `blockSeed.js:16-24` | HOLDS |
| I-17 | Free users' own history (records, PRs, plans, logged sessions) remains fully readable after a lapse | `withReadOnlyProGuard` trio `RootNavigator.js:218-219,235`; `CoachHeldHistory` ungated `:550` | HOLDS |
| I-18 | No coaching-history claim survives that says the app coached a Free period | provenance clauses are block-scoped `blockExplain.js:68-72` | HOLDS (P-9 is a copy exception about check-ins, not coaching) |

---

## 5. DEVICE VERIFICATION (for whoever actions these)

Physical Android device, EAS build (native modules present).

1. **P-1.** Put the device in aeroplane mode at the Article 9 consent step of a
   brand-new account, grant consent. *Expected today:* the app proceeds to the
   Free name screen with **no** "trial could not be set up" note. Reconnect and
   background/foreground to force a sync. *Expected today:* still Free, no
   trial. (After a fix: the note appears, and the trial lands on reconnect.)
2. **P-2.** On a Pro account with a cut phase set months ago, read the coach
   card header and any diet-break line. *Expected today:* a week number and a
   "weeks below maintenance" count that includes every uncoached week.
3. **P-4.** As Pro, log five days of food and a workout answering the
   pre-session sleep question, complete **no** weekly check-in. *Expected
   today:* the calorie-recalibration freeze is lifted.
4. **P-5.** Free account with at least one finished block whose decision card
   was never opened; upgrade and finish the wizard. *Expected today:* Home's
   block-shape lines read "Not enough personal history yet".
5. **P-8.** Let a trial expire with a check-in from the last few days on file,
   then open the Train tab. *Expected today:* the recovery card and its signal
   chips still render on Free.
6. **ED-safety cases (all of the above).** With calm mode on or an open ED
   flag: no weight, streak or photo language appears on any of these surfaces;
   the calorie floors are unchanged; the ledger's suppression read stays
   fail-closed. None of the findings above proposes lowering a floor, widening
   a threshold, or making any guardrail tier-aware.

---

## 6. WHAT THIS AUDIT DID NOT CHANGE

No code, no tests, no migrations, no configuration. `docs/long-term-audit-2026-08-11/AUDIT-TIER-TRANSITIONS.md`
(this file) is the only artefact produced. Every finding above is recorded as
evidence plus a direction; none has been implemented, and P-2, P-6 and P-8
carry explicit ruling forks rather than a chosen answer.
