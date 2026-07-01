# Volyume — Competitive Audit (04)

Date: 2026-07-01 · Read-only on our code · Method: three parallel teardowns
(Hevy; Cronometer + MacroFactor; differentiation legibility), grounded in the
repo's prior decompile teardowns (`docs/hevy-teardown-2026-06-29/`,
`docs/competitive-mastery-2026-06-29/`), our code as it stands on `main`
today (verified — several "gaps" in the 06-29 teardowns have since shipped),
and web research (MacroFactor has no repo teardown; their claims come from
their published methodology pages and 2026 reviews — mechanics high
confidence, tap counts ±1). `/audit/competitor-refs/` does not exist in the
repo; no screenshots were available. Companions: 01 (codebase), 02 (UX),
03 (design). No flattery below — verdicts are honest and cited.

Pricing context: Hevy $2.99/mo · $23.99/yr · $74.99 lifetime (quota-gated
free tier). MacroFactor ~$12/mo (~$6/mo annual), paid-only. Cronometer
freemium + Gold. Volyume £4.99/mo · £29.99/yr, free training / Pro
nutrition-coaching, 14-day cardless trial — priced roughly 60% above Hevy
with no lifetime anchor.

---

## 1. Feature/quality matrix (honest scoring)

| Dimension | Hevy | Cronometer | MacroFactor | Volyume verdict |
|---|---|---|---|---|
| Workout logging speed | Row grid, previous-column prefill, ~1 tap/repeat set | — | — | **PAR** — 1-tap prefilled log + keyboard-Done-logs-set + auto-advance beats the grid on taps; BEHIND on keep-awake, warm-up calc, plate calc, iOS lock-screen timer |
| Exercise library UX | Animated gendered demo + muscle diagram per exercise | — | — | **BEHIND** — search/filter parity shipped, swap auto-scorer superior, but zero visual media vs media on every exercise |
| Social / sharing | Full default-public feed, follow graph, img.ly editor, 10+ card archetypes | — | — | **BEHIND (by design)** — no feed per founder/ED decision; on the permitted lane (outbound cards) ~half their archetype breadth; gallery + Stories share shipped |
| Progress visualisation | 5-metric charts, recovery heatmap, widget family, YIR | Passive Gold charts | Trend graph (their strongest) | **AHEAD of Hevy** — 5-metric switcher, recovery layer + MEV/MAV/MRV, ACWR, plateau detection, adaptive TDEE: analysis none of them do. Widget breadth still Hevy's |
| Paywall / monetisation | Lifetime anchor, promo lever, FAQ, comparison, A/B, at ~60% lower price | Freemium | Paid-only, no trial | **BEHIND Hevy** — contextual gates + trigger telemetry shipped; no FAQ/comparison depth/promo/lifetime; our cardless 14-day trial is the one structural edge |
| Food logging speed | — | ~3 taps, opens on diary, voice/photo | ~3 taps, fastest per FLSI, no AI logging | **PAR** — repeat food 3 taps from app open (2 from Diary) via one-tap "Add again" re-log with Undo; no voice/photo (no-AI rule, deliberate) |
| Food database / search | — | NCCDB 60–82 verified nutrients/food | 1.15M all-verified items | **PAR on search UX** (personal-history re-ranking at parity), **BEHIND on data** — 3k verified CoFID + ~100k unverified OFF-UK, 5 surfaced nutrients |
| Coaching communication | — | none | Adherence-neutral in tone AND mechanics | **PAR on voice, AHEAD on safety, BEHIND on mechanics** — our engine approximates intake as prescribed×0.9/1.0/1.1 buckets and gates recalibration on check-in completion; MacroFactor feeds actual intake and recalibrates unconditionally |
| Trend presentation | — | passive | Trend-weight graph drives the budget | **PAR with MacroFactor** — WeightTrendCard is the same shape (smoothed over raw, rate, insight, maintenance estimate) and feeds the engine; goal-band overlay + scrubbing deferred |
| Check-in cadence | — | none | Continuous; check-in is presentation only | **BEHIND MacroFactor** — our weekly wizard is well-automated but is a *gate*: skip it and calories don't recalibrate that week. AHEAD of Cronometer |

---

## 2. What they do better — match or beat (ranked)

1. **MacroFactor: adherence-neutral MECHANICS, not just language.** Feed
   actual logged intake into the expenditure model instead of
   `prescribedKcal × {0.9, 1.0, 1.1}` — the real `recentIntakeAvgKcal` is
   already computed and passed to the FFM floor at the same call site
   (`weeklyCoach.js:725-738`). Deterministic, no AI, all floors stay senior.
   **Engine change → SACRED-gated, structured founder decision.**
2. **MacroFactor: decouple recalibration from check-in completion.** Let the
   adaptive TDEE refresh weekly from weights + rollups even when the wizard
   is skipped; keep the check-in as the wellbeing/safety capture (SCOFF,
   energy, cycle — inputs MacroFactor cannot collect) and the presentation
   moment. **Engine-adjacent → founder decision.**
3. **Hevy: per-exercise visual media** (animated demo + muscle diagram) —
   the most visible remaining quality gap; our library is text-only.
   Direction: commissioned assets on an EU CDN with bundled offline fallback
   (decision-gated: cost + dependency).
