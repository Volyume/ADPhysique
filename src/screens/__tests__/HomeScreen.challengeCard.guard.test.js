/**
 * Source guard: the gym challenge row is NOT on Today any more.
 *
 * History: gym challenge SPEC section 2 put a slim "Challenge" row on Today
 * under the last-session row. D231 (app layout rework, batch 1,
 * docs/app-rework-2026-10/SPEC.md "Leaves Today: The challenge row:
 * Community is its home") removed it, so what this file pins is now the
 * absence: no card, no read of gym_challenge_mine from Home, and the
 * Community feed's own challenge band still exists as the one home.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');

test('Home renders no challenge row and the card component is deleted', () => {
  expect(src).not.toMatch(/HomeChallengeCard/);
  expect(fs.existsSync(path.join(__dirname, '..', '..', 'components', 'HomeChallengeCard.js'))).toBe(false);
});

test('Home no longer reads the person\'s challenges at all', () => {
  expect(src).not.toMatch(/myChallenges/);
  expect(src).not.toMatch(/loadHomeChallenge/);
  expect(src).not.toMatch(/homeChallenge/);
  expect(src).not.toMatch(/challenges\/api/);
});

test('Community keeps the challenge: its feed still opens the Challenge screen', () => {
  const hub = fs.readFileSync(path.join(__dirname, '..', 'CommunityHubScreen.js'), 'utf8');
  expect(hub).toMatch(/Challenge/);
  expect(hub).toMatch(/'Challenge'/);
});
