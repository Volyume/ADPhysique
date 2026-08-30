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

ADVERSARIAL REVIEW ROUND 9 (2026-08-30, on 71702dce): NOT CLEAN - 1
BROKEN, 9 QUALIFIED, 0 STOP - the strongest convergence yet, and the
one broken row is round 8's own fix. Closed same day (D121): R9-1 the
replaceSource mechanism is REVERTED (serve runs over the PERSISTED
reduced list, so a second pass cannot re-derive pass-1's omissions and
the replace DELETED them; both scenarios D120 ruling 9 cited are
unreachable - the reduction is persisted and a _capabilityTemp session
never re-serves; the append is a pure deduped merge again, the
source:'serve' tag stays forensics-only, driven two-pass pin on the
real DB; the I8 row's revocation claim is withdrawn below), B4/E1
Home renders one quiet non-tappable could-not-check line on the
resolver's exact no-known-state signature (unavailable && !stale, and
the effect's catch; stale-but-known keeps serving per CAP-17), C1/I6
the 'Not now' sweep is RECURSIVE (components/auth, components/food
were outside the flat readdir) and triggers on the write-side
identifiers (applyCapabilityPlanRewrite, recordEffectiveChoice) with
walked-sanity and non-vacuity assertions, and the R8-1 suppression
comment is corrected in place (it still described the pre-round-8
gating). Conditions stated on rows, not patched: the effects record
corrects only FORWARD (manual re-add never revokes an omission -
B6/B8/B9), the division recompute reads TODAY's structure/library/
profile (A1/I9), I4's two benchmark figures are different fixtures,
both Node. Round 10 re-runs before S5.

ADVERSARIAL REVIEW ROUND 8 (2026-08-30, on c60ccc57): NOT CLEAN - 3
BROKEN from 4 roots, 11 QUALIFIED, 0 STOP - converging. ALL four roots
closed same day (D120) plus six qualified mechanisms, and the one
genuine fork the reviewer flagged is RULED: R8-1 the both-sides prompt
gates on sidedRuleTouches (the union rightly kills the carve when both
sides are restricted - which un-suppressed the "do the same reps on
each side" ask exactly where it is most forbidden; strictly more
conservative now, pinned both ways), R8-2 the fail-safe sentence is
first-class (one outcome-phrased constant on the standalone proposal,
APPENDED to the mixed proposal and the group body; the dedicated
dialogue keeps "Keep this applied?" framing; attribution banned by
ruling), R8-3 'Not now' only-on-decline is tree-wide (PlansScreen's
twin alert fixed; the guard sweeps every rewrite/proposal surface),
R8-4 the picker's sided reason is three-way true (never "cannot be
done a side at a time" of a movement that can; "does not work on
either side" names both facts), D120 ruling 2 the hold-union fork:
hold/decline suspend automation never facts - a held opposite-side
rule completing the union is CORRECT (docblock corrected, driven pin);
I4 sideCarveByAxis memoised per state (the union had put a 6x
allocation on the full-library pass; round-1 numbers below are
superseded), A1/I9 the division recompute carries generation's
structure + canonical-name inputs and renders NOTHING on an
unavailable lane read (the raw-library fallback lied), B3 re-closed
with a burst window (round 7's isFocused arming misfired both ways -
the round-8 review read the navigation source; the window's failure
mode is an extra load, never staleness), I8 serve's effects entries
are source-tagged and self-correcting (first-exerciseTo-forever and
unrevoked omissions closed; real-DB pin), J2/J5 alert rows bounded
horizontally (long pairs stack, rows wrap, buttons shrink). Round 9
re-runs before S5.

ADVERSARIAL REVIEW ROUND 7 (2026-08-29, on e2807c24): NOT CLEAN - 7
BROKEN from 6 roots (two round-6 regressions, one round-6 fix landing
one alert short, one round-6 blast radius, two pre-existing surfaced
by deeper attack), 8 QUALIFIED, 0 STOP. ALL six roots closed same day
(D119) plus B3's double first load: R7-3 the side carve is a UNION
decision per axis (a LEFT rule + a RIGHT rule no longer combine into
"fully available" - the campaign's most safety-adjacent finding; the
one-side-at-a-time note consumes the same answer as the block; six
union pins), R7-1 matching is per entry across days and per id within
a session (one incumbent never retained into two slots of one
session), R7-4 the fail-safe is TOLD (informational alert before the
vacuous write; fail-safed rules revisitable; the revisit flow offers
the group with an honest dialogue), R7-2 BOTH divisionDiff paths
rerouted block-scoped + the door guard widened to the divisionDiff
class, R7-5 'Not now' appears only on the button that declines
(source-guarded), R7-6 alert actions bounded by maxHeight never by
flexShrink (the D42 guarantee restored; guard contract rewritten
honestly). The round-7 reviewer also re-ran the whole suite under a
shifted wall clock (+90/+400 days, both green) - the TRN time-bomb
class is empty. FOUNDER-side found: two files both numbered
migrate_152 and README ledger rows missing for 152_p0/153/154 (with
the standing CLAUDE.md staleness) - surfaced in chat, untouched here.
Round 8 re-runs before S5.

ADVERSARIAL REVIEW ROUND 6 (2026-08-29, on 4584c860): NOT CLEAN - 8
BROKEN from 6 roots, 8 QUALIFIED, 0 STOP. ALL six roots closed same
day (D118, which also corrects two D117 claims) plus five qualified
conditions: R6-1 the substitute pool honours "Avoid for this block"
(one scoped intent loader feeds all four seam paths; serve had
substituted IN the avoided movement and the rewrite offered it
permanently; pins now run the REAL senior question, which no campaign
pin had ever done), R6-2 the caption memo's inputs match serve's + the
plan view re-reads on focus (staleness closed), R6-3 serveGate mode
(dialogues state only what serve is DOING; declined co-drivers produce
no line in either mode; both modes mirror the never-served-empty
fail-safe), R6-4 the NAMED in-session line states the conflict
(D117 ruling 8 corrected - "both generics" had missed the dominant
branch), R6-5 the headline is composed from every rendered count
(added had no parameter; rep-target statement now additive;
twice-programmed lifts retain both rows - entry-keyed matching,
id-keyed accounting; identity keys everywhere), R6-6 the per-line
review's empty answer branches on checked (shared COULD_NOT_READ
constant), B9 the count mirror answers null - never a falsy 0 - on an
unreadable routine, C1 the chooser cancel takes the F-1 no-op wording,
J2 AppAlert buttons at 48dp from the spacing scale, J4 colliding
chooser labels distinguished by start date, J5 the alert action region
scrolls instead of clipping. Round 7 re-runs before S5.

