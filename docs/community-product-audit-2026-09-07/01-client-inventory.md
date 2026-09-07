# 01 — Community client inventory

Read-only, evidence-first. HEAD at time of writing: branch
`claude/community-product-audit-m50z2y`. Every claim below is file:line.
Sources read in full: all 21 `src/screens/Community*.js`, all 19
`src/lib/community/*.js`, all 4 `src/lib/gyms/*.js` (excluding
`__tests__`), all 25 `src/components/community/*.js` (+
`src/components/HomeCommunityIntroCard.js`), `src/navigation/
RootNavigator.js`, `src/lib/notifications/{notificationRoute.js,
categories.js}`, `src/screens/NotificationSettingsScreen.js`, plus grep
sweeps of `src/` for every inbound `navigate('Community…')` call. Existing
context read for orientation only (not copied): `docs/social-
discovery-2026-09-06/{60-FINAL-REPORT.md,70-DISCOVERY-BLUEPRINT.md,
80-VISUAL-INVENTORY.md}` — the visual inventory's own file:line evidence
for design-system usage is reused where it overlaps with this brief's
scope (button variants, card wrappers) rather than re-derived, and is
cited as `[80-VISUAL-INVENTORY.md]` where used.

---

## 1. Routes, entry points, reachability

### 1.1 Registered routes

All 21 registered in `HomeTabStack` (whatever that stack function is
named in `RootNavigator.js`), `RootNavigator.js:499-525`, each
`headerShown: false` (screen draws its own `BackHeader`):

| Route name | Screen file | Params read by the screen |
|---|---|---|
| `Community` | `CommunityHubScreen.js` | `legacyPartnerCode`, `segment` (`'discover'\|'following'`), `focus` (`'programmes'`) — read at `CommunityHubScreen.js:109,111,119` |
| `CommunityJoin` | `CommunityJoinScreen.js` | `next: {screen, params}` — `CommunityJoinScreen.js:87,226` |
| `CommunityEditProfile` | `CommunityEditProfileScreen.js` | none |
| `CommunityProfile` | `CommunityProfileScreen.js` | `handle` or `h` (deep link), `userId` or `uid` — `CommunityProfileScreen.js:101-102` |
| `CommunitySearch` | `CommunitySearchScreen.js` | `q`, `tab` (`'people'\|'programmes'`) — `CommunitySearchScreen.js:41-42` |
| `CommunityActivity` | `CommunityActivityScreen.js` | `source` (notification telemetry only, not read by the screen body) |
| `CommunityDimension` | `CommunityDimensionScreen.js` | `kind`, `key`, `label` — `CommunityDimensionScreen.js:146-148` |
| `CommunityRules` | `CommunityRulesScreen.js` | `mustAccept` (bool) — `CommunityRulesScreen.js:154` |
| `CommunityPrivacy` | `CommunityPrivacyScreen.js` | none |
| `CommunityModeration` | `CommunityModerationScreen.js` | none (gated on `me.is_moderator`, `CommunityModerationScreen.js:91,134`) |
| `CommunityProgramme` | `CommunityProgrammeScreen.js` | `id` — `CommunityProgrammeScreen.js:87` |
| `CommunityAdapt` | `CommunityAdaptScreen.js` | `id` (grep-confirmed at call site `CommunityProgrammeScreen.js:395`) |
| `CommunityPublishProgramme` | `CommunityPublishProgrammeScreen.js` | `planId` — `CommunityPublishProgrammeScreen.js:96` |
| `CommunityCompose` | `CommunityComposeScreen.js` | `kind`, `workoutId`, `mesocycleId`, `pr`, `milestone`, `programme` — `CommunityComposeScreen.js:54-61,66-67` |
| `CommunityPost` | `CommunityPostScreen.js` | `id` |
| `CommunityGymAdd` | `CommunityGymAddScreen.js` | `typed`, `onSelect` — `CommunityGymAddScreen.js:51-52` |
| `CommunityFindPeople` | `CommunityFindPeopleScreen.js` | none |
| `CommunityPeopleList` | `CommunityPeopleListScreen.js` | `mode`, `key`, `label`, `programmeId` — `CommunityPeopleListScreen.js:23,58-61` |
| `CommunityTrainingProfile` | `CommunityTrainingProfileScreen.js` | none |
| `CommunityConversations` | `CommunityConversationsScreen.js` | none |
| `CommunityConversation` | `CommunityConversationScreen.js` | `id`, `userId`, `ref: {kind,id}` — `CommunityConversationScreen.js:130-132` |

Screen file count: 21 (`ls src/screens/Community*.js`), matches route
count exactly — no orphan screen file and no route pointing at a missing
file.

Guards: none of the 21 routes is tier-gated (`RootNavigator.js:495-525`
comment: "every Community screen is pushed and draws its own BackHeader";
product is fully free, D137). `CommunityModeration` self-guards in the
component body (`CommunityModerationScreen.js:134-147`, a plain "Not
available" `EmptyState` for a non-moderator) rather than at the
navigator. No route reads a health-consent or Article-9 gate.

### 1.2 Deep links (`RootNavigator.js:914-961`)

`Community: 'community'`, `CommunityProfile: 'u'`, `CommunityProgramme:
'p'`, `CommunityPost: 's'`, `CommunityConversation: 'm'`
(`RootNavigator.js:952-960`). Query-param shape (`/u/?h=`), not path
segments, because the static GitHub Pages site cannot do path rewriting
(`RootNavigator.js:945-949`). Legacy `volyume://partner/<CODE>` and
`https://volyume.app/partner/<CODE>` are rewritten to `community?
legacyPartnerCode=<CODE>` by `rewriteLegacyCommunityPath`
(`RootNavigator.js:899-908`), landing on the Hub's "Partner invites have
moved" card (`CommunityHubScreen.js:315-341`).

### 1.3 Entry points INTO Community from the rest of the app

Every inbound `navigate('Community…')` call from a non-Community file,
by grep (`navigate\(['"]Community` and `navigate\(['"]HomeTab.*Community`
across `src/`):

| # | From screen | Control | Target | Evidence |
|---|---|---|---|---|
| 1 | `HomeScreen.js` (Today root) | `CommunityHeaderAction` in the header `right` slot | `Community` | `HomeScreen.js:2271`, action itself `CommunityHeaderAction.js:39` |
| 2 | `YouScreen.js` (Coach root) | "Community" support row | `Community` | `YouScreen.js:364-369,601-603` |
| 3 | `PlansScreen.js` | "Programmes from the community" row | `Community` (`segment:'discover', focus:'programmes'`) | `PlansScreen.js:1692-1699` |
| — | `PlanLibraryScreen.js` | same row, plan library variant | `Community` (`segment:'discover', focus:'programmes'`) | `PlanLibraryScreen.js:730-733` |
| 4 | `HomeScreen.js` | `HomeCommunityIntroCard` "Have a look" (one-time, post-first-session) | `Community` | `HomeScreen.js:2731-2733`, card itself `HomeCommunityIntroCard.js:38` |
| 5 | `SettingsScreen.js` | "Community" row | `CommunityPrivacy` | `SettingsScreen.js:152-154` |
| 6 | `WorkoutSummaryScreen.js` | "Post to Community" button | `CommunityCompose` (`kind:'session'`) | `WorkoutSummaryScreen.js:1267-1274` |
| 7 | `HomeScreen.js` | block-complete card action | `CommunityCompose` | `HomeScreen.js:2444-2448` |
| 8 | `ShareCardScreen.js` | share-card action | `CommunityCompose` (`navigateCrossTab`) | `ShareCardScreen.js:843` |
| 9 | `PlanDetailScreen.js` | "Share to community" | `CommunityPublishProgramme` (`planId`) | `PlanDetailScreen.js:566` |
| 10 | `GymPicker.js` (embedded in Join/Edit-profile) | "Can't find your gym? Add it" empty-state action | `CommunityGymAdd` (`typed`) | `GymPicker.js:127` |
| 11 | `notificationRoute.js` | tap on `community_follow`/`community_activity` push | `CommunityActivity` | `notificationRoute.js:166-173` |
| 12 | `notificationRoute.js` | tap on `community_message` push | `CommunityConversation` (`id`) | `notificationRoute.js:174-184` |
| 13 | `notificationRoute.js` | tap on a retired `partner_cheer`/`partner_streak`/`partner_joined` push still in a tray | `Community` | `notificationRoute.js:118-127` |

No other non-Community file in `src/` calls a Community route (full
list of files matching `navigate\(['"]Community` is exactly the 17 files
enumerated by the grep in the working notes; 15 of them are Community
screens navigating to each other, covered in 1.4 below).

### 1.4 Reachability graph (who can navigate to each Community screen)

For each screen, every caller found by grep, file:line:

- **CommunityHubScreen (`Community`)** ← entry points 1-4, 13 above,
  every `CommunityPrivacyScreen` "not joined" action
  (`CommunityPrivacyScreen.js:183`).
- **CommunityJoinScreen** ← Hub hero "Create my profile"
  (`CommunityHubScreen.js:382`), Hub legacy card is NOT a caller (goes to
  search), `CommunityPostScreen.js:310`, `CommunityProgrammeScreen.js:375`,
  `CommunityFindPeopleScreen.js:196`, `CommunityComposeScreen.js:88`
  (`.replace`, when the poster has no profile).
- **CommunityEditProfileScreen** ← `CommunityProfileScreen.js:285` (own
  profile "Edit profile"), `CommunityPrivacyScreen.js:314`.
- **CommunityProfileScreen** ← `CommunityHubScreen.js:227,260`,
  `CommunityPostScreen.js:223,299`, `CommunityDimensionScreen.js:303`,
  `CommunityConversationScreen.js:227`, `CommunityPeopleListScreen.js:167`,
  `CommunityProgrammeScreen.js:260,364`, `CommunityActivityScreen.js:182,
  199,261`, `CommunitySearchScreen.js:174`, own follower/following sheet
  rows (`CommunityProfileScreen.js:510`).
- **CommunitySearchScreen** ← Hub (multiple: `CommunityHubScreen.js:274,
  329,461,558`), `CommunityDimensionScreen.js:289`,
  `CommunityActivityScreen.js:247`, `CommunityProfileScreen.js:524`,
  `CommunityFindPeopleScreen.js:179` (with typed query), legacy-partner
  card (`CommunityHubScreen.js:329`).
- **CommunityActivityScreen** ← Hub header bell
  (`CommunityHubScreen.js:284`), notification tap (entry point 11).
- **CommunityDimensionScreen** ← `CommunityHubScreen.js:508` (Around you
  section), `CommunityProfileScreen`'s own facts do NOT link out (no
  onPress on the chosen-facts line), so dimension pages are reached from
  the Hub only, plus the gym typeahead is not a caller (it opens
  `CommunityGymAdd`, not `CommunityDimension`).
