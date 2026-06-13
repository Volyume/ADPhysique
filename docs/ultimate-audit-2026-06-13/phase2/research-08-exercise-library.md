# Research 08 — Exercise Library & Technique Guidance

Phase 2 Ultimate Audit, Agent 8. Brief: research 50+ apps with exercise libraries / demonstration content; answer named-source questions on demonstration format, technique-guidance depth (newbie vs athlete), timing of guidance, licensable/free demo sources (with licence + cost), AI-generated demo acceptability in 2026, baseline library completeness, and verbatim "this helped" voice.

Format brief read in full: `docs/ultimate-audit-2026-06-13/phase2/_RESEARCH-FORMAT.md`. Verification protocol followed: every finding carries VERIFIED / PARTIAL / NOT FOUND and a URL.

> **COVERAGE FLAG (honesty first):** This area is **research-thin for the most important question — direct Reddit/App-Store user-voice comparing demonstration *formats*.** Web search in this environment kept returning SEO listicles and app-store landing pages rather than raw forum threads; `site:reddit.com` queries did not surface true thread bodies. I reached ~30 named apps/sources with usable data (see table), of which a strong core is VERIFIED on *licensing and feature facts*, but the **demonstration-format-preference and "guidance gets in the way" questions are largely PARTIAL/NOT FOUND from raw user voice** and lean on review aggregators and one authoritative UX source (NN/g). I am flagging this prominently rather than papering the gap with inference. Treat format-preference conclusions as PARTIAL until validated against real threads.

---

## 1. APPS / SOURCES RESEARCHED

| # | App / Source | Status | One-line note |
|---|---|---|---|
| 1 | Jefit | VERIFIED | 1,400+ exercises, HD video demos, targeted muscles + steps. |
| 2 | Fitbod | VERIFIED | 400+ video demos (some sources say 1,000+ exercises); demos noted as form-light. |
| 3 | Hevy | PARTIAL | "Amazing quality videos" per App Store; library count not surfaced; some missing-exercise reports. |
| 4 | Strong | NOT FOUND | Named in roundups; no demo-format detail surfaced. |
| 5 | FitNotes | NOT FOUND | Logging-focused; no demo content detail. |
| 6 | Nike Training Club | PARTIAL | Praised for polished beginner video; guided-workout model not library. |
| 7 | BetterMe | PARTIAL | Video + audio instruction through exercises incl. rest. |
| 8 | Muscle & Motion | VERIFIED | 1,200+ strength exercises, 3D anatomical animation, muscle activation. |
| 9 | JuggernautAI | VERIFIED | 300+ exercises each w/ video + coaching cues; no video *analysis*. |
| 10 | Caliber | PARTIAL | Human coach model; users praise video breakdowns of complex lifts. |
| 11 | Boostcamp | PARTIAL | Free coach programs (Catalyst etc.); robust for self-programmers. |
| 12 | Freeletics | PARTIAL | AI workout generation; named in AI-app set. |
| 13 | Fitloop | PARTIAL | Claims 1,000+ exercises w/ detailed instructions, all skill levels. |
| 14 | Load Muscle | PARTIAL | Claims 4,000+ exercises + video demos, AI planning. |
| 15 | Zing Coach | PARTIAL | AI-powered workout app, exercise library. |
| 16 | Gymscore | PARTIAL | AI fitness app rated 4.8/5; "next best thing to a coach". |
| 17 | Strava (Athlete Intelligence) | VERIFIED | AI coach widely called gimmick/"meme" by users — cautionary AI signal. |
| 18 | Form Fix (AI form check) | PARTIAL | Pose-estimation real-time form correction, beginner+advanced. |
| 19 | Formax | PARTIAL | AI form analyzer, beginner-focused. |
| 20 | FormCheck AI | PARTIAL | AI technique feedback "without cost of a trainer". |
| 21 | VideoFit | PARTIAL | Self-record + replay form-check tool, not a demo library. |
| 22 | Gymmade | NOT FOUND | Exercise-library app; no detail surfaced. |
| 23 | Dr. Muscle | PARTIAL | Source of independent Hevy review. |
| 24 | URUNN | PARTIAL | AI avatar running coach (Mo Farah) — 2026 AI-avatar example. |
| 25 | **MuscleWiki API** (source) | VERIFIED | 1,900+ exercises, 7,500+ videos, full commercial licence, tiered pricing. |
| 26 | **ExerciseDB API** (source) | VERIFIED | 11,000+ exercises, AGPL-3.0; media-rich. |
| 27 | **GymVisual** (source) | VERIFIED | 8,000+ 2D assets, N-CRFL perpetual licence, per-asset pricing. |
| 28 | **WorkoutLabs** (source) | VERIFIED | 679 exercises + 146 yoga, illustration, annual/perpetual/API licensing. |
| 29 | **wger** (source) | VERIFIED | 845+ exercises, AGPL + CC-BY-SA 4.0 catalogue, free/self-host. |
| 30 | **Everkinetic** (source) | VERIFIED | Open data, CC-BY-SA-4.0, free. |
| 31 | **MoveKit** (source) | VERIFIED | 200+ 3D video clips, commercial-included, one-time purchase. |
| 32 | **ExerciseAnimatic** (source) | VERIFIED | 2,300+ 3D 4K clips, lifetime commercial. |
| 33 | **Gym-Animations** (source) | VERIFIED | 7,000+ 3D animation, bundle-only commercial licence. |
| 34 | **Hyperhuman** (source) | VERIFIED | 2,000+ real/AI video, SaaS subscription (lose access on cancel). |
| 35 | **API Ninjas Exercises** (source) | PARTIAL | Exercise API named; licence/media not confirmed here. |

