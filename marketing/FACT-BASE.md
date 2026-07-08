# VOLYUME Marketing Fact-Base (single source of truth)

Consolidated from three verified source parts (`marketing/parts/1-training.md`,
`marketing/parts/2-nutrition.md`, `marketing/parts/3-positioning.md`). Every line
here is TRUE-AS-SHIPPED and traced to real code in those parts. Roadmap,
proposal and unverified items are quarantined in sections 10 and 11. This is a
reference for building copy, NOT finished ad copy.

British English. No em dash. No exclamation marks.

**ACCURACY RULING (enforced throughout): barcode scanning is Pro-gated, not
free.** The shipped route is `withProGuard(..., 'Barcode scanning')`. Any
"free barcode" line came from a proposal document (next-level-proposal P2), not
shipped code, and is wrong. Barcode is a Pro capability, positioned on
UK-data / offline / quality, never on price.

---

## 1. WHAT THE APP IS

**One line.** VOLYUME is a UK-first, deterministic (no-AI) physique app that puts
training, nutrition and a weekly coaching check-in in one calm, privacy-first,
ED-aware loop.

**One paragraph.** VOLYUME is an offline-first training and nutrition app for
people building a physique. It logs your lifts, builds and adapts hypertrophy
plans against MEV/MRV/MAV volume landmarks, and runs a weekly coaching review
that adjusts your calories and training and tells you why in plain English. The
whole coaching brain is pure, deterministic code: the same inputs always give the
same answer, and there is no AI anywhere. It is built UK-first (British food data,
EU-Dublin data residency), it is calm and ED-aware by design (fixed calorie
floors, no leaderboards, no shame), and it is privacy-first (encrypted on your
device, no ads, nothing sold). Training is Free; nutrition and coaching are Pro.

**In-app tagline (verified in code):** "Less thinking. More lifting."
(`src/screens/YouScreen.js` About section, line 261.)

**Alternative angle lines (all drawn only from real capabilities):**
- No AI. Same inputs, same answer, and it tells you why.
- Training, nutrition and a weekly check-in in one loop.
- A weekly coach that adjusts your numbers and explains every change.
- UK-first food data, searchable fully offline.
- Calorie floors that never move, whoever you are.
- Encrypted on your phone, kept in the EU, nothing sold.
- One private training partner. No feed, no leaderboard, no strangers.
- A contest countdown that adapts your plan as your show approaches.

---

## 2. COMPLETE FEATURE INVENTORY

Every line tagged (Free) or (Pro) exactly as the parts verified. Tier is
all-or-nothing (`proGate.js`): Free is the training core; the whole
nutrition/coaching domain is Pro.

### Training
- Workout logging, every set (weight and reps), no plan required. (Free)
- Edit or delete any logged set in-session. (Free)
- Weight and reps carry forward, so the next set is effectively one tap. (Free)
- Warm-up sets, excluded from tonnage, working-set counts and PR detection. (Free)
- Supersets in-session (pairs), alternating in the live session. (Free)
- Plate maths and warm-up ramp helpers, computed on device. (Free)
- Plan Library, browsable ready-made plans started in a couple of taps. (Free)
- 31 built-in training plans spanning beginner to division off-season. (Free)
- Manual workout builder: multi-day plans, steppers, duplicate, reorder, pair
  supersets. (Free)
- Training blocks (mesocycle scheduler), manual builder reachable. (Free)
- Automated block progression and deload detection (driven by the weekly coach). (Pro)
- In-session autoregulation (readiness / intent), downward-only. (Pro)
- Per-session set autoregulation with an audit trail (COMP-015). (Pro)
- Physique-division programming (8 divisions plus a general option). (Pro)
- Division fingerprint markers on the heatmap. (Pro-derived, shown when data exists)

### Rest timer
- Rest timer with auto-start and 3-2-1 end cues. (Free)
- Native Android background survival: lock-screen countdown, process protected,
  end alarm survives process death. (Free, Android-only module)

### Nutrition
- Food diary, per-day meal slots with a live macro rollup. (Pro)
- Calorie and macro targets from the deterministic engine (Mifflin-St Jeor /
  Katch-McArdle BMR, activity-tuned and adaptive TDEE). (Pro)
