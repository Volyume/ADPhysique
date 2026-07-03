# VOLYUME MARKETING FACT-BASE — Part 3: Positioning

Coaching loop, connection, platform, pricing, differentiators, audience angles,
forum positioning, honest limits, store/ad-safe notes, claims split.

Scope: read-only extraction. Every claim is verified against the code cited, or
flagged. British English. No em dash. Roadmap and unapplied items are quarantined
in their own callouts so no false "shipped" claim leaks into copy.

Sources verified: `src/lib/weeklyCoach.js`, `coachApply.js`,
`cardio/cardioEngine.js`, `contestCountdown.js`, `nutritionEngine.js`,
`src/lib/partners/**` (service, moments, tierGate, consent, sharedStreak),
`src/screens/PartnerScreen.js`, `src/navigation/RootNavigator.js`,
`src/lib/payments/catalogue.js` + `cascade.js`, `src/lib/dbCrypto.js`,
`src/lib/sentry.js`, `src/lib/dataBackup.js`, `src/lib/food/csvExport.js`,
`app.json`, `App.js`, CLAUDE.md.

---

## 1. COACHING LOOP

The weekly coach is a set of pure, deterministic functions (`runWeeklyCoach`,
`coachApply.js`). Same inputs, same output, every time. No AI, no randomness.

