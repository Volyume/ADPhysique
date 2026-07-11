# The competitive bar for a world-class workout logger

Founder order: rebuild VOLYUME's workout logger as the app's most premium
component, explicitly beating Hevy and MacroFactor ("and so on" = Strong,
plus any other elite logger). Founder also states the current logger's
layout is worse than it was a month ago. This document is the evidence base
for that rebuild — internal corpus first, web research to fill gaps and
confirm current (2026) state. No code changed; research only.

**Method note on evidence strength.** Internal Hevy findings come from a
decompiled-Hermes-corpus teardown (string/view-model tokens, not screenshots)
plus a fresh source-code re-read of VOLYUME's own logger — both are strong,
citable evidence. Web sources are 2026 review/marketing copy, not first-party
design specs; several are thin (marketing pages, aggregator reviews without
screenshots) — flagged inline where thin.

---

## 1. Hevy logger anatomy

Screen structure, top to bottom, reconstructed from three corroborating
sources: the internal Hermes-corpus teardown, Hevy's own feature pages, and
review commentary.

1. **Session header.** Stopwatch (elapsed time) top-left; adjacent counters
   for sets completed and running volume load.
   (`docs/hevy-teardown-2026-06-29/01-workout-logging.md:12-22`;
   [hevyapp.com/features/track-workouts](https://www.hevyapp.com/features/track-workouts/))
2. **Exercise block.** Exercise name, with a **"PREVIOUS" tab/column**
   showing last session's performance for that exact set position — the
   single most-cited feature in every review as *the* progressive-overload
   aid ("auto-fills your previous weights and reps so you always know what
   you did last time",
   [repreturn.com/hevy-app-review](https://repreturn.com/hevy-app-review/);
   corroborated internally as `previousSet`/`PrefilledIndicator`,
   `01-workout-logging.md:78-81`).
3. **Set-row grid**, one row per set: set number, weight cell (KG/LBS,
   tap-to-type, no stepper found in the corpus), reps cell (or rep range),
   duration cell for time-based exercises, a set-type indicator (Normal/
   Warm-up/Drop set/Failure — confirmed by ~180 corroborating string tokens,
   `01-workout-logging.md:36-43`), and a **checkbox to mark the set
   complete** (`SetCompletedUpdate`, `completeSetInSuperset`). Completing a
   row **auto-starts the rest timer**. Optional RPE and notes columns can be
   toggled on (`hevyapp.com/features/track-workouts`).
4. **Add/remove.** A blue "+ Add Set" button; swipe-left-to-delete a row.
5. **Supersets.** Each superset gets a **unique colour** for at-a-glance
   grouping across the whole session. An opt-in "Smart Superset Scrolling"
   setting auto-advances to the next paired exercise the instant a set is
   completed, cycling back to the first exercise once the group's round is
   done; per-exercise custom rest inside the pairing is supported with its
   own notification.
   ([hevyapp.com/features/what-are-supersets](https://www.hevyapp.com/features/what-are-supersets/))
6. **Rest timer.** Auto-starts on set completion, configurable per exercise
   (globally or per-lift default), and — per the internal corpus's strongest
   evidence (dedicated `res_strings.xml` resources) — surfaces as a **system
   notification with actions**: Complete Set, Skip, +15s/-15s, Add an
   exercise, Open App. This lets a lifter run the rest timer with the phone
   locked in a pocket, never reopening the app
   (`01-workout-logging.md:52-66`, `U1-workout-flow.md:31,40-47`).
7. **Plate calculator.** A "Calculator" button on barbell exercises for
   plate-loading maths, gated to bar exercises
   (`01-workout-logging.md:85-88`; `hevyapp.com/features/track-workouts`).
8. **Minimise.** The active session can collapse to a floating bar so the
   user can browse elsewhere in the app and return — a dedicated view-model
   surface (`PerMinimizedWorkoutViewModel`, `FloorsPerMinimizedWorkoutScreen`,
   `U1-workout-flow.md:34,49-56`), not just a persistent notification.
9. **Finish.** Single tap to save/complete → summary; no confirm-alert gate
   found in the corpus (`U1-workout-flow.md:32`).

**Why users praise it (cited).** Reviewers converge on one word: speed.
"Logging never felt like a chore. The UI is responsive enough that you can
log a set, put your phone down, and pick back up without losing your place"
(repreturn.com). The core loop — "pick a routine, start a workout, log each
set as you go" — auto-fills previous weights/reps, which is repeatedly named
as the single most useful mechanic for progressive overload
([corahealth.app/compare/hevy](https://www.corahealth.app/compare/hevy);
[repreturn.com](https://repreturn.com/hevy-app-review/)). Nothing in the web
sources describes Hevy's per-side/unilateral handling — see §4, absence
confirmed.

**Where the internal corpus already shows VOLYUME beating this anatomy**
(do not regress, `01-workout-logging.md:98-144`, `U1-workout-flow.md:78-113`,
`design-usability-audit-2026-07-09/07-workout-logger.md:34-116,401-433`):
keyboard-Done-completes-the-set (zero-tap logging Hevy's grid cannot match),
plate-friendly per-exercise steppers instead of raw numeric entry, a
tappable one-tap "beat line" (not just a passive previous-column), a
warm-up calculator, editable/deletable logged sets in-session, a rest-timer
notification with **four** actions plus an Android native chronometer
foreground service (a live ticking lock-screen countdown Hevy's corpus does
not evidence), and an `ActiveSessionMiniBar` docked above the tab bar
functioning as Hevy's minimise-to-bar equivalent.

---

## 2. Strong logger

Shorter treatment: Strong's differentiator versus Hevy is **restraint**, not
a different feature set.

- **Design language.** Consistently described as the cleanest, most
  minimalist logger on the market: "beautifully built... clean, fast
  interface consistent with native iOS aesthetics... no bloat, onboarding
  upsells, or distracting features"
  ([corahealth.app/compare/strong](https://www.corahealth.app/compare/strong)).
  Praised for being "usable without looking at the screen for long" — the
  strongest one-hand/low-glance claim found for any logger in this research.
- **Feature parity with Hevy, without the extras.** Same core loop (routine
  → log sets → auto-rest), same previous-performance carry-forward. No
  evidence found of Hevy's colour-coded supersets, smart superset scrolling,
  or lock-screen notification actions — Strong's supersets/circuits exist
  ("About Supersets/Circuits", Strong Help Centre, cited in
  `docs/exercise-planning-2026-07-09/plan-C-unilateral-logging.md:99`) but
  without a documented unilateral-specific mode.
- **The cautionary half of the story (internal, load-bearing for the
  founder's brief).** Strong is simultaneously held up as "widely called
  'stagnant'... the market has moved forward without it"
  (`docs/volyume-elite-audit/inputs/market-competitors.md:89-102`,
  citing [hotelgyms.com](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)).
  **The lesson for VOLYUME is explicit in the internal research: a beautiful
  frozen logger gets eaten — match Strong's restraint, not its update
  cadence.**
- **UI specifics found are thin.** No first-party design breakdown of
  Strong's set-row layout, type scale, or spacing was found beyond the
  restraint/minimalism consensus above; a design-case-study Medium post
  found in search ([hwaijunyap Medium](https://medium.com/@hwaijunyap/ui-ux-case-study-strong-workout-app-redesign-fc22afbada65))
  turned out to be a student redesign exercise about *adding music
  features*, not a critique of Strong's actual logging screen — discounted,
  not used as evidence.

---

## 3. MacroFactor design language (transferable principles only)

MacroFactor is cited by the founder for design quality, not nutrition
features — this section extracts only what transfers to a training UI.

- **A purpose-built type system, not a stock font.** MacroFactor commissioned
  a custom variable typeface (**MacroSans**, with Reset Type Studio) that
  flexes width/weight across the whole product — interface, editorial
  content, merchandise — described as conveying "dynamism and movement."
  Inside the app the stated goal is that "the tools need to disappear so the
  work can happen" — type in service of clarity, not decoration.
  ([the-brandidentity.com](https://the-brandidentity.com/project/pentagrams-inspired-science-approach-frames-macrofactors-rebrand))
- **Icons as calibrated instruments, not ornament.** Over 450 icons were
  redrawn from scratch on a strict grid, treated as "sharp knives in a
  kitchen" — every icon is "a visual unit of measurement" that makes daily
  data entry legible. The transferable principle: icon weight/size is a
  data-hierarchy decision, not a style choice
  ([the-brandidentity.com](https://the-brandidentity.com/project/pentagrams-inspired-science-approach-frames-macrofactors-rebrand)).
- **Data density done calmly.** Reviews converge on "clean, no-nonsense
  interface... analytics dashboards that are detailed and free of
  gamification, social features, and motivational pop-ups"; charts (weight
  trend smoothed to remove daily noise, expenditure trend, adherence rate)
  are "clean and genuinely useful for spotting whether a plateau is real or
  just a noisy week" rather than decorative. The density is in the
  *information*, not in visual clutter — smoothing and restraint are the
  design tool, not more chrome
  ([outlift.com/macrofactor-review](https://outlift.com/macrofactor-review/),
  aggregate review search).
- **Colour discipline: earned, not decorative.** Sources converge on "clean
  but data-focused", "no social feeds, no badges, no nonsense" — the
  personality budget goes into occasional milestone illustrations (a
  deliberately rare reward moment), not into everyday chrome. The
  transferable rule: spend colour/personality on rare meaning-moments,
  keep the daily-use surface calm.
- **Direct relevance to the S5 cohesion pass already planned in
  `docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md`**:
  MacroFactor's "tools disappear, precision remains" ethos is the same
  target D43 §2 already states for VOLYUME ("House cohesion first... the set
  you are doing is the hero"). This is independent confirmation from a
  design-cited competitor, not a new direction.

---

## 4. Unilateral / per-side logging in the wild

**This internal question was already researched in full** in
`docs/exercise-planning-2026-07-09/plan-C-unilateral-logging.md:94-113`,
against Hevy, Strong, JEFIT, MyFitCoach, Boostcamp, Gravitus, Alpha
Progression and StrengthLog. Web research for this brief targeted the same
apps plus Juggernaut AI and confirms, rather than overturns, that prior
finding.

**The finding, confirmed again independently: absence is the pattern, not a
gap in research.**

| App | Pattern | Source |
|---|---|---|
| Hevy | No dedicated per-side UI found in any 2026 feature page, help-centre article, or review fetched for this brief. Log one weight/rep number; user self-organises. | This brief's web search found zero mentions; corroborates `plan-C-unilateral-logging.md:98`. |
| Strong | Same status quo; no unilateral-specific mode found, despite having first-class supersets/circuits. | `plan-C-unilateral-logging.md:99`; this brief found no new evidence either way (thin coverage). |
| JEFIT | No structural feature — but JEFIT's own community Q&A shows it is a **live, unresolved user pain point**: "does the app double the weight or must I log both sides", "does it count it as double since it's unilateral" — users invent their own workarounds (log twice, double the weight, double the set count). | [jefit.com Q&A](https://www.jefit.com/q&a/121914193/shanagrand/how-do-you-log-your-unilateral-movement--for-instance-if-i-do-single-leg-rdl-i-m-logging-40lbs-12) — fetched fresh for this brief, same thread the internal doc cites. |
| MyFitCoach | Documented **advice**, not a UI feature: always log one side's weight/reps, never the total; log reps per arm for alternating sets. The rule lives in a help article, not enforced by the logging screen. | [intercom.help/myfitcoach](https://intercom.help/myfitcoach/en/articles/5433056-how-to-track-weight-for-unilateral-exercises) — fetched fresh, corroborates `plan-C-unilateral-logging.md:101`. |
| Boostcamp, Alpha Progression, Gravitus, Juggernaut AI | No unilateral/per-side feature found in any 2026 feature comparison, review, or vs-page searched for this brief (Boostcamp's own comparison pages, Alpha Progression's feature pages, Arvo's head-to-head pages against both). Alpha Progression's Premium tier surfaces RPE/RIR per set but nothing side-specific. | Search results this brief: boostcamp.app/best/powerlifting, boostcamp.app/best/hypertrophy, alphaprogression.com, arvo.guru vs-pages — none mention per-side logging. |
| StrengthLog | Has a formal "Special set > Circuit" grouping construct comparable to a superset, reused as the nearest precedent for "teach the pattern once, structurally group it" — but not a per-side answer. | `plan-C-unilateral-logging.md:103`. |
| **WorkoutLog Pro** (new finding, not in the internal corpus) | The **one app found with an actual dedicated feature**: for one-arm-at-a-time dumbbell moves (curls, lateral raises, rows), it logs **separate left and right weight/reps**, and its progress graph automatically shows the combined (right + left) max. Framed explicitly around catching dominant/non-dominant strength imbalances. Free, no paywall on this feature. | [workoutlogpro.com/blog/gym-log](https://workoutlogpro.com/blog/gym-log) — fetched fresh for this brief. Evidence is a blog description, not a screenshot; treat as **medium-strength** (single source, no visual confirmation of the actual input UI). |

**Verdict, stated plainly per the brief's instruction:** the mainstream elite
loggers (Hevy, Strong) and the science-forward apps (Alpha Progression,
Boostcamp, Juggernaut AI, Gravitus) **do not solve this** — they treat a
unilateral set as an ordinary set and leave the left/right bookkeeping to
the user's own convention, which JEFIT's support forum shows produces real,
documented confusion (is it double-counted or not). Only one niche app
(WorkoutLog Pro) does true separate L/R fields, and only as flat separate
numeric entry with no described rest-between-sides workflow, no first-time
walkthrough, and no engine-level "one set" accounting rule — a narrower
answer than the two-phase log-side-one/rest/log-side-two flow VOLYUME's own
`plan-C-unilateral-logging.md` Option 2 recommends. **This confirms the
internal document's conclusion stands unchanged by web research: nobody has
solved the founder's actual scenario ("one arm, rest a little, then the
other") as a workflow — building it well is a genuine, low-risk
differentiator, not a catch-up item.**

---

## 5. The bar — what best-in-class actually does

Concrete, testable statements. Each marked for whether Hevy and/or Strong do
it today, per the evidence above.

| # | Statement | Hevy | Strong |
|---|---|---|---|
| 1 | Previous session's weight × reps is visible per set row without an extra tap. | Yes (PREVIOUS tab/column) | Yes (auto-fill previous, per corahealth.app) |
| 2 | Logging a set is one tap from the default state (values prefilled). | Yes (tap the checkbox) | Yes |
| 3 | Rest timer starts automatically on set completion, no manual start. | Yes | Yes |
| 4 | Rest timer is fully controllable (skip, adjust) without leaving the current screen. | Yes (in-app +15/-15/skip) | Not confirmed in sources (assume parity, unconfirmed) |
| 5 | Rest timer is controllable from a locked/backgrounded phone via system notification actions. | Yes (Complete Set/Skip/±15/Add exercise) | Not found in any source for this brief |
| 6 | Set type (warm-up/drop/failure/normal) is a first-class, quick-access field, not buried in a menu. | Yes | Not confirmed, likely thinner (minimalist positioning) |
| 7 | Supersets/paired exercises are visually distinguished (colour or equivalent) at a glance across the whole session, not just locally. | Yes (unique colour per superset) | No dedicated evidence found |
| 8 | The active session can be minimised/left without losing logging state, and resumed without re-navigating. | Yes (floating minimised bar) | Not found |
| 9 | Weight/reps entry supports fast incremental adjustment (stepper), not only raw keyboard typing. | No stepper found in corpus (cell-tap-type only) | Not confirmed |
| 10 | A logged set can be edited or deleted in place, in-session, without a full modal detour. | Yes (un-check, re-edit the row) | Not confirmed |
| 11 | Finishing a workout is a single, ungated tap (no confirm-alert on every finish). | Yes (no confirm found) | Not confirmed |
| 12 | Plate-loading maths is available inline for barbell exercises. | Yes (Calculator button) | Not confirmed |
| 13 | The logging surface reads calm and uncluttered — minimal chrome above the actual input fields. | Mixed (reviewers praise speed, not specifically visual calm) | Yes (strongest "usable without looking at the screen" claim found) |
| 14 | Data (numerals, charts, trends) is presented with a dedicated, purpose-considered type/icon system rather than defaults. | Not evidenced (Hevy is a logger, not reviewed on type craft) | Not evidenced | 
| 15 | Personality/colour is spent on rare meaning-moments (a milestone, a PR), not on everyday chrome. | Partial (superset colour is functional, not celebratory) | Not evidenced |

Row 14 and 15 are carried over from MacroFactor (§3), included here because
the founder explicitly wants the logger to beat MacroFactor on **design
quality**, not feature parity — MacroFactor is not a logger, so it cannot be
scored on rows 1-13.

**Caveat on evidence quality:** rows 4, 6, 9, 10-13 for Strong rely on
absence-of-evidence in marketing/review copy, not a confirmed "Strong lacks
this" — Strong's own site was not screen-walked (no first-party UI teardown
exists in the internal corpus or was found on the web for this brief).
Treat blank Strong cells as "not verified" not "confirmed absent."

---

## 6. Beat-them opportunities

Five things none of Hevy, Strong or MacroFactor do well today, where a
VOLYUME rebuild can win outright — cross-referenced against VOLYUME's own
current-state audit so these are real openings, not wishful thinking.

1. **A real per-side (unilateral) workflow, not a bookkeeping convention.**
   Confirmed in §4: nobody in the mainstream or science-forward tier has
   solved this as a *workflow* (log side one → short rest → log side two →
   commits as one set); the one niche app that tries (WorkoutLog Pro) only
   offers flat separate fields with no rest/no walkthrough. VOLYUME's own
   `docs/exercise-planning-2026-07-09/plan-C-unilateral-logging.md` Option 2
   is already scoped, reuses the proven `clusterSet.js` pattern, and is a
   founder decision away from being genuinely first-to-market on this.

2. **Zero-tap logging via keyboard "Done".** Neither Hevy's row-grid
   (tap-cell → type → tap-checkbox) nor anything found for Strong offers a
   typed set that logs itself on the keyboard's Done key. VOLYUME already
   ships this (`SetEntry.js:356-360`, confirmed in
   `design-usability-audit-2026-07-09/07-workout-logger.md:38-42`) — the
   redesign must preserve it as a genuine, provable edge, not just avoid
   regressing it.

3. **Crash/app-kill recovery of the in-progress (unlogged) set, not just the
   session.** No competitor evidence of this in any source reviewed. VOLYUME
   drafts the typed-but-unlogged set to storage on a debounce and flushes
   instantly on backgrounding, keyed to the exact set position
   (`design-usability-audit-2026-07-09/07-workout-logger.md:172-180`,
   `01-workout-logging.md:105-109`) — this is stronger interruption-recovery
   than any documented competitor behaviour and should be foregrounded as a
   trust signal in the rebuilt shell, not buried.

4. **A native, live, ticking lock-screen rest countdown (not just a static
   notification).** Hevy's rest-timer notification is a system-notification
   with action buttons but no source found describes a live foreground-
   service countdown; VOLYUME already has exactly this on Android (a native
   chronometer foreground service for short rests,
   `design-usability-audit-2026-07-09/07-workout-logger.md:200-207`) — an
   above-Hevy capability that a premium redesign should keep visible as a
   headline feature, and — per the founder's explicit design-quality bar —
   extending it to iOS (currently gated on Live Activity/App Groups
   provisioning per D43 §8) would be a genuine category-leading move once
   unblocked.

5. **MacroFactor-grade type/icon discipline applied to a training screen.**
   No lifting logger in this research (Hevy, Strong, or any science-forward
   app) was reviewed or praised for typographic/iconographic craft — that
   territory is currently only owned by a nutrition app. VOLYUME's own
   `D43-LOGGER-REDESIGN-BLUEPRINT.md` already commits to "House cohesion
   first" using `type.num()` for every data numeral and the app's existing
   `Card`/token system (`D43-LOGGER-REDESIGN-BLUEPRINT.md:53-58`); executing
   that with MacroFactor-level rigour (numerals, icons and set-type
   indicators treated as calibrated instruments, not defaults) would put
   VOLYUME's logger ahead of every logger reviewed on visual craft
   specifically, which is an open lane — nobody in the logger category is
   contesting it.

---

## Sources

**Internal (read in full for this brief):**
- `docs/hevy-teardown-2026-06-29/01-workout-logging.md`
- `docs/hevy-teardown-2026-06-29/U1-workout-flow.md`
- `docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md`
- `docs/design-usability-audit-2026-07-09/07-workout-logger.md`
- `docs/exercise-planning-2026-07-09/plan-C-unilateral-logging.md`
- `docs/volyume-elite-audit/inputs/market-competitors.md`
- `docs/volyume-elite-audit/inputs/best-in-class-patterns.md`

**Web (fetched/searched for this brief, dated 2026-07-11):**
- https://www.hevyapp.com/features/track-workouts/
- https://www.hevyapp.com/features/what-are-supersets/
- https://repreturn.com/hevy-app-review/
- https://www.corahealth.app/compare/hevy
- https://www.corahealth.app/compare/strong
- https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more
- https://medium.com/@hwaijunyap/ui-ux-case-study-strong-workout-app-redesign-fc22afbada65 (fetched, discounted — off-topic student project)
- https://the-brandidentity.com/project/pentagrams-inspired-science-approach-frames-macrofactors-rebrand
- https://outlift.com/macrofactor-review/
- https://www.jefit.com/q&a/121914193/shanagrand/how-do-you-log-your-unilateral-movement--for-instance-if-i-do-single-leg-rdl-i-m-logging-40lbs-12
- https://intercom.help/myfitcoach/en/articles/5433056-how-to-track-weight-for-unilateral-exercises
- https://workoutlogpro.com/blog/gym-log
- https://www.boostcamp.app/best/powerlifting, https://www.boostcamp.app/best/hypertrophy
- https://alphaprogression.com/en
- https://arvo.guru/vs/alpha-progression, https://arvo.guru/vs/boostcamp
