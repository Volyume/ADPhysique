# E7.3 — MFP / Cronometer food-history importers (PROPOSAL, decision required)

Status: **proposal only, nothing built.** E7 items ship propose→approve
(P5 growth queue). E7.1 (review prompts) and E7.2 (funnel events) are live;
this is the next item in the founder's sequencing.

Sources read for this memo: `src/lib/importExternal.js` (the whole file),
`src/lib/food/db.js` (addFoodEntry :40-95, hasAnyFoodEntries :202-210),
`docs/competitive-mastery-2026-06-29/cronometer-settings-config.md` §1K,
`docs/competitive-mastery-2026-06-29/mfp-settings-config.md` (export rows
:125-126, comparison :221-222).

---

## 1. Why (the growth case)

A switcher from MyFitnessPal or Cronometer arrives with months of food
history. Today Volyume imports **training** history only (Hevy/Strong CSV,
`importExternal.js`, ImportScreen "Import history"). Their food past is
simply lost, which weakens the day-one case for a paying nutrition user —
exactly the person the Pro tier wants. The training importer already proved
the pattern converts switchers.

## 2. What the source apps actually export (mastery-dive evidence)

- **Cronometer**: free, in-app CSV export — `servings.csv` (one row per
  logged food with per-nutrient columns), plus dailySummary / biometrics /
  exercises CSVs. Confirmed at decompiled-class level (`_exportNutrients`,
  `runExport`; cron-settings §1K).
- **MFP**: "File export" (diary CSV over a chosen period) is
  **Premium-gated**; the free path is the GDPR "Export my information"
  email bundle. Confirmed (`FileExportActivity`, `export_my_information`;
  mfp-settings :125-126).

**Honesty note:** neither mastery doc captured the exact column headers of
those files. The parsers must be written against real sample exports
(founder-supplied or from a throwaway account) before ship. Until then any
column list in this memo is provisional and the build includes a
fail-closed "unrecognised format" path identical to `detectFormat()`
returning `'unknown'` today.

## 3. Proposed shape (mirrors the proven training importer)

New module `src/lib/food/importFoodHistory.js`, same pipeline as
`importExternal.js`: `parseCSV` (reuse the existing dependency-free parser)
→ `detectFoodFormat(rows)` (`'cronometer' | 'mfp' | 'unknown'` by column
fingerprint) → `parseCronometer/parseMfp` → `analyzeFoodImport` (preview:
day count, entry count, date range, duplicate days) → `runFoodImport`.

- Entries land as **day-keyed diary rows with macros only**: `food_ref =
  'import:<source>'`-style quick entries (kcal/protein/carbs/fat, fibre
  when present), meal slot mapped from the source's meal group, quantities
  as exported. **No matching against our food library** in v1 — matching
  thousands of historical rows against foods/OFF is where importers go to
  die; macros-accurate history is the value.
- **Direct SQL inserts in one transaction** (the `runImport` pattern), NOT
  a loop over `addFoodEntry()`: addFoodEntry fires `food_logged` telemetry
  and the `first_food_logged` E7.2 funnel event per row — an import would
  pollute the activation funnel and emit thousands of events. One
  `recomputeRollup` per touched day after the batch, one funnel-neutral
  `food_history_imported` telemetry event (source, day count) at the end.
- **Idempotent**: skip days already carrying imported rows from the same
  source (duplicate rule analogous to the training importer's
  user+started_at check).
- **UI**: a second card on the existing ImportScreen (You → Settings →
  Import history). **Pro-gated** — the food diary is Pro, so its importer
  is Pro (tier rule: never expose Pro to free).
- Sync: rows ride the normal food_entries sync path; nothing new.

## 4. ED-safety analysis (why this is safe, and one thing it must NOT do)

- Imported rows are **historical** (entry_date in the past). The weekly
  coach and ED pattern detector read recent windows; a bulk history import
  does not retroactively fire nudges or notifications, and the import path
  itself sends **no notification and no celebration**.
- `hasAnyFoodEntries` (E10 read-only lapse gate) starts returning true —
  correct and desirable: a lapsed importer keeps sight of their history.
- **Weight/biometrics import is explicitly OUT of scope.** Cronometer's
  `biometrics.csv` includes weight history; importing it would feed the
  trend/rapid-loss machinery with unvetted third-party data and is
  weight-adjacent surface the ED rules gate. If ever wanted, it is its own
  proposal.

## 5. Options (decision needed — pick one)

**A. Cronometer-only first (recommended).** Free export, self-serve for
any user, one format to verify with a sample file. Smallest build
(~parser + preview + insert + tests), ships this week alongside the queue.
MFP follows as a fast-follow once a real MFP export sample exists.

**B. Both at once.** Adds the MFP diary-CSV parser now. Blocked on getting
a real MFP Premium export sample (Premium-gated feature); the GDPR bundle
variant adds a second undocumented format. More surface, slower, and the
MFP columns are the least verifiable today.

**C. Park E7.3.** Skip importers; queue capacity goes to E8 FlashList /
P9 TalkBack / Wave 7 instead.

Founder inputs needed for A or B: a real `servings.csv` sample (throwaway
Cronometer account, log 2-3 days, export) — and for B additionally an MFP
File-export CSV. No new dependencies either way (the CSV parser already
exists in-repo).
