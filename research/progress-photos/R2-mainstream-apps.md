# R2 — Progress Photos in Mainstream Fitness / Nutrition Apps

**Research date:** 2026-07-03
**Scope:** Progress-photo features in mainstream trackers — MacroFactor, MyFitnessPal, Hevy, Fitbod, Strong, Cronometer, Lose It!, Fitatu (plus a note on dedicated photo apps as a reference bar).
**Purpose:** Evidence-led competitor teardown to inform VOLYUME's calm, ED-safe, on-device progress-photo feature.

**Evidence tags used on every claim:**
- `[OBSERVED]` — I read a screenshot/walkthrough/store listing that directly shows the behaviour.
- `[DOCUMENTED]` — stated in the vendor's own help centre / marketing / press release.
- `[INFERRED]` — my reasoning from adjacent evidence; treat as lower confidence.

**Confidence caveat:** This teardown is built from vendor help docs, marketing pages, store listings, community forums and third-party reviews. I did not have live devices to tap through each app, so most capture-flow claims are `[DOCUMENTED]` rather than `[OBSERVED]`. Where a source was blocked (403) I say so and lower confidence.

---

## MacroFactor

*The clear leader of this set for progress photos. Ships a purpose-built gallery + before/after tool.*

**1. Capture flow**
Photos attach to a "Body Metrics entry". You tap the front, side, or back photo selector and either "Take Photo" to launch the phone camera in-app, or "Upload a picture from your phone's memory". After capture you can "zoom in or out, or rotate your photo" and confirm with a checkmark. One photo each of front, side and back per day. `[DOCUMENTED]` (help.macrofactorapp.com/articles/121)
No structured pose *prompt* at capture — pose guidance lives in a separate static help article ("tips for taking good progress photos"), not in the camera UI. `[DOCUMENTED]` / `[INFERRED]`

**2. Dating / labelling / metadata**
Auto-dated, but the date is editable: you tap "the date in the top middle of your screen" to pick a different day. `[DOCUMENTED]` (articles/121)
Photos are bound to the Body Metrics entry, so each photo is shown "alongside body metrics that were recorded on that day" — weight, circumferences (shoulder, chest, waist, hips, biceps, forearms, thighs, calves), and ratios (waist-to-height, waist-to-hip). Pose is a first-class label (front/side/back). `[DOCUMENTED]` (macrofactor.com/progress-photos-and-body-measurement-tracker)

**3. Organisation**
A dedicated gallery "brings all of your progress photos in one place" and "lets you quickly navigate between front, side, and back photos taken on the same day." Grouping is by pose and by date; it "makes it easy to find past photos." The gallery "adjusts its own background and button colors to harmonize with the photo in view" (dynamic theming). `[DOCUMENTED]`

**4. COMPARISON experience (headline)**
A dedicated Before/After tool: you "select which photos you want for your 'before' photo and your 'after' photo," and it shows "two progress photos from different dates alongside each other so you can visualize the differences." You pick the angle by tapping "Front," "Side," or "Back" at the top so before/after are pose-matched. Background is customisable via an eyedropper: plain white (light), dark grey (dark), or a colour sampled from the photos. The app "will automatically generate an image based on your Before and After view" for sharing. `[DOCUMENTED]` (help articles 122/123)
It is a static **side-by-side**, not a drag slider, not an aligned ghost overlay, and not a time-lapse. `[INFERRED]` (no slider/overlay/time-lapse mentioned in any doc)

**5. Consistency aids**
No in-camera pose/alignment guide, no ghost overlay of the prior photo at capture, no in-app lighting coach. Guidance is text-only in a help article. `[DOCUMENTED]` / `[INFERRED]`

**6. Privacy model**
Not documented in the feature/help pages I could reach — no explicit statement on on-device vs cloud, encryption, or face-blur. MacroFactor syncs across devices, so photos are `[INFERRED]` stored server-side (cloud). Sharing is user-initiated via the OS share sheet (email, messaging, social). No face-blur tool mentioned. Confidence: low on storage specifics. `[INFERRED]`

