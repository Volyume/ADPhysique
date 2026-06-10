# Competitive Audit 01 — Exercise Library & Demonstrations

**Date:** 10 June 2026
**App:** Volyume (UK, Android-first, training + nutrition coaching)
**Scope:** Exercise libraries, demonstration delivery, technique guidance, AI form-check, content licensing
**Method:** 21 web searches across app stores, Reddit-indexed reviews, comparison sites, vendor pages. Sources cited inline and at the end. No code was changed.

---

## 1. Volyume baseline (for reference)

- ~448 seeded exercises with rich metadata: muscle, subregion, equipment, movement pattern, stimulus-to-fatigue ratio (SFR), fatigue cost.
- Structured form cues (setup / execution / cues / common mistakes) for flagship lifts.
- Demonstrations are **thin**: two licensed MoveKit sample videos plus start/end frame loops from a public-domain set for a handful of lifts.
- Full-library MoveKit animation licence is an open founder decision.
- SFR-ranked substitutes, custom exercise creation, detail screens with history charts and PRs.
- "Watch the demo" banner + how-to sheet in the active workout.

---

## 2. Top 10 ranked (exercise library + technique guidance quality)

| # | App | Library size | Demo format | Why ranked here |
|---|-----|-------------|-------------|-----------------|
| 1 | **Muscle & Motion (Strength)** | 1,200+ exercises, 2,000+ 3D videos | 3D anatomical animation with muscle activation, mistakes, injury risk | Deepest technique education anywhere; trusted by 300+ universities and trainers |
| 2 | **MuscleWiki** | 2,000+ free videos (1,600+ in app) | Real human video, interactive muscle map | Best free form-learning resource; beginners repeatedly credit it with getting them into the gym |
| 3 | **Fitbod** | 1,600+ exercises | Professionally filmed video, some multi-angle, half-speed playback | Best-in-class delivery polish inside a tracker/recommender |
| 4 | **Alpha Progression** | 550–690 exercises | Real-human video filmed with a gym professional, multiple angles | High-consistency in-house library tightly integrated with hypertrophy planning |
| 5 | **Jefit** | 1,400–1,500+ | HD video/animated demos, muscle activation diagrams | Largest mainstream library, but cluttered UX and ad fatigue dilute it |
| 6 | **RP Hypertrophy** | 250+ technique videos | Real video fronted by Dr Mike Israetel | Highest-authority cueing; weakest app shell (dated UI, $34.99/mo, stagnant exercise pool) |
| 7 | **Hevy** | 350–400+ | Clean illustrations/animations + step-by-step text | "Amazing quality videos" per Play reviews, but guidance is shallow — it is a tracker first |
| 8 | **Nike Training Club** | 100s within workouts | Real-time trainer-led video with audio cueing | Excellent for guided classes; no browsable strength library or per-lift depth |
| 9 | **Boostcamp** | Moderate | Form videos attached to program exercises | Demos exist but are secondary to its program marketplace |
| 10 | **Strong / Gymshark Training / Freeletics** (tail) | 200–700 | Basic animations / influencer video | Strong: ~200–300 with basic demos; Gymshark app discontinued on Android; Freeletics form guidance generic |

---

## 3. Per-app deep dives

