#!/usr/bin/env node
// audit.mjs — GD-15 coverage report: counts by nation, venue_type, source,
// source_count (1 vs 2+), local authority top/bottom, postcode area,
// operator branch counts vs docs/03's recorded figures, unresolved review
// count, and the two named test-case lookups. Writes:
//   data/gyms/coverage.v1.json
//   data/gyms/coverage.v1.md

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readJsonlGz } = require('./lib/jsonl.js');
const { foldText } = require('./lib/fold.js');
const { matchBrand } = require('./lib/brands.js');

const DATA_DIR = path.join(__dirname, '../../data/gyms');
const VENUES_FILE = path.join(DATA_DIR, 'uk-gyms.v1.jsonl.gz');
const REVIEW_FILE = path.join(DATA_DIR, 'review-queue.v1.jsonl.gz');
const REVIEW_WEAK_FILE = path.join(DATA_DIR, 'review-weak.v1.jsonl.gz');

const UKACTIVE_TOTAL = 5842;

// docs/gym-database-2026-09-06/03's operator summary table (approx figures
// as researched 2026-09-06) — the branch counts this pipeline's operator
// feeds should be checked against.
const OPERATOR_RESEARCH_COUNTS = {
  'jd-gyms': 114,
  'the-gym-group': 264,
  'total-fitness': 15,
  'third-space': 15,
  'fitness-first': 39,
  '247-fitness': null, // "not established" in 03
};

