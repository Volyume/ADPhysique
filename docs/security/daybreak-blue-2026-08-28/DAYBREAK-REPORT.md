# VOLYUME HOSTILE SECURITY & ABUSE-RESISTANCE CAMPAIGN

## 1. VERDICT

**NOT READY — SECURITY BLOCKERS REMAIN**

The isolated security branch fixes and locally verifies thirteen confirmed
findings, including five SEC-P1 findings. It is not yet safe to merge or release
because the effective Supabase RLS/RPC state has not been independently exercised
with two synthetic users, migration 155 is unapplied, changed Edge Functions are
undeployed, Apple JWS verifier configuration is absent from this environment, and
physical-device SQLCipher/deep-link/image tests remain. No active-production
SEC-P0 was established and no production state was changed.

## 2. BASELINE

- Original main SHA: `ec37a32f7e4c39fd94264b260f15e179679abc14`
- Security branch: `security/daybreak-blue-2026-08-28`
- Isolated clone: `C:\Users\Admin\ADPhysique-daybreak-2026-08-28`
- Security final implementation SHA: `bda8323a6ff5c3e3431da6ebefacc8a6c67a9454`
- App version: `1.3.1`; iOS build `10`; Android version-code floor `3357`
- Expo / React Native: Expo `54.0.37`; React Native `0.81.5`
- JavaScript runtime: Hermes; New Architecture enabled
- iOS: custom `volyume` URL scheme; SQLCipher config plugin; no Associated
  Domains entitlement in the assessed source
- Android: SDK compile/target 36; `allowBackup=false`; cleartext traffic
  disabled; HTTPS App Link configuration plus the custom scheme
- Web: Next.js workspace under `web/apps/web`, built as the web deployment
  artifact; Supabase SSR package shared in the monorepo
- Supabase: hosted Auth/PostgREST/RPC/Edge Functions; 151 numbered migrations at
  baseline and seven Edge Functions; public client configuration supplied through
  environment files, privileged values through GitHub/Supabase secrets
- Auth providers represented in source: email OTP/signup/recovery, Google OAuth,
  Apple OAuth, token-hash and legacy implicit callback compatibility
- Local data: Expo SQLite with SQLCipher, key in SecureStore, AsyncStorage for
  selected preferences/control state, and app-private photo/avatar files
- Production migration head: ledger version `20260827114840`, repository
  migration 154, `workout_notes_conflict_target_and_deletion_completeness`
  (recorded by migration comments; not independently queried in this campaign)
- Test/E2E: Windows local Jest/Deno/Next/Expo static builds. No Supabase test
  project credentials, synthetic A/B accounts, iOS/Android device, Maestro
  device, or production database connection was available.
- CI/CD: eleven GitHub Actions workflows, EAS/native signing paths, Supabase
  deployment workflows, Sentry upload, GitHub Pages web deployment
- Tests at closure: mobile Jest 1 failed, 1 skipped, 1,079 passed suites; 1
  failed, 13 skipped, 14,747 passed tests. The sole failure is the unchanged
  pre-existing `todayTruthRepair.guard` copy assertion for “weeks running”. All
  new security suites passed. Web: 31/31 tests passed. Further gates are in §33.

## 3. THREAT MODEL SUMMARY

- Attackers: unauthenticated internet caller; ordinary or malicious
  authenticated user; user controlling their client/device/clock/requests;
  malicious same-device app; deep-link controller; hostile backup/import author;
  own-account sync attacker; stale session; bot; known-UUID attacker; old-client
  attacker; compromised repository collaborator or mutable CI dependency.
- Trust boundaries: OS/browser → auth callback; Supabase Auth → app identity;
  app → PostgREST/RPC; public webhook → service role/store APIs; imported file →
  SQLite/private files; cloud sync → local/native state; JS → native modules;
  private storage → OS backup/share; browser → Next server; GitHub → CI/EAS/store.
- Highest-value assets: access/refresh sessions; health, food, workout, body and
  capability data; progress photos; Pro entitlement; SQLCipher data/key;
  partner data; definer/admin RPCs; service/signing/release credentials.
- Highest-risk entry points: legacy auth callback fragments; auth event/account
  transition races; direct PostgREST/RPC; purchase/webhook Edge Functions;
  backup/CSV/image import; private-file deletion; partner notification writes;
  privileged workflow triggers and third-party actions.

The complete actor/boundary/invariant model is in `THREAT-MODEL.md` beside this
report.

## 4. EXECUTIVE SUMMARY

- SEC-P0: 0
- SEC-P1: 5
- SEC-P2: 6
- SEC-P3: 2
- Informational: 6 evidence gaps/closure observations, not promoted to findings

Most serious vulnerability: a crafted legacy implicit callback could substitute
an attacker's valid session while the victim had any pending signup/recovery
window. The old callback did not require state, bind the expected identity, or
validate that the received token belonged to the intended account.

Most important systemic weakness: identity, ownership, rate and entitlement
facts crossed trusted boundaries as client-selected parameters in several
different subsystems. The fixes move each fact to a validated server/session or
current-account source and add an independent check at the mutation primitive.

Largest remaining uncertainty: repository SQL shows broad RLS and repaired
definer ACL coverage, but this campaign could not query effective production or
execute direct A→B PostgREST/RPC calls. This is a release blocker, not a claim
that production isolation is broken.

## 5. AUTHENTICATION FINDINGS

**DB-01, SEC-P1, confirmed.** The legacy implicit callback path accepted a
missing state during any pending flow, did not bind kind or expected email,
treated a JWT-shaped access token as sufficient identity, imposed the wrong JWT
shape on opaque refresh tokens, and ignored `setSession` failure. A same-device
app or crafted link could therefore cause account substitution during a real
auth window.

The fix creates 24 cryptographically random bytes in SecureStore, requires a
normalized expected email and an allowed flow kind, verifies write/readback,
serializes one-time consumption, rejects expiry/backward-clock conditions and
duplicate auth parameters, validates the access token with Supabase Auth
`getUser(access_token)`, requires exact expected email, checks `setSession`, and
re-reads the installed identity. OAuth initiation does not manufacture a
signup/recovery pending flow. Failure clears state and does not log tokens.

