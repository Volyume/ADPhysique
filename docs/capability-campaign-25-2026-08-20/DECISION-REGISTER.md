# CC25 DECISION REGISTER

Categories per the founder brief §32. CAP-1..22 (product laws) live in
ARCHITECTURE.md §3 and are not restated. Evidence citations are to the
banked audits/research.

## A. CONFIRMED CURRENT FACTS (load-bearing; full detail in the audits)

- CF-1 Constraint handling today = C31 PATTERN_AVOID (merged
  preference/capability, no history, no reasons) + a six-value
  equipment enum; no capability concept exists anywhere (A/C).
- CF-2 Generation already runs a hard pre-engine filter with drop
  reports and a post-engine re-check; blocked slots are reported (A).
- CF-3 The block ledger is frozen at computation; learned volume
  replays ledgers only; per-entry suppression exists (ED/calm,
  fail-closed) but is global-per-user and blocks upward only (E).
- CF-4 Six constrained weeks become durable baseline through nine
  absorption paths with no capability-shaped gate (E §Q5).
- CF-5 The C20 resolver is pure, recomputed, and already conservative
  for returning movements (45-day window, first-time band) (D/E).
- CF-6 No incremental accumulator exists in the workout/recovery
  domain; the frozen ledger and a few durable memos are the only
  non-recomputed learning state (D §Q4, E §Q1).
- CF-7 Session joint discomfort is un-localised and fanned across all
  muscles trained; no body-region or side signal exists anywhere (D).
- CF-8 Adherence denominators are plan-wide and effective-blind;
  removal of an exercise mid-session yields a false COMPLETED;
  Time Crunch has first-class forgiveness, physical restriction has
  none (G C1-C4).