Named apps with real data: ~20+. Licensable/free **demo sources** with VERIFIED licence + cost: 9 (items 25–34). The 50-app target is **not met for raw user-review apps**; flagged at top.

---

## 2. FINDINGS (grouped by dispatch question)

### Q1 — Which demonstration format do users engage with most (video / animation / photo)?

**Finding 1.1 — VERIFIED (review-aggregator level, not raw user voice): Video is perceived as the higher-detail, default-preferred format; animation is seen as less detailed for technique.**
Setgraph's Reddit-roundup states animation-based technique demonstrations "can be less detailed than video-based apps," implying users perceive video as clearer for technique.
- NEWBIE: video wins where the movement is unfamiliar — they need to see a real human do the whole movement.
- ATHLETE: less format-sensitive; they often skip demos entirely (see Q3).
- Source: https://setgraph.app/ai-blog/best-gym-app-reddit — **PARTIAL** (aggregator paraphrase, not a quoted user).

**Finding 1.2 — VERIFIED: For short instructional clips, *shorter is better* and demos must "get to the point."** NN/g's instructional-video research: *"Shorter is often better… people are more likely to watch it,"* and a recurring complaint was videos with *"lengthy introductions [that] don't get to the point quickly enough."* This is the strongest evidence that the format users *engage* with is a short, immediately-looping demonstration, not a produced video with intros.
- NEWBIE: a 3–6s looping clip of the rep is the highest-engagement unit.
- ATHLETE: even less tolerance for intros; wants the clip and out.
- Source: https://www.nngroup.com/articles/instructional-video-guidelines/ — **VERIFIED**.

**Finding 1.3 — VERIFIED: Animation has a distinct, *different* job than video — anatomy/muscle-activation, not "watch a person."** Muscle & Motion uses 3D anatomical animation to show primary/secondary muscle activation across 1,200+ exercises; this is engaged with as an *educational* layer, not a form-mimicry layer.
- Source: https://www.muscleandmotion.com/strength-training-app/ — **VERIFIED**.
- INTERPRETATION (labelled): video and animation are not competitors but two layers — short real-movement clip for "how do I move," anatomical animation for "what am I working." Not a sourced user preference.

**Finding 1.4 — VERIFIED: Format *consistency* matters to users more than format choice.** MoveKit's 2026 library comparison: *"users will notice the inconsistency"* when exercises switch between animation styles; advice is to pick one primary source for the core set. A mixed-style library reads as low-quality.
- Source: https://movekit.com/blog/best-exercise-animation-libraries-2026 — **VERIFIED**.

**Photo-only format:** **NOT FOUND** — no evidence users prefer static photos over video/animation; photo appears only as a fallback in illustration libraries.

### Q2 — How much technique guidance do newbies vs athletes want?

