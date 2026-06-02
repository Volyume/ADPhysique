Status: COMPLETE | Timestamp: 2026-06-02 | Phase 2: Competitor and best-practice research

# Progress tab competitor research

Fresh web research, June 2026. What the main lifting and physique apps put in
their progress and analytics surfaces, what the evidence says is worth tracking
for hypertrophy, and how each reads against Volyume. Sources at the end.

## 1. What the trackers actually show

- **Hevy.** An Analytics tab with: training volume per muscle group over time
  (sets, and sets x reps x weight), an estimated 1RM per lift with an
  auto-updating trend line back to day one, best set and session volume, a
  last-7-days body graph (which muscles trained, how often), and workout
  frequency. Body composition (weight, body fat, ten circumference sites) and
  progress photos sit alongside, gated to Pro. Free users see the last three
  months, Pro sees a year or all-time.
- **Strong.** Leaner. Per-exercise history with estimated 1RM, heaviest weight,
  best volume, and clean per-lift charts. Less muscle-group analytics than Hevy,
  more focus on the per-lift record.
- **JEFIT.** The kitchen sink: volume, PRs, 1RM, muscle-group heat maps, body
  measurements and photos. Strong on breadth, weaker on a clear weekly read,
  and widely described as complex.
- **Setgraph.** Analytics-first. Percentage change in reps, weight-per-rep,
  volume and sets, filtering by rep range, and comparison between training
  blocks. The deepest pure-analytics view of the group.
- **Boostcamp.** Program-led. Progress is framed as "did you hit the program's
  prescribed progression", less a free-standing analytics dashboard.
- **RP Hypertrophy.** The volume-landmark model in product form: per-muscle
  volume tracked against MV / MEV / MAV / MRV, with the program adjusting sets
  week to week from performance feedback. This is the one model closest to
  Volyume's.
- **GainFrame, and the dedicated physique apps (Progress, Remeasure).** Built
  around the body: progress photos as the spine, circumference measurements,
  trend weight, and in GainFrame's case an AI physique read over the photos.

Read against Volyume: the tab already matches or beats most of these on lifting
analytics (it has estimated 1RM trend, per-muscle volume, PR detection, ACWR,
frequency). It is behind the physique apps on one thing only: progress photos.
And it is ahead of all of them on one thing: volume framed against recoverable
landmarks, which only RP really does.

## 2. The metrics the evidence backs for hypertrophy

- **Total training volume (sets, and sets x reps x weight) is the primary
  progress signal.** It predicts hypertrophy progress better than any single
  number. Track it per muscle, over time.
- **Estimated 1RM trajectory per lift is the highest-signal strength read.**
  Every working set produces an e1RM data point, so a trend gives dozens of
  points a year against the four you would get from quarterly max testing. If
  315x5 becomes 325x5 at the same effort, that is progress, no test required.
  Epley and Brzycki agree within 2 to 3% at 1 to 5 reps and diverge above ten,
  so clamp the rep range (the app already clamps at 20, `algorithms.js:72`).
  Estimates are only honest if effort is accounted for: a set left well short of
  failure under-reads.
- **Bodyweight should be shown as a trend, not a scale number.** Daily weight is
  noise (water, glycogen, gut contents); a moving average (7-day, or an EWMA
  weighted to recent days) is the signal. This is MacroFactor's whole approach,
  and Volyume already does EWMA on Body Metrics. Lead with the trend, keep the
  raw points faint behind it.
- **Body change is best read across weight trend, circumference and photos
  together,** on a 2 to 4 week cadence. Weekly or daily measurement is
  discouraging noise. Photos, same pose, light, time of day, every few weeks,
  are described repeatedly as the most honest physique record.
- **Strength standards (1RM relative to bodyweight) give a "where you stand"
  read** in tiers (beginner to elite). Ratios are e1RM / bodyweight, calibrated
  off public datasets (ExRx, Symmetric Strength, Strength Level, Stronger By
  Science). Volyume already computes this on the PR Wall.
