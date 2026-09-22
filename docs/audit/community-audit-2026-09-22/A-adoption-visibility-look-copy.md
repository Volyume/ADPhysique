# Community Audit — Lane A: Adoption, Visibility, Day-Zero, Join Friction, Look, Copy

**Date:** 2026-09-22
**Scope:** Community feature, read-only. Adoption/visibility/day-zero/join-friction/look/copy only — functionality-vs-backend, privacy, moderation, gym directory and engineering are Lane B's.
**Production ground truth used throughout:** users_profile 24, community_profiles 2, community_follows 1, community_posts 0, community_comments 0, community_reactions 0, community_groups 0. Sentry: no Community issues in 90 days.
**Files read (full or substantial part):** 10 prior-audit documents (`communities-revamp-2026-09-10/01,02,03,20,26,27,40-DECISIONS`; `community-product-audit-2026-09-07/README,20-JUDGEMENT`; `DECISIONS-2026-07-09.md` D160/D162/D163/D188) + 65 source files: 12 Community screens, 12 Community components, 12 Community lib modules, 6 guard tests, `theme.js`, `RootNavigator.js`, `HomeScreen.js`, `YouScreen.js`, `SettingsScreen.js`, `WorkoutSummaryScreen.js`, `ShareCardScreen.js`, `ProOnboardingScreen.js`, `profileAvatarPresets.js` = **75 artefacts**.

**Important calibration finding, stated up front:** the 2026-09-10 to 2026-09-14 campaign (blueprint, early-days spec, look-and-feel pass) landed almost everything it proposed — phases 0 to 3 of the blueprint, the early-days honesty work, and the look-and-feel pass are live at HEAD, not just planned. Several defects the source documents describe (the "programme" copy framing, the stepped left edges, the wireframe divider, the misplaced graph, the "blob" avatars) are **already fixed**. This audit does not re-report them; findings below are what is still true today.

---

## Top findings

