# 04 — Exercise metadata schema proposal

The schema every exercise must carry so the Coach can build
anatomically-aware, equipment-aware, goal-aware plans. It extends what
exists (`01` 1.3) rather than replacing it, so existing data and sync
keep working. New fields are additive.

## Design decisions behind the schema

1. **One subregion taxonomy, not two.** Today the DB `subregion` column
   and the planEngine `POOL.sub` tags use different strings. The proposal
   adopts a single canonical per-muscle subregion vocabulary (table B
   below) and uses it everywhere.
2. **The library becomes the single source of truth.** planEngine's pool
   should be derived from the library (filtered by the new
   `equipment_profiles` and `subregion` fields) rather than hand-maintained
   in parallel. This kills the name-drift failure mode (gap C1). See `06`.
3. **Equipment splits into category + machine type.** A coarse `equipment`
   string stays for backwards compatibility and display, but selection
   logic reads the new granular fields.

## Table A — full field list

| Field | Type | Allowed values | Required? | Why |
|---|---|---|---|---|
| `name` | text | free | yes | identity; also the canonical-ID seed. |
| `primary_muscle` | text | one of the 16 muscle keys (chest, back, front_delts, side_delts, rear_delts, traps, biceps, triceps, forearms, abs, quads, hamstrings, glutes, calves, tibialis, neck) | yes | the muscle the exercise is programmed for. |
| `subregion` | text | per-muscle value from table B | yes | the core new requirement: lets the plan cover all of a muscle, not just its primary mover. |
| `secondary_muscles` | text[] | muscle keys | yes (may be empty) | secondary stimulus, used for fatigue and incidental volume. |
| `movement_pattern` | text | `horizontal_push`, `vertical_push`, `horizontal_pull`, `vertical_pull`, `squat`, `hinge`, `lunge`, `carry`, `rotation`, `isolation` | yes | pattern balance and antagonist pairing. Refines today's coarser set. |
| `force` | text | `push`, `pull`, `static` | yes | antagonist pairing and pattern checks. New. |
| `equipment` | text | display string (kept for back-compat) | yes | existing; used for the library filter label. |
| `equipment_category` | text | `barbell`, `dumbbell`, `cable`, `machine_selectorised`, `machine_plate_loaded`, `smith`, `bodyweight`, `band`, `kettlebell`, `landmine`, `other` | yes | granular equipment so plate-loaded, selectorised, Smith and cable are distinct. New. |
| `machine_type` | text | controlled vocab (table C) or null | only when category is a machine | which machine; required to guarantee machine-only coverage. New. |
| `equipment_profiles` | text[] | `full_gym`, `machines_cables`, `dumbbells_only`, `barbell_plates`, `home_gym`, `bodyweight` | yes | which equipment contexts this exercise is valid in. Moves planEngine's `eq` array onto the record so the pool can be generated from the library. New. |
| `laterality` | text | `bilateral`, `unilateral` | yes | volume accounting (a unilateral set is per side) and balance. New. |
| `compound_isolation` | text | `compound`, `isolation` | yes | existing; sequencing and rep-range defaults. |
| `difficulty` | int | 1 beginner, 2 intermediate, 3 advanced | yes | gate exercises by experience; keep beginners off high-skill lifts. New. |
| `machine_ok` | bool | true/false | yes | suitable for the machine-only pathway. Derivable from category but stored for fast filtering. New. |
| `home_ok` | bool | true/false | yes | suitable for a home/no-equipment plan. New. |
| `default_rep_min` / `default_rep_max` | int | — | yes | existing; rep-range defaults by exercise. |
| `fatigue_cost` | int | 1-10 | yes | existing; session fatigue budgeting and sequencing. |
| `stimulus_to_fatigue_ratio` | int | 1-10 | yes | existing; the SFR that hypertrophy selection optimises. |
| `cue` | text | short (<= ~120 chars) | yes | the "how to hit the area" coaching cue. Stored in the existing `notes` column or a new `cue` column. New (populated). |
| `alternatives` | text[] | exercise ids | optional | same-subregion, same-category swaps. Can be derived at runtime from subregion + category + equipment, so storing is optional; deriving is preferred to avoid staleness. |
| `is_custom` | bool | — | yes | existing; custom exercises sync, canonical seed locally. |

