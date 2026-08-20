# CC25 STATUS LEDGER (per founder cost-governance order, 2026-08-20)

_Last updated: 2026-08-20, after banking the recovered Wave 1 reports._

## Repository

- Worktree: /home/user/ADPhysique, branch `claude/build-name-prompt-apple-auth-fp49by` (tracks origin, == remote).
- SHA at ledger time: `619b4bd` (all commits this campaign are docs-only).
- Changed files: campaign folder + docs/TASKBOARD.md entry. NO production code touched. NO migrations written. NO migrations run.
- Campaign commits: scaffold `1c7d7c0`; amendment record; banks for R6, R4, R5, AUDIT-L, R2 sweep, and the recovered A/C/D/E/G + R1/R3 (`619b4bd`).

## Completed evidence (all generated against the 149d140 code tree; every commit since is docs-only, so all remain valid for the current SHA)

| Report | Scope | Status | Confidence notes |
|---|---|---|---|
| audits/AUDIT-A (1,288 ln) | Onboarding, profile, planEngine/planAutoGen, equipment filtering, plan library, gating | COMPLETE on disk (agent died post-write; no chat summary — file is authority) | Ends with honest §15 unknowns |
| audits/AUDIT-B (1,014 ln) | Exercise library: 552 built-ins, field-by-field coverage, per-axis expressibility, custom exercises | COMPLETE + chat summary | Counts computed by executing seed source |
| audits/AUDIT-C (1,222 ln) | exercise_intent, PATTERN_AVOID/C31, swaps, pins, migrate_142 | COMPLETE on disk (no chat summary) | 14 sections, honest unknowns |
| audits/AUDIT-D (990 ln) | Set model, C20 resolver, pain/soreness capture, recovery EMA, per-side search | COMPLETE on disk (no chat summary) | Cloud column list from migrations, not live DB |
| audits/AUDIT-E (1,172 ln) | Landmarks, learnedRange, blocks, blockSeed, adaptation_events, six-week absorption walk | COMPLETE on disk (no chat summary) | Line refs mechanically checked by the agent |
| audits/AUDIT-F (1,605 ln) | Weekly coach, limiters, precedence, Apply/Decline, misread walks | COMPLETE + chat summary | Includes C21 doc-drift table |
| audits/AUDIT-G (1,173 ln) | session_resolutions, adherence consumers, EXECUTION limiter | COMPLETE on disk (no chat summary) | |
| audits/AUDIT-L (549 ln) | Global evidence-consumer sweep: ~186 readers, 17 hidden consumers, 1 SQL bypass | COMPLETE + chat summary | |
| research/R1 (1,502 ln) | UK/EU Art 9 + health-data law, classification table, legal-review register | COMPLETE on disk (no chat summary) | Read Article9ConsentScreen.js for grounding |
| research/R2 (1,197 ln) | MDR/MHRA software boundary, "compensation" limb, wording lists | COMPLETE on disk (no chat summary) | Explicitly not legal advice |
| research/R3 (1,045 ln) | Detraining/retraining, re-entry practice, pain-monitoring models, unilateral, pacing, maintenance dose | COMPLETE on disk (no chat summary) | No thresholds proposed |
| research/R4 (442 ln) | WCAG 2.2/platform/RN accessibility + AT | COMPLETE + chat summary | Confidence-tagged |
| research/R5 (1,038 ln) | Population RT evidence, verdict lines, clinical register | COMPLETE + chat summary | Corrections to founder leads recorded |
| research/R6 (630 ln) | Competitor disability-support matrix, 15 products | COMPLETE + chat summary | Vendor-verbatim tiers |

## Missing (exact questions, classified per §9)

Audits H, I, J, K produced NO files. Their content decomposes to:

ARCHITECTURE-BLOCKING → resolve by FABLE DIRECT READS (no agents):
- I-1 conflict.js last-write-wins semantics exactly (row/field, clocks, tombstones).
- I-2 The sync registry table-module contract (what tables/ modules define).
- I-3 Which tables are append-only/event-log vs mutable state.
- I-4 How exercise_intent syncs today (legacy sync.js path shape).
- K-1 Exact Article 9 consent wording + what consent stores + fail-closed path (R1 §grounding may already quote it — check first).
- J-1 withProGuard/proGate surface map (FD-1 free-tier baseline).

