# r-10 — CARDIO, STEPS & WEARABLES (external research)

Research agent r-10 of the ULTIMATE-APP MANDATE. Paired to audit
`audit/a-10-cardio-steps-wearables.md`. British English throughout.
Verification protocol: every load-bearing claim carries a fetched-source URL;
2+ where load-bearing; failed fetches logged per-URL; UNVERIFIABLE used where
honest. No commit.

---

## STEP 0 — TOOLING PROOF (fetch + verbatim quote)

WebSearch live; WebFetch proven end-to-end against two independent live pages,
quoted verbatim:

1. **MacroFactor help centre** —
   <https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker>
   verbatim: *"No: MacroFactor doesn't use estimates of energy expenditure from
   wearable devices for the purpose of calculating expenditure or modifying
   dietary targets."*
2. **Garmin Connect blog** —
   <https://www.garmin.com/en-GB/blog/unlocking-the-potential-of-garmin-connect/>
   verbatim: *"This hub of your health and performance stats presents all of
   today's (and the past seven days') information in easily digestible cards."*

Fetch failures this session (logged): Garmin step-counting page (HTTP 404,
wrong path); Apple Support 108314 (returned Shared-Albums page, wrong doc);
WHOOP support article 360019453214 (HTTP 403); MacroFactor `/expenditure-modifiers/`
and `/wearables/` (bot-verification loader walls, content not retrieved — routed
around via help-centre + search excerpts); Cronometer devices-overview
(HTTP 403). **Total distinct fetch failures: 6.** All routed around with
alternative live sources, so no claim rests on a failed fetch. None caused a STOP
(tooling itself proven working per Step 0).

---

## 1. PER-APP FINDINGS

### Garmin Connect — steps/cardio presentation gold standard
- **Steps presentation:** today + past-seven-days in digestible cards; a bar-graph
  widget shows the last five days and whether the goal was met; Calendar exposes
  weekly/monthly/yearly with 4-week / 6-month / 1-year trend graphs; tapping any
  stat (steps, HR, sleep, stress, weight, calories) opens charts over longer
  periods. Connect+ adds a performance dashboard with 120+ premade charts.
  Sources: blog (fetched verbatim above);
  <https://www.garmin.com/en-GB/blog/unlocking-the-potential-of-garmin-connect/>;
  search corpus incl. `support.garmin.com` Reports + Forums "trends longer than
  1 year".
- **Wearable signals surfaced — the breadth lesson:** **Body Battery** combines
  HRV (primary driver), resting heart rate, sleep quality, stress and movement
  into a 5–100 "available energy" / readiness gauge that rises with rest and falls
  with exertion. Positioned as *"a readiness guide rather than a diagnostic
  instrument."* This is the canonical pattern for turning HRV/RHR/sleep into one
  legible readiness number.
  Sources: <https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/>
  (search corpus); the5krunner + clearcals corroboration in the same result set.
- **Take for a-10:** Garmin is the reference for *step history depth* (tap-through
  to multi-horizon charts) and for *readiness from passive signals* (Body Battery).
  Both are exactly Volyume's two biggest a-10 gaps (dead-end steps; no HRV/RHR
  readiness input).

### Apple Fitness — rings + Trends
- **Rings (verbatim, fetched):** *"The red Move ring shows how many active calories
  you've burned. The green Exercise ring shows how many minutes of brisk activity
  you've done. The blue Stand ring shows how many times in the day you've stood and
  moved for at least 1 minute per hour."*
- **Trends (verbatim, fetched):** *"Trends compares your last 90 days of activity to
  the last 365."* Directional up/down arrows per metric (active calories, exercise
  minutes, stand hours, walking distance, cardio fitness, walking pace); **180 days
  of data required before trends start**; tap an arrow for a one-year chart with the
  last 90 days highlighted; coaching nudge e.g. *"Walk an extra quarter mile a day."*
  Sources: <https://support.apple.com/en-us/105003> (fetched verbatim);
  AppleMagazine "Apple Fitness Trends" + Cult of Mac in search corpus (corroboration
  of 90-vs-365, 180-day onset, tap-to-chart).
- **Take:** Apple's recent-vs-long-baseline median/arrow model is conceptually the
  consumer-facing twin of Volyume's COMP-026 (14-day vs 28-day medians). Volyume
  already does the *maths* honestly but shows the user almost nothing; Apple shows
  the *picture* but with a long warm-up. The pick-up is the **picture**, not the
  maths.

