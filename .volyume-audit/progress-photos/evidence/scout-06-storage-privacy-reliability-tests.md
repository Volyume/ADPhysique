# Scout report: Storage, privacy, reliability, tests

## Files inspected
- `src/lib/progressPhotos.js`, `src/lib/progressPhotoMeta.js`, `src/lib/progressPhotosController.js`
- `src/lib/progressScanStore.js`, `src/lib/progressScanAnalysis.js` (coachSummaryFromScan, `PHOTO_SCAN_SOURCE`)
- `src/lib/progressScanCoachResolver.js`
- `src/lib/progressPhotoTimeline.js`, `src/lib/progressPhotoDates.js`
- `src/lib/database.js` (`WIPE_DIRECT_TABLES`, `FATAL_LOCAL_WIPE_TABLES`, `wipeAllUserData`, ~L4076-L4260)
- `src/lib/observability/sentryScrub.js`
- `src/components/ProgressGhostCapture.js`, `ProgressPhotoViewer.js`, `PhotoDetailsSheet.js`, `BeforeAfterShareSheet.js`, `ProgressScanCompare.js`
- `src/hooks/usePhotoSuppression.js`
- `src/screens/ProgressPhotosScreen.js`, `CoachOutputScreen.js` (~L1340-L1470), `AthleteProfileScreen.js` (~L255-L295)
- `src/screens/PrivacyPolicyScreen.js`, `src/screens/Article9ConsentScreen.js`
- `app.json` (permissions block)
- `supabase/schema.sql`, `supabase/setup_complete.sql`, `supabase/migrate_003/005/006/008/025/062/096/104_*.sql`, `supabase/nuke_uid_a7379dc8.sql`, `supabase/audit_cloud_schema_drift.sql`
- `docs/BUDGET_POSTURE_LOCKED.md` (Storage and bandwidth specifics section)
- Tests: `src/lib/__tests__/progressPhotos.test.js`, `progressPhotoMeta.test.js`, `progressScanStore.delete.test.js`, `wipeAllUserData.test.js`, `progressScanCoachResolver.test.js`, `progressScanSafetyFloorIsolation.test.js`; `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js`; `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`, `privacyTruth.guard.test.js`, `ProgressPhotosScreen.addFlow/compare/progressScan.guard.test.js`; `src/components/__tests__/ProgressGhostCapture/ProgressPhotoViewer/ProgressPhotoCompare/ProgressScanHistoryCard/BeforeAfterShareSheet*.test.js`; `src/hooks/__tests__/usePhotoSuppression.test.js`

## Search terms used
`progressPhoto|progress_photo|ProgressPhoto`, `SYNC_REGISTRY` contents, `storage\.|createBucket|supabase\.storage`, `exif|EXIF|Location|GPS`, `thumbnail|resize|manipulateAsync|ImageManipulator`, `MediaLibrary|saveToLibraryAsync|CameraRoll`, `allowBackup|excludeFromBackup|NSFileProtection|iCloud`, `getProgressScanCoachSummary|coachSummaryFromScan|resolveProgressScanCoachNote`, `progress_photos` across `supabase/`, `retention|expire|auto-delete`.

## Current-state evidence

**Storage location.** Photos are files named `<epochMs>.jpg` under `FileSystem.documentDirectory + 'progress_photos/'`, scoped per-user at `.../users/<safeUserId>/` (`src/lib/progressPhotos.js:16-27`). Header comment: "Physique tracking wants progress photos, but body images are sensitive ... So they live ONLY in the app's private document directory: never synced to Supabase, never uploaded, never shared automatically" (`progressPhotos.js:1-13`).

**Sync.** Confirmed absent from the sync registry by a dedicated guard test: `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` asserts `SYNC_REGISTRY` contains no `progress_photo_meta`, `progress_scan_sessions`, `progress_scan_assets`, and no table matching `/photo|scan/i` at all.

**Supabase Storage / buckets.** No `supabase.storage`/`createBucket` usage anywhere in `src/`. No numbered migration (`migrate_001`..`migrate_107`) ever creates a `progress_photos` table. A `progress_photos` table (with `photo_url TEXT NOT NULL`) exists ONLY in the stale snapshot files `supabase/schema.sql:261-269` and `supabase/setup_complete.sql:251-259` — CLAUDE.md explicitly flags these two files as stale, migrations are canonical. The account-delete RPC (`delete_user_data`, migrations 003/005/006/008/025/062/096, plus `nuke_uid_a7379dc8.sql`) still carries a defensive `DELETE FROM progress_photos ... EXCEPTION WHEN undefined_table THEN NULL` — a safe no-op today, but it is a remnant of an early architecture where photo URLs were meant to live in the cloud. `docs/BUDGET_POSTURE_LOCKED.md:64-81` documents the reversal: "Photos are not stored in Supabase Storage at any version ... Photos stay on-device only."

