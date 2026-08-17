# WAVE G — SECONDARY / HISTORY / DETAIL / MODALS — Findings

Campaign 24, Wave G. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17 (`git log -1` = `d8ad7e2a`). British English
throughout. Every finding carries file:line.

Screens read in full (register's WAVE G work queue,
`docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md:329-336`):
`src/screens/GoalChangeSummaryScreen.js` (409 ln), `src/screens/
GoalLockConsentScreen.js` (254 ln), `src/screens/ProGoalSetupScreen.js`
(817 ln), `src/screens/WellbeingCheckScreen.js` (271 ln), `src/screens/
ImportScreen.js` (537 ln), `src/screens/SnapshotsScreen.js` (152 ln),
`src/screens/DebugLogScreen.js` (259 ln), `src/screens/CreditsScreen.js`
(173 ln). Supporting modules read for authority/unit checks:
`src/lib/coachingGoals.js`, `src/lib/nutritionEngine.js`,
`src/lib/effectiveMaintenanceService.js`, `src/lib/planAutoGen.js`,
`src/lib/importExternal.js`, `src/lib/units.js`,
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (Surface 4), `src/navigation/
RootNavigator.js` (route registrations and tier gates for all eight
screens), `src/screens/YouScreen.js` (the sole caller for three of the
eight), `src/screens/SettingsDataScreen.js` / `SettingsAboutScreen.js`
(callers for the remaining four).

Also performed: the completeness sweep across the register's WAVE A-F
rows against `WAVE-A-FINDINGS.md` … `WAVE-E-FINDINGS.md` (WAVE-F does not
exist — see MISSED_COVERAGE below), and the founder's known-residue
policy check for `useProgressData.js`, `progressSeries.js` and
`user_insights` against the eight in-scope screens.

---

## GoalChangeSummaryScreen.js (`GoalChangeSummary`)

PURPOSE: post-save receipt screen, shown after `ProGoalSetupScreen` saves a
goal/phase change — a diff card per changed field (goal, phase, calories,
macros, protein approach) plus plain-English reasons and a "what happens
next" block.

VERDICT: **NO_CHANGE** on behaviour. The screen never computes a target
itself; every value it renders (`route.params.previous`/`.next`) is
supplied by the caller (`ProGoalSetupScreen.js:471-491`), so there is no
authority collision — it is a pure diff renderer. The ED-flag gate
(`:155-166`) correctly fails closed (`useState(true)`, only cleared on a
confirmed-clear read) and, when open, swaps the phase/kcal reasoning to the
neutral "adjust to match your new phase/goal" line instead of the causal
explanation (`:189-197`) — the same pattern `ProSetupCompleteScreen.js` and
`GoalLockConsentScreen.js` use elsewhere, tier-blind by construction. The
eight-week diet-break notice is correctly suppressed under an open flag
(`:312-319`). `buildKcalReason` (`:49-71`) tracks the true sign of the
delta for both cut and gain framing (guarded explicitly by its own
in-file comment against saying a cut "fuels muscle growth"). No em dash,
no unit literal (kcal only, no kg/lbs).

REGISTER_ACCURACY (register `SCREEN-UX-REGISTER.md:166`): ENTRY POINTS
column reads "ProfileStack, notification routing, goal change flow".
Grepped the whole app for a second call site: the only navigation call to
`'GoalChangeSummary'` anywhere in `src/` is
`ProGoalSetupScreen.js:471` (`navigation.replace(...)`), and no
notification-routing table (`src/lib/notifications/`) references this
route at all. "Notification routing" and "ProfileStack" (as a distinct
route registration path) are not real entry points.
CORRECTION: register row 166, ENTRY POINTS → `ProGoalSetupScreen save
action only`.

---

## GoalLockConsentScreen.js (`GoalLockConsent`)

PURPOSE: the aggressive-cut ED-threshold choice (2-signal vs 3-signal
detector gate). Reached from Coach → Goal lock as a self-serve edit
surface (the onboarding interstitial was removed 2026-05-29 per the
in-file header, `:18-22`).

