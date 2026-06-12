# R-02 — Home / Today Screen: Best-in-Class Research

**Ultimate-app mandate · Phase 2 · Area 02.** Targeted external research against
the best home/today/dashboard surfaces in the market, aimed squarely at audit
A-02's five frictions (especially F-2: no rest-day state, no daily glance/streak
on Home, free users with no daily return reason). British English. Not committed.

Research agent: r-02. Date: 2026-06-12. Tooling: live WebSearch + WebFetch.

---

## STEP 0 — Tooling proof (verbatim fetch + URL)

Fetched live and quoted verbatim from Duolingo's own engineering/product blog,
[blog.duolingo.com/how-duolingo-streak-builds-habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/):

> "Your streak is a tangible, measurable number that holds you accountable to
> practicing every single day, even if it's just for five minutes."

and:

> "The longer your streak grows (and the prouder you become of it), the more
> likely you'll practice each day to protect that progress!"

WebFetch returned full rendered content and answered against it. Tooling proven.
**Fetch-failure log is at the end** (several vendor hosts bot-block direct
WebFetch — Whoop support, Hevy, MFP help, Calm help, Apple JS-rendered guide;
in every such case the claim is carried by WebSearch-indexed snippets of the
same primary page plus a second source, per protocol).

---

## 1. Per-app teardown (home / today surface)

Lens for each: **(a)** what it answers in 5 seconds; **(b)** rest-day / non-
training-day handling; **(c)** the daily return reason when not logging;
**(d)** density vs calm; **(e)** free-tier service; **(f)** transferable to a
deterministic, offline-first, one-banner app.

### 1.1 Whoop — the recovery-score-first home

