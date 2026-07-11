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

## D29 — World-class campaign slate approved (founder, 2026-07-10)
Founder reviewed the /10 scorecard (SCORECARD-2026-07-10.md) and confirmed
"all to be done other than exercise media, rest day notification." Full
approved slate documented in CAMPAIGN-2026-07-10-APPROVED-SLATE.md.
- APPROVED (build): every scorecard target item - Coach-half polish,
  finish restart-free theming (stages 4-5), dietary discoverability,
  haptics + dynamic-type completion passes, LiftProgress metric bug,
  history/cardio theming, raw/cooked chip, PR markers on LiftProgress,
  TierComparisonStrip on Subscription, Android rest-timer actions, photo
  gallery, keyboard-controller + zeego, shared-element transitions +
  Android polish, MLKit scanner, small tails. NEWLY UNHELD: iOS Live
  Activity wiring, drag reorder, giant sets (3+), Rive/brand-font
  (asset/taste-gated).
- STILL HELD (founder, do not build): #18 exercise media, #22 rest-day
  notification.
- Two agents at a time, lowest tier, leverage order per the campaign doc.
- Codex external audit CLOSED AUD-01..07 (6 fixes on main, AUD-06 refuted);
  our branch rebased onto that tip; combined tree green (657/8223).
- Chat cleared after this; a fresh Fable session resumes from the handover's
  FRESH SESSION START block.

## D30 — Dynamic-type global ceiling = codemod sweep (founder, 2026-07-10)
Context: campaign item 6. React 19's automatic JSX runtime silently drops
Text.defaultProps (empirically proven against this repo's babel pipeline
with a compiled-JSX probe), so the standard one-line app-wide
maxFontSizeMultiplier default cannot work under RN 0.81 + React 19. The
targeted 1.3 caps on dense fixed-size surfaces landed first (0c85864).
Options put to founder: (1) scripted codemod adding an explicit cap to
every raw Text/TextInput across ~85 screens; (2) boot-time wrap of RN's
Text/TextInput exports (works, but undocumented and upgrade-fragile);
(3) per-component caps only; (4) new shared AppText primitive + rolling
migration.
- FOUNDER RULING: **Option 1 — codemod sweep, full build.** Every cap
  explicit, standard and grep-able; no unusual techniques. Queued for the
  next free agent slot after Pair 4 (photo gallery + keyboard/zeego).
- House cap value stays 1.3 (the existing precedent); RestTimer's 1.15
  outlier and RollingNumber's uncapped default are untouched by the sweep.

## D31 — Item 15 transitions technique (founder-delegated, lead-ruled 2026-07-10)
Context: recon proved Reanimated sharedTransitionTag is absent from the
installed 4.1.7 (grep-verified), so the campaign's named technique cannot
be used; the transition is hand-built either way. Three options were put
to the founder (true cloned-card morph / origin-aware zoom / both split
by content); the founder delegated: "You choose the best for our package
and for end users. That's the priority ahead of the work it will take to
get there."
- LEAD RULING: **Both, split by content.** Origin-aware zoom becomes the
  app-wide standard for card->screen pushes (heroZoomTransition extended
  to grow the incoming screen from the tapped card's measured rect, with
  graceful centre-zoom fallback when no origin is supplied); the true
  measure+clone hero morph is reserved for imagery — photo grid ->
  viewer now, any future image surface later.
- Rationale (product, not effort): a cloned morph on text/chrome cards
  cannot return cleanly on the JS stack — morph-on-push with a standard
  back transition is asymmetric and breaks the illusion it just created,
  reading worse than a consistent symmetric origin zoom. On imagery the
  morph is where perceived quality is dramatic, and the photo viewer is
  same-tree (no navigation coupling), so it takes the full treatment.
- Bounds: photo-viewer suppression behaviour (calm/ED) stays pinned;
  Reduce Motion flattens both treatments; no new dependency.