ADVERSARIAL REVIEW ROUND 5 (2026-08-29, on 88f45b5a): NOT CLEAN - 11
rows BROKEN from 9 roots, FOUR of them round-4 regressions (Q2 and F-1
each landed one consumer short - the D115 pattern verbatim), 6
QUALIFIED, 0 STOP. ALL nine roots closed same day (D117), plus four
qualified conditions and both documentation items: R5-8 the taken-set
(one substitute never assigned twice; seeded with the session's own
rows; serve, preview, count and the WRITTEN DOCUMENT all agree; the
reviewer's probe had Back Squat and Walking Lunge both rewritten to
Leg Press, permanently) with driven pins at all three entry points;
R5-4 the count mirror shares serve's never-served-empty fail-safe
(base count, never a falsy 0); R5-5 the §18 predictive weekly-
denominator reduction DELETED (D117 ruling 3, correcting D116 ruling
2: its premise was made false by D116's own never-served-empty ruling,
and its weaker predicate meant every firing excused a session served
in full - flattering, not conservative); R5-1/2/3 the receipt complete
on BOTH renderers, drops counted into exerciseChanges (a drop-only
rebuild now takes the rebuild path instead of silently reactivating
the old plan), headline speaks the fourth count, accounting deduped,
identity keys; R5-6+Q-3 the revisit row gathers every conversation and
opens exactly one (chooser with true no-op cancel; no dialogue ever
stacks on the per-line review); R5-9 {surfaced, checked} out of both
proposal helpers + computeCapabilityPlanRewrite, honest could-not-read
toast, detector key stamped only on a completed check; R5-7 the plan
caption speaks serve's own answer via one hoisted memo (exported
substituteSeniorQuestion - one answer, five consumers; three-way
applied caption); Q-1 the in-session generic states the conflict, never
an adaptation; Q-2 the clinician confirm speaks its frame (decline/
stop/keep); Q-4 all three fall-through reasons pinned + headline +
PlansScreen render pinned; Q-5 dissolved by R5-8 (N swaps can no longer
land on one movement); D116's "Q5's row" reference corrected (the
condition lives on B9); REVIEW-BRIEF 87->93. Round 6 re-runs before S5.

