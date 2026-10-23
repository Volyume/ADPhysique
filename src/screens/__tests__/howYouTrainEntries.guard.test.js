/**
 * howYouTrainEntries.guard.test.js - where "Injuries & limitations" lives
 * (founder decision D134, 2026-09-03; renamed in copy by D152, 2026-09-05;
 * repo convention: fs.readFileSync + regex).
 *
 * The feature every plan is built from used to be reachable only three
 * taps deep in Settings until something was set up. It now has three
 * organic entries, pinned here so none can quietly regress:
 *  1. a row in the Train tab's Your setup group (D231: it was the first row
 *     of Plan tools), always shown, with a live one-line status;
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

describe('1. Train tab: a row in Your setup, always shown', () => {
  // RE-POINTED (D231, app layout rework batch 2): the "Plan tools" card list is
  // two NavRow groups now. The Injuries & limitations row is in "Your setup",
  // after Adjust training plan (which needs an active plan), still always shown,
  // still carrying the live line, and the three always-on lines from Today sit
  // under it. Avoided movements has no row of its own; HowYouTrain offers it.
  test('the row sits in Your setup and carries the live line', () => {
    const setup = plans.slice(plans.indexOf('<SectionLabel>Your setup</SectionLabel>'));
    const rowAt = setup.indexOf('label="Injuries & limitations"');
    expect(rowAt).toBeGreaterThan(-1);
    const block = setup.slice(setup.lastIndexOf('<NavRow', rowAt), setup.indexOf('/>', rowAt) + 2);
    expect(block).toContain("onPress={() => navigation.navigate('HowYouTrain')}");
    expect(block).toContain('sub={hytSummary.sub}');
    // Always shown: no count or state condition wraps it (unlike Adjust training plan, which needs a plan).
    const before = setup.slice(setup.indexOf('<NavGroup>'), setup.lastIndexOf('<NavRow', rowAt));
    expect(before).not.toContain('hytSummary.empty');
    expect(setup.slice(setup.lastIndexOf('<NavRow', rowAt) - 40, setup.lastIndexOf('<NavRow', rowAt))).not.toMatch(/&&\s*\(?\s*$/);
    // The lines from Today follow the row inside the same group.
    expect(setup.indexOf('<InjuryLines', rowAt)).toBeGreaterThan(rowAt);
  });
  test('Avoided movements has no row on Train; HowYouTrain offers it', () => {
    expect(plans).not.toContain('avoidedMovementsCount');
    expect(plans).not.toMatch(/label="Avoided movements|Avoided movements ·|Avoided movements, \$/);
    expect(read('screens/HowYouTrainScreen.js')).toMatch(/label="Movements you would rather not do"[\s\S]{0,700}navigation\.navigate\('AvoidedMovements'\)/);
  });
  test('the line is refreshed on every focus from the real capability state', () => {
    expect(plans).toContain('loadHowYouTrainSummary();');
    expect(plans).toContain('loadCapabilityState(user.id)');
    expect(plans).toContain("import { howYouTrainSummary } from '../lib/capability/summary';");
  });
});

// RE-POINTED (D231, app layout rework batch 4): "Injuries & limitations" leaves
// the Coach tab (its home is Train, section 1 above; Settings lost its row in
// batch 5). The Coach screen carries no row for it, no door to HowYouTrain and no
// read of the capability summary; HowYouTrain stays registered in the Coach stack
// because screens that open it from there (Settings) and the capability sweep
// need it.
describe('2. Coach tab: no Injuries & limitations row (home: Train)', () => {
  test('the Coach screen has no Injuries & limitations row, no "Your body" group and no door to HowYouTrain', () => {
    expect(coach).not.toContain('label="Injuries & limitations"');
    expect(coach).not.toContain('<SectionLabel>Your body</SectionLabel>');
    expect(coach).not.toContain("navigate('HowYouTrain')");
    expect(coach).not.toContain('hytSummary');
    expect(coach).not.toContain('howYouTrainSummary');
  });
  test('HowYouTrain is still registered in the Coach stack', () => {
    const nav = read('navigation/RootNavigator.js');
    const stack = nav.slice(nav.indexOf('function ProfileStack('), nav.indexOf('\nfunction MainTabs'));
    expect(stack).toContain('<Stack.Screen name="HowYouTrain"');
  });
});


describe('3. Home: one calm, one-time offer', () => {
  test('gated on nothing set up, the first session logged (or the old welcome flag), and an empty offer slot', () => {
    // RE-POINTED (D231, app layout rework batch 1): the Welcome card is gone, so
    // "the welcome card retired" is "the first session logged, or the old
    // welcome-dismissed flag set for an existing user" (the same condition,
    // unchanged); "an empty attention slot" is the one offer slot, where this
    // question ranks second after the full "Set up coaching" card.
    expect(home).toContain('howYouTrain: !initialLoading && hytNothingSetUp && !hytOfferDismissed');
    expect(home).toContain('&& (totalSessions > 0 || welcomeDismissed),');
    expect(home).toContain("{shownOfferKey === 'howYouTrain' ? (");
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
    expect(card).toContain('Injuries, pain, long-term conditions or disabilities.');
    expect(card).toContain('Entirely optional');
    expect(card).not.toMatch(/are you disabled|do you have a disability/i);
    expect(card).not.toMatch(/—/);
  });
});

describe('the live line and the entries that stay', () => {
  test('the summary never uses diagnosis or restriction vocabulary and offers rather than asks', () => {
    expect(summary).toContain("export const HOW_YOU_TRAIN_OFFER = 'Injuries, pain, long-term conditions or disabilities that affect your training.';");
    // Scoped to what a person can read: the string literals, not the
    // comments that explain the law.
    const text = (summary.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []).join(' ');
    expect(text).not.toMatch(/restricted|modified|diagnos/i);
  });
  // RE-POINTED (D231, app layout rework batch 5): the Settings row left (the
  // owner answered "Remove both"); the feature is reached from Train, Today's
  // need-moment rows and the offer, which other assertions here pin.
  test('the Settings row is gone', () => {
    expect(settings).not.toContain('label="Injuries & limitations"');
    expect(settings).not.toContain("navigation.navigate('HowYouTrain')");
  });
  test('no em dash in any of the new copy', () => {
    for (const src of [plans, coach, home, card, summary]) expect(src).not.toMatch(/—/);
  });
});
