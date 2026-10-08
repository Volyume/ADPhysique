# Community level-up: proposals and options for the founder

Date: 2026-10-08. Author: the lead (main loop). Status: PROPOSAL, nothing built. Founder order, verbatim: "build a complete picture of the community ... investigate all other similar communities ... What do they have that we don't that brings value ... ensure our app works perfectly for end users, it's easily understandable, intuitive, flows perfectly ... a serious improvement of the look, feel and design in line with the best loggers out there but also in our own theme ... bring me proposals and options before going to work ... It needs to be better than all competitors." Added the same day: "Look at sizes of areas boxes, graphs, texts, and everything. At the moment its seeming very unstructured and groups, age groups feeds are all lumped together, no filtering if any sort either."

Sources (all in this folder, each with file:line evidence): `01-current-picture.md` (the feature at HEAD), `02-competitors.md` (15 apps), `03-flow-audit.md` (13 journeys, 26 lost moments, IA options), `04-look-and-feel-audit.md` (scorecard, size census, visual law, three directions). Bounds that stay binding whatever is chosen: every Section 2 inviolable in CLAUDE.md (ED-safety withholds and floors, Article 9, EU residency, no AI, no new dependency without a yes), D162 (no simulated members), D212 (minors' sharing off by default), the Community rules v3.

## 1. What the audits agree on (the diagnosis)

1. **Community is complete as a facility set and thin as an experience.** Every facility a top app has is present in some form (feed, follow, connect, messages, groups, gyms, cohorts, boards, moderation, push), but the Hub stacks them in one list with the feed last, no scope, filter or sort, and the same 64 dp row for a place, a person and a post (01 section 8; 03 section 0; 04 section 8.1). This is the founder's "lumped together" reading, confirmed in code.
2. **Twenty-six lost moments**, three of them blockers: no structure on the Hub; no way to write a post once the feed has content (the only "Say hello" door lives in two empty states); Respect fails silently off the post screen (03 section a). High: rules shown below the Join button; audience copy that is untrue in three places; Find people offers Connect where the Hub says Follow; restricted people see "try again"; pushes land on the inbox instead of the item; Close and Leave group have no confirmation.
3. **Three visual grammars in one app**: cards on Today, Train and Nutrition; near-black full-bleed bands in the rebuilt logger (D220); flat eyebrow rows on four Community screens and card forms on eleven others, with the feed row and the post detail drawn differently for the same post (04 sections 0 and 1). Sizes are unruled: the section heading is the smallest type on the screen, the feed's achievement figures are 13 dp muted, reaction targets are below 48 dp, five amber header controls at 34 dp, nine screens show the wrong skeleton, and the D188 transition is not in the code (04 sections 0, 8.4).
4. **Competitors win on four things, none of them a facility we lack**: the feed is the landing content, not the last section (Hevy, Strava); the post leads with the achievement in big figures (Strava card, Hevy); groups are anchored to a shared object with chat and a session count (WHOOP, Ladder, Caliber); and recognition is for consistency, not strength or weight (Strava streaks, Peloton milestones) (02 sections 2b, 2d). What they have that we do not and that fits our constraints: feed scopes and sort, a presence strip ("friends training now"), group chat, session-count challenges, a per-field privacy panel, and a compose entry that is always there. What we must not copy: photo voting, weigh-in or calorie challenges, physiological rankings, a forced social default tab, AI tooling (02 section 3).

## 2. The three decisions the founder owns

### Decision 1. Structure: where Community lives and how the Hub is partitioned

Every option below partitions the Hub into Feed, People, Groups and You, lands on the feed, gives the feed scope chips (Following, My gym, My groups, Everyone) and a sort (Newest, Most respected), keeps cohort pages (gym, discipline, age group, area) inside People under their own sub-headers with the age group demoted from a destination to a filter, and adds a compose button that is always present. The options differ in where that lives.

| | A. Community becomes the sixth bottom tab | B. Segmented Hub in the Today stack (as now, re-sectioned) | C. Short Community home with Feed, People, Groups as their own screens |
|---|---|---|---|
| What the person sees | A "Community" tab beside Today, Train, Nutrition, Progress, Coach; opens on the feed; segment bar Feed / People / Groups / You under the title; badge on the tab for requests and messages | Today keeps its pill and row; the Hub opens on the feed with sticky segments; You is the avatar button | The Hub is a short page: your week, three large entries with counts, requests and messages; each entry opens a single-purpose screen |
| Fixes the complaint | Structurally impossible to lump: each segment owns its controls | Yes, on the same screen | Yes, each screen owns its controls |
| Depth and Back | Community has its own root; Back always returns inside Community; cross-tab Back is no longer a surprise | Stays two taps from Today, tab bar still highlights Today inside Community (A-03 stands) | Adds a level (Home > Feed) |
| Build size | Largest: `RootNavigator` (24 registrations, deep links, notification routes), tab bar layout at six items, every entry point repointed | Smallest: one screen rebuilt, rows reused | Medium: three new screens, entries repointed |
| Risk | A sixth tab is tight on narrow phones; the tab bar needs a layout review; Hevy's documented complaint is about a forced social DEFAULT, so Today must stay the default tab | Reverses the 2026-09-10 "no segment" ruling (recorded as superseded by the founder's 2026-10-08 words) | Feed becomes a destination, which lowers casual reading; the opposite of "part of the logger" |
| Competitor fit | Hevy, Strava, JEFIT, Peloton all give social a tab | Boostcamp-like (social behind an entry) | No direct peer |