## Table B — canonical subregion vocabulary (the one taxonomy)

| Muscle | Subregions |
|---|---|
| chest | `upper`, `mid`, `lower`, `inner` |
| back | `lat_width` (vertical pull), `mid_back` (horizontal row / thickness), `lower_back` (erectors), `traps_upper` |
| front_delts | `anterior` |
| side_delts | `lateral` |
| rear_delts | `posterior` |
| traps | `upper`, `mid_lower` |
| biceps | `long_head`, `short_head`, `brachialis` |
| triceps | `long_head`, `lateral_head`, `medial_head` |
| forearms | `flexors`, `extensors`, `grip` |
| abs | `flexion`, `anti_extension`, `rotation`, `lower` |
| quads | `sweep` (vastus lateralis / overall), `rectus` (rectus femoris), `vmo` |
| hamstrings | `hip_hinge` (proximal bias), `knee_flexion` (distal bias) |
| glutes | `max`, `medius` |
| calves | `gastro`, `soleus` |
| tibialis | `tibialis` |
| neck | `flexion`, `extension`, `lateral` |

Note: `traps_upper` under back and `upper` under traps overlap; the
implementation keeps traps as its own muscle and back's `traps_upper` is
dropped in favour of tagging shrugs to `traps/upper`. Listed here so the
reconciliation is explicit.

## Table C — machine_type controlled vocabulary

Chest: `chest_press`, `incline_press`, `decline_press`, `pec_deck`.
Back: `lat_pulldown`, `assisted_pullup`, `seated_row`, `chest_supported_row`,
`high_row`, `low_row`, `straight_arm_pulldown`, `back_extension`,
`shrug_machine`.
Shoulders: `shoulder_press`, `lateral_raise`, `reverse_pec_deck`.
Arms: `preacher_curl`, `bicep_curl_machine`, `triceps_extension`,
`triceps_pushdown`, `assisted_dip`.
Legs: `leg_press`, `hack_squat`, `pendulum_squat`, `leg_extension`,
`lying_leg_curl`, `seated_leg_curl`, `standing_leg_curl`, `hip_thrust`,
`glute_kickback`, `hip_abduction`, `hip_adduction`, `calf_raise_standing`,
`calf_raise_seated`.
Core/other: `ab_crunch`, `cable_column`, `roman_chair`, `neck_machine`.

Plate-loaded/iso-lateral entries use `equipment_category =
machine_plate_loaded` with the same `machine_type` (e.g. an iso-lateral
row is `machine_plate_loaded` + `seated_row`/`high_row`).

## Storage and migration shape

- Local SQLite `exercises`: additive `ALTER TABLE ADD COLUMN` for
  `equipment_category`, `machine_type`, `force`, `laterality`,
  `difficulty`, `machine_ok`, `home_ok`, `cue`, `equipment_profiles`
  (stored as JSON text). Canonical exercises are seeded locally, so no
  server migration is needed for them.
- Custom exercises sync; the cloud `exercises`-equivalent (if any custom
  fields sync) would need the same additive columns. To confirm during
  implementation: whether custom-exercise sync carries these fields or
  whether they stay local. Flagged as an open question.
- The `RAW` table moves from a positional tuple to a keyed object (or a
  wider tuple with a documented header) so the extra fields are
  maintainable. Either is fine; an object is clearer at this width.

## Why each new field earns its place

- `subregion` (unified) + `force` + `movement_pattern` (refined): the
  three fields the selector needs to guarantee weekly coverage and pair
  antagonists.
- `equipment_category` + `machine_type` + `machine_ok` + `home_ok` +
  `equipment_profiles`: the fields that make the machine-only and
  home pathways real and verifiable, and that let the planEngine pool be
  generated from the library.
- `laterality`: correct volume accounting (a unilateral row is one set
  per side) and balance.
- `difficulty`: keep beginners off high-skill lifts in generated plans.
- `cue`: the user-facing "how to hit this area" the brief asks for.
- `alternatives`: powers subregion-aware swaps (fixes gap C6).
