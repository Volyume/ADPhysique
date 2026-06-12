# Research R-01 — Onboarding, First-Run & Activation: best-in-class vs Volyume

**Ultimate-app mandate · Phase 2 · Area 01.** External research, fetched-source-cited,
targeted at the five friction points and flow map that audit **a-01** found.
Compiled 2026-06-12. British English throughout.

**What this builds on (no re-fetch):** the citation-audited base in
`docs/deep-audit-2026-06-12/validation/val-ext-01-02.md` (2026-06-12). Items already
VERIFIED there — Hevy Trainer/pricing, Fitbod cold-start + 3-workout paywall, BetterMe
quiz length, Ladder quiz→pLTV, Boostcamp free library, Centr Begin, Peloton "You Can
Ride", Fiit 22% group-effort, MacroFactor adherence-neutral, watchOS 11 shame-free
rest — are cited from there and **not re-fetched**. Everything new below carries its own
fetched source. Load-bearing claims carry 2+ independent sources where reached.

---

## STEP 0 — TOOLING PROOF (end-to-end WebFetch, before any research claim)

Fetched live and quoted verbatim:

> "Duolingo's user onboarding begins with the product and ends with optional account
> creation." … "their onboarding flow guides visitors through a quick translation
> exercise, showing how quick and easy it is to learn a new language—_before_ asking
> users to commit to the product with a signup."
> — fetched [goodux.appcues.com/blog/duolingo-user-onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding)

WebFetch returns full page bodies (confirmed against this and ~10 further pages below);
WebSearch returns live 2026 results. Tooling is PROVEN; proceeding non-degraded.

