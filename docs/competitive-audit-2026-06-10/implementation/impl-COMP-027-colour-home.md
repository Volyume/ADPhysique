# COMP-027 Implementation Blueprint — Semantic state-colour grammar + "one big thing" Home hierarchy

> Round-2 blueprint, 10 June 2026. Charter: `impl-00-shared-brief.md`.
> Approved seed: `../competitive-audit-03-master-proposals.md` (COMP-027,
> impact 6 / effort 4). Code ground truth verified against
> `src/styles/theme.js`, `src/screens/HomeScreen.js`,
> `src/components/StepsCard.js`, `src/components/CardioCard.js`,
> `src/screens/CoachOutputScreen.js`, `src/screens/BodyMetricsScreen.js`.
> No code modified. Two coupled systems in one blueprint: **Part A** the
> colour grammar, **Part B** the Home hierarchy. They ship together because
> the new Today strip is the grammar's most visible non-consumer (body-data
> surfaces deliberately stay neutral, see §A4).
>
> Fetch note: direct fetches of 925studios.co, ouraring.com and
> macrofactor.com returned HTTP 403 during this research pass; claims from
> those sources are **search-extract-only**, cross-checked against the
> round-1 citations in `../competitive-audit-01-design-ux-research.md`
> which used the same primary pages.

---

## 1. Best-in-market bar

