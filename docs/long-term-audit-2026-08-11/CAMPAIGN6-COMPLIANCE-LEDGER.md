# CAMPAIGN 6 — COMPLIANCE LEDGER (requirement-by-requirement)

Created 2026-08-11 under the founder's COMPLIANCE RECOVERY ORDER.
This ledger is the execution record: every requirement of the original
Campaign 6 order and BOTH addenda, individually accounted for. It is
updated at every landing until the campaign is genuinely complete.

**Root-cause note (recorded, not excused).** The session scratchpad
captures of the two addenda were themselves COMPRESSED relative to the
founder's original messages - Review E's twelve questions were captured
as "(twelve questions)" without the list, which produced the false
"nine questions are never enumerated" claim and the improvised D97-21
framework. The recovery order's restatement (which re-supplies the
twelve questions verbatim and enumerates all 62 phases) is therefore
the governing enumeration, cross-checked against the scratchpad order
text. D97-21's derived framework is marked superseded in
ATHLETE-180-REPORT.md; Review E will use the exact twelve questions.

**Statuses:** COMPLETE-IMPL (implemented and verified) /
COMPLETE-AUDIT (audited, verified no change required) / IN PROGRESS /
NOT STARTED / BLOCKED-FOUNDER (explicit founder ruling required) /
BLOCKED-LAW (explicit campaign law forbids change).

## A. The 62 phases