VERDICT: **NO_CHANGE**, independently re-verified (this screen was also
read by Wave E, `WAVE-E-FINDINGS.md:655-671`, same verdict). Copy checked
line-by-line against `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md:370-398`
(Surface 4): body paragraphs and the closing safety-floor line
(`GoalLockConsentScreen.js:98-103,137-139`) match verbatim; the two option
strings (`:117-119,131-133`) carry the same meaning as the locked draft
with light paraphrase ("I have prior experience managing... safely" vs the
doc's "I'm experienced with...") — not a wording regression, no banned
term, no re-added "unhealthy patterns"/"Recommended" tag (both explicitly
rejected in the locked doc). The absolute FFM safety floor is correctly
out of the user's reach here (`:138`, "Either choice keeps the absolute
safety floor... in place") — only the detector threshold changes,
matching Section 2's "never make the floor conditional" law. `editMode`
pre-loads the stored value rather than defaulting (`:57-67`). No em dash,
no unit literal.

REGISTER_ACCURACY (register `SCREEN-UX-REGISTER.md:167`): ENTRY POINTS
column reads "GoalChangeSummaryScreen, ProfileStack". Grepped
`GoalChangeSummaryScreen.js` for a navigation call to `GoalLockConsent`:
none — the only mention (`:214`) is a code comment naming it as a
"sibling plain-push screen", not a navigation target. The real and only
caller is `YouScreen.js:706` (`navigation.navigate('GoalLockConsent',
{ editMode: true })`).
CORRECTION: register row 167, ENTRY POINTS → `YouScreen Safety checks
section only`.

---

## ProGoalSetupScreen.js (`ProGoalSetup`)

PURPOSE: the Pro goal/phase/training-setup editor — physique category,
training phase, experience/days/session-length/equipment/recovery, protein
approach, optional show date and weak-point selection. Saving rebuilds
nutrition targets and rerolls the active plan.

VERDICT: **NO_CHANGE** on authority. Every target this screen writes
routes through the shared engine, not a local calculation:
`buildNutritionEngineInputs` → `resolveEffectiveMaintenanceForUser` →
`calculateNutritionTargets` (`:395-416`), the identical three-call chain
`ProOnboardingScreen.js` uses (cross-checked against Wave E's authority
table, `WAVE-E-FINDINGS.md:679`). Plan generation goes through
`generateAndSavePlan` (`:456`), not a local plan-builder. The
biology-completeness guard (`:342-394`) is real and matches the founder's
"no invented biology" rule cited in its own comment (D96): a missing
sex/age/height/weight SKIPS the recalculation and tells the user where to
complete their profile, rather than substituting fabricated values or
defaulting sex — the sex-required-field law (`proOnboarding.sexGate`
territory) is not bypassed here. `confirmPlanSwitchMidBlock` (`:222`) gates
the mid-block plan rebuild with the same confirm every other
plan-replacing path in the app uses. `displayWeightKg`
(`formatBodyWeightShort(displayWeightKg, userProfile?.bodyWeightUnits ??
'st')`, `:697`) reads the unit from the store with the same `'st'` default
the store itself uses (`useAppStore.js:1904`) — not a hard-coded literal
divergent from the unit system. No em dash.

Single duplicate-CTA/authority check specific to this screen: the protein
approach picker re-seeds from the **saved `nutrition_targets` row**
(`:124-138`), not the profile mirror, with an explicit in-file citation
(D94/Review-B-finding-4) explaining why — the profile copy can be stale
relative to what `NutritionTargetsScreen.js` last wrote, and seeding from
the stale copy previously caused a silent revert of a choice made
elsewhere. Confirmed as the single source of truth for this field; no
second seed path found.

---

## WellbeingCheckScreen.js (`WellbeingCheck`) — ED-safety adjacent

PURPOSE: the 5-question SCOFF self-report questionnaire. Writes
`scoffScore` to both the local profile (authoritative for gating) and the
cloud `user_body_profile` row (best-effort, logged on failure).

VERDICT: **NO_CHANGE** on ED-safety logic — this is a "do not touch" area
under Section 2 and no change is proposed. The local-write-is-authoritative
design is explicit and correct (`:73-76`): a failed cloud write is logged
(`logError`) but never blocks the local score, and the merge-before-write
pattern (`:84-86`) avoids the previously-fixed bug (C5-P5-03/D96) where a
partial payload nulled sex/DOB/height on the canonical body-composition
row. The score≥2 branch (`:88-93`) does not gate or suppress anything — it
shows an information alert and lets the user proceed, consistent with
"guardrails are tier-blind" and with not adding a new blocking gate that
wasn't specified. Accessibility (radiogroup roles, hidden duplicate
question text, live-region save hint) is complete (AX-14 citations,
`:116-130,169-173`). No em dash, no unit literal.

