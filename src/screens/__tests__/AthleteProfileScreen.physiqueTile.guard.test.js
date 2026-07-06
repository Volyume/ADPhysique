const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');

describe('AthleteProfileScreen physique tile', () => {
  test('uses one adaptive Body fat / Physique tile instead of a permanent Physique Scan stat', () => {
    expect(source).toMatch(/function shouldShowPhysiqueScore\(\{ scan, bodyFat, bodyFatLoggedAt \}\)/);
    expect(source).toMatch(/const showPhysiqueScore = shouldShowPhysiqueScore\(\{/);
    expect(source).toMatch(/bodyFatLoggedAt: summary\.bodyFatLoggedAt/);
    expect(source).toMatch(/label: 'Physique score'/);
    expect(source).toMatch(/label: 'Body fat'/);
    expect(source).toMatch(/not body fat/);
    expect(source).toMatch(/<StatTile label=\{physiqueTile\.label\} value=\{physiqueTile\.value\} sub=\{physiqueTile\.sub\} \/>/);
    expect(source).toMatch(/const focusTile = currentFocusTile\(userProfile\);/);
    expect(source).toMatch(/<Text style=\{styles\.heroFocus\} numberOfLines=\{1\}>\{focusTile\.label\}: \{focusTile\.value\}<\/Text>/);
    expect(source).toMatch(/const statusTile = profileStatusTile\(freshness\);/);
    expect(source).toMatch(/<StatTile label=\{statusTile\.label\} value=\{statusTile\.value\} sub=\{statusTile\.sub\} \/>/);
    expect(source).not.toMatch(/<StatTile label="Physique Scan"/);
  });

  test('keeps gym avatar presets behind the tappable profile image', () => {
    expect(source).toMatch(/const AVATAR_PRESETS = Object\.freeze/);
    expect(source).toMatch(/key: 'volyume_lift', label: 'Strength avatar'/);
    expect(source).toMatch(/key: 'volyume_physique', label: 'Physique avatar'/);
    expect(source).toMatch(/key: 'volyume_consistency', label: 'Consistency avatar'/);
    expect(source).toMatch(/key: 'volyume_progress', label: 'Progress avatar'/);
    expect(source).toMatch(/\.\.\.AVATAR_PRESETS\.map\(\(preset\) => \(\{ text: preset\.label/);
    expect(source).toMatch(/Add profile photo or avatar/);
    expect(source).not.toMatch(/title="Change photo"/);
    expect(source).not.toMatch(/title="Remove profile photo"/);
  });
});
