# impl-COMP-005 — Free Monthly Recap + Block-end Recap

> Blueprint for the approved action COMP-005 (priority 3.6, effort 2.5):
> "Free Monthly Recap + block-end recap — story format via the existing
> Year-of-Lifts renderer + ShareCard pipeline; unlocks after ~10 workouts;
> free forever." (`../competitive-audit-04-final-action-list.md`, row 9.)
>
> Code verified on branch `claude/main-branch-content-update-dcqicf`:
> `YearOfLiftsScreen.js`, `ShareCardScreen.js`, `AnalyticsScreen.js`,
> `BlockReflectionScreen.js`, `database.js` (`getYearOfLiftsData`,
> `getBlockReflectionData`, `getCurrentMesocycleWeek`),
> `notifications/scheduler.js`, `lib/wellbeing.js`,
> `lib/telemetry/events.js`.

---

## 1. Best-in-market bar

**Spotify Wrapped — the gold standard.** 200M engaged users within ~62
hours in 2024 and ~500M shares (+41% YoY, including screenshots)
([Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase/),
[Variety](https://variety.com/2025/music/news/spotify-wrapped-breaks-own-record-250-million-engagements-1236603493/)).
Why it works emotionally: it weaves disparate data into a personal
narrative (narrative bias), quantifies identity ("you're in the top X%"),
and is engineered for impression management — Hootsuite found 40% share it
to show off their taste, 35% to connect with others
([Irrational Labs](https://irrationallabs.com/blog/spotify-wrapped-behavioral-science/),
[Choice Hacking](https://www.choicehacking.com/2023/11/27/how-spotify-used-psychology/)).
The tap-through story format is the load-bearing UX decision — our own
`YearOfLiftsScreen.js` header comment already records this: "Spotify
Wrapped proved that the swipe-story is the format people actually read."

**Strava Year in Sport — the emotional ceiling, and the cautionary tale.**
For years the athletic cousin of Wrapped: a free, shared year-closing
ritual. Then Strava put it behind the ~$80 subscription and triggered a
category-famous backlash — users called it "paying to view data you
provided", and commentators noted Strava had monetised its own best
organic marketing channel
([road.cc](https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425),
[Medium — "Paywalling Emotion"](https://medium.com/@airbrush.ar/paywalling-emotion-how-strava-turned-a-shared-sports-celebration-into-a-premium-product-bcd11161219d)).

**Hevy Monthly Report — the direct competitor benchmark.** Free on every
tier: completed workouts, training time, sets, volume, muscle
distribution, PR list, most-logged exercises; the previous month's report
is available through the following month. Year in Review requires ≥10
logged workouts and is also free
([Hevy Monthly Report](https://www.hevyapp.com/features/monthly-report/),
[Hevy Year in Review](https://www.hevyapp.com/features/year-in-review/)).
This is where our "~10 workouts, free forever" spec numbers come from.
Hevy's weakness: it's a static report page, not a story — informative,
not emotional, and not built to be shared.

**Garmin Connect Rundown — the second cautionary tale.** Garmin paywalled
its Wrapped-style "Rundown" behind Connect+ in late 2025 and met the same
wave of anger; critics again made the Spotify comparison: recaps are
organic advertising, charging for them forfeits the viral loop
([TechRadar](https://www.techradar.com/health-fitness/garmin-attempts-to-drive-more-connect-signups-by-paywalling-its-spotify-wrapped-style-garmin-connect-rundown),
[NotebookCheck](https://www.notebookcheck.net/Garmin-locks-year-in-review-behind-subscription-paywall-users-react-angrily.1177473.0.html)).

**Whoop Monthly Performance Assessment — the monthly-cadence proof.**
Whoop's MPA shows a monthly insight ritual sustains engagement between
annual moments; its community asks for *more* cadence options, not fewer
([Whoop MPA](https://www.whoop.com/eu/en/thelocker/monthly-performance-assessment/),
[Whoop community](https://www.community.whoop.com/t/mpa-monthly-performance-assessment/4309)).
Its weakness: dense, analytic, unshareable — a report, not a moment.

**The single best for this context:** Spotify Wrapped's *format* at Hevy's
*cadence and price* (monthly, free, low unlock bar). No fitness app
currently combines the two; Hevy has the cadence without the story,
Strava has the story without the cadence or the price.

## 2. What fails

- **Paywalled emotion** — Strava and Garmin both proved (with near
  identical backlash arcs) that gating a recap reads as "a breach of an
  unspoken social contract" and converts goodwill into churn-grade anger.
  Round 1 already named feature re-gating the category's cardinal sin.
  COMP-005 is free forever; this is non-negotiable in the spec.
- **Yearly-only timing** — Volyume's current state is the anti-pattern:
  Year of Lifts unlocks after **365 days** (`AnalyticsScreen.js:172-203`,
  `scheduler.js checkYearOfLiftsUnlock`), shown as a dimmed locked tile
  with a day countdown. A new user's first emotional payoff is a year
  away; most will churn before ever seeing it. One payoff per year also
  means one shot at the share loop per user per year.
- **Generic stats nobody cares about** — Whoop-style dense reporting and
  Hevy's static page show numbers without narrative. A recap that says
  "42,180 kg" without "that's up 12% on May" is a spreadsheet, not a
  story. Anti-pattern: *every slide must carry one number plus one line
  of meaning*, and empty slides must be dropped (the YoL `buildCards`
  filter already does this — keep it).
- **Recap as marketing, not insight** — recaps that end on an upsell
  poison the moment. The outro never sells Pro. The brand earns its
  exposure on the *shared card* (ShareCard's branded footer), not inside
  the user's own moment.
- **Stretched decks for thin months** — a 2-session month must produce a
  short, honest 3-card story ("2 sessions. They still count."), not 8
  cards of zeroes. The existing filter-at-build-time pattern handles
  this; the monthly variant needs a minimum-content rule (below).
- **Shame framing** — a down month must never read as failure (no red,
  no "only", no comparisons that can wound). COMP-027 Class C already
  binds recaps to on-track-or-neutral colours; copy follows the same
  rule.

## 3. User psychology

- **Moment of need:** "what did all that work add up to?" — asked at a
  period boundary, never mid-session. Two natural boundaries exist:
  the calendar month flip and the block end. The block end is the
  stronger one because the user *built* that boundary themselves — it's
  the deterministic coach's own finish line.
- **Habit loop:** cue = "Your June recap is ready" notification or the
  Progress-tab recap card; action = 60 seconds of tapping through;
  reward = a narrative of their own effort with a one-tap share. The
  reward is visible within seconds (first stat card is one tap in).
- **Effort budget:** zero data entry. The recap is the purest example of
  the app *giving back* — every number is already logged. Reading cost:
  6–8 cards, one number each, ~45 seconds.
- **The shareable/tellable moment:** people screenshot **a single big
  number attached to identity** ("48,200 kg in June") and **rankings of
  themselves** (top lifts, PRs) — exactly what Wrapped research shows
  drives the 500M shares: identity signalling plus quantified comparison
  ([Psychologs](https://www.psychologs.com/the-psychology-behind-your-spotify-wrapped/),
  [UVA Today](https://news.virginia.edu/content/why-spotify-wrapped-turns-your-music-habits-social-event)).
  The hero share asset is therefore the milestone card (one hero number +
  three support stats), not the whole deck.
- **The narrative arc:** intro (framing) → effort (sessions/volume) →
  consistency (streak) → quality (top lifts/PRs) → close (forward-looking
  outro). Arc, not list: each card should feel like it follows from the
  last.
- **Why recaps drive word of mouth:** the share card is the app's
  branding on someone else's feed, posted *voluntarily, with pride* — the
  only ad format with built-in social proof. Sharing also deepens the
  sharer's own commitment (public commitment effect), feeding retention.
  Social/sharing features correlate with ~30% retention lift in fitness
  apps ([Lucid](https://www.lucid.now/blog/retention-metrics-for-fitness-apps-industry-insights/) —
  directional industry figure, search-extract evidence).
- **Emotional safety:** Class C surface (COMP-027): achievements in
  on-track colour, everything else neutral; never red; rest-positive
  captions; wellbeing-flag behaviour in §4.6.

## 4. The Volyume implementation

### 4.1 Placement — Progress tab, one tile, one ephemeral card

**The Explore tile (permanent home).** The existing "Year of Lifts" tile
in the Progress Explore grid (`AnalyticsScreen.js:167-203`) becomes
**"Recaps"**. It retires the 365-day locked state — the single worst
placement fact in the current app (a tile most users see dimmed for a
year). New behaviour:

- ≥10 lifetime completed workouts → opens the most recent **monthly
  recap story** directly (last completed calendar month; during the
  user's first month after unlock, the current month-to-date).
- <10 workouts → same locked-tile pattern, but the countdown is now
  reachable in a week or two: "4 sessions to go", and the inline
  explainer says "Your first monthly recap unlocks after 10 logged
  sessions."
- The story's **outro card** carries the archive: rows for previous
  months, the latest block recap, and Year of Lifts (which keeps its
  365-day unlock as the annual crown — its existing notification and
  data path are untouched). No new list screen; the outro is the index.

**The ephemeral recap card (the trigger).** For the first 7 days of each
month, a one-line card appears at the top of the Progress insight stack:
"Your June recap is ready · 45 seconds" → opens the story. Dismissable;
disappears on its own after day 7 or after first open. This follows the
COMP-018 pattern (Progress is the reflection surface; Home keeps its
"one big thing" hierarchy per COMP-027 — nothing lands on Home or the
session screen).

**Block-end recap (the in-flow moment).** When the workout just completed
is in the final planned week of the active mesocycle
(`getCurrentMesocycleWeek` already returns `weekIndex` and
`plannedWeeks`), **WorkoutSummaryScreen** shows one extra row: "Block
complete — watch your block story". Tapping plays the block story; its
outro links to the existing **BlockReflectionScreen** ("Full block
summary") for the analytic detail and the "Start a new block" CTA. The
MesocycleBuilder's existing "View summary" button
(`MesocycleBuilderScreen.js:239`) keeps navigating to BlockReflection,
which gains a "Play story" header button. No push notification needed:
the user is *in the app* at the exact moment the block ends.

### 4.2 Trigger and notification

One local one-shot notification per month, laid the same way
`checkYearOfLiftsUnlock` is (idempotent AsyncStorage key, quiet-hours
shifted, `notification_sent` telemetry):

- Fires on the 1st of the month at 10:00 local (shifted out of quiet
  hours via the existing `shiftDateOutOfQuietHours`), key
  `@volyume_recap_notified_<YYYY-MM>`.
- Conditions: ≥10 lifetime completed workouts AND ≥1 completed session
  in the month being recapped. A zero-session month gets **no
  notification and no recap card** — silence, not shame.
- Copy (house voice, warm like the morning-weight pool):
  title "Your June recap is ready", body "45 seconds of what you put in
  last month. Have a look when you fancy."
- Tap deep-links to the monthly story (`data: { type: 'monthly_recap' }`,
  handled like `year_of_lifts_unlock`).

**Month vs block — which wins?** Block-end needs no notification (it
surfaces in-flow on WorkoutSummary), so the only true collision is the
*Progress card*: if a block completed within the last 7 days, the
block-recap row in the outro is promoted and the monthly card copy
acknowledges it ("Your June recap is ready — and your block story is
inside"). Rule: **never more than one recap notification per month, and
it is always the monthly one.** Block-end is event-driven and in-app;
calendar-driven pushes stay predictable.

### 4.3 Monthly story — slide sequence (max 8, empty slides dropped)

Reuses the YoL card types (`intro`/`stat`/`list`/`outro`) verbatim:

1. **Intro** — "June, lifted." / "1 June to 30 June 2026" (tone: gold).
2. **Sessions** — hero number + month-vs-month caption: "13 sessions.
   Two more than May." (delta caption only when previous month has data;
   never negative-framed: a down month reads "11 sessions logged.").
3. **Volume** — "48,200 kg moved" / "Up 12% on May." or neutral "Every
   set, stacked end to end."
4. **Consistency (COMP-018 slide)** — the streak module's week objects:
   "17 of 18 planned sessions · 14 weeks running". In a milestone month
   (4/12/26/52 weeks) this becomes the dedicated milestone slide per the
   COMP-018 blueprint. Consumes COMP-018's computed objects; no second
   computation.
5. **Top lifts** — list card, most-trained exercises this month.
6. **PRs** — list card, best estimated-1RM lifts set this month (only if
   any; the build-time filter drops it otherwise).
7. **Best session** — single highlight: date + volume ("Your biggest
   session: 14 June, 6,840 kg.").
8. **Outro** — "July's open. Same bar, new month." + share button + the
   archive rows (§4.1).

Minimum-content rule: if fewer than 3 content cards survive the filter,
the deck renders as intro + sessions + outro and the captions soften
("2 sessions logged. They count.").

### 4.4 Block story — slide sequence (3–5)

What block-end adds that monthly can't: **arc and authorship**. A month
is a calendar accident; a block is a plan the user committed to and the
deterministic coach steered. Slides, built from `getBlockReflectionData`
(all fields already computed):

1. **Intro** — block name + shape: "Hypertrophy Block One" / "6 weeks ·
   3 March to 13 April".
2. **The climb** — `tonnageDelta` as the hero: "+18% weekly volume,
   first week to last." Deload-ending blocks get the rest-positive line
   the screen already uses ("Final week was lighter. That's the plan
   working."). This slide is the unreplicable one — competitors have no
   blocks.
3. **PRs set this block** — list card (drop if none).
4. **The totals** — sessions / sets / tonnage as one stat card with
   three support figures.
5. **Outro** — "Block banked. Recover, then go again." + share + "Full
   block summary" link → BlockReflectionScreen.

### 4.5 ShareCard integration

Identical to the existing `handleShareYear` path
(`YearOfLiftsScreen.js:244-266`): navigate to `ShareCard` with
`milestoneData` — the milestone canvas renderer
(`drawMilestone`, `ShareCardScreen.js:603`) already handles eyebrow /
title / hero / caption / up-to-3 stats in both 1080×1920 story and
1080×1080 square. Monthly card: eyebrow "MONTHLY RECAP", title "June
2026", hero = sessions, stats = kg lifted / sets / PRs. Block card:
eyebrow "BLOCK COMPLETE", title = block name, hero = sessions, stats =
kg / sets / weeks. The existing privacy line holds: "Name, bodyweight,
measurements and private notes are never included." Zero canvas work
needed.

### 4.6 ED / wellbeing flag handling

The recap is **training-performance only by design** in both variants:
no bodyweight, no calories, no measurements, no body data slides exist
to suppress — this is the structural safety property. The remaining
behaviour under `wellbeing mode = 'calm'` (`lib/wellbeing.js`) or an
open ED pattern flag:

- The COMP-018 consistency slide degrades exactly per its own spec
  (§4.5 of impl-COMP-018): factual sessions count, no run number, no
  milestone slide.
- Month-vs-month delta captions go neutral-factual (no "up/down on
  May"; just the number) — comparison pressure is the calm-mode risk,
  not the training data itself.
- The recap notification still fires (it celebrates training, which the
  safety system encourages) but with the neutral body: "Last month's
  training, summed up. Have a look when you fancy."
- If COMP-004's trend line is ever added as a Pro slide later, it
  inherits COMP-004's own flag rule (hide rate when flag open). v1 ships
  with no trend slide, avoiding the question entirely.
- Evaluated at render time, matching COMP-018: no cached celebratory
  state survives a flag raise. The safety system itself is untouched.

### 4.7 Copy direction (house voice: plain, terse, honest, no hype)

- Notification: **"Your June recap is ready"** / "45 seconds of what you
  put in last month. Have a look when you fancy."
- Volume caption: **"48,200 kg. Up 12% on May."** (numerals the hero,
  one line of meaning, full stop.)
- Block outro: **"Block banked. Recover, then go again."**

No "crushed it", no exclamation marks, no MEV/RIR jargon, British
English throughout.

### 4.8 States, edge cases, offline

- **Offline:** fully functional — all queries are local SQLite; the
  story renders offline; sharing requires no network (local PNG +
  system share sheet). Notification is a local one-shot.
- **Timezone/month boundary:** month windows computed in local time,
  matching the app's UK-local week rule (`localWeekStartMs` precedent).
- **First month after unlock:** tile opens current month-to-date with
  the intro reading "June so far" — no dead state between unlock and the
  first month boundary.
- **Block abandoned (deactivated early):** no story trigger; the
  MesocycleBuilder "View summary" → BlockReflection path remains for
  whatever was logged.
- **Accessibility:** the story inherits YoL's tap-zone/pip/close
  semantics and accessibility labels; cards are static text (screen
  readers read value, unit, caption in order); 44pt floors already met
  by the existing components; Reduce Motion needs no work (no
  animations beyond paging).

## 5. Whole-package integration

- **COMP-018 (streak):** the recap consumes its per-week objects for
  slide 4 — explicitly promised in both blueprints ("the recap agent
  consumes the same per-week objects; no second computation",
  impl-COMP-018 §4/§5). The streak gains a monthly stage; the recap
  gains its consistency story for free.
- **YearOfLiftsScreen:** becomes the parameterised story renderer
  (§9). Year of Lifts itself is unchanged in cadence and remains the
  annual crown; the monthly recap is its feeder ritual, so the 365-day
  notification now lands on a user who has already had up to 12 smaller
  versions — anticipation instead of a cold unlock.
- **BlockReflectionScreen:** nothing removed. It stays the analytic
  deep-dive and "Start a new block" home; the story becomes its
  emotional front door. The two share `getBlockReflectionData` — one
  query, two presentations.
- **COMP-019 (charts):** when `VolyumeChart` lands, it becomes the
  renderer for an optional volume-by-week recap slide ("the takeaway
  line is the shareable sentence" — impl-COMP-019 §5). Not a v1
  dependency.
- **COMP-004 (trend):** its shared EWMA hook is the only sanctioned
  source if a Pro trend slide is ever added (impl-COMP-004 §5.4). v1:
  none.
- **NEW-002 (Training Partners):** shares the ShareCard export as its
  discovery path; the recap multiplies the export's frequency from
  per-session to per-month ritual, widening NEW-002's funnel.
- **COMP-027 (colour):** Class C — achievements on-track, everything
  else neutral, never red. Inherited, no new tokens.
- **COMP-029 (light theme):** story/export surfaces render dark-brand in
  v1 by that blueprint's explicit rule — no theming work.
- **Duplication avoided:** no new aggregate maths (generalise
  `getYearOfLiftsData`, reuse `getBlockReflectionData`); no new share
  canvas; no new list screen (outro is the archive); the Explore grid
  stays at five tiles (rename, not add).
- **Streamlining effect:** net new chrome = one ephemeral Progress card
  + one WorkoutSummary row. One tile's permanent locked state is
  *retired* — the app gets less dead UI, not more.
- **Free tier:** entirely free, forever, both variants — the Strava and
  Garmin case studies are the evidence file; gating this would also leak
  Pro pressure into the most goodwill-dense moment the app has.

## 6. Retention & word-of-mouth mechanics

This is the app's word-of-mouth engine, so the loop is designed end to
end:

- **The loop:** log sessions → month/block boundary → notification or
  Progress card → 45-second story (emotional payoff) → one-tap branded
  share card → friend sees Volyume's footer on a proud post → install →
  their own 10-workout unlock countdown begins. Every stage exists in
  code today except the boundary trigger.
- **Frequency:** 12+ payoffs per year instead of 1 — each is a
  re-engagement event for lapsing users (the notification reaches users
  who haven't opened the app in weeks, with their own data as the bait;
  this is the recap-as-winback property, complementing COMP-025).
- **Public commitment:** sharers self-bind ("everyone saw my June; July
  has to exist"). The outro's forward-looking line ("July's open.")
  primes the next cycle.
- **Streak reinforcement:** slide 4 makes the COMP-018 streak the thing
  users *retell* ("14 weeks running" is a sentence you say out loud at
  the gym) — the tellable moment for people who'd never post a story.
- **Maximisers:** (a) hero numbers chosen for identity value (sessions
  and tonnage, not minutes); (b) share affordance on the pips row of
  every slide, not just the outro (already the YoL pattern); (c) the
  block card's "no one else has this" framing — a *named, finished
  block* is intrinsically more tellable than a calendar month.

## 7. Beating the benchmark

Strava's Year in Sport is the category's emotional ceiling, and Strava
itself broke it — once a year, now paywalled, and built from data the
app merely recorded. Volyume's recap beats it on all three axes: **cadence**
(monthly + block-end means 12–18 payoffs a year, each a share-loop
spin, against Strava's one), **price** (free forever after 10 workouts,
inverting the move that earned Strava and Garmin their angriest press in
years), and **authorship** (the block recap narrates a plan the user and
the deterministic coach executed together — "+18% first week to last,
finished with a deload, exactly as planned" — a story no calendar-window
recap can tell because no competitor has blocks). It also beats Hevy,
the only free monthly incumbent, by being a story with an arc and a
share card rather than a static report page. Same renderer that already
ships, pointed at a better calendar.

## 8. Measurement

Two new allowlisted events (counts/flags only, no training content, per
the telemetry house rules in `src/lib/telemetry/events.js`):

1. **`recap_opened`** (payload: `variant` month|block|year,
   `card_count`) — target: ≥40% of eligible users open within 7 days of
   month end.
2. **`recap_shared`** (payload: `variant`, `format`) — share rate
   (shared/opened) ≥8% (Wrapped-class formats convert opens to shares at
   high single digits at minimum).
3. **D30 retention of recap-openers vs non-openers** (joins
   `recap_opened` to the existing `app_cold_start`/`workout_completed`
   lifecycle events) — the causal-ish proof the founder asked for.
4. **Recap notification tap-through** via existing `notification_sent` /
   `notification_tapped` (new category, Panel 6) — target ≥15%,
   benchmarked against the check-in reminder.

## 9. Build notes

**What's already generic (verified):**

- `getYearOfLiftsData(userId, yearMs)` already takes a window *start*
  (`database.js:4333`); the story screen already passes `route.params.yearMs`.
- The story renderer's card system (`intro`/`stat`/`list`/`outro`),
  pips, tap zones, empty-state, and build-time filtering are all
  variant-agnostic.
- `drawMilestone` + the `milestoneData` route param handle both recap
  share cards with zero canvas changes.
- `getBlockReflectionData` computes everything the block story needs,
  including `tonnageDelta` and per-block PRs.
- The one-shot notification pattern (idempotent AsyncStorage key, quiet
  hours, telemetry-on-failure) exists in `checkYearOfLiftsUnlock`.

**Parameterisation needed:**

- `database.js`: generalise to `getRecapData(userId, { startMs, endMs,
  compare })` — add an explicit end bound (currently hard-coded `now`,
  `database.js:4425`), fix the per-week average for short windows
  (`avgSessionsPerWeek` divides by 52 flat, `database.js:4360`), swap
  `topMonth` for `bestSession`/busiest-week in month mode, and run the
  same aggregates over the previous window when `compare` is set (for
  the delta captions). `getYearOfLiftsData` becomes a thin caller —
  Year of Lifts behaviour unchanged.
- `YearOfLiftsScreen.js`: extract `buildCards` into per-variant builders
  (`buildYearCards`/`buildMonthCards`/`buildBlockCards`) and accept
  `route.params.variant`; register the screen under a second route name
  (`RecapStory`) or pass variant via params — renderer body untouched.
- `AnalyticsScreen.js`: tile rename + gate swap (10 completed workouts —
  a `COUNT(*)` the screen's data hook can supply; `earliestWorkoutAt` is
  already loaded) + the 7-day ephemeral recap card.
- `scheduler.js`: `checkMonthlyRecapReady()` mirroring
  `checkYearOfLiftsUnlock` (per-month AsyncStorage key, conditions in
  §4.2); new `CATEGORY` entry; deep-link type handled where
  `year_of_lifts_unlock` is.
- `WorkoutSummaryScreen.js`: one conditional row when
  `getCurrentMesocycleWeek()` reports `weekIndex === plannedWeeks` and
  the block's planned sessions for that week are done.
- Telemetry: two catalogue entries + dashboard mapping.

**Noticed, not fixed (per house rules):** `getYearOfLiftsData` returns
`topExercises.slice(0, 3)` while the card maps `slice(0, 5)` — the "top
5" list can only ever show 3; and `getBlockReflectionData`'s first/last
week filters reference `s.workout_id` which the sets SELECT doesn't
project, so `tonnageDelta` likely always computes from empty buckets.
The block story's "climb" slide depends on that delta — verify and
report before building slide 2.

**Unlock gate:** 10 completed workouts is deliberately easy (~3 weeks
for a 3-day lifter) — it exists so the first recap has enough data to
not embarrass itself, mirroring Hevy's year-review threshold, and it
replaces a 365-day wall with a fortnight's anticipation.

**Effort sanity-check vs approved 2.5:** holds. Renderer, share canvas,
notification machinery, and both aggregate functions exist; the work is
one data-function generalisation, three card builders, a tile change,
one notification helper, one WorkoutSummary row, and copy. Roughly 3–5
focused days plus QA. The only genuinely new logic is block-completion
detection.

**Risks:**

1. *Block-completion detection* — there is no `status = 'completed'`
   writer in the codebase today (the `status` column defaults `'active'`;
   only `is_active` is flipped, `database.js:2386`). The WorkoutSummary
   trigger must use the `weekIndex === plannedWeeks` heuristic and
   tolerate users who train past the planned end. Mitigation: trigger on
   final-week-last-session OR on block deactivation, whichever comes
   first, with an idempotent seen-flag per mesocycle id.
2. *`tonnageDelta` correctness* (bug noted above) — the block story's
   signature slide depends on it; must be verified first.
3. *Thin-month embarrassment* — mitigated by the minimum-content rule
   and zero-session silence.
4. *Notification fatigue* — capped at one recap push per month, ever;
   block-end is push-free by design.
5. *Scope creep toward COMP-019/COMP-004 slides* — explicitly out of v1;
   the deck ships on existing aggregates only.

**Files touched:** `src/lib/database.js`,
`src/screens/YearOfLiftsScreen.js`, `src/screens/AnalyticsScreen.js`,
`src/screens/WorkoutSummaryScreen.js`,
`src/screens/BlockReflectionScreen.js` (header button only),
`src/lib/notifications/scheduler.js` (+`categories.js`),
`src/lib/telemetry/events.js`, `src/navigation/RootNavigator.js`
(route param/name only). No DB migration, no native modules, no new
dependencies, no billing, no safety-system contact.
