# Item 16 — Micronutrients / NRV completion (MN-1) — scoping read

Read-only scoping per D16 GO ruling (`DECISIONS-2026-07-09.md`, "D16 —
Ultimate-Audit items 11-16 GO", 2026-07-10): item 16 is queued last, "large,
partially built", and explicitly "gets a scoping read first." No source was
changed for this document.

## 1. The ruling, verbatim, with source line

Founder decision to BUILD (the original commissioning decision), section A of
`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md`:

> "Micronutrients / NRV tracking (FL/NU) — add vitamin/mineral tracking vs NRV
> (schema change: today macros+fibre/sodium/sugar only, `food/db.js:240`)."
> — `pass3-v2-founder-decisions.md:168`

Immediately below, the scope note that still governs the feature:

> "All accepted items under the standing no-jargon voice constraint.
> Micronutrients/NRV = schema migration (build-phase, Supabase rules apply).
> None of the accepted Section-A items touch `src/coaching/safety`."
> — `pass3-v2-founder-decisions.md:182-183`

Schema-authority question resolved in the same document:

> "NA-mn-1 (Q1 schema authority) RESOLVED by investigation: migrations
> (`migrate_001..086`) are canonical; `setup_complete.sql`/`schema.sql` are
> stale bootstrap snapshots. Micronutrients = NEW `migrate_087_*.sql`."
> — `pass3-v2-founder-decisions.md:197` (the actual cloud migration shipped
> later as `migrate_109`, not 087 — numbering moved on, the ruling's content
> did not)

The full build blueprint sits in
`docs/ultimate-audit-2026-06-13/pass4-blueprints-micronutrients.md` (quoted
in full in section 2 below).

Most recent reconciliation and the "go" that starts this task:
`docs/ux-world-class-audit-2026-07-09/ultimate-audit-11-16-reconciliation.md:17`:

> "16 | Micronutrients/NRV (MN-1) | Build 'founder-approved full build
> 2026-07-08' per migrate_109's own header; schema authority resolved
> (migrations canonical). PARTIALLY BUILT: local v58 micronutrient columns +
> cloud migrate_109 exist. D12 (2026-07-09) REMOVED the diary micros panel —
> display lives elsewhere (per-food detail). | Founder go on completing the
> remainder (seed micro data, per-food display, NRV targets surface). Needs a
> scoping read of what v58/109 left unfinished."

And `DECISIONS-2026-07-09.md` D16 (2026-07-10), the ruling that sequences this
task:

> "Start all, in that order': 13 (mid-session swap clause) -> 12 (raw/cooked
> basis toggle) -> 11 (named autonomy modes; safety rule: never auto-apply
> during a hold) -> 15 (timeline food logging, large) -> 16 (micronutrients/NRV
> completion, large, partially built). Two agents at a time; engine/
> safety-adjacent pieces get hands-on lead review; 15 and 16 get a scoping
> read first."

## 2. The build blueprint, quoted in full

Source: `docs/ultimate-audit-2026-06-13/pass4-blueprints-micronutrients.md`
(hand-written, not agent-drafted, per its own header).

