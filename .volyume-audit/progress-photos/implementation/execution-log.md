# Progress Photos / Image Scoring — Execution Log

Lead: Fable (main loop). Implementation agents: Sonnet (per wave). Run date: 2026-07-08.

## Starting state

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Starting commit: `e1fa8a9` (audit-doc commits on top of audited app commit `0025e07`)
- Working tree: clean (no dirty files)
- Codex coordination check: `git log 0025e07..HEAD -- src/ modules/ assets/` is EMPTY; the last
  Codex touch on `src/lib/progressScanCoachResolver.js` was `883b772`, which PRECEDES the audit
  commit `0025e07` and is therefore already reflected in the saved audit. No in-flight collision.

## Founder approvals (given in the execution instruction, 2026-07-08)

1. **F1 anchor clamp**: audit-recommended option (a). Clamp the provisional regressor anchor to
   +/-8 points; cap confidence at Moderate when the anchor engages; reflect engagement in the
   confidence/receipt language; no wild visible-score swings from the provisional regressor.
2. **Coach card**: the display-only "Progress photo context" card is CONFIRMED as approved
   current state, under strict display-only constraints (no targets/calories/macros/refeeds/
   diet breaks/training/check-in influence; low-confidence and withheld scans behave like absent;
   all proven by tests). Wave 4 hardens; it must not expand.
3. **Priority**: scoring trust first; coach/check-in context work last.
4. **Current-state fact**: scans are NOT a decision input for Coach/check-ins; any hidden
   dependency found is a bug to remove/guard.
5. **Safety stance**: no shame, no body panic, no score chasing, no overconfident body-fat
   claims, no fake AI certainty, no hidden coaching changes from scans, no red/green judgement,
   no streak pressure.
6. **Decision authority**: Fable may apply the saved blueprint's recommendation where there is
   ambiguity; stop conditions limited to the founder's listed cases.

## Wave order (decided by Fable)

`1 → 2 → 3 → 5 → 4`, strictly sequential.

Reason: waves 1, 2 and 3 all touch `src/screens/ProgressPhotosScreen.js` (conflict risk rules
out parallelism); wave 5 touches `src/lib/progressPhotos.js`/`database.js` which wave 2 may
brush (origin marker) so it follows 3; wave 4 runs last per founder priority 3 and because its
guard tests should pin the final shape of the scoring surfaces. This matches the founder's
preferred order.

## Fable decisions (blueprint-recommendation authority)

- **F2 (wave 2, quick-add asymmetry)**: TAG route, per scoring blueprint §4 recommendation and
  founder top-10 item 5 wording ("unscored tag, never comparison material"). No vision pipeline
  on quick-adds.
- **F3 (wave 2, first-photo baseline)**: recommended shape — one extra "reference set" sentence
  plus firmer retake phrasing when flagged; NEVER a hard block.
- **Wave 3 uncertainty display**: numeric range stays HIDDEN (qualitative-first), per scoring
  blueprint §5 / results blueprint §2 deliberate design and founder safety stance ("no fake AI
  certainty"). Low-tier "Show score anyway" affordance included with caveat copy per results
  blueprint §1.
- **Scoring blueprint §6 additions 2 and 3** (anchor-divergence withhold, multi-day session
  integrity withhold) are NOT in this execution's scope: the divergence threshold is explicitly
  "set during §10 corpus work, not guessed", and neither appears in the launch-critical top 10
  or any wave doc's requirements. Recorded here, not silently dropped.
- **Wave 5 EXIF strip mechanism**: `expo-image-manipulator` is NOT a dependency and new
  dependencies are forbidden without founder yes. Decision: pure-JS JPEG metadata segment strip
  (remove APP1/EXIF and other metadata APP segments from the JPEG byte stream) applied on every
  save path. Lossless (no re-encode, no quality change), zero new dependencies, byte-testable in
  Jest, satisfies the blueprint requirement "stored files carry no EXIF/GPS" and the acceptance
  test "GPS-tagged fixture in → EXIF-free bytes out". This does NOT hit the founder stop
  condition because no external dependency is required.
- **Wave 5 iOS backup exclusion**: no supported JS API exists in the installed `expo-file-system`;
  never eject. Decision: smallest native touch — extend the EXISTING in-repo native module
  (`modules/progress-scan-image`) with a `setExcludedFromBackup(path)` function (iOS
  `NSURLIsExcludedFromBackupKey` via `URLResourceValues`; Android no-op), called best-effort on
  photo-directory creation and healed at app photo-flow start. Jest cannot verify the attribute;
  manual verification goes on the device checklist, as the wave doc allows.
- **Wave 5 stale artefacts**: founder sign-off to DELETE the dead cloud `progress_photos` table
  from `supabase/schema.sql`/`setup_complete.sql` was not granted in this run → apply the wave
  doc's sanctioned fallback: clarifying header notes only. `docs/BUDGET_POSTURE_LOCKED.md` is a
  LOCKED doc → untouched; correcting its photo section stays an outstanding founder action.
- **Review model**: Fable reviews each wave's diff hands-on in the main loop (no review agents),
  per the founder's execution model for this run.
- **Testing posture**: targeted suites per wave (this surface is safety-adjacent), plus lint;
  one full `npm test` before final push.

## Wave log

(filled in as waves complete)
