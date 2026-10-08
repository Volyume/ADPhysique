# Community level-up: build specification (D221)

Authority: register D221 (founder delegation 2026-10-08, "choose the best solution based on user enjoyment and psychology for our user base and proceed"). Inputs: 01 to 04 and 10 in this folder; the samples are `11-design-samples.html` (structure A, look D3, the People segment, the D3 group page). British English everywhere; no em dash in any string. Every lane: `npm run lint && npm test` green before hand-back; never commit, push or stash; STOP and report on any ambiguity or pinned-test conflict rather than interpret.

Bounds that bind every lane (CLAUDE.md section 2): no ED-safety change (the calm and ED withholds stay exactly as they are and are reused, never re-implemented); Article 9 and EU residency; no AI; no new dependency; migrations additive and idempotent with the header block, never applied by a lane; every tier-blind guardrail untouched; D212 minors' sharing off by default.

## 1. Stages

| Stage | Content | Lanes | Device walk |
|---|---|---|---|
| 1 | Structure: the Community tab and stack; the Hub rebuilt as Feed / People / Groups / You in the D3 grammar; feed scopes and sort (migration 190); compose entry; the shared `PostRow` | 1A navigator, 1B server and feed client, then 1C the Hub, 1D the flow fixes | after 1 |
| 2 | Look: the D3 visual law on the other 23 screens and the components; skeletons; D188 transitions; header rationing; accessibility; guards re-pinned | 2A screens, 2B components and forms, then 2C review | after 2 |
| 3 | Value: 3a presence, 3b group chat, 3c session-count challenges, 3d consistency recognition, 3e privacy panel, 3f link previews | one lane per item, server first where needed | after 3b and after 3f |

## 2. Stage 1 architecture

### 2.1 The tab (lane 1A)

- `RootNavigator.js`: a new `CommunityStack` (function `CommunityStack`) holding every `Community*` route now registered in `HomeStack` lines 505 to 534, moved verbatim (same names, same options), with `Community` (the Hub) as its initial route. `HomeStack` keeps only `CommunityCompose` and `CommunityPost` as duplicate registrations, so posting from the workout summary and the share card returns to the summary on Back (precedent: the onboarding stack already registers two Community screens). `MainTabs` registers `<Tab.Screen name="CommunityTab" component={CommunityStack} options={{ title: 'Community' }} />` between `ProgressTab` and `ProfileTab`. Today stays `initialRouteName`. Icon in the `tabBarIcon` map: `people` / `people-outline`.
- `VolyumeTabBar.js`: six items. The sliding cushion and the label rule hold; verify the widest label still fits at 360 dp with the existing inset (the bar divides width equally; "Community" is as long as "Nutrition"). The Community item carries the same badge dot as Coach when `community.unseen` is true (see 2.5). No count on the tab, a dot only.
- Deep links (`RootNavigator.js:931-980`): `community`, `u`, `s`, `m`, `g` and the legacy partner rewrite resolve inside `CommunityTab`, not `HomeTab`. Notification routes (`notificationRoute.js`): `community_follow`, `community_activity`, `community_message`, legacy `partner_*` move to `tab: 'CommunityTab'`; add `community_comment` and `community_reaction` landing on `CommunityPost {id}` when the payload carries `post_id`, and `community_group` (`group_request`, `group_accepted`, `group_invited`) landing on `CommunityGroup {id}` when it carries `group_id`, else `CommunityActivity` (03 L8; the edge function's category names are read, not changed, in this stage: the client maps the payload's `kind` and ids).
- Entry points repointed through `navigateCrossTab(navigation, 'CommunityTab', screen?, params?)`: the Today pill, the Today live row, the intro card, the finished-block card, the Coach row, the Settings row, the summary and share-card "Post to Community" buttons that are not compose (compose stays in-stack), onboarding step 5's post-join navigation. Re-tap of the Community tab pops to the Hub (the existing NAV-5 listener pattern).
- Guards: `iaNavigation.guard`, `tabIcons.guard`, `tabPressPopToTop.guard`, `navigationTargets.guard`, `navigateCrossTab.guard`, `coachTabBadge.guard` are read first and re-pinned to six tabs where they count five; every test that asserts `tab: 'HomeTab'` for a Community route is updated to `CommunityTab`. New guard: `communityTab.guard.test.js` pins that every `Community*` screen (except the two duplicates) is registered in `CommunityStack`, that `HomeTab` stays initial, and that no Community deep link or notification route names `HomeTab`.

### 2.2 Feed scopes and sort (lane 1B)

