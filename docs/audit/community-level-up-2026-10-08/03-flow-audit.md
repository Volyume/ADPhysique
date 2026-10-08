# 03: Community user-flow audit (first-time person on a phone)

Branch HEAD 2026-10-08. Read-only. Authority: founder order 2026-10-08, "ensure our app works perfectly for end users, it's easily understandable, intuitive, flows perfectly, there's no moments where the user doesn't know what they are doing", plus the founder focus given the same day: "At the moment its seeming very unstructured and groups, age groups feeds are all lumped together, no filtering if any sort either."

Inputs read: `01-current-picture.md`, `02-competitors.md`, then the screens and components named below. OBSERVED = read in the file cited. INFERRED = a reading of what the code implies, no device run. No screen was rendered; nothing here is a visual claim. Paths: `S/` = `src/screens/`, `C/` = `src/components/community/`, `L/` = `src/lib/community/`.

---

## 0. The founder's complaint, in code: what one scroll of the Hub stacks

OBSERVED, `S/CommunityHubScreen.js`. A joined person scrolls ONE `FlashList` (`:853-870`) whose header is built in this fixed order:

| # | Block | Object type | Line |
|---|---|---|---|
| 0 | Title bar "Community" + up to five round controls: own avatar, search, bell (Activity), chat (Messages), shield (Privacy) | navigation | `:482-558`, `:853` |
| 1 | Suspension/restriction notice (only if moderated) | account status | `:563` |
| 2 | "Rules have changed" banner (only if behind) | account status | `:585` |
| 3 | "Partner invites have moved" card (legacy, dismissible) | legacy | `:600` |
| 4 | You row (avatar, sessions this week, DayDots), hidden when consistency is gated | a person (self) | `:679` |
| 5 | Eyebrow PEOPLE + "Find people". Rows: gym, each discipline (up to 3), age group, area (style dropped, fixed order `COHORT_KIND_ORDER` gym, discipline, age_band, area). Or "You are the first here..." + Invite | cohorts (places/categories of people) | `:695-735`, order `:112`, `:428-434` |
| 6 | Eyebrow GROUPS + "New group". Rows: my groups only. Or the purpose line | groups | `:739-760` |
| 7 | Eyebrow HOST + "Not now": the founder's profile with Follow | a person (editorial) | `:762-776` |
| 8 | Offline caption | status | `:780` |
| 9 | Eyebrow ACTIVITY | section label | `:790` |
| 10 | List items: `ActivityItemRow` posts from people you FOLLOW, newest first, page-size loaded | posts | `:859` |
| 11 | Empty feed: one line + "Say hello" | prompt | `:818-845` |

What this means for a person (OBSERVED unless marked):
- Six different object types (self, categories of people, groups, an editorial person, status notices, posts) sit in one vertical list under four tiny uppercase labels. A gym, a discipline and an age group all render as the same `CohortRow`, so "age groups" are literally rows in the same block as "gym" and "area". Groups are a second flat block. The feed is below all of them, so on a phone the first screen is almost entirely people/groups scaffolding and the first post is usually below the fold once there are two cohorts and a group (INFERRED from block count, not measured).
- There is NO filter, sort or scope control anywhere on the Hub. The feed source is hard-wired: `load()` calls `loadHub(joined ? 'following' : 'discover')` and the code comment says "No Chip segment any more ... the feed is always Following once joined" (`:261-267`). The person cannot narrow to My gym, My groups or Everyone, cannot sort (newest first only), and cannot mute a kind (sessions vs PRs vs notes). Group posts, gym posts and discover posts are not reachable as a feed from the Hub at all; each is reachable only on its own cohort or group page.
- The PEOPLE and GROUPS blocks have no sort or filter either (fixed order, no "see all" for cohorts beyond what `community_hub_summary` returns).
- Before joining, the same scroll becomes: hero card + privacy receipt (`:640-674`), then eyebrow RECENT with discover posts (`:790`); the feed there is Discover and also unfiltered.
- Cohort pages (`S/CommunityDimensionScreen.js`) are reached by tapping a cohort row, not from a tab or segment; so the structure answer to "where do gym / age group / discipline live" today is "as rows inside the feed screen".

---

## J1. Discover Community from Today for the first time

