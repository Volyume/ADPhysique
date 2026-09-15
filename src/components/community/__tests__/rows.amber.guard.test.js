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
 *
 * F15 (fresh-eyes review of phases 0-3): the table below used to list
 * only "the seven new row components" this revamp introduced, with no
 * assertion tying it to the folder -- so `RespectAllRow.js` landed with
 * zero coverage here and nothing failed. Extended to pin EVERY `.js`
 * file in this folder (a completeness test below checks the table
 * against `fs.readdirSync`, so a new file with no entry fails loudly
 * instead of silently passing), and `RespectAllRow.js` is in the table
 * with its real count (0: its own header says why -- "no amber, this
 * row is quiet, never a committing action"). Pinning a PRE-EXISTING
 * file's count is a coverage net against silent drift, not a claim that
 * every one of its uses is already rule-7-compliant; a few of the older
 * files (not from this revamp) read as borderline against rule 7's exact
 * list and are named as such in the lane report rather than changed here.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const TEST_DIR_NAME = '__tests__';

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

// The seven files this revamp actually introduced as new rows (section
// 6e) plus every other .js file already in the folder (F15 extension) --
// one shared table, so the completeness test below and the per-file pin
// can never drift apart into two competing lists.
const AMBER_COUNTS = [
  // ─── The seven new row components (rule-7 narrative preserved) ───────
  // No avatar, no ring, no figures, no Respect: a section label carries
  // no amber at all.
  ['Eyebrow.js', 0],
  // Decorative only ("Nothing interactive; the row is the target",
  // spec): presence, not respect or a PR, so no amber either.
  ['AvatarStack.js', 0],
  // D174 A3 SCOPE RULING (2026-09-15). A3 kept the unread and today marks; a
  // trained-day FILL is the week-ribbon idiom, and `WeekRibbon` -- the signature
  // device -- fills a trained day with `borderLight` and reserves amber for
  // TODAY. This file filled every trained day amber, so the app's signature
  // disagreed with itself. Trained moved to `borderLight`; the today RING keeps
  // its amber, which is the one use here A3 actually protects.
  ['DayDots.js', 1],
  // The trained-today ring dot's live colour override, plus the same
  // dot's static frozen-style baseline (the CP-10 "frozen base + live
  // override" pattern every reference file in this folder uses).
  ['PersonRow.js', 2],
  // No ring, no Respect, no PR: a cohort carries none of the three.
  ['CohortRow.js', 0],
  // Same anatomy as CohortRow, same answer.
  ['GroupRow.js', 0],
  // The "is this today" ring dot's live colour (once), its frozen baseline
  // (once), and the PR mark (once): three. The given-Respect heart came OFF
  // amber under the D174 A3 scope ruling -- a Respect already given is a stored
  // reaction, not the viewer's live moment, and the glyph already swaps
  // heart/heart-outline so the filled shape carries the state without colour.
  ['ActivityItemRow.js', 3],
  // F15: "Respect everyone who trained today" -- quiet by design, never
  // a committing action (its own header comment says so): no amber.
  ['RespectAllRow.js', 0],

  // ─── Every other file in the folder (F15 extension: a coverage net
  // against silent drift, not a rule-7 compliance ruling on each --
  // borderline ones named in the lane report) ───────────────────────────
  ['ActivityRow.js', 1], // the unread dot fill (legacy feed row, pre-dates PostCard's replacement by ActivityItemRow)
  ['CommentRow.js', 0],
  // The two unread dots (activity and messages) keep their amber. The
  // people-outline header glyph they sit on came off it under the D174 A3
  // scope ruling: an unconditional icon tint is decoration, and A3 protects
  // the dots, not the furniture around them.
  ['CommunityHeaderAction.js', 2], // the header glyph's icon colour, the unread-message-count badge fill, the plain "unseen" dot fill
  ['ComposerInput.js', 0],
  ['ConnectButton.js', 0],
  ['ConnectRequestRow.js', 0],
  ['ConnectSheet.js', 0],
  ['ConversationRow.js', 1], // the unread dot fill
  ['FollowButton.js', 0],
  ['GroupInviteSheet.js', 0],
  ['GymDetailSheet.js', 0],
  ['GymPicker.js', 0],
  ['GymRow.js', 0],
  ['GymSummary.js', 0],
  // The trained-today ring dot, and only that. The "See all" link went to full
  // ink under the D174 A3 scope ruling (a quiet text action is not "now").
  ['GymWeekBoard.js', 1], // the "See all" link text colour (live + its StyleSheet baseline) and the trained-today ring dot fill
  ['JoinToInteractRow.js', 0],
  ['MenuSheet.js', 0],
  // None. The in-message link colour went to full ink under the D174 A3 scope
  // ruling: `LinkedBody` underlines its links, so the affordance survives
  // without the accent -- and an underline does not depend on colour vision.
  ['MessageBubble.js', 0], // ComposerInput link colour passed to LinkedBody
  ['MessageComposer.js', 0],
  // Was 2 -- a Switch's track (at half alpha) and its thumb -- until D174 A1
  // ruled that a switch's on-state is a STORED PREFERENCE, not a live moment,
  // so it sits outside amber discipline 1's ceiling. The track is now the
  // neutral on-fill and the thumb the neutral ink. The pin's intent is
  // unchanged (this file's amber usage is counted exactly, and drift fails);
  // only the count moved, and it moved because the amber left. A3's unread-dot
  // entries in this table are the ones D174 ordered left alone, and they are.
  ['PeopleFiltersSheet.js', 0],
  ['PlacePicker.js', 0],
  ['PostCard.js', 0],
  // None. The shield glyph was an unconditional icon tint (D174 A3 scope
  // ruling).
  ['PrivacyReceipt.js', 0], // the shield-checkmark icon colour
  ['ProfileCard.js', 0],
  ['ProfileMenuSheet.js', 0],
  // None. This coloured EVERY bar with a value, not the tallest -- a whole
  // series in the accent, which is amber meaning nothing (D174 A3 scope
  // ruling). The heights still state the values.
  ['ProgressStrip.js', 0], // the tallest of the eight weekly-history bars
  ['ReportSheet.js', 0],
  ['SessionSheet.js', 0],
  // A placeholder in the shape of a PersonRow; it borrows the shared
  // Skeleton's own tint and carries no colour, so no amber (2026-09-14).
  ['SkeletonPersonRow.js', 0],
  ['TrainingProfileLine.js', 0],
];

describe('every Community component file\'s amber usage is pinned, none uncovered', () => {
  test('the table above is never allowed to drift from the folder (F15)', () => {
    const onDisk = fs.readdirSync(DIR)
      .filter((entry) => entry.endsWith('.js'))
      .sort();
    const inTable = AMBER_COUNTS.map(([file]) => file).sort();
    expect(inTable).toEqual(onDisk);
    // Belt and braces: readdirSync above already excludes directories
    // (a .js-suffix check can't match a directory name), so __tests__
    // itself is never a candidate -- asserted explicitly so a rename of
    // that folder to something ending .js (absurd, but the point of a
    // guard is never trusting "that could never happen") still fails
    // loudly instead of silently widening the table.
    expect(onDisk).not.toContain(TEST_DIR_NAME);
  });

  test.each(AMBER_COUNTS)('%s uses c.primary exactly %i time(s)', (file, expected) => {
    expect(primaryCount(file)).toBe(expected);
  });
});
