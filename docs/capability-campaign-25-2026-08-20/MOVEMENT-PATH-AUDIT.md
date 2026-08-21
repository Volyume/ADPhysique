# MOVEMENT-PATH ONTOLOGY AUDIT (gap-closure Phase C; order sections 8, 9, 16)

Question under audit: can the live ontology deterministically represent
the questions specific injury/condition support requires? Test applied
per candidate field (order section 8 + GC-D3): "what product decision
cannot be made correctly without this?" — evaluated against the order's
section 16 movement-constraint fixtures and the directory question sets.

## 1. What the live system can already express (verified in source)

Three grains compose, all consent-gated, all deterministic:

1. **Ten demand axes** (`capability/demands.js`, 551 rows tagged,
   87–100% per axis): position enum, floor_access, overhead_position,
   grip_demand (none/supportive/bar), unilateral_loadable,
   bilateral_upper, bilateral_lower, axial_load, impact, balance_demand.
2. **Movement families** (`exercise/movementFamily.js` + subregion
   pass-through) — a RICHER vocabulary than the architecture text
   suggests: back {vertical_pull, horizontal_lat, upper_mid_row,
   shoulder_extension, spinal_erector, face_pull}; quads {squat_press,
   knee_extension}; chest {flat, incline, decline}; delts
   {overhead_press, lateral_raise, horiz_abduction}; biceps {short_head,
   long_head, brachialis}; hamstrings/glutes {hip_extension,
   knee_flexion, activator, pumper, stretcher}; calves {gastro, soleus};
   triceps {overhead, pushdown}; abs {flexion, anti_extension,
   rotation}. `rule_kind='family'` matches these via movementFamilyOf's
   subregion pass-through, and FAMILY_LABELS carries calm display names
   for every value (verified movementFamily.js:277-279).
3. **Exercise grain**: `exercise` exclusion rows + `exercise_allow`
   allowances + laterality qualifiers (33.8), custom exercises with
   metadata parity (34.1). Partial-range capability is exercise-grain BY
   LAW (33.13) — depth/ROM axes stay rejected.

## 2. Section 16 fixture walk (the required proof)

| Fixture | Expressible today? | Mechanism |
|---|---|---|
| Shoulder: overhead restricted, horizontal press allowed | YES | demand overhead_position |
| Shoulder: horizontal press problematic, neutral-grip pulling allowed | YES | family rules flat+incline+decline (chest); pulling untouched |
| Elbow: loaded elbow flexion restricted, pressing unaffected | YES | family rules short_head+long_head+brachialis (all curl work); optional pulling families if the user confirms they aggravate |
| Wrist: bar grip restricted, cuff/strap/cable permitted | YES | grip_demand 'bar' exclusion + allowances |
| Spine: axial load restricted, supported machine work permitted | YES | demand axial_load + balance 'supported' browse |
| Hip: deep hip flexion restricted, other lower-body permitted | YES | family squat_press (+ abs flexion where relevant) + exercise-grain allowances for tolerable depths (33.13) |
| Knee: deep flexion restricted, hip-dominant available | YES | families squat_press + knee_extension + knee_flexion excluded; hip_extension + spinal_erector remain |
| Ankle: dorsiflexion-limited squat pattern, supported alternatives remain | YES | family squat_press + per-exercise allowances; machine/supported work via balance_demand |
| Unilateral temporary restriction on top of permanent opposite-side difference | YES | two rows: baseline laterality X + episode laterality Y (union semantics, 4.4) |

Every section 16 fixture is expressible WITHOUT new axes. Phase H
implements these as automated fixtures.

## 3. Candidate-field verdicts (order section 8 list)

ADDED (one axis passes the test):

