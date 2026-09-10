# 23 — PHASE 3 SPEC: Ambient activity, encouragement, groups (lead, 2026-09-10; the edit gate for the phase 3 lanes)

Authority: `20-BLUEPRINT.md` sections 4, 5, 6, 7, 8 (CR-04..CR-08, CR-10)
and section 12 (Q2 both toggles OFF with one offer after the first workout;
Q3 Respect; Q4 digest only). Safety verdicts: `11-research-safety-cohorts.md`
R3 (express informed enable, removal offered, note text filtered), R4
(bulk Respect excludes blocked and muted pairs server-side), R5 (invite-only
groups moderated identically), R6 (nothing ranked by weight). Presentation:
`21-PHASE1-SPEC.md` rows. Cloud: `migrate_170_community_connection.sql`
PART B, additive to the same file, written not applied, hostile-reviewed
before any "run against production".

## 1. Consent (client and cloud)

Two toggles on the Training profile screen, both default OFF, both offered
at Join beside the other bands and once more in the workout summary after
the first completed workout (one line, two buttons, never shown again when
declined; recorded on device):
- **Share my consistency** (exists): "Shows your training days, sessions
  and streaks to people who can see your profile. Never your weight, food
  or photos."
- **Share what I did** (new, `share_sessions`): "Turns each finished workout
  into an activity item for the audience you choose, automatically, with
  nothing to post yourself. Off by default. Turn it off any time and
  remove what you've already shared." Under it, an audience `Chip` radio
  row: Followers (default) / My groups / Everyone. Turning it off asks
  once: "Remove the items already shared?" (Remove / Keep), then stops new
  items.
Cloud: `community_profiles.share_sessions boolean NOT NULL DEFAULT false`,
`sessions_audience text NOT NULL DEFAULT 'followers'` CHECK in
(followers, groups, everyone); `community_upsert_profile` accepts both in
`_p`; turning `share_sessions` off with `_remove_shared = true` deletes the
caller's `auto = true` posts. Minors: `sessions_audience` is forced to
`followers` server-side and `everyone` is refused.

## 2. Ambient items (the log is the feed)

On workout completion, where the summary already builds the session
payload for "Post to Community" (`WorkoutSummaryScreen.js`, `posts.js`
`buildSessionPayload`, `buildPrPayload`), the client creates, when
`share_sessions` is on and the ED gate allows (`consistencyGateState`):
- one `session` post with `auto = true`, `visibility` from the audience
  (followers, groups: every group the person is a member of, everyone), no
  text, `client_ref = workout id`;
- one `pr` post per detected PR in that workout (same audience, same
  `auto`, `client_ref = workout id + exercise id`), at most three per
  workout (the rest stay inside the session's PR count).
Idempotent: `community_posts.client_ref text` with a unique index on
(author, client_ref); `community_create_post` upserts on conflict and
returns the existing row. Offline: the pending item is stored on device
(`AsyncStorage` key `community.pendingItems`, the payload only) and flushed
on foreground or reconnect through the same call; a flush never duplicates
because of `client_ref`. Nothing is created under calm mode or an open ED
flag; nothing is created for a minor beyond the followers audience.

The manual "Post to Community" on the summary becomes **Add a note** on the
auto item when sharing is on (opens compose with the item preloaded; saving
sets the note text on the same row: `community_post_set_note(_post_id,
_text)`, filtered by the existing keyword filter, 280 chars) and stays the
existing compose path when sharing is off. Milestone and block posts stay
manual.

Feeds: `community_feed`, `community_group_feed`, `community_discover_posts`,
`community_dimension_recent` and the profile's posts include auto items
(they are ordinary rows). `ActivityItemRow` already renders them.

## 3. Group audiences

`community_posts.visibility` gains `'groups'`; new table
`community_post_groups(post_id, group_id, primary key (post_id, group_id))`
with RLS enabled and no grants (RPC-only), named in `delete_user_data` and
cleaned when a post or a membership goes. Compose gains an audience chooser
(Followers / Everyone / one or more of my groups as `Chip` checkboxes) for
manual posts; the auto audience "My groups" means every group the person
is in at creation time. `community_group_feed` includes posts whose
audience names the group; a group post is visible to members of that group
only (the existing visibility check gains this branch in every reader RPC
the reviewer lists).

## 4. Together this week (groups)

`community_group_get` returns `together_sessions_week` (sum of members'
`c_sessions_week` for members sharing consistency, active, non-minor, not
blocked from the viewer) and `together_planned_week` (sum of members'
planned sessions per week from `c_planned_per_week`, a new nullable
counter the device publishes with the others when a plan exists), plus
`sharing_members`. Group page: one `label` line under the count line,
"Together: 11 of 16 planned sessions this week · 6 of 8 sharing", with a
2 dp `radius.hair` bar (`primaryBg` track, `primary` fill) beneath; when
no member shares, the line reads "Together: nothing shared yet". Never a
per-member comparison, never a penalty, never red.

## 5. Respect everyone who trained today

`community_respect_all(_scope text, _scope_key text, _today text)`:
VOLATILE, rate-railed (10 per hour), SECURITY DEFINER; gives the caller's
Respect to the latest auto session item of every member of the scope who
trained today and shares what they did, excluding the caller, minors,
blocked pairs in both directions and people the caller muted; returns
`{ given: n }`. Scopes: gym, area, style, discipline, age_band, group,
following. Client: a tertiary row at the foot of every roster (cohort
page, group page) "Respect everyone who trained today" that shows the
count line afterwards ("Respect given to 4 people") and disables until
the next day; no row when nobody trained today. Blocked and muted rules
pinned by a test (safety verdict R4).

## 6. Notifications: one daily digest, existing budget

`community-notify` (edge function) collapses `reaction` pushes to ONE per
recipient per UK-local day: the first Respect of the day sends "Someone
gave your training respect" inside the existing `COMMUNITY_ACTIVITY`
category and quiet hours; later ones update a per-recipient daily row
(`community_notify_daily(recipient, day, count)`) and send nothing; the
in-app Activity inbox shows every Respect immediately. No push for auto
items themselves. `respect_all` produces activity rows of the same
`reaction` kind, so the same collapse applies. No change to
`docs/NOTIFICATIONS_LOCKED.md` budgets.

## 7. Connect reasons

The SQL helper list retires `same_programme` and adds `same_discipline`;
the client `CONNECT_REASONS` moves with it in the same landing (the
privacy guard's equality section). `ConnectSheet` shows "Same discipline"
when both people share a discipline key.

## 8. Guards and verification

- Privacy guard extended: the ambient payload builders import nothing new
  from the database; `hasForbiddenKeys` applies to the note; the ED gate
  is consulted before any auto item (regex pin on the completion hook).
- New `community.ambient.guard.test.js`: no auto item under calm mode or an
  open ED flag; minors never `everyone`; `client_ref` present on every
  auto call; audience chips exactly three for auto and the group checkboxes
  for manual; the offer-after-first-workout shows once.
- `migrate170.rpcOnly.guard.test.js` extended for part B: the new table's
  RLS and no grants; `community_post_groups` in `delete_user_data`;
  `community_respect_all` excludes blocked and muted pairs by regex;
  `community_notify_daily` RLS; the `'groups'` visibility branch present in
  every reader RPC.
- Hostile review (Opus) of part B before the founder is asked to apply.
- Device checklist: enable "Share what I did", finish a workout, see the
  item in a friend's feed and your own profile; PR moment; Add a note;
  group audience; Together line; Respect everyone; the single daily push;
  calm mode: no item, no push; a minor: followers only.
