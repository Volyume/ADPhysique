# VOLYUME — FINAL WHOLE-PRODUCT CERTIFICATION (2026-09-05)

Branch `claude/volyume-final-certification-w2xds1`, fast-forwarded to main
at each green landing. Evidence `01`..`06`, rulings `07`, changes `08`,
final pass `09`, device checklist `DEVICE-CHECKLIST.md`, register D152.

## 1. Overall result

CERTIFIED, with two qualifications that are the founder's to act on and
one that is device-only.

- Every stop-ship condition in the brief (Part 45) is closed in code and
  pinned by tests. The final adversarial pass over seven journeys found
  five stop-ship-class defects after remediation; all five were fixed and
  re-verified in the same pass.
- Qualification 1 (founder action): the live store listings still say
  "How you train"; the repo copy is corrected and needs re-pasting.
- Qualification 2 (founder decision): the Article 9 line "never the
  photos" is untrue only for the allow-listed founder debug accounts,
  whose own scan rows carry pixel data. Reword the line or drop the
  attachment.
- Qualification 3 (device-only): pixel-level visual review could not be
  run in this environment (no emulator, no web target). Structure and
  copy were reviewed from source; the 34-step device checklist is the
  founder's walk on the next green build. No build was dispatched.

## 2. Major adversarial findings

- P0: activating any library plan silently dropped circuit structure
  (group kind, round rest) and the plan's tags, so circuit sets fed every
  hypertrophy learner and style-constrained swaps lost their pool. No
  shipped build carried it (last builds 2026-09-04, circuits merged
  2026-09-05). Fixed at the copy path, pinned on in-memory SQLite.
- P1: the injuries and limitations feature was labelled "How you train"
  and its populated line said "Built around 4 things you told it".
- P1: the live logger described circuits as giant sets, in set language,
  with a per-station round count and an Unlink button.
- P1: kettlebell progression proposed 18.5 kg; the bell ladder, once
  built, was never reached by the live logger.
- P1: Today re-offered session 1 after the week was done and beneath a
  "Block complete" line.
- P1: widget taps, partner invite links and the foreground-service
  notification link went nowhere.
- P1: exercise search buried staples ("bench" gave Bench Dip) and matched
  nonsense on short words ("dip" gave hip thrusts).

## 3. Truth and claim problems found and fixed

Methodology said the coach cannot overrule you (Coached mode does, on the
user's standing instruction); the plan card said the coach "adjusts" (it
suggests); the Home offer and feature intro said every plan and workout is
built around limitations (true for generated plans, pickers, swaps and the
live session; not for hand-built plans beyond the picker); the wizard's
closing line likewise; kettlebell plan descriptions promised "the next
size" while the logger proposed 18.5 kg; the summary and insights advised
adding sets on evidence the volume read had excluded; three strings named
a retired surface ("Eat"). All corrected to what the code does.

## 4. Navigation and dead ends found and fixed

Widget click action; `partner/:code` linking; `active-workout` link to
Today (which restores the session); builder Save draft popping to My
plans and activation leaving the builder off the stack; meal plan return
from nutrition targets; block-reflection jump without a timer; the goal
screen's library button crossing tabs. Deliberately unchanged: the
quiz-first pre-account branch behind a documented flag.

## 5. Comprehension and explanation problems found and fixed

Week-complete, block-complete and plan-with-no-sessions states on Today;
circuit heads-up, round language, missed-round line, circuit preview line
on PlanDetail and Today; rounds and round-rest editing for a whole
circuit; Adjust-training and goal-screen notices on style plans;
circuit-flatten disclosure before any rebuild; the volume heatmap and
summary saying explosive lifts are not counted; one onboarding skip
instead of two identical ones; the Manual-mode note on hold weeks.

## 6. Injuries & limitations: naming, readback, discoverability

