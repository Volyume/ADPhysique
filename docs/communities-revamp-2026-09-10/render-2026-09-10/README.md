# Phase 1 render review — no working mechanism, text outline instead

No working render mechanism exists for Community screens: `docs/social-
discovery-2026-09-06/render-community-screens.html` and `render-visual-
2026-09-07/*.html` are one-off, hand-authored static mockup documents (div
soup mimicking the theme tokens, no generating script, no data binding to
the real components), and the repo has no automated screen-to-image path
for React Native screens — `scripts/render-share-card.cjs` renders only
the Skia-canvas share card, and there is no puppeteer, playwright,
react-native-web or Storybook dependency anywhere in `package.json` or
`scripts/`. Per the brief, no new harness was built; this file is the
plain-text structural review instead, one line per rendered block, top to
bottom, for each surface. Structure is identical in dark and light (only
the theme token VALUES differ, which text cannot show anyway), so one
outline per surface covers both.

Source for every line below is the actual committed code, not a
description of intent: `src/screens/CommunityHubScreen.js`,
`CommunityDimensionScreen.js`, `CommunityGroupScreen.js`,
`CommunityProfileScreen.js`, and the seven row components under
`src/components/community/`.

---

## 1. Hub — joined, with content

1. `BackHeader` "Community" — right: your avatar (opens your profile),
   search glyph, activity bell (+ unseen dot), messages (+ unread count)
2. [conditional, omitted here] moderated-person notice
3. [conditional, omitted here] legacy partner "invites have moved" card
4. You line — `PersonRow`: your avatar (ring dot if trained today) ·
   "You" · `DayDots` (or a streak caption if no days yet this week) ·
   right-aligned "N sessions"
5. `Eyebrow` PEOPLE
6. `CohortRow` — your gym: avatar stack of those trained today · gym name
   · "N trained today · M members" · chevron
7. `CohortRow` (repeated per cohort) — an area or style you share:
   avatar stack (empty in phase 1, no people preview from the RPC yet) ·
   name · "M members" · chevron
8. Tertiary row "Find people" (opens the six-door Find people screen)
9. `Eyebrow` GROUPS, trailing action "New group"
10. `GroupRow` (repeated per group): avatar stack (empty, phase 2) ·
    group name · "N members · open" or "N members · invite only" ·
    chevron
11. [conditional, omitted here] offline caption
12. `Eyebrow` ACTIVITY
13. `ActivityItemRow` (repeated, the Following feed, newest first): avatar
    (ring dot if the item is from today) · name + kind headline (" · new
    best" / the session name / etc.) · tabular figures line ("52 min · 18
    sets · 2 PRs · Tue") · optional note (up to 3 lines) · trailing
    Respect heart (amber once given) + comment count

## 2. Hub — not joined

1. `BackHeader` "Community" — right: search glyph only (no avatar,
   activity or messages before there is a profile)
2. [conditional, omitted here] moderated-person notice (never applies,
   not joined) / legacy partner card
3. Hero (`h3`) "Your gym, your people" — body "See who is training
   around you, keep up with friends, give respect." — `Button` primary
   "Create my profile" — `Button` tertiary "Browse first" (collapses the
   hero to one slim "Not joined yet · Create my profile" line when
   tapped; RECENT below is unaffected either way)
4. `PrivacyReceipt`, compact: shield glyph + "Nothing about your body,
   food or coaching is ever shared." + "What is shared" (expands the
   Others-can-see / Never-shared columns in place)
5. [conditional] offline caption
6. `Eyebrow` RECENT
7. `ActivityItemRow` (repeated, Discover stories — public, no profile
   needed to read): same anatomy as ACTIVITY above; the Respect heart
   routes to Join rather than the reaction RPC (join-to-interact, since
   `community_react` needs a profile), reading and opening a story do not

## 3. Hub — joined, no groups (state variant of §1)

Identical to §1 except the GROUPS block (item 9-10 above) becomes:

9. `Eyebrow` GROUPS, trailing action "New group" (kept, so there is still
   a way to start one)
