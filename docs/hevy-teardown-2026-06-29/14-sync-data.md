# 14 — Sync, offline & data portability: Hevy vs Volyume

Competitive teardown, 2026-06-29. Source: Hevy RN/Hermes v3.1.0 bundle
(`corpus/`, raw `xapk/_b/assets/index.android.bundle`) vs Volyume `src/`.
LEARNINGS only — no Hevy code or assets are copied. Hermes packs adjacent
strings together, so quoted Hevy strings are corroborated across the bundle,
events list and screen-component list, not read as clean source.

## Sync & data — Hevy vs Volyume

Both are offline-first local-DB apps that batch-push to a cloud backend. The
core sync engines are comparable in maturity. Hevy's lead is almost entirely in
**inbound surface area** (more import paths, third-party connectors, live
wearable sync) and in **device-storage hygiene** (a dedicated DiskSpaceScreen
and low-disk guards). Volyume's lead is in **conflict correctness and
portability ownership** (a locked per-table registry with named conflict
strategies incl. per-column merge, full JSON backup/restore, automatic
pre-update snapshots, and an explicit "your data is always yours, no account
required" stance).

### How Hevy does it

Evidence (file:line refer to byte-offsets/strings in the corpus, not source):

- **Batched workout sync.** Events/strings `workouts_sync_batch`,
  `workouts_batch` (`corpus/events_keys.txt`; bundle hits near "See Your Stats").
  Strong signal of a chunked batch-push queue for completed workouts rather than
  row-at-a-time. Also `_fetchBatch`, `MAYBE_JSON_TRUNCATED` (partial-payload
  handling), `isUrlEncodedWorkoutPayload`.
- **Live sync (wearables).** Large `LiveSync*` surface: `LiveSyncModal`,
  `WearOSLiveSyncModal`, `AppleWatchLiveSyncModal`, `LiveSyncStatusModal`,
  `enableLiveSyncModal`, `createLiveSyncNotificationViewModel`,
  `/live_sync/request_data`, `LIVE_SYNC_WORKOUT_DATA`,
  `os_live_sync_discarded_after_retryCount`, `isUpdatingFromLiveSyncData`,
  `isProcessingWatchLiveSyncUpdate`. A separate real-time channel pushes
  in-progress set/rep updates phone↔watch during a live workout — distinct from
  the post-workout batch sync. Copy: "By activating Live Sync, all changes on
  the phone will be updated on the Watch."
- **Third-party connectors.** `SyncWithThirdPartiesViewModel`,
  `ForceSyncWithThirdPartiesScreen`, `syncWith.cell.strava.title/description`,
  `syncWith.cell.appleHealth.*`, `syncWith.cell.healthConnect.*`, `strava_auth`,
  Samsung Health instructions screen (with a notice that Samsung Health dropped
  third-party integrations). A dedicated "Sync with" hub screen.
- **Import paths (broad).** `ExportImportDataScreen` / "Export & Import Data";
  Strong CSV import (`import_strong_csv`, "Import Strong Workouts", and a
  step list "1. Open Strong App / 2. Settings > Export Strong Data / 3. Save CSV
  / … / 5. Import Strong CSV"); plus a server-assisted URL import:
  `IMPORT_WORKOUT_DATA_URL`, `Event: IMPORT_WORKOUT_DATA_URL`, and the host
  `https://import-workout-data.herokuapp.com` (with reCAPTCHA) — a backend
  ingest service that converts other apps' exports/links server-side, "prefilled
  from Apple Health" appears too. `data_import` event.
- **Export.** `ExportDataScreen`/`ExportDataViewModel`, "Export your entire
  workout/measurement history to a CSV file." Separate workout vs measurement
  exports (`exportData.workouts.button`, `exportData.exportingMeasurements`,
  `generateWorkoutsCsv`, `generateMeasurementsCsv`, `shareCsvFile`). `data_export`
  event. Failure copy routes to `hello@hevyapp...`.
- **Disk-space management.** `DiskSpaceScreen` (+ `LowDiskSpaceModalStack`,
  `LowDiskSpaceAlert`, `isDiskSpaceLow`, `checkDiskSpace`,
  `StartNewWorkoutOrDisplayLowDiskSpaceAlert`, `disableLowDiskSpaceAlert`).
  Platform-specific guided cleanup (`DiskSpaceScreen.android.step1..3`,
  `.ios.step1..4`) and an active guard that blocks/ warns before starting a
  workout when storage is low — protecting the local write-ahead store.
- **Offline + retry.** "You're offline", "Skipping flush while offline",
  `makeOfflineTransport`, `live_sync_discarded_after_retryCount`,
  `syncMeasurementsCell.error.retry`, `syncingWorkoutsCell.error.retry`,
  `UnsyncedRoutineActionSheet`, `unsyncedObjectId`, `unsyncedNextWorkoutIndex`,
  `isUnsyncedObject`. Per-object unsynced state surfaced in the UI with retry
  affordances. Conflict copy: "Synchronisation impossible", merge helpers
  (`mergeObjectSynchronisation`, `mergeObjectAsyncAndFetchMeasurements`).

### How Volyume does it today (file:line)

- **Single-runner sync engine.** `src/lib/sync/runner.js:72` `syncAll()` — all
  four triggers (foreground, network, write, periodic) plus manual route through
  one in-memory `_runLock` that dedupes concurrent rounds
  (`runner.js:79`). Status snapshot synced/pending/offline/error at
  `runner.js:338`. Sign-out wipe guard (`runner.js:76`, `whenSyncIdle`
  `runner.js:47`) and deleted-account ghost-session cleanup (`runner.js:294`).
- **Per-table registry + conflict strategies.** `src/lib/sync/registry.js:22`
  `SYNC_REGISTRY` — 21 tables, each with a named `conflictStrategy`:
  `last_write_wins`, `server_wins`/`pull_only` (rollups, ED flags, tier history),
  and `merge` (profiles, per-column via `column_updates_at`). Resolver in
  `src/lib/sync/conflict.js:23` incl. per-column `mergeColumns()`
  (`conflict.js:86`). Soft-delete tombstones with 30-day server hard-delete
  (`registry.js:19`).
- **Per-table transport dispatch.** `src/lib/sync/transport.js:77`
  `MIGRATED_TABLES` + `pushTable`/`pullTable` (`transport.js:151`/`175`).
  Food domain shares one bulk RPC pair (`tables/foodDomain.js`).
- **Mutation queue with backoff + compaction.** `src/lib/sync/queue.js` —
  SQLite `sync_queue`, exponential backoff 2s→5min (`queue.js:20`
  `BACKOFF_MS`), compaction collapses repeated updates / delete-supersedes-update.
- **Incremental delta sync.** `src/lib/sync/watermark.js` — per-(user,table)
  pull AND push watermarks in AsyncStorage; `.gte(cursor)` incremental pulls;
  self-healing (sign-out clears cursor → full re-pull).
- **CSV import (Hevy + Strong).** `src/screens/ImportScreen.js` →
  `src/lib/importExternal.js` (`parseCSV`, `detectFormat`, `parseHevy`,
  `parseStrong`, `analyzeImport`, `runImport`). Preview stage shows matched /
  new-custom / already-imported counts before confirm; auto-pushes imported rows
  to cloud (`ImportScreen.js:128`).
- **Export / backup / restore / snapshots.** `src/screens/SettingsDataScreen.js`
  — CSV workout export (`buildWorkoutCSV` `database.js:3305`, share sheet);
  full JSON backup/restore (`src/lib/dataBackup.js:52`/`:87`); automatic
  pre-update snapshots (Snapshots screen, `SettingsDataScreen.js:221`);
  clear-history; manual "Cloud sync" with last-synced label. Stance line:
  "Your data is always yours. Export or back up any time, no account required."
  (`SettingsDataScreen.js:237`).
- **Health/steps in.** `src/lib/health.js`, `src/lib/activitySteps.js` — Apple
  HealthKit + Android Health Connect (steps, with Samsung/Pixel as upstream HC
  writers). No Strava; no real-time wearable live-sync channel.

### Gaps

1. **No device-storage management / low-disk guard.** Volyume is offline-first
   with an *encrypted SQLite write store as the source of truth* — yet there is
   no equivalent to Hevy's `DiskSpaceScreen` / `LowDiskSpaceAlert` /
   `StartNewWorkoutOrDisplayLowDiskSpaceAlert`. A device that runs out of space
   mid-session can fail the local write that the whole architecture depends on,
   with no pre-emptive warning and no guided cleanup. This is the biggest
   correctness/robustness gap, not a feature gap.
2. **Import surface is narrow vs Hevy.** Volyume imports Hevy/Strong workout
   CSV only. Hevy additionally does Apple-Health-prefilled import, a
   server-assisted URL/link importer (`import-workout-data.herokuapp.com`), and
   imports *measurements/body data*, not just workouts. Volyume's importer also
   has no field-mapping UI and imports workouts only (not body-comp/measurement
   history) — a switcher coming from another app loses their measurement trend.
3. **No real-time wearable live-sync, and no per-object "unsynced" UI.** Volyume
   surfaces one global sync status; Hevy surfaces per-object unsynced state
   (`UnsyncedRoutineActionSheet`, retry-per-cell) and a phone↔watch live channel.
   Volyume users mid-session on a watch/secondary device get no live mirror and
   no per-item "this hasn't uploaded yet, retry" affordance. (Live-sync is a
   large build; the per-object unsynced indicator is the cheap, high-value half.)

Minor: Volyume export is workout-CSV only (no measurement/body-comp CSV export,
though full JSON backup covers it); no Strava connector (likely out of scope /
brand fit); no "export failed → email support" fallback path.

### Recommendations (adopt/adapt, size, priority, why)

| # | Recommendation | Adopt/Adapt | Size | Pri | Why |
|---|----------------|-------------|------|-----|-----|
| R1 | **Low-disk guard + pre-session check.** Before starting a workout / large write, check free bytes (`expo-file-system` `getFreeDiskStorageAsync`); if below a threshold, warn with a non-blocking alert and a "manage storage" hint. Persist a `disableLowDiskSpaceAlert`-style opt-out. | Adapt | S | Protects the local SQLite source-of-truth the whole offline-first design rests on. Cheapest insurance against silent data-loss. Volyume has no equivalent today. |
| R2 | **Per-object "unsynced / retry" affordance.** Surface queue depth at the *row* level for recently logged sessions ("not yet backed up · retry"), reusing the existing `sync_queue` + `getStatus`. | Adapt | M | Closes the trust gap Hevy already addresses; reuses existing engine, no new transport. Turns the single global status line into reassurance users can see. |
| R3 | **Extend import to measurements/body-comp + add a format-detect fallback.** Parse Hevy/Strong measurement exports into `body_composition_log`/`weight_log`; improve `detectFormat` to name the file it *thinks* it got when it can't match. | Adapt | M | A switcher's bodyweight/measurement trend is currently lost on import — a concrete reason to *not* switch to Volyume. Engine + screen already exist; this is parsing + mapping work. |
| R4 | **Measurement/body-comp CSV export parity.** Add a second export (like Hevy's `generateMeasurementsCsv`) so weight/body-comp leave as CSV, not only inside the JSON backup. | Adopt | S | Rounds out the "your data is always yours" promise with a portable, spreadsheet-friendly format for the data users most want to chart elsewhere. |
| R5 | **(Watch only) real-time live-sync channel.** Phone↔wearable in-progress mirroring. | Adapt | L | High effort, depends on a wearable companion app Volyume does not yet have. **P3 / decision-gated** — do not start without a founder decision on wearable strategy. |

Sizes S/M/L; priorities below.

- **R1 — P1** (data-safety, small).
- **R2 — P1** (trust, reuses engine).
- **R3 — P2** (retention/switcher capture).
- **R4 — P2** (portability completeness).
- **R5 — P3** (large, gated on wearable strategy — surface to founder, don't build).

### Quick wins

- **R1 low-disk guard (S, P1):** one `getFreeDiskStorageAsync` check at workout
  start + on the Data settings screen. Directly hardens the offline-first store.
- **R4 measurement CSV export (S, P2):** mirror `buildWorkoutCSV` for
  `weight_log`/`body_composition_log`; wire one more `SettingRow` in
  `SettingsDataScreen.js`.
- **detectFormat error copy (XS):** when an import file matches neither Hevy nor
  Strong, name what was detected instead of the generic "doesn't look like…"
  (`ImportScreen.js:88`) — pure copy/logic, no new surface.

> Note: nothing here touches billing, the coaching engine, or the ED safety
> system. R3/R4 write to body-comp/weight tables that already flow through the
> locked sync registry — additive, no schema change to those tables. Per CLAUDE.md,
> none of this is to be built from this summary: any build starts from the
> relevant locked specs (`SYNC_ARCHITECTURE_LOCKED.md`,
> `DATABASE_SCHEMA_LOCKED.md`) and `src/lib/importExternal.js` read in full.
