# Market benchmark — resistance-training exercise libraries

Research date: 2026-09-05. Every figure was checked against a live page on that date via WebSearch/WebFetch; URL and fetch date given per figure. Where no live figure was found this says "not found live" plus the last dated source found, marked as such. Nothing below is fabricated or inferred silently — estimates are labelled as estimates with reasoning.

## Per-product findings

**Fitbod** — "Explore over 1000 exercises" (App Store, apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543, fetched 2026-09-05). A third-party review (fitnessdrum.com) separately claims "1,600+" — unverified, not corroborated on any Fitbod-owned page. Cardio/mobility/pregnancy-safe exercises are explicitly INSIDE the count (same App Store text); no split given. Equipment: dumbbell, barbell, bench, machine, bodyweight. Custom exercises: feature confirmed to exist (help-centre article), limits not found live. Filters: muscle group, equipment, keyword. Muscle model: target area only, no confirmed primary/secondary split. Demos: "Hi-res, multi-angle videos" (real video). Naming: `[Equipment][Position][Movement]` e.g. "Barbell Incline Bench Press"; Fitbod's own copy frames some entries as "a variation on" a parent movement (parent/variant relationship, not a flat list) — source: fitbod.me/exercises/* (fetched 2026-09-05). Pricing tier for library: not found live.

**JEFIT** — **"1295 EXERCISES FOUND"**, the live unfiltered result count on jefit.com/exercises (fetched 2026-09-05) — a database enumeration, not marketing prose. Cardio is one of 11 muscle-group filter tags (with Abs, Back, Biceps, Chest, Forearms, Glutes, Shoulders, Triceps, Upper/Lower Legs), so cardio sits inside the 1295 with no isolated count. Equipment: Body Weight, Bands, Barbell, Bench, Dumbbell, Exercise Ball, EZ Curl Bar, Kettlebell, Cardio Machine, Strength Machine, Pullup Bar, Weight Plate. Custom exercises: reported, not verified live. Filters: muscle, equipment. Muscle model: target muscle group(s) listed, no confirmed split. Demos: images + text confirmed live; "HD video" claimed elsewhere but not confirmed on the fetched page. Naming: `[Equipment] [Movement] (modifier)` e.g. "Barbell Bench Press (Close Grip)", "Barbell Landmine One-Arm Row" — each a separate URL. Aliases: CONFIRMED ABSENT — a user forum post (support.jefit.com/hc/en-us/articles/201509944) explicitly flags no alternate-name lookup exists. Pricing tier: web database is open with no login; in-app gating not confirmed live.

**Hevy** — **"400+ high-quality exercises"** (hevyapp.com/features/exercise-library/, fetched 2026-09-05). Cardio explicitly inside the count ("some cardio activities"), not separable. Equipment: barbell, plate, dumbbell, kettlebell, machine, band, suspension kit, bodyweight. Custom exercises: free tier capped at 7, paid ($2.99/mo) unlimited. Filters: equipment, muscle target, search. Muscle model: "muscle targets," no confirmed split. Demos: "a demonstrational animation" (animation/GIF-style, not stated as full video). Naming: REVERSED order `[Movement] ([Equipment])` e.g. "Bench Press - Close Grip (Barbell)", "Shrug (Barbell)" — capitalisation of the equipment suffix is inconsistent live ("(Barbell)" vs "(barbell)" both seen on hevyapp.com/equipment/barbell/, fetched 2026-09-05). Pricing: full library free at every tier; only the custom-exercise cap is paywalled.

**Strong** — **"over 200 built in exercises... including Instructions and Videos"** (help.strongapp.io/article/97-create-custom-exercises, fetched 2026-09-05). App Store listing (apps.apple.com id464254577, fetched 2026-09-05) confirms cardio is inside scope ("a comprehensive range of cardio and strength exercises"), not separable. Equipment, filters, muscle model, naming convention: not found live on either fetched page. Custom exercises: supported (dedicated help article), no cap found live. Demos: "Video or image instructions... step by step instructions," plus "a growing library of animated videos." Pricing tier: not confirmed live.

