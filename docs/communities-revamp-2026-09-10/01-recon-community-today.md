# 01 -- Recon: Community as it is today

Read-only recon for the communities revamp
(`docs/communities-revamp-2026-09-10/README.md`). Standing authority read in
full, treated as fact: `40-GAP-CLOSURE.md` sections 2, 4, 5 and
`60-DESIGN-PROGRESS-COMMUNITY.md` (both in `docs/community-product-audit-
2026-09-07/`, all sections). The map docs (`01-client-inventory.md`,
`04-graph-messaging-privacy.md`, `05-programmes-stories-feed.md`,
`docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`) were used for
orientation only; every claim below is VERIFIED against code at HEAD. The
2026-09-07 inventories predate the gap-closure and the 2026-09-08 founder
correction, so several of their claims are stale (flagged where relevant).
Where a doc and the code disagree, the code wins. No STOP items: every
ambiguity found was resolvable by reading further.

## 1. IA and navigation

**Every registered Community route** (`src/navigation/RootNavigator.js:503-532`,
24 routes, all lazy-loaded `src/screens/Community*.js:151-183`):

| Route | Screen | Reached from |
|---|---|---|
| Community | CommunityHubScreen | Today header glyph `CommunityHeaderAction` (`HomeScreen.js:2276`); Today one-time intro card (`HomeScreen.js:2727-2729`); You screen row "Community" (`YouScreen.js:364-370,558-567`); deep link `community` |
| CommunityJoin | CommunityJoinScreen | Hub "Create my profile" (`CommunityHubScreen.js:572`) |
| CommunityEditProfile | CommunityEditProfileScreen | Hub/Privacy menu |
| CommunityProfile | CommunityProfileScreen | tapping a person anywhere; deep link `u` (`?h=handle`) |
| CommunitySearch | CommunitySearchScreen | Hub search glyph (`CommunityHubScreen.js:439-446`); empty-state actions |
| CommunityActivity | CommunityActivityScreen | Hub notifications glyph (`CommunityHubScreen.js:447-460`) |
| CommunityDimension | CommunityDimensionScreen | Hub "Around you" dimension row (`CommunityHubScreen.js:656-669`) |
| CommunityBoard | CommunityBoardScreen | Hub "This week"/"At gym" "See all"; profile strip tap |
| CommunityGroup | CommunityGroupScreen | Hub "Your groups" chip row (`CommunityHubScreen.js:182,591`); deep link `g` (`?id=`) |
| CommunityGroupCreate | CommunityGroupCreateScreen | Hub "New group" |
| CommunityGroupMembers | CommunityGroupMembersScreen | Group screen roster |
| CommunityRules | CommunityRulesScreen | Join screen; moderated-status notice link (`CommunityHubScreen.js:496-502`) |
| CommunityPrivacy | CommunityPrivacyScreen | Settings "Community" row (`SettingsScreen.js:145-154`, cross-tab jump) |
| CommunityModeration | CommunityModerationScreen | Privacy screen "Moderation queue" row (moderators only) |
| CommunityCompose | CommunityComposeScreen | WorkoutSummaryScreen "Post to Community" (`WorkoutSummaryScreen.js:1267-1274`); HomeScreen finished-block (`HomeScreen.js:2449-2453`); ShareCardScreen "Post to Community" (`ShareCardScreen.js:841-844`, cross-tab jump) |
| CommunityPost | CommunityPostScreen | tapping a post card; deep link `s` |
| CommunityGymAdd | CommunityGymAddScreen | Join/Edit-profile gym picker |
| CommunityFindPeople | CommunityFindPeopleScreen | Hub "Find people" card (`CommunityHubScreen.js:610-631`) |
| CommunityPeopleList | CommunityPeopleListScreen | any Find People door |
| CommunityTrainingProfile | CommunityTrainingProfileScreen | Privacy screen "Training profile" row |
| CommunityConversations | CommunityConversationsScreen | Hub messages glyph (`CommunityHubScreen.js:461-480`) |
| CommunityConversation | CommunityConversationScreen | a conversation row; deep link `m` (`?id=`) |
| CommunityFollowers | CommunityFollowersScreen | Privacy screen "Followers" row |
| CommunityConnections | CommunityConnectionsScreen | Privacy screen "Connections" row |