- **CommunityRulesScreen** ← every `mustAccept` refusal site:
  `CommunityTrainingProfileScreen.js:166,203`,
  `CommunityConversationScreen.js:255`, `CommunityPeopleListScreen.js:120`,
  `CommunityProgrammeScreen.js:270,444`, `CommunityPrivacyScreen.js:113,
  129`, `CommunityProfileScreen.js:330,482`; plus the plain "Community
  rules and contact" link on Join (`CommunityJoinScreen.js:434`) and
  Privacy (`CommunityPrivacyScreen.js:328`).
- **CommunityPrivacyScreen** ← `SettingsScreen.js:154` only (no
  in-Community caller navigates here directly; Community's own privacy
  controls live inline on `CommunityEditProfileScreen` instead — see 5,
  11).
- **CommunityModerationScreen** ← `CommunityPrivacyScreen.js:321`
  (moderator-only row).
- **CommunityProgrammeScreen** ← Hub (`CommunityHubScreen.js:471`),
  `CommunityDimensionScreen.js:264`, `CommunitySearchScreen.js:180`,
  `CommunityProfileScreen.js:447`, `CommunityActivityScreen.js:258`,
  `CommunityConversationScreen.js:441`.
- **CommunityAdaptScreen** ← `CommunityProgrammeScreen.js:395` only.
- **CommunityPublishProgrammeScreen** ← `PlanDetailScreen.js:566` only.
- **CommunityComposeScreen** ← `HomeScreen.js:2444`,
  `WorkoutSummaryScreen.js:1272`, `ShareCardScreen.js:843` only.
- **CommunityPostScreen** ← Hub (`CommunityHubScreen.js:581`),
  `CommunityActivityScreen.js:254`, `CommunityProfileScreen.js:440`,
  `CommunityComposeScreen.js:123` (`.replace`, after posting),
  `CommunityConversationScreen.js:443`.
- **CommunityGymAddScreen** ← `GymPicker.js:127` only (so reachable from
  every screen that embeds `GymPicker`: `CommunityJoinScreen.js:290,357`
  wait — Join embeds it at line 290 for the primary gym only;
  `CommunityEditProfileScreen.js:298,356` for primary and up to 3 other
  gyms).
- **CommunityFindPeopleScreen** ← Hub "Find people" card
  (`CommunityHubScreen.js:418`), `CommunityConversationsScreen.js:120`
  (empty-state action).
