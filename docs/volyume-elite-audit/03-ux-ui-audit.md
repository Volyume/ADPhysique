# 03 · UX / UI Audit

**Author:** Fable, consolidating O1 (whole-app UX heuristic), S1 (platform fit),
S2 (accessibility), O2 (onboarding), O3 (copy/tone). **Date:** 2026-07-04.
Full evidence: the corresponding `inputs/*.md`. This document is the cross-cut,
not a re-listing.

---

## The headline (four audits, one conclusion)

**Volyume's design system is elite at the token layer and under-adopted at the
component layer — and that gap is the mechanical root of the founder's "not one
unified product" feeling.** O1 states it, S4 quantifies it (14/80 screens import
`Card`; 64/80 hand-roll the box), and it recurs in every surface-level finding.
This is the organising insight of the whole UX audit.

---

## Consistency & the "one material" gap

- **Tokens: elite.** `theme.js` (658 lines, WCAG-computed, dual-theme, CVD-safe,
  named haptic/motion/state grammars) is the reference. `haptics.js`,
  `BackHeader`, `Card`, `BottomSheet`, `EmptyState`, `AppAlert` are all
  well-written primitives. **The gap is adoption, not design.** (O1)
- **Components: minority pattern.** `Card` 14/80, `BackHeader` 16/80, `Button`
  21/80; 8 screens hand-roll a back header; the 5 Progress Photos modals import
  zero design-system components (S4).
- **Overlays are the worst area.** Six raw `Modal`s in Photos re-implement sheet
  chrome instead of `BottomSheet`; the two share-card builders duplicate ~90% of
  the UI with divergent chrome (O1-F3/F4).
- **Feel is split by domain.** Core (training/coaching) fires haptics and uses the
  branded Skeleton; Photos, Partners, Share, and the whole food domain fire zero
  haptics and fall back to a bare spinner (O1-F2/F6).

**Reference standard to copy** (O1's ranking): CoachOutput (8.5/10), WeeklyCheckIn
state handling, NutritionTargets/Methodology, the training core, the Analytics
empty state. These prove the team *can* build elite; the task is to make the rest
rise to them.

## States

- **Empty states: strong** (the guidance audit fixed the map). A few dead ends
  remain (CoachReview, VolumeHeatmap, Consistency, MyMeals, Plans no-active-plan).
- **Error states: largely absent** — explicit handling in ~3 screens; most
  focus-effect loaders `.catch(() => {})` and fall through to an empty state, so a
  *failed read looks identical to no data* (O1-F5). This is the biggest states
  gap and erodes trust silently.
- **Loading: inconsistent** — Skeleton in the core, spinner on the paid/new
  surfaces (O1-F6). The offline-first architecture makes most reads instant, so
  this is a solvable, high-leverage polish win (O8).

## Platform fit (S1)

- **Already good:** Android hardware back handled everywhere (all 26 modals have
  `onRequestClose`); iOS swipe-back never disabled; haptics centralised with a
  reduce-motion gate; notification channels split; native date pickers correct;
  theme supports dark/light/system (not dark-only).
- **Risks:** [P0] iOS Live Activity may be non-functional in shipped builds (no
  config plugin for the Widget Extension target — verify on device); [P1]
  predictive-back readiness unverified (targetSdk 35, no
  `enableOnBackInvokedCallback`); [P1] the safe-area bottom-edge batch is still
  open on ~10 screens; [P2] `maxFontSizeMultiplier` on only 4/82 screens.
- **The governing principle (O8):** "one brand, two dialects" — hold tokens/voice/
  motion-character constant, branch navigation/sheet/haptic idioms per platform.

## Accessibility (S2)

- **Already good:** the log-a-set flow is exceptionally well labelled; WCAG
  contrast system with a prior gap fixed; reduce-motion honoured app-wide; no
  `allowFontScaling={false}`; chart containers carry spoken summaries.
- **Top risks:** [P1] `ProGate.js` — the wrapper around *every* Pro surface — has
  zero a11y labelling (one file, app-wide reach); [P1] the Diary "move to meal
  slot" modal is likely unreachable for screen readers; [P2] 66 outstanding
  `react-native-a11y` warnings across 27 files (heaviest in ProOnboarding and
  ExercisePickerModal); [P2] RoutineDetail's 5 unlabelled TextInputs.

## Onboarding & first session (O2)

- **Craftsman-grade in voice:** honest trial-first Welcome, well-explained sex
  gate, real-range validation, draft persistence across process death, a
  genuinely motivating plan reveal at `ProSetupComplete`.
- **The two heaviest, coldest beats sit before any value:** the Article 9 wall,
  then the dense step-2 profile form (~25–30 interactions to the reveal). The
  emotional arc dips hardest in the middle and recovers strongly at the reveal.
- **[P1] The 14-day trial starts as a silent side effect** of the consent tap —
  the screen never says so (additive copy fix; locked body untouched).
- **[P1] The whole funnel is unmeasurable** (only 2 persistent events; the rest
  are Sentry breadcrumbs) — the onboarding face of O4's dark-telemetry P0.

## Copy & tone (O3)

- **No trust-damaging copy anywhere** — no shame, no guilt, no bro-speak, no dark
  patterns, no em-dash, British spelling holds. Notifications and paywall/trial
  are highlights (calm, honest, zero fake urgency).
- **The gaps:** [P1] failure-moment copy drops into cold system-speak ("Couldn't
  log / Try again"; raw `e.message` leaked to users); [P1] a few empty states
  state absence ("No data") instead of teaching; [P2] term drift
  (session/workout/routine used interchangeably); [P2] celebration is thin outside
  PRs (week/block completion under-celebrated).
- **The best line in the app** (protect it): *"Nothing you've logged disappears.
  Every workout, every PR, every check-in stays on your phone exactly as you left
  it."*

## The cross-cutting fix

Nearly every UX finding resolves to one of three mechanical roll-outs, already in
the roadmap: **(1) the component system** (`Card`/`ModalHeader`/`BottomSheet`) on
the bolted-on surfaces first, **(2) the haptic vocabulary** on the silent
moments, **(3) a shared load/error state** so failures stop reading as emptiness.
Do these three and the app stops feeling templated. Everything else is targeted
polish on top. See `10-prioritised-roadmap.md` Wave 2.
