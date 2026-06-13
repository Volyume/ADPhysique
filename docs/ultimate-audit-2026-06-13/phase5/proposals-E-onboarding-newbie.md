# Phase 5 proposals — CLUSTER E: Onboarding & newbie/light-user experience

Cluster sources (read in full):
- `phase3/compare-07-onboarding.md` (Onboarding & first-time experience)
- `phase3/compare-13-newbie.md` (Newbie & light-user experience)
- `phase1/11-onboarding-auth.md` (Welcome, FirstRun, Quiz, Login, ProOnboarding, ProSetupComplete, Article9Consent, Import)
- `phase1/03-home.md` (Home / FreeStarter)

Conventions: IDs U-E-n. British English. SACRED constraints respected — deterministic
engine (no AI/LLM), ED-safety untouched, billing unchanged, free/Pro gating absolute.
Any proposal that alters the onboarding SEQUENCE, the consent gate, or the trial-grant
coupling is flagged FOUNDER-GATE and treated as INPUT ONLY (per dispatch:
"FOUNDER-GATE onboarding-sequence/consent changes").

---

ID: U-E-1
AREA: Onboarding & newbie education — jargon
TITLE: Inline tap-to-define glossary for coaching terms shown before they are explained
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — "terminology must be glossed inline the first time shown" is the
  clearest beginner weakness in BOTH cluster fragments; instructiveness was the single
  most-mentioned valued attribute in the qualitative study (24×, ahead of personalisation)
  (compare-13 USER SENTIMENT, F1.3 VERIFIED; compare-13 WHERE WE LAG, F6.1 VERIFIED).
EFFORT (1-10): 4 — additive component + a static term map; touches several existing
  surfaces but no engine, no gating, no sequence change. The terms and their host
  screens are all enumerated in Phase-1.
CURRENT STATE:
  - Welcome shows "Precision Coaching™" with no gloss (WelcomeScreen.js:25 per
    11-onboarding-auth.md:66) and "division-specific" framing pre-explanation.
  - Home meso chip shows "Deload week" / "stop R short of failure" (RIR) unexplained
    (HomeScreen.js:1180–1202, 1193–1198 per 03-home.md:52); "Recovery week suggested"
    deload banner (HomeScreen.js:1068–1096) unexplained.
  - ProOnboarding step 4 shows phase (cut/lean-gain/maintain), competition divisions,
    protein "optimised/advanced", and body-fat methods BIA/caliper/DEXA unexplained
    (ProOnboardingScreen.js:1175–1309 per 11-onboarding-auth.md:206).
  - No inline tap-to-define affordance exists on any audited surface (compare-13 WHERE
    WE LAG; compare-07 WHERE WE LAG).
THE PROBLEM:
  Newbie impact: a brand-new gym-goer meets working vocabulary (RIR/deload/macros/
  divisions/BIA) with no inline definition, producing the "built for someone else"
  feeling the research names (compare-13 NEWBIE VERDICT; F3.1/F3.3 VERIFIED). Athlete
  impact: none negative — for an experienced lifter these are expected working terms;
  the gloss must be dismissible/non-intrusive so it never nags them (F6.2 ATHLETE,
  PARTIAL — carried as a constraint, not the justification).
THE EVIDENCE:
  - compare-13 WHERE WE LAG: "No inline tap-to-define glossary for RPE/RIR/AMRAP/macros/
    progressive overload" — F6.1 VERIFIED; F6.2 terminology-barrier ranking PARTIAL.
  - compare-07 WHERE WE LAG: "Jargon before explanation on the first screen … violates
    F3.5 and F6.1 (no jargon for newbies, VERIFIED). Best-in-class teaches science
    inside the questions (Noom green/yellow/red, F3.1)."
  - compare-07 MISSING ENTIRELY: "No just-in-time progressive disclosure for the dense
    steps … F3.3 (progressive disclosure / tooltips) is the named anti-overwhelm
    pattern (VERIFIED)."
BEST REFERENCE IMPLEMENTATION:
  Noom — teaches the science INSIDE the questions (green/yellow/red food teaching) rather
  than naming concepts cold (compare-07 BEST IN CLASS; F3.1 VERIFIED). The pattern to
  copy is in-context definition at the point the term first appears, not a separate
  glossary page.
PROPOSED SOLUTION:
  A lightweight, reusable "DefinedTerm" inline affordance: terms render with a subtle
  dotted underline / info-dot; tapping opens a small bottom-sheet or popover with a
  one-to-two-sentence plain-English definition and (optionally) a "why it matters" line.
  Definitions come from a single static term map (deterministic, no AI). Each term is
  glossed the FIRST time it is shown on a surface; the affordance is visually quiet so
  athletes can ignore it. No copy is removed — the gloss is additive.