10. One `bodySm` `textMuted` line: "Make a group with friends to see each
    other's training weeks." — no card, no `GroupRow`s

(For a minor account, the entire GROUPS block — eyebrow included —
disappears rather than showing a dead-end "New group" action, matching
the existing minors-never-in-groups rule.)

## 4. Cohort page — gym scope, board available

1. `BackHeader` — title: the gym's name
2. `label` line: "N members · M trained today"
3. [conditional] "Is this gym real? Confirm it" (a pending directory
   submission only)
4. [conditional] "Report a problem with this gym" link (a linked
   directory venue only)
5. `Eyebrow` TRAINED THIS WEEK
6. `PersonRow` (repeated, the week roster): rank at the left edge (only
   once 8 or more people are on it) · avatar (ring dot if trained today)
   · name · `DayDots` · right-aligned "N sessions"; the reader's own row
   tinted, and pinned at the bottom of the list if the board did not
   already include it
7. [conditional, cold start] "No one else here is sharing yet." — shown
   whenever the roster is empty or holds only the reader's own row
8. Tertiary row "This month and consistency" (opens the Board screen,
   month window, this gym preselected)

## 5. Cohort page — style scope (e.g. "Kettlebell lifters")

1. `BackHeader` — title: the style's label
2. `label` line: "N members"
3. `Eyebrow` PEOPLE
4. `PersonRow` (repeated, the dimension's own people list, paged):
   avatar · name · caption (their gym, or their first shared style when
   they have no gym set) · no `DayDots`, no metric (no board data exists
   for a non-gym scope in phase 1)

(A gym dimension whose board could not be read at all — no linked venue,
not the reader's own gym — falls back to this exact same PEOPLE list
rather than an empty page.)

## 6. Group page — member

1. `BackHeader` — title: the group's name — right: 48 dp menu glyph
   (opens the existing `MenuSheet`: Edit / Invite by handle / Share
   invite link / View members / Report this group / Close group / Leave
   group, admin-only rows filtered server-side)
2. `label` line: "N members · open" or "N members · invite only"
3. `Eyebrow` MEMBERS, trailing action "See all" (opens the full
   `CommunityGroupMembers` roster)
4. `PersonRow` (repeated, the group's week board): rank (8+ only) ·
   avatar (ring dot) · name · `DayDots` · right-aligned "N sessions";
   own row tinted and pinned if off-page
5. `Eyebrow` ACTIVITY
6. `ActivityItemRow` (repeated, the members' stories feed): same anatomy
   as the Hub's ACTIVITY rows

## 6b. Group page — non-member

1. `BackHeader` — title + right: nothing (the menu glyph is member-only)
2. `label` line: "N members · open" or "N members · invite only"
3. `Button` primary "Join" (or, once requested, a disabled "Requested")
   in place of the whole MEMBERS/ACTIVITY block above — a minor account
   never sees this button at all

## 7. Profile

1. `BackHeader` — title "@handle" — right: [conditional] "..." options
   glyph, only on someone else's profile
2. Avatar 56 + name (`bodyStrong`) + handle (`bodySm`, muted)
3. Shared-facts line (`bodySm`, secondary): place, then the chosen
   styles/goal/setting facts, joined with " · " — only whichever of
   these the card actually carries
4. [conditional, own profile only] "Hidden from others" note(s), when the
   owner has switched off showing their gym or place
5. `TrainingProfileLine` (`bodySm`): the shared training bands sentence,
   when any are shared
6. [conditional, own profile + sharing consistency only] `ProgressStrip`:
   sessions this week / streak / consistent weeks, plus the 8-week bar
   row
7. Counts row (`bodySm`): "N followers" · "N following" ·
   [conditional] "N connections"
8. Actions row: own profile → `Button` primary "Edit profile" + `Button`
   secondary "Share link"; a blocked person → `Button` secondary
   "Unblock"; everyone else → `FollowButton` + `ConnectButton`
   (collapses to Message once connected)
9. `Eyebrow` ACTIVITY
10. `ActivityItemRow` (repeated, this person's own stories)