- Per-day-of-week target offsets, display-only, clamped to the safe floor. (Pro)
- Day-type targets (refeed, carb cycling, calorie banking), display-only. (Pro)
- One-tap re-log ("Add again") of any food, saved meal or recipe. (Pro)
- Serving entry by household serving or raw grams (grams are stored truth). (Pro)
- Offline local food search (SQLite FTS5, custom foods ranked first). (Pro)
- Lookup waterfall: local cache, bundled OFF UK, bundled CoFID, live OFF, USDA. (Pro)
- Personal-history ranking (favourites, recents, frequents). (Pro)
- Recents / Favourites / Frequents / Custom browse tabs. (Pro)
- Barcode scanning (EAN-13/8, UPC-A/E, Code-128) through the waterfall. (Pro)
- OCR nutrition-label scan, on-device MLKit, degrades to manual type-in. (Pro)
- Custom foods, including saving a missed barcode for next time. (Pro)
- Meal builder / saved meals, re-logged in one tap. (Pro)
- Curated UK meal library with free near-zero-calorie flavour additions. (Pro)
- Rule-based, deterministic meal suggestions (protein-first, no LLM). (Pro)
- Generated meal plan, one active plan per user, re-solvable on swaps. (Pro)
- Recipes, logged as one scaled line that rescales on edit. (Pro)
- Recipe import from a web URL via schema.org JSON-LD (no AI, https, online). (Pro)
- Sodium and sugar surfacing, display-only (not tracked or rolled up). (Pro)
- kcal to kJ display toggle (default kcal). (Pro)
- Water tracking, synced with soft-delete tombstones. (Pro)

### Coaching loop
- Weekly check-in with an explained WHY (fixed `WHY_LIBRARY` reasons). (Pro)
- Held decisions: coach holds rather than guesses on thin data (needs 3+ morning
  weigh-ins for a trend). (Pro)
- Adjustments with re-enforced sex-aware calorie floors at the apply path. (Pro)
- Training volume moves within MEV/MRV/MAV, with deload and hold states. (Pro)
- Contest countdown feeding contest-prep phase logic. (Pro)
- Structured cardio prescriptions (dose not activity, hard 5-session cap). (Pro)

### Connection (Partners)
- 1:1 invite-only pairs, isolated, up to 3 concurrent on Pro. (Pro)
- Derived weekly signal only (planned/done/met/state), never raw data. (Pro)
- Joint rest-safe streak (resting weeks never break it). (Pro)
- One cheer per day, DB-rate-limited; no free-text chat. (Pro)
- Milestone moments, calm, at most one per day, training-derived only. (Pro)
- Shared training block (only the display name crosses). (Pro)
- Invite-only, no discovery, no stranger surface. (Pro)
- Consent baked in, fails closed; either side can end and purge. (Pro)
- ED-safe by construction (freezes/suppresses under ED flags). (Pro)

### Progress and insight
- Workout history, full log of past sessions. (Free)
- Post-session summary (sets, tonnage, PRs, block shape, milestones). (Free)
- Lift Progress, per-exercise best estimated-1RM sparkline and percent change. (Free)
- Consistency view. (Free)
- Volume heatmap vs MV/MEV/MAV/MRV landmarks, trend window, custom landmarks. (Free)
- Year of Lifts, swipeable annual recap. (Free)
- Progress / Analytics hub. (Free)
- Training milestones (first, 10, 25, 50, 100, 250, 500 sessions). (Free)
- Automatic PB detection with in-session celebration, 3 PB types. (Free)
- Estimated 1RM (Epley). (Free)
- Exercise library, 448 canonical exercises plus user-added custom. (Free)
- Exercise detail with text form tips. (Free)

### Platform
- Android live on Google Play (`app.volyume`). (Free/Pro per feature)
- iOS shipped via TestFlight (public App Store release not yet live). (Free/Pro)
- Offline-first, encrypted local SQLite (SQLCipher, key in OS keystore). (all)
- Two Android home-screen widgets: Next session, Weekly consistency. (Free)
- iOS Live Activity and rest-timer live activity (reaches the lock screen). (Free)
- Home-screen quick actions: Start workout, Log food. (mixed)
- Full local backup (export/import JSON) and food CSV export. (mixed)
- Budgeted, quiet-hours-aware, foreground-suppressing notifications; ED-aware
  suppression. (all)
- No ads anywhere. (all)
- EU-Dublin data residency. (all)
- No PII to Sentry or analytics; derived-only sharing. (all)

---

## 3. DIFFERENTIATORS

Each answers a real competitor weakness (from Part 3 section 5, barcode
corrected).

1. **Deterministic, explainable, no-AI coaching.** Same inputs, same answer,
   every time, with a written reason you can check. Answers black-box AI apps
   whose advice you cannot interrogate or reproduce. The refusal to use AI is the
   moat.
