# Campaign 3, Phase 2 — ownership rulings (LEAD, D94-1)

Ruled 2026-08-10 under D33 on the inventory's 16 writer issues
(SETTINGS-INVENTORY.md §4) and the control-gap evidence
(CONTROL-GAPS-EVIDENCE.md). One owner per setting is the law; every
ruling below names the owner or the founder question.

| # | Finding | Ruling |
|---|---|---|
| 1 | NutritionTargets Sex/Age/Height editable-looking, never persisted (ED-adjacent) | **FOUNDER RULING FR-1** (below). No code change without it - sex feeds the sacred floor. |
| 2 | Diet preference: two writers, different value sets | **FIX (agent lane B)**: both surfaces render from the one shared DIETS list; equivalent writers, explicitly intentional. |
| 3 | Coaching-reminder SQLite mirror frozen (dead applyNotifications) | **VERIFY-THEN-FIX (agent lane A)**: restore the mirror at the live writer only if the rows have a live reader; else dead residue → Campaign 4. |
| 4 | Two "Meals per day" controls, different keys/ranges | **FIX (agent lane B)**: reader-verified relabel so each label states its true consequence; keys not merged blind. |
| 5 | Two goal writers (calculator vs profile) | **DOCUMENT**: intentional per the Campaign 2 verified-no-change ruling (D93 addendum 5a); the calculator is standalone by design. |
| 6 | Two protein-approach writers | **RE-RULED ON EVIDENCE: genuine silent-revert defect, FIXED (lead).** Lane B's trace showed every live consumer reads nutrition_targets while ProGoalSetup seeded its picker from the stale profile copy and OVERWROTE the row on save - reverting a Nutrition Targets choice the user never touched. ProGoalSetup now seeds from the saved row (live truth) with the profile as fallback; its dual-store save is unchanged and can no longer regress an untouched picker. NOT the #5 duality: this was one row, three writers, one stale seed. |
| 7 | "LOCAL-ONLY" internal docs imprecise (bulk pref push ships them) | **DOCUMENT** here: the fields ride @volyume_user_profile_<uid> through pref sync; never build a user-facing "device-only" claim on those comments. Comment fixes → Campaign 4 list. |
| 8-10 | mealPlanPeriWorkout / FatConvention / PinnedMeals: readers, no writer; one FALSE code comment claims a control exists | **FOUNDER RULING FR-2**: dormant capability - add controls or retire readers. The lying mealSlots comment is recorded for Campaign 4. No UI invented from key residue. |
| 11 | hide-exact-numbers: no writer, default on, pinned guard vs live setter; coach copy claimed "as you chose" | Copy half **FIXED** (lead): the false choice claim is gone ("Detailed scores stay hidden here; the trend is the steadier read."). Control half **FOUNDER RULING FR-3**. |
| 12 | partnerCheerEnabled: three pushes gated on a writerless flag | **FIX (agent lane A)**: sibling-pattern toggle; the locked notification law requires the unsubscribe path and the code comment records the intent. |
| 13 | Onboarding checkinHour 12 outside the picker's 14-21 | **FIX (agent lane A)**: onboarding writes the canonical default 18; pin. |
| 14 | Onboarding replaces the notification blob without merging | **FIX (agent lane A)**: merge like every other writer. |
| 15 | Two permanent dismissals with no way back (photo prompt opt-out; partner reconnect) | **Phase 11 lane**: re-entry affordances to be ruled with the state-gated audit (a dismissal of something consequential must be recoverable). Held until that phase's evidence. |
| 16 | Per-side logging "no off switch" | **STALE - INVENTORY WRONG.** A manual toggle exists in the exercise options sheet (ActiveWorkoutScreen.js:3523-3547), laterality-gated, honest off path ("Stop logging this exercise per side"). No change; inventory corrected. |

## Founder rulings required (per the order's format)

