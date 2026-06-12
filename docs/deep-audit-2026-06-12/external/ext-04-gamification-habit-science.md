# ext-04 — Gamification, Streaks, Habit Formation & Behaviour-Change Mechanics

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.

## Deep Audit 2026-06-12 | Research agent: gamification slice

> **Scope:** What drives daily return and word-of-mouth in fitness apps; which mechanics
> are appropriate for a dual-market physique tool serving nervous beginners (Besa) AND
> serious competitors (Eddie); and how to go beyond COMP-018's already-shipped weekly
> streak. All ideas must comply with: no AI/LLM, offline-first, ED-safety suppression,
> British English, free/Pro gating absolute.
>
> This report is additive to the 2026-06-10 competitive audit. It assumes the reader
> knows COMP-018 (weekly shame-free streak — already shipped), COMP-005 (monthly recap),
> the Year of Lifts story screen, the WorkoutSummaryScreen share-card flow, and the
> accountability research in `competitive-audit-01-accountability-community-research.md`.
> It does NOT re-tread those. It goes further.

---

## Part 1 — Mechanics Catalogue

### 1.1 The Streak — what the industry has learned, beyond COMP-018

**How it works (the full picture):**
A streak is a counter of consecutive days (or periods) in which the user completes a
target behaviour. The psychological power comes from three converging mechanisms:

1. **Loss aversion.** People experience losses roughly twice as intensely as equivalent
   gains (Kahneman & Tversky). A 60-day streak is not just 60 days of progress — losing
   it feels like losing 60 days of effort. Duolingo's own data shows that streak
   motivation varies non-linearly: going from 2 to 3 days feels like +50%, going from
   200 to 201 feels like +0.5%. Early streak-building is the highest-leverage window.
   ([Duolingo: Streak System Detailed Breakdown, Premjit Singha, Medium](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f))

