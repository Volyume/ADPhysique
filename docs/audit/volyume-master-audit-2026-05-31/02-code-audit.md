# 02 — Line-by-line code audit

Status: **IN PROGRESS** — first pass complete for the engine/data,
screens, food, and cross-cutting layers via delegated sweeps; the
highest-severity claims have been personally verified against source.
Date: 2026-05-31
Branch: `main` @ `551a78a` (audit docs commit on top of `2943b55`)

> **Method + trust note (important).** This phase used four sub-agent
> sweeps to read breadth, then the auditor (me) **personally verified
> the highest-stakes findings against the real files**. Every finding
> below carries an explicit status:
> - **[VERIFIED]** — I read the exact code and confirmed it.
> - **[CORRECTED]** — an agent claim that verification proved FALSE or
>   materially wrong; the corrected truth is stated.
> - **[LEAD — UNVERIFIED]** — an agent-reported finding that is
>   plausible but I have NOT yet confirmed at the line level. Do not
>   action these as fact until verified.
>
> This discipline exists because an earlier pass in this same session
> fabricated findings. Treat unverified leads as hypotheses.
>
> Note: the Bash/grep tooling was intermittently returning corrupted
> output this session; all VERIFIED items were confirmed via the Read
> tool or `awk` on specific line ranges, not via the flaky grep+pipe.

---

## A. VERIFIED findings (confirmed against source)

### A1. Failed local SQLite migrations are silently marked complete and never retried — [VERIFIED] — HIGH
**`src/lib/database.js`**, migration runner (~lines 1762–1782) and
`SCHEMA_MIGRATIONS` (line 36+).

The runner reads `PRAGMA user_version`, runs each migration whose
`version > current` inside a `try/catch`, then **unconditionally**
sets `PRAGMA user_version = maxV` at the end — even if one of the
`m.up()` calls threw. Verified code:
```js
for (const m of SCHEMA_MIGRATIONS) {
  if (m.version > current) {
    try { await m.up(db); }
    catch (e) { /* logError('schemaMigration', ...) */ }
  }
}
const maxV = SCHEMA_MIGRATIONS.reduce((a, m) => Math.max(a, m.version), 0);
try { await db.execAsync(`PRAGMA user_version = ${maxV}`); } catch (_) {}
```
Consequence: a migration that genuinely fails (not a benign duplicate
column) is logged once, then the DB's `user_version` is bumped past it,
so on every later boot `m.version > current` is false and **the failed
migration never runs again**. The DB is permanently left partially
migrated while reporting itself fully migrated. Compounding it, the
individual statements use `...ADD COLUMN...).catch(() => {})` which
swallow ALL errors with no log at all (e.g. line 44). Runtime-critical
per CLAUDE.md Rule 5 (migrations) and Rule 6 (additive contracts).
**Fix direction:** only advance `user_version` to the highest version
that actually succeeded; distinguish "duplicate column" (benign) from
other errors in the per-statement catches.

> This CORRECTS the engine agent's claim that "PRAGMA user_version is
> never used". It IS used; the real defect is the unconditional bump.

### A2. Hardcoded Supabase fallback URL + anon key in the bundle — [VERIFIED] — MODERATE
**`src/lib/supabase.js:20–21`**. After trying env + `expoConfig.extra`,
the code falls back to a literal `FALLBACK_URL` and `FALLBACK_ANON_KEY`
(a real project URL and a real anon JWT) so a misconfigured build still
reaches the backend.
- This is the **anon** key, which is public by design (RLS enforces
  access) — the comment says so, and it is NOT the service-role key.
  So this is not a critical secret leak.
- But it does hardcode production backend identity into source, and a
  fallback that silently points every misconfigured build at the live
  project is a debatable choice (a misconfig should arguably fail loud,
  not silently hit prod). Flag for founder decision.
> CORRECTS the cross-cutting agent's "no hardcoded fallback — GOOD".
> There IS a hardcoded fallback; it is the public anon key.

### A3. There is ONE push path and ONE pull path — the "two sync layers" risk does NOT exist as described — [VERIFIED / CORRECTED]
**`src/lib/sync.js:28–47`**. The file's own header states it is a
"Legacy sync facade … not a parallel engine: there is one push path
(registry) and one pull path (this file). No double-write."
`bulkUploadLocalData` (line 46) is now a one-line wrapper:
`return pushAllViaRegistry(...)`. So the legacy push delegates to the
modular registry; the only legacy-specific code still live is the
**pull** path (`pullFromCloud` + the id-chunked helpers).
> This CORRECTS the engine agent's single biggest claim ("two sync
> layers CAN double-process / double-push — the biggest risk in the
> layer"). Verification refutes it. The real, smaller residual: the
> modular **pull** has not landed, so pull still runs through the
> legacy file. That is tidiness debt, explicitly accepted in the status
> docs, not a correctness risk. No `SET user_id` was found (identity
> invariant holds — this part of the agent report stands).

---

## B. LEADS — reported by sweeps, NOT yet line-verified

These are plausible and worth confirming in the next pass. Do not treat
as fact yet.

