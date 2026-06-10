# Workout Logging Screen — Competitive Research (Agent 2)

> Audit date: 2026-06-10. Scope: the active-session logging screen of the
> top 10 serious workout logging apps, compared against the measured state
> of Volyume's `ActiveWorkoutScreen` (see
> `competitive-audit-00-workout-screen-deep-audit.md`, treated as ground
> truth throughout).
>
> **Method and evidence note.** Direct page fetches were blocked from this
> environment (HTTP 403 on most domains), so every claim below was gathered
> via web-search extraction of the cited page on 2026-06-10. Quotes are as
> surfaced by search summaries of the cited URLs; where a number (e.g. a
> font size) could not be verified from public material it is marked
> *inference from screenshots/descriptions*. No competitor publishes its
> point sizes; relative sizing statements are based on published
> screenshots, store listings, help-centre documentation and reviews.

---

## 0. The field at a glance

Two layout families dominate serious logging apps:

1. **Session-sheet (spreadsheet) family** — Hevy, Strong, Boostcamp,
   Jefit, Lyfta. The whole workout is one scrolling list of exercise
   blocks; each block is a compact table of set rows
   (`SET | PREVIOUS | KG | REPS | ✓`). Previous performance is a
   **column in the same row as the inputs, at the same size as the
   inputs**. Logged sets accumulate in place — the row you just ticked
   stays exactly where it is, so "what have I done" is never below the
   fold relative to "what am I doing".
2. **Focused single-exercise family** — Alpha Progression, FitNotes,
   GymBook, Liftin', Setgraph, Progression (partially), and Volyume. One
   exercise fills the screen with larger inputs (steppers/pickers) and a
   list of completed sets beneath.

