# Safety and Privacy Blueprint — Progress Photos / Volyume Score

Author: Fable. Inputs: Phase 1 files, external research §5 and §10, scoring blueprint §3/§13,
results blueprint. This document owns the word lists, the exact copy, and the body-image safety
rules for every photo/score surface, current and future. The ED-safety system itself
(edPatternDetector, wellbeing, floors) is locked and untouched; this blueprint only ADDS
protections on the photo/score surfaces that consume its signals.

---

## 1. Banned language

On any photo/score surface, in any state (test-enforced word lists; regex guards in the house
style of the existing `ProgressPhotoCompare` contract):

**Accuracy/medical overclaim:** "accurate", "precise", "validated", "clinically", "medical",
"diagnosis", "measured your body fat", "body fat is", any numeric body-fat percentage or range,
"DEXA" (except inside the fixed disclaimer "not a DEXA scan"), "lab", "scientifically proven".

**Shame/judgement of the body:** "soft", "sloppy", "flabby", "letting yourself go", "excuses",
"lazy", "guilty", "cheat", "bad" (of a body or a photo of a body), "problem areas", "fix your".

**Panic/urgency/chasing:** "slipping", "losing your progress", "don't lose", "falling behind",
"act now", "last chance", "streak", "don't break", "keep your score", "beat your score".

**Ranking/comparison with others:** "percentile", "top X%", "better than", "average user",
"leaderboard", "rank".

**False certainty:** "proves", "confirms", "definitely", "exactly", "guaranteed", "your body
changed by".

**Existing bans preserved:** the neutral-compare banned list (before, after, change, gained,
lost, weight, kg, lbs, cm, delta, leaner, bigger, smaller, %) on `ProgressPhotoCompare`; no em
dash anywhere user-facing; no clipped commands.

## 2. Preferred language

- "progress read", "visual change", "comparable photo sets", "similar conditions",
  "confidence", "context", "your own photos", "saved to your library", "starting point",
  "early read", "trend".
- Verbs of offering, not commanding: "you can", "when you are ready", "if you want to".
- The scan is always "read", never "measured", "analysed by AI", or "assessed".
- Downgrades and withholds are always explained by CONDITIONS (lighting, framing, timing), never
  by the person ("the photo was too dark", never "you took a bad photo").

## 3. Exact copy examples

**Score and confidence:**
- "Volyume Score 74 out of 100. Defined. Moderate confidence."
- "Confidence is moderate because the side photo was missing."
- "Scoring is still being calibrated for your build, so confidence is reduced. Your comparisons
  over time are still meaningful."

**Withheld scan:**
- "No score this time. The back photo was too dark to read reliably. Your photos are saved.
  Even front light will fix this next time."
- "Two poses used the same photo, so this set was not scored. Retake each pose separately and
  the set will score."

**Failed scan (technical):**
- "The photo reader is not available right now. Your photos are saved and can be scored later."
- "Couldn't load the details for this score. The score itself is unchanged."

**Progress:**
- "Across three comparable sets, your silhouette shows visual change. Steady work."
- "Up 3 points since 14 June, from sets taken in similar conditions."

**Regression-direction (calm, no consolation theatre):**
- "Down 2 points since 3 May. One read is context, not a verdict. The trend over several sets is
  what matters."
- "Appearance shifts with water, light and timing. Keep the setup steady and the trend will tell
  the truth."

**Future coach receipts (from the integration blueprint, repeated here as the safety-approved
set):**
- "Your scan was not used this week because the lighting changed between sets."
- "Your scan supports your weight trend, so the coach kept targets steady."
- "Your photos suggest visual progress, but calorie targets are unchanged because your logged
  trend is already in range."
- "Your scan and scale trend disagree, so the coach used weight and intake for the decision and
  kept the scan as context."

**Privacy:**
- "Private on this device. Your progress photos are never uploaded and never leave this phone
  unless you export or share them yourself."