**Local DB tables** (SQLite, `src/lib/database.js`): `progress_photo_meta` (takenAt/pose/weightKg snapshot/note keyed by filename), `progress_scan_sessions`, `progress_scan_assets`. All are in `WIPE_DIRECT_TABLES` (database.js:4076-4117) and additionally in `FATAL_LOCAL_WIPE_TABLES` (database.js:4119-4123), meaning a wipe failure on these THROWS rather than being swallowed — stronger than most other tables.

**Deletion / GDPR erasure.**
- Single photo: `deleteProgressPhoto` (`progressPhotos.js:105-112`) validates the URI belongs to the calling user (`isProgressPhotoUriForUser`) before calling `FileSystem.deleteAsync(uri, { idempotent: true })`.
- Deleting a photo attached to a scan detaches it first (`detachProgressScanPhoto`, `progressScanStore.js:446-494`) — clears the scan's `signals_json`/`bias_flags_json`/estimate fields and sets `analysis_status='abstained'`, `abstention_reasons_json=['scan_photo_deleted']`, with the user-facing copy "A photo from this scan was deleted, so the scan analysis has been removed." Order is enforced and tested: detach → delete meta → delete file (`progressPhotosController.js:186-204`, pinned by `progressScanStore.delete.test.js:220-231` — `deletePhotoMeta` call order is asserted to precede `deleteProgressPhoto`).
- Account-level: `wipeAllUserData` (`database.js:4125-4260`) deletes `progress_photo_meta`/`progress_scan_sessions`/`progress_scan_assets` rows by `user_id`, then calls `wipeProgressPhotoDirectory()` which does `FileSystem.deleteAsync(BASE_DIR, { idempotent: true })` — the WHOLE `progress_photos/` tree, not just the calling user's subfolder — then purges SQLite snapshots (`dbSnapshot.purgeSnapshots()`) "so local-only scan/photo rows cannot survive in a retained pre-wipe snapshot" (comment, database.js:4223-4227). All three steps are wrapped so a failure re-throws (fatal), confirmed by `wipeAllUserData.test.js:59-69`.
- Privacy copy: "You can permanently delete your account from Settings > Account > Delete account. Cloud removal starts immediately and local data is wiped on this device... Backup copies are purged within 30 days." (`PrivacyPolicyScreen.js:89-93`).

**Retention policy.** Not evidenced. No auto-expiry, no "delete photos older than N days" logic anywhere searched.

**Thumbnails.** Not evidenced. No `expo-image-manipulator`/resize/thumbnail generation found for progress photos; the gallery (`ProgressPhotosScreen.js`, FlashList grid) and viewer (`ProgressPhotoViewer.js`) render the original full-resolution JPEG directly via `<Image source={{uri}}>`.

**EXIF / location metadata.** Not evidenced as explicitly stripped. `ImagePicker.launchImageLibraryAsync`/`launchCameraAsync` calls in `ProgressPhotosScreen.js:259-299` pass `{ mediaTypes, quality: 0.7 }` with no `exif: true` option, so the JS-side asset object never carries EXIF — but no code re-encodes or explicitly scrubs the copied JPEG BYTES (`saveProgressPhoto` uses `FileSystem.copyAsync`, a byte-for-byte copy, `progressPhotos.js:88`). The in-app camera capture (`ProgressGhostCapture.js`, `cam.takePictureAsync({ quality: 0.92 })`) likewise doesn't request/strip EXIF explicitly. `app.json:37` states "Volyume does not track your location... the permission is never requested" for the bundled camera library's forced Info.plist key — i.e. the app itself never asks for location access, but a photo picked from the OS photo library could still carry the original file's embedded GPS EXIF if the OS didn't already strip it on export (not verified either way — outside app control).

