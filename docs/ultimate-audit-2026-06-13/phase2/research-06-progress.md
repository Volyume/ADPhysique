# Research 06 — Progress Tracking & Visualisation

Phase 2 Ultimate Audit (2026-06-13) — Agent 6
Brief: research 50+ apps on progress tracking/visualisation. Answer: which metrics
users check daily vs weekly vs never; which visualisations are most emotionally
motivating; newbie-with-no-data vs athlete-with-years; milestone/celebration
retention mechanics; plateau handling that supports without patronising; what
users say is missing; psychology of progress visualisation & motivation.

British English throughout. Every finding carries a status and a source URL.
Inferences are labelled INTERPRETATION and kept separate from sourced findings.

---

## 1. APPS RESEARCHED

| # | App | Status | One-line note |
|---|-----|--------|---------------|
| 1 | Strong | VERIFIED | Volume + 1RM progression graphs; charts paywalled to Pro. |
| 2 | Hevy | VERIFIED | Best-praised free charts; live PR notifications; Year in Review recap. |
| 3 | FitNotes | VERIFIED | Free, ad-free Android logger; per-exercise history. |
| 4 | JEFIT | VERIFIED | 1,400+ exercises; volume-by-muscle, body measurements, photos; dated UI. |
| 5 | Setgraph | VERIFIED | Exercise-first; complete per-movement history regardless of routine. |
| 6 | Boostcamp | VERIFIED | Programme-led, session-by-session guidance. |
| 7 | Fitbod | VERIFIED | Adaptive strength recs + deeper progress tracking. |
| 8 | Caliber | PARTIAL | Guided training; named in comparison lists. |
| 9 | Gymwolf | PARTIAL | Combines gym/cardio/bodyweight data in one place. |
| 10 | MacroFactor | VERIFIED | Adaptive TDEE + trend-weight smoothing; flagship for noise removal. |
| 11 | MyFitnessPal | VERIFIED | Nutrition-centred; exercise data connected. |
| 12 | Cronometer | PARTIAL | Micronutrient depth; named vs MacroFactor. |
| 13 | Lose It | PARTIAL | Weight-loss tracker; named in lists. |
| 14 | Happy Scale | VERIFIED | Trend-weight smoothing + forecast; loved for morale. |
| 15 | Libra (Android) | VERIFIED | Trend line + smoothing; consistent-trajectory praise. |
| 16 | Noom | VERIFIED | Coaching/mood check-ins; "condescending" tone complaints. |
| 17 | Apple Watch / Fitness | VERIFIED | Activity rings; goal-gradient; also ring-guilt/obsession reports. |
| 18 | Fitbit | VERIFIED | Sleep stages, readiness, nudges; redesign backlash on dashboard clutter. |
| 19 | Garmin Connect | VERIFIED | Long-term training analysis; detailed post-session breakdowns. |
| 20 | WHOOP | VERIFIED | Strain/recovery/readiness scoring rather than ring progress. |
| 21 | Oura | PARTIAL | Readiness/sleep scoring; named in wearable comparisons. |
| 22 | Strava | VERIFIED | Year in Sport recap (now paywalled $80); social engagement core. |
| 23 | Gentler Streak | VERIFIED | Self-compassion design; rest days don't break streak; Apple Watch AOTY 2022. |
| 24 | Rings+ | VERIFIED | Brings ring-closing UX to any Apple Health tracker. |
| 25 | Cora | PARTIAL | "Progress across every metric"; review aggregator. |
| 26 | PR - Workout Tracker & Log | VERIFIED | Animated achievement cards; XP/level system Beginner→Legend. |
| 27 | RepCount | VERIFIED | Auto confetti burst on new record. |
| 28 | PR Tracker (Workout Records) | VERIFIED | Auto-detects + celebrates PRs. |
| 29 | PRTracker (Gym Record) | PARTIAL | Dedicated PR-record app. |
| 30 | Personal Records – PRs | PARTIAL | Dedicated PR app. |
| 31 | Fiytt | PARTIAL | PR logs + workout notes. |
| 32 | FitPros.io client app | VERIFIED | Post-workout recap card with confetti, volume, streak, PRs. |
| 33 | Strides | VERIFIED | 4 tracker types; visual progress front-and-centre; charts. |
| 34 | Habitica | PARTIAL | Gamified habit RPG; named feedback mechanic. |
| 35 | Way of Life | PARTIAL | Habit feedback mechanic; named. |
| 36 | Lifetick | PARTIAL | Goal-tracking; named. |
| 37 | Duolingo (cross-domain) | VERIFIED | Streak system ~3× higher DAU; loss-aversion exemplar. |
| 38 | Body Measurement Tracker | VERIFIED | Graph of measurements over 7/30/all days. |
| 39 | Body Composition Tracker | PARTIAL | Body-part trend charts. |
| 40 | BodyMetrics | PARTIAL | Body metrics app. |
| 41 | Body Stats | PARTIAL | Body tracking app. |
| 42 | Body Measurements Pro | PARTIAL | Measurements app. |
| 43 | My Body Measurement Tracker | PARTIAL | Measurements app. |
| 44 | EvoluaFIT | PARTIAL | Body metrics app. |
| 45 | Progress Studio | PARTIAL | Progress-photo/tracking app. |
| 46 | Progress Pics: Fitness Tracker | PARTIAL | Progress-photo app. |
| 47 | Strength Progress Tracker | PARTIAL | Strength progression app. |
| 48 | Pushups – Track Your Progress | PARTIAL | Single-movement progress app. |
| 49 | GymBook – Progress Tracker | PARTIAL | Progress tracker app. |
| 50 | Training Visualizer | PARTIAL | Visualisation-named app. |
| 51 | Strongmax (Lifting Tracker) | PARTIAL | Lifting tracker. |
| 52 | Strength Tracker – Growth Log | PARTIAL | Strength log. |
| 53 | Stronger (mobile app) | PARTIAL | Strength training tracker; comparison source. |
| 54 | Gymgress | PARTIAL | Progress tracker app. |
| 55 | Pumpedapp | PARTIAL | Progress tracker app. |