| # | Phase | Status | Evidence / remaining |
|---|---|---|---|
| 1 | Long-term journey map | COMPLETE-AUDIT | CURRENT-LONG-TERM-JOURNEYS.md (8fce6a11); seams 2/3/4 FIXED (D97-8/6/7), seams 1/5 = D97-3-addendum/D97-9 founder items in triage |
| 2 | 30/90/180/365 personalisation model | COMPLETE-AUDIT | PERSONALISATION-MATURITY.md (239ee7a3) + dated correction banner (D97-19) |
| 3 | Six-block simulation | COMPLETE-IMPL | SIX-BLOCK-SIMULATION.md + campaign6.sixBlock.test.js (24 tests, 13ad9f9e) + relationship report (392fa136) |
| 4 | Prove personalisation compounds | IN PROGRESS | Compounding pinned (sixBlock, athlete180 thesis tests); REMAINING: the explicit Block-6-without-history counterfactual, to land in PERSONALISATION-DIVIDEND.md |
| 5 | learnedRange longitudinal | COMPLETE-IMPL | campaign6.longitudinal.test.js (27 tests, 13ad9f9e): floor/ceiling/responsive/strained/alternating/missing/manual/suppressed/insufficient all characterised |
| 6 | D91-25 layoff characterisation (AUDIT ONLY) | COMPLETE-AUDIT | Longitudinal suite + LAPSE-MATRIX.md; stored-ledger asymmetry = D97-3 founder item; NOTHING implemented |
| 7 | Stale-history copy | COMPLETE-IMPL | D97-1 + LAPSE-MATRIX claim table; R-1, R-2 landed; R-6 landed (readiness caution bounded to 14 days, behavioural matrix pinned) |
| 8 | D91-24 characterisation (AUDIT ONLY) | COMPLETE-AUDIT | campaign6.longitudinal; conservative bias proven, NOT fixed, pinned unchanged |
| 9 | Plan switching over time | COMPLETE-IMPL | AUDIT-PLAN-LIFECYCLE.md actioned at 4ef410c3 (D97-11..17) |
| 10 | Exercise history over months | COMPLETE-IMPL | AUDIT-EXERCISE-PR-HISTORY.md actioned at 49b3f253 (D97-18); high-rep Epley = triage item |
| 11 | Long-term PR meaning (FQ-7) | COMPLETE-IMPL | D97-18 + R-15 landed (year recap gated by isE1rmEligibleRow, pinned) |
| 12 | Progression over many sessions (FQ-3) | COMPLETE-IMPL | D97-4 stimulusReady 14-day gate + C5 FQ-3 prevSessionDifficulty; pinned |
| 13 | Apply loop over weeks | COMPLETE-IMPL | campaign6.applyRepeat.test.js (adc6efee) |
| 14 | Repeat vs Adjust across blocks | COMPLETE-IMPL | Same suite + P-6 (300bd5d1) making repeat true on unjudgeable ledgers |
| 15 | Manual overrides over time | IN PROGRESS | Engine-level pins complete (manual wins/teaches-nothing: longitudinal, athlete180, relationship suites); REMAINING: reinstall/new-device/removal/mode-return surface audit pass |
| 16 | Coaching mode changes | IN PROGRESS | D97-10 (coached auto-walk bounded); REMAINING: full Coached/Collaborative/Manual matrix across block states |
| 17 | Calm mode over time | IN PROGRESS | One-way ratchet + no-upward-carry pinned (S-20, relationship suite); REMAINING: dedicated Standard→Calm→Standard pass incl. copy |
| 18 | Free → Pro | COMPLETE-IMPL | AUDIT-TIER-TRANSITIONS.md Phases 18; P-4 (853819d0), P-5 (61fb8a51) landed; P-11 latent in triage |
| 19 | Pro → Free | COMPLETE-AUDIT | Same audit; P-6 leak closed (300bd5d1); P-8 latent (14-day Pro-era cards) in triage |
| 20 | Free → Pro again | COMPLETE-IMPL | Same audit; P-2 landed; P-5 landed |
| 21 | Trial retry long-term | COMPLETE-IMPL | P-1 (23e3f907) + behavioural suite; trial law untouched (SETTLED, never re-asked) |
| 22 | Nutrition personalisation 90-180d | COMPLETE-IMPL | campaign6.nutrition.test.js (0e672a9a) |
| 23 | Nutrition phase changes | COMPLETE-IMPL | Same suite (phase-change baseline re-entry pins) |
| 24 | Nutrition lapses | COMPLETE-IMPL | Same suite + campaign6.lapse90 + R-1 fix |
| 25 | Weight history over time | COMPLETE-IMPL | R-1, R-14 landed; R-19/R-20 clean; R-18 BLOCKED-FOUNDER (floor input, Section 2; recommendation (a) recorded); R-3 BLOCKED-FOUNDER (proof complete: dd67bbf4 + pinned guard forbid the merge) |
| 26 | Lapse/return experience | COMPLETE-IMPL | R-5, R-6, R-12 landed; R-29 clean; R-16 BLOCKED-FOUNDER (new notification policy under NOTIFICATIONS_LOCKED + FR-5, recommendation recorded) |
| 27 | Block state during absence | COMPLETE-IMPL | R-21/R-22 clean; R-4 landed (recovery week only claimed live when trained within 14 days; option (c) clock pause = triage founder item) |
| 28 | Streaks and lapses | COMPLETE-IMPL | R-26/R-27 clean; R-10 landed (+key-format correction on lead re-review); R-11 landed (guarded blob) |
| 29 | Win-back surfaces | COMPLETE-IMPL | R-28 clean; R-7 landed; R-17 landed (storage-only claim + calm gate on the lay) |
| 30 | Progress history at scale | IN PROGRESS | R-24/R-25 clean; R-2, R-15 landed; R-13 carried to the Phase 40 measure-first lane |
| 31 | Old record edits/deletions | COMPLETE-IMPL | R-23 clean; R-8 landed (morning_weights update/soft-delete pair, tombstone syncs); R-9 carried with D97-3 (one founder decision) |
| 32 | Reinstall same account | IN PROGRESS | AUDIT-REINSTALL-SYNC-OFFLINE.md; S-9/S-23/S-24 clean; F4 fixed (D97-19); REMAINING: Phase 52 E2E + REINSTALL-MATRIX.md |
| 33 | Migration 132 contract | COMPLETE-AUDIT | S-10/S-11 proven in scratch cluster; hard release gate confirmed; NOT run |
| 34 | Migrations 134/135 contract | COMPLETE-IMPL | S-12/S-13 proven; 135 REPAIRED unapplied (route A+C: corrected tie-break + deterministic re-id + local v72; scratch-cluster and behavioural proofs; release condition recorded) |
| 35 | adaptation_events restore (FR-C4-3) | COMPLETE-AUDIT | S-4: product consequence proven (revert memory, add-frequency cap, Engine Log); carried to founder under FR-C4-3 with evidence |
| 36 | Notification pref multi-device (FR-C4-2) | COMPLETE-IMPL | S-2 landed (guarded stamps, all writers); S-3 tombstones + the dual-family architecture stay with FR-C4-2 (founder) |
| 37 | Two-device training | IN PROGRESS | S-12/S-18/S-19/S-20 + campaign1.syncConflict; REMAINING: MULTI-DEVICE-MATRIX.md (commissioned doc) |
| 38 | Offline for weeks | COMPLETE-IMPL | S-21/S-22 clean; S-5 landed (offline never spends the delete budget) |
| 39 | Timezone/DST/clock | NOT STARTED | R-20 (DST-safe morning rows) is partial evidence only; dedicated audit required |
| 40 | Data scale/performance | NOT STARTED | R-13 provides one measurement; commissioned measure-first audit required |
| 41 | Row cap/pagination | NOT STARTED | P10-1 fixed one window; dedicated 1000-row/default-cap sweep required |
| 42 | Local-only data truth | IN PROGRESS | S-23 (photos never sync, guard-tested) + scans; REMAINING: full local-only inventory pass |
| 43 | Partner long-term | NOT STARTED | Dedicated audit required (existing accountability only) |
| 44 | Plan archive/history | COMPLETE-IMPL | With Phase 9 (D97-12/13/16/17; P44 items landed 4ef410c3) |
| 45 | Personalisation copy maturity | NOT STARTED | Block 1 vs 2 vs 5 vs long-gap return copy pass |
| 46 | Non-change as mature decision | IN PROGRESS | Six non-change states distinct by construction (blockExplain, heldUnjudged RA-2); REMAINING: surface-level audit that each is REACHABLE and spoken |
| 47 | Long-term safety | COMPLETE-AUDIT | No-learning-around-safety pinned at every layer (relationship suite, sixBlock, athlete180, S-20); thresholds untouched |
| 48 | Six-month Free experience | NOT STARTED | Dedicated simulation/audit |
| 49 | Six-month Pro experience | NOT STARTED | Dedicated coherence audit |
| 50 | 180-day athlete E2E | COMPLETE-IMPL | campaign6.athlete180.test.js (11 tests, 517c2cc3) - deterministic, real chain, all commissioned beats; ATHLETE-180-REPORT.md reconciled to it |
| 51 | 90-day lapse E2E | COMPLETE-IMPL | campaign6.lapse90.test.js (11 tests, 6700a9f7) |
| 52 | Reinstall E2E | NOT STARTED | Permanent deterministic suite required |
| 53 | Review A (six-month athlete) | NOT STARTED | Fresh agent, exact commissioned questions from the order |
| 54 | Review B (returning user) | NOT STARTED | Fresh agent, exact commissioned questions |
| 55 | Review C (reinstall/two devices) | NOT STARTED | Fresh agent, exact commissioned questions |
| 56 | Review D (product truth) | NOT STARTED | Fresh agent, exact commissioned question |
| 57 | Open debt triage | NOT STARTED | Every carried item: evidence/severity/consequence/recommendation/blocker?/founder? |
| 58 | H4 release blocker | BLOCKED-FOUNDER | Stays open until founder confirms live store listings changed; repository copy is not proof |
| 59 | Legal copy review gate | IN PROGRESS | Must verify FQ-5 approval from the decision record; if unprovable → founder release gate |
| 60 | Migration release table | COMPLETE-AUDIT | MIGRATION-RELEASE-GATES.md + D97-23 correction banner (135 HELD) |
| 61 | Campaign 6 test suites | IN PROGRESS | sixBlock 24, longitudinal 27, longTerm 27, applyRepeat 11, nutrition 10, lapse90 11, athlete180 11, relationship 12 + fix-batch pins; grows with remaining fixes |
| 62 | Quality gates | NOT STARTED | Final full-campaign regression + no-change laws + jargon + identity, then merged-main rerun |