**Fetch-failure log (logged per protocol, all worked around):**
- `help.fitbod.me/.../Getting-Started` — 403 (Fitbod first-run covered via val-ext base + 2 search records)
- `support.whoop.com/.../Your-First-4-Days` — 403 (Whoop calibration covered via 2 search records)
- `hevyapp.com/blog/` — bot wall "verifying your request" (Hevy covered via val-ext base)
- (Earlier dead URL: `growth.design/case-studies/duolingo-user-onboarding` — 404; growth.design's Duolingo material reached via its case-study index + secondary records instead.)

**Total NEW fetch failures this pass: 3** (plus 1 dead URL corrected).

---

## A-01 RECAP — what we are measuring against

Volyume's current first-run (code-verified in a-01):
- **Pro path:** Welcome → Quiz (6 fields, no account) → **deterministic Plan Preview** ("your
  plan biases X", no kcal — honesty) → **account wall** (`pro_signup`) → **Article 9 consent**
  (un-skippable, grants 14-day **cardless** trial) → **5-step ProOnboarding** (re-confirms quiz
  + profile + logistics + goal + recovery/reminders) → **ProSetupComplete reveal** → MainTabs.
- **Free path:** Welcome → account → Article 9 → name-only FirstRun → **FreeStarter** 3-question
  micro-quiz → one deterministic difficulty-0 library plan installed → Home with a ready session.
- The **5 friction points** to attack: **F1** "Eight questions" copy but 6 rendered;
  **F2** Article 9 has no decline path + front-loads ED-surveillance language to every new user
  before any value; **F3** training-day reminders never armed at onboarding (the most
  habit-relevant nudge is off by default for everyone); **F4** pre-account quiz drops
  weak-points + quiz slice never cleared; **F5** trial value-expectation set late/thin + quiz
  funnel fires no telemetry.

---

## PART 1 — PER-APP FIRST-RUN TEARDOWNS (fetched, quoted)

### 1. Duolingo — the canonical "value before account" pattern · DEPTH: HIGH
**First-run:** mascot welcome → set a learning goal → "Why are you learning a language?"
motivation → **a real lesson before any signup**; account creation deferred and offered once
there is progress to save.
- Fetched: *"Duolingo's user onboarding begins with the product and ends with optional account
  creation."* and the gradual-engagement quote above ([goodux/appcues](https://goodux.appcues.com/blog/duolingo-user-onboarding)).
- Corroboration: *"Duolingo uses 'gradual engagement'… postponing registration for as long as
  possible—usually until the moment when users must register in order to progress further"* and
  *"Signup is optional, but becomes increasingly compelling over time as users wish to save their
  progress"* ([userguiding](https://userguiding.com/blog/duolingo-onboarding-ux), [theappfuel](https://theappfuel.com/examples/duolingo_onboarding)).
- A/B record: *"delayed sign-up… performed better than front-loading account creation… doesn't
  bring up signup until the first lesson is completed"* ([theuxologist](https://www.theuxologist.com/psychology-case-study/habit-forming-within-onboarding)).

**Better than Volyume:** Duolingo delivers a *completed unit of core value* (a finished lesson)
before the account wall. Volyume's Quiz→Preview is good — value-shaped output before the wall —
but the Preview is a *promise of a plan*, not a *used* feature. Duolingo earns the signup with a
"you already did this" moment.
**Transferable (deterministic/offline/privacy-safe):** the Plan Preview could go one step further
to a *try-it* moment (e.g. preview the first session's structure, or let a user tick "today's
session done" conceptually) before the wall — fully deterministic, no account, no data sent.

### 2. Headspace — onboard the *why*, anchor the *when* · DEPTH: HIGH
**First-run:** experience level → choose session length → **"what has brought you to Headspace?"**
(intent) → **when would you like to meditate**, anchored to *existing routines* → recap + start.
- Fetched verbatim: *"Instead of choosing a specific time of day, the suggested times are based on
  existing routines. Anchoring meditation sessions to the users' current routines makes it much
  more likely they'll turn meditation into a habit, further reducing friction."*
  ([goodux/appcues](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence)).
- Same source: onboarding *"helps users think inwardly to understand why they're meditating…
  set personal goals based on what brought them to Headspace and then build [it] into their daily
  routines."*

**Better than Volyume:** Headspace **asks the motivation/identity question** ("why are you here")
and **anchors the habit reminder to an existing routine** ("after I brush my teeth"), not an
abstract clock time. Volyume's ProOnboarding sets a 07:00 morning-weight default and a check-in
day, but never asks the *why*, and never anchors the (missing — F3) training nudge to a routine.
**Transferable:** add a single "what brought you here / what does winning look like" intent prompt
to the quiz (deterministic, drives copy + plan bias, no AI); and when arming the training-day
reminder (the F3 fix), offer routine-anchored timing ("remind me when I usually train") rather
than only a clock picker. Directly addresses **F3** and the mandate's "welcoming" lens for Besa.

### 3. Calm — breathe first, *skippable* quiz, friction sequenced last · DEPTH: HIGH
**First-run:** purple "take a deep breath" screen → multi-select "what are you looking for" →
"how comfortable are you with meditation" → **then** account → **then** $69.99/yr with **7-day
trial**. The personalisation quiz is *skippable* so users can start immediately.
- Fetched verbatim: *"Calm starts off by promoting users to take a big ol' deep breath."* …
  *"Now that users are relaxed from their deep breath and excited about all of the possible
  benefits, it's time to create an account."* … *"Next up, a bit of necessary friction. At this
  point, users agree to the $69.99/year charge, but the 7 day free trial helps to limit the
  concern."* ([goodux/appcues](https://goodux.appcues.com/blog/calm-app-new-user-experience)).
- Skip option corroborated: *"The quiz can also be skipped, which is a nice option if users want
  to start meditating straight away."* ([userjourneys](https://www.userjourneys.blog/blog/calm) via search record).

**Better than Volyume:** (a) Calm opens with a *felt* value moment (a breath) before any cognitive
work — an emotional on-ramp Volyume lacks; (b) the quiz is **skippable** — autonomy preserved for
the impatient. Volyume's Quiz is short but the *first* screen a Pro user meets is a question grid;
the *first* screen a Free user meets after account is the **Article 9 wall** (F2) — the opposite of
a warm open.
**Transferable:** open Welcome/quiz with a one-line *felt* framing before the grid (already partly
present — "Less thinking. More lifting." — but it's a tagline, not an experienced moment); and make
the quiz explicitly skippable to a sensible default (mirrors Calm's autonomy; helps Eddie skip,
helps Besa not freeze). Sequencing the *necessary friction last* is the headline lesson for **F2**:
Calm earns relaxation and excitement before asking for commitment — Volyume front-loads its
heaviest friction (consent) before any value on the Free path.

### 4. Noom — long quiz as commitment engine; account gate mid-flow · DEPTH: HIGH
**First-run (web-to-app):** ~**100+ screens / up to 113**, 10–15 min; health questions →
behavioural/psychological slider quiz → email gate **about a third of the way through** (before
results) → processing "results-building" theatre → goal-date graph → **pay-what-you-want 14-day
trial** price selection near the very end.
- Fetched verbatim: *"By the time Noom shows pricing, users have already invested time, effort,
  and emotional energy — a proven driver of paywall conversion."* … the email gate appears
  *"about a third of the way through… before results are shown, not after account creation."*
  ([revenuecat teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)).
- Corroboration: *"Noom's pre-paywall onboarding runs to 100+ screens, covering health history,
  behavioral patterns, and emotional relationship with food"* and the hard all-or-nothing paywall
  ([nutrola](https://nutrola.app/en/blog/is-noom-free-anymore) via search; [fortune](https://fortune.com/article/noom-review/)).
- Sunk-cost articulation: *"Every question answered is another reason not to quit. The longer the
  quiz, the harder it becomes to walk away without seeing what's behind the paywall."* and *"The
  animated results-building sequence between quiz completion and paywall is not decorative — it's
  conversion architecture."* ([web2appworld](https://web2appworld.com/breakdowns/noom/)).

**Better than Volyume — and where it's a cautionary tale:** Noom's *commitment-through-investment*
is the most extreme version of what Volyume's Quiz-first does deliberately at a fraction of the
length. The transferable craft is the **processing/"building your plan" theatre as conversion
architecture** — Volyume *has* this (the honest 4×800 ms "Building your plan" sequence) but uses it
only at the very end of a 5-step machine, not as a payoff that justifies the asking. The
**cautionary** half (already flagged in val-ext): Noom's hard all-or-nothing paywall + no free tier
earns hostile sentiment; Volyume's cardless trial + genuinely-free path is the right contrast.
**Transferable:** keep Volyume short, but treat the Preview reveal as Noom treats its results screen
— the *moment the asking pays off*. And **collapse re-asking**: Noom never asks the same thing
twice; Volyume's quiz→ProOnboarding re-confirmation (a-01 §1.2.6, the F4 territory) is the opposite.

### 5. Simple — thorough quiz, **soft paywall, no trial**, free coach replies · DEPTH: HIGH
**First-run:** long personalisation quiz → personalised plan → paywall to unlock (50% discount,
per-week price framing, testimonials on the wall). **No free trial**; the free tier is reachable by
closing the paywall, and gives **up to two free Avo coach replies/day**.
- Fetched verbatim: *"Monetization is introduced at the end of the extensive onboarding quiz. After
  building a personalized plan, the user is presented with a paywall (03:32) to unlock it."* …
  *"There is no free trial offered in this flow."* … the wall *"highlights a 50% discount and breaks
  down the price per week… Testimonials are included directly on the paywall to build trust."*
  ([screensdesign](https://screensdesign.com/showcase/simple-weight-loss-coach)).
- Free-tier + Avo: *"you can get up to two free replies per day from AVO… Premium users get
  unlimited replies"* ([nutriscan](https://nutriscan.app/blog/posts/simple-app-pricing-2026-free-vs-premium-coaching-20a26c6873) via search).

**Better than Volyume:** Simple puts **testimonials/social proof directly on the conversion screen**
and frames price **per week**. Volyume's Plan Preview fine print is honest ("No card. Nothing charged
unless you choose.") but carries no social proof and no price-anchoring at the moment of decision.
**Transferable:** add lightweight, honest social proof + a clear "what the trial unlocks, what it
costs after" line at the Preview/trial-grant moment — partially the **F5** fix (value-expectation set
too late/thin). The **metered-free-coach** idea (2 replies/day) is a strong free-tier pattern, but
Volyume's coach is deterministic + Pro-gated by design — not directly transferable without breaking
gating; note it only as a free-tier *generosity* signal.

### 6. Fitbod — instant first workout, but cold-start behind a paywall · DEPTH: HIGH (base + search)
**First-run:** onboarding quiz (goal, experience, equipment, split/duration prefs) → **a first
workout in <5 min, no blank screen** + muscle-recovery map. Personalisation needs **10–15 workouts**
to mature; **3 free workouts then a hard $15.99/mo paywall, no card for the 3** (val-ext #20–22,
VERIFIED there). Search corroboration: *"it takes less than five minutes to set up… from day one,
Fitbod builds workouts that make sense for you with no generic plan"* ([autonomous review](https://www.autonomous.ai/ourblog/fitbod-app-review) via search).

**Better than Volyume:** day-0 *no-blank-screen* answer is excellent — and Volyume now matches it on
**both** tiers (FreeStarter for free, generated plan for Pro). Fitbod's cold-start is *worse* than
Volyume's deterministic plan, which is good on session one rather than "feeling random" for 10–15
sessions.
**Transferable / already-ahead:** this is a place Volyume is **ahead** — deterministic preview is
good immediately and the trial is cardless; Fitbod's is paid and cold-starting. Pick-up: Fitbod's
*recovery-map* visual as a first-run "here's why this session" artefact (deterministic) could
enrich the reveal for Eddie.

### 7. Hevy / Boostcamp / Strong / Alpha — the logger first-run spectrum · DEPTH: MED
- **Hevy:** account → Trainer asks "a few questions" → generates a multi-week programme with
  starting-weight recs (val-ext #1–3, VERIFIED). Free tier keeps a 26-programme library; Trainer is
  Pro ($23.99/yr).
- **Boostcamp:** *"download the app, create an account, and choose a program"* — **account is
  required**, then pick from 11,000+ free programmes; *"no locked programs"* on the core tracker
  ([boostcamp.app/](https://www.boostcamp.app/) + val-ext #12–13). First-run value = *picking* a
  named programme, which demands programme-literacy (a barrier for Besa).
- **Strong:** quickstart pattern — minimal setup, **start logging immediately**, no long quiz;
  free = 3 custom routines (val-ext #47, corrected). Represents the "don't make them answer
  anything" school.
- **Alpha Progression:** steep learning curve; **plan generator is Pro-only**, free = logging
  without a plan (val-ext #23–24). Worst day-0 for a beginner of this set.

**Better than Volyume:** Strong's *zero-friction quickstart* (log in 60 seconds) is something
Volyume's flow can't match for the "just let me lift" user — every Volyume path passes the consent
wall first.
**Transferable:** offer a genuine **"skip setup, just start"** escape on the Free path (a quickstart),
consistent with Calm's skippable quiz — relieves F2's heaviness for the impatient.
**Already-ahead:** vs Boostcamp/Alpha, Volyume's deterministic *recommendation* removes the
programme-picking literacy tax (Besa is told what to do; she doesn't browse 11,000 options).

### 8. Class/coaching apps — NTC, Peloton, Sweat, Centr, Ladder · DEPTH: MED
- **Nike Training Club:** fully free since 2020, **no paywall**, *"begin training immediately"* with
  185+ free workouts ([nike help/search](https://wellness.alibaba.com/fitlife/is-nike-training-club-still-free-) + val-ext #48/#51). Lowest commitment ask in the segment; monetises via the commerce flywheel.
- **Peloton:** ended its **free app tier** because *"the free tier was 'cannibalizing' efforts to
  convert free-trial members to paid subscribers"*; standard trial *"limited to one week"*; App One
  $12.99, App+ $24 ([pelobuddy](https://www.pelobuddy.com/free-app-tier-ending/)). Onboarding value =
  guided beginner journeys ("You Can Ride", bronze/silver/gold badges — val-ext #57).
- **Sweat / Centr:** optional beginner soft-starts (Sweat's **eight optional** beginner weeks, not
  mandatory — val-ext #68 corrected; Centr Begin 3-week absolute-beginner programme with warm coach
  copy — val-ext #61). Both lead newcomers into a *named beginner journey*, not a cold plan.
- **Ladder:** onboarding **quiz predicts each new user's LTV** (val-ext #28, VERIFIED); now ~400k
  members, 80% women (val-ext Part 3). Quiz-first as a growth machine — the validated precedent
  behind Volyume's quiz-first flip.

**Better than Volyume:** Peloton/Centr/Sweat frame the beginner's first weeks as a **named, bounded
journey with a finish line and badges** ("You Can Ride", "Begin", "8 beginner weeks") — a
psychological container Besa lacks. Volyume installs a starter *plan* but doesn't frame the first
2 weeks as a *named arc with an end and a reward*.
**Transferable (deterministic, offline):** wrap the FreeStarter/Pro first block in a named,
bounded **"first 2 weeks" arc** with completion milestones (the D1 milestone ladder already built —
val-ext (d) — extends naturally to this). High impact for Besa; honest framing of "learning the
movements counts as progress" (Volyume already says this — FreeStarter copy, a-01 §3).

### 9. Wearables — Whoop & Oura: *naming the cold-start* · DEPTH: MED
- **Whoop:** explicit **4-day calibration**, full baseline at 30 days; *"Over the next 2-3 days, the
  system will be learning more about your baseline metrics… your physiology is very unique to you,
  therefore the system needs to take some time to get to know you"*, with a chain of educational
  emails across the first days; Day-4 unlock of coloured Recovery
  ([whoop support/search](https://support.whoop.com/hc/en-us/articles/360057137353-What-to-Expect-in-Your-First-30-Days); primary 403'd, 2 search records).
- **Oura:** scores after the **first night**, baselines over **~2 weeks (14 days)**, advanced
  insights (Resilience, Chronotype) unlock later; *"resilience… is shown after a 2-week baseline"*
  ([everydayindustries teardown](https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/)).
  Teardown praises the warm tone: *"it felt like a supportive friend instead of a fitness coach"*;
  criticises fragmented setup.

**Better than Volyume:** both **set the cold-start expectation explicitly and warmly** ("we need a
few days to get to know you; that's normal"). This is the exact pattern Volyume's coaching engine
needs — the deterministic coach is *least* informed in week 1 and gets better as data arrives, yet
a-01 found **no week-1 expectation anchor** (F5: value-expectation set late/thin) and no "first
review ~day 7, first adjustment ~day 14" framing despite `trialBannerLine` supporting it.
**Transferable:** an honest "here's what unlocks when" timeline on the reveal — *"Your first weekly
review lands ~day 7; your first coaching adjustment ~day 14; the coach gets sharper as you log."*
Deterministic, true, privacy-safe. Directly the **F5** fix and reusable across the trial.

### 10. Strava / Cronometer / Lose It — account-first utilities · DEPTH: MED
- **Strava:** **account first** (email/Google/Facebook) → profile (primary sport, metrics, privacy)
  → following athletes is **optional**, not required before first activity
  ([strava support/search](https://support.strava.com/hc/en-us/articles/115000173484-Following-Athletes-on-Strava)).
- **Cronometer:** sign-up → details (used to calc targets) → sliders for activity + goal → email
  validation → start; **free tier is generous** (logging, biometrics, barcode scanner all free)
  ([cronometer support/search](https://support.cronometer.com/hc/en-us/articles/360021677792-Mobile-Quick-Start-Guide)).
- **Lose It:** profile → current weight → goal weight + target date → **calorie budget** computed;
  *"gentler onboarding"* than MyFitnessPal, free tier covers basic logging
  ([calorie-trackers review/search](https://calorie-trackers.com/reviews/lose-it/)).

**Better than Volyume:** these are *account-first* and accept it as a cost of being a sync utility —
not a model to copy. Their lesson is **immediate, generous free utility** after the gate
(Cronometer's free barcode scanner; Lose It's free logging). Volyume already gates correctly per its
free/Pro model; nothing to import that would break gating.
**Already-ahead:** Volyume's quiz-first defers the account wall behind a value preview — *better* than
Strava/Cronometer/Lose It's account-first walls for the nervous newcomer.

---

## PART 2 — CROSS-CUTTING PATTERN: permission asks (the F3 lever) · DEPTH: MED
The universal best-practice, fetched: **prime before the OS dialog, ask in-context, never at launch.**
- Fetched verbatim: ask permissions *"only when absolutely necessary and only after ensuring that
  users understand how granting this access will benefit them"*; a pre-permission dialog produced
  *"nearly universal grant rates compared to zero grants when users saw only the system dialog"*
  ([appcues](https://www.appcues.com/blog/mobile-permission-priming)).
- Corroboration: *"Apps that defer permission prompts see 28% higher grant rates"* and a custom
  explanation *"can improve grant rates by up to 81%"* ([dogtownmedia](https://www.dogtownmedia.com/the-ask-when-and-how-to-request-mobile-app-permissions-camera-location-contacts/) via search;
  [appcues academy](https://www.appcues.com/product-adoption-academy/mobile-app-onboarding-101/priming-users-to-grant-mobile-apps-permission)).

**Relevance to Volyume:** a-01 found ProOnboarding step 5 requests notification permission only if a
toggle is on (good — in-context), but **training-day reminders are never armed at all** (F3) — so the
single most habit-relevant nudge never even reaches the priming moment. The pattern says: prime the
*training-day* reminder with a value sentence and arm it at plan-gen.

---

## PART 3 — SYNTHESIS

### (a) Patterns that repeat across the winners (with apps + fetched URLs)
1. **Value before the account wall.** Duolingo finishes a lesson pre-signup
   ([goodux](https://goodux.appcues.com/blog/duolingo-user-onboarding)); Calm earns a breath +
   excitement, *then* asks ([goodux](https://goodux.appcues.com/blog/calm-app-new-user-experience));
   Headspace onboards the *why* first ([goodux](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence)).
2. **Onboard the *why*, not just the *what*.** Headspace + Calm both ask "what brought you here"
   ([goodux ×2 above]); it drives personalisation *and* intrinsic motivation.
3. **A bounded, named beginner journey with a finish line + reward.** Peloton "You Can Ride"
   bronze/silver/gold (val-ext #57); Centr Begin 3-week arc (val-ext #61); Sweat optional 8 beginner
   weeks (val-ext #68).
4. **Name the cold-start, warmly.** Whoop 4-day calibration "the system needs to get to know you"
   ([whoop](https://support.whoop.com/hc/en-us/articles/360057137353-What-to-Expect-in-Your-First-30-Days));
   Oura 2-week baseline ([everydayindustries](https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/)).
5. **Investment-then-payoff, with the build/processing screen as the payoff.** Noom 100+ screens →
   results theatre ([revenuecat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/),
   [web2appworld](https://web2appworld.com/breakdowns/noom/)); Simple quiz → unlock-your-plan wall
   ([screensdesign](https://screensdesign.com/showcase/simple-weight-loss-coach)); BetterMe 26-question
   marathon (val-ext #71).
6. **Skippable personalisation / quickstart escape.** Calm's quiz is skippable
   ([userjourneys/search]); Strong starts logging immediately (val-ext #47).
7. **Prime permissions in-context, never at launch.** ([appcues](https://www.appcues.com/blog/mobile-permission-priming)).
8. **Social proof + per-week price framing *on* the conversion screen.** Simple
   ([screensdesign](https://screensdesign.com/showcase/simple-weight-loss-coach)); BetterMe (val-ext #71).
9. **Generous, useful free tier as anti-backlash** — Boostcamp free library, NTC fully free,
   Cronometer free scanner — versus Noom/Simple hard walls earning hostility (val-ext + above).

### (b) Where Volyume is ALREADY ahead (honest)
- **Cardless 14-day trial.** Peloton trial is now 7 days and it *killed* its free tier to stop
  cannibalisation ([pelobuddy](https://www.pelobuddy.com/free-app-tier-ending/)); Fitbod's 3 free
  workouts then a hard card-or-nothing wall (val-ext #22); Noom hard all-or-nothing
  ([nutrola/search]); Simple has **no trial** ([screensdesign]). Volyume's "No card. Nothing charged
  unless you choose." is more generous than this entire cohort.
- **Deterministic preview that is *good on session one*.** Fitbod's output *"often feels randomized"*
  and needs 10–15 workouts (val-ext #21); Volyume's plan is honest and correct immediately.
- **No-LLM, privacy-first, in-memory pre-account quiz** (answers never persisted/transmitted, a-01
  §1.2) — the opposite of Noom/BetterMe/Simple sending quiz data to a web funnel before you've paid.
- **A genuinely free guided on-ramp** (FreeStarter) that *tells* the beginner what to do — vs
  Boostcamp/Alpha demanding programme-picking literacy, BetterMe/Simple/Noom funnelling free users
  toward a wall. Volyume's free path lands on a ready session.
- **Honest loading + honest preview** (no fake kcal in the preview; "Building your plan" maps to real
  generation phases — a-01 §3) — most competitors use *processing theatre* as pure conversion
  architecture ([web2appworld](https://web2appworld.com/breakdowns/noom/)).
- **No ads.**

### (c) Pick-ups ranked by expected activation impact

**For Besa (nervous newbie):**
1. **Sequence the heaviest friction LAST + add a warm felt-open** (Calm). Don't make Article 9 the
   first thing a Free beginner meets after account; lead with a value/identity moment, defer consent
   to the point it's actually needed. (Attacks **F2**; mandate "welcoming" lens.) — **HIGHEST**
2. **Frame the first 2 weeks as a named, bounded journey with milestones** (Peloton/Centr/Sweat).
   Wrap FreeStarter's plan in a "Your first 2 weeks" arc with the already-built D1 milestone ladder
   as the reward. — **HIGH**
3. **Name the cold-start warmly + add a "what unlocks when" timeline** (Whoop/Oura). "First review
   ~day 7, first adjustment ~day 14; the coach sharpens as you log." (Attacks **F5**.) — **HIGH**
4. **Onboard the *why*** with one intent question + **routine-anchored** reminder timing
   (Headspace). Also arms the missing training nudge. (Attacks **F3**.) — **MED-HIGH**
5. **Skippable quiz / quickstart escape** (Calm/Strong) so a frozen beginner can "just start". — **MED**

**For Eddie (competitor):**
1. **Kill the double-asking** (Noom never repeats a question): make ProOnboarding *confirm*, never
   *re-ask*, what the quiz already captured — incl. carrying weak-points pre-account so the preview
   isn't empty. (Attacks **F4**; the re-confirmation drag a-01 flagged for Eddie.) — **HIGHEST**
2. **A "why this plan, for you" + recovery-map artefact at the reveal** (Fitbod recovery map; Whoop
   education) — deterministic credibility, fast. Volyume has `whyThis`; add the visual. — **HIGH**
3. **"What unlocks when" timeline** (shared with Besa #3) — Eddie wants to know exactly when the
   precision arrives. (Attacks **F5**.) — **HIGH**
4. **Social proof + clear trial→price line on the Preview/grant moment** (Simple). — **MED**
5. **Funnel telemetry** — fire `quiz_open/quiz_done/account` events so the quiz-first flip is
   measurable (a-01 F5 second half). — **MED (enabling, not user-facing)**

**Top 5 transferable pick-ups overall:**
1. Sequence consent/heavy friction **last**; warm felt-open before it (Calm) — **F2**.
2. **Confirm-don't-re-ask** across quiz→ProOnboarding; carry weak-points pre-account (Noom/F4).
3. **Named bounded "first 2 weeks" journey** with milestone rewards (Peloton/Centr) — Besa container.
4. **Honest "what unlocks when" cold-start timeline** + arm the training-day reminder in-context
   (Whoop/Oura + appcues priming) — **F5 + F3**.
5. **Onboard the *why*** (one intent question) + **social proof/price clarity at the decision point**
   (Headspace + Simple).

### (d) What everyone has that Volyume lacks entirely
- **An intent/"why are you here" question** that personalises *and* motivates — Headspace, Calm,
  Noom, BetterMe all ask it; Volyume's quiz captures *what/how you train* but never *why*.
- **A named, bounded beginner journey with a visible finish line** — Peloton/Centr/Sweat all have
  one; Volyume installs a plan but frames no arc/end/reward for the crucial first two weeks.
- **An explicit cold-start expectation-set** ("we need a few days/weeks to get to know you; that's
  normal") — universal among data-driven products (Whoop, Oura, MacroFactor, Fitbod); Volyume's
  deterministic coach is least-informed in week 1 yet says nothing about it.
- **Social proof at the conversion moment** — Simple/BetterMe put testimonials on the wall; Volyume's
  Preview/trial moment has none.
- (Lesser) **A true quickstart / skippable-setup escape** — Strong/Calm offer it; every Volyume path
  is gated through consent first.

*Note on AI gap (out of scope to copy):* the segment is converging on AI/LLM coaching layers (Hevy
Trainer, Freeletics Coach+, Peloton IQ, Apple Workout Buddy — val-ext Part 3). Volyume's deterministic
no-LLM stance is a deliberate, defensible *contrast*, not a deficiency — but the *onboarding* job of
explaining "why no-AI is a feature" is a copy task none of these pick-ups requires breaking.

---

## Source ledger (fetched this pass, full bodies)
1. [goodux/appcues — Duolingo](https://goodux.appcues.com/blog/duolingo-user-onboarding) (tooling proof + P1.1)
2. [goodux/appcues — Headspace](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence)
3. [goodux/appcues — Calm](https://goodux.appcues.com/blog/calm-app-new-user-experience)
4. [RevenueCat — Noom web-to-app funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)
5. [web2appworld — Noom breakdown](https://web2appworld.com/breakdowns/noom/)
6. [screensdesign — Simple](https://screensdesign.com/showcase/simple-weight-loss-coach)
7. [everydayindustries — Oura onboarding](https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/)
8. [pelobuddy — Peloton free tier ending](https://www.pelobuddy.com/free-app-tier-ending/)
9. [appcues — permission priming](https://www.appcues.com/blog/mobile-permission-priming)
10. [boostcamp.app](https://www.boostcamp.app/) (account-required first-run)

Plus search-record corroboration (2+ independent where load-bearing) cited inline for Whoop,
Fitbod, NTC, Strava, Cronometer, Lose It, BetterMe, and the val-ext-01-02 verified base.

**Fetch failures (3):** help.fitbod.me (403), support.whoop.com first-4-days (403),
hevyapp.com/blog (bot wall). 1 dead URL corrected (growth.design Duolingo case-study 404).

*No code changed. Not committed.*
