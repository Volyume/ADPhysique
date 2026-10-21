# PRODUCT-FACTS.md — Volyume Marketing HQ Single Source of Truth

**Purpose.** This file is the single source of product truth for the Volyume
Marketing HQ. Every public marketing claim (ads, store listing, website,
social, press) must trace to a fact stated in this file.

**Date.** 2026-07-12. Corrected 2026-07-13, 2026-08-25, 2026-09-03 and
2026-10-21. The 2026-10-21 corrections are collected in section 0 below; where
a line elsewhere in this file disagrees with section 0, section 0 wins. Lines
it replaces are kept as history and marked SUPERSEDED 2026-10-21.

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

## 0. Corrections of 2026-10-21 (volyume.app rebuild; read first)

Re-verified against the code on main at app version 3.3.0. The evidence, with
file and line for every item, is in docs/site-rebuild-2026-10/FACTS.md and
FEATURES.md; the owner's rules for the site are in
docs/site-rebuild-2026-10/BRIEF.md. The Claim Rule still applies: a claim is
public only if it is here (or in section 0) and true of the shipped app.

1. **Counts.** 923 built-in exercises (was 551), counted from `CORPUS` in
   `src/lib/exerciseCorpus/index.js`. 58 built-in training plans (was 47),
   counted from `LIBRARY_PLANS` in `src/lib/seedRoutines.js`. 4 personal-best
   types (was 3: the fourth, least assistance, is for assisted lifts;
   `src/lib/algorithms.js`). Unchanged: 29,279 bundled food rows and 9 physique
   goal options. New: 94 curated meals (83 curated staple foods behind them)
   and 6 training styles. On volyume.app these figures are written from the
   code into `public/assets/facts.json` by the site build step and pinned by
   `src/__tests__/site/site.facts.guard.test.js`; do not copy a figure from
   this file onto a page.
2. **iPhone is live.** The App Store page is live (2026-10-21). Copy says
   iPhone and Android and links both stores. Every line in this file that says
   TestFlight, "coming soon" or "not yet on the public App Store" is
   SUPERSEDED (sections E and F). Platform limits stay: home-screen widgets,
   the lock-screen rest countdown, "Set as wallpaper" and exact rest alerts
   are Android only; Google sign-in is offered on Android only while the
   iPhone client id is empty; Apple sign-in is offered on both.
3. **No Pro, no trial, no prices.** Volyume has no tier, trial, subscription
   or in-app purchase (founder decision 2026-09-03, D137;
   `src/lib/proGate.js` `FULL_ACCESS_FOR_ALL = true`). Section G (a free week
   of Volyume Pro as a Google Play promo code) is SUPERSEDED: there is no Pro
   to give a week of. Nothing in public copy names a Pro tier, a trial, a
   price or an upgrade.
4. **Barcode scanning is not Pro.** It is available to every account, like
   everything else in section B (`src/navigation/RootNavigator.js` registers
   it with no guard). The old rule that barcode scanning must not be called
   free described a tier that no longer exists and is SUPERSEDED in
   CLAIMS-STANDARDS section 5.
5. **No price or cost claims on volyume.app (owner brief, 2026-10-21).** No
   "free", "all free", "no card", "no time limit", "no ads" or anything
   similar. This supersedes the section B instruction to "state plainly that
   the app is free with no card and no time limit", and the word "permanently"
   in section B (a promise about the future). Two exceptions only: the
   challenge pages and terms may carry, exactly, "Completing a challenge with
   a final score of 50 or more earns free for life."; and /challenge-terms/
   alone may carry the legal sentence "Entry is free, and you can leave at any
   time." Enforced by `src/__tests__/site/site.copy.guard.test.js`.
6. **Health Connect and Apple Health are gone.** The link was removed on
   2026-06-30 (`src/screens/ProOnboardingScreen.js`, founder), no health-app
   module is installed and the app asks for no health permission. The
   privacy policy's section 6 is replaced by "Volyume does not connect to
   Apple Health or Health Connect. It does not read from or write to any
   health app on your phone." No copy claims a health-app or wearable link;
   the app has no wearable companion.
7. **The weekly decision.** By default your coach suggests each change and
   you tap to apply it (Collaborative). There are two other modes: Coached
   applies the week's changes when you open the decision (a safety hold still
   waits for you), and Manual removes Apply. So "nothing changes until you
   tap" is not true of every account; say "by default". Section A's "no silent
   auto-apply" is narrowed to the default.
8. **Privacy lines.** The usage events the app records are first-party,
   tied to a pseudonymous account id, kept six months and switchable off in
   Settings. "No PII is sent to analytics" (section E) is therefore
   SUPERSEDED; the true line is "no third-party analytics or tracking tools,
   and usage data never contains your weights, foods or notes". Cloud account
   data is in the EU (Dublin, documented not code-verified), but member and
   sign-in emails go through Resend, which keeps its records in the United
   States; a residency line must say so. Progress photos and workout videos
   stay on the phone unless you choose to share them, and "never uploaded" is
   not true once a person shares one. Use the app's own wording: "Your
   progress photos and workout videos stay on this phone, unless you choose
   to share them." and "Your coach isn't an AI chatbot. It follows fixed
   rules."
