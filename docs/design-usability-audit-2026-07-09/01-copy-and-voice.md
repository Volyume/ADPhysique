# Copy and voice audit (2026-07-09) — Lane 1 of the design and usability audit

**Scope.** Every user-facing string in `src/screens/` (82 screens), `src/components/`
(including `food/` and `auth/`), and the user-facing copy modules in `src/lib/`
(coach output builders, whyThisTemplates, notifications, share cards, paywall copy,
milestones, progress scan, partners). Audited against
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (read in full: Section 3 patterns,
Section 5 locked surfaces 1-8, Section 6 failure-mode catalogue, the 2026-06-03
founder naming override, and the persona-register/science-layer addendum) and
`docs/prompt10-voice-audit-2026-07-03.md` (so already-fixed items are not
re-reported; regressions of those fixes ARE reported, and there are several).

**Method.** Six parallel read-in-full sweeps (four screen slices, one components
slice, one lib slice), cross-checked hands-on with a repo-wide string scanner
(string literals + JSX text, comments excluded) for em dashes, US spellings,
exclamation marks, AI-tell vocabulary, banned actors, jargon, moral food labels,
urgency phrases and emoji, plus git archaeology on the headline regression.
Key findings were independently re-verified against the live source before
inclusion. AUDIT ONLY: no source files were modified.

**What is genuinely strong.** No American spellings survive in any user-facing
string anywhere in the app (every `color`/`center` hit is a React Native style
prop, not copy). No "seamless", "unlock", "supercharge", "delve", "let's dive
in", "crush/shred/beast mode", no false-urgency paywall phrases, no moral food
labels, no streak-shaming, and (with two exceptions below) no exclamation marks
or decorative emoji. `VolumeHeatmapScreen` translates MEV/MAV/MRV into plain
English without ever surfacing the acronyms; `partners/*`, `greatWeek.js`,
`cancelReason.js` and `recompReframe.js` are exemplary and worth using as
reference voice for the fix wave.

---

## HEADLINE FINDING (must be resolved first): "Precision Coaching" has been mass-renamed to "The Coach" with no recorded founder decision

`grep` confirms **"Precision Coaching" no longer appears in a single rendered
user-facing string anywhere in `src/`** — only in code comments and docs. Git
shows why: three commits authored by **Codex** systematically renamed it:

- `ae42b4d` "Polish coach and progress copy" (2026-07-07) — ~30 files, including
  `GoalLockConsentScreen.js` (ED-safety-adjacent, the exact Surface 4 fix from
  prompt10, commit `a6e8f7e`, reverted: "Precision Coaching can support that" →
  "The Coach can support that"), `Article9ConsentScreen.js`, `CoachOutputScreen.js`,
  `nutritionEngine.js`, `coachGlossary.js`.
- `b4bb808` "Polish user-facing app copy" (2026-07-08) — `MethodologyScreen.js`
  and 13 more files.
- `617a3c1` "Remove remaining share card jargon" (2026-07-08).

No founder decision authorising this rename was found anywhere in `docs/`
(searched all locked docs, decision logs and audit folders). The locked voice
doc still mandates "Precision Coaching" as the named decider (Section 4:
"not 'the engine', not 'the system'"; Pattern 1), and the code's own comments
still claim the locked naming (e.g. `MethodologyScreen.js:1` says "How Precision
Coaching works" while line 136 renders "How the Coach works";
`ProSetupCompleteScreen.js:426` comments "Precision Coaching is named twice on
this screen" while the rendered copy says "The Coach";
`GoalLockConsentScreen.js:87` comments "Precision Coaching named as the decider"
directly above body copy saying "the Coach").

Worse, the rename landed inconsistently. At least **six variants** of the actor
name now coexist, sometimes within one screen or one paragraph:
`The Coach` / `the Coach` / `the coach` / `your coach` / `Volyume` / `we`
(and `Start the Coach` on the paywall). `WeeklyCheckInScreen.js` alone uses four.

**Founder decision required (multiple choice, not pre-decided):**

- **(a)** The rename was unauthorised drift: restore "Precision Coaching" per the
  locked doc across all renamed surfaces (mechanical revert + sweep).
- **(b)** "The Coach" is now the intended product name: update
  `COACHING_VOICE_SYNTHESIS_LOCKED.md` (a locked doc, so this itself needs the
  founder), fix the now-lying code comments, and standardise one capitalisation
  everywhere.
- **(c)** Hybrid: "Precision Coaching" for branded surfaces (headers, explainers,
  consent) and one consistent informal form elsewhere, documented per surface.

Every individual naming finding below (marked NAMING) collapses into this one
decision. They are itemised so the fix wave has exact line numbers whichever
option is chosen.

---

## Severity A — clear AI-tell, banned pattern, regression, or drift from locked copy. Must fix.

### A1. `src/screens/ExerciseDetailScreen.js:590`
Current: `You've hit your target! Set a new one.`
Exclamation mark (banned; prompt10 fixed "Goal reached!" but this one survived).
Suggested: `You've hit your target. Set a new one.`

### A2. `src/screens/ExerciseDetailScreen.js:768-771`
Current: PB rows render `'🥇'` / `'🏋️'` / `'🔁'` as decorative emoji in UI copy
(with an `eslint-disable` acknowledging the bypassed lint rule).
Suggested: replace with `Ionicons` glyphs matching the screen's icon language
(`trophy` / `barbell` / `repeat`).

