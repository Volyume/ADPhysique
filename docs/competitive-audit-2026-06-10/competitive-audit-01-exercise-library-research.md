# Competitive Audit 01 — Exercise Library & Demonstrations (Agent 8)

Date: 2026-06-10. Scope: exercise libraries and technique guidance across
the top competitor apps; delivery formats and production/licensing costs;
user sentiment on when guidance helps vs intrudes; implications for
Volyume.

Volyume baseline (authoritative: `competitive-audit-00-volyume-baseline.md`
§3.1/§3.5/§5): ~449 canonical exercises with deterministic IDs, custom
exercise creation, rich derived metadata (equipment category, machine
type, force, laterality, difficulty, home/machine-ok, equipment profiles)
powering filters and a ranked swap engine, per-exercise charts/PRs/goals.
Technique guidance is **text only**: ~169 hand-written form tips (≈38 %
of the library) plus a generic fallback paragraph. **No videos, no
animations, no images anywhere in the app.**

Sourcing note: several vendor pages (exercisedb.io, exrx.net, movekit.com,
justuseapp.com, Apple App Store) returned HTTP 403 to direct fetch;
figures for those are taken from indexed search summaries of those pages
and corroborating secondary sources, and are flagged where pricing could
not be confirmed to the pound.

---

## 1. Ranked top 10 (by evidence of library quality + demonstration quality)

| # | App | Library size | Demonstration format | Why ranked here |
|---|-----|--------------|----------------------|-----------------|
| 1 | **Fitbod** | 1,600+ | Pro-filmed HD video on *every* exercise + written cues | Largest fully-video-covered library; 80+ equipment pieces; videos "fast to load and easy to watch" |
| 2 | **MuscleWiki** | 1,600+ | Short looping clips, male/female variants, interactive body map | The format users praise most; free and ad-free; now licensable via API |
| 3 | **Jefit** | 1,400–1,500 | HD video (re-shot 2023, second camera angle) + animations | Biggest tracker library; "biggest asset is its enormous exercise database"; UI clutter/ads criticised |
| 4 | **Muscle & Motion (Strength)** | 1,200+ | 3D anatomy animations w/ muscle activation + 200+ education videos incl. common mistakes | Best-in-class *understanding* of technique; education tool, weak logger |
| 5 | **Gymshark Training** | 700+ | Real video guide on every exercise, free | Strongest beginner sentiment for short "what to use and how" videos |
| 6 | **Gymaholic** | 850+ | 3D model + AR placement, rotate/zoom, muscle highlighting, AI form checker | 94 % 4–5★; users credit AR model for form on complex lifts |
| 7 | **Alpha Progression** | 621–690 | Real-human videos, often multiple angles | Every exercise has video + history in one card; tracker-grade logging |
| 8 | **Ladder** | n/a (workout-led) | Coach video demos + in-ear audio cues per movement | Technique guidance embedded in delivery; users: "so I know I'm doing each move correctly" |
| 9 | **Peloton Strength+ / Gym** | n/a (class/program-led) | Full-screen vertical video demos per movement + optional in-ear coaching; Gym = tap-for-tutorial | Polished demos, but Gym mode has "zero audio cues" — guidance gaps criticised |
| 10 | **Hevy** | 400+ (unlimited custom; 7 free) | Animation on most + ~200 real videos (big 3 lifts etc.); custom exercises accept user photo/video/GIF | Smaller library but cleanest UX; best custom-media support |

Honourable mentions: **Strong** (~200–300 exercises, instructions +
growing animation set — the smallest library in the cohort; reviewers note
"Strong's library is smaller and doesn't include animated demos" on much
of it, and its "biggest problem… is the lack of guidance"); **Dr. Muscle**
(500+ exercises, "realistic animation… at the proper speed" with muscle
highlighting, but library depth and demo coverage trail the top 10).

