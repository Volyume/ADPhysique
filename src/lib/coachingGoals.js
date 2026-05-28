/**
 * coachingGoals.js
 * Single source of truth for physique categories, training phases,
 * volume overlays, and nutrition constants used across the entire app.
 *
 * Pure data + pure functions, no side effects, no imports, no React.
 *
 * Conceptual model (post-merge):
 *   - PHYSIQUE_GOALS  → "Which body are you building?"  (volume distribution)
 *     This is the optional, secondary question, most users default to
 *     'general'. Competitive lifters pick their division.
 *   - TRAINING_PHASES → "What are you focused on right now?"  (calories +
 *     plan tuning + emphasis). This is the primary, prominent question.
 *
 * Previous shape had these two concepts mixed: PHYSIQUE_GOALS used to
 * include 'general_hypertrophy' / 'strength_hypertrophy' / 'weak_point_spec'
 * which weren't physique categories at all. Those moved into TRAINING_PHASES
 * (strength_size, weak_point) and a 'general' default replaces them in
 * PHYSIQUE_GOALS. migrateProfileGoals() handles the data migration.
 */

// ─── Physique categories ────────────────────────────────────────────────────

export const PHYSIQUE_GOAL_GROUPS = ['General', 'Male', 'Female'];

export const PHYSIQUE_GOALS = [
  // ── Default: not competing ──
  {
    value: 'general',
    label: 'Not competing',
    group: 'General',
    icon: 'body-outline',
    subtitle: 'Balanced volume across all muscle groups. Default for everyone not training for a specific category.',
    weakPointsEnabled: true,
  },

  // ── Male physique categories ──
  {
    value: 'mens_physique',
    label: "Men's Physique",
    group: 'Male',
    icon: 'body-outline',
    subtitle: "Upper-body width and a sharp V-shape. Shoulder and lat development are the priority.",
    weakPointsEnabled: true,
    coachingNote: "This category is judged on upper body shape and conditioning. Shoulder width and back development drive the look.",
  },
  {
    value: 'classic_physique',
    label: 'Classic Physique',
    group: 'Male',
    icon: 'star-outline',
    subtitle: 'Proportional symmetry and balanced mass. Calves, shoulders and waist definition are all judged.',
    weakPointsEnabled: true,
    coachingNote: "Judged on proportion, symmetry and conditioning. Calves are specifically highlighted and waist control matters.",
  },
  {
    value: 'bodybuilding',
    label: 'Bodybuilding',
    group: 'Male',
    icon: 'barbell-outline',
    subtitle: 'Maximum muscle development across every group. High volume, full body emphasis.',
    weakPointsEnabled: true,
    coachingNote: "Everything is judged. Volume is pushed across all muscle groups with nothing de-prioritised.",
  },

  // ── Female physique categories ──
  {
    value: 'bikini',
    label: 'Bikini',
    group: 'Female',
    icon: 'sunny-outline',
    subtitle: 'Glutes and hamstrings are the priority. Lean, athletic upper body with a small waist.',
    weakPointsEnabled: true,
    coachingNote: "Judged on glute shape, hamstring development, conditioning and overall flow. Upper body stays lean and capped.",
  },
  {
    value: 'wellness',
    label: 'Wellness',
    group: 'Female',
    icon: 'leaf-outline',
    subtitle: 'Developed glutes, quads and legs with a balanced upper body. More muscular lower body than Bikini.',
    weakPointsEnabled: true,
    coachingNote: "Thicker lower body than Bikini. Glutes, quads and hamstrings all developed. Upper body proportional.",
  },
  {
    value: 'figure',
    label: 'Figure',
    group: 'Female',
    icon: 'diamond-outline',
    subtitle: 'Athletic symmetry across the whole body. Capped shoulders, developed back and glutes.',
    weakPointsEnabled: true,
    coachingNote: "Judged on symmetry, conditioning and athletic lines. Shoulder width, back detail and glute development all matter.",
  },
  {
    value: 'womens_physique',
    label: "Women's Physique",
    group: 'Female',
    icon: 'ribbon-outline',
    subtitle: 'Balanced muscle development with feminine lines. Most muscular of the female categories.',
    weakPointsEnabled: true,
    coachingNote: "Judged on muscle balance, conditioning and overall presentation. Full body development with all groups on show.",
  },
];

