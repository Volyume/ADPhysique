# 22 — CONTRACT: migrate_170_community_connection.sql, Part A

For the client lanes: build against this, not the SQL. Source: `supabase/migrate_170_community_connection.sql`.
WRITTEN, NOT APPLIED — do not call any of this against production until the founder's "run against production"
lands and the file is actually applied.

## Discipline taxonomy (15 keys, max 3 per profile, no dupes)

Keys: `bodybuilding, mens_physique, classic_physique, womens_physique, figure, bikini, wellness, powerlifting,
olympic_weightlifting, strongman, crossfit_functional, calisthenics, hybrid, sport_sc, general_strength`.

Labels (British English, server-authoritative via `_community_discipline_label`): Bodybuilding; Men's physique;
Classic physique; Women's physique; Figure; Bikini; Wellness; Powerlifting; Olympic weightlifting; Strongman and
strongwoman; CrossFit and functional fitness; Calisthenics; Hybrid (lifting and endurance); Sport strength and
conditioning; General strength and fitness.

### Physique-division keys (the Q1b calm-mode / open-ED-flag withhold set) — SEVEN

Lead ruling 3, 2026-09-10. `bodybuilding, mens_physique, classic_physique, womens_physique, figure, bikini,
wellness`. 20-BLUEPRINT.md section 8 calls this "the six" because it was written before Q1 added Women's
physique without removing Wellness; the authoritative set is these seven. The client withholds a viewer's OWN
cohort page for any of these seven under calm mode or an open ED flag (blueprint section 8, Q1b) and carries the
standing Beat UK signpost on all seven. The server has no part in it and never learns the viewer's calm-mode
state — cite this list, not the blueprint's prose.

## community_upsert_profile(_p jsonb) — signature unchanged

New optional key in `_p`: `discipline_keys` (array of up to 3 taxonomy strings). **Omit the key to leave it
unchanged** (same contract `styles` already has); send an array, including `[]`, to replace it. Invalid key,
>3 elements, or a value that is present but is not an array → `invalid_input` (reviewer 2026-09-10: a non-array
used to erase the stored keys silently). No new consent type: rides the existing `community_visibility` consent this RPC
already records.

## _community_profile_card(_uid, _viewer) — signature unchanged