| ID | Severity | Area | Finding | Evidence |
|---|---|---|---|---|
| A-01 | blocker | return | Push notifications fire for only 2 of 8 Community event kinds, and only when Respect/comment happen from the post-DETAIL screen; follow, connect, message and 4 of 5 Respect surfaces never notify anyone | `notify.js:21-30`, `CommunityPostScreen.js:150,173` (only two call sites of `notifyCommunityEvent` in the whole `src/` tree); `CommunityHubScreen.js:437`, `CommunityGroupScreen.js:155`, `CommunityProfileScreen.js:213`, `CommunityDimensionScreen.js:472`, `FollowButton.js:66-71` all call the underlying RPC with no notify call |
| A-02 | blocker | day-zero / return | A brand-new joiner's only realistic "first follow" is one account: the founder's HOST row. With 2 profiles in production, if that account is private, already followed, blocked/muted, or the read fails, a new joiner has nobody to follow and no content anywhere | `earlyDays.js`; `CommunityHubScreen.js:217-240,703-723` |
| A-03 | high | visibility | Community has no tab. The one permanent, always-on entry point on the app's busiest screen is a 34dp icon with no visible text | `HomeScreen.js:2276`; `CommunityHeaderAction.js:37-66` |
| A-04 | high | visibility | The one-time Home intro card is retired for good by EITHER button ("Have a look" or "Not now"); there is no second nudge, ever, for someone who doesn't act on it or opens Community without joining | `HomeScreen.js:669-672,2726-2731`; `HomeCommunityIntroCard.js:45-46` |
| A-05 | high | day-zero | First post is 100% gated behind finishing a real workout or a whole mesocycle block. There is no free-text "say hello" post, so a curious new joiner with no training logged yet cannot post anything | `CommunityComposeScreen.js:59-65`; `WorkoutSummaryScreen.js:1432-1451`; `HomeScreen.js:2441-2455` |
| A-06 | medium | onboarding | Choosing "Join Community" at onboarding step 5 does not create the profile; the join runs only when the whole 8-step wizard finishes. Abandoning steps 6-8 silently drops the join (only an app-kill draft-resume, not a "never came back" case, recovers it) | `ProOnboardingScreen.js:2080-2110,2634-2834` |
| A-07 | medium | return | The one consistency-sharing win-back offer ("Show them") appears once, after the first-ever workout, and never again once answered either way, including a decline | `ambient.js:250-266`; `WorkoutSummaryScreen.js:384-414` |
| A-08 | medium | look | CommunityGroupScreen's own activity zero state is still the full bordered `EmptyState` card, not the "one quiet line" the same section got on the Hub and Profile under the 2026-09-14 look-and-feel pass — the presentation law was not applied to every screen it should cover | `CommunityGroupScreen.js:364-365` vs `CommunityHubScreen.js:764-768`, `CommunityProfileScreen.js:539-544` |
| A-09 | medium | copy | "Age band" is the literal training-profile row label (jargon) while the cohort-page copy for the identical field says "age group" — one field, two registers | `CommunityTrainingProfileScreen.js:86`; `CommunityDimensionScreen.js:550-552` |
| A-10 | medium | visibility | Settings' "Community" row does not open Community — it opens the Privacy sub-screen. Someone looking for "my Community feed" in Settings lands on "who can follow you" instead | `SettingsScreen.js:150-155` |
| A-11 | low | visibility | Find People is SIX doors today, not five — task 8 added "Same discipline" client-side, riding the `like_me` RPC. Anything reasoned from the original five-door discovery blueprint undercounts it | `findPeople.js:36-88` |
| A-12 | low | look | Avatars are 1-of-6 abstract icon presets, never a photo (deliberate: no image-moderation dependency, D160 item 3). On a 2-person community this reinforces "nobody real is here"; noted as a real headwind, not a bug to fix | `profileAvatarPresets.js:1-8` |
| A-13 | low | visibility | CommunityGroupCreateScreen never states what a group is for or why to make one; the Hub's not-joined hero explains itself in one line, this screen doesn't | `CommunityGroupCreateScreen.js:83-121` |
| A-14 | low | copy | "Handle" is the literal field label at Join and Edit profile (jargon vs. the more familiar "Username"), with no explanation of what it's for until Find People/Search | `CommunityJoinScreen.js:361`; `CommunityEditProfileScreen.js:393` |
| A-15 | low | engineering-adjacent | `COMMUNITY_DIMENSION_MIN_FOR_HUB` is exported and documented as gating what's "advertised" on the Hub, but nothing reads it any more (the Hub now takes its cohorts straight from `community_hub_summary`, which already omits empty ones server-side). Dead code, mention only | `limits.js:44`; `CommunityHubScreen.js:36-40` |
| A-16 | low | copy | Two code comments (never user-facing) still describe Community activity as "programme use", the one surviving trace of the pre-revamp framing after every actual user string was corrected | `ActivityRow.js:5-7`; `categories.js:60` |
| A-17 | informational | — | Every "programme"-framing defect the 2026-09-10 audit found in USER-FACING copy is already fixed at HEAD (intro card, PrivacyReceipt, Rules v3, training-profile defaults, the RootNavigator/AnalyticsScreen stale IA comments) — do not re-fix | `HomeCommunityIntroCard.js:26-29`; `PrivacyReceipt.js:37-43`; `CommunityRulesScreen.js:39-45`; `trainingProfile.js:134-153`; `RootNavigator.js:499-501`; `AnalyticsScreen.js:511-514` |
| A-18 | informational | — | The founder's 2026-09-14 "looks rubbish" defects (stepped edges, wireframe divider, misplaced graph, blob avatars, poster empty states) are fixed at HEAD (CR-17/D163). The residual flat/admin feel, if any, has a different cause — see Q6 | `PersonRow.js`; `CohortRow.js`; `ProgressStrip.js`; `ProfileAvatarMark.js` |

---

## Q1. Doors and visibility

**Is Community a tab?** No. Five bottom tabs exist: HomeTab, PlansTab, DiaryTab, ProgressTab, ProfileTab (`HomeScreen.js:759-763`). Community is a `Stack.Screen` reached only by navigating from inside another tab (`RootNavigator.js:503`).

**Every entry point, file:line, visual, gating:**

| Entry point | File:line | Visual | Shown when | Hidden when |
|---|---|---|---|---|
| Today header glyph | `HomeScreen.js:2276` → `CommunityHeaderAction.js` | 34dp circle, `people-outline`, amber on `surface2`, no text | Always, on the Today root | Never — it's the one constant |
| Header unseen/message badge | `CommunityHeaderAction.js:37-88` | Amber 8dp dot (unseen) or numeric badge capped "9+" (unread messages) | `hasUnseen(me)` / `hasUnreadMessages(me)` true | **Plain circle, nothing else** — no dot, no badge, no colour change when there's nothing to show (`CommunityHeaderAction.js:66-85`) |
| Today one-time intro card | `HomeScreen.js:2726-2731` | `Card`, h3 title "See who is training", body, "Have a look" + "Not now" | `totalSessions > 0 && !communityIntroDismissed && shownBannerKey == null` | Retired for good the moment EITHER button is tapped (`HomeScreen.js:669-672`) — see A-04 |
| You screen row | `YouScreen.js:558-567` | `NavRow`, "Community", sub "Connect with other lifters and share your training progress." | Always on You | Never |
| Settings row | `SettingsScreen.js:150-155` | `SettingRow`, "Community", sub "Who can follow you, blocked and muted people" | Always | Never — but opens **CommunityPrivacy**, not the Hub (A-10) |
| WorkoutSummaryScreen button | `WorkoutSummaryScreen.js:1432-1451` | Secondary `Button`, "Post to Community" / "Add a note" | Any finished, non-read-only workout | Read-only re-open of an old summary |
| WorkoutSummaryScreen share offer | `WorkoutSummaryScreen.js:384-414` | One-line card + "Not now"/"Show them" | Once, after the first-ever workout, profile exists, consistency not already on | Never again once answered (A-07) |
| HomeScreen "Share this block" | `HomeScreen.js:2437-2453` | Tertiary button, `people-outline` | Only in the rare `blockAwaitingDecision` state with a mesocycle id | All other Home states |
| ShareCardScreen button | `ShareCardScreen.js:829-844` | `Button`, "Post to Community" | Whenever a share card has a matching story kind | — |
| Onboarding step 5 | `ProOnboardingScreen.js:2634-2834` | Primary "Join Community" vs. secondary "Skip for now" | Adults only, step 5 of 8 | Under 18 — step does not exist |
| Deep links | `RootNavigator.js:966-975` | — | `community`, `u`, `s`, `m`, `g` | — |