NEWBIE EXPERIENCE: First time they meet "RIR", "Deload", "macros", "BIA", "division",
  or "Precision Coaching™", a tap reveals a plain definition without leaving the screen —
  the "teaching beats cheerleading" want (compare-13 USER SENTIMENT, F1.2 VERIFIED).
ATHLETE EXPERIENCE: Unchanged reading flow; the dotted underline is ignorable and the
  sheet only opens on explicit tap, satisfying the dismissible-not-forced constraint
  (F6.2 ATHLETE, PARTIAL).
IMPLEMENTATION BLUEPRINT:
  - New reusable component (e.g. `DefinedTerm`) — NOT DETERMINED IN CODE whether a
    tooltip/popover primitive already exists; confirm before building (no such component
    is cited in 11-onboarding-auth.md or 03-home.md).
  - Static term map (term → definition) as a new data file. Deterministic, no LLM.
    Initial term set from the audited gaps: "Precision Coaching™", "division" /
    "division-specific", "RIR / stop R short of failure", "Deload" / "Recovery week",
    "macros", "BIA", "caliper", "DEXA", "cut / lean-gain / maintain (phase)",
    "protein optimised/advanced".
  - Wiring points (exact, from Phase-1):
    · Welcome "Precision Coaching™" (WelcomeScreen.js:25).
    · Home meso chip (HomeScreen.js:1180–1202; text :1193–1198) and deload banner
      (HomeScreen.js:1068–1096).
    · ProOnboarding step 4 controls (ProOnboardingScreen.js:1175–1309) — phase,
      division, protein tier; and step 2 body-fat method segmented control
      (ProOnboardingScreen.js:879–1097, method visual/BIA/caliper/DEXA).
  - Gating: none — purely presentational; appears on both Free and Pro surfaces where
    the term appears. (Home is a Free screen with Pro-conditional content per
    03-home.md:40; the Pro-only terms render only when their Pro content renders, so no
    gating change is needed.)
  - States: empty/loaded/error — the sheet is static content, no fetch; if a term is
    missing from the map, render plain text with NO underline (fail-safe, never a broken
    affordance).
  - Edge cases: larger-text toggle must scale the sheet text (use tokens, not literals);
    Reduce Motion must skip any open/close animation (match existing pattern, e.g.
    WelcomeScreen.js:36–46). Touch target of the term tap ≥44px via hitSlop.
VERIFICATION: Justification VERIFIED (F6.1, F1.3, F1.2, F3.1, F3.3). Athlete-dismissibility
  constraint PARTIAL (F6.2 ATHLETE) — carried as a design constraint, not load-bearing.
  Whether a reusable tooltip/popover primitive exists is NOT DETERMINED IN CODE — confirm
  before building.

---

ID: U-E-2
AREA: Onboarding — Pro acquisition front door (Welcome)
TITLE: Gloss or defer "Precision Coaching™" / "division-specific" so the first screen does not front-load jargon
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — first-impression physics: jargon on the very first screen risks the
  "built for someone else" feeling before any value is shown (compare-07 NEWBIE VERDICT;
  compare-13 WHERE WE LAG, F3.1/F3.3 VERIFIED).
EFFORT (1-10): 2 — copy/treatment change on one screen; the exact strings and lines are
  in Phase-1. No logic, no gating, no sequence change.
CURRENT STATE:
  Welcome PRO_BULLETS and headings use "Precision Coaching™" cold (WelcomeScreen.js:25,
  bullets :22–27 per 11-onboarding-auth.md:58, 66) and a "division-specific" framing
  before any explanation; PRO_BULLETS are long two-sentence lines at fontSize.sm (13),
  flagged "heavy reading on a landing screen" (11-onboarding-auth.md:66).
THE PROBLEM:
  Newbie impact: meets the brand term and "division-specific" with no context
  (11-onboarding-auth.md:67 "assume domain knowledge a first-timer lacks"). Athlete
  impact: minimal — but note the Pro bullets do NOT yet name competition divisions for an
  experienced competitor either (11-onboarding-auth.md:68), so this is a clarity, not a
  depth, fix.