**REGISTER_ACCURACY — the most consequential of the eight** (register
`SCREEN-UX-REGISTER.md:151`): PRIMARY JOB column reads "Beat UK ED
screening and calm mode management — manage wellbeing status and activate
calm mode." Read the whole file: there is no calm-mode toggle, no
calm-mode reference, and no literal "Beat" text anywhere in
`WellbeingCheckScreen.js` (grepped case-insensitively, zero hits). The
score≥2 branch instead shows a generic referral ("speaking to your GP or a
registered dietitian", `:91`). The calm-mode toggle actually lives in
`SettingsCoachingScreen.js:74,148` (`toggleCalmMode`); the real Beat UK
link (`BEAT_URL`) lives in `src/components/food/HeldDecisionCard.js:17`,
surfaced only when the coach output shows a "Held this week" card with
`type === 'ed_pattern'` — a downstream, detector-fired trigger, not this
questionnaire's save action. This is very likely a correct, deliberate
design (SCOFF alone is a self-report input, not the combined-signal
detector `HeldDecisionCard`'s Beat link is reserved for) — **not** a
proposed logic change, and not something this audit touches given
Section 2's "STOP and ask first" rule for anything ED-safety-adjacent.
But `YouScreen.js:690-692`'s own code comment asserts this screen "shows"
the Beat UK signpost ("nor reach the Beat UK signpost it shows"), which is
factually wrong about the current file, and the register's PRIMARY JOB
column repeats the same wrong claim.
CORRECTION (documentation only, no logic touched): (1) register row 151,
PRIMARY JOB → "Beat UK ED screening — five-question SCOFF self-report,
feeds the tier-blind safety system"; drop "and calm mode management" (that
belongs on `SettingsCoachingScreen`'s row, WAVE F territory, not audited
here). (2) `YouScreen.js:690-692` comment's "nor reach the Beat UK
signpost it shows" is imprecise and should read "...nor reach the SCOFF
screening that feeds the safety system's Beat UK signpost" or similar —
flagged, not corrected here as it sits inside `YouScreen.js` (owned by
Wave C, already landed).

**REGISTER_ACCURACY** (register `SCREEN-UX-REGISTER.md:151`): ENTRY
POINTS column reads "SettingsHealthScreen wellbeing state card,
ProfileTab." `SettingsHealthScreen.js` contains no navigation call to
`WellbeingCheck` (confirmed by grep) and is in fact an Apple
Health/Health Connect integration screen with no ED-pattern-flag or
calm-mode content at all — a second register mismatch on the same row,
this time on `SettingsHealthScreen`'s own PRIMARY JOB
(`SCREEN-UX-REGISTER.md:140`, "ED pattern flag status, wellbeing state
(Beat UK), and calm mode toggle" — none of that is in the file). Wave F
has not run, so this second file was not read in full here (out of
scope), but `YouScreen.js:690` states in its own words that "YouScreen is
the ONLY route to WellbeingCheckScreen in the whole app" — confirmed by
grep, zero other call sites.
CORRECTION: register row 151, ENTRY POINTS → `YouScreen Safety checks
section only`. Flagging register row 140 (`SettingsHealth`) as a
likely-stale PRIMARY JOB for Wave F to verify when it runs; not
adjudicated here (unread file, Wave F territory).

---

## ImportScreen.js (`Import`)

PURPOSE: one-shot CSV import from Hevy or Strong exports — parse, preview
(matched/unmatched exercise counts), confirm, write to SQLite, then
best-effort push to cloud.

VERDICT: **NO_CHANGE**. Two supported formats only (`SOURCES`, `:37-50`;
`detectFormat` in `src/lib/importExternal.js:137` returns `'hevy' |
'strong' | 'unknown'`, no third branch), and the on-screen source cards
correctly advertise only Hevy and Strong (`:191-201`) — the screen itself
never claims Fitbod support. Destructive-adjacent copy is calm and
accurate (unmatched exercises become editable custom exercises, stated
plainly, `:186-187,274`); import failure leaves nothing saved and says so
(`:163-166`); the post-import cloud push is fire-and-forget with an
explicit non-blocking rationale (`:149-159`). Accessibility: parse errors
get an `alert`/`assertive` live region plus a best-effort focus move
(AX-08 citation, `:72-90`). No em dash, no unit literal (import counts
are unit-less integers via `formatNumber`).

**REGISTER_ACCURACY** (register `SCREEN-UX-REGISTER.md:156` and
`:333`, the WAVE G work-queue row): both the PRIMARY JOB and NOTES columns
say "Import workouts from Strong, Fitbod, and other exportable formats."
Fitbod is not mentioned anywhere in `ImportScreen.js` or
`src/lib/importExternal.js` (grepped case-insensitively, zero hits in
either file) — the app supports exactly two formats today. This is a
register-only inaccuracy; the screen's own copy is honest and does not
overclaim.
CORRECTION: register row 156 and the WAVE G work-queue line 333, PRIMARY
JOB/description → "Import workouts from Hevy and Strong CSV exports."

---

## SnapshotsScreen.js (`Snapshots`)

PURPOSE: lists the rolling set of automatic pre-migration/pre-account-switch
DB snapshots; two-tap destructive restore (confirm → close DB handle →
overwrite live file → ask for relaunch).

VERDICT: **NO_CHANGE**. Destructive-action copy states the scope plainly
("replaces ALL current data... cannot be undone", `:69`) and matches the
same calm, generic failure copy `SettingsDataScreen.js`'s equivalent JSON
restore uses (cited explicitly, `:86-93`, C2 pre-release sweep). Empty and
error states are both handled (no snapshots yet vs load failure with a
retry row, `:110-127`). No authority logic here (pure file-listing/restore
UI over `src/lib/dbSnapshot.js`), no unit literal, no em dash. Register
row (`SCREEN-UX-REGISTER.md:169`, `:334`) matches the file's actual
purpose and its sole entry point (`SettingsDataScreen.js:316`) exactly —
no correction needed.

---

## DebugLogScreen.js (`DebugLog`)

PURPOSE: on-device viewer for the last 200 buffered log events plus the
most recent fatal crash; filter by level, share as text, run a sync
diagnostic, or clear.

VERDICT: **NO_CHANGE**. Gating matches the register's "not user-facing in
production" note (`SCREEN-UX-REGISTER.md:168`) exactly:
`SettingsAboutScreen.js:95-138` reaches this route only via a hidden
multi-tap-within-a-window gesture (any build) or `__DEV__`-only long-press
(dev builds), confirmed by direct read — no plain settings row advertises
it. `handleDiagnose` (`:64-89`) is read-only reporting over
`diagnoseSyncConflicts` (a diagnostic query, not a data mutation) and
writes its findings back into the same log buffer as `info` entries, so
it doesn't introduce a second write path. The severity→colour mapping
(`buildLevelStyle`/`buildLevelLabelStyle`, `:197-206`) is a plain
error/warn/default indicator, not a valence judgement, per its own CP-10
citation. No em dash, no unit literal. Register row matches the file
exactly — no correction needed.

---

## CreditsScreen.js (`Credits`)

PURPOSE: licence-required attribution for the app's food data sources
(OpenFoodFacts/ODbL, CoFID/OGL v3.0, USDA public domain).

VERDICT: **NO_CHANGE**. All three attribution strings are present and, per
the in-file header citation, the CoFID line is the OGL-required verbatim
text (`:9-11,71-73`); each card links out to the correct source
(`:58,74,90`). No em dash, no unit literal, no authority content (this
screen makes no training/nutrition decision).

**REGISTER_ACCURACY** (register `SCREEN-UX-REGISTER.md:157` and `:336`):
PRIMARY JOB reads "Credits — music, fonts, data sources, and third-party
attributions." The file contains three cards, all food-data sources; no
music credit, no font credit, anywhere in the file (confirmed by full
read). Likely a generic placeholder description written before the
screen was scoped down to food-data attribution only (the file's own
header comment, `:1-17`, frames it purely as a food-data-licence
requirement).
CORRECTION: register row 157 and WAVE G work-queue line 336, PRIMARY JOB
→ "Credits — attribution for the app's food data sources (OpenFoodFacts,
CoFID, USDA)."

---

## Authority-collision table (mandatory hunt)

| Question | Finding |
|---|---|
| Any Wave G screen computing calorie/macro/volume/deload targets independently of `nutritionEngine.js`/`planAutoGen.js`/`mesocycle.js`? | **None.** `ProGoalSetupScreen.js` is the only screen in scope that touches targets, and it routes every write through `buildNutritionEngineInputs → resolveEffectiveMaintenanceForUser → calculateNutritionTargets` and `generateAndSavePlan`, the same chain Wave E verified for `ProOnboardingScreen.js`. `GoalChangeSummaryScreen.js` only displays values computed elsewhere. |
| Stale copy contradicting C20 (prescription)/C21 (coach graph)/C22 (Home)/C23 (Progress) law? | **None found** in the eight screens' own copy. |
| Duplicate CTAs (two buttons driving the same action, or a nag repeated across screens)? | **None found.** Each screen has one primary action per stage; `GoalChangeSummaryScreen`'s single "Got it" and `ProGoalSetupScreen`'s single "Review my plan changes" don't duplicate any sibling screen's CTA. |
| Hard-coded kg/lbs/kcal literal beside a store unit? | **None.** `kcal` appears only for calories (not a user-toggleable unit in this app); the one body-weight display (`ProGoalSetupScreen.js:697`) reads its unit from `userProfile.bodyWeightUnits`, falling back to the same `'st'` default the store itself uses (`useAppStore.js:1904`), not an independent literal. |
| Tier law (free/pro binary, guardrails tier-blind)? | **Correct throughout.** `ProGoalSetup` is the only Pro-gated screen of the eight (`RootNavigator.js:232`, `withProGuard`); `GoalChangeSummary`, `GoalLockConsent` and `WellbeingCheck` are correctly ungated per `YouScreen.js:690-699`'s explicit tier-blind-guardrail rationale (W-8/D96); `Import`, `Snapshots`, `DebugLog`, `Credits` are utility/support screens, correctly ungated. |
| ED-safety / calm-mode / Beat UK: removed, weakened, or gated anywhere in scope? | **No removal or weakening found.** `WellbeingCheckScreen.js`'s logic is untouched-worthy (see its NO_CHANGE verdict); the register/comment inaccuracy about it "showing" a Beat UK signpost is a documentation issue, not a code regression — the real Beat UK link (`HeldDecisionCard.js`) and the real calm-mode toggle (`SettingsCoachingScreen.js`) both still exist and are unweakened, just located on different screens than the register claims. |

---

## MISSED_COVERAGE

**WAVE F was never executed.** `docs/whole-app-coherence-campaign-24-2026-08-17/`
contains `WAVE-A-FINDINGS.md` through `WAVE-E-FINDINGS.md` and this file
(`WAVE-G-FINDINGS.md`) — no `WAVE-F-FINDINGS.md` exists (confirmed by
directory listing and by a repo-wide grep for any file referencing
`SettingsScreen.js`/`SettingsAccountScreen.js`/`SettingsPrivacyScreen.js`
as audited: zero hits outside the register itself). Wave C's own findings
file states this explicitly in passing: *"`SettingsCoachingScreen.js` and
other `Settings*` screens are Wave F's lane and were not opened"*
(`WAVE-C-FINDINGS.md:29-30`). All 19 rows the register assigns to WAVE F
(`SCREEN-UX-REGISTER.md:307-325`; the wave's own header at line 305 says
"18 screens" — an off-by-one in the register's own count, see the small
note below) are therefore **UNREVIEWED, not AUDITED**, despite the
campaign's acceptance gate requiring zero unreviewed screens:

1. `Settings` — `SettingsScreen.js`
2. `SettingsWorkout` — `SettingsWorkoutScreen.js`
3. `SettingsAccount` — `SettingsAccountScreen.js`
4. `SettingsProfile` — `SettingsProfileScreen.js`
5. `SettingsCoaching` — `SettingsCoachingScreen.js` (contains the live
   calm-mode toggle — see the WellbeingCheck finding above; ED-safety
   adjacent, needs a careful Wave F read)
6. `SettingsDisplay` — `SettingsDisplayScreen.js`
7. `SettingsHealth` — `SettingsHealthScreen.js` (its register PRIMARY JOB
   is also flagged as likely stale above — needs Wave F verification)
8. `SettingsData` — `SettingsDataScreen.js`
9. `SettingsDietary` — `SettingsDietaryScreen.js`
10. `SettingsPrivacy` — `SettingsPrivacyScreen.js`
11. `SettingsAbout` — `SettingsAboutScreen.js`
12. `SettingsFaq` — `SettingsFaqScreen.js`
13. `NutritionTargets` — `NutritionTargetsScreen.js`
14. `MealNames` — `MealNamesScreen.js` (D95: deliberately unreachable,
    still needs its retained-but-dead status confirmed)
15. `NutritionEducation` — `NutritionEducationScreen.js`
16. `NotificationSettings` — `NotificationSettingsScreen.js`
17. `CoachingReminders` — `CoachingRemindersScreen.js`
18. `Subscription` — `SubscriptionScreen.js` (billing-adjacent — Section 2
    billing-change discipline applies to any finding here)
19. `SubscriptionPolicy` — `SubscriptionPolicyScreen.js`

Waves A-E and G together account for 78 of the register's 81 production
routes (11+10+9+10+11+8, plus the 19 above = 78; the register's own
"UNREVIEWED: 76" summary count, `SCREEN-UX-REGISTER.md:230`, is therefore
also off by two against its own per-wave work-queue lists — a second small
register-arithmetic note, not re-derived here as it does not change the
MISSED_COVERAGE finding: Wave F's 19 rows are the entirety of the gap
regardless of which total is correct).

**Small ancillary register-quality notes spotted incidentally while
cross-checking (not Wave G's screens, flagged for whoever reconciles the
register next):**
- `SCREEN-UX-REGISTER.md:59` (`PlanLibrary` row): `SOURCE FILE` column
  reads `` `src/screens/PlansScreen `` — malformed (unclosed code span)
  and the wrong file; the WAVE A work-queue line for the same screen
  correctly names `PlanLibraryScreen.js`. Wave A territory, not
  re-adjudicated here.
- WAVE E's header (`:291`) says "(10 screens)" but lists 11
  (`Welcome`...`CascadeGate`, lines 293-303). WAVE F's header (`:305`)
  says "(18 screens)" but lists 19 (see above). Both are header/list
  count mismatches only; the lists themselves (which this sweep used)
  are internally consistent.

**Acceptance-gate impact:** the campaign cannot close with "zero
unreviewed screens" while Wave F has not run. This is the single highest-
priority item in this report.

---

## Residue classification (founder's known-residue policy)

1. **`useProgressData.js`'s `computePRsPerWeek`/`prBars`/
   `handlePrWindowToggle`** — **NO INTERSECTION with Wave G.** Grepped
   all eight in-scope screens for `useProgressData`/`progressSeries`:
   zero imports in any of them. The hook's only consumers are
   `ConsistencyScreen.js`, `AnalyticsScreen.js` and `CoachReviewScreen.js`
   (`src/hooks/useProgressData.js` importer list, cross-checked) — Wave D,
   the Progress root, and Wave C respectively, all already covered.
   Re-confirmed the unused-returns claim independently: `prBars`,
   `prWindow` and `handlePrWindowToggle` are all present in the hook's
   return object (`useProgressData.js:521-528`) but grepped as absent
   from every destructure site in `ConsistencyScreen.js` and
   `AnalyticsScreen.js`. Per policy, this is recorded, not spec'd, here
   — the mechanical-removal proof (confirming ConsistencyScreen shares
   the hook and tracing exactly which returns die) belongs to whichever
   wave/global-cohesion pass owns `useProgressData.js`'s consumers,
   already flagged by Wave D itself (`WAVE-D-FINDINGS.md:588`, its own
   founder-ruling fork on this exact file) — not duplicated here.

2. **`buildWeeklySessionCounts` (`progressSeries.js:112`)** — **NO
   INTERSECTION with Wave G.** Zero imports of `progressSeries` in any of
   the eight in-scope screens. Recorded, not spec'd; belongs to whichever
   wave owns the function's (non-existent, per the brief) production
   caller.

3. **`user_insights` sync registration** — **NO INTERSECTION with Wave G,
   and not claimed by any prior wave.** Grepped `WAVE-A` through
   `WAVE-E-FINDINGS.md` for `user_insights`: zero hits in all five. None
   of the eight Wave G screens reference the `user_insights` table
   (`src/lib/database.js` is its only touch point among files this audit
   read, via `getUserInsights`/dismissal helpers — none of which are
   called from any Wave G screen). Recorded as still unclaimed by any
   completed wave; whoever owns the sync-registry audit (not run by name
   in any wave so far) should pick this up, most naturally alongside
   `HomeScreen.js` (its likely UI consumer) or a dedicated sync-layer
   pass — outside this wave's screen-by-screen scope either way.

---

## CHANGE PLAN (risk-ordered: none of the eight screens need a logic or
copy change; every finding here is register/comment documentation only)

0. **Wave F must run.** Not a Wave G change, but the single blocking item
   for the campaign's acceptance gate. Nineteen screens, two of them
   ED-safety/calm-mode adjacent (`SettingsHealth`, `SettingsCoaching`) and
   one billing-adjacent (`Subscription`), remain genuinely unreviewed.

1. **Register corrections (pure documentation, zero code risk)** —
   `docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md`:
   - Row 151 (`WellbeingCheck`): PRIMARY JOB and ENTRY POINTS, per the
     WellbeingCheckScreen finding above.
   - Row 156 / work-queue line 333 (`Import`): drop the Fitbod claim.
   - Row 157 / work-queue line 336 (`Credits`): drop the music/fonts
     claim.
   - Row 166 (`GoalChangeSummary`): ENTRY POINTS, drop "notification
     routing".
   - Row 167 (`GoalLockConsent`): ENTRY POINTS, correct to YouScreen only.
   - Row 59 (`PlanLibrary`, spotted incidentally): fix the malformed
     SOURCE FILE cell.
   - WAVE E and WAVE F headers (lines 291, 305): fix the off-by-one
     screen counts against their own lists.
   - Line 230 summary count: re-derive the "UNREVIEWED: 76" figure once
     Wave F's true count is settled (likely 78 minus whatever Wave F
     itself resolves).

2. **`YouScreen.js:690-692` comment wording** — flagged only, not
   corrected here (Wave C's file, already landed): "nor reach the Beat UK
   signpost it shows" overstates what `WellbeingCheckScreen` itself
   renders. Low priority, comment-only, no user-facing effect.

No screen in Wave G's own eight requires a functional, copy, unit, or
authority correction.

---

## Candidate founder forks

**None.** Every finding in this wave is either NO_CHANGE with proof, a
register/comment documentation correction with no code-behaviour change,
or the MISSED_COVERAGE item (which is a scheduling gap, not a product
decision — Wave F simply has not run yet and needs to be dispatched like
any other wave, not ruled on).
