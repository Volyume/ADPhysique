# 09 — Design & UX Audit

Status: **COMPLETE**
Date: 2026-05-31
Method: `src/styles/theme.js` read in full this session; design-fingerprint
greps run this session (gradients, carousels, `React.memo`, accessibility
props, `allowFontScaling`, reduce-motion); cross-referenced to the Phase 2
component/screen reads. Measured against the CLAUDE.md design constraints
(no AI fingerprint, locked `#0D0D0D`, no gradients, tiered radii, amber
affordance is the brand). On-device visual QA is out of static scope and is
flagged where it would be the next step.

---

## 1. Token system — strong, and CI-enforced

`theme.js` is a single, disciplined source of truth, not a loose palette:

- **Colour** is a mutable `colors` object cloned from `baseColors`, swapped
  in place at boot by `applyAccessibility()` so accessibility prefs (higher
  contrast, colour-blind-safe, larger text) land before any
  `StyleSheet.create` runs (`theme.js:1-7,170-207`). Every token carries its
  **measured WCAG ratio in a comment** (textPrimary 19.44:1, textSecondary
  7.25:1, border 3.81:1 meeting 1.4.11), and the high-contrast path lists the
  bumped ratios. This is real accessibility engineering, not a checkbox.
- **The locked background `#0D0D0D` is honoured** with a documented reason
  (pure black causes halation for astigmatism) and a warm-pulled elevation
  ladder (surface → surfaceElevated → surface2/3) that separates depth by
  lightening, not shadows. On brief.
- **Spacing, radius, fontSize are tiered scales** (`spacing.hair…xxxl`,
  `radius.xs…full`, `fontSize.micro…display`) with semantic `type` roles
  (display/h1/h2/h3/title/body/label/caption) computed from line-height and
  letter-spacing multipliers. Radii are genuinely tiered — the CLAUDE.md
  "modal corner is not a button corner" rule is structurally supported.
- **`num()` applies tabular figures** to any data numeral so columns align
  and changing values don't jitter — exactly the "numerals are the hero"
  intent. Good detail.
- **`withAlpha()` replaced the fragile `colour + '55'` concat** and handles
  3/6/8-digit hex and rgba. **`circle()`** removes hand-rolled
  `borderRadius: w/2`. **`scrim`** unifies every backdrop (replacing drifted
  0.4–0.65 literals). **`motion`** centralises durations + Material-3 easing +
  a spring, with reduce-motion collapsing duration at call sites.
- **CI gate holds (Phase 5/7):** 0 hardcoded-hex / raw-fontSize errors in
  screens/components; ShareCard exempt. The no-fingerprint rule is enforced by
  a lint gate, not just convention.

**Verdict:** the token layer is the strongest single piece of the design
system. No findings against it.

---

## 2. Design-fingerprint sweep (against CLAUDE.md's banned patterns)

Each banned pattern, checked:

- **Gradients / orbs / glows — clean.** `GradientCard.js` is a **misnamed
  compatibility shim with no gradient** (it forwards to `Card` with a tone
  accent border; the 2026-05-30 component audit already caught the
  duplication, `GradientCard.js:1-12`). The only real gradients are
  `ShareCardScreen` (exempt — it's a share image) and `SvgLineChart`'s chart
  fill (the subtle `chartFill` token). **No hero gradient or glow on any app
  surface.** ✔
- **Centred-feature carousel with paginating dots — one instance, needs eyes.**
  `YearOfLiftsScreen` is the only screen with paging/carousel mechanics
  (D9-001 below). Everywhere else uses vertical FlatLists. A year-in-review
  recap is a legitimate place for paging; this is a "confirm it doesn't read
  as an onboarding template" item, not a condemnation.
- **Three-card parallel dashboards — needs on-screen judgement.** HomeScreen
  composes multiple cards (incl. GradientCard); whether any card is there "to
  balance the page" is a visual call the static read can't make. Flagged for
  the founder's eye (D9-002). The parked TODO-1 (merge the steps pill into the
  week card) is in exactly this territory and already queued.
- **Decorative Ionicons on every row — not observed as systemic.** Icons
  appear, but the amber affordance is the documented brand mark; no evidence
  of an icon glued to every list row. Confirm on device.
- **Over-rounded everything — structurally prevented** by the tiered `radius`
  scale.
- **"Coming soon" / greyed-out future features — see Phase 4 inert surfaces.**
  The dead/inert items found in Phase 2/4 (e.g. RestTimer dead animation
  A2-048, planEngine dead output A2-046) are *internal*, not user-facing
  "coming soon" placeholders. No greyed-future-feature UI found.

