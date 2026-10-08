# 01: Community as it is at HEAD (read-only recon)

Branch `ccr-63ff003f-555gwv`, 2026-10-08. Authority: founder order 2026-10-08, "audit the community: build a complete picture of the community, all facilities, paths, how it fits together, the look and feel and everything else". Read-only; nothing was run, edited or applied. Every claim is from code read at HEAD; `OBSERVED` = read in the file cited, `INFERRED` = a reading of what the code implies, `UNVERIFIED` = not checked. Paths are relative to the repo root; `S` = `src/screens/`, `L` = `src/lib/community/`, `C` = `src/components/community/`, `M` = `supabase/`.

Prior audits used as a reading guide only: `docs/audit/community-audit-2026-09-22/A-*.md`, `B-*.md`; `docs/communities-revamp-2026-09-10/01-recon-community-today.md`; `docs/community-product-audit-2026-09-07/01,02`; TASKBOARD "COMMUNITY PROPOSALS 1 TO 11" (`docs/TASKBOARD.md:36-49`).

---

## 0. One-page summary

Shape in one paragraph: Community is a social layer inside the Today tab's stack (no tab of its own). Its "home" is `CommunityHubScreen`. It is an RPC-only client (no local SQLite tables; AsyncStorage caches only) over ~100 `community_*`/`gyms_*` Supabase RPCs behind one gated transport, with one edge function for push (`community-notify`) and one for public share pages (`community-public`). It is posts-from-training (not free chat), connections, 1:1 messages, groups, cohort pages and boards, with ED/calm withholds on the consistency and physique surfaces.

| Facility | Status | Main screen | Lib | Cloud (table / RPC) | Test |
|---|---|---|---|---|---|
| Hub (home) | live | `CommunityHubScreen` | `feed.js` `loadHub`/`loadHubSummary`, `profile.js` | `community_hub_summary`, `community_feed`, `community_discover_posts`, `community_get_me` | `CommunityHub.states`, `feed.test` |
| Profile + avatar + handle | live | `CommunityProfileScreen`, `CommunityEditProfileScreen`, `CommunityJoinScreen` | `profile.js`, `validation.js` | `community_profiles`, `community_upsert_profile`, `community_get_profile`, `community_check_handle`, `community_handle_suggestion` | `profile.*` (6 files), `CommunityJoin`, `CommunityEditProfile` |
| Training profile + cohorts | live | `CommunityTrainingProfileScreen`, `CommunityDimensionScreen` | `trainingProfile.js`, `validation.js` | `community_update_training_profile`, `community_dimension`, `community_dimension_recent` | `trainingProfile.test`, `CommunityTrainingProfile`, `CommunityDimension.*` |
| Feed + posts (session, pr, block, milestone, note) | live | `CommunityPostScreen`, `CommunityComposeScreen` | `feed.js`, `posts.js`, `ambient.js` | `community_posts`, `community_create_post`, `community_get_post`, `community_delete_post` | `posts.test`, `feed.test`, `PostCard`, `CommunityCompose*`; `ambient` guard only |
| Respect (reaction) + Respect everyone | live | `PostCard`/`ActivityItemRow`, `RespectAllRow` | `feed.js reactToPost`, `respect.js` | `community_react`, `community_respect_all` | `respect.test`, `RespectAllRow` |
| Comments | live | `CommunityPostScreen` | `feed.js` | `community_comments`, `community_comment`, `community_list_comments` | `CommunityPost.noProfile` (partial) |
| Activity inbox | live | `CommunityActivityScreen` | `activity.js` | `community_activity`, `community_activity` RPC, `community_mark_activity_seen` | smoke only (`screen-mount`), `ActivityRow` |
| Follow / followers | live | `CommunityFollowersScreen`, profile | `profile.js` | `community_follows`, `community_follow`/`respond_follow`/`remove_follower` | `CommunityFollowers`, `FollowButton` |
| Connections ("connect") | live | `CommunityConnectionsScreen`, `ConnectSheet` | `connections.js` | `community_connections`, `community_connect`/`respond_connect`/`withdraw`/`remove` | `connections.test`, `CommunityConnect`, `CommunityConnections` |
| Messaging | live | `CommunityConversationsScreen`, `CommunityConversationScreen` | `messages.js` | `community_conversations`, `community_messages`, `community_send_message` | `messages.test`, `CommunityConversation(s)`, `MessageBubble` |
| Groups (open / invite only / closed) | live | `CommunityGroupScreen`, `...Create`, `...Members` | `groups.js` | `community_groups`, `_group_members`, `_group_invites`, 15 `community_group_*` RPCs | `groups.test`, `CommunityGroup*` (3), `GroupRow` |
| Gyms (picker, finder, add, detail, report, week board) | live | `GymPicker`/`PlacePicker`/`GymDetailSheet` (components), `CommunityGymAddScreen`, Dimension (gym) | `src/lib/gyms/`, `findPeople.js gymSummary` | `gym_venues`, `gym_submissions`, `gym_reports`, `gyms_*` RPCs | `lib/gyms/__tests__` (2), `GymPicker`, `PlacePicker`, `GymDetailSheet`; `CommunityGymAddScreen` none |
| Find people (six doors) | live | `CommunityFindPeopleScreen`, `CommunityPeopleListScreen` | `findPeople.js`, `rankPeople.js`, `reasons.js` | `community_find_people`, `community_suggested_people` | `findPeople.test`, `reasons.test`, `CommunityFindPeople`, `CommunityPeopleList` |
| Search | live | `CommunitySearchScreen` | `feed.js searchPeople`, `groups.js searchGroups`, `rankPeople.js` | `community_search_people`, `community_group_search` | `rankPeople.test`; screen smoke only |
| Boards (gym / following / everyone / group; week / month / consistency) | live | `CommunityBoardScreen` | `boards.js` | `community_board` | `boards.test`, `CommunityBoard.scope` |
| Consistency sharing | live, off by default | training profile, Hub You row, profile strip | `trainingConsistency.js` | counters in `community_profiles` via `community_update_training_profile` | `trainingConsistency.test`, `migrate180.guard` |
| Moderation (report / block / mute / queue / gyms) | live | `CommunityModerationScreen`, `ReportSheet`, `ProfileMenuSheet` | `moderation.js`, `profile.js` | `community_reports`, `community_moderators`, `community_moderation_log`, `community_report`, `community_moderate` | `CommunityModeration`; lib `moderation.js` none |
| Rules + privacy receipt + privacy settings | live | `CommunityRulesScreen`, `CommunityPrivacyScreen`, `PrivacyReceipt` | `limits.js`, `rulesSummary.js`, `profile.js` | `_community_rules_version()`=3, `community_set_*` | `CommunityRulesScreen.updatePrompt.guard`, `CommunityPrivacy.showGymPlace`; `PrivacyReceipt` none |
| Early days (host row, invite, intro, Today row) | live | Hub, `HomeScreen` | `earlyDays.js`, `hostDismissal.js`, `introReoffer.js`, `homeFriendsRow.js` | `community_friends_trained_today` | `earlyDays.test`, `introReoffer.test`, `homeFriendsRow.test`, `HomeScreen.communityRow.guard` |
| Push notifications | live (client sends 11 kinds) | n/a | `notify.js` | edge `community-notify` v4, `community_notify_daily` | `notify.test`, `communityNotify.groupProof.guard`; edge function untested here |
| Public share pages / deep links | live, generic previews | `public/{u,s,g,p}/index.html` | `links.js` | edge `community-public` | `links.test` |
| Onboarding join | live | `ProOnboardingScreen` step 5 | `onboardingJoin.js` | same as profile | `ProOnboardingScreen.communityStep.guard`, `onboardingJoin.test` |
| Programmes sharing | RETIRED (removed by founder order CR-01) | none | vestigial `programmeId` args | RPCs revoked (164 Part 15) | n/a |
| Partners (legacy) | RETIRED; legacy card on Hub only | Hub legacy card | none | 155 applied | n/a |

