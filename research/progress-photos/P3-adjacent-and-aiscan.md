# P3 — Progress-Photo Teardown: Adjacent Training Apps + AI Physique-Scan Apps

Research for VOLYUME (calm, premium, ED-safe, on-device physique app).
Compiled 2026-07-03. Evidence-led. No app code touched; this file is the sole deliverable.

**Reading key.** Each app uses a FIXED 13-heading teardown. Every claim is tagged:
- `[OBSERVED]` — seen first-hand in-app (NOTE: no live device access in this session; used sparingly / not at all — most claims are DOCUMENTED or INFERRED).
- `[DOCUMENTED]` — stated in official docs, help centres, store listings, or the vendor's own marketing/blog.
- `[INFERRED]` — reasoned from adjacent evidence; lower confidence, flagged as such.

**Why AI-scan apps are here.** VOLYUME forbids AI in coaching and is strict on ED-safety. AI physique-scan apps (GainFrame, Bodygram, trackBod, ZOZOFIT, etc.) are studied as **anti-pattern reference** — specifically the two things VOLYUME must never do: (a) upload body photos to a server for analysis, and (b) hand the user an AI-generated body-fat% / physique rating from a photo (a documented number-chasing and body-anxiety risk).

---

## CATEGORY A — ADJACENT TRAINING APPS (photo features)

---

## 1. Hevy

*Primary sources: hevyapp.com/features/progress-photos, help.hevyapp.com body-composition articles.*

**1. Capture.** [DOCUMENTED] "Take a photo or upload an existing one from your library." Guidance: front, side and back; camera on "a desk, chair, or stand, ideally at torso level; no selfies." One progress photo per day per entry.

**2. Auto-dating + how it shows.** [DOCUMENTED] Each photo "is displayed along with the date you uploaded it." Entry defaults to today; a different date can be chosen when creating an entry.

**3. Labelling/metadata.** [DOCUMENTED] A photo is part of a measurement *entry* — you may attach body weight, body fat, and up to 14 circumference measurements (waist, neck, shoulders, chest, biceps, forearms, abdomen, hips, thighs, calves), or leave other fields empty. Free tier caps to weight + waist; the rest is Pro.

**4. Organisation.** [DOCUMENTED] Profile → Measures holds all measurements and photos; a "See All" opens the photo library. Per-photo options: compare, edit the parent entry, replace, delete.

**5. COMPARISON (precise interaction).** [DOCUMENTED] Tap a photo → option to "position it side-by-side with another photo in your library." Two-up side-by-side; no slider/overlay documented.

**6. Consistency aids.** [DOCUMENTED] Written guidance only (front/side/back, torso-level stand, no selfies). No documented pose-ghost/overlay guide at capture time.

**7. Privacy model.** [DOCUMENTED] Photos are **private even if the profile is public**: "Even if your profile is public, progress photos are private." Only images/videos explicitly attached to a *workout* before saving are visible to others. Storage is Hevy's cloud (account-based sync across devices) — so photos leave the device to Hevy's servers, but are **not** sent for any AI analysis. This is a normal cloud-backup posture, categorically different from the AI-scan uploads flagged below.

**8. WHAT WORKS vs WHAT DOESN'T.** Works: clean coupling of photo + measurements in one dated entry; private-by-default; simple side-by-side. Doesn't: one-photo-per-day limit is arbitrary; no overlay/alignment aid; comparison is manual pick-two.

**9. RETAIN vs CHURN.** [INFERRED] Hevy's retention story is its workout log, not photos; photos are a "nice extra." Could not surface clean first-party review quotes tying retention to the photo feature specifically (Reddit search returned no usable links).

**10. WHAT USERS VALUE MOST.** [INFERRED] Private-by-default and the fact that photos sit beside real measurement trends rather than in a separate silo.

**11. Body-image/ED complaints.** [INFERRED] Low risk relative to scan apps: Hevy shows *your* photo and *your* numbers, no AI rating, no verdict. The residual risk is the generic "quantification fixation" risk shared by all measurement trackers (see Category C evidence).