2. **Calm, no-comparison, ED-aware safety floors.** Calorie floors that never
   move (1,500 male / 1,200 female-unknown), FFM and rapid-loss gates, no
   leaderboards, no shame copy, resting never reads as failure. Answers
   comparison-driven and streak-guilt apps whose engagement mechanics are a
   documented harm vector.
3. **UK-first data, EU-Dublin residency, local-first privacy, no ads.** Encrypted
   on-device database, derived-only sharing, no PII to analytics, no advertising.
   Answers data-harvesting and ad-funded apps.
4. **One integrated loop: training + nutrition + weekly check-in.** The plan, the
   food and the weekly adjustment talk to each other. Answers single-purpose apps
   where the logger, the calorie counter and the coach are three disconnected
   products.
5. **UK-first, offline-capable food data (Pro).** ~28.8k UK foods plus your own,
   searchable with zero network via an on-device FTS5 index, with barcode and
   on-device label OCR capture. Answers trackers that lean on a live API and
   place quality data behind weak search. (Barcode is a Pro capability positioned
   on UK-data / offline / quality, never on price.)
6. **Division-specific / contest programming.** Contest countdown and
   contest-prep phase logic adapt the plan and its cautions to a show date.
   Answers general apps with no physique-competition awareness.

---

## 4. PROOF POINTS

### Training (verified from code)
- **448 exercises** in the built-in library (`seedExercises.js` `RAW`), plus 16
  plan-support exercises and unlimited user-added custom exercises.
- **31 built-in training plans** (`seedRoutines.js` `LIBRARY_PLANS`).
- **8 physique divisions** plus a general / non-competing option: Men's Physique,
  Classic Physique, Bodybuilding, Bikini, Wellness, Figure, Women's Physique,
  Women's Bodybuilding.
- **3 PB types** auto-detected per set: estimated 1RM, heaviest weight, most reps
  at a weight.
- **7 training milestones:** first session, 10, 25, 50, 100, 250, 500.
- **Mesocycle length:** standard block 5 weeks (4 build + 1 recovery), advanced 6
  weeks (5 build + 1 recovery); recovery week at 0.50 set multiplier.
- **Cardio cap:** max 5 sessions/week; cut default 3 sessions of 20-30 min low
  intensity.

### Food database (verified from each `.dat` `_meta` header, not estimated)

| Snapshot | Rows | Source | Licence |
|---|---|---|---|
| OpenFoodFacts UK (`off_uk_snapshot.dat`) | 25,965 | openfoodfacts.org search API, country=united-kingdom | Open Database License (ODbL) 1.0 |
| CoFID UK (`cofid_uk.dat`) | 2,852 | McCance and Widdowson's CoFID, 7th edition, 2021 | Open Government Licence v3.0 |
| **Total bundled** | **28,817** | | |

- CoFID attribution string shipped: "Contains public sector information licensed
  under the Open Government Licence v3.0."
- OFF snapshot refreshed weekly (GitHub Actions); CoFID is a static dataset.
- Live fallbacks extend it online: OpenFoodFacts live API and USDA FoodData
  Central.
- Do not use the stale code-comment estimates ("~100k+", "~3k"); the
  `_meta.rowCount` figures (25,965 and 2,852) are authoritative.

### One-tap and search
- **One-tap re-log:** a single row tap on the "Add again" tab re-logs any food,
  saved meal or recipe at the remembered last portion (double-tap guarded).
- **Search works fully offline:** the first three waterfall steps read the
  on-device SQLite `foods` table; the FTS5 index and its LIKE fallback need no
  network.

### Pricing and trials
- **Two SKUs, both Pro:** `pro_monthly` and `pro_annual`. These IDs never change.
- **Reference prices in code:** PS2.99/month and PS19.99/year (annual about 44%
  off twelve monthly payments). These are REFERENCE values only; the actual
  charged price is store-set per region via App Store Connect / Google Play
  Console (`usePlayPrices`).
- **Two distinct real trials:**
  1. A 14-day in-app trial that begins from in-app Article 9 consent, no card
     required.
  2. A separate 7-day store intro free trial, configured per product in
     App Store Connect / Google Play Console.
- Do not shorten the 14-day trial in copy; its length is a deliberate decision.

### Tap counts [UNVERIFIED exact totals - confirm on device]
- Repeat last session: one action from the Home hero.
- Start a workout / blank session: one action from the Home hero.
- Log the next set: effectively one tap once weight/reps carry forward.
- Start a plan from the library: a couple of taps (state as "a couple of taps",
  not a hard number). [UNVERIFIED exact tap total - confirm on device.]

