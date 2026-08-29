# CC33 — The 10/10 scorecard (founder order 2026-08-28)

Founder order, verbatim intent: score the feature against EVERY variable
that matters, not only the original complaints — "everything that matters
to make this function absolutely 10/10 and undeniable."

This file is that yardstick. Twelve dimensions, 93 variables plus the
two ceilings (the earlier "86"/"87" headers under-counted their own
table; the adversarial review counted the rows and the header now
matches reality). The S5
gate and the fresh-eyes adversarial review are charged against ALL of
them: the reviewer's brief is to break each claim, and the final verdict
is earned only when the attack fails. Per-variable state is maintained
here with evidence; anything below bar generates a work item, never a
softer wording.

States: LANDED (on the campaign branch or main, test-pinned) ·
REVIEW ITEM (assigned to the adversarial reviewer) · PARTIAL (stated
half-state) · FOUNDER (founder-side action) · CEILING (honesty ceiling —
cannot be claimed internally at all).

State refresh 2026-08-29 (lead, post-W4): every W3/W5/W4 build row moved
to LANDED with its landing evidence. Two defects found and closed at
root during the W4A lead review are recorded on their rows: the plan
rewrite's apply no-op (row shape) on A2, and the capability-blind
substitute selection on A5.

ADVERSARIAL REVIEW ROUND 1 (2026-08-29, on main 1839143e): 12 BROKEN,
16 QUALIFIED, 1 STOP, 64 HOLD. Every BROKEN and actionable QUALIFIED
was verified and closed at root the SAME DAY (rulings recorded as
D113): F1/F2 the row-shape class at serve + block review (library
resolution; unknown-drives-nothing law), F3 the sync carry, F4 honest
unknown copy, F5 clinician-source-outranks-certainty, F6 episode-scoped
keeps + distinct allowance rendering, F7 non-colour selection cue, F8
production-shaped fixtures for the pins that let the class ship, Q4
export completeness, E1's Home ask-row, the J5 arrow label. Q5 stands
as a documented deliberate divergence. The I5 STOP (the migrate_152
phrase-gate record) and CLAUDE.md's stale status block are FOUNDER-side.
Rows below carry their round-1 outcome; the review RE-RUNS against the
fixed tree before S5 closes.

---

## A. Honour — the setting does what it says, everywhere

| # | Variable | State | Evidence |
|---|---|---|---|
| A1 | Fresh generation honours every rule kind | LANDED | CC25 filter + preflight on all six entries (T1-21/22 closed W1) |
| A2 | Baseline rule meets an installed plan | LANDED | W1 L4 + root fix post-W4A: computeCapabilityPlanRewrite read `row.id` off the nested `{routineExercise, exercise}` shape, so apply skipped every line in production; fixed with the suite re-shaped to the REAL row shape + a would-have-caught pin |
| A3 | Pickers/selection honour rules | LANDED | CC25 + allowance seam W1 L1 |
| A4 | All 12 swap surfaces honour | LANDED | T2 column D map; T2-10 closed W5 |
| A5 | Serve-time honours (substitution/omission) | LANDED (round-1 BROKEN F1, fixed) | serve judges LIBRARY-resolved rows (the routine rows carry no demand columns; before the fix an applied demand rule substituted the whole session); unknown drives nothing automatic; composed senior question at all four substitute sites; serveGuard re-shaped to production fixtures + F1 regression pins |
| A6 | Coaching honours (limiters, holds, proposals) | LANDED | W2 L5/L6; constrainedTruth.w2 suite |
| A7 | Block review honours (senior question; stored KEEP never outranks capability) | LANDED (round-1 BROKEN F2, fixed) | blockAdvisor judges library-resolved rows; REPLACE keys on DEFINITE blocking conflicts only; W5 pins updated to the new mechanism |
| A8 | Plan reactivation honours | LANDED | T1-11 repeat-offer after runBlockActivation (9d5b4a1b) |
| A9 | Allowances honoured by every consumer | LANDED | blockingConflicts seam W1 L1; allowanceSeam suite; per-line Keep now mints through the same seam |
| A10 | Manual adds/overrides never reversed | LANDED | _userAdded W1 L2; serveGuard suite |
| A11 | Laterality honoured (side-carve serves) | LANDED | CC25 §16 + laterality suite |
| A12 | Clinician standing uniform (never carved; distinct everywhere) | LANDED (round-1 BROKEN F5, fixed) | source outranks certainty (D113): unknown clinician conflicts survive the carve, rank CLINICIAN, route to the rule editor with honest both-facts copy; allowanceSeam F5 pins |
| A13 | Custom exercises fail closed, carveable, honest receipt | LANDED (by composition) | CAP-8 + T1-07 writer + T1-10 autoEligible; recorded W5 commit |
| A14 | "Hold my plan" honoured end-to-end | LANDED (round-1 BROKEN F3, fixed) | adaptation_mode travels unconditionally in sync pushes (the resume of the last held episode no longer resurrects cross-device); pinned by a DRIVEN round-trip test, not a source string |
| A15 | Every failure posture fails safe (no silent fail-open) | LANDED | W1 L2 posture set; capabilityPosture.w1.guard; per-line save's failed allowance mint is TOLD, never absorbed |

