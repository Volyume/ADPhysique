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

CC33 CLOSED 2026-08-30 ON A FINITE CRITERION (D132, founder order).
The review loop was replaced, not merely stopped. Its exit condition
("a fresh reviewer breaks nothing") is unbounded: a reviewer finds one
INSTANCE of a defect class per round, and the next round finds the next
instance of the same class - which is why the root count never reached
zero. The four recurring classes are now closed by CENSUS
(src/lib/__tests__/capabilityCensus.guard.test.js): every site in src/
that participates in each class is enumerated and must satisfy the
class invariant or carry a stated exemption, and a NEW site fails by
default. First run found three more class-1 instances in one pass - two
fixed (exercise-detail's UNFILTERED swap suggestions under a
stale-known read; the volume landmarks' dropped blocked-muscle facts),
one STATED (B7's coach fact needs an engine contract change).
NOT CLAIMED: the "undeniable" bar - a clean adversarial pass - was
never met, and round 19's closures are unreviewed. CLAIMED: every
finding raised is closed at mechanism level, the four classes are
closed by enumeration rather than sample, and the tree is green
(lint 0; jest 0, 1112 suites, 15,240 tests). X1 = NO, X2 = PENDING.

ADVERSARIAL REVIEW ROUND 19 (2026-08-30, on 9c54c860): NOT CLEAN -
9 BROKEN from 4 roots, 9 QUALIFIED, 0 STOP. All four closed same day
(D131): R19-1 the coach volume withhold could only fire on a throw,
and the resolver cannot throw - a cold read failure applied the
increase body-wide on a read that knew nothing (D112 R3's posture had
never once executed on the failure it was written for; it gates on
capabilityKnown now); R19-3 the in-session notice and plan caption
still let a DECLINED or UNDECIDED rule - which drives nothing -
outrank a definite baseline fact, wording a permanent conflict as
temporary while the rebuild replaced the same row as permanent (the
helper now mirrors slotVerdict; the truth table gains the choice axis
it never varied); R19-2 both rebuild builders refused the resolver's
stale-known state while the write carve honoured it, so a
baseline-blocked incumbent was "retained" in the receipt and voided
in the saved plan - the T1-07 contradiction again (both take
capabilityKnown now, as does the swap cause derivation, F5);
R19-4 the removal excusal writer had NO performed gate, so removing
an exercise the user had logged sets on wrote an unrevocable
"left out" that the receipt, the weekly counters and the block
ledger all repeated (the writer refuses a row carrying sets;
reconciliation reads workout_sets).

THE REVIEW LOOP STOPPED AT ROUND 19 BY FOUNDER DECISION (2026-08-30,
D131 ruling 6). Round 20 was not dispatched. The scorecard's
"undeniable" bar - a clean adversarial pass over all 93 rows - is
therefore NOT MET and is not claimed anywhere. Trajectory of roots
found per round: 12,7,5,4,9,6,6,4,1,3,4,5,4,3,2,3,1,2,4 - it was not
converging to zero, and rounds 18 and 19 each found defects the
previous round's fix created or widened. Every finding raised was
closed at mechanism level with pins over a green tree; round 19's own
closures have never been adversarially reviewed. X1 = NO, X2 =
pending.

ADVERSARIAL REVIEW ROUND 18 (2026-08-30, on 1eb99e66): NOT CLEAN -
6 BROKEN from 2 roots, 5 QUALIFIED, 0 STOP - both roots the round-17
closures landing one layer short. ALL closed same day (D130, correcting
D129 rulings 1, 4 and 6): R18-1 readiness means KNOWLEDGE, not
presence (the round-17 terms held the ask for a pending input and
passed a settled-but-unreadable one - a cold-start read failure's
unknown-empty state walked through both guards, the gate answered its
permissive false, and the ask fired then durably self-tagged; closed
by extraction: capabilityKnown is the one action-readiness answer,
driven at the real loader across all three resolver shapes, and the
ask also holds on an unfetchable judgement row); A15's second action
site joins the fresh-read posture (the removal excusal writer reads
capability state at write time like the completion writer - the
pending-gated screen state silently missed legitimate excusals);
R18-2 a rule that drives nothing cannot veto a live baseline rewrite
(both rebuild evidence builders counted held and declined rules as
"affected" and keyed REPLACE on "any definite conflict minus
affected", so a held/declined episode rule vetoed a live baseline
rule's document rewrite and the receipt called a permanent conflict
temporary; three true facts now - live overlay via the shared
removalExcusalConflicts gate, the definite baseline fact via
baselineConflicts, the open-episode remainder - ranked in slotVerdict:
live KEEP, baseline REPLACE, open-episode KEEP; the fork on
held-only slots LEAD-RULED to keep deferring document judgement,
because the write carve voids unmarked conflicted incumbents - plain
evidence judgement would resurrect the T1-07 contradiction); J2's
fourth button floored (the sheet's md primary was ~46dp); I6's two
structural blindnesses closed (fail direction driven, application
counts pinned); C1's sweep reaches the sheet and AvoidedMovements;
the unreachable completion .catch deleted with its false comment.
Round 19 re-runs before S5.

ADVERSARIAL REVIEW ROUND 17 (2026-08-30, on 8ee4949d): NOT CLEAN -
1 BROKEN, 9 QUALIFIED, 0 STOP - matching round 9's best convergence,
and the one break was a hook-ordering hole no source pin could see.
ALL closed same day (D129): R17-1 the both-sides ask WAITS for its
inputs (on an exercise change the effect ran in the commit that
cleared the async resolve - the suppression gate answered false, the
ask fired for exactly the movement class it is most forbidden on,
then self-tagged so the corrected gate could never re-open it; RULED
as a posture split - silence for rendered notices, an explicit WAIT
for actions - with two readiness terms preceding the gate and the
self-tag), Q1 RoutineDetail's three intent writers join the sequence
guard (mount/focus/swap wrote unordered - the shape rounds 14-16
closed on the session screen), Q2 every effects tombstone schedules
its own push (two delete paths waited for an unrelated write), Q3 the
install-conflict sheet's three ~34dp buttons carry the 48 token and
join the guard's enumeration, Q4 the unknown named line unsides (all
THREE branches now consume one union answer), L4's deliberate
KEEP-outranks-REPLACE rebuild ranking stated, the stale round-3
completion-read rationale rewritten. Round 18 re-runs before S5.

ADVERSARIAL REVIEW ROUND 16 (2026-08-30, on 7ce82989): NOT CLEAN -
7 BROKEN from 3 roots, 10 QUALIFIED, 0 STOP - each root a consumer an
earlier extraction or ruling did not reach. ALL closed same day
(D128, correcting D127 rulings 3 and 4): R16-1 the plan caption
consumes constraintNoticeKind (its inline chain had kept the
pre-round-15 order - the held line outranked a definite baseline
conflict on the very surface built to resolve it, while the session
strip said the opposite; the source-ORDER pin that passed over this
is replaced by consumption pins), R16-2 a user-chosen row never
reserves a substitute (the view judged _userAdded rows, reserved the
muscle's best substitute for them, and serve threw it away - a
planned row behind one was OMITTED and durably excused while an
eligible substitute sat idle; the fact now lives IN the view,
UNCHANGED before any reservation, the serve loop's duplicated early
return deleted, driven pin proving the planned row gets the
substitute), R16-3 the sided-union phrasing is ONE shared answer
(sidedUnionShape - the in-session named lines phrased "involves
overhead work with your left shoulder" about a block that side alone
would not cause; both named lines now phrase a union-blocked sided
rule UNSIDED, the picker consumes the same helper, driven table),
R16-4 round 15's false reload rationale DELETED (the intent state is
user-scoped, so keep-last-on-failure is right on every trigger; the
swap sheet's write participates in the sequence guard both
directions), clearWorkoutHistory schedules its tombstones' push, the
sweep gains the template form with its static limits STATED, the
touch guard's allowlist is counted, and the two stale
"written not applied" migration comments corrected. Round 17 re-runs
before S5.

ADVERSARIAL REVIEW ROUND 15 (2026-08-30, on 1ff1a059): NOT CLEAN -
3 BROKEN from 2 roots, 9 QUALIFIED, 0 STOP - the strongest
convergence since round 9; both roots were THIRD instances of chains
already corrected twice. ALL closed same day (D127, correcting D126
rulings 1, 2 and 5): R15-1 the notice's branch selection is a pure
DRIVEN helper now (constraintNoticeKind) - the held line had fired
over a substituted row whenever a definite baseline conflict
co-existed, denying both the substitution and the just-captured rule;
the full truth table is driven (twelve states + the breaking state at
the real resolver), the episode line names DRIVING rules only, and
the screen only words each kind so a fourth ordering defect cannot
hide inline; R15-2 the picker's show-anyway/set-aside toggles (~39dp,
the only routes to what the user's rules removed) rise to 48 and the
lane finally has ONE enumerated touch-target guard with a strays
assertion (the round-13/14 closures had no pin - how a third instance
shipped); the reload's failure branch keeps the last state instead of
erasing a correct notice (mount/exercise-change failures still clear
- there the old state describes a different slot); the swap sheet's
write joins the sequence guard; the sweep gains the template/title
forms with element-bounded JSX windows (runtime-computed labels
stated as unsweepable); the R13-3 clear-history asymmetry stated on
H2/I2/B9 (re-pulled history returns without its constraint
provenance - conservative direction); F7's stale "untouched" cell
corrected (the consent-card dismiss copy changed in round 14;
behaviour verified fail-closed). Round 16 re-runs before S5.

ADVERSARIAL REVIEW ROUND 14 (2026-08-30, on c579e272): NOT CLEAN -
4 BROKEN from 3 roots, 7 QUALIFIED, 0 STOP - converging again, and
the briefed hostility toward the round-13 class closures found both
nets imperfect. ALL closed same day (D126, correcting D125 rulings 1
and 5): R14-1 the substitution marker yields only to conflicts with
LIVE automation - round 13 enumerated unknowns but a HELD definite
conflict drives nothing either, and it killed the marker while the
held line claimed "Volyume changes nothing" over a row Volyume itself
substituted in; R14-2 the in-session conflict lists reload on FOCUS
(the round-13 ruling's own scenario - capture a rule mid-session via
"Work around this" and return - still showed nothing on the row it
was captured from; R6-2's staleness class applied at last to the
surface the user trains on, with B3's burst window and a sequence
guard); R14-3 the lane's decline word is off the Article 9 consent
dismiss ('Leave it for now') and the sweep's literal set now covers
the JSX render forms that hid it for four rounds of trigger-widening;
the chokepoint's two proven holes closed (a null entry mints, the
picker append routes through the net, the per-site mint copy deleted)
with every "cannot ship keyless" record re-scoped to the honest claim
(every path that CREATES entries passes the chokepoint); the picker's
two undersized lane controls rise to 48 (the "Allow again" allowance
control was a caption plus slop). Round 15 re-runs before S5.

