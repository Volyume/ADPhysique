# 02 — Corpus audit (current built-in exercise library)

Authority: founder brief 2026-09-05 Part III ("AUDIT THE CURRENT 551+
CORPUS") and Part XXII (quality guards); `05-DECISIONS.md` EL-2 (canonical
identity), EL-3 (quality gate), EL-5 (tier registry). Every finding below
is backed by a script under `scripts/exercise-library/audit/` and a JSON
report under `data/audit/`; run `node scripts/exercise-library/audit/runAll.mjs`
to regenerate all eight deterministically from the live seed. Tools used:
`scripts/exercise-library/loadSeed.mjs` (`loadSeedRows()`),
`src/lib/exercise/canonicality.js` (tiers), `src/lib/capability/demands.js`
(demand axes), `src/lib/planEngine.js` `SUBREGION_REQUIREMENTS`,
`src/lib/poolGenerator.js` pool screens.

## 1. The count (`data/audit/count.json`)

**552 rows** (not 551 — `loadSeed.mjs`'s own header explains the off-by-one
in the older tooling: a quote-character blind spot skipped `Farmer's Walk`).

| Axis | Breakdown |
|---|---|
| Tier (`autoTier`) | common 207, niche 163, specialist 87, staple 67, never_auto 28 |
| Equipment | bodyweight 128, barbell 113, dumbbell 103, cable 97, machine 90, smith_machine 10, **kettlebell 6**, ez_bar 5 |
| Equipment category | bodyweight 107, barbell 105, dumbbell 103, cable 97, machine_selectorised 66, band 21, machine_plate_loaded 16, landmine 13, smith 10, other 8, kettlebell 6 |
| Movement pattern | isolation 285, push 68, pull 67, squat 59, hinge 58, carry 8, plyometric 4, core 1, lunge 1, power 1 |
| Primary muscle | back 65, abs 62, quads 57, chest 56, triceps 41, hamstrings 38, glutes 37, biceps 36, rear_delts 24, front_delts 23, forearms 22, calves 21, traps 19, side_delts 17, neck 14, adductors 11, tibialis 9 |
| Exercise type | weight_reps 527, duration 15, weighted_bodyweight 10 |
| Laterality | bilateral 495, unilateral 57 |
| Position | standing 284, lying 123, seated 96, mixed 27, kneeling 22 |

Full per-movementFamily and per-adaptedSetup-class breakdowns are in
`count.json`.

## 2. Top systemic findings, ranked by impact on generation and search

**F1 — Kettlebell is 6 rows against an EL-4 target of 90–120**, the single
largest gap in the corpus (`count.json` perEquipment); every
kettlebell-specific class (ballistics, get-up, bottoms-up, double-bell,
carries) is effectively absent — feeds the kettlebell-style-pool (EL-8).

**F2 — Subregion/role coverage has 57 profile-level gaps below the 3
STAPLE-or-COMMON threshold** (`coverage.json` `subregionGaps`, computed with
the app's own `SUBREGION_REQUIREMENTS` + `familySatisfiesRole`, not a
re-derived approximation). Every non-`full_gym` profile is under-served for
back's `vertical_pull` role (0 STAPLE/COMMON options in `home_gym`,
`dumbbells_only`, `barbell_plates` — there is no non-machine, non-cable
vertical pull a dumbbells-only or barbell-only user can be generated).
`glutes/pumper` and `rear_delts/face_pull` are at 0 for four of six
profiles each. Full table in section 6.

**F3 — 88/552 rows (16%) are unlisted in `canonicality.js` and silently
default to SPECIALIST** (`eligibility.json` `unlistedDefaultSpecialist`).
This is EL-5's own documented "safer default", not a bug, but it means the
expansion's registry work has a known, counted backlog before day one.

