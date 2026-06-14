# Pass-4 implementation blueprints - Coaching & Progress cluster

Scope: the three founder-APPROVED items from `pass3-v2-founder-decisions.md` Section A
(`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md:163-171`):

1. ULTIMATE - Recomp-reframing view (cluster PR)
2. ULTIMATE - Named autonomy modes (cluster AC/SC)
3. ULTIMATE - Plan diff/preview (cluster PG)

Format per `_AUDIT-SPEC.md:252-271`. Every factual sentence is source-tagged:
`[P1:file:line]` = read in code; `[P2:id]` = Pass-2/Pass-3 evidence cell;
`[P3:gap]` = the gap statement; `[INFERENCE]` = design judgement, not a code fact.

VOICE binding for all three: `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` - honesty test
(Section 1), numbers-before-narrative + mirror-not-infer (Section 4), the failure-mode
catalogue (Section 6), no em/en dashes, British English, Precision Coaching named as the
decider for engine output (Section 4) `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:39-43,213-229,561-577]`.

---

## ULTIMATE-RECOMP-01 - Recomp-reframing view

ID: ULTIMATE-RECOMP-01
CLUSTER: PR (Progress)
TITLE: Recomposition reframe of flat scale-weight
PRIORITY TIER: Tier-1 (founder-accepted, Section A) `[P2:pass3-v2-founder-decisions.md:165]`
IMPACT: High - the research names recomposition reframing as a triangulated best-in-class
capability we are MISSING `[P2:pass3-comparison-matrix.md:51,54]`.
EFFORT: Medium `[INFERENCE]` - read-only derivation over data already on device; no capture,
no schema change (see DATA).
PRIORITY SCORE: not assigned in source; founder placed it in the Section-A accepted set
`[P2:pass3-v2-founder-decisions.md:163-165]`. NEEDS ANSWER [NA-coaching-1].

### CURRENT STATE [P1]
- Body-fat % is logged and trended on its own chart (`BodyFatTrendChart`) once two readings
  exist `[P1:src/screens/BodyMetricsScreen.js:242-303]`, stored as `bodyFatPercent` with a
  `bodyFatSource` marker `[P1:src/screens/BodyMetricsScreen.js:616-622]`.
- Nine site measurements (chest, shoulders, arms, forearms, waist, hips, quads, hamstrings,
  calves) are logged and each has its own trend chart `[P1:src/screens/BodyMetricsScreen.js:88-98,307-358]`.
- Body weight is trended with a water-weight-robust smoother and a plain takeaway line, plus an
  EWMA "Weight trend" card showing the smoothed value and weekly change
  `[P1:src/screens/BodyMetricsScreen.js:136-238,768-803]`.
- A "phase" chip already classifies the recent weight slope as Gaining / Losing weight /
  Maintaining from the last 8 weight entries `[P1:src/screens/BodyMetricsScreen.js:105-128,741-746]`.
- Strength standing is computed elsewhere: per-lift Beginner→Elite from estimated-1RM ÷
  bodyweight `[P1:src/lib/strengthStandards.js:56-90]`, rolled into one overall label + nearest
  rank-up `[P1:src/lib/strengthStandards.js:108-132]`, and rendered on the Lifts screen
  `[P1:src/screens/LiftProgressScreen.js:138-193]`.
- These four data streams (weight trend, body fat, measurements, strength) live on the device
  but no surface ties them together to say "weight flat, composition still moving"
  `[P1:src/screens/BodyMetricsScreen.js:725-1096]` (no recomp card in the render tree).

### THE GAP [P3]
Recomposition reframing of flat weight is a triangulated best-in-class capability; we have the
component parts (body-fat / measurement / strength / weight trend) but "no view reframes flat
scale weight" `[P3:pass3-comparison-matrix.md:54]` `[P2:pass3-comparison-matrix.md:51]`. Founder
scoped it as: reframe flat scale-weight as recomposition from EXISTING data; no new capture
`[P2:pass3-v2-founder-decisions.md:165]`.

### THE EVIDENCE [P2, provenance noted]
- "recomposition reframing of flat weight (all-three)" listed under BEST IN CLASS for Progress;
  status VERIFIED `[P2:pass3-comparison-matrix.md:51,55]`. Provenance: triangulated across all
  three research passes (the matrix marks it "all-three") `[P2:pass3-comparison-matrix.md:51]`.
- "recomposition reframing view (BF/measurement/strength data exist, no view reframes flat scale
  weight)" listed under MISSING ENTIRELY; status VERIFIED `[P2:pass3-comparison-matrix.md:54-55]`.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner whose scale weight has barely moved for several weeks, but whose waist is down and
bench is up, sees a plain card stating exactly that in numbers first: "Weight steady. Waist down
2 cm. Bench up 5 kg." The reframe is honest (it is true if they did nothing but kept logging)
and removes the "the scale isn't moving so nothing is working" churn trigger `[INFERENCE]`,
consistent with mirror-not-infer and numbers-before-narrative
`[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:136-143,561-577]`.

### ATHLETE EXPERIENCE AFTER CHANGE
An experienced lifter mid-recomp gets the same factual read at a denser register: a one-line
composition delta beside the weight trend they already watch, sourced from the measurement and
strength streams they already log. No new data entry; it surfaces a pattern they would otherwise
eyeball across three separate charts `[INFERENCE]`.

### IMPLEMENTATION BLUEPRINT

