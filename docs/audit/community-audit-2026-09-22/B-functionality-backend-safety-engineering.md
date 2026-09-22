# Community audit — Lane B: functionality vs backend, privacy, safety, moderation, gym directory, legacy partners, engineering

Scope: Lane B only (backend/functionality parity, privacy, ED-safety, moderation, gym directory, legacy Partners, engineering); Lane A (adoption/visibility/onboarding/look/copy) not duplicated. Files read or grepped: 6 prior audit docs, 2 decisions registers, `supabase/README.md`, all 17 `migrate_160`-`migrate_176` SQL files, both edge functions, ~30 `src/lib/community/*.js` + 5 `src/lib/gyms/*.js`, 24 Community screens, 37 components, `RootNavigator.js`, notification categories, `public/{u,p,s,g}/index.html`, `docs/rules/supabase.md`. Distinct files inspected: **approx. 140**.

**Governing fact, load-bearing throughout.** The prior campaign docs (`community-product-audit-2026-09-07/*`, `social-discovery-2026-09-06/*`) all say Community is "infrastructure only, not applied to production" — true when written, **no longer true**: `supabase/README.md` rows for migrate_160-175 all read **APPLIED**, matching CLAUDE.md's status line and this brief's production counts (`community_profiles=2`, `gym_venues=46,816`). Only migrate_176 (closed groups leave the Hub) is WRITTEN NOT APPLIED. Every finding below is a **live production mechanism**, unless marked.

---
## Top findings

