# Identity and data ownership (locked)

Locked 2026-05-24 after a 400-row 42501 cascade exposed three design
flaws: row `user_id` was mutated after creation, anonymous and account
identities were conflated, and row IDs could collide between users in
the cloud. This document is the corrective. It is hard-locked: code
must not violate it, and any future change that touches sign-in,
sign-out, account delete, install, or any code path that writes a
`user_id` column must be reconciled against this doc first.

If code conflicts with this doc, the code is wrong.

> **Shipped status (2026-05-24, post audit):** the seven-step
> implementation sequence below is complete. Cloud migrations 018
> (composite PKs on the legacy table set), 020 (custom_exercises
> split out of mixed-ownership `exercises`), 021 (food-domain
> composite PKs + food_sync_push update), and 024 (consent_log
> rectification) have all been applied. Code commit `be8e1cc` is
> the corresponding client-side land. Step 7 (existing-user data
> fix-up) runs automatically on the next sync cycle after schema
> lands; no manual SQL needed.

## Four locked decisions

1. **No anonymous mode.** Tapping Free on Welcome routes to sign-up.
   Every user has a real account from the first row they create.
   There is no `anon:` identity, no `@volyume_anonymous_local_id`,
   no `initLocalUser` flow.
2. **Sign-out wipes local data.** Every sign-in is a fresh cloud
   pull. By the time anyone signs in, local SQLite for user-scoped
   tables is empty.
3. **Composite primary keys.** Every user-scoped table is
   `PRIMARY KEY (user_id, id)`. Two users cannot collide on a row at
   the schema level. Cross-user-id-clash becomes impossible, not
   merely unlikely.
4. **No destructive cleanup of existing user data.** The composite-PK
   refactor itself fixes the bug: the previously-failing local rows
   push cleanly under their new `(current_user, id)` primary key, so
   the user gets their data back in cloud rather than losing it. Old
   orphan cloud rows under abandoned user_ids stay inert. RLS hides
   them from everyone.

## The principle

> A row's `user_id` is set at INSERT and never changes. A row's
> primary key includes its `user_id`, so two users cannot share the
> same row at the schema level. Local SQLite holds at most one user's
> data at a time; sign-out empties it.

Every implementation rule below follows from those two sentences.

## Scenarios

With the four decisions above, most scenarios collapse to "wipe local,
pull cloud, push edits". Listing them anyway so behaviour is explicit.

### A. Fresh install, signs up

- App boot: no local data, no session.
- User taps Free or Pro on Welcome. Both route to sign-up.
- Supabase issues session `user.id = U`.
- Local SQLite is empty. Nothing to push, nothing to pull.
- All new rows created with `user_id = U`.

### B. Returning user signs in

- App boot: no local data (could be reinstall, sign-out, or first
  sign-in on this device).
- User signs in. Supabase issues session `user.id = U`.
- App pulls all of `U`'s data from cloud. Local SQLite populated
  with `user_id = U` rows whose IDs match the cloud rows.

### C. Signed-in user signs out

- App state: `user.id = U`, local rows under `U`.
- User taps Sign out.
- App wipes every user-scoped row from local SQLite. (Reference
  data — exercise library — stays.)
- App clears in-memory user / session / profile / tier state.
- App calls `AsyncStorage.clear()` — every key gone. No carve-outs
  for accessibility prefs, crash log, install counters, or
  anything else. Same hammer as delete-account; if a user wants a
  setting back, they can set it again after signing in.
- App clears the supabase auth token from SecureStore.
- Routes back to Welcome.

### D. Different user signs in after sign-out

- Picks up from C. Local SQLite is already empty.
- Sign-in is identical to B. Pull fresh from cloud under the new
  `user.id`.

### E. Account delete

- App state: `user.id = U`.
- User triggers Delete account.
- App calls `delete_user_data` RPC → cloud deletes every row owned by
  `U` across every user-scoped table.
- Edge Function `delete-account` calls
  `auth.admin.deleteUser(U)` → auth row gone.
- App wipes local SQLite (same path as sign-out).
- App wipes AsyncStorage + SecureStore for `U`.
- Routes to Welcome. Indistinguishable from a fresh install.

**One deliberate exception (migration 071, trial-abuse prevention).** A single
salted SHA-256 hash of the account's email is kept in `private.trial_ledger`
and is NOT deleted by `delete_user_data`. This is the only thing that survives
account deletion. It exists so the 14-day cardless trial cannot be restarted by
deleting and re-signing-up with the same email. It is a one-way hash, holds no
email, user id, or other PII, and lives in the `private` schema (never exposed
via the API). Lawful basis: legitimate interest (preventing trial fraud);
disclosed in the privacy policy. "Delete wipes everything the user owns" still
holds, this hash is not user-owned data, it is an abuse-prevention token.