export const GOAL_LABELS = Object.fromEntries(
  PHYSIQUE_GOALS.map(g => [g.value, g.label])
);

export const GOALS_WITH_WEAK_POINTS = PHYSIQUE_GOALS
  .filter(g => g.weakPointsEnabled)
  .map(g => g.value);

// Weak-point muscle list. Single source of truth so plan generation,
// validation, and the UI selector all agree on the canonical names.
// Used by ProGoalSetupScreen (chip grid) and consumed by plan-generation
// paths when the user has selected one or more.
export const WEAK_POINT_MUSCLES = Object.freeze([
  'Chest', 'Upper Chest', 'Lats / Back Width', 'Back Thickness',
  'Side Delts', 'Rear Delts', 'Front Delts',
  'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core / Abs', 'Traps',
]);

// Goals that trigger the Article 9 / safety-check goal-lock prompt
// during onboarding. Per ONBOARDING_SEQUENCE_LOCKED.md screen 6:
// shown to users picking physique competition divisions (where
// aggressive cuts are the norm) OR the recomp phase at an advanced
// experience level. Maps the locked spec's "physique_competition"
// and "advanced_recomp" to the actual values in this codebase.
const _GOAL_LOCK_COMPETITION_VALUES = new Set([
  'mens_physique',
  'classic_physique',
  'bodybuilding',
  'bikini',
  'figure',
  'wellness',
]);

export function shouldShowGoalLockOnboarding({ trainingGoal, trainingPhase, experience }) {
  if (trainingGoal && _GOAL_LOCK_COMPETITION_VALUES.has(trainingGoal)) return true;
  if (trainingPhase === 'recomp' && experience === 'advanced') return true;
  return false;
}

// True when the training goal is a physique-competition category. The
// coach uses this (alongside the advanced goal-lock flag) to gate the
// high-day / low-day macro cycle, which only fires for competitors and
// advanced cutters.
export function isCompetitionGoal(trainingGoal) {
  return !!trainingGoal && _GOAL_LOCK_COMPETITION_VALUES.has(trainingGoal);
}

// ─── Training phases (the primary "what are you focused on" question) ──────
// `nutritionKey` maps to nutritionEngine.js PHASE_ADJUSTMENTS keys
// `coachingPhaseKey` maps to planEngine NUT_MULT and weeklyCoach phaseConfig

export const TRAINING_PHASES = [
  {
    value: 'lean_gain',
    nutritionKey: 'lean_gain',
    coachingPhaseKey: 'mild_bulk',
    label: 'Build muscle (lean gain)',
    icon: 'arrow-up-circle-outline',
    subtitle: 'Building muscle slowly with minimal fat gain.',
    detail: 'A small calorie surplus. Steady, clean gains. Takes patience but keeps you lean throughout.',
  },
  {
    value: 'bulk',
    nutritionKey: 'build',
    coachingPhaseKey: 'bulk',
    label: 'Build muscle (bulk)',
    icon: 'rocket-outline',
    subtitle: 'Pushing muscle growth with a bigger calorie surplus.',
    detail: 'A moderate surplus. Faster muscle gains with some expected fat gain alongside.',
  },
  {
    // Previously a "PHYSIQUE_GOAL" called strength_hypertrophy.
    // It's actually a training emphasis for the current block, not a body shape.
    value: 'strength_size',
    nutritionKey: 'build',
    coachingPhaseKey: 'bulk',
    label: 'Strength + size',
    icon: 'flash-outline',
    subtitle: 'Compound-focused training with heavier loads. Build strength and muscle together.',
    detail: 'Eating in a surplus to support strength gains. Compound lifts take priority, isolation work pared back.',
  },
  {
    // Previously a "PHYSIQUE_GOAL" called weak_point_spec.
    // Specialisation block, strip volume from non-priority muscles.
    value: 'weak_point',
    nutritionKey: 'lean_gain',
    coachingPhaseKey: 'mild_bulk',
    label: 'Bring up a weak point',
    icon: 'git-branch-outline',
    subtitle: 'Target specific muscles you want to bring up while maintaining everything else.',
    detail: 'Priority muscles get MAV-level volume; everything else drops to maintenance. Pair with a small surplus.',
  },
  {
    value: 'cut',
    nutritionKey: 'mild_cut',
    coachingPhaseKey: 'mild_cut',
    label: 'Lose fat (cut)',
    icon: 'arrow-down-circle-outline',
    subtitle: 'Losing fat while holding onto muscle.',
    detail: 'A calorie deficit with high protein. Train hard to protect your muscle while the fat comes off.',
  },
  {
    value: 'recomp',
    nutritionKey: 'recomp',
    coachingPhaseKey: 'maint',
    label: 'Recomp',
    icon: 'swap-horizontal-outline',
    subtitle: 'Improving your shape without a big change in weight.',
    detail: 'Eating around maintenance. A slow process, but works well for beginners and people returning after a break.',
  },
  {
    value: 'maintain',
    nutritionKey: 'maintain',
    coachingPhaseKey: 'maint',
    label: 'Maintain',
    icon: 'pause-circle-outline',
    subtitle: 'Holding your current weight and focusing on performance.',
    detail: 'Eating at maintenance. Keep what you have, get stronger, and stay consistent.',
  },
];

