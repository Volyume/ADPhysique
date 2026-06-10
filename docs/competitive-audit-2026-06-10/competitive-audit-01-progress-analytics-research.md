# Competitive Audit 01 — Progress Tracking & Analytics Research (Agent 6)

> Phase 2 research, 2026-06-10. Area: progress visualisation and analytics.
> Method: web research (vendor docs, independent reviews, Reddit/forum
> sentiment, press coverage), measured against the ground-truth baseline in
> `competitive-audit-00-volyume-baseline.md` §3.5 and §5 (gaps 7 and 8).
> No code was modified. All sources linked inline. British English.

---

## 1. Ranked top 10 — most compelling progress visualisation/analytics in fitness

Ranking weighs (a) quality of the visualisation itself, (b) evidence that it
motivates rather than merely informs, and (c) strength of user sentiment.
Three non-lifting apps are included deliberately: the best progress
visualisation in fitness mostly lives outside lifting apps.

| # | App | Why it ranks here |
|---|-----|-------------------|
| 1 | **Strava** | Year in Sport is the category's strongest proof that progress data carries emotional value — paywalling it in Dec 2025 caused a public backlash. Progress summary chart with date-comparison filters, Fitness & Freshness, Best Efforts, weekly streaks, badges. |
| 2 | **Whoop** | Trend views (weekly/monthly/6-month) turn noisy daily scores into narrative; users report trends "changed how I scheduled my training weeks". Also the clearest cautionary tale (score anxiety). |
| 3 | **MacroFactor** | Best-in-class chart *interaction*: pinch/pan charts whose insight averages recompute as the window changes; trend-weight line over a pale scale-weight line; dynamic expenditure chart. The benchmark for non-judgemental data. |
| 4 | **Apple Fitness** | Rings + streaks + awards are the most-studied motivation loop in fitness; Trends (90-day vs 365-day arrows) attach micro-coaching to every regression. |
| 5 | **Hevy** | The lifting-app benchmark for celebration cadence: free Monthly Report AND December Year in Review, muscle body-graph, 1RM trend lines, shareables. |
| 6 | **Garmin Connect** | Deepest analytics in consumer fitness (Training Readiness/Status with factor-by-factor "why"); 2024 customisable At-a-Glance dashboard; but also evidence that bad encodings kill comprehension. |
| 7 | **Oura** | 2025 redesign is the state of the art for long-term framing: My Health tab, Cardiovascular Age month-over-month, habits-to-metrics linking, "Triple Crown" days as a self-made game. |
| 8 | **Boostcamp** | Closest feature mirror to Volyume: Strength Score (0–100, IPF DOTS), per-muscle volume heatmap on body diagrams (7/30/90-day/year), free weekly Sunday reports + free year-end Wrapped. |
| 9 | **Strong** | Clean 1RM/best-set/volume charts, home-screen calendar + activity widgets, CSV export; loved for reliability, but analytics development has visibly stalled relative to Hevy. |
| 10 | **Jefit** | Broadest metric coverage (volume at session/muscle/exercise level, BodyMap, 1RM goals, lifetime windows) but the weakest execution — users say the graphs "make no sense". |

