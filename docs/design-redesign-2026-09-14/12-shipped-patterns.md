# 12 — WHAT ACTUALLY SHIPS IN 2026: five patterns, from real screens

Read-only research lane, 2026-09-14. Authority: founder in chat, 2026-09-14:
"I wouldn't make it look like a fitness app. The current 2026 design trend is
actually moving toward minimalism, thumb-friendly layouts, bottom sheets,
restrained glass effects, tactile depth and purposeful micro-interactions
rather than simply throwing gradients and cards everywhere."

Every claim is marked **[SEEN]** (I loaded the pixels and looked at them),
**[DESCRIBED BY SOURCE]** (a named source says so; I did not see it), or
**[JUDGEMENT]** (my reading, labelled as mine).

---

## 0. DEZZAYN: WHAT I COULD AND COULD NOT SEE — read this first

**I could not see Dezzayn's screens.** The library is a paywall. Stating it
plainly because the founder's brief assumed it was free to browse:

- `https://dezzayn.com` returns a marketing landing page. Nav is Apps /
  Pricing / Log in / Get started. Pricing is **$12/month, $30/quarter,
  $100/year**. [SEEN — page fetched]
- `https://dezzayn.com/apps` IS a real public index: 1,130 apps across 15
  categories, paginated 19 pages, with category counts (Media &
  Entertainment 146, Productivity 136, Finance & Fintech 125). [SEEN]