ALREADY ANSWERABLE from banked evidence + direct confirmation greps:
- H-1 Nutrition reads of training data (AUDIT-L family sweep + AUDIT-F nutrition-safety seams; confirm-grep only).
- J-3 Health settings contents (one screen read).
- K-2 Telemetry event-name surface (one grep of engineTelemetry track calls).

IMPLEMENTATION-BLOCKING-LATER (resolved inside the campaign that touches the subsystem; NOT investigated now):
- Full per-screen accessibility audit (J) → the accessibility implementation campaign.
- Full export/delete coverage tables (K) → the privacy implementation campaign.
- Remaining nutrition-domain detail (H) → any campaign touching nutrition coordination.
- Live-DB verification of cloud columns (D §S-8) → next founder-phrase cloud batch.

## Running/background work

None. ListAgents: no reachable agents. All 18 pre-order launches accounted for: 6 completed with summaries, 8 died AFTER writing complete reports, 4 (H/I/J/K) died without output.

## Cost-control status (post-order)

- New subagents used: 0/2 (pre-synthesis budget).
- Mid-tier subagents used: 0. Highest-tier escalation requests: 0.
- Pre-order usage, for the record: 28 subagent launches total this session
  (10 stopped by the amendment interrupt before producing anything; 18
  relaunched/launched, of which 12 hit the session limit). Tiering followed
  the then-standing CLAUDE.md audit-default (Opus); the 2026-08-20
  cost-governance order supersedes that default for this campaign and is
  recorded in `_CAMPAIGN-LOG.md`.

## CC26 status (2026-08-20)

BUILT, RED-TEAMED AND GATED THIS SESSION — capability foundations end
to end and inert: local schema + lifecycle (incl. the section 33.7
acknowledge anchor), cloud files 145/146/147 (NOT applied, CC-F7;
executed twice each against a local scratch Postgres), registry sync
both directions, granular consent lane + erasure-first withdrawal,
How you train surface (demand add flow per CC-D27; Article 20 JSON
export; BACKUP_TABLES coverage), CAP-19/CAP-4 guards, scrub coverage.
One Sonnet red team: 8 findings, all adjudicated and landed
(record in _CAMPAIGN-LOG.md). Selection, generation, coaching and
learning behaviour UNCHANGED by construction (guard-tested).
Next: CC27 per ROADMAP-CC26-PLUS.md, on founder go.

## CC27–CC29 status (2026-08-20, execution bundle 1)

BUILT, RED-TEAMED AND GATED IN ONE BUNDLE (founder order: CC27 → CC28 →
CC29 without campaign-boundary stops). CC27: the ten-axis demand
ontology over all 551 seed rows (87-100% per-axis coverage, zero
contradictions), the pure resolver + section 4.1 precedence, the senior
question composed through every caller (16 callers + the three id-blind
readers + the Recent rail), pre/post-engine wiring, picker filter +
section 9.4 flows, the section 9.6 pre-flight, honest no-compatible
reporting, CC-D25/CAP-18 copy, the wording sweep, same-position
sequencing, custom parity (PD-8 prerequisite fixed), CC-D27 add
surfaces; PD-2/PD-8/PD-9 paid; BD-1 pull-wipe defect found and fixed.
CC28: both onboarding paths gain the optional capability step, computed
library compatibility + chips + install-time senior check (A11.8), ten
compatible-by-construction family plans (grip-limited pulling deferred
DEF-3, named honestly), free-starter capability-aware pick, session
length free-editable + energy card (33.12), coverage registry. CC29:
effective prescription as a resolution layer (never a store), the
section 14 propose/apply/decline, serve-time substitution after explicit
Apply on fresh sessions only, eligibility-derived swap cause, section 18
honest denominators through the ONE stats function (C1-C4 fixed by
fixture). Bundle red team (ONE Sonnet): 4 BREAKs, all accepted, fixed,
pinned (tracker). Cloud files 148/149 written and locally exercised —
NOT applied (CC-F7). Full-suite gate green over the settled tree.
Next: CC30 per ROADMAP-CC26-PLUS.md, on founder go.
