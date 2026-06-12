# R-17 — Performance & Reliability (external engineering-norms research)

Research agent r-17, ULTIMATE-APP MANDATE. This area is about **technique, not app
teardowns**: the goal is to source the canonical engineering fix for each a-17
bottleneck against fetched primary documentation, confirm where Volyume's
architecture is already correct, and rank pick-ups for both market poles (Besa the
newbie / light user; Eddie the power user). British English throughout.

Paired with: `audit/a-17-performance-reliability.md`.

---

## STEP 0 — TOOLING PROOF (verbatim quote + URL)

> "FTS5 is an SQLite virtual table module that provides full-text search
> functionality to database applications."

— SQLite official documentation, FTS5 extension, https://sqlite.org/fts5.html
(fetched 2026-06-12, end-to-end WebFetch succeeded). Tooling proven; research proceeds.

---

## 0. SOURCE LEDGER

| # | Source | URL | Verdict |
|---|---|---|---|
| S1 | SQLite — FTS5 extension (official) | https://sqlite.org/fts5.html | FETCHED |
| S2 | Expo — expo-sqlite SDK (official; `enableFTS`) | https://docs.expo.dev/versions/latest/sdk/sqlite/ | FETCHED |
| S3 | React (official legacy docs) — Error Boundaries | https://legacy.reactjs.org/docs/error-boundaries.html | FETCHED |
| S4 | Expo — EAS Update getting started (official) | https://docs.expo.dev/eas-update/getting-started/ | FETCHED |
| S5 | Expo — Run E2E tests on EAS Workflows with Maestro (official) | https://docs.expo.dev/eas/workflows/examples/e2e-tests/ | FETCHED |
| S6 | Shopify Engineering — Instant performance upgrade: FlatList → FlashList | https://shopify.engineering/instant-performance-upgrade-flatlist-flashlist | FETCHED |
| S7 | Android Developers — App startup time / launch-time vitals (official) | https://developer.android.com/topic/performance/vitals/launch-time | FETCHED |
| S8 | Sentry — Mobile Vitals: four metrics every mobile dev should care about | https://blog.sentry.io/mobile-vitals-four-metrics-every-mobile-developer-should-care-about/ | FETCHED |
| S9 | Citus Data — Scalable incremental data aggregation on Postgres | https://www.citusdata.com/blog/2018/06/14/scalable-incremental-data-aggregation/ | FETCHED |
| S10 | RN error-boundary best-practice survey (Ross Bulat; RN University; react-error-boundary) | (search digest, secondary) | SECONDARY |

**Fetch-failure log (4 failed URLs, none silently degraded — alternatives found):**
- `https://reactnavigation.org/docs/handling-errors/` → HTTP 404. Replaced by S3 + S10.
- `https://docs.expo.dev/build-reference/e2e-tests/` → HTTP 404. Replaced by S5 (official EAS Workflows Maestro page).
- `https://shopify.github.io/flash-list/docs/fundamentals/getting-started/` → HTTP 404 (FlashList v2 reorganised the docs). Replaced by S6 (Shopify Engineering primary).
- `https://blog.sentry.io/2021/08/23/...` (dated path) → HTTP 404; re-fetched at the canonical S8 path successfully.

**UNVERIFIABLE (logged, not invented):** No public MacroFactor or Hevy engineering
blog on **food-search internals / SQLite / scale** could be fetched. WebSearch
surfaced only review/comparison content (outlift, gymgod), not first-party
engineering write-ups. Fitness-app-specific search-engine evidence is therefore
**UNVERIFIABLE**; the canonical fixes below rest on the SQLite/Expo/Shopify/Android
primary sources, which are sufficient and authoritative for the technique.

---

## 1. CANONICAL FIX PER A-17 BOTTLENECK (with official-doc source)

### Fix 1 — Food search at 100k+ rows: **SQLite FTS5 contentless index** (G17-1)

**The bottleneck (a-17 §2.1):** `searchLocalByName` runs `WHERE lower(name) LIKE
'%q%'` (leading wildcard) over ~100k OFF/CoFID rows on every debounced keystroke.
A leading `%` cannot use `idx_foods_name_lower`, so SQLite does a full table scan
plus an in-memory `ORDER BY` sort — for everyone, on every miss.

