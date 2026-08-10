# Campaign 2, Phase 2 — Terminology canon (LEAD RULING)

Ruled 2026-08-10 under D33 delegation, single criterion: best for the end
user. Authority: the founder's Campaign 2 order, Phase 2. Evidence: the
read-only terminology re-audit against main `0a552cc4` (session
scratchpad `c2/P2-terminology-verify.md`; all 19 map collisions
re-verified, 124 rendered "volume" occurrences classified, exhaustive
user-facing surface lists per collision). Registered as D93-2.

Standing constraints honoured: engine symbols, database fields, route
names and storage keys are NEVER renamed for copy consistency — this
canon binds RENDERED VOCABULARY only. Every fix listed is a UI-layer
string change.

---

## THE DECISION TABLE

Columns per the order: internal concept · current user-facing terms ·
canonical user term · terms to avoid · exceptions · rationale · surfaces
affected.

### 1. Weekly working sets per muscle (engine: workingSets, VOLUME_LANDMARKS)

- **Current terms:** "volume", "weekly volume", "This week's volume",
  "working sets", "Sets", "volume targets" (81 rendered occurrences).
- **CANONICAL: "volume"** — always meaning sets, never kg. The unit word
  is **"working sets"** ("Sets" permitted on space-constrained stat
  tiles when a tooltip defines it).
- **Avoid:** using "volume" for any kg quantity (see concept 2); the
  effort-based definition of a working set (a working set is counted by
  TYPE, not by how it felt).
- **Exceptions:** seed routine NAMES ("Push Day 2: Volume Focus") stay —
  they are content titles, sets-compatible, and renaming library content
  under users' feet is worse than the residual looseness.
- **Rationale:** this is the dominant, glossary-defined sense (81 of 124
  occurrences) and the sense the coaching engine acts on. One word, one
  meaning: if it is called volume, it is sets.
- **Surfaces:** none change for this sense; the fix is evicting the
  other senses from the word (concept 2). The WorkoutSummary "Working
  sets" tooltip loses its second sentence (the effort framing that
  contradicts the type-based count — the Phase 1 F-finding).

### 2. Total weight moved (engine: tonnage)

- **Current terms:** "Total lifted" (Campaign 1's rename, now on
  WorkoutSummary hero, LiftProgress, ExerciseDetail), "Volume"
  (BlockReflection stat + narrative), "weekly volume" (YearOfLifts stat
  unit), "tonnage" raw (ProgressSections tooltip, coach report PDF),
  "kg moved", "lifted".
- **CANONICAL: "Total lifted"** as the label; **"total weight moved"**
  in prose; "kg moved" acceptable as a compact unit.
- **Avoid:** "volume" for any kg figure; raw "tonnage" anywhere
  user-facing.
- **Exceptions:** none.
- **Rationale:** Campaign 1 already established "Total lifted" on the
  three biggest surfaces; the residue is exactly the ambiguity the
  founder named. The app's own glossary comment records the conflict.
- **Surfaces to fix:** `BlockReflectionScreen` label `Volume` →
  `Total lifted` + its three narrative lines ("kg of total volume",
  "Weekly volume climbed", "Volume was lower/consistent" → total-lifted
  phrasing); `YearOfLiftsScreen` unit `weekly volume` → `weekly total
  lifted`; `ProgressSections` WorkloadCard tooltip "tonnage" → "total
  weight moved" and status line "Room for more volume" → "Room for more
  work"; `coachReport` PDF "Total tonnage" → "Total lifted (kg)".

### 3. Recovery week (engine: deload)

- **Current terms:** "Recovery week" (53 sites), "lighter week" (27),
  raw "Deload" (5 rendered leaks: ActiveWorkout status chip + a11y,
  Home chip line, GLOSSARY.streakWeeks, coach report PDF).
- **CANONICAL: "recovery week"** as the noun. "Lighter week" stays as
  descriptive prose (it is plain English describing the week, not a
  second name; many sites use both: "a lighter recovery week").
- **Avoid:** "deload" rendered anywhere.
- **Exceptions:** none user-facing (code symbols untouched).
- **Rationale:** the jargon blocklist was always meant to keep "deload"
  off the screen (the map believed it did); the five leaks are static
  strings that bypass checkJargon. The worst is a chip labelled
  "Deload" that expands into a banner titled "Recovery week" — one UI
  object, two names.
