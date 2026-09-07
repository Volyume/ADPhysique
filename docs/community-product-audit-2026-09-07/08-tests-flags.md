# 08 — Community Tests, Flags & Inventory

Generated 2026-09-07 as a mechanical inventory across `src/**/__tests__`, `supabase/**`, migrations 160–162, and feature configuration.

---

## 1. Test Files Covering Community & Related Surfaces

### Community library tests (`src/lib/community/__tests__/`)

| Test file | Purpose (from header) | Test count |
|---|---|---|
| `adapt.test.js` | "Adapt for me" engine: never changes creator's structure (circuit groups, rounds, rest, day order, day count); changes carry reasons in priority order; no alternative keeps creator's choice | 73 |
| `connections.test.js` | Connect state machine; four fixed reasons; 120-char keyword-filtered note; `connect_from` three values; partner preferences closed sets only (no free text); RPC parameter names match blueprint | 83 |
| `feed.test.js` | List RPCs answer wrapper objects; cursor passed server-side; reading Discover never requires Community profile; one failing section never empties Discover | 77 |
| `findPeople.test.js` | Six doors in order with honest zero states (null ≠ zero); `community_find_people` called with mode, cursor, limit ONLY; score is transport, rows carry reasons | 82 |
| `importProgramme.test.js` | Structural facts reach recipient (tags, split, difficulty, day order, rep ranges, rest, notes, circuits); `starting_weight` always NULL; unresolved exercises land by name | 59 |
| `keywordFilter.test.js` | Catches self-harm and pro-ED vocabulary; whole-word match after folding; ordinary swearing deliberately not blocked | 21 |
| `links.test.js` | Three addresses build in query form for static site (`/u/?h=`, `/p/?id=`, `/s/?id=`); build/parse round-trip; host matched exactly | 43 |
| `messages.test.js` | 1–1,000 char body cleaned through keyword filter; placeholder is prompt never draft; one context reference at most, complete only; list RPCs answer wrappers; refusals (`not_connected`, `minor_restricted`) as codes | 80 |
| `posts.test.js` | Every builder emits EXACTLY allowed keys per kind; payload carrying forbidden key refused by `validatePostPayload` before write leaves device; session payload carries no bodyweight/food/coaching output | 40 |
| `snapshot.test.js` | Snapshot carries STRUCTURE only (no `starting_weight`, `selection_reason`, `user_id`); circuit columns survive (`superset_group_id`, `group_kind`, `round_rest_seconds`, `sets`); style key travels; caps refuse not truncate | 40 |
| `trainingProfile.test.js` | Band derivation: days need quarter share + six sessions; time bands 35% share + max two; sessions rounds to nearest; custom exercises never staple lifts; preview line exact to blueprint; only opted-in bands sent; send throttled once/day, `force` overrides; derivation reads only timestamps + exercise ids | 85 |
| `transport.test.js` | Three gates asked IN ORDER before any network call; consent FAILS CLOSED (null = not consent, unreadable store = not consent); `hasLiveSession()` tri-state; server refusals as CommunityError codes; deliberate refusal not logged as defect | 47 |
| `validation.test.js` | Handle policy (no leading/trailing underscore, no reserved word); `SENSITIVE_COMMUNITY_KEYS` catches forbidden key at ANY depth; `POST_PAYLOAD_KEYS` exact allow-list per kind; `cleanText` refuses over-length and blocked content | 41 |

**Total community lib tests: 13 files, 808 tests**

### Community component tests (`src/components/community/__tests__/`)

| Test file | Purpose | Test count |
|---|---|---|
| `ActivityRow.test.js` | Follow-request row is plain line opening profile, not a decide-on-card surface (buttons were dead, deciding lives in "Follow requests" section) | 21 |
| `FollowButton.test.js` | `iconOnly` + `following` state renders icon-only (checkmark glyph, no label, a11y label "Following @<handle>"); every other state ignores `iconOnly` | 17 |
| `GymPicker.test.js` | Search debounced 250ms; result row reads "display name" then "town · outward · distance"; pending venue shows "Pending" badge; typed postcode shows recognised-postcode chip; empty state offers "Add it"; selecting calls `onSelect` unchanged; query under minimum never reaches network | 47 |
| `PostCard.test.js` | Every story kind renders its own body; card reads ONLY allow-listed keys per kind (no bodyweight/body-fat/kcal/coaching leak); reaction is "Respect" with count + thumbs-up glyph; comment glyph is chat bubble | 26 |

