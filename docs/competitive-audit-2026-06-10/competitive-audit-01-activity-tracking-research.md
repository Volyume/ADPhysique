# Competitive Audit 01 — Steps, Cardio & Activity Tracking in a Training Context

**Date:** 10 June 2026
**Scope:** How the leading apps integrate steps, cardio and broader activity into training/nutrition coaching; user sentiment; integration plumbing on Android; and where Volyume leads, matches or lags.
**Method:** 17+ web searches across vendor docs, store reviews, Reddit/forum digests, the5krunner, BarBend, Android Authority, Kotaku/TechRadar coverage, Cronometer/Whoop/Strava community hubs, and academic literature on concurrent training.

---

## 1. Top 10, Ranked by Quality of Activity↔Training/Nutrition Integration

| # | App | Core mechanism | One-line verdict |
|---|-----|----------------|------------------|
| 1 | **MacroFactor** | Energy-balance expenditure model + opt-in "Step-Informed Updates" modifier | Gold standard for *not* trusting activity kcal while still using step trends |
| 2 | **Garmin Connect** | Training Load / Training Status / Training Readiness / Body Battery | Deepest endurance training-load science; weak for pure strength |
| 3 | **Whoop** | Strain (0–21) + Recovery score; Strength Trainer for muscular load | Best strain↔recovery loop; subscription and lifting-strain gaps |
| 4 | **Oura** | Activity score + Readiness with "Activity Balance" contributor | Best at making *yesterday's activity* inform *today's readiness* |
| 5 | **Fitbit / Google Health** | Steps, Active Zone Minutes, Daily Readiness (Premium) | Mass-market default, currently in severe reputational crisis (May 2026) |
| 6 | **Apple Fitness** | Move/Exercise/Stand rings; works phone-only for steps/Move | Best habit gamification; zero training intelligence |
| 7 | **Strava** | Cardio social graph + new (May 2026) strength logging with muscle maps | Cardio-first; strength integration brand-new and shallow |
| 8 | **Gentler Streak** | Activity Path: readiness-tempered activity guidance | Best "kind" framing of activity vs recovery; iOS-only |
| 9 | **Carbon Diet Coach** | Deliberately ignores daily activity; weekly weight-based check-in | Closest philosophical match to Volyume's coach; *no* activity layer at all |
| 10 | **Cronometer** | Imports wearable exercise kcal into targets (configurable) | Cautionary tale: most flexible, most user confusion |

*Honourable mentions:* **Pacer/StepsApp** (pure pedometers — UX benchmarks for step display), **Athlytic/Training Today** (Apple Watch readiness overlays — benchmark for "readiness as a thin layer over existing training").

---

## 2. Per-App Deep Dives

### 2.1 MacroFactor (rank 1)

