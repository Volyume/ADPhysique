/**
 * volyume.app facts guard: every number on a page is a number the code
 * supports.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Facts from code": a build
 * step reads the repo and writes the site's numbers; a guard test fails if a
 * page states a number the code does not support) and
 * docs/site-rebuild-2026-10/FACTS.md section 2 (the old figures were wrong:
 * 551 exercises and 31 plans on the old home page; the code has 923 and 58).
 *
 * The chain this pins:
 *   code  --scripts/site/build.mjs-->  public/assets/facts.json
 *         --written into each page-->  elements marked data-fact="<key>"
 *
 *  1. facts.json exists and has a figure for what the pages count: exercises,
 *     plans, foods and curated meals.
 *  2. facts.json equals what build.mjs computes from the code now. If the
 *     script exports a compute function this calls it; either way it runs
 *     `node scripts/site/build.mjs --check`, which must exit 0 (the generated
 *     files agree with the code). Both are SKIPPED, with the reason in the
 *     test name, only while scripts/site/build.mjs does not exist yet.
 *  3. Every element marked data-fact names a key in facts.json and reads as
 *     that figure ("923", "29,279", "six", or "over 29,000" for 29,279).
 *  4. No number stands next to a counted noun (exercises, plans, foods, meals,
 *     training styles, physique goals) unless the build step wrote it into a
 *     data-fact element; in a title or meta description, where no element can
 *     carry the mark, it must still agree with facts.json.
 *  5. The old figures (551 and 448 exercises, 31 and 47 plans) appear nowhere.
 *
 * These fail on the old pages (551 exercises, 31 plans, no facts.json) and
 * pass once the rebuilt pages and the build step land.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const S = require('./siteScan');
const F = require('./siteFacts');

const FACTS_REL = 'assets/facts.json';
const BUILD = path.join(S.REPO, 'scripts', 'site', 'build.mjs');
const HAS_BUILD = fs.existsSync(BUILD);
const needsBuild = HAS_BUILD ? test : test.skip;
const SKIP_NOTE = HAS_BUILD ? '' : ' [SKIPPED until scripts/site/build.mjs exists]';

const PAGES = S.htmlFiles();
const readFacts = () => JSON.parse(S.readPublic(FACTS_REL));
const factsExist = () => S.publicExists(FACTS_REL);

// ---------------------------------------------------------------------------
// Running the build step

function run(args, extra = {}) {
  return spawnSync(process.execPath, args, { cwd: S.REPO, encoding: 'utf8', timeout: 120000, ...extra });
}

/**
 * Ask build.mjs for what it computes, if it exports a function for that.
 * argv is set to --check first, so a script that runs its main on import runs
 * it in check mode and writes nothing.
 */
function computeFromExport() {
  const code = `
    process.argv = [process.argv[0], ${JSON.stringify(BUILD)}, '--check'];
    const mod = await import(${JSON.stringify(pathToFileURL(BUILD).href)});
    const names = ['computeFacts', 'computeSiteFacts', 'collectFacts', 'buildFacts', 'getFacts', 'compute'];
    let fn = names.map((n) => mod[n]).find((f) => typeof f === 'function');
    if (!fn) { const hit = Object.entries(mod).find(([k, v]) => typeof v === 'function' && /facts/i.test(k)); fn = hit && hit[1]; }
    if (!fn) { console.log('@@RESULT@@' + JSON.stringify({ noExport: Object.keys(mod) })); process.exit(0); }
    const facts = await fn();
    console.log('@@RESULT@@' + JSON.stringify({ facts }));
  `;
  const r = run(['--input-type=module', '-e', code]);
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@RESULT@@'));
  if (!line) return { ran: false, status: r.status, stderr: (r.stderr || '').slice(0, 600) };
  return { ran: true, ...JSON.parse(line.slice('@@RESULT@@'.length)) };
}

