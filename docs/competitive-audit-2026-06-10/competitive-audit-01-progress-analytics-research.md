# Competitive Audit 01 — Progress Tracking & Analytics
**Date:** 10 June 2026 · **Area:** Progress visualisation, trends, milestones, recaps, emotional journey
**Apps audited:** Strong, Hevy, Whoop, Oura, Strava, Garmin Connect, Apple Fitness, MacroFactor, Gravitus, Boostcamp, RP Hypertrophy
**Method:** 21 web searches across store reviews, Reddit threads, app help centres, UX teardowns, press and review sites. All claims cited inline. No code changed.

---

## 1. Top 10 ranked — most compelling progress visualisation

| # | App | Why it ranks here |
|---|-----|-------------------|
| 1 | **Whoop** | Best-in-class progressive disclosure: one Recovery score → trend charts → raw HRV. Daily loop drives retention without gamification ([925 Studios teardown](https://www.925studios.co/blog/whoop-design-breakdown)) |
| 2 | **MacroFactor** | Best trend-visualisation in nutrition: smoothed weight trend, expenditure curve, adherence — "data visualisation among the best in any nutrition app" ([Marra Strength](https://marrastrength.com/macrofactor-review/), [SBS](https://www.strongerbyscience.com/macrofactor/)) |
| 3 | **Strava** | Fitness & Freshness curve, Relative Effort weekly band, and the category-defining Year in Sport recap ([Strava support](https://support.strava.com/hc/en-us/articles/216918477-Fitness-Freshness)) |
| 4 | **Hevy** | Strongest lifting analytics at scale: 1RM trends to day one, muscle heatmap, sets/muscle/week, monthly reports, Year in Review ([Hevy features](https://www.hevyapp.com/features/), [Hevy help](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth)) |
| 5 | **Oura** | Long-term Trends view (daily→yearly), tag-based behaviour correlation, Year in Review open to all members with 60+ days of data ([Oura Trends](https://ouraring.com/blog/trends/), [Android Central](https://www.androidcentral.com/wearables/oura-ring/your-oura-year-in-review-is-here-and-the-global-stats-are-wild)) |
| 6 | **Garmin Connect** | Deepest raw metric set (training status, load, badges); 2024 redesign improved glanceability but reduced personalisation ([Gadgets & Wearables](https://gadgetsandwearables.com/2024/04/24/garmin-connect-new-look/)) |
| 7 | **Apple Fitness** | Rings are the single most effective progress *symbol* ever shipped; Trends (90-day vs 365-day arrows) much weaker ([Trophy psychology piece](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings)) |
| 8 | **Strong** | Clean per-lift est-1RM charts (Epley), readable analytics — but charts are paywalled and development perceived as slow ([Cora review](https://www.corahealth.app/compare/strong), [Setgraph](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph)) |
| 9 | **Gravitus** | Per-exercise leaderboards, streaks, customisable charts; social-first rather than analysis-first ([gravitus.com](https://gravitus.com/)) |
| 10 | **Boostcamp** | Auto-progression inside programmes plus basic volume/1RM/PR analytics; tracking is a side-dish to programmes ([boostcamp.app](https://www.boostcamp.app/)) — RP Hypertrophy falls *below* the top 10 on visualisation: "no customizable dashboards, no flexible reporting across training blocks" ([Dr Muscle critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)) |

---

## 2. Per-app deep dives

### 2.1 Whoop
- **Metrics:** Recovery (0–100), Strain, Sleep performance/debt, HRV, RHR, respiratory rate; Journal behaviours correlated monthly.
- **Visualisation:** Three-layer progressive disclosure — single score → 7-day colour-zoned line charts → raw HRV/HR detail. Strain shown as daily bars against targets; sleep vs personal baseline. Dark UI is functional: black backgrounds make data colours pop ([925 Studios](https://www.925studios.co/blog/whoop-design-breakdown)).
- **Milestones/recaps:** Monthly Performance Assessment ties Journal behaviours to recovery deltas ([Whoop Locker](https://www.whoop.com/eu/en/thelocker/monthly-performance-assessment/)); weekly/monthly Trend Views ([Whoop](https://www.whoop.com/us/en/thelocker/track-progress-with-new-trend-views/)).
- **Motivating vs dashboard:** The Strain–Recovery loop "creates a daily reason to open the app, driving retention without gamification gimmicks" — the strongest daily-open mechanic in the set.
- **Emotional handling / friction:** Users report data anxiety: "after about the 3–4 month mark the large amount of information felt super overwhelming… got anxiety about sleep" ([Thingtesting reviews](https://thingtesting.com/brands/whoop/reviews)). Copy confuses: "Multiple days below strain targets will promote recovery" left users unsure if that was good or bad ([Everyday Industries UX eval](https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/)). Accuracy doubts on strength training HR undermine trust ([WellnessPulse](https://wellnesspulse.com/reviews/whoop-review/)).

### 2.2 MacroFactor
- **Metrics:** Trend weight (recency-weighted moving average), expenditure (adaptive TDEE), adherence, macro averages, rate of change.
- **Visualisation:** Dashboard of smoothed trend lines; the weight trend "tells you the overall direction your body weight is moving in, and the rate at which it's changing" ([MF help](https://help.macrofactorapp.com/en/articles/21-weight-trend), [dashboard guide](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard)).
- **Motivating vs dashboard:** Strongly motivating *because the data feeds decisions*: weekly target adjustments mean every chart has a consequence. "The expenditure trend chart alone is genuinely fascinating to watch over a multi-month period" ([Marra Strength](https://marrastrength.com/macrofactor-review/)).
- **Emotional handling:** Trend-smoothing is itself the emotional design — it pre-empts daily-scale despair by showing the de-noised line. Reddit consensus praises that it "adjusts recommendations based on real results rather than generic predictions"; criticisms are cost and the need for consistent logging.

### 2.3 Strava
- **Metrics:** Distance, pace, Relative Effort (HR-based load), Fitness & Freshness (CTL-style), segments/KOMs, kudos.
- **Visualisation:** Relative Effort weekly band ("white band" target range), cumulative Fitness curve, segment leaderboards ([Strava support](https://support.strava.com/hc/en-us/articles/360000197364-Relative-Effort)).
- **Recap:** Year in Sport is the genre archetype — but in 2025 it went subscriber-only, triggering loud backlash: "let the plebs see their Year in Sport too, please" ([road.cc](https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425), [Gadgets & Wearables](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/)). Some defended it: "Everything can't be free, then people can't get paid."
- **Lesson:** Annual recaps generate enormous goodwill and free marketing; paywalling them converts goodwill into resentment overnight.

### 2.4 Hevy
- **Metrics:** Per-exercise est-1RM trend (back to day one), volume, reps, sets/muscle group/week, muscle distribution heatmap, PRs, duration.
- **Visualisation:** Analytics tab with muscle heatmap (now visible *while logging*), 30d/3m/1y/all-time windows ([Hevy training chart](https://www.hevyapp.com/features/training-chart/), [sets per muscle](https://www.hevyapp.com/features/sets-per-muscle-group-per-week/)).
- **Recaps:** Monthly Report (workouts, time, sets, volume, PRs, top exercises, month-over-month comparison — free tier included) ([monthly report](https://www.hevyapp.com/features/monthly-report/)); Year in Review unlocked at just **10 logged workouts** ([year in review](https://www.hevyapp.com/features/year-in-review/)); shareables use playful equivalences — "You lifted 13,264 kg. That's like lifting a truck!" ([shareables](https://www.hevyapp.com/features/shareable/)).
- **Sentiment:** Loved: "1RM estimator updates automatically and displays a trend line… volume by muscle group genuinely useful for spotting imbalances" ([RepReturn](https://repreturn.com/hevy-app-review/)). Hated/wished: "no coaching layer to guide when to deload… it logs what you do but doesn't tell you what you should do next" — Hevy is a logger, not a coach.

### 2.5 Oura
- **Metrics:** Readiness, Sleep, Activity scores; HRV, temperature, RHR; tags for behaviours.
- **Visualisation:** Trends with daily/weekly/monthly/yearly granularity; redesigned app centres "long-term health" ([Oura blog](https://ouraring.com/blog/new-oura-app-experience/)); weekly/monthly/quarterly/anniversary/yearly reports ([Oura reports](https://support.ouraring.com/hc/en-us/articles/360046061373-Oura-Reports)).
- **Emotional handling:** Best copy tone in the set — "some variation in readiness is a good thing; it shows you're challenging your body" ([Oura blog](https://ouraring.com/blog/readiness-score/)). One user: "I actually look forward to checking scores every morning… when readiness is low it's a helpful reminder to go easy on myself" ([LifeStance](https://lifestance.com/blog/oura-ring-review/)). Quiet, non-judgemental framing vs Whoop's pushier loop.

### 2.6 Garmin Connect
- **Metrics:** The deepest set: training status/load/readiness, VO2max, body battery, badges, challenges.
- **Visualisation:** 2024 v5 redesign with "At a Glance" cards (up to 8) and "In Focus"; cross-device dashboard sync. Reception polarised: "users lamented the inability to truly personalize their dashboard like they could before" and generic labels replaced raw training-load numbers ([Gadgets & Wearables](https://gadgetsandwearables.com/2024/04/24/garmin-connect-new-look/), [Wareable](https://www.wareable.com/garmin/garmin-connect-app-update-2024-hands-on)).
- **Monetisation cautionary tale:** Connect+ paywalling AI insights provoked petitions and Reddit fury; "a lack of subscription paywall is what drew a ton of customers to the brand in the first place" ([TechRadar](https://www.techradar.com/health-fitness/garmin-connect-plus), [Techdirt](https://www.techdirt.com/2025/05/12/garmin-ceo-hints-more-paywalls-and-enshittification-are-coming-falsely-claims-users-love-it/)). The AI insights themselves were panned as "subject to basic math mistakes".

### 2.7 Apple Fitness
- **Metrics:** Move/Exercise/Stand rings, Trends (8 metrics, 90d vs 365d arrows), awards.
- **Why rings work:** Gestalt closure — "a subtle mental itch to close the circle"; streaks double daily active usage ([Trophy](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings), [Flyy](https://www.theflyy.com/blog/apple-fitness-and-the-power-of-gamification)).
- **Dark side:** "After a long streak, a missing ring can feel devastating"; documented mental-health harm for perfectionists ([Heather Grace](https://www.heather-grace.com/blog/how-my-apple-watch-impacted-my-mental-health-and-how-i-fixed-it)). Apple added ring-pausing in watchOS 11 as an explicit concession that "sustainable fitness is about long-term consistency, not perfect daily execution".
- **Trends weakness:** arrows can take up to 90 days to flip, and copy mis-fires ("You're walking or running less recently, Lisa…" to an above-average user) — users learn to ignore the surface ([Tom's Guide](https://www.tomsguide.com/opinion/ive-had-it-with-the-apple-watch-and-the-fitness-app-is-to-blame)).

### 2.8 Strong
- **Metrics:** Est-1RM (Epley) per exercise, volume per muscle group, total load, best sets, body measurements; CSV export.
- **Visualisation:** "Analytics are cleaner and more immediately readable… est-1RM trending over time is the most useful single metric" ([RepReturn comparison](https://repreturn.com/strong-app-vs-hevy/)); multiple graph types with period filtering.
- **Weaknesses:** All progress charts are Pro-gated ("you have to upgrade to see any of the progress charts over time"); Android lags iOS; free tier now capped at 3 workouts; no programming/coaching layer ([Cora](https://www.corahealth.app/compare/strong), [prpath](https://prpath.app/blog/strong-vs-hevy-2026.html)).

### 2.9 Gravitus
- **Metrics:** 1RM, volume, customisable charts; per-exercise leaderboards, workout streaks, social feed ([gravitus.com](https://gravitus.com/)).
- **Position:** Motivation via community ranking rather than analysis. "Climb the ranks… see how you stack up against others with leaderboards for each exercise." Recent shifting of free features to paid has caused grumbling ([App Store reviews](https://apps.apple.com/us/app/gravitus-workout-tracker/id965383840)).

### 2.10 Boostcamp
- **Metrics:** Volume, est-1RM, PRs, muscle-group engagement; history.
- **Differentiator:** Auto-progression — "hit your reps and the app increases the load next session, no spreadsheet required" ([boostcamp.app](https://www.boostcamp.app/)). Progress feedback is embedded in the programme loop rather than a destination surface. Users: "it couldn't be easier to find a legit program and track your progress."

### 2.11 RP Hypertrophy (below the line)
- Algorithmic progression from pump/soreness/joint-pain/performance inputs is respected ("loves that it updates weights and reps based on ratings of workload and soreness"), but visualisation is its weakest area: dated UI, no customisable dashboards, no cross-mesocycle reporting; a user's "only wish is a printout option… I want to chart my progress in a .csv file" ([Dr Muscle](https://dr-muscle.com/rp-hypertrophy-app-review/), [App Store](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554)). Requires internet — no offline ([wellness.alibaba review](https://wellness.alibaba.com/fitlife/rp-hypertrophy-app-review-cost-guide)).

---

## 3. User sentiment synthesis (love / hate / wish)

**Love**
- Per-lift est-1RM trend lines reaching back to day one (Hevy, Strong) — the single most-cited "this is why I track" feature.
- One number that answers "how am I doing today?" (Whoop Recovery, Oura Readiness).
- Smoothed trends that defuse daily noise (MacroFactor trend weight).
- Annual recaps and shareables with human-scale comparisons ("you lifted a truck") — Hevy, Strava, Oura.
- Data that changes the plan: MacroFactor's adjustments, Boostcamp/RP auto-progression.

**Hate**
- Paywalled recaps and previously-free analytics (Strava Year in Sport 2025; Garmin Connect+; Gravitus; Strong's chart gating).
- Data anxiety and judgemental scoring (Whoop sleep anxiety; Apple ring-streak devastation).
- Confusing copy/jargon (Whoop strain messages; Apple Trends captions).
- Loss of dashboard personalisation (Garmin v5).

**Wish**
- Logging apps that *interpret*: "no coaching layer to guide when to deload or adjust intensity" (Hevy, per [RepReturn](https://repreturn.com/hevy-app-review/)).
- Cross-block/mesocycle reporting and export (RP users).
- Recap access without paying (Strava/Garmin communities).

**Daily-open vs ignored**
- Opened daily: single readiness/recovery scores, the lift you're about to do (previous performance), streak/ring state, auto-progression targets.
- Ignored: deep chart libraries ("complex apps might offer 15 different progress charts, but if you never look at them they provide zero value" — [Setgraph](https://setgraph.app/ai-blog/fitness-app-for-tracking-workouts)); Apple Trends arrows (90-day lag); generic AI insights (Garmin). Research: "some people track religiously but never review their data — log every set, then never look at the history."

**Emotional journey / plateaus**
- 80% of fitness-app users abandon within 3 months, typically after a plateau; "motivation dips at week 3 due to first plateau in results" ([Consagous](https://www.consagous.co/blog/from-download-to-delete-the-real-reasons-fitness-apps-fail-users), [productgrowth.in](https://productgrowth.in/insights/healthtech/fitness-app-retention/)).
- 2025 BJHP social-listening study: apps induce "shame, disappointment, frustration and futility"; missed streaks lead to users *stopping logging* ([Wiley](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjhp.70026), [US News](https://www.usnews.com/news/health-news/articles/2025-10-24/fitness-apps-undermine-motivation-for-some-users-experts-say)). User quote: "How disappointing is it when you smash gym and MyFitnessPal for a day and there's no difference."
- Nobody in this set handles regression *well*. Oura's tone ("variation is a good thing") and MacroFactor's smoothing are the closest; no lifting app reframes a plateau constructively at the moment it happens.

---

## 4. Single best implementation

**Whoop's progressive-disclosure stack** (score → trend → raw signal) is the best single implementation in the category: it compresses dozens of signals into one decision-grade number while keeping full depth one tap away, on a dark numbers-first canvas — "the core design decision that made WHOOP a $3.6bn company" ([925 Studios](https://www.925studios.co/blog/whoop-design-breakdown)). Runner-up: **MacroFactor's trend-weight + expenditure pairing**, the best example of charts that *feed a decision loop* rather than decorating one.

## 5. Most common failure mode

**Dashboards that describe but never prescribe.** Across Strong, Hevy, Gravitus, Garmin and Apple, the recurring user complaint is identical: rich charts, zero interpretation — "it logs what you do but doesn't tell you what you should do next." The secondary failure (Whoop, Apple) is the inverse: scores so judgemental they create anxiety and logging avoidance at exactly the plateau moment when users most need support. The monetisation failure mode — paywalling a previously free progress/recap surface — reliably produces community revolt (Strava, Garmin, Gravitus).

---

## 6. Volyume vs each — lead / match / lag

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **Whoop** | Lifting-specific depth (1RM, MEV/MRV heatmap); offline-first; no hardware subscription | Dark dense numbers-first aesthetic; recovery/readiness EMAs | Progressive disclosure discipline (one headline number → drill-down); monthly behaviour-correlated assessment |
| **MacroFactor** | Training analytics (MF has none) | EWMA weight trend, body metrics | Charts wired to a visible decision loop the user can *see* acting on targets weekly |
| **Strava** | Strength-domain insight engine; landmarks vs MEV/MRV | Share cards; annual recap (Year of Lifts) | Social proof layer; recap as cultural moment; Fitness & Freshness-style long cumulative curve |
| **Hevy** | Insights engine (plateau/fatigue/overreaching — Hevy has nothing); MEV/MAV/MRV context on the heatmap; safety systems | 1RM trends, PR wall, muscle heatmap, consistency calendar | Monthly report ritual (free, month-vs-month comparison); recap unlock at 10 workouts vs Volyume's 365-day bar; playful shareable equivalences; social feed |
| **Oura** | Training specificity | Long-horizon trends; calm non-gamified tone | Tag/behaviour correlation ("what changed my readiness"); daily/weekly/monthly/yearly granularity switching in every chart |
| **Garmin Connect** | Coherent curated surface (Garmin is sprawl); deterministic, trustworthy insights vs panned AI | Badge-free seriousness | Breadth of metrics; cross-platform web view |
| **Apple Fitness** | Substance over symbol; no streak-anxiety mechanics (deliberate) | Daily one-line narrative ≈ glanceable status | A single iconic at-a-glance progress symbol; nothing in Volyume is as instantly legible as a ring |
| **Strong** | Insights, landmarks, recovery, narrative — Strong is charts only | Per-lift est-1RM trends, strength standards vs bodyweight | Nothing material; Strong's only edge is iOS polish and CSV export |
| **Gravitus** | Analytical depth, insight ranking | PR celebration | Community comparison (leaderboards); Volyume has no social ranking (arguably by design) |
| **Boostcamp** | Progress analytics breadth | Consistency tracking | Auto-progression visible *inside the session* ("next session: +2.5 kg") — progress as prescription, not retrospection |
| **RP Hypertrophy** | Visualisation across the board; offline-first; UI quality | Volume landmarks (MEV/MAV/MRV heritage) | Set-level autoregulated prescriptions driven by recovery feedback (Volyume has Precision Coaching — ensure adjustments are *surfaced on the progress screens*, not just applied) |

**Net position:** Volyume's progress stack already matches or beats 8 of 10 on analytical substance. Its genuine lags cluster in three places: (1) no monthly ritual between the daily narrative and the 365-day recap; (2) insights describe state but the *prescriptive* consequence (what Precision Coaching will do about it) isn't woven into the progress surfaces; (3) the annual recap unlock bar is far higher than every competitor's.

---

## 7. Improvement opportunities for Volyume (ranked by impact)

1. **Monthly Training Report (free-tier visible for free metrics).** Hevy's monthly report is its highest-goodwill ritual and is free; Volyume has nothing between the daily line and the 365-day unlock. Auto-generated on the 1st: workouts, sets, volume by muscle vs landmarks, PRs, month-over-month deltas, one headline insight. *Impact: fills the retention dead-zone at weeks 3–12 where 80% of users churn.*

2. **Lower the Year of Lifts bar and add a quarterly "Block Recap".** Hevy unlocks its annual recap at 10 workouts; Strava's paywalling of recaps caused revolt. A 365-day unlock means new users (the churn-risk cohort) never see Volyume's best emotional moment in year one. Offer a 90-day "First Block" recap and reserve the full Year of Lifts for the anniversary. *Impact: brings the celebration moment inside the churn window; shareables drive UK Android acquisition.*

3. **Plateau reframing in the insights engine (deterministic).** No competitor handles regression well, and the research is damning (shame → logging avoidance). When the plateau insight fires, pair it with deterministic context and a constructive next step: "Bench est-1RM flat for 6 weeks — but your volume PR is up 12% and this is normal after 18 months of training. Coaching will rotate rep ranges next block." Match Oura's tone, not Whoop's. *Impact: directly attacks the #1 abandonment trigger; differentiator no lifting app owns.*

4. **Make insights prescriptive, not descriptive.** The category's most common failure is "tells me what happened, never what to do." Volyume uniquely has a deterministic coaching engine (Pro) — every insight should end with what the engine will/can do about it, with a tap-through. *Impact: converts the progress tab from dashboard to decision loop (the MacroFactor effect), and is a clean Pro upsell from free analytics.*

5. **"Next session" progress cue inside the logger.** Boostcamp's auto-progression ("hit reps → +load next session") makes progress felt *during* training, where attention actually is. Surface last-session comparison and the coaching-engine target inline while logging. *Impact: progress data meets users at the daily-open surface instead of waiting to be visited.*

6. **One-tap time-granularity on every chart (daily/weekly/monthly/all-time).** Oura's pattern; Hevy offers 30d/3m/1y/all. Cheap, expected, and its absence reads as a gap to ex-Hevy users. *Impact: table stakes parity.*

7. **Behaviour-correlation insight (deterministic Whoop-Journal-lite).** Volyume already holds sleep/recovery EMAs, cardio, steps, nutrition (Pro). A deterministic correlation insight ("your est-1RM sessions following 7h+ sleep average +4%") replicates Whoop's most-loved monthly feature without AI. *Impact: high perceived intelligence, zero LLM, strong Pro value story.*

8. **Human-scale equivalences on share cards.** "You lifted a truck" is Hevy's most-shared element and costs a lookup table. Keep it factual and dry to fit Volyume's tone ("412,000 kg this year — 9.4 double-decker buses"). *Impact: shareability/virality at trivial cost.*

9. **Progressive-disclosure headline on the Progress landing.** Whoop's lesson: one decision-grade number first, depth one tap down. Volyume's landing should lead with a single composite "this week vs plan" statement before the compact volume summary. *Impact: makes the dense surface legible in 2 seconds; protects against the "15 charts nobody opens" failure mode.*

10. **Never paywall an existing free progress surface.** Strava, Garmin and Gravitus each torched community goodwill this way. Codify it: free analytics stay free; Pro adds new depth. *Impact: avoids the category's most predictable own-goal.*

---

## Sources (primary)
- [RepReturn — Hevy review](https://repreturn.com/hevy-app-review/) · [RepReturn — Strong vs Hevy](https://repreturn.com/strong-app-vs-hevy/)
- [Hevy features hub](https://www.hevyapp.com/features/) · [Monthly Report](https://www.hevyapp.com/features/monthly-report/) · [Year in Review](https://www.hevyapp.com/features/year-in-review/) · [Shareables](https://www.hevyapp.com/features/shareable/) · [Statistics explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth)
- [925 Studios — WHOOP design breakdown](https://www.925studios.co/blog/whoop-design-breakdown) · [Everyday Industries — WHOOP UX eval](https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/) · [Thingtesting — Whoop reviews](https://thingtesting.com/brands/whoop/reviews) · [WHOOP MPA](https://www.whoop.com/eu/en/thelocker/monthly-performance-assessment/)
- [MacroFactor help — Weight Trend](https://help.macrofactorapp.com/en/articles/21-weight-trend) · [Dashboard](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard) · [Marra Strength review](https://marrastrength.com/macrofactor-review/) · [Stronger by Science](https://www.strongerbyscience.com/macrofactor/)
- [Strava — Relative Effort](https://support.strava.com/hc/en-us/articles/360000197364-Relative-Effort) · [Fitness & Freshness](https://support.strava.com/hc/en-us/articles/216918477-Fitness-Freshness) · [road.cc — Year in Sport paywall](https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425) · [Gadgets & Wearables](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/)
- [Oura — Trends](https://ouraring.com/blog/trends/) · [Readiness score](https://ouraring.com/blog/readiness-score/) · [Reports](https://support.ouraring.com/hc/en-us/articles/360046061373-Oura-Reports) · [Android Central — Year in Review](https://www.androidcentral.com/wearables/oura-ring/your-oura-year-in-review-is-here-and-the-global-stats-are-wild) · [LifeStance review](https://lifestance.com/blog/oura-ring-review/)
- [Gadgets & Wearables — Garmin Connect v5](https://gadgetsandwearables.com/2024/04/24/garmin-connect-new-look/) · [Wareable hands-on](https://www.wareable.com/garmin/garmin-connect-app-update-2024-hands-on) · [TechRadar — Connect+](https://www.techradar.com/health-fitness/garmin-connect-plus) · [Techdirt](https://www.techdirt.com/2025/05/12/garmin-ceo-hints-more-paywalls-and-enshittification-are-coming-falsely-claims-users-love-it/) · [Cybernews petition](https://cybernews.com/gadgets/garmin-connect-subscription-petition/)
- [Trophy — Close Your Rings psychology](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings) · [Heather Grace — mental health](https://www.heather-grace.com/blog/how-my-apple-watch-impacted-my-mental-health-and-how-i-fixed-it) · [Tom's Guide](https://www.tomsguide.com/opinion/ive-had-it-with-the-apple-watch-and-the-fitness-app-is-to-blame) · [iPhone Life — Trends](https://www.iphonelife.com/content/understanding-fitness-trends-apple-fitness-challenges)
- [Cora — Strong review](https://www.corahealth.app/compare/strong) · [Setgraph — Strong review](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph) · [prpath — Strong vs Hevy](https://prpath.app/blog/strong-vs-hevy-2026.html)
- [Gravitus](https://gravitus.com/) · [Gravitus App Store reviews](https://apps.apple.com/us/app/gravitus-workout-tracker/id965383840)
- [Boostcamp](https://www.boostcamp.app/)
- [Dr Muscle — RP review](https://dr-muscle.com/rp-hypertrophy-app-review/) · [RP critique](https://dr-muscle.com/rp-hypertrophy-app-critique/) · [RP App Store reviews](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554)
- Churn/psychology: [BJHP 2025 social-listening study](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjhp.70026) · [US News](https://www.usnews.com/news/health-news/articles/2025-10-24/fitness-apps-undermine-motivation-for-some-users-experts-say) · [productgrowth.in retention](https://productgrowth.in/insights/healthtech/fitness-app-retention/) · [Consagous](https://www.consagous.co/blog/from-download-to-delete-the-real-reasons-fitness-apps-fail-users) · [Setgraph — features that matter](https://setgraph.app/ai-blog/fitness-app-for-tracking-workouts)