**How activity is shown:** Nutrition-first dashboard; steps were added as a customisable dashboard card in the Nov 2025 dashboard release. No cardio "workout feed" — activity is an input to the expenditure narrative, not a destination. A separate **MacroFactor Workouts** strength app launched Jan 2026 ([MacroFactor Monthly, Jan 2026](https://macrofactor.com/mm-jan-2026/)).

**Exercise-calorie philosophy:** The defining position in the market. MacroFactor refuses wearable energy expenditure because devices "under- or over-estimate energy expenditure by at least 10% more than 80% of the time" and claims its food-log+scale-weight model is "about 4–5 times more accurate than wearable devices" ([Drawbacks of Wearables](https://macrofactor.com/wearables/), [Algorithm Accuracy](https://macrofactorapp.com/algorithm-accuracy/)). Crucially, in v5.5.0 (Oct 2025) it added **Expenditure Modifiers → Step-Informed Updates**: step *trends* speed up expenditure adjustments without ever assigning kcal to steps ("does NOT attempt to directly assign an expenditure value to your steps") ([Expenditure Modifiers help article](https://help.macrofactorapp.com/en/articles/274-expenditure-modifiers), [v5.5.0 notes](https://macrofactor.com/version-5-5-0/)).

**Sentiment:**
- *Love:* the expenditure model tracking metabolic adaptation in real time is "the biggest gap… and the main reason people switch from MyFitnessPal" ([Intake Nutrition comparison](https://www.intakenutrition.io/blog/complete-macrofactor-vs-myfitnesspal-comparison-for-reliable-tdee-calculation)).
- *Hate/wish:* no Apple Watch/Wear OS app, no wearable workout import for logging ([NutriScan 2026](https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b)); Health Connect/Apple Health integration is limited to nutrition + weight, with a strict priority order (Manual > Food Log > Health platforms > Fitbit) ([help article](https://help.macrofactorapp.com/en/articles/65-connect-health-connect-apple-health-or-fitbit)).

**Single biggest lesson:** you can use steps as a *confidence signal* on energy expenditure without ever showing users a kcal-from-steps number. This is the most defensible position in the exercise-calorie debate, and it shipped *after* Volyume's NEAT-first design was conceived — the market leader has converged on Volyume's philosophy.

### 2.2 Garmin Connect (rank 2)

**How activity is shown:** Steps, intensity minutes, Body Battery, and acute/chronic Training Load with a 7-day load focus (anaerobic/high-aerobic/low-aerobic) plus Training Status and Training Readiness scores ([Garmin Training Load explained](https://www.shoulditrain.com/blog/garmin-training-load-explained), [Training Readiness factors](https://the5krunner.com/garmin-features/training/training-readiness/)).

**Strength problem:** training load is EPOC/HR-derived, so lifting barely registers; "Body Battery can underestimate fatigue from purely muscular stress (heavy strength training)" and "cannot detect muscular soreness" ([shoulditrain.com](https://www.shoulditrain.com/blog/garmin-body-battery-for-athletes)). Forum consensus: lifters' load numbers don't reflect effort; manual logging is the workaround. No independent validation of the composite readiness score exists.

**Health Connect:** Garmin added native HC read/write support, but users note it arrived late versus competitors ([Garmin support](https://support.garmin.com/en-US/?faq=JToBEy0jfe6pIygark2Ui5), [Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/connect-iq-store-android/339240/let-s-sync-garmin-data-to-health-connect-and-google-fit-apps)).

**Sentiment:** loved for trend reliability ("directional information" rather than absolute precision); criticised for strength blindness and unvalidated scores. Fitbit refugees are reportedly migrating to Garmin after the Google Health debacle ([Kotaku](https://kotaku.com/google-fitbit-app-health-new-update-ai-filled-version-and-everybody-is-mad-2000699806)).

### 2.3 Whoop (rank 3)

**How activity is shown:** everything collapses into daily Strain (0–21, HR-zone-time derived) vs Recovery (HRV/RHR/sleep). Steps were historically de-emphasised (Whoop added a step count only recently in 5.0-era updates). Strength Trainer (from the 2021 PUSH acquisition) applies non-HR motion algorithms for "muscular strain" — the5krunner calls proper strength-strain accounting "a notable omission by WHOOP and all its competitors", while crediting Whoop as the only one even partially solving it ([the5krunner Whoop 5 review](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/), [Whoop Strain explained](https://the5krunner.com/2022/05/24/whoop-strain-everything/)).

**Sentiment:**
- *Love:* the strain↔recovery loop is the most coherent "what should I do today" story in wearables; Whoop 5.0 fixed battery (10–14 days) ([cybernews review](https://cybernews.com/health-tech/whoop-review/)).
- *Hate:* "pure strength training is not metabolically hard" so lifting days look like rest days ([Whoop community thread](https://www.community.whoop.com/t/strength-training-better-strain-metrics/918)); Trustpilot is full of subscription/auto-renewal anger described as "misleading and predatory" ([Trustpilot](https://www.trustpilot.com/review/whoop.com)); wrist HR falters in HIIT; Fellrnr's long-running verdict: "a good idea fatally flawed" ([fellrnr](https://fellrnr.com/wiki/WHOOP)).
- *Wish:* lifters repeatedly ask for strain that reflects bar work, not heart rate.

**API note:** Whoop's developer API is free, OAuth2 + webhooks, exposing recovery/strain/sleep ([developer.whoop.com](https://developer.whoop.com/api/)) — a realistic future Pro integration target for Volyume.

### 2.4 Oura (rank 4)

**How activity is shown:** Activity score with personalised daily goal (steps or active kcal) that **scales down when Readiness is low** — the cleanest example of activity targets responding to recovery. Readiness includes "Activity Balance" and "Previous Day Activity" contributors ([Oura Activity Score](https://support.ouraring.com/hc/en-us/articles/360025577993-Activity-Score), [Oura activity updates](https://ouraring.com/blog/activity-improvements/)). 2025 step-count rework (ML pedometer model) deliberately *cut* average reported steps ~20% to be honest rather than flattering.

**Sentiment:** BarBend and others flag that a ring can't be worn while gripping a bar — "serious weight lifters may not get the full value" ([BarBend review](https://barbend.com/oura-ring-review/)); loved for automatic activity detection and recovery insight; not a training tool.

### 2.5 Fitbit / Google Health (rank 5)

**Status as of May–June 2026: crisis.** Google replaced the Fitbit app with "Google Health"; coverage describes the replacement as "unbelievably bad", buggy, AI-stuffed, with inaccurate sleep/workout tracking, food-tracker regressions and lost data; long-time users say they are switching to Garmin ([Kotaku](https://kotaku.com/google-fitbit-app-health-new-update-ai-filled-version-and-everybody-is-mad-2000699806), [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/google-health-is-getting-heat-for-being-unbelievably-bad-after-replacing-the-fitbit-app-but-google-says-fixes-are-coming), [9to5Google roadmap](https://9to5google.com/2026/05/27/google-health-roadmap-fitbit-backlash/)).

**Lesson:** steps/activity tracking is a trust product. Breaking continuity of a daily metric (steps, streaks, history) generates more fury than almost any other app change. Volyume's offline-first local source of truth is precisely the right insurance against this failure class.

### 2.6 Apple Fitness (rank 6)

Move/Exercise/Stand rings; phone-only users get steps + Move estimate but cannot close all rings ([iPhone Life](https://www.iphonelife.com/content/how-to-use-apple-fitness-app-ios-16), [igeeksblog](https://www.igeeksblog.com/how-to-use-fitness-app-on-iphone/)). The closure-psychology gamification is best-in-class ([Trophy analysis](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings)), but criticism is consistent: rings shame rest days — "users felt as though they were doing something wrong on their rest days" ([Michigan Daily](https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/), [MacRumors thread](https://forums.macrumors.com/threads/the-apple-watch-activity-rings-are-pointless.2459892/)). No interplay with training programming whatsoever. (iOS-only; not a direct Android competitor but defines user expectations.)

### 2.7 Strava (rank 7)

Historically cardio-only; lifting appeared as a generic "Workout" blob, which lifters resented ([Motion](https://motion-app.com/strava-for-strength-training/)). **21 May 2026:** Strava shipped a purpose-built strength log (sets/reps/weight, volume progression, "muscle maps") ([the5krunner](https://the5krunner.com/2026/05/21/strava-strength-training/), [GymLog](https://gymlog.eu/en/blog/strava-strength-training-features-2026)). Early verdict: fine for casual lifters, "someone running a structured progressive overload program will quickly hit the ceiling"; known bug saves Weight Training as "Workout" ([Strava community hub](https://communityhub.strava.com/strava-features-chat-5/known-issue-weight-training-being-saved-as-workout-10942)). Direction of travel matters: the biggest cardio platform is moving *toward* training; Volyume is moving from training *toward* cardio — the contested middle is exactly Volyume's territory.

### 2.8 Gentler Streak (rank 8)

Apple Design Award winner. "Activity Path" shows whether you're under-, well-, or over-trained and *adjusts what it asks of you daily*; tone is deliberately non-punitive ([gentler.app](https://gentler.app/), [docs](https://docs.gentler.app/understanding-your-activity-path/interpret-the-activity-path), [justuseapp reviews](https://justuseapp.com/en/app/1576857102/gentler-streak-workout-tracker/reviews)). Users love the friendly framing; criticisms are minor (widgets, manual intensity tweaks). iOS-only. **Lesson for Volyume:** its readiness-tempered activity guidance and compassionate copy is the strongest stylistic match for an app that also runs an ED safety system.

### 2.9 Carbon Diet Coach (rank 9)

Deliberately does **not** connect to trackers or adjust for daily activity: "a long hike or extra gym session does not change your daily targets"; adjustments happen only at the weekly weight/adherence check-in ([NutriScan review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07)). Users accept this trade ("it adjusts with your weight every week as needed") but reviewers consistently list "no activity awareness" as a gap. Carbon proves the weekly deterministic check-in model works commercially — and that Volyume's step targets + cardio dosing already exceed Carbon's activity story.

### 2.10 Cronometer (rank 10)

Imports wearable "calories burned" and can add exercise kcal to targets; requires users to self-configure activity level ("None" if wearing a device all day, "Sedentary" if only during exercise) to avoid double counting ([Cronometer forums](https://forums.cronometer.com/discussion/2430/am-i-double-logging-my-calories-burned)). This is the canonical example of pushing the exercise-calorie problem onto the user. Same failure family as MyFitnessPal, where "eat back exercise calories" remains a perennial confusion: MFP goals assume you eat them back, double counting is rampant when activity level already includes exercise, and the default is add-back ([MFP community](https://community.myfitnesspal.com/en/discussion/10708894/do-i-eat-back-exercise-calories), [MFP blog](https://blog.myfitnesspal.com/ask-the-dietitian-should-i-eat-back-my-exercise-calories/)).

### Honourable mentions

- **Pacer / StepsApp:** Pacer 4.5★+ but ad-heavy with mode-dependent accuracy (battery-saver vs hardware step counter) ([Pacer FAQ](http://www.pacer.cc/faq/android/), [OutdoorGearLab](https://www.outdoorgearlab.com/reviews/fitness/pedometer/pacer)); StepsApp 4.6★/200k reviews, praised for design, dinged for Samsung Health import failures and reinstall data loss ([androidauthority](https://www.androidauthority.com/best-pedometer-apps-step-counter-apps-for-android-852651/)). Benchmark: a step product lives or dies on *continuity and trustworthiness of the number*, not features.
- **Athlytic / Training Today:** thin readiness layers over Apple Health. Athlytic praised for "readiness in under 10 seconds" and 60-day personal baselines ([Cora comparison](https://www.corahealth.app/compare/athlytic)); Training Today criticised for rest recommendations contradicting how users feel — "better off just seeing how you feel" ([App Store reviews](https://apps.apple.com/us/app/training-today/id1507992127)). Lesson: a readiness score that contradicts felt experience without explanation destroys trust.

---

## 3. The Exercise-Calorie Question — Market Map

Three camps:

1. **Add-back (MFP default, Cronometer, Apple-ecosystem apps):** intuitive, but produces chronic double counting, inflated machine/wearable kcal, and the single most-asked confused question in consumer nutrition ("do I eat back my exercise calories?"). Wearable kcal error ≥10% in >80% of cases ([MacroFactor wearables analysis](https://macrofactor.com/wearables/); systematic review: [PMC7509623](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7509623/)).
2. **Ignore daily, adjust weekly from outcomes (Carbon, MacroFactor, Volyume):** more accurate, but users *feel* unrewarded for activity ("I walked 18k steps and the app didn't care"). MacroFactor's Step-Informed Updates is the state-of-the-art compromise: steps influence *confidence and speed* of expenditure adjustment, never a direct kcal credit.
3. **Activity-as-physiology (Whoop, Oura, Garmin, Gentler Streak):** activity feeds recovery/readiness, not calories. Users like the "should I push today?" answer; lifters dislike HR-centric models that miss muscular fatigue.

**Volyume already sits in camps 2 and 3 simultaneously** (MET kcal as feedback-only; cardio recovery load into readiness; coach doses cardio only on stalled cuts). No competitor occupies both cleanly. This is a genuine structural advantage worth marketing explicitly.

## 4. Do Lifters Even Want Steps/Cardio in a Training App?

- Evidence-based coaching culture says yes for steps: NEAT is "one of the most powerful tools we can control" with a bigger TDEE impact than formal exercise; step targets are standard in fat-loss coaching ([RippedBody](https://rippedbody.com/step-tracking/)).
- Lifter app culture says: keep it out of the way. Reddit consensus on workout trackers prizes "speed, simplicity… without getting in the way"; social features and dashboards are dismissed as bloat; "if it takes more than 30 seconds to log a set, the app is too slow" ([Setgraph Reddit round-ups](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)).
- Zone 2 conditioning for lifters is a sustained 2024–2026 trend (2–3×20–30 min/week prescriptions everywhere: [Jefit](https://www.jefit.com/wp/exercise-tips/is-zone-2-training-the-secret-weapon-for-strength-gains/), [Transparent Labs](https://www.transparentlabs.com/blogs/all/zone-2-cardio)). Interference-effect research supports exactly what users ask for: cycling > running for interference, 30–40 min bouts, ≥3 h separation from lifting, ~1 h/week aerobic minimum to avoid hypertrophy interference ([PMC11688070](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11688070/), [PMC9474354](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474354/)).

**Synthesis:** lifters want activity data *with an opinion attached* (does this hurt my gains? should I rest?), displayed quietly. They reject activity data presented as engagement filler. Volyume's "quiet readiness surfacing at high load" is the right instinct; the gap is the *opinion layer* (modality/timing guidance).

## 5. Integration Plumbing on Android — Reality Check

- **Health Connect** is the strategic standard but sentiment is rough: "momentary, local, on-device link" not a store ([Android Authority](https://www.androidauthority.com/android-health-connect-useless-3542514/)); Samsung Health step export blocked; Withings step sync broke for weeks in Aug 2025 ([Withings support](https://support.withings.com/hc/en-us/community/posts/24925039482641)); challenge platforms maintain entire troubleshooting guides ([Count.It](https://help.count.it/en/articles/11421253-troubleshooting-android-health-connect-sync-issues)). Background reads need the extra `READ_HEALTH_DATA_IN_BACKGROUND` permission, have stricter rate limits, and change-tokens are mandatory practice for battery ([Android Developers](https://developer.android.com/health-and-fitness/health-connect/read-data), [rate limiting](https://developer.android.com/health-and-fitness/health-connect/rate-limiting)).
- **Phone pedometer:** screen-off sensor down-sampling can drop steps; pocket placement undercounts; yet in at least one controlled test a Galaxy S22+ in-pocket beat Samsung's flagship watch on accuracy ([Android Central](https://www.androidcentral.com/wearables/step-counting-accuracy-test)). Phone-first steps are defensible — the killer complaint is *discrepancy* when users compare against a watch ([Pacer help on differing counts](https://support.mypacer.com/hc/en-us/articles/360035306552-Differing-Step-Counts-Pacer-and-Wearable)).
- **Direct SDKs:** Whoop API free (OAuth2/webhooks); Garmin requires legal-entity approval into its Developer Program; both feasible for a Pro tier later ([developer.whoop.com](https://developer.whoop.com/api/), [Garmin Developer Program](https://developer.garmin.com/gc-developer-program/activity-api/)).
- **Battery/permission friction:** pedometer apps that hold foreground services attract battery complaints (Pacer ships explicit battery-saving modes); Health Connect's permission screens confuse users (read vs write toggles per data type, per Garmin's own setup guide).

## 6. Best-in-Class Single Implementation

**MacroFactor's Step-Informed Updates expenditure modifier** (v5.5.0, Oct 2025). It threads the needle that has defeated everyone else: steps visibly matter to your targets (user feels seen), no kcal is ever attributed to activity (no double counting, no gaming, no inflated wearable error imported), it's opt-in, and the vendor published a full methodological explainer ([macrofactor.com/expenditure-modifiers](https://macrofactor.com/expenditure-modifiers/)). Runner-up: **Oura's readiness-scaled daily activity goal** — the cleanest closed loop from recovery state to today's activity target.

## 7. Most Common Failure Mode

**Importing or displaying activity calories as currency.** Every major complaint cluster traces back to it: MFP's eat-back confusion, Cronometer's double-count forum threads, wearable kcal error (≥10% off >80% of the time), HR-based strain that erases lifting, and rings that shame rest days. Second-place failure: **breaking the continuity/trust of the step number** (Google Health 2026 backlash; Health Connect sync black holes; watch-vs-phone discrepancies). Third: **readiness scores that contradict felt experience without explanation** (Training Today).

## 8. Volyume vs Each — Lead / Match / Lag

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **MacroFactor** | Coach *doses* cardio on stalled cuts (MF never prescribes activity); steps target set by coach, not just observed; integrated training+nutrition in one app | Feedback-only kcal philosophy; steps as coaching signal | MF's expenditure model is validated and published; step-informed *expenditure* maths; food database depth; brand authority via Stronger by Science |
| **Garmin Connect** | Deterministic, explainable coaching; strength-first load understanding (lifting volume is first-class, not invisible) | Cardio recovery load concept (decayed sum ≈ acute load) | HR-zone data, intensity minutes, VO2max trends, device ecosystem, automatic activity detection |
| **Whoop** | No subscription-hardware lock-in; lifting fatigue not erased by HR-centric model; calorie floors/safety | Readiness card ≈ recovery score (simpler) | Sleep/HRV physiological inputs; continuous strain; the "single score" daily ritual; Strength Trainer's muscular-strain modelling |
| **Oura** | Training specificity; activity targets tied to a *diet phase*, not generic health | Activity-informed readiness | Readiness-scaled daily step goal (Oura lowers the bar on bad days — Volyume's weekly target is static within the week); automatic detection; temperature/illness signals |
| **Fitbit/Google Health** | Trust/continuity (offline-first local truth); no AI slop; EU residency, no PII leakage | Steps as a daily headline number | Social challenges, hourly move prompts, huge historic-data network effects (currently self-immolating) |
| **Apple Fitness** | Rest-day-aware coaching (no streak shaming); training intelligence | Simple daily activity visibility | Gamification polish, closure psychology, ecosystem ubiquity |
| **Strava** | Structured progressive-overload logging depth; coach interplay between cardio and the plan | Cardio logging with duration/intensity | Social motivation layer; GPS/route products; 36-activity library vs Strava's sport breadth; segment/community pull |
| **Gentler Streak** | Deterministic coach + nutrition; Android availability | Compassionate, quiet, anti-shame surfacing of load | Daily readiness-adjusted activity guidance with beautiful trend visualisation ("Activity Path"); tone-of-voice craft in copy |
| **Carbon Diet Coach** | Entire activity layer (steps targets, cardio library, recovery load) — Carbon has none; cardio dosing on stalls | Weekly deterministic check-in adjustments | Nothing material — Carbon lags Volyume across this audit's scope |
| **Cronometer** | Coherent no-add-back philosophy (Cronometer makes the user solve double counting) | MET-based kcal estimates as information | Micronutrient depth; breadth of device imports for users who *want* them |

**Net position:** Volyume's architecture (NEAT-first step targets from a deterministic coach, feedback-only cardio kcal, stall-triggered cardio dosing, quiet recovery-load surfacing) is *philosophically ahead of 8 of 10 competitors* and matches the market leader's direction. The lags are concentrated in three places: (1) no physiological inputs at all (HR/HRV/sleep) pending wearable work, (2) static rather than readiness-responsive step targets, and (3) no published/explained methodology to win the credibility war MacroFactor wins by default.

---

## 9. Improvement Opportunities for Volyume (5–10, with impact rationale)

1. **Step-trend-informed coaching confidence (MacroFactor-style), not step kcal.** When weekly step average shifts materially vs baseline, let the deterministic coach weight its weekly calorie/cardio adjustment faster or flag "your activity dropped — this week's stall may be NEAT, not metabolism". Impact: directly answers the #1 user complaint about outcome-only coaches ("I was more active and the app didn't care") while staying deterministic and add-back-free. This is the market leader's newest flagship feature, achievable with data Volyume already collects.
2. **Interference-aware cardio dosing copy.** When the coach doses cardio on a stalled cut, encode the published heuristics: prefer low-impact modalities (cycling over running where available), suggest 30–40 min bouts, recommend ≥3 h separation from lifting or non-lifting days, cap added formal cardio before steps are exhausted. Impact: converts a calorie lever into visible training intelligence; no competitor's coach states *why this cardio won't eat your gains* — strongest differentiation for the lifting audience, and it's pure deterministic rules.
3. **Readiness-responsive step target floor (Oura/Gentler Streak pattern).** On days the readiness card shows high cardio recovery load, soften the step message ("target stands for the week; today, don't chase it") rather than showing a red miss. Impact: removes the rest-day shaming failure mode that generates Apple-rings-style resentment, and aligns with the safety system's ethos. Low effort: copy + display logic, not new data.
4. **Step-number trust features: discrepancy explainer + source badge.** Show where today's steps came from (pedometer vs Health Connect, last sync time) and a one-tap "why does this differ from my watch?" explainer. Impact: discrepancy and silent sync failure are the top sentiment killers for step products on Android (Withings/Samsung/Health Connect threads); pre-empting them protects review scores cheaply.
5. **Publish the methodology.** A public "How Volyume handles activity calories" page mirroring MacroFactor's wearables essay (why MET kcal are feedback-only, why no add-back, why steps are the first lever). Impact: MacroFactor demonstrates that the explainer *is* the moat — it converts sceptical evidence-based lifters and arms users against the eat-back confusion they bring from MFP. Zero app code.
6. **"Cardio this week" → weekly interference budget.** Extend the Plans card to show dosed cardio against a weekly cap with lifting-day collision warnings (e.g. cardio logged <3 h around a leg session gets a gentle note). Impact: makes the Plans surface answer the question lifters actually ask ("is my cardio hurting my training?"), using existing logs.
7. **Wearable strategy: Health Connect read-only first, Whoop API later, manage expectations now.** When wearable integration ships for Pro, import HR/workout sessions via Health Connect with change-tokens + WorkManager (battery-safe), treat imported kcal as display-only, and *never* let wearable expenditure touch targets. Whoop's free OAuth API is the best direct integration candidate; Garmin requires legal-entity programme approval — start that application early. Impact: avoids inheriting the double-count failure mode on day one of the Pro promise; Garmin lead time is months.
8. **Zone-2 / conditioning block as a Pro plan feature (user-led, coach-framed).** Offer an optional "conditioning block" template (2–3 × 20–30 min low-intensity sessions/week, scheduled away from priority lifts) that feeds the existing recovery-load model. Impact: rides the sustained Zone 2 trend among lifters; Strava's pivot shows demand for hybrid training surfaces; deterministic and library-based, no AI needed.
9. **Steps continuity insurance.** Guarantee step history continuity across reinstall/device migration (local DB export within existing sync layer) and surface "X-day step history protected" in settings. Impact: Google Health's 2026 backlash and StepsApp's reinstall data-loss complaints show history loss is a churn event; offline-first architecture makes this a cheap, marketable win.
10. **Quiet weekly NEAT report, not a daily dashboard.** A single line in the weekly check-in: steps vs target, trend vs last 4 weeks, and what the coach did about it. Impact: satisfies lifters' "no clutter" demand (Reddit consensus) while making the NEAT-first philosophy legible — the data shows users tolerate activity surfaces only when they carry a coaching opinion.

---

## 10. Source Index (primary citations)

- MacroFactor: [wearables drawbacks](https://macrofactor.com/wearables/) · [algorithm accuracy](https://macrofactorapp.com/algorithm-accuracy/) · [expenditure modifiers](https://macrofactor.com/expenditure-modifiers/) · [help: step-informed updates](https://help.macrofactorapp.com/en/articles/274-expenditure-modifiers) · [help: wearable EE](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker) · [Jan 2026 monthly (Workouts launch)](https://macrofactor.com/mm-jan-2026/)
- MFP eat-back: [community thread](https://community.myfitnesspal.com/en/discussion/10708894/do-i-eat-back-exercise-calories) · [MFP dietitian blog](https://blog.myfitnesspal.com/ask-the-dietitian-should-i-eat-back-my-exercise-calories/) · [Intake Nutrition comparison](https://www.intakenutrition.io/blog/complete-macrofactor-vs-myfitnesspal-comparison-for-reliable-tdee-calculation)
- Whoop: [the5krunner Whoop 5 review](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/) · [strain explainer](https://the5krunner.com/2022/05/24/whoop-strain-everything/) · [community: strength strain](https://www.community.whoop.com/t/strength-training-better-strain-metrics/918) · [Trustpilot](https://www.trustpilot.com/review/whoop.com) · [fellrnr critique](https://fellrnr.com/wiki/WHOOP) · [developer API](https://developer.whoop.com/api/)
- Garmin: [training load](https://www.shoulditrain.com/blog/garmin-training-load-explained) · [body battery for athletes](https://www.shoulditrain.com/blog/garmin-body-battery-for-athletes) · [training readiness](https://the5krunner.com/garmin-features/training/training-readiness/) · [Health Connect support](https://support.garmin.com/en-US/?faq=JToBEy0jfe6pIygark2Ui5) · [developer programme](https://developer.garmin.com/gc-developer-program/activity-api/)
- Oura: [BarBend review](https://barbend.com/oura-ring-review/) · [activity score](https://support.ouraring.com/hc/en-us/articles/360025577993-Activity-Score) · [activity improvements](https://ouraring.com/blog/activity-improvements/)
- Fitbit/Google Health crisis: [Kotaku](https://kotaku.com/google-fitbit-app-health-new-update-ai-filled-version-and-everybody-is-mad-2000699806) · [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/google-health-is-getting-heat-for-being-unbelievably-bad-after-replacing-the-fitbit-app-but-google-says-fixes-are-coming) · [9to5Google](https://9to5google.com/2026/05/27/google-health-roadmap-fitbit-backlash/)
- Apple rings criticism: [Michigan Daily](https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/) · [Trophy psychology](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings) · [MacRumors](https://forums.macrumors.com/threads/the-apple-watch-activity-rings-are-pointless.2459892/) · [phone-only Fitness](https://www.iphonelife.com/content/how-to-use-the-apple-fitness-app-ios-16)
- Strava strength: [the5krunner](https://the5krunner.com/2026/05/21/strava-strength-training/) · [GymLog](https://gymlog.eu/en/blog/strava-strength-training-features-2026) · [Motion](https://motion-app.com/strava-for-strength-training/) · [known issue thread](https://communityhub.strava.com/strava-features-chat-5/known-issue-weight-training-being-saved-as-workout-10942)
- Gentler Streak: [gentler.app](https://gentler.app/) · [activity path docs](https://docs.gentler.app/understanding-your-activity-path/interpret-the-activity-path) · [justuseapp reviews](https://justuseapp.com/en/app/1576857102/gentler-streak-workout-tracker/reviews)
- Carbon: [NutriScan review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07)
- Cronometer: [double-logging forum thread](https://forums.cronometer.com/discussion/2430/am-i-double-logging-my-calories-burned)
- Health Connect sentiment/dev: [Android Authority critique](https://www.androidauthority.com/android-health-connect-useless-3542514/) · [Withings sync thread](https://support.withings.com/hc/en-us/community/posts/24925039482641-Steps-Activity-Sync-Terrible-Since-Switch-to-Health-Connect) · [background reads](https://developer.android.com/health-and-fitness/health-connect/read-data) · [rate limiting](https://developer.android.com/health-and-fitness/health-connect/rate-limiting) · [historical/background reads news](https://www.androidauthority.com/health-connect-historical-background-reads-3443726/)
- Pedometers: [Pacer FAQ/battery modes](http://www.pacer.cc/faq/android/) · [OutdoorGearLab Pacer](https://www.outdoorgearlab.com/reviews/fitness/pedometer/pacer) · [Android Central step accuracy test](https://www.androidcentral.com/wearables/step-counting-accuracy-test) · [Android Authority pedometer round-up](https://www.androidauthority.com/best-pedometer-apps-step-counter-apps-for-android-852651/)
- Readiness overlays: [Cora on Athlytic](https://www.corahealth.app/compare/athlytic) · [Training Today App Store](https://apps.apple.com/us/app/training-today/id1507992127)
- NEAT/steps coaching: [RippedBody step tracking](https://rippedbody.com/step-tracking/)
- Interference effect: [PMC11688070](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11688070/) · [PMC9474354](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474354/) · [PMC5752732](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5752732/)
- Lifter app sentiment: [Setgraph Reddit round-ups](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)
- Wearable EE accuracy: [PMC7509623 systematic review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7509623/)
