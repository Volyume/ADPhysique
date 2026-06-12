# COMP-029 light theme — on-device sweep + brand sign-off checklist

The code is complete and the CI contrast tests prove every token clears its WCAG
bar (`src/styles/__tests__/theme.test.js`). What CI cannot catch is the
"looked-right-by-coincidence" tail and the brand feel of the darkened hues — that
needs eyes on a real build. Do this on **one OLED Android + one iPhone (iOS 18)**
after the EAS build, on the **internal track** before any public release.

## 0. Prerequisite (one EAS native build)
`app.json` `userInterfaceStyle` is now `"automatic"` and `expo-system-ui` is a
dependency. Build on EAS so the native-surface theming takes effect, then set
Appearance → Light in You → Settings → Display.

## 1. Brand sign-off (the decision, not just QA) — sign off on REAL screens
These hues were derived/computed, not eyeballed. Confirm they read as Volyume,
not "brown app", in context:
- [ ] **`primary` ink `#8A5200`** on white cards — amber action text/icons,
      "Apply" links, the methodology accent. Blueprint risk #3: may read brown.
- [ ] **`warning` `#6E6300`** (a NEW derived hue — the dark token drifted to
      Okabe-Ito yellow after the blueprint). Must read as "watch/caution" AND
      stay clearly distinct from the `#8A5200` amber primary.
- [ ] **`primaryFill` `#F5A623`** buttons with `onPrimary` `#0D0D0D` ink — the
      bright brand amber as the fill (the inversion vs dark). Confirm it looks
      premium, not washed out, on `#FAFAF7`.
- [ ] Trophy `gold/silver/bronze` inks; `error #C62828` / `success #2E7D32`.

## 2. Coincidence sweep — ~60 screens, watch for dark-only assumptions
Eyes specifically on: amber fills/inks, **skeletons** (`surface3` on light),
scrims/modals/sheets, empty states, **PlateCalculator** (the white 5kg/5lb plate
needs a visible edge on white — blueprint §4d), OAuth buttons (Apple stays black
by spec), keyboard appearance, status bar, tab bar.
- [ ] Home (hero + TodayStrip), ActiveWorkout (the sacred screen), Diary (macro
      rings + the COMP-004 trend card), Progress/Analytics (charts + trend card),
      CoachOutput, Paywall/ProGate, Onboarding, You/Settings, ShareCard preview
      (the canvas stays dark-brand by design — only the chrome themes).
- [ ] Charts (VolyumeChart line + bars): `chartLine #B45309` legible on white.
- [ ] COMP-004 trend card + COMP-026 step-trend line render on light.
- [ ] Light × Higher-contrast and Light × Colour-blind-safe both legible.

## 3. Native-surface coherence (the app.json flip)
- [ ] A user on **Dark in-app with a Light phone** still gets dark keyboards/
      pickers/alerts (the `Appearance.setColorScheme` call must run early enough).
- [ ] "Match phone" follows the OS; flipping the OS theme mid-session prompts the
      reload (and is suppressed during an active workout).

## 4. Rollout
- [ ] Internal track soak 1–2 weeks (default stays Dark; opt-in only).
- [ ] Watch reviews/crash-free rate; then public.
- [ ] Amend `docs/rules/styling.md` (it bans white backgrounds and is stale vs
      the current token values) — founder-approved amendment when this ships.
