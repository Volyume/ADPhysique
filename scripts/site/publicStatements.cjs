#!/usr/bin/env node
/**
 * Scan the published tree (public/) for statements the website must not make
 * (LOC-663): the iPhone app "coming soon" (it is live in the UK App Store),
 * a price, a paid plan or its vocabulary (Volyume is free; the billing code
 * is dormant), and claims the app no longer matches (Advanced progression and
 * Progress Scan as feature names, streak wording, the retired Partners
 * feature, "no social feed" while Community exists,
 * the old 551 exercises and 31 plans counts, the price element left over
 * from the removed plans).
 *
 * Usage: node scripts/site/publicStatements.cjs [dir]   (default: public/ and docs/web/)
 * Exit 1 and one line per hit when anything is found. Comments in the files
 * are scanned too: a comment is shipped to the visitor's browser.
 */
const fs = require('fs');
const path = require('path');
const { listFiles, MIRRORS } = require('./storeLinks.cjs');

const RULES = [
  [/coming (?:to the app store )?(?:very )?soon|very soon|launching soon|join the waitlist/i, 'the iPhone app is live; nothing is "coming soon"'],
  [/[£€]\s?\d|\$\s?\d|\b\d+(?:\.\d+)?\s?(?:gbp|usd|eur)\b/i, 'a price'],
  [/per (?:month|year)|\/(?:month|year|mo|yr)\b|\b(?:monthly|annual|yearly) (?:plan|price|billing)\b/i, 'a billing period'],
  [/\bsubscription|free trial|\btrial\b|\bpremium\b|paywall|upgrade to\b|\bgo pro\b|\bvolyume pro\b|\bpro (?:plan|tier|version|features?|members?|subscribers?)\b|\bpaid plan\b/i, 'a paid plan or tier'],
  [/class="price"|\.price\{/i, 'a price element left from the removed plans'],
  [/advanced progression|progress scan/i, 'a feature claim the website no longer makes (not in the app, or not provable from it)'],
  [/\bstreaks?\b/i, 'streak wording (not allowed in public wording)'],
  [/\bpartnerships?\b|\bcheers?\b|invite code|your invite|training partners?\b/i, 'the retired Partners feature (a /partner/ link now only opens Community)'],
  [/no social feed/i, 'untrue: the app has a Community tab'],
  [/\b551 (?:exercises|plus)|\b31 (?:built-in|training|library) /i, 'a stale library count'],
];

function scanTree(dir) {
  const hits = [];
  for (const rel of listFiles(dir)) {
    const lines = fs.readFileSync(path.join(dir, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const [re, why] of RULES) {
        if (re.test(line)) hits.push(`${rel}:${i + 1}: ${why}: ${line.trim().slice(0, 140)}`);
      }
    });
  }
  return hits;
}

module.exports = { RULES, scanTree };

if (require.main === module) {
  const dirs = process.argv[2] ? [path.resolve(process.argv[2])] : MIRRORS.map((d) => path.join(__dirname, '..', '..', d));
  const dir = dirs.join(', ');
  const hits = dirs.flatMap((d) => scanTree(d));
  if (hits.length) {
    console.error(hits.join('\n'));
    console.error(`FAIL: ${hits.length} statement(s) the website must not make.`);
    process.exit(1);
  }
  console.log(`OK: no forbidden statements under ${dir}.`);
}