| ID | Sev | Area | Finding | Evidence |
|---|---|---|---|---|
| B-01 | **blocker** | Engineering/notifications | The only path that can trigger a cross-device push, `notifyCommunityEvent()`, is called from exactly **two** places in the whole app: `reaction`/`comment` in `CommunityPostScreen.js:150,173`. Follow, connect, message and all group events write an in-app inbox row but **never reach another device**. | `notify.js:38-45` (sole export); repo grep of `notifyCommunityEvent(`/`invokeCommunityFunction(` → 2 hits, both in `CommunityPostScreen.js` |
| B-02 | high | Privacy/safety | The calm-mode/open-ED-flag withhold for consistency-sharing (sessions, streaks, PRs) is enforced **only client-side** (`trainingConsistency.js` `consistencyGateState`/`readEdOrCalmSuppressed`). No equivalent check exists in `community_update_training_profile` or `_community_profile_card`'s `v_show_consistency` derivation. | `src/lib/community/trainingConsistency.js:254-263`; `supabase/migrate_172_community_pr_count.sql:302-329` (no `ed_pattern`/`calm` term in the gate) |
| B-03 | high | Gym directory / moderation | No app surface exists to act on a pending gym submission or a venue report except peer-confirmation. `gyms_review_submission`/`gyms_review_report` have zero client callers anywhere; a moderator can only act via raw SQL. | `supabase/migrate_162_gym_directory.sql:1367,1464`; repo-wide grep of both names outside migrations → 0 hits |
| B-04 | medium | Backend hygiene | 9 programme RPCs are correctly EXECUTE-revoked, wrappers deleted — clean retirement. But `community_dimensions_me`, `gyms_near`, `gyms_in_place`, `community_gym_suggest` are still defined and granted, **not revoked**, with zero client callers (superseded or never wired) — unmaintained surface for no product value. | `feed.js:118-124` (F18, superseded by `community_hub_summary`); grep `near(`/`inPlace(`/`gymSuggest(` → 0 UI callers |
| B-05 | medium | Engineering | Static share page `public/p/index.html` still fully implements a programme preview (fetches `community-public?kind=programme`) although that branch was removed from the edge function and the RPCs revoked in migrate_164. Fails gracefully to "not found", but is dead, unmaintained HTML nobody cleaned up. | `public/p/index.html:248,254`; `docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2 |
| B-06 | medium | Tests | `respect.js` ("Respect everyone" and its once-a-day dedup state) has no lib unit test, only a component test. `gyms/index.js`'s `submit`/`confirmSubmission`/`report` wrappers are untested. `CommunityGroupMembersScreen.js` has no test file. | `ls src/lib/community/__tests__` (no `respect.test.js`); `gyms/__tests__/index.test.js:91-96`; `ls src/screens/__tests__` (no `CommunityGroupMembers*`) |
| B-07 | low | Legacy Partners | Migration 155 (partner-cheer date-tamper fix) is client-ready (the vulnerable local-date fallback was deleted with Partners) but still blocked purely on a store-rollout fact, not a code task: CLAUDE.md/README both still record it PENDING as of today. | `supabase/README.md:105-122` region ("155 update 2026-09-06"); CLAUDE.md STATUS block |
| B-08 | low | Deep links | `public/u/index.html`'s iOS link is now real (`apps.apple.com/gb/app/volyume/id6777083702`), fixing the Sept-7 placeholder finding. No `og:*` meta tags exist on any of the four static pages, so a shared link still unfurls with no preview image in iMessage/WhatsApp/Slack. | `public/u/index.html:207` (real id); grep `og:` across `public/{u,p,s,g}/index.html` → 0 hits |
| B-09 | low | Notifications | `COMMUNITY_NOTIFY_KINDS` (client allow-list gating `notifyCommunityEvent`) does not include `group_request`/`group_accepted`/`group_invited`, even though `community-notify`'s own `pushCopy`/`categoryFor` already handle all three server-side. If a future call site ever tries to notify on a group event, the client gate silently drops it before the edge function is reached. | `src/lib/community/notify.js:20-27`; `supabase/functions/community-notify/index.ts:216-220` |
| B-10 | low, fixed since Sept-7 | Notifications/Moderation/Privacy | Three prior-audit gaps are now closed: server-side quiet hours apply to every push (SD-15a); `community_report` accepts `target_kind='message'`; age band renders across 10 cohort/profile surfaces (CR-02). | `community-notify/index.ts:550-583`; `migrate_165:1399-1414`; grep `age_band` → 10 files |
| B-13 | low | Programmes | Founder-ordered removal (CR-01, "never plan or programme sharing") is fully landed both sides, down to the post `kind` allow-list itself, not just the shared layer. | `migrate_164:9-31`; `validation.js:87-99` (4 kinds) |

---
## Question 1 — RPC coverage map

Legend: **EXPOSED** a screen/component reaches it through a client wrapper; **WRAPPED-UNUSED** a JS wrapper exists, exported, uncalled; **DEAD** no client wrapper at all (incl. the 9 EXECUTE-revoked programme RPCs); **MISSING** none found (full diff of client-called names vs every migration -defined name returned zero client-only names). "Last migration" is the highest file that (re)defines the function; 3 rows (`community_hub_summary`, `community_group_list_mine`, `community_group_accept_invite`) are last touched by **176, WRITTEN NOT APPLIED** (marked `*`) — their live body is still 170/165's.

| RPC | Last migration | Client wrapper (file:fn) | UI surface | Status |
|---|---|---|---|---|
| community_check_handle | 160 | profile.js:checkHandle | CommunityJoinScreen/EditProfile handle field | EXPOSED |
| community_handle_suggestion | 173 | profile.js:suggestHandle | CommunityJoinScreen prefill | EXPOSED |
| community_is_moderator | 160 | moderation.js:isModerator | CommunityPrivacyScreen (queue link gate) | EXPOSED |
| community_get_me | 161 | profile.js:loadMe/refreshMe | app-wide (useCommunityMe hook) | EXPOSED |
| community_upsert_profile | 175 | profile.js:upsertProfile | CommunityJoinScreen/EditProfileScreen | EXPOSED |
| community_leave | 161 | profile.js:leaveCommunity | CommunityPrivacyScreen "Leave Community" | EXPOSED |
| community_follow | 160 | profile.js:follow | FollowButton | EXPOSED |
| community_unfollow | 161 | profile.js:unfollow | FollowButton | EXPOSED |
| community_respond_follow | 160 | profile.js:respondToFollow | CommunityActivityScreen | EXPOSED |
| community_remove_follower | 161 | profile.js:removeFollower | CommunityFollowersScreen | EXPOSED |
| community_list_follows | 160 | profile.js:listFollows | CommunityFollowersScreen/PeopleList | EXPOSED |
| community_list_followers | 164 | profile.js:listFollowers | CommunityFollowersScreen | EXPOSED |
| community_block | 161 | profile.js:blockUser | ProfileMenuSheet | EXPOSED |
| community_unblock | 160 | profile.js:unblockUser | CommunityPrivacyScreen blocked list | EXPOSED |
| community_mute | 160 | profile.js:muteUser | ProfileMenuSheet | EXPOSED |
| community_unmute | 160 | profile.js:unmuteUser | CommunityPrivacyScreen muted list | EXPOSED |
| community_relationships | 160 | profile.js:relationships | CommunityPrivacyScreen/ProfileScreen | EXPOSED |
| community_set_show_gym | 164 | profile.js:setShowGym | CommunityPrivacyScreen | EXPOSED |
| community_set_show_place | 164 | profile.js:setShowPlace | CommunityPrivacyScreen | EXPOSED |
| community_my_status | 164 | profile.js:myStatus | CommunityHubScreen (moderated-person notice) | EXPOSED |
| community_set_quiet_hours | 164 | profile.js:setCommunityQuietHours | NotificationSettingsScreen | EXPOSED |
| community_set_place | 163 | profile.js:setPlace | CommunityEditProfileScreen/PlacePicker | EXPOSED |
| community_get_profile | 170 | profile.js:getProfile | CommunityProfileScreen | EXPOSED |
| community_publish_programme, community_unpublish_programme, community_get_programme, community_record_programme_use, community_my_programmes, community_search_programmes, community_discover_programmes (7, migrate 160), community_programme_people, community_set_show_programmes (2, migrate 161) | 160/161, EXECUTE revoked by 164 | — (all 9 wrappers deleted client-side) | none | **DEAD (retired)** |
| community_create_post | 170 | feed.js:createPost | CommunityComposeScreen | EXPOSED |
| community_post_set_note | 170 | feed.js:setPostNote | CommunityPostScreen | EXPOSED |
| community_delete_post | 160 | feed.js:deletePost | CommunityPostScreen | EXPOSED |
| community_get_post | 170 | feed.js:getPost | CommunityPostScreen | EXPOSED |
| community_feed | 170 | feed.js:loadFeed | CommunityHubScreen (Following) | EXPOSED |
| community_discover_posts | 160 | feed.js:loadDiscoverPosts | CommunityHubScreen (Discover) | EXPOSED |
| community_react | 160 | feed.js:reactToPost | CommunityPostScreen (Respect) | EXPOSED |
| community_comment | 164 | feed.js:addComment | CommunityPostScreen | EXPOSED |
| community_delete_comment | 160 | feed.js:deleteComment | CommunityPostScreen | EXPOSED |
| community_list_comments | 160 | feed.js:listComments | CommunityPostScreen | EXPOSED |
| community_search_people | 164 | feed.js:searchPeople | CommunitySearchScreen | EXPOSED |
| community_suggested_people | 164 | feed.js:suggestedPeople | CommunityHubScreen (empty-state strip) | EXPOSED |
| community_hub_summary | 176* | feed.js:loadHubSummary | CommunityHubScreen | EXPOSED |
| community_dimensions_me | 170 | — (superseded, no caller) | none — replaced by hub_summary | **DEAD (superseded)** |
| community_dimension | 170 | feed.js:loadDimension | CommunityDimensionScreen | EXPOSED |
| community_dimension_recent | 170 | feed.js:loadDimensionRecent | CommunityDimensionScreen (RECENT) | EXPOSED |
| community_activity | 160 | activity.js:loadActivity | CommunityActivityScreen | EXPOSED |
| community_mark_activity_seen | 160 | activity.js:markActivitySeen | CommunityActivityScreen | EXPOSED |
| community_report | 165 | moderation.js:reportContent | ReportSheet | EXPOSED |
| community_moderation_queue | 165 | moderation.js:moderationQueue | CommunityModerationScreen | EXPOSED |
| community_moderate | 160 | moderation.js:moderate | CommunityModerationScreen | EXPOSED |
| community_connect | 161 | connections.js:connect | ConnectSheet/ConnectButton | EXPOSED |
| community_respond_connect | 161 | connections.js:respondToConnect | ConnectButton/CommunityActivityScreen | EXPOSED |
| community_withdraw_connect | 161 | connections.js:withdrawConnect | ConnectButton | EXPOSED |
| community_remove_connection | 161 | connections.js:removeConnection | ConnectButton/CommunityConnectionsScreen | EXPOSED |
| community_list_connections | 161 | connections.js:listConnections | CommunityConnectionsScreen | EXPOSED |
| community_set_connect_from | 161 | connections.js:setConnectFrom | CommunityPrivacyScreen | EXPOSED |
| community_set_partner | 161 | connections.js:setPartner | CommunityTrainingProfileScreen | EXPOSED |
| community_update_training_profile | 172 | trainingProfile.js/trainingConsistency.js | CommunityTrainingProfileScreen | EXPOSED |
| community_find_people | 170 | findPeople.js:findPeople | CommunityFindPeopleScreen | EXPOSED |
| community_gym_summary | 162 | findPeople.js:gymSummary | CommunityDimensionScreen (gym) | EXPOSED |
| community_gym_suggest | 162 | findPeople.js:gymSuggest | none — no caller | **WRAPPED-UNUSED** |
| community_conversations | 161 | messages.js:listConversations | CommunityConversationsScreen | EXPOSED |
| community_messages | 161 | messages.js:listMessages | CommunityConversationScreen | EXPOSED |
| community_send_message | 164 | messages.js:sendMessage | CommunityConversationScreen | EXPOSED |
| community_respond_session | 164 | messages.js:respondSession | CommunityConversationScreen (SessionSheet) | EXPOSED |
| community_mark_conversation_read | 161 | messages.js:markRead | CommunityConversationScreen | EXPOSED |
| community_delete_message | 161 | messages.js:deleteMessage | MessageBubble long-press | EXPOSED |
| community_board | 170 | boards.js:loadBoard | CommunityBoardScreen/GymWeekBoard | EXPOSED |
| community_respect_all | 170 | respect.js:respectAll | RespectAllRow | EXPOSED |
| community_group_create | 165 | groups.js:createGroup | CommunityGroupCreateScreen | EXPOSED |
| community_group_update | 165 | groups.js:updateGroup | CommunityGroupScreen (edit) | EXPOSED |
| community_group_close | 165 | groups.js:closeGroup | CommunityGroupScreen | EXPOSED |
| community_group_leave | 165 | groups.js:leaveGroup | CommunityGroupScreen | EXPOSED |
| community_group_join | 165 | groups.js:joinGroup | CommunityGroupScreen/search result | EXPOSED |
| community_group_approve | 165 | groups.js:approveGroupRequest | CommunityGroupMembersScreen | EXPOSED (untested screen, B-06) |
| community_group_remove | 165 | groups.js:removeGroupMember | CommunityGroupMembersScreen | EXPOSED (untested screen) |
| community_group_promote | 165 | groups.js:promoteGroupMember | CommunityGroupMembersScreen | EXPOSED (untested screen) |
| community_group_invite | 165 | groups.js:inviteToGroup | GroupInviteSheet | EXPOSED |
| community_group_invite_link | 165 | groups.js:createGroupInviteLink | GroupInviteSheet | EXPOSED |
| community_group_accept_invite | 176* | groups.js:acceptGroupInvite | deep-link handler / CommunityGroupScreen | EXPOSED |
| community_group_list_mine | 176* | groups.js:listMyGroups | CommunityHubScreen "My groups" | EXPOSED |
| community_group_get | 170 | groups.js:getGroup | CommunityGroupScreen | EXPOSED |
| community_group_members | 165 | groups.js:listGroupMembers | CommunityGroupMembersScreen | EXPOSED (untested screen) |
| community_group_search | 165 | groups.js:searchGroups | CommunitySearchScreen (groups segment) | EXPOSED |
| community_group_feed | 170 | groups.js:loadGroupFeed | CommunityGroupScreen (feed tab) | EXPOSED |
| community_friends_trained_today | 171 | src/lib/widgets/friends.js | Android home-screen widget (native) | EXPOSED |
| gyms_search | 168 | gyms/index.js:search | GymPicker | EXPOSED |
| gyms_near | 168 | gyms/index.js:near | none — no caller (no `expo-location` dep) | **WRAPPED-UNUSED** |
| gyms_in_place | 167 | gyms/index.js:inPlace | none — no caller | **WRAPPED-UNUSED** |
| gyms_get | 167 | gyms/index.js:get | GymDetailSheet | EXPOSED |
| gyms_suggest | 162 | gyms/index.js:suggest | GymPicker autocomplete | EXPOSED |
| gyms_place_centroid | 167 | gyms/index.js:placeCentroid | PlacePicker | EXPOSED |
| gyms_submit | 163 | gyms/index.js:submit | CommunityGymAddScreen | EXPOSED (untested wrapper, B-06) |
| gyms_confirm_submission | 162 | gyms/index.js:confirmSubmission | CommunityDimensionScreen (confirm row) | EXPOSED (untested wrapper) |
| gyms_report | 162 | gyms/index.js:report | GymDetailSheet/ReportSheet | EXPOSED (untested wrapper) |
| gyms_review_submission | 162 | none | none — moderator SQL-only | **DEAD** |
| gyms_review_report | 162 | none | none — moderator SQL-only | **DEAD** |
| community_set_gyms | 163 | gyms/index.js:setGyms | CommunityEditProfileScreen | EXPOSED |

**Tally (101 distinct RPCs): 86 EXPOSED, 3 WRAPPED-UNUSED (`gyms_near`, `gyms_in_place`, `community_gym_suggest`), 12 DEAD (9 revoked programme RPCs collapsed into one row + `community_dimensions_me` superseded + `gyms_review_submission` + `gyms_review_report`), 0 MISSING.** (`delete_user_data` and the `_community_*`/`_gyms_*` internal helpers are excluded per the brief.)

---
## Question 2 — Feature completeness

Complete end-to-end (UI→RPC→table→back), evidenced in the RPC map: profile, follow, block/mute, connect, message (no media/groups, 1000-char cap), post/react/comment, groups (create/join/invite-by-handle/invite-link/approve/promote/remove/close/search/feed), boards, dimension/cohort pages, gym picker/add/report/confirm, moderation queue, privacy toggles, leave Community, rules re-acceptance (`_community_require_rules` confirmed live in every mutating RPC body checked; the `rules_outdated` client redirect itself, doc 04 §8 finding 9, not re-verified line-by-line this pass).

**Absent by founder order, not by gap:** programmes — see B-13. **Partial/dead-end found:** a pending gym submission/report has no moderator screen (B-03); `community_gym_suggest`/`gyms_near`/`gyms_in_place` are dead ends only in that nothing routes to them, not a UI element that no-ops. Targeted grep for `TODO\|FIXME\|not yet implemented` across `src/lib/community/*.js`/`src/screens/Community*.js` → 0 hits: the tree is clean of parked-work markers.

**What a much better version does:** ships a minimal moderator screen for gym submissions/reports rather than leaving those two RPCs SQL-only.

---
## Question 3 — Legacy Partners vs Community

`src/lib/partners/` **does not exist** (`ls` fails); no Partner screens exist. `RootNavigator.js:902-921` keeps only a **rewrite**: `LEGACY_PARTNER_PATH` turns `volyume://partner/<CODE>` / `.../partner/<CODE>` into `community?legacyPartnerCode=<CODE>`. `CommunityHubScreen.js:142-149,542-568` shows a one-time dismissible card, "Partner invites have moved" / "Training partners are now part of Community. Search for the person who sent this and follow each other.", with "Find people" and "Dismiss" (`accessibilityLabel="Dismiss the partner invite notice"`, the brief's exact string). **No user-visible duplication found**: no Partner UI remains to confuse against Connect.

**Conversion** (`migrate_160_community.sql:1196-1237,1671,1694`, `_community_convert_partnerships`, runs inside `community_upsert_profile` on create and update): any caller `partnerships` row with `status='active'` whose other member **already has a Community profile** becomes an accepted mutual follow. With `community_profiles=2` and `legacy partnerships=13` in production, at most one pair could have converted; the rest sit inert until their other member ever creates a profile.

**What's still waiting on migration 155**: not schema — 155 tightens the `partner_cheers` INSERT policy (closes an arbitrary-date rate bypass). The vulnerable client fallback (`insertCheerDirectly`, local-date `sent_on`) was deleted with all of `src/lib/partners/` — **client side is done**. `supabase/README.md` and CLAUDE.md's STATUS line both still read 155 PENDING, waiting on confirmation that no build holding the old fallback is still on a real device (a store-rollout fact, not a code task) — B-07.

One deliberate, documented residual, not a duplication risk: `CATEGORY.PARTNER_CHEER` stays in `notifications/categories.js:45-46, 156-157`/`categoryPrefs.js:97-100` "so old pushes resolve" — dead infrastructure kept only for legacy-push compatibility.

---
## Question 4 — Privacy receipt vs reality

`PrivacyReceipt.js:37-50`, verbatim: shown — "Your handle and name", "Styles, goal, gym and area you type", "Sessions you choose to share", "Stories you post", "Training profile: only the bands you choose"; never — "Bodyweight or body data", "Food and nutrition", "Progress Scan and photos", "Injuries, coaching, check-ins", "Where you are now, or exact times".

Traced against the **current** `_community_profile_card` body (`migrate_172_community_pr_count.sql:302-393`): returns exactly handle/display_name/avatar_preset/bio/styles/discipline_keys/goal/setting/area_label/place_label/gym_id/gym_label (gated `v_viewable`, and for gym/place also `show_gym`/`show_place`), follow/connection counts, `tp_*` bands, `age_band`, and the nine `c_*` consistency counters plus `c_prs_4w` (gated `v_show_consistency`: owner's own `share_consistency` toggle, active, not-minor). **No bodyweight, body-fat, food, Progress Scan, injury, coaching, or check-in field appears anywhere** — receipt matches reality here.

`SENSITIVE_COMMUNITY_KEYS` (`validation.js:65-76`, ~30 keys incl. `bodyweight/body_fat/height/date_of_birth/kcal/calories/first_name/email/scan/progress_scan/capability/injury/ed_pattern/starting_weight/user_id`) is banned recursively (depth-bounded 12) client AND server (`_community_forbidden_keys`); `POST_PAYLOAD_KEYS` (`validation.js:87-99`) is now **pr/session/block/milestone only** — the `programme` kind is gone too (B-13), so a PR's `weight` field is the only number ever shared, and it is training performance, never bodyweight.

**Place/gym precision — no raw coordinate ever reaches another user.** `place_lat`/`place_lng` are "the PUBLIC centroid of a [postcode/town]" (`migrate_163:273`), used only server-side inside `_gyms_distance_m` to compute a PLACE_BAND_MILES bucket (`0/5/10/25`, `findPeople.js:316`); the profile card never returns the raw lat/lng, only `place_label`. Gym coordinates are the venue's own public address, not a person's location.

**Nuance, not a mismatch**: the receipt lists gym/area under "Others can see" without stating the `show_gym`/`show_place` opt-out — true by default, and turning either off makes reality *more* private than the receipt implies, the safe direction.

**One real gap (B-02)**: consistency-sharing's calm/ED withhold is client-only. **What a much better version does:** add a `show_gym`/`show_place` line to the receipt, and close B-02 with a server-side `v_show_consistency` check.

---
## Question 5 — ED-safety in Community

`keywordFilter.js:24` (client `BLOCKED_TERMS`) and `_community_blocked_terms()` (`migrate_160`, `IMMUTABLE SQL`) carry **the same list, term for term** — that function's own comment: "The client check is the courtesy, this one is the rule." Both run on every free-text write. Scope: self-harm instructions, pro-ED vocabulary (thinspo/pro ana/ana buddy), slurs — deliberately **not** ordinary swearing.

**Report reasons** (`REPORT_REASONS`, `validation.js:204`) include `harmful_body_or_eating_content`; `community_report` (`migrate_165:1399-1457`) sets `priority = (_reason = 'harmful_body_or_eating_content')` at insert — never queued behind spam.

**Calm mode / open ED flag**: `CommunityDimensionScreen.js` gates the **seven physique-discipline cohort pages** (`PHYSIQUE_DISCIPLINE_KEYS`, `validation.js:173`) behind a fail-closed `suppressed` state (`useState(true)`, resolved by `readEdOrCalmSuppressed(uid)`, `:314-328`): under calm mode or an open flag the page renders only a standing Beat UK signpost and "This page is resting just now." (`:570-579`). **Boards and the progress strip are NOT gated the same way** — `ProgressStrip.js`, `DayDots.js`, `useCommunityMe.js` carry no calm/ED reference at all. Reads as **intentional**: those surfaces carry session-count/streak data only (SD-30: "training data only, never bodyweight or food"), outside the app's calorie/weight ED-floor scope — but see B-02 for the one place this intent has no server-side backstop.

Beat UK signposting (`CommunityDimensionScreen.js:149,174-180`, "Support with eating and body image: Beat") is standing, not conditional, on every physique-division page; confirmed present, not proposed for removal (inviolable). No proactive scan of stories/messages beyond the keyword list, unchanged from prior docs.

**What a much better version does:** close B-02; nothing else proposed — this area is well built and inviolable by CLAUDE.md §2 regardless.

---
## Question 6 — Moderation end to end

Report → queue → action → notification, traced against the **current** (migrate_165) bodies: `ReportSheet` → `reportContent()` (`moderation.js:48-63`) → `community_report` → `community_reports` insert (`priority` flag set) → `_community_auto_hide('post'|'comment', target)` only for those two kinds (`migrate_165:1457-1463`; groups/profiles/messages never auto-hidden, "suspension is a human decision") → `CommunityModerationScreen.js` reads `community_moderation_queue` (gated `community_is_moderator()`) → `moderate()` → `community_moderate` writes `community_moderation_log` and flips content/account state → **no notification of any kind reaches the affected user** (its only writes are the log and the target row; no activity insert, no `notifyCommunityEvent` call) — they find out only by trying to act and being refused, or content silently vanishing. Matches the Sept-7 finding, still true.

**AUTO_HIDE_REPORTS = 3** both places: client `limits.js:75`, SQL `_community_auto_hide` (`migrate_160:1155-1176`, `v_reporters < 3`); SQL is authoritative, the client constant is UI copy only. **Block/mute**: server-side filtering, not client — every read RPC (feed, discover, find_people, search, conversations, messages) carries `NOT _community_is_blocked(...)`/mute-exclusion in its own WHERE clause (re-spot-checked on current bodies, all present).

**Rate limits — 39 distinct action keys** rate-checked across `migrate_160`-`176` (follow/connect/message/post/comment/report/profile_upsert/group_*/gyms_*/set_*/respect_all/handle_suggest, etc., full list grepped from every `_community_rate_check(` call site); **SQL is authoritative**, client `limits.js` mirrors a subset for copy only. Production's **`community_rate_events=58` against 2 profiles** is plausible with no anomaly implied: two accounts device-walking follow/connect/message/report/profile-upsert/group-create/gym-submit (inference, matches the campaign's own device checklists, not confirmed against telemetry) across 39 kinds easily reaches 58; the highest-traffic reads (`find_people`, `search_people`, `dimension`, `activity`, `feed`, `discover_posts`) are **not** rate-checked at all, so browsing alone contributes zero rows.

