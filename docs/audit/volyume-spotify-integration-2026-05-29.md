# Volyume Spotify integration: research and proposal

Date: 2026-05-29
Author: integration research pass (read-only, no app code changed)
Branch: `claude/spotify-integration-research-eb8FB`
Status: proposal for review

---

## Executive summary

Volyume has no music or audio feature today beyond the synthesised rest-timer
beeps. There is no Spotify code, no SDK, no playlist data, and no related
infrastructure. The "Spotify" strings in the repo are design analogies, not
features (see Internal Audit).

The question is whether to surface Volyume-curated Spotify playlists in the
workout screen so a lifter can tap one and be set up with the right music
before and during a session.

**Recommended approach: deep linking, not an SDK.** A user taps a curated
playlist, Volyume calls `Linking.openURL('https://open.spotify.com/playlist/<id>')`,
and Spotify opens on that playlist. This needs no Spotify SDK, no OAuth, no
Spotify Premium plumbing on our side, and no native module. It runs on the
current Expo SDK 51 stack as-is, and it reuses the exact open-with-store-fallback
pattern already shipped in `SettingsScreen.js:1121`. The one honest limitation:
a deep link opens the playlist page, it does not reliably auto-play. The user
taps play in Spotify. True one-tap auto-play needs the App Remote SDK or the
Web API, both of which require a custom native build, OAuth, an active Spotify
device, and end-user Premium. That cost is not worth it for v1.

**Placement.** Do not build a persistent in-session music controller. The one
major fitness app that shipped that exact pattern, Strava, removed it in
February 2026. Instead, put a small "Soundtrack" affordance in two places that
already exist on the workout screen: the empty / pre-first-set state
(`ActiveWorkoutScreen.js:2090-2127`) where a lifter sets up before training,
and a music-note button in the existing secondary-actions row
(`ActiveWorkoutScreen.js:1628-1689`) that opens a bottom sheet of categories.
The bottom sheet matches the app's existing sheet pattern (plate calculator,
set-type picker) and never touches logging state.

**Category structure (six categories).** Heavy / Strength, Hypertrophy / Pump,
Warm-up, Finisher, Focus (low-stimulus), Conditioning / Cardio. Few enough to
scan in one screen, each tied to a real training context rather than a generic
mood label. Full briefs in the Content Strategy section.

**Top three build priorities.**
1. Foundation: create a Volyume brand Spotify account, build and publish the
   curated playlists, copy their public links, store them in a shipped config
   file.
2. Core feature: the bottom-sheet soundtrack browser opened from the
   secondary-actions row and the empty state, deep-link open on tap, and a
   clean fallback when Spotify is not installed.
3. Enhancement: move the link list to Supabase so playlists can be refreshed
   without an app release.

---

## 1. Internal audit

### 1.1 There is no music or Spotify feature today

A full-repo search for `spotify`, `playlist`, and `music` returns only:

- `src/components/PressableCard.js:7` and `src/screens/YearOfLiftsScreen.js:15`:
  comments citing Whoop and "Spotify Wrapped" as design references for tappable
  surfaces and stat storytelling. Not features.
- `docs/GROWTH_STRATEGY_PASS_3_CLAUDE.md`, `docs/GROWTH_STRATEGY_PASS_1_*.md`,
  `docs/GROWTH_STRATEGY_RESEARCH_BRIEF.md`: references to Spotify's paywall and
  experimentation practices. Not features.
- `src/lib/restSound.js` and `src/lib/notifications/activeWorkout.js`: the word
  "music" appears in comments about coexisting with the user's own music.

No Spotify dependency exists in `package.json`. There is no playback code, no
playlist data, no auth against any music service. This is a greenfield feature.

### 1.2 The workout screen and where music could sit

The active logging screen is `src/screens/ActiveWorkoutScreen.js` (2,615 lines).
Top to bottom when an exercise is active:

- **Header** (`1148-1172`): close button, centre elapsed timer in amber, "Finish"
  text button. Spacious but the right slot is already the finish action, so it
  is a poor place for a new control.
- **Exercise navigator** (`1175-1207`): horizontal tabs, only when multiple
  exercises exist.
- **Main ScrollView** (`1209-1772`): the logging core. Exercise title and swap
  (`1217-1245`), coaching banners (`1248-1284`), target row (`1287-1294`), the
  rest timer slot (`1301`), the SetEntry input card (`1314-1492`), the primary
  action button that morphs between "Log set" / "Next exercise" / "Finish
  workout" (`1542-1626`), the secondary-actions row (`1628-1689`), the logged-sets
  history (`1692-1724`), and time-crunch controls (`1742-1769`).
