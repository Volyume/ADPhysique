# A3 (screens slice 3) — consistency / copy / professionalism findings

Slice (edit-ownership, exclusive): `src/screens/*.js` sorting alphabetically
AFTER `ProgressPhotosScreen.js` to the end — 27 files:
Quiz, RecipeBuilder, RoutineDetail, ScanBarcode, ScanLabel, SettingsAbout,
SettingsAccount, SettingsCoaching, SettingsData, SettingsDisplay,
SettingsHealth, SettingsPrivacy, SettingsProfile, Settings, ShareCard,
Snapshots, SubscriptionPolicy, Subscription, VolumeHeatmap, WeeklyCheckIn,
Welcome, WellbeingCheck, WorkoutHistory, WorkoutSummary, YearOfLifts, You,
paywallExcerpts.

Method: ripgrep sweeps (em/en dash, US spellings, hex/rgba, brand, AI-speak,
ellipsis, apostrophes, terminology, health claims, a11y counts), every hit
verified against the code before any edit. British English and no em dash in
this document.

NOTE on scope: the special-care files named in the brief also included
`CoachOutputScreen`, `CoachHeldHistoryScreen`, `CoachReviewScreen`. Those
filenames sort BEFORE `ProgressPhotosScreen.js` (C < P), so they are NOT in
this alphabetical slice and were NOT touched. Flagged to the orchestrator in
case a different agent owns them.

---

## AREA 1 — LANGUAGE

### 1a. Em dashes / en dashes (SAFE-FIX rule 2) — APPLIED

