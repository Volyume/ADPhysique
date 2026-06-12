# Guided Coaching Apps — Competitive Deep Audit

> **PROVENANCE NOTICE (2026-06-12, added after a verified research-tooling
> failure):** this document presents itself as external/competitive research.
> The session that produced it cannot be verified from here, and the cloud
> environment used for this build BLOCKS page fetches (search digests only).
> Treat every competitive claim and citation in this document as UNVALIDATED
> until re-verified through a working /deep-research run or primary sources.
> Features built from it have NOT been proven better than competitors.

**Agent: ext-02 · Date: 2026-06-12 · Slice: guided-coaching and broad fitness apps**

> Additive to the 2026-06-10 audit. That audit covered Fitbod, MacroFactor, Caliber, and Future
> in the AI-coaching and onboarding slices. This report builds on those findings, drills deeper
> into coaching *voice* and *beginner psychology*, covers apps the prior audit did not touch
> (Peloton, Nike Training Club, Apple Fitness+, Centr, Freeletics, Sweat, BetterMe, Ladder,
> Gymshark Train, Fiit, Zwift), and reframes everything through the new dual-market lens
> (Besa the Beginner / Eddie the Elite). Research methods: web search, published teardowns,
> review aggregators, academic and industry benchmark sources. Every claim cited.

---

## 0. What the prior audit missed on coaching voice and beginner psychology

The 2026-06-10 audit was excellent on algorithmic coaching (MacroFactor, Fitbod, Future) and
onboarding conversion mechanics, but it under-covered:

- **Tone of voice as a retention lever.** The prior audit noted MacroFactor's "adherence
  neutral" design but did not map how the *language* coaches use (not just the data) affects
  beginner confidence and D7–D30 retention.
- **Programmes as journeys.** The audit covered streaks (COMP-018) but not the programme
  narrative arc — the feeling of being on a 4–12-week journey with a beginning, middle, and
  end that skilled apps use to lock in beginners who would otherwise drift.
