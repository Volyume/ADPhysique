# CC25 — Consolidated evidence map (§8 of the cost-governance order)

_One page per domain: the decision-bearing facts, with pointers into the
full evidence (audits/, research/). This is a digest; the reports are the
record. All facts verified against the 149d140 code tree._

## 1. Onboarding / plan generation (AUDIT-A)
- Gate order: auth → Article 9 consent (fail-closed for new users) → tier
  branch. Free onboarding persists ONLY units + optional name; free-starter
  answers are discarded. Pro collects the full profile into an AsyncStorage
  blob with no history and only 10 fields timestamp-tracked; generator
  inputs do not sync — a fresh device regenerates on defaults (full_gym, 4
  days). ⇒ capability data must be its own synced table, never the blob.
- Generation consults C31 intent via a pre-engine library filter with a
  machine-readable drop report and a post-engine name re-check; blocked
  slots are reported; all-blocked aborts. Equipment is the single hard
  filter (filterPool), applied before every never-starve fallback. The
  never-starve fallbacks are exactly where preferences get overridden ⇒ a
  capability filter must join the HARD class (pre-engine + resolveSeed),
  never the preference gates.
- Plan library: 31 plans, tag-string browse, no capability metadata, no
  structured progression; installation drops tags/split/difficulty and
  bypasses every filter; only one of three install paths surfaces (id-level
  only) conflicts. Library + generated plans share one storage model.
- Six-value equipment enum is the only capability-adjacent axis and
  conflates "my gym has" with "I can use". `buildWhyThis` claims "safe to
  perform" on equipment evidence alone.
- Sex/height/age gates hard (founder law); onboarding steps are pinned by
  step-count guards — adding a capability step touches TOTAL_STEPS etc.

