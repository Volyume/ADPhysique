# REVIEW E — the nine-month paying user

Campaign 6, ADVERSARIAL REVIEW E (the LONG-TERM RELATIONSHIP review).
Read-only audit. Nothing in `src/`, no test, no migration and no other
document was modified to produce this file.

**Authority.** The founder's Campaign 6 addendum, restated verbatim in the
compliance recovery order: Review E answers **twelve** enumerated questions.
The nine-question framework in `ATHLETE-180-REPORT.md` is a lead-derived
analysis structure and is superseded as a commissioned requirement
(`D97-RULINGS.md`, "D97-21 CORRECTION"). The twelve below are the founder's
own words, answered in order, none substituted.

Binding on every answer: Section 2 inviolables, the addendum's banned-copy
lists (no anthropomorphic language, no invented percentages, no
guaranteed-outcome claims, no manipulative retention), the saturation
restraint rule, and D33 (best-for-user, never effort).

**Method.** Posture: sceptical nine-month paying subscriber. I did not take
the campaign's own documents as evidence. Every claim below is one of
(a) a number or string I produced by driving the REAL shipping modules in a
scratch probe, (b) a `file:line` I opened myself, or (c) an existing suite I
ran. Where the honest answer is weak, it is stated as weak.

- **Probes** (scratchpad only, read-only against `src/`): three Jest probes
  driving the real pure chain `profileAdjustedPrior -> computeLearnedRange ->
  resolveSeedRange -> buildSeededWeeklyTargets -> classifyMuscleBlock`, then
  the real copy builders `summariseSeededPlan -> buildBlockStartLines /
  buildSeedReceipt / buildLedgerReflectionRows / recoveryProposalLine`. Every
  quoted string and every number in this file is probe output or source text,
  not paraphrase.
- **Suites run:** `campaign6.*` (9 suites; 159 tests at first run, 165 after
  the concurrent landings noted below, all pass both times) and the full
  bar `npm test`, four consecutive times. Runs 2, 3 and 4:
  **829 passed, 1 skipped, 10,121 passed / 10 skipped, 17 snapshots**. Run 1:
  **1 failed** (see RE6-5).
- **Evidence base tested rather than trusted:** `PERSONALISATION-DIVIDEND.md`,
  `CHOICE-MEMORY.md`, `RELATIONSHIP-MOMENTS.md`, `ATHLETE-180-REPORT.md`,
  `REINSTALL-MATRIX.md`, `D97-RULINGS.md`, `TRIAGE-2026-08-11.md`,
  `WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md`.
- **Cited, not re-found** (known founder-gated or open): B1/B2/B4 copy
  candidates, D97-3, D97-9, D91-25, D92-11, FR-C4-2, FR-C4-3, F3, F9, M-21,
  R-18.
- **Tree movement during the review, disclosed.** `src/lib/interBlock.js`,
  `src/lib/effectiveLandmarks.js` and `src/lib/blockAdvisor.js` were changed by
  a concurrent lane part-way through this review (the D97-25 RA6-1 / RA6-2 /
  RA6-5 / RA6-11 landings). **Every probe in this file was re-run to completion
  against the post-change tree and every quoted number and string reproduced
  byte-identically**; `campaign6.*` re-ran at 9 suites / 165 tests green, and
  the three touched suites at 90 tests green. RA6-1 (only a real edit counts as
  a manual landmark) slightly widens the population that can reach RE6-4's
  'adapted' branch; it does not change the finding.

---

## THE TWELVE QUESTIONS

### 1. What does Volyume know about my training now that it did not know on Day 1?

**Answer: a per-muscle working band and a per-muscle prescription that are
materially different numbers from the ones a stranger with my profile would
get, in both directions.** I reproduced the commissioned counterfactual from
scratch rather than reading it.

Intermediate profile, lean gain, age 31. Chest, six blocks, real evidence
every block:

| | Block 1 | Block 6 WITH my history | Block 6 WITHOUT my history |
|---|---|---|---|
| Chest week-1 sets | 6 (`source: 'profile'`) | **11** (`source: 'ledger'`) | 6 (`source: 'profile'`) |
| Chest weekly ramp | `[6,10,15,19,23,6]` | `[11,14,17,20,23,11]` | `[6,10,15,19,23,6]` |
| Chest recovery week | research MEV (6) | **11**, sized from my own block | research MEV (6) |
| Calves peak | 21 | **15** | 21 |

