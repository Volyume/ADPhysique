# Founder decision register (2026-07-09)

Rulings given by the founder in session, against `ASSESSMENT.md` section 5
and `SCOPING-DIETARY-PREFERENCES.md` section 7. These are settled. Do NOT
re-surface any REJECTED or HELD item as a suggestion in future sessions;
the founder's direction is to strengthen what exists until it ties together
as world class, not to propose additions that were ruled out.

## Assessment items

| Item | Ruling |
|---|---|
| Exercise media programme | **HOLD.** Founder is not putting money towards it now. Do not re-propose. |
| iOS Live Activities wiring | **HOLD.** |
| Plate calculator surfacing | **REJECTED.** Moot for UK-based users; absolutely not needed. Do not re-propose. |
| Haptic vocabulary rollout | **APPROVED.** Extend the existing expo-haptics vocabulary (`src/lib/haptics.js`) across builder/settings surfaces. No new dependency; the gated Core-Haptics question stays gated. |
| Paywall social proof (review excerpts) | **NO.** Stays dark. Do not re-propose. |
| Accessibility / dynamic type / ease-of-use pass | **APPROVED**, with added founder emphasis (verbatim): "I want more attention to user ability and ease of use and design as well. Strengthen that and any other areas instead of suggestions of additions that are already ruled out." |
| RPE/RIR reinstatement | **Treat as settled-removed.** The founder flagged the audit for re-surfacing already-decided removals; the effort picker stays out. |
| Billing default reconciliation, apply-all, giant sets | **Not ruled on.** Do not build; do not re-surface unprompted. |

## Dietary preferences and allergens (structured answers)

| Question | Founder answer |
|---|---|
| Scope | **Phase A + B.** Wire preferences into every suggestion surface, complete FSA vocabulary, first-class Dietary needs settings, plus ~25-40 new diet-tagged curated meals. Phase C (open-food allergen ingestion) not commissioned. |
| Allergy sync | **Sync diet + allergens** (additive `users_profile` columns, founder-applied migration). Taste-only food exclusions may stay local. |
| Diet axes | **Add pescatarian.** Halal/kosher deferred as a separate future decision. |
| Exclusion ceiling (ED-adjacent) | **Soft nudge past threshold** (~15 excluded foods): calm plain-voice line, no block, no shame, tier-blind. |

## Working direction (founder, verbatim)

"It's strengthening what we have so it's all world class and ties together
world class." / "Proceed with dietary."

## Active work queue (session order)

1. Dietary Phase A (engine wiring, settings surface, sync, nudge, tests)
2. Dietary Phase B (curated meal library expansion)
3. Haptics rollout across builder/settings
4. Ease-of-use, ability and design strengthening pass

## D8. Exercise engine + library rulings (founder, structured round, 2026-07-09)

| Question | Ruling |
|---|---|
| Set cap per exercise/session | **4 compound / 3 isolation** (split by the existing compound_isolation field). |
| Overflow past the cap | **Add a different-angle exercise** — weekly volume PRESERVED, spilled deterministically into a complementary-angle exercise (never trimmed). |
| Cap scope | **Auto-gen enforces; manual builder shows a calm nudge past the cap, never blocks.** Existing plans untouched (no migration prompt). |
| Library expansion | **~100 comprehensive** (plan-A Option B): all targeted fills incl. bands + wider depth + subregion-enforcement extension. |

Delegated engine-design details (recorded, not re-asked): max exercises per
session derived as ceil(sessionTarget/cap) bounded by existing session budget;
thin-equipment fallback = equipment-category diversity when no second angle
exists; biceps (and similar already-tagged muscles) join SUBREGION_REQUIREMENTS.
Build split: library agent owns seedExercises DATA + tags ONLY; engine agent
owns ALL planEngine.js changes; engine diff gets LEAD hands-on review before
push (deterministic, replay/invariant tests extended).

## D9. Unilateral logging rulings (founder, structured round, 2026-07-09)

| Question | Ruling |
|---|---|
| Design | **Two-phase per-side flow** (plan-C Option 2): Log set -> left effort, then right effort; ONE workout_sets row; lower side drives progression/PR maths; first-timer walkthrough modelled on the superset modal. No schema change. |
| Activation | **Suggest, user confirms**: metadata-flagged unilateral exercises get a one-time calm prompt ("Log this one side at a time?"); the choice sticks per exercise. |
| Between sides | **Mini timer**: a short configurable intra-set timer between left and right, full rest timer only after both sides. |

