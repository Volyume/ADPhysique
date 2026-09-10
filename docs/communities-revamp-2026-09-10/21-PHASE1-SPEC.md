# 21 — PHASE 1 SPEC: Arrangement (lead, 2026-09-10; the edit gate for the phase 1 lanes)

Authority: `20-BLUEPRINT.md` section 9 (the ten rules and the four surfaces),
section 11 row "1 Arrangement", CR-09. Evidence: `12-research-look-and-feel.md`,
`02-visual-audit.md`. No schema change in this phase: every row degrades
honestly to the data the client already has (section 5 lists the gaps that
phase 2's migration 170 fills). Tokens only (`src/styles/theme.js`); shared
primitives first; British English; no em dash in copy.

## 1. New shared components (`src/components/community/`)

All function components, `StyleSheet.create` at the bottom, theme via
`useTheme`, every interactive element `accessibilityRole` + label, effective
target 48 dp, Reduce Motion honoured through the primitives.

**`Eyebrow`** `{ children, trailing }`. Uppercase section label:
`type.caption`, `letterSpacing.overline`, `textMuted`, `paddingTop:
spacing.xl`, `paddingBottom: spacing.sm`, optional trailing `Pressable`
text (`label`, `textSecondary`) for a single quiet action. Replaces
`SectionLabel` on the four revamped screens (SectionLabel stays for others).

**`AvatarStack`** `{ people, size = 24, max = 3 }`. Overlapping
`ProfileAvatarMark`s (offset `-spacing.sm`), border `background` 2 dp so
they read as a stack; `+N` in `caption` `textMuted` when more. Nothing
interactive; the row is the target.

**`DayDots`** `{ days, todayKey }`. Seven 6 dp circles (`circle(6)`), gap
`spacing.xs`, Monday first: filled `primary` for a trained day, `border` for
not; today ringed 1 dp `primary` when not yet trained. `accessibilityLabel`
"Trained Mon, Wed, Fri". Pure presentation, no text.

**`PersonRow`** `{ person, metric, days, trainedToday, rank, onPress,
trailing }`. 64 dp: avatar 32 (`ProfileAvatarMark`) with the amber ring
dot when `trainedToday` (reuse the board's ring treatment), name
`bodyStrong` `textPrimary` (one line, ellipsis), second line `DayDots`
when `days` is given else `bodySm` `textSecondary` caption (gym, or "6
weeks running"), right-aligned `metric` in `type.num('label')`
`textPrimary`; optional rank `label` `textMuted` at the left edge (only
when the caller passes it: eight or more participants); optional
`trailing` node (a small `Button` `secondary` sm, or a glyph). Own row:
`surface2` tint via `withAlpha(c.textPrimary, alpha.ghost)`. Hairline
divider below (`StyleSheet.hairlineWidth`, `border`), inset to the text
column (left `spacing.lg + 32 + spacing.md`).

**`CohortRow`** `{ title, line, people, onPress }`. 64 dp: `AvatarStack`
of `people` (those who trained today when known, else the first three
members), title `bodyStrong`, `line` in `bodySm` `textSecondary` ("4
trained today · 23 members" or "23 members"), chevron `iconSize.sm`
`textMuted`. Hairline below, inset past the stack.

**`GroupRow`** `{ group, line, people, onPress }`. Same anatomy as
`CohortRow`; `line` is "8 members · invite only" until the server can say
who trained today (phase 2), then "3 trained today · 8 members".

**`ActivityItemRow`** `{ item, onPress, onRespect, onOpenPerson }`. The
feed row that replaces `PostCard` on the Hub, group and profile feeds
(`PostCard` stays in place for `CommunityPostScreen`'s detail header until
phase 3 retires it). Anatomy: avatar 32 with ring dot when the item's day
is today; line one: name `bodyStrong` + " · " + headline in `body`
`textSecondary` (session: the session name; pr: "new best"; block: the
plan name; milestone: the title); line two `label` `textMuted`, tabular
figures: session "52 min · 18 sets · 2 PRs · Tue"; pr "Bench press 100 kg
× 5 · was 97.5 kg"; block "6 weeks · 18 sessions"; milestone its caption;
then the note text when present (`bodySm` `textPrimary`, max three lines),
then a trailing action column: Respect glyph (`heart-outline`/`heart`,
`iconSize.md`, amber only when given), comment count `caption`. Amber
appears nowhere else on the row. Hairline below, inset. Long-press does
nothing (no hidden gestures).

## 2. The Hub (`CommunityHubScreen.js`)

One `FlashList` with `ListHeaderComponent`; no `Card` except the not-joined
hero and the moderated-person notice; no `SectionLabel`; no Chip segment.
Order:
1. `BackHeader` "Community", right glyphs unchanged (search, activity with
   unseen dot, messages with count).
2. Not joined: the hero `Card` (`h3` "Your gym, your people"; `bodySm`
   "See who is training around you, keep up with friends, give respect.";
   `Button` primary "Create my profile"; `Button` tertiary "Browse
   first") and the compact `PrivacyReceipt`. Joined: the You line: a
   64 dp `PersonRow` for yourself (avatar with your ring dot, name "You",
   `DayDots` from your own device counters, metric your sessions this
   week), tapping opens your profile.
3. `Eyebrow` PEOPLE. `CohortRow` per dimension from `community_dimensions_me`
   in this order: gym (line "4 trained today · 23 members" from the
   existing gym board call, stack = those who trained today), then area
   and style rows (line "N members"; stack = first members from the
   dimension payload when it carries people, else no stack). A final
   tertiary row "Find people" (`Pressable`, `label` `textSecondary`, no
   chevron) opening `CommunityFindPeople`. "Lifters like you" suggestions
   move to Find people; the Hub shows none.
4. `Eyebrow` GROUPS with trailing "New group". `GroupRow` per group from
   `community_group_list_mine`. No groups: the eyebrow with its trailing
   action and a single `bodySm` `textMuted` line "Make a group with
   friends to see each other's training weeks." (one line, no card).
5. `Eyebrow` ACTIVITY. Feed rows via `ActivityItemRow` from the existing
   Following feed (`community_feed`); Discover posts are no longer on the
   Hub. Empty: `EmptyState` one line "Follow people to see their training
   here." with one action "Find people". Offline and failed states keep
   their current copy and Try again.
6. Moderated-person notice and legacy partner card keep their places above
   item 2. The offline caption stays above the feed.

First load: `SkeletonRow` ×2 under PEOPLE, ×1 under GROUPS, ×3 under
ACTIVITY, in the same slots. One `AnimatedEntrance` around the header
content on first paint only.

## 3. Cohort page (`CommunityDimensionScreen.js`)

`BackHeader` title = the dimension label. Under it one `label`
`textSecondary` line: "23 members · 4 trained today" when the board is
available (gym), else "23 members". Then:
- Gym scope (board available): `Eyebrow` TRAINED THIS WEEK; the week
  roster as `PersonRow`s (rank only from eight participants, the small
  group rule unchanged); own row pinned as today; then a tertiary row
  "Respect everyone who trained today" reserved for phase 3 (do NOT render
  it in phase 1: nothing behind it); then a tertiary row "This month and
  consistency" opening `CommunityBoard` with the scope preselected.
- Other scopes (no board yet): `Eyebrow` PEOPLE; the dimension's people as
  `PersonRow`s with the caption line (gym or style) and no dots.
- `Eyebrow` RECENT: the dimension's recent stories as `ActivityItemRow`s
  (CORRECTION, lane P1-B STOP 2026-09-10: `community_dimension` returns no stories, only label, count, people and cursor; this section is built in phase 2 on a new `community_dimension_recent` RPC added to migration 170 as part A2; the screen carries a header comment until then).
Cold start: your own row and the line "No one else here is sharing yet."
First load: `SkeletonRow` ×5.

## 4. Group page, profile, board

**Group page**: `BackHeader` name + menu glyph (48 dp box, as landed). One
`label` line "8 members · invite only" (the Together line is phase 3, do
not render a placeholder). `Eyebrow` MEMBERS with `PersonRow`s from the
group board (week window; roster form under eight) and a trailing
eyebrow action "See all" to `CommunityGroupMembers`. `Eyebrow` ACTIVITY
with the group feed as `ActivityItemRow`s; the non-member state keeps its
Join/Request `Button` primary in place of the feed. No `h2` name in the
body: the header carries it.

**Profile**: avatar 56 (`ProfileAvatarMark`), name `bodyStrong`, handle
`bodySm` `textMuted`, the bio in `bodySm` `textSecondary` (three lines, when present), one `bodySm` `textSecondary` line of shared facts
(gym · place · styles, only what the card carries and the person shows);
own progress strip as today (others' strips arrive in phase 2); the
existing Follow / Connect / Message row; `Eyebrow` ACTIVITY with
`ActivityItemRow`s. No cards.

**Board** (`CommunityBoardScreen`): keep its chips; rows become `PersonRow`
with `DayDots` and the metric; hairlines; no other change.

## 5. Honest gaps carried to phase 2 (migration 170 part A)

Per-cohort "trained today" counts and stacks for area, style, discipline
and age group; board scopes for those cohorts; counters on other people's
profile cards (lane B STOP, 2026-09-10); the Hub summary in one RPC
(`community_hub_summary`) so the Hub makes one call, not one per cohort.
Phase 1 rows show member counts where trained-today is unknown, never a
placeholder or a dash.

## 6. Guards and verification

- New `src/__tests__/community.presentation.guard.test.js` (source-level,
  header comment explaining what it pins): (a) no `type.display`, `type.h1`
  or `type.h2` in any `src/screens/Community*.js`; `type.h3` only in
  `CommunityHubScreen.js`; (b) `<Card` appears at most twice in
  `CommunityHubScreen.js` and not at all in `CommunityDimensionScreen.js`,
  `CommunityGroupScreen.js`, `CommunityProfileScreen.js`; (c) no
  `SectionLabel` import in those four screens; (d) `DayDots` and
  `AvatarStack` never import anything from `../../lib/database` (privacy
  surface unchanged); (e) the only amber uses in the new row components
  are the ring dot, the given-Respect glyph and the PR mark (`c.primary`
  count per file pinned).
- Component tests colocated in `src/components/community/__tests__/` for
  every new component (render, accessibility label, own-row tint,
  rank hidden without the prop, DayDots label text).
- `screen-mount` continues to mount every screen; the privacy guard is
  untouched; the copy guard stays green.
- Lead render review: `docs/communities-revamp-2026-09-10/render-2026-09-10/`
  with the Hub (joined, not joined, empty groups), cohort page (gym, style),
  group page, profile, in dark and light, before the merge.