| Step | What the screen shows | What the person must understand | Tap | Gap or confusion |
|---|---|---|---|---|
| 1 | Today header: pill "Community" with an amber people glyph, no dot (non-member). `HomeScreen.js:2588`, `C/CommunityHeaderAction.js:36-70` | That this is a social area, not a settings or coach thing | pill | The word "Community" does not say what is in it. Fine as a label, but it is the ONLY entry for a person with zero sessions (intro card needs `totalSessions > 0`, `HomeScreen.js:3110`). |
| 2 | After first finished session, if not dismissed and no ranked banner holds the slot: card "See who is training" / "Connect with people at your gym and your friends, see each other's training weeks, and give respect." Buttons "Have a look", "Not now". `HomeCommunityIntroCard.js:35-37` | What "give respect" means; that "friends" exist yet | Have a look | "Respect" is a coined verb with no definition; "friends" is not a Community concept (follow/connect). The card sits low on Today under hero, evidence, last session (`HomeScreen.js:3105`), so it can be missed (INFERRED). Either button retires it; second dismissal is final (`introReoffer.js`). |
| 3 | Same moment on the workout summary: strip "Sessions like this one are what Community is for" + "Share this session" (non-members) `WorkoutSummaryScreen.js:1431-1441` | That tapping starts joining, not posting | Share this session | Button says "Share this session" but opens Join first (compose redirects, `CommunityComposeScreen.js:128-131`), a form of ~10 fields. The label promises a one-tap share and delivers a registration. |
| 4 | Hub, not joined: hero "Your gym, your people" / "See who is training around you, keep up with friends, give respect." Buttons "Create my profile", "Browse first", then the Privacy receipt `CommunityHubScreen.js:640-674` | Decide whether to join; what is shared | Create my profile / Browse first | "Browse first" sets local state only; the screen then shows "Not joined yet" + "Create my profile" whose label (a11y: "Show how to create...") just re-shows the hero (`:620-636`). A loop, not a step forward. RECENT shows other people's sessions with no explanation of who they are or why they see them. |
| 5 | Members only: Today row "{n} people you follow trained today" or "Nobody you follow has trained yet today" + "Invite" `HomeCommunityTodayRow.js`, `homeFriendsRow.js:friendsTrainedTodayLine` | What it counts (people YOU FOLLOW) | row / Invite | For a new joiner who follows nobody, the row says "Nobody you follow has trained yet today" every day, with the action "Invite" (invite someone to the app), not "Find people". The line reads as a status but the real cause is "you follow nobody". |

## J2. Join (onboarding step 5 path and in-app Join path)

Onboarding path (`S/ProOnboardingScreen.js:2676-2860`):

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Step title "Where do you train?"; sub: "Optional: pick your gym and Volyume connects you with the people who train there. Only training facts are ever shared..." (`:2701-2705`). Gym picker, "I don't train at a gym" | That this step is also the Community sign-up | search / pick | The title is about the gym; the Community join is a second group below ("Your Community profile"). A person scanning the title will not know they are creating a public profile. |
| 2 | Username (blank = Volyume picks), Name (`:2790-2820`) | A username is public and permanent-ish (30 day change limit, `limits.js:57`) | type | The 30-day limit is not stated here. "Leave it blank and Volyume picks one for you" is good. |
| 3 | Privacy receipt; line: "Every session you finish is shared with everyone in Community: exercises, sets, the total lifted and any PRs. Turn it off any time from your Training profile." Four rules; "Community rules" link (`:2821-2845`) | That joining means every future session auto-posts publicly | Join Community / Skip for now | The sentence is plain, which is good, but there is no switch or audience choice here (Join screen has both), the receipt above it says "Sessions you choose to share" (`C/PrivacyReceipt.js` SHOWN list), which contradicts "every session you finish is shared". "Training profile" has no path given (it is Hub > shield > Training profile). No avatar choice. |
| 4 | Join fires at once, in the background, on tapping the button (`:1344-1373`) | Nothing visible | continue | The person gets no confirmation that a profile now exists; the next step is the next wizard question. They find out only on the first summary or Hub. |

In-app Join (`S/CommunityJoinScreen.js`): one scroll, in order: Privacy receipt, Username (live "Available/Taken"), Name, Avatar (6 presets), gym finder (shown open, with "Not now"), Other gyms, "What do you train for?" (disciplines, optional), "Who can follow you" (Anyone / People I approve), "Your training profile" (preview card "What other people would see" and 6 switches including "Share what I did" ON with audience chips Followers / My groups / Everyone, default Everyone), then the emphatic "Create profile" button (`:678`), and ONLY BELOW the button the "Four rules" card and "Community rules and contact" (`:686-700`).
- Gaps: (a) Rules sit below the commit button, so the person agrees to rules (creating the profile records acceptance, `:317-330`) they were never shown above it. (b) "Create profile" is disabled with no stated reason when Name is empty (`:302-303`); the username line explains itself, Name does not. (c) The long scroll mixes required (username, name) with optional (gym, disciplines) and consequential (sharing) with equal weight; the highest-consequence switch, "Share what I did", is deep in the form. (d) Copy conflict: the row's help text says "Off by default." (`S/CommunityTrainingProfileScreen.js:100`) but the switch is ON by default since migration 184 (`L/trainingProfile.js` `share_sessions: true`). The same string is rendered on Join and Training profile for that row (`row.value || row.empty`). (e) Minors: no Everyone chip, line "Under 18: your profile is followers-only and does not appear in search." (`:588`) is good; but onboarding gives a minor no Community step at all (`ProOnboardingScreen.js` step skipped), and the Hub hero still invites them to "Create my profile" (INFERRED: a minor lands on Join from the Hub). (f) Join "next" returns via `replace`/`goBack` and toast "Your profile is live" (`:362`), good.