- **Modals** (`1775-2082`): six bottom sheets and overlays, all built with the
  React Native `Modal` component, `transparent` with `animationType="slide"` for
  sheets. The plate calculator (`1922-1940`) and set-type picker (`1943-1982`)
  are the cleanest precedents: open from a button, dismiss on selection, never
  block logging.
- **Empty state** `EmptyExerciseView` (`2090-2127`): shown before any exercise is
  added. Barbell icon, "Add your first exercise", "Search the exercise library
  to get started", and a primary "Add Exercise" button. This is the natural
  pre-workout setup moment.

The two safe insertion points, confirmed by the screen structure:

1. **The secondary-actions row** (`1628-1689`). It already holds five icon
   buttons (Note, Info, Add, Pair, Remove) in a consistent style. A sixth
   music-note button fits the established pattern, is always visible, and is
   non-modal until tapped.
2. **The empty / pre-first-set state** (`2090-2127`). A lifter setting up has
   not started logging yet, so a "Pick a soundtrack" entry here disrupts
   nothing.

The hard constraint from the code: the music affordance must not touch
`currentSet`, `loggedSets`, the rest timer, or the Zustand store, and must not
sit inside the ScrollView as a sticky element (it would scroll away). A bottom
sheet opened on demand satisfies all of this.

### 1.3 Infrastructure that accelerates this

Volyume already has everything the deep-link path needs:

- **External-link opening with store fallback.** `SettingsScreen.js:1121` does
  `Linking.openURL(market).catch(() => Linking.openURL(web).catch(() => {}))`.
  This is the exact shape required to open Spotify and fall back to the web
  player or store. `Linking.openURL` is used in at least eight places
  (`SubscriptionScreen.js:76`, `CascadeGateScreen.js:157`, `health.js:198-202`,
  `CreditsScreen.js:27`, and others).
- **In-app browser.** `expo-web-browser` is installed and used in the auth flow
  (`supabase.js:137`).
- **URL scheme and deep-link config.** `app.json` declares `"scheme": "volyume"`,
  Android intent filters with `autoVerify`, and iOS associated domains. Adding a
  `LSApplicationQueriesSchemes` entry for `spotify` (iOS) and an Android
  `queries` entry is the only config change needed, and only if we want
  `canOpenURL` detection.
- **Audio mode already coexists with music.** `src/lib/restSound.js:118-124`
  calls `Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid:
  true, ... })`. The rest-timer beeps already duck under and mix with whatever
  the user is playing, so Spotify running in the background during a set is
  already a solved audio-session problem. No change needed.
- **Haptics vocabulary.** `src/lib/haptics.js` gives a consistent tap feel for a
  new button.

There is nothing to build at the platform layer. The deep-link path slots into
patterns that already ship.

### 1.4 Design language to match

From `src/styles/theme.js` and `CLAUDE.md`:

- Background is locked to `#0D0D0D`. No gradients, no glow, no orbs.
- Amber `#F59E0B` (`colors.primary`) is the brand affordance. It should mark the
  tappable thing, not decorate every row.
- Tiered radii (`radius.sm` 6 to `radius.full`), tiered spacing, semantic type
  roles (`type.title`, `type.body`, `type.caption`).
- Copy rules: British English, plain short sentences, no em dashes, no
  encouragement the user did not ask for, one footnote per surface at most.
- Design rules that bear on this feature directly: no centred carousels with
  paginating dots, no decorative icons on every list item, no "coming soon"
  placeholders. So the soundtrack browser is a plain vertical list, not a swiped
  carousel, and only the playlist row itself carries the amber affordance.

---

## 2. Competitive research (live web, 29 May 2026)

Full per-app detail and sources are in the Appendix. The signal that matters:

### 2.1 What the leaders actually do

- **Music in service of the workout, not beside it.** The best-regarded
  mechanics tie music to the exercise: Nike Run Club ducks the coach's voice
  over music and once ran BPM/pace-matched playlists (Pace Station); Tempo gives
  a music-versus-coach volume balance. Generic bolt-on players are not what gets
  praised.
- **Pre-workout playlist preview on the detail screen, with one-tap to the music
  app.** Apple Fitness+ shows each workout's curated playlist on the workout
  detail page with a "Listen in Music" button. Peloton shows the full tracklist
  song by song on the class-plan screen before you start. Both put the playlist
  where the user is deciding what to do, not in a separate music tab.