**12. Monetisation.** [DOCUMENTED] Freemium. Full body-fat + all 14 circumferences behind Hevy Pro; photos themselves available on free.

**13. Confidence-tagged verdict.** MODERATE-HIGH confidence. Best-in-class *conventional* photo teardown among the training apps: dated entry, private default, photo bundled with measurements, simple side-by-side. Cloud-backed (not on-device) and no capture-alignment aid are the gaps VOLYUME can beat.

---

## 2. JEFIT

*Primary sources: support.jefit.com PROGRESS PICTURES section; jefit.com blog.*

**1. Capture.** [DOCUMENTED] Upload progress pictures via the My-JEFIT profile; part of a broader "track body measurements, body-fat %, and progress pictures" suite.

**2. Auto-dating.** [INFERRED] Pictures are timelined as before/after history; explicit auto-date UI not documented in detail.

**3. Labelling/metadata.** [DOCUMENTED] Each image can carry an editable **description**; images can be set as an **album cover**.

**4. Organisation.** [DOCUMENTED] **Albums** — pictures can be moved between albums; an Edit Pictures page lists all photos for description edits, album moves, and cover selection. This is the richest folder/album model of the training apps.

**5. COMPARISON.** [DOCUMENTED] Framed as "before" vs "after" — you look back across the album to see change. No documented side-by-side/slider widget; comparison is by browsing the album.

**6. Consistency aids.** [INFERRED] None documented at capture.

**7. Privacy model.** [DOCUMENTED] **Cloud + optional social sharing.** "Keep your pictures to yourself or share them with others in a supportive community." Public profile photo pages exist (jefit.com/photo/...). So photos live on JEFIT's servers and can be *published to a community* — a materially more exposed posture than Hevy. No AI analysis of the photos.

**8. WHAT WORKS vs WHAT DOESN'T.** Works: albums + editable descriptions + covers = genuine organisation. Doesn't: community-sharing pushes photos toward a comparison/leaderboard dynamic; dated/legacy web-profile UX; no capture aid.

**9. RETAIN vs CHURN.** [INFERRED] Community/"transformation" framing is JEFIT's retention hook and also its ED risk. Success-story marketing ("body transformation to the next level") leans into comparison.

**10. WHAT USERS VALUE MOST.** [DOCUMENTED/INFERRED] Album organisation and the community inspiration angle ("your pictures may inspire others").

**11. Body-image/ED complaints.** [INFERRED — elevated] The **social/community sharing of physique photos** is the concrete risk: it invites peer comparison, the "twisted comparison game" documented for fitness apps generally (Vice). VOLYUME must NOT ship social sharing of body photos.

**12. Monetisation.** [DOCUMENTED] Freemium (JEFIT Elite); photo tracking present on free.

**13. Confidence-tagged verdict.** MODERATE confidence. Steal the **album + description + cover** organisation model; hard-AVOID the community-sharing of body photos.

---

## 3. Strong

*Primary sources: strong.app; help.strongapp.io/article/238-add-measurements.*

**1. Capture.** [DOCUMENTED] Progress pictures are added as **attachments to a workout** ("add notes and progress pictures to your workouts"), rather than to a standalone photo timeline. Separate Measurements module tracks body metrics.

**2. Auto-dating.** [INFERRED] Photo inherits the workout's date/time. No dedicated photo-date UI documented.

**3. Labelling/metadata.** [DOCUMENTED] Notes attach alongside the picture on the workout; Measurements (weight, body-fat %, body parts) tracked separately with quick "+" add.

**4. Organisation.** [INFERRED] Photos are scattered across workout entries, not a gallery — weakest organisation of the set.

**5. COMPARISON.** [INFERRED] No dedicated photo-comparison widget documented; comparison is browsing workout history.

**6. Consistency aids.** [INFERRED] None documented.

**7. Privacy model.** [DOCUMENTED/INFERRED] Cloud account with Apple Health / Google Fit integration recommended; photos sync to Strong's cloud. No AI analysis. Photo-visibility controls less clearly documented than Hevy's private-by-default.

**8. WHAT WORKS vs WHAT DOESN'T.** Works: zero-friction — snap during the workout you're already logging. Doesn't: no gallery, no comparison, photos buried in workout notes.