The chest climb is not a ratchet: it is exactly +1 per earned dose-response
pair, and the probe shows the increment refused when the pair sits inside a
suppressed block. The calves number is the more interesting half: six months
of evidence honed the ceiling **down** from 21 to 15, because my calves never
actually handled 21. Personalisation protecting me, not flattering me.

What it also knows: my applied and ignored coaching decisions with receipts
(`coachApply.js:296-314`), my manual volume overrides and that they must never
be laundered back as "learned" (`interBlock.js:140`, `learnedRange.js:136-138`),
my complete lift history and records unbounded (D97-18 / P10-1), and a
calorie target that has moved from the Mifflin/Katch output by my own weight
and intake data.

**The honest limit, which I found by probing rather than reading:** the
learned band remembers my *capacity* (the ceiling) but has no memory of my
earned *start*. The floor is monotone downward only from the profile MEV
(`learnedRange.js:52,170-178`), so for a user who only ever progresses, the
learned band is permanently identical to the Day-1 prior. In my six-block
chest arc the band is `{floor 6, ceiling 23}` and the prior is `{mev 6,
mav 23}`: byte-identical after six qualifying blocks. See RE6-1 and RE6-2.

**Verdict: STRONG.**

---

### 2. Can I SEE that difference?

**Answer: only one block at a time, only in numbers, and only behind a tap
most users will never make.** This is the weakest answer in the review.

What I can see, quoted from the probe, is the block-start line:

> "Chest: 11 sets in week 1, building to 23 by week 5, then a recovery week
> (set by how your last block went, up from 10 in week 1)."

That compares me to **last block**. The +5 sets versus Day 1, and the calves
peak coming down 6, are never stated anywhere. Nine months of dividend is
delivered as a sequence of +1s, each of which reads as trivial.

Where it lives: `HomeScreen.js:1184-1248` builds the lines, and they render
only inside `HomeBlockShapeSheet`, which opens from one place, the meso chip
at `HomeScreen.js:2014-2032`. The chip's visible label is
`Block week N of M - stop 2 short of failure`
(`readinessSummary.js:133-137`); its accessibility label offers "the shape of
your training block and what the effort target means". Neither says "here is
why your numbers are what they are". A user who never taps a chip about
effort targets never reads a word of the personalisation story. This
discoverability caveat is already recorded at `RELATIONSHIP-MOMENTS.md` A1 and
deliberately not proposed as work under the saturation rule, so I cite it
rather than re-raise it.

The one screen where I would actually ask the question, the volume screen
which is also the manual-override editor, shows the resolved number with no
source beside it: `mergeLandmarkPrecedence` drops `note`, `dataPoints` and
`netScore` at `effectiveLandmarks.js:52-56`, and three of the four consumers
throw `.source` away outright. That is candidate B1, founder-gated.

The commissioned feasibility lane looked at building a dedicated "what
Volyume has learned" surface and ruled **C, not worth a new surface**
(`WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md`). I agree with the reasoning
(candidate 1 is blocked on the exact age semantics D91-25 defers), but the
consequence for me as a paying user stands: the app is more personal than it
can show, and it is not close.

**Verdict: WEAK.**

---

### 3. When I give feedback, do I later see evidence that it mattered?

**Answer: yes at three distinct grains, with receipts, and one of the three
does not survive a reinstall.**

- **Same session.** A readiness answer produces a visible adjustment with its
  reason and its referent, plus a one-tap revert:
  `ActiveWorkoutScreen.js:4044-4060` renders "Adjusted today", the reason
  string from `algorithms.js:1186-1191`, and "Last trained Tuesday." beside
  it. Two logged reverts put that muscle on a permanent hold for the rest of
  the block (`algorithms.js:1136-1138`). That is the app losing an argument to
  me and staying lost.
- **Same week.** Nothing applies without a tap (`coachApply.js:2-6`); a
  proposal only reaches the session engine once it is a persisted applied
  target (`sessionAdjustments.js:137-149`); the receipt survives the screen's
  own remount re-save (`database.js:6741-6790`) and a reinstall.