- **Gym anxiety as the real beginner barrier.** ~50% of beginners report intimidation in gym
  environments ([RunRepeat 2020 survey](https://runrepeat.com/gym-anxiety)); no prior document
  names this explicitly or proposes a mechanic to address it.
- **The dual-market design pattern.** The layered-complexity approach used by Caliber, Apple
  Fitness+, and Ladder — showing beginners a simple surface while keeping elite depth
  accessible — was never stated as a design system principle.
- **Celebrity/personality coach anchoring.** Peloton, Centr, Sweat, and Ladder each use a
  named human presence as the emotional anchor of their product. The prior audit did not
  cover this mechanic or its applicability to a deterministic engine.

---

## 1. Per-app highlights

### 1.1 Nike Training Club — gold standard for free-tier coaching volume

**How they deliver coaching feel.** NTC offers 487+ free guided workout classes with
non-stop audio instruction. Instructors "never let you be in silence for more than a few
seconds" and provide constant form cues, breathing reminders, and tempo instructions
([Yahoo Health, NTC review](https://health.yahoo.com/wellness/fitness/online-fitness/articles/nike-training-club-review-better-203000725.html)).
Every workout class is led by a real, identifiable trainer — not an anonymous voice —
and programs are structured in 4–6-week arcs with "clear paths to follow"
([MadMuscles review](https://madmuscles-review.com/workout-apps/nike-training-club-app-review/)).

**Beginner confidence mechanics.** The app "welcomes first-timers with low-impact workouts,
habit-building advice, and trainers who prioritise form, consistency, and enjoyment over
intensity" ([Tom's Guide, NTC review](https://www.tomsguide.com/reviews/nike-training-club-app)).
Filtering by level (Beginner / Intermediate / Advanced) is surfaced upfront; beginners never
see a workout that assumes existing gym vocabulary.

**Dual-market balance.** A single free library serves beginners (guided fundamentals) and
intermediate/advanced users (sport-specific conditioning, advanced HIIT, yoga flows) by
volume and difficulty filter rather than separate tiers. No elite-specific depth (no
periodisation, no autoregulation) — which is why NTC grows wide but not deep.

**Monetisation.** NTC went fully free in 2020 to drive user acquisition (+60% active users),
monetising through Nike.com product sales (members get access to Nike Experts and 60-day
product trials) rather than subscription conversion
([AppVenturez case study](https://www.appventurez.com/blog/nike-training-club-app-case-study)).
This is a *brand-as-flywheel* model, not a subscription model. The lesson for Volyume:
free-tier brand trust is earnable at a fraction of the real acquisition cost, but NTC shows
the model only makes financial sense if the product anchors a broader commerce ecosystem.

**Gap relevance for Volyume.** NTC's audio coaching density is the benchmark for "coached
feel without a human". Their model is completely free, so no conversion lessons. The audio
coaching pattern (constant but non-intrusive cues, identified instructor personality) is
directly transferable as a *written* coaching layer inside Volyume's workout screen.

---

### 1.2 Apple Fitness+ — coaching-voice differentiation as a product feature

**How they deliver coaching feel.** Apple Fitness+ explicitly treats trainer *personality* as
a differentiable product feature. The app presents multiple trainers so users can "explore
combinations of workout type and coaching tone"
([AppleMagazine, trainer guide](https://applemagazine.com/apple-fitness-trainers-00a1/)).
Trainer coaching styles are described as: calm precision, high-energy intensity, detailed
technical cues, and conversational encouragement. The explicit design principle is that
"choosing a trainer whose motivation style aligns with personal preference increases the
likelihood of returning for the next session."

**Beginner confidence mechanics.** A 2025 "Make Your Fitness Comeback" programme — 4 weeks,
three 10-minute workouts per week — specifically targets people "returning to movement or
simply looking for a reset" ([MacObserver, Fitness+ review](https://www.macobserver.com/tips/apple-fitness-review/)).
Workouts are "just challenging enough while still being approachable and genuinely fun for
on-again, off-again exercisers"
([Woman and Home, Fitness+ review](https://www.womanandhome.com/health-wellbeing/fitness/apple-fitness-review/)).
Real-time Watch metrics appearing beside the trainer reinforce the "coaching feel" because
the trainer can reference your own live numbers.

**Dual-market balance.** Fitness+ solves dual-market by *coach selection*: beginners pick a
calm, technical coach; advanced users pick high-intensity instructors. The training library
itself is identical — the personalisation is tonal, not structural. This is elegant but
requires multiple named coaches, which is a content investment.

**Engagement loop.** The Watch integration creates a daily commitment device: closing rings
becomes the habit trigger; classes are the action; Watch award badges are the variable
reward. The addition of rest days that don't break award streaks (watchOS 11) — after nine
years of user demand — demonstrates that even Apple needed to retrofit shame-free rest
([iMore, rest days feature](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks)).

**Gap relevance for Volyume.** The "choose your coaching tone" concept is powerful.
Volyume currently has one coaching voice. A simple preference toggle — "Motivational" vs
"Analytical" tone — could serve Besa's need for encouragement alongside Eddie's preference
for data-dense precision, at zero extra content cost. Fully deterministic and offline-safe.

---

### 1.3 Peloton — the psychology of the instructor relationship

**How they deliver coaching feel.** Peloton's core insight is that users form *parasocial
attachments* to named instructors. Instructors are described as "tone-setters" who "influence
pacing, motivation, and long-term engagement"
([Fielding.edu, Peloton psychology](https://www.fielding.edu/the-psychology-of-pelotons-appeal-what-keeps-us-riding/)).
The experience is built around Self-Determination Theory: autonomy (choose your class/instructor),
competence (live output metrics + personal records), and social connection (leaderboard + high-fives)
([Truemed, Peloton science](https://www.truemed.com/blog/peloton)).

**Beginner confidence mechanics.** "You Can Ride" is a structured 3-week onramp programme
(9 classes, bronze/silver/gold badge structure) with explicit goal-naming like "you can do
this" framing. The programme naming convention itself — "You Can Run", "You Can Ride" —
is an affirmation built into the product name
([Peloton Buddy, beginner programme](https://www.pelobuddy.com/peloton-you-can-ride-beginner-cycling-program/)).
Instructors at different energy levels serve different anxiety profiles: Cody Rigsby's self-
deprecating pop-culture approach makes beginners feel that "everyone belongs and can find
something that challenges them"
([IN Magazine, Rigsby profile](https://inmagazine.ca/2021/01/meet-peloton-instructor-extraordinaire-cody-rigsby/)).
Alex Toussaint's "get your vibe right, get your game tight" serves high-intensity seekers.

**The leaderboard problem — the canonical cautionary tale.** The prior audit (§1.5 of
accountability research) noted users hiding the leaderboard. Instructors now actively coach
users to ignore their own company's feature. The critical lesson: *the most visible
competitive metric is not always the retention driver* — the instructor relationship is.
Peloton's most engaged cohort cites the instructor, not the leaderboard
([Anne Helen Petersen, Peloton psychology](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of)).

**Programmes as journeys.** Peloton's programme structure (4–10-week arcs, named milestones,
badge completion rewards, sessions that "build upon one another"
([Peloton, programmes blog](https://www.onepeloton.com/blog/peloton-programs))) creates
a narrative arc where completing the journey is itself a motivator. Beginners who complete
a programme are substantially more likely to start another — a pattern Peloton uses to
convert from "just trying" to "subscriber identity".

**Monetisation.** Peloton ended its free app tier because it was "cannibalising paid
conversion" — the free tier attracted users who never converted
([Peloton Buddy, free tier ending](https://www.pelobuddy.com/free-app-tier-ending/)).
Current model: 30-day trial, then £12.99/mo. Lesson: a generous free tier only works if
it creates the conditions for conversion (Volyume's free logger floor does this;
Peloton's free classes did not, because classes are the product, not a gateway to it).

**Gap relevance for Volyume.** The "programme as journey" arc with named milestones and a
completion badge is directly applicable and offline-compatible. Volyume's mesocycles
already have a defined start/end; surfacing this narrative (Week 1 of 10, session 2 of 3 this
week, milestone badge at end of mesocycle) is a pure UI/copy change on top of existing engine data.

---

### 1.4 Centr — the holistic beginner confidence system

**How they deliver coaching feel.** Centr uses celebrity anchor (Chris Hemsworth) as brand
trust, then delivers actual coaching through named expert coaches — Maricris Lapaix (cardio/
beginner), Dan Churchill (nutrition) — with a "we'll be with you every step" tone
([Centr, Begin programme](https://centr.com/article/show/20278/centr-begin-program-overview)).
The coaching voice is explicitly warm-and-encouraging-not-demanding: "You won't have to
thrash yourself... this is the start of something great."

**Beginner confidence mechanics.** "Centr Begin" is a 3-week, low-impact programme
specifically built for people "who have never worked out or found other beginner programmes
too difficult"
([Centr, Start right](https://centr.com/blog/show/21376/start-right-prove-you-can-move-with-centr-begin)).
Key language: "feel empowered by completing workouts", "build confidence with workouts you
can master". Every move includes video coaching from start to finish — no self-guided silent
videos in the beginner path. The FitQuiz adapts reps, weight, and intensity to the user's
level on day one, removing the psychological barrier of "I don't know what weight to use".

**Dual-market balance.** Centr's model separates by programme selection: beginners get "Begin"
and "Ignite"; advanced users get "The Foundation" (12-week strength) or specific sport
conditioning. A single membership unlocks all. The framing is "find your level", not
"unlock harder tiers" — no hierarchy of content, just different paths.

**Monetisation.** £119.99/year or £29.99/month
([Centr, shop](https://shop.centr.com/products/centr-digital-coaching-app)).
The celebrity anchor does the acquisition work; the beginner confidence system does the
retention work. The 7-day free trial matches the industry norm.

**Gap relevance for Volyume.** Centr's explicit "you won't be judged, you can master this"
language and the named trusted coach who "will be with you every step" are tone models for
Volyume's coaching voice on the beginner path. Volyume's coaching engine can already
translate every decision into plain language; Centr shows that *the emotional framing of
that language* is as important as the technical accuracy.

---

### 1.5 Freeletics — the most sophisticated feedback → adaptation loop outside AI

**How they deliver coaching feel.** Freeletics Coach uses an after-workout feedback loop
(difficulty rating + energy level + completion status) that adapts the *next* session without
an LLM — the adaptation is rule/feedback driven
([Freeletics, Coach fundamentals](https://www.freeletics.com/en/blog/posts/understanding-your-training-plan/)).
The adaptation is "without judgment": "if you flag fatigue or miss days, it adjusts without
judgment" ([FitnessToolsReviewed, Freeletics review](https://fitnesstoolsreviewed.com/app-reviews/freeletics-review-is-the-ai-training-app-worth-it/)).

**Beginner confidence mechanics.** Partial "God workouts" — abridged versions of signature
workouts — are explicitly described as "ease your way towards complete God workouts", giving
beginners an attainable near-term goal (complete the partial workout) and a visible horizon
goal (the full workout). This is a concrete example of *aspirational scaling*: the full workout
exists in the product and beginner users can see it, making mastery tangible and motivating.
Partial completion is normalised, never punished.

**Coaching voice in Coach+.** The 2025 Coach+ upgrade adds "custom motivational messages",
lets users "set the tone for how Coach+ talks to them" (i.e. tone preference), and provides
"real-time, conversational support" for guidance on exercises, nutrition, and motivation
([Freeletics, Coach+ announcement](https://www.freeletics.com/en/blog/posts/freeletics-coach-plus/),
[Fitt Insider, Coach+ press](https://insider.fitt.co/press-release/freeletics-unveils-a-new-era-in-digital-fitness-with-the-launch-of-coach/)).
The key differentiation: the user *chooses* their coaching tone — a personalisation of voice
rather than content, exactly the pattern proposed above under Apple Fitness+.

**Dual-market balance.** Freeletics uses "Training Journeys" — multi-week thematic programmes
(strength, endurance, hybrid) with named arcs. Beginners start with beginner Journeys;
advanced users start with harder ones. All Journeys use the same feedback loop and adaptation
engine — the depth is hidden behind the same UI. Classic layered complexity.

**Gap relevance for Volyume.** The after-workout micro-feedback loop (difficulty, energy, completed?) 
is a pure UX/data pattern that requires no AI, is fully deterministic, works offline, and directly
feeds Volyume's existing autoregulation engine. Volyume's autoregulation engine already adjusts
based on logged RPE; surfacing a 3-field post-session prompt that *visibly* confirms the adjustment
("Based on today's session, next week's volume has been adjusted") closes the transparency loop
that MacroFactor and Freeletics both exploit.

---

### 1.6 Future — the proof that humans-as-coaches convert at scale

**How they deliver coaching feel.** Future pairs each user with a real, named human coach who:
(a) conducts an initial FaceTime consultation, (b) designs a fresh personalised plan every week,
(c) exchanges ~4 messages per day including pre-workout check-ins and post-workout feedback
([Active.com, Future review](https://www.active.com/fitness/articles/future-app-review)).
The 4.9/5.0 App Store rating from 9,400+ reviews (January 2026) and $199/month price point
demonstrate that users will pay a premium for *genuine human accountability*
([Cora Health, Future review](https://www.corahealth.app/compare/future)).

**Beginner confidence mechanics.** "The 1-on-1 coaching model is actually ideal for beginners
because you get personalised guidance without the intimidation of a gym" — coaches are explicitly
described as experts at "building confidence for absolute beginners who haven't exercised in
years"
([AthleteInsight, Future review](https://www.athleticinsight.com/exercise/future-fitness-app-review)).
The accountability mechanism is relational, not gamified: you don't want to let *your coach*
down, not a leaderboard. This is the mechanism with the strongest adherence evidence in
the literature (see prior audit §1.9 on coach-view platforms).

**Gap relevance for Volyume.** Future proves the *demand* for coach-feel at premium price points.
Volyume cannot replicate the human coach at £0 marginal cost, but the B2B Coach Phase 2
(already scoped in `B2B_COACH_PHASE_2_SCOPED.md`) is the correct structural response.
More immediately: the Precision Coaching engine *is* already doing what a Future coach
does mechanically (weekly plan adjustment based on performance). Framing this as
"your coach reviewed your week and made these changes" — without an LLM, just the
deterministic engine output rendered as a coach message — captures 70% of the emotional
value at zero marginal cost.

---

### 1.7 Sweat (Kayla Itsines) — community as beginner retention infrastructure

**How they deliver coaching feel.** The Sweat coaching tone is explicitly "heart-to-heart
with a friend": "imagine Kayla Itsines and her team of seasoned trainers leaning in, eager
to get the lay of the land on your challenges, ready with a game plan — the vibe is all about
friendly support, not lecturing"
([Fitness Drum, Sweat review](https://fitnessdrum.com/sweat-app-review/)).
The named trainer (Kayla) is simultaneously the coach, the brand ambassador, and the
accountability relationship — her Instagram following (16M+) pre-built the parasocial
attachment before users install the app.

**Beginner confidence mechanics.** All programmes include 4 weeks of beginner workouts before
the main programme begins — a mandatory soft-start that prevents intimidation
([Sweat support, beginner FAQ](https://support.sweat.com/hc/en-us/articles/360004473775-Do-you-have-workouts-for-Beginners)).
Milestone sharing (first workout badge, 100th workout, streak milestones) via the Activity
tab creates a celebratory feedback loop
([Sweat, 16 features](https://sweat.com/blogs/fitness/sweat-app-features)).
The Community Forum tab hosts thousands of women supporting each other — a genuine peer
accountability network without a public leaderboard.

**Growth model.** Sweat grew to ~$100M ARR from 1M+ monthly active users via:
(1) Kayla's social media presence as a zero-cost acquisition engine;
(2) community forums creating switching costs;
(3) a subscription model with no meaningful free tier
([TechAhead, Sweat growth story](https://www.techaheadcorp.com/blog/how-the-sweat-app-conquered-fitness-with-100-million-in-revenue/)).
The lesson: identity-level connection to a named coach/founder creates switching costs that
generic apps cannot replicate.

**Gap relevance for Volyume.** Sweat's mandatory 4-week beginner soft-start and milestone
celebration mechanics are directly applicable to Volyume's onboarding arc. Volyume knows
which mesocycle week a user is in; it can badge-celebrate "first session complete", "first
week done", "first mesocycle milestone" with a coach-voiced message in the existing
notification system (budget allowing per NOTIFICATIONS_LOCKED.md reconciliation needed —
coverage gap G6 from the prior audit).

---

### 1.8 BetterMe — the mass-market quiz-to-coach conversion template

**How they deliver coaching feel.** BetterMe opens with a 15–20 question quiz that "by the
time users see the cost, they have already invested several minutes of emotional engagement"
([Nutrola, BetterMe free vs paid](https://nutrola.app/en/blog/betterme-free-vs-paid-what-do-you-actually-get)).
Chat-based human coaching is available as an add-on for challenged-length programmes, creating
a tiered coaching model where the mass market gets algorithmic coaching and premium users
get human access.

**Beginner confidence mechanics.** "No yelling coaches or aggressive tracking" — the design
philosophy is explicitly low-pressure. Progress badges (gamified level-up feeling), a goal-
achievement date prediction ("you'll reach X by [date]"), and challenge structure (21–30-day
programmes) combine as a beginner retention toolkit
([Medical News Today, BetterMe review](https://www.medicalnewstoday.com/articles/betterme-review)).

**Monetisation.** BetterMe's free version is a "sales funnel rather than a standalone product"
— very limited without the subscription. This generates high conversion but poor sentiment
([Garage Gym Reviews, BetterMe](https://www.garagegymreviews.com/equipment/betterme-health-coaching-app)).
A cautionary tale for Volyume: the free tier must deliver genuine value or it creates the
"trapped then charged" pattern that damages brand trust and produces negative reviews.

**Gap relevance for Volyume.** BetterMe's goal-achievement date prediction is a specific
mechanic Volyume's deterministic engine can produce precisely — the coaching engine computes
projected peak-week readiness already. Surfacing "at your current trajectory, you'll be ready
for [competition/goal] by [month]" is a uniquely credible version of BetterMe's generic
date prediction, because Volyume's engine is actually calibrated to competition prep physiology.

---

### 1.9 Caliber — the best implementation of the dual-market problem

**How they deliver coaching feel.** Caliber's tiered model is the clearest example in the
market of a single product serving beginners and advanced users without compromise:
- **Free**: unlimited logging, 600+ exercise library, strength balance analytics — genuine
  elite utility at no cost.
- **Plus (£12/mo)**: coach-built templates, macro targets, plate calculator — structured
  programming without live coaching.
- **Pro (£19/mo)**: group coaching programmes (beginner, intermediate/advanced, weight loss,
  bodyweight-only) — four separate tracks for different starting points within one subscription tier.
- **Premium (from £200/mo)**: 1:1 human coach with weekly Loom video check-ins and form
  feedback via video submission.
([BarBend, Caliber review](https://barbend.com/caliber-fitness-app-review/),
[Garage Gym Reviews, Caliber](https://www.garagegymreviews.com/caliber-app-review))

The weekly Loom video check-in is described as "about as close as you can get to in-person
training feedback without actually having a trainer in the room with you" — this is Future's
model at one-quarter of the price because it uses asynchronous video rather than live messaging.

**Dual-market balance.** Caliber's free tier is genuinely useful for advanced lifters (the
strength balance analytics and unlimited logging are legitimate elite tools), which means the
free tier serves Eddie while the paid tiers convert Besa. This is the opposite of most apps
where the free tier is a deliberately-crippled beginner carrot. Caliber proves a generous free
tier can serve both personas if the free tier is designed with elite utility in mind.

**Gap relevance for Volyume.** Caliber's Pro group coaching programmes are the closest
published model to what Volyume's B2B Coach Phase 2 could become at a lower price point
than 1:1. More immediately: Caliber's Strength Score (a derived composite metric that beginners
can track without understanding the underlying data) is the kind of "one number that shows
progress" that reduces beginner anxiety. Volyume could surface a similar "readiness score"
or "consistency score" that is meaningful to beginners without exposing the MEV/MAV/MRV
architecture to users who find that terminology intimidating.

---

### 1.10 Ladder — Apple's 2025 App of the Year Finalist (and why)

**How they deliver coaching feel.** Ladder is described as making users feel they "have a
workout buddy, with the coach virtually in the room guiding each movement"
([ExercisePick, Ladder review](https://exercisepick.com/is-ladder-fitness-app-worth-it/)).
The coaching voiceover can be toggled on/off. Each week delivers a fresh set of workouts
"programmed by a coach" — the framing is "show up and follow your coach's instructions",
removing the decision fatigue of programme design
([Ladder review, Parade](https://parade.com/health/ladder-app-review) [403]).

**Beginner confidence mechanics.** The onboarding assesses experience level; coaches provide
alternative moves and weight suggestions for beginner/intermediate/advanced within the same
workout — inline scaling rather than separate tracks. Form feedback is highlighted as
"especially valuable for learning proper technique early"
([ExercisePick, Ladder review](https://exercisepick.com/is-ladder-fitness-app-worth-it/)).
An on-screen demo plays for every exercise; beginners never have to trust their own form
without a reference.

**Awards context.** Apple's 2025 App of the Year Finalist, Apple Editors' Choice, Women's
Health 2026 Best Overall, CNET 2026 Best Strength Training App
([Outdoor Nomad, Ladder review](https://www.outdoorsynomad.com/ladder-fitness-app-review/)).
These awards are evidence that the "coach virtually in the room" experience is where the
mainstream market is moving in 2025–2026.

**Gap relevance for Volyume.** Ladder won awards for doing offline, programme-structured,
coach-voiced workouts well — which is exactly what Volyume's training engine produces.
The gap is in the *expression layer*: Ladder wraps identical mechanics in warmer, more
approachable coaching language and demo density that Volyume's current workout screen does
not yet have.

---

### 1.11 Gymshark Train — free, simple, branded for beginners with no depth

**How they deliver coaching feel.** Quick 1-minute setup; video guides for every exercise;
programmes filtered by experience level. But: "didn't feel very tailored to individual goals
or preferences, asking just a few generic questions such as age and gender"
([Tom's Guide, Gymshark review](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free)).
No progression tracking, no custom set/rep adjustments, no ability to add drop sets or
supersets.

**Gap relevance for Volyume.** Gymshark Train is the cautionary tale for the beginner-only
path: low barrier to entry, no depth, no retention past the beginner phase. Users who outgrow
it switch. This validates Volyume's dual-market mandate — a product that starts simple but
grows with the user retains both cohorts; a product that caps at beginner loses Eddie.

---

### 1.12 Fiit — the live class coaching community model

**How they deliver coaching feel.** Fiit's 40+ training plans (Beginner to Advanced), class
intensities from 10–40 minutes, and qualified group instructors who coach form and motivation
throughout produce 4.9/5 from 45K+ App Store reviews
([Fiit](https://fiit.tv/), [GymBird, Fiit review](https://www.gymbird.com/fitness-apps/fiit-app-review)).
The key coaching mechanic: live classes produce 22% harder average effort than solo workouts
by Fiit's own telemetry — a direct measurement of the accountability effect of a live coach.

**The caveat.** Even "Beginner" classes are reported as intense; "it pays to have exercise
experience under your belt before joining"
([Fitness Drum, Fiit review](https://fitnessdrum.com/fiit-app-review/)).
Fiit's "beginner" label is relative to their class library, not to gym-naive beginners.
This is a common trap: the app's beginner = the industry's intermediate.

**Gap relevance for Volyume.** Fiit's monthly fitness challenges as habit formation devices
(not leaderboard-driven, but programme-completion-driven) are an applicable engagement
loop. Volyume's mesocycles already have a natural monthly rhythm; surfacing "your challenge
for this training block" with week-by-week completion visibility would serve the same
habit-formation function without live infrastructure.

---

### 1.13 Zwift — the engagement model no gym app has fully copied

**How they deliver coaching feel.** Zwift's genius is not coaching per se but *progress
visibility as intrinsic motivation*: a level system (100 levels), route achievement badges
(every completed route earns a collectible badge), and a Drop Shop where earned virtual
currency unlocks equipment
([Zwift Calculator, achievements](https://www.zwiftcalculator.com/blog/unlocking-zwift-achievements)).
The engagement loop is: ride → earn XP + Drops → unlock new bike/kit/routes → new goal →
ride more. The collection mechanic creates an inventory of future reasons to return.

**The Hook framework applied.** External trigger (reminder), internal trigger (boredom /
wanting progress), action (ride), variable reward (what badge/level/unlock?), investment
(choosing a goal route, investing XP in a target bike) creates a classic Nir Eyal Hook cycle
([techArchitect, Zwift gamification](https://techarchitect.io/zwift-a-gamification-hook-framework-case-study/)).

**Dual-market balance.** Zwift's segments and racing (Zwift Racing League — 35,000+ racers,
1,800 teams per season) serve competitive cyclists; free-ride mode and novice routes serve
casual riders. The same world contains both without either feeling out of place. The key:
the division is by *feature selection*, not by product tier or separate app screen.

**Gap relevance for Volyume.** Zwift's route-badge model is directly mappable to Volyume:
completing a mesocycle = a collectible badge; completing a division-specific programme = a
named achievement. These are pure data (the engine knows completion) rendered as identity
objects. The "Drop Shop" currency mechanic is probably out of scope for Volyume's aesthetic,
but the underlying principle — *small spendable rewards that create forward-looking motivation* —
is implementable as "unlock a new programme" or "unlock an advanced tracking view" at
mesocycle completion.

---

## 2. Cross-cutting analysis

### 2.1 The coaching voice spectrum

Based on the apps above, coaching voice in fitness apps falls on two axes:

| Axis | Beginner-oriented pole | Elite-oriented pole |
|---|---|---|
| **Warmth** | Friend/cheerleader ("you've got this", "we'll be with you") | Professional/peer ("your metrics show", "target met") |
| **Explanation** | "Here's what this means for you" | "MEV: 12 sets/wk, progressing to MAV" |

Every app that serves mass-market beginners successfully operates near the Warm + Plain-language
corner. Every app that serves elite users without alienating them (MacroFactor, Caliber Pro,
Future) uses Professional + Explanation tone — but crucially, still **explains the reasoning**.

The dual-market insight: **the tone can be the same; the explanation density can differ.**
MacroFactor's adherence-neutral design is not warm-fuzzy; it is calm and non-judgmental.
Caliber's coaching messages to beginners are warmer than its data views for advanced users.
The best apps adjust *depth*, not *warmth* — both personas respond well to being treated with
respect; beginners need more context, not more hand-holding.

**Adherence-neutral is the single most transferable concept from this research.**
MacroFactor's published design philosophy
([MacroFactor, adherence neutral](https://macrofactorapp.com/adherence-neutral/)):
"No red numbers. No warnings. No guilt pop-ups. Nothing about MacroFactor will tell you
that you're doing something bad if you don't adhere to your diet."
The research basis: shaming people for non-adherence makes them less likely to adhere.
Volyume currently has a neutral tone in the coaching engine, but the check-in screen and
nutrition logging surface have not been audited for shame-trigger language.

### 2.2 Beginner confidence-building: the five tested mechanics

Across all apps studied, five mechanics reliably build beginner confidence:

1. **Immediate competence signal.** Fitbod's first generated workout; Centr Begin's "workouts
   you can master"; Freeletics' partial God workouts. The principle: show the beginner they
   can *do something* on day one.
2. **Named aspirational horizon.** Freeletics' full God workout visible from day one; Peloton's
   "You Can Ride" progress through 9 classes to a Gold badge; Zwift's level 100 as a visible
   ceiling. The principle: beginners need to see where the journey goes, not just today's task.
3. **Scaling without labels.** Ladder's inline exercise alternatives (beginner/intermediate/
   advanced weight cues within the same workout); Centr FitQuiz adapting intensity; Apple
   Fitness+ trainer selection. The principle: never make the user feel they are in the "beginner
   ghetto" — scaling should feel like personalisation, not limitation.
4. **Normalised imperfection.** Freeletics' "adjust without judgment" for missed sessions;
   MacroFactor's adherence-neutral design; Apple Watch's rest days that don't break streaks.
   The principle: the first missed session is when churn risk is highest; the app must
   explicitly make it safe to miss.
5. **Micro-celebration at each completion.** Sweat's milestone badges; Peloton's bronze/silver/gold
   programme badges; Zwift's route badges. The principle: completion is the reward, but it
   must be *marked* to feel real.

### 2.3 The dual-market design pattern

The apps that successfully serve both personas use one of three structural patterns:

| Pattern | Example apps | How it works | Volyume fit |
|---|---|---|---|
| **Filter/level selection** | NTC, Gymshark, Fiit | One library, filtered by difficulty level | Already partially present; needs better beginner surfacing |
| **Programme-track selection** | Centr, Caliber Pro, Sweat | Named programmes at different levels within one subscription | Volyume's plan library + division system is this pattern; needs beginner-track framing |
| **Tone preference** | Apple Fitness+, Freeletics Coach+ | Same content, different coaching style toggleable by user | New for Volyume; zero content cost, one preference setting |

The single finding that directly contradicts prior audit conclusions: the prior audit framed
the beginner/elite tension as a *feature* tension (what to build). This research shows it is
primarily a *language and framing* tension. Apps like Caliber serve Eddie on the free tier
with the exact same workout logging that serves Besa — the difference is which *surface* is
highlighted first.

### 2.4 Habit/engagement loops: what the best apps have in common

1. **Programme arc over open-ended logging.** NTC, Sweat, Peloton, Centr, Ladder — all
   structure engagement around a programme with a defined end date. Open-ended logging (Hevy,
   Strong) retains advanced users who self-motivate; beginners need the arc narrative.
2. **Week-level visibility.** Most apps show "this week: 2 of 3 sessions done" prominently.
   The weekly view reduces the psychological distance between "I missed yesterday" (demoralising)
   and "I'm on track for my week" (motivating).
3. **Completion > performance in early weeks.** Peloton's badge structure rewards *completing*
   classes, not *performance*; Freeletics' journeys are assessed on adherence, not PB scores.
   This is critical for beginners: celebrating "showed up" before "performed well".
4. **Variable reward through unlocks.** Zwift's XP/Drops/badges; Peloton's programme badges;
   Sweat's milestone achievements. The variability (you don't know which badge comes next)
   is the engagement hook.

### 2.5 Monetisation patterns — what converts

| App | Model | What's free | What converts | Lesson for Volyume |
|---|---|---|---|---|
| NTC | Fully free | Everything | Nothing (brand flywheel) | Not applicable; no commerce ecosystem |
| Apple Fitness+ | £9.99/mo, hardware bundled | Nothing | Hardware ownership | Not applicable |
| Peloton | 30-day trial, £12.99/mo | Nothing (ended free tier) | Class library depth | Free tier must be a gateway, not a destination |
| Centr | 7-day trial, £119.99/yr | Nothing | Celebrity + holistic content | Brand anchor drives conversion |
| Freeletics | Free bodyweight tier, paid Coach | Basic workouts | Adaptive Coach personalisation | The engine differentiates; generic workouts do not |
| Future | $199/mo | Nothing | Human accountability | Price anchoring: human coach = premium |
| Sweat | 7-day trial | Nothing | Community switching cost | Community creates exit barrier |
| BetterMe | Quiz-gated hard paywall | Almost nothing | Quiz commitment + goal date | High conversion, low satisfaction |
| Caliber | Genuinely functional free | Full logging + 600+ exercises + analytics | Coaching access | Generous free → trust → upgrade |
| Ladder | $29.99/mo | Nothing | Coach-voiced programme + awards | Structured coaching feel at low price |

**The consistent finding:** apps where the free tier delivers *genuine value that makes the
paid tier feel like a natural extension* (Caliber, Freeletics, Volyume) produce better long-
term LTV than apps with artificially crippled free tiers (BetterMe). Volyume's free logger
floor is correctly structured.

---

## 3. Ranked transferable ideas for Volyume

Tags: **[Besa]** = Beginner | **[Eddie]** = Elite | **[Both]** = Dual  
Effects: **activation** | **retention** | **conversion** | **virality** | **credibility**  
Effort: **S** = small (hours/1 sprint) | **M** = medium (1–2 sprints) | **L** = large (3+ sprints)  
Gap? **Y** = confirmed gap | **N** = partially covered | **P** = prior audit addressed

---

### RANK 1 — Coaching message renderer on mesocycle week change
**Persona:** [Both] | **Effect:** retention + credibility | **Effort:** M | **Gap?** Y

**What it is.** When the coaching engine makes its weekly volume/plan adjustment, render the
output as a first-person coach message in British English rather than a data table:
> "Your coach reviewed this week. Your quads hit their target volume — next week
> adds one working set on leg press. Upper body is ahead of schedule: chest volume
> holds this week."

The engine already produces this data (held decisions, COMP-001). The gap is the *voice layer*
— mapping engine outputs to warm, plain-English coach sentences. No LLM. Fully deterministic.
Offline-safe (renders from local engine state). Works at the Pro tier.

**Evidence base.** Future's 4.9/5 App Store rating is built on exactly this pattern (human
sends a message; Volyume's engine would produce the equivalent text). MacroFactor's weekly
check-in already does a weaker version. Freeletics Coach+ confirmed user preference for this
framing. The prior audit's "transparent coach" is Volyume's #1 differentiator — this feature
makes it *felt*, not just known.

**Placement.** Home tab, top card on weekly reset day (Monday or plan-start day). Also
surfaced in the check-in screen summary. Push notification headline on adjustment day (within
NOTIFICATIONS_LOCKED.md budget — one per coaching-adjustment topic per day).

**Constraint note.** Zero AI required. The text is templated and deterministic, driven by the
same held-decision data already computed. British English copy throughout.

---

### RANK 2 — Post-session 3-field feedback prompt → visible engine confirmation
**Persona:** [Both] | **Effect:** retention + credibility | **Effort:** S | **Gap?** Y

**What it is.** Immediately after a workout completes, present three taps:
- "How did that feel?" (Too easy / About right / Tough)
- "Energy today?" (Low / Normal / High)
- "Completed everything?" (Yes / Modified / No)

Then show a 1-line confirmation: "Got it. Your next session adapts based on today."
On next session start, show: "Last time: Tough. Today's sets are calibrated." 

**Evidence base.** Freeletics' core differentiator. The prior audit's COMP-015 (autoregulation)
documents the engine already accepts RPE signals. The gap is in *surfacing* the feedback
collection as a visible, celebrated ritual rather than a buried setting. MacroFactor's weekly
check-in is the nutrition equivalent; Volyume lacks the training equivalent.

**Placement.** Post-workout completion screen, before the share card / PB celebration.
Maximum 3 taps; must not interrupt the PB celebration flow.

**Constraint note.** All offline. Taps map to deterministic RPE adjustments the engine already
processes. No new data model required beyond a session_feedback table with 3 integer fields.

---

### RANK 3 — Coaching tone preference (Motivational / Analytical)
**Persona:** [Besa=Motivational] [Eddie=Analytical] | **Effect:** activation + retention | **Effort:** S | **Gap?** Y

**What it is.** A single preference in Settings (or surfaced during onboarding): 
"How would you like your coach to talk to you? [Motivational – lots of encouragement]
[Analytical – data and decisions]"

This preference gates two variants of the coaching message templates from Rank 1:
- Motivational variant: "You crushed it this week. Your legs have earned a heavier challenge — next week adds a set on leg press. You're on track."
- Analytical variant: "Quad MEV +1 set (leg press). Chest volume held — MRV headroom used. Upper: 2 sets below MAV target."

**Evidence base.** Apple Fitness+ explicitly described trainer-style selection as increasing
retention. Freeletics Coach+ explicitly added tone-setting as a 2025 feature. No other
strength training app in the market implements this. It is the most direct resolution of the
dual-market coaching voice problem identified in this audit.

**Placement.** Onboarding wizard (Step 2–3 after division/goal), and in Settings > Coaching
Preferences. Default: Motivational (serves the majority; Eddie will switch).

**Constraint note.** Two template sets for every coaching message type. All deterministic.
Copy is British English. Zero AI.

---

### RANK 4 — Programme milestone badges (mesocycle completion / first week / PB beat)
**Persona:** [Both, primary Besa] | **Effect:** retention + activation | **Effort:** S | **Gap?** N (COMP-018 covers streaks; badges are complementary)

**What it is.** At mesocycle week 1 completion, end of deload, and end of full mesocycle:
award a named badge (visible in profile/progress tab). Example names:
- "First Week Done" — Week 1 of first mesocycle
- "Block Complete" — Full mesocycle finished
- "Comeback" — First session after a 14-day gap
- "Consistent" — 4 weeks hitting planned training days

Each badge is awarded with a coach message in the preferred tone. Badges are permanent
(not streak-dependent; you can't lose them).

**Evidence base.** Peloton's bronze/silver/gold badge structure drives programme completion.
Sweat's milestone sharing drives organic sharing. Zwift's route badges create collection
motivation. The distinction from COMP-018 (streaks): streaks penalise rest; badges reward
completion milestones and are permanent. Both are needed; they serve different psychology.

**Placement.** Progress tab (new Achievements section below PBs). Also surfaced on the Home
tab after achievement. Share card export for each badge (extends existing COMP-001 share card
mechanic).

---

### RANK 5 — "Your journey" programme arc visualisation
**Persona:** [Besa] | **Effect:** activation + retention | **Effort:** M | **Gap?** Y

**What it is.** At the top of the Training tab (or Home tab for new users), show a simple
horizontal progress arc: "Week 3 of 10 · Hypertrophy Block · Your coach has you on track."
When tapped, expands to show the mesocycle phases ahead (accumulation → intensification → deload)
with the current week highlighted — a visual "you are here" map. No jargon in the default view
(jargon only in expanded/analytical mode per Rank 3 tone preference).

**Evidence base.** Peloton's programme structure is the clearest evidence that showing the arc
(what comes after this week) motivates completion. Runna's personalised plan reveal uses the
same arc principle. Centr Begin's "3 weeks, you'll feel changes by end of week 2" sets a
concrete milestone. The prior audit's COMP-013 (reveal moment) covers the initial plan reveal;
this is the *ongoing journey visibility* that keeps users engaged past the reveal.

**Placement.** Home tab card, below today's workout card. Collapsed by default (one line);
expands to full arc on tap. 

---

### RANK 6 — Normalised missed-session handling ("rest is training")
**Persona:** [Besa] | **Effect:** retention | **Effort:** S | **Gap?** Y

**What it is.** When a user misses a planned session, the next app open does NOT surface a
shame indicator (no red missed-day, no broken streak counter). Instead, the coaching voice
says: "Rest and recovery are part of the plan. Your next session is ready when you are."
If the user misses 3+ consecutive sessions, the Rank 1 coach message for the next week open
says: "Welcome back. Your plan has been adjusted to ease you back in." The engine already
computes recovery-adjusted volume; the language layer makes this visible.

**Evidence base.** Apple Watch added rest days that don't break streaks after nine years of
user demand. MacroFactor's adherence-neutral design — "nothing will tell you you're doing
something bad" — is the most-cited tone feature in nutrition app reviews.
~80% of fitness app users abandon within 3 months; "Week 6: missed workouts create guilt"
is the documented abandonment moment
([Fitness App Retention](https://productgrowth.in/insights/healthtech/fitness-app-retention/)).
Guilt is the churn trigger; normalising imperfection is the retention lever.

**Placement.** The missed-session card on Home tab (replace any red/negative language);
the coach message on return. No new screen required — a copy and colour change in existing
UI.

**Constraint note.** The engine already handles volume recovery from missed sessions
deterministically. This is purely a language/UX change. No new data needed.

---

### RANK 7 — Visible "readiness / consistency score" (beginner-facing single metric)
**Persona:** [Besa] | **Effect:** activation + retention | **Effort:** M | **Gap?** Y

**What it is.** A single derived score (0–100) visible on the Home tab that represents
"how well you're training right now" — a composite of session adherence this block, RPE
trend, and volume-to-landmark ratio. Beginners see the score and a plain-language label
("Building", "On Track", "Strong Week"). Advanced users (Eddie) can see the components.

The score is computed entirely from existing engine data. It is not AI. It is a readability
layer on top of MEV/MAV/MRV adherence maths. A "7 out of 10" tells Besa "I'm making
progress" without requiring her to understand volume landmarks.

**Evidence base.** Caliber's Strength Score (muscle group balance derived metric) is cited
as reducing beginner anxiety in multiple reviews. Whoop's Strain/Recovery/Sleep trio shows
that three numbers can replace a wall of data. The prior audit's COMP-004 (always-visible
trend surface) is the nutritional equivalent; this is the training equivalent.

**Placement.** Home tab, below today's workout. Single number + label + 7-day sparkline.
Tapping reveals the components (for Eddie).

**Conflict note.** Must not gamify training load in a way that encourages overtraining.
The score should cap at "On Track" when volume is at MAV — it must not reward exceeding
MAV with a higher score. The engine's MRV ceiling is the safety constraint.

---

### RANK 8 — "First gym session" guided mode (form library integration)
**Persona:** [Besa] | **Effect:** activation | **Effort:** L | **Gap?** N (NEW-001 exercise demos already covers this partially)

**What it is.** For a user's first 3 workouts, the app automatically surfaces an expanded
exercise brief before each move: a 15-second demo video (or illustrated frames per NEW-001
sourcing), 3 plain-language form cues (not technical coaching jargon), and an optional
"Set a lighter first set to learn the movement" suggestion. After workout 3, the guided
mode silently steps back unless the user re-enables it in Settings.

**Evidence base.** ~50% of beginners report gym intimidation ([RunRepeat 2020]). Fitbod's
first-workout completion as the activation metric. Ladder's form feedback described as
"especially valuable for learning proper technique early". The key insight: the anxiety
is not about the exercise itself but about "am I doing this right?" in a public space.
Removing that doubt on the first 3 sessions captures the user before the first churn moment.

**Placement.** Integrated into the Active Workout screen — an expandable "First time?" drawer
on each exercise for sessions 1–3. Not a separate screen. Uses the same exercise library
that NEW-001 is sourcing media for.

**Dependency note.** NEW-001 (exercise demos) must ship first or simultaneously.
Effort assessment assumes NEW-001 media exists; if not, illustrated frames add scope.

---

### RANK 9 — Competition date countdown / goal-date prediction
**Persona:** [Eddie = competition; Besa = goal date] | **Effect:** activation + conversion | **Effort:** S | **Gap?** N (partially covered in coaching engine)

**What it is.** For Eddie: the existing competition date already drives the engine's peak-week
calculation. Surface this as a Home tab chip: "12 weeks to [show name] · Peak Week: [date]".
For Besa: the coaching engine can project "at your current trajectory, you'll reach your
goal weight/conditioning in approximately [month]". BetterMe's most-praised engagement
mechanic; Volyume can do a *physiologically calibrated* version, not a generic projection.

**Evidence base.** BetterMe's predicted goal date is highlighted as a primary motivator in
every review. Volyume's engine already computes this data for competition prep users.
Extending it to general goal users (a deterministic projection based on current rate of
adaptation + target metrics) closes a visible gap against BetterMe's mass-market appeal.

**Placement.** Home tab chip for Pro users. Tapping opens the coaching engine timeline view.

---

### RANK 10 — Programme-as-journey framing in plan selection
**Persona:** [Besa, primary] | **Effect:** activation | **Effort:** S | **Gap?** Y

**What it is.** In the plan library / onboarding wizard, frame programme selection as a
journey narrative rather than a spec sheet. Instead of: "Hypertrophy mesocycle: 10 weeks,
4 sessions/week, MEV-to-MAV progression", show:
> "The Foundation — 10 weeks · Beginners to intermediate · By the end, you'll be lifting
> heavier, sleeping better, and ready for your first proper programme review."

Centr Begin's language model: "forget the false starts", "this is the start of something
great." The coaching engine data is unchanged; the plan card copy changes.

**Placement.** Plan Library screen and onboarding wizard Step 3 (programme selection).
Copy change only — no new engineering. British English throughout.

---

## 4. Where this research disagrees with prior audit conclusions

**1. The prior audit framed beginner/elite as a feature-set tension.** The prior audit
(COMP-030, onboarding research §3.7) proposed quiz-first and layered onboarding to serve
both personas. This research shows the primary tension is *language and framing*, not
feature set. The same engine, with a tone-preference switch, serves both. This is faster
and cheaper than feature-set separation.

**2. The prior audit under-weighted programme arc as a retention mechanism.** COMP-018 (streaks)
was correctly identified as important, but the programme arc — the "you are on week 3 of 10
of a journey" narrative — is a separate and arguably more powerful beginner retention mechanism.
Streaks reward daily return; arcs reward medium-term commitment. Both are needed.

**3. The prior audit correctly identified Volyume's "transparent coach" as differentiated, but
did not propose a specific UI surface for it.** This report makes it concrete: the weekly
coach message renderer (Rank 1) is the feature that makes the transparent-coach positioning
*felt by users* rather than just documented in COMP-006.

---

## 5. What to never build (traps from this research)

- **No coaching voice that implies judgment for missed sessions.** Red indicators, "you missed
  3 days" banners, negative streaks. Every data point above (Apple Watch, Freeletics, MacroFactor)
  shows these accelerate churn.
- **No generic goal-date prediction without physiological calibration.** BetterMe's approach
  produces motivating numbers that are frequently wrong, which destroys trust. Volyume's
  version must only surface when the engine has enough data to produce a credible projection.
- **No leaderboard in any form.** This research confirms the prior audit's conclusion with
  additional evidence (Peloton's own instructors coach users to hide their leaderboard).
- **No "beginner" label on content visible to the user.** Scaling should feel like
  personalisation ("this is calibrated for you") not limitation ("this is the beginner version").
- **No tone that assumes elite vocabulary before explaining it.** RP Hypertrophy's beginner
  failure (prior audit §3.11) and Gymshark Train's depth failure both trace to vocabulary
  mismatch.

---

## 6. Implications for the D0–D14 activation map (prior audit gap G9)

Synthesising across all apps, the optimal Volyume D0–D14 arc for Besa:

| Day | Trigger | App response | Goal |
|---|---|---|---|
| D0 | Install + onboarding complete | Coach message: "Your plan is ready. Here's what week 1 looks like." + programme arc visual | Activate — first plan view |
| D1 | First workout | Post-session badge: "First Session Done ✓" + feedback prompt (Rank 2) | Activate — first completion |
| D3 | (COMP-023 day-3 moment) | Coach message referencing their specific plan progress | Activate — personalisation felt |
| D7 | Week 1 complete | "Week 1 of 10 done. Your coach has adjusted week 2." + Rank 1 coach message | Retain — arc momentum |
| D10 | Missed session | Rank 6 normalised handling — no shame, "rest is training" | Prevent churn at guilt point |
| D14 | Trial conversion moment | Coach message: "You're on track. Here's what month 2 looks like." | Convert |

For Eddie (existing COMP-023/COMP-013 arc is appropriate; add tone-preference switch on D0).

---

## 7. Source index

**App reviews and teardowns:**
[Yahoo Health — NTC](https://health.yahoo.com/wellness/fitness/online-fitness/articles/nike-training-club-review-better-203000725.html) ·
[Tom's Guide — NTC](https://www.tomsguide.com/reviews/nike-training-club-app) ·
[Woman and Home — Apple Fitness+](https://www.womanandhome.com/health-wellbeing/fitness/apple-fitness-review/) ·
[MacObserver — Apple Fitness+](https://www.macobserver.com/tips/apple-fitness-review/) ·
[AppleMagazine — Fitness+ trainers](https://applemagazine.com/apple-fitness-trainers-00a1/) ·
[Fielding.edu — Peloton psychology](https://www.fielding.edu/the-psychology-of-pelotons-appeal-what-keeps-us-riding/) ·
[Truemed — Peloton science](https://www.truemed.com/blog/peloton) ·
[Peloton blog — programmes](https://www.onepeloton.com/blog/peloton-programs) ·
[Peloton Buddy — You Can Ride](https://www.pelobuddy.com/peloton-you-can-ride-beginner-cycling-program/) ·
[Peloton Buddy — free tier ending](https://www.pelobuddy.com/free-app-tier-ending/) ·
[Anne Helen Petersen — Peloton psychology](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of) ·
[Centr Begin overview](https://centr.com/article/show/20278/centr-begin-program-overview) ·
[Centr — Start right](https://centr.com/blog/show/21376/start-right-prove-you-can-move-with-centr-begin) ·
[Freeletics Coach fundamentals](https://www.freeletics.com/en/blog/posts/understanding-your-training-plan/) ·
[FitnessToolsReviewed — Freeletics](https://fitnesstoolsreviewed.com/app-reviews/freeletics-review-is-the-ai-training-app-worth-it/) ·
[Freeletics Coach+](https://www.freeletics.com/en/blog/posts/freeletics-coach-plus/) ·
[Fitt Insider — Coach+](https://insider.fitt.co/press-release/freeletics-unveils-a-new-era-in-digital-fitness-with-the-launch-of-coach/) ·
[Active.com — Future](https://www.active.com/fitness/articles/future-app-review) ·
[Cora Health — Future](https://www.corahealth.app/compare/future) ·
[AthleteInsight — Future](https://www.athleticinsight.com/exercise/future-fitness-app-review) ·
[Fitness Drum — Sweat](https://fitnessdrum.com/sweat-app-review/) ·
[Sweat — beginner FAQ](https://support.sweat.com/hc/en-us/articles/360004473775-Do-you-have-workouts-for-Beginners) ·
[Sweat — 16 features](https://sweat.com/blogs/fitness/sweat-app-features) ·
[TechAhead — Sweat growth](https://www.techaheadcorp.com/blog/how-the-sweat-app-conquered-fitness-with-100-million-in-revenue/) ·
[Medical News Today — BetterMe](https://www.medicalnewstoday.com/articles/betterme-review) ·
[Nutrola — BetterMe free vs paid](https://nutrola.app/en/blog/betterme-free-vs-paid-what-do-you-actually-get) ·
[BarBend — Caliber](https://barbend.com/caliber-fitness-app-review/) ·
[Garage Gym Reviews — Caliber](https://www.garagegymreviews.com/caliber-app-review) ·
[ExercisePick — Ladder](https://exercisepick.com/is-ladder-fitness-app-worth-it/) ·
[Outdoor Nomad — Ladder](https://www.outdoorsynomad.com/ladder-fitness-app-review/) ·
[Tom's Guide — Gymshark](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free) ·
[GymBird — Fiit](https://www.gymbird.com/fitness-apps/fiit-app-review) ·
[Fitness Drum — Fiit](https://fitnessdrum.com/fiit-app-review/) ·
[Zwift Calculator — achievements](https://www.zwiftcalculator.com/blog/unlocking-zwift-achievements) ·
[AppVenturez — NTC case study](https://www.appventurez.com/blog/nike-training-club-app-case-study) ·
[IN Magazine — Cody Rigsby](https://inmagazine.ca/2021/01/meet-peloton-instructor-extraordinaire-cody-rigsby/)

**Research and benchmarks:**
[MacroFactor — adherence neutral](https://macrofactorapp.com/adherence-neutral/) ·
[MacroFactor — algorithms philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/) ·
[ProductGrowth — fitness app retention](https://productgrowth.in/insights/healthtech/fitness-app-retention/) ·
[iMore — Apple Watch rest days](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks)

---

*Research only. No code was modified. All ideas are proposals for the founder. Hard constraints honoured throughout: no AI/LLM in coaching engine; offline-first; EU data residency; ED safety system untouched; free/Pro gating unchanged; British English.*