## B. Visibility — every effect the user can see

| # | Variable | State | Evidence |
|---|---|---|---|
| B1 | Generation reveals shaping (counts on all six entries) | LANDED | W3B (bca83133); T1-12 pins |
| B2 | Total-block is a graded state, not an engine error | LANDED | W3B T1-13; graded paths pinned |
| B3 | Plan view marks conflicted/substituted rows | LANDED | W3A T2-32 markers |
| B4 | Pre-session presence (Home line, ordinary state) | LANDED | W3B standalone line + lead hold-tighten; HomeScreen.capabilityVisibility.guard |
| B5 | In-session notices (episode + baseline + reduced signal) | LANDED (round-1 BROKEN F1, fixed) | notices judge the resolved row; definite conflicts speak the lane's copy, unknowns the honest not-known line |
| B6 | Post-session line + what-changed detail | LANDED | W3A T2-07/T2-22 |
| B7 | Coaching output shows the constrained story | LANDED | W2 L6; constrainedTruth.w2 |
| B8 | Effects history renderable to its subject | LANDED | W3A T2-22 summary incl. past sessions |
| B9 | Effective denominators everywhere (widget, partner, Today, adherence) | LANDED | stats/adherence W2; widget/partner/Today W3B T2-16/T1-17 |
| B10 | Lifecycle visible (AWAITING on Today; reintroduction durable line) | LANDED | AWAITING W3B T1-15; T2-25 durable line landed post-W4 (rampMusclesFromPlannedRows reads the source stamp; coach story change with its own why + quiet Home plan-view row; three suites) |
| B11 | Swap sheets state their narrowing | LANDED | W3A T2-08 |
| B12 | Why-this explains capability shaping | LANDED | W3B T1-16 buildWhyThis line |
| B13 | Side-carve named in session | LANDED (round-1 BROKEN F1, fixed) | isSideCarvedAvailable judged on the resolved row (it could never answer true on the partial one); guard suite now DRIVES the mechanism with both shapes |

## C. Understanding — the user can predict what will happen

| # | Variable | State | Evidence |
|---|---|---|---|
| C1 | One vocabulary per lane, zero blur | LANDED | W4B sweep (9d5b4a1b): T2-33/T1-19; T1-08 capability lane's own words end-to-end |
| C2 | Every automatic action carries its why | LANDED (round-1 BROKEN F4, fixed) | UNKNOWN is never spoken as fact: session strip and plan captions gained the picker's own \"doesn't know yet\" branch; mixed rows speak only from what is established |
| C3 | Previews never over-promise | LANDED | W4A T2-05: computePlanEffectiveLines asks the substitute question directly (undecided rules no longer render every line "substituted"); summary is a reduction of the lines; planEffectiveSummary suite |
| C4 | Effect preview at rule creation (real outcomes) | LANDED | same fix; substituted/omitted parts pattern live |
| C5 | Lanes cross-reference both ways | LANDED | T1-20 both sides: W4B AvoidedMovements line + lead's HowYouTrain preference row, route registered in all six stacks, reachability sweep watches AvoidedMovements |
| C6 | Name-by-effect, never diagnosis | LANDED | CC25 §11 + CAP-3; phrase module law |
| C7 | Explanations name the side | LANDED | W3A + picker §16 |