**Canonical fix:** add an **FTS5 virtual table** over the food name (and brand)
column and query it with `MATCH` instead of leading-wildcard `LIKE`.

- S1 (official): *"FTS5 is an SQLite virtual table module that provides full-text
  search functionality to database applications."* It supports prefix queries and,
  critically, a **contentless table** mode — *"When set to an empty string, FTS5
  stores only index entries without duplicating the original column values,
  significantly reducing database size — particularly valuable for large text
  collections."* It also offers the **`prefix`** option, which *"creates separate
  indexes for tokens of specified lengths (e.g. 2 or 3 characters), dramatically
  accelerating prefix-based queries that would otherwise require expensive range
  scans."*
- S2 (official Expo): FTS is **supported and on by default** in expo-sqlite —
  *"`enableFTS` … Whether to enable the FTS3, FTS4 and FTS5 extensions"* (default
  `true`). Virtual tables are created with normal raw SQL via `execAsync`, and a
  prepopulated DB (the existing 6.5 MB snapshot) can be shipped with the FTS table
  **pre-built at seed time** rather than indexed on-device.

**Shape for Volyume:** create `foods_fts` as a contentless FTS5 table
(`content=''`, `content_rowid=foods.rowid`) tokenising `name` (+ `brand`), add
`prefix='2 3'` so as-you-type prefix matching is index-served, build the index
once during `seed.js` (or in the shipped snapshot), and replace the
leading-wildcard `LIKE` in `localCache.js` with a `foods_fts MATCH ?` query that
keeps the existing `ORDER BY rank, verified, lower(name)` (FTS5 exposes `rank`
natively). This converts an O(n) scan-and-sort into an index probe. **This is the
single highest-leverage fix in the area and it benefits everyone, not just power
users** (the scan is independent of personal history — a-17 §3).

### Fix 2 — Progress/analytics 2-year scan: **precomputed incremental rollups** (G17-2)

**The bottleneck (a-17 §2.2):** `useProgressData.load()` runs on `useFocusEffect`
and calls `getCompletedWorkoutSets(user.id)` — every set from every completed
workout into JS, camelCased, then `computePRsPerWeek` sorts each exercise group and
walks it for a running-max 1RM. A 2-year 4×/week lifter is ~100k–150k sets, re-scanned
on **every tab focus**. Eight surfaces share the unbounded loader.

**Canonical fix:** maintain a **precomputed rollup table** updated incrementally as
sets are logged, and have analytics read the small rollup instead of rescanning raw
sets on focus.

- S9 (Citus): the pattern is to *"periodically aggregate new events into a rollup
  table"* rather than scanning raw data at query time, tracking progress with a
  **watermark** (`last_aggregated_id`) recording where aggregation stopped, processing
  *"the last aggregated ID + 1 up to the last committed ID"* exactly once. Reported
  effect: a rollup query in *"approximately 5 milliseconds versus 869 milliseconds
  on raw data … more than 100x faster."*
- The general search corroboration (S9-adjacent: Cube pre-aggregations, materialized
  views) gives the same load-bearing principle independently: *"A rollup
  pre-aggregation table usually contains many fewer rows than its corresponding
  original fact table … leading to less time to query"* — one cited case improved
  45 s (500M rows) to 0.3 s (5,000 rows), ~150×.

**Shape for Volyume:** a per-(user, exercise, week) rollup table holding best-1RM /
volume / set-count, updated on workout commit (the write path already serialises —
a-17 §1.2). Progress reads the rollup directly. Notably **Volyume already owns this
exact watermark pattern in its sync layer** (`sync.js` watermark-incremental push,
a-17 §1.3) — the rollup is the same idea applied to local analytics, so it fits the
codebase's own conventions. SQL-side `GROUP BY` aggregation (even without a
materialised rollup) is the minimum viable step; the rollup is the durable answer.
**This is the fix that specifically rescues Eddie/Besa the loyal power user** whose
own history is the cost (a-17 §3).

### Fix 3 — OTA may be a no-op: **updates.url + per-build channel** (G17-5)

