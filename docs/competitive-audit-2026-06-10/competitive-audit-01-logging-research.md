# Competitive Audit 01 — Workout Logging & Session Experience
**Date:** 10 June 2026
**Scope:** Top 10 apps best known for the in-gym logging experience, compared against Volyume's new ActiveWorkout table-as-input baseline.
**Method:** 24 web searches across app review sites, Google Play / App Store review extracts, comparison blogs, vendor docs and aggregators. Direct page fetches were blocked in this research environment (HTTP 403 via proxy), so every claim is cited to the source URL surfaced and summarised by search. Claims from competitor-authored comparison blogs (Setgraph, Jefit, RepCount, Dr Muscle, etc.) are flagged as **[vendor-biased]** — they consistently flatter the author's own app and should be weighted accordingly.

---

## 1. Top 10 Ranked (by logging-experience reputation)

| # | App | One-line verdict |
|---|-----|------------------|
| 1 | **Hevy** | "Cleanest gym logging UX in 2026" — one-tap set entry, previous data auto-filled, free tier, social layer; but no progression guidance at all. |
| 2 | **Strong** | The original speed benchmark — "fastest possible logging with no distractions" (3 taps/set), but ageing, buggy, and stagnant. |
| 3 | **Jefit** | Deepest analytics and volume tracking; logging itself widely called "drawn out and clunky", made worse by recent updates and ads. |
| 4 | **Alpha Progression** | The progression-recommendation leader — tells you the next weight/reps in-session; UI praised as "a marvel of use and simplicity". |
| 5 | **Boostcamp** | Best program library (Reddit-famous spreadsheets in app form) with a competent logger; slow startup and post-update bugs. |
| 6 | **Setgraph** | Minimalist speed specialist — swipe-to-log "in 1–2 seconds"; thin on programs, set types and ecosystem. |
| 7 | **RepCount** | Native-Kotlin Android logger, prefill-and-tap flow, Health Connect sync, 4.8★; supersets and stats paywalled. |
| 8 | **Gravitus** | Clean iOS-first progressive-overload logger with autofill and social; $99.99/yr Pro and billing complaints. |
| 9 | **Lyfta** | Huge animated exercise library + fast log flow; programs never adapt, and users report sessions resetting unexpectedly. |
| 10 | **Liftin'** | Swipe-to-log iOS logger with user-defined auto-progression rules; tiny free tier (5 workouts/month). |

**Notable mentions:** **KeyLifts** (best-in-class for percentage-based 5/3/1 logging: auto-calculated sets, PR alerts, free AMRAP/rest-pause set types), **Peloton Strength+** (content-led; logging is an afterthought — reps logged at the end of a movement, iOS/US-only, no Android as of late 2025).

---

## 2. Per-App Deep Dives