export const PHASE_LABELS = Object.fromEntries(
  TRAINING_PHASES.map(p => [p.value, p.label])
);

// Map user-facing phase value → nutritionEngine goal key
export function phaseToNutritionKey(phase) {
  return TRAINING_PHASES.find(p => p.value === phase)?.nutritionKey ?? 'maintain';
}

// Map user-facing phase value → coaching system phase key (for weeklyCoach / planEngine)
// Falls back to 'maint' for unknown phases but logs a warning first, silent
// maintenance was masking data corruption / version skew bugs.
export function phaseToCoachingKey(phase) {
  const match = TRAINING_PHASES.find(p => p.value === phase);
  if (!match) {
    try {
      // eslint-disable-next-line global-require
      require('./errorLog').logWarn(
        'coachingGoals.phaseToCoachingKey',
        `unknown phase "${phase}", falling back to maint`,
        { phase },
      );
    } catch (_) { /* errorLog itself failed, nothing more to do */ }
    return 'maint';
  }
  return match.coachingPhaseKey;
}

// Map days per week → nutritionEngine activity level
export function daysToActivityLevel(daysPerWeek) {
  if (daysPerWeek <= 2) return 'light';
  if (daysPerWeek <= 4) return 'moderate';
  if (daysPerWeek <= 5) return 'active';
  return 'very_active';
}

// ─── Profile migration ─────────────────────────────────────────────────────
//
// Existing user profiles store legacy trainingGoal values that no longer
// exist post-merge. Run this on every profile load so the new code paths
// see clean values without forcing the user to re-onboard.

export function migrateProfileGoals(profile) {
  if (!profile || typeof profile !== 'object') return profile;
  const out = { ...profile };
  switch (profile.trainingGoal) {
    case 'general_hypertrophy':
      out.trainingGoal = 'general';
      break;
    case 'strength_hypertrophy':
      out.trainingGoal = 'general';
      // Don't clobber a user-set phase that's already a phase (e.g. cut).
      // Only assume strength_size if their phase was the auto-derived
      // surplus default (bulk / lean_gain).
      if (profile.trainingPhase === 'bulk' || profile.trainingPhase === 'lean_gain' || !profile.trainingPhase) {
        out.trainingPhase = 'strength_size';
      }
      break;
    case 'weak_point_spec':
      out.trainingGoal = 'general';
      if (profile.trainingPhase === 'bulk' || profile.trainingPhase === 'lean_gain' || !profile.trainingPhase) {
        out.trainingPhase = 'weak_point';
      }
      break;
    default:
      // mens_physique / classic_physique / bodybuilding / bikini /
      // wellness / figure / womens_physique → unchanged
      break;
  }
  return out;
}

