# A1 — Teardown of the existing Volyume "Training Partner" feature

Research phase only. Read-only teardown of our own shipped/near-shipped code.
Every claim below is **[OBSERVED]** — read directly from this repository — and
carries a `file:line` citation. Nothing here is a design recommendation,
placement decision, or go/no-go call; that is reserved for the synthesis
session. Where the code diverges from its own documentation/comments, or
where a documented promise is not actually reachable in the shipped UI, that
divergence is called out explicitly and precisely, because the synthesis
session needs the true shipped behaviour, not the aspirational one.

Status context: this is the **only** connection/social surface in Volyume.
It shipped as "NEW-002" (blueprint reconstruction at
`docs/bp-partner-system-rebuild.md`), was hardened across several waves
(local task log: "Partner BLOCKER #1/#2", "Wave 5 Partner v2"), and one piece
of it — the shared-training-block cloud table, `supabase/migrate_100_partner_shared_blocks.sql`
— is code-complete but **not yet applied to production** (EU-Dublin); CLAUDE.md
lists it under "Outstanding founder actions" as one of the migrations awaiting
a manual founder run. The client benign-skips its absence (§8.4 below), so
today's live production behaviour is "pairing, ticks, streak, cheer" only —
the shared-block half described in §7 is present in the app binary but inert
until that migration is run.

---

## 1. File map (everything this teardown is built from)

**Pure logic (`src/lib/partners/`)**
- `src/lib/partners/link.js` — invite-code/link build & parse (pure).
- `src/lib/partners/service.js` — the online RPC/edge-function/table wrappers
  (create/redeem invite, cheer, block, unpair, shared-block propose/adopt/leave,
  `fetchPartnerView`).
- `src/lib/partners/signals.js` — ticks label, cheer-rate-limit check, row-state
  derivation, free/Pro cap (`maxPartnersForTier`, `canAddPartner`).
- `src/lib/partners/sharedStreak.js` — the joint weekly streak state machine.
- `src/lib/partners/weekSignalWriter.js` — computes + pushes the user's own
  derived week signal into every active pair (the "keystone" writer).

**UI**
- `src/screens/PartnerScreen.js` (631 lines) — the sole first-class screen.
- `src/components/PartnerRow.js` — a slim status row component. **Built but
  not mounted anywhere in a live screen** (see §9.2).
- `src/screens/WorkoutSummaryScreen.js:807-838` — the post-workout "partner
  beat" (cheer surfaced right after finishing a session).
- `src/screens/AnalyticsScreen.js:609-612` — the tap-in point (Progress hub →
  "Partner" tile).
- `src/hooks/usePartners.js` — the one hook every surface above reads from
  (offline-first local-SQLite reads + the six online actions).

**Notifications**
- `src/lib/notifications/partnerBeats.js` — pure copy/watermark helpers for the
  two partner pushes (cheer received, streak kept).
- `src/lib/notifications/scheduler.js:1340-1460` (`schedulePartnerBeats`) — the
  OS-facing scheduling: quiet hours, ED-flag silence, preference toggle, event
  push-budget slot.
- `src/lib/notifications/categories.js:38,120,193` — the `partner_cheer`
  notification category (push + in-app channel).
- `docs/NOTIFICATIONS_LOCKED.md:232,267` — the locked cap: 1 per topic per day.

**Local storage (`src/lib/database.js`)**
- Schema: `1345-1373` (partnerships / partner_week_signals / partner_cheers),
  `1479-1488` (partner_shared_blocks, Wave 5).
- CRUD/mirror functions: `4735-4924`.

**Sync**
- `src/lib/sync/registry.js:186-202` — the single pair-scoped registry entry
  `partner_signals`.
- `src/lib/sync/tables/partners.js` — the push/pull handler.

**Cloud (Supabase, EU-Dublin)**
- `supabase/migrate_081_training_partners.sql` — the four base tables + RLS +
  `create_partner_invite` / `redeem_partner_invite` RPCs + 4 telemetry events.
- `supabase/migrate_092_partner_end_purge.sql` — `end_partnership()` (the real
  deletion-promise RPC; superseded in shape by 100).
- `supabase/migrate_096_delete_user_data_completeness2.sql:158-189` — the
  fallback account-deletion RPC's partner section.
