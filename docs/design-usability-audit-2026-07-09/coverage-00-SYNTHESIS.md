# Coverage-gap audits — synthesis and ranked backlog (2026-07-09)

Six Sonnet coverage-gap audits (D6, founder-approved) ran read-only and each
wrote its own findings doc. This synthesis merges them, dedupes convergent
findings, and ranks the work by class. Source docs (read in full before acting):
- `coverage-01-light-theme.md` (LT-1..LT-6)
- `coverage-02-motion.md` (MO-1..MO-7)
- `coverage-03-aesthetic-craft.md` (AC-1..AC-7)
- `coverage-04-accessibility.md` (AY-1..AY-9)
- `coverage-05-first-run.md` (FR-1..FR-5)
- `coverage-06-competitive-hps.md` (CP-1..CP-10)

~44 findings total. The recurring root cause across two lanes is the
**primary-ink-used-as-fill** bug; the recurring product theme is **Home banner
overload**.

## Convergent findings (flagged by 2+ lanes — highest confidence)
- **Primary-as-fill light-theme contrast bug** — LT-1 (root cause, 88 sites +
  `Button.js` primary variant) and AC-3 (its Home "Continue workout"
  instance). `colors.primary` is ink; `colors.primaryFill` is the bright fill.
  Identical in dark, divergent in light: `onPrimary` on the ink gives 3.04:1
  (fails 4.5:1) vs 9.59:1 correct. Mostly a zero-dark-diff mechanical swap.
- **Home banner overload** — AC-6 and CP-1. Up to seven dismissible banners can
  stack above the Start-Workout hero, no cap; against the "calm precision
  instrument" bar and single-hero competitor norm.

## A. SAFE mechanical fixes — buildable now, no decision needed
Ranked by impact. All are token/attribute/guard-level, no schema/engine/consent.
1. **MO-1 — runtime crash (do first).** `ProgressPhotoCompare.js:240-243` calls
   `setPct` inside a `Gesture.Pan().onUpdate` worklet without `runOnJS` — likely
   throws when dragging the compare-overlay handle. Wrap in `runOnJS`.
2. **AY-1 — TextField placeholder contrast.** `TextField.js:22` default
   `colors.textDisabled` (2.99:1 dark / 2.85:1 light) → `colors.textMuted`.
   One-line, app-wide (incl. the new barcode entry + first-run field).
3. **LT-1 — primary-as-fill swap** (non-billing, non-MacroRings sites): change
   fill usages of `colors.primary` to `colors.primaryFill` (incl. `Button.js`
   primary variant). EXCLUDE the 2 billing sites (GATED, section D) and the
   MacroRings ring (LT-2, ED-adjacent, section C). Zero dark-theme diff.
4. **FR-2 — auth error leak.** `LoginScreen.js:41`, `ProOnboardingScreen.js:566`
   pass raw `result.error.message` through; route via the same calm-copy
   mapping lane 01 used for L01-B35.
5. **AC-2 — raw alpha literals** (~15 files) → the tint tokens (matches D0).
6. **LT-6 — chart gridline contrast.** `VolyumeChart.js:236` stacks 0.5 opacity
   on the border token (~1.7:1) → use the intended gridline token/opacity.
7. **AY-3 — 5 modal backdrops** missing `accessibilityLabel="Close"`
   (`RoutineDetailScreen`, `PlanLibraryScreen`, `PlansScreen`, `FeedbackSheet`,
   `PeekMenu`) → match `BottomSheet.js:116`.
8. **AY-4 — phantom TouchableOpacity** + missing `accessibilityViewIsModal`
   (`RoutineDetailScreen.js:521` + its two raw Modals).
9. **AY-5 — `accessibilityState={{expanded}}`** on `EngineLog.js:86` header.
10. **MO-2 / MO-3 — Reduce-Motion gating** on `AppAlert.js:82` + 16 raw `Modal`
    sites (back-port the convention 7 newer files already use).
11. **AC-4** flame vs flame-outline weight mismatch; **AC-7** ScreenHeader chip
    reusing the viewfinder token.

## B. JUDGEMENT — design/UX calls (standing delegation covers most; a few are
product-IA forks worth a founder nod)
- **Home banner overload cap** (AC-6/CP-1) — priority/cap policy for the Home
  banner stack. Product-IA; recommend a founder nod on the cap rule.
- FR-1 free-tier onboarding-completion warmth (no celebratory reveal vs Pro).
- FR-3 Welcome hero animation (logo+pricing animate as one flat block).
- AC-1 chevron-forward standardisation (9+ sizes, 3 colours for one affordance).
- AC-5 fourth un-named micro-label type treatment (~29 files).
- CP-8 free-tier height/DOB correction path (only in Pro NutritionTargets).
- MO-5/MO-6 CheerPill press dialect; Diary swipe-day directional transition.

## C. ED-SAFETY-ADJACENT — labour may be delegated but the LEAD reviews the diff
HANDS-ON before push (no rubber-stamp); some need founder wording.
- **LT-2** MacroRings calorie-ring ink (muted brown in light). Fix the ring
  colour WITHOUT altering the adherence-neutral framing (no red/green good-bad).
  Hands-on diff review.
- **MO-4** ProSetupComplete staged plan-reveal gated only on Reduce-Motion, not
  calm/open-ED-flag — the same file already special-cases copy under that flag.
- **FR-4** "Required" pill wording on weigh-in/check-in rows right after
  body-composition disclosure — calmer register. Tone only.
- **AY-7** ED-pattern lockout/cleared card has no screen-reader announcement on
  appearance — needs founder-reviewed SR wording (ED-safety copy).
- **LT-3** Card/most cards apply no shadow in light, contradicting the Materials
  Policy ("light uses shadows as primary elevation"). Not ED, but an app-wide
  elevation-policy judgement — recommend a founder nod before a broad sweep.

## D. GATED / founder decisions
- **LT-1 billing sites** — `BillingPeriodSelector.js:75,80`,
  `ProUpgradeScreen.js:579` primary-as-fill on live billing screens (billing
  gate; same swap, but billing = founder sign-off).
- **AY-2** success/error text on its own `*Bg` tint fails AA (4.09:1 / 4.36:1) —
  needs a design decision (new ink tokens vs surface restriction), not a swap.
- **CP-7** biometric app-lock — needs a NEW dependency
  (`expo-local-authentication`): name/licence/yes required.
- **CP-2** iOS home/lock-screen widget (Android has two; iOS only Live
  Activity) — scope/effort decision.
- **CP-10** theme/a11y toggles require app restart (`StyleSheet.create`-time
  baking, self-documented `SettingsDisplayScreen.js:28-53`) — architectural.

## DROPPED (per prior founder decisions)
- **FR-5** silent 14-day trial start beat — trial/paywall left alone (D5).
- CP items that would breach EU-residency / third-party-health / ED-safety /
  free-Pro boundaries were flagged out-of-bounds by the audit, not proposed.

## What the audits confirmed already STRONG (do not re-flag)
Light token table (WCAG-tested), Button destructive/ink fixes, adherence-neutral
MacroRings framing, VolyumeChart theme wiring, tab bar / mini-bar / progress-photo
viewer motion, RollingNumber guarded bodyweight exclusion, Card/Chip/EmptyState/
Header primitives, D1 radius fix live, empty-state adoption, zero hard-coded hex,
Article 9 cold-start tone, splash animation, ProSetupCompleteScreen, and the P9
TalkBack fixes (F1/F2/F3 + a11y lint at 0).
