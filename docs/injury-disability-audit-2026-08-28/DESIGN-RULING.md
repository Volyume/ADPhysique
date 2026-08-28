# CC33 — Design ruling: one coherent capability (D112, lead-ruled 2026-08-28)

Ruled under D33 delegation on the single criterion: the absolute best
solution for the app and end users. Authority: the founder's two CC33
directives; evidence: FINDINGS.md and the four banked lanes. Binding laws
honoured throughout: FD-1 (capability accommodation is free-tier,
tier-blind), Article 9 consent un-bypassable, CAP-18 (no "safe to
perform", no condition names in generation copy), GC-D10 (stateless
rules, no condition-profile identity), GC-D12 (no outside parties; truth
fields stay honest), RT2-2 ("How you train" naming), ED-safety untouched,
British English, calm voice, no em dash in user-facing copy.

---

## 1. The coherence model

The audit's answer to "why does this feel like a collection of settings"
is FINDINGS.md §3: six half-built mechanisms. The design that makes it
one capability is six commitments, each stated as a law the tree can be
held to:

1. **Temporary is an overlay; permanent is the document.** An episode
   never rewrites the plan: it overlays sessions, visibly, and everything
   returns when it ends. A baseline rule never overlays: it changes the
   plan itself, through a proposal the user controls. Every lifecycle
   defect in cause A is a place the tree blurs this line.
2. **The resolver is the only door.** No surface that suggests, ranks,
   counts, slopes or serves an exercise may read the raw library. One
   decision function answers "may this be offered"; every consumer walks
   through it.
3. **Capability fails safe, and says so.** A surface that cannot read
   capability state either holds (generation-class) or serves the base
   document while saying it could not check (serve-class). It never
   silently widens suggestions, never silently applies coach increases,
   and never blames another lane.
4. **The user's word outranks the model** inside the safety envelope:
   an allowance is honoured by every consumer; a manual add is never
   overridden; every answer the app asks for has a consequence; the app
   never attributes to the user words they did not say. The one exception
   stays: clinician-sourced rules are never carved out of SUGGESTION
   surfaces (the app never proposes against clinician word) — but the
   user's own document remains their own.
5. **Visibility is quiet, present, and at the moment of need.** One-line
   markers, never banners; every effect the engine records is visible
   somewhere a user would look; entry points live where the need shows
   (mid-workout, post-workout, coach output, plan view, Home), not only
   in Settings.
6. **One vocabulary per lane.** Capability copy never uses preference
   verbs; the lanes cross-reference; clinician standing is uniform.

## 2. Rulings

