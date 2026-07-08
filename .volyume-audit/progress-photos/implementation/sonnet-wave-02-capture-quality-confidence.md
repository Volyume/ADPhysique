# Sonnet implementation wave: Capture quality and confidence

## Source docs

Read IN FULL first:
1. `.volyume-audit/progress-photos/blueprints/scoring-accuracy-and-validation-blueprint.md` (§4)
2. `.volyume-audit/progress-photos/blueprints/world-class-progress-photos-blueprint.md` (§2, §8
   items 5 and 9)
3. `.volyume-audit/progress-photos/evidence/scout-02-capture-input-quality.md`
4. `.volyume-audit/progress-photos/evidence/scout-04-confidence-withhold-repeatability.md`
5. `CLAUDE.md`

## Goal

One input standard for anything scored: fence quick-add photos out of scored comparison
material, give the first-ever photo of a pose its baseline framing, and close the `finishScan`
re-entrancy gap. Nothing else.

## FOUNDER GATES (must be answered before build)

- F2 (scoring blueprint §4): quick-add asymmetry. Recommended: TAG route (quick-adds permanently
  unscored, never comparison material; no vision pipeline run on them). Alternative: run
  `analyseProgressScanPhoto` on quick-adds too. Build whichever the founder chooses.
- F3: baseline first-photo standard. Recommended: same automated checks plus one framing
  sentence and a firmer retake nudge; NO hard block. Confirm before build.

## Current evidence

- Six capture routes built by `buildProgressStudioCaptureRoutes`
  (`src/lib/progressCaptureGuide.js`; rendered in `src/screens/ProgressPhotosScreen.js`
  ~1535-1623): `complete_latest`, `scan` (guided camera set), `scan_library` (import set),
  `guided` (single ghost-overlay photo), `camera` (quick), `library` (quick).
- ONLY the scan flow runs `analyseProgressScanPhoto` (`onScanCaptured`,
  `ProgressPhotosScreen.js:774-800`). Quick routes go through `pickFrom()`
  (`ProgressPhotosScreen.js:250-279`) with zero quality analysis.
- Scout 2 flagged that quick-added photos share the dated timeline and "per `scanForCheckIn`
  matching logic, potentially be treated as comparable material downstream" — TRACE THIS FIRST:
  find `scanForCheckIn` (or whatever the same-day set-matching logic is actually named) and
  establish exactly how a quick-add photo could or could not enter scored material. Do not build
  the fence until the leak path is evidenced or refuted; report what you find either way.
- Ghost overlay reference seeding: `openGhostCapture` (`ProgressPhotosScreen.js:493-512`) uses
  latest same-pose photo, or explicit "Set reference" (`ProgressPhotoViewer.js:296-299,436-439`).
  First-ever photo of a pose has no elevated standard (scout 2).
- `finishScan` (`ProgressPhotosScreen.js:584-614`) has no independent re-entrancy guard;
  upstream buttons are disabled during saves and `progressScanOpeningRef` guards session OPEN,
  not finish (scout 4). Reached from multiple paths (continue-after-pose, finish-without-side).
- Photo metadata lives in `progress_photo_meta` (`src/lib/progressPhotoMeta.js`; name-keyed).
- Existing capture tests: `ProgressPhotosScreen.addFlow.test.js`,
  `ProgressGhostCapture.test.js`, `progressScanVision.test.js`, `progressCaptureGuide.test.js`.

## Files/areas likely involved

- `src/screens/ProgressPhotosScreen.js` (pickFrom tagging, finishScan guard, baseline nudge)
- `src/lib/progressPhotoMeta.js` and possibly `src/lib/database.js` (an additive `origin` or
  `unscored` marker on photo meta IF the founder chooses the tag route and no existing field
  serves; additive + idempotent migration with header note if a column is truly needed)
- `src/lib/progressPhotosController.js` / the set-matching logic (fence enforcement point)
- `src/lib/progressCaptureGuide.js` + `src/components/ProgressGhostCapture.js` (baseline copy)
- Colocated `__tests__`

## Requirements

1. **Trace first**: document (in the PR body) the exact path by which a quick-add photo can or
   cannot become scored-comparison material today, with file:line evidence.
2. **Fence (F2 tag route, if chosen)**: quick-add photos carry a persistent origin marker;
   set-matching/scoring logic excludes them from scored sets and comparisons; they remain fully
   visible in the timeline, viewer, and neutral compare. If the founder chose the
   analyse-quick-adds route instead: run the existing vision analysis + advisory retake prompt on
   quick-adds, reusing the scan flow's exact prompt pattern.
3. **Baseline framing (F3 recommended shape)**: when saving the first-ever photo of a pose for
   this user, show one extra sentence ("These become your reference set" wording per the
   world-class blueprint §2) and, if the automated analysis flags it, use the firmer retake
   phrasing; never block.
4. **`finishScan` re-entrancy guard**: a ref/flag ensuring a second invocation while one is in
   flight is a no-op; all existing entry paths covered.
5. British English, theme tokens, existing component patterns, accessibility labels on anything
   new.

## Acceptance criteria

- [ ] Leak-path trace documented with file:line evidence (or "no leak path exists" with proof).
- [ ] Founder's F2/F3 choices recorded and implemented exactly.
- [ ] Quick-add photo can never appear in a scored set or scored comparison (behavioural test).
- [ ] Quick-add photos still appear normally in timeline/viewer/neutral compare.
- [ ] First-ever pose photo shows the baseline framing exactly once; subsequent photos do not.
- [ ] Double-invoking finishScan produces exactly one session mutation (test).
- [ ] No change to scan-flow scoring behaviour (existing suites pass untouched).
- [ ] `npm run lint && npm test` output reported verbatim.
- [ ] Manual device checklist (Android EAS build): quick-add a photo → verify it never gains a
      score row; first-ever front photo → verify baseline sentence; rapid double-tap on the
      finishing action → verify one set saved.

## Tests required

- Behavioural: fence exclusion; baseline shown-once logic; finishScan re-entrancy.
- Source guard: the set-matching function must reference the origin marker (or the analysis
  requirement), so a refactor cannot silently drop the fence.
- Update `ProgressPhotosScreen.addFlow.test.js` for the new pickFrom behaviour.

## Safety rules

No shame, no score chasing, no body panic, no false certainty. The baseline nudge is an
invitation, not a warning. Quick-add photos are never described as lower quality to the user;
they are simply "saved without a score". Copy per the safety blueprint; no em dash.

## Coach rules

Do not touch Coach/check-in integration. No changes to `CoachOutputScreen.js`,
`progressScanCoachResolver.js`, engine files, or check-in code.

## Do-not-overbuild warnings

- No live framing feedback, no skeletal pose tracking, no sensor-tilt blocking (premium later).
- No thumbnails, no image re-encoding work (wave 5 owns EXIF).
- No redesign of the Add-photos sheet; same routes, same order.
- Prefer reusing an existing metadata field over a migration; a migration only if genuinely
  necessary, additive and idempotent with the standard header note.

## Forbidden changes

- ED-safety system and suppression hooks; `SYNC_REGISTRY`; scoring thresholds and the anchor
  logic (wave 1 owns those); billing/tier/identity/notifications; `main` branch. No attribution
  in commits.

## Final response format for Sonnet

1. Files changed (paths + one line each).
2. Tests run (exact commands + verbatim result lines).
3. Acceptance checklist with pass/fail.
4. Remaining risks (bullets, honest) including the leak-path trace conclusion.