**The one production moderator**: `community_moderators` has exactly one INSERT in the whole migration set (`migrate_160:527`, the marketing admin address), appearing elsewhere only in account-deletion cascades — **no RPC to add/remove a moderator**, SQL-only, as the brief suspected. **While a report is pending**: content stays `'visible'` until the 3-reporter auto-hide threshold; no "under review" state is shown to anyone.

**What a much better version does:** a calm, generic in-app notice on moderation action instead of silence, and an RPC-backed way to add a second moderator without hand SQL.

---
## Question 7 — Gym directory

Production counts match the prior pipeline audit almost exactly (`gym_venues=46,816` vs `46,817` independently recounted 2026-09-07, one row's difference). The directory is now **live and seeded** (contradicts the Sept-7 doc's "infrastructure only" framing — the governing fact above).

**GymPicker** → `gyms_search` (latest, `migrate_168:117`): postcode-exact path, else token array-overlap + brand-alias + town-key + last-token prefix, ranked `brand_match DESC, town_match DESC, distance_m ASC NULLS LAST, name ASC` after a generic-word strip (fixes the "volt gym" 4,075-row collision found 2026-09-07, verified against production per the README's re-check). **Location permission**: the app has **no `expo-location` dependency at all** — distance bands come only from a typed postcode's server-resolved sector centroid, never a device coordinate; `gyms_near` is fully built, tested at the SQL layer, and **unreachable from the UI** (WRAPPED-UNUSED) — a recorded, deliberate deviation (GD-10), not a bug, but "near me" as commonly understood does not exist client-side. `gyms_suggest` delegates to `gyms_search(_q,_lat,_lng,8)` so the two can never silently disagree (comment preserved across 162/163/167).

**gyms_submit/confirm/report**, current (`migrate_163`): text-only Jaccard duplicate check (brand-alias/outward/"uk" stripped both sides), postcode-sector geocoding only (never exact address), 3/24h submit rate, second independent confirmer (or moderator) flips `pending → open`. **GymDetailSheet.js**: name, full address, town, postcode, conditional "Visit website" — **no opening hours, no member counts anywhere** (matches the founder's gap-closure ruling, "REJECT... not a training-partner need and no licensed source" — by design).

**Quality risk, unchanged from the Sept-7 pipeline audit** (data untouched since): duplicate rate in the "likely" review queue estimated 15-40% true-positive by independent sample; a confirmed uncaught pair (Ravenscraig, Motherwell) sits outside all blocking radii; the canonical id (UUIDv5 over the "best" source member) is **not stable** across a future pipeline re-run reselecting a different best member. The client does nothing beyond the 2-confirmer/moderator gate and `rank.js`'s re-ranking — not independently re-verified this pass beyond confirming no new gym-directory migration exists since 168.

**What a much better version does:** wire a minimal moderator screen for `gyms_review_submission`/`gyms_review_report` (B-03).

---
## Question 8 — Engineering

**Online-first (SD-13), unchanged**: `hubCacheKey`/`meCacheKey` (`feed.js:28`, `profile.js:21`) write to AsyncStorage on every successful `loadHub`/`loadMe`; any read failure falls back to cache, returning `fromCache: true, error: e?.code` (`feed.js:139-146`, `profile.js:118-133`). No SQLite table added for Community.

**Error handling**: `transport.js`'s `rethrow()` splits expected server refusals (`EXPECTED_CODES`) from unanticipated shapes — only the latter calls `logError` (Sentry-bound); a deliberate refusal is never logged as a defect (`isExpectedCommunityRefusal`, `transport.js:99-110`). `.catch(() => {})` sites found: `notify.js:41-44` (push hand-off, explicitly intentional) and `invite()` in `CommunityDimensionScreen.js:301-306` (share-sheet dismissal) — both narrow and commented, not hiding a real failure in the sample checked.

**Realtime**: confirmed **no subscription of any kind** for messages. `CommunityConversationScreen.js:67,221-224`: `POLL_MS = 20000` while the screen has focus; the conversations LIST screen (`CommunityConversationsScreen.js:81`) reloads only on `useFocusEffect` — **no interval at all** — so a message arriving while on the list is not seen until refocus or pull-to-refresh. **Pagination**: keyset cursors are minted server-side and opaque; the client never constructs one.

**Race conditions**: `GymPicker.js` guards text search and near-me/place-centroid calls with an incrementing `seqRef`/`nearSeqRef`, discarding stale responses (`:158-176,202-225`) — no flicker bug found. Double-tap protected on `FollowButton.js:62-67`/`RespectAllRow.js:44,65`; not independently re-verified on `ConnectButton`/`ConnectSheet`.

**Deep links**: `WEB_ORIGIN = 'https://volyume.app'` (`links.js:23`, exact-host, never `startsWith`); four forms `u`/`s`/`g`(+invite token)/a retired `p` that now resolves in-app to the Hub (`links.js:75-79,184-186`). Web fallback: `community-public` serves static `public/{u,s,g}/index.html` with a real Play Store link and, as of this pass, a **real** iOS App Store link (fixed, B-08); `public/p/index.html` is stale dead code (B-05). No `og:*` tags on any page (B-08, still open).

**Notifications**: see B-01 (blocker) — the truth the brief asked for. The server mechanism (`community-notify`) is correctly built, deployed, verified against production, and now honours quiet hours (B-10, fixed) and a daily reaction-push collapse — but the client only calls it for two of nine-plus event kinds. **Nobody is notified of a follow, a connect request, an accepted connection, a new message, or any group event on another device, ever**, under the shipped client.

**Tests** (up from the Sept-7 snapshot): 22 community lib, 21 component, 23 screen, 5 gym-lib test files, plus guard tests (`community.rpcOnly`, `.privacy`, `.transport`, `.migrationShape`, `gyms.rpcOnly`, one `migrateNNN.rpcOnly.guard.test.js` per guard-proved migration 170-176). **Gaps**: `respect.js` lib module untested (B-06); `gyms/index.js`'s `submit`/`confirmSubmission`/`report` wrappers untested; `CommunityGroupMembersScreen.js` has no test file (though `groups.js` lib functions are covered by `groups.test.js`); of 37 Community components, 21 have a dedicated test file — the other 16 (`ConnectSheet`, `ProfileMenuSheet`, `ReportSheet`, `MessageComposer`, `GroupInviteSheet`, etc.) are exercised only indirectly via screen-level tests — real coverage, not isolated unit coverage.

**What a much better version does:** close B-01 first — the single highest-leverage fix in this lane for adoption; a "connection" product where nobody is told about a connection looks dead regardless of backend.

---
## Question 9 — Side findings

- Two tooling tables, `public.claude_seed_files`/`claude_schema_migrations`, have **no RLS** (ERROR-level). Not Community tables; state only.
- **26 functions with a mutable `search_path`** (WARN): OBSERVED — every `community_*`/`gyms_*`/`_community_*`/`_gyms_*` definition across `migrate_160`-`176` (262 definitions, 264 pin occurrences; an awk-window false positive on `_community_rate_check` was checked and disproved by direct read, `migrate_160:869-880`, `migrate_166:61-71`, `migrate_167:84-94`) pins `SET search_path`. This SUGGESTS (inference, no live catalogue query run, out of this lane's bound) the 26 flagged functions sit outside Community/gyms entirely, likely pre-existing (migrations 001-159). Not independently enumerable without a `pg_get_functiondef` scan.
- **Leaked-password protection is off** (WARN): an auth-tenant setting, not Community-specific; state only.
- `migrate_170`'s own apply-verification already flagged, worth restating: `_community_rate_check` (a `_`-prefixed helper) is **executable by `authenticated`** (granted by `migrate_166`, re-issued by `167`) — unlike every other helper, which carries no client grant. Low severity (only lets a client write its own rate row early); breaks the otherwise-uniform "helpers have no grant" pattern.

---
## Guards that pin current behaviour

- `src/__tests__/community.rpcOnly.guard.test.js`, `community.privacy.guard.test.js`, `community.transport.guard.test.js`, `community.migrationShape.test.js`, `gyms.rpcOnly.guard.test.js`
- `src/__tests__/migrate170.rpcOnly.guard.test.js` … `migrate176....` (one per guard-proved migration, named in `supabase/README.md`'s apply notes)
- `src/lib/community/__tests__/keywordFilter.test.js` (client/server term parity)
- `src/lib/community/__tests__/validation.test.js` (key/payload allow-lists)
- `src/lib/community/__tests__/transport.test.js` (gate order, fail-closed consent)
- `src/lib/notifications/__tests__/communityCategories.test.js`
- `src/navigation/__tests__/linkingConfig.test.js` (`/partner/*` rewrite, `/u|p|s|g`)

---
## Questions for the lead

1. **B-01 (blocker), product scope, not just a bug**: should `notifyCommunityEvent` be wired for follow/connect/message/group events (the server already supports all of them), or is silence on those kinds a deliberate, unrecorded choice? No decision record (SD/CR/D-nn) rules this either way — reads as an oversight, not confirmed as one.
2. **B-02**: is client-only calm/ED enforcement on consistency-sharing an accepted risk (training-only, outside the CLAUDE.md-inviolable ED floors), or should it be lifted server-side to match the physique-cohort-page pattern? ED-safety-adjacent; flagged, not fixed.
3. **B-05**: worth cleaning up the stale `public/p/index.html` (now always 404s), or intentionally left as dead weight?
4. Confirming the 26 mutable-`search_path` functions are unrelated to Community/gyms needs a live catalogue query, outside this lane's read-only, no-Supabase-call bound — flagging rather than closing it.
