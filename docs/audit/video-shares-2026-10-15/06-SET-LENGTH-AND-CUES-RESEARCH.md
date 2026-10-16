# 06 Set length and cues: research lane

Researched 2026-10-16 for the Volyume share-video feature (one set filmed upright on a propped phone, silent, kept on the phone, shown behind the data on a share card whose video window is 15 seconds). Research only: no source file was edited and nothing was run in the app. The two questions behind it are the founder's: whether a 15-second camera cap covers a real set, and which cues suit a phone propped away from the lifter.

## 0. Tags and findings in brief

- `[S#]` observed in a source I fetched and read (numbered list in section 8, with URLs). `[S#*]` observed only in a search-result excerpt because the page refused my fetch or rendered blank; treat as second-hand. `[I]` inferred by this lane (reasoning or arithmetic, no source says it).
- A 15 second cap cuts nearly every ordinary set. In my model (1.5) it cuts 98 to 100 sets in 100, 30 s cuts 68 to 94, 60 s cuts 9 to 31, 90 s cuts 1 to 4, and 120 s cuts about none `[I]`. The per-repetition times that drive this are well sourced (about 2 s fast, 4 s controlled, 6 s slow tempo). The walkout, set-up and re-rack times are not given in seconds by any source I could reach, so they are `[I]`, anchored on the one-minute competition allowance `[S7]`.
- No form-check or bar-speed app I found documents a cap on a recorded set. Metric starts and stops by hand and films in portrait `[S15][S16]`. The only numeric clip limit found is Barbell tracker GT, 2 to 10 seconds `[S24*]`. Every social platform's cap is 60 seconds or more `[S26][S27][S28]`, so none of them is a reason for 15 seconds.
- expo-camera 17.0.10: `maxDuration` works on both platforms; `videoBitrate` works on both but on iOS only when a codec is passed (the screen already passes `avc1`); `selectedLens` and `getAvailableLensesAsync` are iOS only; Android `zoom` is clamped at 1x so it cannot reach an ultra-wide; there is no property that says whether a torch exists `[S37]`.
- Geometry decides the cues `[I]`: with the back camera the screen faces away from the lifter and the torch faces the lifter; with the front camera the reverse, and phones generally have no torch on the front. A cue set therefore differs by camera.
- Torch cadence of one short pulse per second is a third of the WCAG and Ofcom ceiling of three flashes in any one second `[S56][S57*]`.
- One risk found: a forum report of the camera freezing when the torch is on with the ultra-wide lens on iPhone 13 Pro, 15 and 15 Pro, still reported on iOS 26, with no Apple reply `[S44]`.

## 1. How long a set takes

### 1.1 Seconds per repetition (sourced)

| Anchor | Value | Tag |
|---|---|---|
| ACSM 2009, moderate velocity for the untrained | "2 s for concentric action and 2 s for eccentric action", so 4 s per rep; the position stand gives 1 to 2 s per phase (2 to 4 s per rep) for intermediate and advanced lifters (secondary copies only) | `[S4*]` |
| Chaves et al. 2020 (untrained men, 3 sets to failure at 70% 1RM) | controlled 2 s up and 2 s down = 4.0 s per rep; self-selected 1.8 s per rep in Table 1 (the text of the same paper says 1.5 s : 1.5 s, which would be 3 s; I could not reconcile the two); reps per set self-selected 14.4, 11.3, 9.4, controlled 9.7, 7.8, 6.6 | `[S1]` |
| Schoenfeld, Ogborn, Krieger 2015 meta-analysis | rep durations from 0.5 to 8 s gave similar hypertrophy; durations above 10 s per rep looked inferior | `[S3*]` |
| Wilk, Zajac, Tufano 2021 review | single-contraction classes: fast 1 to 2.9 s, medium 3 to 5.9 s, slow 6 to 9.9 s; time under tension per set "between 2 and 20 s" for strength and "between 20 and 70 s" for hypertrophy | `[S2]` |
| Coaching sites | 8 to 12 reps is 40 to 70 s of tension; a 3-1-2 tempo is 6 s per rep so 10 reps is 60 s; a 4 s rep over 12 reps is 48 s | `[S6*]` |
| Heavy single, bench | total concentric time 3.35 to 4.05 s depending on breathing method (24 men, 1RM); the figure is the sum of the paper's pre-sticking, sticking and post-sticking means | `[S5]` |

### 1.2 Before the first rep and after the last

No source gives these in seconds. Fragments I found: after unracking, "take a second find your balance" `[S8]`; the walkout is two steps, sometimes a third `[S9]` (three in `[S8]`); in competition a lifter has "one minute from the calling of his/her name to the starting of the attempt" covering set-up, unrack and walkout, and "the clock shall stop when the lifter starts the lift properly"; the squat waits "motionless" for the referee's signal and, at lockout, for the signal to replace the bar `[S7]`. Coaching sources describe the set-up as a sequence without a duration `[S13*]`. The figures below are my estimates `[I]`, bounded above by that one-minute allowance.

| Lift | Before first rep, low / typical / high (s) | After last rep, low / typical / high (s) | Basis `[I]` |
|---|---|---|---|
| Barbell squat | 5 / 10 / 20 | 3 / 6 / 10 | unrack, one-second settle, 2 to 3 steps, brace; walk forward and re-rack |
| Bench press | 3 / 6 / 12 | 3 / 4 / 6 | lift-off, settle at lockout; re-rack |
| Deadlift | 4 / 8 / 15 | 2 / 3 / 6 | hinge, grip, take out slack, brace; lower and let go |
| Machine, dumbbell, cable | 2 / 5 / 10 | 2 / 4 / 8 | sit or pick up and settle; put down |

