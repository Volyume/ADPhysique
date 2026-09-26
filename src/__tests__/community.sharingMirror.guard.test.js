/**
 * The device mirrors the Community row's sharing setting (register D194
 * addendum 2, founder order 2026-09-26: "It is on for all users by default.
 * New and existing they can turn it off if they want after.").
 *
 * The gap it closes (D194 addendum, 2026-09-26): the device kept its own copy
 * of "Share what I did" and never read the row back, so a phone could show
 * sharing on while the row said off (or a wider audience than the row
 * allowed), and the server refused every automatic post without a word.
 * The behaviour is tested in trainingConsistency.test.js; this suite pins
 * the WIRING, each case written to fail if a link is cut:
 *   - every profile refresh mirrors, with the instant its fetch started;
 *   - a sharing change is marked owed BEFORE its publish, so a refresh that
 *     lands mid-publish cannot mirror the old row back over it, and a
 *     rules-outdated revert clears the mark it set;
 *   - the automatic post reports a terminal refusal of the session item,
 *     and the summary says it was not shared (never an invitation dressed
 *     over a refusal) and refreshes the profile so the setting shown is real.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('the profile refresh mirrors the row', () => {
  const PROFILE = read('lib/community/profile.js');
  const fn = PROFILE.slice(PROFILE.indexOf('export async function refreshMe('), PROFILE.indexOf('export function hasProfile('));

  test('the fetch start is taken before the call and handed to the mirror after caching', () => {
    const start = fn.indexOf('const fetchStartedAtMs = Date.now();');
    const call = fn.indexOf("callCommunity('community_get_me'");
    const cache = fn.indexOf('await writeCachedMe(uid, me);');
    const mirror = fn.indexOf("require('./trainingConsistency').mirrorSharingFromServer(uid, me, { fetchStartedAtMs })");
    expect(start).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(start);
    expect(cache).toBeGreaterThan(call);
    expect(mirror).toBeGreaterThan(cache);
  });

  test('a mirror failure never fails the refresh', () => {
    expect(fn).toMatch(/try \{[\s\S]*mirrorSharingFromServer[\s\S]*\} catch \(e\) \{\s*logError\('Community\.refreshMe\.mirrorSharing', e\);/);
  });
});

describe('a sharing change is owed from before its publish', () => {
  const SCREEN = read('screens/CommunityTrainingProfileScreen.js');
  const fn = SCREEN.slice(SCREEN.indexOf('async function saveSharing('), SCREEN.indexOf('function toggleShareSessions('));

  test('pending is set after the device write and before the publish call', () => {
    const write = fn.indexOf('await writeShareSettings(uid, clamped);');
    const owed = fn.indexOf('await setSharingPublishPending(uid, true, { removeShared });');
    const publish = fn.indexOf('await publishSharingSettings(uid, clamped, { removeShared });');
    expect(write).toBeGreaterThan(-1);
    expect(owed).toBeGreaterThan(write);
    expect(publish).toBeGreaterThan(owed);
  });

  test('a rules-outdated revert clears what it marked; a sent publish clears it too', () => {
    const outdated = fn.slice(fn.indexOf("if (out?.reason === 'rules_outdated') {"), fn.indexOf('if (out?.sent) {'));
    expect(outdated).toContain('await setSharingPublishPending(uid, false);');
    expect(fn).toMatch(/if \(out\?\.sent\) \{\s*await setSharingPublishPending\(uid, false\);/);
  });

  test('every device write and every owed-flag change marks the device change', () => {
    const TP = read('lib/community/trainingProfile.js');
    const write = TP.slice(TP.indexOf('export async function writeShareSettings('), TP.indexOf('// ─── The I/O half'));
    expect(write).toContain('await markShareSettingsChanged(uid);');
    const TC = read('lib/community/trainingConsistency.js');
    const pending = TC.slice(TC.indexOf('export async function setSharingPublishPending('), TC.indexOf('export async function mirrorSharingFromServer('));
    expect(pending).toContain('await markShareSettingsChanged(uid);');
  });
});

describe('a refused automatic post is said plainly', () => {
  test('the automatic post reports a terminal refusal of the session item', () => {
    const AMBIENT = read('lib/community/ambient.js');
    expect(AMBIENT).toContain("else sessionRefused = out.code ?? 'refused';");
    expect(AMBIENT).toMatch(/return \{[\s\S]*sessionRefused,\s*\};/);
  });

  test('the summary names the refusal before any invitation, and refreshes the profile', () => {
    const SUMMARY = read('screens/WorkoutSummaryScreen.js');
    const strip = SUMMARY.slice(SUMMARY.indexOf('const shareStripState = (() => {'), SUMMARY.indexOf('})();', SUMMARY.indexOf('const shareStripState = (() => {')));
    const refused = strip.indexOf("if (ambientOutcome.sessionRefused === 'not_allowed') {");
    const invite = strip.indexOf('if (!communityMember) {');
    expect(refused).toBeGreaterThan(-1);
    expect(invite).toBeGreaterThan(refused);
    expect(strip).toContain("title: 'Not shared to Community',");
    expect(strip).toContain("Your Community sharing settings didn't allow this session, so it wasn't posted.");
    expect(SUMMARY).toContain("if (out?.sessionRefused === 'not_allowed') refreshMe(user.id).catch(() => {});");
  });
});
