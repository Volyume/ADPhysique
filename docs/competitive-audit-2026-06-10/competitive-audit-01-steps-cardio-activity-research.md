# Competitive Audit 01 — Steps, Cardio & Activity Tracking in a Training Context

**Agent 14 of 14 · 10 June 2026 · Research-only (no code changes)**
Baseline reference: [Volyume baseline §3.6](./competitive-audit-00-volyume-baseline.md)

Volyume's current model: silent deduplicated aggregator step reads (HealthKit /
Health Connect), an understated self-hiding StepsCard on Train, phase-banded
coach step targets with "hit your current target before we raise it" logic,
user-led cardio logging whose kcal estimate is deliberately **never** added to
food targets (the energy-balance model owns it via weight trend), and coach
cardio prescriptions only when the steps lever is maxed during a cut.

---

## 1. Ranked top 10 — apps that best integrate broader activity into a training context

Ranked by evidence quality and depth of integration (does activity actually
*inform* training or nutrition decisions, not just get displayed).

| # | App | What it does with activity | Verdict |
|---|-----|---------------------------|---------|
| 1 | **MacroFactor** | Trend-based expenditure from food + weight; optional "Step-Informed Updates" modifier; watchOS app; new Workouts app | Best-in-class philosophy, now selectively re-admitting step data |
| 2 | **Whoop** | Strength Trainer adds wrist-derived muscular load to Strain; Recovery gates training | Most ambitious lifting↔activity fusion; no nutrition loop |
| 3 | **Garmin Connect** | Training Load/Status, Strength Coach plans, Strength Balance Score, strength PRs | Deepest endurance model now reaching lifters; cardio-biased history |
| 4 | **Fitbod** | Apple Health activities decrement per-muscle recovery → next workout changes | The clearest "activity adjusts TRAINING" example |
| 5 | **Carbon (Diet Coach)** | Activity baked into weekly check-in adjustments; no live wearable burn | Volyume's closest philosophical sibling on the nutrition side |
| 6 | **RP Diet Coach** | Step *bands* (e.g. 7–14k) + workout difficulty drive macros; cardio under 1 h deliberately not counted | Coarse but deliberate; closest to Volyume's banded-steps idea |
| 7 | **Hevy / Strong** | Best-in-class watch set logging; HealthKit write-out; activity display-only | Sets the watch-app expectation bar |
| 8 | **Apple Fitness / HealthKit** | Rings + source-priority dedupe platform | The plumbing everyone depends on; rings measure cardio twice, strength never |
| 9 | **Cronometer** | Syncs everything; community at war over eat-back; toggle only recently promised | Integration-rich, philosophy-poor |
| 10 | **Withings / Renpho ecosystems** | Weight/steps data layer, 100+ partner apps | Pure data plumbing; also a documented duplication source |

MyFitnessPal is excluded from the ranking (it integrates activity *worst*) but
is the central case study in §3 because its eat-back model generates the
largest body of user-confusion evidence in the category.

---

## 2. Per-app findings

### 2.1 MacroFactor — rank 1

- **Core stance:** wearable calorie burns are not used. "MacroFactor doesn't
  need energy expenditure data from wearable devices in order to accurately
  calculate energy expenditure, as weight and nutrition data are fully
  sufficient" — [MacroFactor help centre](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker).
  Their essay on wearables argues exercise-burn estimation "can be off by 50%
  or more" ([The Drawbacks of Using Wearable Devices to Inform Nutrition Targets](https://macrofactor.com/wearables/)).
