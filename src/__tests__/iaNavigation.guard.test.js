import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const NAV = fs.readFileSync(path.join(ROOT, 'navigation', 'RootNavigator.js'), 'utf8');
const COACH = fs.readFileSync(path.join(ROOT, 'screens', 'YouScreen.js'), 'utf8');
const PROFILE = fs.readFileSync(path.join(ROOT, 'screens', 'AthleteProfileScreen.js'), 'utf8');
const PROFILE_SUMMARY = fs.readFileSync(path.join(ROOT, 'lib', 'athleteProfileSummary.js'), 'utf8');
const PROFILE_FRESHNESS = fs.readFileSync(path.join(ROOT, 'lib', 'profileFreshness.js'), 'utf8');

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
    // RE-ANCHORED 2026-09-18 (D192): the finish spec (40-FINISH-SPEC.md 4.1
    // rule 1, "no subtitle sentence under a title") retires this sentence;
    // ScreenHeader now renders title-only here, the same shape Today/Train/
    // Nutrition/Progress already use. Intent kept -- the Coach root is still
    // a deterministic, named screen -- via the title check below in place of
    // the retired subtitle text.
    expect(COACH).toContain('title="Coach"');
    expect(COACH).not.toMatch(/subtitle=/);
    // Same-meaning re-anchor (C5-P7-08, D96): the Free pitch used to describe
    // the coach in the present tense ("Your coach reads your logs..."), on the
    // tab that then tells a Free user coaching is Pro. It now says what the
    // tab BECOMES on Pro, and what is here either way. The Pro half of the
    // card (the property this test pins for a Pro user) is unchanged.
    // RE-ANCHORED 2026-09-18 (D192, row-line cap): the card's meta line was cut
    // to fit one line. Intent kept: the real status card's content is here.
    expect(COACH).toContain('What changed, what held, and the signals behind it');
    // 'On Pro this tab carries your weekly check-in' pinned the Free-vs-Pro
    // pitch copy on this card. D137 (fully free product) retired that whole
    // branch -- YouScreen.js:474-476 says so directly ("the Free pitch
    // branch (opening ProUpgrade) is retired -- there is nothing left to
    // pitch"). The behaviour it described no longer exists, so the
    // assertion is removed rather than inverted.
    expect(COACH).not.toMatch(/chatbot|No chat|AI chat/i);
    expect(COACH).toContain("navigation.navigate('AthleteProfile')");
  });

  test('Athlete profile includes avatar, strength baselines, Physique Scan and data refresh paths', () => {
    expect(PROFILE).toContain('saveAvatarPhoto');
    expect(PROFILE).toContain('buildAthleteProfileSummary');
    expect(PROFILE_SUMMARY).toContain('getStrengthLevel');
    expect(PROFILE).toContain('getProgressScanCoachSummary');
    expect(PROFILE).toContain('buildProfileFreshness');
    expect(PROFILE_FRESHNESS).toContain('Retake when light, pose and timing are consistent');
    expect(PROFILE).toContain("navigateCrossTab(navigation, 'ProgressTab', 'ProgressPhotos')");
  });
});