> MN-1 / NUTRITION-SCHEMA / Micronutrient + NRV tracking
> PRIORITY TIER: Tier-2. IMPACT: medium-high (Cronometer-grade depth; UK NRV).
> EFFORT: LARGE (schema migration across local SQLite + Supabase + sync + seed
> + display).
>
> CURRENT STATE (as of 2026-06-13, now stale — see section 3):
> The food schema carries macros + fibre/sodium/sugar per 100g ONLY, no
> vitamins/minerals... Seed sources: OpenFoodFacts-UK (branded) + CoFID-UK
> (~3k generic)... CoFID is rich in micronutrients in its source dataset
> [INFERENCE — must verify actual columns imported, NA-mn-2].
>
> IMPLEMENTATION BLUEPRINT — FILES TO CHANGE:
> - `src/lib/food/db.js` — add NEW micronutrient columns to `foods` +
>   `custom_foods`.
> - `src/lib/food/db.js` — extend resolve/log to carry the new fields.
> - `src/lib/food/seed.js` — import micronutrient columns from CoFID (and OFF
>   where present).
> - Supabase migration (new file) + sync mapping. Local SQLite migration
>   alongside.
> - Diary display (a micronutrient panel behind a tap).
> - NRV reference table NEW (UK NRV values) [INFERENCE].
>
> DATA: NEW columns (vitamins/minerals per 100g) on `foods` + `custom_foods`;
> NEW UK-NRV reference constants. Missing micros render as "unknown", never 0.
>
> EMPTY STATE: "We don't have the vitamin and mineral data for some of these
> foods yet." LOADED STATE: per-nutrient total vs UK NRV.
>
> DUAL-AUDIENCE DESIGN: off by default / behind a tap (newbie-safe); full
> depth available to athletes.
>
> INVARIANT TESTS: migration idempotent; unknown micros render unknown not 0;
> NRV maths UK-compliant; sync round-trips the new columns.

Open questions the blueprint left (from `pass4-needs-answer-register.md:15-19`,
now resolved or superseded as noted):
- NA-mn-1 (schema authority) — RESOLVED (migrations canonical; see section 1).
- NA-mn-2 (which CoFID columns are actually imported) — ANSWERED by this
  scoping read: NONE (section 4).
- NA-mn-3 (sync registry/mapping file) — ANSWERED: `src/lib/food/db.js` +
  `src/lib/food/libraryDelta.js`, both already wired for `custom_foods`/
  `foods` (section 3).
- NA-mn-4 (exact Pro gate fn) — ANSWERED: no dedicated gate exists or is
  needed; every candidate surface (Diary, FoodInsights, custom-food add) is
  already a Pro screen or already derives `readOnly = tier !== 'pro'`
  (`DiaryScreen.js:110`) or sits behind `withProGuard`/`ProGate`
  (`src/components/ProGate.js`, `src/lib/proGate.js`).

## 3. Built vs missing inventory (cited)

### Built and solid

- **Canonical nutrient list + maths** — `src/lib/food/micronutrients.js`.
  27 UK/EU NRV nutrients (13 vitamins, 14 minerals; sodium excluded, already
  tracked separately), each with `key`, `column`, `unit`, `nrv`, `group`.
  Drives every SQL fragment (`MICRO_COLUMNS`, `microSqlColumns`,
  `microSqlPlaceholders`, `microSqlUpsertExcluded`) so schema/insert/upsert
  call sites cannot drift. `computeMicronutrientTotals()` sums a day's foods
  honestly (a nutrient is `null`/"unknown" unless at least one food carried a
  value — never coerced to 0). `nrvPercent()` converts an amount to a UK-NRV
  percentage. Covered by
  `src/lib/food/__tests__/micronutrients.test.js` (27 tests: uniqueness,
  fragment-count agreement, unknown-never-0, call-site binding guards).
- **Local schema** — `src/lib/database.js` v58 migration (`:1671-1679`): adds
  all 27 nullable `REAL` columns to `foods` and `custom_foods`. Additive,
  idempotent (duplicate-column errors tolerated by the runner), header states
  purpose/status/rollback per the CLAUDE.md migration-header rule.
- **Cloud schema** — `supabase/migrate_109_micronutrient_columns.sql`. Same 27
  nullable `numeric` columns on `public.foods` and `public.custom_foods`,
  `ADD COLUMN IF NOT EXISTS` (safe to re-run), full rollback documented. Header
  explicitly says "founder-approved full build 2026-07-08" and flags its own
  gap (quoted below). **Not yet applied to EU-Dublin production** — it is one
  of the outstanding founder-run migrations named in CLAUDE.md's STATUS line
  ("apply `supabase/migrate_092`..`_099`" is the named range; 109 is later
  still and equally unapplied as far as this read can tell — confirm with the
  founder before assuming production has these columns).
