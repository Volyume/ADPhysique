/**
 * Running named rules over the copy of every page, shared by the volyume.app
 * copy and claims guards. A rule is [name, RegExp] or
 * [name, function(text) -> boolean]. Authority: docs/site-rebuild-2026-10/BRIEF.md.
 */
'use strict';

const S = require('./siteScan');

const PAGES = S.htmlFiles();

const quotes = (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

/** Sentences of copy on a page: body text, title, meta, attributes, and the sentences the page's script builds. */
function unitsOf(rel, { skipExplained = false } = {}) {
  const page = S.readPage(rel);
  const units = S.copyUnits(page, { skipExplained });
  S.scriptCopy(page).forEach((t) => S.sentencesOf(t).forEach((s) => units.push({ where: 'script', text: s })));
  return units;
}

/**
 * Run named rules over every unit of copy. A rule is [name, RegExp] or
 * [name, function(text) -> boolean]. `allowed` maps a page to sentences that
 * are exempt from every rule in this scan, word for word (curly and straight
 * quotes treated alike).
 */
function scan(rules, { allowed = {}, skipExplained = false, pages = PAGES } = {}) {
  const out = [];
  pages.forEach((rel) => {
    const ok = new Set((allowed[rel] || []).map(quotes));
    unitsOf(rel, { skipExplained }).forEach((u) => {
      if (ok.has(quotes(u.text))) return;
      rules.forEach(([name, test]) => {
        const hit = typeof test === 'function' ? test(u.text) : test.test(u.text);
        if (hit) out.push(`${rel} [${u.where}] ${name}: ${u.text.slice(0, 170)}`);
      });
    });
  });
  return out;
}


module.exports = { PAGES, quotes, unitsOf, scan };