ADVERSARIAL REVIEW ROUND 4 (2026-08-29, on 05a7f49d): NOT CLEAN - 7
BROKEN from 4 roots, none a round-3 regression. ALL closed same day
(D116) + the OPEN item + every actionable QUALIFIED: F-1 the applied
revisit is a per-GROUP dialogue with a true no-op cancel (the round-3
flat union let one cancel-styled tap decline every applied episode);
F-2 effects follow the serve decision (fully-omitted sessions fail-safe
with ZERO records; never-served-empty RULED); F-3 the plan caption's
applied test uses serve's actionable gate (all eight hold combinations
agree); F-4 Home rows minHeight 48 + the campaign's first touch-target
pin; Q1 unknown never masks a preference reason (generation order) +
the POOL-never-NULL invariant pinned over the real seed; Q2 the silent
rebuild drop closed at its reporting root (NO_LONGER_IN outcome, "No
longer in your plan" receipt section, driven pin) with the
carry-design question recorded for post-campaign ruling; Q3 a partial
read never becomes a proposal; Q4 one sweep on the common focus. Round
5 re-runs before S5.

ADVERSARIAL REVIEW ROUND 3 (2026-08-29, on 59a7daa4): NOT CLEAN - 8
rows BROKEN from 5 roots, two of them round-2 regressions, and a
process verdict acted on: round-2's fixes were pinned by source-string
guards, so round-3's closures are mechanism-level with DRIVEN pins
through the real entry points (D115, which also corrects two D114
claims round 3 proved false). Closed same day: R3-1 (currentLibraryIds
from ALL exercises by equipment alone + capability_unknown never blocks
the resolution write; driven generatePlanDryRun pin retains a
NULL-column custom lift into the RESOLVED plan, control proves definite
blocks still replace with the capability reason), R3-2 (the `checked`
tri-state - a failed read never records the vacuous applied, driven
rejecting-DB pins; applied rules that later bite regain their review
through the revisit row and tap), R3-3 (the in-session held notice
gates on definite conflicts, matching the plan view), R3-4 (serve
returns base indexes; driven duplicate+omitted+_userAdded pin), R3-5
(check-in reads restrictions only; rulePhrase never names an allowance
- "a name is never inverted"), plus the fresh-capability-state finish
read. OPEN work item from the pin build: an untagged custom incumbent
(no family tag) contests no continuity slot and a rebuild drops it
silently with no receipt line - pre-existing, stated on A13, round 4
attacks it. Round 4 re-runs before S5.

ADVERSARIAL REVIEW ROUND 2 (2026-08-29, on 715ad90e): 7 BROKEN, 16
QUALIFIED, 0 STOP, 69 HOLD - converging. All actionable round-2
findings closed at root the same day (D114): the unknown-drives-nothing
law reached planAutoGen (custom lifts are never REPLACED on a NULL
column) and the completion-excusal caller; episode status derives from
restrictions so a Keep cannot disable its group's AWAITING; the
near-miss list obeys source-outranks-certainty; the R2-6 stale-slot
window is closed (id-stamped resolves; silence over wrong claims);
no-effect rules record the vacuous applied so Home's ask-row always
clears; duplicate slots keep their own prescriptions; ended keeps read
"(kept in)"; the hold caption speaks only for definite conflicts; the
Choice label wraps; meaning-bearing subs are spoken. L4's condition is
now STATED on its row (the carve is union-wide while the episode
lives - deliberate, D113 ruling 3). Round 3 re-runs before S5.

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
| A1 | Fresh generation honours every rule kind | LANDED | CC25 filter + preflight on all six entries (T1-21/22 closed W1); round 7 R7-2 closed: RoutineDetail's divisionDiff/coverage recompute runs over the generation-filtered, block-scoped library (T1-02's second named path; door guard widened to the class); round 8 closed: the recompute carries generation's demonstrated-structure + canonical-name inputs (generation's own exported paths) and renders NOTHING on an unavailable lane read; CONDITION (widened round 9, D121): the recompute reads TODAY's demonstrated structure, library and profile, so it reproduces the original build only while those are unchanged since generation - reviewed-replacement omissions (inside a continuity proposal) are ONE rebuild-time-only input, not the only one |
| A2 | Baseline rule meets an installed plan | LANDED | W1 L4 + root fix post-W4A: computeCapabilityPlanRewrite read `row.id` off the nested `{routineExercise, exercise}` shape, so apply skipped every line in production; fixed with the suite re-shaped to the REAL row shape + a would-have-caught pin; round 5 R5-8 closed: the rewrite threads a taken-set, so two conflicted rows of one muscle write two DIFFERENT movements (driven pin; the round-5 probe had both permanently rewritten to Leg Press); round 6 R6-1 closed: the rewrite judges substitutes under the block-scoped intent state - a block-avoided movement goes unsolvable, never into the document (driven pin through the real senior question) |
| A3 | Pickers/selection honour rules | LANDED | CC25 + allowance seam W1 L1 |
| A4 | All 12 swap surfaces honour | LANDED | T2 column D map; T2-10 closed W5; round 5 R5-8: substitute selection across surfaces shares the taken-set seam |
| A5 | Serve-time honours (substitution/omission) | LANDED (round-1 BROKEN F1, fixed) | serve judges LIBRARY-resolved rows (the routine rows carry no demand columns; before the fix an applied demand rule substituted the whole session); unknown drives nothing automatic; composed senior question at all four substitute sites; serveGuard re-shaped to production fixtures + F1 regression pins; round 5 R5-8 closed: serve assigns distinct substitutes - taken-set seeded with the session's own rows (driven pins); round 6 R6-1 closed: serve never substitutes IN a block-avoided movement (scoped loader, all four seam paths; driven pins + scope-control) |
| A6 | Coaching honours (limiters, holds, proposals) | LANDED | W2 L5/L6; constrainedTruth.w2 suite |
| A7 | Block review honours (senior question; stored KEEP never outranks capability) | LANDED (round-1 BROKEN F2, fixed) | blockAdvisor judges library-resolved rows; REPLACE keys on DEFINITE blocking conflicts only; W5 pins updated to the new mechanism |
| A8 | Plan reactivation honours | LANDED | T1-11 repeat-offer after runBlockActivation (9d5b4a1b) |
| A9 | Allowances honoured by every consumer | LANDED | blockingConflicts seam W1 L1; allowanceSeam suite; per-line Keep now mints through the same seam |
| A10 | Manual adds/overrides never reversed | LANDED (round-3 BROKEN R3-4, fixed) | serve returns base indexes - no id reconstruction; driven duplicate+omitted+_userAdded pin serves the user's own object at its own slot |
| A11 | Laterality honoured (side-carve serves) | LANDED | CC25 §16 + laterality suite; round 7 R7-3 closed: the side carve is a UNION per axis - left+right, or sided+unsided, on one axis BLOCK; left alone still carves; the note and the block share one answer (six pins); round 8 R8-1 closed: the both-sides prompt gates on sidedRuleTouches - suppressed whichever way the carve resolves; the note keeps the carve answer (pinned both ways) |
| A12 | Clinician standing uniform (never carved; distinct everywhere) | LANDED (round-1 BROKEN F5, fixed) | source outranks certainty (D113): unknown clinician conflicts survive the carve, rank CLINICIAN, route to the rule editor with honest both-facts copy; allowanceSeam F5 pins |
| A13 | Custom exercises fail closed, carveable, honest receipt | LANDED (round-3 BROKEN R3-1, fixed) with ONE STATED CONDITION | driven rebuild pin: a NULL-column custom lift survives a rebuild into the resolved plan, never equipment-lost, never capability-excluded. Condition (open work item, D115): an incumbent custom lift with NO family tag contests no continuity slot and a rebuild drops it silently with no receipt line - pre-existing family-keyed matching, round 4 attacks it; round 5 R5-1/2/3 closed: the receipt is complete on BOTH renderers, drops count into exerciseChanges (a drop-only rebuild takes the rebuild path), the headline speaks the fourth count, accounting deduped, identity keys; round 6 R6-5: twice-programmed lifts retain both rows (entry-keyed matching); CONDITION: the gone-accounting is id-keyed on purpose - an exercise still anywhere in the new plan is never listed 'no longer in your plan', so a two-day lift dropping to one day is a frequency change the receipt does not list; round 7 R7-1 closed: per-workout guard - one incumbent is never retained into two slots of one session; cross-day double retention stays (both pinned) |
| A14 | "Hold my plan" honoured end-to-end | LANDED (round-1 BROKEN F3, fixed) | adaptation_mode travels unconditionally in sync pushes (the resume of the last held episode no longer resurrects cross-device); pinned by a DRIVEN round-trip test, not a source string; round 8 D120 ruling 2: hold suspends a rule's own automation, never the fact it records - a held sided rule completing the union so a LIVE rule substitutes is CORRECT and driven-pinned (effective.js docblock corrected) |
| A15 | Every failure posture fails safe (no silent fail-open) | LANDED (round-3 BROKEN R3-2, fixed) | the `checked` tri-state: a failed read is "could not tell", never "nothing affected"; the vacuous applied fires only on a completed check (driven rejecting-DB pins assert NO write); round 5 R5-9 closed: the revisit toast branches on checked - a failed read says 'could not read', never 'nothing needs a decision'; detector key stamped only on a completed check; round 6 R6-6 closed: the per-line review's empty answer branches on checked too (shared COULD_NOT_READ constant - the two sites cannot drift) |

