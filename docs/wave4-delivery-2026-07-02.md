> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Wave 4 delivery report; the wave shipped and the campaign has moved on. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Wave 4 delivery report — "Scale and bets" (2026-07-02)

Branch: `claude/codebase-audit-docs-pv6mjd`. Suite at delivery: **355 suites,
5,161 passing (5 deliberately skipped)**, green under both parallel jest and
the release gate's `--runInBand`; `tsc --noEmit --strict`, `eslint` and
`check:imports` all clean. Every feature below went through a fresh-eyes
adversarial review against its blueprint; every confirmed finding is fixed
and landed. Sources: `audit/06-MASTER-PLAN.md` (wave scope),
`audit/01-codebase-audit.md` (PR-2/PR-3/UI-7, SD-3/4/7/8/9),
`audit/05-enhancements.md` (§B5/§B6/§B8), `docs/f5-legacy-sync-plan-2026-07-02.md`.

---

## 0. The CI break (fixed)

The Android workflow had been red since the M1 push. Not the app: the
release gate's jest run. Two causes, both fixed in `3fd0a0b`:

1. **Virtual-mock resolver poisoning.** `screen-mount.test.js` mocked
   twenty-one INSTALLED modules with `{ virtual: true }`. A virtual mock on
   a resolvable module poisons Jest's worker-level resolver cache, so every
   suite running later in the same process fails to intercept those modules
   with its own mocks. The gate runs `--runInBand` (one process), making
   the poisoning deterministic on CI while parallel local runs usually
   dodged it — this also retroactively explains the "unexplainable"
   ShareCard flake that forced the 2026-06-30 quarantine. All virtual flags
   on resolvable modules are gone (three files); the rule is recorded in
   screen-mount's header.
2. **A stale guard regex**: `plateauBanner.guard` pinned the Home plateau
   banner's navigate without the `initial: false` the F6b review fix added.

Process change adopted: **the pre-commit gate is now the full suite under
`--runInBand`** (CI's semantics), not the parallel run — parallel scheduling
can hide order-coupled failures, which is exactly how the review-fix pushes
went red without my local runs noticing.

## 1. What shipped

| Item | Commits | One line |
|---|---|---|
| F5 Phase A | a3e0d57, eaee7c8, 702eca6 | Per-call Article 9 + sign-out-wipe transport guards; honest `updated_at` on all bulk push mappers; tombstone-aware legacy pulls (no-op until Phase B) |
| F6b | 6c9f8c0, cd28f51 | Default-lazy tabs + all ~80 screens deferred to first render; `initial: false` on all 24 nested cross-tab navigates |
| B8 | b9f1877, 4208d96 | Keep-awake (focus-scoped, per-instance tag), deterministic warm-up ramp (pull-only), rebuilt plate calculator (kg-only, quarter-kg exact) |
| B5 | 6f7e9ad, f4111e0 | Coach handover report PDF with ED-neutral variant, SCOFF in the suppression trio, disclosure-filtered prose |
| B6 | ddb8104, b830076 | Side-by-side photo compare, local-only, neutral copy pinned; stale-modal hardening |
| Debt #38 | bd2ed27 | ShareCard press suites un-quarantined with wait-for-effect polling (skips 9 → 5) |
| Review fixes + guards | cd28f51…b830076 | Everything §2 confirmed, plus new source guards (lazyScreens, gymBasics, sync.legacyForwardCompat) |

Wave 6 items M1–M3 (Button haptic, PressableCard on Reanimated, motion
fit-rule guards) also landed in this window and get their own review at
Wave 6's close.

## 2. Review outcomes (five hostile reviewers)

- **F6b — SHIP WITH FIXES → fixed.** Blocker: lazy tabs made nested
  cross-tab navigates REPLACE a never-focused tab's root (day-14
  CascadeGate would have swallowed the You tab; notification taps the
  same). All 24 sites now carry `initial: false`, guard-pinned, including
  the notification-tap navigate directly. Guard evasion holes (quote
  styles, multi-line imports, other files) closed.
- **B8 — SHIP WITH FIXES → fixed.** Ramp lost its working weight on
  first-time exercises (now anchored per exercise); case-sensitive
  equipment checks missed custom 'Barbell'/'Smith Machine' rows (now
  case-insensitive); ramp hidden mid-cluster (one-tap path could mislog a
  cluster as a warm-up); per-instance keep-awake tag; NaN/off-grid input
  hardening in both pure libs.
