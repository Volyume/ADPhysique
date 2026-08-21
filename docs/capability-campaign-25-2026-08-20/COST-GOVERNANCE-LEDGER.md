# CC25 COST GOVERNANCE LEDGER (founder order 2026-08-20, §17)

Budget: max 2 pre-synthesis subagents (lowest suitable tier); max 2
red-team subagents post-architecture. Opus subagents forbidden without
explicit founder approval. Direct tools before agents.

| # | Agent | Question | Tier | Why lowest suitable | Result | Follow-up |
|---|---|---|---|---|---|---|
| RT-1 | Technical red team (post-architecture slot 1/2) | Break the CC25 architecture: contamination, provenance, sync, precedence, state machine | sonnet | Lowest SUITABLE: sustained multi-document adversarial reasoning over a 1,219-line architecture + repo verification; haiku judged unable to execute reliably (§1 conditions 1-4 met; judgement recorded here per §13) | pending | — |
| RT-2 | Product red team (slot 2/2) | Break it on inclusivity, UX dignity, claims, no-solution handling, medical overreach, Amendment §29 scenarios | sonnet | same justification | pending | — |

Direct-tool resolutions (no agent spent):
- I-1..I-4 sync contract: read conflict.js (102 ln), registry.js head,
  tables/weeklyCheckins.js head. Questions closed.
- K-1/K-2 consent + telemetry: R1 had already read Article9ConsentScreen;
  greps located record_health_consent RPC, consent_log migrations 019/024,
  engineTelemetry re-export. Closed.
- J-1..J-3 entitlements + a11y + Health surface: withProGuard call-site
  grep (18 sites, all nutrition/coaching), a11y prop counts (1,564 labels
  / 686 roles), SettingsHealthScreen read (device-health integrations,
  not capability). Closed at architecture grain.
- H-1 nutrition training-reads: grep of nutritionEngine + food/* — no
  direct workout reads in decision paths (display-level recompReframe
  already mapped by AUDIT-L). Closed.
- Subagent budget spent pre-synthesis: 0/2.

## CC26 (2026-08-20)

- Implementation subagents: 0/2 used. Entire build hands-on with
  direct tools.
- Red team: 1/1 used - Sonnet, general-purpose, single bounded pass
  over the diff + laws. Tier justification: adversarial review of
  Article 9 consent/erasure and sync-convergence code is above Haiku's
  reliability floor (quality variance matters on safety-adjacent
  surfaces); Opus is forbidden without founder approval and was not
  needed. Yield: 8 findings (2 blockers), all adjudicated and landed.
- Opus subagents: 0. Escalation requests: 0.
- Direct-tool substitutions: local Postgres execution testing of
  migrations 145-147 (no agent; caught the 147 CHECK regression);
  export-surface scope check (BACKUP_TABLES) by direct read.

## GAP-CLOSURE WORKSTREAM (2026-08-21, order section 29)

Budget: Haiku MAX 6, Sonnet MAX 1, Opus 0. Concurrency 1 (2 only for
independent research + mechanical repo work). No agent-to-agent
delegation. Maximums, not targets.

| Slot | Tier | Task | Output | Why needed | Result |
|---|---|---|---|---|---|
| 1 | Haiku | Condition-directory evidence batch (12 full workups + 3 currency checks + completeness candidates) | research/R7-condition-directory-evidence.md | ~15 populations x multiple authoritative sources = mechanical extraction vs fixed schema; R5 covers only 8 populations; direct hands-on would burn main-loop context on gathering (order 29.1) | COMPLETE (12/12, no blocks; adjudication pending) |
| 2 | Haiku | Injury/body-region evidence batch (order section 6 seed families by region + completeness) | research/R8-injury-directory-evidence.md | Largely NEW ground (R3 covered general reintroduction/pain-monitoring, not per-region injury guidance); same mechanical-extraction shape as slot 1 | COMPLETE (37 families; DEFECT: zero URLs returned; education lines unshippable as-is - both handled at adjudication: lead-written education, live-verified citations) |

| 3 | Haiku | Rule-shaped NULL-worklist curation (unilateralLoadable, gripDemand, bilateralUpper/Lower, floorAccess, balanceDemand, weightBearingHands follow-through) in CURATED_DEMANDS | demands.js curated entries + regenerated coverage report | ~150 mechanical cells against lead-written per-axis rules; the two judgement axes were curated by the lead first (d937134); order 29.7 lists exercise tagging as Haiku work | COMPLETE with lead corrections: 29 duplicate keys re-merged as per-field unions (whole-entry replacement was silently dropping earlier fields), three judgement fixes (Single-Arm fly one-side loadable; Sled Push needs both arms; Assault Bike does not), one stale pin re-expressed synthetically. Nine axes at 100 percent; 26 deliberate machine-design NULLs stand. |

| 4 | Haiku | Five family plans (GC-D8 list) authored in seedRoutines against the LOCKED red oracle (capabilityFamilyPlans suite entries written by the lead first) | seedRoutines.js plans + REQUIRED_EXERCISES + seed-key bump + registry FAMILIES rows | Plan data entry against a mechanical compatibility oracle is order 29.7 routine-data work; the lead defined audiences, thresholds and allowed quad options | COMPLETE with lead corrections: two chest flies replaced with shoulder work on the home plan's pull day, an off-scope rear-delt row swapped for calf work in the lower plan, one awkward note reworded. Oracle + wording sweep + walks green. |

Direct-tool substitutions log:
- Phase A traceability: entirely direct reads (0 agents).