**7. What RETAINS vs CHURNS**
Retains: this was one of MacroFactor's two most-requested roadmap items, shipped May 2023; the pose-matched before/after generator and the "photo + metrics on the same day" pairing are the sticky bits. `[DOCUMENTED]` (press release, impresskit.net). I could not surface direct Reddit quotes specifically praising the photo feature (search returned no usable links), so user-voice confidence here is low. `[INFERRED]`

**8. ED / body-image concerns**
No public complaints surfaced tying MacroFactor's photo feature to harm. The before/after generator is explicitly framed around "after a weight loss or a weight gain phase" (neutral to direction), which is a mild positive. No number-overlay-on-photo behaviour observed beyond showing that day's metrics in the gallery. `[DOCUMENTED]` / `[INFERRED]`

---

## Hevy

*Second-strongest and notably the most privacy-forward of the mainstream set.*

**1. Capture flow**
Profile tab → Measures → "+" → "Add Picture" → take a photo or upload from library. Capture guidance (in the help doc, not the camera) says put the phone on a desk/stand "ideally at torso level; no selfies," and you can be "relaxed or flexed." `[DOCUMENTED]` (help.hevyapp.com/articles/34462134138775)

**2. Dating / labelling / metadata**
Each photo "displays with the date you uploaded it." Photos live in the same entry as weight, body-fat %, and 14 circumference measurements, so the photo carries that day's metrics. `[DOCUMENTED]`

**3. Organisation**
One photo per day per entry (the doc notes you can effectively cover front/side/back by uploading across consecutive days). "See All" opens the progress-photo library to browse chronologically. `[DOCUMENTED]`

**4. COMPARISON experience**
Tap any photo → options include "compare it to another," which positions it "side-by-side with another photo in your library." Static side-by-side; no slider, overlay, or time-lapse mentioned. `[DOCUMENTED]`

**5. Consistency aids**
Text guidance only: "use the same poses each time," and shoot "in the same conditions each time (time of day, the camera you use, the lighting, and the angle)." No in-camera ghost overlay or alignment guide. `[DOCUMENTED]`

**6. Privacy model**
Strongest explicit stance in the mainstream set: "Even if your profile is public, progress photos are private." Hevy has heavy social features (public profiles, shared workouts), yet photos are walled off from all of it. `[DOCUMENTED]` Storage is cloud (Hevy syncs across devices); no stated end-to-end encryption or face-blur. `[INFERRED]`

**7. What RETAINS vs CHURNS**
Hevy's reputation (Product Hunt, review roundups) is "clean, fast, simple," strong on the basics; photos ride along as a tidy add-on rather than a headline. Churn asks in reviews centre on UI polish, calendar view, and social/sharing — not photos. `[DOCUMENTED]` (producthunt.com/products/hevy/reviews). Photo-specific user quotes were thin. `[INFERRED]`

**8. ED / body-image concerns**
The private-by-default wall is a genuine harm-reduction default (no accidental public body exposure). Free tier deliberately limits measurements to weight + waist (Pro unlocks the rest) — fewer number-chasing surfaces for free users, though that's a monetisation side effect, not a safety design. `[DOCUMENTED]` / `[INFERRED]`

---

## MyFitnessPal

*Photos exist but are a thin, weight-log attachment — and have a track record of data loss.*

**1. Capture flow**
Tap "+" (top right) → camera icon above the weight scroller → use a Camera Roll photo or shoot with front/rear camera. You can also attach a photo to an existing weigh-in entry via the overlapping-boxes icon. iOS/Android only. `[DOCUMENTED]` (support.myfitnesspal.com — FAQ page itself returned 403 to me, but the behaviour is corroborated by hardreset.info and community threads) `[DOCUMENTED]`/`[INFERRED]`