55 apps recorded; 25 VERIFIED with substantive sourced detail, 30 PARTIAL
(named/listed but limited independent data — mostly the long tail of
single-purpose App Store trackers). This clears the 50-app and 20-VERIFIED bars.

---

## 2. FINDINGS

### Q1 — Which metrics do users check DAILY vs WEEKLY vs NEVER?

**FINDING 1.1 — Bodyweight is checked daily but should be interpreted weekly.**
Healthy individuals fluctuate ~2.3–2.7 kg (5–6 lb) per day from water, food,
digestion and hormones; daily readings are noise, the weekly average is signal.
"An individual weighing near daily will learn to differentiate the 'noise' of
day-to-day weight fluctuations from the underlying trend."
- NEWBIE: reads each daily number as real progress and is whipsawed by it; a
  +0.8 kg salt morning reads as failure.
- ATHLETE: already weighs daily and mentally smooths; wants the app to do the
  smoothing explicitly.
- Status: VERIFIED — https://pmc.ncbi.nlm.nih.gov/articles/PMC4846305/ and
  https://health.clevelandclinic.org/weight-fluctuations

**FINDING 1.2 — Per-exercise strength numbers (weight/reps/1RM) are the daily/
per-session check for lifters.** Setgraph's whole design is that "every time you
train an exercise, you see your complete history for it"; Hevy/Strong surface
last-session figures at logging time. This is the in-the-moment "what do I lift
today" metric.
- NEWBIE: needs last-time numbers shown automatically or won't know what to load.
- ATHLETE: checks per-set history every session to drive progressive overload.
- Status: VERIFIED — https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters

**FINDING 1.3 — Volume and 1RM trend graphs are the WEEKLY/monthly check.**
"Being able to visualise your bench press over 6 months is cited as one of the
most motivating things a tracker can show." Hevy lets users view the last 30
days / 3 months / year / all time — a review-period cadence, not a daily one.
- NEWBIE: little to show for weeks; trend view is near-empty early (see Q3).
- ATHLETE: this is the core retention metric — the 6-month strength curve.
- Status: VERIFIED — https://www.corahealth.app/blog/best-workout-tracker-reddit
  and https://www.hevyapp.com/features/gym-progress/

**FINDING 1.4 — Wearable readiness/recovery scores are a daily check for that
cohort.** WHOOP centres strain/recovery/readiness "to guide effort day to day";
Garmin/Oura similar. Apple ring closure is an explicitly daily metric.
- NEWBIE: readiness scores can confuse before training literacy exists.
- ATHLETE: daily readiness gates session intensity.
- Status: VERIFIED — https://www.ambitiousathletics.com/blog/whoop-vs-apple-watch

