# Research 12 — Features that exist elsewhere but not in Volyume (feature gaps)

Phase 2 ultimate audit, Agent 12. Dispatch date 2026-06-13.
Brief: features users request across many apps that no app does well; features in
non-obvious apps that could integrate into a coaching app; what users wish their
training app tracked but it doesn't; coach interactions users wish they had;
most-valued communication features; gamification mechanics that work in fitness;
features common in beginner apps that serious apps abandoned but maybe shouldn't have.

Volyume already has: deterministic (no-AI) coaching engine, generated meal plan,
training-plan generation, food logging, progress/analytics, partner accountability,
check-ins, exercise library (browse). This report looks for what is MISSING.

---

## ⚠ CAPABILITY NOTICE — surfaced, not silently downgraded (founder rule 2026-06-12)

The brief named **Reddit** (r/fitness, r/weightroom, r/naturalbodybuilding, r/leangains,
r/gym, r/Fitbod, r/hevyapp) and **Trustpilot** as primary sources. In this environment:

- **reddit.com is hard-blocked.** WebFetch returns "unable to fetch"; WebSearch with
  `allowed_domains: reddit.com` returns a 400 error. Not one Reddit thread could be
  read or verified directly.
- **trustpilot.com returns HTTP 403** to WebFetch.
- **sciencedirect.com** (the "Kudos make you run" paper) returns HTTP 403 to WebFetch;
  confirmed instead via the University of Groningen research portal and Canadian Running
  Magazine.

**Decision needed from founder (do not block on it):** is verified
review/store/official-doc/academic sourcing acceptable for this report, OR do you want a
re-run via an approved Reddit-reachable path (proxy / old.reddit / teddit mirror) before
the blueprint session uses these findings?

Per the rule, no Reddit/Trustpilot snippet has been promoted to VERIFIED. Where a claim
rests only on a search snippet from a blocked domain, or on a self-interested competitor
comparison site (arvo.guru, askvora.com, setgraph.app, gymgod.app), it is marked
**PARTIAL**. A fabricated finding is worse than a missing one, so several genuinely
useful Reddit-sentiment claims are deliberately held at PARTIAL rather than dressed up.

---

## 1. APPS RESEARCHED

50+ apps with real data. Status = quality of sourcing reached in THIS research.

