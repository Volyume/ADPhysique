# 20 — BLUEPRINT: Community as connection, consistency and encouragement (lead, 2026-09-10)

Authority: founder brief and additions in chat, 2026-09-10 (`README.md`).
Evidence: `01-recon-community-today.md` (code at HEAD), `02-visual-audit.md`,
`03-copy-audit-explanations.md`, `10-research-best-communities.md`,
`11-research-safety-cohorts.md`, `12-research-look-and-feel.md`. Standing
rulings kept: `40-GAP-CLOSURE.md` sections 2, 4, 5 and `60-DESIGN` in
`docs/community-product-audit-2026-09-07/` (progress and consistency, never
weight; groups; boards), SD-nn, GD-nn, V1-V20, D148, every CLAUDE.md
Section 2 inviolable. Rulings are numbered CR-nn and recorded with
rationale in `40-DECISIONS.md`; a pointer entry sits in the main register.

Lead-ruled under D33 on one criterion: the best product for the app and its
users. Product forks outside the delegated set are listed in section 12 as
founder questions and were delivered in chat.

## 1. Purpose (CR-01)

Community is where a person connects with people like them and with their
friends, sees each other's training consistency and progress (sessions,
weeks in a row, PRs), and encourages them. It is never a place to share
plans, programmes or routines: Volyume builds each person's plan. Every
sentence the app uses to explain Community says the first thing and never
the second (section 10 lists the sites).

What the founder described maps onto three objects, and the whole design
is those three, nothing else:
- **People like you**: cohorts a person belongs to by facts they choose to
  share (gym, discipline, age group, area). Seeing who in the cohort
  trained this week, and their shared moments.
- **Groups**: friend circles a person creates or joins. Seeing friends'
  training, encouraging them, sharing a great workout with them.
- **Activity**: the ambient record of training among the people you
  follow and the groups you are in, plus the encouragement it attracts.

## 2. What the evidence settled

- **The current surface already has most of the machinery** (recon 01):
  gym and area cohorts, five age bands, style tags, boards over four
  scopes, a full group model, follow and connect, messaging, one reaction,
  flat comments, consent toggles, ED and minor gates, moderation.
- **It lacks the four things the founder named**: a discipline cohort
  (absent), an age cohort page (band exists only as a gated filter), PRs
  and progress visible to others without a manual post (only manual `pr`
  stories; the progress strip hides on everyone else's profile,
  `CommunityProfileScreen.js:120-140`), and sharing into a group (posts
  are public or followers only).
- **Its explanation is still the old one** (recon 01 section 6): the Today
  intro card, the Rules text accepted at Join, the privacy receipt, a
  Find people door, a share toggle, a connect reason and the deletion copy
  all say "programme".
- **The mechanisms that work elsewhere are cooperative and ambient, not
  competitive and manual** (research 10): self-chosen identity tags
  (Peloton), activity that flows from the log itself with no post step
  (Letterboxd), one free encouragement tap with a bulk "everyone active
  today" form (Zwift, Strava), a cohort result expressed as the sum of
  individual outcomes (Chess.com; Duolingo friends quests), close groups
  around twenty (Oura), batched notifications, and peer-reviewed evidence
  that encouragement from more active friends spreads training behaviour
  (Aral and Nicolaides 2017). Leagues, automated fake kudos, shared
  penalties and no-show scores are refused on evidence of harm.
- **Visually, the tokens are clean but the arrangement is not** (audit 02):
  no raw literals, no oversized type, no stray amber fill at HEAD (the
  three amber buttons are the committing actions Post, Create profile,
  Accept rules); but the Hub stacks seven to nine blocks (hero card,
  receipt, this-week line, gym card, groups chips, segment chips, Find
  people card, suggestion rows, dimension rows) before the feed, nineteen
  of twenty-four screens spin on first load instead of showing the layout,
  and twelve Hub touch targets carry no accessibility role.

## 3. Cohorts: People like you (CR-02, CR-03)

A cohort is a fact about a person that they chose to share. Four headline
cohorts, one page pattern:

| Cohort | Membership fact | Exists today | Change |
|---|---|---|---|
| My gym | primary or other gym (`gym_id`) | yes (dimension page, board scope) | none to the model |
| My discipline | NEW self-chosen tags, up to three (`discipline_keys`) | no | new profile field, dimension kind and board scope |
| My age group | server-derived band, shared by choice | band and gated filter only | new dimension kind and board scope; reciprocal (visible only while you share yours), never a minor |
| Near me | area (`place`) | yes | none to the model |