THE EVIDENCE:
  - compare-07 WHERE WE LAG: jargon before explanation on the first screen — F3.5/F6.1
    VERIFIED.
  - compare-13 WHERE WE LAG: "Jargon front-loaded before explanation on the Pro
    acquisition path ('Precision Coaching™', 'division-specific' on Welcome before any
    gloss — 11-onboarding-auth.md:66–67)" — F3.1/F3.3 VERIFIED.
  - Phase-1 CURRENT WEAKNESSES (WelcomeScreen): "'Precision Coaching™' jargon appears
    before any explanation (WelcomeScreen.js:25)."
BEST REFERENCE IMPLEMENTATION:
  Noom in-context teaching (F3.1 VERIFIED) and MacroFactor's plain, non-shaming framing
  (F3.4 VERIFIED) — describe the benefit in the user's own words before (or instead of)
  naming the proprietary mechanism.
PROPOSED SOLUTION:
  Keep the brand term but attach a one-line plain-English gloss on first use (e.g. pair
  "Precision Coaching™" with a short benefit clause), OR defer the trademark term until
  after the first benefit is stated. Replace "division-specific" with a plain benefit
  phrase on Welcome, leaving the precise division language for ProOnboarding step 4 where
  it is in context. Trim the two-sentence PRO_BULLETS to single benefit lines. This
  pairs naturally with U-E-1 (DefinedTerm) if that ships.
NEWBIE EXPERIENCE: The first screen states what they get in plain language; the brand
  term, if present, carries its own one-line meaning.
ATHLETE EXPERIENCE: Still sees the differentiators they care about (auto-adjusting
  training+nutrition, personalised targets, written rationale per 11-onboarding-auth.md:68);
  division depth still arrives in context at ProOnboarding step 4.
IMPLEMENTATION BLUEPRINT:
  - Edit PRO_BULLETS strings (WelcomeScreen.js:22–27) and any "Precision Coaching™" /
    "division-specific" copy (WelcomeScreen.js:25). British English.
  - Do NOT change tier routing, CTA targets, or the two-tier hierarchy
    (WelcomeScreen.js:55–64) — copy only.
  - States: static screen; no empty/error states affected. Price handling
    (usePlayPrices, WelcomeScreen.js:33–34) untouched — this is NOT a billing change.
  - Edge case: keep within the single ScrollView so it still scales (Phase-1 notes the
    screen is already dense, 11-onboarding-auth.md:65–66).
VERIFICATION: VERIFIED (F3.5/F6.1, F3.1/F3.3). No PARTIAL/NOT-FOUND. Not billing
  (no price/product-ID change). Trademark wording is a brand decision — surface the exact
  new strings to the founder before merge.

---

ID: U-E-3
AREA: Onboarding — pre-account Pro quiz (QuizScreen)
TITLE: Fix the quiz heading/body count mismatch and the "ready" gate that lets length/equipment be skipped
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — a first-impression credibility dent ("first-impression physics of
  F.7.1") and a "decorative onboarding" smell (every question should visibly change the
  plan) — both VERIFIED mechanisms.
EFFORT (1-10): 2 — heading string + the `ready` boolean on one screen; exact lines in
  Phase-1.
CURRENT STATE:
  - Heading "Eight quick questions." (QuizScreen.js:64) vs actual 5–6 distinct asks
    (experience, days, length, equipment, goal, conditional phase)
    (11-onboarding-auth.md:138).
  - `ready` = experience && daysPerWeek && trainingGoal (QuizScreen.js:54), so session
    length and equipment can be left unset and the user still advances
    (11-onboarding-auth.md:138).
THE PROBLEM:
  Newbie impact: the number mismatch reads as carelessness on the trust-critical first
  funnel screen (compare-13 WHERE WE LAG; F7.1 VERIFIED mechanism). Athlete impact:
  unset length/equipment weaken the PlanPreview the "your plan takes shape as you answer"
  promise depends on (compare-07 ATHLETE VERDICT; 11-onboarding-auth.md:140), and the
  quiz is already shallow for them.
THE EVIDENCE:
  - compare-07 WHERE WE LAG: "Quiz heading/content mismatch ('Eight quick questions' vs
    5–6 actual; session length/equipment not in the ready-gate) dents the first-
    impression credibility F.7.1 prizes (11-onboarding-auth.md:138, VERIFIED mechanism)."
  - compare-13 WHERE WE LAG: same mismatch — "minor friction against the 'every question
    must visibly change the plan / no decorative onboarding' principle (F2.5 — VERIFIED)."
  - Phase-1 CURRENT WEAKNESSES (QuizScreen): heading/body mismatch and the ready-gate
    skip enumerated (11-onboarding-auth.md:138).
