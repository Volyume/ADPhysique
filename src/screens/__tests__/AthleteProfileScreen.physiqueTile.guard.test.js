const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');
const coachSource = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');
const settingsProfileSource = fs.readFileSync(path.join(__dirname, '..', 'SettingsProfileScreen.js'), 'utf8');

describe('AthleteProfileScreen physique tile', () => {
  test('uses one adaptive progress-photo / Body fat / Volyume Score tile instead of a permanent Physique Scan stat', () => {
    expect(source).toMatch(/function shouldShowPhysiqueScore\(\{ scan, bodyFat, bodyFatLoggedAt \}\)/);
    expect(source).toMatch(/function physiqueScoreTileValue\(scan\)/);
    expect(source).toMatch(/function physiqueScoreTileSub\(scan\)/);
    expect(source).toMatch(/progressScanAssessmentForDisplay/);
    expect(source).toMatch(/progressScanScoreForDisplay/);
    // Wave 4 (suppression unification): the tile now also fails closed on
    // calm mode / an open ED-pattern flag via the shared usePhotoSuppression
    // hook, so this pinned expression grew a `!photoSuppressed &&` guard.
    // Old: `const showPhysiqueScore = shouldShowPhysiqueScore({`.
    expect(source).toMatch(/const showPhysiqueScore = !photoSuppressed && shouldShowPhysiqueScore\(\{/);
    expect(source).toMatch(/bodyFatLoggedAt: summary\.bodyFatLoggedAt/);
    expect(source).toMatch(/label: 'Volyume Score'/);
    expect(source).toMatch(/label: 'Body fat'/);
    expect(source).toMatch(/label: 'Progress photos'/);
    expect(source).not.toMatch(/Private Volyume Score, not a body fat estimate/);
    expect(source).not.toMatch(/private Volyume Score/);
    expect(source).toMatch(/Latest photo set saved/);
    expect(source).toMatch(/Add front, back and side photos to create your Volyume Score/);
    expect(source).toMatch(/value: physiqueScoreTileValue\(summary\.scan\)/);
    expect(source).toMatch(/sub: physiqueScoreTileSub\(summary\.scan\)/);
    expect(source).not.toMatch(/const score = Number\(scan\?\.visualLeannessScore\)/);
    expect(source).not.toMatch(/progressSignal === 'baseline' \? 'baseline'/);
    expect(source).toMatch(/<StatTile label=\{physiqueTile\.label\} value=\{physiqueTile\.value\} sub=\{physiqueTile\.sub\} \/>/);
    expect(source).toMatch(/weightLoggedAt/);
    expect(source).toMatch(/Open Progress to add body weight/);
    expect(source).toMatch(/Add your main lifts/);
    expect(source).not.toMatch(/Add body weight and main lifts/);
    expect(source).not.toMatch(/Add in Progress/);
    expect(source).toMatch(/const focusTile = currentFocusTile\(userProfile\);/);
    expect(source).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{styles\.heroFocus\} numberOfLines=\{2\}>\{focusTile\.value\}<\/Text>/);
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
    expect(source).toMatch(/Choose an avatar/);
    expect(source).toMatch(/styles\.avatarPresetGrid/);
    expect(source).toMatch(/AVATAR_PRESETS\.map\(\(preset\) => \{/);
    expect(source).toMatch(/accessibilityLabel="Clear current avatar"/);
    expect(source).toMatch(/avatarClearButton: \{[\s\S]*minHeight: 44/);
    expect(source).toMatch(/borderColor: withAlpha\(colors\.error, alpha\.edge\)/);
    expect(source).toMatch(/Photo from phone/);
    expect(source).toMatch(/avatarPresetGrid: \{[\s\S]*justifyContent: 'space-between'/);
    expect(source).toMatch(/avatarPresetOption: \{[\s\S]*flexBasis: '30\.5%'[\s\S]*backgroundColor: colors\.surface/);
    expect(source).toMatch(/avatarPresetOptionSelected: \{[\s\S]*borderColor: colors\.primary,[\s\S]*backgroundColor: colors\.surfaceElevated/);
    expect(source).toMatch(/avatarPresetOptionTextSelected: \{ color: colors\.textPrimary \}/);
    expect(source).not.toMatch(/avatarPresetOptionSelected: \{[\s\S]*backgroundColor: colors\.primaryBg/);
    expect(source).not.toMatch(/\.\.\.AVATAR_PRESETS\.map\(\(preset\) => \(\{ text: preset\.label/);
    expect(source).toMatch(/Add profile picture or Volyume avatar/);
    expect(source).not.toMatch(/title="Change photo"/);
    expect(source).not.toMatch(/title="Remove profile picture"/);
    expect(source).not.toMatch(/<Text style=\{styles\.removeAvatarText\}>Remove profile picture<\/Text>/);
    expect(coachSource).toMatch(/import ProfileAvatarMark from '\.\.\/components\/ProfileAvatarMark';/);
    expect(coachSource).toMatch(/presetKey=\{userProfile\?\.avatarPreset\}/);
  });

  test('Coach and profile settings use product wording, not internal coach-run language', () => {
    expect(settingsProfileSource).toContain('next weekly check-in');
    expect(settingsProfileSource).not.toMatch(/weekly coach run/);
    expect(coachSource).toMatch(/function profileFocusLine\(profile = \{\}\)/);
    expect(coachSource).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{styles\.profileFocus\} numberOfLines=\{2\}>\{profileFocus\}<\/Text>/);
    expect(coachSource).toMatch(/label="Upgrade to Pro"/);
    expect(coachSource).toMatch(/pro=\{!isPro\}/);
  });
});