Migration `supabase/migrate_190_community_feed_scopes.sql` (UNAPPLIED until the founder's phrase; header block per `docs/rules/supabase.md`):
- `community_feed(_cursor text, _limit int, _scope text DEFAULT 'following', _sort text DEFAULT 'newest')` replaced additively (old two-argument calls keep working via the defaults). Scopes: `following` = today's WHERE; `gym` = authors who train at the caller's gym (`community_profiles.gym_id` equal, or the caller's `gym_id` among the author's `other_gym_ids`; `place_key` is an area, never a gym; corrected after the Stage 1 review) with "Show my gym" on, with today's visibility rules applied (public posts, followers-only if accepted follow, groups-only if a shared group), the caller's own posts included; `groups` = posts whose author shares at least one group with the caller where both are `state = 'member'`, same visibility rules; `everyone` = the body of `community_discover_posts` (public posts from non-suspended, non-blocked, non-muted authors). Every scope keeps the mute, block, suspended and status filters and the ED and calm read-side withholds exactly as the current functions apply them (reuse the helpers; never inline a copy). Unknown scope raises `invalid_input`.
- Sort: `newest` = `(created_at, id) DESC` with the existing cursor. `respected` = posts from the last 14 days ordered `(reaction_count DESC, created_at DESC, id DESC)` with a three-part cursor `reaction_count|created_at|id` encoded by a new `_community_cursor_parts3`; the function returns the cursor in that shape when `_sort = 'respected'`.
- Rate check: `community_feed` carries none today; none is added.
- Acceptance block at the foot: scope and sort matrix for a four-profile fixture (A follows B; A and C share a gym; A and D share a group; E blocked), asserting row sets, and an `invalid_input` on scope `x`. Rollback: `CREATE OR REPLACE` back to the migration 170 body (quoted in the header).

Client (`src/lib/community/feed.js`): `loadFeed({ cursor, limit, scope = 'following', sort = 'newest' })` passes `_scope` and `_sort`; `loadHub(scope, { cursor, sort })` replaces the `segment` argument (keep `'discover'` mapping to `scope: 'everyone'` for callers until 1C lands). Tolerance: when the RPC answers with a function-signature error (the migration not yet applied), `gym` and `groups` fall back to `following` and `respected` to `newest`, and the result carries `fallback: 'scope'` or `'sort'` so the Hub can show one quiet line ("My gym needs the next update" is NOT shown; the chip is simply disabled with no explanation, 03 L-rule on silent degradation: the line is "Not available yet"). Cache: `writeCachedHub` keys by scope and sort. Tests: `feed.test.js` extended for the arguments, the fallback and the cache key; `community.migrationShape.test.js` extended for 190's header and idempotence.

### 2.3 The Hub (lane 1C, after 1A and 1B)

`CommunityHubScreen.js` rebuilt. Data loaders and the join, host, early-days, moderation-notice, rules-notice, legacy-partner, ED and calm logic are kept; the render is replaced.

- Header: title "Community" at `type.h3` weight medium (the tab root has no Back), three 48 dp glyphs in `textPrimary`: search, activity (amber dot when unseen), messages (amber badge with count). Avatar and privacy leave the header (both live under You).
- Segment bar: 48 dp, four `Chip` radios Feed | People | Groups | You (`accessibilityRole="radio"`), selected chip amber fill with `onPrimary` ink, the others `surface2`. The chosen segment persists per device in AsyncStorage (`community.hub.segment`); first open lands on Feed.
- Feed segment: chip row Following | My gym | My groups | Everyone (single select, `accessibilityRole="radio"`), sort control at the row's end ("Newest" / "Most respected", a `MenuSheet`); a disabled chip reads "Not available yet" in its accessibility hint when the server lacks the scope. Then one full-bleed `surface` band: the compose well ("Share something from your training", opens `CommunityCompose` with a kind sheet: a note, or your last session) and the posts as `PostRow`s (2.4) separated by hairlines. Empty states per scope, one quiet line plus one tertiary action (Following and nobody followed: "Follow a few people to fill this feed" with "Find people"; My gym with no gym: "Set your gym to see who trains there" with "Set gym"; My groups with none: "Join or start a group" with "Groups"; Everyone empty: "Nothing posted yet. Yours could be first." with "Write a post"). Error and offline states keep the house `EmptyState` with retry. Paging with the list footer indicator.
- People segment: band 1 = search well, "Find people" row (subtitle "Train like you, same gym, near you, same discipline"), "Requests" row with count; band "Your gym" (the gym cohort row, or "Set your gym" row when none); band "Disciplines" (discipline cohort rows); band "Near you" (the area row when the person shares area). The age group cohort row is removed from the Hub; the age-group filter stays in `PeopleFiltersSheet` and the `CommunityDimension` age page stays reachable from Find people's filter result only.
- Groups segment: band "My groups" (`GroupRow`s with member count and "N trained this week"), band "Invites" (pending invites with Accept and Decline inline), band with "New group" and "Browse open groups" rows (browse opens `CommunitySearch` on its groups mode).
- You segment: the You row (DayDots at 8 dp and "N sessions this week"), the `ProgressStrip` as a band section (no radius), rows: My profile, Followers and connections, Privacy and sharing (opens `CommunityPrivacy`), Training profile, Community rules; the HOST row and the early-days invite row live here when their conditions hold; non-members see the hero band here and on Feed.
- Non-member: Feed shows the hero band ("See what people are training" plus "Join Community" and "Browse first") above the Everyone feed in read-only; the `JoinToInteractRow` pattern stays for taps.
- Section headers: the new `SectionHeader` component (56 dp, `type.bodyStrong`, `accessibilityRole="header"`, one trailing action at `type.label` `textSecondary`, 48 dp target), replacing `Eyebrow` on this screen.
- Calm mode and ED flag: every withhold that exists today is reused through the same selectors; nothing new reads the flag; the You row and ProgressStrip hide under the same conditions as today.
- Tests: `CommunityHub.states.test.js` rewritten for the four segments, each scope's empty state, the disabled-scope state, the non-member state, the persisted segment, the calm and ED withholds (assert the same hidden surfaces as before), header glyph count, and a source guard that no `Eyebrow` and no `Card` remain in the Hub.

### 2.4 `PostRow` (lane 1C; the one post anatomy, used by the Hub and in Stage 2 by Post detail, Profile, Group and Dimension)

`src/components/community/PostRow.js`, replacing `ActivityItemRow` for posts (the activity inbox keeps `ActivityRow`). Anatomy, top to bottom, inside a `surface` band with `spacing.lg` horizontal padding and `spacing.md` vertical, hairline below: identity line (avatar 36 dp with the ring dot, name `type.bodyStrong`, group name as the author for block posts, time right-aligned `type.caption` `textMuted` from one shared `postTimeLabel(createdAt, now)` helper: "Today", "Yesterday", weekday within 7 days, "12 Oct" beyond; never a clock time); achievement line (`type.num('bodyStrong')` `textPrimary`: session name, "Squat 140 kg x 5", block name, milestone title, or the note's first line for notes; a `PR` mark in `primary` on `primary` at `alpha.soft` for pr posts); stats line (`type.num('label')` `textSecondary`: minutes, sets, lift volume kg, PR count; never bodyweight, measurements or calories); note (`type.bodySm`, 3 lines, "more" opens the post); reaction bar (heart, filled `primary` once given, else `textMuted`, with count; comment glyph with count; each 48 dp target; the bar starts flush with the text column). Respect is optimistic with revert and a calm toast on failure, offline, rate limit or restriction ("Could not send that. Try again in a moment." / "You have given a lot of Respect today. It will be back tomorrow." / the restricted line from 2.6). Reduce Motion respected on the 120 ms tap scale. Tests: render per kind, the time helper boundaries, the optimistic path with revert, the ban on bodyweight, measurement and calorie keys in the stats line (source guard), targets at 48.

### 2.5 Unseen badge for the tab

`src/lib/community/unseen.js`: `useCommunityUnseen()` reading the existing activity-unseen flag and the unread message count the Hub already computes (01 section 1.3), exposed through the store slice `community.unseen` (boolean) so `VolyumeTabBar` can read it with one selector; cleared when Activity or Conversations are opened, as today. Guard: never reads the ED flag or tier.

### 2.6 The flow fixes (lane 1D, concurrent with 1C; do-not-touch: `CommunityHubScreen.js`, `PostRow.js`, `feed.js`)

From 03 section (a), each with a test:
- L3 Respect on Profile and Group screens and "Respect everyone": optimistic with revert and the calm toasts above (the Hub's path lands with `PostRow`).
- L4 Join: the four rules and the rules link move above the "Create profile" button; the button's label stays.
- L5 One truthful audience sentence: the summary strip, the onboarding receipt and the training-profile row each state the real audience of the real default ("Your sessions are shared with everyone on Community unless you change it" when sessions are on; "Off: only you see your sessions" when off); the "Off by default." fragment is removed where the row is on.
- L6 Find people and People list rows: Follow is the primary action (`FollowButton`); Connect is offered on the profile and explained once in a two-line footer on Find people ("Follow to see their training. Connect to message each other.").
- L7 `profile_restricted` and `profile_suspended` mapped in the transport's error-to-copy table to "Your Community access is limited at the moment. See the notice on Community." and never "try again".
- L9 Close group and Leave group confirm with the house confirm sheet; "Invite people" is shown as a row on the group page after creation and in the group page for admins, not only in the menu; the duplicate menu row removed.
- L10 Today live row when following nobody: "Find people to follow" with action Find people (opens the People segment).
- L11 Onboarding step 5 title names Community ("Where you train, and Community") and the join shows one confirming line after it fires.
- L12 Compose: one default audience rule (the person's profile default, shown on the screen with the privacy receipt), group chips in their own labelled row below the audience radios, "Followers" explained when the person has none.
- L13 Terminology census: "post" everywhere a user sees the item (never "story" or "item"); "Respect" shown as the accessibility label and as the word beside the count on the post detail; "Connect" and "Follow" explained once (L6); "cohort" never shown; "Blurb" becomes "About you"; "Operator" becomes "Moderator". A Haiku pass with a before and after list in the report.
- L14 Non-member Hub: "Browse first" shows the Everyone feed in read-only (2.3) and the loop is gone.
- L15 Activity empty state and the legacy card open Find people, not Search.
- L16 Edit profile: the training styles row and the disciplines row merge into one "How you train" picker (the existing taxonomy that the server reads; the other is removed from the form only, not from the data); gym and place stay as they are.
- L17 Privacy screen shows the state of "Share what I did" as a row with its switch mirrored (same setter), so it is one tap deep.
- L18 Report: the ellipsis opens the `ProfileMenuSheet` (Report, Block, Mute, Copy link) everywhere a post or profile is shown; message long-press gets a visible "..." affordance on the bubble's timestamp.
- L20 First-session summary shows the share strip only, the "which days you trained" card returns from the second session.
- Low items 21 to 26 as listed in 03.
- Dead code: `DimensionRow.js`, `GymWeekBoard.js` and their tests removed; `COMMUNITY_DIMENSION_MIN_FOR_HUB`, `limitsForAccount`, `isNewAccount` removed if no consumer remains after the Hub lands (lane 1D checks after 1C); "five doors" comments corrected to six; programme remnants (`_programme_id` in `createPost`, `tp_programme_key`, the `p` path in `links.js`, the comments) removed where the server tolerates it (migration 178 accepts a null `_programme_id`; verify and state).

## 3. Stage 2: the Community visual law

Finalised from 04 section 3, items marked [A] and [band], as the law for all 24 screens, in `13-VISUAL-LAW.md` written by the lead before Stage 2 lanes launch. Guards `community.layout.guard` and `community.presentation.guard` re-pinned to it.

## 4. Stage 3 items, in one line each (specs written by the lead before each lane)

3a presence: `community_profiles.training_since timestamptz` heartbeat set by the logger on session start and cleared on finish (own-row RLS, forward-only, no history), read by `community_hub_summary` as counts and first names for people the caller follows, opt-in switch "Show when I am training" default OFF, withheld under calm mode or an open ED flag through the existing read-side gate. 3b group chat: `community_group_messages` with the group's week band at the top of the group page, push through `community-notify` under the existing quiet hours and daily budget. 3c challenges: `community_group_challenges` counting sessions logged by members between two dates, one per group at a time, no weight, calories or bodyweight anywhere in the schema or copy, withheld under calm mode. 3d recognition: milestone posts at 10, 25, 50, 100, 250 sessions and a "weeks in a row" mark on the profile from the existing consistency counters. 3e privacy panel: every sharing switch on `CommunityPrivacy` with its live state. 3f link previews: `community-public` renders per-item titles and descriptions without any private field.

## 5. Device checklist (Stage 1, physical Android, EAS build)

1. Open the app: Today is the default tab; a sixth tab "Community" shows; labels fit with no truncation at your device width. Expected: six labels, the cushion slides to Community on tap.
2. Tap Community as a member: it opens on Feed with Following selected, the compose well, posts under the header without scrolling.
3. Chips: tap My gym, My groups, Everyone; each shows its own posts or its quiet line; if the migration is not applied yet, My gym and My groups show "Not available yet" and stay disabled.
4. Sort: "Most respected" reorders by Respect; "Newest" restores.
5. Tap the compose well: choose a note, type, post; the post appears at the top of Following and the Hub returns.
6. Give Respect on a post in the feed while in flight mode: the heart fills then reverts with a calm toast; online it sticks.
7. People: Find people first; Your gym, Disciplines, Near you under their own headers; no age-group row; Find people's filter still offers age group.
8. Groups: My groups, Invites with Accept and Decline, New group and Browse open groups.
9. You: your week, profile, followers and connections, Privacy and sharing, Training profile, rules.
10. Re-tap the Community tab from a deep screen: it pops to the Hub.
11. From Coach, tap Community; press Back; you land on the Hub root, then the tab switch returns you to Coach.
12. A push for a comment opens the post; a group push opens the group.
13. Calm mode on (Settings): the You row and the ProgressStrip are hidden as before; nothing new appears. ED case: with an open flag the same hides hold and no weight-adjacent copy appears anywhere in Community.
14. Non-member: the Community tab shows the hero and the Everyone feed in read-only; Join works; "Browse first" leaves you reading.
15. Larger text (x1.2): post rows grow, nothing clips, targets stay tappable.
