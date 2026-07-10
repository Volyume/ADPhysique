> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Wave 3 delivery report; the wave shipped and the campaign has moved on. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Wave 3 delivery — "Engine evolution" (2026-07-02)

Scope from `/audit/06-MASTER-PLAN.md`: **F9 → B1 → B2 → F10 → B4**, one
engine change in flight at a time, each with deterministic replay
before/after, invariant tests written to fail, adversarial review, and
founder sign-off on deltas. All items delivered; the hostile review ran
twice (the first pass lost 22 verify agents to a session limit and was
resumed to completion: 36/36 agents), and every confirmed finding is fixed
on the branch.

Suite at wave close: **345 suites / 5,053 tests green, lint clean.**

---

## 1. What shipped

### F9 · Compliance tail (`84b46bd`, plus review fallout below)
- Migrations 096 (delete_user_data completeness: **cardio_log**, meal_plans,
  plan_folders, partner rows for both members, partnership tombstone) and
  097 (deletion-log email → salted hash, signature-preserving).
- Honest-failure account deletion: uid-keyed retry marker, VERBOSE_LOGGING
  behind `__DEV__`, sentryScrub reuse in errorLog, https-only recipe import.
- Review fallout fixed after the fact: the retry is now **awaited at the top
  of the sign-in pipeline** (never racing restore), both retry outcomes end
  in a calm sign-out with an explanation, the partial-success alert names
  the true trigger, and migration 098 adds a **server-side deletion sweeper**
  (self-only logging RPC + daily pg_cron sweep, 3-day grace) so users who
  never return still get full Article-17 completion.

### B1 · Adherence-neutral mechanics (`b768aef` baseline → `fdb685f`, delta signed off)
- `computeAdaptiveTDEEAdjustment` consumes the ACTUAL 7-day logged intake
  when a real food diary exists (>= 5 logged days); the bucket estimate
  stands byte-identically otherwise (replay-pinned).
- A skipped check-in no longer freezes recalibration when the diary stands
  in — and per the founder decision after the review, the stand-in now
  requires a completed check-in within **14 days** (`5b8d6a5`), so the
  wellbeing capture (cycle flag, energy score, ED-detector signals) can
  never go structurally dark. One missed week still adjusts: R6's snapshot
  stayed byte-identical through the change.
- Review blocker fixed: the FFM-floor gate falls back to the weigh-in
  series when the profile weight is null (`de095d8`) — the floor is no
  longer conditional on profile health. Reviewer repros are regression
  tests, written to fail first.

### B2 · Readiness-informed session adjustments (`31b760c`)
- Frozen `READINESS_RULES` table, downward-only by construction
  (2,000-case seeded fuzz), display-only (plan and logged sets never
  written), dismissible per session.
- Review fallout fixed (`2206c52`): the readiness line leads the surface
  when its lower target supersedes a COMP-015 add; the restore button names
  the coach's target honestly; the dismissal now lives on the active
  workout object and survives remounts and crash restores.

### F10 · Engine hygiene (`5f05f48` + EN-4 `aac0b0c`/`f3eb3d2`, delta signed off)
- EN-5: injectable `nowMs`, read once at `runWeeklyCoach` entry, threaded
  through every time-anchored read; robustTrend helpers take the same
  parameter. Identical inputs now give identical outputs at any wall time.
- EN-8: the weigh-in confidence gate counts distinct local days (hold-more-
  only by construction).
- EN-11: DST-safe block status via a shared `localDaysElapsed`; plus the
  review's NaN guard (unparseable stored start date reads week 1).
- EN-4 (founder rulings): recomp is coached at its own **−0.125 %/wk** under
  the "Hold muscle, lose fat" label (no cut levers — test-proven against a
  fixture holding every entitlement); the dead `agg_cut`/`mod_cut`
  vocabulary is deleted, taking the unreachable fortnightly refeed and the
  cardio interval boost with it. No stored user can hold the dead keys
  (verified to the first commit); unknown keys still fall back to
  maintenance. The phaseVocab replay corpus records the before/after.

### B4 · Contest-prep countdown (`71bb198`, built under the approved ED review)
- Pure date-injected `contestCountdown.js`; weeks-out line + process-only
  checkpoints (posing, kit, logistics, admin — no body checkpoint exists in
  the file, test-banned).
- Show date lives on the existing `peak_week_plans.show_date` column (its
  first writer — **no schema change**); optional validated field on
  ProGoalSetup for competition divisions only.
