# Results UI and Copy Blueprint — Progress Photos / Volyume Score

Author: Fable. Inputs: Phase 1 files, scoring blueprint (governing), safety-privacy blueprint
(word lists), external research §5 and §10. Scope: every surface where photos, scores, trends,
comparisons, or receipts render. British English, calm voice, no em dash in user-facing copy.

---

## 1. Score display rules

- The score renders as "NN out of 100" (or "NN/100" in compact cells) with the band and the
  confidence chip **at equal visual weight**. The integer is never larger/bolder than the
  confidence chip by more than one type step. This becomes a tested contract, not a layout habit.
- The score never renders without its confidence tier. A score with an unknown tier renders as
  the Not-enough state.
- Per-tier rendering follows the scoring blueprint §5 table exactly:
  High → score, band, trend direction and size. Moderate → score, band, direction with softened
  size language. Low → band and reasons; integer behind a "Show score anyway" affordance with the
  caveat line. Not enough → withhold receipt only.
- No decimals, no animated count-ups, no celebratory effects keyed to score movement.
- The first time a user ever sees a score: one-screen meaning moment. "The Volyume Score is a
  progress read from your own photos. It is not a body fat measurement, a medical assessment, or
  a comparison with anyone else." One button: "Understood".
- Recalibrated historical scores (version migration) carry a one-time inline note: "Scores were
  recalibrated in an update. Your photos are unchanged."

## 2. Confidence display

- Chip label set (fixed): "High confidence", "Moderate confidence", "Low confidence",
  "Not enough confidence".
- Every non-High chip is tappable → the receipt ("Why?"), which states the plain-language
  reasons: "Confidence is moderate because the lighting changed between sets."
- Bias/calibration honesty line, whenever a bias flag reduced confidence: "Scoring is still being
  calibrated for your build, so confidence is reduced. Your comparisons over time are still
  meaningful." Internal flag names never render.
- No numeric confidence percentage is shown (qualitative-first; the number invites fixation and
  false precision).

## 3. Withheld scan display

- Withholding is presented as the product working: title "No score this time", never "Failed",
  "Error", or "Rejected".
- Body: reason + fix + reassurance, in that order. "The back photo was too dark to read reliably.
  Even front light will fix this next time. Your photos are saved."
- The photo set renders normally in the timeline with an "Unscored" label; the photos are never
  visually degraded, greyed, or badged with warning colours.