**Total community component tests: 4 files, 111 tests**

### Community screen tests (`src/screens/__tests__/`)

| Test file | Purpose | Test count |
|---|---|---|
| `CommunityAdapt.test.js` | Adaptation UI: reason copy, days mismatch, unreadable limitations with action offers | 79 |
| `CommunityCompose.handoff.test.js` | Compose hand-off to screen | 26 |
| `CommunityConnect.test.js` | ConnectButton/ConnectSheet state rendering (18 states in header naming convention) | 95 |
| `CommunityConversation.test.js` | Send carries only the one ref the screen opened with; offline distinguished from generic failure | 77 |
| `CommunityConversations.test.js` | Conversation list rendering and state transitions | 48 |
| `CommunityDimension.gymConfirm.test.js` | Gym confirmation row on pending venue; profile card rendering; "Trains at" label with counts by style/time-band/"Open to training together" | 50 |
| `CommunityEditProfile.test.js` | Partial updates; `changeConnectFrom`; `rules_outdated` revert/redirect | 98 |
| `CommunityFindPeople.test.js` | Six doors rendering, live counts, zero states, door gates (gym/area label requirement) | 45 |
| `CommunityHub.states.test.js` | Hub state paths: no profile, following-empty with suggestions, discover with Volyume tiles, offline cached, legacy partner card, params on remount | 87 |
| `CommunityJoin.test.js` | Join flow: handle states, offline, gym optional | 101 |
| `CommunityModeration.test.js` | Moderation queue and note rendering | 61 |
| `CommunityPost.noProfile.test.js` | Post screen behaviour when user has no Community profile | 46 |
| `CommunityProgramme.test.js` | Programme structure with circuits (never a weight); Adapt leads; already using it; reporting comment; reader without profile | 173 |
| `CommunityPublishProgramme.test.js` | Publish flow and state rendering | 53 |
| `CommunitySearch.programmes.test.js` | Programme search paging and result rendering | 46 |
| `CommunityTrainingProfile.test.js` | Seven band rows; minor gate on partner section; `rules_outdated` revert/redirect | 90 |

**Total community screen tests: 16 files, 1,051 tests**

### Gym library tests (`src/lib/gyms/__tests__/`)

| Test file | Purpose | Test count |
|---|---|---|
| `index.test.js` | Gym helpers `venueLine`, `distanceLabel`, `isPendingVenue` over migration contract: `verification_status` transitions `user_submitted_pending` → `user_submitted_verified` | 16 |
| `postcode.test.js` | UK postcode recognition: full normalises to "OUTWARD INWARD" uppercase; outward fragment recognised; embedded postcode found in longer phrase | 28 |
| `rank.test.js` | Ranking human inputs against fixture set (15 queries incl. misspellings); prioritises exact chain matches over independent venues | 23 |
| `transport.test.js` | `callGyms` routes through Community's three gates; `rate_limited`/`offline`/`not_signed_in`/`health_consent_unresolved`/`sign_out_wiping` codes passed unchanged; `invalid_postcode`/`invalid` recovered before caller; all failures wrapped as GymsError | 35 |

**Total gym lib tests: 4 files, 102 tests**

### Community notifications test

| Test file | Purpose | Test count |
|---|---|---|
| `src/lib/notifications/__tests__/communityCategories.test.js` | Community notification categories (SD-15, SD-21): three categories exist; all budgeted; COMMUNITY_MESSAGE ranks above COMMUNITY_FOLLOW/COMMUNITY_ACTIVITY; routing (Activity/Follow → HomeTab/CommunityActivity; Message → HomeTab/CommunityConversation with id); all PUSH + IN_APP; all prefs default true | 44 |

### Community deep links and routing