### 3.1 Muscle & Motion — Strength Training (best technique education)
- 1,200+ exercises, each with **3D anatomical analysis**: muscle origin/insertion/action, what to avoid, injury risks, typical errors; rotate/zoom from any angle; weekly content additions ([muscleandmotion.com](https://www.muscleandmotion.com/strength-training-app/), [products page](https://www.muscleandmotion.com/products/strength-training-app-mobile/)).
- 4.9/5 store rating. Trainers use it to *show* clients anatomy: one trainer review — they "can show clients real-time anatomy and help them understand where their pains are", clients "see muscles and feel them faster" ([Google Play listing](https://play.google.com/store/apps/details?id=air.com.musclemotion.strength.mobile)).
- Vendor cites a 2020 systematic review that 3D visualisation significantly boosts anatomical comprehension ([blog](https://www.muscleandmotion.com/blog/3d-anatomy-apps/)).
- **Weakness:** it is an education product, not a logger — nobody runs their training in it. The lesson: deep technique content wins loyalty even without tracking.

### 3.2 MuscleWiki (best free library; genuine-breakthrough quotes)
- 2,000+ free exercise videos, interactive body-map navigation, no registration ([musclewiki.com](https://musclewiki.com/)).
- App Store reviewers supply the clearest "breakthrough" sentiment in this audit: *"If you're just getting into exercising, like me, this is the app for you"* — a user with "no experience in the gym" who now loves working out; another called it *"a game-changer for my beginner gym journey, especially with its clear exercise instructions"* ([App Store reviews](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640)).
- **Hate/wish:** recent updates brought crashes, login failures, and creeping paywalling of formerly free features — a warning about monetising a loved free library too aggressively.

### 3.3 Fitbod (best delivery polish)
- 1,600+ movements (up from ~1,000), every exercise with a **professionally recorded video demo and step-by-step written cues**; some multi-angle; pause and **half-speed playback** — repeatedly singled out by reviewers as "a nice touch" ([Fitness Drum](https://fitnessdrum.com/fitbod-review/), [Fittest Travel](https://www.fittesttravel.com/blog/2019/10/3/fitbod-app-review), [fitbod.me/exercises](https://fitbod.me/exercises)).
- Videos are "fast to load, easy to watch and make learning new exercises a breeze".
- **Hate/wish:** the recommendation engine, not the videos, draws complaints — Reddit users report odd exercise selection; the library itself is rarely criticised.

### 3.4 Alpha Progression (best video-inside-a-planner integration)
- 550+ exercises (sources cite up to ~690 videos), each with real-human video "often with multiple angles", filmed in-house with a gym professional — consistent look, no stock mishmash ([Fitness Drum](https://fitnessdrum.com/alpha-progression-app-review/), [alphaprogression.com](https://alphaprogression.com/en), [HotelGyms review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)).
- Testimonial: *"Explained really well incl. exercise videos… A dream come true, especially for beginners."*
- Closest structural analogue to Volyume (hypertrophy planner + progression engine + library), and the proof that a small German team can build a respected in-house video library incrementally.

### 3.5 Jefit (biggest library, diluted experience)
- 1,400–1,500+ exercises with HD demos, muscle-activation diagrams, filters by muscle/movement/equipment/difficulty; 20M+ downloads ([jefit.com/exercises](https://www.jefit.com/exercises), [GymBird review](https://www.gymbird.com/fitness-apps/jefit-app-review)).
- **Hate/wish:** "more pop-up prompts added with each update… each iteration seems to lose something or make something less intuitive" ([JustUseApp reviews](https://justuseapp.com/en/app/449810000/jefit-workout-planner-gym-log/reviews)); comparison reviewers call the interface "dated" and the app "cluttered — it tries to do too many things" ([just12reps comparison](https://just12reps.com/best-weightlifting-apps-of-2025-compare-strong-fitbod-hevy-jefit-just12reps/)). Library size alone does not win.

### 3.6 RP Hypertrophy (highest-authority cueing, weakest shell)
- 250+ technique videos fronted by Dr Mike Israetel; the videos are the app's strongest content asset and a key reason people pay ([dr-muscle review](https://dr-muscle.com/rp-hypertrophy-app-review/), [rpstrength.com](https://rpstrength.com/pages/hypertrophy-app)).
- **Hate/wish:** $34.99/month, no free tier; "dated, basic, cluttered" UI; "the exercise pool is stagnant"; custom exercises lack the video/feel of built-ins; no supersets/drop sets ([dr-muscle 13-point critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)). Users tolerate a poor app for trusted technique authority — authority is a moat.

### 3.7 Hevy (clean tracker, adequate demos)
- 350–400+ exercises with illustrations/animations, muscle-group breakdowns and step-by-step setup/execution text ([hevyapp.com exercise library](https://www.hevyapp.com/features/exercise-library/)).
- 4.9 on Google Play (467k+ ratings); review: *"Seriously the best gym fitness tracker I've ever used. Simple. Free. Tons of graphs. Amazing quality videos."* — Sam Ilelaboye ([Google Play](https://play.google.com/store/apps/details?id=com.hevy)).
- Guidance depth is shallow by design; reviewers note pure trackers like Hevy/Strong are worse for beginners than apps with detailed demonstrations ([findyouredge 2026 roundup](https://www.findyouredge.app/news/best-strength-training-apps-2026)).

### 3.8 Nike Training Club (guided-class model)
- 100+ workouts; demo video plays in real time with audible trainer cues; "Whiteboard" classes show short clips of each motion ([Tom's Guide](https://www.tomsguide.com/reviews/nike-training-club-app), [Reviewed.com](https://www.reviewed.com/health/content/nike-training-club-review-workout-app)).
- Loved as a free guided experience ("helpful when you forget how the movement goes"); irrelevant as a browsable strength library — no per-lift depth, no progression context.

### 3.9 Boostcamp
- Hosts Reddit-famous programs (nSuns, GZCLP, 5/3/1) with rest timer, plate calculator, RPE, and "exercise demonstrations with form videos" ([boostcamp.app](https://www.boostcamp.app/)). Demos are functional, not a differentiator; praise centres on programs and auto-progression.

### 3.10 The tail: Strong, Gymshark Training, Freeletics
- **Strong:** ~200–300 exercises with "basic animated demonstrations" and instructional notes; the consensus tracker for people who already know form ([repreturn](https://repreturn.com/strong-app-review/), [setgraph](https://setgraph.app/ai-blog/best-gym-app-reddit)). Demonstrations are explicitly *not* its pitch.
- **Gymshark Training:** ~700 exercises but "missing some pretty basic exercises"; app no longer updated and pulled from Android ([Gymshark support](https://support.gymshark.com/en-US/article/the-gymshark-training-app), [dr-muscle](https://dr-muscle.com/gymshark-workout-app-review/)) — a competitor effectively exiting the space.
- **Freeletics:** sleek but confusing navigation; same programs regardless of stats; form guidance generic; Trustpilot complaints about auto-renewal ([dr-muscle critique](https://dr-muscle.com/freelectics-app-review-alternative/)).

### 3.11 AI form-check segment (Asensei, Tempo, OnForm, FormCheck AI, Gymscore, CueForm)
- **Tempo (hardware + AI):** form feedback "inconsistent and often misses nuance" — catches gross errors (excessive lean) but not subtleties; lighting/angle break it; weight guidance off by 10+ lb, with reported injuries from bad recommendations ([Steady Athlete](https://steadyathlete.com/tempo-move-review/), [Balanced Brawn](https://balancedbrawn.com/2025/08/21/tempo-fit-review/), [adampreiser.com](https://adampreiser.com/tempo-studio-review/)).
- **FormCheck AI:** "vastly different answers when resubmitting clips, and rating professional lifters' form poorly" ([App Store](https://apps.apple.com/us/app/formcheck-ai/id6741048432) via reviews).
- **Asensei:** retreated to a niche (rowing on Concept2/WaterRower) where a single fixed movement makes recognition tractable; well reviewed *within that niche* ([asensei.com](https://asensei.com/pages/asensei-rowing), [Concept2 forum](https://c2forum.com/viewtopic.php?t=186156)).
- **OnForm:** survives by pairing video analysis with a *human coach* messaging layer, not autonomous AI ([cueform roundup](https://cueform.ai/posts/5-best-apps-for-analyzing-weightlifting-form)).
- **Segment verdict:** sentiment is sceptical-to-burned for free-weight AI form checking. Pose estimation is "promising but accuracy varies widely" ([Gymscore blog](https://www.gymscore.ai/blog/best-ai-workout-form-check-app-2026/)). For Volyume this is doubly moot: the coaching engine's no-AI boundary is a sacred rule, and the market evidence says deterministic, well-produced demonstrations beat unreliable AI feedback. **Recommendation: do not enter this segment; cite its failures as a positioning point ("deterministic coaching, no AI guesswork").**

---

## 4. Cross-cutting findings

### When users want guidance vs when it gets in the way
- **Wanted:** first encounter with an unfamiliar exercise; returning after a break ("when you forget how the movement goes" — NTC reviewers); beginners with gym intimidation, the largest and churn-heaviest audience segment ([CleverX fitness-app research](https://cleverx.com/blog/fitness-app-user-research-a-complete-guide-for-health-and-fitness-product-teams/)).
- **In the way:** anything that interrupts logging. Jefit's pop-ups are the canonical complaint; experienced lifters choose Strong/Hevy precisely because nothing intrudes. The winning pattern everywhere is **one tap away, never auto-playing, instantly loading** (Fitbod's "fast to load" praise; Hevy's unobtrusive thumbnails). Volyume's tappable "Watch the demo" banner is the correct pattern — the content behind it is what's missing.

### Single best implementation
**Fitbod's per-exercise video delivery**: professionally filmed, multi-angle on key lifts, pause + half-speed playback, instant load, paired with step-by-step written cues — embedded in the workout flow without interrupting it. (Muscle & Motion has deeper *education*; Fitbod has the best *in-workout demonstration UX*.)

### Most common failure mode
**Library bloat with shallow, inconsistent guidance, plus UX intrusion.** Big counts (Jefit 1,400+, ExerciseDB 11,000+) sourced from mixed/stock content produce inconsistent visuals, missing or generic cues, and dated-feeling apps; monetisation pop-ups then poison the well (Jefit, MuscleWiki's recent slide). Second failure mode: **over-promising AI form correction** (Tempo, FormCheck AI) — inconsistency destroys trust faster than absence of the feature.

---

## 5. Volyume vs each competitor: lead / match / lag

| Competitor | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| Muscle & Motion | Tracking, planning, coaching integration (M&M has none) | Common-mistakes content (flagship lifts only) | 3D anatomical depth, muscle-activation visuals, breadth of analysed exercises |
| MuscleWiki | Metadata richness (SFR, fatigue cost — nobody else has this), coaching integration | Structured text cues | 2,000+ free videos; brand awareness as *the* form resource |
| Fitbod | SFR-ranked substitutes (Fitbod swaps are equipment-based, not stimulus-based); deterministic transparent logic | Library breadth (~448 vs 1,600 — Fitbod's tail is padded) | Video on every exercise; playback polish (multi-angle, half-speed) |
| Alpha Progression | SFR/fatigue metadata; nutrition+training in one app | Hypertrophy-focused curation, exercise count ballpark | Consistent in-house video on every exercise |
| Jefit | UX cleanliness, no ads, metadata quality | Filtering/browsing | Raw library size, HD demos at scale, community content |
| RP Hypertrophy | App quality, price, supersets, custom exercises, free tier | Evidence-based cueing structure | Named technique authority; 250+ presenter-led technique videos |
| Hevy | Cue depth (setup/execution/mistakes), SFR substitutes | Custom exercises, PRs/history charts | Demo coverage across the library; social proof at scale |
| Nike TC | Per-lift depth, progression, logging | — | Real-time guided-workout video production values |
| Boostcamp | Metadata, coaching engine | Demo coverage (both partial) | Famous-program marketplace pull |
| Strong / Gymshark / Freeletics | Metadata, cues, coaching, active development (vs Gymshark's exit) | Logging speed (aspirationally) | Strong's brand trust among minimalists |

**Net position:** Volyume's metadata layer (SFR, fatigue cost, subregion, SFR-ranked substitutes) **leads the entire field** — no audited competitor exposes stimulus-to-fatigue reasoning. Volyume's structured cues match or beat mid-tier apps on flagship lifts. The one dimension where Volyume lags *every single top-10 app* is **visual demonstration coverage**: 2 videos + a handful of frame loops vs 350–2,000 elsewhere. This is the gap.

---

## 6. Improvement opportunities (sized for a small team)

1. **Close the licence decision: buy the MoveKit full library (~$99 one-time, 200+ animations, commercial licence, muscle-highlight variants, future pack additions included).** This is the highest-leverage, lowest-cost move in this audit: for roughly the price of one hour of videographer time, ~45% of the library gets consistent 3D demos in the style already integrated. One-time ownership avoids per-user fees, fits offline-first (bundle/download assets locally), and the muscle-highlight variants pair perfectly with Volyume's muscle/subregion metadata. *Impact: removes the single lagging dimension against the bottom half of the top 10 immediately.* ([MoveKit pricing](https://movekit.com/pricing))

2. **Coverage-by-usage, not coverage-by-count.** Map MoveKit's 200+ animations to Volyume's most-logged exercises first; instrument which exercise detail screens are opened without a demo available. Jefit proves 1,400 mediocre entries lose to a smaller curated set; target ~95% of actually-performed sets having a demo, not 100% of 448 rows.

3. **Phased in-house filming for the ~20 flagship lifts only.** Alpha Progression built its reputation on consistent in-house video from a small team. One day of filming (one presenter, fixed studio look, two angles per lift, front + side) covers squat/bench/deadlift/OHP/row variants where animation least conveys nuance. British presenter reinforces UK positioning. *Impact: matches RP's authority play at a fraction of cost; flagship lifts are where beginners' form anxiety concentrates.*

4. **Half-speed and scrub controls on demo playback.** The single most-praised micro-feature in the audit (Fitbod). Trivial with `expo-video` playback-rate control; works for both MoveKit clips and filmed video. *Impact: converts "I watched it" into "I learned it" for complex lifts.*

5. **Surface the cues *inside* the set-logging row for first-time exercises only.** Show a one-line setup cue + demo thumbnail the first 1–3 times a user logs an exercise, then collapse to the existing banner. Beginners get guidance at the moment of anxiety; experienced users never see clutter — directly addressing the "wanted vs in-the-way" split that sinks Jefit.

6. **Make SFR visible and explained — it is Volyume's unique asset.** No competitor exposes stimulus-to-fatigue reasoning to users. A one-tap "Why this substitute?" explainer (deterministic text, no AI) turns invisible metadata into a marketable differentiator: "the app that tells you *why* this exercise is worth your fatigue."

7. **Muscle-highlight imagery from MoveKit variants as the default exercise thumbnail.** Replicates Muscle & Motion's most-loved feature (seeing the working muscle) at licence cost, with zero anatomy production. Pairs with existing muscle/subregion fields.

8. **Common-mistakes coverage expansion as a content sprint, not filming.** Volyume already has the structured schema; extending setup/execution/mistakes text from flagship lifts to the top ~100 exercises is pure writing work (evidence-based, deterministic, offline). Muscle & Motion shows "what to avoid" content is the stickiest education format.

9. **Do not build AI form-check; position against it.** Tempo/FormCheck AI sentiment shows inconsistent AI feedback destroys trust and creates injury liability. Volyume's no-AI rule is a marketing asset for the safety-conscious UK market: deterministic cues, licensed demonstrations, no camera, no PII — consistent with the EU-residency/no-PII architecture.

10. **Guard the free/Pro line carefully on demos.** MuscleWiki's backlash when free content slid behind a paywall is the cautionary tale. Exercise library is a Free feature in Volyume's gating; demos should ship free (they drive activation and reviews), while Pro keeps coaching-engine value. Never move existing demos behind Pro later.

---

## 7. Sources

- Jefit: [jefit.com/exercises](https://www.jefit.com/exercises) · [GymBird review](https://www.gymbird.com/fitness-apps/jefit-app-review) · [JustUseApp reviews](https://justuseapp.com/en/app/449810000/jefit-workout-planner-gym-log/reviews) · [dr-muscle critique](https://dr-muscle.com/jefit-review-alternative/)
- Fitbod: [Fitness Drum](https://fitnessdrum.com/fitbod-review/) · [Fittest Travel](https://www.fittesttravel.com/blog/2019/10/3/fitbod-app-review) · [TechRadar](https://www.techradar.com/health-fitness/fitbod-app-review) · [fitbod.me/exercises](https://fitbod.me/exercises)
- Hevy: [hevyapp.com exercise library](https://www.hevyapp.com/features/exercise-library/) · [Google Play](https://play.google.com/store/apps/details?id=com.hevy) · [hotelgyms review](https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm)
- Strong: [repreturn review](https://repreturn.com/strong-app-review/) · [setgraph Reddit roundup](https://setgraph.app/ai-blog/best-gym-app-reddit) · [strong.app](https://www.strong.app/)
- RP Hypertrophy: [dr-muscle review](https://dr-muscle.com/rp-hypertrophy-app-review/) · [13-point critique](https://dr-muscle.com/rp-hypertrophy-app-critique/) · [rpstrength.com](https://rpstrength.com/pages/hypertrophy-app)
- Alpha Progression: [Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/) · [alphaprogression.com](https://alphaprogression.com/en) · [HotelGyms](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)
- Gymshark Training: [Gymshark support (discontinuation)](https://support.gymshark.com/en-US/article/the-gymshark-training-app) · [Tom's Guide](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free) · [dr-muscle](https://dr-muscle.com/gymshark-workout-app-review/)
- Nike Training Club: [Reviewed.com](https://www.reviewed.com/health/content/nike-training-club-review-workout-app) · [Tom's Guide](https://www.tomsguide.com/reviews/nike-training-club-app)
- Freeletics: [dr-muscle critique](https://dr-muscle.com/freelectics-app-review-alternative/)
- Muscle & Motion: [strength app](https://www.muscleandmotion.com/strength-training-app/) · [Google Play](https://play.google.com/store/apps/details?id=air.com.musclemotion.strength.mobile) · [3D anatomy blog](https://www.muscleandmotion.com/blog/3d-anatomy-apps/)
- MuscleWiki: [musclewiki.com](https://musclewiki.com/) · [App Store reviews](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640) · [Trustpilot](https://www.trustpilot.com/review/musclewiki.com)
- Boostcamp: [boostcamp.app](https://www.boostcamp.app/)
- AI form check: [Steady Athlete Tempo review](https://steadyathlete.com/tempo-move-review/) · [Balanced Brawn Tempo review](https://balancedbrawn.com/2025/08/21/tempo-fit-review/) · [adampreiser Tempo review](https://adampreiser.com/tempo-studio-review/) · [FormCheck AI App Store](https://apps.apple.com/us/app/formcheck-ai/id6741048432) · [cueform roundup](https://cueform.ai/posts/5-best-apps-for-analyzing-weightlifting-form) · [Gymscore blog](https://www.gymscore.ai/blog/best-ai-workout-form-check-app-2026/) · [asensei rowing](https://asensei.com/pages/asensei-rowing) · [Concept2 forum](https://c2forum.com/viewtopic.php?t=186156)
- Licensing: [MoveKit pricing](https://movekit.com/pricing) · [MoveKit library](https://movekit.com/exercise-animation-library) · [ExerciseDB GitHub](https://github.com/exercisedb/exercisedb-api) · [ExerciseDB.io FAQ](https://exercisedb.io/faq) · [ExRx licensing](https://exrx.net/Store/Other/Licensing) · [Your Move white-label library](https://ymove.app/exercise-video-library)
- Market context: [findyouredge 2026 strength-app roundup](https://www.findyouredge.app/news/best-strength-training-apps-2026) · [just12reps comparison](https://just12reps.com/best-weightlifting-apps-of-2025-compare-strong-fitbod-hevy-jefit-just12reps/) · [CleverX fitness user research](https://cleverx.com/blog/fitness-app-user-research-a-complete-guide-for-health-and-fitness-product-teams/)