---

## 1. Entry points and navigation

### 1.1 No bottom tab
Five tabs: Today (`HomeTab`), Train, Nutrition, Progress, Coach (`ProfileTab`) (`src/navigation/RootNavigator.js:762-766`). Community is not one. All 24 `Community*` screens are pushed on the **Today (Home) stack** (`RootNavigator.js:505-534`, comment at 499-504: "One destination ... every screen is pushed and draws its own BackHeader"). Two are also registered in the onboarding stack (`CommunityGymAdd`, `CommunityRules`, `RootNavigator.js:877-878`) so the wizard's gym step and rules link do not die. OBSERVED.

### 1.2 Every route in
| Entry | Where | Evidence |
|---|---|---|
| Today header pill "Community" (amber glyph + word, unseen dot / unread-message badge) | `HomeScreen` header right slot | `HomeScreen.js:2588`; `C/CommunityHeaderAction.js:1-30,36-70` (MIN_HEIGHT 44) |
| Today live row (members only, ED/calm withheld, "N friends trained today" + Invite) | below header | `HomeScreen.js:2595-2605`; gate `loadCommunityFriendsRow` `:742-789` (hidden on ED flag, `read_failed`, calm) |
| Today intro card (non-members, after first session, one re-offer after 5 more sessions) | lower on Today | `HomeScreen.js:3105-3113`; `L/introReoffer.js:1-40` |
| Today finished-block card "Post this finished block" | Today | `HomeScreen.js:2811-2827` |
| Coach tab "Community" row | `YouScreen` | `YouScreen.js:304-309,500-507` via `navigateCrossTab` |
| Settings "Community" row (now opens the Hub, A-10 fixed) | `SettingsScreen` | `SettingsScreen.js:143-156` |
| Workout summary "Show them" / share / training profile | `WorkoutSummaryScreen` | `:1390,1427,1454,1700,1735-1739` |
| Share card "Post to Community" | `ShareCardScreen` | `:1400` |
| Onboarding step 5 "Join Community / Skip" | `ProOnboardingScreen` | `:503-519,1291-1365` (early join), `:2815-2824` (rules summary, link to `CommunityRules`) |
| Deep links | `volyume://community`, `u`, `s`, `m`, `g` and `https://volyume.app` | `RootNavigator.js:931-980` (`Community:'community'`, `CommunityProfile:'u'`, `CommunityPost:'s'`, `CommunityConversation:'m'`, `CommunityGroup:'g'`); legacy partner paths rewritten to `community?legacyPartnerCode=` `:912-925` |
| Notification taps | `community_follow`/`community_activity` -> `CommunityActivity`; `community_message` -> `CommunityConversation{id}`; legacy `partner_*` -> Hub | `lib/notifications/notificationRoute.js:127,173,182-186` |
| Static share pages | `public/u,s,g,p/index.html` (see 3.5) | `L/links.js:26-160,178-216` |

Observed gap: group push kinds (`group_request`, `group_accepted`, `group_invited`) ride the `community_follow` category (`community-notify/index.ts:236`) so a tap lands on Activity, not the group (no `group` route in `notificationRoute.js`). INFERRED consequence: the person sees the item in the inbox, not the group page.

Cross-tab behaviour (OBSERVED, `navigation/navigateCrossTab.js:28-45`): from Coach or Settings the helper pops Today's stack to root, then pushes Community. INFERRED: Back from Community therefore lands on the Today root, not on Coach/Settings where the person started.

### 1.3 What the user sees as "home"
`CommunityHubScreen` (950 lines, one `FlashList`). Header (`BackHeader title="Community"` + `headerRight`, `:482-558,853`): own avatar (joined), search, bell (activity, dot), chat (messages, count badge), shield (privacy, added by A-10 work). That is up to five round controls beside the title (OBSERVED `:482-558`; the Today pill uses a 44 dp pill, the Hub uses 34 dp circles, `:903-912`).

Body, joined (`:560-792`): moderated-person notice, legacy partner card, rules-behind banner (`:570-600`), You line (`PersonRow` with DayDots + sessions, hidden when consistency is gated `:678`), eyebrow PEOPLE (+ "Find people") with `CohortRow`s from `community_hub_summary` (gym, each discipline, age group only if shared, area), or "You are the first here..." + Invite, eyebrow GROUPS (+ "New group", hidden for minors) with `GroupRow`s or the purpose line, HOST row (founder `allan`, "Not now"), eyebrow ACTIVITY with `ActivityItemRow`s (the Following feed). Not joined: hero card "Your gym, your people" + "Create my profile" / "Browse first" + `PrivacyReceipt`, then RECENT (discover stories) (`:645-676,790`). Empty feed: one line + "Say hello" (`:818-845`). Offline: caption "Showing what you last saw" (`:775-780`) over the cached hub (`feed.js:101-150`).