New fields, always present:
- `discipline_keys` (text[]), `discipline_labels` (text[]) — same viewability gate `styles` uses; `[]` when not viewable.
- Nine consistency counters, key always present, **value null unless** the owner's `share_consistency = true` AND
  `status = 'active'` AND `is_minor = false` (applies even to the owner viewing their own card): `c_sessions_week`,
  `c_sessions_month`, `c_weeks_streak`, `c_planned_pct_4w`, `c_consistent_weeks_12w`, `c_trained_days_week` (text[]),
  `c_last_trained_day` (text, `YYYY-MM-DD`), `c_updated_at` (timestamptz), `c_weeks_history` (smallint[]). No new
  toggle: enforces the existing `share_consistency` choice on a surface (someone else's card) that never read it.

Nothing else added. Every card anywhere in Community (board rows, dimension rows, find_people, profile) carries these.

## community_dimension(_kind, _key, _cursor?, _limit?) — signature unchanged

`_kind` gains `'discipline'` (key = taxonomy key) and `'age_band'` (key = a band from `TP_AGE_BANDS`). Return shape
unchanged: `{label, count, people[], programmes: [], cursor}`.

`age_band` is **reciprocal**: caller with no `tp_age_band`, or a `_key` that isn't their own band, gets the empty
shape (`label: null, count: 0, people: []`) — never an error, never another band's roster. `'programme'` still
always returns the empty shape. Minors never counted or listed, in any kind.

## community_dimensions_me(_today) — SIGNATURE CHANGED, now takes `_today`

Was `community_dimensions_me()`; the old 0-arg overload is dropped. Now **requires** `_today` (`YYYY-MM-DD`, the
caller's LOCAL day, same reason `community_board` requires it — never `now()::date`); missing/malformed →
`invalid_input`.

**Lead ruling 1, 2026-09-10 — backwards compatible, so an old build does not break.** A NULL or absent `_today`
is ACCEPTED and falls back to the UK-local day key, `to_char(timezone('Europe/London', now()), 'YYYY-MM-DD')` —
byte-for-byte the format `src/lib/dayKey.js`'s `localDayKey()` produces, so both compare equal against
`c_last_trained_day`. A `_today` that IS supplied is still validated and still `invalid_input` when malformed.
Old builds (`src/lib/community/feed.js:168` sends `{}`) keep working and simply receive the enriched shape, which
is a harmless superset. **New callers must still pass `_today`**: only the client knows the user's real local
day, and the fallback is a safety net for shipped builds, never the intended path.

Also now **rate-railed at 120/hour** (action `dimensions_me`), the same rail `community_board`,
`community_find_people` and `community_hub_summary` carry; it runs `_community_cohort_stats` up to eight times
per call and previously had none.

Return shape: `{dimensions: [...]}`. Every style/gym/area/discipline/age_band row now also carries `member_count`
(int), `trained_today_count` (int) and `sample` (up to 3 `{user_id, handle, display_name, avatar_preset}`,
trained-today preferred then any member, never a minor).

New rows: one per discipline key the caller holds (`kind: 'discipline'`), and one reciprocal age-band row when the
caller shares theirs (`kind: 'age_band', key: <band>, label: <band>` — `label` is the raw key; map it through your
own `TP_AGE_BANDS` for display text). `programme` rows (dead path, `community_programmes` is empty) are not
enriched with the three new keys.

## community_board(...) — signature unchanged

`_scope` gains `'area'`, `'style'`, `'discipline'`, `'age_band'`.
- `area`: `_scope_key` optional, defaults to the caller's own `area_key` (same fallback as `gym`→`gym_id`). No key
  either way → empty board (`rows: [], count: 0`), never an error.
- `style` / `discipline`: `_scope_key` **required** (a profile can hold up to 3 of either, no implicit "yours").
  Missing → `invalid_input`. Out-of-taxonomy `discipline` key → `invalid_input`.
- `age_band`: no `_scope_key` (always the caller's own band). No `tp_age_band` → `not_allowed` (same shape `group`
  gives a non-member).
- Reviewer 2026-09-10: the four NEW scopes only list profiles the caller may actually see
  (`_community_can_view`: public-and-active, someone you follow with an accepted edge, or yourself). A scoped
  board otherwise states the very fact the profile card withholds — `area_label`, `discipline_keys` and
  `tp_age_band` are all behind the card's viewability gate. The pre-existing `gym`/`following`/`group`/`everyone`
  scopes are unchanged.

Everything else unchanged: windows (`week`/`month`/`consistency`), `threshold_met: count >= 8`, keyset `cursor`,
own-row `you`, the `rows[].card`/`metric`/`trained_days`/`trained_today` shape, the 120/hour rate rail. Minors
never on the board.

## community_hub_summary(_today) — NEW

`_today` expected (`YYYY-MM-DD`) and validated when supplied; NULL or absent falls back to the UK-local day key,
exactly as `community_dimensions_me` does above (lead ruling 1). Rate-railed, 120/hour (same rail as
`community_board`/`community_find_people`). Returns:

```
{ cohorts: [ { kind: 'gym'|'area'|'style'|'discipline'|'age_band', key, label,
               member_count, trained_today_count, sample: [] } ],
  groups:  [ { id, name, access, member_count, trained_today_count, sample: [] } ] }
```

One row per: caller's gym (if set), area (if set), each of up to 3 styles, each of up to 3 disciplines, age band
(only while shared) — omitted when `member_count` would be 0. `groups` lists groups the caller is a **member** of
(`state = 'member'`, not requested/invited). `sample` entries: `{user_id, handle, display_name, avatar_preset}`,
never a minor, up to 3, trained-today preferred.

Reviewer 2026-09-10, groups: `member_count` here is **computed** (active, non-minor, not blocked either way,
`state = 'member'`), NOT `community_groups.member_count`, which counts every member row including minors,
suspended and restricted profiles. It can therefore be lower than the figure `community_group_get` returns for
the same group — that is deliberate: `trained_today_count <= member_count` now always holds, and no minor is
ever in a count. `trained_today_count` and `sample` also exclude blocked pairs, and both — like every cohort
figure — count only members whose own `share_consistency` is true.

Lead ruling 5, 2026-09-10: every cohort `sample` (`community_dimensions_me` and `community_hub_summary` alike)
also excludes people the caller has **muted** — `community_find_people`'s rule, because a sample is a face you
see. The `member_count`/`trained_today_count` figures are deliberately NOT reduced by a mute (that would make a
cohort look smaller than it is); they stay blocked-only, matching `community_dimension`.

Lead ruling 6, 2026-09-10: the `member_count` divergence between this RPC (computed, minor- and block-aware) and
`community_group_get` (the stored `community_groups.member_count`, which counts everyone) was originally left in
place for part A, with part B (phase 3) named to align it later. **Superseded, part A2**: `community_group_get`
now computes its own `member_count` too (active, non-minor members of the group; see its own note below), so the
two never disagree on who counts, from part A2 onward rather than only once part B lands. One difference remains,
deliberately: this RPC's figure is also reduced by the caller's own blocks (a face the caller would actually see
in their own Hub sample), while `community_group_get`'s is not — that card is shown to every member of the group,
and to a non-member browsing an open one, not only the caller, so a personal block list must never change the
group's own stated size. A caller who has blocked a member of a group they are in may therefore still see a
marginally lower figure here than on the group page itself; that is expected, not a bug to chase.

One call for the whole Hub instead of one per cohort
(21-PHASE1-SPEC.md section 5). No minor-caller gate beyond the per-row `is_minor = false` filters — no existing
Community read blocks a minor caller outright.

## community_dimension_recent(_kind, _key, _cursor?, _limit?) — NEW (part A2)

Backs the cohort page's RECENT eyebrow (`21-PHASE1-SPEC.md` section 3, the RECENT correction: `community_dimension`
carries no stories, only `label`, `count`, `people` and `cursor`). Same five `_kind` values as the headline cohorts
(`gym`, `area`, `style`, `discipline`, `age_band`) and the same membership rules as `community_dimension`, including
the age-band reciprocity gate: a caller who does not share their own band, or asks for a band that is not their
own, gets the empty shape below, never another band's stories. `'programme'` and any kind this RPC does not
recognise ALSO get the empty shape — never `invalid_input` — because this RPC supports five kinds, not
`community_dimension`'s six, and a stale or future kind value should degrade the RECENT section honestly rather
than fail the whole cohort page. A NULL `_key` is still `invalid_input` (every kind needs one).

Posts are exactly what `community_discover_posts` (migrate_160) already lets the viewer see: public visibility,
active non-minor authors, never blocked either way, never muted by the viewer, never hidden by moderation. Never a
minor's post; never a followers-only post; never the caller's own post (same "never yourself" rule
`community_dimension`'s roster already applies). Newest first, keyset-paged the plain `community_feed` way
((`created_at`, `id`) tuple comparison) — no in-memory rank, so none of `community_board`/`community_find_people`'s
array/unnest `u.x` idiom (the migrate_169 lesson) applies here.

Envelope: `{ rows: [ {post, author, my_reaction} ], cursor }` — the same per-row shape `community_feed` returns, so
the client's existing `normalisePostRow` (`CommunityHubScreen.js`) reads a row from this RPC exactly as it reads
one from `community_feed`, `community_discover_posts` or `community_group_feed`. Note the envelope key is `rows`,
not `posts`: this RPC follows the `community_board`-style envelope naming for a paged read, not the feed family's.

Rate-railed at 120/hour (action `dimension_recent`), same house rail as `community_board`/`community_find_people`/
`community_hub_summary`/`community_dimensions_me`. VOLATILE (it calls `_community_rate_check`, which writes —
migrate_167's lesson).

## community_group_get(_group_id) — signature unchanged, member_count aligned (part A2)

`member_count` is now computed (active, non-minor members with `state = 'member'`) instead of returned from the
stored `community_groups.member_count` counter, which counted every member row regardless of status or age. Same
predicate `community_hub_summary`'s group block uses, so the two RPCs never disagree about who counts (see the
Lead ruling 6 note above — this is that alignment, pulled forward from the originally-named part B into part A2).
NOT reduced by the caller's own blocks, unlike `community_hub_summary`'s figure: this card is shown to every
member of the group, and to a non-member browsing an open one (Design 60 section 3), not only the caller, so a
personal block list must never change the group's own stated size. Everything else about the RPC — its signature,
the invite-only stripping of `member_count`/`blurb` for a non-member, `my_role`/`my_state` — is unchanged.

## community_find_people(_mode, _cursor?, _limit?, _filters?, _discipline?)

New trailing param: `_discipline text DEFAULT NULL`. A **hard filter** (narrows results; does NOT add a scored
"match reason" the way shared styles/goal/bands do). Invalid taxonomy value → `invalid_input`. Independent of
`_mode`/`_filters` — combine freely with either.

## What did not change

`delete_user_data()` — no change (no new table; `community_profiles` is already deleted whole-row, taking
`discipline_keys` with it). Groups (`community_group_list_mine`, etc.) — unchanged; Part A only reads group
membership for the Hub summary. `community_group_get` DOES change, in part A2 (its `member_count` aligned to
`community_hub_summary`'s predicate — see its own section above); signature and every other field stay the same.
No new consent type, no new notification category, no change to any existing band/reason list (`TP_AGE_BANDS`,
`CONNECT_REASONS`, etc.).

## Client-side, not this migration

The blueprint's calm-mode / open-ED-flag withholding of a person's OWN physique-division cohort pages (section 8,
Q1b) is a **client** decision — the viewer's own app simply does not open/render that cohort page for themselves.
The server has no reason to know a viewer's calm-mode state to serve a `discipline` cohort to everyone else, so it
is not encoded here.

# PART B — ambient sharing, groups, Together, Respect, the digest

For the client lanes: build against this, not the SQL. Source: `supabase/migrate_170_community_connection.sql`,
Part B (below Part A2). WRITTEN, NOT APPLIED — do not call any of this against production until the founder's
"run against production" lands and the file is actually applied. Authority:
`docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md` sections 1-7, `20-BLUEPRINT.md` sections 4-8.

## community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false) — SIGNATURE CHANGED

Was `community_upsert_profile(_p jsonb)`; the old 1-arg overload is DROPped (a genuinely new parameter changes
the function's identity, the same reason `community_dimensions_me`/`community_find_people` were DROPped in
Part A). `_remove_shared` is a real trailing SQL parameter, not a key inside `_p` — omit it and it defaults to
`false`, so an old client calling with only `{_p: {...}}` keeps working unchanged.

New keys in `_p`, same "omit the key to leave it unchanged" contract `discipline_keys`/`styles` already have:
- `share_sessions` (boolean). Minors may set it; nothing in it is age-restricted.
- `sessions_audience` (`followers` | `groups` | `everyone`, default `followers`). **Minors**: `everyone` is
  refused (`invalid_input`) if sent; any other value is silently forced to `followers` server-side (mirrors the
  existing `visibility` force-to-followers for a minor a few lines above it in the same function).
- `c_planned_per_week` (integer 0-21, or `null` to clear). Out-of-range or malformed is dropped to `null`, never
  a hard refusal — the same posture `community_update_training_profile` already uses for its own counters.

`_remove_shared = true`, combined with a resulting `share_sessions = false` (either just turned off, or already
off), deletes every `auto = true` post this account has, plus that post's own comments and activity rows (the
same cleanup `community_delete_post` does for one post, run in bulk here). `community_reactions` and
`community_post_groups` rows on those posts cascade away via their `post_id` foreign key. A call with
`_remove_shared = true` while `share_sessions` is (or becomes) `true` is a no-op — nothing is deleted.

Return shape unchanged: the profile card, `_community_profile_card(v_uid, v_uid)`.

## community_create_post(...) — SIGNATURE CHANGED, three new trailing parameters

Was `(_kind, _payload, _caption, _programme_id, _visibility)`; now also `_auto boolean DEFAULT false,
_client_ref text DEFAULT NULL, _group_ids uuid[] DEFAULT NULL`. The old 5-arg overload is DROPped (same
DROP-first reasoning as above). Existing behaviour and validation (payload allow-list per `kind`, forbidden-key
scan, caption clean-text + 280 chars, the 3-per-day/10-established rate rail) is unchanged.

- `_visibility` gains `'groups'`. A `'groups'` post **must** carry at least one `_group_ids` entry
  (`invalid_input` otherwise — a groups post naming no group would be visible to nobody but its own author); a
  non-empty `_group_ids` with any other `_visibility` value is also `invalid_input`.
- `_group_ids`: the caller must currently be a `state = 'member'` of every group named (`not_allowed` otherwise),
  deduplicated, capped at 20; a minor is refused outright (`minor_restricted`) rather than silently stripped —
  belt and braces, since a minor can never actually be a group member (`community_group_join`/`_create` already
  refuse them).
- `_client_ref`: an idempotency key, trimmed, max 120 chars. **Idempotent upsert**: a partial unique index on
  `(author_id, client_ref) WHERE client_ref IS NOT NULL` means a second call with the SAME `_client_ref` from
  the SAME author returns the EXISTING post's id rather than creating a duplicate row — safe to retry an
  offline-queued flush any number of times. An ordinary manual post that never sends `_client_ref` is never
  constrained by this at all. `_group_ids` is written ONLY on the genuinely first (inserting) call; a
  conflict-hit call leaves the post's existing group audience untouched.
- `_auto`: stored as-is on the row (`community_posts.auto`).

Return shape unchanged: `{ id }`.

## community_post_set_note(_post_id uuid, _text text) — NEW

Author-only (`not_found` for anyone else, including a viewer who could otherwise see the post). Sets the post's
`caption` (the existing "note"/text field `community_get_post`/`community_feed` etc. already return under the
`post` object's `caption` key) through the identical content check `community_create_post` applies to its own
caption: `_community_clean_text` (the keyword filter) then a 280-character cap. `null`/empty text clears the
note. VOLATILE, rate-railed 10 per hour (action `post_set_note`). Returns the updated post:
`_community_post_json(row)` — the same shape the `post` key carries everywhere else.

## Post visibility 'groups' — every reader gains the branch

`community_posts.visibility` CHECK now allows `'groups'`, alongside a new join table
`community_post_groups(post_id, group_id)` (RLS on, no grants, RPC-only, cascades on either FK). A `'groups'`
post is visible to: its own author always, and any caller who is a **current `state = 'member'`** of at least
one group the post names. Every RPC that decides "may this caller see this post" gained that exact branch,
re-issued with unchanged signatures:
- `_community_can_view_post(_viewer, _post_id)` — the shared gate `community_react`, `community_comment`,
  `community_report` and the connect/share preview paths all already call; re-issuing it alone makes every one
  of those groups-aware without touching them.
- `community_get_post(_id)` — duplicates the check inline (pre-existing shape); same new branch written out.
- `community_feed(_cursor, _limit)` — the Following tab never checked `visibility` at all before (being a
  follower already qualified for `public`/`followers`); it now ALSO requires group membership for a `'groups'`
  post, as an extra `AND`, never a replacement of the existing author-or-follows test.
- `community_group_feed(_group_id, _cursor, _limit)` — gains a second inclusion arm, ORed with the existing
  "author is a current member of `_group_id`" one: **posts whose audience names `_group_id`** (via
  `community_post_groups`), regardless of the author's CURRENT membership. Both arms still go through
  `_community_can_view_post` before being returned.
- `community_get_profile(_handle, _uid)` — the profile's own posts list gains the same branch in its inline
  visibility OR-chain (`v_target = v_uid` already covers "the author viewing their own profile").
`community_discover_posts` and `community_dimension_recent` are UNCHANGED: both hard-filter to
`visibility = 'public'` already, so a `'groups'` post is automatically excluded from public discovery and from
a cohort's RECENT rail — the correct behaviour, not an oversight.

`delete_user_data()` — **DOES change now** (superseding the Part A "What did not change" note above, which was
true only of Part A): re-issued to explicitly name `community_post_groups` (deleted for the caller's own posts,
alongside the FK cascade — belt and braces, matching this function's own established style of naming every
table explicitly) and `community_notify_daily` (deleted by `recipient`, item 6 below).

## community_group_get(_group_id) — signature unchanged, Together this week added

Three new always-computed keys, stripped alongside `member_count`/`blurb` for a non-member of an invite-only
group (the same "count-shaped fact an invite-only group withholds" rule):
- `together_sessions_week` (int): `sum(c_sessions_week)`.
- `together_planned_week` (int): `sum(c_planned_per_week)`, counting only members who HAVE a plan
  (`c_planned_per_week IS NOT NULL`) — a member with no plan contributes nothing, not zero, so a group where
  nobody plans never reads as "0 of 0 planned".
- `sharing_members` (int): the count of members the two sums above are computed over — the "6" in "6 of 8
  sharing", where the existing `member_count` is the "8".

All three are computed over the SAME member set: `state = 'member'`, `status = 'active'`, `is_minor = false`,
`share_consistency = true`, and — unlike `member_count`, which is never reduced by a personal block list because
the card is shown to every member and to a non-member browsing an open group — **NOT** visible to a member the
caller has blocked (this figure is the caller's own sense of "us", not the group's stated size).

## community_respect_all(_scope text, _scope_key text DEFAULT NULL, _today text DEFAULT NULL) — NEW

VOLATILE, SECURITY DEFINER, pinned search_path, rate-railed **10 per hour** (action `respect_all`), REVOKEd from
PUBLIC/anon, GRANTed to authenticated. `_today` follows the same lead-ruling-1 shape as `community_dimensions_
me`/`community_hub_summary`: NULL/absent falls back to the UK-local day key
(`to_char(timezone('Europe/London', now()), 'YYYY-MM-DD')`); a supplied value is still validated
(`^\d{4}-\d{2}-\d{2}$`, else `invalid_input`).

**Scopes** — `community_board`'s set minus `'everyone'` (encouragement is always a named roster, never a global
blast): `gym`, `area`, `style`, `discipline`, `age_band`, `group`, `following`. `_scope_key` requirements mirror
`community_board` exactly: required for `style`/`discipline`/`group`; optional for `gym`/`area` (falls back to
the caller's own `gym_id`/`area_key`); none for `age_band` (always the caller's own band; `not_allowed` if the
caller does not share one) or `following`. `discipline`'s key is validated against the taxonomy
(`_community_discipline_key_ok`); `group`'s key requires the caller to already be a `state = 'member'`
(`not_allowed` otherwise).

**Target selection**, per eligible scope member: their single LATEST `auto = true, kind = 'session'` post.
Eligible means, ALL of: `status = 'active'`, `is_minor = false`, not the caller, `share_sessions = true`
(**not** `share_consistency` — the two toggles are independent per phase3 spec section 1, and `share_sessions`
is the one that actually produces a post to Respect), not blocked from the caller in EITHER direction, not
muted by the caller, and matches the scope's own membership test. That latest post is then included only if
its own `created_at`, converted to the UK-local day (`to_char(timezone('Europe/London', created_at),
'YYYY-MM-DD')`), equals `_today`, AND `_community_can_view_post(caller, post)` is true — the single shared
post-visibility gate, applied uniformly across every scope rather than a per-scope profile-level check, because
the unit Respect acts on is a post, not a roster row.

**Effect**: for each qualifying post, `INSERT INTO community_reactions (post_id, user_id) VALUES (post, caller)
ON CONFLICT DO NOTHING` — the exact row `community_react` writes — followed by the SAME `_community_add_
activity(author, caller, 'reaction', 'post', post)` call `community_react` makes, but ONLY when the insert was
genuinely new (idempotent per post: a second call the same day against the same roster gives nothing new and
notifies nobody again).

**Envelope**: `{ given: n }` — a count only, no per-post or per-recipient detail. A client that wants to show
"who" received Respect must derive that from whatever roster it already rendered (the same rows the button sits
under), not from this RPC's return value.

## Connect reasons — same_programme retired, same_discipline added

The SQL helper `_community_connect_reasons_list()` is re-issued (signature unchanged, still `IMMUTABLE`):

```
OLD: ['same_gym', 'same_programme', 'train_like_me', 'train_together']
NEW: ['same_gym', 'same_discipline', 'train_like_me', 'train_together']
```

Same position, same order otherwise — only the second element changes. The client lane moves
`CONNECT_REASONS` in `src/lib/community/connections.js` in the same landing:

```
OLD: { same_gym: 'Same gym', same_programme: 'Same programme', train_like_me: 'You train like me', train_together: 'Want to train together?' }
NEW: { same_gym: 'Same gym', same_discipline: 'Same discipline', train_like_me: 'You train like me', train_together: 'Want to train together?' }
```

`ConnectSheet` shows "Same discipline" when both people share a discipline key (phase3 spec section 7). This is
the equality `community.privacy.guard.test.js`'s "the closed sets are the same on both sides" suite checks
against `migrate_161_community_connections.sql`'s own (unchanged) text — that specific case FAILS until this
client-side move lands, by design (it reads `migrate_161`, not this file's Part B re-issue).

## Digest: one Respect push per recipient per UK-local day

New table `community_notify_daily(recipient uuid, day text, count int, PRIMARY KEY (recipient, day))` — RLS on,
no grants; written only by the `community-notify` edge function's service-role client (which bypasses RLS and
grants entirely), never by an RPC.

`supabase/functions/community-notify/index.ts` (separate file, not SQL): for `kind = 'reaction'` only, after the
existing per-proof replay guard (step 5b) and before the send, the function now checks `community_notify_daily`
for a row `(recipient = target_user_id, day = <UK-local today>)`:
- **No row** (first Respect of the day): sends the push as normal, with a new fixed body — **"Someone gave your
  training respect"** (no handle; a collapsed digest represents at least one Respect, possibly several, so it
  never names a single person) — inside the existing `COMMUNITY_ACTIVITY` category and quiet hours. After a
  successful send, inserts `(recipient, day, count: 1)`.
- **Row exists** (a later Respect the same day): the row's `count` is incremented and **no push is sent**.
`community_respect_all`'s reactions write the identical `reaction`-kind activity rows `community_react` does, so
whichever client-side call path notifies for them collapses through this exact same mechanism — no separate
digest logic for bulk Respect. The in-app Activity inbox is unaffected: every Respect still appears there
immediately, collapsed or not. No push is ever sent for an auto item's own creation (no `kind` exists for that
in `community-notify` at all, unchanged). No other change to the function or to
`docs/NOTIFICATIONS_LOCKED.md` budgets.

## What did not change (Part B)

No change to `community_discover_posts`, `community_dimension_recent`, `community_board`, `community_hub_
summary`, `community_dimensions_me`, `community_dimension`, `community_find_people`, `_community_profile_card`,
or the discipline taxonomy (Part A, untouched). No new consent TYPE (both new toggles ride the existing
`community_visibility` record). No change to `TP_AGE_BANDS`/`CONNECT_FROM_VALUES`. Membership removal
(`community_group_remove`/`community_group_leave`) does **not** delete that member's `community_post_groups`
pair rows for the group they left — a deliberate choice, not an oversight: the post's own `visibility = 'groups'`
gate already requires a VIEWER to be a current member to see it, so a stale pairing for a now-departed author is
inert for every current member (the same posture a message left in a chat after someone leaves already has
elsewhere in this product).
