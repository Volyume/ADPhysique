# R3 — Comparison / Before-After / Time-Lapse UX Craft

**Scope.** Evidence-led research into how the best products (any category) do photo
comparison, so VOLYUME can build a best-in-class comparison for **two body photos**
in a **calm, ED-safe** app. Covers: before/after slider, side-by-side, aligned
overlay / onion-skin, time-lapse, ghost-overlay at capture, and date-range pickers.
Each section: how the best do it → premium-vs-clunky tells → RN-feasible approach →
accessibility + calm notes. Ends with a ranked build recommendation.

**Evidence tags.** `[OBSERVED]` = seen in a product/demo directly described by a
first- or second-party source; `[DOCUMENTED]` = stated in library docs, App Store
listings, or standards; `[INFERRED]` = my synthesis/engineering judgement, not a
cited claim. This researcher could not run iOS/Android builds, so app-behaviour
claims rest on store listings and roundups (marked accordingly), not hands-on use.

**Constitution note.** This is research only; no app code touched. The recommendation
section flags every point where a comparison mode risks the ED-safety mandate
(no "shocking transformation" framing, no dramatic reveals, tier-blind guardrails)
and defers the build/no-build fork to the founder rather than pre-deciding it.

---

## 1. Before/After SLIDER (drag-a-handle reveal)

### How the best do it
- The canonical pattern: two images stacked in the same frame; a **vertical handle**
  on a draggable divider clips the top ("after") image so dragging reveals more/less
  of it over the bottom ("before"). Default handle position is **centre**, with
  small "Before" / "After" labels on each side and a subtle nudge animation on first
  view to signal draggability. [DOCUMENTED] (sliderrevolution.com, crocoblock.com)
- Premium tells that recur across skincare/renovation/real-estate implementations:
  the touch point **scales up the instant you grab it**, the value/position updates
  live as you move, and tooltips/labels are positioned so they never sit under the
  thumb. [DOCUMENTED] (eleken.co "40 Slider UI Examples", medium/@oshalurade)
- Fitness-specific: GainFrame and Snaptrack both offer a **"swipe slider" comparison
  with auto body alignment** — the two body photos are registered to each other first
  so the divider reveals a like-for-like body, not a shifted one. [DOCUMENTED]
  (gainframe.app roundup)

### Premium vs clunky
- **Premium:** handle has a clear affordance (pill/circle with a double chevron),
  reveal tracks the finger 1:1 with no lag, divider line is thin and low-contrast,
  and the two images are the **same crop, scale and subject position** so the reveal
  looks like one body changing rather than two photos sliding. [INFERRED from
  DOCUMENTED tells above]
- **Clunky:** laggy divider (JS-thread animation), no grab affordance so users don't
  realise it drags, mismatched framing so the "reveal" is really two different photos
  jumping, and a big centred play/auto-animate that yanks the divider on its own.
  [INFERRED] The auto-reveal animation is the biggest calm risk (see calm notes).

### RN-feasible approach (no heavy deps)
- Stack: `react-native-gesture-handler` `Gesture.Pan()` + `react-native-reanimated`
  shared value for the divider X. Both are **already in this app's stack** (the
  Reanimated/Gesture-Handler pairing is the standard RN slider recipe). [DOCUMENTED]
  (docs.swmansion.com Reanimated "Slider" example; RN gesture handling guide)
- Reveal mechanism: render the "before" image full-frame; render the "after" image
  in an absolutely-positioned overlay whose **width is an animated style** driven by
  the shared value (a right-edge clip). The handle is a thin bar + circular thumb
  positioned at the same shared value. This is exactly how `react-native-before-after-slider`
  works (Reanimated 2 + Gesture Handler, `handleWidth`/`handleColor`/`delimiterIcon`
  props) — useful as a **reference pattern, not a dependency**; that lib pulls in
  `styled-components` (we use `theme.js` tokens) and ships **no accessibility**.
  [DOCUMENTED] (github.com/justin9606/react-native-before-after-slider)
- Snap: snap the thumb to centre on release when within a few px (gives a stable
  "50/50" rest state); clamp travel to the image bounds. [INFERRED]

