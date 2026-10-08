/**
 * What this suite pins (D221 Stage 3 client, `15-STAGE3-SPEC.md` "Client"),
 * read from source with comments stripped, plus a render of the presence band:
 *  - PresenceBand draws nothing when the server withheld (null), when the
 *    gate is closed (the default fails closed), or when there is nothing to
 *    say; and it draws the line and first names otherwise.
 *  - The logger calls presence at start, finish and discard, and logs the
 *    challenge session at finish, each best effort (`.catch(() => {})`).
 *  - The Hub and the group page draw the band behind the consistency gate;
 *    invites say Decline (not Later) and the Groups rows carry unread.
 *  - CommunityGroupChat is registered; the chat uses MessageBubble and
 *    MessageComposer, marks read, and offers delete or report.
 *  - The privacy panel carries every switch through its setter, the switch
 *    is hidden for a minor; the profile hero shows the streak mark at 2+.
 *  - Nothing new says weight, calories, bodyweight or measurements.
 */

const fs = require('fs');
const path = require('path');
const { create } = require('react-test-renderer');

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../components/ProfileAvatarMark', () => () => null);
jest.mock('../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../hooks/useTheme', () => ({
  __esModule: true,
  default: () => {
    const theme = require('../styles/theme');
    return { colors: theme.colors, type: theme.type };
  },
}));

const ROOT = path.resolve(__dirname, '..', '..');
const code = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const PresenceBand = require('../components/community/PresenceBand').default;
const textOf = (n) => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join(' ') : textOf(n.children));

describe('PresenceBand', () => {
  const NOW = { count: 2, names: ['Sam Jones', 'Priya Rao'] };
  const render = (props) => create(<PresenceBand {...props} />).toJSON();

  test('hidden when the server withheld, when gated (the default) or when empty', () => {
    expect(render({ trainingNow: null, gated: false })).toBeNull();
    expect(render({ trainingNow: NOW })).toBeNull();
    expect(render({ trainingNow: NOW, gated: true })).toBeNull();
    expect(render({ trainingNow: { count: 0, names: [] }, gated: false })).toBeNull();
  });
  test('draws the line and first names when allowed', () => {
    const text = textOf(render({ trainingNow: NOW, trainedToday: 3, gated: false }));
    expect(text).toContain('2 training now · 3 trained today');
    expect(text).toContain('Sam and Priya');
  });
});

describe('the logger', () => {
  const src = code('src/screens/ActiveWorkoutScreen.js');
  test('start, finish and discard call presence; finish logs challenges; all best effort', () => {
    expect(src).toMatch(/announceTraining\(user\.id, true\)\.catch\(\(\) => \{\}\)/);
    expect(src).toMatch(/announceTraining\(user\.id, false\)\.catch\(\(\) => \{\}\)/);
    expect((src.match(/announceTraining\(user\.id, false\)/g) || []).length).toBe(2);
    expect(src).toMatch(/logFinishedSessionToChallenges\(user\.id, activeWorkout\.id, localDayKey\(\)\)\.catch\(\(\) => \{\}\)/);
  });
  test('the app foreground runs the stale guard', () => {
    expect(code('App.js')).toMatch(/clearStaleTrainingNow\(supabaseUserId\)\.catch/);
  });
});

describe('the Hub and the group page', () => {
  const hub = code('src/screens/CommunityHubScreen.js');
  const group = code('src/screens/CommunityGroupScreen.js');
  test('both draw the band behind the consistency gate, failing closed', () => {
    expect(hub).toMatch(/<PresenceBand trainingNow=\{summary\?\.trainingNow \?\? null\} gated=\{consistencyGated\}/);
    expect(hub).toMatch(/useState\(true\)/);
    expect(group).toMatch(/consistencyGateState\(meUid, true\)/);
    expect(group).toMatch(/\[gated, setGated\] = useState\(true\)/);
    expect(group).toMatch(/!gated && \(challenge \|\| isAdmin\)/);
  });
  test('invites say Decline, not Later; Groups rows carry unread', () => {
    expect(hub).toMatch(/title="Decline"/);
    expect(hub).not.toMatch(/title="Later"/);
    expect(hub).toMatch(/unread=\{unreadById\[g\.id\]/);
    expect(group).toMatch(/title="Decline"/);
  });
  test('the group page has the Chat band and the Challenge sheet entries', () => {
    expect(group).toMatch(/title="Chat"/);
    expect(group).toMatch(/label: 'Open chat'/);
    expect(group).toMatch(/title="Start a challenge"/);
    expect(group).toMatch(/title="End challenge"/);
  });
});

describe('the chat screen', () => {
  const chat = code('src/screens/CommunityGroupChatScreen.js');
  test('is registered with plain options and reached by the push route', () => {
    expect(code('src/navigation/RootNavigator.js')).toMatch(/name="CommunityGroupChat" component=\{CommunityGroupChatScreen\} options=\{\{ headerShown: false \}\}/);
  });
  test('uses the DM bubble and well composer, marks read, deletes or reports', () => {
    expect(chat).toMatch(/<MessageBubble/);
    expect(chat).toMatch(/<MessageComposer/);
    expect(chat).toMatch(/markGroupRead\(groupId\)/);
    expect(chat).toMatch(/deleteGroupMessage/);
    expect(chat).toMatch(/<ReportSheet/);
    expect(chat).toMatch(/message\.mine \|\| isAdmin/);
  });
});

describe('the privacy panel and the profile', () => {
  const priv = code('src/screens/CommunityPrivacyScreen.js');
  test('every sharing switch is on the panel through its setter', () => {
    for (const re of [
      /saveShareSessions\(/, /saveBandToggle\(uid, prev, key, next\)/, /setShowGym\(next\)/, /setShowPlace\(next\)/,
      /saveShowTrainingNow\(uid, next\)/, /setConnectFrom\(next\)/, /upsertProfile\(\{ visibility: next \}\)/,
      /title="Show when I am training"/, /title="Share my consistency"/, /title="Share my age group"/,
      /SESSIONS_AUDIENCE_VALUES\.map/,
    ]) expect(priv).toMatch(re);
  });
  test('the presence switch, consistency and age group are hidden for a minor', () => {
    expect(priv).toMatch(/share && !isMinor \? \(\s*<>\s*<SwitchRow\s+icon="calendar-outline"/);
  });
  test('the weeks-in-a-row mark needs 2 or more', () => {
    expect(code('src/screens/CommunityProfileScreen.js')).toMatch(/Number\(card\.c_weeks_streak\) >= 2/);
  });
});

describe('nothing new is about the body or food', () => {
  const FILES = [
    'src/components/community/PresenceBand.js', 'src/components/community/ChallengeSheet.js',
    'src/screens/CommunityGroupChatScreen.js', 'src/lib/community/presenceSession.js',
    'src/lib/community/challengeSession.js', 'src/lib/community/bandShare.js',
  ];
  test.each(FILES)('%s', (rel) => {
    expect(code(rel)).not.toMatch(/bodyweight|body weight|calorie|kcal|measurement|\bweigh/i);
    expect(code(rel)).not.toMatch(/—/);
  });
});