## J3. The empty first minute after joining

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Land on Hub (back from Join) or Today with the Today row | That something happened | none | After onboarding join the person may never see a "you're in" moment (J2 step 4). |
| 2 | Hub scroll as in section 0. With nobody followed: You row; PEOPLE shows cohort rows if others share the gym/discipline, else "You are the first here from {gym}." + "Invite a gym mate" (`:719-735`); GROUPS purpose line "Make a group with friends to see each other's training weeks." (no button except the eyebrow's "New group"); HOST row "Follow" (founder) with caption "Built Volyume"; ACTIVITY empty: "Follow people to see their training, or say hello." + "Say hello" (`:818-845`) | What to do first | Follow host / cohort row / Find people / Say hello | (a) Four calls to action of equal weight, none marked as the first step. (b) "Say hello" opens a PUBLIC note composer (default audience Everyone, `CommunityComposeScreen.js:139`) from an empty feed; a brand-new person is asked to post publicly before they know anyone. (c) The first sentence says follow people, but the Find people rows offer "Connect" not "Follow" (J4). (d) HOST row depends on one hard-coded account and disappears for anyone following them (`earlyDays.js:117-134`); with a single active host the first-follow story is "follow the founder". (e) Early-days prompts: "You are one of the first here" is honest, but the next step is only Invite (share link). (f) Cohort rows show "N trained today" lines, an unexplained metric until a cohort page is opened.
| 3 | Open Activity (bell) | what is there | bell | Empty: "Quiet for now / Follows, reactions and comments on your posts appear here." with action "Find people" that opens SEARCH, not Find people (`S/CommunityActivityScreen.js:262-267`). Label and destination differ. |

No feed filter, sort or scope: see section 0.

## J4. Find people (six doors, search, follow vs connect, requests)

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Entry points: Hub PEOPLE "Find people", Hub legacy card, Conversations empty state, Dimension empty state. Hub header also has Search (a separate entry) | There are two finding tools | Find people / search icon | Two similar doors to the same job: `CommunityFindPeople` (browse doors, with its own search bar) and `CommunitySearch` (people + groups). Search is the only way to find an open group (`CommunitySearchScreen.js:128-130` "Find an open group to join"); no group browse exists. |
| 2 | Find people: search bar plus up to six rows: At my gym, Near me, Train like me, Open to training together, People you might know, Same discipline; each with a subtitle, count or requirement (`L/findPeople.js:39-82`, `S/CommunityFindPeopleScreen.js`) | Which door suits them | a door | "Train like me" and "Same discipline" are near-synonyms (Same discipline rides like_me with a filter, `findPeople.js`). Unavailable door ("Add your gym to see who trains there") sends the person to Edit profile (`REQUIREMENT_ROUTE`, `:56-60`) with no pointer to which field. "Open to training together" is always available but its opt-in lives in Training profile (3 levels down); the door does not say so. Non-members see an empty state "Create your profile first" under a visible search bar. |
| 3 | People list: count line "N" / "N+", filter chips, Filters icon (`S/CommunityPeopleListScreen.js:196-225`); rows are `ProfileCard` with reasons ("Same gym" etc.) and ONE trailing action: Connect (primary) when allowed, otherwise Follow plus a line "Not taking requests" / "Accepts requests from people who follow them" (`C/ProfileCard.js:140-260`) | What the row action does | Connect | The list never offers Follow where Connect is offered. The person who only wants to see someone's sessions must open the profile to Follow. Hub empty state tells them to "Follow people". Connect is the heavier relationship (opens a sheet with reasons and a note). |
| 4 | Connect sheet: "Become connected. They need to accept." (`C/ConnectSheet.js:49`), Why chips (up to two), Note (120), "Send request" | What connect gives (messages) and how it differs from follow | Send request | The one explanatory line does not say that connecting is what unlocks messaging, nor how it differs from following. Profile screen shows Follow and Connect side by side with no explanation (`CommunityProfileScreen.js` actions). |
| 5 | Requests: connection requests and follow requests are listed in Activity above events, with Accept/Decline (`CommunityActivityScreen.js:186-235`); on a profile the Connect button becomes "Respond" and opens an alert | Where requests are | bell / Respond | Requests live inside the Activity inbox, not a labelled Requests area; a push for a request lands on Activity (good). Followers-only profile follow shows "Requested". |
| 6 | Search: "Search by @username or name" / "Find someone you train with.", People | Groups chips, recent searches | type | Fine. Results show no Follow/Connect state guidance beyond the row (INFERRED, results use PersonRow/ProfileCard). |

## J5. Post

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Automatic: finishing a workout with sharing on creates the post silently (`L/ambient.js`); summary strip "Shared to Community" / "People who train like you can see this session." + "Add a note" (`WorkoutSummaryScreen.js:1392-1402`) | Who exactly sees it | Add a note | OBSERVED mismatch: default audience is Everyone (`trainingProfile.js` `DEFAULT_SESSIONS_AUDIENCE = 'everyone'`), but the strip says "People who train like you", never the actual audience and never an Undo or "Change who sees this". The only way to unshare is delete from the Post screen or switch sharing off in Training profile. |
| 2 | First ever session, member: strip AND a second card "Show people who follow you which days you trained? ... Show them / Not now" (`:1675-1710`) | Two separate asks | Show them | The second card is about consistency (days), the strip is about the session itself, but on a person who already auto-shares sessions the card duplicates the idea in different words ("follow you" vs "train like you"). Three share concepts with near names: "Share what I did", "Share my consistency", "Show them". |
| 3 | Manual: summary button "Post this session" / Today "Share this block" (tertiary under the finished-block decision, `HomeScreen.js:2811-2828`) / share card "Post to Community" -> Compose "Post to Community": Preview, Caption (280), "Who can see it" chips Followers / Everyone / each of my groups (`CommunityComposeScreen.js:236-300`), "Post" | What each chip means; who "Followers" are | Post | No privacy receipt on Compose. Group chips sit in the same row as the two radio chips and behave as checkboxes (OBSERVED `:127-137`); nothing says the first two are exclusive. Default audience is Followers for manual posts, Everyone for auto posts and notes: three different defaults. A person with no followers choosing Followers posts to nobody and is not told. |
| 4 | Free-text note: "Say hello" from the EMPTY Hub feed or EMPTY own profile only (`Hub:841`, `Profile:574`, per 01 item 8.1.1) | That notes exist | Say hello | CONFIRMED: no entry once the feed or profile has any item; the Hub has no compose button at all. A note therefore cannot be written by anyone who has ever posted. |
| 5 | After Post: toast "Posted to Community", replace to Post screen titled "Story" (`:`Compose handlePost) | what a "story" is | none | "Story" (screen title and delete dialog), "post" (compose title), "item" (summary) are the same object. The post screen does not show the audience. |
| 6 | Edit: only an auto-post's NOTE can be added/changed (`setPostNote`); there is no caption edit for a manual post and no audience change after posting (grep of `L/feed.js`, no update-post RPC client) | - | - | Edit is absent by design but unstated: a typo in a caption means delete and repost. |
| 7 | Delete: Post screen header trash icon (own) -> alert "Delete this story? It is removed for everyone. Your training is untouched." (`CommunityPostScreen.js:206`) | - | trash | Good copy. Deleting an auto-post does not say whether the next session will auto-post again (it will; INFERRED). |

## J6. React and comment

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Feed row: heart + count, comment bubble + count only when >0 (`C/ActivityItemRow.js:215-240`); the visible word "Respect" does not appear on the row (a11y label only: "Give this respect") | A heart means Respect | heart | The concept name is introduced only by a push ("gave your training respect") and the intro card. No time stamp or audience on the row (OBSERVED: only a today dot). |
| 2 | Tap heart on Hub/Profile/Group: no optimistic change; failure is swallowed (`CommunityHubScreen.js:455-470` comment "not worth interrupting anyone for") | - | heart | OBSERVED: offline, rate-limited (100 or 300 per window, `01 3.6`), restricted or no-profile all produce a tap that does nothing. The Post screen DOES revert and toast (`CommunityPostScreen.js:151-168`). Inconsistent. "Respect everyone who trained today" also fails silently (`RespectAllRow.js:70-75`). |
| 3 | Post screen: PostCard, "Comments", "No comments yet. Anything useful about the training is welcome here.", composer "Add a comment" + Send (`C/CommentRow.js:41-72`) | Rules for comments | Send | Non-member sees JoinToInteractRow. Keyword filter shows only "Some of that wording is not allowed in Community. Please reword it." with no hint what; rate limit "That is a lot of comments for one hour. Try again a bit later." (good, plain). |
| 4 | Report/delete: header icon is an ellipsis (others') or trash (own) (`:257-272`) | ellipsis suggests a menu | ellipsis | Ellipsis opens the Report sheet directly (no menu), with no Mute/Block alternative here; block and mute exist only on the author's profile (`C/ProfileMenuSheet.js`). Comment: report/delete via CommentRow actions. |

## J7. Groups

| Step | Shows | Must understand | Tap | Gap |
|---|---|---|---|---|
| 1 | Create: Hub GROUPS "New group" (hidden for minors) -> "New group": purpose line, "Group name" (40), "Blurb (optional)" (140), "Who can join": Open / Invite only + hint (`S/CommunityGroupCreateScreen.js`) | What a group is for | Create | "Blurb" is jargon. Hint explains access well. |
| 2 | After create: toast "{name} created." and replace to the group page: just the creator under MEMBERS and an empty feed | What to do next | - | No "Invite people" prompt. Invite lives in the "..." menu, admin only: rows "Invite by username" and "Share invite link" both open the same sheet (`CommunityGroupScreen.js:310-320`). Non-admin members cannot invite at all. |
| 3 | Find a group: only via Search > Groups by name; Hub shows only groups you are in | - | - | No directory of open groups; unknown name = no discovery. |
| 4 | Non-member page: label line, blurb, "Join" button (both open and invite-only; the toast then says "Joined." or "Requested to join." `:197`). With invite link: "You have been invited to this group." + "Accept invite" | Open vs approval | Join | The button never says "Request to join" for approval-only groups until after the tap. Non-members see no feed (`data={isMember ? feedRows : []}`) and no member list, so a person cannot judge a group before joining. |
| 5 | Admin approving: in the Members screen only ("Approve"); a join-request push lands on Activity, and Activity rows for group items route to the group (`CommunityActivityScreen.js:281`) | Where requests are | - | No badge or banner on the group page itself for pending requests (INFERRED, none found in the render). |
| 6 | Member page: MEMBERS (board rows, week metric, DayDots), "Respect everyone who trained today", ACTIVITY, row "Share a workout with the group" | What it shares | row | This row shares only your most recent completed workout (`:166-186`), not stated; if none, toast "Finish a workout first, then share it here." |
| 7 | Leave / Close: menu rows, destructive tone; `doLeave` and `doClose` execute at once with no confirmation, then toast (`:240-262`) | - | menu | OBSERVED: no confirmation on Close group (affects every member, closed groups leave all lists, migrate 176) or Leave. |

## J8. Gyms

| Step | Shows | Gap |
|---|---|---|
| Set gym | Join / Edit profile / onboarding: `GymPicker` ("Gym, town or postcode", "Use my location"), tapped row opens `GymDetailSheet` ("This gym", "Select this gym") before it is chosen | Good confirmation. Edit profile has both "Where you train" (a setting), "Place", "Trains at" and "Other gyms" as separate sections (`CommunityEditProfileScreen.js:454-560`): four gym-location concepts. |
| Not found | "Can't find your gym?" -> "Add your gym" -> `CommunityGymAddScreen` ("Add gym"); toast "Added. It shows for everyone once a second person confirms it." (`:93`) | Reasonable. Screen not reachable except from the picker (01). "Operator (optional)" is jargon. |
| Gym page | Cohort page via Hub gym row: GymSummary, count line, "Is this gym real? Confirm it", "Report a problem with this gym" (`Dimension:608-622`), PEOPLE or TRAINED THIS WEEK, "This month and consistency" (to the Board), RECENT | The reporting/confirming links are text-only chips at the same weight as content. "Board" is never named; the label "This month and consistency" is the entry. |

## J9. Messaging

| Step | Shows | Gap |
|---|---|---|
| Start | Only between connected people: profile "Message" appears after Connected (`ConnectButton.js:246-258`), PostCard "Message @handle" if connected (`PostScreen:233`), people-list row after connection. Messages (chat icon) empty: "Messages are between people you are connected with. Connect with someone from Find people first." + "Find people" (`CommunityConversationsScreen.js:130-135`) | The rule is stated well here, but at the Follow level a person who sees someone's post and wants to say something has no message path and no hint why. |
| In conversation | Header ellipsis -> options (remove connection, block, report); long-press a message to delete (own) or report (theirs) (`:475-485`); empty "No messages yet. Say hello, or ask about their training."; "Suggest a session" tile | Long-press is the only route to report a message and it has no visible affordance. If sending fails `not_connected`, notice with a "Connect" button that goes back to the profile (`:386-398`). |
| Blocked / muted | Block alert "This conversation ends for both of you..." (`:351`); mute ("Muted. They are not told.") exists on profiles only and silences posts and message pushes (01 2.12) | Mute is not available from a conversation (INFERRED from menu rows; verify). A blocked-by-them state reads as the generic closed line. |
| Notifications | "New message from @handle", one push per conversation per 15 min, lands on that conversation (`notificationRoute.js:173-186`) | Good. |
| Minors | No connections or messages; copy "Not available. Connections and messages are for people over 18." | OK. |

## J10. Profile and training profile

| Step | Shows | Gap |
|---|---|---|
| Own profile | Avatar, name, handle, bio, facts, TrainingProfileLine, ProgressStrip (if shared), counts (followers / following / connections), "Edit profile", "Share link"; ACTIVITY with empty "Your sessions, personal bests and notes show up here." + Say hello (`CommunityProfileScreen.js:420-440`, `:560-580`) | No Post/Note entry once there is any activity (J5). "Hidden from others" notes are good. No path to Training profile or Privacy from the profile page (Edit profile -> Training profile; Privacy via Hub shield). |
| Someone else's | Follow and Connect side by side, counts, strip only if they share it, ellipsis menu (Share link, Mute, Block, Report, `ProfileMenuSheet`) | Followers-only profile shows "Follow to see their training stories." Fine. Two relationship buttons unexplained. |
| Cohorts/dimensions | Tap a cohort row on the Hub: gym, discipline, age group, area pages | Age group page is locked unless you share your own band: "Share your age group in your training profile to see people your age." (`Dimension:548-560`), with a "Training profile" link: reciprocal, honest. Rules text says age is never shown (`CommunityRulesScreen.js:~91`) while an opt-in age group exists (01 8.5). |
| Edit | "Edit profile": Avatar, Username, Name, Bio, Training styles, Goal, Where you train, Place, Trains at, Other gyms, "What do you train for?", Who can follow you, Save, Leave Community | Two overlapping taxonomies (Training styles, 8 items; "What do you train for?" disciplines, 15 items). Join only asks disciplines. "Leave Community" is a destructive action on an edit screen. |
| Training profile | Switches: days, time bands, sessions, staple lifts, experience, age group, consistency, "Share what I did" + audience; "Open to training together" section; Remove/Keep alert on switching off sharing (`TrainingProfileScreen.js:255-272`) | It is the real privacy centre but reached 3 taps in (Hub > shield > Training profile, or Edit profile). The Privacy screen itself lists "Training profile" as one row among Edit profile, Followers, Connections (`PrivacyScreen:312`). |

## J11. Activity and notifications

OBSERVED: Activity lists, in order: Connection requests (reasons, note), Follow requests (Accept/Decline), then "Activity" events (follow, accept, reaction, comment, group request/accepted/invited) as one-line rows "@handle {did something}" + preview + when, unseen dot (`CommunityActivityScreen.js:186-285`, `C/ActivityRow.js`). Opening marks everything seen. Row tap: post kinds go to the post, group kinds to the group (`:274-284`), others to the profile.

Push kinds and where a TAP lands (OBSERVED `lib/notifications/notificationRoute.js:127,173-186`, copy `community-notify/index.ts:192-230`):
| Push | Body | Tap lands |
|---|---|---|
| follow, follow_request, follow_accepted | "@h followed you" etc. | Activity |
| reaction | "Someone gave your training respect" (one per UK day) | Activity, not the post |
| comment | "@h commented on your post" | Activity, not the post |
| connect_request / connect_accepted | "@h wants to connect" | Activity (request is actionable there) |
| message | "New message from @h" | that conversation |
| group_request / group_accepted / group_invited | "@h asked to join your group" etc. | Activity, not the group (01 1.2) |

Gaps: every push title is the bare word "Community" (no differentiation on a lock screen); comment and reaction pushes land one tap away from the thing they name; no notification-settings entry inside Community (quiet hours exist as an RPC, `community_set_quiet_hours`; INFERRED no UI row on Privacy: verify).

## J12. Moderation and safety (documented, no change proposed to any gate)

- Report: Post/comment/message/group/profile -> `ReportSheet` "Report this": "Pick the closest reason. Reports go straight to a moderator queue." six reasons incl. "Harmful body or eating content", optional detail, "Send report" -> toast "Thank you. A moderator will look at this." (`C/ReportSheet.js`). The reporter is not offered Block/Mute afterwards and the reported item is not hidden for them (INFERRED). Already-reported: "You have already reported this. A moderator is looking at it."
- Block: profile menu alert "Neither of you will see the other in Community, and any follow between you is removed. You can unblock later." Blocked profile screen: "You have blocked this person / Neither of you can see the other in Community." + Unblock. Lists of blocked and muted people with Unblock/Unmute on Privacy.
- Rules: Join/onboarding show "Four rules"; full text on `CommunityRulesScreen`; a changed version shows the Hub banner "The Community rules have changed. Your training at your gym stops updating until you read and accept them." (`Hub:585-598`).
- Suspended or restricted: Hub notice "Your Community access is suspended." / "Some of your Community access is restricted." with reason; but OBSERVED no screen maps `profile_restricted`/`profile_suspended` (only `onboardingJoin.js:236`): Compose, Post, Connect, Follow, Message show the generic "That did not post. Please try again." A restricted person is told to retry something that cannot succeed.
- Calm mode and open ED flag as the person experiences them (OBSERVED, and by design silent): Today Community row disappears; Hub You row disappears (`Hub:678`); the summary share strip disappears and a quiet "Post to Community" button remains (`WorkoutSummaryScreen.js:1712-1745`); auto-posts and consistency counters are withheld; physique cohort pages show "This page is resting just now." with the Beat UK row (`Dimension:570-581`); Community pushes are held (edge function). There is no line that tells the person why their own row or sharing is paused. Per CLAUDE.md the withholds themselves must not be weakened; any copy added must not reveal an ED flag. Fix direction is therefore wording-only, reviewed against the ED rules, or leave silent.
- Gap: "Report" and "Block" are reachable but in different places per surface (J6); moderators' response is invisible to the reporter beyond the toast (no status).

## J13. Leaving

| Path | What happens | Gap |
|---|---|---|
| Privacy off (switches) | "Who can follow you" Anyone / People I approve; show gym / place switches; consistency/session switches in Training profile with Remove/Keep | Hiding the whole profile without deleting it is not offered; the options are followers-only or leave. |
| Leave Community | Privacy or Edit profile -> alert "Leave Community? Your profile, posts and follows are deleted. Your training, plans and food diary are not touched." -> toast "You have left Community" -> goBack (`PrivacyScreen:188-208`) | Clear. Not stated: messages, groups you admin, whether the username is released (30 day cooldown note exists for change, not leave). Then `goBack` returns to a Hub that re-renders as not joined (INFERRED). |
| Account deletion | Settings > Account > Delete account alert: "This permanently deletes your account and all your training data across every device." (`hooks/useAccountActions.js:167-168`) | Does not name Community profile, posts or messages. `community_profiles.user_id ... ON DELETE CASCADE` (migrate_160:108) suggests profile-linked rows cascade, but the `delete-account` function never mentions Community (grep), so completeness is UNVERIFIED (01 8.3). |

---

## (a) Ranked lost moments

Blocker
1. L1 The Hub has no structure the person can navigate: six object types in one scroll, feed fixed to Following, no scope/sort/filter (section 0). Fix: partition into labelled sections and add a feed scope control (IA below).
2. L2 Free-text note has no entry once any post exists, and the Hub has no compose affordance at all (`Hub:841`, `Profile:574`). Fix: a persistent compose entry (Hub/profile) for note and session.
3. L3 Silent failure of Respect on Hub/Profile/Group and of "Respect everyone" (offline, rate limit, restricted). Fix: optimistic with revert and a calm toast, same as the Post screen.

High
4. L4 Join: rules shown below the commit button; consent recorded without them above (`Join:678-700`). Fix: move the four rules and link above "Create profile".
5. L5 Default public auto-posting is under-signposted: summary strip says "People who train like you" while audience is Everyone; onboarding receipt says "Sessions you choose to share" while step says every session is shared; "Off by default." copy on a row that is on. Fix: one truthful sentence naming the audience everywhere, with a one-tap "Change who sees this" on the summary strip.
6. L6 Find people lists offer Connect, not Follow; Hub says "Follow people". Fix: Follow as the primary row action, Connect secondary (or one "Follow" with connect offered on the profile), and a two-line "Follow vs Connect" explanation.
7. L7 Restricted/suspended people get "try again" on every action (no `profile_restricted`/`profile_suspended` mapping). Fix: one calm line pointing to the Hub notice and the rules.
8. L8 Pushes for comments, reactions and group events land on Activity, one tap from the thing named. Fix: route to the post/group when the payload carries an id.
9. L9 Group: Close group and Leave group are unconfirmed; invite buried in an admin-only menu with two identical rows; no invite prompt after create; no way to discover open groups except by exact-ish name. Fix: confirmation for Close, visible "Invite" after create, a group browse/suggest list.
10. L10 Today row for new joiners: "Nobody you follow has trained yet today" with action Invite. Fix: when following 0, show "Find people to follow" instead.

Medium
11. L11 Onboarding step titled "Where do you train?" hides the Community sign-up; join fires with no confirmation.
12. L12 Compose: three different default audiences (Followers manual, Everyone auto and note), group chips mixed with exclusive radio chips, no explanation of Followers when you have none, no privacy receipt.
13. L13 Terminology drift: story / post / item; Respect (heart icon without the word); Connect / Follow / Message / train together / Open to training together; board; cohort; "Blurb"; "Operator".
14. L14 "Browse first" / "Create my profile" loop on the non-member Hub (`:620-636`); non-member RECENT is unexplained.
15. L15 Activity empty-state "Find people" opens Search; Hub legacy card likewise (`Activity:262-267`).
16. L16 Edit profile has two overlapping taxonomies (styles vs disciplines) and four gym-place concepts; Join asks only one.
17. L17 Privacy: the sharing switches are in Training profile three taps deep; the Privacy screen does not show the state of "Share what I did".
18. L18 Report icon is an ellipsis that opens Report directly; block/mute only on the profile; message report is a long-press with no affordance.
19. L19 Calm/ED pauses are silent for the person's own surfaces (document only).
20. L20 Summary after the first session shows both the share strip and the "which days you trained" card.

Low
21. Header density: five round controls on the Hub, the shield unlabelled (01 8.1.10).
22. Feed rows show no time and no audience; post detail uses a different visual grammar (Card) from the feed row (flat).
23. "Share a workout with the group" shares only the latest workout without saying so.
24. Cross-tab entry (Coach/Settings -> Community) returns to Today on Back (INFERRED from `navigateCrossTab.js`).
25. Account deletion copy does not name Community data.
26. Find people: "Train like me" vs "Same discipline" near-duplicates; stale "five doors" comments.

## (b) Navigation structure findings

OBSERVED (`RootNavigator.js:499-534`, 01 1.1, 1.4):
- Community is a 24-screen subtree of the Today (Home) stack, all `headerShown: false`, every screen a push with its own `BackHeader`. No Community tab: the tab bar still highlights Today while inside.
- Depth: Today > Hub is 1 push. Typical deepest honest chains: Today > Hub > Find people > People list > Profile > Conversation (5); Today > Hub > Privacy > Training profile (3) for the most important privacy switch; Today > Hub > Group > Members > Profile (4). Profile, Post and Conversation link to each other, so chains are unbounded and there is no "back to Community" shortcut (only the system back).
- Dead ends: `CommunityGymAdd` only from the gym picker; `CommunityModeration` only from Privacy (moderators); `Board` has no name and is reached only through "This month and consistency" or the profile strip; Followers/Connections reached only from your own profile or Privacy.
- Back-stack surprises: Compose and Create flows use `replace`, so Back skips the form (good, but Back from a just-posted Post screen goes to wherever you were, not a "posted" state); Join uses `replace(next.screen)` or `goBack()`; cross-tab entries pop Today to root then push Community, so Back returns to Today not Coach/Settings (`navigateCrossTab.js`); deep links (`volyume://community/u/...`) land with Back to the Today root rather than the Hub (INFERRED).
- Screens with the same job: Find people vs Search (finding people); Edit profile vs Training profile vs Privacy (what I share); Hub You row vs own Profile; Activity inbox vs Hub ACTIVITY feed (both named "activity" but one is notifications, one is posts); Followers vs Connections vs Conversations (your people, three screens).
- Modal vs push: Report, Connect, Group invite, People filters, Gym detail are sheets; Rules, Privacy, Training profile, Compose are pushes. Block/mute are alerts on the profile but a confirm sheet in conversation. Destructive confirmation style is inconsistent (Delete post/comment alert; Close/Leave group none; Leave Community alert).
- Entry duplication: seven entries into the same Hub (Today pill, Today row, intro card, Coach row, Settings row, summary, onboarding), none of which lands on a specific section.

## (c) Information-architecture alternatives

Founder requirement carried into all three (from the coordinator): Hub is partitioned into clear sections (Feed / People / Groups / You, or equivalent); the feed has a first-class scope filter (Following, My gym, My groups, Everyone) plus sort; cohort pages (gym, discipline, age group, area) live in a People area and are never rendered inside the feed list. Sort options need server support for non-newest orders (INFERRED: `community_feed`/`community_discover_posts` only return newest first today; verify before promising sort beyond newest/most respected).

### Option A: Community as a sixth bottom tab (Feed / People / Groups / You segments)
- Structure: tab "Community" with a segmented top control. Feed: scope chips Following | My gym | My groups | Everyone and a sort (Newest | Most respected), compose button always present (note + session). People: search bar, six doors as a list, and "Where you train" cohort pages (gym, discipline, age group, area) as a clearly separate "Places and groups of people" list. Groups: My groups, Discover open groups, New group. You: own row, requests, messages, activity, privacy, training profile.
- Pros: matches how Hevy/Strava place social (02 sections 1.1, 1.4); one persistent home; Back always returns to a Community root; fixes depth and duplicate entries; segments make the founder's "lumped together" structurally impossible; room for badges per segment (requests, messages).
- Cons: a sixth tab on a five-tab bar (needs founder call and tab-bar layout review); 02 warns forced social tabs are a documented complaint (Hevy) and Strong thrives without; touches `RootNavigator` heavily, 24 route registrations, deep-link config, notification routes, Today entries; tab icon competes with training for attention, against "logging is home".

### Option B: Keep the Today-stack Hub, re-sectioned (segmented Hub)
- Structure: same entry points. Hub becomes a segmented screen with sticky segments Feed | People | Groups; "You" stays the avatar button (profile, requests, privacy). Feed has scope chips (Following, My gym, My groups, Everyone) and a sort sheet; compose "+" in the header. People segment holds the six doors, search and a "Places" list for gym, discipline, age group, area cohorts. Groups segment holds My groups, Discover, New group. The five round header buttons collapse to Search, Messages, Activity (bell) and the avatar.
- Pros: no navigator change, lowest risk to deep links and notification routing; directly answers the founder complaint; reuses existing rows (`PersonRow`, `CohortRow`, `GroupRow`, `ActivityItemRow`) and the cohort screens unchanged; reversible.
- Cons: Community stays 2 taps from Today and invisible in the tab bar (A-03 stands, mitigated by the pill/row); Back from a cross-tab entry still lands on Today; segments are a pattern the 2026-09-10 revamp removed once ("No Chip segment any more", `Hub:261`), so the lead must record why it comes back (the earlier segment was Following/Discover; this one separates object types).

### Option C: Hybrid, a "Community" home with three cards that open dedicated screens, plus a Today feed strip
- Structure: Hub reduced to a short home: You row, a compact "Your week" strip, three large entries (Feed, People, Groups) with counts and dots, requests/messages row. Feed is its own pushed screen with scope chips and sort; People is its own screen (doors + cohort "Places" list); Groups its own screen. Today keeps only the pill and row (row action becomes "Find people" while following nobody).
- Pros: smallest first screen, so the first minute has one obvious next step per card; each destination screen is single-purpose and simple to test; deep link and push targets can point straight at Feed, People, Groups or a specific item; fits the founder's "no filtering" complaint because each screen owns its controls.
- Cons: adds a level (Today > Home > Feed), the opposite of the depth finding; feed becomes a destination rather than the landing content, which lowers casual reading (02 2d: social should feel part of the logger); more new screens than B; needs the entry points repointed.

Lead summary of the trade: A is the strongest structure but the largest and least reversible change and needs a founder decision on a sixth tab; B fixes the stated complaint fastest with the least risk; C is clearest for first-time people but adds depth. All three need the same non-structural fixes from section (a), which are independent of the choice: L2 note entry, L3 silent Respect, L4 rules above Create, L5 audience truth, L6 Follow vs Connect, L7 restricted-state copy, L8 push routing, L9 group confirmations and invite prompt.

UNVERIFIED (no device/render): every statement about visual weight, first-screen fold, and tap targets; whether Mute is reachable from a conversation; whether the Privacy screen exposes community quiet hours; completeness of account-deletion cleanup for Community rows; whether the minor Hub hero is gated.
