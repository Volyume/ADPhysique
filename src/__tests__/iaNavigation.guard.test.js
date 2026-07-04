import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const NAV = fs.readFileSync(path.join(ROOT, 'navigation', 'RootNavigator.js'), 'utf8');
const COACH = fs.readFileSync(path.join(ROOT, 'screens', 'YouScreen.js'), 'utf8');
const PROFILE = fs.readFileSync(path.join(ROOT, 'screens', 'AthleteProfileScreen.js'), 'utf8');

describe('premium tab IA', () => {
  test('visible bottom tabs are Today, Train, Nutrition, Progress, Coach', () => {
    expect(NAV).toMatch(/<Tab\.Screen name="HomeTab"[\s\S]{0,120}?title: 'Today'/);
    expect(NAV).toMatch(/<Tab\.Screen name="PlansTab"[\s\S]{0,120}?title: 'Train'/);
    expect(NAV).toMatch(/<Tab\.Screen name="DiaryTab"[\s\S]{0,120}?title: 'Nutrition'/);
    expect(NAV).toMatch(/<Tab\.Screen name="ProgressTab"[\s\S]{0,120}?title: 'Progress'/);
    expect(NAV).toMatch(/<Tab\.Screen name="ProfileTab"[\s\S]{0,120}?title: 'Coach'/);
  });

  test('internal tab route ids stay stable for push, deep links and cross-tab jumps', () => {
    expect(NAV).toContain('Internal tab route ids are kept stable');
    for (const route of ['HomeTab', 'PlansTab', 'DiaryTab', 'ProgressTab', 'ProfileTab']) {
      expect(NAV).toContain(`name="${route}"`);
    }
  });

  test('Coach root is deterministic and links profile as a separate surface', () => {
    expect(COACH).toContain('Rules-based decisions. No chat. No guesswork.');
    expect(COACH).toContain('The coach is not a chatbot');
    expect(COACH).toContain("navigation.navigate('AthleteProfile')");
  });

  test('Athlete profile includes avatar, strength baselines, Physique Scan and data refresh paths', () => {
    expect(PROFILE).toContain('saveAvatarPhoto');
    expect(PROFILE).toContain('getStrengthLevel');
    expect(PROFILE).toContain('getProgressScanCoachSummary');
    expect(PROFILE).toContain('Retake in consistent light and poses every 2 to 4 weeks');
    expect(PROFILE).toContain("navigateCrossTab(navigation, 'ProgressTab', 'ProgressPhotos')");
  });
});
