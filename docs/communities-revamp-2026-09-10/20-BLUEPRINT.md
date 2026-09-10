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
the second (section 9 lists the sites).

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

Pending `11-research-safety-cohorts.md`; the rulings below are the
conservative floor and can only be tightened by that lane.
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
  (section 9) and re-accepted once through the existing updated-rules path.
