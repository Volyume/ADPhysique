# Campaign 5 — Adversarial Review A: BRAND-NEW USER

Phase 42, Review A. Branch `claude/campaign5-first-use` at `cc36b360`
(all five waves + FQ-1/2/3/4/5/7 landed; FQ-6.1/6.2/6.4 are the lead's
next lane and are treated as known-open here, not re-raised as new).

**Method.** I installed Volyume today. I walked the shipped journey from
the code, reading the copy each screen actually renders, in order:
WelcomeScreen → LoginScreen → RootNavigator's gate → Article9Consent →
ProOnboarding steps 2-6 → the build sequence → ProSetupComplete → Home →
ActiveWorkout → WorkoutSummary; then the free branch (FirstRun →
FreeStarter → Home) and the week-6/block-end surfaces (BlockShapeCard,
PlansScreen's decision card, the FB-24 receipt, BlockReflection).
Context read first: `D96-RULINGS.md`, `CAMPAIGN-LOG.md`. I fixed nothing.
Read-only check: `npx jest src/__tests__/campaign5.firstUse.test.js` →
148 passed, 1 suite.

**What I did NOT re-litigate.** FQ-8(b) closed the wizard-structure fork,
so "six steps is too many" is out of scope. FQ-6.2's trial-end-date UI is
recorded as pending. C5-P10-03's equipment mismatch is fixed and I
verified it (`freeStarter.js:76-80`, hard filter).

---

## Summary — findings ranked most severe first

| # | Class | Q | One line |
|---|---|---|---|
| RA-1 | DEFECT | 3, 4 | The free quiz asks how many days you can train, then hands every answer the same 3-day plan and never says so. |
| RA-2 | DEFECT | 11 | After a first block with no session ratings, "Continue with adjustments" changes nothing yet the receipt says "Keeping a dose that worked" — a claim the ledger explicitly refused to make. |
| RA-3 | DEFECT | 2 | Every new user's first setup screen is labelled "Step 2 of 6", after a one-frame flash of the sign-in step they already did, with no way back. |
| RA-4 | DEFECT | 3 | "First name" is the only required wizard field with no reason on screen — and D96 just made it optional on Free because no engine reads it. |
| RA-5 | IMPROVEMENT | 4, 12 | The hand-off screen teaches four routines, offers three onward navigations and ~300 words before the "Start training" button. |
| RA-6 | IMPROVEMENT | 6, 11 | The block decision's two options differ only on "weekly set targets", a term with no gloss at the most consequential decision in the app. |
| RA-7 | IMPROVEMENT | 12 | Wizard step 2 still stacks four framing statements plus a group heading before its first field; C5-P36-01 removed only one of them. |
| RA-8 | IMPROVEMENT | 1, 2 | "Start your 14 days" lands on a screen that never mentions the trial and whose button says "Create account". |
| RA-9 | IMPROVEMENT | 6 | "Sets" and "reps" are first met on the free result screen, one screen before the only place they are defined. |
| RA-10 | IMPROVEMENT | 9 | Nothing anywhere confirms the trial *started*; the only mention is paragraph 3 of card 4 on the hand-off. (End date = known-open FQ-6.2.) |
| — | CLEAN | 1, 5, 7, 8, 10 | Passes demonstrated below. |

---

## 1. What does the app do? (from the first two screens)

**CLEAN.**

Screen 1, `src/screens/WelcomeScreen.js`:
- `:85` tagline `Less thinking. More lifting.`
- `:99` `The full app, free for 14 days`
- `:101` `Clear coaching that adjusts from your logged training.`
- `:26-31` bullets: `A plan built around your schedule, goals, and
  experience level.` / `Your training and nutrition adjust as your body
  responds.` / `Personalised calorie and protein targets, updated as your
  goals change.` / `Your coach explains what changed, what stayed the
  same, and why.`
- `:33-38` free list, first bullet `Unlimited workout logging`
- `:95` barbell icon; `:119-121` the `coach` gloss now renders
  (`b.toLowerCase().includes('coach')` — the C5-P34-01 case-sensitivity
  bug is genuinely fixed; the gloss is `GLOSSARY.precisionCoaching`,
  `coachGlossary.js:11-12`).

A person with no context gets: weight training, with a plan, plus
nutrition targets, plus something that adjusts weekly. That is the
product. Screen 2 adds nothing about the product (see RA-8), but screen 1
carries the whole answer on its own, so the question passes.

## 2. What do I do first?

**DEFECT RA-3 · IMPROVEMENT RA-8.** The instruction itself is clear at
every beat; the seams around it are not.

The chain reads correctly: `Start your 14 days` (`WelcomeScreen.js:133`)
→ sign-in → consent `Continue` (`Article9ConsentScreen.js:258`) → the
wizard → `Start training` (`ProSetupCompleteScreen.js:559`) → Home's
`Start workout` (`HomeScreen.js:2020`). At no point did I have to guess
what the next tap was.

### RA-3 (DEFECT) — the wizard opens at "Step 2 of 6"

Evidence:
- `ProOnboardingScreen.js:316` — `const [step, setStep] = useState(1);`
- `:483-509` — the advance to step 2 happens inside a `useEffect`, so it
  runs *after* the first paint. Step 1 (`:1249-1286`: title
  `Set up your Pro account safely`, an `OAuthButtons` block) is therefore
  painted for at least one frame to a user who signed in minutes ago.
- `:254` — `Step {step} of {TOTAL_STEPS}` renders `Step 2 of 6`.
- `:1314-1318` — step 2's `ProOnboardingHeader` is passed **no** `onBack`.
- `:598-602` — `goBack()` returns early at `step === 2 && accountCreated`.
- `:481` claims local-only users still see step 1. They cannot exist:
  `grep -rn "isLocal" src` (excluding tests and readers) finds **no
  producer** — only `database.js:28`'s unrelated `isLocalDbEncrypted()`
  and that comment. Step 1 is dead UI for every real user.

Scenario: I finish the consent wall, see a "Sign in with Google" screen
flash, then land on **"Step 2 of 6 — Baseline"** with no back chevron. I
spend a moment wondering what step 1 was, whether I skipped something,
and how to check.

Minimal fix (two independent halves):
1. Copy: renumber the counter to the steps actually shown, or drop the
   "of 6" and show progress with the bar alone. This is the half that
   matters.
2. Paint: make the initial state a lazy initialiser —
   `useState(() => (user && !user.isLocal ? 2 : 1))` — preserving the
   `isLocal` branch and the draft-restore clamp at `:564`.

## 3. Why does it need each piece of information?

**DEFECT RA-1 · DEFECT RA-4.** Most of the wizard justifies itself well.
Two inputs do not.

Justifications that land (`ProOnboardingScreen.js`):

| Input | Line | On-screen justification |
|---|---|---|
| Biological sex | `:1352` | `Used by the calorie formula and safety floors. This stays private.` |
| Age | `:1363` | `Used with your height and weight to set your calorie targets.` |
| Height | `:1400` | `Used with your weight and age to set your calorie targets.` |
| Body weight | `:1465-1467` | `This sets your starting trend and first calorie target. Update it from Today once setup is complete.` |
| Body fat (optional) | `:1550`, `:1570-1572` | `An honest estimate sharpens your first plan. Skip this if you are not sure.` |
| Experience | `:1643` | `This sets your starting volume and how complex the exercises are.` + `GLOSSARY.volume` tip |
| Session length | `:1654` | `Pick the time you can usually finish, including warm-ups.` |
| Days per week | `:1665` | `Choose the number of days you can repeat most weeks.` |
| Equipment | `:1677` | `Choose what you normally have access to, so swaps and exercise choices make sense.` |
| Phase | `:1770` | `This drives your calorie target and how your plan is built.` + a live provisional kcal at `:1778-1780` |
| Division | `:1790` | `Only if you are chasing a competitive physique...` |
| Recovery | `:1998` | `Be honest here. This sets how much volume your plan includes, so it can protect your recovery.` |

That is a good table. The two failures:

### RA-4 (DEFECT) — "First name" is required with no stated reason

- `ProOnboardingScreen.js:1332-1348` — the First name section renders a
  `fieldLabel` and a `TextField`. It is the **only** field in the block
  with no `fieldHint`; compare its four siblings above.
- `:1305` — `canContinue` includes `!!firstName.trim()`.
- `:1518` — `Complete your name, sex, age, height and body weight to
  continue.`
- `:710-713` — `advanceFrom2` alerts `Please enter your first name to
  continue.`

Meanwhile D96 ruled the opposite for the free path, and said why:
`FirstRunScreen.js:53-57` — *"the name is presentation only, no engine
reads it, and a neutral fallback already exists everywhere it is shown
(Home's greeting drops it, ProSetupComplete says 'there'). It no longer
gates the whole free journey."* — and `:86` renders
`What should we call you? (optional)`. The fallback is live at
`ProSetupCompleteScreen.js:45` (`|| 'there'`).

Scenario: a privacy-cautious user is stopped at the first setup screen
they ever see by a field the app cannot justify, cannot explain, and has
just declared optional for the other tier.

Minimal fix: drop `firstName` from step 2's `canContinue` and
`advanceFrom2` (the `'there'` fallback already exists), or — if the lead
prefers to keep it required — add the one-line hint the other five
required fields carry.

### RA-1 (DEFECT) — the free quiz asks a question it then ignores

This is the most severe finding in the review, because it is the one
place I was asked something and the answer visibly went nowhere.

- `src/lib/onboarding/freeStarter.js:43-51` — question 3:
  `How many days a week can you train?` with options `2 days`, `3 days`,
  `4 days`.
- `:113-114`, the module's own comment: *"Days per week: closest plan
  wins. **All current starters run three days a week, so this is a no-op
  today**, but it keeps the answer honest the moment a 2- or 4-day
  starter lands in the library."*
- Verified against the library: every `difficulty: 0` plan is tagged
  `days:3` — `seedRoutines.js:69`, `:101`, `:780`, `:870`, `:911`. There
  is no difficulty-0 plan at any other frequency.
- `FreeStarterScreen.js:259-264` then renders the meta from the **plan**,
  not the answer: `` `${recDays} days a week` ``.

Scenario: I can genuinely only train twice a week. I answer "2 days".
The next screen shows "Beginner Full Body 3×/Week — 3 days a week" under
the heading "Your starter plan", with `:247-249` telling me it was
`Built for people starting out`. Nothing acknowledges that the plan asks
for 50% more than I just said I can do. I either think the app ignored
me, or I think I have to train three days.

Contrast the sibling question, which D96 *did* fix: equipment is a hard
filter (`freeStarter.js:76-80`), so `home` can only ever return a
bodyweight plan. Days got the same question shape with none of the
follow-through.

Minimal fix (copy only, no scoring change, no new plan): in
`FreeStarterScreen.js` beside `resultMeta`, when
`getPlanDays(recommendation) !== answers.days`, render one honest line —
e.g. *"This plan runs 3 days a week. You said 2, which still works: run
the sessions in order and take longer over each week."* Larger option, if
the lead wants the answer to actually bind: drop question 3 until a
non-3-day starter exists.

## 4. Does anything feel like a questionnaire before I see value?

**IMPROVEMENT RA-5**, plus RA-1 above (a question that produced no
value at all).

The structural fork is closed (FQ-8 = (b)), so I judged only whether the
shipped shape *feels* like an interrogation. Mostly it does not, and one
fix in particular earns its place: `ProOnboardingScreen.js:1777-1781`
shows a real number from the real engine the moment a phase is picked —
*"Provisionally about 2,450 kcal a day for this focus. Your exact targets
are set when your plan is built."* That is the first genuine output, and
it arrives at step 5 of 6. The build sequence (`:792-806`) then names
four real phases including my own session length. Both are good.

The place it tips is immediately after.

### RA-5 (IMPROVEMENT) — the hand-off teaches the whole product

`ProSetupCompleteScreen.js`, everything above the primary button:
- `:283-298` card 1 `1. Log your weight` (+ 30 words on technique)
- `:301-408` card 2 `2. Hit your daily targets` — a primer link
  (`:316-328`, `New to calories and macros? 5-minute guide`), a kcal ring,
  three macro bars, two provenance sentences (`:375-380`), and an
  optional action that builds a week of meals (`:391-405`)
- `:411-485` card 3 `3. Train your split` (+ `BLOCK_START_SENTENCE`)
- `:488-542` card 4 `4. Check in once a week` — three paragraphs
  (`:496-525`) plus a `How Precision Coaching works` link (`:530-540`)
- `:553-555` the FQ-1 calm pointer
- `:557-565` **then** `Start training`

Roughly 300 words, four numbered lessons, three onward navigations and
one optional side-quest, all before the button that starts the app —
about routines the user has not yet performed once. The campaign's own
second law is *"DO NOT TEACH THE WHOLE PRODUCT BEFORE USE — do → see
result → explain when relevant"* (`CAMPAIGN-LOG.md:11-12`). Waves C/E
deduplicated the wizard steps (C5-P36-01/02) and never reached this
screen, which is denser than any step they trimmed.

Nothing here is *wrong* — every sentence is true and several are
hard-won D96 fixes (the C5-P21-01 provenance line, the C5-P10-01 block
sentence, the B3 trial arc). The problem is that they all landed on the
same screen.

Minimal fix, deleting no content: move `Start training` above cards 2-4,
leaving card 1 and card 3 (the two things needed before the first
session) in the reveal, and collapse cards 2 and 4 behind a single
`How the coaching works` disclosure — the same collapse pattern card 3
already uses at `:412-417`.

## 5. Is the first workout obvious?

**CLEAN.**

`HomeScreen.js:1967-2043` — the hero card is unambiguous: plan/day
eyebrow (`:1969-1971`, `activePlanLine` at `planDisplay.js:82-86` →
`"Beginner Full Body · Day 1 of 3"`), the routine name at `:1972-1974`,
the exercise count at `:1975-1979`, the readiness chip at `:1988-2008`,
then a single filled `Start workout` at `:2019-2026` with `Options`
demoted to secondary at `:2028-2037`.

C5-P37-01 genuinely landed: `TodayStrip.js:226-240` now renders the
weigh-in `Log` button as `variant="secondary"`, with the comment naming
the exact defect it fixes. On a day-0 Pro Home there is now one filled
button on the screen and it is the session.

The orientation card reinforces rather than competes:
`HomeWelcomeCard.js:60-61` — `Start a session below` /
`Begin from your plan, or just log freely. Tap Start workout and log each
set as you go.`

## 6. Are any terms unexplained at first exposure?

**IMPROVEMENT RA-6 · IMPROVEMENT RA-9.** Coverage is good and much
better than the audit found it; two gaps remain.

Covered:

| Term | First exposure | Gloss |
|---|---|---|
| coach / Precision Coaching | `WelcomeScreen.js:119-121` | `GLOSSARY.precisionCoaching` (C5-P34-01 fixed) |
| block / recovery week | `ProSetupCompleteScreen.js:438-440` (Pro), `FreeStarterScreen.js:270-272` (Free) | `BLOCK_START_SENTENCE` self-glosses: *"This starts a six-week training block: five weeks that build, then a lighter recovery week."* (`blockExplain.js:55-57`) |
| effort / stop N short of failure | `ActiveWorkoutScreen.js:2764-2770` | `GLOSSARY.rir` inline; `HomeScreen.js:1999` a11y label names it too (C5-P34-04) |
| PR | `WorkoutSummaryScreen.js:1391-1396` | `GLOSSARY.pr` (C5-P34-02) |
| volume | `ProOnboardingScreen.js:1644`, `:1999` | `GLOSSARY.volume` tip |
| est. max | `BlockReflectionScreen.js:273-274` | `GLOSSARY.estMax` |
| deload | `HomeBlockShapeSheet.js:73` | `GLOSSARY.deload` |

### RA-9 (IMPROVEMENT) — "sets" and "reps" are met before they are defined

`FreeStarterScreen.js:247-250`: *"Every session tells you exactly what to
do: the exercises, **the sets, and the reps**."* This is a beginner
plan's result screen — the likeliest place in the product for a person
who has never lifted. `GLOSSARY.set` / `GLOSSARY.rep`
(`coachGlossary.js:88-92`) have exactly **one** consumer:
`ActiveWorkoutScreen.js:3731`, behind the overflow sheet's
`How logging works` row — one screen later and one tap in.

C5-P13-03 did well by the session (`:2744-2749`: the pulsing `…` gains a
visible `Help` label and an a11y label naming what is behind it). It just
did not follow the terms back to where a novice meets them first.

Minimal fix: one `InfoTooltip` carrying `GLOSSARY.set` + `GLOSSARY.rep`
on that sentence, reusing the existing primitive.

### RA-6 (IMPROVEMENT) — "weekly set targets" is unglossed at the decision

`blockAdvisor.js:185-213` — the two options a Pro user chooses between
after six weeks:
- `Run this plan again, unchanged` — *"Same workouts, and the same weekly
  set targets as last time."*
- `Continue with adjustments` — *"Same workouts, with next block's weekly
  set targets starting from what this block showed, muscle by muscle."*

Both open with the same three words; the entire difference rests on
"weekly set targets", a phrase the user has never had to read a number
for. `GLOSSARY.volume` says precisely this in plain words (*"The total
work for a muscle: the working sets you do for it in a week"*) and is not
attached anywhere on `PlansScreen.js:981-1018`.

Minimal fix: one `InfoTooltip text={GLOSSARY.volume}` beside the
"Both options are open" line at `PlansScreen.js:984-986`.

## 7. Does the app claim to know me before it does?

**CLEAN.** I hunted specifically for this and found the law held
everywhere I looked.

- `ProSetupCompleteScreen.js:375-377`, at the very first sight of the
  calorie and macro numbers: *"These start from your profile and the
  research, then adjust as your logs and weight trend come in."*
  (C5-P21-01.)
- `HomeWelcomeCard.js:67-74` — future tense on both branches, and tier-
  correct: Pro gets *"Your coach learns as you train"*, Free gets *"Your
  progress builds as you train"* (C5-P7-05/C5-P1-08).
- `whyThisTemplates.js:213-225` — the receipt line is built only from
  inputs the engine acted on: *"Built around your 4 days. Extra work on
  chest and rear delts, like you asked."*
- `blockExplain.js:73-79` — `RESEARCH_START_LINE`: *"Not enough personal
  history yet, so this block starts from research-based guidance."* The
  `SOURCE_CLAUSE` map (`:69-73`) only lets `seed_ledger` / `seed_learned`
  / `seed_manual` claim a learned origin.
- `checkinDerive.js:79-94` (C5-P19-01) — in week 1 the two comparative
  verdicts (`a bit below your usual`, `well down on your usual`,
  `PERF_VERDICT_TEXT:135-136`) are structurally unreachable; the derive
  returns `null` and the neutral subtitle shows.
- FQ-7 is live at `ActiveWorkoutScreen.js:1672-1695`: a first exposure
  produces `"60kg x 8 logged as your starting point"`, not a PR.
- `coachGlossary.js:29-36` — `estMax`'s basis clause was corrected
  (C5-P14-03) so it does not claim "recent sets" on a first-ever set.

A grep for the usual over-claim shapes (`your usual`, `we've learned`,
`learned from your`, `your typical`, `running average`) across `src/`
returns only surfaces that guard themselves —
`ReadinessCards.js:278` (`MIN_RATED_SESSIONS`: *"a 'running average'
needs at least two points to be one"*), `learnedRange.js:136` (*"the
user's chosen numbers must not launder into 'learned from your…'"*).
No leak found.

## 8. Does Free feel usable?

**CLEAN.**

- The free tier is named honestly on the first screen
  (`WelcomeScreen.js:147-148`: `What stays free` /
  `If you don't subscribe after the trial, these stay.`) and the tier is
  named in the app (`YouScreen.js:399`: `You're on Free`, C5-P7-10).
- The canonical list is now singular and true
  (`SubscriptionPolicyScreen.js:49-77`): full logger with rest timer,
  400+ exercise library, 31 plans, own routines, **training blocks with a
  recovery week**, history, PRs, weekly volume targets, Year of Lifts,
  reminders, CSV export, safety checks. The deleted plate calculator is
  gone (C5-P7-02) and the account/sync mis-sale is corrected
  (`:53-58`, C5-P7-03).
- The free no-plan state gives a real, free route rather than a gate:
  `HomeScreen.js:2075-2087` — `Start with a plan` → `FreeStarter`, with
  `Browse plans` as a real secondary.
- Free reaches the block system: `FreeStarterScreen.js:270-272` renders
  the same `BLOCK_START_SENTENCE`, and `blockAdvisor.js:196-202` keeps
  `repeat` free with the reason stated in the source (*"Running your plan
  again is training, not coaching"*).
- Broken free promises are repaired: `CoachHeldHistoryScreen.js:208-214`
  states the unlock condition instead of bouncing off a gate (C5-P35-06);
  `HomeProTeaserCard.js:14-23` is now weekly-dismissible (FM-05);
  `YouScreen.js:457-459` tells a free user what the Coach tab *becomes*
  rather than describing a coach they do not have (C5-P7-08).

One observation, not a finding: a brand-new user can only reach Free by a
failed/ineligible `startCascade`, so `FirstRunScreen.js:79` (`You're
almost set up.`) is written for a user who does not know they are on the
degraded branch. That is OB-1 by design and FR-C5-3 already records it.

## 9. Does Pro feel meaningfully different?

**CLEAN, with IMPROVEMENT RA-10.**

The difference is visible and consistent within minutes: Pro gets the
morning-weight strip on Home (`HomeScreen.js:1925` gated
`tier === 'pro'`), the calorie/macro card and ring
(`ProSetupCompleteScreen.js:301-408`), a live Coach tab
(`YouScreen.js:457-459`), the readiness/coach brief on the session hero,
and — after the block — the adaptive branch that Free is truthfully
Pro-marked out of (`blockAdvisor.js:206-211`, `PlansScreen.js:1001-1008`,
with the second entitlement lock at `:331-334`). FQ-2's tier law is
implemented as ruled.

### RA-10 (IMPROVEMENT) — nothing confirms the trial started

I tapped a button that said `Start your 14 days`. From that moment:
- `Article9ConsentScreen.js:138-150` grants the trial silently inside
  `handleContinue`; the screen says nothing about it before or after.
- The wizard's `PRO` badge (`ProOnboardingScreen.js:249-251`) is the only
  hint, and it is a badge, not a statement.
- The single sentence that names the arc is buried as paragraph 3 of
  card 4 on the hand-off (`ProSetupCompleteScreen.js:521-525`): *"Your
  full access runs for 14 days. If you decide not to continue after that,
  your training log, plans and personal bests stay free forever."*

The **end date** half is the lead's known-open FQ-6.2 — and I confirmed
the helper is built but unwired: `cascade.js:495-503` exports
`trialEndsLabel`, and `grep -rn "trialEndsAtMs\|trialEndsLabel" src`
finds no consumer outside `cascade.js` itself. I raise nothing there.

The **start** half is not covered by FQ-6.2 as written. Minimal fix: one
line in the hand-off's `readyGrid` (`ProSetupCompleteScreen.js:258-280`),
alongside `Targets saved` / `Plan ready` — e.g. a
`Your 14 days have started` chip, promoted out of card 4's third
paragraph. Copy only; no billing surface, no cascade change.

## 10. Can I understand the first recovery week?

**CLEAN.**

It is announced before it exists, described while it runs, and defined on
demand:
- Announced at activation, on every path, before the decision:
  `blockExplain.js:55-57` → *"This starts a six-week training block: five
  weeks that build, then a lighter recovery week."* Rendered at
  `ProSetupCompleteScreen.js:438-440`, `FreeStarterScreen.js:270-272`,
  `HomeScreen.js:2059` (C5-P10-01, all three points).
- Counted down: `BlockShapeCard.js:54` — *"Week 3 of 6 · Build. Recovery
  week in 3 weeks."* (C5-P11-07 added the missing unit noun; verified.)
- Framed on arrival: `BlockShapeCard.js:47` — *"Recovery week. Lighter on
  purpose. This is where the work pays off, and you lose nothing by
  easing back."*
- In the session: `ActiveWorkoutScreen.js:2873-2900` — a `Recovery` chip
  and banner reading *"Light loads - full recovery - no PRs"*, dismissed
  with `Got it` (FB-05 fixed; `Skip` on a recovery-week banner would have
  read as skipping the week). The effort line is suppressed in a deload
  week (`:2764`), so it never competes.
- Prescribed and labelled at the set: `:2991-2996` prefills
  `Recovery week - 40kg x 8`.
- Defined: `HomeBlockShapeSheet.js:73` carries `GLOSSARY.deload`, now
  ordered *after* the block definition and *before* the provenance lines
  (C5-P11-06), plus the why at `:71` — *"Effort builds a little each week
  so your body keeps adapting, then the recovery week lets it catch up.
  When the block finishes, you choose what comes next; nothing starts on
  its own."* (C5-P11-05.)

Not one of these surfaces contradicts another, and none of them can
describe a block length the writer does not create (`BLOCK_PLANNED_WEEKS`
is the single source, `blockExplain.js:29`, `:55`).

## 11. Can I understand what was learned after my first block?

**DEFECT RA-2 · IMPROVEMENT RA-6** (above).

The architecture is right. Both options always render side by side
(`PlansScreen.js:981-1018`), the advisor may only *mark* one
(`blockAdvisor.js:190-213`, `:201`/`:211` set `recommended` and nothing
else), the ledger rows render with the decision rather than being
discarded on a good block (`PlansScreen.js:924-948`), the block summary is
reachable during the decision window (`:957-967`, FB-15), the two
confirms describe their own actions (`:342-347`, FB-26), and the FB-24
receipt exists (`:1486-1520`).

### RA-2 (DEFECT) — the receipt claims a judgement the ledger refused to make

This is where the fixes interact badly.

Chain of evidence:
1. Wave A landed C5-P17-01/02: session rating rows start **unselected**
   and an untouched Close writes **nulls** — correctly, per Campaign 1's
   "unknown ≠ no" law.
2. `blockLedgerGather.js:85-98` — recovery `dataPoints` counts only rows
   where `soreness != null || joint != null`.
3. `interBlock.js:83` — `MIN_RECOVERY_POINTS = 4`; `:292-295` — below it
   the muscle returns `INSUFFICIENT_DATA` with the proposal pinned to
   `previousStart, plannedPeak` and the rationale *"No recovery
   information was logged for chest this block"*.
4. So a first-block user who never engages the post-session panel — now
   the default, by design — gets `startSets === previousStart` and
   `peakSets === plannedPeak` for every muscle.
5. `blockExplain.js:290-292` — `ds === 0 && dp === 0` → `held += 1`, and
   `changed` stays empty.
6. `PlansScreen.js:401` still shows the sheet, because `held > 0`.
7. The user reads `PlansScreen.js:1491-1493` +
   `blockExplain.js:313-315`:

   > **Your next block is set**
   > Same workouts. Here is what your last block changed.
   > *12 other muscle groups stayed where they were. **Keeping a dose
   > that worked is a decision too.***

Two false notes in one sheet. "Here is what your last block changed" is
followed by nothing changed. And "a dose that worked" asserts exactly the
judgement the ledger declined to make one screen earlier — its own rows
said the response could not be judged. FB-27's principle ("retention is a
decision, so it gets said out loud") is right; the sentence is only true
for the `RESPONSIVE`/`STALE` hold, not for the `INSUFFICIENT_DATA` hold,
and the receipt cannot currently tell them apart.

Compounding it: `Continue with adjustments` promises *"weekly set targets
starting from what this block showed, muscle by muscle"*
(`blockAdvisor.js:207`) and in this state produces numerically the same
block as `Run this plan again, unchanged`. A Pro user's first ever
adaptive decision may be a distinction without a difference, described as
a difference.

Minimal fix (copy + one predicate; no engine change, no ledger change):
`buildSeedReceipt` already has the entries — carry each held muscle's
`classification` through and split `heldLine` in two:
- any non-`INSUFFICIENT_DATA` hold → today's wording, unchanged;
- all-`INSUFFICIENT_DATA` → the honest wording, e.g. *"N muscle groups
  stayed where they were: this block did not have enough recovery
  feedback to judge them, so nothing was moved on a guess."*
Same split should feed the decision card's `:938-940` line
(*"These apply if you continue with adjustments"*) so the two options are
not described as differing when they do not.

Also worth the lead's eye (not a separate finding): with the whole
ledger at `INSUFFICIENT_DATA`, `PlansScreen.js:928-930`'s heading
`What this block showed` sits above three rows each saying, in effect,
that nothing could be shown. A first-block framing sentence would carry
that better than the rows do alone.

What is genuinely clean here: FB-16's honesty fix reads well —
`BlockReflectionScreen.js:263-274`, `Your best estimated max per lift`
with `GLOSSARY.estMax`, explicitly *not* "records set", matching the
logger's own refusal to call a first exposure a PR. FB-17's comparison is
like-for-like (`:73-85`, first week vs last **build** week). FB-18's dead
CTAs now route to the one place a block can be started (`:214-217`,
`:336-339`).

## 12. Does anything feel unnecessarily complex?

**IMPROVEMENT RA-7**, plus RA-5 (the hand-off) above.

### RA-7 — step 2 still stacks four framings before its first field

What renders, top to bottom, before `First name`:
1. `ProOnboardingScreen.js:254` — `Step 2 of 6 - Baseline`
2. `:255`, `:1316` — `Set your starting baseline`
3. `:256`, `:1317` — `These details let the app set a safe starting
   baseline without guessing.`
4. `:257-269`, `:78-81` — `This step sets` + chips `Calorie baseline`,
   `Weight trend`
5. `:1328-1331` — QuestionGroup title `Required details`
6. `:1333` — the field

C5-P36-01 deleted the QuestionGroup **sub** and kept the title, on the
reasoning that the title "does real structural work grouping the fields"
(`:1320-1327`). On a step with exactly one group, `Required details`
groups nothing, and the outcome chips are the header sub restated as
nouns. Three of the four say the same thing.

Minimal fix: on single-group steps, render the `QuestionGroup` without a
title (the icon still carries the grouping), or drop the outcome chips on
steps whose header sub already names the same outcomes. Nothing about any
field, gate, validation or safety hint changes.

### Other complexity, judged and passed

- **The consent wall** (`Article9ConsentScreen.js:187-249`, ~380 words
  across five subheads) is dense, but FQ-5 approved exactly this shape:
  progressive disclosure was *allowed*, not required, and no substance
  may be hidden pre-consent. The FQ-5 regrouping is a real improvement —
  transmission now sits under its own `What leaves your phone:` heading
  (`:211-214`) rather than inside the on-device reads list. Correctly out
  of scope. One small note: `Volyume Score`, `leanness band` and `result
  confidence` appear in the bullet at `:200` before the self-gloss at
  `:203-205`; reversing those two paragraphs would cost nothing.
- **Instructional modals** no longer stack:
  `ActiveWorkoutScreen.js:995-1035` — the superset and unilateral sheets
  now guard each other with synchronous refs and defer rather than
  overlap (C5-P37-02). Verified as ruled.
- **Wizard back behaviour** is now consistent: hardware Back mirrors the
  chevron (`ProOnboardingScreen.js:615-624`), and the free quiz does the
  same (`FreeStarterScreen.js:94-102`) so the quiz can no longer be
  discarded by a hardware Back. Both are real improvements a new user
  will never notice, which is the point.
- **Recoverable auth** landed properly: `LoginScreen.js:200-230`
  (`Forgot your password?`, with the deliberately conditional *"If that
  email has an account…"* wording), `:319-337` the persistent notice that
  survives a trip to the inbox, `:245-256` the back chevron.

## Appendix — one seam I checked and could not fault

`ProOnboardingScreen.js:483-509` (the Wave A Step 1 trap fix) is correct
on its merits: the old `if (userProfile) return;` guard is gone, and both
named live states (Free→Pro upgrade via `resetFirstRun`, relaunch after a
kill on the hand-off) now advance. RA-3 is not a regression from that
fix — it is the presentation the fix did not have to touch. I flag it
only because a brand-new user meets it before anything else.
