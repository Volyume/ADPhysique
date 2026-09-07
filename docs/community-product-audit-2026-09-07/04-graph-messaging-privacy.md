# 04 — Graph, messaging, notifications, deep links, privacy, moderation

Authority: `docs/community-product-audit-2026-09-07/README.md`. READ-ONLY.
Method: full read of `src/lib/community/{connections,profile,messages,
moderation,notify,activity,links,limits,keywordFilter,validation}.js`,
`src/components/community/{ConnectButton,ConnectSheet,ConnectRequestRow,
ProfileMenuSheet,MessageBubble,FollowButton,CommunityHeaderAction,
ReportSheet,PrivacyReceipt}.js`, every `src/screens/Community*.js` screen
named in the brief, `src/lib/notifications/{categories,categoryPrefs,
notificationRoute,quietHours}.js`, `src/lib/authDeepLink.js`,
`supabase/functions/community-notify/index.ts`,
`supabase/functions/community-public/index.ts`, `supabase/migrate_160_
community.sql`, `supabase/migrate_161_community_connections.sql`,
`supabase/migrate_162_gym_directory.sql` (function-by-function, every
`_community_is_blocked`/`_community_can_view*` call site grepped),
`public/{u,p,s}/index.html`, `docs/community-safety/*.md`,
`docs/social-discovery-2026-09-06/{70-DISCOVERY-BLUEPRINT,72-REVIEW-
SECURITY-CONNECTIONS,73-REVIEW-PRODUCT-DISCOVERY,01-recon-partners}.md`.

**Top-line fact, load-bearing for every section below.** Per
`supabase/README.md:565-567`, migrations **160, 161 and 162 are
"WRITTEN, NOT APPLIED — awaiting the founder's exact phrase"**. The
CLAUDE.md status line confirms cloud migrations are applied only through
`migrate_157`. Every `community_*` table and every RPC this document
traces **does not exist in the production EU-Dublin database today**.
The client code, the two Edge Functions and the three migration files
are all present and internally consistent at HEAD, but the entire
Community backend is currently **Infrastructure only** in production —
every screen that calls a `community_*` RPC would get a Postgres
"function does not exist" / "relation does not exist" error against
production as it stands. All findings below describe the mechanism AS
WRITTEN; production reachability is called out separately in section 9.

---

## 1. Relationship states

| State | Exists | One-way / reciprocal | Who can initiate | Evidence |
|---|---|---|---|---|
| Follow | Yes | One-way edge, always | Anyone not blocked, subject to the target's follow visibility | `community_follow` `migrate_160:1741-1789` |
| Following | Yes | Reciprocal only if both follow each other independently | n/a | `community_profiles.visibility` gate |
| Request (follow) | Yes | One-way, pending | Automatic when target's profile `visibility='followers'` | `migrate_160:1774` `v_state := CASE WHEN v_them.visibility='public' THEN 'accepted' ELSE 'requested' END` |
| Requested (connect) | Yes | One-way, pending | Sender via Connect | `community_connect` `migrate_161:1185-1284` |
| Accepted (follow request) | Yes | Converts the one edge to `accepted` | Target | `community_respond_follow` `migrate_160:1807-1839` |
| Connected | Yes | Mutual, and MINTS two `accepted` follow edges both ways | Either party accepting | `community_respond_connect` `migrate_161:1297-1364` |
| Message | Yes | Only inside a `connected` tie | Either connected party | `community_send_message` `migrate_161:2527-2555` (`not_connected` refusal) |
| Remove (connection) | Yes | Removes the connection row only; both follow edges are LEFT IN PLACE | Either connected party | `community_remove_connection`→`community.js`; SQL not shown to client but confirmed by `ConnectButton.js:175-189` copy: "You each stay following the other" |
| Unfollow | Yes | Removes one follow edge. If the two were connected, ALSO removes the connection and closes the conversation | Follower | `community_unfollow` `migrate_161:2736-2771` |
| Block | Yes | Bidirectional invisibility; deletes both follow edges, the pending/live connection (not a `declined` one, see §8 finding 3), closes the conversation, deletes cross-activity | Either party | `community_block` `migrate_161:2685-2731` |
| Mute | Yes | One-way; silences the muted person's connect/message PUSHES only, conversation and content unaffected | Either party | `community_mute` `migrate_160:1972-1988`; silencing scope `community-notify:110-113,417-431` |
| Restrict | Yes (moderator action, not a user control) | Server flag on the target account | Moderator only | `community_moderate` action `restrict_account` `migrate_160:3599+`, `MODERATION_ACTIONS` `moderation.js:20-23` |

