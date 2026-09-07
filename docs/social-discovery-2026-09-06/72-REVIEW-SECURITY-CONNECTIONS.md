# 72 — REVIEW: connections, messaging and discovery (hostile, read-only)

Reviewed 2026-09-07 against `70-DISCOVERY-BLUEPRINT.md` §1, §2, §3, §5, §11 and
`40-DECISIONS.md` SD-20..SD-32; CLAUDE.md §2. The first review and its landed
fixes are `52-REVIEW-SECURITY-PRIVACY.md`; the same classes of defect were
re-tested against the new code and are marked where they recur.

Read in full: `supabase/migrate_161_community_connections.sql` (3,035 lines,
every helper and RPC body), `supabase/functions/community-notify/index.ts`,
`src/lib/community/{connections,messages,findPeople,trainingProfile,profile,
transport}.js`, plus the 160 helpers 161 depends on
(`_community_can_view`, `_community_can_view_post`,
`_community_can_view_programme`, `_community_minor`, `_community_rate_check`,
`_community_clean_text`, `community_block`/`unblock`/`remove_follower`,
`community_dimension`) and `CommunityTrainingProfileScreen.js`.

The shape is right and materially better than 160 at first landing. RLS on with
no policy and grants revoked on all three new tables (`:295-307`);
`search_path` pinned and identity from `auth.uid()` on every function; the
review-1 "may I see this PERSON vs may I see this THING" lesson is applied
correctly in the two places it matters most — `_community_message_json:727-737`
re-asks the POST/PROGRAMME predicate for the VIEWER, and
`community_send_message:2452-2463` asks it for the sender. Message bodies never
reach a push. The findings below are missed predicates and one stale flag, not
holes in the model.

---

## Findings

| # | Sev | Site | Finding |
|---|-----|------|---------|
| 1 | **P0** | `migrate_161:1182, :2437, :674` | Minors can RECEIVE connection requests and messages: the other-side gate is a stale stored boolean nothing refreshes |
| 2 | **P1** | `migrate_161:1791-1795` | `find_people('programme')` returns any programme's title past visibility, owner status and blocks |
| 3 | **P1** | `migrate_161:2588` + `migrate_160:1958` | The 30-day re-request bar is erased by block then unblock |
| 4 | **P1** | `community-notify:254-290` | `connect_request` / `connect_accepted` have no collapse and no rate rail: 10-minute push replay |
| 5 | **P1** | `migrate_161:1818-1822, :1985` | `partners` mode ignores `partner_prefs.same_gym_only` and counts globally |
| 6 | P2 | `migrate_161:1818` | `find_people('programme')` ignores `show_programmes` |
| 7 | P2 | `migrate_161:2215-2262, :2071-2091` | Gym label and member enumeration: any area key, any gym key, no profile needed, no rail |
| 8 | P2 | `migrate_161:1571-1577` | `tp_programme_key` accepts any uuid: unearned "On the same programme" |
| 9 | P2 | `migrate_160:1840` | `community_remove_follower` leaves a live connection with one follow edge |
| 10 | P2 | six RPCs | No rate rail on the expensive reads and the settings writes |
| 11 | P3 | `migrate_161:674, :701, :431` | Three helpers declared, granted, never called (review-1 finding 3 pattern) |
| 12 | P3 | `migrate_161:2361, :718-765` | Removal-closed conversation still readable by id; unviewable `ref_id` still returned |
| 13 | P3 | `database.js:3888`, `trainingProfile.js:396` | `ws.*` selects weight into memory; share-settings keys unguarded on a null uid |

---

### 1. P0 — an under-18 account can receive connection requests and messages

`community_connect:1182` and `community_send_message:2437` both read:

```sql
IF public._community_caller_is_minor(v_uid) OR v_them.is_minor THEN
```

The CALLER side is fresh: `_community_caller_is_minor:688` is the stored boolean
**OR** `_community_minor(_uid)` re-derived from the date of birth. The OTHER
side is the stored `community_profiles.is_minor` column alone, and that column
is written in exactly one place — `community_upsert_profile:1064` — so it is
only ever as current as the last time that person SAVED their profile.

