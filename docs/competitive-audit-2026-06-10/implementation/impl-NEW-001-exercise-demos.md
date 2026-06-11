# impl-NEW-001 — Exercise demonstration solutions (gating deep research)

> **VENDOR DROPPED 2026-06-11 (founder decision).** The recommended Gym
> Animations $599 package is rejected: "drop it, there are better
> alternatives a lot cheaper." The £0 Phase 0 still runs, repurposed to
> source cheaper/free alternatives before any direction is chosen — see
> `../gaps/new-001-phase0-demo-sourcing.md`. The rest of this blueprint's
> analysis (placement, offline-first constraint, bundle maths) still holds;
> only the vendor/cost recommendation is superseded.

Date: 2026-06-10. Round-2 blueprint replacing rejected COMP-014/COMP-028.
Founder constraints honoured throughout: **no self-filmed content; static
photos and generic licensed GIF loops are not convincing on their own; no
AI-generated-on-device anything; offline-first; Expo managed workflow;
bundle-size discipline; British production quality bar.**

Code ground truth verified against source: ~449 canonical exercises with
deterministic name-hash IDs (`src/lib/seedExercises.js`,
`canonicalExerciseId()`); derived metadata incl. primary/secondary muscles
(`src/lib/exerciseMetadata.js`); text-only info sheet in
`src/screens/ActiveWorkoutScreen.js` lines 1950–1984 ("How to do it" +
`FORM_TIPS` fallback); `src/screens/ExerciseDetailScreen.js` (no media);
`src/components/ExercisePickerModal.js` (text rows, no thumbnails).
`expo-image ~3.0.11`, `expo-file-system`, `expo-asset`, `expo-updates`
installed; **no video player module installed**. `assets/` currently 8.5 MB
(6.9 MB of it the food seed).

**Sourcing flag:** most vendor pages (gym-animations.com, movekit.com,
exerciseanimatic.com, exercisedbpro.com, gumroad, gymvisual.com, ymove.app,
exrx.net, workout-animation.com) return HTTP 403 to direct fetch from this
environment. Pricing/licence figures below are taken from indexed search
extracts of those exact pages and are marked *(search-extract)*. Every
figure must be re-confirmed on the live page before any purchase.

---

## 1. Best-in-market bar

(Extends round-1 `../competitive-audit-01-exercise-library-research.md`;
not repeated in full.)

