# PASS-4 — DEFERRED LEDGER

Per `_AUDIT-SPEC.md:221-228`: gaps not blueprinted now and not dismissed, each with a specific reason. Source:
`pass3-comparison-matrix.md` + `pass3-v2-founder-decisions.md`.

| Gap | Area | Reason for deferral | Trigger to revisit |
| --- | --- | --- | --- |
| Paid curated/verified UK food DB (Nutracheck-grade) | FL/NU | Cost-gated founder decision; we already ship UK supermarket via 3 sources. | Traction / revenue ("I'll pay later if the app takes off"). |
| Velocity/tempo capture | WS/MF | No corroborated market bar gathered (niche). | A research bar confirming demand. |
| VBT (velocity-based training) | WS | No corroborated market bar (niche). | A research bar confirming demand. |
| Mood correlation | (misc) | No corroborated market bar; ABSENT in Pass-1 register. | A research bar confirming demand. |
| Wellbeing-correlation OUTPUT surface | CK | PARTIAL (mode exists, output unconfirmed); no market bar. | A research bar / founder direction. |
| Commission: competitor device-walk (taps/seconds) | WS/FL/ON/NA | Un-sourceable from desk research (NOT-FOUND cells); needs hands-on teardown. | Founder commissions a targeted teardown. |
| Commission: UX/visual "premium-feel" teardown | DE | Subjective; un-sourceable; needs hands-on visual teardown. | Founder commissions it. |
| Plan-library breadth / expert-programme branding | PG | Our-side-measurable (parse `seedRoutines.js`), competitor bar = AGGREGATOR. | A parse + a sourced bar. |
| Exercise-library size benchmark | EL | Our-side-measurable (parse `seedExercises.js`); bar VERIFIED but our count unparsed. | A parse. |

## CARRIED OPEN ITEM (Pass-1, blocks any data-model blueprint)
- **Q1 schema authority** — `setup_complete.sql` (252 cols) vs `schema.sql` (187) vs migrations (114) unresolved
  (`_AUDIT-STATUS-AND-RESUME.md`). MUST be resolved before the **micronutrients/NRV** blueprint (schema migration)
  is finalised. Logged as a NEEDS-ANSWER for that blueprint.
