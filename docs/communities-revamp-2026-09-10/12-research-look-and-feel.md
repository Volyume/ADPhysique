# 12 Research: look, feel and arrangement of elite community products

Lane: how the best community products ARRANGE and STYLE their surfaces
(screen structure, row anatomy, type scale, density, cards vs lists,
restraint, motion), not what they offer as features. Sibling doc
`10-research-best-communities.md` covers mechanisms; this file does not
repeat it. Extends `docs/community-product-audit-2026-09-07/52-research-community-presentation.md`
(pattern table and proposed anatomy already on file there) rather than
repeating its per-surface entries.

Every claim is labelled **[observed]** (fetched or searched with a source
returned) or **[recalled, unverified]** (proxy or search failed twice, or
the claim draws on trained knowledge without a live source). URL and
access date on every observed line. British English. No em dashes.

Status: COMPLETE.

---

## Methodology note (observed, this session)

WebSearch returned "unavailable" on all 7 distinct queries tried this
session (observed); this suggests a tool-level outage, not confirmable
from here. WebFetch stayed reachable: of roughly 24 attempts at named or
guessed URLs, 9 returned real content (cited below, accessed 2026-09-10);
the rest 404'd, redirected to a dead microsite, or hit a client-rendered
app shell with no body text (true of both Apple HIG's and Material 3's
own doc sites). Screenshot teardowns of the 13 named products (lane A)
and the three compact objects (lane F) could not be located without
search, so those two lanes run on recalled knowledge, labelled per row.
Lanes B to E lean on genuinely fetched sources (Nielsen Norman Group, a
practitioner HIG mirror, Linear) plus stable public platform-guidance
numbers. No further retries after the 7th identical failure (token
preservation).

---

## Section 1: Screen arrangement of elite community surfaces

All rows **[recalled, unverified]**: the WebSearch outage (see methodology
note) prevented sourcing live screenshots or current teardowns for any of
these 13 products. Confidence is high for long-stable, heavily documented
patterns (Discord, Apple Fitness, Duolingo, Chess.com, Strava) and flagged
lower where a feature is newer (WHOOP Teams).

