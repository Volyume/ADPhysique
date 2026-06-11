# START HERE — next session entry point

Written 2026-06-11 at the end of a long build session, as the single clean
hand-off. Read this first. Two companion docs hold the detail:
- `_FOUNDER-DECISIONS-2026-06-11.md` — every founder decision + the full
  per-commit build log (authoritative for "what was decided / shipped").
- `_SESSION-HANDOFF.md` — the index of what the competitive audit produced
  (the 28 blueprints + gap reports).

---

## 1. Where the code is

- **Branch:** `claude/main-branch-content-update-dcqicf` (NOT main — CLAUDE.md
  forbids touching main). Everything below is committed and pushed there.
- **Recovery if the container resets:** the container reset twice during this
  work and rolled local back to an old ancestor. The fix is always:
  `git fetch origin claude/main-branch-content-update-dcqicf` then
  `git merge --ff-only origin/claude/main-branch-content-update-dcqicf`.
  Nothing is ever lost — the remote is the source of truth. Commit and push
  each unit of work the moment it is green.
- **Health gate:** `npm run lint && npm test` after every change. Current
  baseline = **0 errors, 4 pre-existing warnings**, **204 suites / 3159
  tests pass**. If you see more than 4 warnings, you added one.

## 2. Shipped this session (all green, all pushed)

Quick wins + the mandate + the safe slices:
- **COMP-003** quick add from every meal card.
- **COMP-001** workout-screen redesign, steps 1–5 + telemetry + compact rest
  timer. Step 6 CLOSED (founder dropped the logged-set cap).
- **COMP-011** cardio "already counted" explainer (3 surfaces).
- **COMP-002** meal-slot memory ("Add again" tab, `food_slot_recents`).
- **COMP-027 Part A** colour grammar: `stateColors` aliases, the
  founder-approved `warning` retune (#FFC107 → #F0E442 Okabe-Ito), 3 Class
  B/C migrations. Part B (Home TodayStrip reorder) PARKED.
- **COMP-004** "Your trend" weight card on Progress (states 0–3).
- **COMP-018 v0** "weeks running" strip on Progress + the new
  `getDeloadWeeksInRange` query + pure `streak.js`.
- **COMP-012** Welcome trust row + Play "Your data, plainly" block.
- **COMP-010** visible periodisation (block-shape week dots via the meso chip).
- **COMP-022** two slices: deterministic custom-barcode resolution, and the
  OFF write-back relocated to the confirmed save + healing toast.
- Plus: SKU-id doc fix (`pro_monthly`/`pro_annual` are the live ids), and the
  NEW-001 Phase 0 sourcing brief with the 2 MoveKit samples validated.

## 3. Founder decisions locked (do not re-litigate)

- **Billing: FULLY HELD.** No billing-adjacent files. COMP-007 and COMP-025
  Phase B stay research-only.
- **Spend:** UK food layer (COMP-016) **DROPPED COMPLETELY**. Gym Animations
  $599 **DROPPED** (MoveKit ~$99 is the cheaper lead, but NEW-001 is **PAUSED,
  low priority**). Supabase Pro backup **DEFERRED** (maybe future).
- **Colour:** warning retune to #F0E442 — done.
- **NEW-002 training partners: FULLY FREE** (up to 3 partners, all tiers) when
  built.
- **Copy:** approved in principle — build blueprint copy as written, founder
  reviews at PR; locked-doc amendments still come individually.
- **Trial-notification cascade bug:** fix is folded into COMP-023 (not
  standalone).

## 4. What to do next — recommended order

**A. Highest priority — revenue-relevant, do when attended:**
- **COMP-023 day-3 trial moment + the restoreNotifications cascade-wipe fix.**
  The bug is still live: `restoreNotifications` (scheduler.js, called from
  RootNavigator each launch) wipes ALL scheduled notifications and re-lays
  only morning + check-in, so the day-12/14 trial-ending pushes are destroyed
  and never fire. Trial users can reach day 14 with no warning. ~2–2.5 day
  build (notifications + Home banner + the fix together).

**B. On-device visual pass (needs eyes, not unattended):**
- Confirm the new Progress/Home surfaces render right: COMP-004 trend card,
  COMP-010 block-shape sheet, COMP-018 weeks-running strip, COMP-027 warning
  hue across the app.
- **COMP-027 Part B** (Home TodayStrip reorder) — 3–4 day visual rebuild with
  a weigh-in-completion guardrail.
- **COMP-029 light theme** — deps approved (expo-system-ui); needs the
  122-site zero-visual-diff token migration + native rebuild.

**C. Needs founder/engine review before building:**
- **COMP-008 → COMP-015** (survey-diet timing then autoregulation): changes
  the `createWorkout` call path and the timing of coaching-engine inputs.
- **COMP-006 methodology page:** verify every engine claim (2-week cooldown,
  volume matrix, FFM floor) against `weeklyCoach.js`/`whyThisTemplates.js`
  with the founder before merge.
- **COMP-024 cycle smoothing, COMP-026 step TDEE:** coaching-ENGINE algorithm
  changes — founder maths gate + shadow mode required.
- **COMP-030 quiz-first, NEW-002 partners:** locked-doc amendments + DPO.

**D. Free code-only remainder (can be unattended, but visual/copy-gated):**
- **COMP-022 visual layer:** ScanLabel "fix it once" arrival state +
  offline-vs-miss copy, waterfall miss/unreachable tagging, duplicate-barcode
  banner, one-time Diary OFF-consent card.
- **COMP-019 stage 1a:** window chips + recomputed takeaway on the BodyMetrics
  / ExerciseDetail / VolumeHeatmap charts (3-screen visual change).
- **COMP-018 UI follow-ups:** pause control, manual-goal editor,
  ConsistencyScreen "Your weeks" section, milestones — need a synced
  pause/goal table + copy review.
- **COMP-013 plan reveal, COMP-005 recap** — visual.

## 5. Known caveats carried forward

- **COMP-018 deload gap:** `getDeloadWeeksInRange` infers a deload week from a
  completed workout linked to a deload mesocycle_week. A deload week with
  ZERO sessions can't be detected (no workout to link); a single such week is
  covered by the one-week repair. Fine for realistic 1-week deloads.
- **COMP-004:** State 4 (high-confidence maintenance) firms up once COMP-026's
  90-day window prerequisite lands; the Home tap-through door waits on
  COMP-027 Part B.
- **NEW-001 / MoveKit:** samples passed (muted H.264 1080p loops, consistent
  grey model). Two open questions if revisited: no red muscle-highlight in the
  samples, and a baked light-grey background vs the dark theme. Brief +
  8 vendor questions ready in `gaps/new-001-phase0-demo-sourcing.md`.