- **Across weeks.** The scorecard: "Weeks you applied the call and the next
  trend landed on target: {n} of {m}." (`CoachHeldHistoryScreen.js:167-188`).
  It only verdicts a decision against the calendar-consecutive next week
  (`coachOutcome.js:55-58`), hides below a two-week sample, and is suppressed
  entirely under an ED flag or calm mode. It can report against itself, which
  is the strongest single trust signal in the product.

**The gap I would feel.** The Engine Log on that same screen reads
`adaptation_events`, and a reinstall restores those rows into
`adaptation_events_sync`, which nothing reads (S-4 / FR-C4-3, founder
architecture question). So on a new phone the record of "you told the engine
no, twice" is gone, and with it the six-week revert memory. Cited, not
re-found.

**Verdict: ADEQUATE** (STRONG on one device; the reinstall hole is real and
already on the founder queue).

---

### 4. Does the app remember choices I explicitly made?

**Answer: yes, 29 of 39 inventoried choices, and I spot-checked the fixes
rather than believing them.**

Verified in code myself:

- Block-decision snooze is per user now:
  `BLOCK_SNOOZE_KEY_FOR = (uid) => '@volyume_block_snooze_' + uid`
  (`PlansScreen.js:48`), used at `:304,424,443` (F8, fixed).
- The insight dismissal ratchet is real: `database.js:8040-8049`, a pulled
  row whose `dismissed_at` is null can never clear a local non-null one
  (F5, fixed). This is what "users never re-reject the same stale proposal"
  needs.
- Manual volume overrides are the best-protected preference in the app:
  immediate push, write stamp, guarded pull, and they suppress ledger
  teaching for that muscle so my own numbers can never be sold back to me as
  "learned from your history" (`interBlock.js:140`,
  `learnedRange.js:136-138`).
- An allergen list can never be unset by a pull
  (`sync/tables/profiles.js:248-253`). Correct, and the right instinct.

Still forgotten, all recorded and none hidden: next-time coaching notes are
lost on reinstall because the local table is `workout_notes` while the synced
pair operates on `workout_notes_v2` (F3, verified at `database.js:8528,8546`
versus `:7056-7061,8082-8085`; needs a migration, founder-gated); position in
the plan rotation (`next_workout_index`, F7); the first post-reinstall
session runs before the profile blob rehydrates (F4 residual); and the
notification-pref dual family (FR-C4-2).

One that would genuinely annoy me at month nine: **a revert expires after six
weeks and nobody told me.** `getRecentAdaptationEvents(userId, 6)`
(`sessionAdjustments.js:127`) is the entire law. Come back from a two-month
break and the +1 I refused twice can be offered again. F9 is correctly on the
founder queue as "how long does a user's refusal stand?" rather than being
quietly answered by a query parameter.

**Verdict: STRONG** (with F9 the one open question I would actually ask
support about).

---

### 5. Does it notice meaningful progress specifically rather than giving generic praise?

**Answer: yes. I could not find a single unanchored compliment in the app
voice.**

Every recognition string I traced names a real referent:

- `"All 5 sessions in this week, with 2 new PRs."` and
  `"3 of your 4 sessions in this week"` (`coachResponse.js:75-92`);
  `buildAcknowledgement` returns **null** rather than inventing something when
  there is nothing real to name (`:66-80`).
- `"You've trained 11 of the last 21 days. Steady work. This is what progress
  looks like."` (`insightsEngine.js:221-226`), the card closest to filler in
  the app, and it still states a real count.
- `"You hit the top of your rep range on Barbell Row twice in a row."`,
  `"Incline Press has been stuck at the same weight for 4 sessions but you've
  had reps left in the tank."` (`insightsEngine.js:139-165`). Exercise named,
  window named, evidence named.
- Milestones are count-anchored, not adjective-anchored: "Twenty-five
  sessions logged. That is a genuine training history behind you now."
  (`milestones.js:70-73`).
- Records are gated: no first-exposure records (FQ-7), warm-ups and cluster
  rows excluded from estimated-max candidacy, and the records wall reads all
  completed history rather than a 200-row window (D97-18, R-15). A PR that
  is not a PR is the fastest way to make recognition worthless, and that hole
  is closed at the writer.

The softest edge I found is "One hundred sessions logged. You've built
something most people only talk about." (`milestones.js:82-85`). It is a
comparison to other people rather than to my data, but it is bounded by a
real count and it fires once, ever. I would not call it a defect.