- CoachOutput renders a neutral card BELOW the held-decisions safety shelf;
  any ED flag, calm mode, SCOFF, or failed wellbeing read hides every
  surface (fail closed, source-pinned); no notification touches it.
- Urgency vocabulary blocklist and purity (no clock reads, no prep maths)
  are test-enforced: `contestCountdown.test.js` + `.surfaces.test.js`.

### Alongside the wave
- `/audit/03b-motion-materials.md` — motion & materials research (founder
  brief): no Reanimated upgrade prerequisite; dead-tap census; token layer;
  adoption order.
- `docs/f5-legacy-sync-plan-2026-07-02.md` — verified F5 plan; founder chose
  the **two-phase cutover**; four confirmed mixed-fleet hazards are blocking
  constraints with agreed mitigations; Phase A is the next build.
- Trial-resume migration 095 and the ProUpgrade client fix (pre-wave,
  founder-tested).

## 2. Hostile review record

Two-lens adversarial verification over the full Wave-3 diff.
**11 confirmed findings — all fixed** (1 blocker FFM floor, 1 blocker 096
cardio_log, 4 majors deletion-retry/stand-in, 5 minors B2 display/dismissal,
cycle-flag reachability, mesocycle NaN). **5 refuted** by verifiers.
**43 areas verified clean**, including: every ED senior gate live on the B1
path, B2's downward-only invariant at every seam, EN-5's single clock across
the whole dependency graph, additive/idempotent migrations, and no em dashes
or US spellings in user-facing copy.

The cycle-flag reachability finding (minor) is closed by the founder's
14-day window decision: a user who stops checking in entirely returns to
the freeze, so the flag can never be structurally unreachable for long.

## 3. Founder actions (in order)

1. **Apply migrations 092–098 to EU-Dublin** (SQL Editor, in numeric order).
   095 fixes the trial-resume loop you device-tested; 096 now includes
   cardio_log; 098 installs the deletion sweeper (pg_cron; if the extension
   is unavailable the migration says so and the sweep can be run by hand).
2. Confirm the Google Play OAuth SHA-1 (outstanding from earlier).
3. Copy sign-offs still open from earlier waves: Article 9 exit-line
   ("What if I don't agree?") and the DifferentialBadge trial wording.
4. F5 Phase A lands next on this branch; its founder-run migrations
   (099+, starting with the production drift audit) will come with it.

## 4. Physical-Android checklist (workflow APK from this branch)

1. **Recomp coaching (EN-4):** profile on Recomp → CoachOutput header reads
   "Hold muscle, lose fat"; a steady weight trend reads on-target; no
   calorie adjustment is offered in either direction from weight alone.
2. **Countdown (B4):** Goal setup → competition division → "Show date"
   field appears; enter a future date, save → CoachOutput shows the quiet
   weeks-out card BELOW any held decisions, with a process checkpoint.
   Enter `2026-02-31` → calm validation message, nothing saves.
3. **Countdown ED gate (B4):** with a test profile's SCOFF ≥ 2 (or an open
   ED flag, or calm mode on) → the countdown vanishes from every surface.
4. **Stand-in window (B1):** skip the check-in two weeks running while
   logging food daily → the coach holds calories with the "not tracked"
   reason. Skip only one week → it still adjusts.
5. **Readiness dismissal (B2):** answer "below par" → targets ease; tap
   "Use planned targets instead" → back out to Home mid-workout → resume →
   targets stay un-eased for the rest of the session.
6. **Deletion honesty (F9):** delete the account in airplane mode after the
   Edge Function fails → the alert says sign-in details are removed only if
   you sign in again. Sign in again → you are signed straight out with the
   completion message and the account is gone.
7. **Rapid-loss guard unchanged:** log a fast-loss week with low energy on
   a cut → calories go UP with the protective note (never a cut).

## 5. Where the next work stands

- **F5 Phase A** (two-phase cutover, founder-approved): legacy pulls become
  deleted_at-aware and legacy pushes stop re-stamping timestamps; no
  behaviour change for old data; spec in the F5 plan doc §2 mitigations.
- **Wave 5 approved scope:** C5 Training Partner v2 + C2 Micronutrients/UK
  NRV (MN-1). PLAN-FIRST documents to come after Wave 4's F5 phases are
  under way.
- Current-state dossier (external-strategist brief) is finishing in the
  background and will land as CURRENT-STATE-DOSSIER.md.
