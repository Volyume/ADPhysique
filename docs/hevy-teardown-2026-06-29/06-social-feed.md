# Hevy Teardown — 06 Social (feed, following, profiles, likes/comments, discovery, sharing)

Source corpus: `/tmp/.../scratchpad/corpus/` (Hermes-packed bundle strings — corroborated, not
verbatim copy). Hevy is RN/Hermes v3.1.0. This area is Hevy's single biggest differentiator and
the area where Volyume has deliberately taken the *opposite* stance for ED-safety and brand reasons.

## Social — Hevy vs Volyume

Hevy is, structurally, a **fitness social network** with a workout-logging app attached. Volyume is
a **private precision-coaching app** with one trust-based 1:1 partner signal attached. These are not
two implementations of the same feature; they are two philosophies. Most of Hevy's social surface is
in the AVOID column for Volyume on brand and safety grounds — but a handful of mechanics (the
non-comparative parts) adapt cleanly.

### How Hevy does it

A full public social graph. Evidence from the bundle:

- **Workout feed** — `FeedScreen`, `RegularFeedStack`, `AllFeedCellsScreen/ViewModel`,
  `feed.cell.*`, `feed_workout_detail_press`, `feedSelector.menu.home`. A scrolling home feed of
  workouts from people you follow, with empty-state CTAs to connect (`feed.connectWithFriendsCta`,
  `feed.connectToStravaCta`), invite friends, and find users.
- **Discover / Explore** — `ExploreScreen`, `ExploreViewModel`, `DiscoverFeedTab`,
  `DiscoverFeedPagedStore`, `discover_feed_workouts_paged`, `discover.selected.title`. A separate
  algorithmic/global feed of public workouts beyond your own graph.
- **Following graph** — `FollowerScreen`, `FollowingViewModel`, `FollowRequestScreen`,
  `ReceivedFollowRequestViewModel`, `MutualFollowersScreen/ViewModel`, `ContactsYouFollowScreen`,
  `FOLLOW_COUNT_DISK_STORAGE_KEY`, `Follow.confirm/title`. Follow + follow-request (for private
  accounts) + mutuals.
- **User profiles** — `userProfileScreen`, `ProfileScreen`, `ProfileTab`, `ProfileEditScreen`,
  `ProfileHeader`, `userProfile.header.workouts`, `Profile.section.recentWorkouts`,
  `PROFILE_DESCRIPTION_LENGTH`, `PROFILE_WEBSITE_LENGTH`, `PROFILE_FULL_NAME_LENGTH`. Public profile
  with bio, website, full name, recent workouts, routines, stats.
- **Likes & comments** — `workout_comments`, `workout_comment`, `workout_comment_likes`,
  `comment_like_press`, `comment_reply_post`, `comment_mention_push_enabled`,
  `comment_discussion_push_enabled`, `OtherUserLikesPress`, `LikedByUsername`,
  `workoutSummaryCell.like.plural`, `feed_workout_add_comment_press`, `ScrollToCommentScreen`,
  `CommentDirectReplySpotlight`. Threaded comments with replies, likes on workouts *and* on
  comments, like-lists, comment drafts, emoji.
- **@-mentions** — `MentionSearchFromInput`, `MentionSuggestionSettingsPress`,
  `clearSuggestedMention`, `feed_workout_mention_press`,
  `feed_workoutDetail_descriptionMention_press`. Mention users in comments/descriptions.
- **Compare / leaderboards** — `CompareUserExerciseScreen`, `CompareUserProfileScreen`,
  `compareUserExercise.metric.oneRepMaxKg`, `compareUserExercise.stronger.alert`,
  `LeaderboardScreen`, `LeaderboardExercisesScreen`, `exerciseDetail.leaderboard.*`,
  `LeaderboardRankColor`, `LeaderboardUserRow`. Direct head-to-head 1RM comparison vs another user,
  and global per-exercise leaderboards/ranking.
- **Discovery / growth** — `feed.suggestedUsers.*` (featured_users, friendOfFriend, followingYou),
  `SuggestedUsersStore`, `userProfile.suggestedAthletes`, contact upload
  (`contacts_tab_uploadContacts`, `SearchableUserListScreen`, `InviteFriendSocialsViewModel`),
  Branch (`branch.io`) for referral attribution.