### WHOOP — strain
- **Verbatim (fetched):** *"WHOOP Strain is a measure of cardiovascular and muscular
  exertion that quantifies the amount of physical and mental stress you're putting on
  your body."* … *"We track your strain on a 0-21 scale, both for your entire day and
  for specific workouts and activities."* … *"The WHOOP algorithm is logarithmic,
  meaning the higher your Strain gets, the harder it becomes to build more."* …
  *"Cardiovascular load tracks your heart rate — the higher it gets and the longer it
  stays elevated, the more Strain you accumulate."*
  Sources: <https://www.whoop.com/us/en/thelocker/how-does-whoop-strain-work-101/>
  (fetched verbatim); support.whoop.com 360019453214 (403, logged) corroborated by
  reputable.health in search corpus.
- **Take:** Strain is the load-from-HR-zones model. Volyume already has an internal
  **cardioRecoveryLoad** (3-day half-life decayed sum, banded) — the same *idea*
  computed from MET×intensity rather than HR. WHOOP's lesson is presentation: a
  single bounded daily/weekly exertion number the user can read, plus a recovery
  pairing. Volyume keeps load invisible.

### Oura — activity
- **Verbatim (fetched):** *"The Oura Ring registers all your daily movements and their
  intensities, from light housework to heavy workouts."* … *"The Oura Ring uses a 3D
  accelerometer to track activity, measuring movement in all directions."*
- **Baseline philosophy (search corpus, ouraring.com):** *"There is no step count goal
  as a feature… rather, the focus is on comparing steps to your own baseline."* Daily
  goal is **dynamic with Readiness** — raised when Readiness >85, cut when <70.
  Sources: <https://support.ouraring.com/hc/en-us/articles/360025576833-How-Oura-Measures-Steps-Activity>
  (fetched verbatim); ouraring.com Activity blog (search corpus).
