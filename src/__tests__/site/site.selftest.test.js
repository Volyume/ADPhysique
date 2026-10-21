/**
 * The reader and the rules behind the volyume.app guards, tested on their own.
 *
 * The guards in this folder read public/ with a small HTML reader (siteScan.js)
 * and judge it with pattern lists (siteRules.js). If the reader mis-splits a
 * sentence, or a pattern is too loose or too tight, a guard either cries wolf
 * on good copy or goes quiet on bad copy, and nobody would notice because the
 * rebuilt pages are what is being judged. This suite pins both with small
 * inputs written here: sentences each rule must catch, sentences it must
 * leave alone, and the reader's handling of entities, scripts, comments,
 * data-explains, data-fact and cited sources.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Content rules").
 */
'use strict';

const { Buffer } = require('buffer');
const S = require('./siteScan');
const R = require('./siteRules');
const { declProblems } = require('./siteCssRules');
const L = require('./siteLinks');
const F = require('./siteFacts');
const P = require('./sitePolicy');

const hits = (rules, text) => rules.filter(([, test]) => (typeof test === 'function' ? test(text) : test.test(text))).map(([name]) => name);

describe('the reader', () => {
  test('decodes named, decimal and hex entities', () => {
    expect(S.decodeEntities('&pound;1 &mdash; &#8212; &#x2014; it&rsquo;s &amp; &nbsp;|')).toBe('\u00a31 \u2014 \u2014 \u2014 it\u2019s & \u00a0|');
    expect(S.decodeEntities('&notanentity;')).toBe('&notanentity;');
  });

  test('keeps visible text and leaves out scripts, styles and comments', () => {
    const page = S.parseHtml('<!doctype html><html><head><title>Hello &amp; welcome</title><style>p{color:red}</style><script>var a = "not visible";</script></head><body><!-- hidden --><h1>Heading</h1><p>One <b>bold</b> word.<br>Next line.</p></body></html>');
    expect(page.title).toBe('Hello & welcome');
    expect(S.bodyBlocks(page)).toEqual(['Heading', 'One bold word.', 'Next line.']);
    expect(page.comments.map((c) => c.trim())).toEqual(['hidden']);
    expect(page.scripts[0].code).toContain('not visible');
    expect(page.styles[0].code).toContain('color:red');
  });

  test('handles unclosed paragraphs and list items', () => {
    const page = S.parseHtml('<ul><li>One<li>Two</ul><p>Para one<p>Para two');
    expect(S.bodyBlocks(page)).toEqual(['One', 'Two', 'Para one', 'Para two']);
  });

  test('counts the title, meta text and text-bearing attributes as copy', () => {
    const page = S.parseHtml('<head><title>T one</title><meta name="description" content="Meta words."><meta property="og:title" content="OG title"></head><body><img src="/a.png" alt="An alt"><a href="/x" aria-label="Aria label" title="Tip">go</a></body>');
    const where = S.metaCopy(page).map((u) => `${u.where}=${u.text}`);
    expect(where).toEqual(expect.arrayContaining(['<title>=T one', 'meta description=Meta words.', 'meta og:title=OG title', 'img[alt]=An alt', 'a[aria-label]=Aria label', 'a[title]=Tip']));
  });

  test('leaves out what a data-explains element explains, and cited sources', () => {
    const html = '<p>Plain text here.</p><p data-explains="deload">A deload is a lighter week to recover.</p>'
      + '<ol><li>Smith J. Volume and growth. <a href="https://pubmed.ncbi.nlm.nih.gov/1/">pubmed</a></li><li>Not a citation about volume.</li></ol>';
    const page = S.parseHtml(html);
    expect(S.bodyBlocks(page)).toEqual(['Plain text here.', 'A deload is a lighter week to recover.', 'Not a citation about volume.']);
    expect(S.bodyBlocks(page, { skipExplained: true })).toEqual(['Plain text here.', 'Not a citation about volume.']);
    expect(S.bodyBlocks(page, { skipCitations: false })).toContain('Smith J. Volume and growth. pubmed');
  });

  test('splits sentences after . ! ? and not inside a decimal or an abbreviation without a capital', () => {
    expect(S.sentencesOf('First one. Second one? Third! 2.5 kg is fine. e.g. this stays.')).toEqual(['First one.', 'Second one?', 'Third!', '2.5 kg is fine. e.g. this stays.']);
  });

  test('reads string literals in script and skips comments', () => {
    const code = "// not 'this'\nvar a = 'one'; /* nor \"this\" */ var b = \"two words here\"; var c = `three`;";
    expect(S.scriptStrings(code)).toEqual(['one', 'two words here', 'three']);
    const page = S.parseHtml(`<script>${code} el.textContent = 'This reads like a sentence.'; var u = 'https://volyume.app/x y z';</script>`);
    expect(S.scriptCopy(page)).toEqual(['two words here', 'This reads like a sentence.']);
  });

  test('reads CSS rules, at-rule blocks and declarations', () => {
    const rules = S.parseCss('/* c */ a{color:red;border-radius:4px} @media (prefers-color-scheme: light){:root{--x:#fff}} @font-face{font-family:Inter;src:url(/a.woff2)}');
    expect(rules.map((r) => r.selector)).toEqual(['a', ':root', '@font-face']);
    expect(rules[1].atRule).toContain('prefers-color-scheme');
    expect(S.declarations(rules[0].body)).toEqual([{ prop: 'color', value: 'red' }, { prop: 'border-radius', value: '4px' }]);
  });

  test('resolves references the way a static host serves them', () => {
    expect(S.resolveRef('/privacy/', 'index.html')).toMatchObject({ kind: 'local', path: '/privacy/' });
    expect(S.resolveRef('security.js', 'auth/confirm/index.html')).toMatchObject({ kind: 'local', path: '/auth/confirm/security.js' });
    expect(S.resolveRef('https://volyume.app/c/?code=abc#x', 'index.html')).toMatchObject({ kind: 'local', path: '/c/', fragment: 'x' });
    expect(S.resolveRef('https://play.google.com/store', 'index.html')).toMatchObject({ kind: 'external', host: 'play.google.com' });
    expect(S.resolveRef('mailto:a@b.c', 'index.html').kind).toBe('scheme');
    expect(S.resolveRef('volyume://g/?id=1', 'g/index.html').kind).toBe('scheme');
    expect(S.resolveRef('#top', 'index.html').kind).toBe('anchor');
    expect(S.urlOf('privacy/index.html')).toBe('/privacy/');
    expect(S.urlOf('404.html')).toBe('/404.html');
  });
});

