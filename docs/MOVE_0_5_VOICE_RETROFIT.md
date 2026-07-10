⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Move #0.5: Voice retrofit (locked)

Mechanical pass through every user-facing string in the live app
and every user-facing block in the locked docs, applying the locked
patterns from `COACHING_VOICE_SYNTHESIS_LOCKED.md`. No new
features. No engine logic changes. No schema changes. Just copy.
Sequenced after Move #0 (citation/blocklist fixes) and before
Move #1 so the food-foundation surfaces land in the new voice from
day one rather than being rewritten later.

## Why this is its own move

- The voice synthesis touches roughly 80 string locations across
  the live codebase plus 11 locked docs. Doing it as part of
  Move #1 would bloat that move and conflate engine work with copy
  work.
- It needs its own snapshot-test pass to lock the new strings.
  Bundling it with Move #1 makes the snapshot churn harder to
  review.
- Sequencing it before Move #1 means the new food-layer copy
  (Diary, Search, food detail sheet, scan flow, custom food, FFM
  floor card) lands in the new voice from day one.
- Sequencing it before Move #2 means the ED-pattern lockout and
  goal-lock screens land in the new voice without needing a second
  rewrite.

## Scope: live-app strings

### `src/lib/whyThisTemplates.js`

All 12 exported template functions and their internal strings.
Each WHY_LIBRARY key gets rewritten against the locked synthesis
patterns:

- `getExerciseWhyThis`
- `getVolumeStatusMessage`
- `getProgressionMessage`
- `getAutoRegMessage`
- `getWeekPhaseDescription`
- `getSplitRationale`
- `getDeloadPredictionMessage`
- `getTimeCrunchMessage`
- `getTravelModeMessage`
- `getPosingConditioningMessage`