The repo-level ban is enforced mechanically (`campaign6.longTerm.test.js:119-165`),
and my own independent grep for boast and flattery vocabulary across
`src/screens`, `src/components` and `src/lib` returned only user-voice strings
("Skip, I'll choose myself"), form tips and code comments.

**Verdict: STRONG.**

---

### 6. When nothing changes, can I tell whether that was intentional?

**Answer: for five of the six non-change states, yes, in distinct words. For
the sixth, no, and the silence is the misleading one.**

Probe output, three flavours of "nothing changed" rendered side by side from
one receipt:

> "1 other muscle group stayed where it was. Keeping a dose that worked is a
> decision too. 1 more muscle group stayed where it was: there wasn't enough
> clear evidence this block to judge it, so nothing was moved on a guess.
> 1 muscle group is on your own settings and was left exactly there."

Working hold, insufficient-evidence hold and user-choice hold, in one
sentence each, none of them collapsing into "No changes". On the nutrition
side there are seven distinct held reasons, each naming its own cause
(`weeklyCoach.js:1546-1557`): trend on target; last adjustment needs more
weeks; N more weeks of the same trend needed; food not tracked so a change
would be a guess; wellbeing screen flagged restriction; cycle flagged so the
weight reading is not reliable; plus the FFM-floor and ED-lockout holds
above. And it refuses to stack a generic "calories held" under the ED
lockout, because two explanations dilute the safety message.

A reduction is also narrated rather than left silent. Probe, calves block 3:

> rationale: "Calves responded well at this dose, so the starting volume
> carries over unchanged and the peak comes down."

**The one that is silent.** `upwardCarryPrevented` is set on the ledger entry
only when the calm-mode or ED-flag hold genuinely bit
(`interBlock.js:234-245,265`; M-6 fixed it to fire on the upstream veto too).
My probe confirms it: a RESPONSIVE block under suppression returns
`upwardCarryPrevented: true` with the rationale "Chest responded well at this
dose, so the starting volume carries over unchanged" - identical wording to a
block that simply had no earned climb. Nothing reads that flag. So the one
state where the app is holding me back on my own instruction is the one state
it does not name. That is B2, founder-gated because calm and ED are
deliberately ORed and separating them in copy would expose detector state.
Cited, not re-found.

**Verdict: ADEQUATE.**

---

### 7. Does the product admit uncertainty?

**Answer: yes, and it is willing to say the unflattering version.**

- Confidence is stated in the user's units of evidence, not as a percentage:
  `"Early estimate, from 2 weeks of data"` / `"Firming up, from 5 weeks of
  data"` / `"From 9 weeks of data"` (`weightTrend.js:26-33`). No invented
  precision, which is the addendum's own ban.
- The adaptive TDEE path will not run at all below fourteen morning weights
  (`weeklyCoach.js:975`), and since R-1 a stale series **holds** rather than
  adjusting.
- A block it cannot judge says so, with the number. Probe:
  > "Chest was logged for about 43% of its planned sets this block, too little
  > to judge the response, so the next block starts 6 sets lower."

  Classification `INSUFFICIENT_DATA`, `confidence: 0`, evidence
  `{ signal: 'insufficient', value: 'adherence' }`.
- A first block refuses the personalisation claim outright:
  > "Not enough personal history yet, so this block starts from research-based
  > guidance. As blocks finish, each muscle's starting point comes from how it
  > actually responded."

  and a mature user whose block is template-seeded gets the variant that does
  not deny their history (D97-16 / P-5):
  > "This block starts from research-based guidance for this plan. Your block
  > history picks up again as its blocks finish."
- A mixed block names its research remainder rather than letting three
  confident lines read as "all of this is personalised":
  > "The rest still start from research-based guidance, until they have a
  > block behind them."
- Where a proposal is genuinely mine to make, it says so:
  > "Several strain signals ran together this block, so a longer recovery of
  > about 10 days is suggested before the next one starts. Your call."

**Verdict: STRONG.**

---

### 8. After a lapse, does it remember me without pretending stale evidence is current?

**Answer: mostly yes, with real mechanisms I verified, and two asymmetries
that are open founder decisions rather than accidents.**

What holds, checked at the mechanism:

- Present-tense recovery advice requires a check-in inside 14 days (D97-8);
  the Home readiness caution requires a session inside 14 days (R-6); an
  undated session cannot prove recency.
