# Competitive Audit 01 — Check-in and Weekly Review Systems

**Agent 13 of 14 · 10 June 2026**
**Scope:** weekly check-in / weekly review systems and post-workout subjective surveys across coaching apps, wearables and human-coach platforms. Volyume baseline: section 3.3 of `competitive-audit-00-volyume-baseline.md`.

Research method: WebSearch across vendor documentation, help centres, long-form reviews (FeastGood, NoobGains, Garage Gym Revisited, Outlift, NutriScan), community forums (community.whoop.com, r/whoop, r/MacroFactor, Trainerize idea forum) and sports-science athlete-monitoring literature. Several primary pages (help.macrofactorapp.com, help.joincarbon.com, community.whoop.com) blocked direct fetch; content was recovered via search-indexed extracts and is cited as such.

---

## 1. Ranked Top 10

| # | App / platform | Type | Why it ranks here |
|---|---|---|---|
| 1 | **MacroFactor (MF Coach)** | Algorithmic nutrition | Best ask-vs-show discipline in the industry: "only asking questions when answers can meaningfully impact the trajectory of your goal"; optional one-tap Fast Check-In |
| 2 | **Working Against Gravity (Seismic)** | Human coach | The gold-standard human format: structured weekly data submission (weight, measurements, stress, energy, hunger, sleep) "in an easy-to-read format" + a real conversation |
| 3 | **Stronger U** | Human coach | Week's log data **auto-compiled into the check-in** for the coach's "360-view"; client adds narrative highs/lows and a forward plan |
| 4 | **Carbon Diet Coach** | Algorithmic nutrition | Tight, focused check-in (~3–5 asks: weight, hunger, adherence yes/no, optional cycle flag); instant adjustment with explanation |
| 5 | **Avatar Nutrition** (heritage) | Algorithmic nutrition | Sub-one-minute check-ins, instant adjustments, and "detailed coaching messages to explain why your macros did or didn't change" — the held-decision pattern, a decade early |
| 6 | **RP Diet Coach** | Algorithmic nutrition | Fully automated weekly review + intra-week calorie tweaks from weigh-ins; ranked down for spike-sensitivity and rigidity complaints |
| 7 | **Whoop (Weekly Performance Assessment)** | Wearable | Pure show, zero ask: Monday WPA of strain/recovery vs 3-week average; ranked down after the data-dense Monthly Performance Assessment was diluted |
| 8 | **Everfit** (vs TrueCoach/CoachRx) | Coach platform | Best-in-class check-in *tooling*: scheduled forms, photo/metric tasks, push reminders, side-by-side Responses Comparison — but no intelligence of its own |
| 9 | **Oura (Weekly/Monthly Reports)** | Wearable | Clean read-only recaps (averages + trend charts) gated on ≥2 weeks of data; "not as in-depth as Whoop's" |
| 10 | **Noom** | Human coach + CBT | Weekly coach outreach and weigh-in psychology, but the review is conversational, not data-driven; logging burden is the recurring complaint |

Honourable mention: **Dr. Muscle** — the zero-question extreme. Adjustments happen automatically after every session from logged performance; "after each session, workouts and progression plans are updated automatically". No weekly ritual at all, which is also why it does not make the top 10 for *review* quality.

---

## 2. Per-app findings

### 2.1 MacroFactor — rank 1

