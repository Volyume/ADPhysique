/**
 * Lead addition (community-product-audit-2026-09-07/09-gym-journey-tests.md
 * Finding D2, §9): `gyms_submit`'s duplicate check used to compare a fresh
 * submission's tokens against the catalogue's own `gym_venues.tokens`
 * straight, with no account for the extra generic tokens the PIPELINE bakes
 * in (the outward code, the literal "uk", and the brand's own alias words a
 * second time alongside the compound brand token) that a real submitter
 * would never type. Measured against the real catalogue: 53.0% of branded
 * venues scored below the 0.6 postcode-unit threshold on a byte-identical
 * resubmission of their own name+town+postcode, 94.7% below 0.85.
 *
 * migrate_163's first pass (`_gyms_dedupe_jaccard`, `_gyms_brand_alias_
 * tokens`, `_gyms_tokens_strip`) strips the candidate's own brand-alias
 * words, the outward code and "uk" from BOTH sides before comparing. That
 * alone left a measured 19.75% residual (below 0.6) -- a DIFFERENT root
 * cause: a venue whose display name's own place word diverges from its
 * stored `town` field. The lead's follow-up (board answer, same lane) adds
 * GD-06's own brand signal (`_gyms_name_brand_id`): same brand + same
 * postcode unit, or same brand + same sector + within 150 m of a REAL
 * (non-sector-fallback) coordinate, is a merge on its own, regardless of
 * Jaccard -- GD-06's "brand 3 + postcode-unit 2 = 5, merge >= 5".
 *
 * This suite reimplements BOTH rules in JS using the ACTUAL pipeline
 * tokenizer (`scripts/gyms/lib/fold.js`'s `foldText`/`tokenize`/
 * `tokenJaccard` -- the same module `normalise.mjs`/`build.mjs` use to
 * build `gym_venues.tokens`, not a hand-rolled reimplementation) and runs
 * them against a real sample of the shipped catalogue
 * (`data/gyms/uk-gyms.v1.jsonl.gz`, `data/gyms/brands.v1.json`), pinning:
 *
 *   - this exact tokenizer reproduces the audit's own measured baseline on
 *     the full 3,002-row branded population (53.0%/94.7%), so the module
 *     under test here is verified faithful to the pipeline before it is
 *     trusted to judge either fix;
 *   - the stripped-Jaccard rule ALONE catches every one of 20 real branded
 *     rows, spread across 20 distinct brands, at their own real postcode;
 *   - MEASURED, not assumed: with the brand+postcode-unit signal added,
 *     the residual below-0.6 rate on the full 3,002-row population falls
 *     from 19.75% to 0.00% -- every branded venue's own composed display
 *     name (`composeBrandBranch`, build.mjs) already names its own brand,
 *     so a byte-identical resubmission always matches on brand + postcode
 *     unit even on the rows where Jaccard alone still misses (the two
 *     previously-KNOWN-RESIDUAL rows from the first pass are named below
 *     as positive cases this signal now catches);
 *   - the brand+sector+150m branch is exercised with a synthetic case (a
 *     self-resubmission at the SAME postcode already satisfies the
 *     postcode-unit branch, so the real catalogue cannot exercise the
 *     "different postcode, same sector, close by" case on its own) against
 *     a candidate with a REAL coordinate, and is proven INERT against a
 *     candidate whose own coordinate is itself a postcode-sector fallback
 *     (Finding 9, migrate_162:1081-1096 -- comparing two sector-centroid
 *     points is meaningless).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { foldText, tokenize, tokenJaccard } = require('../../scripts/gyms/lib/fold.js');

const ROOT = path.resolve(__dirname, '../..');

function tokensOf(name, town) {
  return Array.from(new Set(tokenize(`${name || ''} ${town || ''}`)));
}

function stripTokens(tokens, strip) {
  const S = new Set(strip || []);
  return (tokens || []).filter((t) => !S.has(t));
}

function brandAliasTokens(aliases) {
  const set = new Set();
  for (const al of aliases || []) for (const w of tokenize(al)) set.add(w);
  return [...set];
}

function dedupeJaccard(candidateTokens, candidateAliases, submissionTokens, outwardToken) {
  const strip = new Set([...brandAliasTokens(candidateAliases), 'uk', outwardToken]);
  return tokenJaccard(
    stripTokens(candidateTokens, [...strip]),
    stripTokens(submissionTokens, [...strip]),
  );
}

/** `_gyms_name_brand_id`: the brand a folded NAME string itself names
 * (longest matching alias wins), or null. */