---

## 5. AUDIENCE AND MESSAGING ANGLES

The one true hook per segment (Part 3 section 6, barcode corrected).

- **Physique competitors.** "A coach that counts down to your show and holds the
  floors when prep gets aggressive." (contest countdown + safety floors)
- **Evidence-based, anti-AI lifters.** "No AI. Same inputs, same answer, and it
  tells you why." (deterministic explainable engine)
- **MyFitnessPal refugees.** "UK-first food data, no ads, your data stays on your
  device, and the diary and the coach are one loop." (privacy + no ads + UK food
  data + integrated loop; NOT free barcode)
- **Privacy-conscious users.** "Encrypted on your phone, EU-Dublin only, nothing
  sold, nothing sent to trackers." (SQLCipher + residency + no PII)
- **UK users.** "Built UK-first: British food data, EU data residency, prices in
  pounds." (UK food coverage + residency)
- **Self-coached / between-coaches lifters.** "A weekly check-in that adjusts
  your calories and training and explains the change, without hiring anyone."
  (weekly coach + WHY)

---

## 6. FORUM / COMMUNITY POSITIONING

For a sceptical fitness forum (Part 3 section 7, barcode corrected).

### Credible, non-salesy framings (sound like the person who built it)
1. "I got tired of coaching apps that spit out a number with no reasoning, so I
   built one where the weekly adjustment is a plain deterministic rule and it
   shows you the why. Same inputs always give the same answer, so you can
   actually audit it."
2. "It refuses to move your calories on noise. If you have not logged enough
   weights that week it just holds and tells you to log, instead of guessing.
   That restraint was the whole point."
3. "The connection side is deliberately anti-social-media: one private partner, a
   rest-safe streak, one cheer a day, no feed, no leaderboard, no discovery. If
   that sounds boring, that is on purpose."

### Honest answer to "why not just use MyFitnessPal / Hevy / a coach"
"MyFitnessPal is a food logger, not a coach, it is ad-funded, and here the diary
and the coach are one loop with UK-first data that works offline and stays on
your device. Hevy is a great logger but its social side is leaderboards and
comparison, which is exactly what this avoids. A human coach is better if you can
afford the right one and they actually explain their reasoning; this is for the
weeks or the budgets where you are self-coaching, and it will not pretend to be a
person." (Note: barcode scanning is a Pro feature here; do not claim it is free.)

### NOT-to-say list (forum)
- Do not claim it replaces a good human coach.
- Do not claim guaranteed results, weight loss, or stage-ready outcomes.
- Do not oversell AI in either direction ("smart", "learns you"); it is
  deterministic, say so.
- Do not badmouth competitors by name beyond the factual, checkable difference.
- Do not imply a free partner tier, medical monitoring, or clinical ED treatment.
- Do not claim free barcode scanning; barcode is Pro.
- Do not post before/after photos or transformation imagery.

---

## 7. HONEST LIMITS (whole app, verified by absence)

- No exercise demo videos or animations; coaching is text cues only.
- No velocity-based training / bar-path / VBT.
- No wearable / smartwatch app (Wear OS or watchOS); Health Connect / HealthKit
  is read-only and scoped to weight, steps and completed cardio, not lifting.
- iOS is TestFlight-only; no public App Store listing yet.
- No restaurant / menu / takeaway database; food data is packaged-product (OFF)
  and generic-food (CoFID) only.
- No photo-portion / meal-photo AI (and never will be, by the no-AI mandate).
- Sodium and sugar are view-only, not tracked or rolled up; no daily totals.
- No micronutrient tracking at all in the shipped build.
- Supersets are pairs only; no giant sets / tri-sets of 3+.
- Native background rest timer is Android-only; iOS parity unconfirmed.
- No in-app messaging / chat (one cheer per day plus block is the whole surface).
- No stranger discovery / user search (invite-only, by design).
- No social feed / no leaderboards (deliberate).
- No email/password login; Apple and Google sign-in only.

---

## 8. STORE AND AD-SAFE NOTES

### True, searchable keywords (all defensible, "free barcode" dropped)
- "no AI workout app", "deterministic coaching", "MyFitnessPal alternative",
  "UK food database", "offline workout tracker", "encrypted fitness app",
  "no ads gym app", "hypertrophy MEV MRV coach", "contest prep app",
  "training partner accountability", "calm fitness app".