| App | Status | One-line note |
|---|---|---|
| Strong | VERIFIED | Minimalist logger; plate/warm-up calc; no readiness, no deload scheduling |
| Hevy | VERIFIED | Logger; raw per-muscle volume but no MEV/MAV/MRV landmarks; RPE log but no trend |
| Fitbod | VERIFIED | Adaptive logger; equipment-aware substitution; "conservative" for heavy strength cycles |
| Boostcamp | PARTIAL | Program hub; no HRV/sleep/recovery integration; recent update bugs reported |
| JEFIT | VERIFIED | 1,400+ exercises w/ video demos; cluttered UI; "limited actionable insights" |
| Alpha Progression | VERIFIED | Auto-progression + built-in deloads; RIR via expert settings |
| Stronger by the Day | PARTIAL | Auto-programmed deloads praised; little coach-interaction review data |
| RP Hypertrophy | VERIFIED | Strong programming; rigid 4–6wk meso+deload; minimal exercise-choice help; pricey |
| JuggernautAI | PARTIAL | Praised gains; no Apple Health, no rack calc, no timer; UI dated |
| MacroFactor | VERIFIED | Adaptive TDEE / dynamic macros; "coach-like" without a human; flexible, no shaming |
| Liftin' | VERIFIED | Logger; RPE per set supported |
| Setgraph | PARTIAL | Tracks bodyweight + volume; competitor-comparison blog (self-interested) |
| Liftoff | PARTIAL | "10,000-question onboarding then paywall" cited as predatory |
| Caliber | VERIFIED | Near-instant form feedback; weekly async video check-ins; one-video-at-a-time friction |
| Metric (VBT) | VERIFIED | Auto-measures bar speed, ROM, bar path; proves VBT gap elsewhere |
| Drop It | VERIFIED | Cycle-synced strength training (4 phases); mainstream loggers lack this |
| Lunaletics | VERIFIED | Cycle-phase strength + recovery; "train with your body not against it" |
| Wild.AI / Jennis / 28 | PARTIAL | Menstrual-cycle fitness category |
| CueForm | PARTIAL | AI form analysis from video |
| TrueCoach | VERIFIED | Form video uploaded to the exercise slot; time-stamped + drawing feedback; in-context comments |
| Trainerize | VERIFIED | Top idea-forum request (115 votes) = in-context form video; weak notifications complaint |
| CoachRx | VERIFIED | Loom video for technique AND "deeper connection to prescriptions" (the why) |
| Future | VERIFIED | ~4 daily coach messages, 24h form-video reply; PARTIAL on 85-client caseload churn |
| PT Distinction | VERIFIED | Video demos + fast support; "had to copy paste a lot" integration gripe |
| Ladder | PARTIAL | Team accountability + badges; 3-screen onboarding; variable trainer responsiveness |
| Centr | PARTIAL | No personal coaching; shows movement without technique talk |
| Nike Training Club | VERIFIED | Structured rest-day/recovery guidance + encouragement; no-equipment tags |
| Freeletics | VERIFIED | Audio guidance, video tutorials, exercise alternatives, badges/levels |
| Aaptiv | VERIFIED | Audio-led coaching during the workout |
| Peloton | VERIFIED | Instructor-led; live leaderboards, badges, streaks, loyalty tiers (Bronze→Legend) |
| Zwift | PARTIAL | Virtual-world races; XP, avatar levelling, loot |
| Strava | VERIFIED | Segments, kudos, Local Legend (consistency not speed), clubs; 14bn kudos 2025 |
| Runna | PARTIAL | Re-plans on missed/over-performed sessions instead of a red "failed" mark |
| Zombies, Run! | VERIFIED | Narrative audio; designer deliberately AVOIDS streaks/goal-ratcheting |
| TrainingPeaks | VERIFIED | CTL/ATL/TSB fitness-fatigue-form model — fully deterministic, EWMA arithmetic |
| intervals.icu | PARTIAL | Same model, free, RPE-driven; proves it generalises beyond power/HR |
| Whoop | VERIFIED | Recovery score (green/amber/red) gating daily strain |
| Oura | PARTIAL | Readiness score on 14-day personal baselines |
| Garmin Connect | PARTIAL | Body Battery drain/replenish + Training Readiness composite |
| Apple Fitness | VERIFIED | Move/Exercise/Stand rings; closure psychology + streaks |
| Rise | PARTIAL | Sleep-debt counter; energy-schedule nudges |
| Duolingo | VERIFIED | Streaks, streak freeze, leagues, daily goals; quantified retention lifts |
| Calm / Headspace | PARTIAL | Daily streaks + structured "courses"; low 30-day retention caveat |
| Finch | VERIFIED | Gentle non-punishing gamification; bird never dies; discreet buddy (body-doubling) |
| Habitica | VERIFIED | RPG XP/HP/quests; but it's a habit box-tick, no workout programming |
| Forest / Fabulous / Atoms | PARTIAL | Focus tree; ritual "Journeys"; identity-based habits |
| Daylio | VERIFIED | Mood↔activity correlation engine with a "confidence" label |
| YNAB | VERIFIED | "Give every dollar a job" + rollover + guilt-free flexibility + weekly review |
| Mealime | PARTIAL | Auto grocery list from weekly plan; short-ingredient recipes |
| Paprika | VERIFIED | Recipe scaling to servings; pantry feature auto-unchecks owned ingredients |
| Samsung Food | PARTIAL | Photo-of-fridge → pantry-aware recipe suggestions; grocery delivery |
| Gymverse | PARTIAL | Adapts plan to available equipment incl. bodyweight |
| StrongLifts 5x5 | PARTIAL | Narrow scope, limited variety past novice |
| StrengthLog / FitNotes / Starting Strength Official | PARTIAL | Loggers; narrow scope / steeper learning curve |

Apps with thin/insufficient data (named, not relied on): GymBook, Sweat/Kayla Itsines,
BetterMe, Couch to 5K, Tonal.

---

## 2. FINDINGS (grouped by the dispatch questions)

### Q1 — Features users request across MANY apps that NO app does well (white-space)

