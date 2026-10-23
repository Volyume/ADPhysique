const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');
const DECISION = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'coachDecision.js'), 'utf8');
// Source with comments removed, so a note may name a retired title.
const CODE = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// D231 (app layout rework, batch 4) RE-POINTING, in one place: the Coach screen
// lost its subtitle, its profile card, the "Weekly coaching decision" card, the
// three "This week" rows, the "Your body" group, the Community row and the
// Coaching reminders row; it gained the one This week card, Your progress,
// Looking back and "Your coaching setup". Each pin below that read one of those
// is re-pointed to its replacement; the load-failure, completed-decision and
// safety-checks rules are pinned exactly as before, at the code's new home where
// it moved (the completed-decision predicate is lib/coachDecision.js now).

describe('YouScreen coach hub load state', () => {
  test('coach hub load failures are visible and retryable', () => {
    expect(source).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
    expect(source).toMatch(/Promise\.allSettled\(/);
    expect(source).toMatch(/Could not refresh Coach/);
    expect(source).toMatch(/Tap to try again/);
    expect(source).toMatch(/setReloadKey\(\(n\) => n \+ 1\)/);
    // A partial failure never clears what was already read (RE-POINTED: the
    // decision state replaces the old latest-review / history flags).
    expect(source).not.toMatch(/setThisWeekDecision\(null\);[\s\S]*setPastDecision\(null\);[\s\S]*setLoadError\(true\)/);
    // A failed check-in read is a failed load, not a quiet "no decision".
    expect(source).toMatch(/decisionsFailed/);
    expect(source).toMatch(/const failed = \[workoutsResult, historyResult\]\.some\(\(r\) => r\.status === 'rejected'\) \|\| decisionsFailed;/);
  });

  test('coach hub does not present baseline output as a decision', () => {
    // RE-POINTED (D231): the completed-decision predicate is the shared one in
    // lib/coachDecision.js (the module's own note said YouScreen should adopt it
    // when next touched); the rule is unchanged.
    expect(source).toMatch(/import \{ completedDecisionsFrom, splitCoachDecisions \} from '\.\.\/lib\/coachDecision';/);
    expect(source).not.toMatch(/function isCompletedCoachDecision/);
    expect(DECISION).toMatch(/export function isCompletedCoachDecision\(output, checkin\)/);
    expect(DECISION).toMatch(/output\.hasEnoughData === false/);
    expect(DECISION).toMatch(/Number\(checkin\?\.weekStart\) === Number\(output\.weekStart\)/);
    expect(DECISION).toMatch(/checkin\?\.energyScore != null/);
    expect(DECISION).toMatch(/if \(isCompletedCoachDecision\(row, checkin\)\) out\.push\(row\);/);
    expect(source).toContain("This week's decision \\u00B7 See why");
    expect(CODE).not.toContain('Latest coaching decision');
    expect(CODE).not.toContain('Weekly coaching decision');
  });

  test('coach hub groups actions by user intent instead of internal labels', () => {
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    // RE-POINTED (D231): no subtitle; "Setup" is "Your coaching setup".
    expect(source).not.toContain('subtitle=');
    expect(source).not.toContain('Weekly coaching based on what you log.');
    expect(source).toMatch(/<SectionLabel>This week<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Your coaching setup<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Safety checks<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Setup<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Coach actions<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Safety<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Settings<\/SectionLabel>/);
  });

  // Founder device order 2026-09-08: Community is the social feature, not
  // account "Support". RE-POINTED (D231, batch 4): the Community row left the
  // Coach screen altogether (the Community tab is the way in).
  test('Community has no "Support" heading and no row on the Coach screen', () => {
    expect(source).not.toMatch(/<SectionLabel>Support<\/SectionLabel>/);
    expect(source).not.toContain('label="Community"');
    expect(source).not.toMatch(/CommunityTab/);
  });

  test('the sections run in the spec\'s order: This week, Your progress and Looking back, Your coaching setup, Safety checks', () => {
    const at = (needle) => source.indexOf(needle);
    const order = [
      at('<SectionLabel>This week</SectionLabel>'),
      at('<CoachProgress'),
      at('<SectionLabel>Your coaching setup</SectionLabel>'),
      at('<SectionLabel>Safety checks</SectionLabel>'),
    ];
    for (const i of order) expect(i).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

// Audit item 3 (Coach-tab root reorder, size M, 2026-07-08): the Coach
// tab's root (YouScreen) must lead with coach content, not account chrome.
// Settings moves to a header gear (a secondary entry point, never removed).
describe('Audit item 3: Coach-tab root leads with coach content, not settings', () => {
  test('Settings moves to a header gear, not a first-class row', () => {
    // The old flat "App settings" section/NavRow is gone...
    expect(source).not.toMatch(/<SectionLabel>App settings<\/SectionLabel>/);
    expect(source).not.toMatch(/label="Settings"\s*\n\s*sub="Account, units, notifications, data, billing and privacy\."/);
    // ...replaced by a header-right gear that still reaches the same route.
    expect(source).toMatch(/accessibilityLabel="Settings"/);
    expect(source).toMatch(/name="settings-outline"/);
    expect(source).toMatch(/onPress={\(\) => navigation\.navigate\('Settings'\)}/);
  });

  // RE-POINTED (D231, batch 4): the founder's 2026-07-09 order put the athlete
  // profile card first; the owner's 2026-10-22 rework retires the Athlete profile
  // and its card ("Retire it, move its parts"), so the first content under the
  // header is the This week card.
  test('there is no profile card; the This week card is the first content under the header', () => {
    expect(source).not.toContain('styles.profileCard');
    expect(source).not.toContain("navigate('AthleteProfile')");
    expect(source).not.toContain('ProfileAvatarMark');
    const header = source.indexOf('<ScreenHeader');
    const thisWeek = source.indexOf('<SectionLabel>This week</SectionLabel>');
    const setupCard = source.indexOf('<CoachingSetupCard');
    const loadError = source.indexOf('Could not refresh Coach');
    expect(header).toBeGreaterThan(-1);
    expect(setupCard).toBeGreaterThan(header);
    expect(loadError).toBeGreaterThan(setupCard);
    expect(thisWeek).toBeGreaterThan(loadError);
  });

  test('the This week card renders before the coaching setup and the safety checks, which render before nothing settings-shaped', () => {
    const thisWeekIdx = source.indexOf('styles.statusCard');
    const setupIdx = source.indexOf('<SectionLabel>Your coaching setup</SectionLabel>');
    const appSettingsIdx = source.indexOf('App settings');
    expect(thisWeekIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeGreaterThan(-1);
    expect(thisWeekIdx).toBeLessThan(setupIdx);
    expect(appSettingsIdx).toBe(-1);
  });
});

// FOUNDER DECISION (fully free, no tier split, no trial): the everyday
// trial value card and its openTrialMethodology tap (Wave C item 3,
// 2026-08-17) are retired along with the trial itself -- there is no
// "trial_banner" Methodology source left to attribute.
describe('Retired: the trial banner and its Methodology attribution', () => {
  test('openTrialMethodology, the trial banner state and its callbacks are gone', () => {
    expect(source).not.toMatch(/openTrialMethodology/);
    expect(source).not.toMatch(/openTrialSurface/);
    expect(source).not.toMatch(/dismissTrialBanner/);
    expect(source).not.toMatch(/trialBanner/);
    expect(source).not.toMatch(/source: 'trial_banner'/);
  });
});