// ─── Volume overlays per physique category ──────────────────────────────────
//
// Multipliers applied to computed weekly set targets in planEngine.
// 1.0 = no change. Values are relative to the balanced intermediate baseline.
// Scientific basis for each:
//
// general:         Balanced volume across all muscles. No overlay applied.
//
// mens_physique:   Judged from front/back, upper body only. Shoulder width
//                  and lat V-taper drive the look. Legs de-emphasised (shorts).
//                  Traps reduced (large traps narrow the shoulder-neck visual gap).
//
// classic_physique: All groups judged. Calves specifically called out.
//                   Shoulder-to-waist ratio critical. Waist control via reduced abs.
//
// bodybuilding:    Maximum development everywhere. Everything pushed toward MRV.
//
// bikini:          Glutes and hamstrings are the primary judging criterion.
//                  Upper body stays lean and proportional. Waist stays small.
//
// wellness:        Like bikini but heavier lower body overall, quads as well
//                  as glutes and hamstrings. Differentiates from bikini judging.
//
// figure:          Athletic symmetry. Capped shoulders, wide back, developed
//                  glutes. More muscular than bikini, less than physique.
//
// womens_physique: Balanced mass closest to the male bodybuilding model.
//                  All groups developed within a feminine frame.

export const GOAL_OVERLAYS = {
  general: {}, // no per-muscle bias, balanced volume

  // ── Male categories ──

  mens_physique: {
    side_delts:  1.40,  // primary width driver
    back:        1.30,  // lats create the V-taper
    rear_delts:  1.25,  // shoulder roundness and detail
    chest:       1.20,  // upper-body mass
    biceps:      1.15,
    triceps:     1.15,
    front_delts: 1.10,
    traps:       0.70,  // large traps narrow the shoulder-neck gap visually
    quads:       0.70,  // covered in competition, de-emphasised
    hamstrings:  0.70,
    glutes:      0.60,
    calves:      0.65,
    abs:         0.60,  // waist stays visually small
  },

  classic_physique: {
    calves:      1.30,  // heavily judged in classic
    side_delts:  1.25,
    back:        1.20,
    chest:       1.15,
    biceps:      1.15,
    triceps:     1.15,
    quads:       1.15,  // legs are displayed
    rear_delts:  1.15,
    hamstrings:  1.10,
    glutes:      1.05,
    traps:       0.85,
    abs:         0.80,  // waist control
  },

  bodybuilding: {
    chest:       1.20,
    back:        1.20,
    side_delts:  1.20,
    biceps:      1.20,
    triceps:     1.20,
    quads:       1.20,
    calves:      1.25,
    rear_delts:  1.15,
    hamstrings:  1.15,
    glutes:      1.15,
    traps:       1.15,
    abs:         1.10,
    front_delts: 1.10,
    forearms:    1.15,
  },

  // ── Female categories ──

  bikini: {
    glutes:      1.55,  // primary judging criterion
    hamstrings:  1.35,  // glute-ham tie-in
    side_delts:  1.15,  // capped shoulder look
    back:        1.10,
    rear_delts:  1.05,
    quads:       0.90,  // not overly developed
    chest:       0.80,
    biceps:      0.90,
    triceps:     0.90,
    abs:         0.65,  // waist stays small
    traps:       0.70,
    calves:      0.80,
  },

  wellness: {
    glutes:      1.60,  // even more than bikini
    quads:       1.35,  // key differentiator from bikini
    hamstrings:  1.40,
    side_delts:  1.10,
    back:        1.10,
    rear_delts:  1.05,
    chest:       0.85,
    biceps:      0.90,
    triceps:     0.90,
    abs:         0.70,
    traps:       0.75,
    calves:      0.90,
  },

  figure: {
    side_delts:  1.30,  // capped shoulders central to figure
    back:        1.25,
    rear_delts:  1.20,
    glutes:      1.25,
    hamstrings:  1.15,
    quads:       1.10,
    chest:       1.05,
    biceps:      1.10,
    triceps:     1.10,
    abs:         0.80,
    calves:      1.05,
    traps:       0.85,
  },

  womens_physique: {
    side_delts:  1.25,
    back:        1.25,
    quads:       1.20,
    glutes:      1.20,
    hamstrings:  1.15,
    chest:       1.10,
    biceps:      1.15,
    triceps:     1.15,
    calves:      1.15,
    rear_delts:  1.15,
    abs:         0.85,
    traps:       1.00,
  },
};