Sources: [Jefit exercise DB](https://www.jefit.com/exercises) /
[Jefit HD video update](https://www.jefit.com/wp/jefit-news-product-updates/major-feature-update-new-2023-hd-video-exercise-demonstrations/) /
[GymBird Jefit review](https://www.gymbird.com/fitness-apps/jefit-app-review);
[Hevy exercise library help](https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises) /
[Hevy custom exercises](https://www.hevyapp.com/features/custom-exercises/);
[Fitbod exercises](https://fitbod.me/exercises) /
[About Fitbod exercises](https://fitbod.me/about-fitbod-exercises/) /
[Fitness Drum Fitbod review](https://fitnessdrum.com/fitbod-review/);
[Muscle & Motion strength app](https://www.muscleandmotion.com/strength-training-app/) /
[M&M App Store](https://apps.apple.com/us/app/strength-training-by-m-m/id1302056349);
[MuscleWiki](https://musclewiki.com/) /
[MuscleWiki App Store](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640);
[Gymshark Training App Store](https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320) /
[Tom's Guide Gymshark review](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free);
[Gymaholic review (regpaq)](https://regpaq.com/gymaholic-app-review-the-best-gym-app-for-workout-tracking) /
[Gymaholic AI form checker](https://www.gymaholic.co/check-exercise-form);
[Fitness Drum Alpha Progression review](https://fitnessdrum.com/alpha-progression-app-review/) /
[hotelgyms.com Alpha Progression review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany);
[Ladder](https://www.joinladder.com/) /
[Outdoorsy Nomad Ladder review](https://www.outdoorsynomad.com/ladder-fitness-app-review/) /
[The Everygirl Ladder review](https://theeverygirl.com/ladder-app-review/);
[Peloton Strength+](https://www.onepeloton.com/strength-plus-app) /
[PeloBuddy Peloton Gym review](https://www.pelobuddy.com/peloton-gym-demo-review/) /
[Parade Peloton Gym review](https://parade.com/health/peloton-gym-review);
[Strong App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577) /
[Dr. Muscle Strong review](https://dr-muscle.com/strong-workout-app-review/);
[Dr. Muscle](https://dr-muscle.com/) /
[BionicOldGuy Dr. Muscle write-up](https://bionicoldguy.home.blog/2021/07/05/interesting-app-for-training-dr-muscle/).

---

## 2. Per-app findings

### 2.1 Fitbod (rank 1)
- 1,600+ exercises (up from ~1,000 a few years ago), each with a
  professionally filmed HD demonstration and written coaching cues;
  demos by professional trainers across 80+ equipment pieces
  ([About Fitbod exercises](https://fitbod.me/about-fitbod-exercises/),
  [Fitbod FAQs](https://fitbod.me/faqs/)).
- Reviewers: "short video demonstrations of each exercise… nice to have
  as a reminder but doesn't interfere with experienced users who don't
  need it" — the demo is inline on the logging card, muted, looping;
  the canonical example of guidance that helps without intruding
  ([Fitness Drum review](https://fitnessdrum.com/fitbod-review/),
  [Men's Journal best workout apps](https://www.mensjournal.com/fitness/best-workout-apps)).
- Public SEO exercise pages (fitbod.me/exercises) double as acquisition.

### 2.2 MuscleWiki (rank 2)
- 1,600+ exercises, each a **short looping video clip** (male and female
  demonstrators), reached via an interactive body-map ("tap the muscle"),
  with filters for equipment, difficulty, compound/isolation, gender
  ([musclewiki.com](https://musclewiki.com/),
  [App Store listing](https://apps.apple.com/us/app/musclewiki-workout-fitness/id1096827640)).
- Sentiment is unusually warm for a free app: users call the tap-a-muscle
  body map "ingenious", say "the videos depict the form of the exercise
  very well, making them simple to learn", and praise that it is free and
  ad-free ([JustUseApp reviews](https://justuseapp.com/en/app/1096827640/musclewiki-app/reviews)).
- 2025/26: launched a commercial **API** with video streaming — see §4.

### 2.3 Jefit (rank 3)
- 1,400–1,500 exercises with HD videos and animations; videos re-recorded
  in 2023 in HD with a **secondary camera angle** "for better form checks"
  ([Jefit HD video update](https://www.jefit.com/wp/jefit-news-product-updates/major-feature-update-new-2023-hd-video-exercise-demonstrations/),
  [Play Store](https://play.google.com/store/apps/details?id=je.fit)).
- Reddit-sourced criticism: "the interface can feel cluttered compared to
  apps like Strong… the free version relies on ads"; depth praised, UX
  criticised ([Setgraph Reddit roundup](https://setgraph.app/ai-blog/best-strength-training-app-reddit),
  [Dr. Muscle Jefit review](https://dr-muscle.com/jefit-review-alternative/)).
- Comparison verdict: "JEFIT's biggest asset is its enormous exercise
  database… having this reference library in your pocket is genuinely
  useful" ([findyouredge comparison](https://www.findyouredge.app/news/best-strength-training-apps-2026)).

### 2.4 Muscle & Motion Strength (rank 4)
- 1,200+ exercises as **3D anatomical animations** showing primary/
  secondary muscle activation, plus 200+ education videos including a
  signature **"common mistakes"** series per exercise; built by
  physiotherapists + animators ([muscleandmotion.com](https://www.muscleandmotion.com/strength-training-app/)).
- Users: "detailed moving visuals… far superior to anatomical pictures;
  an excellent blend of video and 3D animation"
  ([App Store](https://apps.apple.com/us/app/strength-training-by-m-m/id1302056349)).
- It is a reference/education product (subscription roughly $15–$89
  across tiers, [G2 pricing](https://www.g2.com/products/muscle-motion/pricing)),
  not a tracker — evidence that anatomy visualisation alone sustains a
  paid product.

### 2.5 Gymshark Training (rank 5, free)
- 700+ exercises; "every exercise includes a detailed video guide —
  perfect for all ability levels"; exercise preview image + video
  ([App Store](https://apps.apple.com/us/app/gymshark-training-and-fitness/id1139151320),
  [Gymshark support](https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app)).
- Beginner sentiment is the strongest signal: "the short videos showing
  exactly what to use and how to do the moves is extremely helpful for
  people just starting to go to the gym"
  ([JustUseApp reviews](https://justuseapp.com/en/app/1139151320/gymshark-training-fitness-app/reviews),
  [Tom's Guide review](https://www.tomsguide.com/wellness/fitness/gymshark-training-app-review-effective-workouts-for-free)).
- Tracking depth is weak (no drop sets/supersets per reviews) — video
  library is the moat, logging is not.

### 2.6 Gymaholic (rank 6)
- 850+ exercises with rotatable **3D model + AR**: "for complex exercises
  like barbell rows or deadlifts, seeing the model in the gym… with the
  ability to zoom and twist actually helps users learn and improve their
  form"; post-workout muscle-recovery avatar; 94 % of App Store ratings
  4–5★ ([regpaq review](https://regpaq.com/gymaholic-app-review-the-best-gym-app-for-workout-tracking),
  [gymaholic.co](https://www.gymaholic.co/app)).
- Also ships a camera-based **AI Exercise Form Checker** (posture, tempo,
  symmetry, ROM scoring) — the only mainstream tracker doing this
  ([gymaholic.co/check-exercise-form](https://www.gymaholic.co/check-exercise-form)).

### 2.7 Alpha Progression (rank 7)
- 621–690 exercises; "each exercise includes a demonstration video (often
  with multiple angles), detailed description and your past performance
  history"; demos are real humans, not graphics
  ([Fitness Drum review](https://fitnessdrum.com/alpha-progression-app-review/),
  [hotelgyms.com review](https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany)).
- Closest structural analogue to Volyume (deterministic progression
  engine, plan generator, German indie) — and it still funded a complete
  in-house video library. This is Volyume's most direct competitor proof
  that video is affordable at indie scale.

### 2.8 Ladder (rank 8)
- Workout-delivery app: coaches demonstrate every movement on video with
  in-ear audio cues and pacing; "the coaches demonstrate all the exercises
  via video tutorial… so I know I'm doing each exercise move correctly"
  ([The Everygirl review](https://theeverygirl.com/ladder-app-review/),
  [joinladder.com](https://www.joinladder.com/)).
- High production cost model (per-workout filming, 22+ coach teams) —
  not replicable by an indie, included as the ceiling of "guidance as the
  product".

### 2.9 Peloton Strength+ / Peloton Gym (rank 9)
- Strength+: "movement breakdowns at the start of each block and coach-led
  demos during every exercise… full-screen vertical video demos and
  optional in-ear coaching"; per-movement detail pages pair the demo with
  performance history ([onepeloton.com](https://www.onepeloton.com/strength-plus-app),
  [PeloBuddy](https://www.pelobuddy.com/strength-plus-available-cost/)).
- Peloton Gym (self-guided): tap-for-tutorial-video per exercise, but
  "there is no sound with these classes… zero audio cues for anything",
  and "there aren't instructor cues" — demonstrating that polished video
  without integrated cueing still draws criticism
  ([Parade review](https://parade.com/health/peloton-gym-review),
  [The Clip Out review](https://theclipout.com/triple-threat-test-a-review-of-the-new-peloton-gym-app-feature-in-three-different-fitness-environments/)).

### 2.10 Hevy (rank 10)
- 400+ exercises: written form instructions on all, "most come with a
  demo animation", plus 200+ real videos for major lifts
  ([Hevy help centre](https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises),
  [hevyapp.com/exercises](https://www.hevyapp.com/exercises/)).
- Custom exercises can carry the **user's own photo/video/GIF**, and any
  library exercise can be duplicated and re-skinned; unlimited custom on
  paid, 7 on free ([custom exercises](https://www.hevyapp.com/features/custom-exercises/)).
  Volyume's custom-exercise creation has no media slot at all.
- Hevy Coach sells a "video exercise library" as a headline B2B feature
  ([hevycoach.com](https://hevycoach.com/features/video-exercise-library/)).

---

## 3. Delivery-format analysis with production-cost notes

| Format | Who uses it | Pros | Cons | Indicative cost |
|--------|-------------|------|------|-----------------|
| **Pro-filmed real video (per-exercise, looped)** | Fitbod, Jefit, Gymshark, Alpha Progression | Most trusted by users; shows real equipment/setup | Costly to refresh; consistency across shoots | Fitness videographer half-day $1,000–$3,000 covers 30–50 exercises ⇒ **$20–$100/exercise**; ~449 exercises ≈ **$9k–$45k** ([CloudFit filming guide](https://cloudfit.tv/blog/create-exercise-videos-that-look-like-they-were-filmed-by-a-pro/)). DIY smartphone+tripod is judged adequate by the same guide. UK specialists exist ([Sweatlife Films exercise library service](https://sweatlife.co.uk/exercise-video-library/)) |
| **Short looping clip / GIF** | MuscleWiki, Hevy animations | Matches what users ask for mid-set: instant, silent, loops; small payload; offline-friendly | Less depth than coached video | Licensable wholesale — see §4 |
| **3D animation with muscle highlighting** | Muscle & Motion, Gymaholic, Dr. Muscle, Jefit (partial) | Consistent style; anatomy teaching; no re-shoots | "Graphic" feel; custom builds expensive | Off-the-shelf: MoveKit 200+ clips at **$4.99/clip or $99 full library** incl. muscle-highlight variants; Gym-Animations bundles **$199–$599 for 7,000+ clips**; ExerciseAnimatic ~**$0.25/clip** (1,850+). Custom mocap: suit ~$2.5–3k, studio day **$5k–$25k** ([MoveKit comparison](https://movekit.com/blog/best-exercise-animation-libraries-2026), [gym-animations.com](https://gym-animations.com/), [MoCap Online cost guide](https://mocaponline.com/blogs/mocap-news/motion-capture-cost-guide)) |
| **AR placement** | Gymaholic | Novel; praised for complex barbell lifts | iOS-centric; gimmick risk | Built on the same 3D assets + ARKit; incremental once 3D exists |
| **Coach-led class video + audio cues** | Ladder, Peloton | Strongest guidance; best for novices | Content treadmill; studio costs; wrong model for a logger | Per-workout filming at studio rates — out of scope for indie |
| **AI camera form check** | Gymaholic, FormChecker, Asensei (B2B), Tempo (hardware) | Real feedback loop | Privacy, accuracy disputes, hardware lock-in | Pose-estimation stacks (BlazePose) are free but the product/UX cost is high ([AI CERTs overview](https://www.aicerts.ai/news/how-fitness-tech-delivers-ai-powered-form-correction-workouts/), [asensei.ai](https://www.asensei.ai/)). **Blocked for Volyume by the no-AI coaching-engine boundary and no-PII rule — camera video of users is PII. Not recommended; do not pursue without explicit owner decision.** |

---

## 4. Licensing / buy-in options for an indie app

Ordered by fit with Volyume's **offline-first** architecture (media must
be bundleable or locally cached — components never depend on a live
external service).

1. **free-exercise-db (yuhonas)** — 800+ exercises, photo pairs +
   instructions, **public domain**, JSON; zero cost, fully bundleable
   ([GitHub](https://github.com/yuhonas/free-exercise-db)). Quality is
   static-photo only; good as a stopgap, not a differentiator.
2. **ExerciseDB.io dataset** — ~1,500 exercises (11,000+ via the open
   API repo) with animated GIFs at 180p/360p/720p/1080p tiers, sold as a
   **one-time perpetual commercial licence, downloadable files you host
   or bundle yourself** — exactly matches offline-first. Three plans
   (Starter/Standard/Premium by resolution); exact prices not indexed
   (site blocks robots) but the model is one-time, no recurring fees;
   adjacent Gumroad/“Pro” listings of 1,200–1,500-exercise GIF datasets
   sit in the **tens-to-low-hundreds of dollars** bracket
   ([ExerciseDB FAQ](https://exercisedb.io/faq),
   [exercisedb.io/pricing](https://exercisedb.io/pricing),
   [GitHub API repo](https://github.com/exercisedb/exercisedb-api),
   [ExerciseDB Pro](https://exercisedbpro.com/),
   [Gumroad listing](https://exercisedb.gumroad.com/l/exercisedb)).
   Restriction: cannot redistribute the raw dataset as a competing
   library — bundling inside the app is allowed.
3. **3D animation bundles** — MoveKit **$99** full library (200+ clips,
   muscle-highlight variants, commercial licence) or Gym-Animations
   **$199–$599** for 7,000+ clips; ExerciseAnimatic ~$0.25/clip
   ([MoveKit](https://movekit.com/blog/best-exercise-animation-libraries-2026),
   [gym-animations.com](https://gym-animations.com/)). Consistent style,
   offline-bundleable, no humans to re-shoot.
4. **White-label real video** — YMove: 698+ white-label HD exercise
   videos, royalty-free, commercial use, 25 free samples
   ([ymove.app](https://ymove.app/exercise-video-library)); GymVisual
   video from ~$10/clip ($6 at 5+). ExRx.net also licenses its long-
   standing exercise content ([ExRx licensing](https://exrx.net/Store/Other/Licensing),
   page not directly fetchable).
5. **MuscleWiki API** — best-loved content, paid tiers (TESTING/PRO/
   ULTRA/MEGA) with full commercial rights and "Powered by MuscleWiki"
   attribution, **but videos must be streamed; offline storage/CDN
   re-hosting is explicitly forbidden**
   ([api.musclewiki.com](https://api.musclewiki.com/),
   [API terms](https://musclewiki.com/api-terms)). **Conflicts with
   Volyume's offline-first sacred rule** unless used only as an optional
   online enhancement with text fallback.
6. **Film in-house** — $20–$100/exercise professionally, or smartphone
   DIY; phased top-100-exercises shoot ≈ **$2k–$10k**. Only route that
   yields brand-owned, division-relevant assets (e.g. bikini-division
   glute variations) ([CloudFit guide](https://cloudfit.tv/blog/create-exercise-videos-that-look-like-they-were-filmed-by-a-pro/),
   [Sweatlife Films, UK](https://sweatlife.co.uk/)).

---

## 5. User sentiment: when guidance helps, when it intrudes

**Wanted (novices, first exposure to an exercise, returning after a
break/injury):**
- "Beginners, people returning from injury, or anyone unsure about form
  usually benefit from detailed demonstrations, step-by-step videos and
  clear modifications" — and testers explicitly rated alternative angles
  and modifications highly "because they help with form and confidence,
  especially for beginners" ([Daily Burn never-exercised guide](https://dailyburn.com/life/health/best-workout-apps-for-people-who-have-never-exercised-before-2026-guide/),
  [Men's Fitness home-workout apps test](https://mensfitness.co.uk/review/best-home-workout-apps/)).
- Gymshark: "short videos showing exactly what to use and how to do the
  moves is extremely helpful for people just starting to go to the gym"
  ([JustUseApp](https://justuseapp.com/en/app/1139151320/gymshark-training-fitness-app/reviews)).
- Ladder: "coaches demonstrate all the exercises via video tutorial…
  always helpful, so I know I'm doing each exercise move correctly"
  ([The Everygirl](https://theeverygirl.com/ladder-app-review/)).
- "Video demos and cues matter for beginners" is the recurring decision
  criterion in Reddit app-choice roundups
  ([Setgraph Reddit roundup](https://setgraph.app/ai-blog/best-workout-app-reddit)).

**Intrusive / ignorable (experienced lifters mid-session):**
- Fitbod's muted inline loop is praised precisely because it "doesn't
  interfere with experienced users who don't need it"
  ([Fitness Drum](https://fitnessdrum.com/fitbod-review/)) — the design
  pattern is *always visible, never blocking*.
- Jefit shows the failure mode of stuffing guidance into a logger:
  "there's a lot happening on screen… the experience isn't as streamlined
  for people who just want to log sets quickly"
  ([Setgraph](https://setgraph.app/ai-blog/best-strength-training-app-reddit)).
- Peloton Gym shows the opposite failure: demos exist but cues don't —
  "zero audio cues for anything" frustrated long-time users
  ([Parade](https://parade.com/health/peloton-gym-review)).

**Breakthrough evidence:**
- MuscleWiki's tap-a-muscle + 5-second-loop format draws the closest
  thing to breakthrough language: the body map is called "ingenious",
  "the tutorial videos save time when you want to change up which
  exercises you do", and "the videos depict the form of the exercise very
  well, making them simple to learn"
  ([JustUseApp MuscleWiki reviews](https://justuseapp.com/en/app/1096827640/musclewiki-app/reviews)).
- Gymaholic's rotatable AR model "actually helps users learn and improve
  their form" on barbell rows/deadlifts
  ([regpaq](https://regpaq.com/gymaholic-app-review-the-best-gym-app-for-workout-tracking)).
- Muscle & Motion users say moving 3D anatomy is "far superior to
  anatomical pictures" for understanding *why* form matters
  ([App Store](https://apps.apple.com/us/app/strength-training-by-m-m/id1302056349)).

**The gap between what exists and what is wanted:** the market has
polarised into long coached video (Ladder/Peloton) and instant loops
(MuscleWiki/Fitbod). Sentiment consistently favours the loop for
*trackers*: silent, 5–10 s, plays inline, no tap required, with deeper
text/mistakes one tap away. Nobody asks for 3-minute tutorials inside a
logging flow; they ask "show me what this looks like, right now".

---

## 6. Implications for Volyume

1. **Text-only is below the category floor.** Every one of the ten
   ranked competitors — including free apps (Gymshark, MuscleWiki) and
   the small-team direct analogue (Alpha Progression) — ships visual
   demonstrations on most or all exercises. Quantified: Volyume has
   **0 % visual coverage of 449 exercises and ~38 % text-tip coverage**;
   the top five competitors are at or near **100 % visual coverage of
   libraries 1.5–3.5× larger**. Volyume's metadata, filters and swap
   engine are genuinely competitive — the *content layer* is the only
   piece missing, and it is the first thing a novice notices.
2. **Cheapest credible route up (staged, offline-first compliant):**
   - **Stage 0 (≈ £0):** bundle public-domain photo pairs from
     free-exercise-db for matching exercises — removes "no images
     anywhere" at zero licence cost.
   - **Stage 1 (≈ £100–£500 one-time):** buy a one-time perpetual GIF
     dataset (ExerciseDB.io tier or a 3D bundle such as MoveKit $99 /
     Gym-Animations $199–$599), bundle 360p loops in-app or lazy-cache
     them, map to Volyume's deterministic IDs. This single step reaches
     MuscleWiki/Hevy-class inline loops. Mapping ~449 exercises to vendor
     IDs is the real cost (days of curation, not money).
   - **Stage 2 (≈ £2k–£10k):** film the top 100 logged exercises
     in-house (UK videographer, half-day batches of 30–50) for brand-owned
     video on the lifts users actually do; keep loops for the long tail.
   - **Avoid:** MuscleWiki API as primary source (streaming-only licence
     breaks offline-first); AI form check (breaks the no-AI boundary and
     the no-PII rule).
3. **Design pattern to copy:** Fitbod's muted auto-looping clip on the
   logging card — visible to novices, ignorable by veterans — plus
   Muscle & Motion-style "common mistakes" as a second tab on the
   existing text tips. Volyume's 169 hand-written tips become a
   differentiator *once* paired with a visual; on their own they read as
   an absence.
4. **Custom exercises:** Hevy lets users attach their own photo/video/GIF
   to custom exercises; Volyume's custom creation has no media slot.
   Low-effort parity win that requires no licensing at all.

---
*Agent 8 of 14 — exercise library & demonstrations. No code modified.*