### F. Uninstall, reinstall

- OS removes app sandbox. Everything local gone.
- Reinstall: identical to "fresh install" (A or B depending on
  whether the user signs in or signs up).

### G. Same user, multiple devices

- Each device, on sign-in, pulls `U`'s data from cloud.
- Both devices have the same row IDs (those IDs came from cloud).
- Edits push back; the other device pulls them on its next sync.
- Conflict resolution per `SYNC_ARCHITECTURE_LOCKED.md` (last-write-
  wins per row, scoped to `U`).
- The composite PK `(U, id)` is the same on both devices for the
  same row — that's what makes shared editing work.

### H. Two users on the same physical device

- User A is signed in. Local SQLite has A's rows.
- A signs out → local wiped (C).
- B signs in → local is empty, pulls B's data (B).
- B signs out → local wiped.
- A signs back in → local empty, pulls A's data.

No application-layer wall is needed because the local store is
single-user-at-a-time by construction.

## Implementation rules

These are the code-level statements of the principle. Any PR that
violates one must justify the deviation in writing.

1. **Schema.** Every user-scoped table uses `PRIMARY KEY (user_id,
   id)`. Local SQLite and Supabase schemas match. Child tables that
   reference a parent (e.g. `routine_exercises → routines`,
   `workout_sets → workouts`) carry the parent's `user_id` column
   and reference it as part of the FK.
2. **Upserts.** PostgREST upserts use `onConflict: 'user_id,id'`
   (not `id`). Local UPSERTs use composite ON CONFLICT.
3. **No UPDATE on user_id.** Static enforcement: a CI check runs
   `grep -rn 'SET user_id' src/` and fails the build on any match.
   The only legitimate ownership change is INSERT (creation) or
   DELETE (destruction).
4. **Sign-out path** calls `wipeAllUserData(userId)` BEFORE clearing
   in-memory state. Without that order, the wipe can lose its uid
   reference and become a no-op.
5. **Sign-in path** does not call `migrateLocalUserId`. That
   function is deleted from `database.js` in this refactor. Its old
   call sites in `RootNavigator.onAuthStateChange` and
   `LoginScreen.handleEmailAuth` are removed.
6. **Welcome screen** routes both Free and Pro CTAs to the sign-up
   flow. No `initLocalUser`. No `handleContinueLocally` button on
   LoginScreen.
7. **Account delete path** is the only path that calls
   `delete_user_data` RPC + `auth.admin.deleteUser`. Sign-out does
   not.
8. **Reference data** (the global exercise library, the bundled
   foods cache, anything not user-scoped) is exempt from the wipe.
   The wipe explicitly enumerates user-scoped tables; reference
   tables are not on the list.

## Anti-patterns to never reintroduce

- Anonymous local mode of any kind.
- `migrateLocalUserId` or any function that updates `user_id` on
  existing rows.
- "Continue locally" or any sign-in-skip path on Welcome / Login.
- Suppressing 42501 errors to mask cross-user collisions. (With
  composite PKs, a 42501 from cross-user collision is impossible. If
  one ever fires, the schema invariant is broken and we investigate,
  not silence.)
- "Reclaim ownership" of cloud rows belonging to another user.
- "Re-mint id on conflict" as a workaround.

## Enforcement

- **Diagnostic** (`database.diagnoseSyncConflicts`) reports per-table
  per-user_id row counts. On a healthy install, only the current
  session uid appears. Any other uid in the report is a bug.
- **CI grep** rejects any `SET user_id` in `src/`.
- **Mount tests** cover the sign-out + sign-in cycle and assert
  local SQLite is empty between them.
- **CLAUDE.md** cites this doc as a hard rule (see "Engineering"
  section). Future Claude sessions read it before touching identity-
  related code.

## Implementation sequence

The refactor lands in this order. Each step is its own commit so any
single step can be reverted cleanly.

1. **Cloud schema (migration 018 + the follow-ups).** For each
   user-scoped table: drop existing PK, add `PRIMARY KEY (user_id,
   id)`, expand FK constraints to include `user_id`. Add `user_id`
   columns to child tables that don't yet have one (e.g.
   `routine_exercises`). The base set landed in migration 018; the
   food domain was deferred to migration 021 because the
   `food_sync_push` RPC needed a coordinated update; `exercises`
   was deferred to migration 020 because it's mixed-ownership and
   needed splitting into `custom_exercises` first; the
   `consent_log` audit table created in migration 019 was brought
   into composite-PK compliance in migration 024 once the audit
   pass identified the deviation. Tested via Dashboard SQL Editor
   before code goes near it.