**The gap (a-17 §1.6, §G17-5):** `Updates.checkForUpdateAsync()` is called, but the
repo has **no `updates.url` in `app.json`** and **no `channel` per build profile in
`eas.json`**. Without these the check can silently return no update.

**Canonical fix (S4, official Expo):** EAS Update requires two things wired together:
- `eas update:configure` *"update[s] your **app.json** file with the
  `runtimeVersion` and `updates.url` properties"* — `updates.url` points the binary
  at the EAS update server.
- The **`channel`** on each `eas.json` build profile: *"the channel property on a
  build allows you to point updates at specific types of builds"*, and *"the channel
  name is used to locate the correct branch to publish a new update from."*
- An update is delivered **only if** the build's channel matches the channel an
  update was published to **and** the update's `runtimeVersion` is compatible. So
  Volyume's `runtimeVersion.policy: "appVersion"` (a-17 §1.6) is correct but
  insufficient on its own — without `updates.url` + a channel, `checkForUpdateAsync`
  is a confirmed no-op. **Action: verify the EAS build injects channel/url; if it
  does not, OTA has never worked and the existing check code is dead.**

### Fix 4 — Maestro E2E dead: **`.maestro` flows + EAS Workflows job** (G17-3)

**The gap (a-17 §G17-3):** last Maestro run failed 17 days stale, the flow `.yaml`
files are **not in the repo**, and **no workflow references Maestro**. Jest is the
only live gate.

**Canonical revival path (S5, official Expo EAS Workflows):**
- *"Start by creating a directory called **.maestro** in the root of your project
  directory … at the same level as **eas.json**."* Each flow is a YAML file (e.g.
  `home.yml`).
- The workflow needs **two jobs**: a build job using an `e2e-test` build profile,
  and a Maestro job — *"the `maestro_test` job needs to reference the build_id output
  from the build step."* A `pull_request` trigger runs it per PR.
- For local/dev-build runs, target a **standalone development build**
  (`npx expo run:android/ios`) with the correct `appId`, **not Expo Go** (S5 + search
  digest). This is the realistic revival: the flows currently don't exist in-repo, so
  reviving "the old Maestro" means authoring `.maestro/*.yml` afresh and wiring one
  EAS Workflows job — modest, well-specified surface work.

### Fix 5 — Single root error boundary: **per-navigator boundary segmentation** (G17-4)

**The gap (a-17 §G17-4):** one root `ErrorBoundary`; any uncaught render error in any
screen takes the **whole app** to the crash screen.

**Canonical fix (S3, official React):** *"A JavaScript error in a part of the UI
shouldn't break the whole app."* The docs make granularity a deliberate choice:
*"The granularity of error boundaries is up to you. You may wrap top-level route
components to display a 'Something went wrong' message to the user."* Best-practice
survey (S10) operationalises this for RN: wrap at the **navigator / top-level route**
level so a failure is contained to one tab with a "go back" affordance, rather than
nuking the session. Keep the existing literal-hex root boundary as the last-resort
catch (it correctly avoids re-crashing on theme tokens — a-17 §1.5); add per-tab
boundaries inside it.

### Supporting norm — list virtualisation (G17-6) and cold-start budget

- **FlatList → FlashList (S6, Shopify primary):** FlatList's problem is *"getting
  FlatList to perform … without display artifacts like drops in UI frames per second
  (FPS) and blank items while scrolling fast"* because it *"start[s] rendering with a
  large number of items."* FlashList uses **cell recycling** — refreshing elements
  within an *"already allocated view"* and moving layout to native — achieving *"60
  FPS or greater — even on low-end devices."* It is a near drop-in replacement.
  **Threshold guidance:** Volyume already virtualises its 13 genuinely-long lists with
  FlatList (a-17 §5); the only hot unvirtualised list is ActiveWorkout's `.map` in a
  `ScrollView`, which is **bounded by session size (<12 exercises)** — so FlashList is
  a *nice-to-have*, not a required fix here. The principle to bank: lists that grow
  unbounded with data get virtualised; lists bounded by a session do not need it.
