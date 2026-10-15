/**
 * WorkoutSummaryScreen.shareStripAudience.guard.test.js
 *
 * D228 item 1: the "Shared to Community" strip used to carry a hard-coded
 * "everyone" sentence whatever audience the post really used. It now says
 * sessionsSharingSentence(true, <the audience publishAmbientItems used>).
 * Source guard (the screen's data loads make a render harness fragile) plus
 * the real sentence function for each audience.
 */
const fs = require('fs');
const path = require('path');
const { sessionsSharingSentence } = require('../../lib/community/trainingProfile');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('the share strip names the real audience', () => {
  test('no hard-coded everyone sentence remains in the screen', () => {
    expect(SOURCE).not.toMatch(/sub: 'Your sessions are shared with everyone on Community/);
  });
  test('the strip sub line comes from sessionsSharingSentence with the outcome audience, narrowest by default', () => {
    expect(SOURCE).toMatch(
      /sub: sessionsSharingSentence\(true, ambientOutcome\?\.sessionAudience \?\? 'followers'\)/,
    );
  });
  test('followers, groups and everyone each read as themselves', () => {
    expect(sessionsSharingSentence(true, 'followers')).toMatch(/follow you/);
    expect(sessionsSharingSentence(true, 'groups')).toMatch(/your groups/);
    expect(sessionsSharingSentence(true, 'everyone')).toMatch(/everyone on Community/);
  });
});
