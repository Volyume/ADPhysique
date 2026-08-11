# Campaign 6 — returning users, long-term personalisation, lapses, reinstall and multi-block experience (running log)

Branch `claude/campaign6-long-term` from main `5764a947` (Campaigns 1-5
complete D92-D96; 9,910 tests passing, lint clean, identity invariant
clean). Founder order verbatim in the session scratchpad
(`c6-CAMPAIGN6-ORDER.txt`, 45,284 chars); summarised on
docs/TASKBOARD.md. Rulings register as **D97**
(D97-RULINGS.md in this folder + register blocks in
docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md).

## FOUNDER ADDENDUM (2026-08-11, mid-campaign): THE PERSONALISATION DIVIDEND

Governing product law added to THIS campaign (no restart, no rescope;
verbatim in the scratchpad, `c6-ADDENDUM-PERSONALISATION-DIVIDEND.txt`).
Core: Volyume should become OBSERVABLY more individual as evidence
accumulates - the user should be able to SEE that their history made
the coaching more specific, through deterministic, provenance-provable
behaviour only. Five permanent promises frame the audit: REMEMBER ME,
RESPOND TO ME (every recurring input classified A-E with effects
proven), HELP ME IMPROVE (specificity, never flattery), RESPECT MY
CHOICES (autonomy IS the retention model), SHOW ME WHY (consequences,
never internals). Non-change states must never collapse to "No
changes" (working / insufficient / user-choice / safety / stimulus /
exact-repeat are distinct). Anti-anthropomorphism and
anti-manipulative-retention laws bind all new copy. New deliverables:
PERSONALISATION-DIVIDEND.md, CHOICE-MEMORY.md,
RELATIONSHIP-MOMENTS.md, WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md
(investigate only - verdict A/B/C/D, never built without a separate
founder ruling), REVIEW-E-relationship.md (fourth+1 adversarial
review: the nine-month paying user, twelve questions); the six-block
and 180-day reports gain relationship sections; relationship-level
invariants join the campaign 6 suites; handover items 81-96 append to
the 80-item list (now 96 items, incl. the honest long-term loyalty
verdict). Personalisation saturation restraint: a handful of
high-value moments, never sprayed copy. Evidence-age language tiers
apply to every relationship claim; D91-25 stays unimplemented.

## Binding laws for this campaign

Three long-term laws: (1) **MEMORY MUST HELP, NEVER TRAP** — history
improves decisions but never locks old prescriptions in, overrides
newer manual intent, converts absence into evidence, teaches upward
from calm/ED-suppressed periods, or overrides safety rails;
(2) **NO PERSONALISATION WITHOUT PROVENANCE** — every mature surface
distinguishes research/profile default, learned history, last-block
decision, manual override, safety/calm simplification, insufficient
evidence (Campaign 2 explanation law binding); (3) **LAPSE ≠ FAILURE**
— returns after 3d/2w/1m/3m/6m produce no shame, no punishment, no
misleading streak pressure, no fabricated recovery assumptions, no
automatic block progression; the path back is obvious.

Hard constraints: NO production migration run (132-135 unapplied, 049
HELD; local/isolated schema testing allowed where existing tooling
supports it safely); D91-24 NOT stealth-fixed (characterise + report;
aggressive-case discovery = blocker); D91-25 NOT implemented (no
freshness/decay algorithm — characterise the long-layoff consequence
only; unsafe-return risk without an existing protection = founder
decision); trial law SETTLED (14-day cardless in-app → 7-day store
intro → paid; NEVER re-ask); FREE HAS NO COACHING; no cardio; no
AI/LLM; no auto block transitions; no automatic exercise changes;
Article 9/ED/wellbeing binding; billing binding; D92-11 unchanged; no
travel mode (clock correctness only); no new social scope; no
gamification; no photo cloud sync; no wholesale sync consolidation;
no EAS; STOP after Campaign 6 (no Campaign 7, no release-polish).

FR-5/FR-C4-8 unsubscribe questions stay founder-gated. Phase 57 debt
triage carries every open item; nothing is silently decided.

## Phase status

