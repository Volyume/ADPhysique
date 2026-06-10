# impl-COMP-024 — Cycle-robust weight-trend smoothing (automatic, no tracking)

> Round-2 implementation blueprint. Maths + product change that makes the
> trend engine robust to menstrual-cycle (and weekend/sodium/creatine)
> water-weight excursions **without tracking cycles**. Pure-function change
> + fixture tests + founder maths review. No code in this PR.
> Charter: `impl-00-shared-brief.md`. Map row: `impl-00-integration-map.md`
> (COMP-024). Seed: `../competitive-audit-03-master-proposals.md` (COMP-024,
> Tier 4, IMPACT 6 · EFFORT 3 · PRIORITY 2.0).

---

## 0. Source-of-truth read (verified against code 2026-06-10)

Two deliberate EWMA variants exist and must stay distinct:

- `src/lib/nutritionEngine.js` `computeEWMA(weightData, alpha=0.28)`
  (~3.5-day memory) — diet-planning surfaces (BodyMetrics, CoachOutput
  nutrition trend, adaptive-TDEE input). Output `{ ...point, ewma }`.
- `src/lib/weeklyCoach.js` `computeEWMA(weights, alpha=0.1)` (~10-day
  memory) — the weekly-coach trend signal and **the rapid-loss /
  ED-pattern detector signal**. Output `{ loggedAt, rawKg, ewmaKg }`.
  The shapes differ on purpose so callers cannot swap them silently
  (comments at both definitions say so).

Safety-critical consumers of the slow series (these read the trend that
fires safety actions — do not let smoothing weaken them):

- `weeklyCoach.computeWeeklyTrendPct` → `getLatestEwma` /
  `getEwmaSevenDaysAgo` (alpha 0.1) → feeds `detectEdPatternFlag` signal
  `s1` rapid_loss (`src/lib/edPatternDetector.js`,
  `RAPID_LOSS_PCT_PER_WEEK = -1.5`).
- `weeklyCoach` `actualRatePct` (lines ~538-544) → `rapidLossOverride`
  (lines ~646-651) and `rapidWeightLossFlag` (lines ~896-901). Both gate
  on `actualRatePct <= -1.5 && energyScore <= 2 && !cycleOverride`.

The manual flag (verified): `src/lib/cyclePrefs.js`
`shouldShowCycleQuestion(sex, enabled)` requires `enabled===true && sex==='female'`
(Article-9 opt-in, AsyncStorage, not synced). `WeeklyCheckInScreen.js`
collects `cycle` → writes `checkin.cycleOverride` (line ~569). In
`weeklyCoach`, `cycleOverride` (line 510) **holds calorie changes**
(`canAdjustCals` line 654), **suppresses the rapid-loss boost** (line
648), **suppresses the rapid-loss flag** (line 900), and emits a
held-decision row (line ~1086). The flag is an ACTION hold, not a trend
filter. COMP-024 must keep that seam intact: smoothing fixes the
*reading*; the flag holds *decisions*.

---

## 1. Best-in-market bar

