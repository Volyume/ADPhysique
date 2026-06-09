# Phase 2 — Best-in-Class Proposal: Exercise Demonstrations & Training Partners

**Date:** 2026-06-09 · **Status:** proposal for sign-off. No code. Grounded in (a) a full audit of Volyume's current code and (b) deep competitive research across ~25 apps.

This supersedes the earlier demonstrations proposal/build, which failed by placing a populated-with-nothing demo card on a screen users almost never reach (Progress → Lifts → exercise) and by re-surfacing written form notes that already exist in the workout. Every placement claim below is anchored to the IA audit, and every "how" claim to named competitors.

---

## 0. The single most important finding

The best workout loggers — **Hevy, Fitbod, Boostcamp** — all do the same thing: the exercise demonstration is reachable **in one tap from the active set, by tapping the exercise name mid-session, opening a sheet that does NOT pause or discard the workout.** Library-only access is now considered a weakness.

Volyume's high-traffic surfaces (audit §10) are **HomeScreen** and **ActiveWorkoutScreen** — where users spend 30–90 min/session. `ExerciseDetailScreen` (the prior demo location) is reachable **only** via Progress → Lifts → tap a lift, and is genuinely low-traffic. So the prior placement was structurally wrong. **The demo must live on the exercise the user is training, one tap from the set.**

---

## 1. True picture of the app today (from the audit)

### Demonstrations
- **Schema is in place** (`migrate_072/073`: `demo_url`, `demo_thumbnail_url`, `form_cues`, `common_mistakes`, `demo_duration_seconds`; public read bucket `exercise-demos`). All columns are **NULL**.
- **Components exist**: `DemoCard` (renders media or falls through to `IllustrationCard`), `IllustrationCard` (a **generic body+barbell icon, identical for every exercise** — not a real illustration), `CoachingNotesPanel` (structured cues / prose / common mistakes; now open by default, labelled "Technique guide").
- **Zero visual content exists.** No video/GIF/animation/illustration is populated. The only real content is **`FORM_TIPS` — 169 exercises of written prose that already existed** and is already surfaced in-workout under the "Info" → "How to do it" modal (`ActiveWorkoutScreen.js:2054`). The recent "How to perform" sheet duplicated this.
- **The seeder** (`scripts/seed/seedExerciseDemos.js`) targets **WorkoutX**, was **never verified and never run**, and the competitive research shows its likely Everkinetic-derived media is **CC BY-SA (viral ShareAlike) — a licence trap** for a closed app.
- **Deps:** `expo-image` is installed (animated WebP + caching, no new dep). `expo-video`, Lottie, 3D are **not** installed.

