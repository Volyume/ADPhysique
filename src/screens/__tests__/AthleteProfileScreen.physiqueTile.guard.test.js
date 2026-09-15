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
    // O2 (comprehension-and-trust audit 2026-08-06): StatTile grew an
    // optional `tooltip` prop for the persistent Volyume Score explanation;
    // re-anchored to accept it while still pinning the same label/value/sub
    // binding to physiqueTile.
    expect(source).toMatch(/<StatTile label=\{physiqueTile\.label\} value=\{physiqueTile\.value\} sub=\{physiqueTile\.sub\} tooltip=\{showPhysiqueScore \? GLOSSARY\.volyumeScore : null\} \/>/);
    expect(source).toMatch(/weightLoggedAt/);
    expect(source).toMatch(/Open Progress to add body weight/);
    expect(source).toMatch(/Add your main lifts/);
    expect(source).not.toMatch(/Add body weight and main lifts/);
    expect(source).not.toMatch(/Add in Progress/);
    expect(source).toMatch(/const focusTile = currentFocusTile\(userProfile\);/);
    // CP-10 batch G: heroFocus gained its live-theme override
    // (style={[styles.heroFocus, live.heroFocus]}). The pinned contract is
    // unchanged -- the focus line still renders through styles.heroFocus at
    // two lines max -- so the pattern accepts either spelling.
    expect(source).toMatch(/<Text style=\{(?:styles\.heroFocus|\[styles\.heroFocus, live\.heroFocus\])\} numberOfLines=\{2\}>\{focusTile\.value\}<\/Text>/);
    expect(source).toMatch(/const statusTile = profileStatusTile\(freshness\);/);
    expect(source).toMatch(/<StatTile label=\{statusTile\.label\} value=\{statusTile\.value\} sub=\{statusTile\.sub\} \/>/);
    expect(source).not.toMatch(/<StatTile label="Physique Scan"/);
  });

  // Comment-stripped so the prose in AthleteProfileScreen.js explaining the
  // defect (which necessarily quotes the old fall-through) cannot satisfy or
  // defeat these patterns. Same helper as NowCard.workingWeight.guard.
  function code(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  test('withholds the body-fat percentage under calm mode or an open ED flag, not just the score', () => {
    // ED-SAFETY REGRESSION GUARD (defect found and fixed 2026-09-15).
    //
    // The tile is a three-way fall-through: Volyume Score, then the user's
    // logged body fat, then an unscored placeholder. Only the FIRST branch
    // carried `!photoSuppressed`, so a user under calm mode or an open
    // ED-pattern flag lost the score and was handed a raw body-fat percentage
    // instead -- worse for the at-risk reader than the figure being withheld,
    // and the exact number D166 ruled against surfacing. The second branch now
    // carries the same guard.
    //
    // This suite FAILS if that guard is ever removed from the body-fat branch.
    // There is no version of this screen where a suppressed user sees a body
    // composition figure; if the tile is restructured, the replacement has to
    // keep that property and this test has to be re-anchored to prove it, not
    // deleted.
    const src = code(source);
    expect(src).toMatch(/\} : \(!photoSuppressed && summary\.bodyFatLoggedAt\) \? \{/);
    // The unguarded spelling must never come back.
    expect(src).not.toMatch(/\} : summary\.bodyFatLoggedAt \? \{/);
    // And the score branch keeps its own guard, so BOTH composition branches
    // are gated by the one hook rather than one of them drifting.
    expect(src).toMatch(/const showPhysiqueScore = !photoSuppressed && shouldShowPhysiqueScore\(\{/);
    expect(src).toMatch(/const photoSuppressed = usePhotoSuppression\(user\?\.id\);/);
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
    expect(source).toMatch(/avatarClearButton: \{[\s\S]*minHeight: touchTarget\.minimum/);
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
    // CP-10 batch G: profileFocus gained its live-theme override, same
    // contract-preserving widening as heroFocus above.
    expect(coachSource).toMatch(/<Text style=\{(?:styles\.profileFocus|\[styles\.profileFocus, live\.profileFocus\])\} numberOfLines=\{2\}>\{profileFocus\}<\/Text>/);
    // The "Coach is available on Pro" pitch card / "Upgrade to Pro" NavRow
    // pin REMOVED (D137, fully free product): every account has a coach
    // now, so there is nothing left to pitch -- YouScreen.js's own comment
    // says so directly ("the Free pitch branch (opening ProUpgrade) is
    // retired -- there is nothing left to pitch"). Confirmed gone from
    // source, not merely reworded.
    expect(coachSource).not.toMatch(/Coach is available on Pro/);
    expect(coachSource).not.toContain("navigate('ProUpgrade'");
  });
});
