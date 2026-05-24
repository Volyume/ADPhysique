# Identity and data ownership (locked)

Locked 2026-05-24 after a sync-conflict cascade exposed a fundamental
design flaw: row `user_id` values were being mutated after creation,
and anonymous local IDs were being conflated with real account IDs.
This document is the corrective. It is hard-locked: code must not
violate the principles below, and any future change that touches
identity, ownership, sign-in, sign-out, account deletion, install or
re-install behaviour must be reconciled against this doc first.

If the principles here conflict with code that ships later, the code
is wrong, not this doc.

## The principle

> A row identifies one piece of data, owned by one user, for the life
> of that data. Neither the row id nor the user_id is mutable after
> creation. Two users on the same device, or the same user across
> devices, never share the same row id.

Every design decision below follows from that one sentence.

## What the principle rules out

- Re-stamping `user_id` on an existing row, ever, for any reason.
- Two accounts on the same device sharing any row by id.
- An ID generated under one account being adopted by another account.
- Local "anonymous" identifiers being indistinguishable at the type
  level from real account identifiers. They are different concepts and
  the code must treat them differently.
- Sign-out leaving stale rows behind that a future sign-in could
  inherit.
- Account deletion leaving cloud rows behind under the deleted user's
  id. Account deletion means the user is gone, everywhere.

## Identifiers

Three distinct kinds of identity exist in Volyume. They are named, kept
in separate AsyncStorage keys, and the code must never treat one as
the other.

| Identity | Storage key | Lifetime | Format |
| --- | --- | --- | --- |
| **Anonymous device identity.** A user who has tapped Free on Welcome but never signed up. Only this identity owns anonymous-tier local rows. | `@volyume_anonymous_local_id` | Created on first Free tap. Removed the moment a real account is created (the rows it owned are migrated then). Never restored once removed. | UUID v4 prefixed `anon:` so it's visually + programmatically distinct from a Supabase auth.uid. |
| **Active session identity.** The currently-signed-in real account. | Supabase session (`session.user.id`). Mirrored to `@volyume_last_supabase_user_id` for cross-user safety checks at sign-in. | Lifetime of the auth session. Cleared on sign-out. | Supabase auth.uid (UUID, no prefix). |
| **Row owner identity.** The `user_id` column on every row in user-scoped tables. Set at INSERT, never UPDATEd. | Per-row. | Lifetime of the row. | Either an `anon:` id (anonymous-tier rows) or a real account uid. Never both for the same row. |

Code that writes a row must read the OWNING identity from one of the
first two surfaces above (anonymous or active). It must not read it
from an arbitrary in-memory cache that might lag behind.

Row ids themselves are UUID v4, minted at row creation. They have
astronomically negligible collision probability between users. If a
collision ever occurs in cloud it is a bug (almost certainly a row
copied with its id from another database) and must be investigated,
not papered over.

## Scenarios

Every transition the user can put the app through, and the correct
behaviour. If a scenario is missing from this list, the principle
above is the tiebreaker.

### S1. Fresh install, taps Free, never signs up

- App boot: no `@volyume_anonymous_local_id`, no Supabase session.
- User taps Free on Welcome.
- App mints a new `anon:<uuid>`, stores it under
  `@volyume_anonymous_local_id`.
- All rows created from this point have `user_id = 'anon:<uuid>'`.
- App is fully usable offline. No cloud sync (anonymous rows never
  push).

### S2. Fresh install, signs up immediately

- App boot: no anonymous id, no session.
- User taps Pro on Welcome, signs up.
- Supabase issues a session with `user.id = U_A`.
- App stores `U_A` under `@volyume_last_supabase_user_id`.
- All rows created from this point have `user_id = U_A`.
- No migration needed: there were no anonymous rows.

### S3. Free user signs up after using the app

- App state: `anon:X` exists in AsyncStorage, local rows under `anon:X`.
- User signs up. Supabase issues session with `user.id = U_A`.
- App stores `U_A` under `@volyume_last_supabase_user_id`.
- App copies each anonymous-tier local row to a NEW row with a NEW
  id under `user_id = U_A`. The original `anon:X` rows are deleted.
  Foreign-key references inside the copy block are remapped to the
  new ids in lockstep.
- `@volyume_anonymous_local_id` is removed. There is no longer any
  anonymous identity on this device; the user is signed in.
- New cloud rows under `U_A` are then pushed normally.

This is the ONE legitimate "migrate anonymous to account" operation.
It is a copy-then-delete, not a re-stamp. New IDs everywhere.

### S4. Signed-in user signs out

- App state: session present, `user.id = U_A`, rows under `U_A`.
- User taps Sign out.
- Supabase session cleared.
- In-memory user state cleared.
- Local SQLite rows under `U_A` are **kept**. They sync back to cloud
  on next sign-in to U_A.
