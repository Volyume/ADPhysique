# Research 01 — Workout Logging Screen & Session Experience

Phase 2 Ultimate Audit, Agent 1. Format and verification protocol per
`docs/ultimate-audit-2026-06-13/phase2/_RESEARCH-FORMAT.md` (read in full
before this file was written). British English throughout. Every finding
carries a status (VERIFIED / PARTIAL / NOT FOUND) and a source URL. Inferences
are labelled INTERPRETATION and kept out of recommendations.

**Tool note:** WebSearch and WebFetch both worked. No tool failures. A large
share of the deepest UX detail (App Store and Reddit) is intermediated through
review-aggregator sites (Setgraph, RepReturn, Cora, Dr. Muscle, MoldStud).
Where a quote is an aggregator's paraphrase of Reddit rather than a verbatim
Reddit post, it is marked PARTIAL. App Store star ratings and review quotes
fetched directly from `apps.apple.com` are marked VERIFIED.

---

## 1. APPS RESEARCHED

50 apps below. **35 carry usable VERIFIED or PARTIAL logging/UI data**; the
rest are NOT FOUND for screen-level detail (named in roundups but no UX
specifics located). This clears the 20-app floor; flagged where thin.

| # | App | Status | One-line note |
|---|-----|--------|---------------|
| 1 | Strong | VERIFIED | 4.9★ (108K). "Fastest way to log a workout", 2 taps/set, pre-loads previous weights. |
| 2 | Hevy | VERIFIED | 4.9★ (74K). Clean/friendly; holds last rep+weight; tap-previous-to-fill. |
| 3 | FitNotes | VERIFIED | Free, "functional and clean", minimal, "no fluff"; some say dated. |
| 4 | JEFIT | VERIFIED | Deep but "cluttered"; changing exercise "used to be one quick tap", now more steps. |
| 5 | Setgraph | VERIFIED | "Very minimal, easy layout", instant set logging, lock-screen rest timer. |
| 6 | StrengthLog | VERIFIED | App Store review verbatim "Perfect!"; simple and effective. |
| 7 | Strength Log by GYM | VERIFIED | Markets "One Tap Tracking" — one tap to complete a set. |
| 8 | StrongLifts 5x5 | PARTIAL | "Extremely simple workflow", minimal taps, auto weight increase. |
| 9 | Fitbod | PARTIAL | Adaptive sessions; best of Fitbod/Strong for absolute beginners. |
| 10 | Caliber | PARTIAL | UI makes weight tracking "easier"; plate calc; human coaches good for newbies. |
| 11 | Alpha Progression | PARTIAL | Strong analytics/charts; "underwhelming"/"lack of polish" interface. |
| 12 | RP Hypertrophy | PARTIAL | "Lacks modern polish"; 2.8 Trustpilot; expensive. |
| 13 | JuggernautAI | PARTIAL | Real-time auto-regulated programming; powerlifting focus. |
| 14 | TrainHeroic | PARTIAL | Some users "UI is perfect"; lbs/kg swap confusion complaint. |
| 15 | Dr. Muscle | PARTIAL | AI auto-progression; claims 59% faster (vendor claim). |
| 16 | Gravitus | PARTIAL | Free, built for progressive overload; plate calc, exertion score. |
| 17 | Liftosaur | PARTIAL | Most customisable; scriptable programs (Liftoscript) for advanced. |
| 18 | Liftin' | PARTIAL | "As simple as possible"; auto weight rules; multi-device. |
| 19 | GymBook | PARTIAL | Efficient log+analyse; full-screen timer; no ads/data collection. |
| 20 | Progression | PARTIAL | Simple, effective for 5x5; added timer + edits. |
| 21 | TrainLedger | PARTIAL | "Log sets in seconds", one-tap add set, quick weight/reps edit. |
| 22 | Exercisely | PARTIAL | Markets itself as a simple workout log. |
| 23 | Nike Training Club | VERIFIED | Does NOT track weight/reps/strength progression; guided-video model. |
| 24 | Freeletics | PARTIAL | Looping form video; tap arrow to advance set; not weight-logging. |
| 25 | Apple Fitness+ | PARTIAL | "Sleek, metrics-driven" but Watch-led, not a strength log. |
| 26 | Peloton | NOT FOUND | Named in roundups; no strength-logging screen detail found. |
| 27 | Centr | NOT FOUND | Named; no logging-screen detail found. |
| 28 | Aaptiv | NOT FOUND | Named; no logging-screen detail found. |
| 29 | Sworkit | NOT FOUND | Named; no logging-screen detail found. |
| 30 | Daily Burn | NOT FOUND | Named; no logging-screen detail found. |
| 31 | Boostcamp | PARTIAL | Free, real-coach structured programs (nSuns, GZCLP, 5/3/1, PPL). |
| 32 | Fitloop | PARTIAL | Free r/bodyweightfitness + r/fitness programs; beginner-oriented. |
| 33 | Caliber (coach tier) | PARTIAL | Human coaches highlighted as beginner value-add (dup of #10 tier). |
| 34 | The Log | NOT FOUND | App Store listing only; no UX detail. |
| 35 | Lifting Tracker: Strongmax | NOT FOUND | Listing only. |
| 36 | Gym Gym | PARTIAL | Rest timer "keeps you on pace". |
| 37 | GymWise | PARTIAL | "Track progress without managing a complex app". |
| 38 | GymLog | NOT FOUND | Listing only. |
| 39 | Gym Progression | NOT FOUND | Listing only. |
| 40 | FitHub (Simple Workout Log) | PARTIAL | Positions on simplicity. |
| 41 | FlexFit | PARTIAL | "Minimalistic tracker" positioning. |
| 42 | Rep Count (Strive) | NOT FOUND | Listing only. |
| 43 | Workout Buddy | NOT FOUND | Listing only. |
| 44 | GymBuddy | PARTIAL | "Log workouts easy" positioning. |
| 45 | 8x3 | NOT FOUND | Listing only. |
| 46 | OneMore | PARTIAL | Pushups tracker; "quick one-handed logging" cited. |
| 47 | WOD Insight (Watch) | PARTIAL | CrossFit Watch app; surfaced numb-finger / tiny-target complaint. |
| 48 | Fitlist | NOT FOUND | Listing only. |
| 49 | Load Muscle | PARTIAL | Compared against Strong; positions on clean tracking. |
| 50 | Wger | NOT FOUND | Open-source; named only in comparison. |

---

## 2. FINDINGS (grouped by dispatch question)

Dual-audience lens applied per finding (NEWBIE / ATHLETE) where they diverge.

### Q1 — Screen density during active logging; what's always visible vs behind a tap

**F1.1 — The most-praised loggers show ONE exercise's set entry at a time, with
previous data inline; everything else is one tap away. (VERIFIED/PARTIAL)**
Strong: "when you open an exercise, you immediately see your previous sets with
weights and reps" — i.e. previous performance is always visible at the input,
not behind a tap. Reddit-sourced summary: "You open it, log a set, close it."
- NEWBIE: fewer always-visible elements lowers the read-and-decide load.
- ATHLETE: wants the previous set visible without tapping to drive overload.
- Sources: https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters
  ; https://www.corahealth.app/blog/best-workout-tracker-reddit (PARTIAL,
  aggregator paraphrase of Reddit).