A further 2 to 8 s applies for the walk from the phone to the bar when the countdown ends before the lifter arrives; a 3 second countdown does that for a squat or deadlift `[I]`.

### 1.3 Set length by rep range

Per-rep assumptions `[I]` built on 1.1: one rep 3 / 5 / 8 s (heavy, deliberate, includes a pause); 3 to 5 reps 2.5 / 4 / 6 s each; 8 to 20 reps 2 / 3.5 / 5.5 s each. Work time is reps times that. "Total" adds 1.2 with triangular draws (200,000 draws per mix in 1.5 and 40,000 per row here, from a short script I ran in the scratchpad, not part of the repo).

| Reps | Work only, low / typical / high (s) | Squat total, 5th / 50th / 95th percentile (s) | Squat share cut at 30 / 45 / 60 / 90 s | Machine or dumbbell total, 5th / 50th / 95th (s) | Machine share cut at 30 / 45 / 60 / 90 s |
|---|---|---|---|---|---|
| 1 | 3 / 5 / 8 | 18 / 23 / 30 | 4 / 0 / 0 / 0 % | 12 / 16 / 20 | 0 / 0 / 0 / 0 % |
| 3 | 7.5 / 12 / 18 | 24 / 30 / 37 | 53 / 0 / 0 / 0 % | 18 / 23 / 28 | 1 / 0 / 0 / 0 % |
| 5 | 12.5 / 20 / 30 | 31 / 39 / 47 | 97 / 11 / 0 / 0 % | 25 / 31 / 38 | 60 / 0 / 0 / 0 % |
| 8 | 16 / 28 / 44 | 37 / 47 / 59 | 100 / 62 / 3 / 0 % | 30 / 39 / 50 | 95 / 21 / 0 / 0 % |
| 10 | 20 / 35 / 55 | 42 / 54 / 68 | 100 / 88 / 26 / 0 % | 35 / 47 / 60 | 100 / 59 / 5 / 0 % |
| 12 | 24 / 42 / 66 | 47 / 62 / 78 | 100 / 97 / 57 / 0 % | 40 / 54 / 70 | 100 / 84 / 27 / 0 % |
| 15 | 30 / 52.5 / 82.5 | 55 / 73 / 92 | 100 / 100 / 87 / 8 % | 48 / 65 / 84 | 100 / 98 / 67 / 1 % |
| 20 | 40 / 70 / 110 | 68 / 91 / 117 | 100 / 100 / 99 / 52 % | 60 / 83 / 109 | 100 / 100 / 95 / 33 % |

Cross-check: typical work for 8 to 12 reps (28 to 42 s) sits at or just under the 40 to 70 s coaching figure and the 20 to 70 s review figure `[S6*][S2]`; the fast end of 14 reps at 1.8 s (25 s) matches Chaves `[S1]`. A 15 second cap keeps a single on a machine whole about 4 times in 10; from 3 reps up, nearly every set with its walkout and re-rack runs past 15 s `[I]`.

### 1.4 Long forms

- Myo-reps: an activation set of 8 to 30 reps stopping 1 to 2 short, rests of "max 30 seconds" or 3 to 5 breaths, mini-sets of 3 to 5 reps, up to 5 of them; the author's leg-extension example ends in "less than 2 minutes" `[S10]`. In a bench-press study the whole protocol (40 s rest, then 20 s rests, up to 5 mini-sets) took 126.9 s against 331.9 s for three straight sets with 120 s rests `[S11]`.
- Rest-pause: rests of about 15 to 30 s between segments `[S12*]`. Drop sets: no timing source found; two or three drops of 8 to 12 reps at 3.5 s per rep plus 5 to 10 s to change the load is 90 to 150 s `[I]`. AMRAP: a 20-rep set is in the table (40 / 70 / 110 s of work); a long AMRAP of 30 or more reps would exceed 2 minutes `[I]`.
- The share window stays 15 s, so these forms depend on the trim bar choosing the part to show `[I]`.

### 1.5 Share of ordinary sets cut by each cap

No source gives a distribution of reps per set (the Boostcamp report of one million logged workouts carried none on the page I read `[S14]`), so the three mixes are assumptions `[I]`. A: 1 to 2 reps 3%, 3 to 5 reps 17%, 6 to 8 reps 25%, 9 to 12 reps 43%, 13 to 15 reps 8%, 16 to 20 reps 4% (lifts: squat 25, bench 25, deadlift 10, other 40%). B leans to strength (reps 1 to 5 about 55%; lifts 30 / 30 / 20 / 20%). C leans to high reps (reps 12 and up about 50%; lifts 20 / 15 / 5 / 60%).

| Mix, cut share including walkout and re-rack | 15 s | 30 s | 45 s | 60 s | 75 s | 90 s | 120 s | Total 50th / 90th / 99th pct (s) |
|---|---|---|---|---|---|---|---|---|
| A mixed | 99% | 88% | 54% | 19% | 6% | 1.8% | 0% | 46 / 68 / 97 |
| B strength-leaning | 98% | 68% | 29% | 9% | 3% | 0.9% | 0% | 36 / 59 / 89 |
| C high-rep leaning | 100% | 94% | 68% | 31% | 12% | 4.1% | 0.1% | 52 / 78 / 106 |
| A, work only (no walkout, no re-rack) | 91% | 60% | 22% | 6.5% | 2.1% | 0.6% | 0% | not computed |

Reading it `[I]`: the cap that keeps nearly every ordinary set whole including the walkout is 90 seconds (1 to 4 cut in 100, mostly 15 to 20 rep work and slow tempos); 2 minutes keeps essentially all, including a myo-rep or drop-set run. 60 s still cuts 9 to 31 in 100. Because the model's errors are in the lead-in, the tail and the mix, the cap is better judged on the 99th percentile (89 to 106 s) than on any single share.

