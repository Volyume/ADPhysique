/**
 * Gym challenge privacy disclosure (adversarial review round 1, M12;
 * docs/gym-challenge-2026-10-19/SPEC.md). Every copy of the privacy policy
 * (the in-app screen, the website page and its mirrors, the Markdown copy)
 * says what the challenge reads and never reads, who sees names and scores,
 * how winners are told and published, that leaving stops the reading, the
 * consent basis, and what deletion keeps. The wording must match the build:
 * migrate_201 never reads an amount or a weight, shows top-10 names to
 * entrants only, and keeps the draw record for checking.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/\s+/g, ' ');

const COPIES = {
  app: read('src', 'screens', 'PrivacyPolicyScreen.js'),
  web: read('public', 'privacy.html'),
  webIndex: read('public', 'privacy', 'index.html'),
  docsWeb: read('docs', 'web', 'privacy.html'),
  markdown: read('public', 'privacy-policy.md'),
};

describe.each(Object.entries(COPIES))('%s privacy copy', (name, text) => {
  it('discloses the gym challenge as built', () => {
    expect(text).toMatch(/Gym challenges/);
    expect(text).toMatch(/only adults can join/);
    expect(text).toMatch(/It never reads what you ate or what you weigh\./);
    expect(text).toMatch(/shown to the other people in that challenge\. Nobody else sees them\./);
    expect(text).toMatch(/recorded computer draw/);
    expect(text).toMatch(/your name and county are published unless you object/);
    expect(text).toMatch(/your records are not read for it again/);
    expect(text).toMatch(/explicit consent, which you give when you join/);
    expect(text).toMatch(/earns free for life/);
    expect(text).toMatch(/except the record of each prize draw/);
    expect(/—/.test(text)).toBe(false);
  });
});
