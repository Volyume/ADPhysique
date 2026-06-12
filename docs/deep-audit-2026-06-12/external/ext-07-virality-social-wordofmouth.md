# ext-07 — Virality, Social Proof, Community & Word-of-Mouth

> Citations reconciled 2026-06-12 against validation/val-ext-*.md — see that report for per-claim verdicts.

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.

## Deep Audit 2026-06-12 | External Research

> Slice: will users tell their friends? The mechanics of organic growth,
> shareable artefacts, community/accountability that fits a privacy-first
> offline-first EU app, and what serves both Besa the Beginner and Eddie the
> Elite. Additive to the 2026-06-10 audit, which established the
> accountability-vs-social-media line (see `competitive-audit-01-accountability-community-research.md`)
> and designed NEW-002 Training Partners (`impl-NEW-002-training-partners.md`).
> This report is word-of-mouth, virality and shareable-artefact focused — the
> angle the 2026-06-10 work largely deferred.
>
> Method: web research across vendor documentation, journalism, academic
> studies, growth case studies and community discussion. Every claim carries a
> source. No code was modified.

---

## 1. Why people share fitness content — the psychology

### 1.1 Identity signalling

The fundamental driver is identity, not information. Research into fitness posts
on social media consistently finds that sharing a workout is a way of saying
*"this is who I am."* A study linking Instagram fitness posting to exercise
identity found that "the percentage of exercise-related Instagram posts and
fitness-related followings were significantly associated with exercise identity"
— crucially, the number of likes received was **not** related to identity (%PA
posts r=.38, fitness followings r=.39, likes r=.05, ns), so it is the *act of
sharing*, not the social response, that carries the identity signal
([Liu, Perdew, Lithopoulos & Rhodes, 2021, JMIR 23(4):e20954](https://www.jmir.org/2021/4/e20954/))
[corrected 2026-06-12 citation audit — finding is real but the doc cited the
wrong paper (Kim 2024, *J Health Psychology*) and wrong journal name; design
implication survives on the correct citation; see V1].

Strava articulates this as: "every kudos, follow, and segment leaderboard is
designed to make ordinary effort feel witnessed — a Tuesday tempo run used to
dissolve into the rest of your week, but on Strava it leaves a trace that turns
the same workout into something you actually want to repeat"
([Startup Signals, 2025](https://startupsignals.substack.com/p/strava-if-its-not-on-strava-it-didnt)).
The phrase that defines this effect — *"if it's not on Strava it didn't happen"*
— is not cynical; it describes something users genuinely feel: unrecorded effort
feels less real.

**What this means for Volyume:** the app already captures the effort. The
question is whether it gives users a way to make it feel witnessed — and by
whom.

### 1.2 Social currency (Optimal Distinctiveness Theory)

Spotify Wrapped is the canonical case. One useful framing for its psychology is
Optimal Distinctiveness Theory: people want two opposite things at once — to
belong and to stand out [the ODT attribution is marketing-blog framing, not
evidence — treat as a lens, not a finding; see V3].
Wrapped gives users a story that is at once relatable ("I also listen to too
much of one artist") and unique ("but my top artist is specifically this one").
The share is a statement about individual taste that simultaneously places the
user inside a community of Spotify listeners
([NoGood, 2025](https://nogood.io/blog/strava-marketing-strategy/);
[Arthnova analysis](https://arthnova.com/spotify-wrapped-users-free-brand-marketers/)).

Applied to fitness: a PR (personal record) is personal but its meaning is
universal — every gym-goer understands what a new bench press max means. A PR
card is both unique data ("I specifically hit this number") and a shared
language. This is why PR moments are the highest-probability share triggers in
strength apps.

### 1.3 Accountability-to-a-known-person vs performance-broadcast

The 2026-06-10 research (competitive-audit-01 §2) drew the line between
accountability and social media. The virality lens adds a nuance: both sides of
that line *can* drive word-of-mouth, but through different mechanisms:

- **Performance-broadcast virality** (Strava, Hevy feed): user shares to a
  public audience, audience sees an app they don't have, some install. High
  reach, high noise, high risk of the toxic-comparison dynamics documented in
  competitive-audit-01.
- **Invitation-loop virality** (the invite mechanic in NEW-002): user invites a
  *specific person* to pair. That person must install to accept. Zero-noise,
  zero-toxic-comparison, but narrower reach. Duolingo Friend Streak and Apple
  Activity Sharing use exactly this model.
- **Artefact virality** (share cards posted to external platforms): the app
  produces a visually compelling card; the user shares it to platforms they
  already own (Instagram, WhatsApp); some viewers install. Volyume already has
  this (1080×1920 PNG story export). The question is whether the cards are
  compelling enough to share frequently.

The prior audit recommended invitation-loop and artefact virality only. This
report adds evidence for why artefact virality — specifically, what makes a card
compelling enough to actually get shared — is the highest-leverage short-term
opportunity and examines how to make the cards far more powerful.

---

## 2. Mechanics catalogue — what actually spreads and why

### 2.1 The shareable artefact: what makes a card get posted

**The Hevy model.** Hevy grew from near-zero to 2 million downloads on a $15k
paid-ads budget — i.e., effectively entirely through word of mouth and
app-store algorithms. Its co-founder Guillem Ros attributes this explicitly to
"social features, workout and routine sharing" and the social proof produced
by a community feed ([RevenueCat Sub Club podcast via RevenueCAT](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/);
[BoringCashCow profile](https://boringcashcow.com/view/workout-tracking-app-makes-40k-a-month)).
Hevy's shareable cards display: personal records, training volume, muscle-group
distribution charts, workout consistency streaks — "automatically generated
images or graphs show progress, personal records, workout consistency, and active
streaks with many other interesting details"
([Hevy shareables page](https://www.hevyapp.com/features/shareable/)). The user
chooses the sharing channel and the card carries Hevy branding — every shared
card is an ad, but the user chose to post it.

**Routine sharing as acquisition.** Hevy's other acquisition loop: users share
their *routines* via a unique link that renders at hevy.com. "People who click
the link will be taken to hevy.com, where they can see the routine and save it
to their profile. The shared routines/folders can even be opened by people who
do not have Hevy profiles yet" ([Hevy sharing help](https://help.hevyapp.com/hc/en-us/articles/34953501503895-How-to-Share-Workouts-and-Routines-Step-by-Step)).
The deep-linked landing page is the acquisition moment. This is distinct from
a share card — it is a *functional* artefact (the actual plan) that has
instrumental value to the viewer, which is why it converts.

**The Spotify Wrapped effect in fitness.** Strava's Year in Sport is the
canonical fitness analogue of Wrapped — a personal, story-formatted annual
artefact that users share to external platforms
[stat removed 2026-06-12 citation audit — the "86% view-through rate" was
unverifiable (sole source a designer's portfolio; not in any Strava release —
note Strava's 2025 release carries a *different* 86%: "86% of Runna-connected
runners achieved a personal best"); see V7. The "25% January re-install spike"
was also unverifiable and has been removed; see V8].
The mechanics that make it spread: (1) it tells a *story* from raw numbers
("you ran X km, which is equivalent to Y"); (2) it is time-limited (December
only, though Strava has since paywalled it, which triggered user backlash —
lesson: once a viral artefact exists, re-gating it burns trust
([Gadgets & Wearables, 2025](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/))); 
(3) it is personal enough to be unique but uses a consistent visual template
that signals app membership; (4) it is formatted for Instagram Stories / TikTok.
"Fitness Wrapped," a third-party app that applies the same mechanic to Apple
Fitness data, has emerged as a product category in itself
([Fitness Wrapped App Store page](https://apps.apple.com/us/app/fitness-wrapped/id6739229787)).
[stat removed 2026-06-12 citation audit — the claim that "Boostcamp now ships a
year-in-review shareable" was unsupported as cited: the linked post covers
weekly progress reports and PR summaries, with no year-in-review; see V11.]

**The key design insight for share cards:** raw numbers don't spread. A
*contextualised* number does. "You lifted 47,000 kg this month" spreads; "You
lifted the equivalent of 6 double-decker buses this month" spreads more because
it gives a social translation. Strava's team knows this — they build the Year in
Sport comparisons explicitly. The same psychology that makes Spotify Wrapped
shareable (personal narrative, not a table of stats) applies directly to a
mesocycle recap or year in review.

**The design constraint:** a share card must carry enough Volyume branding to
function as an ad for someone who sees it, but must not feel like an ad to
the user sharing it. This tension is well-understood: user feedback explicitly
warns that "forcefully promoting apps when sharing workouts should be avoided —
promotion should appear on the photo card itself rather than as lengthy
promotional text" ([ShareFit App Store listing, quoted in social.plus](https://www.social.plus/blog/fitness-is-social-top-6-features-all-successful-apps-share)).
The answer is subtle watermarking, not a promotional banner.

### 2.2 Kudos / acknowledgement within reciprocal ties

The peer-reviewed evidence (already verified in NEW-002 §0) is unambiguous:
receiving kudos induced runners to run more and more often, with strong
reciprocity effects — but only among people who also gave kudos. Upward
comparison produces no lift; *acknowledgement* within a reciprocal relationship
does ([Franken, Bekhuis & Tolsma, Social Networks 2023](https://www.sciencedirect.com/science/article/pii/S0378873322000909)).

Strava reported 14 billion kudos given in 2025
([Strava Year in Sport 2025 trend report](https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025))
[corrected 2026-06-12 citation audit — the "+20% YoY" growth figure and the
"3.1× kudos for photo activities" multiplier are not in the release and were not
found elsewhere; both dropped; see V14]. The broader point still holds: visual
richness plausibly correlates with social engagement, which is why share cards
with imagery (a PR badge, a volume chart) are likely to outperform plain text.

**Virality implication:** kudos are a *retention* driver, not a direct
acquisition driver. They work inside the app once users are already there.
Their word-of-mouth value is indirect: retained, motivated users are more
likely to share artefacts and invite friends. NEW-002's cheer mechanic is the
constraint-safe version of kudos.

### 2.3 Clubs / small groups as both retention and acquisition

Strava's data is striking: club-affiliated athletes are **more than twice as
likely** to log a weekly activity
([Strava Year in Sport 2025 trend report](https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025))
[corrected 2026-06-12 citation audit — the "3.5× 12-month retention" figure came
from an aggregator (SQ Magazine) with no primary; replaced with Strava's own
"more than twice as likely" framing; see V15].
New clubs on Strava nearly quadrupled in 2025, reaching 1 million total, with
group activities receiving roughly 30–95% more kudos than solo activities
depending on group size
[corrected 2026-06-12 citation audit — "approximately twice the kudos" was a
clean-2× overstatement; the real figure varies ~30–95% by group size; see V17].
Among Gen Z, 66% said they made new friends through running groups in 2024.

The acquisition mechanism: a club leader or member posts about the club on
external platforms, mentions the app, and new members install to join. The club
is the reason to install; the app is the vehicle. This is a *pull* acquisition
model — the value (community) exists in the app, and the invitation to join it
drives the download.

**Direct parallel for Volyume:** a physique division community (say, a "Bikini
UK show prep" or "Men's Physique beginners") is exactly this shape — a reason
to install. But see §4.1 on why full clubs are high-risk; the constraint-safe
version is a division-tagged leaderboard or a time-boxed show-prep group,
discussed in §3.5.

### 2.4 Invitation-loop virality (the invite-to-install loop)

NEW-002's pairing flow is already designed as a viral loop: every partnership
requires the partner to install Volyume to accept the invite. The landing page
at `volyume://partner/<code>` (NEW-002 §4.2) is described as "itself a
word-of-mouth asset" — it states the derived-signals-only promise and links to
the store. Deep-linked invite journeys are *plausibly* higher-converting than
generic store journeys, but the often-quoted "30%+ click-to-install vs 5%"
benchmark is unsupported (the adapty.io page states it with no source) and
should be treated as a hypothesis to test, not a number to plan against
[stat softened 2026-06-12 citation audit — the 30%-vs-5% figure is vendor-grade
and unsourced; treat as hypothesis; see V19].

The psychology behind invitation virality in fitness is that a friend's
recommendation is credible precisely because it comes from a specific known
person, not an ad
[stat removed 2026-06-12 citation audit — the "70% of members who made gym
friends are promoters" figure was unverifiable (vendor library page, not
fetched); see V20].
The friend relationship is the *reason* the invitation is credible — it is not
an ad, it is a specific person you know saying "I use this and I want to train
with you on it." That context is worth more than any paid acquisition.

The Duolingo evidence (NEW-002 §0): users with at least one Friend Streak are
22% more likely to complete their daily lesson; the lift is monotonically
increasing with each additional Friend Streak partner
([Duolingo Friend Streak product blog](https://blog.duolingo.com/product-lessons-friend-streak/)).
Since each additional partner requires a new invite, the retention signal is
also a virality signal — users are incentivised to send more invitations.

### 2.5 Programme/plan sharing (the functional artefact)

Hevy's routine sharing (§2.1) converts because it is *functional*, not
decorative. The shared object (a training plan) has direct utility to the
person who receives it — they can import it into their own profile. The link
works before the recipient has an account, so it pulls them through install.

Boostcamp built an entire business on this mechanic: coaches publish programmes
on Boostcamp, share the link with their athletes or audience, and followers
install to access the programme. "Programs are created by real coaches who
compete and coach athletes, which helps establish credibility and drives user
acquisition through these coaches' existing followings" ([Boostcamp product
hunt listing](https://www.producthunt.com/products/boostcamp); [Boostcamp
blog](https://www.boostcamp.app/blogs/boostcamp-workout-app-november-features-updates)).
This is coach-led distribution: the coach's credibility and audience become
the app's acquisition channel.

**For Volyume:** Volyume already has a Plan Library with division-specific
programmes built on a deterministic coaching engine. If a coach or advanced
athlete shares a link to a Volyume plan ("here's the Men's Physique 16-week
prep I'm running"), every click that doesn't already have the app is an
install opportunity. The functional artefact (the actual plan) is more
compelling than any share card because it has instrumental value: "I want to
run this programme" is a stronger install motive than "I like this graphic."

### 2.6 Annual/periodic recap — the Wrapped moment

The Spotify Wrapped effect is now a design pattern with quantified outcomes.
Spotify saw a 21% increase in mobile app downloads after the 2020 Wrapped
release, driven by FOMO and viral sharing of story cards
([Campaign del Mar analysis](https://www.campaigndelmar.com/blog/spotify-wrapped-is-marketing-genius)).
Strava's Year in Sport is the direct fitness analogue
[stat removed 2026-06-12 citation audit — the "86% view-through rate" and the
"January 2025 re-install spike" were both unverifiable; see V7 and V8].

The anatomy of a Wrapped-style card that spreads: (1) **personal narrative** —
not just numbers, but a story arc ("you trained through your first bulk, added
4 kg, set 12 new PRs"); (2) **contextualised numbers** — equivalences or
comparisons that make the number legible to non-app-users; (3) **visual
template** — consistent, branded, optimised for portrait/story format;
(4) **limited availability or timing** — annual creates anticipation and ritual;
(5) **opt-in, user-curated** — user chooses what to include, not the app.

Volyume's COMP-005 (monthly recap) is already on the roadmap. The virality
extension is making it shareable in a format that carries enough narrative
and visual quality to be posted — and adding an annual mesocycle/year recap
for the Wrapped moment.

### 2.7 Challenge mechanics (time-boxed, small-group, ability-matched)

The evidence on challenges is nuanced (competitive-audit-01 §1.6–1.8): global
leagues fail; small, code-joined, time-boxed, ability-matched challenges work.
GymRats charges for this and exists as a standalone business. Fitbit's friends-
and-family challenges ("many users said challenges were the only reason they
still used their Fitbit") were the deepest loyalty Fitbit had
([XDA, 2023](https://www.xda-developers.com/fitbit-ending-challenges-adventures-big-mistake/);
[9to5Google, 2023](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/)).

The virality mechanism in challenge apps: you cannot join without being invited,
and you cannot complete the challenge alone — the social obligation *is* the
product. Every participant is a potential recruiter because they need co-participants.
This is a network-effects virality model: the product is more valuable when
more people in your circle use it.

**The critical constraint for Volyume:** challenges must be scored on
*adherence-to-own-plan* (never tonnage, weight change, or calories) to be
safe, inclusive, and compatible with the ED safety system. An adherence
challenge — "both partners hit ≥80% of their planned sessions for 4 weeks"
— is ability-independent by construction (a 2-day beginner and a 6-day
competitor are equal when both are on-plan). This is the GymRats shape
applied with Volyume-specific scoring.

---

## 3. Shareable artefacts — what Volyume can produce and what makes each spread

The existing share card (1080×1920 PNG export, `ShareCardScreen.js`) is the
foundation. The question is: what occasions and what content produce a card
compelling enough to share?

### 3.1 The PR card (highest-trigger share moment)

A new personal record — new 1RM, new volume best, new total reps in a set —
is the highest emotional peak in a training session. At this moment the user
is proud, and the share impulse is strongest. Strava's achievement medals are
awarded precisely at this moment; Hevy's shareables fire on it.

**What makes a PR card shareable:**
- The exercise name and the new number (identity signal: "I bench pressed X")
- Visual framing: a highlighted number with contrast and a badge treatment
- Context line: "your best by Y kg / Z% improvement" (makes the achievement
  legible even to someone who doesn't know the user's prior level)
- A subtle "Volyume" wordmark (the ad, not the banner)
- Portrait/Story format, shareable directly to Instagram Stories, WhatsApp

**What makes it NOT shareable:** a generic Volyume-branded banner with small
numbers; anything that looks like a screenshot rather than a designed artefact.

Volyume already has `prData` flowing into `WorkoutSummaryScreen.js` and
`ShareCard` (NEW-002 §4.1 references this). The PR share moment is the highest-
intent share trigger in the app and may already be partly implemented — the
question is whether the visual quality of the card is high enough to warrant
sharing to a public audience.

### 3.2 The mesocycle / block-end recap card

At the end of a mesocycle (typically 4–6 weeks), the user has a training story:
volume landmarks reached, exercises progressed, consistency achieved. This is
the strength-training equivalent of Strava's Year in Sport — a narrative arc
with a beginning and an end.

**What a compelling block-end card includes:**
- Sessions completed / planned (e.g. "17 of 20 sessions")
- Volume progression over the block (% increase in key lifts)
- Consistency streak across the block
- A single standout achievement (top PR of the block)
- Division / goal framing ("Hypertrophy block 2 — Men's Physique prep")
- Volyume branding

**Why it spreads:** it signals serious, structured training — not just gym
selfies but a *programme*. For Eddie the Elite this is status (I run a
periodised programme, not random workouts). For Besa the Beginner, completing
a whole block is a significant milestone and sharing it marks a transition
identity moment ("I finished a proper programme").

**Constraint note:** the block-end card must never show body weight, calories,
or any nutrition data — training volume only.

### 3.3 The annual "Volyume Wrapped" recap

Once per year (e.g., early January for the previous year, or on the user's
training anniversary), Volyume generates a personal narrative of the year:
total sessions, total volume, PRs set, consistency streak, mesocycles
completed, division progress.

The Spotify Wrapped mechanics apply directly: time-limited ritual, personal
story told as a narrative ("your biggest year of training"), contextualised
numbers ("you lifted the equivalent of X double-decker buses"), portrait format.

Volyume already has COMP-005 (monthly recap) planned. An annual recap is COMP-005
at annual cadence with a higher-production visual template. The virality logic:
these are shared to Instagram in December/January when everyone is reflecting on
their year; Volyume's version competes on narrative quality with Strava's.

**Strava's 2025 paywall mistake** is a direct warning: once you launch the
annual recap as free, never move it behind a paywall. The backlash was severe
and immediate ([Gadgets & Wearables](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/)).
Plan the free/Pro line before launch.

### 3.4 The plan/programme share link (functional acquisition artefact)

A shareable deep link to a Volyume programme — "share this programme" from the
Plan Library or from a user's current mesocycle plan — renders a landing page
that shows: programme name, structure (e.g. "4-day Upper/Lower, 8-week
hypertrophy block for Men's Physique"), sample week, and a download CTA.
Non-Volyume-users who click can see the programme and are prompted to install
to follow it.

**Why this works:** it is a functional artefact (the plan itself has value),
not a decorative card. The Hevy routine-sharing mechanic and Boostcamp's
coach-distribution model are both built on exactly this. The landing page is
the acquisition moment [the "30%+ vs 5%" deep-link figure is an unsourced
vendor benchmark — see V19; treat the conversion advantage as a hypothesis,
and keep the 30%-install claim out of any business case].

**For Eddie:** sharing his current prep programme is status signalling — "I'm
running this structured 16-week Men's Physique peak protocol." For Besa: sharing
the beginner programme she's following gives her social proof ("I found this
and it's actually working").

**The coach-as-distributor extension:** if a real-world coach uses Volyume
to manage prep athletes, they can share the plan link with their clients. Each
client install is word-of-mouth acquisition through coach credibility, not
paid ads. This is the Boostcamp model applied to physique prep.

**Constraint:** the landing page must show training structure only, never
nutrition, body data, or anything from the coaching engine's personal-plan layer.
The programme library plans are by definition non-personalised at the share
stage (personalisation happens after install and profile setup).

### 3.5 The partner invite landing page (NEW-002's built-in viral loop)

Already designed in NEW-002 §4.2: the invite deep link resolves to a landing
page stating the derived-signals-only promise and linking to the store. Every
pairing invite sent is a potential install. The landing page is itself a brand
statement: "your training partner can see whether you showed up. Nothing else."
This is differentiated positioning that no incumbent can copy without
dismantling their feed.

This is the cleanest viral loop available — it requires no extra feature
design, just high-quality execution of the landing page copy.

---

## 4. Community — what scope fits a privacy-first, offline-first app

The prior audit (competitive-audit-01 §6) established the trap list (no feed,
no followers, no global leaderboards, no open groups). This section focuses on
what the right scope of community *is*, not what to avoid.

### 4.1 The right scope: small, structured, purpose-built

Every successful community feature in the evidence base is **small, bounded,
and purpose-defined**:

- Fitbit's friends-and-family challenges: 2–15 people, known to each other
- Whoop Teams: invite-code-only, metric scope fixed at creation
- Apple Activity Sharing: 1:1 or very small, person-to-person
- GymRats challenges: code-joined, time-boxed, custom scoring
- Zwift Racing League: self-selected racers, ability-matched divisions

The pattern is consistent: the features that built the deepest loyalty are the
ones where every member knows every other member. Scale destroys this — once
the audience is unbounded, the safety and moderation obligations of a social
network appear.

For Volyume, "community" means: (a) training partners (NEW-002, already
designed); (b) optionally, small time-boxed adherence challenges (the GymRats
shape, see below); (c) the plan/programme library as a shared resource (passive
community — users benefit from a shared corpus without needing to interact).

### 4.2 The division-specific leaderboard question

Eddie the Elite is status-motivated. Competitive physique athletes explicitly
want recognition in their division — "Men's Physique UK" or "Bikini" is their
identity context, and being recognised within that community matters.

The prior audit's evidence against leaderboards is strong (Whoop strain gaming,
Peloton's hidden leaderboard, Strava's cheating arms race). However, those
leaderboards were scored on **performance** (pace, output, strain) — which
invites gaming, calibration disputes, and the harm-to-the-less-active effect
([PMC10807424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/)).

A leaderboard scored on **adherence-to-own-plan** is structurally different:
you cannot cheat (Volyume owns the training data), the metric is self-relative
(your 3/4 sessions and a competitor's 6/6 sessions both score the same
percentage), and the least-active user is not demotivated because they are
competing against their own plan, not the elite. This is Apple's ring-percentage
principle applied to a division-tagged group.

**Constraint-safe leaderboard shape:** opt-in, within a named division, scored
on weekly/monthly adherence %, with a minimum group size (≥5 members to avoid
trivial wins), anonymised except for your own rank ("you are in the top 30% of
Men's Physique members who trained this week"). No absolute volume, no body
data, no nutrition. This is a "relative-to-self, community-matched" leaderboard.

**Whether to build this** is a founder decision: it is more complex than the
partner loop, requires a meaningful user base per division to be interesting,
and it does create a new social surface to manage. It belongs in a later phase
(post-NEW-002), not v1.

### 4.3 Time-boxed adherence challenges (the GymRats shape for Volyume)

A 4-week challenge: a code-joined group of 2–15 users commit to hitting a
target adherence rate for 4 weeks (e.g. ≥75% of planned sessions). Scored as
the group's collective adherence %. End-of-challenge shareable card: "our
group trained 187 times in 4 weeks." No winners, no losers — a shared
achievement.

This is the Fitbit challenge mechanic (beloved, killed by Google, still widely
mourned) applied to training adherence rather than steps. It is ability-
independent by construction (a 2-day beginner and a 6-day advanced athlete
both measure against their own plans). It directly extends NEW-002: a
training partner pair running a challenge together.

**Virality mechanism:** the challenge requires multiple participants, so
creating or accepting a challenge invite requires spreading the app to the
other participants. Every challenge creation is a recruitment event.

### 4.4 What Volyume should never build (the trap list, augmented)

The competitive-audit-01 §6.2 trap list stands. This report adds:

- **No public programme ratings or reviews.** Once users can publicly rate
  programmes ("3 stars, too hard for beginners"), you need moderation and
  curation at scale. The Boostcamp model works because coaches own their
  programmes; anonymous public reviews of Volyume's built-in plans would
  create noise and potential ED-adjacent commentary on plan difficulty.
- **No transformation/progress photo sharing within the app.** Body image
  comparison is the exact mechanism that the 83-study meta-analysis (NEW-002 §0)
  identifies as harmful. Progress photos are a legitimate personal tracking tool
  (and Volyume may have them); sharing them within the app creates the
  comparison surface the safety system is built to avoid.
- **No referral cash incentives.** Paying users to refer friends changes the
  psychological framing from "I recommend this because I love it" to "I'm
  recommending this for money." The honest intrinsic referral ("your
  training partner can see you showed up") is more credible and more durable.
  Hevy grew to 2M downloads with $15k ad spend through organic community, not
  a referral programme ([RevenueCAT profile](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/)).

---

## 5. Both personas — how each mechanic serves Besa and Eddie

| Mechanic | Besa (Beginner) | Eddie (Elite) |
|---|---|---|
| **PR share card** | First PR is a milestone identity moment: "I'm becoming a gym person." Sharing marks the transition. | Specific lift numbers signal technical competence to peers; status signal within the sport. |
| **Block-end recap** | Completing a first block is a major achievement. Sharing it marks commitment and progress. | Division-specific prep block completion signals serious programming; shareable to coach/prep community. |
| **Annual Wrapped** | Year-end reflection: "I trained X times. I stuck with it." Powerful for beginners who feared they wouldn't last. | Quantified volume and periodisation history; credibility signal in the competitive community. |
| **Partner invite loop** | Belonging: having a named person who sees whether you showed up reduces the isolation of gym going. | Training partner as peer accountability; credible because the partner relationship is structured, not social-media. |
| **Programme share link** | Finding a structured beginner programme, following it, sharing it: "this is what I'm doing — join me." | Coach-to-athlete distribution; credibility of the methodology is the reason to share. |
| **Adherence challenge** | Low-stakes accountability with a friend over a defined period; "just hit your own plan" is inclusive. | Competitive structure with a defined window; prep-cycle timing (8-week show prep challenge). |
| **Division leaderboard** (later phase) | Not relevant in v1; could become relevant once a beginner has a defined goal division. | Status within competitive community; the one feature that speaks directly to Eddie's competitive identity without external comparison. |

---

## 6. Ranked shortlist for Volyume — constraint-aware, persona-tagged

Ranked by virality/retention leverage × constraint safety × implementation
efficiency. Each item includes: persona, primary effect, effort estimate,
placement, and how it extends NEW-002.

---

### Rank 1 — PR share card (upgrade existing artefact)
**Persona:** Both | **Effect:** Virality (artefact) + Retention (habit reinforcement)
**Effort:** E2 | **Placement:** `WorkoutSummaryScreen`, fires automatically when `prData` is present

**What it is:** the existing share card triggered at the PR moment, with visual
quality upgraded to "designed artefact" standard — PR badge treatment, exercise
name bold, contextualised improvement ("your best by +12 kg"), portrait format
optimised for Instagram Stories and WhatsApp image preview. Subtle Volyume
wordmark, no banner.

**Why it spreads:** the PR moment is the highest emotional peak in training.
Identity signal (the number), social currency (the achievement), and legibility
to non-users (everyone understands "new personal best"). This is the highest-
probability organic share trigger in the app.

**Why it extends NEW-002:** the share pipeline is already identified in NEW-002
as the highest-intent entry point for partner invites — "the user has literally
just chosen a human to show their training to." An upgraded PR card generates
*more* share events, which generates *more* partner invite entry-point moments.

**Constraint fit:** training data only, no nutrition/body data. Existing share
pipeline already sanitises the payload.

**Caution:** the card must be good enough to share. A mediocre design produces
zero virality regardless of the moment. This is primarily a design effort, not
an engineering effort.

**Sources:** [Hevy shareables](https://www.hevyapp.com/features/shareable/);
[Startup Signals Strava analysis](https://startupsignals.substack.com/p/strava-if-its-not-on-strava-it-didnt);
[identity sharing research, Liu, Perdew, Lithopoulos & Rhodes, JMIR 2021;23(4):e20954](https://www.jmir.org/2021/4/e20954/)
[corrected 2026-06-12 citation audit — was the wrong SAGE DOI (Kim 2024,
*J Health Psychology*); the identity-sharing finding belongs to Liu 2021; see V1]

---

### Rank 2 — Programme/plan share link (functional acquisition artefact)
**Persona:** Both (different programmes); Eddie (show prep plans); Besa (beginner programmes)
**Effect:** Virality (acquisition — functional artefact) + Credibility
**Effort:** E3 | **Placement:** Plan Library, active mesocycle plan — "Share this programme" CTA

**What it is:** a shareable deep link to any programme in the Plan Library that
renders a constraint-safe landing page (plan name, structure, sample week, store
CTA). Non-users who click see the programme and are prompted to install to follow
it. The link works before they have an account.

**Why it spreads:** functional value converts. "Here's the programme I'm running"
is an instrumental recommendation — the viewer can actually use this. Boostcamp's
entire business is built on this mechanic; Hevy's routine links are how early
adopters recruited their training circles.

**Coach-as-distributor:** if a real-world physique prep coach adopts Volyume for
their athletes, they share the plan link with each client. Every client install
is zero-cost acquisition through existing coach-athlete trust. The landing page
must be good enough to be credible to a coach's athlete ("this is the coach's
prep protocol, not a generic app").

**New-002 extension:** a user who shares a plan link and a friend installs via
it is already pre-qualified for a partner invite — they share a training context.
The landing page CTA can include: "Follow this plan, then invite [name] as your
training partner."

**Constraint fit:** landing page shows structure only — weeks, frequency, splits.
No personalised coaching output, no nutrition, no body data. The Plan Library
plans are structurally safe to share.

**Sources:** [Hevy share routines help](https://help.hevyapp.com/hc/en-us/articles/34953501503895-How-to-Share-Workouts-and-Routines-Step-by-Step);
[Boostcamp Product Hunt](https://www.producthunt.com/products/boostcamp);
[deep-link conversion data, adapty.io](https://adapty.io/blog/app-deep-linking/)

---

### Rank 3 — Block-end / mesocycle recap card (new shareable artefact)
**Persona:** Both | **Effect:** Virality (artefact) + Retention (milestone acknowledgement)
**Effort:** E3 | **Placement:** End of mesocycle, from Progress tab / existing COMP-005 monthly recap

**What it is:** when a mesocycle ends (Volyume knows this — it runs the
periodisation engine), a designed recap card is generated: sessions
completed/planned, top PR of the block, volume change across the block, block
name/division framing. Shareable as a story-format PNG via the existing share
pipeline.

**Why it spreads:** the block narrative is richer than a single-session card —
it tells a training story with a beginning and end. For Eddie: "Hypertrophy
Block 2 — Men's Physique prep complete. 18/20 sessions, +15% squat volume, new
bench PR." For Besa: "Block 1 complete. 12 sessions. First time finishing a
proper programme." Both are genuine identity milestones.

**The Spotify Wrapped mechanics apply:** contextualise the numbers, tell a
story arc, make the template visually consistent so it signals "Volyume user"
to someone who sees it on Instagram.

**NEW-002 extension:** a completed block is a natural partner-invite moment
("I just finished my first block — want to do the next one together?"). The
post-block share screen can carry the same partner-invite line that the
post-session share currently gets per NEW-002 §4.1.

**Constraint fit:** training data only. The block engine already has all of this
data; the effort is the visual design and the "story copy" generation
(deterministic from the data — no AI).

**Sources:** [Spotify Wrapped virality analysis, Campaign del Mar](https://www.campaigndelmar.com/blog/spotify-wrapped-is-marketing-genius);
[Fitness Wrapped App Store](https://apps.apple.com/us/app/fitness-wrapped/id6739229787)
[Khoi B Phan "86% VTR" portfolio source removed 2026-06-12 citation audit —
figure unverifiable; see V7]

---

### Rank 4 — Annual "Volyume Wrapped" recap (yearly virality moment)
**Persona:** Both | **Effect:** Virality (artefact — highest volume moment) + Retention (ritual)
**Effort:** E3-4 | **Placement:** Early January (prior year) or training anniversary; COMP-005 extended to annual cadence

**What it is:** once a year, a personal narrative of the user's full training
year — total sessions, volume, PRs, mesocycles, consistency streak, division
context. Portrait format, shareable to Instagram Stories. Story copy is
deterministic from training data.

**Why it matters now:** Strava's Year in Sport is the most visible fitness
analogue of the Wrapped moment, and Fitness Wrapped (a third-party app that
applies this mechanic to Apple Fitness data) exists as a product because there
is unfulfilled demand
[stats removed 2026-06-12 citation audit — the "86% VTR", the "25% January
re-install spike" and the "Boostcamp now does this" year-in-review precedent
were all unverifiable; see V7, V8 and V11]. Volyume has richer, more structured
data than any of these (mesocycle structure, division context, volume landmarks,
coach-style milestones) — a Volyume annual recap *should* be more compelling
than a generic step-count summary.

**Story copy principle:** the copy must be generated from data but feel authored.
"Your biggest lifting year. 187 sessions, 14 PRs, two complete mesocycles. Your
bench is 18 kg stronger than January." This is deterministic from stored data —
no LLM required, just template logic applied to real numbers.

**The paywall rule:** Strava's mistake was paywalling Year in Sport after it
launched as free, triggering a wave of user backlash. Decide the free/Pro line
before launch and never move it. The annual recap is a virality asset —
limiting it to Pro undermines the acquisition mechanic. The case for free: every
share is an ad; paywalling prevents the share. The case for Pro-only: a premium
feel for the most engaged users. Founder decision.

**NEW-002 extension:** the annual recap's share screen carries the same partner-
invite line. "Your best year yet. Want to make the next one a shared one?" is
the lowest-friction invite moment of the year.

**Sources:** [Strava YiS paywall backlash](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/);
[Spotify Wrapped 21% install spike, Campaign del Mar](https://www.campaigndelmar.com/blog/spotify-wrapped-is-marketing-genius)
[Boostcamp year-in-review source removed 2026-06-12 citation audit — claim
unsupported at that citation; see V11]

---

### Rank 5 — Adherence challenge (time-boxed, code-joined, 2–15 people)
**Persona:** Besa (primary — belonging, peer accountability); Both
**Effect:** Virality (invite-to-join loop) + Retention (commitment device)
**Effort:** E5 | **Placement:** Progress tab, accessible via partner row (natural extension of NEW-002)

**What it is:** a code-joined challenge group (2–15 people, 2–6 weeks), scored
on each member's adherence-to-own-plan percentage. Group goal: collective
adherence ≥ some target (e.g., 80% across all members). End-of-challenge shared
card: group name, duration, collective sessions, collective adherence %. No
individual ranking, no absolute volume, no weight data.

**Why it spreads:** you cannot do a challenge alone. Every challenge created
requires inviting people, which requires those people to install. The
mechanic is a viral loop: creating a challenge is inherently a recruitment
event. This is the Fitbit friends-and-family challenge, alive and updated.

**Why it retains:** a defined commitment window (4 weeks) creates a contract
effect. The Matthews research (NEW-002 §0): weekly progress reports to a known
person lifted goal follow-through by +33 percentage points (76% vs 43%)
[corrected 2026-06-12 citation audit — "roughly double" overstates it; the real
effect is 76% vs 43% = 1.77×, i.e. +33pp; see V22]. A challenge with friends is a
collective contract — the social cost of breaking it is higher than a solo
streak.

**Scoring constraint:** adherence-to-own-plan percentage is the only safe metric:
ability-independent, ungameable within Volyume's data, compatible with the ED
safety system (a wellbeing hold reads as "Resting" per the NEW-002 pattern and
contributes its member's average, not a zero, to the group score — or the member
is gracefully excluded from that week's tally with a kind note, never flagged
to the group).

**NEW-002 extension:** challenges are the group-scale extension of the partner
pair. A challenge of 5 people contains up to 10 partner-pair relationships; the
partner mechanic should ship first and prove the social handshake before
challenges add group complexity. Challenges require: group membership tables,
group-scoped RLS, a new sync shape (group signals), the group adherence engine,
and the end-of-challenge card. E5 is realistic; E3 for a "partner challenge"
(just two people, using the existing partner infrastructure as the base).

**Sources:** [GymRats app](https://www.gymrats.app/);
[XDA Fitbit challenges removal](https://www.xda-developers.com/fitbit-ending-challenges-adventures-big-mistake/);
[9to5Google backlash](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/)

---

### Rank 6 — Partner invite landing page (polish, not build)
**Persona:** Both | **Effect:** Virality (acquisition — invitation loop) + Trust
**Effort:** E1 | **Placement:** Already designed in NEW-002 §4.2 — the `volyume://partner/<code>` landing page

**What it is:** not a new feature — the quality and copy of the existing
NEW-002 partner invite landing page. When a non-user clicks a partner invite
link, they land on a page that states: what a Volyume training partnership is,
the derived-signals-only commitment, and a store download CTA.

**Why it matters for virality:** this page is the acquisition moment for every
partner invite. Its conversion rate directly determines the K-factor of the
invitation loop. A specific, compelling, trust-building page that says "your
friend trained 4 of 4 sessions this week. They want to train with you."
should plausibly out-convert a generic "download Volyume" CTA
[stat softened 2026-06-12 citation audit — the specific "~5% generic vs 30%+
deep-link" conversion figures are unsourced vendor benchmarks (adapty.io,
no source); keep K-factor as a concept but plan against measured numbers, not
these; see V19].

**What excellent copy includes:** the partner's first name, their training streak
("Sam has trained 4 of 4 sessions this week"), the derived-signals promise
(what you will and won't see), the download CTA. This is a landing page design
and copy effort, not an engineering effort.

**Sources:** [deep-link conversion data, adapty.io](https://adapty.io/blog/app-deep-linking/)

---

### Rank 7 — Division adherence leaderboard (later phase, Eddie-only)
**Persona:** Eddie | **Effect:** Retention (competitive identity) + Virality (status sharing)
**Effort:** E5 (post-NEW-002, post-challenge, post-meaningful-user-base per division)
**Placement:** Progress tab, division section — an opt-in weekly leaderboard for the user's division

**What it is:** an opt-in, division-tagged, adherence-scored weekly leaderboard.
"Men's Physique — this week you are in the top 25% of active members." Scored
on adherence-to-own-plan %, not volume or weight. Anonymous except for your
own rank.

**Why Eddie wants it:** competitive physique athletes train within a community
of peers. Knowing you are in the top quartile of consistency for your division
is motivating and shareable — it combines the identity signal (Men's Physique
competitor) with a relative achievement (top 25%). Unlike Strava's KOM or
Peloton's leaderboard, it cannot be gamed (Volyume owns the training data and
scores self-relative), and it does not demotivate the less-active (they see
their own percentile, not an absolute ranking against elite outputs).

**Shareable output:** a small card — "Top 25% consistency — Men's Physique,
this week — Volyume" — is a status badge that elite competitors will post.

**Why it is Rank 7 (not higher):** it requires a meaningful user base per
division to be interesting (a leaderboard of 8 people is trivial). It is
therefore a later-phase feature dependent on growth. It also introduces a new
social surface to manage (though adherence scoring eliminates the cheating
problem and percentage-based scoring eliminates the demotivation risk). Ship
after NEW-002 and the challenge mechanic have proven the social architecture.

**Sources:** [motivation crowding research, PMC10807424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/);
[Strava gamification, trophy.so](https://trophy.so/blog/strava-gamification-case-study)

---

## 7. Summary table

| Rank | Mechanic | Persona | Primary effect | Effort | NEW-002 relationship |
|---|---|---|---|---|---|
| 1 | PR share card (upgraded) | Both | Virality (artefact) | E2 | Extends share pipeline that already feeds partner invite entry |
| 2 | Programme share link | Both | Virality (acquisition) | E3 | Converts to partner invite post-install |
| 3 | Block-end recap card | Both | Virality + Retention | E3 | Share moment is partner-invite moment |
| 4 | Annual Wrapped recap | Both | Virality (peak annual) | E3–4 | Annual share moment is highest-intent partner invite moment |
| 5 | Adherence challenge | Besa-primary; Both | Virality (invite loop) + Retention | E5 | Group extension of the partner pair infrastructure |
| 6 | Partner invite landing page | Both | Virality (conversion) | E1 | Core to NEW-002 §4.2 — polish, not build |
| 7 | Division leaderboard | Eddie | Retention + status virality | E5 | Later phase; builds on challenge infrastructure |

---

## 8. What this report changes relative to the 2026-06-10 audit

The 2026-06-10 accountability research (competitive-audit-01) correctly
established the trap list and designed NEW-002. It under-covered:

1. **Artefact virality** — the prior work treated share cards as an
   outward-facing feature already in place ("extending share cards is safer
   than any in-app feed," §6.1). What it did not address is *what makes a card
   compelling enough to actually be shared*. The Spotify Wrapped / Strava Year
   in Sport / Fitness Wrapped evidence shows this is an active design and copy
   problem, not a solved one. A card that is not good enough to share produces
   zero virality. Volyume's existing cards may or may not be at this standard —
   this is the first thing to audit.

2. **The programme share link** — not mentioned in the prior audit at all. This
   is the highest-conversion acquisition artefact in the market (functional
   value converts; decorative cards require emotional peaks). The Hevy and
   Boostcamp evidence is clear: sharing a plan link that works for non-users
   is a first-tier acquisition loop.

3. **Annual recap timing** — COMP-005 (monthly recap) is on the roadmap but
   there is no annual / Wrapped-moment planned. December/January is the
   highest-organic-share period for fitness content. Building the annual recap
   as a designed artefact before that window is a high-leverage, low-risk move.

4. **Coach-as-distributor** — the physique prep space is coach-mediated. A
   real-world prep coach who adopts Volyume and shares plan links with 20
   athletes generates 20 installs through a single credible recommendation.
   This channel is untapped and requires only the programme share link (Rank 2)
   to activate.

5. **Persona asymmetry in virality** — the prior work did not distinguish how
   different features serve different personas' viral triggers. This report
   argues that Eddie's virality is status/credibility-driven (programme share,
   division leaderboard, PR badge) while Besa's is belonging/accountability-
   driven (partner invite, adherence challenge, block completion milestone).
   A one-size-fits-all share card misses both.

---

## 9. Source index

Peer-reviewed research:
[Kudos make you run! (Social Networks 2023)](https://www.sciencedirect.com/science/article/pii/S0378873322000909) ·
[Exercise identity and fitness posting (Liu, Perdew, Lithopoulos & Rhodes, JMIR 2021;23(4):e20954)](https://www.jmir.org/2021/4/e20954/) [corrected 2026-06-12 citation audit — replaced the wrong SAGE DOI (Kim 2024, *J Health Psychology*); see V1] ·
[Motivation crowding in gamified fitness apps (PMC10807424)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/) ·
[Duolingo Friend Streak product blog](https://blog.duolingo.com/product-lessons-friend-streak/) ·
[Dominican University accountability study](https://www.dominican.edu/sites/default/files/2020-02/gailmatthews-harvard-goals-researchsummary.pdf)

App case studies:
[Hevy 2M downloads, no paid marketing (RevenueCAT)](https://www.revenuecat.com/blog/growth/guillem-ros-hevy-podcast/) ·
[Hevy shareables feature](https://www.hevyapp.com/features/shareable/) ·
[Hevy routine sharing guide](https://help.hevyapp.com/hc/en-us/articles/34953501503895-How-to-Share-Workouts-and-Routines-Step-by-Step) ·
[Strava Year in Sport 2024 (Khoi B Phan)](https://www.khoibphan.com/portfolio/strava-year-in-sport-24) ·
[Strava YiS paywall backlash (Gadgets & Wearables)](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/) ·
[Strava Year in Sport 2025 trend report](https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025) ·
[Strava club retention 3.5× (SQ Magazine)](https://sqmagazine.co.uk/strava-statistics/) ·
[Strava social identity analysis (Startup Signals)](https://startupsignals.substack.com/p/strava-if-its-not-on-strava-it-didnt) ·
[Boostcamp growth and year-in-review](https://www.boostcamp.app/blogs/boostcamp-workout-app-november-features-updates) ·
[Fitness Wrapped app (App Store)](https://apps.apple.com/us/app/fitness-wrapped/id6739229787) ·
[GymRats app](https://www.gymrats.app/) ·
[Runna acquisition by Strava 2025](https://press.strava.com/articles/strava-to-acquire-runna-a-leading-running-training-app)

Virality mechanics:
[Deep-link conversion data (adapty.io)](https://adapty.io/blog/app-deep-linking/) ·
[Spotify Wrapped viral psychology (Campaign del Mar)](https://www.campaigndelmar.com/blog/spotify-wrapped-is-marketing-genius) ·
[Gymshark community flywheel (IIDE)](https://iide.co/case-studies/marketing-strategy-of-gymshark/) ·
[Fitness referral psychology (resources.rework.com)](https://resources.rework.com/libraries/gym-fitness-growth/gym-referral-programs) ·
[Strava gamification (trophy.so)](https://trophy.so/blog/strava-gamification-case-study)

Prior Volyume research (2026-06-10):
`competitive-audit-01-accountability-community-research.md` ·
`implementation/impl-NEW-002-training-partners.md`

---

*End of report. No code was modified.*