**Taps from app open:**
- **(a) seeing anything Community:** 0 — the header glyph renders on first paint of Today.
- **(b) having a profile:** best case ≈ 2 taps + 1 required text field (tap glyph → tap "Create my profile" → type Name → tap "Create profile"; handle is server-suggested, gym/discipline/visibility/sharing all default). Via onboarding: 1 tap ("Join Community"), but not fulfilled until the wizard finishes (A-06).
- **(c) first follow:** +1 tap on the HOST row's "Follow", entirely conditional on A-02.
- **(d) first post:** not tap-bound — gated behind finishing a real workout or a mesocycle block (A-05); no "compose freely" path exists.

**After the intro card is gone, what tells a user Community exists?** Nothing but the unlabelled header glyph (A-03, A-04). No card, no badge, no mention anywhere else on Today.

**What a much better version does:**
- Give the header glyph a one-word visible label the first several times it's seen (not permanently, to respect the "no card soup" brief), rather than relying on an icon alone.
- Re-offer the intro card (max once more, e.g. after the 5th session) to someone who tapped "Not now" and still has no profile — "Not now" should not be identical to "never ask again" forever.
- Point the Settings "Community" row at the Hub, with the Privacy controls one tap further in (matching what a user actually searches Settings for).

---

## Q2. Onboarding step

Step 5 of 8 ("Your gym"), between Training week (4) and Injuries & limitations (6) — `STEP_LABELS[4] = 'Your gym'` (`ProOnboardingScreen.js:121`). Header: "Where do you train?", sub "Optional: pick your gym and Volyume connects you with the people who train there. Only training facts are ever shared: never your body, your food or your location." (`:2657-2658`). The screen carries TWO questions: the gym (venue / explicit "none" / skip) and, unconditionally below it, a "Your Community profile" group with Handle + Name fields, `PrivacyReceipt`, the four-rules card, and a link to the full rules (`:2717-2776`).

**Visual default:** "Join Community" is `styles.primaryBtn` with a trailing arrow — visually identical in weight and position to every other step's "Continue" — while "Skip for now" is `variant="secondary"` beneath it (`:2779-2811`). Join is the default-looking action, not buried.

**"Join later" (`onboardingJoin.js`):** stores gym + display name (`rememberOnboardingChoice`) for the ordinary Join screen to pre-fill later. Nothing is created.

**Under-18 gate:** the step does not exist for a minor — `skipGymStep` routes step 4 straight to step 6 (`:1291-1292`), and a draft resumed on the gym step for a now-under-18 answer resumes on step 4 instead (`:984-986`).

**Pending-join recovery:** a join that fails at completion (offline, rate-limited, a transient refusal) is queued (`writePendingJoin`) and drained on reconnect, app start, or opening Community, with a 14-day expiry after which it is dropped unsent (`onboardingJoin.js:41,151-174`).

**Is the step doing enough to convert?** The mechanism is well built (pre-filled handle/name, live handle check held rather than raced, PrivacyReceipt and rules visible before the ask). The one real gap:

**Abandonment risk (A-06):** `performCommunityJoin` for a `'join'` answer is only called inside `finish()`, AFTER the plan-generation block, i.e. after step 8 completes (`:2080-2110`, comment: "acted on only now that the profile and the body profile are written"). A person who taps "Join Community" at step 5 and then abandons the wizard at step 6, 7 or 8 — closes the app, gets interrupted, decides to finish "later" — has **no Community profile** despite having tapped the primary-looking button that says so. The draft-resume mechanism (`OB-3`) will replay the choice correctly if and when they RETURN and finish onboarding, but nothing tells them their join is still pending if they never do.