**Exploit path.** No attacker action is needed, which is why this is P0 rather
than a hardening note. A 15-year-old creates a Community profile before
`user_body_profile.date_of_birth` has reached the cloud (or enters/corrects
their date of birth afterwards, which onboarding allows). Their row carries
`is_minor = false` permanently. An adult's `community_connect` passes; the minor
accepts (`community_respond_connect:1257` tests minor status **not at all**);
`community_send_message` passes for the adult, and they are in a private 1:1
text channel with a child. The minor is refused only when THEY send — the
asymmetric half of a rule written as "never send or receive". They are also
listed in every Find people door and the gym summary, all of which filter on the
same stale `p.is_minor = false` (`:1814`, `:2107`, `:2035`, `:2242`).

`_community_other_is_minor:674` exists for exactly this question, is revoked and
granted in Part 15, and **is never called anywhere in the file**; its body would
not have helped, because it reads the same stored boolean. Its comment states
the design intent: the other person's date of birth "is never read from here
(data minimisation)". That intent is right and should be kept.

**Expected** (blueprint §1, SD-32): "Minors: never send or receive connection
requests or messages (server-enforced)."

**Minimal fix, with no cross-user date-of-birth read.** `community_get_me:840`
already derives the caller's status fresh (`'is_minor', public._community_minor(v_uid)`)
and already UPDATEs that person's own row for `last_active_at:894`. Write the
flag back in the same statement, so every hub open self-heals the column:

```sql
UPDATE public.community_profiles
   SET last_active_at = now(),
       is_minor = public._community_minor(v_uid)
 WHERE user_id = v_uid;
```

Then add the minor test to `community_respond_connect` (both sides), and give
`_community_other_is_minor` a caller or delete it. Belt and braces on the
receive side would be `OR public._community_minor(_target)` in the two gates;
that reads the target's date of birth inside a SECURITY DEFINER boolean and
never returns it, which is the same posture `_community_minor` already has for
the caller. Either is a founder-visible call on minimisation versus certainty —
the fresh derivation on the recipient is the safer of the two.

### 2. P1 — the programme door leaks any programme's title

`community_find_people:1791-1795`, the `_mode = 'programme'` branch:

```sql
v_key := v_me.tp_programme_key;
...
SELECT g.title INTO v_label FROM public.community_programmes g
WHERE g.id = v_key::uuid AND g.status = 'visible';
```

No visibility predicate, no owner-status predicate, no block predicate. This is
review-1 finding 4 re-created: `community_dimension:3288-3294` was fixed to gate
the identical lookup with `_community_can_view_programme` and this new call site
does not.

**Exploit.** `community_update_training_profile({"tp_programme_key": "<uuid>"})`
validates the uuid SHAPE only (`:1573-1577`) — it never checks the programme
exists, is visible, or is viewable by the caller. Set it to a `followers`-only
programme, or one whose owner has blocked you, then call
`community_find_people('programme')`: `label` comes back with that programme's
`title`, which is user-authored free text. The function's own header (`:1738-1741`)
claims safety because there is no client key parameter; the training-profile
write is that parameter by another route.

**Fix.** Gate the label:

```sql
ELSIF v_key IS NOT NULL AND public._community_can_view_programme(v_uid, v_key::uuid) THEN
  SELECT g.title INTO v_label FROM public.community_programmes g WHERE g.id = v_key::uuid;
```

and reject a non-viewable programme id at write time (finding 8).

### 3. P1 — block then unblock erases the 30-day re-request bar

`community_block:2588` deletes the connection row in whatever state it was:

```sql
DELETE FROM public.community_connections WHERE user_a = v_a AND user_b = v_b;
```

`community_unblock` (migrate_160:1958) deletes only the block row. Nothing
restores the connection row, and `community_connect:1228` reads the bar from
that row's `declined_at`.

**Exploit.** A requests B. B declines (`declined_at = now()`, silent, A still
sees "Requested"). A calls `community_block(B)` then `community_unblock(B)` —
two RPCs, neither rate-railed (review-1 finding 18, still open) — and the
declined row is gone. `community_connect` now finds no row and the request lands
again immediately, with a fresh note and fresh reasons. Bounded only by the
connect rail, 10 a day new / 30 established. Blueprint §1's "a declined or
withdrawn request cannot be re-sent to that person for 30 days" is a harassment
control, and blocking your own target is an act the harasser can perform freely.

