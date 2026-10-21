/**
 * volyume.app copy guard: price words, jargon, machine-written tells,
 * punctuation, spelling and weight-loss language.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Content rules"),
 * CLAUDE.md section 2 (the product is fully free, D137, and no tier, trial,
 * price or paywall language reaches a user) and section 3 (British English,
 * no em dash), and marketing/hq/CLAIMS-STANDARDS.md section 9 (the banned
 * patterns of machine-written copy).
 *
 * What this pins, over EVERY HTML page under public/ (the private admin tool
 * public/members/ is out of scope):
 *  1. No claim about price or cost. The words free, no card, no time limit,
 *     no ads, a currency sign, price, subscription, trial, Pro (as a tier),
 *     upgrade, premium, paywall and purchase appear nowhere in visible text,
 *     the title, the meta text, an image description or the sentences the
 *     working pages build in the browser. The only sentences that may carry
 *     them are named below, word for word, on the pages that may carry them:
 *     the challenge's free-for-life sentence, the challenge terms' legal
 *     free-entry sentence, and the privacy policy's existing legal text.
 *  2. No jargon. The brief's list (hypertrophy, deload, volume as a training
 *     word, TDEE, macros and the rest) may appear only inside an element
 *     marked data-explains="<term>", the one place a page explains the term
 *     in plain words. The title and meta text can never carry it.
 *  3. No machine-written tells: the brief's phrases, the CLAIMS-STANDARDS
 *     section 9 hype words, fragment slogans, exclamation marks, emoji and
 *     sparkle icons, the em dash, the en dash and a hyphen standing in for a
 *     dash, and American spellings.
 *  4. No weight-loss promise, before-and-after, shred or review language
 *     (BRIEF.md "ED safety and CAP Code 13"), and nothing from the "do not
 *     mention" list of FEATURES.md.
 *
 * Why a guard and not a review: the old pages shipped "Volyume is free",
 * "No card, no time limit" and 551 exercises long after the product changed.
 * These tests fail on those pages by design and pass once the rebuilt pages
 * land. Each violation prints the page, where on the page, and the sentence.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./siteScan');
const { PAGES, quotes, unitsOf, scan } = require('./siteCopy');
const {
  PRICE_RULES, JARGON, JARGON_BY_KEY, jargonKey, AI_TELLS, hasEmoji, hasDash, US_SPELLING, CAP_RULES, LOSE_NUMBER,
} = require('./siteRules');


// ---------------------------------------------------------------------------
// 1. Price and cost

// The only sentences allowed to carry a price word, and where (BRIEF.md,
// "Content rules", and the owner's answer on the terms' free-entry sentence).
const FREE_FOR_LIFE = 'Completing a challenge with a final score of 50 or more earns free for life.';
const FREE_ENTRY = 'Entry is free, and you can leave at any time.';
// /privacy.html becomes a redirect to /privacy/ (BRIEF.md, stage 1 answers);
// until it does, it is treated as the same legal text so the real failures
// stand out. site.privacy.guard.test.js pins that it ends up a redirect.
const POLICY_PAGES = ['privacy/index.html', 'privacy.html'];
const LEGAL_PAGES = [...POLICY_PAGES, 'challenge-terms/index.html'];
const PRICE_ALLOWED = {
  'c/index.html': [FREE_FOR_LIFE],
  'challenge-terms/index.html': [FREE_FOR_LIFE, FREE_ENTRY],
  // Section 9 of the privacy policy: existing legal text, kept word for word.
  // The policy's text is checked separately for being unchanged.
  'privacy/index.html': [FREE_FOR_LIFE],
  'privacy.html': [FREE_FOR_LIFE],
};

describe('price and cost words', () => {
  test('appear only in the sentences the brief allows, word for word', () => {
    expect(scan(PRICE_RULES, { allowed: PRICE_ALLOWED })).toEqual([]);
  });

  test('the free-for-life sentence is the app\'s own wording', () => {
    // src/lib/challenges/copy.js owns the sentence; the site repeats it exactly.
    const copy = fs.readFileSync(path.join(S.REPO, 'src', 'lib', 'challenges', 'copy.js'), 'utf8');
    expect(copy).toContain(`FREE_FOR_LIFE_JOIN_LINE = '${FREE_FOR_LIFE}'`);
  });

  test('the challenge page and the terms carry the free-for-life sentence', () => {
    ['c/index.html', 'challenge-terms/index.html'].forEach((rel) => {
      expect({ rel, has: unitsOf(rel).some((u) => quotes(u.text) === FREE_FOR_LIFE) }).toEqual({ rel, has: true });
    });
  });

  test('the free-entry sentence is on /challenge-terms/ and on no other page', () => {
    const carriers = PAGES.filter((rel) => unitsOf(rel).some((u) => quotes(u.text) === FREE_ENTRY));
    expect(carriers).toEqual(['challenge-terms/index.html']);
  });

  test('the free-for-life sentence is on the challenge page, the terms and the policy only', () => {
    const carriers = PAGES.filter((rel) => rel !== 'privacy.html' && unitsOf(rel).some((u) => quotes(u.text) === FREE_FOR_LIFE));
    expect(carriers.sort()).toEqual(['c/index.html', 'challenge-terms/index.html', 'privacy/index.html']);
  });
});

// ---------------------------------------------------------------------------
// 2. Jargon

// The privacy policy keeps its legal wording, so its two existing sentences
// that name Supabase are exempt, word for word.
const SUPABASE_SENTENCES = [
  'Cloud-backed account data is stored in Supabase (EU region), with row-level security so only you, and the team supporting your account when needed, can see it.',
  'Supabase (EU region) for the database, authentication and storage',
];
const JARGON_ALLOWED = { 'privacy/index.html': SUPABASE_SENTENCES, 'privacy.html': SUPABASE_SENTENCES };

describe('jargon', () => {
  test('appears only inside the element that explains it (data-explains), never in a title or meta text', () => {
    expect(scan(JARGON, { allowed: JARGON_ALLOWED, skipExplained: true })).toEqual([]);
  });

  test('every data-explains names a listed term, once, and really explains it', () => {
    const problems = [];
    PAGES.forEach((rel) => {
      const page = S.readPage(rel);
      const seen = new Set();
      page.elements.filter((e) => e.attrs['data-explains'] !== undefined).forEach((e) => {
        const term = JARGON_BY_KEY.get(jargonKey(e.attrs['data-explains']));
        const text = page.textOf(e);
        if (!term) { problems.push(`${rel}: data-explains="${e.attrs['data-explains']}" is not a listed term`); return; }
        if (seen.has(term.name)) problems.push(`${rel}: "${term.name}" is explained more than once`);
        seen.add(term.name);
        if (!term.re.test(text)) problems.push(`${rel}: the element for "${term.name}" does not contain the term`);
        if (text.split(' ').length < 6) problems.push(`${rel}: the element for "${term.name}" is too short to be an explanation: ${text}`);
      });
    });
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. Machine-written tells, punctuation and spelling

describe('machine-written tells', () => {
  test('none of the brief\'s phrases or the CLAIMS-STANDARDS hype words', () => {
    expect(scan(AI_TELLS)).toEqual([]);
  });

  test('no fragment slogans ("Train. Eat. Grow.")', () => {
    const out = [];
    PAGES.forEach((rel) => {
      S.bodyBlocks(S.readPage(rel)).forEach((block) => {
        let run = 0;
        S.sentencesOf(block).forEach((s) => {
          run = /[.!?]$/.test(s) && s.replace(/[.!?]+$/, '').split(' ').length <= 2 ? run + 1 : 0;
          if (run === 3) out.push(`${rel}: ${block.slice(0, 120)}`);
        });
      });
    });
    expect(out).toEqual([]);
  });

  test('no exclamation marks', () => {
    expect(scan([['!', /!/]])).toEqual([]);
  });

  test('no emoji or sparkle icons', () => {
    const out = scan([['emoji', hasEmoji]]);
    PAGES.forEach((rel) => {
      S.readPage(rel).elements.forEach((e) => {
        Object.entries(e.attrs).forEach(([k, v]) => {
          if (/sparkle/i.test(v) && !/^(href|src)$/.test(k)) out.push(`${rel} <${e.name} ${k}> sparkle icon: ${v.slice(0, 80)}`);
        });
      });
    });
    expect(out).toEqual([]);
  });

  test('no em dash, no en dash used as a dash, no hyphen standing in for one', () => {
    const out = scan([['dash', hasDash]]);
    // Strings in the page script too short to read as a sentence (a
    // placeholder such as an em dash) still reach the screen.
    PAGES.forEach((rel) => {
      S.readPage(rel).scripts.forEach((sc) => {
        if (sc.attrs.src) return;
        S.scriptStrings(sc.code).forEach((str) => {
          if (/[\u2013\u2014]/.test(str) && !/\d\u2013\d/.test(str)) out.push(`${rel} [script string] dash: ${str.slice(0, 120)}`);
        });
      });
    });
    // The privacy policy is also served as Markdown.
    S.readPublic('privacy-policy.md').split('\n').forEach((line) => {
      if (/\u2014/.test(line)) out.push(`privacy-policy.md [text] dash: ${line.slice(0, 120)}`);
    });
    expect(out).toEqual([]);
  });

  test('British English: no American spellings', () => {
    expect(scan([['American spelling', US_SPELLING]])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. Weight-loss, review and do-not-mention language

// FEATURES.md "Do not mention on the site". The privacy policy and the
// challenge terms are legal texts and keep their own wording; the support
// page carries the Beat signposting, which has to name the charity's cause.
const DO_NOT_MENTION = [
  ['eating-disorder system', /\beating[- ]disorders?\b|\bdisordered eating\b|\bcalorie floors?\b|\brapid[- ]loss\b/i, [...LEGAL_PAGES, 'support/index.html']],
  ['wellbeing check or goal lock', /\bwellbeing check\b|\bgoal lock\b/i, LEGAL_PAGES],
  ['training status question', /\bnatural or enhanced\b/i, []],
  ['under-18 limits', /\bunder[- ]18s?\b|\bminors\b/i, [...LEGAL_PAGES, 'c/index.html']],
  ['internal tools', /\bdebug log\b|\bmoderation queue\b|\blive activity\b/i, POLICY_PAGES],
  ['iPhone widgets', /\biPhone\b[^.]*\bwidgets?\b|\bwidgets?\b[^.]*\biPhone\b/i, []],
];

describe('weight-loss, review and do-not-mention language', () => {
  const marketing = PAGES.filter((rel) => !LEGAL_PAGES.includes(rel));

  test('no shred, before-and-after, review, user-count or superiority claim', () => {
    expect(scan(CAP_RULES, { pages: marketing })).toEqual([]);
  });

  test('no "lose N kg" promise outside the teaching articles', () => {
    expect(scan(LOSE_NUMBER, { pages: marketing.filter((rel) => !rel.startsWith('articles/')) })).toEqual([]);
  });

  test.each(DO_NOT_MENTION.map(([name, re, exempt]) => [name, re, exempt]))('nothing from the do-not-mention list: %s', (name, re, exempt) => {
    expect(scan([[name, re]], { pages: PAGES.filter((rel) => !exempt.includes(rel)) })).toEqual([]);
  });

  test('Volyume Score is never "Leanness" and never a body-fat measurement', () => {
    const out = scan([
      ['Leanness', /\bleanness\b/i],
      ['body fat without a negation', (t) => /\bbody[- ]fat\b/i.test(t) && !/\b(not|isn't|isn\u2019t|never|doesn't|doesn\u2019t)\b/i.test(t)],
    ], { pages: PAGES.filter((rel) => !POLICY_PAGES.includes(rel)) });
    expect(out).toEqual([]);
  });
});
