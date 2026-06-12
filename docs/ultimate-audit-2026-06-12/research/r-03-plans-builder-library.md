# r-03 — Plan acquisition & building: best-in-class research

> ULTIMATE-APP MANDATE, Phase 2, Area 03. Aimed at `audit/a-03-plans-builder-library.md`.
> Method: live WebSearch + WebFetch, 2026-06-12. Every competitive claim carries a
> fetched-source URL; load-bearing claims carry 2+. Failed fetches logged per-URL in §6.
> Verified base reused without re-fetch: `docs/deep-audit-2026-06-12/validation/val-ext-01-02.md`
> (Hevy Trainer Feb 2026 $23.99/yr; Boostcamp ~12k programmes; Fitbod cold-start /
> 3-workout paywall; Caliber tiers — all VERIFIED there).
> British English throughout. NOT committed.

---

## STEP 0 — TOOLING PROOF (verbatim quote + URL)

Fetched `https://www.juggernautai.app/` (JuggernautAI homepage). Verbatim from the page:

> "Tell our system all about yourself and your goals including gender, age, size,
> strength, experience, recovery, and so much more." … "From then on our proprietary
> algorithms will work towards building the smartest program for you."

WebFetch returned live page content end-to-end. Tooling proven. Proceeding.

---

## 1. PER-APP TEARDOWNS — nothing → active plan

Each entry: questions (count + order), time-to-active, how days/equipment/experience
**bind** the output, beginner guard-rails, manual depth, per-session time, preview,
editing an active plan, free-vs-paid placement. Depth, not count.

### 1.1 JuggernautAI — deepest binding of inputs (powerlifting/strength)
- **Questions:** gender, age, size, strength (current maxes on the big lifts), experience,
  goals (peak for a meet vs general strength), **days/week (2–5; Strongman 4–6)**, meet
  date, equipment, recovery. A substantial questionnaire (~10+ fields).
- **Binding:** days/week is **load-bearing** — "The system will optimize when and how
  often you should Squat, Bench, and Deadlift based on how many days a week you want to
  train." Maxes set starting loads; meet date sets the periodisation taper. This is the
  cleanest example of *days-per-week actually changing the output*.
- **Ongoing:** Daily Readiness Rating + end-of-session/week/block check-ins feed
  set-to-set, day-to-day, week-to-week, block-to-block, program-to-program adjustment.