**What a much better version does:**
- Create the profile (or at least queue it) at the moment "Join Community" is tapped on step 5, not at wizard completion — the profile fields needed (handle, name, gym) are all already collected at that point.
- If that's architecturally awkward, surface a one-line reminder later in the app ("You said you wanted to join Community — finish setting up?") for anyone whose `communityJoin === 'join'` never resolved.

---

## Q3. Day zero

Rendered from the code, for a brand-new joined user and a not-yet-joined user, at production's real density (2 profiles, 0 posts):

| Screen | Not-joined | Joined, first-here |
|---|---|---|
| **Hub** | Hero card "Your gym, your people" / "See who is training around you, keep up with friends, give respect." + `PrivacyReceipt`; "Create my profile" / "Browse first" (`CommunityHubScreen.js:589-616`). Browsing: "Not joined yet" + "Create my profile" (`:571-585`) | PEOPLE: `You are the first here from {gym}.` or `You are one of the first here.` (`earlyDays.js` via `firstHereLine`) + "Invite a gym mate"/"Invite a training partner" (`:656-673`). GROUPS: "Make a group with friends to see each other's training weeks." (`:696-698`). HOST row if the founder's account qualifies (`:703-723`). ACTIVITY: "Follow people and their training shows up here." (`:764-768`) |
| **Find People** (six doors) | n/a — screen requires a profile: "Create your profile first" / "Finding people needs a profile of your own, so they can find you back." (`CommunityFindPeopleScreen.js:225-232`) | Each unlocked door's zero line (`findPeople.js:172-184`): gym/area → `No one else lists {X} yet. You are the first here; anyone who adds it will see you.`; partners → `No one else is open to training together yet. Anyone who switches it on will see you.`; like_me/same_discipline/might_know → `No one to show yet. Share your profile link and anyone who joins will find you here.` Locked doors (no gym/no discipline) show the requirement line instead and route to Edit profile |
| **People list** (a door opened) | — | "Nobody here yet" / the same `doorZeroState` text / action "Share your profile link" (`CommunityPeopleListScreen.js:253-264`) |
| **Dimension (cohort page)** | — | Roster mode: "No one else here is sharing yet." + "Invite someone from {gym}" / "Invite a training partner" only on a cohort the reader belongs to (`CommunityDimensionScreen.js:670-686`). Non-roster kind: "Nobody here yet" / "When other people choose this, they appear here." (`:649-656`) |
| **Board** | — | `count > 0` → "{n} people are sharing so far" / "When more people share their consistency, this board fills in."; else "Nobody here yet" / "Share your consistency to appear here." + action to Training profile (`CommunityBoardScreen.js:239-247`) |
| **Activity (inbox)** | — | "Quiet for now" / "Follows, reactions and comments on your posts appear here." (`CommunityActivityScreen.js:262-269`) |
| **Conversations** | — | "No messages yet" / "Messages are between people you are connected with. Connect with someone from Find people first." (`CommunityConversationsScreen.js:130-133`) |
| **Groups** (group page) | — | "No stories yet" / "Nothing here yet from this group's members." (`CommunityGroupScreen.js:365`) — note: this is still a full bordered `EmptyState`, not the one-line treatment Hub/Profile got (A-08) |
| **Profile** (own, no posts) | — | "Your sessions and personal bests show up here once you share them." / another's: "Their sessions and personal bests show up here." / private: "Follow to see their training stories." (`CommunityProfileScreen.js:536-544`) |

**The host row (`earlyDays.js`, `COMMUNITY_HOST_HANDLE`/`COMMUNITY_HOST_USER_ID`):** a real profile, read once per Hub mount by handle, shown directly under PEOPLE with a "Follow" button, hidden the instant the reader IS the host, already follows/has requested, is blocked/muted either way, or the read fails (`CommunityHubScreen.js:217-240`). The code **assumes** this handle resolves to one of the founder's two production profiles and that it stays public and active — **flagged for the lead: this cannot be verified from code, and every brand-new joiner's day-zero experience of "is there anyone here" depends on it** (A-02).

**Verdict on "honest cold start, no simulated members" (D162):** the copy is honest and calibrated (never claims a false population, always gives one concrete action), and that is a real strength versus the fake-social-proof alternative the founder considered and the lead refused. But honesty is not the same as a *reason to stay*: with 0 posts and effectively 1 followable person in production, a joined user who follows the host and finds no activity from them has, today, nothing further to do inside Community until either they or the host post something. The mechanism gives them a door out (invite), never a second attraction in.