**9. RETAIN vs CHURN.** [INFERRED] Photos are incidental to Strong; the log is the product. Not a retention driver.

**10. WHAT USERS VALUE MOST.** [INFERRED] Simplicity of the logger; photos are an afterthought.

**11. Body-image/ED complaints.** [INFERRED] Low — no rating, no social, no verdict.

**12. Monetisation.** [DOCUMENTED] Strong PRO unlocks body-fat %, 1RM, richer progress visualisation; basic measurements/photos-in-notes on free.

**13. Confidence-tagged verdict.** MODERATE confidence. Instructive as the *minimum viable* photo feature — and as a cautionary example that photos-buried-in-notes is not a real photo feature. VOLYUME wants the opposite: a first-class, organised, aligned photo timeline.

---

## 4. Caliber

*Primary sources: apps.apple.com Caliber listing; garagegymreviews.com, barbend.com reviews; caliberstrong.freshdesk.com user guide.*

**1. Capture.** [DOCUMENTED] Onboarding asks you to "take pictures of yourself from various angles and upload them to the app for your trainer to see." Ongoing uploads as part of check-ins.

**2. Auto-dating.** [INFERRED] Photos timestamped into a gallery tied to check-in cadence.

**3. Labelling/metadata.** [INFERRED] Photos sit within the coaching/check-in record alongside logged workouts and activity.

**4. Organisation.** [DOCUMENTED] A **Progress Photo Gallery** (recently revamped: new UI/UX, dark-mode, higher photo resolution).

**5. COMPARISON.** [DOCUMENTED] "Ability to create progress photo **comparisons** with sharing support" — i.e., a built-in before/after comparison you can export/share.

**6. Consistency aids.** [DOCUMENTED] Angle guidance from the coach ("various angles"); human coach enforces consistency rather than an in-app overlay.

**7. Privacy model.** [DOCUMENTED — FLAG-ADJACENT] Cloud, and photos are **shared with a human coach** by design ("for your trainer to see and help chart your progress"). Plus comparison **sharing** support. Not AI, but body photos deliberately leave the user's sole control to a third party. VOLYUME (no coaches, on-device) must NOT replicate this exposure.

**8. WHAT WORKS vs WHAT DOESN'T.** Works: polished gallery + built-in comparison export; coach accountability. Doesn't: photos exposed to a coach and to sharing; premium-priced; overkill for a solo user.

**9. RETAIN vs CHURN.** [INFERRED] Retention is the human coach relationship (weekly check-ins, coach videos), not the photo tech per se. Churn when the coaching value/price stops landing.

**10. WHAT USERS VALUE MOST.** [DOCUMENTED] The coach's weekly review and the visible-progress narrative the photos feed.

**11. Body-image/ED complaints.** [INFERRED] Coach-mediated framing can be protective (a human contextualises change) OR harmful (external appraisal of your body). The **sharing** feature is the ED-adjacent risk.

**12. Monetisation.** [DOCUMENTED] Premium human-coaching subscription (high price point); the app is a delivery shell for coaching.

**13. Confidence-tagged verdict.** MODERATE confidence. Steal the **gallery UI polish + first-class comparison view**; AVOID both the coach-exposure and the share-out of body photos.

---

## 5. Boostcamp

*Primary sources: boostcamp.app/features, /workout-tracker, /pro; barbend.com review. Third-party claim conflicts — see below.*

**1–6. Photo feature.** [DOCUMENTED — NEGATIVE FINDING] Boostcamp's own features/pro pages describe programs, set/rep/weight logging, PRs, e1RM curves, and a **muscle body-map heatmap** (front/back diagrams that light up by weekly volume, with 7/30/90-day and yearly views). They do **not** document a progress-*photo* capture/gallery/comparison feature. One third-party SEO review (healthynexercise.com) claimed Boostcamp "stores progress photos with dates," but this is **not corroborated** by Boostcamp's own materials — treat as likely inaccurate. [INFERRED] Boostcamp is a *strength-programming/analytics* app, not a photo tracker.