- An app page such as `https://dezzayn.com/apps/revolut` returns: a
  one-paragraph app description, a screen count ("**704 screens captured
  across iOS & Web. Browse the full flow, high-res, in dezzayn**"), **exactly
  one cover thumbnail per platform**, a grid of 12 sibling apps, and an
  "Open in dezzayn" button pointing at `/login`. No screen names, no flow
  names, no UI-element tags, no searchable elements. [SEEN — raw HTML pulled
  and every `thumbs.dezzayn.com` URL extracted: 60 URLs, but they are one
  `grid-1600.webp` + one `thumb.webp` per app, i.e. covers only.]
- The images themselves ARE publicly reachable (no auth): I downloaded
  `.../ios/f0c4dba4…/grid-1600.webp` (HTTP 200, 9,086 bytes, WebP 1180×2556)
  and viewed it. It is **the Revolut splash screen** — black wordmark on
  white, nothing else. That is what a "cover" is. [SEEN]
- No public API. `/api/apps` returns the HTML shell. Element/pattern search
  URLs all resolve behind `/login`.
- Its free `/guides` are substantive but generic (type scale 16px base,
  ratios 1.2–1.333, 8px grid, 100–150 ms for press feedback, 200–300 ms for
  transitions, "two to three shadow levels maximum", "most professional
  screens are overwhelmingly neutral gray with one accent doing all the
  emphasis"). [SEEN — `/guides/professional-design-details`]

**Mobbin is also closed**: `mobbin.com/explore/mobile/apps/revolut` returns
HTTP 403 to any non-browser client. [SEEN]

### What I used instead, and why it is better evidence than a summary

The **iTunes Search API** (`https://itunes.apple.com/search`) is public,
unauthenticated, and returns `screenshotUrls` for any App Store listing. The
path segment `/320x480bb.jpg` can be rewritten to `/800x1600bb.png`. I
downloaded 30 screenshots for five non-fitness apps and **looked at every one
of the eight cited below**. [SEEN]

Caveat I am not going to paper over: App Store screenshots are *curated* and
some are marketing composites, not device captures. I say which is which
below, and I only describe screens where the device frame contains an actual
rendered UI. The eight screens I read pixel-by-pixel:

| File | App | Screen | Real UI or marketing art |
|---|---|---|---|
| `linear-mobile-02` | Linear Mobile | Inbox, dark | Real UI in a device frame |
| `linear-mobile-03` | Linear Mobile | Issue composer sheet | Real UI, keyboard up |
| `linear-mobile-05` | Linear Mobile | Project detail | Real UI |
| `stripe-dashboard-01` | Stripe Dashboard | Home + lock-screen widget | Real UI (two frames) |
| `stripe-dashboard-03` | Stripe Dashboard | Tap to Pay sheet | Real UI, partly composited |
| `stripe-dashboard-04` | Stripe Dashboard | Balances + Payouts list | Real UI |
| `things-3-02` | Things 3 | Today, light | Real UI |
| `revolut-mobile-finance-02` | Revolut | Savings account detail | Real UI |
| `monzo-…-02`, `revolut-…-01` | Monzo, Revolut | — | **Marketing art. Not used as screen evidence.** |

Local copies (scratchpad, not committed):
`/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad/shots/`

### A correction to the brief's own constraint list

**`expo-blur` is NOT installed.** It is absent from `package.json` and from
`node_modules`. The only mention anywhere in `src/` is a comment at
`src/styles/theme.js:26`:

> `// (expo-blur declined, Android-first rule); on iOS, blur may be introduced`

So the project has **already ruled against blur on Android**, and adding
`expo-blur` would be a new dependency requiring founder approval. Section 3
is written on that basis. Also present but not in the brief's list:
`react-native-haptic-feedback ^3.0.0` alongside `expo-haptics ~15.0.8`, and
`react-native-ios-context-menu`/`ios-utilities` (iOS only). Confirmed
installed: `@gorhom/bottom-sheet ^5.2.14`, `react-native-reanimated ~4.1.1`
(+ `react-native-worklets 0.5.1`), `@shopify/react-native-skia 2.2.12`,
`react-native-svg 15.12.1`, `react-native-gesture-handler ~2.28.0`,
`@shopify/flash-list 2.0.2`, `expo-linear-gradient ~15.0.8`.

---

## 1. BOTTOM SHEETS AS THE PRIMARY MODAL SURFACE

### 1.1 What a sheet is for, per the people who publish specs

NN/g defines a bottom sheet as "an overlay that is anchored to the bottom edge
of a mobile device's screen and that displays additional details or actions",
and splits them into **modal** ("blocks any interactions with the background
content while it is visible"), **nonmodal**, and **expandable** — "typically,
bottom sheets start off as nonmodal in their minimized state but become modal
when expanded." Their central use case: "when users are likely to need to
refer to the main, background information." [DESCRIBED BY SOURCE — nngroup.com]

NN/g's three hard refusals, verbatim: "Do not use a bottom sheet to replace
typical page-to-page user flows"; do not use one where "users will likely
spend significant time reviewing"; a sheet "is inherently a transient UI
element — it is meant to support quick interactions." They name stacking as
"one of the biggest issues with bottom sheets", and require both a hardware
Back path and "a clear *Close* button (usually styled as an X or the word
*Close*) at the top" rather than relying on the grabber alone.
[DESCRIBED BY SOURCE]

eBay's shipped design system is the most concrete public spec I found:
"the vertical height of the sheet defaults up to **50% of the screen height**"
with a "**minimum height is 30%**"; "the scrim blocks interaction with the
main page and **is active by default**"; "the footer provides a consistent
location at the bottom of the sheet for actions"; "when the content is
scrolled, **the sheet slides to full height and the content body scrolls when
the full height is reached**"; dismissal by selection, close button, downward
swipe, tap outside (modal only), or hardware back. Anti-patterns: "Don't use
bottom sheets for high-priority decisions or messages. Use an alert dialog
instead" and "Don't launch other modal elements… from a bottom sheet."
[DESCRIBED BY SOURCE — playbook.ebay.com]

Apple's UIKit/SwiftUI mechanics, from developer write-ups (I could not load
the HIG page itself; developer.apple.com returned only a title to WebFetch and
its JSON endpoint 404s): detents are composable
(`.fraction(0.3)`, `.medium`, `.large`); the grabber is recommended "where it
might be less obvious that a sheet is resizable"; and
`largestUndimmedDetentIdentifier` lets the sheet be **non-dimming at medium
and dimming at large**, so one sheet can be nonmodal small and modal tall.
[DESCRIBED BY SOURCE — sarunw.com, nemecek.be, WWDC21-10063 summaries]

### 1.2 A shipped sheet, examined

**Linear Mobile, issue composer** [SEEN — `linear-mobile-03`]. This is the
best single reference for what Volyume needs, because it is a *create* task
with many attributes done in one sheet:

- The sheet sits at **large detent with the parent visible as a thin strip**:
  a rounded, dimmed sliver of the screen behind peeks above it. The parent is
  pushed back and scaled, not hidden. It **never reaches true full height**.
- The sheet's own top bar is three objects: a **circular X at the left**, a
  **centred context pill** ("📱 Mobile" — which team the issue lands in), and
  a **circular ↑ submit at the right**. Both circles read ~44 px. No title
  bar, no "Cancel/Save" text pair.
- Title and body are **unboxed text fields** — large semibold for the title,
  regular for the body, no borders, no labels, no placeholder chrome.
- Attributes are a **horizontally scrolling row of chips** just above the
  keyboard: `Triage` (orange glyph), `Medium` (bar glyph), `Josh Pyles`
  (avatar), `iOS` (Apple glyph). Fully rounded, ~36 px, dark fill. Every
  property of the object is set without leaving the sheet.
- A **formatting bar is anchored to the keyboard**, one dark capsule, 7 icons
  with a divider after the first.

**Stripe Tap to Pay** [SEEN — `stripe-dashboard-03`] shows the opposite end:
a near-black sheet whose entire job is one figure. Amber circular merchant
badge, "Pay Roastery" at ~17 px, **£12.50 at roughly 56 px**. Nothing else.

### 1.3 Measured evidence that sheets beat pushed screens — honest answer

**I did not find any.** No controlled study, no published A/B result, no
peer-reviewed comparison. The only live experiment I could locate is
MetaMask's open PR "add shared screen vs bottom-sheet A/B test"
(`MetaMask/metamask-mobile#36018`) — the test exists, the result is not
published. [DESCRIBED BY SOURCE] Everything else on the open web is design
opinion. Anyone who tells you "sheets convert better" is quoting an agency
blog. [JUDGEMENT]

The defensible argument is the *indirect* one and it belongs to section 2:
the sheet's controls land in the thumb zone, and the thumb-zone evidence is
real. [JUDGEMENT]

### 1.4 What Volyume should build (and what it costs)

`@gorhom/bottom-sheet` v5 is already installed, runs on Reanimated worklets
(UI thread, not JS), ships `BottomSheetBackdrop`, `BottomSheetFlatList` /
`BottomSheetScrollView`, keyboard handling, and **dynamic sizing on by
default** (`enableDynamicSizing`, with `maxDynamicContentSize`) — set it
`false` if you want fixed snap points. [DESCRIBED BY SOURCE — gorhom.dev]

Recommended house rules, all buildable with what is installed [JUDGEMENT]:

1. **Two detents, never three.** `['45%', '88%']`. 88% not 100%, so the
   parent always peeks — that sliver is what tells a sweaty hand "you are on
   top of something, not somewhere new".
2. **Grabber always on**, because chalky fingers miss small X targets and the
   grabber is a 60 px-wide drag affordance. Keep the X *as well*, per NN/g.
3. **Undimmed at the low detent, dimmed at the high one.** Match iOS's
   `largestUndimmedDetentIdentifier` by animating the backdrop opacity from
   the sheet's animated index: 0 → 0.55 between detent 0 and 1.
4. **Primary action pinned to the sheet footer**, inside the safe area, never
   scrolling with content. eBay's rule, and it is also the thumb rule.
5. **Content scrolls inside** via `BottomSheetScrollView`; the sheet only
   grows to the top detent when the scroll is at 0 and the drag is downward.
6. **Never stack.** A sheet that needs a second sheet is a screen. Where a
   second layer is unavoidable (a picker inside a logging sheet), swap the
   sheet's *content* with a horizontal transition and a back chevron — one
   surface, two pages.
7. **Sheets for**: logging a set, swapping an exercise, editing a target,
   a food entry, a filter. **Screens for**: the workout itself, the weekly
   coach run, onboarding, anything ED-adjacent that needs full attention.

---

## 2. THUMB-FRIENDLY LAYOUT

### 2.1 The reachability evidence, graded

- Steven Hoober's observational study, 1,333 observations: "**about 75% of
  people rely on their thumb** and **49% rely on a one-handed grip**"; 36%
  cradle and jab with the other hand; 15% two-handed. This is the primary
  source everything else quotes. [DESCRIBED BY SOURCE — alistapart.com,
  smashingmagazine.com]
- "On large screens (over four inches) those kinds of behaviors can stretch
  people's thumbs well past their comfort zone as they try to reach controls
  positioned at the top." [DESCRIBED BY SOURCE]
- A figure worth citing *only with its caveat*: "tap accuracy in the natural
  zone reaches **96%**, compared to just **61%** in the stretch zone", and
  "the Natural Zone encompasses roughly the **bottom 25–40% of the screen**".
  Multiple secondary sources attribute this to NN/g. **I could not find the
  primary NN/g study**, so treat the attribution as unverified.
  [DESCRIBED BY SOURCE, attribution unverified]
- Similarly unverified: "a primary action tapped from the bottom zone tends
  to see **10 to 20% better completion**", and hidden hamburger menus "cut
  task completion by roughly 21%". Agency blogs, no primary citation.
  [DESCRIBED BY SOURCE, low-grade]
- Solid and checkable: NN/g's navigation-discoverability work is widely cited
  as hidden navigation achieving **21% discoverability vs 48% for visible**.
  [DESCRIBED BY SOURCE]

### 2.2 What shipped products actually did

- **Safari moved the address bar to the bottom in iOS 15** and, after
  backlash, made it a setting. **Firefox iOS** already had it. **Chrome iOS**
  shipped a bottom omnibox in 2023. **Chrome Android** began rolling a
  bottom address bar out around **Chrome 135 (2025)**, with an in-product
  prompt offering to move it. [DESCRIBED BY SOURCE — androidauthority,
  9to5google, TechCrunch, Google support]
- **Apple moved search to the bottom across iOS**: "the search button being
  on the bottom of the screen is a newer emphasis of Apple's. In previous iOS
  versions, search was just as often found at the top of the screen — however,
  up there, it is more difficult to reach when using the phone one-handed."
  [DESCRIBED BY SOURCE — learnui.design]
- **The counter-example that matters most.** iOS 18's Photos redesign
  **removed the bottom tab bar** for a single scrolling surface. It was, in
  MacRumors' words, met with users calling it "cluttered and convoluted",
  "confusing, unintuitive, and overwhelming". Apple reversed it: tabs
  returned in iOS 26, with Craig Federighi saying "Many of you missed using
  tabs in the Photos app." [DESCRIBED BY SOURCE — macrumors.com]
  **Lesson for Volyume: do not remove the tab bar to look minimal.**
  [JUDGEMENT]

### 2.3 Shipped bottom-anchored layouts, examined

**Linear Mobile** [SEEN — `linear-mobile-02`, `-05`] runs a **floating
capsule tab bar**: a dark, fully-rounded pill holding four icons, *detached
from the screen edges on all sides*, with a **separate circular search button
sitting outside it to the right**. On the project screen the active tab is a
filled pill that also carries a small up/down chevron — the active tab
doubles as a switcher. Top-right controls are compressed to **one capsule
holding two icons** (compose, overflow) rather than two separate targets.

**Things 3** [SEEN — `things-3-02`] puts the only creation affordance, a blue
circular +, at the **bottom right, floating over the list**, and keeps the
top bar to a back chevron and a small ellipsis-in-circle. The screen title
("Today", ~34 px bold with a yellow star) is *content*, not chrome.

**Revolut** [SEEN — `revolut-…-02`] puts four circular actions (Add money,
Move, Info, More) in a row **directly under the hero**, at roughly 45–55% of
screen height — the top of the natural zone — with text labels under each
circle, not inside them.

**Stripe Dashboard** [SEEN — `stripe-dashboard-04`] is the outlier: its
"Pay out funds" primary action sits mid-screen, under the balance summary it
belongs to. Proximity beat reachability there because the action is
*about* the figures directly above it. [JUDGEMENT]

### 2.4 What Volyume should build

1. **Keep the tab bar.** Do not chase the iOS 18 Photos mistake.
2. **Every destructive or committing action lives in the bottom third.**
   Log set, finish session, save, confirm — footer-pinned, full width, inside
   the safe area, minimum 56 px tall (bigger than the 44 px floor, because
   the hand is sweaty).
3. **Move search to the bottom** on Food and Exercise pickers, or put the
   query field inside the sheet footer above the keyboard, where the thumb
   already is.
4. **Stop putting single actions at top-right.** Where a screen has two, use
   Linear's grouped capsule. Where it has one that matters, it belongs at the
   bottom.
5. **Mid-set surfaces get a reach budget**: nothing required to complete a
   set may sit above 60% screen height. Assert it with a test that walks the
   logger's layout and fails on any `onPress` target above the line.
   [JUDGEMENT — this is buildable as a source-level guard in the existing
   regression style]

---

## 3. RESTRAINED GLASS AND TACTILE DEPTH

### 3.1 "Restrained" in 2026 means: overlays yes, content never

The consensus across current design writing is narrow and consistent:
"most designers use glass selectively on overlays, modals, and floating cards
while keeping primary content areas flat and unblurred"; it "works best for
overlays, modals, and navigation bars where you want to maintain context of
the content behind, but don't use it for primary content — readability always
comes first"; "glassmorphism is a spice, not a meal." [DESCRIBED BY SOURCE —
orizon.co, clay.global, hidezign.com]