describe('the price rules', () => {
  test.each([
    ['Volyume is free.', 'free'],
    ['Free for life.', 'free'],
    ['No card, no time limit.', 'no card'],
    ['There are no time limits.', 'no time limit'],
    ['No ads and no adverts.', 'no ads'],
    ['It costs \u00a31.99 a month.', 'currency'],
    ['See the price.', 'price'],
    ['Cancel any subscription.', 'subscription'],
    ['Start a trial today.', 'trial'],
    ['Go Pro for more.', 'Pro (a tier)'],
    ['Upgrade your plan.', 'upgrade'],
  ])('catches %s', (text, rule) => {
    expect(hits(R.PRICE_RULES, text)).toContain(rule);
  });

  test.each([
    'Free weights are included in the exercise library.',
    'A randomised controlled trial found no difference.',
    'Unsubscribe from the news emails.',
    'Freedom to choose your own days.',
    'A pro lifter would hold the plan.',
    'Choose your own plan.',
  ])('leaves %s alone', (text) => {
    expect(hits(R.PRICE_RULES, text)).toEqual([]);
  });
});

describe('the jargon rules', () => {
  test.each([
    'Hypertrophy is muscle growth.', 'Add a deload week.', 'Two deloads a year.', 'Your TDEE is a guess.', 'Track macros daily.',
    'Eat to your macro targets.', 'Use RPE or RIR.', 'An AMRAP set.', 'Try myo-reps.', 'Rest-pause sets.', 'Rest pause sets.',
    'An offline-first app.', 'The sync engine.', 'A V-taper look.', 'An X frame look.', 'An ED flag.', 'The safety state.',
    'Telemetry is off.', 'Stored in Supabase.', 'Six archetypes.', 'Set volume matters.', 'Weekly training volume.',
    'Your maintenance calories.', 'Progressive overload works.', 'A mesocycle of four weeks.', 'BMR and TDEE.',
  ])('catches %s', (text) => {
    expect(hits(R.JARGON, text)).not.toEqual([]);
  });

  test.each([
    'Turn the volume up on the rest alert.', 'Use the volume button.', 'Volyume is the app.', 'Protein, carbs and fat.',
    'Macronutrients are listed.', 'A lighter recovery week.', 'How hard a set felt.', 'Muscle building.',
  ])('leaves %s alone', (text) => {
    expect(hits(R.JARGON, text)).toEqual([]);
  });

  test('names the terms by letters and digits only, so data-explains is forgiving', () => {
    expect(R.jargonKey('V-taper')).toBe('vtaper');
    expect(R.JARGON_BY_KEY.get(R.jargonKey('Rest pause')).name).toBe('rest-pause');
    expect(R.JARGON_BY_KEY.get(R.jargonKey('amrap')).name).toBe('AMRAP');
  });
});

