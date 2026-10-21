/**
 * The gym challenge terms page (public/challenge-terms/index.html; gym
 * challenge SPEC section 5 and M10), read as source.
 *
 * Every challenge must have terms (promoter, eligibility, how to enter, how
 * scores work, the draws, winners, withdrawal, free for life), and they live
 * outside /c/ because the verified app link captures every /c/ path. This
 * suite pins the parts a later edit could quietly break:
 *  - the ten numbered sections, in order, with the agreed headings and the
 *    agreed wording of each (read with the facts left general, the form the
 *    page has before a challenge is found);
 *  - the promoter constants: Volyume is the promoter, and the postal address
 *    line renders only when an address is set (the founder ruled on
 *    2026-10-20 that none is published, so the constant is empty);
 *  - the scoring table agrees, row for row, with the one on the landing page
 *    (public/c/index.html), and the core and coaching parts add up to 80 and
 *    20;
 *  - the page asks the same anon RPC the landing page asks,
 *    gym_challenge_public, with the same project and public key, and shows a
 *    calm line (not a blank or an error) when it finds no challenge;
 *  - no em dash anywhere, and no tracking of any kind.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const terms = read('public', 'challenge-terms', 'index.html');
const landing = read('public', 'c', 'index.html');

const scriptOf = (html) => html.match(/<script>([\s\S]*?)<\/script>/)[1];
const termsScript = scriptOf(terms);
const landingScript = scriptOf(landing);

// The page as a reader sees it before any challenge is found: no comments,
// no script, no style, no tags, one space between words.
const bodyText = terms
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<br>/g, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ');

// Each table row as [label, tag, points], the same way for both pages.
function scoringRows(html) {
  return [...html.matchAll(/<tr><td>(.*?)<\/td><td class="pts">(\d+)<\/td><\/tr>/g)].map((m) => {
    const tag = /<span class="tag">(.*?)<\/span>/.exec(m[1]);
    return [m[1].replace(/<[^>]+>/g, '').replace(tag ? tag[1] : '', '').trim(), tag ? tag[1] : '', Number(m[2])];
  });
}

describe('the ten sections', () => {
  it('are numbered 1 to 10 with the agreed headings, in order', () => {
    const found = [...terms.matchAll(/<h2><span class="n">(\d+)<\/span> ([^<]+)<\/h2>/g)]
      .map((m) => [Number(m[1]), m[2]]);
    expect(found).toEqual([
      [1, 'Who runs it'],
      [2, 'Who can enter'],
      [3, 'How to enter'],
      [4, 'How you score'],
      [5, 'The draws'],
      [6, 'Winners'],
      [7, 'Fair play'],
      [8, 'Leaving'],
      [9, 'Free for life'],
      [10, 'Your data'],
    ]);
  });

  it('say what was agreed, with the facts left general', () => {
    [
      'Each gym challenge on Volyume is run by Volyume (the promoter).',
      'Contact: support@volyume.app',
      'Anyone aged 18 or over who trains at the gym running the challenge can enter. You confirm you are 18 or over when you join, and a winner must show proof of age before a prize is given.',
      'Entry is free and no purchase is needed. Join in the Volyume app, from the challenge link or code, between the dates shown in the app (UK time).',
      'A training day counts when a workout lasts at least 20 minutes, has at least 6 working sets and is saved within 7 days. One training day counts per day.',
      "Your weekly target is your plan's sessions a week, between 2 and 6. It follows your plan during your first week in the challenge, and after that it can only go up.",
      'Food logging counts up to 3 days a week, and a weigh-in once a week. Logging more often earns nothing more.',
      'Getting stronger compares your best on each exercise with your first session of it in the challenge.',
      'Everyone is scored over the whole challenge, whenever they join.',
      "The challenge never reads what you ate or what you weigh. While calm mode is on, or while Volyume's safety check has paused your calorie changes, food logging and weigh-ins count as done for those days.",
      "Everyone who reaches the main prize score shown in the app by the end goes into the main prize draw.",
      "Everyone who reaches the second prize score shown in the app goes into the second prize draw, except the main draw's winners.",
      "Winners are picked by a recorded computer draw within 14 days after the challenge ends. Each draw's list of entries is kept so the draw can be checked.",
      "Winners are told by email within 7 days of the draw. If a winner does not reply within 14 days, or cannot show they are 18 or over, the prize is drawn again. There is no cash alternative. The winner's name and county are published unless they object when told.",
      'Volyume can leave out an entry that does not reflect real training, and decides any question about scoring.',
      'You can leave the challenge at any time in the app. You are then taken off the board and are not scored again.',
      'Completing a challenge with a final score of 50 or more earns free for life. If you leave a challenge before it ends, you can no longer earn it.',
    ].forEach((sentence) => expect(bodyText).toContain(sentence));
  });

  it('send the data section to section 9, Gym challenges, of the privacy policy', () => {
    expect(terms).toMatch(/section 9, Gym challenges, of the <a class="inline" href="https:\/\/volyume\.app\/privacy\/">/);
  });

  it('fill the draw sentences from the challenge thresholds in the agreed words', () => {
    expect(termsScript).toContain("'Everyone who scores ' + main + ' or more by the end goes into the main prize draw.'");
    expect(termsScript).toContain("' or more goes into the second prize draw, except the main draw\\'s winners.'");
  });

  it('show each prize only when the challenge has one', () => {
    expect(terms).toMatch(/<p id="prizeMainLine" hidden>/);
    expect(terms).toMatch(/<p id="prizeSecondLine" hidden>/);
    expect(termsScript).toMatch(/if \(prizeMain\) \{[^}]*show\('prizeMainLine'\);/);
    expect(termsScript).toMatch(/if \(prizeSecond\) \{[^}]*show\('prizeSecondLine'\);/);
  });
});

describe('the promoter', () => {
  it('is Volyume, reachable at support@volyume.app', () => {
    expect(termsScript).toMatch(/^\s*var PROMOTER_NAME = 'Volyume';$/m);
    expect(termsScript).toMatch(/^\s*var PROMOTER_EMAIL = 'support@volyume\.app';$/m);
    // The constants lead the script, ahead of everything that uses them.
    expect(termsScript.indexOf('PROMOTER_NAME')).toBeLessThan(termsScript.indexOf('SUPABASE_URL'));
  });

  it('is also written into the page, so the terms read in full without scripts', () => {
    expect(terms).toContain('<span id="promoterName">Volyume</span>');
    expect(terms).toContain('<a class="inline" id="promoterEmail" href="mailto:support@volyume.app">support@volyume.app</a>');
  });

  it('shows a postal address line only when an address is set', () => {
    expect(termsScript).toMatch(/^\s*var PROMOTER_ADDRESS = '[^']*';$/m);
    // Hidden in the markup; the one place it is shown is behind the constant.
    expect(terms).toMatch(/<span id="promoterAddressLine" hidden>/);
    expect(termsScript).toMatch(/if \(PROMOTER_ADDRESS\) \{[^}]*setText\('promoterAddress', PROMOTER_ADDRESS\);[^}]*show\('promoterAddressLine'\);[^}]*\}/);
    expect(termsScript.match(/show\('promoterAddressLine'\)/g)).toHaveLength(1);
    // The empty span carries no placeholder address of its own.
    expect(terms).toContain('<span id="promoterAddress"></span>');
  });

  it('records the founder ruling beside the constants', () => {
    expect(termsScript).toContain(
      'Founder 2026-10-20: Volyume is the promoter; no postal address is published. The line shows only if one is ever added.',
    );
  });
});

describe('the scoring table', () => {
  it('agrees, row for row, with the landing page table', () => {
    const rows = scoringRows(terms);
    expect(rows).toHaveLength(7);
    expect(rows).toEqual(scoringRows(landing));
  });

  it('has core parts of 80 and coaching parts of 20, as the page says', () => {
    const rows = scoringRows(terms);
    const sum = (list) => list.reduce((total, row) => total + row[2], 0);
    expect(sum(rows.filter((r) => r[1] === ''))).toBe(80);
    expect(sum(rows.filter((r) => r[1] === 'with coaching'))).toBe(20);
    expect(rows.filter((r) => r[1] === 'with coaching').map((r) => r[0])).toEqual([
      'Weekly check-in', 'Food logging', 'Weekly weigh-in',
    ]);
    expect(bodyText).toContain('The four core parts add up to 80 points. The three parts marked with coaching add up to 20 more.');
  });
});

describe('the lookup', () => {
  it('asks gym_challenge_public with the code from ?c=, as the landing page does', () => {
    expect(termsScript).toContain("'/rest/v1/rpc/gym_challenge_public'");
    expect(termsScript).toContain('body: JSON.stringify({ _code: code })');
    expect(termsScript).toContain("new URLSearchParams(location.search).get('c')");
    const pick = (script, name) => script.match(new RegExp(`var ${name} = '([^']+)';`))[1];
    expect(pick(termsScript, 'SUPABASE_URL')).toBe(pick(landingScript, 'SUPABASE_URL'));
    expect(pick(termsScript, 'SUPABASE_ANON_KEY')).toBe(pick(landingScript, 'SUPABASE_ANON_KEY'));
  });

  it('is the only thing the page sends anywhere', () => {
    expect(termsScript.match(/\bfetch\(/g)).toHaveLength(1);
    expect(termsScript).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket|new Image/);
  });

  it('leaves the facts general and adds a calm line when no challenge is found', () => {
    expect(terms).toContain(
      '<p class="intro" id="notfound" hidden>We could not find this challenge, so these are the general terms. The dates and prizes of your challenge are shown in the app.</p>',
    );
    // No code, a failed request, an empty answer and a thrown error all end in the same line.
    expect(termsScript).toContain("if (!code) { showNotFound(); return; }");
    expect(termsScript).toContain("if (!c || typeof c !== 'object' || !clean(c.title)) { showNotFound(); return; }");
    expect(termsScript).toMatch(/\.catch\(function \(\) \{\s*showNotFound\(\);\s*\}\)/);
    expect(termsScript).toMatch(/function showNotFound\(\) \{\s*show\('notfound'\);\s*\}/);
  });
});

describe('the page', () => {
  it('has no em dash', () => {
    expect(terms.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  it('has no tracking and loads no outside script', () => {
    expect(terms).not.toMatch(/gtag|googletagmanager|google-analytics|analytics|facebook|fbq|pixel|hotjar|segment|mixpanel|plausible/i);
    expect(terms.match(/<script\b/g)).toHaveLength(1);
    expect(terms).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(terms).not.toMatch(/<(iframe|embed|object)\b/i);
  });

  it('is in British English', () => {
    expect(terms).toMatch(/<html lang="en-GB">/);
  });
});