**Privacy copy shown to users (quoted, with paths):**
- `PrivacyPolicyScreen.js:24-27`: "If you use Progress Photos or Volyume Score analysis, the photo files stay on this device unless you choose to share or export them... Volyume Score is a simple progress read, not a DEXA scan, diagnosis, medical assessment, or medical advice."
- `PrivacyPolicyScreen.js:41-43`: "Progress photo image files are device-local. Cloud-backed account data is protected with row-level security..."
- `PrivacyPolicyScreen.js:57-59`: "Body weight, measurements, food logs, check-ins, eating-habits screening, progress photos and progress photo analysis outputs are treated as sensitive health data. They are never sold, never shared for advertising, and never used for third-party model training."
- `PrivacyPolicyScreen.js:84-86`: "You can also create a JSON backup of app database records, including workout, nutrition, body metric, progress photo metadata and Volyume Score analysis metadata. The JSON backup does not bundle private photo image files."
- `Article9ConsentScreen.js` (per `privacyTruth.guard.test.js:15-18`, source-pinned): "photo quality, result confidence, leanness band, Volyume Score and progress change"; "Progress photo image files stay on this device"; "Never use your photos or health data for advertising or third-party model training."
- `ProgressPhotosScreen.js:1169`: "Private on this device"; `:1363`: "No photos on this device."

**Encryption/security of photo files on disk.** Not evidenced. SQLCipher (`src/lib/dbCrypto.js`) covers the SQLite DB only; the JPEG files in `documentDirectory/progress_photos/` are plain files with no app-level encryption found. iOS default data-protection class for `documentDirectory` files is OS-dependent and not overridden in code (no `NSFileProtectionComplete` reference found anywhere in the repo).

**Permissions declared (`app.json`):**
- iOS: `NSCameraUsageDescription`: "Volyume uses the camera to scan barcodes, read nutrition labels, and take progress photos." `NSLocationWhenInUseUsageDescription`: "Volyume does not track your location. This entry is required by a bundled camera library and the permission is never requested."
- Android: `android.permission.CAMERA` declared; `expo-camera` plugin permission text: "Volyume uses the camera so you can line up and take your progress photos. Your photos stay on this device and are never uploaded." `expo-media-library`(-adjacent) plugin: `photosPermission`/`savePhotosPermission` text is specifically about saving SHARE CARDS to the gallery, not the raw progress photo.
- `android:allowBackup` = `false` (confirmed in `docs/playstore-readiness-2026-06-06/playstore-06-security-audit.md:68`), so Android OS backup does not capture the photo directory. No equivalent iOS "exclude from backup" flag found — `documentDirectory` files are plain-copied and (absent an explicit `NSURLIsExcludedFromBackupKey`, not found in the repo) would be included in an iCloud/iTunes device backup by default. `docs/BUDGET_POSTURE_LOCKED.md:70-73` treats OS-level backup (iCloud Photos/Google Photos) as the intended loss-protection path, but that doc describes a "camera roll save toggle in the You tab" and a `photo_progress` table that do not match the current implementation (progress photos are never written to the OS media library at all — only exported before/after SHARE CARDS use `expo-media-library`, in `ShareCardScreen.js`/`BeforeAfterShareSheet.js`). This looks like a stale planning doc, not current behaviour.

**Duplicate / collision handling.** `saveProgressPhoto` (`progressPhotos.js:69-90`) walks the millisecond timestamp forward if the target filename already exists, so two saves in the same millisecond never silently overwrite each other; pinned by `progressPhotos.test.js:117-126`. `buildScanPhotoNameSet` (`progressPhotosController.js:44-49`) is used to prevent stray/unattached photos.

**Owner marker for shared devices (E10 read-only lapse gate).** `markPhotosOwner`/`photosViewableBy` (`progressPhotos.js:114-148`) stamp/read a sidecar `owner.txt` so a lapsed/second account on the same physical device cannot see account A's photos in the read-only view; fails CLOSED on any read error or mismatch (tested exhaustively in `progressPhotos.test.js:50-101`).

**Cross-account wipe scope risk.** `wipeProgressPhotoDirectory()` deletes the entire `progress_photos/` tree (`photoDir()` with no args = the un-scoped `BASE_DIR`), which includes every user's `users/<id>/` subfolder, not just the account being wiped. `wipeAllUserData(userId)` calls it unconditionally on sign-out/account-delete. On a shared device with two accounts, signing out of or deleting account A destroys account B's progress photos too. This is the intentional inverse of the owner-marker mechanism above (which *reads* per-user, but wipe *writes* whole-directory) and is not covered by any test that seeds two users' directories simultaneously.

