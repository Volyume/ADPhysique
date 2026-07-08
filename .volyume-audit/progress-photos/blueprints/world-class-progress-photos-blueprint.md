# Volyume World-Class Progress Photos Blueprint

Author: Fable. Inputs: `phase-1-code-audit.md`, `phase-1-evidence-gaps.md`, the scoring blueprint
(governing document for anything score-related), and the external research file. Scope: the
whole progress-photo experience. Coach/check-in integration lives in its own blueprint and is
future work only.

---

## 1. Product north star

**The most trustworthy progress-photo system on a phone.** Not the most features, not the
biggest number, not a body scanner. Volyume wins by being the product that captures comparable
photos better than anyone (ghost overlay, level, guidance), refuses to pretend when a read is
not fair (withholding as a feature), and explains itself every time (receipts). Elite, calm,
private by architecture. The score serves the photos; the photos never serve the score.

The competitive gap this fills (research §7): scanner apps claim body-fat numbers with no
uncertainty at the point of the score; coach platforms treat photos as inert attachments.
Nobody ships honest, confidence-gated visual scoring. That is the position.

## 2. Ideal capture journey

Baseline: today's flow is already strong (six entry routes, ghost overlay, level, grid, per-pose
guidance, advisory retake prompts, calm permission handling). The ideal journey polishes, not
rebuilds:

1. **Entry**: "Add photos" offers the same routes; the scored "photo set" is presented as the
   primary path, quick add as secondary ("Just save a photo").