function nameBrandKey(name, brands) {
  const folded = foldText(name);
  let best = null;
  let bestLen = -1;
  for (const b of brands) {
    for (const al of b.aliases) {
      const fa = foldText(al);
      if (fa && folded.includes(fa) && fa.length > bestLen) {
        best = b.key;
        bestLen = fa.length;
      }
    }
  }
  return best;
}

const EARTH_M = 6371000;
function haversineM(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_M * 2 * Math.asin(Math.sqrt(a));
}

/** The combined migrate_163 rule: stripped-Jaccard >= 0.6, OR (same
 * detected name-brand + same postcode unit), OR (same name-brand + same
 * sector + within 150m of a candidate with a real, non-fallback coord). */
function isDuplicate(row, submission, brands) {
  const candidateBrand = brands.find((b) => b.key === row.brand_key);
  const subTokens = tokensOf(submission.name, submission.town);
  const outwardToken = foldText(submission.outward);
  const jaccard = dedupeJaccard(row.tokens, candidateBrand ? candidateBrand.aliases : [], subTokens, outwardToken);
  if (jaccard >= 0.6) return { caught: true, via: 'jaccard', jaccard };

  const nameBrand = nameBrandKey(submission.name, brands);
  if (nameBrand && nameBrand === row.brand_key) {
    if (row.postcode && row.postcode.replace(/\s+/g, '').toUpperCase()
        === (submission.postcode || '').replace(/\s+/g, '').toUpperCase()) {
      return { caught: true, via: 'brand_postcode_unit', jaccard };
    }
    if (
      row.sector === submission.sector
      && row.coord_source !== 'postcode_sector'
      && Number.isFinite(row.lat) && Number.isFinite(row.lng)
      && Number.isFinite(submission.lat) && Number.isFinite(submission.lng)
      && haversineM(submission.lat, submission.lng, row.lat, row.lng) <= 150
    ) {
      return { caught: true, via: 'brand_sector_150m', jaccard };
    }
  }
  return { caught: false, via: null, jaccard };
}