// ─── Phase overlays (applied on top of GOAL_OVERLAYS) ──────────────────────
//
// strength_size: compound-dominant. Reduce isolation-heavy muscles so the
//   sets budget goes to prime movers. (Previously lived under
//   GOAL_OVERLAYS.strength_hypertrophy when this was mis-filed as a goal.)
//
// weak_point: handled by separate weak-point logic in planEngine, empty
//   here so we don't double-up.
//
// All other phases (bulk, cut, lean_gain, recomp, maintain) leave the
// per-muscle distribution alone. Phase affects calories and overall volume
// tuning via NUT_MULT, not muscle-level emphasis.

export const PHASE_OVERLAYS = {
  strength_size: {
    side_delts: 0.70, rear_delts: 0.70, biceps: 0.80, triceps: 0.80,
    abs: 0.80, calves: 0.70, traps: 0.85, forearms: 0.80,
  },
  weak_point: {}, // handled by separate weak-point logic in planEngine
};

// ─── Goal-specific weekly coaching training notes ───────────────────────────

export function getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload) {
  if (matrixDeload) {
    return 'Multiple signs are pointing to fatigue. Cut sets back roughly in half this week and focus on quality over quantity. Your body needs this.';
  }

  if (trainingSignal === 'hold') {
    const holdNotes = {
      general:          'Performance and recovery need to stabilise. Hold your current plan before adding anything more.',
      mens_physique:    'Keep shoulder and back sessions steady. Performance is stable and consistent sessions build the look.',
      classic_physique: 'Hold everything steady. Consistent sessions across all groups build proportion over time.',
      bodybuilding:     'No changes needed. Stay with current volume across all groups.',
      bikini:           'Hold your current sessions. Glute and hamstring work is tracking well.',
      wellness:         'Keep lower body volume steady. Recovery needs more time before adding.',
      figure:           'Hold current plan. Keep shoulder and back sessions consistent.',
      womens_physique:  'Maintain current volume. Performance is stable across all groups.',
    };
    return holdNotes[trainingGoal] ?? holdNotes.general;
  }

  if (volumeSignal >= 2) {
    const pushHighNotes = {
      general:          'Recovery is excellent and performance is climbing. A great window to add a set where you feel strong.',
      mens_physique:    'Recovery is on your side. Add volume or effort to shoulder and back sessions this week.',
      classic_physique: 'Good recovery. Calves, shoulders and back should take any extra sets this week.',
      bodybuilding:     'Everything is looking good. Push volume across all groups while recovery supports it.',
      bikini:           'Recovery is strong. This is the week to push your glute and hamstring sessions harder.',
      wellness:         'Energy and recovery are good. Add effort to lower body, especially glutes and quads.',
      figure:           'Great recovery window. Shoulders, back and glutes should get the extra effort this week.',
      womens_physique:  'Recovery is solid. Push across all groups with a focus on back and shoulder development.',
    };
    return pushHighNotes[trainingGoal] ?? pushHighNotes.general;
  }

  // volumeSignal === 1, push lightly
  const pushNotes = {
    general:          'Recovery is solid. Keep the effort consistent and push for small progress where you can.',
    mens_physique:    'Recovery is solid. Keep shoulder and back sessions consistent and focus on quality.',
    classic_physique: 'Recovery is solid. Keep the pace consistent across all groups.',
    bodybuilding:     'Recovery is solid. Consistent effort across all groups this week.',
    bikini:           'Recovery is solid. Keep glute and hamstring sessions consistent with quality execution.',
    wellness:         'Recovery is solid. Keep lower body sessions consistent and precise.',
    figure:           'Recovery is solid. Keep shoulder, back and glute sessions on track.',
    womens_physique:  'Recovery is solid. Keep all groups consistent with quality focus.',
  };
  return pushNotes[trainingGoal] ?? pushNotes.general;
}