- Consecutive-week counters require calendar adjacency (D97-5), so "second
  consecutive poor week" cannot be assembled from an ancient week and today.
- The session-adjustment +1 branch no longer fires on feedback older than the
  14-day detraining boundary (D97-4). A six-month-old "easy, mild pump" no
  longer certifies readiness for more volume.
- A months-old reviewed-but-unapplied coach output can no longer execute
  itself into today's block (D97-10).
- Week labels count coached weeks, and after a genuine gap the diet-break copy
  states the cut's set-age rather than continuous under-eating (P-2).
- The win-back push claims storage, not analysis:
  > "Still lifting. 12 sessions since March." /
  > "Your training history is all saved, and everything is ready whenever you
  > are."

  R-17 specifically removed "your trend data never stopped" because it edged
  toward claiming analysis continued during the absence. That is the right
  instinct applied to itself.

**The two asymmetries.** I quantified D97-3 rather than describing it. Same
block, same evidence, judged at block end versus judged twelve weeks later:

| | Judged at block end | Judged 12 weeks later |
|---|---|---|
| proposal.startSets | 11 | 10 |
| rationale | "...so the next block starts 1 set higher." | "...so the starting volume carries over unchanged." |
| `upwardCarryPrevented` | false | true |
| evidence | (no age marker) | `{ signal: 'evidence_weeks_old', value: 12 }` |
| resulting seed | start 11, deload 11 | start 10, deload 10 |

So the returner who happened to open the decision screen before their layoff
is offered the fresh-time climb, and the one who did not is held. One set.
Bounded, contained by the 5-week ramp, the 10% load cut on 7-day exercise gaps
and FQ-3, and correctly carried as a founder decision because any fix is the
freshness semantics D91-25 defers. And the app **computes** the
`evidence_weeks_old` marker and then says nothing about it (B3).

The second asymmetry is worse for a mature user and is RE6-2 below: an
abandoned or badly-logged block classifies `INSUFFICIENT_DATA`, which
`resolveSeedRange` treats as no valid ledger, and the fallback rung has no
memory of an earned start at all.

The layoff line itself knows the gap and never names it: the multiplier fires
on a set older than seven days and the copy is the same for eight days and
five years (`algorithms.js:584-586`). That is B5, routed to the D97-3 triage.

**Verdict: ADEQUATE.**

---

### 9. Does it ever claim to understand me more deeply than the data justifies?

**Answer: rarely, and the campaign's "C = 0, no surface overclaims" is very
nearly right. I found two small exceptions it missed, both copy-only.**

`RELATIONSHIP-MOMENTS.md` Part 3 records zero overclaiming surfaces. I went
looking specifically to break that, and the big claims all hold: the seed
lines derive from the **written** `planned_muscle_volume` rows so a skipped
insert cannot be narrated as applied; ledger rationales are composed from the
final clamped numbers so the words cannot contradict the proposal; the
"Automatic" tone description is literally true; the readiness-off consequence
copy is literally true. The strongest single guard is that the adaptive band's
own note strings ("You recover well here") are computed and never surfaced,
because a capacity claim from a plus-or-minus-four-set heuristic has no
business in front of a user.

The two exceptions:

- **RE6-1.** `seed_learned` renders "set by what past blocks have shown" on a
  band that can be byte-identical to the untouched profile prior. In my
  six-block chest arc the learned band is `{floor 6, ceiling 23, isLearned
  true, evidenceBlocks 6}` and the profile prior is `{mev 6, mav 23}`. The
  clause is gated on `evidenceBlocks > 0`, not on any bound having actually
  moved, so the app can attribute the Day-1 research number to my history.
  The rendered line: *"Chest: 6 sets in week 1, building to 23 by week 5,
  then a recovery week (set by what past blocks have shown, down from 12 in
  week 1)."*
- **RE6-4.** The workout-summary volume tooltip switches on
  `Object.values(landmarkResolution.source ?? {}).includes('adapted')` and
  then makes a plural claim about every range shown: *"These ranges start
  from research values and have adjusted to your own logged response."*
  (`WorkoutSummaryScreen.js:1475-1477`). One adapted muscle out of twelve
  earns a sentence about all of them.

Neither is a fabrication; both are scope creep in a clause. Both are the same
family as the founder-gated B1 copy pass and belong in it.

**Verdict: ADEQUATE.**

---