- **Consistency and frequency matter, but as facts, not games.** Sessions per
  week and days trained are useful reads. The evidence on gamified streaks is
  mixed and the house rules forbid them anyway: report the fact, do not build a
  streak the user has to defend.

Read against Volyume: the app computes every one of these. The redesign is about
which to lead with (e1RM trajectory, per-muscle volume vs landmarks, trend
weight) and which to stop showing three times.

## 3. How the good ones are organised

- **Hevy and Strong both lead with the per-lift record and a small set of
  charts**, not a wall of cards. The muscle-group view is one tab, the body view
  is another, the per-lift view is another. Clear separation by question.
- **Setgraph wins on depth by being narrow:** it is unapologetically an
  analytics surface and does not try to also be a dashboard, a coach and a
  social feed.
- **The physique apps lead with the photo timeline** and hang the numbers off
  it.
- The consistent failure mode across reviews is breadth without hierarchy: "an
  app with 50 features you'll never use is worse than one with 10 that work".

Read against Volyume: the Analytics landing is currently the breadth-without-
hierarchy failure mode. The fix is the competitors' fix: separate by question,
lead each surface with one read, and stop competing cards for attention.

## Implications for the proposal (doc 05)

1. Keep the lifting-analytics lead; it is already competitive.
2. Lead the strength view with estimated 1RM trajectory and the existing
   strength standing.
3. Make the volume-vs-landmarks surface the centrepiece; it is the differentiator.
4. Add progress photos; it is the only place the physique apps clearly beat us.
5. Organise by question, one read per surface, the way Hevy and Strong do.

## Sources

- [Hevy, gym performance tracking](https://www.hevyapp.com/features/gym-performance/)
- [Hevy, gym progress and body composition](https://www.hevyapp.com/features/gym-progress/)
- [Hevy, body composition tracking and photos (help centre)](https://help.hevyapp.com/hc/en-us/articles/35385479603479-Body-Composition-Tracking-Measurements-and-Progress-Photos)
- [Hevy, how to track workouts and what to log](https://www.hevyapp.com/how-to-track-workouts/)
- [Hevy, progressive overload guide](https://www.hevyapp.com/progressive-overload/)
- [Setgraph, Strong vs Hevy](https://setgraph.app/ai-blog/hevy-vs-strong)
- [Setgraph, how to track workout progress](https://setgraph.app/ai-blog/how-to-track-workout-progress)
- [Setgraph, best app to log workouts, tested by lifters](https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters)
- [Setgraph, best workout tracker app per Reddit](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)
- [RP Strength, training volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- [Mesostrength, best hypertrophy training apps 2026](https://mesostrength.com/blog/best-hypertrophy-training-apps)
- [Strive, workout progress tracker for hypertrophy](https://strive-workout.com/2026/02/27/workout-progress-tracker/)
- [MacroFactor, weight trend](https://help.macrofactorapp.com/en/articles/21-weight-trend)
- [Dr Muscle, weight trend vs scale weight](https://dr-muscle.com/weight-trend-vs-scale-weight/)
- [GainFrame, track body recomposition with photos](https://gainframe.app/blog/track-body-recomposition-photos/index.html)
- [RippedBody, tracking measurements and weight for physique progress](https://rippedbody.com/diet-progress-tracking/)
- [Arvo, strength standards](https://arvo.guru/resources/strength-standards)
- [Legion, strength standards](https://legionathletics.com/strength-standards/)
- [Strength Level, weightlifting strength standards](https://strengthlevel.com/strength-standards)
- [Strength Journeys, how to calculate e1RM](https://www.strengthjourneys.xyz/articles/how-do-i-calculate-my-e1rm-estimated-one-rep-max)
- [Arvo, 1RM formulas compared](https://arvo.guru/resources/one-rep-max-formulas)
- [MASS, RPE and RIR guide](https://massresearchreview.com/2023/05/22/rpe-and-rir-the-complete-guide/)