- **CommunityPeopleListScreen** ← `CommunityFindPeopleScreen.js:165`
  (a door), `CommunityProgrammeScreen.js:283` ("People on this
  programme" row).
- **CommunityTrainingProfileScreen** ← `CommunityEditProfileScreen.js:
  377`, `CommunityPrivacyScreen.js:255`, and the requirement-route table
  in `CommunityFindPeopleScreen.js:54-58` for the "programme" door when
  unavailable.
- **CommunityConversationsScreen** ← Hub messages glyph
  (`CommunityHubScreen.js:298`).
- **CommunityConversationScreen** ← `CommunityConversationsScreen.js:100`,
  `CommunityPostScreen.js:237` (message-author, connected only),
  `CommunityProfileScreen.js:329`, `CommunityProgrammeScreen.js:266`,
  `CommunityPeopleListScreen.js:171`, `ProfileCard.js:158` (its own
  "Message" state, composed into every list that passes `showConnect`),
  notification tap (entry point 12).

**Every one of the 21 registered routes has at least one live caller.**
No implemented-but-unreachable screen was found.

### 1.5 Lib capabilities that exist but no screen calls

Grepped every exported function in `src/lib/community/*.js` and
`src/lib/gyms/*.js` against every screen and component file (excluding
`__tests__`):

| Function | RPC | Where it lives | Caller found? |
|---|---|---|---|
| `removeFollower` | `community_remove_follower` | `profile.js:244-246` | **None.** No screen or component calls it. A follower can only be dealt with by Blocking them (`ProfileMenuSheet.js:97-99`), which is a much larger action (mutual invisibility, removes both follow edges) than removing one follower. There is no "remove this follower without blocking" control anywhere in the client. |
| `listConnections` | `community_list_connections` | `connections.js:182-191` | **None** as the exported helper. The same RPC IS called, but only inline via `callCommunity('community_list_connections', ...)` in `CommunityActivityScreen.js:63-65`, and only for the `requests` field (pending connection requests). The `people` field the RPC also returns (a full list of accepted connections) is never read by any screen — **there is no "My connections" list screen**, unlike Followers/Following, which have their own sheet on the profile (`CommunityProfileScreen.js:492-530`). |
| `gymSuggest` | `community_gym_suggest` | `findPeople.js:258-270`, re-exported `index.js:119` | **None.** Only referenced in `__tests__/findPeople.test.js`. The gym typeahead's own de-duplication (mentioned in the discovery blueprint SD-27) has no client call site. |
| `near(lat, lng)` | `gyms_near` | `gyms/index.js:112-117` | **None**, documented as a deliberate deviation in the module's own header comment (`gyms/index.js:8-19`): `expo-location` is not a dependency, so "near me" today only works through the postcode/town text path, never device coordinates. |
| `moderationQueue(status)` with `status:'dismissed'` | `community_moderation_queue` | `moderation.js:63-65` | **Partial.** `CommunityModerationScreen.js` only offers two chips, "Open" and "Actioned (audit log)" (`CommunityModerationScreen.js:154-163`), calling `moderationQueue(status)` with `status` fixed to `'open'` or `'actioned'` (`CommunityModerationScreen.js:93,105`). A `'dismissed'` queue view, which the function signature documents as a third valid status, has no UI. |

No other exported function in the eleven `lib/community` modules or the
four `lib/gyms` modules was found unreferenced by a screen or component.

---

## 2. Per-screen inventory

Format per screen: purpose; every user action → function/RPC/nav it
triggers; every rendered state with exact copy; what's missing.

### CommunityHubScreen.js (`Community`)

**Purpose:** the one destination. Following (people you follow, newest
first) / Discover (programmes, suggested people, dimensions, stories),
readable without a profile (`CommunityHubScreen.js:1-29`).

**Actions:**
| Control | Triggers |
|---|---|
| Own-avatar header button | `navigate('CommunityProfile', {userId})` — `:260` |
| Search glyph | `navigate('CommunitySearch')` — `:274` |
| Activity bell (joined only) | `navigate('CommunityActivity')` — `:284` |
| Messages glyph (joined only) | `navigate('CommunityConversations')` — `:298` |
| Legacy card "Find people" | `navigate('CommunitySearch')` — `:329` |
| Legacy card "Dismiss" | local `setLegacyCardShown(false)` — `:337` |
| "Browse first" (not joined) | local `setBrowsing(true)` — `:390` |
| "Create my profile" (browsing banner) | local `setBrowsing(false)` — `:354` |
| Hero "Create my profile" | `navigate('CommunityJoin')` — `:382` |
| Following/Discover chips | local `setSegment(...)` — `:404,410` |
| "Find people" card | `navigate('CommunityFindPeople')` — `:418` |
| Programmes "See all" | `navigate('CommunitySearch', {tab:'programmes'})` — `:461` |
| Programme tile (community or Volyume) | `navigate('CommunityProgramme', {id})` or `navigateCrossTab(...,'PlanDetail',{isLibrary:true})` — `:471,480` |
| "Lifters like you" card | `openProfile` → `navigate('CommunityProfile', {handle})` — `:494` |
| Dimension row | `navigate('CommunityDimension', {kind,key,label})` — `:508` |
| Post card tap | `navigate('CommunityPost', {id})` — `:581` |
| Post Respect tap | `reactToPost(id, !myReaction)` (optimistic) — `:236` |
| Pull to refresh | `load({quiet:true})` + `refreshMe(true)` — `:190` |
| End reached (Following, or Discover with a story cursor) | `loadHub(shown, {cursor})` — `:200` |

**States:**
- Loading: `ActivityIndicator` — `:538`.
- Offline-with-cache: caption `"Showing what you last saw. You are
  offline."` — `:441`.
- Failed, no cache: `EmptyState` title `hub.error==='offline' ?
  'You are offline' : 'Could not load Community'`, text `'Community
  needs a connection. Your training is unaffected.'` or `'Try that
  again in a moment.'`, secondary "Try again" — `:544-551`.
- Following, empty: `EmptyState` "Nothing here yet" / "Follow a few
  people and their training stories will appear here." / action "Find
  people" — `:553-560`.
- Discover, nothing at all: `EmptyState` "You are early" / "Be the
  first to publish a programme or post a training story. Volyume's own
  programmes are above." — `:562-566`.
- Not joined: hero card + `PrivacyReceipt`, Discover renders read-only
  beneath — `:360-397`.
- Legacy partner code present: "Partner invites have moved" card —
  `:315-341`.
- Paging footer spinner — `:588-590`.

**Missing:** no explicit zero-results state distinct from the generic
Discover-empty state when a search-adjacent filter (segment) yields
nothing but the OTHER segment has content — not applicable here since
there's no filter beyond the two chips. No "minor" or "blocked" state on
this screen (not applicable at hub level).

### CommunityJoinScreen.js

**Purpose:** create the Community profile; the consent record for
`community_visibility` is written here (`CommunityJoinScreen.js:1-29`).

**Actions:** handle field → debounced `checkHandle` (250ms,
`:159-176`); avatar preset tap → local; gym picker `onSelect` → local
`primaryGym`; visibility chips → local (hidden entirely for a minor,
`:322`); training-profile band toggles → `writeShareSettings` (local
only, not synced until Create) `:145-149`; "Create profile" →
`upsertProfile(...)` then best-effort `setShowProgrammes`,
`syncTrainingProfile(uid,{force:true})`, `setGyms(primaryGym.id,[])`,
then `refresh(true)` and either `navigation.replace(next.screen,
next.params)` or `goBack()` — `:197-236`; "Community rules and contact"
→ `navigate('CommunityRules')` — `:434`.

**Handle states (exact copy, `:178-189`):** `idle`/`invalid` → "Use 3
to 20 letters, numbers or underscores."; `checking` → "Checking";
`available` → "Available" (success colour); `taken` → "Taken" (error
colour); `unknown` → `"Could not check that handle. You are offline."`
(offline) or `"Could not check that handle just now. Try again."`
(other failure) — and `unknown` does NOT block Create (`:194-195`,
`canCreate` accepts `'available'` or `'unknown'`).

**Refusals on Create (`:74-81`):** offline, `handle_taken`,
`handle_invalid`, `content_not_allowed`, `rate_limited`,
`invalid_input`, each with its own line.

**Minor state:** visibility chips hidden, note "Under 18: your profile
is followers-only and does not appear in search." (`:343-347`); the
`age_band` training-profile row is filtered out entirely
(`bandRows(...).filter((row) => !(isMinor && row.key === 'age_band'))`,
`:365-366`).

**Missing:** no offline banner beyond the handle-check line; a fully
offline Create attempt surfaces only through the post-submit toast
(`REFUSALS.offline`), not a pre-emptive state.

### CommunityEditProfileScreen.js

**Purpose:** edit every typed Community fact (name, bio, styles, goal,
setting, area, primary/other gyms, visibility); leave Community.

**Actions:** avatar preset tap; text fields (Name, Bio, Area) with
inline caps (`DISPLAY_NAME_MAX`, `BIO_MAX`, `AREA_LABEL_MAX`); style
chips (max `MAX_STYLES_PER_PROFILE`=3, `:135-141`); goal/setting radio
chips; primary-gym `GymPicker` or "Change" button (`:297-326`); other
gyms add/remove (up to `MAX_OTHER_GYMS`=3, `:337-373`); "Training
profile" card → `navigate('CommunityTrainingProfile')` — `:377`; "Save"
→ `upsertProfile(...)` + `setGyms(...)` + `refresh(true)` — `:143-171`;
"Leave Community" → `appAlert` confirm → `leaveCommunity()` — `:173-195`.

**Refusals on Save (`:57-64`):** offline, `handle_taken` (though handle
is not editable here — dead code path, since this screen never sends
`handle`), `content_not_allowed`, `rate_limited`, `invalid_input`.

**States:** legacy gym (no `gym_id`, only a typed label pre-campaign)
shown read-only with caption "Not yet linked to the directory." —
`:311-315`. No loading/error/empty state on this screen at all — it
renders immediately from the cached `me` and never shows a spinner or a
failure card; a `me` read failure silently leaves every field at its
default/blank state with no notice to the user (**missing: no error
state**).

### CommunityProfileScreen.js

Covered in depth in Section 5.

### CommunitySearchScreen.js

**Purpose:** search people (handle/display name) and programmes
(title), two tabs behind one field (`:1-16`).

**Actions:** query field → 250ms debounce, request-id guarded
(`:58-88,107-110`); People/Programmes chips → `setTab` — `:162-163`;
result row tap → `CommunityProfile` or `CommunityProgramme`; end
reached (Programmes only) → `programmePage(query, {cursor})` — `:90-105`;
pull to refresh → re-run current query.

**States:** people, empty query: "Search by @handle or name" / "Find
someone you train with, or a programme by its title." — `:113-117`.
Error: `"You are offline"`/`"Could not search just now"` + retry —
`:118-128`. People, no match: "No one by that name yet" / "Try the
start of their handle, or their display name." — `:130-134`.
Programmes, empty query, no results: "No programmes yet" / "Nobody has
shared one yet. Publish one of your own plans and it appears here." —
`:136-140`. Programmes, query with no match: "Nothing with that title
yet" / "Try a shorter word from the programme name." — `:142-146`.

**Missing:** no minimum-character gate on the people search (any
non-empty trimmed string is sent after debounce — a single character
triggers a network call); no visible "loading" skeleton distinct from
the `SearchBar`'s own spinner prop.

### CommunityFindPeopleScreen.js

Covered in Section 4.

### CommunityPeopleListScreen.js

Covered in Section 4.

### CommunityDimensionScreen.js

Covered in Sections 4 and 7 (gym summary/report/confirm).

### CommunityActivityScreen.js

Covered in Section 10.

### CommunityRulesScreen.js

**Purpose:** static rules text (version 2) + re-consent flow.
**Action:** the ONE emphatic button, "Accept the updated rules" (only
rendered when `route.params.mustAccept` and not yet accepted this
mount) → `acceptRules()` → toast "Rules accepted" → `goBack()` —
`:158-171,177-197`. "Contact" email row → `Linking.openURL('mailto:
support@volyume.app')` — `:258`.
**States:** `mustAccept` banner "The rules have changed" / "The
Community rules have changed. Accept them below to carry on." —
`:179-184`. Failure toast: "Could not do that just now. Try again." —
`:167`.
**Missing:** no offline-specific copy on the accept failure (falls to
the generic line).

### CommunityPrivacyScreen.js

Covered in depth in Section 11.

### CommunityModerationScreen.js

Covered in Section 1.5 and below (moderation is not itself in the
founder's numbered sections but is reported here for completeness).
**Purpose:** moderator-only report queue + audit log.
**Actions:** Open/Actioned chips → `setStatus` → `moderationQueue(status)`
— `:154-163,101-112`; report card tap (Open tab only) → opens action
sheet — `:171`; each of 8 `MODERATION_ACTIONS` buttons → `moderate(id,
action, note)` — `:262-274,116-132`; note field, capped
`MODERATION_NOTE_MAX`=300 — `:52,254-261`.
**States:** non-moderator: `EmptyState` "Not available" / "The
moderator queue is only open to moderators." — `:139-143`. Open, empty:
"Nothing waiting" / "Reports appear here as soon as they are filed." —
`:218-219`. Actioned, empty: "Nothing actioned yet" / "Reports you have
acted on appear here with what was done." — `:220-221`.

### CommunityProgrammeScreen.js

Covered in Section 9.

### CommunityAdaptScreen.js

Not read in full (out of this brief's required depth per the founder's
"another agent covers depth" note for feed/programme/story, but Adapt
is the programme-adaptation flow, not feed). Confirmed from grep:
`EmptyState` "Not available" state (`:194-196`); three buttons —
`secondary` "Use as-is" (`:273-281`), `tertiary` "Try again" (re-read
limitations, `:283-290`), `emphatic` "Save to my plans" (`:295-297`,
allow-listed in `Button.hierarchy.guard.test.js:46-52` per
`[80-VISUAL-INVENTORY.md]`).

### CommunityPublishProgrammeScreen.js

Not read in full. Confirmed from grep: `EmptyState` "Nothing to share
yet" (`:231-234`); title/description `TextField`s; `emphatic` "Share"
action (`:297`, allow-listed), "Share link" `secondary` (`:307-308`),
"Unpublish" `tertiary` (`:314`).

### CommunityComposeScreen.js

Covered in Section 9.

### CommunityPostScreen.js

Covered in Section 9.

### CommunityGymAddScreen.js

Covered in Section 7.

### CommunityTrainingProfileScreen.js

Covered in Section 6.

### CommunityConversationsScreen.js / CommunityConversationScreen.js

Covered in Section 8.

---

## 3. The Hub in detail

**Tabs/chips:** two `Chip`s, "Following" / "Discover"
(`CommunityHubScreen.js:401-413`), `accessibilityRole="radio"`. A
non-joined user never sees the chips at all — `shown` is forced to
`'discover'` (`:129`).

**Population, per section, exact lib→RPC chain:**

| Hub section | Lib call | RPC | File:line |
|---|---|---|---|
| Following feed (posts) | `loadFeed` | `community_feed` | `feed.js:148-150` |
| Discover training stories | `loadDiscoverPosts` | `community_discover_posts` | `feed.js:153-155` |
| Discover programmes | `discoverProgrammes` | `community_discover_programmes` | `feed.js:225-230` |
| "By Volyume" strip | `getLibraryPlans` + `getPlanWorkoutCounts` | local SQLite (`database.js`), NOT a Community RPC | `CommunityHubScreen.js:89-103` |
| "Lifters like you" | `findPeople('like_me', {limit:5})` | `community_find_people` | `CommunityHubScreen.js:181-184` |
| "Around you" dimensions | `myDimensions` | `community_dimensions_me` | `feed.js:178-180` |
| Suggested people (Discover header, `people` field of `loadHub`) | `suggestedPeople` | `community_suggested_people` | `feed.js:173-175` |

**Ordering:** every list is CHRONOLOGICAL by explicit design decision
(SD-06) — "There is no engagement ranking anywhere in Community"
(`feed.js:5-9`). "Lifters like you" is the one SCORED exception
(`findPeople`), read separately from the chronological page precisely
because it is a score, not a feed (`CommunityHubScreen.js:174-185`).

**Pagination:** Following and the Discover-stories list page on the
server's own opaque `cursor` string (`ts|uuid`), never a client-built
one (`feed.js:54-60,65-71`). Discover's four header reads (programmes,
suggestions, dimensions) are read ONCE per open via
`Promise.allSettled`, each independently — a failed section does not
blank the others (`feed.js:107-134`). Programmes and stories carry
SEPARATE cursors (`payload.cursor` vs `payload.programmesCursor`,
`feed.js:125-131`) — the Hub screen itself only ever pages the STORIES
cursor (`onEndReached`, `CommunityHubScreen.js:196-209`); the
programmes' own cursor is used by `CommunitySearchScreen` (Programmes
tab), not by the Hub's `onEndReached`.