- Opening scaffold — LANDED (c99f677e).
- Phase 1 (journey map, 16 personas) — DELIVERED by agent, LANDED
  8fce6a11; five load-bearing seams: seam 2/3/4 FIXED (D97-8/6/7 at
  139069a2), seam 5 + seam 1 carried as founder questions (D97-9,
  D97-3 addendum).
- Phase 2 (PERSONALISATION-MATURITY.md, 28 systems) — DELIVERED by
  agent, LANDED 239ee7a3; its ordering finding verified and FIXED
  (D97-2: getAdaptiveLandmarkHistory now oldest-first so the adapted
  bands read the genuinely newest 8 sessions); its two other candidate
  defects verified and FIXED (D97-4 stimulusReady 14-day gate, D97-5
  counter calendar-adjacency; grade-3 counter deliberately untouched).
- Phases 3+4 (six-block athlete + compounding invariants) — LANDED
  13ad9f9e: campaign6.sixBlock.test.js (24 tests) +
  SIX-BLOCK-SIMULATION.md.
- Phases 5+6+8 (learnedRange longitudinal, D91-25 characterisation,
  D91-24 characterisation) — LANDED 13ad9f9e:
  campaign6.longitudinal.test.js (27 tests). NOTHING implemented for
  D91-24/25; the stored-ledger asymmetry carried as D97-3.
- Phase 7 (stale-history copy) — LANDED 987a42f9: two copy fixes
  (D97-1), full claim table in LAPSE-MATRIX.md,
  campaign6.longTerm.test.js opened.
- Phases 13+14 (Apply loop, Repeat vs Adjust) — LANDED adc6efee:
  campaign6.applyRepeat.test.js (11 tests).
- Phases 22-24 + 47(nutrition) — LANDED 0e672a9a:
  campaign6.nutrition.test.js (10 tests, 26-week athlete).
- Phase 60 (migration release table) — LANDED c0ecd6c2:
  MIGRATION-RELEASE-GATES.md (verdicts: 134 strongest gate, order
  134-135-132-133; 049 stays HELD).
- Phases 16+26 partial (Coached auto-apply age gate) — LANDED
  ee5d7789 (D97-10): the coached auto-walk is bounded to the current
  cycle; old outputs keep manual Apply buttons.
- Phases 9+44 (plan lifecycle) — DELIVERED and ACTIONED at 4ef410c3
  (D97-11..17): ledger backfill for switched-away blocks, archive
  partition + transaction + tiebreak, is_archived sync both ways,
  PlanDetail RB-3 guard, abandoned end_date truncation, mature
  research line, recovery/decision switch dialogues, duplicate
  provenance, archived-copy reuse. Accepted/no-action: P9-10
  (performed sets ARE evidence), P44-13 + P9-09 carried to triage.
- Phases 10+11 (exercise/PR) — DELIVERED and ACTIONED at 49b3f253
  (D97-18): cluster rows excluded from e1RM records (writer closed),
  the Progress PR tile mirrors the live detector (FQ-7 baseline,
  pinned-defect test re-anchored corrected), the records wall reads
  all completed history. CARRIED: high-rep Epley fidelity = founder
  question (Phase 57); remaining MED/LOW findings + LiftProgress/
  strength-standing cluster wiring on the audit file for a next
  batch.
- ADDENDUM progress: anti-anthropomorphism/manipulation copy guards
  LANDED (abefab54, tree clean); six-block RELATIONSHIP report LANDED
  (392fa136).
- Phase 51 (90-day lapse E2E) — LANDED 6700a9f7:
  campaign6.lapse90.test.js (11 tests).
- Phase 50 (180-day E2E athlete) — LANDED 517c2cc3:
  campaign6.athlete180.test.js (11 tests; repeat transition, exercise
  change, manual, calm, nutrition thread with weigh-in gap; full
  thesis asserted).
