# Daybreak Blue threat model

Date: 2026-08-28
Baseline: `ec37a32f7e4c39fd94264b260f15e179679abc14`
Branch: `security/daybreak-blue-2026-08-28`

## Scope and evidence boundary

This model was rebuilt from the current mobile, web, Supabase, migration,
native-module and workflow sources. The assessment had no production Supabase
credentials, database connection, synthetic E2E accounts or attached device.
Production conclusions are therefore source/history evidence unless explicitly
recorded by migrations 152–154 as live measurements. No production request,
write, migration, deployment, build submission or secret change was made.

## Actors

| Actor | Capability used in tests | Primary objective |
|---|---|---|
| Unauthenticated internet user | Calls public web routes and no-JWT webhooks; sends arbitrary URLs/bodies | Session adoption, webhook abuse, resource exhaustion |
| Ordinary authenticated user | Uses supported UI/API | Accidental cross-account access or unsafe mutation |
| Malicious authenticated user | Sends direct PostgREST/RPC/Edge requests and names foreign UUIDs | IDOR, entitlement, notification or database abuse |
| User controlling their client/device | Alters local state, clock, requests, SecureStore/AsyncStorage and files | Bypass UI gates, replay, corrupt sync/backup |
| Malicious same-device app | Claims custom URL schemes and launches crafted `volyume://` links | OAuth/token substitution and navigation abuse |
| Deep-link attacker | Controls path, query, fragment, duplicate params and timing | Session adoption, open redirect, route bypass |
| Import/backup attacker | Supplies arbitrary JSON/CSV, URIs, owner IDs and volume | Cross-account restore, traversal, OOM/corruption |
| Own-account sync attacker | Writes malformed/old/large rows using an old or modified client | Crash, contamination, replay and integrity loss |
| Stale/compromised session | Resolves late across logout/account switch | Mutate or reveal the next account's state |
| Bot/automation | Repeats Edge/RPC/partner/telemetry actions | Cost, write and notification amplification |
| Known-UUID attacker | Knows another object's UUID | Read/update/delete/attach without ownership |
| Old-protocol attacker | Knows legacy callback, backup and Edge payload shapes | Bypass newer client validation |
| Repository collaborator/compromised developer token | Can push a branch or influence CI inputs | Exfiltrate signing/release secrets or produce an untrusted artifact |

## Assets

Authentication and refresh material; Supabase sessions; user identity/profile;
workouts, food records, notes, body metrics, capability/restriction and coaching
records; partner relationships; progress photos; SQLCipher database and key;
backups/snapshots; cloud rows; purchase receipts and Pro entitlement; internal,
definer and admin RPCs; service-role/API/signing credentials; EAS/store/Sentry
release credentials; build artifacts and migration state.

## Trust-boundary map

| Boundary | Entry points | Assets | Principal attacker | Failure impact |
|---|---|---|---|---|
| OS/browser → auth callback | `volyume://auth/*`, HTTPS callback, OAuth/OTP/implicit fragments | Session and account identity | Same-device/deep-link attacker | Session adoption/account substitution |
| Supabase Auth → app memory | auth events, refresh, restore, sign-out | Active identity, local stores, navigation | Stale session/race | A data visible or mutable during B lifecycle |
| App → PostgREST/RPC | direct tables, upsert, filters, client RPCs | All cloud user data and entitlement | Malicious authenticated user | Cross-account CRUD/privilege escalation |
| Edge ingress → service role/store APIs | purchase verification, Apple/Google webhook, partner cheer | Entitlement, pushes, service-role writes | Internet user/bot | Pro grant, downgrade, spam, amplification |
| Local file → restore/import | JSON backup, workout CSV, image/content URI | SQLite, preferences, photos, memory | File attacker | Cross-owner insert, traversal, corruption/OOM |
| Cloud sync → local state/native UI | pulls, late promises, old records | SQLite, Zustand, notifications/native modules | Own-account sync attacker/stale A request | Persistent crash, contamination, B mutation |
| JS → native | camera/image, notifications, timers, Skia/SVG, custom modules | Process stability, private media | Malformed local/synced value | Crash loop/allocation or metadata persistence |
| App private storage → OS/share target | SQLCipher, SecureStore, cache, share sheet, backup flags | Health data, photos, keys | Same-device app/backup recipient | Data disclosure or undeletable residue |
| Browser → web server | callback `next`, cookies, headers, route params | Web session and account pages | Internet user | Redirect phishing, XSS/clickjacking/session loss |
| GitHub → CI/EAS/store | push/dispatch triggers, third-party actions, secrets/artifacts | Signing keys, source maps, deployment tokens | Compromised contributor/action | Secret theft or unaudited signed release |

## Highest-risk attack chains

1. Crafted implicit callback during any pending flow → attacker tokens adopted.
2. Auth event for B published before verified removal of A's local state.
3. Foreign-owner backup/URI → restore into current SQLite → later arbitrary
   private-file deletion or disclosure.
4. Anonymous/client purchase verification → real receipt routed without caller
   binding → cross-account entitlement action.
5. Client-selected cheer date/direct table insert → unique daily limit bypass →
   notification spam.
6. Privileged branch push → workflow receives Android signing/Sentry secrets.

## Security invariants

- An auth callback is accepted only for a single, fresh, atomically consumed,
  kind-and-email-bound flow and an Auth-server-validated identity.
- No incoming account is published until prior ownership and both local stores
  have been verified; failure signs the incoming account out.
- Every cloud row or pair action is authorized at RLS/RPC/Edge, never by hidden
  UI or UUID secrecy.
- Store APIs are authoritative and their buyer identifier must equal the
  validated Supabase caller.
- Backup/import and private-file primitives independently enforce current owner,
  allowlisted shape, exact paths and hard resource bounds before mutation.
- Secrets/tokens/health details never leave through logs, Sentry or artifacts.
- Internal/definer functions are deny-by-default; new functions receive no
  client execution unless explicitly granted.
- Release secrets are available only to immutable, reviewed workflow code on
  explicitly trusted refs.

## Re-audit priorities

Use two fresh synthetic users against an isolated Supabase project to execute
the complete CRUD/RPC matrix in the campaign report; race callbacks and A→B
switches on real iOS/Android builds; verify SQLCipher and backup exclusion on
device; deploy migration 155 plus the changed Edge Functions only after their
secrets are configured; then replay forged Apple/Google/partner requests.