**CC33-R1 — The baseline lifecycle gets its missing half (closes T1-03,
T2-01, T1-01/T1-25 chain, T2-21 premise, column-F baseline hole).**
(a) When a baseline rule is created while a plan is installed, the app
immediately proposes a PLAN REWRITE diff in the §14 pattern: per line,
substitute written into the routine row, unsolvable slots surfaced
honestly (never silently emptied), preview computed from the REAL
substitute search (no conflicted-pending counted as "swapped"). Accepting
rewrites the document; the plan then simply IS the user's plan (RT2-1
preserved, now true). Declining leaves the document, and the standing
conflict becomes visible (plan-view markers, in-session conflict notice
with swap shortcut) — RT2-1 is hereby AMENDED: baseline invisibility is
correct only while the document is baseline-compatible; a contradiction
the user has been told about and declined to resolve stays quietly
visible, because hiding it was S1 T1-03.
(b) Promotion ("This is how I train now") runs the same rewrite proposal
BEFORE committing: preview → confirm → end episode rows + mint baseline
rows + apply the accepted rewrite in one transaction. The §24
rebuild/adjust offer is part of the same surface. Serve-time substitution
for the promoted rules therefore never "switches off" — its work is
either written into the document or visibly declined.
(c) Volume honour: capability ceilings compose via
resolveEffectiveTargets (T1-01), and the §15 honest line ships with it.
IMPLEMENTATION REFINEMENT (recorded at W1 build, 2026-08-28): the
ceiling lands at the SEEDING consumption point (block activation), not
inside enforceWeeklyFloorsAndCaps, because reading the live mechanism
showed the FQ-4 allocator (coachApply.computeWeeklySessionAllocation)
scales existing entries with no per-entry cap - so for any muscle the
plan trains at all, the ramp is deliverable by construction and a
pre-build target cap is behaviourally equivalent to the post-build
truth. The §15 min genuinely bites where the pool is EMPTY under
BASELINE rules: those muscles seed honest zero rows ([mev, mrv] band
[0, 0], so the §20 coach consumption point is enforced mechanically by
computeVolumeApply's own clamp). EPISODE-blocked muscles are never
zeroed: their planned rows are the protected baseline §23's
reintroduction ramps back toward, and the effective layer (CC30
stamps, §18 denominators, the serve overlay) absorbs the temporary
gap - the volume-grain instance of "temporary is an overlay; permanent
is the document". Reintroduction then ramps against true rows in both
cases, making T1-25 real where it applies.
(d) Coaching consults baseline scope for exercise-level advice and
adherence framing (the column-F hole); volume HOLDS remain episode-scoped
— a permanent baseline is the user's normal, not a hold.
R1d DISPOSITION (recorded at W2 build, 2026-08-28): the column-F
baseline hole closes BY COMPOSITION, not by a new coach fact. With W1
landed, a baseline user's plan is rewritten-compatible or quietly
marked, their volume rows are honest zeros where the pool is empty (so
adherence and the ledger stop reading them as behind), and the
remaining exercise-advice surfaces (block review's senior question,
reactivation) are W5 items. The weekly coach deliberately says NOTHING
about a compatible baseline — that is RT2-1's dignity design working: a
baseline-shaped plan is simply the user's plan, and coaching it
normally IS the accommodation. The audit cell read "not consulted" as a
defect pre-W1; post-W1 the non-consultation is correct, and what
remains of the cell is tracked under W5 (T1-10, T1-11).

**CC33-R2 — The resolver door (closes T1-02, T1-10, T1-11, T2-10, T2-12
slope, T2-16, T1-17, T1-27, T2-03).** A single exported decision seam
(`blockingConflicts` — capabilityBlockReason's decision logic extracted;
raw `demandConflicts` remains the explanation layer) and every bypass
path rerouted: both divisionDiff raw paths, ExerciseDetail "Similar
exercises", plan reactivation, block review (senior question asked;
reviewed verdict no longer outranks the slot verdict for capability),
block slope over capability-eligible sets, widget/partner denominators
via the effective stats helper, Today's card count effective, custom
exercises through the UNKNOWN policy with an honest receipt, substitutes
never inheriting the excluded row's load prescription. A source-level
regression guard (repo convention) pins the door: no new
rankSwaps/raw-library call sites on suggestion surfaces.

**CC33-R3 — One failure posture (closes T2-09, T2-19, T1-21, T1-22,
T1-09).** Capability read failure: generation-class surfaces HOLD
(existing posture, now universal — starter, travel, dry-run included;
the starter never falls back to the unfiltered recommendation);
serve/swap-class surfaces serve the base document and say, in capability
vocabulary, "Volyume could not check how you train just now, so nothing
is filtered here" (wrong-lane message retired); the coach Apply hold
re-check failure WITHHOLDS the volume increase for that run with a calm
line, never applies body-wide. blockAdvisor adopts planAutoGen's
fail-safe read (T1-09). No user-facing distinction between stale and
unavailable — one honest state: "could not check right now" (UNVERIFIED
3 disposition).

**CC33-R4 — The user's word (closes T2-02, T2-04, T2-11, T2-17, T2-18,
T2-23, T2-05, T1-05, T1-06).** Allowances honoured at all seven blind
consumers via the R2 seam (clinician carve preserved: an allowance never
carves a clinician conflict). Manual adds are never substituted (serve
view skips user-added rows; the blank-session re-fire is closed).
"Work around this" actually captures: it passes the exercise and its
driving demand as preselect, creates the episode draft in one step, and
does not orphan the swap sheet. The Apply/Decline diff gains per-line
control (§14 as specified) and a standing "Your plan and how you train"
row on HowYouTrain to revisit any choice (undecided episodes surface
there rather than serving conflicted rows in silence forever). The
proposal preview computes real outcomes (substitute found vs omitted) —
never promises a swap it has not found. Flare restarts and synced-in
rules re-propose through the same surface (T1-05, T1-06). Check-in
"Fine" records a confirmation that steadies the week's framing (T2-17),
and every scope phrase is built from the rule's own stated subject,
never from derived muscle lists presented as the user's words (T2-18).

