/**
 * capability/directory/injuries.js - the injury / body-region knowledge
 * directory (gap-closure order sections 6, 7; rulings GC-D1/D2/D4).
 *
 * Twenty profiles across nine regions, each validated by
 * validateInjuryProfile. A profile SELECTS QUESTIONS that establish
 * user-confirmed functional constraints through the existing
 * consent-gated flow; it never imposes a ban, never diagnoses, and
 * never encodes recovery rules (R8's reintroduction check found no
 * guideline-level deterministic return rules; the generic conservative
 * model stands).
 *
 * Evidence convention: URLs are LIVE-VERIFIED (2026-08-21); quotes are
 * verbatim from the cited page or the source's own title. The movement-
 * question mapping derives from research/R8-injury-directory-evidence.md
 * (whose per-family evidence lines are the adjudicated basis; its
 * education candidates were NOT shipped - they carried clinical framing
 * this surface must not).
 *
 * Copy law: British English, calm voice, no em dash, function/benefit
 * vocabulary banned (schema-enforced). Education lines report cited
 * public guidance or state what stays available; they never advise
 * management.
 */

import { PROFILE_KIND, INJURY_REGION, QUESTION_KIND } from './schema';

const K = PROFILE_KIND.INJURY;
const R = INJURY_REGION;
const Q = QUESTION_KIND;
const REVIEWED = '2026-08-21';

const PRO_NOTE = 'If something serious has happened, or things are getting worse rather than better, a professional needs to see it. Volyume supports training around what you confirm, nothing more.';
const KEEP_TRAINING = 'Everything this does not touch carries on as normal; Volyume plans and judges only what you have set aside.';
const RI_NOTE = 'When you end a temporary change, movements come back conservatively and volume rebuilds gradually toward your own plan. No timetable is assumed.';

const dq = (id, demandId, wording, whyAsked) => ({ id, kind: Q.DEMAND, demandId, wording, whyAsked });
const fq = (id, familyKeys, wording, whyAsked) => ({ id, kind: Q.FAMILY, familyKeys, wording, whyAsked });

const PRESS_FAMILIES = ['flat', 'incline', 'decline'];
const PULL_FAMILIES = ['vertical_pull', 'horizontal_lat', 'upper_mid_row'];
const CURL_FAMILIES = ['short_head', 'long_head', 'brachialis'];
const TRICEPS_FAMILIES = ['overhead', 'pushdown'];