4. **Hevy: paywall furniture and price optics.** FAQ + comparison depth can
   ship now (no billing change); the lifetime anchor, promo/win-back lever
   and any price move are **billing sacred-rule items → founder decisions**.
   Note plainly: Hevy converts at ~60% below our price.
5. **Hevy: gym-hygiene basics** — keep-awake (one dependency, needs
   approval), a deterministic warm-up ramp, a plate calculator (the old
   component was deleted; this is a rebuild).
6. **Both nutrition apps: verified-data credibility.** Cheapest first step
   is surfacing what we have — "verified UK (CoFID)" badges via the existing
   source-chip taxonomy; then widen the verified generic core. Full
   micronutrient depth stays behind the existing decision gate (item 16).
7. *(Deliberate non-goals, named so they stop reading as gaps:)* Hevy's
   social feed (ED-safety decision), voice/photo AI logging (no-AI rule),
   Cronometer's 82-nutrient depth (gated).

## 3. What we do that they can't

- **A deterministic, explainable coach.** Same inputs → same outputs, every
  decision with a written rationale from a fixed library; no black box.
  None of the three can make that claim (Hevy Trainer and MacroFactor are
  opaque; Cronometer doesn't coach).
- **An ED-safety system woven through the engine** — tier-blind calorie
  floors, FFM energy floor, rapid-loss gates that only ever raise calories,
  SCOFF screening, calm mode, Beat UK signposting. No competitor has
  anything comparable; it is also why our celebrations and social surfaces
  are deliberately quieter.
- **Division-specific programming** with real asymmetric volume overlays
  (bikini glutes 1.55/abs 0.65; mens physique side-delts 1.40/traps 0.70)
  and per-division judged-criteria rationale.
- **One engine reading everything** — training, weights, food, cardio,
  check-in wellbeing — and adjusting all of it together weekly. Hevy owns
  training; MacroFactor owns nutrition; nobody joins them.
- **Training analysis beyond any of them**: MEV/MAV/MRV landmarks with
  editable targets, ACWR load monitoring, deload logic, plateau detection,
  recovery-aware heatmap.
- **UK-first food data, offline** — CoFID generics + UK branded answering
  in <50 ms with no connection, in a category whose defaults are US data.
- **A 14-day cardless Pro trial** (MacroFactor has no free tier at all;
  Hevy's free tier is quota-pressure).

## 4. The legibility problem (the audit's sharpest finding)

Having advantages is not the same as a user being able to TELL. In week one:

| Advantage | First visible moment | Week-one verdict |
|---|---|---|
| Integrated T+N+check-in loop | Unlabelled check-in pre-fill day 5–7; first cross-domain adjustment day ~12–14 | **INVISIBLE** |
| UK-first food data | Felt at first search (day 1) but never named outside Settings ▸ About ▸ Credits | **INVISIBLE as a claim** |
| Deterministic engine | Claimed day 0; first demonstrated "Why this week:" day ~12–14 (`hasEnoughData` requires week 2) | **PARTIALLY LEGIBLE** |
| Division programming | Minute ~5 day 0 (picker → "· Bikini priorities" stage → reveal receipt) — then no daily fingerprint | **LEGIBLE day 0, invisible after** |

Cheapest legibility wins, all pure re-presentation of data the engine already
computes (no engine changes): provenance-labelled check-in pre-fills ("from
your food diary"); a day-1 "what your coach is reading" ledger (live counts
vs the published 3-weigh-in/5-day/week-2 thresholds); rendering the week-one
hold as a full held-decision receipt instead of the bare baseline view; a
division set-count diff ("a general plan gives glutes N sets; yours has M");
division fingerprints on the heatmap/routine detail; one UK-provenance
sentence at first food search; glossing the CoFID chip.

## 5. Positioning statement — what "far exceeds them" concretely means

**Volyume is the only app where a lifter is coached — training, food and
recovery together — by a system that shows its working and is built to keep
them safe.** Concretely, "far exceeds" is achieved when all five hold:

1. **Logging is never the reason to leave.** Repeat set 1 tap, repeat meal
   ≤3 taps (already true), PLUS the gym basics (keep-awake, warm-ups,
   plates) and rest that alerts through a locked screen — so we match Hevy
   at the bench and MacroFactor at the fridge before the differentiators
   even come into play.
2. **The coach proves itself in week one, not week two.** The user watches
   the ledger fill, sees the held decision with its rule and unlock date,
   and gets their first written "why" having predicted when it would come —
   determinism experienced, not claimed.
3. **Every plan visibly wears its division.** The bikini user sees glutes
   elevated and chest capped on the surfaces she trains from daily — not
   only in a one-shot reveal.
4. **The integration is legible**: every pre-filled answer says which log it
   came from; one engine, visibly reading everything, adjusting everything.
5. **The coaching is adherence-neutral in mechanics as well as voice**
   (actual intake in, recalibration not gated on ceremony) while keeping the
   safety layer none of them have — making us the only app that is both
   more forgiving than MacroFactor and safer than all three.

Everything in 1–4 is presentation and product work on data that already
exists. Only item 5 (and the media/paywall/price items in §2) requires
founder decisions. The moat — deterministic + integrated + division-aware +
UK-native + ED-safe — is already built; the programme's job is to make it
undeniable in the first seven days.