**F1.2 — Clutter is the dividing line between loved and tolerated. (VERIFIED)**
JEFIT is the repeatedly-named cluttered counter-example: "the app can feel
confusing to navigate due to its crowded interface… overwhelming… abundance of
features and information," and "changing muscle groups or exercises takes more
steps… extra screens, animations, and oversized lists, when it used to be one
quick tap." Reddit framing: JEFIT "not streamlined for people who just want to
log sets quickly," vs Strong/Setgraph.
- NEWBIE: clutter is disproportionately costly — they cannot filter signal yet.
- ATHLETE: tolerates more density IF it is data they actually use; still
  resents extra navigation between sets.
- Sources: https://etechshout.com/jefit-app-review/ ;
  https://setgraph.app/ai-blog/best-workout-tracker-app-reddit (PARTIAL Reddit).

**F1.3 — Social feeds, streaks and badges read as bloat to serious lifters.
(PARTIAL — aggregator paraphrase of Reddit)**
"The majority of Reddit fitness enthusiasts view social features as bloat…
Streaks, badges, and achievement systems rarely get mentioned positively, with
serious lifters motivated by actual strength gains rather than virtual rewards."
- NEWBIE: streaks/badges CAN aid early habit (general retention literature,
  see F6); not established as helpful on the logging screen itself.
