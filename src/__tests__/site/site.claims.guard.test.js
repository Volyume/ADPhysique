/**
 * volyume.app claims guard: what the site says about privacy, the coach and
 * the product is what the app says and does.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Reuse the app's wording:
 * 'Your progress photos and workout videos stay on this phone, unless you
 * choose to share them.' 'Your coach isn't an AI chatbot. It follows fixed
 * rules.' The Volyume Score is a score from your own photos, not a body-fat
 * measurement.", and "respect wording cautions C1 to C17"), the wording
 * cautions in docs/site-rebuild-2026-10/FEATURES.md, the privacy claims that
 * are literally true in docs/site-rebuild-2026-10/FACTS.md section 5,
 * marketing/hq/CLAIMS-STANDARDS.md sections 5 and 6, and CLAUDE.md section 2
 * (no LLM calls in the coaching engine; EU residency with the Resend
 * exception; ED-safety is never marketed).
 *
 * What this pins:
 *  1. The app still says what the site repeats. The two Welcome-screen lines,
 *     the consent screen's photo sentence and the What's new line are pinned
 *     in the app's source, and the coaching engine has no randomness and no
 *     model call, so "fixed rules" is true.
 *  2. The site repeats them exactly. The home page carries both sentences
 *     verbatim; any sentence about a chatbot is the app's sentence; no
 *     sentence says "no AI" (the app does ship two on-device recognition
 *     models: the photo outline and the label reader); a photo or video said
 *     to stay on the phone says "unless you choose to share" in the same
 *     sentence.
 *  3. No absolute privacy claim ("completely private", "we never see your
 *     data", "private by design", "all your data stays in the EU"); a page
 *     that says the EU or Dublin also says Resend and the United States; no
 *     claim that analytics carry no identifiers.
 *  4. The Volyume Score is explained wherever it is named: from your own
 *     photos, not a body-fat measurement; "Leanness" never. "Precision
 *     Coaching" at most twice a page.
 *  5. Platform truth (C16): widgets, the lock-screen countdown, the wallpaper
 *     and exact rest alerts say Android; Google sign-in says Android.
 *  6. Body weight is never the headline (C1): no weigh-in, scale or body
 *     weight in a heading, title or description.
 *  7. No claim the code cannot support (C5, C7, C9, C11, C13, C14, C17): see
 *     CLAIM_RULES in siteRules.js, pinned in site.selftest.test.js.
 *  8. The gym challenge is not advertised on the home page (C15).
 *
 * The privacy policy and the challenge terms are legal texts and keep their
 * own wording (BRIEF.md); their text is pinned by site.privacy.guard.test.js
 * and the older challenge-terms guard. These fail on the old pages and pass
 * once the rebuilt pages land.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./siteScan');
const { CLAIM_RULES } = require('./siteRules');
const { PAGES, quotes, unitsOf, scan } = require('./siteCopy');

const read = (...p) => fs.readFileSync(path.join(S.REPO, ...p), 'utf8');
const SITE_PHOTO = 'Your progress photos and workout videos stay on this phone, unless you choose to share them.';
const SITE_COACH = 'Your coach isn\'t an AI chatbot. It follows fixed rules.';
const COACH_SENTENCE = 'Your coach isn\'t an AI chatbot.';
const POLICY_PAGES = ['privacy/index.html', 'privacy.html'];
const LEGAL_PAGES = [...POLICY_PAGES, 'challenge-terms/index.html'];
const WRITTEN = PAGES.filter((rel) => !LEGAL_PAGES.includes(rel));

const hasSentence = (rel, sentence) => unitsOf(rel).some((u) => quotes(u.text) === quotes(sentence));
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the app says what the site repeats', () => {
  test('the Welcome screen holds the two lines', () => {
    const welcome = read('src', 'screens', 'WelcomeScreen.js');
    expect(welcome).toContain('Your progress photos and workout videos stay on this phone.');
    expect(welcome).toContain(SITE_COACH);
  });

  test('the consent screen and What\'s new hold the "unless you choose to share" wording', () => {
    expect(read('src', 'screens', 'Article9ConsentScreen.js')).toContain('Progress photo image files stay on this device unless you choose to share or export them');
    expect(read('src', 'components', 'WhatsNewSheet.js')).toContain('Your videos stay private on your device unless you choose to share them.');
  });

  test('the coaching engine has no randomness and no model call, so "fixed rules" is true', () => {
    const files = ['weeklyCoach.js', 'nutritionEngine.js', 'planEngine.js', 'coachApply.js', path.join('structure', 'engine.js')];
    const out = [];
    files.forEach((f) => {
      const code = stripComments(read('src', 'lib', f));
      if (/Math\.random\s*\(/.test(code)) out.push(`${f}: Math.random`);
      if (/openai|anthropic|gemini|langchain|\bllm\b|\bfetch\s*\(/i.test(code)) out.push(`${f}: a model or network call`);
    });
    expect(out).toEqual([]);
  });
});

describe('the site repeats it exactly', () => {
  test('the home page carries both sentences, word for word', () => {
    expect({ photo: hasSentence('index.html', SITE_PHOTO), coach: hasSentence('index.html', COACH_SENTENCE) && hasSentence('index.html', 'It follows fixed rules.') }).toEqual({ photo: true, coach: true });
  });

  test('every sentence that says "AI chatbot" is the app\'s sentence', () => {
    const out = scan([['an "AI chatbot" sentence that is not the app\'s', (t) => /\bAI[- ]chat ?bot/i.test(t) && quotes(t) !== quotes(COACH_SENTENCE)]], { pages: WRITTEN });
    expect(out).toEqual([]);
  });

  test('no sentence says "no AI" or that the product is AI-free', () => {
    expect(scan(CLAIM_RULES.filter(([n]) => n === 'a no-AI claim'), { pages: PAGES })).toEqual([]);
  });

  test('the page that says the coach follows fixed rules is /how-the-coach-works/ too', () => {
    expect(hasSentence('how-the-coach-works/index.html', 'It follows fixed rules.')).toBe(true);
  });
});

describe('privacy and residency claims', () => {
  test('no absolute claim, no claim about analytics identifiers, no "all your data in the EU"', () => {
    const names = ['an absolute privacy claim', 'a claim about analytics identifiers', 'an all-data-in-the-EU claim', 'a photo or video said to stay put with no "unless you share"'];
    expect(scan(CLAIM_RULES.filter(([n]) => names.includes(n)), { pages: WRITTEN })).toEqual([]);
  });

  test('a page that says account data is in the EU or Dublin also says Resend and the United States', () => {
    // FACTS.md section 5 item 5: a flat residency line is false. News and sign-in
    // emails go through Resend, which keeps its records in the United States.
    const residency = /\b(account data|cloud-backed|your data|all data|data is stored)\b[^.]*\b(EU|Dublin|Ireland|Europe)\b|\b(EU|Dublin|Ireland|Europe)\b[^.]*\b(account data|your data)\b|\bdata residency\b/i;
    const out = WRITTEN.filter((rel) => {
      const units = unitsOf(rel).map((u) => u.text);
      const text = units.join(' ');
      return units.some((u) => residency.test(u)) && !(/Resend/.test(text) && /United States/.test(text));
    });
    expect(out).toEqual([]);
  });
});

describe('the Volyume Score and the coach\'s name', () => {
  test('wherever the Volyume Score is named, the page says it comes from your own photos and is not a body-fat measurement', () => {
    const out = WRITTEN.filter((rel) => {
      const text = unitsOf(rel).map((u) => u.text).join(' ');
      return /Volyume Score/.test(text) && !(/own photos/i.test(text) && /not a body[- ]fat (measurement|percentage|reading|test)/i.test(text));
    });
    expect(out).toEqual([]);
  });

  test('"Leanness" is never used', () => {
    expect(scan([['Leanness', /\bleanness\b/i]], { pages: WRITTEN })).toEqual([]);
  });

  test('"Precision Coaching" appears at most twice on a page', () => {
    const out = WRITTEN.filter((rel) => (unitsOf(rel).map((u) => u.text).join(' ').match(/Precision Coaching/g) || []).length > 2);
    expect(out).toEqual([]);
  });
});

describe('platform truth', () => {
  const needsAndroid = [
    ['widgets', /\bwidgets?\b/i],
    ['the lock-screen countdown', /\block[- ]screen\b[^.]*\b(countdown|rest)|\b(countdown|rest)\b[^.]*\block[- ]screen\b/i],
    ['wallpaper', /\bwallpaper\b/i],
    ['exact rest alerts', /\bexact\b[^.]*\brest alerts?\b|\brest alerts?\b[^.]*\bexact\b/i],
    ['Google sign-in', /\bcontinue with Google\b|\bGoogle (sign|log)[- ]?in\b|\b(sign|log) ?in with Google\b|\bGoogle account\b/i],
  ];

  test.each(needsAndroid)('%s is said to be Android only', (name, re) => {
    expect(scan([[name, (t) => re.test(t) && !/\bAndroid\b/i.test(t)]], { pages: WRITTEN })).toEqual([]);
  });
});

describe('body weight is never the headline', () => {
  test('no weigh-in, scale or body weight in a heading, a title or a description (the teaching articles aside)', () => {
    const re = /\b(weigh[- ]?ins?|weigh in|morning weight|body ?weight|the scales?|on the scale)\b/i;
    const out = [];
    WRITTEN.filter((rel) => !rel.startsWith('articles/')).forEach((rel) => {
      const page = S.readPage(rel);
      page.elements.filter((e) => /^h[1-3]$/.test(e.name)).forEach((e) => { if (re.test(page.textOf(e))) out.push(`${rel}: <${e.name}> ${page.textOf(e)}`); });
      S.metaCopy(page).filter((u) => /title|description/.test(u.where)).forEach((u) => { if (re.test(u.text)) out.push(`${rel} [${u.where}] ${u.text.slice(0, 120)}`); });
    });
    expect(out).toEqual([]);
  });
});

describe('nothing the code cannot support', () => {
  const generic = CLAIM_RULES.filter(([n]) => !['an absolute privacy claim', 'a claim about analytics identifiers', 'an all-data-in-the-EU claim', 'a no-AI claim', 'a photo or video said to stay put with no "unless you share"'].includes(n));

  test.each(generic.map(([name, test]) => [name, test]))('no sentence is %s', (name, test) => {
    expect(scan([[name, test]], { pages: WRITTEN })).toEqual([]);
  });

  test('the gym challenge is not advertised on the home page', () => {
    expect(scan([['the gym challenge', /\bgym challenges?\b|\bfree for life\b/i]], { pages: ['index.html'] })).toEqual([]);
  });
});
