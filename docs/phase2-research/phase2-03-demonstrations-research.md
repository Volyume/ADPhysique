# Phase 2 — Feature 2 Research: Exercise Demonstrations (phase2-03)

**Date:** 2026-06-08 · **Feature:** premium exercise technique guidance · **Status:** research, no build
**Method note:** web fan-out + cross-source corroboration; many app/API/academic pages 403'd to automated fetch, so figures are search-extracted + corroborated. Confidence flagged per claim.

---

## A. How other apps do demos (mechanics + reception)

Three tiers emerged (HIGH confidence on the pattern):

- **Coaching apps — demos support a human/AI coach:**
  - **Future** (~$199/mo): high-quality **human-filmed** demos; value is the human coach. Complaints: streaming **lag/crashes on demo playback**, and *injury/soreness from improper form* — reviewers note video + remote feedback **can't correct form like an in-person trainer**. *(Useful: demos alone don't guarantee correct execution.)*
  - **Caliber:** **owned, professionally produced video for every exercise** (~500–600+), full library free; differentiator is the coach. Some catalogue gaps.
  - **RP Hypertrophy** (Renaissance Periodization): **~250+ proprietary technique videos** featuring Dr Mike Israetel + 45+ plans. Owned content, core selling point. (MEDIUM-HIGH on the count.)
  - **Dr. Muscle:** **animations** with **muscle-group highlighting** + text + video. AI-generated vs licensed/rendered: **unconfirmed** (likely rendered).
- **Database/builder apps — breadth vs per-clip quality tradeoff:**
  - **JEFIT:** ~1,400+ movements with **rendered/animated loops**, muscle maps, difficulty; "not as detailed as dedicated tutorial videos"; UI called dated/cluttered, quality varies.
  - **Hevy:** ~300+ exercises, **variable quality** (some community-sourced); tracker-first.
  - **Fitbod:** HD video **+ written coaching cues** (tempo/ROM) — the practical consensus blend.
- **Trackers — minimal/none:** **Strong** has essentially no demos (pure logger; for users who already know the movements).

**Freeletics:** demos are **human-filmed** (reported 4K/3-angle, MEDIUM); its "AI" is in *programming/coaching* and *pose-based form feedback* (MediaPipe/BlazePose, MEDIUM), **not demo generation.**

**Reception synthesis (MEDIUM-HIGH):** helped = owned, high-quality, multi-angle demos + written cues + muscle-highlight overlays + large glanceable UI. Got in the way = streaming lag/crashes, cluttered UI, inconsistent/community quality, and demos that don't translate to correct form (injury complaints).

---

## B. AI-generated demos at scale — skeptical verdict: NOT ready (2026)

- **No major fitness app ships AI-*generated* demonstration animation at scale.** Leaders use human-filmed video or pre-rendered/licensed 3D loops. "AI" = programming/personalisation/form-feedback, not demo authoring. (MEDIUM-HIGH.)
- **Generative video (Runway Gen-4.5, Veo 3.1, Kling, Pika)** fails exactly where demos need strength: **hands/grip artefacts**, **soft/incorrect fast-repetitive motion** (clean rep-after-rep loops are the weakest regime), **no cross-clip consistency** (same model/equipment/lighting across hundreds of exercises), and **no biomechanical guarantee** → risk of demonstrating *unsafe/wrong form* (a real liability for a coaching app). **Sora discontinued (web/app 2026-04-26).**
- **The only credible AI-adjacent route is markerless *motion capture*** (Move AI; research stacks Theia3D, Pose2Sim→OpenSim): record a real performer, digitise to clean 3D motion → drive a 3D model. That's "cheaper capture for **owned** 3D assets", not free content. **Uncanny-valley** remains a barrier for animated trainers.
- **Verdict:** reject text/image-to-video generation for technique demos. (HIGH.)

---

## C. Free/licensable sources

- **ExRx.net (MEDIUM-HIGH):** licenses commercially. **Economy API tier forces a per-exercise browser redirect to ExRx → breaks offline-first (non-starter).** Premium tier removes that (price on request). Visual asset is the classic dual-frame stick/animation with muscle highlight — **anatomically accurate but dated/clinical, won't read premium on #0D0D0D, and licensed assets can't be restyled.** **Verdict:** good for *data/taxonomy*, poor for *premium visuals*.
- **Wikimedia / CC (HIGH):** CC0/CC BY usable (CC BY needs an attribution screen); **CC BY-SA = avoid** (share-alike copyleft on derivatives can force open-licensing your adapted media). Real exercise content on Commons is **sparse, inconsistent, amateur** — unusable as primary for a paid app.
- **Stock (Getty/Shutterstock/Pexels/Pixabay) (HIGH):** built for **marketing b-roll**, not systematic per-exercise demos; you can't assemble a consistent 300–900-exercise library (same angle/lighting/model). Free tiers (Pexels/Pixabay) carry **no model releases / no indemnity** (you assume legal risk). **Verdict:** fine for hero/onboarding mood, not the technique source.
- **Owned assets — the premium bar (MEDIUM-HIGH):** instructional video ≈ **$2,800–$4,800/finished minute** at agency rates; **batching the whole catalogue as one series** (reuse crew/set/model) is the big cost lever. **MacroFactor Workouts (Jan 2026): 600+ custom videos, 3 angles each + written notes** — current premium benchmark (spend undisclosed; inferred low-to-mid six figures outsourced). **RP** similarly owns its library. Owned = premium quality + cross-catalogue consistency + full dark-theme restyle/branding + zero licence/attribution/share-alike risk + offline freedom.
- **ExerciseDB / wger (HIGH on licences):** ExerciseDB is **AGPL-3.0** (network-copyleft → source-disclosure risk for a closed app) + **RapidAPI gateway** (unstable free tier, "not for production", **conflicts with offline-first**), GIFs **male-only**, step-paced, white backgrounds. wger code AGPL-3+, **data CC BY-SA** (share-alike), crowdsourced/uneven. **Verdict:** both carry copyleft strings + quality/architecture problems; avoid as production source.