### Accessibility + calm
- **Accessibility:** the web standard is `role="slider"` on the thumb with
  `aria-valuemin/max/now` + a container label like "Before and after comparison",
  and **keyboard control via arrow keys / Home / End**. [DOCUMENTED] (a11y search
  results; jsdev.space, blocked but corroborated). RN equivalent: on the thumb set
  `accessible`, `accessibilityRole="adjustable"`, `accessibilityLabel`, and implement
  `accessibilityActions` for `increment`/`decrement` so TalkBack/VoiceOver users move
  the divider without dragging; announce position as "showing more of latest photo".
  [INFERRED, mapping the DOCUMENTED web pattern to RN]
- **Reduce Motion:** the first-view nudge animation and any auto-reveal MUST be gated
  on `AccessibilityInfo.isReduceMotionEnabled()` — when on, render the divider at
  centre statically with a visible grab hint instead. [INFERRED]
- **Calm:** no auto-play "reveal" that dramatises the change; the user is always in
  control of the divider. No "transformation" wording on the labels — use neutral
  dates ("12 May" / "3 Jul") not "Before"/"After", which carry judgement. [INFERRED,
  aligned to ED-safe messaging principle] (nedc.com.au ED-Safe)

---

## 2. SIDE-BY-SIDE two-photo layout

### How the best do it
- Two portrait photos placed in equal columns with a **date/label under each**, same
  crop and scale, so posture and framing are directly comparable. This is the
  baseline every progress app ships (GainFrame "side-by-side analysis", Snaptrack
  "basic side-by-side placement", Body Tracker "compare before and after").
  [DOCUMENTED] (gainframe.app roundup; play.google Body Tracker listing)
- Best-in-class adds **auto body alignment** so the subject sits in the same position
  in both frames (GainFrame/Snaptrack), and **synced zoom/pan** — pinch-zoom on one
  panel mirrors the other so you inspect the same region on both. [DOCUMENTED for
  auto-align; INFERRED that synced zoom is the premium extension]

### Premium vs clunky
- **Premium:** identical aspect ratio and letterboxing on both panels, dates rendered
  in the same quiet type token, a thin divider or gutter, and pinch/zoom that keeps
  both photos in lockstep. [INFERRED]
- **Clunky:** different crops/orientations side by side, one photo larger than the
  other, timestamps in inconsistent formats, and independent zoom that makes you lose
  the comparison. Also clunky: cramming both portrait photos into a landscape phone
  frame so each is tiny. [INFERRED]

### RN-feasible approach
- Pure layout: a flex row of two equal-width `Image` panels, `resizeMode="cover"`
  with a fixed aspect ratio box, dates from `dayKey.js`/existing date formatting.
  No new deps. [INFERRED]
- Synced zoom (optional, later): one shared Reanimated `scale`/`translate` value
  driven by a `Gesture.Pinch()`+`Gesture.Pan()` on either panel, applied to both —
  Gesture Handler + Reanimated already present. [INFERRED, DOCUMENTED stack]

### Accessibility + calm
- Each panel is its own accessible element labelled with its date; the pair is grouped
  with an `accessibilityLabel` describing "two photos, [date] and [date]". [INFERRED]
- Calm: side-by-side is the **least dramatising** mode — no motion, no reveal, no
  imposed narrative; the user reads two dated photos. This makes it the safest default.
  [INFERRED, aligned to ED-safe] Avoid any auto-generated "what changed" caption on a
  body photo (see §7 AVOID).

---

## 3. ALIGNED OVERLAY / onion-skin (semi-transparent previous photo)

### How the best do it
- Borrowed wholesale from **animation/stop-motion**: the previous frame is
  superimposed semi-transparently over the current one; the active frame is solid and
  surrounding frames are faded "ghosts". Stop Motion Studio exposes an **opacity
  slider** to control how visible the previous frame is; Dragonframe/Adobe Animate/
  Procreate do the same. [DOCUMENTED] (cateater.com Stop Motion Studio help;
  rebusfarm.net, garagefarm.net onion-skinning guides)
- OnionSkinCapture markets this exact technique for **before/after and transition
  photography** — overlay the previous shot with transparency to hit the same angle.
  [DOCUMENTED] (mwm.ai/apps/onionskincapture)

### Premium vs clunky
- **Premium:** a smooth opacity control (default ~40–50%), a clear toggle for which
  photo is "on top", and alignment aids (edge/silhouette hints) so the two bodies can
  be registered before comparing. [DOCUMENTED opacity-slider pattern; INFERRED for
  the rest]
- **Clunky:** fixed opacity with no control, no way to swap which photo is faint, and
  no alignment aid so the overlay is just a confusing double-exposure. [INFERRED]