Re-attacks cover unsolicited, missing/forged/replayed/concurrent/stale states,
corrupt storage, clock rollback, wrong email, invalid access/opaque refresh
tokens, session-install failure and duplicate query/fragment parameters. The
remaining device risk is custom-scheme interception (§16/§37); the identity
binding prevents silent adoption but cannot make a custom scheme exclusive.

## 6. SESSION FINDINGS

Session restoration, refresh, logout and account switching converge on an
identity admission boundary. The incoming user is no longer published to app
state, navigation or Sentry until local ownership transition succeeds. Failure
queues sign-out outside the auth callback lock to avoid deadlock. `SIGNED_OUT`
does not erase the prior ownership marker before verified cleanup.

No normal logging path intentionally prints access tokens, refresh tokens,
authorization headers, OTPs or auth codes. Sentry now removes request headers,
cookies/query/body secrets, strips URL query/fragment, detects bearer/JWT/auth
parameters within strings, and drops an event if scrubbing itself fails. The
active Sentry user contains an opaque user ID only.

Local async/epoch and auth-latch suites passed. A physical-device race between
native auth callbacks, background refresh and OS process death remains required;
the campaign did not claim that Jest reproduces native scheduling exactly.

## 7. ACCOUNT ISOLATION

**DB-02, SEC-P1, confirmed.** Previously an auth event could publish B before a
failed or incomplete A wipe had been handled; cleanup catches continued, and
AsyncStorage/owner-marker results were not verified. The new transition guard:

1. reads the owner marker fail-closed;
2. writes and reads back the first owner;
3. permits the same owner without a destructive transition;
4. requires an explicit decision before A→B;
5. advances a transition epoch;
6. wipes and verifies SQLite;
7. wipes and verifies AsyncStorage;
8. writes and reads back B's marker; and
9. publishes B only after all checks pass.

“Keep A data” refuses admission; it never mixes stores. Failure leaves the
incoming identity unpublished and signs it out. Direct database dump/restore,
cloud row import and private-file operations also enforce current owner, so the
boundary is not dependent on RootNavigator alone. Memory/native residue and late
network responses need on-device synthetic A/B validation before release.

## 8. RLS

### Evidence limit

The following is the **source-intended cross-account matrix**, reconstructed from
the full migration set. Every public application table created by the assessed
schema is RLS-enabled in source or deliberately classified as global,
anonymous-insert-only, admin/service-only, or a view. No A/B JWTs or reachable
Supabase project were available, so “DENY” means the expected effective result
that must still be demonstrated. Production drift remains possible.

### Cross-account matrix

| Table disposition (all names explicit) | A SELECT B | A INSERT as B | A UPDATE B | A DELETE B | Source disposition |
|---|---:|---:|---:|---:|---|
| `users_profile`, `routines`, `programmes`, `mesocycles`, `workouts`, `volume_landmarks`, `weekly_volumes`, `personal_records`, `body_metrics`, `progress_photos`, `achievements`, `weekly_checkins`, `autoregulation_suggestions`, `morning_weights`, `coach_outputs`, `user_body_profile`, `exercise_user_notes`, `weekly_checkins_v2`, `user_insights`, `workout_notes`, `exercise_goals`, `user_prefs`, `custom_exercises`, `notification_preferences`, `daily_steps`, `cardio_log`, `plan_folders`, `meal_plans`, `perday_target_offsets`, `session_resolutions`, `effective_maintenance_memos`, `capability_constraints`, `session_constraint_effects`, `exercise_intent`, `exercise_swaps`, `exercise_slot_defaults`, `food_swaps` | DENY | DENY | DENY | DENY | Own-row policies; tier on `users_profile` additionally protected by trusted trigger/function paths |
| Child/derived ownership tables: `routine_exercises`, `mesocycle_weeks`, `workout_sets`, `planned_muscle_volume`, `adaptation_events`, `recipe_ingredients` | DENY | DENY | DENY | DENY | Ownership is direct or inherited/checked through the owning parent; foreign parent attachment must be in E2E matrix |
| Food/user records: `custom_foods`, `food_entries`, `saved_meals`, `recipes`, `food_favourites`, `daily_water`, `nutrition_targets` | DENY | DENY | DENY | DENY | Own-row management |
| Integrity/telemetry records: `daily_intake_rollups`, `ed_pattern_flags`, `engine_telemetry`, `consent_log` | DENY | DENY | DENY | DENY | Own-row verbs only; exact allowed own verbs vary by table and RPC |
| Read-only derived/authority records: `tier_history`, `food_frequents`, `engine_overrides` | DENY | DENY | DENY | DENY | Client may read its own row(s); server/definer/admin owns mutation |
| `device_push_tokens` | DENY | DENY | DENY | DENY | Full own-row CRUD; service role reads recipients for delivery |
| `partnerships` | DENY if A is not a member | DENY as B | DENY B | DENY B | Pair members can read; creation/teardown use bounded RPCs after later migrations |
| `partner_week_signals` | DENY if A is not a pair member | DENY as B | DENY B | DENY B | Pair read; sender ownership on writes |
| `partner_cheers` | DENY if A is not a pair member | DENY as B | DENY | DENY | Pair read; sender insert only; migration 155 additionally requires database UTC day |
| `partner_blocks` | DENY | DENY | DENY | DENY | Owner-only private partner block state |
| `partner_shared_blocks`, `partner_weekly_intentions`, `partner_win_cards` | DENY if A is not a pair member | DENY as B | DENY B | DENY B | Active pair membership plus creator/subject checks; teardown/revocation semantics require E2E |
| `debug_log_uploads`, `user_feedback` | DENY | DENY | DENY | DENY | Owner-scoped support/feedback rows; service review is privileged |
| `foods`, `exercises`, `pricing_config` | Global read, not B-private | DENY arbitrary client write | DENY | DENY | Authenticated/public catalog reads; trusted ingestion/admin writes |
| `scan_calibration_events` | DENY for every client | N/A: anonymous aggregate row has no user ID; authenticated INSERT allowed | DENY | DENY | Deliberately one-way, coarsened telemetry; service-only reads |
| `account_deletions_log` | DENY | DENY | DENY | DENY | Service audit/erasure evidence only; no user direct access |
| `marketing_admins`, `marketing_content`, `marketing_metrics`, `marketing_ledger`, `marketing_channels`, `marketing_email_log`, `marketing_email_optout`, `marketing_survey_responses`, `marketing_promo_codes` | DENY unless explicitly admin/service/public endpoint | DENY unless bounded public/admin path | DENY | DENY | Not ordinary user-owned app data; admin/service policies must remain isolated |
| `marketing_waitlist` | No private cross-user read | Bounded anonymous insert, no foreign `user_id` ownership contract | DENY | DENY | Public acquisition endpoint; minimize returned data and rate-limit externally |
| `private.trial_ledger`, `private.founder_pro_ledger`, `private.trial_salt` | DENY | DENY | DENY | DENY | Private schema; only narrowly granted definer functions may reach it |