### 10. Does it feel supportive without pretending to be a person?

**Answer: yes, and this is the cleanest result in the review.**

I ran my own scan rather than trusting the repo's banned-phrase walker, with a
wider list: first-person voice, claimed feelings, claimed knowledge of me,
shared-journey language. Across `src/screens`, `src/components` and `src/lib`
the only hits were the user's own voice on a button ("Skip, I'll choose
myself", `FreeStarterScreen.js:363-366`), exercise form tips, and code
comments. Nothing in the app voice says "I", claims to feel anything, or
claims to know me.

The one legitimate first-person warmth in the tree is the partner
acknowledgement set, which is a **human** partner's words to a human, a
founder-authored closed enum, and correctly exempted. A person may be proud;
the engine may not. That distinction is drawn in the right place.

The support that does exist is structural rather than performed: a lapse is an
absence and never a shown state, the run number simply stops, and no shame
copy exists in the streak module at all (`streak.js`, `ConsistencyEcho.js`).
A deload week keeps the run, because "recovery is compliance, never a miss".
The whole echo is suppressed under an open ED flag, a SCOFF score of 2 or
more, or calm mode, and fails closed on a read error. The register choice
(Supportive / Precise) changes voice only, with parity invariant tests that
fail if a fact or a decision ever diverges between the two
(`coachRegister.js:89-97`).

**Verdict: STRONG.**

---

### 11. Is there a genuine utility-based reason I would rather continue with Volyume than start from zero in another training app?

**Answer: yes, and I can put a number on it, which is the test that matters.**

The reason is not "my data is in here". It is that the prescription itself is
different and better-founded than a cold start:

- Chest starts at **11 sets** instead of 6, and my recovery week is sized to
  **11** from what I actually did, instead of a flat research MEV of 6.
- Calves peak at **15** instead of 21, because six months of evidence showed
  21 was never handled. A new app would put me back on 21 and let me find out
  the hard way.
- My manual overrides sit at the top of the precedence chain and cannot be
  laundered back as coaching.
- The record set is complete, gated and unbounded: no first-exposure records,
  no cluster rows inflating estimated maxima, and the wall reads all completed
  history rather than a rolling window.
- The nutrition target is a calibrated number with a receipt history, not a
  fresh Mifflin output.

And the counter-test, which is the honest half: **the app does not hold me
hostage to any of it.** `exportBackup()` writes the entire local database plus
every preference into one plain JSON file and hands it to the system share
sheet (`dataBackup.js:52-83`), with entitlement and payment state
deliberately excluded so a backup can never be crafted into a tier unlock.
Account deletion is real and wipes local storage, SQLite and secure store.
The reason to stay is utility, and the door is genuinely open. That is the
strongest possible version of this answer.

Caveat I would want fixed before recommending it to a friend on a second
device: cross-device provenance for planned volume is release-gated on
migration 132, so until that runs a clean device restores planned rows with
provenance degraded to an honest 'template' (`REINSTALL-MATRIX.md`, S-11).

**Verdict: STRONG.**

---

### 12. Is any retention mechanism manipulative, guilt-based or artificially locking me in?

**Answer: no. I looked for the standard patterns and found none to remove.**

My own scan across `src/screens`, `src/components` and `src/lib` for urgency
and loss-aversion vocabulary ("you'll lose", "last chance", "expires soon",
"only N days left", "act now", "limited time", streak threats) returned
**zero** matches outside tests. That is not a claim from a document; that is
the grep.

Specifically:

- **Win-back.** One push per lapse episode, plus an absolute floor of one per
  180 days kept across episodes (`winbackState.js:39,64-68,155-160`). The
  message is my own numbers with no offer clause, no discount and no urgency,
  and a zero is never shown: the no-sessions case falls back to "Your training
  is saved." A stated break is acknowledged rather than ignored: "You said you
  might be back around now."
- **Streaks.** No streak anxiety exists to remove. A lapse is an absence, the
  manual weekly goal is never auto-raised by a plan (the lower of routine
  count and manual goal wins, `useWeeklyStreak.js:112-119`), pauses are
  renewable without limit, and the whole surface is suppressed under calm mode
  or an ED flag.
- **Cancellation.** The reason enum is shame-free and every answer is
  optional: "It costs too much", "I wasn't using it enough", "It's missing
  something I need", "I'm switching to another app", "I'm taking a break from
  training" (`cancelReason.js:20-26`). "I'm switching to another app" being
  offered as a first-class answer is the tell that this was written honestly.
