# COMP-004 — Daily trend surface: "Your trend" card

**Implementation blueprint · 10 June 2026 · Research-only, no code changes**
Charter: [impl-00-shared-brief.md](./impl-00-shared-brief.md) · Approved spec seed: [COMP-004 in master proposals](../competitive-audit-03-master-proposals.md) · Integration map: [impl-00-integration-map.md](./impl-00-integration-map.md)

> **Evidence access note:** direct fetches of macrofactorapp.com and
> macrofactor.com returned HTTP 403 (Cloudflare) during this research pass.
> All MacroFactor claims are from search-engine extracts of those pages and
> are flagged **search-extract-only** throughout. The substantive claims are
> corroborated across multiple independent sources and match the round-1
> research file verbatim. The COMP-027 blueprint (already completed) captures
> the same MacroFactor sources in more detail; nothing here contradicts it.
>
> **Code ground truth:** all integration claims verified against source as of
> 2026-06-10. Key files read: `src/lib/nutritionEngine.js`,
> `src/lib/database.js`, `src/screens/HomeScreen.js`,
> `src/screens/AnalyticsScreen.js`, `src/screens/DiaryScreen.js`,
> `src/screens/BodyMetricsScreen.js`, `src/components/SvgLineChart.js`.

---

## 1. Best-in-market bar

### 1.1 MacroFactor — the single best reference

MacroFactor's weight trend and expenditure surface is the category benchmark.
Its design properties, verified from multiple sources:

**Weight trend chart.** The Weight Trend screen "helps users understand how
their weight is changing over time while cutting through the noise of daily
weight fluctuations." The chart renders two layers: raw scale weight (faint)
and a smoothed trend line (prominent). The trend line is the product's primary
reading surface — not the scale weight, not a running total. MacroFactor V3
(autumn 2024) updated the algorithm to be "slightly more responsive than V2
(picking up trends 1–5 days sooner) while considerably more stable, with
day-to-day expenditure updates generally about 35% smaller"
([MacroFactor expenditure V3](https://macrofactor.com/expenditure-v3/),
search-extract-only).

**Expenditure estimate.** A separate but adjacent screen shows MacroFactor's
reverse-engineered daily burn. "It takes MacroFactor about 2–3 weeks to dial
in a good expenditure estimate when you first start using the app." Once dialled
in, this estimate is "nearly three times more accurate than estimates derived
from TDEE formulas" per their own accuracy data
([MacroFactor algorithm accuracy](https://macrofactorapp.com/algorithm-accuracy/),
search-extract-only). The estimate updates daily and carries no confidence tier
in the UI — it shows a single number — but the help article explains what
factors drive changes
([How should I interpret changes to my energy expenditure?](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure),
search-extract-only).

**Maintenance goal dial.** For users on maintenance, the weight trend screen
becomes a dial: target weight at centre, ±0.68 kg bands labelled "Over" and
"Under." The dial is purely a weight-position display; it does not carry a
valence colour on the number itself (red numbers are absent throughout the
product per the adherence-neutral philosophy, confirmed in COMP-027 §1#4).

**Adherence-neutral philosophy.** MacroFactor "presents data without red
numbers, pop-ups, warnings, or visual elements that promote shame and guilt"
([adherence-neutral article](https://macrofactorapp.com/adherence-neutral/),
search-extract-only). This is the commercial differentiator the product is
known for in its user community and distinguishes it sharply from MyFitnessPal.

**What makes it the single best:** the two-layer chart (raw + smooth), the
plain-English explanation, and the strict no-shame colour policy together
produce a surface that earns user trust rather than triggering daily anxiety.
Reviews consistently praise the "calm" feel
([marrastrength.com MacroFactor review](https://marrastrength.com/macrofactor-review/)).

---

### 1.2 Happy Scale

Happy Scale is the reference for smoothing done simply and honestly. Four
smoothing methods are available: Exponential Smoothing, Seven Day Moving
Average, Happy Scale Smoothing (the recommended default), and Double
Exponential Smoothing. The app's core thesis is "weight always fluctuates and
what matters is thinking about trends over time rather than getting hung up on
any one specific number"
([Happy Scale website](https://happyscale.com/); [iPhone J.D. review 2025](https://www.iphonejd.com/iphone_jd/2025/01/review-happy-scale.html)).

Happy Scale Smoothing (bidirectional) adjusts recent-day predictions as new
data arrives, which some users find disorienting but reviewers note produces
the most accurate current-weight estimate. The app's UI help says this is "the
recommended method" and explains the back-adjustment in plain language so users
understand why yesterday's value moved.

**What makes it work:** transparency about smoothing method choice; statistics
panel with "average low for the last 10 days" framing that orients users toward
achievement rather than raw daily figures. The well-designed approach
"overcomes the negative psychology associated with normal ups and downs"
([unimeal.reviews Happy Scale 2025](https://unimeal.reviews/weight-loss-apps/happy-scale/)).

---

### 1.3 Cronometer

Cronometer's body weight tracking (Gold plan) allows custom charts overlaying
weight against nutrient intake, and Oura ring integration imports weight data.
The weight trend in Cronometer is not a primary surface — it sits inside a
flexible charting tool. No dedicated smoothed-trend display exists in standard
Cronometer; the analysis is available but the user must construct it.

**Lesson:** optional custom charts reach only power users. A trend surface that
requires construction is not a trust-building surface. Cronometer does the
integration work but not the interpretation work.

---

### 1.4 Oura's body weight insight

Oura does not natively track body weight (its ring has no scale). When weight
is synced from a connected device, it appears as a chart tile but carries no
trend interpretation or maintenance estimate. Oura's strength is the
"one big thing" home redesign (October 2025, agency Instrument) — surfacing the
most critical score first — but body weight is not part of that primary surface.

**Lesson:** placement is the product (the shared brief's core principle). Oura
got the hierarchy right for readiness; the body weight surface is an afterthought
there. Volyume cannot make the same error in the opposite direction.

---

### 1.5 Nutracheck

Nutracheck (the UK's leading calorie tracker by paid-subscriber count) offers
weight progress charts and supports trend visualisation. User reviews praise
the weight progress display as "great at keeping check on weight progress" and
note a "shift in mindset from seeking quick fixes to accepting that real
change takes months"
([TechRadar Nutracheck review](https://www.techradar.com/computing/websites-apps/this-weight-loss-app-helped-me-lose-84-pounds-and-genuinely-changed-my-life)).
However, Nutracheck's weight chart does not surface a maintenance estimate or
an EWMA-derived calorie implication. It is a chart without a number that
answers the user's real question: "what does this trend mean for my calories?"

**Lesson:** a trend chart without a maintenance estimate is incomplete. The
maintenance estimate is the piece that converts curiosity into actionable
understanding.

---

## 2. What fails

### 2.1 MyFitnessPal: daily net calories as a trend proxy

MFP's most-discussed failure mode is treating the day's net calories (eaten
minus exercise burn) as the readout users should watch. The "eat back your
exercise" model hands users larger calorie headrooms on active days, and the
"negative calorie adjustment" feature generates documented community confusion
("help negative calorie adjustment mistake" is a recurring MFP forum thread).

For weight trend: MFP's weight log shows a raw scatter-plot of daily weigh-ins
with no smoothing. Users see a jagged line, interpret any morning gain as
"failing," and either abandon the feature or cycle through anxiety loops. This
is the pattern the category's research documents: app features delivering
"warning signals to users approaching their daily calorie limit may create
heightened food preoccupation"
([PMC11556259, Mobile Food Tracking Apps 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11556259/)).

**Anti-pattern named: raw-scatter weight display.** Showing unsmoothed daily
readings as the primary weight surface is the single most documented
UX failure in nutrition tracking.

---

### 2.2 Red-number obsession

Research identifies "fixation on numbers" and "extreme negative emotions" when
apps render deficit or over-target states in alarming colours
([PMC8485346, BJPsych Open 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8485346/)).
"The way calorie-counting apps are designed — with heavy focus on numbers,
green positive signals, and red warning signs — can create a harmful mindset"
([PMC11556259 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11556259/)).

A weight number in red has two failures simultaneously: it applies a moral
valence to a physiological reading (water, food mass, menstrual cycle all move
scale weight), and it removes the user's agency (they cannot un-drink the glass
of water they had last night).

**Anti-pattern named: red weight numeral.** COMP-027 §A4 already locks this as
Class B rule: weight numerals are always `textPrimary`. COMP-004 inherits and
must not violate it.

---

### 2.3 Too much maths on screen

Several apps in the category (Lose It!, some Cronometer power-user views)
surface equations, formula names (Mifflin-St Jeor, Katch-McArdle), confidence
percentages, and multi-decimal TDEE breakdowns in the primary view. This
violates the shared brief's voice rule ("no jargon") and the effort-budget
principle (reading cost). The research on nutrition app barriers notes "complex
interfaces" and "overwhelming data displays" as primary drop-off causes
([PMC8409150, Barriers and Facilitators for Nutrition Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409150/)).

**Anti-pattern named: maths in the hero.** The maintenance estimate and EWMA
value are internal computations. The card shows one number and one sentence.
The methodology lives in COMP-006's published-methods surface, linked once.

---

### 2.4 Trend that reacts to single-day noise

Displaying daily fluctuations as trend direction (an unsmoothed chart, or an
EWMA with alpha too high) manufactures week-to-week churn. A user who eats
salty food on Sunday sees their "trend" tick up on Monday and cannot distinguish
real change from water mass. MacroFactor's own notes on V3 cite the
"35% smaller day-to-day updates" as a stability feature, not merely an accuracy
one — stability is the user-experience property.

**Anti-pattern named: twitchy EWMA.** The Volyume engine uses alpha = 0.28
(~3.5-day memory). This is appropriate for diet-planning surfaces like
BodyMetrics but is the aggressive end of the spectrum. The trend card must
be explicit that it shows a smoothed value, not yesterday's reading.

---

## 3. User psychology

### 3.1 The anxiety loop vs the truth loop

**The anxiety loop (how most apps work):**
1. User weighs in Monday morning: 0.3 kg heavier than Friday.
2. App shows the new raw number prominently, possibly in a colour.
3. User interprets this as "I'm gaining weight" or "I failed."
4. User restricts food, skips the gym to compensate, or abandons logging.
5. The actual trend (which was down) becomes invisible under the noise.

**The truth loop (what COMP-004 creates):**
1. User weighs in Monday morning: 0.3 kg heavier than Friday.
2. App shows the EWMA trend (which barely moved), notes the fluctuation is
   within the normal band, and shows the 4-week direction.
3. User reads: "Trending inside your band. Calories hold."
4. User continues eating to target, logs accurately.
5. The trend continues downward; at 4 weeks the maintenance estimate updates.

The truth loop requires the card to actively interrupt the user's instinct to
read today's number as signal. The plain-English line is not decoration; it
is the mechanism that closes the loop.

---

### 3.2 Moment of need

There are three distinct moments when a user wants a trend reading:

**Morning post-weigh-in:** "I just logged my weight. Was this a good week?"
This is the highest-frequency moment. The user is on the Train tab (Home), has
just used the weight cell (COMP-027's TodayStrip), and wants to know if the
trend moved. The trend card answers this question; the tap-through from the
logged weight cell in the strip is the journey. This is the moment COMP-004
must win.

**Post-food-log (Diary tab):** "I've been logging for two weeks. Am I making
progress?" This is the second moment. The user is on the Diary tab, has just
reviewed their macros for the day, and wonders if the pattern is working.
DiaryScreen's top area is a candidate host for this reason.

**Progress check (Analytics tab):** "It's been a month. Where am I?" This is
the deliberate review moment. The user navigates to Progress explicitly.
BodyMetricsScreen (accessible via the Weight tile in Explore) currently
answers this question with the EWMA card and burn card.

The placement decision (§4.1) must choose which moment to win first.

---

### 3.3 Trust-building surface

The trend card earns trust through three mechanisms:

1. **Show the working.** The maintenance estimate is derived from actual weight
   data, not a formula applied to onboarding inputs. Showing "from 6 weeks of
   data" (the confidence signal) tells the user the number is earned, not
   guessed. This is the same "show your working" pattern as the per-row Apply
   in CoachOutput.

2. **Interrupt the reflex.** The first user interaction with the card is often
   after a surprise weigh-in. The card that says "your smoothed trend is 0.2 kg
   below last week" when the scale shows a 0.5 kg jump is the card that the
   user will remember and tell someone about. This is the retention moment.

3. **Consistent neutrality.** MacroFactor's review community repeats "it never
   shouts at you" as a reason for loyalty. The absence of alarming presentation
   is itself a trust signal: it communicates confidence in the underlying
   calculation. A card that turns red when weight is up does not trust its own
   smoothing.

---

### 3.4 The "it told me I'm actually maintaining" moment

This is the word-of-mouth seed. A user on a mild cut, 5 weeks in, who has
had a rough food week, sees their EWMA trend barely move and the maintenance
estimate holding steady. The card says: "Your trend is holding. You ate above
target this week but the four-week picture is still pointing down."

That user will say, at a gym or in a group chat: "I had a bad week and the app
told me it was fine — because it actually knows what maintaining looks like for
my body, not just a formula." This sentence is not achievable with raw scale
weight display, not achievable without a maintenance estimate, and not
achievable without the plain-English line.

---

## 4. The Volyume implementation

### 4.1 Placement decision

**Decision: Progress tab, as a named section "Your trend", above the
existing Explore tiles, replacing nothing — but entered from Home via
tap-through from the TodayStrip weight cell.**

**Why not DiaryScreen top:**
DiaryScreen is owned by macro rings and meal cards. Its mission is food
logging. The trend card's mission is weight interpretation; placing it
at the Diary top would conflate two cognitive tasks (what am I eating
today? / how is my trend going?). DiaryScreen is already information-dense.
The COMP-016 UK food layer and COMP-022 barcode chain both land in Diary;
it should not gain another unrelated card above the macro rings.

**Why not a new position in TodayStrip (Home):**
COMP-027 is explicit: "the full 'Your trend' card does NOT live in the
strip (its candidate hosts are Diary top or Progress, per the integration
map; the strip is a glance, not a chart). The logged weight cell becomes the
Home *door* to it." This constraint is already locked in the COMP-027
blueprint. Adding the trend card to Home above or inside the strip would
re-create the three-utility-cards problem COMP-027 is solving. The tap-through
from the weight cell is the correct mechanic.

**Why Progress tab, above Explore tiles:**
- Progress already contains the "For you" insight stack and recent sessions.
  Adding "Your trend" as a named section between the top insight stack and the
  Explore tiles fits the screen's existing hierarchy: interpretive content
  first (insights, trend), then navigation tiles (Explore).
- The Weight tile in Explore currently navigates to BodyMetricsScreen. The
  trend card on Progress is a summary version; the Weight tile remains the
  deep-dive path. No duplication: the Progress card shows trend direction +
  one number; BodyMetrics shows the full EWMA chart, measurements, and burn
  card.
- AnalyticsScreen currently renders: header → insight stack → recent sessions
  → volume summary → cardio plan card → PR sparkline → Explore tiles. "Your
  trend" inserts between the PR sparkline and the Explore tiles, or more
  naturally, between insight stack and recent sessions (it is an insight, not
  a chart deep-dive). Both positions are feasible; between insight stack and
  recent sessions is preferred because the trend is interpretive context that
  enriches the session view below it.
- The user reaching Progress after a weigh-in (the "progress check" moment)
  finds the card immediately without needing to tap into Explore.

**The navigation path:**
```
Home > TodayStrip > weight cell (tap-through when logged)
                                   ↓
                    Progress tab, "Your trend" section
```

This is one tap from the morning ritual. It respects the COMP-027 strip
hierarchy and does not add any surface to Home itself.

---

### 4.2 Card design

**Shell:** matches the AnalyticsScreen section card pattern: `colors.surface`,
`1px border`, `colors.border`, `radius.md`, padding `spacing.md`. Label
`Your trend` in `type.caption` at top.

**Content layout (stacked vertically):**

```
[label]  Your trend
         ─────────────────────────────────────────
[chart]  SvgLineChart: 42-day window, height ~88pt
         • data2 = raw daily weights (faint, color2)
         • data  = EWMA smoothed (colors.primary line)
         • min/max props: band edges (goal ± target rate ×3 weeks slack)
         • Goal band: two horizontal rules at minProp/maxProp,
           rendered as dashed lines in colors.border (neutral, not state)
         ─────────────────────────────────────────
[stat row]  EWMA now: [XX.X kg]  |  [+0.2 / -0.3 kg this week]
            • weight numeral: type.num('h3'), colors.textPrimary (never coloured)
            • weekly delta: type.num('bodyStrong'), colours.textSecondary (neutral sign)
         ─────────────────────────────────────────
[insight line]  One plain-English sentence (see §4.5 copy direction)
         ─────────────────────────────────────────
[maintenance]   ~[2,450] kcal/day estimated maintenance
                [confidence label]: from [N] weeks of data
```

**Chart parameters (verified from SvgLineChart.js):**
- `data2` (raw weights) renders via existing `color2` prop (faint secondary
  series) — already supported, no new chart code required.
- `min` and `max` props set the y-domain to band edges, so the trend line's
  position on the chart communicates band membership visually without any
  additional overlay code.
- The goal band itself is two dashed horizontal `<Line>` SVG elements inside
  a wrapper that positions them at the goal ± slack pixels. This requires a
  thin wrapper component over `SvgLineChart` because the base component does
  not currently support reference lines. The wrapper renders its SVG on top
  of the chart at the correct y-pixel. Alternatively, a `BandLineChart`
  component is created that extends SvgLineChart's props with
  `bandMin` / `bandMax` optional props.

**State colour (COMP-027 Class B):**
- The band edge lines render in `colors.border` (neutral) at all times.
- A 6×6 dot to the left of the insight line uses `stateColors.onTrack` when
  the EWMA is inside the band, `stateColors.watch` when outside (capped here;
  never `stateAct` for a weight surface per Class B rule).
- Under an open ED flag: the dot disappears entirely. No state colour on any
  element.
- Weight numeral: `colors.textPrimary` always. Never a state colour.

---

### 4.3 States

**State 0: no morning weights logged yet (< 1 entry)**
Card does not render. No empty shell on Progress. The Weight Explore tile still
navigates to BodyMetricsScreen, which has its own onboarding empty state.
Reason: an empty trend card with a "start logging" prompt above the fold on
Progress is low-value noise for a new user whose primary goal is to train.

**State 1: fewer than 7 entries**
Card renders a compact form: label + mini message + sparkline (if >= 3).
No EWMA number (not yet meaningful). No maintenance estimate.
Copy: "Log your weight for 7 days and your trend appears here."

**State 2: 7–13 entries (early trend)**
Full card renders. EWMA line visible. No goal band (not enough data to
establish band without at least one week of stable EWMA).
Maintenance estimate: shows only if >= 14 days AND prescribedKcal is known
(verified from `computeAdaptiveTDEEAdjustment` MIN_POINTS = 14 requirement).
If no maintenance estimate yet: "Precision Coaching is building your estimate.
Keep logging and it appears in about a week."
State dot: neutral (no band established yet).

**State 3: 14–41 entries (active trend, early confidence)**
Full card. EWMA + goal band + maintenance estimate with "Early estimate — from
N weeks of data" label. Confidence = 'low' for < 3 weeks, 'medium' 3–4 weeks.
State dot visible.

**State 4: 42+ entries (COMP-026 prerequisite met; high confidence)**
Full card with high-confidence maintenance estimate. This is the state where
the adaptive TDEE path becomes live (the pre-existing defect — 14-day window —
is fixed by COMP-026's prerequisite step, which extends the DB query to 90
days via `getMorningWeights(userId, 90)` which already exists in database.js).
Confidence = 'high'.

**Goal-diverging state:**
When the EWMA weekly rate exceeds ±1.5× the target rate for 2+ consecutive
weeks, the insight line switches to the diverging copy (see §4.5). The state
dot moves to `stateColors.watch`. No further escalation — Class B caps at
watch, never act.

**Offline state:**
The card reads from SQLite exclusively (offline-first architecture). No
network dependency. A spinner or placeholder during the initial cold-load
skeleton (the card appears after the first `loadData` completes, consistent
with the existing skeleton pattern in HomeScreen.js lines 875–886).

---

### 4.4 Under ED flags

When `getOpenEdPatternFlag(userId)` returns a non-null row (open flag):

- The weekly rate number (e.g. "-0.3 kg/week") is hidden entirely.
- The maintenance estimate number is hidden.
- The state dot is hidden.
- The goal band lines are hidden.
- The EWMA sparkline remains but shows only the smoothed line (raw weights
  hidden, band hidden).
- The EWMA current value (e.g. "83.2 kg") remains — this is a body-weight
  fact, not a rate or a verdict.
- The insight line changes to neutral direction-only copy.
- The confidence label disappears.

**ED-flag copy:**
"Your weight has stayed broadly stable over the past few weeks."
or (if clearly rising): "Your weight trend has been rising slightly."
or (if clearly falling): "Your weight trend has been drifting down."

These use the direction word only — no number, no rate, no valence.

The card remains visible under the flag (consistent with the spec: "the card
itself stays — just changes copy"). Its presence on Progress is a low-risk
continuous surface; hiding it entirely would create a jarring absent section
that some users might investigate. The neutral version is less alarming than
an absent card.

---

### 4.5 Copy direction (house voice, British English)

**Rule:** one sentence, no em dashes, no jargon (no "EWMA", no "TDEE"),
no shame, no exclamation marks. Numerals are the hero. The line states
a fact and, where appropriate, withholds demand.

**Example strings:**

| State | Line |
|---|---|
| Inside goal band, on track | "Trending inside your band. Calories hold." |
| Outside band (above), mild | "Drifting a little above your band. Nothing to change yet." |
| Outside band (above), persistent | "Your trend has been creeping up for two weeks. Worth reviewing your targets." |
| Losing faster than target | "Losing a touch faster than planned. Consider adding a small amount back." |
| Below goal band (maintain goal) | "Trending a little under your target. You are eating at a slight deficit." |
| ED flag open | "Your weight trend has stayed broadly stable." |
| Early confidence (state 3) | "Still building confidence. Keep logging and this sharpens." |
| Insufficient data (state 1) | "Log your weight for 7 days and your trend appears here." |

Register rule inherited from COMP-027 §A5: watch copy states a fact and
explicitly withholds demand. "Nothing to change yet" is load-bearing — it
closes the anxiety loop (§3.1) in a single clause.

---

### 4.6 Accessibility

- All trend data available as `accessibilityLabel` on the card container:
  "Your trend: X kg this week, [direction]. [Insight line]."
- State dot has `accessibilityHidden={true}` — its meaning is conveyed by
  the insight line text (non-colour redundancy per WCAG 1.4.1).
- Chart `pointerEvents="none"` (already set in SvgLineChart.js line 102).
- 44pt minimum touch target on the card itself for tap-through navigation.
- Weight numeral rendered in tabular figures via `type.num('h3')` (already
  in the type scale; consistent with BodyMetricsScreen ewmaValue style).

---

## 5. Whole-package integration

### 5.1 COMP-027 (TodayStrip): door and destination

COMP-027 creates the TodayStrip on Home with a weight cell (the morning
entry point). The COMP-027 blueprint states explicitly:
"The logged weight cell becomes the Home *door* to [COMP-004]; tap-through
from the logged state to wherever COMP-004 lands."

The interaction contract:
- Unlogged weight cell (morning, expanded state) → log weight → the logged
  state shows EWMA sparkline + checkmark.
- Tap on the logged weight cell → navigates to Progress tab, scrolled to
  the "Your trend" section.
- This is a `navigation.navigate('Analytics')` + a `scrollTo` call, or a
  deep-link parameter that the AnalyticsScreen scroll respects. The
  `useScrollToTop` ref already exists in AnalyticsScreen.js (line 30);
  a `scrollToTrend` param at navigation time is the addition.

**No duplication:** the strip cell shows EWMA current value + 14-day
micro-sparkline (the existing `Sparkline` component, `colors.primary`).
COMP-004 shows the full 42-day chart + band + maintenance estimate. Different
data depth, different purpose. They share one source of truth (SQLite
morning_weights).

---

### 5.2 COMP-026 (Step TDEE): confidence lives here

COMP-026 §3 (user psychology) states: "COMP-004 is the surface that explains
the confidence/adjustment to users." The step modifier's receipt line
("Precision Coaching updated your estimate a little sooner because your step
level shifted") surfaces on the trend card in the maintenance estimate section,
below the confidence label. It is a one-line addition to the existing
`adaptiveBurn.insight` field (already rendered in BodyMetricsScreen.js
lines 745–747).

This means the trend card is not just a weight display — it is the primary
location where the COMP-026 mechanism is visible to the user. The COMP-026
blueprint notes this dependency explicitly; COMP-004 is the host.

---

### 5.3 COMP-024 (cycle smoothing): feeds this card

COMP-024's robust EWMA (the prerequisite fix for the adaptive TDEE path)
produces the smoothed data that COMP-004 renders. The card should never
implement its own smoothing; it reads from the same `computeEWMA` call
(already in `src/lib/nutritionEngine.js:171`) that BodyMetricsScreen uses.

The key dependency: COMP-024's window extension (from 14 days to ~42 days,
via `getMorningWeights(userId, 90)` which already exists in
`src/lib/database.js:3734`) must be in place before State 4 (high confidence)
is reachable. Until then, the card shows State 3 at best, which is still
useful and honest.

---

### 5.4 COMP-005 (recap): pulls the trend line

COMP-005 (monthly/block recap) includes a trend summary. The recap's trend
line should read from the same EWMA computation, not a separate calculation.
The trend card's data hook (see §9, build notes) should be structured as a
shared hook so COMP-005 can consume the same output without a second DB read.

---

### 5.5 BodyMetricsScreen: no duplication

BodyMetricsScreen (accessible via Progress > Explore > Weight) already
renders:
- `WeightTrendChart` (the full history chart at line 690)
- `ewmaCard` (current EWMA value + weekly change, lines 698–730)
- `burnCard` (adaptive TDEE estimate, lines 732–758)

COMP-004's Progress card is a **summary layer**, not a replacement. The
relationship:
- Progress "Your trend" card: 42-day window, sparkline only, maintenance
  estimate as a single number, one insight line. Designed for glance-level
  reading by a user not specifically checking body metrics.
- BodyMetricsScreen: full history chart, measurements log, body fat trend,
  full adaptive burn breakdown. Designed for deliberate body-metrics review.

The Weight Explore tile on Progress continues to navigate to BodyMetricsScreen.
The "Your trend" card on Progress is a new surface above the tiles; it does not
replace the Explore entry. No confusion: one is a card in the feed, the other
is a dedicated screen.

---

### 5.6 Streamlining check

Does this make the app feel busier? The Progress tab currently shows:
header → insight stack → recent sessions → volume summary → cardio plan →
PR sparkline → Explore tiles.

"Your trend" inserts between the insight stack and recent sessions. This is
an enrichment of an existing surface (Progress already interprets data), not a
new tab or screen. The card replaces nothing and is gated (does not appear
at all until 7 days of data exist). New users see Progress exactly as today.
A 12-week Pro user sees one new card with information they currently have to
navigate to BodyMetrics to find. Net: the app gets less hunting required, not
busier.

---

## 6. Retention and word-of-mouth mechanics

### 6.1 The trust loop

The "it told me I'm actually maintaining" moment (§3.4) is the primary
retention mechanism. A user who has a bad food week and sees the trend card
hold steady (because EWMA absorbs the noise) has a concrete piece of evidence
that the app is smarter than a raw number. This moment is sticky because:

- It is true (the EWMA genuinely is more accurate than yesterday's scale weight
  as a predictor of actual fat change).
- It is specific (the user remembers the exact week, the exact number).
- It is tellable (at a gym, in a WhatsApp group, in an app review).

### 6.2 The maintenance estimate moment

A user who reaches State 4 (6+ weeks of data) and sees a maintenance estimate
that differs from the app's initial onboarding formula output has a second
sticky moment: "the app worked out my actual maintenance, not just a number
from a calculator." This is MacroFactor's primary positive-review driver per
search extracts. Volyume gets this moment at State 4; before that, the "Early
estimate — building confidence" framing sets the expectation correctly so the
arrival of a high-confidence estimate feels earned.

### 6.3 The COMP-026 step moment

When COMP-026 is live (post-prerequisite-fix), the step modifier receipt on
the trend card produces: "Precision Coaching updated your estimate a little
sooner because your step count has been rising." A user who started a walking
habit 3 weeks ago and sees this line will share it. It is the "it knew"
moment — perceived adaptivity earning trust without any AI, just maths done
in the open.

### 6.4 Play Store differentiator

The trend card summary stat ("from 8 weeks of data") appears on the card
permanently. A user taking a screenshot of their Progress tab to share has
that number visible. It communicates "this app tracks me over time" in a
shareable format that no raw-scatter competitor can replicate.

---

## 7. Beating the benchmark

MacroFactor's trend chart and expenditure screen are two separate surfaces
with separate navigation paths. The trend is on the main dashboard; the
expenditure is behind a tab. A user wanting to understand "is my trend
consistent with my calories?" must mentally stitch two screens together.
Volyume's COMP-004 surfaces the maintenance estimate — the bridge between
the weight trend and the calorie story — on the same card as the trend line.
This is one read, not two. The band shows whether the trend is inside the
goal; the maintenance estimate shows what the trend implies for the calorie
target; the one-sentence line translates both into plain English. MacroFactor
does this across a V3 algorithm essay, a help article, and two separate
screens. Volyume does it in one card with no maths visible. The combination of
the tap-through from the morning ritual (COMP-027 door), the step modifier
receipt (COMP-026 visible here), the Class B colour rule (no red numbers, ever),
and the ED-flag neutral mode produces a surface that is calmer, more
informative, and more trust-building than the category's best — not merely
equal to it.

---

## 8. Measurement

**Metric 1 — trend card views per active user per week.**
Baseline: zero (card does not exist). Target: >= 3 views/week by week 8
post-launch for users with >= 14 days of data. Proxy for daily-ritual
integration.

**Metric 2 — morning weight logging rate (existing metric, COMP-027 metric #2).**
COMP-004 must not decrease this. If the tap-through mechanic creates an
expectation that logging weight "opens" the trend card (and the card then
disappoints in State 1/2), logging rate could drop. Gate: if logging rate
drops > 5% in the 4 weeks post-launch, the tap-through mechanic is reviewed.

**Metric 3 — 42-day weight logging retention.**
The maintenance estimate (State 4) only appears at 42 days. Track the fraction
of users who reach 42 consecutive-or-near-consecutive morning weights. This is
a leading indicator for whether COMP-024's prerequisite fix (window extension)
actually unlocks State 4 for real users.

**Metric 4 — BodyMetrics screen opens from Progress.**
Currently: users navigate to BodyMetrics via Explore tile. After COMP-004: the
trend card satisfies the glance-level need; BodyMetrics opens shift toward
deliberate deep-dives. If BodyMetrics opens drop significantly, that confirms
the card is reducing friction, not adding it.

---

## 9. Build notes

### 9.1 New component vs SvgLineChart reuse

**SvgLineChart is directly reusable.** It already supports:
- `data2` for raw secondary series (faint background line).
- `min` / `max` props for explicit y-domain (used to keep the band edges
  at consistent y-positions).
- `curved = true` for smooth EWMA line.
- Area fill via `area` prop (optional — not required for the trend card,
  but available if the design wants a subtle gradient under the EWMA line).

**New: `TrendBandChart`** — a thin wrapper component that accepts
`bandMin` and `bandMax` props and renders two dashed horizontal `<Line>`
SVG elements over SvgLineChart. This is ~40 lines of new code. It does not
modify SvgLineChart itself.

Alternatively, SvgLineChart can be extended with optional `refLines` prop
(array of `{ value, dashed, color }`) rendering horizontal rules at those
values. This is a cleaner extension; if SvgLineChart is being touched for
COMP-015 (autoregulation lines) or COMP-019 (charts), add `refLines` there
and reuse. If not, the thin wrapper is lower-risk.

**No new charting library.** The existing react-native-svg dependency via
SvgLineChart handles everything needed.

---

### 9.2 Data hook

New hook `useWeightTrend(userId)`:
- Calls `getMorningWeights(userId, 90)` (already in database.js:3734 —
  no new DB function needed).
- Calls `computeEWMA` from `nutritionEngine.js`.
- Calls `computeWeeklyWeightChange` from `nutritionEngine.js`.
- Calls `computeAdaptiveTDEEAdjustment` from `nutritionEngine.js`
  (with `prescribedKcal` and `currentTDEEEstimate` from the store's
  `nutritionTargets`).
- Calls `getOpenEdPatternFlag(userId)` for the ED-flag state.
- Returns `{ ewmaData, weeklyChange, adaptiveBurn, edFlagOpen, state }`.

This hook is the single read surface for both the Progress trend card and
(via tap-through) any pre-navigation state the weight cell in the TodayStrip
needs (the sparkline there can share the same hook output).

COMP-005 recap can import `useWeightTrend` directly. No second DB read.

---

### 9.3 Maintenance estimate calculation (verified)

The maintenance estimate surface in BodyMetricsScreen.js (lines 362–373)
already computes `adaptiveBurn` via `computeAdaptiveTDEEAdjustment`. The
returned `adjustedTDEE` is the maintenance estimate. The `confidence` field
maps to the label:
- `'insufficient_data'` → not shown (State 0–2)
- `'low'` → "Early estimate — from N weeks of data"
- `'medium'` → "Firming up — from N weeks of data"
- `'high'` → "From N weeks of data" (no qualifier needed; high confidence
  speaks for itself)

The `weeks` field (floor of ewmaData.length / 7) provides N. This is the
existing behaviour in BodyMetricsScreen; the trend card reuses the same
calculation without modification.

**Critical note (COMP-026 pre-existing defect):**
`computeAdaptiveTDEEAdjustment` currently receives at most ~14 entries in
production because `CoachOutputScreen.js:997` calls
`getMorningWeightsLast14Days`. This means `confidence === 'low'` always in
production and the high-confidence maintenance estimate is unreachable.
The `useWeightTrend` hook for COMP-004 must use
`getMorningWeights(userId, 90)` (the existing 90-entry function) not the
14-day variant. This is the same prerequisite the COMP-026 blueprint
identifies; COMP-004 depends on it but can ship the card with the
'low'/'medium' states working immediately, and State 4 (high confidence)
becomes reachable once the COMP-026 prerequisite is merged.

**Launch order implication:** COMP-004 ships first with States 0–3 working.
State 4 (high-confidence maintenance estimate) unlocks when COMP-026's
prerequisite fix (90-day window) ships. This is explicitly a two-phase
roll-out; the card is not blocked, but users see the fully-confident version
only after the window fix. Document this in the PR description so reviewers
understand why State 4 is untestable before COMP-026 prerequisite lands.

---

### 9.4 Files touched

| File | Change |
|---|---|
| `src/hooks/useWeightTrend.js` | **New file.** ~80 lines. The data hook. |
| `src/components/TrendBandChart.js` | **New file.** ~50 lines. Thin wrapper over SvgLineChart adding band reference lines. |
| `src/screens/AnalyticsScreen.js` | **Edited.** Add "Your trend" section (import hook, import card, render between insight stack and recent sessions). ~30 lines added. |
| `src/screens/HomeScreen.js` | **Edited.** Add tap-through navigation from logged weight cell in TodayStrip (or existing weight card, pending COMP-027 timing) to Progress with scroll parameter. ~5–10 lines. Actual edit inside COMP-027's TodayStrip component if that ships first. |

No billing files. No coaching engine files. No safety system files.
No new dependencies.

---

### 9.5 Effort sanity-check

Approved score: **3.6** (mid-effort).

- `useWeightTrend` hook: 0.5 days (pure data wiring over existing functions).
- `TrendBandChart` wrapper: 0.5 days (thin SVG extension).
- AnalyticsScreen integration: 0.5 days (render + section heading + states).
- Navigation tap-through from Home/TodayStrip: 0.25 days.
- ED-flag handling + tests: 0.5 days.
- Copy pass + polish: 0.25 days.

**Total: ~2.5 days solo** — within the 3.6 score. The elastic item is the
TrendBandChart polish (band rendering can grow in scope if animated or if it
needs to handle narrow-chart edge cases). Timebox the band to static
rendering; animated band is a stretch goal for a later pass.

---

### 9.6 Risks

**Risk 1 — COMP-026 prerequisite dependency.**
State 4 is not reachable until the 90-day window fix ships. Mitigation: the
card is fully useful at States 2–3. Document the dependency clearly and
ensure the launch notes for COMP-004 name it.

**Risk 2 — AnalyticsScreen density.**
Progress is already reasonably long. Adding "Your trend" above recent sessions
is one section. If the section renders for all active Pro users (7+ days of
data), it is nearly always visible. If the founder feels Progress is too long
after this lands, the fallback is to gate the section behind a "Show trend"
expand-row (one tap to reveal), keeping Progress compact until the user opts
in. The default-open state is recommended; the fold is acceptable.

**Risk 3 — TodayStrip timing (COMP-027 dependency).**
The tap-through path from Home requires the TodayStrip to exist (COMP-027)
or the existing weight card (HomeScreen.js:889). If COMP-027 ships first,
the tap-through goes inside TodayStrip. If COMP-004 ships first, the
tap-through is added to the existing weight card inline. Both are valid;
the code change is in the same area either way. COMP-004 is not blocked by
COMP-027.

**Risk 4 — "Weekly change" numeral under ED flag.**
The weekly change rate is the number hidden under the ED flag. The check
requires `getOpenEdPatternFlag` in the hook at render time. This is a SQLite
read; it is fast and offline-safe. No network dependency. The hook must
call this on every refresh (not cache indefinitely) so a flag raised between
renders is picked up. The existing `getOpenEdPatternFlag` function returns
the latest open flag; calling it inside the hook's data-load sequence is
the correct pattern.

---

## Source references

- [MacroFactor Weight Trend help article](https://help.macrofactorapp.com/en/articles/21-weight-trend) (search-extract-only)
- [MacroFactor Dashboard overview](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard) (search-extract-only)
- [MacroFactor Expenditure V3](https://macrofactor.com/expenditure-v3/) (search-extract-only)
- [MacroFactor Algorithm Accuracy](https://macrofactorapp.com/algorithm-accuracy/) (search-extract-only)
- [MacroFactor Adherence Neutral](https://macrofactorapp.com/adherence-neutral/) (search-extract-only)
- [MacroFactor Algorithms and Core Philosophy via Stronger by Science](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)
- [MacroFactor Energy Expenditure interpretation help](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure) (search-extract-only)
- [Happy Scale website](https://happyscale.com/)
- [Happy Scale review — iPhone J.D. 2025](https://www.iphonejd.com/iphone_jd/2025/01/review-happy-scale.html)
- [Happy Scale review — Unimeal 2025](https://unimeal.reviews/weight-loss-apps/happy-scale/)
- [MacroFactor review — Marra Strength 2025](https://marrastrength.com/macrofactor-review/)
- [Nutracheck review — TechRadar](https://www.techradar.com/computing/websites-apps/this-weight-loss-app-helped-me-lose-84-pounds-and-genuinely-changed-my-life)
- [Mobile Food Tracking Apps — PMC11556259 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11556259/)
- [Effects of diet and fitness apps on eating disorder behaviours — PMC8485346 BJPsych Open 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8485346/)
- [Barriers to and facilitators for nutrition apps — PMC8409150](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409150/)
- [Incorporating consumers' needs in nutrition apps — PMC10337335](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10337335/)
- COMP-027 blueprint: `impl-COMP-027-colour-home.md` (Class B colour rules; TodayStrip tap-through)
- COMP-026 blueprint: `impl-COMP-026-step-tdee.md` (adaptive TDEE pre-existing defect; step modifier receipt)
- Code: `src/lib/nutritionEngine.js` — `computeEWMA`, `computeWeeklyWeightChange`, `computeAdaptiveTDEEAdjustment`
- Code: `src/lib/database.js:3734` — `getMorningWeights(userId, limit = 90)`
- Code: `src/lib/database.js:5806` — `getOpenEdPatternFlag(userId)`
- Code: `src/screens/BodyMetricsScreen.js:362–373, 698–758` — existing EWMA + burn card (reuse reference)
- Code: `src/components/SvgLineChart.js` — reuse basis for `TrendBandChart`