- **Heart-to-save is the most-loved mechanic in the space.** Peloton's heart
  icon turns a curated in-class track into an auto-synced personal Spotify or
  Apple Music playlist. It captures discovery the user just experienced. It also
  requires the Web API, Premium, and OAuth, so it is out of scope for v1 but
  worth naming as the gold-standard enhancement.
- **Support both services, let the user pick.** Nike, Peloton, FORME and FITIV
  all support Spotify and Apple Music. Apple-only (Fitness+, Centr) is an
  ecosystem play, not the norm.

### 2.2 The cautionary signal

- **A persistent in-session in-line Spotify controller is rare, and the best
  version of it was just killed.** Strava shipped exactly the pattern this brief
  imagines: a Spotify player over the bottom third of the live Record screen,
  with a horizontal swipe to discover and browse Spotify-made playlists without
  leaving the screen. Strava removed it on 17 February 2026. The public reason is
  not confirmed, but the longevity and maintenance signal is real: a major app
  built the in-session embedded discovery strip and walked away from it.
- **The platform owner is pulling fitness into Spotify, not pushing music out.**
  On 27 April 2026 Spotify launched its own Fitness hub (curated workout
  playlists for everyone, 1,400+ Peloton classes for Premium), reached via
  Search and a dedicated hub rather than embedded in a partner's screen. Within
  one quarter Strava removed Spotify and Spotify launched its own fitness
  surface. Anything Volyume builds on the Spotify SDK should assume the terms and
  the relationship can shift. A deep link, which uses ordinary public share
  links, is far less exposed to that risk than an SDK integration.

### 2.3 Apps with no music integration

Whoop (biometrics only, by design), Fitbod (explicitly none, tells users to use
a separate player), Boostcamp, Hevy, and Caliber all ship without a music
feature. Hevy and Boostcamp, the closest comparables to Volyume as
logging-first strength apps, have no music control at all. So a lightweight
curated-playlist feature would be a genuine point of difference in the
strength-logging category, not table stakes a competitor already beats us on.

### 2.4 Curated discovery inside a functional screen, done well

The brief asked specifically for this. Honest finding: verified examples are
thin, which is itself a result.

- **Strava's old Record screen** is the closest direct match, and it is gone.
- **Peloton's class-detail screen** embeds the curated tracklist in the
  decision screen (people choose classes by music), with heart-to-save. It
  works because the playlist is decision-relevant.
- **Apple Fitness+ workout-detail screen** puts the curated playlist preview and
  one-tap save on the pre-workout screen, minimal footprint.

The better-evidenced bet for a lifting app is the Apple/Peloton model: a curated
set tied to the workout, shown at the setup or landing moment, one tap to open
in the music app, rather than a live in-session discovery carousel. That maps
cleanly onto Volyume's empty / pre-first-set state plus an on-demand sheet.

---

## 3. Spotify platform research (live web, 29 May 2026)

Full detail and sources in the Appendix. Spotify's developer docs domain returns
403 to automated fetches, so some platform claims rest on search snippets of the
official pages plus corroborating community and press sources, flagged in the
Appendix. npm facts were verified directly against the registry.

### 3.1 The options, and what each enables

| Option | What it gives | What it does not | Fit for Volyume |
|---|---|---|---|
| **URI / URL deep link** (`open.spotify.com/...` or `spotify:...`) | Opens Spotify on the playlist. No SDK, no OAuth, no Premium, no native module. Works on Expo SDK 51 today. | No programmatic play/pause/skip. Opens the playlist page, does not reliably auto-play. | **Recommended.** |
| **Web API** (`PUT /v1/me/player/play`) | Can start a playlist on the user's active device. | Requires OAuth (`user-modify-playback-state`), end-user **Premium**, and an already-active Spotify device. Does not stream audio itself. Since Nov 2024 new apps lost editorial playlists, recommendations, audio features, and 30s previews. | Overkill, Premium-gated. |
| **iOS / Android App Remote SDK** | In-app play/pause/skip/seek by remote-controlling the installed Spotify app. | Native module, breaks Expo Go, needs a custom dev client and EAS build, OAuth, and Premium for on-demand playback. | Not for v1. |
| **Web Playback SDK** | A playback device inside a web page. | Browser-only, Premium-only, not a React Native module. | Not applicable. |

### 3.2 In-app playback versus launching Spotify

- "Open the playlist in Spotify" works with **just a deep link**. No SDK, no
  OAuth, no Premium.
- "Control playback in-line from Volyume's own UI" requires App Remote (native)
  or the Web API (OAuth + Premium + active device).
- The Web API's 30-second `preview_url` is deprecated, nullable, removed for new
  apps in batch responses since 27 November 2024, and explicitly may not be
  offered as a standalone product. It is not a route to in-app playback.

