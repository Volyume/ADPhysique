# TZ-1 — Unify the day-key to local time (design + scoping)

Status: **DESIGN, awaiting founder sign-off. No code written yet.**
Decision already taken: **local day wins, and migrate existing rows** (best-effort
where the data allows). This doc scopes exactly what's migratable, what isn't,
and how to phase it safely under the release freeze.

## 1. The bug (recap)

The app uses two definitions of "today" at once:

- **Local midnight** for weight + workouts + streaks
  (`database.js` morning-weight `startLocalDay`, `HomeScreen` week math).
- **UTC midnight** for food, water, steps, diary, check-in "today"
  (`new Date().toISOString().slice(0,10)`).

For anyone not at UTC+0, a meal logged in the evening (west of UTC) or early
morning (east of UTC) lands on a different calendar day than the weight/workout
logged at the same moment. The diary's "today" can look empty; rollups and the
coach's "this week" window read the wrong day.

## 2. Where the UTC day-key is used

**Writes — the day a logged row belongs to (must become local):**
- Food entry-date default on every food entry point: `FoodSearchScreen:63`,
  `ScanBarcodeScreen:56`, `ScanLabelScreen:46`, `MyMealsScreen:45`,
  `MyRecipesScreen:39`, `RecipeBuilderScreen:44`, `AddCustomFoodScreen:38`.
- `activityDayKey(ms)` (`database.js:3521`) — the key steps + water write under.

