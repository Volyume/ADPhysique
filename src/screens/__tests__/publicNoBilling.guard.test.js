/**
 * Pins that nothing served from public/ talks about prices, a trial, a
 * paywall or a Pro plan. Volyume is fully free (D137), and the stale June
 * app-map pages that still described Free vs Pro were unpublished. The
 * challenge's "free for life" wording is allowed and not matched here.
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', '..', '..', 'public');
const TEXT_EXT = /\.(html|md|txt|xml|json|js|css)$/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return TEXT_EXT.test(e.name) ? [p] : [];
  });
}

describe('public/ carries no billing copy', () => {
  test('the stale app-map pages are not published', () => {
    expect(fs.existsSync(path.join(publicDir, 'app-map'))).toBe(false);
  });

  test.each([
    ['pound sign', /£/],
    ['Pro plan', /Pro plan/i],
    ['free trial', /free trial/i],
    ['14 days free', /14 days free/i],
    ['paywall', /paywall/i],
    ['per month', /per month/i],
  ])('no file mentions %s', (_label, re) => {
    const hits = walk(publicDir)
      .filter((f) => re.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(publicDir, f));
    expect(hits).toEqual([]);
  });
});