**FR-1 — Nutrition calculator's Sex / Age / Height fields.**
Current behaviour: prefilled from the body profile, freely editable,
used to compute the saved targets, never written back - so the saved
targets can be computed under a different sex than every downstream
floor and gate reads. Code: NutritionTargetsScreen.js:376-386 (prefill),
:429-545 (persist path with no profile write), :654/:739 (sex chips).
User consequence: a user who "corrects" their sex here believes the app
knows; only this screen does. Options: (A) make the fields read-only
with a link to the canonical profile editor (one owner, no divergence,
safest); (B) write through to the body profile (second writer for an
ED-critical field; onboarding sex-gate law says sex is never silently
defaulted - an explicit user tap arguably qualifies, but it widens the
writer set for the floor's input); (C) leave as is (rejected by both
campaign laws). Recommended: A. Release: not blocked (divergence
requires a deliberate edit; floors themselves read the profile and
fail protective).

**FR-2 — Dormant meal-plan preferences (peri-workout, fat convention,
pinned meals).** Current behaviour: engine consumes them with defaults;
no UI writes them; one code comment falsely claims a control exists.
Options: (A) productise controls on MealPlanScreen's preferences row;
(B) declare them internal and retire the store plumbing (Campaign 4).
Recommended: B unless the founder wants the features - the assembler
behaviour is unchanged either way today. Release: not blocked.

**FR-3 — Progress-scan "hide exact numbers".** Current behaviour:
permanently ON for everyone (ED-protective default, no writer); a
pinned guard forbids the photos screen calling the setter while that
screen hard-codes hideExact={false} for its own grid. Options:
(A) declare fixed protective behaviour: delete the dead setter and the
inconsistency (Campaign 4), keep the corrected copy; (B) productise a
control in Settings > Privacy with ED-flag/calm gating (would need a
safety design pass). Recommended: A. Release: not blocked (the false
copy is already fixed).

**FR-4 — Rest-timer countdown beep with no mute** (from
CONTROL-GAPS-EVIDENCE.md). Current behaviour: beeps fire
unconditionally and deliberately bypass the iOS silent switch; the
neighbouring toggle explicitly disclaims them ("In-app cues are
unaffected"). Options: (A) add a "Rest countdown sound" switch beside
the sibling rest rows (recommended); (B) declare intentional. Release:
not blocked.

## Phase 11 ruling on finding 15 (the two permanent dismissals) — D94-2

**Both DOCUMENTED as intentional; no re-enable built.**
- Partner reconnect card: its one action (`onReconnect={openAckSheet}`,
  PartnerScreen.js:1098) opens the SAME acknowledgement sheet the
  always-visible per-pair cheer control opens (:1095, :876). Dismissing
  the card forever loses a shortcut, never the capability. "Never
  nagging" is the recorded design (:364-366).
- Photo prompt opt-out: "Don't ask again" permanently ends a
  body-image-adjacent NUDGE, not access - ProgressPhotosScreen remains
  fully reachable. Re-nagging a user who explicitly opted out of photo
  prompts would be anti-protective; permanence is correct here
  (suppression gates already never render it under calm/ED).

**FR-5 — Win-back and weekly-coach-ready pushes without unsubscribe
controls** (F13, DISCOVERABILITY-CLASSIFICATION.md). Current behaviour:
both categories send with no per-category toggle, against
NOTIFICATIONS_LOCKED.md's every-push-has-an-unsubscribe-path rule. The
win-back copy no longer sells Pro (fixed; it states the user's own
saved-data truth). Options: (A) add sibling-pattern toggles for both
categories (consistent with the partner-cheers fix); (B) rule the
win-back push outside the promise's scope and document. Recommended: A.
Release: not blocked.

**Campaign 4 recording (cardio remnant, boundary note):**
SettingsCoachingScreen carries a live "Cardio logging" toggle inside
the Pro block (predates this campaign). Untouched per the cardio
boundary; its fate belongs to the dead-code/coherence campaign with
the other D92-1 remnants.

## Review B rulings (D94-3)

Findings 1, 4-11 FIXED (see the remediation commit). Findings 2-3
RULED PRE-EXISTING ARCHITECTURE, documented not reverted: every
notification category row is a cloud-bound mirror (rows push/pull via
the registry sync table) while runtime sends read the device blob -
the campaign's writes match every sibling category and keep the cloud
rows fresh rather than frozen; the rows-to-blob propagation gap on a
second device predates this campaign and applies to all categories.
Recorded for Campaign 4 / a future sync decision, alongside FR-1..5.
