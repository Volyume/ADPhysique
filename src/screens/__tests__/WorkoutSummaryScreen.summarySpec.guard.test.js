/**
 * The workout summary, recomposed to law 1 (D167).
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * The screen used to shout TONNAGE at 40px and never once say which session
 * you had just done. Two things were wrong with that. Law 1 defines the loud
 * element as "always the thing the screen is for", and what this screen is for
 * is "how did that go?" -- tonnage answers the second question, not the first.
 * And the founder had already ruled tonnage is the WEEKLY non-scale signal on
 * Today (D167 ruling 3), so shouting it here said one word twice in two
 * places. The session name, meanwhile, was loaded on every mount purely to
 * title the share card.
 *
 * So the three screens now answer the founder's three questions in sequence:
 * Today shouts what you are about to do, this screen shouts how it went,
 * Progress shouts what to do next.
 *
 * The colour cases are the ones that will look like over-reach in review, so
 * the reasoning is here rather than in a commit message. The verdict used to
 * be tinted gold for a best, green for up, grey for down, beside a trophy or a
 * trend arrow. A headline tinted by how the session went is colour AS VERDICT,
 * which is the same good/bad tinting the app already refuses for body-weight
 * trends; law 6 narrows colour to one meaning; and the trophy and arrows are
 * category props. The sentence carries itself.
 *
 * AMENDED 2026-09-18 (D192, item 1). The founder's build-3583 device verdict
 * ("finish it properly... use your full judgement on sizes") produced the
 * finish spec's type rule: a sentence never sets at hero/display size, and a
 * sentence that IS the screen's loud element sets in h2 instead. This
 * verdict is a sentence, so "the loud thing is how it went" now renders as
 * plain Text at h2 (three Texts: overline / headline / sub), not through
 * BigNumber at hero size. The three cases that named BigNumber directly are
 * re-anchored below to the same intent under the new mechanism; every other
 * case in this file (the colour/trophy/arrow refusals, the sentence content,
 * the tonnage move, the ED-safety/milestone survival) was unaffected and is
 * untouched.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const SRC = code(read('src/screens/WorkoutSummaryScreen.js'));

describe('law 1: the loud thing is how it went', () => {
  // RE-ANCHORED 2026-09-18 (D192, item 1): the finish spec (section 2) rules
  // that "the hero and display steps carry a NAME or a NUMBER, never a
  // sentence" and that "a sentence that is the screen's loud element sets in
  // h2". The verdict is a sentence ("Strongest workout in 4 weeks"), so it no
  // longer renders through BigNumber at hero size -- it is three plain Texts
  // (overline / h2 headline / bodySm sub) sharing the elevated Card. The
  // intent this law protects -- the verdict is still the one thing the
  // screen is loudest about, and it is still findable by one testID -- is
  // unchanged; only the mechanism moved, on the founder's device order to
  // redo the sizes under full lead judgement (D192, build 3583 walk).
  test('the verdict renders as plain Text, findable by its testID', () => {
    expect(SRC).not.toContain("import BigNumber from '../components/BigNumber'");
    expect(SRC).toContain('testID="summary-verdict"');
  });

  test('exactly one loud element on the screen: zero hero-scale, one verdict headline', () => {
    // D192 retires BigNumber/type.hero from this screen entirely -- a
    // sentence verdict never sets at hero size (finish spec section 2) -- so
    // "exactly one loud element" is now pinned as zero BigNumber usages plus
    // exactly one testID="summary-verdict" headline, rather than one
    // BigNumber mount.
    expect((SRC.match(/<BigNumber/g) || []).length).toBe(0);
    expect((SRC.match(/testID="summary-verdict"/g) || []).length).toBe(1);
  });

  test('the session name is finally rendered, as the overline', () => {
    // It was loaded on every mount and used only for the share card title.
    // RE-ANCHORED: no longer BigNumber's `label` prop -- it is its own Text,
    // styled `summaryVerdictOverline` (type.overline/textMuted per the
    // finish spec), rendered only when a routine name exists.
    expect(SRC).toContain('styles.summaryVerdictOverline');
    expect(SRC).toMatch(/\{routineName \? \(/);
  });

  test('the display-size tonnage counter is gone, not just unused', () => {
    // StatBox's `hero` branch and the `heroValue`/`heroValueWrap`/
    // `heroValueLabel` styles went with the change. A dead branch left behind
    // a guard is worse than useless: it pins code nothing renders and blocks
    // the next person from cleaning it up.
    expect(SRC).not.toContain('hero = false');
    expect(SRC).not.toContain('if (hero)');
    // The STYLE keys specifically. `milestone.heroValue` is a different
    // thing entirely -- the share-card payload's own field name -- and must
    // not be caught by this.
    expect(SRC).not.toMatch(/heroValue:\s*\{/);
    expect(SRC).not.toContain('heroValueWrap');
    expect(SRC).not.toContain('heroValueLabel');
    expect(SRC).not.toContain("type.num('display')");
  });
});

describe('law 7 survived the move', () => {
  test('tonnage keeps its unit and its correct label in the stat grid', () => {
    expect(SRC).toContain("value={formatWithUnit(formatNumber(Math.round(tonnage || 0)), units === 'lbs' ? 'lbs' : 'kg')}");
    expect(SRC).toContain('label="Total lifted"');
    // "Volume" means a muscle's weekly hard sets app-wide.
    expect(SRC).not.toContain('label="Volume"');
    expect(SRC).not.toContain('label="Total volume"');
  });

  test('the grid carries four stats and wraps for them', () => {
    expect((SRC.match(/<StatBox/g) || []).length).toBe(4);
    expect(SRC).toContain("flexDirection: 'row', flexWrap: 'wrap'");
    expect(SRC).toContain('minWidth: 136');
  });
});

describe('law 6: the verdict is not coloured by how it went', () => {
  test('no colour accent is computed for the headline', () => {
    const block = SRC.slice(
      SRC.indexOf('const { verdict, pct, position, total, priorCount } = comparison;'),
      SRC.indexOf('testID="summary-verdict"'),
    );
    expect(block.length).toBeGreaterThan(200);
    expect(block).not.toContain('accent');
    expect(block).not.toMatch(/colors\.(gold|success|error|warning)/);
  });

  test('no trophy or trend arrow beside it', () => {
    const block = SRC.slice(
      SRC.indexOf('const { verdict, pct, position, total, priorCount } = comparison;'),
      SRC.indexOf('testID="summary-verdict"'),
    );
    expect(block).not.toContain('trophy-outline');
    expect(block).not.toContain('trending-up-outline');
    expect(block).not.toContain('trending-down-outline');
  });

  test('every verdict branch still produces its sentence', () => {
    for (const s of [
      "'First time on this session'",
      "'Strongest workout in 4 weeks'",
      'vs your 4-week average',
      'On pace with your last',
    ]) {
      expect({ s, present: SRC.includes(s) }).toEqual({ s, present: true });
    }
  });
});

describe('the frozen and live halves agree about the stat tile border', () => {
  // RE-ANCHORED 2026-09-17 (D186): this pinned a defect where the live half
  // read `t.colors.border` while the frozen half set `colors.borderSubtle`
  // (third instance: LoggedSetRow, EvidencePanel, here), so the two halves
  // disagreed on the tile's border colour. D186 follow-up (D165 law 2: a
  // number is not an object) removed statBox's fill/corner/border outright
  // -- there is no border colour left on the tile for the two halves to
  // disagree about, and no live.statBox key left to carry one. The intent
  // ("the two halves never silently disagree about this surface") moves to
  // statsGrid, the row that now carries the shared hairline, which is where
  // the file's one borderSubtle-bearing key for this area lives.
  test('the tile lost its border entirely; the row above agrees with itself on borderSubtle', () => {
    expect(SRC).not.toMatch(/statBox:\s*\{[^}]*borderColor/);
    expect(SRC).toContain('borderTopColor: colors.borderSubtle, paddingTop: spacing.md');
    expect(SRC).toContain('statsGrid: { borderTopColor: t.colors.borderSubtle }');
    expect(SRC).not.toContain('statsGrid: { borderTopColor: t.colors.border }');
  });
});

describe('ED-safety and the celebration are untouched', () => {
  test('the suppression read still fails closed', () => {
    expect(SRC).toContain("getOpenEdPatternFlag(user.id).catch(() => 'read_failed')");
    expect(SRC).toContain("isCalm(mode) || mode === 'read_failed'");
  });

  test('the milestone moment survives: the card, its copy and its share action', () => {
    // D170. The milestone was never the problem. It is effort-framed, counts
    // sessions and never weight, cannot break, and fires twice in a lifetime.
    expect(SRC).toContain('setMilestone(shown)');
    expect(SRC).toContain('handleShareMilestone');
    expect(SRC).toContain('milestoneCard');
  });

  test('the gold particle burst and the reward haptic are gone', () => {
    // D2 gave the 50- and 100-session rungs a full-screen gold burst and the
    // celebration haptic ladder; law 5 forbids exactly those two things. The
    // founder delegated the call. What went is the particle physics: a gold
    // burst is the most game-like device in the product and the direction is
    // "no gamification" in as many words. Law 5's two justifications are
    // ED-safety and not feeling like a game, and it is the second that
    // settles this one.
    expect(SRC).not.toContain('MilestoneBurst');
    expect(SRC).not.toContain('milestoneBurst');
    expect(SRC).not.toContain('hapticMilestone');
    expect(SRC).not.toContain('prAchieved');
  });

  test('every rung now gets the same quiet tick', () => {
    // Not a reward curve, and not scaled to the rung: a selection tick is
    // feedback that something happened, which is what law 5 allows.
    expect(SRC).toContain('hapticSelection()');
    const claim = SRC.slice(SRC.indexOf('if (shown) {'), SRC.indexOf('} catch (_) {}'));
    expect(claim).not.toMatch(/sessions_50|sessions_100/);
  });

  test('the celebration is still withheld under calm mode or an open flag', () => {
    expect(SRC).toContain('calmSuppressed');
  });
});