**Alpha Progression** — no Alpha-Progression-owned page fetched stated a figure (alphaprogression.com/en/glossary, fetched 2026-09-05, says only "an extensive database of exercises"). Three THIRD-PARTY numbers conflict and do not reconcile: fitnessdrum.com review states "over 621 exercises" (fetched 2026-09-05); a separately-surfaced review states 795 with all equipment enabled in the user's gym profile, dropping to 661 with common accessories deselected. Both reviews independently describe the same mechanism — the app shows only the subset matching the active equipment profile — so the true ceiling is likely near 795, with variable subsets shown per user. Demos: "a demonstration video (often with multiple angles)" plus per-exercise history. Custom exercises, filters, muscle model, pricing: not found live. Credibility: unclear (conflicting figures, no vendor figure found).

**Boostcamp** — the only page with a number, boostcamp.app/exercises (fetched 2026-09-05), is headed "30+ Exercise Guides" and states "30 exercises" — a curated marketing/guide page (6 equipment tags: Barbell, Dumbbell, Kettlebell, Machine, Bodyweight, Cable), NOT the in-app database. Boostcamp's core product imports third-party coach programmes ("11,000+ Workout Programs," boostcamp.app/programs, fetched 2026-09-05) — a different product shape entirely. Actual in-app exercise-database size: not found live.

**Caliber** — TWO vendor figures conflict, fetched the same day: caliberstrong.com/workout-app/ says "700+ exercises"; the App Store listing (apps.apple.com id1482405410) says "access 800+ exercises" (both fetched 2026-09-05). A third-party review separately cites "more than 500 exercises... alphabetized and searchable... filter by muscle group and equipment" — lower than either vendor figure. Custom exercises: supported (create custom exercises and supersets). Demos: step-by-step video + coach tips. Pricing tier: not confirmed live. Credibility: unclear, internally inconsistent even within Caliber's own channels.

**RP Hypertrophy** — App Store listing (apps.apple.com id1555614554, fetched 2026-09-05) states only **"250+ technique videos"** — a video count, not a total exercise-database figure; no live source gives a distinct-exercise total. Custom exercises: reported (add/remove from programmed workouts), not directly quoted. Pricing tier: not confirmed live.

## Other resistance-training apps with a stated library size

- **Gymverse** (Fitness22) — gymverse.app (fetched 2026-09-05): "500+" against "Professional Exercise Videos." Equipment/filters/custom not found on the fetched page.
- **Lyfta** (found via research, not in the original list, included because it advertises a stated size and is squarely a resistance log/planner) — lyfta.app/exercises (fetched 2026-09-05) header: **"5000+ Exercises & Form Guides"** — over 3x the next-highest figure here, vendor marketing only, no independent corroboration. Treat with real scepticism: this scale is a known symptom of bulk-importing a large scraped set (see ExerciseDB API below, 11,000+) with heavy micro-variant duplication rather than genuinely distinct movements. Muscle filters seen live: Cardio, Chest, Back, Biceps, Triceps, Quadriceps, Hamstrings, Shoulders, Hips, Waist, Upper Arms, Calves, Forearms, Neck. Custom exercises and full-library access reported free at all tiers per user reviews.
- **Setgraph**: no public count found live; users can add missing exercises.
- **Liftin'**: no public total found live; one source noted "50 new exercises" recently added to an unstated base.
- **GymRun**: Android-only in sources found (no App Store listing located); described only qualitatively ("huge," "extensive," "customizable"), no number found live.
- **Dr. Muscle** — App Store (apps.apple.com id1073943857, fetched 2026-09-05): **"500+ exercises."** Custom exercises supported. No video/demo claim on that listing.
- **JuggernautAI** — official site (juggernautai.app, fetched 2026-09-05) states BOTH "over 250 exercises in our database" AND "Over 300 detailed exercise technique videos" on the SAME page — an internal vendor inconsistency, flagged as such. A third-party review states: "The exercise library is missing a lot of movements" — a concrete search-quality complaint.

## Benchmark table