FILES TO CHANGE [P1:file:line]
- `src/screens/BodyMetricsScreen.js` - add a "Recomposition" card to the render tree, placed
  after the weight snapshot card and before/around the body-fat block
  `[P1:src/screens/BodyMetricsScreen.js:734-871]`. The screen already holds `history` (entries
  with weight, body_fat, and all nine measurements) `[P1:src/screens/BodyMetricsScreen.js:560-561,68-86]`
  and already imports the smoothers it would reuse `[P1:src/screens/BodyMetricsScreen.js:42-43]`.
- NEW FILE `src/lib/recompReframe.js` - a pure, deterministic derivation:
  `deriveRecomp(history, strengthStanding)` returning the reframe view-model (weight-trend state,
  body-fat delta, the most-changed measurement, the strongest lift delta, and a boolean of whether
  a recomp reframe is even warranted). Mirrors the existing pattern of pre-derived view-models fed
  to presentation-only components `[P1:src/components/WeightTrendCard.js:14-21]` `[INFERENCE]`.
- To source the strength delta, reuse `summariseStrengthStanding` /`getStrengthLevel`
  `[P1:src/lib/strengthStandards.js:56-90,108-132]`. The lift data itself
  (`buildLiftProgressRows`) is loaded in `LiftProgressScreen`, not in `BodyMetricsScreen`
  `[P1:src/screens/LiftProgressScreen.js:16,60-90]`. NEEDS ANSWER [NA-coaching-2].

DATA [mark NEW]
- No NEW columns. The reframe reads only existing fields: `body_weight`, `body_fat`, and the nine
  measurement keys already on each history entry `[P1:src/screens/BodyMetricsScreen.js:68-86]`,
  and existing strength values `[P1:src/lib/strengthStandards.js:56-90]`. This satisfies the
  founder constraint "no new capture" `[P2:pass3-v2-founder-decisions.md:165]`.
- NEW (derived, in-memory only): the recomp view-model object produced by `deriveRecomp`. Not
  persisted `[INFERENCE]`.

COMPONENT STRUCTURE [parent import P1:file:line]
- New `RecompCard({ vm })`, presentation-only, defined in or imported by `BodyMetricsScreen`,
  rendered inside the existing `ScrollView` content `[P1:src/screens/BodyMetricsScreen.js:727,734]`.
- Pattern to copy: `WeightTrendCard` takes a pre-derived `vm` and renders nothing when
  `!vm.render` `[P1:src/components/WeightTrendCard.js:28-31]`. `RecompCard` returns null when the
  reframe is not warranted (see EDGE CASES).
- State-colour grammar: a recomp card is a Class-B body-data surface, so deltas carry NO valence
  colour, matching the existing `DeltaBadge` rule on this screen
  `[P1:src/screens/BodyMetricsScreen.js:1102-1118]`.

USER FLOW [sequence]
1. User opens Progress → Body metrics; the screen loads `history` and EWMA as today
   `[P1:src/screens/BodyMetricsScreen.js:533-573]`.
2. `deriveRecomp(history, strengthStanding)` runs in a `useMemo` `[INFERENCE]`.
3. If the reframe is warranted (weight broadly flat AND at least one composition or strength
   stream has moved - exact thresholds: NEEDS ANSWER [NA-coaching-3]), `RecompCard` renders the
   numbers-first read.
4. If not warranted, `RecompCard` renders nothing; the screen looks exactly as it does today
   `[P1:src/screens/BodyMetricsScreen.js:734-871]`.
5. No writes. The card is read-only `[INFERENCE]`.

ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]
- Body-fat %, measurements, and Precision Coaching adjustments are PRO per
  CLAUDE.md (food diary / check-ins / Precision Coaching are Pro; Plan Library / logging /
  personal bests / progress stats are Free). The recomp reframe leans on body-fat and
  measurements. NEEDS ANSWER [NA-coaching-4]: is the recomp card FREE (it reuses progress-stats
  surfaces) or PRO (it leans on body-fat/measurement Pro data)?
- Mechanism if PRO: the screen has a physique opt-in gate and a `tier === 'pro'` auto-enable
  `[P1:src/screens/BodyMetricsScreen.js:457-468]`; app-wide gating uses
  `withProGuard(Component, feature)` which renders `<ProLocked>` when `tier !== 'pro'`
  `[P1:src/components/ProGate.js:134-138]`, and `isPaidTier(userProfile)`
  `[P1:src/lib/proGate.js:62-64]`. BodyMetricsScreen itself is NOT currently wrapped in
  `withProGuard` (it gates internally via the physique opt-in) `[P1:src/screens/BodyMetricsScreen.js:457-468]`.

EMPTY STATE [British copy]
When the reframe is not warranted, render nothing (the existing per-chart empty hints already
cover "log twice to see the trend") `[P1:src/screens/BodyMetricsScreen.js:166-173,250-258]`. If a
deliberate placeholder is wanted instead of nothing: "Keep logging your weight, body fat and
measurements. When your weight holds steady but your shape keeps changing, that read appears
here." NEEDS ANSWER [NA-coaching-5]: render-nothing vs placeholder.

LOADED STATE
Numbers-first line, no valence colour. Example shape (figures illustrative):
"Weight steady this month. Body fat down 1.2%. Waist down 2 cm. Bench up 5 kg." Then one plain
sentence: "Your weight has held while your shape and strength kept moving." The sentence passes
the honesty test (true if the user only logged) `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:39-43]`.
No "good"/"great"/"crushing" `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:564,568]`.

