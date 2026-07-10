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

## D16 — Settings cluster + weigh-in rulings (founder, 2026-07-09, resume session)
- **CP-10 restart-free theming: BUILD.** Full architectural change so the
  theme becomes a live, reactive value across all screens. Proceeds via a
  plan-first investigation (blast radius, options, risk, staged rollout)
  before the build itself; the investigation is a step of the approved
  build, not a gate to re-ask.
- **CP-9 Help/FAQ: IN-APP FAQ SCREEN.** Native Settings sub-screen with
  curated FAQ content in the locked coaching voice, maintained in-repo,
  works offline. (Contact/email row not selected this round.)
- **L08-B3 post-cancel forward link: BUILD, TEST PLAN FIRST.** Written
  billing test plan per docs/rules/billing.md comes first and gets founder
  approval; then the calm forward link ships. Link and copy only — no
  purchase/restore/entitlement/cascade logic is touched.
- **NAV-2 weigh-in management: EDIT + DELETE + HISTORY.** Full management
  on Body Metrics: edit any entry, delete entries, visible history list.
  ED-safety intact: floors, calm mode and ED-flag suppression untouched;
  trend-based detection re-runs on the corrected series after any edit or
  delete.

## D17 — Rest-day/reminder, B41, AY-7, LT-3 (founder + delegated lead rulings, 2026-07-09, resume session)
- **Rest-day notification: HELD** (FQ-1 option 3) until the schedule gap is
  otherwise resolved. Recorded for when it unblocks: gated by ED-flag/calm
  suppression (FQ-2), copy Variant A plan-anchored (FQ-3). FQ-4/FQ-5
  DELEGATED to lead — ruling: folded into the existing Training reminders
  card sharing its enablement, default 09:00 local (distinct from the
  training reminder's 08:00).
- **Training-day reminder dead substrate: FOUNDER STEER** — "Rest days are
  not strictly adhered to, user trains on the days they want and have
  lives." Lead ruling under that steer: do NOT wire a rigid plan-day
  schedule writer. Rebuild the reminder's schedule on habit-derived
  weekdays from completed-workout history, and amend the
  NotificationSettingsScreen copy to describe it honestly. Quiet
  hours/push-budget gates unchanged. QUEUED as a build.
- **B41 check-in reminder drift: DELEGATED to lead** — ruling: amend
  Surface 6 of COACHING_VOICE_SYNTHESIS_LOCKED.md to the live string
  ("How has your week gone{, First}" / "A two-minute check-in is all it
  takes, and your coach tunes next week around it."), dated amendment; the
  live string already matches NOTIFICATIONS_LOCKED and D15 set the
  amend-to-live precedent. Payment-failure push VERIFIED NON-DRIFT (Apple
  handler says "the App Store", Play handler says "Google Play" — both
  match the locked platform bracket). CLOSED.
- **AY-7 ED lockout/cleared screen-reader announcement: APPROVED** —
  announce using the EXACT visible header text (ED_PATTERN_LOCKOUT_COPY /
  ED_PATTERN_CLEARED_COPY), mirroring PRCelebration's pattern. No new
  wording, no ED-safety logic change.
- **LT-3 light-theme elevation: IMPLEMENT THE POLICY** ("Do this", with
  lead judgement latitude): light-theme-only shadow token on the shared
  Card primitive; dark theme keeps the surface ladder untouched.

## D18 — Plan-F progress-photo corroboration (founder, 2026-07-09, resume session)
- **Founder ruling, verbatim intent: THERE IS NO STAGE 2. Everything that
  needs coding gets coded now. No putting things off.** The staged-rollout
  framing is dead: plan-F's ENTIRE coding surface builds now as one piece
  of work — receipt copy (old Stage 0), the persisted classification-
  history table + guard tests (old Stage 1), AND the bounded corroboration
  attachment (photo signal may move confidence.level by exactly one
  bounded step under the named rule in plan-F §4.4; the byte-identical
  engine guard narrows to a bounded-delta guard as part of this build).
- **Safety bounds are part of the build, not optional:** floors untouched,
  one bounded step maximum, suppressed under ED flag/calm mode,
  adherence-neutral framing, deterministic. Engine hunk gets hands-on
  Fable lead review (or hands-on build) at landing per the standing
  engine rule.
- **Non-coding validation items (founder-side, not code):** Tier 1
  volunteer study = leave as-is, revisit later. Tier 2 external programme
  = not at this time. Neither blocks the code above — that is the
  founder's explicit call.
- Stage 0 receipt wording: builder reads plan-E's open question 2 context;
  if a genuine wording fork remains, surface it, do not invent.

## D19 — RED-S wording, VC-1, plan-A band fork (founder, 2026-07-09, resume session)
- **RED-S / autoregulation footer tooltip: DRAFT FOR REVIEW.** Lead drafts
  the two ED-adjacent glossary entries hands-on against the locked voice
  doc; exact strings return to the founder for sign-off before the
  tooltip ships.
- **VC-1 light-theme brand palette: APPROVED AS CODED** (primary ink
  #8A5200, warning #6E6300 and the rest of the light ramp in theme.js).
  VC-1 CLOSED.
- **Plan-A band fork: AMEND THE RULE FOR THIS CASE.** Dated ruling: band
  exercises may enter a LOADED plan ONLY when the user's equipment
  context has no measurable vertical-pull alternative — the narrowest
  possible exception, test-pinned. The general "bands never reach a
  loaded plan" rule stands everywhere else. QUEUED as a build.

## D19 addendum (founder, 2026-07-09, resume session)
- **RED-S / autoregulation tooltip wording: APPROVED AS WRITTEN.** The two
  live coachGlossary strings (autoregulation + redS, surfaced as
  InfoTooltips on the CoachOutput credential footer) are founder-signed-off
  verbatim. The stale "needs founder wording" triage entry is CLOSED.
- **Standing order re-affirmed: agents stay at the LOWEST tier that gets
  the job done to standard, at all times, to preserve tokens.** Sonnet for
  builds, Haiku for mechanical work; Opus only where engine-grade
  judgement is unavoidable; Fable never dispatched.

## D20 — Ultimate-Audit items 11-16 GO (founder, 2026-07-10)
(Originally mis-numbered D16, colliding with the 2026-07-09 Settings-cluster
D16; renumbered. Code and tests citing "D16" dated 2026-07-10 — the
autonomy-hold flag in weeklyCoach.js and the d16Autonomy test files —
mean THIS ruling.)
Source rulings: docs/ux-world-class-audit-2026-07-09/ultimate-audit-11-16-reconciliation.md
(June register reconciliation). Founder: "Start all, in that order":
13 (mid-session swap clause) -> 12 (raw/cooked basis toggle) -> 11
(named autonomy modes; safety rule: never auto-apply during a hold) ->
15 (timeline food logging, large) -> 16 (micronutrients/NRV completion,
large, partially built). Two agents at a time; engine/safety-adjacent
pieces get hands-on lead review; 15 and 16 get a scoping read first.
Item 14 Core-Haptics: RESEARCH approved (package name, purpose, licence,
maintenance health; managed-Expo-compatible) - returns for the founder's
final yes/no BEFORE any install (never-add-deps-without-asking rule).

## D21 — Core-Haptics adoption (founder, 2026-07-10)
(Originally mis-numbered D17, colliding with the 2026-07-09 rest-day D17;
renumbered. The haptics commit message citing "D17" means THIS ruling.)
Item 14 final yes: ADOPT react-native-haptic-feedback v3 (MIT), restricted
to its triggerPattern() JS API (no .ahap, no manual Xcode edits). Scope:
richer iOS curves for rest-timer completion and PR celebration only;
Android keeps existing behaviour; expo-haptics remains for everything
else. Dependency added with package-lock.json regenerated in the same
commit (lockfile rule). Needs a fresh EAS build (founder-side).

## D22 — Items 15 and 16 rulings (founder-delegated to lead, 2026-07-10)
Founder: "You make these decisions." Lead rulings:
- **15a layout: CONTINUOUS LIST WITH QUIET DAY-PART LABELS.** One
  chronological scroll, soft Morning/Afternoon/Evening markers, meal
  names become small tags on entries. Truest to the June ruling
  ("timeline replaces rigid meal buckets") while staying scannable.
- **15b time truth: EDITABLE EATEN-TIME + UNTIMED BULK.** Entries gain
  an optional editable eaten-at time; bulk-confirmed entries carry no
  precise time and display grouped under their meal tag rather than a
  false timestamp. Resolves the honesty/ED flag properly; additive
  eaten_at column (local + cloud, founder-run) per the item-12 pattern.
- **16a path: DATA FIRST, THEN DISPLAY.** Feasibility spike parsing
  CoFID's vitamin/mineral sheets into the bundled snapshot + re-issue
  the food_library_pull RPC for the 27 columns. Shipping a display on
  0% coverage would repeat the exact dead-space failure D12 killed;
  parking would defer codeable work. Display ships only once measured
  coverage is real.
- **16b home: PER-FOOD DETAIL SHEET primary + FOOD INSIGHTS weekly
  average secondary, CONTINGENT on the spike proving truthful coverage.**
  Never a daily-policing surface; the diary placement stays dead (D12).
  Visual register: quiet, non-quantified-first, consistent with
  femaleNutritionAwareness precedent; exact presentation returns for
  founder eyes with the spike's coverage numbers.

## D23 — Design/UX leveling mandate + dependency standing approval (founder, 2026-07-10)
- Founder (verbatim intent): "Is there anything we can do to level up the
  design and UX even further? Extra dependencies and things are allowed
  if they genuinely enhance our product. Mark this as approved too going
  forward."
- STANDING APPROVAL: new dependencies no longer need a per-dependency
  founder round WHEN they genuinely enhance the product. Discipline that
  remains mandatory for every adoption: permissive licence verified,
  maintenance health verified, lockfile regenerated in the same commit,
  recorded in this register with name/purpose/licence, native deps
  flagged for an EAS build. The never-re-propose register still stands
  (media, plate calculator, social proof, RPE/RIR).
- Design/UX leveling work is authorised as a fresh order in this run.

## D24 — Design/UX leveling slate approved (founder, 2026-07-10)
Founder: "OK approved all those." The five leveling items are GO:
1. RESTART-FREE THEMING — reinstated (the 2026-07-10 suspension is
   lifted for this item); build proceeds from the plan doc
   CP-10-restart-free-theming-plan.md, primitives-first staged rollout,
   flagship design project.
2. @gorhom/bottom-sheet adoption (MIT) — gesture-native snap-point
   sheets, migrating the app's custom sheets; D23 dependency discipline
   applies (licence/health verified, lockfile same commit, register
   entry, EAS build flag).
3. Image polish — blurhash/thumbhash placeholders via the installed
   expo-image on progress photos and remote imagery.
4. Shared-element transitions (Reanimated 4, already installed) —
   exercise card->detail, photo grid->viewer.
5. Dynamic-type completion pass — every screen resilient at the largest
   font sizes (extends the approved ability/ease emphasis).
Sequencing (two agents max, product-first): theming stages + bottom-sheet
first (bottom-sheet waits for the NRV agent to release the food sheet
surfaces), then transitions + blurhash, then the dynamic-type pass.

## D25 — Best-in-class dependency slate approved (founder, 2026-07-10)
Founder: "I approve all those too." Approved in full:
- react-native-keyboard-controller (keyboard feel, every input moment)
- zeego (native long-press context menus)
- react-native-awesome-gallery or Reanimated hand-roll (lead decides at
  build by product quality) for progress-photo viewing/compare
- Rive for onboarding/empty-state motion — NOTE: needs designed
  animation assets; adoption lands when assets exist (founder-side or
  commissioned), library work may precede content
- Brand variable font via expo-font — founder taste retained on the
  final typeface choice; lead brings a shortlist
- No-dep enhancements: SQLite FTS5 instant search (foods/exercises/
  history), chart scrub haptics (new pattern API), Android themed icon /
  edge-to-edge / splash polish
D23 discipline on every adoption (licence, health, lockfile same commit,
register entry, EAS flag for native deps). Sequencing after the D24
five, two agents at a time: keyboard-controller + FTS5; zeego + gallery;
scrub haptics + Android polish; Rive/font as assets and shortlist land.

## D26 — Competitor-separation picks approved (founder, 2026-07-10)
Founder: "Approve your suggestions." Approved: (1) OFF micronutrient
parsing into the bundled snapshot (branded/retail foods gain verified-
style micro depth; same honest Tr/N-null pattern as the CoFID landing);
(2) MLKit code-scanner frame processor on vision-camera (faster,
low-light-tolerant barcode scanning; D23 dependency discipline).
NOT covered by this approval: the AI-assisted food input fork (photo
meal-scan / voice) - explicitly left with the founder, still OPEN,
neither approved nor on the never-re-propose register.

## D27 — Workout-logger separators approved (founder, 2026-07-10)
Founder approved the FOUR logger items (corrected count; the AI food
input fork remains OPEN, neither approved nor rejected):
1. iOS Live Activity rest timer: HOLD LIFTED — wire the already-built
   modules/rest-timer-live module. Founder-side prerequisites stand:
   App Groups provisioning + fresh EAS build.
2. Android rest-timer notification actions (skip / +15s from the
   notification): verify what exists, build the gap.
3. Context menus on logged sets: emphasis within the already-approved
   zeego adoption (D25) — the logger is its first surface.
4. Watch app: SCOPING programme approved (memo -> founder round before
   any build; builds on the existing P12 watchOS memo; must respect the
   removed-HealthKit state).

## D27 addendum — AI food input: HELD (founder, 2026-07-10)
Founder: "Hold the AI I'm not sure it's good enough or accurate enough
for use." The AI-assisted food input fork (photo meal-scan / voice
logging) is HELD by founder order - not rejected, not approved; do not
build and do not re-propose unprompted. The coaching engine's no-AI
rule was never in question and stands absolutely.

## D28 — Adversarial review goes external; R1 pulled into the queue (founder, 2026-07-10)
Founder: "let's get these all done and I'll ask codex to do a full
adversarial." Rulings recorded:
- The HELD adversarial whole-diff review transfers to the FOUNDER,
  executed externally (Codex). The internal held task closes as
  superseded; findings from the external review return here as work.
- R1 (curated-meal additions carry no FSA allergen tags/filtering; soya
  and mustard reachable by allergic users on filtered meals) was held
  ONLY because it belonged to that review - with the review external,
  the FIX joins the internal build queue NOW at high priority: tag
  allergen-bearing additions in the curated data + filter by the
  profile's allergen excludes wherever additions render (CuratedMealSheet
  + the diary season-to-taste row + MealPlan additions lists).
- The remaining runway (in-chat list, recorded in the handover) is
  confirmed GO in full.
