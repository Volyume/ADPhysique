/**
 * capability/directory/conditions.js - the disability / long-term-
 * condition knowledge directory (gap-closure order section 4; rulings
 * GC-D1/D2/D4/D5).
 *
 * Twenty profiles, each validated by validateConditionProfile in the
 * directory suite. Selecting one is a STATELESS lens: it pre-selects
 * functional questions (which write ordinary consent-gated constraint
 * rules through the existing flow) and surfaces cited practical notes.
 * Nothing here creates a movement ban, feeds eligibility, or reaches the
 * coach; a user gets identical training support describing function
 * without any name.
 *
 * Evidence convention: every entry carries source, year, URL, tier and a
 * VERBATIM quote taken from the banked research files (research/R5, R7).
 * Where the banked file recorded no verbatim finding, the quote is the
 * source's own title - honest and checkable, never a fabricated line.
 * Full adjudication trail: research/R5-population-evidence.md and
 * research/R7-condition-directory-evidence.md.
 *
 * Copy law: British English, calm voice, no em dash, condition names
 * permitted (GC-D4), function/benefit vocabulary banned and enforced by
 * the schema validator.
 */

import { PROFILE_KIND, CONDITION_CATEGORY, QUESTION_KIND } from './schema';

const PRO_NOTE = 'Anything a clinician or specialist has told you comes first. If you have been told to keep a movement out, add it under Injuries & limitations and say that a clinician asked for it. Volyume then works around it, and will not offer it back unless you change it yourself.';
// The one-sided training facts, shared so each profile adds only its own
// lead clause (founder order 2026-08-21). Says ONLY what ships: the
// both-arms / both-legs answers plan one-sided work, and a one-sided
// movement is planned as ordinary training. Corrected 2026-08-21 after
// the end-to-end trace: per-side logging enters ONE rep count used for
// both sides, so it does not record the sides differently and this line
// must never claim it does. Volyume has no per-side rule and no per-side
// target.
const SIDED = 'you can leave out movements that need both sides and train one side at a time. Volyume plans those movements as ordinary training rather than as a reduced version.';
const REVIEWED = '2026-08-21';

const K = PROFILE_KIND.CONDITION;
const C = CONDITION_CATEGORY;
const Q = QUESTION_KIND;

// Shared question builders (kept literal per profile where wording
// differs; these cover the recurring functional asks).
const qSeated = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'standing',
  wording: 'I train seated or from my chair',
  whyAsked,
});
const qFloor = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'floor_access',
  wording: 'Getting down to or up from the floor does not work for me',
  whyAsked,
});
const qGrip = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'grip_bar',
  wording: 'Gripping a bar or handle firmly is limited for me',
  whyAsked,
});
const qBalance = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'balance_high',
  wording: 'I need support for balance while I train',
  whyAsked,
});
const qOverhead = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'overhead_position',
  wording: 'Overhead positions do not work for me',
  whyAsked,
});
const qOneArm = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'bilateral_upper',
  wording: 'I train with one arm, or one arm does much more of the work',
  whyAsked,
});
const qOneLeg = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'bilateral_lower',
  wording: 'I train with one leg, or one leg does much more of the work',
  whyAsked,
});
const qImpact = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'impact',
  wording: 'Jumping and impact work is not for me',
  whyAsked,
});
const qAxial = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'axial_load',
  wording: 'I keep loading off my spine',
  whyAsked,
});
const qWrists = (id, whyAsked) => ({
  id, kind: Q.DEMAND, demandId: 'weight_bearing_hands',
  wording: 'Taking weight through my hands and wrists does not work for me',
  whyAsked,
});