describe('the machine-written tells', () => {
  test.each([
    'Unlock your potential.', 'Elevate your training.', 'Empower yourself.', 'Seamless logging.', 'A game-changer.', 'Your fitness journey.',
    'Level up fast.', 'Take it to the next level.', 'Whether you\u2019re a beginner or a pro.', 'Whether you are a lifter or not.',
    'It\u2019s not just a tracker.', 'Say goodbye to guessing.', 'Look no further.', 'Designed with you in mind.', 'Effortless logging.',
    'A robust system.', 'In today\u2019s world.', 'At the end of the day.', 'Not another fitness app.',
  ])('catches %s', (text) => {
    expect(hits(R.AI_TELLS, text)).not.toEqual([]);
  });

  test.each([
    'Ask whether you have the data to support a change.', 'The coach looks at your last four weeks.', 'Your plan changes only if the numbers say so.',
  ])('leaves %s alone', (text) => {
    expect(hits(R.AI_TELLS, text)).toEqual([]);
  });

  test('catches an em dash, an en dash used as a dash and a spaced hyphen, and allows a number range', () => {
    expect(R.hasDash('Calm \u2014 and clear')).toBe(true);
    expect(R.hasDash('Calm \u2013 and clear')).toBe(true);
    expect(R.hasDash('Calm - and clear')).toBe(true);
    expect(R.hasDash('Calm -- and clear')).toBe(true);
    expect(R.hasDash('Train 2\u20136 days a week')).toBe(false);
    expect(R.hasDash('A well-known, hands-on plan')).toBe(false);
  });

  test('catches emoji and sparkle icons, and allows the copyright sign and a tick', () => {
    expect(R.hasEmoji('Strong \u{1F4AA}')).toBe(true);
    expect(R.hasEmoji('New \u2728')).toBe(true);
    expect(R.hasEmoji('Rated \u2605')).toBe(true);
    expect(R.hasEmoji('\u00a9 2026 Volyume')).toBe(false);
    expect(R.hasEmoji('Volyume\u2122')).toBe(false);
    expect(R.hasEmoji('\u2713 Included')).toBe(false);
  });

  test('catches American spellings and allows British ones', () => {
    ['color', 'optimize', 'personalized', 'behavior', 'fiber', 'favorite', 'organize', 'analyze', 'gray'].forEach((w) => {
      expect({ w, hit: R.US_SPELLING.test(`Some ${w} here`) }).toEqual({ w, hit: true });
    });
    ['colour', 'optimise', 'personalised', 'behaviour', 'fibre', 'favourite', 'organise', 'analyse', 'grey', 'programme'].forEach((w) => {
      expect({ w, hit: R.US_SPELLING.test(`Some ${w} here`) }).toEqual({ w, hit: false });
    });
  });
});