BEST REFERENCE IMPLEMENTATION:
  RevenueCat/Flo principle — every question must visibly deepen perceived personalisation
  (compare-13 BEST IN CLASS, Flo VERIFIED; F2.5 VERIFIED). The fix is to make the count
  honest and to ensure each asked field actually feeds the plan.
PROPOSED SOLUTION:
  (a) Replace the heading with an accurate count (or a count-free phrasing) matching the
  rendered questions. (b) Decide deliberately whether session length and equipment are
  required: either add them to the `ready` gate so a complete plan is built, OR mark them
  explicitly optional in copy. FOUNDER-INPUT on which: the dispatch flags onboarding-
  sequence changes as gated; adding fields to the ready-gate changes funnel completion
  behaviour, so present both options.
NEWBIE EXPERIENCE: Honest expectation of length; no decorative questions.
ATHLETE EXPERIENCE: If length/equipment become required, PlanPreview is built on complete
  inputs, strengthening the teaser the athlete judges (11-onboarding-auth.md:140).
IMPLEMENTATION BLUEPRINT:
  - Edit heading string (QuizScreen.js:64) — British English.
  - `ready` definition (QuizScreen.js:54): option A add `&& sessionLength && equipment`;
    option B leave as-is and add "optional" microcopy to those question labels
    (QuizScreen.js:82–95).
  - CTA "See your plan" disable logic flows from `ready` (QuizScreen.js:117–124) — no
    other change.
  - Gating: pre-auth, no tier guard (correct, 11-onboarding-auth.md:136) — unchanged.
  - States: chips already minHeight 44 (QuizScreen.js:137, compliant) — no touch-target
    work needed here.
  - Edge case: telemetry markQuizStep('quiz_done') fires on advance (QuizScreen.js:57) —
    if the ready-gate tightens, confirm the funnel-completion metric still reads sensibly
    (NOT DETERMINED IN CODE how the funnel metric is consumed — confirm before building).
VERIFICATION: VERIFIED (F7.1, F2.5). The choice between required vs optional length/
  equipment is a FOUNDER-GATE onboarding-sequence decision — present as multi-choice,
  do not pick silently. Funnel-metric consumption NOT DETERMINED IN CODE.

---

ID: U-E-4
AREA: Onboarding — quiz↔wizard experience-band consistency
TITLE: Reconcile the 3-band pre-account quiz with the 4-band Pro wizard so prefill maps cleanly
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 5 — a correctness/consistency gap: a value carried across the account wall
  may not map, and the user can be shown a band the other side never offered
  (compare-07 WHERE WE LAG; VERIFIED in code).
EFFORT (1-10): 3 — align two enumerations + the prefill mapping; exact lines in Phase-1.
CURRENT STATE:
  - QuizScreen EXPERIENCE chips: New to lifting / A year or two in / Experienced (3 bands)
    (QuizScreen.js:21–25 per 11-onboarding-auth.md:127, 138).
  - ProOnboarding training-experience Dropdown: 4 options incl. "Competitive"
    (ProOnboardingScreen.js:71–76, step 3 :1101–1171 per 11-onboarding-auth.md:197, 205).
  - Quiz-prefill copies onboardingQuiz fields into the wizard on mount
    (ProOnboardingScreen.js:196–210; experience prefill :203) — so a 3-band value lands
    in a 4-band control (11-onboarding-auth.md:205).
THE PROBLEM:
  Newbie impact: low (a beginner picks "New to lifting" either way). Athlete impact: a
  competitor who self-identified as "Experienced" in the quiz may be silently re-mapped
  or shown a different set, and "advanced" cannot map cleanly across — undermining the
  "no value the other side never offered" trust point (11-onboarding-auth.md:138, 205).
THE EVIDENCE:
  - compare-07 WHERE WE LAG: "the bands even differ between quiz (3) and wizard (4)
    (11-onboarding-auth.md:138, 205)" — VERIFIED in code.
  - Phase-1 CURRENT WEAKNESSES (QuizScreen and ProOnboarding): the 3-vs-4 mismatch and
    its prefill consequence are stated explicitly (11-onboarding-auth.md:138, 205).
BEST REFERENCE IMPLEMENTATION:
  Fitbod/Freeletics non-condescending level handling (compare-07 BEST IN CLASS, VERIFIED)
  — declared level is handled consistently. The minimal fix is a single source of truth
  for the band set, or an explicit, documented mapping.
