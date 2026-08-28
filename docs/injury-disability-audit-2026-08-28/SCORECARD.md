# CC33 — The 10/10 scorecard (founder order 2026-08-28)

Founder order, verbatim intent: score the feature against EVERY variable
that matters, not only the original complaints — "everything that matters
to make this function absolutely 10/10 and undeniable."

This file is that yardstick. Twelve dimensions, 86 variables. The S5
gate and the fresh-eyes adversarial review are charged against ALL of
them: the reviewer's brief is to break each claim, and the final verdict
is earned only when the attack fails. Per-variable state is maintained
here with evidence; anything below bar generates a work item, never a
softer wording.

States: LANDED (on main or committed, test-pinned) · IN-FLIGHT (W3
builders) · QUEUED (W4 / wrap-up) · FOUNDER (founder-side action) ·
CEILING (honesty ceiling — cannot be claimed internally at all).

---

## A. Honour — the setting does what it says, everywhere

| # | Variable | State | Evidence |
|---|---|---|---|
| A1 | Fresh generation honours every rule kind | LANDED | CC25 filter + preflight on all six entries (T1-21/22 closed W1) |
| A2 | Baseline rule meets an installed plan | LANDED | plan rewrite proposal, W1 L4; capabilityPlanRewrite suite |
| A3 | Pickers/selection honour rules | LANDED | CC25 + allowance seam W1 L1 |
| A4 | All 12 swap surfaces honour | LANDED | T2 column D map; T2-10 closed W5 |
| A5 | Serve-time honours (substitution/omission) | LANDED | CC29 + W1 fixes; serveGuard suite |
| A6 | Coaching honours (limiters, holds, proposals) | LANDED | W2 L5/L6; constrainedTruth.w2 suite |
| A7 | Block review honours (senior question; stored KEEP never outranks capability) | LANDED | W5; capabilityW5 suite T1-10 block |
| A8 | Plan reactivation honours | QUEUED (wrap-up, T1-11) | PlansScreen deferred behind W3B lane |
| A9 | Allowances honoured by every consumer | LANDED | blockingConflicts seam W1 L1; allowanceSeam suite |
| A10 | Manual adds/overrides never reversed | LANDED | _userAdded W1 L2; serveGuard suite |
| A11 | Laterality honoured (side-carve serves) | LANDED | CC25 §16 + laterality suite |
| A12 | Clinician standing uniform (never carved; distinct everywhere) | PARTIAL — carve law LANDED; named decline confirm QUEUED (W4, T1-04/26) | resolver rank pins |
| A13 | Custom exercises fail closed, carveable, honest receipt | LANDED (by composition) | CAP-8 + T1-07 writer + T1-10 autoEligible; recorded W5 commit |
| A14 | "Hold my plan" honoured end-to-end | PARTIAL — core LANDED; serve/strip consumers QUEUED (wrap-up) | capabilityW5 suite; deferred edits named in its header |
| A15 | Every failure posture fails safe (no silent fail-open) | LANDED | W1 L2 posture set; capabilityPosture.w1.guard |

## B. Visibility — every effect the user can see

| # | Variable | State | Evidence |
|---|---|---|---|
| B1 | Generation reveals shaping (counts on all six entries) | IN-FLIGHT (W3B) | T1-12 brief |
| B2 | Total-block is a graded state, not an engine error | IN-FLIGHT (W3B) | T1-13 brief |
| B3 | Plan view marks conflicted/substituted rows | IN-FLIGHT (W3A) | T2-32 brief |
| B4 | Pre-session presence (Home line, ordinary state) | IN-FLIGHT (W3B) | T1-14/T2-31 brief |
| B5 | In-session notices (episode + baseline + reduced signal) | PARTIAL — notices LANDED (W1 L4); reduced signal IN-FLIGHT (W3A) | RT2-1 amendment; T2-06 brief |
| B6 | Post-session line + what-changed detail | IN-FLIGHT (W3A) | T2-07/T2-22 brief |
| B7 | Coaching output shows the constrained story | LANDED | W2 L6; constrainedTruth.w2 |
| B8 | Effects history renderable to its subject | IN-FLIGHT (W3A, via summary incl. past sessions) | T2-22 brief |
| B9 | Effective denominators everywhere (widget, partner, Today, adherence) | PARTIAL — stats/adherence LANDED; widget/partner/Today IN-FLIGHT (W3B) | T2-16/T1-17 briefs |
| B10 | Lifecycle visible (AWAITING on Today; reintroduction durable line) | PARTIAL — AWAITING IN-FLIGHT (W3B); reintroduction line QUEUED (W4) | T1-15 brief; T2-25 copy half |
| B11 | Swap sheets state their narrowing | IN-FLIGHT (W3A) | T2-08 brief |
| B12 | Why-this explains capability shaping | IN-FLIGHT (W3B) | T1-16 brief |
| B13 | Side-carve named in session | IN-FLIGHT (W3A) | T2-20/T1-24 brief |

