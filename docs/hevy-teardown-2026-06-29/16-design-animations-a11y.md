# 16 — Design, motion & a11y — Hevy vs Volyume

Competitive teardown of Hevy (RN/Hermes v3.1.0) against Volyume, scoped to
visual design, motion/animation, perceived polish and accessibility. Hevy
evidence is from the decompiled corpus (Hermes packs strings, so boundaries are
noisy — every claim below is corroborated by ≥2 independent string hits and the
native-lib / SDK fingerprints, never a single fragment). Volyume evidence is
first-hand from source with file:line. **Learnings only — no Hevy code or assets
are copied.**

Corpus: `scratchpad/corpus/` (bundle_strings.txt, screens_components.txt,
native_libs.txt, sdk_fingerprints.txt, events_keys.txt).

---

## Design, motion & a11y — Hevy vs Volyume

### How Hevy does it

**Native motion stack (corroborated).**
`native_libs.txt`: `librive.so` + `librive-android.so`, `libreanimated.so`,
`libgesturehandler.so`. `sdk_fingerprints.txt`: **rive = 89 hits** (second only
to Sentry). So Hevy ships the full Rive runtime (interactive, state-machine
vector animation) *in addition to* Reanimated + Gesture Handler. Rive is a
deliberate, heavyweight choice — it is not free to bundle.