### A3. `src/screens/CoachOutputScreen.js:2366`
Current: `The Coach is built on published training science: volume landmarks, autoregulation, and RED-S safety limits, configured to your data.`
Three issues: NAMING drift; raw clinical jargon (RED-S, autoregulation, volume
landmarks) with no plain-English gloss and NOT behind the opt-in science layer;
triadic marketing rhythm.
Suggested: `Precision Coaching applies published training science to your data: how much training volume you need, how your plan adjusts week to week, and the safety limits that protect your energy availability.`

### A4. `src/screens/GoalLockConsentScreen.js:90` — REGRESSION of locked Surface 4 (ED-safety-adjacent)
Current: `You picked a goal that involves an aggressive cut. The Coach can support that, with one tradeoff you should know about. Volyume has safety checks: if signs of under-eating and rapid weight loss show up together, the Coach holds the calorie target so the cut doesn't get sharper.`
Reverted by `ae42b4d` from the prompt10 restoration. LOCKED surface: restore the
Surface 4 text exactly ("Precision Coaching can support that" / "Precision
Coaching holds the calorie target"), pending the headline naming decision.

### A5. `src/screens/GoalLockConsentScreen.js:93` — same regression
Current: `...For an aggressive cut, the Coach can raise the bar before those checks fire...`
LOCKED surface: Surface 4 says "Precision Coaching can raise the bar".

### A6. `src/screens/MethodologyScreen.js` (file-wide; lines 42, 58, 66, 68, 91, 96, 136) — REGRESSION
Header comment (line 1) says "How Precision Coaching works"; the screen renders
`How the Coach works` (:136) and mixes `'What the coach reads'` (:42, lowercase)
with `'What the Coach cannot do'` (:96, capitalised) and a third actor,
"Volyume" (:49), in the same section array. Reverted by `b4bb808` from the
prompt10 fix. Suggested: one actor name for the whole file per the headline
decision; fix the casing split regardless.

### A7. `src/screens/HomeScreen.js:2232`
Current: `Your body is signalling it needs a lighter week. Keep the movement, drop the weight. This is how you come back stronger.`
Inferred-state language (Pattern 3, mirror-not-infer) plus closing motivational
filler with no data referent (Pattern 9).
Suggested: `Recent training signals it's time for a lighter week. Keep the movement, reduce the weight.`
Same string duplicated at `src/screens/MesocycleBuilderScreen.js:331` and a
close variant at `src/screens/ConsistencyScreen.js:61`
(`'Your body is signalling it needs a recovery week.'`). Fix all three together.

### A8. `src/screens/HomeScreen.js:1639-1640`
Current: title `Session in Progress` directly above subtitle
`Tap to return to your workout` (accessibilityLabel: "Continue active workout").
Title Case where sentence case is expected, and session/workout mixed on one card.
Suggested: `Workout in progress`.

### A9. `src/screens/PaywallScreen.js:202-205` — FULL DRIFT from locked Surface 2
The screen reads `trigger` from route params but uses it **only for telemetry**.
The rendered copy is always the static title `Start the Coach` plus generic
marketing body (`Volyume reads your training, weight, food and check-ins together...`).
None of the trigger-specific, numbers-before-narrative Surface 2 copy (data line,
"what Precision Coaching can't see" counterfactual) is rendered anywhere in the
component. The differential-trigger mechanism exists in routing/telemetry but was
never wired into the copy. LOCKED: reconcile against the exact Surface 2 template;
do not treat the current generic copy as satisfying it. (The 7-day vs 14-day CTA
difference is a separately documented founder override on Play billing trial
length and is NOT flagged.)

### A10. `src/screens/SettingsScreen.js:194`
Current: `WORKOUT & UNITS` (hard-typed ALL CAPS section header).
Every other Settings section header renders sentence case via
`SettingsPrimitives.js` `SectionHeader`.
Suggested: `Workout & units`, routed through the shared `SectionHeader`.

### A11. `src/screens/ShareCardScreen.js:194` — regression of a prompt10 fix
Current: `sessionName: s.sessionName || 'Session Complete',`
prompt10 records the share-card fallback as aligned to "Workout complete"; this
fallback still reads "Session Complete" (wrong word AND Title Case).
Suggested: `'Workout complete'`.

### A12. `src/screens/WeeklyCheckInScreen.js:911, 1021, 1386, 1392, 1421` (NAMING, single-screen worst case)
Four variants inside one screen: `The Coach needs at least ... days of data`
(:1386, :1392), `Your coach needs at least ...` (:1421), `The coach holds
weight-based changes` (:911), `Helps the coach decide whether to hold, push, or
ease off training.` (:1021). Suggested: one form per the headline decision.

### A13. `src/components/EngineLog.js:92`
Current: `<Text style={styles.headerLabel}>Engine Log</Text>` — a visible card
header on the Coach tab literally naming "Engine", the exact term Section 4 bans.
Suggested: `Coaching log` (renaming a shipped feature title: founder call, not a
silent fix).

### A14. `src/lib/whyThisTemplates.js:547` — SAFETY-ADJACENT, founder must review
Current (ED lockout "Read more" tooltip): `...Once your energy scores recover and your intake catches up for two weeks, the engine starts adjusting again.`
"the engine" is the banned unnamed actor, inside ED-safety copy.
Suggested: `...Precision Coaching starts adjusting again.` (apply via the
Surface 1 reconciliation in the LOCKED section below, not as a lone patch).

### A15. `src/lib/weeklyCoach.js:306` — SAFETY-ADJACENT, founder must review
Current (`WHY_LIBRARY.ffm_floor_hold`): `Your calorie target holds. Your seven-day average intake is at or below the safety floor for your fat-free mass.`
"fat-free mass" is the spelled-out form of banned jargon FFM (Pattern 10 says
"lean mass" or "muscle"; line 1243 of the same file already gets this right).
Suggested: `...the safety floor for your lean mass.`

### A16. `src/lib/weeklyCoach.js:1087`
Current: `Reduce sets by around half this week, keep the same exercises and weights. Your body is asking for a breather. One lighter week sets you up for a stronger run after.`
Inferred-state personification (Pattern 3).
Suggested: `Reduce sets by around half this week, keep the same exercises and weights. Several recovery signals have dipped together. One lighter week sets you up for a stronger run after.`

### A17. `src/lib/weeklyCoach.js:1513`
Current: `Showing up, even partially, keeps the habit alive.`
Motivational filler without a data referent (Pattern 9); the sibling
`adherenceNote` on the same object already carries the numbers.
Suggested: let the session count carry it, e.g.
`${sessionsCompleted} of ${sessionsPlanned} sessions this week.`

### A18. `src/lib/milestones.js:54`
Current: `Three sessions inside a week. That is what a training habit looks like — and you are building one.`
Em dash in user-facing copy (banned everywhere, lint-enforced; this one is in a
lib module the lint gate evidently missed).
Suggested: `...That is what a training habit looks like, and you are building one.`

### A19. `src/lib/onboarding/planPreview.js:79`
Current: `` `${split.name} — ${split.detail}, around ${sessionMins} minutes a session.` ``
Em dash in the onboarding plan-preview structure line.
Suggested: `` `${split.name}: ${split.detail}, around ${sessionMins} minutes a session.` ``

### A20. `src/lib/onboarding/planPreview.js:90`
Current: `Calories and protein come after — they need your weight, and we ask permission first.`
Em dash.
Suggested: `Calories and protein come after. They need your weight, and we ask permission first.`

### A21. `src/lib/differentialPaywall.js:49-52 and 62-65` — DRIFT from locked Surface 2 (all eight lines)
Section 7 of the locked doc: "The six locked copy lines in this doc get rewritten
to the new template." None have been. All four contexts (both trial and no-trial
variants) lack numbers-before-narrative and use collaborative "we" for an engine
decision; `deload` also surfaces raw jargon:
- `:49/:62 stalled_lift`: `Your bench has stalled for three weeks. With food data, we could tell you if it's training or fuel. [Try Pro free for 7 days.]`
  Suggested: `Your bench hasn't moved in three weeks. Precision Coaching cannot tell from training data alone whether the cause is training load or fuel. With your food log, it could separate the two. [Try Pro free for 7 days.]`