## C. Understanding — the user can predict what will happen

| # | Variable | State | Evidence |
|---|---|---|---|
| C1 | One vocabulary per lane, zero blur | QUEUED (W4 sweep) | T2-33/T1-19/T1-08 |
| C2 | Every automatic action carries its why | PARTIAL — session/coach LANDED; remaining surfaces ride W3 | strip/story pins |
| C3 | Previews never over-promise | QUEUED (W4, T2-05) | counting comment admits conflicted-pending today |
| C4 | Effect preview at rule creation (real outcomes) | QUEUED (W4, same fix) | — |
| C5 | Lanes cross-reference both ways | QUEUED (W4, T1-20) | — |
| C6 | Name-by-effect, never diagnosis | LANDED | CC25 §11 + CAP-3; phrase module law |
| C7 | Explanations name the side | IN-FLIGHT (W3A) + LANDED at picker | §16 |

## D. Agency and control

| # | Variable | State | Evidence |
|---|---|---|---|
| D1 | Per-line Apply/Decline | QUEUED (W4, T2-23) | §14 "as a whole or per line" |
| D2 | Every choice revisitable (no one-shot) | QUEUED (W4, T2-23 revisit surface + standing no-ids rewrite audit) | machinery LANDED (computeCapabilityPlanRewrite no-ids mode) |
| D3 | In-the-moment capture creates the episode | QUEUED (W4, T2-11) | — |
| D4 | Suspension valve (hold/resume, per episode) | LANDED (core) / PARTIAL (serve consumers) | A14 |
| D5 | Every check-in answer lands | LANDED | W2 L6 ('fine' acknowledged) |
| D6 | End/extend/promote/flare flows complete | PARTIAL — end/extend/promote LANDED; flare re-propose QUEUED (W4, T1-05) | promotion offer W1 L4 |
| D7 | Sync-arrived rules propose | QUEUED (W4, T1-06) | — |
| D8 | Never words in the user's mouth | LANDED | W2 L6 (T2-18); capabilityCoach pins |

## E. Findability and onboarding

| # | Variable | State | Evidence |
|---|---|---|---|
| E1 | Entry at every moment of need | PARTIAL — in-session LANDED; post-workout/Home/coach IN-FLIGHT; capture QUEUED | R1 inventory vs briefs |
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
| F4 | Clinician rules never allowance-carved | LANDED | allowanceSeam suite |
| F5 | Learning shield incl. boundary carry | LANDED | W2 L7; contamination replay both halves |
| F6 | Reintroduction honest (real ramp, no volume debt) | LANDED | W1 L3 role scoping; reintroduction pins |
| F7 | Article 9 capability consent separate, fail-closed, un-bypassable | LANDED | CC25 §26 + migrate_147; untouched this campaign |
| F8 | Graded response, never a dead end | IN-FLIGHT (W3B, T1-13) + family plans LANDED | — |

## G. Language and dignity

| # | Variable | State | Evidence |
|---|---|---|---|
| G1 | Banned-construction audit clean (GOV.UK/Scope: no "wheelchair-bound", "suffers from", "special needs", "able-bodied"…) | QUEUED (W4 sweep re-audit; R2 digest holds the list) | — |
| G2 | Calm voice, British English, no em dash, no shame | LANDED per landing; sweep confirms at W4 | lint + copy review |
| G3 | RT2-1 dignity: compatible baseline is simply the plan | LANDED (with the honest amendment for contradictions) | W1 L4 |
| G4 | Asymmetry never pathologised | LANDED | CAP-21; §16 |
| G5 | Permission-first tone (app proposes, user decides) | LANDED in flows built; W4 completes | propose/apply/decline pattern |

## H. Privacy and data

| # | Variable | State | Evidence |
|---|---|---|---|
| H1 | Granular Article 9 consent lane | LANDED | F7 |
| H2 | Erasure + export reach capability tables | LANDED | migrate_145 delete_user_data; store export |
| H3 | Zero capability telemetry off-device | LANDED | Q4 ruling; migrate_150 retired |
| H4 | Share surfaces never leak capability | LANDED | share-card rules; T2-29 notifications clean by enumeration |
| H5 | No capability PII to Sentry | LANDED | sentryScrub + error paths reviewed per landing |

## I. Technical integrity