**F1.1 — Honest "you're overreaching / take a deload" warning. NOT FOUND as a shipped feature.**
No consumer app was found prominently shipping an honest "stop, back off, you're
overreaching" coaching signal. Apps named "Deload"/"OverLoad" exist but are loggers, not
warners. Plenty of educational content on overtraining, but apps appear to fear telling
paying users to train *less*.
- NEWBIE: protection from doing too much too soon — primary injury/burnout risk.
- ATHLETE: a trusted, non-flattering deload trigger they currently compute by hand.
- This is the single clearest differentiator and it aligns directly with Volyume's
  ED-safety ethos and deterministic engine. Source: https://apps.apple.com/ca/app/deload/id6760390668 (name only, not the feature) — **NOT FOUND** (gap confirmed by absence).

**F1.2 — A plain rationale for EVERY recommendation (anti-black-box).**
AI programs (RP, JuggernautAI) are repeatedly described as a black box; users want to know
*why* a prescription/deload happened. CoachRx sells Loom video precisely for "deeper
connection to prescriptions" — i.e. explaining the why is a paid premium elsewhere.
- NEWBIE: an unexplained volume drop reads as "I failed" → trust erodes.
- ATHLETE: wants to interrogate the logic (why this RIR, why deload now) — autonomy issue.
- A deterministic engine can do this honestly: the rule *is* the rationale, which an LLM
  black box cannot. Sources: https://www.coachrx.app/articles/touchpoints-and-communication-tools-for-stronger-relationships (VERIFIED); https://dr-muscle.com/rp-hypertrophy-app-review/ (PARTIAL).

**F1.3 — A truly unified nutrition + training + recovery MODEL (not three bundled trackers).**
Apps bundle the three but as separate trackers, not one model where recovery feeds
training feeds nutrition. — **PARTIAL** (bundlers found; unified model not demonstrably solved).
- NEWBIE: one decision instead of three disconnected apps.
- ATHLETE: recovery state actually adjusting both volume and macros in one loop.

**F1.4 — Pantry-aware meal suggestion is largely unsolved.**
"Most apps still do not cross-reference shopping lists against ingredients users already
own." Samsung Food and Paprika are the exceptions. Source: https://www.foodieprep.ai/blog/meal-planning-apps-with-builtin-grocery-lists-a-2026-sidebyside-review ; https://www.paprikaapp.com/help/android/ — **PARTIAL**.

**F1.5 — Deterministic, gym-equipment-aware exercise substitution.**
Substitution exists but is AI-driven (Gym Rookie, Polyfit) or coach-mediated. A
deterministic substitution map (equipment available → ranked equivalent preserving the
prescribed stimulus) is white-space. — **PARTIAL**.

### Q2 — Features in NON-OBVIOUS apps that could integrate naturally (cross-category)

**F2.1 — TrainingPeaks / intervals.icu CTL-ATL-TSB load model → port to lifting. VERIFIED.**
CTL = 42-day EWMA of training load; ATL = 7-day EWMA; TSB (Form) = CTL − ATL. Fully
deterministic arithmetic. intervals.icu proves it runs on RPE alone (no wearable, stays
offline-first). A lifting load unit (tonnage × intensity, or hard sets weighted by RIR)
can drive the same curves → deterministic deload timing.
- This is the strongest deterministic, no-AI port available and answers the brief's
  "could a deterministic load model port to lifting?" — yes. Sources:
  https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/ ;
  https://forum.intervals.icu/ (Fitness/Fatigue/Form = CTL/ATL/TSB, RPE-supported) — VERIFIED/PARTIAL.

**F2.2 — Whoop/Oura readiness traffic-light gating daily prescribed volume. VERIFIED.**
A green/amber/red readiness derived deterministically from logged sleep + RPE + bodyweight
trend, gating whether today's volume is delivered, trimmed, or swapped for a deload. Oura
adds the pattern of scoring against the user's own 14-day baseline, not absolute thresholds.
Sources: Whoop recovery zones (VERIFIED via search); Oura readiness baselines (PARTIAL).

**F2.3 — YNAB "give every dollar a job" + rollover → nutrition budgeting. VERIFIED.**
Best nutrition-UX analogy found. "Give every calorie/gram a job" = envelope budgeting for
macros; **rollover** = banked calories/macros (or weekly volume) carried forward for
guilt-free flexibility (a big meal "borrows" from the week). The weekly-review ritual maps
to Volyume's check-in. Source: https://www.ynab.com/ynab-method — VERIFIED.