Renamed "Injuries & limitations" on every entry row, screen title and
onboarding step (D152; founder: "injury" and "disability" may be used
freely). Populated line names what is left out ("Leaves out overhead
work and gripping a bar") or counts restriction rows with their purpose
("3 injuries or limitations saved. Used when Volyume picks exercises and
builds your plan."); allowances never count; "things you told it" is
retired and guard-banned. The wizard asks "Is this long-term, or
temporary?". Discoverability passes in both directions from every tab
root and Settings; the comprehension proof over 17 fixtures passes.

## 7. Terminology, British English, AI tells

Mechanical scan over 404 files: zero em dashes, placeholders, AI-tell
phrases or internal-term leaks in live copy; two US spellings fixed;
commercial residue traces only to dormant modules with no live caller.
"How you train" vocabulary retired from 39 files and 68 mid-sentence uses.

## 8-14. Journey results

8. Standard training (A, B, G): clean after fixes.
9. Kettlebell (C): clean after fixes; a 16 kg bell prefills 20 kg;
   swaps stay in the kettlebell pool; Adjust training and goal change
   keep the plan.
10. Circuit (D): clean after fixes; structure survives activation,
    rounds are the circuit's, evidence class is stamped end to end and
    excluded by every learning consumer.
11. Separation and integration: one logger, one plan model, one library;
    circuits differ where it matters (rounds, round rest, no unlink) and
    share everything else; style plans are never flattened silently.
12. Exercise library and builder: staples first, literal before fuzzy,
    tighter typo allowance, 16 garbled aliases removed, Kettlebell chip,
    better no-results copy; contract test over the staple queries.
13. Stable physical requirement (E): findable without prior knowledge,
    respected by generation, plan badge, session and swaps; substitutes
    now respect style pool and equipment; coaching never claims baseline
    rules.
14. Temporary limitation (F): clean; episode lifecycle, Today line,
    check-in and coach copy agree; ramp-back line present.

## 15-17. Coherence, first use, mature use

Today, Train, Nutrition, Progress and Coach agree on week and block
state; first-use copy is intentional and decays; mature users see live
status lines rather than teaching copy. Kettlebell and band owners now
have an honest first-plan route (library install with one plain line)
because generation cannot build those kits yet.

## 18. Representative visual review

Structural and copy review from source only. Pixel review is device-only;
see qualification 3 and the checklist.

## 19. State and error issues fixed

False "No active plan yet"; block-complete contradiction; raw exception
text on check-in save; goal-summary claiming a rebuild that did not
happen; sync error text confirmed never rendered.

## 20. Product laws

Deterministic engine, ED-safety floors and gates, calm mode, Article 9
gate, EU residency, free product, billing dormancy, identity, schema
rules: untouched. Circuit evidence excluded from learning; explicit
Apply/Decline preserved; nothing consequential changes silently (two new
disclosures added); baseline vs temporary distinction preserved.

## 21. Verification

Closing run over the settled tree: lint clean (max-warnings 0), Jest
1,213 suites, 16,581 tests passing (16 skipped by design), `tsc --noEmit`
clean, corpus validator 918 live rows 0 violations, identity invariant
clean, route graph 0 dead targets in the live tree. Maestro E2E not run
(needs an Android build and a main-branch dispatch; no build dispatched).

## 22. Deliberately left unchanged

Quiz-first branch and LoginScreen (documented flag); dormant billing
modules (founder law); block-complete Today line alongside its hero
(attention rule); Settings row static subtitle; burpee absent (outside
resistance scope); duplicate corpus pairs (Romanian Deadlift, Good
Morning) left for the EL-21 retirement ruling; weekly coach unchanged
(its volume path runs through the block ledger, which already excludes
circuit and ballistic evidence).

## 23. Remaining external-only validation

Founder device walk (`DEVICE-CHECKLIST.md`, 34 steps); store listing
re-paste; the Article 9 founder-debug decision; REAL-DISABLED-USER-
VALIDATED stays NO.
