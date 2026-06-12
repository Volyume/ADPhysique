# Feature-flag investigation (2026-06-12)

Founder concern: "anything built and switched off behind a flag that wasn't my
instruction." Full sweep of the codebase for feature toggles / kill switches /
dormant-but-built code.

## Verdict: ONE feature is built-and-dark behind a flag.

### COMP-030 quiz-first onboarding — `ONBOARDING_QUIZ_FIRST = false`
- **File:** `src/lib/onboarding/quizFlow.js:21` (plus dependent `PHASE_PRE_ACCOUNT = true`, line 45, which only has any effect when the first flag is ON).
- **What is built and dark:** the entire quiz-first front door — `QuizScreen`,
  `PlanPreviewScreen`, the in-memory quiz store slice, the `WelcomeScreen` Pro-CTA
  branch (`WelcomeScreen.js:59`), the `ProOnboarding` prefill effect, the
  `QuizTraining` route registration (`RootNavigator.js:445`), and a deferred
  telemetry event (`onboarding_quiz_completed`). All coded, tested, reversible by
  one flag flip.
- **What it does when ON:** Pro path becomes Welcome → short quiz → deterministic
  plan PREVIEW → "Save your plan" account wall → Article 9 consent at first health
  input. Pre-account answers live only in JS memory (no row, no uid, no network).
- **Why it shipped OFF (per `IDENTITY_AND_OWNERSHIP_LOCKED.md` §COMP-030 addendum
  + `quizFlow.js` header):** framed as a conservative, reversible rollout —
  "default OFF until the founder flips it after the two-week baseline measurement"
  and "founder to confirm this reading at PR review."
- **The discrepancy you flagged:** the handoff record shows you *chose* COMP-030 as
  a build item and said "DPO is a red herring — normal PR bar." So the *build* was
  instructed. The **default-OFF flag + the self-imposed "two-week baseline" gate
  before flipping it on was a caution added during the build, not something you
  asked for.** That is the thing to correct.
- **Impact of it being dark:** int-01 / int-05 both rank enabling quiz-first as the
  single highest-leverage mass-market activation lever already sitting in the
  codebase. Today every user still hits an account + Article 9 consent wall before
  any personalised value — the most aggressive front door in the competitive set.

## Everything else recent sessions built is LIVE (not flag-gated)
- The engine cluster (COMP-008/015/006/005/024/026 incl. the step-TDEE modifier
  and the adaptive-TDEE resize) is **live, not shadowed** — confirmed by the
  "No-shadow gate" blocking invariant in `engine-invariants.test.js:209` and the
  founder's explicit "no shadow mode anywhere" directive.
- COMP-013 reveal sequence, COMP-018 streak, COMP-019 charts, COMP-023 day-3
  moment, COMP-025 win-back, COMP-027 Home reorder, COMP-029 light theme
  (default Dark, system-following) are all live in JS.
- No central `FEATURE_FLAGS` module, no other kill switches, no `if(false)`
  dead-feature gating found.

## Not flags, but "built/partly-built and not active" for unrelated reasons (noted for completeness, none are hidden toggles):
- **iOS Live Activity** — disabled at the NATIVE level pending watchOS bug #175 +
  the EAS native target; this is a native-build gate, not a hidden JS flag.
- **Health/wearable WRITE scopes** — `src/lib/health.js` notes "Write scopes
  planned (not yet wired)"; this is unfinished functionality, not a built feature
  switched off.
- **`PlateCalculator.js`** — fully built and tested but imported nowhere (dead /
  un-wired component, not flag-gated). int-03 flags wiring it as a cheap win.
- **COMP-019 Stage 2 widgets / COMP-020 watch** — JS "brains" built; the signed
  native shell builds on EAS. Native gate, not a JS flag.

## Recommended handling (per founder: "change these when appropriate, in with the design work")
- Treat flipping `ONBOARDING_QUIZ_FIRST` to ON as part of the onboarding/design
  integration work in this audit's blueprint phase — NOT an isolated flip now. It
  is a production behaviour change that touches `ONBOARDING_SEQUENCE_LOCKED.md` and
  `IDENTITY_AND_OWNERSHIP_LOCKED.md`, so it lands with founder review per the
  agreed "audit + blueprints, founder reviews before code ships" model.
- The onboarding blueprint will specify: flip the flag (or, if the DPO classes the
  pre-account phase question as health data, set `PHASE_PRE_ACCOUNT = false` so the
  phase ask moves behind the consent gate while the rest of quiz-first still ships),
  the locked-doc amendments, and the verification.
</content>