**Refresh:** pull-to-refresh runs `load({quiet:true})` (re-reads the
current segment, no spinner swap) plus `refreshMe(true)` in parallel
(`CommunityHubScreen.js:187-194`).

**Unread badges:** two independent dots on the header — Activity bell
dot from `hasUnseen(me)` (follow/connect requests, unseen activity,
OR unread messages combined, `profile.js:151-156`), Messages glyph dot
from `hasUnreadMessages(me)` (unseen messages only,
`profile.js:161-163`) — "the hub sends people to two different places,
so one dot cannot serve both" (`CommunityHubScreen.js:22-24`).

**Offline:** the whole hub payload is cached per user
(`@volyume_community_hub_<uid>`, `feed.js:21,24-52`); a failed read
with a cache hit renders the cache plus the caption "Showing what you
last saw. You are offline." (`CommunityHubScreen.js:439-443`).

---

## 4. People discovery

### Search (`CommunitySearchScreen.js`)

- **Fields searched:** people by handle or display name (client copy:
  "Search by @handle or name", `:115`); programmes by title only. The
  MATCH ALGORITHM itself (prefix/contains/fuzzy) is server-side
  (`community_search_people`/`community_search_programmes`) — the
  client sends the raw trimmed string and applies no filtering of its
  own (`CommunitySearchScreen.js:58-88`; `feed.js:158-170`). Deferred to
  `02-backend-inventory.md` for the RPC's own matching logic.
- **Min chars:** NONE client-side for people search — any non-empty
  trimmed string is sent after the debounce (`CommunitySearchScreen.js:
  65-67`). Programmes with an EMPTY query is a valid request too — it
  returns the Discover list (`:70-71`).
- **Debounce:** 250ms (`DEBOUNCE_MS`, `:36,108`).
- **Partial/prefix/fuzzy:** client cannot say; UI copy implies prefix
  ("Try the start of their handle", `:133`) but this is a hint about
  server behaviour, not something enforced client-side.

### Suggestions (`suggestedPeople`, `feed.js:172-175`)