describe('the weight-loss and review rules', () => {
  test.each([
    'Shred fat fast.', 'See the transformation.', 'Read the testimonials.', 'Rated 4.8 stars by thousands of users.', 'The best app for lifters.',
    'A world-class coach.', 'Before and after photos.',
  ])('catches %s', (text) => {
    expect(hits(R.CAP_RULES, text)).not.toEqual([]);
  });

  test.each([
    'Your best set is shown under the entry.', 'See your best lifts.', 'The coach looks at your logged training.', 'Compare your own photos.',
  ])('leaves %s alone', (text) => {
    expect(hits(R.CAP_RULES, text)).toEqual([]);
  });

  test('catches a promised number of kilos', () => {
    expect(hits(R.LOSE_NUMBER, 'Lose 5 kg in a month.')).not.toEqual([]);
    expect(hits(R.LOSE_NUMBER, 'Lose weight slowly.')).toEqual([]);
  });
});

describe('the CSS rules', () => {
  const CTX = { radiusPx: new Set([2, 4, 6, 10, 16, 20]), roundOk: [/(^|[\s>+~(])(img|picture|video|canvas)(?![\w-])/i, /\.avatar(?![\w-])/i], nowrapOk: [], isTokens: false };
  const cats = (css, ctx = CTX) => S.parseCss(css).flatMap((r) => S.declarations(r.body).flatMap((d) => declProblems(d, r, ctx))).map((p) => p.cat);

  test.each([
    ['a{text-overflow:ellipsis}', 'clip'],
    ['a{-webkit-line-clamp:3}', 'clip'],
    ['a{display:-webkit-box;line-clamp:2}', 'clip'],
    ['.btn{white-space:nowrap}', 'nowrap'],
    ['body{overflow-x:hidden}', 'overflow'],
    ['html{overflow:hidden}', 'overflow'],
    ['.btn{border-radius:999px}', 'radius'],
    ['.chip{border-radius:9999px}', 'radius'],
    ['.dot{border-radius:50%}', 'radius'],
    ['.btn{border-radius:8px}', 'radius'],
    ['.btn{border-radius:var(--radius-full)}', 'radius'],
    ['.btn{border-radius:calc(infinity * 1px)}', 'radius'],
    [':root{--radius-full:999px}', 'radius-var'],
    [':root{--pill:12px}', 'radius-var'],
    ['h1{-webkit-background-clip:text}', 'gradient-text'],
    ['h1{-webkit-text-fill-color:transparent}', 'gradient-text'],
    ['h1{text-shadow:0 0 8px #fff}', 'glow'],
    ['nav{backdrop-filter:blur(10px)}', 'glass'],
    ['.blob{filter:blur(40px)}', 'glow'],
    ['.pulse{animation:pulse 2s infinite}', 'motion'],
    ['a{color:#F5A623}', 'colour'],
    ['a{background:rgb(10, 20, 30)}', 'colour'],
    ['a{font-size:17px}', 'size-px'],
    ['small{font-size:10px}', 'size-min'],
    ['small{font-size:0.5rem}', 'size-min'],
  ])('catches %s', (css, cat) => {
    expect(cats(css)).toContain(cat);
  });

  test.each([
    'a{text-overflow:clip}',
    '.btn{white-space:normal}',
    'img{border-radius:50%}',
    '.avatar{border-radius:999px}',
    '.card img{border-radius:9999px}',
    '.btn{border-radius:16px}',
    '.btn{border-radius:1rem}',
    '.card{border-radius:var(--radius-lg)}',
    '.sq{border-radius:0}',
    'a{color:var(--text)}',
    'a{background:rgba(0,0,0,.5)}',
    'a{font-size:var(--text-body)}',
    'p{font-size:1rem}',
    'h1{text-shadow:none}',
    '.spin{animation:fade 1s 2}',
    ':root{--radius-lg:16px}',
  ])('leaves %s alone', (css) => {
    expect(cats(css)).toEqual([]);
  });

  test('tokens.css may write colours and px sizes; nothing else may', () => {
    expect(cats(':root{--bg:#0D0D0D;--text-body:16px}', { ...CTX, isTokens: true })).toEqual([]);
    expect(cats(':root{--bg:#0D0D0D}')).toContain('colour');
  });

  test('a selector on the allow-list is exempt only when every selector in the rule is', () => {
    expect(cats('img, .btn{border-radius:999px}')).toContain('radius');
    expect(cats('img, .avatar{border-radius:999px}')).toEqual([]);
    expect(cats('.btn{white-space:nowrap}', { ...CTX, nowrapOk: [/^\.btn$/] })).toEqual([]);
  });
});

describe('the image and nesting helpers', () => {
  test('read the size of a PNG, a JPEG and a WebP from the header', () => {
    const png = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(1200, 16);
    png.writeUInt32BE(630, 20);
    expect(S.imageSizeOf(png)).toEqual({ type: 'png', w: 1200, h: 630 });

    // SOI, an APP0 segment of 16 bytes, then SOF0 with height 630 and width 1200.
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14),
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03, 0x01, 0x22, 0x00]), Buffer.alloc(8),
    ]);
    expect(S.imageSizeOf(jpeg)).toEqual({ type: 'jpeg', w: 1200, h: 630 });

    const webp = Buffer.alloc(40);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    webp.write('VP8X', 12, 'ascii');
    webp.writeUIntLE(1199, 24, 3);
    webp.writeUIntLE(629, 27, 3);
    expect(S.imageSizeOf(webp)).toEqual({ type: 'webp', w: 1200, h: 630 });

    expect(S.imageSizeOf(Buffer.from('not an image at all, just text'))).toBeNull();
  });

  test('knows which elements sit inside which', () => {
    const page = S.parseHtml('<a href="/x"><img alt="inside" src="/a.png"></a><img alt="outside" src="/b.png">');
    const a = page.elements.find((e) => e.name === 'a');
    const [inner, outer] = page.elements.filter((e) => e.name === 'img');
    expect(S.inside(inner, a)).toBe(true);
    expect(S.inside(outer, a)).toBe(false);
  });
});