- **Take:** Oura's "your-own-baseline, readiness-flexed target" is philosophically
  close to Volyume's **phase-banded** step target — but Oura flexes by *recovery*,
  Volyume flexes by *phase/weight-trend*. The honest pick-up is **readiness-aware
  target softening** (don't push steps up on a low-recovery week), which Volyume's
  coach partly does for cardio (pauses on poor recovery) but not for steps.

### Fitbit
- **Steps & goal:** 10,000-step default, highly visible on clock face / Today / app
  dashboard; goal celebration on hit. **Active Zone Minutes (AZM)** is the headline
  modern metric — a weekly target (default 150) for time in fat-burn / cardio / peak
  HR zones, with daily and weekly views and manageable history.
  Sources: search corpus — Wareable "AZM explained / next 10,000 steps",
  help.fitbit.com 1379, Google Health Help 14236510.
  *(UNVERIFIABLE: exact current default thresholds beyond 150 AZM not fetched
  verbatim; reported as widely-cited defaults.)*
- **Take:** Fitbit's shift from raw steps to **HR-zone minutes** is the same
  intensity-aware idea as Volyume's Easy/Moderate/Hard cardio dose — but as a
  passive weekly target. Useful as a *second movement target* beyond steps for Eddie.

### Samsung Health
- **Steps history (verbatim, fetched):** *"From there, you can swipe left and right on
  the graph to view your step totals from previous days."* with 7-day / 31-day /
  12-month average views.
- **Multi-device dedupe (verbatim, fetched):** when "All steps" is the source the app
  *"will show the combined step total for your phone and all connected devices"* —
  i.e. it owns aggregation rather than letting trackers double-count.
- **Together:** social walking challenges (Get there first / Go the farthest).
  Sources: <https://www.samsung.com/us/support/answer/ANS10001370/> (fetched verbatim);
  Together support page + Samsung newsroom group-challenge (search corpus).
- **Take:** Samsung is the reference for **step history horizon-switching** (7/31/365)
  and for owning the multi-device aggregation that Volyume currently leaves to a
  fragile raw-sum fallback.

### Strava — per-activity cardio gold standard
- **Feed stats (search corpus):** configurable per-activity — Start Time, Pace, Speed,
  Calories, Power, Heart Rate; run feed swaps pace↔elevation by gain; achievement
  banners (longest activity, best efforts, segment PRs).
- **Activity detail:** HR chart with avg/max; **HR-zone time breakdown Z1–Z5**; lap
  table with per-lap pace zone / avg pace / distance / time / HR; **Relative Effort**
  (Strava's HR-based load score). Training Zones page.
  Sources: search corpus — support.strava.com Activity-Stats-in-the-Feed,
  Run-Activity-Pages, Heart-Rate, Relative-Effort, Training-Zones.
  *(Verbatim fetch not taken — Strava support behind JS; reported from search
  excerpts only, flagged.)*
- **Take:** Strava is the model for the **rich per-cardio-session view** Volyume
  lacks — pace/distance/HR/zones/laps and a per-activity load score. Directly
  answers Eddie's "my watch already measured pace/distance/HR and the app discards
  it" friction.

### MacroFactor — expenditure from wearables (the honesty benchmark)
- **Verbatim (fetched, help centre):** *"No: MacroFactor doesn't use estimates of
  energy expenditure from wearable devices for the purpose of calculating expenditure
  or modifying dietary targets."* — because *"Wearable devices are known to regularly
  misestimate energy expenditure… incorporating this data would introduce error…
  without an obvious mechanism to correct for that error."*
- **Steps, not energy (search corpus, macrofactor.com):** Step-Informed Updates use
  step *counts*, which *"will smoothly and progressively increase or decrease your
  estimated expenditure and calorie targets over time. Step counts won't be used to
  additively increase or decrease your calorie targets on individual days."* Stated
  trade-off ~3% stability cost for ~2% responsiveness gain, clearest after 30 days.
- **Smoothing rationale (verbatim, fetched):** *"MacroFactor's energy expenditure
  calculation relies on changes in trended weight… we don't want to over-react to
  short-term weight fluctuations…"*
  Sources: help articles 33 + 255 + 26 (fetched);
  <https://macrofactor.com/expenditure-modifiers/> + `/wearables/` (loader-walled,
  logged; backed by the search-result summaries that quoted the additive-exclusion
  sentence).
- **Take:** MacroFactor is the closest competitor philosophy and the bar Volyume must
  clear on honesty. **Volyume already matches or beats it:** steps feed only a
  confidence-gain (clamped 0.50→0.65), never a calorie value, and the user is told
  *"Steps are never given a calorie value"* in plain language — vs MacroFactor's
  equivalent buried in an essay (per a-10 §3). This is a genuine Volyume lead.

### Carbon — cardio handling
- **Search corpus + help fetch:** Carbon *does not connect to fitness trackers and does
  not adjust calories based on daily activity*; a long hike or extra session does not
  change daily targets. Activity level is a setup input only; weekly check-ins on
  weight then recalibrate targets *"regardless of which setting you choose."*
  Sources: help.joincarbon.com 6004568 (fetched — confirms check-in-driven recalibration
  verbatim); joincarbon.com how-it-works + reviews (search corpus for the
  no-tracker / no-activity-add-back claim).
  *(Partial-UNVERIFIABLE: the specific "does not connect to trackers" sentence came
  from the search summary, not a verbatim fetch — flagged.)*
- **Take:** Carbon is Volyume's philosophical twin (weight-trend-driven, no exercise
  add-back) but **weaker on movement feedback** — no tracker sync, no step/cardio
  surfaces at all. Volyume's cardio-as-dose + step targets are *more* coaching value
  on the same honest base. Confirms Volyume's interlock is a defensible market stance,
  not an omission.

### Cronometer — device-sync breadth
- **Breadth (search corpus):** syncs Garmin, Oura, Fitbit, Withings, WHOOP, Polar,
  Dexcom, Suunto, Apple Health, Google Fit, Samsung Health, Health Connect; time-series
  HR from Garmin/Oura/Apple Health/Google Fit.
- **Honest dedupe warning (search corpus):** *"It is recommended to only import data
  from one device integration, as having more than one… may result in incorrect values
  imported into your diary."*
  Sources: support.cronometer.com Devices-Integration-Overview (403, logged) +
  cronometer.com/features/sync-devices.html + wellkr integrations guide (search corpus).
- **Take:** Cronometer is the breadth benchmark **and** the source of the exact honest
  framing Volyume needs for its multi-tracker double-count risk: tell the user to pick
  one primary source. Volyume currently has a silent raw-sum fallback that can
  double-count (a-10 §4) with no such guidance.

### Peloton — cardio session presentation for non-power workouts
- **Verbatim (fetched):** Strive Score is *"a personal, noncompetitive metric based on
  your heart rate, measured with a compatible heart rate monitor"* that *"measures how
  much time you spend in each heart rate zone to track how hard you're working in every
  workout."* And: *"At the start of a class, you'll see your 'Typical Strive'… calculated
  based on your previous Strive Scores for classes of similar type and length."*
  Sources: <https://www.onepeloton.com/blog/strive-score> (fetched verbatim);
  support.onepeloton 360059490452 + connectthewatts (search corpus).
