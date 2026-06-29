# 11 — Workout Sharing & Share Images / Stories

> Competitive teardown, 2026-06-29. Hevy (RN/Hermes v3.1.0) vs Volyume.
> LEARNINGS only — Hevy code/assets are never copied. Hevy evidence is from the
> decompiled Hermes string bundle (`corpus/`), so module/string names are
> corroborated by repeated, consistent fingerprints, not source.

## Sharing — Hevy vs Volyume

Both apps export a branded "I trained" image. The difference is depth: Hevy
treats the share image as an **editable creative surface** (full img.ly photo
editor — fonts, stickers, backgrounds, filters) with **many card archetypes**
and a **built-in social feed** as the primary share target. Volyume produces a
**single deterministic Skia card** (4 archetypes) shared only to the OS share
sheet — cleaner, safer, ED-aware, but creatively closed and feed-less.

### How Hevy does it

Evidence (all from `corpus/bundle_strings.txt`, paths from
`screens_components.txt`):

- **img.ly PhotoEditor SDK is bundled.** `sdk_fingerprints.txt` →
  `RNPhotoEditorSDK`, `photoeditorsdk`, `PhotoEditorLicence`, `PhotoEditorModal`,
  plus `imgly_*` font assets. The editor exposes the standard img.ly toolset:
  strings `ADJUST`, `FILTER`, `FONT`, `FRAME`, `BRUSH`, `Crop`, `Sticker`,
  `FilterOverlay`, `backgroundAlpha`, `SelectBackgroundThemeModal`. So a user can
  drop their card onto a gym photo and add **custom text, stickers, filters,
  frames, brush** before export.
- **A dedicated sharing subsystem**, not a single screen:
  `src/components/smart/WorkoutSharing/ShareableWorkoutMedia/`,
  `ShareableWorkoutMediaViewModel`, `ShareWorkoutScreen`, `ShareWorkoutModal`,
  `ShareWorkoutViewModel`, `ShareAssetsViewModel`, `captureShareableImagePath`,
  `shareableImageRefetch`. There is a separate `ShareablesScreen` + a
  `styleguide/shareables` asset set.
- **Many card archetypes**, each its own composable shareable:
  `ShareableStatCell`, `ShareablePolarChartWidget` (muscle radar),
  `ShareableCalendar`, `ShareableLeaderboardRow`, `ShareableExerciseImage`,
  `SharePersonalRecordsCell`, `ShareTopExercisesPage`, `ShareCalendarAsset`,
  `ShareMonthlyReportModal`. Year-in-Review is a whole deck:
  `YIRCardTotalVolume`, `YIRCardStreak`, `YIRCardBestMonth`,
  `YIRCardPersonalRecords`, `YIRCardMuscleBreakdown`, `YIRCardTopExercises`,
  `YIRCardWorkoutPhoto`, `YIRCardSummary`, `YIRCardSupporter`, `YIRCardThanks`.
- **Card style variants** baked in: `ShareableDarkCard`, `ShareableLightCard`,
  `ShareableTransparentCard`, `ShareablePattern`, plus
  `ShareableBackgroundThemedDiagonalGradient` and a `SelectBackgroundOption` —
  i.e. user picks light/dark/transparent/pattern/gradient theme per card.