### 3.2 Liquid Glass: current state and the criticism, accurately

NN/g's teardown ("Liquid Glass Is Cracked, and Usability Suffers in iOS 26")
names specific failures [DESCRIBED BY SOURCE — nngroup.com]:
- **Messages**: "Text on top of images is a bad idea because the contrast
  between the text and the background is often too low."
- **Maps**: bottom icons "blend in with the images in the background, despite
  the blurring of the background."
- **Mail**: search bars over email previews produce "an illegible mess."
- **Safari**: floating controls "compete for attention with in-page floating
  buttons."
- **Touch targets**: Apple removed the "0.4 cm between targets" and
  "1 cm × 1 cm tap areas" guidance; controls in Photos and App Store were
  "crammed" closer together.
- **Motion**: buttons "pulsate", tabs "shimmer and wiggle", carousel dots
  "morph" — "motion for motion's sake is not usability. It's distraction with
  a side of nausea."
NN/g publish **no contrast ratios**; the critique is qualitative.

Broader coverage: Liquid Glass "got criticized for accessibility issues
including too much blur, low contrast, and hard-to-read text"; it
"undermined outdoor readability and increased cognitive drag during prolonged
reading." Apple walked it back across iOS 26 betas, strengthened Reduce
Transparency, and shipped a **"Tinted"** control in 26.1 that "tones down the
gloss and restores a flatter, calmer reading surface."
[DESCRIBED BY SOURCE — macrumors.com, gsmarena.com, gulfnews.com]