- Use only what is true: UK-food and offline are checkable. Do not keyword
  "AI coach" (it is the opposite), "watch app" (not shipped), or "free barcode"
  (barcode is Pro).

### Platform ad-policy cautions (health/fitness), keep adverts approvable
Google Play + Google Ads, Apple and Meta all restrict:
- Before/after body imagery and "transformation" photos (high Meta rejection
  risk; also collides with the ED line). Do not use.
- Weight-loss promises, "lose X lbs", rapid-results and calorie-deficit
  guarantees (restricted personalised-health-claim category). Do not use.
- Implying negative self-perception ("fix your body", "stop being unfit") (Meta
  idealised-body-image / negative-self-perception policies). Do not use.
- Health claims implying medical benefit or condition treatment, including any
  eating-disorder treatment framing. Do not use.

Safe advert angles: methodology and trust ("no AI, it shows its working"),
privacy ("your data stays on your phone, no ads"), UK food data, calm/no-shame
framing kept non-medical, integrated training-plus-nutrition. Data-safety /
privacy sections must match the real posture: encrypted at rest, EU residency,
no data sold, no PII to analytics.

---

## 9. CLAIMS WE CAN MAKE vs CLAIMS WE CANNOT MAKE

### CAN make (verified true)
- "No AI. Same inputs, same answer, every time, and it tells you why."
- "Safety floors that never move: 1,500 kcal for men, 1,200 for women, whoever
  you are." (keep non-medical, no ED-treatment framing)
- "Your data is encrypted on your device and stays in the EU. No ads. Nothing
  sold."
- "UK-first food data, searchable fully offline." (position barcode as a Pro
  capability on UK-data / offline / quality)
- "Training, nutrition and a weekly check-in in one loop."
- "A private training partner: one person, a rest-safe streak, one cheer a day.
  No feed, no leaderboard, no strangers."
- "Works offline; the app is yours on your phone."
- "A contest countdown that adapts your plan as your show approaches."

### CANNOT make (false, unverifiable, or crosses the ED / medical line)
- **"Free barcode scanning."** Barcode scanning is a Pro feature as shipped
  (`withProGuard(..., 'Barcode scanning')`); a free-barcode hook is only a
  proposal (next-level-proposal P2), not live. Never claim free barcode in
  differentiators, audience angles, keywords or headlines.
- Any guaranteed result: weight loss, muscle gain, "stage-ready", "get shredded",
  specific pounds or timelines.
- Any medical or clinical claim: treats/prevents/monitors any condition, or
  treats or screens for eating disorders. The ED-safety system is a design
  guardrail, not a medical service.
- Before/after or transformation imagery, or body-shame framing.
- "AI", "smart", "learns you", "adapts intelligently"; the engine is
  deterministic.
- "On the App Store" as general availability; iOS is TestFlight-only today.
- "Watch app", "Wear OS", "syncs to your wearable"; not shipped.
- "Exercise demo videos / animated guides"; not shipped.
- A free partner tier, or partner discovery / find-people; not shipped / not the
  model.
- "Your food photo, logged automatically" or any AI/photo food recognition; not a
  feature.

---

## 10. ROADMAP / NOT-YET (quarantined, do not use as live claims)

- Workout write-back to Apple Health / Health Connect (`health.js` lists
  `'workout'` as a planned, not-yet-wired write scope).
- iOS public App Store release (next-level-proposal P5; iOS is TestFlight-only).
- iOS native background rest-timer parity (the foreground-service rest timer is
  Android-only; iOS parity unconfirmed).
- Free-barcode proposal (next-level-proposal P2); NOT live, barcode is Pro.
- Micronutrients / NRV (decision-gated MN-1, confirmed absent).
- Exercise demo videos / animations (proposal only).
- Wearable / watch app (Wear OS and watchOS are scoping memos, not shipped).

---

## 11. FOUNDER-CONFIRM FLAGS (confirm before marketing)

- **Partner server migrations applied to production?** (`migrate_092..099` and
  `102` to EU-Dublin.) Gates promising first-name display and server-side purge
  as guaranteed live; until confirmed, the app falls back to "Your partner".
- **iOS rest-timer background parity.** Confirm iOS behaviour before claiming
  parity with the Android background rest timer.
- **Exact tap counts.** "A couple of taps" is safe; any hard tap number for
  starting a plan must be confirmed on a physical device.
- **Reference prices match live store prices.** Confirm PS2.99/mo and PS19.99/yr
  match the current App Store Connect / Google Play Console prices for the target
  region; the charged amount is store-set, so the reference figures are indicative only.
