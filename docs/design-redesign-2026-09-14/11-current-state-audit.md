# 11 - CURRENT STATE AUDIT: WHAT VOLYUME ACTUALLY LOOKS LIKE

**Date:** 2026-09-14
**Scope:** READ-ONLY factual audit of the shipped visual system, for the lead
planning a complete visual redesign.
**Method:** every claim below is read off source at the file:line given. Nothing
here is inferred from a doc summary; where a doc and the code disagree, both are
quoted and the disagreement is named.
**Founder verdict this audit serves:** "I don't like what we have and I think it
looks far too much like it's built by AI."

Branch read: `claude/communities-feature-overhaul-68l923`. No source file was
modified. This report is the only file written.

---

## A. THE DESIGN SYSTEM AS BUILT

Source: `src/styles/theme.js` (933 lines), `src/styles/layout.js` (40),
`src/styles/fontFamily.js` (10), `src/styles/fonts.js` (33),
`docs/rules/styling.md` (170).

### A1. Colour

Four palettes, resolved by one pure function `resolveTheme(prefs)`
(`src/styles/theme.js:437-489`): dark base, light override table, plus
higher-contrast and colour-blind-safe modifier tables per theme.

| Table | Location | Tokens |
|---|---|---|
| `baseColors` (dark, default) | theme.js:37-190 | 46 |
| `lightColors` (overrides only) | theme.js:202-250 | 36 |
| `darkHC` | theme.js:257-263 | 5 |
| `lightHC` | theme.js:264-270 | 5 |
| `darkCVD` | theme.js:271-286 | 6 |
| `lightCVD` | theme.js:287-296 | 6 |

Roles, dark values:

- **Surface ladder (the elevation system):** `background` #0D0D0D, `surface`
  #191917, `surfaceElevated` #222220, `surface2` #2A2A27, `surface3` #343431
  (theme.js:47-51). Deliberately not pure black, halation reasoning at
  theme.js:38-40. In dark, this ladder IS elevation; shadow is the light
  theme's cue (theme.js:19-21, `docs/rules/styling.md:32-33`).
- **Borders:** `border` #6E6E6E (3.81:1, WCAG 1.4.11), `borderLight` #7A7A7A,
  `borderSubtle` #2E2E2C (theme.js:52-54).
- **Brand:** `primary` #F5A623 (amber ink), `primaryFill` #E08C0B (large
  fills), `primaryDim` #B45309, `primaryBg` rgba(245,166,35,0.12),
  `onPrimary` #0D0D0D (theme.js:60-71). `onError` #FFFFFF (theme.js:80).
- **Status:** `success` #4CAF50, `warning` #F0E442 (Okabe-Ito yellow, retuned
  off the amber axis, theme.js:82-91), `error` #F44336, `errorFill` #C62828
  (the destructive BUTTON fill, held separate from the ink, theme.js:95-103),
  each with a `*Bg` tint, plus `onSuccessBg` / `onErrorBg` on-tint inks
  (theme.js:117-118).
- **Text:** `textPrimary` #FFFFFF (19.44:1), `textSecondary` #9E9E9E (7.25:1),
  `textMuted` #9C9C9C (7.08:1), `textDisabled` #727272 (theme.js:121-124).
- **Data:** `macroProtein/Carb/Fat/Fibre` (theme.js:181-184), `chartLine`
  #F59E0B, `chartFill` (165-166), `gold/silver/bronze` (132-134).
- **Theme-invariant one-offs:** `appleBtnBg/Text` (brand-locked, 140-141),
  `camera` #000000 (147), `chipInk` #000000 (156),
  `celebrationEmber/Violet` (161-162), `scrim` rgba(0,0,0,0.55) (189).

Semantic grammars layered on top, all lazy getters so HC/CVD swaps propagate
free: `stateColors` (onTrack/watch/act/neutral/info, theme.js:788-803),
`volumeColors` (808-813), `volumeStatusColors` (829-836).

Tint stops are named and frozen: `alpha.ghost .08 / tint .12 / soft .19 /
edge .25 / mid .33 / strong .40 / half .50` (theme.js:733-741), applied via
`withAlpha()` (theme.js:356-378).

**In use vs defined.** `colors.primary` alone is referenced **1,069 times
across 169 files** in `src/screens` + `src/components`; `primaryBg` 235,
`primaryFill` 90, `primaryDim` 14. That is amber at a scale no "signals the
thing to do" rule survives (see C7).

### A2. Type, and the font actually shipped

**A custom font IS loaded.** Seven Inter faces ship as TTFs in
`assets/fonts/` (Inter-Regular / Medium / SemiBold / Bold / ExtraBold,
InterDisplay-Bold / ExtraBold), registered face-by-face in
`src/styles/fonts.js:4-12`, loaded at boot via `Font.loadAsync(appFonts)`
(`App.js:209`) and installed as the RN `Text`/`TextInput` default
(`src/styles/fonts.js:16-33`, `App.js:210`). A boot guard pins this
(`src/__tests__/fontBootstrap.guard.test.js:14-18`).

> **DOC DRIFT, name it in the plan.** `docs/rules/styling.md:55` says
> "**System fonts.**" That is false as of the shipped build. The rules doc is
> stale on the single most identity-bearing fact in the system.

`fontFamily` names 8 faces (`src/styles/fontFamily.js:1-9`), including
`mono: 'monospace'` which has **0 call sites** anywhere in `src`.

**Type roles** (`buildTypeRoles`, theme.js:576-706). 14 roles plus two
helpers. Absolute line height is `round(fontSize * multiplier)`:

| Role | Face | Size | LH mult | LH px | Tracking | theme.js |
|---|---|---|---|---|---|---|
| `display` | InterDisplay-Bold | 40 | 1.2 tight | 48 | 0 | 578-581 |
| `h1` | InterDisplay-Bold | 32 | 1.2 tight | 38 | 0 | 582-585 |
| `h2` | Inter-SemiBold | 24 | 1.35 snug | 32 | 0 | 586-589 |
| `h3` | Inter-Medium | 20 | 1.35 snug | 27 | 0 | 590-593 |
| `title` | Inter-Medium | 17 | 1.35 snug | 23 | 0 | 594-597 |
| `body` | Inter-Regular | 16 | 1.5 normal | 24 | 0 | 598-601 |
| `bodyStrong` | Inter-Medium | 16 | 1.5 | 24 | 0 | 602-605 |
| `label` | Inter-Medium | 13 | 1.35 | 18 | 0 | 606-609 |
| `bodySm` | Inter-Regular | 13 | 1.5 | 20 | 0 | 622-625 |
| `overline` | Inter-Medium | 11 | 1.35 | 15 | 0.5, UPPERCASE | 610-613 |
| `caption` | Inter-Regular | 11 | 1.35 | 15 | 0 | 614-617 |
| `captionTight` | Inter-Regular | 11 | 1.45 | 16 | 0 | 628-631 |
| `captionStrong` | Inter-SemiBold | 11 | 1.35 | 15 | 0 | 641-645 |
| `micro` | Inter-Regular | 10 | 1.35 | 14 | 0 | 650-653 |

