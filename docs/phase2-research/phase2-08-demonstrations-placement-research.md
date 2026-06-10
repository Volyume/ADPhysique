# Phase 2 — Research: how the best apps surface EXERCISE DEMONSTRATIONS (placement, size, format)

**Date:** 2026-06-10 · **Status:** research, no build · **Method:** 5 parallel web-search agents (strength loggers; video-led apps; coaching apps; instructional-media UX evidence; clip-format/delivery), cited, low-confidence flagged.

**Why this exists:** Volyume's demo was reachable only via a **12px "How to" text link** (and an "Info" button) — and a structural bug meant the modal never opened during a workout. Beyond the bug, the *placement* itself is below best practice. This establishes where the demo should live, how big, and what format reads as premium.

---

## 1. What the market does — placement & prominence

**Strength loggers (Hevy, Strong, JEFIT, Boostcamp, Caliber, Fitbod):** the demo is **one tap away, surfaced via the exercise NAME or a clear "How to"/"Instructions" tab** — opening it does **not pause the session** (explicit in Hevy). None hide it behind a tiny low-contrast link. Boostcamp markets form videos as "mid-set, at your fingertips." Fitbod = HD video, **tap-to-play** (not autoplay), shown with a **targeted-muscle image**. JEFIT/Dr. Muscle add **muscle-highlight overlays**. [Hevy](https://www.hevyapp.com/features/exercise-library/), [Fitbod](https://help.fitbod.me/hc/en-us/articles/30721437384215), [JEFIT](https://www.jefit.com/download/fitness-app), [Boostcamp](https://www.boostcamp.app/exercises)

**Video-led apps (Apple Fitness+, Peloton, NTC, Centr, Ladder, Sweat):** **no major app hides the demonstration behind a tap during a workout.** Two inline models: (a) **full-screen instructor video** (Apple/Peloton/NTC/Centr-trainer), or (b) **a small autoplaying looping clip/GIF per move** with reps + cues around it (**Sweat, Ladder, NTC-whiteboard, Centr-self-guided**). Sweat is the clearest: a looping GIF that **autoplays and loops inline, never tap-gated**. [Sweat — Tom's Guide](https://www.tomsguide.com/wellness/workouts/sweat-app-review-ive-been-using-this-app-for-the-past-decade-and-heres-why-i-think-its-the-best-workout-app-for-women), [Ladder](https://www.outdoorsynomad.com/ladder-fitness-app-review/)

**Coaching apps (Freeletics, Future, Gymshark, Dr. Muscle, Alpha Progression):** coaches put the demo **front-and-centre, near full-screen**; loggers **attach it to each exercise via a clear button/thumbnail**. **Dr. Muscle is the standout logger pattern: it auto-shows a muscle-highlighting animation when the exercise starts, plus a persistent per-exercise Video button.** [Dr. Muscle](https://dr-muscle.com/video/), [Alpha Progression](https://fitnessdrum.com/alpha-progression-app-review/)

**The pattern:** a **default-visible demo on the exercise screen** and a **one-tap, clearly-affording entry point during logging** — never a tiny hidden link.

## 2. UX evidence (why the 12px link is wrong)

- **A 12px text link is "the worst of both worlds: hidden AND no preview."** Progressive disclosure says collapse *secondary* content and give it a **strong descriptive preview** — a thumbnail *is* that preview; a bare label has low information scent. [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [NN/g — Accordions](https://www.nngroup.com/articles/accordions-on-desktop/) **[OPINION/expert]**
- **Tap targets: ≥44pt (Apple HIG) / ≥48dp (Material).** A 12px link is well under both and gets missed; low-contrast/subtle controls "will not stand out when a user scans." [Apple HIG](https://developer.apple.com/design/tips/), [Material/Android a11y](https://support.google.com/accessibility/android/answer/7101858), [NN/g — Low Contrast](https://www.nngroup.com/articles/low-contrast/) **[MEASURED/normative]**
- **Motion is the right medium for a movement demo.** Meta-analysis: animation beats static overall **d=0.37**, and **d=1.06 (large) for procedural-motor learning** — exactly an exercise form demo. [Höffler & Leutner 2007](https://www.sciencedirect.com/science/article/abs/pii/S0959475207001077) **[MEASURED/peer-reviewed]**
- **Default to tap-to-play, not autoplay, during an in-progress task** — won't interrupt set-logging, saves battery/data, and avoids the WCAG 2.2.2 pause obligation. If you autoplay a loop: **muted, `playsinline`, ≤5s (or provide stop), on-screen-only, and disabled under `prefers-reduced-motion`.** [W3C SC 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html), [W3C C39 reduced-motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) **[MEASURED/normative]**

## 3. What makes a demo look premium (format/framing)

- **Clip:** **1.5–4s seamless muted loop, MP4, 720–1080p.** (Our "3–6s" was slightly long.) [cloudfit.tv](https://cloudfit.tv/blog/create-exercise-videos-that-look-like-they-were-filmed-by-a-pro/), [MoveKit](https://movekit.com/blog/best-exercise-animation-libraries-2026)
- **Premium tells:** one consistent model/mannequin library-wide, **clean uncluttered background**, optional **muscle highlight**, and **full body in frame for the whole rep**. **Cheap tells:** low-res GIF banding, mixed models, clutter, and **cropping a landscape clip into portrait** (body clipped). Author to the card ratio (**9:16 or 1:1**), don't crop. [cloudfit.tv](https://cloudfit.tv/blog/create-exercise-videos-that-look-like-they-were-filmed-by-a-pro/), [muscleandmotion](https://www.muscleandmotion.com/how-a-3d-workout-helps-enhance-strength-training/)
- **In-app:** the demo reads as a **hero element at the top** of the exercise/detail card, full-body uncropped — not a tiny thumbnail. [stormotion.io](https://stormotion.io/blog/fitness-app-ux/)
- **Looping UX:** continuous loop **+ a play/pause control + a paused-frame fallback under reduced-motion.** [CSS-Tricks — WCAG on animation](https://css-tricks.com/accessible-web-animation-the-wcag-on-animation-explained/)
- **Note — background colour:** the premium *animation* convention is **light/white** (grey 3D body, red muscle highlight), which runs **counter to Volyume's dark `#0D0D0D`**. The MoveKit sample clips are dark-friendly; this is a deliberate brand call to make, not an assumption.

---

## 4. Recommendation for Volyume

1. **Kill the 12px "How to" link. Put a visible demo on the exercise.** Two-tier, following Dr. Muscle/Sweat:
   - **Inline preview** near the top of the active exercise: a **small looping clip** (the MoveKit MP4, muted, reduced-motion aware → paused poster + play glyph) **or** a poster-frame thumbnail with a play glyph. Tap target ≥48dp. This is the always-visible affordance — impossible to miss.
   - **Tap → the full How-to sheet** (the existing `DemoCard` hero + cues + why-this), which is the bigger, tap-to-play experience. Don't autoplay the full sheet.
2. **Make `DemoCard` a true hero** — full-body framing, no crop, larger than today. Keep the existing play/pause control + reduce-motion fallback (already built).
3. **Format discipline for the clip library:** 1.5–4s seamless muted loops, full body in frame, consistent style. The two MoveKit samples already fit; hold the whole library to this bar.
4. **Decide the background convention deliberately** — dark to match brand (MoveKit samples work) vs the light/red-muscle industry-standard look. Recommend **dark** for brand consistency since the samples already render well on `#0D0D0D`.
5. **Keep it offline + tap-to-play during logging** so it never interrupts a set (WCAG 2.2.2) and stays within offline-first.

## 5. Caveats
- Many official help pages (Hevy, Strong, Fitbod, Peloton, Sweat/Tom's Guide, NN/g) returned **HTTP 403**; claims come from search extracts of those pages + reputable secondaries, cross-checked.
- Exact autoplay-vs-tap and inline-vs-modal behaviour is unconfirmed for several apps (Hevy, JEFIT, Boostcamp, Gymshark) — would need hands-on. Fitbod = tap-to-play and Sweat = autoplay-loop are the confirmed anchors.
- Per-app exercise counts and animation-vs-video come from a review aggregator (directional). The "hero vs thumbnail" size ratio was not given as a pixel/% figure anywhere — the *pattern* (card + per-exercise video, full-body no-crop) is well-supported; an exact size should be A/B-judged in-app.
- Höffler & Leutner (motor d=1.06), Apple HIG 44pt, Material 48dp, and WCAG 2.2.2/C39 are the hard, citable anchors.