- CF-9 The weekly coach has no per-muscle channel; a restricted week
  can classify PLAN and auto-apply +1 set everywhere (F #1/#6).
- CF-10 Sync: registry engine exists with a one-row-plus-module
  contract and refuse-stale triggers; most evidence tables remain on
  legacy sync (map §8).
- CF-11 Free tier persists no capability-relevant state at all; all 18
  withProGuard screens are nutrition/coaching (A; J-1 grep).
- CF-12 Legally: user-declared functional limitations are Article 9
  data on both UK and EU readings; the existing consent does not cover
  them; the existing gate's withdrawal closes the account (R1).
- CF-13 Regulatorily: framing/claims decide qualification; the
  discomfort-discovery prompt and population-labelled routines are the
  two NEEDS-REVIEW features (R2).
- CF-14 Scientifically: no decay/regain/re-entry formulas exist to
  borrow; local-restriction re-entry is unstudied; unilateral training
  is first-class; parameters do not template across populations
  (R3/R5).
- CF-15 Market: no plan-generating competitor has a persistent
  capability profile; seated/no-floor generation is absent
  industry-wide (R6).

### Pre-existing defects found (recorded for the founder; NOT fixed by
CC25 — mention-don't-fix rule; each is queued as a board note):
- PD-1 Adapted-landmark `weeklyVolume` is a per-session count that
  becomes adapted MAV (database.js:6614 → algorithms.js:1050); no test
  pins the unit (E §P1).
- PD-2 The Engine Log renders "Rotating to a lower-risk exercise next
  session" but no code performs any rotation (D §C-6).
- PD-3 The coach's own generated check-in sentence re-parses as an
  injury flag (double signal) (F #3).
- PD-4 The anti-causal `neverClaim` list is inert (no production
  caller) (F #4).
- PD-5 `sleep_quality`/`energy_score` push but never pull
  (cross-device loss) (D §P-5).
- PD-6 Cloud restore rewrites workout_sets.created_at (chronology loss
  for PR path) (D §P-4).
- PD-7 check-in soreMuscles is collected and never read by the engine
  except as prose regex (F #2).
- PD-8 Custom-exercise sync overwrites deliberately-null SFR/fatigue
  with guessed defaults (B).
- PD-9 C31 shipped with zero behavioural tests (spec's test section
  undelivered) (C §8.2) — paid down in CC27.

## CC27 IMPLEMENTATION RULINGS (2026-08-20, lead-ruled under D33)

- CC27-R1 The senior question composes capability by RIDING the intent
  state object (state.capability), so all 16 existing callers inherit it
  with zero signature changes; the CAP-4 guard was revised from a
  no-mention pin to a DATA-REACH pin (storage/consent unreachable from
  the preference lane; pure question modules importable).
- CC27-R2 The section 8.4 single-axis ask renders one optional question
  per CONSTRAINED axis; enum axes ask their full closed enum so a "no"
  answer is expressible without guessing (BD-D1).
- CC27-R3 Q3 gate truth at CC27: 49/551 seed rows are Q3-compatible; the
  written core is fully compatible and every shortfall is reported
  (blocked/missed/thin/near-miss). CC28 curated families widen the core.
- CC27-R4 BD-1 (new defect, fixed): the cloud-pull exercise applier's
  INSERT OR REPLACE wiped unlisted metadata columns on every pulled row;
  now an UPSERT preserving unlisted columns with COALESCE on nullable
  metadata. PD-8 fixed both directions in the same applier.
- CC27-R5 Custom creation derives EQUIPMENT metadata (Audit B-reliable
  derivations) so section 34.1 parity is reachable; demand axes on
  customs stay asked-only (CAP-8). Existing customs backfilled in the
  same unreleased migration.

## B. ARCHITECTURAL DECISIONS (CC-D)

- CC-D1 One constraint entity with a role axis (baseline|episode);
  no separate profile/restriction tables. (H1 confirmed.)
- CC-D2 Representativeness keys on role × affectedness; the learning
  matrix needs no finer grain. (H2 confirmed.)
- CC-D3 Capability profile is a derived view, never a stored
  aggregate.
- CC-D4 Preference stays in exercise_intent untouched; capability is a
  new store; structural separation is the Article 9 wall. (R1 #8.)
- CC-D5 Effective prescription = existing resolution pipeline + one
  senior stage + a per-session effects record; no overlay store, no
  plan rewriting.
- CC-D6 Provenance: interval join at read time keyed on
  workouts.started_at; no per-set context tags.
- CC-D7 Frozen-ledger eligibility is stamped at gather time, per
  muscle, blocking BOTH directions (teach-nothing semantics).
- CC-D8 Demand ontology: nine closed axes, tri-state, materialised at
  seed time; families remain a separate stimulus taxonomy.
- CC-D9 SUPERSEDED by the revision round (ARCHITECTURE §6.2 as
  revised): no share threshold — episode-affected sessions are excluded
  per session via the existing deload-exclusion machinery and the
  existing sufficiency gates decide INSUFFICIENT_DATA; entry
  eligibility is the tri-state normal/constrained/unknown with absent
  = legacy-normal.
- CC-D10 Capability reads fail CLOSED at suggestion surfaces (explicit
  user choice to continue unfiltered); logging never blocked.
  Sharpens C31's D109-2 for the inverted harm direction.
- CC-D11 Allowances carve self-declared and unknown blocks, never
  clinician-reported ones (edit-the-restriction flow instead).
- CC-D12 A first-class CONSTRAINED limiter enters the coach; affected
  muscles hold, unaffected muscles coach normally.
- CC-D13 v1 stores no free text and no diagnoses; structured cards
  only. (R1 L18; determinism.)
- CC-D14 Adherence denominators read the effective prescription;
  session_resolutions keeps its two-value, reason-free contract.
- CC-D15 Reintroduction = eligibility restore + resolver first-time
  semantics + bounded volume ramp toward the protected baseline; an RI
  window extends teaching-hold.
- CC-D16 Promotion is forward-only; no retrospective evidence
  promotion.
- CC-D17 Ledger `eligibility` is the one recompute-exempt-exempt field
  (provenance, not judgement): backfill may restamp it when backdated
  constraint rows arrive.
- CC-D18 Capability consent is separate and granular; withdrawal
  disables + erases the lane without closing the account.
- CC-D19 New tables sync via the registry engine (not legacy sync.js).
- CC-D20 Workstream numbering namespaced CC25+ (global board already
  at 33).
- CC-D21 Capability joins the HARD filter class (pre-engine +
  post-engine + senior question), above every never-starve gate.
- CC-D22 No per-user capability telemetry; aggregate counters only.
- CC-D23 Layer-2 population-labelled content: candidates limited to
  chronic SCI, MS, Parkinson's; each gated on an evidence dossier AND
  regulatory review (LR-3) AND validation; everything else ships
  capability-led. (R5 verdicts; R2 E8.)
- CC-D24 Observed-discomfort discovery prompts are NOT in v1: R2 LR-1
  rates the pattern NEEDS-REVIEW, and today's signal is un-localised
  session-level (CF-7), too weak to prompt on honestly. Revisit
  condition: regulatory clearance + a localised signal existing.
  (Determination made, not parked.)
- CC-D25 The "safe to perform" generation claim is corrected to honest
  equipment/capability copy in CC27 (CAP-18).
- CC-D26 (checkpoint 2026-08-20) Custom-exercise parity: metadata
  sufficiency, never `is_custom`, gates every automatic capability
  seam for the owner; generation's categorical isCustom skip is
  replaced by the same pool-entry requirements as built-ins, owner-
  scoped (ARCHITECTURE §34.1; CC27).
- CC-D27 (CC26 lead ruling, D33, 2026-08-20) The CC26 settings surface
  ships the ADD flow for `demand` rules only; `family`, `exercise` and
  `exercise_allow` add UIs land in CC27 with the selection work. Not an
  effort call: the four rule_kinds are fully supported end to end in
  CC26 (schema, model, validation, store, sync, lifecycle, erasure —
  a synced or promoted row of any kind round-trips and lists
  correctly); only the authoring UI is sequenced. Rationale: family/
  exercise pickers must present exactly the ontology the CC27
  eligibility resolver consumes — including the CC-D26 custom-parity
  metadata and the CC27 ontology backfill — or rules authored now
  could bind to pre-backfill metadata and mean something different
  once the resolver lands. The 9-axis demand vocabulary is frozen in
  ARCHITECTURE §8, so demand authoring carries no divergence risk and
  ships now. Revisit trigger: CC27's picker work must add the three
  add surfaces in its own gate list.

## C. REJECTED IDEAS (CC-R) — from the brief's candidate list and prior models

- CC-R1 "Volume debt" / catch-up repayment — rejected (CAP-10).
- CC-R2 Global Baseline/Constrained tag on every set — rejected
  (CC-D6; D54-adjacent surface, denormalisation, erasure burden).
- CC-R3 Fixed 50-70% reintroduction load caps and any detraining-decay
  formula — rejected (R3: no evidence basis; resolver semantics
  suffice).
- CC-R4 Free-text-first onboarding — rejected for v1 (CC-D13).
- CC-R5 Automatic contralateral / cross-education prescription and
  automatic isometric/limited-ROM "rehab" substitutions — rejected
  as app logic; clinical territory (R3 CR-9; boundary CAP-22).
- CC-R6 Separate PR universes per capability state — rejected
  (CAP-14; contextual annotation suffices).
- CC-R7 "Unknown = requires full capability" as a universal rule —
  modified-rejected: unknown blocks AUTO-suggestion only (CAP-8);
  manual use always survives.
- CC-R8 Additional ontology axes (breathing/IAP, neuromuscular,
  vestibular, per-joint ROM degrees, eccentric demand) — rejected: no
  deterministic consumer; clinical drift.
- CC-R9 Multi-stage recovery state machines (PROTECT→MODIFIED→
  IMPROVING…) as product states — rejected: symptom-tracked phases
  the evidence says not to automate; the honest machine is
  active/awaiting/ended + RI window.
- CC-R10 Retrospective promotion of episode evidence at
  promote-to-baseline — rejected (E's frozen/monotone folds make it
  unsound; mixed-severity periods).
- CC-R11 Hiding every incompatible exercise from all UI — rejected
  (CAP-6; browse shows state).
- CC-R12 Compulsory metadata for custom exercises — rejected
  (progressive single-axis ask only).
- CC-R13 Treating user-entered clinician restrictions as verified
  clinician data — rejected: source is labelled `clinician_reported`,
  copy always says "you've told Volyume your clinician…".
- CC-R14 Condition-specific programming (pregnancy, post-op,
  neurological rehab) in the generic engine — rejected; "unsupported
  for automatic adaptation" is a valid honest state (brief).
- CC-R15 An overlay STORE for temporary plans — rejected (CC-D5).
- CC-R16 One generic "adaptive workout" — rejected (Amendment §4;
  families are capability-led).
- CC-R17 Sided muscle-volume keys for one-side users (RT2-15) —
  rejected as disproportionate; unsided per-muscle volume is
  internally consistent; documented limitation with a
  revisit-on-evidence trigger.
- CC-R18 Graded ROM / pain-range axes (RT2-5) — re-affirmed rejected;
  partial capability is expressed at exercise grain (exclusions +
  allowances), stated in onboarding copy.
- CC-R20 (checkpoint 2026-08-20) A third "operating point / variance
  band" primitive — rejected; baseline+episode with role-scoped UX
  already represents transient departures without injury framing
  (ARCHITECTURE §34.2).
- CC-R21 (checkpoint) Strap/hook and prosthetic/orthotic interface
  fields — rejected; allowances + custom parity cover the decisions;
  DEF-3 stands (ARCHITECTURE §34.3).
- CC-R19 Energy/pacing computation (RT2-4) — rejected as app logic
  (CLIN-5..7); the population is served by session-length/days levers
  (session length becomes free-editable), short-session families, and
  the episode machinery.

## D. ACCEPTED/MODIFIED PRIOR-MODEL IDEAS (disposition of the brief's list)

Accepted: effective prescription (as resolution layer); explicit
promotion; choice-aware learning (cause + eligibility); constraint-aware
soft volume targets; no-suitable-exercise state; chronic baseline+flare;
concise conditional check-in; contextual PR interpretation; custom
exercise compatibility (progressive); typed resolver; Apply/Decline
diffs; accessibility work (feature-path now, full audit as its own
campaign).
Modified: durable versioned capability profile (→ derived view over
versioned rows); constraint overlay (→ resolution stage + effects
record); reintroduction-as-experiment (→ conservative subset;
symptom-gated experiment to clinical review); unilateral progression
(→ selection-level v1; per-side logging not reopened, see CC-F2);
one-tap flare (→ re-start-from-history affordance with explicit state).

### Red-team adjudication record (2026-08-20)
RT1: 13 attacks — 11 accepted, 2 partial (RT1-8 documented behaviour;
RT1-5 superseded CC-D9). RT2: 17 attacks — 13 accepted (several as
copy/scope amendments), 2 partial (RT2-5, RT2-17), 2 rejected/flagged
(RT2-15 → CC-R17; RT2-7 → CC-F8). Lead self-attacks S1-S14 folded in
(S2=RT1-7, S3→CC-D9 supersession, S6=RT1-11, S8=RT1-2, S13 tri-state,
S14 effects-precedence; the rest were covered by the inline design or
the amendments). Every accepted item is a BINDING amendment in
ARCHITECTURE §33 or an inline REVISED block; nothing was resolved by
prose alone.

RT-BUNDLE (2026-08-20, implementation red team over the combined
CC27-CC29 diff; ONE Sonnet, bundle-end): 13 attack classes, 9 held
clean, 4 BREAKs — all four accepted and fixed (lead-ruled under D33,
mechanisms verified in source before fixing): RT-F1 three ungated
generateAndSavePlan surfaces + a capability-blind picker notice
(section 9.6 gates + consent-gated notice); RT-F2 the free starter's
silent full-pool fallback (honest caveat + explicit pre-activation
choice); RT-F3 the conflict sheet's "Keep it in this plan" on
clinician rows (CAP-7 — replaced by "Update restriction" routing to
How you train); RT-F4 completion effects excusing declined/undecided
rules (excusal now requires the applied choice on every driving rule).
Each fix is pinned; the full adjudication with mechanisms is in
CC27-29-BUNDLE-TRACKER.md.

## E. DEFERRED (recorded, not parked — each carries its revisit trigger)

- DEF-1 Clinician/coach shared views (multiplayer) — revisit on
  founder demand; architecture keeps the capability module separable
  (R2 E11) so an interface boundary exists.
- DEF-2 Assisted free-text capability entry (deterministic
  confirmation required) — revisit after v1 telemetry-free usage
  evidence and R1 L18 counsel.
- DEF-3 Alternative-implement grip guidance (straps/hooks) — revisit
  with the grip-limited routine family content work.
- DEF-4 Wearable/health-provider signals into capability context —
  out of scope by brief.
- DEF-5 Observed-discomfort discovery (CC-D24's revisit condition).
- DEF-6 Per-side capacity logging (pends CC-F2 founder answer).

## F. CLINICAL REVIEW REQUIRED (consolidated; full registers in R3 §7 and R5)

- CLIN-1 Any numeric pain threshold / pain-monitoring arithmetic /
  symptom-keyed progression gate (R3 CR-1..4).
- CLIN-2 Deterioration-vs-improvement weighting beyond
  hold-vs-escalate copy in the weekly conditional question (§19).
- CLIN-3 Reintroduction-as-experiment gates (entry/success/regression
  criteria) (R3 CR-8).
- CLIN-4 Red-flag trigger vocabulary and escalation copy (§25).
- CLIN-5 Population dossier content for SCI/MS/Parkinson's incl. the
  SCI autonomic/skin/thermoregulation notes and the unresolved
  manual-wheelchair shoulder-loading question (R5 register).
- CLIN-6 Any cross-education or contralateral guidance (R3 CR-9).
- CLIN-7 Pacing/flare programming beyond respecting declared
  restrictions (R3 CR-5..7).

## G. LEGAL / PRIVACY REVIEW REQUIRED (consolidated; full registers in R1 and R2)

- LEG-1..20 = R1's L1-L20 (classification, consent granularity,
  minimisation, erasure of the timeline and derivatives, telemetry,
  DPIA, Equality Act boundary, EAA, third-party data…).
- LEG-21..28 = R2's LR-1-LR-8 (discovery prompt, reintroduction
  framing, population labelling, diagnosis storage, marketing gate
  sign-off, ED-subsystem documentation, MHRA guidance version, NI).
- LEG-29 = R4's EAA/EN 301 549 scope for the IAP flow.

## H. FOUNDER / BUSINESS DECISIONS REQUIRED

- CC-F1 Engage counsel for the LEG register + commission the DPIA
  before the first capability release (the architecture assumes the
  conservative posture meanwhile — building is not blocked).
- CC-F2 Per-side capacity logging for declared one-side users would
  reopen D54 (reversed as ED-adverse). RECOMMENDATION: do not reopen;
  unilateral exercise variants + per_hand semantics serve the need.
  Decision requested because it amends a founder reversal.
- CC-F3 Layer-2 population content go/no-go per population after
  dossier + CLIN-5 + LEG-23 complete. RECOMMENDATION: sequence after
  the capability core ships; start with SCI.
- CC-F4 Marketing: credible disability claims industry-wide carry a
  named adaptive-athlete credential (R6 #9). Partnership/ambassador
  strategy is a business call; the readiness gate (ROADMAP) blocks
  claims regardless until validation passes.
- CC-F5 Disabled-user validation recruitment (cohorts in ROADMAP) —
  founder-side operational commitment; claims stay blocked without it.
- CC-F6 Clinical reviewer engagement for the CLIN register.
- CC-F7 Cloud migrations for the new tables apply only on the standing
  "run against production" phrase, per supabase/README process.
- CC-F8 (from RT2-7) Should constrained-profile FREE users get a
  bounded generation path when no library family fits their
  constraint combination? RECOMMENDATION: not in v1 — capability-aware
  library + builder cover the free tier with parity (FD-1's own
  wording); revisit with CC28's coverage data. Surfaced because tier
  boundaries are founder-gated.

## GAP-CLOSURE RULINGS (2026-08-21, lead-ruled under D33; authority = founder gap-closure order, banked as GAP-CLOSURE-ORDER-2026-08-21.md)

- GC-D1 The condition/injury directory selection is a STATELESS
  question-selection lens: choosing a profile in the discovery UX
  pre-selects which functional cards/questions are shown and surfaces
  education, and NOTHING but the confirmed functional constraint rows
  ever persists. No condition id, no diagnosis, no context_ref column.
  Rationale: every deterministic behaviour the order names (question
  selection, eligibility, explanation, education, collection pointers,
  check-in relevance) is derivable from functional state + the
  ephemeral lens; persistent condition storage would add
  maximal-sensitivity Article 9 surface with NO deterministic consumer
  (the CC-R8 test) - CAP-18 already bans condition names in
  explanations, and affected scope/check-in relevance derive from the
  functional rules. CAP-3's storage posture stands intact; LEG-24
  (diagnosis storage) stays moot. Revisit trigger: a future consumer
  that genuinely needs persistent context lands behind counsel review
  (R1 L18) + a dedicated consent line, as a founder decision.
- GC-D2 The directories are DETERMINISTIC KNOWLEDGE MODULES in source
  (`src/lib/capability/directory/`): structured data + pure accessors,
  schema-validated by tests, versioned by review date; human-facing
  dossiers live in docs/ and embed the same ids. They feed question
  selection, discovery UX, collections and the coverage registry; they
  NEVER feed eligibility, learning, or the coach (function-first,
  order section 5; CC-R14 stays closed).
- GC-D3 Phase C re-runs CC-R8's "no deterministic consumer" test per
  candidate ontology axis against the NEW consumer class (injury/
  condition movement-path questions). Axes that pass gain columns;
  axes that fail stay rejected with the failure recorded.
- GC-D4 Directory wording law: the condition/injury directory is a NEW
  user-initiated, non-promotional surface class where condition NAMES
  are permitted (they are its purpose, order section 25), while
  function/benefit/treatment vocabulary stays banned (treat, cure,
  heal, rehabilitate, therapy, safe-for, reduces pain, prevents,
  clinically proven, symptom-monitoring language, flare). Mechanically:
  r2Wording.js splits into R2_FUNCTION_TERMS + R2_CONDITION_NAME_TERMS
  with R2_BLACKLIST preserved as their union (existing sweep/guard
  consumers unchanged); the directory schema validator enforces
  R2_FUNCTION_TERMS over every user-facing directory string. Exercise/
  plan/library text keeps the FULL blacklist (condition names stay
  banned there). Marketing keeps POPULATION_CLAIM_TERMS + the all-NO
  matrix. New register row LEG-30: counsel to confirm the directory
  surface's wording posture (extends LR-3/LEG-23); conservative posture
  in force meanwhile, building not blocked (CC-F1 pattern).
- GC-D5 Layer-2 shipping shape: dossiers are BUILT now (machine-readable
  docs) for the R5-supported candidates; in-app, condition profiles
  point to capability-led routine FAMILIES via functional framing
  (discovery metadata, 33.20); condition-NAMED collection labels stay
  OFF pending LEG-23 + CLIN-5 (the order bans medical claims and keeps
  legal/clinical stops; the SUBSTANCE ships, the label waits). A user
  searching a condition name finds the profile, its questions,
  education and fitting families - order section 25 satisfied without a
  condition-labelled programme claim.