**7. Privacy model.** [DOCUMENTED] Cloud account; standard privacy policy. No body-photo pipeline identified, so no photo-privacy concern.

**8. WHAT WORKS.** The **muscle-volume body map** is a smart *non-photo* way to visualise "what's being trained" without inviting appearance-comparison — a body-image-safer visualisation pattern worth noting for VOLYUME.

**11. Body-image/ED.** [INFERRED] Low, precisely because it visualises *training volume per muscle*, not *how you look*.

**13. Confidence-tagged verdict.** MODERATE confidence in the negative finding. Boostcamp is mainly a counter-example (a serious training app that chose NOT to build photos) and a source of one transferable idea: volume/effort heatmaps as an appearance-neutral progress signal.

---

## 6. Fitbod

*Primary sources: help.fitbod.me feature overview; fitbod.me/blog/how-to-take-progress-photos.*

**1–6. Photo feature.** [DOCUMENTED — NEGATIVE FINDING] Fitbod has **no dedicated in-app progress-photo feature**. It offers a Body Composition tracker (weight, body-fat %, measurements with week/month/6-month/year drill-down) and a strength-score/benchmark-lifts Results screen. Fitbod's blog *teaches* how to take progress photos but points users to the camera roll / other tools, not an in-app gallery.

**7. Privacy.** [DOCUMENTED] Cloud account; body-composition metrics only, no photo pipeline.

**8/11. Notes.** Instructive that a data-driven app deliberately keeps physique *appearance* out of the app and stays on *performance/strength* metrics — a body-image-safer product stance.

**13. Confidence-tagged verdict.** MODERATE-HIGH confidence in the negative finding. Counter-example: leans on **strength progress** (what you can do) over **appearance** (how you look) — aligned with VOLYUME's ethos even though VOLYUME *does* build photos.

---

## 7. Dr. Muscle

*Primary sources: Play/App Store listings; dr-muscle.com.*

**1–6. Photo feature.** [DOCUMENTED — NEGATIVE FINDING] No dedicated progress-photo feature surfaced. Dr. Muscle is an auto-regulating "AI trainer" focused on workout history, charts, RIR, and progression math. Progress tracking is numeric/performance, not photographic.

**7. Privacy.** [INFERRED] Cloud account for the adaptive programming; no photo pipeline identified.

**11. Body-image/ED note.** [INFERRED] The app's "AI" is programming auto-regulation, not physique appraisal — so it does not carry the photo-rating risk. (VOLYUME's stance differs: it forbids AI in *coaching*; Dr. Muscle markets AI in coaching, which VOLYUME rejects for determinism/ED-safety reasons — relevant as an ethos contrast, not a photo pattern.)

**13. Confidence-tagged verdict.** MODERATE confidence in the negative finding. Not a photo reference. Included for completeness of the requested set.

---

## CATEGORY B — AI PHYSIQUE-SCAN APPS (studied as ANTI-PATTERN)

> These are the reference set for **what VOLYUME must refuse**: server-side analysis of body photos and/or an AI-generated body-fat% / physique *rating* handed back to the user.

---

## 8. GainFrame  ⚠️ PRIMARY ANTI-PATTERN

*Primary sources: gainframe.app, /blog/body-fat-from-photo-app, /blog/best-ai-body-fat-apps; App Store listing id6759252082.*

**1. Capture.** [DOCUMENTED] Guided front/side/back poses with consistent framing; plus "Smart Import" that auto-classifies old gym selfies from the camera roll.

**2. Auto-dating + trends.** [DOCUMENTED] Builds a timeline of body-fat and physique-score trends across every uploaded photo; "throwback" comparisons against older images; "muscle momentum" over time.

**3. Labelling/metadata.** [DOCUMENTED] Every photo gets a "Deep Dive": estimated **body-fat %**, BMI, **FFMI**, lean mass, a composite **physique score (0–100)**, and **individual ratings for 12 muscle groups**.

**4. Organisation.** [DOCUMENTED] Check-in based; on-device library via SwiftData; no account.

**5. COMPARISON.** [DOCUMENTED] Two photos side-by-side, and it **quantifies the delta**: body-fat delta, FFMI delta, which muscle groups improved and which "didn't."