The eslint rule (`eslint.config.js` L227-259) only bans em dash (U+2014) in
string `Literal` and `JSXText` nodes; comments are not linted. There were
**zero** user-facing em dashes in string/JSX literals in the slice (lint was
already green on that axis). All 55 em-dash occurrences were in comments, plus
8 en-dash occurrences (2 user-facing rep ranges, 6 in comments). Per STANDARDS
rule 2 ("em dashes and en dashes ... in user-facing copy AND in comments ->
rewrite ... do it thoroughly"), all were rewritten.

Substitution: em dash -> colon (label/heading style) or comma (mid-sentence);
en dash -> hyphen (numeric ranges). 63 lines across 13 files. Severity: minor.
Applied via a line-scoped script, verified: 0 em/en dashes remain in the slice.

Per-file counts (all fix-applied):
- QuizScreen.js: 2 (L2 header em->colon + en range `2-3`; L4 paired em->commas)
- RoutineDetailScreen.js: 2 (L39 comment em->colon; **L397 user-facing rep
  range `{min}–{max} reps` -> `{min}-{max} reps`**, en dash -> hyphen)
- ScanLabelScreen.js: 4 (L91, L92, L370 comment em->comma; L384 em->colon)
- SettingsDisplayScreen.js: 1 (L19 comment em->comma)
- SettingsScreen.js: 2 (L28/L29 paired comment em->commas)
- ShareCardScreen.js: 11 (L2 em->colon; L7/L24/L37/L38 em->comma;
  L229/L338/L354/L375/L400/L483 em->colon)
- SnapshotsScreen.js: 1 (L1 em->colon)
- VolumeHeatmapScreen.js: 3 (L33/L262/L362 comment em->comma)
- WeeklyCheckInScreen.js: 9 (L150/L246/L247/L271 en ranges `1-5`/`0-3`;
  L190/L513/L616/L1174/L1535 comment em->comma)
- WorkoutHistoryScreen.js: 1 (**L388 user-facing `Loading exercises...` ->
  `Loading exercises…`** — three-dot to the app's single-char ellipsis)
- WorkoutSummaryScreen.js: 16 (comment em->comma on L323/452/545/756/848/888/
  1045/1093/1108/1187/1429/1443/1489/1599; **L933 user-facing rep range
  `{repsMin}–{repsMax}` -> hyphen**; **L1151 user-facing placeholder
  `...this session...` -> `…this session…`**)
- YearOfLiftsScreen.js: 5 (L27 em->comma; L86/L188/L365/L595 em->colon;
  L365 en range `3-5`)
- paywallExcerpts.js: 6 (L2 em->colon; L4/L7/L10/L20/L31 em->comma)

### 1b. Ellipsis consistency (SAFE-FIX rule 8) — APPLIED

App convention is the single-char ellipsis `…` (used pervasively: `Loading…`,
`Saving…`, `Signing out…`, `Syncing…`). Two user-facing outliers used three
dots and were normalised (folded into the counts above):
- WorkoutHistoryScreen.js:388 `Loading exercises...` -> `Loading exercises…`
- WorkoutSummaryScreen.js:1151 placeholder `...this session...` -> `…this session…`
Severity: minor.

### 1c. US spellings — NONE FOUND in user-facing copy
Word-boundary sweep (color/behavior/favor/organize/optimize/analyze/catalog/
gray/canceled/etc.) hit only code identifiers: `Math.*`, `color={...}` icon
props, `res.canceled` (expo-image-picker API), `colors.*` tokens, and the
proper noun "Help Center" (Hevy's, in a comment at SubscriptionPolicyScreen.js:7).
No user-facing string needed a British-spelling fix.

### 1d. Brand ("Volyume") — CONSISTENT
No `VOLYUME`/`volyume`/`Voylume` in user-facing copy. WeeklyCheckInScreen.js:1037
`"Anything Volyume should take into account this week…"` is correct. All other
"volume" hits are the training-volume concept (workingSets, VolumeHeatmap, etc.).

### 1e. AI-speak / filler — NONE actionable
Only hit: YearOfLiftsScreen.js:276 comment references the internal audit named
"world-class audit 04a". That is the literal name of a source document, not
marketing filler; renaming it would misname the reference. Left as-is.

---

## AREA 2 — VISUAL

### 2a. Hardcoded colour literals — 1, already a sanctioned exception (no action)
- ScanLabelScreen.js:457 `borderColor: 'rgba(255,255,255,0.9)'` on the camera
  capture ring. Already carries an `eslint-disable-next-line no-restricted-syntax`
  with the justification "white capture-ring is camera-UI convention, sits over
  the live preview" (L456). This matches the theme.js camera-chrome exception
  policy. No exact token exists for white-at-0.9; correctly left raw. Not a defect.
No other raw hex/rgba in the slice.

### 2b. Tokens — no off-token spacing/radius/colour literals found in the slice
that map exactly to a token (nothing to migrate; nothing invented).

---

## AREA 3 — PROFESSIONALISM

### 3a. Placeholder / TODO / lorem / debug copy — NONE user-facing
### 3b. Units / currency ($/lbs) — NONE (all UK: kg, `.toLocaleString('en-GB')`)
### 3c. Health-claim / medical copy — NONE
"torch" hits are the camera torch (British English for flashlight), not a
fat-loss claim.

### Items deferred to decisions (see A3-screens3-decisions.md)
- Terminology drift: "workout" vs "session" for the same concept (FLAG-ONLY).
- Accessibility role/label gaps on interactive elements (warning-level;
  surfaced as a founder decision rather than a scattered partial fix).
- Curly vs straight apostrophes (deliberate, inside single-quoted strings).
- User-facing navigation arrows `→` (breadcrumb convention).
- Coaching-voice / weight / share-card copy in the special-care files: left
  untouched by design.

---

## VERIFICATION
- `npx eslint` on the 13 changed files: **0 errors** (13 pre-existing warnings
  on lines not touched by this audit: react-native-a11y descriptor warnings +
  1 unused-var `insets` in WorkoutSummaryScreen.js:104).
- `npx jest --runInBand` on 20 suites covering the changed screens:
  **all green** (14 screen/guard suites = 721 tests; 6 lib guard suites = 58
  tests). Exact tails in the return message.
- No git commits (orchestrator commits).