ERROR STATE
Same resilience as the host screen: a bad history row must not crash the card. The screen already
guards date formatting against malformed cloud rows `[P1:src/screens/BodyMetricsScreen.js:14-23]`
and history load failures fall back to empty `[P1:src/screens/BodyMetricsScreen.js:572]`.
`deriveRecomp` returns `{ render: false }` on any missing/NaN input `[INFERENCE]`.

EDGE CASES
- Under an open ED-pattern flag or calm mode, the screen already strips rate-of-change from the
  weight takeaway and gates the body screen behind a gentle re-confirmation
  `[P1:src/screens/BodyMetricsScreen.js:470-472,686-714]`. The recomp card MUST honour the same
  suppression so a "weight flat, fat down" read can never reinforce restriction under an open flag
  `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:101-121,564]` `[INFERENCE]`. Exact suppression rule:
  NEEDS ANSWER [NA-coaching-6].
- Sparse data: with only one weight or no body-fat/measurement history, the reframe is not
  warranted → render nothing `[INFERENCE]`. The existing charts require ≥2 points before showing
  `[P1:src/screens/BodyMetricsScreen.js:166,250,315]`.
- Weight NOT flat (clearly gaining or losing): the phase chip already states direction
  `[P1:src/screens/BodyMetricsScreen.js:125-127]`; the recomp reframe is specifically for the
  flat-weight case, so it stays hidden when weight is clearly trending `[INFERENCE]`.

DUAL-AUDIENCE DESIGN
The card renders the SAME derived facts to everyone; the coaching-tone register
(supportive/precise) only shapes the prose around the numbers, never the numbers
`[P1:src/screens/SettingsCoachingScreen.js:180-213]` `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:740-758]`.
A beginner gets the slightly fuller sentence; an athlete gets the terser numbers-led line. Safety
suppression is register-blind `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:760-764]`.

### VERIFICATION
- All CURRENT STATE claims tagged to read code `[P1:...]`. THE GAP/EVIDENCE tagged
  `[P2/P3:pass3-comparison-matrix.md]`. Voice claims tagged
  `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md]`.
- OPEN NA-ids: NA-coaching-1, NA-coaching-2, NA-coaching-3, NA-coaching-4, NA-coaching-5,
  NA-coaching-6. NOT FINAL until all are answered with file:line.

---

## ULTIMATE-AUTONOMY-01 - Named autonomy modes

ID: ULTIMATE-AUTONOMY-01
CLUSTER: AC (Coach output) / SC (Scaling, dual-audience)
TITLE: Named autonomy modes - Coached / Collaborative / Manual
PRIORITY TIER: Tier-1 (founder-accepted, Section A) `[P2:pass3-v2-founder-decisions.md:166]`
IMPACT: Medium-High - the named-mode toggle is the one autonomy capability the matrix marks
MISSING in two clusters (AC and SC), where everything else is a LEAD
`[P2:pass3-comparison-matrix.md:47,104-106]`.
EFFORT: Low-Medium `[INFERENCE]` - the per-domain confirm-then-apply behaviour already exists
(see CURRENT STATE); this names it and adds two apply-control variants around the SAME engine
output.
PRIORITY SCORE: not assigned in source `[P2:pass3-v2-founder-decisions.md:163-166]`.
NEEDS ANSWER [NA-coaching-7].

DISTINCTION (founder, mandatory): this is NOT the existing `coachTone`
(automatic/supportive/precise), which is a VOICE register, not apply-control
`[P1:src/screens/SettingsCoachingScreen.js:36-39,180-213]`. Autonomy modes govern WHETHER an
engine decision auto-applies, asks first, or only suggests. The two settings are orthogonal.

### CURRENT STATE [P1]
- The coach already operates per-domain confirm-then-apply: each adjustment (calories, training
  volume, steps, cardio, deload, diet break, macro cycle, refeed) is suggested and only written
  when the user taps Apply `[P1:src/screens/CoachOutputScreen.js:773-1045]`.
- The Apply action writes the change to its destination and then calls `markApplied` so the row
  flips to "Applied" and cannot be applied twice
  `[P1:src/screens/CoachOutputScreen.js:792-794]` `[P1:src/lib/coachApply.js:202-214]`.
- `isApplied(output, key)` is the single source of "has this been applied"
  `[P1:src/lib/coachApply.js:220-224]`.
- The UI renders this as an `AdjustmentRow` showing either an Apply button or an "Applied" chip
  `[P1:src/screens/CoachOutputScreen.js:189-220]`, grouped into a `NextWeekCard`
  `[P1:src/screens/CoachOutputScreen.js:223-280]`.
- A separate VOICE register setting exists: Coaching tone = Automatic / Supportive / Precise,
  stored as `userProfile.coachTone`, local-only `[P1:src/screens/SettingsCoachingScreen.js:36-47,192-212]`.
  It changes prose shape only; "same facts, same decisions, same honesty rules in every tone"
  `[P1:src/screens/SettingsCoachingScreen.js:180-182]`.
- Today's effective behaviour is confirm-then-apply for everyone (the user confirms each
  suggestion) `[P1:src/screens/CoachOutputScreen.js:773-794]`.

