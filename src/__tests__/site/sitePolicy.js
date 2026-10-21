/**
 * Reads the privacy policy the way the guards compare it: the lead-in blocks
 * (heading, "Last updated", introduction) and then each numbered section as a
 * heading and its blocks of text, whatever the page's layout. Kept apart from
 * the test so the same code builds the committed baseline of today's text
 * (fixtures/privacy-policy.baseline.json) and reads the rebuilt page.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Privacy section 6
 * replacement (exact)": everything else in the privacy policy word for word;
 * "Last updated" becomes 21 October 2026).
 */
'use strict';

const S = require('./siteScan');

/**
 * {lead: [text], sections: [{heading, blocks: [text]}]} for a policy page.
 * Sections are the <h2> elements inside <main> (or the whole page if there is
 * no <main>), in order; a section runs to the next <h2> or the end of <main>.
 */
function policyOf(rel) {
  const page = S.readPage(rel);
  const main = page.elements.find((e) => e.name === 'main');
  const lo = main ? main.start : 0;
  const hi = main ? main.end : page.segments.length;
  const h2s = page.elements.filter((e) => e.name === 'h2' && e.start >= lo && e.end <= hi);
  const blocks = S.blocksWithRange(page).filter((b) => b.first >= lo && b.last < hi);
  const firstH2 = h2s.length ? h2s[0].start : hi;
  const lead = blocks.filter((b) => b.last < firstH2).map((b) => b.text);
  const sections = h2s.map((h, i) => {
    const end = i + 1 < h2s.length ? h2s[i + 1].start : hi;
    return {
      heading: page.textOf(h),
      blocks: blocks.filter((b) => b.first >= h.end && b.last < end).map((b) => b.text),
    };
  });
  return { lead, sections };
}

/** The Markdown policy with the health-app section and the dated line taken out, and heading numbers removed. */
function markdownWithoutHealth(md) {
  const lines = md.split('\n');
  const out = [];
  let skipping = false;
  lines.forEach((line) => {
    if (/^##\s+/.test(line)) skipping = /^##\s+(\d+\.\s+)?Health[- ](app|apps|connect)/i.test(line);
    if (skipping) return;
    if (/^\*\*Last updated:\*\*/.test(line)) return;
    out.push(line.replace(/^(##\s+)\d+\.\s+/, '$1').replace(/\s+$/, ''));
  });
  return out.join('\n');
}

module.exports = { policyOf, markdownWithoutHealth };