## D32 — Drag reorder scope + session surface (founder-delegated, lead-ruled 2026-07-10)
Context: campaign item 20. The founder's 2026-07-10 GO ("replace
chevron-only reorder with true drag", newly-unheld list, D29)
supersedes D5/D6's 2026-07-09 chevron-only constraint; the two reorder
guard tests update to the new decision (dated comments), KEEPING the
no-new-dependency and no-library pins and dropping only the
runOnJS/PanResponder-era bans that encoded the old ruling. Verification
found the active session has no draggable list (single-exercise view +
tap-to-jump strip), so "true drag in session" is a design fork; the
founder delegated it ("best for the user").
- LEAD RULING: true long-press drag ships on PlanDetail (days),
  ManualBuilder (superset/giant-set blocks move whole) and
  RoutineDetail (drag made block-aware there too, closing that
  surface's pre-existing block gap); the SESSION gets a purpose-built
  reorder sheet opened from the existing overflow — the whole workout
  as a draggable list in a sheet, workout view untouched. Rationale:
  the single-exercise view is a deliberate focus design; in-view drag
  mid-training is ergonomically risky, and a sheet gives real drag on
  a real list one-handed. Accessible chevron/sheet move paths remain
  everywhere (drag is additive).

## D33 — Standing delegation: product-fork decisions to the lead (founder, 2026-07-10)
Founder's words, given on the item-12 and item-20 rounds: "You make
these and all decisions like this. Make the decision based on the best
possible app and service for users not on the work that takes to get
there." Scope as understood: build/UX product trade-off forks of this
kind are LEAD-RULED on product-best-for-users criteria, recorded here
with rationale. This does NOT loosen the CLAUDE.md Section 2
inviolables — ED-safety, billing, tier gating, GDPR, schema rules, and
NEW DEPENDENCIES stay founder-gated, and anything safety-adjacent still
stops for the founder.

## D34 — Item 12: native Service→JS bridge (lead-ruled under D33, 2026-07-10)
The typical-rest (90s) Android notification is the native FGS
chronometer with zero action buttons; only >170s rests get the JS
sticky's five actions. Options were bridge / deep-link buttons /
shrink FGS window / status quo. RULING: build the native Service→JS
event bridge in modules/rest-timer-live so Skip/+15 on the chronometer
notification act SILENTLY (no app foregrounding), routed into the
existing handleRestTimerAction seam (stale-tap guard + clampRestDelta
floor stay). Rationale: it is the only option where the notification
users actually see gains working controls without sacrificing the
locked opensAppToForeground:false design or the E6A live-countdown/
survival benefit. Effort is explicitly not a criterion (D33).

## D35 — Item 20 follow-up: build drag edge auto-scroll (lead-ruled under D33, 2026-07-10)
DragReorderList shipped without parent-scroll auto-scroll at the drag
edge (disclosed limitation). RULING: build it — drag on a
longer-than-screen list must scroll when the finger nears the edge;
drop-and-redrag is not the complete experience. Constraints carried:
no new dependency, pure-arithmetic worklets, Reduce Motion respected,
chevron paths untouched.

## D36 — Item 17 scope rulings (lead-ruled under D33, 2026-07-10)
From the verify-first read: (a) ONE build slot migrates the four
modals item 17 names (HomeChangeWorkoutSheet, HomeBlockShapeSheet,
PlanLibrary quiz, RoutineDetail edit-exercise) to BottomSheet AND
fixes the two genuine bottom-inset gaps found in the same pattern
(ActiveWorkout supersetHeadsUp/unilateralSuggest shared styles,
ExerciseDetail goal modal). (b) FeedbackSheet + PeekMenu (the two
never-finished targets named in BottomSheet.js's own header) WILL be
migrated — real restructure (imperative singleton API), so it gets
its OWN later slot, not folded in silently. (c) TalkBack sheet
isolation (host screen importantForAccessibility while a sheet is
open) WILL be built as its own cross-cutting slot — genuine
accessibility gap that compounds with every migration. (d)
ProgressPhotosScreen's four content modals get a child-component read
pass before any ruling. AppAlert / InfoTooltip / EatenTimePicker /
centred dialogs stay raw Modals by design (correct semantics).

## D33 AMENDMENT (founder, 2026-07-10, later the same day — strengthened)
Founder's words, verbatim: "Regarding decisions when they come up. You
have permission to make them for me. Now make them based on the
absolute best possible solution for the app and end users never on the
work that it takes to get there. If it takes more work to get a
slightly better app, we do more work. Always."
Effect: the delegation is GENERAL and STANDING for decision forks as
they come up, and the criterion is absolute — even a SLIGHTLY better
outcome for users justifies MORE work, always. Effort is never a
tiebreaker. Scope note kept from D33 unless the founder explicitly
says otherwise: the CLAUDE.md Section 2 inviolables (ED-safety,
billing, tier gating, GDPR, schema rules, new dependencies) have their
own explicit founder gates and are not treated as loosened by this
delegation; everything else is lead-ruled on product-best and recorded
here with rationale.

## D33 SECOND AMENDMENT (founder, 2026-07-10 — gates delegated, one exception)
Founder's words, verbatim: "Delegate all those to you note too other
than billing price changes." Effect: the Section 2 gate items
previously carved out (ED-safety decisions, billing, new dependencies,
GDPR/consent, schema rules) are NOW ALSO delegated to the lead, ruled
on the same absolute product-best-for-users criterion — with ONE
exception: BILLING PRICE CHANGES stay founder-gated.
Lead's standing interpretation, recorded so no future session
over-reads this: delegation transfers DECISION authority, not the
underlying obligations. The ED-safety floors/gates, GDPR/Article 9
compliance, EU data residency, product IDs pro_monthly/pro_annual, and
the deterministic-engine rule remain binding constraints on any ruling
(weakening them would never be "best for end users"); billing changes
other than price still get a written test plan per docs/rules/
billing.md; new dependencies still get the D23 discipline (register
entry, licence check, pinning). Every ruling under this delegation is
recorded in this register with rationale.

## D33 REAFFIRMATION (founder, 2026-07-10, third statement)
Founder's words, verbatim: "Under the same basis, best solution always
wins. Never the cheaper option as far as work you do, if there's one
that brings a better app and service for users." No scope change from
the two amendments above; recorded because the founder has now stated
the principle three times in one day — it is the operating basis, not
a preference. When two candidate solutions differ in product quality
AT ALL, the better one is chosen regardless of how much more work it
costs the lead or agents.

## D36d RULING (lead-ruled under D33, 2026-07-10): fix the three photo-modal inset gaps
The read pass verified ProgressScanCompare / ProgressScanTrend /
ProgressPhotoCompare use SafeAreaView edges={['top']} only, so their
bottom-most interactive controls sit under the Android gesture-nav
strip on devices where the inset exceeds the static padding token.
ProgressScanMeaningMoment is already correct, as is the
ProgressPhotoViewer precedent (edges top+bottom, same family, same
day's commit). RULING: build the fix — add the 'bottom' edge on all
six SafeAreaView instances and make ProgressPhotoCompare's
scrollContent bottom padding inset-aware. DO-NOT-DISTURB contract:
usePhotoSuppression call sites, suppressed-branch JSX and placeholder
copy are pinned by tests and must not change.

## D37 — Ultimate-Audit items 11–16 CLOSED as superseded (staleness triage, 2026-07-10)
Founder flagged the risk of pulling month-old audit items over newer
work; a read-only triage verified all six against the tree and git
history. VERDICT: ALL SIX ALREADY BUILT during this campaign — none
may be re-dispatched from the old pass4 blueprints.
- (11) Named autonomy modes: BUILT `8aae4b7` (Coached/Collaborative/
  Manual, autoApplyHoldActive safety gate, scoffPositive added at lead
  review; D16/D20).
- (12) Raw/cooked: BUILT `86125c0`+`c1f0973` (weight_state basis
  stored, NO conversion factor — that ruling superseded the old
  blueprint's conversion design; migrate_114 applied).
- (13) Mid-session-swap wording: BUILT `21f3265` (volume-credit
  clause; mechanism verified already correct).
- (14) Core-Haptics: BUILT `edd84d9` (react-native-haptic-feedback v3
  MIT per D21; `4de5604` config-plugin drop was a CI build fix, not a
  revert).
- (15) Timeline food logging: BUILT `ae9c311` then REVERTED `363d2d7`
  the same day on the founder's device verdict — meal cards are
  canonical; NEVER RE-PROPOSE a flat diary. The durable parts
  (eaten_at schema migrate_115, quiet time display, editable
  eaten-at) shipped and survive the revert.
- (16) Micronutrients/NRV: BUILT IN FULL (schema v58/migrate_109,
  CoFID micros in the seed `a1c10a9`, migrate_116 RPC, per-food
  MicronutrientDetail + WeeklyMicronutrientsCard `203d6ce`; D22
  data-before-display honoured). Remainder is OPERATIONAL only: the
  founder runs refresh-off-snapshot.yml for OFF branded micros.
STANDING RULE (restated): nothing from a pre-campaign audit is built
from its old blueprint; triage against today's tree + this register
first; superseded items are closed here, not resurrected.

## D38 — Jobs must elevate the CURRENT app, never run off a list (founder, 2026-07-10)
Founder's words, verbatim: "Ok ensure all jobs actually enhance what we
have and are built by comparing what we have to the end solution and
that they elevate the app form its current state. Not just because
they're on a list at some stage."
Effect, standing: before ANY job is dispatched, the brief must state
(a) what the app does TODAY on that surface (verified against the
tree, not a doc), (b) the end solution, and (c) why the delta elevates
the app as it is now. A task being on a list, in an audit, or in an
old queue is NEVER sufficient reason to build it. If the delta cannot
be articulated or has been eroded by newer work, the item is closed or
sent back to triage, not built. TASKBOARD.md carries this per line:
every queued item states current state → end state → elevation
rationale, and items that cannot are parked in a needs-justification
section rather than queued.

## D39 — ScreenBoundary theming architecture (lead-ruled under D33, 2026-07-10)
The class error boundary cannot consume useTheme (hooks are
function-component only; error boundaries must be classes). RULING:
wrap it — a small functional component reads useTheme and passes the
resolved tokens to the class boundary as a prop; the class renders
from that prop with the current static tokens as fallback so a theme
failure can never break the error UI itself (the boundary must be the
most robust component in the tree). Fallback-path behaviour stays
byte-equivalent when no live theme is supplied. Stage-5 note: landing
the final 8 static components does NOT unlock the stage-5 restart-
prompt retirement — screens coverage still lags (the honesty gate
binds on a toggle's FULL dependency set); stage 5 stays gated on the
remaining screen batches.

## D40 — The campaign operating model is PERMANENT law (founder, 2026-07-11)
Founder asked (verbatim intent): the process — Fable coordinating,
agents doing the work, delegated decision authority ruled on criteria,
the handover + task board discipline — becomes permanent for all
sessions, not a campaign artefact. RULING RECORDED: a "SESSION
OPERATING MODEL (PERMANENT)" block now lives in CLAUDE.md Section 4,
codifying six standing rules: (1) session-start protocol (handover →
TASKBOARD.md → git status → recovery paths); (2) Fable coordinates /
agents work, main-loop reads only to judge; (3) agent discipline
(pairs, explicit tier, full briefs, no commit/push/stash/main);
(4) D33 delegation criteria with the inviolables and billing-price
gate intact; (5) landing discipline (lint+test, per-feature
attribution-free commits, handover + board updated, push); (6) founder
interface via structured multi-choice rounds. Scope note surfaced to
the founder honestly: CLAUDE.md binds THIS repo only — other apps each
need the same block in their own CLAUDE.md (per-repo is the reliable
path in cloud sessions; there is no cross-repo global file here). If
the handover location ever moves, CLAUDE.md's block is the single
place to repoint.

## D41 — Token hygiene measures, all four adopted (founder, 2026-07-11)
Founder asked for sensible token savings at zero cost to design or the
app; presented four docs/process-only measures; founder approved ALL
FOUR as standing practice: (1) the handover is SPLIT — the historical
campaign log lives in `_HANDOVER-ARCHIVE.md` (full history, never
deleted) and the live `_HANDOVER-AND-RESUME.md` stays under ~600 lines,
with stage-log entries older than the current resume point rolling to
the archive at every landing; (2) TASKBOARD.md holds only in-flight /
queued / held — landed-item detail rolls to the archive's TASKBOARD
HISTORY section at each landing; (3) CLAUDE.md's STATUS banner is
slimmed to pointers (live state lives in the docs it points at; the
D33 restatement dropped as redundant with the permanent D40 block);
(4) agent briefs cap final reports — structured, evidence-first, no
narrative padding — with detail-bearing audit evidence exempt. What was
explicitly NOT adopted: lowering agent tiers below capability, skipping
the fresh-eyes adversarial review, or shortening the hard-bounds
sections of briefs — that token cost is deliberate insurance.

## D42 — AppAlert gets the overflow contract (lead-ruled under D33, 2026-07-11)
Founder reported the unilateral one-side-at-a-time advice clipped at
the bottom on Android (possibly iOS too). Diagnosis: the first-timer
walkthrough modal was already fixed (D36a inset; the founder's
installed build predates it), but the RECURRING unilateral confirm
rides the shared AppAlert card, which has never had a height cap or
scroll — title + message + actions can exceed a short viewport with
the buttons unreachable, on both platforms. RULING: fix AppAlert
itself, not the unilateral call site — maxHeight cap with an inner
scroll region and the Math.max(token, insets.bottom + token) contract
the sup-modals are pinned to, so every alert in the app (delete,
unpair, cancel-subscription, the unilateral confirm) becomes
clip-proof. Best-product criterion: one shared fix over a
surface-local patch. Action chrome, a11y roles and copy unchanged.

## D43 — FOUNDER ORDER: complete world-class UX pass (founder, 2026-07-11)
Founder's words (device-walking build 2608): "The entire thing for the
workout looks absolutely terrible it needs a complete world class
level redesign... It's not just the workout the layout buttons
everything... A complete ux pass and fix needed." STANDING ORDER
recorded: a full visual/UX quality pass of the app, workout experience
first, judged at the world-class bar, with the founder's photos as
evidence. SEQUENCING (lead, under D33): (1) land the point fixes
already diagnosed (set rows b1403c9, AppAlert in flight, swapper
next); (2) systemic visual audit - zeego clobber footprint beyond set
rows, any other window-2608 break; verified hands-on that
resolveTheme(defaults) shares the frozen token tables, so live theming
at default prefs is not the cause, and the founder confirmed
all-default display settings; (3) fresh green build named for the
founder's re-walk; (4) the redesign pass proper - lead-driven design
judgement, Opus agents for legwork, area by area against best-in-class
references. The pass is NOT conditional on the founder re-walk; it
starts once the point fixes land.

## D43 AMENDMENT (founder, 2026-07-11): logger verdict 3/10, target 10/10
Founder's words: "Let's not hide the entire workout logger is about a
3/10 now we need 10/10 we need a complete redesign in line with the
rest of the app." Standing scope for the D43 pass: the workout logger
gets a COMPLETE redesign to the 10/10 bar, cohesive with the rest of
the app (the ONE-amalgamated-application mandate), not a
polish-in-place. Process: point fixes land first (they stop the
bleeding on the current build); the lead then produces a full
redesign blueprint (hands-on design judgement, Opus agents for
research/reference legwork), presented to the founder for approval
BEFORE the build slots open. The blueprint covers: set entry, logged
sets, rest/timer surfaces, exercise navigation/swap, progression
cues, superset/giant-set presentation, and every button/control on
the logging path, judged against best-in-class references.

## D44 — Superset jumps get cues; round-return built (lead-ruled under D33, 2026-07-11)
Founder: "seems to swap exercise when there's still a set to do at
times without saying anything." Diagnosis: the superset/giant-set
forward jump (handleCompleteSet ~1614-1627) fires on any logged set of
an earlier group member - intended A1->B1 alternation, but with zero
cue (no distinct haptic, no announcement, no visible sign); AND no
mechanism returns focus to the group's first member for the next
round, despite the giant-set guard's own comment asserting it -
the user is silently stranded on the last member. RULING: (a) every
group-driven focus change gets the cue treatment the target-reached
advance already has - distinct haptic, announceForAccessibility, brief
visible banner naming the destination exercise, voice-locked copy;
(b) build the round-return: logging the last member's set moves focus
back to the group's first member with the same cue, completing
A1->B1->A2 as the tests claim. Alternation logic itself unchanged;
engine untouched; copy lead-reviewed at landing.

## D43 SECOND AMENDMENT (founder, 2026-07-11): full-app pristine pass, sequenced last
Founder's words: "a full UX pass should be added to the list and
polish every... absolutely every area to be looking pristine, every
area to be completely and utterly world class. And fitting in with
all the work we're doing now, so I guess we'll do the polish at the
end." STANDING ORDER: after the current defect fixes, the engine
verdict, and the D43 logger redesign, a FULL-APP polish pass runs as
the closing phase - every area brought to the pristine/world-class
bar, cohesive with the one-amalgamated-application mandate. Judged
area by area (the SCORECARD-2026-07-10 rubric is the baseline
instrument), lead-driven design judgement, founder holds taste vetoes.
Sequenced LAST by founder's own call so it polishes the finished
work, not surfaces that are still changing.

## D30 — Engine set-cap + ease-in: investigated, NO CHANGE (lead ruling, 2026-07-10)
Founder delegated two engine questions to the lead with "investigate the
science and bodybuilding then make the call, don't guess." Investigated
against the actual engine + settled hypertrophy science. Both question
premises were misreadings; the engine is already evidence-correct. NO
change to the deterministic engine (correct outcome, not neglect).

1. "Session stacks 21+ sets" is NOT junk volume. Junk volume is a
   PER-MUSCLE-per-session concept; the engine caps it at 8 sets/muscle
   (12 for a weak point) at planEngine.js:1372-1382, matching the ~6-8
   productive-sets-per-muscle-per-session evidence and the principle that
   extra weekly volume comes from FREQUENCY not one giant session. Total
   session size is governed by the user's time budget (trimToTimeBudget),
   not an arbitrary total-set ceiling. A 21-set session = ~3-4 muscles x
   ~6-7 sets within budget = a normal full-body/upper day. Correct as is.
2. "Ease-in week 1 multiplier 1.00 = no reduction" misreads the two
   layers. The block base is set to MEV (the minimum EFFECTIVE volume, the
   floor) at planEngine.js:2666; the mesocycle then ramps it week1=1.00x,
   wk2-4=1.10/1.20/1.25x, wk5/6=0.50x deload (mesocycle.js:17-30). Week 1
   at 1.00x IS the ease-in - it delivers MEV, the lightest working week -
   then progressively overloads. Reducing week 1 BELOW MEV would waste a
   productive week (below-MEV is deload territory, correctly placed at
   block end). Label "Introduction week. Settle into the movements" is
   honest. Correct as is.
Do NOT re-open either as a defect; if a future session believes there is
a junk-volume or ease-in problem, re-read this ruling first.

## D45 — Per-session hard caps: 8 exercises / 25 working sets (founder override of the D30-engine ruling, 2026-07-11)
The engine no-change ruling above (recorded out of sequence as a second
D30) held that "total session size is governed by the time budget, not
an arbitrary total-set ceiling." The founder overrode point 1 of that
ruling directly: "There has to be a maximum per session too, otherwise
you try and jam 9 exercises into one day and absolutely kill yourself.
No bodybuilder does that."

The founder was right and the prior ruling was wrong on this point. On
investigation the time budget did NOT actually bound a session: because
`trimToTimeBudget` protects a muscle's sole exercise in a session, a
low-frequency full-body day (2-3 days/week, every muscle every session)
could hold 9-10 single-exercise muscles that neither the per-muscle cap
(a per-muscle concept) nor the clock could shave - a probe found a real
config (intermediate, 2 days, mens_physique) generating a 9-exercise /
28-set session that also silently overran its own 45-minute clock. The
per-muscle cap and the time budget were both real, but NEITHER bounded
total session size, exactly the gap the founder named.

RULING (lead, executing the founder override): add two hard,
clock-independent per-session ceilings to the deterministic engine -
MAX_EXERCISES_PER_SESSION = 8 and MAX_WORKING_SETS_PER_SESSION = 25 -
enforced through the SAME lowest-priority-first trim as the time budget
(one `overBudget()` predicate now covers clock + exercise count + set
total), plus a final backstop that guarantees the caps are hard by
dropping the lowest-priority exercises (never the opener, never below 3,
non-required first) and shaving sets to the ceiling only when still over.
In the full-body case a dropped muscle is still trained on the split's
OTHER day, so its weekly presence is preserved while the marathon is
trimmed; every structural and weak-point floor is protected exactly as
before.

Numbers rationale (science, per the "don't guess" standing instruction):
real physique sessions run ~4-7 exercises / ~15-25 working sets total; 8
and 25 are ceilings no honest session should reach, past which the added
work is junk fatigue not more growth - the same stimulus-to-fatigue basis
as the per-muscle 8/12 cap, applied at the session level. 8 still allows
a legitimate full-body day its breadth.

Landed: da59274 (cap + behavioural invariant test
`planEngineSessionCap.test.js`). Determinism preserved; ED-safety surface
untouched (training volume only, no nutrition/calorie floors). The
ease-in point (point 2 of the D30-engine ruling) stands unchanged.
Do NOT re-open the session-cap question against the old D30-engine text -
this D45 supersedes its point 1.

## D46 — Full per-exercise secondary-muscle model (founder, 2026-07-11)
Founder, shown the leg-day over-stuffing diagnosis (a leg+abs day trying to
give every individual leg muscle its own dedicated exercise), correctly named
the cause: "maybe it's not counting secondary muscles or something." Verified
against code: the engine has NO working secondary-muscle model. Every POOL
exercise credits exactly one muscle; the `entry.secondary` field is read at
planEngine.js:2091 but NO POOL entry populates it, so indirect-volume
reporting is dead and, more importantly, a leg day double-counts — squats and
RDLs already hammer glutes/adductors, but the engine can't see that, so it
piles dedicated glute isolation (hip thrust + step-up) on top. The only
functioning synergist credit is two hardcoded weekly trims (biceps<-back 0.4,
triceps<-chest 0.5, planEngine.js:371-372); nothing on the lower body.

Offered four scoped options (surgical-now-then-full; full-only; surgical-only;
cap-is-enough), the founder ruled: **"Do it all fully, we do not put off
jobs."** RULING (D46): build the FULL per-exercise secondary-muscle model —
(A) populate `secondary` tags across POOL + poolGenerator (wires the dead
indirect-volume reporting), and (B) generalise the weekly synergist trim from
the two hardcoded pairs to the full biomechanically-real relationship set with
science-calibrated rates (glutes<-quads, glutes<-hamstrings, adductors<-quads,
plus upper-body completeness), so a muscle already fed heavily by compounds
gets appropriately less DIRECT volume and the leg day stops stacking redundant
isolation. All Section-2 inviolables bind: determinism, MEV floors held via
the existing MEV+2 trim buffer, structural muscles never zero, weak points
exempt, glute-priority divisions (bikini/wellness) exempt from the glute trim,
no new deps, engine stays pure/no-AI.

QUEUED for the next fresh Fable session (founder deferred the build under usage
pressure 2026-07-11). Full mapped-out build spec:
`docs/ux-world-class-audit-2026-07-09/SECONDARY-MUSCLE-MODEL-BUILD-SPEC.md`
(problem + reproduction + design halves A/B + phases 0-6 + invariants +
device checklist + code anchors). The acute symptom is already contained by
D45 (`da59274`, per-session hard caps), which is the safety net that lets D46
be built properly rather than rushed.

## D46 LANDED (lead, hands-on, 2026-07-11 — fresh session)
Built in full per the spec, commit `19907a2`. Implementation rulings made
under D33 during the build, each recorded in code comments:
1. **Seed is the single source of truth for secondary tags.** POOL's 65 new
   `secondary` arrays were mirrored programmatically from seedExercises.js
   (union seed primary, minus the POOL entry's own primary, for the three
   cross-primary names) so the two taxonomies cannot drift. Abductor Machine
   (not in seed, isolation) stays untagged.
2. **No rear-delt / traps / front-delt transfers.** Their landmark overrides
   already set MEV 0 BECAUSE they are indirect-fed by design (planEngine
   GENERATOR_LANDMARK_OVERRIDES); adding a transfer would double-count the
   discount. Quads/hamstrings are only ever drivers. Adductors are only
   programmed by glute-emphasised (exempt) divisions, so no adductor trim.
3. **De-emphasised structural floor = effective maintenance with one honest
   entry.** overlay < 1.0 structural muscles owe maint EFFECTIVELY
   (direct + indirect) and keep a minimum ONE 3-set direct entry — never a
   1-2 set sliver, never zero direct (delivery-estimate slack protection,
   and the structural "maintenance, not zero" promise kept in direct work).
4. **Glute-emphasis exemption is overlay semantics, not a goal list:**
   overlay.glutes >= 1.2 (Bikini 1.55, Wellness 1.60, Figure 1.25, Women's
   Physique 1.20) skips the glute trim entirely. Found via the
   coachDivisions stage-2b pin when the first goal-name version (bikini/
   wellness only) trimmed figure's judged glutes 10 -> 8; the overlay rule
   keeps every glute-signature division untouched at its ORIGINAL pin.
5. **T-C re-pin.** The structural-volume T-C test now asserts mens_physique
   glutes effective (direct+indirect) >= 6 with direct >= 3; quads keep the
   pure direct >= 6 pin (no indirect source exists for them).
Outcomes: mp 5-day leg day 8ex/24 -> 7ex/22 (stacked second glute exercise
gone); cp6/general/bikini workout outputs byte-identical; 1,080-config
sweep: effective-maintenance misses 126 (pre-existing) -> 0; the 8 remaining
findings are a pre-existing 2-3-day bodybuilding delivery compression,
byte-identical on the old engine (noted, NOT fixed — out of D46 scope).
Full suite 683 suites / 8,456 tests green, lint clean. New invariant suite
`planEngineSecondaryMuscle.test.js`. Adversarial review dispatched before
push per the operating model.

## D46 ADVERSARIAL REVIEW OUTCOME (2026-07-11)
Fresh-eyes hostile review (Opus, against the build spec) of `19907a2`:
all 20 spot-checked secondary tags seed-faithful; biceps/triceps trims
byte-identical across a 240-config sweep; overlay exemption gate correct
for every division; weak-point skip verified; blast radius clean (no
other consumer of pool entries reads `secondary`; built exercise objects
never carry it); indirect reporting hand-count matched exactly.
ONE MAJOR defect found and FIXED (`209c5e1`): the glute credit was
estimated from weekly TARGETS, but a thin equipment pool (bodyweight
quads = sissy squats; machine-only hamstrings = leg curls) delivers none
of the promised indirect work, so a bodyweight/machine-only Men's
Physique athlete's effective glutes dropped below the structural
maintenance floor (bodyweight 5-day: 3 delivered vs 6 pre-D46). Fix: the
trim now requires BOTH driver pools, filtered to the user's equipment,
to offer at least one glutes-tagged compound (derived from the same pool
data as the credit, so the gate cannot drift); otherwise the trim skips
and the full direct floor stands. The review also exposed that every
probe and test ran full_gym only — the invariant suite now sweeps all
six equipment settings and pins the exact reproduction. Full suite after
fix: 683 suites / 8,457 tests green, lint clean.

## D47 — The queue is not curated: everything gets done, in order (founder, 2026-07-11)
Founder correction, verbatim intent: "No — you don't rule on what to do
and not to do. It all gets done in order." Standing law, permanent:
D33 delegation covers PRODUCT-FORK decisions (which design/approach best
serves users on a job already being done). It does NOT extend to scope
selection. The lead never decides WHETHER a board item gets done, never
re-prioritises it away, never parks it as "later" by preference - the
board is worked TOP TO BOTTOM, every item, in the order it carries
(founder-set sequencing like "pristine pass LAST" is part of that
order). Items advance the moment a slot or the lead's own hands are
free; blocked items (founder-gated inputs) are surfaced and the NEXT
item in order starts immediately - blocking never reorders anything
else. This extends the no-parking rule (Section 4 absolute) from build
scope to queue discipline.

## D48 — Gates are RULED, not waited on (founder correction, 2026-07-11)
Founder, after the lead paused work "awaiting founder approval" on the
D43 blueprint and the font pick: "You make the decisions!! Based on what
brings the best app. You do not park things!!" This restates what the
D33 SECOND AMENDMENT already delegated ("Delegate all those to you...
other than billing price changes") and the lead failed to apply.
STANDING LAW: pre-approval pauses ARE parking. Every decision gate except
BILLING PRICE CHANGES is ruled by the lead on the product-best criterion
and the work PROCEEDS immediately; the founder holds retrospective taste
vetoes (device walks, on-sight reversals), never blocking pre-approvals.
Rulings recorded here as always.

## D49 — D43 blueprint RULED APPROVED; build begins (lead-ruled under D33/D48, 2026-07-11)
The blueprint (D43-LOGGER-REDESIGN-BLUEPRINT.md) is ruled approved as
authored: strong core preserved, new shell per its Section 3, five slots
S1-S5 worked in order starting immediately with S1 (decomposition, zero
visual change). Founder taste veto applies at the device walk.

## D50 — Brand typeface RULED: Manrope (lead-ruled under D25/D33/D48, 2026-07-11)
From the delivered shortlist: Manrope. Rationale: verified tabular
figures (the type.num() numerals system is a hard requirement), full
200-800 variable weight axis in one file, SIL OFL, and the best
calm-but-ownable fit for the locked coaching voice - distinct from
system fonts without reading techy or soft. Inter was the zero-risk
baseline but is ubiquitous (weak brand distinction) - product-best wins
over safest. Adoption slot per the shortlist's plan, in queue order;
founder may veto on sight at the device walk.

## D51 — Token economy: lowest-tier agents, lead coordinates only (founder, 2026-07-11)
Founder order during the session ("Use the lowest level agents you can
as well to preserve usage... Do not read and writes from you"): the
premium main loop dispatches, judges diffs via targeted spot-checks and
rules - it does NOT do its own bulk reads, writes, probes or doc
upkeep. All mechanical work (docs recording, recon, conversions, test
writing) goes to the LOWEST capable tier (haiku for mechanical, sonnet
for risk-bounded builds). Standing law alongside D40/D47/D48.

## D50 LANDED + CP-10 COMPLETE (2026-07-11)
Manrope adopted at `9148a6f` per the D50 ruling: five static weight
instances generated from the verified official variable font (tnum,
axis range and OFL all checked in-file with fontTools before wiring),
swapped through the single fontFamily token file on the codebase's
established static-cuts pattern; full suite green; dead Inter files
removed in the follow-up commit. Founder device walk: cold launch (no
font flash), numeral column alignment in the logger and diary, a11y
toggles, ED surfaces layout-stable.
CP-10 is COMPLETE: batch G closed the last static screens (3adf551,
4947509) and stage 5 retired the restart prompt (`3d3eae8`) - 83/83
screens live-themed, settings apply straight away.

## D52 — Kala namak tip KEPT with a sourcing note (lead-ruled under D33/D48, 2026-07-11)
The open micro-call on the vegan tofu scramble's kala namak addition
(real vegan bodybuilding practice, but not mainstream-UK-stocked) is
ruled KEEP: the app's coaching credibility rests on teaching authentic
technique, the tip is one optional free addition among four (the other
three are mainstream), the sulphite allergen tagging already protects
sensitive users, and it is next-day-deliverable online in the UK. The
copy gains a sourcing note ("Find it in Asian grocers or online") so
the tip never frustrates. This closes the last NEEDS JUSTIFICATION
board item.

## D53 — Manrope VETOED on sight; Inter restored; visual-change gate (founder, 2026-07-11)
Founder device verdict on the D50 typeface: "horrendous... makes the app
look childish... revert." Executed: `9148a6f` and `982f0d2` reverted
(`52e65dd`, `a6083f7`), Inter restored byte-identical, guard re-pinned by
the revert, full suite 8,485 green. D50 is REVERSED - do not re-propose
Manrope or any typeface change unprompted. STANDING LAW (founder): no
major visual or interaction change ships unilaterally again - material
design changes are clearly identified and justified to the founder
BEFORE they land, even under D48 (D48 still covers non-visual gates).
The dead slice-2 agent's WIP snapshot was reverted unreviewed
(`b2be386`); S1 slice 2 restarts clean when the logger queue resumes.

## D54 — Unilateral logging redesigned: one set, same reps both sides (founder D9 reversal, lead-ruled ED review, 2026-07-11)
Founder device verdict: the D9 two-phase per-side flow asked for reps
INDEPENDENTLY on each side and stored the lower - ED-adverse, normalises
imbalance. REVERSED. A unilateral exercise now prescribes ONE reps value
for both sides; logging guides side one -> rest-class transition (D9
amendment 2 rest unchanged) -> side two -> one recorded set with the
single prescribed reps. Guided sheet moved onto the shared
WorkoutBottomSheet idiom. No per-side rep field remains. Old rows still
render their L/R breakdown read-only (formatPerSide in LoggedSetRow);
engine, database and migration 054 untouched. Lead ED-safety review
confirmed the divergent ask is gone and the record path writes one
value. Landed `f94d156`, unilateral guard rewritten to the new contract
23/23, full suite green. Terminology: this is the sequential/unilateral
case (all reps one side then the other), not alternating.

## D55 — Pause for founder review before the big backlog (founder, 2026-07-11)
Founder instruction: once the current device-testing wave fixes (the 12
hands-on items) are all landed, PAUSE the queue. Do NOT auto-proceed into
the remaining board backlog (D43 logger S2-S5, the pristine pass, growth,
etc.). Instead bring the founder a reviewed remaining-task list: for each
item, what it brings to the app, whether it is genuinely necessary, and
how much it improves the user experience - so the founder steers what is
built next. This is a scoped exception to D47 (work top to bottom): the
device-wave is worked to completion in order, THEN a review gate before
anything below it. Standing until the founder resumes the queue.

## D56 — Never park, never pick-and-choose; complete the job or surface the problem (founder, 2026-07-11, EMPHATIC)
Founder, verbatim: "You do not, EVER, park things silently and pick or
choose. We complete the job. If there's a problem with it, or it'll make
the app worse. Bring it up." This is the no-parking rule (Section 4)
stated at maximum force after repeated lead violations this session
(parked Pre/Post meals phase 2 as a "reduced version", deferred the
routine-heading fix to "need a screenshot", handed the founder a made-up
review instead of completing the assigned list). STANDING LAW, absolute:
1. Every assigned job is completed IN FULL. No silent parking, no quiet
   reduced/simpler/"phase 1 only" version, no lead choosing which parts
   to do.
2. The ONLY exception is a genuine problem: if a job cannot be completed,
   or completing it would make the app worse, the lead STOPS and BRINGS
   IT UP to the founder as a surfaced question - never a silent decision,
   never a park.
3. "Investigated and found already correct / no code defect" is a
   COMPLETE outcome only when reported plainly with evidence AND its
   verification path (e.g. confirms on a fresh build); it is not a way to
   close a job the founder still sees broken.
4. The founder's must-fix / assigned lists go on TASKBOARD.md and are
   worked to completion before the lead reports back or moves to backlog.
Supersedes any lighter reading of D33/D48 delegation: delegation is about
HOW to build the best solution, never a licence to not build an assigned
job.

## D57 — Logger redesign GO (cohesion-first, min cost); pristine pass HELD; plate calc DROPPED; token discipline (founder, 2026-07-11)

Founder rulings after the backlog review:
- Action 1 (D43 logger redesign S2-S5): GO. Goal restated: the logger
  must match the rest of the app COMPLETELY and hit world-class, since
  the rest of the app's design is already very good. Build at lowest
  sensible cost.
- Action 2 (D43 full-app pristine pass): HELD for now (rework risk vs
  the CP-10 / consistency / device-wave work already done).
- Plate calculator: ABSOLUTELY DROPPED, never revisit. So D43 S4 is
  in-place set editing ONLY, no plate readout. The blueprint's plate
  reference is struck.
- EAS build fix and Watch-app: PAUSED, revisit later (not cancelled
  work, just deferred by the founder).
- Migrations: founder will trigger (the "run against production" phrase)
  when ready; device-walk is the founder's after the logger lands.
- TOKEN DISCIPLINE (standing): the main loop (Fable) makes only the big
  difficult design decisions; everything else - reads, writes,
  verification - is delegated to the cheapest sensible agent. No big
  reads or writes by the main loop. Be careful about tokens in all ways.

## D58 — Logger S2 landed; beat line KEPT as a compact row (not dissolved into input placeholders) — lead design ruling (2026-07-11)

D43 S2 (Now card + status strip) is built and landed. The two shell
changes the blueprint §3.3/§3.4 called for are done: the ambiguous "N
notes" accordion is replaced by content-labelled chips (StatusStrip:
Deload, Superset, Coach note, Starter session, Target met — named, never
a count), and the Now card moves onto the house `Card` (radius lg/16,
spacing.lg padding) with Line 1 folding the old orientation + target rows
into one tappable line ("Set 2 of 3 - Working - 8-12 reps") and a
note-pencil corner affordance. Chrome above the inputs drops from up to
8 stacked lines to 2.

ONE blueprint mechanic is ruled DIFFERENTLY, on the merits (D33/D48
delegated design authority; surfaced here per D56, not parked). The
blueprint §3.4 Line 2 proposed the beat line "dissolve into the inputs"
as ghost placeholders inside the weight/reps fields. Ruling: KEEP the
beat line as the single compact tappable row it already is, directly
above the inputs. Rationale — the beat line carries strictly MORE than
two prefill numbers can: the directional beat-it cue (the ↑ glyph +
range, a genuine coaching signal), the "Recovery week" deload variant,
the "First time - Target X" variant, and an explicit labelled "Use"
affordance. Ghost placeholders in two numeric fields cannot hold the
glyph, the range, or the deload/first-time context, so dissolving the
line would either DROP coaching signal or push it straight back out as
chrome — a worse app, not a better one. The current row is already one
line, at input size, one-tap-to-apply — exactly the "one honest
mechanism for previous performance, tappable" that the blueprint's own
§2 principles demand. It also keeps the pinned, safety-adjacent
`SetEntry.js` input contract (keyboard-Done-logs, ghost-prefill colour,
tabular-nums, stepper) untouched. This is the better-for-users choice,
not the lighter one. Subject to the founder's device-walk taste veto at
S5 (blueprint §9): if the founder wants the line gone on sight, that
reopens it.

Verification: eslint clean; ActiveWorkoutScreen + SetEntry + LoggedSetRow
+ cp10Stage3WorkoutShells = 15 suites / 126 tests green; the two
source-guard suites re-pinned to the new structure (notesChip thumb
target → StatusStrip chip; "N notes" count wording → content labels +
absence-of-count; targetRow/targetText → orientationTarget fold) with
STRONGER assertions, no pin deleted.

## D59 — Logger S3 landed; guided warm-up ramp KEEPS its overflow row (not forced into the set-type picker) — lead ruling (2026-07-11)

D43 S3 built and landed. Stable CTA (§3.7): the bottom bar's filled "Log
set" primary is now permanent and rendered first; the advance action
("Next exercise" / "Finish workout") appears BESIDE it as an outline
secondary when the target is met, never swapping identity in the same
pixels. The redundant in-scroll "Log another set" button retires — one
tap on the ever-present primary past target both arms `extraSetArmed`
and logs (fewer taps, and "log stays a single stable tap" per the
blueprint §2). Overflow diet (§3.8): "Move exercise up/down" deleted
(the Reorder sheet is the single reorder path; dead
handleMoveExercise/canMoveUp/canMoveDown removed), the "Add/edit note"
row retired to the S2 card-corner pencil, and "Exercise info" relocated
onto a tap of the exercise title.

ONE relocation is ruled DIFFERENTLY on the merits (surfaced per D56, not
parked). §3.8 proposed folding "Warm-up sets" into "the set-type flow".
The agent correctly found the set-type picker only flips
`currentSet.setType` to 'warmup' — it cannot reproduce the guided ramp
(`showWarmupRamp`/`warmupRamp()`: a computed ladder of suggested warm-up
loads up to today's working weight, with the "Empty bar" tag). Ruling:
KEEP the guided warm-up ramp as its own overflow row. Folding it into the
picker would either DROP the computed ramp (a real capability loss) or
bloat a flat radio list with a calculator it isn't shaped for — a worse
app, not a better one. Warm-up as a plain SET TYPE is already reachable
from the picker (that half of §3.8 is honoured); the RAMP HELPER stays in
the overflow. The overflow lands at 7 rows (Swap, Add exercise, Reorder,
Log per side, Warm-up sets, Pair superset, Shorten session, Remove) down
from 11 — the substantial declutter the slot intended, minus a capability
drop the blueprint didn't intend. Subject to the founder's device-walk
taste veto at S5 (same standing as the D58 beat-line ruling).

Verification (lead-run on the settled tree, NOT the agent's self-report):
eslint clean; ActiveWorkoutScreen + SetEntry + LoggedSetRow +
cp10Stage3WorkoutShells = 15 suites / 124 tests green; full `src/screens`
= 132 suites / 1013 tests green. Three guard suites
(nextExerciseButton, reorder, usability) re-anchored to the new structure
with a "D43 S3" note, every invariant preserved, no pin deleted.

PROCESS NOTE (not a product decision): the first S3 agent violated its
brief by spawning a sub-agent, which then ran concurrently with a lead
relaunch on the SAME files — a collision. The on-disk tree resolved to
one clean winner (verified coherent: no duplicate style keys/testIDs,
comments consistent with code, all suites green), but ~420k agent tokens
were burned on duplicate work. Lesson: never relaunch a "no-op" agent
until confirming it left no live descendants; check the task tree first.

## D60 — Logger S5 cohesion pass: three design calls ruled (2026-07-11)

S5 (cohesion polish) found the logger surface already largely tokenised
(S1-S4 did the token work inline: no hard-coded colours, haptics already
on the shared vocabulary). Two pure token substitutions applied and
committed (`bf72c51`: inline-pill minHeight 44 -> workoutLoggerSize
token; orientationRow paddingVertical 2 -> spacing.xxs; byte-identical).
Three design-JUDGEMENT calls were correctly flagged, not guessed; ruled
here on the best-for-users criterion:

1. Logged-row corner radius (radius.xs=4) vs the house Card (radius.lg=16)
   -- KEEP DENSE. The "This workout" logged-set list is a data-dense
   session receipt (one row per set); the house idiom for dense lists is
   compact rows (Diary food entries are dense rows, not cards). The
   cohesion mandate targets the Now card (the hero), which S2 put on the
   house Card. Bumping every row to a 16px card would bloat the receipt
   and cut scannability -- worse for a log. The inline set editor stays
   tied to its row at the same radius. No change.
2. beatLineLabel line-height (hand-rolled 18 vs type.bodySm's 20) -- KEEP
   TIGHT. The beat line is a space-constrained anchor row directly above
   the inputs (D58); the 2px-tighter line-height is intentional density
   where vertical space is most precious. Not forcing the type role here
   is correct. No change. (The other one-off line-heights the agent noted
   -- swapItemReason, firstSetHintText -- are outside the logger hero
   surface and out of this slot's scope.)
3. type.num() on the logged-set data numerals (setNumText, loggedEst1RM)
   -- APPLY. The app-wide "numerals as hero" system puts type.num() +
   tabular-nums on every data number; a stacked column of logged sets
   (100 x 8, 102.5 x 8) genuinely reads better with aligned digits. This
   is the one genuine cohesion win, consistent with the house numerals
   system. Delegated as a small follow-up edit (re-anchor the
   cp10Stage3WorkoutShellsLiveTheme pin to the new invariant, same
   contract).

Calls 1 and 2 (like D58/D59) remain subject to the founder's S5
device-walk taste veto.