- **Surfaces to fix:** `ActiveWorkoutScreen` chip label `Deload` →
  `Recovery` and a11y "Dismiss deload banner" → "Dismiss recovery week
  banner"; `readinessSummary` line "Deload week, pull effort back." →
  "Recovery week, pull effort back."; `GLOSSARY.streakWeeks` "Deload
  weeks always count" → "Recovery weeks always count"; `coachReport`
  row label `Deload` → `Recovery week`. ADDITIONALLY "deload" and
  "tonnage" join JARGON_PATTERNS (a strengthening of the jargon law —
  explicit ruling recorded here per Phase 18; the blocklist test gains
  cases; no generated copy currently emits either word, verified).

### 4. Estimated one-rep max (engine: e1rm, record type 1rm_estimate)

- **Current terms:** five forms — "Est. max", "est. max" (lowercase),
  "Estimated max", "estimated max", "Best set" (LiftProgress chip for
  the e1rm lens); plus one "1RM" leak in the coach report PDF.
- **CANONICAL: "Est. max"** as label; **"estimated max"** in running
  prose and accessibility strings.
- **Avoid:** "e1RM" (never renders today — keep it that way), "1RM",
  and "Best set" for the e1rm lens ("Best set" also means the
  heaviest-weight PR on ExerciseDetail — one label, two referents
  across adjacent screens).
- **Exceptions:** none.
- **Rationale:** "Est. max" is already near-universal and
  glossary-backed; the chip rename removes a genuine cross-screen
  contradiction.
- **Surfaces to fix:** `LiftProgressScreen` chip `Best set` → `Est.
  max`, headline label `est. max` → `Est. max` (and `:457` prose);
  `coachReport` "Best lifts (estimated 1RM basis)" → "Best lifts
  (estimated max basis)".

### 5. Personal record (engine: PR event, record_type)

- **Current terms:** "PR", "personal record", "personal best", "New
  bests", record-type labels in four divergent sets ("Heaviest set" /
  "Best set" / "Heaviest weight" / "Max weight" / "Heaviest"; "Most
  reps" / "Total reps").
- **CANONICAL:** **"PR"** short form and **"personal record"** long
  form — one concept, two registers (Phase 3 gives it the definition
  both share). Record types: **"Est. max"**, **"Heaviest weight"**,
  **"Most reps"**.
- **Avoid:** "personal best" / "bests" as a third name; "Best set" as a
  record label.
- **Exceptions:** chart-lens chips that measure something genuinely
  different (e.g. a total-reps-over-time lens) keep their own accurate
  names — a lens is not a record; implementation verifies each chip's
  actual metric before renaming (no blind label sweep).
- **Rationale:** the app's most-repeated achievement term should have
  one name before Phase 3 gives it one meaning.
- **Surfaces to fix:** `AnalyticsScreen` "New bests" label + "A new
  personal best." → personal-record phrasing (visible label and a11y
  label currently disagree on the SAME control); `ExerciseDetailScreen`
  highlight-card labels unified to the canonical record-type trio
  ("Best set" at `:674` → "Heaviest weight"); `LiftProgressScreen`
  "Heaviest" → "Heaviest weight". `CoachReviewScreen` "pushing for new
  bests" prose may stay — "bests" as ordinary English inside a sentence
  is not a label.

### 6. The training plan (engine: programmes table)

- **Current terms:** "plan" (dominant: Plan library, My plans, Restart
  this plan?), "programme" (blockAdvisor card headlines/buttons, 13+
  seed plan descriptions, planEngine receipt — including both words in
  one sentence).