---

## D. React Native / Expo delivery

| Approach | Bundle | Offline | Perf | Premium fidelity |
|---|---|---|---|---|
| Static WebP | tiny | trivial | best | low (no motion) |
| **Lottie** | tiny (KBs) | native (bundle) | excellent | **stylised only** |
| **Looping H.264 MP4** | large → **don't bundle; fetch+cache** | yes, once cached | good | **highest (real footage)** |
| 3D (GLB + three) | moderate | yes | heaviest | high + interactive |

- **expo-image is the right tool for thumbnails + animated WebP** (already installed, `~3.0.11`): `prefetch()` to warm cache, `cachePolicy="memory-disk"`; on iOS opt into **libwebp** codec for correct animation timing; newer versions support prefetch-with-headers (signed Supabase URLs).
- **expo-video is the 2026 recommendation for real-footage rep loops** (`player.loop=true`, `useVideoPlayer`, persistent LRU disk cache via `setVideoCacheSizeAsync` → **cached clips play fully offline**). **expo-av is deprecated for video — do not use.** *(Both expo-video and three would be NEW dependencies — see proposal §0 / CLAUDE.md no-deps-without-permission.)*
- **3D/GLB via expo-gl + three/@react-three/fiber:** highest ceiling, cheapest to *extend* (ship motion clips, reuse mesh), pairs with mocap — but heaviest engineering, must test on physical devices, runtime/battery cost. A "phase 3" play, overkill for launch.
- **Delivery without bloat (HIGH):** never bundle heavy media. Ship code + (optional) Lottie JSON + small static WebP placeholders. Host heavy assets on **Supabase Storage (EU/Dublin bucket) + Smart CDN**, long `cache-control`, **on-demand fetch + persistent device cache**. **Formats:** demo loop **H.264 MP4 ≤1MB, ~3–6s, muted, seamless, ~480–720p** (H.264 = universal hardware decode); thumbnails **WebP**. **Model egress** — demos are a *free* feature served to the whole base, so egress is the real cost driver.

---

## E. Efficacy & UX — the decision-relevant findings

- **The backfire effect (MEDIUM-HIGH, most important):** *Riedl & Pauwels, "Video Moves You"* — randomised field experiment blocking demo videos across ~4.5M user-exercise pairs — found demos **increase completion for higher-skilled users on medium/hard exercises, but have no effect or *backfire* for lower-skilled users** (a polished demo of a hard move reads as a *threat*: "I can't do that"). **Demos are not universally good.** Pair with regressions/easier framing for beginners; never force.
- **Format:** short looping video > static for engagement, but value is **conditional on skill/difficulty** → context-aware, not "video everywhere". Practical consensus: **a short visual loop + 1–3 written cues** serves both quick-glance and detail.
- **Moment:** surface full demos at **selection/onboarding and *between* exercises**; keep **active sets distraction-free** (large glanceable rep/weight/timer, no pop-ups). **On-demand tap** is the safe mid-workout default.
- **Mid-workout cues:** users can't read paragraphs — use **enlarged glanceable visuals + 2–3 imperative cues** ("brace", "drive through heels", "control the negative"). A **silent ~2s auto-loop + 2–3 cues** aligns with both glanceability and "don't interrupt the set". (MEDIUM, reasoned synthesis.)
- **Engagement reality:** fitness-app engagement is low (~25% abandoned after one use); demos compete for scarce attention → must be fast, optional, never blocking.

*Flagged/uncorroborated:* ExerciseDB "wrong-exercise GIF" complaints (plausible, not authoritatively sourced); Freeletics 4K/3-angle + MediaPipe (single-source); Dr. Muscle/JEFIT animation provenance (inferred); "+30% engagement"/"2.5× video" (single UX-blog, illustrative). The "Video Moves You" backfire finding is corroborated across four references.

---

## F. Synthesised constraints (feed into phase2-04)
1. **Own the content** (or properly-licence ExRx *data* only). Free GIF datasets fail on licence (AGPL/CC-BY-SA), architecture (RapidAPI vs offline-first), and quality (male-only, dated, white backgrounds).
2. **Premium = owned, consistent, dark-theme-native, biomechanically correct.** Until owned videos exist, ship a **graceful fallback** (illustrated muscle diagram + structured written cues) that stands alone — Volyume already has `BodyDiagramHeatmap`, `Illustrations`, and `FORM_TIPS` to build it (phase2-00 §6/§9).
3. **Short silent loop + 2–3 imperative cues**, on-demand, never forced; account for the **backfire effect** for beginners.
4. **Surface at exercise detail/selection and between exercises; keep active-set logging clean.**
5. **Delivery:** expo-image (WebP thumbnails, already present) now; **expo-video** only if/when real MP4 loops exist and a new dependency is approved. Supabase Storage EU + CDN, on-demand fetch + disk cache, ≤1MB H.264. Model egress for a free feature.
6. **Free, not Pro-gated** — demos are table-stakes credibility, not a revenue lever (consistent with Volyume's "exercise library is Free" and conversion logic).