- `:50/:63 deload`: `We're holding a deload this week. With food data, we'd know if your fuel is the cause. [Pro shows you, free for 7 days.]`
  Suggested: `Precision Coaching is holding a lighter week this week. With your food log, it could tell whether fuel is the cause. [Try Pro free for 7 days.]`
- `:51/:64 missing_tdee`: `Your weight is moving faster than your calories suggest. Pro tracks your true daily burn from your own data. [7 days free.]`
  Suggested: `Your weight is moving faster than your reported calories explain. Pro tracks the calories your body actually uses, from your own data. [Try Pro free for 7 days.]`
- `:52/:65 block_summary`: `Your training block ended. With food data, we'd show how fuel shaped your results. [Try Pro free for 7 days.]`
  Suggested: `Your training block just ended. With your food log, Precision Coaching could show how fuel shaped your results. [Try Pro free for 7 days.]`
Note: the file header says "Locked verbatim copy. Editing requires updating the
snapshot test" — the fix must update the snapshot test in the same change.

### A22. `src/lib/progressScanAnalysis.js:874, 1121, 1123, 1207, 1209, 1252` — systemic first-person "I" voice
Current examples: `Progress photos saved. I could not read enough from the photos for a useful score.` / `` `This scan is saved, but I am not comparing it yet. ${comparability.reason}` `` / `Progress photos are saved, but I am not using them as a comparison because the setup changed too much.` / `` `${trendSummary} I am treating it as photo context only.` ``
A bare first-person "I" appears nowhere else in the app and reads as an
anthropomorphised chatbot persona (AI-tell; also risks implying non-deterministic
judgement). The same file already uses "Volyume" correctly (:1147, :1388).
Suggested: replace "I" with "Volyume" throughout, e.g.
`Progress photos saved. Volyume could not read enough from the photos for a useful score.`

### A23. `src/lib/notifications/scheduler.js:1054-1057` — DRIFT from locked Surface 6 ("Weekly coach output ready")
Current: title `Your coaching for the week is ready`, body `Have a look at what's changed for you this week, and the thinking behind it.`
Locked: `"This week's update is ready. Precision Coaching has set new targets."`
The live copy neither names the actor nor states the concrete claim.
Suggested: title `This week's update is ready`, body `Precision Coaching has set new targets for you.`

---

## Severity B — jargon, consistency, terminology, drift needing a decision

### Naming drift instances (all resolved by the headline decision; exact locations for the fix wave)

