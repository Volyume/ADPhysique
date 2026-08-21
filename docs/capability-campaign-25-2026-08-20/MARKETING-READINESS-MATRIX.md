# DISABILITY MARKETING READINESS MATRIX (CC32)

Truth pass 2026-08-21 (bundle 2; gap-closure statuses folded in; gate
structure corrected the same day under the founder's no-outside-party
law - GC-D12). This matrix is the ONLY authority for whether Volyume
may make a direct disability/population support claim. Codes:
YES / NO / PARTIAL.

**GATES (all internal or device-side): MARKETING READY converts to YES
only when IMPL, CONTENT and A11Y are YES on the row** - and A11Y
converts only on a passed physical-device walk, never from code review.
DOSSIER remains an internal evidence artefact required for any
population-NAMED claim. **EXPERT and USERVAL are TRUTH FIELDS, not
gates**: they record honestly whether external review or real
disabled-user validation has happened (both NO today), they are not
release dependencies, and no claim may ever SAY reviewed/tested unless
the matching field is YES. CLAIMS-STANDARDS stays senior for wording:
claims state what the product does, never population outcomes, never
endorsement, never "tested with" while USERVAL is NO.

Columns: IMPL = capability mechanisms implemented and gated; CONTENT =
exercise/routine coverage for the profile; A11Y = capability-path
accessibility complete for the profile's access needs (device-walked);
DOSSIER = evidence dossier (internal); EXPERT = external clinical
review happened (truth field); USERVAL = real disabled-user validation
happened (truth field).

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
| Population-labelled content (SCI, MS, ...) | YES for the ruled mechanism (knowledge directory + question selection is the sanctioned NAMED surface; plan collections stay capability-led as a FINAL product decision, GC-D12) | PARTIAL (40 directory profiles, cited education) | PARTIAL | PARTIAL (SCI, MS, Parkinson's dossiers built) | NO | NO | **NO** |

What converts each column (founder law 2026-08-21: every GATE is
internal or device-side; no professional or panel is a dependency):
- CONTENT → YES: per-profile coverage bar met in the coverage registry
  (families + free-pool floor per profile), re-measured by
  `scripts/capability-coverage-registry.mjs`.
- A11Y → YES: the CC32 feature-path checks pass on a PHYSICAL device
  (PHYSICAL-VALIDATION-BACKLOG journey F) - never from code review
  alone. Founder/device action, not an outside party.
- DOSSIER → YES: the internal evidence dossier exists for that
  population (three built; the template is the standard).
- EXPERT (truth field, not a gate) → YES only if an external clinical
  review actually happens someday; nothing waits on it, and no claim
  may imply it while NO.
- USERVAL (truth field, not a gate) → YES only if real disabled users
  actually validate the experience someday (VALIDATION-PACKAGE.md
  remains the how-to if ever wanted); nothing waits on it, recruitment
  is NOT a required action, and no claim may say or imply user-tested
  while NO.

## Amendment section 27 exact areas (reconciliation 2026-08-21)

The original amendment prescribes exactly these sixteen areas per
supported group. The seven columns above compress them; this table
keeps the exact vocabulary so nothing hides in the compression. Where
an area is uniform across groups by construction (the engine is
profile-blind, GC-D1), one status covers all rows; where it varies,
the varying column above is named.

| Area (amendment wording) | Status today |
|---|---|
| Onboarding | YES all groups (free capability step; functional questions; optional directory) |
| Plan generation | YES all groups (resolver inside generation; CAP-8 unknown-honest) |
| Free routines | Varies by group → CONTENT column (16 families; levels per registry) |
| Builder | YES all groups (compat, explanations, overrides per law) |
| Exercise coverage | Varies by group → registry per-profile muscle floors |
| Custom exercise fallback | YES all groups (34.1 parity incl. progression/PRs) |
| Logging | YES all groups (logged work counts as performed; no mirroring assumption) |
| Progression | YES all groups (tier-blind, capability-aware, no level cap by capability) |
| Learning | YES all groups (CC30 contamination shield; constrained weeks never teach) |
| Weekly coaching | YES all groups (CONSTRAINED limiter; no adherence blame) |
| Temporary limitation overlay | YES all groups (episodes stack over baseline; proven as set intersections) |
| Accessibility | PARTIAL → A11Y column (feature path code-verified; device walk pending) |
| Evidence dossier | Varies → DOSSIER column (SCI, MS, Parkinson's built; others per R5 verdicts) |
| Expert review | NO everywhere - truth field, not a gate or action (GC-D12) |
| Disabled-user validation | NO everywhere - truth field, not a gate or action; REAL-DISABLED-USER-VALIDATED = NO stays truthful |
| Marketing-safe | NO everywhere (converts on IMPL + CONTENT + device-walked A11Y + wording laws) |

## Representation (amendment section 12, standing record)

Before any campaign that markets directly to disabled communities:
imagery/examples must show a genuine range of users, must not always
centre an unrestricted body, and copy gets a dignity review; token
representation over an unvalidated product is prohibited. The product
gates above come first; this record exists so the requirement cannot
be lost when marketing work starts.

## Status ladder (gap-closure order section 27)

Separate truth states, never conflated; a row's honest position today:

| Status | Meaning | Position today (all rows) |
|---|---|---|
| ENGINE SUPPORTED | mechanisms implemented and gated | YES (every capability row) |
| CONTENT SUPPORTED | routine/directory/setup content exists | YES for capability-led rows; PARTIAL for population-labelled (labels withheld) |
| RESEARCH SUPPORTED | authoritative evidence banked and cited | YES (R1-R8 + live-verified citations) |
| AUTOMATED TESTED | deterministic suites prove behaviour | YES (contamination replay, coach, adherence, family oracle, directory + scenario suites) |
| DEVICE TESTED | physical-device journeys walked | NO (journeys A-H pending; founder action) |
| EXPERT REVIEWED | an external clinical review actually happened | NO - truth field only, never a gate or founder action (CLIN-1..9 resolved internally, see CLINICAL-REVIEW-PACK) |
| USER VALIDATED | real disabled users actually validated the experience | NO - truth field only, never a gate or founder action; REAL-DISABLED-USER-VALIDATED = NO stays recorded because it is true |
| MARKETING READY | IMPL + CONTENT + device-walked A11Y + wording laws on the row | NO everywhere (A11Y device walk pending) |

Standing laws this matrix cannot override: no medical claims of any
kind regardless of readiness (R2 wording lists, enforced by
libraryWordingSweep and the claims guard); "normal is personal" framing
in every claim; population-labelled ruling per GC-D12 (the directory is
the sanctioned named surface; plan collections stay capability-led as a
FINAL product decision, so no claim advertises condition-named
routines); no claim of expert review or user testing while the matching
truth field is NO; readiness never unlocks medical language.
