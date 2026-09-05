# 11 — Closure: exercise library and alternative training expansion

Landed 2026-09-05 on `claude/exercise-library-expansion`, merged to main
at the green regression recorded at the end of this file. Rulings:
`05-DECISIONS.md` EL-1 to EL-25. Verification: `10-VERIFICATION.md`.

1. **Starting built-in count**: 552 canonical rows (the audit's 551 plus
   one row every existing parser skipped) plus 18 template-scaffolding
   rows inserted outside the library under random ids.
2. **Final built-in count**: 918 live canonical rows, 21 retired into
   survivors (12 shipped duplicates found by the audit and the lead
   review, 6 template rows that duplicated existing rows, 3 word-order
   duplicates from the new inventories), 842 aliases. By implement:
   bodyweight 176, barbell 157, dumbbell 143, cable 118, machine 107,
   band 62, kettlebell 59, suspension 36, landmine 27, Smith 13, sandbag
   8, medicine ball 5, EZ bar 4, sled 3.
3. **Competitor counts verified live** (03): JEFIT 1,295 (live database
   count, includes a cardio tag), Fitbod "over 1000", Caliber 700 to
   800, Alpha Progression 621 to 795 (third-party, conflicting), Dr.
   Muscle 500+, Gymverse 500+, Hevy 400+, Strong 200+, JuggernautAI 250
   to 300, RP 250+ videos only; Lyfta advertises 5,000+ (vendor-only,
   unverified, not treated as credible).
4. **Exceeds the highest credible benchmark?** No. 918 real, distinct
   resistance exercises sit below JEFIT's 1,295 and above every other
   verified figure. The open-dataset gap analysis (08) explains why:
   of 1,931 dataset rows that looked missing, 41 were real adds and the
   rest were synonyms, cosmetic variants, stretches, cardio and junk.
   Padding to 1,300 would have needed roughly 400 rows of exactly that.
   The defensible public claim is "one of the largest resistance-training
   libraries, and every entry is real"; "the world's largest" is not
   made.
5. **Canonical and alias policy** (EL-2): one row per distinct training
   stimulus (implement, loading vector, laterality, support, grip where
   it changes the mover, range class, ballistic vs grind); everything
   else is an alias; names never change; duplicates are retired into
   survivors with history merged by the top-up.
6. **Major gaps filled**: kettlebell (6 to 59, grind and ballistic,
   single and double, get-up family, windmills, carries), suspension
   and rings (3 to 36), bands (21 to 62), landmine (27), calisthenics
   progressions and isometrics, machine and cable unilateral and
   converging variants, barbell power and Olympic-derived lifts, loaded
   carries and sleds as timed work, a small sandbag family.
7. **Equipment-family coverage**: every family in EL-4 is populated;
   `suspension`, `band`, `landmine`, `medicine_ball`, `sled` and
   `sandbag` are first-class equipment values with their own derived
   category and home or gym profiles.
8. **Metadata and tagging**: every row carries muscles, secondary
   muscles, subregion where required, movement pattern and family,
   compound or isolation, equipment and category, force, laterality,
   difficulty, load semantics, exercise type (carries and sleds log as
   duration), load character, aliases and an original two-to-three
   sentence cue; the guard (`validate-corpus.mjs` and its Jest mirror)
   fails the build on any missing or out-of-vocabulary value, any alias
   or normalised-name collision, any unlisted tier, and any cue that
   breaks the voice rules.
9. **Capability demands**: all eleven mechanical-demand axes are
   populated for every row; 52 previously silent nulls are now either
   resolved with a mechanical reason or explicitly marked unknown with
   a reason, and the guard requires a reason for any future null.
   Adapted-setup classes resolve for every row. Six derivation misfires
   found by the cue lane (a machine crunch tagged as a floor exercise,
   four standing stations tagged seated, one force tag) and eight more
   from a station sweep are overridden.