export const CONDITION_PROFILES = Object.freeze([
  {
    id: 'spinal_cord_injury',
    kind: K,
    canonicalName: 'Spinal cord injury',
    aliases: ['SCI', 'paraplegia', 'tetraplegia', 'quadriplegia', 'spinal injury', 'wheelchair training'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'What training looks like depends on your level and completeness of injury, which decide which muscle groups are working for you. Two people with the same words on paper can train very differently.',
    functionalQuestions: [
      qSeated('sci_q1', 'Most strength work after a spinal cord injury is built from a seated or chair base; this sets yours.'),
      qFloor('sci_q2', 'Floor transfers are a separate choice from seated training; Volyume only plans them if they work for you.'),
      qGrip('sci_q3', 'Hand and grip function varies with level of injury; cuffs, straps and grip-light machines all count as training.'),
      qOneLeg('sci_q4', 'If your legs are not part of training right now, Volyume plans and judges only what is.'),
    ],
    setupConsiderations: [
      'Machines and benches you can transfer to steadily matter more than any exercise choice.',
      'Cable stations with adjustable seats and single handles cover a lot of seated training.',
      'Changing position regularly during longer seated sessions is worth building into rest periods.',
    ],
    accessibilityConsiderations: [
      'Rest timers and logging work one-handed and from a chair throughout.',
    ],
    fatigueNote: null,
    lateralityNote: `Effects are usually both-sided, but if one side works differently, ${SIDED}`,
    generalisable: [
      'International guidance for adults with long-standing spinal cord injury includes strength work for each muscle group that works for you, twice a week.',
    ],
    individual: [
      'Which muscle groups are working for you is personal and is exactly what your answers here describe.',
      'Environment and temperature preferences during exercise vary and are worth discussing with your specialist.',
    ],
    neverInfer: [
      'Never assume which muscle groups work from the words spinal cord injury.',
      'Never assume wheelchair use, or that standing work is impossible, from the name alone.',
      'Never assume grip function or trunk stability without the user confirming.',
    ],
    clinicianConfirm: [
      'Which muscle groups are working for you (your level and completeness of injury).',
      'Any exercise-setting guidance your specialist has given you, including environment and temperature.',
      'Skin care and pressure guidance for longer seated sessions.',
    ],
    familyRelevance: ['Seated Full Body', 'Seated Upper Strength', 'Supported Machine Builder', 'Grip-Light Machine Circuit'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as helping the injury itself.',
      'Never imply Volyume has assessed injury level or readiness to exercise.',
    ],
    evidence: [
      { source: 'Martin Ginis et al., Spinal Cord', year: 2018, url: 'https://www.nature.com/articles/s41393-017-0017-3', tier: 'T1', quote: '3 sets of strength exercises for each major functioning muscle group, at a moderate to vigorous intensity, 2 times per week' },
      { source: 'SCIRE Community, exercise guidelines page', year: 2023, url: 'https://community.scireproject.com/topic/exercise-guidelines/', tier: 'T2', quote: 'adults (aged 18-64) with chronic SCI (at least one year post-onset), neurological level of injury C3 and below' },
    ],
    knownGaps: ['Dose guidance covers ages 18 to 64 and long-standing injury only; outside that scope the general adult guidance applies.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'multiple_sclerosis',
    kind: K,
    canonicalName: 'Multiple sclerosis',
    aliases: ['MS', 'relapsing MS', 'progressive MS'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'MS affects everyone differently and often differently week to week. Energy, heat response and balance can all vary, so what you confirm here can change whenever you need it to.',
    functionalQuestions: [
      qBalance('ms_q1', 'Support-based training keeps sessions steady on days when balance is not.'),
      qGrip('ms_q2', 'If grip or hand precision varies, grip-light options keep pulling and pressing available.'),
      qImpact('ms_q3', 'Many people with MS keep training low-impact; entirely your call.'),
    ],
    setupConsiderations: [
      'Shorter sessions on lower-energy days work well; session length is freely adjustable in Volyume.',
      'A cooler training environment suits many people with MS.',
      'Machines and supported positions give you somewhere steady on variable days.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: 'Energy with MS can change day to day. You set how many days you train and how long a session runs, and Volyume plans to what you set rather than to a fixed idea of a full week. For a rough patch, add a temporary change under Injuries & limitations.',
    lateralityNote: `If one side is more affected, ${SIDED}`,
    generalisable: [
      'Strength work is consistently supported by research in MS, built around how your MS affects you.',
    ],
    individual: [
      'How much, how often and in what heat is individual with MS; nothing here assumes a fixed dose.',
    ],
    neverInfer: [
      'Never assume mobility, balance or grip from the name MS.',
      'Never assume a bad week means a changed baseline; temporary changes exist for that.',
    ],
    clinicianConfirm: [
      'Any guidance from your MS team about exertion, heat and recovery.',
      'What to do about training during and after a relapse.',
    ],
    familyRelevance: ['Steady-Base Full Body', 'Supported Machine Builder', 'Seated Full Body', 'Dumbbell & Band Foundations'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as changing the course of MS.',
      'Never encode push-through-fatigue framing; with MS that direction is professionally guided.',
    ],
    evidence: [
      { source: 'MS Trust, Starting to exercise with MS', year: 2024, url: 'https://mstrust.org.uk/information-support/exercise-ms/starting-exercise', tier: 'T2', quote: 'Everyone’s MS is different, and you know best how your MS affects what you can do' },
      { source: 'Journal of Clinical Medicine, systematic review and meta-analysis', year: 2024, url: 'https://doi.org/10.3390/jcm13051378', tier: 'T3', quote: 'Is Resistance Training an Option to Improve Functionality and Muscle Strength in Middle-Aged People with Multiple Sclerosis?' },
    ],
    knownGaps: ['Heat management specifics are professional territory and deliberately not encoded.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'parkinsons',
    kind: K,
    canonicalName: 'Parkinson’s',
    aliases: ['Parkinson’s disease', 'PD', 'parkinsons'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'Movement, balance and steadiness with Parkinson’s vary between people and across the day. The right base and support level is yours to confirm, and can differ from session to session.',
    functionalQuestions: [
      qBalance('pd_q1', 'Supported and machine-based work keeps training steady when balance asks for it.'),
      qGrip('pd_q2', 'If tremor or grip precision gets in the way, grip-light equipment keeps the same muscles working.'),
      qImpact('pd_q3', 'Impact work is a personal choice; many people keep training low-impact.'),
    ],
    setupConsiderations: [
      'Seated and supported positions remove the balance cost from heavy work.',
      'Many people time training for when they feel at their best in the day; Volyume never schedules your sessions, so when you train is entirely your call.',
    ],
    accessibilityConsiderations: [
      'Larger touch targets and steady layouts help when precision varies; logging never needs a fast tap.',
    ],
    fatigueNote: null,
    lateralityNote: `Parkinson’s often affects one side more. Where it does, ${SIDED}`,
    generalisable: [
      'Strength training is well supported by research in Parkinson’s and is part of recognised exercise guidance.',
    ],
    individual: [],
    neverInfer: [
      'Never assume tremor, balance or walking ability from the name Parkinson’s.',
      'Never reference medication timing; that belongs with the specialist team.',
    ],
    clinicianConfirm: [
      'Any guidance from your specialist team about exercise timing across the day.',
      'Balance and falls guidance specific to you.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Steady-Base Full Body', 'Seated Full Body', 'Grip-Light Machine Circuit'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as slowing or changing Parkinson’s.',
      'Never suggest exercise timing relative to medication.',
    ],
    evidence: [
      { source: 'Gollan et al., Journal of Parkinson’s Disease', year: 2022, url: 'https://doi.org/10.3233/JPD-223252', tier: 'T3', quote: 'Effects of Resistance Training on Motor- and Non-Motor Symptoms in Patients with Parkinson’s Disease: A Systematic Review and Meta-Analysis' },
      { source: 'Parkinson’s UK, exercise resources', year: 2024, url: 'https://www.parkinsons.org.uk/information-and-support/exercise', tier: 'T2', quote: 'Parkinson’s UK resources current (2024); no NICE guideline update identified 2024-2026' },
    ],
    knownGaps: ['Session-timing guidance stays with the specialist team by design.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'cerebral_palsy',
    kind: K,
    canonicalName: 'Cerebral palsy',
    aliases: ['CP', 'hemiplegia', 'diplegia', 'spastic CP'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'Cerebral palsy spans people who train like anyone else with a balance note, through to fully seated and supported training. Your function, not the name, decides what Volyume builds.',
    functionalQuestions: [
      qBalance('cp_q1', 'Support level is the biggest single call for many adults with CP; you set it.'),
      qOneArm('cp_q2', 'If one arm does most of the work, one-side training keeps everything trainable.'),
      qOneLeg('cp_q3', 'Same for the legs: one-side work is complete training, not a compromise.'),
      qSeated('cp_q4', 'If seated is your base, everything is planned from it.'),
      qFloor('cp_q5', 'Floor work is only planned if getting down and up works for you.'),
    ],
    setupConsiderations: [
      'Machines with trunk support turn stability effort into training effort.',
      'Strap and cuff attachments make cable work available whatever grip is doing.',
    ],
    accessibilityConsiderations: [
      'Logging works one-handed, and the buttons are large enough to hit without precision.',
    ],
    fatigueNote: 'Moving about with cerebral palsy can cost more energy than it looks. Shorter sessions are a normal setup here rather than a reduced one, and Volyume plans to the session length you set.',
    lateralityNote: `Cerebral palsy is often one-sided or uneven. Where it is, ${SIDED}`,
    generalisable: [
      'Research supports strength training for adults with cerebral palsy, built around individual function.',
    ],
    individual: [
      'Training dose in CP does not follow a formula in the research; your own response is the guide.',
    ],
    neverInfer: [
      'Never assume walking, standing, grip or speech from the name cerebral palsy.',
      'Never assume both sides work the same.',
    ],
    clinicianConfirm: [
      'Any stretch and positioning guidance from your team, which sits alongside strength work rather than inside it.',
    ],
    familyRelevance: ['Supported Machine Builder', 'One-Arm Upper Builder', 'One-Leg Lower Builder', 'Seated Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present strength work as changing CP itself; the research supports function, not condition change.',
    ],
    evidence: [
      { source: 'Bania et al., Physiotherapy', year: 2023, url: 'https://pubmed.ncbi.nlm.nih.gov/36696699/', tier: 'T3', quote: 'What are the optimum training parameters of progressive resistance exercise for changes in muscle function, activity and participation in people with cerebral palsy?' },
      { source: 'Andersson et al., adults with CP strength training', year: 2003, url: 'https://pubmed.ncbi.nlm.nih.gov/15371025/', tier: 'T3', quote: 'Adults with cerebral palsy benefit from participating in a strength training programme at a community gymnasium' },
    ],
    knownGaps: ['No dose formula exists in the adult CP literature; the profile deliberately sets none.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'stroke_acquired_brain_injury',
    kind: K,
    canonicalName: 'Stroke and acquired brain injury',
    aliases: ['stroke', 'brain injury', 'ABI', 'TBI', 'hemiparesis', 'head injury', 'post-stroke'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'Long-term effects depend on what happened and where. One-sided differences, balance, energy and concentration all vary person to person and are yours to describe, not the app’s to guess.',
    functionalQuestions: [
      qOneArm('abi_q1', 'One-sided difference after stroke or brain injury is common; one-arm training keeps the whole upper body trainable.'),
      qOneLeg('abi_q2', 'Same for the lower body; one-side work is complete training.'),
      qBalance('abi_q3', 'Supported training removes the balance cost while strength does its work.'),
      qGrip('abi_q4', 'If the affected hand grips less, cuffs, straps and grip-light machines keep pulling available.'),
    ],
    setupConsiderations: [
      'Machines and supported positions let the stronger and the affected side each work at their own level.',
      'Single-arm and single-leg stations mean the affected side trains without the other side covering for it.',
    ],
    accessibilityConsiderations: [
      'Plain wording and no hurry matter when concentration tires; nothing in logging runs against a clock.',
    ],
    fatigueNote: 'Tiredness after a brain injury is real and often invisible to everyone else. Fewer days and shorter sessions are a normal shape here, and Volyume works to the plan you set rather than pushing you towards more.',
    lateralityNote: `Effects are often one-sided. Where that is true for you, ${SIDED}`,
    generalisable: [
      'Research finds strength training worthwhile long after a stroke, with each person’s starting point setting the shape.',
    ],
    individual: [
      'The research is honest that no standard dose exists after stroke; your own response is the guide.',
    ],
    neverInfer: [
      'Never assume which side, or how much, from the words stroke or brain injury.',
      'Never assume concentration or language needs from the name.',
    ],
    clinicianConfirm: [
      'Any guidance from your team about blood pressure and exertion.',
      'What your team says about balance and falls for you specifically.',
    ],
    familyRelevance: ['One-Arm Upper Builder', 'One-Leg Lower Builder', 'Supported Machine Builder', 'Seated Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as recovery from the injury; it is training, built around what works now.',
    ],
    evidence: [
      { source: 'Veldema and Jansen, Clinical Rehabilitation', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32527148/', tier: 'T3', quote: 'the current evidence is insufficient for evidence-based rehabilitation' },
      { source: 'Ouellette et al., Stroke', year: 2004, url: 'https://pubmed.ncbi.nlm.nih.gov/15105515/', tier: 'T3', quote: 'High-Intensity Resistance Training Improves Muscle Strength, Self-Reported Function, and Disability in Long-Term Stroke Survivors' },
    ],
    knownGaps: ['No parameter formula exists in the stroke literature; the profile deliberately sets none.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'upper_limb_difference',
    kind: K,
    canonicalName: 'Upper limb difference',
    aliases: ['arm amputation', 'amputee', 'one arm', 'one-handed', 'limb difference', 'congenital limb difference', 'hand difference'],
    category: C.LIMB_DIFFERENCE,
    affects: { programming: true, appAccessibility: true },
    variability: 'Limb difference spans congenital and acquired, every level, and every combination of prosthesis, adaptive equipment or neither. What you use and what you train with is entirely yours to set.',
    functionalQuestions: [
      qOneArm('uld_q1', 'One-arm training is complete upper-body training; this tells Volyume to plan it that way.'),
      qGrip('uld_q2', 'If you use a hook, cuff, strap or prosthesis for some movements, you can mark those exercises as ones that work for you, and save your own setup as a custom exercise.'),
      qWrists('uld_q3', 'Push-up style positions are a separate question from grip; answer for how things actually are.'),
    ],
    setupConsiderations: [
      'Cable single handles, cuffs and adjustable dumbbells cover most one-arm work.',
      'A custom exercise is the place for a movement you have built around your own setup, and it tracks like any other.',
      'Which movements you use a hook, cuff or prosthesis for is personal and often differs exercise by exercise, so you can mark any exercise as one that works for you.',
    ],
    accessibilityConsiderations: [
      'The whole app works one-handed, including mid-set logging.',
    ],
    fatigueNote: null,
    lateralityNote: `One-arm training is planned as complete training rather than a reduced version: ${SIDED}`,
    generalisable: [
      'One-side strength work is fully effective training and the standard approach with limb difference.',
    ],
    individual: [],
    neverInfer: [
      'Never assume which arm, what level, or whether a prosthesis is used in training.',
      'Never assume a prosthesis means grip; the user decides per movement.',
    ],
    clinicianConfirm: [
      'Load guidance for your residual limb and interface, if a professional supports you with it.',
    ],
    familyRelevance: ['One-Arm Upper Builder', 'Grip-Light Machine Circuit', 'Steady-Base Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never imply prosthetic advice; interface and load tolerance are professional territory.',
    ],
    evidence: [
      { source: 'BMC Musculoskeletal Disorders, review of training after upper limb loss', year: 2025, url: 'https://doi.org/10.1186/s12891-025-09128-3', tier: 'T3', quote: 'still no consensus on the most effective training protocols or how to tailor interventions for diverse subgroups' },
    ],
    knownGaps: ['Peer-reviewed training-protocol evidence is thin; the profile stays capability-led by design.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'lower_limb_difference',
    kind: K,
    canonicalName: 'Lower limb difference',
    aliases: ['leg amputation', 'amputee', 'one leg', 'limb difference', 'above knee', 'below knee'],
    category: C.LIMB_DIFFERENCE,
    affects: { programming: true, appAccessibility: false },
    variability: 'Level, prosthesis use and balance all vary; some people train standing with a prosthesis, others seated or single-leg. Your setup decides the plan, not the name.',
    functionalQuestions: [
      qOneLeg('lld_q1', 'Single-leg strength work is complete lower-body training; this plans it that way.'),
      qBalance('lld_q2', 'Supported positions take balance out of the equation where you want them to.'),
      qSeated('lld_q3', 'If seated is your base for some or all training, say so and it is planned from there.'),
      qImpact('lld_q4', 'Jumping and impact work depends on you and on your prosthesis; Volyume leaves it out until you say otherwise.'),
    ],
    setupConsiderations: [
      'Machines with independent leg action and single-leg stations do the honest work here.',
      'Seated and lying lower-body work keeps volume available without balance cost.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: null,
    lateralityNote: `Single-leg work is planned as complete training rather than a reduced version: ${SIDED}`,
    generalisable: [
      'Single-leg and supported lower-body strength work is standard, effective training with limb difference.',
    ],
    individual: [
      'Socket comfort and load through a prosthesis vary day to day and are yours and your prosthetist’s territory.',
    ],
    neverInfer: [
      'Never assume level, prosthesis use, or standing tolerance from the name.',
      'Never plan impact work by default.',
    ],
    clinicianConfirm: [
      'Load and volume guidance for the residual limb and socket, if professionally supported.',
    ],
    familyRelevance: ['One-Leg Lower Builder', 'Supported Machine Builder', 'Seated Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never imply prosthetic or socket advice.',
    ],
    evidence: [
      { source: 'Rosario et al., Journal of Functional Morphology and Kinesiology', year: 2023, url: 'https://doi.org/10.3390/jfmk8010023', tier: 'T3', quote: 'Resistance training in lower limb amputation: a systematic review' },
    ],
    knownGaps: ['Intensity reporting in the research is poor; the profile stays capability-led by design.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'spina_bifida',
    kind: K,
    canonicalName: 'Spina bifida',
    aliases: ['SB', 'spinal dysraphism', 'myelomeningocele'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'Function varies a lot with the level involved: some people walk with or without aids, others train from a chair. Upper-body strength often carries daily life, so it earns focus.',
    functionalQuestions: [
      qSeated('sb_q1', 'If seated or chair-based is your base, the whole plan builds from it.'),
      qFloor('sb_q2', 'Floor transfers are planned only if they work for you.'),
      qOneLeg('sb_q3', 'If your legs are partly or not involved in training, Volyume plans exactly what is.'),
      qBalance('sb_q4', 'Supported positions keep standing work available where it suits you.'),
    ],
    setupConsiderations: [
      'Seated pressing, rowing and pulldown stations cover the core upper-body work.',
      'Position changes and pressure care during longer seated sessions are worth building into rests.',
      'If latex is a concern for you, band choice is worth checking; most gym bands have latex-free versions.',
    ],
    accessibilityConsiderations: [
      'Logging and timers work one-handed from a chair.',
    ],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Guidance for adults with spina bifida supports regular strength work, with upper-body strength earning particular attention.',
    ],
    individual: [
      'Level, mobility aids and daily-life demands make the right split personal.',
    ],
    neverInfer: [
      'Never assume wheelchair use; a meaningful share of people with spina bifida walk.',
      'Never assume anything about cognition from the name.',
      'Never assume lower-limb function either way.',
    ],
    clinicianConfirm: [
      'Anything your team has said about spine loading and shunts in relation to exercise.',
      'Skin and pressure care guidance for seated training.',
    ],
    familyRelevance: ['Seated Full Body', 'Seated Upper Strength', 'Supported Machine Builder', 'No-Floor Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never conflate spina bifida with any cognitive assumption.',
    ],
    evidence: [
      { source: 'NCHPAD, Spina Bifida and Exercise', year: 2024, url: 'https://www.nchpad.org/resources/spina-bifida/', tier: 'T2', quote: 'Train three days per week, avoiding same muscle groups on consecutive days' },
      { source: 'Systematic review, physical fitness and exercise training in spina bifida', year: 2014, url: 'https://www.ncbi.nlm.nih.gov/books/NBK196305/', tier: 'T3', quote: 'Physical fitness and exercise training on individuals with Spina Bifida' },
    ],
    knownGaps: ['UK-specific guidance is thin; general adult guidance plus specialist input covers the rest.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'muscular_dystrophy_neuromuscular',
    kind: K,
    canonicalName: 'Muscular dystrophy and neuromuscular conditions',
    aliases: ['MD', 'Duchenne', 'Becker', 'limb-girdle', 'FSHD', 'myotonic dystrophy', 'SMA', 'spinal muscular atrophy', 'neuromuscular'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'These conditions differ hugely from one another and over time. What suits one type can be firmly discouraged for another, so specialist guidance leads and Volyume follows what you confirm.',
    functionalQuestions: [
      qBalance('md_q1', 'Supported and machine-based work keeps training steady as balance asks for it.'),
      qImpact('md_q2', 'Impact work is generally kept out here unless your team says otherwise.'),
      qSeated('md_q3', 'If seated is your base, everything is planned from it.'),
      qGrip('md_q4', 'If grip is affected, grip-light equipment keeps the same muscles working.'),
    ],
    setupConsiderations: [
      'Controlled machine work with adjustable, modest loads is the usual shape.',
      'Anything your specialist team has said about lowering-phase effort belongs in how you perform each set; Volyume never pushes past it.',
    ],
    accessibilityConsiderations: [
      'Screens stay laid out the same way between sessions, and logging works one-handed.',
    ],
    fatigueNote: 'Stopping well short of your limit is the usual approach with these conditions. Volyume plans to the days and session length you set, so a modest session is simply your session, not a lesser one.',
    lateralityNote: null,
    generalisable: [
      'Research supports supervised, progressive strength work in several of these conditions, with the type and stage setting the boundaries.',
    ],
    individual: [
      'The type matters enormously; the same programme can be right for one condition and wrong for another.',
    ],
    neverInfer: [
      'Never assume one neuromuscular condition behaves like another.',
      'Never assume progression means training must stop; that is a specialist conversation.',
      'Never push intensity or lowering-phase emphasis from the app side.',
    ],
    clinicianConfirm: [
      'Whether strength training suits your type and stage, and with what boundaries.',
      'Any guidance about effort ceilings and the lowering phase of movements.',
      'Heart and breathing considerations your team monitors.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Seated Full Body', 'Seated Upper Strength', 'Dumbbell & Band Foundations'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never generalise across neuromuscular conditions.',
      'Never present training as slowing progression.',
    ],
    evidence: [
      { source: 'Systematic review, exercise training in Duchenne muscular dystrophy', year: 2022, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8862644/', tier: 'T3', quote: 'intensive eccentric muscle exercise, in addition to high-resistance exercise, may exacerbate muscle damage and should be avoided' },
      { source: 'Frontiers in Neurology, resistance training in LGMD, Becker and FSHD', year: 2019, url: 'https://doi.org/10.3389/fneur.2019.01216', tier: 'T3', quote: 'Resistance exercise training in limb-girdle muscular dystrophy, Becker muscular dystrophy and facioscapulohumeral dystrophy' },
      { source: 'Myotonic Dystrophy Foundation, exercise guidance', year: 2024, url: 'https://www.myotonic.org/how-should-dm-patients-exercise', tier: 'T2', quote: 'Moderate exercise is safe and can support joint, heart, lung, and overall health' },
    ],
    knownGaps: ['Certainty is low in parts of this literature; the profile keeps every boundary with the specialist team.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'osteoarthritis',
    kind: K,
    canonicalName: 'Osteoarthritis',
    aliases: ['OA', 'arthritis', 'joint wear', 'knee arthritis', 'hip arthritis', 'degenerative joint'],
    category: C.MUSCULOSKELETAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'Which joints, how much, and on which days all vary. UK guidance puts tailored exercise at the centre for osteoarthritis, and the tailoring is exactly what your answers here do.',
    functionalQuestions: [
      qImpact('oa_q1', 'Low-impact training is the usual preference with joint-related restriction; your call.'),
      qWrists('oa_q2', 'If hands or wrists are involved, push-up style positions are a separate question from grip.'),
      qGrip('oa_q3', 'Hand involvement varies; grip-light equipment keeps pulling and pressing available.'),
      {
        id: 'oa_q4', kind: Q.FAMILY, familyKeys: ['squat_press'],
        wording: 'Deep squatting and pressing through the legs is something I keep out at the moment',
        whyAsked: 'Knee and hip involvement often makes this a per-movement choice; you can allow back specific ones that work.',
      },
    ],
    setupConsiderations: [
      'Machines let you fine-tune load on an involved joint far better than fixed body weight.',
      'Starting lower and building gradually is the guidance-backed shape when a joint is involved.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: null,
    lateralityNote: `If one side is more involved than the other, ${SIDED}`,
    generalisable: [
      'UK guidance recommends tailored strength and fitness exercise as core care for osteoarthritis.',
      'Some ache when starting new exercise is described as normal in the guidance, settling as the body adapts.',
    ],
    individual: [
      'Which joints and which movements are involved is entirely personal; per-exercise choices and allowances carry it.',
    ],
    neverInfer: [
      'Never assume a joint or a movement is out from the word arthritis.',
      'Never treat osteoarthritis and inflammatory arthritis as the same thing.',
    ],
    clinicianConfirm: [
      'Anything your clinician has said about specific joints or planned procedures.',
    ],
    familyRelevance: ['Steady-Base Full Body', 'Dumbbell & Band Foundations', 'Supported Machine Builder', 'Grip-Light Machine Circuit'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present exercise as fixing the joint; guidance frames it as core care for function.',
    ],
    evidence: [
      { source: 'NICE guideline NG226, osteoarthritis in over 16s', year: 2022, url: 'https://www.nice.org.uk/guidance/ng226', tier: 'T1', quote: 'offer therapeutic exercise tailored to their needs (for example, local muscle strengthening, general aerobic fitness)' },
      { source: 'Frontiers in Aging, exercise for knee osteoarthritis review', year: 2025, url: 'https://doi.org/10.3389/fragi.2025.1458983', tier: 'T3', quote: 'Optimal exercise for knee osteoarthritis' },
    ],
    knownGaps: [],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'inflammatory_arthritis',
    kind: K,
    canonicalName: 'Rheumatoid and inflammatory arthritis',
    aliases: ['RA', 'rheumatoid arthritis', 'psoriatic arthritis', 'ankylosing spondylitis', 'inflammatory arthritis', 'axial spondyloarthritis'],
    category: C.MUSCULOSKELETAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'These conditions come and go in waves. On settled weeks training is well supported; on rough weeks the temporary-change tools exist so a hard patch never has to look like a failed plan.',
    functionalQuestions: [
      qGrip('ra_q1', 'Hand and wrist involvement is common; grip-light equipment keeps everything trainable.'),
      qWrists('ra_q2', 'Push-up style positions load the wrists directly; a separate choice from grip.'),
      qImpact('ra_q3', 'Low-impact is the common preference; yours to set.'),
    ],
    setupConsiderations: [
      'Machines and cables allow small load steps, which matter when joints have opinions.',
      'On rough weeks, a temporary change under Injuries & limitations keeps the plan honest without rewriting your normal.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: 'Tiredness is part of these conditions for many people. Volyume plans to the days and session length you set, and on a rough week a temporary change under Injuries & limitations covers it without rewriting your normal setup.',
    lateralityNote: null,
    generalisable: [
      'Research strongly supports regular strength and fitness work in rheumatoid arthritis, shaped around how things are week to week.',
    ],
    individual: [
      'Which joints are involved, and when, is personal and changeable; temporary changes and allowances carry it.',
    ],
    neverInfer: [
      'Never assume which joints are involved from the name.',
      'Never treat a rough patch as a new baseline; temporary changes exist for that.',
    ],
    clinicianConfirm: [
      'What your rheumatology team says about training during active periods.',
    ],
    familyRelevance: ['Steady-Base Full Body', 'Grip-Light Machine Circuit', 'Supported Machine Builder', 'Dumbbell & Band Foundations'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as calming the condition; frame around function and general guidance only.',
    ],
    evidence: [
      { source: 'American College of Rheumatology, exercise guideline for RA', year: 2023, url: 'https://doi.org/10.1002/acr.25117', tier: 'T3', quote: 'Consistent engagement in exercise strongly recommended over no exercise' },
      { source: 'NRAS, exercise and rheumatoid arthritis', year: 2024, url: 'https://nras.org.uk/resource/exercise/', tier: 'T2', quote: 'Resistance training is safe for RA and beneficial for daily functioning' },
    ],
    knownGaps: ['Active-period specifics stay with the rheumatology team by design.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'hypermobility',
    kind: K,
    canonicalName: 'Hypermobility and hypermobile EDS',
    aliases: ['hEDS', 'EDS', 'Ehlers-Danlos', 'hypermobility spectrum', 'HSD', 'double-jointed', 'joint hypermobility'],
    category: C.MUSCULOSKELETAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'Hypermobility ranges from a footnote to a daily consideration. Strength and control, not range, are the training goal; how far and fast to progress is personal.',
    functionalQuestions: [
      qBalance('hm_q1', 'Supported, stable positions suit joints that move further than they should; you set the support level.'),
      qImpact('hm_q2', 'Impact work is usually kept out with hypermobile joints; yours to decide.'),
      qOverhead('hm_q3', 'Overhead positions can be a shoulder-stability question with hypermobility; leave them out if that is you, and you can bring back any that are fine.'),
    ],
    setupConsiderations: [
      'Controlled machine work and bands give feedback that free weights do not, which suits hypermobile joints.',
      'Stopping movements short of end range is a performance note worth making your habit; equipment choice can help it.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: 'Building up gradually is the usual approach with hypermobile joints. If you hit a rough patch, a temporary change under Injuries & limitations covers it without changing your normal setup.',
    lateralityNote: null,
    generalisable: [
      'Guidance for hypermobile EDS centres strength and control work, started gently and built gradually.',
    ],
    individual: [
      'How much support, how much load and how fast to progress vary widely; your response is the guide.',
    ],
    neverInfer: [
      'Never treat range of movement as the goal; reaching further is not the point here.',
      'Never assume dizziness or fatigue involvement without the user saying so.',
    ],
    clinicianConfirm: [
      'Any guidance from your team about positions to keep out and how to progress.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Steady-Base Full Body', 'Dumbbell & Band Foundations'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never frame stretching or range work as the answer to hypermobility.',
    ],
    evidence: [
      { source: 'Ehlers-Danlos Support UK, exercise and movement guidance', year: 2024, url: 'https://www.ehlers-danlos.org/information/exercise-and-movement-for-adults-with-hypermobile-ehlers-danlos-syndrome-and-hypermobility-spectrum-disorders/', tier: 'T2', quote: 'just because it goes there doesn’t mean you should take it there' },
      { source: 'Disability and Rehabilitation, scoping review of interventions in G-HSD and hEDS', year: 2023, url: 'https://doi.org/10.1080/09638288.2023.2216028', tier: 'T3', quote: 'Physical therapy interventions in generalised hypermobility spectrum disorder and hypermobile Ehlers-Danlos syndrome' },
    ],
    knownGaps: ['Progression ceilings are not defined in the research; the profile sets none.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'balance_impairment',
    kind: K,
    canonicalName: 'Balance and stability conditions',
    aliases: ['vestibular', 'vertigo', 'ataxia', 'dizziness', 'balance problems', 'unsteady', 'labyrinthitis', 'Meniere’s'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: false },
    variability: 'Balance conditions range from steady-state to variable day to day, and from inner-ear to neurological causes. The support level you choose is the whole adjustment; strength work itself is unchanged.',
    functionalQuestions: [
      qBalance('bal_q1', 'This is the main one here: training from a supported position lets the muscles work without balance being part of the effort.'),
      qImpact('bal_q2', 'Impact work asks the most of balance; usually the first thing to set aside.'),
      qFloor('bal_q3', 'Getting down and up can be the unsteadiest moment; leave floor work out if that is true for you.'),
    ],
    setupConsiderations: [
      'Machines, seats and a wall or rail nearby mean an unsteady day changes the setup rather than the session.',
      'Fixed and guided equipment beats free-standing work on unsteady days.',
      'If balance comes and goes rather than staying the same, a temporary change under Injuries & limitations covers a rough spell without changing your normal setup.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Strength work from supported positions carries on regardless of balance; support level is the only variable.',
    ],
    individual: [],
    neverInfer: [
      'Never assume the cause, or that balance is constant, from the name.',
      'Never schedule balance-demanding work by default.',
    ],
    clinicianConfirm: [
      'Any positions or head movements your specialist has told you to keep out of training.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Steady-Base Full Body', 'Seated Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as improving the underlying condition.',
    ],
    evidence: [
      { source: 'Ataxia UK, physical activity information', year: 2024, url: 'https://www.ataxia.org.uk/', tier: 'T2', quote: 'Ataxia UK' },
      { source: 'Friedreich ataxia clinical management guidelines', year: 2022, url: 'https://frdaguidelines.org/3-2/', tier: 'T3', quote: 'Clinical management guidelines for Friedreich ataxia' },
    ],
    knownGaps: ['Cause-specific guidance stays with the specialist; the profile only sets support level.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'grip_hand_dexterity',
    kind: K,
    canonicalName: 'Grip, hand and dexterity differences',
    aliases: ['weak grip', 'hand weakness', 'dexterity', 'hand difference', 'carpal tunnel', 'hand function', 'dropping things'],
    category: C.OTHER,
    affects: { programming: true, appAccessibility: true },
    variability: 'Grip and hand differences come from many places and affect movements unevenly: a firm bar hold, a light touch and taking weight through the palm are three different questions.',
    functionalQuestions: [
      qGrip('grip_q1', 'The central question: excluding firm-grip work keeps every muscle trainable through grip-light routes.'),
      qWrists('grip_q2', 'Push-up style positions load the wrist without needing grip; a separate answer.'),
      qOneArm('grip_q3', 'If one hand does most of the work, one-side training keeps everything available.'),
    ],
    setupConsiderations: [
      'Cuffs, straps and hooks take firm grip out of most pulling movements; if you have your own way of setting one up, save it as a custom exercise and it tracks like any other.',
      'Machine work with pads and supports needs the least from the hands.',
      'Which holds work can differ movement by movement and day by day, so you can mark individual exercises as ones that work for you.',
    ],
    accessibilityConsiderations: [
      'The app itself works one-handed with generous touch targets.',
    ],
    fatigueNote: null,
    lateralityNote: `If one hand works differently from the other, ${SIDED}`,
    generalisable: [
      'Grip-light equipment and adapted holds keep the training effect while changing only the interface.',
    ],
    individual: [],
    neverInfer: [
      'Never assume the cause, or that both hands are the same.',
      'Never assume a movement is out before the user says so; interfaces vary.',
    ],
    clinicianConfirm: [
      'Any load guidance for the hand or wrist from a professional supporting you.',
    ],
    familyRelevance: ['Grip-Light Machine Circuit', 'One-Arm Upper Builder', 'Supported Machine Builder'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present adapted holds as lesser training.',
    ],
    evidence: [
      { source: 'Life, strength-endurance training and essential tremor study', year: 2025, url: 'https://doi.org/10.3390/life16060961', tier: 'T3', quote: 'strength-endurance training reduced essential tremor severity, improved manual dexterity, upper-limb function' },
    ],
    knownGaps: ['Non-stroke hand-impairment training evidence is thin; the profile stays functional by design.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'tremor_dystonia',
    kind: K,
    canonicalName: 'Tremor and dystonia',
    aliases: ['essential tremor', 'shaky hands', 'dystonia', 'writer’s cramp', 'movement disorder'],
    category: C.NEUROLOGICAL,
    affects: { programming: true, appAccessibility: true },
    variability: 'Tremor and dystonia vary in which tasks they touch and how much; many strength movements are barely affected while fine positioning ones are. Your per-movement choices carry it.',
    functionalQuestions: [
      qGrip('td_q1', 'If steady gripping is the affected task, grip-light equipment keeps everything trainable.'),
      qBalance('td_q2', 'Supported positions remove precision demands from heavy work.'),
      qOverhead('td_q3', 'Overhead positions ask the most steadiness; leave them out if that is you, and you can bring back any that are fine.'),
    ],
    setupConsiderations: [
      'Machines with a fixed path suit variable steadiness better than free weights.',
      'Slightly heavier, slower movements are steadier than light fast ones for many people with tremor.',
      'Tremor usually touches particular movements rather than everything, so you can keep single exercises out instead of whole groups.',
    ],
    accessibilityConsiderations: [
      'Logging never needs precision taps; buttons are large and forgiving.',
    ],
    fatigueNote: 'Steadiness often drops as a session goes on. You can finish a session whenever you want to, and everything you logged up to that point still counts.',
    lateralityNote: `Tremor is often one-sided or specific to certain tasks. Where that is true, ${SIDED}`,
    generalisable: [
      'Research suggests strength work itself remains fully available, with equipment choice absorbing steadiness demands.',
    ],
    individual: [],
    neverInfer: [
      'Never assume tremor touches all movements; most strength work is unaffected for many people.',
    ],
    clinicianConfirm: [
      'Anything your specialist says about training and your particular pattern.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Grip-Light Machine Circuit', 'Steady-Base Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never present training as steadying the condition; the research is early.',
    ],
    evidence: [
      { source: 'Life, strength-endurance training and essential tremor study', year: 2025, url: 'https://doi.org/10.3390/life16060961', tier: 'T3', quote: 'strength-endurance training reduced essential tremor severity, improved manual dexterity, upper-limb function' },
    ],
    knownGaps: ['Evidence is small-sample and emerging; the profile keeps to functional support.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'visual_impairment',
    kind: K,
    canonicalName: 'Visual impairment',
    aliases: ['blind', 'low vision', 'sight loss', 'partially sighted', 'VI'],
    category: C.SENSORY,
    affects: { programming: false, appAccessibility: true },
    variability: 'Sight loss changes how training information reaches you, not what your body can do. Residual vision, onset and preferences differ, so the app adapts rather than the training.',
    functionalQuestions: [
      qBalance('vi_q1', 'Some people with sight loss prefer supported positions in busy gyms; entirely optional.'),
    ],
    setupConsiderations: [
      'Fixed machines in a known layout are easier to work with independently than free-weight areas that change.',
      'Consistent racking and a familiar gym layout do more for independence than any exercise choice.',
    ],
    accessibilityConsiderations: [
      'Controls are labelled for screen readers, and nothing depends on colour alone to make sense.',
      'The end of a rest timer sounds and vibrates, so it does not depend on you watching the screen.',
      'Volyume follows the accessibility settings on your phone rather than asking you to set them up again here.',
    ],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Strength training is fully available with sight loss; the adaptations are informational and environmental.',
    ],
    individual: [],
    neverInfer: [
      'Never assume reduced physical capability from sight loss.',
      'Never assume screen-reader use or any particular access method.',
    ],
    clinicianConfirm: [],
    familyRelevance: ['Supported Machine Builder', 'Steady-Base Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never imply supervision or guiding services; Volyume is an app, not a guide.',
    ],
    evidence: [
      { source: 'British Blind Sport, guidance and programmes', year: 2024, url: 'https://britishblindsport.org.uk/', tier: 'T2', quote: 'British Blind Sport' },
      { source: 'RNIB, physical activity resources', year: 2024, url: 'https://www.rnib.org.uk/', tier: 'T2', quote: 'RNIB' },
    ],
    knownGaps: ['Training-parameter research specific to sight loss is scarce; none is needed for functional support.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'hearing_impairment',
    kind: K,
    canonicalName: 'Hearing impairment',
    aliases: ['deaf', 'hard of hearing', 'hearing loss', 'HoH'],
    category: C.SENSORY,
    affects: { programming: false, appAccessibility: true },
    variability: 'Hearing loss changes how cues and timers reach you, not the training. Where the inner ear is involved, balance can also be part of the picture, which is a separate answer here.',
    functionalQuestions: [
      qBalance('hi_q1', 'Inner-ear conditions sometimes involve balance too; answer only if that is part of yours.'),
    ],
    setupConsiderations: [
      'Visual and vibration cues replace audio ones throughout the app.',
    ],
    accessibilityConsiderations: [
      'Rest timers count down on screen and vibrate at the end, so nothing depends on hearing them.',
    ],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Strength training is fully available with hearing loss; cues simply arrive visually and by vibration.',
    ],
    individual: [
      'Whether balance is part of your picture is individual and worth answering separately.',
    ],
    neverInfer: [
      'Never assume balance involvement from hearing loss alone.',
      'Never rely on sound for anything that matters.',
    ],
    clinicianConfirm: [],
    familyRelevance: ['Steady-Base Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [],
    evidence: [
      { source: 'RNID, information and support', year: 2024, url: 'https://rnid.org.uk/', tier: 'T2', quote: 'RNID' },
    ],
    knownGaps: ['The inner-ear and balance overlap is under-researched; the balance answer covers it functionally.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'learning_disability',
    kind: K,
    canonicalName: 'Learning disability',
    aliases: ['intellectual disability', 'Down’s syndrome', 'learning difficulty', 'LD'],
    category: C.COGNITIVE,
    affects: { programming: false, appAccessibility: true },
    variability: 'A learning disability changes how instructions and plans are best presented, not what training is possible. Support needs and preferences differ widely between people.',
    functionalQuestions: [],
    setupConsiderations: [
      'A consistent, repeating plan with familiar exercises works better than variety here; Volyume plans the same week each week.',
      'Training with a supporter or friend works well; the app keeps each step small and clear.',
    ],
    accessibilityConsiderations: [
      'Plain language, one thing per screen, and no step that runs against a clock.',
      'Each screen works the same way every time; nothing rearranges itself between sessions.',
    ],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'People with a learning disability train fully when instructions are clear and settings supportive.',
    ],
    individual: [
      'Preferred pace, support and communication differ; a supporter can help set things up once and the plan then repeats.',
    ],
    neverInfer: [
      'Never assume physical capability from a learning disability.',
      'Never assume a support worker or family member is involved.',
    ],
    clinicianConfirm: [
      'Any heart or joint checks your GP or team has advised before new exercise, where relevant to you.',
    ],
    familyRelevance: ['Steady-Base Full Body', 'Dumbbell & Band Foundations', 'Supported Machine Builder'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never frame simplified presentation as simplified training.',
    ],
    evidence: [
      { source: 'Mencap', year: 2024, url: 'https://www.mencap.org.uk/', tier: 'T2', quote: 'Mencap, sport and physical activity' },
    ],
    knownGaps: ['Programming-parameter research is sparse; none is needed for functional support.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'short_stature',
    kind: K,
    canonicalName: 'Dwarfism and short stature',
    aliases: ['achondroplasia', 'skeletal dysplasia', 'restricted growth', 'little person', 'short stature'],
    category: C.OTHER,
    affects: { programming: true, appAccessibility: false },
    variability: 'Training capacity is generally ordinary; equipment reach, proportions and any spine or joint considerations your team monitors are what shape the details.',
    functionalQuestions: [
      qAxial('ss_q1', 'If your team has advised keeping load off the spine, this carries it through every plan and suggestion.'),
      qOverhead('ss_q2', 'Overhead reach differs with proportions for some people; leave it out if that is you, and you can bring back any movements that are fine.'),
      qImpact('ss_q3', 'Impact work is a common thing to keep out where joints or spine are monitored; your call.'),
    ],
    setupConsiderations: [
      'Adjustable machines, steps and platforms close most reach gaps; dumbbells and cables adapt more easily than fixed bars.',
      'Seat heights and pad positions matter more than exercise choice; a custom exercise records your working setup.',
    ],
    accessibilityConsiderations: [],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Strength training is fully available; equipment setup does the adapting.',
    ],
    individual: [
      'Spine and joint considerations differ by type and person and belong with your specialist team.',
    ],
    neverInfer: [
      'Never assume reduced capacity from stature.',
      'Never assume spine involvement; that is the specialist’s call and the user’s answer.',
    ],
    clinicianConfirm: [
      'Whether spinal loading, deep flexion or overhead positions carry any personal guidance from your team.',
    ],
    familyRelevance: ['Supported Machine Builder', 'Dumbbell & Band Foundations', 'Steady-Base Full Body'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never generalise spine guidance; it is individual and professionally led.',
    ],
    evidence: [
      { source: 'Journal of Rare Diseases, scoping review of physical activity in achondroplasia', year: 2024, url: 'https://doi.org/10.1007/s44162-024-00048-9', tier: 'T3', quote: 'Physical activity constraints in achondroplasia include orthopedic comorbidities' },
    ],
    knownGaps: ['No training guideline exists for skeletal dysplasia; every boundary stays with the specialist team.'],
    reviewedAt: REVIEWED,
    version: 1,
  },

  {
    id: 'wheelchair_user',
    kind: K,
    canonicalName: 'Wheelchair users',
    aliases: ['wheelchair', 'chair user', 'wheelchair gym', 'seated training'],
    category: C.OTHER,
    affects: { programming: true, appAccessibility: true },
    variability: 'People use wheelchairs for many different reasons, so no single wheelchair workout exists. What is shared is the seated base and the value of strong, balanced shoulders; the rest is individual.',
    functionalQuestions: [
      qSeated('wc_q1', 'The seated base is the shared starting point; everything builds from it.'),
      qFloor('wc_q2', 'Floor work is planned only if transfers work for you.'),
      qGrip('wc_q3', 'If grip is limited, cuffs and grip-light machines keep pulling available.'),
      qOneLeg('wc_q4', 'If your legs are not part of training, Volyume plans and judges only what is.'),
    ],
    setupConsiderations: [
      'Balanced pulling work alongside pressing looks after shoulders that also do daily propulsion.',
      'Cable stations and accessible machines with removable seats cover most of the work.',
    ],
    accessibilityConsiderations: [
      'Everything logs from the chair, one-handed where needed.',
    ],
    fatigueNote: null,
    lateralityNote: null,
    generalisable: [
      'Seated strength training is complete training; a balanced press-and-pull week is the shared core.',
    ],
    individual: [
      'The reason for using a chair changes everything else; the specific answers above matter more than the label.',
    ],
    neverInfer: [
      'Never infer anything else from wheelchair use; it is a seat, not a condition.',
      'Never assume leg involvement either way.',
    ],
    clinicianConfirm: [
      'Any shoulder guidance from a professional who knows your daily load.',
    ],
    familyRelevance: ['Seated Full Body', 'Seated Upper Strength', 'No-Floor Full Body', 'Grip-Light Machine Circuit'],
    professionalNote: PRO_NOTE,
    claimRisks: [
      'Never market a generic wheelchair workout; the variability note is the truth.',
    ],
    evidence: [
      { source: 'Mason et al., Clinical Rehabilitation', year: 2020, url: 'https://pubmed.ncbi.nlm.nih.gov/32397819/', tier: 'T3', quote: 'Managing shoulder pain in manual wheelchair users: a scoping review of conservative treatment interventions' },
      { source: 'WheelPower, wheelchair sport and fitness', year: 2024, url: 'https://www.wheelpower.org.uk/', tier: 'T2', quote: 'WheelPower' },
    ],
    knownGaps: ['Wheelchair users are not one research population; the profile deliberately routes to specific answers.'],
    reviewedAt: REVIEWED,
    version: 1,
  },
]);
