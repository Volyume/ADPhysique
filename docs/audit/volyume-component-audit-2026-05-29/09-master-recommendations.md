# 09 · Master recommendations (Phase 5)

A single prioritised roadmap consolidating 01–08. Systemic fixes first
(highest leverage, each lifts many components), then component upgrades by
priority. Every item cites the component, the change, the best-in-class
reference that informed it, and dependencies.

Sequencing principle: the systemic fixes are *enablers*. Doing S1–S8 first
means the Critical/High component work becomes "adopt the new primitive on
this screen" rather than bespoke effort. Don't start the per-component
migration before the primitive it depends on exists.

A reminder on guardrails (CLAUDE.md): no em dashes / AI-tell copy in any
shipped string, British English, additive changes preferred, tests
alongside changes to runtime-critical paths, and `main` is the working
branch. None of the below proposes a new closed-test release; all of it is
build-out on the branch.

---

## Progress log (implementation)

Tracked here as the roadmap is worked. Status as of 2026-05-29:

DONE (shipped to main, tested):
- S1 scrim token + withAlpha helper, rolled out across ~21 modal/sheet/menu
  backdrops; GradientCard / BlockProgressCard / EntryRow alpha + off-token
  colours moved onto withAlpha / tokens.
- S2 lineHeight + letterSpacing scales + type role map (getters that track
  the larger-text swap); tab-bar labels + splash background tokenised.
- S3 Card primitive (base surface + accent border via withAlpha + optional
  PressableCard press).
- S4 Button primitive (variant/size/loading/disabled/icon/trailingIcon/
  testID), adopted on PlanDetail, Paywall, ProSetupComplete, Subscription,
  FirstRun, CascadeGate, ScanLabel, Login, ProUpgrade, BuildWorkout,
  RoutineDetail, WellbeingCheck, AddCustomFood. Remaining inline-button
  sites are inside the large stateful screens (Home 2331, ProOnboarding
  1331, ManualBuilder 1269, WeeklyCheckIn, BodyMetrics, ProGoalSetup,
  ExerciseLibrary, VolumeHeatmap, Plans/Mesocycle secondary CTAs).
- H2 HeldDecisionCard support-link no longer dead-ends (safety).
- H4 (partial) chart a11y: VolumeBars, BlockProgressCard, FatigueTrendCard,
  Sparkline, and BodyDiagramHeatmap regions now expose accessibility
  labels/roles. MacroRings Skia fallback + ring a11y still outstanding.
- H5 skeleton loading on PlanDetail, Plans, PlanLibrary, Mesocycle (the
  plan surfaces are done).
- DiaryScreen FABs moved to shadow tokens.

NOT STARTED (need runtime verification, deferred to a verifiable session):
- C1 ActiveWorkout virtualise + decompose (core loop, highest risk).
- S5 Field / SearchBar / Chip / Stepper.
- S6 BottomSheet chrome extraction.
- S7 chart-kit convergence (retire gifted-charts + victory-native).
- S8 Toast-as-error sweep (broad; touches many write paths).
- H1 header-system unification.
- H8 CoachOutput decomposition.
- Card primitive adoption across the 83 inline card blocks (the primitive
  exists; migration is incremental and low-risk but high-volume).
- Button rollout into the large stateful screens listed above (one or two
  CTAs each, buried in dense logic; lower value-per-edit, do opportunistically).

---

## Systemic fixes (do these first, highest leverage)

### S1, Scrim/overlay token + `withAlpha()` helper
**Change:** Add `colors.scrim` (one backdrop value) and a `withAlpha(token,
a)` helper (or pre-baked `tint.*` tokens) that handles hex *and* rgba.
Replace 9+ hardcoded backdrops and all `+ '40'/'55'/'15'/'22'` concats.
**Why/ref:** Material/Apple scrim token. **Fixes:** 01, 03, 05 F2.
**Deps:** none. **Effort:** S. **Priority:** Critical.

### S2, Type system: lineHeight + letterSpacing + `type` roles
**Change:** Add `lineHeight` and `letterSpacing` token sets and a `type`
role map (display/h1/body/label/caption bundling size+weight+lineHeight+
tracking). Migrate screens to spread `...type.body`.
**Why/ref:** USWDS typesetting tokens; Linear/Stripe type ramps.
**Fixes:** 01, 08 Axis 3. **Deps:** none. **Effort:** M (token S, migration
incremental). **Priority:** High.