**Offline behaviour.** Fully local by construction — capture, save, delete, list, and scan analysis all go through `expo-file-system` + local SQLite with no network calls (`progressScanVision.js` grep for fetch/axios/http/supabase.functions found none). No upload-failure handling exists because there is no upload path.

**Analytics/telemetry.** `sentryScrub.js` explicitly redacts `progress_photo_meta`, `progress_scan_sessions`, `progress_scan_assets`, and any path containing `progress_photos/`, plus "All photo file paths and binary payloads" (comment, sentryScrub.js:13) and photo-path/base64-image string redaction (sentryScrub.js:144). The only allow-listed engine-telemetry events touching this surface are `photo_prompt_shown`/`photo_prompt_accepted` (added by `migrate_104_photo_prompt_telemetry.sql`), explicitly "no payload... NO PII: no photo, no weight, no body measurement, no milestone content, no values."

**Crash/failure handling.** `logError('...', e, {...})` used consistently in `progressScanStore.js` (delete, detach, coach-summary) and `progressPhotoMeta.js` (get/getMap/upsert/delete) per the CLAUDE.md convention; user-facing failures in `ProgressGhostCapture.js` surface a calm toast ("Could not take/save that photo. Please try again.").

## What is evidenced
- Progress photo image files never leave the device: no sync-registry entry, no Supabase Storage code, no cloud migration currently creates a photo table.
- Metadata (`progress_photo_meta`, `progress_scan_sessions`, `progress_scan_assets`) is local-only SQLite, excluded from sync by a dedicated regression test.
- Deletion (single photo, scan-detach, and full account wipe) is implemented, ordered, and partially fatal-on-failure (photo/scan tables are the ONLY tables marked fatal in `WIPE_DIRECT_TABLES`).
- Privacy copy across Article 9 consent, Privacy Policy, and Settings/data screens is source-pinned by `privacyTruth.guard.test.js` so it cannot silently drift from the real export/delete behaviour.
- Sentry scrubbing explicitly targets photo paths/tables/binary payloads.
- Collision-safe filename scheme, fail-closed owner marker for shared devices.
- A historical cloud `progress_photos` table (with `photo_url`) is dead: present only in stale snapshot files, never created by canonical migrations, only defensively (no-op) deleted from during account erasure.