**FINDING 1.5 — "NEVER" checked: granular micronutrients and most body-part
girths beyond a couple.** Cronometer's micro depth is a niche differentiator,
not a daily habit; body-measurement trackers default to short look-back windows,
implying infrequent entry. INTERPRETATION below separates the inference.
- Status: PARTIAL — https://nutriscan.app/blog/posts/macrofactor-vs-cronometer-2026-62a278ee64
- INTERPRETATION: the proliferation of single-purpose measurement apps (#38–43)
  with 7/30/all-time windows suggests most users log measurements sporadically
  (monthly) rather than daily; not a directly sourced frequency claim.

---

### Q2 — Which visualisations are most EMOTIONALLY MOTIVATING?

**FINDING 2.1 — The upward strength line over months is the single most-cited
motivator.** "Seeing that your bench press has gone up 20 pounds over three
months is motivating in a way that generic fitness content rarely is… raw
numbers in a spreadsheet aren't." Apps without decent charts "lose users as they
get more experienced."
- NEWBIE: the line is short/flat early — emotional payoff is delayed.
- ATHLETE: the long line is the reason they stay; degrade it and they churn.
- Status: VERIFIED — https://www.corahealth.app/blog/best-workout-tracker-reddit

**FINDING 2.2 — Progress photos beat the scale for emotional reinforcement.**
Photos capture muscle definition, posture and composition the scale cannot;
"visual evidence of change triggers dopamine release… reinforcing positive
behaviours." A body-composition study found visual-progress trackers stayed more
consistent than weight-only trackers.
- NEWBIE: photos are the most legible early win when numbers haven't moved.
- ATHLETE: photos are the contest-prep/recomp truth when scale weight is flat.
- Status: VERIFIED — https://www.rumen.com.au/article/using-progress-photos-to-stay-motivated/
  and https://www.fitbudd.com/academy/why-progress-photos-matter-in-fitness-and-the-best-apps-to-track-them

**FINDING 2.3 — The smoothed trend line (vs raw scatter) is itself the
motivator for weight.** Happy Scale: "the moving averages really helps keep your
spirits up because it shows your real progress on a smooth curve"; it exists to
stop users "panicking about daily gains." MacroFactor's smoothing means "you're
not emotionally reacting to a 0.8 kg gain that's really just… salt."
- NEWBIE: the smoothed curve is the difference between quitting and continuing.
- ATHLETE: removes recomp/water noise so a real plateau is distinguishable.
- Status: VERIFIED — https://happyscale.com/ and
  https://macrofactor.com/expenditure-v3/ (smoothing described) /
  search-confirmed at https://www.amyfoodjournal.com/blog/macrofactor-review

**FINDING 2.4 — Filling rings / goal-gradient visual is highly motivating —
but double-edged.** Apple's Activity rings "employ a goal-gradient effect…
making progress visible and turning accomplishments into memorable milestones";
closing them "sparks a competitive mindset." Caveat carried fully in Q5.
- NEWBIE: instant daily completion feedback before any long-term data exists —
  strong early hook.
- ATHLETE: can trivialise real training (a walk closes a ring on a rest day).
- Status: VERIFIED — https://beyondnudge.substack.com/p/the-psychology-behind-apple-watch

---

### Q3 — NEWBIE with no data vs ATHLETE with years

**FINDING 3.1 — The empty state is the primary newbie churn point.** "When a
fitness app shows an empty interface after sign-up where users must manually
input goals/habits, there's a lot of work before users can get value… likely to
lead to churn for all but the most motivated." Best practice: "show the user's
own metrics before anything else within 30 seconds" (synced device data,
strength assessment, or rings), and "make the first workout the onboarding."
- NEWBIE: needs borrowed/synced data or a quick assessment so the dashboard
  isn't a blank canvas; route by motivation (weight loss / strength / health).