### 3.3 The simplest viable path

Confirmed: a deep link is the minimum, and it fits the current stack.

```js
import * as Linking from 'expo-linking';
// Universal link form, preferred on iOS (no scheme-confirmation prompt,
// clean web/store fallback when Spotify is not installed):
Linking.openURL('https://open.spotify.com/playlist/<PLAYLIST_ID>');
```

Behavioural caveats to set expectations against:

- **Opening a playlist link opens the playlist page, it does not reliably
  auto-play.** Spotify's own community guidance says auto-play-on-open is
  reliable only for single-track links and only when nothing else is playing.
  The undocumented `/play` URL suffix circulated by third-party tools is not
  supported and should not be relied on.
- On iOS prefer the `https://open.spotify.com/...` universal link over the
  `spotify:` scheme, which triggers an "Open in Spotify?" prompt.
- `Linking.canOpenURL` detection of Spotify needs
  `ios.infoPlist.LSApplicationQueriesSchemes: ["spotify"]` (iOS) and an Android
  `queries` entry, and only works in a dev / native build, not Expo Go.
  `openURL` itself does not require this, so the simplest version skips
  detection and just relies on the universal-link fallback.

### 3.4 Developer terms and design guidelines

- **Attribution and link-back.** When you display Spotify content, metadata, or
  cover art you must show the Spotify logo and link back to the content on
  Spotify. The deep link satisfies the link-back inherently. We must show the
  Spotify logo on the soundtrack surface.
- **Branding.** Volyume's marks must not resemble Spotify's, and Spotify
  trademarks cannot appear in our product name. No co-branding.
- **Commercial use, flagged as genuinely ambiguous.** The Developer Policy
  splits "Streaming" versus "Non-Streaming" integrations with different
  commercial restrictions. Whether a paid app linking to its own public
  playlists counts, and what obligations apply to the deep-link-only case, is
  not clearly spelled out in the readable sources. This should be confirmed
  against the full policy text or with Spotify before launch. It is in Open
  Questions.

### 3.5 Hosting the curated playlists

- A **free** Spotify account is enough to create and host public playlists.
  Premium is only needed to control playback, not to create or share.
- Make each playlist public via the 3-dot menu, then Share, then Copy link to
  get `https://open.spotify.com/playlist/<id>`.
- A single Volyume brand account owns and curates all playlists. Listeners can
  follow and play but not edit.
- Note: recent changes mean free-tier listeners on mobile may see a reduced view
  of someone else's playlist. Worth testing the free-tier experience.

### 3.6 React Native libraries

For the deep-link path, none are needed beyond `expo-linking`. For the SDK path
(not recommended for v1): the only actively maintained Expo-native wrapper is
`@wwdrew/expo-spotify-sdk` (App Remote, published 2026-05-29), but its main
branch targets Expo SDK 56+ while Volyume is on 51, so it would need a
compatibility check and a custom dev client. The older
`react-native-spotify-remote` is unmaintained since 2021. This reinforces
deferring the SDK.

---

## 4. Content strategy

### 4.1 Principles

- A category earns its place by mapping to a **training context a lifter
  actually recognises in the moment**, not a generic mood word. "Heavy" beats
  "Energetic". "Warm-up" beats "Chill".
- Six categories. Enough to cover the real shapes of a lifting session, few
  enough to scan in one sheet without scrolling fatigue. This respects the
  `CLAUDE.md` rule against filling space for symmetry.
- Within a category, differentiate playlists by **genre or energy lane**, not by
  inventing more categories. One category can hold two or three playlists (for
  example Heavy in a rap lane and a metal/rock lane) so taste is served without
  multiplying the top level.
- Curation should be **mostly static with a light seasonal refresh**. Static
  links ship in the app and never break. A quarterly refresh of the track
  contents (same playlist, same link, new songs) keeps them alive without any
  app change, because the link points at a playlist the brand account owns.

### 4.2 The six categories

**1. Heavy / Strength**
Description: "Low reps, big lifts." For top sets, singles, and PR attempts.
Musical brief: high-arousal, aggressive, driving. Rap and trap in one lane,
metal and hard rock in another. Heavy low-end, clear tempo, builds that peak
rather than meander. The job is to raise arousal for a maximal effort. Who it is
for: the lifter standing over a loaded bar.

**2. Hypertrophy / Pump**
Description: "Reps and time under tension." For the working volume of a session.
Musical brief: steady groove, consistent energy across a long set count, nothing
that demands attention. House, funk, hip-hop, upbeat pop. The job is to keep a
rhythm going through eight to twelve reps and short rests without spiking or
dropping. Who it is for: the lifter grinding through the main volume blocks.