## 2. What others cap at

### 2.1 Bar-speed and form-check apps

| App | What the source says about recording | Tag |
|---|---|---|
| Metric VBT | "Tap Record, do your set, then tap Stop"; no maximum recording length stated; no countdown, sounds or trimming mentioned; "Film in portrait"; warns when "The video ran below 50 fps"; "Record at 720p" if processing is slow; free plan keeps the set video 24 hours | `[S15][S16]` |
| Qwik VBT | import a video, "in-app trimming"; "In app recording" arrived in versions 1.4.4 to 1.4.5; the validation study trimmed each clip to start "approximately 5 seconds before the start of each repetition" and end "roughly one second after" the bar was returned | `[S17][S18]` |
| WL Analysis | video analysis with frame-by-frame playback, "Camera framerate picker" (1.3.8), external camera support; no length limit documented on the store page or site | `[S19]` |
| Iron Path | analysis screen offers recording a video or opening one already saved (a university tutorial); no limit stated; its store page returned 404 | `[S20*]` |
| Barbell tracker GT | "The length of movie must be in 2 - 10 seconds for stable operation"; trimming in the Photos editor suggested | `[S24*]` |
| OnForm | up to 240 FPS, pause and resume inside one video; no maximum stated | `[S25*]` |
| RepOne, Vmaxpro (now Enode), Enode | sensor or tether hardware, not video; RepOne can attach videos to sets with no limit stated; their set start and stop rules were not on pages I could read | `[S21][S22][S23*]` |

So the only numeric clip limits found are tiny (2 to 10 s, for an analysis engine, not a recorder). The apps that record leave the stop to the person, which suits one set per take `[I]`.

### 2.2 Native camera apps and social platforms

- iPhone Camera: 1080p HD at 30 fps is the default setting `[S32*]`; I found no time cap other than storage `[I]`. Its timer is for photos; there is no native video timer, and a Shortcuts workaround "flashes once, then the recording begins" `[S47*]`. Pixel and Samsung defaults were not found at a primary source.
- Social platforms for a vertical video, 2026. Instagram's creators blog (21 January 2025): US creators can publish reels "up to 3 minutes long in the Reels editor" `[S27]`. Third-party 2026 pages say up to 20 minutes in-app or uploaded `[S28]` and, conflictingly, 90 seconds for most accounts `[S29]`; Instagram's help page reportedly says 20 minutes recorded, 3 minutes recommended `[S31*]`. Stories: 60 seconds per clip `[S28][S29]`. YouTube Shorts: "up to 3 minutes" `[S26]`. TikTok: 10 minutes in-app and 60 minutes upload per a third-party table `[S28]`; TikTok's own community pages disagree between 3 and 10 minutes `[S30*]`. The shortest cap anywhere is 60 s, so a share window of 15 s comes from the card design, not from a platform `[I]`.

### 2.3 What a long recording costs on the phone

Megabytes are megabits per second times seconds divided by 8 `[I]`; audio is absent because the view is muted `[S37]`.

| Bitrate | Per second | 15 s | 30 s | 60 s | 90 s | 120 s | Where it comes from |
|---|---|---|---|---|---|---|---|
| 4 Mbps | 0.5 MB | 7.5 MB | 15 | 30 | 45 | 60 | a 720p-class rate; no source gives a 720p default `[I]` |
| 6 Mbps | 0.75 MB | 11 MB | 23 | 45 | 68 | 90 | proposed cap `[I]` |
| 8 Mbps | 1.0 MB | 15 MB | 30 | 60 | 90 | 120 | iPhone 1080p30 default, about 60 MB per minute `[S32*]` |
| 12 Mbps | 1.5 MB | 23 MB | 45 | 90 | 135 | 180 | between |
| 17 Mbps | 2.1 MB | 32 MB | 64 | 128 | 191 | 255 | one forum estimate of 130 MB per minute for Full HD 30 fps on Samsung `[S33*]` |

CameraX says "If this method isn't called, an appropriate bitrate for normal video recording is selected by default", and a passed bitrate may be "changed internally" `[S34]`; no default number is published, so the Android figure needs a device measurement `[I]`.

## 3. How the app can set the limits (expo-camera 17.0.10, read from node_modules)

Files: `build/Camera.types.d.ts`, `build/CameraView.d.ts`, `android/src/main/java/expo/modules/camera/*.kt`, `ios/Current/*.swift`, `ios/Common/DeviceDiscovery.swift` `[S37]`.

