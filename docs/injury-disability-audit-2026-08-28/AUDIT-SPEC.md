# CC33 AUDIT SPEC — end-to-end honour/visibility/explanation trace

Founder order (chat, 2026-08-28, second directive, verbatim intent): do not
limit the review to configuration screens. Trace the complete end-to-end
behaviour of every disability, long-term restriction and temporary injury
setting through plan generation, existing-plan handling, exercise selection,
swaps, active workouts, coaching, block transitions and future plan
generation. Identify places where the setting is technically stored but the
user cannot SEE its effect, cannot UNDERSTAND its effect, or where downstream
code does not HONOUR it consistently. AUDIT FIRST, redesign after. Target: one
coherent capability, not a collection of settings.

## The matrix

ROWS — every setting kind a user can hold (from ARCHITECTURE §5/§8/§22-24 and
the shipped tree; the trace verifies each against the tree, not the docs):

  R1  Baseline demand rule, one row per axis in the shipped ontology
      (position, floor_access, overhead_position, grip_demand,
      unilateral_loadable, bilateral_upper, bilateral_lower, axial_load,
      impact, balance_demand, weight_bearing_hands)
  R2  Episode (temporary) demand rule — with end date; without end date
  R3  Family avoid rule
  R4  Exercise avoid rule
  R5  Exercise allow rule (exception)
  R6  Laterality / per-side (one arm / one leg, side picker, per-side serve)
  R7  clinician_reported flag (+ optional end date)
  R8  Session-length / energy levers (§33.12)
  R9  Episode suspension ("just hold my plan")
  R10 Lifecycle states: expired-unconfirmed episode; promotion temporary→
      durable (§24); reintroduction (§23); "start again" flare re-start
  R11 CONTRAST LANE (must stay structurally separate, CAP-4): Avoided
      movements preference — traced only for coherence (does the user ever
      see both lanes and understand the difference?)

COLUMNS — the founder's eight lifecycle stages:

  A  Plan generation (fresh: free starter pick, library install, Pro
     generation, family plans)
  B  Existing-plan handling (episode created over an installed plan: §14
     propose/apply/decline diff; equipment-change interplay)
  C  Exercise selection (eligibility resolver, pickers, pool generation,
     library browse compatibility, custom exercises)
  D  Swaps (EVERY swap surface; swap cause provenance; suggestions offered)
  E  Active workout (serve-time substitution, per-side logging, senior
     question, in-session "can't do this" capture, rest/cue surfaces)
  F  Coaching (weekly coach limiters + notes, check-in conditional
     questions, coach apply/decline, adherence denominators)
  G  Block transitions (deload, block seed, adaptive mesocycle, learning
     eligibility / contamination shield through a transition)
  H  Future plan generation (next block, regeneration, re-install; does a
     setting authored months ago still bind?)

## Per-cell classification (all three, independently)

  HONOURED    downstream code consumes the setting correctly on THIS path.
              Evidence: the consumption call, file:line, and what happens
              when the rule blocks/modifies. "Consumed by a shared helper"
              counts only if THIS path actually calls the helper — cite the
              call site on this path, not the helper.
  VISIBLE     the user can SEE the effect at this stage (a substitution
              badge, a blocked-slot notice, a narrowed list with a count, a
              coach note...). Evidence: the rendering site, file:line, and
              the verbatim copy.
  EXPLAINED   the user can UNDERSTAND the effect — the surface names THEIR
              declared restriction as the reason, in their own terms.
              Evidence: verbatim copy. "Adjusted" with no reason = NOT
              EXPLAINED.

Empty cells are findings, not blanks: state which of the three is missing and
why you conclude it is missing (searched-and-absent beats not-found; name
what you searched).

## Finding classes and severity

  S1  NOT HONOURED — a path can serve/select/keep an exercise the user's
      active rule excludes, or apply load semantics that ignore a rule.
  S2  INCONSISTENTLY HONOURED — honoured on one path, not on a sibling path
      (the historical equipment failure mode: continuity path fixed, three
      swap surfaces never passed it).
  S3  STORED BUT INVISIBLE — the effect exists but no surface shows it at
      that stage.
  S4  VISIBLE BUT UNEXPLAINED — the user sees a change but nothing names
      their restriction as the cause.
  S5  INCOHERENT — the same concept is named, phrased or behaves differently
      across surfaces; or the two lanes (capability vs preference) blur.

Every finding: id (T1-nn / T2-nn), severity, cell (row × column), evidence
(file:line + verbatim copy where copy is the evidence), and the concrete user
consequence in one sentence. No recommendations — the lead designs from this.

## Evidence rules (EVIDENCE BEFORE ASSERTION, CLAUDE.md §4)

- Read to the end of the mechanism: a constant or a stored row is not
  behaviour; cite the consumer.
- An ordering/nullable check is not proof of honour — trace what happens on
  the excluded branch.
- Never assert "all paths" from one path. Enumerate the paths first, then
  close each.
- Tests count as evidence of intent, not of behaviour; cite code.
- Mark anything unverifiable as UNVERIFIED with the exact blocking question.
