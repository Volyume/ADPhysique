# 05 — Lead decisions (exercise library and alternative training expansion)

Authority: founder brief 2026-09-05; decision delegation D33 (best solution
for the app and its users, never effort). Every ruling below is checked
against the Section 2 inviolables (deterministic engine, ED-safety,
Article 9, no new dependencies, no cardio logging). Sources:
`01-SCHEMA-AND-CONSUMERS.md`, `02-CORPUS-AUDIT.md`,
`03-MARKET-BENCHMARK.md`, `04-ALT-PLAN-RESEARCH.md`,
`06-EVIDENCE-CONSUMERS.md`, and the code cited inline.

## EL-1 Target size and the claim

Verified benchmark (03): the highest CREDIBLE live built-in count is
JEFIT at 1,295, a live database enumeration that includes a cardio tag
(estimated 65 to 130 cardio rows). Fitbod advertises 1,000+. Lyfta
advertises 5,000+ but that is vendor-only, unverified and an order of
magnitude off every other product; it is not treated as credible.

Ruling: the internal target is a curated corpus of at least 1,500
canonical resistance-training exercises, built family by family under
EL-2, with a hard quality gate (EL-3) that decides the final number. The
margin over 1,295 is deliberate and the ceiling is what survives the
gate, not a round number.

Marketing claim: "one of the largest resistance-training exercise
libraries" is defensible once the count clears 1,300 real rows;
"the world's largest exercise library" is NOT defensible against the
Lyfta figure however hollow it looks, and is not made. Claims go through
the marketing claims gate as usual.

## EL-2 Canonical identity policy

One canonical row per DISTINCT TRAINING STIMULUS. Two names are separate
rows only if at least one of these differs in a way that changes what the
body does or what the coach should count: implement family (barbell,
dumbbell, kettlebell, cable, band, machine family, Smith, landmine,
suspension, bodyweight), loading vector or pulley height (high/mid/low,
incline/flat/decline), laterality (bilateral / unilateral / alternating),
support (chest-supported vs unsupported, seated vs standing where the
mechanics change, not merely the chair), grip when it changes the prime
mover or the demand (pronated / neutral / supinated, wide / close),
range or depth class (deficit, paused, pin, partial only where a
programme would prescribe it), or ballistic vs grind character.

NOT separate rows: spelling, abbreviations (DB / Dumbbell), word order
("Bench Press, Barbell" vs "Barbell Bench Press"), brand names with
identical mechanics (Hammer Strength vs "plate-loaded"), cosmetic
descriptors, and "with straps / with belt". Those become ALIASES.

Naming convention (matches the existing corpus): `[Implement] [Position
or Angle] [Movement] ([Modifier])`, Title Case, British English, no em
dash, e.g. "Incline Dumbbell Press", "Cable Row (Neutral Grip)",
"Kettlebell Swing (Single-Arm)". Existing names are never renamed
(canonical id is a hash of the name; history is keyed to it).

Aliases are a NEW additive field (`aliases`, JSON array of strings) on
the seed tuple and the exercises table, indexed by the search layer; an
alias may point at exactly one canonical row (guarded), never at two.

## EL-3 Quality gate for every row (old and new)

A row ships only if all hold: real movement attested by at least one
authoritative source (coaching or exercise-science literature, open
exercise datasets used as checklists only); distinct under EL-2;
complete under the current field contract (01) with no derived field
left to a runtime regex; every capability demand axis classified
(required / not required / null only where genuinely unknown, and every
null recorded in the coverage report); adapted-setup class assigned;
an explicit auto-generation tier (EL-5); a logging type the live screen
supports; rep and set defaults appropriate to its character; at least
one search alias where a common alternative name exists; and no
diagnosis-labelled claim anywhere.

## EL-4 Expansion by taxonomy (families and caps)

Families and approximate targets (caps, not quotas; the gate rules):
barbell 110 to 140 (incl. specialty bars only where the bar changes the
demand: trap bar, safety bar, cambered), dumbbell 160 to 200, cable 160
to 200, machines 170 to 220 (selectorised, plate-loaded, converging /
diverging, unilateral, Smith), kettlebell 90 to 120 (grind and
ballistic, single and double, bottoms-up, get-up family, windmill,
carries), bodyweight and calisthenics 170 to 220, resistance band 60 to
90, suspension trainer 40 to 60, landmine 30 to 45, medicine ball 15 to
25 (resistance and power throws only), sleds and loaded carries 20 to
30, specialty (chains, bands on bars, belt squat, GHD, reverse hyper,
Nordic bench, sissy squat, etc.) 30 to 50, power and Olympic-derived 20
to 30 (never-auto by default). Cardio machines and endurance modalities:
none, ever.

## EL-5 Prioritisation: the existing tier registry becomes complete

`src/lib/exercise/canonicality.js` already implements the brief's four
classes: STAPLE (A), COMMON (B), SPECIALIST and NICHE (C), NEVER_AUTO
(D), with unlisted names defaulting to SPECIALIST and a founder-ruled
gate in `selectExercisesForMuscle` that keeps staples first. No second
ranking engine is built.

