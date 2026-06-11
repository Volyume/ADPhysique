# NEW-001 Phase 0 — exercise-demo sourcing (£0 gate)

Date: 2026-06-11. Triggered by the founder decision to **drop Gym Animations
($599)** — "there are better alternatives a lot cheaper" — and to **run the
£0 Phase 0** before any direction or spend is chosen. No money has moved.
This brief replaces NEW-001's vendor recommendation; its placement, offline,
and bundle-size analysis still stand.

The original constraints hold: no self-filmed content; static photos alone
are not convincing; no AI-generated-on-device; offline-first; Expo managed
workflow; consistent character; muscle/anatomy highlighting preferred;
neutral imagery (ED-safety app). The bundle target was top-150 of 449
exercise IDs, ≤ ~25 MB install + an offline-cached pack.

## Candidates found (cheaper than $599), with what still needs confirming

| Option | Style | Clips | Price (snippet — VERIFY on vendor page) | Why it's a contender | Open questions |
|---|---|---|---|---|---|
| **MoveKit** (movekit.com) | 3D, muscle highlights | 200+ | **$99 full library** one-time, or $4.99/clip, category packs $49–79; commercial licence, own forever, plain **MP4** (no SDK) | The direct like-for-like 3D-with-highlights option at ~1/6 the Gym Animations price; 200+ covers our top-150 target; MP4 transcodes to our HEVC loops | Does the 200+ set map onto our 449 IDs / cover the top-150? Offline **bundling/caching** explicitly allowed? Any **competing-product** clause? Grey-model + red-target-muscle aesthetic actually present per clip? |
| **Vector Fit Exercises** (vectorfitexercises.com) | 2D Lottie vector | 1,470+ | Lottie JSON / dotLottie / MP4 / MOV (price VERIFY) | **Lottie = tiny filesize** — the strongest offline-bundle play (whole library could fit the install budget); scales crisply | Is the vector style "convincing" enough vs the rejected generic-GIF look? Licence for paid-app + offline? Anatomy highlighting available? |
| **Free Exercise DB** (yuhonas, GitHub) | Static JPG | 800+ | **£0 — data is Unlicense / public domain** | Zero-cost fallback; already JSON-structured for mapping | **Image rights are NOT stated** — data is public domain but the photos' licence is unclear; static-only (founder already deemed photos insufficient alone). Verify image provenance before any bundling |
| **ExerciseAnimatic** | video | 1,850+ | ~$0.25/clip, 4K/60 (price VERIFY) | Cheapest per-clip; high res | Character consistency? Highlighting? Licence/offline? Total cost if buying the set |
| **GymVisual** | 2D anatomy illustration | 8,000+ | per-asset (VERIFY) | Largest illustration set if we go 2D-illustration | Not 3D; static; licence/offline |

Note: ExerciseDB / Kaggle "Fitness Exercises" GIF sets (1,300–1,500+) were
also found, but their GIFs commonly derive from copyrighted sources — treat
their licensing as suspect; not recommended without clear provenance.

## Recommended £0 next actions (pick a direction, then validate, before spend)

1. **Lead candidate: MoveKit at $99.** Same 3D-with-muscle-highlight
   direction NEW-001 recommended, at ~1/6 the cost, plain MP4 (fits our
   transcode pipeline), one-time/own-forever. If its terms clear, it makes
   the whole "is this worth $599" question moot.
2. **Filesize hedge: Vector Fit Exercises (Lottie).** If install/offline
   budget is the binding constraint, Lottie is dramatically smaller than any
   video route and bundles trivially — worth a look even though it is 2D.
3. **£0 fallback: Free Exercise DB**, only if a paid route is rejected and
   only after the image rights are confirmed.

## The six licensing questions to send each paid vendor (in writing, £0)

1. Does the licence permit use of the clips **inside a paid mobile app** sold
   on Google Play / App Store?
2. Does it permit **offline bundling and on-device caching** of the clips
   (not streaming)?
3. Does it permit **re-encoding/transcoding** (e.g. MP4 → muted HEVC loops)
   and trimming to short loops?
4. Is there any **competing-product clause** that would bar a fitness/workout
   app from using them?
5. Is the licence **perpetual and one-time**, or does continued use require a
   subscription? What happens to already-shipped clips if we stop paying?
6. What **attribution**, if any, is required, and where?

## Go/no-go visual validation (£0, before buying)

- Pull each candidate's **free samples** and view them on the **dark theme**
  at the real in-app size (info sheet + ExerciseDetail).
- Confirm a **consistent character** across clips and that the
  **target-muscle highlight** reads at small size (the M&M differentiation).
- Map the free samples onto a handful of our 449 IDs to sanity-check coverage
  of the top-150.
- Confirm neutral, non-triggering imagery (ED-safety posture).

Only after answers 1–6 are acceptable AND the visual check passes does any
purchase decision return to the founder. Nothing here commits spend.

---

*Sources accessed 2026-06-11 (search snippets; vendor pages movekit.com and
the MoveKit comparison returned HTTP 403 to direct fetch, so all prices and
licence terms above are flagged VERIFY against the live vendor pages before
relying on them):*

- [MoveKit — exercise animation libraries compared (2026)](https://movekit.com/blog/best-exercise-animation-libraries-2026) · [MoveKit pricing](https://movekit.com/pricing)
- [Free Exercise DB (yuhonas, GitHub)](https://github.com/yuhonas/free-exercise-db) — Unlicense/public-domain data; image rights unstated
- [Vector Fit Exercises](https://vectorfitexercises.com/)
- [Gym Animations (the dropped $599 vendor, for reference)](https://gym-animations.com/)
- [ExerciseDB API](https://github.com/exercisedb/exercisedb-api) · [Kaggle Fitness Exercises Dataset](https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset)