Training style (`COMMUNITY_STYLE_KEYS`) stays a Find people filter and a
dimension, not a headline cohort: it describes kit and method, not who
someone is.

**Discipline taxonomy (founder to confirm, question Q1).** Self-declared
identity, Peloton-style, never inferred: Bodybuilding; Men's physique;
Classic physique; Bikini; Wellness; Figure; Powerlifting; Olympic
weightlifting; Strongman and strongwoman; CrossFit and functional fitness;
Calisthenics; Hybrid (lifting and endurance); General strength and
fitness; Sport strength and conditioning; Getting back into training.
Keys are stable snake_case; labels are British English. The physique
divisions are body-adjacent, so they carry the safety rule in section 8.

**Cohort page (one pattern for all four, replacing `CommunityDimensionScreen`
as it stands):**
1. Header: cohort name, member count, one line "N trained today".
2. "Trained this week": the existing `community_board` week window in
   roster form (unranked below eight, ranked from eight; `60-DESIGN`
   section 2 stands), each row avatar, name, trained-day dots, right-aligned
   sessions figure, amber ring dot for trained today.
3. "Recent": shared moments from cohort members whose audience is
   Everyone (section 4), flat rows.
4. One quiet action per page: Respect everyone who trained today
   (section 5). No Find people card on the page; people are the page.

Cold start (`60-DESIGN` section 5 stands): with one member the page shows
your own row and the honest line "No one else here is sharing yet";
structure shrinks for a small cohort rather than showing empty sections
(Discord evidence, research 10 item 9).

## 4. Activity: the log is the feed (CR-04, CR-05)

**Two levels of sharing, two toggles, both explicit, both default OFF:**
- **Share that I train** (exists: "Share my consistency"): day-level
  counters only. Feeds the rosters, the progress strip and "trained today".
- **Share what I did** (NEW: `share_sessions` with an audience of
  Followers, Groups, or Everyone): each completed workout becomes an
  activity item automatically, no compose step, carrying only the existing
  session allow-list (`validation.js:87-99`: session name, working sets,
  duration, exercise count, top set, PR count, plan name, date). A PR
  inside it becomes a PR moment (lift, weight and reps, previous best: the
  existing `pr` payload) for the same audience.

**Implementation shape:** an ambient item IS a `community_posts` row of kind
`session` (or `pr`) with `auto = true` and no text, so feeds, reactions,
comments, reports, RLS, deletion and moderation all already apply. "Post
to Community" on the workout summary becomes "Add a note" on that item: a
great workout gets a sentence and reads as a post; the manual compose
path stays for milestones and blocks. Withheld under calm mode or an open
ED flag by the same gate as the counters (`consistencyGateState`); minors
keep the followers-only rule; turning the toggle off stops new items and
offers to remove the existing ones.

**Why:** manual posting leaves a small community silent, and the founder's
ask ("see how often they've trained, whether they had a PR") is presence,
not publishing. Letterboxd's whole feed is the diary (research 10 item 7).
Consent is the guard: nothing leaves the device until the person turns the
toggle on, and the payload never contains bodyweight, food or measurements
(`hasForbiddenKeys` stands).

**The progress strip renders on any profile whose owner shares** (the
`60-DESIGN` section 4 rule; today the client hides it for everyone but
you). PRs show as a count on the strip ("3 PRs in 4 weeks") when the person
shares what they did, and as moments in the feed. No lift is ever ranked
(SD rulings stand): a PR is a moment, never a table.

## 5. Encouragement (CR-06)

