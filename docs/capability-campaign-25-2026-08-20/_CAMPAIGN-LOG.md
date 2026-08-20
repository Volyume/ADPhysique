# Capability Campaign 25 (CC25) — live campaign log

**Authority:** founder master brief 2026-08-20 (chat): "VOLYUME — CAMPAIGN 25+
— capability-aware, disability-inclusive, restriction & injury-aware training
intelligence". Lead (Fable, main loop) holds product/technical decision
authority except clinical, legal/privacy and irreversible business calls,
which go to the registers. Section 2 CLAUDE.md inviolables bind everything.

**Numbering:** this workstream is namespaced **CC25, CC26, …** (global board
campaigns already run to 33; the closed 2026-08-17 "Campaign 25 — Plans
screen" is unrelated).

**Branch:** `claude/build-name-prompt-apple-auth-fp49by` (designated by
harness; == main at start, 149d140). Merge to main at green, lead-reviewed
landings per founder order 2026-07-30.

**Campaign folder:** `docs/capability-campaign-25-2026-08-20/`
- `00-CHALLENGE-PASS.md` — lead's provisional hypotheses (pre-evidence)
- `audits/` — Wave 1 evidence reports (agents write here, one file each)
- `research/` — external research reports
- `ARCHITECTURE.md` — (later) the Campaign 25 deliverable set
- `DECISION-REGISTER.md` — (later) CC-decisions, laws, rejected ideas,
  clinical/legal/founder flags

## Stage plan (from the brief; lead may reshape with recorded rationale)

1. ✅ Session-start protocol (handover, taskboard, git state)
2. ✅ Challenge pass (00-CHALLENGE-PASS.md)
3. ⏳ Wave 1 audits (A–L) — two tranches of 8, background agents
4. ⏳ External research wave (R1–R4)
5. Lead synthesis → provisional architecture (32 deliverables)
6. Wave 2 red team (attack surfaces A–M, grouped)
7. Revise; completion gate; decision register; CC26+ roadmap
8. Begin first implementation campaign only after the gate passes

## Wave 1 roster (agent tier per CLAUDE.md block; audits default Opus)

| Audit | Domain | Tier | Report file (audits/) |
|---|---|---|---|
| A | Onboarding / profile / plan generation | opus | AUDIT-A-onboarding-plangen.md |
| B | Exercise library schema & metadata | sonnet | AUDIT-B-exercise-library.md |
| C | Exercise intent / constraints / swaps (C31) | opus | AUDIT-C-intent-constraints.md |
| D | Workout / set model / pain / recovery | opus | AUDIT-D-workout-evidence.md |
| E | Progression / volume / blocks / learning | opus | AUDIT-E-progression-learning.md |
| F | Weekly check-in / coach / precedence | opus | AUDIT-F-coach-precedence.md |
| G | Adherence / session resolution | opus | AUDIT-G-adherence.md |
| H | Nutrition cross-domain | sonnet | AUDIT-H-nutrition.md |
| I | Data / migrations / sync | opus | AUDIT-I-data-sync.md |
| J | Settings / UX / accessibility | sonnet | AUDIT-J-settings-a11y.md |
| K | Privacy / Article 9 / export / delete | opus | AUDIT-K-privacy.md |
| L | Global evidence-consumer sweep | sonnet | AUDIT-L-evidence-consumers.md |

Research: R1 privacy/Art. 9 law (opus), R2 medical-device boundary (opus),
R3 training science: detraining/reintroduction/inclusive RT/chronic flare
(opus), R4 mobile accessibility standards (sonnet) → research/.

Research roster grew under Amendment 1: R5 population-specific evidence
(opus, R5-population-evidence.md), R6 competitor disability-support matrix
(sonnet, R6-competitor-disability-matrix.md).

Tranche 1 (launched first): A, B, C, D, E, F, G, L + all research R1–R6.
Tranche 2 (on T1 completion): H, I, J, K.
2026-08-20: the founder's amendment interrupt stopped the first tranche
launch before any report was written; all ten stopped agents were
relaunched with amendment-updated briefs (A gained the PLAN LIBRARY
section; B gained per-axis functional expressibility verdicts). Fourteen
agents in flight after relaunch.
Parallel window: the founder brief itself orders a parallel audit wave
("PARALLEL AUDIT WAVE 1"), which is the granted wider window over the
two-agent default; tranches of 8 keep supervision honest.

## Recovery path (recorded before any agent runs)

Wave 1 agents are READ-ONLY except each one's single report file under
`audits/` (or `research/`). No agent commits, pushes, stashes, or edits
code. If the session dies mid-wave: re-read the founder brief + this log;
any missing/truncated report file = relaunch that audit fresh (reports are
self-contained; no cross-agent state). Completed reports are committed to
the branch as they are reviewed. No code changes exist in Wave 1, so a dead
session loses at most unlaunched audits.

## Log

- 2026-08-20 — Campaign opened. Protocol done. Key pre-audit facts: C31
  PATTERN_AVOID system live (migrate_142 in production), C32 load_semantics
  live (migrate_143), C20 prescription resolver on main, C21 oracle-locked
  coach graph, migrations ledger live through 143 (144 on disk, Apple
  review reset). CLAUDE.md §STATUS migration numbers are stale — the
  supabase/README ledger is current truth (noted for the register; CLAUDE.md
  edit is queued as a small landing with this campaign's first merge).

## AMENDMENT 1 (founder, 2026-08-20, binding) — disability-first product completeness

Received mid-Wave-1 (file: Volyume_Campaign_25_Disability_Completeness_Amendment.md,
uploaded to chat; full text is the authority). Integrated as follows:

**Founder decisions now on record (register entries at synthesis):**
- FD-1: Core disability/capability accommodation is NOT Pro-gated. Free tier
  must include capability-aware onboarding, baseline profile, durable
  restrictions, capability-aware filtering, capability-aware routine-library
  browsing + installation, builder respecting capability, adapted/custom
  exercise logging, unilateral logging needed for correct logging, core
  accessibility, and later inspection/update of capability. To be protected
  mechanically (guard test) once built.
- FD-2: Completion standard is now dual: Standard A (training intelligence)
  AND Standard B (disability product readiness — routines, coverage,
  accessibility, real disabled-user validation, evidence-backed claims).
- FD-3: No single generic "disabled/adaptive workout". Routine families are
  capability-led (Layer 1); population-labelled content (Layer 2) only with
  a structured evidence dossier and its gates.
- FD-4: Grok/Gemini are wanted as external ideation consultants. They are
  NOT reachable from this environment — per amendment §22 the campaign
  produces an EXTERNAL CONSULTATION QUEUE (exact prompts per checkpoint
  A–D) instead of pretending; work continues unblocked.

**Scope/deliverable additions:** free routine library plan; disability/
capability support roadmap; marketing readiness matrix; disabled-user
validation plan; coverage registry artefact; evidence-dossier framework;
competitor disability-support matrix; amendment §29 red-team scenarios;
accessibility layers beyond exercise selection (motor/visual/hearing/
cognitive).

**Wave adjustments:** Audit A extended in-flight (plan library / template
routines / installation + gating). Research wave expanded: R3 training
science (detraining, reintroduction practice, pain-monitoring models,
unilateral/cross-education status, flare pacing); R4 accessibility +
assistive tech (incl. Switch Control, TalkBack, timers, cognitive access);
R5 population-specific evidence (SCI, wheelchair users generally, upper/
lower limb difference, CP, MS, Parkinson's, stroke asymmetry, short
stature; verify the amendment's claimed 2026 CMO refresh and 2025–26
Activity Alliance findings); R6 competitor disability-support matrix.

- 2026-08-20 — R6 competitor matrix COMPLETE (research/R6-competitor-
  disability-matrix.md, 630 lines, 15 products, vendor-verbatim). Headlines
  for synthesis: no plan-generating app has a persistent capability
  profile (Alpha Progression's always-enabled/disabled list is the only
  analogue); seated/no-floor programme GENERATION absent across all 11
  programming products; dedicated adaptive space thin and partly
  trust-damaging (Wheel Fit); every credible disability claim carries a
  named adaptive-athlete credential; no flare-mode feature exists
  anywhere; reintroduction is a binary toggle industry-wide.

- 2026-08-20 — R4 mobile accessibility COMPLETE (research/R4-mobile-
  accessibility.md, 442 lines; 25-item checklist, 11 RN limits, 5
  legal-review items; per-finding confidence tags). Headlines: WCAG 2.2
  2.5.7 dragging-alternative / 2.5.8 target size / 3.3.7 redundant entry /
  1.3.3 no-audio-only-cues bear directly on the logger and rest timer;
  WCAG2Mobile is still an unendorsed draft (no ratified native checklist);
  accessibilityLiveRegion is Android-only and iOS lacks the concept
  (per-platform timer announcement mechanics); RN FlatList VoiceOver order
  and Modal focus restoration are documented-broken; VoiceOver untestable
  on simulator; expo-video subtitles broken on Android (open issue);
  NEEDS LEGAL REVIEW: whether pro_monthly/pro_annual IAP brings EAA
  "e-commerce" scope + EN 301 549 Ch.11 primary-text verification.

- 2026-08-20 — R5 population evidence COMPLETE (research/R5-population-
  evidence.md, 1,038 lines; 80 evidence tags; 12-item clinical-review
  register). Verdicts: curated Layer-2 routine plausibly supportable
  (with dossier) ONLY for chronic SCI (Martin Ginis 2018), MS and
  Parkinson's; all other surveyed populations resolve capability-led with
  education/UX. Central cross-cutting finding: benefit/safety evidence
  exists but training PARAMETERS do not template (CP meta-regression: no
  intensity/volume association; stroke: "insufficient for evidence-based"
  parameters; amputation: RT not isolable). Corrections to founder leads:
  CMO 2026 refresh is real (10 Jul 2026) but the strength-2-days line
  dates from 2019 unchanged; Activity Alliance 2025-26 verified (52% vs
  74% gap) but their facts page mixes survey years - always reopen the
  specific report before citing. Traps recorded: SCI 8-10 rep range was
  dropped in the 2018 update (secondaries still quote it); Parkinson's RT
  not superior to other active interventions; "wheelchair users" is not
  an evidence grouping (SCI ~ a tenth of UK users). MS Society 403'd -
  verified via MS Trust instead; LimbPower PDF unread (existence only).

- 2026-08-20 — AUDIT L evidence-consumer sweep COMPLETE (audits/AUDIT-L-
  evidence-consumers.md, 549 lines). ~186 distinct production reader
  sites across 17 data families. 17 hidden consumers incl. share cards
  (greatWeek.js), CSV export, home cards (FatigueTrendCard, CoachBrief,
  ReadinessCards), widget writer, notification scheduler,
  CascadeGateScreen (billing copy reads weekly PR count!), partner
  weekSignalWriter, food-domain recompReframe (reads e1RM trend).
  ONE direct-SQL bypass: importExternal.js raw INSERTs into workouts/
  workout_sets/exercises. Dead-accessor list recorded (incl. the whole
  insights pipeline, guard-tested dead). Cross-cutting: 16/17 families
  sync via legacy sync.js; only weekly_checkins is on the new registry.

## COST-GOVERNANCE ORDER (founder, 2026-08-20, binding — supersedes prior orchestration rules for this campaign)

Received after the 12:40 UTC session-limit event killed 12 in-flight
agents. Full text is the authority (chat). Operative rules now in force:
subagents default to the LOWEST suitable tier (haiku); sonnet only with
recorded justification; NO Opus subagents without explicit founder
approval (requests go to HIGH_COST_ESCALATION_REQUESTS.md); max 2
pre-synthesis subagents, max 2 red-team subagents; direct tools before
agents; Fable synthesises personally; short agent reports; session-limit
handoff discipline. This supersedes the CLAUDE.md "audits default Opus"
tier block FOR THIS CAMPAIGN by explicit founder order.

Recovery state: audits A, C, D, E, G and research R1, R2, R3 all wrote
complete reports before dying — banked at 619b4bd. Only audits H, I, J,
K have no output; their architecture-blocking cores are being resolved
by Fable direct reads (see STATUS-LEDGER.md gap classification). Wave 1
is otherwise COMPLETE. No agents running. Next: consolidated evidence
map, then synthesis.

- 2026-08-20 — SYNTHESIS COMPLETE (lead, per the cost-governance order):
  ARCHITECTURE.md (1,219 lines, deliverables 1-31), DECISION-REGISTER.md
  (facts, CC-D1..25, CC-R1..16, deferrals, CLIN/LEG/founder registers),
  ROADMAP-CC26-PLUS.md (CC26-CC32 + all Amendment deliverables),
  EXTERNAL-CONSULTATION-QUEUE.md (Checkpoint A prompts). Zero
  pre-synthesis subagents used. Red teams RT-1 (technical) and RT-2
  (product) launched on sonnet (2/2 budget, justification in
  COST-GOVERNANCE-LEDGER.md). Lead's own adversarial pass banked 14
  self-attack candidates for joint adjudication (S1-S14, held in-loop).
  RECOVERY: if the session dies, resume = read the four synthesis docs +
  redteam/ reports when present, adjudicate, revise, close the gate.

- 2026-08-20 — RT-1 (technical) COMPLETE: 13 attacks, all
  evidence-verified (redteam/RT1-technical.md). Lead pre-adjudication:
  all accepted or partially accepted as revision-grade; none structural.
  Headlines: erasure de-protects recompute history (fix: bounded-exposure
  documentation + honest consequence copy + no-teach 'unknown' stamps
  survive); CAP-17 must gate PRE-FLIGHT to respect the D110-2 pinned
  contract; CONFOUNDED citation wrong (F#8, coachIntervention.js) and its
  closed trigger set needs the episode case in CC31; family-rule dead
  zones on 5 untagged muscles (demand rules carry them; UI offers family
  rules only where covered); CC-D9's 25% threshold DROPPED in favour of
  per-session exclusion via the deload-exclusion machinery + existing
  sufficiency gates (converges with lead self-attack S3); CC-D17 needs a
  dedicated restamp pass (backfillMissingBlockLedgers skips ledgered
  blocks); starts_at gains a backdating quick-pick (S2); adapted-window
  chronic case fails toward research defaults (acceptable, documented);
  HomeScreen ledger narration joins the consumer list; swap cause becomes
  eligibility-derived, not UI-path-keyed; AWAITING gains a quiet forcing
  cadence (S6); laterality×bilateral eligibility defined; promotion race
  = union-safe + idempotent group marker. Revision lands after RT-2.

## COMPLETION GATE — PASSED 2026-08-20 (architecture phase)

Walked against the founder brief's gate list, every line: pathways
mapped (§1 + eight audits); every known evidence consumer classified
(§7, cross-checked against AUDIT-L's sweep, misses hunted by RT-1 and
closed in §33.6); final terminology (§2.5); explicit precedence (§4,
§33.8); baseline/temporary semantics (role axis); disability as normal
baseline (CAP-1/2, §33 role-scoping); provenance (§6, §33.10);
ontology justified per axis (§8); unknown-safe (CAP-8); no-solution
state (CAP-9, §33.11/14); reversible adaptation (§14); effective plan
cannot silently become baseline (CAP-11/12; RT-1 attack surface 4
held); volume (§15); adherence (§18); asymmetry deliberately answered
(§16, CC-F2, CC-R17); chronic (§21); reintroduction (§23);
temporary→durable (§24); privacy (§26 + R1 register); sync/offline
(§28 + §33.4/9/10); clinical/legal unknowns separated (registers);
red-team attacks resolved (§33, adjudication record); campaign
boundaries justified (ROADMAP). Amendment standard: Standard A
architecture complete; Standard B carried as designed roadmap +
honest all-NO marketing matrix + validation plan, per Amendment §32's
own phasing. Implementation (CC26) starts only on the next session's
capacity or founder go — the architecture is merge-ready now.

## CC26 — CAPABILITY FOUNDATIONS (implementation, 2026-08-20)

Founder start order received same day (scope = ROADMAP CC26 block
verbatim; CC27+ explicitly forbidden; zero-agent target, max 2
implementation subagents, max 1 bounded red team, no Opus). Built
hands-on by the lead with direct tools; no implementation subagents
spent.

LANDED (branch `claude/build-name-prompt-apple-auth-fp49by`, merged to
main at gate):
- Domain model `src/lib/capability/model.js` — pure, no clock reads;
  9-axis demand vocabulary (§8); role/source/rule_kind/laterality
  vocabularies; interval validation (baseline forbids ends_at + group;
  episode requires group); status derivation incl. AWAITING_CONFIRMATION
  (§22, constraints still apply while awaiting); `isConstraintActiveAt`
  closes on confirmed `ended_at` only (§28 interval law).
- Local schema (SCHEMA_MIGRATIONS append in `src/lib/database.js`):
  `capability_constraints` + `session_constraint_effects` + indexes,
  wipe-list additions, CRUD/lifecycle appliers (supersession = end old +
  insert new; promote transactional exactly-once; readers never write;
  cloud applier strictly-newer LWW so a newer tombstone beats an older
  active row).
- Cloud files `supabase/migrate_145/146/147` — written, NOT APPLIED
  (CC-F7; README ledger rows added, all three marked NOT APPLIED).
  145 recreates `delete_user_data()` with the capability deletes
  (erasure reach); 147 adds the granular `capability_data` consent
  (consent_log CHECK widening, users_profile flags, RPC).
- Sync: registry rows (lww, softDelete, bidirectional), tables modules,
  transport MIGRATED_TABLES/handlers, runner flush of the pending
  consent queue; stateContract classification rows.
- Consent lane `src/lib/consent/capabilityConsent.js` — local flag
  first, RPC with never-strand retry queue; withdraw = revoke +
  tombstone-all + flag false. Store derives consent cross-device from
  rows-imply-consent when no local flag exists (no profiles-sync
  changes needed).
- Surface `src/screens/HowYouTrainScreen.js` (RT2-2 name) + unguarded
  route (CAP-19) + settings row. Role-scoped copy (RT2-1), staged
  INLINE add flow (no Modal — R4 by construction), demand-axis
  multi-select, clinician toggle, backdating quick-picks (§33
  starts_at), consent stage, episode actions (ended / a while longer /
  promote), history, withdraw-and-erase.
- Sentry scrub allow-list additions (capability key patterns +
  substrings).
- Tests: 66 new capability tests green (model 23, store 9 real-SQLite,
  sync replay 4 incl. §28 A/B, consent 4, guards 26) + stateContract 20
  + four migration-window suites bumped +1 per their own convention.

RULINGS: CC-D27 (demand-only add UI in CC26; family/exercise/allow add
surfaces land with CC27's pickers — register entry has the ontology-
divergence rationale).

DEFECT NOTE (mention, don't fix): `migrate_144` has no README ledger
row (pre-existing, App Review workstream); gap recorded in the README
rather than back-filled.

### CC26 red team + adjudication (2026-08-20)

One Sonnet agent over the full CC26 diff + laws (the CC26 budget's
single bounded slot; tier justification in the cost ledger). Swept all
ten briefed surfaces; five came back clean (tier gating, lane
separation, sync convergence, migrations, engine inertness - each
independently re-verified by the agent beyond the guard tests).
Findings and rulings (all landed same session, commit 2e5450a):

1. BLOCKER, ACCEPTED - withdraw-and-erase could show "Removed" over
   live rows (tombstone failure only logged; delete affordance gone).
   Fixed erasure-first: tombstone throws → flag untouched → screen
   reports failure. Regression test pins it.
2. BLOCKER, ACCEPTED (convergent) - capability tables missing from
   BACKUP_TABLES (Art 20). The lead found and fixed this independently
   minutes before the report landed; the dedicated JSON export from
   the data controls landed with it.
3. MAJOR, ACCEPTED - multi-axis save was per-row; "nothing was
   changed" could be false. Now one validated transaction.
4. MAJOR, ACCEPTED - raw spacing/radius literals; all theme tokens now.
5. MINOR, ACCEPTED - unavailable notice now announced on iOS too.
6. MINOR, ACCEPTED - the section 9.6 unavailable-path counterpart test
   now exists (read failure → unavailable:true, nothing fabricated).
7. MINOR, ACCEPTED with scope ruling - section 33.7's third AWAITING
   option ("keep it active for now") + its durable cadence anchor
   (acknowledged_at, local + cloud 145 + sync + export) land in CC26;
   the day-0/day-7 prompt surfaces and settings-badge decay read that
   anchor and land with the coach/notification campaign (CC30 lane).
   Never-auto-ends pinned by test.
8. MINOR, ACCEPTED with split ruling - extend and promote now carry
   the consent write gate (they keep the lane alive); ending remains
   deliberately UNGATED - stopping data collection must never be
   blocked by a consent check. Both halves pinned by test.

Migration local-execution testing (beyond the brief): the three cloud
files were executed twice each against a scratch Postgres 16 cluster
with a stubbed auth schema - idempotency, refuse-stale behaviour,
CHECK enforcement, consent RPC round-trip and delete_user_data reach
all proven. This caught one further defect the code review had missed:
147 re-added consent_log's CHECK without migration 102's
partner_sharing value, which would have FAILED at apply time against
live partner consent rows. Fixed and re-proven (commit bc0dee9).
