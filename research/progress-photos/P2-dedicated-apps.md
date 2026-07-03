# P2 — Dedicated Body-Progress / Transformation-Photo Apps (Teardown)

**Scope.** Standalone apps whose *entire product* is progress/transformation
photos (or the overlay-camera craft those apps depend on). This is the
category VOLYUME's private progress-photo feature competes against on *craft* —
capture consistency, calm comparison, and privacy. Read alongside
`M1-comparison-ux.md` (comparison-UX craft) — this file is the app-by-app
field teardown of the dedicated players.

**Why this set.** The strongest craft in this category lives in two places:
(a) **overlay/ghost-alignment cameras** (AlignShot, Camera Overlay, Apollo),
which solve the *consistency* problem better than any fitness app; and
(b) **dedicated progress-photo journals** (the two "Progress" apps, Metamorph,
PhotoJourney, PicProgress), which solve *organisation + comparison*. A third
group — **AI physique-scoring apps (GainFrame)** — is included deliberately as
the **canonical AVOID**: it is everything an ED-safe app must never become.

**Evidence tags.** `[OBSERVED]` = behaviour from actual reviews / demo / store
media; `[DOCUMENTED]` = stated on the App Store / Play / vendor site;
`[INFERRED]` = author's design/engineering reasoning. URLs inline; full list at
end.

**Fixed teardown per app (exact headings):** 1 Capture · 2 Auto-dating ·
3 Labelling/metadata · 4 Organisation · 5 Comparison · 6 Consistency aids
(ghost-alignment) · 7 Privacy model · 8 What works vs what doesn't · 9 Retain
vs churn · 10 What users value most · 11 Body-image/ED complaints ·
12 Monetisation · 13 Confidence-tagged verdict.

