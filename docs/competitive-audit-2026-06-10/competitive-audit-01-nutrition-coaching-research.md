# Competitive Audit 2026-06-10 — Agent 4: Nutrition & Macro Management (Coaching and Targets)

> Scope: how the leading nutrition apps calculate, explain, and adjust
> calorie/macro targets, and how users feel about it. Food *logging*
> depth is Agent 5's remit; it is touched on only where it affects
> coaching quality. Compared against Volyume baseline sections 3.3–3.4
> (`competitive-audit-00-volyume-baseline.md`).
>
> Method: web research conducted 2026-06-10 (WebSearch; direct page
> fetches were blocked in this environment, so claims rest on search
> extracts from primary sources — vendor help centres, App Store/Play
> review aggregators, third-party long-form reviews, peer-reviewed
> studies). Every claim is linked. Where a source is a secondary
> review site, that is visible from the URL.

---

## 1. Ranked top 10 — nutrition coaching and target management

Ranking weights: quality of target calculation, quality of *explanation*,
adjustment intelligence and communication, and evidenced user trust.
Database breadth alone does not move an app up this list.

| # | App | One-line verdict |
|---|-----|------------------|
| 1 | **MacroFactor** | Category benchmark. Adaptive expenditure, radical transparency, adherence-neutral design. |
| 2 | **Carbon Diet Coach** | The closest "automated coach" rival; simpler, dedicated goal modes incl. reverse diet. |
| 3 | **RP Diet Coach** | Most prescriptive (meal-by-meal timing); powerful for athletes, rigid for everyone else. |
| 4 | **Cronometer** | Best-in-class data accuracy and micronutrients; coaching is static and DIY. |
| 5 | **MyFitnessPal** | Vast scale (280M+ members) and database; weakest coaching story, worst monetisation sentiment. |
| 6 | **Lose It!** | Friendliest calorie "budget" metaphor; little genuine adaptation; ad/billing resentment growing. |
| 7 | **Noom** | Behavioural/psychology coaching at scale, now pivoting hard to GLP-1; 1,200 kcal defaults widely criticised. |
| 8 | **MacrosFirst** | The human-coach ecosystem tracker; coaching comes from your coach, the app is the pipe. |
| 9 | **Stronger U** | Pure human coaching ($159/month) — closing 31 March 2026; a lesson in the economics Volyume's deterministic coach avoids. |
| 10 | **Avatar Nutrition** | Heritage entry: the first automated adaptive macro coach (Norton-era, pre-Carbon); the genre's origin point, now a legacy product. |

---

## 2. Per-app findings

### 2.1 MacroFactor — the benchmark