ADVERSARIAL REVIEW ROUND 13 (2026-08-30, on 3adfb9d8): NOT CLEAN -
10 BROKEN from 4 roots, 4 QUALIFIED, 0 STOP - two roots were earlier
defect CLASSES at yet another instance, so the closures close the
classes (D125, correcting D124 rulings 2 and 3): R13-1 Home's own
repeat card was the FOURTH keyless slot construction - per-site
minting is unwinnable, so the store's withSetsArrays CHOKEPOINT now
mints for any keyless entry on every fresh, restored or mutated list
(a fifth construction cannot ship keyless; old snapshots heal on
restore; Home's site also mints with the honest working-set count);
R13-2 ONE shared excusal gate for both writers - the completion
projection dropped _userAdded (a user's add-anyway row was excused if
left unlogged but not if deleted) and the writers disagreed on a held
co-driver; removalExcusalConflicts now drops held BEFORE the applied
test (the D120 facts-vs-automation direction; the round-12 reject
shape revised, not defended) and computeCompletionEffects consumes it
and refuses user-chosen rows (driven at both writers, constraintIds
equal); R13-3 "Clear workout history" now tombstones the capability
effects records with the sessions (the third delete path; erasure
strengthened, ruled lead-side); R13-4 TrainingConsiderations' four
off-scale 44dp literals tokenised to spacing.xxxl (the back control
and search field were genuinely 44 effective on the surface built for
tremor and reduced dexterity); B5 a definite conflict on the
SUBSTITUTE now outranks the marker line (a rule captured mid-session
against the substitute was never spoken on the row it bears on); J5
the receipt's pill labels carry the R2-12 wrapping idiom. Round 14
re-runs before S5.

ADVERSARIAL REVIEW ROUND 12 (2026-08-30, on 68d35635): NOT CLEAN - 9
BROKEN from 5 roots, 4 QUALIFIED, 0 STOP - every root a reachable
user chain through the round-11 closures. ALL closed same day (D124):
R12-1 the slot's RECORD is the conversion identity - a manual swap
clears the marker the round-11 conversion keyed on, so swap-then-
remove left the amended entry standing (the receipt told the user
they chose a movement for a deleted slot); the conversion now falls
back to the slot's stable id with EXACT rowId-only matching; R12-2
the removal writer gains the certainty term it never had - an
UNKNOWN-only conflict recorded a durable excusal while the row's own
notice said "doesn't know yet"; the gate now consumes the shared
removalExcusalConflicts answer (definite-only, applied-and-not-held,
the completion writer's own gates), a substituted slot's story is the
conversion, and a user-chosen row's removal records no excusal;
R12-3 the THIRD keyless source mints - picker-added rows (and whole
"Start without a plan" sessions) had no slot id, so the round-10
collapse survived on exactly L1's sessions; R12-4 the effects record
dies with a deleted COMPLETED workout too, and the replace PRESERVES
deleted_at (one racing write used to resurrect a tombstone into sync
and the export); R12-5 the receipt's link into How you train rises
from 40dp to spacing.xxxl (two sibling links rise with it - a
visible change for the founder walk); C1/I6 the sweep's allow-list
gains the resolver and directory identifiers (ExercisePickerModal
and TrainingConsiderations now inside; WeeklyCheckIn excluded by
RULING - its 'Not now' is the notifications lane's truthful
deferral). D124 corrects D123 rulings 1 and 2 and the round-11 pin
comment's false "cannot fire here". Round 13 re-runs before S5.

ADVERSARIAL REVIEW ROUND 11 (2026-08-30, on ea0b712f): NOT CLEAN - 8
BROKEN from 4 roots, 2 QUALIFIED, 0 STOP - the round-10 seam work
landed one lane, one identity source, one sweep trigger and one marker
short. ALL closed same day (D123, correcting D122 rulings 2 and 3):
R11-1 the SUBSTITUTED lane corrects forward too - a substitution whose
original was performed revokes at reconciliation, removing a serve
substitute CONVERTS the slot's entry to an omission, and the receipt
finally reads toChosenByUser ("You chose X in for Y"; any user-chosen
slot switches the headline to the neutral count sentence) so the app's
wording never covers the user's choice; R11-2 the two ad-hoc entry
points mint a stable slot id at construction (every rowId was null
there, so the round-10 collapse survived on build-a-workout and
repeat-as-is sessions), the legacy tolerance is COUNTED (one keyless
entry absorbs exactly one keyed re-derivation, never a whole slot
set), and an ambiguous amend touches at most one entry; R11-3
ProOnboarding's total-block dismiss stops wearing the decline word
('Got it') and the sweep triggers on the preflight identifiers
(WeeklyCheckIn checked and NOT dragged in - none of the triggers
match it); R11-4 EVERY manual swap marks the row the user's own
(round 10's conditional left ordinary swaps for the reachable second
pass to substitute over, against D112 R4); B9 both weekly constraint
counters now require is_completed = 1 (abandoned sessions counted as
reshaped/excused weeks) and the all-revoke-vs-ledger fork is RULED
(count-revoke rejected as fabricated CONSTRAINED evidence; the
conservative denominator under-read stated on the row); discarding an
incomplete workout tombstones its effects record. Round 12 re-runs
before S5.

ADVERSARIAL REVIEW ROUND 10 (2026-08-30, on d7816ec8): NOT CLEAN - 5
BROKEN from 3 roots (B5, B6, B8, B9, I8), 8 QUALIFIED, 0 STOP - all
three roots in the effects-record seam. ALL closed same day (D122):
R10-1 the record's identity is the PLANNED SLOT - writers stamp rowId
(the planned row's stable id) and the dedupe keys (effect,
exerciseFrom, rowId), so one exercise filling two slots writes two
true entries instead of silently losing the second (legacy tolerance
both directions; `slot` stated as informational - the three writers'
index spaces are not one space); R10-2 a manual swap over a serve
substitute clears the marker, makes the row the user's own, and
AMENDS the slot's entry to name what actually stood in it
(toChosenByUser; a swap back to the original revokes) - the quiet
line no longer claims the app's workaround over the user's pick;
R10-3 the record corrects FORWARD on logged fact - completion passes
performedIds and every performed omission renames 'omitted_revoked',
dropping out of the receipt, both weekly counters (the reshaped
counter's any-record predicate corrected to live-entry LIKEs), the
ended-early excusal and the block-ledger denominator (driven: 1/1
before reconciliation, 0/0 after); B4 the Home effect gains its
cancellation guard; C1 FreeStarter's first-run cancel stops wearing
the decline word ("Don't start it"); I6 the sweep triggers on the
lane's READ identifiers too, matches both quote forms, and bounds its
window to the button's own object; contradictions a-e corrected in
place (among them: "a _capabilityTemp session never re-serves" was
overstated - removal or swap of the last marked row makes a second
pass reachable; the revert's conclusion unaffected). D122 corrects
D121 rulings 1 and 2 plainly. Round 11 re-runs before S5.

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
| A1 | Fresh generation honours every rule kind | LANDED | CC25 filter + preflight on all six entries (T1-21/22 closed W1); round 7 R7-2 closed: RoutineDetail's divisionDiff/coverage recompute runs over the generation-filtered, block-scoped library (T1-02's second named path; door guard widened to the class); round 8 closed: the recompute carries generation's demonstrated-structure + canonical-name inputs (generation's own exported paths) and renders NOTHING on an unavailable lane read; CONDITION (widened round 9, D121): the recompute reads TODAY's demonstrated structure, library and profile, so it reproduces the original build only while those are unchanged since generation - reviewed-replacement omissions (inside a continuity proposal) are ONE rebuild-time-only input, not the only one; round 10: the block's own comment still claimed the deleted raw-library fallback - corrected in place (contradiction a, evidence rule 2) |
| A2 | Baseline rule meets an installed plan | LANDED | W1 L4 + root fix post-W4A: computeCapabilityPlanRewrite read `row.id` off the nested `{routineExercise, exercise}` shape, so apply skipped every line in production; fixed with the suite re-shaped to the REAL row shape + a would-have-caught pin; round 5 R5-8 closed: the rewrite threads a taken-set, so two conflicted rows of one muscle write two DIFFERENT movements (driven pin; the round-5 probe had both permanently rewritten to Leg Press); round 6 R6-1 closed: the rewrite judges substitutes under the block-scoped intent state - a block-avoided movement goes unsolvable, never into the document (driven pin through the real senior question) |
| A3 | Pickers/selection honour rules | LANDED | CC25 + allowance seam W1 L1; CLOSE-OUT census (D132): exercise-detail's swap suggestions fell back to the UNFILTERED pool under a stale-known read and could offer a movement the user's rules exclude - FIXED; every suggestion surface now honours a known state |
| A4 | All 12 swap surfaces honour | LANDED | T2 column D map; T2-10 closed W5; round 5 R5-8: substitute selection across surfaces shares the taken-set seam |
| A5 | Serve-time honours (substitution/omission) | LANDED (round-1 BROKEN F1, fixed) | serve judges LIBRARY-resolved rows (the routine rows carry no demand columns; before the fix an applied demand rule substituted the whole session); unknown drives nothing automatic; composed senior question at all four substitute sites; serveGuard re-shaped to production fixtures + F1 regression pins; round 5 R5-8 closed: serve assigns distinct substitutes - taken-set seeded with the session's own rows (driven pins); round 6 R6-1 closed: serve never substitutes IN a block-avoided movement (scoped loader, all four seam paths; driven pins + scope-control); round 16 R16-2 closed the taken-set leak: a user-chosen row resolves UNCHANGED in the view before any substitute is reserved, so a planned conflicted row behind it receives the eligible substitute instead of being omitted while it sat idle (driven) |
| A6 | Coaching honours (limiters, holds, proposals) | LANDED | W2 L5/L6; constrainedTruth.w2 suite; round 19 R19-1 closed at root: the volume-apply withhold gated on a THROW and the resolver cannot throw, so a cold read failure increased every muscle - D112 R3's posture had never executed on the failure it was written for; it gates on capabilityKnown now (stale-known still computes real holds) |
| A7 | Block review honours (senior question; stored KEEP never outranks capability) | LANDED (round-1 BROKEN F2, fixed) | blockAdvisor judges library-resolved rows; REPLACE keys on DEFINITE blocking conflicts only; W5 pins updated to the new mechanism; round 18 R18-2: the review's REPLACE now keys on the definite BASELINE fact (baselineConflicts, allowance-carved) and its KEEP on the LIVE overlay via the shared removalExcusalConflicts gate - the old blockingConflicts-minus-affected proxy let a held/declined rule veto a live baseline replace; round 19 R19-2: the review's baseline term took capabilityKnown - the old !unavailable guard silently switched the capability REPLACE off under a stale-known state the rest of the lane honours |
| A8 | Plan reactivation honours | LANDED | T1-11 repeat-offer after runBlockActivation (9d5b4a1b) |
| A9 | Allowances honoured by every consumer | LANDED | blockingConflicts seam W1 L1; allowanceSeam suite; per-line Keep now mints through the same seam |
| A10 | Manual adds/overrides never reversed | LANDED (round-3 BROKEN R3-4, fixed; round-11 BROKEN R11-4, fixed) | serve returns base indexes - no id reconstruction; driven duplicate+omitted+_userAdded pin serves the user's own object at its own slot; round 11: EVERY manual swap marks the row _userAdded (the marker means "the user chose this row") - round 10's conditional marked only substitute swaps, and the reachable second serve pass substituted over an ordinary swapped row, reversing the user's pick after a relaunch |
| A11 | Laterality honoured (side-carve serves) | LANDED | CC25 §16 + laterality suite; round 7 R7-3 closed: the side carve is a UNION per axis - left+right, or sided+unsided, on one axis BLOCK; left alone still carves; the note and the block share one answer (six pins); round 8 R8-1 closed: the both-sides prompt gates on sidedRuleTouches - suppressed whichever way the carve resolves; the note keeps the carve answer (pinned both ways); round 16: the union's PHRASING joined its semantics - a union-blocked sided rule phrases unsided everywhere (R16-3); round 17 R17-1: the ask also WAITS for its inputs - the suppression gate could be consulted before the async resolve landed, in the same commit, and the self-tag made the wrong answer permanent; readiness terms precede both now (source-pinned as ordering; the pin class stated on I6); round 18 R18-1: readiness means KNOWLEDGE - capabilityKnown holds the ask on the resolver's unknown-empty shape and on an unfetchable judgement row (both before the gate and the self-tag, fail direction DRIVEN at the real loader); stated cost: a persistent read failure keeps the per-side suggestion silent for the session; round 19 CONDITION stated: the !resolvedExercise.row term silences the per-side ask for any exercise whose library row cannot be fetched - permanent for a genuinely missing row, and after a transient failure the resolve retries only on an exercise change |
| A12 | Clinician standing uniform (never carved; distinct everywhere) | LANDED (round-1 BROKEN F5, fixed) | source outranks certainty (D113): unknown clinician conflicts survive the carve, rank CLINICIAN, route to the rule editor with honest both-facts copy; allowanceSeam F5 pins |
| A13 | Custom exercises fail closed, carveable, honest receipt | LANDED (round-3 BROKEN R3-1, fixed) with ONE STATED CONDITION | driven rebuild pin: a NULL-column custom lift survives a rebuild into the resolved plan, never equipment-lost, never capability-excluded. Condition (open work item, D115): an incumbent custom lift with NO family tag contests no continuity slot and a rebuild drops it silently with no receipt line - pre-existing family-keyed matching, round 4 attacks it; round 5 R5-1/2/3 closed: the receipt is complete on BOTH renderers, drops count into exerciseChanges (a drop-only rebuild takes the rebuild path), the headline speaks the fourth count, accounting deduped, identity keys; round 6 R6-5: twice-programmed lifts retain both rows (entry-keyed matching); CONDITION: the gone-accounting is id-keyed on purpose - an exercise still anywhere in the new plan is never listed 'no longer in your plan', so a two-day lift dropping to one day is a frequency change the receipt does not list; round 7 R7-1 closed: per-workout guard - one incumbent is never retained into two slots of one session; cross-day double retention stays (both pinned) |
| A14 | "Hold my plan" honoured end-to-end | LANDED (round-1 BROKEN F3, fixed) | adaptation_mode travels unconditionally in sync pushes (the resume of the last held episode no longer resurrects cross-device); pinned by a DRIVEN round-trip test, not a source string; round 8 D120 ruling 2: hold suspends a rule's own automation, never the fact it records - a held sided rule completing the union so a LIVE rule substitutes is CORRECT and driven-pinned (effective.js docblock corrected); round 18 R18-2: the rebuild half joins the ruling - a held rule no longer counts as the live overlay at slotVerdict (it deferred correctly but for the wrong reason and vetoed baseline replaces); held-only slots still defer document judgement, BELOW the baseline rank (D130 ruling 3) |
| A15 | Every failure posture fails safe (no silent fail-open) | LANDED (round-3 BROKEN R3-2, fixed) | the `checked` tri-state: a failed read is "could not tell", never "nothing affected"; the vacuous applied fires only on a completed check (driven rejecting-DB pins assert NO write); round 5 R5-9 closed: the revisit toast branches on checked - a failed read says 'could not read', never 'nothing needs a decision'; detector key stamped only on a completed check; round 6 R6-6 closed: the per-line review's empty answer branches on checked too (shared COULD_NOT_READ constant - the two sites cannot drift); round 12 R12-2 closed the removal writer's certainty gap, and round 13 R13-2 made the parity REAL rather than claimed (D124's "exactly the gates the completion writer applies" was false twice: the _userAdded term and the held co-driver shape): both writers consume ONE shared removalExcusalConflicts answer - unknown excuses nothing, held drops before the applied test, every live definite driver must be applied, user-chosen rows refused - driven at both writers on one fixture with equal constraintIds; round 14 narrowed the INPUT-state divergence and round 15 fixed its failure branch (a transient read failure on return-focus no longer erases a correct in-flight state - reload failures keep the last state, mount/exercise-change failures still clear because the old state describes a different slot); the residual sliver stands: a rule arriving by sync mid-focus is invisible until focus, exercise change or the swap sheet (conservative direction: an excusal missed, never fabricated); round 16 R16-4 closed at the true mechanism: the state is USER-scoped, so a failed refresh keeps the last real state on EVERY trigger (round 15's different-slot rationale attached R2-6 to the wrong state and is deleted); the swap sheet's write participates in the sequence guard both directions; CONDITION: a preference-read failure at swap-open still writes the honest fail-open shape over a richer state, with the toast speaking for the sheet (D109-2's design); round 17: the general posture is stated - pending-read gates answer their permissive value, which is SILENCE for rendered notices (R2-6) and must be an explicit WAIT for anything that acts (R17-1's ruling); round 18: BOTH action sites implement the wait - the ask holds on capabilityKnown (presence was not knowledge; the unknown-empty shape walked through the round-17 terms) and the removal excusal writer takes a FRESH read at write time like the completion writer, closing the mount-window miss; the round-17 sentence claimed the posture while one site had it; round 19: TWO more fail-open postures closed - R19-2 (both rebuild builders refused a stale-known state the write carve honoured, so a kept slot was emptied) and R19-4 (the removal excusal writer had no performed gate at all); CONDITION: the round-18 async removal write is lost outright on a process death - the removed row has left the completion snapshot, so nothing re-derives it (conservative direction: missed, never fabricated); CLOSE-OUT census (D132): class 1 (fail-open on an unreadable read) is now closed by ENUMERATION over every loadCapabilityResolveState site in src/, each gating on capabilityKnown or carrying a stated exemption with a validity check; a new site fails by default |

## B. Visibility — every effect the user can see

| # | Variable | State | Evidence |
|---|---|---|---|
| B1 | Generation reveals shaping (counts on all six entries) | LANDED | W3B (bca83133); T1-12 pins |
| B2 | Total-block is a graded state, not an engine error | LANDED | W3B T1-13; graded paths pinned |
| B3 | Plan view marks conflicted/substituted rows | LANDED | W3A T2-32 markers; round 5 R5-7 closed: the plan caption speaks serve's own answer (three-way applied caption off one hoisted memo under the exported senior question); round 6 R6-2 closed: the memo's intent state and serve's are built from the same block-scoped inputs, and the screen re-reads on focus (0.7 ms recompute, round-6 measured); round 7: the focus listener skips its registration focus (armed from navigation.isFocused()), so the first paint pays the reload once; CONDITION: the reload still carries the ~5.6 ms division recompute (Node) on every genuine return; round 8 re-closed: the isFocused arming was disproven from the navigation source (double-load survived on push; a genuine focus could be swallowed) - replaced with an 800ms burst window whose failure mode is one extra load, never staleness; round 16 R16-1: the plan caption was the ranking consumer the round-15 extraction did not reach - it now consumes constraintNoticeKind, so the plan view and the session strip cannot rank one state differently; round 17 Q1: this screen's three intentState writers join the sequence guard (mount/focus/swap wrote unordered); round 19 R19-3: the plan caption no longer words a permanent baseline conflict as temporary when a declined or undecided episode rule co-exists |
| B4 | Pre-session presence (Home line, ordinary state) | LANDED | W3B standalone line + lead hold-tighten; HomeScreen.capabilityVisibility.guard; round 9 closed (B4/E1, D121 ruling 3): a failed check with no known state (the resolver's unavailable && !stale signature, and the effect's own catch) renders one quiet NON-tappable could-not-check line instead of silently showing nothing; stale-but-known keeps serving per CAP-17 and never fires the line (pinned); round 10: the effect gained the cancellation guard its five setters never had (out-of-order focus cycles can no longer land a stale flag); CONDITIONS stated: the line is unscoped to lane users (scoping would need the very read that failed) and there is no in-focus retry, matching every other lane surface |
| B5 | In-session notices (episode + baseline + reduced signal) | LANDED (round-1 BROKEN F1, fixed) | notices judge the resolved row; definite conflicts speak the lane's copy, unknowns the honest not-known line; round 5 Q-1 closed: the generic in-session line states the conflict and never claims an adaptation (a noticed row is by construction served as planned); round 6 R6-4 closed: the NAMED episode line states the conflict and offers the swap - the round-5 fix had reached only the generics, and the named branch is the dominant path; round 10 R10-2 closed: swapping away a serve substitute clears _capabilityTemp and makes the row the user's own - the quiet line no longer claims "Temporarily in for X" over the user's OWN pick (the spread had carried the marker through every manual swap); round 13 closed the marker's other blind spot: a DEFINITE conflict on the substitute itself now outranks the marker line - and round 14 corrected that gate's CLASS twice; round 15 ended the inline-chain era after a THIRD ordering defect (the held branch below the fixed marker branch still fired over a substituted row when a definite baseline conflict co-existed): branch selection now lives in constraintNoticeKind, pure and truth-table-DRIVEN - marker yields only to live drivers or definite baseline facts, the held line speaks only for a pure held state, the episode line names driving rules alone, and a reload failure keeps the last state instead of erasing a correct notice; round 19 R19-3 closed the last ordering defect in this chain: a declined or undecided rule drives nothing and no longer outranks a definite baseline fact; the truth table now varies effectiveChoice against a baseline co-driver, the axis four rounds of pins never varied |
| B6 | Post-session line + what-changed detail | LANDED | W3A T2-07/T2-22; round 10 closed the omitted lane (per-slot entries; performed omissions revoke); round 11 closed the SUBSTITUTED lane the same way (R11-1: performed-original substitutions revoke, a removed substitute converts to an omission, and the receipt reads toChosenByUser - "You chose X in for Y", neutral headline on any user-chosen slot) and the ad-hoc identity gap (R11-2); round 12 closed the two chains still through it: swap-then-remove converts via the slot's RECORD (the marker-keyed call missed it - R12-1) and picker-added rows carry slot ids (R12-3); rounds 13-14 closed the CLASS honestly: the fourth keyless construction minted, and after the round-14 review disproved "cannot ship keyless" with two holes (a null entry; the picker append outside the net), both are closed and driven - every path that CREATES session entries passes the chokepoint; the residual condition is narrow and stated: an omission re-added but NOT trained stands, correctly, and an untrained-but-standing substitution keeps describing the served session; round 19 R19-4: the receipt can no longer say a movement was left out over the user's own logged sets - the removal writer refuses a performed row and reconciliation reads workout_sets |
| B7 | Coaching output shows the constrained story | LANDED | W2 L6; constrainedTruth.w2; CLOSE-OUT (D132) STATED, not fixed: CoachOutputScreen's physicalConstraint fact passes null on an unknown-empty read, so the CONSTRAINED limiter cannot fire and the coach may attribute the week to the programme. Closing it properly requires an 'unknown' fact shape in the coach engine's contract - an engine change, deliberately not made at close-out. A quick guard attempted during the census pass would have aborted the whole coach run; caught in self-review before landing |
| B8 | Effects history renderable to its subject | LANDED | W3A T2-22 summary incl. past sessions; round 10 closed the record's shape; round 11 closed the RENDERING (R11-1): the amended entry's stamp finally has a reader - "You chose X in for Y" against the app's own "X in for Y" - and both _revoked forms fall through the strict matchers, so the history renders exactly the corrected record; round 12 R12-1: the correction reaches the swap-then-remove chain too (record-keyed conversion) |
| B9 | Effective denominators everywhere (widget, partner, Today, adherence) | LANDED | stats/adherence W2; widget/partner/Today W3B T2-16/T1-17; round 5 R5-4 closed (the count mirror shares serve's never-served-empty fail-safe: base count, never a falsy 0) + R5-5 closed by D117 ruling 3, CORRECTING D116 ruling 2 (which pointed at a non-existent 'Q5' row): the §18 predictive weekly-denominator reduction is DELETED - its capability-only predicate was strictly weaker than serve's composed question, so every firing excused a session served in full; weekly stats read only actual effects records (source pin); round 6 closed: countEffectiveSessionRows answers null on an unreadable routine (0 now means only 'this routine is empty'), honouring HomeScreen's ?? fallback exactly as its comment always claimed; round 10 R10-3 closed the round-9 condition where it was a defect: a performed omission revokes at completion, so the block-ledger denominator keeps a slot the user trained, the excusal counter stops crediting a week nothing excused, and the reshaped counter requires a LIVE entry (its any-non-empty-record predicate corrected) - driven end to end, 1/1 before reconciliation and 0/0 after; round 11: both counters now require is_completed = 1 (an opened-and-abandoned session counted as a reshaped/excused week while counting for nothing as training - driven pin); CONDITIONS stated (D123 ruling 5): re-added but NOT trained keeps the omission, correctly; and where one movement filled several slots and only one was trained, ALL that movement's omissions revoke - the block ledger's per-muscle denominator keeps the untrained slots the restriction removed (a conservative under-read; count-revoke was rejected because a surviving omitted entry would fabricate CONSTRAINT-excused evidence for a movement the user demonstrably performed, and the ledger's planned map is per-exercise so per-slot arithmetic is not well-defined); round 12 R12-2 closed the counters' unknown leak: the removal writer excuses on DEFINITE applied conflicts only (the shared removalExcusalConflicts answer), so no week reads constraint-excused off a fact the app has not established; the is_completed gate itself survived round-12 attack (every reader enumerated - none needs abandoned sessions); round 13 R13-2 closed the user-chosen leak: a row the user added past a block reason and left unlogged no longer counts the week excused or reshaped - both writers refuse the user's own rows; CONDITION (round 15): after Clear workout history, a full re-pull (sign-out/sign-in, new device) re-inserts cloud workouts while the effects records stay tombstoned - those weeks read unreshaped (conservative direction); round 16 R16-2: no week reads constraint-excused for an omission a free eligible substitute would have prevented (the taken-set leak); round 19 R19-4: the weekly constraint counters and the block ledger's denominator no longer count a performed-then-removed movement as excused |
| B10 | Lifecycle visible (AWAITING on Today; reintroduction durable line) | LANDED | AWAITING W3B T1-15; T2-25 durable line landed post-W4 (rampMusclesFromPlannedRows reads the source stamp; coach story change with its own why + quiet Home plan-view row; three suites) |
| B11 | Swap sheets state their narrowing | LANDED | W3A T2-08 |
| B12 | Why-this explains capability shaping | LANDED | W3B T1-16 buildWhyThis line |
| B13 | Side-carve named in session | LANDED (round-1 BROKEN F1, fixed) | isSideCarvedAvailable judged on the resolved row (it could never answer true on the partial one); guard suite now DRIVES the mechanism with both shapes |

## C. Understanding — the user can predict what will happen

| # | Variable | State | Evidence |
|---|---|---|---|
| C1 | One vocabulary per lane, zero blur | LANDED | W4B sweep (9d5b4a1b): T2-33/T1-19; T1-08 capability lane's own words end-to-end; round 5 Q-2 closed: the clinician confirm speaks its frame (decline/stop/keep) - no mid-flow vocabulary switch, no cancel readable as 'keep the rule out'; round 6 closed: the chooser cancel is 'Leave it as it is' (F-1's no-op wording) - 'Not now' is the same screen's decline, one state apart; round 7 R7-5 closed: 'Not now' appears ONLY on the decline (source-guarded); the rewrite alert's no-op takes the F-1 wording; round 8 R8-3 closed tree-wide: PlansScreen's twin alert takes the F-1 wording and the guard sweeps every rewrite/proposal surface; the fail-safe dialogue frame presupposes nothing ('Keep this applied?' / 'Stop applying it'); round 9 C1/I6: the sweep is RECURSIVE (components/auth, components/food sat outside the flat readdir) and triggers on the write-side identifiers too; round 10 closed the survivor: FreeStarterScreen's first-run capability alert wore 'Not now' on a no-op cancel outside the sweep's reach - it is action-phrased now ("Don't start it") and the sweep triggers on the lane's READ identifiers; round 11 closed the NEXT survivor the same way: ProOnboarding's total-block dismiss (reachable only through the preflight identifiers) says 'Got it' and the sweep triggers on those identifiers too; round 12: the allow-list gains the resolver and directory identifiers (ExercisePickerModal and TrainingConsiderations now swept), and the one remaining lane-touching file outside it is EXCLUDED BY RULING, not oversight (D124 ruling 6: WeeklyCheckIn's 'Not now' is the notifications lane's truthful deferral; its capability identifiers are disjoint from every trigger); round 14 closed the FIFTH survivor, a different blind-spot class: the lane's own Article 9 consent dismiss wore label="Not now" (a JSX prop the alert-literal sweep could not see) on a no-op, one state from the screen's real decline - now 'Leave it for now', and the sweep matches text:/label=/title=/text-node forms; round 15 widened the literal set to the template and title-expression forms with element-bounded JSX windows; CONDITIONS: trigger coverage is by identifier allow-list and literal coverage by render-form list, each extended when a class is found - and a label computed at RUNTIME cannot be swept statically; round 16: the template alert form joins the list and the two static limits are STATED (same-line text nodes only; runtime-computed labels unsweepable); round 18: two reach triggers added (capability_declared, listActiveMovementConstraints) - ExerciseConflictSheet and AvoidedMovements are now inside the sweep, vacuously today, so a decline-word regression there fails instead of passing unseen; round 19: WorkoutSummaryScreen (the lane's receipt line and What changed expander) was the third lane surface outside every trigger; getSessionConstraintEffect added - vacuous today, so a regression fails instead of passing unseen |
| C2 | Every automatic action carries its why | LANDED (round-1 BROKEN F4, fixed) | UNKNOWN is never spoken as fact: session strip and plan captions gained the picker's own \"doesn't know yet\" branch; mixed rows speak only from what is established; round 5 R5-1/2 closed: no silent drop on PlansScreen, and the headline never denies the section beneath it; round 6 R6-5 closed: the headline is COMPOSED from every rendered count (changes, additions, drops, rep targets) - it structurally cannot deny a section; round 7 R7-4 closed: the fail-safe case is told - informational alert before the vacuous 'applied', in the lane's own words; round 8 R8-2/R8-4 closed: the fail-safe sentence rides the MIXED proposal and the group body (outcome-phrased, attribution banned by ruling), and the sided reason states only true mechanics; round 10 R10-2 closed the marker half with B5; round 11 R11-1 closed the RECORD half the round-10 cell overstated (D122 ruling 2's "no surface attributes" claim was false - toChosenByUser had no reader and the receipt worded the user's pick as the app's workaround): the receipt now says whose choice stood, in both the headline and the detail line; round 12 R12-1 closed the qualification (the record half held only while the marker stood - the swap-then-remove chain now corrects via the slot's record); stated: the mixed-count sentence never carried the attribution, so userChosen switches only the substituted-only branch; round 13 R13-2 closed the inverse attribution too: the receipt no longer says "left out" over a movement the user added themselves and abandoned; rounds 14-15 closed the in-session why at mechanism: the substitution's provenance line survives held co-drivers in EVERY combination (driven truth table - the round-14 cell's claim was one baseline-conflict state short), and the notices reflect a mid-session capture on return-focus with the failure branch keeping the last state; round 18 R18-2: the rebuild receipt's why is true again - 'while your temporary change lasts' renders only where a temporary conflict actually drives the keep; a permanent baseline conflict now surfaces as its own replace reason; round 19 R19-3 and R19-2: the why is true on both remaining surfaces - the notice no longer calls a permanent conflict temporary, and the rebuild receipt no longer claims a keep over a slot the write empties |
| C3 | Previews never over-promise | LANDED | W4A T2-05: computePlanEffectiveLines asks the substitute question directly (undecided rules no longer render every line "substituted"); summary is a reduction of the lines; planEffectiveSummary suite; round 5 R5-7/R5-8 closed: no over-promised swap, and the plural rewrite copy is true now substitutes are distinct; round 6: caption/serve agreement restored at the input level (R6-1/R6-2); round 7 CONDITION stated: an out-of-scope UNDECIDED co-driver is read optimistically in the would-if mode (deliberate, D118 ruling 2) - the one place preview can state a swap a later decline prevents |
| C4 | Effect preview at rule creation (real outcomes) | LANDED | same fix; substituted/omitted parts pattern live; round 5 Q-5 dissolved by R5-8: N swaps can no longer land on one movement, and the per-line review names each from->to |
| C5 | Lanes cross-reference both ways | LANDED | T1-20 both sides: W4B AvoidedMovements line + lead's HowYouTrain preference row, route registered in all six stacks, reachability sweep watches AvoidedMovements |
| C6 | Name-by-effect, never diagnosis | LANDED | CC25 §11 + CAP-3; phrase module law |
| C7 | Explanations name the side | LANDED | W3A + picker §16; round 16 R16-3: the union question is ONE shared answer (sidedUnionShape) - the in-session named lines no longer name one side of a closed union on a movement that can be loaded a side at a time; the picker consumes the same helper; round 17 Q4: the unknown named line unsides too - no branch of the in-session notice can name one side of a closed union |

## D. Agency and control

| # | Variable | State | Evidence |
|---|---|---|---|
| D1 | Per-line Apply/Decline | LANDED (round-1 BROKEN F6, fixed) | keeps are EPISODE-SCOPED (allow rows minted into each driving group - end with the episode, restart with a flare, permanent only on promotion); clinician all-or-nothing; every choice takes effect exactly as chosen, for exactly as long as it was asked about |
| D2 | Every choice revisitable (no one-shot) | LANDED (round-1 BROKEN F6, fixed) | allowance rows now render DISTINCTLY (episode card \"(kept in)\", baseline \"Kept in at your word\", reversed remove-confirm stating which way the cut goes); revisit row + honest empty tap stand; round 5 R5-6 closed: every applied group is reachable - the revisit row gathers all conversations and opens exactly one (chooser with a true no-op cancel); round 6 R6-3 closed: the group dialogue's lines come from serveGate mode - 'Your sessions currently show' is never said of a row a declined or undecided co-driver holds in place, and such a group is not offered as a conversation; round 7 R7-4: a fail-safed applied rule is revisitable again - hasCapabilityToRevisit counts it and the revisit flow offers its group with an honest dialogue |
| D3 | In-the-moment capture creates the episode | LANDED | W4B T2-11 preselect capture (9d5b4a1b); round 14 R14-2 closed the round-13 QUALIFIED half (return-focus reload) and round 15 its failure branch (a later failed reload keeps the last state rather than erasing the captured rule's notice); CONDITION: a rule arriving by SYNC mid-focus stays invisible until focus, exercise change or the swap sheet; round 16: the reload keeps the last state on every failed trigger, so the captured rule's notice can no longer be erased by a later transient failure |
| D4 | Suspension valve (hold/resume, per episode) | LANDED (round-1 BROKEN F3, fixed) | A14's sync fix; resume now survives cross-device; round 8: same D120 ruling 2 condition stated - a held episode contributes facts to the union exactly as pickers/generation already take from it; round 18 R18-2: the valve's scope corrected at the rebuild verdicts - hold suspends the rule's OWN automation and cannot suspend a BASELINE rule's document rewrite; the held slot still defers evidence judgement (D130 ruling 3's write-carve grounds) |
| D5 | Every check-in answer lands | LANDED | W2 L6 ('fine' acknowledged) |
| D6 | End/extend/promote/flare flows complete | LANDED | end/extend/promote W1 L4; flare re-propose W4A T1-05 (restart captures minted ids, proposes as the add flow does) |
| D7 | Sync-arrived rules propose | LANDED | W4A T1-06 focus detector (pending-guard + same-set key; explicit actions never gated) |
| D8 | Never words in the user's mouth | LANDED | W2 L6 (T2-18); capabilityCoach pins |

## E. Findability and onboarding

| # | Variable | State | Evidence |
|---|---|---|---|
| E1 | Entry at every moment of need | LANDED (round-1 QUALIFIED, gap fixed) | arrived-but-undecided rules now surface on Home (quiet ask-row sharing the AWAITING slot), landing on the screen whose focus detector proposes immediately; round 9 closed with B4: the read-failure vanish (every ask and statement row gone with no word said) now shows the honest could-not-check line; round 10: cancellation guard and stated conditions shared with B4 |
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
| F5 | Learning shield incl. boundary carry | LANDED | W2 L7; contamination replay both halves; causeOverride 'constraint' wired end-to-end (9d5b4a1b); round 19: the swap cause derivation took capabilityKnown - under a stale-known read a capability-forced swap recorded cause NULL and fed swappedAwayCount, teaching the preference lane a dislike the learning shield exists to prevent |
| F6 | Reintroduction honest (real ramp, no volume debt) | LANDED | W1 L3 role scoping; reintroduction pins; durable line reads the ramp's own stamp, never a second computation |
| F7 | Article 9 capability consent separate, fail-closed, un-bypassable | LANDED | CC25 §26 + migrate_147; round 14 changed ONE thing on the card - the dismiss label ('Leave it for now', off the lane's decline word; flagged for the founder walk) - and round 15 re-verified the gate itself: fail-closed on a read error, un-bypassable, behaviour untouched |
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
| H2 | Erasure + export reach capability tables | LANDED (round-1 QUALIFIED Q4, fixed) | the portability export now carries effective_choice and adaptation_mode - both user-supplied decisions; round 12 R12-4 closed: a deleted COMPLETED session's effects record is tombstoned (it previously stayed live in the export and sync), and the tombstone survives later writes; round 13 R13-3 closed the THIRD delete path (driven) - erasure reaches all three; CONDITION (round 15): that clear deletes workouts LOCALLY only while the effects tombstones SYNC, so a full re-pull returns history without its constraint provenance (conservative - no fabricated CONSTRAINED evidence; the clear-history cloud story itself is the founder-side item D126 surfaced); round 16: the tombstones' push is SCHEDULED (round 13 left it to the next unrelated write); round 17 Q2: all three delete paths schedule the tombstone's push |
| H3 | Zero capability telemetry off-device | LANDED | Q4 ruling; migrate_150 retired |
| H4 | Share surfaces never leak capability | LANDED | share-card rules; T2-29 notifications clean by enumeration |
| H5 | No capability PII to Sentry | LANDED | sentryScrub + error paths reviewed per landing |

## I. Technical integrity

| # | Variable | State | Evidence |
|---|---|---|---|
| I1 | Offline-first (all rules work with no network) | LANDED | SQLite truth; sync additive |
| I2 | Cross-device sync correct (LWW, tombstones, effective_choice + adaptation_mode round-trip) | LANDED (round-1 BROKEN F3, fixed) | both decision columns travel unconditionally; driven round-trip pin; round 12 R12-4 closed both tombstone gaps: deleteWorkoutAndSets tombstones the effects record (round 11 covered only the discard path), and createSessionConstraintEffect PRESERVES deleted_at across its replace (one racing best-effort write used to resurrect a tombstone into sync); a pull cannot resurrect either (strictly-newer LWW, verified round 12); round 13: the third delete path (clearWorkoutHistory) tombstones too - all three workout-delete paths carry the same discipline; CONDITION (round 15): clearWorkoutHistory pairs no cloud delete for the workouts themselves (unlike deleteWorkoutAndSets), so its two halves propagate differently - stated with H2; round 16: clearWorkoutHistory calls _scheduleSync, so the tombstones travel promptly; round 17 Q2: deleteWorkoutAndSets and deleteIncompleteWorkout schedule their tombstones' push too - no effects tombstone waits for an unrelated write |
| I3 | Deterministic engine, no AI, no randomness | LANDED (invariant) | engine purity pins |
| I4 | Hot-path performance (resolver on list screens) | HOLDS (round 1, measured) | picker full-library pass 0.131 ms, 8-row markers 0.034 ms, worst-case 32-slot rewrite 0.519 ms at 300 exercises x 12 rules (Node; device confirmation rides X2); round 8 CORRECTION + closure: the round-1 timing figures are SUPERSEDED - R7-3's union put a per-exercise allocation on the full-library pass (measured 6x by the round-8 reviewer); sideCarveByAxis is now memoised per state object (WeakMap) and exported, removing the per-exercise cost; all figures are Node, device rides X2; round 9 stated (D121 ruling 6): the round-8 "6x" and round-9 "2.7x" figures are DIFFERENT fixtures (library size and rule mix), both Node - neither is a device number; round 10 stated: the memo is per state OBJECT, and two production paths spread the state past it (the stale-known failure return and baselineBlockedMuscles' scoped view) - the round-10 reviewer measured every shape including the memo-defeating ones sub-millisecond on a THIRD Node fixture, so no figure on this row is normative and none is a device number |
| I5 | Migration hygiene (additive, idempotent, records true) | FOUNDER (round-1 STOP S1) | files and records additive and true (149/151-era comments corrected 9d5b4a1b; the sync file's own pre-152 comment corrected with F3); the one open item is founder-side: the migrate_152 record accepted a structured named confirmation as the phrase-gate equivalent, which contradicts CLAUDE.md's exact-phrase law - surfaced for the founder to ratify or tighten |
| I6 | Invariant tests for every law + regression guards | LANDED (round-1 BROKEN F8, fixed) | the pins that let F1/F2/F3 ship now drive the real mechanisms with PRODUCTION-shaped fixtures (serveGuard asServed + drift guard; sideCarve driven both shapes; sync round-trip driven); round 5 Q-4 closed: all three fall-through preference reasons pinned (EXCLUDED/AVOIDED_BLOCK/PATTERN_AVOID); receipt headline and PlansScreen render pinned; round 6: the substitute-selection pins now run the REAL senior question (only the loader is mocked, honouring its scope argument); CONDITION: the screen-render halves of R5/R6 closures remain source-pinned per the screens' own guard convention, stated on each suite's header; round 7: the three named gaps closed - the continuity fixture is now cross-workout AND same-workout, T1-02's second path is pinned, the D42 guard contract states the true shape; round 8: the R8-3 guard is tree-wide and the R7-2 door guard's screens-only reach is stated; B3's premise defect is closed by construction rather than pinned on an unverifiable string; round 9: the R8-3 sweep RECURSES into subdirectories (tests excluded - pins quote the literals) and triggers on applyCapabilityPlanRewrite/recordEffectiveChoice too, with a walked-sanity floor (150+ files) and a non-vacuity assertion so a rename can never empty it silently; round 10 closed the sweep's three named blind spots: triggers include the lane's read identifiers (seven more files swept), both quote forms of the literal match, and the window is bounded to the button's own object (a nearby declineNow can no longer false-pass); the R3-4 serve pin now states its single-entry outcome is fixture-specific and the live-twin shape is pinned beside it; round 11: triggers widened to the preflight identifiers (the ProOnboarding survivor's only lane reach), the B4 cancellation pin requires BOTH guarded sites, and six new driven pins cover the substituted-lane corrections, the counted legacy credit, the bounded amend, the counters' is_completed gate and the discard tombstone; round 12: the removal writer's certainty gate is driven against the real resolver (the named pin gap), the touch-target guard covers the receipt's onward link beside Home's rows, and three more driven pins land (record-keyed conversion, completed-delete tombstone, resurrect-proof replace); round 13: the shared gate is driven at BOTH writers on one fixture, the chokepoint mint at the real store, the erasure path driven; round 15: the notice's branch selection is DRIVEN at last (constraintNoticeKind's twelve-state truth table + the breaking state at the real resolver), and the lane's touch targets carry their first enumerated guard; round 16: the ranking's SECOND consumer consumes the helper (the source-ORDER pin that passed over its divergence is replaced by consumption pins), the sided-union answer is driven at its own helper for both consumers, and the touch guard's allowlist is counted; round 14: the sweep's literal set covers the codebase's render forms (the consent card's JSX-prop 'Not now' passed four rounds of alert-literal sweeping), and the chokepoint's hole pins are driven at the real store; CONDITION: the caller's remaining marker/user-chosen composition stays source-pinned; CONDITION restated: mechanism halves are driven (serve/substitute/continuity/sync/adherence/effects-record on the real mechanisms), screen-render halves stay source-pinned per the screens' own guard convention; round 17: R17-1's fix is source-pinned as ORDERING within the effect body (readiness guards before the gate before the self-tag, plus the dep list) - the honest pin class available while this screen's suites avoid a full render harness; CONDITION: hook-order defects need that ordering discipline, a bare presence pin cannot see them; round 18: the two structural blindnesses the review named are closed - the fail DIRECTION of the ask's knowledge gate is driven at the real loader (an ordering pin cannot see which way a gate answers), and the touch guard counts styles.<name> applications (a definition pin cannot see a deleted application); CONDITION: ordering pins remain ordering pins - each new gate needs its own driven fail-direction pin; round 19: R19-1 shipped UNDER this suite's own green string pins - a source guard asserts a gate's strings and cannot see its fail direction (the class D130 ruling 5 named, found again on a pre-campaign gate); CONDITION restated plainly: every knowledge gate needs a DRIVEN fail-direction pin, and the touch guard's application count is a text count (a commented-out application still counts); CLOSE-OUT (D132): the pins gain a CENSUS layer - the four recurring classes asserted at EVERY participating site rather than at the instances review happened to sample, failing by default on new sites; this is the terminating criterion the loop never had |
| I7 | FD-1: accommodation free-tier, guardrails tier-blind | LANDED (invariant) | proGate mandate; no tier reads in capability lane |
| I8 | Kill/relaunch/restore correctness | LANDED (round-1 QUALIFIED, condition resolved) | markers persist, effects append dedupes, mid-alert deaths recover via the detector/revisit row; the one condition (\"the relaunch pass re-runs F1\") dissolved with F1's fix; round 8's replaceSource is REVERTED in round 9 (R9-1/D121): serve runs over the persisted reduced list, so a second pass cannot re-derive pass-1's omissions and the replace DELETED them - the round-8 claims "a relaunch that resolves differently corrects the record" and "a declined-then-served row's omission is revoked" were FALSE (both cited scenarios unreachable: the reduction is persisted; a _capabilityTemp session never re-serves); the append is a pure deduped merge again, source:'serve' stays forensics-only, driven two-pass pin on the real DB (both passes' omissions survive); the removal hook's and completion writer's entries were never touched either way; round 10 corrected this row twice more (D122): the round-9 reachability wording was overstated ("a _capabilityTemp session never re-serves" - removing or swapping away the last marked row clears the markers the relaunch guard checks, so a second pass IS reachable; the revert's conclusion unaffected), and the dedupe key itself deleted a true record within ONE pass for duplicate slots - the key is now (effect, exerciseFrom, rowId) per R10-1, with the relaunch/restore correctness re-driven; round 11 closed the two reachable-second-pass consequences: an ordinary manual swap is marked the user's own so the pass cannot reverse it (R11-4), and a removed substitute's entry converts on removal (R11-1) - a claim round 12 proved ONE CHAIN SHORT: the conversion keyed on the marker the swap clears, so swap-then-remove left the entry stale; it now keys on the slot's record (R12-1, driven); CONDITIONS stated (round 12, reachability corrected round 13): an ambiguous amend (either side keyless) lands on the first matching entry, which need not be the swapped slot's - round 13 proved the round-12 "only in-flight across the upgrade" clause false (the fourth keyless source made fresh sessions keyless) and then made it true going forward (the chokepoint mints every slot); and the amend/convert writes are one-shot best-effort with no later pass to re-derive them, unlike serve's entries; round 14: the chokepoint's null-entry hole closed and the append routed through the net; round 15: the swap sheet's intentState write joins the sequence guard (a focus reload resolving after the tap could overwrite the sheet's newer read); round 16: the swap-sheet write is sequence-guarded both directions (round 15's one-directional bump could orphan a genuinely newer exercise-change load); round 17 Q1: RoutineDetail's writers ordered (one counter, tap-time participation for the swap sheet) |
| I9* | Preview/serve/rewrite agree by construction | LANDED | one seam: computePlanEffectiveLines feeds the summary; substituteSeniorQuestion feeds all four substitute sites; round 5 R5-4/R5-7/R5-8 closed: serve, count mirror, preview, plan caption and rewrite share the taken-set and the never-served-empty fail-safe - one answer, five consumers; round 6 R6-1/R6-2 closed: the five consumers are now fed identical block-scoped inputs (D117 ruling 7's claim corrected in D118, then made true); round 7 CONDITION stated: the fail-safe mirror judges PLANNED routine rows; a live session's _userAdded rows are serve's own business and can keep a session off the fail-safe serve-side; round 8: the division recompute joins the shared-inputs family (structure + canonical names threaded; unavailable renders nothing); round 9 CONDITION shared with A1: that recompute reads TODAY's inputs, reproducing the build only while they are unchanged since generation; round 10 R10-1 extended the seam to the durable RECORD: serve and the record now agree per slot (the record collapsed duplicate slots per exercise while every seam consumer computed per row); rounds 11-14 corrected this cell's over-claim FOUR times, round 14 closed the chokepoint's holes, and round 16 closed the seam's two remaining disagreements (R16-1: the plan caption and session notice now rank one state identically via constraintNoticeKind; R16-2: serve's outcome for planned rows matches the planned-only memo because user rows no longer consume the pool); round 18 R18-2: the sixth computation of 'what will happen' is gone - both rebuild builders consume the shared removalExcusalConflicts gate and baselineConflicts, so the caption, the notice and the rebuild verdict rank one way; round 19 R19-3/R19-2 correct the round-18 sentence, which over-claimed: the caption and notice ranked a declined/undecided rule opposite to the rebuild, and a stale-known read made the preview and the receipt disagree inside one result object; both closed |

*I9 added at the lead review: the W4A finding class (two computations of
"what will happen" drifting apart) earns its own standing row.

## J. Accessibility of the feature itself

| # | Variable | State | Evidence |
|---|---|---|---|
| J1 | Screen-reader labels on every new control | LANDED | accessibilityRole/Label in landed diffs; round-5 reviewer verified round-4's controls carry meaningful labels (alert buttons via AppAlert.js:143-144, per-line rows, Home's three rows); round 5 W3 sweep (D117): W3 added NO interactive controls - its two notes are plain Text with no onPress, pinned as such by their own guard suites, and SettingsPrimitives' accessibilityLabel override is itself the accessibility fix |
| J2 | Touch targets and contrast via tokens | LANDED (round-4 BROKEN F-4, fixed) | Home's three capability rows carry minHeight spacing.xxxl (48); first touch-target guard pin; round 6 closed: AppAlert buttons at minHeight spacing.xxxl (48, the styling law's minimum) - every capability decision routed through alerts rides on it; round 8: long two-button pairs stack and row buttons shrink - no unshrinkable row can push its sibling off the clipped card edge; round 12 R12-5 closed: the receipt's How-you-train link rises from an off-scale 40 to minHeight spacing.xxxl (48) - two sibling onward links on the same style rise with it, a visible row-height change for the founder walk - and the touch-target guard now covers this control beside Home's rows; round 13 R13-4: TrainingConsiderations' four off-scale 44 literals tokenised (the back control and search field were genuinely 44 effective on the directory built for tremor and reduced dexterity); rounds 14-15: the picker's four undersized/off-scale lane controls closed (createNewBtn, "Allow again", then the show-anyway and set-aside toggles at ~39dp - the only routes to what the user's rules removed - plus createSaveBtn's off-scale literal), and the lane finally carries ONE enumerated touch-target guard with a strays assertion so a new numeric minHeight fails loudly; CONDITIONS: coverage is by enumeration (pickerRow's compliant off-scale 54 is allowlisted; pickerClose is a 40dp visual with 64 effective) (device confirmation rides X2); round 16: the guard's off-scale allowlist is COUNTED (a copied duplicate fails as loudly as a new number); round 17 Q3: ExerciseConflictSheet's three sm buttons floored to the token and enumerated; CONDITION: the strays check sees numeric minHeight only, so padding-sized controls rely on the enumeration; round 18: the sheet's FOURTH button floored (the md primary at ~46dp - the same round that floored the other three missed it) and the guard now pins an exact APPLICATION count per enumerated style, so a dropped style={styles.X} fails as loudly as a dropped definition |
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
| K5 | Same strength dose, adapted HOW not HOW MUCH (UK CMO) | LANDED | landmarks never rewritten (§15); CLOSE-OUT census (D132): the volume landmarks' blocked-muscle read refused a stale-known state and silently dropped those facts - FIXED; landmarks themselves remain untouched by the lane |
| K6 | Marketing claims gated by truth fields | LANDED (standing law) | MARKETING-READINESS-MATRIX |

## L. Edge cases and robustness

| # | Variable | State | Evidence |
|---|---|---|---|
| L1 | Blank sessions / first-add / restore | LANDED | W1 L2; serveGuard; rounds 11-14: four ad-hoc constructions minted one by one, then the chokepoint - and round 14 closed the chokepoint's own two proven holes (null entries; the picker append), so the honest claim stands: every path that CREATES session entries keys per slot through withSetsArrays (driven, holes included) |
| L2 | Mid-block episode start/end | LANDED | CC30 stamps + W2 carry |
| L3 | Block-boundary crossings | LANDED | W2 L7 carry; boundary pins |
| L4 | Overlapping rules (multi-episode, baseline+episode same exercise) | LANDED (round-2 condition STATED) | six multi-driver attacks survived; F6's episode scoping closed the carve's PERMANENCE; while the episode lives the carve is deliberately union-wide (D113 ruling 3: the keep speaks for the exercise everywhere non-clinician, and the baseline conversation resumes when it ends); round 7 R7-3 closed (same root as A11): the union of two sided rules IS the union; multi-rule side coverage pinned incl. the clinician mix; round 8 D120 ruling 2: the union deliberately reads every ACTIVE rule, held and declined included - ruled, pinned, stated; round 16: the mixed-role sided-union NAMING closed with R16-3 (the semantics had held all along); round 17: the rebuild's deliberate ranking is STATED - while a definite episode conflict stands, an incumbent a BASELINE rule also blocks is KEPT and the receipt frames the keep as temporary; the permanent conflict surfaces after the episode ends (caption + rewrite proposal); round 18 R18-2 corrects the round-17 statement: that ranking is right for a LIVE episode conflict only - the implementing term counted held/declined ones, which drive nothing and were vetoing the baseline replace; now live KEEP outranks baseline REPLACE outranks open-episode KEEP, driven as a table plus the reviewer's exact held+baseline input at the real resolver; round 19 R19-3: the round-18 statement was right for the REBUILD only - the notice lane still ranked a declined or undecided episode above a definite baseline fact; both lanes now use one order |
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