| Product | Advertised count (exact quote) | Cardio/mobility inside count? | Custom exercises | Demos | Naming pattern | Credibility |
|---|---|---|---|---|---|---|
| Fitbod | "over 1000 exercises" | Yes | Yes, limits not found live | Multi-angle video | `[Equip][Position][Movement]`, parent/variant | advertised-by-vendor |
| JEFIT | "1295 EXERCISES FOUND" (live db) | Yes (Cardio is a tag) | Reported, not verified | Images+text; video reported | `[Equip] [Movement] (modifier)` | live self-counted db — strongest here |
| Hevy | "400+ high-quality exercises" | Yes | Free 7-cap / paid unlimited | Animation | `[Movement] ([Equip])`, reversed, inconsistent case | advertised-by-vendor |
| Strong | "over 200 built in exercises" | Yes | Yes, no cap found | Video/image + text | Not found live | advertised-by-vendor |
| Alpha Progression | 621 / 661 / 795 (conflicting, third-party) | Unclear | Not found live | Multi-angle video + history | Not found live | unclear/conflicting |
| Boostcamp | "30 exercises" (guide page, NOT in-app db) | N/A, different product shape | Not found live | Video (guide page) | Not found live | vendor, but marketing page not app db |
| Caliber | "700+" (site) vs "800+" (App Store), inconsistent | Unclear | Yes | Step-by-step video | Not found live | unclear/inconsistent |
| RP Hypertrophy | "250+ technique videos" (not a db total) | Unclear | Reported | Video | Not found live | advertised-by-vendor (video only) |
| Gymverse | "500+" (video count) | Unclear | Not found live | Video | Not found live | advertised-by-vendor |
| Lyfta | "5000+ Exercises & Form Guides" | Unclear | Yes (reported) | HD video | Not found live | advertised-by-vendor, unusually large, unverified |
| Setgraph / Liftin' / GymRun | not found live | — | User-added (Setgraph); reported editable (GymRun) | — | — | unclear |
| Dr. Muscle | "500+ exercises" | Not found live | Yes | Not found on listing | Not found live | advertised-by-vendor |
| JuggernautAI | "over 250" AND "300+" (same page, inconsistent) | Not found live | Not found live | Video | Not found live | advertised-by-vendor, internally inconsistent |

## HIGHEST CREDIBLE CURRENT BUILT-IN COUNT

**JEFIT, 1,295 exercises** — the live result count on JEFIT's own public, unfiltered, searchable database (jefit.com/exercises, fetched 2026-09-05). This is stronger evidence than every other figure here: it is the count the running product returns for itself, not marketing prose asserting a round number — the closest thing to independently verified reachable without a paid account.

Cardio DOES inflate this: "Cardio" is one of 11 muscle-group tags alongside Abs, Back, Biceps, Chest, Forearms, Glutes, Shoulders, Triceps, Upper/Lower Legs. No live source isolates the cardio-only sub-count.

**Estimate of strength-relevant portion (reasoning shown, not a fact):** a naive even split across 11 tags would put ~118 per tag; a cardio-machine movement space (treadmill/bike/rower/elliptical protocols) is typically narrower than a resistance muscle group's equipment x angle x grip permutations, so cardio is likely under that naive average. Best estimate: cardio occupies roughly 5-10% of 1,295 (65-130 entries), leaving an estimated **~1,165-1,230 strength-relevant entries**. This is an estimate resting on an unverified distribution assumption, not a counted fact.

Separately, NOT folded into the ruling above: **Lyfta advertises 5,000+** (lyfta.app/exercises, fetched 2026-09-05) — far larger than JEFIT's, but excluded from "credible" because it is unverified vendor copy only, with no live browse-counter analogous to JEFIT's, and a scale (>3x the next entry) typical of bulk-imported/duplicated sets. If the lead wants Volyume's target framed against the highest ADVERTISED figure rather than the highest CREDIBLY EVIDENCED one, this is the number, with this caveat attached every time it is cited.

## Variant naming conventions

Two incompatible conventions are in live use:
1. **Equipment-first**: `[Equipment][Position][Movement] (modifier)` — Fitbod ("Barbell Incline Bench Press") and JEFIT ("Barbell Bench Press (Close Grip)", "Barbell Landmine One-Arm Row"). Fitbod encodes a parent/variant relationship in its own copy rather than treating named variants as flat siblings.
2. **Movement-first**: `[Movement] ([Equipment])` — Hevy ("Bench Press - Close Grip (Barbell)", "Shrug (Barbell)"), inconsistent on suffix capitalisation live.

Both store each named variant as a fully separate database entry/URL — no product checked shows "one exercise, many equipment sub-options" as a single record with a picker.

## Aliases/synonyms in search

- **JEFIT: confirmed absent.** support.jefit.com/hc/en-us/articles/201509944 explicitly flags that JEFIT has no alternate-name lookup despite the same movement having different common names by where a lifter learned it — an acknowledged gap.
- **Hevy: not found live** (the relevant Help Centre article returned HTTP 403 on this fetch — blocked, not confirmed either way).
- No competitor checked was found to expose a documented alias/synonym layer. Recorded as absence in what was checked, not proof none exists.

## Movement families a 551-row library is likely missing