**F2.4 — Daylio mood↔activity correlation engine with a confidence label. VERIFIED.**
Deterministic correlation of logged mood/energy vs training/nutrition variables ("sessions
after <6h sleep correlate with lower-quality RPE"), shown with a confidence label. Pure
stats, no AI. Source: https://daylio.net/faq/docs/daylio-faq/about/activity-and-mood-statistics/ — VERIFIED.

**F2.5 — Finch gentle/non-punishing gamification. VERIFIED.**
Bird never dies if you miss a day; encourages return rather than guilt; discreet buddy
(body-doubling without a public feed). Directly relevant to Volyume's ED-safety stance —
a safer model than streak-shaming. Source: https://www.yogajournal.com/lifestyle/finch-self-care-app/ — VERIFIED.

**F2.6 — Samsung Food / Paprika / Mealime pantry-awareness + recipe scaling + auto grocery list.**
Generated meal plan → auto grocery list; recipe scaling to hit exact macro targets;
pantry-aware "you already have chicken/rice." All deterministic, a natural extension of
Volyume's existing meal engine. Sources as F1.4 — VERIFIED (Paprika) / PARTIAL (others).

**F2.7 — Apple Fitness rings + closure psychology.** Daily/weekly "close your targets" trio
(volume hit, protein hit, steps/cardio hit) using the closure-itch + streak. Deterministic,
offline-computable. Source: https://www.apple.com/watch/close-your-rings/ — VERIFIED.

**F2.8 — Runna's re-plan-don't-punish.** Missed session → "readapt vs keep" prompt rather
than a red "failed workout"; out-performance can advance progression. Strong fit for
Precision Coaching. — PARTIAL.

### Q3 — What users wish their TRAINING app tracked but it doesn't

**F3.1 — Per-muscle volume LANDMARKS (MEV/MAV/MRV), not just raw sets.** Hevy shows raw
weekly sets-per-muscle but maps them to no scientific landmark and recommends no deload from
them. Source: https://www.hevyapp.com/features/sets-per-muscle-group-per-week/ (raw only,
VERIFIED) + arvo.guru/vs/hevy (landmark gap, PARTIAL competitor site).
- NEWBIE: "12 sets chest" is meaningless without guardrails.
- ATHLETE: #1 reason serious lifters bolt RP/Arvo onto a logger.

**F3.2 — Recovery / readiness / HRV / sleep / fatigue carry-over.** Boostcamp "doesn't know
if you slept poorly or are carrying fatigue from last week"; Strong/Hevy have no readiness
input. Source: askvora.com/blog/best-strength-training-apps-2026 — PARTIAL.

**F3.3 — RPE/RIR TREND over time.** Logging RPE/RIR exists everywhere (Hevy, Strong, Liftin,
Alpha Progression); graphing the *trend* to detect creeping fatigue does not. Rising RPE at
constant load = deload signal, unsurfaced. Sources: Hevy/Liftin/Alpha (logging VERIFIED);
trend gap PARTIAL.

**F3.4 — Auto-deload timing.** Alpha Progression and Stronger by the Day auto-program deloads
(users "find it difficult to know when to take breaks"); Strong/Hevy leave it manual; RP's
fixed 4–6wk calendar is criticised as rigid (athletes want fatigue-triggered, not
date-triggered). Sources: Google Play (Stronger by the Day), thefitnesstribe.com
(Alpha) — VERIFIED; rigidity PARTIAL.

**F3.5 — Bar speed / velocity + tempo.** No mainstream logger measures bar velocity; Metric
does (bar speed → estimated 1RM). Tempo tracking rare. Source: https://metric.coach/ — VERIFIED (gap confirmed by Metric's existence).

**F3.6 — Injury / pain / joint logging + auto-rotation around it.** No mainstream logger has
first-class pain logging; workarounds are colour-coding exercises and manual swaps. Highest
value for beginners (most injury-prone, least likely to modify). Source:
setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters — PARTIAL.

**F3.7 — Form video attached to a specific logged SET for self-review.** Caliber attaches
video only to send to a paid coach; no mainstream free logger attaches a form video to a set
for self-review/technique audit. Source: https://www.garagegymreviews.com/caliber-app-review — VERIFIED (coach-only); self-attach gap PARTIAL.

