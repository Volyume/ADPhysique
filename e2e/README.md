# Volyume — Maestro E2E flows

YAML flows driven by [Maestro](https://maestro.mobile.dev/). Free, no
Detox tax on build time. iOS + Android with the same files.

This directory is the Phase-A foundation: the 12 critical-path flows
from `docs/TESTING_STRATEGY_LOCKED.md` (lines 122-134) are scaffolded
here. Smoke flows (the bundle that gates every PR) are tagged `smoke`;
the wider set is tagged `full`.

## Running locally

```bash
brew tap mobile-dev-inc/tap
brew install maestro
# Or: curl -Ls "https://get.maestro.mobile.dev" | bash

# Sanity check: drives the splash and back-button only. Catches
# packaging issues before touching real flows.
maestro test e2e/_smoke_app_launches.yaml

# Run the smoke bundle (must-pass before merge).
maestro test --include-tags smoke e2e/

# Run a single flow.
maestro test e2e/onboarding_happy_path.yaml

# Watch a flow build live in Studio (interactive selector pick).
maestro studio
```

Requires a connected Android emulator / iOS simulator / physical
device with the Volyume debug build installed. CI installs the build
itself; locally you need to sideload first (`adb install
volyume-debug.apk` or `xcrun simctl install booted Volyume.app`).

## Flow inventory

Status legend: **S** = scaffold (selectors written from spec, awaiting
first-run validation against a real device); **V** = validated against
at least one real run; **B** = blocked by a missing surface.

| Flow | Spec | Status |
|---|---|---|
| `_smoke_app_launches.yaml` | (foundation) | S |
| `onboarding_happy_path.yaml` | TS § E2E line 123 | S |
| `onboarding_decline_article9.yaml` | TS § E2E line 124 | S |
| `diary_log_first_meal.yaml` | TS § E2E line 125 | S |
| `diary_swipe_delete.yaml` | TS § E2E line 126 | S |
| `scan_barcode_happy_path.yaml` | TS § E2E line 127 | B (needs barcode-fixture support) |
| `scan_barcode_miss_ocr.yaml` | TS § E2E line 128 | B (needs OCR-fixture support) |
| `cascade_day14_gate_pay.yaml` | TS § E2E line 129 | B (needs IAP-sandbox harness) |
| `cascade_day14_gate_skip.yaml` | TS § E2E line 130 | S |
| `cascade_day28_gate.yaml` | TS § E2E line 131 | S |
| `subscription_restore.yaml` | TS § E2E line 132 | B (needs IAP-sandbox harness) |
| `account_deletion_path.yaml` | TS § E2E line 133 | S |
| `goal_lock_set_and_clear.yaml` | TS § E2E line 134 | S |

`B` flows still ship as scaffolds with their best-guess selector set,
but they're parked behind an explicit `assertVisible: false`
sentinel until the missing dependency is in place. They will not run
under `--include-tags smoke` or `--include-tags full` until promoted
to `S`.

## Selector convention

Prefer Maestro `text:` matches against visible labels. They survive
component renames and read cleanly in the YAML. Only fall back to
`id:` (which resolves React Native `testID` on Android +
accessibility identifier on iOS) when:

1. The same text appears twice on the same screen (e.g. two
   "Continue" buttons).
2. The selector would otherwise match localised text that varies.
3. The element is icon-only.

Current `testID` namespace is `volyume-<kind>-<purpose>` (see
`src/screens/BuildWorkoutScreen.js` for the original examples).
Reuse the prefix when adding new IDs.

## Iteration plan

1. Founder runs the smoke bundle against a debug APK on their device.
2. Failures are reported back; selectors get tightened, copy gets
   confirmed, timing gets adjusted.
3. Once smoke is green, full bundle runs in CI on every PR merge.
4. Maestro Cloud free tier (100 runs/month) is reserved for
   pre-release validation on real devices, per
   `TESTING_STRATEGY_LOCKED.md` § Maestro Cloud usage.

## CI integration

`.github/workflows/maestro-e2e.yml` is the workflow. It builds the
debug APK, boots an Android emulator, installs the build, and runs
`maestro test --include-tags smoke e2e/`.

The workflow runs on `workflow_dispatch` only at first (founder
opt-in). After the smoke bundle has been validated against a real
emulator run, change the `on:` block to include `pull_request`
to gate merges.
