# VOLYUME user-facing function scorecard (2026-07-09)

**Method.** Read-only. No source changed for this document. Built from the
existing evidence corpus — `docs/design-usability-audit-2026-07-09/`
(00-MASTER-INDEX + coverage-00-SYNTHESIS + all eight coverage lanes),
`docs/ux-world-class-audit-2026-07-09/` (ASSESSMENT.md, the eight
`facts-*.md` files, cohesion-01/02, parked-items-triage,
DECISIONS-2026-07-09.md, `_HANDOVER-AND-RESUME.md`'s stage log) — plus a
direct code check on every item this document scores low, specifically to
confirm which findings are still true against the CURRENT branch tip
(`claude/codebase-audit-docs-pv6mjd`, commit `87ee57e`) rather than the
snapshot each source doc described when it was written earlier the same
day. A large amount of building happened between when those audits were
written and now; several findings they flagged as open are confirmed FIXED
below (e.g. `AY-1` TextField placeholder contrast, `AY-2` on-tint ink
tokens, `AY-5` EngineLog state announcement, `AC-1/AC-2/AC-5` chevron/alpha/
micro-label sweeps, `LT-1` primary-as-fill including billing sites, `MO-1`
the ProgressPhotoCompare runOnJS crash, `L01-A11` ShareCard fallback copy,
biometric app lock, and an iOS WidgetKit home/lock-screen widget). Others
are confirmed STILL OPEN by direct re-read (e.g. `CO-1` the "The Coach"
naming sweep — still 20 live hits, re-grepped this session; `AC-3` Home's
wrong ink token on the Continue-workout card; `CP-6` Settings' inline
Workout & units block; `CO-2`/`CO-3` missing cross-tab deep links; the
`R1` curated-meal-additions allergen-filtering gap, explicitly recorded and
held). Where a score rests on a JUDGEMENT/GATED item, that is stated —
none of those are being pre-decided here; the score reflects today's shipped
state only.

A 10 means genuinely world class against the best named competitor for that
function (Hevy, Strong, MacroFactor, Cronometer, MyFitnessPal, Whoop, Oura,
as cited in the source audits). Scores are honest, not flattering: several
areas the source corpus already calls "world class in substance" are marked
down here for a real, cited, still-open gap in delivery, craft or reach —
that is the point of the exercise.

---

## Scorecard

| Function | Score /10 | What keeps it off 10 | What would make it 10 |
|---|---|---|---|
| **First-run + free onboarding** | 7 | Zero AI-tells, honest tone, warm reassurance footnote (`FreeStarterScreen.js:212-214`) — genuinely strong. But: `FreeStarterScreen`'s completion has no celebratory reveal/haptic to match Pro's (FR-1); raw SDK/provider error text can surface at the very first touchpoint, `LoginScreen.js:41` (FR-2, confirmed still raw this session); quiz has no progress indicator while every sibling wizard does (ASSESSMENT §3); `WelcomeScreen`'s hero+cards animate as one flat block, no lead-in beat (FR-3). | Ship FR-1's staged/haptic completion beat, fix FR-2's two raw-error call sites (mechanical, matches the already-approved L01-B35 pattern), add the quiz progress bar, give the wordmark its own beat on Welcome. |
| **Pro onboarding** | 7 | Endowed-progress bar, per-step outcome preview, and an honest phase-tied plan-build animation (ASSESSMENT §3) are excellent. But: Step 2 still bundles up to 7 fields at the highest-abandon-risk moment (L04-6, GATED, unresolved); the "Required" pill on the weigh-in/check-in rows lands right after body-composition disclosure in a compliance register (FR-4, GATED, unresolved); OAuth wait is a bare caption with no spinner/timeout; repeated final-step failure has no support path. | Founder rules on L04-6 (split Step 2 to match Steps 3-4's per-question pattern) and FR-4 (soften "Required" wording); add an OAuth spinner+timeout and a support affordance on repeated failure. |
| **Home / Today** | 6 | Ledger-reuse, isolated per-second mini-bar, and readiness capture without a numeric score are strong (`coverage-06`). But: up to seven independently-dismissible banners can stack above the Start-Workout hero with no cap (AC-6/CP-1, confirmed still unfixed — no matching commit found), directly working against the app's own "one hero, then the action" Materials Policy; the "Continue workout" card still renders its subtitle and chevron in the wrong ink token, `HomeScreen.js:2391,1643` (`withAlpha(colors.background, 0.8)`, re-verified this session as still present) — a genuine broken-contrast bug on the highest-traffic screen once the light theme ships; 3,048 lines with no memoisation; CO-4's food-loop blindness is a deliberate scoping call, not a bug. | Cap/consolidate the banner stack (extend the existing `pickAttentionVariant` priority function); fix the two-line ink-token bug (`colors.onPrimary` in place of `colors.background`); decompose/memoise the screen. |
| **Workout logging (ActiveWorkout, rest timer, PRs, reorder, supersets)** | 7 | Crash-lossless drafts, one-tap logging pre-filled from real history, honest PR logic, and a genuinely well-built superset teaching modal are top-tier (ASSESSMENT §3). But: RPE/RIR capture is gone, so the engine autoregulates on a hardcoded `rir: 2` for every set of every user forever (settled-removed per founder, but this is a live coaching-quality ceiling, not a cosmetic gap); reorder is nav-strip-jump/chevron only, no in-session drag despite gesture-handler and Reanimated already installed (L07-F9, GATED — new dependency or hand-rolled, undecided); the unilateral two-phase per-side design was fully ruled by the founder (D9 + two amendments) but is still unbuilt — three previously-orphaned attempts remain unconnected in code; unconditional "Finish workout?" alert on every finish (L07-F10); PR re-detection doesn't re-run after an in-session edit/delete (L07-F2). | Build the founder-ruled D9 unilateral flow; found a decision on in-session drag-reorder; re-run PR detection on edit/delete; condition the finish-confirm alert on set count. |
| **Plan library** | 8 | `sortBeginnerFirst` genuinely steers novices toward plain-language plans first; warm, competence-building descriptions on beginner routines (cohesion-02). No severity-A findings against this specific screen in any lane read. | Close the remaining housekeeping items shared with sibling screens (AY-3 modal-backdrop labelling if not already swept here) and re-verify against the current build. |
| **Manual/auto plan builder** | 7 | The live MEV/MAV/MRV Plan Balance card while authoring is a genuine differentiator "no mainstream builder has" (ASSESSMENT §3); D8's engine fix (4 compound/3 isolation cap, angle-diverse spill) landed and was lead-reviewed; haptics now extend across the builder (`2f40b21`); NV-1 (Plan Balance legend) and NV-2 (superset glossary in the builder) both landed. But: reorder stays chevron-tap (the founder's implicit direction via the day-level-reorder build, which reused the no-drag pattern); supersets hard-capped at pairs, no giant-set support (not ruled); exercise media stays HOLD (founder, 2026-07-09) — "How to do it" is text-only everywhere in this flow, the single most visible gap versus Hevy/Strong/Fitbod. | Founder ruling on giant-set support; the exercise-media HOLD is the single biggest remaining gap versus every named competitor, but stays parked per the founder's explicit ruling — not re-proposed here. |
| **Mesocycle / progression engine** | 8 | Deterministic, cited, pure-function engine; D8 fixed a real over-stacking bug (6-set lat pulldown junk volume) with weekly volume preserved via angle-diverse spill, independently lead-reviewed against the founder's exact repro case. | The same RPE/RIR fixed-input ceiling noted under workout logging caps this engine's autoregulation fidelity; otherwise no material gap found. |
| **Exercise library + picker** | 7 | 654 exercises (up from 551, `31c395b`), every plan-A hole re-verified fixed via live pool-generator runs (bands, hamstring hip-extension, rear-delt face-pull, unilateral gaps). But: `ExercisePickerModal` still has no fuzzy/typo-tolerant search (L07-F6), no "recents" row (L07-F7), and custom-exercise creation still has no secondary-muscle multi-select/exercise-type axis (L07-F8) — all unresolved. | Add fuzzy search and a recents row (both S-effort, no design fork); extend the custom-exercise form to match the schema seeded exercises already use. |
| **Workout history** | 6 | Solid state coverage (empty vs failed-load distinguished). But: no text search across history, only date/calendar filter (L07-F11); "Repeat session" vs "Delete workout" terminology drift on the same card (L01-B37, not confirmed fixed); a fixed 30dp day-circle with no `maxFontSizeMultiplier` cap unlike every sibling badge (L03-B3). | Add exercise/workout-name search; standardise the session-vs-workout terminology; cap the day-circle font scale. |
| **Progress analytics/charts** | 8 | Single-hero discipline (`TrainingLoadHero`) matches the Whoop/Hevy "one glanceable answer" contract; `VolyumeChart` (one chart engine, scrub+haptics+live SR announcement) is at or above competitor chart quality; own-standing strength levels ship the ED-safe alternative to a leaderboard competitors use instead. But: no PR marker on the per-exercise trend line (CP-5); Recent-sessions rows carry no split/muscle-group tag or top-exercise glance unlike Hevy (CP-4); the chart-gridline opacity stack under-shoots 3:1 contrast in both themes (LT-6, no fix commit found). | Add `highlightIndices` to `VolyumeChart`'s line variant for PR markers; add a split tag to session rows; fix the gridline opacity. |
| **Progress photos + scan** | 7.5 | Fail-closed suppression (`usePhotoSuppression`), 5 gated encouragement surfaces, dismissible/frequency-capped, and the divergence case (logs fine, photos show drift) is already the built `conflicts` state, not a gap (plan-E). The MO-1 drag-gesture crash (`setPct` off-thread) is confirmed FIXED this session (`runOnJS(setPct)(v)` present, `ProgressPhotoCompare.js:242`). But: the benefit-of-photos line just shipped (D11, `02fa63f`) rather than having existed from the start, and the deeper photo-signal corroboration plan is commissioned but explicitly not built (D11, correctly gated pending a further founder round). | Run the D11 corroboration-plan founder round when ready; otherwise this surface is close to its ceiling already. |
| **Body metrics** | 7 | Dimensions.get migrations complete app-wide (confirmed closed). But: no edit/delete path exists anywhere for a mis-logged weigh-in (NAV-2, still open, founder-owned given the ED-adjacency of any new weight-write path — genuinely no decision has landed on this in over a week). | Founder answers NAV-2's three-option round (edit-only / edit+delete+history / leave as-is) — the build itself is small once decided. |
| **Coach weekly review + output** | 6.5 | Held-with-reasons cards, plain-English landmark translation, and fail-closed recap stories are "the best version of this in the market" (ASSESSMENT §3); D13 moved the profile block to the top and shortened the check-in date line. But: `CoachOutputScreen.js:798,2435` and 12 other files still say "The Coach" as a banned proper noun against the founder's own D4 ruling this same session (CO-1, 20 live hits re-confirmed) — including one ED-safety-adjacent line at `nutritionEngine.js:402` that needs hands-on restoration, not a delegated sweep; the training-volume card never deep-links to the plan it just changed, unlike its own nutrition-side sibling two lines away (CO-2); 3,113 lines with no memoisation; the RED-S/autoregulation footer tooltip wording is still waiting on founder-reviewed copy; the ED-pattern lockout/cleared card never announces itself to a screen reader (AY-7, open). | Execute the CO-1 naming sweep per the already-made D4 decision (implementation gap, not a new ask); add the CO-2 "see your updated plan" link; close the RED-S tooltip and AY-7 SR-announcement rounds. |
| **Daily brief / check-in** | 8 | Six distinct gate states, a genuine escape hatch on the fast check-in, and D13's date-format fix landed. CO-1's naming drift touches this surface too (`WeeklyCheckInScreen.js:1386,1392`) but at lower visual prominence than CoachOutput. | Fold into the same CO-1 sweep; otherwise strong. |
| **Nutrition targets (+ per-day, dietary needs)** | 7 | Dietary Phase A+B fully landed this session — preferences wired into every suggestion surface, allergen sync with a column-tolerance ladder, pescatarian added, a first-class Settings > Dietary needs screen with a tier-blind soft-nudge at 15 exclusions. Genuinely substantial, recent, well-tested work. But: `goal`/`proteinApproach` still aren't cloud-schema columns, so "Why these targets" silently degrades on a new device (L05-NT1, GATED, unresolved); per-day offsets and meals-per-day preference remain device-local only, lost on reinstall (L05-PDT1, GATED, unresolved); height/DOB are editable in exactly one place, gated to Pro (CP-8, unresolved); results view stacks ~11 blocks in one scroll (NT2). | Approve and ship NT1/PDT1's additive migrations and sync-registry entries (both already scoped, waiting on the founder-run EU-Dublin migration step); add a free-tier-reachable height/DOB edit path. |
| **Food diary** | 8 | D12 de-clutter landed this session (micronutrient panel removed from the diary — dead premium real estate reclaimed; bulk mark-as-eaten demoted below per-meal marking with a one-time explainer); D13 reframed the additions list as optional. Genuine, recent, direct-founder-ordered improvement. But: `MealSection` still carries three dead write-affordance callbacks the component's own comment says should be a 4-button hub (L05-D1, unresolved); `FoodSearchScreen.js:896` still hardcodes a duplicate of the OLD additions intro copy D13 was meant to replace everywhere (explicitly queued, not yet fixed). | Resolve L05-D1 (restore the hub or delete the dead code); fix the one remaining hardcoded old-copy site. |
| **Food search / logging** | 8 | The daily loop is cited as best-in-class in the category: a repeat meal is one tap via a slot-specific "usuals" chip, or one tap on a Recents/Frequents row with no sheet at all (cohesion-02, "this is the product's actual moat"). But: barcode/quick-add/saved-meals/recipes all sit behind a tab literally labelled "Custom" (L05-FS1, unresolved); food-level swap silently substitutes the single best match while meal-level swap gets a full chooser sheet (L05-MP1, unresolved). | Relabel/restructure the "Custom" tab so these read as their own actions; give food-level swap the same chooser-sheet pattern meal-level swap already has. |
| **Barcode + label scan** | 8 | The barcode-miss → label-scan → custom-food recovery chain is "excellent" (ASSESSMENT §3); manual barcode-number entry has since shipped (L05-SB2, confirmed live — `ScanBarcodeScreen.js:361-371` referenced as "just-shipped" by the accessibility lane). But: that new manual-entry field inherited the placeholder-contrast bug, since fixed app-wide via `TextField.js`'s default swap (confirmed this session — `placeholderTextColor = colors.textMuted` is now the shared default, with an inline comment citing this exact audit). No other severity-A gap found against this specific flow. | Re-verify ScanBarcodeScreen's declined-permission escape hatch matches ScanLabel's (L05-SB1) if not already done. |
| **Curated/saved meals + recipes + additions** | 6 | Dietary Phase B added 26 new diet-tagged curated meals with real authored macros (no shortcuts on the vegan protein-bar case, per the stage log). But: a genuine, currently-unfixed safety-adjacent gap — meal "additions" carry no FSA allergen tags and are not filtered by profile exclusions, so an allergic user can be shown soya or mustard (both FSA-14 allergens) as an addable extra on a meal that was otherwise correctly filtered for them (R1, confirmed still true this session — no allergen tag or filtering exists in the additions data path). This was found by the founder-ordered adversarial review and is explicitly HELD pending that review's resumption, not silently ignored — but it is a real, live gap today. Saved meals still can't be inspected/edited (L05-MM1); recipe rows still show no calories/macros (L05-MR1); "Check your connection" miscopy survives on 3 screens for local-read failures (L05-MM2). | Resume the held adversarial review and ship the R1 fix (tag allergen-bearing additions, filter by profile exclusions in `CuratedMealSheet`) as the top item when that review reopens; make saved meals inspectable; add macros to recipe rows; fix the miscopy once, in all three places. |
| **Partners** | 7 | ST-1 (load-failure shown as a dead acquisition pitch) is genuinely fixed. But: the empty state still shows an abbreviated privacy summary rather than the full pre-pairing consent receipt the spec calls the "hero moment" (L06-F2, GATED, unresolved); the v2 receipt quietly dropped the explicit "everything shared is deleted" line (L06-F3, GATED, unresolved); a post-workout cheer only ever addresses one "primary" partner even when a Pro user has 2-3 (L06-F4); `PartnerRow.js` is dead code with an open founder decision since 2026-07-04. | Founder rules on L06-F2/F3 (three options already framed in the source lane) and on PartnerRow's fate; surface all available partner pairs, not just the primary. |
| **Share cards** | 6 | Theme-invariant, brand-consistent rendering by design (correctly never follows the viewer's light/dark setting, matching Spotify Wrapped/Strava's own share-card convention) — a deliberate strength, confirmed intentional. The "Session Complete" fallback regression is confirmed FIXED this session (`ShareCardScreen.js:194` now reads `'Workout complete'`). But: the share-target segmented control still never announces which segment (Instagram/Story/etc.) is selected to a screen reader (AY-6, no fix commit found — re-checked, still absent). | Add `accessibilityState={{ checked: active }}` to the segment control (one-line, mirrors an existing in-repo pattern). |
| **Notifications / reminders** | 6 | Weight/food-adjacent suppression under an open ED flag is intact and tier-blind — the core safety property holds. But: the weekly-coach-ready and cascade-gate notifications still drift from their own locked Surface 6 wording (L01-A23/B41/B42, GATED, unresolved — re-checked `scheduler.js`, the drifted strings are still present); no rest-day notification category exists, and the 2026-07-03 re-specification it was conditioned on was never produced (A2, still an open founder question). | Founder rules on A2 (re-specify / shelve / kill); reconcile the drifted Surface 6 strings to the locked wording (or amend the locked doc, per the standard GATED playbook). |
| **Settings (incl. app lock, widgets, display/a11y)** | 7 | Opt-in biometric app lock shipped and founder-approved this session (`b98ef1b`, `BiometricLockScreen.js` + guard tests confirmed present); `SettingsDataScreen` (full JSON backup/restore, CSV export, coach-handover PDF) and `SettingsDisplayScreen`'s accessibility depth (larger text, higher contrast, colour-blind palette, all free-tier) both exceed the named competitors. But: "Workout & units" still renders inline on the Settings root, breaking the screen's own stated "tap for a sub-page" contract (CP-6, re-checked this session — still inline, comment explicitly says so); changing Appearance/Larger-text/Higher-contrast/Colour-blind-safe still forces a full app-restart prompt (CP-10, architectural, undecided); no FAQ/Help-Centre or support-contact path exists (CP-9). | Move "Workout & units" into its own sub-screen (mechanical, CP-6); found the CP-10 restart-free-theming architecture decision; add a Help/FAQ row. |
| **Lapse / read-only experience** | 7 | The cancel flow is "easier than the industry norm rather than harder" (ASSESSMENT §2) — a genuine, unusual strength worth protecting as-is. But: `PostLapseSheet`, the peak post-cancellation attention moment, makes no forward pitch at all (L08-B3, GATED, unresolved) — not a dark pattern, but a genuinely missed calm, optional forward link. | Founder approves L08-B3's one-line calm forward link into Subscription (billing-adjacent, needs the written test plan per `docs/rules/billing.md` before any build). |
| **Widgets + Live Activity** | 6 | Android ships two well-restyled, ED-suppression-aware widgets (next-session, weekly-consistency). An iOS WidgetKit home/lock-screen widget was built this session (`c25860a`, CP-2, founder-approved D7) reusing the existing native-module/config-plugin pattern with no new dependency — genuinely closes the platform-parity gap in code. But: that iOS widget still needs the founder-side App Groups provisioning and a fresh EAS build before it is live on a device (listed outstanding in the current handover); the rest-timer Live Activity for iOS stays explicitly HELD by the founder, so iPhone users still get no lock-screen rest-timer presence Android already has via the in-app Android module. | Complete the founder-side EAS build + App Groups provisioning so the already-built iOS widget actually ships; the Live Activity HOLD is a standing founder decision, not re-proposed here. |

---

## Top 8 attention priorities (impact × distance from 10)

1. **Home banner overload + the wrong-ink-token bug (`AC-6`/`CP-1`, `AC-3`).**
   The single highest-traffic screen in the app, carrying both a genuine
   accessibility/contrast bug (still live, re-verified this session at
   `HomeScreen.js:1643,2391`) and an unresolved "how many banners can stack"
   design debt. Two-line mechanical fix for the ink bug; a founder nod
   needed for the banner cap.
2. **R1 — curated-meal-additions allergen-filtering gap.** A real,
   currently-live safety-adjacent miss on the app's own newly-shipped
   dietary-preferences feature (an allergic user can be shown their own
   allergen as an addable extra). Already found, recorded, and explicitly
   HELD pending the founder's adversarial-review resumption — flagged here
   because it is the most consequential open item in the whole scorecard,
   not to override that hold.
3. **CO-1 — the "The Coach" naming sweep.** The founder's own D4 decision
   this same session is unimplemented at 20 live sites across 14 files,
   including one ED-safety-adjacent line (`nutritionEngine.js:402`) that
   needs hands-on restoration. This is an execution gap against an
   already-made decision, not a new ask — the cheapest, highest-visibility
   fix on this list.
4. **Notifications drift from locked voice (Surface 6).** Touches every
   user via the weekly-coach and cascade-gate pushes; re-verified still
   drifted from the locked wording this session. GATED but the two
   resolution paths (restore or amend the locked doc) are already framed.
5. **Coach Output's missing cross-tab links (`CO-2`/`CO-3`).** The training
   card tells the user "N updated" without ever linking to the plan it
   changed, unlike its own nutrition-side sibling two lines away; workout
   completion never gestures at Progress, Nutrition or Coach. Closes a real
   "does this feel like one app" gap the founder's own cohesion mandate
   targets directly.
6. **RPE/RIR fixed-input ceiling on the coaching engine.** Settled-removed
   per the founder, but it means autoregulation runs on a hardcoded `rir: 2`
   for every set of every user, forever — a live coaching-quality ceiling
   on the app's core differentiator, worth a fresh look even if the answer
   stays "accept it."
7. **Unilateral logging: fully ruled (D9 + two amendments), still unbuilt.**
   Three previously-orphaned prior attempts remain disconnected in the
   codebase despite a complete, specific founder design already on record —
   a differentiator "no competitor has solved" sitting fully specified and
   unshipped.
8. **Settings coherence (`CP-6`, `CP-9`, `CP-10`).** "Workout & units" still
   breaks Settings' own stated navigation contract; no Help/FAQ path exists;
   five accessibility/appearance toggles still force an app restart. None
   of these are individually large, but together they are the most visible
   remaining "not quite finished" texture in a screen every user visits.

---

## Overall verdict

VOLYUME's brains, ethics and resilience are genuinely world class and the
work landed in this single session — dietary preferences shipped end to
end, a biometric app lock, an iOS widget, a weak-point set-cap engine fix,
a diary de-clutter, and a long tail of accessibility/contrast/motion
fixes — has measurably closed the gap between "very good" and "world
class" in delivery, not just substance; several findings this scorecard's
own source audits flagged as open this morning are confirmed fixed by
direct re-read tonight. What remains is concentrated in a short, well-understood
list: a real contrast bug and an uncapped banner stack on the single
highest-traffic screen, one already-decided naming rule not yet swept
through the coaching product's own voice, a live allergen-filtering gap on
the newest feature that is correctly held rather than shipped-and-forgotten,
and a cluster of fully-specified-but-unbuilt differentiators (unilateral
logging, in-session drag-reorder, cross-tab coaching links) waiting on
founder time rather than further research. Nothing on this list requires
new architecture, new dependencies beyond what is already approved, or a
weakening of any locked constraint — every honest gap found here is
buildable now or is one clearly-framed founder decision away from being
buildable, which is itself the mark of a codebase that has been run
disciplined rather than merely busy.
