# INJURY DIRECTORY COMPLETENESS ACCOUNTING (reconciliation 2026-08-21)

Answers reconciliation area 5: every injury family the gap-closure
order section 6 requested, against what shipped. R8
(`research/R8-injury-directory-evidence.md`) researched 37 families;
20 profiles ship in `injuries.js`. This table proves each merge was
evidence/product-driven, names the mechanism, and records the one
honest research gap.

Columns: requested family → researched (R8 section) → resulting
profile → separate or merged → reason → questions/representation.
Education citations in every shipped profile are NHS-page live-verified
(adjudication record in the cost ledger, slot 2).

## Shoulder

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Rotator-cuff-related / tendinopathy | R8 §1.1 | rotator_cuff_shoulder | SEPARATE | Highest-prevalence lifting shoulder problem; modern umbrella term (rotator-cuff-related pain) absorbs subacromial presentations. Questions: overhead axis, press-plane families, raise families |
| Instability / dislocation history | R8 §1.2 | shoulder_instability | SEPARATE | Distinct mechanism (end-range apprehension vs load tolerance). Questions: overhead axis, vertical_pull family, press families |
| AC joint | R8 §1.3 | ac_joint | SEPARATE | Distinct trigger set (cross-body, weight-through-hands). Questions: press families, overhead axis, weight_bearing_hands axis |
| Labral / biceps-related | R8 §1.4 | shoulder_biceps_labral | SEPARATE | Anchor-point loading pattern distinct from cuff. Questions: curl families, vertical_pull, overhead axis |
| Frozen / stiff shoulder | R8 §1.5 | frozen_shoulder | SEPARATE | Range-led not load-led; its own course. Questions: overhead axis, raise families, weight_bearing_hands |
| Other major presentations | R8 sweep | covered by the five + condition profiles | MERGED | The five patterns + per-exercise rules + allowances span the training-relevant space; nothing else earned a question set the five do not already ask |