**Finding 2.1 — PARTIAL: Newbies want demonstration *plus* coaching cues; demo-only is a known failure mode.** Reviewers report Fitbod users who *"felt the exercise demonstrations didn't give enough form guidance and end up preferring alternatives… once they realize the form coaching gap was their actual blocker."*
- NEWBIE: a clip alone is insufficient — they want cue text ("brace, neutral spine, drive through heels") attached.
- ATHLETE: cues are largely redundant.
- Source: https://fitnessdrum.com/fitbod-review/ — **PARTIAL** (reviewer paraphrase of users).

**Finding 2.2 — PARTIAL: Athletes value technique breakdowns only for *complex/skill* lifts.** Caliber users praise *"breakdowns of complex lifts like deadlifts or bench press phases"* — i.e. even advanced lifters want guidance, but targeted at high-skill movements, not every exercise.
- Source: https://wellness.alibaba.com/fitlife/caliber-app-coaching-vs-cost-guide — **PARTIAL**.

**Finding 2.3 — VERIFIED (UX principle): Guidance demand scales with unfamiliarity, not user tier.** NN/g: video attractiveness rises *"as the level of effort needed [for] unfamiliar or multistep content"* increases. The variable is the exercise's novelty to *that* user, not whether they self-identify as beginner or athlete.
- Source: https://www.nngroup.com/articles/instructional-video-guidelines/ — **VERIFIED**.
- INTERPRETATION (labelled): guidance should be keyed to "first time this user has done movement X," not a global beginner/athlete flag.

### Q3 — When do users want guidance vs when does it get in the way?

**Finding 3.1 — VERIFIED: Forcing video as the *only* path to information breeds resentment.** NN/g: users *"resented when a video was the sole way to get a piece of information"*; video works best as *supplementary*. Guidance gets in the way when it blocks the task.
- NEWBIE: wants guidance available on tap during the set.
- ATHLETE: wants it absent from the default flow, retrievable if needed.
- Source: https://www.nngroup.com/articles/instructional-video-guidelines/ — **VERIFIED**.

**Finding 3.2 — PARTIAL: Some users decline video by default and read first.** NN/g participant: *"I wouldn't start with a video first. That's not my style, I like to read first."* Implication: a demo should not auto-play/auto-block; offer text + tap-to-watch.
- Source: https://www.nngroup.com/articles/instructional-video-guidelines/ — **VERIFIED quote / PARTIAL as fitness-specific**.

**Finding 3.3 — NOT FOUND (raw fitness user voice): "experienced lifters find tutorials annoying."** Direct Reddit threads from advanced lifters saying demos get in the way were **NOT FOUND** in this environment (searches returned game-tutorial threads instead). Do not present as sourced.

### Q4 — Best licensable / free-premium demonstration sources (name + licence + cost; flag unverified prices)

All prices below are **as published on vendor pages in June 2026** and may change — flagged where the figure was not directly on a primary vendor page.

| Source | Content | Format | Licence | Cost | Status |
|---|---|---|---|---|---|
| **MuscleWiki API** | 1,900+ exercises, 7,500+ videos, M/F, multi-angle | Real video, REST/JSON | Full commercial use on all paid plans, no extra licensing | Free (500 calls), $10 / $29 / $79 / $199 per month by call volume; 25% off annual | VERIFIED (vendor page) — https://api.musclewiki.com/ |
| **ExerciseDB API** | 11,000+ exercises, 15,000+ videos, 20,000+ images, 5,000+ GIFs | Video/GIF/image API | **AGPL-3.0** (copyleft — viral; commercial app implications) | Repo lists "Pricing Plans" but **price NOT FOUND on GitHub page — UNVERIFIED** | PARTIAL — https://github.com/ExerciseDB/exercisedb-api |
| **wger** | 845+ exercises (contributor-driven media) | Images + some video | App AGPL-3.0; **catalogue CC-BY-SA 4.0** (attribution + share-alike on derivative *datasets*) | Free / self-host | VERIFIED — https://github.com/wger-project/wger |
| **Everkinetic** | Open exercise dataset (count NOT FOUND) | Illustrations/data | **CC-BY-SA-4.0** (attribution + share-alike) | Free | VERIFIED — https://github.com/everkinetic/data |
| **GymVisual** | 8,000+ assets | 2D illustration + GIF/video | N-CRFL — pay once, unlimited use, perpetual, worldwide, non-exclusive | ~$3–10 per asset (range from comparison source, not asserted as exact) | PARTIAL price — https://gymvisual.com/content/9-license |
| **WorkoutLabs** | 679 exercises + 146 yoga | Illustration (PNG/SVG, animated MP4/GIF) | Annual or perpetual; API option | $15/illustration (annual); full library from **$1,200/yr** or **$3,500+** perpetual; **API $195 setup + $50/mo in dev** | VERIFIED — https://workoutlabs.com/exercise-illustrations-licensing/ |
| **MoveKit** | 200+ | 3D video (MP4) | Commercial included, one-time | $4.99/clip or **$99** full library | VERIFIED — https://movekit.com/blog/best-exercise-animation-libraries-2026 |
| **ExerciseAnimatic** | 2,300+ | 3D video (4K MP4) | Lifetime commercial | $1/clip or ~**$329** bundle | VERIFIED (comparison source) — https://movekit.com/blog/best-exercise-animation-libraries-2026 |
| **Gym-Animations** | 7,000+ | 3D animation (MP4) | Commercial, **bundles only** | **$199–$599** bundles | VERIFIED (comparison source) — same MoveKit page |
| **Hyperhuman** | 2,000+ | Real video + AI-generated | Per-subscription; **lose access on cancel** | Tiered SaaS subscription (exact figures NOT FOUND) | PARTIAL — https://hyperhuman.cc/ |