**6. Consistency aids.** [DOCUMENTED] Guided poses / consistent framing at capture; Smart Import to backfill.

**7. Privacy model.** [DOCUMENTED — RED FLAG, THE EXACT THING VOLYUME MUST NEVER DO] GainFrame markets itself as private/on-device: "all photos and data are stored on-device via SwiftData, no account required… no cloud sync." **BUT**: "Photos are **sent to Google's Gemini API for AI analysis** but are never persisted on any server." So **body photos ARE transmitted off-device to a third-party cloud AI** on every check-in. The "on-device" storage claim masks a per-analysis **cloud upload of the user's body photo to Google**. "Not persisted" is a retention promise, not a no-upload promise — the image still leaves the phone. **This is precisely the pattern VOLYUME must refuse: no body photo leaves the device for analysis, ever.**

**8. WHAT WORKS vs WHAT DOESN'T.** Works (as UX craft): clean guided capture, quantified deltas, trend timeline, Smart Import. Doesn't (as ethos): the entire value prop is an **AI verdict on your body** (score + body-fat% + per-muscle ratings) delivered by a **cloud model** — number-chasing by design, and a privacy exposure dressed up as "on-device."

**9. RETAIN vs CHURN.** [DOCUMENTED/INFERRED] Retention hook is the recurring "score went up/down" dopamine loop. Positive review quote: *"GainFrame has yielded very similar numbers to those [body-clip estimates]… I truly feel like it's accurate enough… super clean and intuitive."* (App Store). Churn risk is inherent to rating loops: a flat or falling score demotivates.

**10. WHAT USERS VALUE MOST.** [DOCUMENTED] Perceived **accuracy vs DEXA** (marketed: within 0.4pp of a DEXA in one test; cites npj Digital Medicine 0.98 CCC across 1,273 adults) and the single-number physique score.

**11. Body-image/ED complaints.** [INFERRED — HIGH RISK, structural] Even absent a specific quoted complaint, GainFrame is the *textbook* number-chasing risk: it converts appearance into a **0–100 score**, a **body-fat %**, and **12 per-muscle ratings**, then re-scores on every photo. Its own copy admits ±4–5% single-photo error vs DEXA — so users chase a **noisy** number, where normal day-to-day variance reads as "progress" or "failure." This is exactly the "fixation on numbers / extreme negative emotions" dynamic the ED literature documents (Category C). A per-muscle *rating* additionally invites part-by-part self-scrutiny (body-checking).

**12. Monetisation.** [DOCUMENTED] Free base tier; Pro subscription unlocks the full Deep Dive (FFMI, 12-area muscle map, full comparisons). Free-to-hooked-then-paywall-the-verdict.

**13. Confidence-tagged verdict.** HIGH confidence this is VOLYUME's central anti-pattern. Borrow *nothing* from its scoring/rating model or its "sends photos to Gemini" architecture. The only transferable craft is neutral: guided-pose capture and quantified *self-measured* deltas — and even those must be handled without a verdict.

---

## 9. Bodygram  ⚠️ CLOUD-UPLOAD ANTI-PATTERN

*Primary sources: bodygram.com/en/platform, App Store listing id1514709034, /policies/privacy-app.*

**1. Capture.** [DOCUMENTED] **Two clothed photos** (front + side), no undressing; iOS TrueDepth 3D-scans the waist on FaceID devices.

**2–4. Outputs/organisation.** [DOCUMENTED] AI estimates body-fat, muscle mass, waist size, posture, and detailed circumferences; account-based history.

**5. COMPARISON.** [INFERRED] Metric trends over time; not the focus of docs.

**7. Privacy model.** [DOCUMENTED — RED FLAG] Collects "**image data of the whole body** taken using a smartphone" **together with name + email**, uploaded to Bodygram's servers for AI processing (a platform/SDK product for third-party brands). Deletion of images is only possible by deleting the whole account. Uses Google Analytics/Firebase. The current policy even notes the consumer app "is currently not actively provided." Net: **body images + PII to a cloud server for AI body-composition** — the anti-pattern, with added PII linkage VOLYUME's GDPR/Article-9 posture forbids.