`peak_week_plans` was created earlier and deliberately dropped in migration 049;
it is not an extant table. `engine_telemetry_daily` is a derived view, not a
client-owned write target. The E2E executor must include known UUID, filters,
upsert/on-conflict, bulk payloads, nested selects, foreign-parent attachment and
service-vs-user role checks for every row above.

## 9. RPC / SECURITY DEFINER

Migrations 152–154 record a previous live catalog audit and repairs: internal
helpers lost `PUBLIC`/client execute; explicit client RPC grants were rebuilt;
definers received fixed search paths; default privileges were changed so future
functions are not silently exposed. This campaign verified the migration source
and call graph, but did not independently query `pg_proc`, function owners or
effective ACLs.

Client-callable surface identified in source includes `delete_user_data`,
`clear_goal_lock`, `record_engine_telemetry`, `record_health_consent`,
`food_sync_pull`, `food_sync_push`, `food_library_pull`,
`current_pricing_window`, `start_cascade`, `upgrade_tier`,
`food_frequents_pull`, partner invite create/redeem/end operations,
`record_rpc_fallback_deletion`, and `record_partner_consent`. Parameter-taking
functions derive identity from `auth.uid()` or validate pair/current ownership;
client `upgrade_tier` rejects Pro/admin/payment reasons, while server-side store
verification uses the privileged grant path.

Internal workers, entitlement helpers, deletion helpers, cron functions and
trigger helpers are source-revoked from `PUBLIC`, `anon` and `authenticated`
unless explicitly needed. Required external proof: authenticated A invokes every
overload with B's UUID/object/pair, anon invokes every exported name, and a
read-only catalog capture compares owner, `prosecdef`, `proconfig`, ACL and
default ACL against migration 152.

## 10. IDOR / OBJECT OWNERSHIP

UUID secrecy is not used as authorization. Cloud object ownership is expected at
RLS/RPC/Edge; local restore and private-file primitives now independently bind
the active user. Source tracing covered programme/routine/routine-exercise,
mesocycle/week, workout/set/note, food/recipe/ingredient/meal, body/check-in,
coach output, photo metadata, capability constraints, session effects, partner
objects and subscription state.

The confirmed backup/file IDOR class is fixed (§13/§15). No additional confirmed
cloud IDOR is claimed without the direct A/B matrix. Highest-risk E2E probes are
foreign child attachment (`routine_exercises`, `workout_sets`,
`recipe_ingredients`), pair-scoped updates, duplicate/archive/activate operations,
and RPCs accepting an object ID without an explicit user ID.

## 11. ENTITLEMENT / SUBSCRIPTION

**DB-04, SEC-P1, confirmed.** The Play endpoint has to remain gateway
`--no-verify-jwt` for Google Pub/Sub OIDC, yet it also accepted client purchase
verification. Apple client verification relied on gateway enforcement. Neither
handler independently proved the Supabase caller was the store's authoritative
buyer.

Both client paths now validate the bearer with Supabase Auth and bound body
sizes/types/product allowlists. Google Play API remains authoritative and its
`obfuscatedExternalAccountId` must equal the caller. Apple server lookup remains
authoritative and `appAccountToken` must equal the caller. Identifiers inserted
into store API URLs are encoded. Replays remain idempotent at the entitlement
ledger/tier boundary. Local optimistic tier is UX state only and is reconciled
from cloud truth; client `upgrade_tier` cannot grant Pro.

Store sandbox replays under A and B, renewal/cancel/lapse/restore/duplicate
transaction tests and old-client purchase payloads remain external requirements.

## 12. SYNC

Sync payloads are treated as untrusted at local insertion paths through user-ID
arguments, cloud/local identity comparisons, per-table validation, tombstones,
timestamps and conflict rules. Campaign and existing suites cover foreign owner,
late sign-out, auth-gone, conflict, preference exclusions, body composition,
daily steps, custom exercise, progress-photo no-sync and malformed ownership
contracts.

The campaign did not establish a new cross-account sync vulnerability beyond the
account-transition and backup primitives already fixed. Unresolved external
coverage is a live A request resolving after B admission, corrupt/giant remote
batches, old protocol replay, server-returned invalid native values and storage
amplification. Direct writes in the RLS matrix are required because a modified
client can bypass the normal sync validators.

## 13. BACKUP / IMPORT

**DB-03, SEC-P1, confirmed.** Backup v1 could dump/restore all local rows and
preferences, trusted row owners and arbitrary photo/avatar paths, had no total or
per-table volume limits, and left an export cache file. The database primitive
also accepted unscoped dumps, so UI-only validation would not have fixed the
class.

Format v2 requires exact current owner, an allowlisted table set, owner equality
for every row, 25 MiB total, 250,000 rows total, 100,000 rows per table and
preference/value bounds. Authentication, tier/payment, deletion, sync, consent
and control preferences are never restored. Database dump and restore repeat the
owner check. Photo paths are canonical current-user generated paths; local custom
food file URIs are cleared; avatars accept only safe HTTPS or the exact current
owner path. Export is current-user-only and deletes plaintext cache in `finally`.

**DB-11, SEC-P2, confirmed.** CSV now checks declared and actual size before
reading/processing, rejects over 12 MiB, and fails instead of silently truncating
at 100,000 rows. Malformed rows remain subject to format/domain validation before
database mutation.

## 14. LOCAL DATABASE / ENCRYPTION