**2. Dating / labelling / metadata**
Tied to a weigh-in, so it inherits that entry's date and weight. Photo is auto-cropped to a square on upload — which destroys framing consistency between shots. No pose tags (front/side/back). `[DOCUMENTED]`

**3. Organisation**
A simple chronological "Progress Photos" list tied to weight entries. No albums, no pose grouping, no filtering. `[INFERRED]` (from FAQ summary + community threads)

**4. COMPARISON experience**
No dedicated before/after or side-by-side tool surfaced. Users on the community forum ask for slideshow/comparison features, implying they don't exist natively. This is the weakest comparison story of the apps that *have* photos. `[INFERRED]` (community.myfitnesspal.com threads: "Progress Photos Slideshow")

**5. Consistency aids**
None. Square auto-crop actively works against consistency. `[DOCUMENTED]`/`[INFERRED]`

**6. Privacy model**
Photos "sync to your account on the server" (cloud). Guidance warns to force-sync and wait ~15 min before any reinstall to avoid loss — a tell that local/cloud sync is fragile. No face-blur; sharing is "with friends and family." `[DOCUMENTED]`

**7. What RETAINS vs CHURNS**
Strong CHURN signal: multiple forum complaints about photos permanently vanishing — one user lost "over two years' worth of progress photos" (2019–2021); another lost "previous food diaries, weight logs and progress photos" across the app and website at once. Data-loss on irreplaceable personal photos is a trust-killer. `[DOCUMENTED]` (community threads 10854479, 10882968)
Notably, MyFitnessPal's own brand once posted "How before and after photos do more harm than you think" — the vendor has publicly signalled ambivalence about the format. `[DOCUMENTED]` (facebook.com/myfitnesspal post)

**8. ED / body-image concerns**
Beyond the vendor's own "before/after can do harm" messaging, MyFitnessPal is a repeat subject in the disordered-eating literature: a study found 73.1% of ED-affected calorie-counter users identified the app as a contributor to their symptoms; 26.1% said fitness/weight-loss apps perpetuated disordered behaviours. Photos plus calorie counting in one app compounds the checking loop. `[DOCUMENTED]` (Duke Psychiatry, "The Trouble with Tracking")

---

## Cronometer

*Two separate photo systems; body-progress photos are essentially a coach/Pro feature, not a polished self-serve gallery.*

**1. Capture flow**
Body-progress photos live under "Snapshots." You tap "+ Add Snapshot" and pick a saved photo (.png or .jpg) — import only; no strong evidence of an in-app camera pose flow. (Separately, "Photo Logging" is an AI meal-photo feature — unrelated to body photos.) `[DOCUMENTED]` (support.cronometer.com — Snapshots; Pro Client Snapshots)

**2. Dating / labelling / metadata**
Each snapshot shows vitals at time of upload: Age, Weight, BMI, and Body Fat. So it explicitly pairs the photo with numbers — including BMI, the most loaded metric of the set. `[DOCUMENTED]`

**3. Organisation**
A chronological snapshot list per person/client. No pose grouping or albums surfaced. `[INFERRED]`

**4. COMPARISON experience**
Framed around a coach reviewing a client's progress over time; no dedicated before/after slider or side-by-side generator documented. Comparison is "scroll the timeline." `[INFERRED]`

**5. Consistency aids**
Static help text on how to frame a body-fat photo ("include your hips, torso, arms and head"). No in-camera guide/overlay. `[DOCUMENTED]` (cronometer.com/help/misc/photos.jsp)

**6. Privacy model**
Cloud-stored (visible to a linked Pro coach in the Client Snapshots flow). No face-blur or E2E encryption documented. The coach-visibility model means photos are, by design, shared with a professional. `[DOCUMENTED]`/`[INFERRED]`

**7. What RETAINS vs CHURNS**
Community forum has standing requests to attach "Photos with Weight Tracking," implying the self-serve (non-coach) photo experience is underbaked and users want it tighter. `[DOCUMENTED]` (forums.cronometer.com/discussion/1965)