**1. Whoop — the "learned once" three-colour vocabulary (the single best
reference for Part A).** Whoop compresses every recovery input into one
0–100 score rendered in exactly three colours with fixed numeric bands:
green 67–100% ("primed to perform"), yellow 34–66% ("maintaining, ready
for moderate strain"), red 0–33% ("rest is likely what the body needs")
([Whoop Locker — How Recovery Works](https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/),
[Whoop Support](https://support.whoop.com/s/article/WHOOP-Recovery?language=en_US)).
The design property that matters is not the hues, it is the **contract**:
the same three colours repeat across every screen with the same meaning,
so "users learn the visual language once" and never re-parse it; the
near-black background exists so the state colours pop
([925 Studios design breakdown](https://www.925studios.co/blog/whoop-design-breakdown),
search-extract-only, fetch 403; corroborated by round-1 doc §1#2). What it
buys: a Whoop user reads any new screen instantly, because state is
pre-attentive before reading.

**2. Oura — colour as body-state + "one big thing" (the single best
reference for Part B).** The October 2025 redesign (agency Instrument)
rebuilt the app around two principles: "use colour to signal the body's
state" so users "assess their status without parsing numerical data", and
surface "one big thing — the most critical score or insight you need to
act on right now" first, with everything else one level down
([Oura blog](https://ouraring.com/blog/new-oura-app-experience/),
search-extract-only;
[9to5Google](https://9to5google.com/2025/10/20/oura-app-redesign/),
[Tech Between The Lines](https://www.techbetweenthelines.com/oura-rings-major-app-redesign-and-cumulative-stress-feature-now-rolling-out/)).
The hierarchy lesson: at-a-glance level → focused metrics → deep
exploration, never all three at once.

**3. Apple Fitness rings — the negative-space lesson.** Apple's ring
colours encode **metric identity**, not state: Move is always red,
Exercise always green, Stand always blue; progress is arc length and the
"state" is a shape event (the ring closing), not a hue change
([Apple HIG — Activity rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings),
[Tom's Guide](https://www.tomsguide.com/reference/apple-watch-rings-what-they-mean-and-how-to-close-them)).
This is the opposite encoding to Whoop and it is why the two never feel
alike. Volyume must pick ONE encoding: **hue = state, never hue =
metric**. (Amber stays outside the grammar entirely, as identity/action.)

**4. MacroFactor — adherence-neutral colour, the no-shame proof.**
MacroFactor's stated philosophy is to "break away from designs that
encourage neurotic behaviours": it is "adherence neutral… without
shaming", and **deliberately turns no numbers red** when targets are
exceeded; scale weight renders as a pale neutral line under a deep-purple
trend, with zero valence colouring
([MacroFactor — Algorithms and Core Philosophy](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/),
search-extract-only, fetch 403; mirrored at
[Stronger By Science](https://www.strongerbyscience.com/macrofactor-algorithms-philosophy/)).
This is the category's strongest precedent for Volyume's Class B rule
(§A4): body-weight surfaces never carry the act/red state.

**5. Gentler Streak — state colour that is rest-positive.** The ADA-winning
Activity Path renders readiness as a green band you stay *within*; resting
is inside the band, not a failure state, and users can set a status that
"removes FOMO from sight and mind"
([Gentler Streak docs — Interpret the Activity Path](https://docs.gentler.app/understanding-your-activity-path/interpret-the-activity-path),
[Sketch blog](https://www.sketch.com/blog/gentler-streak/)). Precedent for
Class C: emotional surfaces get the positive state or neutral, never
caution or act.

**CVD baseline.** The Okabe–Ito palette (Color Universal Design, Okabe &
Ito 2008) is the standard CVD-safe set the app already draws on for its
existing swaps (success → #56B4E9 sky blue, error → #CC79A7 reddish
purple, `theme.js` applyAccessibility)
([Okabe-Ito reference](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference),
[easystats](https://easystats.github.io/see/reference/scale_color_okabeito.html)).
Accessible traffic-light practice adds two rules: differentiate by
luminance as well as hue ("your yellow should be significantly lighter
than either your red or green") and never rely on colour alone — pair
with icon or label
([UX Collective — accessible traffic light colours](https://uxdesign.cc/beautiful-accessible-traffic-light-colors-b2b14a102a38),
[Smart Frames — rethinking RAG colours](https://smart-frames.co.uk/2025/01/23/rethinking-rag-colours-in-business-intelligence-tools/)).

## 2. What fails

- **Red as a verdict.** Whoop's own ecosystem produces "score stress":
  coaching content has to tell users a red recovery is "a caution light,
  not a stop sign" because people overreact to it
  ([melissau.com on red recovery](https://blog.melissau.com/p/why-is-my-whoop-recovery-in-the-red));
  Whoop data itself links anxiety to worse recovery, a feedback loop the
  colour aggravates
  ([Men's Journal on Whoop stress data](https://www.mensjournal.com/health-fitness/whoop-data-stress-and-anxiety-linked-to-worse-recovery)).
  Anti-pattern by name: **the red verdict** — red applied to outcomes the
  user cannot act on today (a body-weight number, a missed week). Red is
  tolerable only where it indexes a *reversible capacity decision* (ease
  back next session).
- **"Behind" as a state name.** Naming the third state "behind" (the
  round-1 seed's "ahead/on-track/behind") frames the plan as a debt and
  generalises wrongly: on volume surfaces, being *ahead* of plan means
  exceeding your recoverable limit — a bad state. A progress-race
  vocabulary cannot describe capacity surfaces; an action vocabulary can
  (§A2). MacroFactor's adherence-neutral stance and the house no-shame
  rule both rule "behind" out.
- **Two parallel semantic systems.** Apps that bolt a new status palette
  beside an existing success/warning/error set end up with the Power BI
  RAG mess — the same hue meaning different things on different screens
  ([Smart Frames](https://smart-frames.co.uk/2025/01/23/rethinking-rag-colours-in-business-intelligence-tools/)).
  Volyume already has the embryo of this problem: `volumeStatusColors`
  maps five statuses onto success/warning/error (theme.js:333-340) while
  CoachOutput hand-rolls `trend.onTarget ? success : error`
  (CoachOutputScreen.js:1377-1380). The grammar must *absorb* the
  existing tokens, not duplicate them.
- **Utility-first dashboards.** NN/g-cited research: users abandon
  dashboards that are too complex; progressive disclosure cuts cognitive
  load up to 55% (round-1 doc §2#3,
  [UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)).
  Volyume's Home is the inverse of Oura's pattern today: three utility
  cards push the hero ~150pt down, and on a 5.4" phone "Start workout"
  can sit near the fold (baseline §4, Home row). Anti-pattern by name:
  **the inverted pyramid** — secondary glanceables above the primary
  action.
- **Burying the ritual.** The opposite failure also exists: collapsing
  the weight card into a passive stat tile that needs 2–3 taps to log
  would break the morning weigh-in habit the coach depends on (EWMA,
  TDEE). The strip must keep one-tap logging (§B3) or Part B fails even
  though the hierarchy improves.

## 3. User psychology

- **Moment of need.** Morning open: log weight (the scheduler already
  sends "hop on the scales" copy, `scheduler.js:56-59`). Pre-gym open:
  start the session. The screen must serve both without either burying
  the other: hero first for the all-day case, a time-aware expanded
  weight cell for the morning case (§B3). Colour states answer their own
  moment of need: "do I need to do anything about this number?" answered
  pre-attentively, before reading.
- **Habit loop.** Cue: morning notification → open app → weight cell
  already open for input. Action: type, Log. Reward within seconds: cell
  collapses to a ticked value with the micro-sparkline — the "system
  received it" acknowledgement. For the grammar: cue is any glance at a
  state surface; reward is *not having to read* — Whoop's entire value.
- **Effort budget.** Part B removes ~86pt of vertical scanning and two
  card borders from every single Home visit; logging taps stay equal
  (§B3 maths). Part A removes reading: one legend learned once replaces
  per-screen interpretation.
- **Emotional safety.** The grammar is built around the no-shame rule:
  no red on body weight ever (MacroFactor precedent), no caution colour
  on rest (Gentler Streak precedent), no third state at all on streaks
  and recaps (COMP-018's "never red" inherits a formal rule instead of a
  one-off promise). Surface classes in §A4 make this enforceable rather
  than aspirational.
- **Word-of-mouth surface.** "It never shouts at you" is a tellable
  property — MacroFactor reviews repeat it verbatim about red numbers.
  The screenshot moment is the recap/trend card wearing calm colours
  where competitors wear alarms.
- **Trust mechanics.** A state colour is a claim; every act-state surface
  must carry the plain-English line explaining it (the house "show your
  working" pattern), e.g. the volume bar's status line. Colour never
  appears without its reason within one tap.

---

# PART A — The state-colour grammar

## A1. What exists (code ground truth)

- Identity/action: `primary` #F5A623, `primaryFill`, `primaryDim`,
  `primaryBg` (theme.js:31-34). Amber is brand and interaction, used in
  ~every screen.
- Semantic status: `success` #4CAF50, `warning` #FFC107, `error` #F44336
  with Bg variants (theme.js:37-42).
- CVD machinery: `applyAccessibility` boot-time swap, Okabe–Ito based:
  success → #56B4E9, error → #CC79A7; "amber primary and warning yellow
  are kept" (theme.js:162-192).
- The precedent for state aliasing: `volumeColors` and
  `volumeStatusColors` are **lazy getters over the semantic tokens** so
  CVD swaps propagate (theme.js:321-346, test in
  `src/styles/__tests__/volumeStatusColor.test.js`). This is the exact
  mechanism the grammar generalises.
- Current inconsistencies the grammar must absorb (mention-not-fix until
  this ships): CoachOutput weight-trend chip colours a *body-weight*
  trend with `error` when off-target (CoachOutputScreen.js:1377-1380);
  BodyMetrics deltas colour weight movement success/error
  (BodyMetricsScreen.js:1027); the Home deload banner icon uses `warning`
  for a rest-positive message (HomeScreen.js:856). 144 `colors.warning`
  usages across 37 files; 71 `colors.error` usages (grep, 2026-06-10).
- `docs/rules/styling.md` lists an older hex set (#10B981/#EF4444) that
  predates theme.js; theme.js is the live source of truth. Flagged as an
  observed doc inconsistency only.

## A2. The vocabulary decision: **on track / watch / act** (not ahead/on-track/behind)

The three states are an **action vocabulary**, not a progress vocabulary:

| State | Token name | Meaning (the contract) | User-facing register |
|---|---|---|---|
| **on track** | `stateOnTrack` | Nothing needed. Inside the productive band. | "On track", "Inside your band" |
| **watch** | `stateWatch` | Worth a look. Approaching a limit or drifting. No action demanded. | "Close to your weekly limit", "Drifting above your band" |
| **act** | `stateAct` | The coach suggests a concrete, reversible change. | "Past your weekly limit. Ease back next session." |

Why not ahead/on-track/behind:

1. **It does not generalise.** On volume bars, "ahead of plan" = over
   MRV = the worst state; on a trend card, "ahead" of a loss target can
   be the rapid-loss safety condition. A progress vocabulary gives the
   same word opposite valences on different surfaces, which destroys the
   learned-once property that is the entire point.
2. **"Behind" is a shame state.** It frames the plan as a debt owed to
   the app. The shared brief's emotional-safety lens ("no shame states"),
   COMP-018's "never red" streak rule, and the ED-safety posture all
   demand framing where the user is never *in deficit to the product*.
   MacroFactor's adherence-neutral evidence (§1#4) shows the no-shame
   frame is also the commercially praised one.
3. **Action framing fits the coaching voice.** The deterministic coach
   already speaks in holds and adjustments ("calories hold", per-row
   Apply, held decisions). Colour-as-recommended-action makes the
   grammar an extension of the coach, not a grading system. Note the
   deliberate avoidance of "hold" as a state name: in house copy "hold"
   is a *positive* outcome (calories hold = inside band), so the round-1
   sketch "on-target/caution/hold" would collide with existing meaning.

User copy never names the states ("state: watch" appears nowhere); the
vocabulary lives in token names, the legend, and the register of the
accompanying line.

## A3. The hues — one semantic system, one retune

**Decision: the states ARE the semantic tokens.** `stateOnTrack/Watch/Act`
are exported as lazy getters aliasing `success/warning/error`, exactly as
`volumeStatusColors` already does. No second palette, no new swap
machinery: CVD variants come free via the existing `applyAccessibility`
swaps, and `volumeStatusColor()` becomes the first consumer of the
generalised grammar rather than a parallel system.

**The one retune: `warning` moves off the amber axis.** Today
`warning` #FFC107 sits ~7° of hue from brand amber #F5A623; on `surface`
cards a yellow status dot and an amber action chip are not reliably
distinguishable, and under the CVD palette both are kept, so the
collision is worse exactly where care is highest. The watch state must
not read as "tap me" (amber = interactive, per the token comments and
styling rules). Proposal:

- `warning`: #FFC107 → **#F0E442** (Okabe–Ito yellow), `warningBg` →
  `rgba(240, 228, 66, 0.15)`.
- Properties: it is the *same* colour in the default and CVD palettes
  (already deuteranopia/protanopia-tested as part of Okabe–Ito,
  [reference](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference));
  it is ~20° greener and markedly lighter than amber (satisfying the
  "yellow significantly lighter" luminance rule,
  [UX Collective](https://uxdesign.cc/beautiful-accessible-traffic-light-colors-b2b14a102a38));
  it passes WCAG 1.4.11 (≥3:1) on every surface in the elevation ladder
  by a wide margin (luminance ≈ 0.76 vs background 0.005).
- Blast radius: one hex in one file propagates to all 144 call sites.
  The migration audit (§A6) is about *semantic* misuse of warning, not
  mechanical breakage. **[FOUNDER SIGN-OFF]** on the hue itself — it is
  brand-adjacent.
- Fallback if the founder rejects the retune: ship the aliases with
  `warning` unchanged and manage the collision by role separation only
  (state colours only ever appear as dots/bars/chip-tints paired with an
  icon, never as tappable fills). Weaker, still coherent.

`stateOnTrack` (success #4CAF50 / CVD #56B4E9) and `stateAct`
(error #F44336 / CVD #CC79A7) are untouched.

**Non-colour channel is mandatory.** Every state rendering pairs the
colour with an icon or label (WCAG 1.4.1; existing house practice). The
canonical pairings: on track = checkmark or filled band; watch = eye /
"approaching" wording; act = the plain-English action line. Never a bare
coloured dot.

## A4. Where the grammar applies — the three surface classes

The enforceable core of the design. Every surface that renders a state
is assigned a class; the class caps which states may appear.

**Class A — capacity and training-load surfaces. Full grammar (all 3
states).**
- Volume bars + body heatmap (`VolumeBars.js`, `VolumeHeatmapScreen.js`)
  — already wired through `volumeStatusColor`; mapping stays: below/
  unknown = muted (no state), minimum/near_mrv = watch, optimal =
  on track, over_mrv = act.
- Visible-autoregulation lines (COMP-015) and WorkoutSummary attribution.
- Mesocycle/effort surfaces (COMP-010) where a limit is approached.

**Class B — body-data surfaces (weight, trend, measurements). on track +
watch ONLY; colour never on the numeral.**
- COMP-004 "Your trend" card: band state colours the band edge or a
  6×6 dot, never the weight figure; off-band caps at **watch** even when
  far off; the rapid-loss safety condition renders as the *safety
  system's own neutral presentation*, not stateAct (the safety system is
  untouchable and its calm register must not inherit alarm red).
- **No red weight numbers ever.** Weight numerals are always
  `textPrimary` with tabular figures. MacroFactor precedent (§1#4).
- Under an open ED/wellbeing flag (`getOpenEdPatternFlag`): Class B
  surfaces drop to **no state colour at all** — neutral presentation,
  consistent with COMP-004's hide-the-rate rule and calmer mode.
- Migrations this implies: CoachOutputScreen.js:1377-1380 (off-target
  trend chip error → watch cap, neutral under flag);
  BodyMetricsScreen.js:1027 (delta success/error → neutral textPrimary/
  textMuted; direction is not valence).

**Class C — emotional/behavioural surfaces (streak, recaps,
celebrations). on track + neutral ONLY.**
- COMP-018 streak: active = on track, resting/paused = neutral muted
  (Gentler Streak's inside-the-band rest, §1#5). Its "never red" rule is
  now a class property, not a promise. Suppressed entirely under
  wellbeing/ED flags per its own spec.
- Monthly/block recap cards (COMP-005): achievements in on track,
  everything else neutral. A recap never wears watch or act.
- Check-in derived chips (WeeklyCheckIn): "from your diary" confirmations
  on track when met, neutral otherwise — a missed target in a check-in
  is data, not a verdict.
- The Home deload banner icon migrates warning → neutral/primary
  (rest-positive; recovery is the coach working for you, not a hazard).

**Where the grammar must NOT appear at all:** kcal/macro totals in the
Diary (adherence-neutral, MacroFactor precedent), the rest timer, the
paywall, the Today strip's weight cell numeral (§B3), and anything inside
`src/coaching/safety/` presentation (calm register is locked).

**Learned once.** One legend, written once: a three-row "What the colours
mean" block inside the existing methodology surface (COMP-006's screen
under You) and linked from the first Class A surface via the existing
InfoTooltip pattern. No onboarding interruption.

## A5. Copy direction (house voice, British English, no em dashes)

- Watch, volume: "Chest is close to your weekly limit."
- Act, volume: "Past your weekly limit. Ease back next session."
- On track, trend (COMP-004 host): "Trending inside your band. Calories hold."
- Watch, trend: "Drifting a little above your band. Nothing to change yet."

Register rule: watch copy states a fact and explicitly withholds demand
("nothing to change yet"); act copy names one reversible action. No
exclamation marks, no "you're behind", no "off track" (negation of the
positive state reads as judgement).

## A6. Token spec and migration audit

```js
// theme.js — alongside volumeColors (same lazy-getter pattern, A2-038)
export const stateColors = {
  get onTrack() { return colors.success; },
  get watch()   { return colors.warning; },
  get act()     { return colors.error; },
  get neutral() { return colors.textMuted; },
};
// Bg variants resolve the same way (successBg/warningBg/errorBg).
```

Migration audit (semantic, staged after the alias ships):
1. `volumeStatusColors` internals re-point to `stateColors` (no visual
   change; one system).
2. The three Class B/C violations named in §A4 (CoachOutput trend chip,
   BodyMetrics delta, deload banner icon).
3. Sweep of the 144 warning / 71 error usages classifying each as
   state-use (inherits grammar), form-validation use (error stays
   error — input validation is not a coaching state), or destructive-
   action use (stays error). Output: a one-page table appended to this
   doc at implementation time. No bulk recolour beyond the warning hex.

Tests: extend `src/styles/__tests__/volumeStatusColor.test.js` with
stateColors resolution + CVD-swap propagation; engine-invariant tests
untouched (colour is presentation only).

---

# PART B — Home hierarchy: the Today strip and the hero-first order

## B1. What exists (code ground truth, HomeScreen.js)

Render order today: ScreenHeader + greeting (~764) → schedule context
line (~767) → ONE prioritised banner (phase ~787 / coach ~813 / deload
~847; priority logic at 748-752 caps noise at one) → cold-load skeletons
(~880) → **weight card** (Pro, ~889: inline TextInput flow, st/lbs/kg
variants, optimistic `logMorningWeight`, 64×20 Sparkline once logged) →
**StepsCard** (Pro, ~979: self-hides without data, 30s focus poll) →
**CardioCard** (Pro, ~985: always renders when enabled; the LogCardio
entry point) → Pro teaser (free tier, ~1003) → first-run cue (~1035) →
**hero** (~1056: continue card / next-workout card with eyebrow, name,
meso chip, coach brief, Start+View, two secondary pills / no-plan stack)
→ last session (~1280) → nudges. The three utility cards share an
identical visual shell (surface, 1px border, radius.md, sm vertical
padding — StepsCard.js:94-105 "matches the morning-weight card… so the
two sit together as a pair"): they are already a strip in spirit,
rendered as three stacked cards costing ~150pt before the primary action
(baseline §4).

## B2. Placement decision: hero first, strip directly under the hero

**Order after change:** header → schedule line → one banner →
**session hero** → **Today strip** → last session → nudges.

The evidence-based call on the morning ritual: hero-first does **not**
bury the weigh-in.

- Geometry: hero card ≈ 280–320pt incl. CTA rows; header + schedule +
  banner ≈ 150pt. The strip's top edge lands at ≈ 440–470pt — above the
  fold on a 6.1" (~800pt usable) and still visible on 5.4" (~700pt).
  The ritual moves one glance down, not off screen.
- The morning case gets a stronger answer than position: a time-aware
  **morning-expanded state** (§B3) that renders the weight cell with its
  input open before the first log of the day, which is more salient than
  today's always-compact input row, not less.
- The "one big thing" evidence is unambiguous that the day's action leads
  (Oura, Apple rings, Whoop recovery — §1); and the audit's verbatim
  weakness is the hero below ~150pt of utility (baseline §4). Putting
  the strip above the hero would shrink the problem (~64pt vs ~150pt)
  but keep its shape; the brief's streamlining rule says fix the shape.
- Guardrail: weigh-in completion is metric #2 (§8). If it drops, the
  fallback is pinning the *expanded* weight cell above the hero during
  the morning window only — a contingency, not the design.

The free-tier Pro teaser (~1003) currently also sits above the hero; it
moves below the hero with the same reorder (hero-first applies to both
tiers; the teaser is a nudge, not the big thing). Banner priority logic
(748-752) is untouched: the strip is not a banner and does not enter
that contention; at most one banner still renders above the hero.

## B3. The Today strip — anatomy and interaction spec

One card, same shell as today's cards (surface, 1px border, radius.md),
height ~64pt compact, containing up to three cells split by
`borderSubtle` hairlines (the inside-a-card divider token):

```
┌──────────────────────────────────────────────┐
│  WEIGHT          │  STEPS        │  CARDIO   │   caption, textMuted
│  82.4 kg ✓ ▁▂▃▅  │  6,214        │  + Log    │   num('title'), textPrimary
└──────────────────────────────────────────────┘
```

- **Cell label:** `type.caption`, textMuted, uppercase per house pattern.
- **Cell value:** `type.num('title')` tabular, textPrimary. The strip
  raises the type floor from today's xs=11 Log-button text to sm=13+
  (the COMP-001 de-chipping rule applied to Home).
- Cells are full-height touch targets (64pt ≥ 44pt floor).

**Weight cell (the load-bearing one).**
- *Empty, morning window* (no weight today AND local time before 11:00
  AND no active session): the cell renders **expanded** — the strip grows
  to two rows and hosts the existing input row verbatim (the same
  TextInput flow, st/lbs/kg + stone two-field variant, same
  `handleLogWeight` optimistic write, same prefill-on-edit behaviour).
  Tap count to log: focus input (1) → type → keyboard Done. Identical to
  today. The 11:00 boundary matches the morning notification ritual
  (`scheduler.js` NOTIF_ID_MORNING).
- *Empty, after the window:* compact cell shows "Log" with the scale
  icon; one tap expands in place with autofocus (1 tap + type + Done —
  one tap more than today's always-open input, in exchange for ~86pt of
  permanent screen recovery; the morning state covers the case that
  matters).
- *Logged:* value + success-tick (this tick is the on-track state's only
  appearance in the strip: confirmation of an action, not a judgement of
  the number) + the existing 14-entry micro-sparkline (Sparkline,
  `colors.primary` line — identity colour, NOT a state colour, per
  Class B). Tap → edit (prefilled, exactly today's edit path).
- *ED/wellbeing flag open:* value only; no sparkline, no trend mark
  (consistent with COMP-004's hide-the-rate rule).

**Steps cell.** Glance-only, non-interactive (as today). Self-hides when
no figure exists (StepsCard's null-return behaviour); remaining cells
stretch. Value `6,214`, with `of 10,000` in the caption line when a
target exists. No state colour in v1: steps feed the coach as
confidence damping (COMP-026), they are not a graded target. Re-assess
only if a steps target becomes a coached commitment.

**Cardio cell.** Keeps its double duty: shows `20 min` when logged
today, `+ Log` otherwise; tap → `LogCardio` (the existing entry point
must not be lost — it is the only Home affordance for cardio logging).
Hidden when `cardioEnabled === false`.

**Degradation ladder:** 3 cells → 2 (no steps data or cardio off) → 1
(weight only; renders as today's single weight card, effectively) → 0
(free tier: no strip at all; gating unchanged, all three sources are
Pro today — no Pro exposure to free, no free feature regated).

**Offline:** unchanged by design — every cell reads/writes SQLite
(`logMorningWeight`, `getDailyStepsToday`, `getCardioLogForDate`); sync
stays in the sync layer.

**Skeletons:** cold-load skeleton order updates to match (hero-shaped
160pt first, strip-shaped 64pt second) so the skeleton teaches the same
hierarchy as the content.

**COMP-004 interaction:** the full "Your trend" card does **not** live
in the strip (its candidate hosts are Diary top or Progress, per the
integration map; the strip is a glance, not a chart). The logged weight
cell becomes the Home *door* to it: tap-through from the logged state to
wherever COMP-004 lands. One surface, one door, no duplication.

## B4. Wireframes — 6.1" (390pt wide, ~800pt usable), Pro, plan active

**BEFORE (today)**                          **AFTER**

```
┌ Train · Good morning, Sam ┐               ┌ Train · Good morning, Sam ┐
│ Today is a training day   │               │ Today is a training day   │
├───────────────────────────┤               ├───────────────────────────┤
│ ⚡ Coach review banner     │               │ ⚡ Coach review banner     │
├───────────────────────────┤               ├───────────────────────────┤
│ ⚖ Morning weight [__] Log │ ~40pt         │  DAY 3 OF 5               │
├───────────────────────────┤               │  Pull: Back & Biceps      │
│ 🚶 6,214 steps today      │ ~36pt         │  6 exercises              │
├───────────────────────────┤               │  Week 2 of 5 · stop 2     │
│ ♥ Log cardio            + │ ~36pt         │  short of failure         │
├───────────────────────────┤               │ ┌───────────────────────┐ │
│  DAY 3 OF 5               │ ← hero        │ │ ▶ Start workout │View │ │
│  Pull: Back & Biceps      │   starts      │ └───────────────────────┘ │
│  6 exercises              │   ~150pt      │  Change workout · Blank   │
│  Week 2 of 5 · stop 2     │   later       ├───────────────────────────┤
│  short of failure         │               │ WEIGHT   │ STEPS │ CARDIO │ ← strip
│ ┌───────────────────────┐ │               │ 82.4 ✓▂▃ │ 6,214 │ + Log  │   64pt
│ │ ▶ Start workout │View │ │ ← CTA         ├───────────────────────────┤
│ └───────────────────────┘ │   near        │ Last session              │
│  Change workout · Blank   │   fold        │ Push: Chest…    [Repeat]  │
└───────────────────────────┘               └───────────────────────────┘
```

**AFTER, morning state (before first log, pre-11:00):**

```
├───────────────────────────────────────────┤
│ MORNING WEIGHT                            │
│ [ 82.4 ] kg                       [ Log ] │  ← existing input row, rehosted
│ STEPS  6,214        │  CARDIO  + Log      │
├───────────────────────────────────────────┤
```

## B5. Accessibility

- Cells: `accessibilityRole` button where tappable; labels in full
  sentences ("Weight 82.4 kilograms logged today. Tap to edit.",
  "Log cardio."). Steps cell is plain text.
- 44pt floor met by full-height cells; the expanded input row keeps the
  existing field sizes.
- Larger-text mode: cells wrap to a 2+1 grid rather than truncate
  (weight full-width row, steps+cardio below) — the strip is a layout,
  not a fixed band.
- State colours always icon-paired (§A3); the strip itself carries no
  state colour except the logged tick.
- Stone display in the compact cell: "12st 7" via `formatBodyWeightShort`
  (exists) to fit a third-width cell.

---

## 5. Whole-package integration

- **COMP-001 reuse (the de-chipping philosophy applied to Home):** same
  three moves, same order — consolidate N parallel mechanisms into one
  surface (3 cards → 1 strip, as 4 use-previous mechanisms → 1 beat
  line); raise the interactive type floor (xs=11 Log button → sm=13);
  put the primary action first and everything else one level down
  (logged sets above the fold ↔ hero above the strip). Reviewers should
  read the two blueprints as one pattern.
- **COMP-004:** the strip is its Home door (tap-through), never its
  host; Class B caps its colours at watch; ED flag drops colour and rate
  together.
- **COMP-018 / COMP-005:** Class C makes "never red" structural for the
  streak and recaps; the recap inherits on-track-or-neutral for free.
- **COMP-010 / COMP-015:** Class A gives visible periodisation and
  autoregulation lines their state colours without inventing any.
- **COMP-026:** surfaces behind COMP-004; steps cell stays neutral so
  the confidence story has one home.
- **COMP-029 (light theme):** the grammar adds zero new swap machinery —
  three lazy getters over tokens the light palette must already define.
  Choosing Okabe–Ito yellow now (works on light and dark) avoids a
  second warning retune later.
- **Streamlining effect:** net surfaces on Home go from 3 utility cards
  + hero to hero + 1 strip; nothing new is added anywhere; one screen,
  two components retired into one.
- **ED/wellbeing flags:** Class B/C suppression rules above; the strip's
  behaviour under an open flag is specified (value-only weight cell);
  banners and safety surfaces untouched.
- **Duplication avoided:** no second status palette (states alias
  semantic tokens); no trend chart on Home (COMP-004 owns it); no new
  cardio/steps surfaces (cells re-host the existing components' logic).

## 6. Retention & word-of-mouth mechanics

The loop this feeds is the daily open-and-act loop: open → one big
thing → start. Cutting scan cost on the highest-frequency screen
compounds across every session (the same argument that made COMP-001
tier 1). The grammar feeds the trust loop: state colours that never
shout make the coach's holds legible at a glance, and "it never turns my
weight red" is a tellable, screenshottable property in exactly the way
MacroFactor's reviews demonstrate (§1#4). The morning-expanded weight
cell protects the weigh-in habit that powers the coach's most-trusted
outputs (trend, TDEE), which is the engine of the "it knew I was
stalling" word-of-mouth moment.

## 7. Beating the benchmark

Whoop's grammar is learned once but is morally loaded: its red is a
verdict the company's own coaching content has to soften ("a caution
light, not a stop sign"), and its colours grade states the user cannot
act on today. Volyume's grammar keeps the learned-once contract but
swaps the axis from judgement to action (on track / watch / act), then
goes further than any comparator by making emotional safety a *class
system in the tokens* — body data structurally cannot wear red, rest
structurally cannot wear caution — rather than a per-screen editorial
choice. Oura's one-big-thing hierarchy is matched on Home, but where
Oura's glance row is read-only, Volyume's strip keeps a working
one-tap input in it (the morning weigh-in), so the collapse costs zero
function. CVD users get a first-class palette (Okabe–Ito throughout,
identical watch hue in both modes), which none of the surveyed leaders
document.

## 8. Measurement

1. **Time-to-start:** median seconds from Home focus to Start-workout
   tap (existing session telemetry window) — expect a fall.
2. **Weigh-in guardrail:** morning weights logged per Pro user-week —
   must not drop >5% post-ship (the Part B failure detector).
3. **Cardio entry guardrail:** cardio logs per enabled user-week
   unchanged (the cell must keep working as the entry point).
4. **Scroll-before-start:** share of sessions started with zero Home
   scroll (proxy: scroll offset at Start tap if the allowlist permits;
   otherwise omit rather than extend telemetry).

## 9. Build notes

- **Files:** `src/styles/theme.js` (stateColors getters; warning hex +
  warningBg retune **[FOUNDER SIGN-OFF on hue]**),
  `src/styles/__tests__/volumeStatusColor.test.js` (extend),
  new `src/components/TodayStrip.js` (absorbs StepsCard + CardioCard
  logic and the weight card's input flow; the two small components
  retire), `src/screens/HomeScreen.js` (reorder ~880-990 block below the
  hero; move weight state/handlers into the strip or pass down; skeleton
  order; free-tier teaser reorder), then the three Class B/C migrations
  (CoachOutputScreen.js:1377-1380, BodyMetricsScreen.js:1027,
  HomeScreen deload icon).
- **No schema, no engine, no billing, no safety-system changes.** Colour
  and layout only; `handleLogWeight`, `logMorningWeight`, steps/cardio
  loaders are re-hosted, not rewritten.
- **Reuse:** lazy-getter alias pattern (volumeStatusColors),
  `withAlpha`, `formatBodyWeightShort`, Sparkline, the existing weight
  input row JSX near-verbatim, banner priority logic untouched.
- **Effort sanity-check:** approved effort 4. Part A ≈ 1–2 days (tokens,
  aliases, 3 migrations, tests, call-site classification table); Part B
  ≈ 3–4 days (TodayStrip, reorder, expanded/morning states, small-screen
  and larger-text layouts, tests). Within score; the call-site sweep is
  the elastic item — timebox it to classification, not recolouring.
- **Risks:** (1) weigh-in completion drop if the morning-expanded state
  underperforms — guardrail metric + the pinned-morning fallback in §B2;
  (2) warning-hue retune surprising in non-state contexts — staged
  behind the classification sweep, fallback keeps #FFC107; (3) keyboard
  interaction with the expanded cell under the hero — ScrollView
  already uses `keyboardDismissMode="on-drag"`, verify auto-scroll into
  view on focus during implementation.