- **Notifications.** The addendum's ban on converting utility pushes into
  retention mechanics is respected: the win-back is the only push that speaks
  about my history, and its cadence is hard-bounded.
- **Lock-in.** Full JSON export, real deletion, no proprietary trap.

One open item that is prompt *pressure* rather than manipulation, already on
the founder queue: the weigh-in prompts have no inactivity stand-down, which
is roughly 360 pushes over 180 days for a lapsed Pro user (R-16, blocked as
new notification policy under NOTIFICATIONS_LOCKED). Weight-adjacent nagging
at a user who has stopped training is the one place I would expect this app to
be better than it currently is, and it is correctly a founder ruling rather
than a silent change.

**Verdict: STRONG.**

---

## FINDINGS (new only)

Anything already recorded in the campaign's own registers is cited above and
deliberately excluded here.

| ID | Finding | Class | Sev | Evidence |
|---|---|---|---|---|
| **RE6-1** | `seed_learned`'s clause "set by what past blocks have shown" renders on a learned band that can be byte-identical to the untouched profile/research prior. `isLearned` gates on `evidenceBlocks > 0` (`learnedRange.js:183`), never on a bound having moved, so the Day-1 research number is attributed to the user's history. Not an edge case: for any user who only progresses upward the floor never moves (monotone downward only, `learnedRange.js:52,170-178`) and the ceiling stops moving once `achievedPeak` reaches the prior MAV. Contradicts `RELATIONSHIP-MOMENTS.md` Part 3's "C = 0". | Overclaim (C) | LOW-MED | Probe: chest, 6 RESPONSIVE blocks with evidence every block. prior `{mev 6, mav 23}`; learned after those six `{floor 6, ceiling 23, isLearned true, evidenceBlocks 5}`; after the RE6-2 seventh block `{floor 6, ceiling 23, isLearned true, evidenceBlocks 6}`. Both bounds untouched in either case. Rendered block-start line at the point `seed_learned` is actually reached (block 8 of the RE6-2 probe): *"Chest: 6 sets in week 1, building to 23 by week 5, then a recovery week (set by what past blocks have shown, down from 12 in week 1)."* Clause at `blockExplain.js:70`. Fix direction, not built: select the clause on whether the band actually moved off the prior (both values already in hand at the call site); copy-only, founder wording per the B1 family. |
| **RE6-2** | One unjudgeable block discards a mature user's entire earned starting volume. `resolveSeedRange` rejects an `INSUFFICIENT_DATA` entry (`blockSeed.js:88-92`) and falls to the learned band, whose floor is monotone-downward-only from the profile MEV, so it structurally cannot carry an earned start. The mechanism is recorded (D97-3 addendum, H-1, `PERSONALISATION-MATURITY.md` entry 2, framed as conservatism); the magnitude for a nine-month user is not. | Relationship behaviour | MED | Probe: chest, 7 blocks. Start climbs 6 -> 12 on earned dose-response pairs. Block 7 logged at 43% adherence with no recovery answers -> `INSUFFICIENT_DATA`. Block 8 "Continue with adjustments" seeds **start 6** (`source: 'learned'`, weekly `[6,10,15,19,23,6]`), exactly the Day-1 number. Receipt: *"week 1 down from 12 to 6 sets"*. Mitigations on record: the drop IS stated, and the Repeat intent recovers 12 (`source: 'ledger'`, P-6). Action: evidence for the D97-3 / D91-25 founder ruling, not a unilateral fix. |
| **RE6-3** | `PERSONALISATION-DIVIDEND.md` §2 ("Insufficient-data hold ... holds its own numbers") and `ATHLETE-180-REPORT.md` Q3 ("the numbers held rather than flattering the user") generalise a coincidence. The hold only holds when the previous start already equals the profile MEV, which is the athlete180 calves case (start 8 = prior MEV 8). For any muscle with earned progression the same classification produces a reset, not a hold. | Doc accuracy | LOW | Same probe as RE6-2. Action: correct the two claims when those files are next touched; the underlying behaviour question is RE6-2. |
| **RE6-4** | The workout-summary volume tooltip makes a whole-body plural claim from an any-muscle boolean: *"These ranges start from research values and have adjusted to your own logged response."* fires when a single muscle in `landmarkResolution.source` is `'adapted'`. | Overclaim (C) | LOW | `WorkoutSummaryScreen.js:1475-1477`; source map built at `effectiveLandmarks.js:42-60`. `RELATIONSHIP-MOMENTS.md` Part 4 item 5 protects the sentence from expansion but does not question its scope. Fix direction, not built: scope the sentence to the muscles actually adapted, or make it conditional-free; belongs in the B1 copy pass rather than as a separate change. |
| **RE6-5** | Intermittent failure in the full bar on the settled tree. `src/lib/__tests__/readinessSummary.test.js:106` ("fatigue trending up over the last two sessions surfaces when readiness facts are clean") failed once in four consecutive `npm test` runs, and passes in isolation. The test builds its fixtures from `Date.now()` at call time while `buildReadinessSummary` reads `Date.now()` again as its default `nowMs`. A non-deterministic test means "full bar green" is not a reliable landing gate. | Test integrity | LOW-MED | Run 1: `Test Suites: 1 failed, 1 skipped, 828 passed`; `Tests: 1 failed, 10 skipped, 10114 passed`. Runs 2-4: `829 passed, 1 skipped`; `10121 passed, 10 skipped`. Isolated run: 18/18 pass. Fix direction, not built: pass an explicit `nowMs` into `buildReadinessSummary` in that test, as the sibling R-6 and RB6-4 cases already do. |

