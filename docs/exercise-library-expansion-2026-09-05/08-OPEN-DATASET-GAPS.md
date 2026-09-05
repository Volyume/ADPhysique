# Open-dataset gap analysis (objective second lens)

Deterministic cross-check of three open, legally-usable exercise name
lists against the 552-row corpus (`data/seed-export.json`) and every
family-agent candidate/alias in `data/inventory-*.json`. Produced by
`scripts/exercise-library/gap-analysis.mjs` (rerun confirmed
byte-identical output). Raw data: `data/open-datasets/*.json`. Full
per-row output: `data/audit/open-dataset-gaps.json` (2,623 rows).

Cardio logging is out of scope throughout, per the brief.

## Datasets fetched

| Dataset | Rows | Licence | Fetch method |
|---|---|---|---|
| free-exercise-db (yuhonas) | 876 | Unlicense (public domain) | `raw.githubusercontent.com` fetch of `dist/exercises.json`, HTTP 200 first try |
| exercises-dataset (hasaneyldrm) | 1,324 | MIT (code/structure/names/instructions); media (c) Gym visual, NOT copied here | Cloned via `add_repo` (public read), confirmed root `LICENSE` file is MIT |
| wger (exerciseinfo API) | 871 | CC-BY-SA (per-entry data); code AGPL-3.0-or-later. Names used as a checklist only; no description text copied | 9 paginated `GET /api/v2/exerciseinfo/?language=2` calls, all HTTP 200 first try, no retries needed |

All three matched or exceeded 03-MARKET-BENCHMARK's reported counts
(876 vs "800+", 1,324 exact, 871 vs "845+"). Only English-named
translations were kept from wger (871 of 871 exercises had one).

## Coverage table

Percent of each dataset's raw row count in each bucket:

| Dataset | matched | alias_of | variant_not_distinct | out_of_scope | junk | resistance_missing |
|---|---|---|---|---|---|---|
| free-exercise-db (876) | 17.7% | 7.6% | 1.5% | 16.1% | 0.2% | **56.8%** |
| exercises-dataset (1,324) | 11.6% | 12.3% | 2.3% | 6.6% | 0.0% | **67.2%** |
| wger (871) | 16.1% | 6.1% | 2.3% | 12.6% | 0.6% | **62.3%** |

`matched` = exact or curated-synonym hit against a corpus/candidate name
(fully covered already, not in the gap file). `alias_of` and
`variant_not_distinct` rows ARE in the gap file (283 and 63 rows) because
they are real, actionable alias suggestions even though the underlying
movement already exists. `junk` is 7 rows total (`Clean`, `Snatch`, `Row`,
`Dips`, `Lunges` used bare with no implement or qualifier — too vague to
be a distinct row under EL-2, consistent with the corpus never using a
bare generic-movement-word name itself).

## How inflated the raw counts are

This is the benchmark-relevant finding. Each dataset's raw count includes
a real chunk that is not resistance-training content at all, once
`stretching`/`cardio` category tags (free-exercise-db, exercises-dataset)
and category + name-keyword rules (exercises-dataset's stretch-tagged rows
hide under body-part categories like "waist"/"shoulders"; wger's hide
under "Arms"/"Legs"/"Back") are applied:

- **free-exercise-db**: 141 of 876 (16.1%) are cardio/stretching by its
  own `category` field alone.
- **exercises-dataset**: 88 of 1,324 (6.6%) caught by keyword/equipment
  rules even though its category scheme has no "stretching"/"mobility"
  bucket at all — every one of those 88 was hiding under a body-part tag
  (e.g. "assisted lying calves stretch" tagged `lower legs`).
- **wger**: 110 of 871 (12.6%), same hidden-under-limb-category pattern
  (e.g. "Standing Calf Stretch" tagged `Legs`).

Separately, within the `resistance_missing` pile itself, collapsing
common stance/grip/angle/assistance descriptors (a reporting-only pass,
not a reclassification) shows real but modest naming-verbosity inflation:
free-exercise-db 501 raw -> 447 distinct cores (-11%), wger 553 -> 519
(-6%), exercises-dataset 902 -> 694 (-23%, the most redundant of the
three: 71 of its rows are duplicates of the same movement spelled
"Lever ..." for machine, now folded into `machine`/`smith_machine`
equipment; it also carries `(back pov)`/`(side pov)` camera-angle
duplicates and gendered "(male)"/"(female)" pose duplicates that this
script strips before matching).

**Caveat on `resistance_missing` itself (evidence-before-assertion):**
2,623 gap rows sound large, but the classifier is a token-overlap +
curated-synonym screen, not a semantic one. During tuning it initially
mis-flagged "Barbell Deadlift" and "Barbell Squat" as missing (corpus
calls them "Conventional Deadlift" / "Barbell Back Squat") purely
because an extra/missing "barbell" token drops Jaccard just under the
0.75 gate — now handled by an explicit implicit-default-equipment rule
(barbell and dumbbell only, exact-match only, always logged as
`variant_not_distinct` with a note, never silently absorbed). The same
class of miss likely still exists for movements the script's curated
table doesn't know about. **Every `resistance_missing` row needs EL-3
lead triage before it is treated as a real gap** — this script is the
screen, not the gate.

