> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Wave 7 UX-audit-residue proposal; overtaken by the July-9 campaign. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Wave 7 — UX-audit residue — APPROVED 2026-07-02

**APPROVED (founder 2026-07-02):** all six buildable-now items, plus both
decisions resolved:
- **Scope = all six** (NU-7, NU-2, NU-6, CL-6.2, CL-6.3, NAV-8), NU-7 first.
- **OB-1 = reframe Welcome as trial-first** (remove the dead Free/Pro toggle;
  honest trial framing; downgrade-to-free path stays; no conflict with the
  locked trial-at-Article-9 rule). Folded INTO Wave 7.
- **CL-6.1 = prepare-not-commit** ("Log another set" opens the set for edit and
  commits on confirm). Folded INTO Wave 7.
- Held separately (unchanged): CL-2 (iOS Live Activity, item 14) and F5 Phase B.

Final Wave 7 build list: NU-7 → NU-2 → NU-6 → OB-1 → CL-6.1 → CL-6.2 → CL-6.3
→ NAV-8. Sequenced after the active Wave 5 build unless the founder resequences.

---

The original proposal (for the record). This was the "present the UX stuff for
approval" ask (founder 2026-07-02). Built from a code-truth verification of every
`audit/02-ux-audit.md` finding and every ranked `06-MASTER-PLAN` item against
branch HEAD (five-agent fleet, 2026-07-02) — status is what the CODE shows,
not what a commit message claims.

## Headline

Waves 1–6 have absorbed almost the whole audit. Of the 30 UX findings,
**26 are fully fixed and pinned**; every ranked A-tier, B-tier, D-tier and
F-tier item is shipped except two founder-gated foundations. What is left is a
small, mostly-polish residue plus two genuine founder decisions.

## Buildable now (no decision needed) — the proposed Wave 7 scope

| ID | Sev | What remains | Effort | Note |
|----|-----|--------------|--------|------|
| **NU-7** | med | The floored hero kcal carries no mark that the ED safety floor raised it (`results.floorApplied` exists, unused, `nutritionEngine.js:956`); calculator warnings stack as identical banners. Add one ranked plain-register explanation + a visible "held at your safe minimum" caption on the hero. | M | **ED-safety-positive** — makes the floor's action legible. Touches safety copy → hands-on, not agent. |
| **NU-2** | high | Applied carb cycle / refeed have no exit: one tap writes `userProfile.macroCycle`/`refeed`, nothing clears them, calorie banking silently disappears. Add a visible "stop the split" / "clear refeed" affordance, expire refeed after its resolved day, explain the suppressed banking row. | M | Food-adjacent; additive UX. |
| **NU-6** | med | kJ display preference still not honoured on the check-in prefill line, the ease-nudge, and the NutritionTargets why/BMR/maintenance readouts. Route them through `formatEnergy`/`energyUnitLabel`. | S | Finishes a partly-shipped item. |
| **CL-6.2** | med | Finish/X are sub-44pt top-corner targets. Grow to ≥44pt effective. | S | a11y touch-target. |
| **CL-6.3** | med | SetEntry weight stepper is fixed 2.5 kg, ignores `exercise.incrementKg`, no hold-repeat. Honour the increment + add hold-repeat (`RestTimer.js:180-193` has the pattern). | M | Core-loop ease. |
| **NAV-8** | low | Four low-sev items: VolumeHeatmap has no loading state; its screen title differs per stack ("Volume" vs "Volume Heatmap"); `EmptyState` is orphaned (1 importer); the dark quiz-first flow has stale "Eight quick questions." copy (renders six) and no back control. | S | Polish; the quiz flow is dark (flag off) so no live impact. |

## Needs a founder decision first (in the proposal, gated on the answer)

| ID | Sev | The fork |
|----|-----|----------|
| **OB-1** | high | Welcome's Free/Pro choice is a dead control; free-intent users are funnelled into the Pro trial. The audit's two directions conflict with a locked rule: (a) honour free intent = skip-to-free onboarding, which **conflicts with `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` (~line 106): trial starts at Article 9**; (b) reframe Welcome as trial-first so the choice is honest and the control is removed. No founder decision is on record — needs one. |
| **CL-6.1** | med | The extra-set "Log another set" commits instantly with carried-forward values. Direction: make it prepare-not-commit — but the A2 commit message treats one-tap logging as intended. Keep one-tap, or switch to prepare-then-confirm? |

## Separately gated — NOT proposed for Wave 7 (listed for completeness)

| ID | Why it is out of scope |
|----|------------------------|
| **CL-2** | iOS Live Activity / lock-screen surface — CLAUDE.md decision item 14 (Live-Activity / Core-Haptics dependency). Its own gated decision; the Swift module is scoped-not-built (`docs/LIVE_ACTIVITY_IOS.md`). Effort L, native. |
| **F5 Phase B** | The legacy→registry sync migration Phase B (~22 tables, fresh watermark namespace, founder-run migrations 099–102, production drift audit). A foundation track, not UX; gated on founder scheduling. Effort L. |

## Recommendation

Take the six buildable-now items as Wave 7 (NU-7 first — it is the
ED-safety-legibility win and the only one touching safety copy, so it is
hands-on). Answer OB-1 and CL-6.1 to fold those in. Hold CL-2 and F5 Phase B
as their own founder-scheduled decisions.