One verb across Community: **Respect**, the reaction that already exists
(bespoke to lifting; a generic "like" reads as borrowed, research 10
Untappd). It applies to every activity item: a session, a PR moment, a
streak milestone, a post. Two additions:
- **Respect everyone who trained today**: one tap on a roster (cohort page,
  group page, the Hub's people rows) sends Respect to each person listed
  as trained today (Zwift Ride On and Strava kudos bomb, research 10 items
  3 and 4). Rate-railed like any RPC; block and mute stand (Peloton's
  harassment case, refuse item 1).
- **Encouragement attaches to effort shown, never to absence.** No "nudge
  a friend who has not trained", no lapse notices, no shared penalty
  (refuse items 5 and 6; the no-shame voice law). A person who has not
  trained this week is simply not on the roster, never at the bottom of
  it (`60-DESIGN` stands).

Delivery: every Respect lands in the in-app Activity inbox immediately.
Pushes stay inside the existing `COMMUNITY_ACTIVITY` category and budget as
one batched daily digest ("4 people gave your training respect today"),
quiet hours honoured, never one push per tap (research 10 item 20). Any
per-event push for close friends is a founder call because it would amend
`docs/NOTIFICATIONS_LOCKED.md` (question Q5).

## 6. Groups: friend circles (CR-07)

The 2026-09-07 group model stands (create, open or invite-only, admin,
invite by handle or link, board, feed, reports, minors refused). Changes:
- **Create defaults to invite-only** with a name and the people you pick;
  open groups remain a choice on the same screen. The copy says what a
  group is for: "See your friends' training and encourage them."
- **Together this week**: one line on the group page, the sum of members'
  sessions this week against the sum of their planned sessions where a plan
  exists ("Together: 11 of 16 planned sessions"). A cooperative figure with
  no ranking and no penalty (Chess.com club matches, Duolingo friends
  quests; research 10 items 5 and 6). Members who share nothing simply do
  not count, and the line says "of the members who share".
- **Share with the group**: a post or an ambient item can carry an audience
  of one or more groups (`visibility = 'groups'` plus a post-to-group
  table). "Share a great workout with the group" is the note action on a
  session item with the group chosen.
- **Respect everyone who trained today** on the group roster.
- **Group notifications get their copy** (`group_request`, `group_accepted`,
  `group_invited` fall through to "did something in Community" today,
  recon 01 section 4).

No hard member cap; the roster rule below eight and the Oura evidence
(around twenty feels alive) inform the create copy, not a limit.

## 7. Data and consent changes (CR-10)

Cloud, one additive migration (`migrate_170_community_connection.sql`,
header per the schema rule, applied only on "run against production"):
- `community_profiles`: `discipline_keys text[]` (max 3, checked against
  the taxonomy), `share_sessions boolean default false`,
  `sessions_audience text default 'followers'` (followers, groups,
  everyone).
- `community_posts`: `auto boolean default false`; visibility gains
  `'groups'`; new `community_post_groups(post_id, group_id)` with RLS off
  and RPC-only access like every community table.
- `community_dimension` and `community_board` gain kinds and scopes
  `discipline` and `age_band` (age band reciprocal and never a minor).
- `community_respect_all(_scope, _scope_key)`; `community_group_get`
  returns the Together figures; `community_feed` and `community_group_feed`
  include auto items; `community_connect_reason` list gains
  `same_discipline` and retires `same_programme` (the SQL helper list and
  the client constant change together: guard test lines 454-511).
- Notification kind `respect_digest`; `delete_user_data` names the new table.

Client: `trainingProfile.js` learns the two new fields inside the SD-30
import allow-list (no new database reads: the session payload is built
where "Post to Community" builds it today); `shareablePayload` sends them
only when on; an ambient item is created on workout completion through the
existing `createPost` and transport retry; the privacy guard deny-list
stays in force.

Nothing here touches the coaching engine, food, bodyweight, tier or
billing.

## 8. Safety posture (CR-08)

Tested by `11-research-safety-cohorts.md`: no STOP; R2 (age bands) and R6
(nothing ranked by weight, bodyweight or volume) HOLD; R1, R3, R4 and R5
TIGHTEN as folded in below. Its evidence class is stated honestly: the
Peloton case, the Apple and Google UGC policy text and three peer-reviewed
physique-athlete studies were fetched; ICO and Ofcom text is drawn from
the repo's earlier verified fetches plus recalled doctrine (its section
11). Apple's UGC age-rating questionnaire may raise the store age band
when this ships: a founder-side check at submission, already flagged in
`docs/social-discovery-2026-09-06/13-research-policy-safety-coldstart.md`.
- Cohort and group surfaces show training facts only, as everywhere in
  Community: sessions, days, streaks, lifts and reps. Never bodyweight,
  measurements, food, photos or "cutting" framing; the keyword filter for
  harmful body and eating content applies to notes and group names.
- Under calm mode or an open ED flag: nothing is sent (counters, sessions,
  PR moments), and the person's physique-division cohort pages (Men's
  physique, Classic physique, Bikini, Wellness, Figure, Bodybuilding) are
  withheld from view for them, the same way the before/after card is
  withheld. A tightening of an existing suppression, never a loosening;
  surfaced to the founder as Q1b because it touches the ED-safety system.