SQLCipher is enabled by Expo configuration. The key is generated by platform
cryptographic storage and kept in SecureStore; database code avoids logging it.
Existing tests cover encrypted/open state, missing/wrong key paths, migration,
retry and plaintext detection contracts.

There is a documented product-law exception for an already-existing plaintext
database when key access or migration fails. The code monitors rather than
destroying user data. This is an accepted device-local confidentiality risk, not
a silent new plaintext database path. Physical proof is still required for first
unlock, SQLCipher-unavailable builds, concurrent opens, WAL/sidecar pages,
interrupted swaps, device backups and actual file headers (§36/§37).

## 15. FILES / PHOTOS

**DB-08, SEC-P2, confirmed.** Progress-photo deletion used prefix matching,
avatar deletion accepted a caller-supplied URI, backup restored absolute paths,
and image sanitization fell back to copying raw bytes when manipulation failed.
This permitted deletion outside the intended owner filename grammar and could
retain EXIF/GPS or malformed bytes.

Progress paths now match only an exact current-user directory and numeric JPEG
filename; avatars match their exact generated owner filename. Unknown paths are
refused. Every private image is decoded and re-encoded to JPEG, then APP1/COM
metadata is removed; partial outputs are deleted and sanitization failure throws.
No raw fallback remains. Temporary/cache files are removed on failure/success.

Native decompression-bomb behavior, content-URI grants, backup exclusion and file
permissions require low-memory physical devices. The source fix limits trusted
paths and persistence, not native decoder allocation before re-encode.

## 16. DEEP LINKS

Auth URLs accept exact configured `volyume` auth origins/routes and bounded,
non-duplicate parameters; arbitrary nested URLs and malformed callback inputs do
not navigate or install a session. Authenticated application routes continue
through navigator auth/ownership/entitlement gates. The web callback redirect is
addressed separately in §26.

Android has HTTPS App Link configuration. iOS source has no Associated Domains,
so the legacy custom scheme can be claimed by another installed app. The new
nonce/email/token identity binding makes interception or injection fail closed,
but exclusivity requires HTTPS Universal Links, AASA and auth-template changes.
That migration is production configuration and device work, not applied here.

## 17. NATIVE BOUNDARIES

Existing suites exercise invalid dates/epochs, notification trigger values,
timer math, SVG/Skia/progress-scan inputs, image orientation and accessibility/UI
boundary values. Source searches found systematic finite/range guards around the
recent native reliability work. No new remotely or sync-reachable persistent
native crash was confirmed.

Jest cannot prove Swift/Kotlin/JSI behavior for `NaN`, infinities, enormous
dimensions, corrupted images, camera/OCR payloads, notification scheduling or
process restart loops. The remaining corpus is specified in §37. This area is
“investigate further,” not “proven safe.”

## 18. RESOURCE EXHAUSTION

Confirmed unbounded inputs fixed here are backup volume (25 MiB/row caps), CSV
volume (12 MiB/100k hard caps), Apple webhook/JWS bodies, purchase request fields,
partner UUID/body fields, and CoFID seed download (8 MiB plus exact hash). Image
sanitization fails closed and cleans partials.

No load testing was sent to production. Account-scale scenarios in the existing
suite cover large histories and bounded queries, but tens of thousands of cloud
objects, giant sync queues, enormous decoded image dimensions and repeated Edge
invocations still require an isolated staging profile with memory/CPU/write
metrics.

## 19. SERVER-SIDE ABUSE / RATE LIMITS

**DB-06, SEC-P2, confirmed.** A partner could vary client-controlled `sentOn` to
bypass the unique daily cheer key, including by direct PostgREST insert. The
Edge Function now ignores client date and stamps UTC; migration 155 makes the
database require its current UTC date, closing the direct-client path.

Purchase handlers now cap/validate requests and authenticate client verification;
the public Apple/Google webhook paths verify their platform assertions before
work. RPC allowlists and source-level ownership reduce amplification. Platform
gateway quotas, invite spam, telemetry volume, deletion frequency, cascade
frequency and search/storage quotas were not accessible. Verify rate contracts
in staging; do not DoS production.

## 20. PARTNER / SHARING

Partner functionality is reachable, so it was not dismissed as dead code.
Invite creation/redemption, self-acceptance, pair membership, shared blocks,
signals, weekly intentions, win cards, teardown and notification preference paths
were source-traced. RLS is pair/owner scoped and mutations use bounded RPC/Edge
paths. The confirmed cheer-rate bypass is fixed on branch with migration pending.

Required E2E attacks: guess/replay/redeem stale or revoked tokens; accept own or
another pair's invite; read each field as non-member; mutate after teardown;
reuse revoked cards; create orphan shared state; trigger push after opt-out; and
race pair ending with cheer/shared writes.

## 21. DELETION / EXPORT

Deletion authentication remains on JWT-verified functions/RPCs, and migrations
154/related source enumerate cascade coverage including workout notes. Local
deletion/wipe verification and fallback logging suites passed. The new account
transition guard refuses B admission if A cleanup cannot be verified.

Export now scopes every database row to the active owner and removes its
plaintext cache. Local photo/avatar ownership and deletion are exact. No
production deletion was attempted. Required staging proof: delete synthetic A,
replay request, call using B IDs, inspect every relation/storage object/audit row,
reinstall/sign back in, and verify only policy-permitted erasure telemetry remains.

## 22. PRIVACY / TELEMETRY

**DB-09, SEC-P2, confirmed.** Earlier key-based Sentry scrubbing could miss
credentials/email/health values embedded in free text, request metadata/query and
the Sentry user email. The hardened scrubber redacts emails, JWTs, bearer values,
auth query parameters and inline health-value patterns; removes request
headers/cookies/query/env; recursively scrubs request data; strips URL
query/fragment; uses ID-only user context; and sets `sendDefaultPii:false`.
Scrubber exceptions drop events rather than send unsanitized content.

Useful diagnostics such as error type, bounded non-sensitive context and opaque
IDs remain. Scan calibration telemetry is source-designed as authenticated
insert-only, day-level/coarsened and without user/photo/URI/note fields. A live
Sentry envelope inspection with synthetic secrets/health text is still required
before release.

## 23. SECRETS

