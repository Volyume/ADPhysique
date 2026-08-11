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
| 4 | Prove personalisation compounds | COMPLETE-IMPL | PERSONALISATION-DIVIDEND.md: computed counterfactual (chest B6 start 11 vs 6 without history; calves peak 15 vs 21 - protective) + seven behaviours with pins |
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
| 15 | Manual overrides over time | COMPLETE-AUDIT | Engine pins + AUDIT-MODES-AND-MANUAL.md (set/removal/reinstall/mode-return traced; F9 expiry = recorded founder question) |
| 16 | Coaching mode changes | COMPLETE-AUDIT | D97-10 + AUDIT-MODES-AND-MANUAL.md matrix (manual disables all 8 Apply sites; coached bounded by age gate + safety hold; no mode can roll a block) |
| 17 | Calm mode over time | COMPLETE-AUDIT | AUDIT-MODES-AND-MANUAL.md (ratchet binds sync only, user exits freely; no retroactive teaching, no catch-up; no surface narrates the calm period) |
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
| 30 | Progress history at scale | COMPLETE-IMPL | R-24/R-25 clean; R-2, R-15 landed; R-13 measured in Phase 40 (verdict LOW, T-8 fixed the real cost) |
| 31 | Old record edits/deletions | COMPLETE-IMPL | R-23 clean; R-8 landed (morning_weights update/soft-delete pair, tombstone syncs); R-9 carried with D97-3 (one founder decision) |
| 32 | Reinstall same account | COMPLETE-IMPL | Audit + REINSTALL-MATRIX.md + the Phase 52 executable E2E (campaign6.reinstall.test.js, 9 tests through the real init path and real appliers) |
| 33 | Migration 132 contract | COMPLETE-AUDIT | S-10/S-11 proven in scratch cluster; hard release gate confirmed; NOT run |
| 34 | Migrations 134/135 contract | COMPLETE-IMPL | S-12/S-13 proven; 135 REPAIRED unapplied (route A+C: corrected tie-break + deterministic re-id + local v72; scratch-cluster and behavioural proofs; release condition recorded) |
| 35 | adaptation_events restore (FR-C4-3) | COMPLETE-AUDIT | S-4: product consequence proven (revert memory, add-frequency cap, Engine Log); carried to founder under FR-C4-3 with evidence |
| 36 | Notification pref multi-device (FR-C4-2) | COMPLETE-IMPL | S-2 landed (guarded stamps, all writers); S-3 tombstones + the dual-family architecture stay with FR-C4-2 (founder) |
| 37 | Two-device training | COMPLETE-AUDIT | MULTI-DEVICE-MATRIX.md walks the commissioned scenario step-by-step with pins; residuals S-19/S-6/S-7 recorded for triage |
| 38 | Offline for weeks | COMPLETE-IMPL | S-21/S-22 clean; S-5 landed (offline never spends the delete budget) |
| 39 | Timezone/DST/clock | COMPLETE-IMPL | AUDIT-CLOCK-SCALE-LOCAL-PARTNER.md; T-1 (DST streak grid) and T-2 (local-midnight block starts) FIXED and verified in Europe/London + America/New_York; quiet hours/morning rows CLEAN; no travel mode |
| 40 | Data scale/performance | COMPLETE-IMPL | Measured: T-8 rowToCamel hot path FIXED (4.8x); T-9/R-13 measured verdict LOW (6.6ms/yr) accepted; remaining IMPROVEMENT rows in triage |
| 41 | Row cap/pagination | COMPLETE-IMPL | The 38-read ROW-CAP TABLE delivered; T-12 (cheers) and T-13 (four watermarked pulls) FIXED so truncation becomes catch-up; the rest verdicted per row |
| 42 | Local-only data truth | COMPLETE-IMPL | Full inventory delivered (T-28 clean rows); T-16 FIXED (impermanence stated with privacy in the FAQ pair); T-17 (backup scan URIs) in triage |
| 43 | Partner long-term | COMPLETE-IMPL | Audited; T-18 FIXED (signals scoped to this week); T-12 FIXED; remove/replace/tier/lapse paths verdicted; no new social scope |
| 44 | Plan archive/history | COMPLETE-IMPL | With Phase 9 (D97-12/13/16/17; P44 items landed 4ef410c3) |
| 45 | Personalisation copy maturity | COMPLETE-AUDIT | AUDIT-MATURITY-AND-SIX-MONTHS.md block-language table; banned-vocabulary CLEAN; M-1/M-3 frozen-clause maturity = the B1 founder-gated copy candidate |
| 46 | Non-change as mature decision | COMPLETE-IMPL | Six-state reachability table delivered; M-6 (safety veto now truthfully flagged), M-7 (manual ownership spoken), M-8 (cause-agnostic unjudged), M-9 (no 'No changes needed.') all FIXED; the safety COPY line itself remains B2 founder-gated |
| 47 | Long-term safety | COMPLETE-AUDIT | No-learning-around-safety pinned at every layer (relationship suite, sixBlock, athlete180, S-20); thresholds untouched |
| 48 | Six-month Free experience | COMPLETE-IMPL | Walked in the maturity audit: coherent self-directed training; M-13 FIXED (the one coaching leak found); upsell cadence CLEAN (2/day 8/week budget, one banner) |
| 49 | Six-month Pro experience | COMPLETE-AUDIT | One-system walk: 7 of 9 chain edges genuinely wired; M-21 (next block → nutrition adjustment edge) characterised only - Section 2 calorie territory, founder queue |
| 50 | 180-day athlete E2E | COMPLETE-IMPL | campaign6.athlete180.test.js (11 tests, 517c2cc3) - deterministic, real chain, all commissioned beats; ATHLETE-180-REPORT.md reconciled to it |
| 51 | 90-day lapse E2E | COMPLETE-IMPL | campaign6.lapse90.test.js (11 tests, 6700a9f7) |
| 52 | Reinstall E2E | COMPLETE-IMPL | campaign6.reinstall.test.js: real fresh DB via real init (full schema + 72 migrations on real SQLite), real appliers, 9 pins incl. tombstones, receipts, ledger protection, photo local-only |
| 53 | Review A (six-month athlete) | COMPLETE-ACTIONED | REVIEW-A-six-month.md landed (11 findings + 3 false alarms); ALL ELEVEN dispositioned under D97-25: RA6-1/2(voice)/3/5/7/10/11 FIXED with pins (incl. new campaign6.dividend.test.js), RA6-2(threshold)/4(probing)/6/8/9 founder queue with rationale - see D97-RULINGS.md D97-25 |
| 54 | Review B (returning user) | COMPLETE-ACTIONED | REVIEW-B-returning.md landed (9 findings); ALL NINE dispositioned under D97-25: RB6-1/3/4/5/6/8/9 FIXED with pins, RB6-2 split (claim half fixed; safety half FOUNDER-GATED, ED-adjacent), RB6-7 founder queue with R-16 - see D97-RULINGS.md D97-25 |
| 55 | Review C (reinstall/two devices) | COMPLETE-ACTIONED | REVIEW-C-sync.md landed (8 DEFECT, 2 LATENT, 3 false alarms); ALL dispositioned under D97-25: RC6-1/2/3/4/5/7/8/9/10 FIXED with pins (reinstall E2E rebuilt on the real apply path), RC6-6 recorded as a MANDATORY release preflight in migrate_135 + MIGRATION-RELEASE-GATES.md; matrices corrected |
| 56 | Review D (product truth) | COMPLETE-ACTIONED | REVIEW-D-truth.md landed (14 findings); ALL dispositioned under D97-25: RD6-1/2/5/6/7/8/9/10/11/12/13/14 FIXED with pins, RD6-3/RD6-4 copy halves fixed with detection-basis + contiguity + LOCKED_COPY halves to the founder queue - see D97-RULINGS.md |
| 57 | Open debt triage | COMPLETE-AUDIT | TRIAGE-2026-08-11.md: every carried item with the six fields; the complete founder queue; final migration release table |
| 58 | H4 release blocker | BLOCKED-FOUNDER | Stays open until founder confirms live store listings changed; repository copy is not proof |
| 59 | Legal copy review gate | COMPLETE-AUDIT | FQ-5 approval PROVEN from DECISIONS-2026-07-09.md:2697-2699 ('Approve all', stamp-only landing 2026-08-10); C6 changed no consent/legal copy |
| 60 | Migration release table | COMPLETE-AUDIT | Final table in TRIAGE-2026-08-11.md (134 → 132 → 133; repaired 135 after the v72 build; 049 HELD) + MIGRATION-RELEASE-GATES.md history |
| 61 | Campaign 6 test suites | COMPLETE-IMPL | Twelve permanent suites: sixBlock 24, longitudinal 27, longTerm 44, applyRepeat 11, nutrition 10, lapse90 11, athlete180 11, relationship 12, reinstall 9, evidencedClaims 11, pendingCascade.flush 6, coachOutputReid 3 - plus the fix pins in existing suites (handover item 77) |
| 62 | Quality gates | COMPLETE-IMPL | Branch gates green 2026-08-11: campaigns 1-6 suites 423/423; identity invariant clean; lint clean; full bar 830 suites / 10,161 passed (parallel) and 10,161 passed (--runInBand rerun); the one intermittent failure class is hermetically closed (RE6-5) with the residual recorded as a WATCH item in D97-RULINGS; merged-main rerun follows the merge and its counts land in handover items 1-2 |