- `supabase/migrate_100_partner_shared_blocks.sql` — `partner_shared_blocks`
  table + RLS + purge-trigger + `end_partnership()` v2 + 3 new telemetry names.
  **Not yet applied to EU-Dublin** (per CLAUDE.md STATUS line and the
  migration's own header, "Applied remotely: NO — FOUNDER-RUN, manual").
- `supabase/functions/partner-cheer/index.ts` — the cheer edge function
  (rate-limit + ED-flag delivery downgrade + push fan-out).
- `supabase/functions/delete-account/index.ts:129-152` — account-deletion
  partner teardown (primary path; 096 above is the RPC fallback).
- `public/partner/index.html` — the web landing page for an invitee who
  doesn't have the app yet.

**Tests (used here only to cross-check the enumerated edge cases, not
re-summarised as a separate section)**
- `src/lib/partners/__tests__/{link,service,signals,sharedStreak,weekSignalWriter,partnerPrivacy.guard}.test.js`
- `src/lib/sync/__tests__/sync.partners.test.js`
- `src/components/__tests__/PartnerSurfaces.test.js`

---

## 2. What the feature actually is, in one paragraph

Two named users can pair by an out-of-band code/link (no in-app search, no
discovery, no public profile). Once paired, each side sees **one derived
signal** about the other: a per-week training tick like "3 of 4",
counted **relative to the other person's own plan**, never a raw number of
sets/reps/weight/kcal. A joint streak counts consecutive weeks both partners
independently met their own plan; a rest or "quiet" week never breaks it and
is never attributed to a person. Either side can send one "cheer" a day. Either
side can end the pairing at any time, which purges the shared rows
server-side. The whole feature is Pro-gated (route guard), and even inside
Pro it is capped at 1 partner (free would be, if reachable — see §9.1) / 3
partners (Pro, though see §9.1 for why this cap is currently unreachable in
the shipped screen).

---

## 3. The pairing / invite flow, end to end

### 3.1 Code generation (inviter's device → server)

1. User taps **Create invite** (or one of **Text / WhatsApp / Email**) on
   `PartnerScreen` — `src/screens/PartnerScreen.js:80-94` (generic share) or
   `:102-137` (direct-to-app share).
2. Client calls `createPartnerInvite(userId, { streakEnabled })` —
   `src/lib/partners/service.js:26-47` — which invokes the RPC
   `create_partner_invite(_streak_enabled)`.
3. Server (`supabase/migrate_081_training_partners.sql:239-269`, SECURITY
   DEFINER, `search_path` pinned):
   - Generates **10 uppercase hex characters** via `gen_random_bytes(8)` (`:255`).
   - Inserts a `partnerships` row: `member_a = <inviter>`, `member_b = NULL`,
     `status = 'invited'`, `invite_code_hash = sha256(code)` (the **plaintext
     code is never stored**, only its hash — `:257-264`).
   - Returns the plaintext code **once**.
4. Client builds the two links —
   `deepLink = volyume://partner/<CODE>`,
   `webLink = https://volyume.app/partner/<CODE>`
   (`src/lib/partners/link.js:18-19,27-34`) — and the share message:
   > "Be my training partner on Volyume. It just shows whether I trained this
   > week, and nothing else about it. No numbers, no feed."
   (`src/lib/partners/link.js:57-59`).
5. Fires `partner_invite_sent` telemetry (`streak_enabled` boolean only) —
   `src/lib/partners/service.js:35`.
6. `Share.share({ message })` (OS share sheet) for the generic path, or a
   direct `sms:` / `whatsapp://send` / `mailto:` deep link for the three
   named buttons, falling back to the OS share sheet if the target app can't
   be opened (`src/screens/PartnerScreen.js:113-135`).

**Each tap that reaches the network creates a brand-new row and a brand-new
code** — there is no reuse. See §10.6 for what this means when a user taps
more than one of the three "send it directly" buttons.

### 3.2 Redemption (invitee's device → server)

Two entry paths land on the same `PartnerScreen`, params `{ code }`:
- **Deep link / universal link**: `App.js:161-178` (`handlePartnerDeepLink`)
  parses the URL with `parseInviteCode` and calls
  `navigationRef.navigate('Partner', { code })`, polling up to ~6s for the
  navigator to be ready on a cold start.
- **Manual entry**: the "Or enter a partner's code" field on the empty/ended
  state of `PartnerScreen` (`:500-513`).

On `PartnerScreen` mount with an incoming code
(`src/screens/PartnerScreen.js:68-78`): the code is pre-filled, and if the
user is **not already paired** (`rowState !== 'active'|'resting'`), redemption
fires automatically — "opening an invite link is explicit intent to accept."
A ref guards it so a given code only auto-fires once.

`redeemPartnerInvite(userId, code)` (`service.js:54-68`) calls
`redeem_partner_invite(_code)` (`migrate_081:278-319`, SECURITY DEFINER):
- Hashes the entered code (case/whitespace-normalised) and looks up the row
  by `invite_code_hash`.
- Rejects (raising the single opaque error `invite_invalid`, always the same
  message no matter the cause) if: not found, `status <> 'invited'`,
  `member_b IS NOT NULL` (already redeemed), `member_a = uid` (self-redeem),
  `created_at < now() - 7 days` (**expired**), or either party has blocked
  the other in `partner_blocks` (`:302-312`). A blocked person cannot tell a
  block apart from a stale/expired code — by design (comment `:274-277`).
- On success: `UPDATE partnerships SET member_b = uid, status = 'active',
  accepted_at = now(), invite_code_hash = NULL` (`:314-316`) — clearing the
  hash means **the same code can never be redeemed twice**, closing the
  single-use requirement at the data layer, not just the status check.
- Fires `partner_invite_accepted` telemetry — `service.js:63`.

Client-side `redeemPartnerInvite` maps **every** RPC error to the identical
`{ ok: false, error: 'invite_invalid' }` (`service.js:59-62`), and the UI
shows one generic toast: *"That invite did not work. It may have expired or
already been used."* (`PartnerScreen.js:147`). Pinned by
`service.test.js:88-95` ("maps any RPC error to a single indistinguishable
invite_invalid").

### 3.3 Sequence summary

```
Inviter                          Server (EU-Dublin)                Invitee
   |--createPartnerInvite-------->|
   |   RPC generates code,        |
   |   stores sha256 only         |
   |<--code (plaintext, once)-----|
   |--Share.share() / sms: / whatsapp:// / mailto:--------------------->|
   |                              |            (tap link / paste code)  |
   |                              |<--redeemPartnerInvite(code)---------|
   |                              |  RPC validates: not self, not       |
   |                              |  expired(7d), single-use, not       |
   |                              |  blocked either direction           |
   |                              |  member_b=uid, status='active'      |
   |                              |  invite_code_hash=NULL              |
   |<---------------- next sync pull (both sides) -------------------->|
```

---

## 4. Every screen and every state

### 4.1 `PartnerScreen.js` — the one first-class destination

Route `'Partner'` (`src/navigation/RootNavigator.js:430`), wrapped in
`withProGuard(..., 'Training partner')` (`:192`) — a **Pro-only route** (see
§9 for exactly how this gate behaves and its edge cases). Reached from:
`AnalyticsScreen.js:612` (Progress hub tile, labelled "Partner", icon
`people`) and from the post-workout beat's cheer button
(`WorkoutSummaryScreen.js:821-826`, which navigates the user into the pairing
via the cheer action itself, not a direct link) and from the deep link path
in §3.2.

The screen has **five mutually-exclusive top-level render states**, driven
entirely by `usePartners`'s derived `rowState`
(`src/lib/partners/signals.js:45-54`):

| `rowState` | Trigger | What renders |
|---|---|---|
| `empty` | No partnership row at all | Pitch card + "What you each see" / "What neither of you will ever see" privacy receipt + streak toggle + Create-invite / Text / WhatsApp / Email buttons + "enter a partner's code" field (`PartnerScreen.js:407-517`) |
| `pending` | A partnership exists with `status='invited'` | "Invitation sent. Waiting for your partner." + Cancel (`:396-404`, and the pending-specific card `:567-573`) |
| `active` | `status='active'`, partner's latest week is NOT resting | The live card: both names, both week ticks, shared-streak chip, Cheer button, last-cheer caption, the shared-training-block card, "End partnership" (`:246-393`) |
| `resting` | `status='active'`, partner's latest week signal `state==='resting'` | Same live card, but the partner's side reads "Resting this week" with a moon icon instead of ticks — **never a fail word** (`:264-268`) |
| `ended` | Most recent partnership tombstone has `status='ended'` | "Partnership ended." note, then the SAME empty-state pitch/receipt/pairing UI as `empty` (re-pairing is always available) (`:407-411`) |

`usePartners.pickPrimary` (`src/hooks/usePartners.js:36-41`) is what selects
**which single partnership** drives `rowState`: active first, else invited,
else the most recent ended tombstone, else none. This single-primary
assumption is load-bearing for §9.1 below.

Loading state: a centred spinner while `p.loading` (`PartnerScreen.js:230-236`).

### 4.2 `PartnerRow.js` — built, not shipped

A slim one-line status row ("Training partner — Sam: 3 of 4 this week" /
"resting this week" / "Waiting for your partner" / "Train with a partner"),
with a small cheer-received dot. It exists as a component
(`src/components/PartnerRow.js`) and is fully covered by
`PartnerSurfaces.test.js`, but **no screen renders it**. A grep of every
`.js` file under `src/screens` for `PartnerRow` returns only a comment in
`ConsistencyScreen.js:48-49`:

> "Training partner deliberately NOT shown here: it lives in Progress
> (Analytics hub -> Training partner). Removed from Consistency to [...]"

— i.e. the row was deliberately pulled from Consistency and the *tile*
(`AnalyticsScreen.js:612`) replaced it as the sole tap-in point. `PartnerRow`
itself is currently dead UI code, kept alive only by its own test file.

### 4.3 The post-workout beat (`WorkoutSummaryScreen.js:807-838`)

Rendered only when **all** of: not read-only, not calm-suppressed
(ED/wellbeing), `tier === 'pro'` (an explicit second tier check, redundant
with the route guard but present as defence-in-depth on a screen reachable
without going through 'Partner'), and `rowState` is `active` or `resting`.
Shows one line ("Sam: 3 of 4 this week." / "Sam is resting this week.") and a
Cheer button with the same one-per-day disable state as the main screen.
This is the blueprint's "P1 — contextual post-workout nudge"
(`docs/bp-partner-system-rebuild.md:60-62`) realised in code.

### 4.4 The web fallback landing (`public/partner/index.html`)

Served at `https://volyume.app/partner/<code>` for someone who taps the link
without the app installed (the app-installed case is intercepted by the OS
via the verified universal link and this page never renders). It repeats the
identical SEES/NEVER-SEES privacy receipt verbatim and links to
`volyume://partner/<code>` ("Open in Volyume") and the Play Store, carrying
the code through via path/`?c=`/`#` fallback so redemption still works after
a fresh install (`:92-119`). No iOS store link is wired yet (`REPLACE_WITH_APP_STORE_ID`
placeholder, `:114-117` — "not yet live").

---

## 5. Exactly what data crosses, field by field

### 5.1 The shared payload (the only thing that ever leaves a device about the *other* person)

One row per `(pair, user, week)` in `partner_week_signals`
(`supabase/migrate_081_training_partners.sql:115-126`; local mirror
`src/lib/database.js:1356-1366`):

| Column | Type | Meaning | Derivation |
|---|---|---|---|
| `pair_id` | uuid | which partnership | — |
| `user_id` | uuid | whose signal (row-identity, not "content") | — |
| `week_start` | text | local-Monday week key | `localWeekStartMs` |
| `planned_count` | int | sessions planned that week | plan routine count, or manual streak goal, or raw session-count fallback |
| `done_count` | int | sessions completed that week | `getWeeklySessionStats` |
| `week_met` | boolean | did they hit their own target | `computeWeekState` (`src/lib/streak.js:80-92`) — **always `true` while resting**, never a fail signal |
| `state` | `'training'\|'resting'` | frozen to `'resting'` under deload, manual pause, **or an open ED/wellbeing flag** | `weekSignalWriter.js:56-57` |
| `updated_at` | timestamptz | LWW conflict field | server `now()` on write |

That is the **entire** cross-user payload for the core mechanic. Built once,
by one function — `computeCurrentWeekState`
(`src/lib/partners/weekSignalWriter.js:30-70`) — and pushed by
`pushWeekSignal` (`service.js:133-152`)/`pushPartners`
(`src/lib/sync/tables/partners.js:26-75`). There is no other field. No sets,
reps, load, duration, exercise names, body weight, food, calories, check-in
answers, coach messages, or location ever leaves the device in this table —
enforced not just by convention but by a **source-level regression guard**,
`src/lib/partners/__tests__/partnerPrivacy.guard.test.js`, which parses the
two client cloud-write surfaces (`service.js`, `sync/tables/partners.js`) for
every object-literal key written into a partner-marked row and fails the
build if any key is outside an explicit allow-list (`:36-46`) or matches a
forbidden-token list (`weight`, `kcal`, `calorie`, `rep`, `measurement`,
`photo`, `food`, `location`, `lat/lng`, etc., `:50-54`).

### 5.2 The cheer (`partner_cheers`)

`{ id, pair_id, sender_id, sent_on (date), created_at }` — no message body,
no reason, no free text of any kind
(`supabase/migrate_081_training_partners.sql:184-192`). Rate-limited by a
hard `UNIQUE(pair_id, sender_id, sent_on)` constraint (`:190`) — the limit is
enforced by the database, not client trust; a duplicate insert simply 429s
(`supabase/functions/partner-cheer/index.ts:105-109`).

### 5.3 The shared training block (`partner_shared_blocks`, Wave 5 C5, migration 100 — see §7 for status)

`{ pair_id, block_ref (server-minted uuid), block_name (≤80 chars, the ONE
user-chosen string), proposed_by, status: 'proposed'|'active', created_at,
updated_at }` (`supabase/migrate_100_partner_shared_blocks.sql:60-69`). No
exercises, days, sets, or weights ever cross — only the display name the
proposer typed for their own plan, frozen at propose-time (§7.3).

### 5.4 Identity fields — what the other person's *name* actually is

The UI (`PartnerScreen.js:238`, `PartnerRow.js:17`,
`WorkoutSummaryScreen.js:818-819`) all read `partnership?.partnerFirstName`,
falling back to the literal string `"Your partner"`. **This field is never
populated anywhere in the shipped write path**:
- `partnerships` (cloud table, `migrate_081_training_partners.sql:75-86`)
  has no `partner_first_name`/name column of any kind.
- The local SQLite mirror table (`database.js:1345-1354`) has no such column.
- `upsertPartnershipFromCloud` (`database.js:4815-4829`) does not write one.
- `getPartnershipsLocal` (`database.js:4743-4753`) is a bare
  `SELECT * FROM partnerships`, no join.
- `users_profile` (the only table with `first_name`,
  `supabase/migrate_001_profile_columns.sql:5`) has an RLS policy scoped to
  `auth.uid() = id` only — "Users can read/write own profile"
  (`supabase/migrate_005_rls_hardening.sql:33`) — so a client **cannot**
  SELECT another user's `first_name` under RLS even if it tried.
- The one place a cross-user name *is* resolved server-side is the
  `partner-cheer` edge function, using the **service-role** client
  (`supabase/functions/partner-cheer/index.ts:134-140`), and that name is used
  **only inside the push-notification title/body** ("Sam sent you a cheer")
  — it never lands in any table or client response the app reads back into
  `partnership.partnerFirstName`.

Net effect: **in the shipped app, every partner is always displayed as the
literal fallback string "Your partner"** — the in-app UI, the notification
copy paths that read `partnership.partnerFirstName`
(`src/lib/notifications/scheduler.js:1380`, `partnerBeats.js:22-23,32-33`),
and the tests (`PartnerSurfaces.test.js:69` etc.) all assume a populated
name, but only the **server-side push copy** (via the edge function's own
profile lookup) ever actually shows a real first name — and only in the OS
notification banner, never inside the app itself. This is a genuine
implementation gap between the documented/tested behaviour and the wired
data path, not a design choice recorded anywhere in
`docs/bp-partner-system-rebuild.md` (which never even mentions sharing a
name — its locked copy list, §4.4 in that doc, is entirely counts/streak/
resting/cheer).

### 5.5 The complete "never" list (as stated to the user, and verified against the schema)

`PartnerScreen.js:44-50` and the identical web copy
(`public/partner/index.html:74-81`):
- Weights, sets, reps, or anything else from a session.
- Body weight, measurements, or photos.
- Food, calories, or diary entries.
- Check-ins, or anything told to the coach.
- Location.

Cross-checked against the schema (§5.1-§5.3) and the source guard (§5.1):
true. No column anywhere in the four (soon five) partner tables carries any
of these.

---

## 6. The consent model

There is **no partner-specific consent capture** anywhere in the codebase.
Specifically:
- `consent_log` (the GDPR consent-record table,
  `supabase/migrate_024_*` per the migration comment) is written from exactly
  two places in `src/`: `src/screens/Article9ConsentScreen.js` (the blanket
  upfront health-data-processing gate every user passes once, pre-first-run)
  and `src/hooks/useAccountActions.js` (withdrawal). A repo-wide search for
  `consent_log`/`consentLog`/`recordConsent` inside `src/lib/partners/` or
  `PartnerScreen.js` returns **nothing**.
- `migrate_081_training_partners.sql:29-30` claims: "consent is the recorded
  acceptance of the privacy receipt (consent_log pattern, migration 024)
  handled app-side" — **this is not actually implemented**. The "privacy
  receipt" (the SEES/NEVER-SEES bullet lists, `PartnerScreen.js:407-446`) is
  informational copy shown before the pairing buttons; there is no checkbox,
  no "I understand" tap, and no logged acceptance event distinct from simply
  using the feature.
- The only affirmative acts on record are the generic engine-telemetry
  events `partner_invite_sent` / `partner_invite_accepted`
  (counts/booleans only, never partner identity — `migrate_081:399-402`),
  which are usage analytics, not GDPR consent records.
- So: consent for exposing a derived attendance signal to a second, named
  human being currently rides entirely on the general Article 9 blanket
  consent captured once at onboarding for "processing health data to provide
  the service" — there is no separate, loggable acknowledgment at the moment
  a user actually decides to make their attendance visible to another
  specific person.

---

## 7. Shared-training-block mechanics (Wave 5 C5, migration 100)

**Status caveat** (repeated because it matters for anyone reading this as
"current live behaviour"): the cloud table this needs
(`partner_shared_blocks`) is **code-complete but not yet applied to
EU-Dublin production** — CLAUDE.md's STATUS line and the migration's own
header both say so. The client is written to benign-skip its absence
(`src/lib/sync/tables/partners.js:159,174`: "Benign-skip a missing cloud
table (migrate_100 not applied yet)"), so today, in production, this whole
section (§7) is inert — the UI code exists in the shipped app but every
propose/adopt/leave call would 404 against a missing table until the
founder runs the migration.

### 7.1 What it actually is (and, precisely, what it is NOT)

The founder decision that scoped this (`docs/wave5-plan-2026-07-02.md:184-188`,
"Q3 (C5 scope) = full shared block") explicitly frames it as: "add a stable
shared-programme **id**" so "train the same block" is "explicit rather than
name-matched" — and clarifies "the completion compare rides the **existing
derived week signal** (no raw data)."

Reading the shipped code against that: it delivers exactly a **stable,
pair-scoped label with a status flag** — `block_ref` (server-minted uuid,
`migrate_100:62`), `block_name` (a string, capped at 80 characters, the
proposer's own plan's display name, frozen at propose time —
`service.js:165-188`), `proposed_by`, `status`. **No actual training content
(exercises, days, sets, target loads) is transferred, linked, or
auto-created on the adopting partner's device.** Adopting a shared block
(`adoptSharedBlock`, `service.js:195-212`) only flips a status column to
`'active'` on the pair row — it does not create, copy, or point at any
`programmes`/`routines` row on the adopter's account. The "shared week"
readers still read the **same** per-user `partner_week_signals` rows that
already existed for the base mechanic (§5.1) — nothing new is derived. The
UI text itself is careful about this ("Only the block's name is shared.
Never what is inside it." — `PartnerScreen.js:305,363,372-373`), but the
practical implication for a synthesis session is: **"training the same
block" is a shared badge/label, not a shared plan** — both partners must
independently already have, or separately go build, a programme they
consider matching. There is no join-key back to the proposer's actual
`programmes` row at all (confirmed by the wave-5 planning doc itself,
`docs/wave5-plan-2026-07-02.md:52-57`: "Library plan IDs are random per
install... so 'train the same block' has nothing to join on today without
new infra" — migration 100 gives it a stable **conversation-level** id, not a
content join).

### 7.2 Propose / adopt / decline / leave state machine

- **Propose** (`proposeSharedBlock`, `service.js:165-188`): picks one of the
  proposer's own local programmes (`getAllProgrammes`,
  `PartnerScreen.js:159-168`) and writes a **delete-then-insert** (not
  upsert) so a re-proposal always mints a fresh `block_ref` rather than
  reusing the old row's identity. `block_name` is trimmed and hard-capped at
  80 chars. Emits `partner_block_proposed`.
- **RLS invariant, explicitly commented and reviewed** (`migrate_100:97-102`):
  "the proposer cannot self-adopt" — enforced at the RLS boundary
  (`proposed_by <> auth.uid()` in the UPDATE policy), not merely in
  application code, following an A3 review finding
  ("2026-07-03: the invariant... must hold at the RLS boundary, not just in
  service.js"). Column-level grants additionally pin client UPDATEs to
  `status`/`updated_at` only (`:122-123`) — `block_name`/`proposed_by`/
  `block_ref` are immutable once proposed.
- **Adopt** (`adoptSharedBlock`, `service.js:195-212`): only the
  non-proposer can flip `status: 'proposed' → 'active'`. If the RLS filter
  matches zero rows (e.g. the proposer tries to adopt their own proposal),
  the call returns `{ ok: false, error: 'not_adoptable' }` — a clean fail
  closed, pinned by `service.test.js:142-148`.
- **Decline**: there is no distinct "decline" action — the UI offers
  **"Not for me"** on the receiving side (`PartnerScreen.js:359-364`), which
  calls the same `leaveSharedBlock` as an active "Leave this block" would
  (`handleLeaveBlock`, `:187-193`) — decline and leave are the same
  operation (`DELETE FROM partner_shared_blocks WHERE pair_id = ?`). Either
  member may call it at any state.
- **Withdraw** (proposer changes their mind while waiting): same delete,
  labelled "Withdraw suggestion" (`:338-343`).

### 7.3 Data-changing-after-share edge case

Because only the **string** name is captured once at propose-time (never a
live reference to the proposer's actual `programmes` row), renaming or
deleting the proposer's local programme **after** proposing/adopting has
**zero effect** on the shared block — it is a frozen snapshot, permanently
disconnected from the object it was named after. There is no re-sync, no
staleness warning, no way for either side to discover the name has drifted
from the real plan.

### 7.4 Deletion promise for the shared block

`end_partnership()` v2 (`migrate_100:169-200`) explicitly deletes
`partner_shared_blocks` alongside week signals and cheers. **Belt-and-braces
data-layer trigger** (`_partnership_ended_purge_block`, `:148-164`): any
transition of `partnerships.status` to `'ended'`, from **any** path
(`end_partnership`, `delete_user_data`, the delete-account edge function),
purges the pair's shared block — so a future ending path can never forget to
extend to this table, by construction rather than by convention.

---

## 8. Offline / sync behaviour of shared data

### 8.1 Registry shape

One registry entry, `partner_signals`
(`src/lib/sync/registry.js:186-202`): `pk: ['pair_id','user_id','week_start']`,
`conflictStrategy: 'last_write_wins'`, `serverAuthoritative: false`,
`direction: 'bidirectional'`. This is the **only** pair-scoped entry in the
whole registry — every other table is user-scoped ("rows where user_id =
me"); partner data is "rows in my active pairs, including my partner's"
(`src/lib/sync/tables/partners.js:4-6`).

### 8.2 Push (`pushPartners`, `src/lib/sync/tables/partners.js:26-75`)

Uploads **only the caller's own** derived week signal, for **active** pairs
only (`:32-33`). Batched at 200 rows (`PUSH_BATCH_SIZE`). A missing
`partner_week_signals` table (migration 081 not yet applied to a given
environment) is a **benign skip**, not an error (`:61-63`) — mirroring the
cardio_log/daily_steps precedent.

### 8.3 Pull (`pullPartners`, `:77-195`)

1. Reads **all** of the caller's partnerships (any status, so an `'ended'`
   tombstone is returned once so the UI can show it) — `:85-94`.
2. **Prune**: any local partnership id the cloud no longer returns as mine
   (the other side hard-vanished, e.g. both deleted their accounts) is
   forced to `status:'ended'` locally, and its shared rows purged
   (`:113-124`, "unpair-while-offline"). Pinned by
   `sync.partners.test.js:118-130`.
3. **Deletion-promise propagation, other member's side**: for every pair the
   cloud reports `status==='ended'`, the local mirror's shared rows
   (signals/cheers/shared-block) are purged **on this pull**, on the *other*
   member's device — so ending a partnership on device A eventually clears
   the shared data on device B too, next time B syncs (`:104-110`, pinned
   `sync.partners.test.js:132-144`).
4. For **active** pairs only: pulls both members' week signals, both
   members' cheers, and the pair's shared-block row (or clears the local
   shared-block mirror if the cloud has none — "the partner leaving the
   block must propagate to this device", `:154-158,169-176`; a **missing**
   `partner_shared_blocks` table is distinguished from an **absent row** and
   never clears local data on a missing-table 404 — pinned
   `sync.partners.test.js:180-190`).
5. **This pull is the only moment a cheer, a streak change, or a partner's
   week resolution can *arrive*** on a device — so it is also where
   `schedulePartnerBeats(userId)` (the two partner pushes) is triggered,
   fire-and-forget, with watermarks so each beat fires at most once
   (`:184-188`).

### 8.4 Local mirror + offline reads

Every screen reads **only** local SQLite (`src/lib/database.js:4735-4924`),
never Supabase directly — consistent with the app-wide offline-first rule.
`usePartners` also **writes** the user's own current-week signal locally on
every screen focus (fire-and-forget, `usePartners.js:64`) and — separately
— on every workout finish (`src/screens/ActiveWorkoutScreen.js:1714`,
independent of the Pro-gated screen ever being opened; see §10.4/§10.5 for
why this second call site matters for the free/Pro edge case).

### 8.5 Sign-out wipe: an inconsistency between two similar functions

Two different local wipe functions exist:
- `wipeAllUserData()` (`database.js:4100-4109`, comment: "Local SQLite is
  single-user, so a flat wipe of all partner rows is correct on sign-out") —
  this is the function actually called on sign-out
  (`src/navigation/RootNavigator.js:1167-1168`,
  `src/store/useAppStore.js:431-432`,
  `src/hooks/useAccountActions.js:274`). It deletes `partner_cheers`,
  `partner_week_signals`, `partnerships` — **but not `partner_shared_blocks`**.
- `clearLocalPartners()` (`database.js:4918-4924`) deletes all **four**
  tables including `partner_shared_blocks` — but a repo-wide search shows
  this function is **never called from anywhere**; it is dead code.

Net effect: signing out today does not clear the local `partner_shared_blocks`
mirror row(s), unlike the other three partner tables. Low real-world
severity (the row is keyed by a random `pair_id` a different user signing in
on the same device would have no reference to), but it is a genuine,
verifiable inconsistency between the two cleanup paths.

---

## 9. Free / Pro gating — how it is actually enforced, and where it breaks down

### 9.1 The Pro "up to 3 partners" cap is defined but unreachable in the shipped screen

`maxPartnersForTier` (`src/lib/partners/signals.js:61-63`) and
`canAddPartner` (`:65-67`) implement free=1/Pro=3 exactly as documented
(`docs/bp-partner-system-rebuild.md:47`, "Free = 1 partner; Pro = up to 3",
framed as "capability gained"). Both are unit-tested precisely
(`signals.test.js:45-56`).

However, `PartnerScreen`'s render tree (§4.1) has exactly one branch that
shows the invite-creation UI: `rowState === 'empty' || rowState === 'ended'`
(`PartnerScreen.js:407`). `rowState` comes from `pickPrimary`
(`usePartners.js:36-41`), which surfaces **one single partnership** — active
first. The instant a user has **any** active partnership, `rowState` becomes
`'active'` or `'resting'`, and the entire "Create invite / Text / WhatsApp /
Email / enter a code" block (§4.1's `empty`/`ended` row) stops rendering —
**for a Pro user just as much as a free one.** There is no second UI
anywhere (no list of partnerships, no "add another partner" affordance once
paired) that lets a Pro user with 1 active partner add a 2nd or 3rd. The
`canAdd` flag computed for a Pro user with `activeCount:1` is correctly
`true` (`canAddPartner({tier:'pro', activeCount:1})` → `true`), but nothing
in the shipped screen consults it once paired, because the buttons it would
enable are never rendered in that state. **The documented and pure-logic-layer
Pro 3-partner cap is, in the current shipped screen, functionally a 1-partner
cap for every tier** — the multi-partner UI simply was never built on top of
the (already-written, already-tested) cap logic.

The same single-primary assumption blocks the **deep-link auto-redeem** path
too: `PartnerScreen.js:75`, `alreadyPaired = rowState === 'active' ||
rowState === 'resting'`; if true, an incoming invite code is silently never
auto-redeemed (`:76`) — this affects a Pro user under their cap exactly as
much as anyone at cap.

### 9.2 The route gate itself

`withProGuard(PartnerScreen, 'Training partner')`
(`src/components/ProGate.js:247-253`, wired at
`src/navigation/RootNavigator.js:192,430`): reads `tier` from the Zustand
store; anything other than `'pro'` renders `ProLocked` (a full-screen lock
with a benefit line, "Upgrade to Pro" CTA, "Restore purchases", and a "Not
now" escape) **instead of** `PartnerScreen`, "no matter how it is reached
(deep link, stale nav state, etc.)" (comment, `ProGate.js:243-246`). The
Progress-hub tile additionally shows a small "Pro" lock badge before the tap
(`AnalyticsScreen.js:612`, `pro={tier !== 'pro'}` — cosmetic only; the actual
enforcement is the route guard, not the tile).

`WorkoutSummaryScreen`'s post-workout beat repeats the tier check inline
(`tier === 'pro'` at `:811`) as a second, independent gate on a screen that
isn't itself Pro-routed.

### 9.3 The free-tier invitee experience (a Pro user invites a free-tier friend)

Because the deep-link handler always navigates to route `'Partner'`
(`App.js:172`) regardless of the invitee's tier, a **free-tier invitee**
tapping a Pro friend's invite link lands on `GatedPartner`, which — since
their tier isn't `'pro'` — renders `ProLocked` **instead of** `PartnerScreen`.
`ProLocked` (`src/components/ProGate.js:140-240`) **never reads
`route.params.code`** — only `PartnerScreen`'s own `useEffect`
(`PartnerScreen.js:68-78`) does that, and it never mounts for a free user.
So: the invite code that got the user there is silently dropped; the lock
screen shows the generic "Training partner is part of Pro" benefit copy with
no mention of the pending invite or who sent it; and there is no code path
by which upgrading to Pro *later*, from a different entry point, would
recover that specific code (the deep link is not re-fired; the code was only
ever a route param on a screen instance that rendered the lock, not the
form). **A free-tier invitee's only way to actually redeem is to already be
Pro, or to become Pro and then get sent the link/code again.**

### 9.4 The lapsed-partner edge case (a Pro user pairs, then lapses to Free)

This is the most consequential "one user free, one Pro" finding, and it is
entirely a consequence of gating being enforced **only at the UI-route
layer**, never at the data layer:

- RLS on every partner table (`migrate_081_training_partners.sql:92-232`,
  `migrate_100:71-135`) checks only `auth.uid()` membership of the pair —
  **never tier**. There is no tier column anywhere in `partnerships`,
  `partner_week_signals`, `partner_cheers`, or `partner_shared_blocks`, and
  no tier lookup in any RLS policy or RPC.
- The sync layer is likewise tier-blind: `src/lib/sync/runner.js` has zero
  references to `tier` at all (confirmed by search) — `pushPartners`/
  `pullPartners` run unconditionally for every signed-in user on every sync
  cycle.
- Critically, **`writeOwnWeekSignals`** — the function that computes and
  pushes a user's own derived week signal into every active pair — is called
  from **two** sites: `usePartners.js:64` (screen-mount, Pro-gated, so a free
  user never reaches it) **and** `src/screens/ActiveWorkoutScreen.js:1714`,
  fired unconditionally on **every workout finish**, with no tier check at
  all. Workout logging itself is a **free-tier feature** (CLAUDE.md's
  free/Pro split: "Free: ... workout logging ..."). So:

  A user who was Pro, paired with someone, and then **lapsed to Free**
  (trial ended / subscription cancelled — `tier` is resolved live from real
  billing state per `proGate.js`, so this is an ordinary churn event, not a
  hypothetical) can no longer open `PartnerScreen` — it is fully `ProLocked`
  — and therefore has **no way to view the pairing, see the partner's ticks,
  cheer, adopt/leave a shared block, toggle the streak, or unpair.** But
  every time they finish a workout, `ActiveWorkoutScreen.js:1714` still
  computes their current-week state and pushes it into the (now
  UI-invisible-to-them) active partnership, and the sync layer still pulls
  and pushes that pair's rows on every cycle regardless of tier. **Their
  Pro partner keeps seeing normal ticks, cheers, and a live shared streak
  from the lapsed user, with nothing anywhere in the UI indicating the other
  side has lapsed** (no tier field exists to surface even if someone wanted
  to show it). The lapsed user's only way to regain any control over the
  pairing (see it, leave it, stop it) is to resubscribe to Pro. Deleting
  their account is the one route that unconditionally tears the pairing down
  regardless of tier (§11.5 handles the deletion path correctly, tier-blind
  by construction, because it operates on `auth.users` rows directly).

### 9.5 The free-cap-bypass loophole (multiple simultaneous partners a free user never sees)

`inviteVia(target)` (`PartnerScreen.js:102-137`) is called separately by each
of the three "send it directly" buttons — **Text, WhatsApp, Email** — all
rendered together, unconditionally, in the same screen state
(`:471-498`). Each tap independently calls `createPartnerInvite`
(`:105`), and `create_partner_invite` (§3.1) has **no check at all** for
existing invites/partnerships belonging to the same `member_a` — it simply
inserts a new `'invited'` row every time. If a user taps more than one of
these three buttons in the same sitting (a natural thing to do — "let me try
texting Sam, and also email Jo in case Sam doesn't reply") and **more than
one** of the resulting codes gets redeemed by a different person, the user
ends up with **multiple simultaneous `'active'` partnerships** naming them as
`member_a`.

Nothing in the redeem path enforces the free/Pro cap either:
`redeemPartnerInvite`/`redeem_partner_invite` (§3.2) checks self-redemption,
expiry, single-use, and blocks — **never** a cap, and never even looks at
the inviter's tier. The client-side `canAddPartner` gate
(`signals.js:65-67`) is consulted **only** by `usePartners.load()` to enable/
disable the *create*-invite buttons (`p.canAdd`, computed from
`activeCount` at load time) — since all three invites in this scenario are
created back-to-back **while `activeCount` is still 0** (none has been
redeemed yet), the cap never blocks any of the three taps.

Consequence for the user's own visibility: `pickPrimary`
(`usePartners.js:36-41`) always surfaces only the **most recently created**
active partnership as `rowState`'s subject. Any *earlier* partnership that
also went active becomes permanently invisible in the user's own
`PartnerScreen` — there is no list, no way to select it, no "End partnership"
reachable for it — **yet it stays fully live**: `writeOwnWeekSignals`
(`weekSignalWriter.js:76-100`) iterates **every** active partnership
(`active = partnerships.filter(p => p.status === 'active')`, then a `for`
loop over all of them, `:80-95`), so the user keeps silently pushing their
own week signal into all of the hidden partnerships too, and each of those
other people keeps receiving fully live ticks/cheers/streak from someone who
no longer has any way to see, manage, or end that specific pairing. This is
reachable by an ordinary free-tier user (given the multi-invite loophole
above is itself tier-independent) despite the feature's headline promise
being "free includes **one** training partner."

---

## 10. What each user sees of the other — consolidated

For a paired, active, non-resting pair, on `PartnerScreen`:
- The other person's derived label ("Your partner", per §5.4 — not their
  real name in the shipped UI).
- The other person's `ticksLabel` — "3 of 4" (relative to their own plan,
  clamped so `done` never displays above `planned` — `signals.js:12-17`) or,
  with no plan target, "N sessions this week" (session-count fallback).
- Whether the other person's current week is `'resting'` — rendered with a
  moon icon and the text "Resting this week", **never** a fail/miss word
  anywhere (pinned by `PartnerSurfaces.test.js:82,131`: the rendered text
  must not match `/missed|fail|broke/i`).
- The joint shared streak label (`sharedStreakLabel`,
  `sharedStreak.js:84-96`) — a plain integer count of weeks, or "Resting.
  Streak safe at N weeks.", or "Quiet week. Streak safe at N weeks.", or
  "Start a new run together?" after a 4-consecutive-quiet-week archive. Never
  a red/fail colour, never an exclamation mark, by explicit design comment
  (`sharedStreak.js:81-83`).
- Whether the other person cheered recently (`lastReceived`, a boolean-ish
  presence check — `"{name} cheered you recently."`, no timestamp/detail
  beyond that on-screen, though the underlying row does carry `sent_on`).
- The shared-training-block state, once migration 100 is live (§7): the
  block's name and proposed/active status only.

**Nothing else.** No workout log, no numbers behind the ticks, no historical
chart, no comparison of totals, no ranking, no leaderboard, no third party's
data (pairs are strictly 1:1; there is no group/team view of any kind
anywhere in the schema or UI).

---

## 11. Every edge case enumerated

### 11.1 Declined invite
There is no explicit "decline" action for an invitee. An invite that is
never redeemed simply expires after 7 days
(`migrate_081:306`, `created_at < now() - interval '7 days'`) — checked
lazily, only at the moment someone attempts to redeem an expired code (there
is no background job that flips `status` on expiry; an unredeemed invite
past 7 days just permanently fails redemption from then on). The only
*active* cancellation is from the **inviter's** side — "Cancel invitation"
while `rowState==='pending'` (`PartnerScreen.js:200-228`, confirmed via
`confirmUnpair()`), which calls the exact same `end_partnership` RPC as a
full unpair, just with adapted copy ("Cancel invitation?" / "Your invitation
will be withdrawn.") so cancelling a never-accepted invite never reads as
"ending" a relationship. The RPC's own membership check
(`migrate_100:183-187`) does not require `status==='active'`, so ending an
`'invited'` row works identically to ending an `'active'` one.

### 11.2 Unpair (either side, at any time)
`unpairPartner` (`service.js:117-127`) calls `end_partnership(_pair_id)`
(server RPC, member-only, SECURITY DEFINER). This is a **hard-won**
invariant: the migration history shows the *original* implementation only
set `status='ended'` via a bare UPDATE and relied on a comment claiming an
`ON DELETE CASCADE` handled the purge — `migrate_092`'s own header states
plainly: "A pre-existing comment in 081 + service.js wrongly claimed a
cascade did this; it never existed... left shared data past its stated
processing purpose (GDPR)." (`migrate_092_partner_end_purge.sql:1-11`). This
was tracked as "Partner BLOCKER #1: actually delete shared data on unpair" in
this repo's own build log — i.e. the deletion promise shown to users was, for
a period, **not actually true** until this migration shipped. The current RPC
(final shape in `migrate_100:169-200`) deletes `partner_week_signals`,
`partner_cheers`, and `partner_shared_blocks` for the pair, then marks the
partnership row `'ended'` (tombstone retained so the other side sees exactly
"Partnership ended", nothing more — no reason, no "who ended it"). Pinned:
`service.test.js:176-186` asserts the RPC is called, not a bare UPDATE.
Client-side, `usePartners.unpair` (`usePartners.js:114-122`) also clears the
**local** mirror of shared rows immediately on the unpairing device (rather
than waiting for the next pull), and the pull handler
(`sync/tables/partners.js:104-110`) propagates the same purge to the
**other** member's device the next time they sync (§8.3).

### 11.3 One user free, one Pro
Covered in full in §9.3 (free-tier invitee gets bounced to a generic Pro
paywall with the invite code silently dropped) and §9.4 (a Pro user who
lapses to Free loses all UI access to an existing pairing but keeps silently
contributing their week signal via the workout-finish path, since gating is
UI-route-only and both RLS and the sync layer are tier-blind).

### 11.4 Data changing after share
- **Streak toggle** (`streakEnabled`): set once, at invite-creation time only
  (`create_partner_invite(_streak_enabled)`); there is no UI anywhere to
  change it after pairing (confirmed: `streakEnabled`/`streak_enabled` only
  appears in the pre-pairing `Switch` and the create-RPC call across the
  entire `src/` tree). The invitee never sees or chooses this setting at all
  — whatever the inviter picked silently governs whether the joint streak
  section renders for both of them.
- **Shared-block name**: frozen at propose time, permanently disconnected
  from the live programme it was named after (§7.3).
- **Plan/target changes**: `computeCurrentWeekState`
  (`weekSignalWriter.js:30-70`) recomputes fresh from the user's *current*
  plan every time it runs, so a mid-week plan change simply changes what
  "planned" means going forward for that pair from the next push onward —
  there is no versioning or "your partner's target changed" notice on either
  side.
- **ED/wellbeing flag opening mid-week**: the very next signal write freezes
  `state` to `'resting'` (and forces `weekMet:true`) for that week, silently
  and indistinguishably from a planned deload, exactly as designed
  (§5.1, `weekSignalWriter.js:56-57`, pinned by
  `weekSignalWriter.test.js:38-44`). The partner cannot tell the difference,
  by design, and the cheer edge function separately downgrades **push**
  delivery to in-app-only for a recipient with an open ED flag regardless of
  who sent the cheer (`partner-cheer/index.ts:119-131`) — the sender is
  never told delivery was downgraded.

### 11.5 Block / leave
- **Leave (unpair)**: §11.2.
- **Block**: `blockPartner(userId, blockedId)` writes to `partner_blocks`
  (`service.js:95-107`), consulted only by `redeem_partner_invite`
  (§3.2) to make a future redemption from that person fail with the same
  opaque `invite_invalid`. **There is no "Block" button anywhere in the
  shipped UI** — `usePartners.js:124` exposes `p.block`, but a search of
  `PartnerScreen.js` for any call to `p.block`/`onBlock`/`handleBlock`
  returns nothing. The function is fully unit-tested
  (`service.test.js:168-174`) and reachable only by a future UI or a
  developer/support-invoked path, not by an end user today. Consistent with
  the migration's own framing ("there is no moderation surface beyond the
  pairing handshake itself," `migrate_081:9`) — no discovery surface means
  the blast radius of this gap is limited to repeat unwanted invites from an
  already-known contact, but it is nonetheless a genuinely unreachable
  safety primitive as shipped.
- **Ending a partnership does not block the other person.** `confirmUnpair`
  (`PartnerScreen.js:200-228`) calls only `p.unpair`, never `p.block` — so
  two people who end a pairing can freely re-pair with each other again
  later; there is no automatic cooldown or block on unpair.

### 11.6 Multiple simultaneous invites / hidden partnerships
Covered in full in §9.5 — a structural consequence of (a) three
simultaneously-available "send it directly" buttons each minting an
independent invite with no dedupe, (b) zero cap enforcement at
create-or-redeem time against *existing partnerships*, only against the
*current* `activeCount` at the moment the create button is pressed, and (c)
a single-primary-partnership UI model that can only ever display one active
pairing at a time, permanently hiding any others from their own owner while
`writeOwnWeekSignals` keeps them fully live.

### 11.7 Expired invite re-use attempt
Handled cleanly and atomically at the RPC (§3.2): `invite_code_hash` is set
to `NULL` on first successful redemption (so a second redemption attempt on
the *same* code fails the `member_b IS NOT NULL` check trivially, since the
lookup by hash would no longer even match), and the 7-day expiry is checked
independently. Both failure modes collapse to the same opaque
`invite_invalid` client-side.

### 11.8 Self-invite / self-redeem
Blocked server-side: `prow.member_a = uid` inside `redeem_partner_invite`
(`migrate_081:305`) — a user cannot redeem their own invite code.

### 11.9 Account deletion mid-pairing
Two independent, redundant paths both handle this (defence in depth):
1. **Primary**: the `delete-account` edge function
   (`supabase/functions/delete-account/index.ts:129-152`) — before deleting
   the `auth.users` row, it finds every partnership the deleting user
   belongs to, hard-deletes both members' week signals and cheers for those
   pairs, and marks the partnerships `'ended'`. Explicitly commented
   best-effort ("a failure here must not block the account deletion
   itself," `:134-135`) — so a failure in this step never blocks the actual
   deletion, at the cost of a theoretical (logged, non-fatal) chance the
   partner-teardown itself fails while the account still gets deleted.
2. **Fallback**: `delete_user_data()` RPC
   (`supabase/migrate_096_delete_user_data_completeness2.sql:158-189`), used
   only if the edge function is unreachable. Deletes both members' signals/
   cheers for every pair the user belongs to, deletes the user's own
   `partner_blocks` rows in **both directions** (as blocker and as blocked —
   matching what an `auth.users` row's own `ON DELETE CASCADE` would have
   done), and sets whichever of `member_a`/`member_b` was this user to
   `NULL` with `status='ended'`, `invite_code_hash=NULL` — reproducing
   exactly what the `ON DELETE SET NULL` foreign key would have produced,
   so **the surviving partner sees only "Partnership ended", identical to
   the manual-unpair and app-lapse cases — a deletion is deliberately
   indistinguishable from a departure** ("no death-vs-departure leak",
   stated explicitly in both `migrate_081:33-39` and `migrate_096:25-36`).
   `partner_shared_blocks` is **not explicitly listed** in this fallback RPC
   (the fallback predates migration 100 by version number, though 100 is a
   later migration number so it postdates 096's *authoring*) — it would
   still be removed via the `pair_id ON DELETE CASCADE` FK
   (`migrate_100:61`) once the partnership row itself gets its member column
   nulled and marked ended, but **only if a subsequent revision of
   `delete_user_data` or the CASCADE actually reaches it** — worth the
   synthesis session noting as an open thread rather than a settled fact,
   since this teardown did not verify empirically whether the FK cascade
   fires on an `UPDATE ... SET member_a = NULL` (it should not — cascades
   fire on DELETE of the referenced row, and the partnership row is
   `UPDATE`d, not deleted, in this fallback path; `partner_shared_blocks`
   only cascades on an actual `partnerships` row delete). **This reads as
   the same class of gap migration 092 itself was written to fix
   ("an UPDATE never triggers a cascade")** — flagged here for the record,
   not fixed, per this task's read-only scope.

---

## 12. Notifications tie-in (for completeness, not a new mechanic)

Two, and only two, partner-originated pushes exist, both locked to 1-per-topic-
per-day (`docs/NOTIFICATIONS_LOCKED.md:232,267`):
- **Cheer received** — fires once per cheer id, only while the cheer is
  "fresh" (<48h old, so a backlog synced days later is "history, not news" —
  `partnerBeats.js:19,58-64`).
- **Shared streak kept** — fires only when the run **grows** past a
  watermark and only once the pair has ≥2 weeks together; "a lapsed or
  shrinking run never notifies (lapses are an absence, never a shown state —
  the locked streak rule applies to pushes too)" (`partnerBeats.js:66-78`).

Both gate on, in order: platform (`web` no-ops), an **open ED/wellbeing flag
silences everything** (`scheduler.js:1364-1365`, "the partner surface freezes
benignly; pushes must not poke at it"), a preferences toggle (default on),
quiet hours, and the shared `PARTNER_CHEER` event push-budget slot (currently
the lowest-priority budget slot per `docs/wave5-plan-2026-07-02.md:77`,
"partner_cheer is currently lowest, 8th").

---

## 13. Summary table — constraints this feature already satisfies, and where it strains them

| Constraint (from the research brief) | How this feature actually holds it, in source |
|---|---|
| No AI, deterministic | Entirely pure functions (`computeWeekState`, `computeSharedStreak`, `jointWeekState`) — no I/O, no LLM, no randomness anywhere in the partner logic layer. |
| ED-safety must be inheritable | Inherited exactly, at the single seam (`computeWeekState`) and again at write time (`weekSignalWriter.js:56-57`) and again at push-delivery time (`partner-cheer/index.ts:119-131`) — three independent layers all freeze/suppress the same way. |
| No comparison/ranking/shame | No raw numbers cross at all (§5.1); ticks are relative-to-self, not cross-user comparable; resting/quiet weeks are structurally incapable of rendering as a fail (source-guarded copy + tests). No leaderboard, no ranking, no group view exists anywhere in the schema. |
| GDPR / Article 9 derived-only sharing | The share payload is schema-enforced derived-only via a source-level regression guard (§5.1) — the strongest form of this precedent in the codebase. **But** the specific partner-sharing consent capture the migration's own comment claims exists (§6) does not. |
| Stranger-surface safety/moderation | N/A in the strict sense — there is no discovery, no strangers; pairing is out-of-band-only. But even within that lower bar, the one moderation primitive that does exist (`blockPartner`) has **no UI entry point at all** (§11.5) — a real gap against the spirit of "any surface needs a mandatory... blocking model," even though the surface here is invite-only. |
| Free/Pro gating absolute | Enforced only at the **UI route layer** (`withProGuard`), never at the data layer (RLS/sync are tier-blind) — which is exactly what produces the lapsed-partner (§9.4) and multi-invite-loophole (§9.5) gaps. The Pro "3 partners" capability is real in the pure-logic layer but currently unreachable in the shipped screen (§9.1). |

---

## 14. Open threads for the synthesis session (facts, not recommendations)

- The single biggest fact for "does this create genuine attachment": the
  entire mechanic is exactly **one derived boolean-ish signal per week** —
  attendance-vs-own-plan — plus a joint streak built from that same signal,
  plus one cheer/day. There is categorically no other information exchange.
  Whatever retention this produces (Duolingo Friend Streak is the cited
  precedent, `docs/bp-partner-system-rebuild.md:20-23`, not independently
  re-verified in this teardown) rests entirely on that one signal.
- The shared-training-block mechanic (§7), despite its framing, is a shared
  **label with a status flag**, not a shared plan — worth weighing against
  what a genuinely shared/synced training block would need
  (`docs/wave5-plan-2026-07-02.md:52-57` itself names the missing
  infrastructure: no stable cross-user programme identity, no per-session
  schedule writer).
- Every gap enumerated in §9 and §11 traces back to one root cause: **tier
  gating lives only at the UI-route layer**; the data layer (RLS, sync,
  RPCs) has no concept of tier at all. Any future connection surface that
  reuses this pattern inherits the same class of edge cases unless the data
  layer itself is made tier-aware, or the UI is made robust to
  multi-partnership/tier-transition states.
- `PartnerRow` (§4.2) is a fully-built, fully-tested, currently-unmounted
  component — a second at-a-glance surface for the mechanic already exists
  in the codebase if a future placement decision wants it.
