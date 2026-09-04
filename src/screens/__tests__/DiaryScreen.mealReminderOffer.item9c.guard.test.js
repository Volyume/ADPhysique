/**
 * Item 9(c) (D141, founder order 2026-09-04): the meal-log reminder
 * discovery offer on DiaryScreen.
 *
 * ED-safety (CLAUDE.md, ABSOLUTE): a food-adjacent nudge must never appear
 * under calm mode or an open ED-pattern flag. The pure eligibility rule
 * itself is unit-tested against every one of its five conditions in
 * src/lib/food/__tests__/mealReminderOffer.test.js; this is the source-level
 * guard that DiaryScreen actually WIRES the calm-mode and ED-flag reads into
 * that call, per the repo convention (screen load effects are exercised on
 * device, not jest-mounted -- see DiaryScreen.holdHints.guard.test.js and
 * siblings for the same pattern).
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');

describe('Item 9(c): DiaryScreen gates the meal-reminder offer on calm mode and the ED flag', () => {
  test('imports the pure resolver and the wellbeing helpers', () => {
    expect(SOURCE).toMatch(
      /import \{ resolveMealReminderOfferEligible, MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR \} from '\.\.\/lib\/food\/mealReminderOffer';/,
    );
    expect(SOURCE).toMatch(/import \{ WELLBEING_KEY, isCalm \} from '\.\.\/lib\/wellbeing';/);
  });

  test('the eligibility call passes both calmMode and edFlagOpen, fail-closed', () => {
    const site = SOURCE.indexOf('resolveMealReminderOfferEligible({');
    expect(site).toBeGreaterThan(-1);
    const block = SOURCE.slice(site, SOURCE.indexOf('}));', site));
    // Calm mode: a read failure ('read_failed') OR an actual calm reading
    // both suppress -- never just isCalm(wellbeing) alone, which would miss
    // the read-failure case CLAUDE.md requires fail CLOSED.
    expect(block).toMatch(/calmMode: wellbeingRaw === 'read_failed' \|\| isCalm\(wellbeing\)/);
    // ED flag: DiaryScreen's own edFlagOpen state, which load() already
    // fails closed (a transient read maps to the truthy 'read_failed'
    // sentinel before ever reaching setEdFlagOpen).
    expect(block).toMatch(/edFlagOpen: !!edFlagOpen/);
  });

  test('DiaryScreen\'s own edFlagOpen state is fail-closed at its source (unchanged, still gates banking too)', () => {
    expect(SOURCE).toMatch(/getOpenEdPatternFlag\(userId\)\.catch\(\(\) => 'read_failed'\)/);
  });

  test('the offer card only renders when the resolver says visible, no separate bypass', () => {
    expect(SOURCE).toMatch(/\{mealReminderOfferVisible \? \(/);
  });

  test('dismissing writes a per-user marker, so a dismissal cannot leak across accounts', () => {
    expect(SOURCE).toMatch(
      /AsyncStorage\.setItem\(MEAL_REMINDER_OFFER_DISMISSED_KEY_FOR\(userId\), 'true'\)\.catch\(\(\) => \{\}\);/,
    );
  });
});