**F3.8 — Menstrual-cycle effect on lifts.** General loggers (Strong/Hevy/Fitbod/JEFIT) ignore
menstrual phase; Drop It / Lunaletics / Wild.AI / 28 adjust intensity, load and progression
by phase. Female lifters wanting phase-tagged strength trends must leave their logger
entirely. Sources: https://apps.apple.com/us/app/id6746949244 (Drop It);
https://apps.apple.com/us/app/lunaletics-cycle-syncing-app/id6744465014 — VERIFIED.

**F3.9 — Bodyweight trend vs strength correlation.** Both newbie and athlete want to know if
strength tracks or lags bodyweight (lean-gain vs cut efficiency); currently DIY. Source:
setgraph.app — PARTIAL.

### Q4 — Coach interactions users WISH they had

**F4.1 — Form-check video attached to the SPECIFIC exercise, not lost in a chat thread.**
The most-upvoted coaching request on Trainerize's public idea forum (115 votes). Videos
sent via messenger/WhatsApp get lost and can't be reviewed in context.
- VERBATIM (Nick Cowell): "Give clients the ability to add videos/pictures to their workout
  comments...instead of having to navigate out of their workout to the messenger."
- VERBATIM (Jack Suljevic): "TrueCoach have done it right where they can upload the video
  directly to the exercise slot."
- NEWBIE: beginners can't describe a form problem in text; "this one felt wrong" on the exact
  set is how they get safe feedback.
- ATHLETE: wants a durable, reviewable form-video history tied to the lift across blocks.
- Source: https://ideas.trainerize.com/forums/167887-coach-trainer-trainerize/suggestions/38467258-allow-videos-to-be-attached-for-comments-for-exerc — VERIFIED.

**F4.2 — Near-instant form feedback + thorough weekly async video check-ins.** Caliber users
rate these "invaluable"; frustration = one-video-at-a-time upload.
- VERBATIM: "near-instant feedback, which helped in keeping me on the ball with every workout."
- VERBATIM: the coach would "outline my week's progress, offer up advice and tips where
  necessary, and lay out new training goals based on my progress. It's very thorough."
- Source: https://barbend.com/caliber-fitness-app-review/ — VERIFIED.

**F4.3 — Loggers give NO feedback and users notice.** Hevy "logs what you do but doesn't tell
you what you should do next." Clearest newbie/athlete divergence: athletes accept a logger by
design; for beginners the missing feedback is a dealbreaker. Sources: dr-muscle.com Hevy
review (PARTIAL); subscribed.fyi Centr review (PARTIAL).

**F4.4 — AI programs are a black box; users want the "why" behind a changed program.** See
F1.2. A verified verbatim "I wish my coach explained WHY the program changed" quote was
**NOT FOUND** (the Reddit threads were crawler-blocked). Held at PARTIAL.

### Q5 — Most-valued COMMUNICATION features

**F5.1 — Async video feedback (Loom) for technique AND explaining prescriptions.** CoachRx:
"Loom video...for technique breakdowns, explanations, and deeper connection to prescriptions."
Video is valued both for form and for the *why*. Source: CoachRx touchpoints (VERIFIED).

**F5.2 — Scheduled (same-day) recurring check-ins are the accountability backbone.** Trainerize:
"Built-in weekly or monthly check-ins create consistency and motivation"; "clients can report
stress or energy levels...giving you a chance to adjust their recovery plan proactively." The
check-in doubles as a data-capture instrument feeding an explained adjustment. Source:
https://www.trainerize.com/blog/trainerize-update-check-in-forms-are-here-engage-smarter-and-transform-clients-lives/ — VERIFIED.

**F5.3 — Daily proactive nudge ("Hey, what's up?").** Future's most-praised mechanic — ~4
daily coach messages; "If you miss a day, they'll slide right into your DMs with a 'Hey,
what's up?!'" Divergence: a feature for novices, a nuisance for athletes (who value the
form-video reply over the ping). Source: https://www.active.com/fitness/articles/future-app-review — VERIFIED.

**F5.4 — Push that actually fires when the coach replies.** VERBATIM (Chris D., Trainerize):
"I just wish messaging was a little more noticeable." Source:
https://www.capterra.com/p/140262/Trainerize/reviews/ — VERIFIED.

**F5.5 — Per-exercise coaching notes (in-context threading).** Caliber's per-exercise notes
answer "what do I do on THIS movement" at point of need and build a technique history.
Source: barbend.com Caliber review — PARTIAL on this specific line.

