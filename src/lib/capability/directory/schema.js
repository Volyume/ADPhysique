/**
 * capability/directory/schema.js - the machine-readable schema for the
 * condition and injury knowledge directories (gap-closure order 2026-08-21
 * sections 4, 6, 7, 12; rulings GC-D1..GC-D5).
 *
 * The directories are DETERMINISTIC KNOWLEDGE MODULES (GC-D2): structured
 * data + pure accessors. Selecting a profile is a STATELESS lens (GC-D1) -
 * it pre-selects functional questions and surfaces cited education, and
 * nothing but the confirmed functional constraint rows ever persists. A
 * profile can therefore never create a movement ban by itself: every
 * question maps to the SAME consent-gated functional vocabulary the user
 * could reach without naming anything (function-first, order section 5).
 *
 * Wording law (GC-D4): condition names are permitted here (the directory
 * is the sanctioned, user-initiated surface for them; LEG-30 resolved
 * internally 2026-08-21 - lookup selections are processed transiently
 * on-device for the immediate interaction, retained nowhere, and the
 * surface is deliberately designed to remain outside the MHRA
 * intended-purpose boundary); function/benefit/treatment vocabulary is
 * banned via R2_FUNCTION_TERMS.
 * Copy is British English; no em dash in any user-facing string.
 */

import { DEMAND_AXES } from '../model';
import { R2_FUNCTION_TERMS } from '../../observability/r2Wording';

// ── Closed vocabularies ─────────────────────────────────────────────────

export const PROFILE_KIND = Object.freeze({
  CONDITION: 'condition',
  INJURY: 'injury',
});

export const CONDITION_CATEGORY = Object.freeze({
  NEUROLOGICAL: 'neurological',
  MUSCULOSKELETAL: 'musculoskeletal',
  LIMB_DIFFERENCE: 'limb_difference',
  SENSORY: 'sensory',
  COGNITIVE: 'cognitive',
  SYSTEMIC: 'systemic',
  OTHER: 'other',
});

export const INJURY_REGION = Object.freeze({
  SHOULDER: 'shoulder',
  ELBOW_FOREARM: 'elbow_forearm',
  WRIST_HAND: 'wrist_hand',
  SPINE_TRUNK: 'spine_trunk',
  HIP_GROIN: 'hip_groin',
  KNEE: 'knee',
  ANKLE_FOOT: 'ankle_foot',
  MUSCLE_TENDON: 'muscle_tendon',
  POST_OPERATIVE: 'post_operative',
});

/** How a directory question expresses itself in the existing rule
 *  vocabulary. 'demand' writes one demand rule; 'family' offers one or
 *  more movement-family rules; 'exercise_list' offers specific exercises
 *  (by canonical seed name) to exclude or allow. There is deliberately no
 *  other kind: a profile can only ask what the functional vocabulary can
 *  store (order section 7: questions, never diagnosis bans). */
export const QUESTION_KIND = Object.freeze({
  DEMAND: 'demand',
  FAMILY: 'family',
  EXERCISE_LIST: 'exercise_list',
});

export const EVIDENCE_TIER = Object.freeze(['T1', 'T2', 'T3', 'T4', 'T5']);

/** Family keys a directory question may write rules against - the audited
 *  question vocabulary (MOVEMENT-PATH-AUDIT.md section 1). Validated
 *  against the live seed by the schema suite so profile content can never
 *  bind to a key no exercise carries. */
export const DIRECTORY_FAMILY_KEYS = Object.freeze([
  // back
  'vertical_pull', 'horizontal_lat', 'upper_mid_row', 'shoulder_extension',
  'spinal_erector', 'face_pull',
  // quads
  'squat_press', 'knee_extension',
  // chest planes
  'flat', 'incline', 'decline',
  // delts
  'overhead_press', 'lateral_raise', 'horiz_abduction',
  // biceps
  'short_head', 'long_head', 'brachialis',
  // hamstrings / glutes
  'hip_extension', 'knee_flexion', 'activator', 'pumper', 'stretcher',
  // calves
  'gastro', 'soleus',
  // triceps
  'overhead', 'pushdown',
  // abs
  'flexion', 'anti_extension', 'rotation',
]);