function countBy(items, fn) {
  const out = {};
  for (const item of items) {
    const key = fn(item) ?? 'null';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function topAndBottom(counts, n = 10) {
  const entries = Object.entries(counts).filter(([k]) => k !== 'null');
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return { top: sorted.slice(0, n), bottom: sorted.slice(-n).reverse() };
}

function postcodeArea(outward) {
  if (!outward) return null;
  const match = outward.match(/^[A-Z]+/);
  return match ? match[0] : null;
}

function findLookup(venues, needleTokens) {
  const needle = needleTokens.map((t) => foldText(t));
  return venues.filter((v) => {
    const hay = foldText(`${v.display_name} ${v.name} ${v.town}`);
    return needle.every((t) => hay.includes(t));
  });
}

function run() {
  const venues = readJsonlGz(VENUES_FILE);
  const review = readJsonlGz(REVIEW_FILE);
  const reviewWeak = readJsonlGz(REVIEW_WEAK_FILE);

  const byNation = countBy(venues, (v) => v.country);
  const byVenueType = countBy(venues, (v) => v.venue_type);
  const bySourceCount = countBy(venues, (v) => (v.source_count > 1 ? '2+' : '1'));
  const byLocalAuthority = countBy(venues, (v) => v.local_authority_name);
  const byPostcodeArea = countBy(venues, (v) => postcodeArea(v.outward));
  const byCoordSource = countBy(venues, (v) => v.coord_source);
  const byBrand = countBy(
    venues.filter((v) => v.brand_key),
    (v) => v.brand_key,
  );

  const laTopBottom = topAndBottom(byLocalAuthority, 10);
  const areaTopBottom = topAndBottom(byPostcodeArea, 10);

  // GD-19: "Operator counts in the audit are reported twice: venues from
  // the operator's own feed, and venues carrying the brand from any
  // source." own_feed_count = venues whose source_records include that
  // OPERATOR FOLDER's own branch-page feed (`operator:<slug>`);
  // any_source_count = venues whose resolved brand_key is that operator's
  // BRAND, regardless of which source won brand attribution (GD-19
  // freshness order). An operator folder slug is not always identical to
  // its brand key (e.g. the "better-gll" folder resolves to brand key
  // "better" — same alias resolution transforms.js's transformOperatorBranch
  // uses), so any_source_count is computed against the RESOLVED brand key,
  // not the raw folder slug, to avoid a false 0 for such operators.
  const operatorSlugs = new Set(Object.keys(OPERATOR_RESEARCH_COUNTS));
  for (const v of venues) {
    for (const sr of v.source_records || []) {
      if (sr.source && sr.source.startsWith('operator:')) operatorSlugs.add(sr.source.slice('operator:'.length));
    }
  }
  const operatorComparison = {};
  for (const slug of operatorSlugs) {
    const resolvedBrand = matchBrand(slug.replace(/-/g, ' '));
    const brandKeyForSlug = resolvedBrand ? resolvedBrand.key : slug;
    const ownFeedCount = venues.filter((v) => (v.source_records || []).some((sr) => sr.source === `operator:${slug}`)).length;
    const anySourceCount = venues.filter((v) => v.brand_key === brandKeyForSlug).length;
    operatorComparison[slug] = {
      researched: Object.prototype.hasOwnProperty.call(OPERATOR_RESEARCH_COUNTS, slug) ? OPERATOR_RESEARCH_COUNTS[slug] : null,
      brand_key: brandKeyForSlug,
      own_feed_count: ownFeedCount,
      any_source_count: anySourceCount,
      // Kept for backward-compat callers that read pipeline_count.
      pipeline_count: anySourceCount,
    };
  }
  // Also list every brand that carries venues but has NO operator folder at
  // all (e.g. crossfit, anytime-fitness — name-token/Overture-only brands),
  // so "any source" totals are visible even with own_feed_count always 0.
  const brandOnlySlugs = new Set(venues.map((v) => v.brand_key).filter(Boolean));
  for (const brandKey of brandOnlySlugs) {
    if (Object.values(operatorComparison).some((c) => c.brand_key === brandKey)) continue;
    operatorComparison[brandKey] = {
      researched: Object.prototype.hasOwnProperty.call(OPERATOR_RESEARCH_COUNTS, brandKey) ? OPERATOR_RESEARCH_COUNTS[brandKey] : null,
      brand_key: brandKey,
      own_feed_count: 0,
      any_source_count: venues.filter((v) => v.brand_key === brandKey).length,
      pipeline_count: venues.filter((v) => v.brand_key === brandKey).length,
    };
  }

  const voltGym = findLookup(venues, ['volt', 'gym']).filter((v) => foldText(v.town || '').includes('burscough') || foldText(v.address_line || '').includes('burscough'));
  const voltGymBroad = findLookup(venues, ['volt']);
  const pureGymMotherwell = findLookup(venues, ['puregym', 'motherwell']);
  const pureGymMotherwellAlt = findLookup(venues, ['pure', 'gym', 'motherwell']);

  const reviewByKind = countBy(review, (r) => r.kind);
  const reviewWeakByKind = countBy(reviewWeak, (r) => r.kind);

  const coverage = {
    generated_at: new Date().toISOString(),
    total_canonical_venues: venues.length,
    ukactive_reference_total: UKACTIVE_TOTAL,
    pct_of_ukactive_reference: Number(((venues.length / UKACTIVE_TOTAL) * 100).toFixed(1)),
    by_nation: byNation,
    by_venue_type: byVenueType,
    by_source_count: bySourceCount,
    by_coord_source: byCoordSource,
    by_area_source: countBy(venues, (v) => v.area_source),
    by_brand: byBrand,
    local_authority_top10: laTopBottom.top,
    local_authority_bottom10: laTopBottom.bottom,
    postcode_area_top10: areaTopBottom.top,
    postcode_area_bottom10: areaTopBottom.bottom,
    operator_branch_count_vs_research: operatorComparison,
    // GD-23: the review band is split into a moderator ("likely") queue
    // and a "weak" (proximity-only) queue no person is asked to work.
    review_queue_likely_total: review.length,
    review_queue_likely_by_kind: reviewByKind,
    review_queue_weak_total: reviewWeak.length,
    review_queue_weak_by_kind: reviewWeakByKind,
    // Back-compat aliases for the pre-GD-23 single-queue field names.
    review_queue_total: review.length + reviewWeak.length,
    review_queue_by_kind: reviewByKind,
    named_lookups: {
      volt_gym_burscough: {
        present: voltGym.length > 0 || voltGymBroad.some((v) => foldText(v.town || '').includes('burscough')),
        matches: (voltGym.length > 0 ? voltGym : voltGymBroad.filter((v) => foldText(v.town || '').includes('burscough'))).map((v) => ({
          id: v.id,
          display_name: v.display_name,
          town: v.town,
          postcode: v.postcode,
          source_count: v.source_count,
        })),
        all_volt_matches_any_town: voltGymBroad.map((v) => ({ display_name: v.display_name, town: v.town, postcode: v.postcode })),
      },
      puregym_motherwell: {
        present: pureGymMotherwell.length > 0 || pureGymMotherwellAlt.length > 0,
        matches: (pureGymMotherwell.length > 0 ? pureGymMotherwell : pureGymMotherwellAlt).map((v) => ({
          id: v.id,
          display_name: v.display_name,
          town: v.town,
          postcode: v.postcode,
          source_count: v.source_count,
        })),
      },
    },
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'coverage.v1.json'), `${JSON.stringify(coverage, null, 2)}\n`);

  const md = `# UK gym directory — coverage report

Generated ${coverage.generated_at}.

## Headline
- **${coverage.total_canonical_venues}** canonical venues built (${coverage.pct_of_ukactive_reference}% of ukactive's cited 5,842 UK health & fitness clubs, 2026 report — a report estimate/extrapolation, not a census; see docs/gym-database-2026-09-06/03 §4).
- Review queue (GD-23): **${coverage.review_queue_likely_total}** likely (${JSON.stringify(coverage.review_queue_likely_by_kind)}), **${coverage.review_queue_weak_total}** weak/proximity-only (${JSON.stringify(coverage.review_queue_weak_by_kind)}).

## By nation
${Object.entries(byNation).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## By venue_type
${Object.entries(byVenueType).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Source count (single- vs multi-source corroborated)
${Object.entries(bySourceCount).map(([k, v]) => `- ${k} source(s): ${v}`).join('\n')}

## Coordinate source
${Object.entries(byCoordSource).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Area source (GD-21: postcode vs nearest-sector fallback)
${Object.entries(coverage.by_area_source).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Local authority — top 10 / bottom 10 (of those with >=1 venue)
Top: ${laTopBottom.top.map(([k, v]) => `${k} (${v})`).join(', ')}
Bottom: ${laTopBottom.bottom.map(([k, v]) => `${k} (${v})`).join(', ')}

## Postcode area — top 10 / bottom 10
Top: ${areaTopBottom.top.map(([k, v]) => `${k} (${v})`).join(', ')}
Bottom: ${areaTopBottom.bottom.map(([k, v]) => `${k} (${v})`).join(', ')}

## Operator branch counts — own feed vs any source (GD-19) vs docs/03 research
${Object.entries(operatorComparison)
  .map(
    ([slug, c]) =>
      `- ${slug}${c.brand_key && c.brand_key !== slug ? ` (brand: ${c.brand_key})` : ''}: own feed ${c.own_feed_count}, any source ${c.any_source_count}, researched ${c.researched ?? 'not established'}`,
  )
  .join('\n')}

## Named lookups (founder test cases)
- **"Volt Gym" Burscough**: ${coverage.named_lookups.volt_gym_burscough.present ? 'PRESENT' : 'ABSENT'} — ${JSON.stringify(coverage.named_lookups.volt_gym_burscough.matches)}
- **"PureGym Motherwell"**: ${coverage.named_lookups.puregym_motherwell.present ? 'PRESENT' : 'ABSENT'} — ${JSON.stringify(coverage.named_lookups.puregym_motherwell.matches)}
`;
  fs.writeFileSync(path.join(DATA_DIR, 'coverage.v1.md'), md);

  console.log(`[audit] wrote coverage.v1.json and coverage.v1.md (${venues.length} venues, ${review.length} review entries)`);
  console.log(`[audit] Volt Gym Burscough: ${coverage.named_lookups.volt_gym_burscough.present ? 'PRESENT' : 'ABSENT'}`);
  console.log(`[audit] PureGym Motherwell: ${coverage.named_lookups.puregym_motherwell.present ? 'PRESENT' : 'ABSENT'}`);
}

run();