- **Read/write plumbing** — `src/lib/food/db.js`: `insertCustomFood` (`:405,
  413`) and the foods-library upsert (`:1636-1664`) both bind
  `microSqlColumns`/`microValuesFromInput`/`microValuesFromRow` correctly.
  `src/lib/food/sources/localCache.js`: `resolveFoodRef()` for `global:` and
  `custom:` refs (`:217-236`) SELECT the micro columns already — fully wired.
  `curated:` refs (`:198-213`) do **not** return micro fields at all (see gap
  below).
- **Custom-food manual entry** — `src/screens/AddCustomFoodScreen.js`: an
  optional, collapsed-by-default "Vitamins and minerals (optional)" section
  (`:373-393`) driven off `MICRONUTRIENTS`, wired to `insertCustomFood`. Blank
  fields never coerce to 0 (`:107-118`). This is create-only (no edit path
  exists for custom foods in this screen), so it is genuinely complete for
  what it does.
- **Sync** — `src/lib/food/libraryDelta.js` (client pull-and-upsert of the
  shared `foods` library) already binds the micro columns on its local insert
  (`:147-174`); `src/lib/sync/registry.js:48` carries `custom_foods` in the
  registry, and `custom_foods` sync is row-level upsert of the whole row (per
  migrate_109's own header: "Custom-food sync needs no RPC change").
- **Tests** — `src/lib/food/__tests__/micronutrients.test.js` pins the
  schema/maths/binding invariants named in the blueprint. No test yet exercises
  an end-to-end "log food -> see NRV total" flow, because no display surface
  exists to test (see section 4).

### Built, then explicitly removed (D12, respect this)

- `src/components/food/MicronutrientPanel.js` + its test — a day-level,
  collapsed-by-default "Vitamins and minerals" panel on the Eat diary,
  resolving each of the day's `food_ref`s via `resolveFoodRef` and rendering
  `computeMicronutrientTotals` vs `nrvPercent` in two groups (Vitamins /
  Minerals), with loading/error/empty states matching the blueprint's copy.
  **Deleted outright** by commit `03e3c1d` ("Declutter Eat diary: remove
  vitamins/minerals panel, demote bulk mark-as-eaten"), founder direct order
  D12 item 1: "dead space in premium screen real estate."
- The guard test that replaced the old one,
  `src/screens/__tests__/DiaryScreen.d12EatDeclutter.guard.test.js`, pins the
  removal source-level: no import, no render, no dead style, component file
  and its test both deleted (not left orphaned). Its own header records the
  scope boundary precisely: "confirmed diary-only before removal (no other
  screen imported it)... out of scope for this guard" for
  `femaleNutritionAwareness.js`.
- **D12's own instruction, followed exactly by this scoping read**: "per-food
  micro detail elsewhere is untouched unless it proves diary-only — agent
  reports." This scoping read confirms: the panel WAS diary-only (no other
  caller existed before deletion) and there is currently **no** per-food
  micronutrient display anywhere else in the app either — it was never built
  at the per-food level, only at the day-aggregate level, and that is exactly
  what got killed. There is nothing "elsewhere" today; a per-food (or any
  other) surface would be new work, not a resurrection.

### Missing (the actual remaining delta)

1. **Data: seed import carries zero micronutrient values.** The single
   biggest gap — see the dedicated coverage measurement in section 4. Neither
   the bundled CoFID snapshot nor the bundled OFF snapshot nor the live
   OFF/USDA fetch paths populate any of the 27 columns today.
2. **`curated:` food refs return no micro fields at all**
   (`localCache.js:198-213`) — the ~150 staple foods behind the curated meal
   library (`src/lib/food/curatedFoods.js`) don't carry fibre/sodium/sugar
   either, so this is consistent with their existing minimalism, but it means
   logged curated-meal items would always read "unknown" for every
   micronutrient too, same as everything else.
3. **No display surface exists anywhere** (the diary panel is gone; nothing
   else was ever built). Candidates and their fit are assessed in section 5.