- **The 2025 evolution (most important finding in this audit):** v5.5.0 added
  optional **Expenditure Modifiers**, including **Step-Informed Updates**:
  "This modifier uses step trends to speed up expenditure updates during
  periods where the step data improves confidence… Importantly, MacroFactor
  does NOT attempt to directly assign an expenditure value to your steps or
  activity" ([Expenditure Modifiers help article](https://help.macrofactorapp.com/en/articles/274-expenditure-modifiers),
  [examination essay](https://macrofactor.com/expenditure-modifiers/),
  [v5.5.0 notes](https://macrofactor.com/version-5-5-0/)). Claimed gain:
  ~6–8 % better month-to-month accuracy, ~20 % over longer windows. Steps are
  used as a *confidence/velocity signal* on the trend model — never as kcal.
  This validates Volyume's architecture while showing the next step beyond it.
- **Acknowledged limitation:** the model is "back-looking and follows trends…
  it won't by default know to recommend higher calorie intake for upcoming
  events like a marathon until after the fact" ([MacroFactor wearables essay](https://macrofactor.com/wearables/)).
- **Surface area:** dedicated expenditure trend chart (not a steps card);
  steps shown as a contextual trend input. A [watchOS app](https://macrofactor.com/apple-watch/)
  (Sept 2025) surfaces calories/macros and a scrollable food timeline at the
  wrist, and a separate [MacroFactor Workouts app](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524)
  (Oct–Nov 2025 betas) is closing the training loop
  ([MacroFactor Monthly, Oct 2025](https://macrofactor.com/mm-oct-2025/),
  [Nov 2025](https://macrofactor.com/mm-nov-2025/)).

### 2.2 Whoop — rank 2

- **Strength Trainer** estimates musculoskeletal load from wrist motion and
  adds it to Strain, so lifting finally moves the recovery model:
  "sessions that once looked lighter because they relied mostly on heart-rate
  data can now produce a higher Activity Strain" — [the5krunner](https://the5krunner.com/2026/02/28/new-whoop-strength-trainer-update/);
  Whoop's own R&D claims muscular load showed **97 % test–retest correlation**
  vs 85 % for RPE ([Whoop Locker](https://www.whoop.com/us/en/thelocker/the-research-and-development-behind-strength-trainer/)).
- **Sentiment:** strongly positive direction — one user: workouts that
  "tracked with 6.0–9.0 strain are now 12.0+, and the score finally reflects
  how they feel" ([the5krunner](https://the5krunner.com/2026/02/28/new-whoop-strength-trainer-update/)).
  Persistent gripes: "It misses reps on slow negatives or paused reps",
  "Sometimes logs a bicep curl as a shoulder press" (same source). The
  underlying complaint Whoop is fixing is the classic one: HR-based strain
  "isn't capturing all of the ways you might move or tire your body" during
  lifting ([Strain explained](https://blog.melissau.com/p/whoop-strain-score-explained)).
- **Lesson:** the historic resentment was *cardio-biased scoring of lifting*,
  not activity tracking per se. Lifters wanted credit, and rewarded the
  product that gave it.

### 2.3 Garmin Connect — rank 3

- Training Load/Status is the most mature load model, but it is built on
  recorded cardio + VO₂max; "unrecorded activities — strength training, yoga,
  active commuting — contribute physical stress without contributing load
  data", producing the infamous **Unproductive** status for hard-training
  lifters ([RunToTheFinish](https://runtothefinish.com/training-load/),
  [Medium: How I "beat" the Unproductive status](https://medium.com/the-hybrid-athlete/how-i-beat-the-unproductive-garmin-training-status-284a6077e340),
  [Garmin training status guide](https://the5krunner.com/garmin-features/training/training-status/)).
- Garmin is correcting hard: strength activity up **29 % in 2025**, the fourth
  consecutive year above 20 % ([Garmin 2025 Connect data report](https://www.garmin.com/en-US/blog/general/2025-garmin-connect-data-report/));
  Connect+ Live Activity for in-session rep editing, Strength Coach plans,
  strength PRs (Q1 2026), and a Strength Balance Score flagging push/pull
  imbalances ([the5krunner survey of Garmin strength features](https://the5krunner.com/2026/04/02/garmin-strength-training-features-survey/),
  [Connect+ expansion: "bad news for strength apps"](https://the5krunner.com/2026/03/24/garmin-connect-plus-strength-apps/)).
- **Lesson:** the biggest wearable ecosystem judged its own cardio-centric
  load model inadequate for lifters and is rebuilding around strength.

### 2.4 Fitbod — rank 4

- Apple Health activities **automatically update per-muscle recovery**, which
  changes the next generated workout: "Connecting third-party integrations
  like Apple Health… automatically updates your muscle recovery from other
  activities" ([Fitbod help centre](https://fitbod.zendesk.com/hc/en-us/articles/360047357794-Apple-Health),
  [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/)).
- Friction: unsupported activity types (pickleball, basketball, yoga, HIIT)
  "won't be read by Fitbod's algorithm" and require manual fatigue adjustment
  (same help article). Sentiment on the recovery heat-map is positive —
  "really helped users visualize when to push and when to recover"
  ([Autonomous review](https://www.autonomous.ai/ourblog/fitbod-app-review)).
- **Lesson:** this is the only mainstream answer to "activity should adjust
  TRAINING, not food" — and users like it when it is legible (a muscle
  heat-map), not a black box.

### 2.5 Carbon — rank 5

- Activity enters at goal setup (lifestyle vs exercise activity) and is then
  absorbed by weekly check-in adjustments: "after a couple of check-ins,
  Carbon will adjust your calories to be precisely where you need them…
  regardless of which exercise setting you initially choose"
  ([Carbon help](https://help.joincarbon.com/en/articles/6004568-understanding-lifestyle-and-exercise-activity),
  [FeastGood review](https://feastgood.com/carbon-diet-coach-review/)).
  No live wearable-burn dependency; users can manually schedule ±200 kcal
  days around big sessions.
- **Lesson:** same energy-balance ownership as Volyume, but coarser — no step
  data at all, so it converges more slowly when NEAT shifts.

### 2.6 RP Diet Coach — rank 6

- Steps are captured as **bands** (below 7k / 7–14k / 14–21k / 21k+) and feed
  the macro prescription — "if you take more steps, the app will allow you to
  eat more carbs" ([FeastGood RP review](https://feastgood.com/rp-diet-app-reviews/)).
- Deliberately refuses to treat most cardio as training: "RP doesn't count
  cardio sessions under an hour as workouts", with performance-cardio
  exceptions ([FeastGood](https://feastgood.com/rp-diet-app-reviews/),
  [RP Diet Coach page](https://rpstrength.com/pages/diet-coach-app)).
- **Lesson:** the only other app with banded steps tied to a coach — but
  static self-reported bands, not wearable-read and not phase-progressive.
  Volyume's automatic, phase-banded targets are a generation ahead.

### 2.7 Hevy / Strong — rank 7 (watch-app benchmark)

- Strong's watch app: "one of the cleanest, most friction-free logging
  experiences available — start a routine on your Watch… tap to log sets"
  ([Cora review of Strong](https://www.corahealth.app/compare/strong),
  [strong.app/love](https://www.strong.app/love)). Hevy: 10 M+ users,
  watchOS and Wear OS apps, ~$800K MRR with no ads
  ([App Store](https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350),
  [LinkedIn](https://www.linkedin.com/posts/vasyl-sergienko_800k-mrr-without-spending-a-dime-on-ads-activity-7426565528221122560-bU9p)).
- Neither *does* anything with steps/cardio beyond HealthKit write-out:
  reviewers now distinguish "an app that supports Apple Watch for set logging
  (Strong, Hevy)… from an app that actually uses Apple Watch health data to
  adapt your training" ([Cora Reddit meta-analysis, 200+ threads](https://www.corahealth.app/blog/best-workout-tracker-reddit)).
- The same analysis found logging speed is "the single most common reason
  people switch apps", with "too many taps to log a set" the top complaint.

### 2.8 Apple Fitness / HealthKit — rank 8

- The rings are structurally cardio-biased: "Both the Exercise and Move rings
  essentially measure the same thing: cardio… There is one important ring
  missing: Strength" ([Cult of Mac](https://store.cultofmac.com/blogs/learn-about-your-apple-watch/strength-is-the-missing-activity-ring-here-s-how-you-can-close-it)).
- As a platform, HealthKit's source-priority model does dedupe phone+watch
  steps — but edge cases bite: when a watch battery dies, phone-recorded
  steps "don't count as steps, exercise or anything" in Activity
  ([Apple Communities](https://discussions.apple.com/thread/254639427),
  [steps not syncing thread](https://discussions.apple.com/thread/252716735)).

### 2.9 Cronometer — rank 9

- The community has spent years asking for what Volyume ships by default. A
  forum member: professionals "don't encourage syncing activity calories
  because they're often over-estimated and it teaches people to eat in
  response to activity"; others counter that not syncing "defeats the purpose
  for people who like to track their workouts" and ask for "a feature to not
  count calories towards your goal"
  ([Exercise Calories thread](https://forums.cronometer.com/discussion/2139/exercise-calories),
  [should i eat back exercise calories?](https://forums.cronometer.com/discussion/3272/should-i-eat-back-exercise-calories),
  [Toggle Off Adding Exercise Calories](https://forums.cronometer.com/discussion/3271/toggle-off-adding-exercise-calories)).
- **Lesson:** users want to *log* activity without it *changing* targets —
  exactly Volyume's split (show kcal estimate, never touch targets).

### 2.10 Withings / Renpho — rank 10

- Pure data-layer plays: Withings claims 100+ partner apps
  ([Withings support](https://support.withings.com/hc/en-us/articles/201489577-Partner-Apps-Which-apps-are-compatible-with-the-Withings-ecosystem));
  Renpho pipes weight/BF% into MFP and via Health Connect. Notably also a
  duplication source — see §4.
- **Lesson:** smart-scale import (which Volyume has) is the commercially
  meaningful piece; nobody treats these ecosystems as training surfaces.

---

## 3. The "should I eat back my exercise calories" problem

**The two poles.** MyFitnessPal *adds* exercise calories to the daily budget
by default — "logging a 400 kcal session means your food budget jumps
400 kcal, even though wrist-based exercise estimates often inflate burn by 30
to 50 percent" ([FeastGood MF-vs-MFP](https://feastgood.com/macrofactor-vs-myfitnesspal/),
[MacroFactor's own comparison](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)).
MacroFactor (and Volyume) infer expenditure from weight + intake trends and
never add burns back.

**Confusion evidence (MFP side).** The MFP community is saturated with
threads titled "[Help: negative calorie adjustment mistake?](https://community.myfitnesspal.com/en/discussion/10654791/help-negative-calorie-adjustment-mistake)",
"[Negative calorie adjustment seems inconsistent](https://community.myfitnesspal.com/en/discussion/10853024/negative-calorie-adjustment-seems-inconsistent)",
"[Struggling to understand calorie adjustment?](https://community.myfitnesspal.com/en/discussion/10861865/struggling-to-understand-calorie-adjustment)" and
"[HOW DO YOU TURN OFF EXERCISE CALORIES BURNED?](https://community.myfitnesspal.com/en/discussion/10498299/how-do-you-turn-off-exercise-calories-burned)".
Users report walking ~1,000 steps *more* and being given extra calories in
ways that contradict their negative adjustments, plus a long-standing bug
where the "Based on" calorie figure displays incorrectly for Google Fit /
Samsung Health / Apple Watch sources
([MFP help article](https://support.myfitnesspal.com/hc/en-us/articles/360032623871-What-is-the-Calorie-Adjustment-in-my-Exercise-Diary)).
The community's folk fix — "eat half back, because burns are exaggerated"
([example thread](https://community.myfitnesspal.com/en/discussion/10015458/should-i-eat-back-my-exercise-calories)) —
is itself an indictment: users are manually discounting the app's central number.
Influential coaching content agrees:
"[Please stop 'eating back' exercise calories](https://physiqonomics.com/please-stop-eating-back-exercise-calories/)".

**Cronometer** sits awkwardly between: it historically added synced burns to
targets, generating the toggle-request threads above; a representative said an
"don't count towards goal" option was being added
([Toggle thread](https://forums.cronometer.com/discussion/3271/toggle-off-adding-exercise-calories)).

**Verdict.** The market has converged on Volyume/MacroFactor's answer. The
eat-back model is the single largest documented source of confusion in
nutrition apps. Volyume's only gap is *explanation*: MacroFactor publishes
essays ([wearables](https://macrofactor.com/wearables/),
[expenditure modifiers](https://macrofactor.com/expenditure-modifiers/)) that
turn the stance into a trust asset. Volyume shows a kcal estimate it then
ignores — without a visible one-line "why", that invites the same "is this
double counted?" anxiety.

---

## 4. Sync-friction catalogue

1. **Samsung Health → Health Connect raw duplication (Android).** Samsung
   dedupes internally but "provides the raw data prior to deduplication as
   output", so consumers see "up to 2x more" steps; Withings' importer hit
   exactly this ([Withings support thread](https://support.withings.com/hc/en-us/community/posts/29556071328529-Imports-steps-from-Samsung-Health-twice),
   [Samsung community](https://eu.community.samsung.com/t5/wearables/galaxy-steps-doubled-with-phone-in-pocket/td-p/1272656)).
   Volyume's aggregate-API reads are the correct defence; keep them.
2. **Workout + step double counting (MFP/Garmin/Strava).** Activity calories
   and the steps taken *during* that activity both add calories
   ([MFP thread: Garmin steps + cross-trainer double counted](https://community.myfitnesspal.com/en/discussion/10551303/garmin-connect-steps-calories-and-calories-from-cross-trainer-double-counted),
   [Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/89221/double-counting-calories-from-steps),
   [duplicate activity logging](https://community.myfitnesspal.com/en/discussion/10056722/garmin-logging-my-activities-twice-in-mfp-any-fix)).
   Volyume is structurally immune because cardio kcal never touches targets.
3. **Watch-only steps lost / phone-only steps stranded (iOS).** Dead watch
   battery → phone steps "don't count as steps, exercise or anything" in
   Activity; third-party app steps don't reach rings
   ([Apple Communities](https://discussions.apple.com/thread/254639427)).
4. **Sync-priority deadlocks.** MacroFactor documents that a manual or
   higher-priority entry for a day silently blocks wearable import — a
   recurring support theme ([Force Data Syncing](https://help.macrofactorapp.com/en/articles/69-force-data-syncing)),
   plus a Fitbit→Health Connect pipeline that silently died in Dec 2023
   ([Fitbit community](https://community.fitbit.com/t5/Android-App/Fitbit-stopped-syncing-weight-logs-to-other-connected-apps/td-p/5541347)),
   and "step count not showing" reports ([Android community](https://support.google.com/android/thread/390597722/step-count-not-showing-on-macrofactor?hl=en)).
   Even the category leader cannot make sync invisible; what it does well is
   *self-service diagnosis* (over-scroll to force re-sync, documented priority
   rules). Volyume's silent reads need an equivalent "why is my data missing?"
   surface.

---

## 5. Watch-app expectation analysis

- For **set logging**, a watch app is now table stakes at the top of the
  category: Strong and Hevy both ship polished watchOS apps (Hevy also
  Wear OS), and 2026 round-ups test strength apps "from your wrist" as a
  default criterion ([FindYourEdge](https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026),
  [Jefit smartwatch logging guide](https://www.jefit.com/wp/guide/best-apps-to-log-sets-and-reps-on-smartwatch-in-2026-top-7-tested/)).
- The Reddit meta-analysis is explicit: "If you are on Apple Watch
  specifically, the integration question matters as much as the app itself"
  ([Cora, 200+ threads](https://www.corahealth.app/blog/best-workout-tracker-reddit)).
- Counter-pressure: Garmin Connect+ is absorbing strength features natively,
  described as "bad news for strength apps"
  ([the5krunner](https://the5krunner.com/2026/03/24/garmin-connect-plus-strength-apps/)),
  and even MacroFactor — historically wearable-sceptic — shipped watchOS
  ([announcement](https://macrofactor.com/apple-watch/)).
- **For Volyume:** absence of a watch app is defensible for the *coaching*
  proposition but is becoming a visible omission for the *logging*
  proposition, which is Volyume's free-tier hook. Expect "no watch app" to
  appear in comparison reviews within 12 months.

---

## 6. What users want their training app to DO with activity data

Evidence-ranked:

1. **Give lifting credit in load/recovery models** — the loudest demand;
   Whoop's Strength Trainer reception and Garmin's Unproductive-status
   complaints both prove it (§2.2, §2.3).
2. **Not have burns change food targets mid-day** — Cronometer toggle
   threads, MFP "turn it off" threads, "eat half back" folk heuristic (§3).
3. **Adjust training, legibly** — Fitbod's muscle heat-map sentiment (§2.4).
4. **Use steps as a slow trend signal, not a kcal source** — MacroFactor's
   step-informed modifiers, RP's step bands (§2.1, §2.6).
5. **Just work across devices** — the entire friction catalogue (§4).

Step targets in a cut are mainstream coaching practice (10–12k minimums for
fat-loss phases per [Ripped Body](https://rippedbody.com/step-tracking/) and
[Built With Science](https://builtwithscience.com/fitness-tips/how-many-steps-a-day/),
with gradual +500–1,000/week ramps) — yet **no ranked competitor ships
automatic, phase-banded, compliance-gated step targets. Volyume is alone
here.**

---

## 7. Implications for Volyume

**Where Volyume leads**
1. Energy-balance ownership of cardio kcal — now the validated category
   answer (MacroFactor, Carbon convergent; MFP the cautionary tale).
2. Phase-banded coach step targets with compliance gating — no competitor
   automates this; RP's static self-reported bands are the nearest analogue.
3. Steps-before-cardio escalation in a cut — matches coaching best practice;
   no app encodes it.
4. Deduplicated aggregator reads — pre-empts the Samsung/Withings duplication
   class of bug.

**Where Volyume lags**
1. **Expenditure transparency.** MacroFactor turns "we ignore wearable burns"
   into marketing; Volyume's silently-ignored kcal estimate invites the very
   confusion it avoids. Low-cost fix: a one-line explainer on the cardio kcal
   estimate ("shown for context — your targets already account for activity
   via your weight trend") and a short in-app essay.
2. **Steps as a trend accelerator.** MacroFactor's Step-Informed Updates show
   a deterministic, non-kcal way to make step data speed up expenditure
   convergence. Compatible with Volyume's coaching-engine constraints
   (no AI, deterministic) — a candidate Phase 2 idea, founder decision.
3. **Sync self-service.** No visible "data health" surface for missing
   steps/weight; even MacroFactor needs force-resync affordances.
4. **Watch logging.** Hevy/Strong have made wrist set-logging an expectation
   for serious loggers; Volyume has no watch app (and Expo constraints make
   this a significant, explicitly out-of-scope architectural question).
5. **Lifting in the recovery picture.** Whoop/Garmin/Fitbod momentum suggests
   users increasingly expect cardio/steps to be weighed against lifting
   recovery, not just nutrition. Volyume's Consistency screen
   (acute:chronic workload) is a foundation but does not ingest cardio.

**Anti-recommendations (do not copy)**
- Do not add exercise calories to food targets in any form (MFP's model is
  the category's biggest documented confusion generator).
- Do not adopt wearable kcal burns as inputs (±30–50 % error consensus).
- Do not surface a Garmin-style global "training status" verdict driven by
  cardio data — lifters resent cardio-biased judgements of their training.

---

## Sources

Key sources (all cited inline above): [MacroFactor wearables essay](https://macrofactor.com/wearables/) · [MacroFactor expenditure modifiers](https://macrofactor.com/expenditure-modifiers/) · [MacroFactor help: wearable EE data](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker) · [MacroFactor v5.5.0](https://macrofactor.com/version-5-5-0/) · [MacroFactor watchOS](https://macrofactor.com/apple-watch/) · [MacroFactor vs MFP 2025](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/) · [FeastGood MF vs MFP](https://feastgood.com/macrofactor-vs-myfitnesspal/) · [the5krunner Whoop Strength Trainer](https://the5krunner.com/2026/02/28/new-whoop-strength-trainer-update/) · [Whoop Strength Trainer R&D](https://www.whoop.com/us/en/thelocker/the-research-and-development-behind-strength-trainer/) · [Garmin 2025 data report](https://www.garmin.com/en-US/blog/general/2025-garmin-connect-data-report/) · [the5krunner Garmin strength survey](https://the5krunner.com/2026/04/02/garmin-strength-training-features-survey/) · [RunToTheFinish training load](https://runtothefinish.com/training-load/) · [Fitbod Apple Health help](https://fitbod.zendesk.com/hc/en-us/articles/360047357794-Apple-Health) · [Carbon activity help](https://help.joincarbon.com/en/articles/6004568-understanding-lifestyle-and-exercise-activity) · [FeastGood Carbon review](https://feastgood.com/carbon-diet-coach-review/) · [FeastGood RP review](https://feastgood.com/rp-diet-app-reviews/) · [Cronometer forums: eat-back](https://forums.cronometer.com/discussion/3272/should-i-eat-back-exercise-calories) · [Cronometer toggle request](https://forums.cronometer.com/discussion/3271/toggle-off-adding-exercise-calories) · [MFP negative adjustment threads](https://community.myfitnesspal.com/en/discussion/10654791/help-negative-calorie-adjustment-mistake) · [MFP calorie adjustment help](https://support.myfitnesspal.com/hc/en-us/articles/360032623871-What-is-the-Calorie-Adjustment-in-my-Exercise-Diary) · [Physiqonomics](https://physiqonomics.com/please-stop-eating-back-exercise-calories/) · [Withings double import](https://support.withings.com/hc/en-us/community/posts/29556071328529-Imports-steps-from-Samsung-Health-twice) · [MFP Garmin double counting](https://community.myfitnesspal.com/en/discussion/10551303/garmin-connect-steps-calories-and-calories-from-cross-trainer-double-counted) · [Apple Communities watch-only steps](https://discussions.apple.com/thread/254639427) · [Cora Reddit meta-analysis](https://www.corahealth.app/blog/best-workout-tracker-reddit) · [Cora Strong review](https://www.corahealth.app/compare/strong) · [Hevy App Store](https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350) · [Cult of Mac missing strength ring](https://store.cultofmac.com/blogs/learn-about-your-apple-watch/strength-is-the-missing-activity-ring-here-s-how-you-can-close-it) · [Ripped Body step tracking](https://rippedbody.com/step-tracking/) · [Withings partner apps](https://support.withings.com/hc/en-us/articles/201489577-Partner-Apps-Which-apps-are-compatible-with-the-Withings-ecosystem)
