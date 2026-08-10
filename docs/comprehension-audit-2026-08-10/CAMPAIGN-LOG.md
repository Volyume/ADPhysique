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
- **P3 PR — DONE.** GLOSSARY.pr added (one meaning: any of the three
  record kinds, never requiring a max-out); reachable from both
  ExerciseDetail records sections and BlockReflection's records list;
  celebration toast deliberately untouched (its labels already speak
  plain English; a 2.2s toast is no place for education).
- **P4 training block — DONE.** Block sheet now defines a training
  block (GLOSSARY.mesocycle wired to its natural surface, orphan
  resolved), states why workload climbs and that finished blocks teach
  the next one; consider_rebuild's primary CTA renamed 'Repeat this
  plan anyway' (was sharing 'Continue this plan' with the repeat
  recommendation).
- **P5 effort model — DONE.** GLOSSARY.rir rewritten in the founder's
  register with the provable why (the block's effort ladder: a
  prescription, never a user report - per-set RIR entry is
  settled-removed); no in-session clutter added since the phrase never
  renders in-session.
- **P6 readiness purpose — DONE** (see above; WorkoutSummary purpose
  line + joint discriminator landed).
- **P7 learned personalisation — DONE.** Research-start line added to
  buildBlockStartLines (only when every written row carries a known
  research-family source; legacy/unknown stays silent); manual
  override's learning-pause disclosed on the volume-target editor;
  interBlock rationale strings verified to already match the founder's
  retain/increase/reduce/insufficient semantics.
- **P8 recovery/deload — DONE.** Methodology gains a Recovery weeks
  section stating both sizing states (per-muscle scaling from completed
  work; simpler protective week in calmer coaching or under a safety
  hold) and that longer recovery is only ever proposed. The shared
  deload gloss deliberately does NOT carry the scaling claim (false
  under suppression); the post-apply receipt already states the exact
  share (D91-23).
- **P9 coach decisions — DONE (ruled).** All twenty E.8 decisions
  classified in PHASE9-15-RULINGS.md: two were FIXED this campaign
  (trend disclosure, distinct-morning counts), one served by the new
  Methodology section, the keep-hidden set ruled with rationale.
- **P10 nutrition — DONE.** Weigh-in honesty landed; the coach trend
  chip now discloses the sturdier decision trend (scoped to that
  surface); phase-label unification VERIFIED NO-CHANGE (the calculator
  displays its own selection; label-inversion coupling documented) with
  the harmonisation residual recorded for the founder.
- **P11 — DONE (ruled).** One insufficient-evidence register verified;
  not-changing-is-a-decision pinned via Methodology line.
- **P12 — DONE.** consider_rebuild CTA renamed 'Repeat this plan
  anyway'; Coached mode discloses safety waits for confirmation (D16
  user-visible); Campaign 1 proposal/applied pins stay green.
- **P13 — folded into P2/P9 rulings** (Total lifted informational
  labels; PR density code-only; no informational metric claims to
  drive coaching).
- **P14 — DONE (audited in passing).** No safety copy weakened; floors
  unpublished (pinned); ED/calm branches untouched except the
  calm-gate retitle.
- **P15-P19 — DONE (ruled)** in PHASE9-15-RULINGS.md.
- **P20 — DONE.** src/__tests__/campaign2.comprehension.test.js: 20
  pins across training/effort/PR/readiness/nutrition/recovery/
  automation. Full suite 9,706 passing, lint clean.
- **P21 — IN FLIGHT.** Two Opus fresh-eyes reviews dispatched (A
  novice, B truth/consistency); findings will be actioned before the
  final gates.

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