describe('facts.json', () => {
  test('exists and has a figure for the exercises, plans, foods and curated meals the pages count', () => {
    expect(factsExist()).toBe(true);
    const leaves = F.leaves(readFacts());
    ['exercise', 'plan', 'food', 'meal'].forEach((word) => {
      const hits = leaves.filter(([k, v]) => new RegExp(word, 'i').test(k) && typeof v === 'number' && v > 0);
      expect({ word, found: hits.length > 0 }).toEqual({ word, found: true });
    });
  });

  needsBuild(`equals what scripts/site/build.mjs computes from the code${SKIP_NOTE}`, () => {
    const computed = computeFromExport();
    if (!computed.ran || computed.noExport) {
      // No compute function to call: the --check run below is the comparison.
      return;
    }
    expect(factsExist()).toBe(true);
    expect(readFacts()).toEqual(JSON.parse(JSON.stringify(computed.facts)));
  }, 130000);

  needsBuild(`node scripts/site/build.mjs --check exits 0: generated files agree with the code${SKIP_NOTE}`, () => {
    const r = run([BUILD, '--check']);
    expect({ status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`.slice(-800) }).toEqual({ status: 0, out: expect.any(String) });
  }, 130000);
});

describe('data-fact elements', () => {
  test('each names a key in facts.json and reads as that figure', () => {
    const out = [];
    const facts = factsExist() ? readFacts() : null;
    PAGES.forEach((rel) => {
      const page = S.readPage(rel);
      page.elements.filter((e) => e.attrs['data-fact'] !== undefined).forEach((e) => {
        const key = e.attrs['data-fact'];
        const text = page.textOf(e);
        if (!facts) { out.push(`${rel}: data-fact="${key}" but there is no facts.json`); return; }
        const value = F.factFor(facts, key);
        if (value === undefined) { out.push(`${rel}: data-fact="${key}" is not in facts.json`); return; }
        const prev = page.segments[e.start - 1];
        const first = page.segments[e.start];
        const before = prev && first && prev.block === first.block ? prev.text : '';
        if (!F.agrees(text, value, { before })) out.push(`${rel}: data-fact="${key}" reads "${text}", facts.json says ${JSON.stringify(value)}`);
      });
    });
    expect(out).toEqual([]);
  });
});

describe('numbers on the pages', () => {
  test('no number stands next to exercises, plans, foods, meals, training styles or physique goals unless the build step wrote it', () => {
    const out = [];
    PAGES.forEach((rel) => {
      const page = S.readPage(rel);
      S.bodyBlocks(page, { skipFacts: true }).forEach((block) => {
        F.claimsIn(block).forEach((c) => out.push(`${rel}: "${c.text}" next to ${c.noun}, not in a data-fact element: ${block.slice(0, 100)}`));
      });
      S.scriptCopy(page).forEach((str) => {
        F.claimsIn(str).forEach((c) => out.push(`${rel} [script]: "${c.text}" next to ${c.noun}: ${str.slice(0, 100)}`));
      });
    });
    expect(out).toEqual([]);
  });

  test('in a title or meta description, a number next to a counted noun agrees with facts.json', () => {
    const out = [];
    const facts = factsExist() ? readFacts() : null;
    PAGES.forEach((rel) => {
      S.metaCopy(S.readPage(rel)).forEach((u) => {
        F.claimsIn(u.text).forEach((c) => {
          if (!facts) { out.push(`${rel} [${u.where}]: "${c.text}" ${c.noun} but there is no facts.json`); return; }
          const candidates = F.leaves(facts).filter(([k, v]) => c.keys.test(k) && typeof v === 'number');
          if (!candidates.some(([, v]) => F.agrees(c.text, v, { before: c.before }))) out.push(`${rel} [${u.where}]: "${c.text}" ${c.noun} does not agree with facts.json`);
        });
      });
    });
    expect(out).toEqual([]);
  });

  test('the old figures (551 and 448 exercises, 31 and 47 plans) are gone', () => {
    const out = [];
    PAGES.forEach((rel) => {
      const page = S.readPage(rel);
      const texts = [...S.bodyBlocks(page, { skipCitations: false }), ...S.metaCopy(page).map((u) => u.text), ...S.scriptCopy(page)];
      texts.forEach((t) => {
        if (/(?<![\d,.])(551|448)(?![\d,])/.test(t)) out.push(`${rel}: ${t.slice(0, 120)}`);
        if (/(?<![\d,.])(31|47)(?![\d,])\s+(?:[A-Za-z-]+\s+){0,3}plans\b/i.test(t)) out.push(`${rel}: ${t.slice(0, 120)}`);
      });
    });
    expect(out).toEqual([]);
  });
});