- "This export includes: your two photos, the dates, and the time between them. Kept private:
  your name, notes, and measurements." (weight line appears only with the explicit per-export
  opt-in)

**Consent / deletion:**
- "Volyume processes your progress photos on this device to read photo quality, confidence, the
  leanness band, the Volyume Score and progress change. Photo files stay on this device."
- "Deleting a photo removes it from this device permanently. If it was part of a scored set, the
  score is removed too."
- "Deleting your account removes your photos and scan history from this device and your account
  data from our servers."

## 4. Score and confidence copy rules

- The confidence tier always accompanies the score, in text and in accessibility labels.
- Uncertainty is expressed qualitatively (tier + reasons), never as a numeric percentage or
  error bar (fixation risk outweighs precision theatre; scoring blueprint §5).
- Bias-flag effects surface as the calibration honesty line only; internal flag names, sex or
  skin-tone references never render in this context.
- Copy never promises the score will improve, and never attributes score movement to effort or
  character.

## 5. Body-image safety rules

1. **Fail-closed suppression, one mechanism.** Every surface rendering photos beside weight,
   scores, deltas, trend language, or share affordances is governed by `usePhotoSuppression()`
   semantics (start suppressed, lift only after confirmed reads). The Coach-screen card and
   profile tile migrate onto it. Under calm mode or an open ED flag: no scores, no deltas, no
   trend language, no weight, no share; the photo library itself stays viewable.
2. **Checking-frequency protection.** No surface, notification, or prompt encourages more
   frequent capture than the weekly cadence; the milestone photo prompt stays capped, ED-gated,
   and photo-framed (never score-framed). No new prompts without a safety review.
3. **Single-number de-emphasis.** Trend is senior to the latest score everywhere both appear;
   the score never appears on home/Today/notifications (results blueprint §9).
4. **No degraded-body framing.** Withhold and low-confidence states blame conditions, not the
   person or the body. Down-trends read with the same neutral structure as up-trends.
5. **Share exception boundary.** The Pro before/after card's bodyweight display remains the
   single founder-approved exception; it stays withheld entirely under calm mode or an open ED
   flag; name, measurements and private notes stay banned on it. No new exceptions.
6. **Tier-blind safety.** Every rule here applies identically to free and Pro surfaces.
7. **Future integration safety.** Any new scan surface adopts these rules by default and adds
   the used/not-used sentence (integration blueprint §7). Scan data never enters the wellbeing
   or ED-pattern systems as an input without a dedicated founder-approved safety review.

## 6. Privacy rules and hardening

1. **Architecture stays**: photos device-local, no sync, no cloud table, guard-tested. Any
   change to this is a founder-level architecture event.
2. **EXIF stripping**: photos are re-encoded on save so stored files carry no EXIF/GPS from the
   camera or the picked original. Test: saved bytes contain no EXIF markers.
3. **iOS backup exclusion**: the `progress_photos/` directory carries the exclude-from-backup
   attribute so "stays on this device" is true across iCloud/iTunes backups (Android
   `allowBackup=false` already covers Android).
4. **Per-user wipe scope**: account removal wipes that account's photo subfolder; the
   whole-directory wipe survives only for full local resets. Fatal-on-failure semantics kept.
5. **Copy truth stays pinned**: `privacyTruth.guard.test.js` extends to cover any copy this
   blueprint adds; privacy claims must never outrun the bytes.
6. **Telemetry**: unchanged — payload-free event names only; Sentry scrubbing of photo
   paths/tables/binaries stays; no new photo-adjacent telemetry without the same no-PII design.
7. **Stale-artefact cleanup** (docs hygiene, founder-approved timing): the dead cloud
   `progress_photos` table in `schema.sql`/`setup_complete.sql` and the outdated photo section of
   `docs/BUDGET_POSTURE_LOCKED.md` get corrected or annotated so no future work builds from them.
8. **Exports**: JSON backup continues to include metadata only, never image files; the
   calibration export stays founder-gated and free of photo names/paths (already tested).