- ATHLETE: wants to import/backfill history fast so the long graph appears at
  once — the opposite problem (don't make them start from zero).
- Status: VERIFIED — https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0
  and https://www.everyinteraction.com/articles/empty-states-in-user-onboarding/

**FINDING 3.2 — First-week activation is decisive.** "Most fitness apps see
20–30% of users complete even one workout in their first week; top-tier apps hit
over 50%. A single friction point in the first 48 hours… and the user never
returns." One onboarding push notification in week one "can increase retention
by 71% over two months."
- NEWBIE: the metric to optimise is "first logged workout/meal," not "perfect
  profile."
- ATHLETE: friction is different — it's data portability and logging speed
  between sets, not first-workout completion.
- Status: VERIFIED — https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0

**FINDING 3.3 — Charts must scale gracefully across experience.** Cora's Reddit
synthesis: "Apps without decent charts lose users as they get more experienced."
The implication is a dual requirement — meaningful even with 1 data point, and
deep enough (filters, periods, per-exercise) for years of history.
- NEWBIE: needs encouragement-framed near-empty charts.
- ATHLETE: needs slice-by-exercise/period analytics (Strong's pro filtering).
- Status: VERIFIED — https://www.corahealth.app/blog/best-workout-tracker-reddit

---

### Q4 — MILESTONE / CELEBRATION mechanics that drive RETENTION

**FINDING 4.1 — Streaks exploit loss aversion and lift DAU sharply.** "People
feel the pain of losing something about twice as strongly as the pleasure of
gaining… once a user has a 20-day streak, the fear of losing it becomes a
stronger motivator than any reward." Duolingo's streak users show ~3× higher
daily active use. Apps combining streaks + milestones see "40–60% higher DAU"
and (Forrester 2024, cited) "reduce 30-day churn by 35%."
- NEWBIE: streaks build the daily habit before intrinsic motivation forms.
- ATHLETE: streaks can conflict with programmed rest (see Gentler Streak, Q5).
- Status: VERIFIED — https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps
  and https://www.nudgenow.com/blogs/gamify-your-fitness-apps
  (Forrester figure is second-hand via this source — treat as PARTIAL on the stat.)

**FINDING 4.2 — Live PR detection + confetti is now table stakes.** Hevy fires a
live PR notification mid-training for new best 1RM, heaviest weight for reps, set
volume, most reps or duration. RepCount: "confetti drops automatically" on new
PR. FitPros: post-workout recap card with confetti, total volume, duration,
streak and any new PRs. PR app: animated achievement cards + XP levels
Beginner→Legend.
- NEWBIE: PRs are frequent early (every session is a best) — high reward density.
- ATHLETE: PRs are rare and therefore more meaningful — celebration must not feel
  cheap or fire on trivial firsts.
- Status: VERIFIED — https://www.hevyapp.com/features/live-pr/ ,
  https://getrepcount.app/ , https://fitpros.io/personal-trainer-client-app ,
  https://apps.apple.com/us/app/pr-workout-tracker-log/id6740501315

**FINDING 4.3 — Annual "Wrapped"-style recaps drive sharing and re-engagement.**
Hevy ships a Year in Review recap; Strava's Year in Sport is "a highly
personalised recap… highlighting unique data insights, meaningful social
engagements and stand-out moments." It is the Spotify-Wrapped model applied to
fitness. CAUTION: Strava moved Year in Sport behind an $80 paywall in 2025 and
"roiled" users — a recap is a retention asset and paywalling it is resented.
- NEWBIE: a first-year recap can manufacture a milestone from modest data.
- ATHLETE: the recap quantifies a serious training year — strong share/identity.
- Status: VERIFIED — https://www.hevyapp.com/features/year-in-review/ ,
  https://www.techradar.com/computing/software/stravas-year-in-sport-is-rolling-out-now-its-like-spotify-wrapped-for-your-activities ,
  https://news.slashdot.org/story/25/12/19/2158235/strava-puts-popular-year-in-sport-recap-behind-an-80-paywall

---

### Q5 — PLATEAUS handled SUPPORTIVELY without PATRONISING

**FINDING 5.1 — Trend-weight smoothing is the least-patronising plateau tool: it
reframes without lecturing.** Happy Scale/Libra/MacroFactor show a plateau
honestly as a flat smoothed line while stripping the false-alarm noise, so the
user isn't told "don't worry" — they're shown the real picture. MacroFactor goes
further and re-derives TDEE and adjusts targets when the trend stalls (the
plateau triggers an action, not a platitude).
- NEWBIE: smoothing prevents a normal stall reading as total failure.
- ATHLETE: an actual plateau is surfaced cleanly so they can change the variable.
- Status: VERIFIED — https://happyscale.com/ ,
  https://www.amyfoodjournal.com/blog/macrofactor-review

**FINDING 5.2 — Recomposition is the silent plateau that destroys motivation if
unexplained.** "Many people expect the scale to show linear weight loss… when
the number goes up or doesn't move, motivation collapses." Pairing photos +
measurements with weight detects composition change the scale hides.
- NEWBIE: most likely to be in recomp (newbie gains) and most likely to misread
  a flat scale — needs explicit "this is progress" via non-scale signals.
- ATHLETE: recomp/contest prep makes scale weight deliberately misleading.
- Status: VERIFIED — https://www.trainerize.me/articles/body-recomposition-why-you-should-stop-focusing-on-the-scale/

**FINDING 5.3 — Tone can tip into patronising and users notice fast (Noom as the
cautionary tale).** Users found Noom prompts "condescending or insensitive" —
e.g. a weigh-in nudge: "Now that you've weighed yourself (wait, you still
haven't? What would Michael Jordan say?" — and the red/yellow/green food
"traffic light" system was called condescending. The supportive side that worked
was non-judgemental check-ins ("hills, valleys and flat roads") and real-time
mood support — support framed as company, not correction.
- NEWBIE: fragile to shaming tone; needs "I'm learning" reframes, not guilt.
- ATHLETE: actively repelled by hand-holding; wants data and an adjustment, not
  a pep talk.
- Status: VERIFIED — https://www.consumeraffairs.com/health/noom.html and
  https://untrapped.com.au/a-psychologist-reviews-the-dark-psychology-of-noom-part-1/

**FINDING 5.4 — Self-compassionate design (Gentler Streak) is the proven
positive model and won Apple Watch App of the Year 2022.** "Rest days don't
break your exercise streak"; it "meets people where they are," nudges users to
rest after poor sleep or hard days, and lets users set sick/injured/off statuses.
This directly answers "supportive without patronising": it removes the punitive
mechanic rather than apologising for it.
- NEWBIE: removes the all-or-nothing streak trap that causes early quitting.
- ATHLETE: respects programmed deloads/rest as legitimate, not streak failures.
- Status: VERIFIED — https://developer.apple.com/news/?id=3m0ht22s ,
  https://thenextweb.com/news/slovenian-fitness-tracker-won-apple-watch-app-of-the-year-award

---

### Q6 — What's MISSING that users REQUEST

**FINDING 6.1 — Don't remove tracking depth in redesigns; clutter and lost
features are top complaints.** Recent app updates drew Reddit/Twitter/Play-Store
complaints for removing rep tracking and rest-period planning; "a cluttered
dashboard is one of the most repeated complaints… overwhelming and requiring
more scrolling/clicks." Fitbit's redesign drew specific backlash.
- NEWBIE: harmed by clutter; needs a clean default view.
- ATHLETE: harmed by removal of granular fields they depend on.
- Status: VERIFIED — https://www.techradar.com/health-fitness/fitbit-fans-arent-happy-about-the-official-apps-redesign-heres-why
  (rep/rest-removal claim is PARTIAL — single secondary source)

**FINDING 6.2 — Combined gym + cardio + bodyweight + body-composition in one
progress view is an unmet want.** Gymwolf is positioned precisely as "the easiest
way to keep gym, cardio and bodyweight data together," implying most apps
silo these. JEFIT's volume-by-muscle + measurements + photos is praised as the
fuller picture.
- NEWBIE: wants one place, not three apps.
- ATHLETE: wants strength + conditioning + composition correlated on one timeline.
- Status: VERIFIED — https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters
  and https://www.jefit.com/wp/guide/best-workout-apps-for-2026-top-7-options-tested-and-reviewed/

**FINDING 6.3 — Paywalling progress charts is a resented gap.** Strong "you have
to upgrade to the pro version in order to see any of the progress charts over
time"; Hevy's free charts are explicitly praised by contrast. Strava's paywalled
recap backlash is the same pattern. Users expect to *see their own data*.
- NEWBIE: a free user who can't see a trend has no reason to return.
- ATHLETE: most likely to pay — but resents the *basic* trend being gated.
- Status: VERIFIED — https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
  and https://repreturn.com/hevy-app-review/

---

### Q7 — PSYCHOLOGY of progress visualisation & motivation

**FINDING 7.1 — Visual reinforcement triggers dopamine; numbers alone don't.**
"The brain responds positively to visual reinforcement… visual evidence of change
triggers dopamine release, reinforcing positive behaviours and strengthening
commitment, creating a reinforcing cycle." This underpins 2.1–2.3.
- Status: VERIFIED — https://www.rumen.com.au/article/using-progress-photos-to-stay-motivated/

**FINDING 7.2 — Goal-gradient + loss aversion are the two core levers; both can
be weaponised against the user.** Goal-gradient (rings fill, effort accelerates
near completion) and loss aversion (streaks) are documented motivators — and the
same mechanics produce compulsion. The evidence is unusually concrete here and
matters directly to Volyume's ED-safety remit:
  - Ryann Nicole (8-year user, quit): "This is not healthy. This is something
    I'm consumed by… I didn't work out to enjoy it. It was all about, what did
    the Apple Watch say?"
  - Katy Saltsman (nutritionist/PT): "There's also this stress to hit these
    random numbers every single day."
  - Jessica Post (TikToker): "Quite literally nothing has made me crazier or
    more obsessive than the notifications."
  - Cited research: a 2017 *Eating Behaviors* study linked calorie/fitness
    trackers to eating-disorder characteristics; a 2023 study found manipulated
    step counts reduced self-esteem and raised BP/HR and unhealthy eating.
  - Counter-evidence: people who closed rings "most of the time" were 57% less
    likely to report elevated stress — i.e. moderate use is protective, obsessive
    use harmful.
- NEWBIE: most susceptible to streak/ring compulsion and shame spirals.
- ATHLETE: susceptible to over-reach (ignoring fatigue to keep a streak).
- Status: VERIFIED — https://www.fortune.com/well/2025/01/24/apple-watch-bullied-burn-calories-close-rings-obsession-fitness-trackers-notifications
  (Fortune relays the studies; treat the 2017/2023 study figures as PARTIAL
  pending primary citation.)

**FINDING 7.3 — Self-weighing psychology: visual trend feedback is what makes
daily weighing safe and effective, and one subgroup is at risk.** Daily weighing
with feedback gives superior maintenance outcomes and was "not associated with
adverse psychological symptoms" — EXCEPT restrained eaters, who gained 0.53 BMI
units when weighing daily (the only subset with significant negative results).
Those who benefit "use graphic representations of weight trends."
- NEWBIE: benefits from daily weighing ONLY if shown the smoothed trend, not raw.
- ATHLETE: maintainers benefit most; the restrained-eater risk maps onto the
  ED-vulnerable cohort Volyume's safety system must protect.
- Status: VERIFIED — https://pmc.ncbi.nlm.nih.gov/articles/PMC4846305/

---

## 3. VERBATIM USER VOICE

- "The moving averages really helps keep your spirits up because it shows your
  real progress on a smooth curve." — Happy Scale user.
  https://www.iphonejd.com/iphone_jd/2025/01/review-happy-scale.html (via search)
- "It's the thing that had kept me in the gym this year because it helps me see
  results." — Hevy user. https://repreturn.com/hevy-app-review/
- "Being able to look back and see that you benched 135 six months ago and now
  you're doing 185 is genuinely motivating." — Reddit synthesis.
  https://www.corahealth.app/blog/best-workout-tracker-reddit
- "This is not healthy. This is something that I'm consumed by… It was all
  about, what did the Apple Watch say?" — Ryann Nicole.
  https://www.fortune.com/well/2025/01/24/apple-watch-bullied-burn-calories-close-rings-obsession-fitness-trackers-notifications
- "Quite literally nothing has made me crazier or more obsessive than the
  notifications." — Jessica Post (TikTok), via Fortune (same URL).
- "[Doing] press-ups at 10pm just to close their last ring… the worst kind of
  manipulation masquerading as design." — paraphrased user report.
  https://www.aol.com/finance/people-ditching-apple-watches-feeling-170502229.html
  (NOTE: this exact URL returned 404 on fetch; quote is from the search snippet —
  treat as PARTIAL until re-sourced.)
- Noom weigh-in prompt users called condescending: "Now that you've weighed
  yourself (wait, you still haven't? What would Michael Jordan say?"
  https://www.consumeraffairs.com/health/noom.html

---

## 4. BEST-IN-CLASS

- **Strength trend visualisation:** Hevy — clear free per-exercise graphs,
  volume trends, 1RM estimates, live PR notifications, Year-in-Review recap.
  https://www.hevyapp.com/features/gym-progress/ ,
  https://www.hevyapp.com/features/live-pr/
- **Weight trend / anti-noise:** MacroFactor (smoothing + adaptive TDEE that
  acts on a plateau) and Happy Scale (smoothing + forecast for morale).
  https://macrofactor.com/expenditure-v3/ , https://happyscale.com/
- **Supportive-without-patronising design:** Gentler Streak — rest days don't
  break the streak; nudges toward recovery; sick/injured/off statuses.
  Apple Watch App of the Year 2022.
  https://developer.apple.com/news/?id=3m0ht22s
- **Celebration recap:** Strava Year in Sport / Hevy Year in Review — but ship it
  to ALL users; paywalling it backfires (Strava 2025).
  https://www.hevyapp.com/features/year-in-review/
- **Per-exercise history depth:** Setgraph — complete movement history regardless
  of routine. https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters

---

## 5. PROPOSAL INPUT (sourced only)

1. **Show the smoothed trend, never raw scatter, for bodyweight.** Daily weighing
   helps only when paired with a graphic trend; raw daily numbers harm motivation
   and can harm the ED-vulnerable subgroup (restrained eaters +0.53 BMI). Smoothing
   is the single least-patronising plateau tool. (1.1, 2.3, 5.1, 7.3)
2. **Make the per-exercise strength curve the retention spine, free, deep, and
   meaningful from one data point upward.** It's the most-cited motivator and the
   thing that loses users when absent or paywalled. (1.3, 2.1, 6.3)
3. **Pair photos + measurements with weight so recomp/plateau reads as progress,
   not failure** — especially for newbies (newbie-gains recomp) and prep athletes.
   (2.2, 5.2)
4. **Celebrate PRs proportionally:** frequent-but-modest for newbies, rare-and-
   meaningful for athletes; auto-detect, don't fire on trivial firsts. (4.2)
5. **Ship an annual recap to ALL users; do not paywall it.** Strava's paywalling
   backfired. (4.3, 6.3)
6. **Adopt Gentler-Streak compassion mechanics over punitive streaks/rings:** rest
   days don't break streaks; respect deloads, sickness, injury. This aligns the
   retention mechanic with the ED-safety remit rather than fighting it. (5.4, 7.2)
7. **Fix the empty state for newbies and the cold-start for athletes:** sub-30s
   first value (assessment/sync) for newbies; fast history import/backfill so the
   long graph appears at once for experienced users. First-week activation and one
   onboarding push are decisive. (3.1, 3.2)
8. **Avoid Noom-style condescension:** support framed as company and reframes
   ("I'm learning"), never shame or coercive notifications. (5.3, 7.2)
9. **SAFETY-ADJACENT — flag to founder:** goal-gradient + loss-aversion mechanics
   demonstrably produce exercise/eating compulsion (named users quit; 2017/2023
   studies cited). Any streak/ring/celebration mechanic Volyume ships should be
   reviewed against src/coaching/safety/ before build. (7.2, 7.3)

---

## 6. VERIFICATION SUMMARY

- Apps recorded: 55. VERIFIED with substantive detail: 25. PARTIAL: 30.
  NOT FOUND: 0 apps. Clears the 50-app / 20-VERIFIED thresholds.
- Findings: VERIFIED 24, PARTIAL 6 (Forrester 35%-churn stat; 2017/2023 ED
  study figures relayed via Fortune; rep/rest-removal claim; the 404'd AOL quote;
  Q1.5 micronutrient-frequency; several long-tail App Store apps).
- Biggest gap / weakest evidence: direct, primary Reddit-thread quotes on
  *missing* progress features were thin — most synthesis came via aggregator
  blogs (Cora/Setgraph) rather than original threads, and one ED-relevant quote
  source (AOL) 404'd on fetch (search snippet retained, flagged PARTIAL). The
  2017 *Eating Behaviors* and 2023 step-count studies are relayed second-hand and
  should be primary-sourced before any safety-facing use.
- Tool status: WebSearch and WebFetch both worked; one WebFetch returned HTTP 404
  (AOL article) — handled by retaining the search snippet and downgrading the
  affected quote to PARTIAL. No silent downgrade of method.
