# Volyume Image Scoring Accuracy and Validation Blueprint

Author: Fable (audit lead). Inputs: `phase-1-code-audit.md`, `phase-1-evidence-gaps.md`,
`research/image-scoring-progress-photo-research.md`, scout reports 01-07. This is the governing
document for what the Volyume Score is allowed to be. Every other blueprint defers to it.

Standing constraints honoured throughout: deterministic only (no AI scoring), ED-safety system
untouchable, tier-blind guardrails, device-local data, calm voice, no em dash in user-facing copy.

---

## 1. Executive scoring recommendation

**Keep the score. Reframe its meaning. Confidence-gate the provisional component more
aggressively. Do not hide it, and do not replace it.**

Specifically, a four-part decision:

1. **Keep** the silhouette-ratio score, the withhold system, the confidence tiers, the
   comparability gates, and the bias-flag machinery. Phase 1 shows these are real, deterministic,
   layered, and tested. Replacing them would destroy the best-engineered part of the system.
2. **Reframe** the score's public meaning from an ambiguous "leanness score" to an explicit
   **visual progress signal from comparable photo sets** (see §2). The current copy already leans
   this way ("photo context only"); the reframe makes it the formal contract.
3. **Confidence-gate the provisional regressor anchor.** While
   `progress_scan_bf_estimator_v1.json` carries `"status": "provisional_validation_pending"`, its
   influence on the visible score must be structurally bounded and reflected in confidence
   (see §5, founder fork F1). Today it can move the score up to +20/-26 points, which is the
   largest single trust exposure in the system.
4. **Split nothing yet.** A separate "consistency score" or "setup score" is premium-later at
   most. One number with honest gating beats two numbers competing for fixation (research §10:
   single-number fixation is a harm driver; two numbers is not the fix, calmer framing is).

Explicitly rejected options, with reasons:
- *Hide until validated*: the withhold/confidence system already hides the score in exactly the
  situations validation would protect against, and the product's current claims are already
  hedged to "progress read, not a measurement". Hiding a shipped, guarded feature would punish
  existing Pro users without a corresponding safety gain.
- *Replace*: nothing in the evidence says the architecture is wrong; the gaps are validation and
  presentation, not design.
- *Keep as-is*: leaves risk #1 (unvalidated anchor with material influence) and risk #2 (bare
  integer, hidden uncertainty) standing. Not acceptable for a product selling trust.

## 2. What the score is allowed to mean

**The Volyume Score is a confidence-gated visual progress signal.** Its only valid use: comparing
YOUR OWN photo sets, taken the same way, at least a week apart, to indicate the direction and
rough size of visible change.

Formal meaning contract (to be reflected in copy, methodology screen, and tests):

- It is a reading of the SILHOUETTE in a set of photos, produced by fixed deterministic maths.
- It is comparable only with the same person's earlier sets under a passing setup-stability check.
- Its trustworthiness is the confidence tier, not the integer's precision.
- A single scan means almost nothing; the product's unit of meaning is the comparable pair and,
  better, the multi-scan trend (§7).
- The leanness band (Foundation through Peak Condition) is a coarse descriptive frame for the
  score, not a body-composition category.

It is explicitly NOT:
- a body-fat percentage or body-composition estimate (the internal regressor percent stays
  internal, per current design; this blueprint hardens that),
- a measurement, a lab result, a DEXA comparison, a diagnosis, or a health-risk indicator,
- a population comparison, ranking, or percentile (none exists today; none may be added),
- an input to coaching decisions (see the future-integration blueprint; forbidden until the
  validation ladder in §10 is climbed and the founder explicitly unlocks it).

## 3. What the score must not claim

Blunt list. Each item is a copy-review and test target (safety blueprint carries the word lists):

1. **No body-fat number, range, or implied percentage anywhere user-visible.** The evidence base
   for such a claim under consumer capture conditions does not exist (research §1: all favourable
   MAE figures come from controlled conditions). The current hard-nulling of
   `rangeLow`/`rangeHigh` at every display boundary is correct and must be regression-locked.