> **Calm / ED-safe north star (applied throughout).** VOLYUME's constitution
> forbids gamifying the body: no scores, no "transformation" hype, no AI body
> judgement, no daily-streak pressure on photos, on-device by default, and
> comparison is a *private observation tool* first. Clinical sources are clear
> that progress photos are a recognised **body-checking** behaviour and that
> before/after framing *"reduces recovery to what you look like"* and makes the
> brain *"immediately start ranking"* — so every pattern below is judged
> against that risk, not just against polish. `[INFERRED]` +
> (https://firststepsed.co.uk/blog/why-before-and-after-photos-can-be-harmful-in-eating-disorder-recovery/,
> https://equip.health/articles/body-image/what-is-body-checking)

---

## GROUP A — OVERLAY / GHOST-ALIGNMENT CAMERAS (the consistency craft leaders)

These are single-purpose tools that do one thing extremely well: put a
semi-transparent copy of your last shot over the live viewfinder so the new
shot matches. They are the reference implementations for VOLYUME's capture
consistency, even though they are not body-journal apps.

### A1. AlignShot — Overlay Camera  *(best-documented ghost mechanics in the set)*
(https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984)

1. **Capture.** Free base app + Pro IAP. Capture modes include a **timer
   (3s / 10s), visual flash, and haptic feedback**, plus a v2 **video mode**
   that records against the reference overlay. `[DOCUMENTED]`
2. **Auto-dating.** Not surfaced in store copy. `[INFERRED]` gap — it is an
   alignment tool, not a dated journal.
3. **Labelling/metadata.** None beyond the reference image itself; not a
   metadata product. `[DOCUMENTED]` absence.
4. **Organisation.** v2.0 added **"guided tracking projects" with presets for
   fitness, plants, renovations, product shots, stop motion, and recreating a
   previous photo.** So projects exist, but organisation is light. `[DOCUMENTED]`
5. **Comparison.** The overlay *is* the comparison — new vs previous, live.
   No dedicated side-by-side gallery documented. `[DOCUMENTED]`
6. **Consistency aids — GHOST ALIGNMENT (the model to copy).** *"Place any
   photo (from your gallery or the previous shot) as a semi-transparent guide
   over the camera view."* Three controls make it precise: **Full gesture
   control** ("Move, scale, and rotate the ghost image with two fingers to
   match reality exactly"); **adjustable opacity** ("Slide to see more or less
   of the reference — from 5% to 95%"); and framing aids — a **3×3 rule-of-
   thirds grid and a horizon level**. This is the gold-standard spec: overlay +
   opacity slider + two-finger transform + grid + level. `[DOCUMENTED]`
7. **Privacy.** *"All processing is done locally on your device. Your photos
   are never uploaded to external servers."* `[DOCUMENTED]` — matches VOLYUME's
   on-device mandate exactly.
8. **Works vs doesn't.** *Works:* the opacity-range spec (5–95%) and gesture
   transform are the most complete ghost implementation found. *Doesn't:* no
   dating/journal, so it can't stand alone as a progress tracker. `[INFERRED]`
9. **Retain vs churn.** *"Hasn't received enough ratings or reviews to display
   an overview"* — too new to judge retention. `[DOCUMENTED]`
10. **Users value most.** N/A (no review corpus yet). `[DOCUMENTED]` gap.
11. **Body-image/ED.** Neutral by construction — it is a camera, not a body
    judge; no scores or before/after hype. `[INFERRED]`
12. **Monetisation.** Aggressive laddered subs: **Weekly $4.99, Monthly $9.99,
    Annual $29.99, Lifetime $39.99.** A weekly tier on a utility is a churn/
    resentment smell (see Group patterns). `[DOCUMENTED]`
13. **Verdict (HIGH confidence on the ghost mechanics; LOW on retention).**
    Copy the *interaction*: overlay + 5–95% opacity slider + two-finger
    move/scale/rotate + grid + level, all on-device. Ignore the weekly-sub
    business model.

### A2. Camera Overlay  *(cameraoverlay.com — the anti-dark-pattern reference)*
(https://cameraoverlay.com/)

1. **Capture.** Three-step flow: **"Take Your First Photo" → "Overlay It Live"
   → "Shoot & Compare."** Full **manual exposure and zoom controls**.
   `[DOCUMENTED]`
2. **Auto-dating.** Not documented. `[INFERRED]` gap.
3. **Labelling.** None documented; work-file oriented. `[DOCUMENTED]` absence.
4. **Organisation.** "Cloud storage for work files," tablet support, composite
   export — aimed at product/studio shooters as much as fitness. `[DOCUMENTED]`
5. **Comparison.** Live overlay + "compare instantly" after the shot.
   `[DOCUMENTED]`
6. **Consistency aids.** *"Your reference photo appears as a semi-transparent
   image over the live camera. Align it as you want,"* with **adjustable
   opacity**, for *"the exact framing every time."* Same core as AlignShot,
   less granular controls documented. `[DOCUMENTED]`
7. **Privacy.** Headline features: **"No ads. No tracking."** and **"No
   In-App Purchases."** `[DOCUMENTED]` — the cleanest model in the set.
8. **Works vs doesn't.** *Works:* proves a ghost camera can ship with zero
   dark patterns and still exist. *Doesn't:* generic (product photography as
   much as bodies), no dating/journal. `[INFERRED]`
9–10. **Retain / value.** No testimonials on site; can't quantify. `[DOCUMENTED]` gap.
11. **Body-image/ED.** Neutral by construction. `[INFERRED]`
12. **Monetisation.** Explicitly **no IAP** — likely paid-once or free. A
    reference point that not everyone in this space is predatory. `[DOCUMENTED]`
13. **Verdict (MEDIUM).** Useful as an *ethical* proof point (no ads/tracking/
    IAP) and a clean 3-step capture flow VOLYUME can mirror in copy.

### A3. Apollo — Camera Overlay  *(highest-rated free ghost camera found)*
(https://apps.apple.com/us/app/apollo-camera-overlay/id6449167716)

1. **Capture.** Load a gallery photo, position over live feed, timer, multiple
   cameras + wide-angle lens support. `[DOCUMENTED]`
2. **Auto-dating.** "Photo history with grid viewing" implies chronology; not
   explicit date stamps. `[DOCUMENTED]`
3. **Labelling.** None. `[DOCUMENTED]` absence.
4. **Organisation.** Photo history grid. `[DOCUMENTED]`
5. **Comparison.** *"Overlay any photo from your gallery on top of the camera
   image to instantly compare and contrast"*; video from photo sequences.
   `[DOCUMENTED]`
6. **Consistency aids.** **Adjustable transparency**, **flip vertical/
   horizontal**, **rotate**, **selectable aspect ratio**, **hide the interface
   entirely**, alpha-channel/layered overlays, gyroscope-data toggle. The
   "hide interface" + flip options are nice extras VOLYUME could borrow.
   `[DOCUMENTED]`
7. **Privacy.** **"The developer does not collect any data from this app."**
   `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* robust, well-liked, free, private.
   *Doesn't:* general-purpose, not a body journal. `[OBSERVED]`
9. **Retain vs churn.** **4.5★ (13 ratings)** — small but strong. `[OBSERVED]`
10. **Users value most (verbatim).** *"most consistent app I have found for
    solving the problem of overlaying a photo on top of your camera"*
    (colorado889); *"most robust of the ones I was able to find"* (Maxowski);
    *"Great app, just wish it was a default camera option"* (bruh1234321234).
    Signal: users want the ghost camera to be **the default/native camera** —
    friction of app-switching is the top complaint. `[OBSERVED]`
11. **Body-image/ED.** Neutral. `[INFERRED]`
12. **Monetisation.** **Free, no IAP.** `[DOCUMENTED]`
13. **Verdict (MEDIUM-HIGH).** The "wish it was the default camera" quote is
    the load-bearing lesson: **VOLYUME wins by baking the ghost overlay into
    its own capture flow** so the user never leaves the app — the exact gap
    these standalone tools can't close.

---

## GROUP B — DEDICATED PROGRESS-PHOTO JOURNALS

### B1. "Progress — See your progress"  *(the original, id1046634084)*
(https://apps.apple.com/us/app/progress-see-your-progress/id1046634084)

1. **Capture.** In-app daily selfie capture. `[DOCUMENTED]`
2. **Auto-dating.** Photos are dated on capture; scrub thumbnails to move
   through time. `[DOCUMENTED]`
3. **Labelling/metadata.** **Weight** via **HealthKit** (auto import/export) —
   but the weight picker "starts at 0 lb every time" and must be scrolled, a
   long-standing bug. No pose/notes fields documented. `[OBSERVED]`
4. **Organisation.** Thumbnail gallery; **press-and-hold a thumbnail to scrub
   left/right** through the timeline. `[DOCUMENTED]`
5. **Comparison.** Weak spot: exports a **time-lapse video** to share, but
   users *request and the app lacks* a direct first/last side-by-side.
   `[OBSERVED]`
6. **Consistency aids.** Ghost overlay: *"When you take a new photo, you see a
   'ghost' of the previous day's photo, so you can line it up exactly the
   same."* Simple prior-frame ghost, no opacity/gesture controls. `[DOCUMENTED]`
7. **Privacy.** Strong and clearly stated: **"Progress does not have access to
   your camera roll — your pictures never leave your iPhone unless you
   deliberately choose to share them."** HealthKit only. `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* on-device promise, prior-frame ghost.
   *Doesn't:* **can't import from camera roll** (a top-1★ complaint), weight
   picker bug, video export **crashes** ("at 102 days in... it crashes EVERY
   time I try to make the video"). `[OBSERVED]`
9. **Retain vs churn (verbatim).** Churn drivers quoted: *"My weight starts at
   0 lb every time and the scrolling is tedious"* (3★); *"You can't import
   photos from your camera roll... the UI is designed so poorly"* (1★); *"it
   crashes EVERY time I try to make the video"* (1★). Classic: privacy is
   loved, execution bugs churn people out. `[OBSERVED]`
10. **Users value most.** The **no-camera-roll-access privacy stance** and the
    **ghost line-up**. `[OBSERVED]`
11. **Body-image/ED.** Neutral framing ("see your progress"), no scores.
    `[INFERRED]`
12. **Monetisation.** Free (no premium tier documented). `[DOCUMENTED]`
13. **Verdict (HIGH).** Proof that **privacy is a headline users repeat back**,
    and that **reliability of the comparison/export is the retention hinge** —
    ship comparison that never crashes and allows import.

### B2. "Progress — AI Timelapse"  *(progress.camera, id6477857716 — strongest CONSISTENCY craft)*
(https://apps.apple.com/us/app/progress-ai-timelapse/id6477857716)

*(A different app/developer from B1 despite the shared name.)*

1. **Capture.** Weekly photos; **voice-activated shutter** for tripod use;
   4 photos free then subscription. `[DOCUMENTED]`
2. **Auto-dating.** Implied by weekly cadence/time-lapse; not detailed.
   `[INFERRED]`
3. **Labelling.** Not detailed. `[DOCUMENTED]` gap.
4. **Organisation.** Weekly series woven into a time-lapse. `[DOCUMENTED]`
5. **Comparison.** Output is an **AI-generated time-lapse video** of the
   sequence rather than a side-by-side. `[DOCUMENTED]`
6. **Consistency aids — best-in-class.** Three layers: **auto-alignment**
   (*"Progress automatically aligns your photos, and shows you a helpful
   outline of your previous photo as well as a handy level"*); a **consistency
   checker** (*"Progress checks your photos for consistency in lighting, hair,
   pose, and clothing and warns you about any mismatches"*); and **automatic
   background removal** to keep shots clean. The *consistency-warning* idea —
   flagging lighting/pose drift — is the single most transferable premium
   feature in this whole set. `[DOCUMENTED]`
7. **Privacy.** Weaker than peers: collects **Device ID, Product Interaction,
   Crash Data** (*"not linked to your identity"*); photos processing not
   explicitly stated on-device. `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* alignment outline + level + consistency
   warnings + background removal = the most "guided" capture. *Doesn't:*
   analytics collection, subscription gate after 4 photos. `[OBSERVED]`
9. **Retain vs churn.** **3.8★ (13 ratings)** — praised UX, low volume.
   `[OBSERVED]`
10. **Users value most (verbatim).** *"best interface I've seen from any
    progress tracking app"*; *"I love the instructional videos and the overall
    clean format."* Onboarding/education is valued. `[OBSERVED]`
11. **Body-image/ED.** "AI Timelapse" + "transformation" framing leans
    motivational; the AI here is *cosmetic* (alignment/background), **not body
    judgement**, so lower risk than GainFrame — but the transformation-hype
    tone is the part to avoid. `[INFERRED]`
12. **Monetisation.** **Monthly $3.99 / Yearly $24.99**, 4 free photos.
    `[DOCUMENTED]`
13. **Verdict (HIGH on the feature to steal).** **Steal the consistency
    checker** (warn on lighting/pose/clothing drift) and the alignment outline
    + level — reframed calmly ("this shot looks a bit brighter than last time,
    want to retake?"). Drop the analytics and transformation framing.

### B3. Metamorph — Progress / Time-Lapse  *(id6544789120)*
(https://apps.apple.com/us/app/progress-pic-photos-metamorph/id6544789120)

1. **Capture.** *"Take or upload your progress photos with ease"* + **timer**
   for hands-free. `[DOCUMENTED]`
2. **Auto-dating.** Dated series feeding time-lapse. `[DOCUMENTED]`
3. **Labelling.** Not surfaced beyond album/series naming. `[DOCUMENTED]` gap.
4. **Organisation.** Album/series system; long-press to edit/delete a photo;
   playback-speed options. `[DOCUMENTED]`
5. **Comparison.** Broadest comparison toolkit here: **side-by-side**,
   **"Full-Screen Morphs,"** **before/after video**, **time-lapse**, export as
   **GIF or video**. `[DOCUMENTED]`
6. **Consistency aids.** *"Automatic alignment and overlays for consistent
   progress pics"* — overlay ghost + auto-align, controls not detailed.
   `[DOCUMENTED]`
7. **Privacy.** Strong: **"Your photos stay on your device or iCloud — we
   don't store, or even have access to your photos,"** **Face ID unlock** with
   passcode fallback, no data collection. `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* comparison variety + Face ID lock + local/
   iCloud only. *Doesn't:* **removed its free tier**; export watermark unless
   Pro. `[OBSERVED]`
9. **Retain vs churn.** **~4.4★.** Churn driver: *"Previous free tier removed;
   pricing now considered expensive versus competitors like Lapsey."*
   `[OBSERVED]`
10. **Users value most (verbatim).** *"best interface for capturing timelapse
    photos"*; *"amazingly easy to use"* with responsive support. `[OBSERVED]`
11. **Body-image/ED.** "Morph"/before-after/transformation framing is squarely
    the *ranking* dynamic clinicians warn about — the tone VOLYUME must not
    adopt. `[INFERRED]`
12. **Monetisation.** **Weekly $4.99 / Monthly $4.99 / Annual $29.99 /
    Lifetime $129.99**, 7-day trial; Pro removes watermark. `[DOCUMENTED]`
13. **Verdict (HIGH).** Good evidence that **Face ID lock + local/iCloud-only
    is table-stakes** and that **removing a free tier is a named churn cause**.
    The morph/before-after theatrics are the AVOID.

### B4. My Body Tracker: PhotoJourney  *(id6499454966 — richest capture-guidance craft)*
(https://apps.apple.com/us/app/my-body-tracker-photojourney/id6499454966)

1. **Capture.** In-app camera with guides + optional countdown. `[DOCUMENTED]`
2. **Auto-dating.** **Photo date stamps and overlays**; compare-timeline shows
   photo dates. `[DOCUMENTED]`
3. **Labelling/metadata.** **Text notes per photo** (*"medications,
   measurements, mood"*) — free-text, **no structured weight/measurement
   field**. `[DOCUMENTED]`
4. **Organisation.** **"Journeys"** (fitness challenge, 75 Hard, weight loss,
   selfies) with hourly/daily/weekly schedules; multi-select delete/hide.
   `[DOCUMENTED]`
5. **Comparison.** **Side-by-side and swipe comparisons**, **Compare Zoom** to
   highlight a detail, **HD time-lapse + GIF export**, compare-timeline.
   `[DOCUMENTED]`
6. **Consistency aids — best guidance stack.** **Ghost Mode** ("overlay
   previous photos for identical framing") **+ camera guides** (**rule-of-
   thirds grid, selfie lines, body templates**) **+ optional countdown**, plus
   **post-capture crop/rotate/tilt** to fix small misalignment after the fact.
   The **body-template silhouettes** (front/side/back pose outlines) are a
   distinctive, transferable idea. `[DOCUMENTED]`
7. **Privacy.** **"Photos stored on-device and iCloud only; no backend
   servers; complete privacy control."** Caveat: **iCloud backup required for
   persistence** — the source of a serious data-loss complaint (below).
   `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* the guidance stack (ghost + guides +
   templates + post-capture nudge) and comparison variety. *Doesn't:* reliance
   on iCloud settings caused **total data loss** for at least one paying user.
   `[OBSERVED]`
9. **Retain vs churn (verbatim).** **4.4★ (101 ratings).** Praise: *"clean and
   simple to use,"* *"exactly what I needed for objective progress tracking."*
   Churn: *"App DELETED all my PHOTOS & JOURNEYS"* (despite active
   subscription; dev blames iCloud settings) and pricing *"way too much"* for
   *"perceived on-device functionality."* `[OBSERVED]`
10. **Users value most.** **Objective, standardised framing** ("objective
    progress tracking") — the guidance is the draw. `[OBSERVED]`
11. **Body-image/ED.** "75 Hard"/challenge framing + daily/hourly cadence
    nudges toward frequent checking; note the clinical guidance that photos
    should be **every 2–4 weeks, not daily**, to avoid over-analysis of daily
    fluctuation. `[INFERRED]` +
    (https://equip.health/articles/body-image/what-is-body-checking)
12. **Monetisation.** **$7.99/week or $34.99/year**; free tier limited; Pro
    unlocks unlimited journeys/photos/HD export. `[DOCUMENTED]`
13. **Verdict (HIGH).** The **capture-guidance stack is the one to emulate**
    (ghost + grid + body-template silhouettes + countdown + post-capture
    nudge). The **data-loss story is the warning**: VOLYUME's SQLCipher +
    explicit sync must never leave photo persistence to an opaque iCloud
    toggle.

### B5. PicProgress  *(id6760267875)*
(https://apps.apple.com/us/app/picprogress-progress-photos/id6760267875)

1. **Capture.** Progress photos with alignment tools. `[DOCUMENTED]`
2. **Auto-dating.** **Check-in calendar + streaks** imply dated entries.
   `[DOCUMENTED]`
3. **Labelling.** **Weight, BMI, body measurements** tracked alongside photos —
   more structured metadata than PhotoJourney. `[DOCUMENTED]`
4. **Organisation.** **Custom albums** (daily/weekly/monthly), each a "visual
   diary"; calendar + streaks. `[DOCUMENTED]`
5. **Comparison.** **Side-by-side + overlay comparison** within an album.
   `[DOCUMENTED]`
6. **Consistency aids.** "Alignment tools" + overlay comparison; not detailed.
   `[DOCUMENTED]`
7. **Privacy.** **"Secure local storage,"** **"developer does not collect any
   data."** On-device. `[DOCUMENTED]`
8. **Works vs doesn't.** *Works:* structured metrics + calendar. *Doesn't:*
   **streaks + BMI** are ED-risk signals (below); brand-new, unproven.
   `[INFERRED]`
9. **Retain vs churn.** **"Hasn't received enough ratings"** — no data.
   `[DOCUMENTED]`
10. **Users value most.** N/A yet. `[DOCUMENTED]` gap.
11. **Body-image/ED — flagged.** **Streaks on body photos** and a **BMI
    monitor** are exactly the gamification + weight-fixation VOLYUME's
    constitution forbids. Age-rated **18+**. `[INFERRED]`
12. **Monetisation.** **Premium $3.99 / $24.99** IAP. `[DOCUMENTED]`
13. **Verdict (MEDIUM).** Useful as a *what-not-to-do* on **streaks + BMI**;
    the album-as-visual-diary + calendar structure is fine to borrow *minus*
    the streak/score layer.

---

## GROUP C — AI PHYSIQUE-SCORING (the canonical AVOID)

### C1. GainFrame — Gym Progress Photos  *(id6759252082)*
(https://apps.apple.com/us/app/gainframe-gym-progress-photos/id6759252082,
https://gainframe.app/blog/best-progress-photo-apps/)

1. **Capture.** Camera / library import / manual entry; **guided pose
   templates**; multi-angle. `[DOCUMENTED]`
2. **Auto-dating.** Progress timeline; milestone cards at **30/60/90/365 days**.
   `[DOCUMENTED]`
3. **Labelling.** Apple Health + Hevy weight/workout import; pose-based
   timeline. `[DOCUMENTED]`
4. **Organisation.** Timeline grouped by Day/Month/Quarter/Year/All; pose
   timeline. `[DOCUMENTED]`
5. **Comparison.** **"Compare any two check-ins side by side and ask what
   changed,"** with **AI change-detection**, a Coach **"First Read,"** and
   **"Future Physique predictions."** `[DOCUMENTED]`
6. **Consistency aids.** Guided pose templates for standardised framing.
   `[DOCUMENTED]`
7. **Privacy.** On-device processing (SwiftData); AI coach *"grounded in your
   real numbers."* `[DOCUMENTED]`
8. **Works vs doesn't (for OUR purposes).** *Works technically:* the compare +
   guided-pose UX is slick. *Fails ethically:* it turns the body into a scored,
   ranked, predicted object. `[INFERRED]`
9. **Retain vs churn.** High ratings (4.9/5.0 quotes) among engaged users.
   `[OBSERVED]`
10. **Users value most (verbatim).** *"I've had bf% estimated via body clips,
    and GainFrame has yielded very similar numbers"* — users value the
    **body-fat number** most. That is precisely the fixation to avoid.
    `[OBSERVED]`
11. **Body-image/ED — MAXIMUM RISK.** **AI body-fat % estimation**,
    **"physique scoring,"** a **"ranked muscle board" with tier rankings**,
    **"Future Physique" predictions**, and a requirement for **"minimal
    clothing for accurate analysis."** Every one of these is a body-checking
    accelerant: scoring, ranking, prediction, and appearance-maximising. The
    app's own disclaimer (*"approximations... should not be used for diagnosis
    or treatment"*) does not neutralise the daily psychological pull.
    `[DOCUMENTED]` + `[INFERRED]`
12. **Monetisation.** Free + **Pro $5.99/mo, $39.99/yr**; body-fat precision,
    Deep Dive, Future Physique behind paywall. `[DOCUMENTED]`
13. **Verdict (HIGH — this is the AVOID archetype).** GainFrame is the
    strongest *engineering* in the category and the **exact opposite** of
    VOLYUME's brief. Use it only as the negative reference: **no AI body
    judgement, no scores, no rankings, no "future body," no body-fat %, no
    minimal-clothing demand.**

---

## GROUP D — BRIEFLY NOTED (thin data or adjacent)

- **Photo Progress: Before-After** (Android,
  `com.tuanfadbg.trackprogress.beforeafterimage`): tag-based labelling,
  **password-protected "secret" storage**, before/after compare. Notable for
  **bugs**: *"crashes when clicking 'manage tags'"* and *"annoying bugs on some
  Samsung devices."* Lesson: tags + local lock are wanted; QA on Android
  fragmentation matters. `[OBSERVED]`
  (https://play.google.com/store/apps/details?id=com.tuanfadbg.trackprogress.beforeafterimage)
- **Body Tracker — Progress Photos** (Android,
  `com.thumbstonelabs.bodytransformation`): a dedicated body-transformation
  journal; store page did not render enough detail to teardown reliably —
  **data gap, do not over-claim.** `[DOCUMENTED]` gap.
  (https://play.google.com/store/apps/details?id=com.thumbstonelabs.bodytransformation)
- **LocalOne Gym Pics** (iOS): **$1 one-time**, **"no cloud storage, no
  servers, no data collection,"** auto-timestamps. Proof a paid-once,
  offline-only model exists and is marketable on privacy. `[DOCUMENTED]`
  (https://localonelabs.com/pages/blog/best-fitness-progress-photo-apps)
- **Fitstream / BodySpace** (cloud/community journals): require accounts;
  *"privacy is the trade-off."* The cloud-community model is the churn/privacy
  contrast VOLYUME deliberately rejects. `[DOCUMENTED]` (same roundup)
- **"retimer" (id6475566801) — EXCLUDED.** Despite the name it is a
  **circadian light-therapy** companion app, not a body time-lapse tool. Named
  here so future research doesn't chase it. `[DOCUMENTED]`
  (https://apps.apple.com/au/app/retimer/id6475566801)

---

## PATTERNS ACROSS THIS SET

1. **Ghost overlay is the settled solution to consistency — and it has a
   canonical spec.** The best (AlignShot) = **semi-transparent prior/reference
   image + opacity slider (5–95%) + two-finger move/scale/rotate + rule-of-
   thirds grid + horizon level**. PhotoJourney adds **body-template silhouettes
   + countdown + post-capture crop/tilt**. Anything less (a plain prior-frame
   ghost with no controls, as in the original "Progress") reads as basic.
   `[DOCUMENTED]`
2. **The next frontier is the CONSISTENCY CHECKER, not the overlay.**
   "Progress — AI Timelapse" alone flags **lighting / pose / hair / clothing
   drift** and warns before you keep a bad shot. This is the highest-leverage,
   least-copied feature in the category. `[DOCUMENTED]`
3. **Auto-alignment + level + background removal** are becoming premium
   baseline for a "guided" capture feel. `[DOCUMENTED]`
4. **Privacy is a headline users repeat back verbatim.** "Never leaves your
   iPhone," "no camera-roll access," "we don't even have access to your
   photos," "no ads/tracking/IAP" — every well-regarded app leads with it, and
   reviewers echo it. On-device is a *marketing* asset, not just compliance.
   `[OBSERVED]`
5. **The #1 churn cause is losing photos / broken export**, not missing
   features. "Crashes EVERY time I make the video" (Progress) and "App DELETED
   all my PHOTOS & JOURNEYS" (PhotoJourney) are the most damaging reviews in
   the set. Persistence + export reliability > feature count. `[OBSERVED]`
6. **The #2 churn cause is predatory/opaque monetisation** — weekly subs on a
   utility ($4.99–$9.99/wk), removed free tiers, and paywalling access to the
   user's own data all generate resentment reviews. `[OBSERVED]`
7. **The friction users most want removed is app-switching** — "wish it was
   the default camera." A body app with the ghost camera *built in* beats any
   standalone overlay tool. `[OBSERVED]`
8. **The category's default tone is exactly the ED risk clinicians name.**
   "Metamorph"/"morph," before/after, "transformation," physique **scores**,
   **streaks**, **BMI**, **tier rankings**, and daily/hourly cadence all push
   ranking + body-checking. Clinical sources: photos are a recognised
   body-checking behaviour, before/after makes the brain *"immediately start
   ranking,"* and safe cadence is **every 2–4 weeks, not daily.** `[DOCUMENTED]`

---

## STEAL / AVOID — for a calm, ED-safe, on-device app

**STEAL (with calm reframing):**
- **Full ghost-overlay spec at capture, in-app:** prior photo at adjustable
  opacity (default ~40–50%), two-finger move/scale/rotate, rule-of-thirds
  grid, and a level. Baked into VOLYUME's own camera so users never switch
  apps. (AlignShot / PhotoJourney) `[DOCUMENTED]`
- **Body-template silhouettes** (front/side/back pose outlines) + optional
  **countdown timer** + **voice/hands-free shutter** for tripod use.
  (PhotoJourney / Progress-AI) `[DOCUMENTED]`
- **Consistency checker, calmly worded.** Detect lighting/pose/framing drift
  and offer — never nag — a retake: *"This one looks a little brighter than
  last time. Retake, or keep it?"* Neutral, optional, dismissible.
  (Progress — AI Timelapse) `[DOCUMENTED]`
- **Post-capture micro-adjust** (crop/rotate/tilt) so a near-miss is
  salvageable without a reshoot. (PhotoJourney) `[DOCUMENTED]`
- **On-device / private as a stated headline** — VOLYUME already exceeds these
  apps (SQLCipher) and should say so plainly. Add an **app-level lock (Face ID
  / biometric)** for the photo area. (Metamorph) `[DOCUMENTED]`
- **Rock-solid persistence + export.** Never depend on an opaque iCloud toggle;
  make "your photos are safe" literally true and never lose a shot.
  (anti-PhotoJourney/Progress lesson) `[OBSERVED]`
- **Calm neutral labels:** a *date* or "earlier / later," album-as-quiet-diary,
  gentle reminders. (PicProgress albums, minus streaks) `[INFERRED]`

**AVOID (hard lines from the constitution + clinical sources):**
- **No AI body judgement of any kind** — no body-fat %, no physique score, no
  muscle tier board, no "Future Physique" prediction. (GainFrame is the entire
  anti-pattern.) `[DOCUMENTED]`
- **No streaks, points, or gamification on body photos.** (PicProgress)
  `[INFERRED]`
- **No before/after or "transformation/morph" theatrics** — the framing that
  makes the brain rank bodies. (Metamorph, Progress-AI tone) `[DOCUMENTED]`
- **No BMI/scoring surfaced on the photo.** `[INFERRED]`
- **No daily/hourly cadence pressure** — nudge toward a calmer 2–4 week rhythm;
  never push a "don't break the streak" prompt. (anti-PhotoJourney/75-Hard;
  clinical 2–4 week guidance) `[DOCUMENTED]`
- **No weight/measurement burned into a shareable image** (existing share-card
  rule) and no auto "transformation" video hype. `[INFERRED]`
- **No weekly subs / no paywalling the user's own photos** — resentment
  drivers, and gating a *free-tier* progress-photo capability would in any case
  breach VOLYUME's free/pro line. `[OBSERVED]`
- **No cloud-community / public-profile model** (Fitstream/BodySpace) — clashes
  with EU-Dublin residency + on-device truth. `[DOCUMENTED]`

**Net:** VOLYUME can out-craft the whole category on *consistency capture*
(ghost + templates + consistency-checker, built in, on-device) and on *trust*
(never lose a photo, everything private), while pointedly refusing the two
things the market leans on hardest — **AI body-scoring** and **transformation
theatrics** — which are precisely the ED-unsafe parts. The strongest positive
references are **AlignShot** (ghost mechanics), **PhotoJourney** (capture
guidance) and **Progress — AI Timelapse** (consistency checker); the defining
negative reference is **GainFrame**. `[INFERRED]`

---

## SOURCES

**Apps — App Store / Play / vendor:**
- AlignShot — Overlay Camera — https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984
- Camera Overlay — https://cameraoverlay.com/
- Apollo — Camera Overlay — https://apps.apple.com/us/app/apollo-camera-overlay/id6449167716
- Progress — See your progress — https://apps.apple.com/us/app/progress-see-your-progress/id1046634084
- Progress — AI Timelapse (progress.camera) — https://apps.apple.com/us/app/progress-ai-timelapse/id6477857716
- Metamorph — Progress / Time-Lapse — https://apps.apple.com/us/app/progress-pic-photos-metamorph/id6544789120
- My Body Tracker: PhotoJourney — https://apps.apple.com/us/app/my-body-tracker-photojourney/id6499454966
- PicProgress: Progress Photos — https://apps.apple.com/us/app/picprogress-progress-photos/id6760267875
- GainFrame: Gym Progress Photos — https://apps.apple.com/us/app/gainframe-gym-progress-photos/id6759252082
- Photo Progress: Before-After (Android) — https://play.google.com/store/apps/details?id=com.tuanfadbg.trackprogress.beforeafterimage
- Body Tracker — Progress Photos (Android) — https://play.google.com/store/apps/details?id=com.thumbstonelabs.bodytransformation
- retimer (EXCLUDED — light-therapy app) — https://apps.apple.com/au/app/retimer/id6475566801

**Roundups / comparisons:**
- GainFrame — Best Progress Photo Apps for 2026 — https://gainframe.app/blog/best-progress-photo-apps/
- LocalOneLabs — 5 Best Progress Photo Apps for iPhone (2026) — https://localonelabs.com/pages/blog/best-fitness-progress-photo-apps
- FitBudd — Why Progress Photos Matter — https://www.fitbudd.com/academy/why-progress-photos-matter-in-fitness-and-the-best-apps-to-track-them

**Body-image / ED clinical context:**
- First Steps ED — Why Before-and-After Photos Can Be Harmful — https://firststepsed.co.uk/blog/why-before-and-after-photos-can-be-harmful-in-eating-disorder-recovery/
- Equip — What Is Body Checking? — https://equip.health/articles/body-image/what-is-body-checking
- Love Your Bod — Before/After Photos Can Become an Unhealthy Obsession — https://loveyourbod.fitness/before-and-after/
- HuffPost — Body Checking: When It Becomes Dangerous — https://www.huffpost.com/entry/body-checking-dangers_l_687aa965e4b06b3f48ab181c
- National Alliance for Eating Disorders — Body Dysmorphia and Eating Disorders — https://www.allianceforeatingdisorders.com/body-dysmorphia-and-eating-disorders-what-you-need-to-know/