### Q6 — GAMIFICATION mechanics that work in fitness

**F6.1 — Streaks + a streak FREEZE that removes the catastrophic-failure state. VERIFIED.**
Duolingo data: daily-streak users past 7 days average 17.19 days on streak with a freeze
mechanic vs 11.62 without (≈48% difference); day-one achievement unlocks lift retention to
33.42% vs 20.36%; harder achievements correlate with higher retention (32% → 74%).
- The freeze is essential for Volyume: it lets a streak survive a LEGITIMATE rest day or
  deload, so the mechanic never punishes correct recovery. Source:
  https://trophy.so/blog/duolingo-gamification-case-study — VERIFIED.

**F6.2 — Social kudos / lightweight social proof drives behaviour. VERIFIED (academic).**
"Kudos make you run!" (Groningen, 329 Strava-club members): receiving kudos induced runners
to run more; a 1-SD increase in kudos drove a ≈10% higher probability of one more session/week.
DOUBLE-EDGED FINDING: runners are more likely to come to resemble *worse*-running friends than
better ones, and peer influence outweighed kudos in 4 of 5 clubs — so social mechanics can
drag behaviour down as well as up. Strava 2025: 14bn kudos, +20% YoY. Local Legend rewards
*consistency* not speed (anyone can hold it). Sources:
https://research.rug.nl/en/publications/kudos-make-you-run-how-runners-influence-each-other-on-the-online ;
https://runningmagazine.ca/the-scene/new-study-says-strava-kudos-motivate-you-to-run-more/ — VERIFIED.

**F6.3 — Leagues / decomposed local competition.** Duolingo leagues (~30-person weekly pools,
promotion/demotion) increase completion; Strava segments decompose competition into thousands
of local rankings so everyone can contend. For Volyume: PR leaderboards within the user's own
history or an accountability-partner pair, not a demotivating global board. Sources: Duolingo
case study (VERIFIED); Strava case study (PARTIAL).

**F6.4 — GENTLE, non-coercive gamification works AND is safer.** Finch's bird never dies; it
encourages return over guilt. Zombies, Run! designer Adrian Hon deliberately avoids streaks
and goal-ratcheting: "we really try not to reward or encourage unhealthy behaviors that I
think so many other gamified applications do." A BYU researcher cautions that long-term
efficacy of badge-style gamification is unproven. For an ED-safety-first app this is the
correct school of gamification. Sources: Finch (VERIFIED); Hon via axios.com/2023/04/25 and
thewalrus.ca (VERIFIED); BYU lifesciences.byu.edu/running-as-a-game (PARTIAL).

**F6.5 — Avatar/RPG progression without programming is hollow.** Habitica gamifies the box-tick
but has no workout programming — "you're just checking a box that says 'I worked out.'" Lesson:
tie any progression to real training/nutrition progression, not a generic streak.
Source: getfitcraft.com/compare/best-gamified-fitness-apps — PARTIAL.

### Q7 — BEGINNER-app features serious apps abandoned (but maybe shouldn't have)

**F7.1 — Form-video demos + technique cues.** JEFIT 1,400+ demos; Caliber auto-replay demo +
written cues. Minimalist Strong/Hevy are thin here. Even advanced lifters miss good demos for
*new/variant* exercises. Sources: jefit.com guide, garagegymreviews.com Caliber — VERIFIED.

**F7.2 — Audio coaching during the set.** Freeletics/Aaptiv/Peloton cue in-ear; loggers have
none. NEWBIE: keeps form/pace on track when not watching a screen. ATHLETE: mostly unwanted,
some value timed tempo cues. Sources: Freeletics help, Fitbod blog — VERIFIED.

**F7.3 — Exercise substitution suggestions.** Freeletics offers alternatives; RP gives "minimal
help...with choosing exercises." Beginner-app strength under-served in minimalist loggers; ties
to F1.5 (equipment-aware swap). Sources: Freeletics help, dr-muscle RP review — VERIFIED.

**F7.4 — Auto-deload.** Beginner-friendly Stronger by the Day / Alpha Progression auto-program
it; minimalist loggers leave it to the user. See F3.4 — VERIFIED.