2. **No accuracy adjectives**: "accurate", "precise", "validated", "clinically", "lab-grade",
   "DEXA" (except in the existing disclaimer "not a DEXA scan"), "measured your body fat".
3. **No certainty language about single scans or short intervals.** Day-to-day appearance shifts
   from water, glycogen, pump, lighting and lens distortion can exceed real change (research §3);
   copy must never attribute a week-to-week wiggle to physique change without the comparability
   gate passing.
4. **No implied medical or health-risk meaning** (FTC "competent and reliable scientific
   evidence" bar; wellness-not-medical positioning).
5. **No claim that the coach uses the score to set targets.** Today it structurally cannot; that
   sentence already exists in the resolver copy and must remain true.
6. **Disclaimers do not license claims.** A hedge in the methodology screen does not permit a
   confident headline elsewhere; the hedge lives at the point of the number (research §5, Halo
   precedent).

## 4. Minimum input quality standard

The standard a photo set must meet for a score to exist. Most of this exists; the blueprint
formalises it and closes the two evidenced holes.

**Per photo (existing gates, keep):** person detected, single person, whole body visible
(framing >= 0.25), lighting >= 0.25, blur >= 0.18, pose confidence >= 0.22, segmentation
confidence >= 0.30, background separation >= 0.20, mask-derived tilt <= 20 degrees. Threshold
values remain owned by `progressScanAnalysis.js`/`progressScanVision.js`; re-tuning them requires
the corpus evidence of §10, not taste.

**Per set (existing, keep):** front and back poses present (side optional but confidence-relevant),
all photos from the same session/day, date attached.

**New requirements (close evidenced holes):**

- **Uniform pipeline rule.** Any photo that can appear in scored or comparison material passes
  `analyseProgressScanPhoto`. Quick-add photos remain welcome in the library but are permanently
  tagged unscored and can never become scored-comparison material. (Founder fork F2: close the
  asymmetry this way, or run quality analysis on quick-adds too. Recommended: the tag route —
  cheaper, honest, preserves the quick capture habit.)
- **Duplicate-content defence.** Within a scan session, reject or flag identical image content
  reused across poses (byte-hash first; perceptual hash only if evidence shows users defeat the
  byte check). Today a duplicated front/back scores as MORE consistent — a degenerate-input hole.
- **Baseline standard.** The first-ever photo of each pose gets the same automated checks with a
  stronger nudge (single extra confirmation step, "This becomes your reference"), because it
  seeds every future ghost overlay. It does not hard-block (founder fork F3 if a hard block is
  preferred; not recommended — hard blocks on a first attempt are hostile).
- **Advisory-vs-hard gating stance.** Current design is quality-first: photos are always kept,
  scores are withheld. KEEP this. The score side is already hard-gated by withholding; making
  CAPTURE hard-gated adds friction without adding honesty. (Founder fork F4 to overrule.)

**Repeatability inputs (capture-side, from research §4, already partly built):** same poses, same
distance and camera framing (ghost overlay + level + grid exist), similar lighting, fitted
clothing, morning capture recommended in guidance copy. Time-of-day guidance is copy-only today
and stays copy-only at launch (sensor-enforced time gating would be pressure, not honesty).

## 5. Confidence tiers

Keep the existing four tiers and their computed basis. Define what each tier PERMITS in UI:

| Tier | Meaning | UI may show | UI must not show |
|------|---------|-------------|------------------|
| High (>= 0.85) | Clean set, stable setup, no material bias-flag penalty | Score integer, band, trend direction and size vs comparable set | Nothing extra unlocked; same hedges apply |
| Moderate | Usable set with minor issues or mild bias penalty | Score integer, band, trend DIRECTION (size softened: "a small change", not exact points emphasis) | Point-delta as headline |
| Low | Material quality/bias issues | Band only + reasons; score integer available behind a "show anyway" affordance with caveat copy | Trend claims of any kind; deltas |
| Not enough | Below floor or withhold reason present | Withhold receipt (reasons + fix guidance) | Score, band, trend |

Changes vs today: today the integer renders whenever a score exists, regardless of tier
prominence, and no test pins the confidence word's visibility. The tier table above becomes a
rendered contract, pinned by tests (wave 3).

**Anchor gating (the material change).** While the regressor status is
`provisional_validation_pending`:

- **F1 (founder fork, recommended option first):**
  - **(a) Recommended: clamp + reflect.** Clamp the anchor's influence to a narrower band
    (proposal: +/-8 points, from the current +20/-26) AND, whenever the clamped anchor still
    moves the silhouette score by more than 4 points, cap the confidence tier at Moderate. The
    anchor keeps doing its job (catching silhouette-formula blind spots) but can no longer be
    the dominant author of the number, and its engagement is visible as reduced confidence.
  - (b) Disable the anchor entirely until validation (purer, but Phase 1 evidence says it exists
    to protect against known silhouette failure modes, e.g. large-body cases; removing it may
    make some scores worse, not honester).
  - (c) Keep current clamps unchanged (status quo; leaves risk #1 standing).
  Exact numbers in (a) are provisional pending §10 corpus evidence; the STRUCTURE (bounded
  influence + confidence reflection + status-keyed) is the blueprint requirement.

## 6. Withhold rules

The system must refuse to score when (existing set, kept, plus three additions):

Existing (keep verbatim): missing required pose; model unavailable; measured signals incomplete;
no person detected; multiple people; too dark; too blurry; whole body not visible; pose not
clear; mask shape unusable; native preprocess failure; estimate out of range.

Additions:
1. **Duplicate content across poses** (new reason code, e.g. `duplicate_pose_content`) — withhold
   the score, keep the photos, explain plainly.
2. **Anchor divergence guard**: if the (clamped) anchor and silhouette score disagree beyond a
   corpus-derived threshold, withhold rather than average — disagreement between the two internal
   methods is itself evidence the set is out-of-envelope (research §5: models are overconfident
   on out-of-distribution input; this is the deterministic analogue of an OOD check). Threshold
   set during §10 work, not guessed.
3. **Session integrity**: photos in one set spanning more than one calendar day (library imports)
   → withhold score, keep set, explain.

Invariants: a withheld scan NEVER loses photos (existing `QUALITY_FIRST_CAPTURE_NOTE` behaviour);
every withhold carries machine-readable reasons mapped to calm copy; withholding is tier-blind
and identical for free-read-only and Pro users.

## 7. Trend vs single-scan rules

- **A single scan is a baseline, not a finding.** Status `baseline` (exists today) renders as
  "Your starting point is saved" framing; no progress language.
- **A pair is a comparison, gated.** Direction may be stated only when `scanComparability`
  passes AND pair confidence is Moderate+ (existing `canCallPairTrend`, kept as the floor).
- **Three or more comparable scans are a trend.** New concept to formalise: `trend window` =
  the most recent N comparable scans (proposal: N up to 6, minimum 3, spanning >= 21 days).
  Trend copy may only strengthen with count: 2 comparable sets = "an early read", 3+ = "a
  trend". A score-over-time view (results blueprint) renders ONLY comparable points and marks
  gaps honestly.
- **Conflicts defer to withholding.** If successive pairs disagree in direction at Low
  confidence, the product says the read is inconclusive rather than narrating a zigzag.
- The 7-day minimum interval stays and stays soft at capture time (photos always welcome), hard
  at scoring-comparison time (already enforced in `scanComparability`).

## 8. Repeatability standard

What must hold between two scans for comparison to be trusted — formalising the existing
`scanSetupStability` thresholds as the product's public standard:

- Same required poses (front + back; side matched if present in both).
- Captured >= 7 days apart.
- Lighting score drift <= 0.24; mask-tilt drift <= 4 degrees; camera-distance drift (body-box
  height/width) <= ~0.09-0.10; body-position drift (centre x/y) <= 0.11; same camera facing.
- Both sets scored (not withheld), both at quality above poor, both above not_enough confidence.

Public phrasing of the standard (methodology/results surfaces): "Same poses, same distance, same
kind of light, about a week or more apart." The numeric thresholds remain internal engineering
values; the STANDARD is user-visible, the numbers are not.

Repeatability work required (validation, §10): a test-retest study — same person, new photos,
nominally identical conditions, same day — to measure the pipeline's own noise floor. The trend
thresholds in §7 (what counts as "a small change") must end up larger than that measured noise
floor. Until measured, current thresholds stand but may not be tightened.

## 9. Scoring receipt format

Every scored, downgraded, or withheld outcome carries a receipt — the existing reason codes and
comparability findings, rendered. Shape (device-local, deterministic):

```
{
  outcome: 'scored' | 'scored_downgraded' | 'withheld' | 'baseline' | 'not_comparable',
  score, band, confidenceTier,
  reasons: [reason codes],            // why downgraded/withheld/not comparable
  setupFindings: [stability issues],  // e.g. lighting_changed, camera_distance_changed
  comparedAgainst: scanId | null,
  anchorEngaged: boolean              // true when the anchor moved the score materially (F1a)
}
```

Rendered as one calm sentence plus an optional "Why?" expansion. Examples (British English, no
em dash):

- Scored: "Volyume Score 74 out of 100. Confidence: moderate. Compared with your set from 14 June."
- Downgraded: "Confidence is lower this time because the lighting changed between sets."
- Withheld: "No score this time. The back photo was too dark to read reliably. Your photos are
  saved. Even front light will fix this next time."
- Not comparable: "These sets are too close together for a fair comparison. Volyume compares sets
  at least a week apart."
- Baseline: "Your starting set is saved. Your next set, taken the same way, unlocks comparison."

The receipt is also the transparency answer to the invisible bias-flag machinery: when a bias
flag widens the margin, the receipt says so in plain terms ("Confidence is reduced while scoring
is still being calibrated for your build") without exposing internal flag names.

## 10. Validation protocol

Two-tier ladder. Each tier gates what may be CLAIMED and what the score may DO.

**Tier 1 — launch posture (required to keep shipping the current score):**
1. Internal consistency corpus (exists: `progressScanCalibrationCorpus.test.js`, replay scripts)
   maintained and extended with every threshold change; no threshold moves without a corpus run.
2. **Test-retest study** (new, founder-run with the existing calibration export tool):
   >= 10 volunteers, 3 capture repetitions per session under nominally identical conditions,
   across >= 3 phone models. Output: measured score noise floor per confidence tier. Acceptance:
   High-tier repeat scores within +/-3 points; if not, tiers/thresholds are retuned until true.
3. **Cross-condition sensitivity sweep** (same volunteers): vary one factor at a time (lighting
   direction, distance +/-20%, loose vs fitted clothing, tilt) and confirm the gates catch what
   they claim to catch (each degraded condition must trigger the matching reason code or a
   confidence drop).
4. Anchor audit: distribution of anchor influence across the corpus (how often, how far it moves
   the silhouette score) — the evidence basis for F1's final numbers.
Claims permitted at Tier 1: everything currently shipped (progress read, not a measurement), plus
the receipts above. Nothing stronger.

**Tier 2 — required before ANY of: stronger accuracy language, surfacing any composition-flavoured
number, or any coach/check-in influence beyond display context:**
The full 8-point protocol from the research file §9: DEXA-grade ground truth with subgroup-level
error reporting (sex, skin tone, body-fat extremes, very muscular); genuine test-retest at scale;
cross-condition robustness; device coverage; drift monitoring across app/phone updates;
independent (non-self) replication or review; a defined and user-visible "do not trust this
score" boundary; and demographic fairness reporting matching the bias flags already in code.
No competitor has published this (research §7); Volyume does not get to skip it either.

Tier 2 is explicitly a founder-commissioned programme, not a code task. Until it completes, the
future-integration blueprint's forbidden list is absolute.

## 11. Test matrix

Rows = conditions to pin with automated tests (Jest against the real engine, house invariant
style) plus the manual on-device checklist (founder has no simulator; EAS build):

| Dimension | Automated pins | Manual device checks |
|-----------|----------------|----------------------|
| Device | Contract validation for TFLite + ML Kit fallback parity on fixture masks | Scan on two physically different Android devices; compare receipts |
| Lighting | too_dark triggers at threshold; lighting drift 0.24 breaks comparability | Backlit window shot → expect withhold receipt |
| Pose | pose_not_clear at threshold; missing back → withhold; side optional path | Deliberate quarter-turn front shot → expect retake prompt |
| Distance/framing | framing < 0.25 withholds; body-box drift breaks comparability | Half-body shot → expect whole_body_not_visible |
| Clothing/background | separation gate; clothing_or_background_uncertain copy | Baggy hoodie shot → expect confidence drop or flag |
| Camera angle | tilt > 20 degrees withholds; drift > 4 degrees breaks comparability | Phone propped at a steep angle → expect camera_tilted |
| Timestamp | < 7 days → not_comparable; DST/timezone day-grouping edges (new test) | Two sets 3 days apart → expect too-close receipt |
| Duplicate | same-millisecond collision (exists); NEW duplicate-content across poses | Import same library photo as front and back → expect duplicate withhold |
| Low confidence | tier caps rendering per §5 table (NEW rendered-contract tests); trend withheld below Moderate | Low-light set → integer not headline, band + reasons shown |
| Anchor | F1 clamp bounds; confidence cap when anchor engaged; divergence withhold | n/a (internal) |
| Re-entrancy | NEW finishScan re-entrancy guard test | Double-tap finish rapidly → one session |
| Score stability | normaliseStoredPhysiqueAssessment migration produces documented, bounded shifts | Re-open an old scored set after update → number unchanged or receipt explains |

## 12. Known limitations

Plain-language list (feeds the methodology surface and the safety blueprint's copy):

- The score reads your silhouette from photos. It cannot see inside your body and does not
  measure body fat, muscle, or water.
- Lighting, camera distance, lens, pose, clothing, and time of day change how a body looks in a
  photo. The score is only meaningful when those are kept steady.
- Day-to-day changes in water, food, training pump and sleep change appearance without changing
  your physique. A week or more between sets is the minimum for a fair read.
- Scoring is still being calibrated for some builds and skin tones; confidence is deliberately
  reduced in those cases while calibration continues.
- One scan is a starting point. Two comparable scans are an early read. Three or more are a trend.
- The coach does not use the score to set your calories, macros or training.

## 13. Safe user-facing language

Exact copy examples (British English, calm voice, no em dash, no shame):

**Score display:** "Volyume Score 74 out of 100. Defined. Confidence: moderate."
**With trend:** "Up 3 points since 14 June, from photo sets taken in similar conditions."
**Early read:** "An early read from two comparable sets. A trend takes three or more."
**Low confidence:** "This set could not be read with confidence. Here is what it needs next time."
**Withheld:** "No score this time. The photos are saved. The back photo was too dark to read
reliably."
**Baseline:** "Your starting set is saved. Take your next set the same way, at least a week from
now, to unlock comparison."
**Calibration honesty:** "Scoring is still being calibrated for your build, so confidence is
reduced. Your comparisons over time are still meaningful."
**Meaning line (methodology):** "The Volyume Score is a progress read from your own photos. It is
not a body fat measurement, a medical assessment, or a comparison with anyone else."
**Not comparable:** "The photo setup changed too much for a fair comparison. Same poses, same
distance, same kind of light, about a week or more apart."

Banned constructions (full word lists in the safety blueprint): any body-fat number or range;
"accurate/precise/validated/measured"; "your body fat is"; percentile or ranking language;
urgency or shame ("slipping", "don't lose your progress"); certainty about single scans.
