# Coverage-gap audit — Light-theme parity

Status: **read-only audit, no source changed.** One of six coverage-gap
lanes commissioned in `DECISIONS-2026-07-09.md` D6 ("Coverage-gap audit
lanes: RUN ALL SIX"), filling the gap `00-MASTER-INDEX.md` section 5 named
explicitly: *"Theme parity (light theme) — Real gap, not mentioned in any
lane... the missing pass is LIGHT-theme parity: whether every screen,
shadow/elevation cue, chart, share card and celebration surface reads
correctly under the light palette."*

## Scope and method

Read in full before sweeping: `00-MASTER-INDEX.md` (format/severity/class
definitions, section 5 coverage table), `02-visual-consistency.md` (so
nothing already reported there is repeated here), `src/styles/theme.js`
(both the `baseColors`/dark table and the `lightColors`/`lightHC`/`lightCVD`
tables, the Materials Policy comment, `applyAccessibility()`'s composition
order), `src/styles/__tests__/theme.test.js` (the executable "COMP-029
light theme" contrast suite), `CLAUDE.md` §2 (ED-safety/billing
inviolables), and `coverage-03-aesthetic-craft.md` (the sibling craft lane,
to confirm no overlap — it touches the same `Button.js` ink-token history
this lane extends, see LT-1). Then read `Card.js`, `Button.js`,
`Skeleton.js`, `VolyumeChart.js`, `PRCelebration.js`,
`components/food/MacroRings.js`, `lib/shareCard/drawShareCard.js` in full,
and swept `src/screens/*.js` + `src/components/**/*.js` with targeted
greps for: hard-coded hex/rgb literals, `resolvedTheme` branches, `shadow.*`
token usage, `backgroundColor: colors.primary` (fill vs ink usage),
"naked" `colors.surface` blocks (background with neither a border nor a
shadow), and the `successBg`/`warningBg`/`errorBg` wash tokens.

**What this pass deliberately does not re-report:** lane 02's Card-radius
default, `shadow.glow` sanctioning, letterSpacing tokens (D1-D3, already
fixed in code) — this lane checked they hold under the light palette too
and they do (no re-finding). Also not re-opened: lane 02's raw-hex sweep
(re-verified here specifically for the light path — still ~0 literals,
`no-restricted-syntax` bans them regardless of theme).

**Counts.** 6 findings (LT-1 through LT-6). Severity: A: 3, B: 1, C: 2.
Class: SAFE: 2 (one partially GATED), JUDGEMENT: 4, GATED: 0 as a standalone
finding (two **sites** inside LT-1 sit on live billing screens and are
called out as GATED within that finding, per CLAUDE.md's billing
inviolable). The headline conclusion: **the light token table itself
(`lightColors`, tested by the "COMP-029 light theme" suite) is sound and
rigorously verified** — every finding below is an *application-layer* bug
(a component or screen using the wrong token, or no theme-aware branch at
all), not a defect in the palette design.

---

## Findings

### LT-1. The app-wide amber "ink" token is used as a large FILL in ~90 sites, including the shared `Button` primitive — muted colour and marginal text contrast in light theme
**Severity A — SAFE (2 sites GATED, billing)**

`theme.js:49-55` documents the intended contract explicitly: *"`primary` is
the bright amber for small marks, icons, text and key data values;
`primaryFill` is a slightly deepened amber for large filled buttons, where
the bright tone optically vibrates on a dark background."* The two tokens
are near-identical in dark (`primary` `#F5A623`, `primaryFill` `#E08C0B` —
both vibrant) but diverge in **role**, not just shade, in light
(`theme.js:170-171`): `primary` becomes `#8A5200`, a dark muted ink
calibrated for **text-on-light contrast**; `primaryFill` becomes `#F5A623`,
the bright fill colour, with `onPrimary` (`#0D0D0D`, fixed both themes) as
its ink.

`src/components/Button.js:46` — the shared `Button` primitive's `primary`
variant: `{ bg: colors.primary, fg: colors.onPrimary, border: 'transparent'
}`. The comment two lines above (`Button.js:44-46`) documents a *related*
prior fix ("audit U-F-1": the label ink must be `onPrimary`, never
`background`, which flips near-white in light) but the **fill** side of
the same variant was never moved from `colors.primary` to `colors.primaryFill`
— so it still reproduces the class of bug U-F-1 fixed, one token over.
Computed (WCAG relative-luminance formula, same one `theme.test.js` uses):

| Pairing | Light-theme ratio |
|---|---|
| `onPrimary` (#0D0D0D) on `colors.primary`-as-fill (#8A5200) — **what ships today** | **3.04:1** |
| `onPrimary` (#0D0D0D) on `colors.primaryFill` (#F5A623) — the documented pairing | **9.59:1** |

3.04:1 fails the 4.5:1 WCAG AA body-text bar and only barely clears the
3:1 large-text bar the app's own `theme.js:69-71`/`theme.test.js:296-303`
comments invoke for bold button labels elsewhere — with essentially zero
margin, versus the 9.59:1 the correct pairing gives. Practically: every
amber CTA that sets `backgroundColor: colors.primary` renders as a **dull
muted brown**, not the brand's bright amber, in light theme, with its
label sitting at the edge of legibility.

This is invisible in day-to-day dark-mode building (in dark, `primary` and
`primaryFill` are both vibrant amber, so the wrong choice looks harmless)
and only surfaces on an actual light-theme device — exactly the blind spot
this lane exists to catch.

**Scope confirmed by grep:** 88 sites across 52 files set
`backgroundColor: colors.primary` directly (plus `Button.js`'s own variant
table, which is the single highest-leverage site since dozens of screens
now route CTAs through `Button` per lane 02's D1/Batch-2 adoption push).
Representative text-bearing CTAs/badges (the contrast-critical subset):
`PlanPreviewScreen.js:65-66`, `QuizScreen.js:164`, `WelcomeScreen.js:248`,
`HomeScreen.js:2518`, `ScanBarcodeScreen.js:424`, `ScanLabelScreen.js:442`,
`GoalLockConsentScreen.js:211,224`, `PlansScreen.js:1175,1223,1329`,
`PlanDetailScreen.js:444`, `ProSetupCompleteScreen.js:471`,
`DiaryScreen.js:1821` (the "add food" FAB, `...shadow.lg` already applied
there — confirms shadow-on-fill is an established pattern, just not
extended to Card, see LT-3). Representative decorative-only fills (no
overlaid text — vibrancy/on-brand-ness concern, not a contrast failure):
`ProgressSections.js:135,318`, `ReadinessCards.js:294`,
`MesocycleBuilderScreen.js:432,484,506`, `FoodInsightsScreen.js:693,704`,
`DiaryScreen.js:2126`, `YearOfLiftsScreen.js:735`,
`WeeklyCheckInScreen.js:1734`, `PartnerScreen.js:1695,2093`,
`MealPlanScreen.js:1272`, `PlanLibraryScreen.js:863`,
`FoodSearchScreen.js:1138`.

**Two sites sit on live billing screens and must not be folded into a
mechanical sweep:** `BillingPeriodSelector.js:71-80` (the "Save X%" badge:
`saveBadge` at line 75 sets `backgroundColor: colors.primary`, and
`saveBadgeText` at line 80 sets `color: colors.onPrimary` on top of it —
the same 3.04:1 pairing) and
`ProUpgradeScreen.js:579` (the post-purchase `successCircle`). Per
CLAUDE.md §2 ("Billing... Never change billing without permission — state
exactly what and why, wait for explicit 'proceed'"), these two are called
out as **GATED**, not bundled into the otherwise-mechanical fix.

**Proposed change.** Swap `backgroundColor`/`bg` from `colors.primary` to
`colors.primaryFill` at every fill site (icon/text `color={colors.primary}`
usages — small marks, data-line strokes, chevrons — are correct as-is and
must not be touched). `Button.js:46` is the one edit that cascades
correctly to most CTAs. Non-billing sites are SAFE (zero dark-theme visual
change: `primary` and `primaryFill` differ by only one shade of amber in
dark, an intentional, already-shipped distinction). Billing sites need the
founder's explicit "proceed" first.

---

### LT-2. The nutrition hero visual — the calorie ring — uses the same ink token as its Skia fill, muting the app's most-viewed Pro screen in light theme
**Severity A — JUDGEMENT**

`src/components/food/MacroRings.js:20-21` — `bandColour()` (the documented
"adherence-neutral ring colour," founder decision 2026-05-29, correctly
never a red/green good-bad mark) `return colors.primary;`. Consumed at
`MacroRings.js:163` (`const kcalTint = bandColour();`) and
`MacroRings.js:274` (`<Ring ... tint={kcalTint} ... />`), where `tint`
becomes the actual Skia `<Path color={tint} style="stroke" strokeWidth={14}
.../>` paint colour for the 132px calorie ring on `DiaryScreen` — the
single most-viewed visual in the whole nutrition/Pro experience. This is
the exact same ink-as-fill trap as LT-1, on a canvas stroke rather than a
`backgroundColor`: in light theme the ring draws in `#8A5200` (dull brown)
rather than the vibrant `#F5A623` it (and its dark-theme self) is meant to
read as. (The four macro bars underneath it are unaffected — they
correctly pass `tint={colors.macroProtein/Carb/Fat/Fibre}`, dedicated
graphical tokens verified at 3:1 against the bar track in both themes by
`theme.test.js:317-328`; only the kcal ring itself, and the `MacroBar`
default `tint = colors.primary` parameter at `MacroRings.js:105`, which no
live call site currently overrides to — confirmed dead in practice, all
four `<MacroBar>` call sites at lines 306-318 pass an explicit tint —
carry the bug.)

**Proposed change.** Route `bandColour()` through `colors.primaryFill`
instead of `colors.primary`. Flagged JUDGEMENT rather than SAFE because,
unlike LT-1's buttons, the ring is dark-theme-visible too: `primaryFill`
in dark is `#E08C0B`, a barely-perceptible half-step deeper than `primary`'s
`#F5A623` — swapping the token changes today's dark-theme ring by that
small amount. Two options for the founder: (a) accept the tiny dark-theme
shift for a single shared token (simplest, matches LT-1's fix), or (b) add
a dedicated graphical-fill token that is pinned to the current dark value
in both themes (zero dark diff, one more named token). Either fixes the
light-theme muting; which one is a one-line preference call, not a
design-research question.

---

### LT-3. Cards carry no shadow anywhere in the app, directly contradicting the Materials Policy's own rule that light theme uses shadow as its primary elevation cue
**Severity A — JUDGEMENT**

`theme.js:11-14` (the Materials Policy, founder-approved 2026-07-03):
*"Elevation is communicated by the SURFACE LADDER... in the dark theme;
**the light theme uses shadows as the primary elevation cue**."*
`theme.js:237-241` reinforces it: *"Light shadows are the PRIMARY elevation
cue (dark carries it via the surface ladder, which barely reads on
charcoal)."* Yet:

- `src/components/Card.js` — the shared card primitive used across 38+
  screens — applies **no shadow token at all**. Its only edge definition
  is `styles.base: { borderWidth: 1, borderColor: colors.borderSubtle }`
  (`Card.js:126-129`), and `theme.js:47` itself documents `borderSubtle` as
  *"hairline dividers INSIDE a card... low-contrast, **not a card edge**"*
  — Card uses it as the card's own outer edge regardless.
- Zero components or screens in the whole app branch on `resolvedTheme`
  (`grep -rn "resolvedTheme" src/components src/screens` returns nothing
  outside `theme.js`/`App.js`/`RootNavigator.js`). Only **6 files** in the
  entire app reference any `shadow.*` token: `ActiveSessionMiniBar.js`,
  `Toast.js`, `WelcomeScreen.js`, `ProOnboardingScreen.js`,
  `ProUpgradeScreen.js` (the three `shadow.glow` Pro-moment sites, D2), and
  `DiaryScreen.js:1837` (the "add food" FAB). Every other card in the app —
  the `Card` primitive and the majority of the 155 hand-rolled
  `colors.surface` blocks lane 02 tracked — has no shadow in either theme.

In dark theme this is invisible because the surface ladder genuinely does
the job the Materials Policy assigns it (`background` `#0D0D0D` vs
`surface` `#191917` is a real, if subtle, luminance step). In light theme
the equivalent ladder step is **imperceptible**: `background` `#FAFAF7` vs
`surface` `#FFFFFF` computes to a **1.05:1** contrast ratio, and Card's
default hairline border (`borderSubtle` `#E4E4DF` on `surface` `#FFFFFF`)
computes to **1.28:1** — both far under the 3:1 WCAG 1.4.11 bar for
UI-component boundaries. A default (untoned, no explicit border override)
`<Card>` in light theme is therefore an all-but-invisible white block on an
off-white page with no elevation cue whatsoever, exactly what the app's own
written policy says must not happen.

**Confirmed concrete "naked" cards** (background-only, no border, no
shadow — sampled beyond the primitive itself): `RecipeBuilderScreen.js:539`
(`macros` card, sits directly on the screen background),
`components/food/ServingPicker.js:77` (`inputField`, a control that per
`theme.js:15-16`'s own rule — *"BORDERS are the hairline definition...
where a control needs a WCAG-contrast edge"* — should carry one and does
not). Sheets/modals in the naked-block sweep (`HomeScreen.js:2642,2727`,
`PlanLibraryScreen.js:845`, `ScanLabelScreen.js:405`) are not flagged here:
they sit against a `colors.scrim` backdrop, which still provides visible
separation without their own border/shadow.

**Proposed change.** A founder call on the mechanism, not the goal: (a)
`Card.js` applies `shadow.sm` (or a new lighter step) automatically when
`resolvedTheme === 'light'`, the single highest-leverage fix since Card is
about to absorb the remaining 155 hand-rolled blocks (lane 02 Batch 2); (b)
strengthen the light `background`/`surface` luminance gap at the token
level instead (affects every screen background, a bigger blast radius);
(c) both. Given Card is the app's single most-used surface and is
mid-migration, this is the natural moment to decide.

---

### LT-4. PR-celebration confetti borrows the same muted ink tokens, muting 3 of 5 particle colours in light while the two dedicated celebration tokens stay vibrant
**Severity B — JUDGEMENT**

`src/components/PRCelebration.js:21` — `const PR_PALETTE = [colors.primary,
colors.gold, colors.success, colors.celebrationEmber,
colors.celebrationViolet];`, applied as a particle's own
`backgroundColor: p.color` at `PRCelebration.js:90` and `:246`.
`celebrationEmber`/`celebrationViolet` are deliberately fixed hex values in
both themes (`theme.js:117-121`: *"Fixed festive hues on the dark
celebration scrim in both themes"*) — but the surrounding celebration
**surface itself is not fixed** (`PRCelebration.js:300,311` use
`colors.background`/`colors.surface`, so the card does follow the app
theme), and three of the five confetti colours are the same ink tokens
LT-1/LT-2 flag: in light, `primary` → `#8A5200` (muted brown), `gold` →
`#8A6D00` (muted olive), `success` → `#2E7D32` (a reasonably saturated
green, the least-affected of the three). The result is a five-colour
confetti burst where two colours stay bright and three go dull, at the
app's single biggest deliberate delight moment (a PB celebration).

**Proposed change.** Either give `theme.js` a small dedicated
"celebration-bright" set for `primary`/`gold`/`success` (mirroring the
existing fixed-both-themes treatment `celebrationEmber`/`celebrationViolet`
already get), or have `PRCelebration.js` import its own small always-bright
constants the way `lib/shareCard/drawShareCard.js` already does for the
same reason (see "what's genuinely strong," below). JUDGEMENT: which
precedent to follow is a one-time design call, not ambiguous once decided.

---

### LT-5. The loading-skeleton shimmer pulse is far less visible in light theme than dark
**Severity C — JUDGEMENT**

`src/components/Skeleton.js:23-58` — the shimmer animates `opacity` between
0.45 and 0.85 on a block filled with `colors.surface3`
(`Skeleton.js:87`). `SkeletonCard`/`SkeletonRow`'s wrapping card correctly
uses `surface2` + a real `border: colors.border` (`Skeleton.js:88-93`, no
finding there). But the shimmering bars themselves read against whatever
sits behind them, typically `surface2`. In dark theme, `surface2`
(`#2A2A27`) vs `surface3` (`#343431`) is a proportionally larger jump than
in light, where `surface2` (`#EFEFEA`) and `surface3` (`#E7E7E1`) are only
a few RGB points apart — blended at the pulse's low-opacity phase (0.45)
the visible difference from the surrounding `surface2` is only a handful
of RGB points, close to imperceptible on a real screen, versus a clearly
"breathing" bar in dark. Not a WCAG failure (no text ever sits on a
skeleton bar) but a "does the loading state feel alive" craft gap, most
visible on the food/nutrition and partner screens this pattern was built
for (lane 02 A-3).

**Proposed change.** Either widen the light `surface2`/`surface3` gap
specifically for the skeleton's use, or drive the pulse against a fixed
stronger base (e.g. always blend toward `colors.border` rather than
`surface3`) so the shimmer stays visible regardless of theme. JUDGEMENT:
a token-value tweak with knock-on effects on every other `surface3`
consumer (input fills, chip fills) needs a design look, not a blind swap.

---

### LT-6. Chart gridlines stack an extra 0.5 opacity on top of a border token that is already at the bare minimum contrast in light theme
**Severity C — SAFE**

`src/components/VolyumeChart.js:66-67` sets `rulesColor = theme.border`
(the gridline/rule colour) and `axisColor = theme.border`, then
`VolyumeChart.js:236` draws the horizontal rule `<Line stroke={rulesColor}
strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />` — an *additional*
0.5 opacity multiplier on top of the border token. Computed against the
actual rendered (blended) colour: the light gridline works out to
**1.69:1** against a white card and the dark gridline to **1.80:1** against
the near-black background — both well under the 3:1 WCAG 1.4.11 bar for
graphical objects, and this is **not** light-exclusive (both themes fail
by a similar margin; noted here because this pass is the first to compute
it and it directly affects the light reading of every `VolyumeChart` host
— Analytics, Body Metrics, Weight Trend, Food Insights). The chart's own
solid tokens (`axisColor` at full opacity, `chartLine`) are fine in
isolation; it is specifically the *halved* gridline that under-shoots.

**Proposed change.** Drop the extra `opacity={0.5}` (the `strokeDasharray`
already reads as a quieter dashed rule without it) or move `rulesColor` to
a stronger token (`colors.borderLight`, tested at ~4.5:1 in light) before
applying the opacity. Mechanical, no design-taste call needed — SAFE.

---

## Safe quick wins (implementable now, no founder decision)

- **LT-1** (non-billing sites) — swap `backgroundColor`/`bg:
  colors.primary` → `colors.primaryFill` at `Button.js:46` and the ~86
  remaining non-billing fill sites listed above. Zero dark-theme visual
  change; fixes a WCAG AA-failing light-theme button.
- **LT-6** — drop or relocate the extra `opacity={0.5}` on
  `VolyumeChart.js:236`'s gridline stroke.

## Needs a founder/design decision

- **LT-1 (billing sites only)** — `BillingPeriodSelector.js:75,80` and
  `ProUpgradeScreen.js:579` carry the identical bug but sit on live
  purchase screens; CLAUDE.md requires an explicit "proceed" before
  touching billing chrome, however small the change.
- **LT-2** — MacroRings' calorie-ring tint: accept a barely-visible
  dark-theme shift by reusing `primaryFill`, or add a dedicated
  graphical-fill token pinned to today's dark value. Either fixes light;
  the choice is cosmetic-preference, not investigation.
- **LT-3** — the elevation mechanism for cards in light theme: auto-shadow
  in `Card.js` keyed on `resolvedTheme`, a stronger light
  `background`/`surface` gap at the token level, or both. This is the
  single biggest light-theme structural gap found in this pass and should
  be decided before Card absorbs the remaining 155 hand-rolled blocks
  (lane 02 Batch 2).
- **LT-4** — give celebration confetti its own always-bright colours
  (new token set) or a self-contained constant list (matching
  `drawShareCard.js`'s existing pattern). Either restores full vibrancy;
  which precedent to follow is the open question.
- **LT-5** — whether to widen light's `surface2`/`surface3` gap (affects
  every consumer of those two tokens) or give `Skeleton` its own
  stronger base colour (scoped to loading states only). Needs a look at
  the actual on-device shimmer, not just the numbers.

---

## What is genuinely strong (verified, not assumed)

- **The light token table itself is sound.** `src/styles/__tests__/theme.test.js`'s
  "COMP-029 light theme" describe block (lines 237-354) executably asserts
  every core text role, border, macro-category tint, `onPrimary`/`onError`
  ink pairing, higher-contrast composition and colour-blind-safe swap
  clears its WCAG bar in light — and, having independently recomputed
  several of these ratios by hand for this audit, they check out. Every
  finding in this lane is an application-layer misuse of a correctly
  designed token, not a flaw in the palette design.
- **`Button.js`'s destructive variant and its `fg` ink choices are already
  theme-safe**, per the "audit U-F-1" fixes documented in its own comments
  (`Button.js:44-51`) and pinned by `primitives.test.js:65` and
  `theme.test.js:296-303` — this lane's LT-1 extends that same history to
  the one remaining unfixed half (the *fill*, not the ink), which the
  sibling `coverage-03-aesthetic-craft.md` audit (which also cites U-F-1)
  did not catch, since it was checking text, not fills.
- **Adherence-neutral rendering holds in light.** `MacroRings.js`'s
  `bandColour()` never resolves to a state colour (checked — it is always
  `colors.primary`/`primaryFill`, never `success`/`warning`/`error`), and
  the four macro bars use fixed category tints, never a red/green
  good/bad mark, regardless of theme — the ED-safety-adjacent "no colour
  judgement" rule is token-architecture-enforced, so it survives the
  theme swap automatically. No red/green good-bad framing was found
  anywhere in the diary/macro rendering path in either theme.
- **`VolyumeChart.js` (the app's one chart engine) is fully theme-token
  driven** — every colour prop defaults to a `theme.*` token, so axes,
  labels, tooltips and the chart-fill gradient all correctly re-resolve
  under light with no hard-coded dark assumption (the one gridline-opacity
  nit is LT-6, not a theme-awareness gap).
- **`Skeleton.js`'s card/row presets, not just the base shimmer,** use a
  real `border: colors.border` and `surface2` background (`Skeleton.js:88-93`)
  — solidly legible in light; only the shimmer *animation's* visibility
  is a (minor) finding (LT-5), not the static preset shapes.
- **Share cards and full-bleed celebration/story surfaces are correctly,
  deliberately theme-independent where it matters.**
  `lib/shareCard/drawShareCard.js:30-36` hardcodes its own fixed dark
  palette (`bg0`/`bg1`/`surface`/`text`, distinct from `theme.js`) rather
  than importing theme tokens — the right call for a social-share image,
  which should look brand-consistent regardless of the viewer's or even
  the sharer's device theme, the same way Spotify Wrapped or Strava's
  share cards do not follow the host app's light/dark setting. This is
  confirmed intentional, not an oversight, and is not re-flagged as a bug.
- **No hard-coded hex/rgb literals survive anywhere in `src/screens/` or
  `src/components/`** (re-verified for this pass specifically): the
  `no-restricted-syntax` ESLint bank lane 02 confirmed still holds, so no
  screen can silently assume a dark background via a raw colour literal —
  every colour reference goes through a token that already re-resolves
  correctly under light, except where that token itself is the wrong
  *role* for the job (LT-1/LT-2/LT-4's actual defect).
- **Camera/scanner screens are correctly theme-invariant.**
  `colors.camera` (`theme.js:111-115`) is deliberately fixed black in both
  themes (a live camera viewfinder is always black regardless of app
  theme) and every scan screen (`ScanBarcodeScreen`, `ScanLabelScreen`)
  uses it consistently — not a light-theme gap.
