# 02 — Community backend inventory (exact, as written)

Authority: founder prompt 2 (Community product audit),
`docs/community-product-audit-2026-09-07/README.md`. READ-ONLY inventory;
no code changed. All line numbers verified against the files in this
repo at HEAD on 2026-09-07.

Sources read in full or in the cited ranges: `supabase/migrate_160_community.sql`
(4017 lines), `supabase/migrate_161_community_connections.sql` (3198 lines),
`supabase/migrate_162_gym_directory.sql` (2757 lines),
`supabase/functions/community-notify/index.ts` (614 lines, read in full),
`supabase/functions/community-public/index.ts` (256 lines, read in full),
`supabase/README.md` (status block), `src/lib/community/*.js`,
`src/lib/gyms/*.js`. No later community-related migration exists — 162 is
the highest number in `supabase/`, and a repo-wide grep for `community` in
`migrate_1*.sql` returns only 121 (marketing, unrelated), 160, 161, 162.

---

## 1. Applied-vs-written status; client behaviour with no backend

### Verbatim status lines (`supabase/README.md`)

> "**160 WRITTEN, NOT APPLIED (Community; founder gate).**
> `migrate_160_community.sql` is the complete Community schema (SD-01 to
> SD-16, blueprint section 3): fourteen `community_*` tables, all with RLS
> enabled and NO policy for anon or authenticated and all privileges revoked
> from both, plus 41 SECURITY DEFINER RPCs ... Nothing has been applied: it
> waits for the founder's exact phrase "run against production" for the
> batch that carries it." (`supabase/README.md:105-122`)

> "**161 WRITTEN, NOT APPLIED (Community connections and messaging; founder
> gate).** ... It DEPENDS ON 160 and must never run before it; nothing has
> been applied, and it waits for the founder's exact phrase "run against
> production" for the batch that carries it." (`supabase/README.md:123-155`)

> "**162 WRITTEN, NOT APPLIED (UK gym directory; founder gate).** ...
> Seed data lives OUTSIDE the migration ... applied AFTER 162 on the same
> founder phrase ... It DEPENDS ON 160 and 161 and must never run before
> them; nothing has been applied, and it waits for the founder's exact
> phrase "run against production" for the batch that carries it."
> (`supabase/README.md:156-198`)

CLAUDE.md's own STATUS block corroborates: "applied through `migrate_157`
... except **155**" (CLAUDE.md preamble) — 160/161/162 are not mentioned as
applied anywhere in either document. **Conclusion: none of the Community
cloud schema, RPCs, or the two edge functions exist in the EU-Dublin
production database today.**

### Edge functions: written, not deployed

Neither edge function's deploy status is asserted as "deployed" anywhere in
`supabase/README.md`. Corroborating evidence:
- `docs/social-discovery-2026-09-06/60-FINAL-REPORT.md:238-240` lists as an
  **open item**: "Apply migrations 160 and 161 (and deploy the updated
  `community-notify` function) on the founder's exact phrase, after a
  device walk..." — phrased as future work, not done.
- `community-notify/index.ts:63-64` states its own precondition:
  "Note that migrate_160 must be applied first: without it the community_*
  tables do not exist and every call returns not_verified" — written by the
  same author, confirming the function's own code depends on schema that
  is not live.
- Deploy commands are documented as manual (`community-notify/index.ts:61-62`:
  "`supabase functions deploy community-notify`"; `community-public/index.ts:31-33`:
  "`supabase functions deploy community-public --no-verify-jwt`") — no CI
  workflow references either name (not found in a repo-wide search of
  `.github/workflows` for "community").

### What the client does today when the RPCs do not exist

**Inferred from static code, not observed against a live call** (no Supabase
MCP tool permitted in this brief; the schema does not exist to call against
in any case). The mechanism, traced end to end:

1. `src/lib/community/transport.js:192-203` (`callCommunity`) and `:213-224`
   (`invokeCommunityFunction`) are the sole ingress/egress (enforced by
   `src/__tests__/community.transport.guard.test.js` per the file's own
   header comment, `transport.js:6-10`). Both run the three gates
   (`assertCommunityGates`, `transport.js:141-163`: sign-out wipe, Article 9
   consent fail-closed, live session) and then call `client().rpc(name,
   params)` or `client().functions.invoke(name, { body })`.