**MacroFactor — Expenditure V3 (Oct 2024), the single best, and the named
reference.** Its published claim is exactly COMP-024's brief: V3 makes the
trend/expenditure engine robust to "momentary fluid retention from carb-
and salt-rich meals, fluid retention from creatine supplementation, and
fluid retention associated with ovulation or menses" with "a smaller
impact on estimated expenditure" — and crucially **"this improvement
doesn't require period tracking to apply"**
([MacroFactor, Expenditure V3](https://macrofactor.com/expenditure-v3/),
search-extract only — macrofactor.com returns HTTP 403 to direct fetch;
verified via two independent search extracts 2026-06-10). Three design
lessons MacroFactor publishes that we adopt:

1. **They frame it as a stability/responsiveness frontier, not a cycle
   feature.** "You can't simultaneously maximise both stability and
   responsiveness." V3 "pushed beyond the efficient frontier" of V2 —
   more stable to transient noise AND 2-4 days *faster* to pick up real
   trend changes ([Expenditure V3](https://macrofactor.com/expenditure-v3/);
   [mm-October-2024](https://macrofactor.com/mm-october-2024/)). The
   marketing never says "we handle your period" — it says "more robust to
   water-weight". This sidesteps both medical claims and creepiness.
2. **Trend on trended weight, never raw.** "MacroFactor's energy
   expenditure calculation relies on changes in trended weight to avoid
   over-reacting to short-term weight fluctuations" — they smooth first,
   infer second ([Expenditure V3](https://macrofactor.com/expenditure-v3/)).
3. **Resilience to missing data** as a stated requirement (V3 unpauses on
   3 days). Our smoother must degrade gracefully on sparse logging — the
   existing `>=3` / `>=4` gates already do this; the new filter must not
   raise the bar.

**Robust-statistics literature (the maths reference).**
- *Robust EWMA via innovation downweighting* — Duran-Martin's "robust
  EWMA" downweights the innovation (the residual between the new reading
  and the current estimate) by a Welsch/Huber weight, so a large surprise
  moves the estimate less; EWMA is the unit-coefficient special case of a
  Kalman filter, which makes the robust variant a one-line change to the
  update ([grdm.io/posts/wolf-ewma](https://grdm.io/posts/wolf-ewma/),
  search-extract only — 403 to direct fetch; corroborated by
  [tandfonline 10.1080/07408179008964190](https://www.tandfonline.com/doi/abs/10.1080/07408179008964190)
  on EWMA-as-Kalman).
- *RobustTrend (Huber loss)* — Huber loss suppresses outliers while a
  difference penalty still tracks genuine slow + abrupt change; confirms
  Huber as the principled clamp for a trend that must follow real shifts
  but ignore spikes ([arXiv:1906.03751](https://arxiv.org/pdf/1906.03751)).
- *Median-of-window prefilter* — robfilter trims/winsorises a moving
  window before fitting (standard robust-trend practice; same source
  family). A median is the optimal-breakdown location estimator and is
  pure, O(w log w), trivially unit-testable.

**Physiology (the magnitude/timing reference, for sizing the clamp).**
- Kanellakis 2023 (Am J Hum Biol): body weight was **0.450 kg higher
  during menstruation vs the first cycle week, due to extracellular
  water**, with no change in fat mass — the controlled-study central
  estimate ([Wiley 10.1002/ajhb.23951](https://onlinelibrary.wiley.com/doi/full/10.1002/ajhb.23951);
  [PubMed 37395124](https://pubmed.ncbi.nlm.nih.gov/37395124/), abstract
  search-extract — 403 to direct fetch).
- Individual variation runs larger: clinically commonly cited as **~1-3
  kg** (and up to ~2.3 kg / 5 lb in some people), peaking in the **luteal
  phase / around menses**, affecting ~92% of menstruating people in the
  luteal phase ([Clue](https://helloclue.com/articles/diet-and-exercise/do-you-gain-weight-on-your-period-here-s-what-to-know);
  [Nutrisense](https://www.nutrisense.io/blog/period-weight-gain)).

**Design target derived from the above:** the filter must damp a recurring
**1.5 kg, ~5-day excursion** (worst-realistic monthly case) heavily, while
adding **<2-3 days of lag** to a genuine 0.3 kg/week trend — i.e. stay
inside MacroFactor's published "more stable AND faster" frontier rather
than just slowing the EWMA down (which trades robustness for lag and
*hurts* the safety detector).

---

## 2. What fails (anti-patterns to avoid by name)

- **Just lowering alpha (longer memory).** A plain slower EWMA damps the
  excursion only by also lagging the real trend — the exact trade
  MacroFactor says V3 escaped. Worse: it lags the rapid-loss signal too,
  weakening safety. **Banned as the sole mechanism.**
- **bioSex-conditioned smoothing.** Branching the maths on recorded female
  sex re-introduces special-category inference into the deterministic
  engine, contradicts the charter's no-PII / universal posture, and
  reads as creepy ("the app changed its maths because it thinks you're
  menstruating"). Round-1 research already flags MacroFactor's *non*-
  conditioned approach as the bar (`competitive-audit-01-nutrition-coaching-research.md`
  §"Cycle awareness", line ~407). **Rejected — see §4b.**
- **Auto-detecting cycles from the weight pattern.** Periodogram/FFT on
  weigh-ins to infer a cycle = de-facto cycle tracking without consent.
  Hard-no (Article 9, creepiness, and it would be a medical inference).
- **Mentioning periods in universal copy.** Any user-facing string that
  says "cycle/period" on the trend chart is both a medical claim risk and
  creepy for the ~half of users it doesn't apply to. Robustness is
  communicated as "water weight", never "your cycle" (MacroFactor's exact
  move).
- **Smoothing the series the safety detector reads.** The single failure
  mode (§4d). A heavily damped trend that hides a genuine -1.8%/wk drop
  would suppress `rapidLossOverride` and `detectEdPatternFlag` s1 — an
  ED-safety regression. Untouchable per CLAUDE.md and charter constraint 3.

---

## 3. User psychology (lenses applied)

- **Moment of need:** a menstruating user weighs in mid-luteal, sees +1.2
  kg, and on Sunday the coach must NOT read it as fat gain or cut harder.
  The win is invisible: the trend line barely moves and the coach holds
  calmly. The reward is *the absence of a wrong number*.
- **Habit loop:** cue = daily weigh-in; the visible reward is a trend line
  that "ignores the spike" — the screenshot-worthy moment is "I jumped
  1 kg overnight and the trend didn't flinch." That's the tellable line,
  and it's true for everyone (weekend carbs, a salty meal), not just one
  sex — which is *why universal wins*.
- **Effort budget:** removes the need to manually flag the cycle to get a
  sane reading. The manual flag stays available for users who want the
  explicit calorie-hold, but the default experience needs no action.
- **Emotional safety:** a trend that doesn't spike on water weight prevents
  the "I gained, I must cut harder" shame spiral the ED system guards
  against. The smoother is *pro*-safety on the upside and must be
  *neutral* on the downside (never mask a real loss).
- **Trust mechanics:** the chart already shows raw dots + trend line
  (BodyMetrics). Keep both visible so the user can see the smoother
  "absorbing" the spike — show the working, per the house pattern.

---

## 4. The Volyume implementation

### 4a. The maths — three candidates, all pure & unit-testable

All operate on the **slow (alpha 0.1) weekly-coach series** as the primary
target (that is where cycle noise corrupts coaching decisions) and
optionally the fast (0.28) series for display. All are drop-in functions
in `src/lib/weeklyCoach.js` / `nutritionEngine.js` with a feature-flag
parameter (default off in phase 1 → shadow mode, §6). **None changes the
default behaviour until the founder review + shadow comparison passes.**

Notation: daily readings `x_t`, current trend estimate `m_t`, innovation
`r_t = x_t - m_{t-1}`, robust scale `s` (kg).

---

**Candidate A — Robust-innovation EWMA (Huber-clamped update).** *Recommended.*

Plain EWMA: `m_t = α·x_t + (1-α)·m_{t-1}` = `m_{t-1} + α·r_t`.
Robust version clamps the innovation before applying it:

```
r_t   = x_t - m_{t-1}
c     = k · s                    // Huber knee, k≈1.5, s = robust scale (below)
r*_t  = sign(r_t) · min(|r_t|, c) // Huber clamp; alt: Welsch soft weight
m_t   = m_{t-1} + α · r*_t
```

So a +1.2 kg overnight jump (luteal water) with `s≈0.4 kg`, `c≈0.6 kg`
contributes only `α·0.6` to the trend instead of `α·1.2` — the excursion's
trend impact is roughly **halved per day** and, integrated over a 5-day
clamped excursion that then reverses, the trend barely moves. A genuine
0.3 kg/week drift (~0.043 kg/day) sits *well inside* the knee, so it is
**not clamped at all** — zero lag on real trend. This is the precise
property MacroFactor advertises (stable to spikes, fast to trend) and the
Duran-Martin robust-EWMA mechanism. `α` stays 0.1 (memory unchanged).

Robust scale `s`: MAD of the last N (≈14) innovations,
`s = 1.4826 · median(|r_i - median(r)|)`, floored at a constant (e.g.
0.25 kg) so early/low-variance data doesn't produce a near-zero knee that
clamps everything. Pure, O(N log N), deterministic.

*Asymmetric option (strongly recommended for the safety seam):* clamp
**upward** innovations (water-weight gains) at `k·s` but leave
**downward** innovations **unclamped or clamped at a much wider knee**
(e.g. `4·s`). Rationale: water-weight excursions are overwhelmingly
*gains* that revert; a genuine rapid *loss* must pass through to the
safety detector undamped. This directly resolves §4d on the maths side.

---

**Candidate B — Median-of-window prefilter → EWMA.**

Before smoothing, replace each day with the median of a centred (or
trailing, for causality) window of W=5 daily readings, then run the
existing EWMA on the prefiltered series:

```
y_t = median(x_{t-W+1} … x_t)     // trailing median, W=5
m_t = α·y_t + (1-α)·m_{t-1}        // existing EWMA, α unchanged
```

A 5-day median completely rejects a ≤2-day spike and substantially damps
a 5-day excursion (the median of a symmetric 5-day bump tracks its
shoulders, not its peak). Genuine monotone trend passes through a median
with a fixed lag of ~⌊W/2⌋ days (≈2). Simplest to reason about and
explain; the trailing-window form is fully causal. Downside: a *trailing*
median lags ~2 days symmetrically — including on a real loss, so it has
the **same masking risk** as B applied to the safety series; mitigate by
running safety off the less-filtered series (§4d).

---

**Candidate C — Dual-EWMA disagreement blend (long-memory anchor).**

Run a fast EWMA (`α_f=0.1`, current) and a slow anchor (`α_s≈0.04`,
~25-day memory). Blend by how much they disagree relative to robust scale:

```
m_t = w·fast_t + (1-w)·slow_t,   w = clamp(|fast_t - slow_t| / (k·s), 0, 1)
```

When fast and slow agree (steady trend) `w→0`-ish and the estimate is
stable; when they diverge sharply (a spike pushed fast away from slow)
the blend *also* leans on slow, damping it. This mimics MacroFactor's
"stable yet responsive" frontier but is the hardest to tune and the least
transparent to explain. Listed for completeness; **not recommended** over
A.

**Recommendation: Candidate A (asymmetric Huber-clamped robust-innovation
EWMA).** It is the closest published analogue to MacroFactor's stated
behaviour, the smallest delta from the existing code (one clamp line + a
MAD helper), preserves memory length (so no blanket lag), and its
**asymmetry is the natural place to encode the safety guarantee** — the
exact property C and B lack cleanly. Keep the median prefilter (B) as a
cheap belt-and-braces option to evaluate in shadow mode.

### 4b. Scope decision — apply to ALL users (universal), not bioSex-conditioned

**Decision: universal.** Arguments, in order of weight:

1. **The noise is universal.** Weekend carb/sodium loads, creatine, big
   training days, travel, and illness all produce multi-day water-weight
   excursions for every user regardless of sex — MacroFactor's own V3 copy
   lists "carb- and salt-rich meals" and "creatine" alongside menses as
   the *same* class of transient the algorithm absorbs
   ([Expenditure V3](https://macrofactor.com/expenditure-v3/)). A robust
   trend is simply a better trend for everyone.
2. **It sidesteps sex-conditioning entirely.** No `bioSex` branch in the
   engine → no special-category inference, satisfying charter constraint 5
   (no PII to external services) and CLAUDE.md's deterministic-engine
   posture. The maths is identical for all; nobody's data is treated as a
   medical signal.
3. **No creepiness, no medical claim.** Universal robustness is described
   as "water-weight robust", never "cycle-aware". This is precisely how
   MacroFactor communicates it and why reviewers praise the no-tracking
   property without it feeling invasive
   (`competitive-audit-01-nutrition-coaching-research.md` line ~407).
4. **Determinism preserved.** Same input → same output for everyone;
   trivially fixture-testable; no per-user code path divergence to audit.

The bioSex-conditioned alternative is explicitly rejected (§2).

### 4c. Interaction with the existing manual cycle flag — keep both, document the seam

Smoothing and the flag operate on **different layers** and both stay:

- **Smoothing fixes the TREND READING (passive, universal, always on).**
  It makes `actualRatePct` / `weightDelta` / the BodyMetrics line less
  spiky for everyone.
- **`cycleOverride` HOLDS DECISIONS (explicit, opt-in, female-gated).**
  Even with a robust trend, a user who *knows* their period is moving the
  scale this week can still flag it; the coach then holds calorie changes
  (line 654), suppresses the rapid-loss boost (648) and flag (900), and
  shows the held-decision row (line ~1086). Smoothing does not remove the
  need for this — it reduces how *often* it's needed, but the explicit
  hold is a stronger, user-authored guarantee and a privacy affordance the
  founder asked for. **Do not delete or auto-set `cycleOverride`.**

Documented seam (add to the code comment block): *"Robust smoothing damps
the cyclical water-weight excursion in the trend used for all coaching
reads. `cycleOverride` is the user's explicit, opt-in instruction to HOLD
calorie decisions for a week regardless of what the (now-robust) trend
says. The two are complementary: smoothing improves the number, the flag
holds the action. Neither sets nor reads the other."*

### 4d. Interaction with rapid-loss / ED safety — THE CRITICAL GUARD

**Requirement (CLAUDE.md SAFETY SYSTEM, charter constraint 3): damping
must never mask a genuine rapid loss that should fire the safety boost or
the ED-pattern flag.** The rapid-loss threshold (-1.5%/wk) and the calorie
floors are untouchable.

**Guard design (two independent locks, both shipped):**

1. **Asymmetric clamp (Candidate A §4a):** downward innovations pass
   through with a much wider knee (or unclamped). A real rapid loss is a
   sustained *downward* drift and is therefore **not damped** by design,
   while upward water-weight spikes are. This is the primary lock and the
   reason A is recommended over B/C.

2. **Safety reads the less-damped series (explicit separation of trend
   feeds).** `computeWeeklyTrendPct` → `detectEdPatternFlag` s1, plus
   `rapidLossOverride` and `rapidWeightLossFlag`, must read a **safety
   trend** that is either the *existing* alpha-0.1 EWMA (unchanged) or the
   robust series with downward-clamping fully disabled. The *coaching/
   display* trend (how the coach sizes a routine off-target cut, what the
   chart shows) may use the fully robust series. Concretely:
   introduce `safetyTrendPct` (computed from the un-/lightly-damped
   series) used by all three safety call sites; leave `actualRatePct`
   used for non-safety coaching to use the robust series. **If the two
   ever disagree on whether -1.5% is breached, the safety series wins —
   the boost/flag fires.** This is the belt to the asymmetric-clamp braces.

3. **Fixture acceptance test (blocking):** a synthetic genuine -1.8%/wk
   loss with low energy MUST still fire `rapidLossOverride === true` and
   `detectEdPatternFlag` s1 under every candidate filter. This is a
   hard gate in the suite (§5) and an engine-invariant.

### 4e. Placement, surfaces, copy, offline, accessibility

- **Placement (maths, mostly invisible):** no new screen. The robust trend
  replaces/augments the EWMA feeding (i) the weekly-coach trend reads,
  (ii) the BodyMetrics trend line (`BodyMetricsScreen.js` line ~498), and
  (iii) the CoachOutput nutrition trend (`CoachOutputScreen.js` ~1265).
  COMP-004's daily-trend surface (still placement-TBD) consumes the same
  improved trend for free. Per charter "placement is the product": this
  feature's correct placement is *under every existing trend line, with no
  new surface* — it makes the numbers users already meet trustworthy.
- **Copy (universal, water-weight framing, never "cycle"):** a single
  optional one-liner under the trend chart, e.g.
  - "Your trend line ignores day-to-day water-weight swings."
  - "Big overnight jumps are usually water. The trend follows the real
    change."
  - (Coach held-decision, unchanged for the manual flag path:) "Calories
    held. Cycle was flagged this week so the weight reading isn't a
    reliable signal." (existing string, line ~1086 — keep verbatim.)
  No string anywhere in the universal path mentions periods, cycles, or
  any sex-specific cause. British English; numerals are the hero.
- **Empty / sparse data:** filter degrades to plain EWMA when fewer than
  the MAD window's worth of innovations exist (scale floor handles this);
  the existing `>=3` / `>=4` weigh-in gates are unchanged — never raise
  them.
- **Offline:** pure functions, runs on local weigh-ins, zero network. No
  change to offline-first posture.
- **Accessibility:** the raw-dots-plus-trend chart already meets contrast/
  tabular-figure rules; the smoother changes only the trend Y-values.

---

## 5. Fixture suite & acceptance criteria (the deliverable's teeth)

New file `src/lib/__tests__/cycleRobustSmoothing.test.js` (+ extend
`engine-invariants.test.js` and `engineRobustness.fuzz.test.js`). Each
fixture is a deterministic synthetic daily-weight series; assert on the
robust trend vs the plain EWMA.

| Fixture | Construction | Acceptance criterion |
|---|---|---|
| F1 monthly cycle excursion | flat 70 kg + a recurring +1.5 kg, 5-day raised-cosine bump every 28 days, small daily noise | peak trend excursion damped **≥60%** vs plain EWMA (≥1.5 kg raw → ≤0.6 kg trend swing) |
| F2 weekend spike | flat + recurring +0.8 kg Sat-Sun then revert | weekly-rate read stays within ±0.1 kg/wk of zero; plain EWMA must visibly wobble |
| F3 genuine slow loss | true -0.3 kg/week linear, daily noise σ=0.3 kg | robust trend tracks within **±0.1 kg** of plain EWMA after warm-up; **lag <2 days** measured at trend midpoint |
| F4 genuine RAPID loss (SAFETY) | true -1.8%/wk linear drop | `safetyTrendPct <= -1.5` AND `detectEdPatternFlag` s1 fires AND `rapidLossOverride===true` under EVERY candidate — **blocking** |
| F5 real plateau then real shift | 4 weeks flat, then step to -0.5 kg/wk | robust trend detects the new slope within **≤3 days** of plain EWMA (no extra lag beyond MacroFactor's frontier) |
| F6 single corrupt reading | one 200 kg fat-finger entry | clamped to ≤`k·s` impact; trend deflection **<0.2 kg** (plain EWMA poisoned) |
| F7 sparse logging | 3 readings in 10 days | degrades to plain EWMA, no NaN, no crash (fuzz invariant) |
| F8 determinism | same input twice | byte-identical output |

Acceptance summary: **excursion damped >60% (F1/F2/F6); genuine 0.3 kg/wk
trend lag <2 days (F3/F5); rapid-loss safety NEVER masked (F4, hard
gate).** Numbers tunable at founder review; the *shape* of the criteria is
the deliverable.

---

## 6. Rollout (gated)

1. **Founder maths review gate.** COMP-024 touches coach maths and the
   safety seam → blueprint + the chosen `k`, `α`, window `W`, scale floor,
   and asymmetric-knee constants reviewed and signed off before any
   default change (per CLAUDE.md "coaching engine" + map row "Founder
   maths review").
2. **Shadow mode.** Land the robust function behind a default-OFF flag.
   `runWeeklyCoach` computes BOTH the existing trend and the robust trend,
   acts on the existing one, and emits a telemetry divergence event
   (no PII: numeric deltas only) so the founder sees real-world divergence
   distribution before switching. New allowlist event e.g.
   `weight_trend_shadow_divergence` (panel 2, engine health) added to
   `src/lib/telemetry/events.js` `TELEMETRY_EVENTS` — payload:
   `{ plainRatePct, robustRatePct, deltaPct, safetyRatePct }`. (Allowlist
   extension noted in map row for COMP-025/026 too; same mechanism.)
3. **Promote consumers one at a time.** Display first (BodyMetrics chart —
   lowest risk, visible win), then non-safety coaching reads, **never the
   safety series** (it keeps reading the less-damped feed per §4d).
4. **Engine-invariant lock.** F4 (rapid-loss-not-masked) and F8
   (determinism) become permanent invariants in
   `engine-invariants.test.js`.

---

## 7. Whole-package integration & word-of-mouth

- **Strengthens COMP-004** (daily trend surface) and **COMP-026**
  (step-informed TDEE confidence) — both consume a cleaner trend; COMP-026
  in particular pairs naturally (step deltas + robust weight trend = a more
  confident expenditure read, MacroFactor's whole pitch).
- **Strengthens the ED safety story** on the upside (no false "you gained,
  cut harder") while the §4d guard protects the downside.
- **Streamlining:** zero new surfaces, zero new taps. It makes existing
  numbers more trustworthy — the charter's "enrich don't add" ideal.
- **Tellable moment:** "I was up 1 kg this morning and the app's trend
  didn't even blink" — true for everyone, says nothing about anyone's
  body, and is exactly the MacroFactor-grade trust signal reviewers cite.

---

## 8. Beating the benchmark

MacroFactor ships universal water-weight robustness but keeps its
algorithm a black box and *only* improves the expenditure estimate.
Volyume can match the robustness (same robust-innovation principle) **and**
do two things MacroFactor doesn't: (1) show the raw dots beside the robust
trend so the user *sees* the spike being absorbed (trust-by-transparency,
the house pattern), and (2) wire an explicit, audited safety separation so
the robust trend can be aggressive about damping noise *because* the safety
detector reads its own less-damped feed — a guarantee a black-box
expenditure engine can't make visible. We keep the user-authored
`cycleOverride` as a privacy affordance MacroFactor lacks. Equal on maths,
ahead on transparency and safety.

---

## 9. Measurement (existing telemetry preferred)

1. **Shadow divergence distribution** — `weight_trend_shadow_divergence`
   (new, panel 2): how often/how far robust vs plain disagree; confirms
   the filter damps noise without distorting trend before promotion.
2. **`weekly_coach_run`** (existing) — proportion of weeks where a calorie
   change fired; expect *fewer* whipsaw adjustments after promotion
   (stability win, no extra holds).
3. **`rapid_loss_compression_triggered` + `ed_pattern_flag_fired`**
   (existing) — must NOT drop after promotion (proves safety not masked);
   monitored as a regression alarm, not a success metric.
4. **`cycleOverride` set-rate** (derivable from check-ins) — may fall as
   smoothing reduces the need; should never be forced to zero.

---

## 10. Build notes

- **Touched (engine):** `src/lib/weeklyCoach.js` (robust trend +
  `safetyTrendPct` separation, seam comment), `src/lib/nutritionEngine.js`
  (optional robust variant for display series + a shared MAD/clamp
  helper). Keep the two EWMA shapes distinct as today.
- **Touched (tests):** new `src/lib/__tests__/cycleRobustSmoothing.test.js`;
  extend `engine-invariants.test.js` (F4, F8) and
  `engineRobustness.fuzz.test.js`.
- **Touched (telemetry):** one allowlist entry in
  `src/lib/telemetry/events.js`; `allowlistDrift.test.js` will enforce it.
- **Untouched:** `cyclePrefs.js`, `WeeklyCheckInScreen` cycle question,
  `edPatternDetector.js` thresholds, all calorie floors, all signposting.
- **Reuse:** existing EWMA scaffolding, malformed-row filtering, the
  date-aware `computeWeeklyWeightChange`, the BodyMetrics raw-dots+trend
  chart, the telemetry transport/allowlist.
- **Effort sanity-check:** seed EFFORT 3 is correct. Candidate A is ~one
  clamp line + a MAD helper + the safety-series split; the bulk of the
  work is the fixture suite, the shadow-mode plumbing, and the founder
  maths review — not the maths itself. Pure functions, no DB, no UI build.
- **Risks:** (1) **masking a genuine rapid loss** — the single failure
  mode, fully mitigated by §4d (asymmetric clamp + safety reads less-damped
  series + F4 hard gate), but it is why this needs founder sign-off and
  shadow mode before any default flip. (2) Constant mis-tuning (`k`/scale
  floor) damping real trend — caught by F3/F5 and shadow divergence.

---

### Citation note

macrofactor.com, macrofactorapp.com, help.macrofactorapp.com, the Wiley/
PubMed physiology pages, and grdm.io all returned HTTP 403 to direct
WebFetch on 2026-06-10; every MacroFactor and physiology claim above is
**search-extract evidence** (corroborated across ≥2 independent extracts
where possible) and flagged per charter output rules. Robust-statistics
maths claims (RobustTrend Huber, EWMA-as-Kalman) are from arXiv/journal
abstracts also via search extract. Re-verify exact MacroFactor wording and
the Kanellakis numeric (0.450 kg) against the primary sources before the
founder review.