Delegated detail (recorded): legacy left/right_reps columns (mig 054) stay in
place untouched (additive schema, never removed); the orphaned unilateral.js
toggle is absorbed/replaced by this build; laterality metadata becomes the
suggestion trigger. BUILD QUEUED under the two-agent rule - fires when the
current four agents drain.

### D9 amendment (founder, 2026-07-09): between-sides rest = HALF the
exercise's normal rest time, applied to EVERY pause in per-side mode (between
sides and after the second side). Example given: 120s exercise -> arm 1, 60s,
arm 2, 60s, arm 1 (next set), 60s... Each arm therefore still receives ~its
full normal recovery (it rests while the other works). Derived automatically
from the exercise's existing rest setting (rounding: whole seconds, ceil);
no separate user setting to learn; the usual timer adjust controls still work
on the derived value.

### D9 amendment 2 (founder, 2026-07-09, supersedes amendment 1's uniform
rule): between-sides rest is set BY EXERCISE CLASS via the existing
compound_isolation field:
- COMPOUND unilateral (split squats, heavy rows): half the exercise's normal
  rest between sides AND after the second side (120s -> L, 60, R, 60, L...).
- ISOLATION unilateral (curls, raises, extensions): a "Switch sides" prompt
  (no forced timer, swap when ready), then the FULL normal rest after both
  sides.
Rationale (expert review vs real-world practice): resting limb recovers while
the other works; systemic fatigue only matters on compounds. One deterministic
rule, no user configuration, self-explanatory in the flow.

## D10. Bands-in-loaded-plans exception (founder, structured round, 2026-07-09)

The locked rule "bands never reach a loaded plan (measurable staples only)"
gains ONE NAMED EXCEPTION: Band Lat Pulldown and Band Assisted Pull-Up become
available in the Dumbbells Only / Barbell & Plates / Home Gym equipment
profiles as accessories, because those contexts otherwise have NO vertical
pull at all. The rule stands for every other band exercise and context. The
exception is documented in exerciseMetadata and pinned by updated tests
(citations D10) replacing the blanket never-rule assertions. QUEUED into pair
1's small-batch slot alongside the B-5 tail + approved-unbuilt items.

## D11. Progress-photos loop rulings (founder, structured round, 2026-07-09)

| Question | Ruling |
|---|---|
| Divergence handling | **Plan deeper corroboration** - commission a follow-up PLAN for photo-signal corroboration influencing coach recommendations. Constraints absolute: floors intact, ED-gated (calm/open-flag suppression), adherence-neutral, deterministic, no appearance-judgement language; the validation-data caveat from the existing blueprint must be addressed head-on in the plan (what data would validate the signal before it ever drives a recommendation). Plan only - no build without a further founder round. |
| Benefit line | **Yes** - one calm factual line on the photo prompt + photos empty state (e.g. "The scale can't tell muscle from water. Photos can."), ED-suppression untouched. |

## D12. Eat diary de-clutter (founder direct order, 2026-07-09)

1. REMOVE the vitamins & minerals display from the Eat diary screen - dead
   space in premium screen real estate. (Diary display only; per-food micro
   detail elsewhere is untouched unless it proves diary-only - agent reports.)
2. MOVE "mark all meals as eaten" to the BOTTOM of the page - individual
   per-meal marking is the preferred primary interaction; the bulk action is
   demoted, not removed.
3. GUIDANCE: when meals are built/planned, ensure there is a calm indicator
   explaining marking-as-eaten - meal by meal as you go, or all at once at
   the end of the day (the bulk control now at the bottom). If no such
   explainer exists, add one using the app's existing one-time first-use
   hint convention.
4. MEAL ADDITIONS FRAMING (founder): the additions list currently reads like
   you should add every item. Reframe as optional pick-any-for-flavour:
   heading/intro along the lines of "Optional extras. Add any you fancy for
   flavour. They will not change the meal's numbers." (exact copy set at
   build; calm, British, no em dash; the existing honesty footnote stays).
   Queued for the next free agent slot (Haiku-grade exact-copy job).