export const INJURY_PROFILES = Object.freeze([
  // ── Shoulder ──────────────────────────────────────────────────────────
  {
    id: 'shoulder_rotator_cuff_related',
    kind: K,
    region: R.SHOULDER,
    canonicalName: 'Rotator-cuff-related shoulder trouble',
    aliases: ['rotator cuff', 'shoulder pain lifting', 'subacromial', 'painful arc', 'shoulder tendon', 'cuff tear'],
    movementQuestions: [
      dq('rc_q1', 'overhead_position', 'Overhead positions are what I have been told to avoid, or what plays up', 'Overhead work is the most commonly modified movement with this kind of shoulder trouble; people differ, so you set it.'),
      fq('rc_q2', PRESS_FAMILIES, 'Any pressing movements you’re keeping out for now?', 'Pressing plane matters here and differs person to person; excluding a plane keeps the rest available.'),
      fq('rc_q3', ['lateral_raise', 'overhead_press'], 'Is shoulder-raise work something you are keeping out for now?', 'Raise work asks the shoulder directly; some people keep it, some park it for a while.'),
    ],
    education: [
      { text: 'Shoulder trouble like this usually settles; UK guidance suggests getting it looked at if two weeks brings no change.', evidenceIndex: 0 },
      { text: 'Most people keep training everything else while the shoulder has its say.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never exclude a movement the user has not named; presentations differ widely.',
      'Never assume both shoulders; the side picker carries it.',
    ],
    clinicianConfirm: ['Which movements to avoid and for how long, if a professional is guiding you.'],
    claimRisks: ['No recovery promises, no strengthening-fixes-it framing.'],
    evidence: [
      { source: 'NHS, shoulder pain', year: 2026, url: 'https://www.nhs.uk/conditions/shoulder-pain/', tier: 'T1', quote: 'Get medical help if it does not start feeling better after 2 weeks.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'shoulder_instability',
    kind: K,
    region: R.SHOULDER,
    canonicalName: 'Shoulder instability and dislocation history',
    aliases: ['dislocated shoulder', 'shoulder comes out', 'subluxation', 'loose shoulder', 'shoulder instability'],
    movementQuestions: [
      dq('si_q1', 'overhead_position', 'End-range overhead positions are what I avoid', 'Reaching fully overhead is the classic position people with an unstable shoulder set aside first.'),
      fq('si_q2', ['vertical_pull'], 'Is hanging and pulldown work something you are keeping out for now?', 'Hanging work takes the shoulder to its end range under load; a personal call after a dislocation.'),
      fq('si_q3', PRESS_FAMILIES, 'Any pressing movements you’re keeping out for now?', 'Wide, deep pressing asks more of an unstable shoulder than close, controlled pressing; the choice is per movement.'),
    ],
    education: [
      { text: 'UK guidance describes recovery from a dislocated shoulder as usually taking up to twelve weeks, with timings personal.', evidenceIndex: 0 },
      { text: KEEP_TRAINING, evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never assume the direction or degree of instability; the user names the movements.',
    ],
    clinicianConfirm: ['What your clinician says about returning to load after a dislocation; that timeline is theirs to set.'],
    claimRisks: ['No stability-restoring claims.'],
    evidence: [
      { source: 'NHS, dislocated shoulder', year: 2026, url: 'https://www.nhs.uk/conditions/dislocated-shoulder/', tier: 'T1', quote: 'It usually takes up to 12 weeks to recover from a dislocated shoulder.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'shoulder_ac_joint',
    kind: K,
    region: R.SHOULDER,
    canonicalName: 'AC joint trouble',
    aliases: ['AC joint', 'acromioclavicular', 'collarbone end pain', 'shoulder separation', 'top of shoulder'],
    movementQuestions: [
      fq('ac_q1', PRESS_FAMILIES, 'Any pressing movements you’re keeping out for now?', 'Cross-body pressing loads this joint most directly; excluding a plane keeps the rest.'),
      dq('ac_q2', 'overhead_position', 'Overhead positions are out for now', 'Overhead work compresses the joint for some people; entirely your call.'),
      dq('ac_q3', 'weight_bearing_hands', 'Taking weight through my hands, push-up style, is out for now', 'Push-up positions drive load through the joint; a common early exclusion, easily reversed later.'),
    ],
    education: [
      { text: 'Most people keep pulling and lower-body work going in full while this settles.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never grade severity; the user and their clinician own that.'],
    clinicianConfirm: ['Whether a more significant separation needs a specialist look.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, shoulder pain', year: 2026, url: 'https://www.nhs.uk/conditions/shoulder-pain/', tier: 'T1', quote: 'Get medical help if it does not start feeling better after 2 weeks.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'shoulder_biceps_labral',
    kind: K,
    region: R.SHOULDER,
    canonicalName: 'Biceps and labral shoulder trouble',
    aliases: ['SLAP tear', 'labrum', 'labral tear', 'biceps tendon shoulder', 'long head of biceps'],
    movementQuestions: [
      fq('bl_q1', CURL_FAMILIES, 'Have you been told to leave curls alone for a while?', 'Curls load the biceps anchor point at the shoulder directly; people are often asked to pause them first.'),
      fq('bl_q2', ['vertical_pull'], 'Are you keeping chin-ups and pulldowns out for now?', 'Vertical pulling works the same anchor hard; a per-movement call.'),
      dq('bl_q3', 'overhead_position', 'Overhead positions are out for now', 'The overhead position is a common trigger with this kind of trouble.'),
    ],
    education: [
      { text: KEEP_TRAINING, evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never infer type or severity; that is imaging territory and not this app.'],
    clinicianConfirm: ['Whether and when curls and hanging work return; that call is professional.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, shoulder pain', year: 2026, url: 'https://www.nhs.uk/conditions/shoulder-pain/', tier: 'T1', quote: 'How to ease shoulder pain yourself' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'frozen_shoulder',
    kind: K,
    region: R.SHOULDER,
    canonicalName: 'Frozen shoulder',
    aliases: ['adhesive capsulitis', 'stiff shoulder', 'shoulder will not move'],
    movementQuestions: [
      dq('fs_q1', 'overhead_position', 'Overhead positions are not available to me right now', 'A frozen shoulder usually rules overhead out for a while; everything else keeps going.'),
      fq('fs_q2', ['lateral_raise', 'overhead_press'], 'Is shoulder-raise work out for now too?', 'Raises may sit inside or outside your current range; you know which.'),
      dq('fs_q3', 'weight_bearing_hands', 'Weight through my hands, push-up style, is out for now', 'Floor pressing positions ask range this shoulder may not have yet.'),
    ],
    education: [
      { text: 'UK guidance is clear that the stiffness usually eases in time, and that the rest of training can carry on.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never guess the phase; range decides what fits, and the user knows their range.'],
    clinicianConfirm: ['What your clinician suggests about movement work alongside training; that sits with them.'],
    claimRisks: ['No timeline promises; the course is long and personal.'],
    evidence: [
      { source: 'NHS, frozen shoulder', year: 2026, url: 'https://www.nhs.uk/conditions/frozen-shoulder/', tier: 'T1', quote: 'But the pain and stiffness will usually go away eventually.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Elbow and forearm ─────────────────────────────────────────────────
  {
    id: 'elbow_lateral',
    kind: K,
    region: R.ELBOW_FOREARM,
    canonicalName: 'Tennis elbow',
    aliases: ['lateral elbow', 'outside elbow pain', 'lateral epicondylitis', 'gripping hurts elbow'],
    movementQuestions: [
      dq('le_q1', 'grip_bar', 'Firm gripping is what sets it off, so I am limiting it', 'Grip is the usual trigger here; grip-light equipment keeps the same muscles working meanwhile.'),
      fq('le_q2', PULL_FAMILIES, 'Any pulling movements you’re keeping out for now?', 'Rows and pulldowns combine grip with wrist position; some people park a few, straps bring others back.'),
    ],
    education: [
      { text: 'UK guidance describes tennis elbow as usually settling, though it can take a while.', evidenceIndex: 0 },
      { text: 'Straps and cuffs let most pulling carry on while the grip side rests.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park pressing by default; this is a grip-side story for most people.'],
    clinicianConfirm: ['Anything your clinician says about grip work and loading while it settles.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, tennis elbow', year: 2026, url: 'https://www.nhs.uk/conditions/tennis-elbow/', tier: 'T1', quote: 'It usually goes away with rest but can sometimes last over a year.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'elbow_medial',
    kind: K,
    region: R.ELBOW_FOREARM,
    canonicalName: 'Golfer’s elbow',
    aliases: ['medial elbow', 'inside elbow pain', 'medial epicondylitis', 'curls hurt elbow'],
    movementQuestions: [
      fq('me_q1', CURL_FAMILIES, 'Are you leaving curls out for now?', 'Wrist-flexion load in curls is the classic trigger on the inside of the elbow.'),
      dq('me_q2', 'grip_bar', 'Firm gripping sets it off, so I am limiting it', 'Grip drives the same muscle group; grip-light routes keep training available.'),
      fq('me_q3', PULL_FAMILIES, 'Any pulling movements you’re keeping out for now?', 'Underhand pulling combines the triggers for some people; a per-movement call.'),
    ],
    education: [
      { text: 'The same guidance that covers tennis elbow applies here: it usually settles, and the rest of training carries on.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park pressing or lower-body work by default.'],
    clinicianConfirm: ['Anything your clinician says about grip and curl loading while it settles.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, tennis elbow (covers the elbow tendon family)', year: 2026, url: 'https://www.nhs.uk/conditions/tennis-elbow/', tier: 'T1', quote: 'It usually goes away with rest but can sometimes last over a year.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'elbow_biceps_triceps_tendon',
    kind: K,
    region: R.ELBOW_FOREARM,
    canonicalName: 'Biceps and triceps tendon trouble at the elbow',
    aliases: ['biceps tendon elbow', 'triceps tendon', 'elbow tendon', 'pain straightening arm', 'pain bending arm'],
    movementQuestions: [
      fq('bt_q1', CURL_FAMILIES, 'I’ve been told to leave curl work alone for now', 'Loaded elbow bending is the biceps-side trigger; excluding it keeps everything else going.'),
      fq('bt_q2', TRICEPS_FAMILIES, 'I’ve been told to leave triceps extension work alone for now', 'Loaded straightening is the triceps-side trigger; same idea, other side.'),
      fq('bt_q3', PRESS_FAMILIES, 'Any pressing you’re keeping out for now?', 'Heavy pressing finishes through the triceps; some people trim it while things settle.'),
    ],
    education: [
      { text: 'UK guidance on tendon trouble describes milder cases settling over a few weeks.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never assume which side of the elbow; the questions separate them.',
      'A sudden give-way with lost strength is professional territory immediately, not a training question.',
    ],
    clinicianConfirm: ['Any sudden change in strength at the elbow needs a professional look before training decisions.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, tendon injury', year: 2026, url: 'https://www.nhs.uk/conditions/tendonitis/', tier: 'T1', quote: 'You can treat a mild tendon injury yourself and it should feel better within 2 to 3 weeks.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Wrist and hand ────────────────────────────────────────────────────
  {
    id: 'wrist_hand_loading',
    kind: K,
    region: R.WRIST_HAND,
    canonicalName: 'Wrist and hand loading trouble',
    aliases: ['wrist pain', 'sore wrist', 'hand pain lifting', 'thumb pain', 'wrist sprain', 'push-ups hurt wrists'],
    movementQuestions: [
      dq('wh_q1', 'weight_bearing_hands', 'Taking weight through flat hands, push-up style, is out for now', 'Push-up positions bend the wrist furthest under load; the most common wrist exclusion.'),
      dq('wh_q2', 'grip_bar', 'Firm gripping is limited for me right now', 'Grip and wrist share the work; grip-light equipment keeps the training effect.'),
      fq('wh_q3', PULL_FAMILIES, 'Any pulling movements you’re keeping out for now?', 'Heavy pulling loads the wrist through the grip; straps change the equation for many people.'),
    ],
    education: [
      { text: 'UK guidance describes most sprains and strains as manageable at home, settling over weeks.', evidenceIndex: 0 },
      { text: KEEP_TRAINING, evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never assume both wrists; the side picker carries it.',
      'A possible break after a fall is professional territory immediately.',
    ],
    clinicianConfirm: ['After a fracture, when and how load returns is entirely your clinician’s call.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, sprains and strains', year: 2026, url: 'https://www.nhs.uk/conditions/sprains-and-strains/', tier: 'T1', quote: 'Most can be treated at home without seeing a GP.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Spine and trunk ───────────────────────────────────────────────────
  {
    id: 'low_back',
    kind: K,
    region: R.SPINE_TRUNK,
    canonicalName: 'Low back trouble',
    aliases: ['back pain', 'lower back', 'lumbar', 'bad back', 'back spasm', 'sciatica'],
    movementQuestions: [
      dq('lb_q1', 'axial_load', 'I am keeping compressive load off my spine for now', 'Loaded squats and deadlifts compress the spine; excluding that class keeps supported alternatives available.'),
      fq('lb_q2', ['spinal_erector'], 'I’m keeping deadlifts and back-extension work out for now', 'Hinging works the lower back directly; some people keep it, some park it for a while.'),
      fq('lb_q3', ['squat_press'], 'I’m keeping squatting movements out for now', 'Squat-pattern work is a separate call from hinging; you can exclude one and keep the other.'),
      fq('lb_q4', ['flexion', 'rotation'], 'I’m keeping weighted sit-up and twisting work out for now', 'Bending and twisting under load is its own class; anti-movement core work usually stays available.'),
    ],
    education: [
      { text: 'UK guidance describes back trouble as usually improving within a few weeks, and staying active as part of the picture.', evidenceIndex: 0 },
      { text: 'Supported machine work and unaffected training carry on; nothing else is judged by a careful patch.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never park all lower-body work for a back episode; the questions separate the classes.',
      'Leg weakness, numbness or bladder change alongside back trouble is urgent professional territory, never a training question.',
    ],
    clinicianConfirm: ['Which movements to set aside and for how long, if a professional is guiding you.'],
    claimRisks: ['No core-fixes-backs claims; no posture blame.'],
    evidence: [
      { source: 'NHS, back pain', year: 2026, url: 'https://www.nhs.uk/conditions/back-pain/', tier: 'T1', quote: 'It usually improves within a few weeks but can sometimes last longer or keep coming back.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'neck_upper_back',
    kind: K,
    region: R.SPINE_TRUNK,
    canonicalName: 'Neck and upper back trouble',
    aliases: ['neck pain', 'stiff neck', 'trapped nerve neck', 'upper back pain', 'thoracic'],
    movementQuestions: [
      dq('nb_q1', 'overhead_position', 'Overhead positions are out while my neck settles', 'Looking up and pressing up both involve the neck; the most common exclusion here.'),
      dq('nb_q2', 'axial_load', 'I am keeping loaded bars off my back and shoulders for now', 'Bar-on-back positions load through the neck and upper spine; supported alternatives cover the same muscles.'),
      fq('nb_q3', ['overhead_press'], 'It’s overhead pressing specifically I’m keeping out', 'You can keep general overhead reach and still park loaded pressing; this separates them.'),
    ],
    education: [
      { text: 'UK guidance describes neck trouble as usually easing with everyday movement, with a check-in if it lingers.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never park lower-body training for a neck episode.',
      'Arm weakness or persistent tingling alongside neck trouble is professional territory, not a training question.',
    ],
    clinicianConfirm: ['Anything your clinician says about head position and load while it settles.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, neck pain', year: 2026, url: 'https://www.nhs.uk/conditions/neck-pain-and-stiff-neck/', tier: 'T1', quote: 'There are things you can do yourself to ease it, but see a GP if it does not go away.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Hip and groin ─────────────────────────────────────────────────────
  {
    id: 'hip_related_pain',
    kind: K,
    region: R.HIP_GROIN,
    canonicalName: 'Hip-related trouble',
    aliases: ['hip pain', 'hip impingement', 'FAI', 'hip flexor', 'front of hip pain', 'deep squat hip pain'],
    movementQuestions: [
      fq('hip_q1', ['squat_press'], 'I’m keeping deep squats out for now', 'Depth is the usual trigger at the hip; excluding the class now and allowing back specific movements later works well.'),
      fq('hip_q2', ['flexion'], 'I’m keeping weighted leg raises and sit-up work out for now', 'Lifting the leg against load works the same hip corner; a separate call from squatting.'),
      dq('hip_q3', 'impact', 'Impact work is out while the hip settles', 'Jumping loads the hip fast; most people park it first and bring it back last.'),
    ],
    education: [
      { text: 'Research around hip-related pain supports staying active and strong around the hip, with the details personal.', evidenceIndex: 0 },
      { text: 'Hinge-pattern work stays available for most people even when squat depth is parked.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park hinging by default; depth-restricted people usually keep it.'],
    clinicianConfirm: ['What depth and loading to work within, if a professional is guiding you.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, hip pain', year: 2026, url: 'https://www.nhs.uk/conditions/hip-pain/', tier: 'T1', quote: 'There are things you can do to ease the pain.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'adductor_groin',
    kind: K,
    region: R.HIP_GROIN,
    canonicalName: 'Groin and adductor trouble',
    aliases: ['groin strain', 'adductor', 'inner thigh pull', 'groin pain training'],
    movementQuestions: [
      {
        id: 'gr_q1', kind: Q.EXERCISE_LIST,
        exerciseNames: ['Hip Adduction Machine', 'Adductor Squeeze (Ball)', 'Copenhagen Plank', 'Cossack Squat', 'Sumo Deadlift'],
        wording: 'Which of these inner-thigh exercises are you leaving out for now?',
        whyAsked: 'These load the adductors most directly; parking the ones that apply keeps everything else going.',
      },
      dq('gr_q2', 'impact', 'Impact and sprint-type work is out while it settles', 'Fast direction change is the classic trigger; usually the last thing back.'),
    ],
    education: [
      { text: 'UK guidance describes most muscle strains as settling with home care over weeks.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park general leg work; wide-stance and adduction-loaded movements are the specific story.'],
    clinicianConfirm: ['Lingering groin trouble beyond a few weeks is worth a professional look rather than more guessing.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, sprains and strains', year: 2026, url: 'https://www.nhs.uk/conditions/sprains-and-strains/', tier: 'T1', quote: 'Most can be treated at home without seeing a GP.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Knee ──────────────────────────────────────────────────────────────
  {
    id: 'knee_patellofemoral',
    kind: K,
    region: R.KNEE,
    canonicalName: 'Kneecap-area trouble',
    aliases: ['patellofemoral', 'kneecap pain', 'runner’s knee', 'knee pain squatting', 'front of knee'],
    movementQuestions: [
      fq('pf_q1', ['squat_press', 'knee_extension'], 'Which knee movements are you keeping out for now?', 'Deep squatting and leg-extension work load the kneecap most; excluding a class keeps hinging and the rest available.'),
      dq('pf_q2', 'impact', 'Impact work is out while the knee settles', 'Jumping asks the most of the kneecap; usually first out, last back.'),
    ],
    education: [
      { text: 'Guidance around kneecap trouble consistently supports strong hips and legs, with depth and load as your dials.', evidenceIndex: 0 },
      { text: 'Hinge-pattern and hip work usually stays fully available.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park hamstring and hip work for a kneecap episode.'],
    clinicianConfirm: ['What depth to work within, if a professional is guiding you.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, knee pain', year: 2026, url: 'https://www.nhs.uk/conditions/knee-pain/', tier: 'T1', quote: 'They can tell you the right place to get help if you need to see someone.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'knee_tendon',
    kind: K,
    region: R.KNEE,
    canonicalName: 'Knee tendon trouble',
    aliases: ['patellar tendon', 'jumper’s knee', 'quad tendon', 'below kneecap pain'],
    movementQuestions: [
      fq('kt_q1', ['knee_extension'], 'I’m keeping leg-extension work out for now', 'Isolated knee extension loads this tendon hardest; a common first exclusion.'),
      dq('kt_q2', 'impact', 'Jumping and impact work is out for now', 'This is the classic jumping-related tendon; impact usually goes first.'),
      fq('kt_q3', ['squat_press'], 'I’m keeping squats out too', 'Some people keep controlled squatting and park only extensions and jumps; your call.'),
    ],
    education: [
      { text: 'UK guidance describes milder tendon trouble as settling over a few weeks, with heavier cases taking longer.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park hinging or upper-body work for a knee tendon episode.'],
    clinicianConfirm: ['Loading approach while it settles, if a professional is guiding you.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, tendon injury', year: 2026, url: 'https://www.nhs.uk/conditions/tendonitis/', tier: 'T1', quote: 'It can cause joint pain and stiffness, and affect how a tendon moves.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'knee_deep_flexion',
    kind: K,
    region: R.KNEE,
    canonicalName: 'Deep knee bend restrictions',
    aliases: ['meniscus', 'cartilage knee', 'cannot squat deep', 'knee locks', 'deep bend hurts'],
    movementQuestions: [
      fq('kd_q1', ['squat_press'], 'I’m keeping deep squats out for now', 'Depth is the story here; the class goes out, and specific shallower movements come back as allowances.'),
      fq('kd_q2', ['knee_flexion'], 'I’m keeping leg curls out for now', 'Fully bending the knee under load is a separate call from squatting depth.'),
      dq('kd_q3', 'impact', 'Impact and twisting work is out for now', 'Loaded twisting on a bent knee is the classic aggravator with cartilage trouble.'),
    ],
    education: [
      { text: 'Depth is adjustable per movement: excluding the deep class and allowing back specific movements that suit you is the intended pattern.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never assume all knee work is out; range-limited people usually keep plenty.'],
    clinicianConfirm: ['A knee that locks or gives way needs a professional look before training decisions.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, knee pain', year: 2026, url: 'https://www.nhs.uk/conditions/knee-pain/', tier: 'T1', quote: 'They can tell you the right place to get help if you need to see someone.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Ankle and foot ────────────────────────────────────────────────────
  {
    id: 'ankle_sprain_instability',
    kind: K,
    region: R.ANKLE_FOOT,
    canonicalName: 'Ankle sprain and instability',
    aliases: ['sprained ankle', 'rolled ankle', 'weak ankle', 'ankle gives way'],
    movementQuestions: [
      dq('as_q1', 'impact', 'Jumping and impact work is out while it settles', 'Landing asks the most of an ankle that is settling; usually first out, last back.'),
      dq('as_q2', 'balance_high', 'Single-leg and unstable-surface work is out for now', 'High-balance work loads the ankle sideways; supported work keeps everything else going.'),
      fq('as_q3', ['squat_press'], 'I’m keeping standing leg work out for now', 'Some people keep supported standing work and park only free-standing; your call.'),
    ],
    education: [
      { text: 'UK guidance describes most sprains as manageable at home and settling over weeks.', evidenceIndex: 0 },
      { text: 'Seated and machine leg work usually stays available while the ankle settles.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park seated or machine leg work for an ankle sprain.'],
    clinicianConfirm: ['An ankle that cannot take weight at all needs a professional look first.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, sprains and strains', year: 2026, url: 'https://www.nhs.uk/conditions/sprains-and-strains/', tier: 'T1', quote: 'Most can be treated at home without seeing a GP.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
  {
    id: 'achilles_calf_loading',
    kind: K,
    region: R.ANKLE_FOOT,
    canonicalName: 'Achilles and calf loading trouble',
    aliases: ['achilles', 'heel cord', 'calf pain training', 'heel pain', 'plantar'],
    movementQuestions: [
      fq('ac2_q1', ['gastro', 'soleus'], 'I’m keeping calf raises out for now', 'Calf raises load this tendon most directly; both straight-knee and bent-knee classes are your call.'),
      dq('ac2_q2', 'impact', 'Jumping and running-type work is out while it settles', 'Fast loading is the classic trigger here.'),
    ],
    education: [
      { text: 'UK guidance on tendon and heel trouble describes gradual return over weeks as the usual course.', evidenceIndex: 0 },
      { text: KEEP_TRAINING, evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: ['Never park upper-body or seated leg work for a heel episode.'],
    clinicianConfirm: ['A sudden snap sensation at the heel is professional territory immediately.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, heel pain', year: 2026, url: 'https://www.nhs.uk/conditions/heel-pain/', tier: 'T1', quote: 'But sometimes it can be something more serious like a broken bone.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Muscle strains ────────────────────────────────────────────────────
  {
    id: 'muscle_strain',
    kind: K,
    region: R.MUSCLE_TENDON,
    canonicalName: 'Muscle strain',
    aliases: ['pulled muscle', 'muscle tear', 'hamstring strain', 'quad strain', 'calf strain', 'pec strain', 'pulled hamstring'],
    movementQuestions: [
      fq('ms_q1', ['hip_extension', 'knee_flexion', 'spinal_erector'], 'I’m resting my hamstrings and glutes', 'A pulled hamstring or glute rests through its own movements while everything else continues.'),
      fq('ms_q2', ['squat_press', 'knee_extension'], 'I’m resting my quads', 'Same idea for the front of the thigh.'),
      fq('ms_q3', ['gastro', 'soleus'], 'I’m resting my calves', 'And for the calf.'),
      fq('ms_q4', PRESS_FAMILIES, 'I’m resting my chest', 'A chest strain rests through the pressing classes.'),
      fq('ms_q5', [...CURL_FAMILIES, ...TRICEPS_FAMILIES], 'I’m resting my arms', 'Biceps or triceps strains rest through their own classes.'),
    ],
    education: [
      { text: 'UK guidance describes most strains as settling with home care over days to weeks.', evidenceIndex: 0 },
      { text: 'Only the strained area rests; the rest of the plan carries on and nothing is judged by the gap.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: null,
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never rest more than the affected classes; the questions keep it surgical.',
      'A sudden give-way with visible change in the muscle is professional territory.',
    ],
    clinicianConfirm: ['A strain that keeps returning is worth a professional look; the re-start tools cover the meantime.'],
    claimRisks: [],
    evidence: [
      { source: 'NHS, sprains and strains', year: 2026, url: 'https://www.nhs.uk/conditions/sprains-and-strains/', tier: 'T1', quote: 'Most can be treated at home without seeing a GP.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },

  // ── Post-operative ────────────────────────────────────────────────────
  {
    id: 'post_operative',
    kind: K,
    region: R.POST_OPERATIVE,
    canonicalName: 'After an operation',
    aliases: ['surgery', 'post-op', 'after my operation', 'post surgery training', 'ACL surgery'],
    movementQuestions: [
      dq('po_q1', 'axial_load', 'My clinician has me keeping load off my spine for now', 'Recording it here makes every plan and suggestion respect it until your clinician changes it.'),
      dq('po_q2', 'overhead_position', 'My clinician has me avoiding overhead work for now', 'Same idea for overhead restrictions.'),
      dq('po_q3', 'impact', 'My clinician has me avoiding impact for now', 'And for impact.'),
    ],
    education: [
      { text: 'After an operation, the plan is whatever your surgical team says it is; Volyume records their restrictions and builds around them.', evidenceIndex: 0 },
    ],
    professionalNote: PRO_NOTE,
    clinicianBoundary: 'Everything here is clinician-directed. Volyume never proposes a return timeline after an operation; restrictions are recorded as clinician-reported, they cannot be overridden in a plan, and they end only when you confirm your team has changed them.',
    reintroductionNote: RI_NOTE,
    neverInfer: [
      'Never suggest when surgical restrictions might lift.',
      'Never treat a surgical restriction as a preference; it is recorded clinician-reported and protected accordingly.',
    ],
    clinicianConfirm: ['Everything: the restrictions, their scope and when they change are all your surgical team’s calls.'],
    claimRisks: ['No return-to-training timelines, ever.'],
    evidence: [
      { source: 'NHS, sprains and strains (general recovery information)', year: 2026, url: 'https://www.nhs.uk/conditions/sprains-and-strains/', tier: 'T1', quote: 'Rest – stop any exercise or activities and try not to put any weight on the injury.' },
    ],
    reviewedAt: REVIEWED,
    version: 1,
  },
]);
