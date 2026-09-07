# 52 Research: how compact/elite apps present community activity, progress and rankings

Read-only research agent. Founder brief (chat, 2026-09-07): the current
Community display "looks very stacked and not very compact or elite at
all... poor in comparison to other areas of the app and in comparison to
other apps. We need this to look like the best community feature in the
market." Grounded against `docs/social-discovery-2026-09-06/
81-VISUAL-RULINGS.md` (V1-V20, the current Community visual language) and
`80-VISUAL-INVENTORY.md` (Volyume's shared components: Card, Chip,
SectionLabel, ProfileAvatarMark, BackHeader) and `docs/rules/styling.md`
(theme tokens: spacing, radius, type scale). Access date for all web
sources: 2026-09-07. Search-only research (no screenshot capture tool
available in this environment) — findings are synthesised from official
docs, support articles, UX case studies and design write-ups, not from
directly viewed images; flagged as such throughout.

---

## PART A — Surface-by-surface findings

### A1. Strava — club leaderboard table + activity feed + athlete stats strip

**Leaderboard.** Strava's club leaderboard is a ranked, single-column list:
rank number, member (avatar + name), a right-aligned metric column
(distance or time depending on club sport type), with a weekly/all-time
selector at the top. On web the top 100 show; on mobile the top 10 show by
default with the viewer's own row pinned/highlighted even when they are
outside the visible top set. Single-sport clubs rank by distance,
multisport clubs by total time — the ranking metric is decided once per
club, not per row, keeping every row's right-hand value directly
comparable (no mixed units). This is the archetype "single metric,
right-aligned, one line per person" table — the opposite of a stacked
card feed. Maps to Volyume: a `Card padding="none"` wrapper holding
plain rows (ActivityRow/ConnectRequestRow idiom per V18) with
`borderSubtle` hairline dividers between rows rather than a `Card` per
row — this is exactly what V18 already specifies (rows "sit on `Card
padding='md' radius='md'`" as a group container, not one card each).
[Clubs on Strava, Strava Help Centre](https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava), unverified detail on exact row height/type sizes (no official spec page found).

**Activity feed card anatomy.** Not directly documented in the sources
surfaced; general knowledge (unverified from search, flagged) is header
row (avatar, name, activity type icon, relative time), a stat strip
(distance/pace/elevation as three compact columns, not paragraphs), then
kudos/comment counts as icon+count pressables at the foot — structurally
close to Volyume's V11 PostCard ruling (avatar 32, name bodyStrong,
fact block, footer glyph+count, no Button). No new information found
that contradicts or extends V11; treat V11 as already aligned with the
category norm.

**Athlete profile stats strip.** Not confirmed by a citable source in
this pass; skipped rather than asserted. UNVERIFIED — no citation found.

### A2. Duolingo — league list (rank, avatar, name, XP; promotion zones)

A league is a weekly leaderboard of 30 people ranked by 7-day XP, ties
broken by earliest completion time. The promotion zone (highlighted,
commonly in a status colour) covers up to ~20 spots in early leagues,
narrowing to ~10 in later leagues; the demotion zone is the bottom
~5 rows. [Duolingo Leagues guide, duoplanet.com](https://duoplanet.com/duolingo-leagues-the-essential-guide-everything-you-need-to-know/); [League, Duolingo Wiki/Fandom](https://duolingo.fandom.com/wiki/League); [Duolingo Leagues, deconstructoroffun.com](https://duolingo.deconstructoroffun.com/mechanics/leagues).
Design-relevant facts: (1) it is a dedicated tab, not a buried sub-screen
— "prime real estate alongside the lesson path itself" — signalling that
ranking is core, not decorative, in apps that do it well
[deconstructoroffun.com, ibid.]; (2) rows are one flat ranked list, not
grouped cards, with promotion/demotion bands as a background-colour zone
across a contiguous row range rather than per-row badges; (3) ties are
broken deterministically and invisibly (completion time), never shown as
a visual tie-marker. Maps to Volyume: a plain `Chip`-selected time-window
control (already V6-mandated as Chip row, never SegmentedControl) above
a single flat list; a zone highlight would be a `surface2` band behind a
contiguous row range, never a per-row Card — consistent with V18's
divider-row model, not stacking.

### A3. Whoop — Teams (compact rank rows, customisable windows)

Whoop's team leaderboards let members compare strain, recovery and sleep
"across longer, customised periods of time" with daily/weekly/monthly
view switching across three pillars. [WHOOP Team Averages, support.whoop.com](https://support.whoop.com/hc/en-us/articles/360044455174-WHOOP-Team-Averages); [Join and Create Teams, whoop.com](https://www.whoop.com/us/en/thelocker/join-create-teams-on-whoop/).
No official screenshot-level row anatomy (avatar size, sparkline
presence) was found in this pass — the "sparkline per row" claim from the
brief is UNVERIFIED against primary Whoop sources; flagging rather than
asserting. What is confirmed is the *pattern* of pillar-switching (strain
/ recovery / sleep) plus period-switching (day/week/month) as two
independent selector rows above one flat table — a control shape Volyume
should read as "two chip rows, never two segmented controls," matching
V6.

### A4. Hevy — profile stats row, workout card, streak chip

**Streak.** Top-left of the Home feed shows the active streak — consecutive
weeks with at least one logged session — displayed as an ordinal number
the moment the first session of the week completes. [Track Your Workout
Consistency, help.hevyapp.com](https://help.hevyapp.com/hc/en-us/articles/35380117933207-Track-Your-Workout-Consistency-with-the-Calendar-and-Streak-Features); [Gym Consistency & Streak, hevyapp.com](https://www.hevyapp.com/features/gym-consistency/).
This is a single compact numeric badge, not a card — the opposite of
"stacked." Maps to Volyume: a small `Chip`-style badge (non-selectable,
decorative variant) beside the Hub header, not a `Card`.

**Feed card.** Hevy's Home tab feed shows sessions with name, optional
description, then "an overview of some stats (duration, training volume,
PR count)" as a compact strip, with like count and a comment affordance
below. [Hevy Social Features, hevyapp.com](https://www.hevyapp.com/features/social-features/).
Confirms the same anatomy as A1's activity card and Volyume's V11:
header, compact fact strip (not prose), footer reactions.

**Profile stats.** "At the top of the Statistics section, Hevy displays
your workout activity in the last seven days and a body diagram of the
muscles you've trained." [User Profiles, hevyapp.com](https://www.hevyapp.com/features/user-profiles/).
A single horizontal 7-day strip precedes any list — a pattern for
Volyume's proposed profile progress strip (D2 below).

### A5. Apple Fitness — activity sharing rows + two-person competition bars

Sharing shows a scrollable friends list; tapping a friend expands their
day's three Activity rings and workouts. [Share your activity, Apple
Support](https://support.apple.com/guide/watch/share-your-activity-apd68a69f5c7/watchos); [How to set up Activity Sharing, iMore](https://www.imore.com/activity-sharing).
Competitions are strictly 1:1 (one other Apple Watch owner per
competition), run 7 days, and award up to 600 points/day for ring
percentage closed — visualised as two comparable point totals (source
material describes points and duration but the search pass did not
surface an image-level description of the bar chrome itself, so "two
bars, one per person, on a shared axis" is treated as the well-known
default and flagged UNVERIFIED at the pixel level).
[Competitions with 2+ people, Apple Community discussion](https://discussions.apple.com/thread/253376344); [Multiple Watch/Fit/Fitbit users can compete, howtogeek.com](https://www.howtogeek.com/multiple-apple-watch-google-fit-and-fitbit-users-can-compete-on-activity-heres-how/).
Design-relevant fact: competitions are capped at two participants by
platform design, which is precisely why the artefact is a single
side-by-side bar, not a ranked list — a different shape from Strava/
Duolingo's N-person tables. Maps to Volyume only if a 1:1 head-to-head
surface is ever built; not directly applicable to the four surfaces
below, but worth naming: two-bar comparisons stay flat and inline, never
two stacked cards.

### A6. Garmin Connect — challenge/leaderboard cards

Challenges are individual head-to-head rankings; a challenge with no sync
in >24h is hidden from the leaderboard entirely rather than shown stale,
to prevent sandbagging. [Project Spotlight: Challenges, Medium/Chris
Pearson](https://medium.com/@pancakefeed/project-spotlight-challenges-475af405b055); [Garmin Groups/Leaderboard forum thread](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/351215/garmin-groups-bug-social-media-interface-challanges-and-leaderboard-use).
The redesign case study on the Connect app broadly (not leaderboard-
specific) is discussed at [UX/UI Case Study: Redesigning Garmin Connect,
Sara Vegazo/Medium](https://medium.com/@s.vegazosancho/ux-ui-case-study-redesigning-garmin-connect-app-62a52b154d95)
— no leaderboard row-anatomy detail extracted; UNVERIFIED beyond the
sync-staleness rule. Design-relevant fact for Volyume: a stale/no-data
member is not shown ranked-but-greyed — it is removed from the ranked
view, which keeps the visible list 100% comparable and avoids a "half
the rows look broken" read. This maps to a gym-board empty/partial state
rule rather than a row style.

### A7. Peloton — "Here Now" leaderboard + class rail

Two leaderboards exist per class: "Overall" (everyone who ever took it)
and "Here Now" (only members currently in the class), switchable, with
Here Now continuously shrinking as people finish. [Update to Here Now
Leaderboard, pelobuddy.com](https://www.pelobuddy.com/here-now-leaderboard-bug-feature/); [Understanding the Peloton Leaderboard, theclipout.com](https://theclipout.com/how-does-the-peloton-leaderboard-work/); [Peloton Leaderboard Explained, cyclingwing.com](https://cyclingwing.com/peloton-leaderboard-explained/).
The pattern relevant to Volyume: a live, time-scoped filter ("who's
active right now") as a first-class second view beside the persistent
one — directly maps to a proposed "this week at my gym" surface (D2
below), where "here now" becomes "trained today/this week at [gym]"
rather than a session-concurrent leaderboard (Volyume has no live
concurrent-session concept, so the mechanic transfers as a time-window
chip, not a real-time rail).

### A8. Oura Circles — small-group sharing, no explicit ranking

Circles cap at 20 people, up to 10 joined at once; members opt into
sharing sleep/activity/readiness over a rolling 2-week window (daily or
weekly grain) and respond to each other's data with one of five emoji
reactions — no numeric ranking or leaderboard at all. [Introducing Oura
Circles, ouraring.com/blog](https://ouraring.com/blog/introducing-oura-circles/); [Oura Circles, support.ouraring.com](https://support.ouraring.com/hc/en-us/articles/15958088640147-Oura-Circles); [Oura Circles lets you share sleep/readiness, wareable.com](https://www.wareable.com/wearable-tech/oura-circles-launches-share-sleep).
Relevant negative case: not every "compact community" surface needs a
rank number — a small trusted group can be presented as a flat list of
people with one glanceable score each and a lightweight reaction, no
medal/position logic. This is the closest precedent for a small-gym
board where <10 members are visible (see D14 empty/small-group state
below) and maps to Volyume's existing `ConnectRequestRow`/`ProfileCard`
idiom rather than inventing rank chrome for a 3-person gym.

### A9. Duolingo/Whoop/Strava cross-cutting: window switching mechanism

Across A1-A3, the time-window selector (weekly/all-time on Strava,
weekly-only on Duolingo leagues, day/week/month on Whoop) is consistently
a small control ABOVE a single flat list, never a per-row toggle and
never a full-screen tab switch. This is corroborated across three
independent sources (A1, A2, A3 citations above) and directly supported
by Volyume's own V6 ruling (pick-one controls are always a `Chip` row,
never `SegmentedControl`, in Community).

### A10. General leaderboard UI-pattern literature

A UI-pattern library on leaderboards (ui-patterns.com) and community
design roundups on Mobbin/Figma/Pinterest were surfed; the one
substantive design guidance that resolved to specific text (rather than
a gallery link) recommends: default to weekly/daily windows over
all-time (all-time "becomes too stagnant"); always show the viewer's own
row plus immediate neighbours even off-screen ("who is immediately above
and below them"); and keep the list continuously live rather than
stale. [Leaderboard design pattern, ui-patterns.com](https://ui-patterns.com/patterns/leaderboard); gallery-only, no extractable text: [Leaderboard UI Design Inspiration, Mobbin](https://mobbin.com/explore/mobile/screens/leaderboard); [Leaderboard App UI Kit, Figma Community](https://www.figma.com/community/file/1570449329933245251/leaderboard-app-ui-kit-mobile-design-figma-freebie).
One source's specific recommendation ("each row should feel like a
player card... game HUD... light bevel") is a gaming/gamification-genre
convention, NOT a fitness-app or "compact/elite" convention — flagged
explicitly because it argues the opposite of what the founder wants,
and every fitness-specific precedent found (Strava, Duolingo, Hevy,
Whoop) instead uses flat single-column rows with hairline dividers, not
per-row cards with bevel/shadow. This single divergent citation is
called out so it is not silently absorbed into the pattern table below.

### A11. Zwift Companion — personal leaderboards (adjacent, not social ranking)

Zwift Companion's "Personal Leaderboards" are actually a personal-PR
timeline (segment times by quarter/year, chart + table), not a social
rank-vs-others feature; accessed via Zwift's More menu, drilling
world → route → segment. [Personal Leaderboards Arrive, Zwift Insider](https://zwiftinsider.com/leaderboards-launched/); [Track Your Progress, zwift.com/news](https://www.zwift.com/news/29779-companion-leaderboards).
During a live ride, a real leaderboard does appear on-screen for the
active segment only, then disappears on exit. [Personal Leaderboards
Arrive, ibid.] Relevant to the profile progress strip (D2 below): a
chart-plus-table "PR over time" pairing, scoped to short windows
(quarter), is the shape to borrow for a personal consistency trend, not
for a social ranking row.

### A12. Technogym Mywellness / PureGym / Nike Run Club / Fitbit — gym-chain and friends-list precedent

No citable design-level detail was found for Technogym Mywellness or the
PureGym in-app board (UNVERIFIED — searches did not surface primary
design documentation; not asserted). Nike Run Club confirms a
friends/distance leaderboard with weekly/monthly Challenges a user can
create and invite friends to, plus in-run audio cheers as the "someone
noticed you trained" signal. [Nike Run Club App, nike.com](https://www.nike.com/nrc-app); general leaderboard existence also at [Nike Running, Google Play listing](https://play.google.com/store/apps/details/Nike_Run_Club?id=com.nike.plusgps&hl=en_SG).
Fitbit-specific friends-list row anatomy was not confirmed by a citable
source in this pass — UNVERIFIED, not asserted.

---

## PART B — Pattern table

| Pattern | Apps (cited) | Why it reads compact/elite | Maps to Volyume component |
|---|---|---|---|
| Flat single-column ranked list, hairline dividers, no per-row card | Strava club leaderboard (A1), Duolingo league (A2) | One visual container instead of N; eye reads down a column, not through repeated card chrome/shadow per row | `Card padding="none"` wrapper + `borderSubtle` divider rows, not one `Card` per row — extends V18's existing group-container idiom to the ranked list specifically |
| Right-aligned single metric per row, one unit for the whole list | Strava (A1) | No re-parsing per row; the eye tracks one column | `type.num('bodyStrong')` right-aligned value cell in each row |
| Rank + avatar + name on one line, avatar small (32-40px class) | Strava (A1), Duolingo (A2) | Identity is glanceable, not a hero element; matches Volyume's existing 32-40 avatar sizes (V11, V8) | `ProfileAvatarMark size={32}` per V11's PostCard avatar size, reused for rank rows |
| Time-window switch as one small control above the list, never per-row or full tab | Strava (A1), Duolingo (A2, weekly-only so no control needed but same shape elsewhere), Whoop (A3), Peloton Overall/Here-Now (A7) | Filtering state lives once, not repeated; scanning stays uninterrupted | `Chip` row per V6 (never `SegmentedControl` in Community) |
| Own-row pinned/highlighted even off-screen, neighbours visible | ui-patterns.com general guidance (A10), Strava mobile top-10-but-you're-shown (A1) | Removes the "scroll to find myself" tax that makes long lists feel heavy | A `surface2`-tinted row (not a new Card) for "you", consistent with V20 (amber reserved for the six emphatic uses, dots, chips — a highlighted row uses surface tone, not amber fill) |
| Zone highlight as a background band across contiguous rows, not per-row badges | Duolingo promotion/demotion zones (A2) | One visual cue covers many rows at once instead of decorating each | A `surface2` band behind the qualifying row range; no icon-per-row |
| Compact numeric streak badge, not a card | Hevy (A4) | A single number carries the whole signal; no extra chrome | `Chip` (non-interactive/decorative variant) beside a header, not a `Card` |
| Header + compact fact strip + footer reaction row (no prose body, no Button) | Strava feed (A1, general knowledge flagged), Hevy feed (A4) | Facts read as data (columns), not as sentences; footer stays two glyph+count pressables | Already V11 (PostCard) — confirmed aligned, not divergent |
| Live/short time-scoped second view beside the persistent one | Peloton Here Now vs Overall (A7) | Lets "who's active right now" answer a different, faster question than "who's best all-time" | A second Chip option ("Today"/"This week") beside the persistent gym ranking, not a separate screen |
| Small-group flat list with no rank number at all | Oura Circles (A8) | Ranking chrome on 3-8 people reads as try-hard; a flat people list with one glanceable stat each is calmer | `ProfileCard`/`ConnectRequestRow` idiom, reused as-is, no rank badge, for gym boards under a member-count threshold |
| Stale/unsynced members hidden rather than shown greyed-out in a ranked view | Garmin Connect (A6) | Keeps every visible row comparable; avoids a list that looks half-broken | Filter the gym-board query itself (data layer), not a visual treatment |
| Personal trend as compact chart + short table, scoped to a short window | Zwift Companion personal PRs (A11), Hevy profile 7-day strip (A4) | A trend line is one glance; a full history table is not | A small sparkline-or-bar row plus a short numeric line, for the profile progress strip |
| AVOID: per-row card with shadow/bevel ("game HUD" treatment) | One gaming-genre source only (A10) | This is the "stacked" look the founder is rejecting; it is a gaming convention, not a fitness-app one — no fitness precedent found uses it | N/A — explicitly the anti-pattern; do not adopt |

---

## PART C — Proposed anatomy for four Volyume surfaces (words only)

Grounded in Part A/B evidence and constrained by `81-VISUAL-RULINGS.md`
(one amber fill per journey already spent elsewhere in Community per V1;
these four surfaces carry none of the five allow-listed emphatic
actions, so no amber fill appears on any of them; trailing actions stay
`sm`/non-full-width per V2; pick-one controls are `Chip` rows per V6; no
hex, tokens only per styling.md).

**D1. Hub overview ("Community" landing).** Hero stays per V3/V3a
(unchanged). Below it: one `SectionLabel tone="muted"` "This week," then
a single flat metric row (not a card) — streak-style `Chip` badge
(A4-derived, decorative, not selectable) plus one right-aligned
consistency figure, both on one line, `surface2` background, no border,
no shadow. Under that, a `Card padding="none"` list of at most 3 rows
(divider hairlines, per B pattern) surfacing "people training near you
this week," each row rank-less (Oura-style, A8) since the Hub is a
teaser not the ranking screen itself — avatar 32, name `bodyStrong`,
one `caption` fact ("trained today"), trailing chevron only, tapping
opens the full list. No Button anywhere in this block (matches YouScreen
precedent already in `80-VISUAL-INVENTORY.md` A3). One `tertiary` sm
"See all" closes the block, right-aligned, not full width (V2).

**D2. Gym board ("This week at my gym").** `SectionLabel` "This week at
[gym name]." One `Chip` row for window ("Today" / "This week"), Peloton
Here-Now-derived (A7), defaulting to "This week." Below: a single flat
list, `Card padding="none"` with hairline dividers (Strava/Duolingo
pattern, A1/A2) — rank number, avatar 32, name `bodyStrong`, one
`caption` line ("trained Tue, Thu" or similar), trailing "trained today"
signalled by a small amber dot on the avatar ring (reusing V5's ring
idiom, not a new chip) rather than a text chip, since V20 already
allows amber as an unread/unseen-style dot. The viewer's own row gets a
`surface2` tint, no amber (B pattern: own-row highlight is tone, not
fill). Under a founder-set minimum member count, this collapses to a
flat `ProfileCard` list with no rank number at all (Oura small-group
precedent, A8) plus the existing `EmptyState` copy pattern (V14) if the
gym has zero other members.

**D3. Rankings list with window chips.** `SectionLabel` "Rankings."
Window control: one `Chip` row (This week / This month / All time,
Strava/Whoop-derived A1/A3), single-select, `radio` role per V6 — never
a `SegmentedControl`. Below it, one flat ranked `Card padding="none"`
list: rank number (leading, `label` weight), avatar 32, name
`bodyStrong` + one `caption` sub-line, right-aligned metric in
`type.num('bodyStrong')` (Strava right-alignment pattern, A1). Top-3
carry no medal graphic and no colour badge (no fitness-app precedent
found for medal iconography in this research pass; Duolingo uses a zone
band, not per-row medals, A2) — instead the qualifying zone (if Volyume
adopts promotion/demotion at all) is a `surface2` band spanning the
qualifying row range (A2 pattern), never a per-row icon. Own row pinned
or scroll-anchored with neighbours visible even if off the visible top
N (A1/A10 pattern). Ties broken deterministically off-screen, no visual
tie marker (A2 pattern).

**D4. Profile progress strip.** One horizontal strip under the profile
header, no card wrapper needed if it sits directly under `BackHeader`
content per V19 (no `h1`/`h2`; this strip uses `label` weight numbers).
Three to four compact stat cells in one row (workouts this week,
current streak, a short trend indicator), Hevy 7-day-strip-derived (A4)
and Zwift-personal-PR-derived (A11) for the trend cell specifically: a
short sparkline or 4-8-bar mini chart scoped to the last 4-8 weeks, no
axis/legend (A3's sparkline literature, general knowledge flagged
UNVERIFIED against Whoop specifically but well-supported as a compact-UI
convention generally). No Button in the strip; if the strip needs an
expand action it is one `tertiary` sm trailing the row, never full
width (V2).

---

## Notes on evidence quality

Strong (multiple corroborating primary/support-doc sources): Strava
club-leaderboard ranking mechanics (A1), Duolingo league structure and
zones (A2), Hevy streak/feed/profile-strip (A4), Oura Circles group size
and no-rank design (A8), Peloton Here-Now/Overall switch (A7), Garmin
stale-member hiding (A6), Zwift Companion personal-PR shape (A11).

Weak or unconfirmed at the pixel/spec level (flagged inline above, not
asserted as fact): Whoop row-level sparkline presence (A3); Apple
Fitness two-bar chrome detail (A5); Strava/Hevy exact row heights,
avatar px sizes, and type sizes (no official design-spec page found —
all size-in-pt/dp claims in Part C are Volyume's own token choices, not
transcribed from a competitor spec); Garmin Connect leaderboard row
anatomy beyond the stale-hide rule (A6); Technogym Mywellness and
PureGym in-app boards (no source found at all); Fitbit friends-list row
anatomy (no source found).

## Unverified.