RPC `community_suggested_people`. Read on the Hub's Discover header
only (`CommunityHubScreen.js:110`). No client-visible reason vocabulary
attaches to this specific call (the Hub renders it via `ProfileCard`
with `reasons={row.reasons ?? []}`, `CommunityHubScreen.js:493`, so
IF the RPC returns reasons they render — the exact reason STRINGS are
server-authored and out of this client inventory's scope). This is
distinct from `findPeople('like_me')`, which the Hub ALSO reads
separately for its own "Lifters like you" section
(`CommunityHubScreen.js:178-185`) — two different RPCs populate two
differently-labelled sections that could read as duplicates to a user
(Discover header's unlabelled `people` array is never actually rendered
under its own heading anywhere in `CommunityHubScreen.js` — only
`likeMe` gets a "Lifters like you" `SectionLabel`, so `suggestedPeople`'s
result is fetched into `hub.people` but **that field is read only for
the empty-vs-not-empty check at `:561`, never rendered as its own list**
— a genuinely unused fetch on the wire).

### Find people (`CommunityFindPeopleScreen.js`) — six doors

Exact door table (`findPeople.js:35-82`):

| Door key | Label | Subtitle | Requires (on `me`) | Unavailable copy |
|---|---|---|---|---|
| `gym` | "At my gym" | "Lifters at your gym" | `gym_label` | "Add your gym to see who trains there" |
| `area` | "Near me" | "Lifters in your area" | `area_label` | "Add your area to see who trains near you" |
| `like_me` | "Train like me" | "Lifters like you" | none | — |
| `programme` | "On my programme" | "Lifters on the same programme" | `tp_programme_key` | "Set an active plan to see who else is on it" |
| `partners` | "Open to training together" | "Lifters open to a training partner" | none | — |
| `might_know` | "People you might know" | "From your connections and follows" | none | — |

Every door is a HARD gate on data availability (not a filter — you
cannot combine two doors; each door is its own screen,
`CommunityPeopleListScreen`, opened with one `mode`). There is no
combinable filter set (no "gym AND experience AND days" query) — this
answers the founder's question directly: **the client offers six
mutually-exclusive discovery modes, never a combinable filter builder.**
No door exists for style, goal, experience band, or age band alone
(experience/age are only visible as facts/bands on a resulting profile
card, never as a filter axis).

Zero-state copy (`findPeople.js:159-171`): gym/area with a known key —
"No one else lists {key} yet. You are the first here; anyone who adds
it will see you."; partners — "No one else is open to training together
yet. Anyone who switches it on will see you."; generic fallback — "No
one to show yet. Share your profile link and anyone who joins will find
you here." REASONS, NEVER PERCENTAGES is a hard rule stated in the
module header (`findPeople.js:6-13`) and enforced by never converting
`score` (a number) into anything shown to the user — `score` is read
back into the `people` array (`findPeople.js:199`) but never rendered
by `ProfileCard.js` (which renders `reasons.join(' · ')` only,
`ProfileCard.js:102,134-140`).

Reason VOCABULARY the client itself builds (gym search ranking,
distinct from `findPeople`'s server-built reasons): `rank.js:104-176` —
`"Matches {brand}"`, `"Close match to {brand}"`, `"In {town}"`, `"Near
{outward}"`, `"Nearby"`. `findPeople`'s own reasons are server strings
passed through opaquely (`findPeople.js:196-200`); the client never
constructs them — deferred to `02-backend-inventory.md`.

### Combinability

**Not combinable.** Each of the six doors is a single navigation target
(`CommunityFindPeopleScreen.js:159-168`) with one `mode` param; there is
no UI anywhere that lets a user AND two doors together, or add a
secondary sort/filter on top of a door's own list.

### Dimension pages (`CommunityDimensionScreen.js`)

Kinds: `style`, `programme`, `gym`, `area` (`DimensionRow.js:24-29`).
Surfaced on the Hub only once ≥`COMMUNITY_DIMENSION_MIN_FOR_HUB`=3 OTHER
people share it (`limits.js:29-37`; filter applied at
`CommunityHubScreen.js:217-218`) — "an internal choice with no external
evidence behind it, recorded as such." A dimension below the threshold
still exists and is reachable from a profile's own facts — **except
this client build never actually links FROM a profile's facts line TO
its dimension page**: `CommunityProfileScreen.js:234-238` renders
`chipLabels.join(' · ')` as a plain `<Text>`, not a pressable row, so a
below-threshold dimension has NO discoverable entry point at all once
it drops off the Hub. Gym dimensions additionally render
`GymSummary` (counts by style, by time band, follow count, partner
count — `findPeople.js:225-246`, `GymSummary.js`).

### Nearby / area / town / city / postcode

Client answer, by mechanism, `postcode.js` + `rank.js` +
`gyms/index.js`:

- **"ML1"** → `recognisePostcode` matches the `outward`-only regex
  (`postcode.js:21,39-51`); `GymPicker` shows a `Chip` "Postcode area
  ML1" (`GymPicker.js:98-105`); `search()` sends the raw text to
  `gyms_search`, and `rankVenues` boosts any venue whose `outward`
  matches (reason "Near ML1", `rank.js:154-158`). Works for gym search
  ONLY, never for people search (`CommunitySearchScreen.js` has no
  postcode handling at all).
- **"Motherwell"** → not postcode-shaped; treated as a plain text
  query. Gym search: `rank.js:146-152` boosts any venue whose `town`
  contains/is-contained-by the query (reason "In Motherwell"). People
  search: no town concept exists on `CommunitySearchScreen` at all —
  typing a town name there just searches it as if it were a
  handle/display name fragment (near-certain zero match).
- **"Glasgow"** → identical to "Motherwell": town-match reason in gym
  search only.
- **"PureGym Motherwell"** → gym search: `rank.js:97-101,131-144`
  matches the brand alias table (`puregym`→"PureGym") for a
  `BRAND_EXACT` score plus the town match, both reasons surfaced
  ("Matches PureGym", "In Motherwell"). Not applicable to people search.
- **"gyms near me"** → **does nothing useful.** `near(lat,lng)` (the
  actual "near me" RPC) is never called by any screen
  (`gyms/index.js:8-19`, Section 1.5); the literal string "gyms near me"
  typed into `GymPicker` is sent as plain text to `gyms_search`, which
  has no lat/lng (both `null`, `GymPicker.js:69` calls `searchGyms(text)`
  with no opts) — GD-13 explicitly forbids ever reading device location
  (`gyms/index.js:8-19`, `CommunityEditProfileScreen.js:328` "Only the
  gym you choose. Never your location."). The words "near" and "me"
  match no brand alias and no town, so this query returns whatever the
  server's plain-text fallback ranks, effectively noise. **There is no
  location-based discovery anywhere in this client build.**
- **A person's name** → `CommunitySearchScreen`, People tab, matched by
  the server against display name (mechanism deferred to backend
  inventory).
- **A handle** → same screen, matched against handle.
- **A partial handle** → per the empty-state copy ("Try the start of
  their handle") the product intends prefix matching; not verifiable
  client-side.

**Radius:** no radius control exists anywhere in the client (`near()`
takes a `radiusM` default 8047m/5mi but is never called from UI,
`gyms/index.js:109,112`).

**Combinable with what:** location/postcode/town text is a single free-
text field feeding one ranked list; it cannot be combined with a style,
goal, or experience filter, because no such filter control exists on
either `GymPicker` or `CommunitySearchScreen`.

---

## 5. Profile screen (`CommunityProfileScreen.js`)

**Fields shown, source of each:**

| Field | Source | Chosen or inferred |
|---|---|---|
| Avatar, display name, handle | `card.avatar_preset/display_name/handle` — typed on Edit profile | Chosen |
| Bio | `card.bio` | Chosen |
| Facts line (styles, goal, setting) | `factLabels(card)`, `ProfileCard.js:66-74` reading `card.styles/goal/setting` | Chosen |
| "Open to training together" chip | `card.open_to_partner` | Chosen (toggle on Training profile screen) |
| Place line | `placeLine(card)` — "Trains at {gym_label}" / area, `ProfileCard.js:77-82` | Chosen |
| Training profile line | `TrainingProfileLine` → `previewLine(tp_* bands)` | Inferred (derived from real training) then explicitly chosen to share, per band |
| Follower/following counts | `card.follower_count/following_count` | Computed server-side |
| Connection count | `card.connection_count` (null when viewer may not see it — a private profile's count is never claimed) | Computed |
| Stories / Programmes tabs | `data.posts`/`data.programmes` from `getProfile()` | User-authored content |

**Action row states (`CommunityProfileScreen.js:277-333`,
`ConnectButton.js:94-102`, `FollowButton.js:26-39`):**

| State | Controls shown |
|---|---|
| `self` (own profile) | "Edit profile" (`primary`), "Share link" (`secondary`) — `:279-298` |
| `blocked` (you blocked them) | "Unblock" (`secondary`) only — `:300-310` |
| `none` | Follow button (label "Follow" or "Follow back" if `followed_by`) + Connect button (`primary`, "Connect") — `:316-333` |
| `requested_by_me` (follow) | Follow button reads "Requested" | 
| `requested_by_me` (connect) | Connect button reads "Requested" (`secondary`); tap → confirm-withdraw alert |
| `requested_by_them` (connect) | Connect button reads "Respond" (`primary`); tap → Accept/Decline alert |
| `connected` | Follow collapses to icon-only checkmark (V7a); Connect button becomes "Connected" (`secondary`) + a separate "Message" (`primary`) button appears beside it — `ConnectButton.js:218-230` |
| `minor` (viewer OR target is a minor) | Connect never offered at all (`shouldOfferConnect`, `ConnectButton.js:85-92`); Follow is unaffected |
| `not_found` (block in either direction, indistinguishable from a genuinely missing profile) | if the reader's own blocked list contains this person, the blocked empty-state and Unblock action render instead of "not available" — `:130-136,368-376`; otherwise a plain "Profile not available" with no retry (`:389-393`) |

**Menu sheet items (`ProfileMenuSheet.js:84-105`):** "Share link"
(native `Share.share`); "Mute"/"Unmute" (single tap, toast "Muted. They
are not told." / "Unmuted"); "Block"/"Unblock" (Block confirmed via
`appAlert`, copy: "Neither of you will see the other in Community, and
any follow between you is removed. You can unblock later."); "Report"
(opens `ReportSheet`). "Remove connection" deliberately lives ONLY on
`ConnectButton`'s own "Connected" menu, not duplicated here
(`ProfileMenuSheet.js:12-17`).

**Followers/Following sheet:** opens as a `BottomSheet`, not a pushed
screen (`CommunityProfileScreen.js:492-530`); empty state "Nobody yet"
+ "Find people" action.

---

## 6. Training profile / partner section

Screen: `CommunityTrainingProfileScreen.js`. Lib: `trainingProfile.js`.

**Bands, exactly what and from what rows (`trainingProfile.js:
212-320`):**

| Band | Derived from | Rule |
|---|---|---|
| `tp_days` | `getCompletedWorkoutStartTimestamps` (device SQLite) | A weekday counts as a "usual" training day only when it holds ≥`TP_DAY_SHARE`=0.25 of sessions in the 12-week window AND total sessions ≥`TP_DAY_MIN_SESSIONS`=6 (`:107-108,258-269`) |
| `tp_time_bands` | same timestamps, local hour of day | Up to `TP_MAX_TIME_BANDS`=2 bands whose share ≥`TP_TIME_BAND_SHARE`=0.35 (`:109-110,272-283`); bands: morning 05-09, midday 09-14, afternoon 14-17, evening 17-22, late 22-05 (`:62-68,161-169`) |
| `tp_sessions_band` | session count / elapsed weeks (capped, floored at 1 week) | Mapped to one of `1_2`/`3`/`4_5`/`6_plus` (`sessionsBandFor`, `:198-205`) |
| `tp_staple_lifts` | `getWorkoutSetsSince` (device SQLite), filtered to canonical (non-custom) exercise ids from `getAllExercises` | Counted by DISTINCT session (workout id), not by set count; top `TP_MAX_STAPLE_LIFTS`=5 (`:292-310`) |
| `tp_experience_band` | `useAppStore().userProfile.experience` (onboarding field) | Mapped `beginner/new→new`, `intermediate→intermediate`, `advanced/experienced/competitive→experienced` (`experienceBand`, `:176-192`) |
| `tp_programme_key` | `getActivePlan` (device SQLite) | Priority: Community-source plan id → the caller's own published programme matching this plan → `style:{styleKey}` from plan tags → null (`programmeKeyFor`, `:426-450`) |
| `tp_age_band` (`share_age_band` flag only leaves the device) | Server-derived from DOB when the flag is on; NEVER for a minor | Client never computes or reads the actual band value except as echoed back on `me.tp_age_band` for display (`:94`) |

**Window:** last `TP_WINDOW_WEEKS`=12 weeks, injected clock (pure
function, testable) — `:112,232-238`.

**Toggles (`TP_DEFAULT_SHARE`, `:120-128`):** `days` OFF, `time_bands`
OFF, `sessions` ON, `staple_lifts` ON, `experience` ON, `programme` ON,
`age_band` OFF by default — "the three that are off are the three that
say most about where a person is and when."

**Payload shaping (`shareablePayload`, `:508-520`):** only fields whose
toggle is ON are included; the server NULLS anything absent, so
switching a toggle off is an ERASURE, not a stale value left behind.

**Sync (`syncTrainingProfile`, `:534-561`):** at most once per 24h
(`TP_SYNC_INTERVAL_MS`), throttle in AsyncStorage keyed per user,
`force:true` on the Training Profile screen and on Join so an explicit
toggle change takes immediately.

**Preview:** `previewLine()` is the SAME function used for both "what
you're about to share" (Join, Training Profile screen) and "what other
people see" (`TrainingProfileLine` on the profile) — cited by the
module's own header as deliberate (`trainingProfile.js:9-14`).

**Partner section (`CommunityTrainingProfileScreen.js:276-375`):**
"Open to training together" switch (`setPartner`); when on, exposes Day
chips (`TP_DAYS`), Time chips (own label set `PARTNER_TIME_LABELS`, NOT
reusing `TP_TIME_BANDS`'s wording verbatim — e.g. "Afternoons" vs
"afternoon", `:56-62`), and a "Same gym only" switch. Safety line:
"If you arrange to train with someone, meet at the gym and tell
someone." (`PARTNER_SAFETY_LINE`, `:49`). Minor: the entire partner
section is replaced by "Training partner matching opens at 18." (`:276-282`).

**Discrepancy found (evidence-first, not a judgement):** the **age-band
row** in `bandRows()` (`:89-95`) is rendered with a live `Switch` on
`CommunityTrainingProfileScreen.js:257-262` with NO `isMinor` guard —
`isMinor` is read into the screen (`:104`) and used to gate the
PARTNER section (`:276`) but never to filter or disable the age-band
toggle row itself. By contrast, `CommunityJoinScreen.js:365-366`
explicitly filters `bandRows(...).filter((row) => !(isMinor && row.key
=== 'age_band'))` before rendering. So a minor who opens the Training
Profile screen (reachable via `CommunityEditProfileScreen.js:377` or
`CommunityPrivacyScreen.js:255`, neither of which checks `is_minor`
before navigating) sees and can flip an age-band toggle that the server
is documented to refuse to act on for a minor (SD-32) — the control is
inert but not hidden, and the screen never explains why nothing
appears to happen.

---

## 7. Gym surfaces

**`GymPicker.js`** — embedded search-and-select, used by
`CommunityJoinScreen.js:290` (primary gym only) and
`CommunityEditProfileScreen.js:298,356` (primary + up to 3 others).
250ms debounce, `MIN_QUERY`=2 chars (`GymPicker.js:38-39,57-58`).
Postcode chip shown live while typing looks postcode-like
(`recognisePostcode`). Results via `search()` → `gyms_search`, ranked
client-side by `rankVenues`. Empty state (≥2 chars, no results):
"No gyms match yet" / "It shows for everyone once a second person
confirms it." + action "Can't find your gym? Add it" →
`CommunityGymAdd` (`GymPicker.js:121-131`).

**`CommunityGymAddScreen.js`** — form fields: Gym name (max 80), Address
line (max 120), Town (max 60), Postcode (validated against
`isFullPostcode` before submit is enabled — client-side gate,
`CommunityGymAddScreen.js:64-69`), Website (optional, max 200),
Operator (optional, max 60). Client validation: all four required
fields non-empty AND postcode passes the UK postcode regex before "Add
gym" enables (`:65-69`); an in-progress invalid postcode shows "That
does not look like a UK postcode." inline (`:170-174`). Duplicate
detection UX: server-side at submission
(`gyms_submit`→`out.duplicate_of`); client renders "Did you mean
{displayName}?" with "Use this gym" (selects the existing venue) or
"Add it anyway" (`:106-132`). After a genuine new submission: toast
"Added. It shows for everyone once a second person confirms it." —
**pending, not live** — and the screen selects it immediately for its
own submitter (`:93-94`).

**Gym dimension page** (`CommunityDimensionScreen.js`) — "Is this gym
real? Confirm it" button, shown only when `isPendingVenue(venue)` is
true (a `user_submitted_pending` venue not yet second-confirmed) →
`confirmSubmission(venueId)` → toast "Thanks. This gym is now listed."
(`:200-212,230-239`). Confirmation refusals: `not_allowed` "You added
this gym, so someone else needs to confirm it." (the submitter cannot
self-confirm), `already_confirmed` "You have already confirmed this
gym." (`:65-71`). "Report a problem with this gym" link → `GymReportSheet`
with the 6 `REPORT_KINDS` as radio chips (closed/wrong_name/
wrong_location/duplicate_of/not_a_gym/other) + optional 500-char detail
(`:36-43,79-141`).

**Primary/other gyms** written via `setGyms(gymId, otherGymIds)` →
`community_set_gyms` — a Community RPC, not a `gyms_*` RPC
(`gyms/index.js:220-236`), server-capped at 3 others regardless of what
the client sends.

---

## 8. Messaging client

**Conversations list (`CommunityConversationsScreen.js`):** newest
activity first, `listConversations`→`community_conversations`, page 30,
no realtime — re-read on `useFocusEffect` and pull-to-refresh only
(`:1-18,56-69`). Row: name, `@handle · last-message-first-line`, day
(never a clock time, `ConversationRow.js:6-8,41-47`), unread dot. Empty:
error → `"You are offline"`/generic + retry; no error → "No messages
yet" / "Messages are between people you are connected with. Connect
with someone from Find people first." + action "Find people" —
`:103-123`. Tapping a row with `unread>0` optimistically zeroes it and
calls `markRead` — `:91-101`.

**Thread (`CommunityConversationScreen.js`):** resolves from `id` (deep
link/list tap), `userId` (Message button elsewhere), or both; walks up
to `SCAN_PAGES`=5 pages of the conversation list to find a thread not
directly addressable by id (`:66-115`). Polls every `POLL_MS`=20000ms
while focused, no socket (`:61-64,210-214`). Composer: `MessageComposer`
— field always starts empty (never pre-written), placeholder is a
PROMPT from `placeholderFor(ref)` ("Ask about this programme" / "Say
something about this session" / "Write a message", `messages.js:44-49`),
character count only shown once ≥900/1000 (`MessageComposer.js:29-30,39`).
A context `ref` (programme or post) attaches ONLY to the very first
message of a brand-new thread (`!refSent.current`,
`CommunityConversationScreen.js:238`) — confirmed matches the discovery
blueprint's own "open item" 2 note about the reference only attaching
to a first message.

**Refusal states surfaced inline (not toasts) via a `notice` banner
(`:337-357`):** `not_connected` → "You need to be connected to message.
Send a connection request first." + a "Connect" button that opens the
other person's profile; `minor_restricted` → "Messages are available to
people aged 18 and over."; `blocked` → "This conversation is no longer
available." `rules_outdated` routes to `CommunityRules` instead of
showing a notice, so the failed message can be retried after accepting
(`:250-263`).

**Closed conversation:** a thread no longer in `community_conversations`
(connection removed, block placed) renders "This conversation has
ended." both as the list-empty line and inline above a disabled
composer (`CONVERSATION_CLOSED_LINE`, `:73,421-426,453-460`); history
stays visible, no new message can be sent (`canCompose` false, `:335`).

**Controls:** header `...` menu (`MenuSheet`) — Report (opens
`ReportSheet` on the person), "Remove connection" (confirm alert, ends
conversation, keeps follows), "Block" (confirm alert, ends conversation,
removes follows) — `:467-495`. Long-press a message: own message →
confirm-delete (hard delete, both sides, `:273-289`); other's message →
opens `ReportSheet` targeting that specific message
(`REPORT_TARGET_KINDS` includes `'message'`, `moderation.js:29`).

**Media/link support:** NONE. `MESSAGE_REF_KINDS` is exactly
`['programme','post']` (`messages.js:34`) — a message may carry one
existing programme/story tile as a reference, never an uploaded image,
file, or arbitrary link preview.

**Message-request concept:** **does not exist as a separate object.**
Messaging is gated entirely by the Connect tier — `sendMessage` throws
`not_connected` if the two people are not connected
(`messages.js:96-98`), and there is no server or client concept of an
unaccepted "message request" sitting in an inbox; the equivalent
gatekeeping step is the CONNECT request (Section 5/discovery), answered
on the Activity screen before any message can be sent at all.

---

## 9. Feed / stories / programmes client surfaces (brief)

**Feed cards:** `PostCard.js` — five kinds (`pr`, `session`, `block`,
`milestone`, `programme`), each rendering only its own allow-listed
fields (`bodyForKind`, `PostCard.js:64-113`). Actions: author row tap
→ open profile; "Respect" tap (`thumbs-up-outline`→`thumbs-up`) →
`onReact`; comment-count tap → open post; optional "Message" action
(only rendered when `onMessageAuthor` is passed, i.e. only from
`CommunityPostScreen.js:237` and only when the viewer is connected to
the author, `connectionState(card)==='connected'`).

**Story screen (`CommunityPostScreen.js`):** the card, its comment
thread (`CommentRow`/`CommentComposer`), a single "Respect" tap, header
menu → Delete (own) or Report (others'). No profile → `JoinToInteractRow`
replaces both the composer and the reaction control entirely (rather
than letting the tap fail after the fact).

**Programme screen (`CommunityProgrammeScreen.js`):** creator
`ProfileCard` with full Connect/Message composition; chip row (style,
days, exercise count, "Circuits" — deduplicated against the style chip
of the same word, `:240-249`); "People on this programme" count row →
`CommunityPeopleList` (`mode:'programme'`); `ProgrammeStructure` render
of the snapshot; comment thread; two primary actions — "Adapt for me"
(default `primary`) → `CommunityAdapt`, "Use as-is" (`secondary`) →
confirm alert → `importSnapshotAsPlan` → `PlanDetail`, with distinct
copy for a first copy vs. a repeat copy ("Copy this programme?" vs "Copy
it again? You already have a copy in your plans. This makes another
one.", `:157-160`). Share via native `Share.share(programmeUrl(id))`.

**Compose screen:** builds the post payload via ONE of five named
builders (`buildPrPayload`/`buildSessionPayload`/`buildBlockPayload`/
`buildMilestonePayload`/`buildProgrammePayload`) selected purely by
`kind` (`CommunityComposeScreen.js:54-61`) — the screen never assembles
a payload itself. No-profile → `navigation.replace('CommunityJoin', ...)`
(replace, not push, so backing out of Join lands the user back where
they started rather than on a half-loaded Compose, `:84-91`).
Visibility: Public / Followers chips (`VISIBILITY_OPTIONS`, `:39-42`).

---

## 10. Notifications client

**Activity screen (`CommunityActivityScreen.js`):** in-app record of
everything — "a push is an extra, never the record" (`:2-8`). Sections
in order: Connection requests (`ConnectRequestRow`, showing the
requester's reasons and note, Accept/Decline), Follow requests
(`ProfileCard` + Accept/Decline buttons), then the general Activity
list. Opening the screen marks everything seen
(`markActivitySeen`→`refreshMe(true)`, `:112-116`). Activity line
vocabulary (`ActivityRow.js:34-47`): "followed you", "asked to follow
you", "accepted your follow", "gave your post respect", "commented on
your post", "is using your programme", "wants to connect", "is now
connected with you". Empty: error state or "Quiet for now" / "Follows,
reactions and comments on your posts appear here." + "Find people"
action.

**Categories (`categories.js:61-68`):** `COMMUNITY_FOLLOW` =
`'community_follow'`, `COMMUNITY_ACTIVITY` = `'community_activity'`,
`COMMUNITY_MESSAGE` = `'community_message'` — three categories total,
all server-sendable via the `community-notify` Edge Function
(`notify.js:38-47`), the same mechanism the retired `partner_cheer` used.

**Settings rows (`NotificationSettingsScreen.js:764-819`), exact copy:**
"New followers" (sub: "Follow requests and new followers."),
"Reactions and comments" (sub: "When someone reacts to or comments on
your posts, or uses your programme."), "Messages" (sub not fully
captured in the grepped range but the toggle exists at `:804-817`). All
three default ON (`useState(true)`, `:99-102`), toggled via
`setCategoryEnabled(userId, CATEGORY.X, value)`, with toasts "Community
follows on/off", "Community activity on/off", "Community messages
on/off" (`:449,461,476`).

**Routing (`notificationRoute.js:166-184`):** `community_follow` and
`community_activity` both land on `CommunityActivity`;
`community_message` lands directly on `CommunityConversation` with the
`conversation_id` from the payload (reading both `conversation_id` and
camelCase `conversationId` defensively). Retired `partner_cheer`/
`partner_streak`/`partner_joined` (any still queued/in-tray) land on
plain `Community` (`:118-127`).

**Badges:** two independent dots, covered in Section 3 (Activity bell
vs. Messages glyph on the Hub header).

---

## 11. Privacy screen (`CommunityPrivacyScreen.js`)

Every control, exact copy, exact effect:

| Control | Copy | Effect |
|---|---|---|
| Visibility chips | "Anyone" / "People I approve" | `upsertProfile({visibility})` → `community_upsert_profile`; hint line: "Anyone signed in can follow you and see what you post." / "You approve every follower before they see what you post." (`:190-210`) |
| Connect-from chips | "Anyone" / "People who follow me" / "Nobody" | `setConnectFrom(value)` → `community_set_connect_from`; hint per value: "Anyone can send you a request to connect." / "Only people who already follow you can send you a request." / "Nobody can send you a request to connect." (`:214-233`). A `rules_outdated` refusal here routes to `CommunityRules` rather than a generic error toast (`:110-116`) |
| "Show which programmes I use" switch | sub: `'Lets people find you on the "People on this programme" list for programmes you use or publish.'` | `setShowProgrammes(next)` → `community_set_show_programmes` (`:236-250`) |
| "Training profile" row | sub: "The bands worked out from your training, and what you share of them." | `navigate('CommunityTrainingProfile')` (`:251-256`) |
| Blocked list | each row: `ProfileCard` (compact, no follow) + "Unblock" button | `unblockUser(id)` → `community_unblock`, toast "Unblocked" (`:259-282`); empty copy "You have not blocked anyone." |
| Muted list | each row: `ProfileCard` (compact) + "Unmute" button | `unmuteUser(id)` → `community_unmute`, toast "Unmuted" (`:285-308`); empty copy "You have not muted anyone." |
| "Edit profile" row | — | `navigate('CommunityEditProfile')` |
| "Moderation queue" row (moderator only) | — | `navigate('CommunityModeration')` |
| "Community rules" row | — | `navigate('CommunityRules')` |
| "Leave Community" row (destructive) | confirm: "Leave Community?" / "Your profile, posts, published programmes and follows are deleted. Your training, plans and food diary are not touched." | `leaveCommunity()` → `community_leave`, toast "You have left Community", `goBack()` (`:147-169`) |

**Not-joined state:** `EmptyState` "You are not in Community yet" /
"Nothing about you is shared until you create a profile." + "Open
Community" action (`:177-185`) — the `PrivacyReceipt` still renders
above this (`:175`), so the promise is readable BEFORE joining, exactly
as `PrivacyReceipt.js`'s own header states its dual purpose.

---

## 12. Classification table

Per the founder's capability list. Evidence is one line each; fuller
evidence for most rows is in the numbered sections above.

| Capability | Status | Evidence |
|---|---|---|
| Username/handle search | Fully implemented | `CommunitySearchScreen.js` People tab → `searchPeople`→`community_search_people` |
| Name search | Fully implemented | same screen, same field (one query searches both) |
| Partial search | Partially | client sends the raw string with no min-length gate; matching behaviour (true prefix vs substring) is server-side, unverified from the client (`CommunitySearchScreen.js:58-88`) |
| Suggestions | Fully implemented (people) | `suggestedPeople`/`findPeople('like_me')` both wired and rendered — Section 4 |
| Mutuals | Not discoverable | no client surface computes or displays "N mutual follows"/"mutual connections" anywhere; `might_know` door exists but its subtitle only says "From your connections and follows" (`findPeople.js:74-77`), no mutual COUNT is ever rendered |
| People-you-may-know | Fully implemented | `might_know` door, `CommunityFindPeopleScreen.js` |
| Nearby | Absent (client-reachable path) | `near()`/`gyms_near` never called by any screen — Section 1.5, Section 4 |
| Town | Fully implemented (gyms only) | `rank.js:146-152` town-match reason; NOT available for people search |
| City | Fully implemented (gyms only) | same mechanism as town (no separate concept) |
| Region | Absent | no region/county concept anywhere in client code |
| Gym | Fully implemented | `GymPicker`, gym dimension pages, `gym` find-people door |
| Programme | Fully implemented | `programme` find-people door, programme dimension pages, "People on this programme" |
| Goal | UI only | `COMMUNITY_GOALS` chosen on Edit Profile/Join and shown as a fact chip on profile cards; NOT usable as a search/filter axis anywhere |
| Training style | Partially | chosen on profile (up to 3), shown as facts and a dimension (`style`); not a find-people door or search filter |
| Experience | Signal only | derived as `tp_experience_band`, shown in the training-profile preview line when shared; never a filter/search axis |
| Frequency | Signal only | `tp_sessions_band`, shown in preview line; never a filter axis |
| Schedule (days/times) | Signal only | `tp_days`/`tp_time_bands`, shown in preview line and used server-side to match `partners` mode (unverifiable client-side which fields the server actually filters on); never a client-exposed filter |
| Equipment | Absent | `COMMUNITY_SETTINGS` (commercial/home/minimal-kit) is the closest concept — a chosen "where you train" fact, not an equipment inventory; no equipment filter anywhere |
| Training behaviour | Signal only | staple lifts (`tp_staple_lifts`) shown as a count only ("3 lifts"), never named or filterable |
| Partner availability | Fully implemented | "Open to training together" toggle + `partners` find-people door + partner day/time/same-gym prefs, `CommunityTrainingProfileScreen.js:276-375` |
| Creators | Fully implemented | creator `ProfileCard` on every `CommunityProgrammeScreen` |
| Local discovery | Partially | town/postcode work for gyms; no equivalent for people beyond the `area` door (self-typed area label, no geocoding) |
| Current location | Absent | GD-13: device location never read or requested anywhere in this client (`gyms/index.js:8-19`, `CommunityEditProfileScreen.js:328`) |
| Radius | Absent | `near()`'s `radiusM` param exists but is dead code (never called) |
| Nearby gyms | Absent (as "nearby") | gym search ranks by distance ONLY when lat/lng are supplied, and nothing supplies them (Section 4) |
| People at my gym | Fully implemented | `gym` find-people door, gym dimension page's people list |
| People near my gym | Not discoverable | no radius-around-a-gym concept; only the exact-gym-label match (`gym` door) exists |
| Add gym | Fully implemented | `CommunityGymAddScreen.js`, with client-side postcode validation and server duplicate detection |
| Gym intelligence surfaces | Fully implemented | `GymSummary` (member count, follow count, by-style, by-time-band, open-to-partner count) on gym dimension pages |
| Connection request with context | Fully implemented | `ConnectSheet` (up to 2 fixed reasons + 120-char note), `ConnectRequestRow` on Activity |
| Messaging | Fully implemented | Section 8 |
| Message requests | Absent (no separate object) | messaging is gated by Connect, not by its own request/accept inbox — Section 8 |
| Media | Absent | `MESSAGE_REF_KINDS`/`POST_PAYLOAD_KEYS` carry no image/file field anywhere; no upload control on any Compose/message/profile screen |
| Groups | Absent | no group/room concept in any screen or lib module |
| Challenges | Absent | no challenge concept anywhere |
| Leaderboards | Absent | no ranked/leaderboard list anywhere (feed is explicitly chronological, `feed.js:5-9`) |
| Live presence | Absent | no "online now"/"at the gym now" indicator anywhere; gym pages are explicitly "a noticeboard, never a room" (`CommunityDimensionScreen.js:10-17`) |
| Comments | Fully implemented | `CommentRow`/`CommentComposer` on stories and programmes |
| Reactions | Partially | exactly one reaction type ("Respect", a thumbs-up toggle) — no reaction picker, no multiple reaction types |
| Mentions | Absent | no `@mention` parsing/autocomplete anywhere in caption/comment/message composers |
| Saves | Absent | no bookmark/save concept on any post, programme, or profile |
| Shares | Fully implemented | native `Share.share()` on profile/programme (deep links via `links.js`); no in-app repost/share-to-feed mechanic |

---

## Ambiguities / could not determine

1. **Server-side search matching algorithm** (prefix vs substring vs
   fuzzy, for people and programme search) is not determinable from the
   client — the client only sends the trimmed raw string
   (`CommunitySearchScreen.js:58-88`; `feed.js:158-170`). Deferred to
   `02-backend-inventory.md`.
2. **`suggestedPeople`'s reason vocabulary** (the exact strings
   `community_suggested_people` returns) cannot be read from the client
   — the field is fetched into `hub.people` (`CommunityHubScreen.js:
   123`) but, as noted in Section 4, is never actually rendered under
   its own heading; only `findPeople('like_me')`'s results are shown.
   Whether the unused `suggestedPeople` fetch is a leftover from an
   earlier design or intentionally kept for a future surface could not
   be determined from the code or its comments.
3. **Whether `might_know`'s "mutual connections/follows" signal is
   computed and simply not surfaced, or not computed at all**, cannot
   be determined client-side; the door's own subtitle references
   "connections and follows" but no count or list of the actual mutuals
   is ever requested or rendered.
4. **The exact server-side effect of `moderationQueue('dismissed')`**
   (a third valid status per the function's own JSDoc, `moderation.js:
   61`) relative to the "Actioned" tab shown in the UI — whether
   dismissed reports appear inside "Actioned" or are simply invisible
   to the client entirely — could not be determined without reading the
   RPC.
5. **Whether the age-band toggle's absence of a minor guard on
   `CommunityTrainingProfileScreen.js` (Section 6) is a genuine gap or
   already covered by a server-side no-op** could not be fully settled
   from the client alone; the client renders and allows toggling it
   regardless of `isMinor`, but the actual band VALUE is server-derived
   and the server is documented elsewhere (SD-32) to never derive one
   for a minor — so the practical effect may be a switch that visibly
   does nothing rather than one that leaks data. Flagged as evidence,
   not as a conclusion about safety impact.