**Fix.** In `community_block`, clear `requested` and `connected` rows but
preserve a `declined` one:

```sql
DELETE FROM public.community_connections
 WHERE user_a = v_a AND user_b = v_b AND state <> 'declined';
UPDATE public.community_connections
   SET state = 'declined', declined_at = coalesce(declined_at, now())
 WHERE user_a = v_a AND user_b = v_b AND state <> 'declined';
```

(order reversed: update first, then delete the non-declined remainder), or keep
the bar on a row `community_block` does not touch.

### 4. P1 — the two connection push kinds can be replayed for ten minutes

`community-notify:281-289` verifies `connect_request` by finding the connection
row with `requester_id = actor`, `state = 'requested'` and `created_at` inside
the ten-minute window; `connect_accepted` uses `responded_at` the same way. Both
are correct proofs and neither is a rate limit. There is no per-actor rail
anywhere in this function, and the message collapse at `:455-466` is the only
throttle in the file — it applies to `kind === 'message'` only.

**Exploit.** Send one connection request, then POST `community-notify`
`{kind:'connect_request', target_user_id:<B>}` in a loop. Every call re-proves
against the same row and fires "@A wants to connect" at B, hundreds of times
inside the ten-minute window, at any hour (quiet hours are still device-side —
review-1 finding 6, unresolved and now also true of `community_message`).
Review-1 finding 7 prescribed both a recency window and "a per-actor rate rail
before the `send-push` call"; the recency half landed (`:240-253`), the rail did
not, and the two new relationship kinds inherit the gap.

**Fix.** Before the `send-push` fetch, insert a `community_rate_events` row with
the service role keyed on actor + kind + target and refuse over a bound; or give
the connection kinds a collapse stamp of their own, as `message` has.

### 5. P1 — "Open to training together" ignores the preference it stores

`community_set_partner:1625` validates and stores `partner_prefs` including
`same_gym_only` (`:1810-1813`). `community_find_people` never reads
`partner_prefs`: the `partners` candidate scan (`:1821`) and the count
(`:1990`) filter on `p.open_to_partner = true` alone.

**Exploit path (consent, not a leak).** A person switches the flag on and sets
"same gym only" because they do not want strangers from other towns asking to
train with them. They are listed to every caller in the country, with the reason
"Both open to training together", and the count is a global count that the
client renders as `${n} in your area` (`findPeople.js:143`). SD-25: "opt-in flag
with preferences" — the preferences are stored and never honoured.

**Fix.** Add to both the scan and the count:

```sql
AND (_mode <> 'partners'
     OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
     OR (v_me.gym_key IS NOT NULL AND p.gym_key = v_me.gym_key))
```

and either restrict the `partners` count to the caller's area/gym or change the
client line to match what is counted.

### 6. P2 — the programme door ignores "Show which programmes I use"

`community_programme_people:2036` correctly requires `p.show_programmes = true`
and `_community_can_view_programme` (`:2019`). `community_find_people('programme')`
matches on `p.tp_programme_key` alone (`:1818`) and requires neither. Blueprint
§7 says the hub's "On my programme" row uses the `community_programme_people`
list; two lists with different consent rules answer the same question. A person
who switched the toggle off is still listed by programme with the reason "On the
same programme". Fix: add `AND (_mode <> 'programme' OR p.show_programmes = true)`
to the scan and the count.

### 7. P2 — gym enumeration

`community_gym_suggest(_area_key, _prefix)` takes the area key from the CALLER
(`:2224-2229`) and falls back to their own only when it is null, so any signed-in
account can typeahead every gym label and member count in any town in the
country. `community_gym_summary(_key)` takes any gym key, requires no Community
profile (no `_community_require_profile` call), has no rate rail, and returns 20
profile cards, 20 programme tiles and 10 posts. Chain the two and the public
directory is walkable by area. Each individual row is public-profile data and
the folded prefix cannot carry a LIKE wildcard (`_community_fold` strips to
`[a-z0-9 ]`), so this is enumeration rather than a leak — the same class as
review-1 finding 16, which was closed for `community_check_handle`
(`migrate_160:1438` now carries a rail) and is re-opened here.
Fix: rate-rail both, and refuse an `_area_key` that is not the caller's own.