| # | Variable | State | Evidence |
|---|---|---|---|
| I1 | Offline-first (all rules work with no network) | LANDED | SQLite truth; sync additive |
| I2 | Cross-device sync correct (LWW, tombstones, effective_choice + adaptation_mode round-trip) | LANDED | migrate_149 + 152 live (152 applied 2026-08-28); sync suite |
| I3 | Deterministic engine, no AI, no randomness | LANDED (invariant) | engine purity pins |
| I4 | Hot-path performance (resolver on list screens) | REVIEW ITEM — reviewer to attack (per-row conflict computation on RoutineDetail/pickers) | — |
| I5 | Migration hygiene (additive, idempotent, records true) | LANDED | 152 file/README/pin move same-day; stale-comment fix QUEUED (W4) for the 149-era comments |
| I6 | Invariant tests for every law + regression guards | LANDED so far; grows per wave | 7 new suites this campaign; resolver-door guard |
| I7 | FD-1: accommodation free-tier, guardrails tier-blind | LANDED (invariant) | proGate mandate; no tier reads in capability lane |
| I8 | Kill/relaunch/restore correctness | LANDED for serve (Landing 2); reviewer to attack broadly | _userAdded persistence |

## J. Accessibility of the feature itself

| # | Variable | State | Evidence |
|---|---|---|---|
| J1 | Screen-reader labels on every new control | PARTIAL — built surfaces carry roles/labels; W3/W4 surfaces must too (in briefs); reviewer to verify all | accessibilityRole/Label in landed diffs |
| J2 | Touch targets and contrast via tokens | LANDED convention; reviewer spot-checks | theme-token law |
| J3 | Meaning never carried by motion/colour alone | REVIEW ITEM | quiet-line pattern is text-first |
| J4 | Cognitive load: one question at a time, low-choice steps | LANDED pattern (CC25 §11/§12); W4's per-line control must keep it | R2 digest |
| J5 | Dynamic type tolerance on new lines | REVIEW ITEM | — |

## K. The differentiator bar

| # | Variable | State | Evidence |
|---|---|---|---|
| K1 | Configures by effect/position, never diagnosis (We Are Undefeatable pattern) | LANDED | 11-axis ontology |
| K2 | Fluctuation is first-class (episodes, flare, hold, reintroduction) | LANDED core; flare re-propose QUEUED | §22-24 + R8 |
| K3 | The user never translates their condition into gym language | LANDED | directory + name-by-effect |
| K4 | App-prompted review cadence (never user-remembered) | LANDED + Today surfacing IN-FLIGHT | AWAITING machinery |
| K5 | Same strength dose, adapted HOW not HOW MUCH (UK CMO) | LANDED | landmarks never rewritten (§15) |
| K6 | Marketing claims gated by truth fields | LANDED (standing law) | MARKETING-READINESS-MATRIX |

## L. Edge cases and robustness

| # | Variable | State | Evidence |
|---|---|---|---|
| L1 | Blank sessions / first-add / restore | LANDED | W1 L2; serveGuard |
| L2 | Mid-block episode start/end | LANDED | CC30 stamps + W2 carry |
| L3 | Block-boundary crossings | LANDED | W2 L7 carry; boundary pins |
| L4 | Overlapping rules (multi-episode, baseline+episode same exercise) | REVIEW ITEM — reviewer to attack | resolver union semantics pinned |
| L5 | Family plans stay compatible (16 families) | LANDED | seed v14 + scenario matrix |
| L6 | Nothing-fits is graded, never a dead end | IN-FLIGHT (B2) | — |
| L7 | Device-B arrivals (mid-week, mid-session) | PARTIAL — LWW + next-session correct LANDED; Home focus re-read QUEUED (W4, T2-30) | T2-30 disposition |

## The two honesty ceilings (cannot be claimed, whatever the score)

| # | Variable | State |
|---|---|---|
| X1 | Validated by real disabled users | CEILING — REAL-DISABLED-USER-VALIDATED = NO until real users validate; no internal work changes this |
| X2 | Founder device walk of the new flows | FOUNDER — checklist delivered at S5; verdict incomplete until walked |

---

## How the verdict is earned

1. Every IN-FLIGHT and QUEUED row lands and moves to LANDED with evidence.
2. The fresh-eyes ADVERSARIAL REVIEW is briefed against THIS file: attack
   every row, especially the REVIEW ITEMS (I4, I8, J3, J5, L4) and every
   PARTIAL; each surviving claim keeps its state, each broken one becomes
   a work item and the review re-runs after the fix.
3. The S5 gate closes only at: all rows LANDED or FOUNDER/CEILING, full
   suite green, device checklist delivered.
4. The final report to the founder scores all 86 rows and states X1/X2
   plainly. "Undeniable" means the attack failed — not that the builder
   said so.