| # | Location | Current |
|---|---|---|
| B1 | `src/screens/BodyMetricsScreen.js:921` | `The Coach estimates your daily burn from your weight trend and what you log.` |
| B2 | `src/screens/CoachingRemindersScreen.js:370` | `...so the coach has a full week of fresh data to act on` |
| B3 | `src/screens/CoachingRemindersScreen.js:423` | `...keep your coach accurate.` |
| B4 | `src/screens/CoachOutputScreen.js:586,589` | `See how the Coach decides` (button + accessibilityLabel) |
| B5 | `src/screens/CoachOutputScreen.js:750` | `The Coach reads your training and weight from day one. ...` (fallback body; this one screen uses four variants) |
| B6 | `src/screens/CoachOutputScreen.js:773` | `Couldn't load your coach.` → suggested `Couldn't load your coaching update.` |
| B7 | `src/screens/CardioHistoryScreen.js:77` | `The coach sets a target only if a cut stalls.` (already in prompt10's recorded-not-fixed list) |
| B8 | `src/screens/HomeScreen.js:1620` | `Your coach learns as you train` — ALSO "learns" implies adaptive AI, contrary to the deterministic engine and the failure-mode table's "AI has analysed your data" ban. Suggested: `Precision Coaching adjusts as you train.` |
| B9 | `src/screens/ProUpgradeScreen.js:27,336,387` | `your coach` / `the coach` / `The Coach` — three registers in one screen |
| B10 | `src/screens/ProGoalSetupScreen.js:526,595` | `the coach pushes your progress` vs `The Coach adjusts at your next check-in` |
| B11 | `src/screens/PlansScreen.js:74,81,721` | `The Coach keeps adjusting...` (internally consistent but diverges app-wide) |
| B12 | `src/screens/ProSetupCompleteScreen.js:414-415,433,436` | `The Coach then explains any calorie or training change...` / `How the Coach works` (comment at :426 claims "Precision Coaching is named twice on this screen") |
| B13 | `src/screens/NutritionEducationScreen.js:98-99,154,157,183` | `Your coach watches the trend...` / `6. The coach does the adjustments` / actor also named `Volyume's weekly check-in` / `...the coach watches for you.` — four names in one section |
| B14 | `src/screens/ProgressPhotosScreen.js:1324` | `If you check in this week, the coach can use this as context.` |
| B15 | `src/screens/PaywallScreen.js:202` | `Start the Coach` (title on the highest-stakes revenue screen) |
| B16 | `src/screens/SettingsAccountScreen.js:36,47` | `Coach decisions and weekly check-ins` / `Past coach decisions...` → `coaching decisions` reads cleaner either way |
| B17 | `src/screens/SettingsCoachingScreen.js:132,157,206` | `The coach only suggests cardio if a cut stalls.` / `The coach matches its wording...` / `...so the coach can steady targets around your period.` |
| B18 | `src/screens/SettingsScreen.js:104` | `Coach tone, cardio and weekly check-ins` |
| B19 | `src/screens/SubscriptionPolicyScreen.js:59,61` | `Pro is the coach who writes back.` / `Coach decisions that nudge your training...` |
| B20 | `src/screens/WelcomeScreen.js:29` | `The Coach explains what changed, what stayed the same, and why.` (has compliant InfoTooltip; casing still diverges) |
| B21 | `src/screens/YouScreen.js:121,347` | `The Coach will not change targets...` vs `...so the coach has context.` |
| B22 | `src/components/AttentionCard.js:96,100` | `How the Coach works` |
| B23 | `src/components/CardioPlanCard.js:36` | `Log any cardio you do. The coach sets a target only if a cut stalls.` (confirmed from prompt10's candidate list) |
| B24 | `src/components/WeightTrendCard.js:105` | `The Coach is building your estimate. Keep logging and it appears in about a week.` |
| B25 | `src/components/food/CalorieBankSheet.js:113` | `Your coach looks at the whole week...` (note: the "we can't shift that much" phrase prompt10 suspected is NOT a violation; the 2026-06-03 founder override permits impersonal/"we" in message bodies) |
| B26 | `src/lib/coachLedger.js:87,122` | `Your coach is getting to know you` / `What your coach is reading` |
| B27 | `src/lib/weeklyStory.js:115` | `The coach held everything the same this week.` |
| B28 | `src/lib/progressCaptureGuide.js:237` | `The coach may use broad trend direction as low-confidence context...` |
| B29 | `src/lib/coachGlossary.js:31-32` | `Our running estimate of the calories you burn a day...` — "Our" breaks the impersonal-"it" pattern every sibling entry uses. Suggested: `A running estimate of...` |

### Jargon and technical leakage

**B30. `src/screens/BlockReflectionScreen.js:58`**
Current: `Volume was lower in the final week than the first, likely a deload.`
Raw "deload" where the app's own established plain term is "recovery week"
(ActiveWorkoutScreen's deload banner title).
Suggested: `...likely a recovery week.`

**B31. `src/screens/LiftProgressScreen.js:393`**
Current: `Last time: {weight}{units} - e1RM {e1rm}{units}` — bare "e1RM" with no
gloss on this line (the nearby stat row has a tooltip; this line does not).
Suggested: reuse the established plain label: `Last time: ... - est. max ...`

**B32. `src/components/food/MicronutrientPanel.js:50,55`**
Current: `${pct}% of NRV` / `${pct}% NRV` — raw acronym, no gloss anywhere in
the panel (contrast `SourceChip.js`, which pairs CoFID with an InfoTooltip).
Suggested: add an InfoTooltip on the "Vitamins and minerals" header (:117)
explaining NRV in plain English.

**B33. `src/lib/volumeInsightCopy.js:25`**
Current: `${n} sets · on track for hypertrophy (target: ${range})`
"hypertrophy" raw on the workout summary row, not behind a tooltip; the sibling
`getVolumeWhy` already says "productive range".
Suggested: `${n} sets · on track for muscle growth (target: ${range})`

**B34. `src/lib/progressScanAnalysis.js:~1035`**
Current: `One scan was withheld by the quality gate.` — internal engineering
jargon returned as a user-facing reason.
Suggested: `One scan didn't pass the quality check.`

**B35. Raw error slugs interpolated into user-facing toasts:**
- `src/screens/PlanUpdateScreen.js:148,156,182` — `` `Couldn't rebuild your plan (${dry.error})...` `` / `` (${e?.message ?? 'unknown'}) `` / `` (${planResult.error}) ``
- `src/screens/ProGoalSetupScreen.js:359` — `` `...the training plan didn't rebuild (${planResult.error}). ...` ``
- `src/screens/ProOnboardingScreen.js:946` — `` `...your training plan didn't generate (${planResult.error}). ...` ``
Suggested: drop the parenthetical raw error from the user string (all three call
sites already `logError`); keep the plain sentence and the next step.

### Workout/session terminology (post-prompt10 stragglers)

**B36. `src/screens/HomeScreen.js:2066` vs `:1830`** — `Blank session` (sheet
action) vs `Just want to log? Start a blank workout` (quick link), same action.
Suggested: `Blank workout`.

**B37. `src/screens/WorkoutHistoryScreen.js:180,501` vs `:203,510,223`** —
`Repeat session` / `accessibilityLabel="Repeat session"` vs `Delete this workout?`
/ `Delete workout` / `Workout deleted.` on the same card.

**B38. `src/screens/WorkoutHistoryScreen.js:777-780`** — empty state uses three
words in two lines: `Your sessions will appear here` / `Completed workouts appear
here. Each session is saved automatically when you finish.`
Suggested: `Your workouts will appear here` / `Completed workouts appear here, saved automatically when you finish.`

**B39. `src/screens/WorkoutSummaryScreen.js`** — header `Workout complete` (:865,
correct) but body reverts to "session" throughout: `Your first session is done...`
(:483), `Strongest session in 4 weeks` (:919), `Session feedback` (:1252),
`Rate this session` (:1262), then back to `Save as Workout Template` (:1313).
Suggested: "workout" for the completed unit under the header it sits beneath;
"session" only where it means something distinct.

### Drift from locked surfaces (non-safety)

**B40. `src/screens/CascadeGateScreen.js:69-94` — drift from locked Surface 5.**
Live day-14/21/28 copy (`Your Pro trial is winding down` + generic body) has
neither the per-user stats opening ("14 days in. What Precision Coaching has
done: ...") nor the named actor; the payment-failure variant (`We couldn't take
your payment`) is missing the locked reassurance opener ("Precision Coaching
kept your data and your current target. Nothing has changed."). Reconcile
against the exact Surface 5 blocks.

**B41. `src/lib/notifications/scheduler.js:318-323` — drift from locked Surface 6 (weekly check-in reminder).**
Live: title `` `How has your week gone${name}` ``, body `A two-minute check-in is all it takes, and your coach tunes next week around it.`
Locked: `"Weekly check-in is open. Your update lands Monday morning."`
Suggested: title `` `Weekly check-in is open${name}` ``, body `Two minutes now, and Precision Coaching tunes next week around it.`

**B42. `src/lib/notifications/scheduler.js:452-455` — drift from locked Surface 6 (cascade gate).**
Live: `Your free Pro trial ends in two days` / `Hope you've been enjoying it. Have a look at your options whenever you're ready.`
Locked: `"Your Pro trial ends in 2 days. Tap to choose what's next."`
"Hope you've been enjoying it" is chirpy filler; the CTA is softened away.
Suggested body: `Tap to choose what happens next.`
(Companion `CASCADE_21_COPY` at :456-459 is clean; decide the pair together.)

**B43. `src/lib/weeklyCoach.js:1232` vs `src/lib/whyThisTemplates.js:553`** —
two different wordings for the same hold-lifted event (`Standard coaching resumes
next week.` vs `Standard coach output resumes, and new calorie targets land at
the next weekly run.`). Pick one canonical sentence (resolve with the Surface 7
reconciliation in the LOCKED section).

### Other B items

**B44. `src/lib/volumeInsightCopy.js:24`** — `` `${mev}–${mrv} sets/week` `` uses
an en dash for a numeric range. The addendum says dashes are "banned everywhere,
so ranges read 'MEV to MRV'"; prompt10 took a recorded carve-out for compact
numeric notation. Live tension between two documents: founder decision needed
(see decisions list), not a silent fix either way.

**B45. `src/lib/progressScanCopy.js:10-11` and `src/lib/progressScanAnalysis.js:1231,1233`** —
`Progress change: positive...` / `...drift to watch...` attach valence to
body-composition direction, while the sibling recomposition feature
(`recompReframe.js`) enforces "direction carries NO valence" for Class-B body
data. The two features disagree; founder decision needed on whether Progress
Scan adopts the no-valence rule.

**B46. `src/screens/PlanDetailScreen.js:368-381`** — visible labels `Edit Plan` /
`Duplicate Plan` / `Archive Plan` (Title Case) mismatch their own
accessibilityLabels `Edit plan` / `Duplicate plan` / `Archive plan`.
Suggested: sentence case for both.

---

## Severity C — polish

| # | Location | Current | Suggested |
|---|---|---|---|
| C1 | `src/screens/CoachReviewScreen.js:161` | `...Your joints will thank you.` | Drop the closing personification. |
| C2 | `src/screens/CoachReviewScreen.js:588` | `Nothing to flag this week, your training is looking nicely balanced.` | `Nothing to flag this week. Training volume is within range across the muscles you trained.` |
| C3 | `src/screens/ManualBuilderScreen.js:126` | `Plan Balance` (Title Case card title) | `Plan balance` |
| C4 | `src/screens/ManualBuilderScreen.js:1133,1138,1147` | `Plan Activated` / `Stay Here` / `Go to Train` | `Plan activated` / `Stay here` (`Go to Train` may stand; Train is a tab name) |
| C5 | `src/screens/HomeScreen.js:2287-2289` | headline `Looking good` | Neutral, e.g. `On track` |
| C6 | `src/screens/HomeScreen.js:2128` | `Takes a second. Helps us read your sessions better over time.` | `...Helps Precision Coaching read your sessions better over time.` |
| C7 | `src/screens/PrivacyPolicyScreen.js:11` | `title="Privacy Policy"` | `Privacy policy` (every sibling BackHeader is sentence case) |
| C8 | `src/screens/ProgressPhotosScreen.js:1634` | `title="Progress Photos"` | `Progress photos` |
| C9 | `src/screens/PlanDetailScreen.js:163` vs `:97` | alert titles `Archive Plan?` vs `Add this plan?` | Sentence case both |
| C10 | `src/screens/NutritionTargetsScreen.js:35-40` vs `:61-68` | `'Very Active'` (Title Case) vs `'Build muscle (slow)'` (sentence case) in the same file | Sentence case the activity labels |
| C11 | `src/screens/PlanUpdateScreen.js:226`, `ProGoalSetupScreen.js:411`, `ProOnboardingScreen.js:1484` | placeholder `Not competing, General` | `Not competing (general)` |
| C12 | `src/screens/NutritionEducationScreen.js:122-123` | mixes `roughly` and `≈` in adjacent sentences | Pick one register |
| C13 | `src/screens/NutritionTargetsScreen.js:1367` | raw `{results.bmrFormula}` name ("Katch-McArdle") behind the opt-in expandable, no plain term leading | Lead with the plain term per the addendum |
| C14 | `src/screens/SubscriptionPolicyScreen.js:32-118` | six stacked sections, 3-7 bullets each: information overload on one scroll | Candidate for collapsible sections; design decision |
| C15 | `src/screens/WeeklyCheckInScreen.js:850` | `We pre-fill what we can from your logs.` | Consistency check vs "Volyume" actor used at :1541; permitted "we", low priority |
| C16 | `src/screens/YouScreen.js:337` | `The Coach reads your logs, applies safety limits, and explains every decision.` | Triadic rhythm; factual, flag-only |
| C17 | `src/components/ConsistencyEcho.js:66` | `One off week never breaks your run.` | `One-off week...` (hyphen) |
| C18 | `src/components/ReadinessCards.js:182` | `...the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly....Building the habit is the foundation everything else sits on.` | `The more sessions you log, the more data Precision Coaching has to set your weights, catch a rep decline early, and time your lighter weeks.` |
| C19 | `src/lib/whyThisTemplates.js:414` | `...posing practice is non-negotiable.` | `...posing practice matters as much as the training itself.` |
| C20 | `src/lib/weeklyCoach.js:1289,1291` | `...That is showing up.` repeated verbatim in both branches | Drop or vary; the number carries it |
| C21 | `src/lib/milestones.js:84` | `...You've built something most people only talk about.` | `...That's a real training history behind you.` |
| C22 | `src/lib/volumeInsightCopy.js:56` | `...Backing off here is how you come back stronger.` | Drop the closing filler sentence |
| C23 | `src/lib/shareCard/drawShareCard.js:192` | badge label `EPIC SESSION` | Consider `BIG SESSION`; may stand as a deliberate celebratory exception |
| C24 | `src/lib/notifications/scheduler.js:86` | morning rotation variant `` `Rise and shine${name}` `` | Plainer variant matching the other three, e.g. `` `Morning${name}` `` |

---

## LOCKED / SAFETY-ADJACENT — flagged, not rewritten. Founder must review before ANY change.

These sit inside the ED-safety system (CLAUDE.md: do not touch without asking).
They are reported because the founder's no-silent-parking rule requires drift to
be surfaced; none of them may be edited without an explicit founder go-ahead and
the ED-safety review path.

**L1. `src/lib/whyThisTemplates.js:530-548` `ED_PATTERN_LOCKOUT_COPY` — DRIFT from locked Surface 1.**
Live title: `We've held your calorie cut`; body is prose-first, no figures.
Locked Surface 1: header `Pause week`, title `Precision Coaching has held your
calorie target steady`, numbers-before-narrative body ("Weight down 1.6 kg in
three weeks. Energy scores below 5 on 8 of the last 14 days..."), the
"pattern...is the one that breaks cuts" externalisation, a "Next step" block,
and the coach/clinician line. Section 7's mapping says this copy is "replaced
wholesale" by Surface 1; it has not been. (The "we" register itself is permitted
by the 2026-06-03 founder override; the missing structure, missing figures and
missing lines are the drift.) Includes A14's "the engine" at :547.

**L2. `src/lib/whyThisTemplates.js:550-556` `ED_PATTERN_CLEARED_COPY` — DRIFT from locked Surface 7.**
Live title `Your numbers are looking better` is vague praise with no figures,
close to the "you've turned a corner" pattern Surface 7 explicitly rejected.
Locked title: `Hold lifts at the next weekly run` with a numbers-first body.

**L3. `src/lib/whyThisTemplates.js:564-570` `RAPID_LOSS_CORRECTED_COPY` — DRIFT from the Surface 1 template (Move #3 mapping).**
Live: `We've added calories straight away` / `...we've bumped your daily target
up immediately....This isn't a punishment for hitting your goal too fast.` Lacks
the What-it-sees / Why-it-matters / Next-step structure; "hitting your goal too
fast" flirts with praise-of-rapid-loss for the at-risk subgroup.

**L4. `src/screens/WellbeingCheckScreen.js:72`** — SCOFF acknowledgement copy:
`...We've noted this so your coaching focuses on performance and support rather than restriction.`
Observation only: first-person plural inside safety-adjacent output borders the
honesty rule. Not Surface 1-8 text, so no drift claim; flag for engine-owner
review only.

**L5. `src/screens/Article9ConsentScreen.js`** — differs from Surface 3's locked
text but cites `docs/PRIVACY_CONSENT_LOCKED.md` as its source of truth in its
header comment. Not diffed here; belongs to a consent-doc audit. Noted that
commit `ae42b4d` touched this screen during the rename.

**L6. `src/components/food/HeldDecisionCard.js`** — renders locked safety copy
via props; no hardcoded strings of its own. Clean.

---

## Founder decisions needed (structured, none pre-decided)

1. **Actor naming (the headline).** Restore "Precision Coaching" (a) / adopt
   "The Coach" and amend the locked doc (b) / hybrid per-surface register (c).
   Resolves A3-A6, A12, B1-B29, C6, C16, C18 in one ruling.
2. **Surface 1/7 ED-copy reconciliation (L1-L3 + A14, A15).** The locked doc says
   these blocks are replaced wholesale; the live blocks predate that. Approve a
   supervised rewrite to the locked templates (with live figures), or explicitly
   re-lock the current wording and amend the doc.
3. **Surface 2 differential paywall (A9 + A21).** The trigger-specific copy was
   never wired into `PaywallScreen`; approve building it per the locked template,
   or amend the doc.
4. **Surface 5 cascade gate (B40) and Surface 6 notifications (A23, B41, B42).**
   Approve reconciliation to the locked blocks.
5. **En-dash numeric-notation carve-out (B44).** prompt10's recorded ruling vs
   the addendum's "banned everywhere": keep the carve-out (and record it in the
   locked doc) or convert numeric ranges to "to" and extend the lint gate.
6. **Progress Scan valence (B45).** Adopt recomp's no-valence rule for scan trend
   copy, or record why scan trends may carry direction-valence.
7. **"Engine Log" feature title (A13).** Rename to "Coaching log" or keep.
8. **PB emoji (A2).** Replace with icons or record as a deliberate exception
   (the code already carries a lint-disable).

---

## Coverage notes and gaps (for completeness, not silently parked)

- `src/lib/notifications/scheduler.js` imports push copy from
  `winbackContent.js`, `missedCheckin.js`, `plannedMealConfirm.js`,
  `trialActivation.js`, `activationNudge.js`, `partnerBeats.js`; these copy
  modules were not in this lane's file list and need a follow-up pass.
- `notifications/categories.js` defines `DAILY_CHECKIN_REMINDER`,
  `SUBSCRIPTION_PAYMENT_FAILURE` and `SUBSCRIPTION_EXPIRING`, but no
  corresponding Surface 6 copy was found in `scheduler.js`; either it lives
  elsewhere or it is an implementation gap. Needs a direct answer, not an
  assumption.
- Alert bodies and rarely-rendered branches were read, but a fix wave should
  re-verify line numbers before editing (files move fast in this repo; all line
  numbers were captured today against the current working tree).

## Summary table: findings per file

Files not listed were read and are clean (0/0/0). Counts exclude the LOCKED
flags (L1-L6), which are decision items, not fix items.

| File | A | B | C |
|---|---|---|---|
| screens/BlockReflectionScreen.js | 0 | 1 | 0 |
| screens/BodyMetricsScreen.js | 0 | 1 | 0 |
| screens/CardioHistoryScreen.js | 0 | 1 | 0 |
| screens/CascadeGateScreen.js | 0 | 1 | 0 |
| screens/CoachOutputScreen.js | 1 | 3 | 0 |
| screens/CoachReviewScreen.js | 0 | 0 | 2 |
| screens/CoachingRemindersScreen.js | 0 | 2 | 0 |
| screens/ConsistencyScreen.js | 1* | 0 | 0 |
| screens/ExerciseDetailScreen.js | 2 | 0 | 0 |
| screens/GoalLockConsentScreen.js | 2 | 0 | 0 |
| screens/HomeScreen.js | 2 | 2 | 2 |
| screens/LiftProgressScreen.js | 0 | 1 | 0 |
| screens/ManualBuilderScreen.js | 0 | 0 | 2 |
| screens/MesocycleBuilderScreen.js | 1* | 0 | 0 |
| screens/MethodologyScreen.js | 1 | 0 | 0 |
| screens/NutritionEducationScreen.js | 0 | 1 | 1 |
| screens/NutritionTargetsScreen.js | 0 | 0 | 2 |
| screens/PaywallScreen.js | 1 | 1 | 0 |
| screens/PlanDetailScreen.js | 0 | 1 | 1 |
| screens/PlanUpdateScreen.js | 0 | 1 | 1 |
| screens/PlansScreen.js | 0 | 1 | 0 |
| screens/PrivacyPolicyScreen.js | 0 | 0 | 1 |
| screens/ProGoalSetupScreen.js | 0 | 2 | 1 |
| screens/ProOnboardingScreen.js | 0 | 1 | 1 |
| screens/ProSetupCompleteScreen.js | 0 | 1 | 0 |
| screens/ProUpgradeScreen.js | 0 | 1 | 0 |
| screens/ProgressPhotosScreen.js | 0 | 1 | 1 |
| screens/SettingsAccountScreen.js | 0 | 1 | 0 |
| screens/SettingsCoachingScreen.js | 0 | 1 | 0 |
| screens/SettingsScreen.js | 1 | 1 | 0 |
| screens/ShareCardScreen.js | 1 | 0 | 0 |
| screens/SubscriptionPolicyScreen.js | 0 | 1 | 1 |
| screens/WeeklyCheckInScreen.js | 1 | 0 | 1 |
| screens/WelcomeScreen.js | 0 | 1 | 0 |
| screens/WellbeingCheckScreen.js | 0 | 0 | 0 (L4 flag) |
| screens/WorkoutHistoryScreen.js | 0 | 2 | 0 |
| screens/WorkoutSummaryScreen.js | 0 | 1 | 0 |
| screens/YouScreen.js | 0 | 1 | 1 |
| components/AttentionCard.js | 0 | 1 | 0 |
| components/CardioPlanCard.js | 0 | 1 | 0 |
| components/ConsistencyEcho.js | 0 | 0 | 1 |
| components/EngineLog.js | 1 | 0 | 0 |
| components/ReadinessCards.js | 0 | 0 | 1 |
| components/WeightTrendCard.js | 0 | 1 | 0 |
| components/food/CalorieBankSheet.js | 0 | 1 | 0 |
| components/food/MicronutrientPanel.js | 0 | 1 | 0 |
| lib/coachGlossary.js | 0 | 1 | 0 |
| lib/coachLedger.js | 0 | 1 | 0 |
| lib/differentialPaywall.js | 1 (8 lines) | 0 | 0 |
| lib/milestones.js | 1 | 0 | 1 |
| lib/notifications/scheduler.js | 1 | 2 | 1 |
| lib/onboarding/planPreview.js | 2 | 0 | 0 |
| lib/progressCaptureGuide.js | 0 | 1 | 0 |
| lib/progressScanAnalysis.js | 1 (6 lines) | 2 | 0 |
| lib/progressScanCopy.js | 0 | 1 | 0 |
| lib/shareCard/drawShareCard.js | 0 | 0 | 1 |
| lib/volumeInsightCopy.js | 0 | 3 | 1 |
| lib/weeklyCoach.js | 3 | 1 | 1 |
| lib/weeklyStory.js | 0 | 1 | 0 |
| lib/whyThisTemplates.js | 1 | 0 | 1 (+3 LOCKED drift) |
| **Totals** | **~23 A items (36 strings)** | **~46 B** | **~24 C** |

\* ConsistencyScreen:61 and MesocycleBuilderScreen:331 share the HomeScreen:2232
"body is signalling" string (A7); counted once as a finding, three fix sites.

Clean (read in full, zero findings): ActiveWorkoutScreen, AddCustomFoodScreen,
AnalyticsScreen, Article9ConsentScreen (see L5), AthleteProfileScreen,
BuildWorkoutScreen, CoachHeldHistoryScreen, CreditsScreen, DebugLogScreen,
DiaryScreen, FirstRunScreen, FoodInsightsScreen, FoodSearchScreen,
FreeStarterScreen, GoalChangeSummaryScreen, ImportScreen, LogCardioScreen,
LoginScreen, MealNamesScreen, MealPlanScreen, MyMealsScreen, MyRecipesScreen,
NotificationSettingsScreen, PartnerScreen, PerDayTargetsScreen, PlanLibraryScreen,
PlanPreviewScreen, QuizScreen, RecipeBuilderScreen, RoutineDetailScreen,
ScanBarcodeScreen, ScanLabelScreen, SettingsAbout/Data/Display/Health/Privacy/
ProfileScreen, SnapshotsScreen, SubscriptionScreen, VolumeHeatmapScreen,
WeeklyStoryScreen, WorkoutHistoryScreen (nav copy), YearOfLiftsScreen; ~93 of 99
component files; and in lib: coachApply, coachApplyView, coachReport,
coachOutcome, coachRegister, coachOutputZones, formTips, cancelReason,
recompReframe, activation, streak, readinessSummary, contestCountdown,
restSuggest, planDisplay, planDiff, femaleNutritionAwareness, wellbeing,
edPatternDetector, payments/* (catalogue, cascade, lapseDetect, winbackState),
food/mealSuggest, food/groceryList, food/labelName, shareCard/greatWeek,
partners/*, notifications/categories, listeners, handler, notificationRoute.
