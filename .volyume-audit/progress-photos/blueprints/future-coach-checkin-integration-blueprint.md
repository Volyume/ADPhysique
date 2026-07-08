# Future Coach and Check-in Integration Blueprint for Progress Photos

Author: Fable. Inputs: `phase-1-code-audit.md` §7, scout 07, the scoring blueprint (governing),
and the external research file §6. This blueprint describes FUTURE work only.

---

## 1. Executive recommendation

Progress photos and scans are **not linked to coach decisions or check-ins**. `runWeeklyCoach`
inputs, `weekly_checkins` columns, the body-metrics log, `coachApply`, `planEngine`,
`blockAdvisor` and persisted `coach_outputs` are all scan-free, pinned by guard tests (Phase 1
§7). One display-only exception exists today: the "Progress photo context" card on
`CoachOutputScreen`, matching the founder-pre-approved design in
`audit/progress-flagship/stage3-blueprint-approval-gate.md`, carrying `affectsTargets: false`,
never persisted, ED/calm suppressed. **Founder confirmation is required** that this card remains
approved; this blueprint treats it as the ceiling of CURRENT integration.

The integration proposed below is **future work, permitted only after** the scoring blueprint's
launch-critical items land (anchor gating, rendered confidence contract, receipts, duplicate
defence) and its Tier 1 validation completes. Anything touching decision confidence additionally
requires Tier 2 validation and an explicit founder unlock. Until then, the forbidden list in §4
is absolute.

## 2. Integration principle

**Photo and scan data must not directly or indirectly change calories, macros, refeeds, diet
breaks, or training decisions until the scoring system is validated (Tier 2) and deterministic
coach rules explicitly allow it, each rule individually founder-approved and guard-tested.**

Corollaries:
- The deterministic engine's input contracts stay scan-free by default; adding any scan field is
  a founder-gated schema event, never a refactor side-effect.
- Integration extends the existing resolver-outside-the-engine pattern
  (`progressScanCoachResolver.js`, `affectsTargets: false`, `usedFor` self-labelling). No second
  mechanism is ever built.
- Every surface that shows scan-derived content states, in the copy itself, whether the scan was
  used in the decision (today the answer is always no).
- All of it is tier-blind on safety, ED/calm suppressed fail-closed, and deterministic.

## 3. Allowed future uses

In dependency order (each requires the previous stage to be stable):

1. **Check-in context (display)**: the weekly check-in review shows the latest valid scan
   receipt beside logged weight/intake, clearly labelled context. No fields written to
   `weekly_checkins`.
2. **Visual progress note**: the check-in summary can include the scan's trend sentence
   (comparable sets only, Moderate+ confidence), same resolver pattern.
3. **Consistency check against weight/measurements (display)**: a deterministic
   agreement/disagreement statement ("your scan trend points the same way as your weight trend"),
   never a target input.
4. **Coach receipt context**: the existing Coach-screen card, extended with the scoring receipt
   (why the scan was or was not usable this week).
5. **User reflection prompt (calm, optional)**: at check-in, "Your photos from this block are
   ready to compare" — no score pressure, suppression-gated.
6. **Flag for manual review**: a scan/weight conflict can suggest the USER reviews their logging
   (e.g. weigh-in conditions), phrased without blame.
7. **Confidence-gated supporting signal (Tier 2 + founder unlock ONLY)**: a strong multi-scan
   trend may, at most, support HOLDING a decision the validated data already supports (e.g.
   resisting an unnecessary deeper cut during recomposition, mirroring the stage3 blueprint's
   intent). Never initiating a change; only corroborating a hold.
8. **Trend support only**: any signal use is trend-based (3+ comparable scans); single scans are
   permanently display-only.

## 4. Forbidden future uses

Absolute until Tier 2 validation AND a specific founder unlock per rule; the starred items are
forbidden permanently:

- Automatic calorie changes from a photo score, in any direction, of any size.
- Macro changes from a single scan, or from any scan data below High confidence.
- Training-volume, refeed, diet-break, or deload changes driven by scan data.
- *Body-fat claims from photos, with or without validation, anywhere user-facing.
- *Score-based shame, ranking, comparison with other users, or urgency mechanics.
- Hidden target changes: any target that differs because of scan data must say so in the receipt;
  since scan-driven target changes are themselves forbidden, any detected influence is a bug.
