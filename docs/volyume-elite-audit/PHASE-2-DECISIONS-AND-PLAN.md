# Phase 2 — Founder Decisions & Execution Plan

**Date:** 2026-07-04. **Status:** approved to build. Decisions below are the
founder's, made 2026-07-04; this file is the contract the build works to.
Source audit: this folder (`docs/volyume-elite-audit/`).

---

## Founder decisions (recorded verbatim in intent)

| # | Fork | Decision | Source doc |
|---|------|----------|-----------|
| D1 | Sequencing | **All three waves in parallel** (lights-on + one-product + integration together) | 10 |
| D2 | Paywall proof slot | **Hold for real consented quotes** — do NOT build a placeholder; the slot stays empty until the founder supplies quotes. (The separate `paywall_shown` telemetry is still wired.) | 08 / O4-PW1 |
| D3 | Component roll-out | **Big-bang codemod all 95 hand-rolled boxes → `Card`** across the whole app, one coordinated pass + a lint rule banning new inline surface boxes | 03 / O1-F1 |
| D4 | Progress Photos return loop | **LOOP-3 milestone-adjacent** — an opt-in, dismissable "add a photo if you'd like" offered on a TRAINING win (PB / N-session streak), anchored to competence never appearance, suppression-gated | 05 / O5 |
| D5 | Partners depth | **A + B together** — mutual weekly intention (shared kept-moment) + warmer reciprocity (fixed no-shame acknowledgement set, "partner joined" push, reconnection surface) | 06 / O6 |
| D6 | Photo backup | **Honest warning only** — a one-time "device-only, not backed up" notice; no export path built | 05 / O5-F5 |

## Decisions I am leading on (conventional defaults, reversible; stated, not silently taken)
- **Photo data model:** additively snapshot the goal + mesocycle-phase *label* at
  capture, device-local only (same posture as the weight snapshot) — cheap,
  future-proofs context. (O5-F3.)
- **Partner accept-signal push** is part of D5 (the B bundle).
- **Coach awareness of photos:** the LOOP-3 prompt is the integration point; no
  separate coach-output affordance unless it emerges naturally.

---

## D4 is safety-critical — SPINE work, designed hands-on (not delegated)

LOOP-3 is a photo-capture prompt. The audit graded it **MODERATE ED risk,
framing-dependent** — "any prompt-to-photograph-your-body can read as pressure."
Per the agent-tier rule (ED-safety-adjacent = Fable main loop, hands-on), the
**exact framing, copy, trigger conditions and suppression** are designed by Fable
directly, before any code is delegated. Non-negotiable guardrails:
- Triggered ONLY by a *competence* event the app already celebrates (a PB, an
  N-session streak) — **never** a weight/body/appearance event.
- Copy is competence-anchored ("mark this moment if you'd like"), never
  appearance ("see how you're changing").
- Strictly opt-in, one-tap dismiss, **"don't ask again"** honoured permanently.
- Fires through `usePhotoSuppression` — withheld entirely under calm mode or an
  open ED flag, fail-closed on any read error.
- Never rewards frequency, never shows a streak, never manufactures a before/after.

## D5 also has safety/voice-locked surfaces — framing hands-on, build delegated
- The mutual-intention copy must be **intention not obligation** ("aim," never
  "must"), each vs their *own* aim (never cross-person comparison), and never
  "don't let them down." Framing designed hands-on; the additive schema/UI/push
  build is delegated with a tight spec + Fable review.
- The acknowledgement set is **fixed, pre-written, no-shame**, curated through the
  locked coaching voice — authored hands-on.

---

## Execution architecture (collision-safe partitioning)

"All three in parallel" is honoured at the program level; individual file edits
are partitioned so no two agents touch the same file. Three tracks:

### Track A — Lights-on (Wave 1). Disjoint from UI surfaces.
- `paywall_shown` on PaywallScreen + CascadeGate mount + allow-list migration
  (Sonnet; billing-adjacent → Fable review).
- `feature_locked_viewed` event + `ProGate.js` a11y labelling (one Sonnet task —
  same file) + catalogue + migration.
- Exhaustive Pro-screen gating test (Sonnet).
- Article 9 consent-gate behavioural test / documented pin (Fable hands-on — GDPR).
- CI: add `typecheck` + `check:imports` to `main-ci.yml` (Haiku).
- **Note:** telemetry code + migration files are built now but only *land* when the
  founder applies the migrations (D2/P0-1).

### Track B — Big-bang `Card` codemod (Wave 2). ~85 files.
- Domain-batched Sonnet agents on **disjoint** file sets (food / plans / progress /
  settings-you / misc), **excluding** every file Track A or Track C edits
  (PaywallScreen, ProGate, Photos modals, Partner surfaces, LOOP-3 targets).
- Plus a lint rule banning new inline `colors.surface` boxes.
- Those excluded surfaces get their `Card` adoption *natively* inside Track C's
  rewrite, so the codemod and integration never collide.

### Track C — Two organs (Wave 3). Photos + Partners files.
- **Photos:** LOOP-3 (framing hands-on → build delegated), honest backup warning,
  additive goal/phase snapshot, and the Photos surfaces' `Card`/`BottomSheet`/
  haptic adoption (built Card-native here, not via the codemod).
- **Partners:** A+B (framing/copy hands-on → additive migration + UI + push
  delegated), plus the Partner surfaces' component adoption.

### Sequencing within the parallelism
Every track runs, but each change lands only through: Fable review → `npm run lint
&& npm test` green → per-feature commit → push. Safety-adjacent design (D4, D5
framing, consent test) is Fable-hands-on and precedes the delegated builds it
governs. Nothing merges on a red suite.

---

## Founder actions still outstanding (only the founder can do these)
1. **Apply migrations `092–102` to EU-Dublin** (staging first) — turns telemetry
   live; also lets the D4/D5 mechanics be tuned against real data later.
2. **Device-verify the iOS Live Activity** on a TestFlight build (suspected P0).
3. **Supply consented paywall quotes** when ready (D2) to fill the proof slot.