Each output line passes the honesty test ("would this still be
true if the user did nothing but kept logging?"). Each reference
to anonymous decision-maker becomes "Precision Coaching." Number
data leads, narrative follows.

The `JARGON_BLOCKLIST` and `checkJargon` function don't change in
this move (they were updated in Move #0). The strings each
function returns are what gets rewritten.

### `src/lib/weeklyCoach.js`

All user-facing output strings the function assembles, including:

- Calorie adjustment messages
- Held-decision card strings
- Energy and recovery score commentary
- Autoregulation matrix outputs
- MATADOR diet-break suggestion copy
- The `whyKey` reason strings the engine emits

The engine math stays unchanged; only the strings it produces are
rewritten. Sentence structure becomes numbers-first. References to
"the engine" or "the system" become "Precision Coaching."

### Existing screens

Search for user-facing strings in `src/screens/` that match any of
the failure-mode patterns from `COACHING_VOICE_SYNTHESIS_LOCKED.md`
Section 6. Rewrite each:

- `HomeScreen.js` -- welcome / status copy
- `WeeklyCheckInScreen.js` -- check-in prompt copy ("Precision
  Coaching * check-in" header is already correct)
- `CoachOutputScreen.js` -- header is correct; the body copy that
  consumes weeklyCoach output gets the retrofit via the
  weeklyCoach.js pass above
- `CoachingRemindersScreen.js` -- the explanatory copy at the top
- `WorkoutSummaryScreen.js` -- the "Complete at least 4 sessions
  to get personalised recommendations" line and similar
- `BodyMetricsScreen.js` -- any explanatory copy
- `SubscriptionPolicyScreen.js` -- already mostly correct; check
  for "we" misuse
- `ProUpgradeScreen.js` -- bullet feature lines
- `ProGoalSetupScreen.js` -- the "Your Precision Coaching adjusts
  at the next check-in" line and similar
- `AthleteHubScreen.js` -- the "Ready. Four questions..."
  empty-state lines
- `WelcomeScreen.js` -- the "Precision Coaching that adjusts your
  training and nutrition as your body responds" line (already
  correct, but check)
- `OnboardingScreen.js` -- step labels and goal-option labels
- `SettingsScreen.js` -- the "Mesocycle Planner" label is already
  flagged for replacement in earlier audit (jargon); rewrite
  during this pass
- `VolumeHeatmapScreen.js` -- "EDIT LANDMARKS" (RP jargon, already
  flagged); MEV/MAV/MRV legend needs the plain-language pass per
  Lang 2025

### Notifications

Existing notification titles and bodies in `src/lib/notifications.js`
and similar:

- `'Precision Coaching * check-in'` title is already correct.
- Body copy across the categories listed in
  `NOTIFICATIONS_LOCKED.md` gets the redrafts from
  `COACHING_VOICE_SYNTHESIS_LOCKED.md` Surface 6.

### Seeded data

- `src/lib/seedRoutines.js` -- "Target: 4 x 20-25 * RIR 2" still
  surfaces "RIR" in the user-visible info sheet (flagged in
  `USER_FACING_COPY_AUDIT.md`). Remove "* RIR 2" suffix from every
  seeded exercise note and replace with the plain-language effort
  cue ("Target: 4 x 20-25 * hard effort").

## Scope: locked-doc updates

The mapping in `COACHING_VOICE_SYNTHESIS_LOCKED.md` Section 7
names which existing locked docs need rewrites. The mechanical
list:

- `UI_FLOWS_LOCKED.md` -- replace "the engine"/"the system" with
  Precision Coaching; check empty-state copy.
- `ONBOARDING_SEQUENCE_LOCKED.md` -- replace Screen 3 copy with
  Surface 3 redraft; replace Screen 6 copy with Surface 4 redraft;
  retrofit Screens 10 and 12.
- `PRIVACY_CONSENT_LOCKED.md` -- replace Article 9 consent copy
  with Surface 3 redraft.
- `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` -- replace cascade-gate
  copy with Surface 5 redrafts; remove hard-coded prices from copy
  strings and reference `catalogue.js`.
- `NOTIFICATIONS_LOCKED.md` -- replace category copy with Surface
  6 redrafts.
- `MOVE_2_ED_PATTERN_DETECTION.md` -- replace held-decision card
  copy with Surface 1 redraft; replace cleared variant with
  Surface 7 redraft; replace goal-lock copy with Surface 4 redraft.
- `MOVE_3_UPWARD_GATE_COMPRESSION.md` -- apply Surface 1 template
  to rapid-loss correction card.
- `MOVE_4_DIFFERENTIAL_PAYWALL.md` -- replace all six conversion
  copy lines with Surface 2 template.
- `MOVE_5_TIER_INFRASTRUCTURE.md` -- apply Surface 5 redrafts to
  cascade gate UI specs.

Cross-cutting updates to existing docs:

- `MASTER_VISION_AND_PLAN.md` -- update Section 4 (voice and copy)
  to reference the synthesis as the source of truth.
- `RESEARCH_FINDINGS_SYNTHESISED.md` -- update Section 3 move #4
  conversion copy to reference the synthesis.
- `BRIEF_C_CLAUDE_ADJUDICATION.md` -- no change needed; it's an
  archived adjudication output.

## Tests required

### Snapshot

- `tests/snapshots/whyLibrary.snap.js` -- captures the rewritten
  WHY_LIBRARY outputs. CI fails on unexpected changes.
- `tests/snapshots/weeklyCoach.snap.js` -- captures rewritten
  weekly coach output strings.
- `tests/snapshots/surfaceCopy.snap.js` -- captures the eight
  surface redraft strings as canonical reference.

### Lint

- New CI step that greps the codebase for the failure-mode
  patterns from `COACHING_VOICE_SYNTHESIS_LOCKED.md` Section 6.
  If any user-facing string in `src/screens/`, `src/components/`,
  `src/lib/whyThisTemplates.js`, or `src/lib/notifications.js`
  matches a failure phrase, CI fails.

- The grep patterns to block:
  - `\bgreat job\b`, `\bfantastic\b`, `\bamazing\b`
  - `\bunhealthy\b`, `\bbad food\b`, `\bjunk food\b`
  - `let's (work|decide|figure)`
  - `together we`
  - `\bcrush\b`, `\bbeast mode\b`, `\bshred\b`
  - `streak broken`
  - `\bAI (has|will|can) (analy[sz]e|learn)`
  - `we've got you`
  - Plus the existing JARGON_BLOCKLIST patterns from
    `whyThisTemplates.js` extended to scan all user-facing
    strings, not just template output.

### Unit

- `tests/lib/whyThisTemplates.test.js` extended with a check that
  every template function output contains "Precision Coaching"
  where applicable (or correctly omits it when the string is
  user-action-only).

### Acceptance

- All existing tests still pass.
- All snapshots updated with explicit reviewer sign-off.
- New copy-lint CI step blocks at least one synthetic test
  violation (proves the linter works).
- Engine math tests unchanged (no logic change in this move).

## Effort estimate

3-5 days of focused work. Bulk of time is the WHY_LIBRARY rewrite
and the screen-by-screen surface audit. The locked-doc updates are
mechanical search-and-replace once the patterns are locked.

## What this move does NOT change

- Engine math (FFM floor calc, EWMA weight trend, adaptive TDEE,
  protein cap, autoregulation matrix). Unchanged.
- Engine output schema. Unchanged.
- Schema migrations. None.
- Dependencies. None added.
- Tests for engine logic. Unchanged.
- UI layout. The strings inside components change; the layout,
  navigation, and design system tokens do not.

## Sequencing

Lands between Move #0 (citation/blocklist fixes, already shipped)
and Move #1 (food foundation + FFM floor). Cannot be skipped or
deferred without leaving the new surfaces from Moves #1, #2, #4
and #5 in a different voice from the legacy weekly-coach output.

## Acceptance check

- Manual review of every WHY_LIBRARY output against the synthesis
  patterns.
- Manual review of every weeklyCoach output line.
- Snapshot diff reviewed by the founder before merge.
- Copy-lint CI step active.
- Locked docs in Section 7 mapping all updated.
- 903+ existing tests still pass.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The rewrite changes a string the engine uses as a key in a map or switch | The internal logic uses constant keys (`'ffm_floor_hold'`, `'rapid_loss_corrected'`, etc.), not the human-readable string. Verified by code search before rewrite. |
| Snapshot churn buries real regressions | One PR per area (whyThisTemplates, weeklyCoach, screens) so each snapshot diff is small and reviewable. |
| Some legacy strings are deliberately terse and the new voice over-explains | Stage 1 / Stage 2 register choice keeps terse strings terse. The synthesis says explicitly: "Direct. Precise. No fluff." is preserved. |
| The voice-lint CI step false-positives on legitimate strings | Allowlist file per CI rule. Allowlist entries require justification in the commit message. |