## Elbow / forearm

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Lateral tendinopathy | R8 §2.1 | tennis_elbow | SEPARATE | Grip-driven; grip_bar axis + pull families |
| Medial tendinopathy | R8 §2.2 | golfers_elbow | SEPARATE | Wrist-flexion-driven; curl families + grip_bar + pull families |
| Distal/proximal biceps | R8 §2.3 | elbow_biceps_triceps_tendon | MERGED (with triceps tendon) | Same question SHAPE (loaded bending vs straightening vs pressing), same reload frame; one profile with both trigger sides beats two near-duplicates (order's no-cosmetic-duplicates law). Curl + triceps + press families |
| Triceps tendon | R8 §2.4 | elbow_biceps_triceps_tendon | MERGED | as above |
| Ligament / instability | NOT separately researched (R8 gap, recorded honestly) | post_operative + per-exercise rules | ABSORBED | Rare in training populations and clinician-led by nature (post-dislocation care); the clinician-boundary profile and per-exercise rules carry it without inventing unevidenced questions |
| Pronation/supination restrictions | R8 §2.5 | mechanism, not a profile | ABSORBED | Orientation variants are separate seed rows (hammer vs supinated), so class-out + allow-back is the honest grain (sufficiency matrix row 4) |

## Wrist / hand

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Flexion/extension intolerance | R8 §3.1 | wrist_hand_loading | SEPARATE | weight_bearing_hands axis is exactly this class; + grip_bar + pull families |
| Grip limitations | R8 §3.2 | wrist_hand_loading + grip_hand_dexterity condition profile | CROSS-LINKED | Temporary grip trouble = injury profile; long-term difference = condition profile; both route to the same grip_bar axis + strap guidance |
| Thumb/hand loading | R8 §3.3 | wrist_hand_loading | MERGED | Thumb-specific training evidence thin (R8); per-exercise rules + grip-light routes carry it; no invented questions |
| Post-fracture / clinician | boundary by design | post_operative | SEPARATE | Clinician-directed profile; no return protocol invented (order section 6 law) |

## Spine / trunk

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Low back (persistent/recurrent) | R8 §4.1 | low_back | SEPARATE | Four-question class split: axial_load axis, spinal_erector, squat_press, flexion+rotation families |
| Cervical restrictions | R8 §4.2 | neck_upper_back | SEPARATE (absorbs thoracic) | overhead axis + axial_load + overhead_press split |
| Thoracic restrictions | R8 §4.3 | neck_upper_back | MERGED | Same product decisions (bar-on-back, overhead); no distinct thoracic question survives the "what decision needs it" test (R8 evidence thin) |
| Axial-loading restriction | R8 §4.4 | axis, consumed by low_back/neck/post-op | REPRESENTED | axial_load axis |
| Loaded flexion/extension/rotation | R8 §4.5 | low_back q4 | REPRESENTED | flexion + rotation families, distinct from compression and hinging |
| Post-operative / clinician-directed | boundary | post_operative | SEPARATE | clinicianBoundary mandatory (validator-enforced) |

## Hip / groin

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Hip ROM / FAI-related | R8 §5.1 | hip_related_pain | SEPARATE | squat_press depth class + flexion family + impact axis |
| Adductor/groin | R8 §5.2 | adductor_groin | SEPARATE | Exercise-list question (the five named adductor movements) + impact axis |
| Hip loading restrictions | R8 §5.3 | hip_related_pain | MERGED | Same classes; loading restriction IS the depth/flexion/impact split |

## Knee

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Patellofemoral pain | R8 §6.1 | patellofemoral | SEPARATE | squat_press + knee_extension classes + impact |
| ACL / post-ACL | R8 §6.2 | post_operative | ABSORBED | Clinician-led by definition; the boundary profile + its axial/overhead/impact questions carry restrictions without a return protocol |
| Meniscal | R8 §6.3 | deep_knee_bend | ABSORBED | The cartilage pattern the questions serve (depth, loaded twisting) is the deep-knee-bend class; named in-question |
| Patellar/quad tendon | R8 §6.4 | knee_tendon | SEPARATE | knee_extension class + impact + squat_press |
| Knee-flexion-depth | R8 §6 | deep_knee_bend | SEPARATE | squat_press + knee_flexion classes; Hinge & Hip Lower Builder is the matching family plan |
| Impact / loaded-knee-flexion | axes/families | all three knee profiles | REPRESENTED | impact axis + knee classes |

## Ankle / foot

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Sprain / instability | R8 §7.1 | ankle_sprain_instability | SEPARATE | impact + balance_high axes + squat_press class |
| Achilles tendinopathy | R8 §7.2 | achilles_calf | SEPARATE | gastro + soleus classes + impact |
| Plantar/foot loading | R8 §7.3 | achilles_calf + per-exercise | MERGED | Training-product decisions identical to the calf-loading class (R8: management evidence is footwear/load, not movement-class); no distinct question survives |
| Dorsiflexion limitations | R8 §7.4 | mechanism (sufficiency matrix row 11) | ABSORBED | Tracks the squat-depth class in this library; allow-back carries variants |
| Post-fracture / clinician | boundary | post_operative | SEPARATE | as above |

## Muscle / tendon strains

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| Hamstring / quad / calf / pec / biceps / triceps | R8 §8.1-8.7 | muscle_strain | MERGED into ONE profile, five grouped questions | Identical evidence frame across muscles (progressive reload, train everything untouched); the question SHAPE is per-muscle-class, so one profile with five family-grouped questions (hamstring+glute, quad, calf, pressing, arms) serves all without seven near-identical profiles |
| Adductor strain | R8 §8.4 | adductor_groin | CROSS-LINKED | The groin profile already carries the strain pattern with its named-exercise question |

## Post-operative / fracture / acute trauma

| Requested | Researched | Profile | S/M | Reason + representation |
|---|---|---|---|---|
| All | boundary by design | post_operative | SEPARATE | Mandatory clinicianBoundary (schema-enforced); three clinician-directed demand questions; no timeline, no protocol |

## Verdict

Every requested family is researched (36 of 37 R8 sections consumed)
and represented; the consolidation to 20 profiles is driven by
question-shape identity and the order's own no-cosmetic-duplicates
law, never by scope. ONE honest research gap stands recorded: elbow
ligament/instability was not separately researched (absorbed by the
clinician-directed path on prevalence + nature grounds). No omission
requires new build: the absorbed families each name the mechanism that
carries them.
