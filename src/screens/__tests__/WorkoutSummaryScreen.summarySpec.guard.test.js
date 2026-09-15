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
  test('the verdict renders through BigNumber', () => {
    expect(SRC).toContain("import BigNumber from '../components/BigNumber'");
    expect(SRC).toContain('testID="summary-verdict"');
  });

  test('exactly one loud element on the screen', () => {
    expect((SRC.match(/<BigNumber/g) || []).length).toBe(1);
  });

  test('the session name is finally rendered, as the eyebrow', () => {
    // It was loaded on every mount and used only for the share card title.
    expect(SRC).toContain('label={routineName || null}');
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
  test('both say borderSubtle', () => {
    // Third instance of this defect (LoggedSetRow, EvidencePanel, here): the
    // live half won and every tile drew the bright control-edge grey against
    // its own frozen intent.
    expect(SRC).toContain('borderColor: colors.borderSubtle');
    expect(SRC).toContain('statBox: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }');
    expect(SRC).not.toContain('statBox: { backgroundColor: t.colors.surface, borderColor: t.colors.border }');
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