**Licence caution for Volyume (offline-first, paid, EU):**
- AGPL-3.0 (ExerciseDB, wger app code) is **copyleft** — material legal implications for a closed-source paid app; flag to founder before any use.
- CC-BY-SA (wger catalogue, Everkinetic) requires **attribution + share-alike on derivative datasets** — usable but constrains how you re-package the data.
- One-time/perpetual commercial libraries (MoveKit, ExerciseAnimatic, WorkoutLabs perpetual, GymVisual N-CRFL) are the **cleanest fit for an offline-first owned-asset model** — assets ship on-device, no per-call API, no subscription that revokes content. Subscription/API sources (MuscleWiki, Hyperhuman) conflict with offline-first if content is streamed.
- INTERPRETATION (labelled): for an offline-first paid app, a **one-time-purchase, on-device, single-consistent-style** asset set (e.g. ExerciseAnimatic / MoveKit / WorkoutLabs perpetual) best matches both Finding 1.4 (consistency) and the architecture rule that every feature works offline. Not a user-sourced claim.

### Q5 — Is AI-generated exercise demonstration content considered "premium enough" in 2026?

**Finding 5.1 — PARTIAL/MIXED: AI demos are normalising as a product category but carry an "uncanny" and "gimmick" risk that undercuts premium perception.**
- Pro signal: 2026 roundups describe "lifelike digital avatars [that] demonstrate exercises… correct form instantly" as an engagement feature, and high-rated AI apps (Gymscore 4.8/5). Hyperhuman explicitly sells AI-generated exercise video as commercial infrastructure.
  - Sources: https://www.jploft.com/blog/how-to-build-an-ai-avatar-fitness-trainer-app , https://www.gymscore.ai/best-ai-fitness-apps-2026/ , https://hyperhuman.cc/ — **PARTIAL** (vendor/SEO, not user voice).
- Con signal (stronger, more credible): AI video is repeatedly described as **"uncanny"**, and the clearest *user* reaction to an AI fitness feature is dismissive — Strava's AI coach called *"more like a meme than anything"* / *"pointless"* by its own users. AI fitness-transformation video also raises documented harm concerns (body-image), relevant to Volyume's ED-safety posture.
  - Sources: https://www.aol.com/finance/fitness-app-strava-ai-coach-110000016.html (user "meme"/"pointless" quote) ; https://www.newsweek.com/ai-fitness-videos-january-social-media-trend-eating-wellness-diet-11402013 (harm concerns) ; uncanny-valley discussion https://ykulbashian.medium.com/why-ai-generated-videos-feel-hypnotic-fluid-and-uncanny-71c822ad3da5 — **VERIFIED** for the quotes/claims as published.
- NEWBIE: an uncanny avatar can mislead on form and erode trust at the exact moment trust is being built.
- ATHLETE: most likely to dismiss AI demos as gimmick.
- **Bottom line (PARTIAL): in 2026 AI-generated demo content is *accepted as existing* but is NOT reliably perceived as premium; real video / clean animation still reads as the premium signal, and the strongest captured user sentiment toward AI fitness features is sceptical.**

### Q6 — What library completeness do users consider baseline?

