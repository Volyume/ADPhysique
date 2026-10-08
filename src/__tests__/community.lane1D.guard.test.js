/**
 * Community level-up, lane 1D (register D221; `docs/audit/community-level-up-
 * 2026-10-08/12-BUILD-SPEC.md` section 2.6). Source-level guards plus the
 * pure helpers, one block per item, each written to fail if its link is cut.
 * Behavioural coverage for the same items lives in the colocated suites
 * (CommunityGroup, CommunityCompose, RespectAllRow, HomeCommunityTodayRow).
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const exists = (p) => fs.existsSync(path.resolve(__dirname, '..', p));

const {
  COMMUNITY_RESTRICTED_LINE, RESTRICTION_REFUSALS, restrictionLine, respectFailureLine,
} = require('../lib/community/restriction');

describe('L7: restricted and suspended are never "try again"', () => {
  test('the one line, exactly as the spec words it', () => {
    expect(COMMUNITY_RESTRICTED_LINE).toBe('Your Community access is limited at the moment. See the notice on Community.');
    expect(COMMUNITY_RESTRICTED_LINE).not.toMatch(/try again/i);
    expect(RESTRICTION_REFUSALS.profile_restricted).toBe(COMMUNITY_RESTRICTED_LINE);
    expect(RESTRICTION_REFUSALS.profile_suspended).toBe(COMMUNITY_RESTRICTED_LINE);
    expect(restrictionLine('profile_restricted')).toBe(COMMUNITY_RESTRICTED_LINE);
    expect(restrictionLine('offline')).toBeNull();
  });

  test('Respect failures: rate limit, restriction, and everything else, each calm', () => {
    expect(respectFailureLine('rate_limited')).toBe('You have given a lot of Respect today. It will be back tomorrow.');
    expect(respectFailureLine('profile_suspended')).toBe(COMMUNITY_RESTRICTED_LINE);
    expect(respectFailureLine('offline')).toBe('Could not send that. Try again in a moment.');
    expect(respectFailureLine(undefined)).toBe('Could not send that. Try again in a moment.');
  });

  const TABLES = [
    'components/community/GroupInviteSheet.js', 'components/community/ConnectButton.js',
    'components/community/ReportSheet.js', 'components/community/FollowButton.js',
    'components/community/ProfileMenuSheet.js', 'screens/CommunityConnectionsScreen.js',
    'screens/CommunityDimensionScreen.js', 'screens/CommunityEditProfileScreen.js',
    'screens/CommunityFollowersScreen.js', 'screens/CommunityGroupCreateScreen.js',
    'screens/CommunityGroupMembersScreen.js', 'screens/CommunityGroupScreen.js',
    'screens/CommunityGymAddScreen.js', 'screens/CommunityJoinScreen.js',
  ];
  test.each(TABLES)('%s spreads RESTRICTION_REFUSALS into its error-to-copy table', (file) => {
    expect(read(file)).toMatch(/\.\.\.RESTRICTION_REFUSALS,/);
  });

  const LINES = [
    'screens/CommunityComposeScreen.js', 'screens/CommunityConversationScreen.js',
    'screens/CommunityConversationsScreen.js', 'screens/CommunityPostScreen.js',
  ];
  test.each(LINES)('%s answers the restriction codes before any "try again" line', (file) => {
    expect(read(file)).toMatch(/if \(restrictionLine\(code\)\) return restrictionLine\(code\);/);
  });
});

describe('L3: Respect is optimistic with revert on Profile, Group and Dimension', () => {
  test.each([
    ['screens/CommunityProfileScreen.js', 'async function react('],
    ['screens/CommunityGroupScreen.js', 'async function react('],
    ['screens/CommunityDimensionScreen.js', 'async function respondRecent('],
  ])('%s toasts the calm line on a refused Respect and no longer swallows it', (file, marker) => {
    const src = read(file);
    const fn = src.slice(src.indexOf(marker), src.indexOf(marker) + 1800);
    expect(fn).toMatch(/toast\.show\(respectFailureLine\(e\?\.code\), \{ variant: 'error' \}\)/);
    expect(fn).not.toMatch(/Nothing to interrupt anyone with|not worth interrupting/);
  });

  test('the Post screen uses the same Respect line, not "try again" copy', () => {
    expect(read('screens/CommunityPostScreen.js')).toContain(': respectFailureLine(_e?.code)');
  });
});

describe('L4: the four rules and the link sit above Create profile', () => {
  test('order in the Join screen', () => {
    const src = read('screens/CommunityJoinScreen.js');
    const rules = src.indexOf('Four rules');
    const link = src.indexOf('title="Community rules and contact"');
    const create = src.indexOf('title="Create profile"');
    expect(rules).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(rules);
    expect(create).toBeGreaterThan(link);
    expect(src).toContain('accessibilityLabel="Create my Community profile"'); // label unchanged
  });
});

describe('L5: one truthful audience sentence', () => {
  const { sessionsSharingSentence } = require('../lib/community/trainingProfile');
  test('the sentence for each real state', () => {
    expect(sessionsSharingSentence(true, 'everyone')).toBe('Your sessions are shared with everyone on Community unless you change it.');
    expect(sessionsSharingSentence(false, 'everyone')).toBe('Off: only you see your sessions.');
    expect(sessionsSharingSentence(true, 'followers')).toMatch(/follow you/);
    expect(sessionsSharingSentence(true, 'groups')).toMatch(/your groups/);
  });
  test('the three surfaces say it, and "Off by default." is gone from the row', () => {
    const tp = read('screens/CommunityTrainingProfileScreen.js');
    expect(tp).toContain('sessionsSharingSentence(!!share.share_sessions, share.sessions_audience)');
    expect(tp).not.toContain('Off by default.');
    const receipt = read('components/community/PrivacyReceipt.js');
    expect(receipt).toContain('shared with everyone on Community unless you change it');
    expect(receipt).not.toContain('Sessions you choose to share');
    const summary = read('screens/WorkoutSummaryScreen.js');
    expect(summary).toContain('Your sessions are shared with everyone on Community unless you change it.');
    expect(summary).toContain('Off: only you see your sessions.');
    expect(summary).not.toContain('People who train like you can see this session.');
  });
});

describe('L6: Follow is the row action; Connect is explained once on Find people', () => {
  test('People list rows no longer ask for Connect', () => {
    expect(read('screens/CommunityPeopleListScreen.js')).not.toMatch(/^\s*showConnect\s*$/m);
  });
  test('the two-line explainer is the footer of Find people', () => {
    const src = read('screens/CommunityFindPeopleScreen.js');
    expect(src).toContain("'Follow to see their training. Connect to message each other.'");
    expect(src).toContain('ListFooterComponent');
    expect(src).toContain('{FOLLOW_CONNECT_EXPLAINER}');
  });
});

describe('L11: onboarding step 5 names Community and confirms the join', () => {
  test('title and confirming toast', () => {
    const src = read('screens/ProOnboardingScreen.js');
    expect(src).toContain('title="Where you train, and Community"');
    expect(src).toContain("'You have joined Community.'");
    expect(src).toContain("import { useToast } from '../components/Toast';");
  });
});

describe('L15: the empty Activity state opens Find people', () => {
  test('not Search', () => {
    const src = read('screens/CommunityActivityScreen.js');
    expect(src).toContain("onAction={() => navigation.navigate('CommunityFindPeople')}");
    expect(src).not.toContain("navigate('CommunitySearch')");
  });
});

describe('L16: one training picker ("What you train for"; D152 bans the words "how you train" in user-facing strings) on Edit profile', () => {
  test('the styles row is out of the form; the data is still sent unchanged', () => {
    const src = read('screens/CommunityEditProfileScreen.js');
    expect(src).not.toContain('<SectionLabel>Training styles</SectionLabel>');
    expect(src).toContain('<SectionLabel>What you train for</SectionLabel>');
    expect(src).toContain('styles: styleKeys,'); // stored styles are carried through, not erased
    expect(src).toContain('discipline_keys: disciplineKeys,');
  });
});

describe('L17: the Privacy screen mirrors "Share what I did" through the same setter', () => {
  test('one row, one setter', () => {
    const privacy = read('screens/CommunityPrivacyScreen.js');
    expect(privacy).toContain('label="Share what I did"');
    expect(privacy).toContain('saveShareSessions(uid, prev, next');
    expect(read('screens/CommunityTrainingProfileScreen.js')).toContain('saveShareSessions(uid, prevSettings, nextSettings');
    // Turning it off keeps the same one-time "remove what is shared" choice.
    expect(privacy).toContain('SHARE_OFF_TITLE');
  });
});

describe('L18: the ellipsis opens the profile menu; message actions are visible', () => {
  test('Post screen header', () => {
    const src = read('screens/CommunityPostScreen.js');
    expect(src).toContain('<ProfileMenuSheet');
    expect(src).toContain('else if (author?.user_id) setMenuOpen(true)');
  });
  test('the message bubble carries a visible "..."', () => {
    const src = read('components/community/MessageBubble.js');
    expect(src).toContain('name="ellipsis-horizontal"');
    expect(src).toContain("'Message options: report'");
  });
});

describe('L20: the first summary shows the share strip only', () => {
  test('the days offer starts at the second completed workout', () => {
    expect(read('screens/WorkoutSummaryScreen.js')).toContain('setShareOfferEligible(totalCompleted >= 2 && !suppressed)');
  });
});

describe('low items', () => {
  test('23: the group share row says it is the latest workout', () => {
    expect(read('screens/CommunityGroupScreen.js')).toContain('Share your latest workout with the group');
  });
  test('25: account deletion names Community data', () => {
    expect(read('hooks/useAccountActions.js')).toContain('including your Community profile and posts');
    expect(read('screens/SettingsAccountScreen.js')).toContain('Community profile');
  });
  test('26: Find people has six doors with distinct subtitles, and no stale "five doors"', () => {
    const { FIND_MODES, FIND_MODE_ORDER } = require('../lib/community/findPeople');
    expect(FIND_MODE_ORDER).toHaveLength(6);
    expect(FIND_MODES.like_me.subtitle).not.toBe(FIND_MODES.same_discipline.subtitle);
    expect(read('lib/community/findPeople.js')).not.toMatch(/The five door/);
    expect(read('screens/CommunityFindPeopleScreen.js')).not.toMatch(/Five doors|five doors/);
  });
});

describe('L13: terminology census', () => {
  const FILES = [
    'screens/CommunityActivityScreen.js', 'screens/CommunityComposeScreen.js',
    'screens/CommunityGroupCreateScreen.js', 'screens/CommunityGroupScreen.js',
    'screens/CommunityGymAddScreen.js', 'screens/CommunityModerationScreen.js',
    'screens/CommunityPostScreen.js', 'screens/CommunityProfileScreen.js',
    'screens/CommunityRulesScreen.js', 'screens/CommunityTrainingProfileScreen.js',
    'components/community/PrivacyReceipt.js',
  ];
  // Quoted string literals and JSX text only; comments are not user-facing.
  function userFacing(src) {
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const strings = noComments.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
    const jsx = noComments.match(/>\s*([A-Z][^<>{}\n]{3,})\s*</g) ?? [];
    // Template expressions are data keys, not words the person reads.
    return [...strings, ...jsx].map((s) => s.replace(/\$\{[^}]*\}/g, '')).filter((s) => /\s/.test(s));
  }
  test.each(FILES)('%s shows no "story", "cohort", "blurb" or "operator" as a user-facing word', (file) => {
    const bad = userFacing(read(file)).filter((s) => /\b(story|stories|cohort|cohorts|blurb|operator)\b/i.test(s));
    expect(bad).toEqual([]);
  });
  test('the replacements', () => {
    expect(read('screens/CommunityPostScreen.js')).toContain('title="Post"');
    expect(read('screens/CommunityGroupCreateScreen.js')).toContain('label="About this group (optional)"');
    expect(read('screens/CommunityGymAddScreen.js')).toContain('label="Gym company (optional)"');
    expect(read('screens/CommunityModerationScreen.js')).toContain("post: 'Post',");
  });
});

describe('dead code and programme remnants', () => {
  test('DimensionRow and GymWeekBoard are gone', () => {
    expect(exists('components/community/DimensionRow.js')).toBe(false);
    expect(exists('components/community/GymWeekBoard.js')).toBe(false);
    expect(exists('components/community/__tests__/DimensionRow.test.js')).toBe(false);
  });
  test('the "programme use" comments are gone', () => {
    for (const f of ['components/community/ActivityRow.js', 'screens/CommunityActivityScreen.js']) {
      expect(read(f)).not.toMatch(/programme use/);
    }
  });
  test('the emptyMe shape no longer carries tp_programme_key', () => {
    expect(read('lib/community/profile.js')).not.toContain('tp_programme_key');
  });
});