| Capability | Quoted line | Android | iOS |
|---|---|---|---|
| `maxDuration` (recordAsync option) | `Camera.types.d.ts` 164-167: "Maximum video duration in seconds." `CameraView.d.ts` 129: "The Promise is returned if `stopRecording` was invoked, one of `maxDuration` and `maxFileSize` is reached or camera preview is stopped." | Works. `Options.kt` 29 `@Field val maxDuration: Int = 0` (whole seconds); `ExpoCameraView.kt` 333 `.setDurationLimitMillis(options.maxDuration.toLong() * 1000)`; zero is unlimited `[S35]`; the limit event is resolved with the file (lines 365-370) | Works. `CameraRecordingOptions.swift` 4 `@Field var maxDuration: Double?`; `CameraVideoRecording.swift` 79 `videoFileOutput.maxRecordedDuration = CMTime(seconds: maxDuration, preferredTimescale: 1000)`; a limit stop is read as success |
| `videoBitrate` (prop) | 348-353: "The bitrate of the video recording in bits per second. Note: On iOS, you must specify the video codec when calling `recordAsync` to use this option." | Works. `ExpoCameraView.kt` 555 `setTargetVideoEncodingBitRate(it)`; the camera is rebuilt when it changes | Works only with a codec. `CameraVideoRecording.swift` 90-91 `if let videoBitrate = delegate?.videoBitrate {` `[AVVideoAverageBitRateKey: videoBitrate]`; set inside the `if let codec` branch. The screen passes `codec: 'avc1'` (`ClipCameraScreen.js` 453) |
| `videoQuality` (prop) | 342-347: "for 16:9 resolution `2160p`, `1080p`, `720p`, `480p` : `Android only` ... If the chosen quality is not available for a device, the highest available is chosen." | `CameraRecords.kt` maps 1080p to FHD, 720p to HD; fallback `higherQualityOrLowerThan` (`ExpoCameraView.kt` 550) | The typing says "Android only", yet `CameraRecordingOptions.swift` 17-30 maps 1080p to `.hd1920x1080` and 720p to `.hd1280x720`; behaviour on a device not checked |
| `enableTorch` (prop) | 372-376: "A boolean to enable or disable the torch. @default false" | `ExpoCameraView.kt` 324 `if (camera?.cameraInfo?.hasFlashUnit() == true) {`; silently nothing without a flash unit; re-applied when the camera opens (line 601) | `CameraSessionManager.swift` 161 `device.hasTorch`; 167 `isTorchModeSupported(.on)`; errors are only logged. On/off only: no level, so no dimmer pulse |
| `mirror` (prop) | 324-328: "A boolean that determines whether the camera should mirror the image when using the front camera. @default false" | `ExpoCameraView.kt` 567 `setMirrorMode(MirrorMode.MIRROR_MODE_ON_FRONT_ONLY)` | `CameraVideoRecording.swift` 36-37 sets `isVideoMirrored` only when mirror is true; never sets false. The deprecated recordAsync note (173-176) says "iOS flips videos recorded with the front camera by default, but you can reverse that back by setting this to `true`. On Android, this is handled in the user's device settings." I could not reconcile that note with the Swift, so which way a front-camera file is saved on iOS needs a device check `[I]` |
| `zoom` (prop) | 309-313: "A value between `0` and `1` being a percentage of device's max zoom, where `0` means not zoomed and `1` means maximum zoom. @default 0" | `ExpoCameraView.kt` 592 `val targetZoomRatio = max(1f, min(maxZoomRatio, value.coerceIn(0f, 1f) * maxZoomRatio))`: never below 1.0 | `CameraSessionManager.swift` 201 `device.videoZoomFactor = minZoom * pow(device.activeFormat.videoMaxZoomFactor / minZoom, delegate.zoom)` with `minZoom = 1.0` (line 200): never below 1.0 |
| `selectedLens` (prop) | 365-371: "@platform ios @default 'builtInWideAngleCamera'" | no such prop | `CameraSessionManager.swift` 81 `$0.localizedName == delegate.selectedLens`: it matches the localised display name, so the documented default `builtInWideAngleCamera` matches no device and the default camera is used |
| `getAvailableLensesAsync()` | `CameraView.d.ts` 29-35: "Returns the available lenses for the currently selected camera. ... @platform ios" | not registered: the Android view lists `takePicture`, `getAvailablePictureSizes`, `record`, `toggleRecording`, `stopRecording`, `resumePreview`, `pausePreview` only (`CameraViewModule.kt` 412-449) and never emits `onAvailableLensesChanged`; the JS call would reach a missing function `[I]` | `CameraSessionManager.swift` 220 `availableLenses.map { $0.localizedName }.sorted`; the list mixes physical and virtual devices (`DeviceDiscovery.swift` 8-23: wide, telephoto, `.builtInUltraWideCamera`, TrueDepth, dual, `.builtInDualWideCamera`, `.builtInTripleCamera`) |

Lens name strings. iOS returns `localizedName` values; the examples in the brief ("Back Ultra Wide Camera") are what I expect for English devices but I found no source that lists the strings (Apple documents the property only as a name "for display in the user interface") `[S39][I]`. Android returns nothing. Whether `zoom` below the default reaches an ultra-wide on Android: no. CameraX can zoom out ("Typically 1.0, but can be less than 1.0 if the camera device supports zoom-out (only on android 11 or later)" `[S36]`), and a logical multi-camera reaches its ultra-wide that way `[S38*]`, but expo's clamp `max(1f, ...)` removes that range `[S37]`. Further iOS caution: the default back device can be a virtual camera, and a virtual camera at zoom factor 1.0 shows its widest lens (a WebKit report: "the field of view is set to the widest-FOV constituent device", every iPhone since the 11) `[S43]`; expo's default pick is the system-preferred or `AVCaptureDevice.default(for: .video)` (`DeviceDiscovery.swift` 80 and 88), so what the plain iOS back view shows on a Pro model needs a device look `[I]`.

Other facts: `recordAsync` doc 124-128 notes "Flipping camera during a recording results in stopping it." The screen passes `mute` to the view `[S68]`; on iOS a muted view removes the audio input (`CameraSessionManager.swift` 135-141) and on Android audio is added only when not muted (`ExpoCameraView.kt` 337 and 347-348), so no microphone is used and the file has no audio `[S37]`. `maxFileSize` (bytes) is a second ceiling on both platforms (`Camera.types.d.ts` 168-171) `[S37]`.

## 4. Countdown and end cues when the phone is away from you

### 4.1 What cameras and timer apps do

