# Onboarding Audit 03 — Design and Presentation

Status: COMPLETE (Phase 3 of 7)
Date: 2026-06-01
Method: every screen in both flows read for layout, hierarchy, selection
components, progress, transitions, empty/loading states, touch targets, and
visual residue, assessed against the locked design language (background
`#0D0D0D`, amber affordance, tiered radii, no gradients, no template smells)
in CLAUDE.md and `docs/DESIGN_SYSTEM.md`. Replaces the earlier version.

---

## Summary verdict

The onboarding flow is visually well made and on-brand: dark surface, amber
primary, tiered radii, real animation taste (the splash sequence, the reveal
check spring, the hero-zoom into ActiveWorkout). The problems are consistency
across the three plan-creation surfaces, which look like three different
products, and a few stale or template-ish patterns.

---

## Within-flow strengths

- **Consistent theme tokens.** Every flow screen pulls `colors`, `spacing`,
  `radius`, `type` from the theme. No raw hex in the flow screens audited. The
  splash background is the locked `colors.background` (RootNavigator:1057),
  fixing the old black seam.
- **Selection components are consistent inside the wizard.** The inline
  `Dropdown` (ProOnboarding:89-132), segmented rows, and chip grids share one
  visual language. Active state is always amber border + `primaryBg` fill.
- **Progress is clear in the wizard.** 4-segment bar + "Step n of 4"
  (ProOnboarding:567-597). Good.
- **Premium reveal.** The check-circle spring, staged fade/slide, collapsible
  split card and founder card give the reveal real polish
  (ProSetupComplete:37-54, :275-287).
- **Motion respects accessibility.** Reduce Motion is honoured throughout
  (splash, Welcome, reveal all branch on `reduceMotion`).

---

## Issues, by severity

### High (cross-flow inconsistency, the core Phase 3 finding)

D1. **The three plan-creation surfaces do not look like one product.**
- Wizard step 3 uses inline dropdowns + segments (ProOnboarding:949-1007).
- `ProGoalSetup` uses full-width tappable cards with icons and a 2-up goal grid
  (ProGoalSetupScreen:323-560).
- `ManualBuilder` uses pill rows and a modal exercise picker
  (ManualBuilderScreen:569-598).
Same conceptual task (choose goal, equipment, etc), three different selection
metaphors. A returning user moving from the wizard memory to the builder meets
an unfamiliar layout.

D2. **Selection of the same option type is visually different per surface.**
Experience is a dropdown in onboarding (:949) and a card list in `ProGoalSetup`
(:410). Days is absent in onboarding and a pill row in `ProGoalSetup` (:436).
Equipment is a dropdown vs cards. This is the "shared selection types must be
visually identical across both flows" requirement, currently failed.

### Medium

D3. **Two account UIs.** The Login screen and wizard step 1 are near-identical
but separately styled implementations of the same form
(LoginScreen:301-410, ProOnboarding:602-727). Maintenance and drift risk, and
the user can see the form twice (Welcome, then wizard).

D4. **`ManualBuilder` goal pills are decorative.** They look like a meaningful
selector but change nothing (ManualBuilderScreen:569-584). A control that
implies an effect it does not have is a design honesty problem.

D5. **`MesocycleBuilder` carries dead style residue.** `modalSheet`,
`weekChip`, `saveBtn`, `cancelBtn` styles exist for a create-block modal that
is never rendered (MesocycleBuilderScreen:495-529). Visual residue from an
older version.

D6. **Reveal stat layout vs the "no 2x2 grid" rule.** The macro row is a clean
3-up (protein/carbs/fat) which is fine, but the goal/phase chips plus the kcal
hero plus macros stack into a dense card (ProSetupComplete:130-192). It works,
but watch the density against the "lay out by importance" rule.

D7. **`PaywallScreen` shows a two-column comparison strip** that is a 3-tier
artifact (TierComparisonStrip). Visually it presents two balanced columns where
only one tier exists. Stale composition, see doc 04.

### Low

D8. **Goal/phase chip iconography on the reveal.** A "Not competing" value
shown with a `trophy-outline` icon (ProSetupComplete:166) is a small semantic
mismatch.

D9. **Decorative background wordmark on Login** at 4% opacity
(LoginScreen:227-228). Tasteful, not a fingerprint, keep.

---

## Touch targets, empty and loading states

- Touch targets: primary buttons and toggles meet size; several icon-only taps
  use `hitSlop` correctly (e.g. PlansScreen:498). The wizard `Dropdown` rows are
  full-width, good.
- Loading: `PlansScreen` and `PlanLibrary` show skeleton cards on first load
  (PlansScreen:382-388, PlanLibrary:446-451). Premium. The wizard shows a
  spinner in the primary button on finish (ProOnboarding:700, :1213).
- Empty: `PlansScreen` "No active plan" row (:533-538) and `MesocycleBuilder`
  empty state (:288-298) are plain and on-brand. No "coming soon" placeholders
  found in the flow.

---

## Visual residue / template smells checked

- No hero gradients, orbs, or soft-glow backgrounds in the flow. Pass.
- No paginating carousel onboarding. Pass.
- No checkmark-bullet overuse: the Welcome tier cards use checkmarks, which is
  the sanctioned place (CLAUDE.md). Pass.
- Decorative Ionicons: present but restrained (one icon per routine card, per
  option row). Borderline on `ProGoalSetup` where every card has an icon
  (:333, :392, :420, :484, :510), watch for decoration creep.
- Stale residue: `ManualBuilder` cosmetic goal, `MesocycleBuilder` modal
  styles, `TierComparisonStrip` Complete column. Three pieces of genuine
  residue to remove.