// 20 real branded venues, one per distinct brand, each at their own real
// postcode/town as shipped in data/gyms/uk-gyms.v1.jsonl.gz.
const CAUGHT = [
  { display_name: 'Ultimate Fitness Birmingham', town: 'Birmingham', postcode: 'B1 1NB', outward: 'B1', brand_key: 'ultimate-fitness', tokens: ['ultimate', 'fitness', 'birmingham', 'group', 'b1'] },
  { display_name: 'Anytime Fitness Gateshead', town: 'Gateshead', postcode: 'NE8 1AQ', outward: 'NE8', brand_key: 'anytime-fitness', tokens: ['anytime', 'fitness', 'gateshead', 'ne8'] },
  { display_name: 'The Gym Group Newton Abbot', town: 'Devon, Newton Abbot', postcode: 'TQ12 1LJ', outward: 'TQ12', brand_key: 'the-gym-group', tokens: ['the', 'gym', 'group', 'newton', 'abbot', 'tq12'] },
  { display_name: 'Fitness First Solihull', town: 'Solihull', postcode: 'B92 8DS', outward: 'B92', brand_key: 'fitness-first', tokens: ['fitness', 'first', 'solihull', 'dw', 'sports', 'b92'] },
  { display_name: 'Snap Fitness Warminster', town: 'Warminster', postcode: 'BA12 9FE', outward: 'BA12', brand_key: 'snap-fitness', tokens: ['snap', 'fitness', 'warminster', 'ba12'] },
  { display_name: 'PureGym Birmingham West', town: 'Birmingham', postcode: 'B66 3PR', outward: 'B66', brand_key: 'puregym', tokens: ['puregym', 'birmingham', 'west', 'pure', 'gym', 'uk', 'b66'] },
  { display_name: 'Everyone Active Knights Templar Sports Centre', town: 'Baldock', postcode: 'SG7 6EY', outward: 'SG7', brand_key: 'everyone-active', tokens: ['everyone', 'active', 'knights', 'templar', 'sports', 'centre', 'slm', 'and', 'leisure', 'management', 'sg7'] },
  { display_name: 'David Lloyd Worcester', town: 'Worcester', postcode: 'WR3 8ZE', outward: 'WR3', brand_key: 'david-lloyd', tokens: ['david', 'lloyd', 'worcester', 'leisure', 'clubs', 'wr3'] },
  { display_name: 'Nuffield Health Friern Barnet', town: 'London', postcode: 'N11 3BG', outward: 'N11', brand_key: 'nuffield-health', tokens: ['nuffield', 'health', 'friern', 'barnet', 'fitness', 'wellbeing', 'centre', 'n11'] },
  { display_name: 'énergie Fitness Erith', town: 'Erith', postcode: 'DA8 1SL', outward: 'DA8', brand_key: 'energie', tokens: ['energie', 'fitness', 'erith', 'nrg', 'da8'] },
  { display_name: 'Better Ardwick Sports Hall', town: 'Manchester', postcode: 'M12 4DY', outward: 'M12', brand_key: 'better', tokens: ['better', 'ardwick', 'sports', 'hall', 'leisure', 'gll', 'greenwich', 'limited', 'm12'] },
  { display_name: 'Total Fitness Prenton', town: 'Prenton', postcode: 'CH43 3DU', outward: 'CH43', brand_key: 'total-fitness', tokens: ['total', 'fitness', 'prenton', 'ch43'] },
  { display_name: 'Places Leisure Graves Health And Sports Centre', town: 'Sheffield', postcode: 'S8 8JR', outward: 'S8', brand_key: 'places-leisure', tokens: ['places', 'leisure', 'graves', 'health', 'and', 'sports', 'centre', 's8'] },
  { display_name: 'Village Gym Walsall', town: 'Walsall', postcode: 'WS2 8TJ', outward: 'WS2', brand_key: 'village-gym', tokens: ['village', 'gym', 'walsall', 'gyms', 'hotels', 'hotel', 'ws2'] },
  { display_name: 'Freedom Leisure Westlands Sport & Fitness Centre', town: 'Yeovil', postcode: 'BA20 2DD', outward: 'BA20', brand_key: 'freedom-leisure', tokens: ['freedom', 'leisure', 'westlands', 'sport', 'fitness', 'centre', 'ba20'] },
  { display_name: 'Everlast Gyms Grays', town: 'Grays', postcode: 'RM20 3LP', outward: 'RM20', brand_key: 'everlast', tokens: ['everlast', 'gyms', 'grays', 'sports', 'direct', 'fitness', 'rm20'] },
  { display_name: 'Bannatyne Blackpool', town: 'Blackpool', postcode: 'FY1 5EP', outward: 'FY1', brand_key: 'bannatyne', tokens: ['bannatyne', 'blackpool', 'bannatynes', 'health', 'club', 'spa', 'fy1'] },
  { display_name: '24/7 Fitness - North Sheffield', town: 'Sheffield', postcode: 'S6 1LP', outward: 'S6', brand_key: '247-fitness', tokens: ['24', '7', 'fitness', 'north', 'sheffield', '247', 'hour', 's6'] },
  { display_name: 'Virgin Active Wimbledon Worple Road', town: 'London', postcode: 'SW19 4JS', outward: 'SW19', brand_key: 'virgin-active', tokens: ['virgin', 'active', 'wimbledon', 'worple', 'road', 'sw19'] },
  { display_name: 'Parkwood Leisure Rushcliffe Arena', town: 'Nottingham', postcode: 'NG2 7HY', outward: 'NG2', brand_key: 'parkwood-leisure', tokens: ['parkwood', 'leisure', 'rushcliffe', 'arena', 'ng2'] },
];