### 1.4 Screen graph (who reaches whom, from `navigate(...)` calls)
- **Hub** -> Profile (own/others/host), Search, Activity, Conversations, Privacy, FindPeople, Dimension (cohort), Group, GroupCreate, Post, Join, Rules, Compose(`note`).
- **Join** -> Rules; then `replace(next.screen)` or `goBack()` (`CommunityJoinScreen.js:92,363-364`).
- **Profile** -> Board, Compose(`note`), Connections, Followers, Conversation, EditProfile, Post, Rules, Search.
- **EditProfile** -> TrainingProfile. **Privacy** -> Community, Connections, EditProfile, Followers, Moderation (moderators), Rules, TrainingProfile.
- **FindPeople** -> PeopleList, Search, Join. **PeopleList** -> Profile, Conversation, Rules. **Search** -> Profile, Group.
- **Dimension** -> Board, FindPeople, Post, Profile, TrainingProfile. **Board** -> Profile, TrainingProfile.
- **Group** -> Compose, GroupCreate (edit), GroupMembers, Post, Profile. **Activity** -> Group, Post, Profile, Search.
- **Conversations** -> Conversation, FindPeople. **Conversation** -> Post, Profile, Rules. **Connections** -> Conversation, Profile. **Followers** -> Profile.
- **Post** -> Conversation, Join, Profile. **Compose** -> `replace` Post / Join.
- Not reached from any Community screen: `CommunityGymAdd` (only `C/GymPicker.js:254` from Edit profile / onboarding), `CommunityModeration` (Privacy only, moderators). All of the above OBSERVED from the grep of `navigate('Community...')`.
- Back-stack: every screen is a push with its own `BackHeader`; Create flows use `replace` (`GroupCreate:68,72`, `Compose:194,206`) so Back skips the form.

---

## 2. Facilities

### 2.1 Profile
- Fields (`L/validation.js`): handle `^[a-z0-9_]{3,20}$` (`:22`), display name <=40, bio <=160, area <=40, gym label <=60, up to 3 styles (`:112-121`: bodybuilding, strength, kettlebell, circuits, bands, bodyweight, minimal kit, home gym), goal (4, `:123-128`), up to 3 disciplines (15-key taxonomy `:140-184`, first 7 are physique divisions), visibility `public|followers` (`:220`). Avatar: one of 6 abstract presets, never a photo (`lib/profileAvatarPresets.js`, 6 entries; `ProfileAvatarMark`). Handle change once per 30 days (`limits.js:57`). Reserved handles `validation.js:29`.
- Screens: Join (suggested handle from `community_handle_suggestion`, live availability check, rules + receipt + sharing switch), EditProfile, Profile (others see a card + `ProgressStrip` only if counters are shared, `S/CommunityProfileScreen.js:275,361-370`).
- Local: AsyncStorage `@volyume_community_me_<uid>` cache of the `me` payload (`L/profile.js:28,89-109`); no SQLite.

### 2.2 Training profile and cohorts ("dimensions")
- Bands derived on device from the last 12 weeks (`trainingProfile.js:126`): days, time bands, sessions band, staple lifts, experience, age band (server-derived, never for a minor). Defaults: sessions, staple lifts, experience ON; days, time bands, age band, consistency OFF; "Share what I did" ON (`:134-163`). Audience for shared sessions: followers / My groups / Everyone, default Everyone, minors clamped to followers (`:168-185`).
- Cohort pages (`S/CommunityDimensionScreen.js`): gym, area, style, discipline, age band. Roster from `loadBoard`, `RespectAllRow`, RECENT from `community_dimension_recent`, `GymSummary` for gyms. Age-band page reciprocal and locked unless the caller shares their own band (header `:30-48`). Physique-discipline pages carry the Beat UK row (`BeatSignpostRow` `:159-180,575,586`) and are withheld under calm/ED (`:318-336`).

### 2.3 Feed and posts
- Kinds (OBSERVED `validation.js:87-108`): `pr`, `session`, `block`, `milestone`, `note` (note = no payload keys, caption is the post, item 5). Payload is an allow-list per kind; server mirrors it. Builders in `posts.js`; `programmeId`/`_programme_id` is still passed through `createPost` (`feed.js:250-257`) and the RPC still accepts it (`migrate_178:248,345`): vestigial.
- Creation paths: manual (Compose after workout / block / PR / milestone; `note` from two empty states only, see 8.1) and **ambient auto-posts** at workout finish when "Share what I did" is on and not ED/calm: one `session` + up to three `pr` posts, queued in AsyncStorage `community.pendingItems` and flushed on foreground/reconnect (`L/ambient.js:1-30,131-262`).
- Visibility `public|followers`; 280-char caption; keyword filter applied client-side (`validation.js:301`) and server-side (`_community_blocked_terms`).
- Reactions: one "Respect" tap + count (`C/PostCard.js:198-206`, `C/ActivityItemRow.js:171,223`); comments <=500 chars, 10/h new, 30/h established.
- "Respect everyone who trained today" (`C/RespectAllRow.js`, `L/respect.js:83`): once per scope per UK day, device-recorded; `migrate_177` returns recipients so each is pushed.

### 2.4 Activity
`activity.js` + `CommunityActivityScreen`: connection requests (with reasons + note) above follow requests above the event list; opening marks everything seen (clears the dot). Source of truth is `community_activity` rows; push is an extra.