### RN-feasible approach
- Trivial: two stacked `Image`s; the top image's `opacity` is a Reanimated shared
  value bound to a simple slider (arrow-key adjustable). Optional pan/scale on the top
  image (Gesture Handler) to nudge it into register. No new deps. [INFERRED]

### Accessibility + calm
- Opacity slider gets `accessibilityRole="adjustable"` with increment/decrement
  actions and a spoken value. [INFERRED]
- **Calm concern:** an overlay/double-exposure of one's own body can read as
  clinical or unsettling for vulnerable users. It is powerful for *alignment* but is a
  **niche comparison mode**, not a default. Keep opacity user-controlled, never animate
  a cross-fade automatically. [INFERRED, ED-safe judgement]

---

## 4. TIME-LAPSE / stitched video of progress photos

### How the best do it
- The headline feature of most transformation apps: capture a photo on a cadence
  (daily/weekly), auto-align them, then **stitch every aligned shot into one smooth
  clip** — "turn months of progress into a transformation video with one tap"
  (Fitness Camera); "seamlessly weave them into an AI-generated time-lapse" (Progress);
  Metamorph's time-lapse is singled out as "genuinely impressive". [DOCUMENTED]
  (play.google Fitness Camera; apps.apple Progress-AI-Timelapse; gainframe.app roundup)
- Alignment is the enabler: Progress shows an **outline of previous photos + a level**
  at capture and **checks lighting, hair, pose, clothing consistency** before it will
  build the video; it also does background removal to keep frames clean. [DOCUMENTED]
  (apps.apple Progress-AI-Timelapse)
- Presentation: exported **pre-formatted for social networks** (share-first framing).
  [DOCUMENTED] (same)

### Premium vs clunky
- **Premium:** requires genuine per-frame alignment + consistent lighting/background,
  otherwise the "time-lapse" is a jittery slideshow. That is a **large engineering and
  UX cost** (registration, background matting, encoding). [INFERRED from the fact that
  the best apps spend most of their feature surface on alignment/consistency]
- **Clunky:** stitching un-aligned photos → strobing, jumping bodies; this reads as
  cheap and, for a body app, distressing. [INFERRED]

### Is it worth it? (for VOLYUME)
- **[INFERRED] Probably not in the near term, and it carries the highest calm risk.**
  Time-lapse is inherently a **"transformation reel"** — its whole social framing is
  the dramatic before→after arc this app's constitution forbids ("no shocking
  transformation framing"). It also needs many consistent frames to look good, needs
  video encoding, and its main payoff is shareable content — which collides with the
  share-card rule (no bodyweight/measurements/body imagery in shares). This is a
  **founder decision, not a default build.** [INFERRED, tied to CLAUDE.md ED-safety +
  share-card rules]

### Accessibility + calm
- If ever built: honour Reduce Motion (offer a static grid fallback), never auto-play
  on screen entry, no music/countdown/"reveal" beat, neutral captions (dates only),
  and it must sit behind the same ED-flag suppression as other weight/body surfaces.
  [INFERRED]

---

## 5. GHOST-OVERLAY AT CAPTURE (frame a new shot against a faint previous one)

### How the best do it
- A **live camera preview with the previous photo composited as a semi-transparent
  guide** so the user lines up the same pose/distance/angle before shooting. This is
  the single most-cited feature across progress apps:
  - **AlignShot:** real-time "Ghost Overlay" camera; place any photo as a
    semi-transparent guide over the live view and **move/scale/rotate it with two
    fingers** to match reality. [DOCUMENTED] (apps.apple AlignShot)
  - **Progress Pics (Then & Now):** ghost overlays align each new photo with the last,
    plus **body-silhouette templates for front/back/side** poses. [DOCUMENTED]
    (apps.apple Progress Pics)
  - **Body Journey / GainFrame / Snaptrack / PhotoJourney:** translucent previous-photo
    guide + pose templates for front/side/back. [DOCUMENTED] (bodyjourney.app;
    gainframe.app roundup)
- Rooted in the same stop-motion mechanic: superimpose the previous capture on the
  **live feed** to align before pressing the shutter. [DOCUMENTED] (cateater.com;
  garagefarm.net)

### Premium vs clunky
- **Premium:** faint guide (~30–40% opacity) + a **level/plumb indicator**, front/side/
  back silhouette templates, and optional two-finger nudge to register the guide.
  This is *upstream* of comparison — good captures make every downstream comparison
  mode look premium. [DOCUMENTED for the features; INFERRED that it's the highest-
  leverage investment]
