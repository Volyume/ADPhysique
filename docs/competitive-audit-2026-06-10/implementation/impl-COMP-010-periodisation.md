Status: BLUEPRINT | Timestamp: 2026-06-11 | COMP-010 Visible periodisation
Branch: claude/main-branch-content-update-dcqicf | Score baseline: 3.5 | Do not modify code.

# COMP-010 — Visible periodisation (block-shape visual)

Block-shape visual = week dots + jargon-free effort labels + an anticipatory
"recovery week in N". Lives on the Home meso chip tap-through and on PlanDetail.
This is a **tap-through**, not a new Home card — the Home hierarchy rule (one
hero read, depth below) is held. The chip stays glanceable; tapping it opens the
full block shape.

Hard constraint: **MEV / MRV / RIR are banned in user copy.** The current chip
leaks this ("stop 1 short of failure", "Effort 4" derived from `5 - rirTarget`).
This blueprint replaces that derivation with a named effort vocabulary and flags
the vocabulary for founder copy review.

---

## 1. Best-in-market bar

What the field does, and what makes each comprehensible to a non-coach:

- **RP Hypertrophy (block view).** Volume and intensity climb across a 4–6 week
  mesocycle, then a deload. The structure is sound and is the closest reference
  to Volyume's own engine. What makes it *legible* is that the app tells you what
  to do next week without you reading a chart. What fails the non-coach: it still
  surfaces RIR, set-progression tables and "mesocycle" as words. Reviewers note
  it removes the *mental* load of autoregulation but assumes you already speak
  the language. (dr-muscle critique; rpstrength.)
- **Caliber — plan progression.** Linear, coach-narrated phase progression. Legible
  because a human frames "where you are". Weak as a self-serve visual.
- **TrainingPeaks PMC (fitness / fatigue / form).** The most information-dense
  reference and the clearest *failure* of comprehensibility: three exponentially
  weighted lines (CTL/ATL/TSB) that even endurance coaches write explainer posts
  about ("don't chase the blue line"). Powerful for the initiated, opaque to a
  gym-goer. We borrow the *idea* (you carry fatigue; readiness ≠ fitness) and
  throw away the chart.
- **Fitbod — progressive overload + muscle-freshness heat map.** Progression is
  hidden by design; the heat map answers "what's fresh / what needs rest" at a
  glance. Strong visual-comprehension lesson: a *shape* (body map) beats a number.
  Weakness: no block-level "where am I in the arc" story.
- **Strong — program view.** Exceptionally clean log; assumes you bring your own
  programming. No periodisation narrative at all.

**Single best to beat:** RP Hypertrophy. It owns the block concept and our
engine already mirrors it (4+1 / 5+1, `setsMultiplier` ramp, recovery week). The
gap we exploit is comprehensibility for the non-coach — see §7.

## 2. What fails (periodisation UX that confuses)

- **The word "mesocycle".** Academic; used interchangeably with "phase"/"block"
  even by professionals. A gym-goer does not know it and will not learn it to use
  an app. (Brookbush; coachRx.)
- **RIR / RPE / MEV / MRV jargon.** Already banned here. "Stop 2 short of failure"
  is borderline-acceptable plain English but "Effort 4" (a `5 - rirTarget`
  number) is a naked scale with no anchor — it reads as a score, not an
  instruction.
- **Complex charts get abandoned.** TrainingPeaks-style multi-line charts, "15
  progress charts" — users touch ~10% of features and eat 100% of the complexity;
  a simple obvious-at-a-glance read wins retention over a chart nobody opens.
- **Deload framed as loss.** If the back-off week looks like a downward line or a
  "reduced" bar, users read it as regression or "losing gains" and skip it.

## 3. User psychology

- **"Where am I in the journey?"** The single question the visual must answer in
  one glance. A row of week dots with a clear "you are here" marker answers it
  faster than any number.
