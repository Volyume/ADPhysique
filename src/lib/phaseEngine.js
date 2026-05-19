/**
 * phaseEngine.js
 * Competition phase awareness engine for the Volyume Coach Engine v2.
 *
 * Determines whether the athlete is in offseason or competition prep,
 * and adjusts volume, intensity, and conditioning recommendations accordingly.
 *
 * Pure functions — no DB calls, no side effects.
 */

// ---------------------------------------------------------------------------
// Phase boundaries
// ---------------------------------------------------------------------------

const PREP_THRESHOLD_WEEKS = 16;   // within 16 weeks of comp = prep phase
const PEAKWEEK_THRESHOLD_WEEKS = 1; // within 1 week = peak week

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

/**
 * Returns the current competition phase given a competition date.
 *
 * @param {string|number|null} compDateMs  - epoch ms or ISO string of comp date (null = offseason)
 * @returns {'offseason'|'early_prep'|'contest_prep'|'peak_week'}
 */
export function getCompPhase(compDateMs) {
  if (!compDateMs) return 'offseason';

  const compDate = typeof compDateMs === 'string' ? new Date(compDateMs).getTime() : compDateMs;
  const now = Date.now();
  const msToComp = compDate - now;

  if (msToComp <= 0) return 'offseason'; // comp has passed
  const weeksToComp = msToComp / (1000 * 60 * 60 * 24 * 7);

  if (weeksToComp <= PEAKWEEK_THRESHOLD_WEEKS) return 'peak_week';
  if (weeksToComp <= 8) return 'contest_prep';
  if (weeksToComp <= PREP_THRESHOLD_WEEKS) return 'early_prep';
  return 'offseason';
}

/**
 * Returns the number of weeks until competition (null if no comp date or comp has passed).
 *
 * @param {string|number|null} compDateMs
 * @returns {number|null}
 */
export function getWeeksToComp(compDateMs) {
  if (!compDateMs) return null;
  const compDate = typeof compDateMs === 'string' ? new Date(compDateMs).getTime() : compDateMs;
  const msToComp = compDate - Date.now();
  if (msToComp <= 0) return null;
  return Math.ceil(msToComp / (1000 * 60 * 60 * 24 * 7));
}

// ---------------------------------------------------------------------------
// Phase modifiers for plan generation
// ---------------------------------------------------------------------------

/**
 * Returns volume and intensity modifiers based on competition phase.
 * These are applied on top of the base landmark multipliers.
 *
 * @param {'offseason'|'early_prep'|'contest_prep'|'peak_week'} phase
 * @returns {{
 *   volumeMultiplier: number,
 *   nutritionPhaseOverride: string|null,
 *   sessionLengthCap: number|null,
 *   conditioningMinutes: number,
 *   posingMinutes: number,
 *   note: string
 * }}
 */
export function getPhaseModifiers(phase) {
  const modifiers = {
    offseason: {
      volumeMultiplier: 1.00,
      nutritionPhaseOverride: null,
      sessionLengthCap: null,
      conditioningMinutes: 0,
      posingMinutes: 0,
      note: 'Offseason: prioritise muscle building. Push volume and eat to support training.',
    },
    early_prep: {
      volumeMultiplier: 0.95,
      nutritionPhaseOverride: 'mild_cut',
      sessionLengthCap: null,
      conditioningMinutes: 20,
      posingMinutes: 10,
      note: 'Early prep: slight volume reduction. Add conditioning and start practising posing.',
    },
    contest_prep: {
      volumeMultiplier: 0.85,
      nutritionPhaseOverride: 'contest_prep',
      sessionLengthCap: 75,
      conditioningMinutes: 20,
      posingMinutes: 10,
      note: 'Contest prep: protect muscle with compound-heavy training. Conditioning and posing every session.',
    },
    peak_week: {
      volumeMultiplier: 0.50,
      nutritionPhaseOverride: 'contest_prep',
      sessionLengthCap: 45,
      conditioningMinutes: 0,
      posingMinutes: 20,
      note: 'Peak week: minimal volume, just enough to keep the muscles full. Posing practice twice daily.',
    },
  };
  return modifiers[phase] ?? modifiers.offseason;
}

// ---------------------------------------------------------------------------
// Phase-aware plan input transformer
// ---------------------------------------------------------------------------

/**
 * Transforms plan inputs to account for competition phase.
 * Call this BEFORE generatePlan() to adjust inputs automatically.
 *
 * @param {object} planInputs  - raw inputs for generatePlan
 * @param {string|number|null} compDateMs
 * @returns {{ inputs: object, phase: string, modifiers: object, weeksToComp: number|null }}
 */