- **Structure.** Weekly check-in on a user-chosen day. Since the September 2024 "MF Coach" update, the check-in is a sequence of curated **Coaching Modules** (e.g. Program Update) rather than a fixed questionnaire ([MacroFactor blog](https://macrofactor.com/mf-coach/), [help centre](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules)).
- **Show vs ask.** Almost everything is shown, not asked: expenditure, weight trend and adherence are computed continuously from logged data; the check-in "will typically recommend an increase or decrease in your Calorie and macronutrient targets" which the user reviews and accepts. Stated philosophy: modules are "meaningfully impactful and minimally disruptive… only presenting new information when it may be helpful… and only asking questions when answers can meaningfully impact the trajectory of your goal" ([macrofactor.com/mf-coach](https://macrofactor.com/mf-coach/)). MacroFactor explicitly positions this "counter to invasive marketing questionnaires".
- **Question count / time.** Typically zero mandatory questions; a **Fast Check-In** toggle (More > Strategy > Fast Check-In) reduces the whole event to one tap ([Amy Food Journal review](https://www.amyfoodjournal.com/blog/macrofactor-review)).
- **Decision communication.** Immediate at check-in; new targets are explained against goal rate; the system is "forgiving" — it never scolds for imperfect adherence, it just re-plans ("at your next check-in, it makes adjustments based on updated information", [help centre](https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal)).
- **Sentiment.** Consistently the comparison-winner: "MacroFactor is far superior if you are a complete rookie… the graphs and forgiving approach to check-in is definitely better" (r/PeterAttia user, via [NutriScan Carbon review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07)).

### 2.2 Working Against Gravity — rank 2 (human gold standard)

- Weekly official check-in through the proprietary Seismic app: the client logs "body weight, measurements, stress levels, energy, hunger & sleep" through the week and "the Check-In feature makes it easy for you to submit your week's data in an easy-to-read format, speeding up the coach review" ([workingagainstgravity.com/how-does-wag-work](https://www.workingagainstgravity.com/how-does-wag-work)).
- The decision (macro adjustment) comes back from a human with reasoning, typically within a day. The format being imitated by every algorithmic app: pre-assembled data + short subjective layer + narrative + explained adjustment.

### 2.3 Stronger U — rank 3

- "Your Log data from the entire week prior is **compiled automatically into your check-in** so your coach can get a 360-view of your progress" ([Stronger U feature guide](https://resources.strongeru.com/feature-guide)).
- The human layer is deliberately narrative, not numeric: share "Highs & Lows", one or two areas to improve, and "plan and discuss your next 2-4 weeks" ([6 Tips for Maximizing Your Coach Check-Ins](https://strongeru.com/6-tips-for-maximizing-your-coach-check-ins/)). Metrics tracked are negotiated per client (meals, water, alcohol, steps, weight, photos, measurements).
- Take-away: the best human check-ins ask for **stories and context**, because the numbers are already there.

### 2.4 Carbon Diet Coach — rank 4

- Every seven days: submit weight (body fat optional), confirm compliance (yes/no), rate hunger/how you feel, female users flag period-affected weight ([Garage Gym Revisited review](https://garagegymrevisited.com/carbon-diet-coach/), [Carbon help centre — Weekly Check-in](https://help.joincarbon.com/en/articles/6004812-weekly-check-in)).
- Output is immediate: keep, raise, lower or re-ratio macros, with a short explanation. Roughly 3–5 asks, ~1 minute.
- Sentiment: "really great… it recalculates your macros each week based on how your body responds" (r/IIFYM, via NutriScan); the value is conditional — "Carbon delivers value if you actually use the weekly check-in system".

### 2.5 Avatar Nutrition (heritage) — rank 5

- The ancestor of the genre (same lineage as Carbon, pre-dating it). "Check-ins usually take **less than a minute** and adjustments to your macros are made **instantly**" ([avatarnutrition.com/how-it-works/check-ins](https://www.avatarnutrition.com/how-it-works/check-ins)).
- Compliance was derived from the food log, not asked: "the system determines whether you were able to reach your macro goals for the week based on the food you logged."
- Crucially: "Each time you check in, the system provides detailed coaching messages to **explain why your macros did or didn't change**, ensuring you always know what to expect" — direct precedent for Volyume's held-decisions card.

### 2.6 RP Diet Coach — rank 6

- Weekly review is essentially automatic: "Each week, the app reviews your results and recommends adjustments… you review your progress and receive an updated plan automatically" ([RP help centre](https://help.rpstrength.com/hc/en-us/articles/35245670505879-Progress-and-Weekly-Review-RP-Diet-Coach-App)); plus intra-week calorie adjustments from 2–3 weigh-ins ([FeastGood 9-week review](https://feastgood.com/rp-diet-app-reviews/)).
- **The cautionary tale.** Users "feel cheated when they're trending down but a random one-day spike causes their macros to be slashed, and believe daily weigh-ins where the app calculates a trend should be an included feature" ([NoobGains review](https://noobgains.com/rp-diet-coach-app-review/) / FeastGood, via search extracts). Also "overly aggressive adjustments when moving into a new phase" and schedule rigidity so painful that users "stopped using and deleted the app". This is the canonical "it ignored my reality" failure mode — solved by EWMA trends (which Volyume and MacroFactor both use).

### 2.7 Whoop — rank 7

- **Weekly Performance Assessment**: delivered every Monday with ≥5 days of data; breakdown of strain and recovery for the previous week vs the 3-week average; zero questions asked ([Whoop Locker](https://www.whoop.com/eu/en/thelocker/new-weekly-performance-assessment/), [Whoop on Medium](https://medium.com/@whoop/new-feature-the-weekly-performance-assessment-b3f7eb209241)). Daily subjective input comes from the separate Journal (user-selected behaviours from 300+, deliberately kept to "a small, consistent set" — [Whoop Journal overview](https://support.whoop.com/s/article/WHOOP-Journal-Overview)).
- **Sentiment — the strongest negative signal in this audit.** When Whoop replaced the long-running Monthly Performance Assessment with a lighter "Month in Review", the community thread was literally titled "**New Month in Review is a huge disappointment**": the legacy MPA "was considered by long-term members to be a valuable tool", while the replacement's "casual content doesn't provide the same amount of information and insight" ([community.whoop.com/t/9035](https://www.community.whoop.com/t/new-month-in-review-is-a-huge-disappointment/9035)). Engaged users punish dilution of substance in periodic reviews. r/whoop's standing advice — "if you're going to ignore the data, buy a Garmin" ([aitooldiscovery r/whoop digest](https://www.aitooldiscovery.com/guides/whoop-reddit)) — cuts the other way too: reviews only matter to users who act on them.

### 2.8 Everfit (and TrueCoach / CoachRx) — rank 8

- Everfit: scheduled check-in forms and questionnaires, progress-photo and body-metric tasks, push reminders "at 10am their time", and a Responses Comparison view for week-on-week answers ([Everfit help](https://help.everfit.io/en/articles/5608180-tasks-automated-check-ins-and-habit-coaching), [everfit.io/forms](https://everfit.io/forms/)).
- CoachRx adds "customizable weekly check-ins with comments" and an activity feed filterable by weekly check-ins ([coachrx.app](https://www.coachrx.app/features-coach)). TrueCoach lagged here; on the Trainerize idea forum, a weekly check-in form was a "highly requested feature" for years and coaches threatened migration to Everfit over it ([ideas.trainerize.com thread](https://ideas.trainerize.com/forums/167887-fitness-nutrition-training-features/suggestions/34832734-sending-weekly-check-in-forms-clients-have-to-fill)).
- These platforms prove demand-side pull for structured check-ins, but all intelligence remains with the human coach.

### 2.9 Oura — rank 9

- Weekly and monthly reports: "quick recaps of your recent scores and some of their contributors" — average Readiness/Sleep/Activity plus trend charts (RHR, HRV, total sleep, goal completion); weekly requires ≥2 weeks of wear, monthly ≥1 month ([Oura support](https://support.ouraring.com/hc/en-us/articles/360046061373-Oura-Reports)). No questions, no decisions, no prescriptions — reviewers note reports are "not as in-depth as Whoop's" ([Whoop vs Oura, Ashley Mateo](https://ashleymateo.substack.com/p/whoop-vs-oura-ring-which-one-should)).

### 2.10 Noom — rank 10

- Weekly coach outreach plus daily 1–10-minute CBT lessons; daily weigh-ins recommended "to spot trends" ([noom.com](https://www.noom.com/blog/what-is-noom-how-does-noom-work/), [Healthline 12-month review](https://www.healthline.com/nutrition/noom-diet-review)). The review layer is motivational rather than prescriptive; complaints centre on "food logging being too time-consuming" and lessons feeling "repetitive after a while" ([ConsumerAffairs](https://www.consumeraffairs.com/health/noom.html), [choosingtherapy.com review](https://www.choosingtherapy.com/noom-review/)).

---

## 3. Ask-vs-show analysis

| Platform | Shown (derived) | Asked (subjective) | Approx. asks | Time |
|---|---|---|---|---|
| MacroFactor | Expenditure, trend, adherence, new targets | Usually nothing; module questions only when material | 0–2 | seconds–2 min |
| Carbon | New macros + rationale | Weight, hunger, compliance y/n, cycle flag | 3–5 | ~1 min |
| Avatar (heritage) | Compliance from log, new macros, why/why-not message | Weight, body fat | 2 | <1 min |
| RP Diet | Updated plan | Weigh-ins only | 0–1 | <1 min |
| Whoop WPA | Entire report | Nothing (Journal separate) | 0 | read-only |
| Oura | Entire report | Nothing | 0 | read-only |
| WAG / Stronger U | Auto-compiled week log | Narrative: highs/lows, plan, context | 4–8 prompts | 5–15 min |
| **Volyume** | Weight EWMA, calorie adherence + diary note, steps auto-average, cardio compliance, training performance | Energy, stress, sleep, soreness, sore muscles, joint pain, notes, cycle flag (opt-in) + confirm pre-filled rows | ~6 asks + confirms across 4 steps | est. 2–4 min |

The industry has split into two poles: **pure-show** (Whoop, Oura, RP, Dr. Muscle — zero questions, but also zero subjective nuance) and **human-narrative** (WAG, Stronger U — rich but expensive and slow). MacroFactor sits at the algorithmic optimum: show everything, ask only when the answer changes the decision. **Volyume's pre-derived 4-step wizard is the only system found that pre-fills algorithmic answers and lets the user confirm or override them in-line** — structurally closer to the human gold standard (auto-compiled data + subjective layer + explained decision) than any competitor app. Avatar's "explain why macros did or didn't change" is the only true precedent for Volyume's held-decisions shelf; no current competitor surfaces non-decisions.

Where Volyume asks more than the algorithmic leaders is the subjective block (energy, stress, sleep, soreness, sore muscles, joint pain) — six asks weekly. This is defensible *because the engine consumes every one of them* (recovery×performance matrix, stress caps, safety holds), which is exactly the compliance condition the sports-science literature sets: "bringing value to the numbers and bringing value to the time the athlete spent to respond gets the ball rolling with compliance" ([Adam Virgile, wellness-questionnaire review](https://adamvirgile.com/2019/04/22/everything-you-need-to-know-about-using-wellness-questionnaires-in-sport/)).

---

## 4. Survey-fatigue and completion-rate evidence

- **Optimal length is under five questions.** Athlete-monitoring guidance converges on "fewer than 5 questions total, focusing on fatigue, mood, sleep quality, and hours slept", versus "traditional 10–15 question formats" which depress compliance and data quality ([Global Performance Insights](https://www.globalperformanceinsights.com/post/wellness-questionnaires-for-athlete-monitoring); [SimpliFaster dos and don'ts](https://simplifaster.com/articles/athlete-wellness-questionnaires-dos-donts/)).
- **TrainHeroic's design rule** (their Readiness survey is exactly five 1–5 items: sleep, mood, energy, stress, soreness): "a long survey leads to perfect data that **nobody logs** and low utility; a short survey leads to really good data that athletes consistently complete and high utility" ([TrainHeroic blog](https://www.trainheroic.com/blog/how-to-weaponize-your-coaching-with-athlete-readiness-surveys/)). They also warn that "after a few weeks of daily questions… the honeymoon period wears off" and the coach "is now the villain for asking how they feel over and over again."
- **Human-coach platforms:** "If your check-in process is messy, your clients will feel neglected. If it is too hard to fill out, **they will ghost you**" ([HubFit ultimate guide to check-ins](https://hubfit.com/blog/the-ultimate-guide-to-online-coaching-check-ins)).
- **Feedback closes the loop:** regular weekly feedback "boosts completion rates by 29%" in structured online programmes ([Learning Revolution / upcoach completion-rate analyses](https://upcoach.com/group-coaching/online-course-completion-rates/)) — weak transfer, but directionally consistent with TrainHeroic and Virgile: people keep answering when answers visibly change something.
- **Whoop's Journal** manages 300+ possible daily items by telling users to pick "a small, consistent set", now with AI-suggested pruning ([Whoop Journal](https://www.whoop.com/us/en/thelocker/the-whoop-journal/)) — even the most data-hungry vendor rations daily asks.

## 5. Post-workout subjective surveys — the per-session comparison

| App | Pre-session asks | Post-session asks | Notes |
|---|---|---|---|
| Hevy / Strong | 0 | 0 (optional note) | Category default is zero |
| TrainHeroic | 5-item readiness (one combined screen) | **1** sRPE slider + duration + optional comment ([support](https://support.trainheroic.com/hc/en-us/articles/18156631592589-Logging-your-Training-Session)) | Deliberately minimal by stated philosophy |
| JuggernautAI | Readiness check-in: per-muscle soreness, sleep, nutrition, overall readiness | 0 | Front-loads asks; visibly changes that day's weights/volume — users praise it: "if your quads aren't just right that day it'll lower the volume or the prescribed weight" ([PowerliftingTechnique review](https://powerliftingtechnique.com/juggernaut-ai-review/)) |
| RP Hypertrophy | Soreness asked per muscle at next exposure | Pump + workload **per exercise**, joint pain occasionally ([RP](https://rpstrength.com/pages/hypertrophy-app); [Dr. Muscle critique](https://dr-muscle.com/rp-hypertrophy-app-review/)) | High total ask count but distributed in-flow, 1–2 taps each; long-term users praise the adaptation ("updates weights and reps based on ratings of workload and soreness" — App Store reviews) |
| Dr. Muscle | 0 | 0 | Pure performance-derived adjustment |
| **Volyume** | 0 | **7** ratings (difficulty, pump, soreness-coming-in, fatigue, joints, energy, sleep) + note | Heaviest single stacked block in the category |

Volyume's seven post-session ratings exceed the evidence-based ceiling (<5) and exceed every competitor's *stacked* ask. RP asks as much in total but amortises it across the session; TrainHeroic asks one. Three of Volyume's seven (energy, sleep, soreness-coming-in) duplicate weekly check-in items and are properly pre-session/daily constructs, not post-session ones.

---

## 6. Implications for Volyume

**Is the 4-step pre-derived check-in ahead of the field? Largely, yes.**
1. Pre-deriving calorie adherence, steps, cardio and training performance and presenting them for confirm/override is *not found in any competitor* — MacroFactor derives silently (no override moment), Carbon asks blind (no derivation), human coaches do it manually. Volyume occupies the unclaimed middle.
2. The held-decisions card ("Calories held. Trend is on target.") matches Avatar's most-loved trait ("explains why your macros did or didn't change") and exceeds anything currently shipping. Keep it; market it.
3. EWMA trend + adjustment gating directly avoids the loudest complaint cluster in the genre (RP's spike-slashing).
4. Risks vs the leader: MacroFactor's check-in costs 0–2 asks and offers a one-tap Fast Check-In; Volyume's ~6 asks across 4 steps is nearer the <5 ceiling than it looks but has no fast path. A returning, consistently-green user should be offered a condensed confirm-all flow (the MacroFactor Fast Check-In analogue) without losing safety-relevant asks (joint pain, notes must survive any fast path because they feed safety holds).
5. Gating (scheduled day, ≥3 weigh-ins, fail-closed) is consistent with Whoop (≥5 days) and Oura (≥2 weeks) practice; no competitor fails *open*, so fail-closed is correct.
6. Whoop's Month-in-Review backlash is a standing warning: never simplify the coach card by removing data density — engaged users treat the weekly review as the product.

**Is the 7-question post-workout survey defensible? Only partially.**
The data is genuinely consumed (unlike Whoop's Journal noise), which is the strongest compliance lever the literature recognises. But seven stacked items breaches the <5 evidence ceiling, exceeds every competitor, and three items duplicate weekly/daily constructs. Defensible end-state suggested by the evidence: 3–4 post-session items (difficulty/sRPE, pump, joints) with energy/sleep/soreness-coming-in moved to a pre-session micro-readiness ask or derived from the weekly check-in — mirroring TrainHeroic's split and Juggernaut's praised pre-session model. (Recommendation only; no code changed.)

---

*Sources are linked inline throughout. Primary pages that refused automated fetch (help.macrofactorapp.com, help.joincarbon.com, community.whoop.com, medium.com/@whoop) were reconstructed from search-indexed extracts and corroborated across at least two secondary reviews each.*