// The two rows that were the FIRST pass's documented KNOWN_RESIDUAL
// (stripped-Jaccard alone missed them: a display-name-vs-town-field word
// divergence). Kept here as positive cases proving the brand+postcode-unit
// signal now catches them by a DIFFERENT route, not by papering over the
// Jaccard gap.
const PREVIOUSLY_RESIDUAL_NOW_CAUGHT_BY_BRAND_SIGNAL = [
  { display_name: 'Nuffield Health Oxfordshire', town: 'Oxford', postcode: 'OX2 7NZ', outward: 'OX2', brand_key: 'nuffield-health', tokens: ['nuffield', 'health', 'oxfordshire', 'fitness', 'wellbeing', 'centre', 'ox2'] },
  { display_name: 'Freedom Leisure Sport Martley', town: 'Nr Worcester', postcode: 'WR6 6QA', outward: 'WR6', brand_key: 'freedom-leisure', tokens: ['freedom', 'leisure', 'sport', 'martley', 'wr6'] },
];

let BRANDS;
beforeAll(() => {
  BRANDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gyms/brands.v1.json'), 'utf8'));
});

function scoreOriginal(row) {
  const subTokens = tokensOf(row.display_name, row.town);
  return tokenJaccard(row.tokens, subTokens);
}

function loadBrandedCatalogue() {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'data/gyms/uk-gyms.v1.jsonl.gz')));
  const rows = buf.toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return rows.filter(
    (r) => r.status === 'open' && r.brand_key && r.postcode && Array.isArray(r.tokens) && r.tokens.length,
  );
}

function selfSubmission(row) {
  return {
    name: row.display_name, town: row.town, postcode: row.postcode, outward: row.outward,
    sector: row.sector, lat: row.lat, lng: row.lng,
  };
}

describe('the tokenizer under test is verified faithful to the audit before it judges the fix', () => {
  test('the real catalogue, through the ACTUAL pipeline tokenizer, reproduces the audit-measured baseline (53.0%/94.7%)', () => {
    const branded = loadBrandedCatalogue();
    expect(branded.length).toBe(3002);

    const below6 = branded.filter((r) => scoreOriginal(r) < 0.6).length;
    const below85 = branded.filter((r) => scoreOriginal(r) < 0.85).length;
    expect((100 * below6) / branded.length).toBeCloseTo(53.0, 0);
    expect((100 * below85) / branded.length).toBeCloseTo(94.7, 0);
  });
});

describe("Finding D2 fix, first pass: gyms_submit's stripped Jaccard catches a real resubmission", () => {
  test.each(CAUGHT.map((r) => [r.display_name, r]))(
    '%s: a byte-identical resubmission at its own postcode scores >= 0.6 on stripped Jaccard alone',
    (_name, row) => {
      const subTokens = tokensOf(row.display_name, row.town);
      const brand = BRANDS.find((b) => b.key === row.brand_key);
      const outwardToken = foldText(row.outward);
      expect(dedupeJaccard(row.tokens, brand ? brand.aliases : [], subTokens, outwardToken)).toBeGreaterThanOrEqual(0.6);
    },
  );

  test('the two founder-named brief examples score 1.0 after stripping (brand words + outward code fully account for the gap)', () => {
    const puregym = { tokens: ['puregym', 'motherwell', 'pure', 'gym', 'uk', 'ml1'], outward: 'ML1' };
    const brand = BRANDS.find((b) => b.key === 'puregym');
    const subTokens1 = tokensOf('Pure Gym Motherwell', 'Motherwell');
    const subTokens2 = tokensOf('PureGym Motherwell', 'Motherwell');
    const outwardToken = foldText(puregym.outward);
    expect(dedupeJaccard(puregym.tokens, brand.aliases, subTokens1, outwardToken)).toBe(1);
    expect(dedupeJaccard(puregym.tokens, brand.aliases, subTokens2, outwardToken)).toBe(1);

    // Volt Gym is an independent (no brand), so only the outward code is
    // stripped; this crosses the 0.6 threshold but is not a perfect 1.0.
    const volt = { tokens: ['volt', 'gym', 'l40'], outward: 'L40' };
    const voltSub = tokensOf('Volt Gym', 'Burscough');
    const voltScore = dedupeJaccard(volt.tokens, undefined, voltSub, foldText(volt.outward));
    expect(voltScore).toBeCloseTo(2 / 3, 5);
    expect(voltScore).toBeGreaterThanOrEqual(0.6);
  });
});