**3. Warm-up**
Description: "Get the blood moving." For the ramp-up before working sets.
Musical brief: mid-tempo, rising energy, light. The job is to lift the mood from
cold to ready without burning the peak you want for the heavy work. Who it is
for: the lifter doing empty-bar and ramp sets.

**4. Finisher**
Description: "Empty the tank." For drop sets, AMRAPs, and the last hard push.
Musical brief: relentless, high tempo, no breathing room. The job is to carry a
lifter through the part of the session that hurts. Who it is for: the lifter on
the last set with nothing left.

**5. Focus (low-stimulus)**
Description: "Quiet the noise." For technique work, skill lifts, and lifters who
do not want hype.
Musical brief: instrumental, lo-fi, minimal, ambient electronic. No lyrics
competing for attention. The job is to hold concentration through precise work.
Who it is for: the lifter dialling in form, and the lifter who finds hype music
distracting.

**6. Conditioning / Cardio**
Description: "Keep the pace." For metabolic finishers, sled work, and any
steady-state or interval cardio attached to a session.
Musical brief: steady high BPM, motion-forward. Dance, drum and bass, upbeat
electronic. The job is to hold a cadence. Who it is for: the lifter doing the
conditioning piece at the end.

### 4.3 Differentiation and maintenance

- Each category ships with one playlist at launch. Heavy and Hypertrophy, the
  two most-used contexts, can ship with two lanes each (for example a rap lane
  and a rock lane) if curation time allows. This keeps the top level at six.
- Refresh cadence: review track contents quarterly. The link and the playlist
  identity never change, so a refresh requires no app release.
- One person owns the brand account and curation. Named in Open Questions.

---

## 5. Proposed feature design

### 5.1 Name

"Soundtrack". Plain, fits the voice, avoids leaning on the Spotify trademark in
our own naming (which the developer terms require). The Spotify logo appears on
the surface for attribution.

### 5.2 UX and placement

**Entry point one, the empty / pre-first-set state**
(`ActiveWorkoutScreen.js:2090-2127`). Below the "Add Exercise" primary button,
a single low-key text-and-icon row: a small music-note glyph and "Pick a
soundtrack". This is the pre-workout setup moment the competitive research
points to as the strongest, lowest-risk surface. It is a secondary action, not a
competing primary CTA, so it does not pull focus from adding the first exercise.

**Entry point two, the secondary-actions row**
(`ActiveWorkoutScreen.js:1628-1689`). Add a sixth icon button, a music note, in
the same style as Note, Info, Add, Pair, Remove. This makes Soundtrack reachable
at any point in the session without a persistent bar that eats screen space or
scrolls away. It turns amber only while music is the active intent, otherwise it
sits grey like its neighbours.

**The sheet.** Tapping either entry opens a bottom sheet built with the same
`Modal` + slide pattern as the plate calculator (`1922-1940`) and set-type
picker (`1943-1982`). Contents:

- A short title row: "Soundtrack" and the Spotify logo (attribution).
- A plain vertical list of the six categories. Each row shows the category name,
  the one-line description, and the amber chevron affordance. No decorative icon
  per row (the `CLAUDE.md` rule), no carousel, no paginating dots.
- Tapping a category with a single playlist opens it directly. Tapping a
  category with two lanes expands to show the two playlists, then a second tap
  opens.

The sheet dismisses on selection or on tapping the scrim, exactly like the
existing sheets. It never modifies `currentSet`, `loggedSets`, the rest timer,
or the store.

### 5.3 Tap-to-play flow, step by step

1. User taps a playlist row.
2. Volyume fires `Haptics.selectionAsync()` (matches the existing set-type
   selection feel at `1965`).
3. Volyume calls `Linking.openURL('https://open.spotify.com/playlist/<id>')`.
4. Spotify foregrounds on the playlist page. The user taps play. Music plays in
   Spotify. Volyume is backgrounded.
5. The user switches back to Volyume to log. The rest-timer beeps already duck
   under Spotify because `setAudioModeAsync` is configured
   (`restSound.js:118-124`). Nothing else is needed.

**Edge case, Spotify not installed.** Use the shipped fallback shape from
`SettingsScreen.js:1121`. The universal link `open.spotify.com/...` already falls
back to the Spotify web player in a browser when the app is absent, and Spotify's
own links can route to the store. For the simplest robust version we open the
universal link and let the OS resolve it. If we later add `canOpenURL` detection
(needs the `LSApplicationQueriesSchemes` / Android `queries` config and a dev
build), we can branch to an explicit "Get Spotify" store link, but it is not
required for v1.