## B. First addendum (Personalisation Dividend) requirements

| Req | Status | Evidence / remaining |
|---|---|---|
| Dividend as product law + evidence maturity + Block 1/3/6 | COMPLETE-IMPL | PERSONALISATION-DIVIDEND.md delivered with the computed counterfactual and the seven commissioned behaviours pinned |
| Visible accumulated history; no false certainty; intelligent non-change; continuity; no fake percentages; no anthropomorphism | COMPLETE-AUDIT | RELATIONSHIP-MOMENTS.md A/B/C/D classification (C=0); repo walkers (banned copy + percentages) in campaign6.longTerm |
| Final handover items A-H | COMPLETE-IMPL | Answered explicitly in CAMPAIGN6-FINAL-HANDOVER.md (F carries the B2-gated caveat honestly) |

## C. Second addendum (Long-term relationship / loyalty) requirements

| Req | Status | Evidence / remaining |
|---|---|---|
| Five-promise audit + A-E input classification | COMPLETE-IMPL | CHOICE-MEMORY.md + RELATIONSHIP-MOMENTS.md + campaign6.relationship.test.js + the consolidated A-E classification in PERSONALISATION-DIVIDEND.md §3 |
| CHOICE-MEMORY.md | COMPLETE-AUDIT | Landed; F5/F8/F4 fixed, F3/F9 carried with rulings |
| RELATIONSHIP-MOMENTS.md | COMPLETE-AUDIT | Landed; B1/B4 candidates recorded, B2 founder copy question |
| WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md (ten questions per candidate; verdict A/B/C/D; DO NOT BUILD) | COMPLETE-AUDIT | Delivered: five candidates scored on the ten questions; VERDICT C with recorded revisit trigger; nothing built |
| PERSONALISATION-DIVIDEND.md | COMPLETE-IMPL | Delivered with the computed counterfactual, A-E input classification, nutrition dividend, honest weaknesses |
| REVIEW-E-relationship.md (nine-month payer, the EXACT twelve questions) | COMPLETE-ACTIONED | REVIEW-E-relationship.md landed (twelve verdicts: 7 STRONG, 4 ADEQUATE, 1 WEAK on visibility); ALL FIVE findings dispositioned under D97-25: RE6-1/3/4/5 FIXED with pins, RE6-2 recorded as magnitude evidence on the D97-3 founder question |
| Six-block + 180-day relationship sections | COMPLETE-IMPL | 392fa136 + ATHLETE-180-REPORT.md (nine-question framing to be corrected as superseded) |
| Relationship invariant tests | COMPLETE-IMPL | campaign6.relationship.test.js (12) |
| Anti-anthropomorphism + anti-manipulation audits | COMPLETE-IMPL | Repo walkers landed (abefab54 + relationship suite); formal handover answers at items 93/94 |
| Handover items 81-96 | COMPLETE-IMPL | All 16 answered explicitly in CAMPAIGN6-FINAL-HANDOVER.md; item 95 filled from the actioned Review E; item 96 answers the nine-month loyalty question from shipping behaviour |