**8. ED / body-image concerns**
Surfacing BMI + Body Fat directly on the photo is the most number-chasing-on-image behaviour in this set — a pattern VOLYUME should avoid. `[INFERRED]`

---

## Strong

*Photos are a Pro afterthought layered onto workouts/measurements; not a comparison product.*

**1. Capture flow**
Strong Pro lets you "add notes and progress pictures to your workouts" and attach progress photos within its body-tracking. Import/camera specifics not clearly documented. `[DOCUMENTED]` (strong.app; prpath.app review)

**2. Dating / labelling / metadata**
Photos attach either to a workout (inherits workout date) or to body measurements (weight, body-fat %, custom measurements, Apple Health sync). No pose tagging surfaced. `[DOCUMENTED]`/`[INFERRED]`

**3. Organisation**
Chronological, tied to the entry it's attached to. No album/pose grouping documented. `[INFERRED]`

**4. COMPARISON experience**
No dedicated before/after or side-by-side photo tool surfaced — Strong's "advanced charts" are for lifts and measurements, not photo comparison. Photos are storage, not comparison. `[INFERRED]`

**5. Consistency aids**
None documented. `[INFERRED]`

**6. Privacy model**
Not documented; Strong syncs to cloud with account. No face-blur. `[INFERRED]`

**7. What RETAINS vs CHURNS**
Strong is valued as a lifting logger (Pro paywall is the main complaint in 2026 reviews); photos are not a reason people stay or leave. `[DOCUMENTED]` (prpath.app/blog/strong-app-review-2026)

**8. ED / body-image concerns**
Low surface area — photos are incidental, no number overlays observed. `[INFERRED]`

---

## Fitbod

*No real in-app progress-photo feature.*

**1–8.** Fitbod does **not** ship a built-in progress-photo capture/store/compare feature. Its "progress" story is Strength Score, muscle-group recovery, per-exercise graphs, and body-composition *numbers*. It publishes a blog on *how* to take progress photos and "other ways besides photos to track progress," i.e. it points you elsewhere for photos. `[DOCUMENTED]` (fitbod.me/blog/how-to-take-progress-photos; help.fitbod.me feature overview; multiple 2026 reviews)
Implication: a whole category of serious training apps treats photos as out-of-scope — leaving an opening for a dedicated, well-made photo experience. `[INFERRED]`

---

## Lose It!

*Photo effort goes into meal logging ("Snap It"), not body-progress photos.*

**1–8.** Lose It!'s flagship photo feature is **Snap It** — AI meal-photo calorie estimation, not body transformation. I found no evidence of a dedicated body-progress-photo gallery/comparison tool; progress tracking centres on weight, macros, body measurements (numbers) and health markers. If body photos exist they are, at best, an undocumented weight-log attachment. `[DOCUMENTED]` (Wikipedia; App Store/Play listings; engadget Snap It) / `[INFERRED]` (absence of any body-photo help doc)

---

## Fitatu

*Nutrition-first; photos are a light "before/after" add-on.*

**1–8.** Fitatu is an AI calorie counter (text/photo/voice food logging) that also lists a "before and after photo comparison" among body-tracking features (body mass, measurements, charts, goal forecast). Depth is shallow — comparison is a marketing bullet, not a documented gallery/slider/overlay system. Storage is cloud/account-based; no privacy or consistency aids documented. `[DOCUMENTED]` (mwm.ai/apps/fitatu; play.google.com Fitatu listing) / `[INFERRED]`

---

## Reference bar — dedicated progress-photo apps (what "good" looks like)

Mainstream trackers are being out-designed by small dedicated apps. A 2026 roundup ("5 Best Progress Photo Apps for iPhone") highlights capabilities none of the mainstream trackers above ship: `[DOCUMENTED]` (localonelabs.com/pages/blog/best-fitness-progress-photo-apps)
- **On-device / no-cloud privacy** as a headline promise: "No cloud storage, no servers, no data collection" (LocalOne Gym Pics); "Your photos live in the app on your device… No one at [vendor] can ever access your photos" + **PIN lock** (Progress).
- **Ghost overlay alignment at capture** + **time-lapse video** + daily reminders (PhotoJourney) — the exact consistency aids the mainstream set lacks.
- Automatic **timestamps**, side-by-side compare, optional community sharing.
These are the features VOLYUME's target users already know exist elsewhere.