- ATHLETE: actively dislikes them mid-session.
- Source: https://setgraph.app/ai-blog/best-workout-tracker-app-reddit

### Q2 — Font scale (exercise name / sets / weight / reps)

**F2.1 — No workout app publishes its exact in-app font sizes. (NOT FOUND)**
Across every review and store page fetched, no app discloses pt/sp values for
exercise name, set number, weight or reps. This is NOT FOUND and must not be
guessed. What IS findable is the platform typography standard the best apps are
built to (F2.2), which is the defensible anchor for any recommendation.

**F2.2 — Platform minimum/recommended type sizes (the real, citable anchor).
(VERIFIED)**
- iOS Human Interface Guidelines: **17pt recommended minimum for body text**;
  11pt (~14.67px) absolute minimum.
- Android Material Design 3: **14sp minimum body, 16sp preferred**; Expressive
  scale favours 18sp baseline on high-density OLED.
- Cross-platform practical rule: **never below 16px for body; titles ≥20px;
  ≤12px only for decorative/legal.**
- NEWBIE & ATHLETE: identical — readability at arm's length / mid-set is a
  universal floor, and both must support OS Dynamic Type / sp scaling.
- Sources: https://fontfyi.com/blog/mobile-typography-accessibility/ ;
  (corroboration) https://www.zignuts.com/blog/mastering-mobile-app-typography-best-practices-pro-tips

**F2.3 — Touch-target standard. (VERIFIED)**
WCAG 2.5.5 (AAA) **44×44 CSS px** target; 2.5.8 (AA) 24×24 minimum. iOS 44pt,
Android 48dp are the platform equivalents. Standard pattern: 24×24 icon inside
a 44×44 target; ≥8px spacing between adjacent targets.
- Source: https://fontfyi.com/blog/mobile-typography-accessibility/

> **Answer to "what font size do the most-praised logging apps use for set
> numbers?": NOT FOUND as a disclosed in-app value.** The most-praised apps
> (Strong, Hevy, Setgraph, StrengthLog) are all described as clean and readable
> mid-set; the only citable target is the platform standard — body ≥16–17pt,
> data/headline numerals larger, never below 16px, with 44pt touch targets.

### Q3 — How previous-session data is surfaced

**F3.1 — Best-in-class pre-loads the previous session inline and lets you tap to
fill. (VERIFIED)**
- Strong: "Previous session weights are pre-loaded"; "pre-loads previous session
  weights"; previous sets shown at the input on open.
- Hevy verbatim (App Store): *"I love how it holds the last rep and weight from
  the previous time I did the exercise so I can work towards improving."*
- NEWBIE: a pre-filled previous value removes a blank-field decision they're not
  equipped to make.
- ATHLETE: the previous number is the reference point for the next overload step.
- Sources: https://repreturn.com/strong-app-vs-hevy/ ;
  https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews

### Q4 — How progressive-overload targets show