- **Share targets are plural and first-class.** Internal feed is the default
  (`normalizedWorkoutToShareableWorkout`, `ShareWorkoutViewModel → feed`), plus
  external: `shareToInstagramStories`, `shareVideoToInstagram`
  (`To share to Instagram Stories you need to provide appId`,
  `shareBackgroundImage` + `shareStickerImage` — the IG Stories
  background+sticker layering API), `shareWorkoutTwitter`, `FacebookStories`,
  `shareToStrava` ("share your Hevy workouts with your Strava community"),
  Apple Health / Health Connect ("This workout is going to be shared to
  Strava/Health Connect"), `Copy Link` (`ShareableLink`), `Download` to
  camera roll. **Video** shareables exist too (`ShareVideoContent`,
  `shareVideoToInstagram`, `backgroundVideoCache`).
- **Card data**: `shareableWorkoutToVolumeKg`, `…ToRepsCount`, `…ToStepsCount`,
  `…ToFloorsCount`, `…ToDistanceMeters`, PRs, top exercises, muscle polar chart,
  `estimatedCalories`, duration, and an attached **workout photo**
  (`YIRCardWorkoutPhoto`, `ShareableExerciseImage`). `Shared by {username}` /
  `ShareablesFooterUsername` puts identity on the card; a
  `ShareableWatermarkedImage` path watermarks (likely free-tier / non-supporter).

### How Volyume does it today (file:line)

- One screen, `src/screens/ShareCardScreen.js`, for all share images.
- **One deterministic Skia renderer** drives BOTH preview and export, so WYSIWYG:
  `src/lib/shareCard/drawShareCard.js:494` (`drawShareCard`), with archetype draws
  `drawSession:250`, `drawPR:321`, `drawMilestone:360`, `drawWeeklyRecap:408`.
  Four card types only (session / PR / milestone / weekly recap):
  `ShareCardScreen.js:63-65`.
- **Formats**: Square 1:1 (default) and Story 9:16 toggle
  (`ShareCardScreen.js:68, 388-407`); weekly recap is square-only (`:89-91`).
- **Background**: optional **camera-only** gym photo as card background
  (`takeGymPhoto:210-227`, `drawImageCover:132`), kept legible by a brand scrim
  in the renderer. Uses CAMERA permission only — no photo-library read.
- **Export path**: render Skia → PNG base64 → write to cache → **OS share sheet**
  via `expo-sharing` (`handleShare:235-264`). Plus a clean HTML→PDF one-page
  summary (`buildPdfHtml:266`, `handleExportPdf:344`).
- **Entry points**: `WorkoutSummaryScreen`, `LiftProgressScreen`,
  `CoachOutputScreen` (weekly recap, the "Great Week" CTA),
  `YearOfLiftsScreen.js:521` (milestone), `AnalyticsScreen`.
- **Brand + safety**: fixed amber/gold palette (`drawShareCard.js` PALETTE),
  Volyume wordmark footer. ED-safety is woven in: `suppress` strips all
  weight/progress language under an ED-pattern flag or calm mode
  (`ShareCardScreen.js:54-56, 470-477`; `greatWeek.js`). Per-card include/exclude
  toggles (date, plan name, volume, exercises, PR weight, previous best)
  with an explicit privacy note that bodyweight/measurements/notes are never on
  the card (`:452-484`).
- **No social feed.** Volyume has no in-app feed; sharing is purely outbound to
  the OS sheet. (The `feed`/`social` grep hits in `src/screens/` are the food
  diary and unrelated.)

### Gaps

1. **No creative editing.** Volyume's card is fixed: one palette, one layout,
   camera-only background, no user text/stickers/filters/frames/theme choice.
   Hevy ships a full img.ly editor. Volyume cards all look identical → lower
   share-worthiness and weaker organic reach.
2. **Few archetypes & no shareable analytics.** Hevy shares muscle polar charts,
   calendars, top-exercises, leaderboards, monthly reports, and a 10-card YIR
   deck; Volyume has 4 card types and YearOfLifts only produces a milestone card.
   The rich data Volyume already computes (muscle split, calendar streaks,
   analytics) is not shareable.
3. **Single, generic share target; no IG-Stories / Strava / link.** Volyume
   dumps a PNG to the OS sheet. No native Instagram Stories
   background+sticker layering, no Strava push, no copy-link, no save-to-gallery
   affordance, no video. Friction and lost reach on the surfaces lifters
   actually post to.

(Lesser gaps: gallery photo pick is blocked — camera-only; no light/transparent
theme; no username/identity option; no watermark/attribution to drive installs.)

### Recommendations (adopt / adapt, size, priority, why)

P1 — do soon, high leverage:

- **Add explicit share targets to the share sheet flow.** Adapt, **S**, **P1**.
  Add "Save to gallery" (`expo-media-library`) and "Copy summary" alongside the
  existing share sheet; add a deep-link to **Instagram Stories** using the IG
  Stories intent with our PNG as the sticker/background image (no img.ly needed).
  Why: biggest reach-per-effort; the OS sheet already half-works. *(Adding a
  dependency — `expo-media-library` — needs founder sign-off per CLAUDE.md.)*
- **Add 2–3 new shareable archetypes from data we already have.** Adopt, **M**,
  **P1**. A muscle-split / volume-by-group card and a calendar/streak card, drawn
  by the existing Skia renderer (new `drawMuscleSplit` / `drawCalendar`). Why:
  reuses the proven WYSIWYG renderer and ED-safe param pipeline; multiplies
  share occasions with no new creative tooling.
- **Light + transparent card themes + a small palette/background-theme picker.**
  Adapt, **S/M**, **P1**. Add a couple of `PALETTE` variants and a theme segment
  (like format). Why: cheap differentiation, makes cards feel personal without an
  editor; transparent PNG composes over IG Stories.

P2 — meaningful, larger:

- **Year-in-Review / monthly-recap deck.** Adopt, **L**, **P2**. A swipeable
  multi-card story (volume, PRs, streak, muscle breakdown, best session) built on
  the Skia renderer. Why: Hevy's YIR is a proven annual virality + retention
  event; Volyume has the data and already has `YearOfLiftsScreen`.
- **Gallery photo as background (not just camera).** Adapt, **S**, **P2**. Allow
  `ImagePicker.launchImageLibraryAsync` behind a clear permission. Why: most
  users want an existing photo; current camera-only is a real friction point.

P3 — defer / evaluate:

- **Full img.ly-style editor (text/stickers/filters).** Evaluate, **L**, **P3**.
  Heavy dependency, licence cost, and it fights Volyume's deterministic-render
  discipline and offline-first/no-PII stance. Prefer a small in-house caption +
  sticker layer on Skia if user demand appears, rather than adopting img.ly.
- **Strava / Apple Health / Health Connect workout push.** Evaluate, **M**,
  **P3**. Useful but a separate integration track from share-images; revisit with
  the wearables roadmap.

### Quick wins

- "Save to gallery" + "Copy link"/copy-summary buttons next to the existing
  Share button (`ShareCardScreen.js:486-522`). *(media-library dep needs sign-off.)*
- Add a **light** theme variant to `PALETTE` and a theme segment control — a few
  hours against the existing renderer.
- Allow **gallery** photo pick as background (one `ImagePicker` call), gated by a
  clear permission prompt — removes the camera-only friction.
- Direct **Instagram Stories** deep-link using the already-rendered PNG as the
  Stories background/sticker image — no new heavy SDK.
- Make the existing **muscle-split / streak** analytics shareable by routing them
  through `drawShareCard` as new archetypes.