### 2.5 Follow / connect
Follow: public = instant, followers-only = request (`profile.js:416-443`). Connect: a stronger tie that enables messaging; up to 2 reasons (same gym, same discipline, train like me, train together), 120-char note, `connect_from` = anyone / followers / nobody (`connections.js:44-69`). Four states `none|requested_by_me|requested_by_them|connected` (`:69-86`). Minors: no connections or messages at all (children's assessment).

### 2.6 Messaging
1:1 text only between connected people, <=1000 chars, optional session suggestion tile ("Suggest a session", day + time band, accept / can't make it) (`messages.js:30-99`). No realtime: re-read on focus and every 20 s while open (`S/CommunityConversationScreen.js` header). Push body is "New message from @handle", never content; one push per conversation per 15 min while unread.

### 2.7 Groups
Create (name 40, blurb 140, Open | Invite only), edit, join / request, approve, invite by username, invite link (`g/?id=&t=`), promote, remove, leave, close, share a workout, group board and feed (`groups.js`). Closed group leaves Hub/My-groups lists (migrate 176). Minors cannot create or join (server) and the Hub hides GROUPS for a minor with none (`Hub:737`). Group purpose line: `GROUP_PURPOSE_LINE` (`groups.js:28`).

### 2.8 Gyms
Directory in cloud (`gym_venues`, brands, sources, history, submissions, reports, postcode sectors; migrate 162/163). Client: `src/lib/gyms/` (`gyms_search`, `gyms_near`, `gyms_suggest`, `gyms_get`, `gyms_place_centroid`, `gyms_submit`, `gyms_confirm_submission`, `gyms_report`, moderator `gyms_pending_*`/`gyms_review_*`, `community_set_gyms`). UI: `GymPicker`, `PlacePicker` (town/postcode), `GymDetailSheet` (website, confirm, report), `CommunityGymAddScreen` (UK postcode checked, duplicate offered back, pending until a second person confirms or a moderator verifies). Gym "week board" = Dimension gym page roster + `GymSummary`. Primary gym + up to 3 others; show-gym / show-place switches.

### 2.9 Find people (six doors)
`FIND_MODE_ORDER = gym, area, like_me, same_discipline, partners, might_know` (`findPeople.js:86-88`): At my gym, Near me, Train like me, Same discipline (client-only, rides `like_me` with a `_discipline` filter), Open to training together, People you might know. Honest zero states; unavailable doors say what to add and open Edit profile. Hard filters (`PeopleFiltersSheet`), reasons not percentages (`reasons.js`), count line "N" / "N+" (`count_truncated`). Minors never listed.

### 2.10 Search
Handle/display-name search (debounced, request-id guarded) and group search (`S/CommunitySearchScreen.js`), results via `rankPeople` and recent searches stored locally. Blocked users invisible both ways server-side.

### 2.11 Boards
`community_board` scopes gym / following / everyone / group, windows week / month / consistency (`boards.js:27-42`); rank hidden under a small-group threshold (8 on cohort pages), no medals, own row pinned (`S/CommunityBoardScreen.js` header). Reached from cohort pages and profile.

### 2.12 Moderation, report, block, mute
Report reasons (`validation.js:211-218`): spam, harassment, impersonation, harmful body or eating content (auto `priority`), inappropriate, other. Targets: profile, post, comment, message, group (`moderation.js:38`). 3 distinct reports auto-hide (`limits.js:71`). Block is two-way and removes follows; mute silences posts and message pushes. Moderator screen: Open / Actioned (audit log) / Gyms chips (`CommunityModerationScreen.js:280-292`), actions dismiss, hide, unhide, delete, restrict, suspend and their reversals (`moderation.js:20-23`). Runbook target: first look within 24 h, "nothing in the app currently escalates or pages anyone" (`docs/community-safety/MODERATION-RUNBOOK.md:27-37`).

### 2.13 Rules, privacy settings and receipts
Rules text v3 in `CommunityRulesScreen.js:~40-140` (rules 1 to 6, what stays private, reporting, moderator actions, contact support@volyume.app). `COMMUNITY_RULES_VERSION = 3` (`limits.js:34`), server `_community_rules_version()` = 3 (`migrate_174:143-151`). Outdated acceptance raises `rules_outdated` and the screen offers "Accept the updated rules". `PrivacyReceipt` appears on Join, Hub (not joined), Privacy. Privacy screen (`S/CommunityPrivacyScreen.js:230-415`): who can follow, who can send connection requests, show gym, show place, training profile, blocked, muted, edit profile, followers, connections, moderation queue (moderators), rules, leave Community.

### 2.14 Consistency sharing
`trainingConsistency.js`: counters (sessions this week/month, streak weeks, planned/week, 4-week PR count; reads only workout timestamps, plan day count, PR count) published inside `community_update_training_profile`. Gate `consistencyGateState` = toggle AND not (calm OR open ED flag) AND not a minor, fail-closed (`:255-264`); `sessionShareGateState` for ambient posts (`:281-284`). Win-back offer "Show your gym you trained today?" once only (`ambient.js:269-298`, `WorkoutSummaryScreen.js:468,1691`).

### 2.15 Early days and ambient prompts
Host row (hard-coded handle + user id `L/earlyDays.js:16-23`, shown only if not already following, `hostRowVisible :117-134`), invite message built from own profile link (`:34-52`), `firstHereLine`, `cohortCountLine`, Today row cache 15 min (`homeFriendsRow.js:22`), intro card re-offer (`introReoffer.js`).

### 2.16 Notifications
Client `notifyCommunityEvent` sends 11 kinds (`notify.js:21-40`): follow, follow_request, follow_accepted, reaction, comment, connect_request, connect_accepted, message, group_request, group_accepted, group_invited. Call sites: `profile.js:418,438`, `feed.js:303`, `CommunityPostScreen.js:175`, `connections.js:163,178`, `messages.js:180`, `respect.js:96`, `groups.js:142,152,176`. Server: see 3.3. Local categories `community_follow`, `community_activity`, `community_message` (`lib/notifications/categories.js`); community quiet hours via `community_set_quiet_hours`.

---

## 3. Data and backend

### 3.1 Cloud schema (migrations)
| File | What it adds |
|---|---|
| 160 | core: profiles, follows, blocks, mutes, posts, reactions, comments, reports, moderators, moderation_log, activity, rate_events (+ now-retired programme tables) |
| 161 | connections, conversations, messages; `_community_rules_version()` (2 then) |
| 162 | gym directory (venues, brands, sources, history, submissions, reports, postcode sectors) |
| 163 | place + finder RPCs |
| 164 | gap closure: followers list, quiet hours, report targets; revokes nine programme RPCs |
| 165 | boards, consistency counters, groups (+members, invites) |
| 166, 167 | hotfixes for `_community_rate_check` read-only-transaction incident |
| 168, 169 | gym finder relevance/order fix; `community_board` alias fix |
| 170 | connection/consistency revamp: disciplines, `community_hub_summary`, `community_dimension_recent`, `community_respect_all`, post_groups, `community_notify_daily` |
| 171, 172, 173 | friends-trained-today count; PR count; handle suggestion |
| 174, 175 | minor check fails closed + rules v3; rules gate tolerant of older clients |
| 176 | closed groups leave lists |
| 177 | notify recipients for Respect-all and join requests |
| 178 | `note` post kind |
| 179 | RLS on two tooling tables |
| 180 | server ED/calm gate on consistency readers (`_community_ed_flag_open`, `_community_calm_mode_on`, `_community_consistency_withheld`) |
| 181 | gym moderation lists |
| 182 | `ed_flag_push` |
| 183 | revoke three unused RPCs |
| 184, 185, 186 | session sharing default on (new), flipped for existing, never on if unasked |
| 187 | server accepts an automatic post's `everyone` as `public` |

Applied through 188 except 049 held; 189 unapplied (`CLAUDE.md` status block; not re-verified against the live database, UNVERIFIED). Tables are RLS-on with RPC-only access; the guard `community.rpcOnly.guard.test.js` plus 14 `migrateNNN.*guard` tests pin shape.

### 3.2 Client transport
`L/transport.js` is the only file allowed to import the Supabase client (guard `community.transport.guard.test.js`). `assertCommunityGates()` (`:138-168`): (1) `isSignOutWiping()` -> `sign_out_wiping`; (2) `healthConsent !== true` -> `health_consent_unresolved` (fail closed); (3) `hasLiveSession() === false` -> `not_signed_in` (null/unknown does not block). `callCommunity` (RPC) and `invokeCommunityFunction` (edge) both go through it. Errors arrive as `CommunityError.code` from a closed list (`:34-65`); expected refusals are not logged to Sentry (`:67-85`).

### 3.3 Edge functions
- `community-notify` (876 lines, v4 live): JWT -> proves the action row exists (<=10 min) -> block check -> mute (connect/message) -> category preference (failed read holds push) -> quiet hours (`:580-617`) -> open ED flag fail-closed (`:619-640`) -> one push per proof (`pushed_at`) -> message collapse 15 min -> Respect collapse one per recipient per UK day via `community_notify_daily` claim (`:731-795`) -> `send-push`. Copy in `pushCopy :192`, categories `:236`.
- `community-public` (225 lines, anonymous GET): `post` and `profile` only; programme returns 404 (`:123`); minors, non-active, non-public, hidden all 404.
- `partner-cheer` (legacy), `delete-account` (account deletion, Community data not re-verified, UNVERIFIED).

### 3.4 Local versus live, offline
- No SQLite for Community. AsyncStorage keys (OBSERVED): `@volyume_community_me_`, `_hub_`, `_home_friends_row_`, `_host_dismissed_`, `_onboarding_choice_`, `_pending_join_`, `_respect_given_`, `_share_offer_seen_`, `_sharing_pending_`, `_tp_share_`, `_tp_share_mark_`, `_tp_synced_`, `_consistency_week_`, `community.pendingItems`.
- Cached and shown offline: `me`, the Hub feed (`feed.js:101-150`), Today row. Everything else is a live read; offline shows an EmptyState "You are offline" with retry.
- Queued for retry: onboarding join (14-day max age, `onboardingJoin.js`), sharing-settings publish, ambient posts. NOT queued (OBSERVED by absence; each shows an offline toast): follow, react, comment, message, post-by-hand.
- Retry hooks: `App.js:141` `retryPendingJoin`; foreground/reconnect flush (`App.js:855-945`).

### 3.5 Public pages
`public/{u,s,g,p}/index.html` each have 6 `og:`/`twitter:` meta lines, static and generic (`public/u/index.html:7-16`: "A lifter on Volyume"; no per-person title or image). `u` and `s` fetch `community-public`; `g` "fetches NOTHING about the group" (`public/g/index.html:26`); `p` is a retired static page. Link parser `L/links.js:178-216` maps a `p` link to the Hub.

### 3.6 Rate limits
Client mirror `limits.js` (new account = first 7 days): follows 30/100 per day, following cap 2000, posts 3/10 per day, comments 10/30 per hour, reports 20/day, profile upserts 5/day. Server (`_community_rate_check`, OBSERVED in migrations): react 100/300, message 20/60 per hour, connect 10/30, group_create 5/20 per hour, group_join 30/100, gyms_submit 3 per 24 h, gyms_report 10 per 24 h, respect_all 10/h, auto-post 12, reads 120/h. `limitsForAccount` is exported (`index.js:36`) but consumed by no screen (8.4).

---

## 4. Safety and policy

Documented, not proposed for change.

- **Calm / open ED flag, client read side**: `consistencyGateState(uid, share)` returns `allowed: !!shareToggleOn && !gated && !isMinor`; unreadable `me` is treated as a minor (`trainingConsistency.js:255-264`); `readEdOrCalmSuppressed` (in `hooks/usePhotoSuppression.js`, reused because the Community privacy guard bans `wellbeing.js`/`edPatternDetector.js` imports, `:23-31`). Ambient posts: `sessionShareGateState` (`:281-284`), re-checked at flush (`ambient.js:228-250`). Hub You row hidden when gated (`CommunityHubScreen.js:188-205,678`). Today row hidden on ED flag, `read_failed` or calm (`HomeScreen.js:742-789`). Physique cohort pages withheld, fail-closed start `suppressed = true` (`CommunityDimensionScreen.js:318-336`). Training profile payload composed through one gated path (`composeTrainingProfilePayload :333-344`, `shareablePayload ... consistencyGated :632-653`).
- **Server arm**: migrate 180 withholds every consistency reader under an open ED flag OR calm (`_community_ed_flag_open`, `_community_calm_mode_on` reading the mirrored `@volyume_wellbeing_mode = 'calm'`, `migrate_180:283,297-327`). Applied 2026-09-24. Per `docs/TASKBOARD.md` and `CLAUDE.md` status, the ED arm arms only when a device on a build carrying `ed_flag_push` raises a flag; no such build has shipped. The edge function's own ED gate (`community-notify/index.ts:619-640`) has the same dependency. Calm arm is live via the mirror.
- **Minors / closed**: 174 makes the under-18 check fail closed; minors are forced followers-only, excluded from search, suggestions, cohorts, boards, groups, connections, messages and the public pages (`docs/community-safety/CHILDRENS-ACCESS-ASSESSMENT.md` section 5; `community-public` 404s a minor). No age band for a minor. Onboarding has no Community step under 18 or unreadable age (`ProOnboardingScreen.js:677,1032,1291`). Client UI: GROUPS hidden for a minor with none, "New group" hidden (`Hub:737`).
- **Keyword filter**: `keywordFilter.js` whole-word after folding; scope: self-harm instructions, pro-ED vocabulary (thinspo, bonespo, pro ana ...), slurs; ordinary swearing deliberately allowed (`:1-50`). Applied to captions, comments, messages, bio, names (`validation.js:301`) and payload string values (178), and in SQL (`_community_blocked_terms`).
- **Reporting and blocklists**: see 2.12. Auto-hide at 3 distinct reports. All moderator actions audit-logged (`community_moderation_log`). Blocking two-way, mute one-way.
- **Rules text commitments** (`COMMUNITY-RULES.md`, in-app copy identical v3): training talk only; no body-shaming or diet/calorie talk (including your own body); never shown: bodyweight, Progress Scan, food, injuries, coach output, check-ins, photos, "first name, date of birth, email, height or age" (`CommunityRulesScreen.js:~95-105`). Note the tension in 8.5.
- **Other published commitments**: 24 h first-look target and priority queue for the ED-content reason (runbook); DSA micro-enterprise self-assessment dated 2026-09-06, review 2027-09-06; illegal-content risk assessment exists; children's access assessment concludes self-declared 13+ with the measures above.
- **Push safety**: community pushes held on any ED flag read error; messages never carry content; quiet hours apply server-side.

---

## 5. Look and feel

### 5.1 Token discipline
OBSERVED by grep over `S/Community*.js` and `C/*.js`: zero hex or `rgba()` literals; no literal `fontSize`/`fontWeight`; all colour/type through `useTheme()` / `theme.js` tokens. Only fixed numbers are glyph-circle sizes (34/36 dp header buttons: `CommunityHubScreen.js:905-906`, `CommunityProfileScreen.js:700-701`, `CommunityDimensionScreen.js:794`, `CommunityEditProfileScreen.js:660-661`; DayDots 6/12 dp; badge 16 dp). The 34 dp circle is repeated in three screens rather than a shared component (INFERRED duplication).

### 5.2 Two visual grammars in one feature
- **Flat-row grammar** (revamp 2026-09-10, "presentation law", `20-BLUEPRINT.md` section 9): uppercase `Eyebrow` sections, `PersonRow`/`CohortRow`/`GroupRow`/`ActivityItemRow` flat on `colors.background`, `borderSubtle` hairlines, tertiary actions, quiet one-line empties, no `Card` for people. Used by Hub, Dimension, Group, Profile (`Eyebrow` imported by exactly these four, grep) and the row components (`CHANGED to PersonRow` in Activity, Connections, Followers, Conversations, Search per file headers).
- **Card/SectionLabel grammar** (older): `SectionLabel` is used by 11 screens (Activity, Board, Compose, EditProfile, GroupCreate, GroupMembers, Join, Post, Privacy, Rules, TrainingProfile) and `Card` by EditProfile, GymAdd, Hub (hero + legacy card), Join, Moderation, Rules, TrainingProfile, plus `PostCard`, `ProfileCard` wrapper, `PrivacyReceipt`, `PlacePicker`, `GymSummary`, `GymWeekBoard`. So the **post detail screen** (`PostCard`, `Card`) differs from the feed row (`ActivityItemRow`) for the same post (OBSERVED).
- Shared components (39 files in `C/`): rows (Person, Cohort, Group, ActivityItem, Activity, Conversation, ConnectRequest, Gym, Comment), `Eyebrow`, `AvatarStack`, `DayDots`, `ProgressStrip`, `TrainingProfileLine`, sheets (Menu, ProfileMenu, Report, Connect, Session, GroupInvite, PeopleFilters, GymDetail), pickers (Gym, Place), `PrivacyReceipt`, `RespectAllRow`, `SkeletonPersonRow`, `MessageBubble/Composer`, `JoinToInteractRow`, `CommunityHeaderAction`.

### 5.3 Typography, spacing, empty states
Type via `type.*` roles (`h3` hero only, `bodySm`, `caption`, `label`, `type.num('label')` for figures); spacing from `spacing.*`; `Eyebrow` uses `letterSpacing.overline`, uppercase, no amber (pinned `rows.amber.guard.test.js`). Amber is rationed (glyph and dot only on the header pill; one emphatic action). Empty-state convention (blueprint rule 9): section empties are one muted line + at most one tertiary button (`Hub:818-845`, `GroupScreen:368-374`, `Profile:555-580`); error/offline states keep the full `EmptyState` with retry (`Hub:795-812`). Other screens (Followers, Connections, Conversations, Search, People list) still use the full `EmptyState` card for "nobody yet" (19 files import it; OBSERVED).

### 5.4 Versus the rest of the app and the logger rebuild
`docs/audit/workout-logger-audit-2026-10-06/12-BUILD-SPEC.md:62-90` (near-black tone, D220): page `colors.background`; sections `colors.surface` **full bleed, no radius, no border, 10 dp bands of page colour between**; hairline `colors.borderSubtle`; "wells" (`background` fill, `borderSubtle`, `radius.md`) for inputs; one amber ring/fill for the single committed action; `type.num` tabular figures; large (48 dp) hit areas; components in `src/components/workout/session/`. Community's flat rows share the hairline and amber-rationing ideas but sit directly on `colors.background` with no `surface` bands and no wells; Community inputs (Compose, EditProfile, Join) use the older `Input`/`Card` look (INFERRED from the Card/SectionLabel list; the input component was not opened). Community figures use `type.num('label')` in `ActivityItemRow:206` and `GymWeekBoard:76` only. No Community screen uses the logger's section-band pattern or its 56-64 dp row heights (OBSERVED: none of the `workout/session` components is imported by Community).

### 5.5 Rendered references
No render mechanism exists: `docs/communities-revamp-2026-09-10/render-2026-09-10/README.md` is a text outline of Hub, Dimension, Group, Profile (hand-authored, not generated); `docs/social-discovery-2026-09-06/render-visual-2026-09-07/01-07*.html` are static mocks (join, hub-noprofile, people-list, programme, privacy, profile, menu-sheet) that pre-date the revamp and still show a programme page. Neither reflects HEAD pixels. No screenshots of HEAD were taken in this recon.

---

## 6. Copy and voice

Sampled from title/label/text props and constants (OBSERVED).
- Compliance: no em dash in any non-comment line of `S/Community*.js`, `C/*.js`, `L/*.js`, `HomeCommunity*` (grep returned none; lint rule `eslint.config.js:243-253`). No US spellings found in user strings (only code identifiers: `behavior=` prop, `color`).
- Calm voice is consistent where rewritten: "Try that again in a moment." "Nothing about you is shared until you create a profile." "That is a lot of posting for one day. Try again tomorrow." (`Compose:53`) "Community needs a connection. Your training is unaffected."
- Terminology drift (OBSERVED): the same item is "story" (Post screen: "This story is no longer here", "Delete this story?"), "post" (Activity, rules: "Training-story posts"), "training" (push copy), "moment"/"stories" (Hub empty: "Training stories from Community show up here"), "shared items". "Respect" is both noun and verb (button "Respect 3", row "Respect everyone who trained today", push). Relationship vocabulary: Follow vs Connect vs Message vs "training partner" vs "Open to training together" vs "Want to train together?".
- Jargon left: "Blurb" (`GroupCreate:40`, label "Blurb (optional)"), "Operator (optional)" on gym add, "Actioned (audit log)" (moderators only), "Hub" appears only in code, "cohort"/"dimension"/"door" appear in code only (user-visible: "Find people", "PEOPLE").
- Fixed since A: "Username" at Join/Edit (`Join:383`, `Edit:393`), "Age group" (`TrainingProfile:86`); no "programme" in user strings.
- Doc/app divergence: `COMMUNITY-RULES.md` says "a handle" where the in-app rules text says "a username" (`CommunityRulesScreen.js` privacy intro); the screen header comment still says "version 2 block" (`:11`) though the text is v3.
- Capitalisation: eyebrows uppercase via style (`PEOPLE`, `GROUPS`, `HOST`, `ACTIVITY`, `RECENT`); the HOST eyebrow reads as jargon-light but unexplained until the row ("Built Volyume").

---

## 7. Test coverage

Counts: `lib/community/__tests__` 27 files; `components/community/__tests__` 24; `screens/__tests__` 26 Community-related; 29 root `src/__tests__` Community/migration guards (`community.*.guard`, `migrate163..187.*.guard`); plus `lib/gyms/__tests__` 2, `HomeCommunity{IntroCard,TodayRow}.test`, `notificationRoute.test`, `communityCategories.test`, and Community entries in `__tests__/screen-mount.test.js:2963-3093` (mount + tap-everything smoke for Hub, Join, EditProfile, Profile, Search, Activity, Dimension, Rules, Privacy, Moderation, Compose, Post, Conversation(s)).

Unpinned or thin (OBSERVED by absence of a named test):
- No dedicated test: `CommunityActivityScreen`, `CommunitySearchScreen`, `CommunityGymAddScreen`, `CommunityBoardScreen` beyond scope, `CommunityRulesScreen` beyond the update prompt; lib `activity.js`, `moderation.js`, `limits.js`, `hostDismissal.js`, `ambient.js` (guard test only: `community.ambient.guard.test.js`); components `ReportSheet`, `MenuSheet`, `PrivacyReceipt`, `GroupInviteSheet`, `SessionSheet`, `CommentRow`, `ConversationRow`, `ComposerInput`, `ProfileMenuSheet`.
- Edge functions `community-notify` and `community-public` have no test in `supabase/functions` (only `_shared/boundedJson_test.ts`); one source guard `communityNotify.groupProof.guard.test.js` covers the group proof. Live-behaviour proof was by production API log and harness, recorded in `supabase/README.md`.
- No test asserts the Hub's header icon count, or that a path to `Compose{kind:'note'}` exists after the empty state (see 8.1).
- Stale test fixtures: `screen-mount.test.js:3035` (`tab:'programmes'`) and `:3093` (`ref:{kind:'programme'}`) still feed retired concepts.

---

## 8. Known defects and dead ends

### 8.1 Observed
1. **The free-text note has no door once the feed or profile has content.** `CommunityCompose{kind:'note'}` is navigated from exactly two places, both empty states: Hub empty feed (`CommunityHubScreen.js:841`) and own-profile empty ACTIVITY (`CommunityProfileScreen.js:574`); grep `kind: 'note'` finds only these. A Hub with any item, and a profile with any post, offers no "post a note" and the Hub has no compose entry at all (the only Hub `CommunityCompose` call is the empty state).
2. **Dead components**: `C/DimensionRow.js` and `C/GymWeekBoard.js` have no importer (only their tests and `rows.amber.guard.test.js:115,122`). OBSERVED by grep of imports.
3. **Dead export**: `COMMUNITY_DIMENSION_MIN_FOR_HUB` (`limits.js:44`, re-exported `index.js:30`) is read by nothing; `limitsForAccount`/`isNewAccount` and the per-day constants likewise have no UI consumer despite the header promise of "honest copy" (`limits.js:1-11`).
4. **Stale "five doors" comments** after the sixth door: `S/CommunityFindPeopleScreen.js:6,101,218,252`, `L/findPeople.js:28`.
5. **Vestigial programme remnants**: `createPost` still sends `_programme_id` (`feed.js:250-257`), profile cache carries `tp_programme_key: null` (`profile.js:78`), `links.js:100,207` keeps a `p` path, `community-public/index.ts:4,24` header still documents programme, comments "programme use" at `ActivityRow.js:5-7`, `categories.js:60`, `CommunityActivityScreen.js:6`, `notificationRoute.js:169`.
6. **Host row depends on one hard-coded account** (`earlyDays.js:16-23`; `hostRowVisible :117-134`); if that profile is private, blocked or the read fails the HOST row simply does not appear (INFERRED: nothing else offers a first follow beyond Find people / cohort rows).
7. **Link previews are generic**, not per person/post/group (`public/u/index.html:7-16`); the `g` page fetches nothing (`public/g/index.html:26`).
8. **Group push taps open Activity, not the group** (1.2).
9. **Win-back offer is once-only** (`ambient.js:269-298`) and consistency sharing remains default OFF (`trainingProfile.js:134-145`) while session sharing is default ON; INFERRED effect: a person who dismissed the offer is never re-asked about consistency from the post-workout surface.
10. **Header density**: Hub carries five round controls (`:482-558`); the privacy shield is a lone icon with no label (accessibility label only).
11. **Moderation relies on a daily human check**: "nothing in the app currently escalates or pages anyone" (`MODERATION-RUNBOOK.md:27-37`); UNVERIFIED whether any server job notifies a moderator of a new report (none found in `supabase/functions`).

### 8.2 Inferred
- Cross-tab entries return to Today, not the starting tab (1.2).
- Design inconsistency between feed row (flat) and post detail (`Card`) will read as two products on one tap (5.2).
- `community-notify` Respect collapse means only one reaction push per day per recipient; engagement signal is deliberately thin (by design, `index.ts` 5c).

### 8.3 Unverified
- Live DB state of 189 and exact ACL of `_community_rate_check` for `authenticated` (flagged by B Question 9; not re-read).
- Whether `delete-account` removes all Community rows and storage-adjacent data.
- Real device appearance of any screen at HEAD (no render path).

### 8.5 Policy/copy tension (observed text, inferred conflict)
Rules v3 states Community never shows "your first name, date of birth, email, height or age" (`CommunityRulesScreen.js` and `COMMUNITY-RULES.md:65`) while an opt-in age band and the "age group" cohort page exist (`trainingProfile.js:109-115`, `Dimension` age-band page). The code treats the band as opt-in and reciprocal; the rules sentence does not mention it.

### 8.4 Status of the 2026-09-22 findings at HEAD

**Lane A**
| ID | Status | Evidence |
|---|---|---|
| A-01 push for 2 of 8 kinds | FIXED | 11 kinds in `notify.js:21-40`; call sites listed in 2.16 (follow, connect, message, group, Respect, Respect-all all call `notifyCommunityEvent`) |
| A-02 new joiner's only first follow is the host | STANDS (mitigated) | host constants `earlyDays.js:16-23`; cohort rows and Find people exist but nothing auto-suggests a first follow |
| A-03 no tab, 34 dp icon with no text | PARTIAL | now a labelled 44 dp pill (`CommunityHeaderAction.js:36-70`) plus Today row (`HomeScreen.js:2595`); still no tab (`RootNavigator.js:762-766`) |
| A-04 intro card retired for good | FIXED | one re-offer after 5 sessions, second dismissal final (`introReoffer.js:1-40`) |
| A-05 first post needs a workout | FIXED, with new gap | `note` kind (`validation.js:99`), Compose `note`, migrate 178; door only in empty states (8.1) |
| A-06 onboarding join dropped if wizard abandoned | FIXED | `performEarlyCommunityJoin` at step 5 (`ProOnboardingScreen.js:1334-1365`) |
| A-07 win-back offer once | STANDS | `ambient.js:269-298`; softened because session sharing now default ON (migrate 184) |
| A-08 group zero state is a bordered card | FIXED | quiet line `CommunityGroupScreen.js:368-374` |
| A-09 "Age band" jargon | FIXED | "Age group" `CommunityTrainingProfileScreen.js:86`; no "Age band" string in Community |
| A-10 Settings row opened Privacy | FIXED | `SettingsScreen.js:150-156` opens Hub; Hub has a privacy button (`:545-558`) |
| A-11 six doors not five | STANDS (informational) | six in `findPeople.js:86-88`; stale five comments remain (8.1.4) |
| A-12 avatars are 6 presets | STANDS (by design, D160) | `profileAvatarPresets.js` |
| A-13 group create has no purpose | FIXED | `GROUP_PURPOSE_LINE` shown `GroupCreate:91` and on Hub empty GROUPS |
| A-14 "Handle" label | FIXED | "Username" `Join:383`, `Edit:393` |
| A-15 `COMMUNITY_DIMENSION_MIN_FOR_HUB` unused | STANDS | no reader (8.1.3) |
| A-16 "programme use" in comments | STANDS | 4 comment sites (8.1.5) |
| A-17 programme copy fixed | HOLDS | no "programme" in user strings |
| A-18 "looks rubbish" defects fixed | HOLDS structurally (UNVERIFIED visually) | flat rows on 4 screens; Card/SectionLabel remain elsewhere (5.2) |

**Lane B**
| ID | Status | Evidence |
|---|---|---|
| B-01 only 2 notify call sites | FIXED | same as A-01 |
| B-02 ED/calm withhold client-only | FIXED server-side, ED arm dormant | `migrate_180` applied 2026-09-24; arm needs a device build carrying `ed_flag_push` (TASKBOARD, `CLAUDE.md`); calm arm live (`migrate_180:297-327`) |
| B-03 no surface for gym submissions/reports | FIXED | migrate 181; Gyms chip `CommunityModerationScreen.js:292`, `reviewSubmission` `:174,200` |
| B-04 four unrevoked unused RPCs | FIXED | migrate 183 revoked three; `gyms_near` is a live alias (`gyms/index.js:157`) |
| B-05 static page implements programme preview | FIXED | `public/p/index.html:17-24` retired page; edge returns 404 for programme (`index.ts:123`) |
| B-06 untested `respect.js`, gyms wrappers, GroupMembers | FIXED | `respect.test.js`, `gyms/__tests__/index.test.js:190`, `CommunityGroupMembers.test.js` |
| B-07 migration 155 pending | FIXED | applied 2026-09-26 per `CLAUDE.md` status (not re-read from DB) |
| B-08 no og tags | FIXED but generic | 6 meta lines on `u,s,g,p` (3.5) |
| B-09 group kinds not in allow-list | FIXED | `notify.js:36-39` |
| B-10 fixed since Sept-7 | HOLDS | n/a |
| B-13 programme removal | HOLDS | post kinds are 5 now incl. `note` (`validation.js:87-108`) |
| Side: tooling tables lacking RLS | FIXED | migrate 179 |
| Side: leaked-password protection off | STANDS | dashboard setting, founder side (TASKBOARD) |
| Side: `_community_rate_check` executable by `authenticated` | UNVERIFIED | not re-read; 183 did not touch it |