**Current state (September 2026):** one source reports iOS 27, announced
2026-06-08 and generally available mid-September 2026, raised the opacity
floor from "~40%" to "~60%", added **"High Contrast Liquid Glass"** which
"keeps the Liquid Glass shapes, icons, and material refraction but increases
contrast, reduces blur radius by ~50%", added animation controls separate
from Reduce Motion, added wallpaper-adaptive blur, and exposed a
`UIDesignSystem` API letting third-party apps pick `.liquidGlass`,
`.classic`, or `.adaptive`. It also cites a December 2025 public letter from
the American Foundation for the Blind on readability.
[DESCRIBED BY SOURCE — andrew.ooo; **single source, not corroborated —
verify before quoting the numbers to anyone**]

**Read of the arc** [JUDGEMENT]: Apple shipped maximal translucency, got
hammered on legibility, and spent two OS releases adding opacity back. An app
read at arm's length in a gym should start where Apple ended up, not where
Apple started.

### 3.3 What Android does instead: springs and shape, not blur

Material 3 Expressive is "backed by more user research than any previous
update" — "46 studies involving more than 18,000 participants" over three
years. Its depth model is **motion springs** (stiffness/damping) replacing
duration+easing as the primary motion system, two motion schemes (`standard`
and `expressive`, the latter with visible overshoot), and a **shape library
with 35 new shapes and built-in shape morphing**. Blur is not the mechanism.
[DESCRIBED BY SOURCE — design.google, m3.material.io, dezeen.com]

### 3.4 The Android/React Native performance answer, specifically

- **Blur on Android is only cheap on API 31+.** "The blur can be achieved
  efficiently only by using the RenderNode Android API, introduced in Android
  SDK 31." Below that, `expo-blur` falls back to **RenderScript**, described
  as "much less efficient"; the `dimezisBlurViewSdk31Plus` method exists
  precisely so you can fall back to **no blur at all** rather than to
  RenderScript. [DESCRIBED BY SOURCE — docs.expo.dev]
- **And `expo-blur` is not installed here**, with `theme.js:26` recording
  that it was "declined, Android-first rule". [SEEN — repo]
- Reanimated's own guidance: animate `transform`, `opacity`,
  `backgroundColor`; avoid `top/left/width/height/margin/padding` because they
  "trigger layout recalculation on every animation frame"; and the hard
  ceiling — "**animate no more than 100 components for low-end Android
  devices and no more than 500 components for iOS**."
  [DESCRIBED BY SOURCE — docs.swmansion.com]
- Benchmarks on a **Moto G8 Plus** (release build): at 100 animated views
  Reanimated "approached the frame limit with little headroom"; at 500 views
  "Reanimated SV hits **36 ms**, more than twice the frame budget"; the same
  animation that blew the 16.67 ms budget in debug "comes in at **11 ms**" in
  release. [DESCRIBED BY SOURCE — dev.to/expo benchmark]

### 3.5 Depth without blur — the buildable ladder

Everything below is already possible with the installed set [JUDGEMENT]:

1. **Surface ladder, not shadow, in dark.** The repo already does this
   (`theme.js:46` — "elevation by lightening each layer rather than relying
   on shadows", `background #0D0D0D` → `surface #191917` → surface2 →
   surface3). Keep it; the discipline is to **use no more than three steps on
   one screen**, matching the "two to three shadow levels maximum" rule.
2. **Shadow as the light-theme mechanism only.** Already the case
   (`theme.js:298`).
3. **Borders that change with elevation.** A resting row has no border; a
   raised surface takes `borderSubtle`; a focused/pressed surface takes a
   1 px accent-tinted border. This is Linear's move verbatim — its metadata
   chips are *bordered, unfilled* pills on the canvas [SEEN —
   `linear-mobile-05`].
4. **Scale on press.** `0.97` with a spring, on `transform` only, one
   component at a time — the cheapest possible animation and the one the
   Reanimated docs explicitly bless.
5. **Translucency, if ever, exactly twice**: the floating tab bar and the
   sheet header. Both are transient chrome over scrolling content, which is
   the one place every source says glass belongs. And on Android, implement
   it as a **solid colour at 92% opacity over the surface ladder** rather
   than a real blur — no new dependency, no RenderScript cliff, and at arm's
   length nobody can tell. [JUDGEMENT]
6. **Never blur behind a number.** Weights, reps, calories and macros are
   read at distance with a moving head. Non-negotiable.

---

## 4. PURPOSEFUL MICRO-INTERACTIONS

### 4.1 The only durations worth hard-coding

Material 3's token table is the most precise public spec and maps cleanly onto
Reanimated's `withTiming` [DESCRIBED BY SOURCE — M3 motion tokens]:

| Token | ms | What it is for |
|---|---|---|
| `Short1` | 50 | ripple, checkbox |
| `Short2` | 100 | small element appear/disappear |
| `Short3` | 150 | icon transitions, selection indicators |
| `Short4` | 200 | tooltip, chip selection |
| `Medium1` | 250 | FAB expand, card state change |
| `Medium2` | **300** | **dialog, bottom sheet, drawer — the common case** |
| `Medium3` | 350 | expanded component transitions |
| `Medium4` | 400 | page-level panel transitions |
| `Long1–4` | 450–600 | complex layout / shared element / container morph |
| `ExtraLong1–4` | 700–1000 | full-screen transitions only |

Easing, as cubic-bezier:
`Emphasized (0.2, 0.0, 0.0, 1.0)` — the default for transitions;
`EmphasizedDecelerate (0.05, 0.7, 0.1, 1.0)` — **entering**;
`EmphasizedAccelerate (0.3, 0.0, 0.8, 0.15)` — **exiting**;
`Linear (0,0,1,1)` — looping only.
Dezzayn's own guide independently lands in the same place: "100 to 150
milliseconds" for press feedback, "200 to 300 milliseconds" for transitions,
ease-out entering, ease-in exiting, and honour reduced-motion with a near-
instant fade. [SEEN — dezzayn guide]