(a) Three dials at the top — **Sleep, Recovery, Strain** — answer "how
recovered am I and how hard have I gone" instantly. Search-indexed from Whoop's
own pages ([whoop.com/.../your-key-whoop-metrics-all-in-one-place](https://www.whoop.com/us/en/thelocker/your-key-whoop-metrics-all-in-one-place/),
[support.whoop.com/.../The_All-New_Home](https://support.whoop.com/APP_FEATURES__COACHING/Understanding_Your_WHOOP_Features/The_All-New_Home)):
"three new separate dials at the top displaying the primary metrics core to
WHOOP: Sleep, Recovery, and Strain… You can see today's Strain, Recovery, and
Sleep at a glance or tap into the dials for more information."
(b/c) **The return reason is the score itself, not a workout.** "WHOOP Recovery
is a daily measure of how prepared your body is to perform… WHOOP calculates a
Recovery score as a percentage between 0–100%" — a *new number every morning*
whether or not you train. Rest is a legitimate, scored outcome, not an absence.
(d) Dense but the top is calm: three dials, then deep-dives (My Day / My Plan /
My Dashboard) below; "The dashboard is completely customizable, allowing you to
reorder and prioritize the features that matter most."
(e) Whoop is subscription-only; no meaningful free tier to learn from.
(f) **Transferable:** a single morning "readiness/glance" number is the strongest
return-reason pattern in the market and it does not require training. We cannot
compute HRV, but we *can* compute a deterministic offline daily glance (week-so-
far, streak, last session, today's status). The dial-at-top hierarchy maps onto
our hero-first discipline.
Corroboration: WebSearch snippets of two Whoop-owned URLs above; verdict
**VERIFIED (vendor, two first-party pages)**. Direct WebFetch of support.whoop.com
403'd (logged).

### 1.2 Oura — the "Today" tab that is different every day

(a) **Readiness score at the very top of the Today tab.** From
[liveworksleep.com/oura-app-features](https://liveworksleep.com/oura-app-features/)
and Oura's own help/blog (search-indexed): the Today tab "surfaces the most
important information about your health and will update throughout that day. Each
day will look different and contain a different set of features depending on what
is most timely and relevant to you," with the Readiness Score "at the top of the
Today Tab as a shortcut." Morning experience: "you'll unlock your screen to find
last night's data already waiting in the Today tab."
(b/c) Readiness explicitly **arbitrates train-vs-rest**: it "advises on whether
you're primed for a hard workout — or if you might be better off with an extra
latte and a leisurely stroll." Rest is a first-class recommendation, not a gap.
(d) Calm-but-adaptive: one hero score, then a *curated, re-ordered* daily stack —
not a fixed wall.
(e) Subscription for full insights; little free-tier lesson.
(f) **Transferable (high):** the "**every day looks different, surfacing what's
timely**" principle is exactly what a banner-priority home should aspire to —
our one-banner stack is a primitive version of Oura's relevance-ranked Today.
And Readiness-as-rest-permission is the cleanest answer to our F-2.
Sources: [liveworksleep guide](https://liveworksleep.com/oura-app-features/),
[Oura support: How to Use the Oura App](https://support.ouraring.com/hc/en-us/articles/360058599753-How-to-Use-the-Oura-App),
[Oura blog: new app experience](https://ouraring.com/blog/new-oura-app-experience/).
Verdict **VERIFIED** (one independent guide + two Oura-owned pages). Direct
WebFetch of the older blog URL 404'd/redirected (logged); current URLs above.

### 1.3 Fitbod — recovery heat-map drives the next session, rest included

(a) "How fresh are my muscles, and what do I train today?" From the fetched
[fitbod.me/blog/muscle-recovery](https://fitbod.me/blog/muscle-recovery/):
"In the Recovery tab, our app will show you a composite heat map of your muscle
fatigue," and "Fitbod generally prioritizes recovered muscles over fatigued
muscles, as one of several inputs into your recommended workout."
(b) **Rest is explicitly permitted and de-shamed** (fetched, verbatim): "If
you're sore, not performing well, or fatigued, take an extra day to recover! You
won't lose nearly as much progress as if you push through and injure yourself."
The algorithm treats muscles as fully recovered after seven days and won't
recommend fully-fatigued muscles.
(c) Daily reason = the freshness map updates and reshapes today's recommendation.
(d) Calm at the glance (one heat-map + one generated session), depth on tap.
(e) Hard 3-workout paywall (per val-ext-01-02 #22) — the *home itself* is good
on session one but quickly walled.
(f) **Transferable:** a recovery/readiness signal that *changes the home* is the
key. We are deterministic and don't model per-muscle HRV, but our engine already
computes fatigue/MEV signals (A-02 §1.3 coach brief ladder). The pick-up is to
let that signal **produce a rest-day state on the hero**, not only colour a chip.
Verdict **VERIFIED** (fetched primary page + help-centre search corroboration).

### 1.4 MacroFactor — calm, customisable, guilt-free dashboard

(a) "How am I doing today/this week vs target?" Fetched
[help.macrofactorapp.com/.../get-to-know-your-dashboard](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard):
"MacroFactor's dashboard is split into four sections"; the top "Dashboard Hat"
can "showcase Weekly Nutrition, Daily Nutrition, or Energy Balance insights — or
turn them all off for a minimalist look." Search-indexed: "The dashboard is
customizable, so you can prioritize and arrange the metrics that matter most."
(b/c) Not training-shaped, but the **return reason is the daily/weekly trend
read**, not a task. Crucially **adherence-neutral**: validated in
val-ext-01-02 #81 — no red numbers, pop-ups, warnings or guilt elements. A
missed/over day is shown without punishment, which is *why* people keep opening it.
(d) The calmest dense app in the set: one configurable hero "hat", then
insight widgets. Calm-by-choice (you can minimise it).
(e) Subscription; no free lesson, but the philosophy is the lesson.
(f) **Transferable (high):** (i) a **configurable "hat"** as the single glance is
a more disciplined cousin of our one-banner; (ii) the adherence-neutral posture
is already our house style (A-02 §3.2) and the corpus's strongest-verified design
plank — our daily-glance must inherit it (a rest day or a missed week is calm,
never a guilt state).
Verdict **VERIFIED** (fetched help page + val-ext-01-02 #81).

### 1.5 Duolingo — home as a streak engine

(a) "What's my streak and what's today's lesson?" The home *is* the daily-return
machine. Fetched verbatim (STEP 0): the streak is "a tangible, measurable number
that holds you accountable to practicing every single day," and loss aversion
("protect that progress") is the explicit mechanic.
(b) N/A (no rest concept) — but note the **transferable inverse**: Duolingo's own
"Streak Freeze / Weekend Amulet" exist precisely to stop a missed day breaking
the streak. The verified analogue in *our* corpus is watchOS 11 rest days that
**don't break award streaks** (val-ext-01-02 #56) and Friend Streaks (+22% daily
completion, val-ext-04-05-07 V21).
(c) The streak number + daily goal. This is the purest "reason to open even when
you don't feel like it" pattern in existence.
(d) Very low density, one big thing.
(e) Free tier is the product; streak mechanics are free.
(f) **Transferable (high, with our guardrails):** A-02 F-2 names the missing
streak on Home. The verified-harm literature (val-ext-04-05-07: streak anxiety,
Sheen 2025 shame) means we adopt the **glance/streak surface but the forgiving,
weekly, ED-safe variant** already chosen for D1/D2 — a *visible* week-streak on
Home, never a punitive daily one.
Verdict **VERIFIED** (fetched Duolingo blog + corpus cross-refs).

### 1.6 Garmin Connect — the Morning Report

(a) A pre-day **dashboard of readiness** before you train. Fetched
[shoulditrain.com/blog/garmin-morning-report-explained](https://www.shoulditrain.com/blog/garmin-morning-report-explained):
"Every morning your Garmin watch serves you a dashboard of data before your feet
hit the floor. Training Readiness, HRV Status, Sleep Score, Body Battery,
Recovery Time — the numbers are all there," and "The morning report is Garmin's
most valuable feature for daily training decisions."
(b/c) Same as Whoop/Oura — **readiness is the daily reason and it explicitly
green-/red-lights training**; a low-readiness morning is a rest recommendation,
not a void. The report is customisable (choose widgets), confirmed by Garmin's
own support (search-indexed).
(d) Can be a wall of numbers; the cited guide even teaches a "reading order…
each metric answers a specific question" — a caution for us about *un-ranked*
density.
(e) Hardware-gated; no app free-tier lesson.
(f) **Transferable:** the "**one morning read that tells you train or rest**"
framing, and the explicit *reading order / ranked* presentation so density never
becomes a wall — directly relevant to our banner-priority ordering.
Verdict **VERIFIED** (fetched independent guide + Garmin support search
corroboration).

### 1.7 Hevy — streak as consecutive *weeks*, calendar, social feed

(a) Strength loggers answer "start my next workout" but Hevy's home adds a
**weekly streak + consistency calendar + a social feed**. Search-indexed from
Hevy-owned pages ([hevyapp.com/features/gym-consistency](https://www.hevyapp.com/features/gym-consistency/),
[hevyapp.com/features/home-screen-widgets](https://www.hevyapp.com/features/home-screen-widgets/)):
"Hevy displays your active streak, which keeps track of the number of consecutive
*weeks* you've logged at least one session," and the Home feed "shows all the
recently uploaded workouts from people you follow."
(b/c) **The weekly (not daily) streak is the key transferable pattern**: a rest
day never threatens it; one session a week keeps it alive. This is the gentlest
streak design in the strength segment and matches our ED-safety posture.
The *social feed* is a second daily reason (others' workouts) — out of scope for
our offline model, but the streak is not.
(d) Moderate; widgets keep the glance off the home screen too (OS widgets).
(e) Generous free tier (val-ext-01-02 #5): streak, calendar, logging free.
(f) **Transferable (very high):** Hevy already proves the exact thing A-02 F-2
flags as missing — a **weekly streak + consistency glance on the home of a
strength app**, free, non-punitive. This is the closest direct competitor
template for our fix.
Verdict **VERIFIED** (two Hevy-owned feature pages, search-indexed; direct
WebFetch bot-blocked — logged). Streak-as-weeks also in val-ext-04-05-07 V4
context.

### 1.8 Peloton — recommendations + weekly streak + schedule

(a) The home answers "what should I do today, and am I on my streak?" Search-
indexed from [pelobuddy.com/.../home-tab-digital](https://www.pelobuddy.com/home-tab-digital/)
and [support.onepeloton.com Navigating the Homescreen](https://support.onepeloton.com/s/article/Peloton-Account-Navigating-the-Homescreen?language=en_US):
"You'll see your streak; in other words, how many weeks in a row and how many
days this week you've used the Peloton platform," plus daily class
recommendations and an upcoming schedule.
(b/c) Streak is **weeks-in-a-row + days-this-week** (a "week so far" glance — the
exact A-02 F-2 gap). Daily recs refresh each Monday morning
([onepeloton.com/blog/personalized-workout-plan](https://www.onepeloton.com/blog/personalized-workout-plan)),
giving a content-led return reason on non-training days.
(d) Fairly dense (categories, schedule, recs) but streak + recs are top.
(e) Free app tier ended (val-ext-01-02 #59) — not a free model to copy.
(f) **Transferable:** the "**X weeks in a row · Y days this week**" streak format
is a clean, glanceable, calendar-week structure that suits our offline schedule
context line, and combines streak with *progress-within-the-week* — richer than a
bare streak number.
Verdict **VERIFIED** (PeloBuddy + Peloton support, search-indexed).

### 1.9 Apple Fitness / Fitness+ — rings as the home, rest that doesn't break streaks

(a) The Summary tab answers "did I close my rings today?" Search-indexed from
[Apple Support: See your activity summary](https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios):
"In the Summary tab, you can see your Activity rings, trends, completed workouts
and meditations, awards, and more," with Move/Exercise/Stand rings, steps,
distance and trends, and "You can personalize the Summary tab… to see what
matters to you." Fitness+ adds a "For You" recommendation row.
(b/c) **The verified rest-day pattern of the whole market** (val-ext-01-02 #56,
fetched iMore): watchOS 11 lets you "pause your Apple Watch rings for a day, a
week, a month, or more… It won't affect your Apple Watch award streaks." Rings
are the daily reason; rest is explicitly shame-free and streak-preserving.
(d) Calm-glance (three rings) + personalisable depth.
(e) Rings free with a watch; Fitness+ paid — the *rings glance* is the free hook.
(f) **Transferable (high):** (i) a **single visual daily-progress glance** (our
analogue: week-so-far / sessions ring); (ii) the canonical **rest-doesn't-break-
the-streak** rule, already verified and partly adopted in our D1/D2 — Home must
honour it visibly.
Verdict **VERIFIED** (Apple support search-indexed + fetched iMore #56). Direct
WebFetch of Apple guide returned only the ToC (JS-rendered) — logged.

### 1.10 MyFitnessPal — calories-remaining glance + new Today tab

(a) "How many calories do I have left?" Search-indexed from
[support.myfitnesspal.com Introducing the brand new Today tab](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab):
the Home screen "shows your daily calorie goal and your remaining calories,"
and the new Today tab adds meal-level macros, a "Healthy Habits" section, and
"your most recently logged weight at the very bottom… which you can tap to jump
to your weight progress."
(b/c) Return reason = the running daily budget; no training/rest concept.
(d) **Cautionary tale on density:** the 2026 redesign split the dashboard into
multiple tabs and drew backlash — "daily totals, remaining calories, and macros
are no longer on a single screen for many users" (community threads;
[platelens.app alternatives](https://platelens.app/blog/myfitnesspal-alternatives-2026)).
A lesson: do not fragment the 5-second answer across tabs.
(e) Free tier exists but is increasingly walled.
(f) **Transferable (as a warning):** keep the single glance *on one screen*;
splitting it is a documented retention risk. Reinforces our hero-first discipline.
Verdict **VERIFIED** (MFP help page search-indexed + independent review). Direct
WebFetch 403'd — logged.

### 1.11 Noom — task-list home (lessons, weigh-in, steps)

(a) "What are today's tasks?" Search-indexed from Noom's own support
([noom.com/support… daily features](https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/how-to-find-and-revisit-your-noom-lessons/)):
"Lessons appear each day under Today's Plan on your home screen," ~"eight tasks
the app asks you to complete," a step progress bar at the top, weigh-in and meal-
logging task cards, "and streaks to keep you motivated."
(b/c) Return reason = the **daily refreshed task list + lesson** (content, not
training). A non-training day still has lessons/weigh-in — a daily anchor even
with no workout.
(d) **Dense and chore-like** — eight to-dos is a lot; this is the over-loaded end
of the spectrum (good contrast to Whoop/Oura calm).
(e) Free tier is thin/funnel-like (per ext-02 patterns).
(f) **Transferable (selective):** the idea that **content/lessons can be a non-
training daily reason** is useful for our free tier (where A-02 F-2 says free
users have *nothing* daily) — but adopt the *single* daily item, not Noom's
eight-task wall.
Verdict **VERIFIED** (Noom support + independent review, search-indexed).

### 1.12 Headspace — the "Today" tab as a daily ritual

(a) "What's today's session?" Search-indexed from
[help.headspace.com What is the new Today tab](https://help.headspace.com/hc/en-us/articles/1260803328650-What-is-the-new-Today-tab-and-how-does-it-work):
"The app launches with your Today tab open, so you can scroll through the day's
suggested meditations, classes and resources right away," with "Today's
Meditation" and "The Wake Up" as daily-refreshed anchors.
(b/c) Return reason = a **fresh, single daily ritual** ("Today's Meditation")
plus a streak. No training concept; the daily anchor is content that changes.
(d) Calm, single-ritual-first.
(e) Limited free.
(f) **Transferable:** the **"app opens to a Today tab whose top item is a single,
fresh daily anchor"** pattern — a strong frame for what our Home's top should be
on a non-training day (a single "today" item, not a pushed workout).
Verdict **VERIFIED** (Headspace help + search corroboration).

### 1.13 Calm / Flo — daily-anchor + forgiving-streak patterns

(a) **Daily Calm**: one fresh ~10-minute session every 24 hours is the anchor.
Search-indexed from [support.calm.com Calm Dailies](https://support.calm.com/hc/en-us/articles/115005140414-What-are-the-Calm-Dailies-Daily-Meditations-Movement)
and [Calm: Home Screen Weekly Progress Goal](https://support.calm.com/hc/en-us/articles/22317868359451-How-to-Manage-the-Home-Screen-Weekly-Progress-Goal):
"a new 10-minute session released every 24 hours," plus "a Weekly Progress Goal
tracker… found on your Calm app home screen," and a streak counter.
(b/c) Return reason = the daily fresh session + **weekly** progress goal (again a
"week so far", not a punishing daily streak). Calm also ships **streak-repair /
edit history** ([Calm: Correct a Broken Streak](https://support.calm.com/hc/en-us/articles/360008704893-How-to-Correct-a-Broken-Streak))
— the same forgiveness pattern our corpus already adopted (D2 surfaced repair).
(d) Calm by design.
(e) Daily Calm has a free daily session as the hook.
(f) **Transferable:** a **weekly progress goal on the home** + forgiving streak
repair is a directly liftable, ED-safe daily-anchor pattern.
Verdict **VERIFIED** (two Calm support pages, search-indexed). (Flo's cycle-day
anchor is the same "today's number changes daily" idea but is domain-specific;
no separate fetch — marked UNVERIFIABLE/not load-bearing.)

### 1.14 Briefly covered (lower depth, corroborated elsewhere)

- **Strong** — home opens to your *templates* to launch a workout fast; a
  profile **dashboard of widgets** you choose ([Strong help: Profile Widgets](https://help.strongapp.io/article/239-profile-widgets);
  [Strong App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577)).
  Minimal, action-first, no rest/daily-glance layer — the *baseline* our Home
  already exceeds.
- **Boostcamp** — home = "start whatever day is next in your routine," exercises/
  sets/reps/last weight laid out (search-indexed,
  [boostcamp.app](https://www.boostcamp.app/)). Like us, it *pushes the next
  workout* — same F-2 gap; not a model for rest days. Confirms our hero is on par.
- **Simple** — "Your daily plan resets each morning, so you're encouraged to
  check in every day and keep your streak going," with rings/trackers and an AI
  coach Avo ([help.simple.life navigating the app](https://help.simple.life/en/articles/9887852-navigating-the-app-overview-of-main-features)).
  Daily-reset plan is the anchor; Avo is gen-AI (not transferable to our
  deterministic engine).
- **Alpha Progression / JuggernautAI / Boostcamp** — plan-pushers; generator is
  Pro on Alpha (val-ext-01-02 #23). No distinctive rest-day home pattern found;
  not separately fetched (UNVERIFIABLE for home specifics — not load-bearing).

---

## 2. Synthesis (a) — repeating winner patterns

1. **A single "today" number/glance at the very top that refreshes daily — and
   does NOT require a workout.** Whoop Recovery dial, Oura Readiness, Garmin
   Morning Report, Apple rings, MFP calories-remaining, Calm/Headspace "today's
   session." This is *the* universal daily-return mechanic.
   URLs: [Whoop home](https://support.whoop.com/APP_FEATURES__COACHING/Understanding_Your_WHOOP_Features/The_All-New_Home),
   [Oura guide](https://liveworksleep.com/oura-app-features/),
   [Garmin report](https://www.shoulditrain.com/blog/garmin-morning-report-explained),
   [Apple summary](https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios).
2. **Rest is a first-class, scored, shame-free state — never an empty hero.**
   Oura/Garmin readiness explicitly recommend rest; Fitbod de-shames an extra
   rest day verbatim; Apple watchOS 11 rest days don't break streaks
   (val-ext-01-02 #56); Fitbod fetched: "take an extra day to recover!"
3. **Weekly (not daily) streak + "week so far".** Hevy (consecutive *weeks*),
   Peloton ("weeks in a row + days this week"), Calm/Apple weekly progress goal.
   The gentlest, most ED-safe streak shape — and exactly the A-02 F-2 gap.
   URLs: [Hevy consistency](https://www.hevyapp.com/features/gym-consistency/),
   [Peloton homescreen](https://www.pelobuddy.com/home-tab-digital/).
4. **Adherence-neutral / forgiving by design.** MacroFactor (no red numbers,
   val-ext-01-02 #81), Calm streak-repair, Apple non-breaking rest. The home
   never punishes a miss.
5. **One ranked glance, customisable depth below — never a wall of equal tiles.**
   Whoop/Oura/MacroFactor/Apple all rank one hero then allow re-ordered widgets;
   MFP's 2026 multi-tab split is the cautionary counter-example.
6. **A daily *content* anchor as the non-training return reason.** Headspace
   "Today's Meditation," Calm Daily, Noom lesson, Peloton daily recs — a fresh
   single item gives a reason to open with zero training intent.

## Synthesis (b) — where Volyume's Home is already AHEAD

- **One-banner discipline.** The mutually-exclusive banner stack (A-02 §1.2)
  enforces a single message; MFP fragmented its glance across tabs and got
  backlash, Noom stacks eight tasks, Garmin can be a wall. Our restraint is a
  genuine edge — closest in spirit to Oura's relevance-ranked Today.
- **Schedule context line.** "Today is a training day / Next session: Thursday"
  (A-02 §1.1) is a calendar-aware glance most strength loggers (Strong, Boostcamp)
  lack — they just push the next day with no week context.
- **Hero-first "one big thing".** The xxl workout-name hero (A-02 §3.1) matches
  the verified best-practice (Whoop dial, Apple rings, MacroFactor hat): one
  dominant glance, depth beneath. Boostcamp/Strong are flatter and less ranked.
- **Adherence-neutral tone already house style** (A-02 §3.2; val-ext-01-02 #81) —
  we already hold the posture other apps had to retrofit.
- **Deterministic coach brief ladder** (recover/caution/back/below-MEV) already
  exists (A-02 §1.3) — we have the *signal* for a rest-day state; we just don't
  render it as one yet.

## Synthesis (c) — ranked pick-ups for BESA and EDDIE (aimed at A-02's 5 frictions)

Mapped to A-02 F-1…F-5; B = Besa (beginner), E = Eddie (elite).

**Top 5 pick-ups (ranked):**

1. **Add a rest-day / non-training hero state** *(fixes F-2; B+E).*
   When the schedule says rest (or the deterministic fatigue signal says recover),
   the hero stops pushing a start and shows a calm "Rest day — back {Day}. Recover
   well." Removes the A-02 §2.5 contradiction (line says rest, hero invites a
   start). Pattern source: Oura/Garmin readiness, Fitbod's verbatim rest
   permission, Apple non-breaking rest. **B** gets reassurance ("rest is part of
   the plan"); **E** gets a precise recover signal he already trusts from the
   coach brief.

2. **Put a weekly streak + "week so far" glance on Home** *(fixes F-2; B+E).*
   A small, glanceable "**N weeks in a row · X of Y this week**" row — *weekly*,
   never punitive daily. Directly modelled on Hevy + Peloton + Calm/Apple weekly
   goal, and constrained by our verified-harm rules (forgiving, ED-suppressed).
   This is the single most-repeated winner pattern we currently lack on Home.
   **B**: a visible reason to come back that one session keeps alive. **E**: a
   consistency metric without daily-streak anxiety.

3. **Give free users a daily return reason** *(fixes F-2 for the free in-between;
   mainly B).* A-02 §3.3 names the weak seam: a free user who *has* trained gets a
   static mid-screen. Add a single fresh daily anchor for free — the weekly streak
   glance (pick-up 2) plus a rotating one-line tip/why (deterministic, from the
   existing free weekly one-liner machinery). Pattern: Headspace "Today's"
   item, Noom's single lesson — but *one* item, not eight.

4. **A configurable, ranked daily glance ("hat") rather than fixed tiles**
   *(addresses F-5 fragility; E-leaning, B-safe).* Borrow MacroFactor's "Dashboard
   Hat" / Oura's relevance ranking: the top glance shows the *single most timely*
   thing (rest state, streak, today's session, or weigh-in) chosen by priority —
   an extension of our one-banner invariant that future-proofs it (F-5 warns the
   invariant rests on a hand-maintained `!showX` chain). **E** can prioritise
   density; **B** keeps the calm default.

5. **Make the last-session glance a real "yesterday/last time" read, plain-English**
   *(fixes F-3; B+E).* Apple/Whoop "My Day" and MacroFactor trend reads show a
   *takeaway*, not raw tonnage. Deep-link to *that* session (not the generic list,
   A-02 §2.4) and add a plain takeaway ("solid session — a touch more than last
   week") instead of "12,400 kg." **B** can finally tell if it was good; **E**
   keeps the number on tap.

(F-1 — the `CoachOutput` route bug — is an internal fix, not a research pick-up;
flagged for the build, no external pattern needed.)

## Synthesis (d) — what EVERYONE has on home that we LACK

1. **A daily-refreshing "today" glance that doesn't depend on training** — Whoop,
   Oura, Garmin, Apple, MFP, Headspace, Calm, Noom, Simple all have one; our Home
   has no equivalent on a non-training/rest day. *(The biggest gap; = F-2.)*
2. **A visible streak / consistency glance on Home** — Hevy, Peloton, Duolingo,
   Apple, Calm, Headspace, Noom, Simple all show it on the home surface; ours
   lives on Progress (A-02 F-2 / prior F6). *(= F-2.)*
3. **An explicit rest / readiness state** — Whoop, Oura, Garmin, Fitbod, Apple all
   render rest as a positive state; ours always pushes the next workout. *(= F-2.)*
4. **A plain-English "last time / today so far" takeaway** — Apple/Whoop My Day,
   MacroFactor trend reads; ours leaks raw kg and under-links. *(= F-3.)*
5. **A daily content/anchor item for non-loggers** — Headspace/Calm/Noom/Peloton;
   our free tier has nothing daily. *(= F-2, free seam.)*

All five map onto A-02's existing frictions — the research confirms the audit
rather than adding new surface area, which is the right outcome.

---

## Fetch-failure log (per protocol)

Direct WebFetch blocked/failed; claim carried by WebSearch-indexed snippets of
the **same primary page** plus ≥1 independent source:

| URL | Failure | Mitigation |
|---|---|---|
| support.whoop.com/.../The_All-New_Home & /s/article/Navigating… | 403 Forbidden | WebSearch snippets of two Whoop-owned pages + whoop.com/thelocker |
| ouraring.com/blog/oura-app-redesign | 301→404 (page moved) | Current Oura support/blog URLs + liveworksleep guide (fetched-equivalent via search) |
| hevyapp.com/features/* | bot-check ("verifying your request") | WebSearch snippets of two Hevy-owned feature pages |
| support.myfitnesspal.com/.../Today-tab | 403 Forbidden | WebSearch snippet of the MFP help page + platelens review |
| support.calm.com/.../Calm-Dailies | 403 Forbidden | WebSearch snippets of two Calm support pages |
| support.apple.com/.../activity-summary (and en-gb mirror) | JS-rendered (ToC only) | WebSearch snippet of the Apple support page + fetched iMore (#56, val-ext-01-02) |
| help.headspace.com/.../Today-tab | 403 Forbidden | WebSearch snippet of the Headspace help page |
| www.fitbod.me/blog (index) | 403 | Individual post fitbod.me/blog/muscle-recovery fetched cleanly |
| www.strava.com/features | nav-chrome only | Not load-bearing; Strava omitted from deep set (feed is social, out of offline scope) |

**Successful direct WebFetches (verbatim content returned):** Duolingo streak blog
(STEP 0), Fitbod muscle-recovery blog, MacroFactor dashboard help article, Garmin
Morning Report guide. **Fetch-failure count: 9 URLs blocked/empty; all mitigated
by ≥1 search-indexed primary + (for load-bearing claims) a second source.** No
claim rests on a blocked fetch alone.

*Research complete. No code changed. Not committed — for orchestrator spot-check
and citation audit before entering the corpus.*
