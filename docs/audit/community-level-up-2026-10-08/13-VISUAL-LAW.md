# The Community visual law (D221, look D3)

Status: LAW for every Community screen and component from Stage 1 onward. Derived from 04 section 3 (the auditor's draft) and section 8.5 (the size system), finalised by the lead. Supersedes the 2026-09-10 presentation law (`20-BLUEPRINT.md` section 9) and D163 rule 1 where they conflict; the guard tests `community.layout.guard.test.js` and `community.presentation.guard.test.js` are re-pinned to this document in Stage 2. Tokens only: no hex, no literal font size or weight anywhere in Community.

## V1 Page and bands
- Page `colors.background`. Content is a stack of full-bleed sections in `colors.surface`, no radius, no border, separated by a 10 dp strip of page colour (the logger's `BAND`, imported from one shared constant, not re-declared). The band owns the horizontal gutter: rows inside carry `spacing.lg` (16) inline padding; the page scroll container carries none. Hairlines between rows: `StyleSheet.hairlineWidth` in `colors.borderSubtle`, spanning the band.
- Short reading text (rules, the privacy receipt, a notice) sits in a band as text, not in a `Card`. `Card` survives only where the thing shown is an object someone acts on (a gym venue row in a picker, the not-joined hero). No `Card` for people, groups, cohorts, posts or activity.

## V2 Section header
One component, `SectionHeader`: 56 dp, title `type.bodyStrong` `textPrimary`, `accessibilityRole="header"`, one optional trailing action at `type.label` `textSecondary` with a 48 dp target. No amber, no uppercase. `Eyebrow` and `SectionLabel` are retired from Community.

## V3 Rows
- Roster row (person, group, cohort, conversation, request): 64 dp two lines, 56 dp one line; leading mark 32 dp (people: circle with the ring dot; places and groups: 32 dp `radius.md` square in `surface2`); title `type.body` `textPrimary`; subtitle `type.bodySm` `textSecondary`; figures in `type.num('label')`; trailing chevron `textMuted` or one action.
- Large entry row (a door such as Find people): 88 dp, 44 dp icon tile in `surface2` `radius.md`, title `type.title`, subtitle `type.bodySm`.
- Every row is a `PressableCard`-style pressable with the house press feedback and a 48 dp minimum target.

## V4 The post (`PostRow`), the one anatomy for the feed, the post detail, the profile and the group page
Identity line (avatar 36 dp with the ring dot, name `type.bodyStrong`, time right-aligned `type.caption` `textMuted` from `postTimeLabel`); achievement line `type.num('bodyStrong')` `textPrimary`, with the `PR` mark (`primary` ink on `primary` at `alpha.soft`, `radius.sm`, 18 dp tall) only on a record; stats line `type.num('label')` `textSecondary`; note `type.bodySm` `textPrimary`, 3 lines then "more"; reaction bar with the heart (filled `primary` once given, else `textMuted`) and the comment glyph, counts in `type.num('label')`, each a 48 dp target, the bar flush with the text column. Row padding `spacing.md` vertical, `spacing.lg` horizontal, hairline below. Never bodyweight, measurements, calories or private notes in any line (source guard).

## V5 Identity
Avatar sizes 24 (stacks), 32 (rows), 36 (posts), 56 (profile hero). Nothing between 36 and 56 (the preset picker badge rule in `ProfileAvatarMark` stays). The ring dot is the only presence mark. Preset tones are unchanged in Stage 2 (six users' avatars are not re-coloured without a founder decision).

## V6 Type roles
Names `bodyStrong`; row titles `body`; headlines and section titles `bodyStrong`; the screen title `h3` medium on tab roots and `title` on pushed screens (the `BackHeader` default); figures `num('label')`, the achievement `num('bodyStrong')`, the one big figure on a You or profile strip `num('title')` and never more than one per band; time, counts and handles `caption`; notes and subtitles `bodySm`. No `h1` or `h2` in Community except the not-joined hero.

## V7 Amber
Sanctioned uses only: the ring dot, given Respect, the PR mark, the selected chip, one emphatic button per journey, the unseen dot and the unread badge. Header glyphs are `textPrimary`. No amber body text, no amber section titles, no permanently amber glyph.

## V8 Header
Tab root: title left, up to three 48 dp glyphs (search, activity, messages). Pushed screens: `BackHeader` with at most two glyphs. No circular containers behind glyphs. The avatar and privacy shield live under You.

## V9 Controls
Segment bar 48 dp with `Chip` radios (`accessibilityRole="radio"`), selected `primary` fill with `onPrimary` ink. Filter chips 32 dp visual, 48 dp hit via `hitSlop`, `spacing.sm` gaps, one row, horizontally scrollable when they overflow; a disabled chip is `textMuted` with the hint "Not available yet". Inputs are wells: `colors.background` fill, 1 dp `colors.borderSubtle`, `radius.md`, 44 dp tall, focused ring 1 dp `colors.primary`. The compose entry is a well with placeholder copy, never a floating button.

## V10 States
First load: skeletons in the true shape (`SkeletonPersonRow` for rosters, `SkeletonPostRow` for feeds; the square `SkeletonRow` is banned in Community). Section empty: one `type.bodySm` `textMuted` line plus at most one tertiary action. Screen empty, error, offline, private, blocked: the house `EmptyState` with retry. Paging: the list footer indicator. Every failure the person caused or can retry gets a calm toast; nothing fails silently.

## V11 Charts and marks
`ProgressStrip` bars 32 dp tall, 8 columns, 4 dp gaps, `radius.hair` caps, caption axis, inside a band (no card, no radius). `DayDots` 8 dp in rows, 12 dp cells with weekday initials on the profile. Sessions, minutes, sets and lift volume only; never bodyweight or calories.

## V12 Motion
`AnimatedEntrance` once per screen on first paint. Press feedback through the house spring. List-to-detail through the origin-aware zoom (D188): `onPressWithLayout` threaded through `PersonRow`, `GroupRow`, `PostRow`, and `heroZoomOptions` on `CommunityProfile`, `CommunityGroup`, `CommunityPost`. Reduce Motion: cross-fade, already app-wide. The Respect tap: a 120 ms scale, no burst, no confetti, no glow.

## V13 Accessibility
Section headers carry the header role; every target 48 dp; rows carry one combined label; text survives the x1.2 larger-text scale (no row pins both its title and its figures to one line); muted text never below AA on its surface (the tokens guarantee it; no alpha on text).

## V14 Copy
British English; no em dash; calm, plain, no shame. One word for the thing: "post". "Respect" is the reaction's name. "Follow" (see their training) and "Connect" (message each other) are explained once, on Find people. No "cohort", "blurb", "operator", "story", "item" in user-facing strings.
