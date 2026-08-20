# CC26+ IMPLEMENTATION ROADMAP + AMENDMENT DELIVERABLES

Sequenced for dependency order, reviewability and no half-wired states
(brief's implementation laws). Every campaign follows AUDIT→DECIDE→
IMPLEMENT→TEST→ADVERSARIAL REVIEW→FIX→RE-TEST→DOCUMENT→MERGE-READY,
lands green (`npm run lint && npm test`) with lead review, merges to
main continually, ships a device checklist, and applies the
cost-governance tier law. Cloud migrations are written in-campaign and
applied only on the founder phrase (CC-F7).

## CC26 — Capability foundations (store, consent, settings)
- OBJECTIVE: the capability lane exists end to end and is inert until
  used. IN SCOPE: `capability_constraints` +
  `session_constraint_effects` schemas (local + cloud files), registry
  sync modules + refuse-stale triggers, stateContract classification,
  wipe/export/delete integration, the granular consent flow + records,
  the Movement & capability settings surface (list/add/end/history),
  episode state machine (§22) without plan integration, CAP-19 tier
  guard, CAP-4 lane source-guards, Sentry scrub allow-list. NON-GOALS:
  any selection behaviour change; onboarding.
- LAWS: CAP-3/4/14/17/19/20; state machine §22. DATA: 2 tables + RLS.
- TESTS: registry-contract suite, §28's A/B interval replay, state
  machine, consent record, erasure reach, guard tests. GATE: all green;
  a user can create/end/promote constraints that DO nothing yet
  (coherent inert infrastructure, explicitly allowed by the brief).
- ROLLBACK: tables empty = feature absent. RISK: low.

## CC27 — Selection integrity (the resolver everywhere)
- OBJECTIVE: no automatic surface ever suggests against capability.
- IN SCOPE: demand ontology columns + derivation script + curated
  backfill of the 552 rows (coverage report artefact); the §9 resolver;
  senior-question composition (all 16 isEligibleExercise callers + the
  three id-blind readers + the Recent rail); pre/post-engine wiring;
  picker/builder filter + §9.4 manual-conflict flows + allowances;
  no-compatible-option reporting; CAP-18 explanations incl. the CC-D25
  copy fix; CAP-17 fail-closed surfaces; C31 behavioural test debt
  (PD-9) paid at the touched call sites. NON-GOALS: plan diffs,
  adherence, learning.
- FILES: exercise/generation.js, intent.js callers, planAutoGen,
  ExercisePickerModal, seedExercises + exerciseMetadata, new
  capability/ module. TESTS: resolver purity/property suites, per-seam
  pins, ontology validation, coverage floor report. GATE: the Q3
  scenario from Audit A (cannot stand / no floor / no bar grip)
  generates a fully compatible plan or honest gaps, proven by fixture.

## CC28 — Inclusive onboarding + capability-aware library
- OBJECTIVE: day-one value for a new user with baseline constraints
  (Standard B's entry point). IN SCOPE: both onboarding paths (§11)
  incl. the consent moment and the Pro step-count guard updates;
  free-starter persistence into the store; capability-computed library
  compatibility + browse chips + install-time conflict/substitution
  flow (senior question — fixes A§11.8); curated capability-led
  routine family CONTENT v1 (families list below) with programme-quality
  validation (§Amendment 17 checks); coverage measurement tooling
  feeding the registry. NON-GOALS: population-labelled content
  (CC-F3 gate).
- GATE: onboarding walk fixtures for wheelchair-user, no-floor,
  one-arm, grip-limited scenarios produce compatible first plans;
  library families pass muscle-coverage thresholds; device checklist
  includes VoiceOver/TalkBack on the new surfaces.

## CC29 — Effective prescription + honest adherence
- OBJECTIVE: episodes alter sessions reversibly and adherence reads
  the effective prescription. IN SCOPE: §14 diff propose/apply/decline;
  effects records; logger surfaces (§17) incl. constraint-cause swaps
  and omission capture; §18 denominators (getWeeklySessionStats,
  interBlock adherence input, stabilise gate, directive copy sources,
  partner/widget inheritance). NON-GOALS: learning eligibility (next).
- GATE: G's C1-C4 misread walks re-run as fixtures and come out
  correct; ended-early/removal/omission semantics proven; no
  session_resolutions schema change.

## CC30 — Learning eligibility (the contamination shield)
- OBJECTIVE: CAP-12/13 mechanically true. IN SCOPE: affected-scope
  derivation; gather-time ledger eligibility + CC-D17 backfill
  restamp; learnedRange/establishedStart/structure/seed skips; adapted-
  landmark window exclusion; preference-evidence exclusion + contextual
  substitute ranking; plateau exclusion; slot-verdict capability
  reason. TESTS: the §31 contamination replay (Audit E §Q5 as a
  fixture) is THE gate; full matrix cell suite.
- GATE: six-week constrained fixture leaves every durable state
  untouched for affected muscles and normal for unaffected ones.

## CC31 — Coach, check-in and the return path
- OBJECTIVE: coaching stays sophisticated under constraint and the way
  back is calm. IN SCOPE: physicalConstraint context fact; CONSTRAINED
  limiter + per-muscle application + Apply-time re-check; conditional
  weekly question (§19); reintroduction (§23: ramp + RI window);
  promotion flow (§24); flare re-start affordance (§21); C21 oracle/
  graph extension + doc-drift refresh; PD-3 duplicate-signal fix (in
  lane here). NON-GOALS: any CLIN-gated behaviour.
- GATE: F's misread walks (restricted week → +1 everywhere) re-run
  correct; oracle suite extended and green; reintroduction fixture
  shows conservative loads + ramp + protected baseline targets.

## CC32 — Accessibility, observability, privacy hardening, readiness
- OBJECTIVE: Standard B operational readiness. IN SCOPE: feature-path
  accessibility completion + core-operation barrier fixes (R4 checklist
  applied; per-platform announcements; timer redundant cues; adjustable
  steppers; drag/long-press alternatives on the core path); §29
  aggregate observability; DPIA input pack + export/delete verification
  end-to-end; marketing-claims wording guard wired to the R2 blacklist;
  coverage registry + readiness matrix updates; disabled-user
  validation round 1 execution support (CC-F5) and issue-fixing; final
  adversarial hardening pass over the whole workstream.
- GATE: validation-round blockers fixed; matrix rows honestly updated;
  a11y checks automated where possible; full suite green.

A full per-screen app accessibility audit beyond the feature/core path
is registered as its own future campaign (out of this workstream's
boundary, per the brief).

---

## AMENDMENT DELIVERABLE 1 — Disability / capability support roadmap

| Capability profile | Current repo support | Missing (arch → content → validation) | Route |
|---|---|---|---|
| Seated / cannot stand | none (CF-1); exercise names only | ontology+resolver (CC27) → seated families (CC28) → cohort validation (CC32) | capability-led |
| No floor access | none | same chain | capability-led |
| One-arm / one-leg (limb difference) | laterality regex only | ontology bilateral axes (CC27) → unilateral families (CC28) → validation | capability-led |
| Grip-limited | none | grip axis (CC27) → pulling-alternatives collection (CC28) → DEF-3 implement guidance | capability-led |
| Balance-limited / support-needed | none | balance axis (CC27) → machine-supported families (CC28) → validation | capability-led |
| No overhead / no axial / no impact (long-term restrictions) | PATTERN_AVOID approximations | demand rules (CC26/27) | capability-led |
| Chronic fluctuating (MS-like, pain conditions) | none | episode+flare machinery (CC26/29/31) + fatigue-aware UX review (CLIN-7 boundary) | capability-led + education |
| SCI / MS / Parkinson's labelled content | none | ALL of the above + dossier + CLIN-5 + LEG-23 + CC-F3 | Layer-2, later |
| Sensory/motor/cognitive app-operation needs | 1,564 labels base, unaudited | CC32 feature/core path; full-app audit campaign later | accessibility, not routines |

## AMENDMENT DELIVERABLE 2 — Free routine library plan (v1 families)

Buildable from the existing 552-exercise library once demand metadata
lands (coverage-checked in CC28; a family ships only if its
muscle-coverage thresholds pass — Amendment §16):
seated-only full body · seated upper-body strength · no-floor full body
· machine-supported hypertrophy (beginner/intermediate) · unilateral
upper-body · unilateral lower-body · grip-limited pulling collection ·
balance-supported full body · low-equipment adapted strength
(dumbbell/band) · no-overhead upper split. Levels: beginner +
intermediate at v1; experienced tiers where coverage genuinely
supports them (no watered-down-only shelf — Amendment §15).
Discovery: computed compatibility chips + collections; families appear
in normal browse (no segregated shelf, Amendment §13); any compatible
plan remains available to everyone. Progression semantics ride the
existing description/notes convention v1 (structured progression is a
separate pre-existing gap, recorded).
Quality gate per family: Amendment §17 checklist (coverage, volume,
frequency, fatigue, equipment transitions, setup burden, session
duration) validated as a programme before listing.

## AMENDMENT DELIVERABLE 3 — Marketing readiness matrix (seed)

Rows = support-roadmap profiles; columns = Amendment §27's fifteen.
Status TODAY for every row: Onboarding RESEARCH → (CC28) · Plan gen
RESEARCH → (CC27) · Free routines RESEARCH → (CC28) · Builder RESEARCH
→ (CC27) · Exercise coverage MEASURED-IN-CC27 · Custom fallback
ARCHITECTURE SUPPORTED (CC27) · Logging SUPPORTED-today except effects
(CC29) · Progression/Learning ARCHITECTURE (CC30) · Coaching
ARCHITECTURE (CC31) · Temporary-limitation overlay ARCHITECTURE (CC29)
· Accessibility PARTIAL → (CC32) · Evidence dossier N/A except Layer-2
· Expert review OPEN (CLIN register) · User validation OPEN (CC-F5) ·
Marketing-safe **NO for every row** until all prior columns green.
The matrix is the artefact marketing consults; claims derive from
demonstrated coverage only (Amendment §10), enforced through the
marketing-claims-check skill with the R2 wording lists.

## AMENDMENT DELIVERABLE 4 — Disabled-user validation plan

- Cohorts (first wave): wheelchair users (non-SCI-specific), seated/
  balance-limited, upper-limb difference, grip/dexterity-limited,
  no-floor, chronic fluctuating; assistive-tech users (VoiceOver/
  TalkBack, Switch Access) overlapping the above. Later waves add
  low-vision, hearing (timer/media), cognitive-accessibility needs.
- Recruitment: founder-side via community organisations (CC-F5;
  R6's credibility finding argues for named-partner involvement,
  CC-F4).
- Tasks (per Amendment §28): onboarding with constraints → first plan
  → routine browse/install → full workout log incl. swap + blocked
  exercise + rest timer → custom exercise creation → capability edit →
  add temporary restriction on top → weekly review → (AT cohorts) the
  same via screen reader/switch.
- Measures: task completion without assistance; misclassification
  incidents (anything the matrix calls F/C/I behaving otherwise);
  dignity/copy flags (patronising language reports); AT blockers.
- Severity: BLOCKER (cannot complete core task / misgendered-state
  copy / learning contamination observed) → release-blocking;
  MAJOR → fix before marketing-safe; MINOR → backlog with owner.
- Process: findings → DECISION-REGISTER entries → fixes → retest of
  failed tasks before the affected matrix cell turns green.

## AMENDMENT DELIVERABLE 5 — Evidence dossier framework (Layer-2)

The 18-field template of Amendment §7 is adopted verbatim as
`dossiers/DOSSIER-TEMPLATE.md` (created with the first dossier, CC-F3);
completion of fields 14-15 (user testing, expert review) plus LEG-23
gates any population label. R5 seeds fields 3-6 for SCI/MS/Parkinson's.

## Rejected structures (why this decomposition)

Fewer, bigger campaigns were rejected (review surface, recovery cost);
"UI first" was rejected (half-wired states); "learning shield first"
was rejected (nothing to shield until selection/effective layers emit
provenance). The order store → selection → onboarding/content →
effective/adherence → learning → coach/lifecycle → hardening keeps
every landing coherent and independently shippable.
