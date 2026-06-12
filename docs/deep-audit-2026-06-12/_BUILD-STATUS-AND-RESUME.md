# Build status & resume marker — deep audit 2026-06-12

**Single entry point for the next session.** Read this, then
`_SYNTHESIS-AND-ROADMAP.md` (the themes/waves) and
`_FOUNDER-DECISIONS-2026-06-12.md` (the seven decisions + operating model).
The operating model is also locked in `CLAUDE.md` (BUILD OPERATING MODEL).

## Where we are
- **Branch:** `claude/main-branch-content-update-dcqicf` (NEVER main). All work
  committed + pushed. If local is behind: `git fetch origin` +
  `git merge --ff-only origin/claude/main-branch-content-update-dcqicf`.
- **Health baseline (verify with `npm run lint && npm test && npm run typecheck`):**
  0 lint errors / 4 pre-existing warnings (all in `tests/simulator/*`),
  ~3,950 tests passing, typecheck clean. Fewer suites or more warnings = a
  regression you introduced.
- **CI:** `build-android.yml` builds a signed APK/AAB on every push and is
  GREEN. The whole branch is device-walkable.

## Operating model (founder rule — follow exactly)
Claude builds the spine HANDS-ON (engine, safety-adjacent, design judgement).
Agents do leverage work + a fresh-eyes adversarial REVIEW after every completed
feature, each under a HEARTBEAT WATCH (Monitor: stale >5min, overrun >25min;
kill/relaunch a hung one, never leave it blocking). Tests are the contract,
written to fail against the REAL engine. When a founder decision is needed,
ask a structured multi-choice question and keep working — never stall.

## DONE this session
- **Wave 1:** five-part coach response + free weekly one-liner; notification
  budget + ghost-prevention; guided beginner on-ramp (free micro-quiz →
  starter plan); adherence-neutral copy pass + two notification bug fixes.
- **Quiz-first onboarding flipped ON** (`ONBOARDING_QUIZ_FIRST = true`), locked
  docs amended.
- **CI fixes:** react-native-android-widget 0.18→0.20.3 (RN 0.81), watch-bridge
  typed EventEmitter.
- **THEME G — the meal-plan flagship (COMPLETE, fully reviewed):**
  `src/lib/food/` foodRoles, planPreferences, mealPlanAssembler (TD/NTD
  variants, floor-routing invariant), mealSwap (food + meal), planEdit +
  planExplain (coach pulls food off the plan, gram-level narration),
  mealPlanService (engine↔storage bridge), `meal_plans` table (+ WIPE list +
  guard test). Screens: `MealPlanScreen` (day view, swaps, prefs panel,
  log-this-day), "Plan my day" door on the empty Diary, CoachOutput food-level
  edit receipt + deep link, `SupplementGuideScreen` (G2, free, ED-hidden),
  `TodaysPlateTeaser` (free show-then-sell on the Pro-locked diary).
  Reviews caught + fixed: a save-crashing transaction signature, a calorie-
  floor band hole, a GDPR wipe gap, and a profile-pull bug that wiped local-
  only prefs — all with regression tests.
- **AI mislabelling corrected** in APPMAP/DEEPMAP (the deterministic Coach
  Builder is NOT AI). No user-facing AI claim exists anywhere (verified).
- **D1 — beginner early-win milestone ladder (COMPLETE, reviewed):**
  `src/lib/milestones.js` (pure engine + AsyncStorage seen-set) + a calm gold
  milestone card on `WorkoutSummaryScreen` at the top emotional peak. Fills the
  int-04 F1 "celebration desert" between the first-session line and the
  ten-session recap unlock. See the NEXT-list strike-through below for the full
  shape. Commits `5c9b05b` + `671fd69`.

## NEXT — build in this order (Wave 2, then 4)
Each item: build hands-on → fresh-eyes review under a heartbeat watch → fix
findings → commit/push. Blueprints live in `docs/deep-audit-2026-06-12/`.