## D. Agency and control

| # | Variable | State | Evidence |
|---|---|---|---|
| D1 | Per-line Apply/Decline | LANDED (round-1 BROKEN F6, fixed) | keeps are EPISODE-SCOPED (allow rows minted into each driving group - end with the episode, restart with a flare, permanent only on promotion); clinician all-or-nothing; every choice takes effect exactly as chosen, for exactly as long as it was asked about |
| D2 | Every choice revisitable (no one-shot) | LANDED (round-1 BROKEN F6, fixed) | allowance rows now render DISTINCTLY (episode card \"(kept in)\", baseline \"Kept in at your word\", reversed remove-confirm stating which way the cut goes); revisit row + honest empty tap stand |
| D3 | In-the-moment capture creates the episode | LANDED | W4B T2-11 preselect capture (9d5b4a1b) |
| D4 | Suspension valve (hold/resume, per episode) | LANDED (round-1 BROKEN F3, fixed) | A14's sync fix; resume now survives cross-device |
| D5 | Every check-in answer lands | LANDED | W2 L6 ('fine' acknowledged) |
| D6 | End/extend/promote/flare flows complete | LANDED | end/extend/promote W1 L4; flare re-propose W4A T1-05 (restart captures minted ids, proposes as the add flow does) |
| D7 | Sync-arrived rules propose | LANDED | W4A T1-06 focus detector (pending-guard + same-set key; explicit actions never gated) |
| D8 | Never words in the user's mouth | LANDED | W2 L6 (T2-18); capabilityCoach pins |

## E. Findability and onboarding

| # | Variable | State | Evidence |
|---|---|---|---|
| E1 | Entry at every moment of need | LANDED (round-1 QUALIFIED, gap fixed) | arrived-but-undecided rules now surface on Home (quiet ask-row sharing the AWAITING slot), landing on the screen whose focus detector proposes immediately |
| E2 | Onboarding inclusion, ungated (DfE pattern) | LANDED | CC25 §11; sexGate-style pins |
| E3 | "How you train" home, named for people not systems | LANDED | RT2-2 |
| E4 | Training considerations directory reachable | LANDED | CC25 gap closure |
| E5 | First-run/free-starter capability-aware incl. failure states | LANDED | W1 L2 (T1-22) |

## F. Safety and clinical posture

| # | Variable | State | Evidence |
|---|---|---|---|
| F1 | ED-safety composition untouched | LANDED (invariant) | floors/calm/suppression suites green every landing |
| F2 | MHRA boundary: signpost, never diagnose/treat | LANDED | CAP-3/CAP-18; no condition-keyed behaviour (GC-D10) |
| F3 | No "safe to perform" claims anywhere | LANDED | CAP-18 pins |
| F4 | Clinician rules never allowance-carved | LANDED | allowanceSeam suite; per-line save mints no allowance under a clinician driver (unreachable by construction, documented) |
| F5 | Learning shield incl. boundary carry | LANDED | W2 L7; contamination replay both halves; causeOverride 'constraint' wired end-to-end (9d5b4a1b) |
| F6 | Reintroduction honest (real ramp, no volume debt) | LANDED | W1 L3 role scoping; reintroduction pins; durable line reads the ramp's own stamp, never a second computation |
| F7 | Article 9 capability consent separate, fail-closed, un-bypassable | LANDED | CC25 §26 + migrate_147; untouched this campaign |
| F8 | Graded response, never a dead end | LANDED | W3B T1-13 graded state + family plans |

## G. Language and dignity

| # | Variable | State | Evidence |
|---|---|---|---|
| G1 | Banned-construction audit clean (GOV.UK/Scope: no "wheelchair-bound", "suffers from", "special needs", "able-bodied"…) | LANDED | lead re-audit 2026-08-29: full banked list + extensions (handicap, cripple, spastic, retard, midget) swept over src/; every hit judged with the mechanism read — data-scope/button-state comments, anatomical tendon usage in form tips, and one never-rendered search alias carrying the clinical subtype name (directory aliases are match-only, index.js:44-49) |
| G2 | Calm voice, British English, no em dash, no shame | LANDED | lint + copy review per landing; W4 sweep + em-dash template-literal guard |
| G3 | RT2-1 dignity: compatible baseline is simply the plan | LANDED (round-1 BROKEN F1, fixed) | a baseline-compatible plan no longer wears \"sits outside how you train\" on every row - the exact inversion the fix removed |
| G4 | Asymmetry never pathologised | LANDED | CAP-21; §16 |
| G5 | Permission-first tone (app proposes, user decides) | LANDED | propose/apply/decline pattern complete across W1–W4 |

## H. Privacy and data

| # | Variable | State | Evidence |
|---|---|---|---|
| H1 | Granular Article 9 consent lane | LANDED | F7 |
| H2 | Erasure + export reach capability tables | LANDED (round-1 QUALIFIED Q4, fixed) | the portability export now carries effective_choice and adaptation_mode - both user-supplied decisions |
| H3 | Zero capability telemetry off-device | LANDED | Q4 ruling; migrate_150 retired |
| H4 | Share surfaces never leak capability | LANDED | share-card rules; T2-29 notifications clean by enumeration |
| H5 | No capability PII to Sentry | LANDED | sentryScrub + error paths reviewed per landing |

## I. Technical integrity

| # | Variable | State | Evidence |
|---|---|---|---|
| I1 | Offline-first (all rules work with no network) | LANDED | SQLite truth; sync additive |
| I2 | Cross-device sync correct (LWW, tombstones, effective_choice + adaptation_mode round-trip) | LANDED (round-1 BROKEN F3, fixed) | both decision columns travel unconditionally; driven round-trip pin |
| I3 | Deterministic engine, no AI, no randomness | LANDED (invariant) | engine purity pins |
| I4 | Hot-path performance (resolver on list screens) | HOLDS (round 1, measured) | picker full-library pass 0.131 ms, 8-row markers 0.034 ms, worst-case 32-slot rewrite 0.519 ms at 300 exercises x 12 rules (Node; device confirmation rides X2) |
| I5 | Migration hygiene (additive, idempotent, records true) | FOUNDER (round-1 STOP S1) | files and records additive and true (149/151-era comments corrected 9d5b4a1b; the sync file's own pre-152 comment corrected with F3); the one open item is founder-side: the migrate_152 record accepted a structured named confirmation as the phrase-gate equivalent, which contradicts CLAUDE.md's exact-phrase law - surfaced for the founder to ratify or tighten |
| I6 | Invariant tests for every law + regression guards | LANDED (round-1 BROKEN F8, fixed) | the pins that let F1/F2/F3 ship now drive the real mechanisms with PRODUCTION-shaped fixtures (serveGuard asServed + drift guard; sideCarve driven both shapes; sync round-trip driven) |
| I7 | FD-1: accommodation free-tier, guardrails tier-blind | LANDED (invariant) | proGate mandate; no tier reads in capability lane |
| I8 | Kill/relaunch/restore correctness | LANDED (round-1 QUALIFIED, condition resolved) | markers persist, effects append dedupes, mid-alert deaths recover via the detector/revisit row; the one condition (\"the relaunch pass re-runs F1\") dissolved with F1's fix |
| I9* | Preview/serve/rewrite agree by construction | LANDED | one seam: computePlanEffectiveLines feeds the summary; substituteSeniorQuestion feeds all four substitute sites |

*I9 added at the lead review: the W4A finding class (two computations of
"what will happen" drifting apart) earns its own standing row.

## J. Accessibility of the feature itself

| # | Variable | State | Evidence |
|---|---|---|---|
| J1 | Screen-reader labels on every new control | PARTIAL — built surfaces carry roles/labels; reviewer to verify all W3/W4 surfaces | accessibilityRole/Label in landed diffs |
| J2 | Touch targets and contrast via tokens | LANDED convention; reviewer spot-checks | theme-token law |
| J3 | Meaning never carried by motion/colour alone | LANDED (round-1 BROKEN F7, fixed) | Choice selection carries a tick + border weight beside colour; every other surface HELD the round-1 attack (text-first throughout) |
| J4 | Cognitive load: one question at a time, low-choice steps | LANDED pattern (CC25 §11/§12); per-line review is one binary per row, default Apply | R2 digest |
| J5 | Dynamic type tolerance on new lines | HOLDS (round 1) | no fixed heights, no capability numberOfLines, rows wrap; the arrow-glyph residual closed with a spoken label |

## K. The differentiator bar

| # | Variable | State | Evidence |
|---|---|---|---|
| K1 | Configures by effect/position, never diagnosis (We Are Undefeatable pattern) | LANDED | 11-axis ontology |
| K2 | Fluctuation is first-class (episodes, flare, hold, reintroduction) | LANDED | §22-24 + R8; flare re-propose W4A; reintroduction durable line |
| K3 | The user never translates their condition into gym language | LANDED | directory + name-by-effect |
| K4 | App-prompted review cadence (never user-remembered) | LANDED | AWAITING machinery + Today surfacing (W3B) |
| K5 | Same strength dose, adapted HOW not HOW MUCH (UK CMO) | LANDED | landmarks never rewritten (§15) |
| K6 | Marketing claims gated by truth fields | LANDED (standing law) | MARKETING-READINESS-MATRIX |

## L. Edge cases and robustness

| # | Variable | State | Evidence |
|---|---|---|---|
| L1 | Blank sessions / first-add / restore | LANDED | W1 L2; serveGuard |
| L2 | Mid-block episode start/end | LANDED | CC30 stamps + W2 carry |
| L3 | Block-boundary crossings | LANDED | W2 L7 carry; boundary pins |
| L4 | Overlapping rules (multi-episode, baseline+episode same exercise) | LANDED (round-1 QUALIFIED, gap fixed) | six multi-driver attacks survived; the one gap (the allowance's union-wide permanent carve) closed by F6's episode scoping |
| L5 | Family plans stay compatible (16 families) | LANDED | seed v14 + scenario matrix |
| L6 | Nothing-fits is graded, never a dead end | LANDED | B2 |
| L7 | Device-B arrivals (mid-week, mid-session) | LANDED (round-1 BROKEN F3, fixed) | the hold-resume resurrection closed; T2-30 re-read stands; E1's Home ask-row surfaces arrived-undecided rules |

## The two honesty ceilings (cannot be claimed, whatever the score)

| # | Variable | State |
|---|---|---|
| X1 | Validated by real disabled users | CEILING — REAL-DISABLED-USER-VALIDATED = NO until real users validate; no internal work changes this |
| X2 | Founder device walk of the new flows | FOUNDER — checklist delivered at S5; verdict incomplete until walked |

---

## How the verdict is earned

1. Every IN-FLIGHT and QUEUED row lands and moves to LANDED with evidence.
   (Done 2026-08-29; the table above is the post-W4 state.)
2. The fresh-eyes ADVERSARIAL REVIEW is briefed against THIS file
   (REVIEW-BRIEF.md): attack every row, especially the REVIEW ITEMS
   (I4, I8, J3, J5, L4) and every PARTIAL (J1); each surviving claim
   keeps its state, each broken one becomes a work item and the review
   re-runs after the fix.
3. The S5 gate closes only at: all rows LANDED or FOUNDER/CEILING, full
   suite green, device checklist delivered.
4. The final report to the founder scores all rows and states X1/X2
   plainly. "Undeniable" means the attack failed — not that the builder
   said so.