### THE GAP [P3]
"named tiered-autonomy modes (Coached/Collaborative/Manual, MacroFactor) - we have manual control
+ per-domain confirm-then-apply ... but no named mode toggle" `[P3:pass3-comparison-matrix.md:47]`;
restated in SC: "named autonomy modes - manual control + per-domain confirm-then-apply exist
(`CoachOutputScreen.js:778-1045`) but no named Coached/Collaborative/Manual toggle"
`[P3:pass3-comparison-matrix.md:104]`. Founder scope: "Coached/Collaborative/Manual toggle (manual
control already exists; name it)" `[P2:pass3-v2-founder-decisions.md:166]`.

### THE EVIDENCE [P2, provenance noted]
- AC MISSING ENTIRELY: "named tiered-autonomy modes (Coached/Collaborative/Manual, MacroFactor)";
  VERIFICATION marks autonomy-modes bar PARTIAL - single-source Gemini, our absence VERIFIED
  `[P2:pass3-comparison-matrix.md:47-48]`.
- SC MISSING ENTIRELY: "named autonomy-mode toggle"; VERIFICATION: "autonomy-modes MISSING =
  VERIFIED (ours) / bar SINGLE-SOURCE (Gemini)" `[P2:pass3-comparison-matrix.md:105-106]`.
- BEST-IN-CLASS bar: "tiered autonomy modes (Gemini - MacroFactor Coached/Collaborative/Manual)"
  `[P2:pass3-comparison-matrix.md:102]`. Provenance: single-source Gemini; our gap is the
  read-backed VERIFIED part `[P2:pass3-comparison-matrix.md:106]`.

### MAPPING - the three modes (founder-named, plain)
- Coached = auto-apply: the engine's decision is written automatically when the weekly output
  lands `[P2:pass3-v2-founder-decisions.md:166]`. Equivalent to calling the existing apply handlers
  on render rather than on a tap `[P1:src/screens/CoachOutputScreen.js:778-794]` `[INFERENCE]`.
- Collaborative = confirm-then-apply: TODAY's behaviour, user taps Apply per domain
  `[P1:src/screens/CoachOutputScreen.js:773-794]` `[P2:pass3-v2-founder-decisions.md:166]`.
- Manual = suggest-only: the engine still shows the decision and reason, but offers no Apply
  action (the user changes things themselves from the relevant screens)
  `[P2:pass3-v2-founder-decisions.md:166]` `[INFERENCE]`.
- DEFAULT = Collaborative, so existing users see NO behaviour change (mandated)
  `[P2:pass3-v2-founder-decisions.md:166]` (matches the no-behaviour-change constraint in the
  task brief) `[INFERENCE]`.
- HARD RULE: every mode renders the SAME deterministic engine decision and the SAME reason; only
  the apply-behaviour differs `[P2:pass3-v2-founder-decisions.md:166]`. No mode may change what
  the engine decides `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:740-742]`.

### NEWBIE EXPERIENCE AFTER CHANGE
Default Collaborative is unchanged: a beginner confirms each weekly suggestion, learning what the
coach does before it acts `[INFERENCE]`. The mode names are plain (no jargon) per founder rule
`[P2:pass3-v2-founder-decisions.md:166]`. A beginner who finds confirming tedious can move to
Coached; one who wants full control can move to Manual.

### ATHLETE EXPERIENCE AFTER CHANGE
An experienced user can set Coached so weekly targets apply automatically (matching the
MacroFactor "Coached" expectation) `[P2:pass3-comparison-matrix.md:102]`, or Manual to keep the
coach as advisory while they drive their own numbers. The decision shown is identical to today's
`[P1:src/screens/CoachOutputScreen.js:773-1045]`.

### IMPLEMENTATION BLUEPRINT

FILES TO CHANGE [P1:file:line]
- `src/screens/SettingsCoachingScreen.js` - add an "Autonomy" / apply-control selector, a SECOND
  three-way chip group SEPARATE from the existing Coaching tone block
  `[P1:src/screens/SettingsCoachingScreen.js:183-213]`, written and persisted with the same
  `saveLocalProfile` pattern the tone setting uses `[P1:src/screens/SettingsCoachingScreen.js:41-47]`.
- `src/screens/CoachOutputScreen.js` - branch the apply behaviour on the mode:
  - Coached: invoke the existing apply handlers automatically once the output is loaded, instead of
    waiting for a tap `[P1:src/screens/CoachOutputScreen.js:778-794,1047]` `[INFERENCE]`.
  - Collaborative: today's path, render `AdjustmentRow` with Apply buttons
    `[P1:src/screens/CoachOutputScreen.js:189-220,242-273]`.
  - Manual: render the decision + reason but pass no `onApply`, so `AdjustmentRow` shows no Apply
    button (`showApply = !!onApply && !applied`) `[P1:src/screens/CoachOutputScreen.js:190]`.
- Reuse `markApplied`/`isApplied` unchanged so a Coached auto-apply still flips the row to
  "Applied" and stays idempotent `[P1:src/lib/coachApply.js:202-224]`.

DATA [mark NEW]
- NEW local-only profile field, e.g. `userProfile.coachAutonomy` ∈
  `{'coached','collaborative','manual'}`, default `'collaborative'`. Mirror the existing
  local-only field pattern (`coachTone` / `showScience` are local-only, no synced column, survive
  the pull merge) `[P1:src/screens/SettingsCoachingScreen.js:36-39]`. Exact field name + whether it
  syncs: NEEDS ANSWER [NA-coaching-8].
