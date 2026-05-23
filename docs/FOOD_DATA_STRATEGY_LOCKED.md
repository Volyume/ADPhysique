# Food data strategy (locked)

How Volyume resolves a food lookup, sourced for free, with a strategic
engine (OCR write-back) that grows our hit rate over time at zero
ongoing cost. Locked 2026-05-23.

## Principles

1. **£0 recurring cost.** No paid APIs in v1. Paid sources
   (FatSecret Premier, Nutritionix Enterprise) are deferred until
   real production data justifies the spend.
2. **Offline-first.** Most lookups resolve from a bundled local
   database without network. The network is the slow path, not the
   fast path.
3. **Every miss becomes future coverage.** OCR write-back to
   OpenFoodFacts turns every unfound product into a contribution
   the next user benefits from.
4. **Source provenance shown.** Every food row in the UI shows a
   small chip naming the source (`OFF`, `USDA`, `CoFID`, `Custom`)
   so users can judge trust.

## The waterfall

A barcode scan or text search runs through the following sources in
order. First hit wins. Latency budget: <250ms cache hit, <1500ms cold
network lookup.

```
1. Local SQLite cache (foods + custom_foods this user has used)
2. Bundled OpenFoodFacts UK snapshot (~185K products, ships in app binary)
3. Bundled CoFID seed (3,300 UK generic foods)
4. Live OpenFoodFacts API
5. USDA FoodData Central API
6. Manual entry / OCR fallback
```

### Step 1: Local SQLite cache

Hits when the user has logged this food before, or when another
user's food sync has propagated it via a shared `foods` row.

Latency: <50ms.

### Step 2: Bundled OpenFoodFacts UK snapshot

OpenFoodFacts publishes nightly JSONL and Parquet dumps of its full
dataset under the Open Database License 1.0. We extract the UK
country tag (`countries_tags: en:united-kingdom`) into a curated
snapshot of approximately 185,000 products. Compressed size 20-40 MB.

Snapshot contents per product:

- Barcode (EAN-8, EAN-13, UPC-A as `barcode_ean`)
- Name, brand, serving size
- kcal/100g, protein/100g, carbs/100g, fat/100g, fibre/100g
- Sodium/100g, sugar/100g where present

Snapshot is loaded into the `foods` table on first run via a one-time
seed migration. Replaced via OTA delta downloads (see refresh strategy
below) to keep the binary small.

Coverage: based on OFF's own counts as of late 2025, this includes
6,644 Tesco own-brand products, 3,469 Waitrose, 2,174 Asda, 1,934
Lidl, 1,601 Sainsbury's, plus Aldi, Morrisons, M&S, and major branded
products. Projected hit rate for typical UK shoppers: 75-85% out of
the box.

Latency: <50ms (SQLite indexed barcode lookup).

### Step 3: Bundled CoFID seed

Composition of Foods Integrated Dataset, published by Public Health
England under the Open Government Licence v3.0. Approximately 3,300
UK generic whole foods ("chicken breast, raw", "oats, rolled",
"banana, raw"). ~500 KB compressed.

Used for whole-food text search where no barcode exists. CoFID
entries appear with source chip `CoFID`. Required attribution string
appears on the You → Credits screen and in the food detail sheet for
each CoFID entry: "Contains public sector information licensed under
the Open Government Licence v3.0."

Latency: <50ms.

### Step 4: Live OpenFoodFacts API

Used when the bundled snapshot misses (newly added products,
unusually localised products). Endpoint:

```
GET https://world.openfoodfacts.org/api/v2/product/{ean}.json
```

OFF's rule: 1 API call per real user action; never scrape; respect
their cache. The waterfall enforces this — the API is only called
after cache misses.

On hit: response is normalised and inserted into the local `foods`
table (and queued for sync up to Supabase so other users get a cache
hit). Source = `'off'`, `fetched_at` = now.

Required attribution in the You → Credits screen: "Product data from
Open Food Facts, licensed under the Open Database License 1.0."

Latency: 300-1200ms on UK 4G.

### Step 5: USDA FoodData Central

Free API key from api.data.gov; 30-second sign-up. ~380,000 items
covering branded foods (heavy on US brands but useful for imported
products) and the Foundation Foods dataset of carefully measured
whole foods.

Endpoints:

```
GET https://api.nal.usda.gov/fdc/v1/foods/search?api_key={KEY}&query={UPC}
GET https://api.nal.usda.gov/fdc/v1/food/{fdcId}?api_key={KEY}
```

On hit: normalise the LabelNutrients block (which uses different
units than our /100g schema; conversion happens at write time),
insert into local `foods`, queue for sync. Source = `'usda'`.

Latency: 400-1500ms.

Used after OFF because the UK hit rate is lower; serves as a
secondary catch for imports and a primary for US-origin products.

### Step 6: Manual entry / OCR fallback

When no source returns a match, the user lands on the "Add custom
food" sheet pre-populated as far as possible. Two paths:

#### Manual

User types the food name, optional brand, serving size, and
macros. Saved to `custom_foods` for personal use.

#### OCR (move #1.5 onward)

User taps "Snap the nutrition label." Camera opens via
`react-native-vision-camera` + MLKit text recognition. Parsed values
prefill the form. User confirms or edits. On save:

- Inserts into `custom_foods` for personal use.
- With explicit user consent ("Also share this with Open Food Facts
  so other Volyume users get the same lookup"), POSTs to OFF's
  contribution endpoint. The shared photo and parsed data become a
  new OFF product entry. Volyume becomes a contributor source.

Consent copy (exact wording, voice rules applied):

> "Found this one yourself? You can share it with Open Food Facts so
> the next Volyume user gets a hit instead of a miss. We only send
> the label photo and the macros you confirmed. Off by default."

OCR write-back is the strategic engine of the food data layer. Every
miss becomes a future hit, for free.

## Snapshot refresh strategy

The bundled OpenFoodFacts UK snapshot drifts. Two refresh paths:

### Monthly delta downloads (in-app)

A background task pulls the diff of OFF UK changes since the bundled
snapshot's `built_at` date and applies it to local `foods`. Triggered
on app foreground if the last delta is more than 30 days old.

Hosted on Supabase Storage in a public bucket (`off-deltas`). CI job
generates the delta from OFF nightly dumps weekly; client downloads
the latest delta less than or equal to its current snapshot age.

Delta size: typically 2-5 MB compressed.

### Snapshot rebake (in-binary)

Every app release ships a fresh full snapshot, replacing the
previous one. Reduces the OTA delta size users need to download
post-update. CI task in the release workflow.

## Hit-rate targets

| Window | Target (free stack only) |
| --- | --- |
| Day 1 (bundled snapshot only) | ≥75% UK supermarket products |
| Day 30 (with live OFF + USDA + OCR write-back) | ≥85% |
| Day 60 (cumulative OCR contributions) | ≥90% |
| Day 90 review | Decision point: revisit paid APIs only if still <90% |

Telemetry tracks `food_lookup_attempt` events with `source_hit`
(which step in the waterfall won) and `source_miss` (when all steps
miss). Aggregated daily for the dashboards.

## Source chip taxonomy

In the food detail sheet and search results, each row shows a small
chip naming the source:

- `OFF` — Open Food Facts (bundled or live)
- `USDA` — USDA FoodData Central
- `CoFID` — UK Composition of Foods (Public Health England)
- `Custom` — User-created
- `Coach` — Created by the user's linked coach (phase 2)
- `Verified` — Volyume-curated, manually checked

Chip styling reuses the existing tag/badge component from
`src/components/`. Colour matches the design system (amber for
trusted-curated, neutral grey for community sources).

## Data quality and verification

Community sources (OFF in particular) have known quality issues:
typos in product names, occasional misentered macros, wrong serving
sizes. Mitigations:

- **Sanity checks at insert time.** Reject any food row where
  kcal/100g is implausible (greater than 900 or negative), or where
  protein + carbs + fat in grams sum to more than 110% of total
  weight, or where kcal is more than 20% off the macro-derived
  estimate (4·protein + 4·carbs + 9·fat).
- **User-flagging.** Every food detail sheet has a "Report this
  food" link that submits to an internal review queue.
- **Coach-curated overrides** (phase 2). Coaches can mark a food as
  `verified` for their linked clients.

## Performance constraints

- Bundled snapshot load must not delay first paint. Snapshot
  populates `foods` during the splash screen window.
- Barcode lookup must beat the keyboard appearing. Target: <250ms
  from scan-confirm to food detail sheet open.
- Text search must respond within 120ms for local results, 450ms
  including network.

## Implementation files

```
src/lib/food/
├── waterfall.js              -- orchestrator (steps 1-5 plus OCR fallback)
├── sources/
│   ├── localCache.js         -- step 1
│   ├── bundledOff.js         -- step 2
│   ├── cofid.js              -- step 3
│   ├── liveOff.js            -- step 4
│   └── usda.js               -- step 5
├── normalisers/
│   ├── offToFood.js
│   ├── usdaToFood.js
│   └── cofidToFood.js
├── ocr.js                    -- move #1.5
├── writeback.js              -- move #1.5, OFF contribution flow
└── sanityChecks.js           -- macro and kcal sanity rules
```

Plus the seed scripts (CI / one-time):

```
scripts/seed/
├── buildOffSnapshot.js       -- extracts UK products from nightly dump
├── buildCofidSnapshot.js     -- transforms CoFID into our schema
└── buildDelta.js             -- computes diffs for the OTA delta path
```

## Attribution requirements

The You → Credits screen displays the following, exact wording:

> Volyume uses food data from open sources.
>
> Open Food Facts. Product data licensed under the Open Database
> License 1.0. Many contributors, many countries; the snapshot we
> ship is the UK subset, updated regularly.
>
> Composition of Foods Integrated Dataset (CoFID). Contains public
> sector information licensed under the Open Government Licence v3.0.
> Published by Public Health England.
>
> USDA FoodData Central. Provided by the U.S. Department of
> Agriculture, public domain.

The OCR write-back consent screen (move #1.5) shows the OFF
contribution copy quoted earlier.

## Upgrade trigger for paid APIs

The free stack is locked at v1 because £0 ongoing cost matters more
than a marginal hit-rate improvement until we know the product works.
Paid sources (FatSecret Premier, Nutritionix Enterprise) cost £1,400+
per month each at entry tiers; that money is better spent acquiring
users than buying coverage we mostly already have.

Revisit the decision when ALL three triggers fire together:

1. **UK hit rate has plateaued below 90%** for 30+ days despite OCR
   write-back contributions running.
2. **Monthly recurring revenue covers the API cost twice over.** A
   £1,400/mo API spend requires £2,800/mo MRR minimum (so the API is
   never more than half our gross). Sub-£3k MRR means we stay free.
3. **Production telemetry confirms the misses are concentrated in
   one source's strength.** If 70% of our misses are US imported
   brands, USDA already covers most of them and a paid US-heavy source
   (Nutritionix) wouldn't add much. If 70% of misses are UK
   independent retailer products (Holland & Barrett, Whole Foods
   Market UK, etc.) a UK-focused paid source might be worth it.

If only one or two triggers fire, hold. The free stack with OCR
write-back compounds month over month; paying for static coverage
when we have a growth engine is the wrong trade.

A separate review note will be created at the day-90 milestone
(`docs/FOOD_DATA_REVIEW_90D.md`) capturing the actual numbers.

## Decisions and trade-offs explicitly considered

| Considered | Decision | Reason |
| --- | --- | --- |
| FatSecret Platform | Out at v1 | Sales-led, premier-paid, no UK pricing transparency |
| Nutritionix Enterprise | Out at v1 | $1850/mo entry tier per their public pricing |
| Edamam | Out at v1 | Limited UK coverage, paid above free tier |
| OFF + USDA + CoFID free stack | Locked | Zero cost, OCR write-back compounds coverage |
| WatermelonDB for food data | Out (see DECISION 6.1) | Hand-rolled sync is sufficient |
| AI photo logging | Out at v1 | Cost, accuracy, ED amplification risk |

## Acceptance check

- Cold scan of Tesco Finest sourdough resolves to add-sheet in
  under 1.5s.
- Cold scan of a fresh-bake artisan bread (no barcode, no OFF
  entry) lands on the manual-add sheet within 800ms.
- Bundled snapshot loaded into SQLite in under 3s on first run.
- OFF attribution and CoFID OGL attribution visible on the
  Credits screen.
- UK barcode benchmark: 200 supermarket products (40 each from
  Tesco, Sainsbury's, Asda, Morrisons, Aldi/Lidl, Waitrose, M&S)
  hit rate ≥85% out of the box.