**Explicit answers:**
- **Following is one-way.** `community_follow` writes a single directed row in `community_follows` (`migrate_160:1741-1789`); nothing mints a reciprocal edge.
- **Connection is reciprocal.** `community_respond_connect` on accept inserts/updates TWO `community_follows` rows, one each direction, both `state='accepted'` (`migrate_161:1341-1347`), on top of the `community_connections` mutual row.
- **Messaging requires connection**, checked fresh on every send: `NOT public._community_is_connected(v_uid, _target)` → `not_connected` (`migrate_161:2559-2561`). A follower who is not connected cannot message — `_community_is_connected` (`migrate_161:672-694`) reads `community_connections.state='connected'` only, follow state is irrelevant.
- **A follower alone cannot message.** Confirmed above; `shouldOfferConnect`/`ConnectButton` only ever offers Message once `connectionState(card)==='connected'` (`ConnectButton.js:94-101,220-230`).
- **There is no message-request inbox.** There is no "message request" concept anywhere in the schema or client: a message either sends (connected) or is refused (`not_connected`) at compose time; nothing is held for later approval. `MESSAGE_REF_KINDS` and the whole messages.js module (`src/lib/community/messages.js:1-22`) describe only a post-connection 1:1 channel.
- **After acceptance:** two follow edges + one `community_connections` row (`state='connected'`) + a new `community_conversations` row is created lazily on first message (`migrate_161:2591-2596`, `DELETE FROM community_conversations WHERE user_a=v_a AND user_b=v_b` runs on accept first, `migrate_161:1355-1357`, so a stale closed conversation from an earlier tie never reopens with old history).
- **After removal (`community_unfollow`'s connection branch / `community_remove_connection`):** the connection row is deleted, the conversation is closed (`closed_at`), both follow edges survive. Feed items already posted are untouched (posts are not connection-scoped); future feed/discovery eligibility for `programme`/`partners` doors is unaffected by connection state (those doors gate on `visibility`/block, not on connection).
- **After blocking:** both follow edges deleted, non-declined connection rows deleted, conversation closed, cross-activity rows deleted (`migrate_161:2705-2725`). The blocked party is not told (`community_get_profile` returns `not_found` for either side, `migrate_160:3117-3121`, "the profile simply is not there (SD-11, two-way invisibility)").

**Block predicate coverage — every read RPC checked (full grep of `_community_is_blocked`/`_community_can_view` across all three migrations):**
`_community_can_view` (`migrate_160:735-759`) embeds `NOT _community_is_blocked` and is the gate `_community_can_view_post`/`_community_can_view_programme`/`_community_profile_card` all build on. Confirmed present, by direct grep and read, in: `community_get_profile` (`3119`, explicit `not_found` on block — full two-way hide, not a degraded card), `community_list_follows` (`1897`), `community_feed` (`2659`), `community_discover_posts` (`2714`), `community_search_programmes`/`community_discover_programmes` (`2443`, discover delegates to search), `community_get_programme` (`2298,2303`), `community_record_programme_use` (`2345`), `community_search_people` (`2967`), `community_suggested_people` (`3012`), `community_dimensions_me` (`3199-3245`), `community_dimension` (`3311-3356`), `community_activity` (`3401`), `community_list_connections` (`migrate_161:1467,1491,1507`), `community_find_people` (`1912`), `community_programme_people` (`2083`), `community_gym_summary` (`2136,158` in 162's re-issue), `community_gym_suggest`, `community_conversations` (`2426`), `community_messages` (`2489`), `community_send_message` (`2555`), `community_get_me`'s unread count (`912`). **No read RPC was found missing the block predicate** across 160/161/162 — this is stronger than most social features audited this way; the one intentionally-anonymous surface, `community-public` (no viewer identity, so no block concept applies), instead gates entirely on `publiclyVisible()` (active + public + not-minor) and the content's own visibility (`supabase/functions/community-public/index.ts:88-90`).
- Copy for each transition is in §2/§3 below (ConnectButton/ConnectSheet/ConnectRequestRow).

---

## 2. Connection request journey, tap by tap

1. **Discover** — Community hub → "Find people" tile → `CommunityFindPeopleScreen` (mode gym/area/programme/partners/like_me/might_know).
2. **Profile** — tap a person row → `CommunityProfileScreen`.
3. **Connect** — tap the `ConnectButton` (`state='none'` → title "Connect", `ConnectButton.js:95`).
   - **Context/reason IS available, not auto-generated.** When `onConnect` is wired (profile screen), tapping opens `ConnectSheet` (`ConnectSheet.js`): up to **two** reasons from a closed, non-editable set — `same_gym: 'Same gym'`, `same_programme: 'Same programme'`, `train_like_me: 'You train like me'`, `train_together: 'Want to train together?'` (`connections.js:35-40`) — plus an **optional free-text note, 120 characters**, cleaned server-side (`connections.js:47-50`, `migrate_161:1247-1250`). Both are optional; a bare tap with no `onConnect` sends a reason-less, note-less request (`ConnectButton.js:194-197`), which the server accepts as a complete request.
4. **Send request** — `ConnectSheet` "Send request" button → `community_connect` RPC.
5. **What the recipient sees**: an Activity-inbox row, `ConnectRequestRow.js` — "@handle wants to connect" plus the chosen reasons rendered as "Same gym · Want to train together?" (`reasonsLine`, `ConnectRequestRow.js:39-44`) and the note verbatim (`:66-70`). **This is the actual reason string the SENDER chose, not a server-computed "why relevant" (mutual/shared-signal) explanation** — the mutual-connections/mutual-follows/shared-band scoring only exists in `community_find_people`'s discovery reasons (`migrate_161:1930-1990`), a separate mechanism from what a connect request itself carries. A push also fires: "Community — @handle wants to connect" (`community-notify:144-145`), category `community_follow` (shares the follow budget, `community-notify:102-104,158-161`).
6. **Accept/Decline** — `ConnectButton`'s `respond()` alert (`ConnectButton.js:156-173`): "Accepting means you both follow each other and can message. Declining is not passed on." Decline is silent (no activity row written, `migrate_161:1319-1326`); Accept creates the mutual follow edges.
7. **Connected** — button becomes "Connected" (`secondary`, `people-outline`).
8. **Message** — a `primary` "Message" button renders inline beside "Connected" (`ConnectButton.js:220-230`), navigating to `CommunityConversation`.

**Tap count, cold start to first message sent (happy path, request accepted):** Discover tile (1) → person row (2) → Connect (3) → Send request in sheet (4) → [wait for the other person] → Message (5) → type + send (6). **Six taps**, one of them gated on someone else's action.

**Comparison with the retired Partner-code flow** (`docs/social-discovery-2026-09-06/01-recon-partners.md:7-9,44-49`): Partners was an **invite-code-only** accountability pairing, max 3 concurrent pairs, no search, no discovery, no free text at all — the flow was share an out-of-band code (via the OS share sheet) then the other party typed it into "I have a code". There was no "why" at all (no reasons, no note — a code carries no context), no push-driven request/accept loop (the pairing completed the moment a valid code was entered), and no direct-message channel (Partners exchanged only fixed-line cheers and derived attendance signals, never free text). The new Connect flow is materially richer (in-app discovery, a closed reason set, an optional note, an Activity-inbox request/accept loop, and genuine 1:1 messaging) at the cost of more taps than a code paste.

---

## 3. Messaging

- **One-to-one only.** No groups anywhere in schema or client (`messages.js:5` "One-to-one text, and nothing else. No groups").
- **Conversation list ordering**: `last_message_at DESC` (falls back to `created_at` for a conversation with no messages yet), keyset-paginated (`migrate_161:2417-2429`).
- **Unread counts**: computed server-side per conversation, `count(*) WHERE sender_id <> caller AND created_at > my_last_read_at` (`migrate_161:2434-2437`); the header total (`unseen_messages`) is computed the same way across ALL open, non-blocked conversations in `community_get_me` (`migrate_161:900-912`, and explicitly excludes a blocked sender at `:912`).
- **Badges**: Today (Home) root header carries **one combined dot** via `hasUnseen(me)` = activity OR follow-request OR connect-request OR unread-message count > 0 (`profile.js:151-156`, wired in `CommunityHeaderAction.js:36-37`) — it does **not** distinguish "you have a message" from "someone reacted to your post". Inside the Community Hub there are **two separate glyphs**: Activity (`hasUnseen`, still the conflated one — follow/connect requests + reactions/comments/programme-use) and Messages (`hasUnreadMessages(me)`, message-count only) (`CommunityHubScreen.js:277-303`, `profile.js:161-163`).
- **Push**: kind `message`, category `community_message`, own toggle (`categoryPrefs.js:131-139`). Budget/collapse: **at most one push per conversation per 15 minutes while unread** (`community-notify:125-127,510-546`), body is always "New message from @handle", **never the content** (`community-notify:148-151`). **Quiet hours do not apply**: `src/lib/notifications/quietHours.js` has no reference to any `community_*` category anywhere in the file (grepped in full) and `community-notify/index.ts` has no time-of-day check at all — this is the still-open half of `72-REVIEW-SECURITY-CONNECTIONS.md` finding 4/review-1 finding 6 ("quiet hours are still device-side... unresolved and now also true of `community_message`", `72-REVIEW...md:185-186`), confirmed unchanged at HEAD.
- **Mute**: silences the muted person's message (and connect) pushes only; conversation, list and content are unaffected (`community-notify:110-113,417-431`).
- **Block**: closes the conversation for both, removes it from the list, the unread count and the message page (`72-REVIEW...md` checklist row 2).
- **Report**: a "Report" action is wired on a message long-press in `CommunityConversationScreen.js:438` → `ReportSheet` with `targetKind:'message'` → `reportContent()` → `community_report` RPC. **This path is broken end-to-end.** `migrate_161:339` widens the `community_reports.target_kind` CHECK to add `'message'`, and the client's `REPORT_TARGET_KINDS` (`moderation.js:29`) already includes it — but the `community_report()` function itself is **never re-issued** by migrate_161 or migrate_162 (confirmed by grep: no `CREATE OR REPLACE FUNCTION public.community_report` appears in either file). The live function is still `migrate_160:3449-3509`, whose guard reads `IF _target_kind NOT IN ('profile','post','comment','programme') ... RAISE 'invalid_input'` (`:3462-3465`) — **`'message'` is rejected**. Reporting a message therefore always fails with `invalid_input`, for which `ReportSheet.js`'s `REFUSALS` map (`:37-43`) has no entry, so the user sees the generic "Could not send that report just now." with no indication anything is structurally broken. This is a genuine UGC path with a UI report control that cannot succeed.
- **Delete**: hard delete, both sides — "it goes for both people, because a message you can still see after the sender removed it is not a deletion" (`messages.js:128-130`), `community_delete_message` `migrate_161:2649-2683`.
- **Media**: none. `MessageBubble.js` renders `message.body` as a plain `<Text>` (`:66`) — no attachment types exist in the schema.
- **Link handling**: **none**. The body is rendered as flat, unstyled text (`MessageBubble.js:66`); no URL detection, no `Linking`-wrapped anchor, no preview card. A pasted URL is inert, unstyled text.
- **Refs**: `MESSAGE_REF_KINDS = ['programme', 'post']` only (`messages.js:34`). **A training session/workout is NOT a valid ref** — there is no `'session'`/`'workout'` kind anywhere in the ref system; `'post'` covers a published training story (which may itself be of `kind:'session'` as a STORY, but the message ref is always to the post row, never directly to a raw workout). Both the sender's and the viewer's visibility are re-checked server-side (`_community_can_view_programme`/`_community_can_view_post`, `migrate_161:2570-2578`, `_community_message_json:744-796`).
- **First message / placeholder**: `placeholderFor(ref)` returns "Ask about this programme", "Say something about this session" (for a `post` ref), or "Write a message" (`messages.js:44-49`) — a PROMPT only, the field itself is always empty (no pre-written text ever sent on the user's behalf).
  - **Known bug (73-REVIEW-PRODUCT-DISCOVERY.md finding 9, confirmed STILL OPEN at HEAD)**: the ref only attaches when the conversation is brand new. `CommunityConversationScreen.js:166` sets `refSent.current = rows.length > 0` on every `load()`, so opening an EXISTING conversation (any prior message) via "Message" from a programme/story immediately marks the ref as already-sent; `attach = !refSent.current && ref?.kind && ref?.id` (`:238`) is then always false, and the message sends with no ref, generic placeholder, no visible acknowledgement the tap carried context. Verified unchanged at these exact line numbers.
- **Typing/read receipts**: none. No typing indicator anywhere in the client; "read" exists only as an aggregate unread COUNT per conversation, never a per-message seen state.
- **Retention**: messages persist until either party deletes them or the conversation closes (block/removal — content is NOT deleted on close, only hidden: `community_block:2716-2718` comment "The messages are not deleted here (erasure is community_leave and delete_user_data)"). Full erasure happens on `community_leave()` (two-sided delete of connections/conversations/messages, `migrate_161:2934+` per README:566) and on full account deletion (`delete_user_data()`, confirmed §6).
- **Offline queue**: **none**. Community is explicitly online-first (`profile.js:5` "Community is online-first with a small per-user cache"); `sendMessage` simply surfaces an `'offline'` refusal (`CommunityConversationScreen.js:79,91`, `CONVERSATION_OFFLINE_LINE`) rather than queuing for retry the way `syncQueue.js` does for other domains. There is no realtime subscription either — the list re-reads on focus and via a poll timer (`messages.js:54-56`, `CommunityConversationScreen.js:205-209`, `POLL_MS`).
- **Rate limit**: 20 messages per rolling hour (`migrate_161:2589` `PERFORM public._community_rate_check(v_uid, 'message', 20, 60, interval '1 hour')`).

---

## 4. Notifications — every community kind

Server kinds (`community-notify/index.ts:94-108`) vs. client push categories (`notificationRoute.js:166-184`, `categories.js:60-68`):

| Kind (server) | Push? | Category / toggle | Batching / budget | Quiet hours | Unread state | Tap route |
|---|---|---|---|---|---|---|
| `follow` | Yes | `community_follow` | Replay-guarded via `community_activity.pushed_at` (§8 finding 4, fixed) | No | counted in `unseen_activity` | `CommunityActivity` |
| `follow_request` | Yes | `community_follow` | same | No | `pending_requests` | `CommunityActivity` |
| `follow_accepted` | Yes | `community_follow` | same, plus a fresh recency re-derivation (`community-notify:260-279`) | No | `unseen_activity` | `CommunityActivity` |
| `connect_request` | Yes | `community_follow` (shares budget) | same | No | `pending_connect_requests` | `CommunityActivity` |
| `connect_accepted` | Yes | `community_follow` | same | No | `unseen_activity` | `CommunityActivity` |
| `reaction` | Yes | `community_activity` | same | No | `unseen_activity` | `CommunityActivity` |
| `comment` | Yes | `community_activity` | same | No | `unseen_activity` | `CommunityActivity` |
| `programme_used` | Yes | `community_activity` | same | No | `unseen_activity` | `CommunityActivity` |
| `message` | Yes | `community_message` (own toggle) | 15-minute per-conversation collapse | No | `unseen_messages` | `CommunityConversation` (deep-links to the specific thread, `notificationRoute.js:174-184`) |
| `partner_request` (as a distinct kind) | **Absent** — there is no separate "partner request" notification kind. "Open to training together" (`open_to_partner`) only ever surfaces the person in `community_find_people('partners')` discovery results; asking to train is done via an ordinary Connect request (reason `train_together`), which is the `connect_request` kind above, not a distinct type. | — | — | — | — | — |
| `mention` | **Absent** — no `@mention` concept exists anywhere in Community (comments/posts are plain text, keyword-filtered, no mention parsing). | — | — | — | — | — |
| `reply` | **Absent** — comments are flat (one level), there is no threaded-reply notification distinct from `comment`. | — | — | — | — | — |
| `recommendation` | **Absent** — no "we think you'd like..." push exists; discovery is entirely pull (Find people / hub tiles), never pushed. | — | — | — | — | — |
| `moderation` (e.g. "your content was hidden/restricted") | **Absent** — `community_moderate` (`migrate_160:3599+`) writes an audit-log row and updates content/account state but sends **no notification to the affected user** at all — no push, no in-app activity row. A person only discovers a restriction/suspension by trying to act and being refused, or their content silently disappearing. | — | — | — | — | — |

**Retired-but-mapped kinds** (dead-route safety net, not live pushes): `partner_cheer`/`partner_streak`/`partner_joined` resolve to `Community` with `source:'notification'` so an already-scheduled legacy push does not dead-end (`notificationRoute.js:118-127`).

All Community server-sendable categories default **on** (`categoryPrefs.js:121,126,135`, `defaultEnabled: true`) and are toggled per-category in Settings; the community-notify function reads the projection row and fails **closed to in-app-only** on any read error at every step (block check, mute check, category-toggle check, ED-flag check — `community-notify:398-466`), which is a materially safer posture than most of the app's push paths.

---

## 5. Deep links and external sharing

Three routes, `community`/`u`/`p`/`s` in the brief map to: `u` (profile), `p` (programme), `s` (story/post). There is **no bare `community` deep-link route** distinct from these three plus the ordinary in-app `Community` screen name used by `notificationRoute.js` — Community itself is reached by notification taps, not by an external `community` link form.

- **Forms**: web `https://volyume.app/{u,p,s}/?{h,id}=...` and app `volyume://{u,p,s}/?...` (`links.js:20-57`). Parsing is exact-host (`volyume.app`, never `startsWith`) to reject `volyume.app.attacker.example` (`links.js:94-97`, mirrors `authDeepLink.js:15-20`'s `isVolyumeLink`).
- **What a non-user sees** (`public/u/index.html`, `public/p/index.html`, `public/s/index.html`, fetching `community-public`):
  - Profile page: handle, display name, avatar (initials only — no photo upload anywhere in Community), bio, style/goal/setting chips, "Trains at {gym} · {area}" line, follower count, up to 20 public programmes and 10 public posts as linked list rows, an "Open in Volyume" deep link and a Play Store CTA. **No preview image beyond the CSS-generated initials avatar** — there is no `og:image`/social-card meta tag at all in any of the three pages (grepped, none present), so a link shared into iMessage/WhatsApp/Slack unfurls with no rich image, only the `<title>`/`<meta description>` text.
  - Programme page (`public/p/index.html`, not fully re-read but same fetch pattern) and story page (`public/s/index.html`) follow the identical shape from `community-public`'s `programme`/`post` branches (`community-public/index.ts:117-183`): structure-only fields, `snapshot` for a programme (never load/weight — `_community_forbidden_keys` blocks that at publish time, `community-public/index.ts:145-148`).
  - **404 (not a partial record) on**: minor creator, inactive/restricted/suspended creator, non-public profile, hidden content (auto-hide or moderator action), or a programme/post whose own visibility is not `public`/`link` (`community-public/index.ts:14-21,88-90`).
- **App Store / Play fallback**: Play Store link is live and correct (`https://play.google.com/store/apps/details?id=app.volyume`). The **iOS App Store link is a literal unshipped placeholder** — `https://apps.apple.com/app/idREPLACE_WITH_APP_STORE_ID` in all three pages (`public/u/index.html:207`, `public/p/index.html:245`, `public/s/index.html:207`), with an explicit inline comment "iOS LAUNCH: replace REPLACE_WITH_APP_STORE_ID once Volyume is [launched]" (`public/p/index.html:241`) — consistent with the app being TestFlight-only per CLAUDE.md, not a defect introduced by this campaign, but live in production HTML today regardless.
- **Attribution/invite flow**: **none**. No referral code, no "who invited you" tracking, no UTM-style parameter anywhere in the link builders (`links.js`) or the public pages. Sharing is purely "here is a link to a thing", not an invite mechanism.
- **What CAN be shared**: a profile, a published public programme, a public training story/post.
- **What CANNOT be shared**: an individual comment, a gym/venue page (no `/g/` public route exists — `gyms_get`/`gym_venues` have no `community-public` branch), a message or conversation (by design, private), a `followers`-only or `link`-visibility programme has no public web page (the `community-public` function 404s it unless `visibility IN ('public','link')` — a `link`-visibility programme IS servable via the direct id link even though it is unlisted, which is the intended "unlisted but shareable" behaviour, `community-public/index.ts:128`), a private/`followers`-only profile.

---

## 6. Privacy UX

**CommunityPrivacyScreen.js** controls, exact copy:
- **"Who can follow you"** — chips "Anyone" / "People I approve", hint: *"Anyone signed in can follow you and see what you post."* / *"You approve every follower before they see what you post."* (`:189-210`). This is `community_profiles.visibility` (`public`/`followers`) — it is the ONLY discoverability/visibility control; there is no separate "discoverable in search" toggle (search/suggestions eligibility is derived entirely from `visibility='public'`, confirmed at every discovery RPC's WHERE clause).
- **"Who can send you connection requests"** — chips Anyone / People who follow me / Nobody (`CONNECT_FROM_VALUES`, `connections.js:53-57`), hint per value: *"Anyone can send you a request to connect."* / *"Only people who already follow you can send you a request."* / *"Nobody can send you a request to connect."* (`CommunityPrivacyScreen.js:226-232`). Enforced server-side exactly as stated — `connect_from='followers'` requires an ACCEPTED follow edge (`migrate_161:1225-1230`), so this cannot be bypassed by an unaccepted follow.
- **"Show which programmes I use"** — switch, sub: *"Lets people find you on the 'People on this programme' list for programmes you use or publish."* (`:236-250`). Server-enforced in `community_programme_people` (required, `72-REVIEW...md` checklist row 6) and, since the security review fix, in `community_find_people('programme')` too (`migrate_161:1912`).
- **"Training profile"** → navigates to a separate screen (§ below).
- **Blocked / Muted lists**, each row an unblock/unmute action, empty-state copy *"You have not blocked/muted anyone."*
- **Leave Community** — confirm copy: *"Your profile, posts, published programmes and follows are deleted. Your training, plans and food diary are not touched."* (`:150`).

**No dedicated "show my gym" / "show my area" toggle exists.** `PrivacyReceipt.js:39` states plainly, as a fixed, always-shown line: *"Styles, goal, gym and area you type"* is something "Others can see" — gym and area visibility is bundled entirely into the one "Who can follow you" (`visibility`) control, with no finer-grained control. This matches the copy's own honesty (nothing claims a separate gym/area toggle exists) but is a genuine granularity gap against the task's expectation of a distinct control.

**CommunityJoinScreen.js** (first-time setup): same "Who can follow you" chips, correctly **hidden entirely for a minor** with the note *"Under 18: your profile is followers-only and does not appear in search."* (`:322-344`) — a control that cannot change anything is not offered, rather than being shown disabled. Training profile bandRows are rendered with the **Age band row correctly filtered out for a minor**: `.filter((row) => !(isMinor && row.key === 'age_band'))` (`:366`).

**Server-enforced minor visibility**: `community_upsert_profile` forces `v_visibility := 'followers'` whenever `_community_minor(v_uid)` is true, **regardless of what the client sends** (`migrate_162:1954-1955`) — this cannot be bypassed by a modified client.

**Gaps identified:**
1. **Age band toggle is inert** (73-REVIEW-PRODUCT-DISCOVERY.md finding 6, confirmed STILL OPEN). A person can switch "Age band" on at Join or in Training profile, with the screen's own copy promising *"Worked out from your date of birth when this is on"* — it is stored in `tp_age_band` but read **nowhere**: not in `previewLine()` (`trainingProfile.js:355-368`, only days/times/sessions/experience), not in `TrainingProfileLine.js:31-39` (same four fields), not as a `ProfileCard` chip (grepped, no `age`/`tp_age` hit), and not in `community_find_people`'s scoring or reason list (grepped the full scan loop, `migrate_161:1930-2040`, no `tp_age` term). Opting in changes nothing anyone ever sees.
2. **Age band row not filtered for a minor post-join** (73-REVIEW finding 7, confirmed STILL OPEN). `CommunityTrainingProfileScreen.js:247` renders `bandRows(bands, me).map(...)` with **no `isMinor` filter at all**, unlike the Join screen's correct `.filter((row) => !(isMinor && row.key === 'age_band'))`. A minor's own Training profile screen shows a live, operable "Age band" switch and value line; the server nulls the actual result (`migrate_161:1650-1651` `v_share AND NOT is_minor`), but the UI itself is misleading for exactly the population SD-32 protects.
3. **`GymTypeahead`'s stale-area bug (73-REVIEW finding 8) is superseded, not literally fixed.** The component named in the finding no longer exists (`grep GymTypeahead src/` returns only a stale test comment, `CommunityEditProfile.test.js:106`). It has been replaced by `GymPicker.js` (gym-database campaign, migrate_162), which searches the full gym directory via `gyms_search` free text and is not area-scoped at all — the specific mechanism the finding described (typeahead resolving the caller's SAVED area rather than the just-typed one) is gone by architecture change, and `community_gym_suggest` (the old, area-scoped path) is no longer called from any screen (`gymSuggest` remains exported from `findPeople.js:258` but has no caller in `src/screens`).
4. **Report-a-message is non-functional** — see §3 and §7.

**Minors — every restriction found:**
- Server: forced `visibility='followers'` on save (above); `_community_minor`/`_community_caller_is_minor`/`_community_other_is_minor` gate `community_connect` (both directions, `migrate_161:1219-1223`), `community_respond_connect` accept path (`:1338-1341`), `community_send_message` (both directions, `:2557-2559`); excluded from every discovery surface's `is_minor=false` predicate (find_people, gym summary/suggest, search/suggested people, search programmes — grepped, consistently present); age band is never derived for a minor (`v_share AND NOT is_minor`, `migrate_161:1650`).
- Client: Join screen hides the visibility chips and the age-band row for a minor (confirmed above); `shouldOfferConnect` refuses a Connect control for a minor viewer OR a minor target card (`ConnectButton.js:85-92`); `CommunityTrainingProfileScreen.js` hides the "Open to training together" partner section entirely for a minor, replaced with *"Training partner matching opens at 18."* (`:276-282`, fix for 73-REVIEW finding 2).
- **Miss found**: the age-band row on the post-join Training profile screen (gap 2 above) is the one surface that does NOT filter for a minor, inconsistent with the Join screen's own correct handling of identical data.

**Deletion — what happens per artefact:**
- **Full account deletion** (`delete_user_data()`, latest body `migrate_162:2421-2600`): every Community table is hit — `community_rate_events`, `community_activity` (both `user_id` and `actor_id` sides), `community_blocks`, `community_mutes`, `community_follows`, `community_messages` (sender side), `community_conversations` (either party), `community_connections` (either party), `community_reactions`, `community_comments`, `community_programme_uses`, `community_posts`, `community_programmes`, `community_profiles` — all hard-deleted. `community_reports` where the deleted user was the **reporter** are anonymised (`reporter_id=NULL`); reports where they were the **target** (`target_owner_id`) are **deleted outright**, which erases the moderation record of a bad actor's past reports the moment they delete their account (see §7 audit-trail note). Moderator id on `community_moderation_log` rows is anonymised, not deleted (audit trail survives). Gym submissions/reports/history keep their content and anonymise only the identity link (`submitter_id`/`reporter_id`/`reviewed_by`→NULL, `actor`→`'deleted'`), a deliberate "the directory fact survives, the person does not" posture stated in the file's own comment (`migrate_162:2571-2573`).
- **`community_leave()`** (Community-only, account stays): per its header comment (`migrate_161` re-issue, README:566) deletes the profile, posts, published programmes and follows, and — two-sided — every connection, conversation and message the leaver was in, from BOTH sides. Training/plans/food diary are explicitly untouched (screen copy confirms, `CommunityPrivacyScreen.js:150`).
- **Gym confirmations**: a gym venue's confirmation count is not reversed by a confirmer's account deletion (the directory fact survives per the comment above) — `gym_venue_history` keeps the event with `actor:'deleted'`.

---

## 7. Moderation

- **Report reasons** (`REPORT_REASONS`, `validation.js:130-137`): `spam`, `harassment`, `impersonation`, `harmful_body_or_eating_content`, `inappropriate`, `other` — identical set offered for every content kind via one shared `ReportSheet.js`. `harmful_body_or_eating_content` is flagged `priority=true` server-side at insert (`migrate_160:3502-3503`), so it is never queued behind spam — this is the ED-safety interplay: the only Community-specific ED handling is (a) this priority-report reason and (b) the shared keyword filter below; there is no proactive content scan of stories/messages for body/food talk beyond the fixed slur/pro-ED-vocabulary list.
- **Report target kinds, declared vs. actually working**: `REPORT_TARGET_KINDS = ['profile','post','comment','programme','message']` client-side (`moderation.js:29`) and the DB CHECK on `community_reports.target_kind` allows the same five (`migrate_161:339`) — but the `community_report()` RPC (`migrate_160:3462-3465`, never re-issued) only accepts `('profile','post','comment','programme')`. **Reporting a message always fails** (`invalid_input`), confirmed by direct read of both the live function body and the two migrations that could have — but did not — update it. This is a genuine "UGC path whose report control is wired in the UI but non-functional against the server."
- **Gym reports are a wholly separate system**: `gyms_report(_venue_id, _kind, _detail)` (`migrate_162:1308+`), its own closed reason set `REPORT_KINDS` (`src/lib/gyms/index.js:36-43`: `closed`, `wrong_name`, `wrong_location`, `duplicate_of`, `not_a_gym`, `other`) — not `REPORT_REASONS`, and not routed through `community_report`/`moderation.js` at all. Wired from `CommunityDimensionScreen.js:44,94`.
- **Auto-hide**: 3 distinct open reports hide content pending review (`AUTO_HIDE_REPORTS=3`, `limits.js:69`, `_community_auto_hide` `migrate_160:1155-1195`), reversible by a moderator (`unhide_content`).
- **Rate limits**: reports 20/day (`community_report:3479`); connect 10/day new-account / 30 established (`community_connect:1235`, thresholds pulled from the shared `_community_rate_check` signature); message 20/hour (`community_send_message:2589`); follow 30/day new / 100 established, 2000 following cap (`community_follow:1766-1770`); the security-review pass additionally rate-railed `respond_connect`, `update_training_profile`, `set_partner`, `set_connect_from`, `set_show_programmes`, `list_connections`, `gym_summary`, `gym_suggest`, `find_people` at 120/hour each (§8, finding 10, confirmed fixed in-file).
- **Moderator actions** (`MODERATION_ACTIONS`, `moderation.js:20-23`): `dismiss`, `hide_content`, `unhide_content`, `delete_content`, `restrict_account`, `unrestrict_account`, `suspend_account`, `unsuspend_account` — every one writes a `community_moderation_log` row (who, when, action, target, note; `docs/community-safety/MODERATION-RUNBOOK.md:188-192`), reachable only from `CommunityModerationScreen.js` (gated to moderators via `community_get_me().is_moderator`, `CommunityPrivacyScreen.js:317-324`).
- **Impersonation handling**: `RESERVED_HANDLES` (`validation.js:27-42`) blocks a wide set of app/staff/route-word handles at signup (`volyume`, `admin`, `support`, `moderator`, `coach`, `nhs`, every route stem, etc.); beyond the handle gate, impersonation is a manual report reason (`impersonation`) with no automated detection.
- **Suspension/restriction escalation**: policy per `MODERATION-RUNBOOK.md:160-168` — Restrict = warning-level first offence (account stays visible); Suspend = severe-on-its-own or repeat-after-restrict. Neither is user-reversible.
- **Appeal path**: **manual only, by email** — `MODERATION-RUNBOOK.md:172-173` ("an appeal by email... time served"); there is no in-app appeal flow, form, or status anywhere in the client.
- **Audit trail**: `community_moderation_log`, reachable only inside the moderation queue screen itself; explicitly "no separate export or admin dashboard for it today" (`MODERATION-RUNBOOK.md:188-189`). Weakness: a report row where the reported person (not the reporter) later deletes their account is **deleted outright** (`delete_user_data():... DELETE FROM community_reports WHERE target_owner_id = uid`), which can erase evidence of a pattern of reports against a since-deleted bad actor, while the moderation LOG (actions taken) survives with the moderator id merely anonymised.
- **Image/media moderation**: N/A — Community carries no image/media upload anywhere (avatars are preset icons, `avatar_preset`; posts are structured JSON tiles, not photos).
- **Moderator queue for the gym directory**: **no in-app screen exists.** `gyms_review_submission`/`gyms_review_report` (`migrate_162:1367-1518`) are declared, granted, SECURITY DEFINER RPCs with no client caller anywhere (`grep gyms_review_submission|gyms_review_report src/` — zero hits outside the migration itself). Pending gym-venue confirmations and gym reports have a backend mechanism and no UI to act on it.
- **UGC paths with confirmed report control**: profile, post/story, comment, programme (all functional). **UGC paths with a report control that exists in the UI but cannot succeed**: message (broken RPC, above). **UGC surface with no report control offered anywhere in the client**: none found for the five `REPORT_TARGET_KINDS`; gym venues have their OWN separate, working report control (`gyms_report`).

---

## 8. Status of `73-REVIEW-PRODUCT-DISCOVERY.md` findings 6–10 at HEAD

The review itself marks findings 6–10 **"Not reviewed this pass (out of scope: only findings 1-5 were assigned)"** (`73-REVIEW...md:24-27`). Independently verified against the current tree:

| # | Sev | Claim | Status at HEAD | Evidence |
|---|---|---|---|---|
| 6 | P2 | Age band toggle is inert | **OPEN** | `trainingProfile.js:355-368` (`previewLine`, no age term), `TrainingProfileLine.js:31-39` (same four fields), `ProfileCard.js` (grepped, no age chip), `community_find_people` scoring loop `migrate_161:1930-2040` (no `tp_age` term) |
| 7 | P2 | Age band row not filtered for a minor on Training profile screen | **OPEN** | `CommunityTrainingProfileScreen.js:247` `bandRows(bands, me).map(...)` — no `isMinor` guard, vs. `CommunityJoinScreen.js:366` which correctly filters |
| 8 | P2 | Gym typeahead reads saved area, not just-typed area | **SUPERSEDED (fixed by replacement, not by patch)** | `GymTypeahead.js` no longer exists (only a stale test-comment reference, `CommunityEditProfile.test.js:106`); replaced by `GymPicker.js` (full-text `gyms_search`, not area-scoped) wired at `CommunityEditProfileScreen.js:41,298,356` |
| 9 | P2 | Programme/story ref only attaches to the first message of a brand-new conversation | **OPEN** | `CommunityConversationScreen.js:166` `refSent.current = rows.length > 0` on every `load()`; `:238` `attach = !refSent.current && ...` therefore false for any existing thread |
| 10 | P3 | Messages header glyph sub-44dp touch target | **PARTIALLY MITIGATED, not literally "sub-44dp"** | `CommunityHubScreen.js:299-304` carries `hitSlop={spacing.sm}` (=8, `theme.js:385`) on a 34×34dp `headerBtn` (`:614-620`) → effective ~50×50dp target, which clears the 44dp bar, but is smaller than the app's own established pattern of `hitSlop={spacing.md}` (=12, →58×58dp) used correctly by `CommunityHeaderAction.js:44`. The ORIGINAL defect this finding continues (`51-REVIEW-PRODUCT-UX.md:40`, "no hitSlop") has been given SOME hitSlop since, but not brought to parity with the app's own convention, and finding 10's own text ("no hitSlop beyond spacing.sm") already reflects this partial state, not "none at all". |

Findings 1–5 (the ones the review WAS scoped to) were independently spot-checked and are genuinely landed: creator profile in `CommunityProgrammeScreen.js` now offers Connect/Message (finding 1); the minor partner-section gate exists (`CommunityTrainingProfileScreen.js:276-282`, finding 2); the standalone duplicate "Message"/"Remove connection" controls are gone from `CommunityProfileScreen.js`/`ProfileMenuSheet.js` (finding 5, confirmed by `ConnectButton.js` being the sole Message/Remove-connection entry point on a connected card).

The separate `72-REVIEW-SECURITY-CONNECTIONS.md` findings 1–10 (security, not product) were also independently re-verified line-by-line against the current migration text (not merely trusted from the review's own "Fixed (commit pending)" annotations) and are **all confirmed present in the file at HEAD**: finding 1 (fresh minor re-derivation, `migrate_161:695-717`, self-heal write in `community_get_me:917-921`, gate in `community_respond_connect:1338-1341`), finding 2 (programme-label gate, `migrate_161:1876-1882`), finding 3 (block preserves a `declined` row, `migrate_161:2705-2711`), finding 4 (`pushed_at` replay guard, `community-notify:468-508`), finding 5 (`same_gym_only` honoured + honest label, `migrate_161:1885-1892,1911-1917`), finding 6 (`show_programmes` folded into the programme-door match, `migrate_161:1912`), finding 7 (gym_summary/suggest require a profile + rate rail + own-area check, `migrate_161:2196-2199,2337-2347`, carried into `migrate_162:1591-1593`), finding 8 (`tp_programme_key` validated against `_community_can_view_programme`, `migrate_161:1626-1632`), finding 9 (`community_remove_follower` re-issued with the connection branch, `migrate_161:2772-2795`), finding 10 (rate rails on all nine named RPCs, spot-checked on `find_people:1855-1858`, `update_training_profile:1670-1671`, `respond_connect:1315-1316`). Note however that the migration files themselves are still in the **WRITTEN, NOT APPLIED** state (§ top-line), so these fixes exist in code but have not reached the production database.

---

## 9. Classification table

| Item | Classification | Evidence |
|---|---|---|
| Follow (one-way) | Fully built, code-complete | `migrate_160:1741-1857` |
| Connect / mutual connection | Fully built, code-complete | `migrate_161:1185-1432` |
| Messaging (1:1, ref-carrying) | Fully built, code-complete | `migrate_161:2397-2683` |
| Block / mute / relationships list | Fully built, code-complete | `migrate_160/161` block/mute functions, `_community_is_blocked` coverage above |
| Block predicate on every read RPC | Fully built | Full grep enumeration, §1 |
| Report: profile/post/comment/programme | Fully built, code-complete | `community_report` accepts all four |
| **Report: message** | **Backend only / broken** — UI wired, RPC rejects the kind | `moderation.js:29` vs `migrate_160:3462-3465` |
| Gym venue report/review | **Partial** — report works, review queue Unreachable (no client caller) | `gyms_report` wired; `gyms_review_submission`/`gyms_review_report` uncalled |
| Notifications: follow/connect/message family | Fully built, fail-closed, replay-guarded | `community-notify/index.ts` full read |
| Notification: quiet hours for Community pushes | **Absent** | no reference in `quietHours.js` or `community-notify` |
| Notification: mention/reply/recommendation/moderation-action | **Absent** | no kind exists |
| Deep links u/p/s (app form) | Fully built | `links.js`, `notificationRoute.js:174-184` |
| Deep links: public web pages | Fully built, functionally complete | `public/{u,p,s}/index.html` + `community-public` |
| Deep links: iOS App Store fallback | **UI only / placeholder** | literal `REPLACE_WITH_APP_STORE_ID` in all three pages |
| Deep links: social-card preview image | **Absent** | no `og:image` in any of the three pages |
| Privacy: connect_from / visibility / show_programmes | Fully built, server-enforced | `CommunityPrivacyScreen.js`, matching RPC gates |
| Privacy: show gym / show area as a DISTINCT control | **Absent** — folded into `visibility` only | `PrivacyReceipt.js:39` |
| Privacy: age band sharing | **Privacy-incomplete** — collected, stored, minor-gated server-side, but inert on every surface, and not minor-filtered on one screen | §6 gaps 1–2 |
| Minor restrictions (connect/message/visibility) | Fully built, server-enforced (belt-and-braces both sides) | §6 |
| Account deletion cascade (Community) | Fully built, comprehensive | `delete_user_data():` full Community block, `migrate_162:2540-2560` |
| Moderation queue + audit log (Community content) | Fully built, in-app | `CommunityModerationScreen.js`, `community_moderation_log` |
| Moderation appeal path | **UI absent, process exists out-of-band (email)** | `MODERATION-RUNBOOK.md:172-173` |
| **Entire Community backend at production** | **Infrastructure only / Unreachable in production** | migrations 160/161/162 all "WRITTEN, NOT APPLIED", `supabase/README.md:565-567` |

---

## Ambiguities / could not determine

1. **App Store ID placeholder**: could not determine whether this is a deliberately-parked known item (TestFlight-only status makes it low priority) versus an oversight specific to this campaign; treated it as pre-existing given the explicit "iOS LAUNCH" comment, but did not check git blame/history to date it precisely (out of scope for a read-only content trace).
2. **`community_report`'s missing `'message'` branch**: could not determine whether this is an intentional scope cut (message reporting deliberately deferred pending a design decision on who `target_owner_id` should resolve to — the sender, unambiguously, but the migration author may have had a reason not yet documented) or a genuine oversight in migrate_161/162. The migration's own header for 161 (`supabase/README.md:566`) lists which functions it re-issues and `community_report` is not among them, with no comment anywhere explaining the omission — read as an oversight, but not confirmed against any decision record.
3. **`public/p/index.html` and `public/s/index.html`**: read for their App Store/Play Store link forms and structural pattern only (not re-read line-by-line in full, given `public/u/index.html`'s near-identical structure was read in full and the other two were confirmed to share its `fetch(community-public)` pattern via targeted grep); if their internal rendering of a programme's `snapshot` or a story's `payload` differs meaningfully from `u`'s pattern, that would not have been caught.
4. **Whether `gymSuggest` (`findPeople.js:258`) is dead code or has a caller outside `src/screens`** (e.g. a test-only or future surface): grep found no screen caller; did not exhaustively check every component file for an indirect re-export chain beyond `index.js`'s barrel export.
5. **Exact wording shown to a user when `community_report` returns `invalid_input` for a message report** is confirmed to fall through to `ReportSheet.js`'s generic fallback ("Could not send that report just now.") since no `invalid_input` key exists in its `REFUSALS` map — did not trace whether a Sentry/errorLog entry is also raised for this specific failure mode, which would at least make it visible to the team even though invisible to the user.
