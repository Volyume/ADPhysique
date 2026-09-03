/**
 * howYouTrainEntries.guard.test.js - where "How you train" lives (founder
 * decision D134, 2026-09-03; repo convention: fs.readFileSync + regex).
 *
 * The feature every plan is built from used to be reachable only three
 * taps deep in Settings until something was set up. It now has three
 * organic entries, pinned here so none can quietly regress:
 *  1. the FIRST row of the Train tab's Plan tools, always shown, with a
 *     live one-line status;
 *  2. a tier-blind row on the Coach tab, above the Pro-only Setup, so a
 *     free account sees it (CAP-19);
 *  3. a one-time Home offer for a person with nothing set up: only once
 *     the welcome card has retired, only when no ranked banner holds the
 *     attention slot, dismissed forever by either button, and retired by
 *     itself the moment anything is set up.
 * The Settings row and every need-moment entry stay as they were.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
const plans = read('screens/PlansScreen.js');
const coach = read('screens/YouScreen.js');
const home = read('screens/HomeScreen.js');
const card = read('components/HomeHowYouTrainOfferCard.js');
const summary = read('lib/capability/summary.js');
const settings = read('screens/SettingsScreen.js');

describe('1. Train tab: first row of Plan tools, always shown', () => {
  test('the row is the first card after the Plan tools label and carries the live line', () => {
    const tools = plans.slice(plans.indexOf('<SectionLabel>Plan tools</SectionLabel>'));
    const firstCard = tools.indexOf('<Card');
    const block = tools.slice(firstCard, tools.indexOf('</Card>', firstCard));
    expect(block).toContain("onPress={() => navigation.navigate('HowYouTrain')}");
    expect(block).toContain('>How you train</Text>');
    expect(block).toContain('{hytSummary.sub}');
    // Always shown: no count or state condition wraps it (unlike Avoided movements, D109-3).
    const before = tools.slice(0, firstCard);
    expect(before).not.toMatch(/&&\s*\($/m);
    expect(before).not.toContain('hytSummary.empty');
  });
  test('the line is refreshed on every focus from the real capability state', () => {
    expect(plans).toContain('loadHowYouTrainSummary();');
    expect(plans).toContain('loadCapabilityState(user.id)');
    expect(plans).toContain("import { howYouTrainSummary } from '../lib/capability/summary';");
  });
});

describe('2. Coach tab: a tier-blind row above the Pro-only Setup', () => {
  test('the row sits outside every isPro branch and before "This week"', () => {
    const rowIdx = coach.indexOf('label="How you train"');
    expect(rowIdx).toBeGreaterThan(-1);
    expect(rowIdx).toBeLessThan(coach.indexOf('<SectionLabel>This week</SectionLabel>'));
    // The nearest preceding tier branch must be CLOSED before the row.
    const before = coach.slice(0, rowIdx);
    const lastOpen = before.lastIndexOf('{isPro ? (');
    const lastClose = before.lastIndexOf(') : null}');
    expect(lastClose).toBeGreaterThan(lastOpen);
    expect(coach.slice(rowIdx - 400, rowIdx)).toContain('<SectionLabel>Your body</SectionLabel>');
  });
  test('the row navigates to the feature and carries the live line', () => {
    const row = coach.slice(coach.indexOf('label="How you train"'), coach.indexOf('label="How you train"') + 200);
    expect(row).toContain('sub={hytSummary.sub}');
    expect(row).toContain("navigation.navigate('HowYouTrain')");
    expect(row).not.toContain('pro={');
  });
});

describe('3. Home: one calm, one-time offer', () => {
  test('gated on nothing set up, the welcome card retired, and an empty attention slot', () => {
    expect(home).toContain('{!initialLoading && hytNothingSetUp && !hytOfferDismissed && (totalSessions > 0 || welcomeDismissed) && shownBannerKey == null && (');
  });
  test('"nothing" means no rows at all, history included, so a person who ended things is never re-offered', () => {
    expect(home).toContain('setHytNothingSetUp(!full.unavailable && !full.baseline.length && !full.episodes.length && !full.history.length)');
  });
  test('either button dismisses forever; Set it up opens the add wizard', () => {
    expect(home).toContain("onSetUp={() => { haptics.selection(); dismissHytOffer(); navigation.navigate('HowYouTrainAdd'); }}");
    expect(home).toContain('onDismiss={() => { haptics.selection(); dismissHytOffer(); }}');
    expect(home).toContain("const hytOfferKey = user?.id ? `@volyume_hyt_offer_${user.id}` : null;");
    expect(home).toContain("if (hytOfferKey) AsyncStorage.setItem(hytOfferKey, 'true').catch(() => {});");
    // Defaults dismissed so it never flashes before the stored flag is read.
    expect(home).toContain('const [hytOfferDismissed, setHytOfferDismissed] = useState(true);');
  });
  test('the card is an offer in the person\'s words, never a question about the person', () => {
    expect(card).toContain('Anything Volyume should build your training around?');
    expect(card).toContain('Entirely optional');
    expect(card).not.toMatch(/are you disabled|do you have a disability/i);
    expect(card).not.toMatch(/—/);
  });
});

describe('the live line and the entries that stay', () => {
  test('the summary never uses diagnosis or restriction vocabulary and offers rather than asks', () => {
    expect(summary).toContain("export const HOW_YOU_TRAIN_OFFER = 'Injury, pain, a condition or a disability? Volyume builds around it.';");
    // Scoped to what a person can read: the string literals, not the
    // comments that explain the law.
    const text = (summary.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []).join(' ');
    expect(text).not.toMatch(/restricted|modified|diagnos/i);
  });
  test('the Settings row stays', () => {
    expect(settings).toContain('label="How you train"');
    expect(settings).toContain("navigation.navigate('HowYouTrain')");
  });
  test('no em dash in any of the new copy', () => {
    for (const src of [plans, coach, home, card, summary]) expect(src).not.toMatch(/—/);
  });
});