### 4.2 Purposeful vs decorative — the test

A micro-interaction is purposeful when removing it costs the user
*information*, not delight. Three questions [JUDGEMENT]:
- Does it answer "did that land?" (press, save, sync)?
- Does it show *where something went* (a row settling into position, a sheet
  descending toward the tab it came from)?
- Does it make a change in value *legible* (a number that moves rather than
  jumps, so you can see which direction it went)?
If none of the three, it is decoration. NN/g's list of what Apple got wrong
is exactly the failure mode: pulsating buttons, shimmering tabs, morphing
dots — motion with no referent. [DESCRIBED BY SOURCE]

### 4.3 Concrete moves for Volyume

| Trigger | Feedback | Spec |
|---|---|---|
| Press any control | scale 1 → 0.97, opacity 1 → 0.9 | spring, `transform`+`opacity` only; release springs back (~150 ms) |
| Set logged | row settles into the completed list | `Medium2` 300 ms, `EmphasizedDecelerate` |
| Weight/rep value changes | digits roll, not jump | 200–300 ms, **tabular figures so nothing reflows** |
| Sheet open / close | 300 ms in with decelerate, 200 ms out with accelerate | already the gorhom default family |
| Segmented control | the *selected pill* slides between options | 200 ms `Short4`; the indicator moves, the labels do not |
| Sync completes | one-shot check, no loop | ≤ 400 ms, then gone |
| Weekly coach result | one number counts to its value | ≤ 600 ms; **never** confetti, never celebration |

The count-up deserves a guardrail: it is legitimate for a **volume or load**
figure, and it is **forbidden for anything on the ED-safety surface** —
bodyweight, calories, deficit, a "streak". A number that animates upward
carries a value judgement about the direction. [JUDGEMENT, and it follows
directly from CLAUDE.md Section 2]

### 4.4 Haptics: the restraint rules

Published guidance, consistently: "avoid haptic feedback that is too intense,
loud, or distracting, as it can cause user fatigue"; "avoid overuse on minor
or frequent actions"; "use the system haptic patterns for their intended
meaning (a success tap, a selection tick, a warning buzz), keep them sparing,
and **never use haptics as decoration**"; and match the haptic's weight to the
visual's weight — "a sharp, quick visual animation pairs well with a crisp
Light haptic tap." [DESCRIBED BY SOURCE — Apple HIG summaries, Android
haptics-principles, Meta Horizon OS haptics best practices]

Named shipped pairings: **iOS volume slider** gives "several rapid and gentle
haptics for each step" plus "a slightly more prominent haptic" at the end of
travel — a *ratchet plus a limit*; **Messenger** gives a light haptic on a
reaction; **TikTok** on record start/stop. [DESCRIBED BY SOURCE]

Proposed Volyume haptic budget — a total of five, and no more
[JUDGEMENT, all available in `expo-haptics`]:

| Event | Haptic |
|---|---|
| Set logged | `ImpactFeedbackStyle.Medium` — the one moment that earns weight |
| Stepper tick (weight/reps) | `Selection` — the ratchet |
| Stepper hits a limit or a floor | `ImpactFeedbackStyle.Light`, once — the wall |
| Rest timer ends | `NotificationFeedbackType.Success` |
| Destructive confirm | `NotificationFeedbackType.Warning` |

Nothing else vibrates. In particular: **no haptic on a weight-logged event,
no haptic on any ED-adjacent value, no haptic on navigation or scroll.** A
vibration is a reward signal, and rewards on bodyweight are exactly what the
safety system exists to prevent. [JUDGEMENT / CLAUDE.md Section 2]

---

## 5. MINIMALISM THAT IS NOT EMPTINESS

### 5.1 Four dense screens, read closely

**Linear Mobile, Inbox** [SEEN — `linear-mobile-02`]. Nine rows of
notification data on a near-black canvas with **zero cards, zero dividers and
zero borders in the list**. How it holds together:
- Each row is: 36 px avatar → (optional blue unread dot) → title at ~17 px →
  second line at ~15 px grey, with the relative timestamp **right-aligned on
  the second line** as "· 8hr".
- **Read state is expressed by colour alone**: unread titles are white with a
  blue dot, read titles drop to the same grey as the body. No badge, no
  background tint, no separator.
- The *only* filled shapes on the screen are the swipe action (a purple
  "Unread" panel revealed mid-row), the grouped top-right control capsule,
  and the floating tab bar.

**Things 3, Today** [SEEN — `things-3-02`] is the light-theme equivalent, and
its one move is the sharpest in this document: **there is exactly one filled
container on the screen, and it holds the thing that is not a to-do.** The
calendar block (5 events, times in blue and green in a fixed left column)
sits in a light grey rounded rect; every to-do sits naked on white. The
container is not decoration, it is a **category signal**. Section breaks are
a bold label with a coloured glyph and **one hairline rule** beneath it. A
deadline is a small red flag plus the word "today", right-aligned, on exactly
one row.

**Stripe Dashboard, Balances** [SEEN — `stripe-dashboard-04`]. Four
label/value rows with no box and no dividers: "Available to pay out
£39,826.00" and "Total £42,076.00" in **bold**, "In transit" and "Available
soon" in **regular grey**. Weight alone does the entire hierarchy. Values are
right-aligned and decimal-aligned. The payouts list below uses **inset
hairlines** (starting at the text, not the screen edge), and each row's
*title is the amount* — £7,200.00 bold, with the date as the subtitle. In a
list of money, the number is the identity of the row.

**Stripe Dashboard, Home** [SEEN — `stripe-dashboard-01`]. The time-range
selector is the move to steal: `1W 4W 1Y MTD QTD YTD ALL` rendered as plain
grey text, with **only the selected item given a filled indigo pill**. Linear
does the identical thing with `Overview / Activity / Issues`
[SEEN — `linear-mobile-05`]. Two unrelated companies, one conclusion:
**only the selected option gets a shape.**

**Revolut, savings detail** [SEEN — `revolut-…-02`]. The container strategy
is "one surface, many rows": a single dark rounded rect holds the interest
row, the transfer row, *and* the "See all" footer — rather than a card per
row. Above it, a full-bleed photographic hero carries a label at ~15 px and
**£5,120 at roughly 48 px**. One loud number per screen.

