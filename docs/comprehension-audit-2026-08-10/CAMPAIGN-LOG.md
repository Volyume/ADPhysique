# Campaign 2 — running log (updated at every landing)

Branch `claude/campaign2-comprehension` from main `0a552cc4`. The
founder's order is the spec (verbatim in session scratchpad
`c2/CAMPAIGN2-ORDER.txt`); D93 in the decisions register carries the
rulings; PHASE1-CLASSIFICATION.md and PHASE2-TERMINOLOGY-CANON.md in
this folder are the ruled foundations.

## Phase status

- **P1 comprehension audit — DONE (ruled).** 40 concepts verified
  against the tree by a read-only auditor (evidence:
  scratchpad `c2/P1-comprehension-verify.md`), classified in
  PHASE1-CLASSIFICATION.md (D93-1). Map corrections recorded for the
  end-of-campaign map update.
- **P2 terminology canon — DONE (ruled), application IN FLIGHT.**
  19 collisions re-verified (evidence: `c2/P2-terminology-verify.md`),
  canon ruled in PHASE2-TERMINOLOGY-CANON.md (D93-2). Two
  implementation agents are applying the canon in disjoint lanes:
  lane C (metrics/effort: volume/tonnage/deload/Est. max/PR labels,
  jargon-blocklist additions, working-sets tooltip fix) and lane D
  (naming: programme→plan, Block finished residue, Profile status,
  Muscle recovery, session feedback, band→range, contest wrinkle).
  Lead-owned canon fixes LANDED: BodyMetrics calm gate "A gentle
  pause" (abe7e8bc).
- **P6 readiness purpose — PARTIALLY DONE (lead).** Home intent sheet
  purpose line now states what the answers feed without teaching
  direction ("It helps decide whether today's planned workload still
  makes sense, and builds a picture of your recovery over time") —
  provable: chips drive downward-only session tweaks
  (sessionAdjustments getReadinessTweak: "good readiness NEVER pushes
  beyond the plan") plus recovery reads. RULED NO-CHANGE: the weekly
  check-in's step subtitles already state honest umbrella purposes at
  the point of asking (step 0 "These answers help Volyume read the
  week in context, not just by numbers"; step 2 "Helps the coach
  decide whether to hold, push, or ease off training"); per-question
  consequence lines would create the response bias the order forbids.
  REMAINING: WorkoutSummary feedback-block purpose line + joint
  discriminator hint (after lane C lands - file owned by that agent).
- **P10 nutrition (part) — weigh-in honesty LANDED (lead, abe7e8bc).**
  Both coach-screen weigh-in counts now mirror the engine's
  distinct-morning credit; receipt row renamed to "mornings with a
  weigh-in"; hold message says "from at least 3 different days";
  confidence addendum says "morning weigh-ins". Closes the
  P1 stop-and-report contradiction and E.8 item 9's copy gap.
  REMAINING: displayed-EWMA vs decision-trend disclosure; phase-label
  unification (canon concept 10); WHAT/WHY/NEXT sweep.
- **P3-P5, P7-P9, P11-P21 — NOT STARTED.**

## Landed commits (this campaign)

- `e1c01324` taskboard Campaign 2 record
- `b2799752` handover session-start block
- `59805aad` Phase 1 classification (D93-1)
- `162f15d3` Phase 2 terminology canon + D93 register block
- `abe7e8bc` weigh-in display honesty + calm-gate retitle + Home
  intent purpose line (weeklyCoach hold message, CoachOutputScreen ×3,
  coachLedger label, coachLedger.test re-anchor ×2, BodyMetricsScreen,
  HomeScreen)

## Recovery path

Read this log + docs/TASKBOARD.md Campaign 2 block + D93 register.
In-flight agent work is uncommitted tree changes in the two lanes named
above: lead-review each diff against PHASE2-TERMINOLOGY-CANON.md, run
lint + focused suites, then land. Never discard, never blind-commit.