describe('Finding D2 fix, second pass (lead follow-up A): the GD-06 brand signal closes the residual', () => {
  test('MEASURED: with the brand+postcode-unit/sector+150m signal, the below-0.6 residual on the real 3,002-row catalogue falls from 19.75% to 0.00%', () => {
    const branded = loadBrandedCatalogue();

    // Below 0.6 on stripped Jaccard ALONE vs. missed by the COMBINED rule
    // (Jaccard OR the brand signal).
    let jaccardBelow6 = 0;
    let combinedMissed = 0;
    for (const r of branded) {
      const subTokens = tokensOf(r.display_name, r.town);
      const brand = BRANDS.find((b) => b.key === r.brand_key);
      const outwardToken = foldText(r.outward);
      const j = dedupeJaccard(r.tokens, brand ? brand.aliases : [], subTokens, outwardToken);
      if (j < 0.6) jaccardBelow6 += 1;
      if (!isDuplicate(r, selfSubmission(r), BRANDS).caught) combinedMissed += 1;
    }
    expect((100 * jaccardBelow6) / branded.length).toBeCloseTo(19.75, 1);
    expect(combinedMissed).toBe(0);
  });

  test.each(PREVIOUSLY_RESIDUAL_NOW_CAUGHT_BY_BRAND_SIGNAL.map((r) => [r.display_name, r]))(
    '%s: stripped Jaccard alone still misses it, but the brand+postcode-unit signal now catches it',
    (_name, row) => {
      const subTokens = tokensOf(row.display_name, row.town);
      const brand = BRANDS.find((b) => b.key === row.brand_key);
      const outwardToken = foldText(row.outward);
      const jaccard = dedupeJaccard(row.tokens, brand ? brand.aliases : [], subTokens, outwardToken);
      expect(jaccard).toBeLessThan(0.6);

      const result = isDuplicate(row, selfSubmission(row), BRANDS);
      expect(result.caught).toBe(true);
      expect(result.via).toBe('brand_postcode_unit');
    },
  );

  test('brand+sector+150m: a different postcode in the same sector, same brand, a real coordinate 80m away IS a merge', () => {
    const candidate = {
      brand_key: 'puregym', postcode: 'ML1 1LX', sector: 'ML1 1', outward: 'ML1',
      lat: 55.7885, lng: -3.9910, coord_source: 'source',
      tokens: ['puregym', 'motherwell', 'pure', 'gym', 'uk', 'ml1'],
    };
    // ~80m north of the candidate, same postcode SECTOR but a different
    // full postcode -- the postcode-unit branch would not fire.
    const submission = {
      name: 'PureGym Motherwell Retail Park', town: 'Motherwell', postcode: 'ML1 1XY',
      outward: 'ML1', sector: 'ML1 1', lat: 55.7893, lng: -3.9910,
    };
    expect(haversineM(submission.lat, submission.lng, candidate.lat, candidate.lng)).toBeLessThan(150);
    const result = isDuplicate(candidate, submission, BRANDS);
    expect(result.caught).toBe(true);
    expect(result.via).toBe('brand_sector_150m');
  });

  test('brand+sector+150m is INERT against a candidate whose own coordinate is a postcode-sector fallback (Finding 9)', () => {
    const candidate = {
      brand_key: 'puregym', postcode: 'ML1 1LX', sector: 'ML1 1', outward: 'ML1',
      lat: 55.7885, lng: -3.9910, coord_source: 'postcode_sector', // fallback, not real
      tokens: ['puregym', 'motherwell', 'pure', 'gym', 'uk', 'ml1'],
    };
    const submission = {
      name: 'PureGym Motherwell Retail Park', town: 'Motherwell', postcode: 'ML1 1XY',
      outward: 'ML1', sector: 'ML1 1', lat: 55.7885, lng: -3.9910, // identical point: degenerate distance 0
    };
    const result = isDuplicate(candidate, submission, BRANDS);
    // Distance is 0 (the exact degenerate case Finding 9 warned about),
    // but the fallback-coordinate guard refuses this branch regardless,
    // and the postcode differs so the postcode-unit branch does not fire
    // either -- the candidate is correctly NOT matched by the brand signal
    // at all here (a genuine duplicate at this postcode would still be
    // caught by ordinary stripped-Jaccard on a real submission).
    expect(result.via).not.toBe('brand_sector_150m');
  });
});