- **B5 — SHIP WITH FIXES → fixed.** Blocker: the full variant rendered
  persisted engine prose that disclosed SCOFF results, since-cleared
  safety lockouts and cycle flags to whoever receives the PDF. Fixed
  report-side, engine untouched: SCOFF ≥ 2 joins the neutral trio
  (fail-closed body-profile read), safety-hold decision types are dropped,
  and ALL full-variant prose passes a disclosure filter that the suite
  cross-checks against the engine's actual reason strings. Also: the
  missing 'reduce' signal (every volume-pull-back decision was silently
  dropped), cardio + diet-break decisions now render, em dashes out of the
  PDF copy, honest fail-closed wording, ≥14-day span for the weekly-rate
  row, share-sheet-unavailable feedback.
- **B6 — SHIP → hardened.** No blockers; stale-`compareOpen` insurance and
  the selection-bar copy joining the banned-vocabulary scan.
- **Constitution sweep — one violation (the B5 em dashes, fixed), near
  misses fixed** (untested F5 behaviours now guard-pinned; inaccurate
  comment corrected). Engine, ED-safety, billing, schema, dependencies,
  identity and gating untouched across all Wave 4 commits — verified
  per-commit.

## 3. Founder decisions requested (multi-answer)

**Q1 — B5 report row for free users.** The row sits in Settings → Your
data, visible to all tiers. A never-Pro user gets a training-only PDF; a
LAPSED Pro user gets a fresh formatted artefact from their Pro-era coaching
data. The same screen already exports ALL data (JSON backup) ungated, and
the footer promises "Your data is always yours".
- (a) **Leave ungated (recommended)** — it is data portability, the backup
  already exposes strictly more, and the report's safety logic is
  tier-blind.
- (b) Gate the row behind Pro; free/lapsed users rely on the JSON backup.
- (c) Keep ungated but reword the row neutrally ("Data report (PDF)").

**Q2 — B5 neutral variant still shows the daily kcal target and steps
targets.** This matches in-app calm-mode behaviour (targets stay visible)
and "no rate/weight emphasis" as written, but this PDF goes to a third
party.
- (a) **Keep targets in the neutral variant (recommended)** — prescriptions
  are not rate/weight emphasis, and a GP arguably needs them.
- (b) Drop kcal (keep macros/steps).
- (c) Drop the whole targets section under neutral.

**Q3 — B5 full-variant redaction breadth.** I dropped ALL safety-hold rows
(ED lockout, clearance, FFM floor) and any prose matching the disclosure
vocabulary, in the artefact only — the in-app held-decisions card is
untouched. A clinician handover arguably WANTS the FFM-floor context.
- (a) **Keep the conservative redaction (recommended)** — the user can tell
  their clinician anything themselves; the app must not out its inferences.
- (b) Keep FFM-floor rows (nutritional safety, not screening) but keep
  SCOFF/lockout/cycle redacted.
- (c) Wider: also drop the held-decisions section entirely from the PDF.

**Q4 — em-dash lint gap.** The lint rule only covers `src/screens` and
`src/components`; user-facing strings in `src/lib` (PDF/report copy) slip
through — B5 proved it. The B5 artefact is now pinned by its own test.
- (a) **Extend the eslint rule to `src/lib` string literals (recommended)**
  — I would apply and fix any existing hits in a small follow-up.
- (b) Leave as-is; per-artefact tests carry it.