**Lead's view (D33 criterion, the best product, not effort):** A. A level-up that is "better than all competitors" needs Community to be a first-class place with its own root, and every top app gives it one. The cost is real (tab bar at six, navigator work) and is stated above, not hidden. Today stays the default tab; nobody is forced into the feed. B is the honest fallback if the founder does not want a sixth tab; C is not recommended.

### Decision 2. Look: which visual direction

All three directions adopt the size system in 04 section 8.5 (56 dp section headers that read as structure, 64 dp rows, post rows 88 dp and up with the achievement in `num('bodyStrong')`, 48 dp targets, avatars 24 / 32 or 36 / 56 only, charts in bands not cards, 8 dp day dots), the one post anatomy for feed and detail (identity line with time, achievement line, stats line, note, reaction bar), header glyphs in text colour with amber only on the dot and badge, three header controls at most, true-shape skeletons on every screen, and the origin-aware transition D188 ruled.

| | D1. The logger's grammar carried over | D2. Warmer social cards | D3. Hybrid (recommended by the auditor) |
|---|---|---|---|
| Page | Near-black page, full-bleed `surface` bands with 10 dp gaps, wells for inputs, one amber accent, dense rows | Post cards with `radius.lg`, 40 dp avatars, hero figure, reaction chips; matches Today and Train | Band structure for every list and page; inside the feed band the post keeps a larger social anatomy (36 dp avatar, time top right, achievement lead line, quiet 48 dp reaction glyphs); forms keep cards only where an object is shown (a gym) |
| Feels like | The logger: one product from the session sheet to the feed | A social app inside a training app | The logger's structure with a feed that reads as people, not settings |
| Risk | Bands on a social feed can feel heavy and "settings-like" (INFERRED); reverses D163's one-gutter rule, guards re-pinned as D220 did | Close to what the founder rejected on 2026-09-14 ("looks rubbish"); halves feed density (about 170 dp per post against 90); nested-container breaches | Smallest blast radius of the band directions; needs a device walk at x1.2 text |

**Lead's view:** D3. It takes the near-black band structure the founder chose for the logger (D220) so the app reads as one product, and keeps the feed warm enough to read as people. Wireframes for all three are in 04 sections 5 and 8.6.

### Decision 3. Scope: what the level-up includes

Three packages, each a campaign stage with its own device walk. The lead's view is all three, in order, under the "do more work, always" rule; the founder may cut.