- **Privacy controls** — `PrivacySocialSettingScreen/ViewModel`, `privacySettings_enablePrivateProfile`,
  `privacySocial.hideSuggestedUsers`, per-workout `workoutVisibilityModal` /
  `SelectWorkoutVisibilitySettingsScreen` with options **everyone / followers / private**
  (`Visibility.option.everyone|followers|private`), plus a `private.coached` variant and a
  `shareBiometrics` toggle. Notably there is a **`default_workout_visibility_public`** event/flag —
  Hevy's default leans public.
- **Realtime** — Ably (`LiveSync*`, `handlePushChatUpdate`) powers live-sync of an in-progress
  workout to followers/watchers, plus push for comments/mentions/likes.
- **Moderation** — `ReportScreen` (×10 refs), `Profile.alert.userOptions.report`, block/unblock
  (`BlockedUsersScreen`, `userProfile.blockConfirm`, `blockReasonMessage`),
  `BlockedUserProfileCell`, `PrivateProfileCell`. Report user, block, private-profile gating.

### How Volyume does it today (file:line)

Volyume has **no public feed, no profiles, no followers, no likes, no comments, no discovery, and no
leaderboards** — by deliberate design, not omission. The entire "social" surface is one private,
mutual, opt-in **training partner** built on *derived signals only*:

- `src/screens/PartnerScreen.js:36-48` — the explicit privacy receipt. Partner sees *only*: a
  weekly trained-or-not count ("3 of 4"), a shared streak in weeks, a "Resting" state, one cheer/day.
  Never sees: weights/sets/reps, bodyweight/measurements/photos, food/calories, check-ins/coach data,
  or location.
- `src/screens/PartnerScreen.js:206-211` — the pitch states the brand position outright: *"There are
  no numbers to compare and there is no feed to scroll. It is just the two of you."*
- `src/lib/partners/link.js:1-16` — pairing is **code/link only**, *"NO in-app user search or
  discovery of any kind."* Unguessable server code via `volyume://partner/<CODE>`.
- `src/lib/partners/signals.js:13-18` — `ticksLabel` exposes only the binary adherence-to-own-plan
  signal; no raw metric ever leaves the device.
- `src/lib/partners/sharedStreak.js:1-25` — no-blame shared streak: a wellbeing/ED hold is
  *indistinguishable* from a planned deload ('resting' never reads as a fail); quiet weeks hold the
  streak with no notification and no copy attributing it to a person. Deliberate inversion of
  Duolingo's break-and-unpair.
- `src/lib/partners/service.js:1-11` — telemetry emits counts/booleans only, *"NEVER partner
  identity"*; pairing is the one online step, everything else reads local cache (offline-first).
- Cap: free = 1 partner, Pro = up to 3 (`PartnerScreen.js:250`). Either side can end it; on end all
  shared data is deleted (`PartnerScreen.js:230-234`).
- ED-safety frame: `src/lib/wellbeing.js:1-17` (calm mode + Beat UK signposting) and CLAUDE.md's
  privacy/safety mandates set the boundary the partner system was built inside.

### Gaps

1. **No social loop / network effect at all.** Hevy's growth and retention engine is the feed +
   follow graph + comments + suggested users + contact-invite. Volyume has zero viral surface beyond
   the single partner invite link. This is a *deliberate* gap, but it is the largest commercial
   delta — Volyume has no organic in-app acquisition channel and no daily social re-engagement hook.
2. **No lightweight encouragement richness.** Hevy lets people comment, reply, like, and @-mention to
   keep each other going. Volyume's only social affordance is one cheer per day with no text. There
   is real motivational headroom *within* the privacy model (richer cheers, milestone acknowledgement)
   that Volyume leaves on the table.
3. **No sharing-out asset.** Hevy has share-to-Instagram/stories monthly reports, shareable workout
   media, and Strava cross-post. Volyume only has the OS share-sheet on the partner invite link
   (`PartnerScreen.js:87`). It has no branded, user-controlled "share my milestone" artefact for
   word-of-mouth — even a privacy-safe one (a streak badge with no numbers) does not exist.

### Recommendations

Legend: adopt / adapt / AVOID · effort S/M/L · priority P1/P2/P3.