- `@volyume_last_supabase_user_id` retains `U_A` so the next sign-in
  knows whose data is currently sitting in local SQLite.
- App routes back to Welcome / Login.

Sign-out is a session-level operation. It does not destroy data.

### S5. Signed-in user signs out, signs back in as the SAME account

- Picks up from S4. Local SQLite has U_A's rows under U_A.
- User signs in to U_A again. Session restored with `user.id = U_A`.
- `@volyume_last_supabase_user_id` already equals `U_A`. Nothing to
  wipe.
- No migration runs. Local rows are already owned by the correct user.
- Sync resumes normally: push any local-only edits made while signed
  out, pull anything new from cloud.

### S6. Signed-in user signs out, signs in as a DIFFERENT account

- Picks up from S4. Local SQLite has U_A's rows under U_A.
- User signs in to U_B. Session arrives with `user.id = U_B`.
- `@volyume_last_supabase_user_id` is `U_A`, which differs from `U_B`.
  This is a cross-user sign-in.
- Before doing anything else, app wipes every local row whose
  `user_id` is `U_A`. That data still exists in U_A's cloud and can
  be restored if U_A signs back in.
- `@volyume_last_supabase_user_id` is set to `U_B`.
- App pulls `U_B`'s data from cloud.

The previous account's data does not get re-stamped, re-keyed,
inherited, or partially leaked. It is gone from local SQLite. The
cloud rows remain under U_A's ownership, untouched.

### S7. User deletes their account

- App state: session present, `user.id = U_A`.
- User triggers Delete account.
- App calls `delete_user_data` RPC → cloud deletes every row owned by
  `U_A` across every user-scoped table.
- Edge Function `delete-account` calls Supabase admin
  `auth.admin.deleteUser(U_A)` → auth row gone.
- App calls `wipeAllUserData(U_A)` → local SQLite rows under `U_A`
  deleted.
- App also wipes `@volyume_last_supabase_user_id`,
  `@volyume_anonymous_local_id` (if present), profile cache, tier
  cache, prefs scoped to U_A, SecureStore tokens.
- Session signed out. Routes to Welcome.

After delete, the device is indistinguishable from a fresh install.
No leftover state. No orphan rows in cloud. Re-signing-up creates a
brand new user; no inherited data of any kind.

### S8. User uninstalls the app

- OS removes the app and its sandbox. AsyncStorage gone. SQLite gone.
  SecureStore gone (modulo platform quirks; treat as gone).
- Supabase cloud rows under `U_A` are NOT touched. User still owns
  their cloud data.

### S9. User reinstalls the app, signs back in to the SAME account

- Fresh install. No local state.
- User installs, opens, taps Pro / Sign in, enters credentials.
- Session arrives with `user.id = U_A`.
- `@volyume_last_supabase_user_id` is absent (fresh install). No
  cross-user wipe needed.
- App stores `U_A` under `@volyume_last_supabase_user_id`.
- App pulls `U_A`'s data from cloud. Local SQLite rebuilt fresh under
  `U_A`. All rows carry their original cloud ids.

### S10. User reinstalls, signs up with a NEW email

- Fresh install. No local state.
- User signs up. Session arrives with `user.id = U_C` (brand new uid).
- `@volyume_last_supabase_user_id` is absent.
- All rows created from this point have `user_id = U_C`, brand new
  UUIDs. There is no path by which any rows previously owned by any
  other account get to `U_C`.

### S11. User uses the same account on two devices

- Device 1 has U_A's data, synced to cloud.
- Device 2: user signs in to U_A. Pulls everything from cloud. Local
  rows on device 2 carry the SAME ids as on device 1 (those ids came
  from cloud). Both devices reference the same canonical rows.
- Edits on device 2 push back to cloud; device 1 pulls them next
  sync. Conflict resolution per `SYNC_ARCHITECTURE_LOCKED.md` (last
  write wins per row, scoped to the user).

This is the ONLY scenario in which the same row id legitimately
exists in two local SQLite databases. Both belong to the same user.

### S12. Two users share a physical device (e.g. partners, family)

- Device starts on U_A's account.
- U_A signs out. Local SQLite has U_A's rows under U_A.
- U_B signs in. Cross-user sign-in (S6). U_A's local rows wiped. U_B
  pulls their data fresh.
- U_B signs out. U_B's local rows under U_B stay.
- U_A signs in again. Cross-user sign-in (S6). U_B's local rows wiped.
  U_A pulls their data fresh.

Each sign-in is a full hand-over. The previous occupant's data is
removed from local SQLite before the new occupant gets in. Their
cloud data is preserved.