const DEMAND_IDS = new Set(DEMAND_AXES.map(a => a.id));
const FAMILY_KEYS = new Set(DIRECTORY_FAMILY_KEYS);
const CATEGORY_VALUES = new Set(Object.values(CONDITION_CATEGORY));
const REGION_VALUES = new Set(Object.values(INJURY_REGION));
const TIER_VALUES = new Set(EVIDENCE_TIER);

// ── Wording checks (GC-D4) ──────────────────────────────────────────────

const EM_DASH = /—/;

/** Returns the banned term a user-facing directory string contains, or
 *  null. Condition names are NOT checked here (directory surface);
 *  function/benefit vocabulary and em dashes are. */
export function directoryWordingViolation(text) {
  const t = String(text ?? '');
  if (EM_DASH.test(t)) return 'em_dash';
  for (const re of R2_FUNCTION_TERMS) {
    if (re.test(t)) return String(re);
  }
  return null;
}

// ── Validators (pure; the suite runs them over every shipped profile) ───

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function pushWordingErrors(errors, path, text) {
  const violation = directoryWordingViolation(text);
  if (violation) errors.push(`${path}: banned wording ${violation}`);
}

function validateEvidence(errors, evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    errors.push('evidence: at least one cited source is required');
    return;
  }
  evidence.forEach((e, i) => {
    if (!isNonEmptyString(e?.source)) errors.push(`evidence[${i}].source missing`);
    if (!Number.isInteger(e?.year)) errors.push(`evidence[${i}].year must be an integer`);
    if (!isNonEmptyString(e?.url) || !/^https?:\/\//.test(e.url)) errors.push(`evidence[${i}].url must be a URL`);
    if (!TIER_VALUES.has(e?.tier)) errors.push(`evidence[${i}].tier must be one of ${EVIDENCE_TIER.join('/')}`);
    if (!isNonEmptyString(e?.quote)) errors.push(`evidence[${i}].quote missing`);
    else if (e.quote.trim().split(/\s+/).length > 30) errors.push(`evidence[${i}].quote over 30 words`);
  });
}

function validateQuestion(errors, q, i, prefix) {
  const path = `${prefix}[${i}]`;
  if (!isNonEmptyString(q?.id)) errors.push(`${path}.id missing`);
  if (!isNonEmptyString(q?.wording)) errors.push(`${path}.wording missing`);
  else pushWordingErrors(errors, `${path}.wording`, q.wording);
  if (!isNonEmptyString(q?.whyAsked)) errors.push(`${path}.whyAsked missing`);
  else pushWordingErrors(errors, `${path}.whyAsked`, q.whyAsked);
  switch (q?.kind) {
    case QUESTION_KIND.DEMAND:
      if (!DEMAND_IDS.has(q?.demandId)) errors.push(`${path}.demandId '${q?.demandId}' is not a demand rule id`);
      break;
    case QUESTION_KIND.FAMILY:
      if (!Array.isArray(q?.familyKeys) || q.familyKeys.length === 0) {
        errors.push(`${path}.familyKeys must be a non-empty array`);
      } else {
        q.familyKeys.forEach(k => { if (!FAMILY_KEYS.has(k)) errors.push(`${path}.familyKeys '${k}' is not a directory family key`); });
      }
      break;
    case QUESTION_KIND.EXERCISE_LIST:
      if (!Array.isArray(q?.exerciseNames) || q.exerciseNames.length === 0) {
        errors.push(`${path}.exerciseNames must be a non-empty array`);
      } else {
        q.exerciseNames.forEach(n => { if (!isNonEmptyString(n)) errors.push(`${path}.exerciseNames entry must be a canonical name`); });
      }
      break;
    default:
      errors.push(`${path}.kind '${q?.kind}' is not a question kind`);
  }
}

function validateCommon(errors, p) {
  if (!isNonEmptyString(p?.id) || !/^[a-z0-9_]+$/.test(p.id)) errors.push('id must be lower_snake');
  if (!isNonEmptyString(p?.canonicalName)) errors.push('canonicalName missing');
  if (!Array.isArray(p?.aliases) || p.aliases.length === 0) errors.push('aliases must be a non-empty array');
  else p.aliases.forEach((a, i) => { if (!isNonEmptyString(a)) errors.push(`aliases[${i}] empty`); });
  if (!Array.isArray(p?.neverInfer) || p.neverInfer.length === 0) {
    errors.push('neverInfer: every profile must state what the app must never assume');
  }
  if (!Array.isArray(p?.clinicianConfirm)) errors.push('clinicianConfirm must be an array');
  validateEvidence(errors, p?.evidence);
  if (!isNonEmptyString(p?.reviewedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt)) errors.push('reviewedAt must be YYYY-MM-DD');
  if (!Number.isInteger(p?.version) || p.version < 1) errors.push('version must be a positive integer');
}

