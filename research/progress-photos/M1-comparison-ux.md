# M1 — Progress-Photo COMPARISON-UX Craft

**Scope.** How to let a VOLYUME user compare two (or more) of their own physique
photos, and how to help them capture consistent shots — built to feel *calm and
neutral* ("earlier / later + date"), never a dramatic "before → after
transformation" reveal. React Native + Expo (managed). Existing stack:
`react-native-reanimated`, `react-native-gesture-handler`,
`@shopify/react-native-skia`, `expo-image-picker`. New dependencies are on the
table and are recommended on merit.

**Method.** Teardown of mainstream fitness/nutrition apps, then out-of-category
masters (skincare, pregnancy, hair, renovation) where this interaction is
usually done *better*. Then each craft technique with premium-vs-clunky tells,
RN implementation, accessibility, and how to keep it calm. Ends with a **ranked
build recommendation**.

**Evidence tags.** `[OBSERVED]` = behaviour described from actual product
use/reviews/demo; `[DOCUMENTED]` = stated in a vendor help page or library doc;
`[INFERRED]` = design/engineering reasoning by the author. URLs inline; full
list at end.

> **Calm-design north star used throughout.** The ED-safety constitution means
> this feature must never gamify the body. Practical rules applied to every
> recommendation below: neutral labels (a *date* or "earlier / later", never
> "before/after" or "goal"), no weight/measurement burned into a share image
> (share-card rule), no auto-generated "transformation" hype, no streaks/scores
> on photos, and the comparison is a *private observation tool* first, a share
> tool a distant second. `[INFERRED]`

---

## PART A — Mainstream fitness/nutrition teardown

### A1. MacroFactor — the category leader for this exact feature
MacroFactor shipped a full progress-photo + body-metrics system (2023, expanded
since). It is the closest reference to what VOLYUME should build, and the most
instructive.