- **weight_bearing_hands** (boolean; NULL=unknown) — load borne through
  the palms with extended wrists (push-up/plank/crawl class, handstand,
  front-rack positions). The decision that CANNOT be made today: a
  wrist/hand load restriction (hand arthritis, wrist injury — common
  populations) excludes bar-grip work via grip_demand, but push-ups,
  planks, mountain climbers, bear crawls and rollouts carry
  grip_demand 'none' and pass as compatible while loading the wrist
  hardest of all. No family isolates them (they scatter across chest
  flat, abs anti_extension, quads). Deterministic consumers: the
  wrist/hand injury profiles and the grip/dexterity + arthritis
  condition profiles (Phase B directory); the eligibility resolver.
  Derivable at high precision by name class; gym-dependent cases stay
  NULL.

REJECTED (fail the "which decision needs it" test; CC-R8 grounds
re-applied to the new consumer class per GC-D3):

- Primary joint actions / loaded joint positions as generic fields — no
  closed deterministic consumer; clinical drift; profile question sets
  + families cover the decisions.
- Shoulder IR/ER demand — profile-curated aggravator lists (closed
  exercise-id lists per injury profile) answer the same questions
  without a 551-row axis nobody can honestly tag.
- Elbow flexion/extension demand — biceps/triceps families ARE the
  loaded elbow flexion/extension classes; pulling families cover the
  compound tail.
- Forearm pronation/supination — grip variants are separate library
  rows by naming convention; exercise-grain suffices.
- Wrist flexion/extension as separate axes — weight_bearing_hands +
  grip_demand cover the product decisions; finer grain is clinical
  assessment territory.
- Spinal flexion/extension/rotation under load — abs families flexion /
  anti_extension / rotation + spinal_erector family + axial_load axis
  already express all four decision classes.
- Hip flexion/extension/abduction/adduction demands — squat_press /
  hip_extension families + muscle grain (adductors) + exercise grain.
- Knee-flexion depth, range/depth requirement — 33.13 law: exercise
  grain (exclude aggravators, allow tolerable variants). Re-affirmed.
- Ankle dorsiflexion/plantarflexion — squat_press family + calf
  families + allowances; an axis would drive no decision the family
  rules do not.
- Open/closed chain, fixed/free path — no deterministic decision
  changes on it (equipment category already separates machine/free
  where selection cares).
- Body position, balance/stability, external support, impact,
  unilateral/bilateral, independently loadable sides, floor transfer,
  machine/free/cable path, setup burden — ALL ALREADY EXIST (axes,
  equipment category, estimateSessionMinutes transition model 33.19).
- Session-level energy/pacing — 33.12 levers; CLIN-5..7 boundary
  stands.

## 4. Fidelity work this phase performs (order section 9)

1. Add weight_bearing_hands: local migration + cloud migrate_151 (NOT
   applied), derivation rules + curated list, seed/backfill in the C32
   mould, custom-exercise single-axis ask inherits it, resolver +
   picker + coverage report + floors.
2. Close the NULL worklists where honest values exist
   (CC27-DEMAND-COVERAGE.md): unilateralLoadable 70 (rule: TRUE only
   where inherently one-side-loadable — single-X names, iso-lateral,
   independent-arm plate-loaded; FALSE where inherently two-handed;
   machine-design-dependent rows STAY NULL deliberately — CAP-8
   honesty: Volyume cannot know one gym's machines; allowances are the
   designed answer), axialLoad 34 (curate against the derivation
   definition), overheadPosition 29, gripDemand 24, bilateralUpper 13,
   floorAccess 6, balanceDemand 5, bilateralLower 3.
3. Formalise the FAMILY QUESTION VOCABULARY for directory profiles: a
   closed export naming which family keys a profile question may write
   rules against (exactly the section 1 list; validated by test) so
   profile content can never invent a family key.
4. Aggravator lists: profile schema carries closed exercise-id lists
   (canonical ids) validated against the seed at test time.

## 5. Verdict

The ten-axis ontology + family vocabulary + exercise grain is PROVEN
sufficient for every section 16 fixture; ONE axis (weight_bearing_hands)
is added for the wrist/hand class where a real eligibility hole exists;
everything else on the section 8 candidate list is rejected with its
failing test recorded. Status: PROVISIONAL until the Phase B injury
evidence batch lands; any additional expressibility need it surfaces
re-runs the same test before the axis set freezes.
