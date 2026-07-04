# 09 · Technical Quality Audit

**Author:** Fable, synthesising S3 (performance/reliability), S4 (tech debt/risk),
S5 (test/QA readiness). **Date:** 2026-07-04.
Full evidence: the corresponding `inputs/*.md`.

---

## The headline

**Structurally sound, unusually well-tested, with the debt concentrated in two
well-understood places: a dual sync layer and an under-adopted component system.**
The three technical audits agree the codebase is in good health for a live solo
app — 428 suites / 5,859 tests green, zero TODO/FIXME in `src/`, no dead source
files, broad DB index coverage, real sync backoff. The risks that exist are
specific, located, and none require touching the ED-safety/billing/identity locks.

---

## Architecture & maintainability (S4)

### The dual sync layer (P1 — the top structural risk)
All 21 `SYNC_REGISTRY` tables are migrated to the registry/transport engine — but
the **free-tier workout core** (workouts, exercises, programmes, routines, PBs)
still runs 100% on legacy `sync.js`, with no registry conflict strategy and no
regression-matrix coverage. **The wrong half is legacy:** the highest-traffic,
largest-cohort, most-visible domain is the unmigrated one. A multi-device conflict
(editing a routine on two phones) resolves by ad-hoc per-function logic, not a
documented strategy. ⚖︎ Options (P1-12): migrate the highest-traffic table next /
write a regression matrix pinning current behaviour first / backlog.

Related: **`morning_weights` is a third weight pathway** entirely outside the
registry *and* the locked architecture doc (S4-§1) — the "locked" spec doesn't
describe what ships. At minimum, document it.

### The store god-object (P2)
`useAppStore.js`: 1,841 lines, 82 `set()` sites, 59 direct AsyncStorage calls, ~15
inline key constants, no `persist` middleware, ~121 importers (highest fan-in in
the repo). Every session/tier/consent feature touches it. ⚖︎ A low-risk first step
is extracting the key constants + get/set helpers into `storeKeys.js` (pure move);
a full slice refactor is L and high-regression-risk — opt-in only, per the
"no drive-by refactors" rule.

### Design-system adoption debt (P2 — the founder's complaint, quantified)
`Card` 14/80, `BackHeader` 16/80, `Button` 21/80; `colors.surface` inline in
64/80; the 5 Progress Photos modals (2,597 lines) import **zero** design-system
components. This is the same finding O1 makes from the UX side — the mechanical
root of "not one product." ⚖︎ Retrofit the Photos modals as a scoped piece /
add a lint rule banning new inline surface boxes / both (recommended pairing:
retrofit the bolted-on surfaces AND lint-ban new bleed).

### Riskiest files (change-blast-radius ranking)
`database.js` (7,255 lines, ~98 importers, 249 exports) and `useAppStore.js` (~121
importers) dominate; then `RootNavigator.js` (a routing bug = GDPR/paywall
bypass), legacy `sync.js`, and the deterministic engines (`planEngine`,
`weeklyCoach`, `nutritionEngine` — where a change can silently alter
safety-relevant output for identical inputs). These are the files where "touch
only what the task requires" matters most.

## Performance & reliability (S3 — reassuringly clean: 0 P0)

- **Already good:** startup defers all 82 screen modules (`lazyScreen`), decouples
  AsyncStorage from SQLite boot, gates redundant syncs with an in-flight lock;
  every heavy list uses FlashList; index coverage matches query shapes; sync queue
  has real backoff/retry; photos confirmed never uploaded.
- **P1s (both precise):** `createWorkoutTemplateFromWorkout` loops inserts with no
  transaction while its sibling `duplicateRoutine` already fixes exactly this
  shape (interruption leaves partial routines — P2-7); **no image down-sampling**
  before local photo storage (full-sensor originals accumulate; storage bloat +
  grid-decode jank on photo-heavy accounts — P2-6).
- **P2/P3:** plan-copy loops without an outer transaction; `cascade.startCascade`
  swallows a local tier-mirror write failure with no `logError`; `drainSyncQueue`
  caps at 50 ops/foreground (self-heals, slow to catch up after long offline).
- **Structural advantage to exploit:** offline-first SQLite means most reads are
  instant — the latency-masking premium edge O8 flags is *free* here.

## Test & QA readiness (S5 — strong where it counts, two trust-gaps)

- **Already good:** genuinely strong behavioural coverage on ED-floor enforcement
  (`coachApply.test.js`), quiet-hours, photo suppression, cascade/restore; the
  "worker force-exit" CI warning is already root-caused and fixed (not a live
  risk); the 5–6 skipped tests are documented deferrals, no rot.
- **[P0] The Article 9 consent gate has no behavioural test** — RootNavigator
  can't render under Jest, so three guard files fall back to source-regex. The
  un-skippable GDPR gate's only behavioural coverage is a manual-dispatch Maestro
  flow (P0-4).
- **[P0] No exhaustive Pro-screen gating test** — nothing enumerates the ~40 Pro
  surfaces and asserts each is wrapped; a new Pro screen could ship ungated (P0-3).
- **[P1] DB migration idempotency is spot-checked, not systemic** — only one
  incident has a real full-chain re-run test; the other ~40 `SCHEMA_MIGRATIONS`
  entries have none.
- **[P1] `tsc --noEmit` + `check:imports` aren't in the PR gate** (`main-ci.yml`
  runs Jest + ESLint + Expo Doctor only) — a type/import regression can reach main
  and only surface later in the Android build (P1-13). CLAUDE.md calls
  `release:check` "the final arbiter" but it isn't wired to the PR gate.
- **[P1] E2E is 2 Maestro flows, manual-only** — purchase, restore, trial cascade,
  sync conflict, food logging have zero device-level coverage. ⚖︎ a device-test
  matrix (narrow/moderate/broad) is a founder choice.

## Config & docs drift (P3, mechanical)

- `schema.sql`/`setup_complete.sql` confirmed stale (missing `plan_folders`).
- CLAUDE.md says "96 migrations"; actual is 99 (now 102 with the partner tables).
- One confirmed unused dependency (`@gorhom/bottom-sheet`) — ⚖︎ removal looks safe
  but the "never remove a dep without asking" mirror rule applies.

## The technical through-line

The debt is not sprawling; it is **two concentrations and a handful of precise
bugs.** The two concentrations (dual sync, component adoption) are the same two
themes the whole audit keeps returning to — which is good news: fixing them serves
the UX, the "one product" feel, *and* the technical health at once. The precise
bugs (transactions, image down-sampling, the two test P0s, the CI gap) are all
S–M and independently shippable. Nothing here is a crisis; everything here is
tractable. See `10-prioritised-roadmap.md` for sequencing.