- No engine/output schema change - the engine's decision object is untouched
  `[P1:src/lib/coachApply.js:202-214]` `[INFERENCE]`.

COMPONENT STRUCTURE [parent import P1:file:line]
- New chip group inside `SettingsCoachingScreen`'s Pro block, beside Coaching tone
  `[P1:src/screens/SettingsCoachingScreen.js:127-233]`, styled like `toneChips`/`toneChip`
  `[P1:src/screens/SettingsCoachingScreen.js:267-280]`.
- In `CoachOutputScreen`, read the mode from the store the same way `coachTone` is read for
  register resolution `[P1:src/screens/CoachOutputScreen.js:804-808]`, and thread it to
  `NextWeekCard` / `TrainingCard` so the Apply controls switch
  `[P1:src/screens/CoachOutputScreen.js:223,288]`.

USER FLOW [sequence]
1. User opens You → Settings → Coaching; sees Coaching tone (existing) and Autonomy (new)
   `[P1:src/screens/SettingsCoachingScreen.js:110-233]`.
2. User picks Coached / Collaborative / Manual; `saveLocalProfile` persists it
   `[P1:src/screens/SettingsCoachingScreen.js:41-47]`.
3. Next time the weekly output renders `[P1:src/screens/CoachOutputScreen.js:1047]`:
   - Collaborative → Apply buttons appear; tap writes + `markApplied`
     `[P1:src/screens/CoachOutputScreen.js:778-794]`.
   - Coached → each not-yet-applied adjustment auto-applies via the same handlers; rows show
     "Applied" `[P1:src/screens/CoachOutputScreen.js:189-220]` `[INFERENCE]`. Auto-apply must still
     respect every per-handler guard (e.g. training volume needs `nextTrainingWeekId`)
     `[P1:src/screens/CoachOutputScreen.js:833-834]`.
   - Manual → no Apply control; the decision + reason still show
     `[P1:src/screens/CoachOutputScreen.js:190]`.

ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]
- PRO. Precision Coaching adjustments are Pro (CLAUDE.md). `CoachOutputScreen` is Pro-gated:
  `withProGuard(CoachOutputScreen, 'Your week')` `[P1:src/navigation/RootNavigator.js:152,388]`.
  The Autonomy control sits inside the `tier === 'pro'` block of the Coaching settings, same as
  Coaching tone / steps / cardio `[P1:src/screens/SettingsCoachingScreen.js:127-234]`. Gate
  helpers: `withProGuard` `[P1:src/components/ProGate.js:134-138]`, `isPaidTier`
  `[P1:src/lib/proGate.js:62-64]`.

EMPTY STATE [British copy]
On first open, the selector shows Collaborative selected (the default) with a one-line plain
description per option. Suggested sub-copy (plain, honesty-test-passing):
- Coached: "Precision Coaching applies each week's changes for you."
- Collaborative: "Precision Coaching suggests each change. You tap to apply it."
- Manual: "Precision Coaching shows each change and the reason. You make the change yourself."
Final wording: NEEDS ANSWER [NA-coaching-9].

LOADED STATE
The selected mode is highlighted (reuse `toneChipOn` styling)
`[P1:src/screens/SettingsCoachingScreen.js:278-280]`. On the weekly output, the Apply controls
reflect the mode as above.

ERROR STATE
If a Coached auto-apply fails for one domain, that domain's row stays un-applied and the error is
logged (the handlers already wrap writes in try/catch + `logError`)
`[P1:src/screens/CoachOutputScreen.js:817-821,853-857]`; other domains are unaffected (each handler
is independent) `[INFERENCE]`. A failed `saveLocalProfile` for the mode itself leaves the prior
mode in place `[INFERENCE]`.

EDGE CASES
- Safety carve-out: a safety hold / suppression branch renders identically regardless of register
  `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:760-764]`. Whether Coached auto-apply is permitted while
  a safety hold is active, or whether a hold forces Collaborative/Manual presentation, is a safety
  question and is NOT decided in source. This touches the safety boundary
  (CLAUDE.md "SAFETY SYSTEM - DO NOT TOUCH"): NEEDS ANSWER [NA-coaching-10] - must be answered and,
  if it implicates `src/coaching/safety`, escalated to the founder before build.
- Idempotency: Coached auto-apply must check `isApplied` first so a re-render does not double-apply
  `[P1:src/lib/coachApply.js:220-224]` `[P1:src/screens/CoachOutputScreen.js:780,832]`.
- Existing users: default Collaborative means no migration and no behaviour change
  `[P2:pass3-v2-founder-decisions.md:166]`.

DUAL-AUDIENCE DESIGN
Autonomy (apply-control) and Coaching tone (voice register) are independent: a user can be
Precise + Manual, or Supportive + Coached. The engine decision and its reason are identical across
all combinations; only voice and apply-behaviour vary
`[P1:src/screens/SettingsCoachingScreen.js:180-182]`
`[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:740-742]`.

### VERIFICATION
- CURRENT STATE tagged to read code `[P1:...]`. GAP/EVIDENCE tagged
  `[P2/P3:pass3-comparison-matrix.md]` and `[P2:pass3-v2-founder-decisions.md:166]`.
- OPEN NA-ids: NA-coaching-7, NA-coaching-8, NA-coaching-9, NA-coaching-10 (safety-adjacent).
  NOT FINAL until all answered with file:line.

