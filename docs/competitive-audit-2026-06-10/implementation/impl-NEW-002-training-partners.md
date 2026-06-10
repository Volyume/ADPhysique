# impl-NEW-002 — Training Partners

> Round-2 implementation blueprint, 2026-06-10. Founder-added action
> (supersedes the rejected passive COMP-017; the rejection of the
> passive/buried-in-Settings shape stands). Approved basis: chosen
> private circle on derived signals only, Apple-Activity-Sharing
> pattern; (a) rate-limited one-tap cheer, (b) optional shared
> consistency streak with a "resting" forgiveness state, (c)
> plain-English privacy receipt on the invite sheet. Anti-features are
> hard: no leaderboards, no raw-metric comparison, no stakes, no
> punitive shared consequences, no feed. Founder scores I7/E3.
> No code was modified. Charter: `impl-00-shared-brief.md`.

---

## 0. Evidence verification (the founder's anchors, checked)

Every anchor in the approved basis was traced to its primary source.
One needed an honesty correction (Future's 95%).

**The 83-study meta-analysis — FOUND AND CONFIRMED.**
*"The association between social comparison in social media, body image
concerns and eating disorder symptoms: A systematic review and
meta-analysis"*, **Body Image** (published online December 2024;
[ScienceDirect S1740144524001633](https://www.sciencedirect.com/science/article/pii/S1740144524001633),
[PubMed 39721448](https://pubmed.ncbi.nlm.nih.gov/39721448/)).
83 studies, 55,440 participants, papers 2008–2024. Findings: higher
online social comparison correlates with greater body-image concerns
(r = .454, 95% CI .409–.498), with eating-disorder symptoms (r = .36,
95% CI .28–.43), and with lower positive body image (r = −.242).
Moderators include type of social media and type of comparison.
**Design consequence:** the harm mechanism is *comparison of
appearance/performance content*. The fix is not "be careful with
comparison"; it is to **remove the comparator entirely**. Volyume
partners exchange only binary adherence-to-own-plan signals. There is
no number, photo, weight, pace or volume to compare, so the measured
mechanism has nothing to operate on.

**Strava kudos — CONFIRMED.** Franken, Bekhuis & Tolsma, *"Kudos make
you run! How runners influence each other on the online social network
Strava"*, **Social Networks 72 (2023), 151–164**
([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0378873322000909),
[Univ. of Groningen portal](https://research.rug.nl/en/publications/kudos-make-you-run-how-runners-influence-each-other-on-the-online)).
329 members of five Dutch Strava clubs: "receiving kudos induced
runners to run more and more often", with strong reciprocity among
"kudos-friends". Two further details matter for our design: influence
flows through *reciprocal ties* (people you also cheer), and athletes
converged toward the behaviour of kudos-friends who ran *less*, not
more — i.e. acknowledgement works, upward comparison does not. The
cheer must therefore be reciprocal and comparison-free.

**Duolingo Friend Streak — CONFIRMED, with a precision note.**
Duolingo's own product write-up
([5 product lessons we learned from building Friend Streak](https://blog.duolingo.com/product-lessons-friend-streak/);
launch post: [Friend Streak: a new way to stay motivated together](https://blog.duolingo.com/friend-streak/);
third-party teardown: [Deconstructor of Fun](https://duolingo.deconstructoroffun.com/mechanics/streaks))
reports users with at least one Friend Streak are **22% more likely to
complete their daily lesson**, with the lift increasing per additional
Friend Streak (capped study at 5 slots; the marginal-retention analysis
is why they kept the cap). Mechanics: pairing requires mutual follow +
accepted invitation; a shared day counts only when **both** partners
extend their own streak that day; a broken Friend Streak **removes the
pairing** and requires re-pairing
([Duolingo wiki](https://duolingo.fandom.com/wiki/Streak),
[duoplanet on freezes](https://duoplanet.com/duolingo-streak-freeze/)).
Precision note: the founder's "+D14 retention" shorthand is directionally
right but Duolingo's published figure is the 22% daily-lesson-completion
lift, not a public D14 number. Flagged as search-extract where the blog
blocked direct fetch. **Design consequence:** Duolingo's *break = unpair*
is the harshest part of an otherwise excellent mechanic; our shared
streak deliberately never breaks (see §4.5).

**Future's ~95% — MARKETING-GRADE; replaced with the primary source.**
Future's "95% more likely to reach goals when someone holds us
accountable" ([future.co](https://future.co/), repeated in reviews such
as [Better Living](https://onbetterliving.com/future-fitness-app/))
traces to the oft-cited ASTD/Dominican accountability claim. The actual
peer-reviewed study is **Gail Matthews, Dominican University** (267
participants, 5 conditions): >70% of participants who sent **weekly
progress reports to a friend** achieved or substantially achieved their
goal vs 35% who kept unwritten goals to themselves
([Dominican research summary](https://www.dominican.edu/sites/default/files/2020-02/gailmatthews-harvard-goals-researchsummary.pdf),
[news release](https://scholar.dominican.edu/cgi/viewcontent.cgi?article=1265&context=news-releases)).
The blueprint cites Matthews, not Future's marketing. The honest
takeaway stands: *a known person who sees your progress roughly doubles
follow-through.* That person is the training partner; the "progress
report" is the trained-this-week ticks — automatic, so the user never
has to write one.

**Apple Activity Sharing mechanics — CONFIRMED** (the philosophical
match the founder named). From Apple's documentation
([Share your activity in Fitness on iPhone](https://support.apple.com/guide/iphone/share-your-activity-iph0b826155d/ios),
[Share your activity from Apple Watch](https://support.apple.com/guide/watch/share-your-activity-apd68a69f5c7/watchos),
[MacRumors how-to](https://www.macrumors.com/how-to/share-activity-friends-apple-watch/)):

- **Invite flow:** person-to-person from the Fitness app Sharing tab via
  contacts; recipient gets a notification and explicitly accepts or
  declines; nothing is shared until acceptance. No public discovery.
- **What's shared:** ring closure, completed workouts (type/duration),
  awards. Notably Apple shares *more* than we will (workout details);
  our receipt is strictly tighter.
- **Notification anatomy:** you can be notified when friends close
  rings, finish workouts, earn awards; notifications are **mutable per
  person** without ending sharing.
- **Reply-to-rings:** from a friend's activity notification you can send
  a preset reply ("smack talk or encouragement") or a custom reply —
  the direct ancestor of the one-tap cheer, minus free text (we keep
  the tap, drop the text: no harassment vector).
- **Hide/mute controls:** you can *hide your activity from a specific
  person while still seeing theirs*, mute their notifications, or
  remove them entirely.
- **Asymmetric fitness levels:** competitions score **percentage of
  your own rings closed** (1 point per percentage point, capped at
  600/day over 7 days, max 4,200) — relative-to-self by construction.
  We adopt the relative-to-self principle and skip competitions
  entirely (anti-feature: no stakes).
- **The retrofit that proves the thesis:** after nine years of requests
  watchOS 11 added rest days that pause rings **without breaking award
  streaks** ([iMore](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks)).
  We ship the "resting" state on day one instead of year nine.

---

## 1. Best-in-market bar

1. **Apple Activity Sharing** (above) — the consent flow, per-person
   mute/hide, derived signals, relative-to-self principle. The single
   best overall reference; its two flaws (workout detail leakage,
   no-rest-day culture pre-watchOS 11) are both corrected in our design.
2. **Duolingo Friend Streak** — the only published, quantified shared
   streak: 22% daily-completion lift, monotonic in partner count
   ([Duolingo](https://blog.duolingo.com/product-lessons-friend-streak/)).
   Proves a *mutual* streak outperforms solo streaks; flaw is the
   punitive break-and-unpair.
3. **Whoop Teams consent architecture** — pre-join preview of exactly
   what is shared, scope immutable after creation, invite codes, leave
   any time ([Teams FAQs](https://support.whoop.com/hc/en-us/articles/360040375353-Teams-FAQs),
   [Team Privacy](https://support.whoop.com/hc/en-us/articles/360058171433-Team-Privacy-);
   round-1 §1.1). The privacy receipt is Whoop's preview rebuilt in
   plain English.
4. **Strava kudos inside reciprocal ties** — the peer-reviewed
   activity lift (Franken et al. 2023, above); acknowledgement without
   ranking.
5. **Fitbit friends-and-family challenges (RIP)** — small, friendly,
   known-people accountability created loyalty deeper than the
   hardware; "many users said challenges were the only reason they
   still used their Fitbit"
   ([9to5Google](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/);
   round-1 §1.6).

## 2. What fails (anti-patterns by name)

All from round-1 (`../competitive-audit-01-accountability-community-research.md`),
which drew the line-in-the-sand this blueprint builds on:

- **Raw-metric comparison** — Strava pace-as-status, "too shy because
  too slow" ([The Mancunion](https://mancunion.com/2026/02/16/is-strava-just-another-toxic-social-media-platform/));
  Peloton's leaderboard hidden by its own power users
  ([Anne Helen Petersen](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of)).
  The meta-analysis (§0) is the clinical version of the same finding.
- **Default-on / public-by-default sharing** — Strava heatmap and the
  Le Monde bodyguard investigation; Hevy public-by-default profiles
  (round-1 §1.3–1.4). Everything here is opt-in, off by default,
  invisible to anyone outside the pair.
- **Punitive shared consequences** — Duolingo's break-removes-pairing;
  league demotion penalising users who hit their own goals
  ([arXiv gamification study](https://arxiv.org/pdf/2203.16175)).
  Nothing a partner does can take anything from you.
- **Open community attached to a calorie tracker** — MFP's
  decade-plus pro-ana moderation battle (round-1 §1.7). No groups, no
  text, no feed; structurally nothing to moderate beyond pairing itself.
- **Social-support overload** — fitness-app over-notification "turns
  enjoyable activities into annoying virtual competitions"
  ([PMC11764542](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11764542/)).
  Hence the hard cheer rate limit and a near-zero push budget (§4.7).
- **The charter's own cautionary tale** — the passive version of this
  exact feature buried in Settings. The placement section (§4.1) exists
  to prove the opposite shape.

## 3. User psychology

- **Moment of need (inviting):** you think of a training partner when
  you are *proud* (just finished a session, just hit a PR, just saw
  your recap) or *planning* (looking at your consistency). Both are
  existing surfaces: the share pipeline and the Progress tab. Nobody
  thinks "I'll check Settings for a friends feature" — the buried
  COMP-017 shape failed before it was built.
- **Moment of need (cheering):** you want to cheer when you learn your
  partner trained — and you are warmest right after *your own* session.
  The post-session summary is the reciprocity moment (§4.4).
- **Habit loop:** cue = partner's tick appears / cheer push arrives;
  action = open Progress, send the one-tap cheer back; reward = the
  shared streak chip and the named acknowledgement ("Sam sent you a
  cheer") within seconds. Matthews (§0): the "progress report to a
  friend" is generated automatically by training — zero extra effort.
- **Effort budget:** invite is share-sheet native (two taps + send);
  cheer is one tap; there is nothing to write, ever. The feature
  *removes* the awkward "did you train this week?" text message between
  gym friends.
- **Emotional safety:** no red states, no "broken", no blame
  attribution; deloads and pauses read as "Resting", lapses as a
  "Quiet week" (§4.5); ED/wellbeing flags freeze outbound signals
  benignly (§5).
- **Word-of-mouth surface:** the invite **is** word of mouth — every
  pairing requires telling a gym friend about Volyume. The tellable
  line: *"it shows my mate whether I trained, and literally nothing
  else."*
- **Trust mechanics:** the privacy receipt shows the working before
  consent (Whoop pattern), both directions, verbatim identical for
  inviter and invitee; unpair is instant and total.

---

## 4. The Volyume implementation

### 4.1 Placement — discovered, not buried

**Durable home: the Progress tab**, as a compact partner row inside the
consistency section, directly beneath COMP-018's streak card (which the
integration map already places on Progress; deep home
`src/screens/ConsistencyScreen.js`). Rationale: Progress is the reflect
surface; the partner signal is a consistency signal; the streak card is
its natural neighbour and the two share one engine (§4.5, §9). The row
joins an existing section — no new screen on the tab, no new tile in
the Explore grid in v1.

**Discovery amplifiers (moment-of-need entries, not homes):**

1. **The share pipeline** — `src/screens/WorkoutSummaryScreen.js`
   already has a share-card footer (`handleShareCard`, ~line 434 →
   `ShareCard` with `sessionData, prData`), and `ShareCardScreen.js`
   exports the story PNG. After a successful export — the user has
   literally just chosen a human to show their training to — one quiet
   line appears below the export confirmation: *"Training with someone?
   Invite them as a partner."* This is the highest-intent entry in the
   app: a specific person is already in mind. Post-PR shares (prData
   present) are the strongest variant of the same moment.
2. **Monthly recap (COMP-005), when it ships** — the recap's share
   moment gains the same line. Dependency-free: the entry rides
   whatever share moments exist at launch.
3. **NOT Home, v1** — agreeing with the hierarchy rule, not merely
   complying. Home is the "do" surface; COMP-027 is fighting to get the
   session hero back to first position; the audit found Home already
   stacks three utility cards above the hero. A partner card on Home is
   passive state-display in the action surface — exactly the energy of
   the rejected passive COMP-017. The only Home presence ever
   permitted: a received cheer may show as a transient toast (not a
   card, not a banner — the banner slot is contested by three existing
   banners with a strict at-most-one rule, `HomeScreen.js` ~743).
4. **Never Settings as the entry.** The You-tab settings page gets only
   the *management* surface (unpair, block, notification preference),
   per the house pattern that Settings manages, never introduces.

### 4.2 Pairing flow

Code/link based, no in-app user search or discovery of any kind
(stronger than Whoop's opt-out searchability: there is nothing to
search).

1. Tap any entry point → **privacy receipt sheet** (§4.3) with a single
   primary button: "Create invite".
2. App generates a single-use, 7-day-expiry invite (unguessable 8+
   character code inside a deep link, `volyume://partner/<code>`, plus
   a universal link landing page in `web/` for partners without the app
   — the landing page states the derived-signals-only promise and links
   to the store; this page is itself a word-of-mouth asset). Code shown
   for manual entry as fallback.
3. OS share sheet sends the link out-of-band (WhatsApp, Messages —
   channels the user already trusts).
4. Partner opens the link → sees **the same receipt verbatim** with the
   inviter's first name → "Accept" or "Decline". Nothing is shared
   before acceptance; declining is silent (inviter just sees the
   invite expire).
5. On acceptance both sides get confirmation and the partner row goes
   live. Acceptance is recorded through the existing consent-log
   pattern (migration 024) as a purpose-extension consent.

Pairing is the one online-required step (code redemption must resolve
cross-user on the server). Acceptable under offline-first: it is a
one-time social handshake; everything after it reads from local cache.

### 4.3 The privacy receipt (verbatim, house voice)

Shown full-screen-sheet at invite creation and again at acceptance.
Identical both directions; first name substituted. No marketing, no
hype, numerals and nouns.

> **Training partners**
>
> You and Sam will each see, about each other:
>
> - Whether you trained this week. Ticks only, like 3 of 4.
> - Your shared streak, counted in weeks.
> - A recovery week or a break shows as "Resting". Never as a fail.
> - Cheers you send each other. One tap, once a day.
>
> Neither of you will ever see the other's:
>
> - Weights lifted, sets, reps or any session detail
> - Body weight, measurements or photos
> - Food, calories or anything from the diary
> - Check-ins or anything said to the coach
> - Location
>
> Either of you can end this at any time, in Settings. Sharing stops
> straight away and what was shared is deleted. The other person sees
> only "Partnership ended".
>
> [Create invite]   [Not now]

Accessibility: the sheet is plain text, screen-reader linear, no
timeout. The bullet lists are the contract; the implementation must be
generated from the same source of truth that the sync payload schema is
documented from, so the receipt can never silently drift from reality
(the trust mechanic the house "show working" rule demands).

### 4.4 The partner card and cheer mechanics

**Partner row (Progress, under the streak card).** One compact row, 44pt
touch targets throughout:

- Partner first name.
- **Trained-this-week ticks:** "3 of 4" as dots — *their sessions done
  vs their own planned count* (relative-to-self; a 6-day lifter and a
  2-day beginner read identically when on-plan). Asymmetry handled by
  construction, the Apple percentage-of-own-rings principle.
- **Shared streak chip:** "6 weeks", or "Resting", or "Quiet week"
  (§4.5).
- **Cheer button** (hand-clap icon). One tap sends; button becomes
  "Cheer sent" (disabled) until local midnight. Last received cheer
  shows as a caption: "Sam cheered you on Tuesday."

States: (1) empty — quiet "Train with a partner" row with chevron;
(2) invite pending — "Invitation sent. Waiting for Sam." with cancel;
(3) active (above); (4) partner resting — moon icon (the
`ConsistencyScreen` deload banner's `moon-outline` precedent) +
"Resting this week"; (5) ended — "Partnership ended." for one view,
then back to the empty state.

**Cheer rate limit:** ~1 per partner per day, enforced twice:
client-side (button state, resets at the sender's local midnight) and
**at the database** — unique constraint on `(pair_id, sender_id,
sent_on)` so the limit is deterministic and unspoofable, not vibes.

**Push copy (category `PARTNER_CHEER`):**

- Title: `Sam sent you a cheer`
- Body: `You trained this week. Sam noticed.`

Terse, named, factual; no exclamation marks, no hype. Tapping
deep-links to the Progress partner row (existing
`notificationRoute.js` pattern). Quiet hours and per-category
preference respected via the existing `scheduler.js`/`quietHours.js`/
`notification_preferences` machinery (migration 044).

**Receiving experience:** push when backgrounded; an in-app toast when
foregrounded. **Never in-session** — `ActiveWorkoutScreen` is sacred
ground per the charter; a cheer arriving mid-session surfaces after, on
the summary. No tab badges (calm surface discipline).

**The reciprocity moment:** on `WorkoutSummaryScreen`, if the partner
has trained this week and you have not cheered today, one quiet footer
line: *"Sam trained this week too."* with an inline "Send a cheer"
button. You just trained; you are at your warmest; the Strava research
says the lift lives in reciprocal ties. This single line is expected to
drive most cheer volume.

### 4.5 Shared streak rules (the no-blame design)

Counted in **training weeks** (Mon–Sun), never days — riding COMP-018's
solo streak state machine exactly:

- A shared week increments when **both partners' own weeks are met**
  (each against their own plan, per COMP-018's definition; deload weeks
  count as met because training went to plan).
- **One partner in a deload/pause/wellbeing state → the shared streak
  shows "Resting" and holds.** It does not grow; it can never read as
  broken. Moon icon, warm copy: "Resting. Streak safe at 6 weeks."
- **One partner lapses (week missed, no pause) → "Quiet week."** The
  streak holds at N. No notification fires; no copy ever attributes the
  quiet week to a person (the ticks make inference possible; the app
  never says it). When both partners next meet a week, counting resumes
  from N+1. This is the deliberate inversion of Duolingo's
  break-and-unpair.
- **After 4 consecutive quiet weeks** the streak gently archives:
  "Start a new run together?" — a stale number is worse than a fresh
  start, but archiving is presented as forward motion, not failure.
- The shared streak is **optional** at pairing (a single toggle on the
  receipt confirmation, default on; partners with it off just exchange
  ticks and cheers).

### 4.6 Asymmetry, abuse and ending

- **Unpair:** silent, immediate, from the partner row's overflow or
  Settings. Other side sees "Partnership ended." — no reason, no
  prompt to ask why, card returns to empty state. All shared rows are
  deleted server-side (§4.8). Neutrality is the feature: ending a
  partnership must cost nothing socially inside the app.
- **Block:** decline and unpair both offer an optional "Don't allow new
  invites from this person." Stored server-side by user id; the invite
  redemption RPC checks it. The blocked person sees only "This invite
  has expired" — indistinguishable from a stale code.
- **No free text anywhere** (cheers are fixed one-tap), so the
  harassment surface is the pairing handshake itself, which is
  out-of-band and code-gated. This is what lets a two-person social
  feature ship without a moderation apparatus (the Peloton/MFP lesson).
- One partner free, up to three on Pro (§4.9): partnerships are
  independent pairs, never a group; no partner can see another
  partner's existence.

### 4.7 Notification budget

Hard budget, v1: **the cheer push only** — by construction max 1 per
partner per day, in practice far fewer; mutable per category via
existing preferences; quiet-hours respected. **No weekly partner
summary push** (the weekly rhythm already belongs to
`WEEKLY_COACH_READY`; partner week state lives on the Progress card and
may, at most, earn one line *inside* the existing weekly coach output
later — never a second push). No "partner trained today" pushes in v1:
the cheer prompt lives in the post-session summary instead
(social-support-overload evidence, §2). New category `PARTNER_CHEER`
added to `categories.js` with channels `[PUSH, IN_APP]`.

### 4.8 Data architecture

All EU Dublin (existing project), derived signals only, no PII beyond
first name (already in profiles), no third parties.

**New tables (three), all additive:**

1. `partnerships` — `id`, `member_a` (inviter), `member_b` (nullable
   until redeemed), `status` ('invited'|'active'|'ended'),
   `invite_code_hash`, `streak_enabled`, `created_at`, `accepted_at`,
   `ended_at`. RLS: SELECT/UPDATE where `auth.uid() IN (member_a,
   member_b)`; INSERT where `auth.uid() = member_a AND status =
   'invited'`. Redemption via a SECURITY DEFINER RPC
   `redeem_partner_invite(code)` (search_path pinned per migration 061
   precedent) so the invitee never reads other users' invites; the RPC
   checks the block list, expiry and single-use.
2. `partner_week_signals` — `(pair_id, user_id, week_start)` PK,
   `planned_count`, `done_count`, `week_met` boolean, `state`
   ('training'|'resting'), `updated_at`. **Tiny derived rows computed
   locally** by the COMP-018 engine and pushed through the sync layer;
   never raw workouts. RLS: SELECT for active pair members (EXISTS on
   partnerships); INSERT/UPDATE only `auth.uid() = user_id`.
3. `partner_cheers` — `id`, `pair_id`, `sender_id`, `sent_on` (date),
   `created_at`; **UNIQUE (pair_id, sender_id, sent_on)** is the rate
   limit. RLS pair-scoped reads, sender-only writes.
4. `partner_blocks` — `(blocker_id, blocked_id)`; readable only by the
   blocker; consulted by the redemption RPC.

**Sync registry:** `partnerships` (pull-mostly, server-authoritative
status), `partner_week_signals` (push own rows, pull partner's),
`partner_cheers` (push own, pull partner's). **This is the honest
engineering cost:** every existing registry entry is user-scoped
(`SYNC_REGISTRY` in `src/lib/sync/registry.js`); partner tables are
**pair-scoped** — the transport (`src/lib/sync/transport.js`, per-table
handlers in `src/lib/sync/tables/`) needs a new pull shape ("rows in my
active pairs where user_id != me"), and `signOutGuard`/wipe logic must
clear the local copies. Contained, but it is a new sync *shape*, not a
new row in an existing shape.

**Push delivery:** the infrastructure exists end-to-end — migration 053
`device_push_tokens`, `src/lib/notifications/pushToken.js` registration,
and the `send-push` edge function (service-role only, Expo fan-out,
dead-token pruning). New edge function `partner-cheer`: authenticated
client call that validates the partnership + rate limit, inserts the
cheer row, and invokes `send-push` internally. Offline cheer taps queue
through the existing sync queue and call the same endpoint on
reconnect ("Will send when you're back online"). Note `send-push`
currently requires `extra.eas.projectId` in app.json (absent at time of
writing, per pushToken.js) — a founder action already queued for the
RTDN payment-failure push; cheers ride the same fix.

**Deletion cascade:** unpair or account delete → partnership row marked
ended + `partner_week_signals` and `partner_cheers` for the pair hard
deleted server-side (extend the `delete-account` function and the
migration 025/062 completeness pattern). Deleting my account ends the
partnership entirely; the partner sees "Partnership ended" — identical
to a manual unpair (no death-vs-departure distinction leaks).

**GDPR:** sharing is a new processing purpose; consent is the recorded
acceptance of the receipt (consent-log pattern, migration 024).
Derived training-attendance signals are health-adjacent: recommend a
DPO sanity check before launch (lighter than COMP-030's full legal
gate, but do not skip it).

### 4.9 Free vs Pro

**Free: one partner. Pro: up to three partners.** Gating a brand-new
feature is allowed; the argument for free-at-the-core is structural:
**a partnership needs both sides to have the feature.** If pairing is
Pro-only, every invite sent to a friend who installs Volyume hits a
paywall before the handshake completes, and the loop — which is also
the app's only built-in acquisition channel — dies at its first step.
Apple Activity Sharing and Duolingo Friend Streak are both free for the
same reason. The Pro expansion to three partners is backed by
Duolingo's own finding that retention rises with each additional
partner slot — the upsell is "more of a thing you already love", the
healthiest paywall shape. Cheers and the shared streak are included at
both tiers. This placement is a founder decision to confirm before
build (gating is absolute; this feature is in neither locked list).

### 4.10 Rollout and the COMP-018 seam

**COMP-018 ships first** — non-negotiable dependency. The seam: the
solo streak engine must expose one pure function, e.g.
`computeWeekState(userId, weekStart) → { planned, done, weekMet,
state: 'training'|'resting' }`, consumed identically by the solo streak
card and (serialised) by `partner_week_signals` rows. Partner signals
are *literally* COMP-018 outputs in transit; no second consistency
engine may exist. Suppression rules (wellbeing/ED) implemented once in
COMP-018 are inherited for free.

Staged ship: **v1** = pairing + receipt + ticks + cheer (the active
loop, the founder's (a)+(c)); **v1.1** = shared streak (the founder's
(b)) once COMP-018's solo definition has a few weeks of production
soak; **later, only if earned** = third-party "coach view" variant
(round-1 §1.9) as a separate decision.

---

## 5. ED/wellbeing interaction (designed, not bolted on)

Inputs: `getOpenEdPatternFlag` (`src/lib/database.js`; flags sync
pull-only via `ed_pattern_flags`) and wellbeing mode
(`src/lib/wellbeing.js`, 'calm').

- **Flag opens or calm mode set → outbound signals freeze benignly.**
  The user's `partner_week_signals` rows stop updating and their state
  is written once as `'resting'`. The partner sees exactly what a
  deload looks like: "Resting this week", streak safe. **Crucially, the
  partner cannot distinguish a wellbeing hold from a planned recovery
  week** — that indistinguishability is the privacy property, and it is
  only achievable because the "Resting" state exists for everyone (the
  forgiveness state doubles as the safety state; this is why it must
  never read as broken for anyone).
- **Shared streak freezes** in "Resting" (holds, never breaks, never
  archives while a flag is open).
- **Cheers: receiving stays allowed** — a cheer is named human warmth
  with zero comparative content, the one social signal the meta-analysis
  gives no reason to fear — but delivery downgrades from push to
  in-app-only while a flag is open (consistent with the existing policy
  that `ED_PATTERN_LOCKOUT`/`FFM_FLOOR_HOLD` are in-app-only because
  pushing at a flagged user is the harm pattern). Sending remains
  unrestricted.
- **No partner-facing change, ever, from flag state.** Nothing in the
  pair surface can reveal that the safety system engaged.
- Nothing here touches `src/coaching/safety/` — the partner layer only
  *reads* flag state through the same accessors the coach already uses.

## 6. Whole-package integration

- **Strengthens COMP-018:** the solo streak gains a "who sees this"
  story and a reason to exist beyond self-report; one engine, two
  surfaces.
- **Strengthens the share pipeline (and COMP-005 when it ships):**
  share moments gain a second, deeper action — share a card outward,
  or bring the person in.
- **Strengthens the privacy positioning (COMP-012 trust row):** the
  receipt makes "nobody else sees anything" demonstrable, not claimed —
  round-1's positioning sentence becomes a screenshotable artefact.
- **Duplication avoided:** no new tab, no new top-level screen, no
  second streak definition, no second notification rhythm, no parallel
  social surface. Net new UI: one row on Progress, one sheet, one
  toast, one summary-footer line.
- **Streamlining effect:** Progress's consistency section becomes the
  single answer to "am I showing up?" — solo and witnessed — rather
  than the app growing a "social area".

## 7. Beating the benchmark

Apple Activity Sharing is the bar, and this design beats it on the
four points where Apple's own users forced corrections: (1) Apple
leaks workout detail to friends; we share ticks only — the receipt
lists what is *not* shared, which Apple has never done. (2) Apple
needed nine years to add rest days; our "Resting" state ships on day
one and doubles as the wellbeing shield, something no competitor has
because no competitor has an ED safety system to integrate with.
(3) Duolingo's shared streak — the only quantified one — punishes a
miss by destroying the pairing; ours holds, renames the week "quiet",
and resumes, keeping the relationship while Duolingo keeps only the
number. (4) Every incumbent's social layer rides a feed or follower
graph it must then moderate; a two-person, no-text, code-paired design
has no moderation surface at all. The result is the only partner
feature on the market a privacy-first, safety-first brand can ship
without contradicting itself — and the invite link markets that fact
in the same breath.

## 8. Measurement

Telemetry allowlist additions (client `src/lib/telemetry/events.js` +
server CHECK, migration-063 pattern; payloads carry counts and booleans,
never partner identity):

1. **Pairing rate:** `partner_invite_sent` → `partner_invite_accepted`
   conversion; % of MAU with an active partnership at D60.
2. **Cheer reciprocity:** % of cheers reciprocated within 7 days
   (`partner_cheer_sent` with `reciprocal` boolean) — the Strava
   evidence says reciprocity, not volume, is the active ingredient.
3. **Retention delta:** D14/D30 retention, paired users vs matched
   solo-streak-only users (Duolingo's 22% daily-completion lift is the
   external benchmark; expect smaller at weekly cadence).
4. **Health of endings:** unpair rate within 30 days and
   `partner_blocked` incidence (expected ≈0; any sustained nonzero
   triggers a design review).

## 9. Build notes

- **Touched:** new — receipt sheet, partner row component, `partner-cheer`
  edge function, `redeem_partner_invite` RPC, 1 cloud migration (3 tables
  + RLS + RPC), web invite landing page; extended — `SYNC_REGISTRY` +
  pair-scoped transport handler + signOutGuard/wipe,
  `notifications/categories.js` + preferences row, `notificationRoute.js`
  deep link, `WorkoutSummaryScreen` footer line, `ShareCardScreen`
  post-export line, Progress consistency section, `delete-account`
  function, telemetry allowlist (client + migration).
- **Reuse:** push pipeline end-to-end (053 + pushToken.js + send-push);
  quiet hours/preferences; consent log; COMP-018's engine (the seam);
  share pipeline; deep-link routing.
- **Effort sanity-check:** founder scored **E3 — optimistic.** The UI
  is genuinely small (E2), but pair-scoped RLS + a new sync shape +
  invite RPC + an edge function + deletion-cascade extension + deep
  links + DPO check is **E5** as specified. The staged v1 (ticks +
  cheer, single free partner, shared streak deferred to v1.1) gets it
  to **E4**. Note round 1 scored the *bigger* COMP-017 (with coach
  view) at E7; E5 for the narrowed scope is consistent.
- **Risks:** (1) the sync layer's user-scoped assumption is load-bearing
  in tests (`sync.regressionMatrix`) — the pair-scoped handler needs its
  own invariant tests, especially around unpair-while-offline; (2)
  `extra.eas.projectId` must land before any push works (already a
  founder action for RTDN); (3) low pairing uptake is the realistic
  failure mode — the share-moment entries are the mitigation, and the
  metric to watch is invite→accept conversion, not invite volume;
  (4) free/Pro placement (§4.9) needs explicit founder confirmation
  before build.

*End of blueprint. No code was modified.*