/** Validate a condition profile. Returns an array of error strings
 *  (empty = valid). */
export function validateConditionProfile(p) {
  const errors = [];
  validateCommon(errors, p);
  if (p?.kind !== PROFILE_KIND.CONDITION) errors.push("kind must be 'condition'");
  if (!CATEGORY_VALUES.has(p?.category)) errors.push(`category '${p?.category}' unknown`);
  if (typeof p?.affects?.programming !== 'boolean' || typeof p?.affects?.appAccessibility !== 'boolean') {
    errors.push('affects.programming and affects.appAccessibility must be booleans');
  }
  if (!isNonEmptyString(p?.variability)) errors.push('variability statement missing');
  else pushWordingErrors(errors, 'variability', p.variability);
  if (!Array.isArray(p?.functionalQuestions)) errors.push('functionalQuestions must be an array');
  else p.functionalQuestions.forEach((q, i) => validateQuestion(errors, q, i, 'functionalQuestions'));
  for (const field of ['setupConsiderations', 'accessibilityConsiderations', 'generalisable', 'individual', 'claimRisks']) {
    const v = p?.[field];
    if (!Array.isArray(v)) errors.push(`${field} must be an array`);
    else v.forEach((s, i) => {
      if (!isNonEmptyString(s)) errors.push(`${field}[${i}] empty`);
      else pushWordingErrors(errors, `${field}[${i}]`, s);
    });
  }
  if (p?.fatigueNote != null) pushWordingErrors(errors, 'fatigueNote', p.fatigueNote);
  if (!Array.isArray(p?.familyRelevance)) errors.push('familyRelevance must be an array (routine family plan names)');
  if (!isNonEmptyString(p?.professionalNote)) {
    errors.push('professionalNote: every condition profile carries the professional-guidance boundary line');
  } else {
    pushWordingErrors(errors, 'professionalNote', p.professionalNote);
  }
  return errors;
}

/** Validate an injury profile. Returns an array of error strings
 *  (empty = valid). */
export function validateInjuryProfile(p) {
  const errors = [];
  validateCommon(errors, p);
  if (p?.kind !== PROFILE_KIND.INJURY) errors.push("kind must be 'injury'");
  if (!REGION_VALUES.has(p?.region)) errors.push(`region '${p?.region}' unknown`);
  if (!Array.isArray(p?.movementQuestions) || p.movementQuestions.length === 0) {
    errors.push('movementQuestions: an injury profile exists to select questions (order section 7)');
  } else {
    p.movementQuestions.forEach((q, i) => validateQuestion(errors, q, i, 'movementQuestions'));
  }
  if (!Array.isArray(p?.education)) errors.push('education must be an array');
  else p.education.forEach((e, i) => {
    if (!isNonEmptyString(e?.text)) errors.push(`education[${i}].text missing`);
    else pushWordingErrors(errors, `education[${i}].text`, e.text);
    if (!Number.isInteger(e?.evidenceIndex) || e.evidenceIndex < 0 || e.evidenceIndex >= (p?.evidence?.length ?? 0)) {
      errors.push(`education[${i}].evidenceIndex must reference an evidence entry`);
    }
  });
  if (!isNonEmptyString(p?.professionalNote)) {
    errors.push('professionalNote: every injury profile carries the professional-guidance boundary line');
  } else {
    pushWordingErrors(errors, 'professionalNote', p.professionalNote);
  }
  if (p?.region === INJURY_REGION.POST_OPERATIVE && !isNonEmptyString(p?.clinicianBoundary)) {
    errors.push('clinicianBoundary: post-operative profiles must state the clinician-directed boundary');
  }
  if (p?.reintroductionNote != null) pushWordingErrors(errors, 'reintroductionNote', p.reintroductionNote);
  return errors;
}
