const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');
const coachSource = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');

describe('AthleteProfileScreen physique tile', () => {
  test('uses one adaptive progress-photo / Body fat / Volyume Score tile instead of a permanent Physique Scan stat', () => {
    expect(source).toMatch(/function shouldShowPhysiqueScore\(\{ scan, bodyFat, bodyFatLoggedAt \}\)/);
    expect(source).toMatch(/const showPhysiqueScore = shouldShowPhysiqueScore\(\{/);
    expect(source).toMatch(/bodyFatLoggedAt: summary\.bodyFatLoggedAt/);
    expect(source).toMatch(/label: 'Volyume Score'/);
    expect(source).toMatch(/label: 'Body fat'/);
    expect(source).toMatch(/label: 'Progress photos'/);
    expect(source).toMatch(/Private progress index, not body fat/);
    expect(source).toMatch(/Add front and back photos to create your private Volyume Score/);
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
    expect(source).toMatch(/import ProfileAvatarMark from '\.\.\/components\/ProfileAvatarMark';/);
    expect(presetSource).toMatch(/key: 'volyume_lift', label: 'Strength'/);
    expect(presetSource).toMatch(/key: 'volyume_physique', label: 'Physique'/);
    expect(presetSource).toMatch(/key: 'volyume_consistency', label: 'Consistency'/);
    expect(presetSource).toMatch(/key: 'volyume_progress', label: 'Progress'/);
    expect(presetSource).toMatch(/key: 'volyume_power', label: 'Power'/);
    expect(presetSource).toMatch(/key: 'volyume_conditioning', label: 'Conditioning'/);
    expect(source).toMatch(/<BottomSheet[\s\S]*accessibilityLabel="Select avatar"/);
    expect(source).toMatch(/Volyume avatars/);
    expect(source).toMatch(/styles\.avatarPresetGrid/);
    expect(source).toMatch(/AVATAR_PRESETS\.map\(\(preset\) => \{/);
    expect(source).toMatch(/accessibilityLabel="Clear current avatar"/);
    expect(source).toMatch(/Photo from phone/);
    expect(source).not.toMatch(/\.\.\.AVATAR_PRESETS\.map\(\(preset\) => \(\{ text: preset\.label/);
    expect(source).toMatch(/Add profile picture or Volyume avatar/);
    expect(source).not.toMatch(/title="Change photo"/);
    expect(source).not.toMatch(/title="Remove profile picture"/);
    expect(source).not.toMatch(/<Text style=\{styles\.removeAvatarText\}>Remove profile picture<\/Text>/);
    expect(coachSource).toMatch(/import ProfileAvatarMark from '\.\.\/components\/ProfileAvatarMark';/);
    expect(coachSource).toMatch(/presetKey=\{userProfile\?\.avatarPreset\}/);
  });
});
