/**
 * volyume.app search and share guard: head tags, noindex, sitemap, robots and
 * the share image.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Title, description and
 * share image on every page; sitemap.xml and robots.txt; challenge pages
 * noindex" and the stage 1 answer on the 1200 by 630 share image) and
 * docs/site-rebuild-2026-10/STAGE1.md section 5 (the page list).
 *
 * What this pins:
 *  1. The pages the brief names exist, including the two new ones
 *     (/features/ and /how-the-coach-works/).
 *  2. Every working or private page is noindex: /c/, /challenge-terms/,
 *     /auth/, /email/, /survey/, /g/, /u/, /s/, /p/, /partner/, /members/ and
 *     the 404 page. Every other page is indexable and says so by carrying a
 *     title, a meta description, a canonical URL that is its own address, and
 *     an og:image.
 *  3. Every page (except a redirect stub and the private members tool) has a
 *     title, a description and a share image, indexable or not.
 *  4. The share image is a 1200 by 630 picture, compressed, served from the
 *     site.
 *  5. sitemap.xml lists exactly the indexable pages; robots.txt points to it
 *     and does not shut the site out.
 *
 * Why: the old pages left /get/ and /p/ with no robots tag, had no canonical
 * on /privacy/ or /support/, no og:image on the home page, and the one share
 * image was 685 by 741 and 635 KB. These fail on the old pages and pass once
 * the rebuilt pages land.
 */
'use strict';

const S = require('./siteScan');

const ALL = S.htmlFiles({ includeMembers: true });
const NOINDEX_PREFIXES = ['c/', 'challenge-terms/', 'auth/', 'email/', 'survey/', 'g/', 'u/', 's/', 'p/', 'partner/', 'members/'];
const NOINDEX_FILES = ['404.html'];
const ORIGIN = S.ORIGIN;

const robotsOf = (rel) => (S.readPage(rel).metaContent('robots') || '').toLowerCase();
const mustBeNoindex = (rel) => NOINDEX_FILES.includes(rel) || NOINDEX_PREFIXES.some((p) => rel.startsWith(p));
const isStub = (rel) => S.readPage(rel).elements.some((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''));
const canonicalOf = (rel) => {
  const link = S.readPage(rel).elements.find((e) => e.name === 'link' && /canonical/i.test(e.attrs.rel || ''));
  return link ? link.attrs.href : undefined;
};
const indexable = () => ALL.filter((rel) => !mustBeNoindex(rel) && !isStub(rel));
const needsHead = () => ALL.filter((rel) => !S.isMembers(rel) && !isStub(rel));

const EXPECTED_PAGES = [
  'index.html', 'features/index.html', 'how-the-coach-works/index.html', 'get/index.html', 'support/index.html',
  'privacy/index.html', 'articles/index.html',
  'articles/training-volume-when-to-add-sets/index.html', 'articles/when-to-change-your-calories/index.html',
  'articles/why-explainable-coaching-beats-black-box/index.html',
  'c/index.html', 'challenge-terms/index.html', 'g/index.html', 'u/index.html', 's/index.html', 'p/index.html', 'partner/index.html',
  'auth/callback/index.html', 'auth/confirm/index.html', 'email/preferences/index.html', 'email/unsubscribe/index.html',
  'survey/index.html', 'members/index.html', '404.html',
];

describe('the pages', () => {
  test('every page the brief names exists', () => {
    expect(EXPECTED_PAGES.filter((rel) => !S.publicExists(rel))).toEqual([]);
  });
});

describe('noindex', () => {
  test('the challenge, auth, email, survey, link-landing, partner and members pages and the 404 are noindex', () => {
    const wrong = ALL.filter((rel) => mustBeNoindex(rel) && !/\bnoindex\b/.test(robotsOf(rel)));
    expect(wrong).toEqual([]);
  });

  test('every other page is indexable: no noindex', () => {
    const wrong = ALL.filter((rel) => !mustBeNoindex(rel) && /noindex/.test(robotsOf(rel)));
    expect(wrong).toEqual([]);
  });
});