- Phases 18-21 (AUDIT-TIER-TRANSITIONS.md) — DELIVERED, LANDED, and
  ACTIONED (D97-20): P-1 trial-grant retry rewired on RESULTS with a
  behavioural suite (23e3f907); P-2 evidence-bounded phase claims
  (evidencedWeeksInPhase input; clock/gates untouched; set-age
  diet-break wording under a gap); P-3 FB-36 guard on the ledger
  readiness slope (06796ce8); P-4 sleep-only rows refused at the
  completed-check-in gate (853819d0); P-5 ended blocks count as
  personal history (61fb8a51); P-6 repeat seeds observed numbers on
  an unjudgeable ledger, closing the Free learned-band leak
  (300bd5d1). P-7 (billing, founder-gated) + P-8..P-11 latents
  carried to Phase 57 triage. Choice-memory lane fixes landed
  earlier at 0b383230 (D97-19).
- Addendum lanes CHOICE-MEMORY.md + RELATIONSHIP-MOMENTS.md — LANDED
  and dispositioned at 0b383230 (D97-19): F5/F8/F4 fixed, F3/F9
  carried, maturity doc corrected; moments A=12 B=6 C=0 D=2, B1/B4
  the two saturation-rule implementation candidates (for the
  dividend synthesis), B2 a founder copy question.
- ADDENDUM lead work LANDED: ATHLETE-180-REPORT.md with the
  RELATIONSHIP/CONTINUITY VERDICT (nine questions lead-derived,
  D97-21 - flagged for founder confirmation in the handover);
  campaign6.relationship.test.js (12 behavioural invariants under
  the five promises + FREE-PRO; walker/jargon guards referenced in
  their existing suites).
- Phases 25-31 (AUDIT-RETURN-AND-HISTORY.md, 29 findings) and 32-38
  (AUDIT-REINSTALL-SYNC-OFFLINE.md, 24 findings) — DELIVERED and
  LANDED; rulings recorded as D97-22/D97-23 after hands-on lead
  verification of every load-bearing claim. **R-1 FIXED** at
  1e90ae09 (clock-anchored weigh-in window; stale series → honest
  data hold, null delta; fixtures re-anchored same-meaning).
  **MIGRATION-RELEASE-GATES.md CORRECTED: 135 is defective as
  written and HELD** (S-14 receipt deletion + S-15 permanent batch
  poison, proven in a scratch cluster); revised order 134→132→133.
  FOUNDER-FACING: S-1 (ED flag has no cloud writer anywhere -
  Section 2 stop-and-ask before implementing the push path), R-3
  (buildWeighInSeries still uncalled), 135 replacement design,
  FR-C4-2/FR-C4-3 with new consequence evidence.
- RULED, NEXT FIX BATCHES (D97-22/23): R-2 (Progress trend card
  date-window), R-4 (unearned recovery week on return), R-5 ("Your
  body's ready" at unbounded overdue), R-7 (per-user churn key),
  R-8 (weigh-in editability), R-10 (streak pause window), S-2/S-3
  (guarded-pref stamps for reminder/quiet-hours keys, tombstones -
  narrow, no consolidation), S-5 (offline delete queue), corrected
  135 SQL + client re-id migration (written, NOT run). Remaining
  LATENT/LOW → Phase 57 triage.
- NEXT: agent pairs for 25-31 (weight/lapse/streak/win-back/
  progress/edits) and 32-38 (reinstall/migration contracts/sync/
  offline); then 39-43 + 45-46 + 48-49, PLUS
  WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md as an agent audit;
  PERSONALISATION-DIVIDEND.md + the six-block/180-day relationship
  report expansions + relationship invariant pins as lead work); then
  E2Es (52 reinstall), Reviews A-E (53-56 + the addendum's Review E),
  debt triage (57), H4/legal (58-59), campaign6 gates (62), docs
  close, merge to main, 96-item handover (80 + addendum items 81-96).

## Wave recovery paths

Agent briefs derive from the order's phase text (read verbatim from
the scratchpad copy); agents are read-only unless their brief says
otherwise, never commit/push/stash, stop-and-report on ambiguity or
pinned-test conflict; uncommitted agent work is lead-reviewed against
the order before landing. Two agents at a time, explicit tier every
dispatch (audits = opus).

## Recovery path

Read this log + docs/TASKBOARD.md Campaign 6 block + the D97 rulings
(when they exist); `git status`; audit evidence lands in this folder;
uncommitted work is lead-reviewed against the order before landing —
never discarded, never blind-committed. Implementation only ever
follows a recorded D97 ruling on written evidence.