- **Gallery organised by view.** "A fully featured experience for taking,
  organizing, viewing, and comparing progress photos alongside your body
  metrics," with the ability to "quickly navigate between front, side, and back
  photos taken on the same day." `[DOCUMENTED]`
  (https://macrofactor.com/body-metrics/)
- **Photos attach to a Body Metrics entry**, and are captured either from the
  device library **or in-app with the phone camera** — front / side / back
  slots per entry. `[DOCUMENTED]` (same)
- **Before-and-After builder.** A dedicated tool that displays "two progress
  photos from different dates alongside each other." The builder is a two-step
  pick: tap the **top** image slot to choose the earlier photo, tap the
  **bottom** slot for the later one, both drawn from a chronological gallery
  ribbon; a **Front / Side / Back** toggle picks the view; an eyedropper sets
  the background to "a plain white background, a dark gray background, or a
  background that matches the color tones of your progress photos"; a share icon
  hands off to the native share sheet. `[DOCUMENTED]`
  (https://help.macrofactorapp.com/en/articles/351-how-to-create-and-share-before-and-after-photos)
- **Dynamic theming.** The gallery "adjust[s] its own background and button
  colors to harmonize with the photo in view." A premium tell — the chrome
  recedes so the photo leads. `[DOCUMENTED]` (body-metrics page)

**Tells for VOLYUME.**
- **The pose-match is *manual, not algorithmic*.** Despite widespread belief in
  a "pose-matched generator," MacroFactor's own help docs describe **no
  pose-detection or auto-alignment** — the user selects two photos and the app
  composites them; matching poses is on the user at *capture* time.
  `[DOCUMENTED]` (help article — "The documentation doesn't mention
  pose-matching guidance, date labels, or privacy controls"). This is the single
  biggest lesson: **the leader wins on capture consistency + clean compositing,
  not on ML pose-matching.** The leverage is a good capture aid (ghost overlay),
  not a clever comparison algorithm. `[INFERRED]`
- View-typed slots (front/side/back) are the right data model — comparisons must
  be *within a view*, never front-vs-side. `[INFERRED]`
- The auto-generated share image with harmonised background is the "premium"
  finish; VOLYUME can adopt the harmonised neutral background but **must drop any
  metric overlay and any "before/after" caption** per the share-card rule.
  `[INFERRED]`

### A2. MyFitnessPal — competent but generic
- **Comparisons tab.** Tap **+** on the Comparisons tab, "Select First Image,"
  then a second, to build a **single or side-by-side** layout, then Share.
  `[DOCUMENTED]`
  (https://support.myfitnesspal.com/hc/en-us/articles/360032625271-Progress-Photos-FAQs)
- **Known clunk.** Community threads report friction: pinch-**zoom on a progress
  photo doesn't work well on Android**, and users hit "unable to use it as a
  side-by-side." `[OBSERVED]`
  (https://community.myfitnesspal.com/en/discussion/10828258/android-zooming-on-progress-photos)
- **Tell:** MFP is the baseline — pick-two + side-by-side + share, no capture
  aid, no onion-skin. Meeting this bar is table stakes; the zoom bug is a
  cautionary "premium-vs-clunky" data point (broken pinch = instantly cheap).
  `[INFERRED]`

### A3. Cronometer — minimal, web-biased
- **"Snapshots"** (Cronometer Gold): upload a photo that carries vitals (Age,
  Weight, BMI, Body Fat) at time of upload; it is a **web-only** feature, with a
  mobile workaround of attaching a photo to a diary note. `[DOCUMENTED]`
  (https://support.cronometer.com/hc/en-us/articles/29855279201428-Pro-Client-Snapshots)
- **Tell:** Cronometer *stamps body metrics onto the photo record*. For a
  general nutrition tracker that's fine; **for an ED-safe app it is exactly the
  anti-pattern** — do not weld weight/BF% onto the photo view, and never onto a
  share. `[INFERRED]`

### A4. Lose It! and the "comparison app" long tail
Lose It! has progress photos but no distinctive comparison craft surfaced in
docs; the interaction leaders in this long tail are **dedicated comparison
apps**, which are worth tagging because they define user expectations:
- **CompareMe** — "2 modes to compare — Slide Compare & Side-by-Side Compare."
  `[DOCUMENTED]`
  (https://play.google.com/store/apps/details?id=com.droidinfinity.compareapp)
- **Photo Progress: Before-After** — compare any two images with **zoom up to
  30x**. `[DOCUMENTED]`
  (https://play.google.com/store/apps/details?id=com.tuanfadbg.trackprogress.beforeafterimage)
- **Tell:** the two universally expected modes are **slide** and **side-by-side**;
  deep zoom is expected for detail. `[INFERRED]`

**Mainstream summary.** The bar: view-typed gallery → pick two → side-by-side
and/or slider → clean share. MacroFactor sets the premium finish (harmonised
background, in-app camera). *None of the mainstream fitness apps do a live ghost
overlay at capture* — that gap is where the out-of-category masters lead, and
where VOLYUME's biggest differentiation and biggest ED-safety win sits.
`[INFERRED]`

---

## PART B — Out-of-category masters (better than fitness)

These categories live or die on *consistent capture over time*, so they have
refined the exact aids fitness apps skip.

### B1. Dedicated overlay-camera apps (the craft, isolated)
- **Camera Overlay** — "Your reference photo appears as a semi-transparent image
  over the live camera. Align it as you want," promising "**Same angle, same
  zoom, same crop; every time.**" Opacity is user-adjustable; manual exposure and
  zoom; optional composite export. `[DOCUMENTED]` (https://cameraoverlay.com/)
- **AlignShot – Overlay Camera** — "a real-time 'Ghost Overlay' camera" with
  **presets** for fitness, plants, renovations, product, stop-motion, and
  "recreating a previous photo." `[DOCUMENTED]`
  (https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984)
- **Apollo – Camera Overlay** — overlay any gallery photo on the live camera to
  align before/after. `[DOCUMENTED]`
  (https://apps.apple.com/us/app/apollo-camera-overlay/id6449167716)
- **Kernel:** faint previous photo pinned over a live preview + an opacity slider
  + a framing grid = repeatable shots. This is a *pure UI overlay on a preview*,
  not machine vision. `[INFERRED]`

### B2. Pregnancy / baby-bump apps (the gentlest tone)
- **Life Lapse** — "The Ghost feature will showcase the previous photo (or you
  can toggle to the **first** photo) so you can align it," working "alongside the
  grid tool to maintain framing consistency across weeks." `[DOCUMENTED]`
  (https://stopmotionapp.com/blog/how-to-create-pregnancy-time-lapse)
- **Cinemama / Daily Selfie Journal** — align "to the same angle and position
  every day," "face overlay to keep your position consistent," then optional
  timelapse. `[DOCUMENTED]`
  (https://selfietimelapse.com/use-cases/track-your-pregnancy-bump-journey-week-by-week)
- **Kernel:** a **toggle between "previous" and "first" as the ghost reference**,
  and a *soft, journal-like tone* ("document your journey") rather than
  goal/transformation language. This tone is the closest match to VOLYUME's
  required voice. `[INFERRED]`

### B3. Hair-growth / transplant trackers (guided capture)
- **Follicle** — a "Ghost Overlay" camera that "plac[es] a faint reference photo
  over the live camera preview to match angle, position, and framing," plus an
  "AI Photo Consistency" check scoring how closely a new shot matches the
  baseline. `[DOCUMENTED]`
  (https://play.google.com/store/apps/details?id=com.follicleapp.follicle)
- **HairGrowth / Hair Growth AI** — "guided framing" / "guided photo scan" for
  consistent angles, then side-by-side timelines. `[DOCUMENTED]`
  (https://apps.apple.com/us/app/hair-growth-ai/id6756085027)
- **Kernel:** the ghost overlay can be paired with a lightweight, *non-judgy*
  "alignment good?" affordance. **Caution for VOLYUME:** a *scored* consistency
  metric edges toward a numeric grade on your body — keep any such aid as a
  neutral framing guide, never a score. `[INFERRED]`

### B4. Renovation / real-estate before-after sliders (the drag interaction)
- **JuxtaposeJS** (Knight Lab) — the reference implementation for the drag-reveal
  slider: two frames, a draggable divider, "modify the handle's start position
  and choose to click the slider instead of dragging," touch/swipe on mobile.
  `[DOCUMENTED]` (https://juxtapose.knightlab.com/,
  https://github.com/NUKnightLab/juxtapose)
- **Widely-cited slider UX rules:** default the handle to **centre**, put clear
  side labels, add a **subtle nudge animation** hinting "drag me," and ensure
  touch support. `[DOCUMENTED]`
  (https://embeddable.co/blog/how-to-build-before-after-slider-for-your-website)
- **Kernel:** the drag-reveal is *inherently* framed as before→after
  ("transparent results," "reveal renovations"). VOLYUME can borrow the
  *mechanics* but must **neutralise the framing** (date chips, not
  "before/after"). `[INFERRED]`

**Transferable kernel, distilled.** (1) Consistency is created at *capture*, not
recovered at comparison — a ghost overlay + grid is the highest-leverage aid.
(2) Offer a **previous vs first** reference toggle. (3) The drag-reveal is the
most engaging *view* but the most "transformation-coded" — neutralise its
labels. (4) Never stamp metrics on the image. (5) Journal tone beats
goal/achievement tone. `[INFERRED]`

---

## PART C — The craft, technique by technique

### 1. Before/after SLIDER (drag-handle reveal)
**What it is.** Two photos stacked exactly; a vertical divider with a handle;
dragging the handle wipes the later photo across to reveal the earlier one
beneath.

**Premium vs clunky tells.** `[INFERRED]` / rules-from-docs `[DOCUMENTED]`
- *Premium:* handle tracks the finger 1:1 at 60fps with zero lag (UI-thread
  animation), a visible circular grip with a subtle double-chevron, a hairline
  divider, a one-time gentle nudge on first view, images **pixel-aligned** so the
  wipe reveals *change* not *mis-registration*, and both photos identically
  cropped to the same aspect.
- *Clunky:* JS-thread lag/jank, divider drifting off the finger, no grip
  affordance (users don't know it's draggable), photos of different crop/zoom so
  the wipe looks like two unrelated pictures, a giant "BEFORE/AFTER" banner.
- Centre-default handle + subtle drag hint are documented best practice.
  `[DOCUMENTED]` (embeddable.co)

**RN implementation.** `[DOCUMENTED]` (reanimated/gesture-handler docs) /
`[INFERRED]`
- Both images absolutely positioned, same size. The later image sits in a
  clipping wrapper whose **width is a Reanimated shared value** (`diviverX`);
  drag updates it.
- Use the **modern Gesture API** (`Gesture.Pan()` from gesture-handler 2.x +
  `useSharedValue`/`useAnimatedStyle`); the older `useAnimatedGestureHandler` is
  deprecated in Reanimated 3/4. `[DOCUMENTED]`
  (https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures/,
  https://docs.swmansion.com/react-native-reanimated/examples/slider/)
- Clip with an `overflow:'hidden'` wrapper (simplest, no Skia needed) — the top
  image's container width animates; the handle `translateX` binds to the same
  shared value. Snap-to-centre with `withSpring` on a double-tap.
- **Skia is optional here and not worth it** for a straight vertical wipe; reserve
  Skia for the onion-skin blend (section 3). `[INFERRED]`
- Existing dep `react-native-before-after-slider` exists but is thin; **build the
  ~40-line component in-house** on the stack you already own — no new dep.
  `[DOCUMENTED]` (https://github.com/justin9606/react-native-before-after-slider)

**Accessibility.** `[DOCUMENTED]` (RN accessibility docs)
- The handle is the adjustable control: `accessibilityRole="adjustable"`,
  `accessibilityLabel="Reveal slider"`,
  `accessibilityValue={{min:0,max:100,now,text:'showing 60% of the later photo'}}`,
  and implement `onAccessibilityAction` for `increment`/`decrement` (VoiceOver
  swipe-up/down; TalkBack volume keys) moving the divider in ~10% steps.
  (https://reactnative.dev/docs/accessibility)
- **Reduce Motion:** skip the nudge animation and use no spring — jump the handle
  to position. Respect `AccessibilityInfo.isReduceMotionEnabled()`.
- Provide an **alt text pair** so a screen-reader user still gets "earlier photo,
  3 March; later photo, 14 April."

**Keeping it calm.** Label the two ends with **dates or "earlier / later"**, not
"before/after." No reveal fanfare, no confetti, no percentage-of-change readout.
The slider is a *quiet* way to look, defaulting to a static 50/50 split on open.
`[INFERRED]`

---

### 2. Side-by-side TWO-UP
**What it is.** Two photos shown at once, left/right (portrait) with date chips.

**Premium vs clunky tells.**
- *Premium:* identical frame size, portrait images letterboxed on a **neutral
  harmonised background** (MacroFactor tell), dates as quiet chips, **optional
  synchronised pinch-zoom/pan** so both photos zoom together to compare a region.
  `[DOCUMENTED]` (macrofactor.com/body-metrics — harmonised background)
- *Clunky:* mismatched crops/sizes, one photo zoomable and the other not, broken
  pinch (MFP Android bug). `[OBSERVED]` (MFP community)

**RN implementation.** `[INFERRED]` / `[DOCUMENTED]`
- Two `expo-image` (already available) panes in a flex row. For **synchronised
  zoom/pan**, share one `scale`/`translate` shared value across both panes driven
  by a single `Gesture.Pinch()`+`Gesture.Pan()` (`Gesture.Simultaneous`) so a
  region compares like-for-like. Clamp scale; `withDecay` for fling is optional.
- Portrait framing: enforce a fixed aspect box (e.g. 3:4) with `contentFit:
  'contain'` on a neutral background so bodies aren't cropped inconsistently.
- No new dep.

**Accessibility.** Each pane is an image with its own date label; group as one
`accessibilityElement` announcing "Two photos, 3 March and 14 April, front view."
Zoom controls need explicit increment actions or a visible +/- for switch/VO
users. Reduce Motion: instant zoom, no inertia. `[DOCUMENTED]` (RN docs)

**Keeping it calm.** This is the **safest default mode** — it is literally two
dated photos, no reveal drama. Recommend it as the *default* comparison view.
`[INFERRED]`

---

### 3. Aligned OVERLAY / onion-skin
**What it is.** The earlier photo shown semi-transparent *on top of* the later
(or vice-versa) with an opacity slider — you see change as a ghostly difference.

**Premium vs clunky tells.**
- *Premium:* smooth opacity control, an optional **difference/edge aid** to help
  line up, a small **nudge/scale gesture** to fine-register the top photo if
  poses differ slightly, and a neutral crossfade.
- *Clunky:* fixed 50% opacity with no control; no way to nudge alignment, so
  slightly different poses look like a blurry mess and read as failure.
  `[INFERRED]`

**RN implementation — this is where Skia earns its place.** `[DOCUMENTED]`
(@shopify/react-native-skia is already in the stack) / `[INFERRED]`
- Simple version: stack two `expo-image`s, top one's `opacity` = a shared value
  bound to a slider. No Skia needed.
- Premium version: render both into a **Skia canvas**; use an `opacity` on the
  top `Image`, and optionally a `ColorMatrix`/blend mode (`difference` or
  `multiply`) as an *alignment aid layer* the user can toggle to see edges line
  up. Skia gives you real blend modes the plain View stack can't. Allow a
  `Gesture.Pan`+`Pinch` on the top layer to nudge/scale it into register. You
  already own Skia — **no new dep.**

**Accessibility.** Opacity slider = `accessibilityRole="adjustable"` with
value/increment (as §1). The overlay is inherently visual; provide the two dates
in the label and don't make onion-skin the only way to compare (offer two-up as
the accessible fallback). Reduce Motion: no auto-crossfade animation.
`[DOCUMENTED]` (RN docs)

**Keeping it calm.** Frame it as "**line the two up**," a quiet alignment/looking
tool. Avoid any auto-play that flickers between the two (flicker reads as a
"reveal"). `[INFERRED]`

---

### 4. TIME-LAPSE / stitched video
**How apps do it.** Pregnancy/hair/skincare apps stitch the dated photos into a
short video, sometimes with music (Life Lapse, Daily Selfie, Cinemama).
`[DOCUMENTED]` (selfietimelapse.com, stopmotionapp.com)

**Is it worth building?** For a **calm ED-safe physique app: mostly no, and
certainly not first.** `[INFERRED]`
- **Transformation-reel risk is highest here.** A montage of your body set to
  music is the single most "transformation-coded," body-checking-adjacent format
  in this whole space — the opposite of the required calm, no-hype voice. It also
  invites social sharing of a body reel, which collides with the share-card
  minimisation rules.
- **Engineering cost/risk is also highest.** The obvious dep,
  `ffmpeg-kit-react-native`, is **retired: as of Jan 2025 announced end-of-life,
  and native binaries removed from Maven Central, CocoaPods and npm on 1 April
  2025 — new builds pulling it fail with 404.** `[DOCUMENTED]`
  (https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1,
  https://www.itpathsolutions.com/ffmpegkit-shutdown-what-to-do-next). So a
  time-lapse would need `react-native-video-processing` or a self-maintained
  FFmpeg build — non-trivial native surface for a managed Expo app.
- **Recommendation: do NOT build in M1.** If ever revisited, gate behind an
  explicit founder decision, keep it a silent, music-free, date-stamped
  sequence, private by default. Name the dep at that point:
  **`react-native-video-processing`** (native platform APIs, no bundled FFmpeg,
  smaller footprint) — but treat it as out-of-scope for a calm launch.
  `[DOCUMENTED]` (itpathsolutions.com)

---

### 5. GHOST-OVERLAY AT CAPTURE — the highest-leverage, most ED-friendly feature
**What it is.** When taking a *new* photo, show the previous (or first) photo as
a faint overlay on the **live camera preview**, plus a framing grid, so the user
lines up the same pose/angle/distance every time. Consistency at capture is what
makes every downstream comparison honest — and it removes the "did I gain or is
it just the angle?" anxiety loop that fuels body-checking. `[INFERRED]`

**Who does it best, and exactly how.** `[DOCUMENTED]`
- **Life Lapse (pregnancy):** ghost the **previous** photo, with a **toggle to
  the first** photo, plus a **grid** for framing. (stopmotionapp.com)
- **Follicle (hair):** "a faint reference photo over the live camera preview to
  match angle, position, and framing." (Google Play listing)
- **Camera Overlay / AlignShot / Apollo:** semi-transparent reference + **opacity
  slider** + manual exposure/zoom; AlignShot adds per-domain presets and a
  "recreate a previous photo" mode. (cameraoverlay.com, App Store listings)
- The consensus recipe: **faint previous photo (adjustable opacity ~20–40%) +
  rule-of-thirds grid + fixed framing + a subtle "aligned" confirmation.**

**The blocker with the current stack.** `expo-image-picker`
(`launchCameraAsync`) hands off to the **OS camera UI**, which **cannot render a
live guide overlay** — you get the system camera, no custom layer. So a ghost
overlay *requires an in-app camera preview*, which means a camera library.
`[DOCUMENTED]` (expo-image-picker uses the system camera intent) / `[INFERRED]`

**Key technical insight (drives the recommendation).** A ghost overlay is
**just a static, semi-transparent image positioned over a live preview** — it
needs **no per-frame processing, no ML, no Skia frame processor.** Any camera
lib that lets you render children/absolute-positioned Views on top of the preview
can do it. This collapses the dep question to *"which in-app camera fits an
Expo-managed, calm app best."* `[INFERRED]`

**Option comparison (judged on merit):** `[DOCUMENTED]` (Expo camera docs;
pkgpulse/patrickskinner comparisons) / `[INFERRED]`
- **`expo-camera` (`CameraView`)** — first-party, in the Expo SDK you already
  run, **config-plugin native module you're already comfortable managing**,
  supports overlay children, exposes zoom and basic controls. Preview goes over
  the JS bridge (fine for a *static* overlay; no per-frame work here). *Lowest
  risk, best managed-workflow fit, zero third-party maintenance exposure.*
  (https://docs.expo.dev/versions/latest/sdk/camera/)
- **`react-native-vision-camera`** — GPU-backed native preview, **manual
  focus/exposure/zoom locking** (genuinely useful for shot-to-shot consistency),
  Expo config plugin + prebuild. Heavier, third-party, more surface. Its Skia
  frame processors are **not needed** for a static ghost (and only render in
  preview anyway). `[DOCUMENTED]`
  (https://react-native-vision-camera.com/docs/guides/skia-frame-processors,
  https://www.pkgpulse.com/blog/react-native-vision-camera-vs-expo-camera-vs-expo-image-picker-2026)

**RECOMMENDATION (outright): build the ghost overlay on `expo-camera`.**
`[INFERRED]`
- Rationale: the overlay is a plain `<Image style={{opacity}}/>` absolutely
  positioned inside `<CameraView>`; expo-camera is first-party, already matches
  your "native modules only via Expo config plugins" rule (like
  `modules/live-activity`), adds **no third-party maintenance risk**, and is the
  smallest, calmest addition. Add a rule-of-thirds grid overlay, an opacity
  slider (default ~30%), and a **previous ⇄ first** reference toggle (the Life
  Lapse pattern).
- **Choose `react-native-vision-camera` instead only if** device testing shows
  expo-camera's preview/exposure drift hurts consistency and you specifically
  want **locked exposure/zoom** between sessions. That is a real quality lever
  for consistency — flag it as a founder decision with the trade-off (better
  consistency vs heavier native surface), don't pre-decide.

**Implementation sketch.** `<CameraView>` full-bleed; on top, absolute
`<Image source={referencePhoto} style={{opacity: ghostOpacity}} resizeMode="cover"/>`
matched to the same aspect; a thin grid `View`; a Reanimated opacity slider
(§1 pattern); capture with `takePictureAsync`; save straight into the same
view-typed slot (front/side/back) so it's instantly comparable. `[DOCUMENTED]`
(expo-camera docs) / `[INFERRED]`

**Accessibility.** The camera+ghost is inherently visual; still: label the
opacity slider as adjustable (§1), announce the active reference ("aligning
against your photo from 3 March"), and give a **non-overlay fallback** — a plain
capture button so a VoiceOver user isn't forced through alignment. Reduce Motion:
no pulsing "aligned" animation. `[DOCUMENTED]` (RN docs) / `[INFERRED]`

**Keeping it calm.** Present it as "**line up with your last photo**," a helpful
framing aid — never "beat your before." No consistency *score* on the body
(Follicle's AI-score is a line VOLYUME should not cross); at most a neutral
"looks lined up" cue. `[INFERRED]`

---

### 6. SELECTION PICKERS
**What it is.** How the user chooses *which two* (or which sequence) to compare.

**Patterns seen.** `[DOCUMENTED]` / `[INFERRED]`
- MacroFactor: **chronological gallery ribbon**, tap top slot / bottom slot, with
  a **Front/Side/Back** view filter. (help article)
- Common shortcuts in the space: "**first vs latest**," "**now vs N weeks ago**,"
  date-range, and **by-pose** (view) filtering. `[INFERRED]` from the view-typed
  galleries above.

**RN implementation.** `[INFERRED]`
- Data model: each photo row has `{id, dateMs, view:'front'|'side'|'back'}`
  (mirror MacroFactor's slots). Store in SQLite via `database.js`; the image file
  stays on-device (encrypted at rest per your model), only a path/reference
  synced — **never** ship raw physique photos to Supabase without an explicit
  founder decision (Article 9 health data). `[INFERRED]`
- Picker UI: a horizontal dated ribbon (FlashList/FlatList) filtered by the
  active **view** chip; two tap-to-fill slots ("earlier" / "later"); plus quick
  presets: **"First vs latest"** and **"Now vs 4/8/12 weeks ago."**
- Guard: only allow comparing **same view** (front-vs-front). Grey out
  mismatched-view photos. `[INFERRED]`

**Accessibility.** Ribbon items announce date + view; slots announce their
current selection; presets are buttons with clear labels. `[DOCUMENTED]` (RN
docs)

**Keeping it calm.** Default the preset copy to neutral time language ("Now vs 4
weeks ago", "First vs latest") — **avoid "starting weight," "goal," "progress
score."** Let the user pick *any* two dates freely (not just earliest→latest), so
the tool reads as observation, not a scoreboard. `[INFERRED]`

---

## PART D — RANKED RECOMMENDATION for a calm, ED-safe physique gallery

Priorities balance **user value × ED-safety × build cost/risk**. Nothing here
touches the coaching engine or safety modules; the only genuinely new dep is a
camera library, and it's the first-party one.

### Build, in this order

**P0 — Foundation: view-typed gallery + capture into slots.**
Data model with `view` (front/side/back) + `dateMs`; photos encrypted on-device;
neutral dated thumbnails. *No new dep.* Everything else depends on this.
*Why first:* it's the substrate; MacroFactor's whole system rests on it. `[INFERRED]`

**P1 — Side-by-side two-up (default comparison mode).**
Two dated panes, neutral harmonised background, optional synchronised zoom/pan.
*No new dep (reanimated + gesture-handler + expo-image).* *Why:* safest,
lowest-drama, meets the mainstream bar, is the calm default. `[INFERRED]`

**P2 — Ghost-overlay at capture — the differentiator and biggest ED-safety win.**
In-app camera preview + faint previous/first photo + grid + opacity slider.
**New dep: `expo-camera` (first-party Expo SDK module, config plugin) —
recommended outright.** Optional upgrade to `react-native-vision-camera` *only*
if device testing proves locked exposure/zoom is needed (founder decision).
*Why P2 not P1:* it needs the gallery/slots first, but it is the single
highest-leverage feature — consistent capture makes every comparison honest and
defuses the "is it real or just the angle?" body-checking loop. `[INFERRED]`

**P3 — Before/after SLIDER (drag-reveal), relabelled.**
~40-line in-house component; centre-default, dated ends ("earlier/later"),
adjustable-role a11y. *No new dep.* *Why later:* highest engagement but most
"transformation-coded" — ship it only after the calm defaults are in, and strip
all before/after framing. `[INFERRED]`

**P4 — Aligned OVERLAY / onion-skin.**
Opacity slider + optional Skia blend/difference alignment aid + nudge-to-register.
*No new dep (Skia already in stack).* *Why:* a lovely power-user "line them up"
tool; niche, so it follows the core modes. `[INFERRED]`

### Avoid (or gate behind an explicit founder decision)
- **Time-lapse / stitched video (§4):** highest transformation-reel risk +
  highest native cost (ffmpeg-kit is retired/removed). **Do not build for
  launch.** If ever revisited: silent, music-free, private, and use
  `react-native-video-processing` — but only after a founder decision. `[DOCUMENTED]`
- **Metric overlays on photos (Cronometer pattern):** never weld weight/BF% onto
  the photo view or a share image — collides with the share-card and
  data-minimisation rules. `[INFERRED]`
- **Consistency *scores* on the body (Follicle AI-score):** a neutral "looks
  lined up" cue is fine; a numeric grade of your body is not. `[INFERRED]`
- **Auto "transformation" share reels / hype captions:** against the coaching
  voice. Keep sharing manual, neutral, metric-free. `[INFERRED]`

### New-dependency ledger
| Recommended item | New dep? | Which | Signal |
|---|---|---|---|
| Gallery + slots (P0) | No | — | uses `database.js`, `expo-image` |
| Two-up (P1) | No | — | reanimated + gesture-handler + expo-image |
| **Ghost capture (P2)** | **Yes** | **`expo-camera`** | First-party Expo SDK, config-plugin native module, actively maintained, smallest managed-workflow surface, no third-party risk |
| (P2 optional upgrade) | Yes | `react-native-vision-camera` | Strong/active (mrousavy), heavier; only if locked exposure/zoom proves needed — founder call |
| Slider (P3) | No | — | in-house on existing stack |
| Onion-skin (P4) | No | — | `@shopify/react-native-skia` already present |
| Time-lapse (avoid) | (Yes, if ever) | `react-native-video-processing` | `ffmpeg-kit` retired 2025; out-of-scope for calm launch |

**Bottom line.** Ship **P0 gallery → P1 two-up → P2 ghost-capture on
`expo-camera`** as the calm core; add **P3 slider** and **P4 onion-skin** as
neutral, relabelled looking-tools; **skip time-lapse**. The one new dependency
worth adding is the first-party `expo-camera`, because the ghost overlay at
capture is both the biggest craft win and the strongest ED-safety move — and it
needs nothing more exotic than a semi-transparent image over a live preview.

---

## SOURCES
- MacroFactor — Body metrics & progress photos: https://macrofactor.com/body-metrics/
- MacroFactor — Before/after photo builder (help): https://help.macrofactorapp.com/en/articles/351-how-to-create-and-share-before-and-after-photos
- MacroFactor — feature launch note: https://macrofactor.com/mm-may-2023/
- MyFitnessPal — Progress Photos FAQ: https://support.myfitnesspal.com/hc/en-us/articles/360032625271-Progress-Photos-FAQs
- MyFitnessPal — Android zoom bug thread: https://community.myfitnesspal.com/en/discussion/10828258/android-zooming-on-progress-photos
- Cronometer — Snapshots (Pro/Gold): https://support.cronometer.com/hc/en-us/articles/29855279201428-Pro-Client-Snapshots
- CompareMe (slide + side-by-side): https://play.google.com/store/apps/details?id=com.droidinfinity.compareapp
- Photo Progress Before-After (30x zoom): https://play.google.com/store/apps/details?id=com.tuanfadbg.trackprogress.beforeafterimage
- Camera Overlay (ghost overlay): https://cameraoverlay.com/
- AlignShot – Overlay Camera: https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984
- Apollo – Camera Overlay: https://apps.apple.com/us/app/apollo-camera-overlay/id6449167716
- Life Lapse — pregnancy Ghost feature: https://stopmotionapp.com/blog/how-to-create-pregnancy-time-lapse
- Daily Selfie / Cinemama — pregnancy bump overlay: https://selfietimelapse.com/use-cases/track-your-pregnancy-bump-journey-week-by-week
- Follicle — Ghost Overlay + AI consistency: https://play.google.com/store/apps/details?id=com.follicleapp.follicle
- Daily Selfie — hair growth overlay: https://selfietimelapse.com/use-cases/hair-growth-tracker-document-your-hair-journey-daily
- Hair Growth AI — guided scan: https://apps.apple.com/us/app/hair-growth-ai/id6756085027
- JuxtaposeJS (Knight Lab): https://juxtapose.knightlab.com/ , https://github.com/NUKnightLab/juxtapose
- Before/after slider UX rules: https://embeddable.co/blog/how-to-build-before-after-slider-for-your-website
- Reanimated — handling gestures: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures/
- Reanimated — slider example: https://docs.swmansion.com/react-native-reanimated/examples/slider/
- react-native-before-after-slider: https://github.com/justin9606/react-native-before-after-slider
- RN accessibility (adjustable role, increment/decrement, accessibilityValue): https://reactnative.dev/docs/accessibility
- Expo Camera (CameraView) docs: https://docs.expo.dev/versions/latest/sdk/camera/
- Vision Camera vs Expo Camera vs ImagePicker (2026): https://www.pkgpulse.com/blog/react-native-vision-camera-vs-expo-camera-vs-expo-image-picker-2026
- Expo vs VisionCamera guide: https://blog.patrickskinner.tech/react-native-camera-expo-vs-visioncamera-what-you-need-to-know
- VisionCamera Skia frame processors (preview-only limitation): https://react-native-vision-camera.com/docs/guides/skia-frame-processors
- FFmpegKit retirement announcement: https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1
- FFmpegKit shutdown / alternatives (react-native-video-processing): https://www.itpathsolutions.com/ffmpegkit-shutdown-what-to-do-next , https://www.itpathsolutions.com/top-ffmpeg-alternatives