**Edge case, free Spotify account.** A free user can open and follow the
playlist but may get shuffle or a reduced track view on mobile. This is
Spotify's behaviour, not ours. We do not gate or message it beyond what Spotify
shows. Flagged in Open Questions for whether that experience is acceptable.

### 5.4 Behaviour during a session

- Soundtrack is **contextual, not persistent**. There is no always-on player
  bar. This is the deliberate lesson from Strava removing its in-session
  controller: an embedded persistent Spotify control is high-maintenance and at
  least one major app abandoned it.
- Once the sheet is dismissed, the workout screen is exactly as it was. Music
  control lives in Spotify, in the OS now-playing surface (lock screen,
  Control Centre, notification), which is where users already expect transport
  controls.
- The secondary-actions music button remains available the whole session if the
  user wants to switch soundtrack between exercises.

### 5.5 Technical approach

**Method: deep linking. Recommended without reservation for v1.**

Tradeoffs versus the in-app SDK:

- Deep link: zero native modules, runs on Expo SDK 51 now, no OAuth, no
  Premium requirement on our side, no Spotify platform review, lowest exposure
  to Spotify terms changes. Cost: opens the playlist, does not auto-play, no
  in-app transport controls.
- App Remote SDK: true one-tap auto-play and in-app controls. Cost: a native
  module that breaks Expo Go, a custom dev client and EAS build, OAuth, end-user
  Premium, an active Spotify device, full exposure to the developer terms, and a
  wrapper (`@wwdrew/expo-spotify-sdk`) that currently targets Expo 56 while we
  are on 51. Not justified for the value it adds.

**What Volyume builds:** the Soundtrack sheet UI, the six category entries, a
config file mapping category to playlist link(s), the deep-link call, and the
Spotify-logo attribution. That is the whole surface.

**What Spotify handles:** all playback, the account, login state, the playlist
pages, transport controls, the not-installed web fallback.

**Authentication:** none. The deep link bypasses auth entirely. The user does
not log into Spotify inside Volyume. If they are logged out of Spotify, Spotify
prompts them; that is Spotify's flow, not ours.

**Where curated links live:** v1 ships them in a static config module, for
example `src/lib/soundtracks.js`, an array of
`{ id, category, name, description, url }`. Because these are OTA-updatable via
`expo-updates`, even the static version can be changed without a store release.
The enhancement is to move the list to a Supabase table so it can be edited from
the backend and pulled at runtime, with the static file as the offline fallback.
That keeps the feature working offline (the links are cached) and lets curation
change without shipping anything.

### 5.6 What not to build

- **No App Remote / in-app playback SDK.** Native build cost, Premium-gated,
  full terms exposure, and Strava walked away from the persistent-controller
  pattern it enables. Not worth it for v1.
- **No OAuth or Spotify login in Volyume.** The deep link removes the need.
- **No heart-to-save.** It is the most-loved mechanic in the space, but it needs
  the Web API, OAuth, and Premium. Name it as the aspirational enhancement, do
  not build it now.
- **No BPM matching or auto-generated paced playlists.** High effort, needs the
  Web API audio features that new apps lost access to in November 2024.
- **No persistent in-session player bar.** The Strava lesson. Keep it
  contextual.
- **No Apple Music in v1.** Dual-service support is the leader pattern and
  should be the first enhancement for iOS users, but adding it now doubles the
  curation and link work before the core is proven. Flagged as an enhancement
  and an open question.
- **No "coming soon" categories.** Per `CLAUDE.md`, ship the six that are real
  or hide them.

---

## 6. Prioritised build recommendations

Scored by impact and effort. Effort is rough engineering plus curation time.

### Foundation (must exist before anything is visible)

| Unit | Impact | Effort | Notes |
|---|---|---|---|
| Create Volyume brand Spotify account (free tier) | High | Low | Free account is sufficient to host public playlists. |
| Build and publish the six curated playlists | High | Medium | Curation time is the real cost. Heavy and Hypertrophy can get two lanes each. |
| Copy public links, store in `src/lib/soundtracks.js` | High | Low | Static, OTA-updatable. |
| Add Spotify logo asset for attribution | Medium | Low | Required by developer terms when displaying Spotify content. |

No Spotify platform review is required for the deep-link path, so Foundation has
no external gate. It can start immediately.

### Core feature (minimum version that delivers real value)

