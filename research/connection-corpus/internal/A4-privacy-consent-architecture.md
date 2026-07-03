# A4 — Data / Privacy / Consent Architecture a Connection Feature Must Extend

Internal, read-only research. VOLYUME connection-corpus phase. All claims below
are about our own codebase; every claim carries a `file:line` citation so the
synthesis session can verify without re-reading the whole tree. No design,
placement, or go/no-go call is made here — this is the seam map a later design
must fit into.

---

## 1. Summary of the shape

Volyume's privacy architecture is built around **one blanket, binary,
un-skippable consent** (Article 9 health-data processing), enforced at the
navigator level, backed by an append-only cloud audit log, cached locally for
offline-safe gating, and fail-closed on any read error. There is **no granular
consent system** — no per-feature opt-in ledger, no "share with this named
person" consent type. The one place Volyume already shares data **between two
named users** (the Training Partner feature, NEW-002) does not use the Article
9 consent machinery at all: it is its own additive schema, gated by RLS +
SECURITY DEFINER RPCs, with the privacy property enforced by a **source-level
allowlist test** that pins which columns may ever leave the device for a
partner-facing table. That test is the single most reusable artefact for a
future connection feature — see §7.

Everything the app shares outward (Sentry, the share-card, the partner
signals) follows the same underlying pattern: **derive, never transmit raw**,
and enforce the derivation at the narrowest possible seam (a scrub function, a
field allowlist, an RLS policy, a column-level GRANT) rather than trusting
caller discipline.

---

## 2. The Article 9 consent gate

### 2.1 Store state (three-state, not boolean)

`src/store/useAppStore.js:170-181`:

```
healthConsentChecked: false,
healthConsentGranted: () => set({ healthConsent: true, healthConsentChecked: true }),
healthConsent: null,
setHealthConsent: (value, checked = true) => set({ healthConsent: value, healthConsentChecked: checked }),
```

`healthConsent` is tri-state: `null` (unresolved / not yet checked), `true`
(granted), `false` (explicitly declined/withdrawn). This tri-state is load
bearing — see §2.3, the fail-closed rule turns on the difference between
`null` and `false`. Reset on sign-out at `src/store/useAppStore.js:481-482`
(`healthConsent: null, healthConsentChecked: false`), so every sign-in
re-resolves it.

### 2.2 Navigator gate (RootNavigator, single source of routing truth)

`src/navigation/RootNavigator.js:1391-1394`:

```js
const consentUnresolvedForNewUser = healthConsent == null && !firstRunComplete;
if (user && !user.isLocal && healthConsentChecked && (healthConsent === false || consentUnresolvedForNewUser)) {
  return <Article9ConsentStack />;
}
```

Routing priority (comment block at `src/navigation/RootNavigator.js:1341-1351`):
1. Not signed in → `WelcomeStack`
2. Signed in + consent missing/unresolved-for-a-new-user → `Article9ConsentStack`
   (blocks everything else)
3. Pro + first-run not done → `ProOnboardingStack`
4. Free + first-run not done → `FirstRunStack`
5. Both done → `MainTabs`

A **returning** user (`firstRunComplete === true`) whose consent read failed
transiently is NOT re-prompted (`consentUnresolvedForNewUser` requires
`!firstRunComplete`) — see the fail-closed rationale at
`src/navigation/RootNavigator.js:1379-1390`. A **new** user with an unresolved
read IS routed to the gate, because for them nothing has been recorded yet and
the trial cascade (which sets `tier='pro'`) is itself gated behind this
screen (`src/navigation/RootNavigator.js:1347-1348`).

There is also a blocking resolver for a freshly-signed-in cloud account
(`src/navigation/RootNavigator.js:1376-1378`): while `healthConsentChecked`
is still false, a brand-new Pro-path account holds on `SplashScreen` rather
than flashing into `FirstRunStack` (the free flow) before consent + the trial
grant land.

### 2.3 Fail-closed consent read (sign-in path)

`src/navigation/RootNavigator.js:1181-1223` — on `SIGNED_IN` /
`INITIAL_SESSION`, consent resolution order is: local `AsyncStorage` cache
first (`@volyume_health_consent_${uid}`), then a cloud read of
`users_profile.health_data_consent`. Critically, a **cloud read error** sets
`healthConsent` to **`null`**, not `false`
(`useAppStore.getState().setHealthConsent(null, true)` at both
`RootNavigator.js:1204` and `:1222`), with the comment explaining why: a
`false` would bounce an already-consented user back into the (un-skippable)
gate on a network blip. Only an **explicit decline** produces `false`.

