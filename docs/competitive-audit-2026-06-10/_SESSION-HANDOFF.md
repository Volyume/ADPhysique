# Session handoff — competitive audit 2026-06-10

**>> START AT `_START-HERE-NEXT-SESSION.md` <<** — it is the current single
entry point: branch, what shipped, locked decisions, and the prioritised
next-steps. Its TOP block (the latest "session 2" UPDATE) is authoritative for
live state. `_FOUNDER-DECISIONS-2026-06-11.md` holds the detailed decisions +
the full per-commit build log. This file remains only the index of what the
original audit produced (the 28 blueprints).

**Status note (2026-06-11, session 7):** **COMP-026 step-informed TDEE shipped
LIVE in full** (no shadow) — both the dormant adaptive-TDEE resize activation
and the step-trend modifier, gated by new BLOCKING engine-invariants + the full
simulator suite (no regression). Surfaces: COMP-004 card line (Progress +
Diary), CoachOutput receipt, COMP-006 methodology section; telemetry
`step_tdee_modifier_evaluated` + `migrate_080` (file only, STAGING, founder
applies). Baseline **221 suites / 3442 tests**, 0 errors, 4 warnings. This session also
shipped **COMP-004 door** (card on Progress + Diary; Home cell taps through to
the trend) and **COMP-029 light theme code-complete** (onPrimary migration +
light palette + WCAG contrast tests + Appearance row; default stays Dark). The
COMP-029 native rebuild, on-device brand sign-off and manual sweep are founder
steps. Session 7 also shipped **COMP-024 decision-promotion** (trend-aware
`robustTrackingEwma` now drives coaching decisions; full simulator green incl.
bulk_aggressive) and **COMP-019 Stage 2** (#175 spike = GO; pure
`widgets/snapshot.js` brains built; native shell = an EAS recipe in the
blueprint). Baseline now **222 suites / 3454 tests**. The audit build-list is
fully worked through; everything left is a founder/EAS/device action — see
`_START-HERE-NEXT-SESSION.md`, `_MIGRATIONS-TO-APPLY.md`,
`_COMP-029-LIGHT-SWEEP.md`.

**Status note (2026-06-11, session 6):** **COMP-024 cycle-robust smoothing
shipped LIVE** (founder dropped shadow mode for everything — see
`_FOUNDER-DECISIONS-2026-06-11.md` §14). Live: the robust smoother
(`robustTrend.js`) + the BodyMetrics display promotion + a blocking rapid-loss
safety invariant. HELD: the coaching-decision promotion — it regressed bulk
coaching (the simulator caught the clamp damping sustained gains), so decisions
+ safety stay on the plain EWMA until the smoother is reworked. Baseline **219
suites / 3395 tests**, 0 errors, 4 warnings. **Next session START at the
`⏩ RESTART HERE` block in `_START-HERE-NEXT-SESSION.md`** — locked decisions
(no-shadow, deps approved, billing held, COMP-004 both surfaces) + the ordered
next steps (COMP-026 first and fresh, then COMP-004 door, COMP-029, COMP-019
Stage 2). Read the "COMP-024 lesson" before COMP-026.

**Status note (2026-06-11, session 5):** **COMP-027 Part B shipped** — the Home
hero-first reorder + the new `TodayStrip` glance row (weight/steps/cardio in one
card under the hero), retiring StepsCard + CardioCard. Pure JS/RN, no gates; the
weigh-in-completion guardrail + small-screen/larger-text layouts are an
on-device PR check. Baseline **218 suites / 3385 tests**, 0 errors, 4 warnings.
With this, **every audit item is either shipped or founder-gated** (billing,
engine/safety-attended, deps, native/EAS, DPO/legal, on-device, data-ops) — there
is no remaining item buildable unattended without one of those unblocks.

**Status note (2026-06-11, session 4):** **COMP-025-A shipped in full (Phase A)**
— cancellation-reason capture (both moments), the ProLocked held-seat line, the
local +30-day win-back (episode state machine, ED-suppressed, single-shot +
180-day floor), authoritative lapse detection wired into RootNavigator, and the
temporary-break path. 8 commits; no billing files touched; Phase B (store
offers) billing-gated and NOT built. Founder decision this session: **"build
both now"** authorised the entitlement-seam pieces (Moment 2 + win-back).
Baseline is now **217 suites / 3374 tests**, 0 errors, 4 warnings. **There is no
large unblocked code-only item left** — the remainder is gated (COMP-024/026
attended engine seam; Stage 2 widgets + COMP-029 dep/native; COMP-020 native;
COMP-030/NEW-002 DPO; COMP-007 + COMP-025 Phase B billing; COMP-016 data-ops).
**The COMP-019-1b static-chart migration (the last unattended code-only item)
also shipped this session** — WeightTrendCard + BodyMetricsScreen moved to
VolyumeChart and the orphaned SvgLineChart was deleted; there is now no
unattended code-only item left. Carry-forwards: server migrations **`072`–`079`** await
the founder's manual apply; the copy gate now spans
COMP-013/023/019/018/022/025-A. See the START-HERE top block (session 4) for the
full list.

