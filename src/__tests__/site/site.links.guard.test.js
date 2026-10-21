/**
 * volyume.app link guard: every internal reference lands on something the host
 * serves, and every page carries the shared header and footer links.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Every URL that exists today
 * keeps working or redirects to its replacement"; the stage 1 answers adding
 * /features/ and /how-the-coach-works/) and docs/site-rebuild-2026-10/STAGE1.md
 * sections 4 and 5 (the shared header and footer).
 *
 * What this pins, over every HTML page under public/ (members included, since
 * a broken script link there would break the team's tool) and every stylesheet
 * under public/assets:
 *  1. Every href, src, srcset, poster, form action, meta refresh and og:image
 *     that points at this site resolves to a file the host serves. A folder
 *     URL resolves to its index.html; a query string and a fragment are
 *     ignored for the file check. /partner/CODE and /c/CODE resolve through
 *     404.html's forwarding, which another guard pins. Custom-scheme links
 *     (volyume://) and mailto: are not site paths.
 *  2. A link with a #fragment to another page lands on an id that exists there.
 *  3. No javascript: link, and no placeholder href="#" except an anchor with
     an id that the page's own script fills in (the store and open buttons
     on the link-landing pages).
 *  4. Every url() in a stylesheet resolves.
 *  5. Every indexable page carries the shared header (home, Features, How the
 *     coach works, Articles, Support) and the footer (Privacy, Support,
 *     Challenge terms), so nothing is orphaned and no page is a dead end.
 *
 * Broken references print the page, the attribute and the address, so the
 * rebuilt pages can be fixed from the failure alone.
 */
'use strict';

const S = require('./siteScan');
const { refsOf, problem } = require('./siteLinks');

const ALL = S.htmlFiles({ includeMembers: true });
const isStub = (rel) => S.readPage(rel).elements.some((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''));
const NOINDEX_PREFIXES = ['c/', 'challenge-terms/', 'auth/', 'email/', 'survey/', 'g/', 'u/', 's/', 'p/', 'partner/', 'members/'];
const indexable = () => ALL.filter((rel) => rel !== '404.html' && !NOINDEX_PREFIXES.some((p) => rel.startsWith(p)) && !isStub(rel));

describe('every internal reference resolves', () => {
  test('hrefs, srcs, srcsets, form actions, meta refresh and share images', () => {
    const out = [];
    ALL.forEach((rel) => refsOf(rel).forEach((r) => { const p = problem(rel, r); if (p) out.push(`${rel}: ${p}`); }));
    expect(out).toEqual([]);
  });

  test('no placeholder href="#" unless a script on the page fills it in by id', () => {
    const out = [];
    ALL.forEach((rel) => {
      const page = S.readPage(rel);
      page.elements.filter((e) => e.name === 'a' && (e.attrs.href || '').trim() === '#').forEach((e) => {
        const id = e.attrs.id;
        const filled = id && page.scripts.some((s) => s.code.includes(`'${id}'`) || s.code.includes(`"${id}"`));
        if (!filled) out.push(`${rel}: <a href="#"${id ? ` id="${id}"` : ''}> that nothing fills in`);
      });
    });
    expect(out).toEqual([]);
  });

  test('every url() in a stylesheet resolves', () => {
    const out = [];
    const sources = [
      ...S.cssFiles().map((f) => ({ rel: f, css: S.readPublic(f) })),
      ...ALL.flatMap((rel) => S.pageCss(rel).map((c) => ({ rel, css: c.css, label: c.source }))),
    ];
    sources.forEach(({ rel, css, label }) => {
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi)) {
        if (/^(data:|#)/.test(m[1])) continue;
        const p = problem(rel, { where: 'url()', ref: m[1] });
        if (p) out.push(`${label || rel}: ${p}`);
      }
    });
    expect(out).toEqual([]);
  });
});

describe('the shared header and footer', () => {
  const linksOf = (rel) => new Set(S.readPage(rel).elements.filter((e) => e.name === 'a' && e.attrs.href).map((e) => {
    const r = S.resolveRef(e.attrs.href, rel);
    return r.kind === 'local' ? r.path : null;
  }).filter(Boolean));

  test.each([
    ['home', '/'],
    ['Features', '/features/'],
    ['How the coach works', '/how-the-coach-works/'],
    ['Articles', '/articles/'],
    ['Support', '/support/'],
    ['Privacy', '/privacy/'],
    ['Challenge terms', '/challenge-terms/'],
  ])('every indexable page links %s', (_name, target) => {
    const missing = indexable().filter((rel) => !linksOf(rel).has(target) && S.urlOf(rel) !== target);
    expect(missing).toEqual([]);
  });

  test('every page the brief keeps is reachable from the home page', () => {
    const reachable = linksOf('index.html');
    const want = ['/features/', '/how-the-coach-works/', '/get/', '/support/', '/privacy/', '/articles/'];
    expect(want.filter((p) => !reachable.has(p))).toEqual([]);
  });

  test('the articles index links all three articles, and each links back', () => {
    const slugs = ['training-volume-when-to-add-sets', 'when-to-change-your-calories', 'why-explainable-coaching-beats-black-box'];
    const index = linksOf('articles/index.html');
    expect(slugs.filter((s) => !index.has(`/articles/${s}/`))).toEqual([]);
    expect(slugs.filter((s) => !linksOf(`articles/${s}/index.html`).has('/articles/'))).toEqual([]);
  });
});
