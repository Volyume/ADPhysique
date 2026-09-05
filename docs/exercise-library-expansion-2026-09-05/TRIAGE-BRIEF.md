# Gap-triage agent brief (shared)

Authority: `05-DECISIONS.md` EL-2 (identity), EL-3 (quality gate), EL-5
(tiers), EL-22; `INVENTORY-BRIEF.md` (candidate object shape and closed
vocabularies); `08-OPEN-DATASET-GAPS.md` (why most "missing" rows are
not real misses).

## Input
`data/audit/open-dataset-gaps.json`: rows with
`classification === 'resistance_missing'` filtered to YOUR
`datasetEquipment` group. The dataset names are lower-case and often
quirky ("arm slingers hanging bent knee legs", "air bike"); many are
stretches, mobility drills, cardio, gendered duplicates "(male)" /
"(female)", or cosmetic variants of rows Volyume already has.

## The known set
Corpus names and aliases (`data/seed-export.json` field `name`, plus
`data/audit/aliases-needed.json`), every `data/inventory-*.json`
candidate name and its aliases, and `data/lead-overrides.json`. A
dataset row that maps to any of these is NOT an add.

## Output
`data/gap-triage-<group>.json`:
```json
{ "group": "bodyweight", "generatedAt": "2026-09-05",
  "counts": { "add": 0, "alias": 0, "not_distinct": 0, "false_positive": 0, "out_of_scope": 0, "junk": 0 },
  "verdicts": [
    { "name": "...", "dataset": "...", "verdict": "alias", "target": "<corpus or candidate name>", "why": "..." },
    { "name": "...", "dataset": "...", "verdict": "add", "candidate": { /* full candidate object per INVENTORY-BRIEF */ }, "why": "..." }
  ] }
```
Verdicts: `false_positive` (the screen missed a match; name the target),
`alias` (a real synonym; becomes an alias of the target), `not_distinct`
(cosmetic or set-level variant under EL-2; name the target),
`out_of_scope` (cardio, stretch, mobility, yoga, sport drill, gendered
duplicate), `junk` (unattested or nonsense), `add` (a real, attested,
distinct resistance movement a good coach would write down for someone;
full candidate object with derivation-checked demand overrides exactly
as INVENTORY-BRIEF requires, tier per EL-5, carries and sleds as
`duration` per EL-22).

Expect `add` to be a small minority. Do not pad. Every `add` must cite a
source. Every verdict has a one-line `why`. Process EVERY row in your
group; the counts must sum to the group's row count.

## Hard bounds
Write only your triage JSON. Do not touch src/. Do not commit, push,
stash or touch main. Do not run the test suite.

## Final report (cap 30 lines)
The counts; the full list of `add` names with tiers; the ten hardest
calls; any vocabulary gap.