- **Free/paid:** subscription app (~$35/mo per segment norms; not re-priced this pass).
- Sources: [juggernautai.app](https://www.juggernautai.app/) (fetched),
  [jtsstrength.com/how-juggernautai-works](https://www.jtsstrength.com/how-juggernautai-works/) (search record).

### 1.2 RP Hypertrophy — template-first mesocycle builder (hypertrophy)
- **Entry:** you land on a **"plan a new mesocycle"** page (start, or after finishing a
  cycle). Three routes: **preset → Find A Template → Build A Mesocycle From Scratch**.
- **Template setup:** set **number of days**, **sex**, and **emphasis** (which muscles to
  prioritise); 45+ templates, exercises preloaded. Equipment is customisable if limited.
- **Binding:** days + sex + emphasis bind which template/volume you get; the engine then
  adjusts volume/intensity across a **4–6 week mesocycle + deload** from your logged
  pump/soreness/workload feedback week-by-week.
- **New "Meso Builder":** "you tell the app what you want to prioritize and it builds a
  complete program around those goals."
- **Friction (verified by reviews):** "presets" are actually preset *templates*, "more
  complicated than expected" — not ready-to-go programmes; a real beginner-literacy tax.
- **Free/paid:** $34.99/mo or $299.99/yr — the most expensive in the set.
- Sources: [rpstrength.com/pages/hypertrophy-app](https://rpstrength.com/pages/hypertrophy-app) (fetched),
  [hypertrophy.zendesk "Where to start"](https://hypertrophy.zendesk.com/hc/en-us/articles/32430129362327-Where-to-start) (403, content via search record),
  [dr-muscle.com RP critique](https://dr-muscle.com/rp-hypertrophy-app-critique/) (search record).

### 1.3 Fitbod — instant day-0 answer, cold-starts behind a paywall (auto-generator)
- **Questions (order):** fitness **goal** (get stronger / build muscle / get lean / lose
  weight) → **experience** (beginner / intermediate / advanced) → **equipment** (full gym
  / home gym / minimal) → **split + session structure** (full-body, upper/lower, PPL,
  duration, cardio, warm-up/cool-down, supersets).
- **Time-to-active:** essentially immediate — "from day one, Fitbod builds workouts that
  make sense for you with no generic plan." First workout designed to fit **15–20 min**:
  warm-up 2 min / 3–4 exercises ~12 min / cool-down 2 min — **an explicit per-session
  time budget**.
- **Binding:** equipment is a hard filter ("not recommending leg presses if you're only
  working with kettlebells"); goal + level (set by in-house trainers) gate exercise
  appropriateness; recovery model rotates muscles.
- **Cold-start caveat (VERIFIED in val base):** real personalisation needs 10–15 workouts;
  early output "often feels randomized."
- **Free/paid:** 3 free workouts then a hard paywall ($15.99/mo, $95.99/yr). The good
  day-0 answer is **paid**.
- Sources: [fitbod.me/blog/fitbod-algorithm](https://fitbod.me/blog/fitbod-algorithm/) (search record),
  [fitbod.zendesk Getting Started](https://fitbod.zendesk.com/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide) (search record; 403 on direct fetch),
  val-ext-01-02 #20–22 (VERIFIED).

### 1.4 Alpha Progression — generator with a huge input surface (logger + generator)
- **Inputs (gym profile):** **training frequency (days/week)** — asked first/early —
  experience, equipment (extensive list; mark only what you have, plus "always available"
  exercises), gender, age, weight, **workout length**, muscle focus/ignore, plan cycle.
- **Binding:** "well over 1,000 quadrillion input combinations" — equipment is a hard
  filter; frequency, duration and muscle focus shape the split and volume. **Beginner
  steer:** "Most beginners should start with two to three weekly workouts" (advisory, not
  a hard floor in evidence).
- **Editing:** after generation you keep "the freedom to adjust any of the training
  variables"; generated workouts are saved and repeatable.
- **Free/paid:** generator + recommendations are **Pro** ($12.99/mo, $79.99/yr, 14-day
  trial); free tier is basic logging with no plan. Reviews flag a steep learning curve.
- Sources: [alphaprogression.com/en](https://alphaprogression.com/en) (search record),
  [fitnessdrum.com Alpha review](https://fitnessdrum.com/alpha-progression-app-review/) (fetched: "available equipment, age, weight, experience, length of workout, how many days a week you want to train, any muscles you want to focus on or ignore and plan cycle"),
  [hotelgyms how-to-use](https://www.hotelgyms.com/blog/how-to-use-alpha-progression) (search record),
  val-ext-01-02 #23–24 (VERIFIED).

### 1.5 Hevy Trainer — deterministic, transparent generator (Feb 2026, mass-market)
- **Flow:** tap "Start with Hevy Trainer" → "asked some questions" → generates a complete
  program with **workouts, exercises, rep ranges, rest periods, starting-weight
  recommendations, and helpful tips**; you can pick **one priority muscle group**.
- **Inputs:** goals, experience, available equipment, **workout frequency**, time
  constraints. Frequency + time bind the split and session length.
- **Determinism + reasons (directly relevant to Volyume's positioning):** "The programs
  are generated using an algorithm, and do not rely on AI… Trainer is informed by
  exercise science research… there's a reason behind every programming decision, whether
  it's exercise selection, rep ranges, built-in rest periods." This is the closest peer to
  Volyume's deterministic-with-visible-reasons stance — and it shipped as a **headline
  feature**, not a hidden one.
- **Free/paid (VERIFIED in val base):** Trainer is **Pro** ($23.99/yr); free tier keeps a
  26-programme library, 4 routines, basic history.
- Sources: [hevyapp.com/announcing-hevy-trainer](https://www.hevyapp.com/announcing-hevy-trainer/) (search record; vendor host bot-blocked),
  [help.hevyapp.com Trainer Explained](https://help.hevyapp.com/hc/en-us/articles/38385724273047-Hevy-Trainer-Explained-How-It-Builds-Your-Workout-Program) (403; content via search record),
  val-ext-01-02 #1–5 (VERIFIED).

### 1.6 Boostcamp — pick-a-programme, no generator, ~12k programmes (template ecosystem)
- **Flow:** "Download Boostcamp, pick any of 11,000+ programs, and the full tracker, plate
  calculator, and PR analytics come with it." No questionnaire — you **choose** a named
  programme (GZCLP, nSuns, 5/3/1, Reddit PPL, StrongLifts 5×5, Greg Nuckols Beginner).
- **Binding via the programme, not a quiz:** each programme states its own experience band
  and day options — GZCLP "beginner/early novice… we recommend 3 days/week… 4 days if more
  experienced"; nSuns "novice/intermediate… at least 6 months… 4–6 days"; Greg Nuckols
  Beginner for complete beginners. The **difficulty floor lives in editorial curation**,
  not in code.
- **Auto-progression:** "weights adjust automatically based on your performance, and if you
  hit your reps, the app increases the load next session."
- **Free/paid (VERIFIED in val base):** the whole library + tracker is **free, no time
  limit**; Pro ($59.99/yr) adds 20+ exclusive coach programmes, a per-muscle volume
  heatmap and a Strength Score.
- **Cost:** requires programme-picking literacy — a beginner must *know* what GZCLP is.
- Sources: [boostcamp.app/free-workout-app](https://www.boostcamp.app/free-workout-app) (fetched),
  [boostcamp.app GZCLP](https://www.boostcamp.app/coaches/cody-lefever/gzcl-program-gzclp) + [nSuns](https://www.boostcamp.app/coaches/r-fitness/nsuns-linear-progression) (search records),
  val-ext-01-02 #12–18 (VERIFIED).

### 1.7 Apple Fitness+ custom plans — the cleanest manual builder UX (class platform)
- **4 ordered taps, then preferences:** (1) tap the **days** you want to work out; (2)
  **Total Time Per Day** (10–90 min); (3) **Length of Plan** (2–8 weeks); (4) **up to 5
  activity types** (HIIT, Yoga, Core, Pilates, Strength, Treadmill, Cycling, Rowing,
  Dance, Kickboxing, Mindful Cooldown); then preferred **trainers + music genres** and a
  **start date**.
- **Binding:** every choice binds — days set the schedule, time-per-day filters class
  length, activities filter the class pool. Bounded, explicit, no jargon.
- **Editing an active plan:** Plans/For You → View Plan → **Swap a workout** (Choose
  Workout on a scheduled day), or More → Plan Details / Rename Plan. Swaps are scoped to
  the scheduled day.
- **Per-session time:** explicit and primary (10–90 min, user-chosen).
- **Free/paid:** Fitness+ subscription ($9.99/mo). No deterministic strength *progression*
  — it schedules classes, not loads.
- Sources: [support.apple.com Use Custom Plans](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios) (fetched, verbatim steps + ranges),
  [support.apple.com Create a custom plan](https://support.apple.com/guide/iphone/create-a-custom-plan-in-apple-fitness-iph4c609a5cd/ios) (search record).

### 1.8 Freeletics Training Coach — recommend-a-Journey then bind days/equipment (adaptive)
- **Order:** gender → goal → fitness level (self-assessed) → age, height, weight →
  training preferences/background → **Coach recommends Training Journeys, No. 1 at top**
  ("the one that we think best matches your goals"). After picking a Journey you customise:
  **days/week**, **equipment + workout spaces**, somewhere to run, average session
  duration, excluded exercises, skill progressions.
- **Binding:** first week is based on self-assessed level; days/equipment/spaces/duration
  bind the generated week; feedback adapts thereafter.
- **Beginner framing:** "a short workout is better than no workout"; warm encouragement.
- **Free/paid:** Coach is the paid product; Coach+ (Jul 2024) adds **generative-AI** tone
  layers (a demand signal for coach-voice, NOT a deterministic precedent).
- Sources: [freeletics.com getting-started](https://www.freeletics.com/en/blog/posts/getting-started-with-freeletics/) (fetched),
  [help.freeletics Choose your Journey](https://help.freeletics.com/hc/en-us/articles/360001805519-Choose-your-Freeletics-Training-Journey) (search record),
  val-ext-01-02 #63–65 (VERIFIED).

### 1.9 Sweat — sub-minute pick-a-coach + optional steer + optional beginner weeks (women's)
- **Flow:** sign up → **either** pick a coach directly **or** "Help Me Select a Program"
  (optional **few-question** survey) → programme detail page states who it suits, required
  equipment, and **beginner-vs-regular version** → "Start Program" loads instantly.
- **Time-to-active:** "the whole onboarding experience takes less than a minute."
- **Binding / floor:** beginner protection is the **per-programme beginner version** (e.g.
  optional beginner weeks before week 1 — *optional, not universal/mandatory*, per val
  base #68) plus a curated top-5 beginner list. The steer is soft; the user can override.
- **Free/paid:** subscription; the survey + library are inside the paid product.
- Sources: [support.sweat.com beginners](https://support.sweat.com/hc/en-us/articles/360004473775-Do-you-have-workouts-for-Beginners) (search record; host 403 on fetch),
  [fitnessdrum.com Sweat review](https://fitnessdrum.com/sweat-app-review/) (search record),
  val-ext-01-02 #68 (CORRECTED — "optional", not "mandatory 4 weeks").

### 1.10 Ladder — quiz → team/programme, women-led mainstream (team-based)
- **Flow:** an onboarding/trial quiz matches you to a **coach/team** running the same
  **4–12 week** programme; "personalized recommendations in minutes." Quiz also predicts
  LTV (verified in val base). Exact question list UNVERIFIABLE this pass.
- **Binding:** quiz answers (goals/preferences) bind the team; programmes carry
  inline beginner/intermediate/advanced scaling (val base #74, UNVERIFIABLE specifics).
- **Free/paid:** subscription ($29.99/mo+). Apple 2025 App of the Year **finalist** "for
  taking the guesswork out of strength training"; ~400k members Apr 2026, 80% women.
- Sources: [joinladder.com/quiz](https://www.joinladder.com/quiz) (search record),
  [corahealth.app/compare/ladder](https://www.corahealth.app/compare/ladder) (fetched — confirms "join a team… 4-12 week program together"; quiz specifics absent),
  val-ext-01-02 #28–31 (VERIFIED).

### 1.11 Caliber — long thorough onboarding, generous free tier (coaching ladder)
- **Onboarding:** "notably thorough, collecting detailed information about goals,
  experience, and equipment… long, it sets the stage for a truly personalized program."
- **Binding:** equipment binds the plan ("get started with no equipment at all… bodyweight
  training plan"); experience/goals shape it; Plus offers **60+ structured plans tailored
  to goals, experience and schedule**.
- **Free/paid:** genuinely useful **free** self-directed tracking/planning → Plus (~$12/mo
  annual) structured plans + Strength Score → Premium ($200/mo) human coach, weekly video
  check-ins. The "generous free" trust model (contrast: BetterMe crippled-free backlash).
- Sources: [garagegymreviews.com Caliber](https://www.garagegymreviews.com/caliber-app-review) (search record),
  [caliberstrong.com/faqs](https://caliberstrong.com/faqs/) (search record),
  val-ext-01-02 #26–27, #73 (VERIFIED).

### 1.12 Dr. Muscle — questionnaire → adaptive AI program, beginner easing (AI coach)
- **Flow:** "answer a series of questions, then provides you with a custom program based on
  your goals, experience, and equipment"; from the first workout it picks weights/reps and
  auto-adjusts ("rough day → adjusts your weights… crushing it → push you harder").
- **Beginner guard-rail (thin but real):** "Beginner programs are now easier (removed
  chin-ups / pull-ups)" — i.e. they actively *remove* high-skill movements for beginners.
- **Caution (val base #37):** documented hard-to-cancel/surprise-renewal complaints.
- Sources: [dr-muscle.com](https://dr-muscle.com/) (search record),
  [dr-muscle.com/easier-beginner-programs](https://dr-muscle.com/easier-beginner-programs/) (fetched: "Beginner programs are now easier (removed chin-ups / pull-ups)"),
  val-ext-01-02 #37 (CORRECTED).

### 1.13 MacroFactor Workouts — generator + manual builder + import (Jan 2026, nutrition-native)
- **Flow:** "build you a personalized workout plan (or help you build a custom one
  yourself)"; create/save your own routines, track a one-off, or **import select Jeff
  Nippard programs**. Deep manual tracking: rest time, drop sets, RIR, failure sets,
  partial reps. Program generation; PPL-split support is a *roadmap* item (so the bind on
  split is still maturing).
- **Binding:** smart progression logic adapts loads; generator inputs not fully detailed
  this pass (page bot-blocked — UNVERIFIABLE on exact question list).
- **Free/paid:** part of the MacroFactor subscription (paired with their nutrition app).
- Sources: [macrofactor.com/workouts](https://macrofactor.com/workouts/) (bot-blocked; content via search record),
  [macrofactor.com/mm-jan-2026](https://macrofactor.com/mm-jan-2026/) (search record),
  [dr-muscle.com/macrofactor-workouts](https://dr-muscle.com/macrofactor-workouts/) (search record).

### 1.14 StrongLifts 5×5 — radical simplicity, one beginner programme (linear-progression)
- **Flow:** "removes all confusion and complexity by guiding you through every workout…
  plans every exercise, set, and weight so you always know exactly what to do." Enter stats
  + experience level → it **calculates your starting weights**. No split decision — the
  5×5 *is* the plan.
- **Binding / floor:** the programme IS the guard-rail — one beginner-correct linear
  progression, conservative start, plate + warm-up calculators remove gym maths.
- **Free/paid:** 5×5 programme free; Pro (7-day trial on yearly) adds more programmes +
  customisation. Recommends "just the 5×5 for 12 weeks."
- Sources: [stronglifts.com/stronglifts-5x5](https://stronglifts.com/stronglifts-5x5/) (search record),
  [support.stronglifts.com free-vs-pro](https://support.stronglifts.com/article/34-free-vs-pro) (search record).

### 1.15 Peloton strength — programmes-as-journeys, no plan builder (class platform)
- **Flow:** Program area → find a programme (Roll Call strength, "Build Your Power Zones")
  → **Join** → unlocks Week 1; progress through a fixed multi-week arc with completion
  badges (You Can Ride: bronze/silver/gold at 4/7/8 of 9). Cycling uses an FTP test to set
  personalised zones — a real **assessment-binds-output** pattern, but cardio-side.
- **Binding:** minimal for strength (you pick a journey); the value is instructor
  relationship + badge arcs, not personalised programming.
- **Free/paid:** subscription; free app tier ended Apr 2024 (cannibalised conversion).
- Sources: [pelobuddy.com programs](https://www.pelobuddy.com/programs/) (search record),
  [onepeloton.com power-zone-training](https://www.onepeloton.com/blog/power-zone-training) (search record),
  val-ext-01-02 #57–59 (VERIFIED).

---

## 2. SYNTHESIS (a) — repeating WINNER patterns

1. **Days/week must BIND, visibly.** Every credible generator makes frequency load-bearing:
   JuggernautAI ("optimize when and how often you Squat/Bench/Deadlift based on how many
   days"), Hevy Trainer, Alpha Progression (asked first), Fitbod, Freeletics, Apple
   Fitness+ (tap your days). None asks for days and then ignores it.
   ([juggernautai.app](https://www.juggernautai.app/), [support.apple.com](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios))
2. **Equipment is a HARD FILTER, not a hint.** Fitbod ("not recommending leg presses if
   you're only working with kettlebells"), Alpha Progression (mark only what you have),
   Hevy, Freeletics workout spaces. ([fitbod.me](https://fitbod.me/blog/fitbod-algorithm/),
   [hotelgyms.com](https://www.hotelgyms.com/blog/how-to-use-alpha-progression))
3. **Beginner difficulty floors are built in — by curation OR by code.** StrongLifts (one
   correct novice programme), Boostcamp (Greg Nuckols Beginner; GZCLP "3 days for
   beginners"), Sweat (beginner version + optional beginner weeks), Dr. Muscle (removes
   chin-ups/pull-ups for beginners), Alpha ("beginners start 2–3×"). A beginner is *never*
   silently handed an advanced plan.
   ([boostcamp.app](https://www.boostcamp.app/coaches/cody-lefever/gzcl-program-gzclp),
   [dr-muscle.com](https://dr-muscle.com/easier-beginner-programs/))
4. **Explicit per-session time, chosen and honoured.** Apple Fitness+ (10–90 min per day),
   Fitbod (15–20 min budget shown), Hevy ("time constraints" input), Alpha ("how long you
   want to train"), Freeletics ("average duration of each session"). Time is a first-class
   input *and* a displayed output. ([support.apple.com](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios),
   [fitbod.me](https://fitbod.me/blog/fitbod-algorithm/))
5. **One recommended path beats a menu of peers.** Freeletics ("the one we think best
   matches your goals" at top), Sweat ("Help Me Select a Program"), Ladder (quiz →
   one team), Fitbod (one generated workout). Winners reduce, not multiply, the "answer
   some questions" doors. ([freeletics.com](https://www.freeletics.com/en/blog/posts/getting-started-with-freeletics/))
6. **Deterministic + visible reasons is now a SHIPPED, marketed pattern.** Hevy Trainer:
   "do not rely on AI… there's a reason behind every programming decision." Volyume is no
   longer alone here — but Hevy ships it Pro-gated and as a headline.
   ([hevyapp.com](https://www.hevyapp.com/announcing-hevy-trainer/), val base #1–5)
7. **Edit-an-active-plan = scoped swaps, not rebuilds.** Apple (swap a workout on its
   scheduled day), RP (Meso Builder rebuild), Alpha ("adjust any variable"). Light,
   in-place edits dominate; full rebuilds are the exception.
8. **Generous-free builds trust; crippled-free breeds backlash.** Boostcamp (whole library
   free), Caliber (useful free tier) vs Fitbod (3 free workouts, hard wall) and BetterMe
   (crippled free, hostile sentiment — val base). ([boostcamp.app](https://www.boostcamp.app/free-workout-app))

---

## 3. SYNTHESIS (b) — where Volyume ALREADY LEADS

- **Division-specific generation.** No competitor generates **bodybuilding-division-specific
  plans** (3 men's + 5 women's) from a deterministic engine. RP has "emphasis", Hevy has
  one "priority muscle", Alpha has "muscle focus" — none is stage-division-aware. This is a
  genuine, unmatched differentiator (a-03 §1.2 DivisionGrid).
- **Deterministic engine with visible per-plan reasons, FREE-adjacent.** "Why this plan,
  for you" (schedule/goal/experience/progression/equipment/recovery/nutrition/weak points)
  matches Hevy Trainer's "a reason behind every decision" — but Hevy's is **Pro-gated** and
  Volyume's reasons surface on the active plan without a $24/yr wall (a-03 §1.6).
- **A truly free guided on-ramp that's good on session one.** FreeStarter (3 plain Qs,
  difficulty-0 only, jargon-free, autonomy-preserving "skip") fills the exact gap the val
  base flagged as *unoccupied*: Hevy's day-0 answer is paid, Fitbod's is paid + cold-start,
  Boostcamp's needs programme literacy. Volyume's is free, warm and beginner-correct.
- **31-plan curated library with division/beginner/dumbbell/short-session chips.** Smaller
  than Boostcamp's 12k, but *curated* — no GZCLP-literacy tax, every plan vetted, 5 at
  difficulty-0. Curation-over-volume is the right call for the newbie half of the market.
- **Periodisation surfaced honestly (MesocycleBuilder)** with week dots, deload markers,
  jargon-translating InfoTooltips — RP/Juggernaut depth, but explained in plain words.

---

## 4. SYNTHESIS (c) — RANKED PICK-UPS vs the 5 frictions, for Besa AND Eddie

The 5 frictions (a-03 §4): G1 no-op days question · G2 4-day hardcoded builder · G3 no
difficulty floor on Library-quiz path · G4 non-blocking balance / no time estimate · G5
zero funnel telemetry.

**PICK-UP 1 — Make the days question BIND (fixes G1). [Besa + Eddie]**
Every winner binds days (§2.1). The fix is to make FreeStarter's "days" answer real: tag
starter plans for 2/3/4 days (or generate a trimmed/expanded variant), so "2 days" yields a
2-day plan — exactly as JuggernautAI optimises lift frequency to chosen days. A question the
output can't honour is worse than no question (sets a false expectation).
*Besa:* feels heard. *Eddie:* expects frequency to matter and it must.
Evidence: [juggernautai.app](https://www.juggernautai.app/), [support.apple.com](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios), [hotelgyms.com](https://www.hotelgyms.com/blog/how-to-use-alpha-progression).

**PICK-UP 2 — Add a beginner difficulty FLOOR to the Library-quiz path (fixes G3). [Besa]**
Boostcamp, StrongLifts, Sweat, Dr. Muscle all guarantee a beginner never lands on an
advanced plan — by curation or code. Volyume's Library quiz can currently score a beginner
onto a Featured/Advanced plan (no difficulty cap). Add an experience read (or a hard
difficulty-0 cap when no experience is known) to the Library scorer, mirroring FreeStarter.
*Besa:* protected from a plan that will hurt/demoralise. *Eddie:* unaffected (opts up).
Evidence: [boostcamp.app GZCLP](https://www.boostcamp.app/coaches/cody-lefever/gzcl-program-gzclp), [dr-muscle.com](https://dr-muscle.com/easier-beginner-programs/), [stronglifts.com](https://stronglifts.com/stronglifts-5x5/).

**PICK-UP 3 — Unhardcode the Manual Builder's days + bind goal labels (fixes G2, part of G4). [Eddie + Besa]**
Apple Fitness+ makes the user tap their days as step 1; Alpha/Freeletics ask up front.
Replace the hardcoded `daysPerWeek=4` with a days picker, and let the 5 goal labels seed
default sets/reps/split (so "Strength-Biased" actually differs from "Aesthetic Focus") with
plain-English explainers (reuse the MesocycleBuilder InfoTooltip pattern).
*Eddie:* the builder respects his schedule. *Besa:* labels stop being unexplained jargon.
Evidence: [support.apple.com](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios), [freeletics.com](https://www.freeletics.com/en/blog/posts/getting-started-with-freeletics/).

**PICK-UP 4 — Show a per-session TIME ESTIMATE everywhere a plan/day is previewed (fixes G4). [Besa + Eddie]**
Apple (10–90 min chosen), Fitbod (15–20 min budget), Hevy/Alpha/Freeletics (time input).
Volyume shows sets/week but no session minutes. Compute a simple estimate (sets × rest +
work) on PlanDetail, RoutineDetail and the builder. This is table-stakes the audit flagged
as missing (F9).
*Besa:* "can I fit this today?" answered. *Eddie:* session-length budgeting.
Evidence: [support.apple.com](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios), [fitbod.me](https://fitbod.me/blog/fitbod-algorithm/).

**PICK-UP 5 — Instrument the whole acquisition funnel (fixes G5). [neither persona — but unblocks all the above]**
Nobody can fix conversion blind. Add events: find-my-plan start/finish, Library-quiz
start/result, copy-from-library, set-active, manual-save, coach-rebuild — with the chosen
entry door. Ladder's entire quiz-to-pLTV model (val base #28) only exists because they
*measure* the funnel. Volyume has one event in the whole area. Offline-first/EU/no-PII
constraints: aggregate counters only, on-device-first, no identifiers.
Evidence: val-ext-01-02 #28 (Ladder onboarding quiz predicts LTV — VERIFIED).

**Ranking rationale:** 1 and 2 are the highest-harm beginner-safety gaps (a false promise
and an advanced-plan-to-a-newbie risk) → top for Besa. 3 and 4 raise the builder/preview to
parity → serve Eddie and Besa. 5 is the meta-fix that makes 1–4 measurable.

---

## 5. SYNTHESIS (d) — what EVERYONE has that we LACK

1. **Days-per-week that actually changes the plan.** Universal among generators; Volyume
   asks then ignores it (G1) and hardcodes 4 in the builder (G2). The single most common
   capability we're missing.
2. **A displayed per-session time estimate.** Apple, Fitbod, Hevy, Alpha, Freeletics all
   surface or take session length; Volyume shows sets/week but not minutes (G4).
3. **A guaranteed beginner difficulty floor on every guided path.** FreeStarter has it; the
   Library quiz does not (G3). Competitors guarantee it on *every* route in.
4. **Funnel telemetry.** Every scaled competitor (Ladder, BetterMe, Fitbod) instruments
   onboarding-to-activation; Volyume has one event in the entire plan area (G5).
5. **In-place "swap this workout" on a scheduled day from the plan view** (Apple's pattern).
   Volyume has plan-level swap inside RoutineDetail but not a one-tap swap from the plan
   preview — a lighter, lower-friction edit than navigating into day-edit.

Note (not a lack, a positioning shift, val base §3.5): the **AI-programming layer is now
table-stakes** (Hevy, JEFIT, Freeletics Coach+, Peloton IQ, Apple Workout Buddy). Volyume's
no-LLM determinism is now *contrarian positioning* — defensible and increasingly marketable
("real reasons, never AI-generated"), but the explaining job is harder. Do NOT read "everyone
has AI" as a gap to close; it's a line to hold and articulate.

---

## 6. FETCH LOG (per-URL)

**Successful fetches (8):**
- `https://www.juggernautai.app/` — OK (STEP 0 proof).
- `https://rpstrength.com/pages/hypertrophy-app` — OK (45+ templates, Meso Builder).
- `https://www.boostcamp.app/free-workout-app` — OK (free library, Pro adds).
- `https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios` — OK (verbatim 4-step builder, 10–90 min, 2–8 wk, editing).
- `https://dr-muscle.com/easier-beginner-programs/` — OK (removed chin-ups/pull-ups).
- `https://www.freeletics.com/en/blog/posts/getting-started-with-freeletics/` — OK (recommend-a-Journey, customise days/equipment).
- `https://fitnessdrum.com/alpha-progression-app-review/` — OK (full input list).
- `https://www.corahealth.app/compare/ladder` — OK (team/4–12wk confirmed; quiz specifics absent).

**Failed fetches (5, all logged, all worked around via search records / val base):**
- `https://hypertrophy.zendesk.com/.../Where-to-start` — 403 (RP setup steps via search record).
- `https://fitbod.zendesk.com/.../How-can-I-use-Fitbod-as-a-beginner` — 403.
- `https://help.fitbod.me/.../Getting-Started-with-Fitbod` — 403 (Fitbod flow via fitbod.me/blog search records).
- `https://help.hevyapp.com/.../Hevy-Trainer-Explained` — 403 (Hevy flow via search record + val base, VERIFIED).
- `https://macrofactor.com/workouts/` — bot-check wall ("verifying your request"); content via search records (mm-jan-2026, dr-muscle). MacroFactor generator's exact question list = UNVERIFIABLE this pass.

**Fetch-failure count: 5.** No load-bearing claim rests on a failed fetch alone — each is
backed by a search record and/or the VERIFIED val base.