| Unit | Impact | Effort | Notes |
|---|---|---|---|
| Soundtrack bottom sheet (categories list, app sheet pattern) | High | Medium | Reuses plate-calculator / set-type sheet pattern. |
| Music-note button in secondary-actions row | High | Low | Sixth button, existing style. |
| "Pick a soundtrack" entry in empty / pre-first-set state | Medium | Low | The strongest surface per competitive research. |
| Deep-link open on tap, with universal-link form | High | Low | `Linking.openURL`, reuses shipped pattern. |
| Spotify-not-installed fallback | Medium | Low | Universal link already falls back; mirror `SettingsScreen.js:1121` if explicit store routing is wanted. |

This is a shippable, genuinely useful feature on its own.

### Enhancements (meaningfully better once core is live)

| Unit | Impact | Effort | Notes |
|---|---|---|---|
| Move links to Supabase, refresh without release | High | Medium | Curation changes with no app ship. Static file stays as offline fallback. |
| `canOpenURL` detection + explicit "Get Spotify" route | Low | Medium | Needs iOS `LSApplicationQueriesSchemes` + Android `queries` + a dev build. |
| Apple Music parallel links for iOS users | Medium | Medium | Dual-service is the leader pattern. Doubles curation. |
| Seasonal track refresh process | Medium | Low | Quarterly, no app change because the brand account owns the playlists. |
| Tap analytics (which categories get used) | Medium | Low | Informs curation. Use the existing telemetry layer. |
| Heart-to-save (aspirational) | High | High | Needs Web API + OAuth + Premium. Re-evaluate only if the core proves demand. |

### Spotify platform constraints affecting sequencing

- The deep-link path (Foundation + Core) needs **nothing** from Spotify's
  developer platform: no app registration, no review, no quota. It can ship on
  the current stack.
- Anything in the SDK / Web API direction (heart-to-save, in-app control,
  auto-play) requires leaving Expo Go for a custom dev client, OAuth, Premium,
  and full developer-terms compliance, including the commercial-use
  classification that is currently unresolved. Sequence all of that strictly
  after the deep-link core has proven the feature is wanted.

---

## 7. Open questions

1. **Is "open the playlist in Spotify" acceptable, or is one-tap auto-play a
   hard requirement?** The deep link opens the playlist page; the user taps play.
   If auto-play with no second tap is non-negotiable, scope expands to the App
   Remote SDK (native build, OAuth, Premium) and the recommendation changes.
   This is the single biggest decision.
2. **Commercial-use classification.** Volyume is a paid app. Whether linking to
   our own public playlists counts as a "Streaming" or "Non-Streaming"
   integration under Spotify's Developer Policy, and what that requires, is not
   clear from the readable terms. Confirm against the full policy or with
   Spotify before launch.
3. **Apple Music parity.** Is dual-service support expected for iOS users at
   launch, or is Spotify-first acceptable for v1 with Apple Music as a fast
   follow?
4. **Who owns curation and the brand account, and at what cadence?** The feature
   only stays good if someone refreshes it. Quarterly is proposed.
5. **Is the free-tier Spotify experience (possible shuffle, reduced mobile track
   view) acceptable**, or should the feature message it?
6. **Static config or Supabase from the start?** Static is faster to ship and
   OTA-updatable; Supabase removes the release step for curation entirely.
7. **Branding placement sign-off.** The Spotify logo must appear on the
   Soundtrack surface. Confirm the placement meets the design guidelines and the
   `CLAUDE.md` "no co-branding clutter" intent.

---

## 8. Appendix

### 8.1 File references (internal audit)

- `src/screens/ActiveWorkoutScreen.js` (2,615 lines): workout screen. Header
  `1148-1172`, secondary-actions row `1628-1689`, empty state `2090-2127`, sheet
  pattern `1922-1982`.
- `src/styles/theme.js`: design tokens. Background `#0D0D0D` (line 12), primary
  amber `#F59E0B` (line 20), radii (106-112), type roles (219-256).
- `src/lib/restSound.js:118-124`: `setAudioModeAsync` ducking config.
- `src/lib/haptics.js`: haptic vocabulary.
- `src/screens/SettingsScreen.js:1121`: open-with-store-fallback pattern.
- `app.json`: `scheme` "volyume", Android intent filters, iOS associated
  domains.
- `src/components/PressableCard.js:7`, `src/screens/YearOfLiftsScreen.js:15`:
  the only "Spotify" mentions, both design analogies.

### 8.2 Spotify platform sources