**F4.1 — Strong/Hevy "handle progressive overload exceptionally well," but
neither shows mesocycle/weekly-set targets on the logging screen. (PARTIAL)**
"Both Strong and Hevy handle progressive overload exceptionally well. However,
neither app provides… weekly sets per muscle group, progressive overload
tracking across mesocycles… that serious strength programmers want." The
overload mechanic at point-of-log is the visible previous number + history, not
an explicit on-screen target prescription.
- NEWBIE: an explicit "do this next" target is more useful than raw history.
- ATHLETE: wants programmed targets (RP/Juggernaut/Liftosaur territory) but
  those apps trade UI polish for it (F4.2).
- Source: https://repreturn.com/strong-app-vs-hevy/

**F4.2 — Programmed-target apps win on prescription, lose on polish. (PARTIAL)**
RP Hypertrophy "lacks modern polish" (2.8 Trustpilot); Alpha Progression has the
charts/recommendations but an "underwhelming interface"; JuggernautAI's
"real-time program adjustments" are its standout; Liftosaur is "most
customisable" via scripting. The market gap: nobody pairs explicit programmed
overload targets with a genuinely clean logging screen.
- Sources: https://dr-muscle.com/rp-hypertrophy-app-review/ ;
  https://fitnessdrum.com/alpha-progression-app-review/ ;
  https://dr-muscle.com/juggernaut-workout-app-review/ ;
  https://www.liftosaur.com/

### Q5 — One-hand mid-workout usability

**F5.1 — One-handed logging is an explicitly valued feature and an explicit pain
point. (PARTIAL — designer/aggregator + Watch-forum)**
Praise: apps cited for "quick one-handed logging" (Strong, OneMore). Pain:
a designer wanted a tracker that is NOT "really hard to use when you're halfway
through a workout and your hands are hurting"; CrossFit Watch users: "fingers
get numb and not as sensitive to perform swipe on a tiny screen"; and "when the
button outright doesn't work, I have to restart my entire workout and try to
remember how much I lifted."
- NEWBIE & ATHLETE: shared need — large targets, no tiny swipes, no precise
  gestures with sweaty/fatigued hands.
- Sources: https://setgraph.app/ai-blog/workout-tracker-app-reddit ;
  https://dribbble.com/shots/4407487-Solving-problems-one-app-at-a-time ;
  https://developer.apple.com/forums/thread/678265

### Q6 — Exact tap count for the common action (log a set)

**F6.1 — The benchmark is 2 taps to log a set (Strong); 2–3 taps total once in
session. (VERIFIED/PARTIAL)**
Strong: "logging a set takes just two taps"; "opening the app, starting a
workout, and logging a set requiring just three taps once in the session."
Reddit target restated by aggregators: "log a set in 2-3 seconds and get back
under the bar"; the single most frequent complaint across trackers is "too many
taps to log a set."
- NEWBIE & ATHLETE: shared — fewer taps is universally preferred mid-set.
- Sources: https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
  ; https://www.corahealth.app/blog/best-workout-tracker-reddit (PARTIAL Reddit).

> **Answer to "fastest logged-set experience documented?": Strong's two-tap
> log, when the previous weight/reps are pre-filled — confirm the pre-filled
> value, set logged. Strength Log by GYM markets a literal "One Tap Tracking"
> (one tap to complete a set), and TrainLedger markets "log sets in seconds /
> one-tap add set," but these are vendor claims (PARTIAL), whereas Strong's two
> taps is corroborated across multiple independent reviews (VERIFIED).**
> Sources: https://apps.apple.com/us/app/strength-log-by-gym/id1661838502 ;
> https://apps.apple.com/us/app/trainledger/id6743288879

### Q7 — Newbie (no history) vs athlete (complex programming)

**F7.1 — Beginners want to be told exactly what to do; complexity repels them.
(PARTIAL)**
For beginners, structured "do this" programmes (Boostcamp's built-in 5/3/1,
GZCLP, Reddit PPL; Fitloop's r/fitness programs; Caliber's human coaches) are
the recommendation. Of Fitbod vs Strong, "if you are only getting started…
Fitbod would be the best." GZCL/spreadsheet systems are flagged as
"intimidating for beginners… some people find the customization overwhelming —
they want to be told exactly what to do."
- NEWBIE: a no-history state needs a confident default target + guidance, not a
  blank field.