2. **Endowment effect / sunk cost.** The longer the streak, the more "owned" it becomes.
   A randomised trial with step goals showed participants given an endowment that was
   deducted for failure met their goals 50% more often than those given the same amount
   as a reward — mathematically identical conditions, opposite psychology.
   ([Loss aversion in app retention, Glance](https://thisisglance.com/learning-centre/how-can-loss-aversion-psychology-transform-app-retention/))

3. **Zeigarnik effect.** Uncompleted tasks are remembered more vividly than completed
   ones. An in-progress streak creates a permanent open loop the brain wants to close.
   ([Psychology of Streaks, Cohorty Blog](https://blog.cohorty.app/the-psychology-of-streaks-why-they-work-and-when-they-backfire/))

**Duolingo's full retention machine — what 600+ A/B tests produced:**
- 32 million daily active users carry a 7+ day streak (2024 data).
- Streak Freeze: users can pre-purchase protection against a missed day. Introduction
  reduced churn by 21% among at-risk users.
  ([Trophy — Designing Streaks for Long-Term Growth](https://trophy.so/blog/designing-streaks-for-long-term-user-growth))
- Users with streak-freeze functionality average 17.19 days of streak vs 11.62 days
  without — a 48% longer average streak length.
- Streak Repair: if a streak is lost, users can restore it within a window (using
  premium currency). The "sunk cost" psychology makes many users pay.
- Streak Society: a social layer for users above a threshold (e.g., 30 days) that
  provides community recognition without requiring any public leaderboard.
- Push notification lifecycle: Duolingo calibrates push frequency to the streak — a
  3-day streak gets a different cadence than a 100-day one. Notification volume
  actually reduces for long streaks because intrinsic motivation has taken over.
  ([Duolingo Streak Mechanics, Audiencers](https://theaudiencers.com/55-learn-from-duolingos-impressive-streak-retention-strategy/))
- iOS widget with streak count: when added, user commitment surged 60% in one test.
  ([Smashing Magazine — Designing A Streak System, 2026](https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/))
- Churn declined from 47% (2020) to 28% (2024) in Western markets; streaks are cited
  as the single most effective retention lever in the product.

**The dark side — and why Volyume's design already avoids most of it:**
- Streak anxiety is documented: users report "going to extreme lengths to maintain
  their streaks" even at the cost of the underlying goal (learning vanishes, the
  number remains).
  ([Streak Creep, The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification))
- A 2026 study "From immersion to burnout" (PMC12913498) documents anxiety and
  motivational exhaustion as a direct pathway from high-pressure gamified health
  systems. The mechanism: guilt on a missed day in a health context feels like
  "evidence of a character flaw", not a game failure.
- Duolingo has been listed for dark patterns including shame-based push notifications
  ("You made Duo sad 😢"). Research from 2014 found repeated guilt-induction leads to
  resistance and anger toward the product.
  ([Deceptive Patterns — Duolingo, deceptive.design](https://www.deceptive.design/brands/duolingo))
- Overjustification effect: external rewards (badges, streaks, points) can crowd out
  intrinsic motivation. If a user starts tracking workouts "to keep the streak" rather
  than because they enjoy training, removing the gamification collapses the habit.
  ([Motivation crowding, PMC10807424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/))

**What COMP-018 already gets right:** weekly cadence (not daily — eliminates daily-
deadline pressure), plan-relative counting (rest days and deloads count as compliance),
repair mechanic (one sub-target week bridged per rolling 6 weeks), ED/wellbeing flag
suppression (the entire surface goes dark, not punitive). These are best-practice
responses to every documented failure mode above.

**What COMP-018 does NOT yet have:** (see Part 2 for proposals)
- Milestone moment: 4/12/26/52-week thresholds exist in `streakState.js`
  (`MILESTONES = [4, 12, 26, 52]`) but the celebration/share UX is not built.
- Widget: the streak number has no home-screen presence.
- Streak warmth language: milestones need copy that reinforces identity
  ("You've trained consistently for 12 weeks. That's a physique.") not just a number.
- Streak Repair equivalent: the auto-repair exists but is silent — no user-facing
  mercy signal that shows the bridge was applied and the run is intact.

---

### 1.2 Milestone Badges and Achievement Moments

**How they work:**
A milestone is a threshold crossing that converts an accumulating number into a
memorable event. The psychology is simple but powerful: dopamine is released in
anticipation of a reward AND on receiving it; a visible, unearned milestone is a
free reward the app can manufacture from data it already has.

**Industry evidence:**
- Users who complete at least one achievement on their first day in an app retain at
  33.42%, versus 20.46% for those who don't — a 64% difference in day-1 retention.
  ([Nike Run Club Gamification Case Study, Trophy](https://trophy.so/blog/nike-run-club-gamification-case-study))
- Nike Run Club: milestones at race distances (5K, 10K, half-marathon, marathon) and
  cumulative lifetime-distance badges. Time-limited challenges regularly go viral —
  NRC saw ~400,000 new iOS downloads in the US in early 2026 from a seasonal challenge.
- Trainerize/ABC Coach: automated milestone badges with shareable cards have become
  table-stakes in B2B coach platforms.
  ([ABC Trainerize — Milestone Badges](https://help.trainerize.com/hc/en-us/articles/360041662991-Motivate-Your-Clients-with-Milestone-Badges-for-Workouts-and-Achievements))

**The shareable moment:** A milestone is the highest-leverage instant to prompt a
share, because the user has just experienced a genuine positive emotion (pride, not
vanity) and the content is personal and specific ("100 sessions in", "my first 12-week
block"). Hevy's shareables research shows workouts, PRs, and monthly stats are the
most-shared items — all are milestone-adjacent.
([Hevy Social Media Shareables](https://www.hevyapp.com/features/shareable/))

**Failure mode:** Badge inflation. If every logged set earns a badge, each badge is
worth nothing (overjustification). Milestones must be spaced and earned. The correct
design is: rare, specific, named — not a badge for every session.

---

### 1.3 Personal Record (PR) Celebration

**How it works:**
The ActiveWorkoutScreen already detects PRs in real time (`showPRCelebration` in the
store). A PR is the strongest natural reward signal the app can surface: objective,
unambiguous, completely attributable to the user's own effort. No gamification layer
required — this is intrinsic motivation with an extrinsic trigger.

**Psychology:**
PR detection hits all three Self-Determination Theory needs simultaneously:
- **Competence:** "I am objectively better than I was."
- **Autonomy:** "I chose to push that weight."
- **Relatedness:** "My app acknowledged it." (or, with sharing: "My people know.")
([SDT and gamification, NN/g](https://www.nngroup.com/articles/autonomy-relatedness-competence/))

**The sharing angle:** The WorkoutSummaryScreen already passes `detectedPRs` to the
ShareCardScreen. The share card is Volyume's existing virality valve. The question is
whether the PR moment itself (in-session, live) is big enough to feel share-worthy and
whether the post-session funnel to share is frictionless.

**Competitor benchmark:** Hevy surfaces PR counts prominently in its social shareables
(number of PRs in a month, personal bests with specific exercises and weights). Its
shareable design is the most direct competitor model for what Volyume's share card
does today.

---

### 1.4 The Wrapped / Year-in-Review Mechanic

**How it works (Spotify Wrapped model):**
A once-a-year or once-a-block compilation of the user's data into a swipeable story
format (full-screen cards, one stat per card, advance by tap). The content is
hyper-personal (it IS your data), presented in a shareable, branded format that users
post on social media without any monetary incentive.

**Scale evidence:**
- Spotify Wrapped 2025 reached 200 million engaged users in ~24 hours (vs 62 hours in
  2024 — a 3× improvement). Over 60 million shares annually.
  ([Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase/))
- Users become brand evangelists because the content is about THEM: "personalised
  content engineered for public consumption". The viral coefficient approaches 1
  because every share exposes the app to the sharer's entire social network.
  ([NoGood — Spotify Wrapped Strategy](https://nogood.io/blog/spotify-wrapped-marketing-strategy/))
- 71% of consumers are more likely to act based on friends' social media posts;
  81% say their purchases are impacted by friends' posts.

**Volyume already has this:** The YearOfLiftsScreen is a Spotify Wrapped-style swipeable
story (the comment in the file is explicit: "Spotify Wrapped proved that the swipe-story
is the format people actually read"). The monthly recap (COMP-005) is the same mechanic
on a shorter cycle, including the neutral/calm mode for ED-flag users.

**What is missing / can go further:**
- The Year of Lifts is not clearly surfaced or prompted in the app flow. Discovery is
  the current gap, not the feature.
- The monthly recap cards do not have a one-tap share flow (they are internal screens
  only, no PNG export).
- There is no explicit "block completed" share-card equivalent (the block-end recap
  exists in WorkoutSummaryScreen but is positioned as an internal review, not an
  external shareable).
- The "wrapped" mechanic has peak sharing behaviour because of the social obligation
  to share alongside the community — Volyume's version lacks the seasonal-moment
  framing ("It's December — see your year").

---

### 1.5 The Habit Loop and Cue Architecture

**The science:**
Charles Duhigg's cue-routine-reward model (The Power of Habit) and BJ Fogg's Tiny
Habits / Fogg Behavior Model (Motivation × Ability × Prompt) converge on the same
insight: a habit is not a behaviour, it is a neural pathway triggered by a cue. The
cue does not need to be a push notification — it can be a time of day, a preceding
behaviour, a physical object (gym bag, phone), or a social trigger.

Research shows the average time to form a new habit is ~66 days (not the mythical
21 days). The first 14 days are highest-churn because the cue-routine-reward loop
is not yet automatic.
([Duke Health — How New Habits Are Created](https://dhwblog.dukehealth.org/how-new-habits-are-created-and-what-makes-them-stick/))

**The "first workout" as the D0 activation moment:**
For a fitness app, "activation" is the user's first completed workout. Before that
event, the app has no habit to build from. After it, the app has a routine (training
day → open app → log sets) that can be reinforced.

**Fogg's Tiny Habits for fitness apps:**
- The cue must be contextually anchored: "After I walk into the gym" > "every day at
  7pm" (time-based cues decay when life changes).
- The behaviour must be tiny at first: "log one set" is easier than "complete the
  whole session" — and users who log one set almost always complete the session.
- The reward must be immediate and emotional: a "well done" on the set logging
  completion, not a badge that arrives 10 minutes later in a notification.

**Volyume's existing cue architecture:**
- Training-day reminder notifications (NOTIFICATIONS_LOCKED.md): a cue to open the app.
- Home tab "next planned workout" CTA: a cue to start.
- Pre-workout intent prompt (COMP-008): habit-anchoring to an existing routine
  (soreness/energy/sleep) without cognitive overhead.
- The gap: there is no gentle re-entry cue for users who have lapsed for 3–5 days —
  the day-3 moment (COMP-023) addresses this but only within the 14-day trial window.

---

### 1.6 Variable Rewards and the Intermittent Schedule

**The science:**
Variable ratio reinforcement schedules produce the highest rates of behaviour AND the
most resistance to extinction. More dopamine is released in anticipation of a reward
than in receiving it, and variable delivery maximises this anticipation. This is the
mechanism behind slot machines, social media feeds, and notification timing in consumer
apps.
([Variable Rewards in Product Design, Appcues](https://www.appcues.com/blog/variable-rewards))

**Application to fitness:**
In a fitness context, variable rewards must be tied to genuine performance variance,
not random delivery. The correct implementation is:
- A PR is inherently variable (you do not know when one will happen).
- A milestone is semi-variable (you know a 52-week streak is coming, but not exactly
  what the celebration will be).
- A "surprise" end-of-week recap that surfaces a stat the user did not know about
  (e.g., "You hit a new volume PR for your chest this week") creates variable reward
  psychology without randomness.

**The counterfeit version (avoid):**
Random badges, random confetti on non-events, "Good job!" on every single set. This is
the overjustification trap — it converts a genuine reward (a PR) into noise.

---

### 1.7 The Gentler Streak / Rest-Positive Model

**How it works:**
Gentler Streak (2022 Apple Watch App of the Year, 2024 Apple Design Award for Social
Impact) inverts the traditional streak: the daily goal is a moving band that lowers
after hard days and raises after easy ones. Rest days count toward the streak. The
app "rewards little bits of exercise throughout a day, like dog-walking or daily
chores."
([Apple Developer — Behind the Design: Gentler Streak](https://developer.apple.com/news/?id=3m0ht22s))
([Sketch Blog — How Gentler Streak brings kindness to fitness](https://www.sketch.com/blog/gentler-streak/))

Users explicitly contrast it with Apple's rings, which "feel like high pressure and
lead to feelings of failure". watchOS 11 added rest days to Apple rings after 9 years
of user requests — a tacit admission that rest-shame was the system's primary failure.
([iMore — After 9 years, the feature Apple Watch users begged for](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks))

**Why this matters for Volyume:**
COMP-018's design is already Gentler-Streak-aligned: deloads and rest days count as
compliance; the streak is weekly, not daily; ED/wellbeing flags suppress the surface
entirely. The brand positioning ("your body, your rate") is a natural home for
rest-positive framing. What Volyume can do that Gentler Streak cannot: it knows
the user's actual training plan, so it can distinguish a prescribed rest day (your
plan says no training today — that counts) from an unplanned skip.

---

### 1.8 Social Sharing and Virality Mechanics — the evidence base

**How sharing drives installs (the funnel):**
Every share of a workout card, a PR, or a milestone is an impression on the sharer's
social network, with a provenance signal ("this is my actual data from this app").
Organic app downloads make up ~69% of all App Store downloads; social proof is a
primary driver of organic discovery.
([Wezom — How to Make a Mobile App Go Viral](https://wezom.com/blog/how-to-make-a-mobile-app-go-viral-in-2025-proven-growth-strategies))

The viral coefficient (K-factor) measures new users per existing user. K > 1 is
self-sustaining growth. For fitness apps, K is structurally lower than social apps
because fitness content is more personal and less habitually shared — but the quality
of each share (high credibility, specific personal data) is higher than a like or
retweet.
([AppSamurai — K-Factor](https://appsamurai.com/blog/what-is-k-factor-for-apps-and-how-to-calculate/))

**What Strava actually proved:**
Strava's growth ran on what happens natively: athletes share routes and clubs develop
real-world meet-ups; every shared activity acts as a "micro-ad" with no spend. The
Kudos system generated 14 billion interactions in 2025 (+20% YoY). The peer-reviewed
evidence (Social Networks, 2023) showed kudos-recipients run more often AND more
frequently — a rare case where a social mechanic demonstrably improves the underlying
health behaviour.
([Strava Gamification Strategy, Trophy](https://trophy.so/blog/strava-gamification-case-study))
([Kudos make you run!, Social Networks 2023](https://www.sciencedirect.com/science/article/pii/S0378873322000909))

The failure mode: Strava's heatmap leaked military base locations (2018) and its
default-public profiles enabled the Le Monde journalists to track Biden and Macron via
44 bodyguards' accounts (2024). Public-by-default sharing of fitness data is not
manageable at scale. Volyume's private-by-default architecture is the correct posture.

**BeReal as a counter-model:**
BeReal's streak mechanic creates "social obligation" — both parties must post within
the 2-minute window or the streak breaks. This is a reliable daily-return driver, but
the mechanism is coercive: "it kind of guilt-trips you if you miss that 2-minute ping."
([Deconstructor of Fun — Features Worth Borrowing](https://www.deconstructoroffun.com/blog/2025/08/25/features-worth-stea-borrowing-lessons-from-duolingo-tinder-draftkings-cryptocom-bereal))
For a health app with an ED safety system, social obligation is a contraindication:
it turns the app into a source of shame rather than support.

**Snapchat streaks:** Same mechanism, same failure mode for a health context. The
shared streak creates reciprocal social pressure that is healthy for a 16-year-old
who wants to talk to friends, and counterproductive for anyone training around an ED
pattern or going through injury/illness.

---

### 1.9 Narrative / Story Mechanics (Zombies, Run! model)

**How it works:**
Zombies, Run! (Six to Start, launched 2012, 10+ million downloads) wraps runs in an
audio narrative where the user is a survivor completing missions, with the story
advancing only if the user actually runs. The mechanic is dissociation: the story
diverts attention from the exertion, prolonging sessions. A 2021 qualitative study
(UCL, published Games for Health Journal) found feelings of immersion and presence
were the most cited favourite features; participants ran longer sessions.
([UCL — Zombies, Run! Users' Engagement study](https://discovery.ucl.ac.uk/id/eprint/10139156/))

**What went wrong (relevant lessons):**
- The persistent social spin-off (Racelink) was shut down in 2019; event-based
  community survived. Always-on social networks around narrative games do not stick.
- The virtual race format (twice-yearly, paid, with an anonymity option on
  leaderboards) outlived everything else. Time-boxed events with optional anonymity
  are the social format that respects both competitive and private users.
([Zombies, Run! Wikipedia](https://en.wikipedia.org/wiki/Zombies,_Run!))

**Fit for Volyume:** The coaching engine already has narrative — the coach explains
every decision in context (COMP-006 methodology). A narrative "story" layer wrapping
the training block ("Week 5 of 8. Your volume has climbed to MAV on three muscles. The
next deload will be prescribed when your body asks for it.") is deterministic coaching
copy, not AI. This is a micro-narrative that builds between sessions, not audio
during a run — a different mechanic but the same principle.

---

### 1.10 Fitocracy — the post-mortem for gamification-first strategy

**What Fitocracy got right:**
Fitocracy (2011–2016) was the first app to put genuine gamification (XP, levels,
achievements) on top of workout logging. It worked: millions of workouts logged, NYT
and TechCrunch coverage. The social layer (forums, feed, quests, following training
partners) was described as "a movement, not just an app." Kudos-style encouragement
within a community of serious lifters demonstrably motivated consistent training.
([The Titan Life — Fitocracy Post-Mortem](https://the-titan-life.com/2025/08/28/what-really-killed-fitocracy-the-mistakes-that-doomed-a-great-fitness-app/))

**Why it died:**
1. **XP and levels detached from real training quality.** Users found XP exploits
   (spam-logging bodyweight squats) and the competitive leaderboard became meaningless.
   Goodhart's law: any metric becomes a target, ceasing to be a good measure.
2. **The mobile UX aged badly while rivals shipped.** Logging friction killed the
   underlying habit the gamification was supposed to reinforce.
3. **Community discovery broke.** New users couldn't find their people; the "movement"
   feeling required a critical mass of engaged users that thinned.
4. **Pivoting to coaching (Fitocracy Coach) without fixing the core product.** The
   pivot satisfied neither the gamification users nor the coaching market.

**The single lesson:** Gamification reinforces a habit it cannot replace. If the
underlying product (the logging screen, the coaching, the plan) is not excellent,
gamification delays churn by weeks, not months. Volyume's coaching engine is the
moat; gamification is a habit-formation layer on top of it, not a substitute.

---

### 1.11 Habitica (RPG model) — what transfers and what does not

**How it works:**
Tasks become quests; completing them earns XP, gold, and equipment. Missing dailies
deals damage to the character's HP. The RPG metaphor maps well to the commitment-
consistency dynamic: "my character's survival depends on my habits."
([Habitica Wikipedia](https://en.wikipedia.org/wiki/Habitica))
([Habitica Gamification Strategy, Trophy](https://trophy.so/blog/habitica-gamification-case-study))

**What transfers to fitness:**
- Party quests (a group of users jointly completes a challenge, boss takes damage from
  everyone's completions) are the correct model for small-group challenges where
  individual performance matters to the group — without leaderboard competition.
- The abstraction layer (XP, not kilos) protects against the comparison-to-others
  toxicity that plagues absolute-metric leaderboards.

**What does not transfer to a physique tool:**
- The RPG aesthetic is explicitly childish/casual. Eddie the Elite would uninstall
  immediately if his workout data were described as "defeating a boss monster."
- Character damage for missed dailies is the "shame" mechanic at its most naked.
  For a user with an ED pattern, receiving "your character took damage because you
  didn't train today" is clinically contraindicated.
- The dual-market audience for Volyume cannot share a single RPG metaphor. The
  coaching engine speaks to both; an RPG layer speaks only to one and alienates the
  other.

---

### 1.12 Finch (the gentle model) — what transfers

**How it works:**
Finch is a virtual pet app where a bird grows as users complete daily wellness tasks.
It explicitly avoids penalties: nothing bad happens when you miss a day. The design
is "soft, cosy, warm" with copy that is "supportive but not cheesy." It won a strong
following among users with anxiety, depression, and neurodivergence who found
standard health apps punishing.
([Yoga Journal — The Finch Self-Care App](https://www.yogajournal.com/lifestyle/finch-self-care-app/))
([CLT Counseling — Finch App Review](https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review))

**What transfers:**
- The "no punishment for absence" model is correct for any user group at risk of
  shame-based motivation collapse — i.e., Besa in weeks 2–4 of training, and any user
  under a wellbeing flag. Volyume already implements this for the streak (suppression
  under ED flags). Extending it to notification copy (never "you've been inactive" —
  always "your next session is ready when you are") is a copy/tone task.
- The daily check-in as pet-care loop: Finch turns the wellbeing check-in into a
  daily ritual with a visible payoff (the bird grows). Volyume's weekly check-in
  already serves the coaching engine — a lighter daily mood signal (Besa tier only?)
  could serve the same habit-anchoring function without the RPG aesthetic.

**What does not transfer:**
- The virtual pet is, again, too playful for a competition-prep tool. Eddie would
  not accept a bird as a stand-in for his FFMI.
- Finch's gentle design deliberately excludes performance metrics. Volyume's core
  value proposition is precision performance data. These are in tension.

---

### 1.13 Self-Determination Theory as the north star

**The theory (Deci & Ryan):**
Intrinsic motivation — the kind that survives the removal of external rewards — is
supported by satisfying three basic psychological needs:

1. **Autonomy:** the user feels they are acting by choice, not coercion.
2. **Competence:** the user perceives themselves as effective and improving.
3. **Relatedness:** the user feels meaningfully connected to others who matter.

Extrinsic rewards (badges, streaks, points) support intrinsic motivation when they
provide competence feedback in an autonomy-preserving way — and undermine it when
they replace the user's own goals with the app's metrics.
([NN/g — Autonomy, Relatedness, and Competence in UX Design](https://www.nngroup.com/articles/autonomy-relatedness-competence/))
([Yu-kai Chou — SDT Guide](https://yukaichou.com/gamification-analysis/self-determination-theory-guide-to-ryan-and-decis-motivation-framework/))

**Mapping to the dual market:**
- **Besa** needs competence signals most — "look what you can do now that you
  couldn't four weeks ago." Streaks that count against her own plan (not a global
  average) deliver this. First-session milestones, first-PR celebrations, and
  monthly recap cards are competence feedback.
- **Eddie** needs autonomy most — he already has competence and does not want the app
  patronising him with a badge for hitting a workout he scheduled himself. His gamification
  is PR-based (objective, data-dense, private) and block-completion milestones (meaningful
  to his periodisation philosophy, not condescending). He wants data, not cheerleading.
- **Relatedness** for both comes not from leaderboards but from the Training Partner
  (NEW-002) — one named person who knows whether he showed up.

**The dual-market gamification line:**
Mechanics that serve Besa but alienate Eddie: virtual pets, XP meters, leagues,
confetti on every session, emoji-heavy milestone cards.
Mechanics that serve Eddie but disengage Besa: raw performance leaderboards, complex
periodisation metrics without plain-language translation, badge inflation tied to
volume numbers she does not yet understand.
Mechanics that serve both: PR celebrations (objective, privately meaningful), block-
completion milestones (plan-relative, not compared to others), consistency streaks
(her-plan-as-target, rest-aware), the Year of Lifts story, and share cards (personal,
optional, user-controlled).

---

## Part 2 — Ranked Shortlist for Volyume

The following are ordered by expected retention/virality leverage, filtered through
the hard constraints, and explicitly tagged. "Already partly there" means the
engine or data exists but the UX delivery does not.

---

### G1 — Streak Milestone Celebrations with a Share Moment
**Rank: 1 | Effort: Low | Personas: Both | Effect: Retention + Virality**

**What:** `streakState.js` already defines `MILESTONES = [4, 12, 26, 52]` and
`pendingMilestone()`. The engine already tracks them. There is no UX surface yet
— no celebration moment, no share prompt, no milestone card.

**How:**
- At the end of a workout session where `pendingMilestone(runLength)` returns a
  value, the WorkoutSummaryScreen (or a sheet overlaid on it) shows a milestone card
  with a distinctive visual, a single line of identity-affirming copy, and a one-tap
  share option that routes to the existing ShareCardScreen with a milestone-specific
  template.
- Copy examples (British English, never hyperbolic):
  - 4 weeks: "Four weeks of training, done. Your body is already adapting."
  - 12 weeks: "Twelve weeks. A full mesocycle of consistency. That's a physique habit."
  - 26 weeks: "Half a year. Most people are still thinking about starting."
  - 52 weeks: "A year. You're not the person who started this."
- The milestone card IS the share card — no extra step. One tap to post.
- Under ED/wellbeing flag: milestone card is suppressed entirely (consistent with
  COMP-018's suppression rule). The milestone is recorded (`milestonesSeen`) so it
  does not re-trigger on flag removal.

**Why it drives virality:** A milestone share is the highest-credential fitness post
possible — "I have trained for 52 weeks" — with Volyume branding baked in. It is not
performative ("look how I look") but evidential ("look what I did"). This is precisely
the kind of share that makes non-users think "I want to be able to post that."

**Placement:** WorkoutSummaryScreen, fired once per milestone via `pendingMilestone`.
Already has the data. Already has the share flow to ShareCardScreen.

**Constraint check:** No AI. Offline (computed from local data). ED flag suppressed.
Free tier eligible (streaks are free-tier; the share card is not behind a gate).

**Disagreement with prior audit:** COMP-018 marks the streak as "habit retention;
feeds recap and partner-view later." The milestone celebration + share is the virality
surface that was left implicit. It should be an explicit ship target for the same sprint
as COMP-018 UX delivery.

---

### G2 — PR-to-Share Pipeline: friction reduction + PR summary card
**Rank: 2 | Effort: Low–Medium | Personas: Both (especially Eddie) | Effect: Virality + Retention**

**What:** The PR detection already fires in ActiveWorkoutScreen. The WorkoutSummaryScreen
already passes `detectedPRs` to ShareCardScreen. The gap: the in-session PR celebration
(`showPRCelebration` in store) is a modal overlay that appears and disappears — it does
not offer an immediate share option. The post-session funnel to share requires navigating
WorkoutSummary → tap Share → ShareCard. Two taps after completing a session is one tap
too many.

**How:**
- In the PR celebration overlay (in-session): add a secondary "Share" action alongside
  the dismiss. This fires the ShareCardScreen with PR-specific content (exercise, new
  weight/reps, e1RM delta). Do not require session to be finished first.
- In WorkoutSummaryScreen: when `detectedPRs.length > 0`, make the share button
  primary and label it "Share your PR" not just "Share". Lower the visual hierarchy
  of the Close button.
- The share card template for a PR should surface: exercise name, new top set, the
  delta from previous PR ("bench press: +5 kg"), and the Volyume wordmark.
- For Eddie: the PRs that matter are e1RM improvements on compound lifts. The share
  card should show the calculated e1RM delta, not just the raw weight — this is the
  metric serious lifters talk about.

**Why it drives virality:** "New bench PR" is one of the most-shared gym moments across
all social platforms. Volyume already has the data and the flow. This is a funnel-
optimisation task: reduce the friction from "I got a PR" to "I shared my PR" from
4 steps to 2.

**Placement:** ActiveWorkoutScreen (PR overlay, add share action), WorkoutSummaryScreen
(elevate share CTA when PRs detected).

**Constraint check:** No AI. Offline (PR is computed locally). Free tier (PRs are free).
Not a new feature — optimising an existing flow.

---

### G3 — Block-Completion Share Card (the "I finished a programme" moment)
**Rank: 3 | Effort: Low | Personas: Both | Effect: Virality + Retention**

**What:** The WorkoutSummaryScreen already has a `COMP-005 block-end recap` row (line
796) that fires when the session sits at the end of a block. The block-end recap is an
internal screen. It does not export a shareable card.

**How:**
- When the block-end recap triggers, add a one-tap "Share this block" action that
  routes to the ShareCardScreen with a block-summary template.
- Card content: block name (e.g., "Upper-Lower Split, Block 1"), number of weeks,
  total sessions, headline stat (tonnage moved, or top PRs from the block). One
  sentence of coaching voice: "Block one, done. Your foundation is set."
- For a physique competitor (Eddie): include the mesocycle week count, the total
  volume accumulated vs MEV/MRV at start of block. This is information he actually
  wants to post — his periodisation, not just his PR.
- For a beginner (Besa): the number of sessions and a plain-language summary is
  enough. "12 sessions. 6 weeks. You followed a programme."

**Why this is the highest-virality moment:** "I finished a 12-week programme" is a
landmark post. It is more shareable than any single session because it represents a
sustained commitment. This is the fitness equivalent of Spotify Wrapped — a
retrospective that feels like an achievement, not a metric. No competitor currently
offers a branded block-completion card.

**Placement:** WorkoutSummaryScreen (block-end recap trigger) → ShareCardScreen (new
block-summary template). Estimated effort: 1 sprint day for the template + share flow
wiring.

**Constraint check:** All free-tier data (blocks are training features, which are free).
No AI. Offline-computed.

---

### G4 — Streak Repair UX: make the mercy visible
**Rank: 4 | Effort: Low | Personas: Besa primarily | Effect: Retention (rescue)**

**What:** `streak.js` silently applies a repair when a lone sub-target week is
sandwiched between two good weeks (`applyRepair` function). The user never sees
that this happened. A user who had a bad week, logged fewer sessions, then came back
strongly, does NOT know their streak survived.

**How:**
- When a week's state is `'repaired'` (already labelled in the `computeStreak`
  return), the StreakWeeksSection UI should surface this: e.g., a small indicator
  on that week's pip, and on the current week's summary card, a quiet note: "You
  had a lighter week in week 4 — and came back. Your streak is intact."
- This is a Gentler-Streak-style "you got credit for showing up after recovery"
  signal. It converts a near-churn moment into an identity reinforcement moment:
  "I am the kind of person who comes back."
- Copy must be warm, never patronising. British English. Never use "we forgave you"
  framing — always "your run is intact."

**Why this matters for Besa:** The user most likely to have a sub-target week (weeks
3–6) is also the user most likely to churn. The repair mechanic already protects the
streak number. The UX gap means it does not protect the emotional relationship with
the app. Surfacing the repair is a low-effort, high-empathy intervention.

**Placement:** StreakWeeksSection component on ConsistencyScreen. The data is already
there in `computeStreak()`.

**Constraint check:** Entirely local, no network. No AI. ED flag suppression already
applies to the whole streak surface.

---

### G5 — Monthly Recap Share Card (extend COMP-005 with a share flow)
**Rank: 5 | Effort: Low | Personas: Both | Effect: Virality + Retention**

**What:** COMP-005's monthly recap (YearOfLiftsScreen `buildMonthCards`) produces a
swipeable story internally. The final card ("outro") is an end state that currently
has no share CTA.

**How:**
- On the outro card, add: "Share your month" → ShareCardScreen with a monthly-
  summary template (top stat, sessions, top PR, the month name).
- This is a distinct share-moment cadence from the annual Year of Lifts (which is a
  seasonal event) and the block-completion card (which is programme-relative).
  Monthly is the rhythm most aligned with how gym-goers naturally reflect.
- Under neutral/calm/ED-flag mode (already implemented in `buildMonthCards`): share
  option is suppressed on the outro card. The neutral mode suppresses
  month-vs-month comparison copy — the share card should use the same neutral copy.

**Seasonal framing:** For December, the monthly recap outro should be upgraded to
"Share your year" — surfacing the Year of Lifts share from the same screen. One annual
Wrapped moment, discoverable from the monthly flow that users are already in.

**Placement:** YearOfLiftsScreen (outro card), COMP-005 monthly recap path.

**Constraint check:** No AI. Local data. ED flag already handled in `buildMonthCards`.
Free tier (recap is free).

---

### G6 — Home Tab Habit Cue: "Your streak is alive" / daily return surface
**Rank: 6 | Effort: Low | Personas: Besa primarily | Effect: Daily return**

**What:** The Home tab already shows "week stats, streak, next planned workout" (APPMAP
line 114). The streak number is present but passive. The habit-loop research is clear:
a passive number does not trigger return; a contextual cue that connects the streak to
today's action does.

**How:**
- On a rest day (plan says no training today): "Rest day. Your streak is running —
  back in 2 days." This converts absence anxiety ("am I supposed to train today?")
  into compliance confirmation ("today is already a win").
- On a training day not yet started: "Day 3 of your training week. Your streak is
  running — complete today to keep it." This is the minimal loss-aversion cue that
  is motivating without being coercive.
- On a completed training day: "Today done. Streak intact." Nothing more.
- The copy is contextual (today's plan state × streak state), deterministic
  (computed from plan + streak data), and offline-first (all local data).
- Under ED/wellbeing flag: this surface shows no streak-related copy at all — just
  plan state without any "keep it running" language.

**Why this is the missing cue in the habit loop:** The plan already knows what today
is (training/rest/deload). The streak engine already knows the current run. Neither
is currently surfaced with the habit-loop framing that connects today's choice to the
ongoing streak. This is a copy-and-logic task, not an engineering task.

**Placement:** HomeScreen (already shows week stats + streak). Logic: `getActivePlan()
+ computeStreak()` — both already called in the home tab.

**Constraint check:** No AI. Offline. ED flag creates a no-streak branch. Free tier
(streak is free). No notification budget impact (this is in-app copy, not a push).

---

### G7 — First-Session and First-Week Milestones (the Besa acquisition moment)
**Rank: 7 | Effort: Low | Personas: Besa | Effect: D0–D7 activation + virality**

**What:** No milestone or celebration currently fires for completing the first workout
or finishing the first training week. The activation research is clear: users who hit
an achievement on day 1 have 64% higher day-1 retention.

**How:**
- First completed workout: a full-screen moment on the WorkoutSummaryScreen, before
  the standard summary. Headline: "You did it." (one sentence, never
  hyperbolic). Sub-line: "Your first session is done. That's not nothing — most
  people never start." One CTA: "See your session" → standard summary.
- First training week complete (7 days from first session, or plan's first full week
  completed): a card on the Home tab or a sheet on the ConsistencyScreen.
  Headline: "Week one." Body: "Seven days in. You have a plan. You've started
  following it. That's the whole game."
- Both include a "Share" option. The first-session share card is the highest-virality
  content Volyume can produce: it is the "I finally started" post that every person
  in the sharer's network who has been "thinking about going to the gym" responds to.

**Why this matters especially for Besa:** Gymtimidation research shows that 80%+ of
people experience imposter syndrome when starting at the gym. The fear is "I don't
belong here." A first-session celebration — from the app, privately, before sharing
is prompted — is a safety signal: "You belong here. We're glad you're here."
The share prompt comes second, never first.

**Placement:** WorkoutSummaryScreen (first-session detection: `getAllWorkouts()` count
=== 1 at summary time). ConsistencyScreen or Home tab (first-week completion, derived
from streak data).

**Constraint check:** No AI. Offline. No ED conflict (these milestones are session-
completion-based, not intake/weight-based). Free tier. Low effort — no new data
required, just a detection flag and a display moment.

---

### G8 — PR Wall as a Virality Surface (the "trophy case" share)
**Rank: 8 | Effort: Medium | Personas: Eddie primarily | Effect: Virality + credibility**

**What:** The PRWallScreen exists (APPMAP: "All-time personal records per exercise.
Lifetime bests, strength standards vs bodyweight"). It is a read-only screen. It has no
share capability.

**How:**
- Add a "Share your bests" action on the PR Wall (or per-exercise PR) that exports
  a PR Wall summary card: top 3–5 compound lift PRs, formatted as a performance
  card. For a physique competitor: e1RM values, the "strength standard" comparison
  (already computed), Volyume branding.
- This is the share that Eddie actually wants to make. Not a workout summary with
  lots of context — a clean "here are my numbers" card. The gym community
  understands what a 180 kg e1RM squat means; the card needs no explanation.
- The card should optionally include the lift's history graph (e1RM over time) for
  maximum credibility. "This is where I started, this is where I am."

**Competitor gap:** No current strength-training app offers a branded all-time PR
card with e1RM values in this format. Hevy's shareables are workout-based, not
all-time-best-based. This is a differentiated format.

**Placement:** PRWallScreen (new share action). ShareCardScreen (new PR-Wall template).

**Constraint check:** No AI. Offline. Free tier (PRs are free). Medium effort (new
ShareCard template, wiring PRWallScreen).

---

### G9 — Adaptive Training Day Reminder (cue personalisation)
**Rank: 9 | Effort: Medium | Personas: Besa | Effect: Daily return (D7–D30)**

**What:** The NOTIFICATIONS_LOCKED.md document pre-dates COMP-018 and the current
plan data. Training-day reminders are sent at user-selected times. They are not
currently adaptive to the user's plan state (deload week, rest day scheduled, block
approaching its end).

**How (no AI — deterministic rules only):**
- On a prescribed rest day: no training reminder fires (the plan says no training).
- On a deload week: the reminder copy changes to "Lighter session today — your body's
  in recovery mode." Not "You have a workout today."
- In the final week of a mesocycle block: the reminder copy mentions the block end:
  "Final week of Block 1. Finish strong — deload starts next week."
- After 3+ days of no app opens (lapse precursor, detectable from last-session
  timestamp in SQLite): a re-engagement cue fires once: "Your streak is still running.
  Next session is [workout name]. Ready when you are."

**Why the nuance matters:** The existing training-day reminder is a generic cue. A cue
that acknowledges today's context ("lighter session", "final week") has higher
relevance and therefore higher open rate. For Besa, knowing that today is planned as
lighter is motivationally significant — she does not need to dread it.

**Constraint check:** No AI — all rules are plan-state × streak-state, deterministic.
Notification budget must be checked against NOTIFICATIONS_LOCKED.md reconciliation
(gap G6 from coverage-gaps report). ED flag: deload/rest copy already strips intensity
language; re-engagement cue is suppressed under wellbeing flag.

**Placement:** Notification scheduling logic (already exists for training reminders).
New copy variants per plan state. Medium effort: logic change + copy, not a new system.

---

### G10 — Annual Year of Lifts: surfacing and seasonal framing
**Rank: 10 | Effort: Low | Personas: Both | Effect: Virality (seasonal) + Retention**

**What:** The YearOfLiftsScreen is built and excellent. The problem is discovery.
It currently requires the user to navigate there deliberately. Spotify Wrapped's
virality is 80% the product (personalised story) and 20% the timing (a specific moment
when everyone shares it simultaneously, creating social proof that makes others want to
see theirs).

**How:**
- Annual trigger: on 1 December (or when the user has 12+ months of data, whichever
  is later), a card appears on the Home tab and the Progress tab: "Your Year of Lifts
  is ready." One tap into the story. One "Share" option on the outro card.
- The annual release creates a social moment — Volyume users post their Year of Lifts
  at the same time in December. The posts reach non-users who think "I want to have
  a year of data to show next December."
- This is entirely an in-app UX and copy task. The YearOfLiftsScreen already exists.
  The needed change: a date-triggered surface on Home tab, the "ready" card, and a
  share CTA on the outro card.

**Constraint check:** No AI. Offline (computed from local SQLite). ED flag: the recap
already has a `neutral: true` mode for calm/ED users — the Year of Lifts CTA is
suppressed under an active ED flag (like all streak/progress celebration surfaces).
Free tier.

---

## Part 3 — What to Never Build (the trap list for Volyume specifically)

These are mechanics that have been tried by credible apps and specifically fail the
dual-market physique tool context. They are documented here because each will be
suggested at some point.

| Mechanic | Evidence for avoiding | Specific constraint breached |
|---|---|---|
| Daily streak (reset on any missed day) | Daily streaks conflict with evidence-based training periodisation (rest days are mandatory). Apple Watch spent 9 years fixing this mistake. | Directly conflicts with deload/rest-day design in COMP-018. |
| Global leaderboard (any metric) | Fitocracy's XP leaderboard enabled cheating (Goodhart's law). Strava KOMs required ML fraud detection. Peloton's leaderboard is hidden by its best users. PMC10807424 shows leaderboards help only the already-active, harming the least active. | Demotivates Besa. Alienates Eddie (his metrics are not comparable to a beginner's). |
| XP / points system (game currency) | Fitocracy's XP detached from actual training quality within months. Overjustification effect: once points become the goal, training quality suffers. | No plausible XP mapping for a periodised programme where volume intentionally varies. |
| Virtual pet / RPG character | Alienates Eddie (irreversible brand damage with the precision/credibility positioning). | Contradicts the product's entire design language. |
| Leagues with demotion (Duolingo-style) | "Penalises users who hit their own plan" — the PMC arXiv gamification study finding. Duolingo leagues penalise high-achievers who have completed their goals. | Directly contradicts "your plan, your rate" coaching philosophy. |
| Daily check-in as streak (nutrition/calories) | MFP's decade of pro-ana drift shows calorie-logging streaks are structurally unsafe in a community context. Volyume's own ED safety system exists precisely to prevent this. | ED safety system is untouchable. Nutrition streaks would create perverse incentives. |
| Public sharing of nutrition/body data (any form) | MFP open forums (10-year moderation burden). ED safety system is there for a reason. | Hard constraint: never expose body weight, macros, calories in any social surface. |
| Default-on sharing | Strava bodyguard incident (2024, Le Monde). Strava heatmap (2018). | EU data residency + no-PII constraint. Privacy-first brand. |
| In-app feed / followers / likes | Hevy already owns this positioning for lifters who want it. Strong's absence of social features is praised as a feature. All toxicity citations in the accountability research trace here. | Structural moderation cost. MFP pro-ana drift counterexample. |
| Social obligation streaks (Snapchat/BeReal model) | Coercive pressure is clinically contraindicated for ED-risk users. "Guilt-trips you if you miss the ping." | ED safety system. |

---

## Part 4 — Where Volyume Sits in the Spectrum

The dual-market challenge on gamification is real: the same mechanic that excites a
beginner can patronise an elite. The resolution is **persona-adaptive copy and
milestone thresholds, not separate feature sets.**

The data-based content (PR cards, block-completion cards, Year of Lifts, streak
milestones) is universally appropriate because:
- It is about the user's own data, not a comparison to others.
- It is objective (the 52-week milestone is equally earned by a beginner and an
  advanced user — the nature of the training is different, the consistency is not).
- The copy can be calibrated to the user's experience tier at runtime: a first-year
  user's 12-week milestone card reads differently from a third-year user's fourth
  12-week milestone.

Eddie does not need the "You did it — that's not nothing" copy. He needs the e1RM
delta and the block-volume chart. Besa does not need the periodisation density. The
card content can vary by `experienceLevel` (already in `userProfile`) without
maintaining separate feature surfaces.

---

## Part 5 — Against a Prior Conclusion

**Prior finding (competitive-audit-01-accountability-community-research.md §6.1):**
"Shame-free streak surface. Volyume already knows planned training days; a 'consistency'
streak counted against the user's own plan (rest days strengthen it, deloads count) is
Gentler-Streak-aligned and needs no social component at all. Cheapest win in this report."

**Agreement and extension:** This was correct and is now shipped (COMP-018). The
prior report treated the streak as a solo feature. This report argues the streak
is also a virality trigger, specifically through milestone celebrations with share
flows. The prior report's "cheapest win" framing understates the revenue impact of
milestone shares for word-of-mouth acquisition.

**Prior finding (competitive-audit-03-master-proposals.md COMP-018):**
"Surfaces on Progress and in the monthly recap."

**Disagreement:** The streak milestone moment should also surface at the WorkoutSummary
screen (the moment of emotional peak — just finished a session that crosses a milestone)
not only on the Consistency/Progress screen which the user may visit infrequently. The
monthly recap is too delayed; the emotional peak is in the gym, not three weeks later.
Placement on the WorkoutSummaryScreen (post-session, the highest-engagement moment
in the app) is the correct primary surface.

---

## Part 6 — Source Index

**Duolingo:**
[Streak System Detailed Breakdown — Medium](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f) ·
[Streak Retention Strategy — Audiencers](https://theaudiencers.com/55-learn-from-duolingos-impressive-streak-retention-strategy/) ·
[Deceptive Patterns — deceptive.design](https://www.deceptive.design/brands/duolingo) ·
[Streak Freeze — Medium/duoinsider](https://medium.com/duofluency/duolingo-streak-freeze-maintaining-your-language-learning-streak-with-confidence-16516b7e04bc) ·
[Leagues — arXiv gamification study](https://arxiv.org/pdf/2203.16175)

**Strava:**
[Gamification Case Study — Trophy](https://trophy.so/blog/strava-gamification-case-study) ·
[Kudos make you run! — Social Networks 2023](https://www.sciencedirect.com/science/article/pii/S0378873322000909) ·
[Segmented Leaderboards — Trophy](https://trophy.so/blog/how-strava-uses-segmented-leaderboards-to-drive-engagement) ·
[Le Monde / bodyguard tracking — Fortune](https://fortune.com/2024/10/29/biden-trump-harris-confidential-movements-fitness-app-strava-le-monde/) ·
[Heatmap military incident — Engadget](https://www.engadget.com/2018-03-13-after-exposing-secret-military-bases-strava-restricts-data-visi.html)

**Apple Fitness / Gentler Streak:**
[Gentler Streak — Apple Developer](https://developer.apple.com/news/?id=3m0ht22s) ·
[Gentler Streak kindness to fitness — Sketch Blog](https://www.sketch.com/blog/gentler-streak/) ·
[Rest days after 9 years — iMore](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks) ·
[Activity sharing psychology — Michigan Daily](https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/)

**Fitocracy (post-mortem):**
[What Really Killed Fitocracy — The Titan Life](https://the-titan-life.com/2025/08/28/what-really-killed-fitocracy-the-mistakes-that-doomed-a-great-fitness-app/) ·
[Fitocracy Rise and Fall — The Titan Life](https://the-titan-life.com/2025/08/18/is-fitocracy-dead-the-real-story-behind-the-apps-rise-and-fall/)

**Habitica / Finch:**
[Habitica Gamification Case Study — Trophy](https://trophy.so/blog/habitica-gamification-case-study) ·
[Finch Self-Care App — Yoga Journal](https://www.yogajournal.com/lifestyle/finch-self-care-app/) ·
[Finch Review — CLT Counseling](https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review)

**Zombies, Run!:**
[Users' Engagement Study — UCL/Games for Health](https://discovery.ucl.ac.uk/id/eprint/10139156/) ·
[Wikipedia](https://en.wikipedia.org/wiki/Zombies,_Run!)

**Hevy / share mechanics:**
[Hevy Social Media Shareables](https://www.hevyapp.com/features/shareable/)

**Nike Run Club:**
[NRC Gamification Case Study — Trophy](https://trophy.so/blog/nike-run-club-gamification-case-study) ·
[NRC Gamification — StriveCloud](https://www.strivecloud.io/blog/gamification-examples-nike-run-club)

**Spotify Wrapped:**
[Strategy — NoGood](https://nogood.io/blog/spotify-wrapped-marketing-strategy/) ·
[200M users in 24h — Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase/)

**Academic / behavioural science:**
[Motivation crowding in gamified fitness apps — PMC10807424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/) ·
[From immersion to burnout — PMC12913498](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12913498/) ·
[Variable Rewards — Appcues](https://www.appcues.com/blog/variable-rewards) ·
[Loss aversion in app retention — Glance](https://thisisglance.com/learning-centre/how-can-loss-aversion-psychology-transform-app-retention/) ·
[SDT — NN/g](https://www.nngroup.com/articles/autonomy-relatedness-competence/) ·
[SDT Guide — Yu-kai Chou](https://yukaichou.com/gamification-analysis/self-determination-theory-guide-to-ryan-and-decis-motivation-framework/) ·
[Designing A Streak System — Smashing Magazine 2026](https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/) ·
[Streak forgiveness mechanics — Trophy](https://trophy.so/blog/designing-streaks-for-long-term-user-growth) ·
[Streak Creep — The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) ·
[Psychology of Streaks — Cohorty](https://blog.cohorty.app/the-psychology-of-streaks-why-they-work-and-when-they-backfire/) ·
[Habit loop — Duke Health](https://dhwblog.dukehealth.org/how-new-habits-are-created-and-what-makes-them-stick/) ·
[Habit Formation — 66 days research](https://realfoodwholelife.com/feelgoodeffect/the-habit-loop-interview-with-charles-duhigg/) ·
[Streak anxiety in children — Screenwise](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids) ·
[BeReal streaks — Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2025/08/25/features-worth-stea-borrowing-lessons-from-duolingo-tinder-draftkings-cryptocom-bereal) ·
[K-Factor — AppSamurai](https://appsamurai.com/blog/what-is-k-factor-for-apps-and-how-to-calculate/) ·
[How to make a fitness app viral — Wezom](https://wezom.com/blog/how-to-make-a-mobile-app-go-viral-in-2025-proven-growth-strategies)

**Streak forgiveness — comparative data:**
[Apps with streak freezes: 17.19 days vs 11.62 without (+48%) — Trophy](https://trophy.so/blog/designing-streaks-for-long-term-user-growth) ·
[First-achievement users: 33.42% vs 20.46% (+64%) D1 retention — Trophy/NRC case study](https://trophy.so/blog/nike-run-club-gamification-case-study)

---

*Research complete. No code modified. All mechanics above are proposals for the
founder to prioritise; none constitute build commitments.*