**Package 1, structure and flow (fixes every blocker and high).** The chosen structure from Decision 1; feed scopes and sort; the compose button (note or session) on Feed and Profile; optimistic Respect with revert and a calm toast everywhere; rules above the Join button; one truthful audience sentence everywhere (the three untrue strings corrected); Follow as the primary row action with Connect explained; restricted and suspended states mapped to a calm line; pushes routed to the post or group; Close and Leave confirmed; Invite visible after creating a group and open groups browsable; the Today row for people following nobody says "Find people to follow"; the 16 medium and low items in 03 section a; the terminology census (one word for a post, Respect named, Connect and Follow explained once); dead code retired (`DimensionRow`, `GymWeekBoard`, the dead exports, stale comments, programme remnants). Server: a migration for gym- and group-scoped feed reads and the sort (applied only under the founder's exact phrase).

**Package 2, look.** The chosen direction from Decision 2 applied to all 24 screens and 39 components under one written Community visual law (04 section 3, finalised by the lead), the size system, the single post anatomy, header rationing, skeletons, D188 transitions, the accessibility fixes (header roles, 48 dp targets, x1.2 text), guards re-pinned, a device checklist.

**Package 3, value (what the best apps have and we can hold within our rules).**
- 3a. Presence strip, "Training now" and "Trained today", opt-in per person, withheld under calm mode or an open ED flag, never a count of calories or weight (Peloton Here Now, 02 pattern 8). Needs a migration (a heartbeat column with a short TTL, own-row RLS).
- 3b. Group chat anchored to the group, with the group's week (sessions logged by members, never load or weight) at the top (WHOOP, Ladder, 02 pattern 3). Needs a migration and an extension of `community-notify`.
- 3c. Session-count challenges inside a group: fixed start, counts sessions logged, no weight, no calories, no bodyweight, withheld under calm mode (Gymshark66 mechanics without the hashtag, 02 pattern 9). Needs a migration.
- 3d. Consistency recognition: monthly milestone post when a person's own session count passes a round number, and a "weeks in a row" mark on the profile; sessions only (Strava streaks, Peloton milestones, 02 pattern 4). Milestone posts already exist (01 section 2.3); this extends them.
- 3e. One privacy panel: every sharing switch (sessions, consistency, gym and place, age group, who can follow and message) on the Privacy screen with its live state, replacing the three-taps-deep switch (Tonal, 02 pattern 5). Client only.
- 3f. Per-person, per-post and per-group link previews on the public pages, replacing the generic ones (01 section 8.1.7). Edge function change only.

Not proposed, for the record: plan or programme sharing (Hevy's strongest growth loop, 02 pattern 6) was RETIRED by founder order CR-01 and is not re-proposed here; if the founder wants it re-opened that is a separate question (Q6 below). Leaderboards on lifts (02 pattern 11): the existing boards already rank sessions and consistency, never lifts, and the lead keeps it that way under the ED-safety mandate. Seeded groups (02 pattern 13): refused under D162 unless the groups are honestly editorial, founder-run and named as such.

## 3. Sequencing and cost

Order: Package 1 (with the Decision 1 structure), device walk; Package 2 (Decision 2 direction), device walk; Package 3 items in the order chosen, device walk after 3b. Each package lands as small commits merged to main as they go green; migrations are written, acceptance-tested on the harness and held for the founder's phrase. Build lanes per D185: Sonnet for the screen and component work against the lead's spec, Haiku for mechanical passes (terminology census, dead code, skeleton swaps, comment fixes), Opus only for the hostile review of each package and of any migration. The lead writes the spec and the visual law, reviews every diff, and keeps every safety-adjacent hunk (the calm and ED withholds, the minors default, the push gates) hands-on.

Rough size, honest: Package 1 is about the size of the logger rebuild's stages A to C; Package 2 about its stage D plus the forms; Package 3 about one logger stage per item. No build is triggered by Claude; the founder runs builds.

## 4. Questions for the founder (also delivered in chat)

Q1 Structure: A sixth tab / B segmented Hub / C short home. Lead's view A.
Q2 Look: D1 logger bands / D2 cards / D3 hybrid. Lead's view D3.
Q3 Scope: all three packages in order / 1 and 2 now, 3 later / 1 only. Lead's view all three.
Q4 Package 3 items to include: 3a presence, 3b group chat, 3c session challenges, 3d recognition, 3e privacy panel, 3f link previews (multi-select). Lead's view all six.
Q5 Migrations: the feed scopes, presence, group chat and challenges each need a cloud migration, written now and applied only on "run against production". Confirm that is acceptable.
Q6 Plan sharing: keep retired (CR-01) or re-open as its own question later.