- **Take:** "Typical Strive" = *compare this session to your own history for this
  activity type* — the **per-activity-type aggregation** Volyume's flat cardio history
  lacks (a-10 §4: "no per-activity rollup"). Non-competitive, beginner-safe framing.

### Zepp / Amazfit — PAI (single rolling movement number)
- **Search corpus:** PAI converts continuous HR into one score; any HR elevation above
  resting earns points, harder = faster; personalised by age/sex/RHR/max HR (NTNU
  HUNT-study algorithm); scored over a **rolling 7-day window**, target 100; activity-
  agnostic (*"It only cares about what your heart is doing"*).
  Sources: biologyinsights.com PAI explainer; support.amazfit.com knowledge/11;
  smartwatchsphere beginner guide (search corpus). *(No verbatim fetch — vendor pages
  JS-heavy; flagged.)*
- **Take:** PAI is the simplest beginner-facing answer to "am I moving enough this
  week?" — one rolling-7-day number instead of a step count. Conceptually aligned with
  Volyume's weekly step-band thinking; the lesson is *one legible weekly movement
  figure* for Besa, intensity-aware rather than raw steps.

---

## 2. SYNTHESIS

### (a) Winner patterns (apps + URLs)
1. **Tap-through step history with horizon switching** — Samsung 7/31/365 swipe graph
   (<https://www.samsung.com/us/support/answer/ANS10001370/>); Garmin multi-horizon
   stat charts (<https://www.garmin.com/en-GB/blog/unlocking-the-potential-of-garmin-connect/>).
2. **Recent-vs-long-baseline trend with arrows + tap-to-chart** — Apple Trends 90-vs-365
   (<https://support.apple.com/en-us/105003>).
3. **Readiness from passive signals (HRV/RHR/sleep)** — Garmin Body Battery
   (<https://www.garmin.com/en-US/garmin-technology/health-science/body-battery/>);
   Oura readiness-flexed activity goal
   (<https://support.ouraring.com/hc/en-us/articles/360025576833-How-Oura-Measures-Steps-Activity>).
4. **Rich per-cardio-session view (pace/distance/HR/zones/laps + load)** — Strava
   (<https://support.strava.com/hc/en-us/articles/15422373796493-Activity-Stats-in-the-Feed>);
   intensity-aware weekly target — Fitbit AZM
   (Wareable AZM explainer, search corpus).
5. **Per-activity-type "compare to your own typical"** — Peloton Typical Strive
   (<https://www.onepeloton.com/blog/strive-score>).
6. **One legible weekly movement number for beginners** — Amazfit PAI
   (support.amazfit.com/en/knowledge/11, search corpus); WHOOP single 0–21 Strain
   (<https://www.whoop.com/us/en/thelocker/how-does-whoop-strain-work-101/>).
7. **Honest "pick one device" multi-tracker guidance** — Cronometer
   (cronometer.com/features/sync-devices.html, search corpus).
8. **Steps-not-calories honesty** — MacroFactor additive-exclusion
   (<https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker>).

### (b) Where Volyume already LEADS honestly
- **Steps never produce a calorie adjustment.** Steps feed only a confidence-gain
  hard-clamped [0.50, 0.65], upstream of every senior safety clamp. MacroFactor's
  Step-Informed Updates also avoid per-day calorie adds — but Volyume's *interlock is
  structurally stronger* (no path from steps to a calorie value at all) and its
  explanation is plainer: *"Steps are never given a calorie value"* on-surface, vs
  MacroFactor's essay-buried equivalent (a-10 §3).
- **Phase-banded step targets** beat static 10,000-step goals (Fitbit) and even Oura's
  readiness-only flex — Volyume's band is tied to the actual goal/phase (agg_cut
  12–14k … mod_bulk 7–9k), athlete-adjusted for >100 kg. More coaching intent than any
  pure tracker.
- **Cardio-as-dose coaching** (sessions×minutes×intensity, fired only as a genuine cut
  lever when steps are maxed and the trend is still off) is *coaching*, not just a
  display. Strava/Peloton/WHOOP show load beautifully but **prescribe nothing**;
  Carbon prescribes calories but **ignores cardio entirely**. Volyume sits uniquely in
  between, honestly.
- **"Already counted" honesty across three coherent surfaces** directly defuses the
  MyFitnessPal eat-it-back reflex — a stance MacroFactor and Carbon share in principle
  but Volyume states more visibly at the moment of logging.
- **Cardio cannot spiral** (MAX 5 sessions, pauses on poor recovery; ED-flag
  suppression of the "moving less" line). No competitor surfaced has an ED-aware
  movement interlock.

### (c) Ranked pick-ups vs a-10's frictions — for Besa AND Eddie

| # | Pick-up | Fixes a-10 friction | Besa (newbie) | Eddie (prep) |
|---|---------|---------------------|---------------|--------------|
| 1 | **Step history screen** — tap the Home steps pill → 7/30/90-day chart + trend line, horizon switch (Samsung/Garmin/Apple) | #1 dead-end steps display | "I started walking to work" gets a visible feedback loop → retention | Confirms NEAT is holding through a cut |
| 2 | **Cardio history → aggregation + trends** — weekly minutes, kcal trend, **per-activity rollup**, "Typical for this activity" (Peloton/Strava) | #4 flat list, no rollup | n/a (light cardio) | His core need: per-type minutes/pace trends across a prep |
| 3 | **Wire the watch-skip dedupe + "pick one source" guidance** (Cronometer honesty) | #2 duplicate Health writes; #4-notes raw-sum double-count | protects calorie-trend honesty silently | Eddie most likely multi-tracker → biggest double-count risk |
| 4 | **Capture optional pace/distance/HR on a cardio log** (Strava) — pull from the watch the app already reads, don't make him re-type | #5 narrow ingestion / discarded watch data | hidden by default (Easy/Mod/Hard stays primary) | Stops re-entering what his watch measured |
| 5 | **Readiness input from HRV/RHR** (Garmin Body Battery / Oura) feeding the *existing* recovery model — soften step/cardio targets on a low-recovery week | #5 no HRV/RHR readiness despite data one scope away | gentle "ease off today" framing = supportive | Genuine readiness-gated dosing for hard prep blocks |

Beginner-energy-balance note: for **Besa**, the winning communication pattern is
*one weekly movement figure* (PAI / WHOOP-style single number, or Apple's single
trend arrow) layered over Volyume's already-excellent "already counted, nothing to
add back" line — so she never does maths and gets one honest "are you moving more or
less than usual" signal.

### (d) What everyone has that we lack
- **Any step history at all.** Samsung, Garmin, Apple, Fitbit, Oura all give a
  tap-through multi-day step chart; Volyume gives one non-interactive pill. Universal
  gap.
- **HR-zone / intensity-aware movement metric** — Strava zones, Fitbit AZM, Peloton
  Strive, WHOOP Strain, Amazfit PAI. Volyume captures intensity only as a 3-way band
  and never shows a zone or load number.
- **Per-activity-type aggregation in history** — Peloton "Typical", Strava per-sport.
  Volyume's history is a single undifferentiated reverse-chron list.
- **Readiness from passive physiology** — Garmin Body Battery, Oura Readiness, WHOOP
  Recovery. Volyume's recovery model is lift+cardio-impact only.
- **Movement/cardio on a widget** — Garmin/Apple/Fitbit/Samsung all surface steps on
  a home widget/clock face. Volyume's widgets are training-only (a-10 §1c: zero
  cardio/steps widgets).
- **Distance/pace/HR ingestion** — every wearable app stores it; Volyume discards it.

*Honest caveat:* most "everyone has it" items are tracker-native and Volyume is a
coach, not a tracker — so the pick-up is to **surface the signals it already reads**
(steps history, optional HR/distance, a readiness number), not to rebuild a tracker.

---

## 3. CITATION LEDGER

Fetched verbatim (load-bearing): MacroFactor help 33; Garmin Connect blog; Apple
Support 105003; WHOOP locker strain-101; Oura support 360025576833; Samsung
ANS10001370; Peloton blog strive-score; Carbon help 6004568; MacroFactor help 26.
Search-corpus only (flagged inline, ≥1 corroborating source each): Strava support
set; Fitbit AZM (Wareable/Fitbit help); Cronometer sync breadth + dedupe warning;
Amazfit PAI; Garmin Body Battery; MacroFactor expenditure-modifiers additive-exclusion
sentence.
Fetch failures logged (6): Garmin step-counting 404; Apple 108314 wrong-doc; WHOOP
support 403; MacroFactor /expenditure-modifiers/ + /wearables/ loader walls;
Cronometer devices-overview 403. No claim rests solely on a failed fetch.