Tracked file and history scans found environment examples and references to
secret names, but no committed service-role key, signing private key, Apple
private key, keystore, `.p12`, `.p8` or populated `.env`. Public Supabase client
configuration was not misclassified as a secret. No secret value is reproduced
here.

CI values are supplied through GitHub secrets; Edge privileged values through
Supabase secrets; local public configuration through environment files. Because
this environment did not have repository-host or secret-manager read access,
rotation age, environment scoping and audit logs remain external checks.

## 24. CI/CD / SUPPLY CHAIN

**DB-05, SEC-P1, high confidence.** The Android release workflow automatically
ran on `claude/**`, received signing/Sentry secrets and retained `contents: write`.
It now runs automatically only from `main` (or explicit manual dispatch), uses
`contents: read`, and no longer lets an arbitrary writable branch select the
privileged path.

**DB-12, SEC-P3, high confidence.** All third-party actions in all eleven
workflows are pinned to reviewed full commit SHAs with version comments instead
of mutable major tags. Deploy workflows remain manual/environment-gated. No
production workflow was dispatched and no artifact/store build was submitted.

Independent review must confirm branch protection, environment approvals,
fork-secret behavior, GitHub token defaults, EAS credential ownership, artifact
provenance and that the accepted SHA—not merely branch name—is what is deployed.

## 25. DEPENDENCIES

Web dependency remediation moved Next to `15.5.24`, Vitest to `3.2.7`, PostCSS
to `8.5.26` and overrides Vite `6.4.3`, Sharp `0.35.4`, patched brace-expansion
and `js-yaml 4.3.1`; web production/dev audit is now zero.

Root audit improved from 27 findings (15 high, 12 moderate) to 21 (9 high, 12
moderate), with zero critical. `nanoid` is `3.3.18`, above the fixed `3.3.16`
floor. Remaining findings trace predominantly through Expo 54/Metro development
tooling (`image-size`, `uuid` and related chains) plus `xlsx@0.18.5`. A forced
Expo 54→57/toolchain migration was rejected as disproportionate release risk for
this security branch; none of the remaining Metro vulnerabilities were shown
reachable by hostile mobile runtime input.

**DB-13, SEC-P3, high confidence.** `xlsx` has no patched npm release. It is used
only by the maintainer-run offline CoFID seed builder, never imported by mobile
runtime. The script now streams with an 8 MiB cap and requires the exact approved
government workbook SHA-256 before `XLSX.readFile`, including cached input. This
is accepted library risk with a tightly authenticated input, not a claim that the
package is fixed.

## 26. WEB SECURITY

**DB-10, SEC-P2, confirmed.** The auth callback trusted `next`, allowing an open
redirect. `safeRedirectPath` now accepts only a same-origin relative path, rejects
scheme-relative, absolute, control/backslash and malformed values, and falls back
to `/dashboard`. Eight focused redirect cases pass.

Next now emits CSP, HSTS, frame denial, MIME sniff prevention, strict referrer,
permissions and COOP headers. Typecheck, lint, production build and all 31 tests
pass; audit is zero. No dynamic HTML/raw script sink or secret client bundle was
confirmed. The build warns only that Next inferred workspace root because
multiple lockfiles exist; that is packaging clarity, not a confirmed security
issue. Live header/cookie/CORS behavior must be checked after staging deploy.

## 27. INPUT / INJECTION

Reusable hostile cases applied to auth, backup, CSV, images, Edge JSON/JWS and web
redirects include empty/whitespace/control/Unicode/very-long strings; URL/JSON/
HTML/JS/SQL-like fragments; duplicate fields/parameters; null/array/object swaps;
foreign UUIDs; invalid/negative/huge numeric/date values; clock rollback; malformed
JWTs; nested paths; and oversized payloads.

Supabase client queries use parameterized builders. Migration dynamic SQL is
confined to identifier/catalog loops, not raw client strings. Store path
identifiers are encoded. File paths use exact generated grammars. No SQL, shell,
header or HTML injection chain met the confirmed-finding standard. Remaining
direct PostgREST filters/RPC overloads and live web reflection belong in the
external matrix.

## 28. CRYPTOGRAPHY

The branch does not add custom cryptography. Auth callback nonces use
`expo-crypto` random bytes; Supabase validates JWT/session identity; SQLCipher and
SecureStore provide local encryption/key storage; platform store libraries/APIs
verify purchases and Apple signed data; SHA-256 authenticates the fixed CoFID
artifact. No hard-coded encryption key, predictable security token, insecure
password hash or custom IV/nonce construction was found.

The Apple verifier requires configured Apple root certificates, bundle,
environment and numeric app ID. Without them it fails closed. Certificate
rotation/configuration and physical SQLCipher inspection are external controls.

## 29. BUSINESS-LOGIC ABUSE

Meaningful confirmed abuse was concentrated in receipt-to-user binding, partner
cheer rate keys, restore ownership and privileged CI branch selection. Trial/tier
source separates optimistic UX from cloud authority; client Pro grants are
blocked; store identifiers bind buyer to session; consequential coach apply paths
already carry receipt/idempotency and current-target checks in the regression
suite.

No new unlimited coach/cascade/trial/plan abuse was confirmed under the evidence
standard. Staging should still measure repeated restore, invite, deletion,
cascade, telemetry and object-creation requests and verify quotas/idempotency
under old clients and clock manipulation.

## 30. CONFIRMED VULNERABILITY TABLE