This file is the authoritative entry point for the next session. It supersedes
the `PENDING` section at the bottom of `implementation/.blueprint-summaries-scratch.md`
(that list named COMP-005/007/009/010/011 as pending — they are all DONE now).

## What is complete and on this branch

**Round 1 — what to build (founder-approved).**
- `competitive-audit-00-executive-summary.md`, `-00-volyume-baseline.md`,
  `-00-workout-screen-deep-audit.md`
- 14 area research files (`competitive-audit-01-*.md`) + workout-screen proposal
- `-02-comparison-matrix.md`, `-03-master-proposals.md` (30 scored)
- `-04-final-action-list.md` — the founder's yes/no decisions: 27 approved
  actions + NEW-002.

**Round 2 — how to build it. ALL 28 blueprints complete** in `implementation/`:
COMP-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 015, 016,
018, 019, 020, 022, 023, 024, 025, 026, 027, 029, 030, NEW-001, NEW-002.
Plus `impl-00-shared-brief.md` and `impl-00-integration-map.md`. Orchestrator
working notes in `.blueprint-summaries-scratch.md` (its PENDING list is stale —
see top of this file).

**Coverage + gap research (the wider sweep).**
- `competitive-audit-05-coverage-gaps.md` — what the 42 audit agents did not
  cover; verdict table; settled/parked list so we stop re-litigating.
- `security/server-side-security-audit.md` — 0 critical, 0 high. Most urgent:
  M-1 `engine_telemetry_daily` view missing the security_invoker+REVOKE
  hardening (cross-user aggregate read; runtime grant check then small fix).
- `store/store-creative-spec.md` + `store/apple-listing-correction.md` —
  screenshot/preview spec; Apple App Name over 30 chars (fix proposed); iOS
  privacy label wrongly says crash data not collected; SKU-id doc mismatch.
- `ops/backup-dr-brief.md` — Supabase free tier has NO backups; recommends Pro
  $25/mo (challenges BUDGET_POSTURE_LOCKED); gone-forever data = auth.users,
  tier/trial state, trial_ledger+salt, consent_log; RPO<=24h RTO<=4h + runbook.

## NO decisions taken on any of it
Per founder instruction, all blueprints/gap reports are research only. No code
was written from them. No locked docs were amended.

## Next session = the questionnaire, then build
The blueprints have queued specific founder decisions. Group them into one
multi-choice questionnaire (answer once, then build in dependency order):

1. **Billing permission** (CLAUDE.md gate) — COMP-007 annual-first + paywall
   proof touch billing files; also resolve the SKU-id mismatch
   (`pro_monthly`/`pro_annual` in catalogue.js vs `volyume_pro_monthly`/
   `volyume_pro_annual` in CLAUDE.md) against Play Console.
2. **Dependency approvals** (CLAUDE.md gate) — `@bacons/expo-apple-targets`
   (Watch + widgets), `react-native-android-widget`, `expo-system-ui` (light
   theme), `expo-video` (exercise demos), `expo-apple-targets` issue #175 spike.
3. **Spend** — NEW-001 exercise demos Gym Animations $599 (after licensing Qs);
   COMP-016 UK food layer ~£4-6k contracted; backup Supabase Pro $25/mo.
4. **Colour** — COMP-027 warning amber retune to Okabe-Ito yellow (CVD).
5. **Copy sign-offs** — COMP-006 methodology claims, COMP-015 adjustment lines,
   COMP-011 cardio explainer, COMP-010 effort vocabulary (Ease in/Build/Push/
   Recover; Push vs Peak), COMP-008 pre/post survey strings.
6. **Free/Pro** — NEW-002 training partners: one partner free, three on Pro?
7. **Locked-doc amendments + DPO** — COMP-030 quiz-first (IDENTITY_AND_OWNERSHIP
   + ONBOARDING_SEQUENCE + DPO Q1-Q7); COMP-016 foods.source CHECK; NEW-002
   partnership tables RLS/DPO; backup brief vs BUDGET_POSTURE_LOCKED.
8. **Sequencing** — hard deps already mapped: COMP-008 before COMP-015; COMP-001
   before COMP-020 (watch); COMP-004 before COMP-026; COMP-027 token migration
   (122 sites) before COMP-029 light theme; COMP-018 streak before NEW-002.

## Still open, separate from the audit
- **iOS build 15 workflow run** — the steps fix (0f53fdc, src/lib/health.js) and
  Rate Volyume fix (350fcd1, SettingsAboutScreen.js) are CODE-DONE and pushed on
  this branch. The founder runs the build-ios.yml workflow from THIS branch (not
  main) as a side task. Build 14 (Beta App Review) lacks both fixes.
- **Revenue bug found during COMP-023 research (not fixed):** restoreNotifications()
  wipes the day-12/14 trial-ending cascade pushes on every app launch, so trial
  users may reach day 14 with no warning. Worth fixing before the next build.

## Container-reset note (operational)
The cloud container reset TWICE this session, each time rolling local back ~50
commits and making it look like work was lost. It never was — everything was on
the remote. Recovery = fast-forward local to origin. After the second reset we
switched to committing blueprints DIRECTLY to the remote via the GitHub API
(create_or_update_file / push_files), bypassing local git entirely. Keep doing
that while the container is flaky: commit/push each file the moment it exists.