| # | Idea | Verdict | Effort | Pri | Rationale |
|---|------|---------|--------|-----|-----------|
| 1 | Public workout **feed** (home + Explore/Discover) | **AVOID** | L | — | Direct conflict with brand ("there is no feed to scroll", `PartnerScreen.js:209`) and ED-safety: a scrolling stream of others' volume/PRs is exactly the comparison surface the app is built to remove. Do not build. |
| 2 | **Follower graph + public profiles** | **AVOID** | L | — | Same reasoning. A public profile with recent workouts/stats re-introduces the body/number comparison the partner system was designed to exclude. Off-brand. |
| 3 | **Compare-user / leaderboards / rank** | **AVOID** | M | — | The single most ED-adverse Hevy feature (head-to-head 1RM, global ranking). Violates the no-comparison core and the safety mandate. Never build. |
| 4 | **Per-item visibility model (everyone/followers/private)** | **AVOID** | M | — | Only meaningful if a feed exists; without one it is dead config. Volyume's model is binary by design (shared with your one partner as derived signals, or nothing). Keep it binary. |
| 5 | **Block / report + safe-by-default** mechanics | **adapt** | S | P2 | Hevy's `BlockedUsers`/`ReportScreen` are the *safety* half of social and *do* fit a trust app. Volyume's invite RPC already enforces not-self/not-blocked (`service.js`); surface a lightweight "block this code/partner" + report-abuse path so a bad-faith partner invite can be refused/reported. Privacy-positive, not a feed. |
| 6 | **Richer, still-textless cheers** (a small set of pre-set encouragements / milestone acknowledgements) | **adapt** | S | P2 | Closes Gap 2 without opening a comment surface. Keep it derived & bounded: no free text (no body-shaming/numbers vector), still one/day, still no raw metrics. Acknowledge *the partner's own* milestone ("hit their week", streak anniversary) rather than comparing. |
| 7 | **Privacy-safe shareable milestone artefact** (e.g. a streak/consistency badge with NO numbers, NO bodyweight) | **adapt** | M | P2 | Closes Gap 3 and gives a word-of-mouth asset that matches the link-as-asset model already in `link.js:7-11`. Must show *consistency*, never volume/weight/PRs/photos. Founder decision on exactly what appears. |
| 8 | **Suggested-partner from contacts / discovery** | **AVOID** | M | — | Contact-upload + suggested-users is core Hevy growth but breaks `link.js`'s "NO in-app user search or discovery". Pairing must stay an explicit, out-of-band trust act. Keep code/link only. |
| 9 | **Strava-style "connect with friends" empty-state nudges** | **adapt (lightly)** | S | P3 | The *mechanic* (a gentle nudge to invite one trusted person when unpaired) is fine and already partly present. Keep it single-partner, never a "grow your network" prompt. |
| 10 | **Live-sync of in-progress workout to a watcher (Ably)** | **AVOID** | L | — | Adds a realtime dependency and a live-performance-watching dynamic that pulls toward comparison/performance anxiety and breaks offline-first. Not worth it for a 1:1 trust app. |

### Quick wins

- **Block/report on partner invites (S, P2)** — extend the existing redeem RPC guards with a
  user-facing block + report-abuse action. Pure safety, fully on-brand, small.
- **Two or three preset cheer variants (S, P2)** — swap the single hand-wave cheer for a tiny fixed
  set ("Nice week", "Strong run", milestone ack) with no free text and the same one/day limit. Real
  motivational lift, zero new privacy surface, no schema change to the signal model.
- **Confirm `default_workout_visibility_public` is the anti-pattern to call out** — Hevy *defaults to
  public*; Volyume's whole stance is the inverse. Use this in marketing/onboarding copy ("your
  training is private by default, always") — a positioning quick win, not code.

---

**Net:** Volyume should *not* chase Hevy's social network — most of it (feed, profiles, followers,
likes/comments, compare, leaderboards, discovery, live-sync) is squarely AVOID on ED-safety and brand
grounds, and the existing partner system is a stronger, more defensible differentiator *because* it
refuses them. The opportunity is to deepen the privacy-first model (safer cheers, block/report, a
numbers-free shareable badge), not to bolt on a feed.
