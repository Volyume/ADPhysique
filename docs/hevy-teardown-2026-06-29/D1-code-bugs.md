# D1 — Volyume self-audit: real code bugs

**Date:** 2026-06-29
**Scope:** High-traffic / high-risk paths — `ActiveWorkoutScreen.js`, `SetEntry.js`,
`RestTimer.js`, `useAppStore.js`, `src/lib/sync/*`, `src/lib/database.js`,
`src/lib/food/*`, `weeklyCoach.js` + `coachApply.js`.
**Method:** Direct read of the workout/store/timer spine + parallel fresh-eyes
agents on sync, food, and the coach engine. Findings verified against source.
**Goal:** make Volyume more correct than Hevy. Genuine defects only — no nitpicks.
**No code was modified.** The ED safety system and billing logic were read-only;
where their math looked unusual it is noted as a deliberate guardrail, not a bug.

Severity key: **crash** · **data-loss** · **wrong-result** · **minor**

---

## Ranked findings

| # | Sev | Bug | file:line | Repro / condition | Fix sketch |
|---|-----|-----|-----------|-------------------|------------|
| 1 | data-loss | **Food pull watermark not backed off by 1 ms** (the push side is). Cross-device food rows written in the same millisecond as the cursor are skipped permanently. The next pull filters server-side `updated_at > stored_ts` strictly, and the stored ts is the server clock that also stamped the rows, so equal-ts boundary rows are never pulled. | `src/lib/sync/tables/foodDomain.js:394-397` (vs the explicit `latestTsMs - 1` back-off on the push side at `:313`) | Device B pushes a food entry stamped `T`; device A's pull captures cursor `T`; A's next pull queries `> T` and B's row at `T` never arrives. Mitigated only by sign-out (full re-pull), not normal multi-device use. | Store the pull watermark as `tsMs - 1` to mirror the push side; boundary re-pulls are idempotent under the per-row LWW apply gate. |
| 2 | wrong-result | **"Last:" beat-line and prefill index the raw previous-session array (warm-ups included) by working-set index.** `prevSets[workingLogged]` is not warm-up-filtered, yet `set_number` is numbered per-kind (warm-up 1 and working 1 collide), so a logged warm-up can sort to `prevSets[0]` and the user sees/applies the wrong weight×reps. `computeSetTargets` filters warm-ups internally so `setTargets[workingLogged]` is correct — only the `prevSets` access is misaligned. | `src/screens/ActiveWorkoutScreen.js:1702` (and `:610`, `:651` anchor reads); set numbering in `src/lib/workoutHelpers.js:33-37`; `getLastNWorkoutSets` returns warm-ups ordered by `set_number ASC` in `src/lib/database.js:2048` | Previous session of an exercise had a warm-up logged. Open it again → the "Last:" line / tap-to-fill shows the warm-up's load, off-by-one against working sets. | Filter warm-ups out of `prevSets` before indexing by `workingLogged` (reuse the `setType !== 'warmup'` predicate already used elsewhere). |
| 3 | wrong-result | **`getEwmaSevenDaysAgo` fabricates a fake 7-day delta on sparse data.** When no weigh-in is at-or-before the 7-day cutoff, it falls back to `series[0].ewmaKg` (the most recent week's earliest reading) instead of `null`. The caller then treats a sub-7-day span as a weekly rate and rate-scales it, overstating loss/gain rate ~2× and feeding the on/off-target + adjustment decision. | `src/lib/weeklyCoach.js:89-90` | User logs 4 weigh-ins over days 0–3 (all within last 7d). `hasEnoughData` passes; `find(e => e.loggedAt <= now-7d)` returns undefined → returns day-0 EWMA → a 3-day delta is scaled as a 7-day rate. | Return `null` when no entry precedes the cutoff (trend not yet computable), or scale by the actual day-span between endpoints. |
| 4 | wrong-result | **USDA `_pickNutrient` abandons later candidate rows on the first id/number match.** Returns as soon as a row's `nutrientId`/`nutrientNumber` matches even if its value is non-finite/absent, never scanning duplicate rows that carry the real value. A `null` on any of kcal/protein/carbs/fat drops the whole food, so valid USDA Branded items silently vanish from search. | `src/lib/food/normalisers/usdaToFood.js:23-36` (drop at `:44`) | `foodNutrients` has two entries for 1008 (kcal); the first lacks `value` → returns null → row discarded. | `continue` scanning on a non-finite value; only return after the full scan finds a finite value (or null). |
| 5 | wrong-result | **OCR per-serving re-scan uses `text.indexOf(m[0])` instead of the regex match index**, so it can locate the wrong occurrence and read an unrelated number as the per-100g macro. `indexOf` returns the first occurrence of the matched substring in the whole label text, not where the regex actually matched. | `src/lib/food/ocrParser.js:64` | Label where the regex match is the 2nd occurrence of a keyword/gap substring but an identical earlier substring exists → slice starts at the wrong region → wrong macro value logged. | Use the stored match object's `.index` (slice from `m.index + m[0].length`) rather than `indexOf`. |
| 6 | wrong-result | **Maintenance/recomp "on-target" band collapses to ±0.05 %/week**, tighter than normal weigh-in noise. Tolerance is `0.2·|goalRatePct| + 0.05`; at `goalRatePct = 0` (maint) only the 0.05 floor remains, so a normal ±0.1 %/week is judged off-target, setting a non-zero `offTargetDirection` and wrong "on target" copy. | `src/lib/weeklyCoach.js:578` | `goalPhase='maint'`, robust rate +0.1 %/wk → `|0.1−0| = 0.1 > 0.05` → `onTarget=false`. (No kcal change fires for maint, but the verdict/labels are wrong.) | Use an absolute floor sized to real weigh-in noise for low-goal phases, e.g. `max(0.2·|goalRatePct|, 0.15)`. |
| 7 | wrong-result | **Food pull watermark falls back to the local device clock for a server-clock cursor.** If the RPC omits `timestamp`, the watermark is set from `new Date().toISOString()` (device clock), then compared next cycle against server-clock `updated_at` inside the RPC. A fast device clock writes a future cursor and stalls all food sync until server time catches up. | `src/lib/sync/tables/foodDomain.js:394` | RPC returns `changes` but no/garbage `timestamp` on a device whose clock runs ahead → future watermark → `updated_at > future` skips every later change. | Never fall back to the local clock for a server-side cursor; if `data.timestamp` is absent/unparseable, do not advance the watermark. |
| 8 | data-loss | **Favourite / water deletes never propagate cross-device.** Both slices are built as `{created:[], updated: rows.map(...), deleted:[]}` — every fetched row is forced into `updated`, never `deleted`, and the tables have no tombstone. A removed favourite is simply absent from the change query, so the deletion never reaches the cloud and the row re-pulls back from another device. | `src/lib/sync/tables/foodDomain.js:267-268`; registry `softDelete:false` for these tables | Remove a favourite on device A → it reappears after sync from device B. | If favourite/water deletes should sync, add a tombstone column + `deleted` slice; otherwise document them as device-local. |
| 9 | minor | **`prefillRepsForTarget` yields NaN when the anchor set carries snake_case reps.** `anchorSet.actualReps + 1` is NaN if the anchor only has `actual_reps`; `NaN >= repsMin` is false so it silently falls back to `repsMin`. Wrong (but non-crashing) prefill on DB-shaped anchors. | `src/lib/workoutHelpers.js:68` | Anchor set loaded with `actual_reps` (not `actualReps`) → beat-rep computes NaN → falls back to range min instead of beating last. | Read `anchorSet.actualReps ?? anchorSet.actual_reps` before `+ 1`. |
| 10 | minor | **`applyBankToTarget` clamps carbs at 0 but shifts kcal by the full delta**, so the displayed kcal can disagree with protein·4 + carbs·4 + fat·9 (ring math vs number). Display-only per the file header. | `src/lib/food/calorieBank.js:216-223` | carbsG=20, deltaKcal=−200 → carbs clamp to 0 (would be −30 g) but kcal drops the full 200. | Clamp the kcal delta to what carbs can absorb (`−min(|delta|, carbsG·4)`), or recompute kcal from the clamped macros. |
| 11 | minor | **`mealPlans` pull picks "newest" with `Number(updated_at)` — `NaN` if the cloud column is `timestamptz`.** `NaN > NaN` is always false, so the reduce keeps the first row, not the latest. Wrong-result iff the cloud column is ISO rather than epoch-ms. | `src/lib/sync/tables/mealPlans.js:67-69` | Two cloud meal_plans rows, column is timestamptz → arbitrary (first-seen) plan wins instead of the most-recent edit. | Confirm the cloud column type; use a shared `_toMs()` helper for both the comparison and the stored value. |
| 12 | minor | **Queue backoff is measured from `queued_at`, not last attempt**, so exponential backoff only holds for the first ~5 min of a row's life; thereafter a permanently-failing op is eligible every cycle. Latent today (`sync_queue` has no drainer). | `src/lib/sync/queue.js:107-111` with `:133-144` | Any row older than the capped backoff (5 min) is retried on every sync trigger regardless of `attempt_count`. | Track `last_attempt_at` (update in `markFailed`) and measure backoff from it. |

---

## Verified NOT bugs (looked suspicious, are sound)

- **`targetSets` / `workingLogged` used in `handleCompleteSet` before their `const`
  declarations** (`ActiveWorkoutScreen.js:944` vs `:1344-1345`). `handleCompleteSet`
  is a hoisted function only *called* after render completes, so the closed-over
  consts are initialised by call time — no TDZ.
- **`clampRestDelta`** (`restTimerMath.js:8-15`) correctly prevents the old
  sign-flip where a `−` tap added time at low remaining; floor 5 s, no `-0`.
- **Rest timer** is wall-clock-anchored (`restTimerEndsAt`), so backgrounding does
  not drift; `tickRestTimer` recomputes from the clock. Sound.
- **Sign-out push-first guard** (`useAppStore.js:298-372`) bounds the sync, aborts
  the wipe on any push failure, and raises a wipe guard before draining in-flight
  sync — no unsynced-data-loss path found.
- **Food date/timezone rollups** use local-day keys throughout (`food/db.js`,
  `dayKey.js`, `diaryDates.js`), explicitly avoiding the `new Date('YYYY-MM-DD')`
  UTC trap; `localDayKey` guards non-finite ms.
- **ED safety math** (calorie floors 1500/1200, FFM floor, −1.5 %/week rapid-loss
  gate, ED-pattern detector, Beat UK signposting) is a deliberate tier-blind
  guardrail. The tight maintenance band in #6 is a *separate* on-target-label
  defect, not the safety floors.
- **Sync overlapping-run lock** (`runner.js:79-82`) is a check-then-set boolean
  with no `await` between — correct on RN's single JS thread; `whenSyncIdle`
  resolves after the DB writes (only fire-and-forget telemetry trails).
