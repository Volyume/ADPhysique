# CLINICAL REVIEW PACK (CC-F6) — CC32

The exact questions for the clinical reviewer, with the shipped
behaviour each answer gates. Status: PREPARED, ENGAGEMENT PENDING
(founder-external). Until answers arrive, every listed behaviour stays
at its shipped conservative form; nothing below blocks current use.

## Reviewer brief

Volyume is a deterministic training app (no AI coaching). It never
diagnoses, never claims treatment, and treats a user's declared way of
training as normal. The questions are about whether our CONSERVATIVE
deterministic behaviours are appropriately conservative - not about
adding clinical features.

## Questions (each maps to a register item)

CLIN-1 (CC-C2, section 19): the weekly conditional answer is limited to
  hold-vs-suggest-review; we deliberately do NOT model deterioration
  ladders. Confirm the asymmetry (never auto-escalate, never
  auto-relax) is the right lay boundary.
CLIN-2 (CC-C3, section 23): reintroduction ships as: instant
  eligibility restore + conservative load resolution (stale-history
  gates, no percentages) + a volume ramp back to the pre-episode plan
  across remaining weeks + no durable learning until the window closes.
  Symptom-checked "controlled experiment" reintroduction was DEFERRED
  to you. Review the shipped subset for harm vectors.
CLIN-3 (sections 15/20): under an active episode the coach withholds
  volume adds for affected muscles and never converts constrained weeks
  into adherence blame. Are there populations where HOLDING volume is
  itself a risk we should name (not model - name in copy)?
CLIN-4 (ontology, section 8): the ten demand axes (position, floor
  access, overhead, grip, unilateral loadability, bilateral upper/
  lower, axial load, impact, balance) as the functional vocabulary -
  any axis whose absence creates a foreseeable-misuse risk?
CLIN-5..7 (deferred features register): pacing/energy-envelope
  coaching for chronic fatigue populations (33.12 ships levers only:
  session length, days, episodes). Confirm the levers-only boundary.
CLIN-8: the ED-safety interplay - capability episodes suppress
  nothing in the ED-safety system (floors, gates and signposting are
  senior everywhere, tier-blind and episode-blind). Sanity-check for
  interaction cases we have not considered.
CLIN-9 (CC-C1, R3 CR-8): the episode state machine's honest states
  (active/awaiting/ended + promotion) with fail-safe
  awaiting-confirmation. Confirm no state implies recovery staging.

## Materials

- ARCHITECTURE.md sections 7, 15, 19-24, 25 (safety boundary), 33.
- src/lib/capability/* (pure modules; reviewer-readable headers).
- The section 7 learning-eligibility matrix (the contamination shield).
- CLAIMS-STANDARDS.md 9A + MARKETING-READINESS-MATRIX.md (what we say).
- R3-training-science.md (the evidence base we relied on).

## What each answer unlocks

EXPERT=YES on MARKETING-READINESS-MATRIX rows (with the other gates);
release of the deferred behaviours ONLY via a new founder-approved
campaign - a clinical yes alone changes no code.