Reddit meta-analyses of hundreds of threads converge on the same
criteria regardless of family: "the best workout tracker apps are ones
that **get out of your way, show what matters (previous performance,
rest time, and progress)** … and work reliably"
([setgraph.app/ai-blog/best-workout-tracker-app-reddit](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit));
"Strong and Hevy are the two most recommended apps … Strong in
strength-sport communities, Hevy in general fitness and
program-following discussions"
([corahealth.app/blog/best-workout-tracker-reddit](https://www.corahealth.app/blog/best-workout-tracker-reddit),
an analysis of 200+ threads).

Independent UX guidance for gym apps repeats three numbers worth
holding onto: minimum ~48px touch targets, haptic confirmation "even
with sweaty hands", and a 60–90 second between-sets budget — "the
interface must be fast and intuitive"
([dev.to OpenTrainer build log](https://dev.to/magnificode/building-opentrainer-real-time-workout-tracking-with-convex-and-nextjs-59h4),
[stormotion.io fitness UX](https://stormotion.io/blog/fitness-app-ux/),
[easternpeak.com](https://easternpeak.com/blog/fitness-app-design-best-practices/)).

---

## 1. Hevy — the volume leader and de facto benchmark

**Screen design and density.** Active session = scrolling list of all
exercises; each exercise block has a header (name, ~17–20pt equivalent,
*inference*), an optional note, and a set table. Each set row contains:
set number, **PREVIOUS column** ("45kg x 9", grey), KG field, REPS
field, and a checkmark. "The PREVIOUS column only appears while logging
a live workout"
([hevyapp.com/features/track-exercises](https://www.hevyapp.com/features/track-exercises/),
[help.hevyapp.com — Previous Workout Values](https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy)).

**Previous performance.** The defining decision: previous performance
sits **inside every set row, adjacent to the inputs, at body-text size,
plain (not italic), and is itself the prefill control** — "you can tap
on a previous value to instantly add it to your current workout instead
of writing the load and reps" ([hevyapp.com/features/track-exercises](https://www.hevyapp.com/features/track-exercises/)).
Configurable to show last-any-workout or last-same-routine
([help.hevyapp.com](https://help.hevyapp.com/hc/en-us/articles/34105442929943-Previous-Workout-Values-Vs-Routine-Values-How-to-Adjust-in-Settings)).
One mechanism does the whole "use last session's numbers" job. Volyume
currently has four (ghost prefill, ghost chip, beat chip, repeat-last).

**Taps to log.** Tap previous value (fills both fields) → tap checkmark
= 2 taps cold, 1 tap when the routine value is already filled. The
checkmark "marks it as complete and triggers the rest timer"
([hevyapp.com/hevy-tutorial](https://www.hevyapp.com/hevy-tutorial/)).

**Rest timer.** Exactly **two adjusters plus skip**: "use the −15 and
+15 buttons to remove or add 15 seconds … or skip it altogether",
mirrored on the lock-screen Live Activity
([hevyapp.com/features/workout-rest-timer](https://www.hevyapp.com/features/workout-rest-timer/),
[help.hevyapp.com rest timer](https://help.hevyapp.com/hc/en-us/articles/35385404949143-Rest-Timer-Default-Rest-Timer-How-to-Add-Adjust-Volume-and-Sound),
[Live Activity](https://www.hevyapp.com/features/live-activity/)).
Volyume ships four adjusters plus skip.

**Supersets.** "Smart Superset Scrolling … automatically scrolls to the
next exercise of a superset when you mark a set as complete"
([hevyapp.com/features/what-are-supersets](https://www.hevyapp.com/features/what-are-supersets/)) —
parity with Volyume's auto-jump.

**Sentiment.** Overwhelmingly "intuitive design … indispensable"
([mwm.ai listing](https://mwm.ai/apps/hevy-workout-tracker-gym-log/1458862350));
"minimal and clean, good for beginners and anyone who **dislikes extra
options during a workout**"
([setgraph.app/ai-blog/hevy-vs-strong](https://setgraph.app/ai-blog/hevy-vs-strong)).
Recurring complaints are *not* about clutter: "a reliable timer is one
of the more common complaints"
([repreturn.com/hevy-app-review](https://repreturn.com/hevy-app-review/)),
no auto-advance focus ("no 'Next' button to automatically move cursor"),
no mid-workout routine save, and dislike of the social-feed default tab
([justuseapp.com Hevy reviews](https://justuseapp.com/en/app/1458862350/hevy-workout-tracker-gym-log/reviews)).
Capability criticisms: "Hevy starts to strain with more advanced
structures — wave loading, DUP" and "doesn't surface weekly volume
automatically" ([dr-muscle.com/hevy-workout-app-review](https://dr-muscle.com/hevy-workout-app-review/)).

**Density count.** Volyume's own deep audit measured Hevy's equivalent
mid-workout state at roughly **12–14 simultaneous interactive elements**
vs Volyume's ~29.

## 2. Strong — the iOS purist's logger

**Screen design.** Same session-sheet pattern; "the interface is
stripped down to essentials: **exercise name, weight, reps, and a rest
timer. No clutter, no distractions.** Between sets, you can see what
you lifted last time and quickly enter your current set"
([corahealth.app/compare/strong](https://www.corahealth.app/compare/strong)).
"The app automatically fills in your previous weight and reps as a
starting point" and markets "the simplest interface of any fitness app
in the App Store"
([App Store listing](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577)).
Plate calculator opens from a tap on the weight field
([help.strongapp.io](https://help.strongapp.io/category/165-logging-a-workout),
[strong.app](https://www.strong.app/)).

**Taps to log.** "Opening the app, starting a workout, and logging a
set is **three taps** once you're in the session"
([setgraph.app Strong review](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph));
per-set it is 1 tap (checkmark) when prefilled — parity with Volyume.

**Hierarchy nuance.** Compared with Hevy, "Strong has a **richer
interface with more buttons and menus, with a learning curve**" but
"quicker access to special set entries like warmups and AMRAP"
([setgraph.app/ai-blog/hevy-vs-strong](https://setgraph.app/ai-blog/hevy-vs-strong)) —
i.e. even the "clean" benchmark gets criticised the moment options
multiply.

**Sentiment.** "Strong is the gym's notebook — digitized and perfected
… **the fastest workout logger on the market**"
([sensai.fit/blog/hevy-vs-strong-2026](https://www.sensai.fit/blog/hevy-vs-strong-2026));
"clean, fast, and consistent with the native iOS aesthetic … no bloat …
a logger that respects your time"
([corahealth.app/compare/strong](https://www.corahealth.app/compare/strong)).
Complaints are commercial/reliability, not layout: "I can only create
three routines without upgrading"; "very inconsistent with keeping
record of workouts even after I click finish"
([justuseapp.com Strong reviews](https://justuseapp.com/en/app/464254577/strong-workout-tracker-gym-log/reviews) —
note its NLP "safety score" of 33.4/100 is a noisy aggregate; the store
rating is 4.9/5). Android is widely described as second-class.

## 3. Jefit — the cautionary tale

**Screen design.** Feature-dense session screen: set list, interval
timer panel, social hooks, and **ads on the free tier**
([gymbird.com Jefit review](https://www.gymbird.com/fitness-apps/jefit-app-review),
[dr-muscle.com Jefit review](https://dr-muscle.com/jefit-workout-app-review/)).
A 2024–25 redesign made the logging flow heavier; Jefit's own product
notes describe consolidating "no simultaneous displays" of timers to fix
it ([jefit.com product updates](https://www.jefit.com/wp/jefit-news-product-updates/upcoming-enhancements-revamped-workout-tab-and-improved-exercise-screens/)).

**Sentiment — this is what users leaving looks like.** "What once felt
quick and straightforward [has] become crowded and awkward …
**changing muscle groups or exercises [takes] more steps, extra
screens, animations, and oversized lists**"; "since recent updates it's
harder to record sets because the app doesn't remember your last
weight, and **the input controls are very small, making mistakes more
likely**" (review aggregation:
[appgrooves Jefit negative reviews](https://appgrooves.com/ios/449810000/jefit-workout-planner-gym-log/jefit-inc/negative),
[fitmenhq.com](https://fitmenhq.com/jefit-app-review-2/),
[etechshout.com](https://etechshout.com/jefit-app-review/)).
On Jefit's own forum: "Everything loads soooo slow since last update …
App is getting horrible" ([jefit.com Q&A, user UnterNull89](https://www.jefit.com/q&a/106458110/UnterNull89/anyone-else-experiences-delay-in-the-app-everything-loads-soooo-slow-since-last-update-it%E2%80%99s-ok-to-post-or-workout%F0%9F%A5%B2));
"I'm getting the impression from latest reviews that Jefit [latest
rollout] is a disaster" ([jefit.com Q&A, user AJCrowley](https://www.jefit.com/q&a/97270376/AJCrowley/i-m-getting-the-impression-from-latest-reviews-that-jefit-version-11353-(latest-rollout)-is-a-disaster-with-little-or-no)).
Lesson: density + small inputs + slow navigation is precisely the
failure mode reviewers punish — and the one Volyume's context layer
risks.

## 4. Boostcamp — program-first, logging kept lean

**Screen design.** Day view shows "the exercise, target sets and reps,
and your last logged weight"; "you hit the set and tap to log it, and
the rest timer starts automatically"; "tap on the previous column's
weight and reps to auto-fill"
([boostcamp.app/workout-tracker](https://www.boostcamp.app/workout-tracker),
[boostcamp.app/features](https://www.boostcamp.app/features)).
Target and previous performance share one line per set — context without
chips. Auto-progression: "uses your logged performance to apply
automatic progressive overload … the closest any logging app gets to
real adaptive programming without AI"
([askvora.com best strength apps 2026](https://askvora.com/blog/best-strength-training-apps-2026)).

**Sentiment.** "While a lot of workout apps are clunky and hard to work
through, Boostcamp's interface offers a seamless navigation experience"
([generationiron.com review](https://generationiron.com/boostcamp-app-review/));
"I like it so much I paid for it"
([Google Play reviews](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp&hl=en)).
Complaints: freezes when completing workouts, slow startup, historic
offline failures ("leaving users stranded in the gym" — since fixed with
offline mode), exercise substitution paywalled (ibid.).

## 5. Alpha Progression — the closest analogue to Volyume

**Screen design.** Focused per-exercise flow with a **per-set
prescription**: "for every set, Alpha Progression gives you a precise
recommendation of how much weight and how many reps to go for"
([alphaprogression.com](https://alphaprogression.com/en)). Logging row =
weight, reps, RIR "with quick-tap suggestions and clear checkmarks"
([screensdesign.com showcase](https://screensdesign.com/showcase/gym-workout-alpha-progression),
[Google Play listing](https://play.google.com/store/apps/details?id=com.alphaprogression.alphaprogression&hl=en_US)).
The recommendation **is the prefill** — the coaching context lives in
the input row itself, not in chips above it.

**Sentiment.** "Clean interface … navigate with just a few taps"
([fitnessdrum.com review](https://fitnessdrum.com/alpha-progression-app-review/),
[compareworkoutapps.com](https://www.compareworkoutapps.com/reviews/alpha-progression-app-review/));
top pick in several gym-logger comparisons
([hotelgyms.com review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)).
Criticism: "a steep learning curve at the beginning, with a lot of
features", no cardio/stretch categories
([thefitnesstribe.com](https://thefitnesstribe.com/alpha-progression-review/)).
Relevant to Volyume: even with deterministic coaching, AP keeps the
in-session surface to *one* recommendation per set.

## 6. FitNotes — proof that fast beats pretty

**Screen design.** Android, free. Per-exercise editor: weight and reps
fields with **+/− increment buttons (customisable step)**; "if you have
logged sets for this exercise previously then the Set Fields will be
automatically populated with the values of the first set from the last
workout"; logged sets accumulate in a plain list below; "Copy Previous
Workout" for whole sessions
([fitnotesapp.com/workout_tracking](http://www.fitnotesapp.com/workout_tracking/),
[fitnotesapp.com/settings](http://www.fitnotesapp.com/settings/)).
Structurally the closest existing screen to Volyume's stepper card.

**Sentiment.** "The interface won't win design awards, but it's fast
and functional" ([turbulencegains.com powerlifter review](https://turbulencegains.com/fitnotes-review/));
"its legendary speed and reliability make it an enduring favorite …
Powerlifters often choose FitNotes because it **minimizes tap time**"
([setgraph.app/ai-blog/best-gym-app-reddit](https://setgraph.app/ai-blog/best-gym-app-reddit),
[strive-workout.com](https://strive-workout.com/2026/01/15/free-workout-tracker-app/)).
"FitNotes comes up in every Android-specific thread as the free,
no-strings option"
([setgraph.app Reddit roundup](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)).

## 7. GymBook — minimalist iOS, picker-based

"Log your workout in an efficient way thanks to its innovative,
**minimalistic UI** … pre-filled pickers and functions such as
Quick-Log make logging a piece of cake"; per-set settings for warm-ups
and pyramids; privacy-first, no subscription
([gymbookapp.com](https://www.gymbookapp.com/),
[App Store listing](https://apps.apple.com/us/app/gymbook-strength-training/id650113307)).
250,000+ users, 10,000+ 5-star ratings (ibid.). Users: "very
minimalistic … easily put your own workouts in"; "obviously created by
devs who actually see gym time"; "the best non-subscription app"
([justuseapp.com GymBook reviews](https://justuseapp.com/en/app/650113307/gymbook-strength-training/reviews),
[Product Hunt reviews](https://www.producthunt.com/products/gymbook/reviews)).
Wheel-pickers are slower than steppers for fine adjustment
(*inference*), but the praise is uniformly for restraint.

## 8. Progression (Android) — straightforward and clean

"Drag-and-drop handles & **pre-filled sets for effortless gym
logging**", smart rest timer **with system overlay**, plate calculator,
set tagging (dropsets, negatives, tempo), zero ads
([Google Play listing](https://play.google.com/store/apps/details?id=workout.progression.lite&hl=en_US)).
Users call it "the most straightforward workout tracker" with an
interface that is "clean, simple, and intuitive … the best gym tracker
for advanced lifters" (ibid., review extracts). Set tags are a
post-hoc label on the row — not a permanent control — which is how it
keeps the row clean.

## 9. Liftin' — one-tap logging as the entire pitch

"**Log every set with a single tap**", a large "SET 3" indicator,
integrated rest timer, optional rules that "automatically adjust the
weights depending on your results"
([App Store listing](https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669),
[liftinapp.co](https://www.liftinapp.co/),
[mwm.ai listing](https://mwm.ai/apps/liftin-gym-workout-tracker/1445041669)).
Sentiment: "I used to be a pen and paper guy, and now I couldn't go a
day without Liftin'"; "If I had to have one single app, including
texting and email, I would choose Liftin'"; "the simple nature of this
app is what makes users WANT to use it" (App Store reviews via ibid.).
Premium-only ($24.99/yr) limits its reach. Validates Volyume's 1-tap
log as the correct core — and shows the set indicator rendered *large*,
not at 11pt.

## 10. Setgraph — speed-first minimalism (completes the top 10)

"Rapid set logging, automatic rest timers, Smart Plates … **real-time
comparisons with your last session**"; "create exercises once and
access them instantly … no complex navigation or forced workout
planning" ([setgraph.app](https://setgraph.app/),
[setgraph.app simple-workout-app guide](https://setgraph.app/ai-blog/simple-workout-app-guide)).
User reviews: "easy and provides enough information to ensure
progression … nice to be able to easily see progression in lifts"
([setgraph.app/reviews](https://setgraph.app/reviews/couldn-t-recommend-enough)).
Vendor content is self-promotional; treated as a design statement, not
neutral evidence.

### Honourable mentions

- **Lyfta** — session-sheet with set tagging (warm-up, failure, drop,
  left/right) and auto-countdown timer; praised library and routine
  freedom; complaints about reset bugs and the social homepage ("wish
  there was a way to hide it")
  ([App Store](https://apps.apple.com/us/app/lyfta-gym-workout-tracker-log/id6443740936),
  [Google Play](https://play.google.com/store/apps/details?id=com.lyfta&hl=en_US)).
- **KeyLifts** — 5/3/1 niche; sets pre-computed from percentages so the
  session screen is read-and-tick. A reviewer's framing is the thesis of
  this whole audit: "most workout logging apps lack essential features …
  and many have **clunky or needlessly complicated UIs**"; counter-balanced
  by bug complaints
  ([App Store reviews](https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461?see-all=reviews)).

---

## 11. Sentiment synthesis — what moves users between apps

1. **Speed is the retention feature.** Every switching story found runs
   through logging speed: Strong is recommended as "the fastest workout
   logger on the market" ([sensai.fit](https://www.sensai.fit/blog/hevy-vs-strong-2026));
   FitNotes survives on "legendary speed" despite a 2011 interface
   ([setgraph.app](https://setgraph.app/ai-blog/best-gym-app-reddit));
   Jefit bleeds users when navigation gains "more steps, extra screens,
   animations" ([appgrooves](https://appgrooves.com/ios/449810000/jefit-workout-planner-gym-log/jefit-inc/negative)).
2. **Small input controls are explicitly punished.** Jefit reviewers:
   "the input controls are very small, making mistakes more likely"
   (ibid.). This is the only place in the entire field where font/control
   size is called out by name — and it is a complaint, never a request
   for more information density.
3. **"Extra options during a workout" is a named negative.** Hevy is
   chosen *because* it lacks them ([setgraph.app](https://setgraph.app/ai-blog/hevy-vs-strong));
   even Strong's additional buttons/menus earn it a "learning curve"
   tag (ibid.).
4. **Previous performance is a stated decision criterion.** The Reddit
   meta-criteria list it first among "what matters"
   ([setgraph.app](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit));
   Hevy, Strong, Boostcamp and Setgraph all surface it at input size in
   the input row.
5. **Rest-timer reliability, not rest-timer features,** is the common
   timer complaint (Hevy: "a reliable timer is one of the more common
   complaints" — [repreturn.com](https://repreturn.com/hevy-app-review/)).
   Nobody asks for more adjustment buttons; the standard is −15/+15/skip
   ([hevyapp.com](https://www.hevyapp.com/features/workout-rest-timer/)).
6. **Nobody complains that a logging screen shows too little.** Across
   every store listing, forum and review surveyed, complaints about
   missing context on the logging screen are absent; complaints about
   clutter, small controls and slowness are common and severe.

## 12. The gold standard

**Hevy's set row is the single most-replicated, most-praised logging
unit in the market** — the gold standard overall, with Strong as the
iOS-purist variant of the same idea. What makes it work, decision by
decision:

1. **One row = one set = one decision.** Set number, previous, weight,
   reps, tick. Nothing else is permanently rendered per set.
2. **Previous performance is data, not commentary.** "45kg x 9" sits in
   the PREVIOUS column at the same size as the inputs, grey but plain —
   readable at arm's length, and **tappable to prefill**
   ([hevyapp.com/features/track-exercises](https://www.hevyapp.com/features/track-exercises/)).
   One mechanism covers display + reuse.
3. **The confirm action is a single checkmark** that also starts the
   rest timer ([hevyapp.com/hevy-tutorial](https://www.hevyapp.com/hevy-tutorial/)).
4. **The rest timer has three controls** (−15, +15, skip)
   ([hevyapp.com](https://www.hevyapp.com/features/workout-rest-timer/)).
5. **Logged sets never leave the viewport context** — completed rows
   stay in place above the active row.
6. **Everything else — set type, notes, swap, remove — is behind the
   row's long-press/“…” affordances**, invisible until summoned.
7. Result: ~12–14 interactive elements mid-workout (Volyume deep audit
   measurement) vs Volyume's ~29.

**Where Volyume already beats the gold standard:** 1-tap prefilled
logging (Hevy's cold path is 2 taps), 52pt steppers (Hevy requires
keyboard for adjustments), structural cluster-set logging, superset
auto-jump parity, deterministic in-session coaching that Hevy simply
does not have. The gap runs one way only on the **context layer**:
where Hevy shows one plain-text previous value per set, Volyume shows
up to five 11pt chips, four previous-performance mechanisms, a 5-button
action row and a 5-control rest timer.