**No Plans/Train entry point today.** `PlansScreen.js:1691-1697`: a card
("Programmes from the community") was deliberately removed on "Founder
correction 2026-09-08" because "the shared-programme layer it pointed at
was retired". Grep confirms: zero `navigate('Community...')` in that file.

**Stale IA comments.** `RootNavigator.js:499-501` and `AnalyticsScreen.js:
511-514` both still say Community "is reached from the Today header, the
Coach Support row and the Train programmes row". The Train row is confirmed
removed (above); a repo-wide grep for `Coach Support` finds only these same
two comments, no live row of that name. Observed: the comments are
unmaintained, not proof of what once existed.

**Deep links** (`RootNavigator.js:921-969`): `community`->Hub,
`u`->CommunityProfile, `s`->CommunityPost, `m`->CommunityConversation,
`g`->CommunityGroup. Legacy `volyume://partner/<code>` is rewritten
(lines 906-919) to `community?legacyPartnerCode=`, showing a "Partner
invites have moved" card (`CommunityHubScreen.js:505-532`).

**Hub section order, top to bottom** (`CommunityHubScreen.js`, quoted JSX,
`header` is the FlashList's `ListHeaderComponent`, wired at
`CommunityHubScreen.js:741`):
1. Moderated-person notice, if restricted/suspended (486-504)
2. "Partner invites have moved" card, if a legacy link (505-532)
3. Not-joined hero "Train alongside other lifters" + `PrivacyReceipt` (550-587), or the collapsed "Not joined yet" browsing line (534-547)
4. `ThisWeekLine` -- joined only (589)
5. `AtGymBlock`, `SectionLabel` **"At your gym"** / **"At {gym}"** -- joined only (106,116,590)
6. `YourGroupsRow`, `SectionLabel` **"Your groups"** -- joined only (182,591)
7. Following/Discover `Chip` segment row (593-608)
8. "Find people" card (610-631)
9. Offline banner, if offline (633-637)
10. Discover segment only: `SectionLabel` **"Lifters like you"** (643), **"Around you"** (658, dimension rows), **"Recent training stories"** (671)
11. Following segment only: `SectionLabel` **"Lifters like you"** (677)
12. FlashList body: the post feed itself (727-742)

No programme/plan section anywhere in this order, matching the file's own
header claim at `CommunityHubScreen.js:8` ("carries no programme section of
any kind") -- accurate for the Hub's rendered structure (contrast section 6:
copy and secondary surfaces, not this list, still carry it).

## 2. Dimensions and cohorts

**Dimension kinds** (`components/community/DimensionRow.js:14,24-29`):
`kind: 'style'|'programme'|'gym'|'area'`. Server (`migrate_164_community_gap_
closure.sql:994,1013,1022-1026`): `community_dimension` still accepts
`_kind='programme'` so a stale shared link never 500s, but always returns
`label NULL, count 0, no people` -- a dead dimension kept only for link
safety. `style` resolves via `_community_style_label`; `gym`/`area` resolve
to the profile's own labels.

**Training-profile bands** -- derived on-device (`lib/community/
trainingProfile.js`), one share toggle per band, `TP_DEFAULT_SHARE` (118-133):

