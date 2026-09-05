# Exercise library and alternative training expansion (campaign, 2026-09-05)

Founder brief (in chat, 2026-09-05): "VOLYUME — EXERCISE LIBRARY &
ALTERNATIVE TRAINING SYSTEM EXPANSION". One autonomous research, audit,
decision, implementation and verification task. Two objectives: a
market-leading, correctly tagged, capability-aware resistance-training
exercise corpus larger than the highest credible competitor count where
that can be done with real exercises; and alternative plan styles
(kettlebell, resistance circuits, other high-value families) integrated
into the existing plan / routine / workout architecture. Cardio logging
stays out of scope.

## Operating model for this campaign
- Lead (session model) owns ontology, identity policy, prioritisation
  philosophy, plan architecture, circuit semantics, evidence eligibility,
  representative review and integration.
- Lower-tier agents (sonnet / haiku, explicit model always) do
  inventories, research, bulk drafting, deterministic classification,
  validation scripts and regression summaries.
- Deterministic scripts live in `scripts/exercise-library/`; every
  machine-readable output lands in `data/` here.

## Documents (in dependency order)
- `01-SCHEMA-AND-CONSUMERS.md` — the current exercise contract, every
  metadata source and every consumer, verified against the tree.
- `02-CORPUS-AUDIT.md` — the current 551-row corpus: duplicates, naming,
  coverage matrices, eligibility, priority distribution.
- `03-MARKET-BENCHMARK.md` — competitor library counts and features,
  verified at research time with evidence links.
- `04-ALT-PLAN-RESEARCH.md` — how leading products model kettlebell,
  circuit and other alternative plans.
- `05-DECISIONS.md` — the lead's rulings: identity policy, target,
  prioritisation tiers, plan architecture, circuit semantics, evidence
  eligibility.
- Later documents are added as the campaign lands them.

## Recovery
Every agent brief is recorded on `docs/TASKBOARD.md` with its output
path. A dead agent is relaunched from its brief; a dead session resumes
from the last document present here and the board entry.
