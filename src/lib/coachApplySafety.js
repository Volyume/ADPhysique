/**
 * Re-read every safety fact used by a positive coach volume adjustment.
 * `null` means the read was unknown/failed and the caller must withhold the
 * entire increase; a Set means the check completed and names only the muscles
 * that must be held.
 */
export async function loadVolumeIncreaseHolds(userId, overrides = {}) {
  try {
    // eslint-disable-next-line global-require
    const capability = overrides.capability ?? require('./capability/resolve');
    // eslint-disable-next-line global-require
    const database = overrides.database ?? require('./database');
    const capState = await capability.loadCapabilityResolveState(userId, {});
    if (!capability.capabilityKnown(capState)) return null;

    const holdMuscles = new Set();
    // Standing disability/capability baselines always remain safety facts.
    // Temporary episodes participate unless the user explicitly chose the
    // existing "hold my plan" mode, which intentionally drives no adaptation.
    const drivenRuleIds = new Set((capState.restrictions ?? [])
      .filter((rule) => rule.role === 'baseline'
        || (rule.role === 'episode' && rule.adaptationMode !== 'hold'))
      .map((rule) => rule.id));
    if (drivenRuleIds.size) {
      const library = await database.getAllExercises();
      for (const exercise of library) {
        if (!exercise?.primaryMuscle) continue;
        if (capability.blockingConflicts(capState, exercise)
          .some((conflict) => !conflict.unknown && drivenRuleIds.has(conflict.constraintId))) {
          holdMuscles.add(exercise.primaryMuscle);
        }
      }
    }

    // No local catch: a failed check-in read is unknown soreness, not proof
    // that no muscle is sore. The outer boundary converts it to fail-closed.
    const checkin = await database.getLatestCheckin(userId);
    for (const muscle of String(checkin?.soreMuscles ?? '').split(',')) {
      if (muscle.trim()) holdMuscles.add(muscle.trim());
    }
    return holdMuscles;
  } catch (_) {
    return null;
  }
}