| Toggle | Field | Band values (exact) | Default |
|---|---|---|---|
| days | tp_days | `mon,tue,wed,thu,fri,sat,sun` (46-48) | OFF |
| time_bands | tp_time_bands | `morning,midday,afternoon,evening,late` (60-66) | OFF |
| sessions | tp_sessions_band | `1_2,3,4_5,6_plus` (71-76,84) | ON |
| staple_lifts | tp_staple_lifts | up to 5 exercise ids, distinct-session count (109,297-315) | ON |
| experience | tp_experience_band | `new,intermediate,experienced` (86-90) | ON |
| programme | tp_programme_key | `style:<key>` from the ACTIVE PLAN's tags (148,435-453) | ON |
| age_band | share_age_band (bool; server derives the band) | `18_24,25_34,35_44,45_54,55_plus` (93-99) | OFF |
| consistency | share_consistency (bool) | 8 counters, see section 5 | OFF |

**Profile-level fields** (chosen at Join/Edit, not derived;
`lib/community/validation.js:106-128`), quoted exactly:
- `COMMUNITY_STYLE_KEYS` (up to three): `bodybuilding, strength, kettlebell,
  circuits, bands, bodyweight, minimal_kit, home_gym`
- `COMMUNITY_GOALS`: `build_muscle, get_stronger, general_fitness, returning`
- `COMMUNITY_SETTINGS`: `commercial_gym, home_gym, minimal_kit`

**Find People filters** (`components/community/PeopleFiltersSheet.js:6-11,
48-52`, combinable hard filters over `community_find_people`): Where
(`scope`: gym/place/any, `place_band_miles`), When (`days`, `time_bands`),
Training (`styles`, `goal`, `experience_band`), `partner_only`, and
**`age_band`** -- the age-band row "only exists at all when the caller
shares their own band" (line 9).

**AGE**: EXISTS as a band (`TP_AGE_BANDS`, five ranges above) and as a Find
People filter, gated on the caller sharing their own band first; never
derived from date_of_birth client-side (server-derived on opt-in, never for
a minor -- SD-32, `trainingProfile.js:30-32,92`).

**DISCIPLINE / COMPETITION CATEGORY** (men's physique, powerlifting,
bodybuilding, crossfit, strongman, etc.): ABSENT as its own field. The
closest thing is `COMMUNITY_STYLE_KEYS` above (bodybuilding and strength
are on it; powerlifting, crossfit, strongman and any physique/bikini/
classic-physique category are not), and the `programme` band, which is the
active plan's training style key, not a chosen discipline
(`trainingProfile.js:434-438`). No competition-category cohort exists
anywhere in the data model or UI.

## 3. Activity and feed

**Story kinds** -- `POST_KINDS = Object.keys(POST_PAYLOAD_KEYS)`
(`lib/community/validation.js:87-102`), exact enum: `pr, session, block,
milestone, programme`.

| Kind | Fields (allow-listed, `validation.js:87-99`) | Trigger |
|---|---|---|
| pr | exerciseName, weight, reps, units, previousBest, date | manual, from a detected PR |
| session | sessionName, workingSets, duration, tonnage, exerciseCount, exercises, prCount, topSet, intensityTier, units, planName, date | manual "Post to Community" after a finished workout |
| block | planName, weeks, sessions, sessionsPerWeek, completedAt, lifts | manual, after a completed training block |
| milestone | eyebrow, title, heroValue, heroUnit, caption, stats | manual, from a recap |
| programme | id, title, style_key, days_per_week, exercise_count | dead -- see section 6 |

