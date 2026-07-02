# E3 search: before/after measurement (bundled corpus)

Date: 2026-07-02. Part 3 of the approved E3 plan (live-merge + FTS5 +
measurement). Harness: `scripts/e3-search-harness.cjs` — loads the REAL
bundled corpora (OFF UK 25,965 rows, snapshot 2026-05-25; CoFID 2,852 rows)
into an in-memory SQLite with FTS5 (the same feature set as the shipped
SQLCipher build) and runs the fixed query set against both implementations:

- **LIKE (before):** the pre-E3 `searchLocalByName` SQL — name prefix first,
  then substring; brand never searched.
- **FTS5 (after):** the E3 index (`porter unicode61`, `prefix='2 3 4'`,
  name + brand) with quoted prefix tokens and bm25 ordering — the same DDL
  `database.ensureFoodSearchIndex` creates and the same query
  `localCache._searchFts` runs (correctness of the shipped module is pinned
  end-to-end by `src/lib/food/__tests__/localCacheFts.test.js`).

`hit@` = 1-based position of the first relevant row in the top 25 (relevance
= needle substring over name+brand; needles listed in the harness). Times are
the median of 15 runs on this container's CPU — an order-of-magnitude PROXY
for a device, not a device number (see the device steps below).

## Results

One-time FTS index build over all 28,817 rows: **75 ms** (this is the
worst-case migration cost an existing install pays once; fresh installs index
incrementally through the seed triggers).

| query | kind | LIKE hits | LIKE hit@ | LIKE ms | FTS hits | FTS hit@ | FTS ms |
|---|---|---|---|---|---|---|---|
| chicken breast | exact multi-word | 25 | #1 | 4.2 | 25 | #1 | 0.5 |
| chick brea | partial multi-word | 0 | miss | 4.6 | 25 | #1 | 0.6 |
| greek yog 0 | partial + noise token | 0 | miss | 4.0 | 9 | #1 | 0.3 |
| whole br | partial words | 6 | miss | 3.9 | 25 | #3 | 0.5 |
| porridge oats | multi-word | 25 | #1 | 4.2 | 25 | #1 | 0.2 |
| peanut butter smooth | three words | 8 | #1 | 3.6 | 25 | #1 | 0.5 |
| hovis | brand only | 5 | #1 | 4.2 | 25 | #1 | 0.1 |
| warburtons | brand only | 2 | #1 | 3.8 | 25 | #1 | 0.2 |
| cadbury | brand only | 22 | #1 | 4.5 | 25 | #1 | 0.3 |
| semi skimmed milk | multi-word | 25 | #1 | 4.7 | 25 | #1 | 0.3 |
| baked beans | multi-word | 25 | #1 | 4.1 | 25 | #1 | 0.2 |
| eggs | plural stem | 25 | #1 | 5.2 | 25 | #1 | 0.4 |
| chiken | misspelling | 3 | miss | 4.6 | 3 | miss | 0.1 |
| brocolli | misspelling | 3 | miss | 4.3 | 3 | miss | 0.1 |
| yougurt | misspelling | 3 | miss | 3.9 | 3 | miss | 0.1 |

## Reading

1. **The partial/multi-word class flips from miss to #1.** "chick brea",
   "greek yog 0" and "whole br" were total or effective misses under LIKE
   (a multi-word query only matched as one literal substring); under FTS each
   word matches independently as a prefix, so the target lands first.
2. **Brand search is new capability.** LIKE never looked at the brand column;
   "hovis" went from 5 accidental name matches to the full branded range.
   This also strengthens the E3 live-merge's local-confidence signal, since a
   brand query now produces a real local answer instead of a weak one.
3. **~10x latency drop at corpus scale** (0.1–0.6 ms vs ~4–5 ms per query in
   the container; both would widen on a mid-range phone but the ratio is
   structural: index probe vs full-table scan of 28.8k names).
4. **Pure misspellings stay local misses for the INTENDED food — by design.**
   Porter stemming folds inflections (eggs/egg), not typos; fuzzy matching
   was not in the approved plan. Honest caveat (review-corrected): the three
   measured misspellings each return 3 local hits here because the OFF corpus
   itself contains misspelled product names ("Chiken And Mushroom Soup",
   "Brocolli Chips", a "Yougurt" product) — and when such a set includes a
   prefix match, the local answer is judged strong and the part-1 live merge
   does NOT fan out. The merge catches a misspelling only when the local
   answer is genuinely weak (few hits, or none a prefix match). So a typo may
   surface same-typo branded products rather than the intended food; the
   reliable typo recovery remains retyping, which the FTS prefix matching
   makes cheap ("chik" → correct as you go).

## Device-run steps (founder, physical Android, EAS build)

Node timings above are a proxy. To confirm on-device:

1. Install the green EAS build on the test device; first launch after update
   pays the one-time index build inside the migration (expect the launch to
   feel normal; the container cost was 75 ms, budget under a second on
   device).
2. Open the Diary, Add food, and type each of: `chick brea`, `greek yog`,
   `hovis`, `porridge oats`.
   Expected: results appear within the debounce beat (no spinner dwell), the
   named food is first or near-first, and branded Hovis lines appear for the
   brand query.
3. Aeroplane mode ON, repeat step 2. Expected: identical local results
   (offline path unaffected).
4. Aeroplane mode ON, type `chiken`. Expected: whatever local matches exist
   show (likely same-typo branded products); no crash, no spinner hang.
5. Aeroplane mode OFF, type a query with NO strong local answer (e.g. an
   obscure brand you have never logged, or `qinoa`). Expected: any weak
   local rows stay on top and live results merge in below them (the part-1
   fix) within ~1.5 s. Note `chiken` itself will NOT trigger the merge — the
   corpus contains same-typo product names that satisfy the local answer
   (see Reading, point 4).