### 2.4 Consent grant flow (client)

`src/screens/Article9ConsentScreen.js:50-164` (`handleContinue`):
1. Ensures a `users_profile` row exists (`:63-69`, upsert).
2. Calls `record_health_consent` RPC with `_granted: true`, app version,
   platform (`:70-74`).
3. **Cloud failure does not strand the user** — the local flag still
   proceeds; the record is queued for retry (`:81-98`, see §2.5).
4. Caches `AsyncStorage` key `@volyume_health_consent_${uid}` = `'true'`
   (`:99-101`).
5. Fires `article9_consent_recorded` telemetry (`:108-120`).
6. Starts the Pro trial cascade (`:126-138`) — the trial grant is gated
   behind consent.
7. Flips the store (`healthConsentGranted()`, `:139`) which is what makes
   `RootNavigator` re-render out of the gate.
8. Kicks a `syncAll` immediately (`:140-155`) because the sign-in restore
   was itself held behind this same consent flag (§4).

`CONSENT_VERSION = '2026-06-06'` (`Article9ConsentScreen.js:35`) is pinned
into the audit trail explicitly so a regulator can see *which* consent copy
version a user accepted, not just the app build number.

### 2.5 Pending-consent retry queue

`src/lib/consent/pendingConsent.js` (whole file, 65 lines) — a tiny
AsyncStorage-backed single-slot queue (`PENDING_KEY =
'pendingHealthConsent.v1'`, line 18). `queuePendingConsent` (`:21-27`) is
called when the RPC round-trip fails at consent-grant time. `flushPendingConsent`
(`:40-65`) retries the `record_health_consent` RPC on every sync pass
(wired into the sync runner — see §4). This exists so a user who consented
offline is not silently missing from the compliance audit trail once
connectivity returns.

### 2.6 Consent revocation = full account deletion (no partial revoke)

There is **no "turn off health data but keep using the app"** path.
`src/hooks/useAccountActions.js:345-356` documents why: withdrawing Article 9
consent removes the lawful basis to keep processing the data at all, so
`handleWithdrawConsent` (`:357-438`) is two confirmation dialogues that both
lead into the **same delete-account pipeline** (`performDeleteAccount`,
`:423`), tagged with `reason: 'consent_withdrawal'` for the funnel dashboard.
The UI surfacing this is `src/screens/SettingsPrivacyScreen.js:43-54`
("Granted. Tap to withdraw at any time." / on tap → `handleWithdrawConsent`).