## B. Visibility — every effect the user can see

| # | Variable | State | Evidence |
|---|---|---|---|
| B1 | Generation reveals shaping (counts on all six entries) | LANDED | W3B (bca83133); T1-12 pins |
| B2 | Total-block is a graded state, not an engine error | LANDED | W3B T1-13; graded paths pinned |
| B3 | Plan view marks conflicted/substituted rows | LANDED | W3A T2-32 markers; round 5 R5-7 closed: the plan caption speaks serve's own answer (three-way applied caption off one hoisted memo under the exported senior question); round 6 R6-2 closed: the memo's intent state and serve's are built from the same block-scoped inputs, and the screen re-reads on focus (0.7 ms recompute, round-6 measured); round 7: the focus listener skips its registration focus (armed from navigation.isFocused()), so the first paint pays the reload once; CONDITION: the reload still carries the ~5.6 ms division recompute (Node) on every genuine return; round 8 re-closed: the isFocused arming was disproven from the navigation source (double-load survived on push; a genuine focus could be swallowed) - replaced with an 800ms burst window whose failure mode is one extra load, never staleness |
| B4 | Pre-session presence (Home line, ordinary state) | LANDED | W3B standalone line + lead hold-tighten; HomeScreen.capabilityVisibility.guard; round 9 closed (B4/E1, D121 ruling 3): a failed check with no known state (the resolver's unavailable && !stale signature, and the effect's own catch) renders one quiet NON-tappable could-not-check line instead of silently showing nothing; stale-but-known keeps serving per CAP-17 and never fires the line (pinned) |
| B5 | In-session notices (episode + baseline + reduced signal) | LANDED (round-1 BROKEN F1, fixed) | notices judge the resolved row; definite conflicts speak the lane's copy, unknowns the honest not-known line; round 5 Q-1 closed: the generic in-session line states the conflict and never claims an adaptation (a noticed row is by construction served as planned); round 6 R6-4 closed: the NAMED episode line states the conflict and offers the swap - the round-5 fix had reached only the generics, and the named branch is the dominant path |
| B6 | Post-session line + what-changed detail | LANDED | W3A T2-07/T2-22; CONDITION (round 9, D121 ruling 2): the effects record corrects only FORWARD - a manual re-add never revokes a recorded omission, so this surface is exactly as true as the record |
| B7 | Coaching output shows the constrained story | LANDED | W2 L6; constrainedTruth.w2 |
| B8 | Effects history renderable to its subject | LANDED | W3A T2-22 summary incl. past sessions; CONDITION (round 9): forward-corrected record - a manual re-add never revokes an omission |
| B9 | Effective denominators everywhere (widget, partner, Today, adherence) | LANDED | stats/adherence W2; widget/partner/Today W3B T2-16/T1-17; round 5 R5-4 closed (the count mirror shares serve's never-served-empty fail-safe: base count, never a falsy 0) + R5-5 closed by D117 ruling 3, CORRECTING D116 ruling 2 (which pointed at a non-existent 'Q5' row): the §18 predictive weekly-denominator reduction is DELETED - its capability-only predicate was strictly weaker than serve's composed question, so every firing excused a session served in full; weekly stats read only actual effects records (source pin); round 6 closed: countEffectiveSessionRows answers null on an unreadable routine (0 now means only 'this routine is empty'), honouring HomeScreen's ?? fallback exactly as its comment always claimed; CONDITION (round 9, D121 ruling 2): denominators read the effects record, which corrects only forward - a manual re-add never revokes an omission |
| B10 | Lifecycle visible (AWAITING on Today; reintroduction durable line) | LANDED | AWAITING W3B T1-15; T2-25 durable line landed post-W4 (rampMusclesFromPlannedRows reads the source stamp; coach story change with its own why + quiet Home plan-view row; three suites) |
| B11 | Swap sheets state their narrowing | LANDED | W3A T2-08 |
| B12 | Why-this explains capability shaping | LANDED | W3B T1-16 buildWhyThis line |
| B13 | Side-carve named in session | LANDED (round-1 BROKEN F1, fixed) | isSideCarvedAvailable judged on the resolved row (it could never answer true on the partial one); guard suite now DRIVES the mechanism with both shapes |

## C. Understanding — the user can predict what will happen

| # | Variable | State | Evidence |
|---|---|---|---|
| C1 | One vocabulary per lane, zero blur | LANDED | W4B sweep (9d5b4a1b): T2-33/T1-19; T1-08 capability lane's own words end-to-end; round 5 Q-2 closed: the clinician confirm speaks its frame (decline/stop/keep) - no mid-flow vocabulary switch, no cancel readable as 'keep the rule out'; round 6 closed: the chooser cancel is 'Leave it as it is' (F-1's no-op wording) - 'Not now' is the same screen's decline, one state apart; round 7 R7-5 closed: 'Not now' appears ONLY on the decline (source-guarded); the rewrite alert's no-op takes the F-1 wording; round 8 R8-3 closed tree-wide: PlansScreen's twin alert takes the F-1 wording and the guard sweeps every rewrite/proposal surface; the fail-safe dialogue frame presupposes nothing ('Keep this applied?' / 'Stop applying it'); round 9 C1/I6: the sweep is RECURSIVE (components/auth, components/food sat outside the flat readdir) and triggers on the write-side identifiers too |
| C2 | Every automatic action carries its why | LANDED (round-1 BROKEN F4, fixed) | UNKNOWN is never spoken as fact: session strip and plan captions gained the picker's own \"doesn't know yet\" branch; mixed rows speak only from what is established; round 5 R5-1/2 closed: no silent drop on PlansScreen, and the headline never denies the section beneath it; round 6 R6-5 closed: the headline is COMPOSED from every rendered count (changes, additions, drops, rep targets) - it structurally cannot deny a section; round 7 R7-4 closed: the fail-safe case is told - informational alert before the vacuous 'applied', in the lane's own words; round 8 R8-2/R8-4 closed: the fail-safe sentence rides the MIXED proposal and the group body (outcome-phrased, attribution banned by ruling), and the sided reason states only true mechanics |
| C3 | Previews never over-promise | LANDED | W4A T2-05: computePlanEffectiveLines asks the substitute question directly (undecided rules no longer render every line "substituted"); summary is a reduction of the lines; planEffectiveSummary suite; round 5 R5-7/R5-8 closed: no over-promised swap, and the plural rewrite copy is true now substitutes are distinct; round 6: caption/serve agreement restored at the input level (R6-1/R6-2); round 7 CONDITION stated: an out-of-scope UNDECIDED co-driver is read optimistically in the would-if mode (deliberate, D118 ruling 2) - the one place preview can state a swap a later decline prevents |
| C4 | Effect preview at rule creation (real outcomes) | LANDED | same fix; substituted/omitted parts pattern live; round 5 Q-5 dissolved by R5-8: N swaps can no longer land on one movement, and the per-line review names each from->to |
| C5 | Lanes cross-reference both ways | LANDED | T1-20 both sides: W4B AvoidedMovements line + lead's HowYouTrain preference row, route registered in all six stacks, reachability sweep watches AvoidedMovements |
| C6 | Name-by-effect, never diagnosis | LANDED | CC25 §11 + CAP-3; phrase module law |
| C7 | Explanations name the side | LANDED | W3A + picker §16 |