- **Cold-start budget (S7 official Android + S8 Sentry):** Android Vitals flags
  **cold start ≥ 5 s, warm ≥ 2 s, hot ≥ 1.5 s** as excessive (S7). Apple's guidance
  (via S8) is first frame within **400 ms**; Sentry's frame budgets are **slow frame
  > 16.67 ms** and **frozen frame > 700 ms**. TTID (first frame) vs TTFD (fully
  interactive) are both tracked. **Verdict for Volyume:** a-17 rated cold start GOOD
  (lazy DB init, deferred screen-graph require, splash-matched gate). The norm
  confirms that rating — the only critical-path tail is the module-scope synchronous
  boot work (IAP wire + Sentry init), which is already lazy-required and no-ops
  cleanly. No fix mandated; keep it off the first-frame path.

---

## 2. WHERE VOLYUME IS ALREADY RIGHT (do not "fix")

The norms validate, rather than contradict, the bulk of the architecture:

1. **Offline-first local SQLite as source of truth.** WAL mode, 60 targeted indices,
   write serialisation, lazy DB init (a-17 §1.2, §6). expo-sqlite is the correct
   substrate, and shipping a **prepopulated DB asset** is an officially supported
   pattern (S2) — so the FTS fix slots into the existing seed flow without changing
   the architecture.
2. **Watermark-incremental sync.** The sync layer (run-lock dedupe,
   watermark-per-table, 200-row chunks, deterministic conflict resolution,
   exponential backoff) is exactly the pattern S9 endorses for incremental processing.
   It is robust by the book — and is the template for the analytics rollup (Fix 2).
3. **Lazy screen-graph / deferred require.** Cold-start gating on a11y tokens then
   lazy-requiring the navigator keeps first-frame light, consistent with the Android
   TTID/TTFD split (S7) and Apple's 400 ms first-frame guidance (S8).
4. **List virtualisation already done where it matters.** 13 long lists on FlatList;
   the one unvirtualised hot list is session-bounded (a-17 §5) — matches the
   FlashList threshold logic (S6): virtualise unbounded, not bounded.
5. **Lean render dependencies.** Hand-rolled SVG charts + a single Skia component, no
   heavy charting lib (a-17 §1.4) — keeps the JS bundle and frame budget healthy
   against Sentry's slow/frozen-frame thresholds (S8).
6. **`runtimeVersion.policy: "appVersion"`** is the correct OTA safety posture (S4) —
   it just needs `updates.url` + channel to actually fire (Fix 3).

---

## 3. RANKED ENGINEERING PICK-UPS (effort class; Besa + Eddie outcomes)

Effort classes: **S** ≈ <1 day · **M** ≈ 1–3 days · **L** ≈ 3–8 days · **XL** ≈ weeks.

| # | Pick-up | Effort | Who it serves | Source |
|---|---------|--------|---------------|--------|
| **1** | **FTS5 contentless index on `foods`**, replace leading-`LIKE` with `MATCH`; build index in seed/snapshot | **M** | **Everyone** — search lag is history-independent; Besa the newbie typing her first meal feels it as much as Eddie | S1, S2 |
| **2** | **Precomputed incremental rollup** for Progress (per user/exercise/week), watermark-updated on commit; analytics read the rollup | **L** | **Eddie / power user** — the 2-year scan is *their* cost; also de-janks every analytics surface (8 call sites) | S9 |
| **3** | **Wire OTA properly** — add `updates.url` (app.json) + `channel` per `eas.json` profile; verify a build actually receives an update | **S** | **Everyone** — turns the existing dead `checkForUpdateAsync` into a real same-day hotfix channel for paying users | S4 |
| **4** | **Per-navigator error boundaries** inside the root boundary; contain a screen crash to its tab with a recover affordance | **S–M** | **Everyone** — a bug in one feature no longer ejects the user mid-workout/mid-meal | S3, S10 |
| **5** | **Revive Maestro E2E** — author `.maestro/*.yml` flows + one EAS Workflows `maestro_test` job on PR trigger | **M–L** | **Everyone (indirect)** — restores the E2E safety net so regressions in the hot flows are caught before users | S5 |

