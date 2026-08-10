# Campaign 4 — AUDIT: dead modules, dark flags, travel mode

Lane: `dead-modules-flags`. Order sections PHASE 6, PHASE 7, PHASE 8.
Baseline: branch `claude/campaign4-coherence` = main `92b9644e`.
READ-ONLY audit. Nothing was executed. Every deletion below is a
PROPOSAL with its A-I proof; none may land before the preconditions
named in its row are met.

Authority chain applied: CLAUDE.md Section 2 inviolables → the
Campaign 4 order (CORE CLEANUP LAW, A-I) →
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` →
`docs/TASKBOARD.md` → locked contracts (`docs/*_LOCKED.md`) →
historical audits (never authoritative).

---

## 0. Verdict table

| # | Symbol / module / flag | Class | Action |
|---|---|---|---|
| 1 | `src/lib/food/diaryTimeline.js` | **G** | REMOVE (product-boundary remnant) — after invariant re-anchor |
| 2 | `src/lib/food/diaryDaySummary.js` | **F** | REMOVE |
| 3 | `src/lib/stepsSummary.js` | **F** | REMOVE — after comment fix at `nutritionEngine.js:471` |
| 4 | `src/lib/progressScanCopy.js` | **F** | REMOVE — HARD precondition: re-anchor the guard at `ProgressPhotosScreen.progressScan.guard.test.js:68` |
| 5 | `src/lib/links.js` | **F** | REMOVE + fix 3 stale lines in `docs/PRIVACY_CONSENT_LOCKED.md` — fork recorded, needs a lead ruling first |
| 6 | `ONBOARDING_QUIZ_FIRST` (+ `QuizTraining`, `PlanPreview`, `QuizScreen`, `PlanPreviewScreen`, `quizFlow.js`, `onboarding/planPreview.js`, store slice `onboardingQuiz`) | **D** | KEEP — ROLLBACK SWITCH |
| 7 | `PRO_BETA_ACTIVE` | **D** | KEEP — ACTIVE TEST SEAM (billing-adjacent, touch nothing) |
| 8 | `USE_FOREGROUND_SERVICE` | **D** | KEEP — PLATFORM CAPABILITY |
| 9 | `src/lib/travelMode.js` → `generateTravelPlan` | **A** | KEEP — LIVE |
| 10 | `TRAVEL_EQUIPMENT_OPTIONS` (`travelMode.js:291`) | **F** | REMOVE — DEAD RESIDUE, already-drifted shadow duplicate |
| 11 | `getTravelModeMessage` (`whyThisTemplates.js:397`) | **F** | REMOVE — DEAD RESIDUE + false product promise (defer to the Phase 5 lane, do not double-edit) |
| 12 | `src/components/ProgressScanHistoryCard.js` | **I** | DO NOT DELETE — adjacent finding, FR-3 cluster, not this lane |

Counts: **A=1, D=3 (covering 8 files/routes), F=6, G=1, I=1.**
No B, C, E or H items found in this lane. No data-destructive item
found in this lane — every candidate is pure presentation/config code
with no table, no column, no sync registry entry and no migration.

---

## 1. PHASE 6 — dead module audit

Method for each: full read of the module; grep of the file path; grep
of **every exported symbol** across the whole repo (not just `src/`);
check for lazy/dynamic `require`, Metro platform variants
(`.ios.js`/`.android.js`/`.native.js`), `scripts/`, `.github/`,
`jest.config.js`, `package.json`; `git log --oneline -S <symbol> --all`
to find the commit that removed the last live caller and read its
intent; then decisions register, locked docs, migration headers and
sync registry.

Platform-variant check, once for all five: `ls src/lib/*.ios.js
src/lib/*.android.js src/lib/food/*.ios.js src/lib/food/*.android.js`
→ **none exist**. No Metro variant can be masking a caller.
Scripts/CI check, once for all five: grep of `scripts/`, `.github/`,
`package.json`, `jest.config.js` for all five module names → **zero
hits**. No build or CI path consumes any of them.

---

### 1.1 `src/lib/food/diaryTimeline.js` — CLASS G (PRODUCT-BOUNDARY REMNANT)

**Non-test callers: 0. Test-only callers: 1.**

- Exports: `MORNING_END_HOUR` (:34), `AFTERNOON_END_HOUR` (:35),
  `DAY_PARTS` (:37), `dayPartForHour` (:42), `syntheticHourForSlot`
  (:58), `buildDiaryTimeline` (:90).
- Only importer in the repo:
  `src/lib/food/__tests__/diaryTimeline.test.js:19-20`.
- Three *comment-only* references, no import:
  - `src/lib/database.js:1969` — "no meal-timing judgement is ever
    rendered from it -- see src/lib/food/diaryTimeline.js"
  - `src/lib/sync/tables/foodDomain.js:120` — "Exported for the schema
    round-trip test (Ultimate-Audit item 15, diaryTimeline sync-mapper
    suite)"
  - `src/lib/food/__tests__/confirmPlannedMeal.test.js:17` — "(the flat
    timeline groups those rows under their meal tag instead --
    src/lib/food/diaryTimeline.js)"

**Decision authority — D37 still rules the timeline reverted.**
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:641-645`,
verbatim:

> - (15) Timeline food logging: BUILT `ae9c311` then REVERTED `363d2d7`
>   the same day on the founder's device verdict — meal cards are
>   canonical; NEVER RE-PROPOSE a flat diary. The durable parts
>   (eaten_at schema migrate_115, quiet time display, editable
>   eaten-at) shipped and survive the revert.

CLAUDE.md's status block restates it: "the flat timeline diary was
REVERTED on the founder's device verdict — never re-propose it."
No later decision in the register supersedes D37 on this point.

**The one counter-argument, and why it does not survive.** The revert
commit `363d2d7` ("Restore the meal-card diary layout the founder
chose") ends: *"The unused flat-timeline row component retires; the
pure timeline builder stays available for any future refined view."*
That is a same-day authoring note, not a founder ruling, and it is
superseded on both sides: D37 (2026-07-10) closes the item with NEVER
RE-PROPOSE, and the Campaign 4 order PHASE 6 names this exact file with
this exact test — *"If still zero-live-caller and D37 still rules the
timeline reverted: remove it and stale references/comments."* Both
conditions hold. It is a remnant of a surface that is now a product
boundary, so G rather than F.

**Data / sync / migration dependency: NONE.** The module is pure
presentation ordering. The durable half of item 15 — the `eaten_at`
column, local migration in `database.js:1960-1980`, cloud
`migrate_115_food_entry_eaten_at.sql`, the sync mapper
`_foodEntryToCloud` (`foodDomain.js:121`) — is entirely independent of
this file and MUST NOT be touched. Deleting `diaryTimeline.js` removes
no column, no row, no registry entry.

**Deletion plan (in order, one commit):**
1. **Re-anchor first (Phase 17 A / Phase 23).** The ED-safety law in
   `diaryTimeline.test.js:171-181` ("never attaches a displayed time to
   an untimed entry"; the item carries no derived gap/`time since`/hour
   field) is a *product* law about the diary, not about this module.
   Move it onto the LIVE meal-card surface (`src/components/food/
   MealSection.js`, `EntryRow.js`) before anything is deleted, and pin
   the boundary in `campaign4.boundaries.test.js` as PHASE 23 requires
   ("TIMELINE DIARY — reverted timeline does not return"). Note the
   precedent: `DiaryScreen.timelineNoJudgement.guard.test.js` was
   already deleted by `363d2d7` — do not repeat that loss.
2. Delete `src/lib/food/diaryTimeline.js` and
   `src/lib/food/__tests__/diaryTimeline.test.js`.
3. Correct the three dangling comments (Third Cleanup Law / PHASE 15):
   `database.js:1969`, `foodDomain.js:120`,
   `confirmPlannedMeal.test.js:17` — state the rule inline instead of
   pointing at a deleted file. `foodDomain.js:120`'s `_foodEntryToCloud`
   export stays; only its justification sentence needs rewording.

**Risk: LOW.** Zero runtime reachability, no data, no sync, no
migration. The only real risk is losing the ED-safety invariant, which
step 1 prevents.

---

### 1.2 `src/lib/food/diaryDaySummary.js` — CLASS F (CONFIRMED DEAD)

**Non-test callers: 0. Test-only callers: 1.**

- Exports: `buildDiaryDaySummary` (:22), `formatDiaryDaySummary` (:50).
- Only importer: `src/lib/food/__tests__/diaryDaySummary.test.js:1`.
- Zero comment references anywhere in the repo.

**How it died, and the live replacement.**
`git log -S buildDiaryDaySummary --all` → `4abff6c5` **"Simplify eat
header and remove duplicate day summary"**, which touched only
`src/screens/DiaryScreen.js` (+`DiaryScreen.raceGuardAndDateJump.guard.
test.js`). The removal was deliberate and its intent is in the subject
line: the second summary block was a **duplicate**. The surviving
single authority is `src/components/food/MacroRings.js:177` (reads
`rollup.kcal_total`) fed from `DiaryScreen.js:821`. `DiaryScreen.js:
1672-1673` records the standing intent verbatim: *"Keep planning
reachable after food is logged without adding another diary summary
block above the meals."*

**Decisions / migrations / sync: NONE.** No D-number references this
module; no migration header mentions it; it touches no table. It reads
only in-memory rollup/target objects and `../format`.

**Deletion plan:** delete `src/lib/food/diaryDaySummary.js` and
`src/lib/food/__tests__/diaryDaySummary.test.js`. No invariant needs
re-anchoring — the tests pin arithmetic and string formatting of a
duplicate surface, not a product law (PHASE 17 case B, "HISTORICAL
IMPLEMENTATION ONLY"). The live macro maths in `MacroRings.js` has its
own coverage.

**Risk: LOW.** No caller, no data, no promise left behind.

---

### 1.3 `src/lib/stepsSummary.js` — CLASS F (CONFIRMED DEAD; the guard the order predicted EXISTS)

**Non-test callers: 0. Test-only callers: 1.**

- Exports: `DEFAULT_MIN_DAYS` (:16), `summariseWeekSteps` (:18).
- Only importer: `src/lib/__tests__/stepsSummary.test.js:1`.

**The live guard that forbids its return — found.**
`src/lib/__tests__/weeklyCheckInCopy.guard.test.js:44-48`:

```
test('shipped weekly check-in no longer exposes step-average collection', () => {
    expect(CHECKIN).toContain('stepsAvg: null');
    expect(CHECKIN).not.toMatch(/showSteps|stepsSummary|stepsManual|stepsOverride/);
    expect(CHECKIN).not.toMatch(/Average steps a day|Steps this week|step coaching|tracked on a device/);
});
```

`CHECKIN` is `src/screens/WeeklyCheckInScreen.js`
(`weeklyCheckInCopy.guard.test.js:5`). This is precisely the case the
order's PHASE 6 describes — *"if a live guard explicitly forbids its
return and no live caller exists: this is strong evidence for removal.
Preserve the guard against resurrecting the removed surface if needed,
without preserving the module."*

**Crucially, the guard survives deletion untouched.** It reads
`WeeklyCheckInScreen.js`, never `stepsSummary.js`. Deleting the module
does not break it, and the guard must be KEPT verbatim.

**Provenance.** `git log -S summariseWeekSteps --all` → `36d054bf`
"Stabilise Android release gate and coach surfaces" removed the caller
from `WeeklyCheckInScreen.js` **and added this guard in the same
commit** (`+23` lines to `weeklyCheckInCopy.guard.test.js`). Removal
and protection landed together; the module was left behind.
`WeeklyCheckInScreen.js:780` now hard-writes `stepsAvg: null`.

**PHASE 2 separation — steps/general activity is LIVE and MUST SURVIVE.**
The order forbids collapsing cardio logging with steps/activity. What
stays live, none of it importing `stepsSummary.js`:
- `src/lib/activitySteps.js:123,146` — reads and backfills `daily_steps`.
- `src/lib/database/activity.js:20,37,51,258,268,279` — the accessors.
- `src/lib/database.js:1232` (table), `:4858` (registry list), `:5581`,
  `:5593` (sync push/restore handlers), `:5975` (`stepsAvg` ↔
  `steps_avg` column map), `:1301` (`weekly_checkins.steps_avg`).
- `src/lib/sync/tables/weeklyCheckins.js:69` — `steps_avg` push.
- `src/lib/nutritionEngine.js:479` — **`computeStepTrendModifier`**, a
  live engine function reading `getDailyStepsRange` output.
- `src/lib/weeklyCoach.js:753, 1205-1211, 1617-1621` — live coach copy
  from `checkin?.stepsAvg`.

None of that is touched by this deletion. Only the retired *check-in
collection helper* dies.

**Mandatory precondition — one dangling reference.**
`src/lib/nutritionEngine.js:470-471` documents the LIVE engine's
contract *by pointing at this module*:

> `//                  steps <= 0 or a missing day is "unlogged" (matches`
> `//                  summariseWeekSteps semantics).`

That comment must be rewritten to state the rule inline
("a day with `steps <= 0` or no row is unlogged") in the same commit,
or the live engine will document itself against a deleted file. This is
a comment fix only — `computeStepTrendModifier`'s behaviour must not
change.

Also check on landing: `database.js:1296-1298` narrates the retired
four-day auto-average path ("when at least four days of `daily_steps`
are registered the check-in saves the auto average here"). That is a
migration header describing behaviour the check-in no longer has. It
should gain a "superseded, see `weeklyCheckInCopy.guard.test.js`" note
rather than be rewritten — the *column* is still live and written from
elsewhere.

**Deletion plan:** fix `nutritionEngine.js:471`; delete
`src/lib/stepsSummary.js` and `src/lib/__tests__/stepsSummary.test.js`;
annotate `database.js:1296`; KEEP `weeklyCheckInCopy.guard.test.js`
exactly as it is.

**Risk: LOW-MEDIUM.** Low on reachability; medium only in that a
careless sweep of the word "steps" could hit the live system above.
Whoever executes must delete by *file path*, never by keyword.

---

### 1.4 `src/lib/progressScanCopy.js` — CLASS F (CONFIRMED DEAD) with a HARD precondition

**Non-test callers: 0. Test-only callers: 2 (one of them a
source-level guard that reads this file).**

- Exports: `trendOnlyScanCopy` (:5), `scanReadCopy` (:16),
  `scanStatsCopy` (:38).
- Importer 1: `src/lib/__tests__/progressScanCopy.test.js:1`.
- Importer 2 (the reason it was "previously uncertain"):
  `src/screens/__tests__/ProgressPhotosScreen.progressScan.guard.test.js:5`
  `const SCAN_COPY = fs.readFileSync(path.resolve(__dirname, '../../lib/progressScanCopy.js'), 'utf8');`
  used once, at **:68**:
  `expect(SCAN_COPY).toMatch(/!suppressed && !hideExact && Number\.isFinite\(stats\.weightKg\)/);`

**The REAL live progress-scan copy architecture (traced, per PHASE 6).**
`src/lib/progressScanResultsContract.js:9-12` states the contract
verbatim:

> Every UI surface that renders a score (the timeline "score row", the
> compare summary, the trend view) is meant to build its rendered
> strings through this module and progressScanTrendViewModel.js, so the
> tier contract is enforced in exactly one place.

The live chain, none of it importing `progressScanCopy.js`:
- `src/lib/progressScanDisplay.js` — `formatVolyumeScore`,
  `progressScanAssessmentForDisplay`, `progressScanScoreForDisplay`.
  Live importers: `ProgressScanCompare.js:21`,
  `ProgressScanHistoryCard.js:15`, `shareCard/beforeAfterParams.js:2`,
  `progressScanResultsContract.js:19`,
  `progressScanTrendViewModel.js:12`, `AthleteProfileScreen.js:47`,
  `ProgressPhotosScreen.js:95`, and `progressScanCopy.js:1` (dead).
- `src/lib/progressScanResultsContract.js` — `buildScanReceipt` (:240),
  `resolveConfidenceTier`, `confidenceChipLabel`; consumed by
  `ProgressScanCompare.js:22`, `ProgressScanMeaningMoment.js:16`.
- `src/lib/progressScanTrendViewModel.js` — consumed by
  `ProgressScanTrend.js:28`.
- `src/screens/ProgressPhotosScreen.js:1221-1253` — `libraryScanSummary()`,
  the screen's own inline Score/Leanness/Change/Confidence rows;
  receipt at `:1265-1272`.
- `src/lib/progressScanCoachResolver.js:115` — the live hide-exact copy
  branch, fed by `getProgressScanHideExactPreference()` at
  `CoachOutputScreen.js:1508`.

`progressScanCopy.js` is an orphan of `5dd6eb11` "Extract progress scan
display copy"; the surfaces were subsequently rebuilt on the contract
module above and never came back to it.

**HARD precondition — a privacy invariant currently lives ONLY on the
dead module.** The guard at `:68` pins that a scan's bodyweight is
rendered only when `!suppressed && !hideExact`. That is a
CLAUDE.md Section 2 / GDPR-adjacent law (share cards and scan surfaces
must not leak bodyweight; the sole founder-approved exception is the Pro
before/after card). Deleting `progressScanCopy.js` both **breaks the
guard file at `:5`** (unreadable path → suite fails) and **drops the
law**. Per PHASE 17 case A the law must move to the live implementations
FIRST:
- `src/components/ProgressScanCompare.js:49-52` — `scanWeightLabel`,
  `if (hideExact) return null;` then `scan?.stats?.weightKg`.
- `src/components/ProgressScanHistoryCard.js:102-105` — `weightLabel`,
  `if (suppressed || hideExact) return 'Hidden';`.
- `src/screens/ProgressPhotosScreen.js:1263` — `weightText`.
- `src/lib/shareCard/beforeAfterParams.js:88-92` — `showWeight` gate
  (the founder-approved exception's own guard).

**FR-3 interaction — read before landing (PHASE 13 / PHASE 29).**
FR-3 (progress-scan "hide exact numbers") is an OPEN founder ruling:
`docs/discoverability-audit-2026-08-10/SETTINGS-OWNERSHIP.md:52-61`
and `:18`. Its Option A explicitly nominates Campaign 4 to "delete the
dead setter and the inconsistency". **Deleting `progressScanCopy.js`
neither resolves nor prejudges FR-3**, and the commit must say so: FR-3
concerns `setProgressScanHideExactPreference`
(`src/lib/progressScanPreferences.js:44`) and whether a user-facing
control is productised. The live *reader* path
(`getProgressScanHideExactPreference` at `progressScanPreferences.js:34`
→ `CoachOutputScreen.js:1508` → `progressScanCoachResolver.js:115`) and
the live hideExact-aware components stay untouched, so either FR-3
outcome remains fully available afterwards. **Do not touch
`progressScanPreferences.js` in this lane.**

**Deletion plan:**
1. Add the weight-privacy assertions against the four LIVE surfaces
   listed above (own test or extension of the existing guard).
2. Remove line 5 and line 68 of
   `ProgressPhotosScreen.progressScan.guard.test.js`; every other
   assertion in that file reads `SCREEN` or `CONTROLLER` and is
   unaffected.
3. Delete `src/lib/progressScanCopy.js` and
   `src/lib/__tests__/progressScanCopy.test.js`.
4. Commit body states explicitly that FR-3 remains unresolved.

**Risk: MEDIUM.** Not on reachability (certain), but because a
privacy invariant and an open founder ruling both sit in the blast
radius. Steps 1 and 4 are not optional.

---

### 1.5 `src/lib/links.js` — CLASS F (CONFIRMED DEAD), fork recorded, lock is STALE

**Non-test callers: 0. Test-only callers: 0.** (One comment mention.)

- Exports: `LINKS` (:11) with `privacyPolicy` (:19), `marketing` (:22),
  `supportEmail` (:25).
- Repo-wide grep for `lib/links`, `from './links'`, `require(...links')`
  and the bare `LINKS` symbol: the **only** hit outside the file itself
  is a comment —
  `src/screens/__tests__/privacyTruth.guard.test.js:37`: *"the public
  policy and src/lib/links.js already use."* No import, no require, no
  test.

**Every privacy / support / marketing URL consumer, traced.**

| Surface | What it actually does | Uses `links.js`? |
|---|---|---|
| Article 9 consent → "Read the full privacy policy" | `Article9ConsentScreen.js:175-178` `openPrivacyPolicy()` → `navigation?.navigate('PrivacyPolicy')`, comment: *"Show the policy in-app (native screen with its own BackHeader) instead of bouncing to the system browser mid-consent."* | **No** |
| You → Privacy → "Privacy policy" row | `SettingsPrivacyScreen.js:114-116` → `navigation.navigate('PrivacyPolicy')` | **No** |
| `PrivacyPolicyScreen.js` | Fully native. Grep for `WebView|webview|openURL|http` → **zero hits**. It renders the policy text in-app. | **No** |
| Support address, crash boundary | `App.js:374` hard-codes `mailto:support@volyume.app?...`; pinned by `crashBoundary.guard.test.js:46` | **No** |
| Support address, in-app policy | `PrivacyPolicyScreen.js:104` and `:123` hard-code `support@volyume.app`; pinned by `privacyTruth.guard.test.js:39-43` (≥2 mentions, no personal Gmail) | **No** |
| Support address, credits | `CreditsScreen.js:98` hard-codes it in prose | **No** |
| Deep-link prefixes | `RootNavigator.js:760` `prefixes: ['volyume://', 'https://volyume.app']` — navigation config, not an outbound link | **No** |
| Public web policy (Play/App Store listing requirement) | `public/privacy/index.html`, `public/support/index.html`; pinned by `privacyTruth.guard.test.js:46-52` | **No** |

So: the app never opens `https://volyume.app/privacy` and never reads
`LINKS.supportEmail`. `links.js`'s own header claim — *"Single source of
truth for outbound URLs the app links to"* (`:2`) — is false today, and
the duplication it was written to prevent already exists across
`App.js:374`, `PrivacyPolicyScreen.js:104,123` and `CreditsScreen.js:98`.

**THE LOCK IS STALE — exact lines to fix.** `docs/PRIVACY_CONSENT_LOCKED.md`:

1. **`:80-81`** — *"Tapping the policy link opens a webview to
   volyume.app/privacy."* **FALSE.** It navigates to the native
   `PrivacyPolicyScreen` (`Article9ConsentScreen.js:175-178`). Replace
   with: *"Tapping the policy link opens the in-app native
   `PrivacyPolicyScreen` (`src/screens/PrivacyPolicyScreen.js`),
   registered in `RootNavigator.js:577` and `:716`; the user is never
   bounced to a browser mid-consent."*
2. **`:259`** — *"'Read the privacy policy' → webview to
   volyume.app/privacy."* **FALSE**, same reason
   (`SettingsPrivacyScreen.js:114-116`). Same correction.
3. **`:293-294`** — *"The privacy policy URL is hardcoded as
   `https://volyume.app/privacy` in `src/lib/links.js`. Update both the
   marketing site and the in-app link together if the URL changes."*
   **STALE**: nothing reads `links.js`, and the in-app policy is native
   text, not a URL. Replace with the surviving truth: the public policy
   is `public/privacy/index.html` (store-listing requirement, pinned by
   `privacyTruth.guard.test.js:46-52`); the in-app policy is
   `PrivacyPolicyScreen.js` and must be edited in step with it.
4. **`:309`** (*"Privacy policy at volyume.app/privacy contains all 12
   sections"*) is a verification line about the PUBLIC page and stays
   TRUE — do not touch.

**THE FORK — needs a lead ruling (D33/D95) before the diff lands.**
Two legitimate outcomes; the order pulls both ways and I will not
pre-decide (CLAUDE.md Section 4, no silent corner-cutting):

- **(A) DELETE** `src/lib/links.js` + fix the three doc lines above.
  Follows PHASE 6 literally ("Trace every privacy/support URL before
  deleting. If the lock is stale: fix documentation authority as part of
  the same change"). Leaves `support@volyume.app` duplicated across
  four live files — which is the status quo today.
- **(B) WIRE IT** — make `links.js` genuinely canonical by importing
  `LINKS.supportEmail` at `App.js:374`, `PrivacyPolicyScreen.js:104,123`
  and `CreditsScreen.js:98`, and keep the lock line pointing at it.
  Follows PHASE 14 ("ONE PRODUCT TRUTH … should not have multiple
  accidentally divergent authorities"). But PHASE 14 governs
  *mathematical* authorities, and the order also says "Do NOT build
  anything new" — (B) is a small build, and it changes four live files
  including the crash boundary.

**Recommendation for the ruling, neutrally framed:** (A) is the
in-scope reading of Campaign 4; (B) is the better long-term shape but is
new wiring in a release-sensitive file (`App.js` crash boundary,
`crashBoundary.guard.test.js:46`). Either way the three doc lines are
wrong TODAY and must be fixed in this campaign regardless of which
option wins — that part is not conditional.

**Risk: LOW on deletion (no reachability at all); the real work is the
doc-authority fix.**

---

## 2. PHASE 7 — dark routes / flags / rollback seams

**Complete sweep for hard-off flags.** Two independent passes over
`src/` + `App.js`:
- `^\s*(export\s+)?const\s+[A-Z][A-Z0-9_]{3,}\s*=\s*false\s*;`
- `const [A-Za-z_]*(ENABLED|_ON|ACTIVE|FLAG|USE_|SHOW_|ALLOW_)[A-Za-z0-9_]*\s*=\s*false`

Both return **exactly three** results, the three the order predicted.
**No fourth hard-off flag gating a route or feature exists on current
main.** This closes the "any other hard-off flag found by sweeping src"
question with a negative result.

---

### 2.1 `ONBOARDING_QUIZ_FIRST = false` — **ROLLBACK SWITCH**, class D, KEEP

`src/lib/onboarding/quizFlow.js:24`.

**The locked doc calling it a deliberate rollback —
`docs/ONBOARDING_SEQUENCE_LOCKED.md:196-203`, quoted verbatim:**

> ## COMP-030 addendum (2026-06-12) — quiz-first variant, flag-gated
>
> > **REVERSED 2026-06-26 by explicit founder decision:
> > `ONBOARDING_QUIZ_FIRST` is [OFF]. … 8-question pre-account quiz —
> > surfacing a free-style quiz on the Pro CTA was illogical and broke
> > the Pro flow. The quiz-first front door is removed from the [live
> > path]; the screens stay registered in code as the rollback switch;
> > set `ONBOARDING_QUIZ_FIRST = true` to restore.**

That is the order's test — *"existing locked documentation previously
described this as deliberately retained rollback behaviour. Unless a
later ruling superseded it: KEEP."* **No later ruling supersedes it.**
Corroborated by `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:286-301` (the
privacy properties of the pre-account quiz are locked: answers live only
in JS memory, no uid, no persisted key) and by the code comment
`quizFlow.js:19-23` ("reversible — set `ONBOARDING_QUIZ_FIRST = true`
to restore").

**The switch's full surface — all of it class D, all KEEP:**

| Piece | Location | Note |
|---|---|---|
| The flag | `quizFlow.js:24` | |
| The one branch | `WelcomeScreen.js:15, 69-72` | `if (ONBOARDING_QUIZ_FIRST) navigation.navigate('QuizTraining')`, else `navigate('Login', { intent: 'pro_signup' })` — the live path |
| `QuizTraining` route | `RootNavigator.js:679` (lazy screen at `:81`) | comment at `:678`: "Registered always (harmless); only reached when ONBOARDING_QUIZ_FIRST is on and the user picks Pro" |
| `PlanPreview` route | `RootNavigator.js:680` (lazy screen at `:82`) | |
| `QuizScreen.js` | `PHASE_PRE_ACCOUNT` (`quizFlow.js:48`) gates the phase question at `QuizScreen.js:33, 160` | |
| `PlanPreviewScreen.js` | reads `s.onboardingQuiz` at `:19` | |
| `QUIZ_STEPS` | `quizFlow.js:29` | |
| `isQuizComplete` | `quizFlow.js:51` | |
| `src/lib/onboarding/planPreview.js` | `buildPlanPreview` (:68) | |
| Store slice | `useAppStore.js:1167-1176` (`onboardingQuiz`, `setQuizField`, `markQuizStep`, `resetOnboardingQuiz`) | |
| **A LIVE consumer of the dark slice** | `ProOnboardingScreen.js:404-416` | one-shot mount effect prefilling experience/session length/days/equipment/goal/phase from `onboardingQuiz`; no-op when the flag is off. **This is live code and must not be removed.** |
| Telemetry | `src/lib/telemetry/events.js:215-218` | deferred event, correctly labelled "emitted at account_created only when ONBOARDING_QUIZ_FIRST is on" — accurate, no fix needed |

**Do not confuse with the LIVE quiz.** `src/screens/PlanLibraryScreen.js`
has its **own** unrelated `QUIZ_STEPS` (`:94`, used at `:394, :399,
:639-663`) — the live plan-finder bottom sheet, pinned by
`PlanLibraryScreen.quizBottomSheet.guard.test.js:34`. Different constant,
different file, fully live. A keyword sweep on `QUIZ_STEPS` would hit it.

**Action: KEEP everything above. No change.** Optional (documentation
only): `CURRENT-STATE-DOSSIER.md:69` still claims "Auth is Apple/Google
OAuth ONLY (email/password removed 2026-07-01)", contradicted by
CLAUDE.md Section 1 (email/password re-added 2026-07-21). That is a
PHASE 15 item for the docs lane, flagged here, not fixed here.

---

### 2.2 `PRO_BETA_ACTIVE = false` — **ACTIVE TEST SEAM**, class D, KEEP, TOUCH NOTHING

`src/lib/proGate.js:28`. Billing-adjacent: CLAUDE.md Section 2 forbids
changing billing without explicit founder permission, and the order
(PHASE 7, PHASE 19, PHASE 30) forbids changing billing behaviour.
**I verified the seam by reading only; I propose no change of any kind.**

**Why it is an ACTIVE TEST SEAM, not dead residue.** The flag is not
merely read — the resolver is deliberately parameterised so both
branches stay exercisable. `proGate.js:30-32`:

> Pure tier resolver. Exported as `_resolveTier` so tests can drive the
> post-beta branches **without globally mocking PRO_BETA_ACTIVE**.

`_resolveTier(trialState, betaActive)` (`:39-53`) takes `betaActive` as
an argument; `isPaidTier` (`:62-63`) is the only place that binds the
constant. Confirmed exercised by
`src/lib/__tests__/proGate.test.js:13, 27` and
`src/lib/__tests__/auth-scenarios.test.js:60`.

**Live consumers (all correct, none dead):**
- `useAppStore.js:809-813` — lazy `require('../lib/proGate')` inside
  session restore; `if (PRO_BETA_ACTIVE)` writes `tier: 'pro'`.
- `useAppStore.js:1026-1027` — lazy require; `PRO_BETA_ACTIVE ? 'pro' :
  data.tier`, sitting immediately before the C-1 optimistic-purchase
  window logic (`:1030-1032`). Editing this line risks the just-purchased
  unlock path.
- `ProUpgradeScreen.js:20, 228, 523, 531, 542, 549` — paywall copy and
  CTA branching, including the analytics label
  `trackCta(PRO_BETA_ACTIVE ? 'activate_beta' : ...)`.
- `RootNavigator.js:1568` — comment only.

Both store consumers use **lazy `require` inside a function**
(`// eslint-disable-next-line global-require`), the documented house
pattern for avoiding import cycles (CLAUDE.md Section 3). A static
importer scan would miss them — recorded here so no later pass
misclassifies `proGate.js` as having fewer consumers than it has.

Locked-doc corroboration: `docs/COMPLETE_TIER_SCOPE_LOCKED.md:13` and
`:129` ("`proGate.js` now exports only `PRO_BETA_ACTIVE`, …").

**Action: NO CHANGE. Not a candidate for removal in any phase.**

---

### 2.3 `USE_FOREGROUND_SERVICE = false` — **PLATFORM CAPABILITY**, class D, KEEP

`src/lib/notifications/activeWorkout.js:49`, module-private (not
exported). The order: *"platform capability, not ordinary product
feature. Do not remove without dedicated platform evidence."*

**The dedicated platform evidence is in the file itself**
(`activeWorkout.js:36-48`, quoted):

> Feature flag for the foreground-service-backed WORKOUT notification
> path (the whole-session notification, not the rest window). Stays
> false: the session-length notification surface itself is disabled
> below (the "Set 3 of 2" founder decision), so there is nothing for a
> service to host.
>
> History: this was originally held off because
> `WorkoutForegroundService` used `FOREGROUND_SERVICE_TYPE_HEALTH`,
> which from Android 14 throws SecurityException without a health
> runtime permission. E6A (2026-07-02) retyped the service to
> SHORT_SERVICE for the rest window — see
> `notifications/restForeground.js` for the path that IS live — so the
> old crash no longer exists, but a shortService (~3 min) cannot host a
> session-length notification anyway. If the session surface is ever
> revived, it needs its own service-type decision.

Two independent reasons to keep, both platform-level: (a) the Android
service-type constraint is real and documented with its own remediation
history; (b) `android.permission.FOREGROUND_SERVICE` is declared at
`app.json:70` and the capability IS live for the rest window via
`src/lib/notifications/restForeground.js`. Removing the flag would erase
the only record of why the session surface cannot use it.

**Adjacent finding — NOT this lane, handed over.**
`showActiveWorkoutNotification` (`activeWorkout.js`) begins with a bare
`return;` followed by `// eslint-disable-next-line no-unreachable`, so
the entire body — including the `if (USE_FOREGROUND_SERVICE)` block at
`:138` and the expo-notifications fallback — is unreachable. The
function is a **deliberate** hard no-op (founder decision on confusing
"Set 3 of 2" copy; `CURRENT-STATE-DOSSIER.md:84` records it as
"a deliberate hard no-op"), with exported call sites in
`ActiveWorkoutScreen` left intact by design ("kept exported so call
sites … can stay untouched, they fire into the void"). Whether that
dead body is retired belongs to the **PHASE 3 lane** (dead
`applyNotifications` code / Campaign 3 deferred items), not here.
Recorded so it is not lost, and so the PHASE 3 lane knows the founder
decision behind it before touching it.

**Action: KEEP the flag and its comment block verbatim.**

---

## 3. PHASE 8 — travel mode

**Current status after Campaign 3's correction: the generator is LIVE
and correctly surfaced. Campaign 3's map correction is confirmed.**

### 3.1 LIVE — class A, KEEP

- `src/lib/travelMode.js` → `generateTravelPlan` (`:175`), `TRAVEL_POOL`
  (`:16`), `TRAVEL_SET_PARAMS` (`:150`).
- Live caller: `src/screens/BuildWorkoutScreen.js:22` (import), `:196-200`
  (`applyTravelMode()` → `generateTravelPlan({ equipment:
  travelEquipment, daysPerWeek: 4, splitType: 'full_body' })`), `:210`.
- Live user entry point: the travel bottom sheet at
  `BuildWorkoutScreen.js:405-441` — chips at `:412-425`
  (`travelEquipment` state at `:57`), "Create workout" at `:435-440`
  → `applyTravelMode`.
- Pinned live by
  `src/screens/__tests__/BuildWorkoutScreen.travelSheet.guard.test.js:17,23`
  and `BuildWorkoutScreen.pickerCloseTouchTarget.guard.test.js`.

**No new travel-mode UI is proposed. The chip stays exactly as it is.**

### 3.2 DEAD around it — two items

**(a) `TRAVEL_EQUIPMENT_OPTIONS` — `src/lib/travelMode.js:291-295` —
class F, REMOVE.**
Zero importers anywhere in the repo (grep of the symbol returns only its
own definition). The live screen inlines its own list at
`BuildWorkoutScreen.js:412-416`. This is a **shadow duplicate that has
already drifted**:

| | `travelMode.js:291-295` (dead) | `BuildWorkoutScreen.js:412-416` (live) |
|---|---|---|
| field name | `key` | `id` |
| hotel gym label | `'Hotel gym (dumbbells + cables)'` | `'Hotel gym'` |
| icons | none | `body-outline` / `barbell-outline` / `fitness-outline` |

Exactly the PHASE 14 failure mode ("more than one implementation
purports to calculate the same product truth"), caught before it can
mislead. Deletion is one export in one file, zero callers, zero tests.

**(b) `getTravelModeMessage` — `src/lib/whyThisTemplates.js:397-402` —
class F, REMOVE — but this belongs to the PHASE 5 lane.**
Test-only callers: `src/lib/__tests__/whyThisTemplates.snapshot.test.js:20,
116-121, 180, 221-222`. No live caller.
Beyond being dead, it would be a **false product promise if revived**:
it renders *"One-week travel plan … / N-week travel plan …"*, whereas
the live path builds a single session and the sheet copy says
*"Volyume will build a full-body workout that keeps you moving without
changing your plan"* (`BuildWorkoutScreen.js:410`). Flagged here for
completeness; the PHASE 5 dead-copy-generator lane owns the edit to
`whyThisTemplates.js` and its shared snapshot suite (which also covers
`getPosingConditioningMessage` etc. at `:180, :221`) — **do not
double-edit that file from this lane.**

### 3.3 Nothing else around travel mode is dead

`travelMode.js`'s remaining internals (`TRAVEL_POOL`, `TRAVEL_SET_PARAMS`,
the `:129` bodyweight fallback) are all reached from `generateTravelPlan`.
The other files matching "travel" (`weeklyCoach.js`, `interBlock.js`,
`mealPlanService.js`, `notifications/scheduler.js`,
`trainingHabitSchedule.js`, `dataBackup.js`, `sync/tables/*.js`,
`contestCountdown.js`, `MethodologyScreen.js`, `ManualBuilderScreen.js`,
`drawShareCard.js`, `formTips.js`, `seedRoutines.js`) match on unrelated
prose or on live plan/coach behaviour, not on a travel-mode surface.

**PHASE 8 answer: the generator is LIVE, the copy generator and the
equipment-options constant are dead residue. Travel mode is NOT
exposed anywhere new, and nothing here proposes exposing it.**

---

## 4. Adjacent finding, class I — DO NOT DELETE, not this lane

**`src/components/ProgressScanHistoryCard.js`** — zero live importers.
Only references: its own definition (`:130`), its full test suite
(`src/components/__tests__/ProgressScanHistoryCard.test.js`), the
expo-image polish list (`imagePolish.expoImage.guard.test.js:43`), and a
guard that explicitly **forbids** the screen from rendering it
(`ProgressPhotosScreen.progressScan.guard.test.js:43`:
`expect(SCREEN).not.toMatch(/<ProgressScanHistoryCard/)`).

Class **I (UNCERTAIN — DO NOT DELETE)** because (a) it is a component,
owned by the components/routes lane, not this one; (b) it implements
`scoreLabel`/`weightLabel`/`whyLabel` hide-exact behaviour
(`:95-123`) and therefore sits inside the **open FR-3 cluster**, where
PHASE 13 forbids resolving anything by deleting code. Refer to the
components lane with FR-3 attached. Recorded so it is not silently
swept.

---

## 5. Preconditions summary (nothing lands without these)

1. **Before any deletion:** the ED-safety timeline invariant
   (`diaryTimeline.test.js:171-181`) is re-anchored onto the live
   meal-card surface, and the "reverted timeline does not return"
   boundary is pinned in `campaign4.boundaries.test.js` (PHASE 23).
2. **Before deleting `stepsSummary.js`:** `nutritionEngine.js:471`'s
   "matches summariseWeekSteps semantics" comment is rewritten inline;
   `weeklyCheckInCopy.guard.test.js:44-48` is KEPT verbatim; the whole
   live steps/activity system (§1.3) is untouched.
3. **Before deleting `progressScanCopy.js`:** the weight-privacy law at
   `ProgressPhotosScreen.progressScan.guard.test.js:68` is re-anchored to
   the four live surfaces; the commit states FR-3 stays unresolved;
   `progressScanPreferences.js` is untouched.
4. **Before deleting `links.js`:** the A/B fork is ruled (D95), and
   `docs/PRIVACY_CONSENT_LOCKED.md:80-81`, `:259` and `:293-294` are
   corrected **either way**.
5. **`PRO_BETA_ACTIVE`, `ONBOARDING_QUIZ_FIRST`, `USE_FOREGROUND_SERVICE`
   and every route/screen/store slice behind them: no change.**
6. Nothing in this lane touches a table, column, sync registry entry,
   migration, billing path or ED threshold. Migrations 132-135 and 049
   are not implicated at all.