### 5.2 What they do instead of cards

| Instead of a card | They use | Seen in |
|---|---|---|
| A box per item | Rows on the canvas, separated by space | Linear Inbox, Things 3 |
| A box per group | **One** container holding many rows incl. its own footer | Revolut savings |
| A box to mean "important" | **Bold weight** against regular grey | Stripe Balances |
| A box to mean "section" | A quiet 13 px grey label, or a label + one hairline | Linear project, Things 3 |
| A box around the selected tab | A pill on the selected item only | Stripe, Linear |
| A box around metadata | Bordered, unfilled chips that wrap | Linear project |
| A divider between every row | Inset hairlines, or nothing at all | Stripe payouts / Linear |

### 5.3 How a dense list stays scannable

Four devices, all present in the screens above [SEEN, synthesised —
JUDGEMENT on the ranking]:
1. **A fixed left column.** An avatar, a checkbox, a status badge, a time —
   the same width on every row, so the eye tracks a straight edge down.
2. **A fixed right column of figures**, right-aligned and tabular.
3. **Two type sizes and two weights, maximum.** Title/subtitle, bold/regular.
4. **Colour used once per screen.** Things 3 spends red on one deadline;
   Linear spends blue on unread dots; Stripe spends green on the check badges
   and nothing else in the list.

Volyume already has the mechanism for (2): `theme.js:713` exports
`num(role)`, which returns the role with `fontVariant: ['tabular-nums']`, and
it is in use in `ProgressSections.js:405`, `:439`, `BlockProgressCard.js:161`
and the community row components. [SEEN — repo] Android has supported
`fontVariant` since RN 0.62. [DESCRIBED BY SOURCE]

---

## 6. WHAT MAKES AN APP LOOK LIKE A FITNESS APP

### 6.1 The tells, so we can audit against them

**Palette** [DESCRIBED BY SOURCE — canvasbuilder.co, designrush, stormotion]:
- Near-black base, explicitly named: `#0B0B0F`, `#111111`, `#1a1a1a`.
- **One high-energy accent**: "electric lime, neon orange, or cyan", with
  `#c8ff00` given as the worked example; elsewhere "neon green, **amber
  yellow**, hot coral"; and "vibrant greens, oranges, and electric blues,
  with dark backgrounds making neon accents pop".
- Accent reserved for "progress and CTAs" — i.e. the accent *is* the reward.
- Strava's brand orange is `#FC5200`. [DESCRIBED BY SOURCE — developers.strava.com]

**Typography**: "Inter… used at 900 weight for headlines" and **Oswald**
(a condensed grotesque) named as the popular pair; "oversized, expressive
type — words that practically vibrate with energy" at "96px–120px"; "bold,
kinetic typography is replacing static hero images". [DESCRIBED BY SOURCE]

**Recurring devices**: rings and streaks ("Apple Fitness+ uses rings and
streaks… circular progress indicators like Apple Watch are the gold standard
for fitness apps"), animated counters, progress bars that fill on completion,
"live stat cards" for heart rate and calories, and social-proof activity
feeds. [DESCRIBED BY SOURCE] Add, from common knowledge of the category and
not from a source I loaded: flames, badges, medals, muscle-group body
diagrams, gauge dials, and hero photography of gyms and bodies. [JUDGEMENT]

**Copy register**: the imperative and the challenge — "screams intensity",
"crush it", "no excuses", "day 47". [JUDGEMENT]

### 6.2 Which of these Volyume has — honestly

From the current-state audit (`11-current-state-audit.md`) and the theme file
[SEEN — repo]:

| Tell | Volyume today | Verdict |
|---|---|---|
| Near-black base | `#0D0D0D` (`theme.js:47`) | **Has it.** Sits inside the named range. |
| Single high-energy accent | `#F5A623` amber (`theme.js:60`) | **Has it.** "Amber yellow" is explicitly on the list. |
| Accent spent on decoration | 683 stock Ionicons, **244 amber-tinted**, against the app's own written rule | **Has it, and worse than the category.** |
| Oversized numerals | 73.9% of typed text is 11–13 px; **five sites in 106 screens exceed 24 px** | **Does NOT have it.** The opposite problem. |
| Rings / dials | — | Not audited here; audit before claiming either way. |
| Streaks / flames / badges | Forbidden by the ED-safety rules | **Does not have it, and never will.** |
| Condensed italic display face | Inter + InterDisplay only (`fonts.js`) | **Does not have it.** Good. |
| Gym/body hero photography | — | Progress photos exist but are user content, not chrome. |
| Shouty copy | Locked calm voice (`COACHING_VOICE_SYNTHESIS_LOCKED.md`) | **Does not have it.** |

So Volyume has the **palette** tell in full and the **accent-as-decoration**
tell in full, and has none of the gamification tells. The paradox worth
naming: the audit's finding that nothing is ever loud means Volyume reads as
a fitness app *by colour* while failing to get the one genuinely good thing
the category does — a big legible number. [JUDGEMENT]

### 6.3 Is amber-on-near-black itself a fitness tell?

**Yes, currently — but it is not owned by fitness, and the way out is not to
abandon amber.** [JUDGEMENT, on this evidence:]

- It *is* on the category's own list of accents ("amber yellow") against a
  near-black base. [DESCRIBED BY SOURCE]
- It is also the single most established **professional-instrument** palette
  in software: the Bloomberg Terminal. "Bloomberg's black and amber color
  scheme is their strongest hallmark, and you can recognize which application
  is Bloomberg from very far away… You'd walk onto a trading floor and you'd
  see a row of amber and black screens and you knew you were in a Bloomberg
  shop." Its origin is literal: "the amber-on-black design started because
  color monitors were rare in the 1980s. Most computer screens were orange or
  green on black", and the palette descends from "the phosphor glow of
  cathode-ray tube monitors", built for "maximum information density, zero
  decorative distraction." [DESCRIBED BY SOURCE — ted-merz.com,
  designbycurio.com, Hacker News threads, Wikipedia]
- And amber-on-near-black ships in payments: Stripe's Tap to Pay sheet uses
  an amber circular badge on a near-black surface under a large white figure
  [SEEN — `stripe-dashboard-03`].