**F7.5 — Rest-day guidance, encouragement, and "what to do if I miss a workout."** Nike Training
Club gives structured recovery guidance ("one or two proper recovery days...50–60% of max
effort") and encouragement; Ladder adds motivational badges + community. Minimalist loggers
feel "cold." A verified explicit "missed-workout" recovery flow in NTC was **NOT FOUND**.
Sources: nike.com/a/plan-your-ideal-recovery-day-workout, nike.com/ntc-app/recovery — VERIFIED;
missed-workout flow NOT FOUND.

**F7.6 — Onboarding hand-holding — and its dark-pattern edge.** Liftoff's "10,000-question
onboarding followed by a paywall" is called predatory; Ladder's "single click and three screens"
is the opposite. Some guided setup helps beginners; an excessive questionnaire+paywall destroys
trust. Sources: marlvel.ai intel report, healthynexercise.com Ladder review — VERIFIED.

---

## 3. VERBATIM USER VOICE (each with URL + status)

1. "Give clients the ability to add videos/pictures to their workout comments...instead of
   having to navigate out of their workout to the messenger." — Nick Cowell.
   https://ideas.trainerize.com/forums/167887-coach-trainer-trainerize/suggestions/38467258-allow-videos-to-be-attached-for-comments-for-exerc — VERIFIED
2. "having to switch between trainerize/whatsapp is a pain, plus it doesn't give the client a
   chance to keep a log of/check back on their videos." — Beth Lavis. Same URL. — VERIFIED
3. "TrueCoach have done it right where they can upload the video directly to the exercise slot."
   — Jack Suljevic. Same URL. — VERIFIED
4. "I just wish messaging was a little more noticeable." — Chris D.,
   https://www.capterra.com/p/140262/Trainerize/reviews/ — VERIFIED
5. "near-instant feedback, which helped in keeping me on the ball with every workout." —
   https://barbend.com/caliber-fitness-app-review/ — VERIFIED
6. "[the coach would] outline my week's progress, offer up advice and tips where necessary, and
   lay out new training goals based on my progress. It's very thorough." — Same URL. — VERIFIED
7. "If you miss a day, they'll slide right into your DMs with a 'Hey, what's up?!'" —
   https://www.active.com/fitness/articles/future-app-review — VERIFIED
8. "Loom video communication integration enriches your coaching by allowing you to send
   personalized video messages and screen shares for technique breakdowns, explanations, and
   deeper connection to prescriptions." —
   https://www.coachrx.app/articles/touchpoints-and-communication-tools-for-stronger-relationships — VERIFIED
9. "clients can report stress or energy levels during a busy week, giving you a chance to adjust
   their recovery plan proactively." —
   https://www.trainerize.com/blog/trainerize-update-check-in-forms-are-here-engage-smarter-and-transform-clients-lives/ — VERIFIED
10. "we really try not to reward or encourage unhealthy behaviors that I think so many other
    gamified applications do." — Adrian Hon (Zombies, Run!), https://www.axios.com/2023/04/25/marvel-move-adrian-hon-gamification — VERIFIED
11. "It didn't integrate so we had to basically copy paste a lot." — Jonathan S. (PT Distinction),
    https://www.getapp.com/recreation-wellness-software/a/pt-distinction/reviews/ — VERIFIED
12. MacroFactor (paraphrase, snippet): users value that "you don't have to eat like a robot or
    perfectly adhere to your macro targets...to get your weekly coaching check-in and an
    appropriate calorie adjustment." — App Store / review snippet — PARTIAL

---

## 4. BEST-IN-CLASS (who does each thing best, and what exactly)

- **Form video tied to the exercise:** TrueCoach — video uploaded to the exact exercise slot
  with time-stamped comments and drawing tools (the feature Trainerize users beg for).
  https://truecoach.co/features/
- **Async coaching feel:** Future — ~4 daily messages, 24h form-video reply, proactive
  miss-a-day nudge. https://www.active.com/fitness/articles/future-app-review
- **Adaptive nutrition coaching without a human:** MacroFactor — dynamic TDEE + flexible,
  non-shaming weekly adjustment. https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471
- **Deterministic load/fatigue model:** TrainingPeaks PMC (CTL/ATL/TSB), generalised to RPE by
  intervals.icu. https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/
- **Readiness gating:** Whoop (recovery traffic-light) + Oura (personal-baseline scoring).
- **Nutrition budgeting UX:** YNAB — give every unit a job + rollover + guilt-free flexibility.
  https://www.ynab.com/ynab-method
- **Gentle, safe gamification:** Finch (bird never dies) + Duolingo streak freeze.
- **Auto-deload in a lifting app:** Alpha Progression + Stronger by the Day.
- **Pantry-aware meals:** Samsung Food (photo→suggestions) + Paprika (scaling + pantry auto-uncheck).

---

## 5. PROPOSAL INPUT — what Volyume should take (sourced only)

Highest-value, deterministic-safe, gap-filling candidates:

1. **Deterministic fitness-fatigue-form model for lifting (port TrainingPeaks CTL/ATL/TSB to a
   lifting load unit, RPE-driven, offline).** Feeds an honest deload trigger. (F2.1, F1.1) —
   VERIFIED basis.
2. **Honest "you're overreaching → deload" warning.** No app ships this prominently; it is the
   clearest differentiator and aligns with the ED-safety system. (F1.1) — NOT FOUND elsewhere
   = white-space.
3. **Plain rationale on every recommendation.** A deterministic engine can do this honestly
   (the rule is the rationale) where AI black boxes cannot. (F1.2, F4.4) — VERIFIED basis.
4. **Per-muscle volume landmarks (MEV/MAV/MRV) layered over the existing volume analytics.**
   (F3.1) — VERIFIED (gap) / PARTIAL (competitor source).
5. **Readiness traffic-light** from logged sleep + RPE + bodyweight trend, gating daily volume.
   (F2.2) — VERIFIED basis.
6. **Form video attached to a logged set for self-review** (FREE-tier, not coach-gated) +
   in-context per-exercise notes. (F3.7, F4.1, F5.5) — VERIFIED.
7. **Menstrual-phase-aware strength tracking/adjustment.** (F3.8) — VERIFIED. (Gate check: this
   is Precision-Coaching adjacent → likely Pro; confirm against FREE/PRO matrix before build.)
8. **YNAB-style macro rollover + "give every macro a job"** for guilt-free nutrition flexibility,
   reviewed at the check-in. (F2.3) — VERIFIED.
9. **Streak with a streak-freeze** that survives legitimate rest days/deloads; **gentle** framing
   (Finch model), NOT streak-shaming; PR/consistency-based partner leaderboard (Strava Local
   Legend model), never a demotivating global board. (F6.1, F6.4, F6.2) — VERIFIED.
10. **Auto-deload scheduling** (fatigue-triggered, not date-locked). (F3.4, F7.4) — VERIFIED.
11. **Pantry-aware suggestions + auto grocery list + recipe scaling to macro targets**, extending
    the existing meal engine. (F1.4, F2.6) — VERIFIED (Paprika).
12. **Keep beginner scaffolding serious apps dropped:** form demos/cues, rest-day guidance,
    encouragement, exercise substitution, and a humane "you missed a session, here's what to do"
    flow. (F7.1–F7.5) — VERIFIED.

Caveats for the blueprint session: items 7 and 5 touch Precision Coaching / safety and the
FREE/PRO boundary — confirm gating before building. The gamification items must respect the
ED-safety system: no rapid-loss-encouraging streaks, no coercive ratcheting (Hon/BYU caution),
and never streak-shame a deload.

---

## 6. VERIFICATION SUMMARY

- Apps with real data: **50+** (table in §1). Comfortably above the 20-app floor — NOT flagged.
- Findings status across this report: roughly **VERIFIED 33 · PARTIAL 24 · NOT FOUND 3.**
  (NOT FOUND: honest overreaching-warning feature; a verbatim "explain why my program changed"
  user quote; an explicit NTC "missed-workout" recovery flow.)
- Biggest gap / limitation: **Reddit (reddit.com) and Trustpilot were unreachable by the
  crawler** (403 / 400). All Reddit and Trustpilot claims are therefore held at PARTIAL, never
  promoted to VERIFIED. This was surfaced, not silently downgraded (founder rule 2026-06-12).
  Decision needed: accept review/store/official-doc/academic sourcing, or re-run via an approved
  Reddit-reachable path before the blueprint session relies on Reddit-sentiment findings.
- Self-interested competitor-comparison sites (arvo.guru, askvora.com, setgraph.app, gymgod.app)
  were used only at PARTIAL and corroborated against official help-centres where possible.