## 2. Exercise library (AUDIT-B)
- 552 built-ins. 100%: muscle, equipment, movementPattern, rep ranges,
  SFR/fatigue, load_semantics. subregion 72.6% with five muscles at 0%.
  Position/floor/grip/axial/balance/overhead: NOT expressible (overhead
  partial via 2 muscles' subregion wording; laterality is name-regex).
- Custom exercises: two creation paths (6-field modal; name-only CSV
  import), never get derived metadata, equipment case-mismatch silently
  costs swap scoring; local custom_exercises table is orphaned (real store
  is exercises.is_custom=1). Sync overwrites deliberately-null SFR/fatigue
  with guessed defaults (contradicts creation-form design comment).
- C32 backfill is the worked template for metadata derivation.

## 3. Constraints / intent / swaps (AUDIT-C)
- exercise_intent: 3 kinds × (exercise | family:) targets; UNIQUE(user,
  target) upsert DESTROYS prior state — no interval substrate; kind
  conflates duration with meaning; dislike and cannot-perform are
  byte-identical; reason column never written; expiry lazily tombstones
  (sweep stamps fresh updated_at — a cross-device clobber hazard).
- Family vocabulary ≠ demand ontology; four vocabularies coexist; 143/551
  rows have no family; 5 muscles can never be pattern-avoided.
- No per-exercise allowance under a family block. Three id-level-blind
  readers (plan-copy conflicts, blockAdvisor, picker badge); Recent rail
  bypasses ALL filters. constraintsUnavailable unread on generation.
- A pain swap records nothing about pain; the painful exercise gains no
  negative signal; the SUBSTITUTE gains durable positive preference.
- C31 landed with zero behavioural tests (spec's test section undelivered).
- slotVerdict reserves JOINT_DISCOMFORT at precedence 2 — dead branch, no
  writer. isEligibleExercise is the senior question with a superset
  property: a third layer added inside it upgrades every caller.

## 4. Workout evidence / recovery (AUDIT-D)
- No per-set RIR/effort (settled-removed); session-level difficulty/pump/
  joint(0-3)/fatigue + weekly joint yes/no; NO body region/side anywhere.
  Session joint value fans out to every muscle trained (worst
  cross-contamination path) and even to every muscle with weekly volume.
- Per-side: legacy columns unwritten; D54 REVERSED per-side rep divergence
  as ED-adverse (guard-pinned) — collides with amendment FD-1's unilateral
  logging line; capability-asymmetry vs effort-asymmetry must be separated.
- Deviation provenance ≈ nil (targets-on-set vs actuals; swap row without
  reason; two-value session resolution). Exercise REMOVAL leaves no trace
  and suppresses ended-early detection → false COMPLETED.
- NO incremental accumulator in the domain — recovery/readiness/
  prescription all recompute from raw rows; the C20 resolver has an
  explicit comparability stage (the natural eligibility insertion point)
  and 135 passing tests; provenance line in the logger card was RETIRED by
  founder device order (status strip is the sanctioned notice surface).
- Cloud restore rewrites workout_sets.created_at → interval joins must key
  on workouts.started_at.

## 5. Progression / volume / learning (AUDIT-E)
- Two divergent landmark resolvers (display vs seed); learned band absent
  from display chain; adapted absent from seed chain.
- Block ledger is FROZEN at computation; learnedRange replays only
  ledgers ⇒ eligibility must be decided at GATHER time and stored per
  entry. Per-entry `suppressed` (ED/calm; fail-CLOSED read) is the
  existing representativeness analogue; suppression today is global, not
  per-muscle.
- Q5 walk: NINE absorption paths make six constrained weeks the durable
  baseline (ledger verdict → learned ceiling down + establishedStart
  reduced + structure memory "split doesn't work" + next-block seed +
  planned volume). No capability-shaped gate exists. Adapted landmarks
  self-heal (~8 sessions); live prescription is NOT contaminated (45-day
  window + first-time band = conservative return, ready-made).
- Effective-maintenance memo = residual + revalidation-marker-on-context-
  change pattern — the repo's own precedent for temporary→durable
  transitions.
- PRE-EXISTING DEFECT recorded for the founder: adaptive-landmark
  `weeklyVolume` is a PER-SESSION count that becomes adapted MAV
  (database.js:6614 → algorithms.js:1050); untested. Not fixed by CC25
  (mention-don't-fix rule).

## 6. Coach / precedence (AUDIT-F)
- NO per-muscle/per-exercise channel into the weekly coach; check-in
  soreMuscles collected then unread (reaches engine only as prose regex).
  Joint-pain answer degrades the whole week (data_hold / confidence drop /
  self-generated duplicate "injury" flag from the app's own sentence).
- Intervention ladder order matches spec but no rung drives a decision;
  the neverClaim anti-causal list is INERT (no production caller).
- Q5 walk A: restricted shoulder week → limiter PLAN → +1 set to EVERY
  muscle, auto-applied under Coached autonomy. Walk B: EXECUTION is
  structurally blind to missed sets (sessions only).
- Training decline path doesn't exist (nutrition-only decline writer).
- Reusable: fact vocabulary with scope + provenance; intent channel
  outranks inference; withhold-only gate with safety override; per-kind
  OBSERVE windows defined with no writer; computeDeloadVolume already
  writes per-muscle numbers. C21 graph docs have +27..+42 line drift.

## 7. Adherence / session resolution (AUDIT-G)
- session_resolutions: TWO values, no reason (deliberate, stated twice in
  code); COMPLETED derived, never stored; derived-id + refuse-stale
  trigger = cross-device convergence pattern.
- Misclassification map C1-C17: ended-early = total no-show in weekly
  ratio; removal = false COMPLETED; Time Crunch is forgiven while physical
  restriction is not (the `_timeCrunchSkipped` pattern is the in-memory
  precedent for capability omission — but durable); <0.5 adherence locks
  out ALL coaching incl. nutrition; nine directive copy strings; partner
  signal exports weekMet:false; interBlock 0.6 floor voids a restricted
  muscle's learning as "adherence"; planned denominator is plan-wide and
  week-blind (no effective-prescription concept).
- streak/insights constructs retired; executionSummary honest counts
  computed and unread.

## 8. Data / sync (direct reads + A/C/D/E/G sync sections)
- Registry: adding a synced table = registry row {table, pk (composite
  ok), conflictStrategy lww|server_wins|merge, softDelete, direction} +
  tables/ module (push batches of 200, pull strictly-newer LWW) + cloud
  refuse-stale trigger. weekly_checkins is the worked example; 16/17
  evidence families still on legacy sync.js.
- LWW is per-row on updated_at (merge is profiles-only). Soft-delete
  tombstones propagate as UPDATE, 30-day server purge.
- campaign15.stateContract.test fails when a new synced table is
  unclassified. adaptation_events reshapes through cloud (event_type/
  payload). Sets have no tombstones (hard delete + queued cloud op).
- Interval-shaped state exists nowhere yet; nearest: PATTERN_AVOID expiry
  (read-time sweep hazard noted), consent_log (append, composite PK),
  session_resolutions (derived id).

## 9. Privacy / consent (R1 + direct reads)
- User-declared functional limitation data = Art 9 on both UK and EU
  readings (CJEU C-21/23 "capable of revealing"; ICO intent test met by
  the product's purpose). The EXISTENCE of a restriction (bool, telemetry
  event with user id) is likely Art 9. Clinician-reported = highest
  sensitivity. Preference kept structurally separate stays ordinary data —
  merged C31 rows likely already inherit Art 9 (L3).
- Current consent (CONSENT_VERSION 2026-08-10) enumerates categories;
  capability data is NOT among them ⇒ new granular consent + notice.
  Existing gate is all-or-nothing, withdrawal = account closure ⇒
  bundling capability into it risks freely-given failure (L5) and clashes
  with FD-1. Cloud record_health_consent RPC + consent_log (migrate_019/
  024) is the pattern; pendingConsent handles round-trip failure.
- Append-only history has NO Art 17(3) exemption; erasure must reach the
  timeline AND derivatives (effective plans, eligibility markers). DPIA
  required before launch. Equality Act reasonable-adjustments duty is
  anticipatory (supports FD-1); s.20(7) no-charging line needs counsel.

## 10. Medical-device boundary (R2)
- Intended purpose = claims/copy, not code. Exclude/substitute/reduce/
  reintroduce are LOW risk framed as user-directed programme
  construction. Two NEEDS-REVIEW items: symptom-pattern discovery prompts
  (LR-1; MDCG depression-example pattern) and population-LABELLED routines
  (LR-3; compensation limb). Never: predict tolerability, rank health
  likelihoods, name conditions in copy/store listing, "rehabilitation/
  therapy/manage [condition]" vocabulary (blacklist sourced from MHRA).
  Red-flag refusal + signposting without severity grading is the safe
  pattern. Anything that ever crosses must be a separable module (E11).

## 11. Training science (R3)
- No decay coefficients, no regain multipliers, no re-entry formulas; the
  local-restriction re-entry case is UNSTUDIED — conservative,
  performance-led (autoregulated) re-entry is professional practice; the
  C20 resolver's first-time/45-day semantics already implement the
  defensible shape. Intensity is the variable to protect when volume is
  cut; retention windows are months, not weeks (calm copy grounding).
- Unilateral training is first-class, not degraded (Kassiano 2025). No
  per-side arithmetic conversions; no symmetry targets; no cross-education
  claims (CR-9/10). No numeric pain thresholds or symptom-keyed
  progression gates (CR-1..8): reintroduction must be user-directed.
- Maintenance-dose literature supports "reduced-but-not-zero is
  materially different from none" but has no per-muscle-under-restriction
  numbers.

## 12. Populations (R5) + competitors (R6) + accessibility (R4)
- Layer-2 curated population routines plausibly supportable ONLY for
  chronic SCI, MS, Parkinson's (with dossiers + LR-3 regulatory review);
  everywhere else capability-led is the defensible approach; parameters
  do not template (three independent reviews converge). 12-item clinical
  register incl. the unresolved wheelchair-shoulder loading question.
- Market: NO plan-generating competitor has a persistent capability
  profile; seated/no-floor GENERATION absent industry-wide; adaptive-app
  space thin and partly trust-damaging; credible disability claims always
  carry a named adaptive-athlete credential; reintroduction is a binary
  toggle everywhere; no flare-mode exists anywhere.
- A11y: WCAG 2.2 dragging/target-size/redundant-entry bear on the logger;
  iOS lacks live regions (per-platform timer announcements); RN FlatList/
  Modal focus issues documented; EAA scope for the IAP flow = legal
  review. Repo has 1,564 accessibilityLabel sites (real base, unaudited
  per-screen); rest timer has sound + haptics + visual channels.

## Gap classification outcome (§9)
All ARCHITECTURE-BLOCKING gaps are now closed by banked reports plus the
direct reads above. Remaining unknowns are IMPLEMENTATION-BLOCKING-LATER
(per-screen a11y audit; export/delete coverage tables; nutrition-domain
detail; live-DB verification) or NON-BLOCKING (production data volumes),
and are listed in STATUS-LEDGER.md. Zero pre-synthesis subagents used.