**What actually makes amber read as "gym" rather than "terminal"** is not the
hue. It is four things Volyume is currently doing [JUDGEMENT]:
1. Amber applied to **decoration** (244 tinted icons) rather than to
   **state**. Bloomberg's amber is the *text colour of the data*.
2. Amber applied at **glow/gradient saturation** rather than flat.
3. Amber applied alongside **no other semantic hue**, so it becomes "the
   energy colour" instead of "one of a set of meanings".
4. Amber sitting next to **small type**, so it has to carry the excitement
   the typography refuses to.

**Three honest ways out that keep a warm brand:**
- **(a) Demote amber to data ink.** Amber becomes the colour of *the current
  value* and nothing else: the working weight, the live set, the figure under
  the cursor. Every icon goes to `textSecondary`. Zero palette change, and
  the audit's 244 tinted icons become the work item. This is the Bloomberg
  move.
- **(b) Shift the amber cooler and deeper.** From `#F5A623` (a saturated
  marigold) toward a **burnt/ember amber** in the `#D97706`–`#C2410C` region,
  which reads as ink and metal rather than hi-vis. Costs a full re-run of
  `theme.test.js` contrast assertions across four palettes × five elevation
  steps × two themes. Non-trivial but mechanical.
- **(c) Keep amber, change the ground.** Move the canvas off pure near-black
  toward a **warm graphite or deep ink-blue** (`#14151A`, `#0F1115`). Amber
  on a tinted ground stops reading as neon-on-black. Cheapest visual change
  with the largest category shift, and the light theme is untouched.

None of these is a lighter option than the others; (a) is the most work and
the most correct. [JUDGEMENT]

---

## 7. A SERIOUS NON-FITNESS AESTHETIC FOR A DATA-HEAVY TOOL

### 7.1 The concrete moves, before the directions

**Palette shape.** Not "a colour scheme" — a **role list**. Dezzayn's guide
names eight roles and the discipline behind them: "background, surface,
border, primary text, secondary text, one accent, semantic colors
(success/error)… most professional screens are overwhelmingly neutral gray
with one accent doing all the emphasis." [SEEN] That is exactly what the four
reference screens do: Linear is greyscale + one blue + tinted chips; Stripe is
greyscale + one indigo + one green; Things 3 is greyscale + a yellow glyph +
one red flag. [SEEN]

**Type pairing.** The reference set pairs **one grotesque for everything**
with **tabular figures for data**, and only developer tools add a real mono.
Linear's stack is documented as Inter Variable with Berkeley Mono; Stripe uses
two OpenType modes, `ss01` for text and `tnum` for financial figures, "which
never overlap". [DESCRIBED BY SOURCE — designmd.cc summary, open-design.ai]
Volyume already ships Inter + InterDisplay and already has `type.num()`. The
gap is not the font, it is the **scale**: five sites above 24 px in 106
screens. [SEEN — repo + audit]

**Density.** Linear is described as reaching high density with "**36 px
rows** and almost no chrome", and "density comes from typography, not chrome";
"modern admin UI like Linear draws few borders — weight, size, and whitespace
do the grouping, and if you need a border, you probably need more spacing."
[DESCRIBED BY SOURCE]

**Figures.** Right-aligned, tabular, decimal-aligned, with the unit smaller
and quieter than the number, and the delta carried by a small triangle plus a
semantic colour rather than by the figure's own colour (Stripe: `▲ 4%`,
`8.3%` green; Revolut: `▲ £8.19` green). [SEEN]

### 7.2 Three directions, named

---

**DIRECTION A — "TERMINAL"**
*Descends from:* Bloomberg Terminal, Linear, Berkeley Mono-era developer
tools.

