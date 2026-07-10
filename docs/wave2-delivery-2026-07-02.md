> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Wave 2 delivery report; the wave shipped and the campaign has moved on. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Wave 2 delivery — "The coaching surfaces" (2026-07-02)

Programme: audit/06-MASTER-PLAN.md Wave 2 (founder "Approved" 2026-07-01;
NAV-4 re-home decision delegated and taken: re-home, not retire). Branch
`claude/codebase-audit-docs-pv6mjd`, span `c8a63a2..1fe675c`.
**Verification:** lint clean; full suite **337 suites / 4,929 passing**
(9 pre-existing skips) after the hostile-review fixes.

## Shipped (each its own verified commit)
- **F7** store-subscription hygiene: 23 screens to useShallow, LoggedSetRow
  memo fixed, Toast context memoised.
- **D1** all six mechanical design sweeps (alpha stops, lineHeight→type
  roles ×215, circle()/hair ×91, Chip, EmptyState→Button) — eyeball lists
  recorded in each commit message.
- **B9** deterministic rest suggestions prefilling the builder (frozen table).
- **B3** plateau banner on Home (existing detection, banner-priority stack).
- **F8** per-screen error boundaries (all ~80 screens, consent gate proven
  un-skippable through them).
- **A4** division fingerprint: heatmap markers + routine receipt + exact
  yours-vs-general set diff from the real engine.
- **A5** Progress dashboard: training-load hero, sparkline cards, stacked
  volume bar; free/Pro line unmoved.
- **F11** paper-cuts: wizard survives process death, weight/age explicit
  entry, Article 9 exit affordance (copy awaiting sign-off below), log-weight
  CTA logs weight, focused-only tab pop, failure toasts, water long-press +
  target, Suggested-tab search, onboarding a11y roles.
- **D3** hierarchy passes on WorkoutSummary / NutritionTargets / Home
  (one hero, one amber, real headers; eyeball lists in the commit).
- **A1** the Verdict Screen: honest Apply rows (floor holds explained, pre-tap
  absolutes + true durations, 7-day-trend label, kJ honoured), the primary
  decision as the one elevated hero/amber, worked/off ledger merged, safety
  zone untouched; differential paywall re-homed to Home (free tier, ED/calm
  suppressed before detection, one-banner invariant).
- **Interleaved founder fixes:** trial-start obeys the server (12df777),
  migration 095 trial-resume (incl. stamped-account fix), rest-alert toggle +
  locked-doc addendum, Diary lock tidy, workout dead-band, perk copy.

## Hostile review outcome (1fe675c)
Blocker fixed: the Diary tab's Upgrade CTA was a silent no-op (ProUpgrade
never registered in DiaryStack — pre-existing; now registered + guard).
Majors fixed: 095's resume unreachable for already-stamped accounts; the
draft-restore sex-gate seam clamped. Six minors fixed (fail-toward-purchase,
ED fail-closed on the differential read, rest-alert hydration race, two copy
attributions, impression dedupe, 14-day CTA wording). Clean: ED floors,
consent, determinism, free/pro line, F8 seam, 095 window maths.

## Founder actions
1. **Apply migrations 092, 093, 094, 095** (Dashboard SQL Editor). 095 makes
   deleted-account trials resume; its header has verification steps.
2. **Sign off the Article 9 exit-line copy** (in chat 2026-07-02) and the
   DifferentialBadge "14 days" wording correction before merge to main.
3. Recorded for later decisions: Progress tile-grid "More row" IA;
   RoutineDetail's pre-existing dead split_type read; PlanDetail's
   onboarding-stack HomeTab no-op; B9's "deliberately set 90" nuance;
   B3/ExerciseDetail window alignment; A4 plan-name sniff → persisted marker;
   A5 unbounded getCompletedWorkoutSets on old accounts; two engine-note kcal
   sentences for kJ users (engine read-only this wave).

## Device checklists
Per-item Android (EAS/workflow APK) checklists live in each item's commit
message and agent report; the consolidated walk: Diary lock → Upgrade opens
ProUpgrade; trial start on a reset account → Pro wizard; kill mid-wizard →
resume with sex gate enforced; coach review → one amber verdict, floor holds
explained, kJ honoured; Home → one banner at a time (coach > trial > deload >
phase > plateau > differential/free line); Progress → hero chart + sparks;
heatmap → division markers; builder → suggested rests; a crashed screen →
"Try again" card, tabs alive. ED walks: floor-held Apply shows the hold and
writes nothing; open flag suppresses the differential banner and all weight
asks; safety zone always visible.
