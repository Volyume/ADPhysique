/**
 * volyume.app privacy-policy guard: the legal text stays word for word except
 * the one section and the one date the owner changed, no page claims a health
 * app link the app does not have, and /privacy.html is a redirect.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Privacy section 6
 * corrected (text below); everything else in the privacy policy word for word;
 * 'Last updated' becomes 21 October 2026"; "/privacy.html becomes a redirect to
 * /privacy/ (one copy of the text)"; "Privacy section 6 replacement (exact)":
 * heading `6 Health apps`, then "Volyume does not connect to Apple Health or
 * Health Connect. It does not read from or write to any health app on your
 * phone.", replacing the Health Connect section in public/privacy/index.html
 * and public/privacy-policy.md), and CLAUDE.md section 2 (GDPR / Article 9:
 * the policy is a legal text and does not drift).
 *
 * The reason for the change: the health-app link was removed on 30 June 2026
 * (src/screens/ProOnboardingScreen.js:2052) and no health-app module is
 * installed, so the old section 6 described a feature the app does not have.
 *
 * What this pins:
 *  1. public/privacy/index.html has the 13 sections of today's policy. Sections
 *     1 to 5 and 7 to 13 equal today's text block for block
 *     (fixtures/privacy-policy.baseline.json, read from main on 2026-10-21);
 *     section 6 is the owner's replacement exactly; the lead-in is today's with
 *     the date moved to 21 October 2026.
 *  2. public/privacy-policy.md equals today's Markdown apart from the same
 *     section and date (fixtures/privacy-policy.baseline.md).
 *  3. No page of the site, and not the Markdown, claims Health Connect, Apple
 *     Health or a wearable link; a mention is allowed only in a sentence that
 *     denies it.
 *  4. /privacy.html is a redirect stub to /privacy/ and holds no copy of the
 *     policy.
 *
 * These fail on the old pages (section 6 still describes Health Connect; the
 * support page has a section headed Apple Health / Health Connect; privacy.html
 * is a full second copy) and pass once the rebuilt pages land. Four older tests
 * still read public/privacy.html and docs/web/privacy.html as byte copies of
 * the policy; whoever lands the single-copy change moves them to the one copy
 * (see the report that came with this file).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./siteScan');
const P = require('./sitePolicy');
const baseline = require('./fixtures/privacy-policy.baseline.json');

const SIX_HEADING = '6 Health apps';
const SIX_TEXT = 'Volyume does not connect to Apple Health or Health Connect. It does not read from or write to any health app on your phone.';
const UPDATED = 'Last updated: 21 October 2026';

describe('the policy page', () => {
  const policy = () => P.policyOf('privacy/index.html');

  test('keeps its 13 sections, in order, numbered 1 to 13', () => {
    const headings = policy().sections.map((s) => s.heading);
    expect(headings.map((h) => Number(h.split(' ')[0]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  test.each(baseline.sections.map((s, i) => [i + 1, s]).filter(([n]) => n !== 6))('section %i is today\'s text, word for word', (n, expected) => {
    const got = policy().sections[n - 1];
    expect(got).toBeDefined();
    expect(got.heading).toBe(expected.heading);
    const diffs = [];
    const count = Math.max(got.blocks.length, expected.blocks.length);
    for (let i = 0; i < count; i += 1) {
      if (got.blocks[i] !== expected.blocks[i]) diffs.push({ block: i + 1, expected: expected.blocks[i], got: got.blocks[i] });
    }
    expect(diffs).toEqual([]);
  });

  test('section 6 is the owner\'s replacement, exactly', () => {
    const six = policy().sections[5];
    expect(six).toBeDefined();
    expect(six.heading).toBe(SIX_HEADING);
    expect(six.blocks.join(' ')).toBe(SIX_TEXT);
  });

  test('the lead-in is today\'s, with "Last updated" moved to 21 October 2026', () => {
    const { lead } = policy();
    expect(lead).toContain(UPDATED);
    expect(lead).toContain(baseline.lead[2]);
    const h1 = S.readPage('privacy/index.html').elements.find((e) => e.name === 'h1');
    expect(h1 && S.readPage('privacy/index.html').textOf(h1)).toBe(baseline.lead[0]);
  });

  test('no other date, and no leftover 17 October 2026, on the page', () => {
    const text = S.bodyBlocks(S.readPage('privacy/index.html')).join('\n');
    expect(text).not.toContain('17 October 2026');
  });
});

describe('the Markdown policy', () => {
  const md = () => S.readPublic('privacy-policy.md');

  test('equals today\'s Markdown apart from the health-app section and the date', () => {
    const got = P.markdownWithoutHealth(md()).split('\n');
    const want = fs.readFileSync(path.join(__dirname, 'fixtures', 'privacy-policy.baseline.md'), 'utf8').split('\n');
    const diffs = [];
    for (let i = 0; i < Math.max(got.length, want.length); i += 1) {
      if (got[i] !== want[i]) diffs.push({ line: i + 1, expected: want[i], got: got[i] });
      if (diffs.length >= 5) break;
    }
    expect(diffs).toEqual([]);
  });

  test('says "Last updated: 21 October 2026" and carries the owner\'s health-app section', () => {
    const text = md().replace(/\*\*/g, '');
    expect(text).toContain('Last updated: 21 October 2026');
    expect(text).toMatch(/^##\s+(\d+\.\s+)?Health apps\s*$/m);
    expect(text.replace(/\s+/g, ' ')).toContain(SIX_TEXT);
  });
});