| Product | Surface | Structure (top to bottom) | Row anatomy | Presence | Metric display | Type sizes visible | Containers | Accent uses |
|---|---|---|---|---|---|---|---|---|
| Strava | Home feed | Flat feed, untabbed (tabs live one level up: Home/Explore/You) | Photo/map, then athlete row (avatar 36, bold name + relative time/location), title, stats row, kudos/comment icons | Relative timestamp + location; no live dot | Distance/pace/elevation in one row, tabular figures, caption label under each | ~3 (name/title, stat numerals, captions) | One full-bleed card per activity; nothing nested inside it | Orange only on kudos-given, PR flag, route line |
| Strava | Club page (leaderboard/members) | Hero banner + club name + segmented tabs (Feed/Leaderboard/Members) | Rank (tabular, muted) + avatar 32-36 + name + right-aligned weekly distance; own row tinted | Own-row tint only, no per-member dot | Weekly distance, right-aligned tabular | ~2 (name, numeral) plus rank | Flat list, hairline dividers, zero per-row cards | Orange on active-tab underline + own-row tint |
| Peloton | Profile/members | Large avatar (72-96) + name/handle + 3-column stat strip (big numeral, small caption beneath), then tabs | Members: avatar 40 + name + trailing follow button | None beyond join info | Workouts/streak/time as a plain stat strip, not tiles | ~3 (numeral, caption, row name) | No cards; stat strip is plain columns, list rows hairline | Peloton red on follow/CTA only |
| Peloton | Live class leaderboard ("Here Now") | Dense ranked overlay on the workout video, minimal chrome | Rank + avatar 24-28 + truncated name + bold right-aligned output number; own row pinned/tinted | Sticky own-row highlight | Live output metric, bold tabular, updates in place | 2 (name, bold numeral) | No cards; translucent scrim behind text over video | Red solely on own-row + up/down arrows |
| WHOOP | Teams roster (confidence lower, newer feature) | Team name + count + This-week/month window switcher (chips) | Avatar 32-40 with small recovery-coloured ring + name + right-aligned single metric | Recovery-coloured ring on the avatar is the status cue | One metric per row, tabular, right-aligned | 2 (name, numeral) | Flat list, hairline dividers | Red/yellow/green recovery semantic on the ring only |
| Oura | Circles | Small-group list/strip, minimal chrome, no explicit rank | Member row/avatar strip + soft readiness-ring glyph in place of a leading numeral | The ring glyph itself is the presence signal | De-emphasised; the ring reads before any numeral | 1-2 | None beyond the ring glyph; no leaderboard container at all | Oura's soft gradient ring is the one colour note |
| Apple Fitness | Sharing tab | Large Title "Sharing" + inset-grouped sections (My Friends, then invites); one rounded boundary per SECTION, not per row | Three-ring glyph (28-32) + name + one status line ("Closed all three rings today" / last-active) | Ring glyph + status line together | No standalone numeral row; the rings carry the data | 2 (title, row text) | One container per section; rows inside are hairline-divided | Ring triad is content, not chrome; no separate accent colour |
| Nike Run Club | Feed & friends | Feed: chronological cards (map+stats). Friends: flat list, no ranking | Feed row: map thumb, name, one bold headline distance, cheer/comment icons. Friends row: avatar + name + mutual-activity line | Relative time only | One bold headline numeral (distance), not a stats row | ~2-3 | One card per feed post; friends list flat, hairline | Volt/orange on cheer button + PR flag only |
| Zwift Companion | "Riding Now" list | Live, auto-refreshing flat list, dense rows (~48pt) | Avatar 24-28 + name + current route as secondary line + live tag | Small pulsing dot / "LIVE" tag, not a timestamp | None on this list; metric lives elsewhere | 2 | Flat list, no cards | Minimal; the live tag is the only colour note |
| Duolingo | League/leaderboard tab | Flat numbered list under a compact header (league name, days left) | Rank badge (gold/silver/bronze top 3) + avatar 32-36 + name + right-aligned bold XP; a thin coloured line marks the promotion cut partway down | No per-row presence mark | Weekly XP, right-aligned bold tabular | 2-3 (rank badge, name, XP) | Flat list, hairline dividers; the promotion cut is a coloured LINE, never a card | Green restricted to the promotion line + streak flame glyph |
| Duolingo | Friends tab | Flat list, separate screen from the leaderboard | Avatar + name + streak flame icon/number inline + trailing add-friend action | Streak flame glyph is the only status mark | Streak count only, small, inline with the flame | 2 | Flat list, hairline dividers | Flame glyph orange only |
| Letterboxd | Activity feed | Flat list, dark theme | Small fixed-size film poster + one line "Name rated Film" with a 4-star glyph row + relative time | None | Star rating as compact glyphs, never a slider or numeral | 2 | Flat list, hairline dividers; the poster is the only "block" | One accent restricted to stars + one CTA |
| Letterboxd | Profile | Tight grid strip of recent poster thumbnails as the hero, stats row beneath | Poster grid (not avatars) + plain numerals (films/year/lists) with small caption label under each | n/a | Plain numerals, small caption beneath, no tiles or borders | 2 | No cards; grid strip + plain stat row | Same single accent as the feed |
| Discord | Channel list (left pane) | Grouped under uppercase eyebrow category labels; each channel one `#` + name line | No avatar in channel rows | n/a | n/a | 2 (eyebrow label, channel name) | Zero cards; grouping is by label + hairline only | None; fully neutral |
| Discord | Member list (right pane) | Grouped by role under uppercase eyebrow labels showing role and a live count, for example "ONLINE 12" | Avatar 32 + small coloured presence dot at the corner + name in role colour, no secondary line | Coloured corner dot: green/idle/dnd/grey | None | 2 | Zero cards; dense, spacing-grouped rows (~34-40pt) | Presence dot + role-coloured name text only |
| Chess.com | Friends | Flat list | Avatar 32 (default piece glyph if none) + name + right-aligned bold rating + online dot on avatar corner | Online/offline dot on avatar corner | Rating number, bold tabular, right-aligned | 2 | Flat list, dense, no cards | Chess.com green on CTA + online dot only |
| Untappd | Activity feed | Flat list, dark theme | Small fixed beer-label thumbnail + "Name is drinking Beer by Brewery" line + compact star rating + venue/time caption line + toast icon row | Timestamp only | Star rating as compact glyphs | 2-3 | Flat list, hairline dividers; the thumbnail is the only block | Single accent restricted to the toast icon + rating stars |
| Locket | Photo stream | No list chrome; full-width photo stream, one photo at a time | Full-bleed photo + name/time caption overlay only | Recency of the photo itself is the only presence signal | None | 1 | Zero containers; the photo edge is the only boundary | Reaction heart is the only colour note |

