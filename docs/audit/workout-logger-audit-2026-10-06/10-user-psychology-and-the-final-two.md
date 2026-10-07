# 10: the redesign's forks weighed against user psychology and the user base; the final two

Lead, hands-on, 2026-10-07. Authority: the founder, 2026-10-07: "use your
expert knowledge and investigate the options against user psychology our
user base and what they would enjoy the most then present the final two
choices and then we will get the go ahead". Branch
`claude/workout-logger-audit-redesign-iykogt`, docs only.

OBSERVED is a measured or quoted fact; SUGGESTS is the lead's inference.
Production figures are aggregates over the EU-Dublin project read on
2026-10-07 through the Supabase tool; no row-level or personal data was
read or recorded. The cloud mirrors are partial for logging tables (the
device is the source of truth and the workouts table carries five users),
so the logging figures are directional; the profile figures cover the
whole base.

## 1. Who the users are (OBSERVED, production, 2026-10-07)

- 25 profiles, 20 past first run; sign-ups July 6, August 13, September
  5, October 1. 21 account deletions since launch (Android 15, iOS 6),
  every one `user_requested`.
- Units: kg, 25 of 25. Training focus: bodybuilding, 25 of 25. Sex: male
  18, female 1, unset 6. Training age: 3 to 6 years for 21 of 25, 1 to 3
  years for 2, unset 2. Body profiles (17): primary goal general 14,
  classic physique 2, men's physique 1; experience level and age unset.
- Notification preferences: morning weight on for 14, weekly check-in on
  for 14. Community profiles 2; partnerships 13.
- SUGGESTS: a small, early, UK, kg, hypertrophy-focused base of
  experienced lifters, mostly men, who treat training as routine rather
  than novelty. Not beginners; not a mass-market step-counting audience.

## 2. How they log (OBSERVED, production, 2026-10-07)

- Cloud workouts: 27 sessions from 5 users (August 9, September 17,
  October 1), all completed. Duration p25 / p50 / p75: 39 / 53 / 61 min.
  Sets per session p25 / p50 / p75: 19 / 23 / 27. Exercises per session
  median 6; sets per exercise median 3. Session notes 0 of 27;
  pre-workout intent set on 22 of 27.
- Sets: 610 from 4 users. Set type: straight 609, warm-up 1. RIR and RPE:
  0 of 610 (the fields exist and are never written). Failed, AMRAP,
  unilateral left/right: 0. Edited more than two minutes after creation:
  52 (8.5%).
- Reps against the prescribed range (589 sets carry one): within 511
  (87%), above the top 60 (10%), below the bottom 18 (3%). Reps p25 /
  p50 / p75: 10 / 15 / 20.
- Weight p25 / p50 / p75: 20 / 40 / 75 kg. Of 596 loaded sets: on a 2.5
  kg grid 450 (75%), on a 1.25 kg grid only 77 (13%), off both 69 (12%:
  2 kg dumbbell racks and machine stacks); 14 bodyweight or zero.
- Median gap between consecutive sets of one exercise: 107 s. At 23 sets
  a session that is about 41 of a 53-minute session, roughly three
  quarters of the session, spent between sets.
- Telemetry (10,093 events, 32 users, 2 July to 6 October):
  workout_started 43, workout_completed 26, first_workout_logged 6; no
  set-level events exist, so "logged as planned" cannot be read directly.
- Session resolutions: skipped by the user 9, ended early 3. Exercise
  swaps 88 (73 in-session). Adaptation events: add_set 20, hold 19.
  Weekly check-in training performance: exceeded 3, hit 1. In-app
  feedback: 3 entries, all on the workout summary, 2 "helpful" and 1
  "love".
- SUGGESTS: the common case is the prescribed set done inside its range;
  deviations are mostly upward by a rep or two; small weight steps
  dominate but one set in eight sits off the plate grid; people edit a
  logged set occasionally and never annotate; the rest period is where the
  session's time goes; the summary already lands well.

## 3. The psychology that applies, with what it implies

Each line names the finding, its source, and the implication for the
logger. Sources are listed in section 8.

1. Attention under effort. Dietrich's transient hypofrontality account
   (2004, 2006) describes reduced prefrontal resources during and just
   after intense exertion; the resistance-training evidence is mixed
   (executive function unchanged in older adults at 70% 1RM), so the
   claim is kept modest. Implication: between sets, minimise reading and
   decisions; one visible action; the button names what it will do.