| ID | Severity / confidence | Platform; attacker / preconditions | Impact; reproduction; root cause | Files/lines; fix; regression; status |
|---|---|---|---|---|
| DB-01 | SEC-P1 / CONFIRMED | iOS/Android auth; same-device/deep-link attacker during pending signup/recovery | Crafted callback with absent/substituted state and attacker tokens reached `setSession`; pending state lacked identity/kind binding and installed-session verification | `src/lib/authCallbackState.js:29`, `src/lib/authDeepLink.js:65`, `App.js`; nonce/email/kind/server identity binding; auth callback/deep-link suites; **VERIFIED** |
| DB-02 | SEC-P1 / CONFIRMED | iOS/Android local state; A data plus B sign-in/stale auth event and cleanup fault | Incoming B was published before verified A cleanup, allowing A residue in B lifecycle; catches continued and stores/marker were unverified | `src/lib/accountTransitionGuard.js:8`, `src/navigation/RootNavigator.js`, `src/lib/database.js:6557`; pre-admission serialized verified wipe; transition/cross-account/wipe suites; **VERIFIED** |
| DB-03 | SEC-P1 / CONFIRMED | Mobile backup/import; hostile file selected by authenticated user | Foreign-owner rows, control/tier prefs, arbitrary local URIs and resource exhaustion; v1 restored unbounded unscoped dump | `src/lib/dataBackup.js:21,247,330`, `src/lib/database.js:6907,6936`; v2 allowlists/owner/bounds/canonical paths/cache cleanup; backup-hostility suite; **VERIFIED** |
| DB-04 | SEC-P1 / CONFIRMED | Supabase Edge/store; internet/auth caller with a real receipt reference/token | Receipt could be routed toward a different account because handler did not independently bind validated Supabase caller to authoritative store buyer | `supabase/functions/app-store-verify/index.ts`, `supabase/functions/play-billing-rtdn/index.ts:403`; `auth.getUser` plus `appAccountToken`/`obfuscatedExternalAccountId` equality and allowlists; contract suites/Deno; **VERIFIED, DEPLOY PENDING** |
| DB-05 | SEC-P1 / HIGH | GitHub/Android release; actor able to push broad collaborator branch | Unaudited branch code could run with signing/Sentry secrets and write token | `.github/workflows/build-android.yml`; restrict automatic trigger to main/manual and contents read; workflow static review; **FIXED SECURITY BRANCH** |
| DB-06 | SEC-P2 / CONFIRMED | Partner Edge/PostgREST; authenticated active partner | Unlimited daily cheer/push attempts by varying `sent_on`; client chose database uniqueness key | `supabase/functions/partner-cheer/index.ts:129`, `supabase/migrate_155_partner_cheer_server_date.sql:21`; server UTC plus RLS UTC check; rate-boundary test/Deno; **VERIFIED, MIGRATION PENDING** |
| DB-07 | SEC-P2 / CONFIRMED | Public Apple webhook; internet caller | Forged outer JWS could trigger store lookup and constrained renewal/status side effects; payload was decoded without signature/chain/bundle verification | `supabase/functions/app-store-notifications/index.ts:45,115`; official `SignedDataVerifier`, roots/bundle/env/app ID, caps, fail-closed 401; contract/Deno; **VERIFIED, CONFIG/DEPLOY PENDING** |
| DB-08 | SEC-P2 / CONFIRMED | Mobile private files; hostile backup/image/URI | Unintended app-private file deletion and EXIF/GPS/malformed bytes persistence; prefix paths and raw-copy fallback | `src/lib/progressPhotos.js:230,347`, `src/lib/profileAvatar.js:14`; exact owner names, re-encode/strip, cleanup/fail closed; private-file/EXIF/wipe suites; **VERIFIED** |
| DB-09 | SEC-P2 / CONFIRMED | Mobile Sentry; error/request includes credentials or health text | Token/email/health PII could leave device in strings/request metadata/user context; old scrub depended mainly on key names | `src/lib/observability/sentryScrub.js:211`, `src/lib/sentry.js:92,116,150`; recursive string/request/url scrub, ID-only user, PII off, fail closed; scrub suites; **VERIFIED** |
| DB-10 | SEC-P2 / CONFIRMED | Web auth callback/browser; attacker controls `next` | Open redirect/phishing and weak browser containment; redirect target unchecked and headers absent | `web/apps/web/src/lib/safeRedirect.ts:2`, callback route, `next.config.mjs:6`; relative same-origin redirect and security headers/dependency updates; 31 tests/build/audit; **VERIFIED** |
| DB-11 | SEC-P2 / CONFIRMED | Mobile CSV import; hostile selected file | Memory/process exhaustion and silent partial import; whole file read before a byte bound and 100k parser cap truncated | `src/lib/importExternal.js:80,83`; declared/actual 12 MiB pre-read and hard row failure; import hostility test; **VERIFIED** |
| DB-12 | SEC-P3 / HIGH | GitHub Actions; compromised/moved upstream mutable tag | Workflow code could change without repository review, including secret-bearing jobs | `.github/workflows/*.yml`; every action pinned to full reviewed SHA; static workflow review; **FIXED SECURITY BRANCH** |
| DB-13 | SEC-P3 / HIGH | Maintainer-only CoFID seed build; compromised/mutable workbook input | Vulnerable XLSX parser or poisoned generated food seed; unbounded unauthenticated workbook reached `xlsx@0.18.5` | `scripts/seed/buildCofidSnapshot.js`; 8 MiB streaming cap plus exact approved SHA before parse; 19 tests; **VERIFIED / ACCEPTED LIBRARY RISK** |

The more detailed working ledger is `VULNERABILITY-LEDGER.md` beside this report.

## 31. FIXES IMPLEMENTED ON SECURITY BRANCH

- Authentication/session: atomic flow nonce, kind/email binding, Auth-server
  identity validation, correct opaque refresh-token handling, installed-session
  verification, exact callback origins/parameters.
- Account ownership: serialized pre-admission A→B guard, verified SQLite and
  AsyncStorage wipes, owner-marker readback, fail-closed sign-out.
- Data/file/privacy: backup v2 allowlists/owner/resource limits, independently
  scoped DB primitives, canonical media paths, JPEG re-encode/metadata stripping,
  cache cleanup, expanded Sentry redaction.
- Trusted services: validated Supabase caller/store buyer binding, Apple signed
  notification verification, bounded payloads and product allowlists, server UTC
  cheer limit plus pending RLS migration.
- Web: safe callback redirect, security headers, patched dependency graph.
- Supply chain: privileged workflow trigger/permission restriction, immutable
  action pins, patched Nanoid/PostCSS lock state, authenticated bounded CoFID
  workbook input.
- Resource limits: bounded backup, CSV, webhook, identifier and seed inputs.

Implementation commits:

1. `4fa27234` — `security: bind auth callbacks and account transitions`
2. `dd80ee8b` — `security: isolate backups files and telemetry`
3. `bda8323a` — `security: harden trusted services and release supply chain`

## 32. SECURITY TESTS ADDED