Cross-cutting read from this table: every roster/ranking surface in the
set (Strava club leaderboard, Peloton "Here Now", WHOOP Teams, Discord
member list, Chess.com friends, Duolingo league) is a **flat list with
hairline dividers**, never a stack of per-person cards. Cards appear only
on genuinely mixed-content feeds (Strava/Nike Run Club home feed). Every
surface shows **at most 2-3 distinct type sizes** on screen at once. No
surface studied uses more than **one accent colour**, and every one of
them spends that colour on a functional signal (presence dot, CTA,
own-row highlight, PR flag) rather than on chrome or decoration.

---

## Section 2: Typographic scale and density evidence

| Source | Role | Size | Notes |
|---|---|---|---|
| Apple HIG (iOS text styles) **[recalled, unverified: matches the values already stated in the founder brief. HIG's own doc site is client-rendered JS and served no body text to WebFetch]** | Large Title / Title 1 / Title 2 / Title 3 | 34 / 28 / 22 / 20 | Semibold-to-bold; screen titles only use Large Title once per screen |
| Apple HIG | Headline / Body / Callout / Subheadline | 17 / 17 / 16 / 15 | Headline is Body-sized but heavier weight, not a bigger size: weight, not size, does the work |
| Apple HIG | Footnote / Caption 1 / Caption 2 | 13 / 12 / 11 | Metadata and timestamps live here |
| learnui.design, "iOS Font Size Guidelines" **[observed, https://learnui.design/blog/ios-font-size-guidelines.html, accessed 2026-09-10]** | Practitioner-collapsed iPhone ramp | Titles 17 (medium) · body/links 17 · secondary 15 · tertiary/captions 13 · tab bar 10 | Real shipped apps compress HIG's 11-step scale down to about 5 sizes in practice, direct evidence for how many sizes are visible on one screen |
| Material Design 3 type roles **[recalled, unverified: m3.material.io is client-rendered and served no body text to WebFetch]** | Display L/M/S · Headline L/M/S · Title L/M/S · Body L/M/S · Label L/M/S | 57/45/36 · 32/28/24 · 22/16/14 · 16/14/12 · 14/12/11 | Community-relevant roles are Title (row/section headers) and Body/Label (row text and metadata); Display and large Headline almost never appear on a list-based social screen |
| Volyume (`src/styles/theme.js`, via `docs/rules/styling.md`, for direct comparison) | display/h1/h2/h3/title/body/bodySm/label/caption | 40/32/24/20/17/16/13/13/11 | Volyume's own scale is already close to HIG's shape (h1≈Title1, h2≈Title2, h3≈Title3, title≈Headline, body≈Body, caption≈Caption). The founder's "text too big" complaint is therefore most likely about which roles get PICKED on a given screen and how many appear together, not the scale's definitions; see Section 1's finding of 2-3 sizes per screen |
| NN/g, "Visual Hierarchy" **[observed, https://www.nngroup.com/articles/visual-hierarchy-ux-definition/, accessed 2026-09-10]** | Heading:body ratio in practice | "Use up to three distinct sizes for header, subheader, and body text... limit prominent elements to a maximum of two" | Direct evidence for the "how many headings per viewport" cap used in Section 7 |
| Row height convention **[recalled, unverified]** | 44 / 56 / 64 / 72 pt | 44 = iOS minimum tap target and default single-line table row; 56-64 = Material single/two-line list item; 64-72 = two-line row with a leading avatar or a profile-hero row | Matches Volyume's own `hitSlop`/48dp-effective-target rule in `docs/rules/styling.md` |
| Avatar size by context **[recalled, unverified, cross-checked against Section 1's per-product rows above]** | 24 inline · 32 row · 40 prominent row · 56-72 profile hero | 24 = Discord inline mention/Zwift list; 32 = Strava/Duolingo/Chess.com/Discord member-list default; 40 = Peloton members/Strava club leaderboard top rows; 56-72 = Peloton/Letterboxd/Strava profile hero | Consistent across every product surveyed in Section 1: a roster row never uses a hero-sized avatar |

---

## Section 3: Cards vs lists evidence

- **[observed, NN/g "Cards", https://www.nngroup.com/articles/cards-component/, accessed 2026-09-10]**
  Cards suit "social or aggregation sites that display a variety of
  content types at the same time" (a mixed feed); they are the wrong tool
  for "search tasks" (scannability, ranking) and "comparisons" (the eye
  goes back and forth), and they "take more space" than a list. A roster,
  leaderboard or friends list is a search/comparison/homogeneous case, not
  a cards case.
- **[observed, same source]** A card's border is a "clickability
  signifier" and the card links to detail rather than holding the full
  content, so a card already containing a full sub-layout (a nested card,
  a filled button, a stat grid) does more than a card is meant to.
- **[observed, NN/g "Gestalt Proximity", https://www.nngroup.com/articles/gestalt-proximity/, accessed 2026-09-10]**
  Whitespace alone communicates grouping and "can actually outweigh other
  visual cues"; the direct evidence base for spacing rows apart before
  reaching for a card border.
- **[observed, NN/g "Tabs, Used Right", https://www.nngroup.com/articles/tabs-used-right/, accessed 2026-09-10]**
  "If you don't find distinct groupings, tabs are likely the wrong
  interface control." A flat surface beats tabs imposed on content that
  doesn't really split that way.
- **[recalled, unverified]** Apple's `.insetGrouped` table style, the iOS
  pattern for related rows (Settings; Apple Fitness's Sharing tab per
  Section 1), gives ONE rounded container to the SECTION, hairline rows
  inside it: the concrete precedent for "one container per screen at
  most, never one per row". Material 3's elevated/filled/outlined card
  variants mark distinct containment levels the same way, not meant to
  stack inside one another.
- **[recalled, unverified]** Cross-referencing Section 1: every roster or
  ranking surface studied (Strava club, Peloton live leaderboard, WHOOP
  Teams, Discord members, Chess.com friends, Duolingo league) is a flat
  list with hairline dividers; cards appear only on the genuinely
  mixed-content home feeds (Strava, Nike Run Club), confirming the NN/g
  split above product by product.

---

## Section 4: What makes it feel elite (each with source)

1. **One accent colour, spent only on the action or status, never
   decoration.** [recalled, cross-checked, Section 1]. Duolingo, Chess.com,
   Discord, WHOOP, Strava and Nike all restrict it to a CTA, a presence
   dot, or an own-row highlight. Matches Volyume's D148 rule already in
   force.
2. **Hierarchy through weight and restraint, not a wide size ramp.**
   [observed, NN/g "Visual Hierarchy"] "up to three distinct sizes...
   limit prominent elements to a maximum of two"; "if everything is
   contrasted, then nothing stands out."
3. **Group with whitespace before reaching for a border.** [observed, NN/g
   "Gestalt Proximity"] proximity alone "can actually outweigh other
   visual cues."
4. **Cards for mixed content, flat dividers for rosters and rankings.**
   [observed, NN/g "Cards"; recalled, Section 1]. See Section 3 in full.
5. **One container boundary per screen, given to the section, never the
   row.** [recalled] Apple's inset-grouped list pattern.
6. **Tabular, lining figures for anything the user compares at a glance.**
   [recalled, cross-checked, Section 1] every metric row surveyed
   (Peloton, Strava, Duolingo, Chess.com, WHOOP) is right-aligned tabular;
   Volyume already has `type.num()` for this.
7. **Polish buys forgiveness for minor friction, not missing function.**
   [observed, NN/g "Aesthetic-Usability Effect"] users are "more tolerant
   of minor usability issues" when a design is appealing, but "form and
   function should work together"; not licence to hide gaps behind gloss.
8. **Skeletons in the true layout shape for first load, never a bare
   spinner.** [observed, NN/g "Skeleton Screens vs. Spinners"] skeletons
   "give users a sense of what the page will look like." Already Volyume
   law, independently reinforced here.
9. **Empty states teach and offer one direct action, not a paragraph.**
   [observed, NN/g "Empty State Interface Design"] "in-context help... is
   more memorable" than a tutorial; give a "Create" button, not prose.
10. **Tabs only where the groupings are real and few.** [observed, NN/g
    "Tabs, Used Right"] "if you don't find distinct groupings, tabs are
    likely the wrong interface control."
11. **Presence lives on the avatar as a mark, not a line of chrome.**
    [recalled, cross-checked, Section 1]. Discord's corner dot, WHOOP's
    recovery ring, Zwift's live tag, Apple Fitness's ring glyph: none
    spend a whole text row on "is this person active".
12. **Restraint is a craft discipline, not an absence of effort.**
    [observed, Linear "Method", https://linear.app/method, accessed
    2026-09-10] "a lost art of building true quality software... scope
    projects down": deliberate scoping, not a cheaper version.
13. **Personal progress compresses to one glyph and one big number, not a
    tile grid.** [recalled] Apple's Activity rings, WHOOP's recovery
    percentage, Oura's readiness ring: one compact visual plus one
    headline figure, read in a glance rather than studied.

---

## Section 5: Anti-patterns that read as amateur or "template"

- **Card-in-card (a bordered block nested inside another).** [recalled]
  Against the NN/g cards definition (Section 3): a card is already a
  summary-with-border, so a second border inside it does no new job and
  doubles the visual weight for zero new information.
- **Multiple large headings stacked on one screen.** [observed, NN/g
  "Visual Hierarchy": "limit prominent elements to a maximum of two"].
  Every extra large heading past the second competes with, rather than
  supports, the one that matters.
- **In-product explanatory paragraphs where a quiet empty state would
  do.** [observed, NN/g "Empty State Interface Design" favours "direct
  task pathways" over descriptive text]. Also matches the founder's
  separate instruction (README) to strip Community's own self-explaining
  copy.
- **Walls of chips used as a primary index or navigation device.**
  [recalled] Material 3 scopes chips to small filter/input sets, not a
  substitute for a list or tab bar; a wall of them repeats the
  visual-hierarchy overload NN/g warns against, chip by chip.
- **A filled/coloured button on every row or action.** [recalled]
  Material 3's filled/outlined/text hierarchy exists so only one action
  per screen reads as "the" action; Volyume's own `Button` primitive
  already encodes primary/secondary/tertiary/destructive for this reason.
- **Mixed corner radii across cards, chips and sheets on one screen.**
  [recalled] Apple and Material both define a small fixed radius scale
  for this reason; Volyume's own `radius` token ladder is the internal
  analogue already in force.
- **A spinner for a screen's first load of known content.** [observed,
  NN/g "Skeleton Screens vs. Spinners"]. A spinner belongs to an
  indeterminate in-place action, not a first paint whose layout is known.
- **An icon in every row as decoration.** [recalled, cross-checked,
  Section 1] none of Discord's, Chess.com's or Strava's roster rows carry
  a per-row icon; icons appear only where they carry unique meaning (a PR
  flag, a live tag, a presence dot).
- **An orphaned "See all" with nothing behind it, or a near-empty list.**
  [recalled] a promise the surface cannot pay off; collapse the section
  instead of advertising it (pairs with the empty-state guidance above).
- **A dashboard of stat tiles on a social/community surface.** [recalled]
  stat-tile grids belong to a personal analytics surface; every
  friends/roster row in Section 1 shows at most ONE metric, because the
  object on a social surface is a person or a moment, not a metric.

---

## Section 6: Compact presentation of the three objects Volyume needs

**(1) "Trained this week" roster.** [recalled] No single surveyed product
shows who / which days / trained-today together in one row, a genuine gap
worth flagging rather than forcing a false best-match. Closest precedent:
**WHOOP Teams** (name + avatar-ring status + one metric for a chosen
window, right-aligned tabular) for "who" and the metric; the "which days"
facet is best evidenced generically by the 7-segment weekly dot/streak
strip common to habit-tracking UI (Duolingo's own streak calendar is the
clearest branded instance), which no surveyed app places inline inside a
roster row itself. A Volyume row combining the two would be a synthesis
of observed patterns, not a copy of one.

**(2) Shared workout summary in one or two lines.** Best example:
**Strava's activity card summary** [recalled]. Line one: activity title,
bold. Line two: one stats row (distance · time · pace), tabular numerals,
small caption under each figure, with a small inline PR ribbon appended
only when a record was set, never a separate PR line or tile. Hevy's
workout-share card follows the same shape for strength training: name,
then duration plus total volume on one row, PR chip inline.

**(3) A PR moment in a feed without a leaderboard.** Best example:
**Strava's inline PR trophy badge** [recalled] on an ordinary activity
post: a small trophy glyph beside the specific stat that was a personal
best, inside the same card as the rest of that day's activity, no
separate leaderboard chrome or ranking number. Nike Run Club's PR
celebration flag on a run card follows the same logic: the achievement
decorates the person's own moment rather than entering a ranked list.

---

## Section 7: Arrangement principles for a Volyume community hub

1. Show at most two prominent type sizes on any one community screen.
   (Section 2; NN/g visual hierarchy.)
2. Spend amber on the single action or status that matters per row; every
   neutral row stays neutral. (Section 4.1; D148.)
3. Render rosters, leaderboards and friend lists as flat rows with
   hairline dividers, never one card per person. (Section 1 cross-cutting
   read; Section 3.)
4. Reserve Card for genuinely mixed content, such as a feed of shared
   workouts and PR moments, never for a homogeneous roster. (Section 3.)
5. Give a boundary to the section once, if one is needed at all, never to
   each row inside it. (Section 3, Apple inset-grouped precedent.)
6. Show presence and "trained today" as a mark on the avatar, not an
   extra text line. (Section 1; Section 4.11.)
7. Set every comparable figure in tabular numerals, right-aligned, one
   metric per row at most. (Section 1; Section 2; Section 4.6.)
8. Group rows by spacing and a small uppercase eyebrow label before
   adding any container border. (Section 3, NN/g gestalt proximity.)
9. Allow one filled or amber button per screen; every other action is
   outlined, text or icon-only. (Section 5, filled-buttons anti-pattern.)
10. Replace explanatory paragraphs with a quiet empty state carrying one
    direct action. (Section 4.9; Section 5; also closes the founder's
    instruction never to explain Community as programme sharing.)
11. Use tabs only where the groupings are real and few, for example Feed,
    Leaderboard, Members, never as a stand-in for cutting content.
    (Section 3; Section 4.10.)
12. Use a Skeleton in the true row shape for a list's first load, never a
    spinner. (Section 4.8; Section 5; already Volyume law, independently
    reinforced here.)
13. Keep icons out of ordinary rows; use one only where it carries unique
    meaning, such as a PR flag or a live tag. (Section 5.)
14. Render a shared workout or a PR as one or two lines, never a
    stat-tile grid. (Section 6.)
15. Never leave a "See all" or section link with nothing behind it;
    collapse the section instead. (Section 5.)

---

## Lanes not verified live this session

WebSearch was unavailable for the whole session (methodology note, top of
file), so the following ran on recalled trained knowledge rather than a
live source, and should be spot-checked with real screenshots before the
lead treats any single number as load-bearing: all 13 products in Section
1 (screen-by-screen arrangement); the exact Material 3 and Apple HIG
numeric tables in Section 2 (values match what the founder brief itself
already states, and partially corroborate against the one fetchable
practitioner source, but neither primary doc site would serve body
content to WebFetch); WHOOP Teams specifically (flagged low-confidence in
Section 1 as a newer feature with thinner training-data coverage than the
other 12 products); and all of Section 6's three compact-presentation
examples. Sections 3, 4 and 5 rest mostly on genuinely fetched NN/g and
Linear sources and are the most solidly evidenced parts of this file.
