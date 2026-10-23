# paper-render

A "paper render" harness: screenshots of EVERY screen Volyume registers, at
phone size, against a real, realistic account, so the design lead and the
founder can see the app's screens without a device-build round trip. Not a
test suite, not shipped code, not picked up by CI (see "Invisible to CI"
below).

## Run it

```
bash scripts/paper-render/run.sh
```

One command. Safe to re-run any number of times (each run clears its own
working state first). Takes a few minutes end to end (seed + mount + convert
+ screenshot every render, then the Welcome, store and phone sets). Never
touches git.

Where it writes (all optional; `paths.js` is the one place that decides):

| Variable | What | Default |
|---|---|---|
| `PAPER_RENDER_SCRATCH` | working root | `<tmpdir>/paper-render` |
| `PAPER_RENDER_OUT_DIR` | full-height PNGs, `index.html`, `report.md` | `<scratch>/paper-renders` |
| `PAPER_RENDER_PHONE_DIR` | `jpg/` and `manifest.json` | `<scratch>/phone` |
| `PAPER_RENDER_CHROME` | the Chromium binary | `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |
| `PAPER_RENDER_ONLY` | `HomeScreen,CoachOutputScreen`: render only these (Jest stage only, HTML into the work dir) | all |
| `PAPER_RENDER_NO_FOLD=1` | leave the dashed 915 px "fold" marker out of the pages | marker drawn |
| `PAPER_RENDER_CONCURRENCY` | Chromium processes at once in `shoot.js` | 4 |

Output:

```
<out>/NNN-ScreenName.png                 one full-height PNG per registered screen (dark, persona "Alex")
<out>/NNN-ScreenName-<variant>.png       its extra states (see below)
<out>/index.html, report.md              contact sheet by group; per-screen detail
<out>/welcome/{today,workout,nutrition}.jpg, <out>/store/{play,appstore}/NN-name.png
<phone>/jpg/NNN-ScreenName[-variant].jpg 540 px wide, quality 72, full height
<phone>/manifest.json                    one object per render (file, screen, variant, group, heightPx, state, error, ...)
```

`NNN` is the screen's number in the every-screen list (two digits, three when
the app registers more than 99 screens, as it does now). A variant shares its
screen's number.

## What is rendered

**Every screen the app registers.** `registry.js` reads
`src/navigation/RootNavigator.js` as text (every `<Stack.Screen>` in every
stack, de-duplicated by component) and `screenPlan.js` turns that into the
list. Nothing is hand-listed, so a screen added to the navigator is rendered
on the next run (with empty route params and a name in
`screensWithoutParamsEntry` in `report-data.json`), and a screen removed from
it drops out. The dormant billing screens (ProUpgrade, Subscription,
CascadeGate, SubscriptionPolicy) are not registered, so they are not rendered.

Each is mounted with the persona seed, in the dark theme, with the route
params it reads (`screenPlan.js` PARAMS, each taken from the screen's own
`route.params` use), built from the seed's ids: the plan, the routines, the
exercises, a finished workout, the block, the week starts, the mock challenge.
A screen that needs server data the harness does not have (Community posts,
profiles, groups, messages) is rendered in whatever state it shows without
it (loading, empty, "could not load"); `manifest.json`'s `state` says which.
A screen in a tab's stack has that tab's real five-tab `VolyumeTabBar` docked
beneath it, as on a device (the ActiveWorkout route hides the band itself).

**Groups** (`group` in the manifest): the first tab, in tab order (Today,
Train, Nutrition, Coach, Community), whose stack registers the screen;
overridden to **Settings** for the Settings screens and everything
SettingsScreen opens, and to **Setup and sign-in** for the setup wizard and
screens only the signed-out, consent and onboarding stacks register. **Other**
is the fallback for a screen none of those place. `stacks` in the manifest
lists every navigator that registers the screen.

**Extra states** (suffix after the number and name):

| Suffix | Screen | State |
|---|---|---|
| `feed`, `people`, `groups`, `you` | CommunityHubScreen | the hub's four segments (the `segment` route param) |
| `history` | WorkoutSummaryScreen | a finished session reopened from history (readOnly) |
| `month`, `block` | YearOfLiftsScreen | the RecapStory route's monthly and block recaps |
| `coaching` | ProOnboardingScreen | the CoachingSetup route in the Coach stack |
| `signup` | LoginScreen | the sign-up sheet |
| `day0` | Today, Coach, Nutrition, Train, Recovery, Consistency, VolumeHeatmap | a brand-new account |
| `light` | Today, Coach, Nutrition, Recovery, Consistency, VolumeHeatmap | the light theme |
| `planned` | DiaryScreen | the day has a generated meal plan |
| `decision` | HomeScreen, YouScreen | this week's check-in done and its coaching decision saved (the Today decision line; Coach "This week's decision") |

Coach without this week's decision is the plain `YouScreen` render (the
persona's decision is last week's, so Past decisions shows and This week reads
"Check-in is open"). Settings and Settings > Profile are SettingsScreen and
SettingsProfileScreen like any other.

## The tab bar fixture

`TAB_DEFS` in `paper-render.test.js` is an explicit copy of RootNavigator's
five tabs: Today, Train, Nutrition, Coach, Community, with the route names
(`HomeTab`, `PlansTab`, `DiaryTab`, `ProfileTab`, `CommunityTab`), titles and
icons RootNavigator uses. The first test parses `RootNavigator.js` and fails
if the two disagree, so a future change to the tabs stops the harness instead
of quietly rendering stale ones (how it went wrong after D231).

## The Welcome screen's captures

The first-launch Welcome screen shows three real captures of the app (register
D145): Today, a set being logged, the day's nutrition. The founder,
2026-09-26: the captures were rendered by Claude Code, not taken by hand, so
they are rendered here from the current app and refreshed whenever those
screens change (register D211).

`run.sh` makes them on every run: the Welcome pass mounts Today, the active
workout and Nutrition for the same "Alex" persona as one phone screen each
(`treeToHtml` `opts.phone`: the screen fills the height, the real
`VolyumeTabBar` sits at its foot, the fold line is not drawn), on a clean
account (the how-you-train offer and the meal-reminder offer dismissed through
the storage keys their own buttons write, removed again after the pass);
`welcome.js` shoots each at 412 CSS pixels and twice the density, crops the
phone height (headless Chromium leaves the bottom of its window unpainted, so
the window is shot taller), scales to the assets' 480 x 940 and encodes JPEG
with CanvasKit, into `<out>/welcome/{today,workout,nutrition}.jpg`. It never
writes into `assets/`: copy the three files over `assets/welcome/` after
looking at them.

Skia drawing (the calorie ring) renders for real: the Skia mock in
`mockPreamble.js` records each path's `moveTo`/`lineTo`/`close`, and
`treeToHtml.js` draws a `Canvas`'s `Path`s as SVG from those commands, so the
ring is the app's own geometry, not an unknown-type box.

## The store listing screenshots

D211's own "Open, founder-side" note: the Play and App Store listing pages are
separate uploads in the consoles; this harness renders a full store set the
same way it renders the Welcome captures. `run.sh` makes them on every run,
after the Welcome captures: the store pass mounts ten captures for the same
"Alex" persona in dark theme, on the same clean account -- Today, Train, a set
being logged, the workout summary, **Coach** (it was Progress before the D231
layout rework removed that tab), Recovery twice (the muscle figure and the
"Your recovery speed" card), Nutrition, the weekly coaching decision and
Community -- each as one phone screen with the real `VolyumeTabBar` at the
foot for every capture that is a tab screen. Each capture is rendered TWICE,
once per store platform's own aspect ratio at 412 CSS pixels wide: Play (1080
x 1920) and the App Store (1290 x 2796). `store.js` shoots each at the device
scale that puts that platform's target width in physical pixels, crops
Chromium's unpainted window tail and scales the result onto a CanvasKit
surface of the exact target size, into `<out>/store/play/NN-name.png` and
`<out>/store/appstore/NN-name.png` (PNG, lossless uploads). The entries live
in `REPORT.store`, never `REPORT.screens`. It never writes into the repo.

## How it works

Stages, run in sequence by `run.sh`:

1. **`paper-render.test.js`** (a Jest file, run with the harness's own
   `jest.config.js`; see "Invisible to CI"). `mockPreamble.js` mocks the
   native/Expo/navigation wall the same way `src/__tests__/screen-mount.test.js`
   does, with one real change (`expo-sqlite` is `expoSqliteShim.js`, a
   `node:sqlite`-backed shim, so `src/lib/database.js` runs its own real
   schema + migrations) and a handful of mount-fidelity fixes a crash-sweep
   mount never needed (`mockPreamble.js`'s own header lists them, each also
   called out at its `jest.mock()` site). `seedPersona.js` seeds a realistic
   user ("Alex": eleven weeks of training history, a 10-day recent block,
   three logged meals today, 14 days of weigh-ins, a decided coaching week, a
   weekly check-in ready to fill in today) through the app's OWN write
   functions -- `database.js`, `food/db.js`, `seedExercises.js` -- never a raw
   INSERT. `seedDayZeroPersona()` seeds a second, brand-new account for the
   day-zero renders. Every screen is mounted with `react-test-renderer`
   (screen-mount's own lifecycle pattern; `useRoute()` and `useNavigation()`
   return the route and navigation the screen was mounted with), converted to
   a tree (`tree.toJSON()`, or a manual walk for a screen whose
   `RefreshControl` prop makes that throw), then to a standalone HTML document
   (`treeToHtml.js`). Per-screen failures are caught and recorded rather than
   failing the whole run -- "if a screen will not mount, record why and move
   on". The test blocks: the tab-bar fixture check; the every-screen dark pass
   with its extra states; day zero; Welcome; store; Nutrition with a planned
   day; the light theme (a `jest.resetModules()` reload so `theme.js`'s legacy
   singleton reflects light colours); and, after a reload back to dark, this
   week's coaching decision (last, because it changes the persona's data).
2. **`shoot.js`** (plain Node, no Jest). Reads `report-data.json`, measures
   each page's real height in headless Chromium, screenshots it at 412 CSS px
   wide, `--force-device-scale-factor=2`, at exactly that height, crops to it
   with CanvasKit, then builds `index.html` and `report.md`.
3. **`welcome.js`**, **`store.js`**: see above.
4. **`phoneSet.js`**: scales each PNG to 540 px wide, encodes JPEG quality 72
   with CanvasKit, and writes `manifest.json`.

## The converter (`treeToHtml.js`)

Maps a `react-test-renderer` host tree onto real HTML/CSS close enough to
React Native's own Yoga layout for a design review to trust:

| RN concept | HTML/CSS |
|---|---|
| `View` (and other container-like types: `ScrollView`, `Pressable`, `TouchableOpacity`, `FlatList`, `SafeAreaView`, `GestureDetector`, `WebView`, `Swipeable`, `KeyboardGestureArea`, ...) | `<div>` with RN's own Yoga defaults (`display:flex;flex-direction:column;align-items:stretch;flex-shrink:0;box-sizing:border-box;position:relative;min-width:0`) as the base, RN style props layered on top |
| `flex: n` | `flex: n 1 0%` (RN's own resolved shorthand, not CSS's) |
| `StyleSheet.hairlineWidth` | already resolved to `1` by the time the converter sees it (it's just a numeric style value); shadows are not mapped |
| `Text` | `fontSize`→px, `lineHeight`→px, `letterSpacing`→px, `color` (a Text with **no** colour renders **black**, RN's own default -- surfaced honestly, never hidden behind a fallback), `textAlign`, `numberOfLines`→`-webkit-line-clamp`, `fontVariant: ['tabular-nums']`→`font-variant-numeric:tabular-nums` |
| Custom fonts | by FACE name only, never numeric `fontWeight` (RN reads `fontWeight` for the OS accessibility bold-text setting, not to pick a face on a custom font registered face-by-face). `font-synthesis: none`. Faces: `Inter-Regular` 400, `Inter-Medium` 500, `Inter-SemiBold` 600, `Inter-Bold` 700, `Inter-ExtraBold` 800, `InterDisplay-Bold` 700, `InterDisplay-ExtraBold` 800, loaded from `assets/fonts/*.ttf`. **CSS string values are single-quoted** (`font-family:'Inter-Regular'`), not double-quoted -- see "Bugs found" below. |
| `Ionicons` | a `<span>` in the real Ionicons TTF (`node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf`), codepoint looked up from that package's own glyph map JSON |
| `react-native-svg` (`Svg`, `Path`, `Rect`, `Circle`, `Ellipse`, `Line`, `G`, `Defs`, `LinearGradient`, `Stop`, `ClipPath`, nested `Text`) | real inline `<svg>` |
| `Image` | the image file, embedded as a data URI `<img>` at the node's size with its `contentFit` / `resizeMode` (`tintColor` as a mask). The source resolves through the harness's Jest config (`{ testUri: <absolute path> }`, see below), a `file://` or absolute `uri`, or a `data:` URI. A remote URL, a numeric asset id or a missing file keeps a `#1c1b19` box with a `1px solid #2a2926` border and is counted as `image-unresolved:<why>` in `report.md` section 3. |
| `Switch` | a 51×31 pill, track/thumb colours from props |
| `TextInput` | a `<div>` showing `value`, or `placeholder` in a muted colour when empty |
| Anything else | a `<div>` with a small grey type-name label in the corner (position/size/count all deliberate), so a genuinely unhandled type is visible and countable rather than silently blank. `report.md` section 3 lists every one seen, with counts. |
| `zeego/context-menu`'s `ContextMenuItem*`/`ContextMenuSeparator`/etc. | **hidden entirely** (rendered as nothing) -- the one exception to "unknown types get a label". See "Bugs found" below. |

### Images

package.json's jest config maps every image `require` to
`__mocks__/asset-stub.js`, which exports the number `1`, so under the real
test suite `require('../../assets/volyume-v-compact.png')` is `1` and the
file is lost. The harness's own `jest.config.js` (package.json's `jest` block,
with two changes) sends images through `assetTransform.js` instead, which
returns react-native's own `{ testUri: <path> }`, with an absolute path. The
converter reads the file from there. Nothing under package.json is touched;
`npm test` still sees `1`.

### Height

Chromium's headless `--screenshot` is a fixed-viewport capture, not a
full-page one. `treeToHtml.js` puts a small script in every page that reports
the laid-out height once the fonts are in (`data-pr-height`); `shoot.js` reads
it with `--dump-dom`, shoots a window of that height plus Chromium's measured
window-to-viewport gap, and crops the PNG to exactly the page height. Pages
cap at 30,000 CSS px (a 60,000 px PNG); one that hits the cap is flagged in
`report.md`. (The converter's own height estimate, `pageHeightPx`, is kept in
`report-data.json` as a fallback if a measurement fails.)

## Bugs found this way, fixed in this harness's own files

Opening real renders with the Read tool (not just reading the diff) surfaced
real defects, all fixed in `treeToHtml.js` / `mockPreamble.js` / the driver,
none in `src/`:

1. **Every screen's type scale was invisible.** `style="..."` attributes
   embedded a literal `"Name"` inside `font-family` (and Ionicons' own
   `"Ionicons"`), which closes an HTML **double-quoted** attribute early --
   silently dropping `font-family` itself plus every CSS property listed
   after it. Fixed by single-quoting those CSS string values.
2. **ActiveWorkoutScreen's long-press menu leaked onto the row.** The shared
   repo-root mock for `zeego/context-menu` renders `Root`/`Content` as an
   always-visible passthrough with no open/closed state. Fixed with a small
   `HIDDEN_TYPES` set in `treeToHtml.js`.
3. **Every Image was a dark box**, so the header brand mark and avatars looked
   broken. Now drawn from the real file (see "Images").
4. **The harness went stale when D231 changed the tabs** (six tabs, a Progress
   tab, two deleted screens). The tab fixture is now checked against
   `RootNavigator.js` and the screen list is read from it.

## Invisible to CI

```
npx jest --listTests | grep -c paper-render
```

prints `0`: `package.json`'s `jest.testMatch` only matches `**/__tests__/**`
and `**/tests/**`, and `paper-render.test.js` lives directly under
`scripts/paper-render/`. The harness's own Jest config
(`scripts/paper-render/jest.config.js`) is passed explicitly with `--config`;
Jest only auto-discovers a config in the root directory. `run.sh` checks the
`listTests` line itself before every run and refuses to continue if it ever
stops being true.

`npm run lint` does not lint this folder (`eslint.config.js` ignores
`scripts/**`).

## Known limitations (also in `report.md`, per-run)

- **`Canvas` drawing other than paths** (`@shopify/react-native-skia`, mocked
  to a bare string host type): paths are drawn from their recorded commands;
  any other Skia drawing has no HTML equivalent and renders as the generic
  unknown-type box. The surrounding card's own labels and values are real text
  either way.
- **Server data is not faked.** Community feeds, profiles, groups and
  messages come back empty from the mocked Supabase, so those screens show
  their loading, empty or "could not load" state. The gym challenge API is
  the one network edge mocked with plausible data.
- **Cameras and native pickers do nothing.** A screen that opens the camera
  (barcode and label scanners, the clip camera) shows whatever it shows with
  the camera modules mocked; see its entry in the manifest.
- **`CoachOutputScreen` recomputes its decision live** via the real,
  deterministic `runWeeklyCoach()` engine on mount and re-persists it (by
  design). It mounts after Today and Coach in the dark pass, so those show the
  seed's hand-authored decision (read first), while CoachOutputScreen itself
  and the later passes show the engine's own recomputed one.
- **Disclosed data-layer bypasses** (Community "me" profile,
  `@volyume_notification_prefs.checkinDay`, the coach decision's authored
  content, this week's authored decision for the `decision` renders): no local
  write function exists for the first two -- both are client-only/cache-only
  state -- and the coach decision would need the live engine's ~20
  interdependent inputs correctly wired. All are named in `seedPersona.js`'s
  own `report.bypassedWrites` and repeated in `report.md` section 1.

## Files

- `run.sh` -- the one command.
- `paper-render.test.js` -- Jest driver.
- `jest.config.js`, `assetTransform.js` -- the harness's own Jest config and
  image transform.
- `registry.js`, `screenPlan.js` -- the every-screen list (from
  RootNavigator.js), groups, route params, tab bar placement, extra states.
- `seedPersona.js` -- realistic persona + day-zero account, real write functions.
- `mockPreamble.js` -- the mock wall.
- `expoSqliteShim.js`, `dbCryptoPassthrough.js` -- the real-SQLite data layer.
- `treeToHtml.js` -- the converter.
- `shoot.js` -- screenshots + `index.html` + `report.md`.
- `welcome.js`, `store.js` -- the Welcome captures and the store screenshots.
- `phoneSet.js` -- the 540 px JPEGs and `manifest.json`.
- `paths.js` -- where everything is read and written.
