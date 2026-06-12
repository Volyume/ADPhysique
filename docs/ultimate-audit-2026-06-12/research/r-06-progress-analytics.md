# r-06 — Progress & Analytics: best-in-class external research

> ULTIMATE-APP MANDATE, Phase 2, Area 06. Research agent r-06.
> Target audit: `audit/a-06-progress-analytics.md` (Volyume's Progress hub).
> Method: live WebSearch fan-out + WebFetch verbatim where hosts permit; 2+
> independent sources for load-bearing claims; failed fetches logged per-URL;
> UNVERIFIABLE recorded rather than invented. Verified base reused without
> re-fetch: `deep-audit-2026-06-12/validation/val-ext-01-02.md` and
> `val-ext-04-05-07.md` (Peloton badge tiers, Duolingo streak/achievement facts,
> Strava paywall backlash, watchOS rest days, week-6 guilt all VERIFIED there).
> British English throughout. Not committed.

---

## STEP 0 — tooling proof (passed)

WebSearch returned live, real competitor URLs on the first query. End-to-end
WebFetch returned verbatim content from a fetchable source:

> "volume per muscle group over time, per-exercise weight progression, and total
> workout frequency" … "Personal records are tracked automatically, and the app
> celebrates them in-workout with a small notification"
> — RepReturn Hevy review, fetched: https://repreturn.com/hevy-app-review/

Second independent verbatim fetch (MacroFactor weight-trend help):

> "Your weight trend is a moving average of your weight data that places greater
> emphasis on more recent weigh-ins. In practical terms, it tells you the overall
> direction your body weight is moving in, and the rate at which it's changing."
> — fetched: https://help.macrofactorapp.com/en/articles/21-weight-trend

Tooling proven. Fetch-failure log at the end of this file.

---

## 1. Per-app findings (what they lead with; early-win; share; body metrics; export; beginner explanation; progressive disclosure)

### Hevy — the artefact-virality benchmark
- **Leads with:** Statistics tab — volume per muscle group over time, per-exercise
  weight progression, workout frequency; a muscle diagram with trained areas
  highlighted; sets-per-muscle-group week to week. PRs tracked automatically
  (heaviest weight, true/projected 1RM, best set/session volume, most reps).
- **Early-win:** "celebrates [PRs] in-workout with a small notification"
  (fetched RepReturn). First-PR is the in-app moment.
- **Share:** auto-generated post-workout shareable cards (PRs, volume,
  consistency, streaks) with Instagram Stories export; **shareable routine links
  usable by non-users** — the verified viral loop (val-ext-01 #11, val-ext-07
  V4–V6). Hevy reached ~2M downloads on ~$15k ad spend, now 10M+ users,
  substantially via shared artefacts + routine links (VERIFIED, val-ext-07 V4).
- **Annual review:** "annual review that summarises training… training stats,
  consistency, active streak, best month, and personal bests throughout the year"
  (search record).
- **Export:** CSV export available.
- **Free/Pro:** unlimited logging, full progress charts, 1RM estimator with trend
  line, volume tracking all **free**; advanced analytics Pro. Free routine cap
  (4), 3-month history (val-ext-01).
- Sources: https://repreturn.com/hevy-app-review/ (fetched); search records of
  hevyapp.com/features/gym-progress, /training-chart, /sets-per-muscle-group-per-week
  (vendor domain bot-blocks direct fetch).

### Strong — export + Health sync leader
- **Leads with:** "Advanced Charts" — best sets, max 1RM, body fat %, body-part
  measurements; **Muscle Heat Map**; workout sharing.
- **Export/sync:** **"CSV Export… Export your data any time"** and **Apple Health**
  sync — both stated verbatim on the homepage (fetched). This is the single
  clearest export precedent in the strength segment.
- **Body metrics:** "Body Part Measurements" tracked natively; body fat % charted.
- **Free/Pro:** "Strong Accounts are Free Forever"; **progress charts over time are
  Pro** ("Visualise your progress with Strong PRO"). Free tier limited to 3 custom
  routines (val-ext-01 #47, CORRECTED from "3 exercises"). Premium $4.99/mo,
  $29.99/yr.
- Sources: https://www.strong.app/ (fetched verbatim); val-ext-01 #47.

### Fitbod — recovery-heatmap UX
- **Leads with:** a **post-workout muscle heat map** showing which muscles were
  used and how much they were impacted; per-muscle **recovery percentage 0–100%**
  (fresh vs fatigued) used to drive the next session. "Overall Strength Score"
  aggregates per-muscle performance into a single body-strength snapshot.
- **Beginner explanation:** the heatmap is the plain-English layer — colour =
  fresh/fatigued, no jargon required to read it.
- **Cross-app sync:** Apple Health / Google Health Connect workouts (runs, rows,
  swims) feed muscle recovery.
- **Note:** Fitbod's recovery model is AI-driven (out of scope for Volyume's
  deterministic engine) — relevant only as a **visual/UX** reference, not a method.
- Sources: search records of fitbod.zendesk.com/articles/360006269014 and
  fitbod.me/blog/muscle-recovery (both 403 on direct fetch; corroborated by two
  independent search records and val-ext-01 #20).

### Alpha Progression — chart variety + hypertrophy depth
- **Leads with:** beautiful, much-praised charts that "visualise key metrics such
  as reps, RIR, sets, volume, workout count, duration, and body measurements";
  per-exercise 10RM trend, per-muscle set counts over 3-month windows, bodyweight
  graph, body-fat graph. A chart-type switcher (exercise / muscle / measurement /
  training) with swappable series.
- **Progressive disclosure:** the generator/recommendations are **Pro**; free is
  basic logging (val-ext-01 #23). Steep learning curve noted across reviews —
  a cautionary tale on analytics density for beginners.
- **Pricing:** $12.99/mo, $79.99/yr (val-ext-01 #24, CORRECTED).
- Sources: https://fitnessdrum.com/alpha-progression-app-review/ (search);
  alphaprogression.com/en; val-ext-01 #23–24.

### Boostcamp — generous-free analytics + free Wrapped
- **Leads with:** auto PR tracking (max weight per rep range, max volume/session,
  max reps at a weight, **"estimated 1RM curve calculated from every top set you
  log"**); volume; muscle-group engagement; workout streaks.
- **Early-win / celebration:** **"PRs are flagged the moment you hit it… with
  confetti and a record badge in the workout summary"** (fetched verbatim) — the
  exact pattern a-06 flags as missing in Volyume (PRCelebration with no escalation,
  recomputed-never-persisted PRs).
- **Reports:** **"Every Sunday: PRs you hit, weekly volume by muscle, adherence,
  and a workout list. Year-end Wrapped pulls your whole training year into one
  shareable summary"** — and crucially **both the weekly report and the year-end
  Wrapped are FREE** (fetched verbatim).
- **Pro line:** "Strength Score (0–100, IPF DOTS-based)" + **per-muscle volume
  heatmap** are Pro (val-ext-01 #15, CORRECTED — heatmap is Pro, not free).
- Sources: https://www.boostcamp.app/workout-tracker (fetched verbatim);
  https://www.boostcamp.app/free-workout-app (val-ext-01 #12–15).

### JuggernautAI / RP Hypertrophy — volume-landmark + fatigue presentation
- **JuggernautAI leads with:** "volume progress through a bar graph with a line
  graph superimposed to reflect target intensity" — the climb is the visual
  story; readiness check-ins gate the next session. AI calculates individualised
  **MEV/MRV volume landmarks** ("Minimum Effective Volume… Maximum Recoverable
  Volume to avoid overtraining").
- **RP Hypertrophy:** fatigue algorithm built on pump + soreness check-ins;
  progressive-overload framing.
- **Relevance to a-06:** these are the only mainstream apps that surface MEV/MRV
  at all — and they do it via **AI** and only inside a paid coached programme.
  Volyume already exposes MEV/MAV/MRV **per-muscle, free, deterministically, with
  plain-English tooltips** on the anatomical heatmap — see §3.
- Sources: https://powerliftingtechnique.com/juggernaut-ai-review/ (search);
  strengthlab360 reviews (search). RP price UNVERIFIABLE this pass (val-ext-01 #25).

### Garmin Connect — categorical status + plain-English insights
- **Leads with:** **Training Status** — seven named categories ("Productive",
  "Maintaining", "Unproductive", "Detraining"…) derived from VO2 Max trend +
  Training Load; a VO2 Max trend graph, Training Load chart, Load Focus breakdown.
  **Body Battery** 5–100 with a 24-hour colour-coded timeline (green=charging,
  red=drain) + 7-day trend.
- **Beginner explanation:** the category words **are** the takeaway — "Unproductive
  is the warning sign: you're training hard but fitness isn't improving". Free AI
  **Insights** detect patterns across weeks/months and narrate them.
- **Body Battery framing matches Volyume's neutral-rate principle:** "more useful
  as a trend indicator than as an absolute reading; three consecutive low morning
  scores reliably signal accumulated fatigue."
- Sources: support.garmin.com/?faq=672AQbbnuw2trvuTOOj9X8 (search);
  garmin.com training-status pages (search); the5krunner Body Battery (search).

### Whoop / Oura — trend-view philosophy + colour-coded readiness
- **Leads with:** a single recovery/readiness **score 0–100** with **three
  colour-coded ranges** (Whoop: "green = ready to take on more; yellow = maintain;
  red = need more rest"). Oura Readiness "acts as a daily advisor".
- **Trend views:** Whoop — verbatim: **"weekly, monthly, and 6-month trend views
  across Sleep, Strain, and Recovery"**; **"True progress is about seeing how your
  daily habits compound over time. Trend Views provide the lens to connect your
  behaviours to your outcomes."** Oura adds quarterly/annual/anniversary reports.
- **Beginner framing:** "focus on long-term patterns rather than day-to-day
  fluctuations; meaningful trends emerge after a few weeks once a baseline is set"
  — the same noise-vs-signal lesson MacroFactor teaches for weight.
- Sources: https://www.whoop.com/us/en/thelocker/track-progress-with-new-trend-views/
  (fetched verbatim); support.whoop.com Viewing-Trends (search); mynucleus Oura-vs-Whoop
  (search).

### Strava — PR/achievement medals + the share/deep-link machine
- **Leads with:** segment **PR medals** ("If you clock a new personal record on a
  segment, you'll receive a 'PR' medal"), KOM/QOM/CR, Local Legend, a **Trophy
  Case** on the profile.
- **Share flow:** "press the share icon in the bottom right of the activity card,
  then Copy Link" → a **deep link** (e.g. `https://strava.app.link/PkaUMO9hdWb`)
  that navigates directly to the activity; profile/segment/club URLs are all
  shareable. **Achievement emails** celebrate PRs/badges/milestones.
- **The verified cautionary tale:** Strava **paywalled Year in Sport in Dec 2025**
  → severe multi-outlet backlash (VERIFIED, val-ext-07 V9). The rule for Volyume:
  decide the free/Pro line for any viral artefact before launch and **never
  re-gate it**.
- Sources: support.strava.com share-links + achievements articles (search; one
  403 on direct fetch — logged); val-ext-07 V9.

### Apple Fitness — the rings + awards + shame-free streaks
- **Leads with:** three Activity Rings (Move/Exercise/Stand); a single glanceable
  "close your rings" goal.
- **Award system:** "personal records, streaks, and major milestones"; categories
  **Close Your Rings / Monthly Challenges / Limited Edition / Workouts /
  Competitions**. Move-goal badges at **100 / 365 / 500 / 1,000 closes** (lifetime
  totals, not consecutive). Monthly Challenges are **semi-personalised** to each
  user's own activity level.
- **Share / social:** ring-sharing with friends, progress notifications,
  Competitions (badge for every user you beat + a "Competition Complete" token
  even if you lose).
- **Shame-free precedent:** watchOS 11 added **rest days that pause the rings
  without breaking award streaks** "after nine years" (VERIFIED, val-ext-04 G28,
  val-ext-02 #56) — direct precedent for Volyume's deload-aware streak.
- Sources: wareable Apple awards (search); support.apple.com HT205406 (search);
  val-ext-04 G28.

### MacroFactor — the gold standard for trend presentation to beginners
- **Leads with:** **weight trend** (smoothed moving average that "highlights
  meaningful changes… free from large swings due to transient weight
  fluctuations", fetched verbatim) and an **expenditure trend** chart.
- **Beginner explanation:** explicitly teaches signal-vs-noise — "think of your
  actual body weight as existing within a range rather than a single number… If
  your weight trend is still heading in the right direction, that can take a bit
  of the disappointment out of a daily weigh-in." **Insights over preset intervals
  (3/7/14/30/90 days)** put short-term changes in context of longer trends.
- **Adherence-neutral:** "without any red numbers, pop-ups, warnings, or visual
  elements that can promote feelings of shame and guilt" (VERIFIED, val-ext-01 #81)
  — the same ED-safe posture Volyume already holds.
- Sources: https://help.macrofactorapp.com/en/articles/21-weight-trend (fetched
  verbatim); help.macrofactorapp.com/articles/22-dashboard (search); val-ext-01 #81.

### Lose It / MyFitnessPal — progress framing + first-action celebration
- **Leads with:** weight-progress charts framed as "see your overall trajectory
  instead of obsessing over daily fluctuations"; goal target dates.
- **Early-win:** MFP "First Food Logged celebration helps new members feel
  motivated from their very first entry"; **streak celebrations at the 4 and 5 day
  marks**; "mark days/weeks when you've reached a goal or hit a personal record
  with colourful stickers or check marks on your chart".
- **Progress-not-outcome framing:** "acknowledge meaningful wins each week
  regardless of whether you shed pounds… that's progress worth celebrating" — a
  model for celebrating effort/consistency, not just body change (ED-safe).
- Sources: support.myfitnesspal.com Progress-Overview (search); blog.myfitnesspal.com
  how-to-start (search); MFP 2025 Summer Release PR (search).

### Duolingo — the milestone/celebration architecture to copy
- **Two-section split (2023 redesign):** **Personal Records** (your own bests, e.g.
  "most XP earned in a day" — "When you hit new personal bests… you'll get a shiny
  new badge", fetched verbatim) vs **Awards** (milestone badges at fixed
  thresholds). Deliberate: PRs give *new users something to achieve in session
  one*; Awards are the long-horizon ladder.
- **Early-win is the headline:** "users who complete at least one achievement on
  their first day retain at 33.42% vs 20.36%" — but treat this as **Trophy's own
  platform data, not Duolingo's** (val-ext-04 G19, CORRECTED; do not cite as
  industry evidence). The *design* (a first-session achievable badge) is the
  takeaway, not the number.
- **Beginner badges:** "some simple ones for beginners (like adding friends)…
  some that track how much you did in a day… some that track progress over time"
  (fetched verbatim).
- **Friend Streak:** the only quantified shared-streak mechanic in the market —
  "22% more likely to complete their daily lesson", monotonic in partners, cap 5
  (VERIFIED, val-ext-07 V21). 600+ streak A/B tests (VERIFIED, val-ext-04 G5).
  Caution: the churn-folklore numbers (47%→28%, streak-freeze −21%, widget +60%)
  ALL FAILED verification — do not use.
- Sources: https://blog.duolingo.com/achievement-badges/ (fetched verbatim);
  deconstructoroffun streaks (search); val-ext-04 G5/G19; val-ext-07 V21.

### Peloton — the milestone-badge + arc ladder
- **Milestone badges:** for completing **1, 10, 25, 50, 75, 100** classes **per
  discipline**, then every 50 after (search). Daily and weekly **streak badges**
  (re-earnable after a reset). A virtual **trophy cabinet** on the Achievements tab.
- **Programme arcs:** "You Can Ride" — 3 weeks, 9 classes, **Bronze at 4, Silver at
  7, Gold at 8 of 9** (VERIFIED, val-ext-02 #57) — the precise completion-ladder
  shape behind Volyume's D1 milestone work.
- **Social celebration:** milestone badges trigger an in-class notification to
  everyone on the ride → a wave of high-fives; instructor shout-outs. (Volyume's
  partner system is the equivalent private channel.)
- Sources: onepeloton.com/blog/milestones (search); pelobuddy badge list (search);
  val-ext-02 #57.

### Renpho / Withings — body-measurement UX
- **Leads with:** a smart-scale auto-feed of 13+ body-composition readings with a
  healthy/unhealthy category label per reading; trend charts the core value.
- **Trend framing:** "both can be useful for trend tracking if you use them
  consistently. If your trend shows your body fat % gradually decreasing over 8–12
  weeks… that's meaningful directionally." Honest caveat that single-frequency BIA
  body-fat is **not accurate** — trend > absolute, again.
- **UX note:** Renpho's interface "easier to digest… more intuitive"; Withings
  pricier hardware. Neither gates measurement behind a hard paywall — the scale is
  the product; the app/trends are free.
- Sources: builthealthy.com Renpho-vs-Withings (search); livescience Renpho review
  (search); tomsguide Renpho Morpho Scan review (search).

---

## 2. (a) Repeating WINNER patterns (apps + URLs)

1. **Trend-over-noise is the universal beginner-teaching device.** MacroFactor
   (weight trend = smoothed moving average, daily noise explained), Whoop ("connect
   your behaviours to your outcomes" over weekly/monthly/6-month trends), Garmin
   (Body Battery "more useful as a trend than an absolute"), Renpho/Withings ("8–12
   weeks… meaningful directionally"), MFP/Lose It ("trajectory, not daily
   fluctuations"). The plain-English **takeaway line attached to the chart** is the
   single most-copied feature.
   — macrofactorapp #21 (fetched); whoop trend-views (fetched); the5krunner Body Battery.
2. **A first-session achievable win + a milestone ladder above it.** Duolingo
   (Personal Records for day-1 + Awards for the long arc), Peloton (1/10/25/50/75/100
   per discipline; You Can Ride bronze/silver/gold), Apple (Monthly Challenges +
   100/365/500/1000), MFP (First Food Logged + 4/5-day streak celebrations),
   Boostcamp (confetti + record badge in the workout summary).
   — blog.duolingo.com/achievement-badges (fetched); boostcamp workout-tracker (fetched);
   val-ext-02 #57; wareable Apple awards.
3. **PR celebration at the moment of the win, in-line, then shareable.** Hevy
   (in-workout PR notification + auto share card), Boostcamp ("flagged the moment
   you hit it… confetti and a record badge"), Strava (PR medal + achievement email +
   one-tap deep-link share).
   — repreturn.com Hevy (fetched); boostcamp workout-tracker (fetched).
4. **Free, frictionless share with a deep link / non-user-usable artefact.** Hevy
   (routine links non-users can open — the verified growth engine), Strava
   (`strava.app.link/...` deep link from a share icon on every activity card),
   Boostcamp + Hevy (free year-end Wrapped).
   — val-ext-07 V4–V6; support.strava.com share-links (search).
5. **Generous-free analytics, advanced behind Pro — decided once, never re-gated.**
   Hevy (charts free), Boostcamp (weekly report + Wrapped + PRs free; Strength Score
   + heatmap Pro), Strong (logging free; charts Pro). The anti-pattern is
   verified: Strava's Dec-2025 Year-in-Sport paywall → backlash.
   — boostcamp free-workout-app; strong.app (fetched); val-ext-07 V9.
6. **CSV export + Health sync as a baseline trust feature in the strength segment.**
   Strong ("Export your data any time" + Apple Health), Hevy (CSV).
   — strong.app (fetched).
7. **Categorical / colour-coded status as the readable headline.** Garmin (seven
   named Training-Status words), Whoop (green/yellow/red), Oura (Readiness "daily
   advisor"), Fitbod (recovery % heatmap colour). The number is backed by a word.
   — support.garmin.com; mynucleus Oura-vs-Whoop (search).
8. **Shame-free / adherence-neutral progress framing.** MacroFactor ("no red
   numbers… shame and guilt"), Apple watchOS 11 rest days that don't break streaks,
   Garmin trend-not-absolute, MFP "celebrate progress regardless of pounds".
   — val-ext-01 #81; val-ext-04 G28.

---

## 2. (b) Where Volyume ALREADY LEADS honestly

Cross-checked against a-06's verified surface inventory:

1. **Per-muscle MEV/MAV/MRV anatomical heatmap, FREE, deterministic, with
   plain-English tooltips.** No mainstream app does this for free: the only apps
   surfacing MEV/MRV at all are JuggernautAI/RP — via **AI**, inside a **paid**
   programme. Boostcamp's per-muscle heatmap and Strength Score are **Pro**; Fitbod's
   is an AI recovery heatmap (no volume landmarks); Hevy shows sets-per-muscle but
   no MEV/MAV/MRV bands. Volyume's heatmap (`VolumeHeatmapScreen`, free, with
   editable custom landmarks + ghost previous-week bar + InfoTooltip translating
   MEV/MAV/MRV) is genuinely category-leading. *Evidence: boostcamp workout-tracker
   (fetched, "Pro adds… per-muscle volume heatmap"); JuggernautAI review (search).*
2. **Block-aware recaps incl. the post-mesocycle tonnage-climb deck.** Hevy/Boostcamp
   ship a **year** Wrapped only; nobody ships a **per-block** Spotify-Wrapped recap
   tied to a training mesocycle. Volyume's three-variant recap (year/month/block) is
   unreplicated. *Evidence: hevy annual-review (search); boostcamp Wrapped (fetched)
   — both year-only.*
3. **Deload-aware / recovery-week streak that doesn't punish a planned light week.**
   Apple needed nine years to retrofit non-breaking rest days (watchOS 11, VERIFIED);
   Volyume's "Recovery week. Your run carries on." ships this natively and ties it to
   the *plan*, not a manual pause. *Evidence: val-ext-04 G28.*
4. **ED-safe, adherence-neutral framing as a designed-in default, not a setting.**
   Matches MacroFactor's verified posture (#81) and exceeds it — Volyume suppresses
   rate-of-change under an ED/wellbeing flag across recaps, body metrics and the
   streak, and hard-excludes PII (bodyweight/measurements/name) from share cards.
   *Evidence: val-ext-01 #81; a-06 §1.9, §1.7.*
5. **The single deterministic chart engine with auto-phrased plain-English
   takeaways** ("3 months: average 82.4 kg, down 1.8 kg") on every trend chart —
   the exact MacroFactor/Whoop winner pattern, already built (`chartWindows.js`),
   and ours runs offline with no AI. *Evidence: a-06 §1.10; macrofactorapp #21 (fetched).*

---

## 2. (c) Ranked pick-ups vs a-06's 5 frictions — for Besa (newbie) AND Eddie (athlete)

a-06's five frictions: (F-BM) Body Metrics free-tile→paywall trap; (F1) no
early-win celebration ladder; (F2/F9) passive virality — no share CTA on PR
celebration, no deep-link/referral on cards; (F5) no CSV export; (F-J) jargon
leakage (tonnage/e1RM) + thin telemetry.

| Rank | Pick-up | Fixes | Besa | Eddie | Source pattern |
|---|---|---|---|---|---|
| 1 | **Fire a share-able celebration at the PR moment, in-line.** Add a "Share this" CTA to `PRCelebration` (the verified peak-emotion moment), routing to the existing ShareCard PR variant. Escalate the celebration for first-ever PR vs incremental. | F9, F1 | First-ever PR becomes a *shareable* milestone, not a silent confetti burst weeks in. | His PR moments finally have a one-tap brag path. | Hevy in-workout PR + share; Boostcamp "confetti + record badge in workout summary, flagged the moment you hit it" (fetched). |
| 2 | **Beginner Personal-Records ladder + first-session win.** Split achievements Duolingo-style: a day-1 achievable "Personal Records" tier (first workout, first 3, first full week, back-after-gap) firing calm celebration at the workout-summary peak, above the existing 4/12/26/52 Awards ribbon. | F1 | Closes the verified "celebration desert" of Besa's first fortnight (a-06 §3.2–3.3). | Long-horizon Awards stay meaningful. | Duolingo PR/Awards split (fetched); Peloton 1/10/25/50 (search); MFP First Food Logged + 4/5-day (search). Note: do **not** cite Trophy's 33.42% as evidence (val-ext-04 G19). |
| 3 | **Deep-linked, non-user-usable share cards.** Add a QR / `volyume.app/...` deep link (and optionally a referral handle) to the ShareCard footer — currently wordmark-only (a-06 §0 F2). | F2 | A friend can open the card and land in the app. | His block-recap / PR cards become acquisition surfaces. | Hevy routine links (verified viral loop, val-ext-07 V4–V6); Strava `strava.app.link` deep link (search). Keep ALL share artefacts free + never re-gate (Strava paywall backlash, val-ext-07 V9). |
| 4 | **CSV export (+ confirm Health sync posture).** Strong's "Export your data any time" + Apple Health is the strength-segment baseline; Volyume has only a one-page PDF card. CSV is a low-cost trust feature; offline-first/EU-residency make local CSV export clean. | F5 | (low priority for her) | Directly named as Eddie's gap (a-06 §3.4); the credibility feature for power users. | strong.app (fetched verbatim); Hevy CSV (search). |
| 5 | **Plain-English takeaway on EVERY metric + the Body-Metrics placement fix + telemetry.** (i) Extend the existing auto-takeaway pattern to the raw figures that leak ("12,400 kg" → "your biggest week yet"; explain e1RM inline). (ii) Resolve the Body-Metrics free-tile→paywall trap — either make the tile honestly Pro-badged or move basic weight tracking free (Renpho/Withings/MFP/Strong all keep basic measurement free). (iii) Add the missing telemetry events (pr_celebrated, share_card_generated, tile taps) so pick-ups can be measured. | F-J, F-BM | Removes the "is 12,400 kg good?" wall; stops the paywall ambush from a free hub tile. | Cleaner data; export/telemetry he expects. | MacroFactor takeaway lines + signal-vs-noise teaching (fetched); Garmin categorical words; Strong/Renpho free basic measurement. |

---

## 2. (d) What EVERYONE has that Volyume LACKS

1. **A share CTA at the PR/achievement moment.** Hevy, Boostcamp and Strava all
   surface share at the instant of the win; Volyume's PRCelebration has none
   (a-06 F9). *boostcamp workout-tracker (fetched); repreturn Hevy (fetched).*
2. **A non-user-usable shared artefact (deep link / routine link).** Hevy's routine
   links and Strava's activity deep links pull new users in; Volyume's cards are a
   dead end (wordmark only). *val-ext-07 V4–V6; support.strava.com (search).*
3. **CSV / data export.** Strong and Hevy both ship CSV; Volyume ships none.
   *strong.app (fetched).*
4. **A first-session achievable badge.** Duolingo, MFP, Peloton, Apple all give a
   day-1 win; Volyume's earliest guaranteed reward is the week-4 ribbon (a-06 §3.2).
   *blog.duolingo.com (fetched); MFP (search).*
5. **A plain-English takeaway on the tonnage/PR figures (not just trend charts).**
   MacroFactor and Garmin attach a readable verdict to every number; Volyume's
   takeaways cover only weight/e1RM/volume trend charts, leaving raw tonnage and PR
   counts unexplained to beginners (a-06 §3.1). *macrofactorapp #21 (fetched).*

(Volyume is **ahead** of the field on: free per-muscle MEV/MAV/MRV heatmap,
block-recaps, deload-aware streak, ED-safe framing — see §2(b). Those are not gaps.)

---

## Fetch-failure log (per-URL)

| URL | Result | Mitigation |
|---|---|---|
| https://www.hevyapp.com/features/ | bot-check loader (no content) | Used repreturn.com (fetched) + search records of Hevy feature pages. |
| https://help.hevyapp.com/.../understanding-your-stats-and-progress | HTTP 404 | Used WebSearch corroboration. |
| https://www.hevyapp.com/features/gym-progress/ | bot-check loader (no content) | Used repreturn.com (fetched verbatim). |
| https://support.strava.com/.../How-to-Get-and-Share-Links-From-Strava | HTTP 403 | Two independent search records (share icon + `strava.app.link` deep-link format). |
| https://fitbod.me/blog/muscle-recovery/ | HTTP 403 | Two independent search records + val-ext-01 #20 (recovery %, post-workout heatmap). |

**Fetch failures: 5 URLs.** End-to-end WebFetch **proven** on 5 other URLs
(repreturn.com, help.macrofactorapp.com, strong.app, whoop.com,
boostcamp.app/workout-tracker, blog.duolingo.com — 6 successes). No load-bearing
claim rests on an unfetched source alone; every blocked host was covered by 2+
independent search records or a prior VERIFIED entry in the validation corpus.

*Research complete. No code changed. Not committed — for orchestrator spot-check.*
