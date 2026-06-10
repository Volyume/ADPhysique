# COMP-016 — Verified UK food layer: implementation blueprint

> Round-2 blueprint per `impl-00-shared-brief.md`. Approved seed:
> `../competitive-audit-03-master-proposals.md` COMP-016 (impact 9 /
> effort 7). Extends `docs/FOOD_DATA_STRATEGY_LOCKED.md` (locked
> 2026-05-23) — this blueprint adds a layer on top of the locked
> waterfall; it changes none of its decisions. No code changes here;
> blueprint only.

---

## 0. Programme decision in one paragraph

Build a small, hand-verified, independently sourced UK food dataset —
phase 1 is ~1,000 top supermarket SKUs (priority-ordered by Volyume's
own logging telemetry plus a UK staples list) and the full menus of
five chains (Greggs, McDonald's UK, Costa, Pret, Nando's) — shipped as
a third bundled snapshot under a new `source = 'volyume'` label with
`verified = 1`, badged "Verified" in the row chip, ranked above every
community source, refreshed quarterly (chains per published edition),
corrected via an in-app report queue, and delivered between releases
through the existing `food_library_pull` delta. The legal architecture
is the load-bearing part: the verified layer is a **separate,
clean-room database held alongside OFF data as an ODbL "collective
database"** — never derived from or merged with OFF rows — so
share-alike never attaches to it.

---

## 1. Best-in-market bar