| Source | Signal | Tag |
|---|---|---|
| iPhone Camera timer (3 s or 10 s) | "You'll know it's almost time when your iPhone camera's flash starts blinking along with the timer"; users describe one blink a second then rapid blinking or a double flash in the last second (forum reports); no sound and no screen blink described in the sources I reached | `[S46][S48*]` |
| Pixel | users report the rear LED blinking, then a final long blink at the shutter; Google Camera has countdown beeps and a "Camera sounds" toggle; with it off "the timer no longer features countdown beeps"; the countdown "requires audible feedback" because the screen "is most likely turned away from users" (2017 article) | `[S48*][S49]` |
| Samsung Camera timer | sound only; a moderator, as quoted by users, says flash "can worsen the image quality" and repeated LED flashing "can be annoying for some users" | `[S48*]` |
| OS accessibility | iPhone "LED Flash for Alerts" blinks the rear LED, only while locked, with a "Flash on Silent" switch; iOS 26.2 adds Screen, LED Flash or Both; Android 14 adds camera flash and screen flash under Flash notifications | `[S50][S51][S52*]` |
| Interval timer apps | sound per event and a warning-sound time, a master "Disable all timer alerts" and a separate end-warning switch; voice countdown from 3 seconds remaining; vibration on or off; one lists "sounds, speeches, vibrations, screen flashes" as separate customisations; I found none that pulses the torch at interval changes | `[S53][S54][S55*]` |

Pattern across them `[I]`: three-second ramp, one signal per second, a distinct final signal, and every channel (sound, voice, vibration, flash) switchable separately, usually in the app's own settings or the timer's own screen.

### 4.2 What a propped phone can do that is seen from 3 metres `[I]`

| Camera | Faces the lifter | Cues that work | Cues that do not |
|---|---|---|---|
| Back (default in the screen) | lens and torch | torch pulse; sound if the lifter has no earbuds | the large numeral and any screen flash (screen faces the wall); haptics (the phone is across the room) |
| Front | lens and screen | large numeral (8 cm tall is about 1.5 degrees at 3 m); screen pulse; sound | torch (front cameras generally have none, and expo gives no way to ask `[S37]`) |

A phone screen of 7 by 15 cm at 3 m covers about 0.0012 steradians, under the 0.006 steradian area in the WCAG flash test `[S56][I]`; the cadence below stays under the rate limit regardless. The existing camera already plays a 3-2-1 numeral and a light haptic tick `[S68]`; the numeral helps only with the front camera, and the haptic tick is felt only by someone holding the phone.

### 4.3 Flashing-light safety

- WCAG 2.3.1: "Web pages do not contain anything that flashes more than three times in any one second period, or the flash is below the general flash and red flash thresholds"; a general flash is "a pair of opposing changes in relative luminance of 10% or more"; the area test is "no more than a total of .006 steradians" (25% of any 10 degree visual field) `[S56]`.
- Ofcom (Rule 2.12 guidance, Harding test): a potentially harmful flash is a pair of opposing luminance changes of 20 cd/m2 or more where the darker image is below 160 cd/m2; a sequence is not permitted when flashes cover more than a quarter of the screen and there are more than three in any one second; flashes with leading edges 9 or more frames apart are acceptable (excerpt of the 2017 guidance notes; the PDF refused my fetch) `[S57*]`.
- Epilepsy Action UK: some people are sensitive "as slow as 3 times a second or as fast as 60"; 10 to 25 a second is "most likely to trigger a seizure" `[S58]`.
- A cadence of at most one white pulse per second, each 150 to 200 ms, never in a burst, is one third of the three-per-second ceiling and below the 3 Hz floor of the sensitive range `[I]`. Three pulses in a row, one second apart, never exceed the "single, double or triple flashes" that the Ofcom text calls acceptable `[S57*]`.

### 4.4 Reasons for care with a torch in a gym

- Mirrors: a bright pulse can bounce off a mirror wall towards other people; the torch is small but at 1 m it is dazzling `[I]`. Other people: repeated flashing "can be annoying" `[S48*]`.
- Battery: a phone torch draws roughly 0.5 to 1 W, and excerpts put continuous use at 1 to 10% of battery per hour; five 0.2 s pulses are negligible `[S60*][I]`.
- Heat: the torch "may become unavailable if, for example, the device overheats"; a level above the current maximum "returns false" `[S40][S41]`. A phone propped in a warm gym with the camera running is that case, so the cue has to fail quietly into sound.
- Exposure: the torch lights the lifter and the scene. A forum post reports dim frames just after the torch is switched off on iPhone 11 and later (no reply) `[S45]`; the last pulse should therefore end well before frame one `[I]`.
- Lens: the camera freeze report with torch and the ultra-wide lens (iPhone 13 Pro, 15, 15 Pro; iOS 17.3, 18.0, 26) `[S44]`; expo applies the torch when the session is configured (`CameraSessionManager.swift` 356) and on every prop change, and nothing in it guards a lens change with the torch on `[S37][I]`.

### 4.5 What the app already has

- Sound: `src/lib/restSound.js` already synthesises pips at 660, 770 and 880 Hz for 3, 2 and 1 seconds and a longer 1100 Hz tone for zero through `expo-av`, gated by `restSoundsEnabled` (switch in `SettingsWorkoutScreen.js`), so cue sounds need no new dependency `[S68]`. The camera view is `mute`, so a cue sound is never recorded; the clip store holds up to 3 clips per workout and the Length control cycles 5, 10, 15 seconds `[S68]`.

## 5. Mirroring

| Source | Preview | Saved file | Setting | Tag |
|---|---|---|---|---|
| iPhone Camera | mirrored | not mirrored by default ("The default option on iPhones is to automatically 'correct' the front camera mirroring effect") | Settings, Camera, Mirror Front Camera (iOS 14 and later) keeps it mirrored; applies to selfie video too | `[S61][S62]` |
| Android Camera apps | mirrored | varies; "many Android phones save front camera selfies as mirror images by default" (Pixel guide) and Samsung has "Save selfies as previewed", reported as not always honoured for video | per phone | `[S63][S64*]` |
| Instagram | mirrored preview | "most third-party apps do not flip selfies, such as Instagram" (excerpt); the 2020 "Mirror" mode was a split-screen layout, not a flip | none found | `[S65][S66*]` |
| TikTok, Snapchat | mirrored preview | community pages say a flipped result usually comes from the phone's setting; no official page found | none found | `[S67*]` |
| expo-camera | native preview mirrored | Android: `MIRROR_MODE_ON_FRONT_ONLY` when `mirror` is true; iOS: the connection is mirrored when `mirror` is true, on whichever camera is active | the prop | `[S37]` |

