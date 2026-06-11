# Session handoff — competitive audit 2026-06-10

**2026-06-11 update: the questionnaire in "Next session" below has been
answered. `_FOUNDER-DECISIONS-2026-06-11.md` is now the authoritative
record of those decisions and the build queue. This file remains the index
of what the audit produced.**

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
