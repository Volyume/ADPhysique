# DISABLED-USER VALIDATION PACKAGE (CC-F5, round 1) — CC32

Founder-ready. Everything here can be run without further build work;
recruitment and sessions are founder/external actions. Statuses this
round unlocks are listed at the end. Nothing in this document is a
claim; claims stay governed by MARKETING-READINESS-MATRIX.md.

## 1. Target cohorts (8-12 participants total; ≥1 per cohort A-G)

A. Wheelchair user / seated-only training
B. Unilateral upper-limb (congenital or acquired; include at least one
   EXPERIENCED adaptive strength athlete, not only beginners)
C. Unilateral lower-limb
D. Grip/dexterity limitation (e.g. reduced hand function, one-hand grip)
E. No-floor/no-standing mix (e.g. cannot get to/from the floor safely)
F. Chronic/fluctuating condition (energy-limited; good and bad weeks)
G. Multi-constraint (any two or more of the above)
H. Access-needs overlay (recruit within A-G where possible): screen
   reader user; motor/touch-precision needs; deaf or hard-of-hearing.

Recruitment principles: experienced adaptive lifters as well as
beginners (experienced users find second-class-experience failures
beginners cannot); functional capability is sufficient - NEVER require
diagnosis disclosure; paid for their time; UK-based preferred (copy and
Beat signposting are UK-tuned).

## 2. Recruitment wording (draft, founder voice-checks before use)

"Volyume is a training app built so that how YOU train is treated as
normal - seated, one-sided, without certain movements, or around a
temporary limitation. We are looking for people who train (or want to
train) with a disability or long-term condition to try it and tell us
plainly where it fails you. One 45-60 minute session, your usual
phone, paid. You never need to share a diagnosis - only what training
looks like for you."

Inclusion criteria: 18+; trains or intends to train with resistance
exercise; self-describes a lasting way their training differs from an
unrestricted template (cohorts above); own Android phone (round 1 is
the Play build). Exclusion: currently advised by a clinician not to
exercise.

## 3. Build requirements

- Current main, EAS production-channel build (no dev menu).
- Capability features ON as shipped (free tier is sufficient for
  journeys 1-5; one Pro test account for the coach journey).
- Session recorded only with explicit consent; notes otherwise.

## 4. Session script (45-60 min, tasks not tour)

Warm-up (5 min): how do you train today; what does a good app do badly.
Tasks (verbalise throughout; facilitator never rescues before a fail is
noted):
 T1 Fresh install → free onboarding → "set up how you train" → first
    plan. PASS: reaches a plan they say they could actually run,
    without help.
 T2 Open the plan library → find a plan that fits → read why one
    does not. PASS: can name what "n to swap" means unprompted.
 T3 Start a workout → hit an exercise that does not fit → work around
    it in-app. PASS: finds swap/work-around without leaving flow.
 T4 Create their own exercise (something they actually do) → confirm it
    appears in suggestions where compatible. PASS: no dead end;
    answers the demand questions without confusion or discomfort.
 T5 Declare a TEMPORARY limitation (episode) → see the plan's
    proposed changes → apply → later end it. Then adjust one BASELINE
    rule in How you train (the amendment's "capability update" task).
    PASS: understands what applied/declined mean; nothing feels like
    a medical judgement; the baseline change is findable unprompted.
 T6 (H overlay) Complete T1+T3 with their assistive setup (screen
    reader / switch / display scaling). PASS: no blocker requiring
    sighted/precise-touch help.
 T7 (Pro account) Read the weekly coach after a restricted week.
    PASS: the user says it does NOT read as blame or a health verdict.
Cool-down (10 min): the two-question dignity check - "Did anything in
the app make your way of training feel like a special case?" and
"Would you trust this app to coach you? Why not?"; then severity walk
of everything noted.

## 5. Measurable failure definitions + severity

- S1 BLOCKER: task cannot be completed without facilitator help, or
  any content the participant reads as medical judgement/diagnosis, or
  an accessibility dead end (no operable path).
- S2 MAJOR: completed but with wrong understanding, distress, or a
  workaround the participant calls unacceptable.
- S3 MINOR: friction, wording, or layout the participant flags but
  works past.
- DIGNITY FLAG (records alongside severity): anything that "others"
  the participant - counted separately because it gates messaging even
  when the task passes.

## 6. Release blockers and retest

- Any S1 for the journeys a claim depends on blocks that claim's
  USERVAL gate. S1s are fixed and RETESTED with at least one
  participant from the same cohort before the gate turns YES.
- ≥2 S2 in one journey = treat as S1 for gating.
- Round passes for a cohort when: all tasks pass for that cohort's
  participants, zero open S1, and no unresolved dignity flag.

## 7. Feedback capture format

One row per observation: {cohort, task, severity, dignityFlag, verbatim
quote, screen, what-the-user-expected}. No diagnosis, no health
details beyond the participant's own chosen words; store in the
campaign folder, never in analytics.

## 8. Coverage-matrix update rules

After the round: update MARKETING-READINESS-MATRIX.md USERVAL per
cohort (YES only per §6); attach the observation log path; move every
S1/S2 into the defect ledger with the cohort tag. No other status may
be advanced from validation data.

## 9. What this round unlocks

USERVAL=YES for passing cohorts only. MARKETING READY additionally
needs DOSSIER (CC-F3, populations only), EXPERT (CC-F6) and the A11Y
device walk - see the matrix. Round 1 validates the FUNCTIONAL
profiles; population-labelled claims stay NO regardless of outcome.