## D. Fix/disposition queue derived from the audits (all in-scope → FIX NOW)

R-4, R-6, R-8, R-11, R-12, R-14, R-15, R-16, R-17, R-18 dispositions;
S-2/S-3 narrow fix, S-5, migration-135 repair analysis; R-3 caller-graph
proof (ED-sensitive: repair only if a locked law mandates the source,
else BLOCKED-FOUNDER); R-9/R-13 dispositions. D92-11 (S-1) BLOCKED-LAW.
Landed already: P-1..P-6, R-1, R-2, R-5, R-7, R-10, F4/F5/F8.

## E. Mandatory documents checklist

CURRENT-LONG-TERM-JOURNEYS.md YES · PERSONALISATION-MATURITY.md YES ·
SIX-BLOCK-SIMULATION.md YES · LAPSE-MATRIX.md YES ·
REINSTALL-MATRIX.md YES · MULTI-DEVICE-MATRIX.md YES ·
MIGRATION-RELEASE-GATES.md YES · REVIEW-A/B/C/D/E YES (all five landed) ·
PERSONALISATION-DIVIDEND.md YES · CHOICE-MEMORY.md YES ·
RELATIONSHIP-MOMENTS.md YES · WHAT-VOLYUME-HAS-LEARNED-FEASIBILITY.md YES · CAMPAIGN6-COMPLIANCE-LEDGER.md YES (this file) ·
AUDIT-* extras retained (do not substitute).

## F. Standing confirmations (verified this date)

No production migration run; 132-135 unapplied (135 HELD defective);
049 HELD. D92-11 unchanged (drafted push path REVERTED uncommitted).
D91-25 not implemented; D91-24 not stealth-fixed. ED thresholds
unchanged; Article 9 unchanged. Free has no coaching. Trial law
untouched. Billing IDs/prices unchanged. No cardio, no AI, no auto
block transitions, no auto exercise changes, no EAS, no release.