What people expect `[I]`: the picture of themselves while setting up looks like a mirror, and a gym is full of mirrors, so a lifter expects the video of the front camera to look like what they saw. Users flip results when text or a logo comes out reversed; the share card's data is drawn by the app, so only gym signage and plate lettering would read backwards. The screen already passes `mirror={facing === 'front'}` (Addendum 13 G) `[S68]`.

## 6. What not to do

- Advice on pace, load or form: the tempo figures above size a recording and belong nowhere in copy. Telling a lifter how long a set should take, quoting a "time under tension" window, or labelling Length options by reps would read as training advice.
- Camera-angle coaching in the lens control (which view is "better for depth"); the angle research is in file 05.
- Anything that needs a purchase: a tripod, remote shutter, clip-on light, Bluetooth button or watch. The cues use the phone's own light, screen and speaker.
- Technical words in the person's view: bitrate, codec, fps, 1080p, ultra-wide, 0.5x, torch level, "lens". British usage allows "torch", but "phone light" or "flash" is what people say.
- Mid-recording cues: a torch pulse is in the video, and a sound mid-set can read as a nudge to hurry. A reassurance claim such as "safe for photosensitive viewers" is also better left unsaid; the cadence is a design limit, not a medical statement.
- Mirroring the back camera, or exposing a mirror switch the person cannot reason about.
- Raising a Length option past the 2 minute proposal without a storage plan; the clip store holds up to 3 clips per workout, and three clips at 2 minutes is 270 to 360 MB at the proposed bitrate `[S68][I]`.

## 7. The lead's inputs

(a) Recording cap and Length options. I would raise the camera cap from 15 seconds to a default of 90 seconds and offer Length options of 60 seconds, 90 seconds and 2 minutes. Reason: the model in 1.5 puts the 99th percentile of a whole ordinary set including walkout and re-rack at 89 to 106 seconds, so 90 seconds cuts roughly 1 to 4 sets in 100 (mostly 15 to 20 rep work) and 2 minutes cuts about none and also holds a myo-rep or drop-set run (about 2 minutes) `[S10][S11][I]`. The 60 second option is for single-rep and machine work and for smaller files; it cuts 9 to 31 in 100 in the model, so it should not be the default. The founder's instinct is borne out: only a single on a machine fits in 15 seconds `[I]`. The share card keeps its 15 second window and the existing trim bar picks it from the longer video. The hold-to-record cap (`MAX_CLIP_MS`, 15 seconds) would follow the longest Length, since a helper holding the button is filming the full set. To keep files modest I would keep `videoQuality="1080p"` and pass `videoBitrate` of about 6 to 8 million bits per second (iOS applies it because `recordAsync` already passes `avc1`), which makes 90 seconds 68 to 90 MB and 2 minutes 90 to 120 MB, against up to 255 MB if the Android default is near 17 Mbps `[S33*][S34]`. A device walk should measure a 90 second clip on Android, confirm the trim and export path handles a source of that length, and confirm the progress line along the top still reads sensibly over 90 seconds; a hands-free set that ends early leaves the rest of the length as idle footage, which the trim bar steps past `[I]`.

(b) Countdown cue. Sound and light on the same events, one per second at most. Sound: the rest timer's pips, 660, 770 and 880 Hz at 3, 2 and 1 seconds before the start and the longer 1100 Hz tone at the start (`restSound.js`), played through `expo-av`, which needs no new dependency `[S68]`. Torch (back camera): three 200 ms pulses at 3, 2 and 1 seconds before the start; for countdowns of 5 or 10 seconds one extra 200 ms pulse at 5 and at 10 seconds; no pulse at zero, so the torch is off about 0.8 seconds before the first frame. At most five pulses in the longest countdown, never faster than one a second. Front camera: the large numeral already shown plus a brief white screen pulse on the same beats, and no torch. Off switch: a third small control on the camera screen beside Countdown and Length, captioned "Cues", cycling "Sound and light", "Light only", "Sound only", "Off", remembered like the other two (own AsyncStorage key). It belongs on the camera screen because the person is standing at the phone with it propped, and a Settings switch would be a trip away; "Off" still leaves the numeral and the haptic tick. Open points for the lead: whether the sound honours the phone's silent switch (the rest timer plays in silent mode); the default state (sound and light, because earbuds and a loud gym make either alone unreliable `[I]`); and a device test of the torch beside the ultra-wide lens before both are allowed together on iPhone `[S44]`.

(c) End-of-recording cue. After the recording has stopped by reaching the cap (not after a manual stop): two descending soft pips and two 200 ms torch pulses 300 ms apart, front camera two screen pulses; played only after the file is finished, so nothing is in the video and no pulse lands on the exposure. A manual stop keeps today's haptic and toast only. No cue during the recording. It follows the same "Cues" setting `[I]`.

(d) Lens control. Shown only when all hold: iOS, back camera, the screen ready (not counting down, recording or saving), and `getAvailableLensesAsync()` returns a name containing "Ultra Wide" (case-insensitive; hidden when none matches, because `localizedName` is a display string and may not read the same on a phone set to another language). Never shown on Android: expo-camera 17.0.10 has no lens list there and its zoom cannot go below 1x `[S37]`. Wording: caption "View", values "Normal" and "Wide"; accessibility label "View: wide. Fits more of the room into the video." (and "View: normal" in the other state). The control sits with the two existing small controls and is greyed while counting down or recording, because changing lens swaps the capture input `[I]`. "Normal" is the plain wide-angle entry (I expect it to read "Back Camera" on an English phone), selected explicitly rather than left to the system default, because the default iOS back device can already be the widest lens on a Pro phone `[S43][I]`. No extra hint line is needed; the accessibility label carries the explanation.

