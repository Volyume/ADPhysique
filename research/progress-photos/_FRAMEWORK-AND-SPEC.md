# Progress Photos — Framework, Design Spec & Build Plan
**Author:** Fable (orchestrator/synthesis), 2026-07-03. **Status:** FIXED — build agents implement this verbatim; deviations come back to the orchestrator.
**Sources:** the Stage 1 corpus in this folder — `A1-internal-audit.md`, `M1-comparison-ux.md`, `E1-evidence-safety.md`, `E2-antipatterns.md`, `P1-coaching-prep-tools.md`, `P2-dedicated-apps.md`, `P3-adjacent-and-aiscan.md`, `S1-sharecard-execution-growth.md`. Every design call below traces to those.
**Quality bar:** the free-trial-screen standard — token-pure, generous space, one hero moment per screen, calm always. Never flashy, never gamified, never transformation-culture.
**Voice:** British English, no em dash, no exclamation marks, no shame/urgency (COACHING_VOICE_SYNTHESIS_LOCKED).

---

## PART 1 — THE LESSON (framework the build designs against)

### 1.1 What WORKS (principles, evidence-backed)
1. **Consistency is made at CAPTURE, not recovered at comparison** (M1, P2). The single highest-leverage feature is a ghost/onion-skin overlay of a previous same-pose photo while you take the next one, so the shots line up. Nobody in the physique-coaching set ships it (P1); the dedicated overlay cameras (AlignShot, Camera Overlay, Apollo) prove the spec, and users literally ask for it to *be* the capture flow (P2). This is Volyume's clearest lead.
2. **Effortless, trustworthy dating** (P1 TrueCoach, all). Each photo auto-dated, the date visible on the tile, backdating allowed. Today Volyume derives a *save-time* date and never shows it on the grid (A1 §1, G2/G6).
3. **Pose-typed organisation so like compares with like** (P1, P2). Front/side/back is near-universal; grouping and filtering by pose makes comparison meaningful.
4. **A calm, legible comparison** — side-by-side two-up is the safest, most physique-legible default (M1, S1); an aligned overlay (only Kahunas ships one, P1) is the premium extra.
5. **Private-by-default is a genuine differentiator** (P1, P3). Every coaching tool treats the photo as evidence submitted to a coach for judgement; users — especially women — silently opt out because of it (P1 Trainerize forum). Volyume's on-device-only posture is a felt advantage, not a limitation.
6. **Don't lose the photos** (P2). The #1 churn driver across dedicated apps is lost photos / broken export ("app DELETED all my photos"). Reliability and a real backup path matter more than any flourish.

### 1.2 What DOESN'T work (principles)
1. **Unlabelled, undated dumps** (the current Volyume state; A1). A bare thumbnail bucket with delete-only tap is the worst-in-class baseline.
2. **Coach-judgement framing** ("submit your photo", "your next marketing image") — exposure and appearance-evaluation (P1). Volyume refuses it structurally.
3. **Transformation-culture framing** — dramatic before/after reveals, "day one vs now" hype (P1, E1 §2.4). The brain "immediately starts ranking" (P2). Neutral *earlier/later + date* only.
4. **Numbers stamped on a body / AI scoring** (P3 GainFrame, E1 §2.5, E2). Manufactured authoritative numbers about a body are a documented harm vector and double-violate Volyume's no-AI constitution.
5. **Cadence pressure** — reminders, streaks, "you haven't taken one in N days" (E1 §2.3, §3.1). Frequency is the single most dangerous lever; the *absence* of pressure is the mitigation.
6. **Predatory/ gamified monetisation** (P2). Not Volyume's model anyway.

### 1.3 What users VALUE MOST (ranked from review-mining)
1. Seeing real change they'd otherwise miss on the scale (E1 §1.2 — strongest pro-photo argument in a recomposition app).
2. Shots that actually line up so the change is legible (P2 — the ghost camera wish).
3. Their photos staying private and never lost (P1, P2, P3).
4. A card they feel *proud* to share on their own terms (S1) — pride, never nagged.

### 1.4 THE ELITE MODEL (must-haves / differentiators / traps)
- **Must-haves:** auto-dated photos with the date shown; a full-size viewer (not delete-only); pose tags; a proper dated timeline; two-up comparison; reliable storage.
- **Differentiators (make Volyume best):** ghost-overlay capture guide; aligned onion-skin overlay; pose-aware "compare like with like"; private-by-default with an honest on-device promise; a genuinely premium, calm before/after share card.
- **Traps to avoid (never build):** AI body scoring, goal-body overlays, transformation reveals, cadence streaks/nags, social leaderboards, default cloud upload, share-nagging, beautify edits (E1 §4.4, E2).

