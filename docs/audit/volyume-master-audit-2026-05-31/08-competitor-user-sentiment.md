# 08 — Competitor & User Sentiment Research

Status: **COMPLETE**
Date: 2026-05-31
Method: live web searches run in this session. **Rule 1 applies hard here:**
every claim below traces to a search result that actually returned it, with
the source linked. Where a search returned a synthesised summary with no
direct primary link, the block is flagged **lower-confidence**. This is
market signal, not verified product fact — competitor pricing and ratings
move, so treat figures as "as reported on the date searched".

This is not a feature-by-feature teardown of each rival. It is a read of
**what users in this category praise and complain about**, mapped onto the
Phase 4 feature areas, so Phase 11 can say where Volyume is already on the
right side of a known complaint and where it is exposed.

---

## Competitors covered
Workout logging / programming: **Hevy, Strong, Fitbod, Boostcamp, Alpha
Progression, Dr. Muscle, Juggernaut AI / Caliber, RP Hypertrophy**.
Nutrition: **MacroFactor, Carbon Diet Coach, MyFitnessPal, Cronometer**.
Recovery / activity: **Whoop, Strava**.

---

## A. Workout logging & tracker UX

**What users praise**
- **Clean, fast logging is the single most-praised trait.** Strong is
  repeatedly recommended on Reddit for a "clean interface and straightforward
  approach to tracking sets and reps"; Hevy is praised for a clean interface
  and a generous free tier. Speed-to-log is the table-stakes win in this
  category.
- **Generous free tier** drives adoption: Hevy's free tier "includes most
  features lifters actually need" and "resonates with the budget-conscious
  Reddit crowd".

**What users complain about**
- **Sync loss / data loss on poor connection is the recurring nightmare.**
  Boostcamp: "weight/reps/notes sometimes don't save when lacking a stable
  internet connection, and the app will delete entered information after
  throwing a network error"; "freezes when completing workouts". Hevy is
  flagged for "offline gaps — some features expect a connection".
- **Free-tier limits that bite fast:** Strong caps free users at 3 custom
  exercises, "restrictive within the first week".
- **Losing your history when a subscription lapses:** Juggernaut AI users
  report "frustration about losing access to training history and data once
  subscription expires". This is a trust-killer.

**Where Volyume stands (from Phases 2/4/6)**
- **Offline-first is a structural advantage against the #1 complaint.**
  Volyume's source of truth is local SQLite; logging, plans and history work
  fully offline and sync drains on reconnect (Phase 6 §6, Phase 7 §C). The
  Boostcamp "network error deleted my sets" failure mode is architecturally
  designed out. This is worth saying plainly in store copy.
- **No data hostage on lapse:** local data is the user's; Volyume's identity
  model keeps user-scoped rows locally and never does destructive cleanup
  (CLAUDE.md identity lock). Volyume does not hold history behind an active
  subscription the way Juggernaut does.
- **Exposure:** invisible sync failures (A2-006) — Volyume's sync is
  fire-and-forget with a retry queue, which is the right design, but the
  *silence* on repeated failure is the same UX gap users resent elsewhere.
  Phase 11 should weigh a quiet "last synced" affordance, not a nagging one.

