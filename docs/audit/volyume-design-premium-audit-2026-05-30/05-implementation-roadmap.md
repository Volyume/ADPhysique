# 05 — Prioritised implementation roadmap

Consolidates every required change into a sequenced plan, grouped
Foundation → High-visibility → Polish. Each item carries: the change, the
file(s), the standard it implements, an **effort** tag (S ≤½ day · M ~1-2
days · L ~3-5 days), and an **impact** tag (perceived-quality lift: ●○○ low
· ●●○ medium · ●●● high). React Native considerations are flagged inline.

**This pass is still docs-only.** Per your "plan, then build foundation"
choice: once you approve this roadmap, I implement the **Foundation tier**
in code as a separate signed-off follow-on; High-visibility and Polish
follow in later passes.

Confirmed decisions baked in: keep amber · system font (no custom font) ·
warm + widen surface ladder · deepen large amber fills · body 15→16 ·
tabular numerals on all data · hero-only number animation · one press feel ·
**full Reanimated migration** · skeletons everywhere data loads · CI lint
guards · rewrite the stale DESIGN_SYSTEM.md to amber · exhaustive scope.

---

## TIER 1 — FOUNDATION (do first; improves everything downstream)

These are token + primitive changes. Once shipped, screen-level work
inherits them. Order within the tier matters.

### F1 — Extend the token file `src/styles/theme.js` — **S · ●●●**
Single file, no behaviour change, unlocks everything else. Add:

```
// surfaces (widened + faintly warm; keeps #0D0D0D base)
surface:          '#191917'   // was #1A1A1A
surfaceElevated:  '#222220'   // NEW — nested cards / raised tier
surface2:         '#2A2A27'   // was #242424
surface3:         '#343431'   // was #2E2E2E
borderSubtle:     '#2E2E2C'   // NEW — hairline dividers inside a card

// accent
primary:          '#F5A623'   // text/icon/small accents (was #F59E0B)
primaryFill:      '#E08C0B'   // NEW — large filled buttons (calmer)
primaryBg:        'rgba(245,166,35,0.12)'

// spacing additions
hair: 1            // the marginTop:1 optical nudge (27+ hand-rolled)
xs2: 6             // dense data-row gaps (the gap:3/5/6 cluster)

// radius additions
xs: 4              // chart dots, tiny chips
circle: (size) => size/2   // helper so avatars/FABs stop hand-computing

// motion (replace under-used token with researched curves/durations)
micro: 120, state: 200, enter: 320, exit: 220, hero: 440
easeStandard:   'cubic-bezier(0.2,0,0,1)'
easeDecelerate: 'cubic-bezier(0.05,0.7,0.1,1)'
easeAccelerate: 'cubic-bezier(0.3,0,0.8,0.15)'
spring: { stiffness: 150, damping: 18, mass: 1 }   // ≈ iOS 0.8 damping
```
RN note: surface/accent hex changes are safe (StyleSheet copies primitives
at create-time; `applyAccessibility` already re-applies on boot). The
`circle`/motion-curve helpers are functions, used at call sites.
Implements: §3.1, §4, §5, §6.1. Keep all WCAG-tuned values
(`border`, text ladder) unchanged.

### F2 — Tune the `type` roles + add the numeral helper — **S · ●●●**
In `theme.js`: body 15→16 (and `bodyStrong`), confirm display/heading
negative tracking, add `type.num(role)` returning
`{ ...type[role], fontVariant: ['tabular-nums'] }`. No screens change yet.
Implements: §2.2. RN note: `fontVariant:['tabular-nums']` is supported on
both platforms with the system font.

### F3 — Adopt `type` roles + tabular numerals across all screens — **L · ●●●**
The biggest single perceived-quality lift, and the largest mechanical job
(0/61 screens today). Replace `{ fontSize, fontWeight }` pairs with `type.*`;
wrap every data numeral in `type.num(...)` (U1/U2). Sequence by traffic
(Tier-2 order below) but it's Foundation because the *system* must be the
one used. Also sweeps the 11 raw `fontWeight` literals (CoachReview ×8) and
68 raw `fontSize` literals. Implements: §2.2, §2.3.
RN note: purely stylesheet edits; no runtime risk. Do it screen-by-screen
behind the mount-sweep test so any regression surfaces immediately.

