# Deep Feature Audit — Item 12: Splash screen (inline)

**Document:** deep-audit-13-splash.md
**Item:** 12 of master inventory (screen #3 — `SplashScreen`, inline in `RootNavigator.js`)
**File:** `src/navigation/RootNavigator.js` (`SplashScreen` `:998-1085`, `splashStyles` `:1093-1117`, `SPLASH_MIN_MS` `:428`, gate `:923-924`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved" — minimum set to the recommended 1600 ms). Lowered SPLASH_MIN_MS 2500 -> 1600; tagline now uses fontSize.sm; hero image labelled "Volyume". Routing/gate untouched.
**Timestamp:** 2026-06-04

> Note: this lives in `RootNavigator.js`, a runtime-critical bootstrap/auth file.
> The proposed changes are isolated (one constant, one token, one a11y label) and
> do not touch the routing/gate logic.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The cold-launch brand splash. Rendered by the splash gate
(`if (!splashReady || !firstRunChecked || !tierChecked) return <SplashScreen/>`,
`:923-924`) during initial bootstrap, before the tier and first-run checks
resolve. It animates a wordmark hero (fade + back-eased scale + rise), then an
amber accent-bar scaleX sweep, then the tagline "Less thinking. More lifting.".
Every animated value starts at its end state when Reduce Motion is on, so the
splash appears instantly with no motion. Background is `colors.background`
(`#0D0D0D`), matching the app so there's no black seam at hand-off.

### Findings
1. **Tasteful, on-brand, Reduce-Motion-aware.** Single amber accent, no gradient
   or orb, brand background, subtle premium animation. Matches the locked design
   law and the "animation gives a premium perceived-startup" research. Good.
2. **Forced minimum of 2.5 s is longer than best practice.** `SPLASH_MIN_MS =
   2500` (`:428`) holds the splash for at least 2.5 s. The animation sequence
   completes in ~1.45 s (650 + 320 + 280 + 300 ms), so on a **fast** cold boot
   (checks already resolved) the splash sits idle ~1 s after it's visually done.
   Research: keep splashes under ~1.5 s; every extra second is ~8% more
   abandonment, and a 3 s splash loses ~12% more first-time users than 1.5 s.
   The minimum only bites on fast boots — slow boots are gated by the tier/
   first-run checks regardless — so lowering it speeds the common fast case
   without affecting slow ones. This is the one finding that moves a metric.
   (It is a brand-dwell vs first-launch-speed trade-off, so the exact value is a
   founder call.)
3. **Raw `fontSize: 13` literal.** `splashStyles.tagline` uses `fontSize: 13`
   (`:1110`) instead of the `fontSize.sm` token (which is 13). It doesn't trip
   the design-system lint gate (that gate is scoped to `src/screens` +
   `src/components`, not `src/navigation`), but it's inconsistent with the token
   system used everywhere else. Trivial.
4. **Hero image has no accessibility label.** The wordmark `<Image>` (`:1071`)
   has no `accessibilityLabel`; the shared `VolyumeMark` component sets
   `accessibilityLabel="Volyume"` on its image, so this is an inconsistency. A
   screen reader on cold launch announces nothing. Low value (transient splash)
   but a one-word fix.
5. **Copy is on-brand.** "Less thinking. More lifting." matches the You-tab About
   line. No em dash, no AI tell. Keep.

### Design assessment (values cited)
- On-system: `colors.background`, `colors.primary` accent bar (40×2, a restrained
  hairline), `colors.textMuted` tagline, `fontWeight.regular`, scale `spacing`.
  The hero is sized to 70% of window width by a fixed aspect ratio with contain
  resize, so it scales cleanly. No black seam (commented). This is a confident,
  minimal brand splash, not a template.

### Flow / integration assessment
- The gate is correct: splash holds until `splashReady && firstRunChecked &&
  tierChecked`, so it never flashes past an unresolved bootstrap. `SPLASH_MIN_MS`
  is the floor; the checks are the ceiling. The animation effect carries an
  intentional `exhaustive-deps` disable (mount-once). Clean.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Under ~1.5 s.** Every extra second ≈ 8% more abandonment; a 3 s splash loses
  ~12% more first-time users than 1.5 s; Android guidance caps splash animation
  at ~1,000 ms. Supports lowering the 2.5 s floor. [Appy Pie; Android]
- **Brand-focused, minimal, breathing space.** Logo on brand colour, centred,
  not text-heavy. Volyume's single-wordmark + hairline accent + short tagline
  fits. [Mobbin; UX Planet]
- **Subtle animation = premium perceived startup.** An animated mark lowers
  perceived wait. Volyume's subtle sequence is on the right side of this; the
  issue is the idle hold *after* it finishes, not the animation itself. [Justinmind]

---

## STEP C — COMPARISON

### Where Volyume leads
- A confident, minimal, Reduce-Motion-aware brand splash on the locked dark/amber
  system, with no black hand-off seam and a correct bootstrap gate. Cleaner than
  most apps' logo-on-white default. [Mobbin; UX Planet]

### Where Volyume lags
- The 2.5 s forced minimum is longer than the research ceiling and idles after
  the animation completes on fast boots (finding 2).
- Two trivia: a raw font-size literal and a missing image a11y label.

### Critical gaps
- None. One metric-moving timing tweak (founder's call) and two trivia.

---

## STEP D — PROPOSAL

### Summary
One meaningful change (shorten the forced splash minimum, a brand-vs-speed call
for you) and two trivia (token + a11y label). All isolated; routing untouched.

### Specific changes — one by one

**1. Lower `SPLASH_MIN_MS` 2500 → 1600. [Timing — your call] — `:428`**
- What: 1,600 ms covers the ~1.45 s animation plus a brief hold, then lets fast
  boots proceed. Slow boots are unaffected (gated by the checks). Aligns with the
  <~1.5 s guidance and cuts first-launch abandonment.
- Evidence: Appy Pie (8%/sec), Android (≤1 s animation). This is a brand-dwell vs
  speed trade-off, so the exact number is yours; 1600 is my recommendation, 1800
  if you want a touch more dwell.

**2. Use the `fontSize.sm` token for the tagline. [Consistency — trivial] —
`:1110`**
- What: `fontSize: 13` → `fontSize: fontSize.sm`. Same value, token-consistent.

**3. Add `accessibilityLabel="Volyume"` to the hero image. [A11y — trivial] —
`:1071`**

### COPY CHANGES
None. The tagline stays.

### What to keep (with evidence)
- The Reduce-Motion-aware subtle animation, the single amber accent, the brand
  background (no seam), the tagline, and the correct splash gate. [Mobbin;
  Justinmind]

### IMPACT / EFFORT
- **Impact:** Medium for change 1 (first-launch abandonment is a real metric) /
  trivial for 2-3.
- **Effort: Low.** One constant, one token, one attribute. No routing/gate change.

### SOURCES
- Appy Pie — Splash screen best practices (cut to 1.5 s):
  https://www.appypie.com/blog/app-splash-screen-best-practices
- Android Developers — Splash screens:
  https://developer.android.com/develop/ui/views/launch/splash-screen
- Mobbin — Launch screen UI design:
  https://mobbin.com/glossary/launch-screen
- Justinmind — Splash screen designs:
  https://www.justinmind.com/blog/splash-screen-designs/