**F4 — 12 `duration`-type rows pass every pool-generation screen and are
selectable by the automatic generator with a rep-range/weight prescription
they cannot honestly use** (`eligibility.json`
`durationRowsThatPassPoolScreen`): Wall Sit, Plank, Side Plank, Hollow Body
Hold, L-Sit Hold, Copenhagen Plank, Dead Hang, Glute Squeeze Hold, Adductor
Squeeze (Ball), Weighted Plank (Plate on Back), Cable Anti-Rotation Hold
(Half-Kneeling), Reverse Plank. Verified by grep: `exerciseType` is checked
nowhere in `poolGenerator.js` or `planAutoGen.js`. `Plank` and `Side Plank`
are COMMON tier, i.e. reachable without a special programming reason.

**F5 — 6 confirmed same-stimulus duplicate pairs** (`duplicates.json`;
detail in section 3).

**F6 — 59 rows have no `subregion` where their muscle carries
`SUBREGION_REQUIREMENTS`, and silently inherit a per-muscle DEFAULT
fallback role for coverage purposes** (`metadata-anomalies.json`
`missingSubregionWhereRequired`). This is exactly the defect class
`movementFamily.js`'s own docstring says was fixed for back/quads in C16
job 3 ("a straight-arm pulldown counted as a vertical pull... a deadlift
counted as a lat exercise") — but the fix was never extended past those two
muscles. Concretely: `Dumbbell Pullover` (chest, subregion null) inherits
`DEFAULT_SUBREGION.chest = 'flat'`, so a pullover — whose primary target is
explicitly called "genuinely disputed between chest and lats" in
`canonicality.js`'s own CONTESTED list — silently counts toward the flat
bench-press coverage role. Breakdown: chest 10, hamstrings 11, triceps 5,
quads 7, calves 3, abs 23.

**F7 — Rep-range metadata mismatches on 11 rows** whose `exerciseType` is
`weight_reps` but whose rep range (20–120) only makes sense as seconds,
steps or reps-in-a-conditioning-sense, not a lifting rep count
(`metadata-anomalies.json` `repRangeAbsurd`): Toe Walk, Plate Pinch, Rice
Bucket, Sled Push, Sled Pull, Prowler Drag, Stair Running, Mountain
Climber, Agility Ladder Drills, Rope Jump, Heel Walk. Most (Sled Push/Pull,
Prowler Drag, Stair Running, Agility Ladder Drills, Rope Jump) are already
NEVER_AUTO and pool-screened out, but Toe Walk, Heel Walk, Plate Pinch,
Rice Bucket and Mountain Climber are not, and carry misleading rep-count
defaults today.

## 3. Duplicate/near-duplicate detail (`data/audit/duplicates.json`)

Exact string duplicates: **0** (the seed parser rejects them). Near-duplicate
detection ran two ways: (a) normalised name (case/punctuation/DB-BB-KB
folding, word order removed) — 11 pairs, of which 2 are actually
**legitimately distinct** despite folding to the same bag of words (`Cable
Fly (Low to High)` vs `Cable Crossover (High to Low)`-style pairs: pulley
DIRECTION reverses, which EL-2 names as a distinguishing "loading vector"
dimension, and both forms are independently listed in `canonicality.js`).
(b) identical (primaryMuscle, equipmentCategory, movementPattern,
subregion, laterality) tuple with a small, judged token diff — 247 pairs,
241 correctly resolved `legitimately_distinct` by an explicit token
dictionary keyed to EL-2's dimensions (implement, loading vector, support,
grip/attachment, range/depth, movement identity), 6 `likely_same_stimulus`.
21 pairs are flagged for lead review (`nearDuplicatesByTupleFlaggedForLeadReview`).

A third check, run after the first two turned up two confirmed
copy-pasted rows, compares every OTHER seeded field (not just the derived
5-tuple) for byte-identical values under a different name — 97 such
groups exist, but this signal is **noisy on its own** (e.g. all four
`Neck Flexion/Extension/Lateral Flexion (Machine)` rows share one
templated rep/fatigue/SFR block despite being different movements) and is
reported for cross-reference only, never used to auto-reclassify a pair.

**The five most important consolidation candidates**, each independently
verified against the raw `seedExercises.js` tuple:

| Canonical (keep) | Alias (fold in) | Evidence |
|---|---|---|
| Tricep Pushdown (Rope) | Rope Pushdown | Both STAPLE in `canonicality.js`; "Rope Pushdown" omits the muscle name for the same movement. |
| Machine Tricep Extension | Triceps Extension Machine | Both COMMON; diff is singular/plural spelling only. |
| Cable Pull-Through | Cable Pull-Through (Glute) | `seedExercises.js:829` and `:861` — byte-identical row data. |
| Nordic Curl | Nordic Hamstring Curl | `seedExercises.js:817-818` — byte-identical row data. |
| Dumbbell Overhead Tricep Extension | Overhead Dumbbell Extension | `seedExercises.js:761-762` — byte-identical row data. |

A sixth, `Machine Crunch` / `Ab Crunch Machine`, is also recommended
(same station; `MACHINE_TYPE_BY_NAME` in `exerciseMetadata.js` only ever
keyed one of the two names, evidence the app's own machine-type table never
distinguished them). **All six per EL-2: fold via the new `aliases` field,
never a rename** — the canonical id is a hash of the name and history is
keyed to it.

## 4. Aliases needed (`data/audit/aliases-needed.json`)

96/552 rows got at least one conservative, evidence-checked alias
suggestion (107 total: 100 high-confidence, 7 medium). Two generation
methods: (a) systematic DB/BB/KB shorthand for every row containing
"Dumbbell"/"Barbell"/"Kettlebell" as a whole word (high confidence,
generated mechanically, not hand-picked); (b) a curated table of 27 real
gym/coaching alt-names (RDL, OHP, Military Press, Hex Bar Deadlift, British
"Press-Up" for Push-Up, GHR, TGU, T2B, Farmer Carry, Skull Crusher, etc.),
each checked to exist against the live seed before inclusion. Two curated
candidates collided with an EXISTING distinct row name and were dropped
here rather than silently merged (`skippedCollisions`) — both are the same
pairs already flagged in `duplicates.json` (`Good Morning (Barbell)` /
`Good Morning`, and the Hammer-Strength/Plate-Loaded chest press pair).
456 rows got no suggestion — most single-word or highly specific names
(e.g. "Copenhagen Plank") have no common alternative worth inventing.

## 5. Naming hygiene (`data/audit/naming.json`)

The existing 552 names are clean: **zero** trailing/leading spaces, double
spaces, em dashes, en dashes, capitalisation defects, US spellings, old
comma-form names, unmatched parens, or leading articles. One abbreviation
in a canonical name (`Single-Leg Romanian Deadlift (DB)` — "DB" belongs in
an alias, not the canonical form, per EL-2). 15 rows carry a brand-ish
term; 11 are "Smith Machine", which is this corpus's own genericised
equipment-category name (`equipmentCategory: 'smith'`), not a proprietary
alternative competing with a generic form — not actionable. The 4 that
are actionable: `Hammer Strength Chest Press`, `Machine Row (Hammer
Strength)`, `TRX Row`, `TRX Curl`, `Swiss Ball Leg Curl` (EL-2: brand names
with identical mechanics become aliases, generic form stays canonical).

## 6. Coverage gaps by family (feeds the inventory agents)

Full matrices (equipmentCategory×primaryMuscle, movementPattern×
primaryMuscle, laterality×muscle, position distribution, every demand
axis's true/false/null split with the null row list, adaptedSetup class
distribution) are in `coverage.json`. The subregion/role gap table
(< 3 STAPLE-or-COMMON options per equipment profile), which is what the
expansion must close first:

| Muscle | Role | Worst profiles (STAPLE/COMMON count) |
|---|---|---|
| back | vertical_pull | home_gym 0, dumbbells_only 0, barbell_plates 0 |
| back | horizontal_row | bodyweight 1, home_gym/dumbbells_only 2 |
| hamstrings | knee_flexion | home_gym/dumbbells_only/barbell_plates/bodyweight all 0 |
| hamstrings | hip_extension | bodyweight 0, machines_cables 1 |
| glutes | pumper | home_gym/dumbbells_only/barbell_plates/bodyweight all 0 |
| glutes | activator | home_gym/dumbbells_only 1, bodyweight 2 |
| quads | squat_press | bodyweight 0 |
| quads | knee_extension | home_gym/dumbbells_only/barbell_plates/bodyweight all 0, even full_gym/machines_cables only 2 |
| chest | incline | bodyweight 0 |
| chest | flat | barbell_plates 1 |
| rear_delts | face_pull | home_gym/dumbbells_only/barbell_plates/bodyweight all 0 |
| rear_delts | horiz_abduction | barbell_plates 1 |
| triceps | overhead | bodyweight 0, barbell_plates 1 |
| calves | soleus | bodyweight 0 |
| calves | gastro | barbell_plates 2, bodyweight 1 |
| biceps | long_head | bodyweight 0, machines_cables/barbell_plates 1 |

Reading it: `rear_delts/face_pull` and `hamstrings/knee_flexion` and
`glutes/pumper` are structurally absent from every non-full-gym profile —
a dumbbells-only, home-gym or bodyweight-only user cannot be generated a
real face pull, hamstring curl, or glute-isolation exercise today. This is
the single highest-leverage list for the expansion's family targets
(EL-4), because it names the exact (muscle, role, equipment profile)
triples STAPLE/COMMON-tier new rows must fill, not just raw counts.

## 7. Eligibility (`data/audit/eligibility.json`)

32/552 rows are never auto-eligible (28 NEVER_AUTO tier + 4 more caught
purely by the pool screen: `other`/missing equipmentCategory or an empty
`equipmentProfiles`). 25 rows are difficulty-3 (**beginner-experience-only**
gate, `planEngine.js:1479` — not a universal screen, and not merged into
"never eligible" here). 88/552 unlisted rows default to SPECIALIST (F3
above). 12 `duration` rows pass every screen (F4 above) — recommended for
an explicit `exerciseType` exclusion in `generatePoolFromLibrary` or
`isHypertrophyExercise`, a decision for the lead since it changes generator
behaviour.

## 8. Metadata anomalies (`data/audit/metadata-anomalies.json`)

Zero `demandValidationErrors` across all 552 rows (the app's own
contradiction check already passes). Zero inverted rep ranges. Zero
`compoundIsolation`/`movementPattern` contradictions. Zero secondary-
muscle-equals-primary. One `seated`+`floorAccess` combination
(`Z-Press`) — verified INTENTIONAL: `CURATED_DEMANDS` in `demands.js`
comments "seated ON THE FLOOR" explicitly, so this is not a bug. 82 rows
are bodyweight-isolation with `total` load semantics — flagged, not
asserted wrong, since `exerciseMetadata.js`'s own `BW_LOADED_PROFILES`
comment explains this is deliberate (a plank or crunch CAN take external
load). 59 missing-subregion rows (F6) and 11 absurd rep-range rows (F7) are
the two genuine findings, detailed above. 7 `carry`-pattern rows are
`exerciseType: weight_reps` (reps standing in for steps) — flagged for
lead judgement on whether that convention should become `distance`.

## 9. Detail quality (`data/audit/detail-quality.json`)

**0/552 rows have a `cue`.** This is not a per-row gap: `rowToExercise()`
in `seedExercises.js` never sets `cue` for any canonical insert — it is a
corpus-wide field that has never been populated. Against EL-3's "complete
under the current field contract" gate, this is the single largest open
item, bigger than any duplicate or naming issue. The corpus's real
per-exercise prose today is `adaptedSetup` (234/552 rows, 345 entries,
median 126 characters, 0 US spellings, 0 em dashes — clean).

## 10. Recommendations for the lead

**Consolidate (alias, never rename):** the 6 pairs in section 3.
**Re-tier:** none at high confidence — the 88 unlisted-SPECIALIST rows (F3)
are a registry-completeness gap, better closed as new registry entries
during the expansion than reclassified here without EL-5's family review.
The 12 duration rows (F4) are a generator-eligibility question (should
`exerciseType` gate pool inclusion?), not a tier question. **Author `cue`
for the corpus** is a founder-scale decision (552 rows) outside this
audit's scope — surfaced, not started.