## D. Agency and control

| # | Variable | State | Evidence |
|---|---|---|---|
| D1 | Per-line Apply/Decline | LANDED (round-1 BROKEN F6, fixed) | keeps are EPISODE-SCOPED (allow rows minted into each driving group - end with the episode, restart with a flare, permanent only on promotion); clinician all-or-nothing; every choice takes effect exactly as chosen, for exactly as long as it was asked about |
| D2 | Every choice revisitable (no one-shot) | LANDED (round-1 BROKEN F6, fixed) | allowance rows now render DISTINCTLY (episode card \"(kept in)\", baseline \"Kept in at your word\", reversed remove-confirm stating which way the cut goes); revisit row + honest empty tap stand; round 5 R5-6 closed: every applied group is reachable - the revisit row gathers all conversations and opens exactly one (chooser with a true no-op cancel); round 6 R6-3 closed: the group dialogue's lines come from serveGate mode - 'Your sessions currently show' is never said of a row a declined or undecided co-driver holds in place, and such a group is not offered as a conversation; round 7 R7-4: a fail-safed applied rule is revisitable again - hasCapabilityToRevisit counts it and the revisit flow offers its group with an honest dialogue |
| D3 | In-the-moment capture creates the episode | LANDED | W4B T2-11 preselect capture (9d5b4a1b) |
| D4 | Suspension valve (hold/resume, per episode) | LANDED (round-1 BROKEN F3, fixed) | A14's sync fix; resume now survives cross-device; round 8: same D120 ruling 2 condition stated - a held episode contributes facts to the union exactly as pickers/generation already take from it |
| D5 | Every check-in answer lands | LANDED | W2 L6 ('fine' acknowledged) |
| D6 | End/extend/promote/flare flows complete | LANDED | end/extend/promote W1 L4; flare re-propose W4A T1-05 (restart captures minted ids, proposes as the add flow does) |
| D7 | Sync-arrived rules propose | LANDED | W4A T1-06 focus detector (pending-guard + same-set key; explicit actions never gated) |
| D8 | Never words in the user's mouth | LANDED | W2 L6 (T2-18); capabilityCoach pins |

## E. Findability and onboarding

| # | Variable | State | Evidence |
|---|---|---|---|
| E1 | Entry at every moment of need | LANDED (round-1 QUALIFIED, gap fixed) | arrived-but-undecided rules now surface on Home (quiet ask-row sharing the AWAITING slot), landing on the screen whose focus detector proposes immediately; round 9 closed with B4: the read-failure vanish (every ask and statement row gone with no word said) now shows the honest could-not-check line |
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
| G5 | Permission-first tone (app proposes, user decides) | LANDED | propose/apply/decline pattern complete across W1–W4; round 7 R7-4: permission-first restored - the fail-safe records applied only AFTER its informational alert; round 8: the mixed proposal tells the fail-safe too - no path applies with a session-level surprise left unsaid |

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
| I4 | Hot-path performance (resolver on list screens) | HOLDS (round 1, measured) | picker full-library pass 0.131 ms, 8-row markers 0.034 ms, worst-case 32-slot rewrite 0.519 ms at 300 exercises x 12 rules (Node; device confirmation rides X2); round 8 CORRECTION + closure: the round-1 timing figures are SUPERSEDED - R7-3's union put a per-exercise allocation on the full-library pass (measured 6x by the round-8 reviewer); sideCarveByAxis is now memoised per state object (WeakMap) and exported, removing the per-exercise cost; all figures are Node, device rides X2; round 9 stated (D121 ruling 6): the round-8 "6x" and round-9 "2.7x" figures are DIFFERENT fixtures (library size and rule mix), both Node - neither is a device number |
| I5 | Migration hygiene (additive, idempotent, records true) | FOUNDER (round-1 STOP S1) | files and records additive and true (149/151-era comments corrected 9d5b4a1b; the sync file's own pre-152 comment corrected with F3); the one open item is founder-side: the migrate_152 record accepted a structured named confirmation as the phrase-gate equivalent, which contradicts CLAUDE.md's exact-phrase law - surfaced for the founder to ratify or tighten |
| I6 | Invariant tests for every law + regression guards | LANDED (round-1 BROKEN F8, fixed) | the pins that let F1/F2/F3 ship now drive the real mechanisms with PRODUCTION-shaped fixtures (serveGuard asServed + drift guard; sideCarve driven both shapes; sync round-trip driven); round 5 Q-4 closed: all three fall-through preference reasons pinned (EXCLUDED/AVOIDED_BLOCK/PATTERN_AVOID); receipt headline and PlansScreen render pinned; round 6: the substitute-selection pins now run the REAL senior question (only the loader is mocked, honouring its scope argument); CONDITION: the screen-render halves of R5/R6 closures remain source-pinned per the screens' own guard convention, stated on each suite's header; round 7: the three named gaps closed - the continuity fixture is now cross-workout AND same-workout, T1-02's second path is pinned, the D42 guard contract states the true shape; round 8: the R8-3 guard is tree-wide and the R7-2 door guard's screens-only reach is stated; B3's premise defect is closed by construction rather than pinned on an unverifiable string; round 9: the R8-3 sweep RECURSES into subdirectories (tests excluded - pins quote the literals) and triggers on applyCapabilityPlanRewrite/recordEffectiveChoice too, with a walked-sanity floor (150+ files) and a non-vacuity assertion so a rename can never empty it silently; CONDITION restated: mechanism halves are driven (serve/substitute/continuity/sync/adherence two-pass on the real mechanisms), screen-render halves stay source-pinned per the screens' own guard convention |
| I7 | FD-1: accommodation free-tier, guardrails tier-blind | LANDED (invariant) | proGate mandate; no tier reads in capability lane |
| I8 | Kill/relaunch/restore correctness | LANDED (round-1 QUALIFIED, condition resolved) | markers persist, effects append dedupes, mid-alert deaths recover via the detector/revisit row; the one condition (\"the relaunch pass re-runs F1\") dissolved with F1's fix; round 8's replaceSource is REVERTED in round 9 (R9-1/D121): serve runs over the persisted reduced list, so a second pass cannot re-derive pass-1's omissions and the replace DELETED them - the round-8 claims "a relaunch that resolves differently corrects the record" and "a declined-then-served row's omission is revoked" were FALSE (both cited scenarios unreachable: the reduction is persisted; a _capabilityTemp session never re-serves); the append is a pure deduped merge again, source:'serve' stays forensics-only, driven two-pass pin on the real DB (both passes' omissions survive); the removal hook's and completion writer's entries were never touched either way |
| I9* | Preview/serve/rewrite agree by construction | LANDED | one seam: computePlanEffectiveLines feeds the summary; substituteSeniorQuestion feeds all four substitute sites; round 5 R5-4/R5-7/R5-8 closed: serve, count mirror, preview, plan caption and rewrite share the taken-set and the never-served-empty fail-safe - one answer, five consumers; round 6 R6-1/R6-2 closed: the five consumers are now fed identical block-scoped inputs (D117 ruling 7's claim corrected in D118, then made true); round 7 CONDITION stated: the fail-safe mirror judges PLANNED routine rows; a live session's _userAdded rows are serve's own business and can keep a session off the fail-safe serve-side; round 8: the division recompute joins the shared-inputs family (structure + canonical names threaded; unavailable renders nothing); round 9 CONDITION shared with A1: that recompute reads TODAY's inputs, reproducing the build only while they are unchanged since generation |

*I9 added at the lead review: the W4A finding class (two computations of
"what will happen" drifting apart) earns its own standing row.

## J. Accessibility of the feature itself

| # | Variable | State | Evidence |
|---|---|---|---|
| J1 | Screen-reader labels on every new control | LANDED | accessibilityRole/Label in landed diffs; round-5 reviewer verified round-4's controls carry meaningful labels (alert buttons via AppAlert.js:143-144, per-line rows, Home's three rows); round 5 W3 sweep (D117): W3 added NO interactive controls - its two notes are plain Text with no onPress, pinned as such by their own guard suites, and SettingsPrimitives' accessibilityLabel override is itself the accessibility fix |
| J2 | Touch targets and contrast via tokens | LANDED (round-4 BROKEN F-4, fixed) | Home's three capability rows carry minHeight spacing.xxxl (48); first touch-target guard pin; round 6 closed: AppAlert buttons at minHeight spacing.xxxl (48, the styling law's minimum) - every capability decision routed through alerts rides on it; round 8: long two-button pairs stack and row buttons shrink - no unshrinkable row can push its sibling off the clipped card edge (device confirmation rides X2) |
| J3 | Meaning never carried by motion/colour alone | LANDED (round-1 BROKEN F7, fixed) | Choice selection carries a tick + border weight beside colour; every other surface HELD the round-1 attack (text-first throughout) |
| J4 | Cognitive load: one question at a time, low-choice steps | LANDED pattern (CC25 §11/§12); per-line review is one binary per row, default Apply | R2 digest; round 5 Q-3 closed: the rewrite is a chooser entry, never stacked on the per-line review; one conversation per tap; round 6 closed: colliding chooser labels are distinguished by the group's start date; round 7 CONDITION stated: date suffixes need different start days and a non-null startsAt; same-day or null-start groups can still collide (no year shown) |
| J5 | Dynamic type tolerance on new lines | HOLDS (round 1) | no fixed heights, no capability numberOfLines, rows wrap; the arrow-glyph residual closed with a spoken label |; round 6 closed: the alert action region is its own bounded ScrollView - a long stacked chooser scrolls at large type instead of clipping its last buttons; round 7 R7-6 closed: actions bounded by maxHeight, flexShrink 0 (Yoga's View default restored) - ordinary alerts keep D42's full-height actions; only an oversized stacked list scrolls; round 8 closed on the horizontal axis too: long pairs stack (26-char threshold), rows wrap, buttons shrink with text wrapping inside (minHeight, never a fixed height) |
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
| L4 | Overlapping rules (multi-episode, baseline+episode same exercise) | LANDED (round-2 condition STATED) | six multi-driver attacks survived; F6's episode scoping closed the carve's PERMANENCE; while the episode lives the carve is deliberately union-wide (D113 ruling 3: the keep speaks for the exercise everywhere non-clinician, and the baseline conversation resumes when it ends); round 7 R7-3 closed (same root as A11): the union of two sided rules IS the union; multi-rule side coverage pinned incl. the clinician mix; round 8 D120 ruling 2: the union deliberately reads every ACTIVE rule, held and declined included - ruled, pinned, stated |
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