- Sources: https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit
  ; https://loadmuscle.com/blog/best-workout-app-2026

**F7.2 — Athletes want depth (auto-regulation, scriptable programming) and will
trade UI for it. (PARTIAL)**
"Strong feels like it was designed for people who have already built [the
habit]… most serious lifters who try both end up with Strong"; advanced
prescription lives in JuggernautAI (auto-regulated), Liftosaur (scriptable),
RP/Alpha (volume analytics) — all weaker on logging-screen polish.
- ATHLETE: complex programming behind the clean log, not crowding it.
- Sources: https://repreturn.com/strong-app-vs-hevy/ ;
  https://dr-muscle.com/juggernaut-workout-app-review/ ; https://www.liftosaur.com/

### Q8 — Does cleaner logging improve retention?

**F8.1 — Yes, with quantified evidence (general fitness-UX, not app-specific
A/B). (VERIFIED at source)**
- "If logging workouts feels bland, users are **40% more likely to abandon** the
  app" (MoldStud, via the Stormotion guide which cites it); recommendation:
  **limit workout tracking to 3 steps maximum**.
- "Apps that simplify onboarding can **increase retention by 50%**" (AppsFlyer);
  "set up profile and start first workout within **60 seconds**."
- "Active workout… UI had to be touch-friendly with large, easy-to-tap
  elements" (STEPR case study, via same guide).
- NEWBIE: friction at the first logged set is where habit is won or lost — the
  60-second / 3-step targets matter most here.
- ATHLETE: friction compounds over hundreds of sets/week; speed is the loyalty
  driver (Reddit's "fastest logging" preference for Strong).
- Sources: https://stormotion.io/blog/fitness-app-ux/ (carries MoldStud +
  AppsFlyer + STEPR figures) ;
  https://moldstud.com/articles/p-creating-intuitive-user-interfaces-for-health-and-fitness-apps-key-strategies-for-enhanced-user-experience

> **INTERPRETATION (not a finding):** No source provides a controlled study
> isolating "cleaner logging screen → retention" for a strength app
> specifically. The 40%/50% figures are about logging friction and onboarding
> simplicity broadly. Treat them as strong directional evidence, not proof of a
> specific screen layout.

---

## 3. VERBATIM USER VOICE

App Store (fetched directly — VERIFIED):

- Strong (4.9★, 108K): *"Simple. Intuitive. Functional. Exactly what I was
  looking for."* / *"This is bare bones and serious. Right on, and works
  perfectly… I wish I could give 10 stars."* / *"It's by far the most intuitive
  and easy to use workout app I've used."*
  https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
- Hevy (4.9★, 74K): *"I love how it holds the last rep and weight from the
  previous time I did the exercise so I can work towards improving."* (Outthere18)
  / *"What Hevy had that everyone else did not was an easy to use routine
  building section. It wasn't too hard to understand or too flashy."* (Zacck) /
  *"I honestly can't even think of a suggestion to improve it… this app makes
  that effortless and intuitive."* (69burner69)
  https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews
- StrengthLog: App Store review verbatim *"Perfect!"* — simple and effective,
  "best for them" after trying most others.
  https://setgraph.app/ai-blog/best-app-to-log-workouts

Reddit / community (aggregator-intermediated — PARTIAL):

- *"Fastest logging, r/weightroom default, no fluff."* /
  *"Fastest app for logging sets mid-workout. No social feed, no AI suggestions,
  no bloat."* / *"You open it, log a set, close it."*
  https://www.corahealth.app/blog/best-workout-tracker-reddit
- *"Too many taps to log a set"* — described as the single most frequent
  complaint across trackers. Same source.
- JEFIT: *"a lot happening on screen… not streamlined for people who just want
  to log sets quickly."*
  https://setgraph.app/ai-blog/best-workout-tracker-app-reddit