- Minors: never in cohorts, boards, groups or age bands (existing rule);
  ambient items follow the followers-only rule.
- Reporting, blocking, muting, the moderator queue, the rules acceptance
  and the 24-hour runbook already exist; the Rules text is rewritten
  (section 10) and re-accepted once through the existing updated-rules path.
- **Tightening R1.** The six physique-division cohort pages carry a
  standing, quiet Beat UK signpost row for everyone, not only the
  reactive withhold: peer-reviewed prevalence of disordered eating in
  physique and bodybuilding populations runs 28-72 percent across three
  studies (lane 11 section 2), so the un-flagged majority still gets the
  support signal. The row is `SettingRow`-shaped, `bodySm`, never a card.
- **Tightening R3.** Turning on "Share what I did" is an express, informed
  act (training data is Article 9 data on the repo's own reading): the
  toggle's explanation states that sharing is automatic with nothing to
  post yourself, names the chosen audience, and offers removal of what
  was already shared (wording: lane 11 section 10, adopted verbatim).
  Notes attached to items pass the keyword filter. The design also
  answers the documented pressure to "train more so the roster looks
  good": no lapse is ever visible, a quiet week is absence not a low
  rank, and calm mode or an open ED flag silences everything.
- **Tightening R4.** `community_respect_all` excludes blocked and muted
  pairs server-side in both directions, pinned by a test; the Peloton
  harassment case arose exactly because the fan-out had no block check.
- **Tightening R5.** Invite-only groups get identical moderation coverage
  to public content (reports, auto-hide thresholds, the queue, the
  runbook): a closed group is user-to-user content under the Online
  Safety Act and the DSA, never exempt interpersonal communication.
  `DSA-SIZE-SELF-ASSESSMENT.md` section 6 gains that sentence.
- Truth fields stay honest and unchanged: no clinical review exists or is
  pending (founder law GC-D12); REAL-DISABLED-USER-VALIDATED stays NO;
  age is self-declared and the age bands never strengthen assurance.

## 9. Presentation law: slick, flat, one product (CR-09)

Evidence: `12-research-look-and-feel.md` (NN/g visual hierarchy, gestalt
proximity, cards, tabs, skeletons, empty states; Linear; the cross-product
read that every roster in Strava, Peloton, WHOOP, Discord, Chess.com and
Duolingo is a flat hairline list showing two or three type sizes and one
accent) and `02-visual-audit.md` (the Hub's seven-to-nine stacked blocks,
spinners on nineteen screens, missing roles). V1-V20 and D148 stand; the
rules below are added on top and are the edit gate for every Community
surface.

**Ten rules, all Community screens:**
1. Two prominent type sizes per screen: the header title and row names
   (`bodyStrong`). Everything else is `bodySm`, `label` or `caption`.
   No `h1`, `h2` or `h3` on any list screen; the one `h3` allowed in
   Community is the not-joined hero on the Hub.
2. No `Card` for people, groups, cohorts or activity. Rosters, group
   lists and the feed are flat rows with hairline dividers. `Card` is
   allowed only for the not-joined hero and the moderated-person notice.
3. Sections are uppercase eyebrow labels (`caption`,
   `letterSpacing.overline`, `textMuted`) with `spacing.xl` above and
   `spacing.sm` below; no boxed section, no nested container.
4. Rows are 56 dp (one metric) or 64 dp (two lines with an avatar 32);
   profile hero avatar 56; inline avatar stacks 24. Every row is a
   `Pressable` with `accessibilityRole="button"` and a label; audit 02's
   twelve unlabelled Hub targets are fixed by construction.
5. Presence lives on the avatar: the amber ring dot for trained today,
   nothing else. Trained days are seven 6 dp dots on the row's second
   line (`primary` filled for trained, `border` for not, today ringed).
6. Every comparable figure is right-aligned in `type.num(label)`; one
   metric per row.
7. Amber is spent only on: the trained-today ring, a given Respect glyph,
   a PR mark, the selected chip, and the one emphatic button per journey
   (Create profile, Post, Accept rules). Every other button is `primary`
   (charcoal), `secondary`, `tertiary` or icon-only.
8. First load of every list is `SkeletonRow` in the true row shape;
   `ActivityIndicator` only inside a button or a single row mid-action.
   This retires the spinner drift on nineteen screens.
9. Empty states are one line and one action, never a paragraph; a section
   with nothing behind it collapses rather than showing a "See all".
10. Motion: one staggered `AnimatedEntrance` on the Hub's first paint,
    spring press feedback through the shared primitives, Reduce Motion
    honoured everywhere; no other animation.

**The Hub, top to bottom (one `FlashList`, header content then feed):**
1. `BackHeader` "Community" with right glyphs: search, activity (unseen
   dot), messages (count). Unchanged.
2. Not joined: the hero card (`h3` "Your gym, your people", one `bodySm`
   line, `primary` "Create my profile", `tertiary` "Browse first") and
   the compact `PrivacyReceipt`. Joined: one line, avatar 32 with your
   ring dot, "3 sessions this week · 6 weeks running" in `label`.
3. Eyebrow PEOPLE. One row per cohort you belong to, in this order: your
   gym, each discipline, your age group (only while you share it), near
   you. Row: avatar stack 24 of up to three members who trained today,
   name `bodyStrong`, second line "4 trained today · 23 members", chevron.
   Last row, tertiary: "Find people" (opens Find people with its filters;
   the "People like you" suggestions live there, not on the Hub).
4. Eyebrow GROUPS. One row per group: avatar stack of members who trained
   today, name, "Together 11 of 16 · 3 trained today", chevron. Last row,
   tertiary: "New group". Section collapses to the single "New group"
   row when you have none.
5. Eyebrow ACTIVITY. The feed: one chronological list of items from the
   people you follow and your groups (ambient sessions, PR moments, posts,
   milestones). No Following/Discover segment: discovery happens on the
   cohort pages. Row: avatar 32 with ring dot, line one "Sam Rees · Upper A"
   (name `bodyStrong`, session `body` `textSecondary`), line two
   "52 min · 18 sets · 2 PRs · Tue" (`label`, tabular), optional note
   line (`bodySm`), trailing Respect glyph (amber when given), comment
   count caption. A PR moment: "Sam Rees · new best" then "Bench press
   100 kg × 5 · was 97.5". Tap opens the item.
6. Offline and moderated notices keep their places above the header
   content; the legacy partner card stays until migration 155 retires it.

**Cohort page** (`CommunityDimensionScreen`, one pattern for gym, discipline,
age group, area): `BackHeader` with the cohort name; one `label` line
"23 members · 4 trained today"; eyebrow TRAINED THIS WEEK; the week
roster (rank numbers from eight participants); a tertiary row "Respect
everyone who trained today"; a tertiary row "This month and consistency"
opening `CommunityBoardScreen` with the scope preselected; eyebrow RECENT;
activity rows shared to Everyone by members. Cold start line per
section 3.

**Group page** (`CommunityGroupScreen`): `BackHeader` with the group name
and the menu glyph; one `label` line "8 members · invite only"; the
Together line with a 2 dp progress bar (`radius.hair`) under it; eyebrow
MEMBERS with the roster; "Respect everyone who trained today"; eyebrow
ACTIVITY with a tertiary "Share a workout with the group" first, then the
group feed rows. Admin actions stay in the `MenuSheet`.

**Profile** (`CommunityProfileScreen`): avatar 56, name, handle, one
`bodySm` line of shared facts ("PureGym Leeds · Men's physique · 25-34");
the progress strip when the person shares (sessions this week, weeks
running, eight-week bars, "3 PRs in 4 weeks" when they share what they
did); the Follow, Connect and Message actions as today; eyebrow ACTIVITY
with their items. No cards.

**Join** (`CommunityJoinScreen`): unchanged flow; adds the discipline picker
(chips, up to three) after gym, and the two sharing toggles (section 4)
with the wording from `11-research-safety-cohorts.md` section 10 (adopted verbatim).

## 10. Copy: every explanation says the same thing (CR-11)

The definition, used verbatim wherever Community is explained: "Community
is where you connect with people at your gym and your friends, see each
other's training weeks and progress, and give respect. Never plans or
programmes: Volyume builds yours."

Sites to correct (recon 01 section 6 and audit 03), all in one commit:
- `HomeCommunityIntroCard.js:25,28`: title "See who is training", body
  "Connect with people at your gym and your friends, see each other's
  training weeks, and give respect."
- `CommunityRulesScreen.js:42-45,94-96,107,113,116` and
  `docs/community-safety/COMMUNITY-RULES.md:23-24,62-63,73,78,83`: rewrite
  without programmes; bump the rules version so the existing updated-rules
  acceptance path shows the new text once.
- `PrivacyReceipt.js:40`: "Programmes you publish" becomes "Sessions you
  choose to share".
- `NotificationSettingsScreen.js:880`: drop "or uses your programme".
- `findPeople.js:57-63` and `CommunityFindPeopleScreen.js:132`: the "On my
  programme" door becomes "Same discipline" (phase 2 needs the field;
  phase 0 hides the door).
