# Security hunt — auth / RLS / privilege / data-exposure / client-trust

Surface: cross-user access, tier/consent bypass at the data layer, secrets/keys,
PII exposure, session/auth. READ-ONLY. Each finding is reproduced against
specific code with a concrete attack.

**VERDICT ON CROSS-USER DATA ACCESS:** No cross-user READ or WRITE of another
user's rows was found. Core data tables (workouts, sets, body_metrics,
weight/food, coach_outputs, consent_log, engine_telemetry, ed_pattern_flags) are
all RLS-scoped `auth.uid() = user_id`; partner tables are pair-scoped and the
partner RPCs are SECURITY DEFINER with `auth.uid()`/membership checks and
search_path pinned. Tier columns are server-owned (protect-tier trigger + GUC).
The real holes are an **abusable partner-cheer rate limit (push spam)** and two
**client-only gates** (lapsed-tier signal push, partner-sharing consent) that the
server does not re-check.

---

## [MAJOR][FOUNDER-DECISION] supabase/functions/partner-cheer/index.ts:110,131 — daily cheer rate-limit is bypassable via client-controlled `sent_on`, enabling push spam / harassment of a partner

**Trigger.** `sentOn` is taken verbatim from the request body
(`const sentOn = body.sentOn || new Date().toISOString().slice(0, 10)`) and
inserted as `partner_cheers.sent_on`. The only rate limit is the DB constraint
`UNIQUE(pair_id, sender_id, sent_on)` (migrate_081:190), which blocks duplicates
**per distinct sent_on value**, not "one per real day". `service.js sendCheer`
sends only `{ pairId }`, but a modified/hand-rolled client calls the edge
function directly with the caller's own JWT and iterates `sentOn` over arbitrary
dates (`2020-01-01`, `2020-01-02`, …).

**Failure.** Each call with a fresh `sentOn` inserts a new cheer row (RLS passes
— caller is an active member) and fans out a **push notification** to the
partner via `send-push`. The stated "one cheer per partner per local day"
guarantee (migrate_081:182-183) is defeated; an attacker can push-spam their one
paired partner arbitrarily many times in a burst. Mitigations that exist:
recipients with an open ED/wellbeing flag downgrade to in-app-only (no push), and
the target can block/unpair — but a non-flagged partner gets spammed.

**Minimal fix (FOUNDER-DECISION — notification/rate-limit behaviour).** Do not
trust client `sent_on` as the uniqueness key. Clamp it server-side to the server
date (or reject values outside server-UTC ±1 day) before insert, keeping the
local-midnight intent within a bounded window. Touches the deliberate
"local-day" design in the function header, so founder call.

---

## [MINOR][FOUNDER-DECISION] src/lib/partners/tierGate.js + migrate_102 (s4) — lapsed-tier (Free) partner signal push is enforced client-side only; RLS is tier-blind

**Trigger.** `isLapsedPartner()` reads the local store tier and the two push
paths (weekSignalWriter / sync/tables/partners) mute a churned user's outbound
state to `resting`. The module docstring states the constraint plainly: "RLS and
the sync layer are tier-blind… There is no tier/entitlement column on any partner
table". migrate_102 s4 confirms the schema "cannot enforce the free=1 line" and
enforces only an absolute ceiling of 3 active pairs.

**Failure.** A Free (lapsed-from-Pro) user with a tampered/old client, or anyone
calling `partner_week_signals` upsert / `redeem_partner_invite` directly, keeps
pushing live `training` ticks into a pairing after their entitlement ended, and
can hold up to 3 concurrent partnerships despite the Free=1 product rule. This is
a Pro-gate-at-the-data-layer bypass, though the data involved is the user's OWN
derived attendance signal to their OWN partner (no third-party leak).

**Minimal fix (FOUNDER-DECISION — requires a schema/entitlement decision).**
Either add a server-checkable entitlement (tier column or a SECURITY DEFINER
signal-write RPC that consults `users_profile.tier`), or accept the client-only
gate as the documented posture. Both are founder calls (schema + monetization).

---

## [MINOR][FOUNDER-DECISION] src/lib/partners/service.js:84 + migrate_081/102 redeem_partner_invite — partner-sharing consent is enforced only by client ordering, never server-side

**Trigger.** In `redeemPartnerInvite`, the app records the `partner_sharing`
consent AFTER the RPC succeeds and rolls the pairing back if the consent write
fails (fail-closed **in the client**). The server RPC `redeem_partner_invite`
activates the partnership and permits `partner_week_signals` writes with no check
that a `consent_log` row exists.

**Failure.** A direct `redeem_partner_invite` + `partner_week_signals` upsert
(hand-rolled client / API call) begins sharing derived health-adjacent
attendance data with **no consent_log record at all**, defeating the "no sharing
without a recorded consent" promise (Article 9 posture). No cross-user leak, but
a GDPR consent-provenance gap.