- Auth callback abuse: missing/forged/replayed/concurrent/stale flow, kind/email,
  storage faults, backward clock, token/session validation, duplicate parameters.
- Account transition: first/same/switch/refuse paths, wipe/readback faults,
  serialized races and marker integrity.
- Backup/import: version/owner/table/pref/row/value/size limits, foreign rows,
  canonical paths, cache cleanup and CSV hard caps.
- Private images: exact per-owner paths, deletion refusal, EXIF/COM stripping,
  sanitizer failure and partial cleanup.
- Telemetry: inline email/JWT/bearer/auth/health redaction, request metadata and
  fail-closed hooks.
- Edge contracts: bearer validation, store-buyer binding, product/body bounds,
  Apple signed-notification verifier and partner UTC boundary.
- Web: eight safe-redirect attacks plus existing web behavior suite.
- Supply chain: patched Nanoid floor and CoFID size/hash/cache tests.

Critical tests are behavioral where the runtime is available. Workflow/RLS
source checks are not substitutes for effective GitHub/Supabase execution and
are explicitly handed off.

## 33. FULL TEST RESULTS

| Gate | Result |
|---|---|
| Root clean install | PASS with repository npm `10.9.4`, `npm ci --legacy-peer-deps --ignore-scripts` |
| Root TypeScript/typecheck | PASS |
| Root lint | PASS |
| Import graph checker | PASS, 1,667 JS/TS source files |
| Full Jest baseline | 1 failed, 1 skipped, 1,076 passed suites; only pre-existing `todayTruthRepair.guard` |
| Full Jest after fixes | 1 failed, 1 skipped, 1,079 passed suites; 1 failed, 13 skipped, 14,747 passed tests; same unchanged copy guard only |
| Security focused suites | PASS, including auth, transition, backup/import, files, Sentry, purchase/webhook, cheer and CoFID suites |
| Expo Doctor | PASS, 18/18 checks |
| Expo Android export | PASS, Hermes bytecode generated; temporary export removed |
| Expo iOS export | PASS, Hermes bytecode generated; temporary export removed |
| Changed Edge Functions | PASS `deno check` for `app-store-notifications`, `app-store-verify`, `play-billing-rtdn`, `partner-cheer` |
| Web typecheck / lint / production build | PASS / PASS / PASS |
| Web tests | PASS, 4 files / 31 tests |
| Root dependency audit | 21 total: 9 high, 12 moderate, 0 critical; down from 27 |
| Web dependency audit | PASS, 0 vulnerabilities |
| Secret scan | No committed secret value or signing/private-key artifact established |

Expo exports emitted the existing React Native `promiseRejectionTracking`
export warning. Next emitted a multiple-lockfile workspace-root inference warning.
Neither caused a build failure or met the security finding standard.

## 34. PRODUCTION CHANGES THAT WILL EVENTUALLY BE REQUIRED

**Do not apply any item from this section until merge/re-audit authorization.**

| Change | Reason | Migration/configuration | Risk | Verification plan |
|---|---|---|---|---|
| Apply migration 155 | Close direct PostgREST cheer-date bypass | `supabase/migrate_155_partner_cheer_server_date.sql` | A UTC-boundary/client compatibility error could reject legitimate cheer | Apply in staging; old/new client same-day, midnight, replay and direct foreign-date tests; catalog/policy capture; then controlled production migration |
| Deploy `partner-cheer` | Server stamps date and bounds IDs/body | Deploy matching Edge function with JWT verification on | Function/migration ordering can temporarily reject or preserve bypass | Migration first, deploy function, synthetic pair send/replay/opt-out/push tests, logs without PII |
| Deploy purchase functions | Enforce caller-to-buyer binding and input bounds | `app-store-verify`; `play-billing-rtdn` remains `--no-verify-jwt` for Google webhook but validates client bearer internally | Old purchases without buyer ID will fail closed; misconfigured store credentials disrupt grants | Apple/Google sandbox A/B purchase, restore, replay, cancel/lapse; prove mismatched buyer denied and real buyer granted |
| Deploy Apple notification verifier | Reject forged App Store notification JWS | `app-store-notifications --no-verify-jwt`; configure base64 DER Apple roots, exact bundle/environment and numeric Apple app ID | Bad root/environment/app ID rejects legitimate notifications | Apple sandbox signed fixture and live sandbox notification; forged/tampered/wrong bundle/env/cert tests; observe 2xx/401 and no unintended tier change |
| Move iOS auth to Universal Links | Remove custom-scheme ownership ambiguity | Host AASA, add Associated Domains, add HTTPS redirect allowlist, update Supabase email templates to HTTPS/token-hash, preserve bounded compatibility window | Broken verification/recovery links or old-app lockout | Staging real email flows on installed/not-installed iOS, malicious competing scheme app, old/new versions, rollback redirect |
| Validate/deploy web headers/deps | Make local web hardening effective | Publish accepted web artifact from exact SHA | CSP may block required assets/analytics; HSTS scope error | Staging browser smoke, CSP report review, headers/cookies/CORS/open-redirect probes, exact artifact attestation |
| Confirm RLS/RPC/default ACL | Resolve the largest evidence gap | Read-only catalog audit and isolated two-user matrix; remediate only with separately reviewed migration if drift exists | Incorrect ACL migration could deny service/client work or expose data | Snapshot catalog, test all A/B operations/overloads, diff expected, peer review, canary and rollback |

## 35. FALSE POSITIVES / PROVEN-SAFE AREAS

- A public Supabase anon/client key is not a leaked service secret by itself; no
  privileged key was established in repository/history.
- UUID knowledge alone did not bypass local ownership checks after fixes; cloud
  claims remain pending direct E2E rather than being reported as vulnerabilities.
- Client `tier=pro` is not authoritative: database functions/triggers and store
  verification own persistent entitlement; local optimistic state is reconciled.
- Google Play RTDN's gateway `--no-verify-jwt` is required for Pub/Sub; the defect
  was multiplexing client verification without independent bearer/buyer binding,
  now fixed inside the handler.
- Apple notification endpoint must be public to Apple; verified signed data, not
  a Supabase JWT, is the correct trust assertion.
- `scan_calibration_events` is intentionally client-insert-only, coarsened and
  unreadable to clients; no user/photo/URI/note field exists in its schema.
