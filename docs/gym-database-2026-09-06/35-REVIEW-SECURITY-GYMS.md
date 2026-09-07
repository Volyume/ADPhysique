# 35 — REVIEW: the UK gym directory (hostile, read-only)

Reviewed 2026-09-07 against `20-BLUEPRINT.md` GD-01, GD-03, GD-06, GD-07,
GD-09..GD-14 and CLAUDE.md §2 (ED-safety, GDPR/Article 9, EU residency,
schema discipline). Same format as
`docs/social-discovery-2026-09-06/72-REVIEW-SECURITY-CONNECTIONS.md`; the
Status column is for the fix lane.

Read in full: `supabase/migrate_162_gym_directory.sql` (1,780 lines, every
helper, RPC body, policy loop and the acceptance check), plus the helpers it
reuses from `migrate_160_community.sql` (`_community_fold:686`,
`_community_rate_check:869`, `_community_caller:1096`,
`_community_require_profile:1114`, `_community_blocked_terms:568`,
`community_is_moderator:1445`, the Part 2 RLS loop `:452-466`) and
`migrate_161_community_connections.sql` (`community_upsert_profile:976-1150`,
`_community_profile_card:833`, the 161 bodies of `community_gym_summary:2190`
and `community_gym_suggest:2335-2382` that 162 re-issues). Client contract:
`src/lib/gyms/{transport,index}.js`, `src/screens/CommunityEditProfileScreen.js`,
`CommunityPrivacyScreen.js`, `CommunityJoinScreen.js`.

**Probed live, not read.** 160, 161 and 162 were applied in order to a fresh
PostgreSQL 16.13 cluster (`/usr/lib/postgresql/16/bin`, `pgtest`, port 55432)
with stubs for `auth.uid()`/`auth.jwt()`, the `anon`/`authenticated`/
`service_role` roles and the five pre-existing tables 160 references
(`users_profile`, `consent_log`, `partnerships`, `notification_preferences`,
`user_body_profile`). All three applied with no error. Every probe below ran
under `SET ROLE authenticated` with a fake `auth.uid()`. Findings 1, 2, 3, 4,
5, 6, 7, 8, 9, 11, 12, 13, 14 and 18 carry a live result; 10, 15, 16, 17, 19,
20, 21 and 22 are read-only findings and are labelled as such.

The privilege shape is exactly what the header claims, and the acceptance
check's own output confirms it: seven tables RLS-enabled, policy counts
1/1/1/0/0/0/0 as promised; `gym_brands`, `gym_venues` and
`gym_postcode_sectors` grant `authenticated` SELECT and nothing else; the
four rpc_only tables grant nothing to anon or authenticated (probed: a
plain `SELECT` on `gym_reports` as `authenticated` returns *permission
denied for table gym_reports*); all 25 functions are SECURITY DEFINER with
`search_path = public, pg_temp`; every `_gyms_*` helper and
`_community_gym_key_sync` is executable by neither role; the eleven client
RPCs and the two re-issued community_* functions are executable by
`authenticated` and not by `anon`. There is no dynamic SQL anywhere outside
the two `format('... %I ...', t)` table loops, whose only interpolations are
literal table names in a hard-coded array. `_community_fold` reduces to
`[a-z0-9 ]` (`migrate_160:711`), so `%` and `_` cannot survive into any
`LIKE` pattern the search builds. No caller coordinate is written or logged
anywhere: `gyms_near`/`gyms_search` take `_lat`/`_lng` as scalars and never
INSERT them (GD-13 holds structurally). Every state change does write
`gym_venue_history`, and `merge` validates its target and sets
`succeeded_by` rather than deleting. Part 1's privilege model is sound; the
findings below are in the RPC bodies and in what 162 does to Community's
existing profile row.

---

## Findings