### 2.1 Hevy
- **Logging speed:** "One-tap set entry, previous set data auto-filled" ([FindYourEdge 2026](https://www.findyouredge.app/news/best-strength-training-apps-2026)). One head-to-head puts a full set-log at ~15 seconds and notes Hevy is "fast but not as fast as Strong... requires slightly more navigation between some screens" ([PRPath Strong vs Hevy](https://prpath.app/blog/strong-vs-hevy-2026.html), [Setgraph comparison](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026) [vendor-biased]).
- **Previous data:** Auto-fills previous weights/reps — called "the single most useful feature for progressive overload" ([RepReturn review](https://repreturn.com/hevy-app-review/)).
- **Progression guidance:** None. "Hevy logs what you do — it doesn't tell you what you should do next... no adaptive programming, no built-in progressive overload recommendations, no coaching layer to tell you when to deload" ([Dr Muscle Hevy review](https://dr-muscle.com/hevy-workout-app-review/); echoed by [Arvo vs Hevy](https://arvo.guru/vs/hevy): "Arvo tells you what weight to use next. Hevy shows you what you did last time").
- **Rest timer:** Auto-start per-exercise timers plus a Live Activity widget on iOS **and Android**: rest countdown on lock screen, ±15s adjust, skip, and even mark-set-complete without unlocking the phone — on the free tier ([Hevy Live Activity help](https://help.hevyapp.com/hc/en-us/articles/35649846517399-How-to-Use-Hevy-s-Live-Activity-on-iOS-and-Android), [feature page](https://www.hevyapp.com/features/live-activity/)).
- **Set types:** Warm-up, drop set, failure sets, supersets with "Smart Superset Scrolling"; RPE column toggleable ([Hevy set types](https://www.hevyapp.com/features/workout-set-types/), [workout settings](https://www.hevyapp.com/features/workout-settings/)).
- **Substitution:** Manual exercise replace only; no intelligence.
- **Complaints (sources named):** Samsung Health / platform sync "can be unreliable"; "the Wear OS app is still buggy, with reports of half-completed workouts disappearing or auto-scrolling during sets"; "requires an internet connection for many features, which can frustrate lifters who train in low-signal gyms" ([RepReturn](https://repreturn.com/hevy-app-review/), [PRPath review](https://prpath.app/blog/hevy-app-review-2026.html)). Free tier caps: 4 routines, 3 months history, 7 custom exercises ([PRPath](https://prpath.app/blog/hevy-app-review-2026.html)).
- **Why users stay:** Free unlimited logging, social feed accountability ("the accountability element is what keeps many users consistent" — [Jefit comparison guide](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/) [vendor-biased]); App Store reviewer: "You can tell the creators work out themselves because they know how important it is to be able to label drop sets, failure sets, supersets, etc."

### 2.2 Strong
- **Logging speed:** ~3 taps per set, vs Jefit's 4 ([Strive gym-log roundup](https://strive-workout.com/2026/05/20/best-app-for-gym-log/)); "logging workouts quickly with zero friction... open the app, select your exercise, log your set, move on" ([Jefit 2026 guide](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/)). "Strong's core advantage is logging speed... previous session weights are pre-loaded, and the rest timer starts automatically when you finish a set" ([PRPath](https://prpath.app/blog/strong-vs-hevy-2026.html)).
- **Previous data:** Pre-loaded from last session per set row.
- **Progression guidance:** None — "lacks intelligent features like AI coaching, workout generation, and smart recommendations" ([PRPath Strong review](https://www.prpath.app/blog/strong-app-review-2026.html)).
- **Rest timer:** Auto-start, per-exercise customisable presets, "tightly integrated with sets" — considered the more robust of the Strong/Hevy pair ([PRPath](https://prpath.app/blog/strong-vs-hevy-2026.html)).
- **Set types:** Warm-up, AMRAP, drop sets, supersets with quick access; plate calculator ([App Store listing](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577)).
- **Complaints:** "Strong is showing its age in 2026... interface feels dated... lacks intelligent features"; "the price is high for a simple log, and bugs are a common complaint" ([Setgraph Strong review](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph) [vendor-biased], [HotelGyms Strong review](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)). Data export is paywalled, which the Reddit crowd "criticises heavily" ([Setgraph Reddit analysis](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit) [vendor-biased]).
- **Why users stay:** Lifetime purchase option ($99.99), years of accumulated history, and the fact that "Strong handles the two-taps-after-a-hard-set moment better than a lot of newer apps" ([Strive](https://strive-workout.com/2026/05/20/best-app-for-gym-log/)).

### 2.3 Jefit
- **Logging speed:** ~4 taps per set ([Strive](https://strive-workout.com/2026/05/20/best-app-for-gym-log/)); "the mobile app has historically had more friction in the logging flow" ([Jefit's own 2026 guide concedes](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/)).
- **Strengths:** Best volume analytics — per session, per muscle group across 7d/14d/1m/12m/lifetime, plus explicit progressive-overload trend tracking; 1,400+ exercise library with HD video; interval/autoplay mode that auto-records logs ([Jefit guide](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/), [Jefit interval timer support](https://support.jefit.com/hc/en-us/articles/201464700-What-Is-The-Stopwatch-Interval-Timer-Function-)).
- **Complaints (exact):** "What used to be one quick tap now feels drawn out and clunky"; "changing muscle groups or exercises takes more steps, with extra screens, animations, and oversized lists"; "each update feels like it takes away something useful" (the quick-add lightning button was removed); on v11.35.3: "it's as if they tried to make it as user-abusive as possible... all glitz with no functionality that works for those of us who actually work out"; users "can't go back into a completed exercise" ([eTechShout review](https://etechshout.com/jefit-app-review/), [Jefit Q&A thread](https://www.jefit.com/q&a/97270376/AJCrowley/), [Dr Muscle Jefit review](https://dr-muscle.com/jefit-review-alternative/)). Ads in the free tier are "a distraction" ([eTechShout](https://etechshout.com/jefit-app-review/)).
- **Why users stay:** Years of history + the deepest free analytics; "been using JEFIT for years and find it great" ([AppGrooves positive reviews](https://appgrooves.com/ios/449810000/jefit-workout-planner-gym-log/jefit-inc/positive)).

### 2.4 Alpha Progression
- **The progression benchmark:** Deterministic in-session recommendations — the app proposes the next weight/reps for every set based on prior performance; "the app's strength lies in its ability to track [and drive] progressive overload" ([Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/), [HotelGyms review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)). Plan generator adapts to available equipment. Winner of "best weightlifting app" comparisons ([Fitness Drum](https://fitnessdrum.com/alpha-progression-app-review/)).
- **UI:** "A marvel of use and simplicity"; "very impressed with the UI and the entire flow" ([AppsCounselor](https://appscounselor.com/alpha-progression-app-review/), [JustUseApp reviews](https://justuseapp.com/en/app/1462277793/alpha-progression-gym-logger/reviews)).
- **Complaints:** 600–700-exercise library "can be overwhelming"; no audio cues; weak cardio support ("users have struggled with adding cardio and would like the app to track everything in one place"); little surfaced around 1RM display ([AppsCounselor](https://appscounselor.com/alpha-progression-app-review/), [Fitness Drum](https://fitnessdrum.com/alpha-progression-app-review/)).
- **Why users stay:** "Unrivalled customer support" and the feeling of never having to think about what to lift next ([Fitness Drum](https://fitnessdrum.com/alpha-progression-app-review/)).

### 2.5 Boostcamp
- **Positioning:** "Started as a way to get Reddit's most popular workout programs out of spreadsheets and into an app"; 50+ coach programs, 10,000+ community programs; logger supports sets/reps/RPE/1RM, no ads ([Google Play listing](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp&hl=en_US)).
- **Complaints (exact):** "Slow on startup and sometimes needs to reload completely if away from the app for too long" (dev-acknowledged); post-update bug where "the app refus[ed] to register that a workout has been completed, requiring users to complete a new 'fake' workout and then delete it"; users prefer "a one-time fee over a subscription" ([Google Play reviews](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp&hl=en_US), [App Store reviews](https://apps.apple.com/us/app/boostcamp-workout-programs/id1529354455)).
- **Why users stay:** The program library itself — switching means losing the structured program mid-cycle.

### 2.6 Setgraph
- **Logging speed:** Its whole pitch — "log with a single swipe... record sets in 1–2 seconds"; reviewers: "takes literally seconds to log sets... improved efficiency x10"; auto rest timer on set commit "is super nice" ([Setgraph reviews page](https://setgraph.app/reviews) [vendor-curated], [App Store](https://apps.apple.com/us/app/setgraph-gym-workout-tracker/id1209781676)).
- **Previous data:** "Instant access to your previous weights and reps, so you know exactly what to beat" ([Setgraph](https://setgraph.app/ai-blog/best-workout-tracking-apps) [vendor-biased]).
- **Other:** "Smart Plates" plate calculator. Weaknesses: minimal program/coaching layer, small ecosystem, marketing built on SEO comparison blogs.

### 2.7 RepCount
- **Logging:** "Open your workout, see what you did last time pre-filled, adjust the weight or reps, and tap to save"; claims a 2-second voice-logging path "faster than any tap-based app" ([RepCount articles](https://www.repcountapp.com/articles/best-workout-tracker-android) [vendor-biased]).
- **Android quality:** Native Kotlin app, Health Connect sync, "actually looks at home on Android" — 4.8★ across ~7k reviews ([Google Play](https://play.google.com/store/apps/details?id=sp.repcount&hl=en)).
- **Complaints:** Supersets and advanced stats (e1RM graphs, PR charts) are Premium-only ([RepCount site](https://www.repcountapp.com/)).

### 2.8 Gravitus
- **Logging:** Autofill workouts, rest timers, 1,000+ exercise videos, dark mode, no ads, social "fist-bump" community; "clean interface and straightforward tracking... if you're using progressive overload" ([App Store](https://apps.apple.com/us/app/gravitus-gym-workout-tracker/id965383840), [Product Hunt](https://www.producthunt.com/posts/gravitus)).
- **Complaints (exact):** Pro at "$99.99/year... expensive compared to competitors"; a user "deleted their account and cancelled their subscription through Apple, yet the app continued to charge them"; "workouts fail to publish... around once a week"; previously free features moving behind Pro ([AppGrooves negative reviews](https://appgrooves.com/ios/965383840/gravitus-workout-tracker/gravitus-inc/negative), [App Store](https://apps.apple.com/us/app/gravitus-gym-workout-tracker/id965383840)).
- iOS-first; weak Android story.

### 2.9 Lyfta
- **Logging:** "Workout logging flow is fast and intuitive — start a session, log your sets, finish"; 1,400+ animated exercises with muscle diagrams, "one of the cleanest interfaces in workout tracking" ([Soma's Lyfta review](https://trysoma.app/blog/lyfta-app-review/) [vendor-biased], [App Store](https://apps.apple.com/us/app/lyfta-gym-workout-tracker-log/id6443740936)).
- **Complaints (exact):** "Programs don't adapt based on your performance, your fatigue, or how a session went... the program just keeps going at the same pace"; "technical issues with the app occasionally resetting workouts unexpectedly"; no native nutrition (MyFitnessPal hand-off = "separate app, separate subscription, sync friction") ([Soma review](https://trysoma.app/blog/lyfta-app-review/)).

### 2.10 Liftin'
- **Logging:** "Swipe-to-log workout system", "smart memory that recalls your last weights so you never start from scratch", "start workouts instantly and build as you go"; users can "set up rules to automatically adjust the weights depending on your results" — user-authored progression automation ([App Store](https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669), [liftinapp.co](https://www.liftinapp.co/)).
- **Complaints:** Free tier capped at 5 tracked workouts/month; $24.99/yr after intro; iOS-only; small ecosystem ([App Store](https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669)).

### Notable mentions
- **KeyLifts:** "The only app built from the ground up to run percentage-based programs like 5/3/1" — one tap creates a whole cycle with weights auto-calculated, plate display, PR alerts; praised for *not* paywalling AMRAP/rest-pause set types "like some popular competing apps with clunky or needlessly complicated UIs" ([App Store reviews](https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461?see-all=reviews), [keylifts.com](https://keylifts.com/)). Pro: training-max auto-progression, plate calculator, graphs.
- **Peloton Strength+:** Launched iOS/US Dec 2024; "no automatic rep counting or tracking of any sort — you'll be counting each set in your head and logging it at the end of each movement, or at the end of the workout"; AI voice coach "sounds like bad 2012 Siri"; Android/international "maybe 2026" ([PeloBuddy](https://www.pelobuddy.com/strength-plus-available-cost/), [PeloBuddy Android update](https://www.pelobuddy.com/updates-strength-android-countries/), [App Store](https://apps.apple.com/us/app/peloton-strength/id6476712925)). Not a logging threat today; a brand threat if logging improves.

---

## 3. Cross-App User Sentiment

### What users love (loyalty drivers)
1. **Prefill from last session** — universally cited as the killer feature ("the single most useful feature for progressive overload", [RepReturn](https://repreturn.com/hevy-app-review/)).
2. **Speed/zero friction** — "logging a set in 10 seconds instead of 45 seconds makes you far more likely to do it consistently" ([Push/Pull blog](https://push-pull.app/blog/best-workout-tracker-app)).
3. **Accumulated history** — "app-hopping destroys the long-term value of tracking... every time you switch you either lose your history or spend hours migrating data" ([Setgraph Reddit analysis](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)). History is the real moat.
4. **Respect for the lifter** — set-type fidelity (drop/failure/superset labels), data export, no artificial caps. "Apps that lock data behind paywalls or make export difficult get criticised heavily" by Reddit ([ibid.](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)).
5. **Social accountability** (Hevy, Gravitus, Boostcamp) keeps a large cohort consistent.

### What users hate (recurring, with sources)
- **Update regressions that slow logging** — Jefit v11.35.3 backlash ([Jefit Q&A](https://www.jefit.com/q&a/97270376/AJCrowley/)); Boostcamp completion bug ([Play reviews](https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp&hl=en_US)).
- **Rest timers dying in the background on Android** — endemic platform issue; "Don't Kill My App" exists because of it; Stronglifts: "99% of timer issues are device settings"; Samsung worst offender ([HowToGeek](https://www.howtogeek.com/762936/how-to-stop-android-from-killing-background-apps/), [Stronglifts support](https://support.stronglifts.com/article/39-timer), [Fitbod help](https://fitbod.zendesk.com/hc/en-us/articles/360006340194-Rest-Timer)).
- **Online dependence** — Hevy "requires an internet connection for many features", frustrating in basement gyms ([PRPath](https://prpath.app/blog/hevy-app-review-2026.html)).
- **Lost/reset sessions** — Lyfta "resetting workouts unexpectedly" ([Soma](https://trysoma.app/blog/lyfta-app-review/)); Hevy Wear OS "half-completed workouts disappearing" ([RepReturn](https://repreturn.com/hevy-app-review/)); Gravitus "workouts fail to publish" ([AppGrooves](https://appgrooves.com/ios/965383840/gravitus-workout-tracker/gravitus-inc/negative)).
- **Paywalled basics** — export (Strong), supersets (RepCount), history caps (Hevy free), 5-workouts/month (Liftin').
- **Subscription fatigue & billing trust** — Gravitus continued charging after cancellation ([AppGrooves](https://appgrooves.com/ios/965383840/gravitus-workout-tracker/gravitus-inc/negative)); Boostcamp users asking for one-time pricing.

### What users wish existed (gaps no top-10 app fully serves)
1. **A fast logger that also tells you what to do next.** The market is split: speed loggers (Hevy/Strong/Setgraph) give zero guidance; guidance apps (Alpha Progression, Fitbod) are slower or AI-flavoured. "Hevy shows you what you did last time; [it doesn't] tell you what weight to use next" ([Arvo](https://arvo.guru/vs/hevy)).
2. **Fatigue-aware adaptation without a black box.** Lyfta's top criticism: "programs don't adapt based on your performance, your fatigue, or how a session went" ([Soma](https://trysoma.app/blog/lyfta-app-review/)).
3. **Training + nutrition in one app.** Lyfta's MyFitnessPal hand-off friction is called out explicitly ([Soma](https://trysoma.app/blog/lyfta-app-review/)); Reddit-sourced startup-gap analysis flags fitness+nutrition integration as "strong in silos, lacking integration" ([Medium](https://medium.com/@Smyekh/20-untapped-startup-ideas-from-reddit-you-can-build-in-2025-a1fa1fff85f0)).
4. **A rest timer that survives Android battery managers** out of the box, with sane defaults per OEM.
5. **Intelligent mid-session substitution** — only Fitbod approaches this (auto-substitutes by muscle/equipment, learns from swap feedback — [Fitbod blog](https://fitbod.me/blog/recommend-more-less-exclude/), [help centre](https://fitbod.zendesk.com/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod)), and Fitbod is an AI generator, not a fast logger. Nobody ranks substitutes by stimulus-to-fatigue or reacts to joint-discomfort patterns.

---

## 4. Best-in-Class & Common Failure Mode

- **Fastest/cleanest logging:** **Hevy** for the overall package (prefill + one-tap commit + Live Activity on both platforms); **Strong** still edges raw tap count (3 vs 4); **Setgraph/Liftin'** push the frontier with swipe-to-log (~1–2s/set); **RepCount** with voice logging (~2s, hands-free). The practical ceiling is ~2 taps (adjust nothing, confirm prefilled values).
- **Most common failure mode across the category:** **a shipped update or platform quirk that breaks the sacred logging loop** — Jefit's redesign backlash, Boostcamp's completion bug, Hevy's Wear OS disappearing workouts, Lyfta's session resets, Android killing rest timers. Users forgive missing features; they do not forgive a logger that loses a set or adds a tap. Second-order failure: free/paid line drawn through logging fundamentals (export, supersets, history).

---

## 5. Volyume vs Each — Lead / Match / Lag

| App | Volyume leads | Volyume matches | Volyume lags |
|-----|---------------|-----------------|--------------|
| **Hevy** | Deterministic progression targets + overload nudges (Hevy has none); 8 set types incl. myo-reps/cluster (Hevy lacks these); MEV/MAV/MRV volume status; SFR-ranked swap; offline-first (Hevy needs internet); time-crunch mode | Table-as-input idiom; prefill; auto rest timer ±15/skip; plate calc; PR detection; crash recovery; dark design | **Live Activity / lock-screen rest timer with set-commit** (Hevy free, both platforms); social accountability layer; Apple Watch/Wear OS; routine community; brand scale |
| **Strong** | Everything intelligent: progression targets, nudges, volume landmarks, swap engine, session feedback loop; active development | 3-tap logging idiom; prefill; set types; plate calc; auto timer | Lifetime-purchase trust option; 10+ years of brand and accumulated-history lock-in; Apple Watch |
| **Jefit** | Logging speed/cleanliness by a wide margin; no ads; modern dark UI | PR detection; interval-style timers | Longitudinal analytics depth (per-muscle volume over 7d–lifetime); 1,400+ video exercise library |
| **Alpha Progression** | Comparable deterministic recommendations **plus** faster table logging, volume landmarks, safety system, nutrition in one app | In-session next-weight/reps targets; plate calc; equipment-aware substitution | Plan-generator maturity and reputation; "unrivalled customer support" reputation; iOS+Android polish at scale |
| **Boostcamp** | Logging UX, progression engine, offline reliability | RPE/set-type logging | Famous-coach + 10,000 community program library (huge acquisition channel) |
| **Setgraph** | Set types, progression guidance, volume analytics, swap, nutrition | Speed (table-as-input ≈ swipe in practice) | Sub-2-second swipe commit as a headline; ruthless minimalism appeal |
| **RepCount** | Guidance, set types, analytics, nutrition; supersets free | Native-feel Android quality; prefill+tap | Health Connect sync; voice logging; 4.8★ Android social proof |
| **Gravitus** | Android presence (Gravitus is iOS-first), progression intelligence, price trust | Autofill, timers, dark mode, no ads | iOS polish, Apple Watch, community fist-bumps |
| **Lyfta** | Adaptive auto-regulation (their #1 criticism is non-adaptation); session reliability (crash recovery); integrated nutrition | Fast log flow; dark UI | 5,000-exercise animated library with muscle diagrams |
| **Liftin'** | Built-in deterministic progression (vs user-authored rules); Android availability; richer set types | Swipe-fast commit; smart memory prefill | Nothing material beyond iOS-native swipe feel |

**Net read:** Volyume's combination — Strong/Hevy-grade table logging **plus** Alpha-Progression-grade deterministic targets **plus** Fitbod-grade (actually better: SFR-ranked, discomfort-reactive) substitution **plus** RP-style volume landmarks **plus** offline-first — is not offered by any single competitor. Volyume's lags are concentrated in three areas: **lock-screen/wearable surface, social/community layer, and library/program breadth.**

---

## 6. Improvement Opportunities for Volyume (ranked by impact)

1. **Lock-screen rest timer with set-commit (Android Live-Activity equivalent).** Hevy ships ±15s/skip/complete-set on the lock screen, free, both platforms ([Hevy](https://help.hevyapp.com/hc/en-us/articles/35649846517399-How-to-Use-Hevy-s-Live-Activity-on-iOS-and-Android)). Volyume has the sticky notification; extending it to show next-set target and a complete-set action would neutralise Hevy's most visible logging differentiator. *Impact: removes the #1 "Hevy does X" objection in reviews; lifters keep phones locked between sets.*
2. **OEM battery-manager hardening + first-run "timer reliability" check.** Background-killed rest timers are the category's most universal Android complaint (Samsung worst — [HowToGeek](https://www.howtogeek.com/762936/how-to-stop-android-from-killing-background-apps/); Stronglifts attributes 99% of timer tickets to device settings — [Stronglifts](https://support.stronglifts.com/article/39-timer)). Detect aggressive OEMs and guide whitelisting once. *Impact: directly prevents the most common 1-star review trigger for a UK Android-first app.*
3. **Free CSV export of workout history.** Reddit "criticises heavily" apps that paywall export ([Setgraph analysis](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)); Strong paywalls it, Hevy doesn't. Logging is already Volyume-free; export signals data respect and de-risks adoption from Strong/Hevy switchers. *Impact: trust + switcher acquisition; near-zero build cost.*
4. **Importers from Strong/Hevy CSV.** History is the moat that keeps users on stale apps ("switching means losing your history" — [ibid.](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)). A one-tap import converts the competitors' biggest retention asset into Volyume's acquisition channel, and feeds prefill/progression from day one. *Impact: highest-leverage growth feature identified in this audit.*
5. **Guard the logging loop with regression rituals.** The category's defining failure is update-induced logging regressions (Jefit v11.35.3 "user-abusive" backlash — [Jefit Q&A](https://www.jefit.com/q&a/97270376/AJCrowley/); Boostcamp completion bug). Treat taps-to-log-a-set and timer survival as release-gating metrics. *Impact: protects the retention engine; cheap insurance.*
6. **Market the substitution engine loudly.** No top-10 logger offers SFR-ranked, discomfort-reactive swaps; only Fitbod has equipment-based auto-substitution ([Fitbod](https://fitbod.me/blog/recommend-more-less-exclude/)) and it's an AI generator, not a fast logger. This is Volyume's most defensible novel feature — name it, screenshot it, put it in the Play listing. *Impact: differentiation in a crowded "fast logger" message space.*
7. **Surface "what to beat" more aggressively.** The market's articulated dream is prefill + explicit target in one glance ("know exactly what to beat" — [Setgraph](https://setgraph.app/ai-blog/best-workout-tracking-apps)). Volyume has the nudge; consider showing the deterministic target inline in the PREVIOUS column area rather than (or as well as) a transient nudge. *Impact: converts the coaching engine into a visible per-set advantage over Hevy/Strong.*
8. **Voice/one-gesture quick-log path.** RepCount's 2-second voice logging is the only sub-tap input in the field ([RepCount](https://www.repcountapp.com/articles/best-workout-tracker-android)); swipe-commit on a prefilled row (Setgraph/Liftin' idiom) is a cheaper alternative. *Impact: marginal speed, strong demo-ability; lower priority.*
9. **Wear OS companion — but only when it can be reliable.** Hevy's buggy Wear OS app ("half-completed workouts disappearing" — [RepReturn](https://repreturn.com/hevy-app-review/)) shows a bad watch app is worse than none. Long-term gap, not a 2026 priority.
10. **Per-muscle volume history views (Jefit parity).** Jefit's 7d/14d/1m/12m/lifetime muscle-volume views are its one retained strength ([Jefit](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/)). Volyume already computes MEV/MAV/MRV status per session; extending to longitudinal views closes the last analytics gap. *Impact: keeps data-driven lifters from running Jefit alongside.*

---

## Appendix: Source quality note
Direct WebFetch of pages returned HTTP 403 in this environment, so quotes are drawn from search-engine extracts of the cited pages. Several sources are competitor-authored comparison content ([Setgraph](https://setgraph.app/), [Jefit](https://www.jefit.com/wp/), [RepCount](https://www.repcountapp.com/articles/), [Dr Muscle](https://dr-muscle.com/), [Soma](https://trysoma.app/), [Arvo](https://arvo.guru/), [PRPath](https://prpath.app/)) and are flagged **[vendor-biased]** where used; their factual claims about *other* apps' features were cross-checked against at least one independent source (app-store listings, official help docs, or a second reviewer) wherever possible. Direct r/weightroom / r/hevyapp thread quotes could not be retrieved (Reddit not indexed/fetchable from this environment); Reddit sentiment is represented second-hand via sources that aggregate it, and should be re-verified before external publication.