**Verdict:** the codebase is on the right side of its own anti-fingerprint
rules. The two items worth a human glance (YearOfLifts paging, Home card
balance) are judgement calls, not violations.

---

## 3. Accessibility — above category norm

- **`applyAccessibility()`** ships three real modes: higher-contrast (with
  stated ratio bumps), colour-blind-safe (Okabe–Ito deuteranopia swaps:
  success green → sky blue, error red → reddish-purple, keeping amber/warning
  which are already CVD-distinguishable), and larger-text (×1.2 on every
  fontSize token, stacking with OS scaling since `allowFontScaling` is left at
  RN's default true — **no `allowFontScaling={false}` anywhere**, grep-verified;
  that's the right call). (`theme.js:162-207`)
- **Reduce-motion is wired through the motion-heavy components** (PeekMenu,
  AnimatedEntrance, FeedbackSheet, RestTimer, BottomSheet, Skeleton,
  PressableCard, Toast, RootNavigator — grep-verified), collapsing the heavy
  animations. Consistent with Phase 6's native-driver findings.
- **`accessibilityLabel`/`accessibilityRole` present in 71 files** — broad
  coverage, though not exhaustive (D9-003: spot-check the data-dense screens,
  ActiveWorkout/Analytics, for unlabeled interactive nodes on device with a
  screen reader).
- **Caveat (documented, not a bug):** non-reduce-motion accessibility toggles
  need an app reload to fully apply because `StyleSheet.create` copies
  primitives at creation (`theme.js:1-7`); SettingsScreen prompts the reload.
  Honest and handled.

**Verdict:** accessibility is a genuine strength and a differentiator. Most
competitors in Phase 8 weren't credited with colour-blind or contrast modes
at all.

---

## 4. Copy & voice (the other half of the no-fingerprint rule)

Phase 2 read the user-facing strings across screens and lib. Observed
adherence to the CLAUDE.md voice rules:

- **Plain, short, fact-first copy** in the strings read: the steps launch
  prompt ("Track steps and weight?" + one factual sentence + "Not now" /
  "Connect", `stepsLaunchPrompt.js:108-138`), the plan-switch confirm
  ("Restart your training block?" with a concrete week count,
  `planSwitch.js:42-52`), the feedback suppression comments. No "Let me",
  no "seamless", no encouragement-nobody-asked-for in what was read.
- **No em dashes** in the strings sampled; British spelling in prose.
- **Error toasts are short** (Phase 7 traced the "Couldn't log." shape rather
  than chatbot apologies).
- **D9-004 (low, verify):** a full copy-lint sweep for em dashes / AI tells
  across *all* shipped strings was not exhaustively run this session. A cheap
  Phase 11 quick win: a grep gate for `—` in `src/**` JSX string literals and
  a small banned-word list, mirroring the hex gate. This protects the voice
  rule the way the hex gate protects the colour rule.

---

## 5. Design/UX findings summary

| ID | Finding | Severity | Action |
|---|---|---|---|
| D9-001 | YearOfLifts is the only paging/carousel surface — confirm it doesn't read as an onboarding template | Low (visual judgement) | On-device review |
| D9-002 | HomeScreen card composition — confirm no card exists only to balance the page (overlaps parked TODO-1) | Low (visual judgement) | On-device review + TODO-1 |
| D9-003 | a11y label coverage not exhaustive on data-dense screens | Low | Screen-reader pass on ActiveWorkout/Analytics |
| D9-004 | No CI copy-lint for em dashes / AI tells (voice rule unguarded vs the enforced hex rule) | Low | Add grep gate in Phase 11 |

No medium/high design findings. The earlier "design premium audit
2026-05-30" referenced throughout `theme.js` clearly did real work; this
audit confirms it held.

---

## Verdict
The design system is **disciplined, measured, and self-policing**: a tokenised
theme with documented WCAG ratios, real accessibility modes, reduce-motion
plumbing, tabular numerals, and a CI hex gate that enforces the
no-fingerprint rule. The banned generative-design patterns are largely
absent — the one shim that looked like a violation (`GradientCard`) is inert.
The remaining work is **on-device visual judgement** (two surfaces) and a
**copy-lint gate** to guard the voice rule as firmly as the colour rule. This
is the section with the fewest and lowest-severity findings, and that is an
accurate reflection of the code.