Rulings: every seed row must appear in exactly one registry list (a new
guard fails the build on an unlisted seed name, so expansion can never
silently rely on the SPECIALIST default); new rows are classified by
prevalence in standard programming, technical complexity, equipment
practicality and whether the movement is normally a primary hypertrophy
or strength lift; every kettlebell ballistic, Olympic-derived, plyometric,
strongman implement and carry is NEVER_AUTO in ordinary plans
(reachable only through a style pool, EL-8); STAPLE and COMMON lists are
reviewed by the lead, SPECIALIST / NICHE / NEVER_AUTO by agents under
the rule "when in doubt, the safer tier".

## EL-6 Capability demands and adapted setup

The nine demand axes and the adapted-setup classifier are the only
mechanical-demand vocabulary; nothing new is added. Every new row is
classified through the same derivation plus a curated override table,
never a runtime regex; null stays a real state. The coverage scripts
(`scripts/demand-coverage-report.mjs`, `scripts/adapted-setup-coverage.mjs`)
and the registry guard are extended so a row with any unclassified axis
that the derivation cannot resolve must be listed in the curated table
with an explicit value or an explicit `unknown` reason; otherwise the
guard fails.

## EL-7 Evidence classes (Part XV ruling)

Facts (06): sets carry no provenance; the only eligibility lever is
`set_type`; superset membership is never snapshotted onto sets.

Ruling: one additive nullable column `workout_sets.evidence_class`,
stamped at WRITE time by the live screen from structure and exercise
metadata, never chosen by the user: null = conventional; `circuit` = the
set was logged inside a circuit group; `ballistic` = the exercise is a
ballistic movement (swing, clean, snatch, jerk, throw, jump);
`circuit_ballistic` = both. Exercise-side, ballistic character is a
derived field (`load_character`: grind / ballistic) on the metadata.

Comparability per consumer:
- Kettlebell GRIND sets (goblet squat, press, row, RDL, get-up): FULLY
  comparable everywhere. They are dumbbell-like loaded reps.
- CIRCUIT sets: per-muscle volume displays and the weekly coach volume
  matrix COUNT them (real loaded working sets); PR detection COUNTS them
  (a PR is a PR, CAP-14 precedent); e1RM trend, plateau detection, live
  load-progression learning, learned range fold, block seeding, adapted
  landmarks and programme-structure memory EXCLUDE them (the
  `deferredToManual` / `constrained` skip precedent, judging nothing,
  teaching nothing, erasing nothing); circuit progression has its own
  rule (EL-10).
- BALLISTIC sets: history and detail show them truthfully with a label;
  every learning consumer EXCLUDES them, and they do not count toward
  per-muscle hypertrophy set volume. They are not hypertrophy evidence
  and no equivalence is faked.

## EL-8 Alternative plans: curated templates in constrained pools

Research (04): every logger implements circuits as a superset primitive
of three or more; no product gates kettlebell ballistics mechanically;
the best libraries separate "equipment I have" from "style of session".

Ruling: alternative plans are CURATED, PARAMETERISED templates in the
existing library-plan model (`seedRoutines.js` LIBRARY_PLANS, tags,
collections) with generation and swaps constrained to a STYLE POOL. No
second engine. A style pool is a named, versioned list of canonical
exercise names plus the equipment profile it implies; the generator's
existing equipment filter and the tier gate read the pool as the
candidate set when a plan carries `style:<pool>`. Kettlebell ballistics
enter only through the kettlebell style pool and only at the
experienced level; beginner kettlebell templates are grind-only plus
two-hand swings, matching the RKC / StrongFirst competence ordering
(swing and get-up before one-arm and overhead ballistics).

## EL-9 Circuit model: the superset group, named

The live workout already cycles a group A → B → C, then rests, then
returns to A (`ActiveWorkoutScreen.js` group advance). A circuit is that
group with two additive attributes on `routine_exercises`: `group_kind`
(`superset` | `circuit`, null = superset) and `round_rest_seconds`.
Rounds are the members' `recommended_sets` (kept equal within a circuit
by the builder); station rest inside a round is zero (transition), the
group rest after the last station is the round rest; completion is when
every station has logged its rounds. Timed stations are NOT introduced:
no product surveyed has them in a set/rep logger, the live screen's
logging types would need a duration-per-station mode, and the brief
allows them only where current semantics support them safely. Reps and
load per station stay first-class.

## EL-10 Progression

Kettlebell grind templates reuse the existing rep-then-load double
progression unchanged. Kettlebell ballistic work progresses by reps per
set within a fixed set count, then by bell size, never by speed.
Circuits progress by rounds first (2 → 3 → 4 within the template's cap),
then by reps at the same load, then by load; round rest is a template
constant, never auto-shortened ("less rest is always better" is
rejected). All of it deterministic and visible in the template.

## EL-11 User intent and swaps

A style plan constrains generation and swap candidates to its pool; the
swap sheet says so and offers "Show all exercises" as an explicit
relaxation (user intent outranks inference). Ordinary plans never
receive kettlebell or circuit content because it now exists. Circuit
swaps must keep the group's compatibility (no two stations sharing a
primary muscle back to back is the existing pairing rule).

## EL-12 Library organisation

Collections gain style entries alongside the existing ones: Kettlebell,
Circuits, Bodyweight, Bands, Minimal equipment; the existing
"Dumbbells only" stays. Every plan card already shows days, level and
equipment; style plans show session length and the required implements.
Alternative plans are first-class library plans with the same coaching
and history.

## EL-13 Deliberately excluded

Cardio and endurance logging, EMOM / AMRAP / timed-station modes,
CrossFit scoring, calorie-burn estimates, medical safety labels,
demonstration video production, competitor text or media.