**CC33-R5 — The quiet visibility layer, built (closes T2-07, T2-32,
T2-08, T2-06, T1-16, T2-22, T1-14/T2-31, T1-15/T2-24, T1-12, T1-13,
T1-23, T1-07, T2-20/T1-24, T2-25 copy).** One-line, calm, CAP-18-clean:
post-workout quiet line naming what was worked around, linking to How
you train; plan-view markers on conflicted/substituted slots; why-this
gains its capability line ("Built around how you train"); swap sheets
state their narrowing ("{n} movements left out for how you train",
with the honest empty state); session-level "unusually reduced" signal;
a "What changed" history surface rendering the effects record; the Home
line no longer suppressed by the default headline; the AWAITING prompt
on Today; blocked-slot counts surfaced on all six generation entries,
with the total-block case explained as a state, not an engine failure,
offering the graded paths (adjust rules / family plan / smaller
division); travel-mode drops named; the receipt/commit contradiction
fixed so "kept" is only said of slots actually written; per-side carves
named in one line; reintroduction gets a durable line in coach output
and plan view during ramp weeks.

**CC33-R6 — One vocabulary, correct standing (closes T2-33, T1-19,
T1-08, T1-20, T1-26, T1-04, T2-28, stale comments).** A capability copy
sweep: "set aside" and every preference verb leave capability surfaces;
capability rules speak as "out for now / works around / while it lasts"
(episode) and "how you train" (baseline); planRationale explains
capability exclusions as capability. The lanes cross-reference in both
directions (§12). Clinician standing becomes uniform: distinct at
generation receipts and block review; the diff decline for a
clinician-sourced rule requires a named confirm ("You told Volyume a
clinician asked you to keep this out...") — agency preserved, silence
removed. Capability-caused swaps carry cause='constraint' from every
surface including install-time (and "Work around this" pre-rule swaps),
so the preference engine stops learning from inability. The stale
migration comments are corrected to the applied record.

**CC33-R7 — Coaching tells the truth about constrained weeks (closes
T2-12, T2-13, T2-14, T2-15, T2-17, T2-18; composes with R1d).**
CONSTRAINED becomes reachable on both drivers: execution POOR, or
in-scope regression (slope over eligible sets; regressing muscles
overlapping the active scope). Effects records gain 'substituted'
entries (serve-time and completion — computeCompletionEffects finally
matches its own JSDoc), and the limiter gate counts reshaped sessions
(any effect), not omissions only. coachStory gains the CONSTRAINED
branch, the constraint_active HOLD_COPY key, and whatWeWatchNext copy.
The <50% adherence gate defers to CONSTRAINED when the shortfall is
excused by effects records — a user whose restriction cost them sessions
is never told to "get back to your full plan".

**CC33-R8 — §25 suspension, built (closes T2-26).** Per-episode
`adaptation_mode`: 'propose' (default) | 'hold'. Hold means: no
serve-time substitution, no diff proposals, no coach holds, no excusal
from this episode — the plan is genuinely held; HowYouTrain shows
"Volyume is holding your plan as-is for this. Adaptation is paused, not
your training." Suggestion filtering REMAINS for clinician-sourced rules
under hold (the app still never proposes against clinician word);
self-declared rules under hold also keep picker warnings (informational)
but stop all automatic action. Additive local migration + cloud
`migrate_152_capability_adaptation_mode.sql` written in S4 (additive,
idempotent, header per schema law; applied only on the founder's exact
phrase; sync fail-soft tolerated mode until then, the established
pattern).

## 3. Residual dispositions (recorded, not parked)

- **§20 neverClaim "wired or retired" (T2 UNVERIFIED 4): RETIRED as a
  runtime gate, RULED SUFFICIENT as invariant-suite pinning.** The copy
  set is closed and deterministic; new strings enter at CI, which is
  where the pin fires. A runtime filter would guard against strings that
  cannot arise at runtime.
- **§23.4 RI window (T2-25 residual): the no-window ruling stands**
  (reintroduction.js:16-19 rationale accepted), with the one real gap
  closed in W2: an episode ending near a block boundary stamps the next
  block's overlap weeks constrained at ledger grain, so the first
  sessions back are not learning-eligible.
- **stale vs unavailable (T2 UNVERIFIED 3):** one user-facing state (R3).
- **T2-27 session length:** the HowYouTrain row stops over-claiming; its
  copy states plainly that session length shapes the NEXT plan build,
  and the PlanUpdate preview names it when it did. Wiring session length
  into live serving is ruled OUT (it would rewrite prescriptions outside
  any proposal — against the §14 control model).
- **T2-30 sync arrival:** HomeScreen's constraint effect re-reads on
  focus; mid-session arrivals stay un-applied by design (logged work is
  never re-evaluated) — the post-workout line (R5) covers the next
  session.
- **T2-04 reachability (UNVERIFIED 2):** fixed in W1 regardless of
  frequency; mechanism-level defect.

## 4. What does not change

The engine core (ontology, resolver internals, eligibility semantics,
AWAITING fail-safe, learning shield); "How you train" name and Settings
home (RT2-2); FD-1 free-tier scope; the Article 9 consent lane; the
notifications lane (T2-29 clean — and it stays clean because in-session
notifications read the served row); GC-D10 statelessness (adaptation_mode
is episode state, not identity); ED-safety systems (untouched; coaching
copy changes reviewed against calm-voice law); product IDs, billing,
tier gating (untouched).

## 5. Success criteria (the founder's bar, made testable)

1. Findable: capability presence at every moment of need — Home line,
   in-workout capture, post-workout line, coach output, plan view — each
   reachable in ≤1 tap from where the need shows.
2. Understandable: one vocabulary per lane; every automatic action
   carries its one-line why; the Apply preview never over-promises.
3. Usable: per-line control; every choice revisitable; capture flows
   pre-filled; no dead answers.
4. Explanatory: every stored effect renderable somewhere a user looks;
   every receipt true.
5. Integrated: zero raw-library suggestion paths; one failure posture;
   allowances and manual adds honoured everywhere; CONSTRAINED reachable
   on both drivers; promotion lossless.
6. Honest: REAL-DISABLED-USER-VALIDATED stays NO until real users
   validate; no marketing claim moves without the matrix.

## 6. S4 build waves

Two agents at a time; every diff lead-reviewed; lint + suite at every
landing; merge to main continually; recovery paths per the board. Lead
lane = engine/safety-adjacent, hands-on.

- **W1 (lead, hands-on) — the honour core:** R1a/b/c (baseline rewrite
  proposal, promotion transaction, ceilings + §15 line), R4 allowance
  seam (`blockingConflicts` extraction + 7 consumers), T2-04 manual-add
  respect, R3 posture unification (T2-19 withhold, T2-09 honest
  fail-open copy, T1-22/T1-21 starter+travel+dry-run holds, T1-09),
  T2-03 prescription rebuild.
- **W2 (lead) — coaching truth:** R7 complete (T2-12/13/14/15/17/18),
  R1d baseline coaching scope, T1-07 receipt honesty, T2-25
  block-boundary stamp, T1-25 verification against real reduced targets.
- **W3 (Sonnet ×2, specs from this doc, lead review) — visibility
  surfaces:** R5 list (T2-07 summary line, T2-32 plan markers, T2-08
  narrowing counts, T2-06 reduced signal, T1-16 why-this line, T2-22
  history surface, T1-14/T2-31 Home line, T1-15 Today AWAITING, T1-12
  blocked-slot reveal, T1-13 graded total-block state, T1-17 effective
  Today count, T1-23 travel naming, T2-16 denominators, T2-20/T1-24
  laterality lines).
- **W4 (Sonnet ×2, lead review) — flows + vocabulary:** R4 flows (T2-11
  capture, T2-23 per-line + revisit surface, T2-05 honest preview,
  T1-05/T1-06 re-propose), R6 sweep (T2-33/T1-19/T1-08 vocabulary,
  T1-20 cross-references, T1-26/T1-04 clinician standing, T2-28
  provenance, stale comments, T2-27 honest copy, T2-30 focus re-read).
- **W5 (lead) — resolver door + suspension:** R2 reroutes (T1-02, T2-10,
  T1-11, T1-10, T1-27) + the source-level regression guards; R8
  suspension (schema, migrate_152 written, consumers, copy).
- **S5 gate:** full suite + lint over the settled tree; device checklist
  (physical Android, EAS) covering: baseline-rule-meets-existing-plan
  proposal, promotion preview, allowance honoured in session, capture
  flow, constrained-week coach output, widget denominator; board +
  handover close-out; truth fields re-checked.

Invariant tests accompany every wave (repo convention: written to FAIL
against the real engine), including new pins for: promotion never
reverts a substituted slot silently; allowances honoured at every
consumer; capability apply-path never fails open; no suggestion surface
reads the raw library; the Apply preview's counts match the real
substitute search.