## `resistance_missing` by equipment family (distinct proposed names, deduped across all 3 datasets)

| Equipment | Count |
|---|---|
| bodyweight | 732 |
| dumbbell | 349 |
| cable | 232 |
| barbell | 207 |
| machine | 94 |
| kettlebell | 72 |
| ez_bar | 29 |
| band | 30 |
| smith_machine | 35 |
| medicine_ball | 22 |
| sled | 6 |
| suspension | 6 |
| landmine | 0 |
| **Total distinct** | **1,814** |

Reading this against EL-4's caps: **landmine came back with zero
resistance_missing rows** across all three datasets, and suspension only
6 — the strongest evidence yet that those two family agents were not
under-reaching. The largest single signal is **power/Olympic-derived**:
the corpus/candidates currently hold only Power Clean, Clean Pull, Push
Press, Snatch Grip Deadlift/Shrug, Kettlebell Snatch and Kettlebell Clean
and Press — none of Clean and Jerk, Power Snatch, Split Jerk, Hang Clean,
Snatch Balance or Speed Box Squat, all of which surfaced independently
from at least one dataset. EL-4's 20-30 cap for that family looks
essentially unbuilt, which is a materially different finding from the
"family agents found fewer than expected because the corpus is already
deep" pattern seen elsewhere.

## The 20 most notable misses

Hand-picked from the 1,814 distinct `resistance_missing` candidates for
plausibility, name recognisability and how directly they map to an EL-4
family gap (not a random or scored top-20 — a lead call). Proposed
name / primaryMuscle / equipment / movementPattern are script-derived
suggestions for triage, not verified classifications.

1. Barbell Clean and Jerk — power/Olympic family gap (see above)
2. Barbell Power Snatch — same
3. Barbell Snatch Balance — same
4. Barbell Speed Box Squat — accommodating-resistance specialty work
5. Barbell Reverse Band Deadlift — same
6. Barbell Rack Delivery — Olympic positional drill, distinct from the existing Rack Pull
7. Kettlebell Bent Press — classic RKC/StrongFirst grind lift, not in the 90-120 KB family yet
8. Kettlebell Figure 8 — common KB conditioning/skill move
9. Kettlebell Bottoms-Up Clean (from hang) — distinct from the existing Bottoms-Up Press/Carry
10. Kettlebell Double Snatch — double-bell family gap
11. Dumbbell Deadlift (conventional stance) — every existing dumbbell deadlift row is Romanian-hinge; a squat-stance conventional pull is a different hinge depth/pattern
12. Cable Judo Flip — named functional cable movement
13. Cable Deadlift — cable-stack deadlift pattern, distinct implement from every existing deadlift row
14. Machine Hack Calf Raise — calf raise performed on a hack-squat machine, distinct rack angle from the existing calf-raise set
15. Medicine Ball Overhead Slam — surprising given how common it is in general programming
16. Medicine Ball Scoop Throw — power-throw family, EL-4's 15-25 med-ball cap
17. Sled Reverse Flye — sled-anchored band-free rear-delt pull, distinct implement from every existing reverse fly
18. Sled Overhead Backward Walk — loaded-carry variant, distinct from farmer/suitcase carries already present
19. Suspension TRX Roll-Out — ab/anti-extension suspension movement (note: one dataset tags a near-identical "fallout" bodyweight, worth a lead check against this)
20. Band Good Morning (Pull-Through) — hip-hinge band pattern distinct from the existing banded hip thrust/deadlift rows

(Dropped from an earlier draft of this list on verification against the
actual script output: "Dumbbell Cuban Press" — the corpus already has a
bare "Cuban Press" row, and this script's implicit-default-equipment fix
correctly reclassifies the dataset's "Dumbbell Cuban Press" as an alias
suggestion, not a gap. Left in as a worked example of why every row here
needs the same lead check before it is treated as confirmed.)

## Alias suggestions

**283 rows** classified `alias_of` (a dataset name is a literal or
near-literal synonym for an existing corpus/candidate row — free-exercise-db
67, exercises-dataset 163, wger 53) plus **63 rows** classified
`variant_not_distinct` (matches only after stripping a cosmetic
modifier — "standing", "medium grip", the implicit-default-equipment
cases above). Every one of these 346 rows carries the specific
corpus/candidate name it should become an alias of in
`data/audit/open-dataset-gaps.json` (`alias_of` field) — ready to fold
into EL-2's `aliases` array once a lead skims the list (several are
low-value machine-translation artefacts, e.g. wger's `Bench Press
Isometric`, that a lead may choose to drop rather than alias).

## Script and reruns

`scripts/exercise-library/gap-analysis.mjs` has no network calls, no
randomness, and reruns to byte-identical JSON (verified). It reads only
`data/seed-export.json` and `data/inventory-*.json` from this campaign
folder plus its own `data/open-datasets/*.json` snapshots — rerun it any
time family candidates change to see the count move.