export function applyPhaseToInputs(planInputs, compDateMs) {
  const phase = getCompPhase(compDateMs);
  const modifiers = getPhaseModifiers(phase);
  const weeksToComp = getWeeksToComp(compDateMs);

  const adjustedInputs = { ...planInputs };

  // Override nutrition phase if in prep
  if (modifiers.nutritionPhaseOverride) {
    adjustedInputs.nutritionPhase = modifiers.nutritionPhaseOverride;
  }

  // Cap session length in contest prep
  if (modifiers.sessionLengthCap && (!adjustedInputs.sessionLengthMinutes || adjustedInputs.sessionLengthMinutes > modifiers.sessionLengthCap)) {
    adjustedInputs.sessionLengthMinutes = modifiers.sessionLengthCap;
  }

  // Store phase metadata for downstream use
  adjustedInputs._compPhase = phase;
  adjustedInputs._weeksToComp = weeksToComp;
  adjustedInputs._conditioningMinutes = modifiers.conditioningMinutes;
  adjustedInputs._posingMinutes = modifiers.posingMinutes;

  return { inputs: adjustedInputs, phase, modifiers, weeksToComp };
}

// ---------------------------------------------------------------------------
// Posing / conditioning block builder
// ---------------------------------------------------------------------------

/**
 * Builds the posing and conditioning blocks to append to each session.
 * Returns an array of "bonus blocks" to show at the end of the session summary.
 *
 * @param {'offseason'|'early_prep'|'contest_prep'|'peak_week'} phase
 * @param {number|null} weeksToComp
 * @returns {Array<{ type: 'posing'|'conditioning', durationMinutes: number, instructions: string }>}
 */
export function buildSessionAddons(phase, weeksToComp) {
  const modifiers = getPhaseModifiers(phase);
  const addons = [];

  if (modifiers.conditioningMinutes > 0) {
    addons.push({
      type: 'conditioning',
      durationMinutes: modifiers.conditioningMinutes,
      instructions: getConditioningInstructions(phase, modifiers.conditioningMinutes),
    });
  }

  if (modifiers.posingMinutes > 0) {
    addons.push({
      type: 'posing',
      durationMinutes: modifiers.posingMinutes,
      instructions: getPosingInstructions(phase, modifiers.posingMinutes, weeksToComp),
    });
  }

  return addons;
}

function getConditioningInstructions(phase, minutes) {
  if (phase === 'contest_prep') {
    return `${minutes} minutes of steady-state cardio (bike, treadmill at incline, or elliptical). Keep the pace comfortable so you can hold a conversation. Goal: support body composition without eating into recovery.`;
  }
  return `${minutes} minutes of low-intensity steady cardio. Keep heart rate moderate. This supports fat use without compromising your training sessions.`;
}

function getPosingInstructions(phase, minutes, weeksToComp) {
  const urgency = weeksToComp != null && weeksToComp <= 8
    ? `${weeksToComp} weeks to the show. Every session counts.`
    : `Start building the habit now. Posing takes weeks to look natural.`;
  return `${minutes} minutes of posing practice. Hit all mandatory poses, hold each 30–60 seconds. ${urgency} Film yourself to check lines.`;
}

// ---------------------------------------------------------------------------
// Phase display helpers
// ---------------------------------------------------------------------------

const PHASE_LABELS = {
  offseason:    'Offseason',
  early_prep:   'Early Prep',
  contest_prep: 'Contest Prep',
  peak_week:    'Peak Week',
};

/**
 * Returns a display label for a competition phase.
 *
 * @param {string} phase
 * @returns {string}
 */
export function getPhaseLabel(phase) {
  return PHASE_LABELS[phase] ?? phase;
}

/**
 * Returns a short user-facing description of what the current phase means.
 *
 * @param {string} phase
 * @param {number|null} weeksToComp
 * @returns {string}
 */
export function getPhaseDescription(phase, weeksToComp) {
  switch (phase) {
    case 'offseason':
      return 'Offseason: focus on building size and strength. Eat in a surplus and train hard.';
    case 'early_prep':
      return `Early prep: ${weeksToComp != null ? `${weeksToComp} weeks to the show` : 'competition approaching'}. Begin conditioning and posing. Slightly fewer sets per session.`;
    case 'contest_prep':
      return `Contest prep: ${weeksToComp != null ? `${weeksToComp} weeks out` : 'competition is close'}. Protect your muscle. Conditioning and posing every session.`;
    case 'peak_week':
      return `Peak week: show is this week. Minimal gym work. Posing practice twice daily. Trust your prep.`;
    default:
      return '';
  }
}