1. **Fitbod** — pro-filmed HD loop inline on every logging card, muted,
   ignorable-but-present; the canonical "helps novices without annoying
   veterans" pattern ([Fitness Drum](https://fitnessdrum.com/fitbod-review/),
   [fitbod.me/about-fitbod-exercises](https://fitbod.me/about-fitbod-exercises/)).
2. **MuscleWiki** — silent 5–10 s loops, male AND female demonstrators,
   detail one tap away; the format that draws breakthrough review language
   ([musclewiki.com](https://musclewiki.com/),
   [JustUseApp reviews](https://justuseapp.com/en/app/1096827640/musclewiki-app/reviews)).
3. **Muscle & Motion** — 3D anatomy animation with muscle activation; users
   call moving 3D anatomy "far superior to anatomical pictures"
   ([App Store](https://apps.apple.com/us/app/strength-training-by-m-m/id1302056349)).
   Sustains a paid product on visualisation alone.
4. **Gymaholic** — rotatable 3D model + muscle highlighting; 94 % 4–5★,
   the 3D model explicitly credited for form on complex barbell lifts
   ([regpaq review](https://regpaq.com/gymaholic-app-review-the-best-gym-app-for-workout-tracking)).

**The single best bar for a tracker:** Fitbod's delivery pattern (instant,
silent, never blocking) carrying Muscle & Motion's content idea (anatomy
made visible). Nobody in the cohort combines both. That combination is the
target.

## 2. What fails (anti-patterns by name)

- **Static photo pairs** (free-exercise-db look): below the founder's bar;
  no competitor wins reviews on photos; rejected with COMP-014.
- **Generic filmed GIF loops** (ExerciseDB-style): inconsistent
  demonstrators/sets across the library, GIF payloads are huge (see §3.6),
  and the look is shared with hundreds of template apps — the exact
  "generic" feel the founder rejected.
- **Streaming-dependent media** (MuscleWiki API, ExRx API, Hyperhuman,
  YMove API): MuscleWiki's API terms explicitly forbid offline storage and
  re-hosting ([api.musclewiki.com](https://api.musclewiki.com/),
  [terms](https://musclewiki.com/api-terms)); ExRx and Hyperhuman are
  recurring-fee streaming models *(search-extract:
  [ExRx API FAQ](https://exrx.net/Store-2/Other/APIFAQ),
  [hyperhuman.cc/pricing](https://hyperhuman.cc/pricing))*. All conflict
  with the offline-first sacred rule.
- **Guidance clutter** — Jefit: "a lot happening on screen… not as
  streamlined for people who just want to log sets quickly"
  ([Setgraph roundup](https://setgraph.app/ai-blog/best-strength-training-app-reddit)).
  Nothing autoplays on the logging surface.
- **Demos without integrated cues** — Peloton Gym criticism
  ([Parade](https://parade.com/health/peloton-gym-review)); the loop must
  sit WITH the existing form-tip text, not replace it.
- **Muscle & Motion consumer licence** — explicitly forbids redistribution
  of animations in third-party apps *(search-extract:
  [muscleandmotion.com/pricing](https://www.muscleandmotion.com/pricing/))*;
  their content is not buyable off the shelf, only via a custom B2B quote
  (sales@muscleandmotion.com).

## 3. The solution space (the research)

### 3.1 Premium licensed real-video libraries

| Source | Model | Cost (449 / top-150) | Offline / licence | Verdict |
|---|---|---|---|---|
| **GymVisual** video clips | Per-clip purchase, downloadable files | $10/clip, $6 at 5+ ⇒ **~$2,700–4,500 / ~$900–1,500** | N-CRFL: one-time, perpetual, worldwide; app use allowed; no resale/stock/AI-training *(search-extract: [gymvisual.com/content/9-license](https://gymvisual.com/content/9-license))* | Viable but filmed-generic — the look the founder rejected |
| **YMove** white-label | From $19/mo, usage-metered API (10,000 min ≈ 40,000 plays) | recurring | API/streaming model; one-time download terms unconfirmed *(search-extract: [ymove.app/exercise-api/pricing](https://ymove.app/exercise-api/pricing), [library page](https://ymove.app/exercise-video-library))* | Conflicts with offline-first unless renegotiated |
| **ExRx.net** | API plans, monthly dues (Economy/Premium); videos Premium-only | recurring | Streaming API; offline redistribution not offered *(search-extract: [ExRx API FAQ](https://exrx.net/Store-2/Other/APIFAQ), [licensing](https://exrx.net/Store/Other/Licensing))* | Conflicts with offline-first |
| **Central Athlete** (2,800+ videos), **Fitter Stock**, **Fitscope**, **iBodyFit** | B2B licensing, quote-based | unknown | Quote-based; mostly class/coaching content | Quote route only; no published perpetual-offline terms ([centralathlete.com](https://www.centralathlete.com/exercise-video-library), [fitterstock.com](https://fitterstock.com/)) |
| **Stock marketplaces** (Pond5, Envato, Vimeo stock) | Per-clip $50–200 typical | **~$22k–90k / ~$7.5k–30k** | Per-item licences vary; Envato Elements requires live subscription per use registration | Fails production consistency across 449 clips ([pond5 fitness-animation](https://www.pond5.com/search?kw=fitness-animation&media=footage)) |
| **MuscleWiki API** | $10/mo TESTING upward (PRO/ULTRA/MEGA unpublished) | recurring | **Offline storage forbidden** ([api.musclewiki.com](https://api.musclewiki.com/)) | Ruled out |

Conclusion: real-video licensing either streams (offline violation),
prices per-clip into five figures for consistency we still don't control,
or is the generic-filmed look already rejected. **No premium video library
sells perpetual, offline, consistent, full-coverage filmed video at indie
cost.** Alpha Progression and Fitbod own their footage because they filmed
it — the route the founder has ruled out.

### 3.2 3D animation systems (the Gymaholic / Muscle & Motion direction)

**Off-the-shelf rendered 3D libraries** (pre-rendered loops, downloadable
files, one-time licences — all *(search-extract)*):

| Vendor | Coverage | Style | Price | Licence |
|---|---|---|---|---|
| **Gym Animations** ([gym-animations.com](https://gym-animations.com/)) | 7,000+ clips; man AND woman anatomical versions; Man package alone 2,100+ | Grey 3D body model, **target muscles highlighted in red inside the clip**, white background, FHD MP4 (+GIF demos) | **$199 (Woman, 800+) → $599 (full Man+Woman, 7,000+)** ≈ $0.09/clip | Non-Exclusive Commercial Royalty-Free; one-time, no recurring fees; fitness-app integration explicitly allowed; background modification explicitly permitted ([licence page](https://gym-animations.com/license/)) |
| **MoveKit** ([movekit.com/pricing](https://movekit.com/pricing)) | 200+ clips | 3D character; **separate dedicated muscle-highlight clip per exercise** | $4.99/clip; **$99 full library**; packs $49–79 | Commercial licence for apps/courses/content |
| **Exercise Animatic** ([exerciseanimatic.com](https://www.exerciseanimatic.com/)) | 2,400+ videos + 4,500 illustrations | 3D renders, 4K/1080p/720p + vertical | **~$329 (sale; reg. $599)** Ultimate Bundle; logo-branding variant available | Lifetime business licence, unlimited use; app use allowed ([licence](https://www.exerciseanimatic.com/license)) |
| **Workout-Animation** ([workout-animation.com](https://workout-animation.com/)) | 7,216 clips, 4K/2K | 3D renders | Ultimate Bundle price not indexed | N-EB2BL: app integration allowed; **no competing products**, no broadcast, no stock resale, no AI training ([licence](https://workout-animation.com/license/)) |

**Commissioned 3D (brand-owned pipeline):** market anchors — Upwork 3D
animator median **$25/hr** (typical $17–30)
([Upwork rates](https://www.upwork.com/hire/3d-animators/cost/)); basic 3D
animation **$100–300/finished minute**, freelance one-minute work
$500–3,000 ([F.Learning](https://flearningstudio.com/3d-animation-cost-per-minute/)).
Mocap route: Rokoko Smartsuit Pro II **$2,745–3,495** (+gloves)
([Rokoko](https://www.rokoko.com/products/smartsuit-pro),
[Tom's Hardware launch price $2,495](https://www.tomshardware.com/news/rokoko-launches-smartsuit-pro-mocap-suit,34374.html));
hired studio session ~$1,500–2,000 per half-day + $500–1,500 cleanup
([MoCap Online cost guide](https://mocaponline.com/blogs/mocap-news/motion-capture-cost-guide)).
At ~40–60 exercises captured per day plus per-clip cleanup/render, a
realistic commissioned budget is **£6k–15k for the top-150** and
**£18k–45k for all 449** (one body version; double for two), over 2–4
months. This is the Gymaholic/Alpha-style owned-asset path.

**Runtime options in React Native/Expo:**

- **Pre-rendered loops (recommended, near-certain):** play as ordinary
  media. Zero per-frame compute, hardware video decode, works identically
  offline.
- **Real-time 3D (three.js / expo-gl / a rigged model in-app):** would need
  a rigged character + 449 animation clips shipped as glTF, a render loop
  on the session screen (battery + jank risk on mid-range Android), months
  of bespoke engineering, and it still ships the same megabytes of
  animation data. Rotate/zoom is the only user-visible gain — Gymaholic's
  differentiator, but not worth the engineering and risk for a logger.
  **Rejected.**

### 3.3 Illustration / Lottie systems

LottieFiles marketplace "workout/fitness" packs are 10–30 generic clips
for UI decoration — **no vendor sells a Lottie exercise-demonstration
library at anything near 449-exercise coverage**
([LottieFiles marketplace](https://lottiefiles.com/marketplace/various-exercises) and
[siblings](https://lottiefiles.com/marketplace/fitness-workout)).
Commissioning ~449 anatomically credible vector character loops is bespoke
2D character animation at roughly $50–200 per simple loop on freelance
marketplaces ([Twine rate guide](https://www.twine.net/blog/how-much-do-freelance-animators-make/)) —
**£18k–70k**, doubled for MuscleWiki-style male/female dual demos, for a
style with no proven engagement evidence in this category, and with
CPU-rendered character JSON (Lottie) being heavier at runtime than a
hardware-decoded video loop. **Rejected: highest cost, least evidence.**

### 3.4 Hybrid: anatomy-highlight overlays on loops

This is Muscle & Motion's differentiation and it IS buyable without M&M:
- **Gym Animations bakes it in** — grey body model with target muscles
  highlighted red inside every clip, both body versions *(search-extract:
  [gym-animations.com](https://gym-animations.com/))*.
- **MoveKit sells separate highlight-only clips** per exercise ($99
  library) for a two-layer UI if wanted ([movekit.com](https://movekit.com/)).
- Muscle & Motion itself: not licensable off-the-shelf (§2); B2B quote
  only.

Volyume already stores primary/secondary muscles per exercise
(`seedExercises.js` RAW rows), so highlighted-muscle clips can be
cross-checked against existing metadata at curation time — a correctness
audit no competitor's generic integration does.

### 3.5 Acquisition / partnership angles

No exercise-demo library was found listed for sale on indexed marketplaces
(searches across acquisition/licensing terms surfaced only the licensing
vendors above — evidence thin, flagged as such). Revenue-share licensing
is not offered by any indexed vendor; the closest structures are
Hyperhuman's subscription content platform and LES MILLS class licensing
([hyperhuman.cc](https://hyperhuman.cc/)) — wrong content type (classes),
recurring fees, streaming. With perpetual buy-outs available at $329–599
(§3.2), **acquisition solves a problem Volyume does not have. Rejected.**

### 3.6 Bundle-size maths (the binding constraint)

Measured anchor (5 s, 480p, 24 fps test): animated WebP (q80) **1.1 MB**;
MP4 H.264 (CRF 23) **211 KB**; MP4 H.265 (CRF 28) **142 KB**; GIF ~40×
larger than the MP4
([utilitykit format comparison](https://www.utilitykit.tools/blog/gif-vs-webp-vs-mp4-for-the-web/),
[gifresizer guide](https://gifresizer.org/guides/gif-vs-mp4-vs-webp)).
Clean 3D renders (locked camera, flat background) compress better than
that screen-capture test; planning figures per 8 s loop:

| Format | Per 8 s loop (360–480p) | 449 exercises | Top-150 | Notes |
|---|---|---|---|---|
| GIF (vendor-supplied) | 0.5–1.5 MB | **250–650 MB** | 80–220 MB | Never ship GIF; transcode always |
| Animated WebP | ~0.8–1.7 MB | **~400–760 MB** | 130–250 MB | Plays via installed `expo-image` (zero new deps) but 4–6× video size; CPU-decoded, documented jitter on Android partial frames ([Glide/Compose jitter write-up](https://medium.com/@diskerr_17971/fixing-animated-webp-jitter-on-android-with-jetpack-compose-45c9e8f67adb)) |
| MP4 H.264 | ~0.3–0.4 MB | **~135–180 MB** | 45–60 MB | Hardware-decoded everywhere |
| **MP4 H.265/HEVC** | **~0.15–0.25 MB** | **~70–110 MB** | **~23–35 MB** | Hardware decode on effectively all supported devices (ExoPlayer/AVPlayer); the right target |
| Lottie JSON | 50–300 KB | 22–135 MB | 8–45 MB | CPU-rendered; no library exists (§3.3) |

**Budgets this blueprint commits to:** ≤ **+25 MB** on the base install
(top-150 by logging frequency, one body version, 360–480p HEVC, 6–8 s
loops ≈ 18–30 MB, + top-150 poster frames ~3 MB), and a **one-time
optional "All demos" pack ≈ 120–200 MB** (remaining 299 + second body
version) fetched post-install on Wi-Fi via `expo-file-system` into app
storage, cached permanently, fully offline thereafter. Expo-compatible
delivery alternatives: plain post-install fetch (cross-platform, zero new
native code) or the community `expo-play-asset-delivery` config plugin
(install-time/on-demand Play asset packs, Android only —
[npm](https://www.npmjs.com/package/expo-play-asset-delivery),
[GitHub](https://github.com/one-am-it/expo-play-asset-delivery)). The
fetch-and-cache route is recommended: one code path, both platforms, no
extra native dependency.

Playback dependency: `expo-video` (first-party Expo SDK module, config-
plugin-free) for muted looping MP4s. **New dependency — requires founder
approval per house rules.** Zero-new-dependency fallback exists (animated
WebP via installed `expo-image` — at the 4–6× size penalty above)
([expo-image formats](https://docs.expo.dev/versions/latest/sdk/image/),
search-extract).

### 3.7 What users actually engage with (evidence)

No public head-to-head loop-vs-video-vs-3D dataset exists; the best
available evidence is store-review sentiment per format (round 1 §5, plus
this round):

- **Delivery beats asset class.** The praised implementations (Fitbod
  filmed loop, MuscleWiki filmed loop, Gymaholic 3D, M&M 3D) share
  delivery traits — instant, silent, inline, detail one tap away — while
  the criticised ones (Jefit clutter, Peloton cue-less demos) fail on
  delivery, not on format.
- **3D earns "understanding" language** ("far superior to anatomical
  pictures", "actually helps users learn and improve their form" —
  M&M App Store, Gymaholic regpaq, round 1 §5); **filmed video earns
  "setup/trust" language** ("showing exactly what to use" — Gymshark).
- Dr. Muscle's "realistic animation… at the proper speed" with muscle
  highlighting is praised in the same breath as real video
  ([round 1, honourable mentions](../competitive-audit-01-exercise-library-research.md)).
- Strong's missing demos are called its "biggest problem" (round 1) —
  absence is punished harder than any format choice.

Net: a consistent 3D loop with visible muscle anatomy is at no evidenced
engagement disadvantage to filmed video inside a tracker, and carries the
only differentiating layer (anatomy) the market's loved-but-niche product
(M&M) proves people pay for.

## 4. User psychology (lenses applied)

- **Moment of need:** "show me what this looks like, right now" — mid-set,
  at the info tap, at swap time, and on first meeting an unfamiliar
  exercise. The demo therefore lives inside surfaces the user already
  opens (info sheet, detail screen, swap/picker rows) — never a new one.
- **Habit loop:** cue = unfamiliar exercise name; action = one tap on the
  existing info affordance; reward = instant silent loop with the working
  muscles lit up, beside the existing written cues.
- **Effort budget:** zero added taps for veterans (nothing new on the
  logging surface); one existing tap for novices. Removes the current
  "google the exercise mid-session" exit from the app.
- **Emotional safety:** a neutral grey anatomical model shows the movement
  without a physique to compare oneself against — a genuine advantage over
  filmed fitness models for a product with an ED safety system. No
  behaviour change needed under wellbeing/ED flags; demos carry no
  emotional state.
- **Word-of-mouth surface:** "it shows you the exact muscle lighting up
  on every exercise" — screenshot-able, tellable, and new App-Store-
  screenshot material.
- **Trust mechanics:** highlighted muscles are cross-checked against
  Volyume's own primary/secondary metadata at curation, so the picture
  never contradicts the swap engine or per-muscle coaching copy.

## 5. The Volyume implementation (recommendation)

### 5.1 RECOMMENDATION — "Anatomy loops": licensed pre-rendered 3D
muscle-highlight animation system

Buy the **Gym Animations full Man + Woman package ($599, one-time,
perpetual N-CRFL)** *(search-extract — confirm live)*, transcode in-house
to 6–8 s muted HEVC loops at 360–480p, map clips to Volyume's 449
canonical IDs (verifying highlighted muscles against `primaryMuscle` /
`secondaryMuscles`), bundle the top-150 by logging frequency, and deliver
the remainder + second body version as a one-time offline-cached media
pack. Fill coverage gaps (expected 5–15 % of 449 names) with per-clip
top-ups from MoveKit ($4.99/clip) or commission single clips in matching
style.

Why this clears the founder's bar where photos and generic GIF loops did
not: it is a **system, not stock** — one consistent character, anatomy
made visible in every clip (the Muscle & Motion differentiation no tracker
ships), both body versions (the MuscleWiki dual-demo pattern), tiny silent
loops in the Fitbod delivery pattern, 100 % offline, extensible per-clip,
and visually distinct from the GIF-template look of low-effort apps.

**RUNNER-UP — commissioned brand-owned 3D pipeline:** mocap capture
(Rokoko suit ~$2.7–3.5k or studio half-days at $1.5–2k) + animator
cleanup/render at Upwork-median rates; **£6k–15k top-150, £18k–45k all
449** (§3.2). Buys exclusivity, a house art style, and unlimited
extensibility (division-specific variations on demand). Held as Phase 3:
commission replacements for the top-150 only if Phase 1 telemetry proves
demo engagement, reusing the identical UI/delivery layer.

### 5.2 Placement (placement is the product)

- **ActiveWorkoutScreen info sheet (lines 1950–1984)** — the demo's
  primary home. The loop sits at the top of the existing sheet, above
  "How to do it", autoplaying muted (poster + tap-to-play under Reduce
  Motion). Joins an existing surface; adds nothing to the logging layout;
  fully compatible with COMP-001 (which keeps the info affordance).
- **ExerciseDetailScreen** — loop at the top of the overview, with a
  body-version toggle remembered globally.
- **ExercisePickerModal + swap modal** — Phase 2: 48 pt poster-frame
  thumbnail per row (~12–20 KB WebP stills), because swap confidence is a
  picker-moment problem.
- **Never on the logging card itself in v1.** The session screen is
  sacred ground; an inline-thumbnail option is noted for a post-COMP-001
  decision, not proposed here.

### 5.3 Interaction spec

- States: bundled (plays instantly) / in optional pack not yet downloaded
  (poster frame + "Download all demos" affordance) / no clip mapped
  (current text-only sheet, unchanged — graceful absence, never a broken
  slot) / Reduce Motion (poster + play button, 44 pt).
- Offline: bundled clips always work; pack clips work after one Wi-Fi
  download; nothing ever streams. Download manager: resumable, restartable,
  surfaced in Settings → Data & storage with size shown before download
  and a delete option.
- Custom exercises: no licensed media; sheet unchanged. (User-photo slot
  remains COMP-028's deferred scope.)
- Copy (house voice): "Demos work offline once downloaded." ·
  "Get every exercise demo. About 150 MB. Wi-Fi recommended." ·
  "No demo for this one yet."
- Accessibility: silent by design (no captions needed);
  `accessibilityLabel` "Demonstration: {exercise name}"; Reduce Motion
  respected; toggle and play targets ≥ 44 pt.

## 6. Whole-package integration

- **Strengthens:** the swap engine and ExercisePicker (visual confirmation
  of ranked alternatives); FORM_TIPS (169 hand-written tips finally pair
  with a visual instead of reading as an absence); COMP-015's per-muscle
  autoregulation copy (the same muscle the coach names is the one
  highlighted in the demo — one anatomy vocabulary across the app);
  Play-listing screenshots (COMP-012/COMP-007 marketing surfaces).
- **Avoids duplicating:** nothing — Volyume has zero media today. The demo
  joins the existing info sheet rather than adding a surface; net new
  screens: zero. Streamlining effect: removes the leave-the-app-to-google
  moment.
- **ED/wellbeing flags:** no interaction; neutral anatomical model is the
  safest possible imagery choice (§4).
- **Free vs Pro:** demos are exercise-library content → **free tier**
  (the exercise library is free; gating demos would re-gate a free
  surface's expected content — the category's cardinal sin).

## 7. Retention & word-of-mouth mechanics

Feeds the novice activation loop: first unfamiliar exercise → instant
demo → completed first session → Fitbod-style "finishable first workout"
retention. The tellable moment: "every exercise shows the muscle lighting
up, and it all works in an airless basement gym" — anatomy + offline is a
combination no competitor sentence contains.

## 8. Beating the benchmark

Fitbod's bar is filmed loops with perfect delivery; Muscle & Motion's bar
is anatomy with poor delivery (a separate reference app). Volyume ships
anatomy inside Fitbod's delivery pattern: silent instant loops, one tap
from the set, muscle activation visible in every clip, both body versions,
verified against the app's own muscle metadata, and 100 % offline — which
Fitbod's streamed video cannot claim. Equal on delivery, ahead on content
depth and offline trust, at under £1k of content cost.

## 9. Measurement

- `demo_viewed` (canonical_id, surface) — target: ≥ 60 % of new users view
  ≥ 1 demo in week one; telemetry allowlist extension required.
- Swap-modal completion rate (existing funnel) before/after thumbnails.
- D7/D30 retention, first-90-days cohort, pre/post ship.
- `media_pack_downloaded` rate among week-one users (validates the
  pack-vs-bundle split before Phase 3 spend).

## 10. Build notes, phased plan, budget, licensing questions

**Files/components:** new `src/lib/exerciseMedia.js` (manifest: canonical
ID → {file, poster, bundled|pack, bodyVersions}); media keyed by
`canonicalExerciseId` so mapping survives library top-ups; demo viewer
component reused across the three surfaces; pack downloader on
`expo-file-system` (no sync-layer involvement — media is not user data);
Settings → Data & storage row. No DB schema change (manifest ships as
JSON). Dependencies: **`expo-video` (requires founder approval)**;
optional `expo-play-asset-delivery` explicitly NOT recommended (Android-
only, community-maintained).

**Phased plan + budget (cash, excl. internal time):**

| Phase | Work | Cost | Adds |
|---|---|---|---|
| 0 (1 wk) | Send licensing questions; validate 30-clip free demos on dark-theme mock; map top-150 names against vendor catalogue BEFORE purchase | £0 | go/no-go evidence |
| 1 (2–3 wks) | Buy ($599 ≈ £470); ffmpeg HEVC pipeline; top-150 bundled; info-sheet + detail-screen viewer | ~£470 + top-up clips ~£50–150 | ≤ +25 MB install |
| 2 (2–3 wks) | Media pack (remaining 299 + second body version, ~120–200 MB cached); picker/swap thumbnails | £0 | optional download |
| 3 (gated on §9 data) | Commission house-style top-150 (runner-up path) | £6k–15k | brand-owned moat |

**Total to full 449 coverage: ≈ £600–800.** Worst-case with heavy gap
top-ups: ≤ £1,500. (Runner-up alone: £18k–45k.)

**Licensing questions to ask (in writing, before purchase):**
1. Does the N-CRFL cover transcoding/re-encoding, resizing, trimming and
   background re-compositing for in-app use, with the derived files
   bundled inside a paid mobile app on Play/App Store?
2. Does "non-exclusive use in fitness apps" hold for an app whose
   exercise library is a headline feature — i.e. confirm no
   "competing product" reading applies (Workout-Animation's licence has
   such a clause; confirm Gym Animations' position)?
3. Is the licence perpetual, worldwide, irrevocable, and survivable if the
   vendor ceases trading? Who holds the underlying IP (rig, mocap)?
   Any third-party claims indemnity?
4. Are end users sub-licensed to view cached copies on-device (offline
   cache explicitly fine)?
5. Are future/new animations included, and what is the per-clip price and
   turnaround for commissioning missing exercises in identical style
   (extensibility guarantee)?
6. Invoice to the company name, VAT position, licence-holder of record.

**Risks:** (1) vendor licence ambiguity or a competing-product reading —
mitigated by Q1/Q2 in writing pre-purchase; (2) coverage gaps vs Volyume's
449 names — mitigated by pre-purchase catalogue mapping (Phase 0);
(3) white-background clips on a dark theme — mitigated by the licence's
explicit permission to change backgrounds, validated on the 30 free
samples in Phase 0; (4) founder may judge the grey-model aesthetic below
the British quality bar — exactly why Phase 0 is a £0 visual validation
gate before any money moves.

**Effort sanity-check:** Phases 1–2 ≈ one developer 4–6 weeks including
the encode pipeline — consistent with the E4 originally scored for
COMP-014, despite the format upgrade, because the licensing route keeps
production external.

---
*NEW-001 blueprint. No code modified. All flagged prices require live
confirmation before purchase.*
