# Food data seed scripts

These scripts generate the bundled data assets that ship with the
APK. Run them locally before pushing a branch you intend to build
for distribution. The generated files live under `assets/seed/` and
are imported on app boot by `src/lib/food/seed.js`.

## buildOffSnapshot.js

Produces `assets/seed/off_uk_snapshot.json` — the bundled
OpenFoodFacts UK product snapshot.

### When to run

- Before each EAS build that you want to ship a fresher product
  database with. The bundled snapshot is the "fast path" for
  barcode lookups. Live OFF / USDA cover new products that arrived
  after the snapshot was generated.
- A monthly refresh is usually enough. New product launches and
  reformulations propagate through OFF within days; users get them
  via the live API fallback until the next snapshot.

### How to run

```bash
node scripts/seed/buildOffSnapshot.js
```

No API key needed. Takes 20-40 seconds, makes ~25 polite paginated
requests to the OFF search API. Writes the snapshot to
`assets/seed/off_uk_snapshot.json` and prints the row count.

Then commit the file and push:

```bash
git add assets/seed/off_uk_snapshot.json
git commit -m "data(off): refresh UK snapshot $(date +%Y-%m-%d)"
git push
```

### What's in it

Each row: `{ ean, name, brand, serving_g, serving_label, kcal_100g,
protein_100g, carbs_100g, fat_100g, fibre_100g, sodium_100g,
sugar_100g }`. Rows with missing core macros (kcal / protein /
carbs / fat) are dropped.

Currently capped at the OFF search API's practical pagination
limit (~25 pages × 1000 = ~25k UK products). That's the most
commonly-scanned subset.

For deeper coverage (the full ~150k UK products), use the OFF
nightly JSONL dump instead. Plan in
`docs/FOOD_DATA_STRATEGY_LOCKED.md`.

### Failure modes + recovery

- **OFF API rate-limits or returns 5xx.** Script retries the next
  page; if the very first page fails, exits with an error. Just
  re-run.
- **Empty output / very few rows.** OFF schema change or filter
  drift. Check the script's `toRow()` mapping against
  https://wiki.openfoodfacts.org/API and update.
- **File written but app doesn't import on next launch.**
  `food.seed.*` log lines in the in-app Debug Log surface the
  cause (asset load, parse, chunk insert, flag write — each is a
  distinct event). Sentry also receives errors.

### Licence

OpenFoodFacts data is published under the Open Database License
(ODbL) 1.0. The bundled snapshot is a derivative work and stays
under ODbL when distributed inside the app. Attribution lives in
the in-app Credits screen.

## Other scripts (not yet written)

- `buildCofidSnapshot.js` — UK Public Health England Composition
  of Foods dataset. ~3k generic foods, ~2MB. Open Government
  Licence v3.0. Catches generic items OFF doesn't have.
- `buildDelta.js` — diff two snapshots, produce a delta for the
  Supabase delta-pull RPC. Deferred until the delta pull infra
  ships.