2. A call against a database where the function does not exist returns a
   PostgREST error (typically `PGRST202`/`42883`, "function ... does not
   exist"). `codeFor()` (`transport.js:120-132`) checks the trimmed message
   against `KNOWN_CODES` (`transport.js:38-74`), then a substring match,
   then `looksOffline()` (`transport.js:102-112`, matches network-failure
   text only), then HTTP 401/403. A "function does not exist" message
   matches none of these, so `codeFor` returns `null`.
3. `rethrow()` (`transport.js:171-182`): when `codeFor` returns null, the
   function falls to the final branch — `logError(scope, error, {})` (a
   real, Sentry-bound error log, since this is treated as an unanticipated
   shape) — then throws `CommunityError('unavailable', error?.message)`
   (the `CommunityError` constructor coerces an unknown code to
   `'unavailable'`, `transport.js:90-96`).
4. Screens map `.code` to calm copy rather than parsing a message string
   (file header, `transport.js:24-26`). One observed mapping:
   `CommunityJoinScreen.js:171` — `setCheckFailure(e?.code === 'offline' ?
   'offline' : 'unavailable')`, rendered as `HANDLE_UNAVAILABLE_HINT`
   (`CommunityJoinScreen.js:184`) rather than a crash.

**Net effect (inferred): every Community/gym action against the current
production database would surface as a calm "unavailable" state to the
user, while also writing a `logError` call for every attempt** (since
`'unavailable'` is not in `EXPECTED_CODES`, `transport.js:80-87`), because
the failure is not recognised as a deliberate server refusal.

**Reachability today: Community has no feature flag gating it off.** A
repo-wide search for `COMMUNITY_ENABLED`/`communityEnabled`/
`FEATURE_COMMUNITY` returns nothing. Every Community screen is registered
in the live navigator with no guard:
`src/navigation/RootNavigator.js:151-179` (screen imports, comment at `:147-150`:
"Every Community screen ... module graph is evaluated until someone opens
Community" — this is about lazy *loading*, not gating) and
`:499-504+` (`<Stack.Screen name="Community" .../>` etc., unconditional).
The hub is reachable from `HomeScreen.js:2732`:
`navigation.navigate('Community')` on a dismissible home-screen card, with
no check for backend availability before navigating.

---

## 2. Tables (14 in migrate_160, 3 in migrate_161, 7 in migrate_162 = 24 total)

All 160/161 tables share one disposition (SD-14): **RLS enabled, ZERO
policies for `anon`/`authenticated`, ALL privileges revoked from both** —
the only ingress/egress is the SECURITY DEFINER RPCs (verified by the
acceptance check at `migrate_160_community.sql:3994-4017` and the RLS/grant
loop at `:452-465`, `migrate_161_community_connections.sql:305-314`). No
client `.from(table)` call exists anywhere in `src/lib/community/*` or
`src/lib/gyms/*` (only `.rpc(...)` and `.functions.invoke(...)` in
`transport.js`) — the two edge functions read/write tables directly using
the **service role** (`community-notify/index.ts:220-222`,
`community-public/index.ts:112-114`), which is untouched by the REVOKE
(`migrate_160_community.sql:3680-3683`).

### migrate_160_community.sql

| Table | Columns (key ones) | Purpose | Indexes | Client feature |
|---|---|---|---|---|
| `community_profiles` (`:107-166`) | `user_id` PK/FK auth.users, `handle` UNIQUE, `display_name`, `avatar_preset`, `bio`, `styles text[]`, `goal`, `setting`, `area_label`/`area_key`, `gym_label`/`gym_key`, `visibility` CHECK(public/followers), `is_minor`, `status` CHECK(active/restricted/suspended), `rules_version`, `follower_count`, `following_count`, `handle_changed_at`, `last_active_at` | The Community identity row, one per user | `community_profiles_discoverable_idx` (visibility, status, is_minor, last_active_at DESC, `:159-160`), `..._area_key_idx` (`:161-162`), `..._gym_key_idx` (`:163-164`), `..._styles_idx` GIN (`:165-166`) | `profile.js` (`upsertProfile`, `getProfile`), every discovery/find_people RPC |
| `community_follows` (`:168-191`) | `follower_id`, `followee_id` PK pair, `state` CHECK(requested/accepted), `created_at`; CHECK `follower_id <> followee_id` | Follow graph with requests | `..._followee_idx`, `..._follower_idx` (`:188-191`) | `profile.js` (`follow`/`unfollow`/`respondToFollow`/`listFollows`) |
| `community_blocks` (`:196-204`) | `blocker_id`, `blocked_id` PK pair, both FK **auth.users** (not community_profiles — deliberate: "a block must survive the other person leaving Community", `:193-195`) | Blocks | `..._blocked_idx` (`:203-204`) | `profile.js` (`blockUser`/`unblockUser`) |
| `community_mutes` (`:206-211`) | `muter_id`, `muted_id` PK pair, FK auth.users | Mutes | none beyond PK | `profile.js` (`muteUser`/`unmuteUser`) |
| `community_programmes` (`:213-252`) | `id`, `owner_id`, `source_plan_id`, `title`, `description`, `style_key`, `split_type`, `difficulty`, `days_per_week`, `exercise_count`, `has_circuits`, `snapshot jsonb`, `version`, `visibility` CHECK(public/followers/link), `status` CHECK(visible/hidden), `use_count`; UNIQUE(owner_id, source_plan_id) | Shared programme "structure only, never load" snapshots | `..._owner_idx`, `..._discover_idx`, `..._style_idx` (`:247-252`) | `feed.js` (`publishProgramme`, `discoverProgrammes`, `getCommunityProgramme`) |
| `community_programme_uses` (`:254-269`) | `programme_id`, `user_id` PK pair, `mode` CHECK(use/adapt) | Use/adapt tracking, feeds `use_count` trigger and suggestion scoring | `..._user_idx` (`:268-269`) | `feed.js` (`recordProgrammeUse`) |
| `community_posts` (`:271-307`) | `id`, `author_id`, `kind` CHECK(pr/session/block/milestone/programme), `payload jsonb`, `caption`, `programme_id` FK SET NULL, `visibility` CHECK(public/followers), `status` CHECK(visible/hidden), `reaction_count`, `comment_count` | Training "stories" (structured cards, not free media) | `..._author_idx`, `..._discover_idx` (`:304-307`) | `feed.js` (`createPost`/`deletePost`/`getPost`/`loadFeed`/`loadDiscoverPosts`), `posts.js` (payload builders) |
| `community_reactions` (`:309-317`) | `post_id`, `user_id` PK pair | One reaction type (a like), no reaction enum | `..._user_idx` (`:316-317`) | `feed.js` (`reactToPost`) |
| `community_comments` (`:319-345`) | `id`, `target_kind` CHECK(post/programme), `target_id`, `author_id`, `body`, `status` CHECK(visible/hidden) | Comments on posts or programmes | `..._target_idx`, `..._author_idx` (`:342-345`) | `feed.js` (`addComment`/`deleteComment`/`listComments`) |
| `community_reports` (`:347-386`) | `id`, `reporter_id` FK SET NULL, `target_kind` CHECK(profile/post/comment/programme, widened to add `message` in 161 `:335-340`), `target_id`, `target_owner_id`, `reason` CHECK(spam/harassment/impersonation/harmful_body_or_eating_content/inappropriate/other), `detail`, `status` CHECK(open/actioned/dismissed), `priority`, `resolved_at`/`resolved_by`/`resolution` | Reports | `..._queue_idx`, `..._target_idx` (`:382-386`) | `moderation.js` (`reportContent`) |
| `community_moderators` (`:389-392`) | `email` PK, `added_at` | Moderator allow-list keyed by email; only service_role writes it (comment `:387-388`) | none | `moderation.js` (`isModerator`, reads via `community_is_moderator()` RPC only) |
| `community_moderation_log` (`:394-406`) | `id`, `moderator_id` (nullable — NULL on auto-hide or after the moderator's account is deleted), `action`, `target_kind`, `target_id`, `report_id`, `note` | Audit log | `..._created_idx` (`:405-406`) | `moderation.js` (`moderationQueue` reads it via `community_moderation_queue`) |
| `community_activity` (`:408-431`) | `id`, `user_id`, `actor_id`, `kind` CHECK(follow/follow_request/follow_accepted/reaction/comment/programme_used, widened in 161 to add connect_request/connect_accepted `:325-332`), `target_kind`/`target_id`, `seen_at`; `pushed_at` added in 161 (`:388-389`, anti-replay stamp for `community-notify`) | Activity inbox | `..._user_idx`, `..._unseen_idx`, `..._actor_idx` (`:426-431`) | `activity.js` (`loadActivity`/`markActivitySeen`) |
| `community_rate_events` (`:436-443`) | `user_id`, `action`, `created_at` | The rate rail; rows >7 days pruned opportunistically inside `_community_rate_check` (comment `:433-435`), no cron job | `..._lookup_idx` (`:442-443`) | none directly — every rate-checked RPC writes it |

### migrate_161_community_connections.sql (extends `community_profiles`, adds 3 tables)

`community_profiles` gains (`:152-165`): `connect_from` CHECK(anyone/followers/nobody) default 'anyone', `open_to_partner` bool, `partner_prefs jsonb`, `show_programmes` bool default true, `connection_count`, `tp_days text[]`, `tp_time_bands text[]`, `tp_sessions_band`, `tp_staple_lifts text[]`, `tp_experience_band`, `tp_programme_key`, `tp_age_band`, `tp_updated_at`. Indexes: `..._partner_idx` (partial, open_to_partner=true, `:179-181`), `..._tp_programme_idx` (`:182-183`). The `tp_*` closed sets carry **no CHECK** deliberately — enforced only in the RPC body against `_community_tp_*_list()` functions, cross-checked by a Jest guard against client constants (`:173-177`).

| Table | Columns | Purpose | Indexes | Client feature |
|---|---|---|---|---|
| `community_connections` (`:199-234`) | `user_a`,`user_b` PK pair (CHECK `user_a < user_b`, ordered), `requester_id`, `state` CHECK(requested/connected/declined), `reasons text[]`, `note`, `responded_at`, `declined_at`, `withdrawn_at` | Mutual "connection" tie, one row per pair, distinct from follow | `..._a_idx`, `..._b_idx`, `..._requester_idx` (`:229-234`) | `connections.js` (`connect`/`respondToConnect`/`withdrawConnect`/`removeConnection`/`listConnections`) |
| `community_conversations` (`:247-274`) | `id`, `user_a`,`user_b` (UNIQUE pair, ordered), `last_message_at`, `closed_at`, `a_last_read_at`/`b_last_read_at`, `a_last_push_at`/`b_last_push_at` (written ONLY by `community-notify` with service role — comment `:243-246`) | One-to-one conversation, lazily created on first message | `..._a_idx`, `..._b_idx` (`:271-274`) | `messages.js` (`listConversations`) |
| `community_messages` (`:276-295`) | `id`, `conversation_id` FK CASCADE, `sender_id`, `body`, `ref_kind` CHECK(NULL/programme/post), `ref_id` | Text messages, optional single context reference | `..._conversation_idx`, `..._sender_idx` (`:292-295`) | `messages.js` (`listMessages`/`sendMessage`/`markRead`/`deleteMessage`) |

`notification_preferences.category` CHECK widened to add `community_message`
(`:346-378`); `community_activity.kind` widened to add `connect_request`,
`connect_accepted` (`:324-332`); `community_reports.target_kind` widened to
add `message` (`:334-340`).

### migrate_162_gym_directory.sql (adds 7 tables)

`community_profiles` gains `gym_id uuid` FK `gym_venues(id)` SET NULL and
`other_gym_ids uuid[]` capped at 3 by CHECK (`:448-456`), plus index
`..._gym_id_idx` (`:458-459`). A `BEFORE INSERT OR UPDATE OF gym_id` trigger
`community_profiles_gym_key_sync` (`:658-692`) is the **sole writer** of
`gym_key`/`gym_label` whenever `gym_id` is set — it writes `gym_key = 'gym:'
|| gym_id`, `gym_label = left(display_name, 60)`, and clears both back to
NULL when `gym_id` transitions from set to NULL (`:676-685`).

| Table | Disposition | Columns | Purpose | Indexes | Client feature |
|---|---|---|---|---|---|
| `gym_brands` (`:216-228`) | `global_read_only` (RLS on, one SELECT policy for `authenticated`, `:410-423`) | `id`, `key` UNIQUE, `name`, `aliases text[]`, `wikidata_qid`, `website`, `kind` | Chain/brand catalogue | `..._key_idx` | `gyms/index.js` (via `gyms_search`/`gyms_get` joins) |
| `gym_venues` (`:234-296`) | `global_read_only` | `id`, `display_name`, `name`, `brand_id` FK, `venue_type` CHECK (13-value closed set incl. `excluded`, `:284-289`), `status` CHECK(open/closed/merged/pending, `:277-279`), `address_line`, `town`/`town_key`, `local_authority_code`/`name`, `region_code`/`name`, `country`, `postcode`/`outward`/`sector`, `lat`/`lng` (double precision), `coord_source`, `geocell`, `website`, `phone`, `facility_count`, `parent_venue_id`/`succeeded_by` (self-FK for merges), `verification_status`, `source_count`, `tokens text[]`, `needs_review` bool | The venue master record | `lat_lng_idx`, `geocell_idx`, `outward_idx`, `town_key_idx`, `tokens_gin_idx` GIN, `brand_id_idx` (`:291-296`) | `gyms/index.js` (search/near/inPlace/get/suggest) |
| `gym_venue_sources` (`:298-311`) | `rpc_only` (RLS on, NO policy, `:431-440`) | `id`, `venue_id`, `source`, `source_record_id`/`url`/`name`/`status`, `retrieved_at`, `payload jsonb` | Per-venue provenance (never exposed raw — `gyms_get` reads only `source_name`/`source`, `:945-953`) | `..._venue_idx` | internal only (no direct client read) |
| `gym_venue_history` (`:313-324`) | `rpc_only` | `id`, `venue_id`, `change`, `before`/`after jsonb`, `actor`, `created_at` | Audit log of venue state changes (submit/confirm/verify/moderator actions) | `..._venue_idx` | internal (moderator queue would read it; no such queue screen exists client-side today, see §3) |
| `gym_submissions` (`:336-362`) | `rpc_only` | `id` (= the venue id it created, see design note `:326-335`), `submitter_id`, `name`/`address_line`/`town`/`postcode`, `website`/`operator`, `lat`/`lng`, `status` CHECK(pending/verified/rejected/merged/duplicate), `duplicate_of` FK, `confirmations`, `reviewed_at`/`by` | User "add my gym" submissions | `..._submitter_idx` | `gyms/index.js` (`submit`/`confirmSubmission`) |
| `gym_reports` (`:364-388`) | `rpc_only` | `id`, `venue_id`, `reporter_id`, `kind` CHECK(closed/wrong_name/wrong_location/duplicate_of/not_a_gym/other), `detail`, `status` CHECK(open/resolved/dismissed), `resolved_at` | Venue problem reports | `..._venue_idx` | `gyms/index.js` (`report`) |
| `gym_postcode_sectors` (`:390-398`) | `global_read_only` | `sector` PK, `lat`/`lng`, `count`, `country`, `region_code`, `local_authority_code` | ONSPD-derived sector centroids, used to geocode a postcode to a lat/lng without a live geocoder | none beyond PK | server-side only (`gyms_submit` reads it, `:1071`) — **seed data is NOT part of the migration** ("Seed data lives OUTSIDE the migration", `supabase/README.md:157-163`), so even once 162 is applied this table is empty until `supabase/seed_gyms_v1/` is run |

---

## 3. RPCs — signature, purpose, caller, rate rail, return, client caller

Every RPC is `SECURITY DEFINER`, `SET search_path = public, pg_temp`,
revoked from `PUBLIC`/`anon`, granted to `authenticated` only (loops at
`migrate_160_community.sql:3685-3773`, `migrate_161_community_connections.sql:2867-2922`,
`migrate_162_gym_directory.sql:2639-2683`). "Caller" below means which role
may invoke it per that grant, unless the body adds its own check (e.g.
`community_is_moderator()`).

### migrate_160 — 41 client RPCs (acceptance check names them all: `:4009-4017`)

| RPC | Signature | Purpose | Rate rail | Returns | Client caller |
|---|---|---|---|---|---|
| `community_check_handle` | `(_h text)` | availability of a handle | `check_handle` 120/120 per hour (`:1438`) | bool via jsonb | `profile.js checkHandle` |
| `community_is_moderator` | `()` | is caller in `community_moderators` by email | none | bool | `moderation.js isModerator` |
| `community_get_me` | `()` | caller's own full profile + settings | none | jsonb | `profile.js loadMe/refreshMe` |
| `community_upsert_profile` | `(_p jsonb)` | create/update profile | `profile_upsert` 5/5 per day (`:1646`) | profile card | `profile.js upsertProfile` |
| `community_leave` | `()` | leave Community (narrow erasure) | none | ok | `profile.js leaveCommunity` |
| `community_follow` | `(_target uuid)` | follow/request-follow | `follow` 30/100 per day + hard cap 2000 (`:1767,1771`) | state | `profile.js follow` |
| `community_unfollow` | `(_target uuid)` | unfollow | none | state | `profile.js unfollow` |
| `community_respond_follow` | `(_requester uuid, _accept boolean)` | accept/decline a follow request | none | ok | `profile.js respondToFollow` |
| `community_remove_follower` | `(_follower uuid)` | remove a follower | none | ok | `profile.js removeFollower` |
| `community_list_follows` | `(_uid uuid, _kind text, _cursor text, _limit int)` | followers/following list | none | list | `profile.js listFollows` |
| `community_block` | `(_target uuid)` | block | none | ok | `profile.js blockUser` |
| `community_unblock` | `(_target uuid)` | unblock | none | ok | `profile.js unblockUser` |
| `community_mute` | `(_target uuid)` | mute | none | ok | `profile.js muteUser` |
| `community_unmute` | `(_target uuid)` | unmute | none | ok | `profile.js unmuteUser` |
| `community_relationships` | `()` | bulk relationship state | none | jsonb | `profile.js relationships` |
| `community_publish_programme` | `(_p jsonb)` | publish a snapshot | `programme_publish` 10/10 per day (`:2187`) | programme | `feed.js publishProgramme` |
| `community_unpublish_programme` | `(_id uuid)` | hide own programme | none | ok | `feed.js unpublishProgramme` |
| `community_get_programme` | `(_id uuid)` | read one programme | none | programme | `feed.js getCommunityProgramme` |
| `community_record_programme_use` | `(_id uuid, _mode text)` | log use/adapt | none | ok | `feed.js recordProgrammeUse` |
| `community_my_programmes` | `()` | caller's own programmes | none | list | `feed.js myProgrammes` |
| `community_search_programmes` | `(text, text, text, int)` | search programmes | **none** | list | `feed.js searchProgrammes` |
| `community_discover_programmes` | `(text, text, int)` | discover feed of programmes | none | list | `feed.js discoverProgrammes` |
| `community_create_post` | `(text, jsonb, text, uuid, text)` | create a story | `post` 3/10 per day (`:2563`) | post | `feed.js createPost` |
| `community_delete_post` | `(_id uuid)` | delete own post | none | ok | `feed.js deletePost` |
| `community_get_post` | `(_id uuid)` | read one post | none | post | `feed.js getPost` |
| `community_feed` | `(_cursor text, _limit int)` | followed-people feed | none | list | `feed.js loadFeed` |
| `community_discover_posts` | `(text, int)` | discover feed of posts | none | list | `feed.js loadDiscoverPosts` |
| `community_react` | `(_post_id uuid, _on boolean)` | like/unlike | `react` 100/300 (`:2771`, only when turning ON) | ok | `feed.js reactToPost` |
| `community_comment` | `(text, uuid, text)` | comment | `comment` 10/30 per hour (`:2828`) | comment | `feed.js addComment` |
| `community_delete_comment` | `(_id uuid)` | delete own comment | none | ok | `feed.js deleteComment` |
| `community_list_comments` | `(text, uuid, text, int)` | list comments | none | list | `feed.js listComments` |
| `community_search_people` | `(_q text, _limit int)` | handle/display-name search | **none** (only rate-checked RPC family exception — see §4) | list | `feed.js searchPeople` |
| `community_suggested_people` | `(_limit int)` | scored suggestions | **none** | list | `feed.js suggestedPeople` |
| `community_get_profile` | `(_handle text, _uid uuid)` | read one profile | none | profile | `profile.js getProfile` |
| `community_dimensions_me` | `()` | caller's own dimension counts (style/area/gym/programme) for the Discover hub | none | jsonb | `feed.js myDimensions` |
| `community_dimension` | `(text, text, text, int)` | one dimension's people/posts | none | jsonb | `feed.js loadDimension` |
| `community_activity` | `(text, int)` | activity inbox read | none | list | `activity.js loadActivity` |
| `community_mark_activity_seen` | `()` | mark inbox seen | none | ok | `activity.js markActivitySeen` |
| `community_report` | `(text, uuid, text, text)` | file a report | `report` 20/20 per day (`:3479`) | report id | `moderation.js reportContent` |
| `community_moderation_queue` | `(text, text, int)` | moderator: read queue | none (gated by `community_is_moderator()`, `:3527-3529`) | list | `moderation.js moderationQueue` |
| `community_moderate` | `(uuid, text, text)` | moderator: act on a report | none (same gate) | ok | `moderation.js moderate` |

### migrate_161 — 18 new + 6 re-issued client RPCs

New (privilege list `:2893-2918`):

| RPC | Signature | Purpose | Rate rail | Client caller |
|---|---|---|---|---|
| `community_connect` | `(uuid, text[], text)` | send a connect request | `connect` 10/30 per day (`:1274`) | `connections.js connect` |
| `community_respond_connect` | `(uuid, boolean)` | accept/decline | `respond_connect` 120/120/hr (`:1321`) | `connections.js respondToConnect` |
| `community_withdraw_connect` | `(uuid)` | withdraw own request | none | `connections.js withdrawConnect` |
| `community_remove_connection` | `(uuid)` | remove an existing connection | none | `connections.js removeConnection` |
| `community_list_connections` | `(uuid, text, int)` | list connections | `list_connections` 120/120/hr (`:1453`) | `connections.js listConnections` |
| `community_update_training_profile` | `(jsonb)` | write the `tp_*` bands | `update_training_profile` 120/120/hr (`:1675`) | `trainingProfile.js syncTrainingProfile` |
| `community_set_partner` | `(boolean, jsonb)` | open-to-partner flag + prefs | `set_partner` 120/120/hr (`:1751`) | `connections.js setPartner` |
| `community_set_connect_from` | `(text)` | who may connect (anyone/followers/nobody) | `set_connect_from` 120/120/hr (`:1777`) | `connections.js setConnectFrom` |
| `community_set_show_programmes` | `(boolean)` | show-my-programmes toggle | `set_show_programmes` 120/120/hr (`:1797`) | `connections.js setShowProgrammes` |
| `community_find_people` | `(text, text, int)` | scored discovery ("like_me"/gym/area/programme/partners/might_know) | `find_people` 120/120/hr (`:1857`) | `findPeople.js findPeople` |
| `community_programme_people` | `(uuid, text, int)` | "people on this programme" | none | `findPeople.js programmePeople` |
| `community_gym_summary` | `(text)` | gym community summary | `gym_summary` 120/120/hr (`:2200`) | `findPeople.js gymSummary` |
| `community_gym_suggest` | `(text, text)` | gym autocomplete for the area picker | `gym_suggest` 120/120/hr (`:2343`) | `findPeople.js gymSuggest` |
| `community_conversations` | `(text, int)` | conversation list | none | `messages.js listConversations` |
| `community_messages` | `(uuid, text, int)` | message page | none | `messages.js listMessages` |
| `community_send_message` | `(uuid, text, text, uuid)` | send | `message` 20/60/hr (`:2589`) | `messages.js sendMessage` |
| `community_mark_conversation_read` | `(uuid)` | mark read | none | `messages.js markRead` |
| `community_delete_message` | `(uuid)` | delete own message | none | `messages.js deleteMessage` |

Re-issued in full (160's body extended, same signature): `community_get_me`,
`community_upsert_profile`, `community_block`, `community_unfollow`,
`community_remove_follower`, `community_leave`.

### migrate_162 — 11 client RPCs (privilege list `:2667-2683`)

| RPC | Signature | Purpose | Rate rail | Client caller |
|---|---|---|---|---|
| `gyms_search` | `(_q text, lat, lng, limit)` | token/postcode/brand search | `gyms_read` 120/120/min, shared across all 4 reads (`:758`) | `gyms/index.js search` |
| `gyms_near` | `(lat, lng, radius_m, limit)` | radius search | `gyms_read` (`:854`) | `gyms/index.js near` (unreachable from UI — see §12) |
| `gyms_in_place` | `(_town_key, limit)` | all venues in a town key | `gyms_read` (`:895`) | `gyms/index.js inPlace` |
| `gyms_get` | `(_id)` | one venue + provenance names | `gyms_read` (`:936`) | `gyms/index.js get` |
| `gyms_suggest` | `(_q, lat, lng)` | 8-row autocomplete, **delegates to `gyms_search(_q,_lat,_lng,8)`** (`:977`) | shares `gyms_read` via the delegated call | `gyms/index.js suggest` |
| `gyms_submit` | `(_p jsonb)` | add-a-gym | `gyms_submit` 3/3 per 24h (`:1068`) | `gyms/index.js submit` |
| `gyms_confirm_submission` | `(_id)` | second-confirmer flip to open | `gyms_confirm` 20/20/hr (`:1255`) | `gyms/index.js confirmSubmission` |
| `gyms_report` | `(_venue_id, _kind, _detail)` | report a venue problem | `gyms_report` 10/10 per 24h (`:1333`) | `gyms/index.js report` |
| `gyms_review_submission` | `(uuid, text, uuid)` | moderator: approve/reject a submission | none (moderator-gated) | **NONE — no client caller found** (see below) |
| `gyms_review_report` | `(uuid, text)` | moderator: resolve a venue report | none (moderator-gated) | **NONE — no client caller found** |
| `community_set_gyms` | `(uuid, uuid[])` | set primary + up to 3 other gyms | `set_gyms` 60/60/hr (`:1530`) | `gyms/index.js setGyms` |

`community_gym_summary` and `community_gym_suggest` are also re-issued in
162 (`CREATE OR REPLACE`, same signatures) to resolve `gym:<uuid>` keys —
not new RPCs.

**Server functions with no client caller, confirmed by exhaustive grep**
of every RPC name against `src/lib/community/`, `src/lib/gyms/` and
`src/screens/` (excluding tests): `gyms_review_submission` and
`gyms_review_report`. These exist only for a moderator to call directly
(e.g. via SQL or a future admin surface) — no `CommunityModerationScreen`-
equivalent for gyms exists in the client. `community_moderation_queue`
and `community_moderate` (the profile/post moderation RPCs) **do** have a
client caller: `src/screens/CommunityModerationScreen.js` via
`src/lib/community/moderation.js:64,79`.

**Rate-unlimited client RPCs worth flagging** (no `_community_rate_check`
call in the body, confirmed by grepping every `_community_rate_check(` call
site against the full RPC list): `community_search_people`,
`community_suggested_people`, `community_get_profile`,
`community_dimensions_me`, `community_dimension`, `community_activity`,
`community_mark_activity_seen`, `community_feed`, `community_discover_posts`,
`community_discover_programmes`, `community_search_programmes`,
`community_get_post`, `community_list_comments`, `community_get_programme`,
`community_record_programme_use`, `community_my_programmes`,
`community_unfollow`, `community_unblock`, `community_unmute`,
`community_block`, `community_mute`, `community_relationships`,
`community_list_follows`, `community_remove_follower`, `community_leave`,
`community_get_me`, `community_moderation_queue`, `community_moderate`,
`community_withdraw_connect`, `community_remove_connection`,
`community_conversations`, `community_messages`,
`community_mark_conversation_read`, `community_delete_message`,
`community_delete_post`, `community_delete_comment`,
`community_unpublish_programme`. Most of these are cheap reads gated by
`_community_require_profile`/auth, or reversals of a rate-limited forward
action (unfollow/unblock/unmute), but `community_search_people` in
particular is a text-search RPC with **no rate rail at all** — contrast with
`community_find_people`, which had the same gap closed by the 2026-09-06
security review (comment at `migrate_161_community_connections.sql:1854-1857`:
"the most expensive read in this file, up to 300 profiles with four
correlated subqueries each, had no rail at all").

---

## 4. Search mechanics

**No trigram, no full-text search, no PostGIS/earthdistance extension
anywhere.** Confirmed by grep across all three files for
`trgm|pg_trgm|tsvector|gin_trgm|extension`: zero matches. All "search" is
plain SQL `LIKE`/array-overlap/exact-fold matching, plus a hand-rolled
haversine for gym distance.

### `community_search_people(_q text, _limit int)` — people by handle/name

`migrate_160_community.sql:2941-2979`. Exact matching semantics:
- Query folded via `_community_fold()` (`:686-714`: lowercase, accent-strip,
  punctuation→space, deliberately matches the client's `foldText()` in
  `src/lib/community/keywordFilter.js` except folding punctuation too, which
  the file's own comment (`:699-701`) says is "the safe direction").
  Rejected (empty result) if folded query is null or `length < 2` (`:2953-2955`).
- Handle match: `pr.handle LIKE v_q || '%'` — **prefix only** (`:2969`).
- Display-name match: `' ' || fold(display_name) LIKE '% ' || v_q || '%'`
  — **word-prefix only** ("sam" matches "Big Sam", not "Awesome" — comment
  `:2970-2972`).
- No ranking beyond: exact-handle-prefix hits first (boolean DESC), then
  `last_active_at DESC` (`:2958,2974`).
- Filters (hard): `status='active'`, `visibility='public'`, `is_minor=false`,
  not self, `NOT _community_is_blocked` (`:2963-2967`). No limit clamp via
  `_community_limit` beyond the passed `_limit` (uses `_community_limit(_limit)`
  at `:2949`, which the general limit helper — not independently re-read
  here — clamps to a fixed range per its other call sites, typically 1-50).
- **No rate limit at all** (see §3).

### `community_suggested_people(_limit int)` — scored suggestions

`migrate_160_community.sql:2985-3093`. Candidate pool: active, public,
non-minor, not self, not blocked, **not already followed**, capped at 200
rows ordered by `last_active_at DESC` before scoring (`:3005-3017`). Signals
and weights (verbatim from the loop body):
- Shared programme use (own-use overlap OR one owns / other uses):
  **+3** (`:3023-3037`)
- Same `gym_key`: **+3** (`:3039-3042`)
- Any shared style (first match only): **+2** (`:3044-3051`)
- Same `area_key`: **+2** (`:3053-3056`)
- Same `goal`: **+1** (`:3058-3061`)
- Mutual follows (I follow X who follows them): **+2** flat, not scaled
  by count (`:3063-3071`)
- Threshold: included only if `score >= 1` (`:3073`) — every signal is a
  **sort term**, none is a hard filter (aside from the base eligibility
  filters above, which ARE hard filters).
- Final order: `score DESC, last_active_at DESC`, truncated to `_limit`
  inside the same query (`:3082-3090`) — no pagination cursor.

### `community_find_people(_mode, _cursor, _limit)` — the discovery door, scoring SQL verbatim

`migrate_161_community_connections.sql:1821-2100` (re-issued with one
addition in `migrate_162_gym_directory.sql:2120-2399`, diffed below).

**Modes**: `like_me`, `gym`, `area`, `programme`, `partners`, `might_know`
(`:1849-1852`). **Important finding**: `like_me` and `might_know` apply
**no additional WHERE-clause filter** beyond the shared base filters — the
per-mode filters (`:1914-1923`) only branch on `gym`/`area`/`programme`/
`partners`; `like_me` and `might_know` run the identical query and scoring
and are distinguished only by the `count` field in the response using
`v_total` instead of `v_count` (`:2097`). **The two modes are functionally
identical in this RPC as written.**

Base candidate filters (hard): `status='active'`, `visibility='public'`,
`is_minor=false`, not self, `NOT _community_is_blocked`,
`NOT _community_is_connected`, capped at 300 rows ordered by
`last_active_at DESC` before scoring (`:1905-1925`).

Mode-specific hard filters (161 body, `:1914-1923`):
```sql
AND (_mode <> 'gym'       OR p.gym_key = v_key)
AND (_mode <> 'area'      OR p.area_key = v_key)
AND (_mode <> 'programme' OR (p.tp_programme_key = v_key AND p.show_programmes = true))
AND (_mode <> 'partners'  OR p.open_to_partner = true)
AND (_mode <> 'partners'
     OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
     OR (v_me.gym_key IS NOT NULL AND p.gym_key = v_me.gym_key))
```
162's re-issue widens the `gym` filter only, to also match `other_gym_ids`
(`migrate_162_gym_directory.sql:2214-2215`, confirmed by diff against 161):
```sql
AND (_mode <> 'gym'       OR p.gym_key = v_key
       OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))
```

**Scoring loop, verbatim (161 body, `:1926-2061`), every signal and weight,
every one a sort term (none is a hard filter beyond the base/mode filters
above):**

```sql
IF v_me.gym_key IS NOT NULL AND v_row.gym_key = v_me.gym_key THEN
  v_score := v_score + 3;                                  -- same primary gym: +3
END IF;

-- 162 addition only: other_gym_ids overlap: +2 ("Also trains at your gym")

IF v_me.tp_programme_key IS NOT NULL
   AND v_row.tp_programme_key = v_me.tp_programme_key THEN
  v_score := v_score + 3;                                  -- same programme: +3
END IF;

SELECT s INTO v_style FROM unnest(v_me.styles) AS s
WHERE s = ANY (v_row.styles) LIMIT 1;
IF v_style IS NOT NULL THEN
  v_score := v_score + 2;                                  -- any shared style: +2
END IF;

IF v_me.area_key IS NOT NULL AND v_row.area_key = v_me.area_key THEN
  v_score := v_score + 2;                                  -- same area: +2
END IF;

-- mutual connections (INTERSECT of both sides' connected-user sets)
IF v_mconn > 0 THEN
  v_score := v_score + least(v_mconn * 2, 3);               -- 2 pts each, capped at 3
END IF;

-- mutual follows
IF v_mfoll > 0 THEN
  v_score := v_score + least(v_mfoll, 3);                   -- 1 pt each, capped at 3
END IF;

IF v_me.goal IS NOT NULL AND v_row.goal = v_me.goal THEN
  v_score := v_score + 1;                                   -- same goal: +1
END IF;

-- shared time band (only compares bands BOTH people opted to share)
IF v_band IS NOT NULL THEN
  v_score := v_score + 2;                                   -- shared time band: +2
END IF;

-- shared training days, >=2 overlap
IF v_days IS NOT NULL AND array_length(v_days, 1) >= 2 THEN
  v_score := v_score + 1;                                   -- shared days (>=2): +1
END IF;

IF v_me.tp_sessions_band = v_row.tp_sessions_band THEN
  v_score := v_score + 1;                                   -- same sessions/week band: +1
END IF;

IF v_me.tp_experience_band = v_row.tp_experience_band THEN
  v_score := v_score + 1;                                   -- same experience band: +1
END IF;

-- shared staple lifts, INTERSECT
IF v_lifts > 0 THEN
  v_score := v_score + least(v_lifts, 3);                   -- 1 pt each, capped at 3
END IF;

IF coalesce(v_me.open_to_partner, false) AND coalesce(v_row.open_to_partner, false) THEN
  v_score := v_score + 2;                                   -- both open to a partner: +2
END IF;

-- inclusion: score >= 1 OR a keyed mode (gym/area/programme/partners) always returns its matches
```

Final ordering: `score DESC, last_active_at DESC`, offset/limit applied in
a subquery (`:2065-2074`); the response `count` is the pre-scoring
candidate count for keyed modes, or the post-scoring total for
`like_me`/`might_know` (`:2097`). **Rate limit**: `find_people` 120 calls
per hour, added in the 2026-09-06 security review specifically because this
RPC runs "up to 300 profiles with four correlated subqueries each"
(`:1854-1857`).

**No area/geo scoping of any kind** — "area" is an exact string match on a
user-typed, folded label (see §12); no radius, no bounding box, no
hierarchy is used for people search anywhere.

### Gym search (`gyms_search`, migrate_162, `:734-832`) — exact semantics

- Input capped at 80 chars / 8 tokens (`:746,750-751`, security review 35
  finding 3, comment `:702-733` documents a 61s-query regression this
  fixed).
- **Postcode path**: if the query is a full or outward-valid UK postcode
  shape (`_gyms_postcode_full_valid`/`_outward_valid`, `:477-496`), match
  is `v.outward = outward_of(query)` — exact, no fuzziness (`:795,747-749`).
- **Text path**: `v.tokens && v_toks` (GIN array-overlap, exact token set
  intersection), OR a brand alias exact fold match, OR `town_key` exact
  match, OR (only on the **last** token, i.e. "still typing") a `LIKE
  token || '%'` prefix check against tokens/town_key/brand aliases
  (`:796-820`). This is **not** trigram similarity — it is `LIKE` prefix
  bounded to the final token only, chosen deliberately after measuring the
  full-scan prefix approach at 61s on a 46k-row catalogue (comment
  `:700-733`).
- Coordinate bounding box (~40 km, `:764-767,822-825`) applied only if
  `_lat`/`_lng` are supplied — **the app never sends them**
  (`src/lib/gyms/index.js:8-18` deviation note: no `expo-location`
  dependency, so no device coordinate is ever collected).
- Ranking (server, inside the query, applied before the outer LIMIT per
  finding 10 at `:730-733`): `brand_match DESC, town_match DESC, distance_m
  ASC NULLS LAST, display_name ASC` (`:769-772,826`). `brand_match`/
  `town_match` are 0/1 flags from a broader prefix EXISTS check
  (`:781-789`), computed only over rows the WHERE clause already narrowed.
- Distance (`_gyms_distance_m`, `:525-542`): **haversine**, mean earth
  radius 6,371,000 m, plain trig — no PostGIS, no earthdistance extension.
- Limit clamp: `1..40` (`:753`).
- Rate: shared `gyms_read` key, 120 calls per **minute** (not hour, unlike
  every Community rail — `:758`), covering `gyms_search`, `gyms_near`,
  `gyms_in_place`, `gyms_get` and (by delegation) `gyms_suggest`.

**Client-side re-ranking** (`src/lib/gyms/rank.js:104-207`): the server's
≤40 candidates are re-ordered client-side with a weighted score (brand
exact 1000, brand close/Levenshtein-tolerant 700, postcode-outward match
500, town match 300, name-token prefix 60, name-token close 30, distance
score `max(0, 200 - metres/100)`), stable-sorted, ties kept in server
order. This is a **second, independent** ranking layer purely for display
order — the RPC's own ORDER BY already ran server-side. Every venue carries
`reasons` strings, never a score, in the UI (`rank.js:11-14`).

`gyms_suggest` (`:968-978`) is a **pure delegation**: `gyms_search(_q,
_lat, _lng, 8)` — "the SAME matching ... so the two can never silently
disagree" (comment `:965-967`).

---

## 5. Suggestions/recommendations — signals, safety respect, cold start

**Two independent scored-suggestion mechanisms exist** (`community_suggested_people`
§4 and `community_find_people` §4) — they are NOT unified, use different
candidate pools (not-yet-followed vs not-yet-connected) and different
weight scales, and are called from different screens
(`feed.js suggestedPeople` vs `findPeople.js findPeople`).

**Signals used, union of both RPCs**: same gym (primary, +3 in both;
+2 for `other_gym_ids` in 162's find_people only), same area (+2 both),
same programme/style (+2-3 both), same goal (+1 both), mutual
follows/connections (+1-3 both, capped), shared training-profile bands
(time/days/sessions/experience/staple-lifts, find_people only, since
`tp_*` did not exist before 161), both-open-to-partner (+2, find_people
only). **No signal from body data, engagement/popularity, or anything the
engine inferred** — the file's own comment states this as a deliberate
rule (SD-09, `migrate_160_community.sql:2981-2983`: "Suggestions are scored
on CHOSEN facts only ... never on popularity, never on anything the engine
inferred, never on body data").

**Blocks/mutes/minors/connect_from respected**:
- Blocks: hard filter in both RPCs (`NOT _community_is_blocked`,
  `suggested_people:3012`, `find_people:1912`).
- Minors: hard filter `is_minor = false` on the candidate pool in both
  (`suggested_people:3010`, `find_people:1910`) — a minor never appears as
  a suggestion to anyone, and (separately) `_community_caller_is_minor`/
  `_community_other_is_minor` block `community_connect` and
  `community_send_message` entirely for either side (`migrate_161:1222,2560`).
- Mutes: **not filtered in either suggestion RPC** — a muted person can
  still appear as a suggested person or in find_people (mutes only silence
  push notifications per `community-notify/index.ts:110-113,417-431`, and
  hide their content in-feed per the client, not reviewed in this backend
  pass). This is a gap worth flagging for the judgement stage.
- `connect_from`: **not consulted by `community_find_people` or
  `community_suggested_people` at all** — both are person-discovery RPCs
  that return a profile card with a `connection` state
  (`_community_connection_state`, `migrate_161:638-669`); the recipient's
  `connect_from` setting is enforced only inside `community_connect` itself
  (`migrate_161:1226-1235`) at request time, not at discovery time. So a
  person with `connect_from='nobody'` can still be suggested/found, and the
  connect attempt then fails with `connect_not_allowed`.

**Cold start (zero data)**: no special-cased logic exists for a brand-new
account. `community_suggested_people` and `community_find_people` both run
the identical scoring loop regardless of profile completeness; a caller
with no `styles`/`gym_key`/`area_key`/`tp_*` set simply scores 0 on every
signal against everyone and the suggestion list becomes empty (`suggested_people`
requires `score >= 1`) or, for keyed find_people modes, empty because
`v_key IS NULL` short-circuits to an explicit "empty door" response
(`migrate_161:1896-1903`, comment: "An honest empty door rather than a
pretend list: the row on the screen already says what would make it work
(SD-28)"). There is no fallback to "everyone active recently" or similar.

---

## 6. Relationship model

**Four independent states with distinct semantics**: follow (one-directional,
possibly asymmetric, can be `requested`/`accepted`), block (bidirectional
question via `_community_is_blocked`, stored as one directed row),
mute (one-directional, silences pushes+feed only), connection (mutual,
ONE row per pair via `_community_connection_state`, states
`requested`/`connected`/`declined`). **No "restrict" relationship state
exists** — `restrict`/`restricted` only appears as a `community_profiles.status`
value (an account-level moderation state set by a moderator via
`community_moderate('restrict_account', ...)`,
`migrate_160_community.sql:3646-3653`), not a per-relationship "restrict a
follower" feature like Instagram's.

**State transition functions**:
- Follow: `community_follow` (`160:1741-1790`), `community_unfollow`
  (`161:2736-2763`, re-issued to also collapse a connection),
  `community_respond_follow` (`160:1807-1839`), `community_remove_follower`
  (`161:2772-2798`, re-issued for the same reason).
- Block/unblock: `community_block` (`161:2685-2731`, re-issued — removes
  follows both ways, removes an active/requested connection but preserves a
  `declined` row's 30-day bar per finding 3, closes the conversation,
  purges shared activity), `community_unblock` (`160:1958-1971`, simple
  delete).
- Mute/unmute: `community_mute`/`community_unmute` (`160:1972-2002`, simple
  inserts/deletes, no cascading effect on anything else).
- Connect: `community_connect` (`161:1185-1292`, verbatim gates read in
  §6 below), `community_respond_connect` (`161:1297-1368`, accept makes
  both people follow each other with ACCEPTED edges "even across
  followers-only profiles", comment `:1294-1296`), `community_withdraw_connect`
  (`161:1368-1400`), `community_remove_connection` (`161:1401-1432`).

**`community_connect` gates, in order** (`161:1202-1274`): target not self
→ caller has an active profile and has accepted the current rules version
(`_community_require_rules`, raises `rules_outdated`) → target exists and
is `active` → not blocked either way → **neither side is a minor**
(checked fresh on both, not off a stale stored flag — finding 1, `:1222`)
→ target's `connect_from` respected (`nobody` always refuses;
`followers` requires an accepted follow from requester to target,
`:1227-1235`) → up to 2 reasons from a fixed set, deduplicated (`:1238-1248`)
→ a `declined`/`withdrawn` row blocks re-request for 30 days from
`declined_at` (`:1266-1271`) → rate check `connect` 10/30 per day
(`:1274`) → upsert with `ON CONFLICT` (idempotent re-request is a no-op
returning the existing card, `:1260-1265`).

**What messaging requires**: `community_send_message` requires
`_community_is_connected(v_uid, _target)` to be true — **connection, not
follow, is the precondition for messaging** (`161:2563-2565`). A closed
conversation (from a prior block/removal) cannot be reopened by messaging
again — it raises `not_allowed` (`161:2597-2602`); a fresh connection
deletes the closed conversation row so the next message starts clean (the
comment at `161:2718-2722` says the row is not deleted on close itself,
only marked `closed_at`; the "delete on reconnect" behaviour is asserted in
the comment but the actual DELETE statement for that path was not located
in the read ranges above and should be confirmed against
`community_connect`'s full body if this detail matters to the judgement).

**On remove/unfollow/block, what happens to conversations/feed/suggestions/notifications**:
| Action | Follows | Connection | Conversation | Activity | Feed/suggestions |
|---|---|---|---|---|---|
| `community_unfollow` (on a connected pair) | removes my→their follow | **also removes the connection** | **closes it** (`closed_at=now()`) | untouched | connection gone → reappears as a `find_people`/`suggested_people` candidate |
| `community_remove_follower` (on a connected pair) | removes their→my follow | **also removes the connection** | **closes it** | untouched | same |
| `community_block` | **both directions deleted** | **removed** (requested/connected states; a `declined` row's bar survives) | **closed** | **all activity between the two purged** (`161:2726-2728`) | candidate pool excludes blocked (hard filter everywhere) |
| `community_remove_connection` | not read in this pass (161:1401-1432 not fully quoted above) | removed | presumably closed (consistent with the unfollow/remove_follower pattern; not independently re-verified line-by-line) | — | — |

**Notifications on relationship changes**: `community-notify` re-verifies
the underlying row itself (it does not trust the client) before ever
pushing — so a removed/blocked relationship cannot be used to force a stale
push (see §8).

---

## 7. Messaging

**Tables**: `community_conversations`, `community_messages` (§2).
**Send rules** (`community_send_message`, `161:2527-2619`): target ≠ self;
caller has an active profile and current rules version accepted; target
active and not blocked; **neither party a minor** (checked fresh both
sides); **caller and target must be `_community_is_connected`** — this is
the message-request-equivalent: Volyume has **no separate "message
request" state** — a message simply cannot be sent until a mutual
connection exists, so there is no inbox of pending/filtered requests to
build. Body: trimmed, non-empty, ≤1000 chars, passed through
`_community_clean_text` (the blocked-terms gate). **One optional context
reference** (`ref_kind` IN `programme`/`post`, `ref_id`) — only accepted if
the SENDER may currently view that programme/post (`:2577-2586`, SD-14b:
"may I see this thing" is asked at send time, and again at read time per
viewer in `_community_message_json`, `161:744-780`, so a reference that
later becomes invisible to the reader renders as text with no tile rather
than leaking).

**Refs**: `programme` or `post` only, one per message, never a second
context. **Read state**: `a_last_read_at`/`b_last_read_at` on the
conversation row (not per-message) — updated by `community_mark_conversation_read`
and implicitly by the sender's own send (`:2609-2614`). Unread count is
computed on read (`community_conversations` RPC, `161:2439-2442`) as
`count(*) WHERE sender_id <> me AND created_at > last_read_at` — **not
stored**, computed per list-fetch.

**Rate limits**: `message` 20/hour (new account) or 60/hour (established,
7+ days), enforced in `community_send_message` (`:2589`).

**Retention**: no TTL, no auto-expiry — messages persist until explicit
deletion (sender-only, hard DELETE, `community_delete_message`,
`161:2649-2673`) or account/Community-leave erasure (§10). A block does
**not** delete message content, only closes the conversation
(`161:2718-2722`, explicit comment: "The messages are not deleted here").

**Media**: **none**. `community_messages.body` is `text` only; no column
for an attachment, no storage bucket reference anywhere in 160/161/162.
Corroborated by `docs/social-discovery-2026-09-06/71-MEDIA-MODEL.md:20`:
"Never a comment, never a message, never a programme" for media, and by
that document's own status line: "**Status: DESIGNED, NOT BUILT**" (`:3`).

**Message requests**: none, by design — connection is the gate (see
above), so there is no "requests" folder or accept/decline-at-message-time
flow the way Instagram DMs have one.

---

## 8. Notifications backend (`community-notify`, read in full)

**Kinds** (`community-notify/index.ts:94-97`): `follow`, `follow_request`,
`follow_accepted`, `reaction`, `comment`, `programme_used`,
`connect_request`, `connect_accepted`, `message` — 9 total.

**Categories** (`:158-161`): `message` → `community_message`;
`FOLLOW_KINDS` (follow/follow_request/follow_accepted/connect_request/
connect_accepted) → `community_follow`; everything else (reaction, comment,
programme_used) → `community_activity`.

**Budgets/batching**:
- **Activity-backed replay guard** (`:475-508`): every kind except
  `message` is proved by a `community_activity` row and can push **at most
  once per proof row** — `pushed_at` is stamped after send, and a second
  call against the same proof (inside the 10-minute recency window) is
  refused via `not_verified` if the activity row cannot be found, or
  silently downgraded to `in_app` if it was already stamped.
- **Message collapse** (`:125-127,510-546`): at most **one push per
  conversation per 15 minutes** while the recipient has not read it,
  tracked on `a_last_push_at`/`b_last_push_at`.
- **Recency window**: every proof query requires the underlying row's
  `created_at`/`responded_at` to be within the **last 10 minutes**
  (`sinceMs`, `:224-225`) — this is the anti-spoofing window, not a rate
  limit per se.
- No per-user daily/hourly push cap beyond the above (no batching digest,
  no "N notifications" summarisation).

**Gate order** (`:9-42` header, matches the code): JWT → prove the action
really happened against the named row → block check (either direction) →
mute check (message/connect kinds only) → recipient's
`notification_preferences` category toggle (fail closed on read error,
`:441-444`) → recipient's open ED/wellbeing flag (fail closed,
`:449-466`, same posture as `partner-cheer`) → replay guard → message
collapse → send via `send-push` (service role fetch, `:562-583`).

**Quiet hours**: **not implemented server-side.** Confirmed by absence in
this file (no time-of-day check anywhere in the 614 lines) and by
`docs/social-discovery-2026-09-06/60-FINAL-REPORT.md:247-249`, listed as an
**open item**: "Server-side quiet hours for server-sent pushes, unresolved
since campaign 1 (SD-15a) and now also true of `connect_request`,
`connect_accepted` and `community_message`."

**Copy**: fixed per-kind strings (`:132-156`), always `@handle`, never a
real name; message pushes never carry content (`:148-151`, SD-31).

---

## 9. Moderation

**Reportable content types**: `profile`, `post`, `comment`, `programme`
(migrate_160 `community_reports_target_kind_check`, `:363-367`), widened in
161 to add `message` (`161:334-340`) — **but no client caller sends a
`message` report** (`src/lib/community/moderation.js`'s `REPORT_TARGET_KINDS`
export was not independently re-verified against the widened CHECK in this
pass; flagged as a cross-check item for §3's client inventory). Separately,
gym venues have their own report path (`gyms_report`, migrate_162,
kinds: closed/wrong_name/wrong_location/duplicate_of/not_a_gym/other) —
**a completely separate reports table** (`gym_reports`, not `community_reports`)
with no moderator-queue client screen (see §3, `gyms_review_report` has no
caller).

**Reasons** (community_reports): spam, harassment, impersonation,
`harmful_body_or_eating_content`, inappropriate, other
(`160:371-373`). The `harmful_body_or_eating_content` reason is
automatically flagged `priority=true` (`160:3502-3503`).

**Auto-hide threshold**: **3 distinct open reports** hides a post/comment/
programme automatically (`_community_auto_hide`, `160:1155-1190`,
`AUTO_HIDE_REPORTS` client constant `limits.js:69` matches). A profile is
**never** auto-hidden — "suspension is always a human decision" (comment
`:1153-1154`). The auto-hide writes a `community_moderation_log` row with
`moderator_id = NULL` (system action, distinguishable from a human one).

**Moderator queue**: `community_moderation_queue` (`160:3511-3597`),
gated by `community_is_moderator()` (email allow-list in
`community_moderators`, seeded from the marketing admin address per the
README description, `supabase/README.md:114`). Cursor-paginated,
newest-first within `priority DESC` first. Each row carries: target
content preview (kind-specific fields), report count for that target,
latest moderator note/handle if actioned (Product review 2026-09-06
findings 19/22, comment `:3554-3558`).

**Actions** (`community_moderate`, `160:3599-3670`): `dismiss`,
`hide_content`/`unhide_content`/`delete_content` (post/comment/programme
only), `restrict_account`/`unrestrict_account`/`suspend_account`/
`unsuspend_account` (sets `community_profiles.status`). Every action writes
`community_moderation_log` (`:3664-3667`) — this is the audit log; there is
no separate "appeals" mechanism, table, or RPC anywhere in the three files
(confirmed by grep for `appeal`).

**Gym moderator actions** (`gyms_review_submission`, `162:1367-1463`;
`gyms_review_report`, `162:1464-1517`): both write `gym_venue_history` as
their audit trail (not `community_moderation_log`) and both are
moderator-gated, but **neither has a client caller** (§3).

---

## 10. Deletion propagation

**Account deletion** (`delete_user_data()`, re-issued in full three times —
160 `:3785-3982`, 161 `:2934-...`, 162 `:2421-...` — each time adding the
new tables the preceding file introduced; "the latest one wins" is stated
explicitly as the reason for full re-issue rather than a patch, `160:3775-3784`).
Community-specific block (160 body, `:3936-3978`):
- Two-sided explicit deletes for tables that name two people and would
  otherwise leave the OTHER person's half standing: `community_blocks`,
  `community_mutes`, `community_follows`, `community_activity`
  (user_id OR actor_id).
- Cascade-only (FK `ON DELETE CASCADE` off `community_profiles`) for:
  `community_reactions`, `community_comments`, `community_programme_uses`,
  `community_posts`, `community_programmes` — deleting the profile row
  itself cascades these.
- `community_reports` **filed BY** this user: `reporter_id` set to NULL
  (kept, another person's safety record) — `community_reports_reporter_id_fkey`
  is `ON DELETE SET NULL` and the RPC also does it explicitly for the
  RPC-fallback path (`:3963-3964`). `community_reports` **ABOUT** this
  user (`target_owner_id = uid`): hard-deleted (`:3965`).
- `community_moderation_log.moderator_id` set to NULL (audit trail
  survives anonymised, `:3968-3970`).
- `community_moderators` row removed by email if the deleting user was a
  moderator (`:3975-3978`).
- 161 adds two-sided deletes/updates for `community_connections`,
  `community_conversations`, `community_messages` (not independently
  re-quoted here; the migration's own header states "a connection, a
  conversation and every message in it go with the person who leaves,
  from BOTH sides" — `161:2800-2802`).
- 162 adds anonymisation of `gym_submissions.submitter_id` and
  `gym_reports.reporter_id` (content/venue rows survive; per-README
  description, `supabase/README.md:189-191`).

**Content deletion** (a single post/comment/programme): hard DELETE via
`community_delete_post`/`community_delete_comment`/`community_unpublish_programme`
(the last is a soft-hide, `status='hidden'`, not a delete — asymmetric with
posts/comments, worth flagging) — reaction/comment counts recompute via
triggers (`_community_reaction_count`/`_community_comment_count`,
`160:1308-1358`), not recalculated on read.

**Community leave** (`community_leave()`, narrower than full account
deletion — appends a `granted=false` consent_log row first, per the header
comment `160:96-97`): not independently re-read line-by-line in this pass;
flagged for cross-check if the judgement stage needs its exact scope
(160:1700-1740 is the function body, not quoted above).

---

## 11. Gym backend (migrate_162)

Covered in full in §2 (tables) and §4 (search mechanics: exact matching,
haversine distance, no PostGIS) and §3 (RPC list). Summary of the items
the brief asks for specifically:

- **Coordinates**: `gym_venues.lat`/`lng` (double precision), sourced from
  either a real geocode (`coord_source` column, values not enumerated by a
  CHECK — free text) or, for user submissions, the **postcode sector
  centroid** (`gym_postcode_sectors`, `gyms_submit:1070-1077`) — explicitly
  NOT a precise geocode of the submitted address (comment `:1081-1084`
  notes this makes distance-based dedupe meaningless for user submissions,
  which is why duplicate detection there is text-only, see below).
- **Postcode**: `postcode`, `outward`, `sector` columns, all derived by
  the `_gyms_postcode_*` helper functions (`:467-524`) from UK postcode
  regex validation — no external geocoding API call anywhere in this file.
- **Town**: `town` (free text) and `town_key` (folded, exact-match key).
- **Operator/brand**: `gym_brands` table with `aliases text[]`; a venue
  links via `brand_id`; a user-submitted `operator` string is matched
  against brand aliases to auto-classify (`gyms_submit:1184-1190`).
- **Status**: `status` CHECK(open/closed/merged/pending) — the visible/
  invisible split (`_gyms_visible`, `:611-622`): `open` is visible to
  everyone; `pending` is visible only to its own submitter.
- **Canonical id**: `id uuid` PK; `parent_venue_id`/`succeeded_by`
  self-referencing FKs exist for merge/succession but no RPC in the read
  ranges above writes them (not independently confirmed absent — flagged).

**Search functions and semantics**: see §4 in full (`gyms_search`,
`gyms_near`, `gyms_in_place`, `gyms_get`, `gyms_suggest`).

**Add-gym submission path** (`gyms_submit`, `162:990-1229`, read in full):
free-text fields pass through the same `_community_clean_text` blocked-
terms gate as every other Community free text (finding 1, `:1029-1039`);
name ≤60, address ≤200, town ≤80, website must match `^https?://` and
≤200 chars, operator ≤80 (`:1049-1063`); postcode must be a full valid UK
postcode shape AND its sector must already be seeded in
`gym_postcode_sectors` or the submission is refused as `invalid_postcode`
(`:1064-1077`, this is the reason the README calls seed order a
precondition of the add-gym flow, `supabase/README.md:157-163`); rate
3/24h (`:1068`).

**Duplicate detection, server-side, exact algorithm** (`:1081-1177`,
comment explains the reasoning at `:1081-1096`): because a user submission
always geocodes to its postcode-sector centroid (not a real address
point), a metres-based distance test between two submissions in the same
sector is meaningless (both sit at distance 0). Instead:
1. **Visible-duplicate check**: same outward code AND (same postcode unit
   with token-set Jaccard similarity ≥ 0.6, OR any-postcode-in-outward
   with Jaccard ≥ 0.85), restricted to rows the caller may see
   (`open`/their own `pending`). A hit returns `duplicate_of` immediately
   without inserting anything (`:1097-1113`).
2. **Invisible-twin check** (review 35 finding 22): the identical text
   match, **without** the visibility restriction, narrowed to `pending`
   only — catches a stranger's pending submission of the same gym the
   caller cannot see. Rather than insert a second identical pending row,
   the caller is recorded as a second independent confirmer on the
   existing (invisible-to-them) venue, which can flip it to `open` if that
   makes 2 distinct confirmers (`:1115-1177`, delegates to the same
   confirm/flip logic `gyms_confirm_submission` uses).
3. Otherwise: insert a new `pending` venue + `gym_submissions` row (same
   uuid for both, by design, `:326-335`) + a `gym_venue_sources` row
   (`source='user'`) + two `gym_venue_history` rows (`submit`, and an
   implicit self-`confirm` so a second **independent** confirmer is what
   reaches the flip threshold of 2, `:1220-1226`).

**Review tiers / confirm / report**: `gyms_confirm_submission`
(`:1243-...`, a second **distinct** actor in `gym_venue_history` flips
`pending`→`open` and `verification_status`→`user_submitted_verified`);
`gyms_report` (`:1308-1367`, six kinds, writes `gym_reports`, and per
`needs_review` column semantics on `gym_venues` two distinct reports of the
same kind flag the row for moderator review — GD-12 comment `:264-267`);
moderator overrides via `gyms_review_submission`/`gyms_review_report`
(no client caller, §3).

**User gym selection on profile** (`community_set_gyms`, `162:1518-1561`):
`community_profiles.gym_id` (primary, nullable) + `other_gym_ids` (array,
capped at 3 by CHECK and again de-duplicated/capped in the RPC body before
the check runs, finding 16 `:1532-1538`); both must be `_gyms_selectable`
(open, or the caller's own not-yet-verified pending submission,
`:626-641`) or the call raises `invalid_input`. Rate 60/hour (`:1530`).

**"People at this gym" query**: `community_gym_summary(_key)`
(`162:1569-1722`, re-issued from 161 to also resolve `gym:<uuid>` keys) —
returns member count, following-among-members count,
open-to-partner-among-members count, style breakdown (top 8), time-band
breakdown, up to 20 people cards, up to 20 public programmes and 10 public
posts from members, all scoped to `p.gym_key = v_key AND status='active'
AND visibility='public' AND is_minor=false AND NOT blocked`
(`:1618-1624`). Explicitly documented as having "no leaderboard, and no
'who is here now'" (presence) per its own header comment
(`161:2172`, carried into the 162 re-issue).

---

## 12. Location

**No coordinate storage for users, anywhere.** `community_profiles` has no
`lat`/`lng` column in 160 or 161. The only path from a user to a
coordinate is indirect and gym-only: `community_profiles.gym_id` → FK →
`gym_venues.lat`/`lng` (162). There is no "my location" field, no location
permission requested for a user's own position
(`src/lib/gyms/index.js:8-18`: "`expo-location` is NOT in package.json
... No coordinate is ever requested, read, or stored by this module").

**Distance computation**: exists only for **gym venues** (`_gyms_distance_m`,
haversine, `162:525-542`) — used in `gyms_search`/`gyms_near` to compute
`distance_m` between a supplied `(lat,lng)` and a venue, and client-side in
`distanceLabel()` (`src/lib/gyms/index.js:244-249`) to render "X mi". **No
distance is ever computed between two people** — `community_find_people`
and `community_suggested_people` have no distance term at all; "area" and
"gym" proximity are exact string-key matches, not geo-proximity.

**Area hierarchy (town → region → nation)**: exists in `gym_venues` for
gym data only (`town`/`town_key`, `local_authority_code`/`name`,
`region_code`/`name`, `country`, migrate_162 `:242-248`) — a real
administrative hierarchy sourced from ONS data (implied by the ONSPD
reference in the README, `supabase/README.md:157-163`). **For people /
`community_profiles.area_key`, there is no hierarchy at all**: it is a
single flat, user-typed, free-text field.

**`area_key`, exact production**: written only inside
`community_upsert_profile` (`160:1617-1621`):
```sql
v_area_label := nullif(btrim(coalesce(_p ->> 'area_label', '')), '');
IF v_area_label IS NOT NULL THEN
  v_area_label := public._community_clean_text(v_area_label);   -- blocked-terms gate
  IF length(v_area_label) > 40 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  v_area_key := nullif(public._community_fold(v_area_label), '');
END IF;
```
i.e. `area_key = fold(area_label)` — the same case/accent/punctuation fold
used everywhere else in Community (`_community_fold`, `160:686-714`). The
user types the label themselves (`src/screens/CommunityEditProfileScreen.js:104,154`,
a plain free-text field, no picker, no autocomplete, no validation against
a real place list) — so "Manchester" and "manchester" match, but
"Manchester" and "Greater Manchester" do not, and there is no correction
for misspellings or synonyms. This is the field `community_find_people`'s
`area` mode and the `+2` area-match signal in both suggestion RPCs key off.

---

## 13. Classification table

| Capability | Status | Evidence |
|---|---|---|
| People search (handle/name) | **Backend only (no client caller for the moderator-adjacent parts); client caller exists for the search itself** — Fully implemented as written, unreachable in production | `community_search_people` has a caller (`feed.js searchPeople`) but the whole schema is unapplied (§1) |
| Gym search | Fully implemented as written, unreachable in production | `gyms_search`/`gyms_suggest`, caller `gyms/index.js`; migration unapplied |
| Geo distance (venues) | Fully implemented as written (haversine), unreachable in production | `_gyms_distance_m`, `162:525-542` |
| Geo distance (people) | **Absent** | No lat/lng column on `community_profiles`; no distance term in `find_people`/`suggested_people` (§12) |
| "Near me" (device location) | **Infrastructure only / effectively absent client-side** | `gyms_near` RPC exists and is wired (`gyms/index.js near`) but **no screen calls it** — no `expo-location` dependency, deviation documented in `gyms/index.js:8-18` |
| Area hierarchy (town→region→nation) | **Partial**: exists for gyms, absent for people | `gym_venues` columns (162) vs `community_profiles.area_key` = flat fold of free text (§12) |
| Recommendations — same gym | Fully implemented as written, unreachable in production | `find_people`/`suggested_people` §4-5 |
| Recommendations — same area | Fully implemented as written (flat string match only, no geo) | §4-5, §12 |
| Recommendations — same style/programme | Fully implemented as written | §4-5 |
| Recommendations — mutual connections/follows | Fully implemented as written | §4 (`find_people` verbatim SQL) |
| Recommendations — training-profile bands (days/time/sessions/experience/lifts) | Fully implemented as written (161 only) | §4 |
| Connections (mutual tie, distinct from follow) | Fully implemented as written, unreachable in production | §6, migrate_161 |
| Messaging (1:1 text) | Fully implemented as written, unreachable in production | §7 |
| Message requests | **Absent by design** | Connection gate substitutes for it (§7) |
| Media (stories/messages/avatars) | **Absent — design-only, not even schema** | `docs/social-discovery-2026-09-06/71-MEDIA-MODEL.md:3`: "DESIGNED, NOT BUILT"; no storage bucket, no media column anywhere in 160/161/162 |
| Groups | **Absent** | No table; explicit comment "There are no groups, no media" (`161:2388`) |
| Challenges | **Absent** | No table, no RPC, no mention anywhere in 160/161/162 |
| Leaderboards | **Absent** | Explicit comment "no leaderboard" (`161:2172`, carried to 162) |
| Presence ("who is here now") | **Absent** | Same comment, explicit: "no 'who is here now'" (`161:2172`) |
| Comments | Fully implemented as written, unreachable in production | `community_comments` table, `community_comment`/`community_list_comments`/`community_delete_comment` RPCs (§2-3) |
| Reactions | Fully implemented as written (single reaction type only, no enum), unreachable in production | `community_reactions`, `community_react` (§2-3) |
| Mentions (@handle in text) | **Absent** | No column, no parsing function, no notification kind for it in `community-notify` (§8 kind list) |
| Saves/bookmarks | **Absent** | No table, no RPC; grep for "save"/"bookmark" in schema returns only unrelated prose ("a rejected save") |
| Reports/moderation | Fully implemented as written (profile/post/comment/programme/message + separate gym-venue reports), unreachable in production | §9 |
| Moderator gym review actions | **Backend only, no client caller** | `gyms_review_submission`/`gyms_review_report` (§3) |
| Blocks/mutes | Fully implemented as written, unreachable in production | §6 |
| Deletion propagation | Fully implemented as written, unreachable in production | §10 |
| Push notifications | Fully implemented as written (minus quiet hours), **edge function not deployed** | §8 |
| Server-side quiet hours | **Absent** | `60-FINAL-REPORT.md:247-249` open item |
| Public share pages (profile/post/programme) | Fully implemented as written, edge function not deployed | `community-public/index.ts`, §1 |

---

## Ambiguities / could not determine

1. **`community_remove_connection`'s exact body** (`161:1401-1432`) was not
   independently line-quoted in this pass — its conversation-close and
   activity-purge behaviour is inferred by pattern-consistency with
   `community_unfollow`/`community_remove_follower`, not directly verified.
   Confirm before relying on it in the judgement.
2. **Whether `community_connect` actually DELETEs a closed conversation row
   on a fresh connect** — the comment at `161:2718-2722` asserts this
   happens "on reconnect", but the DELETE statement itself was not located
   inside the ranges of `community_connect` read in this pass
   (`161:1185-1292`). This should be re-verified against the full function
   body (which extends beyond line 1292) before the judgement treats it as
   confirmed.
3. **`community_leave()`'s exact scope** (`160:1700-1740`) was not
   line-quoted — only its header comment was read. Its "narrower than
   `delete_user_data`" claim is taken from the migration's own module
   comment, not independently verified line-by-line.
4. **Client-side `REPORT_TARGET_KINDS`/`REPORT_REASONS` exports**
   (`src/lib/community/validation.js`) were not cross-checked character-for-
   character against the server CHECK constraints in this pass (§9 flags
   this as unresolved specifically for whether the client can send a
   `message` report).
5. **`parent_venue_id`/`succeeded_by` write path**: no RPC in the ranges
   read appears to write these merge-tracking columns; whether a merge
   flow exists at all (vs. these being forward-provisioned, unused columns)
   was not confirmed by reading every remaining line of `gyms_review_submission`
   in full (only its signature and surrounding comments were read).
6. **Section 1's "what the client does with no backend" is inferred from
   static code tracing, not observed against a live call** — this session
   was expressly barred from calling any Supabase MCP tool, and the schema
   does not exist in any environment to call against in any case. The
   `codeFor()`/`rethrow()` trace is exact; the claim that this is what
   actually happens on a user's device is inference from that trace, not a
   reproduced observation.
7. **Whether any CI workflow deploys the two edge functions automatically**
   was checked only by a name-grep of `.github/workflows` for "community";
   a broader check for a generic "deploy all functions" step that might
   incidentally include them by wildcard was not performed.