- `CommunityTrainingProfileScreen.js:90` and `trainingProfile.js:148,
  434-453`: the "Programme" toggle and `tp_programme_key` stop being sent
  (the column stays; server nulls it).
- `connections.js:37`: "Same programme" reason hidden in phase 0, retired
  in the migration in phase 2 with `same_discipline` added (guard test
  lines 454-511 updated with the SQL helper in the same change).
- `profile.js:58` `show_programmes` no longer sent; `CommunityEditProfileScreen.js:218`
  deletion copy loses "published programmes".
- `posts.js:294-308`, `validation.js:87-102`, `PostCard.js:101-108`,
  `CommunityComposeScreen.js:59,118`, `DimensionRow.js:14,24-29`: the dead
  `programme` story kind and dimension icon go from the client (server
  keeps returning the empty dimension for stale links).
- Comments at `RootNavigator.js:499-501` and `AnalyticsScreen.js:511-514`
  corrected.

## 11. Build order and verification (CR-12)

All four phases are in scope; the order exists so each lands green,
lead-reviewed, merged to main and device-walked before the next. Cloud
changes are applied only on the founder's "run against production".

| Phase | Delivers | Schema | Tests and guards |
|---|---|---|---|
| 0 Truth | Section 10 copy and residue; progress strip on any sharing profile; group notification copy; Skeleton first loads on nineteen screens; roles on every Hub target; the stale comments | none | copy guard test pins the definition and bans "programme" in Community copy; privacy guard unchanged; screen-mount |
| 1 Arrangement | Section 9: the Hub, cohort page, group page, profile, shared row components (`PersonRow`, `CohortRow`, `GroupRow`, `ActivityItemRow`, `DayDots`, `AvatarStack`) | none | Button hierarchy guard extended to Community rows (no amber fill outside the curated set); a new `community.presentation.guard.test.js` pins rules 1, 2 and 7 by source regex; render review of six surfaces in `render-2026-09-10/` |
| 2 Cohorts | Discipline taxonomy, picker at Join and Edit profile, discipline and age-group dimension kinds and board scopes, `same_discipline` reason, "On my programme" door retired | `migrate_170_community_connection.sql` part A | band and reason equality guard updated with the SQL; rpcOnly guard; migration shape header |
| 3 Ambient | Share what I did, audiences, automatic session items and PR moments, notes, group audiences, Together line, Respect everyone, daily digest | `migrate_170` part B (or 171 if the founder wants the cohorts batch applied first) | privacy guard extended to the new fields (no forbidden keys, ED gate withheld, minors followers-only); notification budget test for the digest; deletion names the new table |