Still open from earlier: the M1 haptic style (selection-on-onPress vs the
audit's press-in impact) and the motion retimes both await your device
verdict from the next green build.

## 4. Founder actions

1. **Apply migrations 092–098 to EU-Dublin** (manual, in order; each is
   additive + idempotent with a header note). 098 is the deletion sweeper
   (requires pg_cron; see the migration header).
2. **Google Play OAuth SHA-1** confirmation (outstanding from Wave 3).
3. **The next green CI build includes new native modules**
   (expo-keep-awake, @gorhom/bottom-sheet): install THAT APK for all
   checklists below — an older build will crash on the keep-awake import.
4. Article 9 exit-line copy + DifferentialBadge wording sign-offs
   (outstanding from earlier waves).

## 5. Physical-Android checklists (from the next green build)

### F6b — lazy navigation (most important: the money paths)
1. Fresh app kill. Cold-open. **Expect:** Train renders normally; first
   tap on each of the other four tabs shows its root (Plans/Diary/
   Progress/You), with at most a brief first-tap pause per tab.
2. Fresh app kill. Tap a weekly check-in notification WITHOUT opening the
   You tab first. **Expect:** the check-in opens; back returns to the You
   root; the You tab still shows You afterwards.
3. On Home, tap a coach/plan banner that deep-links to another tab (e.g.
   the phase banner → Nutrition targets). **Expect:** target screen opens
   with a back button; back lands on the target tab's ROOT, not Home.
4. First open of the barcode scanner after cold start. **Expect:** camera
   opens (vision-camera evaluates here now; a short first-open delay is
   the accepted trade).
5. Re-press an already-focused tab deep in a stack. **Expect:** pops to
   that tab's root (unchanged NAV-5 behaviour).

### B8 — gym basics
1. Start a session (barbell exercise). Leave the phone untouched past your
   screen-timeout. **Expect:** screen stays on while the logger is open.
2. Switch to the Diary tab mid-session, wait past timeout. **Expect:**
   screen sleeps normally (keep-awake is logger-focused only).
3. Exercise ⋯ menu → Warm-up ramp with 100 kg in the entry. **Expect:**
   bar × 10, 40 × 5, 60 × 3, 80 × 2. Tap a row: it loads into the entry
   marked Warm-up; log it; reopen the ramp. **Expect:** the SAME ramp to
   100 kg, not one computed from the warm-up weight.
4. Custom exercise with equipment "Barbell" (created via the picker), 40
   kg. **Expect:** ramp starts with the empty-bar row; no row below 20 kg.
5. ⋯ → Plate calculator on a barbell lift, target 100, bar 20. **Expect:**
   "1 × 25, 1 × 15" per side, "Loads exactly 100 kg." Target 61:
   **Expect:** "1 × 20" per side and "Closest bar load is 60 kg, 1 kg
   short of the target."
6. Dumbbell exercise ⋯ menu. **Expect:** Warm-up ramp present, Plate
   calculator absent. Duration/reps-only exercise: both absent.
7. Start a myo-reps cluster. Open ⋯ mid-cluster. **Expect:** no Warm-up
   ramp option until the cluster finishes.
8. ED-safety adjacency: none of B8 touches food/weight; confirm no
   coaching copy appears anywhere in the two sheets.

### B5 — coach handover report (Pro account with coach history)
1. Settings → Your data → Coach handover report (PDF). **Expect:** share
   sheet opens with a PDF: training summary, weight trend, current
   targets, weekly decisions with written reasons, held decisions.
2. In the PDF: **Expect:** no em dashes; weeks with a volume pull-back
   show "Volume pulled back" WITH its reason; cardio and diet-break rows
   render where they happened; no sentence mentioning wellbeing screens,
   cycles, lockouts or safety floors anywhere.
3. Settings → wellbeing → calmer experience ON → export again.
   **Expect:** the neutral variant — no Weight trend section, no calorie
   rows, no phase line, no written reasons; targets and training facts
   only; NOTHING explains why it is reduced.
4. Free account: **Expect:** the row works and produces a training-only
   report (pending Q1 this stays ungated).
5. Fresh account with no data: **Expect:** calm "Nothing to report yet"
   alert, no share sheet.

### B6 — photo compare (Pro, Progress photos)
1. With 0–1 photos: no Compare button. With 2+: Compare appears.
2. Choose two → Compare. **Expect:** older LEFT ("Earlier" + date), newer
   RIGHT ("Later" + date); dates are the only numbers anywhere.
3. Third tap replaces the EARLIEST choice; tapping a chosen photo
   unselects it.
4. Two 12MP+ photos, open/close compare five times. **Expect:** no crash,
   no blank panes.
5. Calm mode ON: **Expect:** the longer privacy note, identical compare
   behaviour, zero body/change commentary.
6. Reduce motion ON: compare appears with no fade; Android back closes it.

### CI (founder-visible)
1. The workflow run for `b830076` (and every push after) should go green
   end-to-end and attach APK + AAB artifacts. If the jest gate fails
   again, the failure is real — the order-coupling class is fixed and
   guarded.

## 6. What Wave 4 deliberately did NOT do

- F5 Phase B (registry migration, tombstone writes, LWW re-pull,
  migrations 099+) — awaits the prod drift audit + founder scheduling.
- C3 (widgets/Wear) — listed under Wave 4 in the master plan but not in
  the founder-approved cut; untouched.
- The pre-existing edit-mid-cluster fragility in ActiveWorkout (B8's
  review aggravation is mitigated; the root cause is reported, not fixed).
- `getCoachOutputHistory` lacks a `deleted_at` filter (pre-existing,
  Phase B scope).

Next: **Wave 6 M4** (CoachOutput Apply state morph — the NU-3 "held at
your safe minimum" repair, safety-adjacent, hands-on), then M5–M9; Wave 5
(C5 + C2) planning after that.
