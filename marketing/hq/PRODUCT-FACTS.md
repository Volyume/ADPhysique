# PRODUCT-FACTS.md — Volyume Marketing HQ Single Source of Truth

**Purpose.** This file is the single source of product truth for the Volyume
Marketing HQ. Every public marketing claim (ads, store listing, website,
social, press) must trace to a fact stated in this file.

**Date.** 2026-07-12.

**Verification method.** Facts below come from two sources only, both dated
2026-07-12: (1) direct statements from the founder in this session, marked
"founder-stated"; (2) direct verification against the app's source code by
reading the cited files/lines, marked "code-verified". Nothing in this file
is drawn from summaries, prior marketing material, or assumption.

**Governing rule.** If a claim is not listed in this file, it is UNKNOWN and
must not be used in public marketing. Do not infer, extrapolate, or round up
beyond what is stated here. Numeric facts drawn from code should be
re-verified before reuse if the app has been updated since this date.

---

## A. What Volyume Is (founder-stated)

- Connected physique coaching system for serious self-coached lifters.
- Platform status: live on Google Play (package `app.volyume`). Apple App
  Store: coming soon (currently TestFlight only — see Section E).
- Zero users at build date; no marketing has been done before this system.
- The customer is the end user paying for Pro (not gyms, not coaches).
- The problem: users of workout loggers (Strong/Hevy), nutrition apps
  (MacroFactor/MyFitnessPal) and personal notes still have to work out what
  to change each week themselves. Volyume makes the weekly decision (change
  or hold) and explains why.
- The coaching is deterministic, rule-based and explainable. It is not
  conversational AI, not a black box, and does not "learn you" in an AI
  sense.
- Onboarding delivers value before the first workout: it builds the training
  plan, sets calorie/macro targets, shows the rationale for those targets,
  supports meal planning, sets the first check-in date, and establishes the
  Progress Scan baseline.
- The app deliberately holds decisions when data is insufficient — it needs
  enough observations before acting and never guesses.
- Progress Scan: produces a progress score from the user's own photos with a
  stated confidence level; it may abstain from scoring. It is NOT a
  body-fat measurement, NOT a medical assessment, and never compares one
  person to another.
- Positioning:
  - Primary: "the connected system for self-coached lifters."
  - Secondary: "explainable decisions."
- Volyume is explicitly NOT: an AI coach, a replacement for a human coach, a
  motivation app, or a beginner fitness app.

---

## B. Free vs Pro (founder-stated)

**Free (permanent, a real product on its own):**
- Full workout logging
- Plan library and plan use
- Custom plan building
- Training history
- Progress tracking

**Pro:**
- Nutrition, macros, food diary
- Barcode scanning
- Meal planning
- Progress Scan
- Weekly Precision Coaching
- Advanced progression

---

## C. Pricing and Trial (founder-stated + code-verified)

- **Pricing:** £2.99/month (product ID `pro_monthly`), £19.99/year (product
  ID `pro_annual`) — verified at `src/lib/payments/catalogue.js:36-46`.
  The price Google Play displays at the point of purchase is authoritative;
  this file's figures are for copy drafting only.
- **Trial mechanism 1 — in-app trial:** 14-day full-Pro trial inside the app,
  no card required — verified `TRIAL_LENGTH_DAYS = 14` at
  `src/lib/trialActivation.js:18`.
- **Trial mechanism 2 — store offer:** after the in-app trial, the user opts
  into the Play subscription, which carries a separate 7-day Google Play
  introductory free period, configured per product in the Play Console
  (referenced at `src/lib/payments/catalogue.js:11` and `cascade.js`) before
  the first charge.
- **Total possible access:** up to roughly 21 days combined. Only the first
  14 of those days are cardless. Never merge the two mechanisms into a
  single "X days free" claim in copy — they are distinct and must be
  described as two separate steps.
- **Check-ins during trial:** two proper weekly check-ins are possible within
  the window if the user logs enough data. This is an opportunity, never a
  guarantee — do not promise it will happen.

