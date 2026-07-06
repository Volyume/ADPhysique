const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');
const coachSource = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');

describe('AthleteProfileScreen physique tile', () => {
  test('uses one adaptive Body fat / Physique tile instead of a permanent Physique Scan stat', () => {
    expect(source).toMatch(/function shouldShowPhysiqueScore\(\{ scan, bodyFat, bodyFatLoggedAt \}\)/);
    expect(source).toMatch(/const showPhysiqueScore = shouldShowPhysiqueScore\(\{/);
    expect(source).toMatch(/bodyFatLoggedAt: summary\.bodyFatLoggedAt/);
    expect(source).toMatch(/label: 'Physique score'/);
    expect(source).toMatch(/label: 'Body fat'/);
    expect(source).toMatch(/Volyume score from private photos/);
    expect(source).toMatch(/not body fat/);
    expect(source).toMatch(/<StatTile label=\{physiqueTile\.label\} value=\{physiqueTile\.value\} sub=\{physiqueTile\.sub\} \/>/);
    expect(source).toMatch(/const focusTile = currentFocusTile\(userProfile\);/);
    expect(source).toMatch(/<Text style=\{styles\.heroFocus\} numberOfLines=\{2\}>\{focusTile\.label\}: \{focusTile\.value\}<\/Text>/);
    expect(source).toMatch(/const statusTile = profileStatusTile\(freshness\);/);
    expect(source).toMatch(/<StatTile label=\{statusTile\.label\} value=\{statusTile\.value\} sub=\{statusTile\.sub\} \/>/);
    expect(source).not.toMatch(/<StatTile label="Physique Scan"/);
  });

  test('keeps gym avatar presets behind the tappable profile image', () => {
    const presetSource = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'profileAvatarPresets.js'), 'utf8');
    expect(source).toMatch(/import \{ AVATAR_PRESETS, avatarPresetFor \} from '\.\.\/lib\/profileAvatarPresets';/);
    expect(presetSource).toMatch(/key: 'volyume_lift', label: 'Strength badge'/);
    expect(presetSource).toMatch(/key: 'volyume_physique', label: 'Physique badge'/);
    expect(presetSource).toMatch(/key: 'volyume_consistency', label: 'Consistency badge'/);
    expect(presetSource).toMatch(/key: 'volyume_progress', label: 'Progress badge'/);
    expect(source).toMatch(/\.\.\.AVATAR_PRESETS\.map\(\(preset\) => \(\{ text: preset\.label/);
    expect(source).toMatch(/Add profile picture or Volyume badge/);
    expect(source).not.toMatch(/title="Change photo"/);
    expect(source).not.toMatch(/title="Remove profile picture"/);
    expect(coachSource).toMatch(/import \{ avatarPresetFor \} from '\.\.\/lib\/profileAvatarPresets';/);
    expect(coachSource).toMatch(/const avatarPresetConfig = userProfile\?\.avatarPreset \? avatarPresetFor\(userProfile\.avatarPreset\) : null;/);
  });
});