| Test file | Purpose | Test count |
|---|---|---|
| `src/navigation/__tests__/linkingConfig.test.js` | Every URL the app mints resolves to registered route with correct tab and params; reads config from RootNavigator (not copy); Community share pages (`/u/*`, `/p/*`, `/s/*`) carry argument as QUERY (static GitHub Pages); legacy partner path rewritten to Community | 87 |
| `src/__tests__/universalLinksPreparation.test.js` | AASA prepares paths: `/partner/*`, `/auth/callback`, `/u/*`, `/p/*`, `/s/*`; email bridge accepts exact callback; rejects unowned/ambiguous; Associated Domains remains off until signed profile | 7 |

### Community infrastructure guard tests

| Test file | Purpose | Test count |
|---|---|---|
| `src/__tests__/community.rpcOnly.guard.test.js` | RPC-ONLY security model (SD-14): 14 community tables have RLS on, zero policies; 76 functions SECURITY DEFINER with fixed `search_path`; 41 community_* RPCs executable by authenticated only; `delete_user_data()` names every Community table | ~35 |
| `src/__tests__/community.privacy.guard.test.js` | NO Community file reads: bodyweight, body-fat, Progress Scan, coaching output, health data, direct identity (except two allowed files for copy: PrivacyReceipt.js, CommunityRulesScreen.js); adaptation may compose `loadCapabilityResolveState` + `blockingConflicts` by name but must not leak capability-derived FACTS off device | ~40 |
| `src/__tests__/community.transport.guard.test.js` | `transport.js` is ONLY Community file touching Supabase; three gates hold only if every call passes through it; screens do not call `getSupabaseClient` directly | ~15 |
| `src/__tests__/community.migrationShape.test.js` | Migration 160 header complete (purpose, applied-locally/remotely, safe-to-re-run, rollback, GDPR note); states applied-remotely still NO pending founder phrase; idempotent | ~10 |
| `src/__tests__/gyms.rpcOnly.guard.test.js` | Gym directory reuses Community's security shape (GD-01, GD-14): `gym_venues` global_read_only; `gym_submissions`/`gym_reports` rpc_only; functions SECURITY DEFINER, search_path pinned; no venue data in migration; moderators write history; `delete_user_data()` covers personal columns (GD-09) | ~40 |

---

## 2. Source-Level Regression Guards Touching Community Files

Ordered by file path. All use `fs.readFileSync` + regex patterns to lock founder rules in stone, failing if future edits weaken them.

