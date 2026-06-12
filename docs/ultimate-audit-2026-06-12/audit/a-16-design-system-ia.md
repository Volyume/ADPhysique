# a-16 — Design system, look & feel, navigation IA

Ultimate-app mandate, Phase 1 internal audit. Area 16. Code-verified, no
internet. Branch `claude/admiring-bohr-2kb7pd`. All evidence is file:line.

Scope: token system vs `docs/rules/styling.md`; theme architecture (dark
default + COMP-029 light state); component consistency / variant sprawl; the
5-tab IA for the dual market; navigation depth; cross-tab `getParent` jumps;
accessibility; animation/celebration consistency; empty states; phantom-token
guard coverage.

---

## 1. WHAT — the system as it exists vs as documented

### 1a. The token system is FAR ahead of its own rulebook (doc drift is total)

`docs/rules/styling.md` and the live token file `src/styles/theme.js` are two
different design systems. The rules doc was never updated when the theme was
overhauled (the "design premium audit 2026-05-30" and COMP-027/029 work).
Every load-bearing value disagrees:

| Concept | styling.md says | theme.js actually is | Evidence |
|---|---|---|---|
| Screen bg | `#0D0D0D` | `#0D0D0D` (match) | theme.js:18 |
| Card surface | `#1A1A1A` | `#191917` (surface) | styling.md:11 vs theme.js:19 |
| Input surface | `#262626` | `#2A2A27` (surface2) | styling.md:12 vs theme.js:21 |
| Amber accent | `#F59E0B` | `#F5A623` (primary) | styling.md:17 vs theme.js:31 |
| Amber pressed | `#D97706` | `#E08C0B` (primaryFill) | styling.md:18 vs theme.js:32 |
| Success | `#10B981` | `#4CAF50` | styling.md:25 vs theme.js:51 |
| Warning | (n/a; #FFC107 implied) | `#F0E442` Okabe-Ito yellow | theme.js:53 |
| Error | `#EF4444` | `#F44336` | styling.md:26 vs theme.js:55 |
| Card border | `#2D2D2D` | `#6E6E6E` (border, WCAG 1.4.11) | styling.md:30 vs theme.js:23 |
| Card radius | 12dp | `radius.md` = 10 / `lg` = 14 | styling.md:71 vs theme.js:243-244 |
| Body font | 14sp / 400 | `fontSize.md` = 16 / 400 | styling.md:50 vs theme.js:261,394 |
| "always dark, no light mode" | **rule line 105** | **light theme shipped (COMP-029)** | styling.md:105 vs theme.js:101-136 |

The single most important contradiction: **styling.md line 105 reads "The app
is always dark. There is no light mode. Never add light mode theming."** —
while `theme.js:93-136` ships a fully-specified `lightColors` table, wired to a
user toggle (`SettingsDisplayScreen.js:14`). The governing rule doc forbids the
feature that the code now contains. Whatever the right answer, the rulebook is
actively misleading any agent that reads it (and was the apparent cause of the
phantom-token incident this guard was built for).

The real, current system (theme.js) is genuinely strong and self-documenting:
- **Elevation ladder** with a warm pull: `surface → surfaceElevated → surface2
  → surface3` (theme.js:19-22), replacing shadow-based depth on dark.
- **Okabe-Ito CVD work** (theme.js:44-56, 157-168): `warning` retuned to
  Okabe-Ito yellow `#F0E442` (COMP-027) so a "watch" mark is distinguishable
  from an amber action chip; CVD palette swaps success→sky-blue `#56B4E9`,
  error→reddish-purple `#CC79A7` (theme.js:283-288). Both theme-keyed (`darkCVD`
  / `lightCVD`).
- **State-colour grammar** (`stateColors`, theme.js:459-464): one learned-once
  vocabulary — onTrack / watch / act / neutral — that volume bands and coaching
  surfaces both consume via lazy getters, so CVD/HC swaps propagate for free.
- **Type scale** as semantic roles with getters (`type.*`, theme.js:373-410) so
  the larger-text 1.2× multiplier and tabular-figure `num()` helper track live.
- **Motion tokens** (theme.js:517-537): Material-3 curves, durations
  micro/state/enter/exit/hero, plus a spring; legacy aliases kept.
- **Spacing/radius** scales with named odd-gap escape hatches (`spacing.xs2`,
  `radius.xs`) that explicitly exist to kill hand-rolled `gap:3/5/6`.

Verdict: the *code* token system is best-in-class for an indie app. The
*documented* system is a stale liability. They must be reconciled.

### 1b. Theme architecture — dark default, light state present but reload-gated

`applyAccessibility(prefs)` (theme.js:293-338) is the one boot-time entry,
called from `App.js:127` before any screen StyleSheet builds. It resets to dark
defaults, then layers: base theme (dark/light/system via
`resolveThemeChoice`), then higher-contrast table, then CVD table, then
larger-text multiplier. `resolvedTheme` (theme.js:179) is a live binding the
StatusBar/NavigationContainer chrome follows.

Light is reachable: `SettingsDisplayScreen.js:13-14,84` writes
`accessibility.theme` ∈ {dark, light, system}; store default `'dark'`
(useAppStore.js:1479). **But** the file's own header (theme.js:1-7) documents
that because `StyleSheet.create` copies primitives at creation, a live theme
swap only fully lands on app reload — SettingsScreen prompts a reload. So the
light theme is a "set and restart" feature, not a live toggle. Acceptable, but
it is friction and undocumented to the user beyond the reload prompt.

### 1c. Component primitives exist and are mostly adopted

- **Button** (`Button.js`): one primitive, 4 variants (primary/secondary/
  tertiary/destructive, :24-29), 3 sizes (:31-35). Header comment says it
  replaced "14+ hand-rolled `primaryBtn` blocks". Adopted by 20 screens; 60
  screens still use raw `TouchableOpacity` (much of that legitimate — rows,
  cards — but a hand-rolled-button audit is warranted).
- **AppAlert** (`AppAlert.js`) + **Toast**: themed in-app replacements for the
  native `Alert.alert`. Adoption is excellent — 40 AppAlert sites vs **2**
  residual native `Alert.alert` (both inside AppAlert/Toast's own doc comments;
  effectively zero live native alerts).
- **Headers**: two deliberate primitives, not sprawl — `ScreenHeader` (tab-root,
  title + wordmark) and `BackHeader` (pushed/modal, chevron + title). BackHeader
  header comment notes it "killed ~16 hand-rolled copies".
- **EmptyState** (`EmptyState.js`): a well-designed, shame-free, directional
  empty-state primitive with ghost/compact modes — but used in only **1**
  screen while **43** screens carry inline "No … yet"/empty patterns. This is
  the biggest single adoption gap (see §4).

---

## 2. WHERE — IA map + depth-to-feature

### 2a. The 5-tab structure (RootNavigator.js:445-449)

| Tab id | Label | Stack | Screen count |
|---|---|---|---|
| HomeTab | **Train** | HomeStack (:285) | ~10 |
| PlansTab | **Plans** | PlansStack (:311) | ~9 |
| DiaryTab | **Diary** | DiaryStack (:217) | ~11 |
| ProgressTab | **Progress** | ProgressStack (:334) | ~15 |
| ProfileTab | **You** | ProfileStack (:364) | **~33** |

Icons: home / list / restaurant / stats-chart / person (:435-439). Tab bar
tokenised (`colors.tabBar`, active `primary`, inactive `textMuted`,
label `fontSize.xs`; :423-432) and pads the safe-area inset (:425-426).

The **"You" tab is the catch-all dumping ground** — 33 registered screens vs
~10 in the next-busiest tab. Coaching (WeeklyCheckIn, CoachOutput, Methodology,
CoachHeldHistory, BlockReflection, WellbeingCheck), all settings (12 screens),
nutrition targets, body metrics, goal setup, paywall/subscription, credits,
debug all live here. There is no "Coach" home; the entire deterministic
coaching surface is buried under a person icon.

### 2b. Depth-to-feature (taps from cold app-open, on the daily Train tab)

| Feature | Path | Taps | Notes |
|---|---|---|---|
| Start today's workout | Train → (today card CTA) | 1 | primary loop, correct |
| Active workout / log a set | Train → ActiveWorkout | 1–2 | hero-zoom transition |
| Log food | Train → (getParent → Diary) **or** Diary tab | 1 | cross-tab jump from Home |
| Browse plan library | Plans → PlanLibrary | 2 | |
| Build a mesocycle | Plans → MesocycleBuilder | 2 | |
| View analytics/charts | Progress → Analytics | 1 | tab root |
| Volume heatmap | Progress → VolumeHeatmap | 2 | also reachable from Train stack |
| Weekly check-in | Train → getParent→**You**→WeeklyCheckIn | 2 | cross-tab jump; ED-gated |
| Coach output ("your week") | **You**→CoachOutput | 2 | no direct path from Train (a-07) |
| Log cardio | Diary/Progress/Train → LogCardio (modal) | 2 | registered in **3** stacks |
| Nutrition targets | Train → getParent→**You**→NutritionTargets | 2 | cross-tab jump (Home:987) |
| Training partner | **Progress**→Partner | 2 | only entry point |
| Settings | **You**→Settings → SettingsX | 3 | two-level settings tree |
| Body metrics | Progress→BodyMetrics **or** You→BodyMetrics | 2 | dual-registered |

The daily training loop is genuinely 1–2 taps (good). The **coaching surface is
2 taps but only via a fragile cross-tab `getParent` jump**, with no stable
direct route — the core differentiator is harder to reach than analytics.

### 2c. Cross-tab `getParent` jumps — 11 sites, 8 are navigation (fragile)

Total `getParent` references in non-test src: **11** (3 are benign `addListener
('tabPress')` for scroll-reset; 8 are cross-tab `.navigate()` jumps):

- `HomeScreen.js:127` → ProfileTab (auto gate)
- `HomeScreen.js:987` → ProfileTab/NutritionTargets
- `HomeScreen.js:1046` → ProfileTab/WeeklyCheckIn
- `HomeScreen.js:1436` → ProgressTab/Analytics (focusWeightTrend)
- `WorkoutHistoryScreen.js:117` → HomeTab/ActiveWorkout
- `WorkoutHistoryScreen.js:137` → PlansTab
- `ConsistencyScreen.js:98` → PlansTab/MesocycleBuilder
- `ConsistencyScreen.js:99` → PlansTab/PlanLibrary

These are flagged fragile in a-02 (Home:127,987,1046) and a-07 (the check-in /
CoachOutput jump). The pattern `getParent()?.navigate('ProfileTab',{screen:…})`
silently no-ops if the parent shape changes, and several point a Train-tab user
into the You/Progress tab — a tab-context switch the user did not ask for. Each
is a duplicated string-literal route with no shared helper.

### 2d. Duplicated screen registrations (drift risk)

Same screen registered in multiple stacks (each is a separate nav target with
its own back behaviour):
- `LogCardio` in DiaryStack(:252), HomeStack(:303), ProgressStack(:357) — ×3.
- `BodyMetrics` in ProgressStack(:347) and ProfileStack(:386) — ×2.
- `WorkoutHistory`, `WorkoutSummary`, `VolumeHeatmap`, `CoachReview`,
  `ShareCard`, `ExerciseDetail` each registered in 2–3 stacks.
This is partly necessary (back-stack ergonomics) but multiplies the surface that
must stay visually/behaviourally identical, with no enforcement.

---

## 3. FEEL — visual coherence verdict

### Per tab (dark, the default state)
- **Train**: coherent. ScreenHeader + tokenised cards, hero-zoom into
  ActiveWorkout, tabular numerals on data. The loop *feels* premium.
- **Plans**: coherent; PlanLibrary/Detail/Routine share Card primitives.
- **Diary**: largely coherent; `components/food/*` (13 components) is its own
  sub-system (MacroRings, FoodRow, MealSection) but reads on-brand.
- **Progress**: densest tab, most chart primitives (VolyumeChart, Sparkline,
  SvgBarSparkline, VolumeBars, BodyDiagramHeatmap). Coherent but heaviest.
- **You**: weakest coherence by sheer breadth — 33 screens from legal text to
  debug log to coaching to paywall under one icon; tone whiplashes from
  warm-coaching to dry-settings to legal.

### Dark / light state
Dark is the finished, shipped, audited state. **Light is structurally present
and ratio-asserted (theme.test.js per theme.js:97-99) but flagged as needing
founder on-device brand sign-off** (theme.js:100,116 risk notes on `#8A5200`
amber ink and `#6E6300` warning). It is NOT visually verified on device and
carries at least one concrete defect (§4, Button onPrimary). Treat light as
**beta / unverified**, not shipped.

### Density — newbie (Besa) vs athlete (Eddie)
The dual-market personas appear only in research docs and `MealPlanScreen.js`,
not in the design tokens. There is **no density mode** — one spacing/type scale
serves both a gym newbie and a powerlifter. Progress and the workout logger are
tuned for the athlete (dense tabular data, volume bands, MRV/MAV); a first-time
user meets the same density with no "simple view". The token system *could*
support a density axis (the spacing scale is centralised) but does not today.

---

## 4. GAPS / FRICTION (code-evidenced)

1. **`docs/rules/styling.md` is stale and self-contradicting** (every hex,
   radius, body-size wrong; line 105 forbids the shipped light theme). Highest-
   leverage fix: regenerate the rulebook from `theme.js` or delete the values
   and point at the tokens. Until then every agent reading it is misled.

2. **Primary Button never migrated to `onPrimary` (light-theme contrast bug).**
   `Button.js:25` sets `fg: colors.background`. COMP-029 (theme.js:38-42)
   introduced `onPrimary` precisely so dark ink stays on the amber fill in BOTH
   themes, and claims it replaced "~124 `colors.background` foreground sites".
   The grep shows that migration succeeded everywhere (57 `onPrimary` sites; the
   ONLY surviving `colors.background`-as-foreground in the app is this one).
   In light, `colors.background` = `#FAFAF7` (near-white) → **near-white text on
   the amber fill of the app's single most-used CTA**: a contrast failure the
   ratio tests don't catch because they assert the token table, not Button's
   wiring. One-line fix: `fg: colors.onPrimary`.

3. **`reduceMotion` ignores the OS setting.** Every animation gate reads the
   in-app store flag only — `AnimatedEntrance.js:29`
   `useAppStore(s => s.accessibility?.reduceMotion)`, default false
   (useAppStore.js:1478). No `AccessibilityInfo.isReduceMotionEnabled()` /
   `useReducedMotion()` anywhere in src. A user who set Reduce Motion at the OS
   level but never opened Volyume's display settings still gets PRCelebration
   particles, the RestTimer pulse and spring entrances. This is a genuine WCAG
   2.3.3 / platform-expectation gap.

4. **EmptyState primitive built but unadopted** — 1 screen uses it vs 43 with
   inline empty patterns. The shame-free, directional design that the mandate
   explicitly wants ("welcoming, helpful, supportive") exists and is sitting
   idle. Empty-state quality is therefore inconsistent screen-to-screen.

5. **Small Button violates the 48dp touch-target rule.** `Button.js` sets no
   `minHeight`/`hitSlop`; the `sm` size is `pv: spacing.sm` (8) + `fontSize.sm`
   (13) ≈ 29–37dp tall — below the styling.md:90-92 "every interactive element
   min 48dp, no exceptions, sweaty hands" rule. The token system has the right
   value documented; the central primitive doesn't honour it.

Secondary friction:
- **You-tab overload** (33 screens, no Coach home; §2a) — IA, not styling.
- **Coaching reachable only via fragile cross-tab `getParent` jumps** (§2c,
  a-07): the core differentiator has no stable direct route.
- **No density / "simple" mode** for the new gym-newbie half of the userbase
  (§3).
- **Light theme unverified on device** and brand-ink pending founder sign-off
  (theme.js:100,116).
- **Phantom-token guard is shallow**: `themeTokens.guard.test.js` is a static
  regex over `colors.|fontWeight.|fontSize.|spacing.|radius.` only. It will NOT
  catch computed access (`colors[key]`), aliased imports, `type.*`/`motion.*`/
  `stateColors.*`/`shadow.*` typos, or a missing token reached via a getter. It
  fixed the exact `colors.text` incident it was built for but is not a general
  "no phantom token" guarantee.

---

## 5. SURFACE INVENTORY (counts)

Tokens (theme.js):
- Colour tokens (dark base): **~45** (`baseColors` 18-89, incl. 3 surfaces +
  3 borders, 5 accent, 6 semantic + bg variants, 4 text, tab/input, 3 trophy,
  2 OAuth brand-locked, 2 chart, scrim).
- Light counterpart tokens: **~34** (`lightColors` 101-136).
- Accessibility modifier tables: 4 (`darkHC`, `lightHC`, `darkCVD`, `lightCVD`).
- Spacing steps: **10**; radius steps: **6**; fontSize steps: **10**;
  fontWeight: 6; lineHeight: 4; letterSpacing: 5; iconSize: 4.
- Semantic type roles: **9** (`type.*`) + `num()` tabular helper.
- Motion: 5 durations + 3 easings + 1 spring (+ legacy aliases).
- Colour-grammar tables: `stateColors` (4), `volumeColors` (4),
  `volumeStatusColors` (6). Helpers: `withAlpha`, `circle`, `volumeStatusColor`.

Components / structure:
- Top-level components: **54** (`src/components/*.js`) + 13 food + 2 auth = ~69.
- Screens: **~76** screen files (83 incl. tests/helpers).
- `StyleSheet.create` blocks in non-test src: **134**.

Component variant / adoption counts:
- Button: 1 primitive, **4** variants × **3** sizes; adopted by 20 screens
  (60 screens still touch raw TouchableOpacity).
- Cards: 1 core `Card`/`PressableCard` + **9** purpose-built card components
  (BlockProgressCard, ExerciseCard, WeightTrendCard, FatigueTrendCard, etc.) +
  `GradientCard` (despite the name, flat — no gradient, comment at GradientCard.js:5).
- Sheets/menus: **6** (BottomSheet, CancelReasonSheet, FeedbackSheet, PeekMenu,
  PostLapseSheet, ExercisePickerModal) — BottomSheet is the base; the rest are
  specialised, not redundant.
- Chips: `Chip` used in **33** places (most-adopted control); SegmentedControl 4,
  Dropdown 3, Toggle 20, Stepper 0 (unused primitive).
- Headers: **2** intentional primitives (ScreenHeader, BackHeader).
- Alerts: AppAlert **40** sites vs **2** native (both in doc comments) ≈ fully
  migrated.
- EmptyState: 1 primitive, **1** adoption vs **43** inline empties.

Navigation:
- **5** tabs; **6** stacks (Home/Plans/Diary/Progress/Profile + onboarding
  stacks Welcome/FirstRun/Article9/ProOnboarding).
- Cross-tab `getParent` navigation jumps: **8** (+3 benign tabPress listeners).
- Multiply-registered screens: LogCardio ×3, BodyMetrics ×2, plus
  WorkoutHistory/Summary/VolumeHeatmap/CoachReview/ShareCard/ExerciseDetail ×2–3.

Accessibility:
- `accessibilityLabel`: 121 files; `accessibilityRole`: 109 files. 16 screens
  carry no accessibilityLabel (mostly legal/settings text screens).
- reduceMotion: store-flag only, **no OS-setting read** (gap #3).
- Phantom-token guard: 1 static-regex test over 5 token families (gap, §4).

---

### Headline for synthesis
The *token system* is best-in-class and self-documenting; the *rulebook that
governs it is stale and contradicts the shipped code* (light theme). The IA's
daily loop is 1–2 taps, but the **coaching differentiator is buried in an
overloaded "You" tab reachable only via fragile `getParent` jumps**, and the
dual-market mandate has no density answer. Concrete defects: Button's missing
`onPrimary` migration (light-theme CTA contrast), `reduceMotion` ignoring the
OS, a shame-free EmptyState built but unadopted (1/44), and sub-48dp small
buttons.