This matters for a connection feature: **there is no mechanism today for a
user to revoke only "sharing with people" while keeping their own account**.
Any future consent surface that wants a narrower revoke (e.g. "stop sharing
with partners" without deleting the account) is new ground — the existing
precedent (Partner unpair, §7) handles this at the **feature** level (end the
partnership; delete the shared rows) rather than through the Article 9
consent machinery, and does not write a `consent_log` row today (see §6).

### 2.7 Cloud schema for consent

`supabase/migrate_019_health_consent.sql`:
- `users_profile.health_data_consent` (nullable boolean) +
  `.health_data_consent_at` (timestamptz) — added `:22-24`. Null = never
  seen the screen; the existence of a value, not just its truthiness, is
  the "has been through the gate" signal (`:14-19`).
- `consent_log` (append-only audit table) — `:34-42`. Composite handling:
  simple `id` PK at creation, upgraded to composite `(user_id, id)` in
  `supabase/migrate_024_consent_log_composite_pk.sql` per the identity
  rules (§8). **`consent_type` is a CHECK-constrained enum: `'health_data'`,
  `'marketing'`, `'analytics'` ONLY** (`migrate_019_health_consent.sql:37`).
  There is no `'partner_sharing'` or equivalent value today — widening this
  enum is an additive, reviewed migration a connection-consent design would
  need, not a given.
- RLS: users read/insert only their own rows; **no UPDATE or DELETE
  policies** (`:46-61`) — the audit trail is genuinely append-only; rows
  leave only via the `ON DELETE CASCADE` FK to `auth.users` on account
  deletion.
- `record_health_consent(_granted, _app_version, _platform)` RPC
  (`:88-115`) is the single entry point: updates `users_profile` +
  appends to `consent_log` in one transaction. `SECURITY DEFINER`.

Locked spec: `docs/PRIVACY_CONSENT_LOCKED.md:255-284` ("Implementation notes
for the engineer") states this is the single entry point for writes and that
the client gates progression on the **local** flag, not cloud success
(`:269-275`) — matching §2.4 above.

---

## 3. Share-card field-list enforcement

The share-card (`src/screens/ShareCardScreen.js`) is the one place Volyume
already renders a user-chosen artefact for **external** (non-Volyume-user)
consumption — Instagram/Facebook Stories, gallery save, PDF. It draws PR
cards, session cards, milestone cards and a weekly-recap card through one
Skia renderer (`src/lib/shareCard/drawShareCard.js`) shared by preview and
export, so "what you see is what you share"
(`src/screens/ShareCardScreen.js:4-8`).

### 3.1 The exact allowed/blocked field-list (as shown to the user)

Two privacy-note strings are rendered directly in the toggle UI, gated on
card type:

`src/screens/ShareCardScreen.js:476-480`:
```js
<Text style={styles.privacyNote}>
  {isWeekly
    ? 'Only this week's progress, lifts and sessions are shown. Your measurements and private notes are never included.'
    : 'Name, bodyweight, measurements and private notes are never included.'}
</Text>
```

- **Session / PR / milestone cards** (`isWeekly === false`): the hard-blocked
  set stated to the user is **name, bodyweight, measurements, private
  notes**. Cross-checking the actual param builder
  (`ShareCardScreen.js:152-213`, `buildParams`) confirms none of those fields
  exist anywhere in the `session`, `pr`, or `milestone` param shapes — there
  is no `name`/`bodyweight`/`measurements`/`notes` key in any of the three
  branches at all, so the UI copy matches the code by absence, not by a
  runtime strip step.
- **Weekly recap card** (`isWeekly === true`): the same "measurements and
  private notes" block applies, but this card type is the one **exception**
  to "no numbers": it is allowed to show a **derived weekly weight-change
  delta** (never absolute bodyweight) — see §3.2.

### 3.2 What toggles exist (opt-in inclusion, per card type)

`src/screens/ShareCardScreen.js:452-475` — the "What to include" toggles,
scoped per `cardType`:
- Always: `showDate` (`:453`).
- Session: `showPlanName`, `showVolume` ("Total weight lifted", i.e. tonnage
  — a training metric, not a body metric), `showExercises` (`:454-459`).
- PR: `showPRWeight`, `showPrevBest` (`:461-466`) — lift weights, not body
  weight.
- Weekly (only when `!suppress`): `showProgress` (the weight-progress hero),
  `showBestLift` (`:467-474`).

### 3.3 The ED-safety `suppress` override (hard force-strip, not a toggle)

`src/screens/ShareCardScreen.js:65-67` — the screen receives a `suppress`
prop set by the caller (`CoachOutputScreen`) "when an ED-pattern flag is open
OR calm mode is active: all weight/progress language is stripped from the
recap card." This is enforced inside the pure param builder, not just hidden
in the UI:

`src/lib/shareCard/greatWeek.js:107-116` (`buildWeeklyRecapParams`):
```js
const showProgress = hasWeight && onTarget && isCut && lostWeight && !suppress && includeProgress;
let bestLiftBlock = suppress ? null : (bestLift || null);
```
— `suppress` is AND-ed into the gate so a caller cannot accidentally leave a
weight number on the card by mis-wiring a toggle; the safety flag wins
regardless of user preference. `isGreatWeek` itself (`greatWeek.js:40-65`)
refuses to offer the "share your week" prompt at all while any ED-safety
signal is open (`safetyClear`, `:32-34`), so a flagged week never reaches the
share screen in the first place — `suppress` is defence-in-depth for the
narrow case where the flag opens *after* the prompt was already offered.

### 3.4 The one place a real number crosses: the weekly recap's derived delta

`src/lib/shareCard/greatWeek.js:98-119` — the weekly card's hero can show
**"weight lost this week: 0.7 kg — right on target"**. This is founder-decided
(`:9-19`, "SUPERSEDES the earlier qualitative-only weight call") and is
narrowly scoped: only a **relative weekly delta**, only on a cut goal, only
when the week was on-target and safety-clear, never absolute bodyweight,
never off-target/overshoot weeks (`isGreatWeek` never fires for those). This
is the same "derive, don't transmit raw" pattern as the Partner signals (§7):
the thing shared is a change-over-a-bounded-window, gated by the same safety
signals as the coaching engine, never a raw stored value.

---

## 4. Sync layer's privacy seams

### 4.1 The Article 9 fail-closed gate in the sync runner

`src/lib/sync/runner.js:97-114`:
```js
// F2 (audit SC-1): Article 9 fail-closed gate. Health-domain tables must
// never move for a session whose consent is unresolved (null) or denied
// (false).
if (userId) {
  let healthConsent = null;
  try {
    healthConsent = require('../../store/useAppStore').default.getState()?.healthConsent;
  } catch (_) { healthConsent = null; }
  if (healthConsent !== true) {
    return { status: 'skipped', reason: 'health_consent_unresolved' };
  }
}
```
This is a **second, independent enforcement point** of the same gate the
navigator enforces (`RootNavigator.js:1391-1394`) — belt-and-braces so a sync
trigger firing from anywhere (foreground, periodic, notification-tap) cannot
move health-domain data for an unconsented session even if a navigation-layer
bug ever let the UI itself proceed. Any new sync table (including a future
connection surface) rides through this same runner and inherits the gate for
free — it does not need its own consent check as long as it goes through
`syncAll`/the registry.

Immediately after (`runner.js:137-144`), the runner also flushes
`pendingConsent` (§2.5) on every sync pass, independent of table sync
success/failure.

### 4.2 RLS is the only place cross-user reads are allowed

Every table pattern in this codebase is either (a) strictly user-scoped
(`auth.uid() = user_id`, the default per `docs/rules/supabase.md:7-25`, which
states "if you create a table without RLS you have created a data breach")
or (b) explicitly **pair-scoped** via a join through a lifecycle table whose
membership is itself RLS-checked — this second shape exists today ONLY for
partnerships (§7). There is no "share with a group" or "share with anyone
who has my code" shape anywhere in the schema; the only precedent for
cross-user visibility is the two-person, mutually-accepted pairing model.

### 4.3 Sync registry vs. legacy path (relevant to where a connection feature would live)

Per `CLAUDE.md`'s architecture section, the sync layer is being migrated
table-by-table from a legacy `src/lib/sync.js` into the registry-driven engine
(`src/lib/sync/registry.js`, `transport.js`, `runner.js`, `tables/`). The
Partner feature is fully on the new registry path
(`src/lib/sync/tables/partners.js`) and is the **only pair-scoped entry** in
that registry — every other registered table pulls/pushes rows scoped to "my
own user_id" only. `src/lib/sync/tables/partners.js:1-19` documents the shape
explicitly: pull returns "rows in my active pairs, including my partner's";
push sends only "my own derived week signals... for active pairs." A
connection feature needs this same pair/group-scoped registry shape, not the
single-user shape every other table uses.

### 4.4 Sentry scrubbing as a privacy seam any new domain must extend

`src/lib/observability/sentryScrub.js` is the single source of truth for
what leaves the device via crash reporting (imported by `src/lib/sentry.js`
per the file's own header, `:20-22`). Locked patterns
(`sentryScrub.js:37-99`) redact by **key name regex** (`weight*`, `kcal*`,
`protein*`, `bf_pct`, `ffm*`, PII fields like `email`/`firstName`/`dob`, body
measurement fields `waist`/`chest`/`hips`, and the entire ED-pattern surface
`ed_pattern*`/`signals*`) and by **value substring** (`weight_log`,
`food_entries`, `ed_pattern_flags`, `health_data_consent`, etc. —
`sentryScrub.js:108-116`). `event.user` is truncated to `{ id }` only,
dropping email/username/IP automatically (`:197-199`). A future connection
feature that introduces new sensitive field names (e.g. a partner's name,
an invite email) would need this pattern list extended — nothing here
currently redacts an arbitrary "partner display name" key, because the
Partner feature carries no such field today (§7 — signals are numeric/derived
only, so nothing sensitive-shaped was ever added here for it).

### 4.5 Cloud residency posture ("EU-Dublin")

The Supabase backend is a single EU-region project, referred to
project-wide as "EU-Dublin" (per `CLAUDE.md`'s architecture section: "EU
data residency is absolute — all user data stays in Dublin"). This is
reinforced in the locked privacy doc: `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`
frames every table rule (composite PKs, RLS, ownership) around this one
project, and `docs/PRIVACY_CONSENT_LOCKED.md`'s regulatory table (`:6-14`)
grounds the lawful bases (UK/EU GDPR Article 6(1)(b) + Article 9(2)(a)) on
that single-region posture, naming Supabase as "database + auth" sub-processor
with data staying in-region (`:87-89`, sub-processor list `:167-174`). No
code path in the sync layer, the partner tables, or the share-card renderer
introduces a second data residency (there is no non-Dublin table, queue,
function, or third-party store anywhere in the reviewed surfaces) — a
connection feature inherits this for free as long as it stays inside the
existing Supabase project and does not call out to any new subprocessor
(CLAUDE.md's "never add dependencies without asking" rule would gate that
regardless).

---

## 5. Identity/ownership constraints a connection feature must respect

`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` is the hard-locked doc governing
anything that writes a `user_id` column (`:6-9`). The rules most relevant to
a cross-user surface:

- **Composite primary keys** (`:32-35`, `:147-152`): every user-scoped table
  is `PRIMARY KEY (user_id, id)` so two users cannot collide at the schema
  level. The Partner tables follow a variant of this for pair-scoped rows:
  `partner_week_signals` uses `PRIMARY KEY (pair_id, user_id, week_start)`
  (`supabase/migrate_081_training_partners.sql:125`) — the pair, not just the
  user, is part of the identity.
- **No anonymous mode, ever** (`:25-28`) — every connection feature user is a
  real, authenticated, cloud-identified account; there is no local-only
  identity a partner could be invited from.
- **Sign-out wipes local data** (`:29-31`, `:158-160`) — `wipeAllUserData`
  runs before in-memory state clears. Any local mirror table a connection
  feature adds (e.g. the local partnership/signal tables in
  `src/lib/database.js`) must be on the enumerated wipe list — the Partner
  tables already are (referenced from `sync/tables/partners.js`'s pull-prune
  logic, `:117-124`, which calls `db.deleteLocalPairSharedData`).
- **No `SET user_id`, ever** (`:154-157`) — ownership is set at INSERT only;
  CI greps for violations. A connection feature must not "re-key" a shared
  row to a different owner on any lifecycle transition (the Partner tables
  instead use `member_a`/`member_b` columns that go `SET NULL` on account
  deletion rather than being re-owned, `migrate_081_training_partners.sql:68-74`).

---

## 6. What consent framework a connection feature would actually plug into

Putting §2 and §7 together, the honest gap for the synthesis phase to note:
- The **only** consent primitive that exists today is the blanket Article 9
  health-data gate (§2), which is an all-or-nothing "can Volyume process my
  health data at all" switch, revocation of which deletes the account.
- The Partner feature's own migration comment
  (`supabase/migrate_081_training_partners.sql:29-30`) asserts "sharing is a
  new processing purpose; consent is the recorded acceptance of the privacy
  receipt (consent_log pattern, migration 024) handled app-side" — but this
  is **not actually wired to a `consent_log` row**. The `consent_log.consent_type`
  CHECK constraint only permits `'health_data' | 'marketing' | 'analytics'`
  (`supabase/migrate_019_health_consent.sql:37`), and nothing in
  `src/lib/partners/service.js` or the RPCs writes to `consent_log`. The de
  facto "consent" for pairing is the **invite-accept action itself**
  (`redeem_partner_invite`, `supabase/migrate_081_training_partners.sql:278-321`)
  plus the in-app copy shown before it
  (`docs/bp-partner-system-rebuild.md:71-95`, the locked pitch/deletion-promise
  text). There is no separate, audited "I consent to share my training signal
  with this named person" record distinct from "I tapped accept".
- A future connection feature that wants a formally audited per-relationship
  consent (as opposed to a blanket Article 9 gate or an implicit accept-tap)
  would need an additive migration widening the `consent_type` enum (or a
  new table), which is squarely inside the "additive, idempotent, header'd"
  migration rule (CLAUDE.md §2, database schema rules) rather than something
  that exists to build on.

---

## 7. The one existing cross-user connection feature: Training Partners (NEW-002)

This is the fullest architectural precedent in the codebase for "share
something with a specific other person, safely" and is the pattern the
next design phase should read as a working template (not a design
recommendation — purely documenting what already exists and what seams it
proves out).

### 7.1 Schema shape (four additive tables + one added later)

`supabase/migrate_081_training_partners.sql:1-63` (header) lists:
- `partnerships` — the pair + lifecycle (`invited|active|ended`),
  `member_a`/`member_b` FKs to `auth.users` with **`ON DELETE SET NULL`**
  (deliberately not CASCADE) so a deleted member's row survives as an
  `'ended'` tombstone (`:67-74`) — "a deletion is indistinguishable from a
  departure (no death-vs-departure leak, §4.8)."
- `partner_week_signals` — **one derived row per (pair, user, week)**:
  `planned_count`, `done_count`, `week_met`, `state` only
  (`:115-126`) — "never raw workouts."
- `partner_cheers` — one-tap cheers, rate-limited by a DB
  `UNIQUE(pair_id, sender_id, sent_on)` constraint, not application logic
  (`:184-191`) — "the rate limit... enforced at the database, not by
  vibes."
- `partner_blocks` — a per-user block list consulted by the redemption RPC
  (`:218-232`).
- `partner_shared_blocks` (added later, `supabase/migrate_100_partner_shared_blocks.sql`)
  — one row per pair naming a shared training block; the **only** free-text
  field is a proposer-chosen `block_name`, capped at 80 characters and
  immutable once proposed (column-level `GRANT UPDATE (status, updated_at)`
  only, `migrate_100_partner_shared_blocks.sql:122-123` — the client
  literally cannot write to `block_name` after creation via RLS/grants,
  only via delete+reinsert).

### 7.2 Pairing has no discovery surface

`src/lib/partners/link.js:1-16` — pairing is code/link only:
`volyume://partner/<CODE>` or `https://volyume.app/partner/<CODE>`. No
in-app user search of any kind. `create_partner_invite`
(`migrate_081_training_partners.sql:239-269`) server-generates an
unguessable 10-char hex code and stores **only its SHA-256 hash**
(`:255-260`); the plaintext is returned once for out-of-band sharing.
`redeem_partner_invite` (`:278-319`) enforces not-self / not-expired (7
days) / single-use / not-blocked, and **raises the identical
`'invite_invalid'` error on every failure path** so a blocked person cannot
distinguish being blocked from a stale code (`:273-277`, `:302-312`).

### 7.3 The source-level allowlist guard — the reusable artefact

`src/lib/partners/__tests__/partnerPrivacy.guard.test.js` (whole file, 142
lines) is a **regex-based static test** (not a runtime check) that parses the
two client cloud-write surfaces
(`src/lib/partners/service.js`, `src/lib/sync/tables/partners.js`) and
asserts every object literal written to a partner-marked row (identified by
`pair_id:` or `blocker_id:` key markers, `:62`) contains **only** columns on
an explicit allowlist (`:36-46`):

```
ALLOWED_PARTNER_WRITE_COLUMNS = {
  pair_id, user_id, week_start,
  planned_count, done_count, week_met, state,
  blocker_id, blocked_id,
  id, created_at, updated_at,
  block_name, proposed_by, status,
}
```

and never a key matching a forbidden-token list (`:50-54`):
`weight, bodyweight, body_weight, kcal, calorie, protein, carb, fat, rep,
set_count, sets, measurement, photo, note, food, diary, location, lat, lng`.

The file's own rationale (`:8-15`) states this was added specifically
**before** widening the shared surface (the shared-block table), "so the
leak-proof property is pinned at source level FIRST... A new column... fails
here and must be a deliberate, reviewed addition to the allowlist — never a
silent widening." This is the concrete mechanism the "ED-safety + calm voice
untouchable and must be inheritable by any connection surface" hard
constraint could point to: a future connection feature's write surface
should get the same treatment — an explicit allowlist test that fails loud
on any new raw-data-shaped column, reviewed by a human before the allowlist
grows.

### 7.4 The deletion promise, enforced twice

The user-facing promise (`docs/bp-partner-system-rebuild.md:87-89`): "The
moment you [end it], sharing stops and everything that was shared between
you is deleted. Your partner simply sees that the partnership has ended, and
nothing more." This was **not true on first ship** —
`supabase/migrate_092_partner_end_purge.sql:1-11` documents that the
original code only set `status='ended'`, and the `ON DELETE CASCADE` FK
never fires on an UPDATE, so signals/cheers were retained indefinitely
until this migration added `end_partnership()`, a `SECURITY DEFINER` RPC
that explicitly `DELETE`s `partner_week_signals` and `partner_cheers` for
the pair before marking it ended (`:27-58`). `migrate_100` extended this
twice more when the shared-block table was added:
1. `end_partnership` was `CREATE OR REPLACE`d again to also delete
   `partner_shared_blocks` (`migrate_100_partner_shared_blocks.sql:169-198`).
2. A **belt-and-braces trigger** (`_partnership_ended_purge_block`,
   `:148-164`) fires on ANY transition of `partnerships.status` to
   `'ended'` — covering `end_partnership`, `delete_user_data`
   (`supabase/migrate_096_delete_user_data_completeness2.sql`), and the
   delete-account edge function, "without each one remembering the new
   table" (`migrate_100...sql:143-147`).

This two-tier pattern (an explicit delete in the RPC + a trigger that
catches every other path to the same end state) is the concrete
precedent for "the deletion promise must hold across every possible exit,
not just the one the developer tested."

### 7.5 Account-deletion completeness for pair data

`supabase/migrate_096_delete_user_data_completeness2.sql:158-189` — the
`delete_user_data()` RPC fallback path (used when the delete-account Edge
Function is unreachable) explicitly deletes **both members'** signals/cheers
for every partnership the deleting user belongs to (not just their own rows),
then flips the partnership to `'ended'` with the deleted member's column
nulled and the invite hash cleared — reproducing exactly what the
`ON DELETE SET NULL` FK + `end_partnership` RPC would have produced, so a
fallback-path deletion is indistinguishable from the primary path. A
verification checklist is embedded in the migration itself
(`:207-217`).

### 7.6 ED-safety inherited by the connection surface, not bolted on

`supabase/functions/partner-cheer/index.ts:119-132` — before fanning out a
push for a cheer, the edge function (service-role) checks the **recipient's**
open `ed_pattern_flags` row. If one is open, delivery downgrades to
in-app-only: "pushing at a flagged user is the harm pattern, §5... Sending is
never restricted; only the recipient's push delivery is" (`:11-15`). This is
the connection feature inheriting the existing ED-safety signal rather than
re-deriving its own — the same `ed_pattern_flags` table the coaching engine
already writes to gates a completely different feature's push behaviour.

Symmetrically, `src/lib/partners/weekSignalWriter.js:10-14, 56-57` freezes
the **outbound** signal itself to `'resting'` whenever the sender has an open
ED flag or a high SCOFF score — "indistinguishable from a planned deload...
so the partner can never tell a wellbeing hold from recovery, and the safety
system never leaks into the pair surface." This double-sided gating (outbound
signal suppression + inbound push suppression) is the concrete shape "ED
safety must be inheritable by any connection surface" takes in code today.

### 7.7 Notification budget integration

`docs/NOTIFICATIONS_LOCKED.md:232` lists `partner_cheer` in the master event
table (Event-triggered, "1 per topic per day"), and it appears at priority
position 8 of 8 in the `EVENT_PRIORITY` list (`:264-268`) — lowest priority,
so it never displaces a higher-priority push on a collision day. It is
subject to the same global suppression rules as everything else
(`:277-282`): "An open ED/wellbeing flag suppresses every event push at
schedule time, and at delivery where the app is foregrounded." A future
connection feature's notifications slot into this same table/priority list
rather than inventing a new notification pathway.

### 7.8 Free/Pro gating and tier-blindness

`src/lib/partners/signals.js:56-67` — `maxPartnersForTier(tier)` returns `1`
for free, `3` for Pro. The screen itself is wrapped in `withProGuard`
(`src/navigation/RootNavigator.js:192`, `GatedPartner`), matching the
"Free/Pro gating is absolute and binary" rule. Note this is a **capability
cap**, not a guardrail — it is explicitly NOT one of the ED-safety
tier-blind guardrails (`proGate.js`'s mandate is that safety checks never
consult tier; the partner cap is a commercial limit, correctly implemented
as a normal Pro gate rather than smuggled into the safety layer).

### 7.9 Pair-scoped sync is a new registry shape

`src/lib/sync/tables/partners.js:1-19` documents that every other registry
table is user-scoped ("rows where user_id = me"); partner data is the one
**pair-scoped** entry, pulling both members' signals for active pairs and
pruning local mirrors when the cloud no longer returns a pair as active
(handling the "other side unpaired while I was offline" case,
`:83-124`). Any future connection feature needing to sync "my data plus a
consenting other party's derived data" would extend this same registry
shape rather than the single-user shape every other table uses.

---

## 8. Seam checklist for the next design phase

Concrete hooks that already exist and that a connection feature's data model
should plug into, rather than re-invent:

| Seam | Where | What it already enforces |
|---|---|---|
| Blanket health-data consent gate | `RootNavigator.js:1391-1394`, `runner.js:97-114` | Fail-closed (null/false both block); enforced twice (nav + sync) |
| Consent audit trail | `consent_log` (migrate_019), enum currently `health_data\|marketing\|analytics` | Append-only, RLS SELECT/INSERT only, no UPDATE/DELETE |
| Pending-consent offline resilience | `src/lib/consent/pendingConsent.js` | Retries a failed consent RPC on every sync pass |
| Cross-user pairing without discovery | `src/lib/partners/link.js`, `create_partner_invite`/`redeem_partner_invite` RPCs | Code/link only; hash-stored code; single indistinguishable failure message |
| Derived-only write allowlist | `src/lib/partners/__tests__/partnerPrivacy.guard.test.js` | Source-level, fails on any new raw-data-shaped column |
| Two-sided deletion promise | `end_partnership` RPC + `_partnership_ended_purge_block` trigger + `delete_user_data` fallback | Explicit delete + belt-and-braces trigger + fallback-path parity |
| ED-safety inheritance (outbound) | `src/lib/partners/weekSignalWriter.js:56-57` | Freezes own signal to 'resting' under an open flag/high SCOFF |
| ED-safety inheritance (inbound/delivery) | `supabase/functions/partner-cheer/index.ts:119-132` | Downgrades push to in-app-only for a flagged recipient |
| Notification budget slot | `docs/NOTIFICATIONS_LOCKED.md:232,264-268` | Lowest-priority event slot, same global suppression rules |
| Pair-scoped sync registry shape | `src/lib/sync/tables/partners.js` | Only non-user-scoped entry in the registry; local prune on remote unpair |
| Share-card derived-delta precedent | `src/lib/shareCard/greatWeek.js:98-119` | Relative-only numbers, safety-gated, never absolute body data |
| Sentry scrub extension point | `src/lib/observability/sentryScrub.js:37-99` | Would need new patterns for any new sensitive field name introduced |
| Composite-PK / no-anonymous / sign-out-wipe identity rules | `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` | Binds any new `user_id`-touching schema |

---

### File index (every file read for this pass)

- `src/navigation/RootNavigator.js`
- `src/store/useAppStore.js`
- `src/lib/consent/pendingConsent.js`
- `src/screens/Article9ConsentScreen.js`
- `src/screens/SettingsPrivacyScreen.js`
- `src/hooks/useAccountActions.js`
- `src/screens/ShareCardScreen.js`
- `src/lib/shareCard/greatWeek.js`
- `src/lib/sync/runner.js`
- `src/lib/sync/tables/partners.js`
- `src/lib/observability/sentryScrub.js`
- `src/lib/partners/link.js`, `service.js`, `signals.js`, `sharedStreak.js`,
  `weekSignalWriter.js`, `__tests__/partnerPrivacy.guard.test.js`
- `supabase/migrate_019_health_consent.sql`
- `supabase/migrate_024_consent_log_composite_pk.sql`
- `supabase/migrate_081_training_partners.sql`
- `supabase/migrate_092_partner_end_purge.sql`
- `supabase/migrate_096_delete_user_data_completeness2.sql`
- `supabase/migrate_100_partner_shared_blocks.sql`
- `supabase/functions/partner-cheer/index.ts`
- `docs/PRIVACY_CONSENT_LOCKED.md`
- `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`
- `docs/NOTIFICATIONS_LOCKED.md`
- `docs/bp-partner-system-rebuild.md`
- `docs/rules/supabase.md`
