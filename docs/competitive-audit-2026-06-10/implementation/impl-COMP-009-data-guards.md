# COMP-009 — Data-loss guards: auto-snapshot SQLite + sign-in merge/switch

Competitive audit 2026-06-10 · Implementation blueprint · Score 3.5

Auto-snapshot the SQLite database before every migration runs, expose those
snapshots as a restore surface in Settings, and insert a calm merge/switch step
when a different account signs in on a device that already holds data. This is a
trust feature, not a feature feature. Its job is to make data loss structurally
impossible at the two moments it actually happens — a botched migration and an
account collision — and to let the user *see* that safety net even if they never
pull the cord.

Reference format: this audit's house structure (no shared brief was authored for
this round; the nine-section skeleton below is the agreed structure). Prose and
code conventions follow the existing implementation logs under `docs/audit/`.

---

## 1. The best-in-market bar

The reference point for "this app has never lost my data" is **FitNotes**. It is
not the prettiest or the most feature-rich lifting tracker, yet it owns the trust
position in the category, and it earns that position with a backup model that is
almost boringly conservative:

- **Automatic Google Drive backup ~1 hour after each workout**, keeping the **5
  most recent** automatic files and deleting older ones to save space.
  ([FitNotes backup docs](https://www.getfitnotes.com/docs/backup-export.html))
- **Manual on-device backup files** the user can share to Drive, Dropbox, email
  or messaging.
- **Restore from any backup file**, with an explicit, honest warning that
  restoring **overwrites** whatever is currently on the device.
- A clean **privacy story**: Drive sign-in runs entirely through Google Play
  Services, and "FitNotes is never in possession of your Google password."

Strong and Hevy do the same in cloud form — account-backed sync plus an export.
**iCloud / Google Drive** device backup is the platform-level safety net users
half-trust. **Cronometer** sets the export bar (clean, complete CSV/JSON the user
owns).

The single best reference is **FitNotes' rolling-N automatic backup** — silent,
bounded, recoverable, with overwrite stated plainly. We are copying its *shape*
(rolling 5, automatic, honest about overwrite) and improving its *trigger*: FitNotes
backs up after each workout; we additionally back up **before every migration**,
which is the one moment FitNotes (and everyone else) does not specifically guard.

---

## 2. What fails — the horror stories

Fitness data loss is not theoretical, and it is the single most reputation-fatal
event a tracker can have. The recurring failure modes:

- **MyFitnessPal "my data disappeared."** Long-running community threads of users
  opening the app to find logs, custom foods, or categories gone — one user
  reported losing **custom categories built over 15 years** (restored the next
  morning, but the panic was real). ([MFP community](https://community.myfitnesspal.com/en/discussion/10904280/my-data-disappeared))
- **Local-only data that never made it to the server.** MFP↔Garmin sync breakage
  (Feb 2026) where data that lived only on-device silently failed to upload, so a
  reinstall or device change meant it was simply gone.
  ([Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/431532/myfitnesspal---nutrition-sync-no-longer-working-in-garmin-connect-since-10th-feb-2026))
- **Re-link wipes history.** MFP's own guidance: when you reconnect an
  integration, **only future data posts; past data does not transfer.** Users
  experience this as a wipe. ([MFP Garmin FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360040110912-Garmin-Connect-FAQ-and-Troubleshooting))
- **Update wipes.** The classic Android pattern — an app update ships a schema
  change without a migration, or with a broken one, and existing users either
  crash on launch or open to an empty database. Expo's own SQLite guidance is
  blunt: ship a schema change without migrations and "existing users will crash."
  ([Expo SQLite docs](https://docs.expo.dev/versions/latest/sdk/sqlite/))

The throughline: data loss happens at **migrations** (schema changes on update)
and at **account boundaries** (re-link, switch, reinstall). Those are exactly the
two seams COMP-009 closes.

---

## 3. User psychology

**The FitNotes trust formula.** Users do not trust an app because it promises
safety; they trust it because nothing has ever gone wrong *and* they can see the
escape hatch. The backup list sitting in Settings is a confidence signal that
mostly never gets used — its value is that it *exists and is legible*. "It's never
lost my data" is the most powerful retention sentence in this category, and it is
earned silently over months.

**The "different account" moment is the highest-anxiety event in the whole app.**
When someone signs in and the app realises the account differs from the one whose
data is sitting locally, the user's lizard brain is screaming *"is it about to
delete my training?"* This is more frightening than a crash, because a crash feels
like the app's fault and a wipe feels like *their* fault for tapping the wrong
thing. Today the app handles this seam *correctly but invisibly* (it wipes the old
account's local rows so the new account pulls clean — see §4b). Invisible is fine
when nothing is at stake; here, everything is, and silence reads as danger.

**Restore UX as a confidence signal even if never used.** The snapshot list should
be visible, dated, human-readable ("Before update · 11 Jun, automatic"), and
restorable in two taps. 95% of users will never tap it. For them it is a seatbelt
they can see. For the 5% who hit a bad migration or a confusing account moment, it
is the difference between a support refund and a five-star review.

**Calm + honest beats reassuring + vague.** The merge/switch copy must never
oversell ("Don't worry!") and never bury the consequence. State exactly what will
happen to the data on this device, in plain British English, and give the user the
slower, safer option by default.

---

## 4. The Volyume implementation

### 4a. Auto-snapshot before every migration

**Where, in the migration runner.** The runner is `runMigrations(d)` in
`src/lib/database.js:1260`. It reads `PRAGMA user_version` (line 1263), then loops
`for (v = current; v < SCHEMA_MIGRATIONS.length; v++)` applying each version's ops
and bumping `user_version` after each (line 1288). `runMigrations` is called once
from `_doInit()` at `src/lib/database.js:264`, immediately after the database is
opened (`SQLite.openDatabaseAsync('volyume.db')`, line 63) and WAL mode is set
(line 64).

The snapshot must be taken **once, only when there is actually work to do, before
the first op of the first pending version runs**. Concretely, at the top of
`runMigrations`, after reading `current`:

```js
const pending = current < SCHEMA_MIGRATIONS.length;
if (pending) {
  // Flush WAL so the copied file is a complete, consistent database.
  try { await d.execAsync('PRAGMA wal_checkpoint(FULL);'); } catch (_) {}
  await snapshotBeforeMigration(current, SCHEMA_MIGRATIONS.length);
}
```

Guarding on `pending` is essential: `_doInit()` runs on **every cold start**, and
on the overwhelming majority of launches there are zero pending migrations.
Snapshotting unconditionally would copy a multi-MB file on every launch for no
reason. We snapshot only on the launch where the schema is about to change — which,
across ~71 migrations historically, is the exact set of launches where data loss
risk is real.

**Format: a file copy, not a JSON dump.** This is deliberately *not*
`dataBackup.js`. The snapshot is a byte-for-byte copy of the live SQLite file via
`expo-file-system`, which is faster, smaller, and guaranteed schema-faithful at the
*pre-migration* version (a JSON dump would be re-interpreted through current code).

```js
// src/lib/dbSnapshot.js (new)
import * as FileSystem from 'expo-file-system/legacy';

const DB_DIR  = `${FileSystem.documentDirectory}SQLite/`;
const DB_PATH = `${DB_DIR}volyume.db`;
const SNAP_DIR = `${FileSystem.documentDirectory}snapshots/`;
const KEEP = 3; // rolling-N retention

export async function snapshotBeforeMigration(fromVersion, toVersion) {
  await FileSystem.makeDirectoryAsync(SNAP_DIR, { intermediates: true }).catch(() => {});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${SNAP_DIR}volyume_v${fromVersion}_to_v${toVersion}_${stamp}.db`;
  await FileSystem.copyAsync({ from: DB_PATH, to: dest });
  await pruneSnapshots(KEEP);
}
```

A failed snapshot **must not block the migration** (a user mid-update must not be
bricked because the disk was full) — wrap the call so a snapshot error is logged
via `logWarn('database.snapshot', …)` and the migration proceeds. The reverse — a
failed *migration* — is where the snapshot earns its keep: the existing runner
already `throw`s on a genuine migration failure (line 1284) and `_doInit` resets
`_db`/`_initPromise` so the next launch retries (lines 50–58). The snapshot is the
manual recovery path if those retries keep failing.

**Storage location.** `${FileSystem.documentDirectory}snapshots/` — the document
directory, not cache. Cache is OS-evictable; a recovery snapshot must survive
memory pressure. The live DB sits at `${documentDirectory}SQLite/volyume.db`
(expo-sqlite's fixed location for `openDatabaseAsync('volyume.db')`).

**Rolling-N retention.** Keep the **3** most recent snapshots (FitNotes keeps 5;
we keep fewer because a full DB copy is larger than FitNotes' delta and our
migration cadence is the trigger, not every workout). `pruneSnapshots(KEEP)` lists
`SNAP_DIR`, sorts by the embedded timestamp, deletes all but the newest `KEEP`.
This bounds growth: worst case `KEEP × DB_size` (see §9 risks).

**Restore surface in `SettingsDataScreen.js`.** Add one new `SettingRow` in the
existing data section (file currently ends its rows at lines 162–195), between
"Restore from backup" and "Export workout log":

```jsx
<SettingRow
  icon="time-outline"
  label="Restore a snapshot"
  sub="Automatic safety copies from before each app update"
  onPress={() => navigation.navigate('Snapshots')}
/>
```

A small `SnapshotsScreen` lists each snapshot with a human label derived from the
filename — "Before update to v71 · 11 Jun 2026, automatic" — file size, and a
two-tap restore (confirm → copy snapshot back over the live DB → prompt full app
restart, mirroring the existing restore-complete copy at lines 122–125). Restore =
`FileSystem.copyAsync` from snapshot back to `DB_PATH` while the DB handle is
closed, then force a relaunch. Reuse the exact destructive-confirm tone already in
`handleRestoreBackup` (lines 108–133): state plainly that it **replaces all current
data** and **cannot be undone.**

### 4b. Sign-in merge/switch step

**What happens at `RootNavigator.js:850–862` today.** On sign-in, the navigator
reads `@volyume_last_supabase_user_id` (line 850). If a *different* previous account
is found AND its rows are still in local SQLite (the "build crashed mid sign-out
before the wipe" case), it calls `wipeAllUserData(lastSignedInUserId)` (line 855) so
the new account pulls a clean cloud, then writes the new id to the key (line 862).
The surrounding comment (lines 832–862, IDENTITY_AND_OWNERSHIP_LOCKED.md) is
emphatic: cross-user *re-stamping* of local rows was the source of a 42501 RLS
cascade and must never return. Normal sign-out already wipes local SQLite
(`clearAuthStateForSignOut`), so the cross-user branch is a **safety net**, not the
common path. **This logic is correct and must be preserved** — COMP-009 adds a
*user-facing confirmation in front of the wipe*, it does not change the ownership
model.

**The new modal.** Before the wipe at line 855 fires, surface a blocking modal so
the wipe is never silent. Two choices, slower/safer default:

- **Keep this device's data** (default, non-destructive). Do **not** wipe. The
  local rows belong to the *previous* account; "keeping" them means we do not
  destroy them — instead we route the user to confirm they want to sign back into
  that previous account, or take a snapshot + export first. Critically, we never
  re-stamp them onto the new account (that is the forbidden 42501 path). In
  practice "Keep" = abort this sign-in, return to the previous session, nothing
  lost.
- **Switch accounts** (destructive, explicit). Proceeds to the existing
  `wipeAllUserData` path (line 855). Before wiping, **take a migration-style
  snapshot of the local DB** (reusing §4a's copy mechanism via a
  `snapshotBeforeAccountSwitch()` wrapper) so even the destructive choice is
  recoverable from the Snapshots screen.

**States the modal must cover:**

1. **First sign-in ever** (`@volyume_last_supabase_user_id` is null) — *no modal*.
   Nothing local to protect; proceed straight through. (Most common path.)
2. **Same account** (`lastSignedInUserId === session.user.id`) — *no modal*. Today's
   code already skips the wipe in this case (the `!==` guard at line 851); keep it
   silent.
3. **Different account** (`lastSignedInUserId && !== session.user.id`) — **show the
   modal.** This is the one anxiety moment. Default to "Keep this device's data."
4. **Anonymous → signed-in.** Handled *outside* this hook — the legitimate
   anonymous-to-account migration runs ONCE in `LoginScreen.handleEmailAuth` under
   the signup branch (per the comment at lines 838–843). Do **not** show the
   switch modal here; an anon user adopting their first account is not "switching
   away" from anyone. Confirm during build that the anon-signup path does not also
   trip the `lastSignedInUserId` guard (it should not, because anon sign-out does
   not write a real supabase user id to that key).

**Copy — calm, honest, British English.** This is the highest-anxiety UX in the
app; the voice is maximally plain. Example strings:

> **Title:** "You're signing in to a different account"
>
> **Body:** "This device currently holds data for a different account. Switching
> will replace what's on this device with the account you're signing into. We'll
> save a snapshot first, so nothing is gone for good — you can restore it from
> Settings → Your data."
>
> **Primary button (default, safe):** "Keep this device's data"
> **Secondary button (destructive):** "Switch accounts"

Alternate, even shorter body for the confirm step after "Switch accounts":

> "We've saved a snapshot of this device's data. Signing in will now load your
> other account. You can restore the snapshot any time from Settings."

Never use "Don't worry", never use an exclamation mark, never hide the word
"replace."

---

## 5. Whole-package integration

**No duplication with `dataBackup.js`.** Two distinct mechanisms, two distinct jobs:

| | Snapshot (COMP-009, new `dbSnapshot.js`) | Backup/export (`dataBackup.js`) |
|---|---|---|
| Trigger | Automatic (pre-migration, pre-switch) | Manual (user taps) |
| Format | Byte copy of `volyume.db` | JSON dump (`dumpAllTables` + prefs) |
| Location | `documentDirectory/snapshots/` (on-device) | Share sheet → user's cloud/Files |
| Lifetime | Rolling 3, app-managed | User owns the file forever |
| Purpose | Disaster recovery the user never thinks about | Portability + user-owned archive |

They share *nothing* in code beyond both using `expo-file-system/legacy`. The
snapshot does not call `exportBackup`/`importBackup`, and the manual backup does not
read snapshots. Both restore paths land in the same Settings section but via
separate rows ("Restore from backup" for JSON, "Restore a snapshot" for the
automatic copies), so the user's mental model stays clean: *backup = the file I
made; snapshot = the safety net the app made.*

**COMP-012 references export, not snapshot.** COMP-012 (data portability / export)
should point at the existing `dataBackup.js` JSON export and the CSV export
(`buildWorkoutCSV`, used at `SettingsDataScreen.js:71`). It must not co-opt the
snapshot files — those are internal recovery artifacts, not a portable format, and
they are pre-migration (potentially stale schema) by design.

**Sync-layer relationship.** Snapshots are strictly *below* sync. The architecture
rule stands: components read local SQLite, sync is the only path to Supabase
(CLAUDE.md). A snapshot is a copy of the local source-of-truth taken before a risky
operation; on restore, the restored DB simply becomes the new local truth and the
sync layer reconciles it upward on next foreground exactly as it would any local
write. The `PRAGMA wal_checkpoint(FULL)` before copy guarantees the snapshot
captures sync-queue rows that were still in the WAL.

---

## 6. Retention & word-of-mouth

The payoff sentence is **"it's never lost my data"** — and its sibling, **"I
switched phones and just signed in and everything was there."** These are the lines
that get a lifting app recommended in a gym WhatsApp group. COMP-009 manufactures
both:

- The snapshot makes a bad update a non-event instead of a one-star review and a
  refund request.
- The merge/switch modal turns the scariest tap in the app into a moment where the
  app visibly *protected* the user — which is itself a story they retell.

Trust compounds. A user who has seen the snapshot list (even idly) carries a
background belief that Volyume is careful with their data, and careful-with-data is
the entire brand promise of an offline-first tracker for paying users.

---

## 7. Beating FitNotes

FitNotes sets the bar; here is where we clear it:

1. **We snapshot before migrations, they don't.** FitNotes backs up after
   workouts. Their model is silent against the *update-wipe* failure mode — the
   exact one that kills Android trackers. Ours guards it directly.
2. **The account-switch moment is handled with a calm, honest modal**, not a
   silent overwrite (and not, like MFP, a confusing re-link that quietly drops
   history). FitNotes' restore warning is honest; ours extends that honesty to the
   *account boundary*, the moment users fear most.
3. **Snapshot + manual export coexist** so the user has both an automatic seatbelt
   and a portable, user-owned archive — FitNotes' Drive backup is one mechanism
   doing both jobs less clearly.

We deliberately *match* rather than beat FitNotes on two things: rolling-N
retention (we keep 3 vs their 5 — same shape) and the plain overwrite warning (we
copy their honesty verbatim in tone).

---

## 8. Measurement

Three metrics, offline-first and PII-free (no event payloads leave the device
beyond aggregate counts already permitted by the analytics rules):

1. **Snapshot-taken rate vs migration-run rate.** Every launch that runs ≥1
   migration should produce exactly one snapshot. A divergence means the snapshot
   guard is failing silently. (Counter, local.)
2. **Snapshot-restore invocations.** How often users actually restore. Expected to
   be near-zero; a spike correlates with a bad migration shipped — an early-warning
   signal worth alerting on.
3. **Switch-modal outcome split.** Of different-account sign-ins, the
   "Keep this device's data" vs "Switch accounts" ratio. Validates the copy: if
   users overwhelmingly hit "Keep" then back out, the modal is scaring people who
   meant to switch; if they switch and then restore the snapshot, the detection is
   firing on false positives.

(Optional 4th) **Snapshot storage footprint** — track `snapshots/` total bytes to
confirm rolling-N pruning is holding (ties to §9 risk).

---

## 9. Build notes

**Read the migration runner carefully first.** `runMigrations` is at
`src/lib/database.js:1260–1290`; it is called once from `_doInit` at line 264.
The append-only invariant on `SCHEMA_MIGRATIONS` (lines 276–277) and the
`isBenignMigrationError` allow-list (lines 1251–1256) are load-bearing — COMP-009
**adds a snapshot before the loop and changes nothing inside it.** Do not reorder,
edit, or "tidy" any existing migration.

**Snapshot mechanism.** New module `src/lib/dbSnapshot.js`. Uses
`expo-file-system/legacy` (the same import `dataBackup.js:11` and
`SettingsDataScreen.js:6` already use — match it, do not introduce the new FS API
in one file). Live DB path is fixed at `${documentDirectory}SQLite/volyume.db`.
`PRAGMA wal_checkpoint(FULL)` before the copy (WAL mode is on, set at line 64).
`expo-file-system` is already a dependency — **no new packages** (CLAUDE.md: ask
before adding). Confirm during build.

**Account-detection flow today** is `RootNavigator.js:850–862`. The modal sits in
front of the `wipeAllUserData` call at line 855; the `@volyume_last_supabase_user_id`
write (line 862) and the ownership model (no cross-user re-stamping, per
lines 832–843) are untouchable. Verify the anon-signup path (LoginScreen) does not
also fire the switch modal.

**Effort vs the 3.5 score.** This is a **mid-weight** build, well-matched to a 3.5:
- Snapshot module + runner hook: small, well-isolated (~1 new file, ~6 lines in
  the runner).
- `SnapshotsScreen` + one `SettingRow`: a standard list screen mirroring patterns
  already in `SettingsDataScreen.js`.
- Merge/switch modal + state wiring in `RootNavigator`: the most delicate piece,
  because it sits on the identity/RLS seam. Budget review time here, not keystrokes.

**Risks.**
1. **Snapshot storage growth.** A full DB copy × 3 can be tens of MB for a
   heavy-history user. Mitigation: rolling-N prune (KEEP=3) runs inside
   `snapshotBeforeMigration`; metric 4 watches the footprint. If it bites, drop to
   KEEP=2 or add a size cap.
2. **Migration timing / blocking.** The snapshot copy happens on the launch path
   before screens render. For a large DB the copy adds latency to an *already
   slow* migrating launch. Mitigation: only runs when migrations are pending (rare),
   `wal_checkpoint(FULL)` is cheap, and a snapshot failure is logged-and-ignored so
   it can never brick the migration.
3. **Restore while handle is open.** Restoring a snapshot over a live, open
   `volyume.db` risks "attempt to write a readonly database" / corruption. Mitigation:
   restore must close the DB handle (or run before `openDatabaseAsync`) and force a
   full app relaunch — exactly what the existing JSON restore already instructs at
   `SettingsDataScreen.js:124`.
4. **Sign-in modal on the identity seam.** Getting the modal wrong could
   reintroduce the 42501 cross-user cascade the comment at lines 832–843 warns
   about. Mitigation: the modal only gates the *existing* wipe; it never re-stamps
   rows, never changes which account owns what. Lint + the migration-ordering
   regression test (the one `runMigrations` is exported for, line 1258) plus the
   `healthConsentRouting`/auth suites must stay green.

**Sacred-rules check.** No billing files touched. No coaching engine / safety
system touched. No production DB commands. No new dependencies. Work stays on the
`claude/main-branch-content-update-dcqicf` branch, never main. British English
throughout user-facing copy.