9. **Weigh-ins.** The weekly coach's minimum number of morning weigh-ins is
   not one stable fact (the code carries both 3 and 4). Do not cite a number
   (section D's "at least 3" is SUPERSEDED); weight is one input among
   several and never the headline.
10. **Vitamins and minerals.** Shown on a food's detail where the food data
    has them, and averaged in Food Insights; display only, never read by the
    coach. Do not say "micronutrient tracking" (section F's flat "no" is
    narrowed to this).
11. **Names.** The in-app name for the photo score is Volyume Score (not
    "Progress Scan" or "Physique Scan"); it is a score from your own photos,
    with a confidence level, worked out on your phone, and it can decline to
    score. It is not a body-fat measurement and the in-app band label
    "Leanness" stays off public pages. "Precision Coaching" is used sparingly;
    people meet "Weekly check-in", "Coaching decision" and the Coach tab.
12. **Foods.** "Over 29,000 foods, built around UK products", not "UK foods".
    The Open Food Facts part is a snapshot dated 2026-07-05 inside the app;
    "refreshes weekly" is a pipeline claim and "up to date" is not said.

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
  may link to both. CONFIRMED 2026-10-21: the App Store page is live; see
  section 0, item 2.
- Zero users at build date; no marketing has been done before this system.
- The end user (not gyms, not coaches) is the intended audience.
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
  taps it. There is no silent auto-apply, calories included. [NARROWED
  2026-10-21 to the default mode; section 0, item 7.] Verified
  `src/lib/coachApply.js` header and `CoachOutputScreen.js`. COPY RULE:
  never write that Volyume "decides what to change", "changes your plan" or
  "adjusts your targets" unqualified, because each implies it acts on its
  own. Say it works out what SHOULD change, recommends, or makes the
  change-or-hold call, and leave the acting with the athlete. Caught
  2026-08-25 by the founder on the /get/ landing page.
- Progress Scan / Progress Photos (KEY feature, founder-stated
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

## B. Access and pricing (founder-stated 2026-09-03)

[2026-10-21: the facts in this section stand; the copy instructions at its end
are SUPERSEDED by section 0, item 5. Public copy makes no claim about price or
cost.]

Volyume is fully free. Every feature listed in this file is available to
every signed-in account at no cost. There is no Pro tier, no trial, no
subscription, and no in-app purchase. Founder decision, 2026-09-03.

**Everything is included, permanently:** [SUPERSEDED 2026-10-21: "permanently"
is a promise about the future and is not said; section 0, item 5.]
- Full workout logging
- Plan library and plan use
- Custom plan building
- Training history
- Progress tracking (training progress: PBs, lift and volume trends)
- Bodyweight / morning weight logging and weight-trend tracking
- Nutrition, macros, food diary
- Barcode scanning
- Meal planning
- Progress Scan
- Weekly Precision Coaching
- Advanced progression [2026-10-21: no screen or label by this name exists in
  the app; name what exists instead, such as suggested weights and reps set by
  set in the logger and the plan's progression]

Do not mention a price, a trial length, a subscription, or a "Pro" tier in
any public copy. Do not describe former pricing, "for now" framing, or
future plans. [SUPERSEDED 2026-10-21: the closing instruction, "state plainly
that the app is free with no card and no time limit", is withdrawn. On
volyume.app nothing is said about price or cost at all; section 0, item 5.]

---

## D. Code-Verified Numbers

Each figure below is tied to a specific file reference, verified
2026-07-12. Re-verify before reuse if the app has since been updated.

- **551 exercises** in the built-in library, plus unlimited user-added
  custom exercises — `src/lib/seedExercises.js`, RAW array, lines 580-1279.
  NOTE: older marketing material stated 448 — that figure is stale; use 551.
  [SUPERSEDED 2026-10-21: 923 exercises; the RAW array is gone and the library
  is `CORPUS` in `src/lib/exerciseCorpus/index.js`. Neither 551 nor 448 is
  used; section 0, item 1.]
- **47 built-in training plans** — `src/lib/seedRoutines.js`,
  `LIBRARY_PLANS`. CORRECTED 2026-08-25: this said 31, which was stale and
  was nearly used on an advert. Counted from the live array (47 top-level
  entries) and cross-checked against
  `src/lib/__tests__/seedRoutinesLibraryData.test.js`, which pins 47 and
  guards against the array holes that hid 16 of them from some users.
  [SUPERSEDED 2026-10-21: 58 plans (the 47 array entries, two band plans and one
  authored plan were added since); section 0, item 1.]
- **9 physique goal options**: general (non-competing) plus 8 divisions —
  Men's Physique, Classic Physique, Bodybuilding, Bikini, Wellness, Figure,
  Women's Physique, Women's Bodybuilding —
  `src/lib/coachingGoals.js`, `PHYSIQUE_GOALS`.
- **Bundled UK food database**: 26,427 OpenFoodFacts UK rows + 2,852 CoFID
  rows = 29,279 rows total, fully searchable offline —
  `assets/seed/*.dat` `_meta` rowCount headers. The OpenFoodFacts snapshot
  refreshes weekly, so copy should say "over 29,000 UK foods" rather than
  citing the exact figure. [CORRECTED 2026-10-21: the count stands; the wording
  is "over 29,000 foods, built around UK products", and "refreshes weekly" is
  not said (section 0, item 12). Searchable offline once the first-launch
  import has finished.]
- **3 personal-best types** auto-detected: estimated 1RM, heaviest weight,
  most reps at a weight — `src/lib/algorithms.js`, `PR_TYPE_RANK`.
  [SUPERSEDED 2026-10-21: 4 types, adding least assistance for assisted lifts.]
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
  [SUPERSEDED 2026-10-21: the code carries 3 in one place and 4 in others, so
  no number is cited; section 0, item 9.]
- **Every screen and feature is available to every signed-in account** — see
  section B (founder decision, 2026-09-03). Do not describe any feature as
  gated, locked, or tier-limited in public copy.

---

## E. Privacy and Platform Posture (code-verified, usable in copy)

- Offline-first: the local database on device is the source of truth. [Copy
  rule 2026-10-21: "offline-first" and "source of truth" are jargon; say it
  works without signal, saved on your phone and backed up to your account.]
- Local data is encrypted on device.
- Cloud data residency: EU (Dublin). [2026-10-21: member and sign-in emails
  go through Resend, which keeps its records in the United States; a residency
  line must say so. Section 0, item 8.]
- No adverts anywhere in the app.
- No user data is sold.
- No PII is sent to analytics or crash-reporting tooling. [SUPERSEDED
  2026-10-21: usage events are first-party and tied to a pseudonymous account
  id; say "no third-party analytics or tracking tools". Section 0, item 8.]
- Food search works fully offline.
- iOS is currently TestFlight / "coming soon" — never claim App Store
  availability on iOS until it is actually live. [SUPERSEDED 2026-10-21: it is
  live; copy says iPhone and links the App Store. Section 0, item 2.]

---

## F. Honest Limits (never contradict these in copy)

- No exercise demonstration videos — exercises use text cues, not video.
- No wearable or smartwatch companion app.
- No Apple Health or Health Connect link (removed 2026-06-30; section 0, item 6).
- No cardio logging (running, cycling, rowing), no chat assistant, no
  demonstration videos.
- iOS is not yet on the public App Store. [SUPERSEDED 2026-10-21: it is; section
  0, item 2.]
- No restaurant or takeaway food database.
- No micronutrient tracking. [NARROWED 2026-10-21: vitamins and minerals are
  shown, display only, where the food data has them; still no "tracking".
  Section 0, item 10.]
- No meal-photo AI (no photograph-a-meal-to-log-it feature).
- Progress Scan may withhold a score entirely when photo capture quality or
  confidence is insufficient — never promise a score will always be given.

---

## G. Operational Reward Mechanisms (marketing-operated, verified 2026-07-12)

[SUPERSEDED 2026-10-21: there is no Pro tier, so there is no "free week of
Volyume Pro" to give. Do not promise this reward. Section 0, item 3. Kept as
history.]

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
- **Available to everyone.** `HowYouTrain` and `TrainingConsiderations` are
  registered in the navigator with no tier guard. Verified
  `src/navigation/RootNavigator.js:464-465, 497-499`.
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
- **Weekly set targets.** Resolved by precedence adapted > plan > profile >
  research, so the target reflects the user's own plan and profile rather
  than a population table. Verified commit `416269c`. AMENDED 2026-10-05
  (register D219): the hand-set "Volume targets" editor is removed and
  hand-set targets are no longer applied; do not claim that people set
  their own weekly volume targets.
- **Session share cards.** Redrawn (frame, plan-name pill, hero label, stat
  icons) and the intensity badge is retired, so a session is no longer
  graded on the card. Verified commit `6f32275`.
- **Plan library.** The library holds 47 plans. [SUPERSEDED 2026-10-21: 58;
  section 0, item 1.] Two array holes in
  `LIBRARY_PLANS` aborted seeding partway, so affected users held 16 fewer
  and could not repair it; the seed marker is written only after the loop
  completes and existing plans are matched by name, so the next launch
  after the fix fills the gap without duplicating. Verified
  `src/lib/seedRoutines.js:2088-2103, 2131-2195` and commit `bd1cea0`.
- **UNKNOWN, must not appear in copy:** which version is currently live on
  Google Play, and therefore whether the 1.2.1 items were ever announced to
  store users. That is a Play Console fact, founder-held.