- Existing label taxonomy stays ("Analysis unavailable", "Retake needed", "Not enough
  confidence", "Measured only", "Not scored"), reconciled to this tone.
- Duplicate-content withhold copy: "Two poses used the same photo, so this set was not scored.
  Retake each pose separately and the set will score."

## 4. Trend display

- The trend view plots ONLY comparable scans (scoring blueprint §7/§8). Non-comparable scans
  appear as unconnected, unscored markers with no line through them.
- Confidence is encoded per point (e.g. solid marker High/Moderate, hollow Low); no smoothing,
  no projection, no goal line, no target zone shading.
- Gap honesty: breaks in comparability render as visible gaps with a tap-through reason.
- Language ladder (fixed): 1 scan "Your starting point". 2 comparable "An early read". 3+
  comparable "A trend". Never "streak", never counts of scans as an achievement.
- Delta copy states the comparison basis: "Up 3 points since 14 June, from sets taken in similar
  conditions."
- Down-trends use the same neutral structure as up-trends: "Down 2 points since 3 May." No
  consolation, no alarm, no "keep pushing".

## 5. Photo comparison rules

- Two surfaces, two contracts (existing, preserved):
  - **Neutral compare** (`ProgressPhotoCompare`): Earlier/Later + dates only. The banned-word
    contract (before, after, change, gained, lost, weight, kg, lbs, cm, delta, leaner, bigger,
    smaller, %) stays test-enforced. No score, no weight, ever.
  - **Scored compare** (`ProgressScanCompare`): score, band, confidence, weight (suppression- and
    preference-gated), delta explanation. Gains a tone contract of its own (safety blueprint):
    trend words allowed ("visual change", "trend"), evaluative body words banned ("soft",
    "sloppy", "impressive", "beach ready").
- Comparison always leads with photos; score annotates below.
- When comparability failed, the scored compare states why in one sentence and offers the neutral
  compare instead: "The setup changed too much for a fair scored comparison. You can still view
  the photos side by side."
- Share flow unchanged: existing sheet, per-export weight opt-in, "Included / Kept private"
  receipt, fail-closed suppression, Pro gate.

## 6. Calm copy examples

- Score: "Volyume Score 74 out of 100. Defined. Moderate confidence."
- Receipt: "Compared with your set from 14 June. Setup matched. Confidence is moderate because
  the side photo was missing."
- Withheld: "No score this time. The photos are saved. Retake with clearer lighting and your
  whole body in frame."
- Too soon: "Photo sets score best about a week apart. Today's photos are saved to your library."
- Baseline: "Your starting set is saved. Take your next set the same way to unlock comparison."
- Inconclusive pair: "These sets could not be compared with confidence, so Volyume is not calling
  a trend."
- Progress: "Across three comparable sets, your silhouette shows visual change. Steady work."
- Regression-direction: "Down 2 points since 3 May. One read is context, not a verdict. The
  trend over several sets is what matters."

## 7. Empty, loading, and error states

Keep the existing differentiated system (Phase 1 §6) and its copy standards:

- Loading: content-shaped skeletons, never bare spinners.
- Load error with photos present: non-blocking banner "Couldn't refresh photos" + Try again.
- Load error with no photos: dedicated state including the reassurance "Volyume has not deleted
  or changed your photo library."
- True empty (Pro): "No saved photos yet. Add front, back and side photos to start."
- True empty (read-only free): "No photos on this device."
- Filter-empty: cause-specific copy per active filter.
- New states this blueprint adds: trend view empty ("Trends appear after three comparable photo
  sets") and receipt-load failure ("Couldn't load the details for this score. The score itself
  is unchanged.").

## 8. Accessibility requirements

- Every score, chip, receipt, and trend point is screen-reader complete: the accessible label
  always includes the confidence tier with the score ("Volyume Score 74 out of 100, moderate
  confidence"), so the honesty contract survives VoiceOver/TalkBack.
- Trend view: data points focusable in date order with full receipt text; the view is usable
  with no colour perception (confidence encoded by shape, not colour alone).
- Touch targets minimum 44x44 (fix the 40x40 icon buttons when touched for other reasons).
- Reduce Motion respected everywhere (existing pattern; no new animations anyway).
- Comparison slider keeps its adjustable role/value/actions pattern (existing ghost-opacity
  slider is the house example).
- Dynamic type: score and chip scale together, preserving the equal-weight rule.

## 9. Anti-score-chasing rules

Derived from the checking-frequency and single-number-fixation evidence (research §10):

- No score on the home screen, Today view, or any notification. The score lives in Progress
  Photos (and, as context only, the existing coach card).
- No streaks, no scan counts as achievements, no "last scanned N days ago" pressure framing.
  Cadence copy is always fairness-framed ("a fair comparison needs about a week"), never
  urgency-framed.
- The soft 7-day capture gate stays soft; the scoring comparability gate stays hard. Re-scans
  inside the window save photos without scoring and say why calmly.
- Trend is always visually senior to the latest single score in any surface that shows both.
- No push/notification ever references score movement in any direction (aligns with the locked
  notifications system's ED-suppression posture).
- The milestone photo prompt remains capped and ED-gated; it invites photos, never scores
  ("add a photo", not "check your score").
- Suppression (calm mode / open ED flag) removes scores, deltas, trend language, and weight from
  every surface fail-closed, leaving the photo library itself usable.