---

## PATTERNS ACROSS THIS SET

1. **Two tiers of seriousness.** MacroFactor and Hevy actually built photo *products* (gallery + pose labels + before/after). MyFitnessPal, Cronometer, Strong, Fitatu bolt a photo onto a weight/workout entry. Fitbod and Lose It! don't do body photos at all. `[DOCUMENTED]`/`[INFERRED]`
2. **Comparison is always static side-by-side.** Not one mainstream tracker ships a drag **slider**, an aligned **ghost overlay compare**, or **time-lapse**. That's left to dedicated apps. The bar to beat the mainstream is low; the bar to beat dedicated apps is the real target. `[DOCUMENTED]`/`[INFERRED]`
3. **Pose is under-modelled.** Only MacroFactor (front/side/back) and Hevy (guidance) treat pose as structure. Most just store a dated image. `[DOCUMENTED]`
4. **Consistency aids are text, not tooling.** Every mainstream app tells you "same lighting, same angle, same pose" in a help article; none provides an in-camera ghost/alignment overlay. Universal gap. `[DOCUMENTED]`/`[INFERRED]`
5. **Cloud by default; privacy rarely explicit.** All mainstream apps store photos server-side to sync. Only Hevy explicitly walls photos off from its social graph ("progress photos are private"). None offers on-device-only, encryption, or face-blur. Dedicated apps win precisely here. `[DOCUMENTED]`
6. **Photos get paired with numbers** — often the loaded ones. Cronometer stamps BMI + body-fat on the snapshot; MacroFactor/Hevy show that day's weight + measurements. Nobody offers a "photo without numbers" mode. `[DOCUMENTED]`
7. **Data loss is the sharpest churn driver.** MyFitnessPal's repeated "my photos vanished" complaints show irreplaceable personal photos + fragile cloud sync = broken trust. `[DOCUMENTED]`
8. **The category has an ambivalent conscience.** MyFitnessPal itself published "before/after photos do more harm than you think"; the ED literature repeatedly names calorie-tracker apps as contributors. Photos + calorie counting in one product amplify the checking loop. `[DOCUMENTED]`

---

## WHAT TO STEAL / WHAT TO AVOID (for a calm, ED-safe, on-device app)

**STEAL**
- **Pose as first-class structure** (front/side/back), like MacroFactor — so comparisons are automatically pose-matched, not apples-to-oranges. `[DOCUMENTED]`
- **Pose-matched before/after generator** with a clean, calm background — but as a private artefact by default, not a social flex. `[DOCUMENTED]`
- **Hevy's hard privacy wall:** photos are *never* part of any social/public surface, full stop. Go further — on-device only. `[DOCUMENTED]`
- **In-camera ghost overlay + alignment guide** and optional gentle **time-lapse** (from the dedicated apps) — the consistency tooling the entire mainstream set is missing. This is the differentiator. `[DOCUMENTED]`
- **Editable capture date** (MacroFactor) so a forgotten day can be backfilled honestly. `[DOCUMENTED]`
- **PIN/biometric lock on the photo section** (dedicated apps) as a calm privacy affordance. `[DOCUMENTED]`