### S3, `<Card>` primitive (+ fold in GradientCard)
**Change:** One card molecule (shell + optional PressableCard press), props
tone/elevation/padding/borderless. Alias `GradientCard`→`<Card tone>`.
Decide borders-vs-surface-steps once, here.
**Why/ref:** Stripe components; Airbnb content-first cards.
**Fixes:** 03 L0, 08 Axis 1. **Deps:** S1 (tints). **Effort:** M.
**Priority:** High.

### S4, `<Button>` primitive
**Change:** `variant/size/loading/disabled/icon`, built on PressableCard;
one disabled + one loading (inline spinner) treatment. Migrate 14+ inline
CTAs.
**Why/ref:** Stripe/Material button; "one CTA behaviour everywhere".
**Fixes:** 04 I0, 08 Axes 2 & 5. **Deps:** none (PressableCard exists).
**Effort:** M. **Priority:** Critical.

### S5, `<Field>` / `<SearchBar>` / `<Chip>` / `<Stepper>`
**Change:** Shared input set with one focus/error treatment, ≥16px input
font, `accessibilityState.invalid`; validate on blur + focus-first-error.
Extract SetEntry's stepper. Migrate the 7 search bars + setup chips first.
**Why/ref:** UX-Collective field states; accessible-validation guides.
**Fixes:** 04 I1 + chips + stepper, 08 Axes 2/5. **Deps:** S1.
**Effort:** M–L. **Priority:** High.

### S6, `<BottomSheet>` chrome + scrim
**Change:** One sheet (scrim, slide via `motion` tokens, drag handle,
swipe-dismiss, reduceMotion, `accessibilityViewIsModal`). Refactor the 6
bespoke sheets onto it.
**Why/ref:** iOS sheet conventions. **Fixes:** 05 F2, 08 Axis 1/6.
**Deps:** S1. **Effort:** M. **Priority:** High.

### S7, Shared chart kit (one library) + chart a11y
**Change:** Converge on custom `react-native-svg` + a thin
`<BarChart>/<LineChart>/<Ring>` kit with one axis/grid/colour treatment and
`accessibilityLabel` baked in; keep Skia only behind a fallback where it
wins. Retire gifted-charts + victory-native over time.
**Why/ref:** Whoop single data language; Robinhood stripped charts.
**Fixes:** 06 D0+D1, 07 progress domain, 08 Axis 1. **Deps:** S1.
**Effort:** L. **Priority:** High.

### S8, Feedback rules: Toast-as-error + skeleton-as-loading
**Change:** House rules, routine recoverable failures → Toast (with
retry/undo); `Alert` only for destructive confirms; kill every
`.catch(()=>{})` on a user action. Any screen that fetches on focus shows a
layout-mirroring Skeleton.
**Why/ref:** Toast/error-state best practice; skeleton perceived-perf.
**Fixes:** 05 F0+F1, 08 Axes 5/6. **Deps:** Toast + Skeleton exist.
**Effort:** M (sweep). **Priority:** High.

---

## Component upgrades by priority

### Critical
| # | Component / screen | Change | Ref | Deps |
| --- | --- | --- | --- | --- |
| C1 | **ActiveWorkoutScreen** (`map` carousel, 2616 lines) | Virtualise the exercise carousel (FlatList/FlashList); decompose into sub-components; mid-session errors → Toast | Hevy low-friction logging | C1 list = none; toast = S8 |
| C2 | **Button rollout** (S4) on primary CTAs | Replace inline `primaryBtn` across 14+ screens | Stripe button | S4 |
| C3 | **Scrim token rollout** (S1) on all sheets/modals | Replace 9+ hardcoded backdrops | scrim token | S1 |

### High
| # | Component / screen | Change | Ref | Deps |
| --- | --- | --- | --- | --- |
| H1 | **Unify header system** (RN stack header vs custom) | One header; sync badge visible consistently (incl. ScreenHeader roots) | iOS/Linear headers |, |
| H2 | **HeldDecisionCard support link** | Toast fallback on `openURL` fail (safety path) | health-app safety UX | S8 |
| H3 | **Chart convergence** (S7) on Analytics/ExerciseDetail/PRWall/Mesocycle | Move to one kit; add a11y | Whoop | S7 |
| H4 | **BodyDiagramHeatmap + MacroRings a11y** (+ Skia fallback) | Region roles/labels; ring summary; SVG fallback | Strava muscle map / Apple rings |, |
| H5 | **Skeletons** on Plans/PlanLibrary/PlanDetail/Mesocycle | Layout-mirroring skeletons | LinkedIn skeleton | S8 |
| H6 | **Search bars → `<SearchBar>`** (S5) | Unify 7 search bars | Linear search | S5 |
| H7 | **Press model → PressableCard everywhere** | Replace ad-hoc activeOpacity / raw Touchable | iOS press | S3/S4 |
| H8 | **CoachOutputScreen decomposition** (2062) + skeleton | Split + skeleton-load | MacroFactor cards | S8 |
| H9 | **`<Row>`/`<Grid>` molecules** + standard row heights | Adopt in settings/meals/recipes/plan lists | Stripe rows | S3 |
| H10 | **Tab bar + splash tokens** | Tokenise tab label/icon (larger-text), splash bg → `#0D0D0D` |, | S2 |