**Counts.** 5 findings: Overclaim (C) 2, Relationship behaviour 1, Doc
accuracy 1, Test integrity 1. Severity: MED 1, LOW-MED 2, LOW 2. None is a
release blocker; none touches an ED-safety floor, gate or suppression; none
requires a migration.

---

## RECORDED IDEAS (out of scope, NOT built, NOT proposed as work)

Ideas that came out of the nine-month reading. None of these is a defect and
none should be actioned from this file.

1. **The cumulative comparison.** The dividend exists in the numbers (+5 chest
   start, -6 calves peak over six blocks) and is never stated. A single
   block-boundary comparison against the user's own first block would say more
   than any adjective. The feasibility lane already ruled C (no new surface),
   and this would be a line on an existing surface rather than a screen, but
   it is still a founder copy decision and would need to clear the
   evidence-age law that blocks candidate 1.
2. **An earned-start memory.** The learned band remembers capacity and not
   effort. A muscle-scoped memory of the earned start, so one badly-logged
   block costs a step rather than nine months, is real engine design and sits
   squarely inside the D91-25 family. Recorded only.
3. **Naming the gap in the layoff line.** The timestamp is in hand at
   `ActiveWorkoutScreen.js:1339-1342`; the copy is flat at
   `algorithms.js:584-586`. Naming the gap is copy, sizing the reduction by it
   is freshness semantics. Already routed to the D97-3 triage as B5; noted
   here only because it is the single most obvious returning-user moment.
4. **A "your refusal stands until" statement.** If F9 is ruled as a real
   expiry rather than a query parameter, saying so once at the revert moment
   would close the loop. Copy only, and entirely dependent on the ruling.

---

## THE NINE-MONTH LOYALTY VERDICT

I would renew, and I would renew for a reason I can point at rather than a
feeling. Nine months in, this app prescribes me eleven sets of chest where a
fresh install would prescribe six, and caps my calves at fifteen where a fresh
install would send me at twenty-one that I have never once handled, and it can
tell me in plain words which of those is my last block talking, which is my
own setting, and which it simply could not judge this time. It has never once
told me it is proud of me, never threatened me with a streak, never invented a
percentage, and when I said no to a set it stayed said. It will hand me my
entire history as a JSON file if I ask, which is the part that actually earns
the subscription: I am here because leaving costs me a better prescription,
not because leaving costs me my data. What stops this being a glowing verdict
is not dishonesty, it is quietness. Almost none of the above is visible unless
I go looking behind a chip about effort targets, the app never once shows me
how far the numbers have moved since day one, and there are two places where a
clause claims my history set a number that my history never touched. And I
would be genuinely annoyed to discover that one badly logged block, the month I
had flu, quietly puts my chest back to the number a stranger would get, with
the app calling that reset "what past blocks have shown". Fix the seeing and
fix that reset, and the ninth month would not need a verdict at all.