- Low-confidence or withheld scans influencing ANY surface beyond their own receipt.
- *Overconfident coach language about photos ("your photos prove", "your body fat dropped").
- Scan data entering the ED-pattern detector as a risk INPUT without its own safety review
  (wellbeing is a locked system; nothing here touches it).
- Writing `bodyFatSource: 'photo_scan'` into the body-metrics log automatically. The
  `nutritionEngine` allowlists (`isAuthoritativeBodyFatSource` excludes `photo_scan`) stay as-is
  permanently; that is the load-bearing safety boundary and it is already tested.

## 5. Deterministic check-in assistance model

States and contracts (all deterministic, all receipt-carrying). "Decision confidence" refers to
the coach's own confidence caption about its weight/intake-based decision; scan data may never
change targets in any state.

| State | What the user sees | What Coach may say | Affects decision confidence? | Affects targets? | Required guardrail |
|-------|--------------------|--------------------|------------------------------|------------------|--------------------|
| No scan ever | Nothing scan-related | Nothing | No | No | No nag to scan |
| Scan missing this window | Optional quiet line: "No photo set this period." | Nothing, or the same neutral line | No | No | Never framed as a lapse or streak break |
| Scan available, low confidence | Receipt: low confidence + reasons | "Your recent photo set could not be read with confidence, so it was not used." | No | No | Low tier hard-excluded from all logic |
| Scan withheld | Withhold receipt | "No usable photo read this week. Your plan comes from your logs as usual." | No | No | Withheld = identical to absent, tested |
| Scan supports weight trend | Agreement line + receipt | "Your photo trend points the same way as your weight trend. Targets are set from your logs." | Tier 2 + unlock only: may corroborate the existing caption one step | Never | Corroboration capped at one step; guard test |
| Scan conflicts with weight trend | Calm conflict note | "Your photo trend and scale trend disagree this week. The coach used weight and intake for the decision and kept the scan as context." | No | No | Conflict can never weaken the logged-data decision |
| Scan inconclusive | "Inconclusive" receipt | "The photo read was inconclusive, so it was set aside." | No | No | Inconclusive = absent |
| Strong multi-scan trend (3+ comparable, Moderate+) | Trend line + receipt | "Across three comparable photo sets, visual change supports what your logs already show." | Tier 2 + unlock only | Never | Trend window rules from scoring blueprint §7 |

## 6. Conflict handling

Weight trend vs scan trend, deterministic rules:

- **Weight and intake always win for decisions.** They are logged, validated, higher-frequency
  data; the external evidence (research §6) is unambiguous that photos support and never
  overrule logged data.
- **Scan is context in every conflict.** A conflicting scan never softens, delays, or reverses a
  targets decision; it appears only as the calm conflict receipt.
