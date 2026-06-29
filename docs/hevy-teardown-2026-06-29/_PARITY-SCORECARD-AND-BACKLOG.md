# Volyume vs Hevy — honest parity scorecard & prioritised backlog (2026-06-29, deep re-dive)

Built from a 10-agent re-dive of the decompiled Hevy APK
(`scratchpad/base_decoded`, `scratchpad/corpus`) against Volyume's CURRENT code.
Work from this file's SOURCE pointers, not its prose. The flagship build target
is **editable/deletable logged sets**.

## Honest verdict
"At par or better in EVERY area" is **not yet true**. Volyume is **above Hevy**
on accessibility, design system, dark mode, coaching transparency, ED-safety,
privacy, sync correctness, the swap engine, progression intelligence, back-stack
hygiene, quick-actions, empty states, chart-scrub polish. **At par** on
onboarding (free path), routines flow, settings flow, engine maturity. **Below**
on the items below.

## NON-GATED build backlog (no new dependency, no engine/billing/ED-safety breach)

### Tier 1 — flagship & core flow
1. **Editable / deletable logged sets in-session** (workout-logging). `LoggedSetRow`
   is render-only; no `deleteWorkoutSet`/value-`updateWorkoutSet` in `database.js`.
   A mistyped set is stuck until History. Tap a logged row → edit/delete sheet;
   add DB fns + a synced soft-delete tombstone; recompute session loggedSets /
   targets / PR / tonnage. `src/screens/ActiveWorkoutScreen.js` (`LoggedSetRow`
   ~2040), `src/lib/database.js` (new fns), sync registry. **L**
2. **Exercise picker: muscle/equipment filter chips + recents row + wire the dead
   `matchesEquipmentFilter`** (exercise-library). 448 rows by text search only;
   `BuildWorkoutScreen.js:155` caps at 50. `src/components/ExercisePickerModal.js`,
   `src/lib/exerciseDisplay.js:42` (dead fn). **M**
3. **Home start-action above the fold + first-class "Start empty workout" CTA**
   (navigation). `src/screens/HomeScreen.js:1177` hero vs `:964` greeting; `:852`
   `startBlankSession`. **S**
4. **5-lens metric switcher on the ExerciseDetail chart** (progress). Reuses the
   already-built `buildExerciseMetricSeries` (now in `lib/liftProgress.js`).
   `src/screens/ExerciseDetailScreen.js:79,503-526`. **M**

### Tier 2 — quick wins (Small, safe)
5. **Widget no-shame copy fix** — `widgets.js:61` "week streak" + `app.json:230`
   "your streak" violate the "weeks running, never streak" rule. **S**
6. **Low-disk pre-session guard** — `getFreeDiskStorageAsync` before large writes;
   the encrypted SQLite store is the source of truth (strategic/sync). **S**
7. **PRCelebration honours reduce-motion + named haptics** — derive `subdued` from
   `accessibility.reduceMotion`. `src/components/PRCelebration.js`. **S**
8. **Splash min-timer gated to first-run only** — returning users eat 1.6s every
   cold start. `src/navigation/RootNavigator.js:585,625`. **S**
9. **Set-row live-PR badge** — PR pops but leaves no mark. `ActiveWorkoutScreen.js:970`. **S**
10. **Best-set-volume + session records** — cheap new record kinds.
    `src/lib/algorithms.js:538-579`. **S**
11. **Custom-exercise create: store SFR null, not a fake 3** (data integrity) +
    secondary muscles + type axis. `src/components/ExercisePickerModal.js:57-69`. **S–M**
12. **Numbered instruction steps + secondary-muscle chips** in exercise detail.
    `src/screens/ExerciseDetailScreen.js:334,672`. **S**
13. **Per-exercise weight increment editor** (`incrementKg` flows, no UI). KG-safe.
    `BuildWorkoutScreen.js`. **S**
14. **Finish the shimmer sweep** (14 `ActivityIndicator` sites; `Skeleton` exists). **S**
15. **Streak-milestone / perfect-month notification category** — state already
    computed in `streakState.js`, never surfaces. Calm, ED-suppressed. **S**
16. **Widget tap-to-action** (QuickAccess equivalent) — add `clickAction`
    deep-link. `src/widgets/widgets.js`. **S**

### Tier 3 — medium, on-strategy
17. **Reorder routines/days within a plan** (no order column today). `database.js`. **M**
18. **"Update routine after a logged session"** loop (Hevy's one real flow edge).
    `src/screens/WorkoutSummaryScreen.js:634`. **M**
19. **Contextual upgrade prompt** when a free user opens a Pro family →
    existing paywall with a `trigger` tag (NO billing change). `src/components/ProGate.js`. **M**
20. **Reps-only / duration PR coverage** (most-reps first). `algorithms.js:543`. **M**
21. **New share archetypes** (muscle split / calendar) + light/transparent card
    theme. `src/lib/shareCard/drawShareCard.js`. **M**
22. **Per-object "not yet backed up · retry" affordance** from the sync queue. **M**
23. **Tabbed ExerciseDetail** (About / How-to / History / Records). **M**
24. **Animate the muscle map with Skia** (already shipped) — replicate Hevy's Rive
    effect without the dep. `src/components/BodyDiagramHeatmap.js`. **L**

## GATED — needs a founder decision (new dependency, billing, engine, or strategy)
- **Drag-to-reorder** (exercises/routines/folders/in-session) — needs
  `react-native-draggable-flatlist` (gesture-handler/reanimated already present)
  OR a hand-rolled reanimated impl. On the CLAUDE.md deferred list.
- **Chart-image export** — needs `react-native-view-shot`.
- **Watch app (Apple Watch + Wear OS)** — biggest functional gap; conflicts with
  Expo-managed / never-eject; needs native targets.
- **Live in-workout heart rate** — Pro-gated; verify health libs expose an observer.
- **Whole-workout Live Activity (iOS)** — native Swift; CLAUDE.md item 14.
- **Referral / affiliate loop** — new SDK (Branch) + acquisition surface.
- **Defer-paywall to after first value** — reverses the 2026-06-26 decision + billing.
- **Lifetime SKU / promo countdown surface** — billing change.
- **Sex-aware strength standards** — engine/data sourcing (stay own-standing, never
  percentile-vs-others per ED-safety).
- **Progress photos** — PII / EU-residency / ED-safety.
- **RPE per-set entry, warm-up calculator, include-warmups-in-volume toggle** —
  deterministic-coaching boundary.
- **Year-in-Review deck** — large feature (buildable with no new deps via shareCard).
- **In-app social feed** — deliberate positioning fork.
- **Plate calculator** — REJECTED by founder (kept deleted).

## Where we BEAT Hevy (protect, do not regress)
CVD palette + computed contrast + reduce-motion system; deterministic offline
exercise IDs; auto-scoring swap engine; MEV/MAV/MRV volume landmarks; mesocycle
progression; ED-safe no-shame copy + no loss-framed streaks; no PII to third
parties; offline-first sync correctness + snapshots + data export; back-stack
hygiene; launcher quick-actions; encouragement-framed empty states.