2. Defaults. Jachimowicz et al. (2019), meta-analysis of 58 studies, d =
   0.68, strongest when the default reads as an endorsement by a trusted
   architect. Implication: the coach's prescription pre-filled and logged
   by one tap is an endorsement default, and the data (87% within range)
   shows users already take it. Risk: a wrong default is also sticky, so
   deviation must be one gesture away and last time must be visible.
3. Progress. Goal-gradient (Kivetz, Urminsky and Zheng 2006): effort
   rises as the goal nears; endowed progress (Nunes and Drèze 2006):
   visible progress already made raises completion. Implication: an
   ambient session line that fills as sets are logged, and the position
   eyebrow; no numeric nagging.
4. Competence and self-efficacy. Self-determination theory reviews find
   autonomous motivation and competence predict adherence; Bandura's
   mastery experiences are the strongest source of self-efficacy, and a
   2024 barbell programme study found mastery self-efficacy rising with
   training. Implication: last time and the record are competence
   feedback and belong at the point of action, as information.
5. Autonomy. The same theory: self-endorsed choice sustains motivation.
   Implication: the rep range is shown as an invitation (a filled band),
   not a demand; weight is free to change; nothing nags.
6. Motor precision and grip. Hoober (2013), 1,333 observations: 49%
   one-handed, 75% of interactions by thumb. Fitts and the FFitts finger
   model: finger occlusion and tremor make small targets slow and
   error-prone; 44 to 48 dp is the floor. Implication: the primary action
   at the bottom, 44 dp targets, and entry gestures that tolerate
   imprecision (a drag that snaps to a detent is tolerant; a tap on a
   small dot is not unless the hit area is tall and the readout confirms).
7. Habit. Lally et al. (2010): automaticity grows with repetition in a
   stable context, plateau at a median of 66 days. Implication: one
   identical loop every set (Lift, Log, Rest, Lift) with no variable
   sheets or modals.
8. Memory of the session. Zenko, Ekkekakis and Ariely (2016): the slope
   and the end of an exercise bout shape remembered and forecast
   pleasure. Implication: the finish and the summary are part of the
   logger's job; the summary already draws positive feedback (section 2).
9. Gamification. Reviews find short-term gains, badges alone inert, and
   broken streaks demotivating. Implication: no badges, streak pressure or
   confetti in the logger; the record is a calm line and a calm toast.
10. Tracking and eating-disorder symptoms. Simpson and Mazzeo (2017):
    fitness tracking use predicted eating-disorder symptomatology in
    undergraduates. Implication: the logger informs and never pushes; the
    record line states the best rather than demanding it be beaten; the
    rest state shows the plan, not "beat 9". Copy follows the locked
    coaching voice. The ED-safety system is untouched.
11. Choice load. Hick's law: decision time grows with alternatives.
    Implication: each state shows only its moment; a known number is
    selected directly rather than built from taps.

## 4. The forks weighed

| Fork | Evidence | Verdict |
|---|---|---|
| Two states (Rest takes the screen after Log) | Three quarters of a session is rest (section 2); the far-distance physics (09 section 6); one stable loop (3.7); attention under effort (3.1) | Settled: yes |
| Entry control | 87% of sets need no change; 10% go above the range by a rep or two; 12% of weights sit off the plate grid; 8.5% of sets are edited later; motor tolerance (3.6); competence feedback at the control (3.4) | A genuine fork: ruler and picker with the pad behind the value, or fields and pad. A ruler without a pad is eliminated by the off-grid 12% |
| Sizes 32 / 40 / 24 | The countdown is read from the bench for most of the session; 43 dp is the comfortable figure at 60 cm and 40 is the house display role; 32 is the house h1 and Material headlineLarge | Settled: 32 / 40 / 24 |
| Button names the set | Attention under effort (3.1); a slip on the picker is caught by the label; defaults read as endorsement (3.2) | Settled: yes |
| Scope | Peak-end (3.8) makes the finish and summary part of the experience; nine skipped and three ended-early sessions need the cut-short path; bugs are 24.6% of logger complaints in the field (A5) | The founder's call on cost; the user-optimal answer is the whole logger in one campaign with a device walk between stages |

## 5. The final two

Shared by both: the two-state screen (Lift and Rest), the plan filled in
and logged by one tap, the button naming the set, 32 / 40 / 24, the
session hairline, last time in words on every set, the calm record line,
Edit from Rest, the exercise's sets as sentence lines above the button,
the house charcoal button, amber only on the live thing, every ED-safety
rule and the locked voice. A warm-up line appears only when a warm-up is
logged (1 of 610 sets today). The functional foundation (00 section 8.1)
rides with either.