(e) Mirroring. The front camera preview is mirrored (every source) and the saved file is set to match it with `mirror` true, as today; the back camera is never mirrored. The `mirror` prop is passed explicitly on both platforms rather than left to the phone's setting, since the OS defaults differ and Samsung's setting is unreliable for video `[S61][S63][S64*]`. No person-facing mirror switch. A device walk should confirm a front-camera file looks like its preview on both an iPhone and an Android phone, because the expo typing note and the Swift code disagree on iOS `[S37]`.

## 8. Sources

Local files (read): [S37] `/home/user/ADPhysique/node_modules/expo-camera/` (`build/Camera.types.d.ts`, `build/CameraView.d.ts`, `build/CameraView.js`, `android/src/main/java/expo/modules/camera/ExpoCameraView.kt`, `Options.kt`, `CameraViewModule.kt`, `records/CameraRecords.kt`, `ios/CameraViewModule.swift`, `ios/Current/*.swift`, `ios/Common/DeviceDiscovery.swift`; package version 17.0.10). [S68] the app's own `src/screens/ClipCameraScreen.js`, `src/lib/clips/rules.js` (`LENGTH_OPTIONS` 5, 10, 15; `MAX_CLIPS_PER_WORKOUT` 3), `src/lib/restSound.js` and `src/screens/SettingsWorkoutScreen.js`. Source numbers are not contiguous; the gaps are pages I read and did not use.