Helpers: `type.num(role)` adds `fontVariant: ['tabular-nums']`
(theme.js:701-704); `type.w(role, weight)` returns a role at another weight
with the matching Inter face (theme.js:692-700).

> **DOC DRIFT #2.** `docs/rules/styling.md:57-58` states "`h2` 24/**bold**,
> `h3` 20/**semibold**, `title` 17/**semibold**". The code ships h2 SemiBold,
> h3 Medium, title Medium (theme.js:587, 591, 595). Three of the six
> documented weights are wrong.

Supporting axes: `fontWeight` 6 names / **5 distinct values** (`heavy` and
`black` are both '800', theme.js:531-538); `lineHeight` 4 multipliers
(543-548); `letterSpacing` 7 roles of which **5 are literally 0** and only
`overline` 0.5 and `wordmark` 2 are non-zero (558-566).

**In use vs defined, and this is the headline number.** Counting every
`type.*` role reference in `src/screens` + `src/components` (2,412 sites):

| Size band | Roles | Sites | Share |
|---|---|---|---|
| 10px | micro | **0** | 0% |
| 11px | caption 567, captionTight 163, captionStrong 84, overline 29 | 843 | 34.9% |
| 13px | bodySm 577, label 363 | 940 | 39.0% |
| 16px | bodyStrong 308, body 149 | 457 | 18.9% |
| 17px | title | 87 | 3.6% |
| 20px | h3 | 59 | 2.4% |
| 24px | h2 | 21 | 0.9% |
| 32px | h1 | 4 | 0.2% |
| 40px | display | **1** | 0.04% |

**73.9% of all typed text in this app is 11px or 13px. 92.9% is 16px or
smaller. Five sites in the entire product are above 24px.**

`type.display` has exactly one call site,
`src/components/ProgressGhostCapture.js:798`. `type.h1` has four, three of
which are the same two files (`src/components/ScreenHeader.js:57`,
`src/screens/WelcomeScreen.js:185,219` where it is immediately *downsized* to
`fontSize.xxl`). `fontSize.display` has **zero** raw call sites.

`fontSize` raw-token usage (901 sites): sm 393, xs 227, md 119, lg 57,
micro 34, xl 33, xxl 25, xxxl 13, display 0. `sm` + `xs` = 68.8%.

**The weight axis is defined but unadopted.** `type.w()` exists to replace
hand-assembled weights (theme.js:676-700, which records 344 such blocks) and
has **2 call sites**. The hand-assembled pattern
`fontFamily: fontFamily.X, fontWeight: fontWeight.Y` still appears **330
times** in screens/components. Two parallel ways to express weight, and the
sanctioned one is essentially unused.

### A3. Spacing, radius, icons, targets

`spacing` 10 steps: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24,
xxl 32, xxxl 48 (theme.js:380-391). All 10 are in use across 3,947 sites, but
**sm + md + xs + lg account for 83.0%** (1045 / 932 / 666 / 633).

`radius` 7 steps: hair 2, xs 4, sm 6, md 10, lg 16, xl 20, full 999
(theme.js:393-401) plus `circle(size)` (405-407). All 7 in use across 721
sites, but **md + lg + full account for 83.0%** (282 / 199 / 117). `xs` has 7
sites, `xl` has 14.

`iconSize` 4 steps: sm 16, md 20, lg 24, xl 32 (theme.js:877-882).
`hitSlop` one value, 12 all round (theme.js:718).
`touchTarget.minimum` 48 with `android` as an explicit alias
(`src/styles/layout.js:12-15`).
`workoutLoggerSize` 13 screen-specific constants (`layout.js:17-40`).

### A4. Elevation and shadow

`shadowShape` sm/md/lg (theme.js:310-314), opacity swapped per theme
(`baseShadowOpacity` .3/.4/.5 dark, `lightShadowOpacity` .10/.14/.18,
theme.js:301-302). `cardShadow` is theme-invariant and applied by `Card` only
in light (theme.js:320-326, `src/components/Card.js:102`). `shadow.glow` is
the single sanctioned brand-tinted shadow (theme.js:767-775).

**In use:** `shadow.lg` 4 sites, `shadow.md` 1, `shadow.sm` 1. **Six sites
total** across the 268 non-test files in `src/screens` + `src/components`. `shadow.glow` has **two** call
sites: `src/screens/ProOnboardingScreen.js:3711` and
`src/screens/ProUpgradeScreen.js:779`, the second of which is a DORMANT
billing surface unregistered in the navigator
(`src/navigation/RootNavigator.js:453, 479, 571, 618, 688`). The app's one
sanctioned signature shadow is reachable on one screen.

### A5. Motion

`motion` (theme.js:893-933): 7 durations (micro 120, state 200, exit 220,
sheet 260, enter 320, hero 440, pulse 750); 3 Material-3 bezier curves plus 3
CSS-string twins; 4 named springs (press 420/36, release 250/22, settle
150/18, expressive 120/13) plus a legacy `spring`; 3 legacy aliases
(`card` 320, `easeOut`, `easeInOut`).

**In use:** only **15 files in all of `src`** import `react-native-reanimated`;
**4** use `withSpring`. The entrance vocabulary across the whole product is
FadeInDown 14, FadeInUp 8, FadeOut 7, FadeIn 5, SlideInDown 2, SlideOutDown 2.
`AnimatedEntrance` (`src/components/AnimatedEntrance.js`, a `FadeInDown` on
mount, line 38-40) is used in **10 files / 12 instances**.

### A6. Summary: defined vs actually exercised

| Axis | Defined | Exercised | Concentration |
|---|---|---|---|
| Colour tokens (dark) | 46 | 46 | `primary` family = 1,408 refs |
| Type roles | 14 | 13 (`micro` unused) | 11-13px = 73.9% of sites |
| fontSize steps | 9 | 8 (`display` 0 raw) | sm+xs = 68.8% |
| fontWeight | 6 names / 5 values | 5 faces | semibold+bold = 72% |
| letterSpacing | 7 roles | 2 non-zero, 1 of them at 1 site | effectively neutral |
| spacing | 10 | 10 | 4 steps = 83.0% |
| radius | 7 | 7 | 3 steps = 83.0% |
| shadow | 5 | 6 call sites total | effectively unused |
| motion durations | 7 | 15 files touch Reanimated at all | fades only |
| iconSize | 4 | 4 | - |

The system is broad on paper and narrow in practice. It defines a display
scale it never uses, a weight axis it never calls, a shadow ladder it never
applies, and a motion vocabulary 94% of files never touch.

---

## B. WHAT THE APP ACTUALLY LOOKS LIKE, SCREEN BY SCREEN

### B0. The universal shell

Every one of the five tab screens is the same object:

`SafeAreaView edges={['top']}` > `ScrollView` with
`contentContainerStyle = { padding: spacing.lg, gap: spacing.lg|md,
paddingBottom: ... }` > `<ScreenHeader title="..."/>` > a vertical stack of
same-width cards.

- Home `src/screens/HomeScreen.js:2249-2253`, style at 3181
- Train `src/screens/PlansScreen.js:1230-1233`, style at 2275
- Nutrition `src/screens/DiaryScreen.js:1416-1419`, style at 2405
- Progress `src/screens/AnalyticsScreen.js:255` (header), style at 743
- Coach `src/screens/YouScreen.js:376`, style at 649

**Every content block on every screen is therefore exactly the same width:
viewport minus 32px.** There is no exception on any tab screen.

Header trio: `ScreenHeader` 7 files, `BackHeader` 74 files, `ModalHeader` 27
files. Every `Stack.Screen` sets `headerShown: false`
(`src/navigation/RootNavigator.js:407-503`, 137 registrations).

`ScreenHeader` (`src/components/ScreenHeader.js:53-73`) renders the page title
left at `type.h1` (32px InterDisplay-Bold, line 57) and, in the right slot, a
34px **black circle chip containing a 19px PNG V** (lines 38-39, 98-104,
`chipInk` backing). On Home that slot is replaced by the Community action
(`HomeScreen.js:2276`).

**Consequence: on four of the five tab screens the single largest piece of
text is the screen's own name.** "Train", "Nutrition", "Progress", "Coach" are
each set 32px bold. No number, no data, no state, no headline is ever that
large on those screens.

### B1. Today (`src/screens/HomeScreen.js`)

Order down the page, settled-user case:

1. `ScreenHeader title="Today"` + Community chip (2276). **32px, largest type
   on the screen.**
2. `<TodayLine>` (2285) - one quiet row, `type.bodySm` 13px.
3. The **hero card** (2486): `<Card surface="surfaceElevated">`, radius 16,
   `gap: spacing.sm` (3206-3208). Inside:
   - `SectionLabel tone="muted"` eyebrow, 11px UPPERCASE tracked
     (2492-2494)
   - `workoutName` **24px Inter-ExtraBold, lineHeight 30** (2498, style at
     3212-3217). This is the hero. It is the session's NAME.
   - `workoutMeta` 13px "N exercises" (2516-2520)
   - readiness chip (2530)
   - coach brief line, 13px, with an 14px close X (2538-2558)
   - a `Start workout` Button (16px radius) + a secondary `Options` Button
     (2563-2584)
4. `<TodayStrip>` (2683) - a card, weigh-in.
5. `<EvidencePanel>` (2697) - a card.
6. `<HomeLastSessionCard>` (2712) - a card.
7. `<HomeCommunityIntroCard>` (2727) - a card, conditional.
8. plateau / activation banner rows (2738, 2766) - icon + text + chevron + X.
9. Constraints section: `SectionLabel` + a group of chevron rows
   (2843-2925).

**Counts on a typical Home:** 4 to 6 stacked cards, all 16px radius, all
1px `borderSubtle` hairline, all the same width, separated by 16px gaps.
**Distinct type sizes: 5** (32 header / 24 hero name / 16 / 13 / 11).
**Amber-coloured elements: 41 colour references** to primary/success/warning/
error in HomeScreen.js.

Three conditional variants of the hero all share identical shape:
block-complete (2409), week-complete (2463), next-session (2486). Same card,
same eyebrow, same 24px name, same button row.

### B2. Train (`src/screens/PlansScreen.js`)

`ScreenHeader title="Train"` (1236). Loading state is three stacked
`SkeletonCard`s of 120/72/72 (1243-1247), which is a faithful preview of what
arrives: a stack of cards. Then the **active plan card** (`<Card>`, 1272) with
an "Active" badge pill (1274-1276), an overflow `ellipsis-vertical` (1278),
plan name, meta, week line + `InfoTooltip`, coach note, and a Button row
(1337-1362). Below it, block cards (1401) each opening with
`blockCardIconWrap` (1409), a **circular tinted icon chip**. 7 `<Card>`, 2
`<EmptyState>`. Largest local type: `fontSize.xl` (20px).

### B3. The active workout logger (`src/screens/ActiveWorkoutScreen.js`, 6,941 lines)

The one screen with bespoke chrome: `<WorkoutHeader>` (4304), the tab bar
returns `null` while it is focused (`src/components/VolyumeTabBar.js:109-110`),
so it owns the full height.

**Its type is the smallest in the app.** Role distribution in this file:
`caption` (11px) 46, `label` (13px) 36, `bodySm` (13px) 21, `bodyStrong`
(16px) 18, `captionStrong` (11px) 14, `h3` (20px) 6, `title` (17px) 4.
**Nothing above 20px anywhere in the logger.** The rest timer readout is
`type.num('bodyStrong')`, **16px** (`src/components/RestTimer.js:556-563`);
the screen's own timer text is `type.num('title')`, 17px
(`ActiveWorkoutScreen.js:6256`).

> **This is a founder ruling, not drift.**
> `src/screens/__tests__/loggerVisualArchitecture.guard.test.js:6` records the
> device verdict that "the rest timer was one of the largest elements on
> screen" was a FAILURE, and line 58 pins
> `expect(REST).not.toMatch(/fontSize: 26/)`. A redesign that enlarges the
> rest timer breaks a pinned law. Raise it as a fork; do not assume.

### B4. Nutrition (`src/screens/DiaryScreen.js`)

`ScreenHeader title="Nutrition"` (1422), then a day pager: chevron-back /
date cluster with a `calendar-outline` / chevron-forward, a "Today" pill, and
an `options-outline` button (1428-1478). Then `<MacroRings>` (1502) inside
`macroRingsWrap`, still inside the 16px page padding. Then meal sections.

`MacroRings` is the only place on a tab screen where a number gets large:
`fontSize.xxxl` 32px for the kcal value (`src/components/food/MacroRings.js:400,
547`). It is one of only 13 `fontSize.xxxl` sites in the app. Locally,
DiaryScreen.js never exceeds `fontSize.md` (16px). 1 `<Card>`, 2
`<EmptyState>`.

### B5. Progress (`src/screens/AnalyticsScreen.js`) and Coach (`src/screens/YouScreen.js`)

Progress: `ScreenHeader title="Progress"` (255), content padding 16 / gap 12
(743), 4 `<Card>`, 2 `<EmptyState>`. Largest local type `fontSize.xl` (20px).

Coach: `ScreenHeader title="Coach"` with a subtitle "Weekly coaching from
your logs." and a **circular settings gear chip** in the right slot
(376-384). 3 `<Card>`, 1 `<PressableCard>`. Largest local type: `type.h3`
(20px); its only raw size token is `fontSize.sm` (13px).

### B6. The tab bar (`src/components/VolyumeTabBar.js`)

Anchored, not floating (header comment lines 5-7). Fill `surfaceElevated`,
hairline `borderSubtle` top border (190-195). Content zone `minHeight: 49 +
insets.bottom` (129). Behind the active tab, a `primaryBg` cushion of
`PILL_HEIGHT 46` at `radius.lg` **16px, the same radius as every card and
every button** (196-202), sliding on `motion.springs.settle` (102). Icons get
a 1 -> 1.06 -> 1 settle scale on focus (60-71).

Icons are **stock Ionicons, filled-when-focused**
(`src/navigation/RootNavigator.js:744-753`): `today`, `barbell`, `nutrition`,
`stats-chart`, `pulse`. Labels `type.caption` 11px in `type.label`'s face
(222). One amber badge dot on the Coach tab (211-221).

### B7. Navigation motion (`src/navigation/RootNavigator.js`)

`heroZoomTransition`, an origin-aware grow-from-the-tapped-card push
(297-330), is registered on **9 of 137** `Stack.Screen`s. The other 128 use
the default horizontal slide. Sheet/modal presentation on 27 screens.

---

## C. WHERE IT IS GENERIC

Each tell below is the pattern named in the brief, with its real extent.

### C1. Uniform card stacking with no hierarchy of scale - CONFIRMED, app-wide

`<Card>` appears **204 times across 65 files**. `<EmptyState>` (itself a
bordered card, `src/components/EmptyState.js:120-133`) appears **99 times
across 54 files**. In addition, **85 files hand-roll a card**:
`backgroundColor: colors.surface` plus a `borderRadius` without going through
`<Card>` (165 frozen + 168 live references). Card's own docblock
(`src/components/Card.js:4-8`) says it "Replaces the ~83 inline
`backgroundColor: colors.surface` card blocks the component audit found". The
count is now **85 files**, so the drift the primitive was built to end has
fully returned.

No card on any tab screen is wider, narrower, taller-by-design, or heavier
than its neighbours. The only hierarchy signal available is `surface` vs
`surfaceElevated`, a 9-point luminance difference (#191917 vs #222220).

### C2. Every block the same width, radius and weight - CONFIRMED, 5/5 tab screens

All five tab screens set `padding: spacing.lg` on the scroll content
(HomeScreen.js:3181, PlansScreen.js:2275, DiaryScreen.js:2405,
AnalyticsScreen.js:743, YouScreen.js:649). Every block is viewport-minus-32.
Every card is `radius.lg` 16 (Card.js:39 default) with `borderWidth: 1`
(Card.js:152-154) in `borderSubtle`.

### C3. Identical corner radius everywhere - CONFIRMED at primitive level

`radius.lg` (16px) is the radius of **`Card`** (Card.js:39), **`Button`**
(`src/components/Button.js:299`), **`EmptyState`** (EmptyState.js:127), the
**tab bar's active pill** (VolyumeTabBar.js:200), and **`InfoTooltip`**
(InfoTooltip.js:122). A button, a card, an empty state and the tab-bar
selection cushion are geometrically the same object. Only `Chip`
(`radius.full`, Chip.js:107) and `Toast`/`Skeleton` (`radius.md`) differ.

There is no lint rule against a raw `borderRadius` literal
(`eslint.config.js:201-240` bans hex, rgba, hex-alpha concat, raw fontSize,
raw fontWeight, raw letterSpacing, but not radius), and the codebase is
nonetheless at only 14 raw radius literals, so this uniformity is a choice,
not an accident.

### C4. Centred empty states with a big circle glyph - CONFIRMED, 99 instances

`src/components/EmptyState.js:73-79` renders a **52px perfect circle**
(`borderRadius: radius.full`, line 145) filled `primaryBg` with a
`withAlpha(primary, alpha.edge)` border (148-150), containing a 28px
Ionicon tinted `primary`. Below it: `alignItems: 'center'` (131), a centred
`type.title` headline (`textAlign: 'center'`, 160), centred `type.bodySm`
body (166), and centred buttons (168).

That is the canonical template empty state, and it is used **99 times across
54 files**. The icon inside is a stock outline glyph: the most common are
`barbell-outline` (29), `cloud-offline-outline` (25), `people-outline` (16),
`warning-outline` (10), `time-outline` (10). The default when none is passed
is `information-circle-outline` (EmptyState.js:34).

### C5. Decorative circular icon chips - CONFIRMED, widespread

`circle()` is called **86 times across 58 files**; `borderRadius: radius.full`
appears **109 times**. Named examples on the main path:

- `ScreenHeader` brand chip, 34px black circle + 19px PNG V, on every tab
  screen (`src/components/ScreenHeader.js:98-104`)
- `HomeScreen.js:3556-3563` `quickStartIcon`, 48px circle, `surface2` fill,
  28px amber `barbell-outline`
- `HomeScreen.js:3193-3197` `continueIcon`, 40px `radius.xl` chip, amber-ink
  `play` glyph
- `PlansScreen.js:1409` `blockCardIconWrap`
- `YouScreen.js:383` `settingsGear`
- `EmptyState.js:142-151` (C4 above), 99 instances

### C6. No full-bleed or edge-to-edge moment - CONFIRMED on every tab screen

Across the whole of `src/screens` + `src/components`, `marginHorizontal: -...`
(the only escape from the 16px gutter) occurs **16 times**. Of those:

- 8 are `headerBleed` inside bottom sheets
  (`src/components/community/{MenuSheet,GroupInviteSheet,ConnectSheet,
  PeopleFiltersSheet,ReportSheet,SessionSheet,GymDetailSheet}.js`), a divider
  trick, not a composition
- `src/screens/WelcomeScreen.js:193` (pre-account, not in the app)
- `src/screens/ProgressPhotosScreen.js:2044`
- `src/screens/BodyMetricsScreen.js:472` (a -4px nudge)

**Zero on Today, Train, Nutrition, Progress or Coach.** Nothing in the daily
product ever touches the edge of the screen except the tab bar fill.

### C7. Colour as decoration rather than meaning - CONFIRMED, at scale

`docs/rules/styling.md:36-37`: "Amber signals 'the thing to do' - **do not
spend it on static decoration**."

Measured: `colors.primary` 1,069 refs / 169 files, `primaryBg` 235,
`primaryFill` 90. **244 of the 683 `<Ionicons>` instances in screens and
components are tinted with `colors.primary`.** The single largest consumer is
the decorative circle behind a static empty-state glyph (C4), which is amber
tint + amber border + amber icon on all 99 instances and is never an action.

The rule is written, and the code is 1,069 sites past it.

### C8. Type that never gets big or small - CONFIRMED, the strongest finding

Section A2 in full. Restated as the redesign-relevant fact:

- 73.9% of typed text is 11px or 13px
- 92.9% is 16px or smaller
- **5 sites in the entire product exceed 24px**
- `type.display` (40px): **1 site**, in a share-image capture component
- `fontSize.display`: **0 raw sites**
- `type.micro` (10px, the intended fine print): **0 sites**

There is no display-scale number in the daily product and no deliberate fine
print. The scale runs 11 to 16 with a header at 32 and a hero name at 24, and
that is the whole dynamic range.

### C9. No signature visual device that is this app and no other - CONFIRMED

`src/styles/theme.js:28-29` states the materials policy: "**ONE surface in the
app may carry a Skia glow (the Home Start button, E15 element 3)**".

**That surface does not exist.** `grep -n "Skia\|glow" src/components/Button.js
src/screens/HomeScreen.js` returns nothing. Skia is imported in only 4 files
(`BeforeAfterShareSheet.js`, `ProgressPhotoCompare.js`, `food/MacroRings.js`,
`ShareCardScreen.js`), none of which is the Home start button.

The one sanctioned brand-tinted shadow, `shadow.glow` (theme.js:767-775), has
2 call sites, one of which is a dormant, unregistered billing screen (A4).

`LinearGradient` appears in 3 files
(`VolyumeChart.js`, `lib/shareCard/drawShareCard.js`, `WelcomeScreen.js`), none
on a tab screen.

**Net: the app's documented signature device was never built, and its one
approved accent shadow is reachable on one onboarding screen.** The only
recurring identity mark in the daily product is a PNG "V" in a black circle in
the top-right corner, which Home has already replaced with a Community button
(HomeScreen.js:2276).

### C10. Icon-and-label rows that could belong to any app - CONFIRMED

683 `<Ionicons>` instances across 147 files, entirely from the stock Expo
Ionicons set. **89 `chevron-forward` disclosure indicators.** The tab bar is
five stock Ionicons (`today` / `barbell` / `nutrition` / `stats-chart` /
`pulse`, RootNavigator.js:745-752) with 11px labels beneath, which is the
default shape of every React Navigation app ever shipped.

`SectionLabel` (11px UPPERCASE, `type.overline`, tracked 0.5) is used **214
times** as the eyebrow above content blocks
(`src/components/SectionLabel.js:40`).

### C11. Motion that is uniform fades rather than anything spatial - CONFIRMED

Only 15 of ~256 theme-consuming files import Reanimated; 4 use `withSpring`.
The entrance vocabulary is FadeInDown 14, FadeInUp 8, FadeOut 7, FadeIn 5.
Slide entrances: 2. `AnimatedEntrance` (a fade-and-rise, AnimatedEntrance.js:38)
is on 10 files.

The genuinely spatial moment, `heroZoomTransition` with a measured origin rect
(RootNavigator.js:297-330, `onPressWithLayout` in 4 files), is registered on
**9 of 137** screens.

### C12. The lint bank already bans AI tells in COPY but not in VISUALS

`eslint.config.js:256-261` errors on "delve, leverage, utilise, facilitate,
seamless, streamline, robust, comprehensive" with the message *"Machine-tell
word in copy (CLAUDE.md 'No AI fingerprint')."* The project has a written,
enforced concept of an AI fingerprint. It applies to words only. Every
structural tell in C1-C11 passes lint clean.

---

## D. WHAT IS GOOD AND MUST SURVIVE

These are genuinely well made. A redesign that discards them is a regression.

### D1. The contrast guarantee is real, computed and tested

`src/styles/__tests__/theme.test.js` (448 lines) computes WCAG 2.x ratios and
asserts them, not as vibes but as numbers:

- "text roles clear their WCAG bars on **every core dark surface**" (line 158)
- "light text roles clear their WCAG bars on **every surface**" (353)
- on-tint inks clear 4.5:1 on their own tint **at every elevation step**, in
  dark (286, 291), light (296, 301) and colour-blind-safe (306)
- `onPrimary` ink clears the bright amber fill **in both themes** (377)
- surface ladder steps verified monotonically lighter (123)
- larger-text swap verified through the getters, not snapshots (97)

This is a rare thing to own. **Keep the method, re-run it against any new
palette before the palette ships.**

### D2. Token discipline is close to absolute, and lint holds it

`eslint.config.js:184-240`, scoped to `src/screens/**` and
`src/components/**`, errors on: raw hex, raw rgba, hex-alpha concat in both
`+` and template forms, raw `fontSize` literals, raw `fontWeight` literals,
raw `letterSpacing` literals. Measured residue in ~250 product files: **14 raw
`borderRadius` literals and 40 raw padding/margin literals.** For a
19,000-line surface area that is exceptional hygiene. `themeTokens.guard.test.js`
additionally fails the build on any reference to a colour/spacing/radius/type
token that does not exist (header comment lines 1-10 records the black-on-black
sheet that produced it).

**A redesign can therefore change values globally and trust the call sites.**
That is the single biggest asset in this codebase for this project.

### D3. The live theming primitive (CP-10) is finished and correct

`resolveTheme(prefs)` (theme.js:437-489) is one pure derivation feeding both
the legacy mutable exports and `useTheme()`, so the two systems "can never
resolve to different palettes for the same preferences" (theme.js:432-436).
Theme, larger text, higher contrast and colour-blind-safe all apply **live,
with no reload** (`src/screens/SettingsDisplayScreen.js:28-33`).

### D4. The semantic colour grammar

`stateColors` onTrack / watch / act / neutral / info (theme.js:788-803) is a
learned-once vocabulary with genuinely careful reasoning attached: `warning`
was retuned to Okabe-Ito yellow specifically because the old #FFC107 sat 7
degrees from brand amber and could not be told apart under CVD
(theme.js:82-88); `minimum` was split off from `near_mrv` because "one colour,
two opposite instructions" (theme.js:825-828). Body-weight trends are Class B,
never red/green (`docs/rules/styling.md:40`).

### D5. Tabular numerals on data

`type.num(role)` is used at **154 sites**. Columns align and changing values do
not jitter. Attached per-table so `useTheme()` results carry it too
(theme.js:661-675 records the crash that would otherwise occur).

### D6. Accessibility floors that are load-bearing

`touchTarget.minimum` 48dp, one number for both platforms, with the reasoning
recorded (`src/styles/layout.js:1-15`); referenced by 16 test files. Reduce
Motion collapses every animation (`AnimatedEntrance.js:31-33`;
`motionFitRules.guard.test.js` pins the rule bank, including that raw
`expo-haptics` may never appear outside `src/lib/haptics.js`).
`accessibilityRole="header"` on every `ScreenHeader` title
(`ScreenHeader.js:59`), with `SectionLabel` deliberately NOT defaulting to
`header` to avoid flooding the rotor (`SectionLabel.js:5-9`).

### D7. The calm copy voice, and its lint

No shame, no guilt, no streak pressure. `EmptyState`'s docblock: "Adherence-
neutral, no shame copy, purely directional" (EmptyState.js:9). The weekly
run/streak construct was removed outright on founder ruling
(`HomeScreen.js:2589-2593`). The tab-bar coach badge is amber, not red,
explicitly so it does not read as an alarm (`VolyumeTabBar.js:208-210`).
Em dash and machine-tell words are lint errors (eslint.config.js:247-261).

### D8. One chart engine, and the discipline to keep it one

`VolyumeChart` (`src/components/VolyumeChart.js:1-28`), 14 consuming files,
with a recorded decision to NOT move it to Skia because the benefit was not
user-visible. `theme.js:33-34`: "VolyumeChart is the app's one chart engine;
no second engine, no rebuild."

### D9. The hero-zoom transition

`makeHeroZoomCardStyle(origin)` (RootNavigator.js:313-330) grows the pushed
screen from the measured rect of the card that was tapped. It is the one piece
of genuinely spatial motion in the product and it is well built (including a
defensive fallback for a react-navigation edge case that used to crash,
lines 324-330). **It is under-used, not wrong.** Extend it; do not replace it.

---

## E. THE COST OF CHANGE

### E1. Surface area

| Thing | Count |
|---|---|
| Screens (`src/screens/*.js`) | **106** |
| Components (`src/components/**/*.js`, excl. tests) | **162** (89 top-level + 7 sub-folders) |
| Files importing `styles/theme` (excl. tests) | **256** |
| Files importing `hooks/useTheme` | **248** |
| Files importing the frozen module-level `colors` | **192** |
| Files importing **both** | **189** |
| Files with theme import but no `useTheme` (frozen only) | **11** |
| Files carrying a `buildLiveStyles` / `const live = {}` dual-write block | **153** |
| Test files in `src` | **1,283** |
| Test files that `readFileSync` a source file (source-pinning guards) | **609** |

### E2. The dual-write problem, which dominates every other cost

**189 of 256 theme-consuming files write every colour twice.** The CP-10
migration kept the frozen `StyleSheet.create` block (built at import from the
mutable `colors` singleton) AND added a parallel live object rebuilt per render
from `useTheme()`. The pattern is documented at
`src/components/EmptyState.js:171-178` and visible at
`src/screens/HomeScreen.js:184-240` vs `3181-3564`, and
`src/components/VolyumeTabBar.js:80-85` vs `189-223`.

Consequence: **any restyle of a screen is two edits per style key, in two
places hundreds of lines apart, and the two must stay value-identical.** This
is the single biggest mechanical risk in the redesign and the plan must state
a position on it (leave it, or collapse it) before the first screen is
touched.

### E3. Test guards a redesign must update

**92 test files** read source and assert on presentation. By token family:
**57** assert on colour tokens, **28** on type role names, **20** on spacing,
**16** on `touchTarget`, **13** on radius tokens.

The guards a visual redesign will collide with first:

| Guard | What it pins |
|---|---|
| `src/styles/__tests__/theme.test.js` | every WCAG ratio, both themes, HC + CVD, the ladder, motion ordering, letterSpacing neutrality |
| `src/__tests__/themeTokens.guard.test.js` | no reference to a non-existent colour / fontSize / spacing / radius / type token, app-wide |
| `src/__tests__/accessibilityDesign.guard.test.js` | a11y roles/labels across all of `src` |
| `src/components/__tests__/chromePolish.test.js` | `BackHeader` / `ModalHeader` / `EmptyState` / `Button` chrome, incl. `ScreenHeader` using `t.type.h1` (line 99) |
| `src/screens/__tests__/loggerVisualArchitecture.guard.test.js` | logger STRUCTURE, incl. the rest-timer size ban (line 58) |
| `src/lib/__tests__/motionFitRules.guard.test.js` | `springs.expressive` reserved; Animated allowlist frozen; linear easing only for the timer drain |
| `src/__tests__/community.presentation.guard.test.js`, `community.layout.guard.test.js` | community surface presentation |
| `src/components/community/__tests__/rows.amber.guard.test.js` | amber usage in community rows |
| `src/components/__tests__/ProgressSections.cohesion.guard.test.js`, `src/screens/__tests__/AnalyticsScreen.cohesion.guard.test.js`, `CoachOutputScreen.r2Cohesion.guard.test.js`, `loggerHeaderCohesion.guard.test.js`, `workoutSummaryFooterBand.guard.test.js` | cross-surface visual cohesion |
| `src/__tests__/bottomBarInset.guard.test.js`, `splashBackgroundColour.guard.test.js`, `src/components/__tests__/capabilityTouchTargets.guard.test.js` | bar insets, splash colour, target sizes |
| `src/__tests__/fontBootstrap.guard.test.js` | the exact font-loading lines in App.js |

### E4. Light theme: does it exist, is it reachable, what enforces it

**Yes, yes, and theme.test.js.**

- Selectable at Settings > Display > Appearance: Dark / Light / Match phone
  (`src/screens/SettingsDisplayScreen.js:13-17`), never Pro-gated (line 11-12),
  applied live with no reload prompt (lines 28-33).
- Default is dark; absent preference resolves dark
  (`theme.js:335-349`).
- 36 override tokens (theme.js:202-250) plus `lightHC` and `lightCVD`.
- Contrast enforced by `theme.test.js:325-377` ("light text roles clear their
  WCAG bars on every surface", "light status + trophy inks clear 4.5:1 on
  white", "onPrimary ink clears the bright amber FILL in both themes").
- Elevation in light is carried by shadow, not the ladder: `Card` applies
  `shadow.card` only when `t.resolvedTheme === 'light'` (Card.js:102).

> **AMBIGUITY, flag to the founder rather than resolve.** `theme.js:200-201`
> says "the darkened amber ink (#8A5200) and the light hues **need the
> founder's on-device sign-off before public release**", repeated at
> theme.js:216-217. That sign-off is not recorded anywhere I read. The light
> theme is live to users today with an unsigned-off brand palette. I do not
> know whether the sign-off happened off-repo.

### E5. Blast radius of the four changes named

**(i) A colour token.** Change the value in `theme.js` only: 1 edit, and all
256 consuming files inherit it, because lint has kept raw hex out. But
**~57 test files assert on colour tokens**, and `theme.test.js` will fail any
value that drops below its WCAG bar in ANY of the four palettes at ANY of the
five ladder steps. Recomputing all four tables is mandatory, not optional.
Add a token: also add its light, HC and CVD counterparts or the light theme
silently inherits a dark value (theme.js:196-197).

**(ii) The type scale.** Changing `fontSize` values is 1 edit and reaches
everything, because the roles are getters over the table (theme.js:576-706)
and `applyAccessibility` mutates in place. Changing role *definitions*
(weights, faces, line heights) reaches all 2,412 role call sites at once.
**But: 330 hand-assembled `fontFamily.X + fontWeight.Y` pairs bypass the roles
entirely**, and `type.w()` (the sanctioned fix) has 2 call sites. Any weight
change must sweep those 330 by hand or they silently keep the old face.
28 test files assert on role names. Adding a role is cheap; renaming one
breaks `themeTokens.guard.test.js`.

**(iii) The `Card` component.** `src/components/Card.js` is 156 lines and
reaches **204 instances across 65 files**. But **85 further files hand-roll a
card** (C1), so a Card-only change restyles roughly 70% of the app's card
surfaces and leaves a visibly different 30% behind. `EmptyState` is its own
bordered card (99 instances) and would need the same change. **Changing "the
card" means changing three things, not one.**

**(iv) The tab bar.** `src/components/VolyumeTabBar.js`, 223 lines,
**one consumer** (`RootNavigator.js:741`). Icons are defined separately at
`RootNavigator.js:744-753`. The bar is coupled to: `ActiveSessionMiniBar`
(imported at line 45, docks above it), the `ActiveWorkout` null-return
(109-110), the mini-bar/tab-bar bottom-inset arithmetic replicated in
`src/components/Toast.js:36`, `src/screens/WorkoutSummaryScreen.js:1232-1234,
1970` and `src/screens/ActiveWorkoutScreen.js:5055-5056`, and
`src/__tests__/bottomBarInset.guard.test.js`. **Cheapest of the four to
restyle, but its height is load-bearing arithmetic in four other files.**

---

## F. CONSTRAINTS THE REDESIGN MUST HONOUR

Quoted verbatim from the binding documents.

**F1. ED-safety presentation is design law, not guidance.**
`docs/rules/styling.md:166-168`:
> "ED-safety presentation is design law: weight-adjacent surfaces respect the
> open-flag/calm-mode suppressions; celebrations are effort-framed, never
> weight-framed; body-weight trends are never coloured as good/bad."

`CLAUDE.md:145`: "Beat UK signposting and calm mode: never remove or gate."
`CLAUDE.md:147`: "Guardrails are tier-blind (proGate.js mandate)."
`CLAUDE.md:149-150`: "If a task touches any of this: STOP and ask first."
Calm-mode / ED-flag suppression is consumed in `src/hooks/usePhotoSuppression.js`,
`src/hooks/useWeightTrend.js`, `src/lib/chartWindows.js`,
`src/screens/DiaryScreen.js`, `src/screens/CoachOutputScreen.js`.

**F2. Article 9 consent surfaces.** `CLAUDE.md:151-153`:
> "The un-skippable consent gate in RootNavigator (healthConsent) must not be
> weakened, reordered, or made skippable."

Gate at `src/navigation/RootNavigator.js:1056-1057, 2029, 2099`. "Consent
flows fail CLOSED for new users" (`CLAUDE.md:159-160`). A redesign may restyle
that screen; it may not restructure, reorder or add a dismiss affordance.

**F3. Share cards.** `CLAUDE.md:153-158`: share cards "never include
name/bodyweight/measurements/private notes", with the single Pro before/after
exception which "is withheld entirely under calm mode or an open ED flag".

**F4. No streak, no shame, no pressure.** `CLAUDE.md:230-231`: "Voice: calm,
plain, no shame, no guilt, no clipped commands." The streak construct is
already removed by founder ruling and the removal is documented in place
(`src/screens/HomeScreen.js:2589-2593`). Do not reintroduce it as a visual
device (rings, chains, flames, counters).

**F5. British English, no em dash.** `CLAUDE.md:227-229`: "British English in
ALL user-facing strings... NO em dash (—) in user-facing copy — lint enforces
it." Enforced at `eslint.config.js:247-254`. Also enforced: no machine-tell
words (`eslint.config.js:256-261`), no clipped-drama tails (269-274).

**F6. Tokens only.** `docs/rules/styling.md:12`:
> "**Never hard-code a colour, size, spacing, radius or duration. Use tokens.**"

Sanctioned literal exceptions, and only these: `appleBtnBg`, `camera`,
`src/widgets/widgets.js` (Android RemoteViews, kept byte-identical to theme.js
**manually**) and `src/lib/shareCard/drawShareCard.js` (Skia canvas)
(`docs/rules/styling.md:14-18`), plus `src/screens/ShareCardScreen.js` in the
lint ignore list (`eslint.config.js:198`). **A palette change must be mirrored
by hand into the widget file and the share-card painter or the home-screen
widget and every shared image drift off-brand.**

**F7. No new dependency without approval.** `CLAUDE.md:190-191`: "Never add
dependencies without asking. Name, purpose, licence — wait for yes." This
directly constrains the redesign: no new icon set, no new font package, no new
animation or chart library, no `expo-blur` (already declined, theme.js:25-26),
no second chart engine (theme.js:33-34).

**F8. Expo managed workflow and the native modules.** `CLAUDE.md:31-35`:
"managed workflow, never eject; native modules only via Expo config plugins".
The surfaces that constrain visual change: `modules/live-activity`,
`modules/rest-timer-live`, `modules/progress-scan-image`, and the home-screen
widget (`plugins/withVolyumeWidget.js` + `src/widgets/`). The widget renders
through Android RemoteViews and **cannot import the theme** (F6), so it is a
hand-mirrored copy of the palette.

**F9. Materials policy (theme.js:18-36, founder-approved 2026-07-03).**
Elevation via the surface ladder in dark, shadow in light. Borders are the
hairline definition. Translucency + hairline border is the signature material
for docked furniture. **Blur is not used on Android and expo-blur is not
installed.** One Skia glow permitted (unbuilt, C9); `shadow.glow` reserved for
Pro-moment heroes and applied only via that token, never inline. "no other
glow, gradient orb or bloom is permitted."

**F10. No AI fingerprint is already a written project rule.** It exists today
only as a copy rule (`eslint.config.js:256-261`). The founder's verdict extends
it to the visual system. That extension is the redesign's mandate.

---

## TEN FACTS THE PLAN MUST NOT GET WRONG

1. **The app ships a real custom font.** Seven Inter faces, loaded at boot,
   installed as the Text default (`src/styles/fonts.js:4-33`, `App.js:209-210`).
   `docs/rules/styling.md:55` says "System fonts" and is **wrong**. Fix the doc;
   do not "add a font" that is already there.

2. **73.9% of all typed text in this product is 11px or 13px, and five sites
   in the whole app exceed 24px.** `type.display` has one call site;
   `fontSize.display` has zero; `type.micro` has zero. The scale exists; the
   app refuses to use it. This is the largest single cause of the generic look.

3. **Every content block on every tab screen is exactly the same width**
   (viewport minus 32), the same radius (16), and the same 1px hairline. There
   is no full-bleed moment anywhere in the daily product (16 negative-margin
   sites total, none on a tab screen).

4. **`radius.lg` 16px is simultaneously the card, the button, the empty state,
   the tooltip and the tab-bar selection pill.** A button and a card are the
   same geometric object (`Card.js:39`, `Button.js:299`, `EmptyState.js:127`,
   `InfoTooltip.js:122`, `VolyumeTabBar.js:200`).

5. **The documented signature device was never built.** `theme.js:28-29`
   promises a Skia glow on the Home Start button; there is no Skia and no glow
   in `Button.js` or `HomeScreen.js`. `shadow.glow` has 2 call sites, one on a
   dormant unregistered screen. The app currently has no signature mark beyond
   a PNG V in a black circle, which Home has already replaced.

6. **189 of 256 theme-consuming files write every colour twice** (frozen
   `StyleSheet.create` + a per-render `live` object; 153 files carry an
   explicit `buildLiveStyles`). Every restyle is two edits in two places that
   must stay identical. Decide a position on this before touching screen one.

7. **Changing `<Card>` restyles about 70% of the app's cards.** 204 `<Card>`
   instances in 65 files, but **85 files hand-roll a card** and `<EmptyState>`
   is a separate bordered card at 99 instances. "Change the card" means three
   components.

8. **The empty state is the template tell, 99 times over.** A 52px amber-tinted
   perfect circle around a stock outline glyph, centred title, centred body,
   centred buttons (`EmptyState.js:73-79, 127-168`), across 54 files.

9. **Two visual rules are pinned by tests and are founder rulings, not drift.**
   (a) The rest timer may not be large:
   `loggerVisualArchitecture.guard.test.js:6, 58` records the device verdict and
   bans `fontSize: 26`. (b) Letter-spacing stays neutral everywhere except
   `overline` 0.5 and `wordmark` 2, lint-enforced
   (`docs/rules/styling.md:69-76`, `eslint.config.js:238-239`). Changing either
   is a founder fork, not a design decision.

10. **The contrast system and the token lint are the two things worth more than
    the visual design they currently express.** `theme.test.js` computes and
    asserts WCAG ratios for four palettes across five elevation steps in both
    themes; the lint bank has kept ~250 product files down to 14 raw radius
    literals and 40 raw padding literals. A new palette is one file edit that
    reaches everything **only because** these hold. Re-run them against every
    proposed value, and mirror any palette change by hand into
    `src/widgets/widgets.js` and `src/lib/shareCard/drawShareCard.js`, which
    cannot import the theme.

---

### Stated ambiguities (not resolved here)

- **Light-theme brand sign-off.** `theme.js:200-201` and `216-217` say the
  light palette needs the founder's on-device sign-off before public release.
  The light theme is user-selectable and live today
  (`SettingsDisplayScreen.js:13-17`). Whether that sign-off happened is not
  recorded in anything I read.
- **The Skia glow (E15 element 3).** `theme.js:28-29` describes it as
  permitted and names its surface. I found no implementation. Whether it was
  built and removed, or never built, is not recorded in the files I read.
- **Rest-timer size.** Pinned as small by a founder device verdict
  (fact 9a). Whether that ruling survives a full redesign is a founder
  question, not a lead ruling.