### B1. CoachOutputScreen apply buttons may lack an in-flight guard (double-apply) — [LEAD] — potentially HIGH
**`src/screens/CoachOutputScreen.js`**. Agent reports the
confirm-then-apply "Apply" handlers do async DB writes
(nutrition_targets, planned volume) without disabling the button while
in flight, so a rapid double-tap could apply twice. This is
runtime-critical (writes targets/volume). **Action:** read each apply
handler and confirm whether there is an `applying`/disabled guard. If
absent, this is a real fix.

### B2. RestTimer effect missing deps (stale closure) — [LEAD, ESLint-corroborated] — MODERATE
**`src/components/RestTimer.js:82,142`** — `react-hooks/exhaustive-deps`
warnings are real (seen in lint output). The interval effect omits
`restTimerActive`, `tickRestTimer`, etc. Runtime-critical (rest timer).
**Action:** confirm the interval cleans up on exercise switch and that
the stale closure can't freeze/desync the timer.

### B3. Async loads show "empty" state on load FAILURE (no distinct error state) — [LEAD] — MODERATE UX
**`AnalyticsScreen.js`, `BodyMetricsScreen.js`, `LiftProgressScreen.js`**
(agent) — load errors are caught to `console.warn` and the screen falls
to its empty state, so a failed load reads to the user as "no data".
**Action:** confirm and, in Phase 9/12, add a distinct error state.

### B4. USDA / OpenFoodFacts fetch may lack a timeout/AbortController — [LEAD] — MODERATE UX
**`src/lib/food/sources/usda.js`, `liveOff.js`** (agent) — at least one
fetch awaited with no timeout would stall the search waterfall on a
hung socket. **Action:** read both, confirm timeout handling; confirm
the USDA key is from env, not hardcoded.

### B5. OCR numeric parse can yield NaN into an entry — [LEAD] — MODERATE
**`src/lib/food/ocrParser.js`** (agent) — comma-decimal / kJ-only labels
may produce NaN macros. **Action:** confirm NaN guard before write.

### B6. Genuinely-unused locals (real dead code) — [LEAD, ESLint-corroborated] — LOW
ESLint-confirmed non-JSX unused symbols to remove:
`algorithms.js:586 targetSFR`, `:885 worstVolume`;
`blockAdvisor.js:156/232/233 experience/firstName`;
`RestTimer.js:42 currentExerciseName`, `:170 barWidth`;
`ExerciseCard.js:13 sfr`; `VolumeBars.js:14 status`. These are safe
deletions (verify each is truly unreferenced first).

### B7. Duplication: 1RM estimation + MEV/MRV clamp logic repeated — [LEAD] — LOW/MED
Agent reports estimated-1RM math in `algorithms.js` and inline in
`liftProgress.js`; volume `[mev,mrv]` clamp in `coachApply`,
`weeklyCoach`, `planEngine`. **Action:** confirm and centralise.

### B8. Hardcoded magic values — [LEAD] — LOW
Calorie floor `1200`; throttle windows `6h/12h/30d` scattered as
literals. Promote to named constants.

### B9. Large ScrollViews instead of virtualised lists — [LEAD] — MED PERF
`AnalyticsScreen.js`, `HomeScreen.js` map many children into a
`ScrollView` rather than `FlatList`. Confirm in Phase 6 with the actual
data volumes.

---

## C. Confirmed-GOOD (no action)

- DB access is parameterised (`?` placeholders); no obvious SQL string
  concatenation of user input found by the engine sweep. [LEAD-GOOD,
  re-confirm dynamic table/column names in registry push in Phase 5]
- No `UPDATE ... SET user_id` anywhere — identity invariant holds.
  [VERIFIED by CI grep existence + agent sweep]
- App.js subscriptions (AppState, notifications, splash timer) have
  matching cleanups. [LEAD-GOOD]
- Push-token registration no-ops cleanly without `extra.eas.projectId`.
  [LEAD-GOOD]
- ErrorBoundary + errorLog ring buffer are sound. [LEAD-GOOD]
- Background TaskManager tasks no-op correctly with no session.
  [LEAD-GOOD]

---

## D. Cross-cutting observations for later phases

1. **No static type checking** on ~84k LOC of JS (tsconfig is ambient
   only). Tests + ESLint are the only safety net. (→ Phase 11)
2. **Very large files** (`database.js` 5,574; `ActiveWorkoutScreen.js`
   2,560; `HomeScreen.js` 2,344; `CoachOutputScreen.js` 2,110) are the
   maintainability hot spots. (→ Phase 11 long-term)
3. **ESLint 1665 warnings dominated by a JSX-import false positive** —
   fixing the lint config (Phase 11 quick win) would unmask the real
   dead code currently buried in the noise.

---

## E. Phase 2 next-pass checklist (to finish this doc → COMPLETE)

- [ ] Verify B1 (coach double-apply) — highest priority lead
- [ ] Verify B2 (rest timer deps) end-to-end
- [ ] Verify B4 (food fetch timeouts + USDA key source)
- [ ] Verify B5 (OCR NaN guard)
- [ ] Confirm B6 dead-code each truly unreferenced
- [ ] Spot-check 10 smaller screens not yet read at depth
- [ ] Re-run with `--detectOpenHandles` to find the Jest open handle