**8/11. Notes.** [INFERRED] "Clothed, two photos, in minutes" lowers friction and is marketed as less exposing, but it still ships your body image to a server tied to your identity. Same body-composition-number output → same number-chasing surface.

**12. Monetisation.** [DOCUMENTED] Primarily **B2B/SDK** (powers other brands' apps) plus a consumer app; body-metric data is the product.

**13. Confidence-tagged verdict.** HIGH confidence anti-pattern for privacy (cloud + PII-linked body images). Nothing to steal for an on-device, GDPR-strict app.

---

## 10. trackBod, ZOZOFIT, Snaptrack, Spren (scan-app field notes)

Grouped; lighter teardown — they round out the AI-scan / photo-tracker landscape.

**trackBod — AI Body Scan** [DOCUMENTED]. Onboarding questionnaire, then "snap front and side photos → get body-composition analysis (subscription)." Same pattern as GainFrame/Bodygram: **photo → AI body-composition output**, subscription-gated. Privacy specifics not published in detail → assume cloud analysis. ⚠️ anti-pattern.

**ZOZOFIT — 3D Body Scanner** [DOCUMENTED]. Camera + a **dot-marker spandex ZOZOSUIT** (15,000+ fiducial markers) builds a 3D body model; tracks circumferences across 12 zones; outputs body-fat %, BMI; exports OBJ. Cloud/account-based. Not photo-appearance rating but still **server-side body-composition numbers**; heavy hardware friction. ⚠️ cloud anti-pattern (measurement flavour).

**Snaptrack (Selfie body-change tracker)** [DOCUMENTED — the RARE GOOD PRIVACY MODEL]. "Originally conceived to keep track of weight-loss using photos… save them securely so **only you can see them**." Multiple photos/day at different angles; **PIN or Touch ID lock**; body-position **camera overlay** (IAP) as a consistency aid; manual measurement fields (incl. body-fat % you enter). **No AI rating; local/private-first.** ✅ Closest in ethos to VOLYUME among the scan-adjacent apps: private, locked, overlay-assisted, self-entered numbers, no verdict.

**Spren** [DOCUMENTED, via GainFrame's comparison blog]. Photo-based body-composition estimates (competitor to GainFrame). ⚠️ same photo→AI-number anti-pattern.

**Confidence-tagged verdict.** Snaptrack = ✅ pattern to emulate (private, locked, overlay, no rating). trackBod/ZOZOFIT/Spren/Bodygram/GainFrame = ⚠️ all convert a body image into a server-side number/rating.

---

## CATEGORY C — ED / BODY-IMAGE EVIDENCE BASE (why the anti-patterns are dangerous)

Independent, peer-reviewed / journalistic evidence that the AI-rating and quantification patterns above carry real harm. VOLYUME's ED-safety mandate is *externally* supported by this.

- **BJPsych Open (2021), "Effects of diet and fitness apps on eating-disorder behaviours" (PMC8485346).** Qualitative study: apps "trigger and exacerbate symptoms by focusing heavily on **quantification**, promoting overuse and certain feedback." Eight negative themes incl. **fixation on numbers, obsession, app dependency, extreme negative emotions, excess competition**. Colour-coded progress feedback (green/red) drove reward vs guilt/shame.
- **Calorie-counting cohort (cited in the same literature):** **73.1%** of users with EDs identified the app as a **contributor** to their disorder.
- **Duke Psychiatry, "The Trouble with Tracking."** Obsession with numbers → guilt/shame when metrics miss target; reinforces "body is only valuable if it meets certain metrics."
- **Vice, "A Twisted Comparison Game: How Fitness Apps Exacerbate Eating Disorders."** Social/comparison mechanics in fitness apps as an active harm vector → supports NO social sharing / leaderboards of body photos.
- **CU Anschutz, "Dangers around AI and Body Image."** AI trained on data "steeped in fatphobia, weight stigma" can perpetuate harmful appraisals and "miss the mark on empathy"; BDD sufferers seeking AI validation worsens the loop → supports **no AI appraisal of the body**.
- **Oreate AI (industry) on AI body-fat estimators:** reliance on the metric "may lead to **obsession over numbers** rather than… well-being" and fuels "comparison traps."

Directly implicates: GainFrame's 0–100 score + 12 per-muscle ratings; any noisy AI body-fat% (±4–5% single-photo) read as success/failure; JEFIT-style community sharing; Caliber-style share-out.

---

## PATTERNS (across all apps)

1. **Two archetypes.** (a) *Conventional photo trackers* (Hevy, JEFIT, Strong, Caliber): user's own photo, user's own numbers, comparison = look-back. (b) *AI-scan apps* (GainFrame, Bodygram, trackBod, ZOZOFIT, Spren): photo → **machine verdict** (body-fat%, score, ratings). VOLYUME belongs firmly in a *third* category it should define: on-device, private, appearance-neutral, **no verdict**.
2. **Photo + measurement bundling wins.** The best conventional UX (Hevy) puts the photo *inside* a dated entry with weight/measurements. Photos-in-workout-notes (Strong) is the weakest.
3. **Organisation ladder.** JEFIT (albums + descriptions + covers) > Caliber (polished gallery) > Hevy (dated library + See All) > Strong (scattered in notes).
4. **Comparison is universally shallow** in conventional apps (manual pick-two side-by-side). AI apps add quantified deltas — desirable UX, but they attach the delta to a *verdict number*. VOLYUME can offer a great comparison view **without** a verdict.
5. **Consistency aids are largely absent** (only Snaptrack's overlay + GainFrame's guided poses). A capture-time **pose/alignment overlay** is an under-served, ED-safe differentiator.
6. **Privacy splits three ways.** Local-only/locked (Snaptrack ✅) — cloud-backup, private-by-default (Hevy) — cloud + AI upload and/or human/community exposure (GainFrame, Bodygram, JEFIT-social, Caliber ⚠️). "On-device storage" is NOT the same as "photo never leaves device": GainFrame stores locally yet uploads each photo to Gemini.
7. **Monetisation** everywhere is freemium; AI apps paywall *the verdict* (the Deep Dive), which is also the harm.
8. **Appearance-neutral progress signals exist** (Boostcamp muscle-volume heatmap; Fitbod strength score) — evidence that "progress" can be shown without rating the body.

---

## STEAL / AVOID (for VOLYUME)

### STEAL (adapt to on-device, ED-safe form)
- **Dated photo bundled with self-entered measurements in one entry** (Hevy) — one calm timeline, not two silos.
- **Album/organisation with editable notes + a chosen "cover"/hero shot** (JEFIT) — organisation *without* community.
- **A polished, first-class comparison view** (Caliber gallery craft) — side-by-side of the user's *own* photos, framed neutrally ("then / now"), never a scored delta.
- **Capture-time pose/alignment overlay + guided front/side/back framing** (Snaptrack overlay; GainFrame guided poses) — the biggest under-served consistency win; purely mechanical, no appraisal.
- **Local-only + biometric/PIN lock, private by default** (Snaptrack) — the ethos VOLYUME should exceed: photos never leave the device, encrypted at rest (aligns with VOLYUME's SQLCipher/secure-store model).
- **Appearance-neutral progress signals** (Boostcamp volume heatmap; Fitbod strength score) — offer "what you trained / what you can now do" alongside photos, to de-centre appearance.

### AVOID (hard refusals — these violate VOLYUME's constitution)
- **⛔ Uploading body photos to any server for AI analysis** — the GainFrame→Gemini, Bodygram, trackBod, ZOZOFIT, Spren pattern. On-device only, no exceptions. "Not persisted on a server" is NOT good enough; the photo must never leave the phone. (Constitution: EU-Dublin residency, no PII to external services, on-device SQLCipher truth.)
- **⛔ Any AI-generated body-fat %, physique score, or per-muscle rating from a photo** — GainFrame's 0–100 score + 12 muscle ratings. Direct number-chasing / body-checking harm (Category C). VOLYUME forbids AI in coaching *and* this would be an ED-safety violation regardless of AI.
- **⛔ Handing users a noisy body-fat% as if precise** — even self-entered/estimated body-fat should be handled with restraint; a photo-derived one is out.
- **⛔ Social/community sharing or leaderboards of body photos** (JEFIT community; Caliber share-out) — the "twisted comparison game." Share cards already exclude bodyweight/measurements per the constitution; body photos must never be shareable to a feed.
- **⛔ Exposing body photos to a third party** (Caliber's coach model) — VOLYUME has no coaches; photos are the user's alone.
- **⛔ Green/red good/bad valence on any body metric** (MyFitnessPal-style, documented shame driver). Keep photo/measurement feedback neutral and calm — consistent with COACHING_VOICE (no shame, no guilt).
- **⛔ Reward loops that re-score the body every check-in** (GainFrame dopamine loop) — VOLYUME's calm, deterministic ethos is the antidote.

---

## SOURCES

Training apps:
- Hevy — https://www.hevyapp.com/features/progress-photos/ ; https://help.hevyapp.com/hc/en-us/articles/34462134138775 ; https://www.hevyapp.com/features/track-body-measurements/
- JEFIT — https://support.jefit.com/hc/en-us/sections/200089565-PROGRESS-PICTURES ; https://support.jefit.com/hc/en-us/articles/200550920 ; https://www.jefit.com/exercise-tips/gym-workout-app-measure-your-progress/
- Strong — https://www.strong.app/ ; https://help.strongapp.io/article/238-add-measurements
- Caliber — https://apps.apple.com/us/app/caliber-strength-training/id1482405410 ; https://www.garagegymreviews.com/caliber-app-review ; https://barbend.com/caliber-fitness-app-review/ ; https://caliberstrong.freshdesk.com/support/solutions/articles/48001257776
- Boostcamp — https://www.boostcamp.app/features ; https://www.boostcamp.app/workout-tracker ; https://www.boostcamp.app/pro
- Fitbod — https://help.fitbod.me/hc/en-us/sections/360012732693 ; https://fitbod.me/blog/how-to-take-progress-photos/
- Dr. Muscle — https://play.google.com/store/apps/details?id=com.drmaxmuscle.dr_max_muscle ; https://dr-muscle.com/dr-muscle-x-first-look/

AI physique-scan apps:
- GainFrame — https://gainframe.app/ ; https://gainframe.app/blog/body-fat-from-photo-app/ ; https://gainframe.app/blog/best-ai-body-fat-apps/ ; https://apps.apple.com/us/app/gainframe-gym-progress-photos/id6759252082
- Bodygram — https://www.bodygram.com/en/platform ; https://apps.apple.com/us/app/bodygram/id1514709034 ; https://www.bodygram.com/en/policies/privacy-app
- trackBod — https://apps.apple.com/us/app/trackbod-ai-body-scan/id6740136071
- ZOZOFIT — https://zozofit.com/ ; https://play.google.com/store/apps/details?id=com.zozo.zozofit
- Snaptrack — https://apps.apple.com/us/app/snaptrack-selfie-body-change-progress-tracking/id748033921
- Spren — https://gainframe.app/blog/spren-app-review/

ED / body-image evidence:
- BJPsych Open (2021) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
- Duke Psychiatry, "The Trouble with Tracking" — https://psychiatry.duke.edu/blog/trouble-tracking
- Vice, "A Twisted Comparison Game" — https://www.vice.com/en/article/a-twisted-comparison-game-how-fitness-apps-exacerbate-eating-disorders/
- National Center for Health Research — https://www.center4research.org/fitness-tracking-apps-eating-disorders/
- CU Anschutz, "Dangers around AI and Body Image" — https://news.cuanschutz.edu/news-stories/what-are-the-dangers-around-ai-and-body-image
- Systematic review (ScienceDirect) — https://www.sciencedirect.com/science/article/pii/S174014452400158X

---

*Note on confidence: no live device testing was performed in this session, so heading-1 capture details are DOCUMENTED (vendor docs/help centres/store listings) or INFERRED, not OBSERVED. Where a vendor's own marketing conflicted with a third-party review (Boostcamp photos), the vendor's materials were treated as authoritative and the conflict flagged. First-party user-review quotes were sparse for several apps (noted inline as INFERRED).*
