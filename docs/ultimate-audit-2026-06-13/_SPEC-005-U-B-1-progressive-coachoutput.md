# SPEC — ULTIMATE-005 / M5 (U-B-1 + U-B-3): progressive disclosure of CoachOutput

Status: **AWAITING FOUNDER SIGN-OFF** (touches the deterministic coaching engine = SACRED).
Decisions already taken: 005 approach = **A (engine exposes priority)**; U-B-3 voice = **A (keep engine
coachResponse, drop local headline)** (founder, 2026-06-13).
Source of truth: `ultimate-audit-04-proposals-with-blueprints.md` §U-B-1/§U-B-3; `phase1/04-coaching.md`.
Nothing here is built until this spec is signed off.

---

## 1. Why this is gated (the finding)
U-B-1's hero "main move" must come from the engine's EXISTING priority, not a new screen heuristic. Code check:
`runWeeklyCoach` (`src/lib/weeklyCoach.js`) returns the adjustments as an **unranked keyed object**
(`adjustments: { training, calories, steps, cardio }`, weeklyCoach.js:1264-1269) plus separate
deload/dietBreak/macroCycle/refeed fields — **no priority field is exposed.**

BUT the engine ALREADY computes a deterministic single-winner ladder internally — `whyKeys`
(weeklyCoach.js:1219-1228), highest-leverage first:

```
ffm_floor_hold → rapid_loss_corrected → deload_suggested → diet_break_suggested →
recovery_lagging → push_volume → off_target_cal_up → off_target_cal_down →
steps_bump → on_target_holding
```

It is only surfaced as the prose `whyThisWeek` string, not as a structured "primary adjustment". The fix is to
**expose that existing ladder as a structured field** — surfacing existing logic, NOT a new heuristic.

---

## 2. Engine change (SACRED — the part needing sign-off)
**File:** `src/lib/weeklyCoach.js`, in the output assembly (~1250-1312), reusing the already-computed `whyKeys`.

Add ONE derived field to the returned object, e.g.:

```js
primary: { domain: 'calories'|'training'|'steps'|'dietBreak'|'deload'|null, reasonKey: <the top whyKey> }
```

Mapping (from the EXISTING ladder; deterministic; no new thresholds, no change to WHAT fires):
- `ffm_floor_hold`, `rapid_loss_corrected` → `domain: null` (these are ED-safety; handled by the always-visible
  safety zone, never a collapsible/applyable hero).
- `deload_suggested` → `deload` (apply = handleApplyDeload).
- `diet_break_suggested` → `dietBreak` (apply = handleApplyDietBreak).
- `recovery_lagging`, `push_volume` → `training` (apply = handleApplyTraining).
- `off_target_cal_up`, `off_target_cal_down` → `calories` (apply = handleApplyCalories).
- `steps_bump` → `steps` (apply = handleApplySteps).
- `on_target_holding` → `null` (nothing to apply; hero zone shows the existing "holding steady" lead).

**SACRED guarantees:** deterministic (no AI/randomness); additive derived field only; does NOT change which
adjustments fire, any threshold, or the confirm-then-apply contract; no `src/coaching/safety/` change; floors/
rapid-loss untouched. This is the minimal surfacing of existing logic.

---

## 3. Screen change — U-B-1 (presentation, ungated once §2 is signed off)
**File:** `src/screens/CoachOutputScreen.js`, render block 1553-1810. Reorder into three zones:

- **Hero zone** (top): render the card for `output.primary.domain` — PROMOTE the existing component
  (`TrainingNextWeekCard` / `NextWeekCard` (calories or steps row) / `DietBreakCard`), do NOT build a new card —
  with emphasis + its one-line "why" from `coachResponse`. If `primary.domain == null`, show the existing
  lead/holding state, no hero card.
- **Secondary zone**: the remaining applyable adjustments collapsed under a **"More adjustments (N)"** expander,
  user-expanded; each keeps its existing Apply button + "Applied" chip EXACTLY (confirm-then-apply preserved).
  Reuse `CollapsibleSection` (currently local in `MethodologyScreen.js:101-118) — it must be **generalised to
  accept `children`** (today it only renders a `body` string); extract it to a shared component.
- **Safety zone** (ALWAYS visible, NEVER collapse — hard requirement): `RapidLossAlert`, `HeldDecisionsCard`
  (+ its ED/rapid-loss sub-blocks), and `DietBreakCard`. Pull these into a fixed always-visible group.

**DietBreakCard dual-role (needs a yes/no in sign-off):** the audit lists DietBreakCard as BOTH a hero candidate
and a safety block. Proposed resolution: DietBreakCard renders **once** — in the hero zone when
`primary.domain === 'dietBreak'`, otherwise in the always-visible safety zone; it is **never** placed in the
collapsible secondary. Confirm this is acceptable.

Edge case: single-signal week → hero shows it; "More adjustments" hidden (count 0), not shown empty.

---

## 4. Screen change — U-B-3 (voice = A, decided)
Top zone (CoachOutputScreen.js:1559-1610): **drop the local `buildHeadline` duplicate** (line 1565-1566); keep
the engine `coachResponse` acknowledgement+interpretation lead (1568-1584) + the trend chips (1586-1610). One
narration source. No engine logic change — only which existing narration string renders.

---

## 5. Touch targets + states + gating
- Raise Apply button to ≥44px (`applyBtn`), and share/why/held links to ≥44px (all currently <44px) while these
  cards are being edited.
- LoadingView / InsufficientDataView / LoadErrorView split: untouched.
- Gating: unchanged — Pro via `GatedCoachOutput` at the navigator (RootNavigator.js:152). No in-component tier
  change.

## 6. Test (invariant)
Add to the screen-mount harness: drive an output with a known `primary` (e.g. calories-up) and assert — hero
card present + emphasised; the other adjustments are NOT in the tree until "More adjustments" is tapped; the
safety blocks (rapid-loss / held) are always present. Drive a `primary: null` (on-target) case → no hero card,
no empty expander.

## 7. Build order once signed off
Engine field (§2) → screen zones (§3) → U-B-3 consolidation (§4) → touch targets (§5) → invariant test (§6) →
lint + full suite → commit. Edit-gated, citing §U-B-1/§U-B-3 + this spec.

---
## SIGN-OFF CHECKLIST (founder)
- [ ] §2 engine `primary` derived-field change approved (deterministic, additive, mirrors existing whyKeys).
- [ ] §3 DietBreakCard treated as safety (renders once; never in the collapsible) — confirmed.
- [ ] Proceed to build §3-§6 after §2 sign-off.
