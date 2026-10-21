/**
 * Link checking for the volyume.app guards, kept apart from the test so
 * site.selftest.test.js can feed it a page with broken references and a page
 * with good ones. Authority: docs/site-rebuild-2026-10/BRIEF.md.
 */
'use strict';

const S = require('./siteScan');

// [element, attribute] pairs that name a file on a page.
const REFS = [
  ['a', 'href'], ['area', 'href'], ['link', 'href'], ['script', 'src'], ['img', 'src'], ['source', 'src'], ['video', 'src'],
  ['video', 'poster'], ['audio', 'src'], ['track', 'src'], ['iframe', 'src'], ['embed', 'src'], ['object', 'data'], ['form', 'action'],
  ['input', 'src'],
];
const SRCSET = [['img', 'srcset'], ['source', 'srcset']];

/** Every reference on a parsed page as {where, ref}. */
function refsOfPage(page) {
  const out = [];
  page.elements.forEach((e) => {
    REFS.filter(([n]) => n === e.name).forEach(([, a]) => { if (e.attrs[a] !== undefined) out.push({ where: `<${e.name} ${a}>`, ref: e.attrs[a] }); });
    SRCSET.filter(([n]) => n === e.name).forEach(([, a]) => {
      if (e.attrs[a] !== undefined) e.attrs[a].split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean).forEach((u) => out.push({ where: `<${e.name} ${a}>`, ref: u }));
    });
    if (e.name === 'meta') {
      const key = (e.attrs.property || e.attrs.name || '').toLowerCase();
      if (['og:image', 'og:url', 'twitter:image'].includes(key) && e.attrs.content) out.push({ where: `<meta ${key}>`, ref: e.attrs.content });
      if (/refresh/i.test(e.attrs['http-equiv'] || '')) {
        const m = (e.attrs.content || '').match(/url\s*=\s*['"]?([^'"]+)/i);
        if (m) out.push({ where: '<meta refresh>', ref: m[1] });
      }
    }
  });
  return out;
}

const idsOn = (rel) => {
  const page = S.readPage(rel);
  return new Set(page.elements.flatMap((e) => [e.attrs.id, e.attrs.name].filter((v) => v !== undefined)));
};

/** Resolve one reference, returning a problem string or null. */
function problem(rel, { where, ref }) {
  const r = S.resolveRef(ref, rel);
  if (r.kind === 'broken-url') return `${where} "${ref}" is not a valid address`;
  if (r.kind === 'scheme' && r.scheme === 'javascript') return `${where} "${ref}" is a javascript: link`;
  if (r.kind !== 'local') return null;
  const forwarded = S.FORWARDED.some((re) => re.test(r.path));
  if (!S.pathResolves(r.path) && !forwarded) return `${where} "${ref}" does not resolve to a file`;
  if (r.fragment && S.pathResolves(r.path) && !forwarded) {
    const clean = r.path.replace(/^\/+/, '');
    const target = clean === '' ? 'index.html' : (/\.html$/i.test(clean) ? clean : `${clean.replace(/\/+$/, '')}/index.html`);
    if (/\.html$/i.test(target) && S.publicExists(target) && !idsOn(target).has(r.fragment)) return `${where} "${ref}" has no #${r.fragment} on ${target}`;
  }
  return null;
}


const refsOf = (rel) => refsOfPage(S.readPage(rel));

module.exports = { REFS, SRCSET, refsOfPage, refsOf, idsOn, problem };