**How targets are calculated.** Initial targets come from a standard
TDEE-equation process; the differentiator is that the app then
"continually update[s] its estimate of your energy expenditure" from
logged food and daily weight, back-calculating true TDEE from the
energy-balance identity and updating targets to match
([MacroFactor: algorithm accuracy](https://macrofactor.com/algorithm-accuracy/),
[help: interpreting expenditure changes](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).
MacroFactor claims its recommendations become "about 120–170% more
accurate than … a standard TDEE equation" after 3–4 weeks of data
([algorithm accuracy](https://macrofactorapp.com/algorithm-accuracy/)).
Guardrails stop week-to-week adjustments "over-reacting to short-term
weight fluctuations"
([algorithms & core philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)).
The Expenditure V3 algorithm (Oct 2024) is explicitly "more stable when
faced with transient weight fluctuations … especially beneficial for
users who menstruate", and **without requiring period tracking**
([Expenditure V3 announcement](https://macrofactor.com/mm-october-2024/)).

**How targets are explained.** This is MacroFactor's defining trait:
"we don't want our coaching algorithms to be an inscrutable black box"
— the user's live expenditure estimate is shown as a first-class,
always-visible chart, precisely *because* it drives recommendations
([algorithms & core philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)).
Supporting articles ("Do your calories feel too low? Too high?")
pre-empt distrust ([macrofactor.com](https://macrofactor.com/calories-low-high/)).

**Adjustment communication.** Weekly check-in on a user-chosen day; the
algorithm "review[s] your progress and suggest[s] changes"
([help: check-ins and coaching](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules)).
Crucially there are three program styles — **Coached** (app adjusts
everything), **Collaborative** (app sets the weekly calorie budget, user
distributes day-to-day), **Manual** (user owns everything) — an autonomy
spectrum no rival matches
([help: program styles](https://help.macrofactorapp.com/en/articles/91-program-styles)).
Refeeds/diet breaks/carb cycling are supported through Collaborative
flexibility rather than dedicated modes; reverse dieting is "set the
slowest gain rate and observe"
([help: refeeds and diet breaks](https://help.macrofactorapp.com/en/articles/30-does-macrofactor-support-refeeds-diet-breaks-or-carb-cycling),
[help: reverse diet](https://help.macrofactorapp.com/en/articles/32-how-would-i-pursue-a-reverse-diet-in-macrofactor)).

**Adherence-neutral philosophy.** No red numbers, no warnings, no shame:
"just neutral information with no implied judgments attached", on the
explicit reasoning that shame suppresses honest logging, and dishonest
logs corrupt the algorithm's data
([What "adherence neutral" means](https://macrofactorapp.com/adherence-neutral/),
[Stronger by Science](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)).
The system also "passively incentivises accurate food logging": log
honestly and the algorithm raises your calories.

**Complaints.** No functional free tier ("yearly-first subscription"),
a learning curve — "too many numbers, too many charts" in week one —
geographically uneven barcode/database coverage outside the US, no AI
photo logging, and dependence on consistent weigh-ins
([Nutrola: MacroFactor didn't work for me](https://nutrola.app/en/blog/macrofactor-didnt-work-for-me-alternatives),
[Outlift review](https://outlift.com/macrofactor-review/),
[FeastGood 2-year review](https://feastgood.com/macrofactor-review/)).
Pricing: ~$11.99/month or $71.99/year after a 7-day trial
([Eat This Much round-up](https://blog.eatthismuch.com/best-macro-tracking-apps/)).

### 2.2 Carbon Diet Coach

**Calculation & cadence.** Onboarding questions → goal-based plan; each
week the coach asks three check-in questions — body weight, optional
body fat, and (for women) whether weight was affected by their period —
then "provide[s] new calorie and macro targets for the next week, if
necessary … If you are not losing enough weight, you will receive a
calorie decrease"
([Carbon help centre](https://help.joincarbon.com/en/articles/5296570-what-is-carbon-and-how-does-the-coaching-system-work)).
Four goal modes (fat loss, muscle gain, maintenance, **dedicated
reverse-diet mode**) each run different algorithms
([NutriScan Carbon review](https://nutriscan.app/blog/posts/is-carbon-diet-coach-worth-it-2026-b08ffeab07)).
It warns when a chosen loss rate is unsustainable.

**Explanation.** Simpler and more opaque than MacroFactor — the pitch
is "do the three things, Carbon does the rest", which users praise as
unintimidating ("doesn't overwhelm them with features") but it does not
expose its expenditure model
([FeastGood MacroFactor vs Carbon](https://feastgood.com/macrofactor-vs-carbon-diet-coach/)).

**Complaints.** No free trial ("pay from day one") is the most repeated
gripe; pricing ($11.99/month, $99.99/year) is "more than most streaming
services"; database roadblocks — one user "constantly ran into
roadblocks in food categories, having to deconstruct whole meals …
extremely time consuming and bad for morale"
([NutriScan pricing](https://nutriscan.app/blog/posts/carbon-diet-coach-pricing-2026-plans-7a3d15e78c),
[justuseapp Carbon reviews](https://justuseapp.com/en/app/1437820611/carbon-smart-diet-coach/reviews)).
Ratings remain strong: ~4.7–4.8★ across stores
([FeastGood](https://feastgood.com/carbon-diet-coach-review/)).

### 2.3 RP Diet Coach

**Calculation & coaching.** Personalised calories/macros plus
**meal-by-meal timing prescriptions** around training; users weigh in
2–3×/week and the app "adjusts your calories for the coming days";
weekly reviews update the plan; v1.5 moved logging to a one-step,
industry-standard flow to prepare for AI food logging
([RP Strength](https://rpstrength.com/pages/diet-coach-app),
[RP update 1.5](https://rpstrength.com/blogs/articles/rp-diet-coach-app-update-1-5),
[FeastGood 9-week review](https://feastgood.com/rp-diet-app-reviews/)).

**Complaints — rigidity.** "Quite a few complaints online read along
the lines of too strict, too drastic, or not user-friendly. Having very
specific macros to hit at each meal … can make you obsessive with
food"; a shift worker: "I worked nights and an inconsistent schedule …
constantly adjusting the days/meals … such a massive hassle that I
stopped using and deleted the app"
([FeastGood](https://feastgood.com/rp-diet-app-reviews/),
[NOOB GAINS review](https://noobgains.com/rp-diet-app-review/)).
$9.99–19.99/month or $69.99/year; 4.4–4.5★
([wellness.alibaba.com cost guide](https://wellness.alibaba.com/nutrition/rp-apps-cost-free-features)).

### 2.4 Cronometer

**Calculation.** Energy target = BMR (profile-driven) ± weight-goal
rate + activity; macros via three user-selected schemes (ratios, fixed
grams, keto calculator with LBM-derived protein); micronutrient targets
from DRIs for age/sex across 84+ nutrients
([Cronometer support: nutrient targets](https://support.cronometer.com/hc/en-us/articles/360060170532-Nutrient-Targets),
[macro ratios](https://support.cronometer.com/hc/en-us/articles/360020446112-Macro-Ratios),
[energy target](https://support.cronometer.com/hc/en-us/articles/31975503009044-Energy-Target)).

**The coaching hole.** "Cronometer doesn't update your targets after
the initial setup, so you will have to edit them yourself or hire a
health professional"
([NutriScan MacroFactor vs Cronometer](https://nutriscan.app/blog/posts/macrofactor-vs-cronometer-2026-62a278ee64)).
2025 updates improved target *configuration* (energy-calculation
breakdown view, Target vs Balance display, weight-goal widget) but not
adaptation ([Cronometer blog](https://cronometer.com/blog/sp-2/)).
Complaints centre on full-screen ads in the free tier that "hijack the
app for up to half a minute" mid-logging, clunky recipes, and wrong
crowd-entries — though its verified-source data is its trust anchor
([Unstar negative-review analysis](https://unstar.app/app/1145935738?platform=ios&country=us),
[Nutrola 50k-review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)).

### 2.5 MyFitnessPal

**Calculation.** Mifflin-St Jeor BMR × activity factor (NEAT method),
minus a deficit for the chosen rate; floors at 1,200 (women)/1,500
(men) kcal
([MFP help: initial goals](https://support.myfitnesspal.com/hc/en-us/articles/360032625391-How-does-MyFitnessPal-calculate-my-initial-goals)).
Static thereafter unless the user re-runs goals. The floor produces a
notorious failure mode: aggressive rate selections silently collapse to
1,200 kcal regardless of settings, and users discover that easing the
rate "only allotted 60 more calories"
([MFP community thread](https://community.myfitnesspal.com/en/discussion/10541713/1200-calorie-limit-no-matter-what-settings)).
Independent reviews report TDEE overestimates of 200–500 kcal
([wellness.alibaba.com accuracy guide](https://wellness.alibaba.com/fitlife/myfitnesspal-calorie-accuracy-guide)).

**Explanation failure — exercise calories.** The "eat back exercise
calories" model confuses users persistently; trackers inflate burns and
the community folk-fix is "only eat 50% back" — a sign the app's own
explanation has failed
([MFP help](https://support.myfitnesspal.com/hc/en-us/articles/360032623851-Why-do-my-daily-nutrient-values-and-my-calorie-goal-change-when-I-log-exercise),
[community thread](https://community.myfitnesspal.com/en/discussion/10708894/do-i-eat-back-exercise-calories),
[StudyFinds on app motivation](https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/) —
"people described confusion over 'exercise calories' … the result
wasn't better habits; it was second-guessing, hunger, and frustration").

**Monetisation sentiment.** The 2022 barcode-scanner paywall ($19.99/
month Premium) remains the category's defining resentment event:
"theres not a chance in hell that im going to pay … i use this app
because i hate my body not my wallet"
([Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/),
[Digital Trends](https://www.digitaltrends.com/phones/myfitnesspal-barcode-scanning-not-free-premium-subscription/)).
2026 state: Free / Premium $79.99/yr / Premium+ $99.99/yr, AI Meal
Scan, Voice Log, 280M+ members
([2026 Winter Release](https://www.globenewswire.com/news-release/2026/02/24/3243668/0/en/myfitnesspal-debuts-its-2026-winter-release.html),
[NutriScan pricing](https://nutriscan.app/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a)).
One study found 73% of MFP users with eating disorders said the app
"at least somewhat contributed" to it
([breakbingeeating.com summary of Levinson et al.](https://breakbingeeating.com/stop-calorie-counting/)).

### 2.6 Lose It!

**Calculation.** Profile → BMR → daily calorie "budget" by chosen rate;
exercise syncs add "bonus calories" in real time; budget is descending
as weight drops but there is no learned expenditure model, and no way to
set a fully custom budget without the Adjust Budget workaround
([Personify Health FAQ](https://personifyhealth.zendesk.com/hc/en-us/articles/28073592908187-What-is-Lose-It-Calorie-Counter),
[Amy Food Journal review](https://www.amyfoodjournal.com/blog/lose-it-app-review)).
The "budget" metaphor is its best explanatory asset — friendlier than
"deficit". Strong community/challenges
([Eat This Much round-up](https://blog.eatthismuch.com/best-macro-tracking-apps/)).

**Complaints.** Trustpilot reviews report ads "sometimes disguised as
'gifts'", a $10 ad-removal charge *after* paying an annual sub,
duplicate-ridden database, auto-billing at trial end, and updates that
"took away the simplicity they originally valued"
([Trustpilot](https://www.trustpilot.com/review/loseit.com)).

### 2.7 Noom

**Model.** CBT/ACT/DBT-derived daily psychology lessons + caloric-
density colour system (green/yellow/orange-red) + human-ish coaching
(AI-assisted coaches at 300–400 users each)
([Healthline 12-month review](https://www.healthline.com/nutrition/noom-diet-review),
[Sacra](https://sacra.com/c/noom/)).
Criticisms: lessons are "copy-pasted … shown to everyone"; despite
"no bad foods" branding it "consistently guilts users if they eat too
many … red" foods; the default plan "makes daily calorie intake 1200
unless adjusted", which dietitians call unrealistic
([Abby Langer review](https://abbylangernutrition.com/noom-review-is-this-app-legit-for-losing-weight/),
[Yates Nutrition](https://yatesnutrition.com/noom-dietitian-review/),
[Femestella on ED harm](https://www.femestella.com/noom-reviews-horror-stories-eating-disorders/)).
Strategically Noom has pivoted to GLP-1: Noom Med hit a $100M run-rate
within four months of its Sept 2024 launch; an August 2025 "Microdose
GLP-1Rx" tier costs $199/month — behaviour coaching is becoming the
companion product, not the product
([Sacra](https://sacra.com/c/noom/),
[Noom press release](https://www.noom.com/in-the-news/noom-launches-microdose-glp-1-program-enabling-weight-loss-without-the-side-effects-and-priced-at-119-to-start-including-medication-and-microhabits-program/)).

### 2.8 MacrosFirst

Tracker built *for* the human-coaching ecosystem: coaches follow
clients' logs, and integrations (Coach Catalyst, Apotheo) push updated
daily macro targets straight into the client's app
([MacrosFirst help](https://help.macrosfirst.com/en/articles/13-how-do-coaches-use-macrosfirst-with-their-clients),
[Coach Catalyst integration](https://coachcatalyst.com/integrations/macrosfirst)).
"Macro Math" (premium) computes calories from macros for stricter
consistency; AI voice/text search; widely recommended by macro coaches
([A Couple Consumers review](https://acoupleconsumers.com/macrosfirst-app-review/)).
The app itself makes **no** target decisions — the implicit lesson is
that a large segment outsources the "why" entirely to a human.

### 2.9 Stronger U

Human coaches (RDs/certified) build fully custom plans — "no templates
or meal plans" — with weekly check-in conversations and hand-made
adjustments, at $450/3 months or $159/month
([How it works](https://strongeru.com/how-it-works/),
[Selfie Does review](https://selfiedoes.com/blog/2021/6/28/stronger-u-nutrition-review)).
**After nearly nine years, Stronger U announced end of services as of
31 March 2026** ([strongeru.com](https://strongeru.com/)) — strong
evidence that pure human coaching does not survive at consumer price
points, and that algorithmic coaches (Carbon, MacroFactor, Volyume's
deterministic engine) are the economically viable form.

### 2.10 Avatar Nutrition (heritage)

Built over 18 months to "automate [Layne Norton's] coaching approach
into a computer program" — weekly macro adjustments from check-in data;
effectively the first consumer adaptive macro coach
([IIFYM interview](https://iifym.com/blog/interview-biolayne-layne-norton/),
[avatarnutrition.com](https://www.avatarnutrition.com/)).
Norton departed after a dispute and co-founded Carbon
([AnabolicMinds thread](https://anabolicminds.com/community/threads/layne-norton-to-part-from-avatar-nutrition.297238/)).
Avatar persists as a legacy product; its ideas won, its app did not.
Lesson: the *adaptive check-in coach* pattern is two product
generations old and now table stakes at the premium end.

---

## 3. User sentiment — what actually frustrates people

**1. Monetisation friction is complaint #1, ahead of any feature.**
An analysis of 50,000 store reviews concluded the category has "a
monetization problem, not a functionality problem": the
"free-to-frustrating funnel — where apps deliberately make the free
experience worse to drive conversions — is the single biggest source of
user resentment", with feature *removals* (MFP barcode) the cardinal
sin ([Nutrola 50k-review analysis](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)).
Definitive quote, from the MFP barcode paywall: *"i use this app
because i hate my body not my wallet"*
([Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/)).

**2. Shame and rigidity drive abandonment.** Study participants
"started obsessing about food … per mouthful, per calorie"; fitness-app
users expressed "shame, guilt, frustration and burnout … especially in
relation to reminders that felt nagging or judgmental … and calorie or
step targets that were seen as unrealistic or rigid"
([PMC5332530](https://pmc.ncbi.nlm.nih.gov/articles/PMC5332530/),
[Newsweek on fitness-app harms](https://www.newsweek.com/fitness-apps-study-says-they-can-do-more-harm-than-good-10913928),
[therapist.com](https://therapist.com/disorders/eating-disorders/calorie-counting-apps/)).
The PMC study's headline: people dislike calorie counting and "want
motivational support" instead. RP's rigidity quotes (§2.3) are the
in-category embodiment.

**3. Targets users don't understand get ignored or feared.** The two
chronic explanation failures are MFP's silent 1,200 kcal floor
collapse and its exercise-calorie model ("second-guessing, hunger, and
frustration", [StudyFinds](https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/)).
MacroFactor attacks this directly by showing the expenditure number
that drives everything and writing "do your calories feel too low?"
support content; its other lever is incentive design — honest logging
is rewarded with higher targets
([adherence-neutral](https://macrofactorapp.com/adherence-neutral/)).
**Verdict on "which app explains best": MacroFactor, by a distance** —
it is the only one whose *primary UI* exposes the model's key internal
state (expenditure) rather than only the output (targets).

**4. What users wish apps understood about them:** irregular schedules
and shift work (RP deleter quote), menstrual-cycle weight noise
(MacroFactor V3 built for it), eating out and social events (apps
"fall short … with the spontaneity and social nature of real-life
eating"), and decision fatigue — "they know their remaining calories
for dinner, but waste time scrolling … trying to find something that
fits" ([Fitia](https://fitia.app/learn/article/best-calorie-tracking-app-features-motivation/),
[CrispNG](https://crispng.com/6-apps-that-can-help-you-eat-healthier-every-week/)).

**5. Science vs usability balance.** The pattern across winners:
Carbon's "log food, log weight, check in — Carbon does the rest"
three-step framing; MacroFactor's neutral numbers; Lose It's "budget"
metaphor. The losers bury users in either jargon-free oversimplification
that breaks trust (MFP) or unexplained prescriptive load (RP for
non-athletes). New-user overwhelm is MacroFactor's main usability tax
("too many numbers, too many charts",
[Nutrola](https://nutrola.app/en/blog/macrofactor-didnt-work-for-me-alternatives)).

---

## 4. Implications for Volyume

### Where Volyume LEADS the market

- **Safety architecture — no competitor has anything comparable.** FFM
  energy floor that refuses cuts (30 kcal/kg, IOC RED-S), ED-pattern
  lockout with Beat UK signposting, SCOFF gating, rapid-loss
  compression (`nutritionEngine.js`, `weeklyCoach.js`,
  `edPatternDetector.js`). The market's safety record is actively bad
  (73% MFP/ED finding; Noom 1,200 kcal defaults). This is a defensible,
  marketable moat — especially in a UK regulatory and press climate.
- **Held decisions.** Surfacing every adjustment *not* made with its
  reason ("Calories held. Trend is on target.") goes beyond even
  MacroFactor, which explains changes but not non-changes. No
  researched competitor does this.
- **Explicit user Apply on every change.** Carbon and MacroFactor
  (Coached) write new targets automatically; Volyume's
  consent-per-change model is unique and aligns with the autonomy users
  say they want — closest analogue is MacroFactor's Collaborative mode.
- **Built-in MATADOR diet breaks + refeeds/carb-cycling as coached
  features.** MacroFactor supports these only as manual workarounds;
  Carbon has reverse diet only. A deterministic, named diet-break
  protocol is genuinely differentiated.
- **Pre-derived check-in answers** (adherence from the diary, steps
  from health data, performance from sessions) reduce check-in friction
  below Carbon's three questions while ingesting more signal.
- **Training+nutrition in one engine.** None of the top 4 nutrition
  apps see training volume; RP prescribes timing but doesn't coach
  hypertrophy volume. Volyume's nutrition phase feeds plan volume
  landmarks — a coherence story nobody else can tell.

### Where Volyume MATCHES

- **Adaptive TDEE** (EWMA trend, energy-balance maths, 50% damping,
  ≥4 weeks data) is conceptually at MacroFactor's level, though their
  V3 algorithm has years of tuning and published accuracy claims.
- **"How was this calculated?"** breakdown matches the transparency
  ethos; calorie floors match MFP's 1,200/1,500 but with honest
  warnings rather than silent collapse.
- **Cycle awareness**: Volyume's opt-in cycle flag at check-in matches
  Carbon's period question; MacroFactor is ahead (automatic, no
  tracking needed — see Lags).

### Where Volyume LAGS

1. **No continuously visible expenditure.** MacroFactor's trust engine
   is a *daily-visible* live TDEE chart; Volyume explains at target
   setup and on coach day, but the model's internal state is invisible
   in between. Users coming from MacroFactor will read this as a black
   box even though the engine isn't one.
2. **Adjustment cadence is slow by design.** 2–3 off-target weeks +
   2-week cooldown + ±5% cap is defensible coaching, but MacroFactor
   and Carbon recalibrate weekly. Without the expenditure surface
   (above), patience reads as unresponsiveness.
3. **Cycle handling is manual/opt-in**; MacroFactor's algorithm absorbs
   menstrual weight noise automatically with no tracking required.
4. **Decision-fatigue relief is thin.** Curated `mealSuggest.js` is
   modest against RP/Eat This Much-style "tell me what to eat to hit
   the remainder"; sentiment shows strong demand.
5. **Database substrate** (Agent 5's area, but it caps coaching
   quality): OFF/CoFID/USDA waterfall is UK-strong, yet "coaching is
   only as good as the log" — MacroFactor's verified database is its
   quiet advantage.
6. **Pro-gating the entire nutrition surface** is clean (no degraded
   free tier, no feature removals — the two top resentment triggers),
   but it means free users never see the coach's quality. Competitors'
   trials (MacroFactor 7-day) exist precisely to show the algorithm
   working; Volyume's 14-day cardless trial covers this if discovery
   surfaces it.

### Biggest gap (single)

**A persistent, plain-English expenditure/trend surface** — the one UI
investment that converts Volyume's already-superior engine transparency
into *felt* transparency, defuses the "slow cadence" perception, and
matches the exact feature reviewers cite when crowning MacroFactor.
Volyume already computes everything needed (EWMA trend, adaptive TDEE);
this is presentation, not engine work.

### Best-in-class: MacroFactor — and why

It wins on a reinforcing loop the others lack: **show the model's
internal state (expenditure) → user understands why targets move →
no shame anywhere in the UI → user logs honestly → model gets better
data → targets get more trustworthy**. Add the Coached/Collaborative/
Manual autonomy spectrum and menstrual-noise-robust smoothing, and it
is the only app where calculation quality, explanation quality, and
emotional design are one system. Its weaknesses (price-first model,
week-one overwhelm, no integrated training coaching, US-centric
database) are exactly the flanks Volyume can attack.

### Strongest single sentiment finding

Monetisation friction — not features, not accuracy — is the category's
top resentment driver: the "free-to-frustrating funnel … is the single
biggest source of user resentment"
([Nutrola, 50,000 reviews analysed](https://nutrola.app/en/blog/we-analyzed-50000-calorie-tracker-reviews-what-users-actually-complain-about-2026)),
crystallised by the MFP barcode-paywall quote *"i use this app because
i hate my body not my wallet"*
([Punished Backlog](https://punishedbacklog.com/hey-myfitnesspal-were-not-paying-for-a-damn-barcode-scanner/)).
Volyume's hard Free/Pro split avoids the funnel; the rule it must never
break is the second-order one: **never move an existing feature behind
the paywall.**

---

*Agent 4 of 14 — nutrition and macro management (coaching/targets).
Diary/logging depth: see Agent 5's report.*