*Honourable mention:* **Alpha Progression** — strong auto-progression and
"never plateau" positioning, charts per exercise/muscle/measurement, but
users cite that it "lacks in-depth analytics to optimise training
effectively" ([Healthynexercise](https://www.healthynexercise.com/alphaprogression/),
[Fitness Drum](https://fitnessdrum.com/alpha-progression-app-review/)).

---

## 2. Per-app findings

### 2.1 Strava (#1)

**Metrics & visualisation.** Progress summary chart at the top of the You
tab: distance, time, elevation or activity count across multiple time
ranges, with **date-comparison filters** added in 2025 so athletes can
overlay periods ([Strava support](https://support.strava.com/hc/en-us/articles/28437860016141-Progress-Summary-Chart),
[Strava press](https://press.strava.com/articles/strava-continues-to-accelerate-innovation-with-new-features-designed-for)).
Fitness & Freshness (subscriber) plots Fitness/Fatigue/Form from an
impulse-response model over Training Load / Relative Effort; the Relative
Effort weekly graph shows a suggested band derived from your own three-week
average — progress always framed against *you* ([Fitness & Freshness](https://support.strava.com/hc/en-us/articles/216918477-Fitness-Freshness),
[Relative Effort](https://support.strava.com/hc/en-us/articles/360000197364-Relative-Effort)).
Best Efforts auto-detect distance PRs; badges distinguish segment medals
from benchmark milestones ([StriveCloud](https://www.strivecloud.io/blog/app-engagement-strava)).

**Celebration & streaks.** Weekly (not daily) streaks: one 60-second upload
Monday–Sunday keeps it alive — a deliberately forgiving cadence that
matches real training schedules; analysis notes weekly-streak users barely
need "freeze" mechanics ([Strava support](https://support.strava.com/hc/en-us/articles/36553427481997-Streaks-on-Strava),
[Trophy case study](https://trophy.so/blog/strava-gamification-case-study)).
Year in Sport is the annual identity artefact of the category.

**Sentiment.** The strongest sentiment signal found anywhere in this audit:
when Strava put Year in Sport behind its ~$80 subscription in December
2025 it "triggered a wave of frustration", with Redditors noting "the irony
of paying to view data you provided to the platform" — though one defender
wrote "Everything can't be free… I use Strava most days… it's worth the
money" ([gadgetsandwearables](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/),
[road.cc](https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425),
[Slashdot](https://news.slashdot.org/story/25/12/19/2158235/strava-puts-popular-year-in-sport-recap-behind-an-80-paywall)).
You only get a backlash like that for a feature people genuinely love.

### 2.2 Whoop (#2)

**Metrics & visualisation.** Recovery %, Strain, Sleep, HRV, RHR. Trend
views give weekly, monthly and 6-month windows "to gauge progress and get
motivation", explicitly aimed at longer training cycles
([Whoop Locker](https://www.whoop.com/us/en/thelocker/track-progress-with-new-trend-views/)).
Whoop also runs an annual Year in Review (aggregate + personal)
([Whoop](https://www.whoop.com/us/en/thelocker/whoop-year-in-review-2025/)).

**Motivation vs anxiety.** r/whoop consensus: worth it for people who will
*act* on the data; "by month three the trend data changed how I scheduled
my training weeks completely"; the community's own advice is to "trust the
7-day trend more than any single morning score"
([community review roundup](https://www.aitooldiscovery.com/guides/whoop-reddit)).
The counter-evidence is real: obsessive score-checking is linked to
orthosomnia — "checking your tracker constantly and feeling anxious about
low scores can increase stress hormones, which paradoxically worsens
sleep" ([Sleep Foundation](https://www.sleepfoundation.org/orthosomnia),
[GoodTherapy](https://www.goodtherapy.org/blog/health-tracking-anxiety-wearable-obsession),
[Putnams](https://putnams.com/blogs/news/are-whoop-sleep-scores-actually-improving-your-sleep-what-the-data-doesn-t-tell-you)).
Lesson: lead with trends, demote single-day scores.

### 2.3 MacroFactor (#3)

**Visualisation.** Trend weight drawn as a strong purple line over the raw
scale weights as a pale line — the design itself teaches "ignore the
noise" ([Weight Trend help](https://help.macrofactorapp.com/en/articles/21-weight-trend)).
The Expenditure chart shows dynamic TDEE evolving daily
([Expenditure help](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).

**Interaction — the benchmark.** "Users able to pinch and pan charts to
explore data in specific moments", with a cluster of insights below each
chart showing changes over preset 3/7/14/30/90-day intervals whose
**averages update as the viewing interval changes**; the dashboard is
fully customisable with rearrangeable widgets
([MacroFactor dashboard revamp](https://macrofactor.com/dashboard-revamp/),
[Dashboard help](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard)).
This is the most concrete, copyable interactive-chart pattern found:
interaction is not decoration, it *recomputes the takeaway*.

### 2.4 Apple Fitness (#4)

**Mechanics.** Move/Exercise/Stand rings exploit the Gestalt closure
principle — "an open ring creates a subtle 'mental itch'" — plus streak
badges and shared-activity competition
([Trophy analysis](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings),
[Flyy](https://www.theflyy.com/blog/apple-fitness-and-the-power-of-gamification)).
watchOS 11 added ring *pausing* without breaking the streak — explicit
recognition that unforgiving streaks eventually punish loyal users
([Geeky Gadgets](https://www.geeky-gadgets.com/making-the-most-of-apple-watch-activity-rings-a-2025-guide/)).

**Trends = regression handling done well.** Trends compares the last 90
days against the last 365 per metric; a down arrow triggers micro-coaching
("Burn 30 more calories each day for 7 days") to turn it around; requires
180 days of history to activate
([Apple support](https://support.apple.com/en-ie/HT210343),
[AppleMagazine](https://applemagazine.com/apple-fitness-trends/)).

**Sentiment.** Streak attachment is extreme: a MacRumors user lost a
**2,180-day** Move streak to a timezone bug — "it might only be a small
thing for the general population, but for those of us diligently keeping
track of those things, it's kinda devastating"
([MacRumors forums](https://forums.macrumors.com/threads/lost-all-of-my-activity-badges-and-my-move-streak-was-reset-to-zero.2375908/)).
Streaks create real retention and real liability; repair/pause mechanics
are mandatory if Volyume ever ships them.

### 2.5 Hevy (#5)

**Metrics & visualisation.** Per-exercise: heaviest weight, best set,
projected/true 1RM with auto-updating trend line "going back to day one,
broken down by week or month"; muscle-group set counts and volume
distribution; a "Last 7 days" body graph showing what you trained
([Hevy features](https://www.hevyapp.com/features/gym-performance/),
[Hevy statistics explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth),
[muscle distribution chart](https://www.hevyapp.com/features/training-chart/)).

**Celebration cadence — the lifting benchmark.** A **Monthly Report**
(workouts, duration, sets, volume, PR list, muscle distribution *with
comparison to the previous month*, top exercises, calendar, month-vs-month
bar graph) plus a December **Year in Review** (stats, consistency, active
streak, best month, PRs, most-trained body parts, "biggest supporters"),
shareable outside the app, free tier included, eligibility just 10 logged
workouts ([Monthly Report](https://www.hevyapp.com/features/monthly-report/),
[Year in Review](https://www.hevyapp.com/features/year-in-review/)).
Dismissed recaps are recoverable (Profile → Statistics)
([Hevy on X](https://x.com/HevyApp/status/1737179354147287215)).

**Sentiment.** "The logging experience is fast, the exercise library is
extensive, and the progress charts are actually useful" — and it is
repeatedly called the best free tracker
([RepReturn](https://repreturn.com/hevy-app-review/)). Reddit's mental
model vs Strong: "Strong for speed and privacy, Hevy for social features
and beginner-friendliness" ([Setgraph comparison](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)).

### 2.6 Garmin Connect (#6)

**Metrics & visualisation.** Training Readiness with daily score,
factor-by-factor breakdown and historical charts; what users praise most
is the *explanation* — e.g. knowing a 35 is "due to HRV dropping 12%
overnight after two consecutive hard sessions and 5.5 hours of sleep"
([Should I Train](https://www.shoulditrain.com/blog/garmin-training-readiness-explained)).
The 2024 redesign introduced a customisable home: In Focus tiles plus up
to eight "At a Glance" cards, layout synced across devices
([DC Rainmaker walkthrough](https://www.dcrainmaker.com/2024/01/garmin-connect-through.html)).

**Where it fails.** Garmin's own forums show users fighting the Training
Status visualisation: yellow for "Maintaining" reads as a warning, and the
striped history bar "compresses status changes into thin slices that are
hard to read" — users explicitly ask for a plain line graph instead
([Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-andriod/430782/training-status---ui-ux-improvement)).
Garmin also took flak for moving features behind Connect+
([Should I Train review](https://www.shoulditrain.com/blog/garmin-connect-plus-review)).
Lesson: a clear, boring line chart beats a clever encoding.

### 2.7 Oura (#7)

**Visualisation.** Every score/contributor graph offers daily, weekly,
monthly and yearly views ([Using Trends](https://support.ouraring.com/hc/en-us/articles/360055983614-Using-Trends)).
The October 2025 redesign added a **My Health tab** for slow-moving
metrics (Cardiovascular Age month-over-month, Stress Resilience,
Cumulative Stress) with "visualisations of your health strengths,
important trends, and opportunity areas", and a Habits & Routines section
that connects daily behaviours to measurable outcomes
([Oura blog](https://ouraring.com/blog/new-oura-app-experience/),
[TechCrunch](https://techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature/),
[Cardiovascular Age](https://ouraring.com/blog/cardiovascular-age/)).

**Motivation.** Users invent their own games on top of the data — the
"Triple Crown" day (Readiness, Sleep and Activity all ≥85): "It's become a
little personal game. Not obsessive — just mindful"; the recommended use is
"as a trend, not a daily permission slip"
([Get Healthy U review](https://gethealthyu.com/oura-ring-review/),
[Century](https://www.centuryai.app/blog/oura-readiness-score-explained)).

### 2.8 Boostcamp (#8)

Auto PRs (max weight/volume/reps, e1RM curves, lifetime bests); Pro adds a
**Strength Score** (0–100, IPF-DOTS-based across five lifts) and a
per-muscle **volume heatmap** — front/back body diagrams lit by weekly
volume with 7/30/90-day and yearly views "to spot under-trained muscles and
recovery problems early". Free tier includes **weekly Sunday reports and a
year-end Wrapped** ([Boostcamp Pro](https://www.boostcamp.app/pro),
[features](https://www.boostcamp.app/features),
[workout tracker](https://www.boostcamp.app/workout-tracker)).
Sentiment: "the analytics on Pro are worth it once you're past beginner
gains" ([Vora roundup](https://askvora.com/blog/best-strength-training-apps-2026)).

### 2.9 Strong (#9)

Premium unlocks volume/frequency analytics, 1RM-over-time, CSV export;
recent additions are home-screen widgets (monthly calendar + weekly
streaks, activity over time) and profile-pinnable chart widgets
([RepReturn review](https://repreturn.com/strong-app-review/),
[Strong help](https://help.strongapp.io/category/233-history-charts-and-metrics)).
Comparisons consistently frame Strong as "deeper analytics and exportable
data… great if you like to slice your data by exercise or period"
([Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong),
[GymGod](https://gymgod.app/blog/strong-vs-hevy)) — but the energy in the
category has moved to Hevy, and Strong has no recap product at all.

### 2.10 Jefit (#10)

Tracks volume at three levels (session / muscle group over 7d–lifetime /
exercise via 1RM goals), progressive-overload trends, BodyMap muscle
visualisation, and explicitly positions analytics "to catch plateaus or
performance declines" ([Jefit guide](https://www.jefit.com/wp/guide/how-to-use-jefit-analytics-to-track-workout-performance-trends-and-maximize-progress/)).
4.8 stars across ~46k App Store ratings, yet reviewers report "the graph
to track progress makes no sense, and there is no easy and intuitive way
to see weight progress on one specific exercise in a clear linear graph"
([FitMenHQ review](https://fitmenhq.com/jefit-app-review-2/)).
Breadth without clarity reads as a dashboard, not progress.

---

## 3. Motivating vs dashboard — what makes the difference

Across all ten apps, the same five properties separate "I open this every
day" from "wall of numbers":

1. **Trend over snapshot.** Whoop's community trusts the 7-day trend over
   any morning score; MacroFactor literally fades raw data behind the
   trend line; Oura's advice is "trend, not a daily permission slip". A
   single number invites anxiety (orthosomnia evidence above); a slope
   invites action.
2. **Narrative and identity, on a cadence.** Wrapped-style recaps work
   because they convert data into self-story ("your best month", "your
   year"). Hevy proves the cadence can be monthly, Boostcamp proves it can
   be weekly, Strava proves people will riot if you take the annual one
   away. One recap a year is not a cadence.
3. **Prescription attached to regression.** Apple's down-arrow + "Burn 30
   more calories a day for 7 days" and Garmin's readiness "why" breakdown
   are praised; raw status colours are not. Data that tells you what to do
   next feels like coaching; data that doesn't feels like homework.
4. **Forgiving streak/consistency mechanics.** Strava's weekly streak (one
   upload/week) fits training reality; Apple had to add ring-pausing after
   years of users being "gutted" by timezone-broken streaks. Daily streaks
   in a 4-day/week lifting app would punish correct behaviour.
5. **Legible encodings beat clever ones.** Garmin's striped status bar and
   Jefit's confusing graphs both generate forum complaints despite deep
   underlying data; Strava's plain progress lines and MacroFactor's
   two-line weight chart generate none.

**Interactive charts — do users care?** The evidence says users care about
*windowing and comparing*, not scrubbing for its own sake: MacroFactor's
pinch/pan is praised because the insight averages recompute; Strava's 2025
date-comparison filters were a headline feature; Oura/Whoop lead with
window toggles (D/W/M/Y, weekly/monthly/6-month). No significant user
demand was found for free-form scrubbing on lifting charts specifically.
Priority order for Volyume: window toggles (already present) → period
comparison → tap-to-inspect values → pinch/pan. Scrub/zoom is polish, not
the gap.

---

## 4. Strongest sentiment findings (with sources)

1. **Recaps are the most loved progress artefact in fitness.** Strava's
   Year in Sport paywall (Dec 2025) "triggered a wave of frustration…
   people feel they are being asked to pay for data they already
   generated" ([gadgetsandwearables](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/),
   [Slashdot](https://news.slashdot.org/story/25/12/19/2158235/strava-puts-popular-year-in-sport-recap-behind-an-80-paywall)).
2. **Streaks bind — and cut.** "I would be really gutted if I lost my move
   streak due to time zone inconsistencies" / losing a 2,180-day streak is
   "kinda devastating" ([MacRumors](https://forums.macrumors.com/threads/lost-all-of-my-activity-badges-and-my-move-streak-was-reset-to-zero.2375908/)).
3. **Trends change behaviour where scores don't.** "By month three the
   trend data changed how I scheduled my training weeks completely"
   (r/whoop, via [aitooldiscovery roundup](https://www.aitooldiscovery.com/guides/whoop-reddit)).
4. **Explanations are the loved half of analytics.** Garmin users praise
   knowing *why* readiness is 35; the same users attack the status chart's
   colours and striped bar ([Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-andriod/430782/training-status---ui-ux-improvement)).
5. **Score-chasing has a dark side.** Orthosomnia literature ties
   obsessive tracker-checking to worse outcomes ([Sleep Foundation](https://www.sleepfoundation.org/orthosomnia)) —
   directly relevant to Volyume's ED-safety posture.

---

## 5. Implications for Volyume

**Where Volyume already leads the category** (baseline §3.5):

- **Volume Heatmap vs individualised landmarks** beats Hevy's and
  Boostcamp's raw set-count heatmaps — competitors show *what you did*;
  Volyume shows *what you did relative to what you personally need*. No
  competitor researched does this.
- **The deterministic insight stack and held-decisions transparency** are
  exactly the "explanation" layer Garmin users praise — and Volyume
  attaches it to lifting, where nobody else does.
- **EWMA weight trend** already matches MacroFactor's core concept
  (trend-over-noise), and the coach's adaptive-TDEE maths is
  MacroFactor-grade.
- **Strength standings (Beginner→Elite)** parallels Boostcamp's Pro-only
  Strength Score, in Volyume's free-adjacent Lifts area.

**Where Volyume lags:**

1. **Celebration cadence — the biggest gap.** Year of Lifts locked for 365
   days is the longest wait for a delight feature in the category; Hevy
   ships a monthly report free after 10 workouts, Boostcamp ships weekly
   Sunday reports free. Volyume has the rendering machinery (YearOfLifts
   story cards, ShareCard pipeline) and all the data; a **Monthly Recap**
   (and/or block-end recap tied to the existing mesocycle/BlockReflection
   structure — something no competitor can do, since none of them know
   your training block) is the highest-leverage build in this area.
   Keep it free: the Strava backlash shows paywalled recaps burn goodwill.
2. **No consistency/streak mechanic.** Volyume tracks consistency richly
   but celebrates none of it. A Strava-style *weekly* streak ("trained the
   sessions you planned this week"), with pause/repair (deload and illness
   aware — the coach already knows), fits Volyume's honest voice better
   than daily rings and avoids the streak-loss liability.
3. **Static charts.** The copyable pattern is MacroFactor's: interval
   presets whose summary insight recomputes per window (Volyume has the
   toggles; it lacks the recomputed takeaway line and tap-to-inspect), and
   Strava's compare-two-periods. Skia is already installed (baseline §5.7).
4. **Regression framing.** Apple's down-arrow + one-line fix is a pattern
   the insights engine could adopt verbatim (deterministically): every
   negative insight carries a "turn it around" action. Partially present;
   not systematic.

**What NOT to copy:** daily scores as the front door (Whoop anxiety /
orthosomnia evidence conflicts with Volyume's ED-safety stance); clever
encodings over plain lines (Garmin striped bar); paywalling recaps
(Strava/Garmin backlash); breadth-first analytics without a takeaway
(Jefit).

**Best-in-class to study before building:** Strava Year in Sport + weekly
streaks (emotional payoff, forgiving cadence), MacroFactor charts
(interaction that recomputes insight), Hevy Monthly Report (exact stat
list and month-vs-month comparison), Apple Trends (regression coaching).

---

*All claims above are sourced inline. Sentiment quotes are verbatim from
the linked sources. No code was modified in producing this report.*