This costs network on every account switch. That is the correct cost
for guaranteed isolation. There is no path by which U_A sees U_B's
data or vice versa.

### S13. Cloud-side row was created by another user with the same id (impossible-by-design)

If this ever happens, it is a bug. Possible causes (none legitimate):

- A direct database manipulation outside the app's code path.
- A backup-and-restore that re-introduced a row whose owner has
  changed.
- An import flow that copied row ids instead of minting new ones.

The fix is to find the source. The fix is NOT to re-mint the local
row to dodge the conflict, or to silence the RLS rejection, or to
"reclaim ownership" of another user's row.

## Implementation rules

These are the code-level statements of the principle.

1. **No `UPDATE ... SET user_id = ?` anywhere.** The only legitimate
   transitions of ownership are `INSERT` (creation) and `DELETE`
   (destruction). Any code that wants to change ownership must
   copy-then-delete: INSERT a new row under the new owner with a new
   id, DELETE the old row.
2. **The anonymous identity has its own AsyncStorage key**
   (`@volyume_anonymous_local_id`) and a visually distinct prefix
   (`anon:`). Code that checks "is this an anonymous user" does so by
   prefix, never by structure or absence-of-session.
3. **`migrateLocalUserId` is deprecated** in its current shape. Its
   only legitimate use case (S3) is replaced by a
   `copyAnonymousRowsToAccount(anonId, accountUid)` helper that does
   the explicit copy-then-delete with new ids and FK remapping. Once
   that helper lands, `migrateLocalUserId` is deleted, not just
   unused. Leaving it in source is a hazard.
4. **Sign-in to a different account always wipes the previous
   account's local data first.** This rule applies in both code
   paths: explicit `LoginScreen.handleEmailAuth` AND
   `RootNavigator.onAuthStateChange.SIGNED_IN`. Both call sites must
   call `wipeAllUserData(previousUid)` before doing anything else.
5. **Account delete wipes everything for that user.** Both cloud (via
   `delete_user_data` RPC) and local (via `wipeAllUserData`), plus
   the AsyncStorage keys named in S7. The function that runs this
   sequence must be the only path to delete; there is no manual cleanup.
6. **Row ids are minted by `uid()` which is UUID v4.** Never derived
   from anything else (no hashes of names, no concatenations of
   user_id and timestamp, no deterministic seeds shared across
   users). Deterministic ids are valid for canonical reference data
   that is the same for every user (exercise library), but never for
   user-scoped data.
7. **The diagnostic in `database.diagnoseSyncConflicts` is the truth
   test.** If it reports any rows under a `user_id` that is neither
   the current session uid nor the current anonymous id, the
   invariant is violated. A test should fail. An alert should fire.

## Anti-patterns to never reintroduce

- "Hide the error, the data is fine." (Hiding 42501 warnings without
  fixing the cause is what triggered this document.)
- "Migrate the user_id, the rows are useful." (Bug source #1.)
- "Reclaim the cloud row's ownership." (Treats another user's data as
  yours.)
- "Re-mint the local id on conflict." (Papers over a design failure
  rather than preventing it.)
- "Sign-out preserves all local state across accounts." (Conflates
  session lifetime with data lifetime.)

## Enforcement

- **Diagnostic.** `database.diagnoseSyncConflicts` exposes per-table
  per-user_id row counts. A user can run it from Settings → Debug.
  The expectation is that the only user_ids reported are the current
  session uid and, if present, the current anonymous id.
- **Test.** A new unit test (TBD when the implementation lands) asserts
  that no code path writes to `user_id` column on an existing row.
  Static check via `grep -r "SET user_id"` should return no matches
  in `src/`.
- **CLAUDE.md reference.** This document is cited as a hard rule in
  `CLAUDE.md` so future Claude sessions cannot violate it through
  ignorance.
- **PR checklist.** Any PR that touches sign-in, sign-out, account
  delete, or any code path that writes a `user_id` column must state
  in its description which scenario above it preserves and which it
  changes.

## Migration plan (the existing bad data)

This document defines what correct looks like. Cleaning down the
existing 400+ rows that violate the invariant is a separate workstream
and must follow the same principle:

1. Confirm the design fix is in place and passes the diagnostic on a
   clean install.
2. Run the diagnostic on the affected install to enumerate exactly
   which `user_id` values are foreign.
3. Surgically delete those rows from cloud via a one-off SQL DELETE
   that targets specific abandoned uids. The current account's data
   under the current uid is untouched.
4. Local SQLite for the affected device is wiped at next sign-in via
   the new cross-user-wipe rule (S6). The user signs in fresh, pulls
   the cleaned cloud state, and the diagnostic comes up clean.

No data fix happens before the design fix lands. The design fix must
prevent the issue recurring; data cleanup without the design fix
guarantees the issue returns.
