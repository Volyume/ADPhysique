/**
 * rows.amber.guard.test.js (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 6e;
 * `20-BLUEPRINT.md` section 9 rule 7: "Amber is spent only on: the
 * trained-today ring, a given Respect glyph, a PR mark... Every other
 * button is `primary` (charcoal), `secondary`, `tertiary` or icon-only").
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than pass: a
 * source-level guard, not a rendered-colour one, because the failure mode
 * is a future edit reaching for `colors.primary` to make some other bit
 * of a row "pop" -- a selected state, a count badge, a name -- which a
 * behavioural snapshot test would not catch unless that exact prop
 * combination were re-rendered. Grepping the SOURCE for every amber
 * accessor, after stripping comments (the same `code()` stripper
 * `community.privacy.guard.test.js` uses, so a rule NAMED in a comment,
 * this file included, is never mistaken for a live use), pins the count
 * whether or not a test happens to render the branch that uses it.
 *
 * The count per file is a PIN, not a ceiling computed from a rule: each
 * number is exactly how many places this file's source reads
 * `c.primary`/`colors.primary`/`t.colors.primary` today, with a comment
 * naming every one so a reviewer can check the list against the count
 * instead of trusting it blind.
 *
 * Reading of "the ring dot" (section 6e's first category): `DayDots`
 * carries no avatar and no ring of its own, but blueprint rule 5 gives it
 * amber in the same breath as the avatar's ring dot -- "the amber ring
 * dot for trained today... Trained days are seven 6 dp dots... (`primary`
 * filled for trained... today ringed)" -- one sentence about presence,
 * not two unrelated rules. This guard reads "the ring dot" to cover both:
 * the avatar's own ring AND `DayDots`' trained/today dots. Flagged in the
 * lane report as a decision the lead may want split into its own fourth
 * category instead.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');

/** Strip block and line comments, identical to
 * `community.privacy.guard.test.js`'s stripper, so a rule or count named
 * IN a comment (this file, and every new component's header, are full of
 * them) is never mistaken for a live `c.primary` use. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function primaryCount(file) {
  const source = code(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const matches = source.match(/\bc\.primary\b|\bcolors\.primary\b|\bt\.colors\.primary\b/g);
  return matches ? matches.length : 0;
}

describe('the seven new row components spend amber only on the ring dot, the given-Respect glyph and the PR mark', () => {
  test.each([
    // No avatar, no ring, no figures, no Respect: a section label carries
    // no amber at all.
    ['Eyebrow.js', 0],
    // Decorative only ("Nothing interactive; the row is the target",
    // spec): presence, not respect or a PR, so no amber either.
    ['AvatarStack.js', 0],
    // The trained-day fill and the not-yet-trained-today ring (see the
    // header comment above): one live use per branch, two total.
    ['DayDots.js', 2],
    // The trained-today ring dot's live colour override, plus the same
    // dot's static frozen-style baseline (the CP-10 "frozen base + live
    // override" pattern every reference file in this folder uses).
    ['PersonRow.js', 2],
    // No ring, no Respect, no PR: a cohort carries none of the three.
    ['CohortRow.js', 0],
    // Same anatomy as CohortRow, same answer.
    ['GroupRow.js', 0],
    // The "is this today" ring dot's live colour (once) plus its static
    // frozen-style baseline (once), the PR mark's live colour (once), and
    // the given-Respect heart's live colour when `myReaction` is true
    // (once): four total.
    ['ActivityItemRow.js', 4],
  ])('%s uses c.primary exactly %i time(s)', (file, expected) => {
    expect(primaryCount(file)).toBe(expected);
  });
});