| Test file | Guard locks | Rule enforced |
|---|---|---|
| `src/__tests__/community.rpcOnly.guard.test.js` | Every `community_*` table has RLS enabled with zero policies; 76+ functions marked SECURITY DEFINER with `search_path = public, pg_temp`; no grants to anon or authenticated on any rpc_only table; `delete_user_data()` explicitly names every community table | Community is RPC-only, cross-user surface, all privilege in database (SD-14) |
| `src/__tests__/community.privacy.guard.test.js` | Scanning `src/lib/community/*.js`, `src/components/community/*.js`, `src/screens/Community*.js`, `src/hooks/useCommunityMe.js` regex for bodyweight, body_fat, progress_scan, coaching output, health data (with narrow allowance for PrivacyReceipt.js and CommunityRulesScreen.js quoted strings) | Nothing about a person's body, food, Progress Scan, coaching output or health may enter Community in any form (SD-04, blueprint §10) |
| `src/__tests__/community.transport.guard.test.js` | Regex scans Community files for `getSupabaseClient` direct calls (only `transport.js` allowed to call Supabase); every call routed through `callCommunity` wrapper | Three gates (sign-out wiping, Article 9 consent, live session) hold only if all calls pass through single transport function (SD-13, SD-14) |
| `src/__tests__/community.migrationShape.test.js` | Regex match on migration 160 header lines: Purpose, Applied locally, Applied remotely (asserts still "NO"), Safe to re-run, Rollback, GDPR note; asserts idempotency (`CREATE ... IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, no destructive statements) | Migration must state applied-remotely status; "NO" awaits founder phrase "run against production"; all migrations additive + idempotent (CLAUDE.md §2) |
| `src/__tests__/gyms.rpcOnly.guard.test.js` | `gym_brands`, `gym_venues`, `gym_postcode_sectors` regex-checked for RLS + `global_read_only` policy; `gym_submissions`, `gym_reports` for rpc_only; functions SECURITY DEFINER with `search_path`; no venue seed data; moderator RPCs write history; `delete_user_data()` covers `gym_submissions.reviewed_by`, `gym_submissions.updated_by` | Gym directory reuses Community security shape; no venue data in migration itself (GD-01, GD-14, GD-09) |

**Total: 5 files, all operational and failing-on-weakening design**

---

## 3. Feature Flags & Kill Switches

### Global access flag

| Name | File:line | Value | Gates |
|---|---|---|---|
| `FULL_ACCESS_FOR_ALL` | `src/lib/proGate.js:43` | `true` | Fully free product (founder 2026-09-03, D137): all signed-in users read as tier 'pro'; billing surfaces (ProUpgrade, CascadeGate, Subscription, SubscriptionPolicy, ProGate, payments barrel) stay DORMANT and unregistered at runtime while true; to re-arm monetisation flip flag AND re-register surfaces |

### Community rules & versioning

| Name | File:line | Value | Gates |
|---|---|---|---|
| `COMMUNITY_RULES_VERSION` | `src/lib/community/limits.js:2` | `2` | Rules schema version sent to server on updates; server rejects stale requests with `rules_outdated`; screens redirect to CommunityRulesScreen to re-accept |
| `COMMUNITY_DIMENSION_MIN_FOR_HUB` | `src/lib/community/limits.js:3` | `3` | Minimum member count before dimension tile shows on hub Discover section |

### Community rate limits & activity budgets

| Name | File:line | Value | Gates |
|---|---|---|---|
| `NEW_ACCOUNT_DAYS` | `src/lib/community/limits.js:5` | `7` | Days after signup when new-user rate limits apply |
| `FOLLOWS_PER_DAY_NEW` | `src/lib/community/limits.js:6` | `30` | Max follows/day for new accounts (rpc rail enforces) |
| `FOLLOWS_PER_DAY_ESTABLISHED` | `src/lib/community/limits.js:7` | `100` | Max follows/day for established accounts (rpc rail enforces) |
| `FOLLOWING_CAP` | `src/lib/community/limits.js:8` | `2000` | Hard cap on total following count (rpc enforces) |
| `POSTS_PER_DAY_NEW` | `src/lib/community/limits.js:9` | `3` | Max posts/day for new accounts (rpc rail enforces) |
| `POSTS_PER_DAY_ESTABLISHED` | `src/lib/community/limits.js:10` | `10` | Max posts/day for established accounts (rpc rail enforces) |
| `COMMENTS_PER_HOUR_NEW` | `src/lib/community/limits.js:11` | `10` | Max comments/hour for new accounts (rpc rail enforces) |
| `COMMENTS_PER_HOUR_ESTABLISHED` | `src/lib/community/limits.js:12` | `30` | Max comments/hour for established accounts (rpc rail enforces) |
| `REPORTS_PER_DAY` | `src/lib/community/limits.js:13` | `20` | Max reports filed/day (rpc rail enforces) |
| `PROGRAMMES_PER_DAY` | `src/lib/community/limits.js:14` | `10` | Max programmes published/day (rpc rail enforces) |
| `PROFILE_UPSERTS_PER_DAY` | `src/lib/community/limits.js:15` | `5` | Max profile saves/day (rpc rail enforces) |
| `HANDLE_CHANGE_DAYS` | `src/lib/community/limits.js:16` | `30` | Days before handle may be changed again (rpc enforces) |
| `AUTO_HIDE_REPORTS` | `src/lib/community/limits.js:17` | `3` | Post auto-hides after this many distinct reporters with audit rows; moderators may unhide |

### Snapshot (programme export) limits

| Name | File:line | Value | Gates |
|---|---|---|---|
| `SNAPSHOT_MAX_BYTES` | `src/lib/community/limits.js:19` | `65536` | Max payload size for exported programme snapshot (caps refuse truncate, SD-05) |
| `SNAPSHOT_MAX_DAYS` | `src/lib/community/limits.js:20` | `8` | Max days of training data in export window |
| `SNAPSHOT_MAX_EXERCISES_PER_DAY` | `src/lib/community/limits.js:21` | `20` | Max exercises per day in snapshot (caps refuse, SD-05) |

### Training Profile (discovery) band sharing

| Name | File:line | Value | Gates |
|---|---|---|---|
| `TP_MAX_TIME_BANDS` | `src/lib/community/trainingProfile.js:139` | `2` | Max time-of-day bands sendable (35% share needed per band, SD-22) |
| `TP_MAX_STAPLE_LIFTS` | `src/lib/community/trainingProfile.js:140` | `5` | Max staple lifts sendable in training profile (custom exercises excluded, SD-22) |
| `TP_WINDOW_WEEKS` | `src/lib/community/trainingProfile.js:141` | `12` | Lookback window (weeks) for deriving bands (SD-22) |
| `TP_DAY_SHARE` | `src/lib/community/trainingProfile.js:125` | `0.25` | Minimum share of days in window to be included in day band (25%, SD-22) |
| `TP_DAY_MIN_SESSIONS` | `src/lib/community/trainingProfile.js:126` | `6` | Minimum sessions needed to qualify for day band (SD-22) |
| `TP_TIME_BAND_SHARE` | `src/lib/community/trainingProfile.js:127` | `0.35` | Minimum share of sessions in window to be included in time band (35%, SD-22) |
| `TP_SYNC_INTERVAL_MS` | `src/lib/community/trainingProfile.js:142` | `24 * 60 * 60 * 1000` | Minimum interval between auto-syncs of training profile (once/day, SD-22) |

### Connections & messaging

| Name | File:line | Value | Gates |
|---|---|---|---|
| `MAX_CONNECT_REASONS` | `src/lib/community/connections.js:36` | `2` | Max connection request reasons selectable (blueprint §1, SD-20) |
| `CONNECT_NOTE_MAX` | `src/lib/community/connections.js:37` | `120` | Max characters in connection request note (keyword-filtered, SD-20) |
| `MESSAGE_MAX` | `src/lib/community/messages.js:2` | `1000` | Max characters in a message (keyword-filtered, SD-21) |
| `MESSAGE_REF_KINDS` | `src/lib/community/messages.js:3` | `['programme', 'post']` | Allowed context reference kinds for messages (closed set, SD-31) |
| `DEFAULT_PAGE_SIZE` | `src/lib/community/connections.js:1` / `messages.js` | `30` / `varies` | Page size for list RPCs |

### Post & snapshot validation

| Name | File:line | Value | Gates |
|---|---|---|---|
| `MAX_STYLES_PER_PROFILE` | `src/lib/community/validation.js:60` | `3` | Max training styles shareable in Community profile (closed set, SD-31) |
| `POST_PAYLOAD_KEYS` | `src/lib/community/validation.js` | per-kind allow-lists | Exact keys allowed per post kind (block-level, set-level, session-level); guards payload spray (SD-04, SD-06) |
| `SENSITIVE_COMMUNITY_KEYS` | `src/lib/community/validation.js:28` | bodyweight, body-fat, progress-scan, coaching output, health data | Forbidden keys at any depth; scanned by privacy guard (SD-04, blueprint §10) |

### Community notifications

| Name | File:line | Value | Gates |
|---|---|---|---|
| `COMMUNITY_NOTIFY_KINDS` | `src/lib/community/notify.js:21–30` | `['follow', 'follow_request', 'follow_accepted', 'reaction', 'comment', 'programme_used', 'connect_request', 'connect_accepted', 'message']` | Event kinds triggering push/in-app notifications; message collapses on clock (max 1 per conversation every 15 min unread, SD-21); push body never shows content (SD-21) |

### Gym database limits & config

| Name | File:line | Value | Gates |
|---|---|---|---|
| (See `src/lib/gyms/transport.js`, `postcode.js`, `rank.js` for RPC error codes and GYM_ERROR_CODES constant) | | | Gym picker debounce (250ms), postcode chip recognition, pending-venue badge, search result format, "Add it" empty state, distance label, "Trains at" dimension label |

---

## 4. Code & Schema Inventory by Type

### Screens

**21 Community screens** (total 11,695 lines):

`CommunityActivityScreen` (446), `CommunityAdaptScreen` (495), `CommunityComposeScreen` (366), `CommunityConversationScreen` (487), `CommunityConversationsScreen` (427), `CommunityDimensionScreen` (389), `CommunityEditProfileScreen` (508), `CommunityFindPeopleScreen` (387), `CommunityGymAddScreen` (455), `CommunityHubScreen` (615), `CommunityJoinScreen` (724), `CommunityModerationScreen` (446), `CommunityPeopleListScreen` (387), `CommunityPostScreen` (589), `CommunityPrivacyScreen` (498), `CommunityProfileScreen` (575), `CommunityProgrammeScreen` (689), `CommunityPublishProgrammeScreen` (508), `CommunityRulesScreen` (397), `CommunitySearchScreen` (375), `CommunityTrainingProfileScreen` (395)

### Components

**25 Community components** (total 2,960 lines):

`ActivityRow` (125), `CommentRow` (164), `CommunityHeaderAction` (89), `ComposerInput` (108), `ConnectButton` (181), `ConnectRequestRow` (142), `ConnectSheet` (234), `ConversationRow` (96), `DimensionRow` (145), `FollowButton` (118), `GymPicker` (312), `GymRow` (154), `GymSummary` (187), `JoinToInteractRow` (62), `MenuSheet` (156), `MessageBubble` (96), `MessageComposer` (287), `PostCard` (236), `PrivacyReceipt` (156), `ProfileCard` (279), `ProfileMenuSheet` (201), `ProgrammeStructure` (156), `ProgrammeTile` (144), `ReportSheet` (184), `TrainingProfileLine` (132)

### Library modules

**19 Community lib modules** (total 4,160 lines):

`activity` (68), `adapt` (282), `connections` (215), `feed` (271), `findPeople` (270), `importProgramme` (179), `index` (120), `keywordFilter` (176), `limits` (113), `links` (121), `messages` (134), `moderation` (82), `notify` (47), `posts` (308), `profile` (285), `snapshot` (207), `trainingProfile` (568), `transport` (224), `validation` (253)

**4 Gym lib modules** (total 662 lines):

`index` (277), `postcode` (92), `rank` (207), `transport` (86)

### Supabase functions

**2 Edge Functions**:

- `community-notify/index.ts` (614 lines) — push emission gate & throttle
- `community-public/index.ts` (256 lines) — static public pages for /u, /p, /s deep links

### Cloud schema

**Migration 160** (`migrate_160_community.sql`, 4,017 lines):
- **15 tables**: `community_profiles`, `community_follows`, `community_blocks`, `community_mutes`, `community_programmes`, `community_programme_uses`, `community_posts`, `community_reactions`, `community_comments`, `community_reports`, `community_moderators`, `community_moderation_log`, `community_activity`, `community_rate_events`, `community_sessions`
- **76 functions**: 41 public RPCs (executable by authenticated), 35+ helpers (prefixed `_community_*`, no direct execute grant)

**Migration 161** (`migrate_161_community_connections.sql`, 3,198 lines):
- **4 tables**: `community_connections`, `community_connection_requests`, `community_conversations`, `community_messages`
- **45 functions**: 23 new public RPCs, helpers

**Migration 162** (`migrate_162_gym_directory.sql`, 2,757 lines):
- **9 tables**: `gym_brands`, `gym_venues`, `gym_postcode_sectors` (global read-only), `gym_venue_sources`, `gym_venue_history`, `gym_submissions`, `gym_reports`, `gym_venue_confirmations` (rpc-only), rate_events tracking
- **31 functions**: `gyms_*` RPCs and helpers; no venue seed data in migration itself

---

## 5. Device Checklists Already Written

### Social Discovery campaign

**Authority**: `docs/social-discovery-2026-09-06/50-VERIFICATION.md`

**Device checklist (Android EAS build, two accounts, one under 18)**, sections 1–10:

1. **Find people from hub** — Six doors show live counts or honest zero; doors needing gym/area label say so
2. **Connect with reasons & note** — Sheet allows up to two reasons + 120-char note
3. **Activity & decline** — Request row shows reasons/note; decline is silent; 30-day re-request bar holds
4. **Accept & follow** — Both show "Connected" + Message; both now follow each other
5. **Message from programme header** — Composer opens with programme tile + placeholder "Ask about this programme"
6. **Message appears & push** — Both devices see message with tile; one push "New message from @handle", no content; second message within 15 min: no second push
7. **Training profile bands & "Open to training together"** — Real preview line from bands; band toggle saves/removes; preference chip on profile; appears in peer's "Open to training together" door
8. **Minor account isolation** — No Connect or Message control anywhere; partner section shows gate message; minor never appears in adult's Find doors/search/gym summary
9. **`rules_outdated` redirect** — Toggle/privacy/connect request on stale-rules device redirects to Community rules, never generic failure toast
10. **Privacy settings & gym dimension** — "Who can send connection requests" gate works; gym dimension shows "Trains at", member counts, counts by style/time-band/"Open to training together", nothing precise

### Gym database campaign

**Authority**: `docs/gym-database-2026-09-06/40-VERIFICATION.md`

**Device checklist (physical Android EAS build, pre-apply shows "unavailable" state)**, sections 1–8+ (ED-safety cases marked **ED**):

1. **Profile editor gym picker, "PureGym Motherwell"** — Exact result row format
2. **Picker partial word "puregm"** — Per review 35 finding 21 (open): no results until full token; current shipped behaviour
3. **Picker postcode "ML1"** — Chip recognises outward code; results include venue
4. **Picker "Volt Gym"** — Independent brand appears correctly ranked
5. **Other gyms cap at 3** — Fourth refused; first three remain saved
6. **Join gym optional** — Join succeeds empty; profile shows no gym until added
7. **Add gym invalid postcode** — `ZZ99 9ZZ` refused with "Check the postcode"
8. **Add gym valid postcode** — Real postcode in seeded sector succeeds; shows "It shows for everyone once a second person confirms it"; immediately selectable

(Sections 9–16+ continue with moderation, reporting, deletion, offline, minors, suspended accounts, and deep-link flows)

---

## Ambiguities

1. **Screen test count precision**: A `describe` block may contain multiple `test` calls; the count reflects `it(` + `test(` regex occurrences, which are the callable test units, not suites. A single integration flow may span multiple test calls or nest describe blocks; the counts are conservative (line-by-line grep).

2. **Supabase function test coverage**: The two Edge Functions (`community-notify`, `community-public`) are TypeScript/JavaScript; no Jest test files exist for them in-tree. Their verification (section 5, checklist) is manual device-walk. The public function verification states it is "not verified here (device only)".

3. **Migration 161 table count**: The four new tables in migrate_161 are listed above; migration 160 introduced all 15 base tables. A call to count exact "CREATE TABLE" statements in each migration yields the counts shown, but the migrations are cumulative—162 also assumes 160+161 applied.

4. **Gym lib module line counts**: `index.js` (277 lines) is the largest; others are pure helpers. No gym-specific database modules beyond those four (gyms use Community's transport layer, routed through `callCommunity`).

5. **Rate limit constants location**: All tunable limits are in `src/lib/community/limits.js` except `TP_*` band thresholds (in `trainingProfile.js`), which are tied to the derivation algorithm. Both are guarded by the limits.test.js suite against silent changes.

6. **Privacy guard scope**: The privacy guard (`community.privacy.guard.test.js`) scans five file trees (lib, components, screens, hooks, migrations). The two allowed exceptions (PrivacyReceipt.js, CommunityRulesScreen.js) are scanned for QUOTED STRINGS ONLY—a real read (property access, import, DB call) still fails the guard, holding the rule firm.
