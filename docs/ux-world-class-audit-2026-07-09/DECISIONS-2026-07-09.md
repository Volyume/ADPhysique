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

## D61 — Logger adversarial review triaged; L1 CTA-arming fixed (founder GO, 2026-07-11)

The mandated fresh-eyes Opus adversarial review of the full S1-S5 logger
arc returned NO blocker/high findings and cleared the arc as safe for the
device walk. It confirmed the S4 edit path reuses the same PR/celebration/
ED-suppression store action (no bypass), every re-pinned guard locks the
same invariant (not a weaker one), and no Section 2 inviolable was
touched. Four minor findings, all triaged:
- L2 (stale "PR not re-run on edit" comment) and N1 (all logged rows
  re-render per keystroke while editing) - FIXED (`49d56db`): comment
  corrected to reflect the L07-F2 re-eval that IS present; the live
  editValue/saving props now flow only to the row being edited so the
  memo shields the rest. Also re-anchored the screen-mount U-A-1 mounted
  test the slot's scoped runs had missed (full suite caught it).
- M1 (inline set editor keyboard occlusion on small Android) - added to
  the founder device-walk checklist as an explicit verify item; the
  editor is now inline in the screen ScrollView (Android adjustResize),
  which is likely better than the old modal, but only a device confirms.
- L1 (an invalid/aborted "Log set" tap past target flipped extraSetArmed
  before the set logged, hiding the advance CTA until the next successful
  log) - founder chose FIX NOW. Fixed by moving the arm OUT of
  handleCompleteSetPress (the tap) and INTO handleCompleteSet's success
  path: a working set logged with the target already met arms
  extraSetArmed only after the set is actually created. Placed after the
  superset forward-jump early-return (a jump changes currentExerciseIndex,
  which resets the flag anyway), so it arms only when we stay on the
  exercise - exactly when the advance CTA shows. Invalid entry (returns at
  validation) and errors (caught) never reach the arm. Guard re-anchored:
  nextExerciseButton.guard now pins that handleCompleteSetPress does NOT
  arm and handleCompleteSet's success path does. Full suite green.

## D63 — In-session PR celebration: full-screen takeover RETIRED, calm toast for all (R3 ruling, 2026-07-11)

The founder's device walk reported: finishing a set greys the screen, a
stunted animation appears and hangs until tapped. Hands-on trace of every
set-completion visual (PRCelebration full path, subdued toast, RestTimer
inline card, auto-advance inline row, the card-border log flash) found
exactly ONE element that greys the screen: PRCelebration's full-screen
overlay (0.85 backdrop + centre card + 40-particle confetti), which fires
on real PRs. Whatever animation glitch the founder's device hit, the
pattern itself violates the logger's first principle (never break the
loop) - no elite logger interrupts logging with a modal takeover.

RULING: the full-screen path is deleted. Every in-session celebration is
the calm top toast (gold icon for real records, primary for the honest
first lift; strong PR haptic ladder kept for real records; light tick for
calm/reduce-motion/first-lift), auto-dismissing at 2.2s, tap to dismiss
early, never obscuring the inputs. The BIG celebration (MilestoneBurst)
stays on the summary screen, untouched. ED-safety: celebrations were
already suppressed via subdued gating; making the subdued surface the
only surface is strictly stronger. The firstLift pin (never the PERSONAL
RECORD treatment) and the P9 TalkBack announcement pins pass unchanged.
Subject to the founder's device-walk taste veto like all R-campaign
rulings.

## D64 — R4 unilateral flow design (lead ruling, 2026-07-11)

Sources: plan-C-unilateral-logging.md (internal study; Option 2
recommended), COMPETITIVE-LOGGER-BAR.md (no competitor has solved
per-side logging; JEFIT forums show live user confusion), DEFECT-MAP.md
R4 (current build: 3 taps - Log set, "Side one done", "Side two done" -
plus touching buttons from a gap-less fragment), and the founder's words:
"two taps to just confirm one side... it needs to be easy to use and self
explanatory."

THE FLOW (2 taps total, no confirm bureaucracy):
1. User does side one, taps the permanent primary "Log set" (reps/weight
   in the inputs as normal). Side one is captured IMMEDIATELY - pressing
   Log set IS the confirmation.
2. The Now card flips to a compact side-two state ("Side 2 - same reps",
   reps prefilled, editable); a short between-sides rest runs inline
   (half the exercise's configured rest via the existing
   halfRestSeconds, floor 15s); the primary bar button relabels to
   "Log other side" - same button, same position (S3 stable-identity
   principle preserved).
