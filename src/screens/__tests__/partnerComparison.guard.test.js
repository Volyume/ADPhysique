/**
 * partnerComparison.guard.test.js — source-level guard for the D5 hard lock
 * "no cross-person number comparison" on the partner surface.
 *
 * The mutual weekly intention shows each member's OWN aim; the shared streak and
 * week signals show each side's OWN adherence. NONE of it may ever be framed as
 * one person being ahead of / behind / more or less than the other. This scans
 * the USER-FACING STRING LITERALS (comments are stripped first, so the copy-law
 * doc comments that legitimately NAME the banned words are not counted) of the
 * partner surfaces and fails on any comparison construct.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'screens/PartnerScreen.js',
  'lib/partners/intention.js',
  'lib/partners/moments.js',
  'lib/partners/sharedStreak.js',
  'lib/partners/acknowledgements.js',
  'lib/notifications/partnerBeats.js',
];

// Cross-person comparison / ranking vocabulary that must never reach a partner
// as copy. "more than" / "less than" cover the "than {partner}" constructs.
const BANNED = /\b(ahead|behind|more than|less than|outtrained|out-trained|beat you|beating|ranked?|ranking|leaderboard|you're behind|you are behind|falling behind|catch up)\b/i;

// Strip block + line comments, then pull out every quoted / template string.
function userFacingStrings(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Line comments, but not the // inside a URL scheme (preceded by ':').
  const noComments = noBlock.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const matches = noComments.match(/'[^']*'|"[^"]*"|`[^`]*`/g) || [];
  return matches.join('\n');
}

describe('partner surface: no cross-person comparison copy', () => {
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const strings = userFacingStrings(src);

    test(`${rel} has scannable user-facing strings`, () => {
      expect(strings.length).toBeGreaterThan(0);
    });

    test(`${rel} contains no comparison / ranking copy`, () => {
      const hit = strings.match(BANNED);
      expect(hit ? `${rel}: ${hit[0]}` : null).toBeNull();
    });

    test(`${rel} uses no em dash in user copy`, () => {
      expect(/[–—]/.test(strings)).toBe(false);
    });
  }
});