- `xlsx` is not in the mobile runtime import graph. Its residual risk is confined
  to a maintainer seed command with exact artifact authentication.
- The unchanged “weeks running” Jest failure is product-copy drift present at
  baseline, not introduced or hidden by security work.

## 36. ACCEPTED RISKS

- Existing plaintext local database: on key/migration failure, product law favors
  monitored preservation over destructive conversion. Accept only with explicit
  owner acknowledgment and physical-device evidence; new databases must remain
  encrypted.
- `xlsx@0.18.5`: accepted temporarily because no patched npm release exists, the
  parser is offline-only, input is capped and exact-hash pinned, and mobile never
  imports it. Replace the builder/parser when a compatible maintained path exists.
- Expo 54/Metro audit findings: no hostile runtime call path was established;
  forced Expo 57 migration would be a broad compatibility change. Track and
  remove via planned Expo upgrade, while build inputs/actions remain trusted.
- Temporary custom-scheme auth compatibility: identity binding prevents silent
  wrong-account adoption, but scheme exclusivity is impossible. Accept only until
  Universal Links are deployed and exercised.

## 37. REMAINING DEVICE TESTS

- iOS and Android: competing custom-scheme app, legitimate/forged/replayed auth
  callbacks, two auth methods racing, process death and clock rollback.
- Physical A→B: every local domain, active workout, Zustand/memory/navigation,
  notifications/background work and late A requests under injected wipe faults.
- SQLCipher: file/WAL headers, first-unlock/key unavailable/wrong key, concurrent
  opens, interrupted conversion/swap, OS/cloud backup extraction and restore.
- Photos: corrupt/wrong MIME/content URI, EXIF/GPS, decompression bombs/extreme
  dimensions on low-memory devices, temp/cache permissions, share/export/delete.
- Native fuzz: NaN/infinities/extreme epochs/dimensions/arrays/strings through
  notifications, Live Activities, timers, Reanimated, Skia/SVG, camera/OCR/
  barcode, accelerometer and custom Swift/Kotlin modules; verify no crash loop.
- Store sandbox on real devices: A receipt under B, restore/replay/duplicate,
  cancellation/lapse/offline and old-app payload compatibility.

## 38. REMAINING EXTERNAL TESTS

- Isolated Supabase project with two synthetic users: execute every row in §8 by
  direct PostgREST, including upsert/on-conflict/bulk/nested/foreign-parent cases.
- Export effective production **read-only** `pg_proc`, owners, `prosecdef`,
  search paths, table/function ACLs, policies and default ACLs; compare migrations
  152–155 without invoking data-bearing operations.
- Invoke every callable RPC/overload as anon/A with B's IDs; verify no data,
  mutation, timing oracle, global side effect or entitlement disclosure.
- Stage migration 155 and four changed Edge Functions; run forged/oversized/
  replayed Apple, Google and partner requests plus platform sandbox positives.
- Review Supabase/Auth/Edge rate configuration and safely measure invite,
  telemetry, deletion, cascade, search/upload and object-spam behavior in staging.
- Stage web deployment and inspect actual CSP/HSTS/cookies/CORS/redirects/bundle.
- Review GitHub branch protection, environment approvals, secret scoping/audit
  logs, EAS/store credential custody and artifact provenance.
- Live Sentry envelope inspection using synthetic secrets/PII only.

## 39. FINAL MERGE PLAN

1. Wait for the concurrent independent QA re-audit to name its accepted main
   SHA; do not move that target or merge this branch directly.
2. Create a disposable integration branch/worktree from that exact accepted SHA.
3. Rebase the complete security branch, or cherry-pick the contiguous range after
   baseline `ec37a32f` through the branch tip. Do not select only the three code
   commits: the following report/hygiene commits are part of the handoff. Resolve
   auth/navigation/database/web/lockfile/workflow conflicts by preserving both
   accepted QA behavior and the security invariants.
4. Review the complete integration diff and rerun every gate in §33, then all
   device tests in §37 and isolated external tests in §38.
5. Obtain an independent security re-audit of the integrated SHA. Any RLS/RPC
   remediation becomes a separate reviewed migration; do not edit history to hide
   drift.
6. Merge only the independently accepted integration SHA under branch protection.
7. Stage production work in §34 with explicit approvals, backups/rollback and
   observability. Apply database/function/config/web/app changes in verified
   dependency order; never deploy merely because the branch was merged.

## 40. INDEPENDENT SECURITY RE-AUDIT HANDOFF

Attack the fixes, not just their happy paths. Highest-value targets:

1. During a legitimate signup/recovery window, race two callbacks, substitute a
   valid A token for expected B, kill the app between SecureStore operations, roll
   the clock back, and make `setSession` partially fail.
2. Force every SQLite/AsyncStorage/marker failure while A→B, then deliver late A
   auth/sync/network responses. Prove B is never published beside A data.
3. Use direct A JWT requests against every §8 table and every §9 RPC with B UUIDs,
   foreign parents, bulk upserts and overload confusion. Inspect effective ACLs,
   not migration intent.
4. Replay a legitimate Apple/Google purchase under the wrong Supabase user; omit,
   mutate and duplicate buyer IDs; forge/tamper the outer Apple notification JWS.
5. Bypass `partner-cheer` through direct PostgREST, old clients, UTC boundaries,
   concurrent requests and ended pairs after migration 155 is staged.
6. Import foreign-owner/oversized/duplicate/nested/path-hostile backups and CSVs;
   call the underlying DB/file primitives directly so UI validation is irrelevant.
7. Feed corrupt/huge images and verify no raw bytes, metadata, partial output or
   arbitrary deletion survives; inspect actual device storage and backups.
8. Verify Sentry with synthetic JWT/email/health values in exceptions,
   breadcrumbs, URLs, headers, cookies and bodies; inspect the transmitted
   envelope.
9. Attempt to recover release secrets or produce a signed artifact from an
   untrusted ref/action/artifact; verify exact-SHA provenance and environment
   approvals.

Begin from implementation SHA `bda8323a6ff5c3e3431da6ebefacc8a6c67a9454`
plus the report commit, compare against the separately accepted main SHA, and
treat every source-expected RLS/RPC result as unproven until the direct matrix
passes.
