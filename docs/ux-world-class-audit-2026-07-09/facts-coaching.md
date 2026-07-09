# Facts: Coaching & progress

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

## WEEKLY CHECK-IN, COACH REVIEW & COACH OUTPUT

**WeeklyCheckInScreen.js** (1979 lines): 4-step wizard (How are you? → This week's data → Recovery & issues → Training performance), gated by `gateState` (`loading|wrong_day|day_late|too_soon|need_weights|open|load_error`). Enters data: energy (1-5), stress (1-5), sleep hours (optional), calorie adherence (auto-derived from food diary, overridable), cardio adherence (auto-derived from cardio log), soreness (1-5) + sore-muscle chips, joint pain yes/no, free-text notes (280 char), training-performance verdict (auto-derived from sessions/PRs/volume delta, overridable). A "Fast Check-In" condensed card (`fastEligible`) appears when every derivable field is confidently pre-filled, leaving only energy + soreness as required taps, with an "Add more detail" escape hatch back to the full wizard. Optional "progress scan" evidence card (fail-closed, absent unless a valid recent scan exists). On submit, navigates straight to `CoachOutputScreen`.

**CoachReviewScreen.js** is the **free-tier** weekly review (no Pro coach): sessions/sets/top-muscle stats, per-muscle volume-status badges, "What went well" / "What to watch" insight cards, and up to 3 auto-generated text recommendations (e.g., recovery-week suggestion, over/under-volume muscle callouts). No accept/apply mechanism — purely descriptive.

**CoachOutputScreen.js** (3113 lines, Pro) is the actual accept/hold/decline surface. There is **no single accept/decline button** — each adjustment card (calories, cardio, training volume/deload, diet break, macro cycle, refeed) carries its own independent **"Apply"** button (`AdjustmentRow`). Unapplied suggestions simply remain unapplied; there's no explicit "decline." "Hold" is the engine's own decision, surfaced in a dedicated "What we held this week" card with plain-English reasons, plus special structured blocks for ED-pattern lockout, ED-pattern-cleared, and rapid-loss-correction. Before/after numbers: e.g. calorie row shows `+150 kcal/day → 2,200 kcal/day` (signed delta then absolute arrow-target) once applied; pre-tap it shows the pending absolute target. A single amber-filled "hero" Apply is promoted above secondary/collapsed adjustments ("More adjustments (N)"); everything renders in staged fade-in beats (header → coach's lead sentence → verdict hero → trend chips → ledger).

## PROGRESS SURFACES

- **AnalyticsScreen** ("Progress" landing): scrubbable 8-week tonnage bar hero, sparkline cards (sessions/PRs, 30d, non-interactive), muscle-volume summary strip, lifetime totals, milestone strip ("12 weeks of showing up. That's a habit."), recap-unlock nav tile gated at 10 sessions.
- **LiftProgressScreen**: relative-strength ratio (est.1RM/bodyweight, Beginner→Elite badges) with an explicit historical unit-bug note in comments (a lbs user's ratio was once inflated ~2.2×); per-lift rows with a 4-way metric-chip switcher (Best set/Heaviest/Total reps/Volume) recomputing sparklines client-side; long-press peek menu.
- **ConsistencyScreen**: streak, deload/"lighter week" banner, ACWR training-load card with tiered plain-English status lines, session-length trend, 12-week training-days calendar grid (static, no tap), fatigue-trend coaching lines.
- **VolumeHeatmapScreen**: anatomical body-diagram heatmap, 1/2/4-week window selector, per-muscle bars against MEV/MAV/MRV tick marks (never named as acronyms in UI — glossed as "least amount needed," "sweet spot," "beyond this, recovery suffers"), scrubbable per-muscle trend mini-charts (4W/8W/3M/6M).
- **YearOfLiftsScreen** doubles as the app's true "story" format, reused via a shared `RecapStory` route for year/month/week/block recaps (`variant` param) — Instagram-style auto-advancing full-screen cards (5s/card), tap-to-advance/rewind, progress-pip fill animation, `haptics.selection()` on manual tap only. Under calm mode/open ED flag, all % comparisons are stripped to purely factual copy (fails closed on a storage-read error too).
- **BodyMetricsScreen**: weight/body-fat/measurement trend charts (VolyumeChart, interactive tooltips, window chips 1/3/6/12mo persisted per-chart), EWMA "Weight trend" card, "Estimated daily burn" (adaptive TDEE) card with confidence tiers, recomposition reframe card (weight flat/strength or shape moving), all suppressed under calm mode/open ED flag. Read-only view for free-tier lapsed users ("Your history is view-only on the free plan").
- **ProgressPhotosScreen** (2453 lines): timeline of dated photo/scan sets, pose filters (All/Front/Back/Side), newest/oldest sort ("neutral temporal wording only, never before/after framing" per code comment), Compare mode, a computer-vision "Volyume Score" scan feature with confidence tiers and calibration, and a separately-gated "Before/after" share card.
- **BlockReflectionScreen**: stats row (sessions/sets/volume/avg duration), auto-generated narrative sentences, PRs-this-block list, best-session card, "What's next" recovery nudge, and a "Play block story" button routing into the shared recap-story screen.

## WEEKLY STORY & SHARE

`WeeklyStoryScreen.js` is **not** a slide format — it's a plain vertical scroll of 4 read-only "chapter" cards: **Training**, **Eating**, **Weighing in**, **This week's decision**, each composing already-computed data (no new engine). Fails closed to suppressed body-weight numbers under an open ED flag/calm mode/read failure. The actual slide-based "story" experience lives in `YearOfLiftsScreen` (see above), shared across year/month/week/block via the `RecapStory` route.

`ShareCardScreen.js`: one Skia renderer draws both preview and export (session/PR/milestone/weekly-recap card types), square 1:1 default or 9:16 story, optional gym-photo background, per-field toggles (date, plan name, volume, exercises, PR weight, previous best, weight progress, best lift). Privacy note is hard-coded: "Name, bodyweight, measurements and private notes are never included" (weekly recap variant: "Only this week's progress, lifts and sessions are shown..."). Shares via OS share sheet (no direct Instagram/Facebook Stories API integration — deliberate, to avoid a new native dependency).

## COPY SAMPLES (verbatim)

- "We've held your calorie cut... Even when a cut is going well in numbers, sustained low energy is a safety signal. We'd rather pause than push."
- "Your weight dropped more than 1.5% this week and your energy is low. We're not waiting two weeks to react... This isn't a punishment for hitting your goal too fast. It's a safety call. Steady is the goal."
- "These answers help Volyume read the week in context, not just by numbers."
- "Nothing to change. The plan is working." / "Hold steady. The reasons are below."
- "Come back on {day}... Coaching runs on a weekly rhythm tied to that day, so the numbers compare like for like each time."
- "A few more weight readings needed... Logging every other day gives enough readings to smooth out that noise."
- "12 weeks of showing up. That's a habit." / "That's every set you logged this year, added together."
- "Your history is view-only on the free plan. Everything you logged is safe and stays yours."
- "Take a few days of lighter activity to recover, then start your next block. That recovery is when your progress takes hold."

Voice throughout: calm, plain, no shame, consistently British spelling, no em dashes.

## STATE COVERAGE

Every screen distinguishes loading (skeletons) / genuine load error ("Try again", data-is-safe reassurance) / true empty state, never conflating an empty week with a failed read (explicit `loadError` flags throughout, e.g. CoachReviewScreen U-B-6, BlockReflectionScreen). Check-in has 6 distinct gate states. Charts render "not enough data yet" hints rather than an empty/broken chart.

## INTERACTION

Reanimated `FadeInDown` staged reveal on CoachOutputScreen; chart scrubbing via 300ms long-press then drag with `haptics.selection()` per point (VolyumeChart, "windowing > scrubbing > zoom" design comment — no pinch/zoom anywhere); YearOfLiftsScreen auto-advance + tap zones + progress-pip animation; Button-primitive success-checkmark haptic beat on check-in submit fires only once save actually lands.

## STANDOUT / ROUGH EDGES

**Standout:** fail-closed ED-safety suppression is threaded through nearly every progress surface (WeeklyStory, YearOfLifts, BodyMetrics, ProgressPhotos); MEV/MAV/MRV never named in UI, always translated to plain sentences; before/after calorie numbers always show the absolute post-tap target, not just a delta; free-tier lapsed users get genuine read-only history rather than a hard wall.

**Rough edges:** `WeeklyStoryScreen` name promises a story-slide format but is a static scroll list, while the actual slide mechanic lives in a differently-named screen (`YearOfLiftsScreen`/`RecapStory`) — a naming/mental-model split; CoachOutputScreen has no unified "accept the whole week's plan" action, only per-card Apply, which is analytically-cleaner but requires N taps; `AnalyticsScreen`'s volume-summary tooltip mixes explanation with a navigation CTA inside a glossary modal (per sub-agent finding).