### 1.1 The weekly check-in and the explained WHY
- Each week the coach reads the user's own data (weigh-ins, adherence, training
  signal, recovery) and produces an adjustment plus a plain-English reason. The
  reason strings live in a fixed `WHY_LIBRARY` in `weeklyCoach.js` (e.g. "Your
  recovery's down. Calories hold until it's back."). [VERIFIED]
- The user always sees why the plan changed or held, not just what changed.
  This is a genuine capability, not marketing gloss. [VERIFIED]

### 1.2 Held decisions (data confidence gate)
- When the data is too thin to act on, the coach HOLDS rather than guesses:
  fewer than 3 morning weigh-ins in a week returns a `data_hold` with a calm
  message ("Need at least 3 morning weights for a reliable trend. Calories held
  this week."). Unusual weeks and short trends also downgrade confidence.
  [VERIFIED, `weeklyCoach.js` data-confidence block]
- Honest framing for copy: the coach would rather wait for clean data than move
  your numbers on noise.

### 1.3 Adjustments with re-enforced safety floors
- Calorie adjustments are clamped by a sex-aware floor re-applied at the APPLY
  path, not just at suggestion time: 1,500 kcal male, 1,200 kcal female/unknown
  (`kcalFloorForSex`, `coachApply.js`). The Apply path is an explicit
  enforcement gate so a cut can never be written below the floor. [VERIFIED]
- Training volume moves within MEV/MRV/MAV landmarks; deload and hold states
  exist (`volumeDelta`, `deloadFlag`, `trainingSignal: reduce|hold|push`).
  [VERIFIED]

### 1.4 Contest countdown
- A contest/show countdown exists and feeds the engine's phase logic
  (`contestCountdown.js`; `contest_prep` phase in `nutritionEngine.js` with a
  distinct recovery modifier and low volume ceiling). [VERIFIED]
- Copy-safe claim: as a show approaches, the plan and its cautions adapt to the
  time remaining. Do not claim it "guarantees stage-ready" (see claims split).

### 1.5 Cardio prescriptions
- `cardio/cardioEngine.js` gives structured cardio targets with a hard session
  cap (`MAX_CARDIO_SESSIONS = 5`). On a cut, cardio is a deficit lever applied
  AFTER food and steps; off a cut it stays light and health-oriented and is
  never used as a deficit lever. Poor recovery pauses cardio. [VERIFIED]
- Example shipped copy: "Aim for 3 cardio sessions this week, 20 to 30 min at an
  easy pace. Your choice of activity." [VERIFIED]

### 1.6 Free / Pro for the coaching loop
- The entire coaching/nutrition loop is Pro: weekly coach, calorie/macro
  targets, adjustments, the WHY, cardio prescriptions, check-ins, contest prep.
  [VERIFIED against proGate mandate in CLAUDE.md]
- Free tier: Plan Library, workout builder, workout logging, exercise library,
  PBs, progress stats. No coaching, no nutrition. [VERIFIED, CLAUDE.md gating]

---

## 2. CONNECTION — the Partners feature AS SHIPPED

Direction 1 ("Partners") from the connection corpus is built and wired:
`PartnerScreen` is registered in `RootNavigator` behind `withProGuard`
("Training partner"), the placement spine and milestone-moments beat have
source-level guard tests, and `PRO_MAX_PAIRS = 3`. [VERIFIED]

State it plainly: this is quiet, private, invite-only accountability. It is the
deliberate opposite of a social feed.

### 2.1 What it is (true as shipped)
- **1:1 pairs, isolated.** Each pairing renders as its own PairCard with no
  cross-pair totals and no ordering by performance. On Pro a user can hold up to
  3 concurrent pairs; the pairs never see or rank against each other.
  [VERIFIED, `PartnerScreen.js`]
- **Derived weekly signal only.** The only data that crosses is a per-week
  derived row: planned count, done count, week-met boolean, and a
  training/resting state. Never raw workouts, sets, reps, weights, food, or
  location. A source-level allowlist guard test fails the build if any raw-shaped
  key is ever added. [VERIFIED, `service.js` `pushWeekSignal` +
  `partnerPrivacy.guard.test.js`]
- **Joint rest-safe streak.** Counts consecutive weeks both people met their
  OWN plan. Resting or quiet weeks never break it and are never attributed to a
  person. [VERIFIED, `sharedStreak.js`, `moments.js`]
- **One cheer per day.** A single one-tap cheer, rate-limited at the database by
  a unique constraint, not by client trust. This one-cheer-per-day plus the
  block primitive IS the entire messaging surface. There is no free-text chat.
  [VERIFIED, `service.js` `sendCheer`]
- **Milestone moments (just built).** A calm, at-most-one-per-day acknowledgement
  surfaced in the PairCard and the post-workout beat, derived locally from
  already-synced pair data: a shared-streak week kept, the partner finishing a
  training block, or the partner setting a personal best. Training-derived events
  only, never weight/food/body. First names only, no numbers, no exercise names,
  full stops, no exclamation marks. [VERIFIED, `moments.js`]
- **Shared training block.** A pair can agree to run the same block; only the
  proposer's plan display name crosses (capped at 80 characters), never the
  plan's contents. [VERIFIED, `service.js` `proposeSharedBlock`]
- **First names and block name only.** The only identity that crosses is the
  partner's first name (server-snapshotted); the only content is the block's
  display name. [VERIFIED]
- **Invite-only, no discovery.** Pairing is an out-of-band code/link redeemed
  server-side. There is no in-app search, no "suggested athletes", no stranger
  surface of any kind. [VERIFIED, `link.js`, `service.js`]
- **Safety and consent baked in.** Pairing writes an append-only
  `partner_sharing` consent row and fails closed (if the consent write fails the
  pairing is rolled back). Either side can end the pairing at any time, which
  purges the shared rows server-side and records a consent withdrawal. A block
  primitive returns an indistinguishable "invite invalid" so a block is
  invisible. [VERIFIED, `service.js`, `consent.js`]
- **ED-safe by construction.** Outbound moments and signals freeze to "resting"
  under the sender's open ED flag; inbound rendering is suppressed fail-closed
  under the recipient's ED flag, high SCOFF, calm mode, or any failed safety
  read. [VERIFIED, `moments.js` `isSuppressed`, `weekSignalWriter`]
- **Notifications are minimal.** Two partner pushes only (cheer received, shared
  streak kept), budgeted in the lowest-priority notification slot, quiet-hours
  respecting, and silenced entirely under an open ED flag. [VERIFIED, corpus
  A1 §12 + notifications budget]

### 2.2 Free / Pro for Partners
- Partners is Pro-gated end to end (`withProGuard`). A free or lapsed user does
  not get partner access; the lapsed-partner data-layer gate mutes a churned
  user's outbound signal to "resting" so they cannot keep feeding a pairing they
  can no longer see. [VERIFIED, `tierGate.js`]

> QUARANTINE — do NOT put in copy as a live claim:
> - Some partner server migrations are founder-run and may not yet be applied to
>   production EU-Dublin (CLAUDE.md STATUS lists `migrate_092..099` outstanding;
>   the partner first-name RPC shape is handled for both pre- and post-`102`
>   states, with a "Your partner" fallback until `102` is applied). Until the
>   founder confirms these are applied, do not promise first-name display or
>   server-side purge as guaranteed live. [FLAGGED — founder to confirm]
> - "Invitee accepts free" / "free = 1 pair" were pricing OPTIONS in the decision
>   brief, not shipped. As shipped, Partners is fully Pro. Do not imply a free
>   partner tier. [FLAGGED]

---

## 3. PLATFORM

### 3.1 iOS and Android
- Android: live on Google Play (package `app.volyume`). [VERIFIED, `app.json`]
- iOS: bundle `app.volyume`, shipped via TestFlight. A public App Store release
  is a proposed, not-yet-live project (next-level-proposal P5). [VERIFIED —
  claim "on iOS" must be qualified as TestFlight for now; see honest limits]

### 3.2 Offline-first, local-first
- The encrypted local SQLite database is the source of truth on device; the app
  works offline and syncs when it can. [VERIFIED, CLAUDE.md architecture +
  `dataBackup.js` comment]

### 3.3 Encrypted local storage
- SQLite encrypted with SQLCipher via expo-sqlite's built-in `useSQLCipher`
  build flag. The key is a per-device 256-bit random value held in the OS
  keystore (SecureStore). No new dependency; device-only encryption. [VERIFIED,
  `dbCrypto.js`]

### 3.4 Widgets
- Two Android home-screen widgets: "Next session" and "Weekly consistency"
  (sessions done this week and weeks running). [VERIFIED, `app.json`
  react-native-android-widget config]
- iOS Live Activity and a rest-timer live activity ship as native modules
  (`modules/live-activity`, `modules/rest-timer-live`); the rest timer reaches
  the lock screen. [VERIFIED, modules present + CLAUDE.md]
- Honest scope: this is two Android widgets plus the live activities, not a full
  widget family. Do not claim a large widget suite. [VERIFIED absence]

### 3.5 Quick actions
- Home-screen quick actions (long-press app icon): "Start workout" and
  "Log food". [VERIFIED, `App.js` via expo-quick-actions]

### 3.6 Exports
- Full local backup: `exportBackup()` writes the entire local database plus all
  Volyume preferences to a single JSON file and hands it to the native share
  sheet; `importBackup()` restores it. Entitlement/trial/payment state is
  deliberately excluded. [VERIFIED, `dataBackup.js`]
- Food CSV export exists (`food/csvExport.js`). [VERIFIED]

### 3.7 Notifications
- Budgeted, category-based, quiet-hours-aware, foreground-suppressing. Weight/
  food-adjacent notifications suppress under an open ED flag. [VERIFIED,
  `src/lib/notifications/**` + CLAUDE.md]

### 3.8 No ads, ever
- No ad SDK anywhere (no AdMob/AdSense/ad networks in dependencies or code).
  [VERIFIED by absence]

### 3.9 EU-Dublin data residency
- All user data stays in Supabase EU-Dublin; EU residency is an absolute
  project-level commitment (the region is set at the Supabase project, not a
  public code constant). [VERIFIED per CLAUDE.md + supabase rules; the specific
  URL/region is environment-configured]

### 3.10 Health data never uploaded raw; derived-only sharing
- Components never query the backend directly; everything flows through the sync
  layer. Health/body/food data is not exported to third parties. No PII goes to
  Sentry or analytics (`sentryScrub.js`, no username/IP, traces sample 0.05).
  Anything that crosses to another person is derived (attendance vs own plan),
  never raw; share cards never carry name/bodyweight/measurements/private notes.
  [VERIFIED, `sentry.js`, partner privacy guard, CLAUDE.md]

---

## 4. PRICING AND TRIAL

- **Products.** Two SKUs, both Pro: `pro_monthly` and `pro_annual`. These IDs
  are the source of truth in code and never change. [VERIFIED, `catalogue.js`]
- **Reference prices in code.** `£4.99/month` (`pro_monthly`) and `£29.99/year`
  (`pro_annual`), the annual about 50% off twelve monthly payments. These are
  REFERENCE values in `catalogue.js` and are explicitly NOT the user-facing
  display price. [VERIFIED]
- **Actual charged price is store-set.** Every paywall renders Google Play's own
  localised price live via `usePlayPrices`; the authoritative amount a user is
  charged is set per region in Play Console, not in the app. So the £4.99/£29.99
  figures match the founder-supplied UK reference but the charged amount for any
  given user comes from the store. [VERIFIED]
  - Founder-supplied UK figures: £4.99/mo, £29.99/yr. [founder-supplied; also
    present in code as reference, but the charged figure is store-set]
- **Trial — two distinct things, both real:**
  1. A **14-day in-app trial** (the cascade's complete-trial stage) that begins
     from in-app Article 9 consent, not from a Play Billing purchase, so no card
     is required to start it. [VERIFIED, `cascade.js`: "the 14-day in-app trial"]
  2. A separate **7-day Play Billing intro free trial** configured per product
     in Play Console (the store's own intro offer). [VERIFIED, `catalogue.js`
     comment + `cascade.js` "the 7-day Play intro offer"]
  - Founder-supplied "14-day, no card" maps to trial (1) and is corroborated by
    code, so it can be stated as true, with the note that the exact no-card
    mechanics are the in-app trial, not the Play intro offer. [VERIFIED]
- Do NOT shorten the 14-day trial in copy assumptions: research shows long
  trials convert better and the 14-day length is a deliberate decision.

---

## 5. DIFFERENTIATORS (honest, each answering a real competitor weakness)

1. **Deterministic, explainable, no-AI coaching.** Same inputs, same answer,
   every time, with a written reason you can check. Answers the black-box AI
   apps whose advice you cannot interrogate or reproduce. The refusal is the
   moat: AI-branded competitors cannot make this claim. [VERIFIED]
2. **Calm, no-comparison, ED-aware safety floors.** Calorie floors that never
   move (1,500 male / 1,200 female-unknown), FFM and rapid-loss gates, no
   leaderboards, no shame copy, resting never reads as failure. Answers
   comparison-driven and streak-guilt apps whose engagement mechanics are a
   documented harm vector. [VERIFIED]
3. **UK-first data, EU-Dublin residency, local-first privacy, no ads.**
   Encrypted on-device database, derived-only sharing, no PII to analytics, no
   advertising. Answers data-harvesting and ad-funded apps. [VERIFIED]
4. **One integrated loop: training + nutrition + weekly check-in.** The plan,
   the food, and the weekly adjustment talk to each other. Answers single-purpose
   apps where the lifting logger, the calorie counter, and the coach are three
   disconnected products. [VERIFIED — engine modules share the same data]
5. **Free barcode scanner.** Barcode food logging is available without paywalling
   the scan itself. Answers apps that moved barcode scanning behind a
   subscription. [VERIFIED per next-level-proposal P2 / listing draft; the
   scanner is a free-tier hook — confirm exact free/Pro boundary of the food
   diary vs the scan in the store listing before headlining]
6. **Division-specific / contest programming.** Contest countdown and
   contest-prep phase logic adapt the plan and its cautions to a show date.
   Answers general apps with no physique-competition awareness. [VERIFIED]

---

## 6. AUDIENCE ANGLES (the ONE true hook per segment)

- **Physique competitors.** "A coach that counts down to your show and holds the
  floors when prep gets aggressive." (contest countdown + safety floors)
- **Evidence-based, anti-AI lifters.** "No AI. Same inputs, same answer, and it
  tells you why." (deterministic explainable engine)
- **MyFitnessPal refugees.** "UK-first food data and a free barcode scan, no ads,
  your data stays on your device." (barcode + privacy + no ads)
- **Privacy-conscious users.** "Encrypted on your phone, EU-Dublin only, nothing
  sold, nothing sent to trackers." (SQLCipher + residency + no PII)
- **UK users.** "Built UK-first: British food data, EU data residency, prices in
  pounds." (UK food coverage + residency)
- **Self-coached / between-coaches lifters.** "A weekly check-in that adjusts
  your calories and training and explains the change, without hiring anyone."
  (weekly coach + WHY)

---

## 7. FORUM POSITIONING (sceptical fitness forum)

### Credible, non-salesy framings (sound like the person who built it)
1. "I got tired of coaching apps that spit out a number with no reasoning, so I
   built one where the weekly adjustment is a plain deterministic rule and it
   shows you the why. Same inputs always give the same answer, so you can
   actually audit it."
2. "It refuses to move your calories on noise. If you have not logged enough
   weights that week it just holds and tells you to log, instead of guessing.
   That restraint was the whole point."
3. "The connection side is deliberately anti-social-media: one private partner,
   a rest-safe streak, one cheer a day, no feed, no leaderboard, no discovery.
   If that sounds boring, that is on purpose."

### Honest answer to "why not just use MyFitnessPal / Hevy / a coach"
- "MyFitnessPal is a food logger, not a coach, and the barcode scan went behind a
  paywall; here the scan is free and the coach and the diary are one loop.
  Hevy is a great logger but its social side is leaderboards and comparison,
  which is exactly what this avoids. A human coach is better if you can afford
  the right one and they actually explain their reasoning; this is for the weeks
  or the budgets where you are self-coaching, and it will not pretend to be a
  person."

### NOT-to-say list (forum)
- Do not claim it replaces a good human coach.
- Do not claim guaranteed results, weight loss, or stage-ready outcomes.
- Do not oversell AI in either direction ("smart", "learns you") — it is
  deterministic, say so.
- Do not badmouth competitors by name beyond the factual, checkable difference.
- Do not imply a free partner tier, medical monitoring, or clinical ED treatment.
- Do not post before/after photos or transformation imagery.

---

## 8. HONEST LIMITS (whole app, verified by absence)

- **No exercise demo videos or animations.** Largest visible content gap vs Hevy;
  a proposal only. [VERIFIED absence]
- **No wearable / watch app.** Only iOS Live Activity and a rest-timer live
  activity exist; Wear OS and watchOS are scoping memos/proposals, not shipped.
  [VERIFIED absence]
- **iOS is TestFlight-only.** No public App Store listing yet. [VERIFIED]
- **No in-app messaging / chat.** The one-cheer-per-day plus block is the entire
  person-to-person surface, by design. [VERIFIED]
- **No stranger discovery / user search.** Invite-only by design. State as a
  choice, not a gap. [VERIFIED]
- **No AI food photo recognition.** Food logging is barcode plus UK-first search,
  no photo/AI recognition (consistent with the no-AI stance). [VERIFIED — no
  such module found]
- **No social feed / no leaderboards.** Deliberate. [VERIFIED]
- **No email/password login.** Apple and Google sign-in only. [VERIFIED,
  CLAUDE.md]

---

## 9. STORE AND AD-SAFE NOTES

### True, searchable keywords (all defensible)
- "no AI workout app", "deterministic coaching", "MyFitnessPal alternative",
  "free barcode scanner", "UK food database", "offline workout tracker",
  "encrypted fitness app", "no ads gym app", "hypertrophy MEV MRV coach",
  "contest prep app", "training partner accountability", "calm fitness app".
- Use only what is true: barcode-free and UK-food are checkable; do not keyword
  "AI coach" (it is the opposite) or "watch app" (not shipped).

### Platform ad-policy cautions (health/fitness) — keep adverts approvable
- **Google Play + Google Ads / Apple / Meta all restrict:**
  - Before/after body imagery and "transformation" photos — high rejection risk
    on Meta especially; also collides with this app's ED line. Do not use.
  - Weight-loss promises, "lose X lbs", rapid-results claims, calorie-deficit
    guarantees — restricted personalised-health-claim category. Do not use.
  - Implying negative self-perception ("fix your body", "stop being unfit") —
    Meta's "unrealistic/idealised body image" and negative-self-perception
    policies reject these. Do not use.
  - Health claims implying medical benefit or condition treatment (including any
    eating-disorder treatment framing) — would trigger medical-claim review and
    is false for this product. Do not use.
- **Safe advert angles:** methodology and trust ("no AI, it shows its working"),
  privacy ("your data stays on your phone, no ads"), UK food data, free barcode,
  calm/no-shame framing (kept non-medical), integrated training-plus-nutrition.
- Data-safety / privacy sections (Play Data Safety, App Privacy) must match the
  real posture: encrypted at rest, EU residency, no data sold, no PII to
  analytics. These are checkable and should be stated plainly.

---

## 10. CLAIMS WE CAN MAKE vs CLAIMS WE CANNOT MAKE

### CAN make (verified true)
- "No AI. Same inputs, same answer, every time — and it tells you why." [VERIFIED]
- "Safety floors that never move: 1,500 kcal for men, 1,200 for women, whoever
  you are." [VERIFIED — keep non-medical, no ED-treatment framing]
- "Your data is encrypted on your device and stays in the EU. No ads. Nothing
  sold." [VERIFIED]
- "Free barcode scanning with UK-first food data." [VERIFIED — confirm the exact
  free boundary before headlining]
- "Training, nutrition and a weekly check-in in one loop." [VERIFIED]
- "A private training partner: one person, a rest-safe streak, one cheer a day.
  No feed, no leaderboard, no strangers." [VERIFIED]
- "Works offline; the app is yours on your phone." [VERIFIED]
- "A contest countdown that adapts your plan as your show approaches." [VERIFIED]

### CANNOT make (false, unverifiable, or crosses the ED / medical line)
- Any guaranteed result: weight loss, muscle gain, "stage-ready", "get shredded",
  specific pounds or timelines. [NOT VERIFIABLE — never claim]
- Any medical or clinical claim: treats/prevents/monitors any condition, or
  treats or screens for eating disorders. The ED-safety system is a design
  guardrail, NOT a medical service — never market it as care or treatment.
- Before/after or transformation imagery, or body-shame framing. [ED line + ad
  policy]
- "AI", "smart", "learns you", "adapts intelligently in an AI sense" — false;
  the engine is deterministic. [Do not claim]
- "On the App Store" as a general-availability claim — iOS is TestFlight-only
  today. [Qualify or omit]
- "Watch app", "Wear OS", "syncs to your wearable" — not shipped. [Do not claim]
- "Exercise demo videos / animated guides" — not shipped. [Do not claim]
- A free partner tier, or partner discovery / find-people — not shipped / not
  the model. [Do not claim]
- "Your food photo, logged automatically" or any AI/photo food recognition — not
  a feature. [Do not claim]

<!-- end of Part 3 -->