---

## ULTIMATE-PLANDIFF-01 - Plan diff/preview

ID: ULTIMATE-PLANDIFF-01
CLUSTER: PG (Plan generation)
TITLE: Plan diff/preview - show before/after when a plan rebuilds
PRIORITY TIER: Tier-1 (founder-accepted, Section A) `[P2:pass3-v2-founder-decisions.md:168]`
IMPACT: Medium-High - the only MISSING capability in an otherwise LEAD plan-generation cluster
`[P2:pass3-comparison-matrix.md:73,75]`.
EFFORT: Medium `[INFERENCE]` - needs a pre-commit "what would change" computation before the
in-place rebuild (see DATA / USER FLOW).
PRIORITY SCORE: not assigned in source `[P2:pass3-v2-founder-decisions.md:163-168]`.
NEEDS ANSWER [NA-coaching-11].

### CURRENT STATE [P1]
- `PlanUpdateScreen` rebuilds the training plan in place: the user edits training fields and taps
  "Rebuild my plan" `[P1:src/screens/PlanUpdateScreen.js:253-265]`, which calls
  `generateAndSavePlan(user.id, updatedProfile)` `[P1:src/screens/PlanUpdateScreen.js:116]`.
- The rebuild happens FIRST off the staged profile, and the new profile is only committed as
  canonical once the rebuild succeeds (so a failed rebuild can't split-brain)
  `[P1:src/screens/PlanUpdateScreen.js:108-129]`.
- `generateAndSavePlan` generates AND persists AND activates the plan as the current mesocycle in
  one call `[P1:src/lib/planAutoGen.js:114-122]`. There is no preview step between edit and commit
  `[P1:src/screens/PlanUpdateScreen.js:116-139]`.
- The screen's only forewarning is prose: "rebuild the plan around it" / "Your plan rebuilds
  around it" `[P1:src/screens/PlanUpdateScreen.js:152,213]`; on success it toasts "Plan rebuilt
  around your new training setup" `[P1:src/screens/PlanUpdateScreen.js:137]`. No before/after of
  what actually changed is shown `[P1:src/screens/PlanUpdateScreen.js:133-139]`.
- A partial-rebuild path exists (some requested moves couldn't be matched to equipment),
  surfaced only as a toast after the fact `[P1:src/screens/PlanUpdateScreen.js:133-135]`
  `[P1:src/lib/planAutoGen.js:108-112]`.

### THE GAP [P3]
"pre-commit plan diff/preview - `PlanUpdateScreen.js` rebuilds the plan in place (`:212` 'Your
plan rebuilds around it') with no before/after preview of what changes (U-B-7)"
`[P3:pass3-comparison-matrix.md:75-77]`. Founder scope: "show before/after when a plan rebuilds"
`[P2:pass3-v2-founder-decisions.md:168]`. The reconciliation table maps mandated feature #12
"Plan diff/preview" PARTIAL (no pre-commit diff, U-B-7) → PG MISSING
`[P2:pass3-comparison-matrix.md:299]`.

### THE EVIDENCE [P2, provenance noted]
- PG MISSING ENTIRELY: pre-commit plan diff/preview; VERIFICATION: "plan-diff/preview ABSENT =
  VERIFIED (`PlanUpdateScreen.js` read - rebuild-in-place, no diff)"
  `[P2:pass3-comparison-matrix.md:75-78]`. Provenance: our-side read-backed VERIFIED (this is a
  gap in OUR app, not a competitor-bar claim) `[P2:pass3-comparison-matrix.md:78]`.

### NEWBIE EXPERIENCE AFTER CHANGE
Before committing, a beginner sees a plain before/after: "Now: 4 days, push/pull/legs. After: 5
days, upper/lower/weak-point." They understand what changing "days per week" actually does before
their working plan is replaced, reducing the "what did I just do to my plan" anxiety `[INFERENCE]`.
Copy is numbers-first and honest `[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:136-143]`.

### ATHLETE EXPERIENCE AFTER CHANGE
An experienced user reviews the structural delta (split, days, session length, any moves dropped
for equipment) and confirms or backs out before the active mesocycle is overwritten
`[INFERENCE]`. This also surfaces the partial-rebuild shortfall BEFORE commit rather than as an
after-the-fact toast `[P1:src/screens/PlanUpdateScreen.js:133-135]`.

### IMPLEMENTATION BLUEPRINT

FILES TO CHANGE [P1:file:line]
- `src/lib/planAutoGen.js` - split generation from persistence so a diff can be computed without
  committing. Today `generateAndSavePlan` does generate + save + activate together
  `[P1:src/lib/planAutoGen.js:114-122]`. Add a generate-only (dry-run) path that returns the
  prospective plan WITHOUT writing/activating, leaving the existing commit call intact for the
  final apply. Exact internal seam (where generation ends and persistence begins): NEEDS ANSWER
  [NA-coaching-12].
- `src/screens/PlanUpdateScreen.js` - insert a preview step between "Rebuild my plan" and the
  commit `[P1:src/screens/PlanUpdateScreen.js:108-139]`. "Rebuild my plan" first runs the dry-run,
  shows the diff, and only on a confirm CTA calls the real `generateAndSavePlan`
  `[P1:src/screens/PlanUpdateScreen.js:116]`.
- NEW (optional) `src/lib/planDiff.js` - pure `diffPlans(currentPlan, prospectivePlan)` returning
  a plain structural delta (days, split, session length, exercise/move adds-drops, equipment
  shortfall). NEEDS ANSWER [NA-coaching-13]: does a current-plan reader exist to diff against?

DATA [mark NEW]
- No NEW persisted columns. The diff is computed in-memory from the current active plan and the
  dry-run plan `[INFERENCE]`.
- NEW (in-memory): the prospective plan object from the dry-run, and the diff view-model.
- Reuse the existing `partial` / `missedCount` signal so equipment-shortfall shows in the diff
  pre-commit `[P1:src/screens/PlanUpdateScreen.js:133-135]` `[P1:src/lib/planAutoGen.js:108-112]`.

COMPONENT STRUCTURE [parent import P1:file:line]
- New `PlanDiffCard`/modal rendered inside `PlanUpdateScreen` after the dry-run resolves
  `[P1:src/screens/PlanUpdateScreen.js:142-266]`. A two-column or stacked "Now / After" layout
  reusing the screen's existing label/section styles
  `[P1:src/screens/PlanUpdateScreen.js:275-283]`.
- Whether the diff is a separate navigation screen vs an in-screen confirm panel: NEEDS ANSWER
  [NA-coaching-14].

USER FLOW [sequence]
1. User edits training fields as today `[P1:src/screens/PlanUpdateScreen.js:142-251]`.
2. User taps "Rebuild my plan" `[P1:src/screens/PlanUpdateScreen.js:253-265]`.
3. NEW: dry-run generation produces a prospective plan WITHOUT writing
   `[P1:src/lib/planAutoGen.js:114-122]` `[INFERENCE]`.
4. NEW: `diffPlans(current, prospective)` runs; the Now/After diff renders, including any
   equipment shortfall `[P1:src/lib/planAutoGen.js:108-112]` `[INFERENCE]`.
5. User confirms → the real `generateAndSavePlan` commits + activates, then the existing
   profile-commit + toast + `goBack()` flow runs unchanged
   `[P1:src/screens/PlanUpdateScreen.js:116-139]`.
6. User backs out → nothing is written; the active plan and profile are untouched (no commit ran)
   `[P1:src/screens/PlanUpdateScreen.js:108-129]` `[INFERENCE]`.

ENTITLEMENT GATING [FREE/PRO, gate fn P1:file:line]
- PRO. `PlanUpdateScreen` is the Precision Coaching plan-update surface and is Pro-gated:
  `withProGuard(PlanUpdateScreen, 'Update training')`
  `[P1:src/navigation/RootNavigator.js:154,320]`. (Pass-1 gating notes: plan-update is Pro, plan
  library is Free `[P2:pass1-section1-gating.md:38]`.) The diff/preview rides inside this already
  Pro-gated screen; no new gate `[INFERENCE]`. Gate helpers: `withProGuard`
  `[P1:src/components/ProGate.js:134-138]`, `isPaidTier` `[P1:src/lib/proGate.js:62-64]`.

EMPTY STATE [British copy]
If the dry-run produces a plan structurally identical to the current one (user changed nothing
material): "Nothing would change. Your plan already matches this setup." with the confirm CTA
disabled `[INFERENCE]`. Final wording: NEEDS ANSWER [NA-coaching-15].

LOADED STATE
Now/After columns with plain labels: training days, split, session length, and a short "Moves
changed" list. If `partial`, a calm line reusing the shortfall wording shape: e.g. "N moves
couldn't be matched to your equipment, so the plan may look a little lighter" (the existing
`planShortfallNote` copy, moved pre-commit) `[P1:src/lib/planAutoGen.js:108-112]`. No valence/hype
`[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:564,568]`.

ERROR STATE
If the dry-run throws, fall back to today's behaviour shape: keep the user on the screen with the
existing error toast "Couldn't rebuild your plan (...). Your training setup wasn't changed, try
again." `[P1:src/screens/PlanUpdateScreen.js:121-125]`; nothing is committed `[INFERENCE]`.

EDGE CASES
- Profile incomplete: `generateAndSavePlan` already returns `{ ok:false, error:'Profile
  incomplete' }` `[P1:src/lib/planAutoGen.js:122]`; the dry-run must surface this in the diff step
  rather than committing `[INFERENCE]`.
- Partial rebuild (equipment): today surfaced only post-commit as a toast
  `[P1:src/screens/PlanUpdateScreen.js:133-135]`; the diff moves this honestly to pre-commit so the
  user sees the shortfall before replacing their plan `[INFERENCE]`.
- Split-brain protection is preserved: because the real commit still rebuilds-first-then-commits,
  the diff/preview does not weaken the FF-002 guarantee
  `[P1:src/screens/PlanUpdateScreen.js:108-129]`.
- The dry-run MUST be deterministic and identical to what the commit will produce (no LLM, no
  randomness) - the engine is deterministic per CLAUDE.md; a diff that doesn't match the committed
  plan would be a lie. NEEDS ANSWER [NA-coaching-16]: confirm `buildPlanInputs` →
  generation is pure given the same profile, so dry-run == commit.

DUAL-AUDIENCE DESIGN
The diff shows the SAME structural facts to everyone; the coaching-tone register only shapes the
surrounding prose, not the Now/After figures
`[P1:src/screens/SettingsCoachingScreen.js:180-182]`
`[P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:740-758]`. A beginner gets a one-line plain summary above
the columns; an athlete reads the full structural delta.

### VERIFICATION
- CURRENT STATE tagged to read code `[P1:...]`. GAP/EVIDENCE tagged
  `[P2/P3:pass3-comparison-matrix.md]` and `[P2:pass3-v2-founder-decisions.md:168]`.
- OPEN NA-ids: NA-coaching-11, NA-coaching-12, NA-coaching-13, NA-coaching-14, NA-coaching-15,
  NA-coaching-16. NOT FINAL until all answered with file:line.

---

## NEEDS-ANSWER REGISTER (this file)

All must be answered with a file:line CONFIRMED answer before any blueprint here is final
(`_AUDIT-SPEC.md:241-250,270-271`). Add each to `pass4-needs-answer-register.md`.

- NA-coaching-1: What PRIORITY SCORE (impact/effort) does the audit assign to the recomp
  reframe? | files-to-check: `pass3-v2-founder-decisions.md`, any pass4 scoring sheet,
  `_AUDIT-SPEC.md`.
- NA-coaching-2: Where do the lift/strength rows get built for reuse in `deriveRecomp`, and can
  `BodyMetricsScreen` source them without duplicating `LiftProgressScreen`'s data load? |
  files-to-check: `src/lib/liftProgress.js`, `src/screens/LiftProgressScreen.js:60-90`,
  `src/lib/database.js` (getCompletedWorkoutSets).
- NA-coaching-3: Exact deterministic thresholds for "weight broadly flat" and "composition/
  strength has moved" that warrant the reframe. | files-to-check: `src/lib/nutritionEngine.js`
  (computeWeeklyWeightChange), `src/lib/robustTrend.js`, `src/screens/BodyMetricsScreen.js:105-128`.
- NA-coaching-4: Is the recomp card FREE (progress-stats) or PRO (leans on body-fat/measurement
  Pro data)? | files-to-check: `CLAUDE.md` FREE vs PRO, `src/lib/proGate.js`,
  `docs/ultimate-audit-2026-06-13/pass1-section1-gating.md`.
- NA-coaching-5: Recomp empty state - render nothing vs a placeholder line? | files-to-check:
  `src/screens/BodyMetricsScreen.js:855-871`, `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` Section 5.
- NA-coaching-6: Exact suppression rule for the recomp card under an open ED flag / calm mode. |
  files-to-check: `src/screens/BodyMetricsScreen.js:470-472,686-714`, `src/lib/wellbeing.js`,
  `src/lib/database.js` (getOpenEdPatternFlag).
- NA-coaching-7: PRIORITY SCORE for named autonomy modes. | files-to-check:
  `pass3-v2-founder-decisions.md`, any pass4 scoring sheet.
- NA-coaching-8: Exact local-only field name for autonomy mode and whether it syncs. |
  files-to-check: `src/screens/SettingsCoachingScreen.js:36-39`,
  `src/lib/sync/tables/profiles.js`, `src/store/useAppStore.js`.
- NA-coaching-9: Final British copy for the three autonomy option descriptions. | files-to-check:
  `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` Sections 3-6, `USER_FACING_COPY_AUDIT.md`.
- NA-coaching-10 (SAFETY-ADJACENT): Is Coached auto-apply permitted while a safety hold /
  suppression branch is active, or must a hold force Collaborative/Manual presentation? If this
  implicates `src/coaching/safety`, STOP and escalate to founder (CLAUDE.md "SAFETY SYSTEM - DO
  NOT TOUCH"). | files-to-check: `src/coaching/safety/`,
  `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md:760-764`, `src/screens/CoachOutputScreen.js` (calmMode).
- NA-coaching-11: PRIORITY SCORE for plan diff/preview. | files-to-check:
  `pass3-v2-founder-decisions.md`, any pass4 scoring sheet.
- NA-coaching-12: Exact seam in `generateAndSavePlan` where generation ends and persistence/
  activation begins (to add a dry-run path). | files-to-check:
  `src/lib/planAutoGen.js:114-180`.
- NA-coaching-13: Is there a reader for the current active plan/mesocycle to diff against? |
  files-to-check: `src/lib/database.js` (mesocycle/programme getters), `src/lib/planEngine.js`,
  `src/screens/PlansScreen.js`.
- NA-coaching-14: Diff as a separate screen vs in-screen confirm panel. | files-to-check:
  `src/navigation/RootNavigator.js`, `src/screens/PlanUpdateScreen.js`.
- NA-coaching-15: Final British copy for the "nothing would change" diff empty state. |
  files-to-check: `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`, `USER_FACING_COPY_AUDIT.md`.
- NA-coaching-16: Confirm `buildPlanInputs` → generation is pure (deterministic) so dry-run ==
  commit for an identical profile. | files-to-check: `src/lib/planAutoGen.js:119-180`,
  `src/lib/planEngine.js`.

## SUMMARY
- Items blueprinted: 3 (ULTIMATE-RECOMP-01, ULTIMATE-AUTONOMY-01, ULTIMATE-PLANDIFF-01).
- Open NA-ids: 16 (NA-coaching-1 .. NA-coaching-16); NA-coaching-10 is safety-adjacent and may
  require founder escalation. No blueprint here is FINAL until every NA-id is answered with a
  file:line CONFIRMED answer per `_AUDIT-SPEC.md:249-250,281`.