3. User does side two, taps "Log other side". The pair commits as ONE
   workout_sets row: actual_reps = lower side (conservative, matches
   migration 054's own maths), breakdown in notes ("L 10 / R 9") - the
   exact D9/cluster storage shape already shipped; no schema change.

SELF-EXPLANATORY: a once-per-exercise first-timer walkthrough modal in
the exact shape of the existing superset heads-up (icon, numbered steps,
tip, "Got it" CTA) with an inline escape ("Log both sides together"
turns per-side off). AUTO-SUGGEST: the dead laterality field finally
gets read - obviously-unilateral exercises auto-enable per-side, and
because the walkthrough ALWAYS fires before the first per-side set, a
wrong regex guess is never silent; declining is one tap. Cancel path:
a small inline cancel in the side-two state discards the pending pair.

Invariants preserved: one logged set = one working set (engine/volume/PR
maths untouched); tier-blind; no new deps; existing crash-recovery draft
covers the mid-pair state. Subject to founder device-walk veto.

## D65 — R6: PressableCard collapsed to a single animated pressable (lead ruling, 2026-07-11)

Sources: founder photo (build 2608, dead band on the workout summary
footer beside Close), DEFECT-MAP.md R6, hands-on trace to the rendering
line.

ROOT CAUSE (whole class, not one screen): PressableCard rendered an
unstyled Pressable wrapping an inner Reanimated.View that carried the
caller's style. The parent lays out the OUTER element, so every
layout-in-parent style passed through Button/Card/Chip (flex: 1,
alignSelf, width) was silently discarded; in flex rows the button
shrink-wrapped to text width. Regressed 2026-07-09 (5d98870) when the
summary footer and the logger's bottom bar moved off raw
TouchableOpacity (which held flex: 1 directly) onto <Button> - the
founder's "it was better a month ago". Live victims traced: Workout
summary Close (dead bar band), ActiveWorkout Log set primary and the
Next exercise / Finish workout advance action (under-width split bar).

RULING: fix at the primitive, not per call site.
PressableCard is now ONE animated pressable
(Reanimated.createAnimatedComponent(Pressable)) carrying
[style, animatedStyle]. Declared layout styles take effect exactly as
written at every call site; press physics unchanged (same springs, same
scale/opacity interpolation, same reduce-motion flat behaviour); the
origin-aware measure API and its never-lose-a-tap fallback unchanged.
Side benefit: the press hit area now matches the visible bounds (the
old outer view could stretch wider than the visible button - an
invisible tap zone).

Re-anchored pins: button.stateMorph animated-ancestor count 1 -> 0
(intent unchanged: the morph adds no animated wrapper);
p9Talkback save-path count 3 -> 2 (the third CTA was retired by design
in D43 S3, window widened for the grown primary tag). New pin:
pressableCard.rowLayout.guard.test.js. Verified: full suite
691 suites / 8,529 tests green; absolute-position sweep found no
consumer relying on the old inert layer. Subject to founder device-walk
veto.

## D66 — R5: logger chrome and small-surface styling unified (lead ruling, 2026-07-11)

Sources: FOOD-DESIGN-STANDARD.md (the measuring stick), DEFECT-MAP.md R5
(header table + radius-cluster inventory), founder's words ("Finish
differs from X, counter different colour/style... different styles for
different things all over the shop").

RULINGS:
1. Header X matches ModalHeader's close exactly (size 24, textPrimary).
2. The elapsed timer is data, not decoration: textPrimary, same
   type.num('title') role. Header amber competed with the one filled
   Log set CTA.
3. Finish drops its bespoke chrome override; Button variant="secondary"
   size="sm" shows through (the override duplicated it at radius.sm).
4. ONE small-surface radius for the logger: radius.md (beatLineCue and
   RestTimer skip sm -> md; logged-set row + in-place editor xs -> md).
   Pills stay radius.full; cards radius.lg. This is the reconciliation
   rule for any future logger surface.
5. Raw type pairs onto house roles: beatLineLabel -> bodySm, RestTimer
   label -> overline. The 26px rest countdown stays a sanctioned hero
   numeral (existing eslint-disable).
6. Content edge: logger scroll paddingHorizontal md -> lg, aligning with
   header/exercise-nav/Food. The tighter vertical rhythm (sm gaps) is a
   deliberate density property of the working surface and STAYS.
Landed 75ad788; full suite green. Subject to founder device-walk veto.

## D67 — Clipped-drama copy ban made mechanical (founder order 2026-07-11)

Founder: "We need a search for clipped ai language... for example 'Yours
free, always' that's not british english and sounds daft, they dont own
it."

Swept and fixed (5 strings): WelcomeScreen "Yours free, always" ->
"What stays free"; WelcomeScreen trust chip "No ads, ever" -> "No ads"
(+ its a11y label); SettingsDataScreen "Your data is always yours." ->
deleted (the factual sentence stands alone); SubscriptionPolicyScreen
"...on Pro, forever." -> "...on Pro."; NotificationSettingsScreen
"No marketing, ever." -> "never marketing" (caught by the new lint, not
the manual grep - the guard already outperforms the sweep).

ENFORCEMENT: two new no-restricted-syntax selectors in eslint.config.js
(both rule blocks, since the HomeScreen-scoped block replaces rather
than merges) banning the ", always/ever/forever" tail at sentence or
string end in Literals and JSXText. Same escape hatch as the other
voice rules: scoped eslint-disable with a reason.

## D68 — R8: Coach page real merge (lead ruling, 2026-07-11)

Sources: DEFECT-MAP.md R8 (side-by-side duplication table), founder ("the
Coach page is now just cobbled together mess with duplication...
'Getting to know you' adds nothing and hogs space... asked for a real
MERGE"), hands-on read of YouScreen.js in full.

FINDINGS: (1) the status card was a third voice - its body pointed at
"the weekly check-in below" while the check-in NavRow directly beneath
carried the FULL specific readiness copy; (2) with a completed decision
the card said "Open it..." but was NOT tappable - the duplicate
"Coaching decision" NavRow did the opening one card down; (3) the free
tier showed a non-tappable pitch card PLUS a duplicate "Upgrade to Pro"
NavRow; (4) the feared readiness-logic drift is already impossible at
source: coachLedger.js imports MIN_WEIGH_INS / FIRST_CHECKIN_MIN_DAYS /
firstReviewUnlockDate from trialActivation.js ("so the ledger can never
disagree with the check-in gate") - the duplication was presentational.

RULINGS (one voice per fact, every surface tappable or gone):
1. Pro + completed decision: the status card IS the weekly update hero -
   tone primary, tappable, opens CoachOutput(weekStart), chevron. The
   "Coaching decision" NavRow disappears in this state (duplicate).
2. Pro, no completed decision: NO status card. "Getting to know you" is
   deleted; the check-in NavRow's pendingCoachCopy is the single status.
   The "Coaching decision" NavRow renders only as the archive path
   (!latestReview && hasCoachHistory, e.g. Monday's new output before
   this week's check-in) - history now loads for Pro too (limit 1).
3. Free: ONE tappable pitch card (opens ProUpgrade) replaces the card +
   "Upgrade to Pro" NavRow pair; only "Coaching history" remains below,
   and only when history exists.
Pins survive by design (label="Weekly check-in" / label="Coaching
decision" / buildPendingCoachCopy / statusCard-after-profileCard /
Coaching-decision-inside-This-week); the physiqueTile pin on the
removed Upgrade NavRow re-anchored to the card path. Full suite
691 suites / 8,530 tests green. Subject to founder device-walk veto.

## D69 — R9 colour grammar across the five areas (lead ruling, 2026-07-11)

Sources: R9 card audit (red/green class, ~7 sites), interaction audit
(VolumeSummaryStrip note), hands-on read of WeightTrendCard.js.

RULING: Food's adherence-neutral rule is absolute for food, calorie,
macro and weight-adherence surfaces. Training-MECHANICS caution signals
(muscle volume over MRV, insight severity, unresolved-exercise repair
state, high session difficulty) keep semantic warning/error colour as
one consistent status grammar: they are recovery/safety warnings about
training load, not judgements about the body, and stripping them would
lose safety-bearing information.

BOUNDARY CASE, reversed at lead verification: the audit provisionally
had WeightTrendCard's onTrack/watch dot going neutral. Hands-on reading
showed the dot is ALREADY governed by COMP-027 Class B (weight numeral
never state-coloured, dot caps at watch so no red exists, dot is
decorative with meaning carried by the insight sentence, and the
view-model strips dot/rate/maintenance under an open ED flag). A prior
safety-reviewed decision outranks cohesion styling; the dot stays.
This is the standing precedent: pre-campaign safety rulings get D37
triage, never cohesion bulldozing.

## D70 — R9 interaction/feedback cohesion rulings (lead, 2026-07-11)

Sources: R9 interaction audit (findings verified hands-on before each
build), FOOD-DESIGN-STANDARD.md sections 4-6.

RULINGS AND LANDINGS:
1. One sheet chrome: Home intent prompt (3f2de24) and PlansScreen
   folder prompt (80dbad5) off raw Modals onto shared BottomSheet;
   RoutineDetail's swap surface keeps its full-screen ranked-candidates
   Modal (deliberately richer than the plain picker; D25 exception
   class) but its bespoke header becomes the house ModalHeader.
2. Undo over confirm for reversible writes: RoutineDetail
   remove-exercise (full-field re-add on undo) and swap-exercise
   (inverse write on undo); PlansScreen archive-plan (unarchive on
   undo). Folder and template deletes KEEP their blocking confirms -
   neither has a restore path today, which is the doc's own exception;
   building restore machinery is a separate feature, not a cohesion
   fix. WorkoutHistory's workout delete keeps its confirm (genuinely
   irreversible, cloud-deleted).
3. One options idiom: WorkoutHistory's repeat menu moves from a native
   alert to PeekMenu, matching PlansScreen's identical moments.
4. Blocking informational alert -> calm info toast (Analytics locked
   Recaps tile).
5. BuildWorkout's hand-rolled picker STAYS: it is a rapid multi-add
   flow (stays open across adds); the shared ExercisePickerModal
   closes on every select, which would make building a session
   strictly worse. Not duplication - a different flow.
6. Sanctioned box classes app-wide: Card (radius.lg, surface,
   borderSubtle/border) and Banner (radius.md, tinted fill, accent
   border - Home's existing banner grammar). Wave B moves the misfiled
   card-class surfaces onto lg; banners stay md.
7. Haptics vocabulary joins every interactive tap on the five areas
   except the recorded ED diary-marking exception; NavRow gains it
   centrally.
8. DifferentialBadge excluded from every sweep (billing surface;
   C3 paywall audit owns it).

## D71 — C3 duplicate paywall: port then delete (lead ruling under D33, 2026-07-11)

Sources: C3 read-only audit (lead-verified),
docs/marketing-2026-07-11/C3-duplicate-paywall-decision-brief.md.
Founder reaffirmed D33 delegation mid-lane: decisions are the lead's,
ruled entirely on the best end result for users and the app.

RULING: Option B. PaywallScreen's two genuinely valuable capabilities
move to the live surface first — the Play-review social-proof excerpt
card (paywallExcerpts.js survives with its tests) and an inline
restore affordance (shared lib/payments/restore module, the ProGate
pattern) land on ProUpgradeScreen — then the orphaned PaywallScreen,
its ProfileStack registration and its orphan-only tests are deleted
and the stale cross-references cleaned. Rationale: the orphan is
unreachable (zero call sites), carries a superseded annual default
and pre-C1 "7 days" copy, and is pure future-drift risk; its social
proof and restore button are real user value the live screen lacks.
Docs-only cleanup (option D) would have been the lighter path; D33's
criterion is explicit that effort is never the tiebreak. An earlier
founder quick-pick of D is superseded by his explicit reaffirmation
that the lead rules on merits. Constraints: product IDs, restore.js,
playBilling.js, cascade.js untouched; a written test plan covers the
restore addition (docs/marketing-2026-07-11/); DifferentialBadge
behaviour untouched.

## D72 — C5 day-14 factual recap: enrich CascadeGate (lead ruling under D33, 2026-07-11)

Sources: C5 fact recon (lead-verified at the day-14 slot and day-3
precedent), docs/marketing-2026-07-11/C5-day14-recap-decision-memo.md.
Founder quick-picks aligned with the merits and are adopted as the
ruling.

RULING: surface = the CascadeGateScreen trial-end variant gains a
small factual block above the Stay-on-Pro/Drop-to-Free choice; facts =
training-mechanics only (workouts completed, sets, unique exercises,
personal bests) so the surface is flag-invariant and renders
identically for every user; floor = fewer than 3 completed workouts in
the trial window renders no block at all (never a thin recap). Window
is [proTrialEndsAt - 14d, proTrialEndsAt) via the existing
getRecapData; PBs via getWeeklyPRCount summed over the window's
Monday-local weeks (the app's one PB definition). No new events, no
notification, no server migration. ED guardrails hold by construction:
no outcome or body-change language anywhere in the copy, nothing
weight/food-adjacent on the surface, and the block is best-effort
(any load failure renders nothing).

## D73 — Sign-out wipe escape: bounded retry + verified-clean gate (lead ruling under D33, 2026-07-11)

Sources: R2-12 investigation (session log, build-2692 walk), the founder's
own trapped device (wipe_failed forced a full storage clear to escape),
useAppStore.clearAuthStateForSignOut, database.wipeAllUserData,
useAccountActions.performDeleteAccount. Founder delegated the decision
("do what needs to be done").

RULING: options A and B combined, C rejected. The wipe_failed block was a
dead end: any throw from a fatal wipe step blocked sign-out forever
(force:true re-ran the same wipe), which punishes the user for a transient
error while protecting nothing. The fail-closed privacy rule is UNCHANGED —
sign-out completes only when zero user data remains on the device — but
"an exception was thrown" is not the same fact as "data remains", so the
gate now measures the fact directly:

1. `wipeAllUserDataWithRetry` (database.js) retries the wipe up to 3 times
   (500ms/1500ms backoff) before concluding anything.
2. If every attempt throws, `verifyUserWipeClean` inspects the actual fatal
   surfaces: user-keyed fatal tables + legacy NULL-owner photo rows +
   flat-wiped partner tables (row counts), this account's photo directory,
   and the snapshots directory. Zero residue → sign-out proceeds
   (`verifiedClean`, logged loudly). Any residue, or any verification error
   other than a missing table → fail closed exactly as before, with the
   failing step named in the alert (R2-12 honesty rule).
3. "no such table" is no longer a fatal wipe failure anywhere in the wipe:
   a table that does not exist holds no data, so it cannot justify trapping
   the user (a plausible R2-12 class on an older schema).
4. Delete-account's local-wipe step uses the same retry + verify primitive
   and the same step-named honest alert (it previously blamed "photo and
   scan data" for every failure class).

Option C (force-with-disclosure) is rejected outright: it would let a
sign-out complete with health data verifiably still on the device, which
Article 9 posture does not permit for a convenience escape.

Regression pins: src/lib/__tests__/signOutWipeEscape.test.js (retry,
verified-clean escape, fail-closed residue, missing-table tolerance) plus
re-anchored useAccountActions.guard ordering pin.

## D74 — Transaction-queue contract: no nesting, no foreign joins (lead ruling under D33, 2026-07-11)

Sources: R2-11 investigation (busy_timeout landed a84215c), opus
call-graph audit of all 18 runInTransaction task bodies (session log,
2026-07-11), founder delegation "do what needs to be done".

RULING: runInTransaction's blanket inline guard (`if (inTx()) return
task()`) is replaced by an ownership-aware rule. A parallel call while a
QUEUED transaction is open now queues - previously it inline-joined the
foreign transaction, so its writes committed or rolled back with someone
else's work and never serialised. Inline-join survives only for manual
BEGINs the queue does not own (seed/import paths). Nested
runInTransaction calls are forbidden by contract: the audit found
exactly one (planAutoGen's zero-match rollback via
deleteProgrammeCascade) and it was un-nested with a raw
deleteProgrammeCascadeInTx variant. createWorkoutSet and
recordEngineTelemetry INSERTs ride the same write queue (audit-proven
unreachable from any task, so deadlock-free). dbCrypto probe closes are
logged and classification-critical paths abort recoverably on a stuck
close (shared ref-counted native connection means a leaked probe
poisons every later probe). Remaining enumerated lane on the board:
migrate the four manual BEGIN/COMMIT blocks onto the queue.

## D75 — L05-D2 first-food prompt REVERTED (founder device verdict, 2026-07-12)

Sources: founder device walk on the fresh install (screenshots 05:14 and
05:19, 2026-07-12), commit b7cd2ab (L05-D2, design-usability audit
2026-07-09), DiaryScreen.js.

VERDICT: REVERTED, never re-propose. L05-D2 swapped MacroRings for a
"calm first-day prompt" while an account had never logged food. On the
founder's own fresh-install walk that meant NO ring, NO macro targets
and NO visibility of what to eat, on the exact day a new user plans
their first food - while the meal builder invited them to "build a day
or week from your targets". The audit optimised for less noise; the
device verdict is that the numbers ARE the product on that surface.

FACT CHECK recorded with it: the onboarding->nutrition-targets pipeline
was NOT broken. The 05:19 screenshot shows the engine's own numbers
(3497 kcal, 227g P, 440g C, 92g F) rendering in full once a food was
logged; the empty-state card also displayed the calorie target. The
regression was purely the display swap.

Change: MacroRings renders unconditionally (first day included);
FirstFoodPrompt component, its test, and the firstFoodPrompt guard test
deleted; the account-wide everLoggedFood read removed from the diary
load. A never-re-propose comment sits at the MacroRings call site.

## D76 — Progress-scan formula accuracy rulings D1–D4 (delegated, 2026-07-12) + founder launch-stability override

Sources: docs/audit/progress-scan-accuracy-audit-2026-07-12.md (5-agent
audit); progressScanCalibrationCorpus.test.js (release band contract);
founder delegation "make your judgement on what would be best for these
and put them into action" and subsequent direction that pinned-test
fall-out from engine changes "isn't acceptable" the night before launch.

RULINGS (lead, D33): D1 fix (continuous blend weight, lean boost pulls
up only, spread out of the score into confidence), D3 fix (measured-lean
silhouette keeps anchor protection regardless of BMI), D4 withhold
(sub-0.30 segmentation, clothing/background uncertainty and >20° tilt
promote from soft warning to withhold). D2: the distance-invariant
solidity redefinition CANNOT be validated offline — the synthetic corpus
fixtures' bodyAreaRatio values exceed their own bbox areas, so solidity
anchors are underivable from them; real device photos are required.

EXECUTION OVERRIDE (founder, same day): the D1 spread change was built
and measured — it moves two ratified release-band corpus cases out of
band (male_lean_broad_frame 80–94 → 78; short_muscular_stocky 74–90 →
71), i.e. a real recalibration of live users' scores. On the founder's
launch-stability direction the SCORE PATH ships byte-identical to live,
and D1+D2+D3+D4 land together as one post-launch corpus/curve retune
validated on real device photos. Hard constraint recorded: that retune
must land BEFORE the bf-estimator asset is ever flipped to 'validated',
because D1a/D3 are masked today only by the provisional ±8 clamp.

LANDED tonight (no score change, corpus 26/26): hardening batch
(33109fc), confidence honesty C-F1/C-F3/C-F4/C-F5 (1a35682), invariant
property suite (3f46160), plus earlier D-F1 facing guard (8cd7d79) and
capture defaults (aaf656c).

## D77 — iOS TestFlight emergency session rulings (lead, D33, 2026-07-12 night)

Sources: founder's live TestFlight session (build 40) Sentry sweep
(VOLYUME-S/12/17/18/1A/1B/1C/1D/1E/1F/1N/1W/1X/1Y, all pulled by time and
date of the session window); founder orders "fix ALL errors", "we don't
focus on fallbacks we fix the core", "merge to main". All landed to main
same night: crashes/tab bar `deded3e`, TFLite model `852cd17`, Apple
sign-in + Sentry noise `44dc987`.

RULINGS:
1. **iOS long-press set menu REMOVED (D25 amendment).**
   react-native-ios-utilities (zeego -> react-native-ios-context-menu)
   throws a fatal NSUnknownKeyException ('reactPropHandler' KVC on a plain
   RCTView) during Fabric descriptor registration at app START on RN 0.81
   — the string exists nowhere else in the dependency tree, and 5.2.0 does
   not change the crash path, so an upgrade is not a fix. Platform fork:
   SetRowMenu.js (Android keeps the zeego menu) / SetRowMenu.ios.js (bare
   row; both actions remain reachable via tap-to-edit). Both packages
   excluded from iOS autolinking (react-native.config.js + expo exclude,
   the Google Sign-In pattern). Packages stay in package.json because
   zeego's shared TS sources value-import from them (Metro must resolve
   them for the Android bundle). Sentry: VOLYUME-1X (1W presumed same
   event JS-side; verify on next build).
2. **Progress-scan TFLite model v2 (VOLYUME-1F root cause).** The bundled
   MediaPipe asset carries the MediaPipe-proprietary custom op
   Convolution2DTransposeBias; stock TFLite cannot resolve it, so
   createModel threw on EVERY device on BOTH platforms — the primary
   engine never ran once in production, all scans rode ML Kit / Apple
   Vision. Replaced with the SAME network converted to builtin ops (PINTO
   zoo #109 fp16, identical IO contract incl. the activation_10 output
   tensor). Validated end-to-end before shipping: flatbuffer op parse, a
   real interpreter run on a real person photo through the app's exact
   preprocessing, and the OLD asset reproducing the exact production error
   under the same interpreter. Renamed *_v2.tflite to bust the per-name
   native model cache. Guard test pins the v2 hash + bans the custom op
   string. WATCH ITEM: quality gates get their first real fast_tflite
   traffic on the next build — monitor scan diagnostics; recalibrate
   thresholds if confidence shifts.
3. **Tab bar restored to stock geometry (E15 §2 amendment).** The custom
   bar hard-coded a 60pt top-aligned content box; the slack pooled under
   the labels and read as a dead band over the iPhone home indicator
   (founder: "not launch worthy"). Now stock BottomTabBar geometry: 49pt
   content zone via minHeight (grows with system text), items centred,
   inset as padding below, fill edge-to-edge.
4. **Expected-offline sync warnings demote to breadcrumbs.**
   captureWarning demotes on the 'Network request failed' signature
   (message or context) or a sync.*/supabase.* scope while
   observability.isKnownOffline() is positively true (fails open on
   unknown). captureError never gated; local errorLog buffer unaffected.
   Kills the ~5,500-event offline flood (VOLYUME-S family).
5. **Apple sign-in error 1000 = device state, surfaced honestly
   (VOLYUME-18).** Entitlement verified present (the
   expo-apple-authentication plugin injects it; ios.usesAppleSignIn added
   belt-and-braces). ASAuthorizationError.unknown is thrown by Apple's
   sheet pre-code; LoginScreen now shows the iCloud remedy for the
   apple_device_state flag instead of a dead-end retry.
6. **VOLYUME-17 (StoreKit fetchProducts) = App Store Connect side, not
   code.** Init ordering verified correct, failure handled, paywall
   re-fetches, purchases unaffected. Founder checks the Paid Applications
   agreement + subscription states (section 3 of the board). Billing code
   untouched per the billing gate.
7. **VOLYUME-12 = working as designed.** It is the deliberate
   useAppStore.setTier tier-transition audit log (caller
   cascade.startCascade); not a defect, left alone.
8. **Raw-BEGIN sweep completed (VOLYUME-1N class).** food/seed.js (the
   Sentry hit), then the two remaining raw BEGIN/COMMIT sites
   (importExternal.runImport, food/libraryDelta page upsert) all ride the
   app-wide runInTransaction queue per D74's contract; no manual
   transaction remains outside database.js.
9. **Check-in trust defect (founder Android report).** The Today nudge
   gated on day-of-week only; it now mirrors the WeeklyCheckIn gate
   (FIRST_CHECKIN_MIN_DAYS + MIN_WEIGH_INS from the same query) and the
   checkinDay pref parse is unified (string-stored day can no longer split
   the surfaces).

## D78 — Founder orders, iOS build 42 walk (2026-07-13, second wave)

1. **The Why? expansion is REMOVED from Progress Photos (founder order).**
   The receipt sentence already carries the primary reason; the extra box
   read as clutter on device (it also appeared platform-asymmetric: it only
   rendered when a scan carried quality warnings, so iOS showed it while
   Android's clean scan did not). buildScanReceipt still produces whyLines
   for the engine contract; no surface renders them. Regression pinned in
   ProgressPhotosScreen.resultsContract.test.js.
2. **VOLYUME-2B root cause = Fabric double-fire of the native Apple
   button's onPress, NOT device state.** Sign-in always succeeded; the
   duplicate concurrent ASAuthorization request was rejected by iOS with
   error 1000 and logged an error against every successful sign-in
   (release 1.2.0+42 events confirm scope LoginScreen.oauth.providerError
   with a successful session each time). Fix: signInWithApple is
   single-flight (duplicate returns { duplicate: true }, silent) plus a
   synchronous in-flight ref guard in all three OAuth surfaces
   (LoginScreen, ProUpgradeScreen, ProOnboardingScreen) so the duplicate
   press never starts. The D77-5 apple_device_state remedy toast stays for
   GENUINE single-request error 1000. Pinned in auth-apple.test.js.
3. **iOS 57 vs Android 60 (Active vs Athletic band boundary) is OPEN and
   significant per the founder.** Scoring is platform-blind (verified: no
   Platform branches in progressScanAnalysis/Vision/ResultsContract); the
   next step is signal-file diffing via the existing calibration export
   (long-press the "Private on this device" pill in Progress Photos — share
   sheet, founder's email is on the allow-list). No engine change without
   the diff evidence; D76 lock stands until then.

## D79 — Scan measurement v2 (founder orders + evidence, 2026-07-13 afternoon)

**Evidence base:** the founder's signal exports from both phones replayed
through the engine reproduce 57 (iOS) and 60 (Android) EXACTLY — the engine
is deterministic and platform-blind; every cross-device difference is in
the measured inputs. His real stats (5'10", 90 kg, 31-inch waist, amateur
men's physique competitor) and the real front photo prove the v1
measurement layer reads the wrong anatomical stations:
- "waist" band (0.44-0.58 of body box) sat at hip/crotch level and measured
  his loose shorts (waistToShoulder 0.83-0.92 measured vs ~0.6 true), which
  zeroed the 30%-weight score component on BOTH devices;
- "hip" band (0.60-0.72) sat at mid-thigh; nearest-centre row read made it
  bimodal (one leg = 0.08 on Android vs both-legs-plus-gap = 0.30 on iOS;
  waistToHip 3.1, anatomically impossible);
- body box/area included stray mask blobs and both final scores sat on the
  provisional ±8 estimator clamp floor (silhouette-8: 65-8=57, 68-8=60).

**Rulings (lead, D33; founder orders quoted):**
1. "A 3 difference is significant and needs ironed out properly" +
   "iron it out properly" → measurement v2 SHIPPED: anatomical bands
   (waist 0.36-0.48, hip 0.46-0.58, thigh 0.58-0.70), central-segment-sum
   for hip/thigh (legs-apart == legs-together), dominant-component
   geometry (blob-proof body box/area), PROGRESS_SCAN_MEASUREMENT_VERSION
   = 'silhouette_bands_anatomical_v2'. The ANALYSIS layer (weights, curve,
   corpus) is untouched and byte-identical: it was calibrated for true
   anatomical ratios all along and the vision layer now supplies them.
   D76's byte-identical lock is superseded for the measurement layer only,
   by the founder's explicit order on real-device evidence.
2. Cross-measurement-version scan pairs fail CLOSED in scanComparability
   ("The scan measuring method was updated...") so a v1-vs-v2 pair can
   never read as fake physique change. Legacy pairs and v2 pairs compare
   normally.
3. Calibration export now carries per-pose capture provenance (engine,
   modelVersion, measurementVersion, fallbackReason, modelBacked) so the
   next cross-device diff can separate camera variance from backend
   divergence.
4. "We need to make the ratings higher and the scoring higher... We can't
   be offending people" → display-calibration uplift is ACCEPTED and
   EVIDENCE-GATED, deliberately sequenced AFTER one v2 scan pair from the
   founder's devices: the corrected measurements land first, he scans and
   exports once per phone, and the calibrateVolyumeScore curve + band
   labels are then set so his physique reads high-Athletic/Lean and softer
   users are never insulted (display floor already 40). Retuning the curve
   blind against mis-measured inputs would just be another guess.

**D79 addendum (population validation, same day):** the founder asked
whether calibrating against one individual is sound. It is not, and the
system is not: the calibration sources are the BodyM external research
dataset (real photographs with real tape measurements; opt-in smoke suite
runs the REAL vision measurement over them), the nine-case synthetic
corpus, and published anthropometric ranges. The founder's scans serve
only as defect evidence (impossible v1 values) and one ground-truth point.
Running the BodyM suite against measurement v2 caught a real regression
the founder's case never could: a BMI 37.5 subject scored 72 "Defined"
because F1(a)'s flat ±8 provisional-estimator cap blocked the deliberate
large-body downward correction (pre-existing clamps allowed -24/-26).
RULING (lead, D33): the provisional downward limit now comes from
estimatorAnchorDownwardLimit (8 for lean/protected physiques, so the
F1(a) athlete guarantee is fully preserved and pinned; 16-26 only via the
high-BMI/large-body gates). Upward stays capped at 8. BodyM suite passes;
corpus bands unchanged; founder's predicted v2 cases unchanged
(82 Lean / 74 Defined / 67 Athletic). The three analysis tests that had
pinned the flat cap (with comments recording the pre-F1 intent) were
re-pinned to the honest outcomes; the F1(a) invariant test now pins BOTH
guarantees (lean ±8, large-body -26). Standing rule: any scan measurement
or scoring change MUST run the BodyM smoke suite before landing
(PROGRESS_SCAN_BODYM_SMOKE=1), it is skip-by-default in CI.

**D79 second addendum (v3, founder rulings same day):**
1. Real Android scan on measurement v2 verified end-to-end: 60 -> 92
   (Very Lean, moderate), both poses fast_tflite + builtin-ops v2 model
   (provenance in the enriched export), ratios anatomically sane and
   consistent with the founder's tape reality. Replay reproduces the
   device score.
2. Founder ruling: "Tighten the hip read" -> measurement v3: hand-width
   runs (under half the row's widest segment) are dropped from the
   hip/thigh central sums; legs (near-equal widths) are kept. Version
   bumped to silhouette_bands_anatomical_v3 so his v2 baseline is never
   compared against v3 scans (he retakes the baseline on the next build).
   Regression pinned (hands-beside-hips test).
3. Honest outcome note: the hip fix corrects the measurement and the
   week-to-week stability, but the founder's score only moves ~92 -> ~91
   because calibrateVolyumeScore compresses the top (raw 65+ maps to 87+),
   and three components saturate at the lean end. The remaining
   "headroom / stage-lean discrimination" concern lives in the display
   curve + leanAt anchors, NOT the measurement. Retuning those is a
   population-level calibration change: OPEN, pending the founder's call
   (retune now against corpus + BodyM + his scan, or gather opt-in fleet
   calibration telemetry first).
4. Android versionCode bumped 28 -> 29 for the founder's next Play AAB.

## D80 — Display-curve retune (founder order "Retune now", 2026-07-13 late)

The hip fix (v3) was honest but only moved the founder ~92 -> ~91: the old
calibrateVolyumeScore top end mapped every strong raw score to 87+, so lean
physiques bunched within a few points of Peak and a full cut moved the
score almost nothing. RULING + founder order: the top half of the curve is
stretched ([55,79],[65,81],[75,85],[85,89],[92,94]); the lower half
(Foundation/Active/Athletic) is unchanged, the display floor stays 40, and
the BodyM population invariants pin the large-body region (suite green).
Result: the founder's real v3-corrected scan reads 88 Lean (high
confidence) with genuine headroom; Very Lean / Peak now mean stage-level
condition. Corpus re-ratified accordingly (very-lean synthetic 84 Lean,
broad-frame 76 Defined, stocky 71 Defined); exact-value pins across the
analysis/store suites updated with D80 notes. Scores across existing
users shift at the lean end only; cross-measurement-version comparability
gating (D79) already prevents any fake "change" reading.

## D81 — Fleet calibration telemetry (founder order, 2026-07-13 late)

Founder: collect scan calibration readings for all users to fine-tune
scoring as the user base grows; "no opt-in toggle, on for all, keep it
private to us, faceless info, no names to the data." Design (lead, GDPR
inviolables applied): rows are ANONYMOUS by construction — no user id, no
photo, no uri, no note, no exact timestamp (day only), height/weight in
5-unit bands — so the stored data is not personal data (GDPR recital 26);
the health-consent purposes copy gains a transparency line and the
privacy posture doc is updated, with no re-consent gate forced. Photos
and per-user scan records remain device-only (the no-sync guard is
untouched: this is one-way, fire-and-forget telemetry, not sync).
Cloud table scan_calibration_events (migration 117, founder-run):
insert-only for authenticated clients, no client read access.

## D82 — Coaching end-to-end verification + wiring fixes (founder order, 2026-07-13 evening)

Founder: confirm coaching + check-in works exactly as prescribed; weeks of
device testing are not plausible. Method: two-agent verification (opus) --
an adversarial wiring trace with file:line evidence, and a 14-week
simulation of the REAL engine (no mocks) across 5 personas with per-week
invariants. Results:
1. ENGINE VERIFIED: 35 existing suites (659 tests) green; simulation
   passed all invariants (floors never crossed, step sizes bounded,
   deterministic, no NaN; female near-floor held by the FFM gate; erratic
   user abstains for 14 weeks; rapid loser locked out of cuts from week 2
   by the ED-pattern detector and only ever adjusted upward).
2. FIXED (CONFIRMED-BROKEN): consecutiveOffTargetWeeks was derived from
   the previous saved coach output but never persisted, so it was
   permanently capped at 1 and the standard calorie-adjustment gate
   (needs 2-3 consecutive off-target weeks) could NEVER fire -- the core
   calorie loop was silently dead; only the rapid-loss override could
   change calories, and users saw "1 more week of the same trend needed"
   forever. Fix: the counter is persisted with the saved output and held
   in the screen state so apply-handler re-saves keep it. Guard test
   pins the wiring (CoachOutputScreen.offTargetCounter.guard.test.js).
3. FIXED (CONFIRMED-BROKEN): the onboarding-scheduled check-in reminder
   ignored the FIRST_CHECKIN_MIN_DAYS unlock, so a brand-new user's first
   reminder could open a locked "wait a few days" screen (same trust-
   defect class as the 2026-07-13 Home-nudge fix, at the push layer).
   Fix: scheduleCheckinReminder accepts earliestMs (same roll-forward
   mechanism as its min-gap rule) and Pro onboarding passes the unlock
   time. Scheduler test added.
4. NOTED RISKS (no action without founder call): (a) apply-time re-clamp
   covers the static sex floors only; the FFM floor is engine-time (the
   engine nulls sub-FFM cuts before they exist -- exposure limited to
   intake collapsing between run and tap, self-corrects next run);
   (b) coach_outputs/planned_muscle_volume/adaptation_events still sync
   via the legacy bulk path -- register them before any legacy-path
   removal; (c) the -1.5%/week rapid-loss flag reads the slow EWMA and
   can trail a true rapid loss by weeks -- the ED-pattern detector and
   the losing-too-fast upward corrections cover the gap (verified in
   simulation), but the flag itself is deliberately lagged.

**D82 addendum (founder "Yes we fix this", 2026-07-13 night):** the
founder's iOS build-43 scan (69, telemetry-verified v3+curve build)
exposed two capture-integrity gaps: an 11-degree propped-phone tilt
collapsed the shoulder read (waistToShoulder 1.79, anatomically
impossible) yet sailed under the 20-degree tilt gate AND was scored.
Fixes: (1) tilt retake threshold 20 -> 10 degrees in both the vision and
analysis gates; (2) new 'silhouette_implausible' abstention (waist to
shoulder > 1.3, waist to hip > 2.2, or shoulder read < 0.12 of height)
at the vision layer AND belt-and-braces on stored ratios at the analysis
layer, added to SCORE_WITHHOLD_REASONS so an impossible capture is never
scored -- calm retake copy names the tilted/propped phone. Valid-scan
score path unchanged (corpus + BodyM untouched by construction; full
suite green).

## D84 — iOS reads its analysis buffer upside-down (audits + founder files, 2026-07-13 late night)

Two adversarial audits (opus) ran on the founder's order to find "why iOS
doesn't work with the components we use". Pipeline audit, top finding
CONFIRMED: modules/progress-scan-image iOS extractRgb drew the photo into
a hand-built CGContext (bottom-left origin, unflipped) with
UIImage.draw(in:) (assumes UIKit's flipped space) -- the 256px model
input was rendered VERTICALLY UPSIDE-DOWN on iOS while Android rendered
upright. Dormant until this morning's v2-model fix switched iOS scans
from the Apple Vision fallback (whose preparedImage uses the correctly
flipped UIGraphicsImageRenderer) onto the flipped path: from then on
every on-iPhone scan measured a head-down body (shoulder band on the
legs) -- low-but-plausible scores or silhouette_implausible/inconclusive,
regardless of photo source. Verified against the founder's own iOS photo:
through a correct upright pipeline here it measures waistToShoulder
0.569 / waistToHeight 0.171 (elite lean ratios) -- the photo was always
good; the reading was broken, exactly as the founder said. Fix: CTM
flip in extractRgb before the UIKit draw. Also fixed from the
integration audit, CONFIRMED: notifications foreground handler returned
only the deprecated shouldShowAlert, so iOS showed no foreground
banners at all (all seven return sites now carry
shouldShowBanner/shouldShowList; ED suppression unchanged).
Recorded RISKS (no action tonight): expo-camera mirror saved-file
divergence Android-vs-iOS (device-walk item), iOS 64-pending-
notification ceiling under large meal-reminder lists, manipulateAsync
deprecation migration, decode-resolution/resampling and P3 colour
divergences (second-order), HEIC-in-.jpg un-baked orientation path.
Process note: a piped test command masked a red suite and one commit
reached main red for ~15 minutes before being fixed; gates now run
with explicit exit-code checks.

## D85 — UIKit removed from the iOS analysis render; fix PROVEN on device (2026-07-13 evening)

The D84 inversion was confirmed red-handed: the founder's own export
(scan scored 82) contained the exact 256px model inputs, both
upside-down. Founder asked for the structural option rather than the
CTM-flip correction ("B if it is definitely a better solution"):
extractRgb now draws the CGImage directly with CGContext.draw -- no
UIKit in the analysis path, so no coordinate-space mismatch exists to
correct and the flip bug class cannot recur. EXIF stays baked in by
kCGImageSourceCreateThumbnailWithTransform; the centred contentRect
keeps pixel placement identical. Guard test pins extractRgb to the
pure-CG primitive (UIImage/UIGraphicsPushContext/.draw(in:) banned on
code lines). Landed on main d7cf68f; gate lint 0 / test 0,
9,061 passed.

Founder built and scanned: the model input pulled from
scan_calibration_events (row a5aad947) is UPRIGHT, and every broken
signal normalised -- waistToShoulder 1.12-1.79 -> 0.609,
frontBackWaistSpread 0.131 -> 0.04, fragments 26-40 -> 12-18, score 83
"Lean" vs Android 89-91. Founder verdict: acceptable as an indicator
for now. OPEN (not parked -- founder said "not bothered for now"):
the residual ~6-8 point iOS-vs-Android gap, now investigable with
clean paired telemetry; prediction on record that including the side
pose lifts confidence from moderate.

## D86 — Coaching-decision results page: elite simplification (founder directive 2026-07-23)

Founder, from device screenshots of the weekly Coaching decision page
(IMG_1882/1883), verbatim: "Weekly check in results page is pretty crap.
Buttons that don't match the style of the app. Gumpf at the bottom out of
alignment and unnecessary. This is meant to be an elite app ... looks cheap
and unexpeccaey ai talk and also not user friendly language. We don't need
progress photos talk dominating the page either." Follow-up rulings,
verbatim: "we want this progress portal as like an addition to the check
ins. It's not a necessary thing ... food and work out logging is the primary
core function of check ins ... we can mention it ... but we don't have it
dominating the page ... Load down is probably better." "this needs to be
understandable, usable by end users, simplified, and for them to understand
what's changed and why ... There's a lot of text at the bottom of the page,
which is, like, fucking calculations and stuff like that that does not need
to be displayed there." Hard bound, verbatim: "We're not changing the
engine at all." "do not be stripping out things that are already there.
They're changing the look and feel of the page to make it more
understandable for the end user."

Delegated ruling (D33, lead): presentation-only rebuild of
CoachOutputScreen and its copy sources. (1) The top summary card renders
the weekly decision only: the photo sentence no longer folds into the
displayed lead paragraph. The applyProgressScanCoachContext wiring stays
exactly as the isolation guard pins it; only which interpretation string
the lead card displays changes. (2) One compact "Progress photos" card
low on the page (receipt headline plus one muted attribution line;
detail-or-non-authority-sentence, so every path still states targets come
from logged data). The scan evidence packet composition, suppression
gates (ED/calm fail-closed), and engine isolation are untouched. (3)
progressScanCoachResolver display strings rewritten from first-person
machine voice ("I am not using them", "low-confidence cross-check, not as
a target-setting trigger") to plain calm human copy with identical
meaning, including the ED-safe framings (not a reason to push the cut
harder; not a reason to change calories). (4) StatChip restyled from
bordered button-look pills to the app's quiet borderless surface2 chip
family (exercise-nav tab precedent) so stats stop reading as buttons.
(5) Hero hold copy simplified ("Hold steady this week."); the "The
reason:" prefix dropped. (6) The bottom credential jargon row (volume
landmarks / autoregulation / RED-S inline-tooltip row, the misaligned
"gumpf") removed; the medical-guidance disclaimer stays. Engine files,
weeklyCoach, nutritionEngine, floors, gates: zero changes.

## D87 — Live personal-record indicator on the logging screen (founder GO 2026-07-23)

Founder, from the active-workout screen (IMG_1884), verbatim: "I want Pr on
the screen so it's easily visible of going for a record or not consider the
best place to have that". Placement proposed and approved ("Ok go for it").

Lead ruling (D33): ONE live record line directly beneath the weight/reps
steppers, absorbing the existing "Est. max" caption rather than adding a row.
Two states. Quiet: "Best 90kg x 12 - Est. max ~128kg", so the bar to beat is
always on screen. Armed, when the currently entered weight and reps would
break a record: a gold trophy row reading "Record set if you hit this" plus a
plain why line naming WHICH record and the number to beat, and the bottom
bar's primary button takes a trophy icon so the signal is unmissable at the
moment of commitment.

Bounds. The indicator is a pure derivation from data the screen already
holds (allTimeSets plus this session's loggedSets for the exercise); no new
query, no new dependency, no engine change. It reuses detectPR, the same
function that fires the PR celebration on log, over the SAME history shape
(all-time sets plus this session's sets for the exercise, warm-ups included,
exactly as prHistory is built in handleCompleteSet), so the screen can never
promise a record it then fails to award. All three record types are covered
and named separately, because they do not move together: a heavier weight
for fewer reps can be a heaviest-weight record while not being an estimated-
max record. Silent cases, all deliberate: warm-up sets (a warm-up must never
chase a record), non weight-and-reps schemas (duration/distance reuse the
weight field, so a weight x reps detector would report meaningless records,
matching the existing isWeightReps gate), and an empty history (the
first-ever set of an exercise beats nothing, holding Wave A A1's honest
first-lift rule). WorkoutBottomBar keeps accessibilityLabel={primaryLabel}
unchanged per the R4/D64 same-string rule; the trophy is a leading icon only,
and the record row carries its own spoken label.

## D88 — Copy/design/trust audit remediation (founder GO 2026-07-23)

Five read-only Sonnet lanes audited onboarding/paywall, coaching/check-in,
food, training and a cross-app terminology sweep. Every finding was verified
hands-on before acting; unsupported claims were dropped (the cross-app lane
claimed "PB" appears only in code comments -- false, both PR and PB are live
in user copy). Founder: "Approve all your fixes."

RESOLVED BY FOUNDER, NO CHANGE: the ProUpgradeScreen trial line stating the
store "adds another week free" is CORRECT -- founder verbatim: "I have
configred the stores to give 7 days free." The audit flagged it as a possible
overclaim against playBilling's server-enforced eligibility comment; the
founder confirms the store offer is configured. Billing copy left untouched.

APPROVED AND BUILT (presentation and copy only; no engine, no thresholds):
1. Raw crash text reaching users: ProOnboardingScreen (plan-fail alert and
   the completion catch-all) and ProGoalSetupScreen (plan-rebuild toast) all
   interpolated a caught e.message straight into user-facing copy, one of them
   at the very end of onboarding. The interpolation is dropped; the existing
   logError calls keep the diagnostics.
2. First-person machine voice in live coach output: planExplain.js's
   supportive register said "I have taken ... off your plan". The actor is now
   "Your coach", per the locked voice doc's actor-naming rule.
3. Two energy totals on one card: MacroBreakdownSheet rendered the converted
   figure (toEnergy) beside an Atwater sum hardcoded to "kcal", so a kJ user
   saw two numbers in two units for one meal. The second figure now converts
   through the same helper.
4. En dashes in user copy (banned): NutritionTargetsScreen's estimated range
   and RoutineDetailScreen's rep range.
5. One number, two conventions: workout duration ("45m" collapsed vs "45 min"
   expanded on the same card) and estimated max ("82.5 kg" vs "~93kg" on one
   screen). Estimated max standardises on the hedged, whole-number form
   because it is an estimate, never an exact figure.
6. Terminology drift inside single screens: BuildWorkoutScreen named one
   action "workout", "training" and "session"; DiaryScreen called the same
   rows entries, items and foods; ExerciseDetailScreen had "Personal bests"
   and "All-time bests" for one list.
7. Destructive confirms that never said what is lost (cardio session removal,
   and the two divergent discard-workout bodies).
8. Smaller: curly apostrophes against a straight-apostrophe norm, an
   unguarded "1 sets" plural, and unreachable under/over calorie branches.

HEALTH SETTINGS -- AUDIT FINDING WITHDRAWN, NO CHANGE MADE. The lead
initially ruled that SettingsHealthScreen was a reachable "ghost feature"
(native Health deps absent from package.json and the app config, yet the
screen still routed and still offering Read morning weight / Write workouts /
Sync weight now, plus a prompt to install Health Connect). That ruling was
WRONG and is withdrawn. SettingsScreen gates the row on
`healthOn = isHealthAvailable()`, and health.js's getIosModule/getAndroidModule
deliberately always return null (documented, founder 2026-06-30: the
health-platform permissions were a Google Play review liability), so
isHealthAvailable() is always false and the row never renders. The feature is
correctly neutralised and unreachable; the screen and route are inert dead
code, not a user-facing trust breaker. The verification error was checking
that a navigate() call existed without checking the conditional wrapping it.
Recorded so the false finding does not outlive the session.

RESOLVED (founder 2026-07-23): PR, not PB. Evidence was the repo's own
competitor teardowns -- Hevy ships "explicit PR callouts" (cited to
help.hevyapp.com) and JEFIT ships "PR tracking" -- plus the term of art in
bodybuilding and strength culture, which is PR worldwide including the UK.
The lead's earlier PB recommendation rested on British English, but that rule
governs spelling and voice (colour, behaviour, optimise), not domain jargon;
"PR" is not an Americanism the way "color" is. Standard form is now "personal
record" in prose and headings, "PR"/"PRs" in chips and badges. CLAUDE.md's
free-tier list is corrected from "PBs" to "PRs" so a later session cannot
reverse it.

NOT swept, deliberately, and each verified in place:
- AnalyticsScreen's longest-run line ("A new personal best. 12 weeks running,
  your longest yet") is a CONSISTENCY STREAK record, not a lift. "A new PR"
  reads wrong for a streak, so it keeps "personal best".
- Every PB token in telemetry/events.js, database.js and partners/* is an
  event name, column or code comment (e.g. longest_run_pb_reached), not copy.
  Renaming those would break the analytics and partner wire contracts.
- ED check before sweeping the chart marker: only LiftProgressScreen passes
  highlightIndices, so bodyweight charts never carry a record marker. A
  bodyweight "record" would have been an ED-safety problem; there is none.

## D89 — Comprehension and trust audit: rulings on all 61 findings (lead-ruled under D33, 2026-08-06)

Founder ordered an extensive audit for confusion and trust-breaking
information (claims vs code, unexplained numbers and averages, chart
legibility, jargon vs the general population, design consistency). 12
read-only auditors + adversarial verification of every trust finding: 24
confirmed trust mismatches, 3 refuted, 37 comprehension/design findings.

All rulings, rationale and the three-wave fix plan live in
docs/audit/comprehension-trust-audit-2026-08-06.md (the source of authority
for every fix landed under this decision). Notables: the "safer calorie
floors" Calmer-coaching copy is FALSE (floors are always-on and mode-blind)
and is being corrected to describe the real behaviour — copy only, no
safety behaviour touched, flagged to founder for veto; "Show the science"
toggle and the widget streak are wired to nothing and will be wired for
real (W3); one deliberate NO CHANGE exception recorded
(NotificationSettingsScreen layout).

## D90 — Founder multi-choice rulings, 2026-08-06 evening

Asked in the structured format the founder mandated the same evening
("If you have questions for me ask them in multi answer format"). Answers:
1. X3 weight stores: WRITE-THROUGH. The Body Metrics form (create and
   edit) also writes morning_weights via the injected day-upsert writer,
   so the coach trend and rapid-loss gate see every weigh-in. The gate's
   input source is unchanged (morningWeightsSource guard stays green
   untouched). Deletes deliberately do not retract the day's weigh-in
   (fail-safe direction, recorded in code).
2. Cloud deload_week: ADD COLUMN. migrate_129 written; push wired.
   ORDERING: 129 must run against production BEFORE the next build ships.
3. Adaptive volume bands: BUILD NOW, not queued — founder verbatim: "We
   don't queue things... queuing things with Claude means they get lost
   forever." Work begins immediately after this landing.
4. Anon EXECUTE on SECURITY DEFINER functions: REVOKE. migrate_130
   written (PUBLIC+anon revoked, authenticated+service_role re-granted —
   a bare anon revoke is a no-op through the PUBLIC grant).
Also this evening (recorded in the design audit addendum 2): widgets stay
shipping with no further effort either way; paywall quiet links convert
to Button outline.

## D91 — Adaptive mesocycle build, Stage 1-2 lead rulings (D33, 2026-08-09)

Campaign authority: docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.9 +
the founder's 8-stage test-first order. Rulings made under delegation while
building Stages 1-2 (all criterion-ruled: best for end users, never effort):

1. One finished-block name everywhere: "Block finished" (chip, sheet,
   Plans, ActiveWorkout banner, Training blocks, CoachOutput note,
   WorkoutSummary celebration + share eyebrow). The old 'complete' /
   'overdue' split and the mixed "Block complete" labels read as two
   states and two products; one state, one name.
2. Interim advisor CTA honesty: 'adjust' recommendation's button reads
   "Restart this programme" until Stage 6 makes an app-side adjustment
   real, at which point "Continue with adjustments" returns WITH the
   behaviour. A button must not promise what the app does not do.
3. interBlock INSUFFICIENT_DATA splits by what was proven: an
   UNDELIVERED dose (adherence < 0.6 or exposures < 4) reseeds from the
   research table (the app's standard start, stated honestly); a broken
   MEASUREMENT over a delivered, tolerated dose (no recovery data,
   exercise-swap discontinuity, low confidence) RETAINS the previous
   volume and never guesses upwards. Retention follows the founder's
   dose-retention principle; blind upgrades are impossible.
4. OVERREACHED "-1 if a deload flag fired mid-block" (blueprint §3.1)
   interpreted as: mid-block = before the peak week. A flag in the peak
   week itself (the §3.7 shoulders example, week 4 of 5) holds the start
   rather than cutting it, which is what makes the worked example
   self-consistent.
5. Longer recovery (10 days) is proposed only when a STRAINED muscle is
   corroborated by >= 2 persistent systemic signals (readiness slope,
   sleep-flag weeks, advisor deload flag) — one struggling muscle never
   stretches the deload alone; 7 days otherwise; always user-confirmed
   (founder Stage 7 language: "multiple persistent signals").
6. STALE first flat block holds quietly; the stimulus-change proposal
   (variant swap primary, rep-range shift alternative) appears from the
   second consecutive flat block, or immediately when performance FELL
   with good recovery and a trusted measurement.
7. A finished block >= 4 weeks old (overdue limbo) keeps its
   classification but its evidence is stale: upward proposals suppress,
   reductions stand (detraining makes an increase unsafe to infer).

## D91 addendum — Stage 4 lead rulings (D33, 2026-08-09)

8. Peak-week softening semantics: only an observed recovery grade 3, only
   in the final accumulation week, only in blocks with >= 3 accumulation
   weeks, and only when consecutivePoorRecoveryWeeks is 0 (persistence
   means the fatigue predates the peak). The deload branch of the matrix
   always reads the raw grade; grade 4 is never touched. safetyHold's cap
   runs after the matrix, unchanged, so no context ever outranks pain or
   illness.
9. PR density threshold 0.3 (roughly one all-time PR per three completed
   sessions) for the top performance grade, with a caller-supplied block
   e1RM slope >= 1.5% as the alternative route (wired in Stage 6) and the
   check-in's own 'exceeded' verdict unchanged. Legacy binary retained
   only when no session count is supplied (older callers).
10. Deload-row apply guard: the coach screen never applies a POSITIVE
   volume delta into a recovery week's planned rows (pre-existing hazard;
   the peak-week push made fixing it non-optional). Reductions and the
   dedicated deload apply are untouched. The card explains the refusal.

11. (Stage 5 review fork, safety-adjacent, ruled most-protective per
   D15 precedent) §3.8's "no upward carry-over anywhere" binds the
   learned MEMORY, not just live proposals: a block trained under calm
   mode or an open ED flag never raises the learned ceiling - even
   after the flag clears - while its downward evidence still folds.
   interBlock entries carry observed.suppressed for this.
12. (Stage 5 review fork) "Manual edits still beat everything" extends
   to teaching: manual-override blocks are skipped by the learned-range
   replay entirely, so removing an override can never surface the
   user's own old numbers dressed up as coach learning.

13. (Stages 6-8 lead rulings, D33, 2026-08-09) The seeded plan's rows
   record their source (seed_ledger/learned/manual/profile/research or
   template) and every explanation surface reads the WRITTEN rows, so
   no narration can outrun the plan. The block-start card lives on the
   Home block sheet; the block-end story on the Plans decision card
   (four rows) and Block summary. The 10-day recovery window renders
   only when the ledger proposed it and always as the user's call. The
   mid-block deload apply maps strain from the persisted weekly
   recovery read (deload_suggested -> 4, concerned -> 2, else 0). The
   weekly ramp line claims a coach adjustment only when one was
   actually applied.

## D91 addendum — founder final order + Stage 7-8 review rulings (D33, 2026-08-09)

14. (FOUNDER RULING, verbatim authority) "Research MEV remains a safety
   reference but should not force a deload UPWARD when a
   percentage-based recovery dose is appropriately lower … MEV is a
   productive-training landmark, not automatically a recovery-week
   minimum." The recovery-week lower clamp is deloadFloor = half of
   research MEV, never below one set (coachApply.deloadFloor). MEV keeps
   its full rank everywhere else (§3.8 floor anchor in seeding and the
   learned range is untouched). Pinned with the founder's sentence:
   "Greater strain can only make a recovery prescription easier or
   longer; it can never make it harder or shorter" (deload.stage7).
15. (FOUNDER RULING) Deload strain is muscle-specific: computeDeloadVolume
   takes per-muscle strains with the block-level score as fallback, and
   the seeded deload reads each ledger entry's own recovery_cost_weight.
16. (Lead ruling, review #13, safety posture) An UNREADABLE strain fails
   CLOSED to heavy — the smallest recovery dose — mirroring the
   runner's fail-closed suppression read. Never the lightest cut.
17. (Lead ruling, review #4) The deload share applies to the muscle's
   peak CAPPED at the row it cuts (and, for seeds, at the seeded peak):
   achieved peaks carry secondary half-credit while planned rows count
   direct sets, so the uncapped share could make the recovery week a
   no-op. Capped, every deload is a genuine cut.
18. (Lead ruling, review BLOCKER #1) deloadSets clamps to
   min(startSets, ABSOLUTE_WEEKLY_SET_CEILING): a recovery week never
   exceeds the block's own lightest training week nor the backstop.
19. (Lead ruling, review BLOCKER #2, most-protective per D15/D91-11
   precedent) Suppression (calm mode OR open ED flag) withholds
   deloadSets entirely: a flagged user's recovery week stays the flat
   research-MEV week. Block carry-over never raises a recovery week.
20. (Lead ruling, review NIT #17) A true repeat carries no deloadSets:
   "the block the user just ran, unchanged" includes its recovery week.
21. (Lead ruling, founder e2e expectation) INSUFFICIENT_DATA is not a
   recommendation: resolveSeedRange skips it so the learned band (real
   prior evidence) speaks next, and the learned replay already ignores
   it. Pinned in adaptiveBlock.e2e ("never seeds as ledger").
22. (Lead ruling, review BLOCKER #3 vs the informed-autonomy ruling)
   The Plans decision card renders the per-muscle rationale rows ONLY
   above the 'adjust' button that actually applies them; 'repeat' and
   'consider_rebuild' run a TRUE repeat, so forward-claiming rows would
   lie there. The full reflection stays one tap away on BlockReflection
   for every intent; the 10-day recovery proposal line (a user-call
   statement, honest under any button) renders for all post_recovery.
23. (Lead ruling, review #5) Deload copy is qualitative ("fewer sets",
   "ease your sets right back") because the cut is now strain-scaled
   per muscle; the applied row states the exact share after the fact
   ("about N% of each muscle's recent working volume"). Two
   whyThisTemplates snapshots re-anchored deliberately for this.
24. (Explicit deferral, Stage 6 review #15, recorded per the no-silent-
   parking rule) Weeks under an applied EARLY deload still count toward
   the block's accumulation-week maths in the gather layer. The +2
   deload-flag weight already forces those blocks down the protective
   classification path, so the residual error is conservative
   (downward); a structural fix would re-thread week semantics through
   several pinned suites. Surfaced for founder review, not silently
   parked: say the word and it gets built in full.
25. (Recorded FUTURE task, founder order — do NOT build now) A
   training-epoch / learned-ceiling freshness rule for long layoffs,
   detraining and profile changes (the learned ceiling currently ages
   only through new block evidence; stale-evidence holds cover overdue
   blocks, not multi-month absences). No arbitrary weekly decay. On
   docs/TASKBOARD.md as a future item.

## D92 — Campaign 1: Product Integrity (founder order + lead rulings, 2026-08-10)

1. (FOUNDER BOUNDARY, verbatim intent) **Volyume is not a cardio logging
   product. Cardio logging is intentionally OUT OF SCOPE.** Any surviving
   cardio engine/schema/screen remnants (including the dead tap found by
   the product map: the only cardio entry navigates to an unregistered
   route) are legacy/incomplete implementation, NOT a hidden roadmap
   commitment. No audit should recommend restoring cardio for feature
   completeness; no campaign may re-enable cardio routes or surface
   cardio UI. Clean removal belongs to the later whole-product
   coherence/dead-code campaign. Exception: a cardio VALUE feeding a
   non-cardio safety decision may be corrected for correctness.
2. (Lead ruling, P0-3) A stored meal plan that conflicts with the user's
   CURRENT allergen/exclusion list is surfaced, never silent and never
   auto-regenerated: pinned meals are the user's own choices, so the
   MealPlanScreen shows a staleness notice naming the conflicting foods
   with the existing one-tap rebuild. Detection routes through
   foodRoles.foodExcluded (the single exclusion predicate) and judges
   curated items only - non-curated refs carry no tag data and are never
   claimed safe. The allergen list itself now rides the per-field profile
   merge (mealPlanExcludeTags added to PROFILE_FIELDS_TRACKED), closing
   the stale-device reversion hole.
3. (Lead ruling, P0-4) Joint/soreness semantics: UNKNOWN is not NO.
   Unanswered check-in joint pain persists as null (tri-state), never as
   an explicit negative; the block gather returns null (not 0) for
   missing joint/soreness aggregates; no-evidence contributes ZERO strain
   weight (pain is never manufactured) and can never satisfy a positive
   recovery requirement (lateRecoveryOk needs real answers for both
   signals). Legacy rows that stored 0 for unanswered are unrecoverable
   and continue to read as explicit "no".
4. (Lead ruling, P0-6) One canonical FFM-floor weight resolution
   (nutritionEngine.resolveFfmFloorWeightKg): profile weight, then
   today's EWMA, then the most recent valid weigh-in. Both weeklyCoach
   evaluations use it, so the floor shown is the floor that gates; the
   last-weigh-in step EXTENDS gate coverage to users with fewer than
   three weigh-ins (strictly more protective).
5. (Lead ruling, P0-2) The analytics opt-out is device-local per its
   module contract: excluded from pref sync in both directions; a FAILED
   preference read keeps telemetry off for the session (a miss still
   applies defaults). Cloud rows already uploaded are removed by
   migrate_133 (founder-gated, hygiene, not a release gate).
6. (Lead ruling, P0-1) planned_muscle_volume restores into the PRIMARY
   table with last-write-wins by updated_at; provenance columns ride via
   migrate_132 with column-tolerant pushes until it is applied; legacy
   rows degrade to research landmarks + source 'template' (the label
   that claims no personalisation); unknown muscles are skipped, never
   invented. The *_sync mirror is no longer written for this table and
   is recorded as dead for the dead-code campaign.

## D92 addendum — P0-7/P0-8 audit remediations (lead rulings, 2026-08-10)

7. (Lead ruling, P0-8 D11) THE CALM RATCHET: on the preference pull,
   a remote non-calm value never replaces a local 'calm', stamps or no
   stamps. Deliberate asymmetry, stated plainly: turning calm OFF
   applies on the device where the user turns it off and does NOT
   remotely un-calm another device - nothing remote may weaken an
   ED-safety state; the user can always turn calm off locally. Manual
   landmark blobs and the wellbeing key are additionally guarded by
   local write stamps (notePrefWrite) so a stale device's pull cannot
   revert them.
8. (Lead ruling, P0-7 D4) Unknown sex takes the HIGHER calorie floor
   (1500): sex is onboarding-enforced, so null only occurs in failure
   states, and a floor that is too high errs protective. Female stays
   1200; the founder floors are untouched. A missing body weight can
   never size a DEFICIT (holds at maintenance with a warning); surplus
   and maintenance still compute for display continuity. Seven test
   pins that encoded the old permissive behaviour were re-anchored
   with comments naming this ruling.
9. (Lead ruling, P0-7 D9/D7) Session feedback is written ONLY when the
   user touches it, and the per-session adaptive engine runs ONLY on a
   rated session. Rows stamped by pre-fix builds carry manufactured
   default answers that are indistinguishable from real ones -
   unrecoverable legacy, accepted.
10. (Recorded residuals, not silently parked) (a) The Home recovery
   banner still cannot compute hasOverMRV (needs the Progress
   surface's full volume pass); it can only UNDER-suggest by 12
   points and the Progress banner computes the complete signal.
   (b) user_prefs has no cloud stale-write trigger: the calm ratchet
   protects every device's local state, but a device that set calm
   cannot teach an offline device that calm was set elsewhere.
   (c) CORRECTED by the adversarial review (finding 9): weeks DO carry
   a user edit (the confirm-then-apply early deload writes
   is_deload/rir_target), so insertMesocycleWeekFromCloud now has the
   same LWW gate and timestamp preservation as its siblings - the
   original "weeks carry no user edits" justification was wrong and is
   withdrawn.
11. (FOUNDER DECISION REQUIRED - flagged, no code touched, per the
   CLAUDE.md ED-safety stop-and-ask rule) P0-8 D12: ed_pattern_flags
   is registered pull_only + server_wins but NOTHING pushes it - an
   open ED flag never reaches a second device, so device B keeps
   sending weight/food-adjacent notifications and offering
   un-suppressed coaching. The registry, the cloud table (migrate_017)
   and a code comment all claim/expect a cloud path, so wiring a
   raise-only push (never clears; cleared_at moves forward only)
   appears to be the RECORDED design - but it transmits Article 9
   special-category data and touches the locked ED-safety system, so
   it is the founder's call, not the lead's. Options: (A) wire the
   raise-only push per the recorded design; (B) keep flags per-device
   deliberately and correct the registry/comment; (C) something else.

## D93 — Campaign 2: Comprehension, explanation and terminology (founder order + lead rulings, 2026-08-10)

Campaign authority: the founder's Campaign 2 order (verbatim in the
session scratchpad `c2/CAMPAIGN2-ORDER.txt`; summarised on
docs/TASKBOARD.md). Branch claude/campaign2-comprehension from main
0a552cc4. Hard constraints: migrations 132-135 unrun, no EAS, D92-11
unaltered, no new cross-device sensitive-data paths, cardio out of
scope (D92-1), Campaign 1 pins stay green.

1. (Lead ruling) Phase 1 comprehension classification of all forty
   ordered concepts, ruled on the verified current tree, recorded in
   full in docs/comprehension-audit-2026-08-10/PHASE1-CLASSIFICATION.md.
   Headlines: class E (over-explained) is EMPTY - the product's failure
   mode is under-explanation and inconsistency, so no copy is removed
   for length; a binding keep-internal list (grades, matrices, band
   widths, smoother identities, strain maths, note-parsing keywords,
   detector thresholds and mechanics) constrains every later phase to
   resulting-reason copy; the two stop-and-report audit findings are
   accepted as in-scope copy defects (the WorkoutSummary working-sets
   tooltip's effort framing contradicting the type-based count, and
   the coach screen's raw weigh-in row counts contradicting the
   engine's distinct-morning hold).
2. (Lead ruling) Phase 2 terminology canon, recorded in full in
   docs/comprehension-audit-2026-08-10/PHASE2-TERMINOLOGY-CANON.md.
   Headlines: "volume" always means sets - every kg quantity is
   "Total lifted"/"total weight moved" (BlockReflection, YearOfLifts,
   ProgressSections, coach report to fix); "recovery week" is the noun
   and the five rendered "Deload" leaks are fixed, with "deload" and
   "tonnage" ADDED to JARGON_PATTERNS (explicit Phase 18 ruling - a
   strengthening; verified no generated copy emits either); "Est. max"
   canonical (LiftProgress "Best set" chip renamed - it collided with
   ExerciseDetail's heaviest-weight "Best set"); PR/personal record
   two-register canon with record types Est. max / Heaviest weight /
   Most reps; "plan" canonical over "programme" (blockAdvisor,
   seedRoutines, planEngine receipt); "Block finished" residue aligned
   to D91-1; "readiness" reserved for the self-report sense ("Profile
   readiness" tile becomes "Profile status", "Muscle readiness" becomes
   "Muscle recovery"); post-workout ratings are "session feedback",
   never "check-ins"; profile-phase labels display as the label the
   user picked (coachingGoals PHASE_LABELS) everywhere the value is the
   profile phase; statistical spans are "ranges" - "band" reserved for
   equipment and the scan leanness band; "hypertrophy" and spelled-out
   "minimum effective volume" replaced with plain growth phrasing;
   "1RM" considered for the blocklist and declined (single leak fixed
   directly). Engine symbols, DB fields, routes and storage keys are
   never renamed.

## D93 addendum — Phases 3-21 rulings and reviews (lead, 2026-08-10)

3. Phases 9-17 ruled in docs/comprehension-audit-2026-08-10/
   PHASE9-15-RULINGS.md: all twenty unexplained decisions classified
   (two fixed, one served by the new Methodology recovery-weeks
   section, keep-hidden set with rationale incl. free-text parsing and
   photo corroboration); phase-label unification VERIFIED NO-CHANGE
   (the calculator displays its own selection; label-string inversion
   coupling documented); glossary classification settled (pr added;
   mesocycle wired to the block sheet; macros/strengthLevel/
   autoregulation/redS orphaned-but-harmless; set/rep a11y-only with
   a recorded novice-pass residual; none removed; no banned entries
   added).
4. Both Phase 21 adversarial reviews ran and every genuine finding was
   actioned (evidence: scratchpad c2/REVIEW-A-novice.md,
   REVIEW-B-truth.md). Notables: one status vocabulary across both
   volume legends; Manual mode now states above the coaching cards
   that recommendations are the user's to make; distinct-morning
   weigh-in counting reached ALL four ledger callers; the RIR gloss,
   readiness purpose lines, research-start line, block-sheet climb
   line and manual-override disclosure were each corrected to claim
   exactly what the engine proves (review B findings 1-9).
5. RECORDED RESIDUALS (not silently parked - founder's list):
   (a) three phase-label vocabularies (harmonisation needs a
   migration-aware pass; persisted label inversion);
   (b) anatomy/technique vocabulary in formTips and plan descriptions
   (a content-education pass, out of this campaign's concept scope);
   (c) glossary set/rep reachable only via screen reader (novice
   pass); (d) the confidence caption's weigh-in addendum counts the
   displayed calendar week while confidence uses a latest-anchored
   window (edge-case divergence, both statements individually true);
   (e) review-deferred dead code and naming items listed in the
   review files for the dead-code campaign.

## D94 — Campaign 3: Discoverability, settings and existing-feature UX (founder order + lead rulings, 2026-08-10)

Campaign authority: the founder's Campaign 3 order (verbatim in session
scratchpad c3-CAMPAIGN3-ORDER.txt; taskboard block). Branch
claude/campaign3-discoverability from main 9aae57cb; foundations merged
at ba6f11aa. Laws: discoverability is not visibility (A-G), one owner
per setting, controls at the point of consequence.

1. (Lead ruling) Phase 2 ownership rulings on the rebuilt inventory's
   16 writer issues, recorded in full in
   docs/discoverability-audit-2026-08-10/SETTINGS-OWNERSHIP.md.
   Landed fixes: partner-cheers toggle (the locked unsubscribe law's
   missing path), onboarding check-in hour 12→18, notification blob
   merge-write, the frozen cloud mirror restored at the live writer,
   shared DIETS list across both diet surfaces, reader-verified
   "Diary meals per day" relabel, and the protein silent-revert fix
   (finding 6 RE-RULED on lane evidence from documented-intentional to
   genuine defect: goal-setup seeded from a stale profile mirror and
   overwrote the live nutrition_targets row on save; it now seeds from
   the saved row). The false "as you chose" scan-privacy claim removed.
   Finding 16 ruled STALE (per-side off switch exists). FOUR FOUNDER
   RULINGS recorded in the order's format: FR-1 calculator Sex/Age/
   Height fields (ED-adjacent; recommended read-only + link), FR-2
   dormant meal-plan prefs, FR-3 hide-exact control, FR-4 rest-timer
   beep mute.
2. (Lead ruling) Phase 11 on the two permanent dismissals: both
   intentional, no re-enables - the reconnect card's action stays
   reachable via the always-visible cheer sheet, and the photo-prompt
   opt-out ends a body-image-adjacent nudge where permanence is the
   protective choice.
3. (Lead rulings, Phase 9/10 landed) Point-of-consequence shortcuts:
   the Diary discloses an applied per-day calorie adjustment with a
   link to its canonical editor (renders only when non-zero); the
   volume-target editor gains a Coach-tab route (its only other path
   is data-gated). Gesture law: visible routes added for plan-day
   exercise removal and diary multi-select (same handlers, no new
   state); the saved-meals empty state names its gesture; entry rows
   disclose the hold shortcut to screen readers.

## D94 addendum — reviews and campaign close (lead, 2026-08-10)

4. Both Phase 24 reviews ran; every genuine finding actioned
   (evidence: REVIEW-A-normal-user.md, REVIEW-B-power-user.md +
   D94-3 in SETTINGS-OWNERSHIP.md). Notables: the campaign's own
   three contextual shortcuts were cross-tab dead taps, fixed through
   navigateCrossTab with the canary guard extended; the Diary offset
   disclosure now states the APPLIED delta only; the goal-change
   summary reads the live protein source; Article 9 cycle revocation
   survives a lapse. Two mirror findings ruled pre-existing
   architecture, documented for Campaign 4.
5. Boundary review clean (cardio/AI/social/auto-transition/safety/
   engines/migrations/builds). Campaign closed; five founder rulings
   (FR-1..FR-5) remain open by design.

## D95 — Campaign 4: Whole-product coherence, legacy/dead-code cleanup and product-boundary closure (founder order + lead rulings, 2026-08-10)

1. Founder order (verbatim in the session scratchpad, summarised on the
   taskboard): make the shipping product and the repository agree. Three
   laws - delete only what is PROVEN dead or out of scope (A-I classes,
   zero callers never sufficient); never delete historical user data
   because a feature is gone; a removed feature leaves no product
   promise behind. Cardio logging ruled NOT part of Volyume; steps/
   general activity and strength-to-health are different concepts and
   survive. Peak week legacy-load-bearing, 049 HELD.
2. Evidence: eight Opus audit lanes (docs/coherence-cleanup-2026-08-10/
   AUDIT-*.md). Rulings register: D95-RULINGS.md in the same folder
   (H1-H6 cardio postures, keep/delete rulings per lane, wave rulings
   D95-2, review rulings D95-3). Order-premise corrections ruled
   honestly: cardio was fully LIVE (removed as real surgery with a
   behavioural invariance pin - calories and steps coached identically
   on the exact fixture that used to fire cardio); peak_week_plans is
   CLASS A LIVE behind the B4 contest countdown (nothing removed,
   049's false header corrected, FR-PW-1 opened).
3. Landed (all merged in order): D95 rulings; engine/coach-screen
   cardio removal; peak-week deleted_at carry (record later corrected -
   defect latent, not closed); dead functions/copy/modules with every
   invariant moved to live code FIRST; campaign4.boundaries suite;
   full cardio closure (76 files, sync converted pull_only per H1,
   deleteCardioLog kept per H3, H5 fully non-destructive); routes/
   deferred/duplicates wave (dead registrations, six+ inert cross-tab
   taps fixed via navigateCrossTab, epleyE1rm consolidated under an
   equivalence test, muscleDisplayName single export); docs-truth wave
   (CLAUDE.md facts, supabase/README 072-135 tracker rebuild, locked-
   doc records, SUPERSEDED banners, U14 public cardio promises gone,
   EU-Dublin residency corrected on the public page).
4. Three adversarial reviews run and actioned (D95-3): A reachability
   (three more inert taps fixed + pinned; the lead's own over-trimmed
   stepsTarget law restored; migrate_059 header; H1/H3 limitations
   recorded), B product boundaries (the check-in save was CLEARING
   retained cardio answers via an explicit null against the
   preserving-write contract - fixed by omitting the key; store-listing
   sources and marketing fact base closed as promise leaks; boundary
   suite re-anchored off dormant steps code), C repository truth
   (watermelon.md/settings.json banners, plate-maths claim deleted
   from the fact base, deploy-migrations header MANUAL-DISPATCH-ONLY,
   39 applied-range migration headers swept from "pending" to YES with
   the 2026-07-27 sweep citation).
5. Phase 28: no new migration written or run; 132-135 unapplied; 049
   HELD. Phase 30: all gates green (PHASE-30-GATES.md - full suite
   9,626 passing, lint clean, campaign 1-4 suites, jargon, identity
   invariant; route census 116→105 registrations, dead taps 16→0,
   sourceless 1→0, boundary remnants 2→0).
6. Founder items opened: FR-C4-1..11 + FR-PW-1 + H4 listing updates
   (all on TASKBOARD §3 with detail in D95-RULINGS.md). FR-1..FR-5
   carried unresolved; FR-2/FR-3/FR-5 recommendations updated on this
   campaign's evidence (PHASE-30-GATES.md Phase 29 section).
   STOPPED after Campaign 4 per the order.

## D96 interim — Campaign 5 founder rulings FQ-1..FQ-8 (2026-08-10)

Recorded mid-campaign on founder order (full text and per-ruling
detail: docs/first-use-audit-2026-08-10/D96-RULINGS.md, founder-rulings
block). Side rulings only; Campaign 5 continues as commissioned.

TIER LAW (founder, verbatim in substance, binding everywhere):
**FREE DOES NOT HAVE COACHING. PRO owns adaptive coaching and
Continue-with-adjustments.** The Block Ledger may remain tier-blind
internally (workout evidence is not a Pro data type); the adaptive
coaching decision built on that evidence is Pro. Accidental
entitlement via placeholder rows or incidental check-in data is
removed; tier eligibility comes from the real entitlement system.

Summary: FQ-1(c) hand-off calm pointer, no new screen, three docs
corrected · FQ-2(a) Pro sees BOTH Repeat and Continue-with-adjustments
side by side, advisor recommends never gates, adjustments consume the
ledger; Free truthfully Pro-gated · FQ-3(b) session difficulty as
separate coarse effort evidence, never fabricated per-set RIR,
conservative fallback, resolves FR-C4-4 · FQ-4(a) Apply wired
end-to-end to session prescriptions; unapplied proposals change
nothing · FQ-5 approved in principle, exact locked-copy wording gated
on founder review · FQ-6.1 approved (idempotent trial-grant retry),
6.2 approved (authoritative trial end date), 6.3 HELD pending store-
console verification (beside H4), 6.4 approved (truthful platform
subscription management replaces the fake local switch) · FQ-7(a)
first qualifying exposure per exercise is baseline, PRs from later
comparable exposures · FQ-8(b) wizard structure unchanged.

## D96 — Campaign 5: first-use, onboarding and first-block journey (CLOSED 2026-08-11)

Campaign complete and merged to main. Full record:
docs/first-use-audit-2026-08-10/ — CAMPAIGN-LOG.md (stage log with
every landing SHA), D96-RULINGS.md (every ruling with rationale:
audit-phase rulings, the founder's FQ-1..FQ-8 block, and the lead's
Review A/B/C rulings), twelve audit evidence files,
REVIEW-A-new-user.md / REVIEW-B-state.md / REVIEW-C-experienced.md,
RELEASE-TRUTH-2026-08-11.md.

Supplements the interim block above:

- FQ-5 wording was subsequently APPROVED IN FULL by the founder
  ("Approve all") and landed (consent version stamp 2026-08-10,
  stamp-only, no re-gating). FQ-6.3 was RESOLVED by founder console
  confirmation (14-day in-app trial + 7-day store intro offer in BOTH
  consoles; permanent record in docs/rules/billing.md, never re-ask).
  FQ-6.1/6.2/6.4 landed with a written billing test plan
  (fq6.billing.test.js).
- Reviews A/B/C (Phases 42-44) each produced genuine findings; all
  were lead-ruled under D33 and actioned same-day (RA-1..RA-10,
  RB-1..RB-12 with two recorded residuals, RC-1..RC-9 including the
  tier-visible RC-1 ruling restoring Edit plan to Pro). Rationale per
  finding in D96-RULINGS.md.
- Phase 41's deterministic synthetic first user
  (campaign5.syntheticJourney.test.js, 29 tests incl. all ordered
  variants) and the first-use matrix (campaign5.firstUse.test.js,
  172 tests) are the campaign's permanent regression contract.
- Phase 45 release-truth audit: all six checks verified; H4 (store
  listings still promise cardio) remains OPEN and founder-side.
- Unchanged, confirmed at close: Article 9 gate, ED safety, D92-11,
  billing architecture and product IDs, no cardio, no AI, no new
  social scope, no auto block transitions, ONBOARDING_QUIZ_FIRST dark
  with rollback infra intact, migrations 132-135 written-unapplied,
  049 HELD, no EAS build. No new telemetry was added.

WORK IS STOPPED per the order — no returning-user work. Founder-side
actions and carried FR items: docs/TASKBOARD.md §3.

## D98 — Campaign 22 Phase 2 Stage 2 lead rulings (2026-08-17, D33)

Recorded at the Stage 2 lead review on `claude/campaign22-home-impl`
(commit 56782be2). Authority: HOME-TODAY-UX-SPEC.md (binding Phase 1
spec) + FOUNDER-RULINGS-PHASE2.md (R1/R2/R3 locked YES).

- **D98-1 (spec conformance, not a fork):** the agent build rendered the
  first-review readiness line only after today's weigh-in was logged,
  silently dropping spec §17 R4's conflict-day clause ("weigh-in wins;
  readiness line moves to R2 slot rank 4.5 on conflict days"). Built in
  full at lead review: `todayLineArbiter` gains a rank-4.5 occupant fed
  only while today's weigh-in is unlogged; on logged days the line
  renders in the Evidence Row as before. The line never simply vanishes.
- **D98-2 (safety parity, inviolable-adjacent):** the Home first-review
  line's suppression is the You tab's FULL `edSuppressed` formula (open
  ED flag, SCOFF >= 2, failed wellbeing read, calm mode - all failing
  closed), not the raw ED flag alone as the agent built it. The two
  surfaces consume the identical ledger, so they can never disagree
  about when weigh-in counting is allowed. Pinned at source level in
  firstReviewLine.test.js.
- **D98-3 (rehomed trial card S3 tap target):** on the You screen the
  S3 zero-history variant ("One session starts your first coaching
  review") taps through to the Today tab's Start hero, not the weekly
  check-in (which at zero sessions opens a hold receipt, not the
  promised session) - the C5-P12-01 principle: the card leads to the
  session it names, or stops claiming to. All other variants open the
  weekly check-in directly. Rationale over effort per D33: one extra
  branch, honest destination.

## D99 — Campaign 23 founder rulings + privacy-law amendment (2026-08-17)

Founder rulings R1/R2 for the Progress redesign, verbatim record in
docs/progress-audit-campaign-23-2026-08-17/FOUNDER-RULINGS-PHASE2.md.

- **D99-1 (R1):** the Progress landing Visual pillar shows derived
  visual-progress intelligence only (assessment/progress signal,
  trend, confidence, comparison status) — never a photo thumbnail.
  Imagery stays inside Progress Photos.
- **D99-2 (R2):** SUPERSEDES D18's render-time-only design as final
  architecture. The coarse locally-derived photoCorroboration
  contract feeds the authoritative runWeeklyCoach call. Authority
  exactly bounded: one-step confidence movement via the existing
  corroboration rule; supports-only; never originates evidence;
  never exits data-hold; all ED/calm/safety suppression senior;
  never alters calories, macros, training, volume, floors, recovery
  or held decisions. Raw photos, scan assets, scores, estimates,
  measurements, scan IDs and history stay local-only, never entering
  sync or coach persistence. Only the ordinary resulting coach output
  persists/syncs; no explicit photo-derived input/source flag is
  persisted unless technically unavoidable and separately justified.
- **D99-3 (PRIVACY-LAW AMENDMENT, exact founder wording, standing):**
  "Raw photos and scan-derived measurements remain on-device. A
  locally derived, non-reversible corroboration signal may contribute
  only to the bounded confidence of an authoritative coaching result;
  underlying visual evidence is never uploaded or synced."

## D100 — Campaign 24 lead rulings (2026-08-17, D33; recorded late —
## hostile-review F5 caught that two commit bodies cited "recorded"
## rulings this register did not yet hold. Corrected before merge.)

- **D100-1 (CoachReview deload gate, Wave C):** the shouldDeload
  suggestion on CoachReviewScreen is the same sanctioned data-driven
  authority Home presents and stays tier-visible (recorded C18 honesty
  rule); the defect was the missing seniority gate. Fixed with Home's
  exact inScheduledRecovery predicate (FB-02). No tier gate.
- **D100-2 (BodyMetrics trend consolidation, Wave D):** the screen's
  parallel rate/maintenance computation consolidated onto the shared
  deriveWeightTrend, extending the RECORDED ED-flag suppression
  (direction-only, no rate, no maintenance, fail-closed reads) to the
  surface that had missed it — the D98-2 suppression-widening
  precedent: safety-positive, no threshold changed, nothing removed,
  no new suppression law invented (no calm gate the sibling lacks).
- **D100-3 (CoachReview bucket unification, cohesion pass):** the
  three deload bucket builders share one derivation
  (buildLast4WeekDeloadBuckets); CoachReview unifies onto the
  D6-correct answered-only path — its pre-D6 coercion of unrated
  values to zero was a stale bug (Campaign 1 P0-7 D6 fixed the other
  two copies), so the sensitivity change is the correction, pinned
  with before/after values.
- **D100-4 (dead settings toggle, Wave F):** showHomeNutrition retired
  (a toggle controlling nothing fails the truth law; building the
  unbuilt feature would be sprawl). Returns with the feature if ever
  built.
- **D100-5 (startup flash, Wave E):** the give-up/retry design per
  WAVE-E-FINDINGS.md item 0 under the founder's neutral-splash law;
  sign-out clears the prior-session marker (hostile F7).

## D101 — Campaign 25 lead rulings at landing (2026-08-17, D33)

- **D101-1 (hero order STOP item):** the implementation agent proved
  (source + git show) that the block-advice card rendered BEFORE the
  hero pre-campaign, contradicting the spec's §1 diagnosis prose. The
  explicit target order in the founder brief and spec §2 (hero first,
  block card second) governs; the reorder the agent applied is
  accepted and the spec carries a correction note in §1.
- **D101-2 (Workout templates placement):** the spec's five-section
  target architecture is silent on the templates section. It stays in
  its pre-existing relative position (after Archived) — nothing in the
  founder order named it, and inventing a move is out of scope.
- **D101-3 (archived restore):** with renderPlanCard's footer retired,
  Restore stays reachable solely through the archived options sheet
  ("Restore plan"), matching the spec's no-inline-Set-active law for
  archived rows. Verified live at handleArchivedPlanOptions.

## D102 — Campaign 26 founder device orders + lead rulings (2026-08-17)

Founder device orders (verbatim intent, from the device-walk messages):
remove the Progress tonnage landmark row; remove the NowCard left accent;
remove the Diary macros-guide row; rename the "Visual" pillar so users
know it is Progress photos; remove the Home greeting; restore the
since-check-in evidence pane the C22 "First review" link had flattened;
combine morning weight + review readiness into one quiet evidence row
with the logged state de-emphasised; clear the logger workspace (no
standing "This week: stop N short of failure" line, no in-card coach
note - the prescription is the intelligence, explanation on demand
only); plain chromeless ellipsis on the exercise header; fix Progress
pillar text running out of space; hero chip text must be about the
block it opens.

Lead rulings under D33 recorded with the implementation:

- **D102-1 (evidence pane honesty reconciliation):** the restore order
  SUPERSEDES the d1f6a608 removal of the runway, and the truth-repair
  ruling's clamp objection stays fixed inside the restored pane - the
  weigh-in row shows "N of 3" needed-to-do progress only while short and
  the ACTUAL count once met, never Math.min. "Since your check-in" only
  after a real check-in (C5-P12-04 kept). Neutral ED variant unchanged
  in scope (date-only, no counts, no weight line).
- **D102-2 (weight fold-in):** the weigh-in strip renders only while
  unlogged (the action state); a logged weight is one quiet tick row in
  the pane. The green Logged pill card is retired.
- **D102-3 (hero chip default):** "On track for this block." - the C22
  single-counter law stands, so no week counter returns to the hero;
  the week's shape (and effort target) stays in the block-shape sheet.
  Priorities 1-4 (recovery/deload/readiness/fatigue) are untouched.
- **D102-4 (logger explanations):** the C20 Stage 11 provenance copy
  bank and the whole in-card coach-line chain are retired; on-demand
  explanation homes remain (session-adjustment sheet, readiness sheet,
  Recovery banner). This REVERSES C20's "answer before every working
  set" presentation contract on the founder's direct order; the
  deterministic prescriptions themselves are unchanged.
- **D102-5 (Progress overflow):** pillar state/evidence text wraps in
  full (rows grow) rather than truncating mid-sentence; copy sources
  unchanged.
- **D102-6 (FRAMING CORRECTION, founder same-day, verbatim: "STOP
  CALLING IT FIRST REVIEW"):** the evidence pane is the RECURRING
  weekly read and is never framed as a first review in any state.
  Titles: "Since your check-in" once ANY real check-in exists in
  history; the ledger's own "What your coach is reading" before that.
  Root cause of the regression on the founder's four-week device: the
  pane (and the C22 line before it) keyed off latestCoachDecisionComplete,
  a CURRENT-WEEK predicate that goes false mid-cycle when the engine
  saves a held output before the week's check-in. "Ever checked in" now
  derives from check-in HISTORY (any weekly_checkins row with an energy
  score); sessions count from the last real check-in's timestamp.
  Pinned: no pane state may ever contain "first review"
  (evidencePanel.test.js framing-law block).

## D103 — text-size law opened for amendment (founder, 2026-08-17)

Founder ruling, given ahead of the Campaign 27 proposal (verbatim
intent): "I am open to modifying any law for the betterment of the
app. The goal is the app to be elite and perfect on a range of
[devices]. All texts can be sized as suited for the best product."
Effect: EP-14's blanket-uncapped text scaling is no longer inviolable;
per-surface caps and device-class type ramps may be proposed and, on
founder approval of the Campaign 27 proposal's choice points, built.
Any capping change must amend the Settings copy that promises the
phone's text size is respected (truth law). The specific amendment
awaits the founder's answers to PROPOSAL.md section 4.