Every phase: `npm run lint && npm test` on the settled tree with exact
output reported; small per-feature commits; merge to main in the same
session; a numbered device checklist for a physical Android EAS build
including the ED-safety cases (calm mode on: no counters, no items, no
physique cohort pages; open ED flag: the same; minor account: no cohorts,
groups or age band). The fresh-eyes review agent (Opus) runs against this
blueprint after phase 1 and after phase 3.

## 12. Founder questions (delivered in chat)

Q1 discipline taxonomy: confirm or edit the list in section 3.
Q1b physique divisions under calm mode or an open ED flag: withhold the
person's own physique cohort pages (the blueprint's floor) or keep them
visible with training facts only.
Q2 sharing defaults: both toggles OFF at Join with an offer after the
first workout (the consent floor the blueprint takes), or "Share that I
train" ON for followers by default.
Q3 the verb: Respect (kept), Encourage, or Cheer.
Q4 the static orange button: which screen and which build; a screenshot
settles it. At HEAD the only amber fills in Community are Create profile,
Post and Accept rules.
Q5 pushes: daily digest only inside the existing budget (the blueprint),
or per-event pushes for close friends (amends `NOTIFICATIONS_LOCKED.md`).
Q6 build go: phase 0 now on this branch, or the whole order.
Q7 a home-screen widget line "a friend trained today" (Locket evidence):
in scope for a later phase, or not.
Q8 a visual mock (design canvas) of the Hub, cohort page and group page
before phase 1, or straight to code.