2. **First-ever set (baseline)**: one extra sentence of framing ("These become your reference
   set") and the standard automated checks; a flagged first photo gets a slightly firmer retake
   nudge because it seeds every future ghost overlay. Never a hard block.
3. **Each pose**: ghost overlay from the reference, live level, grid, per-pose subtitle
   (existing). Post-shutter automated analysis (existing) with the retake prompt.
4. **Set completion**: date/weight/note step (existing), then a single honest moment: either the
   score with its receipt, a downgrade receipt, or a withhold receipt with fix guidance.
5. **Quick add**: unchanged speed; photo lands tagged unscored, never enters comparison material
   (scoring blueprint §4, fork F2).
6. **Cadence**: the soft "about a week apart" gate stays soft for capture; scoring comparability
   stays hard at 7 days.

Deliberately NOT in the journey: hard capture blocks, live skeletal pose tracking (premium
later at most), time-of-day enforcement, streaks, reminders beyond the existing gated milestone
prompt.

## 3. Ideal scoring journey

Defined by the scoring blueprint. In experience terms:

- The user is told what the score means before they see one (a one-time, one-screen meaning
  moment on first scored set: "a progress read from your own photos, not a measurement").
- Score arrival is calm: number, band, confidence chip of equal visual weight, one receipt line.
- Withholding is presented as the product working, not failing: "No score this time" with the
  reason and the fix, photos always kept.
- Confidence changes are always explained in plain terms (receipt), never silent.
- The provisional-calibration state is honest copy, not a hidden flag.

## 4. Ideal result/history journey

- The dated timeline (existing) remains the spine: photos first, score row present only where a
  scored set exists.
- **New: a trend view** — score over time, comparable points only, gaps marked, confidence
  encoded visually (e.g. hollow markers for lower confidence), never a smoothed line implying
  continuity that is not there. Pairwise "Compare photo sets" remains for detail.
- History cards keep their withhold/downgrade labels (existing, good).
- Older scores recalibrated by version migrations must carry a small "recalibrated" note the
  first time they render changed (kills the "number moved silently" trust leak).

## 5. Ideal comparison journey

- Two surfaces, two contracts (existing, correct): neutral photo compare (banned-word contract,
  Earlier/Later only) and scored set compare (trend language allowed, gated).
- Comparison always leads with the photos; the score annotates.
- Ghost-overlay alignment quality feeds comparability honestly: when setup drifted, the compare
  surface says exactly what changed (existing findings, surfaced as receipt copy).
- Share: the existing before/after sheet with its "Included / Kept private" receipt and per-export
  weight opt-in is already the founder-approved boundary. No new share surfaces.

## 6. Trust and confidence model

The product's trust stack, top to bottom:

1. **Architecture**: photos never leave the device (guard-tested). Non-negotiable, already true.
2. **Withholding**: the system refuses bad reads (existing, extended per scoring blueprint §6).
3. **Confidence tiers**: rendered contract — what each tier may show (scoring blueprint §5),
   pinned by tests.
4. **Receipts**: every outcome explains itself (scoring blueprint §9).
5. **Meaning discipline**: the score never claims composition, accuracy, or medical meaning
   (scoring blueprint §3).
6. **Validation ladder**: claims only strengthen when the evidence tier is climbed (scoring
   blueprint §10).

## 7. Safety and privacy model

Governed by the safety-privacy blueprint; the experience-level commitments:

- Fail-closed suppression everywhere photo/weight/score content renders, via the single shared
  `usePhotoSuppression()` mechanism (the Coach-screen card's local gate migrates onto it).
- No streaks, no reminders pressure, no "you have not scanned lately" push. The milestone prompt
  stays gated and infrequent.
- Cadence limits framed as fairness ("a fair comparison needs a week"), never as rules or
  punishment.
- Privacy is a visible feature: "Private on this device" pill (existing), the share receipt
  (existing), plus the hardening items (EXIF strip, iOS backup exclusion, per-user wipe scope).

## 8. Launch-critical top 10

Strict scoring-first order. Sizes: S < 1 day, M 1-3 days, L 3+ days (Sonnet-implementation
sizing).

1. **Anchor gating (F1a): clamp the provisional regressor's influence and reflect engagement in
   confidence.**
   Why: largest trust exposure; an unvalidated component can author up to 26 points of the number.
   Evidence: scout 3; estimator JSON `provisional_validation_pending`; clamps +20/-26.
   Impact: the visible number becomes silhouette-led and honest by construction.
   Size: M. Tests: clamp bounds, confidence cap, corpus replay unchanged where anchor untouched.
   Do-not-overbuild: no new model, no retraining, no new asset; arithmetic bounds + one flag only.
2. **Duplicate-content withhold across poses.**
   Why: degenerate input currently scores as MORE consistent.
   Evidence: scout 4 (`consistencyScoreFromSpread`, no check in `pickScanPoseFromLibrary`).
   Impact: closes a silent falsely-confident-score path. Size: S-M.
   Tests: same-bytes front/back → `duplicate_pose_content` withhold; distinct photos unaffected.
   Do-not-overbuild: byte/file hash first; no perceptual hashing until evidence demands it.
3. **Confidence-tier rendered contract (per scoring blueprint §5 table).**
   Why: the integer currently renders with untested confidence-word prominence; overconfidence
   by omission. Evidence: scouts 4, 5 (`hiddenLegacyRange`, no prominence test).
   Impact: what each tier may show becomes law, not layout accident. Size: M.
   Tests: render-level pins per tier; source guard that the confidence chip cannot be dropped.
   Do-not-overbuild: no numeric range display (deliberate; qualitative-first per research §10).
4. **Receipts everywhere (scoring blueprint §9).**
   Why: reasons/setup findings are computed but only partially surfaced; receipts are the
   product's honesty mechanism. Evidence: scouts 4, 5. Impact: every outcome explains itself.
   Size: M. Tests: receipt copy per outcome class; no internal flag names leak.
   Do-not-overbuild: reuse existing reason codes and `scanSetupStability` findings verbatim.
5. **Quick-add scoring firewall (F2, tag route).**
   Why: ungated photos share the timeline with gated material.
   Evidence: scout 2 (top gap). Impact: one input standard for anything scored. Size: S-M.
   Tests: quick-add photo can never appear in scored comparison; tag persisted.
   Do-not-overbuild: do not run the vision pipeline on quick-adds; just fence them.
6. **Suppression unification on the Coach-screen card and profile tile.**
   Why: two independently maintained suppression paths for the same risk class.
   Evidence: scouts 5, 7. Impact: one fail-closed mechanism everywhere. Size: S.
   Tests: extend the isolation guard to require `usePhotoSuppression` (or its exact fail-closed
   semantics) at both sites. Do-not-overbuild: no behaviour change when unsuppressed.
7. **EXIF strip on save + iOS backup exclusion for the photo directory.**
   Why: Article 9 data with dormant GPS risk; "stays on this device" vs iCloud default.
   Evidence: scout 6. Impact: privacy promise becomes byte-level true. Size: M.
   Tests: saved file contains no EXIF/GPS; directory carries the exclusion attribute.
   Do-not-overbuild: re-encode on save is enough; no encryption work in this item.
8. **Per-user wipe scope for progress photos.**
   Why: account A sign-out currently destroys account B's photos on a shared device.
   Evidence: scout 6 (`wipeProgressPhotoDirectory` whole-tree). Impact: irreversible-loss bug
   class closed. Size: S-M. Tests: two-user seed; wipe A; B intact; full-delete path still fatal
   on failure. Do-not-overbuild: keep the fatal-on-failure semantics exactly.
9. **`finishScan` re-entrancy guard + DST day-grouping tests.**
   Why: the terminal mutation point has no independent guard; day-grouping has no timezone tests.
   Evidence: scout 4. Impact: closes race/grouping edge cases cheaply. Size: S.
   Tests: double-invoke finish → one session; DST-boundary grouping stable.
   Do-not-overbuild: a ref/flag and tests; no flow redesign.
10. **Trend view (comparable points only) + "recalibrated" note on migrated scores.**
    Why: pairwise-only display hides the product's real unit of meaning (the trend); silent
    recalibration erodes trust. Evidence: scout 5. Impact: honest long-run story, no moved-number
    surprise. Size: M-L. Tests: only comparable points plotted; gap markers; migration note
    renders once. Do-not-overbuild: no smoothing, no projections, no goals on the chart.

## 9. Premium later top 10

1. Tier 2 validation programme (ground truth, subgroups, devices) — unlocks stronger claims.
2. Live framing feedback pre-shutter (body-in-frame indicator vs reference scale/position).
3. Sensor-tilt pre-capture nudge using the already-live accelerometer (block-free).
4. Baseline re-take flow: guided "refresh your reference set" journey.
5. Perceptual-hash duplicate defence (if byte-hash proves insufficient).
6. Thumbnail generation for grid performance at large libraries.
7. At-rest encryption of photo files (beyond SQLCipher DB coverage).
8. Retention/review nudge ("photos older than two years, review or keep").
9. Plain-English bias-flag transparency panel in methodology ("why confidence can be reduced").
10. Device-consistency calibration (TFLite vs ML Kit mask parity monitoring in the replay
    harness).

## 10. Features to avoid

- Body-fat percentage display, in any form, at any tier. (Scoring blueprint §3.)
- Percentiles, leaderboards, rankings, community comparison of scores or photos.
- Streaks, scan reminders, "don't break the chain" mechanics, notification nudges to scan.
- An AI chat layer narrating photos, or any nondeterministic scoring component.
- Cloud sync/backup of photos (architecture is the moat; also Article 9 exposure).
- A second competing score (posture score, symmetry score) at launch tier.
- Gamified score animations, confetti, celebration tiers keyed to score movement.
- Hard capture blocks on quality (withhold the score, never the photo).
- Face analysis of any kind.
- Auto-selecting "best" photos or beautifying/smoothing filters.

## 11. Final recommendation

Ship the launch-critical ten, in order, as five Sonnet waves (see `implementation/`). Items 1-4
are the scoring-trust core and come first; 5-6 close input and suppression consistency; 7-9 are
privacy/reliability hardening the premium promise requires; 10 completes the honest-results
story. Nothing here rebuilds the engine, the storage design, the capture aids, or the isolation
architecture — Phase 1's verdict is that the foundation is strong and the work is validation,
honesty of presentation, and hardening. After wave 3 lands, the scoring standard is defined and
enforced; only then does the future Coach/check-in integration blueprint become actionable, and
only behind its own guard tests and founder unlock.
