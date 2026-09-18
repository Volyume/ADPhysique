/**
 * Today, recomposed to the founder's specification (D165/D167).
 *
 * Authority: founder in chat 2026-09-14, specifying the screen in their own
 * order — "TODAY / Tuesday 15 September / Upper A / 6 exercises . 18 sets .
 * ~52 min / START / YOUR WEEK / [ribbon] / 4 sessions this week / Nutrition /
 * Progress / COACH" — and, separately, "I'd make TODAY the centre of the
 * entire product ... What's happening, what happened, what should I do."
 * Plan section 4c; rulings D166 (the ED-safety answers) and D167.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * Two of these sections are safety-bearing, and both fail in a direction that
 * would not be visible on a working device:
 *
 *  - The nutrition block is food-adjacent. Home derives suppression once, from
 *    two ED reads the `edFlagFailClosed` guard pins to exactly that number, and
 *    carries it on `firstReviewFacts.edFlagOpen`. If that derivation has not
 *    landed or failed, `firstReviewFacts` is null — and `null?.edFlagOpen` is
 *    falsy, which reads as "not suppressed". So the gate must lead with the
 *    existence check, not the flag. A developer writing the obvious
 *    `!firstReviewFacts?.edFlagOpen` would ship a screen that shows intake
 *    figures to a flagged person whenever a read is slow.
 *
 *  - The coach sentence must come from `readLatestDecision`, never from
 *    `whyThisWeek` directly, because `buildDecision`'s FIRST branch is the
 *    ED-pattern lockout (D166). A renderer reaching past it shows a cheerful
 *    calorie instruction to someone the app has flagged.
 *
 * The rest pin that the screen says what it means: a unit on every figure
 * (law 7), "total lifted" rather than "volume", and one loud element rather
 * than several.
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

const HOME = code(read('src/screens/HomeScreen.js'));

describe('law 1: one loud thing, and it is the session', () => {
  test('the session name renders through BigNumber, not a 24px Text', () => {
    expect(HOME).toContain("import BigNumber from '../components/BigNumber'");
    // Anchor on the training-day hero specifically: three branches each carry
    // a BigNumber, and matching the first would test the wrong one.
    const start = HOME.indexOf('testID="hero-session-name"');
    expect(start).toBeGreaterThan(-1);
    const hero = HOME.slice(HOME.lastIndexOf('<BigNumber', start), HOME.indexOf('/>', start));
    expect(hero).toContain('sessionDisplayName(');
    expect(hero).toContain('caption={circuitLine || heroMetaLine}');
  });

  test('every hero branch carries its loud fact, and only one can render at a time', () => {
    // Three BigNumbers in source, one on screen: the hero is a ternary chain
    // whose precedence is pinned by HomeScreen.heroPrecedence.guard.
    // RE-ANCHORED (D192, 2026-09-18): the hero step carries a name or a
    // number, never a sentence. The session NAME still renders through
    // BigNumber; the block-complete and week-complete branches are sentences
    // and set in h2 through `heroSentence`. Still one loud fact per branch,
    // still one branch on screen at a time.
    expect((HOME.match(/<BigNumber/g) || []).length).toBe(1);
    expect((HOME.match(/styles\.heroSentence/g) || []).length).toBe(2);
    expect(HOME).toContain('<Text style={[styles.heroSentence, live.heroSentence]}>Every week of this block is done</Text>');
    expect(HOME).toContain('<Text style={[styles.heroSentence, live.heroSentence]}>Every session done this week</Text>');
    expect((HOME.match(/\) : blockAwaitingDecision \? \(/g) || []).length).toBe(1);
  });

  test('the retired 24px session-name style is gone from every hero branch', () => {
    // `workoutName` was fontSize.xxl + fontFamily.heavy + a raw lineHeight: 30.
    // Three hero branches carried it; converting only the training-day one
    // would leave the law applied inconsistently, which is what this caught.
    expect(HOME).not.toContain('styles.workoutName');
    expect(HOME).not.toContain('live.workoutName');
    expect(HOME).not.toContain('styles.heroBody');
    expect(HOME).not.toContain('styles.workoutMeta');
  });
});

describe('the four sections, in the founder order', () => {
  test('all four are present', () => {
    for (const label of ['Your week', 'Nutrition', 'Progress', 'Coach']) {
      expect({ label, present: HOME.includes(`<SectionLabel tone="muted">${label}</SectionLabel>`) })
        .toEqual({ label, present: true });
    }
  });

  test('they render in the founder order', () => {
    const at = (l) => HOME.indexOf(`<SectionLabel tone="muted">${l}</SectionLabel>`);
    expect(at('Your week')).toBeLessThan(at('Nutrition'));
    expect(at('Nutrition')).toBeLessThan(at('Progress'));
    expect(at('Progress')).toBeLessThan(at('Coach'));
  });

  test('none of them is a card, because none of them is an object', () => {
    // Law 2, as the founder corrected it. A week, a macro figure and a trend
    // are readings, not things you pick up.
    const span = HOME.slice(
      HOME.indexOf('<SectionLabel tone="muted">Your week</SectionLabel>'),
      HOME.indexOf('<SectionLabel tone="muted">Coach</SectionLabel>'),
    );
    expect(span).not.toContain('<Card');
    expect(span).not.toContain('PressableCard');
  });
});

describe('the week ribbon', () => {
  test('it draws the shared component from data the week loader already has', () => {
    expect(HOME).toContain("import WeekRibbon from '../components/WeekRibbon'");
    expect(HOME).toContain('<WeekRibbon days={trainedDaysThisWeek}');
  });

  test('the trained days come from the shared pure derivation, not a new one', () => {
    // A second week-boundary derivation on this screen is exactly what
    // HomeScreen.weekBoundaryConsistency.guard exists to prevent.
    expect(HOME).toContain("import { computeConsistency } from '../lib/community/trainingConsistency'");
    expect(HOME).toContain('c_trained_days_week');
    expect(HOME).not.toMatch(/getDay\(\)\s*\]/);
  });

  test('a quiet week says so plainly, with no streak and no shame', () => {
    expect(HOME).toContain("'No sessions yet this week.'");
    expect(HOME).not.toMatch(/\bstreak\b|don't break|keep it up|\bmissed\b/i);
  });
});

describe('ED-safety: the nutrition block fails CLOSED', () => {
  test('the gate leads with the existence check, so an unread derivation suppresses', () => {
    // `!firstReviewFacts?.edFlagOpen` would be the obvious spelling and would
    // be fail-OPEN: null reads as not-suppressed. This is the whole case.
    expect(HOME).toContain('firstReviewFacts && !firstReviewFacts.edFlagOpen');
    expect(HOME).not.toContain('!firstReviewFacts?.edFlagOpen');
  });

  test('no third ED read was added to this file', () => {
    // edFlagFailClosed.guard pins this count at exactly two, and its header
    // records that the number "follows the surviving loaders rather than being
    // weakened". A new food surface reusing the derived value keeps it at two.
    expect((HOME.match(/getOpenEdPatternFlag\(/g) || []).length).toBe(2);
  });

  test('every ED read still fails closed', () => {
    const reads = HOME.match(/getOpenEdPatternFlag\([^)]*\)\.catch\(\(\) => '[a-z_]+'\)/g) || [];
    expect(reads.length).toBe(2);
    reads.forEach((r) => expect(r).toContain("'read_failed'"));
  });
});

describe('ED-safety: the coach sentence keeps its lockout branch', () => {
  test('it is read through readLatestDecision, never from whyThisWeek directly', () => {
    expect(HOME).toContain("import { readLatestDecision, decisionAgeCaption } from '../lib/coachLatestDecision'");
    expect(HOME).toContain('setCoachDecision(await readLatestDecision(user.id))');
    // Reaching past buildDecision is the failure this prevents.
    expect(HOME).not.toContain('whyThisWeek');
  });

  test('it renders only for a week that was really checked in', () => {
    expect(HOME).toContain('const coachSentenceShown = !!(coachDecision?.sentence && coachDecision.isCompleted)');
    expect(HOME).toContain('{!initialLoading && coachSentenceShown && (');
  });

  test('the Today line pointer stands down when the sentence itself renders', () => {
    // The rank-3 Today line is "This week's coaching decision. See why." -- a
    // signpost that existed because the sentence was unreachable from Today.
    // Showing both would put a signpost and its destination on one screen.
    // Both read the SAME expression so they cannot disagree about which shows.
    expect(HOME).toContain('eligible: showCoachBanner && !coachSentenceShown');
  });

  test('a stale decision is captioned as stale, not presented as current', () => {
    expect(HOME).toContain('decisionAgeCaption(coachDecision.weeksAgo)');
  });
});

describe('law 7: a number states what it is', () => {
  test('the progress figure carries its unit in the users own preference', () => {
    expect(HOME).toContain("formatWithUnit(formatNumber(Math.round(weekStats.volume)), units === 'lbs' ? 'lbs' : 'kg')");
  });

  test('it is called "lifted", never "volume"', () => {
    // Volume means a muscle's weekly hard sets app-wide. This lens was renamed
    // once already because colliding the two names misled users.
    const span = HOME.slice(
      HOME.indexOf('<SectionLabel tone="muted">Progress</SectionLabel>'),
      HOME.indexOf('<SectionLabel tone="muted">Coach</SectionLabel>'),
    );
    expect(span).toContain('lifted');
    expect(span.toLowerCase()).not.toContain('volume lifted');
  });

  test('the nutrition figures carry their units', () => {
    expect(HOME).toContain('kcal`');
    expect(HOME).toContain('Protein ${todayNutrition.protein} / ${todayNutrition.proteinTarget} g`');
  });

  test('the progress signal is not the scale', () => {
    // D166 answer 3: Today shows a non-scale signal. A weekly kg delta here
    // is the thing the founder ruled out.
    const span = HOME.slice(
      HOME.indexOf('<SectionLabel tone="muted">Progress</SectionLabel>'),
      HOME.indexOf('<SectionLabel tone="muted">Coach</SectionLabel>'),
    );
    expect(span).not.toContain('deltaLabel');
    expect(span).not.toMatch(/this week.{0,12}kg\b(?!.*lifted)/);
  });
});

describe('the sections reach real destinations', () => {
  test('nutrition opens the Diary tab, which exists', () => {
    expect(HOME).toContain("navigateCrossTab(navigation, 'DiaryTab', 'Diary')");
    const nav = code(read('src/navigation/RootNavigator.js'));
    expect(nav).toContain('name="DiaryTab"');
    expect(nav).toContain('name="Diary"');
  });

  test('the coach sentence opens CoachOutput on the Coach tab, which exists', () => {
    expect(HOME).toContain("navigateCrossTab(navigation, 'ProfileTab', 'CoachOutput')");
    const nav = code(read('src/navigation/RootNavigator.js'));
    expect(nav).toContain('name="ProfileTab"');
    expect(nav).toContain('name="CoachOutput"');
  });
});