---

## D. Code-Verified Numbers

Each figure below is tied to a specific file reference, verified
2026-07-12. Re-verify before reuse if the app has since been updated.

- **551 exercises** in the built-in library, plus unlimited user-added
  custom exercises — `src/lib/seedExercises.js`, RAW array, lines 580-1279.
  NOTE: older marketing material stated 448 — that figure is stale; use 551.
- **31 built-in training plans** — `src/lib/seedRoutines.js`,
  `LIBRARY_PLANS`.
- **9 physique goal options**: general (non-competing) plus 8 divisions —
  Men's Physique, Classic Physique, Bodybuilding, Bikini, Wellness, Figure,
  Women's Physique, Women's Bodybuilding —
  `src/lib/coachingGoals.js`, `PHYSIQUE_GOALS`.
- **Bundled UK food database**: 26,427 OpenFoodFacts UK rows + 2,852 CoFID
  rows = 29,279 rows total, fully searchable offline —
  `assets/seed/*.dat` `_meta` rowCount headers. The OpenFoodFacts snapshot
  refreshes weekly, so copy should say "over 29,000 UK foods" rather than
  citing the exact figure.
- **3 personal-best types** auto-detected: estimated 1RM, heaviest weight,
  most reps at a weight — `src/lib/algorithms.js`, `PR_TYPE_RANK`.
- **Training milestones**: first week (3 sessions in 7 days), then 5, 10,
  25, 50, 100 sessions, and first PR — `src/lib/milestones.js`,
  `MILESTONES`. NOTE: older material referencing 250/500-session milestones
  is stale; do not use.
- **Barcode scanning is Pro-gated** (`withProGuard`,
  `src/navigation/RootNavigator.js:249`) — never describe barcode scanning
  as free.
- **Workout logging, plan library and progress screens are NOT Pro-gated**
  (`src/navigation/RootNavigator.js:88,91,108,118,497`) — the free training
  core is real and may be described as such without qualification.
- **Trial copy consistency**: shipped screens consistently show 14-day
  in-app trial messaging (`WelcomeScreen.js:95`,
  `ProUpgradeScreen.js:411-412`, `SubscriptionPolicyScreen.js:105`) and
  7-day store-offer messaging on the purchase surface
  (`PaywallScreen.js:186,196-197`). There is no contradiction between these;
  see Section C for how to describe both without merging them.

---

## E. Privacy and Platform Posture (code-verified, usable in copy)

- Offline-first: the local database on device is the source of truth.
- Local data is encrypted on device.
- Cloud data residency: EU (Dublin).
- No adverts anywhere in the app.
- No user data is sold.
- No PII is sent to analytics or crash-reporting tooling.
- Food search works fully offline.
- iOS is currently TestFlight / "coming soon" — never claim App Store
  availability on iOS until it is actually live.

---

## F. Honest Limits (never contradict these in copy)

- No exercise demonstration videos — exercises use text cues, not video.
- No wearable or smartwatch companion app.
- iOS is not yet on the public App Store.
- No restaurant or takeaway food database.
- No micronutrient tracking.
- No meal-photo AI (no photograph-a-meal-to-log-it feature).
- Progress Scan may withhold a score entirely when photo capture quality or
  confidence is insufficient — never promise a score will always be given.

---

## G. Operational Reward Mechanisms (marketing-operated, verified 2026-07-12)

- Survey reward: a free week of Volyume Pro delivered as a Google Play promo
  code. Mechanism: the founder generates promotional codes for the Pro
  subscription in Google Play Console (Monetise, Promotions); the marketing
  system stores them in the service-role-only `marketing_promo_codes` pool
  (supabase/migrate_122) and issues one per completed survey by email.
  Redemption happens entirely inside Google Play; no app or billing code is
  involved. CONDITION: this reward may only be promised in copy while the
  pool holds available codes; if the pool is empty, sending pauses and an
  incident is logged. Do not imply stacking with the Play introductory offer
  or guarantee redemption outcomes; the code is the deliverable.