## What is not evidenced
- No retention/auto-expiry policy for progress photos or scans.
- No thumbnail generation; gallery/viewer render full-resolution originals.
- No explicit EXIF stripping of copied/captured JPEG bytes (JS-level `exif:true` is simply never requested, which is not the same as stripping the file's embedded metadata).
- No app-level encryption of the JPEG files on disk (SQLCipher covers the DB only).
- No iOS "exclude from backup" attribute on the photo directory — plain `documentDirectory` files are ordinarily included in iCloud/iTunes backups by default.
- No test seeds two different user accounts' photo directories simultaneously to check `wipeProgressPhotoDirectory`'s cross-user blast radius.

## What already works well
- The device-local, never-synced design is unusually well enforced: a *guard test* pins the sync-registry absence rather than relying on convention alone.
- Deletion ordering (detach scan → delete meta → delete file) is deliberately sequenced and independently unit-tested, including the failure-mode branches (meta delete fails → file kept for retry; file delete fails → logged but scan rows still removed).
- The photo/scan tables are the only ones in the whole wipe set marked FATAL on failure — a stronger-than-usual data-loss guarantee for this specific class of sensitive data.
- Sentry scrubbing and the telemetry allow-list were both extended (migration 104) with an explicit "no PII, no payload" design for the one photo-adjacent event that exists.
- Owner-marker fail-closed logic for the E10 shared-device read-only gate is thorough and well-tested (7 dedicated cases).

## Accuracy/trust risks
- **CONTRADICTION vs. founder fact ("photos/scans are NOT linked to Coach/check-ins"):** `getProgressScanCoachSummary` (`progressScanStore.js:405-424`) is called directly from `CoachOutputScreen.js:1365` and `AthleteProfileScreen.js:274`. `CoachOutputScreen.js:1444-1449` calls `resolveProgressScanCoachNote({ scan: scanCoachSummary, output: result, ... })` and `applyProgressScanCoachContext(baseCoachResponse, ...)` folds a scan-derived sentence directly into `coachResponse.interpretation` (`progressScanCoachResolver.js:128-141`) — i.e. the weekly Coach's own displayed interpretation text is literally appended with photo-scan-derived copy ("Progress photos also show positive change... I am treating that as photo context, not a reason to push the cut harder."). This is a real, named, tested integration point (`src/lib/progressScanCoachResolver.js`, `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`) between Progress Scan and the Coach output screen. It is architecturally isolated from the deterministic engine itself — `runWeeklyCoach`'s input object never includes scan data (enforced by `progressScanCoachIsolation.guard.test.js:36-39`), and the note explicitly states `affectsTargets: false` and is never persisted to `coach_outputs` — but the founder's stated fact that scans are "NOT linked to Coach" does not match the shipped code, which visibly surfaces scan context on the Coach screen. Flagging for a founder decision rather than resolving it either way.
- Stale historical cloud `progress_photos` table (schema.sql/setup_complete.sql, never in canonical migrations) risks confusing a future reader into thinking cloud photo storage exists or once held real image URLs; worth a cleanup note even though it is currently inert.
- `docs/BUDGET_POSTURE_LOCKED.md`'s "camera roll save toggle" and `photo_progress` table description do not match the shipped implementation (no such toggle for raw progress photos; different table names) — a stale planning doc, not a live risk, but could mislead someone building from that doc per the "work from SOURCE documents" rule.
- No verified EXIF/GPS stripping — if a photo is picked from the system library with embedded location EXIF still present in the underlying JPEG bytes, that data would be copied byte-for-byte into the device-local store (still never leaves the device under Supabase sync rules, but it is still lying dormant in a special-category data file with location potentially attached, contradicting the app.json claim "Volyume does not track your location" if a copied file secretly carries the original photo's GPS tag).

## UX/safety risks
- **Cross-user wipe blast radius:** `wipeProgressPhotoDirectory()` deletes the WHOLE `progress_photos/` directory tree (all users' subfolders), not just the signed-out/deleted user's own folder, while the read/owner-marker path is scrupulously per-user. On a shared device, signing out or deleting one account destroys every other account's progress photos with no confirmation and no test coverage of this scenario.
- No retention/auto-purge policy means photos accumulate indefinitely on-device with no user nudge to review/delete old ones (not itself unsafe, but a storage-growth and "forgot these existed" UX gap).
- No app-level encryption of the JPEG files themselves; a compromised/rooted or unencrypted-backup device exposes progress photos even though the SQLite DB is SQLCipher-protected.

## Tests found
Extensive and specifically scoped:
- Pure logic: `progressPhotos.test.js` (filename parsing, ordering, collision guard, owner marker, wipe), `progressPhotoMeta.test.js`, `progressPhotoTimeline.test.js`, `progressPhotoDates.test.js`, `progressPhotosController.test.js`.
- Scan store/analysis: `progressScanStore.delete.test.js` (delete ordering, failure-mode branches, detach-on-delete privacy cleanup), `progressScanAnalysis.test.js`, `progressScanCalibrationExport.test.js` (asserts exported calibration JSON contains NO photo names/file paths), `progressScanModel.guard.test.js`, `progressScanVision.test.js`, `progressScanBodyMExternal.test.js`, `progressScanCalibrationAccess.test.js`, `progressScanCalibrationCorpus.test.js`, `progressScanCopy.test.js`, `progressScanPreferences.test.js`, `progressScanCompareViewModel.test.js`.
- Coach isolation: `progressScanCoachResolver.test.js`, `progressScanCoachIsolation.guard.test.js` (source-level regex guard on `CoachOutputScreen.js` proving `runWeeklyCoach`'s call body and `saveCoachOutput` calls never reference scan fields), `progressScanSafetyFloorIsolation.test.js`.
- Sync/privacy guards: `sync/__tests__/progressPhotoMetaNoSync.guard.test.js` (SYNC_REGISTRY absence), `sentryScrub.test.js`, `backupTables.guard.test.js`, `wipeAllUserData.test.js` (fatal-table set, direct-table set).
- Screen/component behaviour: `ProgressPhotosScreen.addFlow.test.js`, `.compare.test.js`, `.progressScan.guard.test.js`, `ProgressGhostCapture.test.js`, `ProgressPhotoViewer.test.js`, `ProgressPhotoCompare.test.js`, `ProgressPhotoPrompt.test.js`, `ProgressScanCompare.test.js`, `ProgressScanHistoryCard.test.js`, `BeforeAfterShareSheet.test.js` + `.backfill.test.js`, `PhotoDateRangeSheet.test.js`, `PhotoDetailsSheet.test.js`.
- Cross-cutting: `AthleteProfileScreen.physiqueScoreRace.test.js`, `.physiqueTile.guard.test.js`, `usePhotoSuppression.test.js`, `wellbeingFailClosed.guard.test.js`, `privacyTruth.guard.test.js` (source-pins the exact user-facing copy), `iaNavigation.guard.test.js`, `proScreenGating.guard.test.js`, `lapsedReadOnly.guard.test.js`, `e8FlashList.guard.test.js`.

Coverage verdict: unusually deep for a "device-local only" feature — pure logic, deletion ordering/failure modes, sync-absence, coach-isolation, privacy-copy truth, and shared-device owner gating are all independently pinned. The gaps are narrower and more structural (retention, EXIF, per-user wipe scope, disk encryption) than "missing tests for existing code."

## Launch-critical opportunities
- Resolve the Coach/Progress-Scan linkage question explicitly with the founder before shipping further Coach-adjacent scan work: either (a) confirm the current out-of-engine, isolated, tested display integration is acceptable and update the "not linked" framing, or (b) if "not linked" must mean literally no visible connection anywhere, remove the `CoachOutputScreen`/`AthleteProfileScreen` calls to `getProgressScanCoachSummary` and the `resolveProgressScanCoachNote`/`applyProgressScanCoachContext` wiring.
- Fix or confirm-as-intended the cross-user `wipeProgressPhotoDirectory()` blast radius before any shared-device scenario ships further (currently wipes ALL users' photos, not just the account being removed/signed out).
- Decide and implement (or explicitly decline, in writing) an EXIF-stripping step for both library-picked and camera-captured images, given this is Article-9 special-category body-image data.

## Premium later opportunities
- iOS backup-exclusion attribute for the photo directory, to fully align device-storage behaviour with the "your photos stay on this device" promise across OS-level backup channels too (currently only Android's `allowBackup:false` covers this).
- Optional at-rest encryption of the photo files themselves (beyond SQLCipher's DB-only coverage), matching the app's general security posture.
- A user-facing retention/cleanup prompt (e.g. "You have photos older than 2 years — review or keep?") rather than unlimited on-device accumulation.
- Clean up the dead `progress_photos` table references in `schema.sql`/`setup_complete.sql` (stale snapshots) so no future reader mistakes them for live cloud storage.

## Things not to rebuild
- The filename-as-ID scheme (`<epochMs>.jpg`) plus the millisecond collision-walk in `saveProgressPhoto` — simple, well-tested, and sufficient.
- The owner-marker fail-closed shared-device gate (`markPhotosOwner`/`photosViewableBy`) — thorough and already covers the edge cases (no marker, mismatched marker, no photos, unreadable marker).
- The detach-then-delete ordering for scan-photo deletion and its test-pinned failure semantics (meta-delete failure keeps the file retryable; file-delete failure still removes DB rows and logs) — this is a deliberate, already-reasoned design, not an accident to "simplify".
- The sync-absence guard test pattern (`progressPhotoMetaNoSync.guard.test.js`) — a good model for any other class of data that must never sync; do not replace with a code-comment-only convention.

## Questions for Fable
1. Is the CoachOutputScreen/AthleteProfileScreen surfacing of `getProgressScanCoachSummary` / `resolveProgressScanCoachNote` (display-only, `affectsTargets: false`, never fed into `runWeeklyCoach`) an ACCEPTED exception to "photos/scans are NOT linked to Coach/check-ins," or does that founder fact mean this wiring must be removed entirely?
2. Is `wipeProgressPhotoDirectory()`'s whole-directory (all-users) deletion on sign-out/account-delete an accepted trade-off for a rare shared-device scenario, or should it be scoped to `photoDir(userId)` for the specific account being removed?
3. Was EXIF/GPS stripping considered and deliberately left to the OS/picker defaults, or is this a genuine gap to close before the next audit cycle, given this is Article-9 body-image data?
4. Is the stale `progress_photos` cloud table in `schema.sql`/`setup_complete.sql` safe to delete from those snapshot files now, or does anything still depend on its presence (e.g. a staging project that was never migrated past that early schema)?
