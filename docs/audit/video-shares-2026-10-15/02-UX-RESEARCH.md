# Video shares: UX research (D229, 2026-10-15)

Authority: D229 and its addendum (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`, the last two entries) and the founder's brief (`00-FOUNDER-BRIEF.md`: "very very slick", "a real selling point", "absolute top effort", "don't want to cause clutter so needs to be elegant", and, in the correction, "Built within Volyume itself fully and you share a completed video. Make it work within the area of the photos too so it's still one complete app not a bolt on extra").

This is research and a proposed flow. Nothing here is built, ruled or committed. It was written read-only against the repo (this file is the only write).

**Scope as corrected.** One stage. No Instagram handoff and no outside service. Volyume renders the finished MP4 (clip trimmed, framed, look at its strength, card on top), then offers it the way the photo card is offered. Where the earlier brief asked for a stage 1 / stage 2 split, this report does not make one.

**How to read the evidence.** Each claim carries a tag.
- **[F]** I fetched the page and read its text.
- **[S]** Search summary only. The page itself would not load or was script-rendered, so treat it as a lead, not a fact.
- **[C]** I read it in the repo.
- **[R]** My reasoning. Not from a source.

Pages dated before 2024 are marked as old. Where I found nothing, I say so rather than infer.

---

## 0. Where Volyume stands today (the comparative baseline)

All [C], from `src/screens/ShareCardScreen.js`, `src/components/SharePhotoFramer.js`, `src/lib/shareCard/photoLooks.js`, `photoFraming.js`, `WorkoutSummaryScreen.js` and `SessionSheets.js`.

- **Share screen order, top to bottom:** card-type strip (only when more than one card is available), Format (Story, Square, Portrait, Sticker), Theme (Dark, Light), **Background** (My photo, Camera, No photo; hidden for the Sticker), **Photo look** (a horizontal strip of None plus seven looks, then a Strength slider once a look is chosen), **Preview**, then lifts, highlights, quote, toggles, and three large outline buttons: "Share image" (Instagram and Facebook icons, opens the OS share sheet), "Post to Community" (session, PR and milestone cards only) and "Save to gallery".
- **Looks strip:** tiles 72 dp wide, a 56 dp static thumbnail rendered once per photo (144 px offscreen), name in caption type, amber edge on the active tile. Strength is 0 to 100 %; it shows the number live while dragging and re-processes the image once, on release. Start strength is 80 %, 100 % for the two black-and-white looks. Every look is one 4x5 colour matrix moved `t` of the way from identity plus a vignette of `t` times the full vignette. A matrix is frame-independent, so it applies to a video frame exactly as it applies to a photo.
- **Framing:** pure maths (`{ zoom, cx, cy }`, resolution-free), max zoom 4, min zoom where the whole image fits. `SharePhotoFramer` runs drag and pinch on the UI thread with the card drawn on top as a PNG overlay (`omitPhoto`). The hint under it reads "Drag to move your photo. Pinch to resize it." with a Reset link once moved. None of this depends on the source being a photo.
- **Export width is 1080:** Story 1080 x 1920, Portrait 1080 x 1350, Square 1080 x 1080. All even, so all legal for H.264.
- **No haptics in the three share files** (`ShareCardScreen.js`, `SharePhotoFramer.js`, `LookStrengthSlider.js`; grep found none). The vocabulary exists in `src/lib/haptics.js` (`selection`, `press`, `commit`, `planReady`, `restCountdown`) and is silenced by Reduce Motion.
- **Preview position.** The Preview sits below Background and the Look strip. Its width is capped at 300 dp, so a Story card is 533 dp tall. On a 360 dp phone the first screen is spent on controls before the Preview starts (my estimate from section order and tile sizes, not measured; it needs a measurement on the S22). So today, changing a look means scrolling away from the thing the look changes. Photos tolerate this because the look thumbnails show the result. A playing clip will not.
- **Photo permissions today.** Camera: `launchCameraAsync` after a camera permission request. Library: `requestMediaLibraryPermissionsAsync` then `launchImageLibraryAsync`. `app.json` blocks `RECORD_AUDIO`, `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` on Android, sets `expo-camera` `recordAudioAndroid: false`, and carries an iOS `NSMicrophoneUsageDescription` that says the permission "is never requested". So ruling 4 (silent, no microphone ask) matches the build as it stands.
- **Calm mode and the ED flag today.** The share screen's `suppress` (from `usePhotoSuppression`, fail closed, starts suppressed) strips progress language from the cards. It does not remove the photo background, which is why ruling 6 says the photo behaviour is not changed. The Before and After card, by contrast, is "WITHHELD ENTIRELY" under the same hook, and `ProgressPhotoPrompt` "NEVER" renders under it. The video background therefore follows the progress-photo family, not the photo-background behaviour.
- **Summary.** The share strip under the hero is hidden when calm mode or the ED flag applies. The sticky footer is `Done` (primary, flexible) beside a `Share` pill (amber-edged, minimum 108 dp). The exercise More sheet already carries up to **eleven** rows: Swap exercise, I can't do this, Add exercise, How logging works, Rest length, Reorder exercises, Log per side, Warm-up sets, Use last session, Pair as superset, Shorten session (or Undo shortening).
- **Skia `useVideo` is already in the installed 2.2.12** (`node_modules/@shopify/react-native-skia/src/external/reanimated/useVideo.ts`): `currentFrame` (an `SkImage` per frame), `duration`, `framerate`, `size`, `rotation`, `seek`, `looping` (default true), `volume` (default 0, so silent). One flag: on Android each frame is copied out of its texture before use ("on android we need to copy the texture before it's invalidated"), so the first thing to prove on the S22 is that a filtered preview plays smoothly.

---

## 1. How the best apps do video shares today

Run date 2026-10-15. The honest headline: **no fitness app I could verify offers a native "your clip, filtered and framed, with the stats on top, exported as one finished video" flow.** The one exception is a small competitor, PeakBFF, whose own blog (July 2026) claims a video-as-background recap exported to Photos or the share sheet; it does not describe trim, filters or length, and I could not verify it. The fitness field either (a) attaches a clip to an activity with almost no editing, or (b) hands a transparent stats sticker to Instagram and lets Instagram do the video work. The editing craft lives in the general apps (Instagram, TikTok, CapCut, Apple Photos, Google Photos). That is the opening, and the standard Volyume has to meet is the general apps' editing feel, not the fitness apps' sharing feel.

### 1.1 Comparison table

| App (source, date) | Entry point | Trim | Framing | Filters | Stats overlay on video | Export | Length cap |
|---|---|---|---|---|---|---|---|
| **Strava**, attach a clip ([support](https://support.strava.com/en-us/articles/15401859-how-do-i-add-videos-and-photos-to-my-activity) [F]; [DC Rainmaker, 16 Jun 2022](https://www.dcrainmaker.com/2022/06/strava-adding-support.html) [F, old]) | Activity menu, Edit Activity, Add Photos/Videos; or before saving a recorded activity | None in the app. Anything over the cap is cropped to the first 30 s; Strava tells you to trim in the camera roll first | Portrait, landscape and square all shown; no pan or zoom control found | None found | None on the video | Stays on the activity; muted by default, loops [F, old]. Long-press a thumbnail to set a highlight | 30 s |
| **Strava Sticker Stats** ([BikeRadar, 9 Apr 2025](https://www.bikeradar.com/news/strava-sticker-stats-spring-2025-updates) [F]) | Share on an activity | n/a | n/a | n/a | A transparent sticker (distance, elevation, time, route line) the person places on their own photo or video inside Instagram | Opens Instagram as a Story, or copies to the clipboard; only for Everyone or Followers activities | n/a |
| **Strava Flyover** ([support](https://support.strava.com/en-us/articles/15401641-flyover) [F]) | Play button on an activity | n/a | n/a | n/a | Is itself a rendered 3D map video | Subscriber feature. "For longer activities, the flyover video may take more time to generate" and "You'll receive a push notification once your video is ready". Shares to Instagram Stories or More; respects privacy zones by default | not stated |
| **Hevy**, gym selfie footage ([page](https://www.hevyapp.com/features/gym-selfie-footage/) [F]) | Finish, then "Add a photo / video" (library or camera) | None described | None described | None | None | Shows in the profile feed | Up to 3 images, or 2 images and 1 video; video length not stated |
| **Hevy**, share cards ([page](https://www.hevyapp.com/features/shareable/) [F]) | Share on a screen; Background icon bottom left (light, dark, transparent) | n/a | The person layers the saved PNG over their own video inside Instagram and sizes, positions and tilts it there | n/a | Manual, outside Hevy | Stories button, or More then Save Image | n/a |
| **Nike Run Club** ([help](https://www.nike.com/help/a/nrc-share) [F]) | Activity, three dots, Share | n/a | Photo or poster with "stickers and run data" | not described | Stickers and run data on a photo or poster; video not mentioned | Pick a social channel | n/a |
| **Peloton** ([Meta case study](https://developers.facebook.com/success-stories/peloton/) [F]; [Pelo Buddy, 13 Apr 2021](https://www.pelobuddy.com/peloton-instagram-story-sharing-feature-updated-for-ios-android/) [F, old]; [Connect The Watts, 13 Apr 2021](https://connectthewatts.com/2021/04/13/peloton-begins-beta-test-of-new-instagram-story-sharing-options/) [F, old]) | Share icon on a completed workout, then Instagram | Not described | The 2021 beta offered "a big selfie, a small selfie, or a video"; the person moved the stats bar to where they wanted it | Not described | A movable stats bar over the person's own image or video | Handed to Instagram through Meta's Stories integration (launched Sept 2020, Android Nov 2020). Meta reports 500,000+ Stories from 89,000 members, and over two thirds of members' first social shares went to Stories | not described |
| **Whoop** ([locker](https://whoop.com/ie/en/thelocker/10-whoop-features-you-need-to-know) [S]; [community thread](https://www.community.whoop.com/t/how-can-i-share-a-workout-of-any-kind-with-someone/7320) [S]) | Share arrow on the daily overview | n/a | n/a | n/a | A static stats card | Email, Instagram and so on | n/a |
| **StrengthLog** ([help](https://help.strengthlog.com/?p=916) [F]) | Workout, three dots, "Image for sharing" | n/a | Picks a background and a format | n/a | Chosen stats on a still | Instagram or save to phone | n/a |
| **PeakBFF**, a small competitor ([vendor blog, 25 Jul 2026](https://www.peakbff.com/blog/en/best-app-to-share-gym-workout-videos) [F, vendor claim]) | From the finished session, "choose a share layout" | Not described | Plain card, over a photo, or "select a video as the background" | Not described | The recap sits over the chosen background | Save to Photos or the system share sheet | Not described |
| **Strong, Fitbod, JEFIT, Ladder, Gymshark Training** | I found no video-share or video-overlay feature in any of them (searches returned store listings, not share flows). Absence of evidence, not proof of absence | | | | | | |
| **Instagram Stories and Reels** (help centre pages are script-rendered, so [S]: [filters](https://help.instagram.com/1469029763400082), [record a reel](https://help.instagram.com/2720958398006062); [centre guides, 2017](https://about.instagram.com/blog/announcements/introducing-polls-in-instagram-stories) [S, old]) | Camera in the app, or pick from the library | A slider under a Trim control | Pinch and drag the media [R, from use]; blue guide lines appear when a sticker or text is centred [S, 2017] | Apply after Next, then tap the filter again for a strength slider [S] | Stickers and text on top; centre guides | Share to Story or Reel, drafts | Stories 60 s per segment in most 2026 guides, but they disagree on what happens to longer uploads [S, not Meta's own] |
| **Instagram Edits** ([App Store listing](https://apps.apple.com/US/app/id6738967378) [S]; [Planoly](https://planoly.com/blog/instagrams-edits-app-review) [F]; [NapoleonCat](https://napoleoncat.com/blog/instagram-edits/) [F]) | Create and edit tab, record or add from library | Frame-level trimming [S]; split; zoom the timeline | Layered timeline | Filters, adjust, effects | Text, stickers, overlays as layers | One Export control, top right; save to device or open in Instagram; 4K, no watermark [S] | 10 minutes [F] |
| **TikTok** ([support](https://support.tiktok.com/en/using-tiktok/creating-videos/making-a-post?lang=en) [S]; [newsroom, 16 Dec 2021](https://newsroom.tiktok.com/en-us/new-editing-tools) [F, old]) | Add post, then record or Upload | Adjust clips: trim, split, speed, rotate or zoom per clip [S] | Rotate and zoom per clip [S] | Filters panel with a slider "to preview different filter strengths" [S] | Text and stickers | "Upload HD" toggle for up to 1080p [F, old] | varies |
| **CapCut templates** ([help](https://www.capcut.com/help/use-and-export-templates-in-capcut) [F]) | Template tab, Use template, choose Videos or Photos | Select a segment at the bottom, tap Edit to replace or crop | Crop per segment | Baked into the template | Template text slots | Preview, then Export top right. The help page documents no progress UI; two help pages on exports stuck at 1 % and 99 % blame low storage and the final save step ([1 %](https://www.capcut.com/nl-nl/help/export-stuck-at-the-begin), [99 %](https://www.capcut.com/nl-nl/help/export-stuck) [S]) | not stated |
| **Apple Photos, video** ([Apple Support 104968](https://support.apple.com/en-us/104968) [F]; filter slider [S]) | Open the clip, Edit | Drag the handles on the timeline, tap play to preview; Save Video or Save Video as New Clip; Revert | Crop, straighten | Filters with a strength slider [S] | none | Saves a copy or overwrites, reversible | none |
| **Google Photos, video** ([help](https://support.google.com/photos/answer/10729480?hl=en&co=GENIE.Platform%3DAndroid) [F]; [blog, 11 Feb 2021](https://blog.google/products/photos/new-video-editor-plus-enhanced-editing-features/) [F, old]) | Open the clip, Edit | "Touch and hold, then drag the trim handles" | Crop with an aspect ratio | Filter list, then "Move the dial" for strength | none | "Save" keeps a copy. Filters need 3 GB RAM and Android 8 | none |
| **Volyume today, photo** [C] | Share screen, Background | n/a | Drag and pinch with the card live on top | 7 looks plus None, strength slider | The card itself, WYSIWYG | OS share sheet, Save to gallery | n/a |

### 1.2 What the table says

1. **Fitness apps stop at the sticker.** Strava (2025), Hevy and Peloton all hand a stats layer to Instagram. Peloton's own numbers show why: over two thirds of first-time social shares went to Stories [F]. A person who wants a video with stats on it today does the compositing in someone else's editor. Volyume rendering the finished video itself is not parity with the field; it is ahead of every fitness app I could verify, bar that one unverified vendor claim.
2. **Strava is the cautionary tale on trim.** Thirty seconds, first 30 s kept, no in-app trim, tell people to use the camera roll [F]. Volyume's ruling 3 (15 s cap, start point chosen in the share screen) is a better answer to the same problem.
3. **Every general video app that has filters also has a strength control** (Instagram, TikTok, Google Photos, Apple [S, S, F, S]). Volyume's existing strip plus slider already matches the field here, for free.
4. **Trim is always handles on a strip of frames, with a play-to-preview.** Apple: "Move the sliders on both sides of the video timeline … Tap play to preview" [F]. Google: touch, hold, drag the handles [F]. No general app asks for a trim in a separate screen from the preview.
5. **The export control is singular and sits where the eye ends** (Edits: Export top right [F]; CapCut: Export top right [F]; Apple: Done then a choice of two saves [F]).
6. **Photo and clip share one editor** in Apple Photos and Google Photos [F]: the same Edit mode, the same filter and crop tools, with trim handles appearing only when the thing is a video. That is the pattern the addendum asks for ("inside the photo flow").

### 1.3 What a first-time flow asks

- **Strava, Hevy:** the media picker or the camera, no explanation, no cap warning until after (Strava crops silently to 30 s) [F].
- **Android guidance** ([Requesting permissions](https://developer.android.com/training/permissions/requesting) [F]): ask "in context, when the user starts to interact with the feature", explain why when it is not obvious, offer "a 'cancel' or 'no thanks' button", never nag, never link to settings to change a decision. Volyume's current camera denial toast ("Camera access is needed to add a background", `warning` variant) already meets this.
- **Library picks need no permission on modern phones.** The Android photo picker "is a safe, built-in way for users to grant your app access to only selected images and videos", with a `VideoOnly` mode, on Android 11 and up [F]. This is why `READ_MEDIA_VIDEO` can stay blocked.
- **expo-image-picker's `videoMaxDuration` caps recording, not library picks** ([docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/) [F]), and on Android it "depends on the installed camera app". So a 15 s cap can only be guaranteed by the in-app `expo-camera` view, and a library clip of any length must be trimmed by us, which is exactly ruling 3. On iOS, `preferredAssetRepresentationMode: Current` "avoids transcoding, if possible" [F]; the default may make the picker spend time preparing a clip before we see it.
- **Recording silent:** `expo-camera` has a `mute` prop ("video will be recorded with no sound") and a config-plugin flag `recordAudioAndroid` ([docs](https://docs.expo.dev/versions/latest/sdk/camera/) [F]). Volyume already sets that flag to false.

### 1.4 What makes it feel fast in the field

- **Edit against a live preview, pay for the render once, at the end.** Apple, Google, CapCut and Edits all save or export as a final act [F]. None re-encodes per tweak.
- **Strava Flyover** is the counter-example: the render is slow enough that Strava sends a push notification when it is done [F]. A 15 s clip must never need that.
- **CapCut's support pages for stalls at 1 % and 99 %** point at low storage and the final save [S]. The lesson is not a pattern to copy but two failures to pre-empt: check free space before starting, and treat the last step (the write to the gallery) as part of the progress.
- **Google's own Transformer guidance** says the limit is hardware encoder throughput, that the sample polls progress every 500 ms, and "If the user chooses to back out of an export flow, cancel the export operation … Resources like hardware video codecs are limited, especially on lower-end devices" ([getting started](https://developer.android.com/media/media3/transformer/getting-started) [F], [troubleshooting](https://developer.android.com/media/media3/transformer/troubleshooting) [F]).

---

## 2. Interaction patterns that read as slick in 2026, and why

Each pattern: where it is used, why it reads as slick, what it means for Volyume. I have marked where I could not find a named app doing it.

**P1. A live preview that stays the subject while you edit; one render at the end.**
Used by Apple Photos ("Tap play to preview", then save) [F], Google Photos [F], CapCut (Preview, then Export) [F], Instagram Edits [F]. It reads as slick because the edit loop runs at playback speed and the person decides when the cost is paid. Volyume: Skia `useVideo` plays the clip with the look matrix and vignette; the card is the static overlay PNG on top; nothing is rendered to a file until Share or Save. [R: this is the lead's route in D229 and I found nothing against it.] **The weak point is Volyume's own layout** (section 0): the preview is not on screen while the look and strength are being set. Recommendation in 6.4.

**P2. A filter strip where the main preview does the demonstrating.**
Every general video editor above pairs a strip of filters with a strength control (Instagram tap-again slider [S], TikTok slider [S], Google dial [F], Apple slider [S]). I could not confirm whether any of them play video inside each thumbnail. Reasoning [R]: simultaneous hardware decoders are scarce ("Resources like hardware video codecs are limited, especially on lower-end devices" [F]), so a strip of playing decoders is a risk for no gain. Volyume: keep today's static tiles, but cut them from a frame inside the trim window (not frame zero, which is often a person walking to the bar), and let the live preview above do the moving. A cheaper "alive" option exists in principle (one decoded frame drawn eight times with eight colour filters), and it would be a visible differentiator, but I found no evidence anyone ships it and it needs an on-device battery and jank check. Treat as stretch, behind the static default.

**P3. Pinch and drag with the finished card drawn live on top.**
Instagram's composer shows the media under stickers and text, with "blue lines … to help you center it" (2017, [S, old]). Volyume already ships this for photos (`SharePhotoFramer`) and it transfers unchanged, because `{ zoom, cx, cy }` is resolution-free and a video frame has a width and height. Add two things the photo flow lacks: a thin centre guide line and a haptic tick when the clip's centre meets the card's centre, and a tick at fill (zoom 1) and fit (minimum zoom).

**P4. One primary action; the rest beneath it.**
Edits and CapCut: one Export, top right [F]. Volyume's three share buttons are all `outline` at equal weight [C], so there is no primary. For a clip, the primary is "Share video". "Save to gallery" stays beneath it. "Post to Community" is not shown for a clip (ruling 5). Whether to promote the amber primary on the photo flow too is a coherence decision (D228), flagged in section 8.

**P5. Haptics only at meaningful points.**
Android's haptics principles [F]: "less is more", "Given the choice of buzzy haptics or no haptics … choose no haptics", very frequent events "should be very subtle", and good moments include "a slider snapping into place" and ticks that get "stronger as the interaction reaches a target". I could not confirm what Instagram does at a snap [S: no mention of haptics]. Volyume's rule: one haptic per gesture, through `src/lib/haptics.js` so Reduce Motion silences it. The map is in 6.9.

**P6. A determinate progress ring over the frozen preview, with Cancel.**
I could not find a named app that draws exactly this. It is assembled from sources: Nielsen Norman Group ([Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/) [F]): at 0.1 s feedback is instant, at 1 s the flow of thought holds, at 10 s attention is lost, "percent-done progress indicators should be used for operations taking more than about 10 seconds", prefer a graphic bar to a number alone, and waits over 10 s need "a clearly signposted way … to interrupt". Between 2 and 10 s, a small changing counter is enough. Media3 reports progress and supports cancel [F]. Freezing the last preview frame under the ring keeps the picture the person just composed on screen, so the wait reads as "your card is being sealed" rather than "something is loading". Also, pausing the preview decoder before the export starts frees a hardware codec [R, from the Media3 note].

**P7. Countdown, hands-free record, auto-stop.**
Instagram Reels has a timer that counts down and then records without a tap, and a progress indicator at the top while recording ([S, 2020 to 2021 secondary pages; the countdown is described as 3 s in some and 3 s or 10 s in others; Align may no longer exist]). For the gym this matters more than for a selfie: the phone is propped on a bench and the person has to walk to the bar. See 6.2 on lead-in length.

**P8. One media model for photo and clip.**
Apple Photos and Google Photos use one editor for both and show trim only for video [F]. Instagram's composer takes both from one gallery grid [R, from use, not from a fetched source]. Volyume: one Background row, one looks strip, one framer, one preview. A clip adds exactly three things: a media strip when the workout has clips, a trim bar under the preview, and a play/pause tap. Nothing else changes.

**P9. A handoff that arrives with the sticker already placed.**
Strava Sticker Stats (2025) and Peloton's Stories integration (2020) [F]. The addendum removes the handoff, and rightly: it needs a registered Meta app and ties Volyume's best moment to Instagram's editor. The equivalent feeling comes free from baking the card at the position the person previewed: the shared file is already finished, and works in any app on the OS share sheet.

---

## 3. The clutter risk and where recording can live

### 3.1 Evidence on clutter

- **The founder's own record (D220):** "it's horrible and there's duplication"; "Why for example are there two fucking options for notes nearly touching each other"; "Stupid pill buttons ... ruled against multiple times"; "The toolbar looks stupid"; "Make it all a congruent app!! EVERYTHING … Elegant, all one language" (addenda 7, 14, 15). The standing rule that came out of it: "a logger surface is built from a named house part (the header trio, Card, Button, Chip, TextField, SectionLabel, NavRow, HeaderGlyph, BottomSheet) or it is not built; a new shape needs a founder decision first" (addendum 14). Amber is reserved for the set you are on, a record, Finish and the drain line (addendum 30).
- **The More sheet is already long:** up to eleven rows [C]. A twelfth is a real cost and should be paid with care.
- **The field's workout apps put media after the work, not inside it.** Hevy asks for photos and video at Finish [F]. The only in-set capture I found is Gym Log Track's "Set" album ("can only be taken during a workout set") [F, thin: no entry point or length described]. Exercise.com has an upload in its logger but its support page had no body text [F, empty].
- **Users call out creeping clutter in this category.** A 2026-06-08 App Store review of Boostcamp: "the app has become increasingly cluttered" (quoted in `docs/audit/workout-logger-audit-2026-10-06/05-competitors-set-2-and-user-voice.md` [C]).

### 3.2 Placements considered

| Placement | New pixels in the logger | Discoverable | Fits "named house part" | D229 ruling 2 | Verdict |
|---|---|---|---|---|---|
| **A. A row in the exercise More sheet** | None until opened | Yes, once | Yes: the same sheet-option row (icon, label, description) | Exactly what it permits | **Pick** |
| **B. A row on the summary** | None in the logger | Yes, at the right moment | Yes if it uses `NavRow` (see 3.3) | Permitted, with a geometry change (3.3) | **Pick, with A** |
| C. Long-press on the exercise header | None | No: invisible, needs a custom screen-reader action, and the header already has a tap meaning (jump to or bring back a slot, D220 addendum 34) | No: a gesture is not a named part | Not a toolbar tool, but a hidden affordance for a flagship feature | Reject |
| D. A glyph on the rest strip | One more control on a 44 dp strip | Yes | No new shape allowed | The strip already hides its three controls while a well is typed into so two rows never stack above the keyboard (D220 addendum 30, D5) [C]; a fourth glyph is the crowding the founder rejected | Reject |

**Reasoned pick against ruling 2: A for the in-workout moment, B for the end-of-workout moment.** They are two different uses: A films a lift, B films a pose or a walk-out when the work is done. Both live in surfaces the person already visits, both add no tool and no tab, and the camera is the one new screen the ruling allows.

### 3.3 How to make the twelfth row not feel like a twelfth row

- **Position it with the pre-set helpers**, after "Warm-up sets" and "Use last session". It is something you do just before a set, not an edit to the plan.
- **Give it the two-line form the sheet already uses** (label plus `sheetOptionDesc`) so the cap, silence and privacy promise are read once, in place, and need no extra UI: label "Record a clip", description "Up to 15 seconds, no sound. Stays on this phone." With clips saved, the description becomes the count: "1 saved. Up to 3 for each workout."
- **No badge, no dot, no glyph on the exercise card** when a clip exists. The count in the row description is enough.
- **The summary geometry does not allow a literal "beside the share".** The sticky footer is `Done` (flexible) beside the `Share` pill (minimum 108 dp) inside 12 dp side padding [C]. A third labelled pill of about 120 dp leaves `Done` about 84 dp at 360 dp wide (my arithmetic, [R]). A glyph-only button would repeat the "not at all self explanatory" complaint (D220 addendum 9). Recommended fit: a `NavRow` in the summary's scroll body, under the stats and above "Save this workout to reuse", with the label and the same description line. It is a named house part, adds no pill, and is hidden under calm mode or an open ED flag (section 4).

---

## 4. Privacy and body-image guardrails

### 4.1 What the market does

| Who | What they do | Source |
|---|---|---|
| **Instagram** | Under-18s are placed into an updated 13+ (PG-13) setting by default and cannot leave it without a parent; a Limited Content mode is available; sexually suggestive and similar content is not recommended to teens. Announced 15 Oct 2025, rolling out first in the US, UK, Australia and Canada | [MediaPost](https://www.mediapost.com/publications/article/409920/instagram-begins-pg-13-content-restrictions-for.html) [F] |
| **TikTok** | 13 to 15: private by default, Duet and Stitch limited, their videos cannot be downloaded; 16 to 17: downloads off by default. These are January 2021 changes; I did not find a current page | [TechCrunch, 13 Jan 2021](https://techcrunch.com/2021/01/13/tiktok-update-will-change-privacy-settings-and-defaults-for-users-under-18/) [S, old] |
| **Strava** | Under-18 accounts default to followers-only for profile and activities, messaging disabled, first and last 400 m of a route hidden, no heatmap contribution. The page does not say whether photos or videos are affected | [Strava support](https://support.strava.com/en-us/articles/15401723-your-privacy-control-defaults-when-you-re-under-18-on-strava) [F] |
| **Eating-disorder content** | Beat's senior clinical advice coordinator, as reported: watching body-checking videos is unlikely by itself to cause an eating disorder [S], but "we know from the people we support that it can worsen an existing eating disorder" [F]. TikTok shows support resources on searches for certain ED-linked tags, which the article calls not foolproof [F] | [Dazed, 9 Sep 2022](https://www.dazeddigital.com/beauty/article/56910/1/what-is-body-checking-and-why-is-it-all-over-tiktok) [F, old] |

**The pattern.** Platforms restrict who sees teen content and what teens are recommended. I found none that restricts a teen from recording or editing a clip of themselves; the control point is distribution. Volyume's clips have no distribution inside the app (ruling 5), so the only distribution is the person's own OS share action, which the app cannot and should not police. The live question is therefore not "can a minor record" but "does the app invite body recording, and to whom".

### 4.2 Mapping onto rulings 5 and 6

| Existing Volyume rule | Where it lives [C] | Maps to |
|---|---|---|
| Progress photos "stay on this device and are never uploaded" | `app.json` camera permission text | **Ruling 5.** Clips take the same promise. The same words should be in the first-use primer (6.1), so the app says one thing about photos and clips. Not checked: whether the privacy policy page and store data forms need a clip line (list at the end). |
| Calm mode or an open ED flag withholds comparative and sharing layers of body imagery; fail closed; starts suppressed | `src/hooks/usePhotoSuppression.js`; used by `BeforeAfterShareSheet` ("WITHHELD ENTIRELY") and `ProgressPhotoPrompt` ("NEVER render") | **Ruling 6.** Reuse the hook exactly (calm OR open flag OR any read failure; starts suppressed so the clip sources never flash). Do not write a parallel gate. Under suppression, show no clip sources, no explanation and no trace, matching the strip that "never appears" for flagged people; an explanation would draw attention to the state. |
| "view-your-own-dated-photos and delete stay available; this hook only gates the comparative / weight / share layers" | `usePhotoSuppression.js` header | **A gap in ruling 6 for the lead:** it says clips are "still recorded and kept", but then a clip recorded under suppression has no surface at all. Either give clips a private, deletable home (a quiet row in the workout's history detail, like the photos precedent), or hide the recording rows too. Not decided here. |
| Minors never public | `src/lib/community/ambient.js` (`audienceFor` forces followers; an unreadable profile is treated as a minor), `groups.js`, `connections.js`, others | **Not triggered by clips**, because the Community payload allow-list cannot carry one. I found **no under-18 branch in the share screen, the summary or progress-photo code** (grep for `isMinor`, `is_minor`, `under18` only hits Community and sync). Whether a minor is invited to record a body clip is therefore unruled. The market gives no model to copy (4.1). Flag for the lead. |

### 4.3 Guardrails I recommend adding to the design

1. The summary row follows the progress-photo invitation's rules [C: `ProgressPhotoPrompt` header]: a competence moment only (a finished workout), never tied to a weigh-in, bodyweight or food event, no appearance language, hidden under suppression, and quiet (a row, not a card or a modal).
2. All copy is neutral and about the clip, not the body (6.11). No word of judgement or goal ("physique", "lean", "shredded", "gains").
3. The card on a clip carries the same exclusions as the photo card: no name, bodyweight, measurements or private notes (the existing line under the card stays true).
4. The label "Record a posing clip" in D229 ruling 2 invites body recording by name. I recommend "Record a clip" in every place, with the posing use implied by the summary placement. The voice document asks for observation over inference and for coaches who walk alongside rather than direct [C: `COACHING_VOICE_SYNTHESIS_LOCKED.md` sections 2 and 4]; naming the pose tells the person what to do with their body. The lead can overrule; both strings are in 6.11.

---

## 5. Performance expectations

**What the sources give.** No public number for a 15 s 1080p export on either platform. Google says only that "the limiting factor in Transformer's throughput is hardware MediaCodec encoder throughput for use cases without heavyweight effects processing" [F]. A forum report put one AVAssetWriter H.264 encode at 3 s on iPhone 13 to 16 Pro but without clip length or resolution [S, unusable as a benchmark]. NN/g's limits are the only hard anchors: 1 s keeps flow, 10 s loses attention, percent-done for anything over about 10 s, always a way out [F].

**Design budget [R, to be replaced by device measurements].**

| Quantity | Target | Why |
|---|---|---|
| Time from tapping Share to the OS sheet opening, 15 s Story clip, founder's S22 | 8 s median, 15 s worst case on a mid-range phone | Inside NN/g's 10 s for the typical case; the worst case gets a visible Cancel (always shown anyway) |
| Preview start after choosing a clip | under 1 s to the first frame, then play | A poster frame appears at once; decode follows |
| Look change on a playing clip | under 100 ms (matrix change only) | A matrix and a vignette alpha, no re-decode |
| Strength drag | live number, preview follows continuously | Unlike photos, a clip needs no "re-process on release", because the matrix is applied per frame |
| Size at 1080 x 1920, 30 fps, 15 s | 11 to 19 MB | Arithmetic: 6 Mbps gives 11.3 MB, 8 Mbps 15 MB, 10 Mbps 18.8 MB. D229's "near 20 MB" is the 10 Mbps end. Instagram re-encodes uploads [S, secondary guides], so spending bitrate beyond about 8 Mbps buys little |

**What people tolerate in file size:** I found no consumer research. WhatsApp's video limit is reported as 2 GB since May 2022 ([Dropbox](https://www.dropbox.com/en_GB/resources/send-large-videos-on-whatsapp) [S]), so 20 MB is not a barrier on messaging; the real cost is a person's mobile data when they upload it. Not measured.

**What to show while it runs.**
1. At tap: the preview pauses on its current frame, a scrim of `alpha.strong` goes over it, the controls below dim and stop taking touches (one state, no jump in layout).
2. Centre: a determinate ring (`primaryFill` on a `borderSubtle` track), the percentage in tabular numerals, one line "Making your video", and a quiet text button "Cancel". Progress comes from the platform's own reading (Media3 `getProgress`, polled about every 500 ms in Google's sample [F]; AVFoundation's export session on iOS [R: not fetched]).
3. The screen stays awake for the duration [R].
4. Cancel stops the encoder at once (Media3 asks for this to free the codec [F]) and returns to the same preview, same frame, with nothing to say.
5. Before starting, check free storage. CapCut's stuck-at-99 % pages blame low storage and the final save [S]. A failure reads as one calm line (6.11), never a stack trace.
6. The finished file is cached against a key of clip, trim, framing, look, strength, card choices, format and theme. Tapping Share, then Save, then Share again renders once [R].

**Not recommended: pre-rendering while the person is still adjusting.** It would hold a hardware codec while the live preview decodes (the same scarce resource [F]), and it throws away work on every tweak.

---

## 6. Proposed flow: capture, frame, look, share

British English, calm voice, no em dash, no exclamation mark. Every string is in 6.11. Everything below is one stage. Tokens only (`theme.js`); camera ground uses the sanctioned `camera` token.

### 6.1 In the workout: one row (placement A)

**Where:** the exercise More sheet, after "Warm-up sets" and "Use last session" (3.3). Icon `videocam-outline`, 18 dp, secondary ink, same row part as its neighbours. Description carries the promise.

**First tap ever** (stored once, per device): a small `BottomSheet` with a plain title, two lines and two actions. It is the only explanation the person ever sees, and it also carries the privacy promise before the OS asks for the camera.
- Title: "Clips stay on this phone"
- Body: "Up to 15 seconds, with no sound. Kept with this workout. Never uploaded. Deleted when you delete the workout."
- Actions: "Open camera" (primary), "Not now" (tertiary). Android guidance asks for a way out [F].
- If the OS camera permission is not yet granted, the OS dialog follows "Open camera". Denial is a calm warning toast, same as the photo flow: "Camera access is needed to record a clip". No settings link, no repeat prompt [F].
- Later taps skip the sheet and go straight to the camera.

### 6.2 The camera (the one new screen)

Full-screen `camera` ground, in-app `expo-camera` view in video mode, muted. Portrait only (the Story card is 9:16 and a portrait source gives the most room) [R].

- **Top bar, nothing else:** close glyph at the left (48 dp target, `HeaderGlyph` part), flip-camera glyph at the right. No flash, no zoom pills, no filters, no speed, no timer menu. Flipping during a recording stops it (an `expo-camera` behaviour [F]), so the flip is disabled once recording begins.
- **Start:** one large record control, centred low. Tap it and the numerals "3", "2", "1" appear large in the centre, one tick each. The phone is propped; the person steps to the bar.
- **Lead-in length.** The brief says 3-2-1. A squat rack needs longer, and Reels offers 3 s and 10 s [S, secondary, old]. Recommendation: the countdown is 3 s by default, and a single quiet text control beside the record button reads "3 s" and cycles to "10 s" on tap, remembered. One control, no menu. This is the only addition to the brief; drop it if it reads as clutter.
- **Recording:** the countdown numerals give way to a 2 dp amber line along the very top edge that fills left to right over 15 s. It is the same mark as the rest timer's drain line and the logger's toolbar line (D220 addendum 19), so it needs no new vocabulary. A small elapsed time ("0:07") sits under it in tabular numerals. The record control becomes a stop control.
- **End:** it stops itself at 15.0 s, or on a tap. Under 1 s is discarded silently. The close glyph during a recording discards it without a confirmation (it is 15 s of footage).
- **No review screen.** The camera closes and the person is back where they were, because a rest timer may be running. A toast: "Clip saved to this workout", action "Undo".
- **Keep awake while the camera is open** [R].

### 6.3 At the end of the workout: one row (placement B)

A `NavRow` in the summary's scroll body: label "Record a clip", sub "Up to 15 seconds, no sound. Stays on this phone." Hidden under calm mode or an open ED flag (same hook, starts hidden). After recording from the summary, the camera does not return to the summary; it opens the share screen with the new clip already chosen as the Background. This is the shortest honest path to the payoff and the only place the app takes a person somewhere they did not ask to go; the Back gesture returns to the summary.

### 6.4 The share screen: one Background row for photos and clips

**Segments, replacing "My photo / Camera / No photo":** `Gallery`, `Camera`, `Workout`, `None`. `Workout` appears only when this workout has at least one clip, so a person without clips sees three segments, as now. "My photo" cannot stay because it would be wrong for a video; "Gallery" echoes "Save to gallery" already on this screen. This turns D229's three clip sources into three behaviours, not three new buttons:
- `Gallery`: the system picker with photos and videos together. A video over 15 s lands in the trim state (6.5).
- `Camera`: opens the same in-app camera as 6.2, with a two-position switch "Photo | Clip" (default Photo so today's behaviour is first). Opening it from the workout rows opens in Clip only. Replacing the system camera for photos is a change to the photo path; the lead can keep the system camera for photos and show a one-line choice only when clips are available, at the cost of an extra tap.
- `Workout`: a media strip appears under the row with up to three tiles, newest first, in the looks strip's own grammar (72 dp tile, 56 dp thumbnail, amber edge when chosen), each with a duration badge ("0:12"). A fourth recorded clip replaces the oldest, and the More-sheet row says so at three (6.11).

The section label "Photo look" becomes "Look". Nothing else in the looks strip or the Strength slider changes.

**A pinned mini preview while the real one is off-screen** (my recommendation for the structural problem in section 0). Once a background is set and the main Preview has scrolled out of view, a small live preview (about 96 x 170 dp for Story, same renderer) is pinned at the top beneath the header, with a play/pause tap. It appears only while it is needed and vanishes when the real Preview is back in view. It helps photos as much as clips, adds no section and changes no order. The alternatives are reordering the screen (Preview first, which at 533 dp of preview leaves the controls off-screen instead) or a full-screen editor (a new screen, which ruling 2 excludes). Needs a measurement and a founder look.

### 6.5 Trim and framing: the same gesture, one extra bar

**The Preview is the framer.** The clip plays looped, silent, inside the card shape, with the finished card on top. The person drags to move and pinches to resize, exactly as for a photo (`{ zoom, cx, cy }`). The hint line under it for a clip: "Drag to move. Pinch to resize. Tap to pause." Reset still means centre the framing.

**What snaps** (each with one haptic):
- the clip's centre meets the card's centre (a thin centre guide line appears for the length of the contact);
- zoom reaches fill (the clip just covers the card);
- zoom reaches fit (the whole clip is inside the card). These two exist already in `photoFraming.js` as `1` and `minZoomFor`.

**Under the Preview, a trim bar, shown for clips only.** A strip of frame thumbnails across the width with a window over it. The window has a handle at each end and a thin amber playhead that moves as the clip plays. Dragging a handle shortens; dragging the window slides it. Rules:
- The window is never wider than 15 s. A longer clip opens with the window on 0:00 to 0:15 and the caption "15 seconds of 42. Slide to choose where it starts." (ruling 3: "start point chosen by the person").
- A clip of 15 s or less opens at its full length and can be shortened. Minimum length 1 s.
- The playback loops inside the window. Dragging a handle or the window scrubs: the preview shows that frame; on release it plays again from the window's start.
- The duration shows at the bar's end in tabular numerals ("0:12").
- Screen readers get the bar as an adjustable control: "Trim. Start 0:03, end 0:15" with actions to move either end by one second.
- Reduce Motion on: the clip opens paused on its first frame with a visible play glyph and plays on tap [C: `styling.md` says motion is replaced, not removed; R: an auto-looping preview is moving content a person must be able to stop].

### 6.6 The look, live

The strip and slider are today's. What is new: the preview above plays in the chosen look as soon as a tile is tapped, and the Strength slider moves the picture live as the thumb moves, because the matrix is applied per frame (no "re-process on release"). Thumbnails are static frames cut from inside the trim window (P2). Start strengths stay as `startStrengthFor` says. One haptic on a tile change (`selection`). No haptic during the slider drag except at 0 and 100.

### 6.7 The card on top, and legibility over moving footage

The card is the same static overlay as for a photo. **One thing must change underneath it:** the card's scrim is built from the photo's average tone in the measured text bands (`sampleAverageTone`, `drawPhotoScrim`, SCRIM_LEGIBILITY_LUMINANCE_FLOOR 130) [C]. A clip's tone changes through the loop. If the scrim is computed from one frame, white text can sit on a bright later frame and fail. Sample several frames across the trim window (and re-sample when the trim, framing or look changes), and drive the scrim from the brightest band. Without this, a clip will look slick on the first frame and unreadable on the fifth second. [R, derived from the code]

### 6.8 Share, Save, and the export

**The actions, in order, beneath the toggles:**
- **Share video** (primary when a clip is the background; icon and trailing icon as today: Instagram and Facebook), opens the OS share sheet with an `video/mp4` file. This is the existing "Share to Story" action; the sheet is the OS's.
- **Save to gallery** (as today).
- **Post to Community** is not shown for a clip.

(The addendum lists Share, Save to gallery and Share to Story as three. In the code today the share button and the Story button are the same button; I have kept that, with the story framing carried by the icons and the screen-reader label as now.)

**Tap Share video or Save to gallery:**
1. Preview pauses on its current frame, scrim over it, the ring and "Making your video" appear (section 5). One haptic: `commit()`.
2. Ring fills from the platform's progress. "Cancel" is always there.
3. Done: for Share, the OS sheet opens straight away (as it does for the photo). For Save, the toast "Saved to your gallery" (as today). One success haptic (`planReady`).
4. The preview resumes playing where it was. The cached file makes a second action instant.
5. Failure: "Couldn't make the video, try again" with the preview restored; low storage: "Not enough space to make the video. Free some up and try again."

### 6.9 Haptic map (all through `src/lib/haptics.js`, silenced by Reduce Motion)

| Moment | Haptic |
|---|---|
| Countdown 3, 2, 1 | three light ticks |
| Recording starts | `commit()` |
| Recording stops (auto or tap) | `selection()` |
| Trim handle meets the 15 s limit or the clip end | `selection()` |
| Framing snaps to centre, fill or fit | `selection()` |
| A look tile is chosen | `selection()` |
| Share video / Save tapped | `commit()` |
| Export finishes | `planReady()` |

Nothing else vibrates. A new named helper for the countdown is worth adding to `haptics.js` rather than reusing `restCountdown`, whose 3-2-1 ladder (medium, heavy, heavy plus warning) already means "rest is ending" and would teach the wrong thing.

### 6.10 First-run moments, complete list

1. First "Record a clip" tap: the privacy sheet (6.1), then the OS camera prompt if needed. Never again.
2. First clip on the share screen: nothing new. The hint line and the trim bar are self-describing. No coach mark, no overlay.
3. First export: no extra copy unless it passes about 10 s, when the line under "Making your video" becomes "Still working. Keep Volyume open." Whether Android survives the app going to the background mid-export is not established (end of this report).
4. Calm mode or an open flag: nothing at all (4.3).
5. What's New (per the standing version rule): the privacy line inside the Community line. Not designed here.

### 6.11 Strings

All British English, calm, no em dash, no exclamation mark.

| Where | String |
|---|---|
| More sheet row label | Record a clip |
| More sheet row description, none saved | Up to 15 seconds, no sound. Stays on this phone. |
| More sheet row description, 1 or 2 saved | 1 saved. Up to 3 for each workout. (2 saved. ...) |
| More sheet row description, 3 saved | 3 saved. A new clip replaces the oldest. |
| Row accessibility label | Record a clip of this exercise |
| Primer title | Clips stay on this phone |
| Primer body | Up to 15 seconds, with no sound. Kept with this workout. Never uploaded. Deleted when you delete the workout. |
| Primer actions | Open camera / Not now |
| Camera permission denied | Camera access is needed to record a clip |
| Camera, lead-in control | 3 s / 10 s |
| Camera, record control, accessibility | Start recording in 3 seconds / Stop recording |
| Camera close, accessibility | Cancel recording |
| After recording, toast | Clip saved to this workout (action: Undo) |
| After recording, 4th clip | Clip saved. The oldest one was replaced. |
| Summary row label | Record a clip (alternative per D229: Record a posing clip) |
| Summary row sub | Up to 15 seconds, no sound. Stays on this phone. |
| Background segments | Gallery / Camera / Workout / None |
| Camera switch (share screen) | Photo / Clip |
| Clip tile, accessibility | Clip, 12 seconds |
| Section label | Look |
| Hint, photo (unchanged) | Drag to move your photo. Pinch to resize it. |
| Hint, clip | Drag to move. Pinch to resize. Tap to pause. |
| Long clip caption | 15 seconds of 42. Slide to choose where it starts. |
| Trim bar, accessibility | Trim. Start 0:03, end 0:15 |
| Share action | Share video |
| Share action, accessibility | Share to Instagram or Facebook Story |
| Save action | Save to gallery (unchanged) |
| Export caption | Making your video |
| Export long wait | Still working. Keep Volyume open. |
| Export cancel | Cancel |
| Export error | Couldn't make the video, try again |
| Export, no space | Not enough space to make the video. Free some up and try again. |
| Clip unreadable | Couldn't open that clip, try another |
| Video unsupported on the device | Video backgrounds aren't available on your device. |
| Privacy line under the media strip | Clips stay on this phone unless you share them. |

---

## 7. What to prove on the founder's phones before the design is judged finished

All [R], ordered by how much of the design they carry.
1. A filtered Skia `useVideo` preview plays smoothly on the S22 with the card overlay and a drag or pinch in progress (the Android texture copy).
2. Seeking and scrubbing latency on the trim bar; a 4K or 60 fps HEVC library clip does not stall the preview.
3. Frame thumbnails for the trim bar and the looks tiles can be produced without a new dependency (no frame-extraction package is installed; Skia `seek` plus `nextImage` is the candidate).
4. Export time and size for 15 s at each format on the S22 and an iPhone, against section 5.
5. The exported MP4 is accepted by Instagram's composer through the OS sheet at 1080 x 1920 with no re-trim (not established).
6. `expo-camera` records muted without a microphone prompt on iOS, with the existing `NSMicrophoneUsageDescription` string.
7. Four Background segments hold at the phone's maximum accessibility text size (D104-3).

---

## 8. Decisions for the lead

1. **Label:** "Record a clip" everywhere, or "Record a posing clip" on the summary as D229 words it (4.3).
2. **Summary placement:** a `NavRow` in the scroll body rather than a third footer pill (3.3).
3. **Under suppression:** what happens to clips recorded while calm mode or the flag is on (4.2, row 3); and whether the summary row is offered to under-18s (4.2, row 4).
4. **Background row:** rename "My photo" and "No photo" to "Gallery" and "None" (6.4).
5. **Camera for photos:** move photo capture into the new in-app camera, or keep the system camera for photos (6.4).
6. **Lead-in length:** 3 s only, or 3 s with a remembered 10 s (6.2).
7. **Four clips:** a fourth recording replaces the oldest (6.4), or recording is blocked at three with a calm line.
8. **Promote the primary:** make "Share" the amber primary on the photo flow too, so the two are one piece (P4), a coherence-programme (D228) call.
9. **Pinned mini preview:** build it for both photos and clips (6.4).
10. **Scrim over moving footage:** sample across the trim window (6.7). I would treat this as not optional.

---

## 9. What I could not confirm

- Whether Strong, Fitbod, JEFIT, Ladder, Gymshark Training or Whoop have any video share. Searches returned store listings and nothing about it. I have said "not found", not "does not exist".
- Peloton's current (2026) share flow. The details I have are from April 2021 and the Meta case study (launched September 2020).
- Instagram's own help-centre text for filters, trim and Stories length: the pages are script-rendered, so the filter-strength, trim-slider and timer details are search summaries, and the Stories limit is disputed between guides (15 s segments in one, 60 s in most).
- TikTok's current under-18 defaults (I found 2021 articles) and whether Meta's teen settings have reached beyond the four launch countries.
- Whether any app plays video inside filter thumbnails; whether Instagram uses a haptic at its centre snap; whether any named app draws a progress ring over a frozen preview. The last two patterns are assembled from NN/g, Material and Media3, not copied.
- Apple's Human Interface Guidelines pages for haptics and progress indicators returned only their titles. I used NN/g and Android's haptics principles instead.
- Any public export benchmark for a 15 s 1080p clip on Media3 Transformer or AVFoundation. Section 5's targets are reasoning.
- Consumer tolerance for video file size. Only arithmetic and one secondary report on WhatsApp's limit.
- Whether an Android export survives the app being backgrounded (the Media3 pages I fetched do not say whether a foreground service is needed).
- Whether `requestMediaLibraryPermissionsAsync` returns granted on Android 13 and up with `READ_MEDIA_*` blocked. The photo path already depends on it and works; a clip inherits the same call; I did not verify the return value.
- Whether iOS needs the microphone permission to record a muted video through `expo-camera`.
- How the profile stores age, and so how cheaply an under-18 rule could be applied to the summary row. I found no existing branch in the share or progress-photo code, only in Community.
- Whether the volyume.app privacy page, the Play data-safety form and the App Store privacy label need a line for clips. They stay on the device and are never collected, so a declaration change is unlikely, but I did not check the documents.
- UK regulatory context for under-18s (ICO Children's Code, Online Safety Act): not researched.
- The measured pixel height of the controls above the Preview on a real phone (section 0 is an estimate from tile sizes).