Beyond the top 5 (lower priority, norm-backed but not load-bearing for a-17):
- **Cheaper interim search win:** if FTS5 is deferred, a prefix-only `LIKE 'q%'` would
  immediately use `idx_foods_name_lower` (S1's prefix-index logic) — sacrifices
  substring matching but removes the full scan for the common as-you-type case. **S.**
- **Coverage gate** in Jest (`collectCoverage`/`coverageThreshold`) — measurement only,
  not perf. **S.** (a-17 §G17-8.)
- **FlashList for ActiveWorkout** only if sessions ever grow pathological — currently
  session-bounded, so **defer** (S6). **S, low value.**

---

## 4. RISKS / TRADE-OFFS PER FIX

| Fix | Risk / trade-off | Mitigation (sourced) |
|-----|------------------|----------------------|
| **FTS5 (1)** | **Index size growth** on top of the 6.5 MB snapshot; FTS B-trees add bytes. S1 shows full-detail index can be large (its example: 743 MiB → 134 MiB by dropping detail). | Use **contentless** (`content=''`) — *stores only index entries, no duplicated column values* (S1) — and `detail=` reduction if NEAR/phrase isn't needed; build once in the shipped snapshot so on-device cost is read-only. |
| **FTS5 (1)** | Tokenisation/diacritics: `unicode61` vs custom; British food names + brands need sensible folding. | Use `unicode61 remove_diacritics`; keep the existing rank/verified ordering on top of `rank`. |
| **Rollups (2)** | **Staleness** — a rollup is only as fresh as the last update; a missed update shows stale PRs. | Update **synchronously on the same serialised write path** that commits sets (a-17 §1.2); watermark + exactly-once range (`last_id+1 … last_committed`, S9) guarantees no gaps/dupes; provide a cheap rebuild-from-raw fallback. |
| **Rollups (2)** | Migration/back-fill for existing users' historical sets. | One-time back-fill at migration (the watermark pattern back-fills by design, S9); reuse `user_version` migration machinery already in `database.js`. |
| **OTA (3)** | Mis-targeted **channel** could ship a wrong/broken bundle to production; `runtimeVersion` mismatch silently no-ops. | Channel-per-profile keeps preview/prod isolated (S4); `appVersion` policy blocks native-incompatible payloads (a-17 §1.6). Test on preview channel first. |
| **Boundaries (4)** | Over-segmentation adds wrappers; boundaries **don't catch event-handler or async errors** (S10). | Wrap at **navigator/route** level only (S3 granularity guidance); keep global handlers (already present, a-17 §1.5) for async/event errors. |
| **Maestro (5)** | Flaky E2E erodes trust; flows are absent so this is greenfield authoring, not a config fix. | Start with a few high-value happy-path flows on PR trigger (S5); dev-build appId must match (S5) or every run fails as it did before. |

---

## 5. RETURN SUMMARY

**Tooling:** PROVEN (verbatim FTS5 quote, sqlite.org). **Fetch failures: 4** (all
recovered with official/primary alternatives; none silently degraded). **1
UNVERIFIABLE** logged: no fetchable MacroFactor/Hevy first-party engineering blog on
search internals.

**Canonical fixes + sources:**
1. Food search → **SQLite FTS5 contentless `MATCH`** (S1 sqlite.org, S2 Expo).
2. Progress 2-year scan → **precomputed incremental rollup + watermark** (S9 Citus).
3. OTA no-op → **`updates.url` + per-profile `channel`** (S4 Expo, official).
4. Single boundary → **per-navigator error boundaries** (S3 React, S10).
5. Dead E2E → **`.maestro` flows + EAS Workflows `maestro_test` job** (S5 Expo, official).
Supporting: FlashList recycling for unbounded lists (S6 Shopify); cold-start budget
cold<5s/warm<2s/first-frame~400ms (S7 Android, S8 Sentry).

**Top 5 pick-ups (ranked):** (1) FTS5 food index — **M**, everyone; (2) analytics
rollups — **L**, power user; (3) wire OTA — **S**, everyone; (4) per-navigator
boundaries — **S–M**, everyone; (5) revive Maestro — **M–L**, everyone (indirect).

**Already right (don't fix):** offline-first local SQLite (WAL, 60 indices, lazy
init); watermark-incremental sync; lazy/deferred screen-graph cold start; list
virtualisation where unbounded; lean SVG/Skia render deps; `appVersion` OTA policy.
