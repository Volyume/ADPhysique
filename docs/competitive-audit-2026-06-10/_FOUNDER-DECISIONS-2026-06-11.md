# Founder decisions — questionnaire of 2026-06-11

Answers to the decision groups queued in `_SESSION-HANDOFF.md`. These are
binding for the build phase. Anything not listed here keeps its blueprint
default.

## 1. Billing — HOLD ALL BILLING WORK
COMP-007 (annual-first flip + paywall social proof) stays research-only.
Nothing in `src/lib/payments/` or the paywall/upgrade/tier-strip screens is
to be touched. This also holds every billing-adjacent line queued by other
blueprints: COMP-012's paywall footer line, COMP-025 Phase B (store win-back
offers). COMP-025 Phase A (cancel-reason capture, no billing files) is NOT
held.

## 2. SKU-id mismatch — DOCS WERE WRONG, NOW FIXED
Founder confirmed the live Play product ids are `pro_monthly` / `pro_annual`
(what `catalogue.js` ships). `CLAUDE.md` and `docs/rules/billing.md`
corrected this session. No code change.

## 3. Dependencies — ALL FOUR APPROVED
- `@bacons/expo-apple-targets` (COMP-020 watch, COMP-019 widgets/Live
  Activity) — still subject to the issue-#175 go/no-go spike.
- `react-native-android-widget` (COMP-019 stage 2).
- `expo-system-ui` (COMP-029 light theme; native rebuild).
- `expo-video` (NEW-001 demo loops).
Approval covers installation when the owning feature starts, not before.

## 4. Spend — NOTHING APPROVED YET
Founder: "No extra costs yet unless needed gym animations is a bad choice
perhaps." Read as: no money moves now. NEW-001's $599 purchase NOT approved;
its £0 Phase 0 (licensing questions in writing + 30 free-clip validation)
may still run since it costs nothing, and the spend question returns after
Phase 0 results. COMP-016 contracted data-ops (~£4–6k) parked — the
engineering-only parts wait with it. Supabase Pro backup ($25/mo) parked;
the backup/DR brief stays open as a known risk.

## 5. Trial-notification bug — FOLD INTO COMP-023
The restoreNotifications() cascade-wipe bug (day-12/14 trial pushes
destroyed on every launch) is fixed inside the COMP-023 build, not as a
standalone PR. Until COMP-023 lands, trial users may reach day 14 unwarned —
accepted by the founder. Raises COMP-023's build priority.

## 6. Colour — WARNING RETUNE APPROVED
warning `#FFC107` → Okabe-Ito yellow `#F0E442` per COMP-027. One token
change, propagates via stateColors aliases.

## 7. NEW-002 free/Pro split — FULLY FREE
Training partners: up to three partners for ALL users. Overrides the
blueprint's one-free/three-Pro proposal. No Pro gate anywhere in NEW-002.

## 8. Copy + locked docs — APPROVE IN PRINCIPLE
Build with blueprint copy as written (COMP-006 methodology, COMP-015
adjustment lines, COMP-011 cardio explainer, COMP-010 effort vocabulary,
COMP-008 survey strings); founder reviews at PR time only if something
jumps out. Locked-doc amendments (COMP-030 quiz-first, COMP-016
foods.source CHECK, NEW-002 RLS/DPO, backup vs BUDGET_POSTURE_LOCKED) still
come to the founder individually before any amendment is made.

## Resulting build queue (dependency order, billing/spend items removed)
1. **Quick wins:** COMP-003 quick add (~90 min) → COMP-011 cardio explainer
   (copy) → COMP-002 meal-slot memory (~4–6 h).
2. **Mandate:** COMP-001 workout screen redesign (~6 days; unblocks
   COMP-013, COMP-015 slot, COMP-020).
3. **COMP-008 survey diet** (must precede COMP-015) → **COMP-015**.
4. **COMP-023 day-3 trial moment** + the cascade-wipe bug fix (decision 5).
5. **COMP-027 colour grammar/Home** (token migration precedes COMP-029) →
   **COMP-004 daily trend** (precedes COMP-026) → COMP-029 light theme.
6. **COMP-018 streak** (precedes NEW-002) → NEW-002 (fully free).
7. Remainder per the integration map: COMP-006, 012, 013, 022, 024, 025-A,
   026, 010, 005, 009, 019, 020, 030.
Parked pending money/billing: COMP-007, COMP-016, NEW-001 purchase,
COMP-025-B, Supabase Pro backup.