describe('health apps', () => {
  const NAMES = /Health Connect|Apple Health|HealthKit|Google Fit|Fitbit|Garmin|Whoop|Oura|Apple Watch|smart ?watch|wearables?|health app|your watch|your scale|daily steps|step count|step counter/i;
  const NEGATED = /\b(does not|doesn't|doesn\u2019t|do not|don't|don\u2019t|not|never|no|without|cannot|can't|can\u2019t)\b/i;

  test('no page claims a link to a health app or a wearable', () => {
    const out = [];
    S.htmlFiles().forEach((rel) => {
      const page = S.readPage(rel);
      const units = [...S.copyUnits(page, { skipCitations: false }), ...S.scriptCopy(page).flatMap((t) => S.sentencesOf(t).map((s) => ({ where: 'script', text: s })))];
      units.forEach((u) => {
        if (NAMES.test(u.text) && !NEGATED.test(u.text)) out.push(`${rel} [${u.where}] ${u.text.slice(0, 150)}`);
      });
    });
    expect(out).toEqual([]);
  });

  test('no page has a heading about a health app', () => {
    const out = [];
    S.htmlFiles().forEach((rel) => {
      const page = S.readPage(rel);
      page.elements.filter((e) => /^h[1-6]$/.test(e.name)).forEach((e) => {
        const text = page.textOf(e);
        if (NAMES.test(text) && !/^6 Health apps$/.test(text)) out.push(`${rel}: <${e.name}> ${text}`);
      });
    });
    expect(out).toEqual([]);
  });

  test('the Markdown policy does not claim one either', () => {
    const out = S.readPublic('privacy-policy.md').split('\n').filter((line) => NAMES.test(line) && !NEGATED.test(line));
    expect(out).toEqual([]);
  });

  test('the reason holds: the app has no health-app module and no health permission', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(S.REPO, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /health|fitbit|garmin|google-fit/i.test(d))).toEqual([]);
    const app = fs.readFileSync(path.join(S.REPO, 'app.json'), 'utf8');
    expect(app).not.toMatch(/HealthKit|HEALTH_CONNECT|android\.permission\.health|healthkit/i);
  });
});

describe('/privacy.html', () => {
  test('is a redirect to /privacy/ and holds no copy of the policy', () => {
    expect(S.publicExists('privacy.html')).toBe(true);
    const page = S.readPage('privacy.html');
    const refresh = page.elements.find((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''));
    expect(refresh).toBeDefined();
    const target = ((refresh && refresh.attrs.content) || '').match(/url\s*=\s*['"]?([^'"]+)/i);
    expect(target && S.resolveRef(target[1], 'privacy.html')).toMatchObject({ kind: 'local', path: '/privacy/' });
    const canonical = page.elements.find((e) => e.name === 'link' && /canonical/i.test(e.attrs.rel || ''));
    expect(canonical && canonical.attrs.href).toBe('https://volyume.app/privacy/');
    expect(page.elements.some((e) => e.name === 'a' && S.resolveRef(e.attrs.href || '', 'privacy.html').path === '/privacy/')).toBe(true);
    expect(S.bodyBlocks(page).join(' ')).not.toMatch(/Data we collect|Your UK GDPR rights/);
    expect(S.fileSize('privacy.html')).toBeLessThan(3000);
  });
});