describe('head tags', () => {
  test('every indexable page has a title, a description, its own canonical URL and an og:image', () => {
    const out = [];
    indexable().forEach((rel) => {
      const page = S.readPage(rel);
      const desc = page.metaContent('description');
      if (!page.title) out.push(`${rel}: no <title>`);
      if (!desc) out.push(`${rel}: no meta description`);
      const want = `${ORIGIN}${S.urlOf(rel)}`;
      if (canonicalOf(rel) !== want) out.push(`${rel}: canonical is ${canonicalOf(rel)}, want ${want}`);
      if (!page.metaContent('og:image')) out.push(`${rel}: no og:image`);
    });
    expect(out).toEqual([]);
  });

  test('every page has a title, a description and a share image, indexable or not', () => {
    const out = [];
    needsHead().forEach((rel) => {
      const page = S.readPage(rel);
      if (!page.title) out.push(`${rel}: no <title>`);
      if (!page.metaContent('description')) out.push(`${rel}: no meta description`);
      if (!page.metaContent('og:image')) out.push(`${rel}: no og:image`);
    });
    expect(out).toEqual([]);
  });

  test('titles are 70 characters or fewer and descriptions 40 to 200; indexable titles and descriptions are unique', () => {
    const out = [];
    const titles = new Map();
    const descs = new Map();
    needsHead().forEach((rel) => {
      const page = S.readPage(rel);
      const desc = page.metaContent('description') || '';
      if (page.title && page.title.length > 70) out.push(`${rel}: title is ${page.title.length} characters`);
      if (desc && (desc.length < 40 || desc.length > 200)) out.push(`${rel}: description is ${desc.length} characters`);
      if (indexable().includes(rel)) {
        if (page.title) titles.set(page.title, [...(titles.get(page.title) || []), rel]);
        if (desc) descs.set(desc, [...(descs.get(desc) || []), rel]);
      }
    });
    [...titles].filter(([, rels]) => rels.length > 1).forEach(([t, rels]) => out.push(`same title "${t}": ${rels.join(', ')}`));
    [...descs].filter(([, rels]) => rels.length > 1).forEach(([, rels]) => out.push(`same description: ${rels.join(', ')}`));
    expect(out).toEqual([]);
  });

  test('a redirect stub names its target as the canonical address', () => {
    const stubs = ALL.filter(isStub);
    stubs.forEach((rel) => expect({ rel, canonical: canonicalOf(rel) }).toEqual({ rel, canonical: expect.stringMatching(/^https:\/\/volyume\.app\//) }));
  });
});

describe('the share image', () => {
  const images = () => {
    const urls = new Set();
    needsHead().forEach((rel) => { const v = S.readPage(rel).metaContent('og:image'); if (v) urls.add(v); });
    return [...urls];
  };

  test('is served from the site, 1200 by 630, and compressed (250 KB or less)', () => {
    const out = [];
    images().forEach((url) => {
      const r = S.resolveRef(url, 'index.html');
      if (r.kind !== 'local' || !S.pathResolves(r.path)) { out.push(`${url}: not a file on the site`); return; }
      const rel = r.path.replace(/^\//, '');
      const size = S.imageSize(rel);
      if (!size) out.push(`${url}: not a PNG, JPEG or WebP`);
      else if (size.w !== 1200 || size.h !== 630) out.push(`${url}: ${size.w} by ${size.h}, want 1200 by 630`);
      if (S.fileSize(rel) > 250 * 1024) out.push(`${url}: ${Math.round(S.fileSize(rel) / 1024)} KB, want 250 KB or less`);
    });
    expect(out).toEqual([]);
  });

  test('is an absolute https://volyume.app address, so a preview can fetch it', () => {
    const wrong = images().filter((u) => !u.startsWith(`${ORIGIN}/`));
    expect(wrong).toEqual([]);
  });
});

describe('sitemap.xml and robots.txt', () => {
  const sitemap = () => (S.publicExists('sitemap.xml') ? S.readPublic('sitemap.xml') : '');
  const locs = () => [...sitemap().matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

  test('sitemap.xml exists and is a urlset', () => {
    expect(sitemap()).toMatch(/<urlset[^>]*sitemaps\.org\/schemas\/sitemap\/0\.9/);
  });

  test('it lists exactly the indexable pages, once each, by their canonical address', () => {
    const want = indexable().map((rel) => `${ORIGIN}${S.urlOf(rel)}`).sort();
    expect(locs().sort()).toEqual(want);
  });

  test('robots.txt exists, points to the sitemap and does not shut the site out', () => {
    const robots = S.publicExists('robots.txt') ? S.readPublic('robots.txt') : '';
    expect(robots).toMatch(/^User-agent:\s*\*/im);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    const blocked = [...robots.matchAll(/^Disallow:\s*(\S*)/gim)].map((m) => m[1]).filter(Boolean);
    const shut = indexable().filter((rel) => blocked.some((b) => S.urlOf(rel).startsWith(b)));
    expect(shut).toEqual([]);
  });
});
