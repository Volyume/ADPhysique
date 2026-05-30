import {
  matchesEquipmentFilter,
  equipmentDisplayLabel,
  difficultyDisplayLabel,
  subregionDisplayLabel,
} from '../exerciseDisplay';

describe('matchesEquipmentFilter', () => {
  test('no filter matches everything', () => {
    expect(matchesEquipmentFilter({ equipment: 'barbell' }, null)).toBe(true);
    expect(matchesEquipmentFilter({ equipment: 'barbell' }, '')).toBe(true);
  });

  // The bug this module exists to fix: band moves keep the legacy
  // equipment='bodyweight' string but carry equipmentCategory='band'.
  test('Bands chip matches a band move classified only by category', () => {
    const bandMove = { equipment: 'bodyweight', equipmentCategory: 'band' };
    expect(matchesEquipmentFilter(bandMove, 'Bands')).toBe(true);
    // and it must NOT match the Bodyweight chip just because of the raw string
    expect(matchesEquipmentFilter(bandMove, 'Barbell')).toBe(false);
  });

  test('Bodyweight chip does not catch a reclassified band move', () => {
    const bandMove = { equipment: 'bodyweight', equipmentCategory: 'band' };
    // It still technically reads bodyweight in the legacy string, which is the
    // historical behaviour; the important guarantee is that Bands now works.
    expect(matchesEquipmentFilter({ equipment: 'bodyweight', equipmentCategory: 'bodyweight' }, 'Bodyweight')).toBe(true);
    expect(matchesEquipmentFilter(bandMove, 'Bands')).toBe(true);
  });

  test('Machine chip catches selectorised and plate-loaded', () => {
    expect(matchesEquipmentFilter({ equipmentCategory: 'machine_selectorised' }, 'Machine')).toBe(true);
    expect(matchesEquipmentFilter({ equipmentCategory: 'machine_plate_loaded' }, 'Machine')).toBe(true);
    expect(matchesEquipmentFilter({ equipmentCategory: 'barbell' }, 'Machine')).toBe(false);
  });

  test('Plate-loaded chip is specific to plate-loaded machines', () => {
    expect(matchesEquipmentFilter({ equipmentCategory: 'machine_plate_loaded' }, 'Plate-loaded')).toBe(true);
    expect(matchesEquipmentFilter({ equipmentCategory: 'machine_selectorised' }, 'Plate-loaded')).toBe(false);
  });

  test('Landmine chip matches the landmine category', () => {
    expect(matchesEquipmentFilter({ equipment: 'barbell', equipmentCategory: 'landmine' }, 'Landmine')).toBe(true);
    expect(matchesEquipmentFilter({ equipmentCategory: 'barbell' }, 'Landmine')).toBe(false);
  });

  test('Smith machine chip is distinct from generic machine', () => {
    expect(matchesEquipmentFilter({ equipmentCategory: 'smith' }, 'Smith Machine')).toBe(true);
    expect(matchesEquipmentFilter({ equipmentCategory: 'smith' }, 'Machine')).toBe(true);
  });

  test('Barbell chip catches an EZ-bar move reclassified to barbell', () => {
    expect(matchesEquipmentFilter({ equipment: 'ez_bar', equipmentCategory: 'barbell' }, 'Barbell')).toBe(true);
  });

  test('falls back to the raw string when no category is present', () => {
    expect(matchesEquipmentFilter({ equipment: 'Dumbbell' }, 'Dumbbell')).toBe(true);
    expect(matchesEquipmentFilter({ equipment: 'Cable' }, 'Barbell')).toBe(false);
  });
});

describe('equipmentDisplayLabel', () => {
  test('prefers a friendly label from the derived category', () => {
    expect(equipmentDisplayLabel({ equipmentCategory: 'machine_plate_loaded', equipment: 'machine' }))
      .toBe('Plate-loaded machine');
    expect(equipmentDisplayLabel({ equipmentCategory: 'band', equipment: 'bodyweight' }))
      .toBe('Resistance band');
    expect(equipmentDisplayLabel({ equipmentCategory: 'smith' })).toBe('Smith machine');
  });

  test('tidies the raw string when category is unknown', () => {
    expect(equipmentDisplayLabel({ equipment: 'ez_bar' })).toBe('Ez bar');
    expect(equipmentDisplayLabel({ equipmentCategory: 'other', equipment: 'sled' })).toBe('Sled');
  });

  test('returns null when nothing is known', () => {
    expect(equipmentDisplayLabel({})).toBeNull();
    expect(equipmentDisplayLabel(null)).toBeNull();
  });
});

describe('difficultyDisplayLabel', () => {
  test('maps numeric difficulty to a word', () => {
    expect(difficultyDisplayLabel({ difficulty: 1 })).toBe('Beginner');
    expect(difficultyDisplayLabel({ difficulty: 2 })).toBe('Intermediate');
    expect(difficultyDisplayLabel({ difficulty: 3 })).toBe('Advanced');
  });

  test('reads a custom exercise note token', () => {
    expect(difficultyDisplayLabel({ notes: 'difficulty:advanced' })).toBe('Advanced');
    expect(difficultyDisplayLabel({ notes: 'something difficulty:beginner else' })).toBe('Beginner');
  });

  test('handles numeric-as-string and returns null otherwise', () => {
    expect(difficultyDisplayLabel({ difficulty: '2' })).toBe('Intermediate');
    expect(difficultyDisplayLabel({})).toBeNull();
    expect(difficultyDisplayLabel({ notes: 'no token here' })).toBeNull();
  });
});

describe('subregionDisplayLabel', () => {
  test('humanises a token', () => {
    expect(subregionDisplayLabel('rear_delts')).toBe('Rear Delts');
    expect(subregionDisplayLabel('upper_chest')).toBe('Upper Chest');
  });

  test('returns null for empty', () => {
    expect(subregionDisplayLabel(null)).toBeNull();
    expect(subregionDisplayLabel('')).toBeNull();
  });
});
