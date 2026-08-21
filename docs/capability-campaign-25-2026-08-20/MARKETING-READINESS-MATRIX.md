# DISABILITY MARKETING READINESS MATRIX (CC32)

Truth pass 2026-08-21 (bundle 2; gap-closure statuses folded in same day). This matrix is the ONLY authority for
whether Volyume may make a direct disability/population support claim.
Codes: YES / NO / PARTIAL. **MARKETING READY converts to YES only when
every gate column on the row is YES** - implementation alone NEVER
converts it (bundle order section 21; CLAIMS-STANDARDS stays senior for
wording). Internal statuses below were advanced only where a shipped,
tested mechanism exists; everything external remains honestly pending.

Gate columns: IMPL = capability mechanisms implemented and gated;
CONTENT = exercise/routine coverage for the profile; A11Y =
capability-path accessibility complete for the profile's access needs;
DOSSIER = evidence dossier where the population layer requires one
(CC-F3); EXPERT = clinical/expert review complete (CC-F6); USERVAL =
real disabled-user validation round complete (CC-F5).

| Profile | IMPL | CONTENT | A11Y | DOSSIER | EXPERT | USERVAL | MARKETING READY |
|---|---|---|---|---|---|---|---|
| Wheelchair / seated training | YES | PARTIAL (4 seated families incl. home + experienced tiers; computed compat; directory profiles) | PARTIAL (feature path done; device walk pending) | PARTIAL (SCI dossier built) | NO | NO | **NO** |
| Unilateral upper limb | YES | PARTIAL (One-Arm Upper Builder + laterality carving) | PARTIAL | NO | NO | NO | **NO** |
| Unilateral lower limb | YES | PARTIAL (One-Leg Lower Builder) | PARTIAL | NO | NO | NO | **NO** |
| Grip / dexterity limitation | YES | PARTIAL (Grip-Light Machine Circuit + Grip-Light Lower Builder; adapted-setup strap guidance; PULLING plan stays out by the no-fake-compatibility law, GC-D7) | PARTIAL | NO | NO | NO | **NO** |
| No-floor / no-standing mix | YES | PARTIAL (No-Floor Full Body, Steady-Base) | PARTIAL | NO | NO | NO | **NO** |
| Chronic / fluctuating capability | YES (episodes, flare re-start, 33.12 levers) | PARTIAL | PARTIAL | NO | NO | NO | **NO** |
| Multi-constraint users | YES (rules compose; Q3 fixture) | PARTIAL (compatible pool narrows honestly) | PARTIAL | NO | NO | NO | **NO** |
| Visual accessibility (screen reader) | PARTIAL (labels/announcements on capability path; full-app audit out of scope) | n/a | PARTIAL | n/a | NO | NO | **NO** |
| Motor/dexterity accessibility (touch) | PARTIAL (targets/alternatives on core path) | n/a | PARTIAL | n/a | NO | NO | **NO** |
| Hearing accessibility | PARTIAL (timer cues redundant: visual+haptic+sound) | n/a | PARTIAL | n/a | NO | NO | **NO** |
| Population-labelled content (SCI, MS, ...) | PARTIAL (knowledge directory + question selection built; condition-NAMED collections withheld pending LEG-23 + CLIN-5, GC-D5) | PARTIAL (40 directory profiles, cited education) | PARTIAL | PARTIAL (SCI, MS, Parkinson's dossiers built) | NO | NO | **NO** |

What converts each gate:
- CONTENT → YES: per-profile coverage bar met in the coverage registry
  (families + free-pool floor per profile), re-measured by
  `scripts/capability-coverage-registry.mjs`.
- A11Y → YES: the CC32 feature-path checks pass on a PHYSICAL device
  (PHYSICAL-VALIDATION-BACKLOG journey F) - never from code review
  alone.
- DOSSIER → YES: the CC-F3 evidence dossier for that population,
  founder-commissioned.
- EXPERT → YES: CC-F6 clinical review returns on the CLIN register
  items touching the profile.
- USERVAL → YES: a CC-F5 validation round with participants from that
  cohort completes with zero open release-blockers
  (VALIDATION-PACKAGE.md defines cohorts, tasks and blocker severity).

## Status ladder (gap-closure order section 27)

Separate truth states, never conflated; a row's honest position today:

| Status | Meaning | Position today (all rows) |
|---|---|---|
| ENGINE SUPPORTED | mechanisms implemented and gated | YES (every capability row) |
| CONTENT SUPPORTED | routine/directory/setup content exists | YES for capability-led rows; PARTIAL for population-labelled (labels withheld) |
| RESEARCH SUPPORTED | authoritative evidence banked and cited | YES (R1-R8 + live-verified citations) |
| AUTOMATED TESTED | deterministic suites prove behaviour | YES (contamination replay, coach, adherence, family oracle, directory + scenario suites) |
| DEVICE TESTED | physical-device journeys walked | NO (journeys A-H pending; founder action) |
| EXPERT REVIEWED | CLIN register returned | NO (founder action) |
| USER VALIDATED | CC-F5 cohort round complete | NO - REAL-DISABLED-USER-VALIDATED = NO everywhere (order section 14 truth field) |
| MARKETING READY | every gate on the row YES | NO everywhere |

Standing laws this matrix cannot override: no medical claims of any
kind regardless of readiness (R2 wording lists, enforced by
libraryWordingSweep and the claims guard); "normal is personal" framing
in every claim; no condition-NAMED collections before LEG-23 + CLIN-5
(GC-D5); readiness never unlocks medical language.