## D13. Small copy fixes register (founder direct orders, 2026-07-09)

1. Coach: "First check-in opens on <long date>" wraps to a second line.
   Shorten to "First check-in: DD/MM/YYYY" (UK short date, en-GB). Grep
   "check-in opens" to locate; keep any surrounding logic/gating untouched.
2. (With D12 item 4) additions-list reframe - both queued as ONE Haiku
   exact-copy agent for the next free slot.
3. Coach layout: the profile block has ended up mid-screen (bottom of "This
   Week") after the reorg. Founder likes the reorg overall but the PROFILE
   belongs at the TOP (it is the user's identity anchor) - move it to the
   top of the Coach screen, or if that genuinely collides with the existing
   hero, the most prominent sensible position (record the choice). The
   queued copy bundle upgrades to ONE SONNET agent covering D13 items 1-3.

## D14 — Scorecard targeting round (founder, 2026-07-09)
Source: docs/ux-world-class-audit-2026-07-09/SCORECARD.md (25 functions).
- **Group A (14 mechanical fixes): APPROVED in full.** Ship in agent waves,
  two at a time, lead-reviewed at each boundary. Items: AC-3 Home ink bug,
  AY-6 share-segment SR state, LT-6 gridlines, CP-5 PR markers, history
  text search + session/workout wording, L07-F6 fuzzy search + L07-F7
  recents row, L05-FS1 "Custom" tab relabel, CP-6 Settings Workout & units
  sub-page, FoodSearchScreen:896 old additions intro, Viking Press +
  Plate-Loaded Shoulder Press retag, CO-2 "see your updated plan" link,
  L05-MR1 recipe-row macros, L05-MM2 connection miscopy (3 screens).
- **Group B (CO-1 naming sweep): APPROVED.** Execute D4 register across all
  ~20 sites. The ED-safety line nutritionEngine.js:402 restored HANDS-ON by
  the lead to the exact pre-drift string ("Precision Coaching has held your
  calorie target.", verified byte-identical against pre-ae42b4d history).
- **Home banner cap: DELEGATED to the lead** ("You decide what will be
  best"). Lead ruling: ONE attention banner max above the Start-Workout
  hero, chosen by the existing full-stack ranking (BANNER_PRIORITY in
  HomeScreen.js; pickAttentionVariant only orders the attention card's own
  sub-variants); others wait their turn (strongest match to the one-hero
  Materials Policy). CORRECTED 2026-07-09 at build time.
- **Group C rounds selected (in order): notifications wording + rest-day
  (A2), Settings cluster (CP-10 restart-free theming, CP-9 Help/FAQ,
  L08-B3 post-cancel link), weigh-in edit/delete (NAV-2).** RPE/RIR
  revisit NOT selected this round (stays settled-removed).

## D15 — Retag gate + notifications + plan-G rulings (founder, 2026-07-09)
- **Division overlap gate RAISED 0.50 -> 0.60** ("Raise the gate"): accepts
  the 0.56 overlap caused by the approved v63 front-delt retag (Viking
  Press + Plate-Loaded Shoulder Press). planengineRebuildPhase2.test.js
  updated with a comment citing this ruling.
- **Notification drift: AMEND THE LOCKED DOC.** The current in-app
  weekly-coach-ready and cascade-gate strings become canonical; Surface 6
  in COACHING_VOICE_SYNTHESIS_LOCKED.md is updated to match them verbatim
  (documented as a founder amendment, not silent drift).
- **Rest-day notification: RE-SPECIFY.** Commission a short spec (copy,
  trigger, quiet hours, ED/calm rules) and bring back for approval before
  any build.
- **Plan-G over-performance: BOTH** - calm acknowledgement copy AND the
  bounded one-step escalation (consecutiveExceededWeeks pattern), still
  MRV-clamped, confirm-before-apply, floors/gates untouched.
- **Plan-G threshold N and adherence-why placement: DELEGATED to lead.**
  Lead rulings: N = 3 consecutive exceeded weeks (sustained pattern,
  responds within a mesocycle); adherence-why surfaces BOTH at Pro setup
  completion and once in the first weekly coach output (one calm line
  each, said once, never repeated).