- **Clunky:** opaque guide that hides the live view, no level, no pose template, so
  users still drift and every later comparison looks like two unrelated photos.
  [INFERRED]

### RN-feasible approach
- Expo managed: `expo-camera` preview with an absolutely-positioned `Image` of the
  previous photo at reduced `opacity` on top. A level can come from `expo-sensors`
  (accelerometer/`DeviceMotion`) driving a small bubble/line. Two-finger nudge =
  Gesture Handler pinch/pan on the overlay. **No new heavy deps**, but confirm
  `expo-camera`/`expo-sensors` are already present before assuming. [INFERRED,
  DOCUMENTED that Expo provides these modules]

### Accessibility + calm
- The overlay is visual-only; provide an audible shutter cue and ensure the capture
  button is a large, labelled target. Screen-reader users can still shoot without the
  guide. [INFERRED]
- **Calm:** ghost-at-capture is **pro-consistency, not pro-drama** — it quietly helps
  same-pose photos and reduces the "I look worse today" noise from framing changes.
  This is the most ED-*friendly* feature here because it improves signal without
  imposing a narrative. [INFERRED]

---

## 6. DATE-RANGE / picker for choosing which two to compare

### How the best do it
- Apps organise photos by **day/week/month** and let the user scroll a timeline;
  GainFrame auto-imports from the camera roll with **de-duplication and date-sorting**
  so the chronology is clean. [DOCUMENTED] (gainframe.app roundup; apps.apple Progress)
- Common quick-pick affordances: **"first vs latest"** as a one-tap default, and two
  date chips ("now vs N weeks ago") the user can each retap to swap either endpoint.
  [INFERRED from the day/week/month + timeline pattern; specific "first vs latest"
  labels are my synthesis]

### Premium vs clunky
- **Premium:** two clearly-labelled date pickers (left photo / right photo), a sensible
  default (latest two, or first-vs-latest), thumbnails in the picker so you choose by
  image not just date, and instant swap. [INFERRED]
- **Clunky:** a single dropdown that forces linear scrolling, no thumbnails, no quick
  "first vs latest", and no way to swap sides. [INFERRED]

### RN-feasible approach
- Horizontal thumbnail strip (`FlatList`) with two selectable endpoints, or two
  bottom-sheet pickers. Dates via existing `dayKey.js`. No new deps. [INFERRED]

### Accessibility + calm
- Each date chip/thumbnail labelled with its full date; selection state announced.
  [INFERRED]
- **Calm:** default to a **modest interval** (e.g. the two most recent, or a user-chosen
  cadence) rather than always "first vs latest", because maximising the visible change
  is exactly the dramatising move to avoid. Let the user choose; don't auto-pick the
  most extreme pair. [INFERRED, ED-safe]

---

## 7. RANKED RECOMMENDATION — for two body photos in a calm ED-safe app

Ranked by value ÷ (build cost + calm risk). Each "build" fork below is a **founder
decision**, not pre-decided here; I flag the safe default and the risks.

**BUILD FIRST (safe, high-leverage):**

1. **Side-by-side, two dated photos (§2).** Lowest calm risk (no motion, no reveal,
   no imposed narrative), lowest build cost (pure layout), and it is the universal
   baseline. Same crop/scale/aspect, quiet date labels (not "Before/After"). This
   should be the **default comparison view**. [INFERRED]

2. **Ghost-overlay AT CAPTURE (§5).** Highest *upstream* leverage: consistent poses
   make every comparison mode look premium and reduce framing-driven "I look worse"
   distress — the most ED-friendly feature in this set. Faint guide + level + front/
   side/back templates. Feasible on Expo with camera + sensors + Gesture Handler.
   [INFERRED / DOCUMENTED feature set]

3. **Before/after slider (§1).** Strong, familiar, feels premium when the two photos
   are pre-aligned and the divider is user-controlled. Buildable on the app's existing
   Reanimated + Gesture Handler stack (reference the OSS lib's clip mechanism; do not
   add it as a dependency — it ships no a11y and pulls styled-components). **Calm
   conditions:** no auto-reveal, no first-view nudge under Reduce Motion, neutral date
   labels, snap-to-centre rest state. [DOCUMENTED stack; INFERRED calm rules]

**BUILD LATER / OPTIONAL (niche or conditional):**