### Medium
| # | Component / screen | Change | Ref |
| --- | --- | --- | --- |
| M1 | EmptyState/EmptyDiary adoption | One empty-state component everywhere; audit copy vs one-line rule | Duolingo empties |
| M2 | Hero-zoom transition | Apply to other card→detail drills or pull back; durations → `motion` tokens | Linear motion |
| M3 | tabPress reset behaviour | Extract one helper; reset only on re-tap focused tab (or document always-reset) | iOS tab convention |
| M4 | PeekMenu | Scrim + haptic + show source title | iOS context menu |
| M5 | Chips/SegmentedControl (S5) on setup flows | One selected treatment across goal/phase/protein/day-hour | Material chips |
| M6 | DiaryScreen | Token FAB shadow; remove dynamic `require`; toast on log fails | MacroFactor diary |
| M7 | FoodDetailSheet macro preview | `accessibilityLiveRegion` | MF food detail |
| M8 | PlateCalculator a11y + close target | Labels + 44px | Strong plate calc |
| M9 | Single-source paywall pricing/CTA | One copy source across ProUpgrade/Paywall/ProGate/Differential | Robinhood/Monzo |
| M10 | FoodRow long-press feedback | Visual confirm on preference cycle |, |
| M11 | AnalyticsScreen layout review | Importance-not-symmetry; check 2×2/3-card patterns | CLAUDE.md rules |
| M12 | Motion tokens | Migrate inline durations to `motion`; define haptic contract | Stripe motion |
| M13 | Elevation story | Commit to surface-steps or shadow-per-role on dark | Material 3 |

### Low
| # | Component | Change |
| --- | --- | --- |
| L1 | RestTimer countdown font | Token it |
| L2 | Toast z-index | Token it |
| L3 | Skeleton fallback colour | → `surface2` |
| L4 | Illustrations | Shared stroke width + a11y labels |
| L5 | BrandMark | Named header/splash sizes (bake optical offset) |
| L6 | SourceChip → `<Badge>` | Extract; adopt in PRWall/PlanDetail/ProBadge |
| L7 | Spacing/radius literals | Sweep to tokens; document radius-tier→component map |
| L8 | InfoTooltip | Anchored popover option; trigger a11y label |

### Engineering (flagged, outside the design remit)
- **E1**, Extract RootNavigator's ~530-line bootstrap/auth state machine
  into `lib/bootstrap.js` / `lib/authFlow.js` (runtime-critical per Rule 5;
  add tests alongside).
- **E2**, Re-evaluate `lazy={false}` tab mounting vs per-tab skeleton
  (cold-start/memory on budget Android).

---

## Suggested execution order

1. **Token batch (S1, S2):** scrim + alpha helper + type roles. Small,
   unblocks everything. Ship with the tab-bar/splash token fix (H10).
2. **Primitive batch (S3, S4, S6):** `<Card>`, `<Button>`, `<BottomSheet>`.
   Then C2/C3 rollout on the top-traffic screens (Home, Diary, Plans,
   ActiveWorkout).
3. **Correctness batch:** C1 (virtualise + decompose ActiveWorkout), H2
   (safety fix), S8 feedback sweep.
4. **Input batch (S5):** Field/SearchBar/Chip/Stepper, then H6/M5.
5. **Chart batch (S7):** one kit + a11y, then H3/H4.
6. **Polish:** H1/H5/H7/H8/H9 + the Medium/Low lists.

Every batch is independently shippable and additive. None touches the
brand, the copy voice, the locked flows, or the schema. The result moves
Volyume from "excellent components, assembled" to "best-in-class system,
authored", which is exactly the "one lifter built this and polished it
until it shipped" standard the brand asks for.
