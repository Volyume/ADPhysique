# 04. Community, sync and backend, payments (dormant), observability, build and release

Slice of the Volyume product map, survey date 2026-10-13, app version 2.14.0 (package.json line 3; app.json `version` 2.14.0, Android `versionCode` 3357, iOS `buildNumber` "10"). Source of truth is the code. Docs, comment blocks and the `supabase/README.md` status block are cited as claims and are labelled where I checked them against code. Labels: OBSERVED means I read it in a file; INFERRED means I concluded it from what I read; NOT TRACED means I did not follow it.

Status vocabulary: LIVE (user reachable), CONDITIONAL (needs state, flag or data, named), BACKGROUND (no screen, consumed by something), DORMANT/LEGACY (unreachable, reason given).

Scope notes up front:
- The brief says "27 Community*Screen files". OBSERVED: there are 25 (`ls src/screens | grep -i community`). Every one is registered in `CommunityStack` (RootNavigator.js 513-563), plus two deliberate duplicate registrations of `CommunityCompose` and `CommunityPost` in the Today stack (RootNavigator.js 507-508).
- `src/lib/partners/` does not exist (OBSERVED, `ls` fails). `src/lib/navigateCommunity.js` does not exist; the file is `src/navigation/navigateCommunity.js` (OBSERVED).
- Community is its own bottom tab, `CommunityTab` (RootNavigator.js 796), visible title "Community", in a six-tab bar: Today / Train / Nutrition / Progress / Community / Coach (RootNavigator.js 788-797).

---

## PART 1. COMMUNITY

### 1.1 What Community is (architecture, OBSERVED)

A cross-user social layer: profiles, follows, a chronological story feed, reactions ("Respect"), comments, direct messages between connected people, groups with group chat and session-count challenges, "training now" presence, boards (ranked rosters), Find people discovery, a UK gym directory, moderation and public share pages.

Security shape (OBSERVED in `src/lib/community/transport.js` header, `supabase/migrate_160_community.sql` header, `src/__tests__/community.rpcOnly.guard.test.js`):
- Every `community_*` and `gym_*` cloud table has RLS enabled, no policy for `anon` or `authenticated`, and all privileges revoked. There is no direct PostgREST access. The only ingress and egress are SECURITY DEFINER RPCs, `search_path = public, pg_temp`, EXECUTE revoked from PUBLIC and anon, granted to `authenticated`. Internal helpers prefixed `_community_` are not executable by `authenticated`.
- Exception to RLS-only: the public share pages read through the `community-public` edge function with the service role and an explicit field allow-list (section 2.6).
- Client side: `src/lib/community/transport.js` is the ONLY file under `src/lib/community/` allowed to import `getSupabaseClient` (pinned by `community.transport.guard.test.js`). `callCommunity(name, params)` runs `assertCommunityGates()` first: (1) `isSignOutWiping()` then `sign_out_wiping`; (2) `healthConsent !== true` then `health_consent_unresolved` (fail closed on an unreadable store); (3) `hasLiveSession() === false` then `not_signed_in` (tri-state: null means "could not tell" and does NOT block). Errors are mapped to a closed code list (`COMMUNITY_ERROR_CODES`, about 28 codes) so screens map codes to calm copy; deliberate refusals are not logged as defects (EXPECTED_CODES).
- Community needs Article 9 health consent even though it carries no health data: it is deliberately gated the same as sync. INFERRED reason: one consent gate, no special cases.
- Barrel: screens import from `src/lib/community/index.js` (208 lines of re-exports), never from inner modules (convention; not all enforced by a test I read).
- Chronological only: `feed.js` header states "There is no engagement ranking anywhere in Community, by decision (SD-06)". The one non-chronological sort, `respected`, is a user-chosen sort by Respect count (feed.js `FEED_SORTS = ['newest','respected']`). NOT TRACED: how the server orders `respected` (migrate_190 body not read in full).
- No realtime. DM thread and group chat poll every 20 seconds while the screen is in front (screen headers CommunityConversationScreen, CommunityGroupChatScreen); lists refresh on focus and pull to refresh.
- Never shared across users (SENSITIVE_COMMUNITY_KEYS in `validation.js` 65-73): weight, body fat, height, age, DOB, calories and macros, names, email, scans, capability and injury, ED pattern, SCOFF. `community.privacy.guard.test.js` is a source-level guard banning body, food, scan, coaching, wellbeing reads from `src/lib/community/` files. The community lib cannot import `wellbeing.js` or `edPatternDetector.js` (stated in `trainingConsistency.js` header); the ED/calm gate is obtained through `src/hooks/usePhotoSuppression.js` (`readEdOrCalmSuppressed`, `derivePhotoSuppression`).

### 1.2 Entry points into Community (OBSERVED)

| Entry | Where | Notes |
|---|---|---|
| Community tab | `MainTabs`, RootNavigator.js 796, `VolyumeTabBar` shows a dot from store `community.unseen` (VolyumeTabBar.js 100) | dot only, never a count; derived from `useCommunityMe` via `hasUnseen` (unseen activity, a follow or connection request, or unread messages) |
| Today live row | `HomeCommunityTodayRow` rendered by `HomeScreen.loadCommunityFriendsRow` (HomeScreen.js 732-770) | only if a Community profile exists; hidden when an ED flag is open, wellbeing read failed, or calm mode (HomeScreen.js 741); count from `community_friends_trained_today` via `src/lib/widgets/friends.js` |
| Today intro card | `HomeCommunityIntroCard`, re-offer rule `src/lib/community/introReoffer.js` (shown once more after five further completed sessions, then final) | for people with no profile |
| You (Coach) tab row | YouScreen.js 498-510 `navigateCrossTab(navigation,'CommunityTab')` | |
| Settings row | SettingsScreen.js 145 (comment says it used to open CommunityPrivacy, now opens Community) | |
| Workout summary share strip | WorkoutSummaryScreen.js 287-416, 1395; ambient auto-post (section 1.6) and "Post this" to `CommunityCompose` | duplicate `CommunityCompose`/`CommunityPost` registrations in Today stack so Back returns to the summary |
| Onboarding "Your gym" step | `ProOnboardingScreen.js` + `src/lib/community/onboardingJoin.js` | a join that cannot run now is queued per account and drained on reconnect, app start and Hub open (`retryPendingJoin`, wired in App.js and CommunityHubScreen.js 456) |
| Deep links | RootNavigator.js 960-1010, prefixes `volyume://` and `https://volyume.app`; `Community: 'community'`, `CommunityProfile: 'u'`, `CommunityPost: 's'`, plus group and message links | the legacy `/partner/<CODE>` path is rewritten to `community?legacyPartnerCode=` (section 1.9) |
| Push taps | `community-notify` data carries `kind`, `post_id`, `group_id`, `conversation_id` | NOT TRACED: the tap router in the notifications layer |
| Android home widget | `src/widgets/` + `src/lib/widgets/friends.js` friends line | BACKGROUND |

`navigateCommunity(navigation, screen, params, {replace})` (src/navigation/navigateCommunity.js): pushes in-stack if the current navigator's `routeNames` contains the screen, otherwise hops via `navigateCrossTab(navigation,'CommunityTab',...)`. Used by CommunityComposeScreen and CommunityPostScreen (OBSERVED by grep) because those two live in two stacks.

`useCommunityMe` (src/hooks/useCommunityMe.js, 51 lines): cache first then RPC. Calls `loadMe({force})` (profile.js, `community_get_me`), returns `{me, loading, error, refresh}`, never throws (error is a code), publishes the tab dot via `publishCommunityUnseenFromMe`. Default `emptyMe()` has `is_minor: true` (profile.js 60: unknown means minor until the server says otherwise, fail closed). Cache key prefix `ME_CACHE_PREFIX` in AsyncStorage, per user.

### 1.3 Screens (all 25, registered in CommunityStack unless noted)

Format: screen | what it does | entry | key lib | data (RPC / storage) | status | connects to.

