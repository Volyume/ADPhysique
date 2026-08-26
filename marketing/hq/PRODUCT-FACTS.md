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
- Platform status: live on Google Play (package `app.volyume`) AND live on
  the Apple App Store. CORRECTED 2026-08-25: this line previously said the
  App Store was "coming soon (currently TestFlight only)", which is now
  false and would have blocked any honest iOS download claim. Both store
  pages were fetched and returned HTTP 200 on that date:
  - Google Play: https://play.google.com/store/apps/details?id=app.volyume
  - App Store:   https://apps.apple.com/gb/app/volyume/id6777083702
  Copy may therefore say the app is available for iPhone and Android, and
  may link to both. iOS-specific TRIAL mechanics are still UNKNOWN: only
  the in-app 14-day trial (mechanism 1 in Section C) is verified as
  platform-neutral, and the 7-day store offer in Section C is configured
  in the Play Console, so it must not be claimed on an iOS surface.
- Zero users at build date; no marketing has been done before this system.
- The customer is the end user paying for Pro (not gyms, not coaches).
- The problem: users of workout loggers (Strong/Hevy), nutrition apps
  (MacroFactor/MyFitnessPal) and personal notes still have to work out what
  to change each week themselves. Volyume makes the weekly decision (change
  or hold) and explains why.
- The coaching is deterministic, rule-based and explainable. It is not
  conversational AI, not a black box, and does not "learn you" in an AI
  sense.
- **What is and is not AI in Volyume, because a blanket "no AI" line is
  FALSE and would be easy to disprove.** The COACHING ENGINE contains no
  model of any kind: no LLM, no generative step, no randomness (verified
  2026-08-25, zero references to any LLM provider anywhere in `src/` or
  `modules/`), so the weekly decision cannot hallucinate a number or invent
  a reason. But the app DOES ship a neural network: Progress Scan runs
  MediaPipe Selfie Segmentation on-device through TFLite
  (`assets/ml/selfie_segmentation_v2.tflite`,
  `react-native-fast-tflite` in package.json, ML Kit as the native
  fallback) to find the body outline in the user's own photo. It is a
  vision segmentation model, not a generative one.
  COPY RULE: never write "no AI", "AI-free" or similar about the product as
  a whole. Scope the claim to the decision: no language model is involved
  in the weekly call, so nothing about it is generated. This is the same
  conclusion CLAIMS-STANDARDS section 6 reaches, with the reason now
  recorded.
- Onboarding delivers value before the first workout: it builds the training
  plan, sets calorie/macro targets, shows the rationale for those targets,
  supports meal planning, sets the first check-in date, and establishes the
  Progress Scan baseline.
- The app deliberately holds decisions when data is insufficient — it needs
  enough observations before acting and never guesses.
- **The coach PROPOSES, the athlete APPLIES (founder direction 2026-05-27,
  reaffirmed 2026-05-28 for calories).** Every weekly adjustment is surfaced
  as a suggestion with an Apply button, and nothing changes until the user
  taps it. There is no silent auto-apply, calories included. Verified
  `src/lib/coachApply.js` header and `CoachOutputScreen.js`. COPY RULE:
  never write that Volyume "decides what to change", "changes your plan" or
  "adjusts your targets" unqualified, because each implies it acts on its
  own. Say it works out what SHOULD change, recommends, or makes the
  change-or-hold call, and leave the acting with the athlete. Caught
  2026-08-25 by the founder on the /get/ landing page.
- Progress Scan / Progress Photos (KEY Pro feature, founder-stated
  2026-07-12): a physique-scoring algorithm produces a progress score from the
  user's own photos with a stated confidence level; it may abstain from
  scoring. It is NOT a body-fat measurement, NOT a medical assessment, and
  never compares one person to another. Beyond the score it offers standalone
  value: monitoring and comparing your own progress in photo form over time
  (your own before/after), and it feeds into the coaching decision as one
  input. It includes user-initiated social sharing of a before/after progress
  card (the founder-approved Pro card, 2026-07-03) which may show the user's
  own bodyweight beside each photo, and is withheld entirely under calm mode or
  an open ED flag; name/measurements/private notes stay banned on it.
  NOTE: how Progress Photos may be used in MARKETING (esp. before/after
  transformation imagery) is an open founder decision, not settled — see
  CLAIMS-STANDARDS §5 (before/after transformation advertising is currently
  banned) and the ED-safety scale-framing rule.
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
- Progress tracking (training progress: PBs, lift and volume trends — NOT
  bodyweight)

**Pro:**
- Nutrition, macros, food diary
- Barcode scanning
- Meal planning
- Progress Scan
- Weekly Precision Coaching
- Advanced progression
- **Bodyweight / morning weight logging and weight-trend tracking** (Pro-only;
  hidden for free users — founder correction 2026-07-12)

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
- **47 built-in training plans** — `src/lib/seedRoutines.js`,
  `LIBRARY_PLANS`. CORRECTED 2026-08-25: this said 31, which was stale and
  was nearly used on an advert. Counted from the live array (47 top-level
  entries) and cross-checked against
  `src/lib/__tests__/seedRoutinesLibraryData.test.js`, which pins 47 and
  guards against the array holes that hid 16 of them from some users.
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
- **Tech stack (developer-audience posts only)**: built with React Native
  0.81.5 + Expo SDK 54 — root `package.json` (`"react-native": "0.81.5"`,
  `"expo": "~54.0.35"`), verified 2026-07-13. Use only where a technical
  audience makes it relevant (e.g. r/SideProject, r/androidapps); it is not
  a consumer-facing selling point.
