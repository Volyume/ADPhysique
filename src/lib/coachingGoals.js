/**
 * coachingGoals.js
 * Single source of truth for physique categories, training phases,
 * volume overlays, and nutrition constants used across the entire app.
 *
 * Pure data + pure functions — no side effects, no imports, no React.
 */

// ─── Physique categories ────────────────────────────────────────────────────

export const PHYSIQUE_GOAL_GROUPS = ['General', 'Male', 'Female'];

export const PHYSIQUE_GOALS = [
  // ── General ──
  {
    value: 'general_hypertrophy',
    label: 'Build Muscle',
    group: 'General',
    icon: 'trending-up-outline',
    subtitle: 'Balanced muscle growth across the whole body. Good for any level.',
    weakPointsEnabled: true,
  },
  {
    value: 'strength_hypertrophy',
    label: 'Strength + Size',
    group: 'General',
    icon: 'flash-outline',
    subtitle: 'Compound-focused training with heavier loads. Build strength and muscle together.',
    weakPointsEnabled: false,
  },
  {
    value: 'weak_point_spec',
    label: 'Bring Up a Weak Point',
    group: 'General',
    icon: 'git-branch-outline',
    subtitle: 'Target specific muscles you want to bring up while maintaining everything else.',
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

// ─── Training phases ────────────────────────────────────────────────────────
// `nutritionKey` maps to nutritionEngine.js PHASE_ADJUSTMENTS keys
// `coachingPhaseKey` maps to planEngine NUT_MULT and weeklyCoach phaseConfig

export const TRAINING_PHASES = [
  {
    value: 'lean_gain',
    nutritionKey: 'lean_gain',
    coachingPhaseKey: 'mild_bulk',
    label: 'Lean Gain',
    icon: 'arrow-up-circle-outline',
    subtitle: 'Building muscle slowly with minimal fat gain.',
    detail: 'A small calorie surplus. Steady, clean gains. Takes patience but keeps you lean throughout.',
  },
  {
    value: 'bulk',
    nutritionKey: 'build',
    coachingPhaseKey: 'bulk',
    label: 'Bulk',
    icon: 'rocket-outline',
    subtitle: 'Pushing muscle growth with a bigger calorie surplus.',
    detail: 'A moderate surplus. Faster muscle gains with some expected fat gain alongside.',
  },
  {
    value: 'cut',
    nutritionKey: 'mild_cut',
    coachingPhaseKey: 'mild_cut',
    label: 'Cut',
    icon: 'arrow-down-circle-outline',
    subtitle: 'Losing fat while holding onto muscle.',
    detail: 'A calorie deficit with high protein. Train hard to protect your muscle while the fat comes off.',
  },
  {
    value: 'recomp',
    nutritionKey: 'recomp',
    coachingPhaseKey: 'maint',
    label: 'Body Recomposition',
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
export function phaseToCoachingKey(phase) {
  return TRAINING_PHASES.find(p => p.value === phase)?.coachingPhaseKey ?? 'maint';
}

// Map days per week → nutritionEngine activity level
export function daysToActivityLevel(daysPerWeek) {
  if (daysPerWeek <= 2) return 'light';
  if (daysPerWeek <= 4) return 'moderate';
  if (daysPerWeek <= 5) return 'active';
  return 'very_active';
}

// ─── Volume overlays per physique category ──────────────────────────────────
//
// Multipliers applied to computed weekly set targets in planEngine.
// 1.0 = no change. Values are relative to the balanced intermediate baseline.
// Scientific basis for each:
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
// wellness:        Like bikini but heavier lower body overall — quads as well
//                  as glutes and hamstrings. Differentiates from bikini judging.
//
// figure:          Athletic symmetry. Capped shoulders, wide back, developed
//                  glutes. More muscular than bikini, less than physique.
//
// womens_physique: Balanced mass closest to the male bodybuilding model.
//                  All groups developed within a feminine frame.

export const GOAL_OVERLAYS = {
  general_hypertrophy: {},

  strength_hypertrophy: {
    // Compound-dominant. Reduce isolation-heavy muscles, keep prime movers.
    side_delts: 0.70, rear_delts: 0.70, biceps: 0.80, triceps: 0.80,
    abs: 0.80, calves: 0.70, traps: 0.85, forearms: 0.80,
  },

  weak_point_spec: {}, // handled by separate weak-point logic in planEngine

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

// ─── Goal-specific weekly coaching training notes ───────────────────────────

export function getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload) {
  if (matrixDeload) {
    return 'Multiple signs are pointing to fatigue. Cut sets back roughly in half this week and focus on quality over quantity. Your body needs this.';
  }

  if (trainingSignal === 'hold') {
    const holdNotes = {
      general_hypertrophy:  'Performance and recovery need to stabilise. Hold your current plan before adding anything more.',
      strength_hypertrophy: 'Keep your main compound lifts as they are. No need to push load this week.',
      weak_point_spec:      'Stay the course. Hold your priority muscle volume where it is for now.',
      mens_physique:        'Keep shoulder and back sessions steady. Performance is stable and consistent sessions build the look.',
      classic_physique:     'Hold everything steady. Consistent sessions across all groups build proportion over time.',
      bodybuilding:         'No changes needed. Stay with current volume across all groups.',
      bikini:               'Hold your current sessions. Glute and hamstring work is tracking well.',
      wellness:             'Keep lower body volume steady. Recovery needs more time before adding.',
      figure:               'Hold current plan. Keep shoulder and back sessions consistent.',
      womens_physique:      'Maintain current volume. Performance is stable across all groups.',
    };
    return holdNotes[trainingGoal] ?? 'Performance and recovery need to stabilise first. Stay with what you have been doing before adding anything more.';
  }

  if (volumeSignal >= 2) {
    const pushHighNotes = {
      general_hypertrophy:  'Recovery is excellent and performance is climbing. A great window to add a set where you feel strong.',
      strength_hypertrophy: 'Conditions are right to push your main lifts. Add load on your compounds where form holds solid.',
      weak_point_spec:      'Recovery looks excellent. This is the week to push harder on your priority muscles.',
      mens_physique:        'Recovery is on your side. Add volume or effort to shoulder and back sessions this week.',
      classic_physique:     'Good recovery. Calves, shoulders and back should take any extra sets this week.',
      bodybuilding:         'Everything is looking good. Push volume across all groups while recovery supports it.',
      bikini:               'Recovery is strong. This is the week to push your glute and hamstring sessions harder.',
      wellness:             'Energy and recovery are good. Add effort to lower body, especially glutes and quads.',
      figure:               'Great recovery window. Shoulders, back and glutes should get the extra effort this week.',
      womens_physique:      'Recovery is solid. Push across all groups with a focus on back and shoulder development.',
    };
    return pushHighNotes[trainingGoal] ?? 'Recovery looks excellent and performance is climbing. This is exactly the window to push harder and take advantage of it.';
  }

  // volumeSignal === 1 — push lightly
  const pushNotes = {
    general_hypertrophy:  'Recovery is solid. Keep the effort consistent and push for small progress where you can.',
    strength_hypertrophy: 'Recovery is solid. Small increments on your main lifts this week.',
    weak_point_spec:      'Recovery is solid. Keep pushing your priority muscles at a consistent pace.',
    mens_physique:        'Recovery is solid. Keep shoulder and back sessions consistent and focus on quality.',
    classic_physique:     'Recovery is solid. Keep the pace consistent across all groups.',
    bodybuilding:         'Recovery is solid. Consistent effort across all groups this week.',
    bikini:               'Recovery is solid. Keep glute and hamstring sessions consistent with quality execution.',
    wellness:             'Recovery is solid. Keep lower body sessions consistent and precise.',
    figure:               'Recovery is solid. Keep shoulder, back and glute sessions on track.',
    womens_physique:      'Recovery is solid. Keep all groups consistent with quality focus.',
  };
  return pushNotes[trainingGoal] ?? 'Recovery is solid. Keep the effort consistent and push for small progress where you can.';
}