**Reads — "today" / windows (must become local to match the new writes):**
- `DiaryScreen:45` (the diary's current day), `FoodInsightsScreen:34`.
- `food/db.js:291,294` (`getRecentIntakeSummary` 7-day window).
- `WeeklyCheckInScreen:65,68` ("have I checked in today"), `BodyMetricsScreen:62`.
- Heatmap date set: `ProgressSections.js:93`, `useProgressData.js:287` (training
  dates — currently UTC-sliced; should match the local convention too).

**Leave as-is (not day-buckets of user data):** export/backup filename stamps
(`dataBackup.js:61`, `SettingsScreen:728`), DOB synthesis
(`ProOnboardingScreen:541`), and any analytics/string-date formatting that isn't
a per-day record key (`database.js:718,2197,2202,2942,3756,3764` — to be
audited individually; several are display strings, not keys).

There is **no shared helper today** — only an inline `startLocalDay` in
`logMorningWeight`. Step 1 introduces one (`localDayKey(ms)` / `todayLocalKey()`)
and routes every site above through it.

## 3. Data model — what is recoverable

| Table | Key | Per-event timestamp? | Re-keyable to local day? |
|---|---|---|---|
| `food_entries` | `id`, `entry_date` (column) | **yes — `logged_at`** | **Yes.** Recompute `entry_date` from `logged_at` per row. |
| `daily_intake_rollups` | PK `(user_id, entry_date)` | no (derived) | **Yes, by rebuild.** Recompute from the re-keyed `food_entries`. |
| `daily_water` | PK `(user_id, entry_date)` | **no** (daily total only) | **No.** No per-event records to reassign. |
| `daily_steps` | PK `(user_id, entry_date)` | **no** (daily total only) | **No.** Same. |

So `food_entries` (and therefore rollups) can be migrated correctly;
`daily_water` / `daily_steps` **cannot** be reclassified — a day's total can't be
split back onto the right local day without the individual events, which were
never stored.

## 4. Why the cloud can't migrate itself

The local day depends on the user's **timezone offset**, which the server does
not store. Cloud `food_entries` has `logged_at` and `entry_date`, but a server
migration can't turn `logged_at` into a local day without the user's TZ. So the
re-key has to run **client-side** (the device knows its TZ), then push the
corrected rows to cloud (overwrite). Cloud rows authored by other devices /
the old AAB stay UTC-keyed until a re-keying client touches them.

Caveat baked into any client re-key: it uses the device's **current** TZ applied
to historical `logged_at`. A user who logged in TZ A and later moved to TZ B
gets their A-era entries reclassified under B. Best-effort; acceptable for the
overwhelming majority who don't relocate.

## 5. Proposed phasing

### Phase 1 — Forward fix (low risk, no data touched)
Add `localDayKey(ms)` + `todayLocalKey()` (one helper, well-tested), and switch
every write-default and read-"today"/window site in §2 from the UTC slice to the
local helper. From this point **new** food/water/steps data is local-day correct
and agrees with weight/workouts.
- No migration, fully additive, ships the fix going forward.
- Seam: pre-switch rows remain UTC-keyed, so a user viewing old days near a
  midnight boundary may see one-time off-by-a-day placement for historical data.
- This is the bulk of the value and the safest slice. **Recommended first.**

### Phase 2 — Re-key historical `food_entries` + rebuild rollups (recoverable)
A one-shot, on-launch local migration (guarded by an AsyncStorage flag), per user:
1. For each local `food_entries` row, recompute `entry_date = localDayKey(logged_at)`;
   `UPDATE` only rows whose key changed (bump `updated_at`).
2. Recompute `daily_intake_rollups` for every affected day from the re-keyed
   entries (the existing `recomputeRollup` path).
3. Let the normal sync push the changed entries + rollups to cloud (overwrites
   the UTC-keyed cloud copies via the existing upsert).
- Correct (uses `logged_at`), idempotent (only changed rows move), and bounded.
- Risk: it rewrites historical diary placement. Existing cloud rows on other
  devices reconcile on their next re-keying run.

### Phase 3 — `daily_water` / `daily_steps` (not recoverable)
**Accept the seam.** Historical water/steps stay on their original UTC-day key;
only new writes (Phase 1) are local. There is no correct automatic reassignment
— a "shift every row by the current UTC offset" heuristic is wrong for any day
the user didn't log at a consistent time, so it's explicitly rejected. Document
the one-time boundary effect; it self-heals as new local-day data accrues.

## 6. Release-freeze implications

- Phase 1 is client-only, additive: the frozen AAB keeps writing UTC keys; the
  new build writes local keys. Both write to the same `entry_date` column, so on
  a shared account the two builds can disagree about a near-midnight day until
  the old build is gone. No schema change, no cloud migration.
- Phase 2's re-key is also client-only (no cloud SQL); it pushes corrected rows
  through the existing sync. No migration file, but it DOES rewrite historical
  cloud `food_entries.entry_date` for that user — call that out for the founder.
- No cloud schema migration is required for any phase (the columns already
  exist). That sidesteps the freeze's schema concerns entirely.

## 7. Test plan
- `localDayKey`/`todayLocalKey`: unit tests across offsets (mock `Date`/TZ),
  DST days, and the day-boundary cases that motivated TZ-1 (21:00 UTC-8, 05:00
  UTC+9).
- Phase 2 migration: seed UTC-keyed `food_entries` with `logged_at` straddling
  local midnight, run the re-key, assert `entry_date` matches `localDayKey` and
  rollups rebuild; assert idempotency (second run is a no-op).
- Regression: diary/insights/check-in read the same key the writes use.

## 8. Open questions for the founder
1. **Do Phase 1 only, or 1 + 2?** Phase 1 fixes everything going forward with
   near-zero risk. Phase 2 corrects historical food placement but rewrites past
   diary days (and re-pushes them to cloud). Recommendation: ship Phase 1 now;
   decide Phase 2 separately.
2. **Phase 2 scope:** all history, or only the last N days (e.g. 90)? Bounding it
   limits the rewrite and the cloud re-push.
3. **Water/steps seam (Phase 3):** confirm "leave history as-is, new writes
   local" is acceptable (it's the only honest option given no per-event data).
4. **TZ-at-migration caveat:** confirm best-effort reclassification by current
   device TZ is acceptable for relocating users.

## 9. Recommendation
Ship **Phase 1** as the next unit (the real fix, lowest risk), with the
`localDayKey` helper + full read/write switch + tests. Hold **Phase 2/3** for an
explicit go, since they rewrite historical data and have irreducible best-effort
limits. This keeps each step "smallest safe change" and reviewable.