### Training Partners
- **Fully built and, unusually, architecturally best-in-class.** Server-authoritative weekly signal (sessions done/planned, streak, status), per-circle + master sharing toggles, emoji nudges (rate-limited), contest-prep auto-pause, offline cache, deep-linked invites, weekly local digest, and a **schema-enforced privacy guard** — only `display_name` + session counts + streak are ever shared; **no weight/food/coaching/ED data exists in the shared tables**.
- **Pro-only; the rollout feature-flag was removed** (so it's live for every Pro user).
- **The gap is discoverability**: it lives only in You → Coaching. The proposed post-4th-workout onboarding hint was never built. Nothing surfaces it near the training flow.

---

## 2. Competitive synthesis (what the research established)

### Demonstrations — where & how the field does it
- **Placement:** in-workout, one tap from the set, via the exercise name → detail sheet **without pausing** (Hevy "How to" tab; Fitbod video at top of Exercise Details opened by tapping an exercise in the workout; Boostcamp tap-the-name). Library/detail is the secondary container.
- **Format trend:** GIF/animation → **HD video**, increasingly **multi-angle** (JEFIT's second-angle form check is a standout). **Tap-to-play** on detail screens (Fitbod explicit); muted, looping, thumbnail-first.
- **For a logging-first app specifically** (Caliber/Sweat/Centr-self-guided model): short looping per-move clip, **phase-segmented (setup → execution → common mistakes)**, **previewable from the workout list**, **glanceable/eyes-free** cueing, optional async self-recorded form review. **Avoid** animated stick-figures (Sworkit panned as too small/glitchy) and **avoid** hiding the move list (Apple Fitness+'s most-cited flaw).
- **Pitfalls to avoid:** Fitbod's most-cited complaint is **removing offline GIFs** so demos need signal — fatal for an offline-first app. Don't ship partial coverage silently; don't over-claim counts.

### Demonstrations — sourcing & UX facts
- **MP4 (H.264) is ~40× smaller than GIF** (~211 KB vs ~8.4 MB for a 5s 480p clip; animated WebP ~1.1 MB). A full **offline** library is therefore practical.
- **Licensing reality:** `free-exercise-db` = **Unlicense/public-domain** (~800 exercises, but **static start/end stills only**). **MoveKit** = clean commercial licence, **$99 for 200+ owned 3D MP4 clips**, self-host + offline. **Avoid:** Everkinetic/wrkout (CC BY-SA ShareAlike), **MuscleWiki/ExRx** (terms forbid offline storage — disqualifying), ExerciseDB (AGPL-code vs restrictive-media contradiction).
- **UX:** muted + loop + playsinline; ~5–12s; thumbnail-first; **tap-to-play during set logging** (not autoplay over inputs); **honour Reduce Motion** (no autoplay → poster + explicit play); visible play/pause control.

### Training Partners — what's loved & privacy-safe
- Most-loved, least-leaky mechanic = **lightweight recognition (kudos/high-fives/likes)** — best-evidenced (Strava kudos has academic support).
- **Apple Fitness model** (opt-in per-person, shares only a minimal non-sensitive signal, sensitive data never leaves device) is the **best fit for a privacy-first app** — which is exactly what Volyume already built.
- **Designed 1:1 buddy pairing / small private pods is a genuine market white space** (mainstream apps don't do it; only Apple per-person Competitions and Garmin two-person Challenges come close). Volyume's small circles + minimal signal already sit in that white space.
- **Counter-signal:** Strong thrives *without* social, and default-public feeds (Hevy) alienate serious/private lifters → **default-private/opt-in is correct** (Volyume already defaults off).

---

## 3. Feature 1 — Exercise Demonstrations: best-in-class proposal

### 3.1 Placement (the fix)
**Primary surface — the in-workout exercise sheet, one tap from the set.** Consolidate Volyume's two overlapping in-workout surfaces — the cyan **"Info" → "How to do it"** modal and the newer **"How to perform"** sheet — into **one** "exercise sheet" reachable by **tapping the exercise name/header** in `ActiveWorkoutScreen` (the Hevy/Fitbod pattern), which **must not pause or discard the session**. Order inside the sheet (Fitbod = media on top):
1. Demonstration media (looping, muted, **tap-to-play**) — or the still/illustration fallback.
2. 2–3 imperative key cues, glanceable.
3. Collapsible deeper "Technique guide" (the existing `CoachingNotesPanel`: setup/execution/common mistakes).
4. This exercise's recent history / PBs (already available).

**Discoverable entry point:** add a small **demo thumbnail / ▶ chip next to the exercise name** in the logging header (Hevy/sourcing research) so users *see* a demo is available — not a hidden tap target.

**Secondary surfaces:**
- **Exercise picker / build flow:** a **thumbnail** on each row (Apple Fitness+'s flaw is hiding the move list; a logging app already has it). No autoplay.
- **`ExerciseDetailScreen`:** keep the full `DemoCard` + guide (it's a fine *secondary* home), but it is no longer the primary.

**Remove the redundancy:** fold the duplicated "How to do it" prose into the single sheet so written cues appear once, attached to the media — not as a separate competing surface.

### 3.2 Format & interaction
- **Media:** short **muted looping clip**, **tap-to-play** in the in-workout sheet (never autoplay over the set inputs); thumbnail-first.
- **Reduce Motion:** no autoplay anywhere; show poster + explicit play; visible controls.
- **Offline-first is non-negotiable** (this is Volyume's whole architecture and Fitbod's cautionary tale): all demo media must be **cached on-device** and replayable with no signal. MP4's tiny size makes a full offline set feasible.
- **Phase-segmented + common-mistakes** content is the highest-value, cheapest-to-produce cueing (Caliber's most-praised feature) — the `form_cues {setup, execution, cues}` + `common_mistakes` schema already supports exactly this.

### 3.3 Sourcing (decision: phased, licence-clean, offline)

**Reality check (2026-06-09 — assets inspected, not assumed):**
- **free-exercise-db: I downloaded and viewed the actual images.** They are **real gym photographs** (a model performing the movement with real equipment), a start/end pair per exercise, ~850px JPGs (~40–73 KB) — **not** line drawings or stick figures. They are clearly *more informative* than the current identical generic icon. **However**, the set is aggregated stock: **inconsistent models and settings across exercises** (barbell lifts share a red-wall studio with branded apparel; cable/machine moves are different models in different gyms), **visible third-party apparel branding**, dated (~2012). It reads as "scraped/stock," not bespoke. **Verdict: a real upgrade as the FALLBACK that replaces the generic icon — but not premium enough to be the headline demo for a £4.99/mo app.**
- **MoveKit: I could NOT verify the render quality.** Their site hard-blocks automated access (returns nothing/403), so I have not seen an actual clip. Verifiable from secondary sources only: single consistent anatomical mannequin, off-white background, **muscle-highlight overlay variants**, 200+ clips, $99 full / $4.99 per, commercial licence, loopable, and a **free 2-exercise sample pack**. **Do NOT approve the $99 until the sample pack is downloaded and the render is judged premium** — if it looks like a 2014 fitness app it will cheapen the product regardless of the clean licence.

**Revised plan:**
- **Phase 1 — replace the generic icon with the free-exercise-db photo as the FALLBACK** (no licence/dep risk: Unlicense/public-domain, `expo-image` renders JPG, bundled offline, reuses the name-matching infra). Position it honestly as a reference photo, **not** as the premium "demonstration." Caveat to check first: the **visible apparel branding** in some shots (confirm it's not a competitor/trademark issue before shipping).
- **Phase 2 — premium animation is the hero, but sample-gated:** download MoveKit's **free 2-exercise sample pack** and judge the render on-device. If premium → licence the $99 library, host top ~200 most-logged exercises in the existing `exercise-demos` bucket, cache offline. If not premium → reject and evaluate a higher-end library (Muscle & Motion, Gym Animations) or a small commissioned set. **Buy nothing blind.**
- **Explicitly reject** the WorkoutX/Everkinetic path (CC BY-SA viral), MuscleWiki/ExRx (no offline), ExerciseDB (licence contradiction). Retire/replace the unverified WorkoutX seeder.
- **Dependency decision for sign-off:** Phase 1 (photos) needs **no new dep**. Phase 2 MP4 wants **`expo-video`** (new dep, requires approval per CLAUDE.md) — or stay on **animated WebP via `expo-image`** (no new dep, ~1.1 MB/clip). Recommendation: **photo fallback + cues now (no dep); approve `expo-video` only once a premium animation source is confirmed via sample.**

### 3.4 Integration points (reuse what exists; no rebuild)
- Schema, bucket, `DemoCard`, `CoachingNotesPanel`, name-matching seeder infra, `expo-image` caching, and the in-workout sheet all already exist — the work is **content + placement + consolidation**, not new scaffolding.
- Coach copy may *reference* the guide ("check the technique guide before your shoulder session") — copy only, no engine change (within the no-LLM rule).

### 3.5 Acceptance (so "done" means done this time)
A real, non-generic demonstration renders **on device, offline, in the active-workout exercise sheet, one tap from the set**, for the top most-logged exercises — verified on a physical device, not by tests passing.

---

## 4. Feature 2 — Training Partners: best-in-class proposal

The architecture is already best-in-class and privacy-correct (§1, §2). **Do not rebuild it.** The work is **discoverability + a small set of loved-mechanic enhancements**, all within the existing privacy guard.

### 4.1 Discoverability (the real gap)
- **Build the proposed onboarding hint:** after the user's *N*th completed workout, a **single, dismissible** prompt (You tab and/or the post-workout summary): "Training with someone? Keep each other honest — share only whether you trained." One-time, via the existing `seen_onboarding_hints` mechanism. (Respects research: don't force, don't clutter Home.)
- **Post-workout summary entry:** on `WorkoutSummary` (medium-high traffic, shown after every session), add a low-key partner touch — if in a circle, a "nudge your partner / your week" affordance; if not, the one-time invite hint. This is where accountability emotionally lands (you just finished — celebrate/share consistency).
- **Keep it Pro-only and opt-in/default-off** (correct per research). Do **not** add a public feed or put workout contents anywhere.

### 4.2 Loved-mechanic enhancements (privacy-safe)
- **High-fives/kudos** are the most-loved, least-leaky mechanic. Volyume's **emoji nudges already are this** — keep, and surface them more prominently on the partner card and in the digest.
- **Streak + small private "consistency" view** within a circle (sessions-this-week pips, which already exist) is the Peloton-Teams/Garmin pattern done privately — **never ranked on load/bodyweight** (privacy rule). Already essentially present; make it the visual centrepiece of the partner card.
- **1:1 / small-pod accountability is the white space** Volyume already occupies — lean into it in copy and store positioning ("a private training partner, not a feed").

### 4.3 What to avoid (validated by research)
- No public profiles/feed/follower-discovery, no leaderboards on lifted load or bodyweight, nothing surfacing nutrition/coaching/ED data. (All already prevented by the schema — keep it that way.)

---

## 5. Sourcing & licensing decision matrix (for sign-off)

| Source | Licence | Format | Offline OK? | Verdict |
|---|---|---|---|---|
| **free-exercise-db** | Unlicense (public domain) | Real **photos**, start/end pair (~850px) — *inspected* | ✅ | **Fallback only** (real photo > generic icon; too inconsistent/stock to be the hero; check apparel branding) |
| **MoveKit** | Commercial, own the files (~$99/200+) | 3D MP4 + muscle-highlight variants — *render NOT yet seen* | ✅ | **Sample-gated:** get the free 2-exercise pack, judge premium quality; adopt only if it looks premium |
| Everkinetic / wrkout | CC BY-SA (viral ShareAlike) | Illustrations | ✅ | Reject (closed-app conflict) |
| MuscleWiki | API, no media storage | Video | ❌ | Reject (no offline) |
| ExRx | Paid, no redistribution | GIF/video | ❌ | Reject (no offline) |
| ExerciseDB | AGPL code vs restrictive media | GIF | ⚠️ | Reject (licence contradiction) |
| WorkoutX (prior) | Unverified; Everkinetic-derived | GIF | ⚠️ | Retire |

*(All licences verified 2026-06-09; re-check before launch.)*

---

## 6. Phasing

1. **Phase 1 (now, no new dep, no external spend):** seed public-domain start/end stills offline + consolidate the in-workout exercise sheet (media-top, tap-to-play, single guide) reachable by tapping the exercise name; thumbnails in the picker; remove the duplicate prose surface. Build the Training Partners onboarding hint + summary entry.
2. **Phase 2 (small spend + dep approval):** licence MoveKit, host top ~200 MP4 demos in the existing bucket, cache offline; approve `expo-video` (or ship animated WebP). Multi-angle later (JEFIT pattern).
3. **Phase 3 (optional):** async self-recorded form review (Caliber/Future), expand demo coverage toward every library exercise.

---

## 7. Open decisions for sign-off
1. **Demo media at launch:** free-exercise-db photo as the *fallback* now (real, but stock-looking — see samples) + a premium animation source as the hero next — or hold the fallback too and wait for premium only?
2. **`expo-video` dependency:** approve for MP4, or ship animated WebP via `expo-image` (no new dep)?
3. **MoveKit spend** (~$99): **not** a blind yes — first download the **free 2-exercise sample pack** and confirm the 3D render looks premium on-device. Approve the spend only after seeing it. (I couldn't view it from here — their site blocks automated access.)
4. **Training Partners discoverability:** approve the one-time onboarding hint + the `WorkoutSummary` entry point (keeping Home clean)?
5. **Coverage target:** demo on every library exercise (avoid the "partial coverage" complaint) — agree the priority list (most-logged first)?

---

*Research base: full Volyume code audit (IA, demonstrations stack, partners stack) + competitive analysis of Hevy, Strong, JEFIT, Fitbod, Boostcamp, Alpha Progression, Setgraph, FitNotes, Gymshark, Train Fitness/Motra, Liftin, Liftbear, Caliber, Centr, Freeletics, Nike Training Club, Apple Fitness+, Peloton, Ladder, Sworkit, Future, Tonal, Sweat, Strava, Garmin, Apple Fitness. Sources catalogued in the underlying research transcripts.*
