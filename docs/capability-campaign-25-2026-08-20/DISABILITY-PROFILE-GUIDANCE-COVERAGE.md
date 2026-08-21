# DISABILITY PROFILE GUIDANCE — COVERAGE AND ACCOUNTING

Founder order 2026-08-21 (surface the hidden user value), from main
`a4ee8fb`. 79 strings across the 20 condition profiles in
`src/lib/capability/directory/conditions.js` were written, cited and
schema-validated but never rendered by
`src/screens/TrainingConsiderationsScreen.js`. This file accounts for
every one.

Field totals as dumped from live source: fatigueNote 7, lateralityNote
10, accessibilityConsiderations 15, individual 21, clinicianConfirm 26
= **79**.

## Classification key

- **A** USER-VALUE, renders (wording kept or lightly tidied)
- **B** DUPLICATE of copy already on the same page (`variability`,
  `setupConsiderations`, the question's own `whyAsked`)
- **C** INTERNAL product/evidence note, stays hidden
- **D** SAFETY / SCOPE BOUNDARY or inaccurate as written, rewritten
  before rendering
- **E** NOT APPROPRIATE to surface (clinical framing without product
  value)

## THE TRUTH DEFECT FOUND DURING THE AUDIT (blocking, resolved)

All ten `lateralityNote` strings promised a UI affordance that **does
not exist**: "the side picker on each answer covers it" / "every answer
takes a side". Verified against source: the How you train add flow's
draft has no laterality field at all (`HowYouTrainScreen.js` draft
shape is `role, kind, axes, families, exercises, clinician, startDays,
endDays`), and `writeDraft`'s row `base` never sets one, so every rule
created through the UI stores `laterality = null`. The only write of
that column is the flare re-start copying an old row forward
(`h.laterality ?? null`). The model, the CHECK constraint and the
resolver's `SIDE_CARVEABLE` path all support sides; **the interface
never sets one**.

Rendering those lines verbatim would have shipped a false promise to
disabled users, against §5's "only say what the actual logger and
programming supports". They are therefore **D**, rewritten to the
one-sided support that is real and verified:

1. The `bilateral_upper` / `bilateral_lower` demand axes ("Using both
   arms together" / "Using both legs together"). Setting one aside
   makes Volyume plan one-sided movements. Real, shipped, and already
   what `qOneArm` / `qOneLeg` write.
2. Per-exercise rules and per-exercise allowances.
3. Per-side logging (`src/lib/unilateral.js`): a real two-phase flow -
   side one, rest-class pause, side two - which records what each side
   did (breakdown in `notes` as "L 10 / R 9") and is a per-exercise
   preference the user confirms once.

Deliberately NOT claimed, because it is not true: per-side *rules*, and
per-side *targets*. A unilateral set prescribes the SAME reps both
sides by founder ruling (2026-07-11 device verdict: different targets
per side normalise training one side harder, ruled ED-adverse), and the
engine reads the lower side. The rewritten copy says only what ships.

## Accounting, profile by profile

Legend: `[FAT]` fatigueNote, `[LAT]` lateralityNote, `[ACC]`
accessibilityConsiderations, `[IND]` individual, `[CLI]`
clinicianConfirm. "Worth knowing" and "Using Volyume" are the two
rendered destinations; no field name is ever shown to a user.

### 1. Spinal cord injury (7)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 1 | [LAT] side picker claim | D | Worth knowing, rewritten to real one-sided support |
| 2 | [ACC] one-handed, from a chair | A | Using Volyume |
| 3 | [IND] which muscle groups work is personal | B | `variability` already opens the page with this |
| 4 | [IND] environment and temperature, discuss with specialist | E | Clinical framing, no product behaviour behind it |
| 5 | [CLI] which muscle groups (level and completeness) | C | Internal boundary; the questions already ask functionally |
| 6 | [CLI] specialist exercise-setting guidance | C | Internal; carried by the rendered professional note |
| 7 | [CLI] skin and pressure care | B | `setupConsiderations` already says to build position changes into rests |

### 2. Multiple sclerosis (5)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 8 | [FAT] energy varies, shorter week | D | Worth knowing, regrounded on what Volyume does |
| 9 | [LAT] side picker claim | D | Worth knowing, rewritten |
| 10 | [IND] how much, how often, heat | B | `variability` covers it |
| 11 | [CLI] MS team on exertion, heat, recovery | C | Internal |
| 12 | [CLI] training during and after a relapse | E | Would read as medical instruction |

### 3. Parkinson's (5)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 13 | [LAT] side picker claim | D | Worth knowing, rewritten |
| 14 | [ACC] larger touch targets, no fast tap | A | Using Volyume |
| 15 | [IND] time of day is yours | A | Merged into the profile's own timing setup line, which renders |
| 16 | [CLI] specialist on timing across the day | C | Internal |
| 17 | [CLI] balance and falls guidance | E | Clinical framing |

### 4. Cerebral palsy (5)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 18 | [FAT] movement costs more energy | D | Worth knowing, regrounded |
| 19 | [LAT] side picker claim | D | Worth knowing, rewritten |
| 20 | [ACC] "part of the standard app checks" | D | Using Volyume, process talk removed |
| 21 | [IND] no dose formula in the research | B | `variability` + evidence note |
| 22 | [CLI] stretch and positioning guidance | C | Internal |

### 5. Stroke and acquired brain injury (6)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 23 | [FAT] invisible tiredness | D | Worth knowing, regrounded |
| 24 | [LAT] every answer takes a side | D | Worth knowing, rewritten |
| 25 | [ACC] plain wording, nothing timed | D | Using Volyume, "flow" removed |
| 26 | [IND] no standard dose after stroke | B | `variability` covers it |
| 27 | [CLI] blood pressure and exertion | E | Medical instruction |
| 28 | [CLI] balance and falls | E | Medical instruction |

### 6. Upper limb difference (4)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 29 | [LAT] every answer takes a side | D | Worth knowing, rewritten |
| 30 | [ACC] whole app one-handed incl. mid-set | A | Using Volyume |
| 31 | [IND] "allowances exist for exactly that" | D | Merged into setup lines (renders); internal term replaced |
| 32 | [CLI] residual limb and interface load | E | Prosthetic advice, explicitly out of scope |

### 7. Lower limb difference (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 33 | [LAT] every answer takes a side | D | Worth knowing, rewritten |
| 34 | [IND] socket comfort, prosthetist's territory | E | Clinical territory |
| 35 | [CLI] residual limb load and volume | E | Prosthetic advice |

### 8. Spina bifida (4)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 36 | [ACC] one-handed from a chair | A | Using Volyume |
| 37 | [IND] level and aids make the split personal | B | `variability` covers it |
| 38 | [CLI] spine loading and shunts | E | Medical instruction |
| 39 | [CLI] skin and pressure care | B | `setupConsiderations` already says it |

### 9. Muscular dystrophy and neuromuscular (6)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 40 | [FAT] "the intended shape", "shortfall" | D | Worth knowing, rewritten per §3 |
| 41 | [ACC] "standard app checks" | D | Using Volyume, process talk removed |
| 42 | [IND] the type matters enormously | B | `variability` says exactly this |
| 43 | [CLI] whether training suits your type and stage | E | Reads as needing clearance to use the app |
| 44 | [CLI] effort ceilings and lowering phase | C | Internal boundary (`setupConsiderations` carries the usable half) |
| 45 | [CLI] heart and breathing monitoring | E | Medical instruction |

### 10. Osteoarthritis (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 46 | [LAT] side picker claim | D | Worth knowing, rewritten |
| 47 | [IND] "per-exercise choices and allowances" | B | `variability` and the profile's own fourth question already say it |
| 48 | [CLI] specific joints or planned procedures | E | Clinical framing |

### 11. Rheumatoid and inflammatory arthritis (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 49 | [FAT] tiredness, "research links better energy" | D | Worth knowing; the benefit claim is dropped, the training context kept |
| 50 | [IND] "temporary changes and allowances carry it" | B | `variability` and the rough-weeks setup line already say it |
| 51 | [CLI] rheumatology team on active periods | C | Internal |

### 12. Hypermobility and hypermobile EDS (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 52 | [FAT] tiredness and dizziness | D | Worth knowing; the dizziness clause drops (clinical), the tool stays |
| 53 | [IND] support, load, progression vary | B | `variability` covers it |
| 54 | [CLI] positions to keep out, how to progress | C | Internal; the professional note carries the actionable half |

### 13. Balance and stability conditions (2)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 55 | [IND] varies day to day, temporary changes | A | Merged into setup lines (renders) |
| 56 | [CLI] positions or head movements to keep out | C | Internal; professional note carries it |

### 14. Grip, hand and dexterity differences (4)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 57 | [LAT] every answer takes a side | D | Worth knowing, rewritten |
| 58 | [ACC] one-handed, generous touch targets | A | Using Volyume |
| 59 | [IND] "allowances exist for exactly that" | D | Merged into setup lines (renders); internal term replaced |
| 60 | [CLI] hand or wrist load guidance | C | Internal |

### 15. Tremor and dystonia (5)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 61 | [FAT] steadiness drops, ending early | D | Worth knowing, regrounded on what is logged |
| 62 | [LAT] side picker claim | D | Worth knowing, rewritten |
| 63 | [ACC] no precision taps | A | Using Volyume |
| 64 | [IND] "the right grain" | D | Merged into setup lines (renders); jargon replaced |
| 65 | [CLI] specialist on your pattern | C | Internal |

### 16. Visual impairment (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 66 | [ACC] "works fully with screen readers" | D | Using Volyume; the completeness claim is dropped per §6 |
| 67 | [ACC] timers announce and vibrate | D | Using Volyume, restated as verified behaviour |
| 68 | [IND] follows your device accessibility settings | A | Moved into Using Volyume (verified: system reduce-motion is honoured) |

### 17. Hearing impairment (2)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 69 | [ACC] "first-class channels" | D | Using Volyume, jargon replaced |
| 70 | [IND] whether balance is part of your picture | B | The profile's own question already says to answer only if it applies |

### 18. Learning disability (4)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 71 | [ACC] "standing app rules" | D | Using Volyume, process talk removed |
| 72 | [ACC] same flow every time | D | Using Volyume, "flow" removed |
| 73 | [IND] supporter sets up once, plan repeats | B | `setupConsiderations` already says both halves |
| 74 | [CLI] heart or joint checks before new exercise | E | Reads as needing clearance to use the app |

### 19. Dwarfism and short stature (2)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 75 | [IND] spine and joint considerations | E | Clinical framing |
| 76 | [CLI] spinal loading, deep flexion, overhead | C | Internal; the profile's own questions ask this functionally |

### 20. Wheelchair users (3)
| # | Field | Class | Destination / reason |
|---|---|---|---|
| 77 | [ACC] everything logs from the chair | A | Using Volyume |
| 78 | [IND] the reason for the chair changes everything | B | `variability` says exactly this |
| 79 | [CLI] shoulder guidance from a professional | C | Internal; `setupConsiderations` carries the usable half |

## Final accounting

| Class | Count | Outcome |
|---|---|---|
| A renders as written | 10 | Rendered |
| D rewritten, then renders | 28 | Rendered |
| **Total rendered** | **38** | Worth knowing, Using Volyume, or merged into a setup line |
| B duplicate of on-page copy | 14 | Not rendered; already said once, better, higher up |
| C internal product/evidence note | 13 | Stays hidden by design |
| E not appropriate to surface | 14 | Stays hidden by design |
| **Total** | **79** | Nothing dropped silently |

Counts are derived from the 79 numbered rows above rather than asserted
separately: 10 + 28 + 14 + 13 + 14 = 79, of which 38 render. Of those
38, six were `individual` lines whose product fact was merged into a
setup line or the app-support list rather than repeated as a new card
(§2's preference), and their original entries were removed from the
source so the point is made once rather than twice.

Every B, C and E string REMAINS in the source as the profile's internal
research record (they are part of the evidence trail the directory suite
validates); the classification governs rendering only.

## clinicianConfirm: the one thing that did reach the page

26 of the 79 are `clinicianConfirm`, and none renders as a list -
rendering "things to confirm with your clinician" would read as needing
medical clearance to use Volyume, which the founder's no-outside-party
law (GC-D12) forbids. Their shared product truth is instead carried by
the professional note ALREADY rendered on every profile, which gains the
actionable half it was missing:

> before: "Anything a clinician or specialist has told you comes first.
> Volyume builds around what you confirm and never overrides
> professional guidance."
> after: "Anything a clinician or specialist has told you comes first.
> If you have been told to keep a movement out, add it under How you
> train and say that a clinician asked for it. Volyume then works around
> it, and will not offer it back unless you change it yourself."

Verified true: `CONSTRAINT_SOURCE.CLINICIAN_REPORTED` exists, the add
flow asks "A clinician asked for this: yes/no", and CAP-7 blocks the
inline override for clinician-reported rules - the picker routes to How
you train instead.

## Architecture unchanged

No change to eligibility, learning, persistence, plan generation or the
GC-D1 statelessness law. Selecting a profile still stores nothing,
creates no rule, excludes no exercise and reaches neither coach nor
learning; the user's confirmed functional answers remain the only
behavioural input. This work renders existing strings and rewrites their
wording. Nothing else.