### Choice A: ruler and picker (the instrument)

Weight on a ruler whose step is the exercise's load increment from the
engine (2.5 kg barbell, 2 kg dumbbell rack, the stack's step for a
machine), dragged with a detent per step, last session as an amber tick.
Reps on a picker: a row of counts centred on the target, the target range
filled, last time ringed, the chosen count amber; tap or drag with a
detent per rep; 44 dp tall hit areas; the row scrolls beyond its window.
The pad behind a tap on either number for any value, including the 12%
off the grid, and for screen readers (an adjustable control with
increments).

For: the 10% above-range case is one tap; a 2.5 kg step is one flick;
last time is visible where the hand is; drag-and-snap tolerates a sweaty
thumb; the tactile detent is a small pleasure every set, which sustains
competence feedback for lifters who already know their numbers. Against:
novel on first use (one quiet hint on the first session); the picker is
slip-prone without the tall hit area and the live readout; the build is
heavier (gestures, haptics, per-equipment steps, accessibility). Suits:
this base, experienced lifters making small, frequent adjustments.

### Choice B: fields and pad (the conventional)

Two quiet fields with last time under each value; a tap opens a number
pad with 2.5 and 1.25 kg steps on it. Nothing else changes.

For: zero learning; exact entry of any weight; the fewest visible
controls; simplest accessibility; the lowest build risk. Against: every
change costs three or four taps (tap, type, done), paid on the 13% of
sets that deviate and on every edit; last time is text only; nothing
about it is distinctive or tactile. Suits: people who type their numbers
and a faster first device walk.

## 6. The lead's recommendation

Choice A, on the product-best criterion (D33): the base is experienced,
adjusts by small steps and mostly upward, and spends most of the session
in the state the redesign builds for; the ruler and picker make the
deviation case one gesture, keep last time at the point of action, and
carry the pad for everything else. Choice B is the safer build, not the
better product. Scope: the whole logger in one campaign, with the founder's
device walk between the screen and the periphery.

## 7. What the data changed in the drawing

- The rep control is a windowed picker centred on the target, not fifteen
  fixed dots: the median set is 15 reps and a quarter are 20 or more.
- The ruler's step follows the exercise's equipment; the pad is not
  optional (12% of weights are off the plate grid).
- A warm-up line is shown only when one is logged.
- The record line's copy is governed by the locked voice: it states the
  best at the weight and never demands it be beaten.

## 8. Sources

- Dietrich, A. (2004, 2006), transient hypofrontality; test against
  resistance training in older adults (Costa Rican study, executive
  function unchanged; visuospatial processing improved).
- Jachimowicz, J. M., Duncan, S., Weber, E. U., Johnson, E. J. (2019),
  "When and why defaults influence decisions: a meta-analysis of default
  effects", Behavioural Public Policy 3(2): d = 0.68, 58 studies, 73,675
  participants.
- Kivetz, R., Urminsky, O., Zheng, Y. (2006), "The goal-gradient
  hypothesis resurrected", Journal of Marketing Research 43.
- Nunes, J. C., Drèze, X. (2006), "The endowed progress effect", Journal
  of Consumer Research 32(4).
- Self-determination theory and exercise adherence: Teixeira et al.
  (2012), IJBNPA 9:78, systematic review; 2024 and 2025 Frontiers in
  Psychology studies on barbell programmes and self-efficacy.
- Hoober, S. (2013), "How do users really hold mobile devices?",
  UXmatters: 49% one-handed, 75% thumb.
- Fitts (1954) and the FFitts finger model (Bi, Li, Zhai, 2013).
- Lally, P., van Jaarsveld, C., Potts, H., Wardle, J. (2010), European
  Journal of Social Psychology 40: median 66 days, range 18 to 254.
- Zenko, Z., Ekkekakis, P., Ariely, D. (2016), Journal of Sport and
  Exercise Psychology: slope of pleasure explains 35 to 46% of remembered
  and forecast pleasure.
- Gamification in physical activity: systematic reviews (short-term
  gains; badges alone inert; streak breaks demotivate).
- Simpson, C. C., Mazzeo, S. E. (2017), Eating Behaviors 26: fitness
  tracking predicted eating-disorder symptomatology (n = 493).
- Lane A5 of this audit (380 dated user statements): delights "simple,
  fast, no fluff" 23.5%, "shows what I did last time" 21.9%; complaints
  bugs 24.6%, price 21.2%, redesigns that bury controls or add taps 14.8%.
- Production aggregates: the EU-Dublin project, read 2026-10-07.