10. **Prioritisation**: the existing five-tier registry is now complete
    and guarded (staple 68, common 274, specialist 231, niche 246,
    never-auto 99); unlisted names fail the build; every ballistic,
    Olympic-derived, plyometric and strongman row is never-auto in
    ordinary plans; new rows entered at specialist unless the lead
    promoted them (75 promotions to common, 4 to staple, all in the
    bodyweight and home profiles whose pools were thin).
11. **Search and builder**: the index covers names and aliases with a
    six-tier ranking (exact, prefix, alias exact, alias prefix, fuzzy
    name, fuzzy alias; staples first inside a tier); an empty query
    shows Recent, In your plan, Staples, then All; the builder gains
    Make circuit with rounds and round-rest steppers; custom exercises
    gain delete and an existing-match suggestion.
12. **Exercise detail**: an original cue on every row (940 authored,
    validated by script, sampled by the lead); form tips fall back to
    the cue; no video or animation this campaign.
13. **Kettlebell**: curated, parameterised templates in two style pools
    (foundations: grind plus two-hand swing, 20 rows; experienced: 48
    rows including the ballistics); five plans (Foundations 2 and 3
    days, Strength 3 and 4 days, Minimal 3 days); the wizard and quiz
    learn kettlebells; swaps and Adjust plan stay inside the pool with
    an explicit "Show all exercises" relaxation.
14. **Circuits**: the existing superset group, named: `group_kind =
    'circuit'` and `round_rest_seconds` on `routine_exercises`; rounds
    are the members' sets; no rest between stations, round rest after
    the last; "Round n of m" in the live screen; three templates
    (dumbbell, bodyweight, kettlebell circuits); no timed stations, no
    EMOM or AMRAP.
15. **Other plan families**: bodyweight, band, suspension and minimal-
    equipment pools and collections exist and are reachable through the
    library chips; no new templates beyond kettlebell and circuits were
    added because the existing dumbbell, bodyweight and seated plans
    already cover them and adding more would be shelf-filling.
16. **Coach and learning** (EL-7): sets carry a write-time
    `evidence_class`; kettlebell grind sets are fully comparable;
    circuit sets count as volume and can be PRs but never feed trends,
    plateaus, load progression, learned ranges, block seeding, landmarks
    or structure memory (the block ledger marks the muscle `circuit`,
    the same shape as `constrained`); ballistic sets are display-only
    everywhere and do not count toward per-muscle volume.
17. **Performance**: corpus source 627 KB; full derivation of 918 rows
    in about 34 ms in Node; search worst keystroke 2 to 18 ms over 1,600
    rows in Jest; seed insert batched in one transaction (device time to
    be read from the boot log on the checklist).
18. **Tests and validation**: recorded at the end of this file after the
    one full regression; corpus guard 0 violations; audit scripts clean.
19. **Deliberately excluded**: cardio and endurance logging, timed
    stations, CrossFit scoring, calorie-burn estimates, medical safety
    labels, video production, competitor text or media, any new muscle
    category (rotator-cuff rows count with the shoulder), any new
    dependency.
20. **Remaining limitations**: the count is below JEFIT's inflated
    figure by design; the two cloud migrations (158, 159) are written but
    NOT applied, so circuit and evidence-class columns do not sync until
    the founder runs them and the flag is flipped; search timing is
    measured in Jest, not on a phone; the position sweep covered machine
    and cable stations only; the 84 tuple-level near-duplicate pairs the
    audit flagged are all judged distinct on the lead's reading of the
    list but were not individually written up.

## Regression (the one full run over the settled tree, 2026-09-05)

```
> volyume@1.3.4 lint
> eslint . --max-warnings 0

Test Suites: 1 skipped, 1194 passed, 1194 of 1195 total
Tests:       16 skipped, 16261 passed, 16277 total
Snapshots:   17 passed, 17 total
```
Corpus guard: `validate-corpus: OK — 918 live rows, 21 retired, 0
violations`. The first full run found 13 suites whose fixtures still
parsed the retired seed text or pinned pre-campaign call shapes; all
were re-anchored with the ruling cited, and one real gap they exposed
(library routines referencing three retired names) was fixed and
guarded before this run.
