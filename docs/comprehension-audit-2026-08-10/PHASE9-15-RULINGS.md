# Campaign 2, Phases 9-17 — lead rulings (D93-3)

Ruled 2026-08-10 under D33. Evidence base: the Phase 1/2 verification
sweeps plus the changes landed this campaign. Classes for Phase 9:
1 = user needs to know · 2 = optional explanation · 3 = internal, keep
hidden · 4 = existing copy misleading, fix.

## Phase 9 — the twenty unexplained weekly-coach decisions (E.8)

| # | Decision | Class | Ruling |
|---|---|---|---|
| 1 | Recovery/performance grades | 3 | The notes already state resulting reasons; grades are implementation. |
| 2 | Autoregulation matrix mapping | 3 | Methodology's summary ("removing up to 2 or adding up to 3 sets... scored together") is the right level. |
| 3 | Stress forces recovery read down | 3 | The check-in umbrella states purpose; the mechanism would teach answer-shading. |
| 4 | Peak-week softening | 2 | Speaks when it acts on a push ("Peak-week fatigue is part of the plan"); silent when merely preventing a hold - no visible decision changed, nothing to explain. |
| 5 | Over-performance escalation eligibility | 3 | The line fires when it acts; the 3-week rule is internal. |
| 6 | On-target band width | 3 | "On target"/"off the pace" is the consequence; the formula is internal. |
| 7 | Displayed vs decision trend | 4 | **FIXED**: the coach chip tooltip now carries the sturdier-trend disclosure. |
| 8 | Confidence-dependent persistence | 3 | The weeks-left hold line states the consequence; the dependency is internal. |
| 9 | Distinct weigh-in days | 4 | **FIXED**: hold message says "from at least 3 different days"; both screen counts mirror the engine's per-morning credit; receipt names mornings. |
| 10 | Rapid-loss threshold | 3 | Discloses itself fully when it fires (by design); pre-publishing a safety threshold invites steering under it. |
| 11 | Free-text note parsing | 3 | Ruled in D93-1: disclosure teaches both gaming and self-censorship; the ask's hint honestly signals the note is read. |
| 12 | Cycle-flagged holds | 1 | Already served: explained at the ask and in the held reason. |
| 13 | Photo-corroboration confidence step | 3 | Disclosing that photos raise the caption would nudge photo-taking on a body-image-adjacent surface; the caption keys the honest weigh-in addendum off raw confidence (D18 bound) already. |
| 14 | Deload dose scaling | 2 | **SERVED**: Methodology's new Recovery weeks section states per-muscle scaling and the protective variant; the post-apply receipt states the exact share (D91-23); strain maths stays internal. |
| 15 | Fail-closed suppression silence | 3 | A quieter app is the correct degraded state; the one deliberate exception stays the intake-read-failed hold (Campaign 1), where money/food safety demanded disclosure. |
| 16 | jointPain unanswered as false | - | Fixed by Campaign 1 (tri-state). |
| 17 | Scan classification recording | 3 | Never coaching-consumed; surfacing enum labels serves nobody. |
| 18 | Plateau banner ranking | 3 | The banner states lift + stall length - the consequence. |
| 19 | Insight minimum-data thresholds | 2 | Served at the right level by the Analytics momentum note ("Good start. A couple more sessions..."); numbers stay internal. |
| 20 | Rule 4 removal | - | Historical only. |

## Phase 10 — phase-label unification: VERIFIED NO-CHANGE

Canon concept 10's condition ("where the displayed value IS the profile
phase") fails on NutritionTargetsScreen: its goal state is the
calculator's OWN selection (profile-seeded once at load, then freely
user-changeable on the same screen), so showing the profile label would
be wrong whenever they diverge. Each surface already displays its own
true value; the differing vocabularies are synonymous descriptions of
linked but distinct objects. Re-plumbing is additionally coupled to
persisted LABEL strings (syncFormFromTargets inverts `t.phase` by exact
label match), so renaming label sets breaks legacy-row sync. RESIDUAL
(recorded, not parked): harmonising the three label vocabularies needs
a migration-aware pass with device verification - listed in the final
handover for founder decision.

## Phase 11 — insufficient-evidence language

The live holds already speak one register ("Not enough session feedback
to judge", "Need morning weights from at least 3 different days",
"There wasn't enough...", "too little to judge the response", "We need
another week..."-style). No "low confidence" bare-label leak exists:
the confidence captions each state their consequence. The
not-changing-is-a-decision principle is stated by Methodology ("A held
week is Precision Coaching working, not asleep") and now PINNED
(Phase 20 suite). No copy changes required.

## Phase 15 — glossary classification (32 entries after Phase 3)

- **KEEP (live, correct):** precisionCoaching, volume, deload,
  maintenanceCalories, refeed, macroCycle, estMax, effort, volumeBands,
  repRegression, adaptiveTdee, ewma, bodyFatMethod, engineLog,
  division, phase, proteinTier, recomposition, superset, volyumeScore,
  workingSets, tonnage.
- **KEEP (rewritten this campaign):** rir (founder's register + the
  provable why), streakWeeks (deload leak removed).
- **KEEP (newly wired):** mesocycle (call site: the block sheet - the
  orphan resolved by wiring, not forcing), pr (ADDED, three surfaces).
- **KEEP (a11y-only, deliberate):** set, rep - the ActiveWorkout
  accessibility hint remains their only surface; a sighted-novice
  in-flow definition is recorded as a residual for a future novice
  pass, not forced into set-entry chrome now.
- **ORPHANED-BUT-HARMLESS (keep the entry, wire nothing):** macros
  (NutritionEducation §2 is the reachable definition; a tooltip would
  duplicate), strengthLevel (LiftProgress renders levels with its own
  copy), autoregulation, redS (their concepts live in Methodology
  unnamed; the entries are accurate and cost nothing).
- **REMOVE / INTERNAL-ONLY / ORPHANED-DEAD:** none.
- **NOT ADDED (per the order):** MEV, MAV, MRV, Theil-Sen, strain
  score, Block Ledger, classifier names, internal safety rules.

## Phase 16 — first encounters (the order's four examples)

PR celebration: self-explanatory plain-English labels, definition
reachable at the records surfaces. Readiness before a workout: purpose
stated on the sheet. Recovery week on Home: the chip line explains
("Recovery week, pull effort back.") and the sheet carries the why.
Personalised starting volume in a new block: block-start lines name
number and source; the research state now speaks too. All four pass.

## Phase 17 — accessibility of this campaign's changes

Every addition is plain Text or an InfoTooltip (AX-01-compliant focus
management, 44px targets); the renamed chip labels flow into their
accessibilityLabels ("Recovery, tap to..."); no meaning was attached
to colour, icon shape or animation; no a11y behaviour was removed.
Screen-reader users get the same purpose lines sighted users do.

## Phase 18/19 — standing confirmations

Phase 18: jargon law STRENGTHENED (deload + tonnage patterns, ruled in
D93-2); "1RM" considered and declined with the leak fixed directly; no
banned term removed. Phase 19: every change reused the existing
architecture (GLOSSARY + InfoTooltip, blockExplain written-rows
builders, Methodology sections, held-decision reasons); no parallel
explanation system was created; each rationale has one source.