describe('the link checker', () => {
  // /404.html, /CNAME and /.well-known/assetlinks.json are files the site keeps for good.
  const page = (html) => L.refsOfPage(S.parseHtml(html));
  const bad = (html) => page(html).map((r) => L.problem('index.html', r)).filter(Boolean);

  test('finds the references on a page', () => {
    const refs = page('<a href="/a">a</a><img src="/b.png" srcset="/c.png 1x, /d.png 2x"><link rel="icon" href="/e.png"><script src="/f.js"></script><meta property="og:image" content="https://volyume.app/g.png"><meta http-equiv="refresh" content="0; url=/h/">');
    expect(refs.map((r) => r.ref)).toEqual(['/a', '/b.png', '/c.png', '/d.png', '/e.png', '/f.js', 'https://volyume.app/g.png', '/h/']);
  });

  test('flags a file that is not there, however it is written', () => {
    expect(bad('<a href="/no-such-page/">x</a>')).toHaveLength(1);
    expect(bad('<img src="/no-such.png">')).toHaveLength(1);
    expect(bad('<meta property="og:image" content="https://volyume.app/no-such.png">')).toHaveLength(1);
    expect(bad('<a href="no-such-relative.html">x</a>')).toHaveLength(1);
    expect(bad('<a href="javascript:void(0)">x</a>')).toHaveLength(1);
  });

  test('passes files that are there, a query string, a forwarded code, an app link and other hosts', () => {
    expect(bad('<a href="/404.html">x</a><a href="/404.html?x=1">x</a><a href="https://volyume.app/CNAME">x</a>')).toEqual([]);
    expect(bad('<a href="/partner/ABCDEFGH23">x</a><a href="/c/volt-nov-3f9a1c2e">x</a>')).toEqual([]);
    expect(bad('<a href="volyume://g/?id=1">x</a><a href="mailto:a@b.c">x</a><a href="https://play.google.com/store">x</a>')).toEqual([]);
  });

  test('flags a #fragment that has no id on the page it points to', () => {
    expect(bad('<a href="/404.html#no-such-id">x</a>')).toHaveLength(1);
  });
});