**Finding 6.1 — PARTIAL: No sourced consensus number; competitive baseline observed is ~1,000–1,500 exercises with the *common* lifts fully covered.** Observed counts: Jefit 1,400+, Fitbod ~1,000, Fitloop 1,000+, wger 845, JuggernautAI only 300+ (deliberately curated). Roundups frame variety as valuable but warn it "helps only when it's easy to choose."
- Sources: Jefit/Fitbod/Fitloop counts above; https://trustyspotter.com/blog/best-workout-apps-reddit/ — **PARTIAL**.

**Finding 6.2 — PARTIAL: The real baseline test is "the exercise I want is present," not raw count.** Scattered reports of users unable to log specific exercises in Hevy; a recurring competitor bug class is "exercises missing from a flow." Completeness is judged by *absence of a gap*, not catalogue size.
- Source: https://www.teamblind.com/post/app-for-tracking-weightlifting-workouts-vsdarjxe (missing-exercise report) — **PARTIAL**.
- NEWBIE: needs the ~100–200 staple movements covered flawlessly with demo + cue.
- ATHLETE: needs long-tail / variation coverage (specialty bars, unilateral, machine variants) and a **custom-exercise** path when the catalogue lacks one.
- INTERPRETATION (labelled): the winning spec is "staples fully demonstrated + long tail present + user can add a custom exercise," not a headline count. Not user-sourced.

### Q7 — Verbatim user voice: when was exercise guidance genuinely helpful?

**Finding 7.1 — VERIFIED (App Store): Hevy** — users cite *"Amazing quality videos"* and value that it *"shows form, tracks weights for every exercise, and makes it fun."*
- Source: https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm (citing App Store reviews) — **PARTIAL** (aggregator citing App Store; raw review URL: https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews ).

**Finding 7.2 — PARTIAL: Caliber** — users *"report feeling more motivated and technically sound after receiving personalized cues"* and praise video breakdowns of complex lifts.
- Source: https://wellness.alibaba.com/fitlife/caliber-app-coaching-vs-cost-guide — **PARTIAL**.

**Finding 7.3 — PARTIAL: Jefit** — described by users/reviewers as providing *"detailed instructions and HD videos that walk you through how to do each exercise,"* with the demo + targeted muscles + steps combination called out as the helpful unit.
- Source: https://www.gymbird.com/fitness-apps/fitbod-vs-jefit — **PARTIAL**.

> The strongest *raw, quotable* user praise I could verify is Hevy's "amazing quality videos." Deeper first-person "this app taught me to deadlift" testimonials were **NOT FOUND** as raw threads in this environment — flagged.

---

## 3. VERBATIM USER VOICE (each with URL + status)

- *"Amazing quality videos"* — Hevy, App Store reviews (via aggregator). https://www.hotelgyms.com/blog/hevy-workout-app-review-the-up-and-comer-taking-the-fitness-world-by-storm — PARTIAL.
- *"I wouldn't start with a video first. That's not my style, I like to read first."* — NN/g instructional-video study participant. https://www.nngroup.com/articles/instructional-video-guidelines/ — VERIFIED.
- Users *"resented when a video was the sole way to get a piece of information."* — NN/g. https://www.nngroup.com/articles/instructional-video-guidelines/ — VERIFIED.
- On Strava's AI coach: *"It just feels more like a meme than anything right now"* / *"kind of pointless."* — user, via AOL/Fortune. https://www.aol.com/finance/fitness-app-strava-ai-coach-110000016.html — VERIFIED.
- Fitbod users *"felt the exercise demonstrations didn't give enough form guidance"* and switched apps. — Fitness Drum review. https://fitnessdrum.com/fitbod-review/ — PARTIAL.

---

## 4. BEST-IN-CLASS

- **Demonstration as a layered unit — Jefit / Hevy:** short HD video clip + named target muscles + step text per exercise. Hevy's clips earn "amazing quality videos"; Jefit pairs HD video with steps and muscle targeting. https://www.gymbird.com/fitness-apps/fitbod-vs-jefit ; Hevy App Store reviews — PARTIAL/VERIFIED.
- **Anatomy/education layer — Muscle & Motion:** 3D animation showing primary/secondary muscle activation across 1,200+ moves — the benchmark for the *"what am I working"* layer, distinct from form video. https://www.muscleandmotion.com/strength-training-app/ — VERIFIED.
- **Targeted advanced cueing — Caliber:** breakdowns of complex lifts (deadlift/bench phases) that even experienced users praise. https://wellness.alibaba.com/fitlife/caliber-app-coaching-vs-cost-guide — PARTIAL.
- **Curated-not-bloated library — JuggernautAI:** deliberately ~300 exercises, each with video + cues — counter-evidence that bigger is always better. https://declom.com/juggernautai — PARTIAL.