- [S1] Chaves et al. 2020, PeerJ 8:e8697: https://pmc.ncbi.nlm.nih.gov/articles/PMC7061915
- [S2] Wilk, Zajac, Tufano 2021, Sports Med (first 100,000 of 152,257 characters read): https://pmc.ncbi.nlm.nih.gov/articles/PMC8310485
- [S3*] Schoenfeld, Ogborn, Krieger 2015 (publisher blocked; search summary): https://doi.org/10.1007/s40279-015-0304-0
- [S4*] ACSM 2009 position stand, secondary copies and a PeerJ quotation of it (PeerJ 403): https://sfu.ca/~ryand/kin343/ACSMresistance.pdf and https://peerj.com/articles/10909
- [S5] Blazek et al. 2020, Biol Sport, 1RM bench breathing: https://pmc.ncbi.nlm.nih.gov/articles/PMC8329978
- [S6*] time under tension examples: https://www.bodybuilding.com/fun/wotw114.htm , https://www.jefit.com/blog/best-time-under-tension-for-muscle-and-strength-growth , https://dk.gymshark.com/blog/article/time-under-tension-workout
- [S7] Special Olympics powerlifting rules (IPF-style text; read with pdftotext): https://www.specialolympicswisconsin.org/wp-content/uploads/2015/08/Powerlifting-Rules-2023.pdf
- [S8] Rob Palmer, three-step walkout: https://robpalmer949.substack.com/p/the-three-step-walkout
- [S9] BarBend, squat walk-out: https://barbend.com/squat-walk-out
- [S10] Strengthlog, myo-reps: https://www.strengthlog.com/myo-reps/
- [S11] Mtn Tactical review of the myo-rep bench study: https://mtntactical.com/knowledge/research-review-30-less-chest-training-volume-produced-similar-strength-and-hypertrophy-gains/
- [S12*] rest-pause rests (elitefts returned 429; search summary): https://www.elitefts.com/education/alwyn-cosgroves-rest-pause-program
- [S13*] squat set-up sequence (search summary): https://powerlifting.com/article/squat-setup-build-the-lift-before-you-walk-it-out/
- [S14] Boostcamp, State of Lifting 2025 (no reps-per-set data on the page): https://www.boostcamp.app/state-of-lifting-2025
- [S15] Metric user guide: https://www.metric.coach/user-guide/record-velocity-in-the-metric-vbt-app
- [S16] Metric docs, recording a set: https://metric.coach/docs/recording-a-set
- [S17] Qwik VBT store page: https://apps.apple.com/us/app/id1660094818
- [S18] Concurrent validity of smartphone VBT apps, PLOS ONE 2024: https://pmc.ncbi.nlm.nih.gov/articles/PMC11575817
- [S19] WL Analysis: https://apps.apple.com/us/app/1541855037 and https://www.wlanalysis.com
- [S20*] Iron Path tutorial (search summary; store page 404): https://fef.unicamp.br/wp-content/uploads/sites/70/2025/03/tutorial_iron_path.pdf
- [S21] RepOne Personal: https://apps.apple.com/app/id1496454046
- [S22] Enode getting started: https://app.commslayer.com/hc/enode-help-desk/articles/1777455114-getting-started
- [S23*] Vmaxpro (search summary): https://store.simplifaster.com/product/vmaxpro/sku/120/
- [S24*] Barbell tracker GT (AppBrain returned 403; search summary): https://www.appbrain.com/appstore/barbell-tracker-gt/ios-683901421
- [S25*] OnForm: https://apps.apple.com/KR/app/id1490334045
- [S26] YouTube Help, Shorts: https://support.google.com/youtube/answer/10059070
- [S27] Instagram creators blog, 21 January 2025: https://creators.instagram.com/blog/the-latest-with-instagram
- [S28] Ordinal (third party): https://www.tryordinal.com/blog/how-long-can-an-instagram-reel-be
- [S29] SocialCal, May 2026 (third party): https://www.socialcal.app/blog/how-long-can-an-instagram-video-be
- [S30*] TikTok community pages: https://www.tiktok.com/discover/why-cant-i-record-3-minute-videos-anymore
- [S31*] Instagram Help, record a reel (page rendered blank; search summary): https://help.instagram.com/2720958398006062
- [S32*] iPhone video sizes: https://ubergizmo.com/how-to/shoot-4k-videos-on-the-iphone and https://www.techradar.com/how-to/how-to-shoot-4k-video-on-your-iphone
- [S33*] Full HD about 130 MB per minute, a forum estimate (URL taken from the result list, not confirmed to hold the quote): https://r2.community.samsung.com/t5/Galaxy-Note/Funciones-of-my-camera/td-p/8616367
- [S34] CameraX Recorder.Builder (fetched with curl): https://developer.android.com/reference/androidx/camera/video/Recorder.Builder
- [S35] CameraX FileOutputOptions.Builder: https://developer.android.com/reference/androidx/camera/video/FileOutputOptions.Builder
- [S36] CameraX ZoomState: https://developer.android.com/reference/androidx/camera/core/ZoomState
- [S38*] zoom ratio below 1.0 reaches an ultra-wide on a logical multi-camera (search summary): https://documentation.anyline.com/android-sdk-component/55.9.1/_attachments/documentation/io/anyline2/camera/CameraFeaturesX.Companion.html
- [S39] Apple, AVCaptureDevice.DeviceType: https://developer.apple.com/tutorials/data/documentation/avfoundation/avcapturedevice/devicetype-swift.struct.md
- [S40] Apple, isTorchAvailable: https://developer.apple.com/tutorials/data/documentation/avfoundation/avcapturedevice/istorchavailable.md
- [S41] Apple, setTorchModeOn(level:): https://developer.apple.com/documentation/avfoundation/avcapturedevice/settorchmodeon(level:).md
- [S43] WebKit bug 253186, virtual camera at 1x: https://bugs.webkit.org/show_bug.cgi?id=253186
- [S44] Apple forum, torch freezes the ultra-wide camera: https://developer.apple.com/forums/thread/773581
- [S45] Apple forum, dim frames after the torch: https://developer.apple.com/forums/thread/713694
- [S46] Techloy, iPhone timer: https://www.techloy.com/how-to-set-timer-on-iphone-camera.md
- [S47*] PetaPixel, iPhone timer and video (403; search summary): https://petapixel.com/how-to-set-timer-on-iphone-camera/
- [S48*] Samsung Community, camera timer LED flash threads (403; search summaries): https://eu.community.samsung.com/t5/other-smartphones/camera-timer-countdown-led-flash/m-p/8378725/highlight/true
- [S49] 9to5Google, Camera sounds toggle: https://9to5google.com/2017/02/21/google-camera-4-3-disable-sound/
- [S50] Apple, LED flash alerts: https://support.apple.com/HT210065
- [S51] MacRumors, iOS 26.2 flash for alerts: https://macrumors.com/how-to/ios-26-2-make-your-iphone-screen-flash-for-alerts
- [S52*] Android 14 flash notifications: https://www.phonearena.com/news/android-14-flash-notifications_id150189
- [S53] Multitimer help, iOS interval timer: https://help.multitimer.net/timing-tools/ios-interval-timer
- [S54] HIIT Timer / Interval Timer listing: https://apps.apple.com/kr/app/hiit-timer-interval-timer/id1610842683
- [S55*] interval timer voice countdown listings (search summary): https://apps.apple.com/app/id1448144846
- [S56] W3C Understanding SC 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- [S57*] Ofcom Section 2 guidance notes (403; search summary): https://www.ofcom.org.uk/siteassets/resources/documents/tv-radio-and-on-demand/broadcast-guidance/programme-guidance/broadcast-code-guidance/section-2-guidance-notes.pdf
- [S58] Epilepsy Action UK: https://epilepsy.org.uk/?p=1833
- [S60*] phone torch power (search summaries): https://www.sammobile.com/news/how-do-phone-flashlights-work-and-affect-battery/
- [S61] SlashGear, Mirror Front Camera: https://www.slashgear.com/1623533/mirror-front-camera-iphone-explained
- [S62] 9to5Mac, Mirror Front Camera: https://9to5mac.com/2020/07/09/iphone-mirror-selfie-photos/
- [S63] Techloy, Android inverted selfies: https://www.techloy.com/how-to-stop-android-camera-from-taking-inverted-selfies/
- [S64*] Samsung "Save selfies as previewed" (403; search summaries): https://www.sammobile.com/news/why-do-my-selfies-look-mirrored-or-flipped/
- [S65] Social Media Today, Instagram Mirror mode 2020: https://www.socialmediatoday.com/news/instagrams-testing-a-new-mirror-camera-mode-for-stories/574248/
- [S66*] iPhone Life, third-party apps do not flip: https://iphonelife.com/content/how-to-mirror-front-camera-iphone
- [S67*] TikTok community pages on flipped video: https://www.tiktok.com/discover/why-does-tiktok-flip-my-video

Not reached or not found: Schoenfeld 2015 full text (publisher login redirect); ACSM 2009 original text; Sanchez-Medina (Thieme, blocked); Ofcom guidance PDF and bulletins (403); Instagram Help and TikTok support pages (JavaScript-rendered, blank); PetaPixel, SamMobile, Samsung Community, AppBrain, elitefts (403 or 429); Apple's own video-size page; Iron Path's store page (404); any documented set-recording rule for Vmaxpro or Enode; a CameraX default bitrate figure; any list of iOS `localizedName` strings; any official statement on Instagram, TikTok or Snapchat selfie mirroring; Pixel and Samsung camera app defaults.