- ~~**D1 — beginner early-win milestone ladder.**~~ **DONE** (commits
  `5c9b05b` + review fix `671fd69`). Pure `src/lib/milestones.js`: rolling
  3-in-7 `first_week` + 5/10/25/50/100 lifetime sessions + `first_pr`, seen-set
  persisted like `streakState` (`@volyume_milestones_v1_<userId>`).
  `claimMilestones` batch-marks earned-unseen rungs seen + shows only the most
  significant (no history replay). Calm gold card at the WorkoutSummary top
  peak, shares the COMP-013 wellbeing read for calm/ED suppression; first
  session stays owned by COMP-013 and PRs by PRCelebration (`everHitPR:false`),
  so no double-celebration. 19 invariant tests. Reviewed SHIP-WITH-NITS; the
  one MEDIUM (a "never lost" doc overclaim vs the deliberate fold-in) fixed in
  the comment. **Carry-forward:** a future Analytics "milestones strip" (F1's
  2nd placement) + next-rung copy can reuse `nextSessionRung`/`selectMilestone`;
  the engine already models `first_pr` for it.
2. **D2 — programme-arc visibility.** "Week N of M" strip (existing
   block/mesocycle data, reuse BlockShapeCard/week-dots) on WorkoutSummary +
   Consistency; phase-completion celebration card when a block's final week
   completes (recap line + "what's next"). Surface the SILENT streak repair
   ("a lighter week, and you came back"). ED/calm suppression throughout.
   Free share hooks on milestone + phase-completion cards (decision 4b: share
   artefacts are free).
3. **C1+C2 — persona-adaptive coaching register + opt-in science layer**
   (decision #2, voice-doc addendum already written). `src/lib/coachRegister.js`:
   Supportive vs Precise rendering over `coachResponse.js` (same facts, same
   honesty test, different prose), keyed off experience level + a user override.
   Coaching-settings toggles: tone (Supportive/Precise/Automatic) + "Show the
   science" (off by default; when on, surfaces the technical term in brackets +
   citations; the science-OFF `checkJargon` path must NOT weaken). Jargon
   tap-to-explain on remaining beginner-facing leak sites.
4. **I1 — IA polish.** Progress "act now" lead card (deterministic priority:
   check-in ready > recap ready > train today > none); set-type progressive
   disclosure for beginners in ActiveWorkout; wire the built-but-unused
   `PlateCalculator` into SetEntry behind the overflow (no hot-path clutter).
   (Diary free teaching state is partly covered by the plate teaser already.)
5. **F1 — share-card quality upgrade + 2-tap share** (PR/milestone/block-
   completion); **F2 — shareable plan-link + non-user landing page** (the
   acquisition loop; positioning + free/Pro nod).
6. **H1 — standalone browsable exercise library** screen (no catalogue browse
   exists today; int-03 finding 2). (H2 visual demos wait on founder media.)
7. **J1 — named-methodology anchoring** on onboarding/check-in/paywall (S).

## Carry-forward NITs (cheap, fold in when touching the file)
- `setMealPlanPrefs` allow-list omits `mealPlanRotationPool` (harmless today;
  no UI sends it). Add when a rotation-pool control ships.
- Meal plan is LOCAL-ONLY (no sync serialiser yet); a new device regenerates
  from the synced target + prefs. Ship a serialiser if cross-device plan
  continuity is wanted.
- Migrations pending founder apply (per docs/rules/supabase.md): none NEW from
  Theme G that must run (the `meal_plans` table is a local SCHEMA_MIGRATIONS
  entry; no server table). Confirm before relying on cross-device.

## To resume in a fresh session, paste:
"Continue the deep-audit build. Read
docs/deep-audit-2026-06-12/_BUILD-STATUS-AND-RESUME.md and keep grinding through
the NEXT list in order, hands-on with a reviewer on watch per the CLAUDE.md
operating model."