From competitors' PUBLIC pages only (not their full private databases):
- **Landmine work** — JEFIT alone lists a one-arm row, kneeling one-arm press, double-arm row, and a machine landmine row (reverse grip) (jefit.com/exercises/1350, /1349, /1351, /1047, fetched 2026-09-05).
- **Kettlebell-specific movements** — a first-class equipment tag in JEFIT, Hevy and the open free-exercise-db/exercemus datasets, not just "kettlebell version of a dumbbell exercise."
- **Suspension/TRX-style work** — Hevy names "suspension kit" as distinct from bodyweight.
- **Band-resisted work** — a first-class tag in JEFIT ("Bands") and free-exercise-db/exercemus, separate from cable work.
- **Machine-variant breadth** — the exercises-dataset (below) tags "leverage machine" and "smith machine" as distinct from generic "machine"; JEFIT separates "Strength Machine" from "Cardio Machine." Competitors generally carry several named machine-shaped variants as separate entries, not one generic "machine chest press."
- **Calisthenics/bodyweight progressions** — every product checked carries bodyweight as a first-class equipment tag, not a sub-note on a barbell exercise.

## Public, legally usable exercise NAME lists

| Dataset | Licence | Row count | Usable as gap-analysis checklist? |
|---|---|---|---|
| **free-exercise-db** (github.com/yuhonas/free-exercise-db) | Unlicense (public domain), confirmed live, fetched 2026-09-05 | 800+ | Yes, zero obligation — public domain. |
| **wger** data (github.com/wger-project/wger) | Code AGPL-3.0-or-later; exercise/ingredient DATA specifically Creative Commons (CC-BY-SA, per-entry), confirmed live, fetched 2026-09-05 | 845+ (third-party aggregator figure, not independently re-confirmed against wger's own live count) | Yes for names/checklist use (names/classifications aren't copyrightable); redistributing wger's actual descriptive TEXT requires CC-BY-SA attribution/share-alike. |
| **exercemus/exercises** (github.com/exercemus/exercises) | Code MIT; curated from exercemus/wger/wrkout — "all exercises... have a license... you must follow" (inherited per-source) | Not stated in README (fetched 2026-09-05) | Yes for names; same wger caveat applies where wger-sourced. |
| **wrkout/exercises.json** | Titled "Open Public Domain Exercise Dataset"; formal LICENSE file text not directly read this pass — treat as reported, not confirmed | Not confirmed live (a separate PAID product, wrkout.xyz, claims "2,500+" — do not conflate) | Likely yes; confirm the LICENSE file before relying on it. |
| **exercises-dataset** (github.com/hasaneyldrm/exercises-dataset, powers LogPress) | Code/structure/instructions: MIT. Media (images/GIFs): (c) Gym visual, used with permission — NOT free to reuse | 1,324, confirmed live, fetched 2026-09-05 | Names/instructions: yes under MIT. Do NOT reuse the GIFs/images. |
| ExerciseDB API (github.com/exercisedb/exercisedb-api) | AGPL-3.0 badge shown, but this is a PAID commercial API (RapidAPI pricing) claiming "11,000+," unverified, likely heavy duplication | 11,000+ (vendor claim only) | Excluded — paid product around an open-labelled repo with a muddled licensing story; do not use as a free checklist source. |
| ExRx.net | Proprietary — named in the brief as NOT free to copy | N/A | No — excluded per the brief. |

**Recommendation**: free-exercise-db (public domain, 800+, zero licence friction) and exercises-dataset (MIT for names/instructions, 1,324, exclude its media) are the two cleanest usable checklists found. wger and exercemus add real additional names but carry a CC-BY-SA condition the moment wger's own descriptive TEXT (not a bare name) is copied — using raw names as an internal comparison list is safe; copying wger's instructional text is not.

## Not verified in this pass

- Exact custom-exercise limits for Fitbod, JEFIT and Strong.
- Filters/muscle-model/naming for Strong, Alpha Progression, Caliber, RP Hypertrophy, Gymverse, Setgraph, Liftin', GymRun, Dr. Muscle, JuggernautAI — recorded as "not found live," not guessed.
- Which paid tier (if any) gates the base library, for every product except Hevy (confirmed free at all tiers).
- Alpha Progression's true total size (three conflicting third-party numbers, no vendor figure found).
- wger's own current live database count (only a third-party "845+" was found; not independently re-fetched against wger.de itself).
- Whether wrkout/exercises.json's actual LICENSE file text confirms public domain/Unlicense terms (README states intent; file not read directly).