**PR story kind EXISTS** (`buildPrPayload`, `posts.js:72-83`): weight and
reps on the specific lift ARE shown ("training performance the user chose
to share", `posts.js:16-18`); nothing else about the person rides along.

**"Workout done" is always manual, never automatic.** Every `createPost`
call is user-initiated from the entry points in section 1. Withheld:
everything not in the kind's allow-list above; `hasForbiddenKeys`
(`validation.js:174-183`) also refuses bodyweight/body-fat/kcal etc at any
depth, matching the privacy guard in sections 5 and 9.

**Reactions**: one kind only, "Respect", boolean on/off
(`reactToPost`, `posts.js:207-210`; `ActivityRow.js:38` renders it as "gave
your post respect"). **Comments**: flat, `addComment`/`listComments`/
`deleteComment` (`posts.js:212-227`), `community_comment`/`community_list_
comments` RPCs.

**Feeds**, all chronological, no engagement ranking (`feed.js:8-12`, SD-06):
Following = `community_feed` (`feed.js:144-146`); Discover = `community_
discover_posts` + `community_dimensions_me` header (`feed.js:99-141`);
Group = `community_group_feed`, members-only (`groups.js:186-198`).

**What a viewer sees of another person's training:**
- **Profile progress strip is OWN PROFILE ONLY**, `CommunityProfileScreen.js:
  120-140`: `if (!isMe || !card?.user_id) { setProgress(null); return; }`.
  The strip (sessions this week, streak, weeks-consistent-in-12, 8-week
  bars, `ProgressStrip.js`) is device-computed and renders only for your
  own profile; opening someone else's shows no consistency signal.
- **Board rows** (`GymWeekBoard.js:10,61-62`; `boards.js:54-64`) are where
  another person's "trained this week / has a streak" IS visible: avatar,
  name, trained-days caption, metric, amber ring dot for `trained_today`.
- A person's PRs are visible to others only via a manually-posted `pr`
  story; no aggregate "PR count this period" exists on profile or board.

## 4. Boards and groups

Landed code matches `60-DESIGN` closely; no material gap found.

**Boards** (`lib/community/boards.js:1-42`, one RPC `community_board`):
scopes `gym, following, group, everyone` exactly as designed; windows
`week, month, consistency`; small-group rule below 8 returns
`threshold_met: false`, client renders an unranked roster (`boards.js:
13-16`); no all-time window, as specified.

**Groups** (`lib/community/groups.js`, 16 RPCs): create/update/close/leave/
join/approve/remove/promote/invite/invite-link/accept/list-mine/get/
members/search + `community_group_feed`, one-to-one with `60-DESIGN`
section 3's list. Open admits directly, invite-only queues a request
(lines 72-80); last admin cannot leave without promoting (line 65); minors
refused server-side, screens also fail closed on `me.is_minor` (lines
10-12). Reports: `REPORT_TARGET_KINDS` includes `'group'`
(`moderation.js:32`), same queue.

**One gap found (carries into section 7):** group notifications
(`group_request`, `group_accepted`, `group_invited`) are generated entirely
server-side (`migrate_165_community_boards_groups.sql:974,1007,1113`, via
`_community_add_activity`) but the client's `ActivityRow.js:34-46` `LINES`
map has no copy for any of the three, and `CommunityActivityScreen.js` has
no group-specific section (grep for `group` in that file: zero matches). A
group notification reaching the Activity inbox today falls through to the
generic fallback at `ActivityRow.js:51`, "did something in Community".

## 5. Consent and privacy model

**Every toggle and its default:**

| Control | Screen | Default |
|---|---|---|
| Connect from: Anyone / People I approve | Privacy (`CommunityPrivacyScreen.js:218-225`) | Anyone (`profile.js:55`) |
| Show my gym | Privacy (line 264, `useState(true)` line 58) | ON |
| Show my place | Privacy (line 279, `useState(true)` line 59) | ON |
| Days / Time bands / Sessions / Staple lifts / Experience / Programme / Age band / Share my consistency | Training profile (`CommunityTrainingProfileScreen.js:81-99`, also offered at Join) | OFF/OFF/ON/ON/ON/ON/OFF/OFF (`TP_DEFAULT_SHARE`, `trainingProfile.js:118-133`) |

**`shareablePayload`** (`trainingProfile.js:524-557`): only fields whose
toggle is on are sent (absence = server NULLs it); `share_age_band` and
`share_consistency` are always explicit booleans, so turning either off is
an erasure, not a stale row. Consistency payload adds eight counters plus
`c_weeks_history`.

**SD-30 guard** (`community.privacy.guard.test.js:264`): `trainingProfile.js`
may import only `getCompletedWorkoutStartTimestamps, getWorkoutSetsSince,
getAllExercises, getActivePlan` from `../database` (exact-set match, no
lazy `require` route); `trainingConsistency.js:280` likewise limited to
`getCompletedWorkoutStartTimestamps, getActivePlan, getRoutinesForPlan`.
Both are also on the stricter `DISCOVERY_FILES` list (lines 160-182)
banning bare words `scan, capability, protein, carbs, check_in, injur,
limitation, measurement, age` (unless `_band`).

**Calm mode / open ED flag**: `trainingConsistency.js:230-239`
`consistencyGateState` reuses the app's one canonical suppression
(`readEdOrCalmSuppressed`, `hooks/usePhotoSuppression.js`) -- counters are
withheld under either, same gate as `BeforeAfterShareSheet.js` and
`CoachOutputScreen.js`.

**Minors**: `is_minor` read from the cached `me` only, never a fresh DOB
read; an unreadable cache fails CLOSED as a minor
(`trainingConsistency.js:230-238`). Groups refuse minors server-side on
create/join/invite/accept, client also checks first (`groups.js:10-12`).
Age band is server-derived, "never for a minor" (`trainingProfile.js:92`).

## 6. Plan/programme residue

`40-GAP-CLOSURE.md` section 2 says the layer is removed and the "programme"
story kind stays only as "a person's own plan start". The code disagrees:
`buildProgrammePayload` (`posts.js:294-308`) is typed against a
`community_programmes` row (a PUBLISHED shared programme: id, title,
style_key, days_per_week, exercise_count), not a plan-start event, and
every RPC that could produce such a row has EXECUTE revoked
(`migrate_164_community_gap_closure.sql:13-22`). No entry point passes
`kind: 'programme'` to `CommunityCompose`. **The "programme" story kind is
dead code matching the pre-removal model, not the GAP-CLOSURE rationale.**

Live, user-facing copy still framing Community around programmes:

| File:line | What a user sees/gets today |
|---|---|
| `components/HomeCommunityIntroCard.js:25,28` | Today's one-time intro card: title "Other lifters, their programmes, your stories"; body "Use a programme another lifter built...". First thing named after a user's first workout. |
| `screens/CommunityRulesScreen.js:39-45,92-96,104-117` | Accepted-on-Join rules text: "...use or adapt the programmes other lifters have built"; "Programmes you publish share their structure..."; Report/block copy repeats "programme" four more times. Version-dated 2026-09-06, never revised for the 2026-09-08 correction. |
| `components/community/PrivacyReceipt.js:40` | "Programmes you publish" listed under "Others can see", shown on Join and Privacy. |
| `lib/community/findPeople.js:57-63,140-141`; rendered live at `screens/CommunityFindPeopleScreen.js:132` | "On my programme" is a live, unfiltered door of the six in Find People. |
| `screens/CommunityTrainingProfileScreen.js:90` | "Programme" toggle/row, default ON (section 2, section 5). |
| `lib/community/connections.js:37` | "Same programme" is one of four selectable connect-request reasons. |
| `lib/community/profile.js:58` | `show_programmes: true` is a default profile field. |
| `screens/CommunityEditProfileScreen.js:218` | Account-deletion copy: "...published programmes and follows are deleted." |
| `components/community/DimensionRow.js:14,24-29` | `'programme'` kind + icon still in the client's dimension-kind map (server always returns it empty, section 2). |

Correctly cleaned up, cited for contrast (not residue):
`PlansScreen.js:1691-1697`; comments at `feed.js:3-6`,
`CommunitySearchScreen.js:11`, `CommunityHubScreen.js:8`,
`links.js:75,168-170`. Grep for "By Volyume": zero matches in `src/`.

## 7. Encouragement mechanics today

Reactions: "Respect" only (section 3); grep for `kudos|cheer|high.?five`
across `src/`: zero matches. Client-hinted notify kinds (`notify.js:21-30`):
`follow, follow_request, follow_accepted, reaction, comment, connect_
request, connect_accepted, message`. Server-only kinds (section 4 gap, no
client copy): `group_request, group_accepted, group_invited`. Categories/
budget (`categories.js:62-68,271-273`): `COMMUNITY_FOLLOW, COMMUNITY_
ACTIVITY, COMMUNITY_MESSAGE`; message pushes collapse to one per
conversation per 15 minutes (`notify.js:23-29`); quiet hours hold pushes to
in-app (`NotificationSettingsScreen.js:539-545`). No message templates
beyond the generic push body "New message from @handle" (`notify.js:27`);
messages and connect notes are free text, 120 chars (`connections.js:50`).

## 8. Reuse map for the founder's vision

| Item | Status | Carrying file |
|---|---|---|
| (a) age-band cohort | PARTIAL | band + filter exist (`trainingProfile.js`, `PeopleFiltersSheet.js`); no age dimension PAGE (`DimensionRow.js` kinds: style/programme/gym/area only) |
| (b) discipline/category cohort | ABSENT | closest is `COMMUNITY_STYLE_KEYS` (`validation.js:106-115`), a style tag list, not a competition taxonomy |
| (c) PR visibility to others | PARTIAL | only via a manually-posted `pr` story (`posts.js:72-83`); no aggregate PR count |
| (d) share a great workout into a group | PARTIAL | `community_group_feed` surfaces members' already-public/followers-visible posts (`groups.js:186-198`); no distinct "post to this group" gesture at compose time (`POST_VISIBILITIES` is public/followers only, `validation.js:143`) |
| (e) encouragement action on a friend's activity | PARTIAL | Respect + comment exist on any post (section 3); nothing friend- or group-specific beyond that |
| (f) friend group creation and roster | EXISTS | `lib/community/groups.js`, `CommunityGroupCreateScreen.js`, `CommunityGroupMembersScreen.js` |
| (g) seeing whether my cohort trained this week | PARTIAL | `community_board` week window covers gym/following/group/everyone (`boards.js`); no board scope for age-band or style cohorts |
| (h) progress signal beyond session counts | PARTIAL | `c_planned_pct_4w` (planned-session adherence) exists (`trainingConsistency.js:92-150`); no structured "PRs this period" signal (see (c)) |

## 9. Test and guard inventory relevant to a revamp

| Guard | Pins |
|---|---|
| `src/__tests__/community.privacy.guard.test.js` | No Community file reads body/food/scan/ED/DOB fields (deny-list regex over `lib/community`, `components/community`, `lib/gyms`, `screens/Community*.js`); SD-30 exact-import allow-list for `trainingProfile.js`/`trainingConsistency.js` |
| same file, lines 454-511 | `TP_DAYS/TP_TIME_BANDS/TP_SESSIONS_BANDS/TP_EXPERIENCE_BANDS/TP_AGE_BANDS/CONNECT_REASONS` must match migrate_161's SQL helper functions exactly, same order -- fails the moment a band is added, renamed or reordered on only one side |
| `src/__tests__/community.rpcOnly.guard.test.js` | Every `community_*` table has RLS with no anon/authenticated grants; SECURITY DEFINER RPCs are the only door; `delete_user_data` names every community table |
| `src/__tests__/community.migrationShape.test.js` | migrate_160's header (Purpose/Push/Pull/Applied locally/remotely/Safe to re-run/Rollback/GDPR note) stays present and honest |
| `src/components/__tests__/Button.hierarchy.guard.test.js` | Amber fill reserved for `variant="emphatic"`, curated allow-list -- in Community, only `CommunityJoinScreen.js`, `CommunityComposeScreen.js`, `CommunityRulesScreen.js` may use it; any other amber element in Community is a hand-rolled fill outside this guard's reach |
| `src/__tests__/screen-mount.test.js` | Mounts every Community screen with stubbed state; catches import/render crashes only, not copy or visual regressions |