- **Training milestones**: first week (3 sessions in 7 days), then 5, 10,
  25, 50, 100 sessions, and first PR — `src/lib/milestones.js`,
  `MILESTONES`. NOTE: older material referencing 250/500-session milestones
  is stale; do not use.
- **The weekly coach needs at least 3 morning weigh-ins** in the week before
  it acts on a weight trend; with fewer it holds and says why
  (`MIN_WEIGH_INS = 3`, `src/lib/weeklyCoach.js:118-124`, test-pinned in
  `coachLedger.test.js` and `weeklyCoach.f10.test.js`; in-app hold message:
  "Need at least 3 morning weights for a reliable trend."). Verified
  2026-07-12 after the compliance gate flagged the number as untraced.
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
  (supabase/migrate_123) and issues one per completed survey by email.
  Redemption happens entirely inside Google Play; no app or billing code is
  involved. CONDITION: this reward may only be promised in copy while the
  pool holds available codes; if the pool is empty, sending pauses and an
  incident is logged. Do not imply stacking with the Play introductory offer
  or guarantee redemption outcomes; the code is the deliverable.

---

## H. Version 1.3.0 changes (code-verified 2026-08-25)

Added for the 1.3.0 release notes. Each line was read in the cited file
before it was written here; nothing is taken from a commit summary alone.
Section 9A of CLAIMS-STANDARDS governs the first item: the marketing
readiness matrix is all-NO, so no population may be named and no medical
framing used. The only permitted framing is the product's own neutral
voice, which is what the in-app screen already says.

- **"How you train" (Settings).** A screen where the user says what their
  training should be built around, including which side of the body it
  affects, and for how long. The screen's own words are "What should
  Volyume build around?" and "Pick anything that applies. You never need
  to say why." Verified `src/screens/HowYouTrainScreen.js:639-640, 745`.
- **Tier: free.** `HowYouTrain` and `TrainingConsiderations` are registered
  in the navigator with no Pro guard, and the second is annotated as a
  free-tier discovery surface (CAP-19). Verified
  `src/navigation/RootNavigator.js:464-465, 497-499`. Copy may say it is
  available on the free tier as well as Pro.
- **Adapted setup notes.** Where an exercise is set up differently for a
  given user, the exercise's setup notes state how rather than assuming
  one way. Verified `src/lib/exercise/adaptedSetup.js` and its consumer
  `src/screens/ExerciseDetailScreen.js` (no Pro guard on either;
  `RootNavigator.js:487, 532`).
- **Personal bests. Two separate behaviours, and copy must not blur them.**
  (1) THE IN-SESSION ALERT fires per set, every time a set beats the running
  best. The bar is the best set on record for that exercise, past sessions
  plus the session's own earlier working sets, and it moves during the
  session, so a second and third beat each raise their own alert. Verified
  `src/screens/ActiveWorkoutScreen.js:2194` (`showPRCelebration`).
  (2) THE SESSION LIST keeps ONE entry per exercise, not one per beat, so a
  multi-set session never reports four for the same lift. Verified
  `ActiveWorkoutScreen.js:2205` (`bestPRPerExercise`) and
  `src/lib/algorithms.js` (`bestPRPerExercise`, whose header states the rule:
  "A session should read as 'one PR for that exercise'").
  Do not write "personal bests count every time" without saying which of the
  two is meant; it reads as the summary counting them all, which is false.
  The first working set ever recorded on an exercise beats nothing and gets
  an honest "logged as your starting point" line instead of a record claim.
  Verified `src/screens/ActiveWorkoutScreen.js:2138-2196`.
- **Session summary wording.** The count is one entry per lift, not per
  record, and now says so: "New bests on 4 lifts". Verified commit
  `aabf5ec` against `detectedPRs` / `bestPRPerExercise`.
- **Weekly set targets.** Resolved by precedence manual > adapted (Pro) >
  plan > profile > research, so the target reflects the user's own plan and
  profile rather than a population table. The plan layer is tier-blind; the
  adapted layer stays Pro. The volume screen itself carries no Pro guard
  (`RootNavigator.js:526`). Verified commit `416269c`.
- **Session share cards.** Redrawn (frame, plan-name pill, hero label, stat
  icons) and the intensity badge is retired, so a session is no longer
  graded on the card. Verified commit `6f32275`.
- **Plan library.** The library holds 47 plans. Two array holes in
  `LIBRARY_PLANS` aborted seeding partway, so affected users held 16 fewer
  and could not repair it; the seed marker is written only after the loop
  completes and existing plans are matched by name, so the next launch
  after the fix fills the gap without duplicating. Verified
  `src/lib/seedRoutines.js:2088-2103, 2131-2195` and commit `bd1cea0`.
- **UNKNOWN, must not appear in copy:** which version is currently live on
  Google Play, and therefore whether the 1.2.1 items were ever announced to
  store users. That is a Play Console fact, founder-held.