**What a much better version does:**
- Treat the HOST mechanism as a founder-operations dependency, not a client feature — the lead should be told explicitly to keep that account active and public (a churned or private host account silently zeroes the entire day-zero funnel).
- Add one visible "what good looks like" example inside the empty states themselves (a static illustrative line, not fabricated data) so a first user understands what will eventually appear, not just that nothing does yet.

---

## Q4. Join friction

Walking `CommunityJoinScreen.js` field by field:

| Field | Required? | Default | Notes |
|---|---|---|---|
| Handle | Yes (for `canCreate`) | Server-suggested via `suggestHandle()` at mount if empty (`:223-232`) | Regex `/^[a-z0-9_]{3,20}$/` (`validation.js:22`); live check debounced 250ms; a check that fails to run ("unknown") still allows Create (`:290-291`) |
| Name | Yes, non-empty | Pre-filled only from a pending join or onboarding choice; otherwise blank | The one field a fresh Hub-originated joiner MUST type |
| Avatar | No | First preset | — |
| Gym | No | `gymStep` starts `'picking'` but nothing blocks Create if ignored | Picker + "Not now"; up to 3 "other gyms"; no location permission ever requested (the finder is text search, not device position) |
| Discipline (up to 3) | No | None selected | Chips, "Optional. Helps people like you find you." |
| Visibility | No | `public` ("Anyone") | Minor: forced followers-only, control hidden, reason shown |
| Training-profile toggles (7 rows) | No | 3 of 7 ON by default: sessions, staple lifts, experience (`trainingProfile.js:134-153`) | "What other people would see" preview line shown before any toggle |

**Minimum taps / text entry to "Your profile is live":** 1 required text field (Name) + 1 tap (Create profile), assuming the suggested handle is accepted and gym/discipline/visibility/sharing defaults are left alone. This is genuinely low friction — **lower** than it looks from the screen's length, because almost everything on it is optional and pre-set.