| Screen (lines) | What it does | Entry / navigates to | Key files and data | Status |
|---|---|---|---|---|
| CommunityHubScreen (1457) | The tab root. Header with three 48 dp glyphs (search, activity, messages). Segment bar Feed / People / Groups / You, choice stored per device (`community.hub.segment` AsyncStorage). Feed: scope chips Following / My gym / My groups / Everyone, sort Newest / Most respected, compose well, `PostRow`s. People: search, Find people, Requests, gym / discipline / area cohort rows from `community_hub_summary`. Groups: my groups with chat unread, pending invites (Accept/Decline), New group, Browse open groups. You: own row, `ProgressStrip` (consistency counters), HOST row (follow the founder), presence band, rules/moderation notices, legacy partner card. | Tab root; `route.params.segment` opens a segment (Today row sends `people`); `retryPendingJoin` on open. Navigates to Activity, Board, Compose, Conversations, Dimension, EditProfile, FindPeople, Followers, Group, GroupCreate, Join, Post, Privacy, Profile, Rules, Search, TrainingProfile | `loadHub`, `loadHubSummary`, `loadConsistency`, `consistencyGateState`, `listMyGroups`, `acceptGroupInvite`, `declineGroupInvite`, `myStatus`, `getProfile({handle:COMMUNITY_HOST_HANDLE})`; RPCs `community_feed`, `community_hub_summary`, `community_group_list_mine`; cache `@volyume_community_hub_<uid>[:scope:sort]` | LIVE. CONDITIONAL parts: a scope the server cannot serve (migration 190 unapplied, `fallback==='scope'`) renders disabled (now moot, 190 applied); consistency strip withheld under calm mode or open ED flag; minors see no group create |
| CommunityJoinScreen (754) | Creates the Community profile. Handle (live shape check then availability, `community_check_handle`), display name, avatar preset, visibility (public / followers), gym picker (+ up to 3 other gyms), disciplines, training-profile bands with toggles and preview line, "Share what I did" switch, the Rules and privacy receipt above one committing button. Recording the profile is what writes the `community_visibility` consent row. | From Hub, Compose, Post, FindPeople (`JoinToInteractRow`), Today intro. Navigates to Rules. | `upsertProfile`, `checkHandle`, `suggestHandle` (server `community_handle_suggestion`), `ensureBodyProfilePushed`, `src/lib/gyms`, `profileAvatarPresets`; local state default `visibility='public'`; minor: `share_sessions` forced off unless chosen (Join 261) | LIVE |
| CommunityEditProfileScreen (668) | Edit avatar, about (name, bio <=160), goal, where you train (setting), place, primary gym ("Trains at"), other gyms (3), what you train for (disciplines), link to Training profile, who can follow, Save, Leave Community. Facts are typed here; nothing is read from onboarding, body profile or engine. | From Hub, Privacy, Profile | `upsertProfile`, `leaveCommunity` (RPC `community_leave`), gyms lib | LIVE (needs profile) |
| CommunityProfileScreen (705) | One person: avatar, name, handle, bio, shared facts line (gym, place, styles), own progress strip (others' strips not shown), Follow / Connect / Message row, counts, Activity list, menu (Share link, Block, Mute, Report). Handles blocked, offline, not-available states. Accepts `handle ?? h` from `/u/?h=`. | Many (rows everywhere); deep link `u` | `getProfile`, `follow`, `unfollow`, `blockUser`, `unblockUser`, `muteUser`, `reportContent`, `profileUrl`; RPC `community_get_profile`, `community_relationships` | LIVE |
| CommunitySearchScreen (252) | People search by handle or display name (debounced, request-id guarded) plus group search; recent searches (last 8, on device). Client ordering by `rankPeople.js`: exact handle, prefix, token prefix, small edit distance. | From Hub, Find people, Profile | `searchPeople` (`community_search_people`, up to 40 candidates), `searchGroups` (`community_group_search`) | LIVE |
| CommunityFindPeopleScreen (266) | Six "doors": at my gym, near me, train like me, open to training together, people you might know, same discipline. Each door states its count or exactly what is missing. No percentages (SD-24), no density threshold (SD-28). | Hub People segment, Conversations empty state, Dimension | `findPeople.js` (`community_find_people`), `doorsFor(me)`; navigates to PeopleList, Search, Join | LIVE |
| CommunityPeopleListScreen (373) | The scored list behind one door: profile rows with fixed-wording reasons, Follow as the one primary action, hard filters shown as removable chips (`PeopleFiltersSheet`), server cursor, fallback divider "More people on Volyume". | From FindPeople | `loadFindPeople`, `reasons.js` tokens (`same_age_band`, `near_place`, `within_25_miles`, `same_place`); `partners` mode preselects `train_together` | LIVE |
| CommunityActivityScreen (356) | The inbox: connection requests, then follow requests (Accept / Decline), then activity rows. Opening marks all seen (clears dot). | Hub header glyph | `loadActivity`, `markActivitySeen`, `respondToFollow`, `respondToConnect`; RPCs `community_activity`, `community_mark_activity_seen` | LIVE |
| CommunityPostScreen (354) | One story card and its thread: Respect tap with count, comments, report someone else's, delete own. Readable without a profile (SD-04); reacting and commenting need one. | Feed rows, deep link `s`, Conversation context refs, push taps | `getPost`, `reactToPost`, `addComment`, `listComments`, `deleteComment`, `deletePost`; RPCs `community_get_post`, `community_react`, `community_comment`, `community_list_comments` | LIVE |
| CommunityComposeScreen (421) | Post a training story. Kinds `pr`, `session`, `block`, `milestone`, `note`. Caption <=280. Audience chips (followers / public / groups; a minor never sees public). "Add a note" mode (`params.postId`) edits the note on an existing auto item through `community_post_set_note`. | From WorkoutSummary share strip, ShareCard, Hub compose well, Group screen | payload built only by `posts.js` builders (`buildPrPayload`, `buildSessionPayload`, `buildBlockPayload`, `buildMilestonePayload`); `composeDefaultVisibility({isMinor, sessionsAudience})`; RPC `community_create_post` | LIVE |
| CommunityConversationsScreen (184) | The Messages list, most recent first. Empty state sends to Find people. A conversation closed by a removed connection or block is not listed. | Hub header glyph | `listConversations` (`community_conversations`) | LIVE |
| CommunityConversationScreen (619) | One DM thread. Resolves from conversation `id`, `userId` or push; optional context `ref` (a story) on first message. Text 1-1000 chars (`MESSAGE_MAX`), keyword filter on client and server, report via long press, 20 s poll. Refusals spoken as codes: `not_connected`, `minor_restricted`, `rules_outdated`, `blocked`, `rate_limited`. | From Profile, Connections, PeopleList, push | `messages.js`; RPCs `community_send_message`, `community_messages`, `community_mark_conversation_read`, `community_delete_message` | LIVE (needs an accepted connection) |
| CommunityConnectionsScreen (236) | The caller's connections, keyset paged; row menu "Message" and "Remove connection". Removing ends the conversation; the two follow edges stay (stated in confirm copy). | From Profile, Privacy | `listConnections`, `removeConnection` | LIVE |
| CommunityFollowersScreen (225) | Caller's followers; row menu "Remove follower". | From Profile (own), Privacy, Hub | `listFollowers`, `removeFollower` (`community_list_followers`, self-only per migrate_164 Part 7) | LIVE |
| CommunityDimensionScreen (803) | A "cohort page": people who chose the same gym, area, style, discipline or age group. Count line, week roster (`PersonRow`s from `loadBoard`, own row pinned, rank numbers only from 8 people), "This month and consistency" row to the board, RECENT shared moments (`community_dimension_recent`), "Respect everyone who trained today" (`RespectAllRow`), Confirm-this-gym action, report-a-problem modal with Beat signposting. | From Hub People rows, Profile | `loadDimension`, `loadDimensionRecent`, `respect.js`, `src/lib/gyms`; RPCs `community_dimension`, `community_dimension_recent`, `community_respect_all`, `community_gym_summary` | LIVE |
| CommunityBoardScreen (318) | One flat ranked list for a scope (gym / following / group / everyone) and window (week / month / consistency). Own row pinned if off page. No medals, no all-time window. Row taps open Profile. | From Dimension, Group, Profile | `boards.js` -> `community_board`; `threshold_met` passed through untouched (unranked under 8 participants) | LIVE |
| CommunityGroupScreen (792) | Group page: header with count and access line, blurb, presence band ("training now"), Chat band (latest three messages, unread, Open chat), Challenge band (admins start / end), Members (week board, See all), Activity (members' stories), Join / Request for non-members, Accept / Decline on an invite. Menu: Edit, Invite people, View members, Share link, Report, Close group, Leave. | From Hub Groups, Search, deep link `g` | `groups.js` (16 RPC wrappers), `challenges.js`, `presence.js`; RPCs `community_group_get`, `community_group_feed`, `community_group_join`, `community_group_invite`, `community_group_invite_link`, `community_group_close`, `community_group_leave` etc. | LIVE; minors refused server-side on create / join / invite / accept |
| CommunityGroupCreateScreen (183) | Create or edit a group: name <=40, blurb <=140, access Open / Invite only. Edit mode via `route.params.mode==='edit'`. | From Hub, Group menu | `createGroup`, `updateGroup` (`community_group_create`, `community_group_update`) | LIVE (never opens for a minor, client check on `me.is_minor`) |
| CommunityGroupMembersScreen (266) | Roster with role badge; admins see pending requests and a row menu Remove / Make admin. | From Group | `listGroupMembers`, `approveGroupRequest`, `removeGroupMember`, `promoteGroupMember` | LIVE |
| CommunityGroupChatScreen (303) | Group chat: text only, members only, 1-500 chars, inverted list, 20 s poll in foreground, `markGroupRead`, long-press delete (author or admin) or report (kind `group_message`). Poll merges newest page by id and keeps the older cursor (round 3R). | From Group Chat band | `groupChat.js`, `groupChatState.js`; RPCs `community_group_messages`, `community_group_send_message`, `community_group_message_delete`, `community_group_mark_read`; push via `community-notify` kind `group_message` | LIVE (needs 191, applied) |
| CommunityGymAddScreen (247) | "Can't find your gym? Add it": name, address, town, UK postcode (pattern-checked client side), optional website and operator. A duplicate found at submission (GD-06) is offered back ("Use this gym"). New submission is `pending` until a second independent person confirms or a moderator verifies it. | From `GymPicker` | `src/lib/gyms` (`gyms_submit`, `gyms_confirm_submission`) | LIVE (needs the postcode sector seeded, per migrate_162 note) |
| CommunityPrivacyScreen (582) | The one panel for every sharing switch with live state: who can follow, who can send connection requests, Show my gym, Show my place, Share what I did (+ audience), Share my consistency, Share my age group, Show when I am training, Training profile link, Blocked list, Muted list, Edit profile, Followers, Connections, Moderation (moderator only), Leave. Works before joining as a "what would Community share" receipt. | From Hub You, Settings | `saveShareSessions`, `saveBandToggle`, `setShowGym`, `setShowPlace`, `saveShowTrainingNow`, `setConnectFrom`, `setCommunityQuietHours` | LIVE |
| CommunityTrainingProfileScreen (521) | Coarse bands derived on device from the last 12 weeks of completed workouts (days, time bands, sessions band, staple lifts, experience, age band), each with a toggle, plus "What other people see" preview line, Recalculate, "Open to training together" (+ partner prefs, same gym only). The server NULLs any band not sent, so switching off is erasure. | From Hub, Privacy, EditProfile | `trainingProfile.js` (769 lines), `trainingConsistency.js`, `bandShare.js`, `shareSessions.js`; RPCs `community_update_training_profile`, `community_set_partner`, `community_set_connect_from` | LIVE |
| CommunityRulesScreen (364) | Versioned rules text (version 3), what stays private, reporting and blocking, moderator powers, contact address. `route.params.mustAccept` shows "Accept the updated rules" which calls `acceptRules()` (sends `accept_rules_version` alone). | From many; every `rules_outdated` refusal routes here | `COMMUNITY_RULES_VERSION=3` (limits.js), `acceptRules`; rules text pasted from `docs/community-safety/COMMUNITY-RULES.md` | LIVE |
| CommunityModerationScreen (604) | Moderator-only queue: Open / Actioned reports (Actioned tab IS the audit view), gym submissions (Approve / Reject), gym reports (Dismiss / Resolve). Priority flag for "Harmful body or eating content". Non-moderators see a calm "Not available". | Privacy screen row, shown to moderators only | `isModerator` (`community_is_moderator`), `moderationQueue`, `moderate`, `src/lib/gyms`; RPCs `community_moderation_queue`, `community_moderate`, `gyms_review_submission`, `gyms_review_report` | CONDITIONAL on being in `community_moderators` (server-seeded with the marketing admin address, migrate_160) |

### 1.4 Profiles, privacy and sharing defaults (OBSERVED)

Profile fields: handle (regex `HANDLE_REGEX`, reserved list, changeable once per 30 days `HANDLE_CHANGE_DAYS`), display name (`DISPLAY_NAME_MAX`), bio 160, avatar preset (`profileAvatarPresets`, no photos), up to 3 style chips (bodybuilding, strength, kettlebell, circuits, bands, bodyweight, minimal_kit, home_gym ...), goal (build_muscle, get_stronger, general_fitness, returning), setting (commercial_gym, home_gym, minimal_kit), up to 3 discipline keys (15-key taxonomy, migrate_170), gym (`gym_id` from directory plus up to 3 `other_gym_ids`), place (`place_key`/`place_label`, outward code or town only, never a device coordinate, migrate_163), profile visibility `public | followers`.

Defaults and gates:
- Rules version 3 (limits.js). `_community_rules_version()` returns 3 (migrate_174/175). A profile that accepted an older version gets `rules_outdated` on first connect, message or training-profile share, and is routed to the Rules screen.
- Minor handling fails closed: `_community_minor(uid)` treats an unknown DOB as a minor (migrate_174, README row). Client `emptyMe().is_minor = true`. Minors: profile forced followers-only, out of search, suggestions, cohorts, boards and gym feed scope; no connections (`minor_restricted`), no DMs, no group create / join / invite, no `public` post visibility, no presence switch (`forbidden`), sessions audience clamped to followers (`shareSessions.js`). Public web pages 404 for minors (community-public header).
- "Share what I did" (`share_sessions`) default ON for everyone since the founder order of 2026-09-26 (migrate_184 default true; migrate_185 flipped existing profiles created before 22 September; migrate_186 made an unasked new profile OFF so the Join screen's explicit choice wins; minors start off). Default audience `everyone` for adults, `followers` for minors (`DEFAULT_SESSIONS_AUDIENCE='everyone'`, trainingProfile.js 181). Audience closed set `followers | groups | everyone`; a stored but unrecognised value fails closed to the narrowest (trainingProfile.js 199-204 comment and code at 496-500).
- Training-profile bands default share (`TP_DEFAULT_SHARE`, trainingProfile.js 134-165): days OFF, time_bands OFF, age_band OFF, sessions ON, staple_lifts ON, experience ON; consistency key present (value not read in the grep window, NOT TRACED beyond "separate gate").
- `connect_from` default `anyone` (profile.js 70). Show gym / show place are separate setters (`community_set_show_gym`, `community_set_show_place`).
- Show when I am training (presence): off by default, server column `show_training_now boolean NOT NULL DEFAULT false`, refused for minors.
- Device mirror of the server sharing row: `mirrorSharingFromServer` in trainingConsistency.js never applies a reading fetched before the device's own last change (D194 addendum 2). Pinned by `community.sharingMirror.guard.test.js`.

### 1.5 Feed, scopes, sort (OBSERVED; migrate_190 header read, body not)

- `community_feed(_cursor, _limit, _scope, _sort)`. Scopes: `following` (own posts plus accepted follows), `gym` (authors whose `gym_id` matches or caller's gym is in author's `other_gym_ids`, author `show_gym` on, author not a minor; caller with a NULL gym sees only own posts), `groups` (authors sharing a group; does NOT exclude minors, per header), `everyone`. Sorts `newest`, `respected`. The old two-argument call resolves unchanged to following/newest.
- Client fallback: if the server does not know the scope the result carries `fallback:'scope'` and the Hub disables the chip (`feed.js` 199-230). The default cache key stays the pre-190 key.
- Post visibility values `public | followers | groups` (the client maps the audience word `everyone` to `public`; migrate_187 made the server accept `everyone` too after automatic posts were being refused as `invalid_input`).
- Post kinds (`POST_PAYLOAD_KEYS`, validation.js 87-108): `pr`, `session`, `block`, `milestone`, `note`. `note` has an empty allow-list (caption is the post; added by migrate_178). `validatePostPayload` rejects any non-allow-listed key and any SENSITIVE key. A `programme` kind was retired (migrate_164).
- Per-account rate limits (limits.js): follows/day 30 new, 100 established (new = first 7 days), following cap 2000; posts/day 3 / 10; comments/hour 10 / 30; reports/day 20; profile upserts/day 5; three distinct open reports auto-hide content (`AUTO_HIDE_REPORTS=3`).
- Other limits: caption 280, comment 500, report detail 500, area label 40, gym label 60, DM 1000, group chat 500, connect note 120 and max 2 connect reasons, group name 40, blurb 140, challenge name 40, challenge max 31 days, target max 200.
- Hub payload cached per user/scope/sort in AsyncStorage so an offline open shows the last view with a quiet line.

### 1.6 Posts, stories, ambient auto-posting (OBSERVED)

`src/lib/community/ambient.js` (331 lines): on workout completion, when `share_sessions` is on and the ED/calm gate allows, one `session` post and up to three `pr` posts are created automatically (`auto:true`) through the same `createPost` and the same builders as the manual path. Caller: WorkoutSummaryScreen (`ambientPublishedRef`, line 402-416). Offline or failed calls queue the payload in AsyncStorage key `community.pendingItems` and flush on foreground or reconnect. `client_ref` (workout id, or `workoutId:exerciseId` for PR) makes retries idempotent server-side. The only device reads happen inside `posts.js` builders.
Manual path: CommunityComposeScreen from the summary share strip, ShareCard, Hub compose well. "Respect" is the single reaction (`community_react`), plus "Respect everyone who trained today" (`community_respect_all`, returns `{given, recipients}` since migrate_177, device records one per scope per UK-local day). Notes: `community_post_set_note` adds a note to an existing auto item.
Stories: this product has no photo/video posts; payload is a fixed card (PostCard) from allow-listed keys. NOT TRACED: PostCard rendering of each kind.

### 1.7 Follow, connections, DMs (OBSERVED)

Three tiers (connections.js header):
1. Follow: one-way, may require approval for followers-only profiles (`follow_request`, `respondToFollow`, `removeFollower`, `listFollowers`, `listFollows`).
2. Connect: mutual, accepted. Request carries up to 2 reasons from a fixed set (`CONNECT_REASONS`) and a note <=120. Recipient accepts or declines; declining is SILENT (requester keeps seeing "Requested"). 30 day cool-off after decline or withdraw (`not_allowed`). Recipient's `connect_from` setting can refuse (`connect_not_allowed`). Under-18 refused (`minor_restricted`). RPCs `community_connect`, `community_respond_connect`, `community_withdraw_connect`, `community_remove_connection`, `community_list_connections`.
3. Message: only between connected people, text only, no groups in DMs, no media, no read receipts beyond unread count, nothing pre-written; one optional story reference. Push body is "New message from @handle" never content, at most one push per conversation per 15 minutes while unread (community-notify, section 2.6).
Block (`community_block`, `community_unblock`) hides in both directions and ends conversations; Mute (`community_mute`) silences message pushes while the conversation still works.

### 1.8 Groups, group chat, presence, challenges (OBSERVED; migrate_165 + 176 + 191)

- Groups (migrate_165): open or invite-only, admin / member roles, request to join, approve, invite by handle or link (`community_group_invite_link`, token `groupInviteUrl`), accept / decline invite (decline added by 191), close group (closed groups leave all lists, migrate_176), leave, report. Sixteen `community_group_*` RPCs plus `community_group_feed`. Group board = week board for members. Minors refused server-side.
- Group chat (migrate_191 Part 5, `community_group_messages` table): text only, members only, 500 chars, keyword filter, per-hour rate rail, block or mute hides sender from the blocker, author or admin delete, unread count on `community_group_list_mine`, `last_read_at` and `last_push_at` columns on members. Push: ONE call from the sender with `target_user_id` omitted; the edge function fans out via service-role-only RPC `community_group_message_recipients`.
- Presence (migrate_191 Part 2, `presence.js`, `presenceSession.js`): opt-in "training now". `announceTraining(uid,on)` at session start / finish / discard from ActiveWorkoutScreen (OBSERVED import there); stale after 3 hours (`TRAINING_NOW_STALE_MS`, server enforces the same); readers see only people they follow (hub) or share a group with; names capped at 3; withheld (null) for a viewer the migrate_180 gate withholds; a clear is also sent if this device raised the marker so a later setting change cannot leave a stale marker. No push. Gate on device: profile exists, not minor, switch on, no calm mode, no open ED flag.
- Challenges (migrate_191 Part 7, `challenges.js`, `challengeSession.js`): one active session-count challenge per group (partial unique index), admin create / end, member log idempotent on `session_key` (local workout uid), window up to 31 days, within 2 days of UK-local today. The only figure is a count of sessions; board withheld for a gated viewer. Finishing a workout logs into every active challenge of the person's groups, using ids cached on device; network failures queue a `challenge_session` op in `src/lib/syncQueue.js` (case at syncQueue.js 248). Gate: same as presence.

### 1.9 Partners (retired, DORMANT) (OBSERVED)

- Client: no `src/lib/partners/`, no Partner screens, no Partner routes. Retired 2026-09-06 under SD-03 (comment in `src/lib/database.js` 1506-1511 and `supabase/README.md` 82-103). `grep` for "partner" in src outside tests hits `src/lib/community/notify.js`, `database.js`, `sync/tables/edPatternFlags.js`, `RootNavigator.js` only (OBSERVED, `grep -rniE partner src -l`; test files also hit).
- Local SQLite still creates `partnerships`, `partner_week_signals`, `partner_cheers`, `partner_shared_blocks` (database.js 1513-1647) "for wipe completeness"; nothing writes to them (comment states the sync handler was deleted).
- Cloud: tables `partnerships`, `partner_week_signals`, `partner_cheers`, `partner_shared_blocks`, `partner_weekly_intentions`, `partner_win_cards`, `partner_blocks` and the `partner_sharing` consent type remain (migrations 081, 092, 100, 102, 105-107, 119, 155). Migration 155 (cheer INSERT policy requiring UTC date) was applied 2026-09-26 per README.
- Edge function `partner-cheer` (237 lines) is still in `supabase/functions/` and in the `deploy-functions.yml` choice list, and the README says it is "deployed". The client never calls it (no caller in `src`, OBSERVED by grep for `partner-cheer`: only in README/tests). INFERRED: deployed but unreachable from the app; a signed-in user could still call it directly with a valid JWT. NOT VERIFIED which version is live.
- Legacy links: `volyume://partner/<CODE>` and `https://volyume.app/partner/<CODE>` are rewritten by `rewriteLegacyCommunityPath` (RootNavigator.js 947-956) to `community?legacyPartnerCode=...`; CommunityHubScreen reads `legacyPartnerCode` (line 212) and shows a "Partner invites have moved" card (`legacyCardShown`). The static page `public/partner/index.html` ("Training partner invite") still exists (121 lines).
- Successor: Community's "Open to training together" flag (`open_to_partner`, `partner_prefs`, find-people door `partners`, `community_set_partner`) replaces pairing.

### 1.10 Gym directory (`src/lib/gyms/`, OBSERVED)

UK gym master database as infrastructure under Community (GD-01). Cloud: `gym_brands`, `gym_venues`, `gym_postcode_sectors` (RLS on, one SELECT policy for `authenticated`, "global_read_only"), `gym_venue_sources`, `gym_venue_history`, `gym_submissions`, `gym_reports` (RPC-only). RPCs: `gyms_search`, `gyms_near`, `gyms_in_place`, `gyms_get`, `gyms_suggest`, `gyms_place_centroid`, `gyms_submit`, `gyms_confirm_submission`, `gyms_report`, `gyms_review_submission`, `gyms_review_report`, `community_set_gyms`. Transport (`gyms/transport.js`) goes through Community's `callCommunity` so the same three gates apply; it recovers raw codes `rate_limited`, `invalid_postcode`, `invalid`.
Client: `postcode.js` (UK postcode recognition, offline), `rank.js` (client ordering: brand, locality, distance, edit-distance; reasons are internal and must not be rendered), `website.js` (`officialWebsite(venue)`: "Visit website" only when verification status is settled or source is the operator). Components `GymPicker`, `GymRow`, `GymDetailSheet`, `GymSummary`, `PlacePicker`.
No device coordinate is ever stored (GD-13). "Use my location" depends on `deviceLocation.js` `isAvailable()`; the lib comment says it is false until a location-dependency decision, but `app.json` plugin list contains `expo-location` (line 191), so the comment may be stale. INFERRED, NOT TRACED.
Seed data: `data/gyms/` (11 MB: `uk-gyms.v1.jsonl.gz`, `brands.v1.json`, `postcode-sectors.v1.csv`, review queues, `coverage.v1.md`, `ATTRIBUTION.md`) built by `scripts/gyms/` (sources: Active Places, Companies House, Overture, Foursquare, VOA, sportscotland, datamap-wales, operators; `build.mjs`, `dedupe.mjs`, `geocode.mjs`, `seed-sql.mjs`). Applied via `apply-named-sql.yml` with `seed_dir`. NOT VERIFIED whether the seed is loaded in production (README 162 text says seed applied after 162; not re-checked).
Moderator surface for gym data: migrate_181 + Moderation screen sections.

### 1.11 Moderation, blocked terms, reporting, rules (OBSERVED)

- Reports on profile, post, comment, message, group, group_message (`REPORT_TARGET_KINDS`), six reasons (spam, harassment, impersonation, `harmful_body_or_eating_content` flagged priority server-side, inappropriate, other). One open report per reporter per target (`already_reported`).
- Auto-hide at 3 distinct open reports. Moderator actions: dismiss, hide_content, unhide_content, delete_content, restrict_account, unrestrict_account, suspend_account, unsuspend_account, each writing `community_moderation_log` with a note.
- Restricted / suspended profiles: server raises `profile_restricted` / `profile_suspended` on every write; one calm line, never "try again" (`restriction.js`).
- Keyword filter (`keywordFilter.js`, 176 lines): one list checked client side and again in SQL (`_community_blocked_terms()`), whole-word after folding. Content: self-harm instruction ("kys", "kill yourself"), pro-ED vocabulary (thinspo, bonespo, pro ana, ana coach ...), racial and ethnic slurs, other abuse. Ordinary swearing deliberately NOT blocked. Refusal code `content_not_allowed`.
- Moderators: table `community_moderators`, seeded with the marketing admin address (migrate_160). Screen reachable only via Privacy row for moderators.
- Beat UK signposting appears in the report modal (CommunityDimensionScreen line 176 "Support with eating and body image: Beat").

### 1.12 Link previews and public web pages (OBSERVED)

- Static pages in `public/`: `u/` (profile, query `?h=`), `s/` (story, `?id=`), `g/` (group invite), `p/` (retired programme page, shows "This link has retired"), `partner/` (retired). The site is static GitHub Pages with no path rewriting, hence the query shape (links.js comment). Each page fetches `https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/community-public?...` (public/u/index.html 106, 226) and has an "Open in Volyume" button to `volyume://`. `public/.well-known/apple-app-site-association` and `assetlinks.json` exist (universal links). `app.json` has `associatedDomains applinks:volyume.app` per build-ios.yml comment.
- Deploy: `deploy-pages.yml`, manual dispatch only, main only.
- Link builders: `WEB_ORIGIN='https://volyume.app'`, `APP_SCHEME='volyume://'`, `profileUrl`, `storyUrl`, `groupUrl`, `groupInviteUrl`, `parseCommunityLink` (host compared exactly), `openMessageLink`, `shareCommunityMessage`.
- Edge function `community-public` (359 lines): see 2.6. Link-preview text is an allow-list: profile = display name + handle + discipline labels; story = author display name + fixed headline (+ counts), never caption, load, bodyweight, food, exercise name; group = name + member count for an OPEN ACTIVE group only.

### 1.13 Notifications from Community (OBSERVED)

`notify.js`: `COMMUNITY_NOTIFY_KINDS` = follow, follow_request, follow_accepted, reaction, comment, connect_request, connect_accepted, message, group_request, group_accepted, group_invited, group_message. Client calls `community-notify` best effort and never awaits it. Server decides: proves the action happened, block / mute check, recipient preference category (`community_follow`, `community_message`, `community_activity`), quiet hours (`community_set_quiet_hours`, migrate_164 Part 13), and a fail-closed open-ED-flag check (any read error holds the push). The in-app activity row is the record; the push is an extra.

### 1.14 Community tests (OBSERVED counts)

`src/lib/community/__tests__` 34 files; `src/components/community/__tests__` 25 files; 20+ `community.*.guard.test.js` / `migrate1xx.*guard.test.js` source guards under `src/__tests__/` (privacy, rpcOnly, transport, ambient, copy, discipline, earlyDays, layout, presentation, sharingMirror, stage3Client, visualLaw, lane1D; migrate163-187 guard files; communityNotify.groupMessage / groupProof; communityPublic.preview; communityTab; gymBasics; gyms.rpcOnly).

---

## PART 2. SYNC AND BACKEND

### 2.1 Sync architecture (OBSERVED)

- Local SQLite (SQLCipher) is device truth; cloud is backup and cross-device. Push on save plus queued retry; pull on session restore; last-write-wins with local as device truth (CLAUDE.md; code confirms conflict dispatcher).
- Two tracks run inside one entry point `syncAll({userId, localUserId, triggeredBy})` in `src/lib/sync/runner.js`:
  1. Registry-driven path: `SYNC_REGISTRY` (registry.js, 24 entries) and `MIGRATED_TABLES` (transport.js 87-108, 22 names including the 7 food-domain tables and `recipe_ingredients`) with per-table push/pull handlers in `src/lib/sync/tables/` (20 files). Comment in transport.js: PUSH_HANDLERS 18, PULL_HANDLERS 22; four tables are `pull_only`.
  2. Legacy path in `src/lib/sync.js` (3,308 lines): `bulkUploadLocalData` and `pullFromCloud`, still owning every table not migrated: workouts and workout_sets (`syncWorkout`, `_upsertWorkout`, `_upsertSets`), exercises and custom_exercises, programmes, routines and routine_exercises, mesocycles, session_resolutions, morning_weights, coach_outputs, user_body_profile, user_insights, exercise_user_notes, exercise_intent / swaps / slot_defaults, food_swaps, workout_notes, exercise_goals, peak_week_plans, planned_muscle_volume, adaptation_events, user_prefs (guarded prefs with `notePrefWrite`, `isGuardedPref`, `shouldSyncPref`). Evidence: function list of sync.js (`_push*` / `_pull*`).
- Registry strategies (registry.js header): `last_write_wins`, `server_wins` (pull_only), `merge` (profiles only; per-column `column_updates_at` jsonb, migrate_045). 20 entries `bidirectional`, 4 `pull_only` (count by grep of `direction:`). Registry tables: capability_constraints, session_constraint_effects, weekly_checkins_v2, weight_log, food_entries, custom_foods, saved_meals, recipes, recipe_ingredients, food_favourites, daily_water, daily_intake_rollups, daily_steps, cardio_log, ed_pattern_flags, tier_history, body_composition_log (cloud `body_metrics`), nutrition_targets, effective_maintenance_memos, profiles, notification_preferences, meal_plans, plan_folders, perday_target_offsets.
- Food domain: one bulk RPC pair `food_sync_push` / pull (tables/foodDomain.js, 509 lines) driven once per run by `beginFoodRun`; reconciles via `migrate_015/016/021/090`.
- Triggers (App.js 922-935 comment; code at 106-136, 730-751, 861): foreground (`AppState active`), network reconnect (NetInfo), write (`scheduleSync`, debounced), periodic every 15 minutes while open, background flush. All route through `syncAll` (AC-02). A single in-memory `_runLock` dedupes.
- `syncAll` gates, in order (runner.js 95-160, OBSERVED): (1) `isSignOutWiping()` skip; (2) `healthConsent !== true` skip (fail closed); (3) `hasLiveSession() === false` skip (fail open on "could not tell"); (4) DB deferred by dbCrypto (SQLCipher key unreadable before first unlock) skip; (5) `_runLock`. Also retries a queued health-consent record and the trial-grant retry inside the run (the trial retry is dormant-product residue; NOT TRACED whether it is a no-op under `FULL_ACCESS_FOR_ALL`).
- `watermark.js`: per (user, table) pull and push watermarks in AsyncStorage (`@volyume_pull_wm_<user>_<table>`, `@volyume_push_wm_...`); pull uses `.gte(cursor)` so the boundary row is re-pulled; sign-out clears AsyncStorage so the next sign-in does a full pull (self-healing).
- `conflict.js`: dispatch by registry strategy; every resolution emits `sync_conflict_resolved` telemetry (migrate_043).
- `signOutGuard.js`: module flag `_wiping`, set after sign-out's push-first `syncAll` has completed and before the wipe; cleared on next sign-in. Read by `syncAll` and by Community transport.
- `featureFlags.js` (74 lines): three push flags, all true now: `CIRCUIT_SYNC_COLUMNS_ENABLED` (migrate_158/159, applied 2026-09-05), `PLAN_FACTS_PUSH` (migrate_188, applied 2026-10-05), `ENTRY_TYPED_PUSH` (migrate_189, applied 2026-10-08). Pattern: omit a column from the upsert until the cloud column exists, because Postgres rejects the whole chunk for an unknown column.
- `syncQueue.js` (405 lines): SQLite table `pending_sync_ops` (`op_type`, `entity_id`, `user_id`, `payload`, `retries`, `next_attempt_at`, `last_error`). Op types handled: `workout`, `workout_delete`, `workout_set_delete`, `body_metric`, `morning_weight`, `check_in`, `challenge_session` (switch at lines 190-269). Backoff 0, 1 min, 5 min, 30 min, 2 h, 8 h; MAX_RETRIES 6 then the op stays with `last_error`. Drained on app foreground and the daily sync trigger. The registry's own `sync_queue` was deleted (E12 step 0 comment in runner.js 15-21): the live retry queue is `pending_sync_ops`.
- Telemetry: `sync/telemetry.js` `trackSyncRun`, `trackSyncConflictResolved`, `isDeletedAccountFkError`, `isDbDeferredError`; network-only error runs are demoted (networkNoise.js).
- ED flag cloud push (migrate_182, D196): `edPatternFlags.js` (214 lines) now pushes raises and clears through RPC `ed_flag_push` (scoped to caller's own row; no signals). Registry still labels `ed_pattern_flags` as `pull_only`, and migrate_180's header describes it as pull_only before 182 (OBSERVED in registry.js comment per migrate_180 citing registry 153-160). CLAUDE.md says "no build carrying the push has shipped yet". Whether the current registry/transport still lists the push handler for `ed_pattern_flags` among the 18 PUSH_HANDLERS: NOT TRACED beyond `import { pushEdPatternFlags }` at sync.js line 68 (OBSERVED), so the push runs from legacy `bulkUploadLocalData`.

Per-table handlers in `src/lib/sync/tables/`: bodyComposition, capabilityConstraints, cardioLog, dailySteps, edPatternFlags, effectiveMaintenance, foodDomain, mealPlans, notificationPreferences, nutritionTargets, perDayTargetOffsets, planFolders, profiles (286 lines, the merge strategy), recipeIngredients, sessionConstraintEffects, tierHistory, weeklyCheckins, weightLog, plus `_missingTable.js` (tolerates a cloud table that does not exist) and `_paginate.js`.

### 2.2 Cloud tables (OBSERVED by scanning every `CREATE TABLE` in supabase/*.sql; live existence per README only)

Core user data (owner-scoped RLS, mostly composite PK `(user_id, id)` since migrate_018/021): users_profile, user_body_profile, user_prefs, programmes, routines, routine_exercises, mesocycles, mesocycle_weeks, weekly_volumes, planned_muscle_volume, volume_landmarks, workouts, workout_sets, workout_notes, personal_records, achievements, autoregulation_suggestions, exercises, custom_exercises, exercise_goals, exercise_user_notes, exercise_intent, exercise_swaps, exercise_slot_defaults, session_resolutions, session_constraint_effects, capability_constraints, adaptation_events, plan_folders, coach_outputs, weekly_checkins / weekly_checkins_v2, body_metrics, morning_weights, progress_photos, daily_steps, cardio_log (table retained, feature retired 2026-08-10), peak_week_plans (HELD, migrate_049 would drop it, still used by client), perday_target_offsets, nutrition_targets, effective_maintenance_memos, meal_plans, recipes, recipe_ingredients, saved_meals, foods, custom_foods, food_entries, food_favourites, food_frequents, food_swaps, daily_water, daily_intake_rollups, notification_preferences, device_push_tokens, ed_pattern_flags, user_insights, engine_overrides, tier_history, consent_log.
Telemetry and operations: engine_telemetry (RPC-only ingress `record_engine_telemetry`), scan_calibration_events, user_feedback, debug_log_uploads, account_deletions_log, claude_schema_migrations, claude_seed_files, claude_apply_scratch (see 2.8).
Community: community_profiles, community_follows, community_blocks, community_mutes, community_posts, community_post_groups, community_reactions, community_comments, community_reports, community_moderators, community_moderation_log, community_activity, community_rate_events, community_notify_daily, community_connections, community_conversations, community_messages, community_groups, community_group_members, community_group_invites, community_group_messages, community_group_challenges, community_challenge_entries, community_programmes and community_programme_uses (retired, hold no rows, migrate_164).
Gyms: gym_brands, gym_venues, gym_postcode_sectors, gym_venue_sources, gym_venue_history, gym_submissions, gym_reports.
Partners (retired): partnerships, partner_week_signals, partner_cheers, partner_shared_blocks, partner_weekly_intentions, partner_win_cards, partner_blocks.
Marketing HQ (see 5.9): marketing_waitlist, marketing_admins, marketing_channels, marketing_content, marketing_ledger, marketing_metrics, marketing_promo_codes, marketing_email_log, marketing_email_optout, marketing_survey_responses, pricing_config.
Billing (dormant): trial ledger and cascade columns on users_profile (migrate_030/031/065/070/071), founder Pro ledger (108), `tier_history`.

### 2.3 RLS posture (OBSERVED, partly from migration headers)

- Owner tables: `auth.uid() = user_id` policies (migrate_005, 007). Direct client writes to server-owned tables were revoked in migrate_119 (partnerships, engine_telemetry, consent_log, partner_weekly_intentions) after an adversarial audit.
- Trust-boundary migrations: 061 (pin `search_path` on SECURITY DEFINER), 067/068/070 (tier self-grant fix, trial columns protected by trigger), 088 (drop open INSERT on debug_log_uploads), 117 (revoke telemetry view), 130 (revoke anon EXECUTE on 34 SECURITY DEFINER functions), 152_p0 (restrict internal SECURITY DEFINER EXECUTE), 153 (default function privileges), 179 (RLS on two tooling ledgers after a Supabase advisor email "rls_disabled_in_public"), 183 (revoke three unused community RPCs).
- Community and gyms: RPC-only (above). `gym_brands`, `gym_venues`, `gym_postcode_sectors` have one authenticated SELECT policy.
- Refuse-stale-write triggers (LWW enforced server side): 047, 060, 134 (nine coaching-state tables), 140.
- Anonymous inserts that exist on purpose: `marketing_email_optout` (migrate_124 so the unsubscribe page works), `marketing_waitlist` (public signups). 
- Checks present in repo: `scripts/security/run-effective-supabase-matrix.cjs` (hostile PostgREST/RPC matrix for an ISOLATED project only; needs env `DAYBREAK_ISOLATED_PROJECT_CONFIRM=YES`), `supabase/verify_application_function_acl.sql`, `supabase/audit_cloud_schema_drift.sql`, `supabase/security/effective_catalog_audit.sql`. `src/__tests__/effectiveSupabaseHarness.guard.test.js` pins the harness. Whether the matrix has ever been run against a staging project: NOT VERIFIED.
- Real RLS verification is not possible in Jest (no local Postgres for SECURITY DEFINER); migrate_169's header says a pure SQL syntax defect in `community_board` failed every call after deploy and was invisible to the JS suite. Guard tests therefore read the SQL text.

### 2.4 Migrations grouped by domain (OBSERVED file names plus README table; 189 files, numbering 001-191, gaps at 011, 026, 082, 083; two files share 085; 072 never applied)

Applied state per README: all applied through 191 except 049 (HELD, destructive: drops `peak_week_plans`, still read by the client), 072 (superseded, content shipped in 118), and 150 (RETIRED, never to be run). 155 applied 2026-09-26. 156-159 applied 2026-09-04/05. 160-175 applied 2026-09-07 to 2026-09-12. 176-183 applied 2026-09-24. 184-185 applied 2026-09-26 13:49/13:50 UTC. 186 2026-09-26 18:44. 187 2026-09-27 15:59. 188 2026-10-05 11:14. 189, 190, 191 applied 2026-10-08 10:40, 10:45, 11:16 UTC. These dates are the README's claims; I did not query the live database.

| Domain | Migrations | Substance |
|---|---|---|
| Core profile and schema foundations | 001-010, 012, 018, 021, 024, 045, 066, 094, 112, 055 | profile columns, beta flag, RLS hardening (005, 007), composite PKs `(user_id, id)` (018, 021, 024), `column_updates_at` merge map (045), `sex` (094), allergen excludes (112), diet preference (055), billing period (066) |
| Account deletion and GDPR | 003, 006, 008, 025, 039, 062, 069, 096, 097, 098, 133, 154 | `delete_user_data` RPC iterations to cover every table (Art 17 completeness), `account_deletions_log` (039) with salted-hash email (097), deletion sweeper (098), auth-user FK cascade (069), removal of mis-transmitted privacy pref rows (133) |
| Sync completeness and conflict | 010, 012, 046, 047, 060, 090, 118, 134, 135, 140 | updated_at plus touch triggers, soft-delete tombstones (046, 090), refuse-stale-write triggers (047, 060, 134, 140), `coach_outputs` week unique (135), recipes/workouts schema-drift fix incl. readiness columns (118) |
| Food and nutrition | 015, 016, 020, 021, 022, 023, 028, 048, 051, 052, 054(sets), 057, 059, 086, 087, 090, 109-112, 114-116, 138 | food entries, bulk sync RPCs (`food_sync_push`, `food_library_pull`), custom foods and barcode, favourites kind, frequents cache with nightly pg_cron, daily water reconcile fix (052), numbered meal slots (057, 059), meal plans (086), 27 UK-NRV micronutrient columns (109, 116), per-day target offsets (110), goal and protein approach (111), weight state and eaten_at (114, 115), food swaps (138) |
| Training and coaching | 054, 072(superseded), 091, 113, 129, 131, 132, 136, 137, 139, 141-149, 151, 152, 158, 159, 188, 189 | unilateral reps, exercise type, routine position, mesocycle deload week and block ledger, planned muscle volume provenance, exercise intent / swaps / slot defaults, session resolutions (140), effective-maintenance memos (141), load semantics (143), capability constraints and effects (145, 146, 147 consent, 148 demand ontology, 149, 151, 152), circuit columns (158, 159), `programmes.plan_facts` (188), `workout_sets.entry_typed` (189) |
| ED safety and telemetry | 017, 027, 182, 180 | `ed_pattern_flags` table and telemetry (017), rapid-loss telemetry (027), ED-flag cloud push RPC (182), server-side ED/calm withhold on consistency (180) |
| Telemetry allow-list | 022, 027, 029, 032, 034-038, 040, 041, 043, 063, 073-080, 084, 085a, 093, 099, 101, 103, 104, 156 | repeated re-issues of `record_engine_telemetry`; 156 holds the complete allow-list (87 earlier names plus 18 funnel events); client catalogue `src/lib/telemetry/events.js` has 84 events; capability telemetry deliberately never emitted (migrate_150 RETIRED) |
| Notifications and push | 044, 053, 085b, 125 | `notification_preferences` (category CHECK widened in 085b, 125 to the full client enum, 160/161 for community categories), `device_push_tokens` (053) |
| Tier, trial and billing (dormant product) | 030, 031, 033, 042, 065, 067, 068, 070, 071, 095, 108, 157 | tier infrastructure, cascade workers, two-tier consolidation, `upgrade_tier_for_user` for webhooks, 14-day trial, self-grant fixes, trial ledger against delete-and-restart abuse, founder Pro ledger, cascade pg_cron job unscheduled (157) |
| Training partners (retired) | 081, 092, 100, 102, 105, 106, 107, 155 | pairs, signals, cheers, shared blocks, safety consent, win cards; 155 cheer date rule |
| Community | 160-165, 170-178, 180, 181, 183-187, 190, 191 | 160 core schema (14 tables, 41 RPCs, rules, moderation, consent type `community_visibility`); 161 connections, messaging, training-profile bands, rules v2; 163 place and finder; 164 gap closure (retired shared programmes, quiet hours, follower lists); 165 boards, consistency counters, groups; 166/167/169 production hotfixes (read-only transaction from STABLE gym functions, `community_board` alias syntax); 170 disciplines, profile card consistency fields; 171 friends-trained-today count for widget; 172 PR count; 173 handle suggestion; 174/175 minor fail-closed and rules v3; 176 closed groups out of lists; 177 notify recipients; 178 `note` post kind; 180 consistency server gate; 183 revoke unused RPCs; 184-186 sharing default ON, flip existing, never on unasked; 187 accept `everyone` visibility; 190 feed scopes and sort; 191 presence, group chat, challenges, invite decline |
| Gym directory | 162, 163, 167, 168, 181 | 7 tables, 11 RPCs, volatility fix, finder relevance fix, moderator lists |
| Marketing HQ and web | 120-124, 126-128, 144 | waitlist, admin and content/ledger/metrics tables, retention email loop and opt-out, scan calibration events (126, 127), App Review seeded accounts (128) and reset (144) |
| Security hardening | 061, 088, 117, 119, 130, 152_p0, 153, 179 | see 2.3 |

Notes on migration hygiene (OBSERVED): every migration is meant to be additive and idempotent with a header (purpose, applied status, safe to re-run, rollback); 166 is recorded as SUPERSEDED because its diagnosis was wrong (README row 166: "an inference stated as fact"), 167 is the real fix. 174 Part 2 was rolled back to `SELECT 2` as a stopgap on 2026-09-12 and fixed durably by 175 (README row 436). Local SQLite schema migrations run by `PRAGMA user_version` in `src/lib/database.js` (number of local versions: NOT COUNTED; comments reference local schema v73, v77, v80/v81).

### 2.5 Operating model for applying migrations (OBSERVED, README + CLAUDE.md)

Cloud migrations are Claude-run through a Supabase connector since 2026-07-10, gated on the founder's exact phrase "run against production" per batch. Method: file split into chunks (<=6,000 bytes), inserted into scratch table `public.claude_apply_scratch`, md5 verified, executed inside a DO block that re-checks the checksum, tracking row into `claude_schema_migrations`. Alternative: `apply-named-sql.yml` (manual dispatch from main, names migrations and a seed dir; needs `SUPABASE_ACCESS_TOKEN`; the 2026-09-10 run for 170 failed with 401 and the apply went through the connector instead). `deploy-migrations.yml` walks all unapplied files and is manual only. Project ref in docs: `sujrylzzxcqxxfygptns` (a public project ref also visible in `public/u/index.html`).

### 2.6 Edge functions (supabase/functions, OBSERVED)

| Function | Lines | Purpose | Auth / JWT | Triggered by | State |
|---|---|---|---|---|---|
| `community-notify` | 1,022 | Server half of every Community push. Proves the action happened (finds the row the caller says they wrote, actor equals caller, <10 min old), block / mute checks, preference category, quiet hours, fail-closed ED-flag read, 15 min collapse for message and group_message, builds copy with no content, calls `send-push` with service role. Version 5 live per README (deployed 2026-10-08 11:23 UTC, `verify_jwt` true). | User JWT; derives actor from it; uses service role internally | Client `invokeCommunityFunction('community-notify')` after follow, request, reaction, comment, connect, message, group events | LIVE |
| `community-public` | 359 | Anonymous read-only window onto Community for the static share pages. Kinds `profile` (`h`), `post` (`id`), `group` (`id`); `programme` returns 404 (retired, line 215). Builds responses field by field from explicit allow-lists, returns 404 not a partial record for: minor creator, inactive account, non-public profile, hidden content, non-public post. Adds `preview {title, description}` for meta tags (Stage 3 3f). Version 4 live per README, `verify_jwt` off. | None (anon GET); service role inside | Browser fetch from `public/u|s|g/index.html` | LIVE |
| `send-push` | 217 | Server fan-out via Expo push API to a user's `device_push_tokens`; prunes `DeviceNotRegistered` tokens. | Service-role bearer required, constant-time comparison; gateway JWT verification on | Called by `community-notify`, `partner-cheer`, `play-billing-rtdn` | LIVE (internal) |
| `delete-account` | 191 | GDPR Art 17: verifies caller JWT, calls `delete_user_data` as the user, then deletes `auth.users` with the service role. | User JWT, gateway verification on | Settings delete account | LIVE |
| `partner-cheer` | 237 | One-tap cheer to a training partner; inserts as caller, once per UTC day, fail-closed ED flag check, then `send-push`. | User JWT | No client caller (section 1.9) | DORMANT, still deployable |
| `play-billing-rtdn` | 622 | Google Play Real-Time Developer Notifications: verifies via Play Developer API, maps notification types to `upgrade_tier` (purchase, expire, revoke, grace, pause), sends payment-failure push. | Google Pub/Sub OIDC, deployed `--no-verify-jwt` | Google Pub/Sub | DORMANT in product terms (no purchases possible); deployment state NOT VERIFIED |
| `app-store-verify` | 144 | Client-submitted StoreKit 2 JWS verified against Apple's App Store Server API; grants Pro to the `appAccountToken` user. | User JWT, verification on, binds token to caller | iOS purchase flow (unreachable) | DORMANT; needs APP_STORE_* env vars |
| `app-store-notifications` | 236 | Apple Server Notifications V2 handler; re-fetches authoritative status; writes tier via `upgrade_tier_for_user`. Fails closed 401 until env vars set. | Apple JWS verification, `--no-verify-jwt` | Apple | DORMANT; may not be deployed or configured |
| `_shared/boundedJson.ts` (+ test) | | body-size bounded JSON parser used by functions (guard `edgeBodyLimits.guard.test.js`) | | | support |

Deploy: `.github/workflows/deploy-functions.yml` manual dispatch, choice list send-push, play-billing-rtdn, app-store-verify, app-store-notifications, delete-account, partner-cheer, community-notify, community-public, all. `community-notify` v5 was deployed 2026-10-08 through the connector's deploy tool instead (README), source compared and identical per README (md5 recorded). Whether the other functions' live versions match the repo: NOT VERIFIED.

### 2.7 Supabase README status block (what is applied / HELD) (OBSERVED, claims)

- Applied: 001-048, 050-071 (except 072), 073-154, 155-191. HELD: 049 only. RETIRED: 150. Superseded: 072, 166.
- Pending for production: nothing except 049 (README line 615).
- Drift: README line 371 prose names `community_presence` and `community_challenges` as new tables from 191, but `migrate_191` creates `community_group_messages`, `community_group_challenges` and `community_challenge_entries` and adds `training_since` / `show_training_now` columns on `community_profiles` (grep of `CREATE TABLE` in the file; zero matches for `community_presence`). The README's own prose is therefore inconsistent with the file. Low-severity documentation drift.
- Leftover scratch table `public.claude_apply_scratch`: README says it could not be dropped after the 189-191 apply (connector refuses DROP non-interactively), "RLS on, no client grants", to be dropped at the next interactive apply.
- README opens with "Files in this folder: 132" and "applied ... 001-131" in the 2026-08-10 block (stale); later blocks supersede it. The real count now is 189 files (OBSERVED `ls`).

### 2.8 Edge/cron

- pg_cron: `refresh_food_frequents()` nightly (migrate_051); `cascade-advance-due-users` unscheduled by 157 (verified by README). Deletion sweeper (098): schedule mechanism NOT TRACED.
- Weekly GitHub Action `refresh-off-snapshot.yml` (cron `0 3 * * 0`) rebuilds the Open Food Facts UK snapshot and uploads it to Supabase (scripts/seed/buildOffSnapshot.js, uploadOffToSupabase.js).

---

## PART 3. PAYMENTS (DORMANT)

### 3.1 State (OBSERVED)

- `src/lib/proGate.js` line 43: `export const FULL_ACCESS_FOR_ALL = true;` with `PRO_BETA_ACTIVE` as an alias. `isPaidTier()` returns 'pro' for everybody while true. Founder decision D137, 2026-09-03.
- `src/lib/payments/` (11 modules + `__tests__` 15 files): `index.js` is the inactive boundary. When the flag is true, `cascade.{startCascade,payAt,confirmPurchase,reconcilePaidEntitlement}`, `playBilling.{initialise,ensureBillingForUser,purchasePackage,restorePurchases,getCustomerInfo}`, `restorePurchases` and `handlePotentialLapse` are replaced with frozen `{ok:false, error:'billing_disabled'}` no-ops (index.js 33-80). Pure selectors (`catalogue`, `selectOfferToken`, `selectDisplayPrice`, `stageOf`, `trialEndsAtMs`) pass through.
- Modules: `catalogue.js` (SKUs `pro_monthly` GBP 1.99/month after 2026-08-18 reduction, `pro_annual` GBP 19.99/year; comment says user-facing prices always come from the store; 7 day intro offer configured per store), `playBilling.js` (react-native-iap wrapper, provider contract, stub default), `cascade.js` (trial state machine wrapping `start_cascade` / `upgrade_tier` RPCs), `restore.js`, `lapseDetect.js` (arms win-back on authoritative lapse), `winbackState.js` (churn episode bookkeeping), `pendingCascade.js` (trial-grant retry queue, FQ-6.1), `freeConversion.js` (one-shot migration of devices that ran the trial build: cancels cascade pushes, clears cached trial state), `storeErrors.js`, `usePlayPrices.js`.
- Unregistered screens, on disk: `src/screens/ProUpgradeScreen.js`, `CascadeGateScreen.js`, `SubscriptionScreen.js`, `SubscriptionPolicyScreen.js`, plus `paywallExcerpts.js`. RootNavigator comments at lines 189-191, 458, 484, 602, 650, 720 state they are removed or dormant; none appears in `Stack.Screen` lists I read. Components still on disk and importing the payments barrel: `ProGate.js`, `BillingPeriodSelector.js`, `CancelReasonSheet.js`, `PostLapseSheet.js`, `TierComparisonStrip.js` (grep). Also imported by `src/store/useAppStore.js`, `src/lib/sentry.js` (the grep match for `lib/payments` in sentry.js: purpose NOT TRACED).
- The store clamps every tier write to full access (CLAUDE.md); guards pin the inverse: `proScreenGating.guard.test.js`, `lapsedReadOnly.guard.test.js` (no tier-based read-only path may survive), `rootNavigatorBillingLifecycle.guard.test.js`.
- Cloud: trial and tier columns on `users_profile` protected by trigger (070); `upgrade_tier` may only downgrade from the client (067); `upgrade_tier_for_user` is service-role only (042); `start_cascade` (030, 065, 095); cron job unscheduled (157). Edge functions `play-billing-rtdn`, `app-store-verify`, `app-store-notifications` (2.6).
- Dependency: `react-native-iap` 15.3.1 in package.json (per CLAUDE.md; not re-read in package.json lines I viewed). Product IDs `pro_monthly` / `pro_annual` immutable.

### 3.2 What re-arming would take (INFERRED from code comments and structure; not a plan)

1. Founder decision (billing price changes and any billing change are founder-gated per CLAUDE.md; "state exactly what and why, wait for proceed").
2. Flip `FULL_ACCESS_FOR_ALL` to false in `src/lib/proGate.js`. The barrel then exposes the real cascade and billing implementations.
3. Re-register the four dormant screens in the navigators and re-add entry points (upgrade, subscription, policy, cascade gate); re-apply `withProGuard` / `withReadOnlyProGuard` wrappers from `ProGate.js` to formerly Pro screens (they are plain registrations now; the list of Pro-only screens is in `proScreenGating.guard.test.js` header: food diary, barcode, meal suggestions, targets, macros, check-ins, Precision Coaching, division plans, progress photos history).
4. Re-schedule cascade notifications and un-pause the pg_cron job (157 rollback is one `cron.schedule`).
5. Store setup (founder-side): products and offers in Play Console and App Store Connect; Pub/Sub topic and push subscription for RTDN; App Store Server Notification URLs; `APP_STORE_*` and `APPLE_ROOT_CA_CERTS_BASE64` env vars; deploy the three billing functions with the right JWT flags.
6. Verify store price localisation requirement (`usePlayPrices` returns null until the store answers, no hardcoded fallback).
7. A written test plan for purchase / restore / entitlement / cascade flows (`docs/rules/billing.md` required by CLAUDE.md).
8. Existing users will have had no trial; `freeConversion.js` already stripped residue, so a re-arm needs a decision about what existing free users get. Not designed anywhere I read.
Risk to name: ED-safety guardrails are tier-blind by constitution; a re-arm must not make them consult tier.

---

## PART 4. OBSERVABILITY AND TELEMETRY

| Piece | What it does | Files | Status |
|---|---|---|---|
| Sentry | Lazy-wrapped `@sentry/react-native`; init only if `EXPO_PUBLIC_SENTRY_DSN` is set and matches a DSN regex; `tracesSampleRate` 0.05 in production (1.0 in dev), `sendDefaultPii:false`, `maxBreadcrumbs:150`, session tracking on. `beforeSend` / `beforeBreadcrumb` call the scrubber and FAIL CLOSED (drop the event if the scrubber throws). Exports `captureError`, `captureWarning`, `addBreadcrumb`, `setSentryUser`. | src/lib/sentry.js (351) | LIVE (BACKGROUND) |
| Scrubber | `SENSITIVE_KEY_PATTERNS` (weight*, kcal*, protein*, carbs*, fat*, fibre*, bf_pct, body_fat*, ffm*, fm*, plus others), `SENSITIVE_VALUE_SUBSTRINGS` (weight_log, food_entries, custom_foods, body_composition_log, photo paths, ed_pattern_flags and signals), recursion depth bound 6. Locked in PRIVACY_CONSENT_LOCKED.md; tests in `src/lib/__tests__/sentryScrub.test.js`. | src/lib/observability/sentryScrub.js (326) | BACKGROUND |
| Network noise filter | Expected offline errors (RN fetch, iOS "Load failed", NSURLError, ECONNRESET and others) become breadcrumbs, not issues. Sentry triage 2026-09-06 (VOLYUME-2F/2D/2C/28/2H/2J/31). | observability/networkNoise.js; guards `sentryNoisePaths.guard.test.js`, `sentryFloodGuard.test.js` | BACKGROUND |
| Community refusal filter | `isExpectedCommunityRefusal(message)` demotes deliberate RPC refusals to breadcrumbs (Sentry VOLYUME-36). | community/transport.js 87-90, used by observability.js | BACKGROUND |
| Instrumentation front door | `instrumentStore` (breadcrumb per Zustand action + duration), `instrumentNavigation` (screen-view breadcrumbs), `instrumentSupabase` (breadcrumb per table/op). | src/lib/observability.js (785) | BACKGROUND |
| errorLog | `logError/logWarn/logInfo(scope, ...)`; ring buffer in AsyncStorage (MAX_ENTRIES), forwards to Sentry; viewable in Settings, Debug logs (`DebugLogScreen.js`); `VERBOSE_LOGGING` constant for info. Coexists with a single-slot `@volyume_crash_log`. | src/lib/errorLog.js (368) | LIVE |
| Product telemetry | `track(event, payload)` validates against `ALLOWED_EVENTS` (events.js, 84 `{name:...}` entries with panels and `deferred` flags), writes local SQLite `engine_telemetry`, debounce-flushes (5 s) to RPC `record_engine_telemetry` whose allow-list is mirrored in SQL (migrations list above). `engineTelemetry.js` is a back-compat shim. Consent posture: legitimate interest, opt-OUT (default enabled); `setTelemetryEnabled` is flipped by the store from the saved privacy pref (`useAppStore.js` 2498-2499); disabled means nothing persisted or pushed. A source-scan test requires every non-deferred catalogue event to have a `track()` call. | src/lib/telemetry/{events,transport,firsts,index,sentryBridge}.js; src/lib/engineTelemetry.js | LIVE (BACKGROUND) |
| Capability telemetry | Deliberately NOT emitted (Q4 ruling 2026-08-21, no-outside-party law); migrate_150 retired. | events.js comment | n/a |
| Sync telemetry | `sync_run`, `sync_conflict_resolved`, lifecycle events (app_cold_start / foregrounded / backgrounded), error marks for network-only runs. | sync/telemetry.js | BACKGROUND |
| Consent plumbing | Article 9 `healthConsent` in the store; `src/lib/consent/` has `capabilityConsent.js`, `pendingConsent.js` (queue on failure, flush inside the sync runner); RPCs `record_health_consent`, `record_capability_consent` (147), `consent_log` insert-only via RPC (119); Community join writes `community_visibility` consent (160). Screens: `Article9ConsentScreen`, `GoalLockConsentScreen`, `SettingsPrivacyScreen`, `PrivacyPolicyScreen`. Consent withdrawal telemetry (041). | src/lib/consent; src/screens | LIVE |
| Whether Sentry/crash reporting respects the telemetry opt-out | NOT TRACED. I found `setTelemetryEnabled` gating only the product telemetry; `initSentry` conditions I read depend on DSN only. |

Other: Android release builds upload Sentry symbols; both build workflows carry an `allow_unsymbolicated` DANGER input (build-android.yml 18-21, build-ios.yml 62-65). `release observability` pinned by `releaseObservability.guard.test.js`.

---

## PART 5. BUILD, RELEASE AND QUALITY

### 5.1 eas.json (OBSERVED)

CLI `>= 10.0.0`, `appVersionSource: remote`. Profiles: `development` and `development-device` (dev client, internal, `APP_VARIANT=development`), `preview` (internal APK, `APP_VARIANT=preview`), `production` (Node 20.19.4, `autoIncrement: true`, `EAS_SKIP_AUTO_FINGERPRINT=1`, `RCT_USE_PREBUILT_RNCORE=0`, `RCT_USE_RN_DEP=0`, Android `app-bundle`), `e2e-simulator` (iOS simulator + Android APK). Submit: production Android `track: internal` with `serviceAccountKeyPath ./google-play-service-account.json` (a path; I did not open it or any secret file). app.json: `newArchEnabled: true`, runtimeVersion block present (contents not read), iOS bundle id `app.volyume`, Android package `app.volyume`. Version bump rule (CLAUDE.md): minor bump in package.json, package-lock.json, app.json plus a WhatsNewSheet entry and `privacyTruth.guard.test.js` extension before a build is handed over.

### 5.2 GitHub workflows (OBSERVED; all on:)

| Workflow | Trigger | Purpose |
|---|---|---|
| main-ci.yml | push and pull_request on branches, workflow_dispatch | Jobs: Jest (`npx jest --runInBand --ci`, Node 22.22.2, uploads `jest.log`), ESLint (`npm run lint`), `npm run typecheck`, `npm run check:imports`, Expo Doctor (job names per file; Expo Doctor job body not read) |
| identity-invariant.yml | push and pull_request | runs `scripts/check-identity-invariant.sh` (no anonymous mode / no local-user migration paths) |
| build-android.yml | workflow_dispatch only (founder order 2026-08-28) | signed APK + AAB on a GitHub runner: `force-sqlcipher-android.cjs`, `expo prebuild`, Gradle, Sentry symbols, inputs `architectures` (default armeabi-v7a,arm64-v8a) and `allow_unsymbolicated`; main-ref guard |
| build-ios.yml | workflow_dispatch only; job `if: github.ref == 'refs/heads/main'` | EAS iOS build and optional TestFlight submit (`submit` input), `scripts/ci/resolve-asc-app-id.mjs`. The header comment still says "push to main builds and submits automatically" but the `on:` block below it is manual only: stale comment (OBSERVED 50-58) |
| deploy-functions.yml | dispatch | deploys Supabase edge functions by choice, JWT flags per function |
| deploy-migrations.yml | dispatch | walks every unapplied migrate file |
| apply-named-sql.yml | dispatch | applies a named list plus seed dir via Management API, records in `claude_schema_migrations` / `claude_seed_files` |
| deploy-pages.yml | dispatch, main only | deploys `public/` to GitHub Pages (also builds something with Java: step lines 64-121 NOT READ) |
| maestro-e2e.yml | dispatch | two Maestro flows (`.maestro/flows/01-article9-consent.yaml`, `02-workout-backgrounding.yaml`) on an Android emulator against a prior build-android APK |
| screenshot-net.yml | dispatch | emulator screenshot net (`10-screenshot-net.yaml`) |
| refresh-off-snapshot.yml | cron weekly Sunday 03:00 UTC + dispatch | rebuild and upload the Open Food Facts UK snapshot |
| export-upload-certificate.yml, print-signing-sha.yml | dispatch | Play upload key certificate export and signing SHA print (secrets handling; contents not read) |
Builds cost money and are founder-run only (CLAUDE.md); nothing in the repo auto-builds on push (every build workflow is dispatch-only). `workflowTrustBoundary.guard.test.js` pins workflow trust boundaries.

### 5.3 `release:check` and scripts in package.json (OBSERVED)

- `npm test` = `cross-env TZ=Europe/London jest`. `npm run lint` = `eslint . --max-warnings 0`. `typecheck` = `tsc --noEmit` (JSDoc check; JS project). `check:imports` = `scripts/check-imports.cjs`: relative imports must resolve and named imports must exist in the target (dependency free; catches hallucinated symbols).
- `release:quality` = `npx tsc --noEmit --strict && npm run lint && npm run check:imports && npm test -- --runInBand`. `release:check` = `npm ci --legacy-peer-deps --ignore-scripts && npm run release:quality && npm run release:audit`. `release:audit` = `scripts/release-audit-report.cjs` (reporting only npm audit; deliberately non-blocking after repeated APK delivery failures).
- Other: `verify:android:16kb` (ELF page size), `verify:android:sqlcipher`, and seven `progress-scan:*` calibration scripts.
- Note: main-ci.yml runs typecheck without `--strict` while `release:quality` uses `--strict`; whether strict passes in CI is not exercised by CI itself (INFERRED from the two commands; NOT run).

### 5.4 ESLint (eslint.config.js, 390 lines, OBSERVED)

`--max-warnings 0`, so warnings (react-hooks/exhaustive-deps, a11y descriptors, no-unused-vars) fail lint. Errors: `no-undef`, rules-of-hooks, react-native-a11y role / state / live-region validity. `no-restricted-syntax` (three blocks: lines 201-253, 297-333, 354-364) bans the em dash (U+2014) in user-facing strings and templates and "machine-tell marketing words" (comment at 243), with messages quoting the CLAUDE.md voice rule. Other restricted syntax in those blocks: NOT ENUMERATED.

### 5.5 Test suite shape (OBSERVED counts via `find`)

- 1,595 `*.test.js` files outside node_modules. Jest config in package.json: `testEnvironment: node`, `testMatch **/__tests__/**/*.test.js` and `**/tests/**/*.test.js`, `babel-jest`, asset stubs, mocks in `__mocks__/`, `jest.setup.js`, `jest.globalSetup.js`; TZ pinned to Europe/London (UK-local week starts Monday).
- Top directories by count: `src/lib/__tests__` 575; `src/screens/__tests__` 325; `src/__tests__` 128 (+13 in `coachValidation`); `src/components/__tests__` 116; `src/lib/food/__tests__` 74; `src/lib/community/__tests__` 34; `src/lib/sync/__tests__` 33; `src/lib/notifications/__tests__` 31; `src/components/community/__tests__` 25; `src/lib/recovery/__tests__` 24; `src/lib/payments/__tests__` 15; `src/lib/capability/__tests__` 15; `tests/simulator/scenarios` 12 (coach-engine scenario simulations: aggressive cut supervised/unsupervised, bulk, plateau, rapid-loss correction, recomp, red-S trajectory, returning user, stalled lift, straight cut, noisy logger).
- 378 files named `*guard*.test.js` (src, scripts, tests); 763 test files use `readFileSync` (source-level regexp assertions over the codebase).
- Source-level guards that pin founder rules (examples, OBSERVED file names and headers):
  - Community privacy and architecture: `community.privacy.guard` (no body, food, scan, coaching, wellbeing reads in community lib), `community.rpcOnly.guard`, `migrate160-187 guards` (SQL text must keep RLS-on / no-policy / SECURITY DEFINER / search_path), `community.transport.guard` (one Supabase door), `community.copy.guard` (Community is never programme sharing), `community.sharingMirror.guard`, `community.stage3Client.guard`, `communityPublic.preview.guard`, `communityNotify.groupMessage.guard`, `communityTab.guard`.
  - Consent and safety: `healthConsentRouting.guard` (transient failure resolves null, never false), `onboardingConsentRouting.guard`, `edFlagFailClosed.guard` (open-ED-flag reads on weight / food / notification / share surfaces fail closed), `syncConsentTriggerRouting.guard`, engine floor tests (`ffmFloor*.test.js`, `edFloorSeams.f3.test.js`, `weeklyCoach.ffmFloor.test.js`, `progressScanSafetyFloorIsolation.test.js`).
  - Fully free product: `proScreenGating.guard`, `lapsedReadOnly.guard`, `proUpgradeC3.guard`, `rootNavigatorBillingLifecycle.guard`, `trialStart.flow.guard`.
  - Identity: `scripts/check-identity-invariant.sh` plus regression tests.
  - Onboarding: `proOnboarding.sexGate.test.js` (per CLAUDE.md; not re-read).
  - Voice and claims: `marketingClaimsGuard` (R2 medical-device wording blacklist, population-claim terms, readiness matrix all NO), `plainEnglish.coachCopy.guard`, `weeklyCoach.voice.snapshot`, `privacyTruth.guard` (extended each version).
  - Craft: `themeTokens.guard`, `e8FlashList.guard` (lists render via FlashList), `silentCatchRatchet.guard` (count of unexplained silent catches only ever goes down), `lazyScreens.guard`, `accessibilityDesign.guard`, `p9Talkback.guard`, `splash*` guards, `tabIcons.guard`.
  - Build / supply chain: `workflowTrustBoundary.guard`, `campaign7.releaseConfig.test.js`, `nanoidAdvisory.guard`, `edgeBodyLimits.guard`, `effectiveSupabaseHarness.guard`.
- The engine determinism / no-AI rule: I did not find a guard named for it in the lists read; CLAUDE.md asserts it. NOT VERIFIED that a test mechanically forbids LLM imports.
- Not runnable here: I did not run lint or tests (read-only brief); no counts of pass/fail.

### 5.6 Native code: `plugins/` and `modules/` (OBSERVED)

- `plugins/withVolyumeWidget.js`: Expo config plugin creating the iOS WidgetKit extension target `VolyumeWidget` at prebuild (copies Swift sources from `modules/live-activity/widget` and `.../ios`, generates Info.plist and entitlements, registers app-extension target, embeds the appex). Hosts a Live Activity and a home / lock-screen widget (`VolyumeHomeWidgets.swift`) mirroring Android's two widgets (`src/widgets/widgets.js`). Uses App Group `group.app.volyume.widget` (needs the capability on both App IDs; comment says founder must enable it in the Apple Developer portal).
- `modules/live-activity` (iOS, with `widget/` Swift sources): Live Activity for an active workout and the `writeWidgetSnapshot` bridge (`src/lib/widgets/storage.js`).
- `modules/rest-timer-live` (Android): rest timer live notification / foreground service.
- `modules/progress-scan-image` (Android + iOS): native image handling for the Progress Scan feature.
- `src/widgets/`: Android home-screen widget definitions and task handler (`widgets.js`, `widgetTaskHandler.js`); `src/lib/widgets/` (`friends.js`, `snapshot.js`, `storage.js`, `writer.js`).
- `scripts/force-sqlcipher-android.cjs` and `android-sqlcipher-diagnostic.init.gradle` force SQLCipher on Android; `verify-android-sqlcipher.cjs` and `verify-android-elf-page-size.cjs` check the built artefact (16 KB page size).
- Managed Expo workflow: `ios/` is gitignored (plugin comment), generated at prebuild.

### 5.7 `scripts/` purposes (OBSERVED names + headers where read)

| Script / dir | Purpose |
|---|---|
| check-imports.cjs | import / export integrity gate (see 5.3) |
| check-identity-invariant.sh | CI guard for identity law |
| release-audit-report.cjs | non-blocking `npm audit` summary |
| force-sqlcipher-android.cjs, android-sqlcipher-diagnostic.init.gradle, verify-android-sqlcipher.cjs, verify-android-elf-page-size.cjs | Android SQLCipher and 16 KB page-size build integrity |
| run-progress-scan-*.cjs (7), render-share-card.cjs, make-dark-wordmark.cjs | Progress Scan calibration/replay/sensitivity reports; share card and brand asset rendering |
| adapted-setup-coverage.mjs, capability-coverage-registry.mjs, demand-coverage-report.mjs, scenario-coverage.mjs, e3-search-harness.cjs | coverage reports for the capability / exercise-demand / scenario / search systems |
| certification/ (copy-scan.mjs, route-graph.js, search-harness.mjs) | audit tooling: copy scanning, navigation route graph, search harness |
| ci/ (resolve-asc-app-id.mjs + test, run-progress-scan-replay.test.mjs) | iOS ASC app id resolver for the TestFlight submit |
| codemods/ (add-max-font-multiplier.js, use-house-text.js) | accessibility text-size migration codemods |
| exercise-library/ (apply-cues, audit-instructions, convert-legacy, export-seed, gap-analysis, validate-corpus, loadSeed ...) | exercise library authoring pipeline |
| gyms/ (build, classify, dedupe, geocode, normalise, run-all, seed-sql, sources/*) | UK gym dataset pipeline (11 MB output in `data/gyms/`) |
| seed/ (buildOffSnapshot.js, buildCofidSnapshot.js, uploadOffToSupabase.js) | Open Food Facts UK and CoFID food snapshots |
| security/ (run-effective-supabase-matrix.cjs, scan-secrets.cjs, fixtures) | hostile RLS matrix for an isolated project; secret scan (I did not run or read secret content) |
| paper-render/ | renders screens to static HTML screenshots with a persona and mocked store |

### 5.8 `web/`, `public/`, `marketing/`, `data/`, `.claude/` (OBSERVED)

- `public/`: the live static site deployed to GitHub Pages (volyume.app via `CNAME`): `index.html`, `get/`, `articles/` (3 articles), `privacy`, `support`, `survey`, `app-map/`, `auth/callback` and `auth/confirm`, `email/unsubscribe`, share pages `u/ s/ g/ p/ partner/`, `.well-known/` (AASA and assetlinks), screenshots.
- `web/` (pnpm monorepo, v0.1.0): `web/apps/web` is a Next.js 15 app with `vercel.json`: logged-out landing ("Less thinking. More lifting."), sign-in (`SignInForm`), auth callback route (with a source guard test), and a signed-in shell: dashboard (ThisWeekCard, ActivePlanCard, NutritionStrip, CoachingStrip), plan, progress (prs, body, volume, lifts), coaching review, account, settings (accessibility), and an internal `marketing` admin area (channels, content pipeline, ledger, reports) backed by the `marketing_*` tables. Packages `@volyume/supabase`, `@volyume/ui`. Status: whether it is deployed on Vercel and reachable: NOT VERIFIED. INFERRED: it is a read-oriented web companion plus the Marketing HQ dashboard, not linked from the mobile app (no grep for it in `src/` performed).
- `marketing/`: `FACT-BASE.md` (single source of verified product facts, with corrections noting cardio logging and the plate calculator never shipped or were removed), `parts/` (training, nutrition, positioning), `hq/` (OPERATING-CHARTER, CLAIMS-STANDARDS, ADVERTISING-PRINCIPLES, AUDIENCE, CHANNEL-INVENTORY, CONTENT-CALENDAR, DASHBOARD-SPEC, DATA-SCHEMA, GROWTH-LEDGER, ROADMAP-0-TO-1M, RUNBOOK, FOUNDER-SETUP-PACK, copy-library, playbooks, render, reports, site-staging, assets; 3.5 MB). Marketing HQ cloud tables from migrations 120-124.
- `data/`: `gyms/` (gym dataset, 11 MB) and `audit/null-axis-annotations.json`.
- `.claude/`: `settings.json` wires two PreToolUse hooks: `edit-gate.sh` (for Edit / Write / MultiEdit / NotebookEdit: edits under `src/` or `supabase/` are BLOCKED unless `.claude/edit-gate` names a real spec file and quotes verbatim lines grep-verified from it) and `agent-tier-guard.py` (blocks Agent / Task / Workflow dispatch that omits an explicit opus / sonnet / haiku model). `.claude/agents/`: seven marketing roles (marketing-director, content-writer, compliance-reviewer, creative-designer, community-manager, growth-analyst, aso-analyst). `.claude/skills/`: `impeccable` (UI craft), `marketing-claims-check`, `marketing-draft`, `marketing-ship-web`, `marketing-weekly`. Also `tests/simulator/`, `research/`, `audit/`, `docs/` at repo root; many root-level audit `.md` files are present (APPMAP.md, ARCHITECTURE.md, VOLYUME_DEEPMAP.md etc., treated stale per the brief).

### 5.9 Release posture summary

Android: founder-run `build-android.yml` produces signed AAB/APK; upload to Play internal track by `eas submit` config or manual. iOS: founder-run `build-ios.yml` (EAS build + TestFlight submit). Web: `deploy-pages.yml`. Backend: connector-applied migrations and function deploys on explicit founder phrases. CI on every push: Jest, lint, typecheck, imports, Expo Doctor, identity invariant.

---

## A) Cross-domain wiring

Consumes from other domains:
- Auth/session and Article 9 consent from the store (`healthConsent`, `user.id`) and `hasLiveSession` in `src/lib/supabase`: every Community call, every `syncAll`, and Sentry/telemetry rely on them.
- Workout domain: ActiveWorkoutScreen (presence start / finish, challenge logging), WorkoutSummaryScreen (ambient posts, share strip, PR list), `database.js` reads of completed-workout timestamps and exercise ids (trainingProfile, trainingConsistency), `getPRCountInWindow`.
- Wellbeing/ED domain: `usePhotoSuppression.js` (`readEdOrCalmSuppressed`) for every consistency, presence, challenge and Today-row gate; open ED flag read by `community-notify` and `partner-cheer`; `_community_ed_flag_open` server helper (migrate_180) reading the cloud `ed_pattern_flags` that `ed_flag_push` (migrate_182) now feeds.
- Profile/body domain: `user_body_profile` DOB (server minor check), pushed first on every profile write (`ensureBodyProfilePushed`).
- Notifications domain: preference categories, quiet hours, `device_push_tokens`, `send-push`.
- Navigation: `navigateCrossTab`, `heroZoomOptions`, linking config, `safeGetStateFromPath`.
- Theme/components: `src/styles/theme.js`, shared Button, EmptyState, FlashList.
Exposes to other domains:
- `hasUnseen` / `community.unseen` store flag to the tab bar; `communityMember` and share-strip state to the workout summary; friends-trained-today count to Today row and Android widget; Community profile existence to Today intro card; `COMMUNITY_RULES_VERSION` gate to every social write.
- Sync layer: `syncAll`, `scheduleSync`, `enqueueSyncOp` used app-wide; feature flags for push columns.
- Telemetry `track()` used app-wide; scrubber protects every Sentry send.
- Payments barrel exposes inert stubs to `useAppStore`, `ProGate` and dormant screens.
- Public pages and `community-public` expose a minimal allow-listed public face of Community to the web.

## B) Product-decision observations

1. Screen count: brief says 27 Community screens, code has 25 (`ls`). Not a defect, but any doc that says 27 is wrong. Evidence: `ls src/screens | grep -i community | wc -l` gave 25.
2. Partner remnants are a loose end. Cloud tables, a deployable edge function (`partner-cheer`), a local SQLite schema, a static page (`public/partner/index.html`) and a router rewrite remain with no feature behind them. Evidence: database.js 1506-1647, supabase/functions/partner-cheer, deploy-functions.yml choices, RootNavigator.js 947-956. Decision needed: when to retire server objects (needs a migration that deletes data; the README says "migrations are additive and never dropped") and whether to keep `partner-cheer` deployable (a live authenticated endpoint with no client).
3. Dormant billing is large and still deployable. Three billing edge functions, four unregistered screens, five components that import the barrel and 15 test files stay compiled. This is tested and guarded, but it is a surface that can mislead (e.g. `app-store-notifications` fails closed until env vars are set, so state of deployment is unclear). Evidence: payments/index.js, deploy-functions choices, RootNavigator dormant comments.
4. `ed_pattern_flags` is both `pull_only` in the sync registry and pushed by `pushEdPatternFlags` from the legacy path after migrate_182. A reader of `registry.js` alone would miss that the device now writes the cloud row. CLAUDE.md says no build carrying the push has shipped yet, so the server-side ED withhold (migrate_180) and edge ED gates are armed but have no cloud flags to read until such a build ships. Risk window: users on older builds can be shown consistency data server-side because the server has no flag to see. Evidence: registry.js, sync.js line 68, migrate_180 header, CLAUDE.md status paragraph.
5. Sharing is on by default for existing and new adult users, audience "everyone" (founder order 2026-09-26). Combined with 187 and the ambient auto-post, every finished workout becomes a public-audience post unless the person turns it off. The privacy receipt, Privacy screen and Join screen all surface it, and a minor defaults to off/followers. It is a deliberate decision, but it is the highest-exposure default in the app. Evidence: migrate_184/185/186 headers, `DEFAULT_SESSIONS_AUDIENCE='everyone'`, ambient.js.
6. README prose drift: 191 described with table names that do not exist (`community_presence`, `community_challenges`); README top blocks still say "132 files" and "applied 001-131"; the scratch table `claude_apply_scratch` is left in production awaiting an interactive drop. build-ios.yml header says push to main auto-builds; the trigger is dispatch only. gyms lib comment says location unavailable while `expo-location` is a plugin. These are documentation traps for any agent reading comments instead of code (D37 risk).
7. Community requires Article 9 consent although it carries no health data, so a person who declines or has not resolved consent cannot use Community at all. Product-fit question; probably intended as "one gate, no special cases" (INFERRED).
8. Group chat, DMs and presence use 20 second polling, no realtime. Fine for scale now; battery/network cost and perceived latency are open questions at larger scale. Group chat push is collapsed to one per 15 minutes per group per recipient.
9. Moderation capacity: a single seeded moderator (the marketing admin address), an in-app queue, auto-hide at 3 reports, and "no outside party" law (no paid moderators). Group chat and DMs are reportable; there is no visible SLA or audit cadence in code. Harmful body or eating content is prioritised server-side, which is a good safety design.
10. Duplicated surfaces: two places to set sharing (Training profile screen and Privacy panel), deliberately unified through `saveShareSessions`/`saveBandToggle`; Find people doors and Dimension pages overlap (gym and area cohorts); two entry points for Community from You and Settings. Low risk, but copy changes must touch all.
11. Telemetry is opt-out (legitimate interest) while health data requires opt-in consent. Sentry gating by that opt-out was not found. Evidence: telemetry/transport.js 31-40; sentry.js depends only on DSN.
12. Test suite is huge (1,595 files) and heavily source-regex based (763 files read source). That pins founder rules well but is brittle to refactors and cannot see database effective privilege; migrate_169's failure of every `community_board` call surviving the suite is the proof. The hostile RLS matrix script exists for an isolated project; no evidence it runs in CI.
13. Build/release automation is entirely manual dispatch, which matches the cost rule, but means CI (`main-ci.yml`) is the only automatic gate and it runs typecheck without `--strict` while `release:quality` uses strict. A release could pass CI and fail `release:check`.
14. `web/` Next.js app with a Marketing HQ admin area and a signed-in dashboard is not mentioned in CLAUDE.md architecture; its deployment status and its relationship to the "no PII to external services" and EU residency constraints (Vercel hosting) are not established in what I read. Product decision needed on whether this surface is real.
15. Gym directory depends on server-side seed data and a postcode-sector table; "Add a gym" fails `invalid_postcode` for an unseeded sector. Real coverage in production is unverified (the 11 MB local dataset was built; README says seed applied after 162).
16. Idle capability in Community lib worth knowing: `rules_outdated` re-accept flow, quiet hours for Community pushes, HOST row (follow the founder) with per-reader dismissal, Today intro re-offer once. These are growth levers already built.
17. Rate limits are strict for new accounts (3 posts a day, 30 follows, first 7 days); for a small network this may throttle early engagement. Evidence: limits.js.

## C) Not verified

- Live database and edge function state (I did not call the Supabase connector); all "applied" dates are README claims. Live function versions other than the README's `community-notify` v5 and `community-public` v4 are unknown.
- Bodies of migrations (only headers of 160, 161, 162, 174, 180, 184, 186, 190, 191 and the README rows were read); exact RLS policies per core table; RPC bodies.
- The `respected` sort algorithm; community-notify per-kind copy; push tap routing; PostCard / PostRow rendering per kind; ProgressStrip, PresenceBand, ChallengeSheet internals; WhatsNewSheet.
- Local SQLite schema version number and full local table list; `database.js` migrations beyond partner tables.
- Whether Sentry respects the telemetry opt-out; contents of `app.json` runtimeVersion block and plugin config beyond line search; `package.json` dependency list (react-native-iap version taken from CLAUDE.md).
- `scripts/` beyond the headers read; `.maestro` flows content; `docs/` (deliberately untreated as truth); `research/`, `audit/`, `modules/*` native source beyond file listing.
- `web/` deployment and use; `marketing/` content; `.claude/skills` content beyond names.
- I did not run lint or tests, and read no secret or env files (`google-play-service-account.json` is referenced by path in eas.json only).
- Counts of "screens that call getSupabaseClient directly outside Community" (the transport guard header says three exist: consent, account, dormant billing; not re-verified).
- Notification-tap routing for Community pushes; widget data refresh cadence; the deletion sweeper schedule.

---

## APPENDIX. Community lib module index and RPC catalogue (OBSERVED, from file headers and `callCommunity(...)` grep)

### Module index (`src/lib/community/`, 40 files)

| Module | Role |
|---|---|
| transport.js (241) | only Supabase door; three gates; error code mapping; `invokeCommunityFunction` for edge functions |
| validation.js (327) | length limits, handle regex and reserved list, style / goal / setting / discipline vocabularies, report reasons, SENSITIVE keys, post payload allow-lists, `cleanText` helpers |
| limits.js (111) | rules version 3, rate limits, new-account window, auto-hide threshold |
| keywordFilter.js (176) | shared blocked-terms list and folding; mirrored in SQL |
| restriction.js (60) | calm lines for restricted / suspended profiles, minor presence line, `respectFailureLine` |
| profile.js (580) | `loadMe` / cache, upsert, handle check and suggestion, follow / unfollow / respond / remove follower, block / mute, show gym / place, `setPlace`, `myStatus`, quiet hours, `leaveCommunity` |
| feed.js (406) | hub load with cache, scopes and sorts, discover, search, create / delete post, react, note, comments |
| posts.js (299) | the only payload builders (pr, session, block, milestone); reads device data inside the allow-list |
| ambient.js (331) | automatic session and PR posts with an offline queue |
| activity.js, unseen.js | inbox and the tab dot |
| connections.js (230), messages.js (220) | connect tier and DMs |
| groups.js (309), groupChat.js, groupChatState.js | groups and group chat |
| presence.js, presenceSession.js | training-now marker and the device half |
| challenges.js (193), challengeSession.js | session-count challenges and the logger half with queue retry |
| boards.js (139), respect.js (121) | ranked rosters and Respect-all |
| findPeople.js (434), rankPeople.js (160), reasons.js | discovery doors, client ordering, reason tokens |
| trainingProfile.js (769), trainingConsistency.js (527), bandShare.js, shareSessions.js | device-derived bands, share toggles, consistency counters, server sharing mirror |
| onboardingJoin.js (455) | onboarding gym step join path with per-account queue |
| earlyDays.js, hostDismissal.js, introReoffer.js, homeFriendsRow.js | early-days honesty rules, HOST row, Today intro re-offer, Today row line builder |
| links.js (219), notify.js (66), moderation.js (91), postTime.js, rulesSummary.js | share links, push hand-off, reports and queue, post time label, rules summary |

### RPC catalogue (names seen in `callCommunity(...)` calls, 94 distinct)

Profile and settings: `community_get_me`, `community_get_profile`, `community_upsert_profile`, `community_check_handle`, `community_handle_suggestion`, `community_leave`, `community_set_place`, `community_set_gyms`, `community_set_show_gym`, `community_set_show_place`, `community_set_quiet_hours`, `community_set_connect_from`, `community_set_partner`, `community_update_training_profile`, `community_my_status`, `community_is_moderator`.
Graph: `community_follow`, `community_unfollow`, `community_respond_follow`, `community_remove_follower`, `community_list_follows`, `community_list_followers`, `community_relationships`, `community_block`, `community_unblock`, `community_mute`, `community_unmute`, `community_connect`, `community_respond_connect`, `community_withdraw_connect`, `community_remove_connection`, `community_list_connections`.
Content: `community_feed`, `community_discover_posts`, `community_create_post`, `community_delete_post`, `community_get_post`, `community_post_set_note`, `community_react`, `community_respect_all`, `community_comment`, `community_delete_comment`, `community_list_comments`, `community_activity`, `community_mark_activity_seen`.
Discovery and boards: `community_hub_summary`, `community_search_people`, `community_suggested_people`, `community_find_people`, `community_dimension`, `community_dimension_recent`, `community_board`, `community_gym_summary`, `community_friends_trained_today`.
Messaging: `community_send_message`, `community_messages`, `community_conversations`, `community_mark_conversation_read`, `community_delete_message`.
Groups: `community_group_create`, `_update`, `_get`, `_feed`, `_search`, `_list_mine`, `_join`, `_leave`, `_approve`, `_remove`, `_promote`, `_invite`, `_invite_link`, `_accept_invite`, `_decline_invite`, `_close`, `_members`, `_messages`, `_send_message`, `_message_delete`, `_mark_read`, `_active_challenges`.
Presence and challenges: `community_set_training_now`, `community_set_show_training_now`, `community_challenge_create`, `_end`, `_log_session`, `_board`.
Safety: `community_report`, `community_moderation_queue`, `community_moderate`.
Gym RPCs go through `callGyms` -> `callCommunity`: `gyms_search`, `gyms_near`, `gyms_in_place`, `gyms_get`, `gyms_suggest`, `gyms_place_centroid`, `gyms_submit`, `gyms_confirm_submission`, `gyms_report`, `gyms_review_submission`, `gyms_review_report`.
Revoked or retired: nine shared-programme RPCs (migrate_164), three unused RPCs (migrate_183). Edge function call: `community-notify` only (from `notify.js` and `groupChat.js`/`profile.js`; grep count 3).

### Community moderation and trust reading guide (INFERRED synthesis)

Order of defences on a write: client gates (consent, session, sign-out) -> client validation and keyword filter -> server rate rail -> server minor / status / block / rules-version checks -> server keyword filter -> visibility rules on read -> report and auto-hide -> moderator action with audit row. Order on a push: server proves action -> block / mute -> category preference -> quiet hours -> fail-closed ED flag -> collapse window -> content-free copy.