## B. First addendum (Personalisation Dividend) requirements

| Req | Status | Evidence / remaining |
|---|---|---|
| Dividend as product law + evidence maturity + Block 1/3/6 | IN PROGRESS | Pinned in suites; PERSONALISATION-DIVIDEND.md (with the without-history counterfactual) NOT yet written |
| Visible accumulated history; no false certainty; intelligent non-change; continuity; no fake percentages; no anthropomorphism | COMPLETE-AUDIT | RELATIONSHIP-MOMENTS.md A/B/C/D classification (C=0); repo walkers (banned copy + percentages) in campaign6.longTerm |
| Final handover items A-H | NOT STARTED | Answered explicitly at handover time |

## C. Second addendum (Long-term relationship / loyalty) requirements

| Req | Status | Evidence / remaining |
|---|---|---|
| Five-promise audit + A-E input classification | IN PROGRESS | CHOICE-MEMORY.md (39 choices) + RELATIONSHIP-MOMENTS.md landed (0b383230); campaign6.relationship.test.js (12 invariants); REMAINING: consolidated classification table in PERSONALISATION-DIVIDEND.md |
| CHOICE-MEMORY.md | COMPLETE-AUDIT | Landed; F5/F8/F4 fixed, F3/F9 carried with rulings |
| RELATIONSHIP-MOMENTS.md | COMPLETE-AUDIT | Landed; B1/B4 candidates recorded, B2 founder copy question |
| WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md (ten questions per candidate; verdict A/B/C/D; DO NOT BUILD) | NOT STARTED | Commissioned, not optional |
| PERSONALISATION-DIVIDEND.md | NOT STARTED | Lead synthesis incl. counterfactual + nutrition dividend |
| REVIEW-E-relationship.md (nine-month payer, the EXACT twelve questions) | NOT STARTED | Fresh agent; twelve questions verbatim from the recovery order |
| Six-block + 180-day relationship sections | COMPLETE-IMPL | 392fa136 + ATHLETE-180-REPORT.md (nine-question framing to be corrected as superseded) |
| Relationship invariant tests | COMPLETE-IMPL | campaign6.relationship.test.js (12) |
| Anti-anthropomorphism + anti-manipulation audits | COMPLETE-IMPL | Repo walkers landed (abefab54 + relationship suite); formal handover answers at items 93/94 |
| Handover items 81-96 | NOT STARTED | Answered explicitly at handover time |