### F4 — Consolidate `Card`/`GradientCard`; add `surfaceElevated` support — **S · ●●○**
Merge `GradientCard` into `Card` with a `hero` intent (they're identical
per the component audit); add an `elevated` prop using `surfaceElevated`.
Update the handful of `GradientCard` call sites. Files: `src/components/
Card.js`, `GradientCard.js`. Implements: §3.2, §5.

### F5 — Tokenise existing shadows + move stray hex to tokens — **S · ●●○**
Replace the 9 inline shadow blocks with `shadow.*` (Toast, Welcome,
ProUpgrade, ProOnboarding, ProSetupComplete); move the real stray hex/rgba
to `withAlpha(colors.*)`/`scrim`/`borderSubtle` (ScanLabel 6, Home 4,
ScanBarcode 2, NotificationSettings 2, ExerciseDetail chart-fill, YearOfLifts
divider, ProUpgrade `#FFFFFF`). ShareCard's offline-canvas hex exempted but
derived from theme constants at the top of the file. Implements: §3, §5.

### F6 — CI lint guards — **S · ●●○**
Add eslint rules flagging hardcoded hex/rgba and raw `fontSize:`/`fontWeight:`
literals in `src/screens` + `src/components`, whitelisting
`ShareCardScreen` and `theme.js`. Stops the drift the audit found from
returning. File: `eslint.config.js`. Implements: §11 / governance.
RN note: lint-only; do this *after* F3/F5 clean the violations or the build
goes red.

### F7 — Rewrite `docs/DESIGN_SYSTEM.md` to the confirmed amber standard — **S · ●○○**
End the two-sources-of-truth conflict (it currently says blue `#2979FF`).
Fold in these standards. Doc-only. Implements: §0.

---

## TIER 2 — HIGH VISIBILITY (the screens seen every session)

Each inherits F1-F5. Listed in fix order by traffic.

### V1 — ActiveWorkoutScreen — **L · ●●●**
The signature surface. Timer/next-set → `type.display` + tabular; **COMPLETE
SET** → `Button` primary, deepest press (0.96), confirm `setLogged()` haptic;
set rows → `Card`/`PressableCard`; 7 hex → tokens; entry already
`heroZoomTransition`. (The optional blur "moment" is Polish, P-blur.)
File: `src/screens/ActiveWorkoutScreen.js`. Implements: §10, §8, §2.

### V2 — HomeScreen — **M · ●●●**
Already the best-adopted (9 `PressableCard`, 5 skeletons) — finish it:
U1/U2 on next-session + volume figures; two banner rgba → tokens; first
block rises on focus (`motion.enter`). File: `src/screens/HomeScreen.js`.

### V3 — DiaryScreen — **M · ●●●**
Macro totals/kcal → `type.num` (numbers screen); FAB circle →
`radius.circle`; already the correct `shadow.lg` reference. File:
`src/screens/DiaryScreen.js`.

### V4 — AnalyticsScreen + PRWallScreen + AthleteHubScreen — **L · ●●●**
The data screens — highest tabular-numeral payoff. Analytics: 6 fontSize +
1 fontWeight + 6 chart-dot radii (`radius.xs`); PRWall: 3 fontSize, almost
all numbers → tabular; AthleteHub: 6 fontSize, recovery/readiness/quick-stat
numerals → `type.num`. Files: those three screens. Implements: §2.2.

### V5 — Plans + PlanDetail + ExerciseDetail + LiftProgress — **M · ●●○**
Plans/PlanDetail already skeleton-rich; mostly U1/U2/U4. ExerciseDetail
spinner → `SkeletonCard`, chart numerals tabular. LiftProgress rows →
`PressableCard`. Implements: §2, §9.1.

### V6 — Diary→food: FoodSearch spinners → skeletons — **M · ●●○**
The 4 `ActivityIndicator` → `SkeletonRow`; per-food macros tabular. Plus the
other spinner screens roll in here (FoodInsights, MyRecipes). Implements:
§9.1.

### V7 — SettingsScreen + YouScreen rows → one press feel — **S · ●●○**
List-row screens: route rows through `PressableCard` (U3) for the unified
press. High payoff because settings/profile are touched often and currently
feel inconsistent. Implements: §8.1.

---

## TIER 3 — POLISH (separates good from elite)