Two smaller notes in the same function: the label lookup (`:2093`) ignores
blocks, and `by_time_band` (`:2139-2153`) can return `count: 1`, which names
when one identifiable person trains. Neither adds anything the member's own card
does not already carry (members are `visibility = 'public'`, so
`_community_profile_card` emits their `tp_*` bands anyway), so no incremental
leak — but "nothing precise" (SD-27) reads oddly beside a count of one.

### 8. P2 — `tp_programme_key` is unvalidated beyond its shape

`community_update_training_profile:1571-1577` accepts any uuid. Besides finding
2, this puts a person in the `programme` door for a programme they have never
used, carrying the fixed reason "On the same programme" (`:1836`) — a claim the
product makes on their behalf that is not true. Fix: require
`_community_can_view_programme(v_uid, v_prog::uuid)` and either a
`community_programme_uses` row or ownership, else store null.

### 9. P2 — removing a follower leaves a live connection

`community_unfollow:2609` correctly removes the connection and closes the
conversation when the two are connected. `community_remove_follower`
(migrate_160:1840, not re-issued by 161) deletes the follow edge and nothing
else. After it, the pair is still `connected`: the card says "Connected"
(`_community_connection_state:623`), messaging still works, and blueprint §1's
"Connected implies following both ways" is false. Fix: re-issue
`community_remove_follower` with `community_unfollow`'s connection branch, or
refuse it for a connection with copy that says what it would do.

### 10. P2 — rate rails

Present and correctly ordered where they exist: `connect` (`:1235`, after
validation and after the idempotent early returns, so a refused or repeated
request costs nothing) and `message` (`:2466`, before the conversation insert).
Absent from `community_respond_connect`, `community_update_training_profile`,
`community_set_partner`, `community_set_connect_from`,
`community_set_show_programmes`, `community_list_connections`,
`community_gym_summary`, `community_gym_suggest`, and — most expensively —
`community_find_people`, which scans up to 300 profiles and runs four correlated
subqueries per row (`:1857-1878`), unbounded per caller.

### 11-13. P3

- `_community_other_is_minor(uuid)` (`:674`), `_community_conversation_id(uuid,uuid)`
  (`:701`) and `_community_tp_age_bands_list()` (`:431`) are declared, revoked,
  granted and never called; the age band is built from an inline `CASE`
  (`:1600-1607`) rather than from the list the header calls "the single
  definition". A declared-and-never-read safety helper is exactly the shape of
  review-1 finding 3 (`v_vis`).
- `community_messages:2361-2367` serves a conversation closed by a REMOVAL to a
  participant holding the id (a block is correctly refused at `:2371`, and
  `community_get_me:880` and `community_conversations:2308` both exclude closed
  and blocked). Documented at `:2338-2340`, but "the conversation disappears for
  both" (checklist 21) is then a client-side truth only.
  `_community_message_json:753-754` returns `ref_kind`/`ref_id` even when the ref
  is not viewable; the tile itself is correctly withheld, so what leaks is a uuid.
- `getWorkoutSetsSince` selects `ws.*` (`database.js:3888`), so weight, reps and
  RPE reach memory; `deriveTrainingProfile:295-306` reads only `exerciseId`,
  `workoutId` and `createdAt`, and nothing but ids leaves the device. SD-30 says
  "timestamps and exercise ids only" — a projected select would make that
  structural rather than a matter of care.
  `readShareSettings` / `writeShareSettings` / `clearTrainingProfileState`
  (`trainingProfile.js:396-412`) do not guard `!uid`, so `tpShareKey(null)`
  resolves to a shared `..._unknown` key; unreachable today because the only
  caller returns early (`CommunityTrainingProfileScreen.js:117`), but the `me`
  cache guards this (`profile.js:76, 88, 96`) and this does not.
- `connect_from` defaults to `followers` for a followers-only profile
  (`:594-611`), which makes SD-20a's "a Connect request to a followers-only
  profile counts as the follow request too" unreachable by default. Safe
  direction; not what §1 describes.
- `syncTrainingProfile` is called only from `CommunityTrainingProfileScreen`;
  §3's "recomputes on hub open at most once a day" is not wired.

---

## Checklist