- **Anticipatory "recovery week in N".** Surfacing the back-off *before* it
  arrives reframes it from interruption to plan. Deload anxiety is real ("am I
  losing progress?"); the antidote is (a) seeing it coming and (b) copy that
  frames it as engineered, earned recovery, not a setback. Evidence: lifters
  report relief and renewed motivation after a deload; detraining needs 2–3 weeks
  of *inactivity*, not one lighter week — so the reassurance is true.
- **The gym-goer who's never heard of periodisation** still intuitively
  understands **ease in → build → push → peak → recover**. That arc is the
  product. Name the phases in those words and the structure teaches itself.

## 4. The Volyume implementation

### The week-dots visual
A horizontal row of dots, one per planned week (`plannedWeeks`, typically 5 or
6). Each dot:
- carries its **effort phase** (see vocabulary below) as a one-word label or, in
  the compact chip-tap sheet, colour + the current-week label only;
- the **current week** is marked (filled / ringed "you are here"), past weeks
  muted, future weeks outlined;
- the **recovery dot** is visually distinct (a soft, restful treatment — not a
  shrunken or "down" bar), so it reads as a destination, not a dip.

States to handle:
- **No plan / no active block** → component returns null (mirror
  `BlockProgressCard`'s `return null` guard). Chip is not shown; nothing to tap.
- **Week 1** → "you are here" on the first dot; "recovery week in N" shows the
  full remaining count.
- **Deload week** (`isDeload`) → current marker on the recovery dot; copy flips
  to reassurance, "recovery week in N" suppressed.
- **Final / overdue block** → align with `getBlockStatus` (`complete`/`overdue`):
  invite starting the next block (hand-off to COMP-005 recap), do not keep
  counting past the recovery dot.

### Jargon-free effort vocabulary (PROPOSE — flag for founder copy review)
Maps directly onto the existing `phase` field in `MESO_SCHEDULE`
(`intro | build | peak | recovery`), so no engine change is needed:

| engine phase | proposed user word | meaning conveyed |
|--------------|--------------------|------------------|
| `intro`      | **Ease in**        | settle into the movements |
| `build`      | **Build**          | add a little, keep climbing |
| `peak`       | **Push** *(peak week)* | best effort of the block |
| `recovery`   | **Recover**        | back off, recharge |

So the arc reads: **Ease in → Build → Build → Push → Recover.** A five-word
spectrum, no numbers, no RIR. (Spec suggested "Peak"; recommending **Push** for
the peak dot because "peak" reads as a noun/place to a non-coach, "Push" is an
instruction. Founder to choose Push vs Peak — both are pre-cleared as
non-jargon.) Effort intensity within a phase, if shown at all, is conveyed by
the dot's COMP-027 colour weight, never by a bare 1–5 score.

> **DECISION FOR FOUNDER:** confirm the five words (Ease in / Build / Push /
> Recover) and the Push-vs-Peak call. This is the load-bearing copy decision;
> everything else is mechanical.

### When "recovery week in N" appears
Derive N from current `weekIndex` vs the recovery dot (last week), i.e. the same
arithmetic as `predictDeloadWeek`'s `weeksToScheduled`. Show it on accumulation
weeks only. Suppress on the recovery week itself (replace with the reassurance
line). If autoregulation has pulled the deload early (COMP-015 /
`predictDeloadWeek` returning a reduced N), the line reflects the *earlier* of
scheduled vs predicted — "recovery week in 1" rather than the calendar value.

### Where it lives — same component, two mounts
One component, **`BlockShapeCard`**, mounted in two places:
- **Home meso chip tap-through.** The chip at `HomeScreen.js:1092` becomes a
  `TouchableOpacity` opening a bottom sheet / lightweight screen containing
  `BlockShapeCard`. (It is currently a static `<View>` — making it tappable is
  the main Home change.)
- **PlanDetailScreen.** Mounted inline as a section (PlanDetail has no block
  visual today), giving the persistent "this is the shape of your plan" view.

Same component, density prop (`compact` for the chip sheet, `full` for
PlanDetail) so the dots + vocabulary + colours stay identical across both — no
parallel visual languages (the explicit lesson from the Progress-tab assessment:
one visual idiom per concept).

### Copy (house voice — plain, no cheerleading)
- Accumulation: *"Week 3 of 5 · Build. Recovery week in 2."*
- Approaching: *"Week 4 of 5 · Push — your hardest week of the block. Recovery week next."*
- Recovery week (reassurance, anxiety antidote): *"Recovery week. Lighter on purpose — this is where the work pays off. You don't lose anything by easing back."*

## 5. Whole-package integration

- **COMP-027 (semantic colour on track / watch / act).** Reuse its colour
  vocabulary for the dots — do **not** invent a parallel system. The phases are
  not good/bad, so the *neutral/track* treatment dominates; the only place colour
  shifts is the current-week marker (amber accent, the locked single accent) and
  the recovery dot (a calm, restful weight from the COMP-027 scale, e.g. its
  CVD-safe success token — never a "warning/over" colour, which would read as
  regression). Confirm exact token mapping against the COMP-027 blueprint when it
  lands; this doc declares the *intent* (recovery = calm/positive, current =
  accent, neutral elsewhere), COMP-027 owns the hex.
- **COMP-005 (block-end recap)** references the same block shape — recap reuses
  `BlockShapeCard` (all dots complete, recovery filled) as its visual anchor and
  hands off to "start your next block".
- **COMP-015 (autoregulation)** is *explained by* block phase: when the coach
  holds/cuts volume, the explanation ties to where you are on the arc ("you're
  deep in Build, fatigue is normal here") and can pull the recovery dot earlier.
- **Home hierarchy.** No new card on Home. The hero (next workout) is untouched;
  the chip gains a tap affordance and a chevron. One read on top, depth on tap.

## 6. Retention / word-of-mouth

"I can *see* the plan working" is the share-worthy moment — a user who can point
at the dots and say "I'm in the Push week, recovery's next" has internalised the
programming without a coach. The recap (COMP-005) at block end is the natural
screenshot/brag artefact. Anticipatory recovery also defends retention at the
classic churn point: the week training feels hard, the user sees it was *planned*
and that relief is coming, instead of quitting.

## 7. Beating RP Hypertrophy for the non-coach

RP wins the coach and the enthusiast; it loses the gym-goer who won't learn RIR
or "mesocycle". Volyume's engine is already RP-shaped, so the win is purely
*comprehension*: name the phases in plain words, show the arc as dots, surface
recovery before it arrives, and never print a naked effort number. Same science,
no entry exam. That is the wedge.

## 8. Measurement (2–4 metrics)

1. **Chip tap-through rate** — % of Home sessions where the meso chip is tapped
   (does the affordance get discovered?).
2. **Deload-week adherence** — % of users who log the recovery week as
   prescribed (lighter) vs skip/overshoot it (the anxiety signal).
3. **Block completion rate** — % of started blocks reaching the recovery week
   (vs `overdue`/abandoned) before vs after ship.
4. **PlanDetail block-section dwell / scroll-into-view** — is the inline visual
   seen.

## 9. Build notes

**What `BlockProgressCard` already does (and is NOT this).** It shows planned-vs-
actual *set volume per muscle* this week (bars) on the Progress tab. It is a
different visual (per-muscle progress, not the week arc) and already leaks the
banned scale at line 25 (`Effort ${5 - rirTarget}`) — that derivation is exactly
what COMP-010 retires. `BlockShapeCard` is a **new component**; do not overload
`BlockProgressCard`. (Separately flag, do not fix: the `5 - rirTarget` line and
the chip's "stop N short of failure" both breach the RIR-copy ban today.)

**Data: what `getCurrentMesocycleWeek` gives vs what's new.**
`getCurrentMesocycleWeek(userId)` (`database.js:2662`) returns the **current week
only**: `{ weekIndex, isDeload, rirTarget, plannedWeeks, blockType, mesoName,
deloadProtocol }`. It does **not** return the per-week phase array the dots need.
Two options:
- **(A, preferred) Derive the arc client-side** from `getMesoSchedule(experience)`
  in `mesocycle.js` (pure, already exports `phase` per week). `plannedWeeks` from
  the row picks `standard` (5) vs `advanced` (6); `weekIndex` marks "you are
  here"; "recovery week in N" = recovery-week-index − weekIndex. **No new query,
  no schema change, offline-clean.** Caveat: confirm `plannedWeeks` ↔ schedule
  length agree for the user's experience; if a stored block can diverge from the
  pure schedule, prefer reading the actual `mesocycle_weeks` rows.
- **(B) New read** over `mesocycle_weeks` (has `weekIndex, plannedWeeks,
  rirTarget, isDeload`) returning all rows for the active block, mapping
  `is_deload`/position → phase. More faithful to a customised block; one new
  query. Choose B only if blocks can be edited away from the canonical schedule.

**The vocabulary decision** (the one human call): confirm Ease in / Build / Push
/ Recover and Push-vs-Peak (§4). Pre-cleared as non-jargon; needs founder sign-off
before any string ships.

**Effort vs 3.5.** Moderate. One new presentational component built on existing
pure functions; one chip turned tappable + a sheet/route; one inline mount on
PlanDetail; reuse COMP-027 colours. No engine, billing, sync, or safety change.
Offline-first preserved (option A is pure/local). Largest-but-small risk is the
copy review gate, not code.

**Risks.**
- *Copy-ban regression:* must remove the `5 - rirTarget` / "short of failure"
  surfaces, not add a clean component beside the dirty one. Coordinate the chip
  rewrite with this.
- *Colour drift:* must consume COMP-027 tokens, not define new ones (Progress-tab
  assessment §2/§3 warns against per-surface colour reinvention).
- *Schedule/`plannedWeeks` mismatch* under option A for edited or advanced blocks
  — validate before relying on the pure schedule.
- *Deload framing:* the recovery dot must never use a warning/over colour or a
  shrunken bar, or it re-creates the loss-anxiety the feature exists to remove.

---

### Sources
- [RP Hypertrophy critique — dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/)
- [RP Hypertrophy app — rpstrength](https://rpstrength.com/pages/hypertrophy-app)
- [Mesocycle terminology — Brookbush Institute](https://brookbushinstitute.com/glossary/mesocycle-periodization)
- [Periodization planning tools — CoachRx](https://www.coachrx.app/articles/planning-amp-periodization-tools-to-design-better-programs)
- [TrainingPeaks Performance Management Chart](https://www.trainingpeaks.com/learn/articles/what-is-the-performance-management-chart/)
- [Don't chase the blue line — thethreshold.coach](https://www.thethreshold.coach/single-post/don-t-chase-the-blue-line)
- [How Fitbod tracks progress](https://fitbod.me/blog/how-fitbod-tracks-your-strength-progress-with-real-time-metrics-and-scores/)
- [Best strength apps 2026 (Strong vs Fitbod) — findyouredge](https://www.findyouredge.app/news/best-strength-training-apps-2026)
- [Deload week & psychology — pliability](https://pliability.com/stories/deloading-week)
- [Deload week — BarBend](https://barbend.com/deload-week/)
- [Simple vs complex tracking — Setgraph](https://setgraph.app/ai-blog/simple-workout-app-guide)