PROPOSED SOLUTION:
  Either (a) make the quiz and wizard share the SAME experience enumeration (single
  source of truth — note QuizScreen docstring already states it reuses coachingGoals so
  nothing is re-asked, 11-onboarding-auth.md:137; extend that principle to experience),
  OR (b) keep 3 bands pre-account for simplicity and add an explicit, documented prefill
  mapping (e.g. quiz "Experienced" → wizard default, with "Competitive" only selectable
  in the wizard). Deterministic mapping only — no inference. FOUNDER-INPUT on whether to
  unify (changes the quiz UI) vs map (keeps quiz simpler).
NEWBIE EXPERIENCE: Unchanged.
ATHLETE EXPERIENCE: A declared level carries across the wall without surprise re-mapping;
  "Competitive" remains reachable in the wizard where division depth lives
  (11-onboarding-auth.md:207).
IMPLEMENTATION BLUEPRINT:
  - QuizScreen EXPERIENCE source (QuizScreen.js:21–25) and ProOnboarding experience
    options (ProOnboardingScreen.js:71–76).
  - Prefill mapping (ProOnboardingScreen.js:196–210; :203). If option (b), define the
    explicit map here.
  - Gating: pre-auth quiz / Pro wizard — unchanged.
  - States: no new states; ensure prefill never leaves the wizard Dropdown on an invalid/
    blank value (Phase-1 notes the engine must never get a silent fallback,
    11-onboarding-auth.md:204 — keep that guarantee).
  - Edge case: PHYSIQUE_GOALS / GOAL_LABELS / TRAINING_PHASES enums live outside the
    audited files (11-onboarding-auth.md:131, 139) — NOT DETERMINED whether experience
    bands share a module; confirm the single source before unifying.
VERIFICATION: VERIFIED in code (the 3-vs-4 mismatch and prefill are directly cited).
  Unify-vs-map is a FOUNDER-GATE onboarding decision (input only). Whether a shared
  experience-band module exists is NOT DETERMINED IN CODE — confirm before building.

---

ID: U-E-5
AREA: Onboarding — migration / switching-cost moment
TITLE: Surface the Hevy/Strong import as an offer during first-run, not only buried in Profile
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — a switching-cost/migration moment for experienced users arriving from
  another tracker is currently not surfaced when it matters (compare-07 MISSING ENTIRELY;
  VERIFIED that ImportScreen lives in Profile, outside the first-run chain).
EFFORT (1-10): 3 — add an entry point/offer into the first-run chain that routes to the
  existing ImportScreen; ImportScreen itself is already a complete state-machine (no new
  import logic). Exact routes in Phase-1.
CURRENT STATE:
  ImportScreen exists and works (Hevy/Strong CSV, full idle→preview→done state machine,
  ImportScreen.js per 11-onboarding-auth.md:302–318) but is registered ONLY in
  ProfileStack (RootNavigator.js:397) and is "NOT in the first-run onboarding chain …
  a new migrator must find it in settings" (11-onboarding-auth.md:312, 318).
THE PROBLEM:
  Newbie impact: none (a brand-new gym-goer has nothing to import — 11-onboarding-auth.md:316).
  Athlete impact: an experienced lifter migrating from Hevy/Strong is never OFFERED the
  meaningful switching-cost reducer at the moment of switching; they must discover it in
  settings (11-onboarding-auth.md:317–318).
THE EVIDENCE:
  - compare-07 MISSING ENTIRELY: "Onboarding-time offer of the Hevy/Strong import:
    ImportScreen exists but lives in Profile, outside the first-run chain
    (11-onboarding-auth.md:312, 318) — a switching-cost/migration moment is not surfaced
    during onboarding." (Status: the gap is VERIFIED against code; it is a placement gap,
    not a missing capability.)
  - Phase-1 LOCATION QUESTION (ImportScreen): "a discoverability gap rather than a wrong
    placement" (11-onboarding-auth.md:318).
BEST REFERENCE IMPLEMENTATION:
  Hevy's <90s expert onboarding (compare-07 BEST IN CLASS, VERIFIED) — get the
  experienced user to their data fast. Offering import at first-run is the
  switching-cost-reduction move that respects an arriving expert's existing history.
PROPOSED SOLUTION:
  Add a non-blocking, skippable "Coming from another app? Bring your history" offer to the
  first-run flow that routes to the EXISTING ImportScreen, then returns to the normal
  flow. Placement options (FOUNDER-INPUT, sequence change): (i) on FirstRunScreen for Free
  (an "Import instead" secondary affordance) and/or (ii) as a card on ProSetupComplete for
  Pro ("Bring your Hevy/Strong history"). Import is a FREE feature (ImportScreen has no
  Pro guard, 11-onboarding-auth.md:313) so it can appear on both paths. No change to the
  import logic itself.