### P1 — Reanimated migration, everyday motion — **L · ●●●**
Re-platform onto Reanimated v3 (installed, unused). Build: unified press
spring (`PressableCard` → `withSpring`, same 0.97 feel), screen-content
entrance (`motion.enter`, translateY 8-12 once on focus), staggered list
entrance (~30ms/item, first ~8) on workout-history / exercise-library /
plans via Reanimated layout animations. Files: `PressableCard.js` +
navigation + the three list screens. Implements: §6.2.
RN note: worklets on the UI thread; keep reduce-motion gates.

### P2 — Full migration of existing RN Animated peaks — **L · ●○○ (high risk)**
Your "migrate everything" choice. Port the hand-tuned RN Animated surfaces
(PRCelebration 40-particle confetti, splash, WorkoutSummary stagger,
BottomSheet/Toast/PeekMenu slides, RestTimer bar, Skeleton pulse) to
Reanimated. **Flagged risk:** these already work and several are lavish/
fragile (the confetti especially). Impact on *perceived* quality is low (they
look the same; the win is one engine + tokenised timing). **Recommendation:
sequence this last, snapshot each animation's behaviour first, migrate one
component per commit behind the mount sweep, and treat PRCelebration as the
final, most-careful step.** Implements: §6 (engine consistency).

### P3 — Hero number transitions — **M · ●●○**
Count/cross-fade on the few hero numbers when they change (volume updated,
weight logged) — never every figure. Reanimated `withTiming` on a derived
display value. Files: ActiveWorkout, Home, AthleteHub hero numbers.
Implements: §6.2 (the restrained Robinhood signal).

### P4 — Skeleton coverage finish + branded loading — **M · ●●○**
The remaining `ActivityIndicator`-only screens (Import, Scan ×2,
ProOnboarding, Onboarding, WeeklyCheckIn consolidation) → content-shaped
skeletons or a branded loading state. Implements: §9.1.

### P5 — Widen haptics reach — **S · ●●○**
Wire `haptics.selection()` into everyday toggles/segments/pickers that have
none (Settings switches, segmented controls, chip groups); `haptics.press()`
on primary buttons app-wide. No new haptics — reach only. Keep the
no-haptic-on-frequent-nav rule. Implements: §8.2.

### P6 — iconography + radius/spacing cleanup — **M · ●○○**
Enforce `iconSize` token (Chip's 14, scattered 18/40 → tokens); snap the 91
raw `borderRadius` to `radius.*`/`circle`/`xs`; the `marginTop:1`/`gap:3-6`
clusters → `spacing.hair`/`xs2`. Mechanical, low perceived impact alone but
removes the last drift. Implements: §4, §5, §7.

### P7 — The one blur "moment" (optional) — **M · ●●○**
Single backdrop-blur behind the active-workout bottom controls. **RN note:**
implement via Skia `backdrop-filter` (more controllable than expo-blur),
**must degrade to a solid translucent fill on Android** (can't blur behind a
Modal; only Android 12+ helps). If the Android cost isn't worth it on test,
ship the solid-fill everywhere and drop the blur. Implements: §5.

### P8 — Crash screen + WelcomeScreen first-impression — **S · ●●○**
Crash screen (`App.js`) → `background`, `type` roles, brand mark, one
`Button`, collapsible monospace stack. Welcome → instrument identity (§10),
entrance retimed to tokens. Implements: §9.3, §10.

---

## Suggested sequencing

1. **Foundation F1→F2→F4→F3** (tokens, then type-system, then adopt), with
   **F5/F6/F7** alongside. This is the approved build-now tier.
2. **High-visibility V1→V7** in traffic order.
3. **Polish P1→P8**, with **P2 (full Animated migration) sequenced last and
   most carefully** given its risk-for-low-visible-reward profile.

Every code change runs behind the existing mount-sweep + lint, full suite
green before each push, per the project's engineering rules.

## Honest call-out on two of your choices

- **Full Reanimated migration (P2):** I'd have scoped this to "new motion on
  Reanimated, leave the working peaks". You chose to migrate everything; I'll
  do it, but it's the one item where effort and regression risk exceed the
  visible payoff, so it's sequenced last and isolated per-commit. Easy to
  defer or drop without affecting anything above it.
- **Exhaustive 61-screen audit:** done in `04`; the long tail (policy,
  debug, gated screens) mostly needs only U1, so those rows are short by
  design rather than padded.