- https://developer.spotify.com/documentation/web-api
- https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
- https://developer.spotify.com/documentation/web-api/reference/get-track
- https://developer.spotify.com/documentation/web-api/concepts/scopes
- https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
- https://developer.spotify.com/documentation/web-playback-sdk
- https://developer.spotify.com/documentation/ios/tutorials/content-linking
- https://developer.spotify.com/documentation/android/tutorials/content-linking
- https://developer.spotify.com/documentation/design
- https://developer.spotify.com/terms
- https://developer.spotify.com/policy
- https://engineering.atspotify.com/2022/4/spotifys-player-api
- https://docs.expo.dev/linking/into-other-apps/
- https://docs.expo.dev/versions/latest/sdk/linking/
- https://www.npmjs.com/package/@wwdrew/expo-spotify-sdk
- https://www.npmjs.com/package/react-native-spotify-remote
- https://github.com/wwdrew/expo-spotify-sdk
- https://techcrunch.com/2024/11/27/spotify-cuts-developer-access-to-several-of-its-recommendation-features/
- https://community.spotify.com/t5/Android/Can-I-play-automatically-using-a-URI/td-p/5370844
- https://community.spotify.com/t5/Spotify-for-Developers/Autoplay-when-clicking-on-a-shared-link/td-p/5648300
- https://www.howtogeek.com/333434/how-to-share-your-spotify-playlists-with-friends-or-the-world/

Verification note: `developer.spotify.com` returned 403 to automated fetches.
Platform claims rest on search snippets of the official pages plus corroborating
community and press sources. npm versions and dates were verified directly. The
Streaming versus Non-Streaming commercial classification and the exact
deep-link-only obligations are genuinely ambiguous and must be confirmed.

### 8.3 Competitive sources

- https://www.nike.com/help/a/nrc-music
- https://www.nike.com/a/picking-music-to-power-a-run
- https://support.spotify.com/us/using_spotify/app_integrations/nike/
- https://www.mmaglobal.com/case-study-hub/case_studies/view/41353
- https://community.spotify.com/t5/iOS-iPhone-iPad/Problems-with-Nike-Training-Club-app-Integration/td-p/4697763
- https://www.onepeloton.com/blog/peloton-track-love
- https://www.pelobuddy.com/music-playlist-peloton-android-ios/
- https://www.pelobuddy.com/now-playing-live/
- https://www.pelobuddy.com/peloton-spotify-fitness-partnership/
- https://theclipout.com/peloton-music-changes-frustrate-members/
- https://theclipout.com/peloton-music-licensing-lil-jon-run-class-removed/
- https://support.strava.com/hc/en-us/articles/14747612519821-Spotify-and-Strava
- https://newsroom.spotify.com/2023-04-12/spotify-strava-integration-stream-track-workout/
- https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html
- https://www.macrumors.com/2023/04/12/strava-spotify-integration-music-playback/
- https://routenote.com/blog/stream-spotify-in-strava/
- https://newsroom.spotify.com/2026-04-27/spotify-fitness-workouts-peloton/
- https://www.cnbc.com/2026/04/27/spotify-peloton-fitness-content-hub.html
- https://techcrunch.com/2026/04/27/spotifys-next-frontier-fitness-content/
- https://9to5mac.com/2026/04/27/spotify-launches-guided-workout-experiences-for-free-and-premium-users/
- https://investor.onepeloton.com/news-releases/news-release-details/pelotons-world-class-content-fuel-spotifys-new-fitness-category
- https://9to5mac.com/2021/01/02/apple-fitness-plus-apple-music/
- https://appleinsider.com/articles/21/01/03/apple-fitness-playlists-featured-in-apple-music-search
- https://support.apple.com/en-us/108761
- https://www.cnn.com/cnn-underscored/reviews/tempo-move-home-gym
- https://www.healthline.com/health/fitness/tempo
- https://support.fitiv.com/hc/en-us/articles/47418490971540-Guide-How-do-I-control-music-during-workouts-in-FITIV
- https://apps.apple.com/us/app/forme-personal-training/id1532950399
- https://www.whoop.com/us/en/thelocker/10-whoop-features-you-need-to-know/
- https://help.fitbod.me/hc/en-us/sections/35305345636375-Integrations
- https://www.boostcamp.app/features
- https://www.hevyapp.com/features/
- https://caliberstrong.com/workout-app/

Verification note: direct page fetches were blocked (403) in this environment,
so competitive findings are built from search-result extracts across multiple
independent sources per claim. User-sentiment items are paraphrased from review
and community aggregators, not verbatim App Store or Reddit quotes. The strongest
single factual signal is that Strava shipped the in-session Spotify discovery
strip and removed it on 17 February 2026, the same quarter Spotify launched its
own fitness hub.