**Minimal fix (FOUNDER-DECISION — consent/GDPR + schema).** Gate signal writes /
redemption on an existing `partner_sharing` consent row server-side (RLS
predicate or a DEFINER precondition). Consent/Article-9-adjacent, so founder
call.

---

## [MINOR][FOUNDER-DECISION] migrate_081/102 redeem_partner_invite — no server-side rate limit on invite-code redemption (defence-in-depth)

**Trigger.** `redeem_partner_invite(_code)` is `GRANT EXECUTE … TO
authenticated` and looks up by `sha256(code)`. Codes are 10 uppercase hex chars
(~40 bits). Any authenticated user may call it repeatedly with guessed codes;
there is no attempt counter or throttle.

**Failure.** Brute-force pairing with a stranger. In practice infeasible: 2^40
space, codes live only 7 days AND only while a pending invite exists, so the live
set is minuscule — but there is no server-side backstop, and success yields a
partnership plus the inviter's first name.

**Minimal fix (FOUNDER-DECISION).** Add a per-caller redemption attempt throttle
(e.g. count recent failed redeems), or accept the entropy+window as sufficient.
Low priority.

---

## Peripheral (out of security surface, flagged for triage)

**[correctness, SAFE-FIX] supabase/functions/partner-cheer/index.ts:136 — reads
a non-existent `profiles` table.** The schema uses `users_profile` (no `profiles`
table/view exists anywhere in `supabase/`). The `.from('profiles')` select
silently returns null, so `senderName` always falls back to `'Your partner'` and
the cheer push never shows the real first name that migration 102 went to lengths
to snapshot. Functional bug, not a security hole. Fix: `.from('users_profile')`.

---

## Cleared (checked, not vulnerable)

- **Tier/privilege escalation:** `protect_users_profile_tier` (migrate_068/070)
  reverts client writes to `tier` AND all trial/entitlement columns unless the
  transaction-local `app.allow_tier_change` GUC is set, which only the SECURITY
  DEFINER RPCs set (a PostgREST client cannot). `upgrade_tier` rejects any
  non-`free` target from the client; `upgrade_tier_for_user` /
  `cascade_advance_due_users` are `REVOKE … FROM authenticated`. No client
  self-grant of Pro.
- **Secrets/keys:** no service-role key, signing secret, or credential committed
  in `src/` or `app.json`. Supabase URL/anon key and USDA key come from
  `EXPO_PUBLIC_*` env only. Service-role key exists only in Edge Functions
  (`Deno.env`). `send-push` verifies the service-role bearer in **constant time**
  (timingSafeEqualStr). No client can call it.
- **SQLCipher key (dbCrypto.js):** 256-bit random per device in SecureStore
  (AFTER_FIRST_UNLOCK), never logged (logError calls carry only stage/attempt),
  never synced. `PRAGMA key = '${key}'` interpolates an internally-generated
  64-hex value, not user input — no injection. Fail-safe open path preserves data
  and never bricks.
- **PII to Sentry:** `sentryScrub.js` redacts the locked weight/macro/measurement
  key patterns, sensitive table-name substrings, photo paths and base64 images;
  strips `event.user` to `{ id }` only (drops email/username/ip). Runs in
  `beforeSend`/`beforeBreadcrumb`. `errorLog.js` redacts token/secret keys.
  engine_telemetry payloads are unvalidated free-form jsonb but land only in the
  user's OWN RLS-scoped row in EU-Dublin (first-party, not a third-party leak),
  and the client transport scopes each flush to the live session uid.
- **Cross-user RLS:** all core tables `auth.uid() = user_id` with matching WITH
  CHECK (migrate_005/007). Partner reads require an ACTIVE pair with the caller
  as a member; partner writes require `auth.uid() = user_id`/`= sender_id`/
  `= proposed_by`. Shared-block adopt is RLS-pinned to the non-proposer with
  column-level grants (status/updated_at only). The two `USING (true)` policies
  are read-only on shared reference tables (`foods` catalogue, `pricing_config`)
  — no user data.
- **Session/auth:** telemetry flush derives uid from the live session and scopes
  the push so another account's leftover rows can't be misattributed;
  `end_partnership` / `create/redeem_partner_invite` all check `auth.uid()` and
  membership and cannot be driven with a spoofed user-id argument (no user-id
  argument is trusted; `upgrade_tier_for_user`'s user-id arg is service-role-only).

---

### Count by severity
- blocker: 0
- major: 1 (partner-cheer rate-limit bypass / push spam)
- minor: 3 (lapsed-tier client-only gate; consent not server-enforced; no redeem throttle)
- peripheral/correctness: 1 (partner-cheer wrong table name)
</content>
</invoke>