- **CANONICAL: "plan"**.
- **Avoid:** "programme" in rendered copy.
- **Exceptions:** none. (D91-2's concern was button HONESTY — "Continue
  this programme" vs behaviour — not the word; renaming to "Continue
  this plan" preserves that ruling's substance.)
- **Rationale:** the user activates things from a screen titled "Plan
  library" and a list titled "My plans"; a finish-block card offering
  "Continue this programme" introduces a second name for the same
  object at a decision moment.
- **Surfaces to fix:** `blockAdvisor` (8 strings), `planEngine:2351`
  (the two-words-one-sentence case), `seedRoutines` descriptions (13+),
  `partners/shareWins` "Programme contents" → "Plan contents".

### 7. Training block (engine: mesocycle)

- **Current terms:** "training block" (settled screen word), "block"
  (bare), "Training Block" (Title Case, 2 sites), "Block complete"
  residue (3 sites + 1 narrative) despite D91-1's one-name ruling
  ("Block finished").
- **CANONICAL: "training block"** on first mention per surface,
  **"block"** bare thereafter; sentence case always; the finished state
  is **"Block finished"** everywhere (D91-1).
- **Avoid:** "mesocycle" in prose (already blocklisted); Title Case;
  "Block complete".
- **Exceptions:** the route/file names (`MesocycleBuilder`) are code,
  untouched.
- **Rationale:** D91-1 is standing law; the residue predates it.
- **Surfaces to fix:** `MesocycleBuilderScreen:188` and
  `BlockReflectionScreen:216` casing; `shareCard/recapPayload` eyebrow
  `BLOCK COMPLETE` → `BLOCK FINISHED`; `partners/shareWins` milestone
  `Block complete` → `Block finished`; `WorkoutSummaryScreen` a11y
  "Share block complete" → "Share block finished";
  `BlockReflectionScreen:86` narrative "is complete" → "is finished".

### 8. Readiness (the pre-session self-report)

- **Current terms:** four unrelated user-facing meanings — pre-session
  self-report ("Readiness (optional)", "Session readiness check"),
  per-muscle recovery ("Muscle readiness"), check-in-derived block trend
  ("your overall readiness has dipped"), and PROFILE COMPLETENESS
  ("Profile readiness: Needs updates").
- **CANONICAL: "readiness"** is reserved for how ready the user feels
  to train — the self-report sense and trends derived from those
  reports (the blockAdvisor lines qualify: they aggregate the user's
  own reported readings).
- **Avoid:** "readiness" for data staleness or for computed muscle
  recovery.
- **Exceptions:** none.
- **Rationale:** the sharpest one-word collision found: "Profile
  readiness" is a data-freshness meter that reads no fatigue signal at
  all, one screen from "Muscle readiness" which reads only fatigue.
- **Surfaces to fix:** `AthleteProfileScreen` tile label `Profile
  readiness` → `Profile status` (values/subs unchanged);
  `ReadinessCards:241` `Muscle readiness` → `Muscle recovery` (its own
  sub already says "How recovered your muscles are").

### 9. Check-in (the weekly coaching check-in)

- **Current terms:** "Weekly check-in" (settled), bare "check-in" in
  push copy, "session check-ins" (ReadinessCards tooltip, naming the
  post-workout ratings — a name used nowhere else), "A gentle check-in"
  (calm-mode gate on BodyMetrics).
- **CANONICAL: "check-in"** = the weekly coaching check-in, qualified
  "weekly" on first mention per surface. The post-workout ratings are
  **"session feedback"** (matching the WorkoutSummary card heading
  "Workout feedback").
- **Avoid:** "check-in" for the post-workout ratings; "check-in" for
  the calm-mode consent moment.
- **Exceptions:** push notification titles may stay bare ("Your
  check-in is ready…") — with the session sense renamed there is only
  one check-in left to mean.
- **Rationale:** the ReadinessCards tooltip attributes the Recovery
  gauges to "session check-ins" on a card that also counts weekly
  check-ins — the same word for both inputs in one component.
- **Surfaces to fix:** `ReadinessCards:215` tooltip "session
  check-ins" → "your session feedback after workouts"; `ReadinessCards`
  `:85/:94/:97` qualify "weekly check-ins"; `BodyMetricsScreen:984`
  title "A gentle check-in" → "A gentle pause" (calm-adjacent — LEAD
  edits this one hands-on).

### 10. Training phase labels (engine: lean_gain/bulk/cut/… ×
   nutritionKey × coachingPhaseKey)

- **Current terms:** the engine keys never render (all paths mapped,
  verified) but FOUR parallel label vocabularies do: "Build muscle
  (bulk)" (coachingGoals/AthleteProfile) vs "Build muscle (fast)"
  (nutritionEngine/NutritionTargets) vs "Build muscle quickly"
  (planEngine receipt) — the same user's phase wears three names within
  two taps.
- **CANONICAL:** the label the user PICKED — `coachingGoals.
  PHASE_LABELS` — is the phase's display name everywhere it refers to
  the user's current phase.
- **Avoid:** parallel display names for the profile phase.
- **Exceptions:** the NutritionTargets standalone calculator's own
  goal picker keeps its list (it includes "Lose weight (fast)" /
  aggressive_cut, which is not a profile phase); prose descriptions of
  what a phase does ("eating more supports higher training volumes")
  are sentences, not labels, and stay.
- **Rationale:** identity: what you chose is what you see.
- **Surfaces to fix:** Phase 10 implements — display sites
  (`NutritionTargetsScreen` results rows, `planEngine` receipt
  headings) echo `PHASE_LABELS[profile.phase]` where the value IS the
  profile phase; calculator-local goals untouched. Implementation
  verifies each site's data source before changing it.

### 11. Statistical spans ("band")

- **Current terms:** six referents — resistance band (equipment),
  leanness band (progress scan, glossary-defined), legacy uncertainty
  band, weight-trend band ("Trending inside your band", used cold with
  no antecedent), ±10% calorie band, volume band (key name only; its
  copy already says "range").
- **CANONICAL:** **"range"** for every statistical span. "Band" is
  reserved for (a) resistance-band equipment and (b) the progress-scan
  **leanness band** (established, glossary-defined, consent-screen
  vocabulary).
- **Avoid:** "band" for trend/uncertainty/tolerance spans.
- **Exceptions:** as stated in canonical.
- **Rationale:** four abstract "bands" plus a physical one reach the
  same Pro user; "range" is already the app's dominant word for target
  spans.
- **Surfaces to fix:** `weightTrend:149/:151` "your band" → "your
  target range"; `NutritionTargetsScreen:582` "10% band" → "10%
  range"; `progressScanAnalysis` legacy-compare strings "uncertainty
  band(s)" → "uncertainty range(s)".

### 12. Remaining audited collisions — no user-facing action

- **half-credit / fractional working set / indirect volume / effective
  sets:** code-only, zero rendered strings. No action.
- **maintain / maint / maintenance:** "maint" never renders; label
  unification folds into concept 10; "maintenance" as an English noun
  stays.
- **weekly_checkins / _v2:** data-layer only. No action.
- **learned range / adaptive band / adaptive landmark:** code-only;
  the user vocabulary is "targets" and "ranges" and stays so. Phase 7
  adds the user-facing concept language.
- **PR-as-density:** code-only. No action.
- **deload-the-flag vs deload-the-week:** code-only once the five
  rendered leaks are fixed.
- **"plan" meal vs training:** each is qualified in context ("meal
  plan", "today's plan" on the meal screen); no cold uses found. No
  action beyond the canon note.
- **"goal" (phase / division / per-exercise / goal-lock / weekly
  session target):** the UI mostly already avoids the bare word. One
  fix: `AthleteProfileScreen:177` tile label `Current goal` → `Current
  focus` (it renders the PHASE as value and the DIVISION as sub —
  "focus" matches the question the user answered: "What are you focused
  on right now?").
- **"coach" (algorithm vs human):** one live wrinkle:
  `contestCountdown:55` "If you work with a coach, book your check-ins
  for the final eight weeks" — rephrased in Phase copy work so
  "check-ins" cannot read as the app's check-in.

### 13. Borderline jargon ruled on now (Phase 18 forward-rulings)

- **"hypertrophy"** (`volumeInsightCopy:25`, WorkoutSummary muscle
  rows) → **"muscle growth"** (matches the blocklist's sanctioned
  plain-English style).
- **"minimum effective volume"** spelled out (`volumeInsightCopy:26,
  :27`) → plain phrasing ("the minimum that keeps this muscle
  growing"), consistent with the heatmap tooltip's unnamed-landmark
  style ("the least amount needed to maintain or grow").
- **"1RM"**: not added to JARGON_PATTERNS (would false-positive the
  internal record-type discussions in dev-facing strings is moot —
  patterns only bind copy; the real reason: the only leak is the coach
  report heading, fixed directly; "Est. max" carries the concept).
  Recorded as considered-and-declined.

---

## Sequencing note

Fixes land phase-by-phase (most in a dedicated canon-application pass;
calm/ED-adjacent strings — the BodyMetrics gate title, anything inside
suppression branches — are LEAD-edited hands-on per the operating
model). Every renamed string keeps its surface's existing test pins
updated in the same commit, and the jargon-blocklist additions land with
their new test cases.
