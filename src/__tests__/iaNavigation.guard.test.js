import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const NAV = fs.readFileSync(path.join(ROOT, 'navigation', 'RootNavigator.js'), 'utf8');
const COACH = fs.readFileSync(path.join(ROOT, 'screens', 'YouScreen.js'), 'utf8');
// D231: the Athlete profile is retired; these are the homes its parts moved to.
const SETTINGS_PROFILE = fs.readFileSync(path.join(ROOT, 'screens', 'SettingsProfileScreen.js'), 'utf8');
const AVATAR_PICKER = fs.readFileSync(path.join(ROOT, 'components', 'ProfileAvatarPicker.js'), 'utf8');
const LIFT_PROGRESS = fs.readFileSync(path.join(ROOT, 'screens', 'LiftProgressScreen.js'), 'utf8');
const PROGRESS_PHOTOS = fs.readFileSync(path.join(ROOT, 'screens', 'ProgressPhotosScreen.js'), 'utf8');

describe('premium tab IA', () => {
  // D231 (app layout rework, batch 4): five tabs, in this order, and no Progress
  // tab (its rows live on Coach). Was: Today, Train, Nutrition, Progress, Coach.
  test('visible bottom tabs are Today, Train, Nutrition, Coach, Community, in that order, and there is no Progress tab', () => {
    const tabs = [...NAV.matchAll(/<Tab\.Screen name="(\w+)"[^\n]*?title: '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(tabs).toEqual([
      ['HomeTab', 'Today'],
      ['PlansTab', 'Train'],
      ['DiaryTab', 'Nutrition'],
      ['ProfileTab', 'Coach'],
      ['CommunityTab', 'Community'],
    ]);
    expect(NAV).not.toContain('name="ProgressTab"');
    expect(NAV).not.toMatch(/function ProgressStack\b/);
    expect(NAV).not.toContain('component={AnalyticsScreen}');
  });

  test('internal tab route ids stay stable for push, deep links and cross-tab jumps', () => {
    expect(NAV).toContain('Internal tab route ids are kept stable');
    for (const route of ['HomeTab', 'PlansTab', 'DiaryTab', 'CommunityTab', 'ProfileTab']) {
      expect(NAV).toContain(`name="${route}"`);
    }
  });

  test('Coach root is deterministic and links profile as a separate surface', () => {
    // RE-POINTED (D231, batch 4): the header subtitle "Weekly coaching based on
    // what you log." goes ("Header 'Coach' with the settings button; the subtitle
    // goes"), so the header carries the title and the gear and nothing else.
    expect(COACH).not.toContain('Weekly coaching based on what you log.');
    expect(COACH).not.toMatch(/<ScreenHeader[^>]*subtitle=/);
    expect(COACH).toMatch(/<ScreenHeader\s+title="Coach"\s+right=/);
    // Same-meaning re-anchor (C5-P7-08, D96): the Free pitch used to describe
    // the coach in the present tense ("Your coach reads your logs..."), on the
    // tab that then tells a Free user coaching is Pro. It now says what the
    // tab BECOMES on Pro, and what is here either way. The Pro half of the
    // card (the property this test pins for a Pro user) is unchanged.
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    // RE-POINTED (D231, batch 4): the "Weekly coaching decision" card and its body
    // sentence are replaced by the one This week card, which reads "This week's
    // decision · See why" once the decision exists.
    expect(COACH).not.toContain('What your coach changed this week, what stayed the same, and why.');
    expect(COACH).toContain("This week's decision \\u00B7 See why");
    // 'On Pro this tab carries your weekly check-in' pinned the Free-vs-Pro
    // pitch copy on this card. D137 (fully free product) retired that whole
    // branch -- YouScreen.js:474-476 says so directly ("the Free pitch
    // branch (opening ProUpgrade) is retired -- there is nothing left to
    // pitch"). The behaviour it described no longer exists, so the
    // assertion is removed rather than inverted.
    expect(COACH).not.toMatch(/chatbot|No chat|AI chat/i);
    // D231: the profile card and the Athlete profile screen are gone from Coach.
    expect(COACH).not.toContain("navigation.navigate('AthleteProfile')");
  });

  // Carried over from the retired AthleteProfileScreen.physiqueTile guard (D231):
  // the "Coach is available on Pro" pitch card / "Upgrade to Pro" row stay gone
  // (D137, fully free product), and Coach opens no upgrade screen.
  test('Coach carries no Pro pitch and opens no upgrade screen (D137)', () => {
    expect(COACH).not.toMatch(/Coach is available on Pro/);
    expect(COACH).not.toContain("navigate('ProUpgrade'");
  });

  test('the retired Athlete profile has no door, and its parts live where D231 put them', () => {
    // Owner answer (verbatim): "Retire it, move its parts (Recommended)".
    expect(NAV).not.toContain('AthleteProfile');
    // Photo and avatar: Settings, Profile.
    expect(SETTINGS_PROFILE).toContain('ProfileAvatarPicker');
    expect(AVATAR_PICKER).toContain('saveAvatarPhoto');
    expect(AVATAR_PICKER).toContain('avatarPresetFor');
    // Strength level: Training (Lift Progress).
    expect(LIFT_PROGRESS).toContain('getStrengthLevel');
    expect(LIFT_PROGRESS).toContain('strengthRowSub');
    // Volyume Score: Progress photos, with its explanation.
    expect(PROGRESS_PHOTOS).toContain('formatVolyumeScore');
    expect(PROGRESS_PHOTOS).toContain('GLOSSARY.volyumeScore');
  });
});