### 1.5 INTEGRATION MAP (native, not bolted-on)
- **Where it lives:** the existing `ProgressPhotos` route inside the Progress stack, reached from `BodyMetricsScreen` (A1 §5) — keep that home; it sits in the body-metrics domain where weight already lives, so bodyweight-at-photo is a natural, in-domain join.
- **Ties to the app:** bodyweight-at-photo reads the existing `body_metric_log` / `morning_weights` via a NEW nearest-to-date accessor (A1 §5); the share card reuses the existing Skia `drawShareCard` pipeline (S1); everything uses existing tokens + E1 motion + E15 signature elements (no new visual vocabulary); the calm/ED suppression reuses the app's fail-closed pattern (E1 §4).
- **Identity reinforced:** private-first, evidence-led, calm. The feature says "your record, your pace, on your device."

### 1.6 SHARING AS A BRANDED GROWTH LOOP (opt-in, no nag)
- The card earns shares by being **share-worthy**, offered — never pushed — as an always-available "Share" affordance inside the comparison view at the natural proud moment (the user's own side-by-side realisation). No share prompts, no notifications, no guilt, no streak, no gating (S1 PART B, E2).
- Discovery loop = the tasteful centred wordmark on a reshared card (Strava/MacroFactor precedent, S1). Restraint IS the growth strategy. The dominant real use is a private send (to a coach/friend); public reach is a bonus, never the pressure.

---

## PART 2 — GOVERNING SAFETY (the gate every surface obeys)

From E1's verdict table. The suppression condition is **"open ED-pattern flag OR calm mode on"**, read via the app's raw fail-closed pattern (`read_failed` sentinel ⇒ treat as suppressed). Fail CLOSED always.

- **BUILD FREELY (all users):** view your own dated photos; user-paced capture (no reminders/cadence); on-device private storage; one-tap delete; date/function-neutral framing; optional feature; Beat signposting reachable (tier-blind).
- **GATE behind calm+ED (suppress/withhold when suppressed; fail closed):** comparison / side-by-side / slider / overlay views; any bodyweight overlay on a photo; the before/after **share-card generation**; add-photo CTAs (soften to passive); entry-point prominence (de-emphasise).
- **NEVER build:** AI body-fat/rating from a photo; goal-body/ideal overlay; streaks/nags/guilt on cadence; social feed/leaderboard of bodies; default cloud upload; share-nagging; beautify/slimming edits.

**One-line rule:** keep the user's private, date-neutral, self-paced view of their own body; suppress every comparative, numeric, sharing, or nudging layer for flagged/calm users and fail closed; never build anything that scores, idealises, gamifies, ranks, or broadcasts a body.

---

## PART 3 — DESIGN SPEC (buildable)

### 3.0 Constraints (hold throughout)
On-device only, never auto-upload; metadata on-device too (LOCAL migration only). Existing tokens + E1 motion + E15 only, zero hardcoded values. Deterministic engine untouched. Additive/reversible schema. Pro gate per existing pattern (writes are Pro; free-with-photos is view-only, E10). Preserve every locked test invariant in A1 §3 (especially the compare ED copy ban and the fail-closed wellbeing read).

### 3.1 Data model (additive, LOCAL only)
New local SQLite table (via `database.js` `PRAGMA user_version` bump, additive + idempotent), NOT added to `SYNC_REGISTRY` (photos and their metadata never leave the device):
```
progress_photo_meta (
  name        TEXT PRIMARY KEY,   -- the existing <epochMs>.jpg filename = the photo id
  taken_at    INTEGER NOT NULL,   -- editable "date taken"; defaults to timestampFromName(name)
  pose        TEXT,               -- 'front' | 'side' | 'back' | NULL
  weight_kg   REAL,               -- snapshot of nearest weigh-in to taken_at at capture; NULL if none
  note        TEXT,               -- optional short user note
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
)
```
- Back-compat: a photo with no meta row behaves as `taken_at = timestampFromName(name)`, `pose = null`, `weight_kg = null`. Never require a row to exist.
- Collision fix (G11): `saveProgressPhoto` must not overwrite — if `${DIR}${ts}.jpg` exists, increment `ts` until free (keeps the `<ms>.jpg` scheme and the timestamp regex intact).
- New accessor `getBodyWeightNearestTo(userId, t)` in `database.js`: nearest logged `weight_kg` to epoch `t` across `body_metric_log` + `morning_weights` (nearest-on-or-before preferred, else nearest overall), returns `{ weightKg, loggedAt } | null`. Used to snapshot `weight_kg` at capture and when `taken_at` is edited.
- Metadata lib `src/lib/progressPhotoMeta.js`: get/upsert pose, note, taken_at, weight for a photo name; batch-get for a list; delete a photo's meta when the photo is deleted. Pure-ish wrappers over the DB, unit-tested.

### 3.2 Shared ED/calm suppression (safety code — full-reasoning agent)
A single hook/util `usePhotoSuppression()` reading, fail-closed, **calm mode OR open ED-pattern flag**, both via raw reads with a `read_failed` sentinel ⇒ suppressed. The base screen keeps its EXISTING raw `WELLBEING_KEY` read byte-identical (A1 §3 pins it; wellbeingFailClosed.guard.test forbids `getWellbeingMode()`); the ED-flag read is ADDITIVE and only gates the NEW high-risk surfaces (comparison, share card, weight display). When suppressed: comparison entry, share entry, and any bodyweight display are hidden; add-photo CTA softens. Viewing own dated photos and delete stay available. This is the E1 §4 inheritance. Do not weaken any existing gate.

### 3.3 Gallery / timeline (replaces the flat grid)
- Dated **timeline**: FlashList (keep, e8 guard) with month/section headers; each thumbnail shows its `taken_at` date. Newest-first within a descending timeline.
- **Pose filter**: a segmented control (All / Front / Side / Back) using existing tokens; filters the timeline.
- Tap a thumbnail → the **viewer** (§3.4), NOT delete. Long-press or a viewer action handles delete.
- Empty state + first-run consistency guidance (G14): one calm line on lighting/same-pose/your-own-pace — no cadence pressure.

### 3.4 Full-size viewer (ends delete-only)
- New component `ProgressPhotoViewer`: full-size image, pinch-zoom + swipe between photos (reanimated + gesture-handler), bounded decode (the compare memory rule). Shows date, pose chip, and — **only when not suppressed** — bodyweight-at-photo.
- Actions: set/change pose, edit date, add note, "set as reference" (marks the ghost-overlay source), "compare from here", delete-with-confirm. All calm, no valence.

### 3.5 Labels / pose / weight
- Pose: front/side/back (simple, universal; Everfit's front/left/right/back noted but out of scope unless trivial). Optional note. Editable `taken_at`.
- Bodyweight-at-photo: auto-filled from `getBodyWeightNearestTo`; DISPLAY suppressed under calm+ED; never rendered as a verdict, only a neutral "72.4 kg · 3 Jul" style line in the viewer. Never on the grid.

### 3.6 Comparison (upgrade; keep the ED copy ban)
- New component `ProgressPhotoCompare` (extract from the inline modal). Modes:
  - **Two-up side-by-side** — the calm DEFAULT (M1, S1). Older-left/newer-right, date labels, existing allowlist copy preserved (A1 §3 pins: no before/after/delta/measurement words).
  - **Before/after slider** — in-house on reanimated + gesture-handler, `accessibilityRole="adjustable"` with increment/decrement, Reduce-Motion static. Labelled neutrally (earlier/later + date), NOT "before/after".
  - **Aligned onion-skin overlay** — Skia blend of the two photos with an opacity control; the premium alignment view.
- Selection: pose-aware (suggest same-pose pairs), quick actions "first vs latest", "now vs N weeks ago". Compare by date range / pose.
- **Whole comparison surface SUPPRESSED under calm+ED** (E1). Preserve the existing compare tests; extend, do not break.

### 3.7 Ghost-overlay capture guide (the differentiator; NEW dependency)
- New component `ProgressGhostCapture` on **`expo-camera`** (first-party; config-plugin; the one recommended new dependency — M1, founder deps-approved): live camera preview with a faint overlay of the chosen previous same-pose photo (opacity slider ~15–85%, AlignShot spec), a rule-of-thirds grid, and a level indicator. Neutral framing ("line up your last photo"), no cadence pressure.
- Capture writes through the existing `saveProgressPhoto` path; pose carried into the meta row. Fallback: if the camera is unavailable/denied, fall back to the existing `expo-image-picker` path (unchanged). Add the `expo-camera` config plugin to `app.json`; camera permission string calm and honest.

### 3.8 Before/after share card (founder-approved; Skia)
- New `cardType` branch in the existing Skia `drawShareCard` (S1 — no new dependency): two photos **side-by-side** (default), each with a bottom scrim plate carrying `date · weight`, an **elapsed-time top badge** ("14 weeks"), the existing centred wordmark footer. Square 1:1 default, 4:5 and 9:16 offered. Reuse house conventions (S1 §2).
- Flow: from the comparison view, an always-available "Share" affordance (no nag) → a one-time confirm ("You're creating a shareable image of your photos") → generate → `expo-sharing` / save via `expo-media-library`.
- **Pro-gated.** **Withheld entirely under calm+ED** (E1 — suppress share-card generation, not just strip the weight). Weight-on-card is a **founder-approved override** of the locked "share cards never include bodyweight" rule (record in decisions; update the locked-rule note + the screen's privacy note; name/measurements still banned).

### 3.9 Premium shell
Capture, gallery, viewer, comparison, share card, and empty state all to the free-trial-screen bar; calm coach voice; no urgency; no shame; existing tokens + E1 + E15 only.

---

## PART 4 — BUILD PLAN (agent fan-out; file ownership avoids conflicts)

**B0 — groundwork (opus, full-reasoning, SEQUENTIAL FIRST).** `database.js` migration (progress_photo_meta, additive/idempotent, NOT in SYNC_REGISTRY) + `getBodyWeightNearestTo` + collision fix in `saveProgressPhoto` + `src/lib/progressPhotoMeta.js` + the `usePhotoSuppression` fail-closed hook (calm OR ED-flag, additive) + unit tests + guard test that the meta table is absent from SYNC_REGISTRY. Everything else imports these. Owns: `database.js`, `progressPhotos.js`, new `progressPhotoMeta.js`, new suppression hook, their tests.

**Then parallel (each owns DISJOINT new files; no edits to ProgressPhotosScreen.js yet):**
- **B1 (opus):** `ProgressPhotoViewer` component (full-size, zoom/swipe, per-photo actions incl. pose/date/note/weight display gated by suppression, delete-with-confirm). New file + test.
- **B2 (opus):** `ProgressPhotoCompare` component (two-up + slider + onion-skin, pose-aware selection, ED-suppressed), preserving the compare ED copy allowlist. New file + test.
- **B3 (opus):** `ProgressGhostCapture` component on `expo-camera` (ghost overlay, grid, level, opacity) + `app.json` plugin + dependency + permission copy + image-picker fallback. New file + test.
- **B4 (opus):** before/after `cardType` in `drawShareCard` + `BeforeAfterShareSheet` compose/confirm/export + Pro gate + ED withhold. Owns `drawShareCard.js` + new sheet + test.

**B5 — integrator (opus, full-reasoning, SEQUENTIAL after B1–B4).** Rewire `ProgressPhotosScreen.js` into the dated pose-filtered timeline; open the viewer/compare/capture; wire the share entry; add routes in `RootNavigator`; reconcile interfaces; keep every A1 §3 invariant green; full lint + jest.

**Hostile review (opus, full-reasoning).** Whole-diff adversarial pass: never-auto-upload rule, ED/calm suppression correctness + fail-closed, engine determinism, token/motion consistency, invariant violations, the weight-on-card override reconciliation. Fix findings; guard-test.

---

## PART 5 — DECISIONS LIST (founder) & notes
1. **New dependency `expo-camera`** — for the ghost-overlay capture (the headline differentiator). First-party Expo, config-plugin, permission-gated. Adopting per your standing deps-approval; flagged here for visibility.
2. **Bodyweight on the share card overrides a locked Article 9 rule** — you approved it. Reconciled as: weight shown on the card, card withheld entirely under calm/ED, name/measurements still banned, locked-rule note updated. (No further decision needed unless you want weight OFF by default.)
3. **ED-flag read added to the suppression condition** for the NEW high-risk surfaces (comparison, share card, weight display), additive and fail-closed, per your "inherit calm-mode + ED-flag suppression" instruction. The base screen's existing calm-only read is unchanged. (Founder-approved by the prompt; noted because it touches ED-safety.)
4. **Migration:** LOCAL only (`database.js`, runs automatically once via user_version). **There is NO Supabase migration to run manually** — photos and their metadata stay on-device by constraint. If you ever want metadata synced across devices, that is a new off-device flow and a separate decision.
5. **Free/Pro:** writes (capture, label, delete, share) stay Pro; free-with-photos stays view-only (existing E10 pattern). No new paywall surface.
</content>