| # | Sev | Site | Finding | Status |
|---|-----|------|---------|--------|
| 1 | **P0** | `migrate_162:906-922, :982, :623-638` | `gyms_submit` never calls `_community_clean_text`: a submitted venue name carrying a blocked ED term becomes another user's `gym_label` on a public profile card | Status: fixed migrate_162:1014-1024, :670-675 -- gyms_submit now runs name/address_line/town/operator/website through `_community_clean_text` (refusing `content_not_allowed`) and caps name at 60; the sync trigger also clamps `NEW.gym_label` to `left(display_name, 60)` belt-and-braces. |
| 2 | **P0** | `migrate_162:635` + `migrate_161:995-1006, :1087` | The trigger-written `gym_label` is a value `community_upsert_profile` refuses: picking one of 145 real catalogue venues permanently breaks the privacy toggle and rules re-consent | Status: fixed migrate_162:1837-1854 (community_upsert_profile re-issued) + :670-675 (trigger) -- once a profile has `gym_id` set, the trigger is the sole writer of gym_key/gym_label and community_upsert_profile leaves both columns exactly as they stood, never re-deriving or re-validating a value it did not itself receive. |
| 3 | **P0** | `migrate_162:709, :865`, no rail on any read RPC | `gyms_search` is a per-row nested `unnest ... LIKE` seq scan with no length cap and no rate rail: measured 61 s for one call | Status: fixed migrate_162:731-746 (`_q` capped at 80 chars/8 tokens, truncated not refused; `_limit` clamped 1..50), :747 (+:843,:884,:925) (`_community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute')` on all five reads, shared since gyms_suggest delegates into gyms_search), :788-812 (prefix `LIKE` restricted to the last token and gated on a supplied bounding box or a recognised outward code, never driving a full-table scan) -- probed live: the exact 12 KB adversarial query dropped from 61 s to 43 ms. |
| 4 | **P1** | `migrate_162:1307-1317` + `:942-960` | A pending venue is disclosed to non-submitters: `community_gym_summary`'s `gym:` branch has no visibility predicate, and `gyms_submit`'s duplicate reply hands out the id and name | Status: fixed migrate_162:1513-1516 (community_gym_summary's `gym:` branch now requires `public._gyms_visible(gv, v_uid)`, leaving venue/label NULL when it fails) + :1094-1100 (gyms_submit's duplicate scan requires `_gyms_visible(v, v_uid)` too) -- probed live: a stranger calling `community_gym_summary('gym:<pending id>')` now gets `venue: null`, and submitting a near-duplicate name in the same sector inserts as a new row instead of naming the other user's pending venue. |
| 5 | **P1** | `migrate_162:632, :1268-1270` | Removing your gym does not remove you from it: `community_set_gyms(NULL, ...)` leaves `gym_key`/`gym_label` behind | Status: fixed migrate_162:676-684 -- the trigger gained an `ELSIF TG_OP = 'UPDATE' AND coalesce(OLD.gym_key,'') LIKE 'gym:%'` branch that clears `gym_key`/`gym_label` to NULL when `gym_id` goes back to NULL, guarded on `TG_OP` so it never reads OLD on an INSERT; probed live: after `community_set_gyms(NULL, {})` both columns are NULL. |
| 6 | **P1** | `migrate_162:1471-1476` vs `migrate_161:2364-2371` | The re-issued `community_gym_suggest` drops every membership filter 161 had: it counts minors, followers-only and restricted profiles, nationally | Status: fixed migrate_162:1670-1681 -- the re-issued community_gym_suggest's member count restores all four 161 predicates (`status = 'active' AND visibility = 'public' AND is_minor = false AND area_key = v_area`); probed live: the same minor-on-a-followers-only-profile scenario now returns `count: 0` to the distant caller, not `count: 1`. |
| 7 | **P1** | `migrate_162:1033-1059` | `gyms_confirm_submission` has no pending precondition: an ordinary user flips a moderator-rejected submission back to `verified` | Status: fixed migrate_162:1170-1183 (gyms_confirm_submission requires both the submission and the venue `pending`) + :1194 (gym_submissions UPDATE re-guarded `AND status = 'pending'`) -- probed live: confirming a moderator-rejected submission is now refused `not_allowed` and the row stays closed/rejected. |
| 8 | **P1** | `migrate_162:1663-1680` | `delete_user_data` misses `gym_submissions.reviewed_by`: a moderator's user id survives their own erasure | Status: fixed migrate_162:2502-2505 -- delete_user_data now also nulls `gym_submissions.reviewed_by`; probed live: after the reviewing moderator's own erasure, `reviewed_by` reads NULL. |
| 9 | **P1** | `migrate_162:929-960` | Every user submission is stamped with the sector centroid, so the 150 m duplicate rule refuses every submission after the first in a postcode sector | Status: fixed migrate_162:1066-1088 -- the 150 m distance test is dropped (every submission is sector-centroid, so it was meaningless); the duplicate test is now same postcode unit with Jaccard >= 0.6 OR same outward with Jaccard >= 0.85, bounded to the outward code first; probed live: two unrelated gyms submitted into the same L40 8 sector by different users both succeeded. |
| 10 | P1 | `migrate_162:721` | `gyms_search` LIMITs before it ORDERs: the 40 (and `gyms_suggest`'s 8) candidates are an arbitrary sample, so client ranking cannot recover the right gym | Status: fixed migrate_162:815 -- `ORDER BY brand_match DESC, town_match DESC, distance_m ASC NULLS LAST, v.display_name ASC` now runs inside the subquery, before `LIMIT v_limit`, so the candidates handed to the client ranker are the best v_limit, not an arbitrary scan-order sample. |
| 11 | P2 | `migrate_162:1090` | `gyms_report` accepts a closed venue, a merged venue and another user's invisible pending venue | Status: fixed migrate_162:1246-1251 -- gyms_report's existence check now requires `public._gyms_visible(v, v_uid)`; probed live: reporting a closed venue and another user's invisible pending venue both now raise `not_found`, while an open visible venue still succeeds. |
| 12 | P2 | `migrate_162:1215-1221` | `gyms_review_report` clears `needs_review` when one kind's queue empties, while another kind's two open reports remain | Status: fixed migrate_162:1396-1402 -- the reopen count is now `count(*) ... WHERE venue_id = v_report.venue_id AND status = 'open'` across every kind, not just the dismissed report's own kind; probed live: dismissing both `wrong_name` reports left `needs_review = true` while two `closed` reports were still open, and only flipped to `false` once those were resolved too. |
| 13 | P2 | `migrate_162:910-911` | `website` and `operator` have no length or format validation: a 200,000-character website stored twice per submission | Status: fixed migrate_162:1039-1046 -- website is capped at 200 characters and validated `!~* '^https?://'`, operator capped at 80; probed live: an oversized website, a non-`https?://` website and an oversized operator are all refused `invalid`, while a valid submission still succeeds. |
| 14 | P2 | `migrate_162:1090` vs `:1093` | `gyms_report`'s existence check runs before the rate rail: an unrated venue-existence oracle | Status: fixed migrate_162:1241-1251 -- `_community_rate_check` now runs before the venue-existence check; probed live: with the day's rail exhausted, probing a nonexistent venue id returns `rate_limited`, not `not_found`. |
| 15 | P2 | `migrate_162:942-956` | The submission duplicate check is a full-table haversine with no bounding box, geocell or sector restriction | Status: fixed migrate_162:1073-1080 -- the duplicate scan is now bounded to `v.outward = public._gyms_outward_of(v_postcode)` (indexed via `gym_venues_outward_idx`) before the Jaccard test runs, rather than scanning every venue with coordinates. |
| 16 | P3 | `migrate_162:1252, :1260-1266` | `other_gym_ids` accepts duplicates and the primary gym repeated inside it | Status: fixed migrate_162:1437-1444 -- community_set_gyms now de-duplicates `_other_gym_ids` and excludes `_gym_id` from it before the length cap and selectability checks; probed live: submitting the same id three times plus the primary gym inside `other_gym_ids` stored a single deduplicated, primary-excluded array. |
| 17 | P3 | `migrate_162:1141-1152, :1166` | `approve` has no status precondition (it reopens a merged or closed venue); `merge` does not refuse `_merge_into = _id`; no history row on the merge TARGET | Status: fixed migrate_162:1302-1367 -- approve now requires the venue `pending`; merge refuses `_merge_into = _id`; the array_replace dedupes `other_gym_ids` in the same statement; a second history row is written on the merge target (`moderator_merge_absorbed`); probed live: a self-merge is refused `invalid`, approving an already-open venue is refused `not_allowed`, and a merge wrote history on both the source and target venues. |
| 18 | P3 | `migrate_162:1752-1780` | The acceptance check omits the two re-issued community_* functions, `delete_user_data`, and every table grant it claims in the header | Status: fixed migrate_162:2629-2661 -- the acceptance check gained a table-grants query (`information_schema.role_table_grants`) and the function query's `proname IN (...)` now also names community_gym_summary, community_gym_suggest, community_upsert_profile, _community_profile_card, community_find_people and delete_user_data; probed live: the applied output shows exactly SELECT/authenticated on the three catalogue tables and nothing for the four rpc_only ones, and all six re-issued functions listed with the correct ACL. |
| 19 | P3 | `migrate_162:1686` | `delete_user_data` GRANTs to `authenticated` without revoking PUBLIC/anon, relying on migrate_130's surviving ACL (unverifiable on a fresh cluster) | Status: fixed migrate_162:2524-2529 -- a defensive `REVOKE ALL ON FUNCTION public.delete_user_data() FROM PUBLIC, anon` now runs before the GRANT to authenticated, so the file is correct on a genuinely fresh cluster rather than relying on migrate_130's ACL surviving CREATE OR REPLACE. |
| 20 | P3 | `migrate_162:283-294` | `gym_venue_history` grows without bound and has no stated retention; `community_rate_events` prunes at 7 days (`migrate_160:876`) | Status: fixed migrate_162:201-211 -- the header's GDPR note now states the retention decision explicitly: gym_venue_history is kept for the life of the venue (GD-07) and is never pruned on a schedule, with its actor/confirmer anonymised to 'deleted' on that user's own erasure. |

---

### 1. P0 — a submitted gym name bypasses the ED keyword filter and lands on another user's profile card

`gyms_submit:906-922` validates only LENGTH:

```sql
v_name := btrim(coalesce(_p ->> 'name', ''));
...
IF length(v_name) < 1 OR length(v_name) > 120 ... THEN
  RAISE EXCEPTION USING message = 'invalid';
END IF;
```

Every other free-text field in Community goes through `_community_clean_text`
(`migrate_160:919`), which raises `content_not_allowed` on the blocked-terms
list at `migrate_160:568`. That list's own comment states its scope:
"Pro-eating-disorder vocabulary (SD-11; ED-safety is inviolable)". `name`,
`address_line`, `town` and `operator` skip it entirely, and `:982` writes
`v_name` straight into `gym_venues.display_name`.

`_community_gym_key_sync:635` then copies that display name onto the
profile:

```sql
NEW.gym_label := v_display;
```

and `_community_profile_card` (`migrate_161:833`) serves `gym_label` to every
viewer who may see the profile.

**Probed.** One account submitted `{"name":"thinspo bonespo fasting club",...}`
— accepted, `status: pending`. The identical string sent to
`community_upsert_profile({"gym_label":"thinspo bonespo fasting club"})` was
refused with `content_not_allowed` from `_community_clean_text` line 10.
The submitter then called `community_set_gyms` on their own pending venue
(GD-11 makes it selectable), and a second account read their card:

```
"handle": "alpha",
"gym_label": "thinspo bonespo fasting club",
"visibility": "public",
```

One more account calling `gyms_confirm_submission` flips the venue to `open`,
at which point the same string is a national catalogue row returned by
`gyms_search` to everyone.

**Fix.** Run `name`, `address_line`, `town` and `operator` through
`_community_clean_text` in `gyms_submit`, and cap `name` at the same 60 the
profile field uses (see finding 2). Belt and braces: have
`_community_gym_key_sync` clamp `NEW.gym_label` to 60 characters rather than
trusting the catalogue.

### 2. P0 — picking a real gym from the directory permanently breaks profile editing and rules re-consent

`community_upsert_profile` merges absent keys from the existing row
(`migrate_161:995-1006`), so `gym_label` is re-injected on every save, and
then validated:

```sql
v_gym_label := nullif(btrim(coalesce(_p ->> 'gym_label', '')), '');
IF v_gym_label IS NOT NULL THEN
  v_gym_label := public._community_clean_text(v_gym_label);
  IF length(v_gym_label) > 60 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
```

The trigger writes `gym_label` from `gym_venues.display_name` with no cap and
no filter. The two contracts disagree, and the profile row is the loser.

**Probed, with no attacker involved.** An account submitted a gym named
`Everyone Active Harrow Leisure and Community Centre Fitness Suite Gym`
(69 characters — an ordinary UK leisure-centre name), picked it, and then:

```
-- privacy screen toggle:   ERROR: invalid_input  (community_upsert_profile line 125)
-- rules re-consent:        ERROR: invalid_input  (community_upsert_profile line 125)
```

Both refusals are permanent: nothing in the app can clear `gym_label`
except `community_set_gyms` with a different, shorter gym, and the user has
no way to know that is the cause. `CommunityPrivacyScreen.js:90`
(`upsertProfile({ visibility: next })`) and `profile.js:200` (`acceptRules`,
which sends `accept_rules_version` alone) are both dead for that person —
the second is the consent path for a new rules version.

**This is not hypothetical against the seed already built.** Measured over
`data/gyms/uk-gyms.v1.jsonl.gz` (46,817 rows, 44,210 `open`): **145 open
venues carry a `display_name` longer than 60 characters**, and the longest is
**4,598 characters** — an entire operator web page scraped into
`display_name` ("The Gym Group The Whiteley W2 Overview Club Facilities
Classes Trainers Rates Enquire Book a Tour ..."). Anyone who picks that row
gets 4,598 characters written verbatim into `community_profiles.gym_label`
and served on their profile card, and is then locked out.

The blocked-term variant of the same defect is worse in kind: once a
second account confirms a venue named with a blocked term, it is a public
catalogue row, and **every** person who picks it is locked out of
re-consenting, with `content_not_allowed` (probed).

**Fix.** Cap and filter at the trigger, and make `community_upsert_profile`
tolerant of a `gym_label` it did not itself write — the cleanest form is for
the trigger to be the only writer of `gym_label` when `gym_id IS NOT NULL`
and for `community_upsert_profile` to leave `gym_label`/`gym_key` alone in
that case (see also finding 5, the same seam).

### 3. P0 — one authenticated account can hold the database for a minute per call

`gyms_search:707-715` matches by prefix like this:

```sql
OR EXISTS (SELECT 1 FROM unnest(v.tokens) t, unnest(v_toks) qt WHERE t LIKE qt || '%')
```

`v_toks` is `_community_fold(_q)` split on spaces (`:668-669`). There is no
cap on the length of `_q` and no cap on the token count. No GIN index can
serve a `LIKE` prefix over `unnest`, so this is a sequential scan of
`gym_venues` with a nested loop of `tokens × query_tokens` per row. None of
the five read RPCs (`gyms_search`, `gyms_near`, `gyms_in_place`, `gyms_get`,
`gyms_suggest`) calls `_community_rate_check` or `_community_require_profile`.
`gyms_suggest:865` delegates straight into the same function with the same
unbounded `_q`.

**Measured** on a 46,004-row catalogue matching the real one's size:

```
gyms_search('g', NULL, NULL, 40)              ->  5.373 ms
gyms_search(repeat('zx ',  400), ...)         ->  6 685.697 ms
gyms_search(repeat('zx ', 4000), ...)         -> 61 224.789 ms
```

`EXPLAIN (ANALYZE)` on the predicate attributes all of it, as expected:

```
Seq Scan on gym_venues v (actual time=4509.961..4509.963 rows=0 loops=1)
  Filter: ((venue_type <> 'excluded') AND ((tokens && $0) OR (SubPlan 3)))
  Rows Removed by Filter: 46004
  SubPlan 3
    ->  Nested Loop (actual time=0.091..0.091 rows=0 loops=46004)
          Join Filter: (t.t ~~ (qt.qt || '%'::text))
```

**Exploit.** Any signed-in account POSTs `gyms_search` with a 12 KB `_q` in a
loop. Each call occupies a connection for a minute; a handful in parallel
exhausts the Supabase pool, and the pool is shared with every other read the
app makes, so training, food and sync all stop. This is the review-72
finding 10 class (unrailed expensive reads) three orders of magnitude
larger, and it is measured rather than argued.

**Fix, all three parts.** Cap `_q` (60 characters is generous for a gym
name) and cap `v_toks` (say 6 tokens) inside `gyms_search`; put
`_community_rate_check(v_uid, 'gyms_search', 120, 120, interval '1 hour')`
on the five read RPCs the way review 72 put one on `community_find_people`;
and make the prefix branch indexable — a `text_pattern_ops` GIN/`pg_trgm`
alternative is not available without an extension, so the practical form is
to restrict the prefix `EXISTS` to rows already selected by the indexable
predicates (`tokens && v_toks`, `town_key`, `outward`, the bounding box)
rather than letting it drive the scan.

### 4. P1 — a pending venue is disclosed to everyone but its submitter

GD-11: a new submission is "`pending`, immediately selectable by its
submitter, visible to others after a second independent confirmation or a
moderator's verification". `_gyms_visible:581-592` implements exactly that,
and `gyms_search`, `gyms_near`, `gyms_in_place` and `gyms_get` all use it.
Two paths do not.

`community_gym_summary:1307-1317`, the new `gym:<uuid>` branch:

```sql
SELECT jsonb_build_object('id', gv.id, 'display_name', gv.display_name, ...
       'lat', gv.lat, 'lng', gv.lng, 'status', gv.status, ...)
  INTO v_venue, v_label
FROM public.gym_venues gv WHERE gv.id = v_gym_uuid;
```

No `_gyms_visible`, no status predicate. This is review-72's "may I see this
PERSON vs may I see this THING" lesson missed on a brand new call site.

`gyms_submit:942-960` is the id oracle that makes it reachable:

```sql
IF v_dup_id IS NOT NULL THEN
  RETURN jsonb_build_object('duplicate_of', v_dup_id, 'display_name', v_dup_name);
END IF;
```

The duplicate scan is `WHERE v.status IN ('open', 'pending')` with no
visibility predicate at all, so it returns another person's pending venue.

**Probed, chained.** Account A submitted a venue in postcode sector L40 8.
Account B then submitted an unrelated gym in the same sector and got back:

```
{"display_name": "thinspo bonespo fasting club",
 "duplicate_of": "db55c368-3164-4cf8-8190-19b2337a40f7"}
```

B then called `community_gym_summary('gym:db55c368-…')` and received the
whole record:

```
{"id": "db55c368-…", "lat": 53.6, "lng": -2.85, "town": "Burscough",
 "status": "pending", "outward": "L40", "postcode": "L40 8TG",
 "venue_type": "independent_gym", "display_name": "thinspo bonespo fasting club",
 "verification_status": "user_submitted_pending"}
```

The control is correct and proves the intent: `gyms_get` on the same id as
B returned NULL.

The content is a record a person typed, and GD-11 offers "name, address
line, town, postcode" as the form — a home gym or a garage submitted with a
residential address is the awkward case, and it is exactly the case the
"only the submitter" rule exists for.

**Fix.** Add `AND public._gyms_visible(gv, v_uid)` to the `gym:` branch (and
return `NULL` for `venue` when it fails), and add the same predicate to the
`gyms_submit` duplicate scan — or, if offering the duplicate back is worth
keeping for pending rows, restrict the offer to the caller's OWN pending
rows plus every `open` row.

### 5. P1 — removing your gym does not remove you from it

`_community_gym_key_sync:632`:

```sql
IF NEW.gym_id IS NOT NULL THEN
  ... NEW.gym_key := 'gym:' || NEW.gym_id::text; NEW.gym_label := v_display;
END IF;
```

There is no `ELSE`. `community_set_gyms(NULL, '{}')` sets `gym_id` to NULL,
the trigger fires (the column is in the SET list) and does nothing.

**Probed.**

```
-- after community_set_gyms(<venue>, {})
 gym_id  | gym:db55c368-…  | thinspo bonespo fasting club
-- after community_set_gyms(NULL, {})
 (null)  | gym:db55c368-…  | thinspo bonespo fasting club
```

The person still matches `p.gym_key = v_key` in `community_gym_summary:1327`
(members, count, people cards, programmes, posts), in
`community_find_people('gym')` (`migrate_161:1914`) and in
`community_dimension` (`migrate_160:3314`). GD-13: "counts and lists only
people who chose it". They un-chose it.

**Fix.** Give the trigger an `ELSIF NEW.gym_id IS NULL AND
coalesce(OLD.gym_key,'') LIKE 'gym:%' THEN NEW.gym_key := NULL;
NEW.gym_label := NULL;` branch — being careful not to clear a legacy
free-text key, which is the case the `IF` was written to protect.

Note the same seam in the other direction: because the trigger is
`UPDATE OF gym_id`, any `community_upsert_profile` save on a picker-linked
profile rewrites `gym_key` from the free-text `gym_label` (`migrate_161:1089`)
to `<area fold>:<gym fold>` while `gym_id` stays set, silently moving the
person off the venue key. `CommunityEditProfileScreen.js:148-160` happens to
self-heal because `setGyms` runs immediately after `upsertProfile`;
`CommunityPrivacyScreen.js:90` and `acceptRules` do not. Findings 2 and 5
share one fix: make the trigger the sole owner of `gym_key`/`gym_label`
whenever `gym_id` is set.

### 6. P1 — the re-issued gym suggest counts minors and private profiles, nationally

162's re-issue (`:1471-1476`):

```sql
(SELECT count(*)::int FROM public.community_profiles p
  WHERE p.gym_key = 'gym:' || (elem ->> 'id')) AS member_count
```

161's body (`:2364-2371`), which review 72 finding 7 had just hardened:

```sql
WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
  AND p.area_key = v_area
```

All four predicates are gone. The area check at `:1456-1459` survives, but
`gyms_suggest` carries no area parameter (the file's own header says so), so
the results are national and the check is now decorative — review-72
finding 7's enumeration bar is re-opened by a different route.

**Probed.** A 15-year-old account joined (160 correctly forces
`visibility = 'followers'` for a minor) and picked PureGym Motherwell. A
second account whose `area_key` is `london` called
`community_gym_suggest(NULL, 'puregym')`:

```
{"gyms": [{"key": "gym:bbbbbbbb-…", "count": 1, "label": "PureGym Motherwell"}]}
```

`count: 1`, and that one is a minor on a followers-only profile, reported to
a caller 400 miles away. SD-27's "nothing precise" and review-72's note
about `count: 1` naming one identifiable person both apply, and this time
the one person is a child.

**Fix.** Restore all four predicates in the count, and either give
`gyms_suggest` an area/bounding parameter or filter the delegated result to
`v_area` before counting.

### 7. P1 — an ordinary user reverses a moderator's rejection

`gyms_confirm_submission:1033-1059` checks `NOT FOUND`, self-confirmation and
repeat-confirmation. It never checks that the submission is still `pending`,
and the `UPDATE gym_submissions SET status = 'verified'` at `:1059` has no
status guard (the `gym_venues` update at `:1058` does).

**Probed.** A moderator rejected a submission (`gym_venues` → `closed` /
`rejected`, `gym_submissions` → `rejected`). A second, ordinary account then
called `gyms_confirm_submission` on it:

```
{"id": "db55c368-…", "distinct_confirmers": 2}
-- venue_status | verification_status | submission_status
--    closed    |      rejected       |     verified
```

The moderation record now says a rejected submission is verified, and it
leaves the rejected state that any queue filters on. A `verify` history row
is written claiming `{"status": "open"}` for a venue that is closed.

**Fix.** `IF v_sub.status <> 'pending' THEN RAISE EXCEPTION USING message =
'not_allowed'; END IF;` after the `NOT FOUND` check, and put
`AND status = 'pending'` on the `gym_submissions` update too.

Accepted by design and noted per the brief: a second account trivially
confirms your own submission. `:1035` correctly refuses the SAME account and
`:1038-1043` correctly refuses a repeat actor, so the control is exactly the
"second independent confirmation" GD-11 asks for and no more. Worth the
founder knowing that two accounts is the whole bar for putting a row into
the national catalogue — with finding 1 unfixed, that row's name is
unfiltered free text.

### 8. P1 — erasure misses `gym_submissions.reviewed_by`

`delete_user_data:1667-1680` anonymises `submitter_id`, `reporter_id`,
`gym_venue_history.actor` (including the `confirmer` value inside `after`)
and `gym_venue_sources.source_record_id`. The lead's own comment at
`:1669-1673` records that ruling. `gym_submissions.reviewed_by` (`:322`, a
column this same file introduces) is not covered, and neither the header at
`:1663-1666` nor the guard test's acceptance line ("the two personal-data
columns this file introduces") counts it.

**Probed.** After the moderator account called `delete_user_data()`:

```
 submitter_id                         | reviewed_by                          | status
 11111111-1111-1111-1111-111111111111 | 33333333-3333-3333-3333-333333333333 | verified
```

`gym_venue_history.actor` for the same moderator was correctly rewritten to
`deleted`; `reviewed_by` was not. A raw user id persists on an RPC-only
table after erasure.

**Fix.** `UPDATE gym_submissions SET reviewed_by = NULL WHERE reviewed_by =
uid;` alongside the two lines above it, and correct the header's count.

### 9. P1 — "Can't find your gym? Add it" refuses everyone after the first person in a postcode sector

`gyms_submit:929-936` gives every user submission the postcode SECTOR
centroid as its coordinate:

```sql
v_sector := public._gyms_sector_of(v_postcode);
SELECT lat, lng INTO v_lat, v_lng FROM public.gym_postcode_sectors WHERE sector = v_sector;
```

The duplicate check at `:946-947` then refuses anything within 150 m:

```sql
(v.lat IS NOT NULL AND v.lng IS NOT NULL
  AND public._gyms_distance_m(v_lat, v_lng, v.lat, v.lng) <= 150)
```

Two user submissions in the same sector are at distance 0 by construction,
whatever their names, addresses or postcodes.

**Probed.** With one pending venue in L40 8, two further accounts submitted
`Volt Gym, Swordfish Business Park, L40 8TG` and `Iron Barn Strength,
14 Liverpool Rd, L40 8QR`. Both were refused with the same reply naming the
unrelated first row. A UK postcode sector covers thousands of addresses;
`Volt Gym, Burscough` is the blueprint's own named test case.

This is also the disclosure vector in finding 4, so the two are fixed
together, but the functional half stands alone: GD-11's "Add it" works once
per sector, for the first person only.

**Fix.** Exclude `coord_source = 'postcode_sector'` rows from the distance
signal (compare them on postcode unit and name only, which is what GD-06's
blocking actually prescribes for a coordinate-less row), or require the
Jaccard threshold on the distance branch too.

### 10. P1 — the search LIMITs before it ORDERs (read-only)

`gyms_search:680-722`: the inner subquery `z` carries `LIMIT v_limit` and no
`ORDER BY`; the ordering lives only in the outer
`jsonb_agg(... ORDER BY z.brand_match DESC, ...)`, which sorts the arbitrary
40 rows the scan happened to reach first. `gyms_in_place:804-805` and
`gyms_near:767-768` both order inside the subquery and are correct; this one
does not, and `gyms_suggest:865` takes 8 of the same arbitrary sample.

GD-09 is "limited to 40 candidates; client: the app's existing fuzzy ranker
over those candidates" — a ranker over an arbitrary sample cannot rank. On
the real catalogue "puregym" matches far more than 40 rows, so the branch
the user wants is unlikely to be in the slice, and the blueprint's own
acceptance inputs ("Puregym", "the gym motherwell", "JD") are the cases that
match most broadly.

**Fix.** Move the `ORDER BY` inside the subquery, before the `LIMIT`.

### 11-15. P2

- **11.** `gyms_report:1090` checks only that the venue row exists. Probed:
  reporting a `closed` venue, a `merged` venue and another user's invisible
  `pending` venue all returned `{"ok": true}`. The blueprint's corrections
  flow is about live directory rows; a report on a merged row targets an id
  that no longer represents anything a user can see. Add
  `AND public._gyms_visible(v, v_uid)`.
- **12.** `gyms_review_report:1215-1221` recounts open reports for
  `v_report.kind` only, then clears `needs_review` for the whole venue.
  Probed: with two open `closed` reports and two open `wrong_name` reports,
  dismissing both `closed` reports set `needs_review = false` while both
  `wrong_name` reports stayed `open` — the venue drops off the moderator
  queue with unactioned reports on it. Count open reports across all kinds,
  or count kinds that have reached two.
- **13.** `gyms_submit:910-911` takes `website` and `operator` with
  `nullif(btrim(...), '')` and no length or format check; the length gate at
  `:918-922` covers `name`, `address_line` and `town` only. Probed: a
  200,000-character `website` and a 5,000-character `operator` were stored,
  the website twice (`gym_venues` and `gym_submissions`) — 400 KB per
  submission, 3 submissions a day per account. `gyms_get:847` returns
  `website` to the client. Cap both (200 / 120), and validate `website` as
  `https?://` so nothing else can ever be rendered as a tappable link.
- **14.** `gyms_report` runs the existence check (`:1090`) BEFORE
  `_community_rate_check` (`:1093`), so probing whether a venue id exists is
  unrated. `gyms_confirm_submission:1031` gets this right (rail first).
  Move the rail above the check.
- **15.** The `gyms_submit` duplicate scan (`:942-956`) evaluates
  `_gyms_distance_m` against every venue with coordinates — no bounding box,
  no `geocell`, no `sector` restriction, though `gym_venues` is indexed on
  all three (`:261-266`). Bounded to 3 a day per account by the rail, so it
  is cost rather than a lever, but it is 46,000 haversines per submission
  and it should use the bounding box `gyms_near` already builds.

### 16-20. P3

- **16.** `community_set_gyms:1252` checks only the array length. Probed: the
  same id three times in `other_gym_ids`, and the primary gym repeated
  inside it, are both accepted and stored. De-duplicate and exclude
  `_gym_id`.
- **17.** `gyms_review_submission:1141-1152` `approve` has no status
  precondition, so it reopens a `merged` or `closed` venue while
  `succeeded_by` still points elsewhere; `merge:1166` does not refuse
  `_merge_into = _id`; and the merge writes a history row on the source
  venue only, never on the target that absorbed it.
  `array_replace:1176` can also leave a duplicate in `other_gym_ids` when the
  profile already held the target.
- **18.** The acceptance check (`:1752-1780`) covers tables, policy counts,
  the two columns and the `gyms_*`/`_gyms_*`/`community_set_gyms` privileges.
  It does not check the table GRANTs the header promises ("SELECT alone
  re-granted to `authenticated`"), and its `proname` filter excludes
  `community_gym_summary`, `community_gym_suggest` and `delete_user_data` —
  the three functions this file re-issues, which are precisely the ones a
  bad apply would leave in their 161 state. Add a
  `information_schema.role_table_grants` query and those three names.
- **19.** `:1686` GRANTs `delete_user_data` to `authenticated` and does not
  revoke PUBLIC/anon, on the header's stated reasoning that CREATE OR
  REPLACE preserves migrate_130's ACL. On the fresh cluster it came back
  `anon_can_execute = t`, which is a cluster artefact (130 was not applied
  there) and not evidence about production — but it means this file cannot
  be applied to a clean database and be correct, and 160/161 carry the same
  assumption. A defensive `REVOKE ALL ... FROM PUBLIC, anon` costs nothing.
- **20.** `gym_venue_history` takes a row per submit, confirm, flag and
  moderator action and is never pruned; `community_rate_events` prunes
  opportunistically at 7 days (`migrate_160:875-877`) and is covered by
  `delete_user_data:1625`. The history table's `actor` is anonymised on
  erasure (correct) but the row itself is permanent; GD-07 says "nothing is
  deleted", so this is a stated retention decision rather than a defect —
  it should be written into the header's GDPR note, which currently
  describes only the two id columns.

---

## Checklist

| # | Area | Result |
|---|------|--------|
| 1 | Privilege: SECURITY DEFINER, pinned search_path, grants, RLS policy counts, no catalogue write path for `authenticated` | **PASS** — verified live against a fresh apply of 160+161+162. 25/25 functions SECURITY DEFINER with `search_path = public, pg_temp`; helpers and the trigger function executable by neither `anon` nor `authenticated`; the eleven RPCs plus the two re-issued community_* functions granted to `authenticated` only; policy counts 1/1/1 and 0/0/0/0 exactly; table grants are SELECT-only on the three catalogues and nothing on the four rpc_only tables; a direct `SELECT` on `gym_reports` as `authenticated` is refused. Finding 19 is a hygiene note, not a hole |
| 2 | Data exposure: what the reads return; pending visibility; submitter/reporter/actor/payload; closed and merged venues | **FAIL** — 4, 6. Otherwise correct: no read returns `submitter_id`, `reporter_id`, a history actor or a source payload; `gyms_get:837` returns provenance NAMES only; `_gyms_visible` is applied in all four venue reads; `_gyms_selectable:596` refuses a `closed` or `merged` venue as a profile gym |
| 3 | Injection and abuse: dynamic SQL, LIKE metacharacters, array/jsonb inputs, postcode regex, limits, rails | **FAIL** — 3, 13, 14, 15, 16. No injection: the only `format()` is over a literal table array with `%I`; `_community_fold` reduces to `[a-z0-9 ]` so `%`/`_` cannot reach a LIKE pattern; `_limit` is clamped everywhere (40/40/60/8) and `_radius_m` at 50 km; the postcode regexes are anchored and correct. The failure is entirely absent bounds and absent rails on the reads |
| 4 | Integrity: confirm and report preconditions, distinct-actor counting, moderator gating, history, merge | **FAIL** — 7, 11, 12, 17. Correct where it counts: `community_is_moderator()` gates both review RPCs and a non-moderator is refused `not_allowed`; a caller cannot confirm their own submission or confirm twice; two reports from one account cannot set `needs_review` (`count(DISTINCT reporter_id)`); every state change writes `gym_venue_history`; `merge` validates the target and sets `succeeded_by` rather than deleting, and carries user associations across (GD-07) |
| 5 | GDPR: erasure coverage, caller coordinates, rate-rail rows and retention | **FAIL** — 8. GD-13 holds structurally: no `_lat`/`_lng` reaches any INSERT, any log, or any table; `gyms_submit` stores the ONSPD sector centroid, never a caller position; nothing in the file reads bodyweight, nutrition, Progress Scan, injuries or check-ins, so no Article 9 data is touched; erasure covers `submitter_id`, `reporter_id`, the history actor and the user source record. Finding 20 is a retention statement the header should carry |
| 6 | Idempotency and the acceptance check | **PASS with P3** — 18. `CREATE TABLE/INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, every named CHECK inside a `duplicate_object`-tolerant block, `CREATE OR REPLACE` on all 28 functions, `DROP TRIGGER IF EXISTS` before the one `CREATE TRIGGER`, `DROP POLICY IF EXISTS` before each `CREATE POLICY`. The file applied cleanly on a fresh cluster and its own acceptance output matches its header claims for everything it checks |

---

## Verdict

**NOT SAFE TO APPLY on the founder's phrase as it stands**, on findings 1, 2
and 3 — each of which is reachable by an ordinary signed-in account today and
none of which needs the model re-architected.

Finding 2 is the one that would be noticed first and is the least
adversarial: 145 venues in the catalogue the pipeline has already built carry
a display name longer than the 60 characters `community_upsert_profile`
accepts, one of them 4,598 characters long, and picking any of them
permanently breaks the privacy toggle and the rules re-consent path.
Finding 1 is the one that matters most: `gyms_submit` is the first free-text
write in this codebase that does not pass `_community_clean_text`, and its
output lands on other people's profile cards. Finding 3 is a measured
61-second query behind no rate limit.

The privilege model, the RLS dispositions, the erasure posture and GD-13's
"location is never inferred or stored" are all genuinely right, and the
migration applies cleanly in dependency order. The fixes are one filter and
one cap (1, 2), one cap plus one rail plus one `ORDER BY` (3, 10), and six
missing predicates (4, 5, 6, 7, 11, 12) — plus the one-line erasure addition
(8). None of them touches the schema, so the file can be corrected and
re-reviewed without changing what it creates.
