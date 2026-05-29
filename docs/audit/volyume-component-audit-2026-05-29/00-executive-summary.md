# Volyume component audit, executive summary

Date: 2026-05-29. Scope: every component and screen in `src/` (28 core
components, 11 food components, 62 screens) plus the foundation (theme,
navigation, store), assessed in isolation and as a system, against
best-in-class apps across mobile (Linear, Stripe, Airbnb, Robinhood,
Material/Apple, USWDS) and fitness (Hevy, Strong, MacroFactor, Whoop,
Strava, RP/Boostcamp). Full detail in files 00–09.

## The headline

**Volyume's individual components are unusually strong; its shared layer is
thin.** The primitives, `PressableCard`, `Toast`, `SetEntry`, `RestTimer`,
`MacroRings`, `BodyDiagramHeatmap`, are genuinely best-in-class, and the
accessibility token system (documented WCAG ratios, colour-blind/contrast/
larger-text swaps, app-wide reduce-motion gating) is ahead of most shipping
apps. The feature set matches or beats Hevy/Strong/MacroFactor in several
lanes (adaptive coaching *with a written rationale*, volume landmarks,
muscle map, loggable recipes, year-in-review).

The weakness is structural, not aesthetic: there is **no shared `Card`,
`Button`, `Field`, `BottomSheet`, or chart kit**, and the **type/scrim
tokens are incomplete**. So every screen re-builds the basics, and small
inconsistencies (83 inline card blocks, 14+ inline buttons, 9+ different
backdrop opacities, four charting libraries, ~60 screens with hand-set line
heights) accumulate into an "assembled, not authored" feel on the seams.

The good news: the fix is **extraction and propagation, not redesign**. It
touches nothing the brand has locked, not the copy voice, not the flat
`#0D0D0D`/amber look, not the feature set, not the schema.

## What's already best-in-class (protect these)
- Accessibility token system + reduce-motion discipline.
- PressableCard, Toast, SetEntry, RestTimer, reference components.
- MacroRings + BodyDiagramHeatmap, signature data surfaces (need a11y +
  a Skia fallback, but the capability is rare and valuable).
- The "Why this plan" rationale + held-decision honesty + founder note,
  human touches competitors lack.

## What drags it below the bar
- **No base primitives** → visual/interaction/state drift everywhere.
- **Four charting libraries** → the progress section (the heart of a
  tracking app) is the *least* visually coherent part.
- **Two header systems** → the sync badge appears on some screens, not
  others.
- **Errors via OS `Alert` or swallowed catches** → two error languages, and
  some user actions fail silently (one is a safety path).
- **ActiveWorkout (2616 lines) renders its set carousel with `map`** → jank
  risk mid-session, the worst possible moment.

---

## Top 10 highest-leverage moves

Ordered by leverage (how many components each lifts) × user visibility.
Full specs in `09-master-recommendations.md`.

1. **Add a scrim token + `withAlpha()` helper** (S1). Tiny change; fixes 9+
   inconsistent backdrops and removes fragile `color + '55'` concatenation
   app-wide. *Critical, small.*
2. **Ship a `<Button>` primitive** (S4) and roll it onto the 14+ inline
   CTAs. One press/disabled/loading behaviour for the most-tapped element.
   *Critical.*
3. **Virtualise + decompose ActiveWorkoutScreen** (C1). Correctness and
   performance during the core loop; the 2616-line `map`-list is the single
   biggest runtime risk. *Critical.*
4. **Ship a `<Card>` primitive** (S3), folding in the mis-named
   `GradientCard`. Kills the 83-file card drift and makes a future
   borders-vs-surface-steps restyle a one-file change. *High.*
5. **Make Toast the only error/confirmation channel** (S8) and kill every
   silent `.catch(()=>{})`, including the safety-critical HeldDecisionCard
   support link. Retire routine `Alert`s. *High (one item is a safety fix).*
6. **Converge on one chart kit with a11y baked in** (S7); retire
   gifted-charts + victory-native. Unifies the progress section and shrinks
   the bundle. *High.*
7. **Add type tokens (lineHeight/letterSpacing) + a `type` role map** (S2).
   Fixes vertical-rhythm drift across ~60 screens and lets the tab bar +
   splash finally scale with larger-text. *High.*
8. **Unify the two header systems** (H1) so the sync badge and header tint
   are consistent on every screen. *High.*
9. **Extract one `<BottomSheet>` + `<Field>`/`<SearchBar>`/`<Chip>`/
   `<Stepper>`** (S5/S6) and adopt on the 6 sheets + 7 search bars + setup
   chips. Unifies the most-used input and overlay surfaces. *High.*
10. **Set the skeleton loading rule** (S8) and add a11y to charts/muscle
    map (H4). Consistent perceived performance + the core data becomes
    usable with a screen reader. *High.*

## Effort vs payoff
Moves 1, 5, 7, 10 are small-to-medium token/rule changes with app-wide
payoff, start here. Moves 2, 4, 9 are medium primitive builds that unlock
fast per-screen migration. Moves 3, 6, 8 are the larger structural pieces.
Every move is additive and independently shippable on `main`; none requires
a new closed-test release, a schema change, or any change to the locked
copy voice and visual language.

## One-sentence verdict
Volyume is a strong set of components in search of a shared system; build
the eight missing primitives and propagate the five reference components
already in the repo, and it becomes the best-in-class, single-author tool
the brand is aiming for, without redesigning a thing.

---

### File index
- `00-inventory.md`, full component/screen inventory + 10 cross-cutting issues
- `01-foundation.md`, tokens, type, spacing, shape, motion, primitives
- `02-navigation.md`, tab bar, headers, transitions, routing shell
- `03-layout.md`, cards, sections, lists, grids
- `04-input.md`, buttons, fields, search, chips, steppers
- `05-feedback.md`, toasts, sheets, empty/loading/error states
- `06-data-display.md`, charts, rings, badges, rows
- `07-feature-specific.md`, workout, plans, progress, coaching, food, onboarding
- `08-system-coherence.md`, the six coherence axes + outliers + standard-setters
- `09-master-recommendations.md`, prioritised roadmap (systemic first)