4. **Date/endpoint picker (§6).** Needed once there are enough photos; pair it with
   side-by-side and slider. Default to a modest pair, never auto-pick the most extreme.
   Low cost. [INFERRED]

5. **Aligned overlay / onion-skin (§3).** Keep as an *alignment/inspection* tool with
   user-controlled opacity, not a default. A double-exposure of one's own body is
   powerful but can feel clinical/unsettling; gate it as an advanced option. [INFERRED]

**AVOID / FOUNDER-DECISION-GATED (high calm risk):**

6. **Time-lapse transformation video (§4).** Its entire idiom is the dramatic
   before→after "reel" the constitution forbids, it needs many consistent frames +
   video encoding to not look cheap, and its payoff is shareable body content that
   collides with the share-card rule (no body imagery/measurements in shares). **Do
   not build by default** — surface as an explicit founder decision if ever revisited.
   [INFERRED, tied to CLAUDE.md ED-safety + share-card rules]

7. **AI "what changed" analysis on body photos** (as GainFrame/Snaptrack do). Out of
   scope and constitution-blocked twice over: the coaching engine is deterministic /
   **no AI ever**, and auto-quantifying a user's body is a serious ED-safety hazard.
   **Do not build.** [INFERRED, CLAUDE.md "no AI, ever" + ED-safety]

**Cross-cutting calm/accessibility rules for whatever ships:**
- Neutral, date-based labels; never "Before/After", never "transformation", never a
  score or "% change" on a body. [INFERRED, ED-safe] (nedc.com.au ED-Safe)
- All motion (nudge hints, reveals, cross-fades, time-lapse) gated on Reduce Motion,
  with a static equivalent. [INFERRED]
- Draggable/opacity/divider controls are screen-reader operable via
  `accessibilityRole="adjustable"` + increment/decrement actions, mirroring the web
  `role="slider"` + arrow-key standard. [DOCUMENTED web standard, INFERRED RN mapping]
- All comparison surfaces sit behind the existing ED-flag suppression for
  weight/body-adjacent content; guardrails stay tier-blind. [INFERRED, CLAUDE.md]

---

## Sources
- Slider Revolution — before/after slider design guide: https://www.sliderrevolution.com/design/before-and-after-slider/
- Crocoblock — before/after slider examples & best practices: https://crocoblock.com/blog/wordpress-before-and-after-slider-examples/
- Eleken — 40 slider UI examples: https://www.eleken.co/blog-posts/slider-ui
- Medium (Oshal Urade) — designing the perfect slider component: https://medium.com/@oshalurade/designing-the-perfect-slider-component-f2dff91afa0a
- react-native-before-after-slider (OSS reference): https://github.com/justin9606/react-native-before-after-slider
- React Native Reanimated — Slider example: https://docs.swmansion.com/react-native-reanimated/examples/slider/
- React Native Reanimated — handling gestures: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures/
- AlignShot — Overlay Camera (App Store): https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984
- Progress Pics — Then & Now (App Store): https://apps.apple.com/us/app/progress-pics-photo-then-now/id6758411454
- Progress — AI Timelapse (App Store): https://apps.apple.com/us/app/progress-ai-timelapse/id6477857716
- Body Journey (overlay camera): https://bodyjourney.app/
- GainFrame — 7 best body transformation apps (feature roundup): https://gainframe.app/blog/best-body-transformation-apps/
- Fitness Camera: Progress Photo (Google Play): https://play.google.com/store/apps/details?id=com.fitnesscamera
- Body Tracker — Progress Photos (Google Play): https://play.google.com/store/apps/details?id=com.thumbstonelabs.bodytransformation
- Stop Motion Studio — onion skinning (opacity slider): https://www.cateater.com/help/stopmotion/en/onion-skinning.html
- OnionSkinCapture — before/after & transition overlays: https://mwm.ai/apps/onionskincapture/954164654
- RebusFarm — onion skinning explained: https://rebusfarm.net/blog/onion-skinning-in-animation-what-it-is-how-it-works-and-why-animators-use-it
- CSS Script — accessible before/after comparison slider (touch + ARIA): https://www.cssscript.com/before-after-comparison-slider-support/
- The A11Y Collective — accessible carousels/sliders: https://www.a11y-collective.com/blog/accessible-carousel/
- NEDC — Eating Disorder Safe (ED-Safe) principles: https://nedc.com.au/eating-disorder-resources/ed-safe
- Dribbble — before/after UI/UX inspiration: https://dribbble.com/search/before-and-after-ui-ux