4. **`food_library_pull` RPC (`supabase/migrate_028_food_library_pull.sql`)
   has not been re-issued** to SELECT the 27 new columns — migrate_109's own
   header names this exact gap: "the food-library pull RPC... must be
   re-issued to SELECT these columns when the shared library is re-published
   with micro data." Until a new migration updates this function's explicit
   column list (`:20-63` of migrate_028), a device pulling shared-library
   updates will never receive micronutrient values even once seed data exists
   server-side — `libraryDelta.js` already binds the columns client-side, but
   the RPC response simply won't contain them.
5. **No `updated_at` refresh path for a food whose micros get filled in
   later** — not explicitly asked for by the blueprint, flagged for
   completeness: if a future data pass back-fills micronutrient values into
   existing `foods` rows, whatever process does that must also touch
   `updated_at` so `food_library_pull`'s delta cursor actually ships the
   corrected rows to devices. Purely a build-time detail, not a founder
   question.
6. **No NRV reference surfaced anywhere in copy/UI** — the constants exist
   (`MICRONUTRIENTS[].nrv`, `nrvPercent()`), but nothing user-facing currently
   cites or explains "NRV" to a user (the deleted panel did, via
   `rowNrv` text, but it's gone).
7. **No tests for a display component**, because none exists.

## 4. Data-source coverage measurement (the load-bearing question)

This determines whether an NRV display is honest or would show "unknown" on
almost everything. Measured directly against the bundled data files and the
importer code, not estimated.

**CoFID (generic UK foods)** — `assets/seed/cofid_uk.dat`:
- 2,852 rows (`_meta.rowCount`). Verified keys present across a sample of the
  actual JSON: `ean, name, brand, serving_g, serving_label, kcal_100g,
  protein_100g, carbs_100g, fat_100g, fibre_100g, sodium_100g, sugar_100g`.
  **Zero micronutrient keys of any kind, on any row.**
- Root cause, confirmed in `scripts/seed/buildCofidSnapshot.js`: the builder
  only reads the `"1.3 Proximates"` sheet of the McCance & Widdowson workbook
  (`SHEET_NAME` constant, `:41`) and only maps columns for
  code/name/protein/fat/carbs/kcal/sugar/fibre (`COL`, `:44-53`); `sodium_100g`
  is hard-set to `null` unconditionally (`:154`). No vitamin/mineral column
  index is defined anywhere in the script.
- CoFID (McCance & Widdowson) is publicly known to also publish separate
  "Inorganics" (minerals) and "Vitamins" workbook sheets alongside
  "Proximates" — **UNKNOWN/unverified in this read** whether those sheets
  exist in the specific 2021 7th-edition file this script downloads, and
  whether their row keys (food codes) join cleanly to the Proximates rows
  already imported. This was not fetched or confirmed in this scoping pass
  (no live download was performed); it is the first thing to verify before
  costing a CoFID-based fix.

**OFF (branded UK products)** — `assets/seed/off_uk_snapshot.dat`:
- 26,427 rows (`_meta.rowCount`). Sampled keys across 50 rows: identical set
  to CoFID's (no micronutrient keys). **Zero micronutrient coverage.**
- Root cause, confirmed in `scripts/seed/buildOffSnapshot.js`: the builder
  requests OpenFoodFacts' full `nutriments` object per product (`fields=...
  nutriments`, `:126-127`) but the parser (`:83-115`) only reads
  kcal/protein/carbs/fat/fibre/sugar/sodium keys off it. OpenFoodFacts'
  `nutriments` schema does carry keys like `vitamin-a_100g`,
  `vitamin-c_100g`, `calcium_100g`, `iron_100g` etc. **when a contributor
  filled them in** — this is voluntary, crowd-sourced data, present only on a
  minority of product pages (UK nutrition labels are not legally required to
  state vitamins/minerals except for fortified claims). Extending the
  extractor to read these keys is a contained code change, but real
  post-extension coverage would likely be low and uneven across the 26k
  products — **UNKNOWN exact percentage without re-running the harvester
  against live OFF and measuring**, not verified in this read.

**Live fetch paths** (per-barcode/scan, not the bulk snapshot builders):
- `src/lib/food/sources/liveOff.js` — same limited field mapping
  (kcal/protein/carbs/fat only from `nutriments`, `:36-49`). No
  vitamin/mineral keys read.
- `src/lib/food/sources/usda.js` — no vitamin/mineral keys read at all
  (grep for vit/mineral/sodium/calcium/iron returned nothing).
- `src/lib/food/ocrParser.js` (nutrition-label photo scan) — parses only
  kcal/protein/carbs/fat/fibre (and presumably sodium/sugar via the same
  `_matchValue` pattern); no vitamin/mineral line-parsing exists. UK
  nutrition labels rarely print a full vitamin/mineral panel outside
  fortified products, so this would be a low-yield, high-effort OCR
  extension even if built.

**Curated staples** (`src/lib/food/curatedFoods.js`, ~150 entries behind the
meal builder): macro-only by design (`kcal, protein, carbs, fat` — not even
fibre/sodium/sugar). Zero micronutrient data, zero mechanism to add any today.

**Custom foods** (user-typed, `AddCustomFoodScreen.js`): the only path that
CAN carry real values, and only when a user manually expands the optional
section and types them in per food. No realistic assumption of significant
uptake — it is opt-in, per-food, 27 optional fields deep.

**Bottom line, measured not estimated:** of the ~29,300 bundled foods a real
user is most likely to log (2,852 CoFID + 26,427 OFF), **0% carry any
micronutrient value today**, and the only currently-populated path (manual
custom-food entry) is opt-in and low-volume by nature. Shipping an NRV display
against today's data would show "unknown" for essentially every nutrient on
essentially every food a typical user logs. This is the same "dead space"
failure mode D12 just removed, on different footing (day-aggregate emptiness
then; per-food emptiness now) — the data problem, not the UI problem, is what
made the last attempt hollow, and it is still unsolved.

## 5. ED-safety analysis

No safety-module code is touched by this item — confirmed both by the
original ruling ("None of the accepted Section-A items touch
`src/coaching/safety`", `pass3-v2-founder-decisions.md:183`) and by this read
(nothing in `micronutrients.js`, the migrations, or the resolve/sync plumbing
imports or calls `edPatternDetector.js`, `wellbeing.js`,
`nutritionEngine.js`'s floors, or `weeklyCoach.js`). This item is UI/data, not
an engine change, and does not require the safety-adjacent escalation path.

That said, the feature is genuinely ED-adjacent in the softer sense the
founder has been alert to elsewhere in this audit (D12's own diary
decluttering, the "no cheat day/binge" banking rails, the
`femaleNutritionAwareness.js` deliberate non-tracking design): a numeric
"X% of NRV" readout per nutrient is structurally the same shape as calorie/
macro tracking — a percentage against a target, displayed daily, per food. The
precedent directly on point, read in full this session
(`src/lib/femaleNutritionAwareness.js`), is explicit about avoiding exactly
this shape:

> "This is AWARENESS content only. It does NOT track, total, or score any
> micronutrient... You do not need to count them. Just leaning on these foods
> regularly covers most of it."

That module's own header (`:6-10`) states in so many words that per-food
micronutrient tracking vs NRV (this item) is "the separate, gated
Ultimate-Audit item #16... and is NOT started here" — i.e. the two were
deliberately kept apart, precisely so the awareness content could stay
non-quantified while a numeric feature, if built, lives elsewhere.

Risk surface if this ships as a bare numeric percentage grid (27 rows, "62%
NRV", red/amber/green or similar):
- **Another axis to police.** A user already tracking calories/protein/carbs/
  fat/fibre gains 27 more percentages to worry about. The COACHING_VOICE
  standing constraint (Section-A voice guard, `pass3-v2-founder-decisions.md
  :81-94`) requires "numbers-before-narrative" and "no motivational filler/
  moral food labels" for every accepted item — a raw percentage grid with no
  narrative framing risks reading as a checklist to complete or fail, which
  is the opposite of the calm, non-shaming register this app has built
  consistently elsewhere (Beat UK signposting, calm mode, the
  never-lower-floors rule).
- **Honesty vs the "unknown" data reality (section 4).** Even setting ED
  framing aside, a screen showing "unknown" on ~25 of 27 rows for nearly
  every real day is not just uninformative, it actively invites a user to
  "fix" the gaps by hunting down precise numbers for foods that don't carry
  them — which is itself a possible driver of exactly the kind of
  perfectionistic, numbers-obsessive behaviour the ED-safety system exists to
  discourage. This risk only exists because of the data gap in section 4; it
  would substantially recede if coverage were genuinely high.
- **Existing precedent for how to do this safely already exists in this
  codebase**: `femaleNutritionAwareness.js`'s food-first, non-quantified
  framing ("lean on these foods, you don't need to count them") and the
  deleted panel's own honest design (collapsed by default, "unknown" never
  0, no colour-coding, no streak/score) both point the same direction: if
  built, keep it collapsed-by-default, unscored, no colour thresholds, no
  streaks, no daily nagging, framed as "here's what these foods are giving
  you" rather than "here's what you're missing."
- Nothing here requires floors, gates, or the safety engine to change; this
  is a design-register risk to flag for the build spec, not a safety-module
  concern.

## 6. Remaining delta in build stages, with effort

Ordered as they would need to land (each stage assumes the founder has chosen
where the display lives — that choice is section 7's central question).

**Stage 0 — Production migration application.** Confirm with the founder
whether `migrate_109` has been run against EU-Dublin production yet (the
CLAUDE.md STATUS line names `_092`..`_099` as outstanding; 109 is not named
there, so its status is genuinely UNKNOWN from this read alone). Founder-run,
not a build task. **Effort: founder action, not engineering.**

**Stage 1 — `food_library_pull` RPC re-issue.** New migration
(`migrate_11x_*.sql`) re-creating `food_library_pull` with the 27 columns
added to its `RETURNS TABLE` and `SELECT` list (mirrors migrate_028's
existing shape, additive-safe via `CREATE OR REPLACE FUNCTION`). Needed before
any server-populated micro data can ever reach a device via the shared
library path. **Effort: SMALL** (one migration file, no client change —
`libraryDelta.js` already expects these columns in the RPC row).

**Stage 2 — Decide and build the actual data source.** This is the large,
genuinely open-ended piece, and it forks hard depending on section 4's
findings:
- *Fork A — CoFID inorganics/vitamins sheets exist and join cleanly*: extend
  `buildCofidSnapshot.js` to also parse those sheets and extend the row shape;
  re-run the builder once (CoFID is static, per its own script header);
  regenerate `cofid_uk.dat`; bump `COFID_SNAPSHOT_VERSION`. Also update
  `seed.js`'s `INSERT INTO foods` (`:229-235`) to include `microSqlColumns` (it
  currently doesn't insert them at all, even where a row might carry them,
  because the row shape it expects has never included micro fields). Coverage
  would then be good for ~2,850 generic staple foods, still zero for the
  ~26,400 branded OFF rows. **Effort: MEDIUM**, contingent on a real
  worksheet/row-join investigation first (not yet done in this read).
- *Fork B — extend the OFF snapshot builder to also extract whatever
  micronutrient nutriment keys OFF happens to carry*: change
  `buildOffSnapshot.js`'s parser to also map vitamin-*/mineral nutriment keys,
  same `seed.js` insert-list gap as Fork A applies here too. Coverage would be
  uneven and likely low across 26k branded products (voluntary crowd data) —
  needs measuring against a live OFF re-harvest before committing engineering
  time, not assumed. **Effort: MEDIUM to build, effort-to-verify-value is the
  real open question.**
- *Fork C — do both* (CoFID for generics, OFF-extract for branded, whatever
  it yields). **Effort: LARGE**, and still leaves genuine "unknown" rows for
  any food from either source lacking the data — CoFID entries with `"N"`
  (not measured) stay null by the importer's own `num()` function
  (`buildCofidSnapshot.js:69`), which is correct/honest but means even a
  "full" CoFID re-import will not reach 100% coverage.
- *Fork D — narrower scope: curated staples only* (`curatedFoods.js`, ~150
  entries) hand-populated with sourced CoFID/label values, the same way
  `curatedFoods.js`'s macros were hand-sourced originally. Small, bounded,
  100% coverage for that specific ~150-food set, but those are meal-plan
  staples, not what most users log day to day via search/barcode — so the
  headline diary/insights experience would still show "unknown" everywhere
  else. **Effort: SMALL-MEDIUM**, but narrow value.
- Whichever fork, `seed.js`'s `INSERT INTO foods` statement (`:228-245`) must
  be updated to actually write `microSqlColumns`/values — right now it is not
  wired at all, independent of whether the source data exists.

**Stage 3 — Display surface.** Build whatever the founder chooses in section
7 (day aggregate elsewhere than the diary, per-food-detail rows, a dedicated
FoodInsights window average, or a combination). Reuses the existing, already-
tested engine (`computeMicronutrientTotals`, `nrvPercent`) — this part of the
blueprint is done and does not need rebuilding, only a new component/screen
wiring plus the ED-safety-conscious framing from section 5. **Effort: SMALL
to MEDIUM** depending on which surface (day-aggregate on a screen is closer
to a straight resurrection of the deleted panel's logic minus its host
screen; per-food-detail rows on `FoodDetailSheet.js` follow the exact pattern
already used for fibre/sugar/sodium there, `:200-211`, so that specific
extension is genuinely small).

**Stage 4 — Tests.** Extend the existing invariant suite
(`micronutrients.test.js` already covers the engine) with whatever the new
display component needs (unknown-never-0 render assertion, coverage-string
assertion, NRV-maths-is-UK-compliant assertion already implicit in the shared
`nrv` constants). **Effort: SMALL**, mechanical, matches the existing pattern.

## 7. Founder questions

**Q1 — Where does this live, given D12 killed the diary panel?**
D12 removed the day-level panel from the Eat diary as "dead space." The
blueprint's only prescribed location (`pass4-blueprints-micronutrients.md
:44,50`: "Diary display... new `MicronutrientPanel` under the diary day") is
now the one place this is confirmed not to belong. Candidate alternatives,
none pre-decided:
  a) **Per-food, on `FoodDetailSheet.js`** — extend the existing
     "extraNutrients" pattern (fibre/sugar/sodium rows, `:200-211`) with a
     collapsed "vitamins and minerals" sub-section per food, shown only when
     that specific food actually carries data (never a 27-row block of
     "unknown"). Smallest, most honest given section 4's coverage finding —
     it degrades gracefully to simply not appearing for undocumented foods,
     rather than displaying a wall of "unknown."
  b) **`FoodInsightsScreen.js` window average** — that screen already has two
     comments anticipating this exact item ("micronutrients are decision-
     gated", `:190,587`) next to its existing macro/fibre adherence and
     nutrient-average cards. A "vitamins and minerals" card averaged over the
     14/30/90-day window (same adherence-neutral, no-colour framing already
     used there) would only show a coverage caveat once per card rather than
     once per food-log, and matches this screen's existing register.
  c) **Both** (per-food detail for the curious-in-the-moment case, window
     average on Insights for the "am I generally covering this" case) —
     largest, but arguably the more complete pairing the blueprint originally
     imagined (per-food + day/window total).
  d) **Neither for now — park until coverage improves** (section 4's finding
     that today's data would render "unknown" almost everywhere is a real
     argument for sequencing Stage 2 the data work before Stage 3 the display,
     rather than shipping a display against 0% coverage).
This is the D12-conflict question the reconciliation flagged and needs an
explicit founder answer before Stage 3 starts.

**Q2 — Which data-source fork (section 6, Stage 2) — A, B, C, or D — and is
the CoFID-inorganics/vitamins-sheet feasibility check (section 4's flagged
UNKNOWN) worth a short spike before committing to a fork?**
Given 0% current coverage, this is the item that decides whether the whole
feature is worth shipping now at all. A narrow spike (download the CoFID
workbook, list its sheets, check whether a vitamins/inorganics sheet exists
and joins to the Proximates food codes already imported) would answer this
in hours, not days, before any fork is chosen.

**Q3 — Is a near-empty display acceptable as a stopgap, or must Stage 2 (data)
land before Stage 3 (display) ships?**
The founder's own D12 rationale ("dead space... premium screen real estate")
argues against shipping any display that would read mostly "unknown" today.
Sequencing data-before-display (do Stage 2 first, however narrow, before
Stage 3) would avoid repeating that exact failure mode a second time. This is
explicitly a "do less now vs do the full thing" fork under the CLAUDE.md
no-silent-corner-cutting rule, so it is surfaced as a question rather than
decided here.

**Q4 — Design register: collapsed/unscored/no colour-coding, matching the
deleted panel and `femaleNutritionAwareness.js`'s precedent (section 5), or
does the founder want something with more visual weight (colour thresholds,
a completion ring, etc.) given this is meant to read as "Cronometer-grade
depth" for athletes?**
The blueprint's own "dual-audience" instruction (collapsed for beginners, full
depth for athletes on tap) argues for the low-key framing, but the founder may
want a stronger visual for the Pro/athlete audience this is aimed at
specifically. Not decided in the ruling; needs an explicit answer given the ED-
safety framing risk in section 5.

**Q5 — Production migration status.** Confirm whether `migrate_109` has
actually been run against EU-Dublin production. UNKNOWN from this read;
CLAUDE.md's outstanding-migrations line names `_092`..`_099` specifically and
does not mention `109`, so its status cannot be inferred either way from that
document alone.

## Sources read in full for this scoping pass

- `docs/ux-world-class-audit-2026-07-09/ultimate-audit-11-16-reconciliation.md`
  (whole file)
- `docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md` (whole file)
- `docs/ultimate-audit-2026-06-13/pass4-blueprints-micronutrients.md` (whole
  file)
- `docs/ultimate-audit-2026-06-13/pass4-needs-answer-register.md` (mn-*
  entries + surrounding context)
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` (whole file,
  D12 and D16 in particular)
- Code: `src/lib/food/micronutrients.js` (whole file),
  `src/lib/database.js` (v58 migration + surrounding versions),
  `supabase/migrate_109_micronutrient_columns.sql` (whole file),
  `supabase/migrate_028_food_library_pull.sql` (whole file),
  `src/lib/food/db.js` (insert/upsert call sites),
  `src/lib/food/seed.js` (whole importer + row-shape doc),
  `src/lib/food/sources/localCache.js` (`resolveFoodRef`),
  `src/lib/food/sources/liveOff.js`, `src/lib/food/sources/usda.js`,
  `src/lib/food/ocrParser.js`,
  `src/lib/food/curatedFoods.js`,
  `src/screens/AddCustomFoodScreen.js` (micros section),
  `src/components/food/FoodDetailSheet.js` (extraNutrients section),
  `src/screens/FoodInsightsScreen.js` (nutrient-averages section),
  `src/lib/femaleNutritionAwareness.js` (whole file),
  `src/screens/__tests__/DiaryScreen.d12EatDeclutter.guard.test.js` (whole
  file), `src/lib/food/__tests__/micronutrients.test.js`,
  git history for `src/components/food/MicronutrientPanel.js` (deleted,
  read via `git show 03e3c1d^:...`) and commit `03e3c1d` in full,
  `scripts/seed/buildCofidSnapshot.js` (whole file),
  `scripts/seed/buildOffSnapshot.js` (field-mapping section),
  `assets/seed/cofid_uk.dat` and `assets/seed/off_uk_snapshot.dat` (parsed
  directly to measure actual row counts and keys present — not estimated).
