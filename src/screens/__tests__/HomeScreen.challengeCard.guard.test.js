/**
 * Source guard for the gym challenge card on Today (gym challenge SPEC
 * section 2). It pins that the card:
 *  - reads only an active or ended challenge from gym_challenge_mine;
 *  - is never awaited by loadData (a slow connection cannot hold first paint);
 *  - sits under the last-session row, i.e. below today's training, not above;
 *  - waits for the first load like the other Home cards.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');

test('the loader keeps only an active or ended challenge and fails to nothing', () => {
  const at = src.indexOf('function loadHomeChallenge()');
  expect(at).toBeGreaterThan(-1);
  const body = src.slice(at, src.indexOf('async function loadData()', at));
  expect(body).toMatch(/myChallenges\(\)/);
  expect(body).toMatch(/r\?\.status === 'active' \|\| r\?\.status === 'ended'/);
  expect(body).toMatch(/\.catch\(/);
});

test('loadData starts the read without awaiting it', () => {
  expect(src).toMatch(/const loadedForDay = todayLocalKey\(\);\n\s+loadHomeChallenge\(\);/);
  expect(src).not.toMatch(/await loadHomeChallenge/);
  expect(src).not.toMatch(/loadHomeChallenge\(\),\s*\n/);
});

test('the card renders below the last session and after the first load', () => {
  const card = src.indexOf('<HomeChallengeCard');
  expect(card).toBeGreaterThan(src.indexOf('<HomeLastSessionCard'));
  expect(card).toBeLessThan(src.indexOf('<HomeCommunityIntroCard'));
  expect(src).toMatch(/!initialLoading && homeChallenge && \(/);
});