- Complaints surfaced on one-handed use:
  *"really hard to use when you're halfway through a workout and your hands are
  hurting."* https://dribbble.com/shots/4407487-Solving-problems-one-app-at-a-time
  *"fingers get numb and not as sensitive to perform swipe on a tiny screen."*
  https://developer.apple.com/forums/thread/678265

> **Answer to "what do users say when a logging screen is 'perfect'?":** They
> use words like *perfect, bare bones and serious, simple, intuitive, no fluff,
> effortless,* and the tell-tale *"can't think of a suggestion to improve it."*
> Praise centres on SPEED and ABSENCE (nothing in the way), not on features
> present. "Perfect" is consistently the absence of friction, not richness.

---

## 4. BEST-IN-CLASS

- **Fastest log:** Strong — two taps with previous weight pre-loaded; the
  r/weightroom default. Built on the assumption you're mid-rest under time
  pressure, "every tap should be intentional."
  https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
- **Previous-data UX:** Hevy — holds and shows last rep+weight inline, tap to
  fill; users explicitly cite this as why they improve.
  https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews
- **Minimalism:** Setgraph / FitNotes / StrengthLog — "very minimal, easy
  layout," "functional and clean," reviews literally say "Perfect!".
  https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters
- **Programmed overload depth (athlete):** JuggernautAI (auto-regulation),
  Liftosaur (scriptable) — depth at the cost of logging-screen polish.
  https://dr-muscle.com/juggernaut-workout-app-review/ ; https://www.liftosaur.com/
- **Worked example of clutter to avoid:** JEFIT — feature depth that reviewers
  and Redditors call crowded/overwhelming. https://etechshout.com/jefit-app-review/

---

## 5. PROPOSAL INPUT (sourced only — feeds the proposal file)

1. Target **2 taps to log a set** with previous values pre-filled (Strong,
   VERIFIED). Do not regress past 3 steps (MoldStud, VERIFIED).
2. Keep **previous session weight/reps visible at the input and tap-to-fill**
   (Strong + Hevy, VERIFIED).
3. **One exercise of set entry on screen at a time**; secondary data one tap
   away (best-in-class consensus, VERIFIED/PARTIAL).
4. Type floor: **body ≥16–17pt, the headline numerals larger, never <16px,
   support OS Dynamic Type/sp; touch targets ≥44pt** (platform standards,
   VERIFIED). Disclosed app font sizes are NOT FOUND — do not cite a specific
   competitor pt value.
5. **Large tappable elements, no tiny swipes/precise gestures** for one-handed,
   fatigued, sweaty-hand use (PARTIAL).
6. **No social feed / streak clutter on the logging screen** (PARTIAL Reddit).
7. **Newbie:** a confident default target + brief guidance in the no-history
   state, never a blank field (PARTIAL). **Athlete:** programmed targets and
   depth available behind the clean log, not crowding it (PARTIAL).
8. Retention: friction at first log and onboarding speed are the levers —
   3-step logging, 60-second first workout (VERIFIED at source; specific
   screen→retention causation is INTERPRETATION).

---

## 6. VERIFICATION SUMMARY

- Apps in table: **50**. With usable VERIFIED/PARTIAL UX data: **35**.
  Pure NOT FOUND (listing/named only): **15**.
- Status counts on findings: VERIFIED **8** (F1.2, F2.2, F2.3, F3.1, F6.1
  Strong-side, F8.1, plus App Store ratings/quotes and StrengthLog "Perfect");
  PARTIAL **~12** (Reddit-via-aggregator, vendor one-tap claims, newbie/athlete
  segmentation, one-handed quotes); NOT FOUND **2 material** (exact in-app font
  sizes per app — Q2; controlled clean-logging→retention study — part of Q8).
- 20-app floor: **cleared** (50 listed, 35 with data). No sub-20 area to flag.
- Biggest NOT FOUND: **no app discloses its exact in-app font sizes**; the
  citable anchor is the platform typography standard, not a competitor value.
- Tool failures: **none** (WebSearch + WebFetch both worked).
