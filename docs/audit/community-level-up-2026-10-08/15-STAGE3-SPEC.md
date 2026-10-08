# Community level-up Stage 3: value features (D221 ruling 4)

Authority: register D221; `10-PROPOSALS.md` Package 3; `02-competitors.md` patterns 3, 4, 5, 8, 9; the law `13-VISUAL-LAW.md`. Bounds: every Section 2 inviolable; migrations additive and idempotent with the house header, UNAPPLIED until the founder's phrase; edge functions NOT DEPLOYED until the founder's go; nothing about weight, calories, bodyweight or measurements anywhere in schema, payload or copy; the migration 180 read-side gate (calm mode or an open ED flag withholds consistency surfaces for the caller) is reused, never re-implemented; a minor's audience never widens (D212).

## Server (migration 191 `community_stage3_presence_groups_challenges.sql`, one lane)

### 3a Presence
- `community_profiles.training_since timestamptz NULL`, `community_profiles.show_training_now boolean NOT NULL DEFAULT false` (opt-in, D212 for minors: never settable true for `is_minor`).
- RPC `community_set_training_now(_on boolean)`: own row only; `true` sets `training_since = now()`, `false` clears it. The client calls it at session start and finish (and on app background after 3 hours, a stale guard). RPC `community_set_show_training_now(_on boolean)`: own row, refused for a minor.
- Read: `community_hub_summary` gains `training_now` = `{count, names[]}` over people the caller follows (accepted) whose `show_training_now` and `training_since > now() - interval '3 hours'`, names as `display_name` (max 3), withheld (null) when the caller is gated by the 180 helper. `community_group_get` (or the RPC the group page reads) gains the same for the group's members.
- Push: none.

### 3b Group chat and the invite decline
- Table `community_group_messages(id uuid pk, group_id fk cascade, author_id fk cascade, body text CHECK 1..500, created_at)` with RLS deny-all (RPC only, as every Community table). RPCs: `community_group_messages(_group_id, _cursor, _limit)` (members only, newest first, cursor as the posts use), `community_group_send_message(_group_id, _body)` (member only; blocked and muted pairs: the sender's message is hidden from the person who blocked or muted them on read; the existing keyword filter helper from migration 178 applies to `_body`; the per-day rate rail the DMs use applies), `community_group_message_delete(_id)` (author or group admin), `community_group_mark_read(_group_id)` writing `community_group_members.last_read_at timestamptz` (new column) and an unread count in `listMyGroups`.
- `community_group_decline_invite(_group_id)`: deletes the caller's `state = 'invited'` row; `not_found` otherwise.
- Push: `community-notify` kind `group_message` under the existing `community_message` category, quiet hours and daily budget, collapsed to one push per group per 15 minutes per recipient (the DM collapse pattern), body "New messages in {group name}" with no content; data carries `kind`, `group_id`.
- Group week band (the group page): members' `c_trained_days_week` dots and `c_sessions_week`, already in the profile card payload under the 180 gate; no new column.

### 3c Session-count challenges
- Table `community_group_challenges(id, group_id, name CHECK 1..40, starts_on date, ends_on date CHECK ends_on > starts_on AND ends_on <= starts_on + 31, target_sessions int CHECK 1..200 NULL, created_by, status 'active'|'ended', created_at)`; one active per group (partial unique index). Table `community_challenge_entries(challenge_id, user_id, session_key text, logged_on date, PRIMARY KEY (challenge_id, user_id, session_key))`.
- RPCs: `community_challenge_create(_group_id, _name, _starts_on, _ends_on, _target)` (admin), `community_challenge_end(_id)` (admin), `community_challenge_log_session(_challenge_id, _session_key, _logged_on)` (member; idempotent; `logged_on` must lie within the window and within 2 days of today), `community_challenge_board(_challenge_id)` returning the group total, days remaining and per-member session counts (never load, weight, calories), withheld (null) for a caller gated by the 180 helper.
- Push: none in this stage.

### 3f Link previews (edge `community-public`)
- Per-item title and description for `u` (display name and handle, discipline if shared), `s` (the author's display name and the post kind's headline, never the note, never figures beyond sessions and sets), `g` (group name, member count). Nothing from a private profile, a minor, a restricted or suspended account, or a hidden post: those return the generic page. NOT DEPLOYED until the founder's go.

## Client (one lane, after the server lane lands)
- 3a: the switch "Show when I am training" on the privacy panel (off by default; hidden for a minor); the presence strip on the Hub Feed top and the group page (law V1 band, `AvatarStack` 24 dp, "2 training now · 3 trained today"), hidden when the summary's `training_now` is null; the logger calls `setTrainingNow(true)` on session start and `false` on finish; the strip never shows under calm mode or an open ED flag (the server returns null, and the client also checks `consistencyGateState`).
- 3b: the group page gains Chat as a band with the latest three messages and "Open chat"; `CommunityGroupChatScreen.js` (bubbles as `MessageBubble`, a well composer, report via long-press as DMs); Decline on invites; unread count on the Groups segment rows.
- 3c: the group page's Challenge band (name, days remaining, group total against target, per-member counts with the caller's own row first); create and end sheets for admins; the logger's finish path logs the session into every active challenge of the person's groups (`session_key` = the local workout uid), best-effort with the sync queue's retry.
- 3d: milestone posts at 10, 25, 50, 100, 250 sessions extending `ambient.js`'s milestone path; the "weeks in a row" mark on the profile hero from `c_weeks_streak` (already gated).
- 3e: the privacy panel: every switch (sessions and their audience, consistency, gym and place, age group, who can follow, who can message, show when training) on `CommunityPrivacyScreen.js` with live state, each through its existing setter.
- Tests per item; the copy census; the device checklist appended to spec section 5.