- **Recomposition case**: when weight is flat but a strong multi-scan trend plus strength data
  suggest recomposition, the coach may SAY so as context ("flat scale with visual change can
  mean recomposition") and, at Tier 2 + unlock, corroborate holding an already-justified pause on
  further cuts. It never initiates a surplus/deficit change.
- **More data needed**: fewer than 3 comparable scans, or any Low tier in the window → the scan
  side of the comparison is simply "not enough photo data yet"; no conflict is declared.
- **Explanation style**: one sentence, no blame, no urgency, states the hierarchy plainly:
  "When photos and the scale disagree, the coach trusts your logged trend and keeps the photos
  as context."

## 7. Coach receipt examples

Deterministic, non-chat copy (British English, no em dash):

- "Your scan was not used this week because the lighting changed between sets."
- "Your scan supports your weight trend, so the coach kept targets steady for the reasons above."
- "Your photos suggest visual progress, but calorie targets are unchanged because your logged
  trend is already in range."
- "Your scan and scale trend disagree, so the coach used weight and intake for the decision and
  kept the scan as context."
- "No usable photo set this period. Your plan comes from your logs as usual."
- "Across three comparable photo sets, visual change supports what your logs already show.
  Targets were set from your logs."
- "A photo set was saved but not scored. That has no effect on this week's targets."

## 8. Data interface needed later

Extend the bounded-summary shape the stage3 blueprint already specified and the resolver already
consumes; one interface, versioned, read-only:

```
ProgressScanCoachEvidence v1 {
  source: 'photo_scan',
  scanId, capturedAt,                  // epoch ms
  score, band,                          // display fields only
  confidenceTier,                       // high | moderate | low | not_enough
  validityStatus,                       // scored | scored_downgraded | withheld | baseline | not_comparable
  withholdReasons: [codes],
  captureQuality: { lighting, blur, framing, pose, segmentation, tiltDegrees },
  baselineScanId | null,
  trendWindow: { count, spanDays, direction, magnitudePoints, comparableOnly: true },
  setupFindings: [stability codes],
  usedFor: 'visual_trend_context_only', // widens ONLY via founder-approved enum additions
  affectsTargets: false                 // hard-coded false until Tier 2 + unlock
}
```

Rules: no body-fat fields ever (the resolver already nulls ranges; keep); the engine never
receives this object (it goes to display/receipt layers only, until an unlock adds a SPECIFIC
named field to a SPECIFIC engine input with its own tests); `affectsTargets` flipping requires
editing a guard test, which makes the change loud by construction.

## 9. Guard tests required

Before ANY integration work beyond the existing card (house style: fs.readFileSync + regex
source guards plus behavioural tests; copy the `progressScanSafetyFloorIsolation` +
`progressScanCoachIsolation.guard` pattern):

1. Scan data cannot silently change targets: `runWeeklyCoach` output identical with and without
   any scan evidence present in the app state (behavioural, real engine).
2. Low-confidence scan is ignored: check-in/coach surfaces render identically for
   low-confidence-scan vs no-scan, except the receipt itself.
3. Withheld scan is ignored: same identity property for withheld vs absent.
4. Conflicting scan does not override validated weight/intake data: targets and decision caption
   unchanged by any conflict state.
5. Every coach receipt states scan usage: any render path showing scan-derived content must
   include a used/not-used sentence (source guard on the receipt component).
6. Target decisions remain deterministic and safety-gated: floors re-enforced in `coachApply`
   regardless of scan state; `photo_scan` still excluded from body-fat authority allowlists
   (extends the existing five tests).
7. Check-in persistence stays scan-free: `saveWeeklyCheckin`/`weekly_checkins` COLS contain no
   scan tokens (source guard).
8. Suppression parity: every scan surface on coach/check-in screens is governed by the shared
   fail-closed suppression mechanism.
9. Interface honesty: `ProgressScanCoachEvidence.affectsTargets === false` pinned; `usedFor` enum
   pinned.

## 10. UI placement

- **Check-in review**: the scan receipt as a quiet context block below logged data. Primary home.
- **Coach receipt area**: the existing "Progress photo context" card region on
  `CoachOutputScreen`, extended with the used/not-used sentence.
- **Progress history**: unchanged; the trend view (world-class blueprint §8 item 10) is the deep
  surface.
- **Today summary**: at most a neutral "photo set ready to compare" line, suppression-gated;
  nothing numeric.
- **Never**: a dominant score tile on the coach screen, score in notifications, score on the
  home screen header, or any placement that makes the number the day's headline. Scan content is
  always subordinate to logged-data content in visual hierarchy.

## 11. Launch-critical integration work

Only what is safe AFTER the scoring waves land, and independent of Tier 2:

1. Founder confirmation of the existing card's approved status (decision, not code).
2. Suppression unification on the card and profile tile (also world-class blueprint item 6).
3. The used/not-used sentence added to the existing card ("This context does not change your
   targets." already exists in spirit in `decisionLine()`; make it universal).
4. Guard tests 1-9 above, written and green BEFORE any new surface work begins.
5. The `ProgressScanCoachEvidence` interface extracted from the existing resolver output shape
   (pure refactor of shape, zero behaviour change, zero new consumers).

## 12. Premium later integration work

Worth building, in order, each behind its own founder gate:

1. Check-in review context block (allowed use 1) after wave 3 ships and Tier 1 validation holds.
2. Consistency check line (allowed use 3) with the conflict-handling rules of §6.
3. Recomposition context in `getBlockAdvice` surfaces (display-only), mirroring the stage3
   intent, resolver pattern, zero engine wiring.
4. Tier 2 + founder unlock: the single corroboration rule (allowed use 7), implemented as one
   named, tested, documented engine-adjacent rule with its own kill switch.
5. Not worth building (recommend against, permanently): scan-triggered target changes of any
   kind, scan-driven paywall triggers, scan data in notifications.
