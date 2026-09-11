/**
 * profile.leaveCommunity.guard.test.js - F11 (fresh-eyes review of the
 * Community client, phases 0-3).
 *
 * What this suite pins: `leaveCommunity` clears every device cache the
 * account leaves behind, not only `me` and the widget friends count --
 * the cached Hub (`clearCachedHub`), the training-profile throttle
 * (`clearTrainingProfileState`), any queued ambient item
 * (`clearPendingAmbientItems`), and this account's "already given
 * Respect today" flags (`clearRespectGivenState`) -- each behind a lazy
 * require. Source-level, not behavioural: `feed.js`, `trainingProfile.js`,
 * `ambient.js` and `respect.js` all import `currentUserId`/`readCachedMe`
 * from `profile.js`, so a static import back into any of them would
 * cycle -- a behavioural test with the four modules mocked would never
 * catch a regression back to a static import at the top of the file.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'profile.js'), 'utf8');

function fnBody(source, name) {
  const at = source.indexOf(`export async function ${name}(`);
  expect(at).toBeGreaterThan(-1);
  const next = source.indexOf('\nexport ', at + 1);
  return next === -1 ? source.slice(at) : source.slice(at, next);
}

describe('leaveCommunity clears every Community device cache (F11)', () => {
  const body = fnBody(SOURCE, 'leaveCommunity');

  test('there is a leaveCommunity to guard', () => {
    expect(body.length).toBeGreaterThan(0);
  });

  test('clears the cached Hub, lazily (feed.js would cycle on a static import)', () => {
    expect(body).toMatch(/require\('\.\/feed'\)\.clearCachedHub\(uid\)/);
  });

  test('clears the training-profile throttle, lazily (trainingProfile.js would cycle)', () => {
    expect(body).toMatch(/require\('\.\/trainingProfile'\)\.clearTrainingProfileState\(uid\)/);
  });

  test('drops any queued ambient item, lazily (ambient.js would cycle)', () => {
    expect(body).toMatch(/require\('\.\/ambient'\)\.clearPendingAmbientItems\(\)/);
  });

  test('clears this account\'s "already given Respect today" flags, lazily (respect.js would cycle)', () => {
    expect(body).toMatch(/require\('\.\/respect'\)\.clearRespectGivenState\(uid\)/);
  });

  test('none of the four static-import equivalents are used instead', () => {
    expect(body).not.toMatch(/from '\.\/feed'/);
    expect(body).not.toMatch(/from '\.\/trainingProfile'/);
    expect(body).not.toMatch(/from '\.\/ambient'/);
    expect(body).not.toMatch(/from '\.\/respect'/);
  });

  test('the four new clears are wrapped in their own try/catch, after community_leave has already succeeded', () => {
    // The existing widget clear established this shape first (review
    // 2026-09-11 finding 5); the new block matches it rather than risking
    // one failed cache clear turning an already-successful leave into a
    // thrown error the caller has to explain.
    const tryBlocks = body.match(/try \{[\s\S]*?\} catch \(_e\) \{ \/\* best-effort \*\/ \}/g) ?? [];
    const newClearBlock = tryBlocks.find((b) => b.includes('clearCachedHub'));
    expect(newClearBlock).toBeTruthy();
    expect(newClearBlock).toMatch(/clearTrainingProfileState/);
    expect(newClearBlock).toMatch(/clearPendingAmbientItems/);
    expect(newClearBlock).toMatch(/clearRespectGivenState/);
    // Distinct from the widget try/catch above it -- one failed cache
    // clear must not skip the others.
    const widgetBlock = tryBlocks.find((b) => b.includes('clearCachedFriends'));
    expect(widgetBlock).toBeTruthy();
    expect(widgetBlock).not.toBe(newClearBlock);
  });

  test('every new clear is called with the account id the person is leaving (uid), except the global ambient queue', () => {
    expect(body).toMatch(/clearCachedHub\(uid\)/);
    expect(body).toMatch(/clearTrainingProfileState\(uid\)/);
    expect(body).toMatch(/clearRespectGivenState\(uid\)/);
    // The pending-ambient-items queue is device-global, not per user
    // (`ambient.js`'s own PENDING_ITEMS_KEY), so it takes no argument.
    expect(body).toMatch(/clearPendingAmbientItems\(\)/);
  });
});
