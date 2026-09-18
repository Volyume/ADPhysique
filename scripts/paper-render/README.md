# paper-render

A "paper render" harness: screenshots of every main Volyume screen at phone
size, against a real, realistic account, so the design lead can see the
type-scale and surface-ladder work land without a founder device-build round
trip. Not a test suite, not shipped code, not picked up by CI (see
"Invisible to CI" below).

## Run it

```
bash scripts/paper-render/run.sh
```

One command. Safe to re-run any number of times (each run clears its own
working state first). Takes well under a minute end to end (seed + mount +
convert + screenshot all 23 screen/variant renders). Never touches git.

Output (also see the generated `report.md`, which is the fuller version of
this section):

```
<scratch>/paper-renders/
  01-HomeScreen.png ... 16-WorkoutHistoryScreen.png   (16 screens, dark, persona "Alex")
  01-HomeScreen-day0.png, 04-AnalyticsScreen-day0.png,
  06-DiaryScreen-day0.png, 07-PlansScreen-day0.png    (fresh account, no history)
  01-HomeScreen-light.png, 04-AnalyticsScreen-light.png,
  06-DiaryScreen-light.png                            (light theme)
  index.html                                          (contact sheet)
  report.md                                           (per-screen detail, converter fallback counts)
```

`<scratch>` is `$PAPER_RENDER_SCRATCH` if set, else this session's own
scratchpad directory (see `paper-render.test.js` / `shoot.js` for the exact
default). Override the Chromium binary with `PAPER_RENDER_CHROME` and the
output directory with `PAPER_RENDER_OUT_DIR` if ever needed; neither has to
be set normally.

## How it works

Two stages, run in sequence by `run.sh`:

1. **`paper-render.test.js`** (a Jest file, run directly -- see "Invisible
   to CI"). `mockPreamble.js` mocks the native/Expo/navigation wall the same
   way `src/__tests__/screen-mount.test.js` does, with one real change
   (`expo-sqlite` is `expoSqliteShim.js`, a `node:sqlite`-backed shim, so
   `src/lib/database.js` runs its own real schema + migrations) and a
   handful of mount-fidelity fixes a crash-sweep mount never needed --
   `mockPreamble.js`'s own header comment lists all of them, each also
   called out again at its own `jest.mock()` site. `seedPersona.js` seeds a
   realistic user ("Alex": a 10-day training history, three logged meals
   today, 14 days of weigh-ins, a decided coaching week, a weekly check-in
   ready to fill in today) through the app's OWN write functions --
   `database.js`, `food/db.js`, `seedExercises.js` -- never a raw INSERT.
   `seedDayZeroPersona()` seeds a second, brand-new account for the
   day-zero renders. Every screen is mounted with `react-test-renderer`
   (screen-mount's own lifecycle pattern), converted to a tree
   (`tree.toJSON()`, or a manual walk for the one screen whose
   `RefreshControl` prop makes that throw), then to a standalone HTML
   document (`treeToHtml.js`). Per-screen failures are caught and recorded
   rather than failing the whole run -- "if a screen will not mount, record
   why and move on" -- three `test()` blocks (dark pass, day-zero pass,
   light-theme pass with a `jest.resetModules()` reload so
   `src/styles/theme.js`'s legacy singleton reflects light colours).
2. **`shoot.js`** (plain Node, no Jest). Reads the first stage's
   `report-data.json`, screenshots each screen's HTML with headless
   Chromium at 412 CSS px wide, `--force-device-scale-factor=2`, full page
   height (see "Height" below), then builds `index.html` and `report.md`
   from the combined data.

## The converter (`treeToHtml.js`)

Maps a `react-test-renderer` host tree onto real HTML/CSS close enough to
React Native's own Yoga layout for a design review to trust:

| RN concept | HTML/CSS |
|---|---|
| `View` (and other container-like types: `ScrollView`, `Pressable`, `TouchableOpacity`, `FlatList`, `SafeAreaView`, `GestureDetector`, `WebView`, `Swipeable`, `KeyboardGestureArea`, ...) | `<div>` with RN's own Yoga defaults (`display:flex;flex-direction:column;align-items:stretch;flex-shrink:0;box-sizing:border-box;position:relative;min-width:0`) as the base, RN style props layered on top |
| `flex: n` | `flex: n 1 0%` (RN's own resolved shorthand, not CSS's) |
| `StyleSheet.hairlineWidth` | already resolved to `1` by the time the converter sees it (it's just a numeric style value); shadows are not mapped (ignored, matching the brief) |
| `Text` | `fontSize`→px, `lineHeight`→px, `letterSpacing`→px, `color` (a Text with **no** colour renders **black**, RN's own default -- surfaced honestly, never hidden behind a fallback), `textAlign`, `numberOfLines`→`-webkit-line-clamp`, `fontVariant: ['tabular-nums']`→`font-variant-numeric:tabular-nums` |
| Custom fonts | by FACE name only, never numeric `fontWeight` (RN reads `fontWeight` for the OS accessibility bold-text setting, not to pick a face on a custom font registered face-by-face -- applying it here would fight the `@font-face` rules and risk a synthesised bold no device shows). `font-synthesis: none`. Faces: `Inter-Regular` 400, `Inter-Medium` 500, `Inter-SemiBold` 600, `Inter-Bold` 700, `Inter-ExtraBold` 800, `InterDisplay-Bold` 700, `InterDisplay-ExtraBold` 800, loaded from `assets/fonts/*.ttf`. **CSS string values are single-quoted** (`font-family:'Inter-Regular'`), not double-quoted -- see "Bugs found" below for why that is load-bearing, not a style choice. |
| `Ionicons` | a `<span>` in the real Ionicons TTF (`node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf`), codepoint looked up from that package's own glyph map JSON |
| `react-native-svg` (`Svg`, `Path`, `Rect`, `Circle`, `Line`, `G`, `Defs`, `LinearGradient`, `Stop`, `ClipPath`, nested `Text`) | real inline `<svg>` |
| `Image` | a `#1c1b19` box, `1px solid #2a2926` border (no real image asset pipeline in this harness) |
| `Switch` | a 51×31 pill, track/thumb colours from props |
| `TextInput` | a `<div>` showing `value`, or `placeholder` in a muted colour when empty |
| Anything else | a `<div>` with a small grey type-name label in the corner (position/size/count all deliberate -- see the brief), so a genuinely unhandled type is visible and countable rather than silently blank. `report.md` section 3 lists every one seen, with counts. |
| `zeego/context-menu`'s `ContextMenuItem*`/`ContextMenuSeparator`/etc. | **hidden entirely** (rendered as nothing) -- the one exception to "unknown types get a label". See "Bugs found" below. |

### Height

Chromium's headless `--screenshot` is a fixed-viewport capture, not a
full-page auto-grow one, so `--window-size`'s height has to already cover
the real content or the shot crops it. `treeToHtml.js` estimates each
page's height from the same style values it is converting (best-effort --
line-wrapping is approximated, not measured); `shoot.js` shoots at
`max(3000, estimate + 300px)`, capped at 12,000px, one pass (the brief's own
"render at height 3000, reshoot taller if the converter reports more" folded
into one step, since the converter's estimate is already known before
Chromium ever runs -- see `shoot.js`'s header for the fuller reasoning). A
screen that hits the 12,000px cap is flagged in `report.md` for a manual
look; none has so far.

## Bugs found this way, fixed in this harness's own files

Opening real renders with the Read tool (not just reading the diff) surfaced
two real defects, both fixed in `treeToHtml.js` / `mockPreamble.js`, neither
in `src/`:

1. **Every screen's type scale was invisible.** `style="..."` attributes
   embedded a literal `"Name"` inside `font-family` (and Ionicons' own
   `"Ionicons"`), which closes an HTML **double-quoted** attribute early --
   silently dropping `font-family` itself plus every CSS property listed
   after it in the object (for `Text`, that included the `numberOfLines`
   line-clamp; for icons, size/colour/line-height/display too). Every
   screen was rendering `Inter-Regular` at every weight, with no icon
   glyphs at all, until this was fixed by single-quoting those CSS string
   values instead (`font-family:'Inter-Regular'`) -- equally valid CSS,
   never clashes with the outer double quotes. This is the whole reason the
   brief's VERIFY step opens real renders rather than trusting the diff.
2. **ActiveWorkoutScreen's long-press menu leaked onto the row.** The
   shared repo-root mock for `zeego/context-menu`
   (`__mocks__/zeego/context-menu.js`, outside this harness, not modified)
   renders `Root`/`Content` as an always-visible passthrough with no
   open/closed state -- real screen-mount tests never needed one. Left as
   an unknown converter type, the menu's own item AND its nested title both
   got their own debug label at the same top-left origin, one sitting
   directly on the other's real text. Fixed with a small `HIDDEN_TYPES` set
   in `treeToHtml.js` that renders those specific named types (taken
   straight from that mock's own object literal) as nothing -- what a
   closed menu on a real device actually shows.

## Invisible to CI

```
npx jest --listTests | grep -c paper-render
```

prints `0`: `package.json`'s `jest.testMatch` only matches `**/__tests__/**`
and `**/tests/**`, and `paper-render.test.js` lives directly under
`scripts/paper-render/`. `run.sh` checks this itself before every run and
refuses to continue if it ever stops being true.

## Known limitations (also in `report.md`, per-run)

- **Height is estimated, not measured.** Generous margin (see "Height"
  above) covers it in practice; nothing has hit the safety cap so far.
- **`Canvas` (chart canvases from `@shopify/react-native-skia`, mocked to a
  bare string host type) has no HTML equivalent** and renders as the
  generic unknown-type box -- there is no way to draw the real chart
  without the native Skia renderer. The surrounding card's own labels and
  values are real text either way.
- **`CoachOutputScreen` recomputes its decision live** via the real,
  deterministic `runWeeklyCoach()` engine on mount and re-persists it (by
  design -- this is the actual coaching engine, untouched by this harness).
  It mounts after HomeScreen/AnalyticsScreen in the dark pass, so those two
  screens show the seed's hand-authored decision text (read first), while
  CoachOutputScreen itself and the light-theme pass (which reopens the same
  database afterwards) show the engine's own recomputed one. Both are real
  writes through `saveCoachOutput`; see `report.md` section 1.
- **Disclosed data-layer bypasses** (Community "me" profile,
  `@volyume_notification_prefs.checkinDay`, the coach decision's authored
  content): no local write function exists for the first two -- both are
  client-only/cache-only state -- and the coach decision would need the
  live engine's ~20 interdependent inputs correctly wired to be
  engine-derived rather than authored-for-realism. All three are named in
  `seedPersona.js`'s own `report.bypassedWrites` and repeated in
  `report.md` section 1, never silently done.

## Files

- `run.sh` -- the one command.
- `paper-render.test.js` -- Jest driver.
- `seedPersona.js` -- realistic persona + day-zero account, real write functions.
- `mockPreamble.js` -- the mock wall.
- `expoSqliteShim.js`, `dbCryptoPassthrough.js` -- the real-SQLite data layer.
- `treeToHtml.js` -- the converter.
- `shoot.js` -- screenshots + `index.html` + `report.md`.