describe('the facts helpers', () => {
  test('read numbers written as digits, with commas, or as words', () => {
    expect(['923', '29,279', '923+', 'six', 'Nine', '1,2', 'x'].map(F.parseNumber)).toEqual([923, 29279, 923, 6, 9, null, null]);
  });

  test('an exact figure must be exact', () => {
    expect(F.agrees('923', 923)).toBe(true);
    expect(F.agrees('29,279', 29279)).toBe(true);
    expect(F.agrees('six', 6)).toBe(true);
    expect(F.agrees('924', 923)).toBe(false);
    expect(F.agrees('551', 923)).toBe(false);
    expect(F.agrees('twelve', 6)).toBe(false);
  });

  test('"over N" must be a round number at or below the figure and close to it', () => {
    expect(F.agrees('over 29,000', 29279)).toBe(true);
    expect(F.agrees('29,000', 29279, { before: 'with over ' })).toBe(true);
    expect(F.agrees('900', 923, { before: 'More than ' })).toBe(true);
    expect(F.agrees('over 50', 58)).toBe(true);
    expect(F.agrees('over 30,000', 29279)).toBe(false);
    expect(F.agrees('over 10', 923)).toBe(false);
    expect(F.agrees('29,000', 29279)).toBe(false);
    expect(F.agrees('nearly 60', 58)).toBe(true);
    expect(F.agrees('nearly 50', 58)).toBe(false);
  });

  test('find a fact by key, dotted path, or under "facts", and list the leaves', () => {
    const facts = { exercises: 923, library: { plans: 58 }, meals: { value: 94, source: 'x' } };
    expect(F.factFor(facts, 'exercises')).toBe(923);
    expect(F.factFor(facts, 'library.plans')).toBe(58);
    expect(F.factFor(facts, 'meals')).toBe(94);
    expect(F.factFor({ facts: { foods: 29279 } }, 'foods')).toBe(29279);
    expect(F.factFor(facts, 'nothing')).toBeUndefined();
    expect(F.leaves(facts)).toEqual([['exercises', 923], ['library.plans', 58], ['meals', 94]]);
  });

  test('find a number written next to a counted noun, and ignore ordinary small numbers', () => {
    const noun = (t) => F.claimsIn(t).map((c) => `${c.n} ${c.noun}`);
    expect(noun('923 built-in exercises, each with setup notes.')).toEqual(['923 exercises']);
    expect(noun('Over 29,279 foods work without signal.')).toEqual(['29279 foods']);
    expect(noun('58 plans and six training styles.')).toEqual(['58 plans', '6 training styles']);
    expect(noun('Nine physique goals to choose from.')).toEqual(['9 physique goals']);
    expect(noun('Pick 3 exercises, 5 meals a day, one training style and 2 plans.')).toEqual([]);
    expect(noun('A 4-week plan with 12 sets.')).toEqual([]);
  });
});

describe('the policy reader', () => {
  test('splits a policy into its lead-in and numbered sections, whatever the layout', () => {
    // policyOf reads a file under public/, so build the same structure through the reader's parts.
    const page = S.parseHtml('<header><h1>Privacy policy</h1></header><main><p>Last updated: 1 May 2026</p><p>Intro text.</p><section><h2><span>1</span> One</h2><p>First.</p><ul><li>Item A</li><li>Item B</li></ul></section><section><h2><span>2</span> Two</h2><p>Second.</p></section></main><footer><p>Footer text</p></footer>');
    const main = page.elements.find((e) => e.name === 'main');
    const blocks = S.blocksWithRange(page).filter((b) => b.first >= main.start && b.last < main.end);
    expect(blocks.map((b) => b.text)).toEqual(['Last updated: 1 May 2026', 'Intro text.', '1 One', 'First.', 'Item A', 'Item B', '2 Two', 'Second.']);
    expect(P.policyOf).toBeInstanceOf(Function);
  });

  test('takes the health-app section and the date out of the Markdown, and the numbers off the headings', () => {
    const md = '# Policy\n\n**Last updated:** 17 October 2026\n\n## 1. One\n\nText one.\n\n## 2. Health-app access\n\nOld claim.\n\n## 3. Three\n\nText three.\n';
    expect(P.markdownWithoutHealth(md)).toBe('# Policy\n\n\n## One\n\nText one.\n\n## Three\n\nText three.\n');
    expect(P.markdownWithoutHealth(md.replace('Health-app access', 'Health apps'))).toBe(P.markdownWithoutHealth(md));
  });
});