**AVOID**
- **Numbers stamped on the image** — especially BMI/body-fat (Cronometer's pattern). Default to a **photo-only, no-metrics view**; make any number pairing strictly opt-in and never on a shareable/before-after export. Aligns with VOLYUME's ED-safety mandate. `[DOCUMENTED]`/`[INFERRED]`
- **Square auto-crop** (MyFitnessPal) — it silently breaks the framing consistency the whole feature depends on. Preserve full framing; help alignment instead. `[DOCUMENTED]`
- **Cloud-by-default with fragile sync** (MyFitnessPal's vanishing photos). On-device truth + encrypted-at-rest fits both the app's SQLCipher architecture and users' trust. `[DOCUMENTED]`
- **Any public/feed exposure of body photos**, accidental or otherwise. `[DOCUMENTED]`
- **Streaks / daily-photo reminders that reward frequency** — daily body-checking is an ED risk pattern. Favour low-frequency, low-pressure cadence and no "you missed a day" guilt (consistent with VOLYUME's calm-voice + notification-suppression rules). `[DOCUMENTED]` (ED literature) / `[INFERRED]`
- **Directional/goal-weight framing** on comparisons ("down X kg!"). Keep before/after neutral (MacroFactor's "loss *or* gain" framing is the safer precedent). `[DOCUMENTED]`

---

## SOURCES

MacroFactor
- https://macrofactor.com/progress-photos-and-body-measurement-tracker/
- https://help.macrofactorapp.com/en/articles/121-how-to-add-progress-photos
- https://help.macrofactorapp.com/en/articles/123-how-to-create-and-share-before-and-after-photos
- https://help.macrofactorapp.com/en/collections/33-body-metrics-and-progress-photos
- https://impresskit.net/press-release/31b91079-b40f-4c98-a33d-5acc2e4998ec

Hevy
- https://help.hevyapp.com/hc/en-us/articles/34462134138775-How-to-Record-Body-Measurements-and-Progress-Photos
- https://www.hevyapp.com/features/progress-photos/
- https://help.hevyapp.com/hc/en-us/articles/35385479603479-Body-Composition-Tracking-Measurements-and-Progress-Photos
- https://www.producthunt.com/products/hevy/reviews

MyFitnessPal
- https://support.myfitnesspal.com/hc/en-us/articles/360032625271-Progress-Photos-FAQs (403 to fetcher; corroborated below)
- https://www.hardreset.info/devices/apps/apps-myfitnesspal/add-progress-photo/
- https://community.myfitnesspal.com/en/discussion/10854479/progress-photos-vanished
- https://community.myfitnesspal.com/en/discussion/10882968/previous-food-diaries-weight-logs-and-progress-photos-gone
- https://community.myfitnesspal.com/en/discussion/10933172/progress-photos-slideshow
- https://www.facebook.com/myfitnesspal/posts/how-before-and-after-photos-do-more-harm-than-you-think/10153210185913497/

Cronometer
- https://support.cronometer.com/hc/en-us/articles/360018570251-Snapshots
- https://support.cronometer.com/hc/en-us/articles/29855279201428-Pro-Client-Snapshots
- https://cronometer.com/help/misc/photos.jsp
- https://forums.cronometer.com/discussion/1965/suggestion-photos-with-weight-tracking

Strong
- https://www.strong.app/
- https://www.prpath.app/blog/strong-app-review-2026.html
- https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577

Fitbod
- https://fitbod.me/blog/how-to-take-progress-photos/
- https://help.fitbod.me/hc/en-us/sections/360012732693-Feature-Overview
- https://fitbod.me/blog/how-fitbod-tracks-your-strength-progress-with-real-time-metrics-and-scores/

Lose It!
- https://en.wikipedia.org/wiki/Lose_It!_(app)
- https://www.engadget.com/2016-09-29-lose-it-snap-it-app.html
- https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629

Fitatu
- https://mwm.ai/apps/fitatu-ai-calorie-counter/1011095795
- https://play.google.com/store/apps/details?id=com.fitatu.tracker&hl=en_GB

Dedicated photo apps (reference bar)
- https://localonelabs.com/pages/blog/best-fitness-progress-photo-apps

ED / body-image context
- https://psychiatry.duke.edu/blog/trouble-tracking
- https://my.clevelandclinic.org/health/diseases/9888-body-dysmorphic-disorder