**Where Rive is used.** The strongest, repeated Rive component hits are
`RiveStressView`, `RiveStressCached`, `RiveStressStock`, plus the runtime plumbing
`loadRiveFile`, `RiveFile`/`riveFile`, `RiveFontConfig`, `RiveImageFactory`,
`NitroRiveView`, and state-machine I/O (`State Machine 1`, `RiveBoolean`,
`RiveNumber`, `RiveTrigger`, `RiveEventType`). Read together this is an
**interactive, state-machine-driven muscle "stress"/strain body visualisation** —
an animated anatomy figure whose regions are driven by data inputs at runtime
(the copy around it talks about "fatigue will be more localized", "stress on your
lower back / spine"). The separate, non-Rive muscle screens
(`MuscleGroupGraph`, `MuscleHeatmapKeys`, `MuscleGroupImage`) are image/SVG —
so Rive is reserved for the one premium hero anatomy surface, not sprinkled
everywhere.

**Streak system (SVG, not Rive).** `currentStreakFlameSvg`, `innerFlameFillColor`
plus a wall of copy: "Keep your streak strong", "Train this week to start your
streak and **light your flame**", "Dein Streak ist in Gefahr" (streak in danger),
`calculateBestWeekStreak`, `Week Streak Calendar`. A flame mark that lights/grows
with consistency and visibly decays when at risk — a strong retention loop.

**Celebration & milestones.** `checkAndFireInitialConfetti`, `fireConfetti`,
`confettiCount`, `stopConfetti`, `MilestoneBadge`, "Workout Milestone achieved",
and **Live Personal Record** notifications ("when you achieve a Personal Record
upon checking the set"). Confetti is reserved for milestone/PR moments.

**Year-in-Review.** A whole deck of shareable cards: `YIRCardTotalVolume`,
`YIRCardStreak`, `YIRCardPersonalRecords`, `YIRCardBestMonth`,
`YIRCardMuscleBreakdown`, `YIRCardTopExercises`, `YIRCardSummary`,
`YIRCardSupporter`, `YIRCardShared`. Spotify-Wrapped-style annual recap = a
seasonal virality + perceived-polish surface.

**Loading polish.** `Shimmer`, `colorShimmerPlaceHolder`, `beginShimmerPosition`
— shimmer skeletons rather than spinners.

**Theming.** `BackgroundThemeModal`, `colorScheme`, `DarkMode`/`LightMode`,
`darkModeColorOverride`/`lightModeColorOverride`, `BackgroundThemedDiagonalGradient`
— user-selectable background themes with light/dark overrides and gradient
backgrounds. This is a *cosmetic personalisation* feature, not an accessibility
system.

**Reduce-motion & a11y.** Reanimated's reduce-motion path is heavily present
(`getReduceMotionForAnimation` ×81, `findNextNonReducedMotionAnimation`,
`reduceMotionOrFirstAnimation`, `ReduceMotion.System/Always`). a11y API hits are
comparatively **thin**: `accessibilityLabel` (~14), one each of
`accessibilityRole`, `accessibilityHint`, `accessibilityState`,
`accessibilityElementsHidden`, plus `isHighTextContrastEnabled`,
`isBoldTextEnabled`, `fontScale`/`AllowFontScaling`, `screenReader`. So Hevy
honours OS reduce-motion / bold-text / font-scale and labels *some* controls,
but there is **no evidence of a tested contrast system or a colour-vision-deficiency
(CVD) palette** — its accessibility is "respect the OS flags", not "engineered,
tested tokens".

**Font / haptics.** Figtree (Regular/Medium/SemiBold/Bold). Haptics present but
sparse in the strings (`HapticFeedbackEnabled`, `HapticFeedback`).

### How Volyume does it today (file:line)

**Tested design-token system — clearly ahead of Hevy.**
`src/styles/theme.js`:
- Dark + light palettes with **every contrast ratio computed and asserted** in
  `src/styles/__tests__/theme.test.js`, and a token guard in
  `src/__tests__/themeTokens.guard.test.js`. WCAG ratios are written next to each
  token (e.g. `border` "3.81:1 … meets WCAG 1.4.11", `textPrimary` "19.44:1 …
  AAA") — theme.js:23, 67-70, 115-118.
- **CVD (colour-blind-safe) palettes** using Okabe-Ito hues, theme-keyed for both
  dark and light (`darkCVD`/`lightCVD`, theme.js:165-176; rationale 291-296):
  success green→sky-blue `#56B4E9`, error red→reddish-purple `#CC79A7`; `warning`
  retuned to Okabe-Ito `#F0E442` so a "watch" mark never collides with brand amber
  (theme.js:52-62).
- **Higher-contrast tables** (`darkHC`/`lightHC`, 151-164) and **larger-text**
  ×1.2 scaling (333-345), all resolved in one boot-time `applyAccessibility(prefs)`
  (theme.js:301-346).
- Elevation ladder, semantic state grammar (`stateColors` onTrack/watch/act/neutral,
  457-472), tabular-figure helper `num()` (425-429), Material-3 **motion tokens**
  with reduce-motion guidance baked into the comments (`motion`, 516-545),
  `withAlpha()` (212-234). "No hardcoded hex" is an enforced rule.

**Motion stack: Reanimated + Skia (no Rive, no Lottie).**
Confirmed by import grep: `react-native-reanimated` and `@shopify/react-native-skia`
across `src/components/{AnimatedEntrance,PeekMenu,RestTimer,PRCelebration,VolyumeChart,
SetEntry,food/MacroRings}.js`, `src/lib/shareCard/drawShareCard.js`,
`src/screens/ShareCardScreen.js`. No `rive`/`lottie` imports anywhere in `src/`.

**Reduce-motion is wired through real components**, reading
`accessibility.reduceMotion` from the store (not just the OS flag):
`src/components/AnimatedEntrance.js:29-39` (skips entrance), `Skeleton.js:23-30`
(pauses shimmer), plus `BottomSheet.js`, `PeekMenu.js`, `PressableCard.js`,
`Toast.js`, `FeedbackSheet.js`, `food/MacroRings.js`. Tested in
`components/__tests__/animatedEntrance.test.js`, `bottomsheet.test.js`, etc.

**Named haptic vocabulary that respects reduce-motion.**
`src/lib/haptics.js` maps intent→feel (`setLogged`, `prAchieved`, `restDone`,
`workoutComplete`, `error`, `commit`…) and **no-ops entirely under reduceMotion**
(haptics.js:19-37) — more disciplined than Hevy's scattered haptic calls.

**Celebration.** `src/components/PRCelebration.js` — hand-rolled 40-particle
confetti burst via RN `Animated` with a `subdued` toast mode and PR delta
("+X% over your previous best", :170-181); haptics inline (:54-56).

**Muscle map.** `src/components/BodyDiagramHeatmap.js` — **static SVG** front/back
figure, regions filled by volume-status colour, each region carrying a
screen-reader label ("Front delts, optimal", :muscleLabel). Functional and
accessible, but visually static.

**Empty states.** `src/components/EmptyState.js` — shared, deliberately
shame-free/adherence-neutral, with primary/secondary CTAs and a "ghost"
preview mode ("your data will look like this"). `src/components/Illustrations.js`
provides custom empties.

**Skeletons.** `src/components/Skeleton.js` (+ `SkeletonCard`/`SkeletonRow`
presets), pulse paused under reduce-motion — parity with Hevy's shimmer.

**a11y breadth.** `accessibilityLabel`/`accessibilityRole` across **126 non-test
source files** — markedly broader labelling than Hevy's corpus shows. Tabular
figures, font-scale stacking (`allowFontScaling` default + in-app larger-text).

**Streak.** `src/components/StreakWeeksSection.js` exists (week calendar), and a
ShareCard pipeline (`src/lib/shareCard/`, `ShareCardScreen.js`) — but there is no
flaming/decaying streak mark or a Year-in-Review deck.

### Gaps

1. **No interactive hero anatomy animation.** Hevy's `RiveStressView` gives a
   premium, state-machine-driven animated muscle/stress figure; Volyume's
   `BodyDiagramHeatmap` is a correct but static SVG. This is the single biggest
   perceived-polish delta, and it sits right on Volyume's coaching story (fatigue,
   volume status) where an animated body would read as "intelligent".

2. **Celebration/streak motion is thinner and not centralised.** Volyume's
   confetti is one bespoke RN-`Animated` component (PRCelebration), not a reusable
   motion primitive; there is no flame/streak-at-risk loop and no Year-in-Review
   deck — both of which are proven Hevy retention/virality surfaces.

3. **PRCelebration does not auto-degrade under reduce-motion.** `subdued` is a
   prop the *parent* must pass (PRCelebration.js:33) and the 40-particle burst
   doesn't consult `accessibility.reduceMotion` — inconsistent with the otherwise
   excellent reduce-motion discipline in haptics.js/Skeleton/AnimatedEntrance.
   It also uses legacy RN `Animated` while the rest of the app is on Reanimated.

**Smaller, already-tracked gaps** (not in the top 3, but noted for completeness):
- **Chart container a11y.** Volyume's own accessibility audit (FINDING-M2) flags
  that `VolyumeChart`, `MacroRings`, `BodyDiagramHeatmap` and the PR sparkline
  need container-level `accessibilityLabel`s (VolyumeChart already announces on
  scrub). Hevy's corpus shows no better chart a11y, so this is "lead more", not
  "catch up".
- **Stale styling rule.** `docs/rules/styling.md` still says "Always dark (no
  light mode)" and "no gradients" — the doc predates the COMP-029 light theme and
  the tested gradient surfaces now in `theme.js`/`GradientCard.js`. Worth a doc
  refresh so the rules match the shipped, tested token system (mention only — not
  fixing here).

(Where Volyume already leads, and must not regress to "match" Hevy: tested
contrast, the CVD palette, light/dark as an *accessibility-resolved* system,
named reduce-motion-aware haptics, and far broader a11y labelling. Hevy has none
of these.)

### Recommendations (adopt/adapt — S/M/L · P1/P2/P3)

1. **Make PRCelebration reduce-motion-aware + port to Reanimated.** *(adapt · S · P1)*
   Auto-select `subdued` when `accessibility.reduceMotion` is set, and route its
   haptics through `lib/haptics.js` instead of inline `expo-haptics`. *Why:* closes
   an accessibility inconsistency in a flagship moment; cheap; aligns the one
   legacy-`Animated` celebration with the app's Reanimated standard.

2. **Animate the muscle map with Skia (not Rive).** *(adapt · L · P2)*
   Give `BodyDiagramHeatmap` motion using the existing Skia stack: animated
   fill/opacity transitions when volume status changes, a soft pulse on the
   highest-fatigue region, gated by reduce-motion. *Why:* captures the perceived
   value of Hevy's `RiveStressView` on Volyume's own coaching data **without
   adding the Rive native dependency** (which would need founder sign-off per the
   "no new dependencies" rule and bloats the bundle). Skia is already shipped.

3. **Add a flame/streak loop and a Year-in-Review deck, building on what exists.**
   *(adapt · M then L · P2/P3)* Extend `StreakWeeksSection` with a streak-at-risk
   state + a tasteful flame mark (Skia/SVG), and reuse the `lib/shareCard`
   pipeline to ship a small annual recap deck (volume, PRs, best month, top
   exercises). *Why:* these are Hevy's strongest retention (flame) and virality
   (YIR) surfaces and Volyume already has the data + a share-card renderer; this
   is assembly, not new infrastructure.

4. **Promote celebration motion into a reusable primitive.** *(adapt · M · P3)*
   Factor the confetti/burst into a `lib/motion` (or component) primitive driven
   by the `motion` tokens, so PRs, milestone workouts and YIR cards share one
   tuned, reduce-motion-aware burst. *Why:* consistency + reuse; avoids a second
   bespoke confetti when the streak/YIR work lands.

5. **Adopt shimmer-on-real-shape skeletons everywhere a spinner remains.**
   *(adopt · S · P3)* Hevy uses shimmer placeholders pervasively; Volyume's
   `Skeleton` already exists — finish replacing any remaining `ActivityIndicator`
   on data-heavy screens with structure-matching skeletons. *Why:* perceived
   responsiveness, near-zero cost.

### Quick wins

- PRCelebration: respect `reduceMotion` (auto-subdued) + use `lib/haptics`
  (P1, ~1 file). *(rec 1)*
- Sweep remaining `ActivityIndicator`s → `Skeleton`/`SkeletonCard`. *(rec 5)*
- Add a streak-at-risk visual state to `StreakWeeksSection` before the full flame
  loop — cheap retention signal. *(toward rec 3)*
- Confirm light/CVD founder brand sign-off noted in `theme.js:108, 124` so the
  already-built light + CVD palettes can ship (pure upside vs Hevy, which has no
  CVD palette at all).