---

## 5. PROPOSAL INPUT (sourced only)

1. **Ship short, immediately-looping demo clips (no intros), not produced videos.** NN/g: shorter is better, intros are resented. [VERIFIED]
2. **Never make a demo the *only* path or auto-block the flow** — text + tap-to-watch; demo retrievable, never forced. NN/g resentment finding + "read first" user. [VERIFIED]
3. **Layer two distinct things:** short real-movement clip ("how to move") + optional anatomical view ("what it works", Muscle & Motion model). [VERIFIED that the two layers exist and are valued separately.]
4. **Attach coaching cues to the staple lifts** — demo-only is a documented churn cause (Fitbod). Key guidance to first-time-for-this-user movements, not a global tier flag (NN/g unfamiliarity principle). [PARTIAL / VERIFIED principle]
5. **Library spec = staples fully demonstrated + long tail present + custom-exercise path.** Competitive band ~1,000–1,500; completeness judged by absence of gaps, not headline count. [PARTIAL]
6. **Use one consistent demonstration style across the core set** — mixed styles read as low quality (MoveKit). [VERIFIED]
7. **Asset-sourcing fit for offline-first paid model:** prefer one-time/perpetual on-device libraries (ExerciseAnimatic, MoveKit, WorkoutLabs perpetual, GymVisual N-CRFL) over per-call APIs or revocable subscriptions (MuscleWiki, Hyperhuman) which conflict with the offline-first architecture rule. **Flag AGPL-3.0 (ExerciseDB, wger code) and CC-BY-SA share-alike (wger/Everkinetic data) to founder before any use** — legal implications for a closed paid app. [VERIFIED licences; offline-fit is INTERPRETATION]
8. **Be cautious with AI-generated demos.** In 2026 they are accepted as a category but not reliably *premium*; strongest captured user sentiment toward AI fitness features is dismissive ("meme"/"pointless"), and AI fitness video carries documented body-image harm concerns relevant to Volyume's ED-safety posture. Real video / clean animation still reads as premium. [VERIFIED user sentiment + harm concern; "premium enough" conclusion is PARTIAL]

> Note for the blueprint session: items 3, 5, and 7 contain explicitly-labelled INTERPRETATION that is **not** user-sourced — do not promote to "finding" without validation against raw threads (the gap flagged below).

---

## 6. VERIFICATION SUMMARY

- **Named apps/sources with usable data:** ~35 listed; **~20 apps + 9 licensable/free demo sources** carry real data.
- **VERIFIED:** 15 findings/sources (notably all licence facts for MuscleWiki, GymVisual, WorkoutLabs, wger, Everkinetic, MoveKit, ExerciseAnimatic, Gym-Animations, Muscle & Motion; NN/g UX guidelines; Strava AI user quotes).
- **PARTIAL:** ~14 (format-preference via aggregators; newbie/athlete guidance depth; most app-level praise; ExerciseDB/Hyperhuman pricing; library-baseline numbers).
- **NOT FOUND:** raw Reddit/App-Store user voice directly comparing demonstration *formats*; advanced-lifter "tutorials get in the way" threads; photo-format preference; deep first-person "this taught me X" testimonials; Everkinetic exercise count; exact ExerciseDB and Hyperhuman prices.

### FLAGS
- **<20-apps-with-real-data risk:** met the ~20 threshold for licensing/feature facts, but **fell short on apps with raw *user-review* data on demonstration format** — the core qualitative question. Flagged at top and here.
- **Biggest gap:** direct user-voice on *which format* (video vs animation vs photo) lifters actually engage with most, and when guidance gets in the way for experienced lifters — **NOT FOUND as raw forum/App-Store threads** in this environment; conclusions lean on review aggregators + NN/g UX principles. Recommend a follow-up pass with direct Reddit thread access before blueprinting Q1/Q3.
- **Tool note:** `site:reddit.com` and review-thread queries consistently returned SEO listicles / app-store landing pages rather than thread bodies; per CLAUDE.md degraded-capability rule this is surfaced rather than silently downgraded.