Sources: [Hevy vs Strong (Setgraph)](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026),
[Best Workout Tracker App Reddit (Setgraph)](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit),
[Boostcamp App Store reviews](https://apps.apple.com/us/app/boostcamp-workout-programs/id1529354455),
[JuggernautAI reviews (justuseapp)](https://justuseapp.com/en/app/1515756471/juggernautai/reviews).

---

## B. Programming / coaching engine

**What users praise**
- **Evidence-based, periodised programming has a clear audience.** Dr. Muscle
  is credited for daily undulating periodisation and rest-pause, founded by a
  PhD exercise scientist; Alpha Progression won "best weightlifting app 2025"
  praise for progression recommendations and AI-generated plans, and "10RM …
  a great metric for hypertrophy".

**What users complain about**
- **AI that produces "random good workouts" instead of structure.** Fitbod is
  criticised that "random good workouts ≠ structured hypertrophy" (earlier
  search). The market distrusts black-box AI that won't commit to a block.
- **Volume that ignores the individual:** Juggernaut AI "excessive volume in
  powerbuilding … crushes them regardless of parameter settings", "not
  properly accounting for different MEV requirements between hypertrophy and
  strength", and "lack of volume in pull workouts".
- **Price for the coaching:** RP Hypertrophy ($34.99/mo, no free tier), 2.8
  Trustpilot, "dated/cluttered UI", "steep learning curve" (earlier search);
  Dr. Muscle "premium subscription is expensive".

**Where Volyume stands**
- Volyume's coaching engine is **explicit, not black-box**: documented
  autoregulation matrix, MEV/MAV/MRV landmarks, double-progression, deload
  logic, RIR ladder per mesocycle (Phases 2/4). It commits to a block
  structure (mesocycle.js MESO_SCHEDULE is the live model — A2-046), which is
  the opposite of the "random workout" complaint, and it reasons about volume
  landmarks per muscle, which is exactly the gap Juggernaut users name.
- **Exposure:** the dead/duplicate progression output in planEngine (A2-046)
  is internal cruft, not user-facing, but it's the kind of thing that should
  be cleaned so the live model is unambiguous. The "steep learning curve"
  complaint that dogs RP/Juggernaut is a standing risk for any landmark-based
  engine — Phase 9/10 should check Volyume explains its decisions in plain
  language, not jargon (CLAUDE.md already forbids jargon creep).

Sources: [Alpha Progression review (Fitness Drum)](https://fitnessdrum.com/alpha-progression-app-review/),
[Dr. Muscle review (Toolkitly)](https://www.toolkitly.com/dr-muscle),
[Juggernaut AI review (PowerliftingTechnique)](https://powerliftingtechnique.com/juggernaut-ai-review/),
[JuggernautAI independent review (Dr. Muscle)](https://dr-muscle.com/juggernaut-workout-app-review/).

---

## C. Nutrition / macro coaching

**What users praise**
- **Adaptive, forgiving coaching beats rigid plans for retention.**
  MacroFactor's "show me what you actually did and I will work with that" and
  weekly expenditure algorithm are praised as "far superior … for a complete
  rookie … forgiving approach to check-in"; Carbon's structured Layne Norton
  methodology suits physique competitors who want strict coaching.
- **Verified food data is a real differentiator.** Cronometer is praised for
  lab-verified USDA/Canadian Nutrient File data and a free tier with full
  micronutrient tracking and barcode scanning.

**What users complain about**
- **Dirty, unverified food databases.** MyFitnessPal: user-submitted entries,
  "a search for 'chicken breast' often returns 30+ results with wildly varying
  calorie numbers"; documented discrepancies vs USDA values.
- **Aggressive paywalling of once-free features.** MyFitnessPal moved the
  **barcode scanner** behind a $79.99/yr tier and gutted the free tier (macro
  goals, calorie goals, nutrient graphs now Premium). This is the loudest
  nutrition-category grievance.
- **No free trial / pay from day one:** Carbon Diet Coach has no trial,
  reviewers "hesitated to pay without testing".
- **Manual-only logging fatigue:** MacroFactor "manual logging only … every
  entry typed or scanned … adds up for users who log 20+ items per day".

**Where Volyume stands**
- Volyume's food waterfall queries multiple sources with per-source timeouts
  and falls through to manual entry (Phase 7 §C). The **data-quality**
  complaint (MFP's dirty DB) and the **barcode-behind-paywall** complaint are
  both areas to position against — Phase 11 should confirm which food sources
  Volyume uses and whether barcode is free.
- Volyume's coaching voice is deliberately **adherence-neutral and
  non-judgemental** (ED-safety system, Phase 4), which aligns with the
  "forgiving check-in" trait users reward in MacroFactor and is *safer* than
  Carbon's "expects strict adherence" framing.

Sources: [MacroFactor vs Carbon (FeastGood)](https://feastgood.com/macrofactor-vs-carbon-diet-coach/),
[MacroFactor review (Outlift)](https://outlift.com/macrofactor-review/),
[MyFitnessPal review (RepReturn)](https://repreturn.com/myfitnesspal-review/),
[Cronometer vs MyFitnessPal (Gemma Sampson)](https://www.gemmasampson.com/blog/cronometer-vs-myfitnesspal).

---

## D. Recovery, steps & activity integration

**What users praise**
- **Recovery scores that change behaviour:** Whoop "worth it if you train
  regularly, care about recovery optimisation, and will actually check your
  scores before deciding how hard to push".
- **Frictionless cross-app sync:** Whoop↔Strava auto-uploads (GPS, pace,
  power, cadence) is praised as "seamless".

**What users complain about**
- **Subscription resentment & hardware/service issues:** Whoop's
  subscription model is "its most controversial feature"; Trustpilot complaints
  about "abysmal customer service", strap defects, poor 4.0→5.0 upgrade
  communication.

**Where Volyume stands**
- Volyume reads steps + bodyweight from HealthKit / Health Connect with a
  calm, once-per-install launch prompt and a "Not now" escape
  (`stepsLaunchPrompt.js`, read this session), and an ACSM kcal estimate from
  steps (`health.js`). It is **not** trying to be a recovery-score wearable —
  it integrates the data the phone/watch already has rather than selling
  hardware, which sidesteps Whoop's hardware/service complaint surface
  entirely. The relevant lesson is the **calm, no-nag** integration prompt,
  which Volyume already implements (the prompt self-gates and flips its flag
  before showing).

Sources: [WHOOP review (MyHRV)](https://www.myhrv.com/posts/is-whoop-worth-it),
[WHOOP Trustpilot](https://www.trustpilot.com/review/whoop.com),
[WHOOP & Strava (Strava Support)](https://support.strava.com/hc/en-us/articles/360061592911-WHOOP-and-Strava).

---

## E. Pricing signal (as reported, date-sensitive)

| App | Reported price | Note |
|---|---|---|
| Hevy | $2.99/mo, $23.99/yr, $74.99 lifetime | generous free tier |
| Strong | $4.99/mo, $29.99/yr | free tier caps 3 custom exercises |
| RP Hypertrophy | $34.99/mo, no free tier | 2.8 Trustpilot (earlier search) |
| Fitbod | $15.99/mo (recently raised) | (earlier search) |
| MacroFactor | $71.99/yr | 7-day trial |
| Carbon Diet Coach | $99.99/yr | no trial (complaint) |
| MyFitnessPal | $79.99/yr Premium | barcode now Premium |
| Juggernaut AI | ~$35 charged on app download | trial only via website (complaint) |

**Read:** the category splits into cheap-and-clean loggers ($24–30/yr: Hevy,
Strong) and premium coaching ($35/mo and up: RP, Fitbod, Dr. Muscle,
Juggernaut). Volyume is a *coaching* product, so its natural comparison set
is the premium tier — but the loudest complaints in that tier are **price
without a trial, history held hostage on lapse, and dirty/black-box
internals**. Volyume's offline-first ownership model and explicit engine are
positioned against all three. (Pricing here is market signal only; not
verified, and not a recommendation on Volyume's own pricing — that's a
founder decision.)

---

## Verdict
The category's verified, recurring complaints are: **(1) sync/data loss on
poor connection, (2) history locked behind an active subscription, (3) dirty
or black-box internals (food DBs, AI volume), (4) aggressive paywalling of
once-free basics, (5) price without a trial.** Volyume's existing
architecture — offline-first local source of truth, local data ownership,
an explicit landmark-based engine, adherence-neutral coaching — already sits
on the right side of (1), (2) and (3). The open question for Phase 11 is
positioning and the two real UX gaps that echo category complaints: **silent
sync failure (A2-006)** and any **paywall placement** of basics like barcode
scanning. Nothing here changes a Phase 2 code finding; it sharpens which
ones matter for the market.
