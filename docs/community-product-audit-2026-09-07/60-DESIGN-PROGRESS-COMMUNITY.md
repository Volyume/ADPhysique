# 60 — DESIGN RULING: Community as progress, consistency and groups (lead, 2026-09-07)

Authority: founder direction in chat (progress and consistency, not
programmes; sessions completed and consistency, not weight lifted;
user-created groups; compact, elite presentation). Evidence: `50`
(metrics and harms), `51` (cloud training data), `52` (presentation),
`40` §4-5. Inviolables kept: training data only; never bodyweight, food,
measurements; opt-in; withheld under calm mode or an open ED flag; minors
never ranked, never in groups; deterministic; no live location; RPC-only.

## 1. Data: device-computed counters, published by choice (path b of `51`)
On the device, from completed workouts only (`trainingProfile.js` may read
timestamps and exercise ids; SD-30 guard extended to the new fields):
- `c_sessions_week` (Monday-start UK-local week), `c_sessions_month`
  (calendar month), `c_weeks_streak` (consecutive weeks with >= 1
  completed session, ending this or last week), `c_planned_pct_4w`
  (completed / planned sessions over the last 4 weeks, from the active
  plan's days per week; null when no plan), `c_consistent_weeks_12w`
  (weeks with >= the plan's planned sessions, or >= 2 when no plan, in
  the last 12), `c_trained_days_week` (array of weekday keys, this week),
  `c_last_trained_day` (local day key, day-level only), `c_updated_at`.
- Published through the existing consent path: one toggle "Share my
  consistency" (default OFF; Join offers it beside the other bands),
  `shareablePayload` adds the counters only when on; refresh on workout
  completion and on app foreground when the week changed. Server stores
  only what was sent. Turning it off nulls the columns server-side.
- ED gate on the device: when calm mode or an open ED flag is active,
  the counters are not sent and the existing ones are nulled (same
  pattern as stories). Server gate: a board never includes a profile
  with `status <> 'active'`, `is_minor`, or null counters.

## 2. Boards (one RPC, four scopes, two windows)
`community_board(_scope, _scope_key, _window, _cursor, _limit)`:
- scopes: `gym` (gym_id, members whose gym or other gyms include it),
  `following` (people the caller follows plus the caller), `group`
  (group id, members), `everyone`.
- windows: `week` (sessions this week, tie: trained days count, then
  handle), `month` (sessions this month), `consistency` (weeks streak,
  tie: consistent weeks in 12, then planned pct).
- returns rank rows: profile card, metric value, trained days keys,
  trained_today boolean (day-level), `is_you`; plus the caller's own row
  and rank when off-page; plus `count` and `threshold_met`.
- Small-group rule (Oura/Duolingo evidence): below 8 participants the
  client shows an unranked roster with the metric, no rank numbers.
  Non-participants (no counters) are absent, never shown at the bottom.
- "Trained this week at my gym": the gym scope, week window, roster
  form when small, with "trained today" as the amber avatar-ring dot.
- No all-time window (unwinnable for most, `50` §7b). No medals.
- Rate rail 120/min like find_people; keyset paging by (metric desc,
  tiebreak, user_id).

## 3. Groups
Tables `community_groups` (id, name <= 40, blurb <= 140, access
'open'|'invite', created_by, member_count, status active|closed,
created_at) and `community_group_members` (group_id, user_id, role
'admin'|'member', state 'member'|'requested'|'invited', joined_at) plus
`community_group_invites` (token, group_id, created_by, expires 14 d).
RPCs (all authenticated, minors refused): `community_group_create`,
`_update` (admin), `_close` (admin), `_join` (open: member; invite:
requested), `_leave`, `_invite` (admin, by handle), `_invite_link`
(admin, token), `_accept_invite` (token or pending invite), `_approve`
and `_remove` and `_promote` (admin; last admin cannot leave without
promoting), `_list_mine`, `_get` (members visible to members; name and
count visible to all for open groups, name only for invite groups),
`_members` (keyset), `_search` (name prefix, open groups only), and
`community_group_feed` (members' visible stories, chronological, members
only). Reports: `community_report` accepts `target_kind='group'`.
Notifications: `group_request`, `group_accepted`, `group_invited` in the
`community_follow` category budget; no push for joins.
Deletion: `delete_user_data` removes memberships and invites; a group
whose only admin is deleted promotes the earliest member or closes.
Deep link `g/?id=` on volyume.app (name and count for open groups only).

## 4. Surfaces (presentation law from `52` Part C; V1-V20 hold)
- **Hub**: hero unchanged; then "This week" one flat line: streak chip +
  right-aligned sessions figure; then "At [gym]" flat list of up to 3
  rows (avatar 32, name, one caption, ring dot for trained today,
  chevron) with a small trailing "See all"; then "Your groups" chip row
  (names) with "New group"; then Following feed as today. The
  Programmes section is gone (lane R1).
- **Board screen** (`CommunityBoardScreen`): SectionLabel with scope
  name; chip row Scope (My gym / Following / Everyone / a group) and
  chip row Window (This week / This month / Consistency); one
  `Card padding="none"` flat list with hairline dividers, rank number
  (hidden under the small-group rule), avatar 32, name, caption
  ("Tue, Thu, Sat" or "6 weeks running"), right-aligned figure; own row
  surface2 tint, pinned when off-page; empty state per V14 with the
  honest count line and the "Share my consistency" prompt when the
  caller is not sharing.
- **Gym page**: the board replaces the old style/time-band count
  summary at the top; members' programmes row removed (R1).
- **Profile**: progress strip under the header (sessions this week,
  streak, 8-week mini bars from the published counters, only when the
  person shares) then Posts.
- **Groups**: `CommunityGroupScreen` (header: name, access, member
  count, admin actions in the MenuSheet; board; feed), `CommunityGroupCreateScreen`
  (name, blurb, access chips), `CommunityGroupMembersScreen` (roster,
  requests for admins), invite by handle sheet and share link.
- Copy: calm, no shame: "trained 3 times this week", "6 weeks running",
  "getting back into it" never rendered as a rank of zero.

## 5. Cold start
1 user: own strip and "no one else at your gym is sharing yet". 5-25:
rosters, no ranks. 25+: gym and following boards rank in cities.
Groups make a board meaningful at any size because members chose it.

## 6. Verification standard
Guard: `trainingProfile.js` reads nothing beyond timestamps, exercise
ids and the plan's days per week; counters never sent when calm mode or
ED flag; minors never returned by `community_board` or any group RPC;
boards never include null counters; removal of consent nulls the
columns. Journeys: opt in at Join, complete a workout, see own row;
gym board at 3 and at 12 participants; group create, invite, approve,
board; profile strip hidden when not sharing.