Near-black ground, **amber demoted to data ink**, greyscale for everything
structural, and a hard rule that colour only ever marks *state*. Rows on the
canvas with a fixed left rail and a fixed right numeral column. Metadata as
bordered, unfilled chips (Linear's exact device). One display-scale figure per
screen at 48–64 px in InterDisplay, tabular. Section labels 13 px grey,
no rules, no uppercase tracking. No cards except for genuinely discrete
objects (a plan, a person, a photo).

*Why it is not a fitness app:* the category's accent is a reward colour; here
the accent is a *reading* colour. Nothing glows, nothing fills, nothing
celebrates.

*RN cost:* **S–M.** No new dependencies. Palette roles stay, `Card` usage
collapses (204 instances across 65 files plus 85 hand-rolled — the bulk of the
work), type scale gains a display step, `type.num()` spreads to every figure.

---

**DIRECTION B — "LEDGER"**
*Descends from:* Stripe Dashboard, Things 3, Apple Wallet.

**Light-first**, or rather genuinely dual: warm off-white ground, near-black
ink, hierarchy carried entirely by **weight and space**, exactly one filled
container per screen and only for the thing that is a different *kind* of
object. Inset hairlines in lists. A single accent (the warm amber survives,
used as Stripe uses indigo: the selected pill, the one link, the current
series in a chart) plus green/red as semantic only. Numbers are the row
titles, not trailing values — the weight is what the row *is*.

*Why it is not a fitness app:* the category is dark-with-neon almost without
exception. A light, typographically-set surface reads as a ledger or a
notebook. It also plays to the existing light theme, which the audit says is
already contrast-asserted.

*RN cost:* **M.** The theme already builds both palettes and asserts contrast
in both. The work is compositional: bold/regular pairs replacing boxes,
inset separators, and re-deciding which screens open in which theme. Risk:
the founder's own brief says dark-first, so this is a direction that has to be
*chosen*, not slid into.

---

**DIRECTION C — "FIELD NOTEBOOK"**
*Descends from:* Things 3, Notion, Arc — a warm, quiet, editorial register.

Warm dark ground (graphite `#14151A` rather than pure `#0D0D0D`), amber kept
at full warmth but spent only on **glyphs that mean something** (a star, a
flag, a marker) in the Things 3 manner: one coloured glyph per section header,
one semantic flag per row that needs it. Generous line height, a real prose
measure for coaching copy, section breaks as a label plus one hairline.
Full-bleed photographic moments allowed exactly once per screen (Revolut's
hero pattern), reserved for progress photos and the session hero.

*Why it is not a fitness app:* warmth without energy. The category's warmth is
always *heat*; this is lamp-light. No gradient fills, no glow, no rings.

*RN cost:* **M–L.** Needs a new ground colour (full contrast-test re-run), a
prose type role that does not exist today, and a full-bleed layout primitive
the app has never had (the audit notes "there is no full-bleed moment in the
daily product"). Highest craft ceiling, highest cost.

---

## 8. SCORED RECOMMENDATIONS

Impact = effect on "does not look like a fitness app" + usability mid-set.
Cost = React Native build cost with **no new dependencies** (S ≤ 1 day,
M ≈ 2–5 days, L > 5 days), assuming the existing token/test discipline.

| # | Move | § | Impact | Cost |
|---|---|---|---|---|
| 1 | Demote amber from decoration to data ink; 244 tinted icons → `textSecondary` | 6.3a | **High** | M |
| 2 | One display-scale figure per screen (48–64 px, tabular, InterDisplay) | 5, 7 | **High** | M |
| 3 | Replace the card-per-block habit with rows on the canvas + one grouped container | 5.2 | **High** | L |
| 4 | Two-detent sheets (45% / 88%) with grabber, footer-pinned primary, no stacking | 1.4 | **High** | M |
| 5 | Every committing action moves into the bottom third; 56 px minimum height | 2.4 | **High** | S |
| 6 | Only the selected option gets a shape (segmented controls, tabs, filters) | 5.1 | **High** | S |
| 7 | `type.num()` everywhere a figure appears; right- and decimal-aligned | 5.3 | **High** | S |
| 8 | Motion token set: 150/200/300 ms with M3 emphasized curves, one table | 4.1 | Medium | S |
| 9 | Press = scale 0.97 + opacity 0.9, spring, transform/opacity only | 3.5, 4.3 | Medium | S |
| 10 | Five-haptic budget; nothing else vibrates; none on ED-adjacent values | 4.4 | Medium | S |
| 11 | Bordered unfilled metadata chips replacing hand-rolled label rows | 5.2 | Medium | M |
| 12 | Inset hairlines in dense lists; drop full-bleed dividers | 5.3 | Medium | S |
| 13 | Grouped top-right control capsule replacing scattered icon buttons | 2.3 | Medium | S |
| 14 | Floating capsule tab bar (keep the tab bar — see iOS 18 Photos) | 2.2 | Medium | M |
| 15 | Move search to the bottom / into the sheet footer on pickers | 2.4 | Medium | M |
| 16 | Reach-budget test: no required mid-set target above 60% screen height | 2.4 | Medium | M |
| 17 | Shift the ground warm (`#14151A`) OR the amber to ember (`#D97706`) | 6.3b/c | Medium | M |
| 18 | Three-step surface ladder cap per screen; borders change with elevation | 3.5 | Medium | S |
| 19 | Count-up on volume/load only; banned on bodyweight, calories, deficit | 4.3 | Medium | S |
| 20 | Full-bleed hero, once per screen, with the label-above-figure pattern | 5.1, 7C | Medium | L |
| 21 | Translucency only on tab bar + sheet header, faked with 92% opacity | 3.5 | Low | S |
| 22 | Reanimated ceiling: ≤ 100 animated components on Android; release-build benchmarks only | 3.4 | Low | S |
| 23 | Adopt `expo-blur` for real blur on iOS | 3.4 | Low | **Blocked** — new dependency, and `theme.js:26` already declines it |

---

## SOURCES

Seen directly (fetched and read): [dezzayn.com](https://dezzayn.com) and
`/apps`, `/apps/revolut`, `/guides/professional-design-details`;
`thumbs.dezzayn.com` cover image; the iTunes Search API and eight App Store
screenshots for Linear Mobile, Stripe Dashboard, Things 3 and Revolut; the
Volyume repo (`package.json`, `src/styles/theme.js`, `src/styles/fonts.js`,
`docs/design-redesign-2026-09-14/*`).

Read as text: [NN/g, Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/) ·
[NN/g, Liquid Glass Is Cracked](https://www.nngroup.com/articles/liquid-glass/) ·
[eBay Playbook, Bottom Sheet](https://playbook.ebay.com/design-system/components/bottom-sheet) ·
[Material 3 motion tokens](https://github.com/aldefy/compose-skill/blob/master/skills/compose-expert/references/material3-motion.md) ·
[Reanimated performance guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) ·
[The real cost of React Native animations](https://dev.to/expo/the-real-cost-of-react-native-animations-benchmarking-every-approach-3bej) ·
[Expo BlurView docs](https://docs.expo.dev/versions/latest/sdk/blur-view/) ·
[gorhom BottomSheet v5](https://gorhom.dev/react-native-bottom-sheet/blog/bottom-sheet-v5) ·
[iOS 27 vs iOS 26 Liquid Glass (single source, uncorroborated)](https://andrew.ooo/answers/ios-27-liquid-glass-vs-ios-26-accessibility-changes-june-2026/) ·
[MacRumors, Liquid Glass criticism](https://www.macrumors.com/2025/09/17/ios-26-liquid-glass-critiques/) ·
[MacRumors, iOS 18 Photos backlash](https://www.macrumors.com/2024/11/21/apples-photos-app-overhaul-controversial/) ·
[Google Design, Expressive Material Design research](https://design.google/library/expressive-material-design-google-research) ·
[Dezeen, Material 3 Expressive](https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/) ·
[A List Apart, How We Hold Our Gadgets (Hoober)](https://alistapart.com/article/how-we-hold-our-gadgets/) ·
[Smashing, The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/) ·
[Android Authority, Chrome bottom address bar](https://www.androidauthority.com/chrome-bottom-address-bar-3546004/) ·
[learnui.design, iOS 26 guidelines](https://www.learnui.design/blog/ios-design-guidelines-templates.html) ·
[Canvas Builder, dark-mode fitness trends 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026) ·
[Strava brand guidelines](https://developers.strava.com/guidelines/) ·
[Ted Merz, Amber on Black](https://ted-merz.com/2021/06/26/amber-on-black/) ·
[Curio, Bloomberg Terminal style guide](https://designbycurio.com/learn/bloomberg-terminal-green) ·
[Orizon, Glassmorphism in 2026](https://www.orizon.co/blog/glassmorphism-in-2026-how-to-use-frosted-glass-without-killing-ux) ·
[Android haptics design principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles) ·
[MetaMask screen-vs-sheet A/B PR](https://github.com/MetaMask/metamask-mobile/pull/36018)