1. **Nutracheck (the single best).** UK-only curated database built
   and maintained in-house since 2005; markets "350,000+ products,
   all officially verified" with full supermarket own-brand and
   high-street chain coverage (Greggs, Nando's, Costa, Pret,
   Wetherspoon, HelloFresh, Gousto). It earns 4.9/5 on Trustpilot from
   ~8,000 reviews — against MyFitnessPal's 1.4 — and reviewers cite
   the scanner/database as the single most-praised feature: "scanning
   a Tesco sandwich or logging a Greggs pasty actually works", with no
   conflicting duplicate entries. The database **is** the product;
   everything else about the app is described as dated.
   (Sources: [Nutracheck marketing](https://www.nutracheck.com/Info/TheBestCalorieCounterandFoodDiary);
   [Trustpilot](https://uk.trustpilot.com/review/www.nutracheck.co.uk);
   [HomeCooks review](https://home-cooks.co.uk/pages/review-nutracheck);
   [NutraSafe 50-product scanner test](https://nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026).
   Nutracheck publishes no detailed methodology page we could fetch
   directly — nutracheck.co.uk blocked our fetches; process claims
   are search-extract evidence from their own marketing and third-party
   reviews, flagged accordingly.)
2. **MacroFactor.** 1.15M+ item database positioned as "fully
   verified": vetted research databases plus user submissions that "a
   human reviewer cleared before publishing". Verification is
   communicated at the *database* level (marketing, help docs), not
   with per-item badges — which works for them because nothing
   unverified ever enters search. Their regional-coverage help doc
   openly admits UK branded long-tail gaps — the gap Volyume attacks.
   ([macrofactor.com/macrofactor](https://macrofactor.com/macrofactor/);
   [regional coverage help doc](https://help.macrofactorapp.com/en/articles/25-how-robust-is-the-database-coverage-in-my-region);
   [submission flow](https://help.macrofactorapp.com/en/articles/246-how-to-submit-new-or-updated-foods) — direct fetch blocked, search-extract only.)
3. **Cronometer CRDB (the correction-loop model).** Every
   user-submitted food requires the barcode plus clear photos of the
   pack front and the nutrition panel; a named curation team reviews
   each one against the packaging or the brand's official website
   before it goes public. Crowdsourcing with a verification gate is
   how they grow without rot.
   ([Publishing a food to the CRDB](https://support.cronometer.com/hc/en-us/articles/360018652672-Publishing-a-food-to-the-CRDB-Database);
   [Data Sources](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources).)
4. **The chains' own publications (the free source of truth).** Since
   the Calorie Labelling (Out of Home Sector) (England) Regulations
   2021 came into force on 6 April 2022, food businesses with 250+
   employees must display kcal per portion on menus **including online
   menus** ([GOV.UK implementation guidance](https://www.gov.uk/government/publications/calorie-labelling-in-the-out-of-home-sector/calorie-labelling-in-the-out-of-home-sector-implementation-guidance)).
   In practice all five target chains publish full nutrition data
   officially: Greggs hosts "the only Greggs Allergen Guide and
   product nutritional information that can be guaranteed as correct
   and up to date" ([greggs.com/nutrition](https://www.greggs.com/nutrition));
   McDonald's UK runs a per-item [nutrition calculator](https://www.mcdonalds.com/gb/en-gb/good-to-know/nutrition-calculator.html)
   and a dated allergen booklet; Costa publishes a
   [nutrition/allergens data page](https://www.costa.co.uk/stores/nutrition-allergens/data/)
   and PDFs; Pret publishes a [nutrition & allergen guide](https://www.pret.com/en-US/allergen-guide);
   Nando's publishes an editioned nutritionals guide (e.g. "June 2025
   v2" [PDF](https://assets.ctfassets.net/xlzobf9ybr6d/kYavOsQXH0B1uwA5v1yB4/db96790e480517cc0bc8b2b0aaaf9907/153634_Nan_Nutritionals_Allergen_Guide_v2_Jun2025_11x8.5_web.pdf)).
   Editions and dates on these documents define our chain refresh
   cadence for free.

**The bar to beat:** Nutracheck's trust without Nutracheck's
weaknesses (online-required, dated app, no provenance shown per item).

## 2. What fails

- **Verification theatre (MyFitnessPal's green tick).** The canonical
  failure: Chick-fil-A waffle fries with 25 duplicate entries, "most
  wrong, half bearing a green verification tick"
  ([MFP community](https://community.myfitnesspal.com/en/discussion/10866427/delete-duplicate-and-incorrect-foods)).
  A badge that can appear on unreviewed data is worse than no badge —
  it teaches users the badge lies. Rule: **the Verified chip can only
  ever render for `source = 'volyume'` rows that passed the protocol
  below.** No partial verification, no inherited ticks.
- **Database rot ignored.** Inaccurate-data complaints reach 24.1% of
  users past six months — the second-biggest complaint in that cohort
  — and the round-1 synthesis is blunt: users don't quit on day one
  over bad data, they quit at month four
  ([Nutrola 50k-review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)).
  A verified layer with no refresh programme becomes this failure in
  ~18 months as products reformulate.
- **Stale "verified" claims.** Nothing in the market shows *when* an
  item was last checked. The first time a user catches a "verified"
  item disagreeing with the pack in their hand, trust inverts. Showing
  the last-checked date is the honesty mechanic that survives this.
- **Duplicate clutter.** Lifesum/MFP-style conflicting entries for the
  same product are the visible symptom users quote. Ranking verified
  first without suppressing the EAN-identical OFF duplicate just makes
  a longer, more confusing list.
- **Silently overriding the user's own data.** A user's custom entry
  for a barcode must not be silently demoted below our verified row
  (house rule: never silently change anything; see §4 ranking note).

## 3. User psychology

- **Moment of need:** the flicker of doubt at result-choice time
  ("which of these six entries is right?") and at the detail sheet
  ("can I trust this number?"). The badge answers at exactly that
  moment, in the place the eye already is. No new surface anywhere.
- **Habit loop:** cue = search/scan during logging; action = tap the
  top (verified) result without comparison-shopping; reward = visible
  within seconds — the chip plus one fewer decision. This *removes*
  effort (the duplicate-adjudication tax) from the >30s-kills-retention
  budget rather than adding anything
  ([JMIR via Cronometer review](https://calorie-trackers.com/reviews/cronometer/)).
- **Effort budget:** zero added taps. Verified-first ranking shortens
  the scan-the-list time for the most-logged foods in the country.
- **Emotional safety:** neutral feature; accurate kcal data actively
  supports the ED-safety floors (the engine's numbers are only as
  safe as the food data beneath them). No behaviour change under
  wellbeing/ED flags required; nothing celebratory or streak-like here.
- **Trust mechanics:** show working — "checked by a human, against the
  label, on this date". Per-item, not just marketing copy.
- **Word-of-mouth surface:** "it's got the whole Greggs menu, checked
  by a human, and it works on the gym wifi that doesn't work". The
  screenshot is a Greggs sausage roll with a Verified chip; the
  tellable line is "every verified food is checked against the label."

## 4. The Volyume implementation

### Placement (placement is the product)

No new screens, no new tabs, no settings entry. The feature lives
entirely inside four existing surfaces:

1. **Search results list** (`FoodSearchScreen` → `FoodRow`): verified
   rows rank first; the chip sits in the existing meta line.
2. **Food detail sheet** (`FoodDetailSheet`): the chip plus a one-line
   provenance statement, and the new "Report this food" row at the
   bottom (the locked strategy already promises this link; it is not
   yet built — verified in code 2026-06-10).
3. **Barcode scan resolve**: when an EAN matches both a verified row
   and an OFF row, the verified row wins (today `findLocalByBarcode`
   returns an arbitrary first match — `LIMIT 1`, no ordering).
4. **You → Credits** + Play listing (with COMP-012): the programme
   statement lives where trust claims already live.

### Badge anatomy (SourceChip extension)

- `SourceChip.js` LABELS gains `volyume: 'Verified'`; `FoodRow.js`
  SOURCE_LABEL gains the same. Verified styling departs from the
  neutral grey chip: amber/trusted accent per the locked strategy's
  chip taxonomy ("amber for trusted-curated"), small tick glyph
  (`checkmark-circle`, 12pt) before the word, AA contrast on dark
  theme via `theme.js` tokens, tabular figures untouched.
- Code ground truth (2026-06-10): `SourceChip.js` exists but is
  currently rendered nowhere — `FoodRow` prints an inline text tag and
  `FoodDetailSheet` draws its own inline chip (lines 109–111, which
  would render raw "VOLYUME" today). The build should route both
  through `SourceChip` for this one label at minimum; the unused
  component and the duplicated chip styling are noted, not fixed, per
  working rules.
- Accessibility: chip `accessibilityLabel` = "Verified by Volyume";
  the row's existing label gains ", verified" after the kcal clause.
  Colour is never the only signal (tick + word).

### Ranking rules (waterfall.js + localCache.js)

Code ground truth: `searchLocalByName` already orders
`rank, verified DESC, lower(name)` — the verified boost exists and is
dormant because no row has `verified = 1`. The changes are small:

1. **Name search:** keep `customs first, then globals` (see deviation
   note below). Within globals the existing `verified DESC` tiebreak
   does the work once verified rows exist. Add EAN-dedupe: exclude a
   `foods` row from results when a `source = 'volyume'` row shares its
   `barcode_ean` (`NOT EXISTS` subquery) — one product, one entry,
   the Nutracheck property.
2. **Barcode resolve:** add `ORDER BY verified DESC, source = 'volyume' DESC`
   before `LIMIT 1` in `findLocalByBarcode`. User custom row still
   checked first (existing behaviour, explicit comment in code).
3. **Network results** (live OFF, USDA) already only run after a local
   miss, so they sit below verified by construction. No change.

**Stated deviation from tasking:** the tasking proposed
`verified > local custom`. Recommend **custom stays above verified for
the user's own entries**: the code comment in `findLocalByBarcode` is
an explicit prior decision ("an item they keyed in themselves beats
anything from the shared library, since they chose to override it"),
and demoting a user's deliberate entry would silently change their
logging — against the house trust rule. v2 nicety (deferred): a gentle
one-time line on the custom row when a verified row now exists for the
same barcode ("There's now a verified entry for this one"), never an
automatic switch.

### Search-result grouping copy

Results stay one flat `FlatList` (no SectionList exists; adding
section headers adds reading cost for no decision value). Verified
rows simply rank first with the chip. One-time educational moment: the
first time a search returns ≥1 verified row, a single dismissible line
above the list (shown once ever, AsyncStorage flag):

> "Items marked Verified are checked by a human against the label.
> They show first."

### The trust moment

"Every verified item is checked by a human" is told, in this order:

1. **Detail sheet, every verified item, always** (the load-bearing
   one): "Checked by the Volyume team against the maker's label.
   Last checked 12 May 2026." — the date comes from `fetched_at`,
   which is free to carry the verification date for `volyume` rows
   (no schema change).
2. The one-time search line above.
3. **You → Credits**, beneath the existing attributions: "Verified
   items are checked by the Volyume team against the manufacturer's
   label or the chain's published nutrition guide, and rechecked
   quarterly."
4. Play Store listing / Welcome trust row — joins COMP-012's
   verifiable-claims set ("UK foods, human-checked" is only claimable
   once phase 1 ships).

### Copy direction (house voice — plain, terse, honest)

- Chip: "Verified"
- Detail sheet: "Checked by the Volyume team against the maker's
  label. Last checked 12 May 2026."
- Report sheet title: "Report this food" · body: "Tell us what's
  wrong. We check every report against the label." · after submit:
  "Thanks. We'll check it." (no overpromising on timelines)

### Edge cases / offline

- Offline: verified layer is bundled; everything above works with no
  connection (badge, ranking, detail sheet). Reports queue locally and
  flush when online (writeback.js queue pattern).
- A verified item that fails a later recheck: corrected row ships via
  delta (see §7); never delete — update values and `fetched_at`.
- Chains' seasonal items that disappear: keep the row (old diary
  entries resolve against it) but ops can zero its search weight in a
  future pass; v1 simply leaves them searchable.
- Per-100g and per-serving: every verified row carries `serving_g` +
  `serving_label` ("1 sausage roll · 103g") AND correct `*_100g`
  values, so `ServingPicker` and the kcal-per-serving line both work.
  Chain items where only per-portion data is published get per-100g
  derived from published portion weight; where no portion weight is
  published, the item ships per-portion with `serving_g` as the
  denominator basis and a 100g-normalised conversion at build time
  (build script enforces internal consistency, same Atwater ±20% rule
  as `sanityChecks.js`).

## 5. The dataset programme (the actual product)

### Phase 1 scope (~1,900 items)

- **Top ~1,000 supermarket SKUs by Volyume's own telemetry.** Cloud
  `food_entries` sync already carries `food_ref`; migration 051
  computes per-user frequents nightly — the same infrastructure
  produces a global top-N table (one ops SQL view, no client change).
  Power-law logging means the top 1k covers a disproportionate share
  of logged volume. Seed the queue before telemetry volume exists with
  a UK staples list: meal-deal sandwiches, milk, breads, branded
  cereals, protein yoghurts (Skyr/Fage/Arla), chicken breast packs,
  ready meals, protein bars/shakes, crisps, the obvious gym-shopper
  basket across Tesco/Sainsbury's/Asda/Aldi/Lidl own brands.
- **Five chains' full menus (~900 items):** Greggs (~150), McDonald's
  UK (~250), Costa (~250), Pret (~200), Nando's (~150) from their
  official publications (§1 item 4). Wetherspoon and Subway are the
  phase-2 expansion, matching Nutracheck's coverage list.

### Verification protocol (per item)

1. **Source-of-truth rules, in priority order:**
   - Packaged SKU: the physical pack's nutrition declaration
     (photographed), else the **brand owner's** own product page.
     Nutrition declarations are mandated facts under assimilated
     Regulation (EU) 1169/2011, so transcription from the pack is
     fact-recording, not database extraction.
   - Retailer own-brand: physical pack only (the retailer's website is
     off-limits — §6).
   - Chain item: the chain's current official guide, with the edition
     identifier and an archived copy filed.
   - Generic food: CoFID value (already licensed OGL v3) — these stay
     `source = 'cofid'`; the verified layer does not duplicate them.
   - **Never OFF.** Verifiers must not have the OFF entry open while
     creating a verified row (clean-room rule — §6).
2. **Dual entry:** two independent transcriptions per item; the build
   script diffs them; any mismatch goes back to the source photo.
3. **Automated checks at build time** (mirrors `sanityChecks.js`):
   kcal within ±20% of 4P+4C+9F; P+C+F ≤ 110 g/100 g; kcal/100g ≤ 900;
   serving fields present; per-serving × density consistency.
4. **Provenance ledger (ops-side, not shipped):** per item —
   source kind, edition/date, photo reference, checker initials,
   checked-at date. This ledger is also the legal evidence of
   independence from OFF.

### Refresh cadence

- **Supermarket SKUs: quarterly.** Re-verify (a) the top 100 by
  current logging volume, (b) every item with an open report,
  (c) a rotating ~15% sample — full coverage cycles in ~18 months,
  hot items every quarter.
- **Chains: per published edition, checked monthly, refreshed at
  least seasonally.** The chains date their guides (Nando's "June 2025
  v2"; McDonald's allergen booklet carries a date in its filename) —
  a 10-minute monthly check of five URLs detects new editions.
- Every refresh updates `fetched_at`, which updates the user-visible
  "last checked" date — the cadence is publicly accountable.

### Tooling (deliberately boring)

Spreadsheet (Google Sheets or CSV-in-repo, one row per item with both
entries + provenance columns) → `scripts/seed/buildVerifiedSnapshot.js`
(new, ~150 lines, same shape as the existing `buildOffSnapshot.js`
slot) → emits:
- `assets/seed/volyume_verified.dat` (bundle; same `_meta.generatedAt`
  + rows format `seed.js` already parses), and
- a service-role upsert script targeting cloud `foods`
  (`source='volyume'`, `source_id` = deterministic slug for chain
  items / EAN for SKUs, `verified=true`, bumped `updated_at`) for the
  delta path.

~1,900 rows ≈ 300–500 KB — negligible bundle cost next to the OFF
snapshot.

### Hours and cost (internal estimates)

Per 100 packaged SKUs: first entry ~4 min + independent second entry
~3 min + adjudication/QA ~2 min ≈ **15–17 hours per 100 items**; at
£15–25/h (nutrition student / RA) ≈ **£250–425 per 100 items**, plus
~£1–3/item product purchase where a pack must be bought (most staples
are in the founder's actual shopping anyway). Chain items are faster
(structured official tables): ~8–10 h per 100. Phase 1 total:
**~220–280 hours ≈ £4–6k contracted, or founder-time across ~8
weekends.** Quarterly refresh: **~30–45 hours.** Cronometer's protocol
(photo front + panel, human review per item) is the closest published
analogue confirming this is minutes-per-item work, not seconds
([CRDB publishing](https://support.cronometer.com/hc/en-us/articles/360018652672-Publishing-a-food-to-the-CRDB-Database)).
(FoodNoms' "Lessons Learned from Building a Crowdsourced Food
Database" corroborates curation-queue economics; direct fetch blocked
— search-extract only.)

## 6. The legal seam (cited; the one thing that can kill this)

1. **ODbL share-alike (Open Food Facts).** OFF data is ODbL 1.0: use
   is free including commercially, with attribution and share-alike;
   "if you combine data from Open Food Facts with other databases,
   then the ODbL requires that the resulting database must be released
   as open data as well" ([OFF terms of use](https://world.openfoodfacts.org/terms-of-use);
   [OFF API conditions](https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api)).
   The escape is built into the licence: ODbL §4.5(b) exempts
   **collective databases** — independent databases assembled into a
   collective whole — from share-alike; only **derivative** databases
   (adapted, corrected, merged records) trigger it
   ([ODbL 1.0 text](https://opendatacommons.org/licenses/odbl/1-0/);
   [ODC licence FAQ](https://opendatacommons.org/faq/licenses/);
   [OSMF Collective Database Guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline) — the
   most developed public interpretation: independence holds when a
   data type/record comes wholly from one source, never merged
   per-record).
   **Design consequences (absolute):**
   - Verified rows are created clean-room from labels/official guides,
     never seeded from, corrected from, or back-filled with OFF values
     — not even one fibre field. The provenance ledger proves it.
   - The shared `foods` table is fine: rows are wholly one source,
     distinguished by `source`; that is a collective database.
   - Duplicates are **suppressed at read time, never merged**.
   - The OFF subset we redistribute (snapshot + deltas) stays
     attributed and ODbL — already done on the Credits screen.
   - If this discipline ever slips, the remedy demanded could be
     publishing the verified dataset under ODbL — i.e. donating the
     moat to every competitor. This is the single failure risk.
2. **Supermarket websites/APIs are not a source.** Tesco's terms
   prohibit any automated extraction without written consent and the
   Tesco Labs developer API is discontinued
   ([Tesco T&Cs](https://www.tesco.com/shop/zone/general-terms-and-conditions);
   [Tesco Labs portal](https://devportal.tescolabs.com/)); Sainsbury's
   has no public product API. Independently, UK sui generis database
   right (Copyright and Rights in Databases Regulations 1997) protects
   retailer product databases against extraction/re-utilisation of any
   substantial part — quantitatively or qualitatively
   ([GOV.UK guidance](https://www.gov.uk/guidance/sui-generis-database-rights);
   [SI 1997/3032](https://www.legislation.gov.uk/uksi/1997/3032)).
   Hence the protocol's physical-pack rule for own-brand items and
   item-by-item brand-owner pages (individual facts, not substantial
   extraction) for branded ones.
3. **Chain guides.** Published precisely so consumers can use the
   numbers, under the calorie-labelling regime (§1 item 4). We
   transcribe per-item facts into our own schema and attribute the
   source in the ops ledger. Residual caution: wholesale reproduction
   of a chain's entire compiled guide could theoretically engage
   database right in the compilation — mitigated by re-keying facts
   into our schema and selection per logging relevance. **Action:
   10-minute legal sanity review of this paragraph before phase 1
   ships; not a blocker to starting the supermarket-SKU work.**
4. **CoFID:** OGL v3, attribution already live on Credits. Unchanged.
5. **Trade marks:** "Greggs Sausage Roll" as a product identifier is
   descriptive/nominative use, standard across every food app
   (Nutracheck, MFP, FatSecret all do it); no logos, no implied
   endorsement.

## 7. User-correction loop (report-an-error)

- **Surface:** "Report this food" row at the foot of
  `FoodDetailSheet` — on **every** food (verified, OFF, CoFID, USDA),
  because reports against OFF rows are exactly the phase-2
  verification queue. (The locked strategy promised this link;
  code-verified 2026-06-10: not yet built.)
- **Flow:** tap → small sheet: reason chips (Wrong calories or macros
  / Wrong serving size / Product has changed / Wrong name or brand /
  Other) + optional note ("Don't include personal details.") → submit
  → "Thanks. We'll check it." Two taps minimum.
- **Privacy fit:** the report carries `source` + `source_id`, reason
  code, note, `user_id` (for RLS), into **our own EU Supabase** — not
  an external service, so the no-PII-to-external-services rule is
  untouched. Telemetry gets only an allowlisted
  `food_report_submitted { reason, source }` event — no food
  identifier, matching the HP-2 precedent in `waterfall.js` (the
  barcode is dietary content and is never sent in telemetry; here the
  food ref travels in the user-initiated report channel instead).
- **Offline:** AsyncStorage queue + retry flush, cloned from the
  `writeback.js` pattern (consent gate not needed — the report tap is
  the consent).
- **Ops side:** `food_reports` cloud table (new migration: id,
  user_id, source, source_id, reason, note, status, created_at; RLS
  insert-own/read-own) + a weekly triage query. Closing the loop needs
  no notification: the corrected row reaches every device within ≤6 h
  of foreground via the existing delta (§8) — the fix itself is the
  reply. v2: "you reported this; it's fixed" notification (deferred).
- **Verified-item SLA:** any verified item with an open report is
  re-checked within the current quarter, hot items sooner.

## 8. Sync & delivery (code-verified)

- **Bundle (offline day 1):** third importer in `seed.js` —
  `importVerifiedSnapshotIfNeeded()`, `scopeKey 'volyume'`, flag
  `@volyume_verified_snapshot_loaded_v1`, same `.dat` asset/chunked
  transaction/version-flag machinery (pattern verified; the `_txMutex`
  already serialises a third concurrent importer).
- **Cloud delta (mid-quarter corrections):** verified —
  `food_library_pull` (migrate_028) returns *all* changed `foods` rows
  including the `verified` boolean, and `libraryDelta.js` upserts it
  (line 162 `verified = excluded.verified`), keyed on
  `(source, source_id)` so OFF refreshes can never clobber verified
  rows. Pull throttle: ≤ every 6 h on foreground. **Zero new client
  sync code.**
- **Two cloud-side prerequisites (the real schema work):**
  1. `foods.source` CHECK is `('off','usda','cofid','user_ocr')` in
     `migrate_015_food_logging.sql` line 20 and in
     `docs/DATABASE_SCHEMA_LOCKED.md` line 73 — a new migration must
     extend it with `'volyume'`, and amending the locked schema doc
     needs founder sign-off. The client-side SQLite table has no CHECK
     (verified, `database.js` ~771) — no local migration needed.
  2. CI/service-role upsert job from the build script into cloud
     `foods` (staging first; production only on the explicit
     production phrase, per house rules).
- **Re-import idempotency:** deterministic `source_id`s mean quarterly
  re-imports update in place via `uq_foods_source_source_id`; diary
  entries hold `food_ref = global:<uuid>` and are untouched by value
  corrections (historic entries keep their logged macros snapshot in
  `food_entries` — code-verified that entries store their own macro
  values at log time).

## 9. Whole-package integration

- **Strengthens:** COMP-002 meal-slot memory (verified rows become the
  high-trust frequents people re-log); COMP-022 barcode-miss chain
  (fewer misses on UK staples; misses that remain are genuinely
  long-tail); the Precision Coaching engine (targets computed on
  cleaner intake data — accuracy is upstream of every nutrition
  decision, including the safety floors); COMP-012 trust-row marketing
  (a new *verifiable* claim); the OFF write-back engine is unchanged
  and still grows the community layer beneath the verified one.
- **Duplication avoided:** `curatedFoods.js` (the suggested-meals
  staple table) stays as-is — it serves meal composition, not search;
  its CoFID-grade generics overlap CoFID rows, not verified SKUs. Do
  not create a second staples list in the verified layer; generics
  remain CoFID's job.
- **Streamlining:** net interface delta is one chip label, one
  one-time line, one row on an existing sheet. Search results get
  *shorter* in effective length (dedupe + verified-first means the
  right answer is row 1). Nothing lands on Home, the session screen,
  or any new screen.
- **ED/wellbeing flags:** no interaction; nothing celebratory,
  numeric-pressure or streak-like. Accurate data quietly improves the
  safety system's inputs.
- **Free/Pro:** no gating change. Food diary/search is Pro; verified
  data simply appears wherever foods already appear.

## 10. Retention & word-of-mouth mechanics

The loop this feeds is the month-four trust loop: trust failures kill
diaries at month four (24.1% inaccuracy complaints past six months —
round-1 evidence), and Nutracheck demonstrates the inverse — a
verified UK database alone sustains a 4.9 Trustpilot and a paid
subscriber base. Every verified hit is a micro-deposit of trust at the
exact moment a competitor app would have presented six conflicting
entries; the dated provenance line gives reviewers a concrete,
screenshot-able thing no incumbent shows. The tellable sentence —
"every verified food is checked by a human against the label" — is
short enough to survive a gym conversation, and the report loop turns
the angriest moment (catching a wrong entry) into the strongest
loyalty moment (it was fixed by next week, silently, on your phone).

## 11. Beating the benchmark

Nutracheck has verification but requires a connection, shows no
per-item provenance, and lives in a dated app with no training side;
MacroFactor has verification but a thin UK branded long tail and
communicates trust only at the marketing level; Cronometer has the
correction protocol but middling UK convenience data. Volyume is the
only product that can combine all four: **verified UK data + chains,
offline in the bundle, a visible per-item last-checked date, and a
correction loop that lands fixes on every device within six hours** —
plus the only honest answer when the verified layer misses: a
crowdsourced fallback that is itself badged as such, so the user
always knows which kind of number they are looking at. Nobody in the
market shows verification dates; that one honest detail converts
"trust us" into "check us", which is the house trust pattern applied
to data.

## 12. Measurement

1. **Verified-hit rate:** extend `food_search_attempt.source_hit` and
   `food_lookup_barcode.source` payload values with `'verified'`
   (value addition to existing allowlisted events, not new events).
   Target: ≥40% of UK searches resolve verified-first by phase-1 + 90
   days.
2. **Verified share of logs:** `food_logged` gains a `source`
   dimension — % of diary entries on verified rows (the truer measure
   of trust earned).
3. **Data-complaint rate:** `food_report_submitted` (new allowlisted
   event) per 1,000 `food_logged`, split by source — verified items'
   report rate must run well below OFF items'; the gap is the
   programme's quality proof.
4. **Month-4 diary retention:** cohort of users with ≥3
   `food_logged` days/week in month 1; share still logging in weeks
   13–16, tracked before/after phase 1 — the metric the round-1
   evidence says this feature exists to move.

## 13. Build notes

- **Files touched (client, ~3–5 days):**
  `src/components/food/SourceChip.js` (+1 label, verified styling),
  `src/components/food/FoodRow.js` (+1 SOURCE_LABEL, chip render),
  `src/components/food/FoodDetailSheet.js` (label map fix, provenance
  line, report row + sheet), `src/lib/food/sources/localCache.js`
  (barcode ORDER BY, EAN dedupe subquery), `src/lib/food/seed.js`
  (third importer, ~20 lines), `src/lib/food/reports.js` (new — queue,
  writeback.js pattern), `src/lib/telemetry/events.js`
  (+`food_report_submitted`), one-time search banner in
  `FoodSearchScreen.js`.
- **Cloud (~2 days):** migration extending `foods.source` CHECK with
  `'volyume'` (+ locked-doc amendment, founder sign-off);
  `food_reports` table + RLS; telemetry allowlist extension migration;
  service-role upsert script. Staging only by default.
- **Ops repo:** verification sheet template,
  `scripts/seed/buildVerifiedSnapshot.js`, provenance ledger,
  monthly chain-edition checklist.
- **Reuse:** seed/delta/sanity/writeback patterns all proven in code;
  `fetched_at` repurposed as last-checked (no schema change);
  migration-051 aggregation pattern for the global top-N queue.
- **Effort sanity-check vs approved 9/7:** holds, with the honest
  reframing the proposal itself made — engineering is ~1.5 weeks
  total; the 7 is a **standing data-ops commitment** (~250 h phase 1,
  ~30–45 h/quarter forever). Budget it as an operating cost, not a
  project.
- **Risks:** (1) ODbL contamination via a careless merge — mitigated
  by the clean-room rule, read-time-only dedupe, and the provenance
  ledger; the only risk that is existential to the moat. (2) Refresh
  decay making "Verified" stale — mitigated by the visible
  last-checked date and the quarterly calendar; if the programme ever
  stops, the dates age publicly and honestly. (3) Scope creep towards
  Nutracheck's 350k — resist; the telemetry-ranked top slice plus
  chains captures most of the logged volume at ~1% of the catalogue
  size. (4) Locked-doc amendments (schema CHECK, strategy chip
  taxonomy already anticipates `Verified`) need founder sign-off
  before build.
- **Observed, not fixed (per working rules):** `SourceChip.js` is
  currently unused anywhere; `FoodDetailSheet` duplicates chip
  styling inline and would render raw uppercase source values for
  unknown sources.