## D. Fix/disposition queue derived from the audits (all in-scope → FIX NOW)

R-4, R-6, R-8, R-11, R-12, R-14, R-15, R-16, R-17, R-18 dispositions;
S-2/S-3 narrow fix, S-5, migration-135 repair analysis; R-3 caller-graph
proof (ED-sensitive: repair only if a locked law mandates the source,
else BLOCKED-FOUNDER); R-9/R-13 dispositions. D92-11 (S-1) BLOCKED-LAW.
Landed already: P-1..P-6, R-1, R-2, R-5, R-7, R-10, F4/F5/F8.

## E. Mandatory documents checklist

CURRENT-LONG-TERM-JOURNEYS.md YES · PERSONALISATION-MATURITY.md YES ·
SIX-BLOCK-SIMULATION.md YES · LAPSE-MATRIX.md YES ·
REINSTALL-MATRIX.md **MISSING** · MULTI-DEVICE-MATRIX.md **MISSING** ·
MIGRATION-RELEASE-GATES.md YES · REVIEW-A/B/C/D/E **MISSING** ·
PERSONALISATION-DIVIDEND.md **MISSING** · CHOICE-MEMORY.md YES ·
RELATIONSHIP-MOMENTS.md YES · WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md
**MISSING** · CAMPAIGN6-COMPLIANCE-LEDGER.md YES (this file) ·
AUDIT-* extras retained (do not substitute).

## F. Standing confirmations (verified this date)

No production migration run; 132-135 unapplied (135 HELD defective);
049 HELD. D92-11 unchanged (drafted push path REVERTED uncommitted).
D91-25 not implemented; D91-24 not stealth-fixed. ED thresholds
unchanged; Article 9 unchanged. Free has no coaching. Trial law
untouched. Billing IDs/prices unchanged. No cardio, no AI, no auto
block transitions, no auto exercise changes, no EAS, no release.