**Compared with the onboarding-step path:** materially similar minimum (handle + name, same validation), but onboarding additionally shows the gym finder inline with a real "I don't train at a gym" button (clearer than Join's silent-skip), and defers the actual creation to wizard completion (A-06) — a real cost onboarding pays that the direct Join screen does not.

**Failure strings and recovery** (`CommunityJoinScreen.js:75-82`):

| Code | String | Recovery |
|---|---|---|
| offline | "You are offline. Try again when you have a connection." | Retry the same tap |
| handle_taken | "That handle is taken. Try another." | Edit handle |
| handle_invalid | "Use 3 to 20 letters, numbers or underscores." | Edit handle |
| content_not_allowed | "That wording is not allowed here. Try different words." | Edit name/handle |
| rate_limited | "That is a lot of changes for one day. Try again tomorrow." | Wait |
| invalid_input | "Check the handle and name, then try again." | Re-check fields |

**What a much better version does:**
- Nothing structurally — the field/tap count is already close to best-in-class. The one genuine improvement is making optionality visually obvious (e.g. a light "skip this" affordance on the gym block matching onboarding's explicit button, rather than relying on the user to notice nothing is enforced).

---

## Q5. Reason to return

**In-app badges:** `hasUnseen`/`hasUnreadMessages` (from `community_get_me`) drive the header dot/badge (`CommunityHeaderAction.js`) and the Hub's own header glyphs (`CommunityHubScreen.js:489-517`). Working and correctly wired.

**Push notifications — the major gap (A-01).** `notify.js` defines `COMMUNITY_NOTIFY_KINDS` = follow, follow_request, follow_accepted, reaction, comment, connect_request, connect_accepted, message (`:21-30`), each meant to call the `community-notify` edge function client-side right after the action ("the actor tells the server that something happened"). A full-tree search finds exactly **two call sites in the entire app**, both in `CommunityPostScreen.js` (reaction at `:150`, comment at `:173`). Every other trigger point calls the underlying RPC directly with no notify call:
- `FollowButton.js` (used everywhere a follow happens) — no call.
- `CommunityHubScreen.js:437`, `CommunityGroupScreen.js:155`, `CommunityProfileScreen.js:213`, `CommunityDimensionScreen.js:472` — four more `reactToPost` call sites, none notify.
- `messages.js:153` `sendMessage` — no call.
- `connections.js` `respondToConnect`/request flows — no call.

Net effect: a follow, a connect, a message, or a Respect given from the Hub feed, a Dimension page, a Group page or a Profile page (i.e. everywhere except opening a post's own detail screen and tapping Respect/comment there) produces **an in-app activity row and nothing else** — no push. `group_request`/`group_accepted`/`group_invited` have in-app copy (`ActivityRow.js:34-46`, confirmed landed, contradicting the 2026-09-10 recon) but are not in `COMMUNITY_NOTIFY_KINDS` at all, so they can never push either. This is silent (best-effort, swallowed errors), which is exactly why it would never appear in Sentry.

**The ambient share offer (`ambient.js`):** `MAX_AUTO_PRS = 3` per workout; "Share what I did" (`share_sessions`, default OFF) auto-posts a session item plus up to 3 PR items on workout completion, queued offline and flushed on foreground/reconnect (`:121-187`). The ONE in-product offer to turn on sharing ("Show people who follow you which days you trained?") actually enables the lighter "Share my consistency" counter, not "Share what I did" — the fuller toggle needs the Training-profile screen — and it is shown once, ever (A-07).

**"Post this finished block" / other Home surfaces:** the only place Home shows anything of Community life to a user who never opens the glyph is nothing — Home shows no other person's training anywhere; the community intro card explains Community but carries no live content itself.

**If a user never opens the header glyph, will they ever see Community again?** No, other than the one-time intro card (A-04) and, for a joined user, a push — which, per A-01, essentially never fires except for a comment/reaction given from a post's own detail page. This is the single biggest lever available: fixing A-01 alone would give the two production accounts (and every future pair of connected users) an actual reason to reopen the app that exists today only on paper.

**What a much better version does:**
- Wire `notifyCommunityEvent` into `FollowButton.js`, the four missing `reactToPost` call sites, `sendMessage`, and `respondToConnect`/request — this is a client-side, mechanical fix (the server-side gating, category preferences, quiet hours and ED checks all already exist and don't need to change).
- Add `group_request`/`group_accepted`/`group_invited` to `COMMUNITY_NOTIFY_KINDS` and wire their call sites.
- Offer the fuller "Share what I did" toggle a second time later (e.g. after 3 more sessions), not only once.

---

## Q6. Look

The 2026-09-14 founder defects (stepped left edges, the bright wireframe divider, the misaligned 8-week bar chart, blob avatars at small sizes, a bordered "poster" for an empty section) are **fixed at HEAD** (D163/CR-17): `PersonRow.js:85-91,182-185` (single gutter, `borderSubtle` hairline spanning the row), `ProgressStrip.js:22-26,138-157` (bars now a named footer band with a visible 2dp floor), `ProfileAvatarMark.js:45-55` (glyph/badge floors scale with size). This is genuinely well-executed, token-driven, minimal-card design — `<Card` appears only for the not-joined hero and the legacy-partner notice on the Hub, banned elsewhere (`community.presentation.guard.test.js`); every row is a flat `borderSubtle`-divided line.

**What is left that could still read as flat or admin-like:**
- **Type scale is compressed to five sizes, and four of them are tiny.** `theme.js:576-636`: `caption`/`overline` = 11px, `label`/`bodySm` = 13px, `body`/`bodyStrong` = 16px, `h3` = 20px (the only larger size, reserved for the not-joined hero alone, `community.presentation.guard.test.js` rule (a)). Names (`bodyStrong`, 16px) are the single "loud" element on any row; every count, day-dot, caption and figure sits at 11-13px. This is a deliberate, coherent system (blueprint rule 1), but the practical effect is that a feed of real training (sessions, PRs, streaks) reads no louder than its own metadata — nothing on screen is allowed to feel like an achievement.
- **Colour is reserved to a narrow, correct set** (trained-today ring, given-Respect glyph, PR mark, selected chip, three emphatic buttons — `rows.amber.guard.test.js`), which is right for discipline but means everything else — which is nearly everything — is `textPrimary`/`textSecondary`/`textMuted` grey. Avatar presets do carry six distinct tones (`profileAvatarPresets.js:1-8`: amber, macroFat, success-green, macroCarb, warning, error), so avatars are not monochrome, but they are abstract icons (barbell, body, calendar, trending-up, flash, pulse), never a photo (A-12) — the one place a genuinely "alive" social visual (a real face) could exist is closed by an earlier, separate founder ruling (D160 item 3, no image-moderation dependency), not by this campaign.
- **A-08:** the presentation law's rule 9 (one line, one action for a section-level empty) is live on the Hub and Profile but not on `CommunityGroupScreen.js`, whose own group-feed empty state is still a full bordered `EmptyState`.
- **Density is genuinely low** — one metric per row, one accent per screen state, no imagery — which is the RIGHT read against "card soup" and "gold hairlines", but it also means a feed with only 1-2 people in it (today's reality) has very little to visually anchor on: no photo, no colour variety beyond the icon tone, no size variation beyond the name. The flatness that is a virtue at scale reads as bareness at N=2.

**What a much better version does (within the founder's stated taste, not a redesign):**
- Apply rule 9 to `CommunityGroupScreen.js`'s own empty state, closing the one place the presentation law is still unevenly applied.
- Let ONE figure per key screen (the You row's streak, a cohort's "N trained today") take a size step up from `label`/`bodySm` — not a new `h1`/`h2` (banned by rule (a)), but reusing the existing `title` (17px) role nowhere currently used in Community, so a real number gets to read as a result rather than metadata, without adding a new type size or breaking the guard.

---

## Q7. Copy

**Worst 15 (or worst-available), each with a one-line replacement:**

| # | File:line | String (trimmed) | Issue | One-line replacement |
|---|---|---|---|---|
| 1 | `CommunityTrainingProfileScreen.js:86` | `'Age band'` | Jargon; same field is "age group" elsewhere | "Age group" |
| 2 | `CommunityJoinScreen.js:361` | `label="Handle"` | Jargon, unexplained until Find People | "Username" |
| 3 | `CommunityGroupCreateScreen.js` (no purpose line) | *(absent)* | Doesn't say why to make a group | Add one `bodySm` line under the header: "See your friends' training and encourage them." |
| 4 | `SettingsScreen.js:152-153` | `label="Community" sub="Who can follow you, blocked and muted people"` | The row's sub-text describes Privacy, not Community, so it reads correct but the destination surprises | Either rename the row "Community privacy" or route it to the Hub |
| 5 | `CommunityRulesScreen.js:104-117` (reporting/moderator sections) | Two consecutive dense paragraphs on reporting mechanics and moderator powers | Long, read only once at Join and rarely again | Keep as-is on Rules (it's the right PLACE for detail) but never duplicate it elsewhere — currently it isn't (good) |
| 6 | `CommunityBoardScreen.js:241` | `` `${count} ${count === 1 ? 'person is' : 'people are'} sharing so far` `` | Slightly clinical ("sharing so far") for what is really "these are the people training" | "N people training so far" |
| 7 | `CommunityDimensionScreen.js:551` | `'Share your age group in your training profile to see people your age.'` | Correct and clear — no fix needed; listed to contrast with #1's inconsistent term |
| 8 | `ActivityRow.js:5-7` (comment only) | `"a follow, reaction, comment and programme use"` | Stale internal comment, not user-facing, but the last trace of retired framing | Update the comment on next touch |
| 9 | `categories.js:60` (comment only) | `"comment / programme use"` | Same | Update the comment on next touch |
| 10 | `CommunityHubScreen.js:696-698` | `'Make a group with friends to see each other's training weeks.'` | Good — plain, says why | No fix needed |
| 11 | `HomeCommunityIntroCard.js:26,29` | `'See who is training'` / `'Connect with people at your gym and your friends, see each other's training weeks, and give respect.'` | Good — matches the founder's own definition verbatim | No fix needed |
| 12 | `PrivacyReceipt.js:53` | `'Nothing about your body, food or coaching is ever shared.'` | Good, calm, one line | No fix needed |
| 13 | `CommunityActivityScreen.js:264-266` | `'Quiet for now'` / `'Follows, reactions and comments on your posts appear here.'` | Good | No fix needed |
| 14 | `CommunityGroupScreen.js:365` | `'No stories yet'` / `'Nothing here yet from this group's members.'` | Fine in tone but presented as a heavy card, not a line (A-08) — the fix is visual, not textual | — |
| 15 | `CommunityComposeScreen.js:235` | `'Say something about the training, if you want to.'` | Good, non-demanding placeholder | No fix needed |

**Length/repetition:** no paragraph-length explanation is duplicated across screens any more — the definition appears once (intro card) and is echoed once, shorter, on the Hub hero; the Rules screen carries the one place detail belongs and nothing repeats it. This is a genuine improvement versus the 2026-09-10 audit's finding of the same explanation on Hub/Join/Rules/Privacy.

**Jargon:** "cohort" and "dimension" are internal/code vocabulary only — never rendered to a user (verified: no literal string containing either word appears in any Community screen or component; `CommunityBoardScreen.js:96`'s fallback label `'This cohort'` is the one exception, reachable only on a malformed deep link, not in normal use). "Bands" never appears as the word "band" except the one "Age band" row label (#1). "Handle" does (#2).

**Tone:** calm, plain, no shame, no em dash found in any Community string read for this audit; matches `COACHING_VOICE_SYNTHESIS_LOCKED.md`.

**Does the copy tell the user WHY to join?** Yes, on the two surfaces that matter most (intro card, Hub hero) — both lead with the founder's own definition. It does NOT on group creation (#3) or on the training-profile sharing toggles' own row labels (the "why" lives only in the once-only workout-summary offer, A-07).

**Pinned by `community.copy.guard.test.js`:** no string literal anywhere in `src/screens/Community*.js`, `src/components/community/*.js` or `HomeCommunityIntroCard.js` may contain "programme" (case-insensitive); `HomeCommunityIntroCard.js` must contain a string matching `/give respect/i`; `CommunityRulesScreen.js` must contain a string matching `/connect with people at your gym/i`; `COMMUNITY_RULES_VERSION` must be ≥ 3. None of the 15 items above touch any of these pins.

---

## Q8. Competitive bar (from own knowledge)

- **Strava:** kudos is one tap from the feed itself, never from a detail screen — exactly the wiring gap A-01 describes Volyume missing. Segments/leaderboards are refused by Volyume on ED grounds (correct call, matches SD rulings).
- **Hevy/Strong:** routine/workout sharing is public-by-default with a real public profile page reachable with zero login (non-user preview) — Volyume's share pages exist (`/u`, `/s`, `/g`) but carry no comparable "browse without an account" density.
- **Fitbod:** almost no social surface at all — not a bar to clear here.
- **Peloton:** the "leaderboard" and high-five mechanic is engagement-through-competition, deliberately NOT the model Volyume chose (cooperative, non-ranked) — correct divergence, not a gap.
- **Common thread Volyume still lacks:** every one of these apps' social loop is triggered automatically by the ACT of training (a workout auto-posts, a kudos is one tap with a push guaranteed) — Volyume's mechanism is built for this (ambient posting exists) but the push half of the loop (A-01) is not actually connected, which is the single largest gap versus all four competitors at once.
- Day-zero: none of the four solve "zero other users" any better than Volyume's honest empty states do; Volyume's refusal of fake social proof (D162) is defensible and, if anything, ahead of the category's norm on trust.

---

## Guards that pin current behaviour

| Guard | Pins relevant to this lane |
|---|---|
| `src/__tests__/community.copy.guard.test.js` | No "programme" string literal in Community screens/components/intro card; the intro card's "give respect" line; the Rules screen's opening definition; `COMMUNITY_RULES_VERSION ≥ 3` |
| `src/__tests__/community.layout.guard.test.js` | Single gutter paid once by the page; `borderSubtle` divider spanning the row; the own-row tint bleed; the 8-week bar footer band; avatar mark floors scaling; the Community-specific skeleton shape; section-empty-is-one-line |
| `src/__tests__/community.presentation.guard.test.js` | No `type.display`/`h1`/`h2` in Community screens, `h3` only on the Hub hero; `<Card` capped at 2 on the Hub, banned on Dimension/Group/Profile; `SectionLabel` retired from the four revamped screens (any copy/look change to those four screens' section headers must keep using `Eyebrow`) |
| `src/__tests__/community.earlyDays.guard.test.js` | The `/g` app-link plumbing on both platforms; the host read from one constant; no store-link placeholder; the honest zero-state wording sourced from shared helpers, not re-typed per screen |
| `src/__tests__/community.ambient.guard.test.js` | No auto item under a closed ED/calm gate or with sharing off; a minor's auto item never beyond followers; `client_ref` on every auto post; at most 3 PR items per workout; the once-only workout-summary offer |
| `src/screens/__tests__/ProOnboardingScreen.communityStep.guard.test.js` | Step 5 position and count; neither `gymChoice` nor `communityJoin` may default (must start null); the join must not run before the plan block or after the draft clears; a minor can never reach the step; British English, no em dash |

Any proposal that (1) reintroduces a bigger heading or a `Card` on a revamped screen, (2) changes the intro card's or Rules screen's pinned strings, (3) changes when/whether the onboarding join runs, or (4) touches the ambient auto-post gating, must re-anchor the matching guard above as part of the same change.

---

## Questions for the lead

1. **A-01 (push wiring) is the single highest-leverage fix found in this lane.** It is a client-side call-site fix (add `notifyCommunityEvent` calls), touches no schema, and the server-side gating/budget/quiet-hours machinery already exists and needs no change. Is this in Lane A's remit to hand over as a ready-to-build item, or does it belong to Lane B (it sits exactly on the visibility/functionality boundary: the mechanism is "backend", the absence of it is "why nobody comes back")?
2. **A-02 (the HOST account is a single point of failure for day-zero):** the code assumes `COMMUNITY_HOST_HANDLE`/`COMMUNITY_HOST_USER_ID` resolve to a real, public, active founder profile. This cannot be verified from code or from the production counts given. Can the lead confirm that account's current visibility/activity, since the entire new-joiner "first follow" experience depends on it?
3. **A-06 (onboarding join deferred to wizard completion):** is moving `performCommunityJoin` to fire at step 5 (rather than at `finish()`) an acceptable product change, or is there a reason (e.g. keeping account creation atomic with the rest of onboarding) that this was deliberately deferred, that Lane A's read of the code did not surface?
4. Two of the "worst 15" copy items (#3 group-create purpose line, #4 Settings row destination) are one-line, low-risk copy/routing changes with no pinned test blocking them — should these be queued as immediate small fixes rather than founder decisions?
