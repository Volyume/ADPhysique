# 26 — EARLY DAYS SPEC: the honest cold-start state (lead, 2026-09-13)

Authority: founder order in chat 2026-09-13 ("build some simulated data for
the community so it doesn't appear empty ... appear as natural usage"),
refused as simulated members presented to real users (a deception of the
people the Community ships to; a fake-social-proof practice under Google
Play's deceptive-behaviour policy and the CMA's misleading-practice rules),
then the founder's "Fine do that" to the honest alternative. Ruled under
D33 as CR-16 (`40-DECISIONS.md`) and D162 (main register). Standing rulings
kept: CR-03 (structure shrinks; the honest line "No one else here is
sharing yet"), CR-09 rule 9 (an empty state is one line and one action),
CR-14, CR-15, `60-DESIGN` section 5, the presentation guard, the copy
guard, the privacy guard, every CLAUDE.md Section 2 inviolable.

Production truth on 2026-09-13 (read through the connector): two
profiles, both the founder's (`alland` 2026-09-08, `allan` 2026-09-13,
both public, both at Volt Gym, Burscough); no connections, no groups, no
posts. Every real member for the next while arrives into that.

## 0. The problem, stated honestly

A first member today sees: a bare PEOPLE eyebrow with only "Find people"
(the hub summary omits every cohort with nobody else in it), a GROUPS
line, and "Nothing here yet. Follow people to see their training here"
with no one to follow. Their gym page can read "0 members" above their
own row. The only way to bring a friend in is "Share your profile link",
buried on a Find-people zero state. A group's invite link never consumes
its token (invite-only groups, the default, turn a link into a join
REQUEST), and the link itself is malformed (`?id=X?t=Y`). Nothing tells
the member they are early rather than alone.

## 1. What ships (client-side; the client depends on no migration; no new dependency)

### 1.1 Hub PEOPLE zero state (joined, summary loaded, no cohort rows)
One line, one action, then the standing "Find people" row.
- Line (`bodySm`, `textSecondary`):
  - with a gym on the profile: `You are the first here from {gym}.`
  - without: `You are one of the first here.`
- Action (tertiary Button, `person-add-outline`): `Invite a gym mate`
  (with a gym) / `Invite a training partner` (without) → the native share
  sheet with the invite message (1.5). A dismissed sheet is silent.
- The zero state never renders while the summary is loading (skeleton
  stays), never for a minor differently (same copy), never for the
  not-joined Discover state.

### 1.2 HOST row (joined, not the host, not yet following the host)
Eyebrow `HOST`, one `PersonRow` for the founder's real profile, directly
above the ACTIVITY eyebrow: name from the card, caption
`Built Volyume · {gym}` (gym only when the card carries `gym_label`),
avatar from the card, trailing `Follow` (secondary, sm). Press on the row
opens the profile. Follow → `community_follow` (instant for a public
profile) → toast `Following {name}.` → the row disappears and the feed
reloads, so the host's real activity lands as the first content.
- Source of truth: `getProfile({ handle: COMMUNITY_HOST_HANDLE })`
  (`src/lib/community/earlyDays.js`, `allan`). Fetched once per Hub mount
  when joined; any failure (offline, not found, refused) hides the row.
- Hidden when: the reader IS the host (`card.user_id === uid`); the
  relationship already `following` or `requested`; `blocked` or `muted`
  either way; the card is not `viewable`.
- Never a second host. Never a badge that implies staff moderation
  rights; "Built Volyume" is a fact from the constant, not a server flag.

### 1.3 Cohort page header count (all kinds)
`community_dimension`'s `count` excludes the caller. When the caller
belongs to the cohort (`isOwnCohort`, 1.6), the label line is honest:
- others = 0: `Just you so far` (roster mode: `Just you so far` alone;
  a "trained today" count of yourself is not news);
- others = 1: `You and 1 other`; others ≥ 2: `You and {n} others`; in
  roster mode followed by ` · {k} trained today` as before.
When the caller does not belong, the line is unchanged (`{n} members`).

### 1.4 Cohort page cold-start action
`rosterThin` keeps the ruled line `No one else here is sharing yet.` and
gains its one action (tertiary Button): `Invite someone from {gym}` on
the caller's own gym page, `Invite a training partner` on any other own
cohort; no action on a cohort the caller does not belong to.

### 1.5 The invite message (one builder, `inviteMessage`)
`Join me on Volyume. I train at {gym}. {profileUrl}` with a gym, else
`Join me on Volyume. {profileUrl}`. The link is the member's own profile
link, which opens the app when installed and the profile page with both
store buttons when not. Nothing else about the member is in the message.

### 1.6 `isOwnCohort(kind, key, me, venueId)` (pure)
gym: `venueId` equals `me.profile.gym_id` or is in `other_gym_ids`, or
the legacy own-gym label match already on the screen; discipline: key in
`me.profile.discipline_keys`; age_band: key equals `me.tp_age_band`;
area: key equals `me.profile.area_key` or `place_key`; anything unknown
→ false (the line stays as it was).

### 1.7 Group invite links, working end to end
- `links.js`: `groupInviteUrl(id, token)` → `https://volyume.app/g/?id=<id>&t=<token>`
  (the `&` is the fix); `appGroupInviteUrl`; `parseCommunityLink` returns
  `{kind:'group', id, token}` when `t` is present.
- `GroupInviteSheet` shares `groupInviteUrl`.
- `CommunityGroupScreen` reads `route.params.t`: a non-member with a
  token sees `You have been invited to this group.` and one Button
  `Accept invite` → `acceptGroupInvite({ token })` → toast `Joined.` →
  reload. Refusals: `not_found` → `This invite link has expired.`;
  `already_member` → reload; `minor_restricted` → existing copy. A
  member with a token sees the ordinary page. No token → Join as before.
- `public/g/index.html`: the web landing for someone without the app
  ("You have been invited to a training group on Volyume"; Open in
  Volyume `volyume://g/?id=&t=`; the store buttons). `app.json` gains
  the `/g` verified app-link filter; `apple-app-site-association` gains
  `/g/*`.
- The three profile/story/programme pages and the partner page get the
  real App Store id the `get` page already carries (`id6777083702`) in
  place of `REPLACE_WITH_APP_STORE_ID`.

## 2. Out of scope, deliberately
Simulated or sample members of any kind, labelled or not; a server-side
staff flag or auto-follow; a Volyume-wide member count (no RPC; a
migration is not warranted for one line); referral credit.

## 3. Tests
`earlyDays.test.js` (pure helpers); `links.test.js` (invite URL and
token parse); `CommunityHub.states.test.js` (PEOPLE zero state with and
without a gym, the invite share, the HOST row shown / hidden for the host
/ hidden when following / hidden on failure, Follow → reload);
`CommunityDimension.cohorts.test.js` (own-cohort count lines, the
cold-start action); `CommunityGroup.test.js` (token accept, expired
copy); a source guard `community.earlyDays.guard.test.js` (the `/g` app
link on both platforms, the `g` page, no store placeholder left, the
`&t=` form, the host constant read from one place).

## 4. Device checklist (Android EAS build from main)
1. Community > Hub as a member with no one else: PEOPLE shows "You are
   the first here from Volt Gym." and "Invite a gym mate"; tap it: the
   share sheet opens with "Join me on Volyume. I train at Volt Gym.
   https://volyume.app/u/?h=<you>"; dismiss: nothing else happens.
2. Same Hub on the second account: a HOST row "Allan · Built Volyume ·
   Volt Gym" with Follow; tap Follow: toast "Following Allan.", the row
   goes, the feed shows Allan's shared items (if any) instead of "Nothing
   here yet".
3. Volt Gym page: "Just you so far" (or "You and 1 other" once the second
   account lists it), the roster with your row, "No one else here is
   sharing yet." and "Invite someone from Volt Gym".
4. A group: Share invite link from the menu; open the link on the other
   phone: the group page shows "You have been invited to this group." and
   "Accept invite"; accept: "Joined." and the group's roster shows both.
5. Open the same link in a browser on a phone without the app: the
   volyume.app/g page with Open in Volyume and the store button.
ED-safety: nothing here reads weight, food or notifications; the HOST row
and the invite are hidden nowhere new under calm mode or an ED flag
because they carry no counters; the existing You-row gate is untouched.

## 5. Review outcome and the production proof (2026-09-13)

Fresh-eyes review (Opus): FIX FIRST, two blockers and seven fixes, all
landed the same day: the HOST row hides on the card's real follow
vocabulary (`accepted` / `requested`); the PEOPLE zero state renders only
on a summary that answered and is empty, style cohorts included; an invite
token names its own group and a pending request keeps its Requested
button; the Android app link is `/g/` (a bare `/g` would claim `/get`);
the gym summary branch carries the honest count; area cohorts match by
label; the host is pinned by user id (`COMMUNITY_HOST_USER_ID`) as well
as handle; the follow toast says Requested when the server queued it; a
"Not now" dismissal per reader per device (`hostDismissal.js`) with a
session cache so the host read is not repeated; a token that is not a
uuid reads as expired without a server call.

Production proof with the founder's two accounts (the real RPCs run as
each): follow, hub summary, cohort counts, the host card's relationship
before and after, group create, invite link, accept by token, group get
with both members and real Together counters, leave, close: all correct.
One finding: a closed group stays in the creator's Hub summary and in
"My groups" (no status test), and the accepted invite's returned card
carries the count before the join. Migration 176
(`supabase/migrate_176_community_closed_groups_out_of_lists.sql`, guard
`src/__tests__/migrate176.rpcOnly.guard.test.js`) fixes all three,
written and NOT applied, waiting for the founder's phrase; nothing on the
client depends on it. The test group's rows were removed afterwards.

