# Integration agent brief (stage 2: inventories into the corpus)

Authority: `05-DECISIONS.md` EL-2 to EL-6, EL-17, EL-21, EL-22;
`07-CORPUS-FORMAT.md`; `INVENTORY-BRIEF.md` (the inventory JSON shape);
`data/lead-overrides.json` (lead rulings that override inventory
rejections); `08-OPEN-DATASET-GAPS.md` and `data/audit/open-dataset-gaps.json`
(`resistance_missing` rows to add, `alias_of` rows to add as aliases).

## Job
1. Write `scripts/exercise-library/integrate-inventories.mjs`: reads every
   `data/inventory-*.json`, applies `lead-overrides.json` (reinstatements,
   aliases, the sandbag family which you author yourself within its cap
   using the same candidate shape and the same quality gate), adds the
   `resistance_missing` rows from the gap analysis (drafting their full
   candidate objects with the same derivation-then-override method), and
   appends every candidate to the right family module in
   `src/lib/exerciseCorpus/families/` as a corpus entry per 07 section 2:
   `overrides.demands` from `demandOverrides`, `overrides.laterality` from
   `laterality` where it differs from derivation, `overrides.difficulty`,
   `overrides.exerciseType` (carries and sleds: `duration` per EL-22),
   `loadCharacter`, `aliases`, `subregion`, `cue: ''` (cues are authored by
   the cue lane). The script is idempotent (re-running replaces the
   generated section of each family file between marker comments) and
   deterministic (stable ordering).
2. Tier registry: append every new name to the matching list in
   `src/lib/exercise/canonicality.js` (STAPLE, COMMON, SPECIALIST, NICHE,
   NEVER_AUTO) under a dated section comment per family; the guard
   requires every corpus name to be listed.
3. Derivation gaps the inventories reported: `sled`, `medicine_ball`,
   `sandbag`, `suspension` join `deriveEquipmentCategory`,
   `PROFILES_BY_CATEGORY` (sled and medicine_ball: `['full_gym']`;
   sandbag: `['full_gym','home_gym']`) and the demand derivation's
   implement sets; unit tests for each.
4. Run `node scripts/exercise-library/validate-corpus.mjs` and fix every
   failure in the DATA (never by weakening a rule): alias collisions,
   missing required subregions (assign from the movement and record in
   `data/subregion-assignments.json`), null demand axes (curate or mark
   `unknownAxes` with a reason), duplicate names against existing rows
   (drop the candidate and add its name as an alias instead). Then run
   `node scripts/exercise-library/audit/runAll.mjs` and report the new
   count, the tier distribution and the demand-axis null counts.
5. Verify: `npx eslint` on touched files; `npx jest src/lib/exerciseCorpus
   src/lib/__tests__/campaign16 src/lib/__tests__/exerciseMetadata
   src/lib/capability src/lib/exercise src/lib/__tests__/poolGenerator`;
   fix what you broke. Do not run the full suite.

## Hard bounds
Do not commit, push, stash or touch main. Do not rename any existing
name. No diagnosis words in any field. Report rather than interpret when
a candidate cannot be expressed in the format.

## Final report (cap 50 lines)
Final corpus count; rows added per family; rows dropped as duplicates
(with the alias they became); tier distribution; demand-axis nulls and
`unknownAxes` count; the validate-corpus and audit outputs (tail); lint
and jest tails verbatim; open questions.