NEWBIE EXPERIENCE: A true beginner sees a clearly skippable, plainly worded offer ("New?
  skip this") and ignores it — no forced step.
ATHLETE EXPERIENCE: Offered their migration at the right moment; one tap brings sessions/
  sets/weights/reps across with the honest matched/created/skipped breakdown
  (11-onboarding-auth.md:308, 317).
IMPLEMENTATION BLUEPRINT:
  - Reuse ImportScreen (RootNavigator.js:397) — register/route it so it is reachable from
    the first-run chain (FirstRunStack RootNavigator.js:470, and/or ProOnboardingStack
    RootNavigator.js:502/506) and returns to the flow afterward. NOT DETERMINED IN CODE
    whether ImportScreen can be navigated to and back without disrupting the first-run
    completion state machine (FreeStarter owns completeFirstRun, FirstRunScreen.js:36–37;
    ProSetupComplete owns it, ProSetupCompleteScreen.js:84–86) — confirm the return path
    before building.
  - Entry copy on FirstRunScreen (FirstRunScreen.js:77–84 hint area) and/or a card on
    ProSetupComplete (alongside cards :142–307). British English.
  - Gating: Free feature (no Pro guard) — show on both paths; do NOT gate it.
  - States: ImportScreen already handles idle/parsing/preview/importing/done/error
    (11-onboarding-auth.md:306–311) — no new states. The offer itself must be skippable
    (empty action) and must never block first-run completion.
  - Edge case: a user who imports during onboarding then proceeds must not double-create
    a starter plan; confirm interaction with FreeStarter's copy+activate
    (FreeStarterScreen.js per 03-home.md:81). NOT DETERMINED — confirm before building.
VERIFICATION: The placement gap is VERIFIED against code. Adding it to the first-run chain
  is a FOUNDER-GATE onboarding-sequence change (input only — present placements (i)/(ii) as
  multi-choice). Two implementation facts NOT DETERMINED IN CODE: the import→return-to-flow
  path, and the import-then-starter-plan interaction.

---

ID: U-E-6
AREA: Newbie & light-user — per-action "why" microcopy
TITLE: Plain-English one-line "why this" attached to the newbie's first sessions/movements
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 6 — "teaching beats cheerleading"; beginners want the WHY attached to the
  action, and instructiveness was the most-valued attribute (compare-13 USER SENTIMENT,
  F1.2 VERIFIED; F1.3 VERIFIED). Carried as enhancement because the supporting per-exercise
  finding is VERIFIED/PARTIAL.
EFFORT (1-10): 5 — copy/data surface on FreeStarter result and/or Home hero; whether a
  per-movement rationale source exists is unknown.
CURRENT STATE:
  - FreeStarter explains the PLAN in plain terms but not per-movement: result intro "Built
    for people starting out. Every session tells you exactly what to do: the exercises,
    the sets, and the reps." (FreeStarterScreen.js:191–194 per 03-home.md:85) — no
    per-exercise "why".
  - ProSetupComplete has a "Why this plan, for you" reasons block (whyThis) for Pro
    (ProSetupCompleteScreen.js:232–292 per 11-onboarding-auth.md:234), but the FREE newbie
    surfaces have no equivalent per-movement line.
THE PROBLEM:
  Newbie impact: the highest-leverage newbie surface (FreeStarter) tells them WHAT but not
  WHY at the level of the action; research values a one-line "why" attached to the action
  (compare-13 WHERE WE LAG, F1.2/F4.1–F4.2 VERIFIED/PARTIAL). Athlete impact: none — the
  athlete already gets rationale in the Pro path (11-onboarding-auth.md:207, 234, 244).
THE EVIDENCE:
  - compare-13 WHERE WE LAG: "Per-exercise 'why this exercise / why this weight'
    plain-English coach line for newbies is not evidenced on the newbie surfaces
    (FreeStarter explains the plan but not per-movement) — research values a one-line
    'why' attached to the action (F1.2, F4.1–F4.2 — VERIFIED/PARTIAL)."
  - compare-13 MISSING ENTIRELY: "Per-exercise form video / coach audio cues at the moment
    of need (Future-style — F4.2 VERIFIED): not present on any audited Volyume surface."
    (We propose only the plain-text "why", NOT video/audio — see VERIFICATION.)
BEST REFERENCE IMPLEMENTATION:
  Future — per-exercise rationale/cues at the moment of need (compare-13 BEST IN CLASS,
  F4.2 VERIFIED). Adapted to Volyume's offline/no-AI constraints as deterministic
  plain-text "why" lines, not media.
PROPOSED SOLUTION:
  Add a short, deterministic plain-English "why this" line to the newbie's primary
  action: on the FreeStarter result card (one line on the recommended plan) and/or as a
  one-line rationale on the Home hero for the free first-timer. Lines are static/rule-based
  (e.g. tied to the chosen goal/equipment/days), reusing the same non-AI approach as the
  deterministic FreeStarter scoring (03-home.md:94) and the Pro whyThis pattern
  (11-onboarding-auth.md:234). No LLM, no randomness.
NEWBIE EXPERIENCE: The recommended plan/first session carries a one-line reason ("Chosen
  because you picked X and Y") — teaching at the point of the action.
ATHLETE EXPERIENCE: Not shown on athlete surfaces (FreeStarter is the beginner on-ramp,
  03-home.md:96); no change.
IMPLEMENTATION BLUEPRINT:
  - FreeStarter result card (FreeStarterScreen.js:185–220; recommendation logic in
    lib/onboarding/freeStarter.js per 03-home.md:81) — add a deterministic rationale line
    near the result meta (FreeStarterScreen.js:195–209).
  - Optionally Home free first-timer hero (HomeScreen.js:1162–1301; free no-plan/starter
    area :1331–1413) — a one-line "why" near the plan card.
  - Gating: Free surfaces only (FreeStarter is Free per 03-home.md:89; Home is Free).
  - Source of the "why": MUST be deterministic. NOT DETERMINED IN CODE whether
    freeStarter.js exposes the reason for its pick (the rule that selected the plan); if
    not, the rationale must be derived from the answered quiz inputs, not invented.
    Confirm before building — do NOT fabricate a per-movement reason the engine cannot
    support.
  - States: empty/loaded — if no deterministic reason is available, render NO line (never
    a guessed one). Error: same fail-safe.
  - Edge case: the no-recommendation fallback (FreeStar.js result "We couldn't pick a plan",
    FreeStarterScreen.js:221–235) must not show a "why" line.
VERIFICATION: Justification VERIFIED (F1.2, F1.3) with the per-exercise specifics
  VERIFIED/PARTIAL — flagged EVIDENCE-THIN at the per-movement level; the plan-level "why"
  is the safer scope. The media form (Future video/audio) is explicitly OUT OF SCOPE
  (offline/no-AI constraints). Whether freeStarter.js exposes its pick rationale is NOT
  DETERMINED IN CODE — confirm before building.

---

ID: U-E-7
AREA: Onboarding — acknowledgement / progress feedback during intake
TITLE: Add Noom-style acknowledgement micro-copy and/or an updating live projection across the Pro wizard
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 6 — "Length isn't the enemy; emptiness is"; long flows convert when every
  screen returns value (compare-07 BEST IN CLASS / TOP 50 RANGE, Noom & Lose It! VERIFIED;
  progress predictability F2.5/F7.2 VERIFIED).
EFFORT (1-10): 6 — per-step copy plus, for the projection, a deterministic recompute as
  answers change; touches the multi-step wizard.
CURRENT STATE:
  - ProOnboarding has an endowed-progress bar + "Step X of 5" counters
    (ProOnboardingScreen.js:766–807 per 11-onboarding-auth.md:194) but the screens "do not
    respond to each input" (compare-07 MISSING ENTIRELY).
  - The "your plan takes shape as you answer" promise (QuizScreen.js:65) is delivered as a
    SINGLE PlanPreview/ProSetupComplete reveal, not a continuously updating figure
    (compare-07 MISSING ENTIRELY; 11-onboarding-auth.md:140, 231–234).
THE PROBLEM:
  Newbie impact: a long Pro wizard with no per-answer acknowledgement feels emptier than
  best-in-class; acknowledgement and a moving projection sustain motivation
  (compare-07 MISSING ENTIRELY, F5.4/F7.4 VERIFIED). Athlete impact: a live figure that
  updates as they set division/recovery/protein would reinforce that each lever matters
  (compare-07 ATHLETE VERDICT; F2.5 VERIFIED).
THE EVIDENCE:
  - compare-07 MISSING ENTIRELY: "An updating live projection during the intake (Noom's
    moving goal date, F5.4 VERIFIED) … delivered as a single reveal, not a continuously
    updating figure"; and "Acknowledgement/empathy micro-copy on individual intake answers
    (Noom 'Thank you for sharing…', F7.4 VERIFIED) — Volyume's screens are clean but do not
    respond to each input."
  - compare-07 WHERE WE LEAD: endowed-progress bar already lifts completion ~22%
    (F2.5/F7.2 VERIFIED) — this proposal extends an already-working mechanism.
BEST REFERENCE IMPLEMENTATION:
  Noom — acknowledgement copy on nearly every screen + an updating weight-loss projection
  date (compare-07 BEST IN CLASS, VERIFIED). Adapt the projection to a DETERMINISTIC,
  engine-computed figure (never an AI estimate).
PROPOSED SOLUTION:
  Two separable parts, both deterministic:
  (a) Acknowledgement micro-copy: short, neutral acknowledgements on intake steps (NOT
  shaming, NOT cheerleading — respects MacroFactor "no shaming", F3.4, and the ED-safety
  tone). Pure copy.
  (b) Live projection: a small, continuously-updating figure (e.g. an estimated target or
  timeline) recomputed by the EXISTING deterministic engine as answers change in the
  wizard. No new estimation logic beyond what the engine already produces at submit.
  Part (a) is low-risk copy; part (b) is the sequence/feel change and is FOUNDER-GATE.
NEWBIE EXPERIENCE: Each answer is acknowledged; the live figure shows their inputs
  mattering — the "every question visibly changes the plan" want (F2.5 VERIFIED).
ATHLETE EXPERIENCE: Setting recovery/division/protein visibly moves the figure, reinforcing
  the depth they came for (11-onboarding-auth.md:207).
IMPLEMENTATION BLUEPRINT:
  - Per-step copy in ProOnboarding step bodies (steps 2–5: ProOnboardingScreen.js:879–1556).
  - Live projection: recompute via the SAME shared engine the wizard already calls at
    submit (nutrition targets computed via "the shared engine",
    ProOnboardingScreen.js:514–762 per 11-onboarding-auth.md:201). MUST be deterministic —
    no AI/LLM, no randomness (SACRED). NOT DETERMINED IN CODE whether the engine can be
    called incrementally/cheaply mid-wizard without side effects (the submit path writes
    profile/metrics/plan) — confirm an isolated, side-effect-free compute path before
    building.
  - ED-safety: any projected figure MUST respect calorie floors and the rapid-loss
    threshold and MUST NOT bypass src/coaching/safety/ — FOUNDER-GATE, do not touch the
    safety system (CLAUDE.md). If the projection could imply an unsafe target, it must not
    be shown.
  - Gating: Pro wizard only (ProOnboardingStack).
  - States: projection shows only once enough inputs exist; otherwise hidden (never a
    placeholder number). Reduce Motion: no animated counter.
  - Edge case: the existing "Building your plan" honest staged overlay
    (ProOnboardingScreen.js:451–497) must remain the truthful final compute — a live
    pre-figure must be framed as an estimate, not the finished plan, to preserve the
    operational-honesty lead (compare-07 WHERE WE LEAD, F3.2 VERIFIED).
VERIFICATION: Justification VERIFIED (F5.4, F7.4, F2.5, F7.2, F3.2, F3.4). FOUNDER-GATE:
  part (b) is an onboarding-sequence/feel change AND touches engine-output presentation
  near the ED-safety boundary — input only, do not build the projection without sign-off;
  part (a) copy is low-risk. NOT DETERMINED IN CODE: a side-effect-free incremental engine
  compute path. Carry as INPUT ONLY.

---

## Cross-cluster notes (not proposals)

- The dual-audience tension ("the same app rarely serves both with one flow", F6.4
  VERIFIED; compare-07 USER SENTIMENT) is structurally already addressed by Volyume's
  tier-branched onboarding (Free quick-setup vs Pro 5-step wizard). The branching
  short-core-plus-optional-deep-intake structure noted under compare-07 MISSING ENTIRELY
  is explicitly INTERPRETATION in the source (§2/§5), NOT a sourced claim — NOT proposed.
- Behaviour-based recalibration of declared level (Freeletics F1.4 VERIFIED) and
  coach-matched onboarding (F1.5 VERIFIED/PARTIAL) are noted MISSING but are mechanism
  changes to the deterministic engine / a product direction (human coaches) — NOT proposed
  here; they are SACRED-adjacent and would be founder product decisions.
- Peer/community belonging (compare-13 MISSING ENTIRELY, F7.1/F7.3 VERIFIED) is flagged in
  the source itself as architecture-constrained by offline-first / EU-residency / no-PII
  (CLAUDE.md) and "must be a founder decision, not built silently" — NOT proposed.
- The no-anonymous-mode speed-to-tool lag vs Hevy (compare-07 WHERE WE LAG) is a
  deliberate backup/sync decision (LoginScreen.js:270–277, 327–331) — NOT proposed.