| # | Area | Result |
|---|------|--------|
| 1 | Connections: minors, `connect_from`, the 30-day bar, accept/remove/block symmetry | **FAIL** — 1, 3, 9. Otherwise strong: `connect_from` cannot be bypassed (`:1187-1194` requires an ACCEPTED follow); reasons are a closed set capped at two (`:1197-1208`); the note is capped at 120 chars and passed through `_community_clean_text` (`:1211-1215`) and never reaches a push; withdraw sets `declined_at` so withdraw-and-resend is barred (`:1332`); accept-creates-mutual-follows is authorised by §1; `respond_connect` deletes a closed conversation rather than reopening it (`:1305`) |
| 2 | Messaging: membership, connection state, reopening, refs, blocks, limits | **PASS with P3** — send requires `connected` (`:2439`), an open conversation (`:2475`) and a viewable ref for the SENDER (`:2452-2463`); `_community_message_json` re-checks the ref for the VIEWER; body is 1..1000 CHARACTERS (`length()`, `:2445`), keyword-filtered; read/mark-read/delete are membership- or sender-gated; blocked conversations are invisible in the list, the unread count and the message page. Finding 12 |
| 3 | Training profile bands: closed sets, minors, opt-in, card gating, reason strings | **FAIL** — 2, 8. Every band is validated against the Part 5 lists; the age band is derived server-side from the caller's own row with `< 18 → NULL` and a `_community_caller_is_minor` gate (`:1586`, `:1602`); absent keys are NULLed, so a toggle off is an erasure; `_community_profile_card:820-827` gates every `tp_*` on `_community_can_view`; `find_people` candidates are `visibility = 'public'` only, so no reason string can state a band the card would hide; rules version 2 blocks band writes from a profile that has not re-consented (`:1509`) |
| 4 | Gym summary and suggest: enumeration, small counts, minors | **FAIL** — 7. Minors are excluded from members (`:2107`), suggestions (`:2242`) and the label lookup by the `visibility = 'public'` predicate that 160 forces on every minor; posts are re-checked with `_community_can_view_post` (`:2189`) |
| 5 | community-notify: spoofing, collapse columns, blocks and mutes, preferences, ED, push data | **FAIL** — 4. Everything else holds: actor from the JWT only; each branch proves BOTH parties; `a_last_push_at`/`b_last_push_at` live on an RLS-on, grant-revoked table and no RPC writes them; blocks both directions and mutes on the connection and message kinds; `community_message` is its own category with its own toggle and the CHECK widened to store it; ED flag fails closed on `flagErr`; the 15-minute collapse is correct (stamped only after the send, and released once the recipient reads); `conversation_id` goes only to a verified participant and no body ever travels |
| 6 | Client: transport gates, caches, log contexts, on-device derivation | **PASS with P3** — `getSupabaseClient` appears only in `transport.js:29,151`; all six new modules go through `callCommunity`, so the wipe / consent-fail-closed / live-session gates are unskippable; the `me` cache is uid-keyed and guards `!uid`; no log context in any new module carries a body, note, handle or reason (`transport.js:175,180` log a code and the error only). Derivation reads exactly four device functions — `getCompletedWorkoutStartTimestamps`, `getWorkoutSetsSince`, `getAllExercises`, `getActivePlan` — plus `userProfile.experience` from the store and the `myProgrammes` RPC for the programme key; nothing from nutrition, body metrics, Progress Scan, injuries, coaching or check-ins (SD-30 holds). Finding 13 |

---

## Verdict

**NOT SHIPPABLE as it stands, on finding 1 alone.** The other-side minor gate is
a boolean that nothing in the system ever refreshes, so the child-safety rule
SD-32 calls "server-enforced" is enforced on the sending half only. The fix is
one assignment in `community_get_me` plus the missing test in
`community_respond_connect`, and it needs a founder-visible ruling on whether
the receive-side gate should also re-derive from the target's date of birth.

Findings 2, 3, 5 are each a single-site predicate; finding 4 is the half of
review-1 finding 7 that was never applied. Nothing here needs the model
re-architected: the "may I see this THING" discipline the first review asked for
has genuinely been learned, and the two hardest surfaces in this campaign — the
message ref tile and the profile card's band gating — are correct.