2. **Local schema migration.** New entry in `SCHEMA_MIGRATIONS` that
   mirrors the cloud changes for SQLite. Adds `user_id` columns
   where missing; sets composite PKs.
3. **Sync code update.** Every upsert call switches from
   `onConflict: 'id'` to `onConflict: 'user_id,id'`. Push helpers
   that didn't include `user_id` in child rows now do.
4. **Sign-out wipe.** `wipeAllUserData(userId)` is wired into the
   sign-out flow. Local SQLite is emptied before in-memory state
   clears.
5. **Remove anonymous mode.** Welcome buttons both route to sign-up.
   `initLocalUser`, `handleContinueLocally`, the `LOCAL_USER_KEY`
   AsyncStorage key, and `migrateLocalUserId` are deleted from
   the codebase.
6. **Verification.** Diagnostic reports clean. CI grep passes. Mount
   tests pass. Manual sign-out/sign-in cycle on device confirms
   data round-trips cleanly.
7. **Existing-user data fix-up.** On the next sync cycle after the
   schema change ships, the previously-failing local rows push to
   cloud under their new composite PKs. The user's data is
   automatically rescued. No manual SQL needed.

Step 7 is the answer to "the user's data goes back to cloud". The
composite-PK schema turns what used to be a 42501 into a clean
INSERT, because `(current_user, id)` is a brand-new primary key
even when `id` already exists under another user.

## Reconciliations

### 2026-06-03 — local `custom_exercises` mirror retired

Context: the app has always represented a user's custom exercises in
the local `exercises` table with `is_custom=1` (created via
`insertExercise`, listed via `getAllExercises`, resolved by id through
the routine/workout joins and `getExerciseById`). The parallel local
`custom_exercises` table and its JS accessors
(`insertCustomExercise`, `updateCustomExercise`,
`deleteCustomExercise`, `getCustomExercisesForUser`,
`getCustomExerciseById`, `getAllExercisesForUser`,
`getAllCustomExercisesSince`, `insertOrUpdateCustomExerciseFromCloud`)
were an orphaned mirror that nothing read for display or id
resolution. A reinstall restored customs into that orphaned mirror, so
they vanished from the UI. The cloud restore was repointed at the
`exercises` table (`is_custom=1`) earlier; this change removes the now
fully-dead local mirror accessors and the redundant
`_pushCustomExercises` delta-push in `sync.js`.

Why this is compliant with the four locked decisions:

- The composite-PK split (migrations 020/021) exists for **cloud**
  correctness so two users' customs cannot collide server-side. That
  is untouched. The **cloud** `custom_exercises` table and its
  composite PK remain, and `syncExercises` still filters `e.isCustom`
  from `getAllExercises` and upserts them to cloud `custom_exercises`
  with `onConflict: 'user_id,id'`. Cloud push of customs is unchanged.
- Only the **local** mirror's JS accessors are retired, in favour of
  the local `exercises.isCustom` model the whole app already uses.
  Local SQLite is single-user (sign-out wipes it), so there is no
  local composite-PK concern.
- No `UPDATE ... SET user_id` is introduced. Ownership is still set at
  INSERT only.
- The local `custom_exercises` table schema is left in place (dropping
  it would need a tracked migration); it is now simply never written.
  It stays on the `WIPE_DIRECT_TABLES` and `diagnoseSyncConflicts`
  lists so a user-switch still clears it.

---

## COMP-030 addendum (2026-06-12) — quiz-first onboarding, behind a flag

Variant B of COMP-030 (quiz-first onboarding) ships behind a local config flag
`ONBOARDING_QUIZ_FIRST` (`src/lib/onboarding/quizFlow.js`). **FLIPPED ON
2026-06-12 by explicit founder decision** (deep-audit decisions doc
`docs/deep-audit-2026-06-12/_FOUNDER-DECISIONS-2026-06-12.md` #3: "flip fully
on", including the pre-account phase question). The flag remains as the
rollback switch; the account-first flow is intact behind it.

Reconciliation with decision 1 (no anonymous identity): the flag, when on,
inserts a pre-account quiz before the account wall, but it creates **no
identity, no uid, no row, and no persisted key** — the quiz answers live ONLY in
in-memory store state (`onboardingQuiz`, never AsyncStorage/SQLite, never
transmitted), and account creation still precedes the first persisted row and
any server contact. Both Welcome CTAs still lead to sign-up; on the Pro path the
user merely expresses preferences one screen earlier. The "no sign-in-skip path"
anti-pattern is intact: there is still no way to reach the app without an
account. Founder to confirm this reading at PR review (per the 2026-06-11 "DPO
is a red herring — normal PR bar" instruction).
